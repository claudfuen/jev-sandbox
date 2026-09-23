// Headless lab: run several seeded worlds in parallel against real JEV, record
// every run so it replays exactly, print metrics, and optionally publish the
// runs to the Blob store for the /runs gallery.
//
//   bun scripts/lab.ts --days 1 --worlds 3 --seed 100 --experiment baseline [--upload] [--verbose]
//   bun scripts/lab.ts --days 1 --worlds 2 --intervene famine@96   # observer intervention at tick 96
//
// Flags: --think N (ticks a villager spends thinking before the answer lands, default 1),
//        --mode sample|argmax, --concurrency N (max JEV calls in flight across worlds).

import { mkdirSync, writeFileSync } from "node:fs"
import { gzipSync } from "node:zlib"

import { runJev } from "@/lib/jev/call"
import { saveRun } from "@/lib/runs/store"
import { formatClock } from "@/lib/sim/clock"
import { toWire, type SimRequest } from "@/lib/sim/engine"
import { METRICS } from "@/lib/sim/metrics"
import { Session, type RunRecord } from "@/lib/sim/session"
import type { ChoiceMode, Intervention } from "@/lib/sim/types"

const TICKS_PER_DAY = 288

function flag(name: string, fallback?: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`)
  if (i === -1) return fallback
  const next = process.argv[i + 1]
  return next && !next.startsWith("--") ? next : "true"
}

const days = Number(flag("days", "1"))
const worlds = Number(flag("worlds", "2"))
const baseSeed = Number(flag("seed", "100"))
const think = Math.max(1, Number(flag("think", "1")))
const mode = (flag("mode", "sample") as ChoiceMode) ?? "sample"
const concurrency = Number(flag("concurrency", "24"))
const experiment = flag("experiment", "lab")!.toLowerCase().replace(/[^a-z0-9-]/g, "-")
const condition = flag("condition", "baseline")!
const upload = flag("upload") === "true"
const assess = flag("assess") === "true"
const driftModel = (flag("drift", "jev") as "jev" | "engine" | "off") ?? "jev"
const verbose = flag("verbose") === "true"
const interventions: { tick: number; intervention: Intervention }[] = (flag("intervene") ?? "")
  .split(",")
  .filter(Boolean)
  .map((spec) => {
    const [kind, at] = spec.split("@")
    return { tick: Number(at), intervention: { kind } as Intervention }
  })

// A tiny semaphore so parallel worlds share one JEV concurrency budget.
let inFlight = 0
const waiters: (() => void)[] = []
async function withSlot<T>(fn: () => Promise<T>): Promise<T> {
  while (inFlight >= concurrency) await new Promise<void>((r) => waiters.push(r))
  inFlight += 1
  try {
    return await fn()
  } finally {
    inFlight -= 1
    waiters.shift()?.()
  }
}

type Outcome = { ok: true; ans: Awaited<ReturnType<typeof runJev>> } | { ok: false; message: string }

async function runWorld(index: number): Promise<RunRecord> {
  const seed = baseSeed + index
  const session = new Session({ seed, driftModel })
  const { world } = session
  const outcomes = new Map<number, Promise<Outcome>>()
  const endTick = days * TICKS_PER_DAY
  const tag = `[w${index + 1} seed ${seed}]`

  while (world.tick < endTick) {
    for (const iv of interventions) if (iv.tick === world.tick) session.intervene(iv.intervention)

    for (const req of session.tick()) {
      outcomes.set(
        req.id,
        withSlot(() => runJev(toWire(world, req)))
          .then((ans): Outcome => ({ ok: true, ans }))
          .catch((e: Error): Outcome => ({ ok: false, message: e.message })),
      )
    }

    // Answers land `think` ticks after the request was issued, applied in id order.
    const due = [...outcomes.keys()]
      .filter((id) => {
        const req = session.request(id) as SimRequest | undefined
        return !req || req.tick <= world.tick - think + 1
      })
      .sort((a, b) => a - b)
    for (const id of due) {
      const outcome = await outcomes.get(id)!
      outcomes.delete(id)
      if (outcome.ok) session.answer(id, outcome.ans, mode)
      else session.fail(id, outcome.message)
      if (verbose && outcome.ok) {
        const agent = world.agents.find((a) => a.decisions.at(-1)?.tick === world.tick && a.decisions.length)
        const d = agent?.decisions.at(-1)
        if (agent && d) console.log(`${tag} ${formatClock(world.tick)} ${agent.persona.name}: ${d.pickedLabel}`)
      }
    }

    if (world.tick % 72 === 0) {
      const m = session.metrics.at(-1)!.values
      console.log(
        `${tag} ${formatClock(world.tick).padEnd(34)} calls=${String(world.stats.calls).padStart(4)} wellbeing=${m.wellbeing.toFixed(0)} chats=${m.chats} declines=${m.declines} friends=${(m.friendship_density * 100).toFixed(0)}%`,
      )
    }
  }

  // Drain anything still in flight so the record is complete.
  for (const [id, pending] of [...outcomes.entries()].sort((a, b) => a[0] - b[0])) {
    const outcome = await pending
    if (outcome.ok) session.answer(id, outcome.ans, mode)
    else session.fail(id, outcome.message)
  }

  const stamp = new Date().toISOString()
  return session.toRecord({
    id: `${experiment}-${condition}-s${seed}-${stamp.replace(/[^0-9]/g, "").slice(0, 14)}`.toLowerCase(),
    title: `${experiment} / ${condition} / seed ${seed}`,
    createdAt: stamp,
    source: "lab",
    experiment,
    condition,
  })
}

const started = Date.now()
console.log(
  `lab: ${worlds} world(s) x ${days} day(s), drift=${driftModel}, think=${think}, mode=${mode}, concurrency=${concurrency}${interventions.length ? `, interventions=${interventions.map((i) => `${i.intervention.kind}@${i.tick}`).join(",")}` : ""}`,
)
const records = await Promise.all(Array.from({ length: worlds }, (_, i) => runWorld(i)))
const seconds = ((Date.now() - started) / 1000).toFixed(0)

mkdirSync("runs", { recursive: true })
for (const r of records) writeFileSync(`runs/${r.meta.id}.json.gz`, gzipSync(JSON.stringify(r)))

console.log(`\ndone in ${seconds}s. final metrics:`)
const header = ["metric", ...records.map((r) => `seed ${r.config.seed}`)]
console.log(header.map((h) => h.padEnd(18)).join(""))
for (const def of METRICS) {
  const cells = records.map((r) => {
    const v = r.metrics.at(-1)!.values[def.id]
    return Number.isInteger(v) ? String(v) : v.toFixed(def.id === "cost_usd" ? 4 : 2)
  })
  console.log([def.id, ...cells].map((c) => c.padEnd(18)).join(""))
}
for (const r of records) console.log(`recorded ${r.meta.id}: ${r.events.length} events`)

// Who did what: each villager's share of chosen actions by driver, from a replay of the record.
const { ReplayCursor } = await import("@/lib/sim/session")
const { digestRun } = await import("@/lib/sim/digest")
for (const r of records) {
  const cursor = new ReplayCursor(r)
  cursor.seek(r.meta.endTick)
  console.log(`\nvillagers, seed ${r.config.seed} (replay desyncs: ${cursor.desyncs}):`)
  for (const a of cursor.world.agents) {
    const total = Object.values(a.drivers).reduce((n, v) => n + (v ?? 0), 0) || 1
    const top = Object.entries(a.drivers)
      .sort((x, y) => (y[1] ?? 0) - (x[1] ?? 0))
      .slice(0, 4)
      .map(([k, v]) => `${k} ${Math.round(((v ?? 0) / total) * 100)}%`)
      .join(", ")
    const picks = new Map<string, number>()
    for (const d of a.decisions) if (d.kind === "decide") picks.set(d.picked.replace(/_.*/, ""), (picks.get(d.picked.replace(/_.*/, "")) ?? 0) + 1)
    const topPicks = [...picks.entries()].sort((x, y) => y[1] - x[1]).slice(0, 4).map(([k, n]) => `${k}x${n}`).join(" ")
    console.log(`  ${a.persona.name.padEnd(8)} ${a.persona.vocation.slice(0, 18).padEnd(19)} ${top.padEnd(52)} ${topPicks}`)
  }

  if (assess) {
    // JEV's estimate of whether this run is interesting to the owner. Advisory only.
    const digest = digestRun(cursor.world, r.meta.title)
    const ans = await runJev({ kind: "assess", payload: digest })
    const level = (q: string) => {
      const a = ans.answers[q]
      return a?.type === "score" ? a.score : 0
    }
    const prob = (q: string) => {
      const a = ans.answers[q]
      return a?.type === "boolean" ? a.probability : 0
    }
    const pick = (q: string) => {
      const a = ans.answers[q]
      return a?.type === "choice" ? a.choice : ""
    }
    const INTEREST = ["boring", "mildly interesting", "interesting", "very interesting", "fascinating"]
    const DISTINCT = ["all the same", "slightly different", "clearly different", "very distinct", "vivid individuals"]
    const SOCIETY = ["no society", "a crowd", "some social structure", "a real community", "a complex society"]
    r.meta.assessment = {
      interest: INTEREST[Math.round(level("interest"))],
      interestScore: level("interest"),
      surprise: prob("surprise"),
      distinct: DISTINCT[Math.round(level("distinct"))],
      society: SOCIETY[Math.round(level("society"))],
      story: prob("story"),
      missing: pick("missing"),
      best: pick("best"),
    }
    const m = r.meta.assessment
    console.log(
      `\nJEV assessment (advisory): ${m.interest} (${m.interestScore.toFixed(2)}/4), villagers ${m.distinct}, ${m.society}, surprise p=${m.surprise.toFixed(2)}, story p=${m.story.toFixed(2)}\n  best part: ${m.best}; most missing: ${m.missing}`,
    )
  }
}

if (upload) {
  for (const r of records) await saveRun(r)
  console.log(`uploaded ${records.length} run(s) to Blob`)
}
