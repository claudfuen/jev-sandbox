import type { GoalKey, MoodReading, MotiveKey, Needs, NeedKey } from "@/lib/jev/schema"

import type { Psyche } from "./psyche"

export type Vec = { x: number; y: number }
export type Dir = "up" | "down" | "left" | "right"

export type Tile =
  | "grass"
  | "tallgrass"
  | "flowers"
  | "path"
  | "sand"
  | "water"
  | "tree"
  | "bush"
  | "house"
  | "door"
  | "campfire"
  | "well"
  | "sign"
  | "rock"
  | "site"
  | "store"
  | "stall"
  // Fernhollow town tiles
  | "building"
  | "lot"
  | "bridge_lot"
  | "scaffold"
  | "bridge"
  | "field"
  | "fountain"
  | "board"
  | "dock"
  | "grave"
  | "fence"
  | "ford"

export type House = { id: string; residents: string[]; x: number; y: number; door: Vec }

/** Town buildings (Fernhollow). Interiors are abstract: people inside a building can see each other. */
export type BuildingKind =
  | "home"
  | "farmhouse"
  | "clinic"
  | "police"
  | "town_hall"
  | "school"
  | "chapel"
  | "store"
  | "diner"
  | "inn"
  | "crier"
  | "workshop"

export type Building = {
  /** e.g. "b_clinic", "h_vale", "h_harrow" */
  id: string
  kind: BuildingKind
  /** e.g. "the clinic", "the Vale house" */
  name: string
  /** Top-left footprint tile and size in tiles. */
  pos: Vec
  size: Vec
  /** The single door tile, walkable, in the bottom row, opening onto a lane. */
  door: Vec
  /** Posted hours: minutes of day and ISO weekdays (1 = Monday .. 7 = Sunday); null for homes and always-open places. */
  hours: { open: number; close: number; days: number[] } | null
  /** Persona ids of the people who live here (homes, and the inn for the innkeeper). */
  residents: string[]
}

export type JobId =
  | "mayor"
  | "police_officer"
  | "doctor"
  | "nurse"
  | "teacher"
  | "journalist"
  | "carpenter"
  | "shopkeeper"
  | "cook"
  | "innkeeper"
  | "farmer"
  | "fisher"
export type Bush = { id: string; pos: Vec; berries: number; nextRegrow: number }
export type Poi = { id: string; name: string; stand: Vec }
export type Landmark = { name: string; center: Vec; radius: number; houseId?: string }

/** A shared, multi-session build that persists on the map. */
export type Project = {
  id: string
  name: string
  /** Top-left of the footprint, in tiles. */
  pos: Vec
  size: Vec
  sessionsDone: number
  sessionsNeeded: number
  contributors: Record<string, number>
  doneAt: number | null
}

/** The communal food store at the plaza. */
export type Store = { pos: Vec; food: number; nextSpoil: number }

/** What a villager's day job actually does in the world. */
export type CraftKind = "build" | "cook" | "farm" | "forage" | "fish" | "keep_shop" | "shrine" | "stories"

export type Persona = {
  id: string
  name: string
  vocation: string
  craft: CraftKind
  blurb: string
  psyche: Psyche
  colors: { hair: string; skin: string; shirt: string; pants: string }
  /** Multipliers on the base per-tick drain of bodily needs. */
  decay: Partial<Record<NeedKey, number>>
  start: Needs
  coins: number
}

/**
 * What an action is "about", for measurement only. Never sent to JEV, never
 * used to rank options. JEV's own motive readout is recorded separately.
 */
export type DriverKey =
  | "body"
  | "purpose"
  | "building"
  | "providing"
  | "mastery"
  | "belonging"
  | "curiosity"
  | "pleasure"
  | "generosity"
  | "security"
  | "greed"
  | "rest"
  | "trade"
  | "kindness"
  | "deception"
  | "exploitation"
  | "theft"
  | "duty"
  | "confrontation"

export const PROSOCIAL_DRIVERS: DriverKey[] = ["building", "providing", "generosity", "kindness", "duty"]
export const ANTISOCIAL_DRIVERS: DriverKey[] = ["greed", "theft", "deception", "exploitation"]

/** What one villager brings to another when they walk up to them. */
export type Offer =
  | { kind: "chat" }
  | { kind: "compliment" }
  | { kind: "gift_food"; n: number }
  | { kind: "gift_coins"; n: number }
  /** `honest` is known only to the asker; the target hears the same plea either way. */
  | { kind: "ask_food"; honest: boolean }
  | { kind: "lend"; amount: number; owed: number }
  | { kind: "pickpocket" }
  | { kind: "repay"; debtId: string }
  | { kind: "demand_repay"; debtId: string }

export type Debt = {
  id: string
  creditorId: string
  debtorId: string
  lent: number
  owed: number
  dueTick: number
  state: "open" | "repaid" | "defaulted"
}

/** A lie told for gain. Discovered if the victim later sees the liar with food. */
export type Lie = { id: string; liarId: string; victimId: string; tick: number; discovered: boolean }

/** The market stall: the shopkeeper sets the price; anyone can buy or sell. */
export type Stall = { pos: Vec; food: number; coins: number; price: number; buyPrice: number }

export type Intent =
  | { kind: "eat"; bushId: string }
  | { kind: "drink" }
  | { kind: "sleep" }
  | { kind: "approach"; targetId: string; offer: Offer }
  | { kind: "explore"; poiId: string }
  | { kind: "campfire" }
  | { kind: "wander"; target: Vec }
  | { kind: "rest" }
  | { kind: "work" }
  | { kind: "build"; projectId: string }
  | { kind: "gather"; bushId: string }
  | { kind: "deposit" }
  | { kind: "meal" }
  | { kind: "take_store" }
  | { kind: "eat_carry" }
  | { kind: "buy" }
  | { kind: "sell" }
  | { kind: "set_price"; price: number }

export type OptionSpec = { id: string; label: string; detail: string; intent: Intent; drivers: DriverKey[] }

/** One status per agent is the single source of truth for what it is doing. */
export type Status =
  | { kind: "idle"; retryAt: number }
  | { kind: "deciding"; since: number; options: OptionSpec[] }
  | { kind: "moving"; intent: Intent; path: Vec[]; startedAt: number; waited: number }
  | { kind: "acting"; intent: Intent; ticksLeft: number }
  | { kind: "asking"; targetId: string; since: number }
  | { kind: "considering"; askerId: string; offer: Offer; resume: Status; since: number }
  | { kind: "chatting"; partnerId: string; ticksLeft: number }
  | { kind: "sleeping" }
  | { kind: "collapsed"; ticksLeft: number }

export type ChoiceMode = "sample" | "argmax"

export type DecisionRecord = {
  tick: number
  kind: "decide" | "respond" | "reflect"
  state: string
  options: { id: string; label: string; p: number }[]
  picked: string
  pickedLabel: string
  mode: ChoiceMode
  latencyMs: number
  /** JEV's own readout of what drove the choice, and its confidence in the action. */
  motive: { id: MotiveKey; p: number }[] | null
  confidence: number | null
  drivers: DriverKey[]
}

export type MemoryEntry = { tick: number; text: string }

export type Flash = { kind: "heart" | "angry" | "exclaim" | "sweat" | "eye" | "thanks" | "coin" | "gift"; until: number }

export type DriftEntry = { tick: number; key: string; delta: number; cause: string }

export type Agent = {
  id: string
  persona: Persona
  /** The living psyche: starts from the persona and can drift with experience. */
  psyche: Psyche
  pos: Vec
  prev: Vec
  facing: Dir
  steps: number
  inside: boolean
  needs: Needs
  needCause: Partial<Record<NeedKey, string>>
  /** Food portions carried (berries or fish). */
  carry: number
  coins: number
  /** How this villager's psyche has changed, and why. */
  drift: DriftEntry[]
  driftToday: { day: number; used: Record<string, number> }
  /** Coins stolen without them noticing yet; discovered at their next decision. */
  missingCoins: number
  /** The psyche they were born with; reflection drift is capped relative to it. */
  psycheAtBirth: Psyche
  lastReflectDay: number
  /** Who helped and who wronged them today, for tonight's reflection. */
  today: { day: number; helpers: string[]; wrongers: string[] }
  /** Moments JEV said they will carry for years. */
  formative: MemoryEntry[]
  goal: GoalKey | null
  /** How meaningful last night's reflection said the day was, 0..100. */
  meaning: number | null
  grudges: string[]
  gratitude: string[]
  status: Status
  memory: MemoryEntry[]
  affinity: Record<string, number>
  visited: Record<string, number>
  decisions: DecisionRecord[]
  /** Chosen actions per driver tag (fractional when an action has several tags). */
  drivers: Partial<Record<DriverKey, number>>
  mood: MoodReading | null
  flash: Flash | null
  lastPurposeTick: number
}

export type LogEntry = {
  tick: number
  text: string
  agentIds: string[]
  tone: "info" | "social" | "error" | "conflict" | "good"
}

export type Stats = {
  calls: number
  decisions: number
  responses: number
  errors: number
  totalLatencyMs: number
  costUsd: number
}

/**
 * How personalities change. "jev": only through JEV's nightly reflection (default).
 * "engine": engine rules for habit and experience (lib/sim/drift.ts). "off": fixed.
 */
export type DriftModel = "jev" | "engine" | "off"

export type WorldConfig = { seed: number; scenario: string; driftModel: DriftModel }

/** Observer interventions. Recorded with the run so replays reproduce them. */
export type Intervention =
  | { kind: "famine" }
  | { kind: "bounty" }
  | { kind: "drain_store" }
  | { kind: "fill_store" }

export type World = {
  config: WorldConfig
  tick: number
  rng: number
  /** Monotonic id for JEV requests; deterministic, so replays can match answers. */
  requestSeq: number
  /** Cumulative event counts used by metrics (chats, declines, meals...). */
  counters: Record<string, number>
  tiles: Tile[]
  houses: House[]
  bushes: Bush[]
  pois: Poi[]
  landmarks: Landmark[]
  campfire: Vec
  project: Project
  store: Store
  stall: Stall
  debts: Debt[]
  lies: Lie[]
  /** Help given from one villager to another, "from>to" to count, for reciprocity. */
  favors: Record<string, number>
  agents: Agent[]
  log: LogEntry[]
  stats: Stats
}
