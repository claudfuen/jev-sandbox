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
  const session = new Session({ seed })
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
  `lab: ${worlds} world(s) x ${days} day(s), think=${think}, mode=${mode}, concurrency=${concurrency}${interventions.length ? `, interventions=${interventions.map((i) => `${i.intervention.kind}@${i.tick}`).join(",")}` : ""}`,
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

if (upload) {
  for (const r of records) await saveRun(r)
  console.log(`uploaded ${records.length} run(s) to Blob`)
}
