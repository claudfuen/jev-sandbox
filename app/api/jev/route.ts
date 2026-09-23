import { experimental_evaluate as evaluate } from "ai"

import { ensureGatewayKey } from "@/lib/jev/gateway-key"
import { buildState, decideQuestions, JEV_MODEL, respondQuestions } from "@/lib/jev/prompt"
import {
  jevRequestSchema,
  MOOD_LEVELS,
  type JevResponse,
  type MoodReading,
} from "@/lib/jev/schema"

const TIMEOUT_MS = 20_000

function readMood(answer: { score: number; probabilities?: Record<string, number> }): MoodReading {
  const probabilities = MOOD_LEVELS.map((_, i) => answer.probabilities?.[String(i)] ?? 0)
  const level = Math.max(0, Math.min(MOOD_LEVELS.length - 1, Math.round(answer.score)))
  return { level, label: MOOD_LEVELS[level], probabilities }
}

function readCost(providerMetadata: unknown): number | null {
  const gateway = (providerMetadata as { gateway?: { marketCost?: string; cost?: string } } | undefined)
    ?.gateway
  const raw = gateway?.marketCost ?? gateway?.cost
  const value = raw === undefined ? NaN : Number.parseFloat(raw)
  return Number.isFinite(value) ? value : null
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  const parsed = jevRequestSchema.safeParse(body)
  if (!parsed.success) {
    return Response.json({ error: "Invalid JEV request" }, { status: 400 })
  }

  try {
    ensureGatewayKey()
  } catch (error) {
    return Response.json({ error: (error as Error).message }, { status: 500 })
  }

  const req = parsed.data
  const state = buildState(req.perception)
  const started = Date.now()

  try {
    if (req.kind === "decide") {
      const result = await evaluate({
        model: JEV_MODEL,
        state,
        questions: decideQuestions(req.perception, req.options),
        abortSignal: AbortSignal.timeout(TIMEOUT_MS),
      })
      const action = result.answers.action
      const response: JevResponse = {
        kind: "decide",
        state,
        choice: action.choice,
        probabilities: action.probabilities ?? { [action.choice]: 1 },
        mood: readMood(result.answers.mood),
        latencyMs: Date.now() - started,
        costUsd: readCost(result.providerMetadata),
      }
      return Response.json(response)
    }

    const result = await evaluate({
      model: JEV_MODEL,
      state,
      questions: respondQuestions(req.perception, req.askerName),
      abortSignal: AbortSignal.timeout(TIMEOUT_MS),
    })
    const response: JevResponse = {
      kind: "respond",
      state,
      engageProbability: result.answers.engage.probability,
      mood: readMood(result.answers.mood),
      latencyMs: Date.now() - started,
      costUsd: readCost(result.providerMetadata),
    }
    return Response.json(response)
  } catch (error) {
    return Response.json(
      { error: `JEV call failed: ${(error as Error).message}` },
      { status: 502 },
    )
  }
}
