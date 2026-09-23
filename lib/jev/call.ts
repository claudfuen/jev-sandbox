import { experimental_evaluate as evaluate } from "ai"

import { ensureGatewayKey } from "./gateway-key"
import { buildJevCall } from "./kinds"
import { JEV_MODEL } from "./prompt"
import type { JevAnswer, JevRequest, RawAnswer } from "./schema"

// Server-only: the one place that talks to JEV. The route and the lab runner
// both go through here, so live runs and headless experiments are identical.

const TIMEOUT_MS = 20_000

type SdkAnswer =
  | { type: "choice"; choice: string; probabilities?: Record<string, number> }
  | { type: "boolean"; probability: number }
  | { type: "score"; score: number; probabilities?: Record<string, number> }

function normalize(answer: SdkAnswer): RawAnswer {
  switch (answer.type) {
    case "choice":
      return { type: "choice", choice: answer.choice, probabilities: answer.probabilities ?? { [answer.choice]: 1 } }
    case "boolean":
      return { type: "boolean", probability: answer.probability }
    case "score":
      return { type: "score", score: answer.score, probabilities: answer.probabilities ?? {} }
  }
}

function readCost(providerMetadata: unknown): number | null {
  const gateway = (providerMetadata as { gateway?: { marketCost?: string; cost?: string } } | undefined)?.gateway
  const raw = gateway?.marketCost ?? gateway?.cost
  const value = raw === undefined ? NaN : Number.parseFloat(raw)
  return Number.isFinite(value) ? value : null
}

function readConfidence(providerMetadata: unknown): Record<string, number> {
  const confidence = (providerMetadata as { typesafe?: { confidence?: Record<string, number> } } | undefined)?.typesafe
    ?.confidence
  return confidence ?? {}
}

export async function runJev(req: JevRequest, signal?: AbortSignal): Promise<JevAnswer> {
  ensureGatewayKey()
  const { state, questions } = buildJevCall(req)
  const started = Date.now()
  const result = await evaluate({
    model: JEV_MODEL,
    state,
    questions,
    abortSignal: signal ?? AbortSignal.timeout(TIMEOUT_MS),
  })
  const answers = Object.fromEntries(
    Object.entries(result.answers).map(([id, a]) => [id, normalize(a as SdkAnswer)]),
  )
  return {
    kind: req.kind,
    state,
    answers,
    confidence: readConfidence(result.providerMetadata),
    latencyMs: Date.now() - started,
    costUsd: readCost(result.providerMetadata),
  }
}
