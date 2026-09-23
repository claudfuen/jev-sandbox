// Headless run: the real engine and real JEV calls, no browser. Prints every decision.
//   bun scripts/headless.ts [ticks] [sample|argmax]
import { experimental_evaluate as evaluate } from "ai"

import { ensureGatewayKey } from "@/lib/jev/gateway-key"
import { buildState, decideQuestions, JEV_MODEL, respondQuestions } from "@/lib/jev/prompt"
import { MOOD_LEVELS, type DecideResponse, type RespondResponse } from "@/lib/jev/schema"
import { formatTime } from "@/lib/sim/clock"
import { applyDecision, applyResponse, createWorld, describeStatus, failRequest, step, toWire, type SimRequest } from "@/lib/sim/engine"
import type { ChoiceMode } from "@/lib/sim/types"

const ticks = Number(process.argv[2] ?? 80)
const mode = (process.argv[3] ?? "sample") as ChoiceMode
ensureGatewayKey()
const world = createWorld()

async function call(req: SimRequest) {
  const wire = toWire(world, req)
  const state = buildState(wire.perception)
  const t0 = Date.now()
  if (wire.kind === "decide") {
    const r = await evaluate({ model: JEV_MODEL, state, questions: decideQuestions(wire.perception, wire.options) })
    const mood = { level: Math.round(r.answers.mood.score), label: MOOD_LEVELS[Math.round(r.answers.mood.score)], probabilities: [] }
    const res: DecideResponse = { kind: "decide", state, choice: r.answers.action.choice, probabilities: r.answers.action.probabilities ?? {}, mood, latencyMs: Date.now() - t0, costUsd: null }
    applyDecision(world, req.agentId, res, mode)
    const a = world.agents.find((x) => x.id === req.agentId)!
    const d = a.decisions.at(-1)!
    console.log(`${formatTime(world.tick).padStart(8)}  ${a.persona.name.padEnd(8)} -> ${d.pickedLabel.padEnd(34)} ${d.options.slice(0, 3).map((o) => `${o.id}=${o.p.toFixed(2)}`).join(" ")}  mood=${mood.label} ${res.latencyMs}ms`)
  } else {
    const r = await evaluate({ model: JEV_MODEL, state, questions: respondQuestions(wire.perception, wire.askerName) })
    const mood = { level: Math.round(r.answers.mood.score), label: MOOD_LEVELS[Math.round(r.answers.mood.score)], probabilities: [] }
    const res: RespondResponse = { kind: "respond", state, engageProbability: r.answers.engage.probability, mood, latencyMs: Date.now() - t0, costUsd: null }
    applyResponse(world, req.agentId, res, mode)
    const a = world.agents.find((x) => x.id === req.agentId)!
    console.log(`${formatTime(world.tick).padStart(8)}  ${a.persona.name.padEnd(8)} <- asked by ${wire.askerName}: p(engage)=${res.engageProbability.toFixed(2)} -> ${a.decisions.at(-1)!.pickedLabel}`)
  }
}

for (let i = 0; i < ticks; i++) {
  const reqs = step(world, { allowDecisions: true })
  // Resolve calls before the next tick so the headless run is easy to read.
  await Promise.all(reqs.map((r) => call(r).catch((e) => failRequest(world, r, (e as Error).message))))
}
console.log("\nfinal:")
for (const a of world.agents) {
  console.log(`  ${a.persona.name.padEnd(8)} ${describeStatus(world, a).padEnd(40)} ${Object.entries(a.needs).map(([k, v]) => `${k}=${Math.round(v)}`).join(" ")}`)
}
console.log(`\nlog:`); for (const l of world.log.slice(-15)) console.log(`  ${formatTime(l.tick)} ${l.text}`)
