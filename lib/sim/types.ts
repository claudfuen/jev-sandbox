import type { MoodReading, Needs, NeedKey } from "@/lib/jev/schema"

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

export type House = { id: string; ownerId: string; x: number; y: number; door: Vec }
export type Bush = { id: string; pos: Vec; berries: number; nextRegrow: number }
export type Poi = { id: string; name: string; stand: Vec }
export type Landmark = { name: string; center: Vec; radius: number; ownerId?: string }

export type Persona = {
  id: string
  name: string
  blurb: string
  traits: string[]
  colors: { hair: string; skin: string; shirt: string; pants: string }
  /** Multipliers on the base per-tick need decay. */
  decay: Partial<Record<NeedKey, number>>
  start: Needs
}

export type Intent =
  | { kind: "eat"; bushId: string }
  | { kind: "drink" }
  | { kind: "sleep" }
  | { kind: "talk"; targetId: string }
  | { kind: "explore"; poiId: string }
  | { kind: "campfire" }
  | { kind: "wander"; target: Vec }
  | { kind: "rest" }

export type OptionSpec = { id: string; label: string; detail: string; intent: Intent }

/** One status per agent is the single source of truth for what it is doing. */
export type Status =
  | { kind: "idle"; retryAt: number }
  | { kind: "deciding"; since: number; options: OptionSpec[] }
  | { kind: "moving"; intent: Intent; path: Vec[]; startedAt: number; waited: number }
  | { kind: "acting"; intent: Intent; ticksLeft: number }
  | { kind: "asking"; targetId: string; since: number }
  | { kind: "considering"; askerId: string; resume: Status; since: number }
  | { kind: "chatting"; partnerId: string; ticksLeft: number }
  | { kind: "sleeping" }

export type ChoiceMode = "sample" | "argmax"

export type DecisionRecord = {
  tick: number
  kind: "decide" | "respond"
  state: string
  options: { id: string; label: string; p: number }[]
  picked: string
  pickedLabel: string
  mode: ChoiceMode
  latencyMs: number
}

export type MemoryEntry = { tick: number; text: string }

export type Flash = { kind: "heart" | "angry" | "exclaim" | "sweat"; until: number }

export type Agent = {
  id: string
  persona: Persona
  pos: Vec
  prev: Vec
  facing: Dir
  steps: number
  inside: boolean
  needs: Needs
  status: Status
  memory: MemoryEntry[]
  affinity: Record<string, number>
  visited: Record<string, number>
  decisions: DecisionRecord[]
  mood: MoodReading | null
  flash: Flash | null
}

export type LogEntry = { tick: number; text: string; agentIds: string[]; tone: "info" | "social" | "error" }

export type Stats = {
  calls: number
  decisions: number
  responses: number
  errors: number
  totalLatencyMs: number
  costUsd: number
}

export type WorldConfig = { seed: number; scenario: string }

/** Observer interventions. Recorded with the run so replays reproduce them. */
export type Intervention =
  | { kind: "famine" }
  | { kind: "bounty" }

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
  agents: Agent[]
  log: LogEntry[]
  stats: Stats
}
