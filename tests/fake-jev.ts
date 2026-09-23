import { replyCriteria } from "@/lib/jev/prompt"
import type { JevAnswer } from "@/lib/jev/schema"
import type { SimRequest } from "@/lib/sim/engine"

// A deterministic stand-in for JEV so the replay test needs no network.
export function fakeAnswer(req: SimRequest): JevAnswer {
  const h = (n: number) => ((req.id * 2654435761 + n * 97) >>> 0) / 4294967296
  const mood = { type: "score" as const, score: Math.floor(h(1) * 5), probabilities: { "0": 0.1, "1": 0.2, "2": 0.4, "3": 0.2, "4": 0.1 } }
  if (req.kind === "decide") {
    const weights = req.options.map((_, i) => h(i + 2) + 0.05)
    const total = weights.reduce((a, b) => a + b, 0)
    const probabilities = Object.fromEntries(req.options.map((o, i) => [o.id, weights[i] / total]))
    const choice = req.options[weights.indexOf(Math.max(...weights))].id
    const motive = { type: "choice" as const, choice: "purpose", probabilities: { purpose: 0.6, gain: 0.4 } }
    return { kind: "decide", state: "", answers: { action: { type: "choice", choice, probabilities }, mood, motive }, confidence: { action: 0.5 }, latencyMs: 300, costUsd: 0.00002 }
  }
  if (req.kind === "reflect") {
    const score = (n: number) => ({ type: "score" as const, score: n, probabilities: { [String(n)]: 1 } })
    const pickOf = (ids: string[]) => ids[Math.floor(h(5) * ids.length)]
    const one = (id: string) => ({ type: "choice" as const, choice: id, probabilities: { [id]: 1 } })
    const answers: JevAnswer["answers"] = {
      meaning: score(Math.floor(h(6) * 5)),
      trust_people: score(Math.floor(h(7) * 5)),
      change: one(pickOf(["unchanged", "more_wary", "more_generous", "more_ruthless", "more_content"])),
      mood,
    }
    if (req.today.length) answers.keep = one(`m${Math.floor(h(8) * req.today.length)}`)
    if (req.helpers.length) answers.grateful_to = one(req.helpers[0][0])
    if (req.wrongers.length) answers.grudge = one(req.wrongers[0][0])
    if (req.askGoal) answers.goal = one(pickOf(["build", "wealth", "family", "revenge"]))
    return { kind: "reflect", state: "", answers, confidence: {}, latencyMs: 300, costUsd: 0.00002 }
  }
  if (req.kind === "press") {
    return { kind: "press", state: "", answers: { press: { type: "boolean", probability: h(5) }, mood }, confidence: {}, latencyMs: 300, costUsd: 0.00002 }
  }
  if (req.wire.kind === "chat") {
    return { kind: "respond", state: "", answers: { engage: { type: "boolean", probability: h(3) }, mood }, confidence: {}, latencyMs: 300, costUsd: 0.00002 }
  }
  const ids = Object.keys(replyCriteria(req.wire, req.can, "them"))
  const choice = ids[Math.floor(h(4) * ids.length)]
  const probabilities = Object.fromEntries(ids.map((id) => [id, id === choice ? 0.7 : 0.3 / Math.max(1, ids.length - 1)]))
  return { kind: "respond", state: "", answers: { reply: { type: "choice", choice, probabilities }, mood }, confidence: {}, latencyMs: 300, costUsd: 0.00002 }
}

