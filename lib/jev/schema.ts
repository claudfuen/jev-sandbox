import { z } from "zod"

// The wire contract between the browser sim and the JEV route. The route
// never accepts free-form prompts: it accepts a typed perception and builds
// the JEV state text itself, so this endpoint cannot be used as a generic
// model proxy.

export const NEED_KEYS = ["hunger", "thirst", "energy", "social", "fun"] as const
export type NeedKey = (typeof NEED_KEYS)[number]

export const MOOD_LEVELS = ["miserable", "low", "okay", "good", "great"] as const
export type MoodLabel = (typeof MOOD_LEVELS)[number]

const need = z.number().min(0).max(100)
const line = z.string().max(240)

export const needsSchema = z.object({
  hunger: need,
  thirst: need,
  energy: need,
  social: need,
  fun: need,
})

export const perceptionSchema = z.object({
  name: z.string().min(1).max(40),
  blurb: z.string().max(400),
  traits: z.array(z.string().max(40)).max(8),
  clock: z.string().max(80),
  location: z.string().max(160),
  needs: needsSchema,
  noticing: z.array(line).max(24),
  memories: z.array(line).max(12),
  feelings: z.array(line).max(8),
})

export const optionSchema = z.object({
  id: z.string().regex(/^[a-z0-9_]{1,40}$/),
  label: z.string().max(80),
  detail: z.string().max(200),
})

export const decidePayloadSchema = z.object({
  perception: perceptionSchema,
  options: z.array(optionSchema).min(2).max(64),
})

export const respondPayloadSchema = z.object({
  perception: perceptionSchema,
  askerName: z.string().min(1).max(40),
})

/**
 * Every JEV call kind the sim can make. Add a kind here, give it a state and
 * question builder in kinds.ts, and interpret its answers in the engine.
 */
export const jevRequestSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("decide"), payload: decidePayloadSchema }),
  z.object({ kind: z.literal("respond"), payload: respondPayloadSchema }),
])

export type Needs = z.infer<typeof needsSchema>
export type Perception = z.infer<typeof perceptionSchema>
export type WireOption = z.infer<typeof optionSchema>
export type JevRequest = z.infer<typeof jevRequestSchema>
export type JevKind = JevRequest["kind"]

export type MoodReading = {
  level: number
  label: MoodLabel
  probabilities: number[]
}

/** One JEV answer, normalized so every question type has a predictable shape. */
export type RawAnswer =
  | { type: "choice"; choice: string; probabilities: Record<string, number> }
  | { type: "boolean"; probability: number }
  | { type: "score"; score: number; probabilities: Record<string, number> }

/** What the route (or the lab runner) returns for any kind. */
export type JevAnswer = {
  kind: JevKind
  state: string
  answers: Record<string, RawAnswer>
  confidence: Record<string, number>
  latencyMs: number
  costUsd: number | null
}
