import type { JevAnswer, JevRequest, MoodReading, NeedKey, Perception, RawAnswer } from "@/lib/jev/schema"
import { MOOD_LEVELS, NEED_KEYS } from "@/lib/jev/schema"

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
import { PERSONAS } from "./personas"
import type {
  Agent,
  ChoiceMode,
  DecisionRecord,
  Intent,
  Intervention,
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
  social: 0.28,
  fun: 0.3,
}
const NIGHT_ENERGY_DECAY = 0.15
const SLEEP_ENERGY_GAIN = 0.85
const BERRY_MAX = 3
const BERRY_REGROW_TICKS = 50
const ERROR_BACKOFF_TICKS = 12
const CHASE_GIVE_UP_TICKS = 50
const BUSY_WAIT_TICKS = 10
const MEMORY_KEEP = 12
const MEMORY_IN_PROMPT = 6
const DECISIONS_KEEP = 20
const LOG_KEEP = 150

const ACT_TICKS: Record<Exclude<Intent["kind"], "sleep" | "talk">, number> = {
  eat: 3,
  drink: 2,
  explore: 5,
  campfire: 8,
  wander: 2,
  rest: 6,
}
const CHAT_TICKS = 6

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

export const DEFAULT_CONFIG: WorldConfig = { seed: 7, scenario: "village" }

export function createWorld(config: Partial<WorldConfig> = {}): World {
  const cfg: WorldConfig = { ...DEFAULT_CONFIG, ...config }
  const map = buildMap()
  const agents: Agent[] = PERSONAS.map((persona) => {
    const house = map.houses.find((h) => h.ownerId === persona.id)
    if (!house) throw new Error(`No house for ${persona.id}`)
    const pos = { x: house.door.x, y: house.door.y + 1 }
    return {
      id: persona.id,
      persona,
      pos,
      prev: { ...pos },
      facing: "down",
      steps: 0,
      inside: false,
      needs: { ...persona.start },
      status: { kind: "idle", retryAt: 0 },
      memory: [{ tick: 0, text: "You woke up and stepped outside your house." }],
      affinity: Object.fromEntries(
        PERSONAS.filter((p) => p.id !== persona.id).map((p) => [p.id, 0.2]),
      ),
      visited: {},
      decisions: [],
      mood: null,
      flash: null,
    }
  })
  return {
    config: cfg,
    tick: 0,
    rng: cfg.seed,
    requestSeq: 0,
    counters: {},
    ...map,
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

function log(world: World, text: string, agentIds: string[], tone: "info" | "social" | "error" = "info") {
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

function homeOf(world: World, agent: Agent) {
  const house = world.houses.find((h) => h.ownerId === agent.id)
  if (!house) throw new Error(`No house for ${agent.id}`)
  return house
}

const isWater = (world: World, p: Vec) => tileAt(world.tiles, p.x, p.y) === "water"
const touchesWater = (world: World, p: Vec) => neighbors(p).some((n) => isWater(world, n))
const nearCampfire = (world: World, p: Vec) =>
  Math.abs(p.x - world.campfire.x) <= 1 && Math.abs(p.y - world.campfire.y) <= 1 && !sameTile(p, world.campfire)

/** Where an intent walks to. Talk targets move, so they are re-planned every tick. */
function goalFor(world: World, agent: Agent, intent: Intent): (p: Vec) => boolean {
  switch (intent.kind) {
    case "eat": {
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
      return () => true
    case "talk": {
      const target = agentById(world, intent.targetId)
      return (p) => !!target && manhattan(p, target.pos) <= 1
    }
  }
}

// ---------------------------------------------------------------------------
// Descriptions shared by the prompt and the UI (one source of truth)

function intentPhrase(world: World, intent: Intent, viewer?: Agent): string {
  switch (intent.kind) {
    case "eat":
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
      return "a spot to rest"
    case "talk":
      return viewer && intent.targetId === viewer.id ? "you" : nameOf(world, intent.targetId)
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
      if (s.intent.kind === "talk") return `walking over to ${who(s.intent.targetId)}`
      if (s.intent.kind === "wander") return "wandering around"
      if (s.intent.kind === "sleep") return "heading home"
      return `heading to ${intentPhrase(world, s.intent, viewer)}`
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
        default:
          return "busy"
      }
    case "asking":
      return `trying to start a chat with ${who(s.targetId)}`
    case "considering":
      return `being asked to chat by ${who(s.askerId)}`
    case "chatting":
      return `chatting with ${who(s.partnerId)}`
    case "sleeping":
      return "asleep inside their house"
  }
}

export function describeLocation(world: World, agent: Agent, viewer: Agent = agent): string {
  if (agent.inside) return viewer === agent ? "inside your house" : "inside their house"
  let best: { name: string; d: number } | null = null
  for (const lm of world.landmarks) {
    const d = manhattan(agent.pos, lm.center)
    if (d > lm.radius || (best && d >= best.d)) continue
    const name = lm.ownerId
      ? lm.ownerId === viewer.id
        ? "right outside your house"
        : `outside ${nameOf(world, lm.ownerId)}'s house`
      : `near ${lm.name}`
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
      `${other.persona.name} is ${steps <= 1 ? "right next to you" : `${steps} steps ${compass(agent.pos, other.pos)}`}, ${describeStatus(world, other, agent)}.`,
    )
  }

  const stocked = world.bushes.filter((b) => b.berries > 0)
  const berriesLeft = stocked.reduce((n, b) => n + b.berries, 0)
  if (stocked.length === 0) {
    noticing.push("Every berry bush in the grove has been picked clean for now.")
  } else {
    const d = stepsTo(field, (p) => stocked.some((b) => adjacent(p, b.pos)))
    noticing.push(
      `The berry grove has ${berriesLeft} berr${berriesLeft === 1 ? "y" : "ies"} left across ${stocked.length} bush${stocked.length === 1 ? "" : "es"}; the nearest is ${stepsPhrase(d)}.`,
    )
  }
  noticing.push(`The pond is ${stepsPhrase(stepsTo(field, (p) => touchesWater(world, p)))}.`)
  const home = homeOf(world, agent)
  noticing.push(`Your house is ${stepsPhrase(stepsTo(field, (p) => sameTile(p, home.door)))}.`)
  const atFire = world.agents.filter(
    (a) => a.id !== agent.id && a.status.kind === "acting" && a.status.intent.kind === "campfire",
  )
  noticing.push(
    `The campfire is ${stepsPhrase(stepsTo(field, (p) => nearCampfire(world, p)))}${atFire.length ? `; ${atFire.map((a) => a.persona.name).join(" and ")} ${atFire.length === 1 ? "is" : "are"} hanging out there` : ""}.`,
  )
  if (askedBy) noticing.push(`${askedBy.persona.name} just walked up to you and wants to chat.`)

  return {
    name: agent.persona.name,
    blurb: agent.persona.blurb,
    traits: agent.persona.traits,
    clock: formatClock(world.tick),
    location: describeLocation(world, agent),
    needs: Object.fromEntries(NEED_KEYS.map((k) => [k, Math.round(agent.needs[k])])) as Perception["needs"],
    noticing,
    memories: agent.memory.slice(-MEMORY_IN_PROMPT).map((m) => `${formatTime(m.tick)}: ${m.text}`),
    feelings: world.agents
      .filter((a) => a.id !== agent.id)
      .map((a) => `${a.persona.name}: ${affinityWords(agent.affinity[a.id] ?? 0)}.`),
  }
}

function lastVisitPhrase(world: World, agent: Agent, poiId: string): string {
  const at = agent.visited[poiId]
  if (at === undefined) return "you have not been there yet"
  const { day } = clockOf(at)
  return day === clockOf(world.tick).day
    ? `you were last there at ${formatTime(at)}`
    : "you have not been there today"
}

export function buildOptions(world: World, agent: Agent): OptionSpec[] {
  const field = distanceField(world.tiles, agent.pos)
  const options: OptionSpec[] = []

  let nearestBush: { id: string; d: number; berries: number } | null = null
  for (const bush of world.bushes) {
    if (bush.berries <= 0) continue
    const d = stepsTo(field, (p) => adjacent(p, bush.pos))
    if (d !== null && (!nearestBush || d < nearestBush.d)) nearestBush = { id: bush.id, d, berries: bush.berries }
  }
  if (nearestBush) {
    options.push({
      id: "eat",
      label: "Go eat berries",
      detail: `Eating fills your hunger. The nearest bush with berries is ${stepsPhrase(nearestBush.d)} and has ${nearestBush.berries} left.`,
      intent: { kind: "eat", bushId: nearestBush.id },
    })
  }

  options.push({
    id: "drink",
    label: "Drink at the pond",
    detail: `Drinking quenches your thirst. The pond is ${stepsPhrase(stepsTo(field, (p) => touchesWater(world, p)))}.`,
    intent: { kind: "drink" },
  })

  const home = homeOf(world, agent)
  options.push({
    id: "sleep",
    label: "Go home and sleep",
    detail: `Sleeping restores your energy; you stay inside until you feel rested. Your house is ${stepsPhrase(stepsTo(field, (p) => sameTile(p, home.door)))}.`,
    intent: { kind: "sleep" },
  })

  for (const other of world.agents) {
    if (other.id === agent.id || !canApproach(other)) continue
    options.push({
      id: `talk_${other.id}`,
      label: `Go chat with ${other.persona.name}`,
      detail: `Chatting eases loneliness and is a little fun, but they may say no. ${other.persona.name} is ${manhattan(agent.pos, other.pos)} steps away, ${describeStatus(world, other, agent)}.`,
      intent: { kind: "talk", targetId: other.id },
    })
  }

  options.push({
    id: "campfire",
    label: "Hang out by the campfire",
    detail: `A cozy, relaxing spot that is a little fun and where villagers bump into each other. The campfire is ${stepsPhrase(stepsTo(field, (p) => nearCampfire(world, p)))}.`,
    intent: { kind: "campfire" },
  })

  for (const poi of world.pois) {
    const d = field[idx(poi.stand.x, poi.stand.y)]
    if (d < 0) continue
    options.push({
      id: `explore_${poi.id}`,
      label: `Explore ${poi.name}`,
      detail: `Exploring is fun and cures boredom, especially somewhere you have not been lately. It is ${stepsPhrase(d)}; ${lastVisitPhrase(world, agent, poi.id)}.`,
      intent: { kind: "explore", poiId: poi.id },
    })
  }

  const nearby: Vec[] = []
  for (let i = 0; i < field.length; i++) {
    if (field[i] >= 3 && field[i] <= 7) nearby.push({ x: i % MAP_W, y: Math.floor(i / MAP_W) })
  }
  if (nearby.length) {
    const target = nearby[Math.floor(nextRandom(world) * nearby.length)]
    options.push({
      id: "wander",
      label: "Wander around nearby",
      detail: "An aimless little stroll close by. Mildly fun and low effort.",
      intent: { kind: "wander", target },
    })
  }

  options.push({
    id: "rest",
    label: "Sit down and rest right here",
    detail: "Take it easy without going anywhere. Restores a little energy but does nothing for hunger, thirst, loneliness or boredom.",
    intent: { kind: "rest" },
  })

  return options
}

// ---------------------------------------------------------------------------
// Transitions

function becomeIdle(world: World, agent: Agent, delay = 0) {
  agent.status = { kind: "idle", retryAt: world.tick + delay }
}

function startIntent(world: World, agent: Agent, intent: Intent) {
  if (intent.kind === "rest") {
    agent.status = { kind: "acting", intent, ticksLeft: ACT_TICKS.rest }
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

function arrive(world: World, agent: Agent, intent: Intent) {
  switch (intent.kind) {
    case "eat": {
      const bush = world.bushes.find((b) => b.id === intent.bushId)
      if (!bush || bush.berries <= 0) {
        remember(world, agent, "You reached the berry bush but it had been picked clean.")
        flash(world, agent, "sweat")
        log(world, `${agent.persona.name} found an empty berry bush.`, [agent.id])
        becomeIdle(world, agent)
        return
      }
      bush.berries -= 1
      if (bush.nextRegrow <= world.tick) bush.nextRegrow = world.tick + BERRY_REGROW_TICKS
      agent.facing = facingToward(agent.pos, bush.pos)
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
    case "wander":
    case "rest":
      agent.status = { kind: "acting", intent, ticksLeft: ACT_TICKS[intent.kind] }
      return
    case "talk":
      // Talk arrival is handled by the chase logic.
      return
  }
}

function finishActing(world: World, agent: Agent, intent: Intent) {
  switch (intent.kind) {
    case "eat":
      count(world, "meals")
      remember(world, agent, "You ate berries in the grove.")
      log(world, `${agent.persona.name} ate some berries.`, [agent.id])
      break
    case "drink":
      remember(world, agent, "You drank at the pond.")
      break
    case "explore": {
      const name = world.pois.find((p) => p.id === intent.poiId)?.name ?? "somewhere"
      count(world, "explorations")
      remember(world, agent, `You explored ${name}.`)
      log(world, `${agent.persona.name} explored ${name}.`, [agent.id])
      break
    }
    case "campfire": {
      const others = world.agents.filter(
        (a) => a.id !== agent.id && a.status.kind === "acting" && a.status.intent.kind === "campfire",
      )
      remember(
        world,
        agent,
        others.length
          ? `You hung out by the campfire with ${others.map((a) => a.persona.name).join(" and ")}.`
          : "You hung out by the campfire alone.",
      )
      break
    }
    case "wander":
      remember(world, agent, "You wandered around for a bit.")
      break
    case "rest":
      remember(world, agent, "You sat and rested for a while.")
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

function startAsking(world: World, agent: Agent, target: Agent): SimRequest {
  agent.facing = facingToward(agent.pos, target.pos)
  target.facing = facingToward(target.pos, agent.pos)
  agent.status = { kind: "asking", targetId: target.id, since: world.tick }
  target.status = { kind: "considering", askerId: agent.id, resume: target.status, since: world.tick }
  flash(world, agent, "exclaim", 4)
  return issue(world, { kind: "respond", agentId: target.id, askerId: agent.id, perception: perceive(world, target, agent) })
}

function chase(world: World, agent: Agent, status: Extract<Status, { kind: "moving" }>, targetId: string): SimRequest | null {
  const target = agentById(world, targetId)
  if (!target || target.inside) {
    giveUpTalk(world, agent, targetId, `You went to find ${nameOf(world, targetId)} but they had gone inside.`)
    return null
  }
  if (manhattan(agent.pos, target.pos) <= 1) {
    if (target.status.kind === "moving" || target.status.kind === "acting" || target.status.kind === "idle") {
      return startAsking(world, agent, target)
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
export type SimRequest =
  | (RequestBase & { kind: "decide"; options: OptionSpec[] })
  | (RequestBase & { kind: "respond"; askerId: string })

type RequestInit =
  | { kind: "decide"; agentId: string; perception: Perception; options: OptionSpec[] }
  | { kind: "respond"; agentId: string; askerId: string; perception: Perception }

/** Every JEV request gets a deterministic id so recorded answers can be matched on replay. */
function issue(world: World, init: RequestInit): SimRequest {
  world.requestSeq += 1
  world.stats.calls += 1
  return { ...init, id: world.requestSeq, tick: world.tick } as SimRequest
}

function decayNeeds(world: World, agent: Agent) {
  const night = isNight(world.tick)
  const s = agent.status.kind
  for (const key of NEED_KEYS) {
    let rate = BASE_DECAY[key] * (agent.persona.decay[key] ?? 1)
    if (key === "energy" && night) rate += NIGHT_ENERGY_DECAY
    if (s === "sleeping") rate *= key === "hunger" || key === "thirst" ? 0.35 : 0.15
    agent.needs[key] = clamp(agent.needs[key] - rate)
  }
  if (s === "sleeping") agent.needs.energy = clamp(agent.needs.energy + SLEEP_ENERGY_GAIN)
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
  }
}

function regrowBerries(world: World) {
  for (const bush of world.bushes) {
    if (bush.berries >= BERRY_MAX || world.tick < bush.nextRegrow) continue
    bush.berries += 1
    bush.nextRegrow = world.tick + BERRY_REGROW_TICKS
  }
}

export function step(world: World): SimRequest[] {
  world.tick += 1
  const requests: SimRequest[] = []
  regrowBerries(world)

  for (const agent of world.agents) {
    agent.prev = { ...agent.pos }
    if (agent.flash && agent.flash.until <= world.tick) agent.flash = null
  }

  for (const agent of world.agents) {
    decayNeeds(world, agent)
    const s = agent.status
    switch (s.kind) {
      case "idle":
        if (world.tick >= s.retryAt) {
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
        if (s.intent.kind === "talk") {
          const req = chase(world, agent, s, s.intent.targetId)
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
    options: options
      .map((o) => ({ id: o.id, label: o.label, p: known[o.id] ?? 0 }))
      .sort((a, b) => b.p - a.p),
    picked: picked.id,
    pickedLabel: picked.label,
    mode,
    latencyMs: ans.latencyMs,
  })
  count(world, `picked_${picked.intent.kind}`)

  if (picked.intent.kind === "talk") {
    const target = agentById(world, picked.intent.targetId)
    log(world, `${agent.persona.name} decided to go chat with ${target?.persona.name ?? "someone"}.`, [agent.id, picked.intent.targetId], "social")
  }
  startIntent(world, agent, picked.intent)
}

function applyResponse(world: World, target: Agent, ans: JevAnswer, mode: ChoiceMode) {
  if (target.status.kind !== "considering") return
  const { askerId, resume } = target.status
  const asker = agentById(world, askerId)
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
    nudgeAffinity(asker, target.id, -0.2)
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
      return applyResponse(world, agent, ans, mode)
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
  return { kind: "respond", payload: { perception: req.perception, askerName: nameOf(world, req.askerId) } }
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
  }
  count(world, `intervention_${iv.kind}`)
}
