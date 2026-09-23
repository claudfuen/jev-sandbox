import type { JevAnswer, JevRequest, MoodReading, MotiveKey, NeedKey, OfferWire, Perception, RawAnswer } from "@/lib/jev/schema"
import { replyCriteria } from "@/lib/jev/prompt"
import { BODY_KEYS, MOOD_LEVELS, NEED_KEYS } from "@/lib/jev/schema"

import { clockOf, formatClock, formatTime, isNight } from "./clock"
import {
  adjacent,
  compass,
  distanceField,
  facingToward,
  findPath,
  manhattan,
  neighbors,
  sameTile,
  stepsTo,
} from "./geometry"
import { buildMap, idx, isWalkable, MAP_W, tileAt } from "./map"
import { FOUNDING_AFFINITY, PERSONAS } from "./personas"
import { habit, lifeEvent } from "./drift"
import { needRates, psycheLines } from "./psyche"
import type {
  Agent,
  ChoiceMode,
  CraftKind,
  DecisionRecord,
  DriverKey,
  House,
  Intent,
  Intervention,
  LogEntry,
  Offer,
  OptionSpec,
  Status,
  Vec,
  World,
  WorldConfig,
} from "./types"

// ---------------------------------------------------------------------------
// Tuning

const BASE_DECAY: Record<NeedKey, number> = {
  hunger: 0.3,
  thirst: 0.38,
  energy: 0.2,
  health: 0,
  social: 0.28,
  fun: 0.3,
  purpose: 0.1,
  respect: 0.05,
}
const NIGHT_ENERGY_DECAY = 0.15
const SLEEP_ENERGY_GAIN = 0.85
const BERRY_MAX = 3
const BERRY_REGROW_TICKS = 50
const ERROR_BACKOFF_TICKS = 12
const CHASE_GIVE_UP_TICKS = 50
const BUSY_WAIT_TICKS = 10
const MEMORY_KEEP = 14
const MEMORY_IN_PROMPT = 7
const DECISIONS_KEEP = 24
const LOG_KEEP = 200
const TALK_OPTIONS = 3
const CARRY_CAP = 4
const WITNESS_RADIUS = 6
const STORE_SPOIL_TICKS = 72
const STORE_SAFE_WITHOUT_GRANARY = 6
const LOAN_GRACE_TICKS = 144
const LIE_MEMORY_TICKS = 96
const PICKPOCKET_MAX = 3
const MEAL_START = 18 * 60
const MEAL_END = 19 * 60 + 30

const ACT_TICKS = {
  eat: 3,
  drink: 2,
  explore: 5,
  campfire: 8,
  wander: 2,
  rest: 6,
  work: 10,
  build: 12,
  gather: 2,
  deposit: 1,
  meal: 3,
  take_store: 1,
  eat_carry: 2,
  buy: 1,
  sell: 1,
  set_price: 10,
} satisfies Record<Exclude<Intent["kind"], "sleep" | "approach">, number>
const CHAT_TICKS = 6
const COLLAPSE_TICKS = 36
const HEALTH_LOSS = 0.35

// ---------------------------------------------------------------------------
// Setup

function nextRandom(world: World): number {
  // mulberry32
  world.rng = (world.rng + 0x6d2b79f5) | 0
  let t = world.rng
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
}

export const DEFAULT_CONFIG: WorldConfig = { seed: 7, scenario: "founders" }

export function createWorld(config: Partial<WorldConfig> = {}): World {
  const cfg: WorldConfig = { ...DEFAULT_CONFIG, ...config }
  const map = buildMap()
  const agents: Agent[] = PERSONAS.map((persona) => {
    const house = map.houses.find((h) => h.residents.includes(persona.id))
    if (!house) throw new Error(`No house for ${persona.id}`)
    const slot = house.residents.indexOf(persona.id)
    const pos = { x: house.door.x + slot, y: house.door.y + 1 }
    const affinity = Object.fromEntries(PERSONAS.filter((p) => p.id !== persona.id).map((p) => [p.id, 0.2]))
    for (const [from, to, v] of FOUNDING_AFFINITY) if (from === persona.id) affinity[to] = v
    return {
      id: persona.id,
      persona,
      psyche: structuredClone(persona.psyche),
      pos,
      prev: { ...pos },
      facing: "down",
      steps: 0,
      inside: false,
      needs: { ...persona.start },
      needCause: {},
      carry: 0,
      coins: persona.coins,
      drift: [],
      driftToday: { day: 1, used: {} },
      missingCoins: 0,
      status: { kind: "idle", retryAt: 0 },
      memory: [{ tick: 0, text: "You woke up and stepped outside your house." }],
      affinity,
      visited: {},
      decisions: [],
      drivers: {},
      mood: null,
      flash: null,
      lastPurposeTick: -1,
    }
  })
  return {
    config: cfg,
    tick: 0,
    rng: cfg.seed,
    requestSeq: 0,
    counters: {},
    ...map,
    debts: [],
    lies: [],
    agents,
    log: [{ tick: 0, text: "A new day begins in the village.", agentIds: [], tone: "info" }],
    stats: { calls: 0, decisions: 0, responses: 0, errors: 0, totalLatencyMs: 0, costUsd: 0 },
  }
}

// ---------------------------------------------------------------------------
// Small helpers

const clamp = (v: number) => Math.max(0, Math.min(100, v))

export function agentById(world: World, id: string): Agent | undefined {
  return world.agents.find((a) => a.id === id)
}

function nameOf(world: World, id: string): string {
  return agentById(world, id)?.persona.name ?? id
}

function remember(world: World, agent: Agent, text: string) {
  agent.memory.push({ tick: world.tick, text })
  if (agent.memory.length > MEMORY_KEEP) agent.memory.shift()
}

function log(world: World, text: string, agentIds: string[], tone: LogEntry["tone"] = "info") {
  world.log.push({ tick: world.tick, text, agentIds, tone })
  if (world.log.length > LOG_KEEP) world.log.shift()
}

export function count(world: World, key: string, n = 1) {
  world.counters[key] = (world.counters[key] ?? 0) + n
}

function flash(world: World, agent: Agent, kind: NonNullable<Agent["flash"]>["kind"], ticks = 6) {
  agent.flash = { kind, until: world.tick + ticks }
}

function nudgeAffinity(agent: Agent, otherId: string, delta: number) {
  agent.affinity[otherId] = Math.max(-1, Math.min(1, (agent.affinity[otherId] ?? 0) + delta))
}

function homeOf(world: World, agent: Agent): House {
  const house = world.houses.find((h) => h.residents.includes(agent.id))
  if (!house) throw new Error(`No house for ${agent.id}`)
  return house
}

function names(world: World, ids: string[]): string {
  const ns = ids.map((id) => nameOf(world, id))
  return ns.length <= 1 ? ns.join("") : `${ns.slice(0, -1).join(", ")} and ${ns.at(-1)}`
}

const isWater = (world: World, p: Vec) => tileAt(world.tiles, p.x, p.y) === "water"
const touchesWater = (world: World, p: Vec) => neighbors(p).some((n) => isWater(world, n))
const nearCampfire = (world: World, p: Vec) =>
  Math.abs(p.x - world.campfire.x) <= 1 && Math.abs(p.y - world.campfire.y) <= 1 && !sameTile(p, world.campfire)
const atStore = (world: World, p: Vec) => adjacent(p, world.store.pos)
const atStall = (world: World, p: Vec) =>
  adjacent(p, world.stall.pos) || adjacent(p, { x: world.stall.pos.x + 1, y: world.stall.pos.y })
const atProject = (world: World, p: Vec) => {
  const { pos, size } = world.project
  const dx = Math.max(pos.x - p.x, 0, p.x - (pos.x + size.x - 1))
  const dy = Math.max(pos.y - p.y, 0, p.y - (pos.y + size.y - 1))
  return dx + dy === 1
}

const GARDEN: Vec = { x: 9, y: 13 }
const FORAGE: Vec = { x: 11, y: 17 }
const SHRINE: Vec = { x: 15, y: 16 }

function isMealTime(world: World): boolean {
  const { minuteOfDay } = clockOf(world.tick)
  return minuteOfDay >= MEAL_START - 30 && minuteOfDay < MEAL_END
}

const projectDone = (world: World) => world.project.doneAt !== null
const pctBuilt = (world: World) => Math.round((world.project.sessionsDone / world.project.sessionsNeeded) * 100)

// ---------------------------------------------------------------------------
// Crafts: each vocation's day job, what it does, and where

type Craft = {
  label: string
  detail: (world: World, agent: Agent) => string
  status: string
  goal: (world: World) => (p: Vec) => boolean
  available: (world: World, agent: Agent) => boolean
  drivers: DriverKey[]
  finish: (world: World, agent: Agent) => string
}

const addCarry = (agent: Agent, n: number) => {
  const got = Math.min(n, CARRY_CAP - agent.carry)
  agent.carry += got
  return got
}

const CRAFTS: Record<CraftKind, Craft> = {
  build: {
    label: "Do repairs and upkeep around the village",
    detail: () => "Your trade. Fix fences, doors and roofs so the village stays in good shape. About an hour of honest work.",
    status: "doing repairs around the village",
    goal: (world) => (p) => manhattan(p, world.campfire) === 3,
    available: (world) => projectDone(world),
    drivers: ["purpose", "mastery"],
    finish: () => "You spent an hour on repairs around the village.",
  },
  cook: {
    label: "Cook a hot meal from the store's food",
    detail: (world) =>
      `Your trade. A hot meal stretches the food: 2 portions from the store become 3. The store holds ${world.store.food} food. About an hour at the campfire.`,
    status: "cooking at the campfire",
    goal: (world) => (p) => nearCampfire(world, p),
    available: (world) => world.store.food >= 2,
    drivers: ["purpose", "providing", "mastery"],
    finish: (world) => {
      world.store.food += 1
      count(world, "food_cooked", 3)
      return "You cooked a hot meal and put 3 portions in the store."
    },
  },
  farm: {
    label: "Tend the garden patch",
    detail: () => "Your trade. Weeding and harvesting the garden west of the plaza brings in about 2 food to carry. About an hour.",
    status: "tending the garden",
    goal: () => (p) => sameTile(p, GARDEN),
    available: (_, agent) => agent.carry < CARRY_CAP,
    drivers: ["purpose", "providing", "mastery"],
    finish: (world, agent) => {
      const got = addCarry(agent, 2)
      count(world, "food_produced", got)
      return `You tended the garden and brought in ${got} food.`
    },
  },
  forage: {
    label: "Forage in the tall grass",
    detail: () => "Your trade. Searching the tall grass for roots and berries brings in about 2 food to carry, and you never know what you will find. About an hour.",
    status: "foraging in the tall grass",
    goal: () => (p) => sameTile(p, FORAGE),
    available: (_, agent) => agent.carry < CARRY_CAP,
    drivers: ["purpose", "providing", "curiosity"],
    finish: (world, agent) => {
      const got = addCarry(agent, 2)
      agent.needs.fun = clamp(agent.needs.fun + 10)
      count(world, "food_produced", got)
      return `You foraged in the tall grass and found ${got} food.`
    },
  },
  fish: {
    label: "Fish at the pond",
    detail: () => "Your trade. An hour with a line at the pond brings in about 2 fish to carry.",
    status: "fishing at the pond",
    goal: (world) => (p) => touchesWater(world, p),
    available: (_, agent) => agent.carry < CARRY_CAP,
    drivers: ["purpose", "providing", "mastery"],
    finish: (world, agent) => {
      const got = addCarry(agent, 2)
      count(world, "food_produced", got)
      return `You caught ${got} fish at the pond.`
    },
  },
  keep_shop: {
    label: "Mind the market stall",
    detail: () => "Your trade. Keep the stall tidy and serve whoever comes by.",
    status: "minding the market stall",
    goal: (world) => (p) => atStall(world, p),
    // The shopkeeper's work is choosing how to price: see the set_price options.
    available: () => false,
    drivers: ["purpose", "trade"],
    finish: () => "You minded the stall.",
  },
  shrine: {
    label: "Tend the shrine at the old well",
    detail: () => "Your duty. Sweep the well shrine, refresh the offerings and keep the old customs alive. About an hour.",
    status: "tending the shrine at the old well",
    goal: () => (p) => sameTile(p, SHRINE),
    available: () => true,
    drivers: ["purpose"],
    finish: (_, agent) => {
      agent.needs.respect = clamp(agent.needs.respect + 3)
      return "You tended the shrine at the old well."
    },
  },
  stories: {
    label: "Play music and tell stories by the campfire",
    detail: () => "Your calling. Anyone nearby gets a lift from the music and stories. About an hour at the campfire.",
    status: "playing music and telling stories",
    goal: (world) => (p) => nearCampfire(world, p),
    available: () => true,
    drivers: ["purpose", "pleasure", "belonging"],
    finish: () => "You played music and told stories by the campfire.",
  },
}

// ---------------------------------------------------------------------------
// Movement goals

function goalFor(world: World, agent: Agent, intent: Intent): (p: Vec) => boolean {
  switch (intent.kind) {
    case "eat":
    case "gather": {
      const bush = world.bushes.find((b) => b.id === intent.bushId)
      return (p) => !!bush && adjacent(p, bush.pos)
    }
    case "drink":
      return (p) => touchesWater(world, p)
    case "sleep": {
      const door = homeOf(world, agent).door
      return (p) => sameTile(p, door)
    }
    case "explore": {
      const poi = world.pois.find((q) => q.id === intent.poiId)
      return (p) => !!poi && sameTile(p, poi.stand)
    }
    case "campfire":
      return (p) => nearCampfire(world, p)
    case "wander":
      return (p) => sameTile(p, intent.target)
    case "rest":
    case "eat_carry":
      return () => true
    case "approach": {
      const target = agentById(world, intent.targetId)
      return (p) => !!target && manhattan(p, target.pos) <= 1
    }
    case "buy":
    case "sell":
    case "set_price":
      return (p) => atStall(world, p)
    case "work":
      return CRAFTS[agent.persona.craft].goal(world)
    case "build":
      return (p) => atProject(world, p)
    case "deposit":
    case "meal":
    case "take_store":
      return (p) => atStore(world, p)
  }
}

// ---------------------------------------------------------------------------
// Descriptions shared by the prompt and the UI (one source of truth)

function intentPhrase(world: World, intent: Intent, viewer?: Agent): string {
  switch (intent.kind) {
    case "eat":
    case "gather":
      return "the berry bushes"
    case "drink":
      return "the pond"
    case "sleep":
      return "home"
    case "explore":
      return world.pois.find((p) => p.id === intent.poiId)?.name ?? "somewhere"
    case "campfire":
      return "the campfire"
    case "wander":
      return "nowhere in particular"
    case "rest":
    case "eat_carry":
      return "a spot to rest"
    case "approach":
      return viewer && intent.targetId === viewer.id ? "you" : nameOf(world, intent.targetId)
    case "buy":
    case "sell":
    case "set_price":
      return "the market stall"
    case "work":
      return "work"
    case "build":
      return "the granary build site"
    case "deposit":
    case "meal":
    case "take_store":
      return "the village store"
  }
}

/** Third-person description of what an agent is doing. `viewer` turns "Mo" into "you". */
export function describeStatus(world: World, agent: Agent, viewer?: Agent): string {
  const who = (id: string) => (viewer && id === viewer.id ? "you" : nameOf(world, id))
  const s = agent.status
  switch (s.kind) {
    case "idle":
      return "standing around"
    case "deciding":
      return "standing still, thinking"
    case "moving":
      switch (s.intent.kind) {
        case "approach":
          return `walking over to ${who(s.intent.targetId)}`
        case "wander":
          return "wandering around"
        case "sleep":
          return "heading home"
        case "work":
          return `heading off to work (${CRAFTS[agent.persona.craft].status})`
        case "gather":
          return "going to gather berries"
        case "deposit":
          return "bringing food to the village store"
        case "meal":
          return "heading to the evening meal"
        default:
          return `heading to ${intentPhrase(world, s.intent, viewer)}`
      }
    case "acting":
      switch (s.intent.kind) {
        case "eat":
          return "eating berries"
        case "drink":
          return "drinking at the pond"
        case "explore":
          return `exploring ${intentPhrase(world, s.intent)}`
        case "campfire":
          return "hanging out by the campfire"
        case "wander":
          return "strolling around"
        case "rest":
          return "sitting and resting"
        case "work":
          return CRAFTS[agent.persona.craft].status
        case "build":
          return "working on the granary"
        case "gather":
          return "gathering berries"
        case "deposit":
          return "putting food in the village store"
        case "meal":
          return "eating at the evening meal"
        case "take_store":
          return "taking food from the village store"
        case "eat_carry":
          return "eating the food they carry"
        case "buy":
          return "buying food at the market stall"
        case "sell":
          return "selling food at the market stall"
        case "set_price":
          return "minding the market stall"
        case "approach":
          return `talking with ${who(s.intent.targetId)}`
        default:
          return "busy"
      }
    case "asking":
      return `trying to start a chat with ${who(s.targetId)}`
    case "considering":
      return `talking with ${who(s.askerId)}`
    case "chatting":
      return `chatting with ${who(s.partnerId)}`
    case "sleeping":
      return "asleep inside their house"
    case "collapsed":
      return "collapsed on the ground, too weak to move"
  }
}

export function describeLocation(world: World, agent: Agent, viewer: Agent = agent): string {
  if (agent.inside) return viewer === agent ? "inside your house" : "inside their house"
  let best: { name: string; d: number } | null = null
  for (const lm of world.landmarks) {
    const d = manhattan(agent.pos, lm.center)
    if (d > lm.radius || (best && d >= best.d)) continue
    let name = `near ${lm.name}`
    if (lm.houseId) {
      const house = world.houses.find((h) => h.id === lm.houseId)!
      name = house.residents.includes(viewer.id)
        ? "right outside your house"
        : house.residents.length
          ? `outside ${names(world, house.residents)}'s house`
          : "outside the empty house"
    }
    best = { name, d }
  }
  return best?.name ?? "out in the open fields"
}

function affinityWords(v: number): string {
  if (v >= 0.6) return "you are very fond of them"
  if (v >= 0.35) return "you like them"
  if (v >= 0.1) return "you feel friendly toward them"
  if (v > -0.15) return "you feel neutral about them"
  if (v > -0.45) return "you are a bit annoyed with them"
  return "you are upset with them"
}

function stepsPhrase(n: number | null): string {
  if (n === null) return "unreachable from here"
  if (n === 0) return "right here"
  return `${n} step${n === 1 ? "" : "s"} away`
}

function contributorsPhrase(world: World): string {
  const entries = Object.entries(world.project.contributors).sort((a, b) => b[1] - a[1])
  if (!entries.length) return "nobody has worked on it yet"
  return `worked on by ${entries.map(([id, n]) => `${nameOf(world, id)} (${n} session${n === 1 ? "" : "s"})`).join(", ")}`
}

function purposeCause(world: World, agent: Agent): string {
  if (agent.lastPurposeTick < 0) return "you have not done any meaningful work yet"
  const since = world.tick - agent.lastPurposeTick
  if (since > 144) return "you have not done meaningful work for a long while"
  return `your last meaningful work was at ${formatTime(agent.lastPurposeTick)}`
}

// ---------------------------------------------------------------------------
// Perception and options

function canApproach(target: Agent): boolean {
  return !target.inside && ["idle", "deciding", "moving", "acting"].includes(target.status.kind)
}

export function perceive(world: World, agent: Agent, askedBy?: Agent): Perception {
  const field = distanceField(world.tiles, agent.pos)
  const noticing: string[] = []

  for (const other of world.agents) {
    if (other.id === agent.id) continue
    if (other.inside) {
      noticing.push(`${other.persona.name} is inside their house, asleep.`)
      continue
    }
    const steps = manhattan(agent.pos, other.pos)
    noticing.push(
      `${other.persona.name} (${other.persona.vocation}) is ${steps <= 1 ? "right next to you" : `${steps} steps ${compass(agent.pos, other.pos)}`}, ${describeStatus(world, other, agent)}.`,
    )
  }

  const { store } = world
  noticing.push(
    `The village store holds ${store.food} food. By agreement it is shared at the evening meal at 6 pm${isMealTime(world) ? ", and the meal is on now" : ""}.`,
  )
  if (projectDone(world)) {
    noticing.push(`The granary is finished (${contributorsPhrase(world)}), so the store's food no longer spoils.`)
  } else {
    noticing.push(
      `The granary is ${pctBuilt(world)}% built (${contributorsPhrase(world)}). Until it is finished, the store loses food to spoilage whenever it holds more than ${STORE_SAFE_WITHOUT_GRANARY}.`,
    )
  }
  noticing.push(`You have ${agent.coins} coin${agent.coins === 1 ? "" : "s"}${agent.carry > 0 ? ` and are carrying ${agent.carry} food` : ""}.`)
  const { stall } = world
  const keeper = world.agents.find((a) => a.persona.craft === "keep_shop")
  noticing.push(
    `The market stall${keeper ? ` run by ${keeper.id === agent.id ? "you" : keeper.persona.name}` : ""} sells food at ${stall.price} coin${stall.price === 1 ? "" : "s"} a portion and buys at ${stall.buyPrice}; it has ${stall.food} food and ${stall.coins} coins.`,
  )
  for (const d of world.debts) {
    if (d.state !== "open") continue
    const overdue = world.tick > d.dueTick
    if (d.debtorId === agent.id) {
      noticing.push(`You owe ${nameOf(world, d.creditorId)} ${d.owed} coins, due by ${formatClock(d.dueTick)}${overdue ? ", and it is overdue" : ""}.`)
    } else if (d.creditorId === agent.id) {
      noticing.push(`${nameOf(world, d.debtorId)} owes you ${d.owed} coins, due by ${formatClock(d.dueTick)}${overdue ? ", and it is overdue" : ""}.`)
    }
  }

  const stocked = world.bushes.filter((b) => b.berries > 0)
  const berriesLeft = stocked.reduce((n, b) => n + b.berries, 0)
  if (stocked.length === 0) {
    noticing.push("Every berry bush in the grove has been picked clean for now.")
  } else {
    const d = stepsTo(field, (p) => stocked.some((b) => adjacent(p, b.pos)))
    noticing.push(`The berry grove has ${berriesLeft} berr${berriesLeft === 1 ? "y" : "ies"} left; the nearest bush is ${stepsPhrase(d)}.`)
  }
  noticing.push(`The pond is ${stepsPhrase(stepsTo(field, (p) => touchesWater(world, p)))}.`)
  if (askedBy) noticing.push(`${askedBy.persona.name} just walked up to you.`)

  return {
    name: agent.persona.name,
    role: `the village ${agent.persona.vocation}`,
    blurb: agent.persona.blurb,
    psyche: psycheLines(agent.psyche),
    clock: formatClock(world.tick),
    location: describeLocation(world, agent),
    needs: Object.fromEntries(NEED_KEYS.map((k) => [k, Math.round(agent.needs[k])])) as Perception["needs"],
    needCauses: { ...agent.needCause, purpose: agent.needCause.purpose ?? purposeCause(world, agent) },
    noticing: noticing.slice(0, 32),
    memories: agent.memory.slice(-MEMORY_IN_PROMPT).map((m) => `${formatTime(m.tick)}: ${m.text}`),
    feelings: world.agents
      .filter((a) => a.id !== agent.id)
      .map((a) => `${a.persona.name}: ${affinityWords(agent.affinity[a.id] ?? 0)}.`)
      .slice(0, 8),
  }
}

function lastVisitPhrase(world: World, agent: Agent, poiId: string): string {
  const at = agent.visited[poiId]
  if (at === undefined) return "you have not been there yet"
  const { day } = clockOf(at)
  return day === clockOf(world.tick).day ? `you were last there at ${formatTime(at)}` : "you have not been there today"
}

export function buildOptions(world: World, agent: Agent): OptionSpec[] {
  const field = distanceField(world.tiles, agent.pos)
  const options: OptionSpec[] = []
  const add = (o: OptionSpec) => options.push(o)

  let nearestBush: { id: string; d: number; berries: number } | null = null
  for (const bush of world.bushes) {
    if (bush.berries <= 0) continue
    const d = stepsTo(field, (p) => adjacent(p, bush.pos))
    if (d !== null && (!nearestBush || d < nearestBush.d)) nearestBush = { id: bush.id, d, berries: bush.berries }
  }
  if (nearestBush) {
    add({
      id: "eat",
      label: "Go eat berries",
      detail: `Eating fills your hunger. The nearest bush with berries is ${stepsPhrase(nearestBush.d)} and has ${nearestBush.berries} left.`,
      intent: { kind: "eat", bushId: nearestBush.id },
      drivers: ["body"],
    })
    if (agent.carry < CARRY_CAP) {
      add({
        id: "gather",
        label: "Gather berries to carry",
        detail: `Pick berries to take with you (you can carry up to ${CARRY_CAP}; you carry ${agent.carry}). You could keep them, eat them later or put them in the store.`,
        intent: { kind: "gather", bushId: nearestBush.id },
        drivers: ["security"],
      })
    }
  }
  if (agent.carry > 0) {
    add({
      id: "eat_carry",
      label: "Eat the food you are carrying",
      detail: `Eat some of your ${agent.carry} food right where you are.`,
      intent: { kind: "eat_carry" },
      drivers: ["body"],
    })
    add({
      id: "deposit",
      label: "Put the food you carry into the village store",
      detail: `Give your ${agent.carry} food to the store so everyone can eat it at the evening meal.`,
      intent: { kind: "deposit" },
      drivers: ["generosity", "providing"],
    })
  }

  add({
    id: "drink",
    label: "Drink at the pond",
    detail: `Drinking quenches your thirst. The pond is ${stepsPhrase(stepsTo(field, (p) => touchesWater(world, p)))}.`,
    intent: { kind: "drink" },
    drivers: ["body"],
  })

  const home = homeOf(world, agent)
  add({
    id: "sleep",
    label: "Go home and sleep",
    detail: `Sleeping restores your energy; you stay inside until you feel rested. Your house is ${stepsPhrase(stepsTo(field, (p) => sameTile(p, home.door)))}.`,
    intent: { kind: "sleep" },
    drivers: ["body"],
  })

  if (world.store.food > 0) {
    if (isMealTime(world)) {
      add({
        id: "meal",
        label: "Join the evening meal at the village store",
        detail: `The village shares the store's food now. It holds ${world.store.food} food; you would eat up to 2 portions with whoever else comes.`,
        intent: { kind: "meal" },
        drivers: ["belonging", "body"],
      })
    } else {
      add({
        id: "take_store",
        label: "Take food from the village store for yourself",
        detail: `The village agreed the store is shared at the evening meal; taking food at other times breaks that agreement. You would carry up to 2 of its ${world.store.food} food. Anyone who sees you will think less of you.`,
        intent: { kind: "take_store" },
        drivers: ["greed"],
      })
    }
  }

  const { stall } = world
  if (stall.food > 0 && agent.coins >= stall.price && agent.carry < CARRY_CAP) {
    add({
      id: "buy",
      label: "Buy food at the market stall",
      detail: `The stall sells food at ${stall.price} coin${stall.price === 1 ? "" : "s"} a portion. You have ${agent.coins} coins; it has ${stall.food} food. You would buy up to 2.`,
      intent: { kind: "buy" },
      drivers: ["trade"],
    })
  }
  if (agent.carry > 0 && stall.coins >= stall.buyPrice) {
    add({
      id: "sell",
      label: "Sell your food to the market stall",
      detail: `The stall pays ${stall.buyPrice} coin a portion and has ${stall.coins} coins. You carry ${agent.carry} food.`,
      intent: { kind: "sell" },
      drivers: ["trade"],
    })
  }
  if (agent.persona.craft === "keep_shop") {
    const now = `The price is ${stall.price} now.`
    add({
      id: "price_fair",
      label: "Run the stall at a fair price (2 coins a portion)",
      detail: `An honest margin: the stall buys at 1 and sells at 2. ${now} About an hour minding the stall.`,
      intent: { kind: "set_price", price: 2 },
      drivers: ["purpose", "trade"],
    })
    add({
      id: "price_high",
      label: "Raise the stall's price to 4 coins a portion",
      detail: `Hungry villagers will pay more and you keep the difference, but people who notice may resent it. ${now} About an hour minding the stall.`,
      intent: { kind: "set_price", price: 4 },
      drivers: ["exploitation", "trade"],
    })
    add({
      id: "price_cheap",
      label: "Sell at cost to help hungry villagers (1 coin a portion)",
      detail: `You make nothing on each sale, but more people can afford to eat. ${now} About an hour minding the stall.`,
      intent: { kind: "set_price", price: 1 },
      drivers: ["generosity", "purpose"],
    })
  }

  if (!projectDone(world)) {
    const isBuilder = agent.persona.craft === "build"
    add({
      id: "build",
      label: isBuilder ? "Work on the granary (your trade)" : "Help build the granary",
      detail: `A session of about an hour on the village granary, which will stop the store's food from spoiling. It is ${pctBuilt(world)}% built; ${contributorsPhrase(world)}. Everyone can see who worked on it.`,
      intent: { kind: "build", projectId: world.project.id },
      drivers: ["building", "purpose", "belonging"],
    })
  }

  const craft = CRAFTS[agent.persona.craft]
  if (craft.available(world, agent)) {
    add({ id: "work", label: craft.label, detail: craft.detail(world, agent), intent: { kind: "work" }, drivers: craft.drivers })
  }

  const approachable = world.agents
    .filter((o) => o.id !== agent.id && canApproach(o))
    .sort((a, b) => manhattan(agent.pos, a.pos) - manhattan(agent.pos, b.pos))
    .slice(0, TALK_OPTIONS)
  const approach = (other: Agent, offer: Offer): Intent => ({ kind: "approach", targetId: other.id, offer })
  for (const other of approachable) {
    const where = `${other.persona.name} is ${manhattan(agent.pos, other.pos)} steps away, ${describeStatus(world, other, agent)}.`
    add({
      id: `talk_${other.id}`,
      label: `Go chat with ${other.persona.name}`,
      detail: `Chatting eases loneliness and is a little fun, but they may say no. ${where}`,
      intent: approach(other, { kind: "chat" }),
      drivers: ["belonging"],
    })
    if (other === approachable[0]) {
      add({
        id: `compliment_${other.id}`,
        label: `Go say something kind to ${other.persona.name}`,
        detail: `Tell them sincerely what you appreciate about them. It lifts their standing and warms them to you, though kind words mean less if they are frequent. ${where}`,
        intent: approach(other, { kind: "compliment" }),
        drivers: ["kindness"],
      })
    }
  }
  const nearest = approachable[0]
  if (nearest) {
    const nm = nearest.persona.name
    const id = nearest.id
    if (agent.carry > 0) {
      add({
        id: `give_food_${id}`,
        label: `Give 1 food to ${nm}`,
        detail: `A gift from the ${agent.carry} food you carry. ${nm} may be grateful, or may refuse.`,
        intent: approach(nearest, { kind: "gift_food", n: 1 }),
        drivers: ["generosity"],
      })
    }
    if (agent.coins >= 3) {
      add({
        id: `give_coins_${id}`,
        label: `Give 2 coins to ${nm}`,
        detail: `A gift from your ${agent.coins} coins.`,
        intent: approach(nearest, { kind: "gift_coins", n: 2 }),
        drivers: ["generosity"],
      })
    }
    if (agent.needs.hunger < 35) {
      add({
        id: `ask_${id}`,
        label: `Ask ${nm} for some food`,
        detail: `You are genuinely hungry. ${nm} may share food or coins, or refuse.`,
        intent: approach(nearest, { kind: "ask_food", honest: true }),
        drivers: ["security"],
      })
    } else if (agent.needs.hunger >= 50) {
      add({
        id: `lie_${id}`,
        label: `Ask ${nm} for food with a made-up hard-luck story`,
        detail: `You are not actually hungry. You would claim you have not eaten properly in a long time to get their food or coins. If ${nm} later sees you with food, they may realise you lied.`,
        intent: approach(nearest, { kind: "ask_food", honest: false }),
        drivers: ["deception"],
      })
    }
    if (agent.coins >= 5) {
      add({
        id: `lend_${id}`,
        label: `Offer to lend ${nm} 5 coins (repaid as 6 tomorrow evening)`,
        detail: "A friendly loan with a small fee. They may accept or decline, and they may or may not pay you back.",
        intent: approach(nearest, { kind: "lend", amount: 5, owed: 6 }),
        drivers: ["kindness"],
      })
      add({
        id: `usury_${id}`,
        label: `Offer ${nm} a 5 coin loan at a steep rate (repaid as 9)`,
        detail: "You profit if they are desperate enough to accept, and more so if they cannot pay. People may see it as taking advantage.",
        intent: approach(nearest, { kind: "lend", amount: 5, owed: 9 }),
        drivers: ["exploitation"],
      })
    }
    add({
      id: `pickpocket_${id}`,
      label: `Try to pick ${nm}'s pocket`,
      detail: `Quietly steal up to ${PICKPOCKET_MAX} coins while they are distracted. If they or anyone nearby notices, they will know you are a thief.`,
      intent: approach(nearest, { kind: "pickpocket" }),
      drivers: ["theft"],
    })
  }
  for (const d of world.debts) {
    if (d.state !== "open") continue
    const other = agentById(world, d.creditorId === agent.id ? d.debtorId : d.creditorId)
    if (!other || other.inside) continue
    if (d.debtorId === agent.id && agent.coins >= d.owed) {
      add({
        id: `repay_${d.id}`,
        label: `Pay back the ${d.owed} coins you owe ${other.persona.name}`,
        detail: `Due by ${formatClock(d.dueTick)}. You have ${agent.coins} coins.`,
        intent: approach(other, { kind: "repay", debtId: d.id }),
        drivers: ["duty"],
      })
    }
    if (d.creditorId === agent.id && world.tick > d.dueTick) {
      add({
        id: `demand_${d.id}`,
        label: `Demand that ${other.persona.name} repay the ${d.owed} coins they owe you`,
        detail: "Confront them about the overdue debt in front of anyone nearby. It may shame them into paying, or sour things between you.",
        intent: approach(other, { kind: "demand_repay", debtId: d.id }),
        drivers: ["confrontation"],
      })
    }
  }

  add({
    id: "campfire",
    label: "Hang out by the campfire",
    detail: `A cozy, relaxing spot that is a little fun and where villagers bump into each other. The campfire is ${stepsPhrase(stepsTo(field, (p) => nearCampfire(world, p)))}.`,
    intent: { kind: "campfire" },
    drivers: ["belonging", "pleasure"],
  })

  for (const poi of world.pois) {
    const d = field[idx(poi.stand.x, poi.stand.y)]
    if (d < 0) continue
    add({
      id: `explore_${poi.id}`,
      label: `Explore ${poi.name}`,
      detail: `Exploring is fun and cures boredom, especially somewhere you have not been lately. It is ${stepsPhrase(d)}; ${lastVisitPhrase(world, agent, poi.id)}.`,
      intent: { kind: "explore", poiId: poi.id },
      drivers: ["curiosity"],
    })
  }

  const nearby: Vec[] = []
  for (let i = 0; i < field.length; i++) {
    if (field[i] >= 3 && field[i] <= 7) nearby.push({ x: i % MAP_W, y: Math.floor(i / MAP_W) })
  }
  if (nearby.length) {
    const target = nearby[Math.floor(nextRandom(world) * nearby.length)]
    add({
      id: "wander",
      label: "Wander around nearby",
      detail: "An aimless little stroll close by. Mildly fun and low effort.",
      intent: { kind: "wander", target },
      drivers: ["pleasure"],
    })
  }

  add({
    id: "rest",
    label: "Sit down and rest right here",
    detail: "Take it easy without going anywhere. Restores a little energy but does nothing for hunger, thirst, loneliness, boredom or purpose.",
    intent: { kind: "rest" },
    drivers: ["rest"],
  })

  return options
}

// ---------------------------------------------------------------------------
// Transitions

function becomeIdle(world: World, agent: Agent, delay = 0) {
  agent.status = { kind: "idle", retryAt: world.tick + delay }
}

function startIntent(world: World, agent: Agent, intent: Intent) {
  if (intent.kind === "rest" || intent.kind === "eat_carry") {
    agent.status = { kind: "acting", intent, ticksLeft: ACT_TICKS[intent.kind] }
    return
  }
  const path = findPath(world.tiles, agent.pos, goalFor(world, agent, intent))
  if (!path) {
    remember(world, agent, `You wanted to go to ${intentPhrase(world, intent)} but could not find a way.`)
    becomeIdle(world, agent)
    return
  }
  agent.status = { kind: "moving", intent, path, startedAt: world.tick, waited: 0 }
  if (path.length === 0) arrive(world, agent, intent)
}

/** Who can see `agent` right now: awake, outside, within the witness radius. */
function witnessesOf(world: World, agent: Agent): Agent[] {
  return world.agents.filter(
    (o) =>
      o.id !== agent.id &&
      !o.inside &&
      o.status.kind !== "sleeping" &&
      o.status.kind !== "collapsed" &&
      manhattan(o.pos, agent.pos) <= WITNESS_RADIUS,
  )
}

function markPurpose(world: World, agent: Agent, what: string) {
  agent.lastPurposeTick = world.tick
  agent.needCause.purpose = `you ${what} at ${formatTime(world.tick)}`
}

function arrive(world: World, agent: Agent, intent: Intent) {
  switch (intent.kind) {
    case "eat":
    case "gather": {
      const bush = world.bushes.find((b) => b.id === intent.bushId)
      if (!bush || bush.berries <= 0) {
        remember(world, agent, "You reached the berry bush but it had been picked clean.")
        flash(world, agent, "sweat")
        becomeIdle(world, agent)
        return
      }
      agent.facing = facingToward(agent.pos, bush.pos)
      if (intent.kind === "gather") {
        const n = Math.min(bush.berries, 2, CARRY_CAP - agent.carry)
        bush.berries -= n
        agent.carry += n
        if (bush.nextRegrow <= world.tick) bush.nextRegrow = world.tick + BERRY_REGROW_TICKS
        count(world, "berries_gathered", n)
        agent.status = { kind: "acting", intent, ticksLeft: ACT_TICKS.gather }
        return
      }
      bush.berries -= 1
      if (bush.nextRegrow <= world.tick) bush.nextRegrow = world.tick + BERRY_REGROW_TICKS
      exposeLies(world, agent)
      agent.status = { kind: "acting", intent, ticksLeft: ACT_TICKS.eat }
      return
    }
    case "drink": {
      const water = neighbors(agent.pos).find((n) => isWater(world, n))
      if (water) agent.facing = facingToward(agent.pos, water)
      agent.status = { kind: "acting", intent, ticksLeft: ACT_TICKS.drink }
      return
    }
    case "sleep":
      agent.inside = true
      agent.status = { kind: "sleeping" }
      remember(world, agent, "You went home to sleep.")
      log(world, `${agent.persona.name} went home to sleep.`, [agent.id])
      return
    case "explore":
      agent.visited[intent.poiId] = world.tick
      agent.status = { kind: "acting", intent, ticksLeft: ACT_TICKS.explore }
      return
    case "campfire":
      agent.facing = facingToward(agent.pos, world.campfire)
      agent.status = { kind: "acting", intent, ticksLeft: ACT_TICKS.campfire }
      return
    case "work":
      agent.status = { kind: "acting", intent, ticksLeft: ACT_TICKS.work }
      return
    case "build":
      agent.facing = facingToward(agent.pos, { x: world.project.pos.x + 1, y: world.project.pos.y })
      agent.status = { kind: "acting", intent, ticksLeft: ACT_TICKS.build }
      return
    case "deposit": {
      agent.facing = facingToward(agent.pos, world.store.pos)
      const n = agent.carry
      if (n > 0) {
        world.store.food += n
        agent.carry = 0
        agent.needs.purpose = clamp(agent.needs.purpose + 6)
        agent.needs.respect = clamp(agent.needs.respect + 3)
        markPurpose(world, agent, "gave food to the village store")
        count(world, "deposits")
        count(world, "food_deposited", n)
        remember(world, agent, `You put ${n} food into the village store.`)
        log(world, `${agent.persona.name} put ${n} food into the village store.`, [agent.id], "good")
        flash(world, agent, "thanks", 4)
      }
      agent.status = { kind: "acting", intent, ticksLeft: ACT_TICKS.deposit }
      return
    }
    case "meal": {
      agent.facing = facingToward(agent.pos, world.store.pos)
      const n = Math.min(2, world.store.food)
      if (n === 0) {
        remember(world, agent, "You came to the evening meal but the store was empty.")
        count(world, "empty_meals")
        flash(world, agent, "sweat")
        becomeIdle(world, agent)
        return
      }
      world.store.food -= n
      agent.needs.hunger = clamp(agent.needs.hunger + 12 * n)
      count(world, "meals_shared")
      exposeLies(world, agent)
      agent.status = { kind: "acting", intent, ticksLeft: ACT_TICKS.meal }
      return
    }
    case "take_store": {
      agent.facing = facingToward(agent.pos, world.store.pos)
      const n = Math.min(2, world.store.food, CARRY_CAP - agent.carry)
      if (n <= 0) {
        becomeIdle(world, agent)
        return
      }
      world.store.food -= n
      agent.carry += n
      const seenBy = witnessesOf(world, agent)
      if (seenBy.length) {
        count(world, "thefts_seen")
        agent.needs.respect = clamp(agent.needs.respect - 12)
        agent.needCause.respect = `${names(world, seenBy.map((w) => w.id))} saw you take food from the store outside mealtime`
        remember(world, agent, `You took ${n} food from the store, and ${names(world, seenBy.map((w) => w.id))} saw you.`)
        for (const w of seenBy) {
          remember(world, w, `You saw ${agent.persona.name} take food from the village store outside mealtime.`)
          nudgeAffinity(w, agent.id, -0.2)
          flash(world, w, "eye", 6)
        }
        log(
          world,
          `${names(world, seenBy.map((w) => w.id))} saw ${agent.persona.name} take ${n} food from the store outside mealtime.`,
          [agent.id, ...seenBy.map((w) => w.id)],
          "conflict",
        )
      } else {
        count(world, "thefts_unseen")
        remember(world, agent, `You took ${n} food from the village store and nobody saw.`)
        log(world, `Unseen: ${agent.persona.name} quietly took ${n} food from the village store.`, [agent.id], "conflict")
      }
      agent.status = { kind: "acting", intent, ticksLeft: ACT_TICKS.take_store }
      return
    }
    case "buy": {
      const { stall } = world
      const n = Math.min(2, stall.food, Math.floor(agent.coins / stall.price), CARRY_CAP - agent.carry)
      if (n <= 0) {
        remember(world, agent, "You went to buy food but could not.")
        becomeIdle(world, agent)
        return
      }
      const cost = n * stall.price
      agent.coins -= cost
      stall.coins += cost
      stall.food -= n
      agent.carry += n
      count(world, "purchases")
      count(world, "coins_spent", cost)
      remember(world, agent, `You bought ${n} food at the stall for ${cost} coins.`)
      exposeLies(world, agent)
      agent.status = { kind: "acting", intent, ticksLeft: ACT_TICKS.buy }
      return
    }
    case "sell": {
      const { stall } = world
      const n = Math.min(agent.carry, Math.floor(stall.coins / stall.buyPrice))
      if (n <= 0) {
        becomeIdle(world, agent)
        return
      }
      const paid = n * stall.buyPrice
      agent.carry -= n
      agent.coins += paid
      stall.food += n
      stall.coins -= paid
      count(world, "sales")
      remember(world, agent, `You sold ${n} food to the stall for ${paid} coins.`)
      exposeLies(world, agent)
      agent.status = { kind: "acting", intent, ticksLeft: ACT_TICKS.sell }
      return
    }
    case "set_price":
      agent.status = { kind: "acting", intent, ticksLeft: ACT_TICKS.set_price }
      return
    case "wander":
    case "rest":
    case "eat_carry":
      if (intent.kind === "eat_carry") exposeLies(world, agent)
      agent.status = { kind: "acting", intent, ticksLeft: ACT_TICKS[intent.kind] }
      return
    case "approach":
      // Approach arrival is handled by the chase logic.
      return
  }
}

/** A liar who is seen with food by someone they lied to is found out. */
function exposeLies(world: World, liar: Agent) {
  for (const lie of world.lies) {
    if (lie.discovered || lie.liarId !== liar.id || world.tick - lie.tick > LIE_MEMORY_TICKS) continue
    const victim = agentById(world, lie.victimId)
    if (!victim || victim.inside || victim.status.kind === "sleeping" || manhattan(victim.pos, liar.pos) > WITNESS_RADIUS) continue
    lie.discovered = true
    count(world, "lies_caught")
    remember(world, victim, `You saw ${liar.persona.name} with plenty of food and realised their hard-luck story was a lie.`)
    nudgeAffinity(victim, liar.id, -0.35)
    flash(world, victim, "angry", 6)
    lifeEvent(world, victim, "lied_to", `found out ${liar.persona.name} lied to them`)
    remember(world, liar, `${victim.persona.name} saw you with food and realised your story was a lie.`)
    liar.needs.respect = clamp(liar.needs.respect - 8)
    liar.needCause.respect = `${victim.persona.name} caught you in a lie`
    lifeEvent(world, liar, "caught", `caught lying to ${victim.persona.name}`)
    log(world, `${victim.persona.name} realised ${liar.persona.name} lied to get food.`, [victim.id, liar.id], "conflict")
  }
}

/** Tomorrow at 6 pm, as a tick. */
function tomorrowEvening(world: World): number {
  const { day } = clockOf(world.tick)
  return Math.round((day * 1440 + 18 * 60 - 7 * 60) / 5)
}

function completeProject(world: World) {
  const { project } = world
  project.doneAt = world.tick
  count(world, "projects_completed")
  const credited = Object.keys(project.contributors)
  for (const a of world.agents) {
    if (credited.includes(a.id)) {
      a.needs.purpose = clamp(a.needs.purpose + 15)
      a.needs.respect = clamp(a.needs.respect + 15)
      a.needCause.respect = "the village credits you with building the granary"
      remember(world, a, `The granary is finished, and you helped build it (${project.contributors[a.id]} sessions).`)
    } else {
      remember(world, a, `The granary was finished by ${contributorsPhrase(world).replace("worked on by ", "")}.`)
    }
  }
  log(world, `The granary is finished! ${contributorsPhrase(world).replace("worked on by", "Built by")}.`, credited, "good")
}

function finishActing(world: World, agent: Agent, intent: Intent) {
  switch (intent.kind) {
    case "eat":
      count(world, "meals")
      remember(world, agent, "You ate berries in the grove.")
      break
    case "gather":
      remember(world, agent, `You gathered berries and now carry ${agent.carry}.`)
      break
    case "drink":
      remember(world, agent, "You drank at the pond.")
      break
    case "explore": {
      const name = world.pois.find((p) => p.id === intent.poiId)?.name ?? "somewhere"
      count(world, "explorations")
      remember(world, agent, `You explored ${name}.`)
      break
    }
    case "campfire": {
      const others = world.agents.filter(
        (a) => a.id !== agent.id && a.status.kind === "acting" && a.status.intent.kind === "campfire",
      )
      remember(
        world,
        agent,
        others.length ? `You hung out by the campfire with ${names(world, others.map((o) => o.id))}.` : "You hung out by the campfire alone.",
      )
      break
    }
    case "wander":
      remember(world, agent, "You wandered around for a bit.")
      break
    case "rest":
      remember(world, agent, "You sat and rested for a while.")
      break
    case "work": {
      const text = CRAFTS[agent.persona.craft].finish(world, agent)
      count(world, "work_sessions")
      count(world, `work_${agent.persona.craft}`)
      markPurpose(world, agent, "worked at your trade")
      remember(world, agent, text)
      log(world, `${agent.persona.name}: ${text.replace(/^You /, "").replace(/\.$/, "")}.`, [agent.id], "good")
      break
    }
    case "build": {
      const { project } = world
      if (projectDone(world)) break
      project.sessionsDone += 1
      project.contributors[agent.id] = (project.contributors[agent.id] ?? 0) + 1
      count(world, "build_sessions")
      markPurpose(world, agent, "worked on the granary")
      agent.needCause.respect = "everyone can see you are helping build the granary"
      remember(world, agent, `You put in a session on the granary (${project.sessionsDone} of ${project.sessionsNeeded}).`)
      log(world, `${agent.persona.name} worked on the granary (${pctBuilt(world)}% built).`, [agent.id], "good")
      if (project.sessionsDone >= project.sessionsNeeded) completeProject(world)
      break
    }
    case "meal": {
      const company = world.agents.filter((a) => a.id !== agent.id && a.status.kind === "acting" && a.status.intent.kind === "meal")
      remember(world, agent, company.length ? `You ate the evening meal with ${names(world, company.map((c) => c.id))}.` : "You ate the evening meal alone.")
      break
    }
    case "eat_carry":
      remember(world, agent, "You ate some of the food you were carrying.")
      break
    case "set_price": {
      const before = world.stall.price
      world.stall.price = intent.price
      count(world, `price_${intent.price}`)
      markPurpose(world, agent, "minded the market stall")
      const verb = intent.price > before ? "raised" : intent.price < before ? "lowered" : "kept"
      remember(world, agent, `You minded the stall and ${verb} the price to ${intent.price} coins a portion.`)
      if (intent.price !== before) {
        log(
          world,
          `${agent.persona.name} ${verb} the market stall's price to ${intent.price} coin${intent.price === 1 ? "" : "s"} a portion.`,
          [agent.id],
          intent.price >= 4 ? "conflict" : intent.price <= 1 ? "good" : "info",
        )
      }
      break
    }
    case "deposit":
    case "take_store":
    case "buy":
    case "sell":
    case "approach":
      break
  }
  becomeIdle(world, agent)
}

function giveUpTalk(world: World, agent: Agent, targetId: string, reason: string) {
  count(world, "chat_give_ups")
  remember(world, agent, reason)
  flash(world, agent, "sweat")
  log(world, `${agent.persona.name} gave up on talking to ${nameOf(world, targetId)}.`, [agent.id, targetId])
  becomeIdle(world, agent)
}

function startAsking(world: World, agent: Agent, target: Agent, offer: Offer): SimRequest {
  agent.facing = facingToward(agent.pos, target.pos)
  target.facing = facingToward(target.pos, agent.pos)
  agent.status = { kind: "asking", targetId: target.id, since: world.tick }
  target.status = { kind: "considering", askerId: agent.id, offer, resume: target.status, since: world.tick }
  flash(world, agent, "exclaim", 4)
  if (offer.kind === "ask_food" && !offer.honest) count(world, "lies_told")
  return issue(world, {
    kind: "respond",
    agentId: target.id,
    askerId: agent.id,
    offer,
    wire: wireOffer(world, offer),
    can: { food: target.carry, coins: target.coins },
    perception: perceive(world, target, agent),
  })
}

/** What the approached villager is told. A plea never reveals whether it is honest. */
function wireOffer(world: World, offer: Offer): OfferWire {
  switch (offer.kind) {
    case "chat":
      return { kind: "chat" }
    case "gift_food":
      return { kind: "gift_food", n: offer.n }
    case "gift_coins":
      return { kind: "gift_coins", n: offer.n }
    case "ask_food":
      return { kind: "ask_food" }
    case "lend":
      return { kind: "lend", amount: offer.amount, owed: offer.owed }
    case "demand_repay":
      return { kind: "demand_repay", owed: world.debts.find((d) => d.id === offer.debtId)?.owed ?? 1 }
    default:
      throw new Error(`Offer ${offer.kind} does not ask for a reply`)
  }
}

/** Acts that need no reply: they simply happen when you reach someone. */
function actOnArrival(world: World, agent: Agent, target: Agent, offer: Offer): boolean {
  const done = () => {
    agent.status = { kind: "acting", intent: { kind: "approach", targetId: target.id, offer }, ticksLeft: 2 }
  }
  agent.facing = facingToward(agent.pos, target.pos)
  switch (offer.kind) {
    case "compliment": {
      // Kind words land less when they are frequent: halve the effect for each one in the last few hours.
      const recent = target.memory.filter((m) => world.tick - m.tick < 48 && m.text.includes("said something kind")).length
      const weight = 1 / 2 ** recent
      target.needs.respect = clamp(target.needs.respect + 6 * weight)
      target.needCause.respect = `${agent.persona.name} told you what they appreciate about you`
      nudgeAffinity(target, agent.id, 0.08 * weight)
      nudgeAffinity(agent, target.id, 0.03)
      flash(world, target, "thanks", 5)
      count(world, "compliments")
      remember(world, target, `${agent.persona.name} said something kind and sincere to you.`)
      remember(world, agent, `You said something kind to ${target.persona.name}.`)
      log(world, `${agent.persona.name} said something kind to ${target.persona.name}.`, [agent.id, target.id], "good")
      done()
      return true
    }
    case "pickpocket": {
      const n = Math.min(PICKPOCKET_MAX, target.coins)
      if (n === 0) {
        remember(world, agent, `You tried ${target.persona.name}'s pockets but they had no coins.`)
        done()
        return true
      }
      target.coins -= n
      agent.coins += n
      const targetNoticed = !target.inside && ["idle", "deciding", "moving"].includes(target.status.kind)
      const seenBy = witnessesOf(world, agent).filter((w) => w.id !== target.id)
      if (targetNoticed || seenBy.length) {
        count(world, "pickpockets_caught")
        agent.needs.respect = clamp(agent.needs.respect - 15)
        agent.needCause.respect = "you were seen stealing"
        const who = [...(targetNoticed ? [target] : []), ...seenBy]
        remember(world, agent, `You picked ${target.persona.name}'s pocket for ${n} coins, and ${names(world, who.map((w) => w.id))} saw.`)
        if (targetNoticed) {
          remember(world, target, `${agent.persona.name} picked your pocket and took ${n} coins.`)
          nudgeAffinity(target, agent.id, -0.5)
          flash(world, target, "angry", 6)
          lifeEvent(world, target, "robbed", `robbed by ${agent.persona.name}`)
        } else {
          target.missingCoins += n
        }
        for (const w of seenBy) {
          remember(world, w, `You saw ${agent.persona.name} pick ${target.persona.name}'s pocket.`)
          nudgeAffinity(w, agent.id, -0.3)
          flash(world, w, "eye", 6)
        }
        lifeEvent(world, agent, "caught", "caught picking a pocket")
        log(world, `${names(world, who.map((w) => w.id))} saw ${agent.persona.name} pick ${target.persona.name}'s pocket.`, [agent.id, target.id], "conflict")
      } else {
        count(world, "pickpockets_unseen")
        target.missingCoins += n
        remember(world, agent, `You picked ${target.persona.name}'s pocket for ${n} coins and nobody noticed.`)
        lifeEvent(world, agent, "got_away", "got away with picking a pocket")
        log(world, `Unseen: ${agent.persona.name} picked ${target.persona.name}'s pocket for ${n} coins.`, [agent.id, target.id], "conflict")
      }
      done()
      return true
    }
    case "repay": {
      const debt = world.debts.find((d) => d.id === offer.debtId)
      if (debt && debt.state === "open" && agent.coins >= debt.owed) {
        agent.coins -= debt.owed
        target.coins += debt.owed
        debt.state = "repaid"
        count(world, "loans_repaid")
        nudgeAffinity(target, agent.id, 0.15)
        lifeEvent(world, target, "helped", `${agent.persona.name} repaid a debt`)
        remember(world, target, `${agent.persona.name} paid back the ${debt.owed} coins they owed you.`)
        remember(world, agent, `You paid back the ${debt.owed} coins you owed ${target.persona.name}.`)
        flash(world, target, "coin", 4)
        log(world, `${agent.persona.name} repaid ${target.persona.name} ${debt.owed} coins.`, [agent.id, target.id], "good")
      }
      done()
      return true
    }
    default:
      return false
  }
}

function chase(world: World, agent: Agent, status: Extract<Status, { kind: "moving" }>, targetId: string, offer: Offer): SimRequest | null {
  const target = agentById(world, targetId)
  if (!target || target.inside) {
    giveUpTalk(world, agent, targetId, `You went to find ${nameOf(world, targetId)} but they had gone inside.`)
    return null
  }
  if (manhattan(agent.pos, target.pos) <= 1) {
    if (actOnArrival(world, agent, target, offer)) return null
    if (target.status.kind === "moving" || target.status.kind === "acting" || target.status.kind === "idle") {
      return startAsking(world, agent, target, offer)
    }
    status.waited += 1
    if (status.waited > BUSY_WAIT_TICKS) {
      giveUpTalk(world, agent, targetId, `${target.persona.name} was busy, so you gave up waiting.`)
    }
    return null
  }
  if (world.tick - status.startedAt > CHASE_GIVE_UP_TICKS) {
    giveUpTalk(world, agent, targetId, `You could not catch up with ${target.persona.name}.`)
    return null
  }
  const path = findPath(world.tiles, agent.pos, (p) => manhattan(p, target.pos) <= 1)
  if (!path) {
    giveUpTalk(world, agent, targetId, `You could not find a way to ${target.persona.name}.`)
    return null
  }
  const next = path[0]
  if (next) moveTo(agent, next)
  return null
}

function moveTo(agent: Agent, next: Vec) {
  agent.facing = facingToward(agent.pos, next)
  agent.pos = next
  agent.steps += 1
}

// ---------------------------------------------------------------------------
// Tick

type RequestBase = { id: number; tick: number; agentId: string; perception: Perception }
type RespondFields = { askerId: string; offer: Offer; wire: OfferWire; can: { food: number; coins: number } }
export type SimRequest =
  | (RequestBase & { kind: "decide"; options: OptionSpec[] })
  | (RequestBase & { kind: "respond" } & RespondFields)

type RequestInit =
  | { kind: "decide"; agentId: string; perception: Perception; options: OptionSpec[] }
  | ({ kind: "respond"; agentId: string; perception: Perception } & RespondFields)

/** Every JEV request gets a deterministic id so recorded answers can be matched on replay. */
function issue(world: World, init: RequestInit): SimRequest {
  world.requestSeq += 1
  world.stats.calls += 1
  return { ...init, id: world.requestSeq, tick: world.tick } as SimRequest
}

function decayNeeds(world: World, agent: Agent) {
  const night = isNight(world.tick)
  const s = agent.status.kind
  const asleep = s === "sleeping" || s === "collapsed"
  const rates = needRates(agent.psyche)
  for (const key of NEED_KEYS) {
    if (key === "health") continue
    let rate = BASE_DECAY[key] * (agent.persona.decay[key] ?? 1)
    if (key === "social" || key === "fun" || key === "purpose" || key === "respect") rate *= rates[key]
    if (key === "energy" && night) rate += NIGHT_ENERGY_DECAY
    if (asleep) rate *= key === "hunger" || key === "thirst" ? 0.35 : key === "energy" ? 1 : 0.15
    agent.needs[key] = clamp(agent.needs[key] - rate)
  }
  if (asleep) agent.needs.energy = clamp(agent.needs.energy + SLEEP_ENERGY_GAIN + 0.2)

  // Health: falls while starving or parched, recovers slowly otherwise.
  const starving = agent.needs.hunger < 10
  const parched = agent.needs.thirst < 10
  const deprived = starving || parched
  agent.needs.health = clamp(agent.needs.health + (deprived ? -HEALTH_LOSS : asleep ? 0.25 : 0.05))
  if (deprived) {
    const hours = Math.max(1, Math.round((agent.needs.health / HEALTH_LOSS) * (5 / 60)))
    const what = starving && parched ? "food and water" : starving ? "food" : "water"
    agent.needCause.health = `you are going without ${what}; at this rate you will collapse in about ${hours} hour${hours === 1 ? "" : "s"}`
  } else if (agent.needs.health >= 95) delete agent.needCause.health
  else agent.needCause.health = "you are slowly recovering"
}

function applyActing(world: World, agent: Agent, intent: Intent) {
  const n = agent.needs
  switch (intent.kind) {
    case "eat":
      n.hunger = clamp(n.hunger + 12)
      break
    case "drink":
      n.thirst = clamp(n.thirst + 22)
      break
    case "explore":
      n.fun = clamp(n.fun + 7)
      break
    case "campfire": {
      const company = world.agents.some(
        (a) => a.id !== agent.id && a.status.kind === "acting" && a.status.intent.kind === "campfire",
      )
      n.fun = clamp(n.fun + 2)
      n.social = clamp(n.social + (company ? 3 : 0.6))
      n.energy = clamp(n.energy + 0.2)
      break
    }
    case "wander":
      n.fun = clamp(n.fun + 2.5)
      break
    case "rest":
      n.energy = clamp(n.energy + 0.8)
      break
    case "work": {
      n.purpose = clamp(n.purpose + 3)
      n.energy = clamp(n.energy - 0.1)
      if (agent.persona.craft === "stories") {
        n.fun = clamp(n.fun + 2)
        for (const o of world.agents) {
          if (o.id === agent.id || o.inside || manhattan(o.pos, agent.pos) > 3) continue
          o.needs.fun = clamp(o.needs.fun + 1.5)
          o.needs.social = clamp(o.needs.social + 0.5)
        }
      }
      break
    }
    case "build": {
      const crew = world.agents.some((a) => a.id !== agent.id && a.status.kind === "acting" && a.status.intent.kind === "build")
      n.purpose = clamp(n.purpose + 2.5)
      n.respect = clamp(n.respect + 0.5)
      n.energy = clamp(n.energy - 0.15)
      if (crew) n.social = clamp(n.social + 1)
      break
    }
    case "meal":
      n.social = clamp(n.social + 2)
      break
    case "set_price":
      n.purpose = clamp(n.purpose + 3)
      break
    case "eat_carry":
      if (agent.carry > 0) {
        agent.carry -= 1
        n.hunger = clamp(n.hunger + 12)
      }
      break
    default:
      break
  }
}

function regrowBerries(world: World) {
  for (const bush of world.bushes) {
    if (bush.berries >= BERRY_MAX || world.tick < bush.nextRegrow) continue
    bush.berries += 1
    bush.nextRegrow = world.tick + BERRY_REGROW_TICKS
  }
}

/** Without a granary, a well stocked store loses food. Deterministic physics. */
function spoilStore(world: World) {
  const { store } = world
  if (projectDone(world) || store.food <= STORE_SAFE_WITHOUT_GRANARY) {
    store.nextSpoil = world.tick + STORE_SPOIL_TICKS
    return
  }
  if (world.tick < store.nextSpoil) return
  store.food -= 1
  store.nextSpoil = world.tick + STORE_SPOIL_TICKS
  count(world, "food_spoiled")
}

/** Debts left unpaid past the grace period are defaults. */
function settleDebts(world: World) {
  for (const d of world.debts) {
    if (d.state !== "open" || world.tick <= d.dueTick + LOAN_GRACE_TICKS) continue
    d.state = "defaulted"
    count(world, "loans_defaulted")
    const creditor = agentById(world, d.creditorId)
    const debtor = agentById(world, d.debtorId)
    if (creditor) {
      remember(world, creditor, `${nameOf(world, d.debtorId)} never repaid the ${d.owed} coins they owed you.`)
      nudgeAffinity(creditor, d.debtorId, -0.3)
      lifeEvent(world, creditor, "defaulted_on", `${nameOf(world, d.debtorId)} defaulted on a loan`)
    }
    if (debtor) remember(world, debtor, `You never repaid the ${d.owed} coins you owed ${nameOf(world, d.creditorId)}.`)
    log(world, `${nameOf(world, d.debtorId)} defaulted on ${d.owed} coins owed to ${nameOf(world, d.creditorId)}.`, [d.debtorId, d.creditorId], "conflict")
  }
}

function collapse(world: World, agent: Agent) {
  agent.status = { kind: "collapsed", ticksLeft: COLLAPSE_TICKS }
  agent.needs.health = 5
  count(world, "collapses")
  remember(world, agent, "You collapsed from hunger and thirst.")
  log(world, `${agent.persona.name} collapsed from hunger and thirst.`, [agent.id], "conflict")
}

export function step(world: World): SimRequest[] {
  world.tick += 1
  const requests: SimRequest[] = []
  regrowBerries(world)
  spoilStore(world)
  settleDebts(world)

  for (const agent of world.agents) {
    agent.prev = { ...agent.pos }
    if (agent.flash && agent.flash.until <= world.tick) agent.flash = null
  }

  for (const agent of world.agents) {
    decayNeeds(world, agent)
    if (agent.needs.health <= 0 && agent.status.kind !== "collapsed" && !agent.inside) collapse(world, agent)
    const s = agent.status
    switch (s.kind) {
      case "idle":
        if (world.tick >= s.retryAt) {
          if (agent.missingCoins > 0) {
            remember(world, agent, `You noticed ${agent.missingCoins} coins missing from your purse.`)
            lifeEvent(world, agent, "robbed", "found coins missing from their purse")
            count(world, "thefts_discovered")
            agent.missingCoins = 0
          }
          const options = buildOptions(world, agent)
          agent.status = { kind: "deciding", since: world.tick, options }
          requests.push(issue(world, { kind: "decide", agentId: agent.id, perception: perceive(world, agent), options }))
        }
        break
      case "deciding":
      case "asking":
      case "considering":
        break
      case "moving": {
        if (s.intent.kind === "approach") {
          const req = chase(world, agent, s, s.intent.targetId, s.intent.offer)
          if (req) requests.push(req)
          break
        }
        const next = s.path.shift()
        if (next) {
          if (!isWalkable(world.tiles, next.x, next.y)) {
            becomeIdle(world, agent)
            break
          }
          moveTo(agent, next)
        }
        if (s.path.length === 0) arrive(world, agent, s.intent)
        break
      }
      case "acting":
        applyActing(world, agent, s.intent)
        s.ticksLeft -= 1
        if (s.ticksLeft <= 0) finishActing(world, agent, s.intent)
        break
      case "chatting": {
        agent.needs.social = clamp(agent.needs.social + 5)
        agent.needs.fun = clamp(agent.needs.fun + 1.5)
        s.ticksLeft -= 1
        if (s.ticksLeft <= 0) {
          remember(world, agent, `You chatted with ${nameOf(world, s.partnerId)}.`)
          nudgeAffinity(agent, s.partnerId, 0.1)
          becomeIdle(world, agent)
        }
        break
      }
      case "sleeping": {
        const { hour } = clockOf(world.tick)
        const rested = agent.needs.energy >= 95 && hour >= 5 && hour < 22
        if (rested || agent.needs.energy >= 100) {
          agent.inside = false
          agent.pos = { ...homeOf(world, agent).door }
          agent.prev = { ...agent.pos }
          agent.facing = "down"
          remember(world, agent, "You woke up feeling rested.")
          log(world, `${agent.persona.name} woke up.`, [agent.id])
          becomeIdle(world, agent)
        }
        break
      }
      case "collapsed":
        agent.needs.energy = clamp(agent.needs.energy + 0.5)
        s.ticksLeft -= 1
        if (s.ticksLeft <= 0) {
          agent.needs.health = Math.max(agent.needs.health, 25)
          remember(world, agent, "You came to, weak and shaken.")
          becomeIdle(world, agent)
        }
        break
    }
  }
  return requests
}

// ---------------------------------------------------------------------------
// Applying JEV results

/** Options less likely than this fraction of JEV's favourite are never sampled (min-p). */
const MIN_P = 0.25

function pickFrom(world: World, probabilities: Record<string, number>, fallback: string, mode: ChoiceMode): string {
  if (mode === "argmax") return fallback
  const top = Math.max(0, ...Object.values(probabilities))
  const entries = Object.entries(probabilities).filter(([, p]) => p > 0 && p >= top * MIN_P)
  const total = entries.reduce((sum, [, p]) => sum + p, 0)
  if (total <= 0) return fallback
  let roll = nextRandom(world) * total
  for (const [id, p] of entries) {
    roll -= p
    if (roll <= 0) return id
  }
  return entries[entries.length - 1][0]
}

export function readMood(answer: RawAnswer | undefined): MoodReading | null {
  if (!answer || answer.type !== "score") return null
  const probabilities = MOOD_LEVELS.map((_, i) => answer.probabilities[String(i)] ?? 0)
  const level = Math.max(0, Math.min(MOOD_LEVELS.length - 1, Math.round(answer.score)))
  return { level, label: MOOD_LEVELS[level], probabilities }
}

function readMotive(answer: RawAnswer | undefined): DecisionRecord["motive"] {
  if (!answer || answer.type !== "choice") return null
  return Object.entries(answer.probabilities)
    .map(([id, p]) => ({ id: id as MotiveKey, p }))
    .sort((a, b) => b.p - a.p)
}

function record(world: World, agent: Agent, rec: DecisionRecord) {
  agent.decisions.push(rec)
  if (agent.decisions.length > DECISIONS_KEEP) agent.decisions.shift()
}

function track(world: World, ans: JevAnswer) {
  world.stats.totalLatencyMs += ans.latencyMs
  world.stats.costUsd += ans.costUsd ?? 0
}

function answerError(world: World, agent: Agent, message: string) {
  world.stats.errors += 1
  log(world, `Unusable JEV answer for ${agent.persona.name}: ${message}`, [agent.id], "error")
  becomeIdle(world, agent, ERROR_BACKOFF_TICKS)
}

function tallyDrivers(world: World, agent: Agent, drivers: DriverKey[]) {
  const share = 1 / Math.max(1, drivers.length)
  for (const d of drivers) {
    agent.drivers[d] = (agent.drivers[d] ?? 0) + share
    count(world, `driver_${d}`, share)
  }
}

function applyDecision(world: World, agent: Agent, ans: JevAnswer, mode: ChoiceMode) {
  if (agent.status.kind !== "deciding") return
  const { options } = agent.status
  const action = ans.answers.action
  if (!action || action.type !== "choice") return answerError(world, agent, "missing action choice")
  world.stats.decisions += 1
  track(world, ans)
  agent.mood = readMood(ans.answers.mood)

  const known = Object.fromEntries(options.map((o) => [o.id, action.probabilities[o.id] ?? 0]))
  const pickedId = pickFrom(world, known, action.choice, mode)
  const picked = options.find((o) => o.id === pickedId) ?? options.find((o) => o.id === action.choice)
  if (!picked) return answerError(world, agent, `unknown option ${action.choice}`)

  record(world, agent, {
    tick: world.tick,
    kind: "decide",
    state: ans.state,
    options: options.map((o) => ({ id: o.id, label: o.label, p: known[o.id] ?? 0 })).sort((a, b) => b.p - a.p),
    picked: picked.id,
    pickedLabel: picked.label,
    mode,
    latencyMs: ans.latencyMs,
    motive: readMotive(ans.answers.motive),
    confidence: ans.confidence.action ?? null,
    drivers: picked.drivers,
  })
  count(world, `picked_${picked.intent.kind}`)
  tallyDrivers(world, agent, picked.drivers)
  habit(world, agent, picked.drivers, picked.label)

  if (picked.intent.kind === "approach" && picked.intent.offer.kind === "chat") {
    const target = agentById(world, picked.intent.targetId)
    log(world, `${agent.persona.name} decided to go chat with ${target?.persona.name ?? "someone"}.`, [agent.id, picked.intent.targetId], "social")
  }
  startIntent(world, agent, picked.intent)
}

function applyResponse(world: World, target: Agent, req: Extract<SimRequest, { kind: "respond" }>, ans: JevAnswer, mode: ChoiceMode) {
  if (target.status.kind !== "considering") return
  const { askerId, resume, offer } = target.status
  const asker = agentById(world, askerId)
  if (offer.kind === "chat") return applyChatReply(world, target, asker, resume, ans, mode)

  const reply = ans.answers.reply
  const criteria = replyCriteria(req.wire, req.can, asker?.persona.name ?? "them")
  if (!reply || reply.type !== "choice") {
    target.status = resume
    if (asker?.status.kind === "asking") becomeIdle(world, asker, ERROR_BACKOFF_TICKS)
    world.stats.errors += 1
    return
  }
  world.stats.responses += 1
  track(world, ans)
  target.mood = readMood(ans.answers.mood)
  const known = Object.fromEntries(Object.keys(criteria).map((id) => [id, reply.probabilities[id] ?? 0]))
  const choice = pickFrom(world, known, criteria[reply.choice] ? reply.choice : Object.keys(criteria)[0], mode)
  record(world, target, {
    tick: world.tick,
    kind: "respond",
    state: ans.state,
    options: Object.entries(criteria)
      .map(([id, label]) => ({ id, label, p: known[id] ?? 0 }))
      .sort((a, b) => b.p - a.p),
    picked: choice,
    pickedLabel: criteria[choice] ?? choice,
    mode,
    latencyMs: ans.latencyMs,
    motive: null,
    confidence: ans.confidence.reply ?? null,
    drivers: [],
  })
  target.status = resume
  if (!asker || asker.status.kind !== "asking") return
  becomeIdle(world, asker)
  const A = asker.persona.name
  const T = target.persona.name

  switch (offer.kind) {
    case "gift_food":
    case "gift_coins": {
      const what = offer.kind === "gift_food" ? `${offer.n} food` : `${offer.n} coins`
      if (choice === "refuse") {
        count(world, "gifts_refused")
        remember(world, asker, `${T} refused your gift of ${what}.`)
        remember(world, target, `You refused ${A}'s gift of ${what}.`)
        nudgeAffinity(asker, target.id, -0.05)
        break
      }
      const has = offer.kind === "gift_food" ? asker.carry >= offer.n : asker.coins >= offer.n
      if (!has) break
      if (offer.kind === "gift_food") {
        asker.carry -= offer.n
        target.carry = Math.min(CARRY_CAP + 2, target.carry + offer.n)
      } else {
        asker.coins -= offer.n
        target.coins += offer.n
      }
      count(world, "gifts")
      lifeEvent(world, target, "helped", `received a gift from ${A}`)
      if (choice === "thank") {
        nudgeAffinity(target, asker.id, 0.15)
        asker.needs.respect = clamp(asker.needs.respect + 4)
        lifeEvent(world, asker, "thanked", `${T} thanked them for a gift`)
        flash(world, target, "thanks", 5)
        remember(world, asker, `You gave ${T} ${what} and they thanked you warmly.`)
      } else {
        nudgeAffinity(target, asker.id, 0.08)
        remember(world, asker, `You gave ${T} ${what}.`)
      }
      flash(world, asker, "gift", 4)
      remember(world, target, `${A} gave you ${what}.`)
      log(world, `${A} gave ${T} ${what}.`, [asker.id, target.id], "good")
      break
    }
    case "ask_food": {
      if (choice === "refuse") {
        count(world, "asks_refused")
        remember(world, asker, `${T} refused to give you food.`)
        remember(world, target, `You refused ${A}'s plea for food.`)
        if (offer.honest) lifeEvent(world, asker, "refused", `${T} refused to help`)
        break
      }
      const gaveFood = choice === "give_food" && target.carry > 0
      const gaveCoins = choice === "give_coins" && target.coins >= 2
      if (!gaveFood && !gaveCoins) break
      if (gaveFood) {
        target.carry -= 1
        asker.carry += 1
      } else {
        target.coins -= 2
        asker.coins += 2
      }
      const what = gaveFood ? "1 food" : "2 coins"
      count(world, "asks_helped")
      tallyDrivers(world, target, ["generosity"])
      habit(world, target, ["generosity"], `gave ${what} to ${A}`)
      remember(world, target, `${A} begged you for food and you gave them ${what}.`)
      if (offer.honest) {
        lifeEvent(world, asker, "helped", `${T} helped when they were hungry`)
        nudgeAffinity(asker, target.id, 0.15)
        remember(world, asker, `${T} gave you ${what} when you were hungry.`)
        log(world, `${T} gave ${A} ${what} when they were hungry.`, [asker.id, target.id], "good")
      } else {
        world.lies.push({ id: `lie_${world.lies.length + 1}`, liarId: asker.id, victimId: target.id, tick: world.tick, discovered: false })
        count(world, "lies_succeeded")
        lifeEvent(world, asker, "got_away", `fooled ${T} with a sob story`)
        remember(world, asker, `Your hard-luck story worked: ${T} gave you ${what}.`)
        log(world, `Unseen: ${A} lied to ${T} with a sob story and got ${what}.`, [asker.id, target.id], "conflict")
      }
      break
    }
    case "lend": {
      if (choice !== "accept" || asker.coins < offer.amount) {
        remember(world, asker, `${T} declined your offer of a loan.`)
        break
      }
      asker.coins -= offer.amount
      target.coins += offer.amount
      const debt = {
        id: `debt_${world.debts.length + 1}`,
        creditorId: asker.id,
        debtorId: target.id,
        lent: offer.amount,
        owed: offer.owed,
        dueTick: tomorrowEvening(world),
        state: "open" as const,
      }
      world.debts.push(debt)
      count(world, "loans")
      if (offer.owed >= offer.amount * 1.5) count(world, "loans_usurious")
      remember(world, asker, `You lent ${T} ${offer.amount} coins; they owe you ${offer.owed} by ${formatClock(debt.dueTick)}.`)
      remember(world, target, `You borrowed ${offer.amount} coins from ${A} and owe ${offer.owed} by ${formatClock(debt.dueTick)}.`)
      flash(world, target, "coin", 4)
      log(world, `${A} lent ${T} ${offer.amount} coins, to be repaid as ${offer.owed}.`, [asker.id, target.id], offer.owed >= 8 ? "conflict" : "info")
      break
    }
    case "demand_repay": {
      const debt = world.debts.find((d) => d.id === offer.debtId)
      if (!debt || debt.state !== "open") break
      if (choice === "repay" && target.coins >= debt.owed) {
        target.coins -= debt.owed
        asker.coins += debt.owed
        debt.state = "repaid"
        count(world, "loans_repaid")
        tallyDrivers(world, target, ["duty"])
        remember(world, asker, `${T} paid back the ${debt.owed} coins when you demanded it.`)
        remember(world, target, `${A} demanded the ${debt.owed} coins you owed and you paid.`)
        log(world, `${T} paid ${A} back ${debt.owed} coins after being confronted.`, [asker.id, target.id], "info")
      } else if (choice === "promise") {
        debt.dueTick = world.tick + LOAN_GRACE_TICKS
        remember(world, asker, `${T} promised to pay back the ${debt.owed} coins soon.`)
        remember(world, target, `You promised ${A} you would pay back the ${debt.owed} coins soon.`)
      } else {
        count(world, "demands_refused")
        nudgeAffinity(asker, target.id, -0.3)
        target.needs.respect = clamp(target.needs.respect - 8)
        target.needCause.respect = `${A} publicly called out your unpaid debt`
        lifeEvent(world, target, "shamed", `publicly called out by ${A}`)
        for (const w of witnessesOf(world, target)) if (w.id !== asker.id) remember(world, w, `You saw ${A} confront ${T} about an unpaid debt.`)
        remember(world, asker, `${T} refused to pay back what they owe you.`)
        remember(world, target, `You refused to pay ${A} back.`)
        log(world, `${T} refused to repay ${A} when confronted.`, [asker.id, target.id], "conflict")
      }
      break
    }
    default:
      break
  }
}

function applyChatReply(world: World, target: Agent, asker: Agent | undefined, resume: Status, ans: JevAnswer, mode: ChoiceMode) {
  const engageAnswer = ans.answers.engage
  if (!engageAnswer || engageAnswer.type !== "boolean") {
    target.status = resume
    if (asker?.status.kind === "asking") becomeIdle(world, asker, ERROR_BACKOFF_TICKS)
    world.stats.errors += 1
    return
  }
  world.stats.responses += 1
  track(world, ans)
  target.mood = readMood(ans.answers.mood)

  const p = engageAnswer.probability
  const engage = mode === "sample" ? nextRandom(world) < p : p >= 0.5
  record(world, target, {
    tick: world.tick,
    kind: "respond",
    state: ans.state,
    options: [
      { id: "yes", label: `Stop and chat with ${asker?.persona.name ?? "them"}`, p },
      { id: "no", label: "Keep doing what you were doing", p: 1 - p },
    ].sort((a, b) => b.p - a.p),
    picked: engage ? "yes" : "no",
    pickedLabel: engage ? "Stopped to chat" : "Declined",
    mode,
    latencyMs: ans.latencyMs,
    motive: null,
    confidence: ans.confidence.engage ?? null,
    drivers: engage ? ["belonging"] : [],
  })

  if (!asker || asker.status.kind !== "asking") {
    target.status = resume
    return
  }

  if (engage) {
    count(world, "chats")
    asker.status = { kind: "chatting", partnerId: target.id, ticksLeft: CHAT_TICKS }
    target.status = { kind: "chatting", partnerId: asker.id, ticksLeft: CHAT_TICKS }
    flash(world, asker, "heart", CHAT_TICKS)
    flash(world, target, "heart", CHAT_TICKS)
    nudgeAffinity(target, asker.id, 0.05)
    log(world, `${target.persona.name} happily stopped to chat with ${asker.persona.name}.`, [asker.id, target.id], "social")
  } else {
    count(world, "declines")
    target.status = resume
    becomeIdle(world, asker)
    remember(world, asker, `${target.persona.name} did not want to chat with you.`)
    remember(world, target, `You turned down a chat with ${asker.persona.name}.`)
    nudgeAffinity(asker, target.id, -0.1)
    flash(world, asker, "angry")
    log(world, `${target.persona.name} turned down ${asker.persona.name}.`, [asker.id, target.id], "social")
  }
}

/** The single entry point for JEV answers, live or replayed. */
export function applyAnswer(world: World, req: SimRequest, ans: JevAnswer, mode: ChoiceMode) {
  const agent = agentById(world, req.agentId)
  if (!agent) return
  switch (req.kind) {
    case "decide":
      return applyDecision(world, agent, ans, mode)
    case "respond":
      return applyResponse(world, agent, req, ans, mode)
  }
}

/** No fallback brain: on a failed call the character simply stands still and retries later. */
export function failRequest(world: World, req: SimRequest, message: string) {
  world.stats.errors += 1
  const agent = agentById(world, req.agentId)
  log(world, `JEV error for ${agent?.persona.name ?? req.agentId}: ${message}`, [req.agentId], "error")
  if (!agent) return
  if (req.kind === "decide") {
    if (agent.status.kind === "deciding") becomeIdle(world, agent, ERROR_BACKOFF_TICKS)
    return
  }
  if (agent.status.kind === "considering") agent.status = agent.status.resume
  const asker = agentById(world, req.askerId)
  if (asker?.status.kind === "asking") becomeIdle(world, asker, ERROR_BACKOFF_TICKS)
}

export function toWire(world: World, req: SimRequest): JevRequest {
  if (req.kind === "decide") {
    return {
      kind: "decide",
      payload: {
        perception: req.perception,
        options: req.options.map(({ id, label, detail }) => ({ id, label, detail })),
      },
    }
  }
  return {
    kind: "respond",
    payload: { perception: req.perception, askerName: nameOf(world, req.askerId), offer: req.wire, can: req.can },
  }
}

// ---------------------------------------------------------------------------
// Interventions

export function intervene(world: World, iv: Intervention) {
  switch (iv.kind) {
    case "famine":
      for (const bush of world.bushes) {
        bush.berries = 0
        bush.nextRegrow = world.tick + BERRY_REGROW_TICKS * 3
      }
      log(world, "Observer: a blight strips every berry bush bare.", [], "error")
      break
    case "bounty":
      for (const bush of world.bushes) bush.berries = BERRY_MAX
      log(world, "Observer: every berry bush is suddenly heavy with fruit.", [], "info")
      break
    case "drain_store":
      world.store.food = 0
      log(world, "Observer: the village store is found empty.", [], "error")
      break
    case "fill_store":
      world.store.food += 12
      log(world, "Observer: a traveller leaves 12 food in the village store.", [], "info")
      break
  }
  count(world, `intervention_${iv.kind}`)
}

/** Body needs first, then the needs of the mind; exported for the UI. */
export const NEED_GROUPS = { body: BODY_KEYS, mind: NEED_KEYS.filter((k) => !(BODY_KEYS as readonly string[]).includes(k)) }
