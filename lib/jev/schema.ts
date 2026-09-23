import { z } from "zod"

// The wire contract between the browser sim and the JEV route. The route
// never accepts free-form prompts: it accepts a typed perception and builds
// the JEV state text itself, so this endpoint cannot be used as a generic
// model proxy.

export const BODY_KEYS = ["hunger", "thirst", "energy", "health"] as const
export const MIND_KEYS = ["social", "fun", "purpose", "respect"] as const
export const NEED_KEYS = [...BODY_KEYS, ...MIND_KEYS] as const
export type NeedKey = (typeof NEED_KEYS)[number]

/** The fixed motive readout asked alongside every decision. JEV's self-model, not an explanation. */
export const MOTIVES = {
  purpose: "doing meaningful work or making something",
  care: "looking after someone they care about",
  belonging: "being part of the group",
  status: "being respected or getting ahead of others",
  security: "feeling safe and provided for",
  pleasure: "comfort and enjoyment",
  curiosity: "discovering something new",
  grievance: "getting back at someone",
  gain: "getting more for themselves",
  duty: "doing what is expected or right",
} as const
export type MotiveKey = keyof typeof MOTIVES

export const MOOD_LEVELS = ["miserable", "low", "okay", "good", "great"] as const
export type MoodLabel = (typeof MOOD_LEVELS)[number]

const need = z.number().min(0).max(100)
const line = z.string().max(400)

export const needsSchema = z.object({
  hunger: need,
  thirst: need,
  energy: need,
  health: need,
  social: need,
  fun: need,
  purpose: need,
  respect: need,
})

export const perceptionSchema = z.object({
  name: z.string().min(1).max(40),
  role: z.string().max(60),
  blurb: z.string().max(200),
  /** First-person psychology lines from psycheLines(). */
  psyche: z.array(line).max(8),
  clock: z.string().max(80),
  location: z.string().max(160),
  needs: needsSchema,
  /** Why a need is where it is, e.g. "you have done no meaningful work today". */
  needCauses: z.partialRecord(z.enum(NEED_KEYS), line),
  noticing: z.array(line).max(32),
  memories: z.array(line).max(12),
  feelings: z.array(line).max(8),
})

export const optionSchema = z.object({
  id: z.string().regex(/^[a-z0-9_]{1,40}$/),
  label: z.string().max(90),
  detail: z.string().max(400),
})

export const decidePayloadSchema = z.object({
  perception: perceptionSchema,
  options: z.array(optionSchema).min(2).max(64),
})

/** What the approached villager is told. It never reveals whether a plea is honest. */
export const offerWireSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("chat") }),
  z.object({ kind: z.literal("gift_food"), n: z.number().int().min(1).max(10) }),
  z.object({ kind: z.literal("gift_coins"), n: z.number().int().min(1).max(50) }),
  z.object({ kind: z.literal("ask_food") }),
  z.object({ kind: z.literal("lend"), amount: z.number().int().min(1).max(50), owed: z.number().int().min(1).max(100) }),
  z.object({ kind: z.literal("demand_repay"), owed: z.number().int().min(1).max(100) }),
])
export type OfferWire = z.infer<typeof offerWireSchema>

export const respondPayloadSchema = z.object({
  perception: perceptionSchema,
  askerName: z.string().min(1).max(40),
  offer: offerWireSchema,
  /** What the approached villager has on them, which bounds their honest replies. */
  can: z.object({ food: z.number().int().min(0).max(20), coins: z.number().int().min(0).max(500) }),
})

export const ASSESS_ROADMAP = {
  economy: "an economy: money, buying, selling, trade, exploitation and charity",
  trait_evolution: "personalities that change over time from what people do and what happens to them",
  town_and_jobs: "an actual small town with real jobs and institutions (police, doctor, shop, mayor)",
  social_life: "richer social life: group conversations, gossip, opinions, persuasion, factions",
  family: "family life: courtship, partnership, children, aging and death",
  conflict_and_justice: "conflict and justice: theft, fights, murder, police, trials, revenge",
  experiment_tools: "experiment tools: scenarios, interventions, forks and comparisons",
  legibility: "making what happens easier to see and follow on screen",
  less_repetition: "less repetitive behaviour and more varied days",
} as const

export const ASSESS_HIGHLIGHTS = {
  psychology: "villagers behaving according to their individual psychology",
  cooperation: "cooperation, building and providing for others",
  social_ties: "friendships, rejections and relationships forming",
  temptation: "scarcity, temptation and people breaking agreements",
  exploration: "curiosity and exploration",
  none: "nothing stands out",
} as const

export const assessPayloadSchema = z.object({
  title: z.string().max(120),
  summary: z.array(line).max(60),
  villagers: z.array(line).max(20),
})

/**
 * Every JEV call kind the sim can make. Add a kind here, give it a state and
 * question builder in kinds.ts, and interpret its answers in the engine.
 */
export const jevRequestSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("decide"), payload: decidePayloadSchema }),
  z.object({ kind: z.literal("respond"), payload: respondPayloadSchema }),
  z.object({ kind: z.literal("assess"), payload: assessPayloadSchema }),
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
