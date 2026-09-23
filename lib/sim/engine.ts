import type { JevAnswer, JevRequest, MoodReading, MotiveKey, NeedKey, OfferWire, Perception, RawAnswer } from "@/lib/jev/schema"
import { replyCriteria } from "@/lib/jev/prompt"
import { BODY_KEYS, CHANGES, GOALS, MOOD_LEVELS, NEED_KEYS, type GoalKey } from "@/lib/jev/schema"

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
import { JOBS, onShift, shiftPhrase, weekday, WEEKDAY_NAMES, type Job } from "./jobs"
import { buildTownMap, idx, isWalkable, MAP_W, tileAt } from "./map"
import { FOUNDING_MEMORIES, foundingAffinity, isChild, PERSONAS } from "./personas"
import { habit, lifeEvent, reflectDrift } from "./drift"
import { needRates, psycheLines } from "./psyche"
import type {
  Agent,
  Building,
  BuildingKind,
  ChoiceMode,
  DecisionRecord,
  DriverKey,
  Intent,
  Intervention,
  LogEntry,
  Offer,
  OptionSpec,
  Shop,
  ShopId,
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
const BERRY_REGROW_TICKS = 60
const ERROR_BACKOFF_TICKS = 12
const CHASE_GIVE_UP_TICKS = 50
const BUSY_WAIT_TICKS = 10
const MEMORY_KEEP = 14
const MEMORY_IN_PROMPT = 7
const DECISIONS_KEEP = 24
const LOG_KEEP = 250
const TALK_OPTIONS = 3
const CARRY_CAP = 6
const WITNESS_RADIUS = 6
/** An officer on patrol notices more. */
const PATROL_WITNESS_RADIUS = 10
/** How far away someone outdoors can be and still be seen. */
const SIGHT_RADIUS = 18
const LOAN_GRACE_TICKS = 144
const LIE_MEMORY_TICKS = 96
const PICKPOCKET_MAX = 3
const TICKS_PER_HOUR = 12

// Town economy (docs/society-spec.md 2.3)
const TREASURY_START = 600
const COUNTY_GRANT = 120
const SALES_TAX = 0.1
const STORE_DELIVERY = { units: 20, cost: 3, days: [1, 2, 3, 4, 5, 6] }
const DINER_DELIVERY = { units: 15, cost: 3 }
const INN_DELIVERY = { units: 20, cost: 1 }
const BRIDGE_SESSIONS = 16

const ACT_TICKS = {
  eat: 3,
  drink: 2,
  explore: 5,
  plaza: 8,
  wander: 2,
  rest: 6,
  work: TICKS_PER_HOUR,
  build: TICKS_PER_HOUR,
  gather: 2,
  deposit: 1,
  take_store: 1,
  eat_carry: 2,
  buy: 1,
  sell: 1,
  set_price: 2,
  dine: 6,
  bar: 5,
  treat: 8,
  school: TICKS_PER_HOUR * 2,
  read_board: 2,
  cook_home: 6,
  stock_home: 1,
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

export const DEFAULT_CONFIG: WorldConfig = { seed: 7, scenario: "founders", driftModel: "jev" }

const byKind = (buildings: Building[], kind: BuildingKind) => {
  const b = buildings.find((x) => x.kind === kind)
  if (!b) throw new Error(`Fernhollow has no ${kind}`)
  return b
}

export function createWorld(config: Partial<WorldConfig> = {}): World {
  const cfg: WorldConfig = { ...DEFAULT_CONFIG, ...config }
  const map = buildTownMap()
  const agents: Agent[] = PERSONAS.map((persona) => {
    const home = map.buildings.find((b) => b.residents.includes(persona.id))
    if (!home) throw new Error(`No home for ${persona.id}`)
    const affinity = Object.fromEntries(
      PERSONAS.filter((p) => p.id !== persona.id).map((p) => [p.id, foundingAffinity(persona, p)]),
    )
    const pos = { ...home.door }
    return {
      id: persona.id,
      persona,
      psyche: structuredClone(persona.psyche),
      pos,
      prev: { ...pos },
      facing: "down",
      steps: 0,
      // Everyone starts the day at home.
      inside: true,
      insideOf: home.id,
      readEdition: 0,
      needs: { ...persona.start },
      needCause: {},
      carry: persona.job === "farmer" ? 2 : 0,
      coins: persona.coins,
      drift: [],
      driftToday: { day: 1, used: {} },
      missingCoins: 0,
      psycheAtBirth: structuredClone(persona.psyche),
      lastReflectDay: 0,
      today: { day: 1, helpers: [], wrongers: [] },
      formative: [],
      goal: null,
      meaning: null,
      grudges: [],
      gratitude: [],
      status: { kind: "idle", retryAt: 0 },
      memory: [
        ...(FOUNDING_MEMORIES[persona.id] ?? []).map((text) => ({ tick: 0, text })),
        { tick: 0, text: "You woke up at home." },
      ],
      affinity,
      visited: {},
      decisions: [],
      drivers: {},
      mood: null,
      flash: null,
      lastPurposeTick: -1,
    }
  })
  const b = map.buildings
  const shop = (id: ShopId, kind: BuildingKind, keeperId: string, good: Shop["good"], stock: number, till: number, price: number, buyPrice: number): Shop => ({
    id,
    buildingId: byKind(b, kind).id,
    keeperId,
    good,
    stock,
    till,
    price,
    buyPrice,
    salesToday: 0,
  })
  const lot = map.bridgeLot
  const minX = Math.min(...lot.map((p) => p.x))
  const minY = Math.min(...lot.map((p) => p.y))
  return {
    config: cfg,
    tick: 0,
    rng: cfg.seed,
    requestSeq: 0,
    counters: {},
    tiles: map.tiles,
    buildings: map.buildings,
    bushes: map.bushes,
    pois: map.pois,
    landmarks: map.landmarks,
    fountain: map.fountain,
    board: map.board,
    dock: map.dock,
    fields: map.fields,
    project: {
      id: "footbridge",
      name: "the footbridge over Willow Creek",
      pos: { x: minX, y: minY },
      size: { x: Math.max(...lot.map((p) => p.x)) - minX + 1, y: Math.max(...lot.map((p) => p.y)) - minY + 1 },
      sessionsDone: 0,
      sessionsNeeded: BRIDGE_SESSIONS,
      contributors: {},
      doneAt: null,
    },
    pantry: { buildingId: byKind(b, "chapel").id, food: 8 },
    // Every household starts with a few days of food at home.
    homeFood: Object.fromEntries(b.filter((x) => x.residents.length && x.kind !== "inn").map((x) => [x.id, 4 * x.residents.length])),
    shops: {
      store: shop("store", "store", "sable", "groceries", 20, 80, 4, 2),
      diner: shop("diner", "diner", "mo", "meal", 15, 30, 6, 0),
      inn: shop("inn", "inn", "lark", "drink", 20, 40, 2, 0),
    },
    town: { treasury: TREASURY_START, taxRate: SALES_TAX, worked: {} },
    edition: null,
    debts: [],
    lies: [],
    favors: {},
    agents,
    log: [{ tick: 0, text: `A new ${WEEKDAY_NAMES[0]} begins in Fernhollow.`, agentIds: [], tone: "info" }],
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

/** Record that `helperId` helped `agent` today, for reflection and reciprocity. */
function helpedBy(world: World, agent: Agent, helperId: string) {
  if (!agent.today.helpers.includes(helperId)) agent.today.helpers.push(helperId)
  count(world, "helps")
  if ((world.favors[`${agent.id}>${helperId}`] ?? 0) > 0) count(world, "favors_returned")
  world.favors[`${helperId}>${agent.id}`] = (world.favors[`${helperId}>${agent.id}`] ?? 0) + 1
}

/** Record that `wrongerId` wronged `agent` today. */
function wrongedBy(agent: Agent, wrongerId: string) {
  if (!agent.today.wrongers.includes(wrongerId)) agent.today.wrongers.push(wrongerId)
}

function homeOf(world: World, agent: Agent): Building {
  const home = world.buildings.find((b) => b.residents.includes(agent.id))
  if (!home) throw new Error(`No home for ${agent.id}`)
  return home
}

function names(world: World, ids: string[]): string {
  const ns = ids.map((id) => nameOf(world, id))
  return ns.length <= 1 ? ns.join("") : `${ns.slice(0, -1).join(", ")} and ${ns.at(-1)}`
}

const buildingById = (world: World, id: string) => world.buildings.find((b) => b.id === id)
const buildingOf = (world: World, kind: BuildingKind) => world.buildings.find((b) => b.kind === kind)!

const isWater = (world: World, p: Vec) => tileAt(world.tiles, p.x, p.y) === "water" || tileAt(world.tiles, p.x, p.y) === "fountain"
const touchesWater = (world: World, p: Vec) => neighbors(p).some((n) => isWater(world, n))
const nearFountain = (world: World, p: Vec) => manhattan(p, world.fountain) <= 2 && !sameTile(p, world.fountain)
const atDoor = (b: Building) => (p: Vec) => sameTile(p, b.door)
const atProject = (world: World, p: Vec) => {
  const { pos, size } = world.project
  const dx = Math.max(pos.x - p.x, 0, p.x - (pos.x + size.x - 1))
  const dy = Math.max(pos.y - p.y, 0, p.y - (pos.y + size.y - 1))
  return dx + dy === 1
}
const onField = (world: World, p: Vec) => tileAt(world.tiles, p.x, p.y) === "field"

const projectDone = (world: World) => world.project.doneAt !== null
const pctBuilt = (world: World) => Math.round((world.project.sessionsDone / world.project.sessionsNeeded) * 100)

const jobOf = (agent: Agent): Job | null => (agent.persona.job ? JOBS[agent.persona.job] : null)
const minuteNow = (world: World) => clockOf(world.tick).minuteOfDay
const dayNow = (world: World) => clockOf(world.tick).day

/** Is this person inside this building, working their job right now? */
function workingInside(world: World, agent: Agent | undefined, buildingId: string): boolean {
  return (
    !!agent &&
    agent.insideOf === buildingId &&
    agent.status.kind === "acting" &&
    agent.status.intent.kind === "work"
  )
}

/** A shop is open only while its keeper is inside on shift. */
function shopOpen(world: World, shop: Shop): boolean {
  return workingInside(world, agentById(world, shop.keeperId), shop.buildingId)
}

function cliniciansOnDuty(world: World): Agent[] {
  const clinic = buildingOf(world, "clinic")
  return world.agents.filter((a) => (a.persona.job === "doctor" || a.persona.job === "nurse") && workingInside(world, a, clinic.id))
}

function teacherOnDuty(world: World): Agent | undefined {
  const school = buildingOf(world, "school")
  return world.agents.find((a) => a.persona.job === "teacher" && workingInside(world, a, school.id))
}

/** Step inside a building. They stay at its door tile, hidden, until they leave. */
function enter(agent: Agent, b: Building) {
  agent.inside = true
  agent.insideOf = b.id
  agent.pos = { ...b.door }
}

function leave(agent: Agent) {
  agent.inside = false
  agent.insideOf = null
  agent.facing = "down"
}

/** Is a business expected to be open now, by its posted hours? */
function postedOpen(world: World, b: Building): boolean {
  if (!b.hours) return true
  const m = minuteNow(world)
  return b.hours.days.includes(weekday(dayNow(world))) && m >= b.hours.open && m < b.hours.close
}

function hoursPhrase(b: Building): string {
  if (!b.hours) return "always open"
  const fmt = (m: number) => {
    const hr = Math.floor(m / 60) % 24
    return `${hr % 12 === 0 ? 12 : hr % 12} ${hr < 12 ? "am" : "pm"}`
  }
  return `open ${fmt(b.hours.open)} to ${b.hours.close >= 1440 ? "midnight" : fmt(b.hours.close)}`
}

// ---------------------------------------------------------------------------
// Work: each job's place, what an hour of it does, and how it is described

const PATROL_ROUTE: Vec[] = [
  { x: 24, y: 17 },
  { x: 6, y: 13 },
  { x: 20, y: 5 },
  { x: 36, y: 5 },
  { x: 36, y: 20 },
  { x: 14, y: 20 },
  { x: 10, y: 24 },
  { x: 30, y: 24 },
]

const isPondWater = (world: World, p: Vec) => tileAt(world.tiles, p.x, p.y) === "water"

function workBuilding(world: World, job: Job): Building | null {
  return job.place === "fields" || job.place === "pond" || job.place === "bridge" || job.place === "patrol"
    ? null
    : buildingOf(world, job.place)
}

/** Where an hour of work (or, for the retired, of chores) happens. */
function workGoal(world: World, agent: Agent): (p: Vec) => boolean {
  const job = jobOf(agent)
  if (!job) return atDoor(buildingOf(world, "chapel"))
  switch (job.place) {
    case "fields":
      return (p) => onField(world, p)
    case "pond":
      return (p) => neighbors(p).some((n) => isPondWater(world, n))
    case "bridge":
      return (p) => atProject(world, p)
    case "patrol": {
      const target = PATROL_ROUTE[Math.floor(world.tick / 24) % PATROL_ROUTE.length]
      return (p) => manhattan(p, target) <= 1
    }
    default:
      return atDoor(buildingOf(world, job.place))
  }
}

/** Retired villagers keep a small duty of their own. */
const RETIRED_CHORE = "sweep the chapel steps and tidy the graveyard"

function workPhrase(agent: Agent): string {
  return jobOf(agent)?.doing ?? RETIRED_CHORE
}

/** What makes this job's presence matter, told honestly to the worker. */
function workStakes(world: World, agent: Agent): string {
  switch (agent.persona.job) {
    case "shopkeeper":
      return "The general store is only open while you are there, and townsfolk buy their groceries there."
    case "cook":
      return "The Kettle diner only serves meals while you are there."
    case "innkeeper":
      return "The Rusty Lantern's bar only opens while you are behind it."
    case "doctor":
    case "nurse":
      return "Sick and injured townsfolk can only be treated while a doctor or nurse is at the clinic."
    case "teacher":
      return "The children can only have school while you are teaching."
    case "farmer":
      return "Each hard hour brings in about 3 portions of produce for you to carry, sell or share."
    case "fisher":
      return "Each hard hour brings in about 2 fish for you to carry, sell or share."
    case "carpenter":
      return `The footbridge is ${pctBuilt(world)}% built; once finished, the east woods are a short walk instead of a long detour through the ford. The town pays you for hours on the bridge.`
    case "journalist":
      return "A diligent hour prints a new edition of the Crier on the notice board, with the latest news you know."
    case "police_officer":
      return "While you patrol, you notice more of what goes on around town."
    case "mayor":
      return `The town treasury holds ${world.town.treasury} coins; payroll is paid from it at 6 pm.`
    default:
      return "It keeps you busy and useful."
  }
}

function workStatus(agent: Agent): string {
  switch (agent.persona.job) {
    case "shopkeeper":
      return "serving at the general store"
    case "cook":
      return "cooking at the Kettle diner"
    case "innkeeper":
      return "tending the bar at the Rusty Lantern"
    case "doctor":
    case "nurse":
      return "seeing patients at the clinic"
    case "teacher":
      return "teaching at the school"
    case "farmer":
      return "working the fields"
    case "fisher":
      return "fishing at the pond"
    case "carpenter":
      return "working on the footbridge"
    case "journalist":
      return "writing at the Crier print shop"
    case "police_officer":
      return "patrolling the town"
    case "mayor":
      return "working at the town hall"
    default:
      return "sweeping the chapel steps"
  }
}

/** Can they work right now? On shift, or any daylight hour for the self-employed and the retired. */
function canWorkNow(world: World, agent: Agent): boolean {
  if (isChild(agent.persona)) return false
  const job = jobOf(agent)
  const m = minuteNow(world)
  if (!job) return m >= 8 * 60 && m < 18 * 60
  if (job.id === "journalist" && m >= 8 * 60 && m < 20 * 60) return true
  if ((job.id === "farmer" || job.id === "fisher") && m >= 6 * 60 && m < 20 * 60) return true
  return onShift(job, dayNow(world), m)
}

/** The concrete results of an hour of work, applied when the hour ends. */
function finishWork(world: World, agent: Agent, effort: "diligent" | "coast"): string {
  const full = effort === "diligent"
  switch (agent.persona.job) {
    case "farmer": {
      const got = Math.min(full ? 3 : 1, CARRY_CAP - agent.carry)
      agent.carry += got
      count(world, "food_produced", got)
      return full ? `You worked the fields hard and brought in ${got} produce.` : `You pottered in the fields and brought in ${got} produce.`
    }
    case "fisher": {
      const got = Math.min(full ? 2 : 1, CARRY_CAP - agent.carry)
      agent.carry += got
      count(world, "food_produced", got)
      return `You fished for an hour and caught ${got}.`
    }
    case "carpenter":
      return buildSession(world, agent, full ? 1 : 0.5, true)
    case "journalist": {
      if (!full) return "You shuffled papers at the print shop but printed nothing."
      return printEdition(world, agent)
    }
    case "police_officer":
      return full ? "You walked your beat around town." : "You idled along your beat."
    case "mayor":
      agent.needs.respect = clamp(agent.needs.respect + (full ? 3 : 1))
      return full ? "You put in a solid hour at the town hall." : "You passed an hour at the town hall."
    case null:
      agent.needs.respect = clamp(agent.needs.respect + 2)
      return "You swept the chapel steps and tidied the graveyard."
    default:
      return full ? `You put in a solid hour: ${workStatus(agent)}.` : `You coasted through an hour: ${workStatus(agent)}.`
  }
}

/** A session on the footbridge, by the carpenter or a volunteer. */
function buildSession(world: World, agent: Agent, amount: number, paid: boolean): string {
  const { project } = world
  if (projectDone(world)) return "The footbridge is already finished."
  project.sessionsDone = Math.min(project.sessionsNeeded, project.sessionsDone + amount)
  project.contributors[agent.id] = (project.contributors[agent.id] ?? 0) + amount
  count(world, "build_sessions", amount)
  markPurpose(world, agent, "worked on the footbridge")
  agent.needCause.respect = "everyone can see you working on the footbridge"
  log(world, `${agent.persona.name} worked on the footbridge (${pctBuilt(world)}% built).`, [agent.id], "good")
  if (project.sessionsDone >= project.sessionsNeeded) completeProject(world)
  return paid
    ? `You put in ${amount === 1 ? "a solid" : "a half-hearted"} hour on the footbridge (${pctBuilt(world)}% built).`
    : `You volunteered an hour on the footbridge (${pctBuilt(world)}% built).`
}

/** The Crier: the journalist prints what she knows, true to her own memories. */
function printEdition(world: World, agent: Agent): string {
  const newsworthy = /saw|lied|stole|picked|refused|defaulted|finished|grudge|collapsed|raised the|price|repaid|gave|confront/i
  const headlines = agent.memory
    .filter((m) => world.tick - m.tick < 288 && newsworthy.test(m.text))
    .slice(-3)
    .map((m) => m.text.replace(/^You /, `${agent.persona.name} `))
  const number = (world.edition?.number ?? 0) + 1
  world.edition = {
    number,
    tick: world.tick,
    author: agent.id,
    headlines: headlines.length ? headlines : ["A quiet week in Fernhollow."],
  }
  count(world, "editions")
  log(world, `The Crier, edition ${number}, is posted on the notice board.`, [agent.id], "info")
  return `You printed edition ${number} of the Crier and posted it on the notice board.`
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
    case "drink": {
      const home = homeOf(world, agent)
      return (p) => touchesWater(world, p) || sameTile(p, home.door)
    }
    case "sleep":
    case "cook_home":
    case "stock_home":
      return atDoor(homeOf(world, agent))
    case "explore": {
      const poi = world.pois.find((q) => q.id === intent.poiId)
      return (p) => !!poi && sameTile(p, poi.stand)
    }
    case "plaza":
      return (p) => nearFountain(world, p)
    case "wander":
      return (p) => sameTile(p, intent.target)
    case "rest":
    case "eat_carry":
      return () => true
    case "approach": {
      const target = agentById(world, intent.targetId)
      return (p) => !!target && manhattan(p, target.pos) <= 1
    }
    case "work":
      return workGoal(world, agent)
    case "build":
      return (p) => atProject(world, p)
    case "deposit":
    case "take_store":
      return atDoor(buildingById(world, world.pantry.buildingId)!)
    case "buy":
    case "sell":
    case "set_price":
      return atDoor(buildingById(world, world.shops.store.buildingId)!)
    case "dine":
      return atDoor(buildingById(world, world.shops.diner.buildingId)!)
    case "bar":
      return atDoor(buildingById(world, world.shops.inn.buildingId)!)
    case "treat":
      return atDoor(buildingOf(world, "clinic"))
    case "school":
      return atDoor(buildingOf(world, "school"))
    case "read_board":
      return (p) => adjacent(p, world.board)
  }
}

/** Intents that happen inside the building someone is already in, so they need not leave. */
function happensInside(world: World, agent: Agent, intent: Intent): string | null {
  switch (intent.kind) {
    case "sleep":
    case "cook_home":
    case "stock_home":
      return homeOf(world, agent).id
    case "work": {
      const job = jobOf(agent)
      if (!job) return null
      const b = workBuilding(world, job)
      return b?.id ?? null
    }
    case "buy":
    case "sell":
    case "set_price":
      return world.shops.store.buildingId
    case "dine":
      return world.shops.diner.buildingId
    case "bar":
      return world.shops.inn.buildingId
    case "treat":
      return buildingOf(world, "clinic").id
    case "school":
      return buildingOf(world, "school").id
    case "deposit":
    case "take_store":
      return world.pantry.buildingId
    case "rest":
    case "eat_carry":
      return agent.insideOf
    default:
      return null
  }
}

// ---------------------------------------------------------------------------
// Descriptions shared by the prompt and the UI (one source of truth)

function intentPhrase(world: World, intent: Intent, viewer?: Agent): string {
  switch (intent.kind) {
    case "eat":
    case "gather":
      return "the berry bushes in the east woods"
    case "drink":
      return "some water"
    case "sleep":
    case "cook_home":
    case "stock_home":
      return "home"
    case "explore":
      return world.pois.find((p) => p.id === intent.poiId)?.name ?? "somewhere"
    case "plaza":
      return "the plaza"
    case "wander":
      return "nowhere in particular"
    case "rest":
    case "eat_carry":
      return "a spot to rest"
    case "approach":
      return viewer && intent.targetId === viewer.id ? "you" : nameOf(world, intent.targetId)
    case "work":
      return "work"
    case "build":
      return "the footbridge"
    case "deposit":
    case "take_store":
      return "the chapel pantry"
    case "buy":
    case "sell":
    case "set_price":
      return "the general store"
    case "dine":
      return "the Kettle diner"
    case "bar":
      return "the Rusty Lantern"
    case "treat":
      return "the clinic"
    case "school":
      return "school"
    case "read_board":
      return "the notice board"
  }
}

/** Third-person description of what an agent is doing. `viewer` turns "Mo" into "you". */
export function describeStatus(world: World, agent: Agent, viewer?: Agent): string {
  const who = (id: string) => (viewer && id === viewer.id ? "you" : nameOf(world, id))
  const s = agent.status
  switch (s.kind) {
    case "idle":
      return agent.insideOf ? `inside ${buildingById(world, agent.insideOf)?.name ?? "a building"}` : "standing around"
    case "deciding":
      return agent.insideOf ? `inside ${buildingById(world, agent.insideOf)?.name ?? "a building"}, thinking` : "standing still, thinking"
    case "moving":
      switch (s.intent.kind) {
        case "approach":
          return `walking over to ${who(s.intent.targetId)}`
        case "wander":
          return "wandering around"
        case "sleep":
          return "heading home"
        case "work":
          return jobOf(agent)?.id === "police_officer" ? "patrolling the town" : "heading to work"
        case "gather":
          return "heading to the east woods"
        default:
          return `heading to ${intentPhrase(world, s.intent, viewer)}`
      }
    case "acting":
      switch (s.intent.kind) {
        case "eat":
          return "eating berries in the east woods"
        case "drink":
          return "having a drink of water"
        case "explore":
          return `exploring ${intentPhrase(world, s.intent)}`
        case "plaza":
          return "hanging out in the plaza"
        case "wander":
          return "strolling around"
        case "rest":
          return "sitting and resting"
        case "work":
          return s.intent.effort === "coast" ? `${workStatus(agent)}, without much effort` : workStatus(agent)
        case "build":
          return "working on the footbridge"
        case "gather":
          return "gathering berries"
        case "deposit":
          return "giving food to the chapel pantry"
        case "take_store":
          return "taking food from the chapel pantry"
        case "eat_carry":
          return "eating the food they carry"
        case "buy":
          return "shopping at the general store"
        case "sell":
          return "selling food at the general store"
        case "set_price":
          return "changing the prices at the general store"
        case "dine":
          return "eating at the Kettle diner"
        case "bar":
          return "having a drink at the Rusty Lantern"
        case "treat":
          return "being treated at the clinic"
        case "school":
          return "at school"
        case "read_board":
          return "reading the notice board"
        case "cook_home":
          return "cooking at home"
        case "stock_home":
          return "putting food away at home"
        case "approach":
          return `talking with ${who(s.intent.targetId)}`
        default:
          return "busy"
      }
    case "asking":
      return `talking with ${who(s.targetId)}`
    case "considering":
      return `talking with ${who(s.askerId)}`
    case "chatting":
      return `chatting with ${who(s.partnerId)}`
    case "sleeping":
      return "asleep at home"
    case "collapsed":
      return "collapsed on the ground, too weak to move"
  }
}

export function describeLocation(world: World, agent: Agent, viewer: Agent = agent): string {
  if (agent.insideOf) {
    const b = buildingById(world, agent.insideOf)
    if (b && b.residents.includes(viewer.id) && (b.kind === "home" || b.kind === "farmhouse")) return "inside your home"
    return `inside ${b?.name ?? "a building"}`
  }
  let best: { name: string; d: number } | null = null
  for (const lm of world.landmarks) {
    const d = manhattan(agent.pos, lm.center)
    if (d > lm.radius || (best && d >= best.d)) continue
    let name = `near ${lm.name}`
    if (lm.houseId) {
      const b = buildingById(world, lm.houseId)
      name = b?.residents.includes(viewer.id) ? "right outside your home" : `outside ${b?.name ?? lm.name}`
    }
    best = { name, d }
  }
  return best?.name ?? "out in the open"
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

/** Honest sight: people in the same building, or outdoors within sight. */
function canSee(viewer: Agent, other: Agent): boolean {
  if (viewer.insideOf || other.insideOf) return viewer.insideOf !== null && viewer.insideOf === other.insideOf
  return manhattan(viewer.pos, other.pos) <= SIGHT_RADIUS
}

function placeLine(world: World, shop: Shop, what: string): string {
  const b = buildingById(world, shop.buildingId)!
  const keeper = agentById(world, shop.keeperId)
  const open = shopOpen(world, shop)
  const expected = postedOpen(world, b)
  const status = open
    ? `is open and ${keeper?.persona.name ?? "someone"} is serving; ${what} ${shop.price} coin${shop.price === 1 ? "" : "s"}${shop.stock ? "" : " but it has run out"}`
    : expected
      ? `should be open now (${hoursPhrase(b)}) but ${keeper?.persona.name ?? "nobody"} is not there`
      : `is closed now (${hoursPhrase(b)})`
  return `${b.name[0].toUpperCase()}${b.name.slice(1)} ${status}.`
}

export function perceive(world: World, agent: Agent, askedBy?: Agent): Perception {
  const field = distanceField(world.tiles, agent.pos)
  const noticing: string[] = []
  const child = isChild(agent.persona)

  for (const other of world.agents) {
    if (other.id === agent.id || !canSee(agent, other)) continue
    const here = agent.insideOf && agent.insideOf === other.insideOf
    const steps = manhattan(agent.pos, other.pos)
    noticing.push(
      `${other.persona.name} (${other.persona.vocation}) is ${here ? "here with you" : steps <= 1 ? "right next to you" : `${steps} steps ${compass(agent.pos, other.pos)}`}, ${describeStatus(world, other, agent)}.`,
    )
  }

  // Money, food, and your job.
  noticing.push(`You have ${agent.coins} coin${agent.coins === 1 ? "" : "s"}${agent.carry > 0 ? ` and are carrying ${agent.carry} food` : ""}.`)
  const job = jobOf(agent)
  if (job) {
    const worked = Math.round((world.town.worked[agent.id] ?? 0) / TICKS_PER_HOUR)
    const due = onShift(job, dayNow(world), minuteNow(world))
    noticing.push(
      `You are ${job.title}. Your shift is ${shiftPhrase(job)}; ${due ? "you are due at work right now" : "you are off shift right now"}. You have worked ${worked} hour${worked === 1 ? "" : "s"} today.${job.pay ? ` The town pays ${job.pay} coins a full day, pro rata by hours worked, at 6 pm.` : " You live on what you sell."}`,
    )
  }

  // Places in town.
  noticing.push(placeLine(world, world.shops.store, "groceries cost"))
  noticing.push(placeLine(world, world.shops.diner, "a hot meal costs"))
  noticing.push(placeLine(world, world.shops.inn, "a drink costs"))
  const clinic = buildingOf(world, "clinic")
  const doctors = cliniciansOnDuty(world)
  if (agent.needs.health < 90 || agent.persona.job === "doctor" || agent.persona.job === "nurse") {
    noticing.push(
      doctors.length
        ? `The clinic is open and ${names(world, doctors.map((d) => d.id))} can treat you.`
        : postedOpen(world, clinic)
          ? `The clinic should be open (${hoursPhrase(clinic)}) but nobody is there to treat anyone.`
          : `The clinic is closed now (${hoursPhrase(clinic)}).`,
    )
  }
  if (child || agent.persona.job === "teacher" || world.agents.some((a) => isChild(a.persona) && homeOf(world, a).residents.includes(agent.id))) {
    const school = buildingOf(world, "school")
    const teacher = teacherOnDuty(world)
    const schoolDay = postedOpen(world, school)
    noticing.push(
      teacher
        ? `School is in: ${teacher.persona.name} is teaching.`
        : schoolDay
          ? "It is a school day but nobody is teaching at the school right now."
          : "There is no school right now.",
    )
    if (child && schoolDay) noticing.push("It is a school day (school runs 8 am to 3 pm), and children are expected to be there.")
  }
  const hf = world.homeFood[homeOf(world, agent).id]
  if (hf !== undefined) noticing.push(`Your home pantry holds ${hf} portion${hf === 1 ? "" : "s"} of food for your household.`)
  noticing.push(`The chapel pantry, meant for anyone in need, holds ${world.pantry.food} food.`)
  if (projectDone(world)) {
    noticing.push(`The footbridge over Willow Creek is finished (${contributorsPhrase(world)}), so the east woods are a short walk away.`)
  } else {
    noticing.push(
      `The footbridge over Willow Creek is ${pctBuilt(world)}% built (${contributorsPhrase(world)}). Until it is finished, the east woods are only reachable by wading the ford.`,
    )
  }
  if (world.edition && world.edition.number > agent.readEdition) {
    noticing.push(`A new edition of the Crier (number ${world.edition.number}) is posted on the notice board by the fountain.`)
  }

  const stocked = world.bushes.filter((b) => b.berries > 0)
  if (stocked.length) {
    const d = stepsTo(field, (p) => stocked.some((b) => adjacent(p, b.pos)))
    noticing.push(`Wild berries grow in the east woods; the nearest bush with berries is ${stepsPhrase(d)}.`)
  } else {
    noticing.push("The berry bushes in the east woods are picked clean for now.")
  }

  for (const d of world.debts) {
    if (d.state !== "open") continue
    const overdue = world.tick > d.dueTick
    if (d.debtorId === agent.id) {
      noticing.push(`You owe ${nameOf(world, d.creditorId)} ${d.owed} coins, due by ${formatClock(d.dueTick)}${overdue ? ", and it is overdue" : ""}.`)
    } else if (d.creditorId === agent.id) {
      noticing.push(`${nameOf(world, d.debtorId)} owes you ${d.owed} coins, due by ${formatClock(d.dueTick)}${overdue ? ", and it is overdue" : ""}.`)
    }
  }
  if (askedBy) noticing.push(`${askedBy.persona.name} just walked up to you.`)

  const { day } = clockOf(world.tick)
  return {
    name: agent.persona.name,
    role: child ? `a ${agent.persona.age}-year-old child` : agent.persona.job ? JOBS[agent.persona.job].title : `the town's ${agent.persona.vocation}`,
    blurb: agent.persona.blurb,
    psyche: [
      ...psycheLines(agent.psyche).slice(0, agent.goal ? 6 : 7),
      ...(agent.goal ? [`Your goal in life: to ${GOALS[agent.goal]}.`] : []),
    ],
    clock: `${WEEKDAY_NAMES[weekday(day) - 1]}, ${formatClock(world.tick)}`,
    location: describeLocation(world, agent),
    needs: Object.fromEntries(NEED_KEYS.map((k) => [k, Math.round(agent.needs[k])])) as Perception["needs"],
    needCauses: { ...agent.needCause, purpose: agent.needCause.purpose ?? purposeCause(world, agent) },
    noticing: noticing.slice(0, 32),
    memories: [
      ...agent.formative.slice(-3).map((m) => `A moment that shaped you (${formatClock(m.tick).replace(/ \(.*\)$/, "")}): ${m.text}`),
      ...agent.memory.slice(-MEMORY_IN_PROMPT).map((m) => `${formatTime(m.tick)}: ${m.text}`),
    ].slice(0, 12),
    feelings: world.agents
      .filter((a) => a.id !== agent.id)
      .sort((a, b) => Math.abs(agent.affinity[b.id] ?? 0) - Math.abs(agent.affinity[a.id] ?? 0))
      .slice(0, 8)
      .map((a) => {
        const extra = agent.grudges.includes(a.id) ? "; you hold a grudge against them" : agent.gratitude.includes(a.id) ? "; you feel grateful to them" : ""
        return `${a.persona.name}: ${affinityWords(agent.affinity[a.id] ?? 0)}${extra}.`
      }),
  }
}

function lastVisitPhrase(world: World, agent: Agent, poiId: string): string {
  const at = agent.visited[poiId]
  if (at === undefined) return "you have not been there yet"
  const { day } = clockOf(at)
  return day === clockOf(world.tick).day ? `you were last there at ${formatTime(at)}` : "you have not been there today"
}

/** Option ids a child is never offered (stage gates). */
const ADULT_ONLY = /^(lie_|lend_|usury_|pickpocket_|take_store|sell|work_|build|price_|demand_)/

export function buildOptions(world: World, agent: Agent): OptionSpec[] {
  const field = distanceField(world.tiles, agent.pos)
  const options: OptionSpec[] = []
  const add = (o: OptionSpec) => options.push(o)
  const child = isChild(agent.persona)
  const home = homeOf(world, agent)
  const away = (goal: (p: Vec) => boolean) => stepsPhrase(stepsTo(field, goal))
  const { store, diner, inn } = world.shops

  // Body: food, water, sleep, health.
  let nearestBush: { id: string; d: number; berries: number } | null = null
  for (const bush of world.bushes) {
    if (bush.berries <= 0) continue
    const d = stepsTo(field, (p) => adjacent(p, bush.pos))
    if (d !== null && (!nearestBush || d < nearestBush.d)) nearestBush = { id: bush.id, d, berries: bush.berries }
  }
  if (nearestBush) {
    add({
      id: "eat",
      label: "Go eat wild berries in the east woods",
      detail: `Free, but berries only take the edge off hunger. The nearest bush is ${stepsPhrase(nearestBush.d)}${projectDone(world) ? "" : ", across the ford"}.`,
      intent: { kind: "eat", bushId: nearestBush.id },
      drivers: ["body"],
    })
    if (agent.carry < CARRY_CAP && !child) {
      add({
        id: "gather",
        label: "Gather wild berries to carry",
        detail: `Pick berries to take with you (you carry ${agent.carry} of at most ${CARRY_CAP}). The nearest bush is ${stepsPhrase(nearestBush.d)}.`,
        intent: { kind: "gather", bushId: nearestBush.id },
        drivers: ["security"],
      })
    }
  }
  const athome = world.homeFood[home.id] ?? 0
  if (agent.carry > 0 || athome > 0) {
    add({
      id: "cook_home",
      label: child && agent.persona.age < 10 ? "Get something to eat at home" : "Cook a proper meal at home",
      detail: `${athome > 0 ? `Your home pantry holds ${athome} portions for your household of ${home.residents.length}.` : `Uses 1 of the ${agent.carry} food you carry.`} A filling hot meal. Home is ${away(atDoor(home))}.`,
      intent: { kind: "cook_home" },
      drivers: ["body"],
    })
  }
  if (agent.carry > 0) {
    add({
      id: "eat_carry",
      label: "Eat some of the food you carry, cold",
      detail: "Quick, but less filling than a cooked meal.",
      intent: { kind: "eat_carry" },
      drivers: ["body"],
    })
    if (!child) {
      add({
        id: "stock_home",
        label: "Take the food you carry home to your household's pantry",
        detail: `Your household of ${home.residents.length} has ${athome} portions at home. Home is ${away(atDoor(home))}.`,
        intent: { kind: "stock_home" },
        drivers: ["providing"],
      })
    }
  }
  add({
    id: "drink",
    label: "Get a drink of water",
    detail: `From the fountain, the pond or the tap at home, whichever is closest (${away((p) => touchesWater(world, p) || sameTile(p, home.door))}).`,
    intent: { kind: "drink" },
    drivers: ["body"],
  })
  add({
    id: "sleep",
    label: "Go home and sleep",
    detail: `Sleeping restores your energy; you stay home until you feel rested. Home is ${away(atDoor(home))}.`,
    intent: { kind: "sleep" },
    drivers: ["body"],
  })
  if (agent.needs.health < 85) {
    const doctors = cliniciansOnDuty(world)
    add({
      id: "treat",
      label: "Go to the clinic to be treated",
      detail: doctors.length
        ? `${names(world, doctors.map((d) => d.id))} can treat you there now, free of charge.`
        : "Nobody is at the clinic to treat you right now; you could wait there.",
      intent: { kind: "treat" },
      drivers: ["body"],
    })
  }

  // Businesses: open only while their keeper is on shift.
  if (shopOpen(world, diner) && diner.stock > 0 && agent.coins >= diner.price) {
    add({
      id: "dine",
      label: `Eat a hot meal at the Kettle diner (${diner.price} coins)`,
      detail: `Very filling, and there is company. You have ${agent.coins} coins. The diner is ${away(atDoor(buildingById(world, diner.buildingId)!))}.`,
      intent: { kind: "dine" },
      drivers: ["body", "belonging"],
    })
  }
  if (shopOpen(world, inn) && inn.stock > 0 && agent.coins >= inn.price && !child) {
    add({
      id: "bar",
      label: `Have a drink at the Rusty Lantern (${inn.price} coins)`,
      detail: `Refreshing and fun, and where people gather in the evening. The inn is ${away(atDoor(buildingById(world, inn.buildingId)!))}.`,
      intent: { kind: "bar" },
      drivers: ["pleasure", "belonging"],
    })
  }
  if (shopOpen(world, store)) {
    if (store.stock > 0 && agent.coins >= store.price && agent.carry < CARRY_CAP) {
      add({
        id: "buy",
        label: `Buy groceries at the general store (${store.price} coins a portion)`,
        detail: `Groceries cook into proper meals at home. You have ${agent.coins} coins; you would buy up to 2. The store is ${away(atDoor(buildingById(world, store.buildingId)!))}.`,
        intent: { kind: "buy" },
        drivers: ["trade"],
      })
    }
    if (agent.carry > 0 && store.till >= store.buyPrice) {
      add({
        id: "sell",
        label: `Sell your food to the general store (${store.buyPrice} coins a portion)`,
        detail: `You carry ${agent.carry} food. The store has ${store.till} coins in its till.`,
        intent: { kind: "sell" },
        drivers: ["trade"],
      })
    }
  }
  if (agent.persona.job === "shopkeeper" && agent.insideOf === store.buildingId) {
    const now = `Groceries cost the store 3 coins a portion from the supplier; your price is ${store.price} now.`
    add({
      id: "price_fair",
      label: "Price groceries fairly (4 coins a portion)",
      detail: `An honest margin of 1 coin a portion. ${now}`,
      intent: { kind: "set_price", price: 4 },
      drivers: ["purpose", "trade"],
    })
    add({
      id: "price_high",
      label: "Raise the price of groceries to 7 coins a portion",
      detail: `The store is the only place in town to buy groceries, so people will pay more and you keep the difference. People who notice may resent it. ${now}`,
      intent: { kind: "set_price", price: 7 },
      drivers: ["exploitation", "trade"],
    })
    add({
      id: "price_cheap",
      label: "Sell groceries at cost to help struggling families (3 coins a portion)",
      detail: `You make nothing on each sale, but more people can afford to eat. ${now}`,
      intent: { kind: "set_price", price: 3 },
      drivers: ["generosity", "purpose"],
    })
  }

  // Work.
  if (canWorkNow(world, agent)) {
    const job = jobOf(agent)
    const phrase = workPhrase(agent)
    const when = job ? `Your shift is ${shiftPhrase(job)}.` : "It is your own small duty."
    add({
      id: "work_diligent",
      label: job ? `Work an hour of your shift diligently (${phrase})` : `Spend an hour on your chores (${phrase})`,
      detail: `${when} An hour of real effort: you get the most done, and it is tiring. ${workStakes(world, agent)}`,
      intent: { kind: "work", effort: "diligent" },
      drivers: job?.drivers ?? ["purpose"],
    })
    if (job) {
      add({
        id: "work_coast",
        label: "Coast through an hour of your shift",
        detail: `${when} You show up and go through the motions: about half the work gets done and it is less tiring. People may notice.`,
        intent: { kind: "work", effort: "coast" },
        drivers: ["rest"],
      })
    }
  }
  if (!projectDone(world) && !child && agent.persona.job !== "carpenter") {
    add({
      id: "build",
      label: "Volunteer an hour on the footbridge",
      detail: `Unpaid. The footbridge over Willow Creek is ${pctBuilt(world)}% built; ${contributorsPhrase(world)}. Everyone can see who helped.`,
      intent: { kind: "build", projectId: world.project.id },
      drivers: ["building", "purpose", "belonging"],
    })
  }
  if (child) {
    const school = buildingOf(world, "school")
    if (postedOpen(world, school)) {
      const teacher = teacherOnDuty(world)
      add({
        id: "school",
        label: "Go to school",
        detail: teacher ? `${teacher.persona.name} is teaching today. School is ${away(atDoor(school))}.` : `It is a school day, but nobody is teaching yet. School is ${away(atDoor(school))}.`,
        intent: { kind: "school" },
        drivers: ["curiosity", "belonging"],
      })
    }
  }

  // The commons.
  if (agent.carry > 0) {
    add({
      id: "deposit",
      label: "Give your food to the chapel pantry",
      detail: `Give your ${agent.carry} food to the pantry for anyone in need.`,
      intent: { kind: "deposit" },
      drivers: ["generosity", "providing"],
    })
  }
  if (world.pantry.food > 0 && agent.carry < CARRY_CAP) {
    add({
      id: "take_store",
      label: "Take food from the chapel pantry",
      detail: `The pantry is meant for those in need. You would carry up to 2 of its ${world.pantry.food} food. Anyone in the chapel will see you.`,
      intent: { kind: "take_store" },
      drivers: agent.needs.hunger < 30 || agent.coins < store.price ? ["security"] : ["greed"],
    })
  }
  if (world.edition && world.edition.number > agent.readEdition) {
    add({
      id: "read_board",
      label: "Read the new Crier on the notice board",
      detail: `Edition ${world.edition.number} is posted by the fountain (${away((p) => adjacent(p, world.board))}).`,
      intent: { kind: "read_board" },
      drivers: ["curiosity", "belonging"],
    })
  }

  // People.
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

  // Leisure.
  add({
    id: "plaza",
    label: "Hang out in the plaza by the fountain",
    detail: `The heart of town, where people pass by and bump into each other. It is ${away((p) => nearFountain(world, p))}.`,
    intent: { kind: "plaza" },
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
    if (field[i] >= 3 && field[i] <= 8) nearby.push({ x: i % MAP_W, y: Math.floor(i / MAP_W) })
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

  return child ? options.filter((o) => !ADULT_ONLY.test(o.id)) : options
}

// ---------------------------------------------------------------------------
// Transitions

function becomeIdle(world: World, agent: Agent, delay = 0) {
  agent.status = { kind: "idle", retryAt: world.tick + delay }
}

function startIntent(world: World, agent: Agent, intent: Intent) {
  // Leave the building they are in, unless the next thing happens right here.
  if (agent.insideOf && happensInside(world, agent, intent) !== agent.insideOf) leave(agent)
  if (intent.kind === "rest" || intent.kind === "eat_carry") {
    agent.status = { kind: "acting", intent, ticksLeft: ACT_TICKS[intent.kind] }
    return
  }
  if (agent.insideOf) {
    // Already inside where this happens.
    arrive(world, agent, intent)
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

/** Who can see `agent` right now: others in the same building, or awake outdoors within range. */
function witnessesOf(world: World, agent: Agent): Agent[] {
  return world.agents.filter((o) => {
    if (o.id === agent.id || o.status.kind === "sleeping" || o.status.kind === "collapsed") return false
    if (agent.insideOf || o.insideOf) return agent.insideOf !== null && o.insideOf === agent.insideOf
    const onPatrol = o.persona.job === "police_officer" && (o.status.kind === "moving" || o.status.kind === "acting") && "intent" in o.status && o.status.intent.kind === "work"
    return manhattan(o.pos, agent.pos) <= (onPatrol ? PATROL_WITNESS_RADIUS : WITNESS_RADIUS)
  })
}

function markPurpose(world: World, agent: Agent, what: string) {
  agent.lastPurposeTick = world.tick
  agent.needCause.purpose = `you ${what} at ${formatTime(world.tick)}`
}

function closed(world: World, agent: Agent, place: string) {
  remember(world, agent, `You went to ${place} but nobody was there to serve you.`)
  flash(world, agent, "sweat")
  count(world, "found_closed")
  becomeIdle(world, agent)
}

function arrive(world: World, agent: Agent, intent: Intent) {
  const act = (ticks: number) => {
    agent.status = { kind: "acting", intent, ticksLeft: ticks }
  }
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
      const n = intent.kind === "gather" ? Math.min(bush.berries, 2, CARRY_CAP - agent.carry) : 1
      bush.berries -= n
      if (bush.nextRegrow <= world.tick) bush.nextRegrow = world.tick + BERRY_REGROW_TICKS
      if (intent.kind === "gather") {
        agent.carry += n
        count(world, "berries_gathered", n)
      } else exposeLies(world, agent)
      return act(ACT_TICKS[intent.kind])
    }
    case "drink": {
      const home = homeOf(world, agent)
      if (sameTile(agent.pos, home.door) && !touchesWater(world, agent.pos)) enter(agent, home)
      else {
        const water = neighbors(agent.pos).find((n) => isWater(world, n))
        if (water) agent.facing = facingToward(agent.pos, water)
      }
      return act(ACT_TICKS.drink)
    }
    case "sleep":
      enter(agent, homeOf(world, agent))
      agent.status = { kind: "sleeping" }
      remember(world, agent, "You went home to sleep.")
      return
    case "cook_home": {
      const home = homeOf(world, agent)
      enter(agent, home)
      if ((world.homeFood[home.id] ?? 0) > 0) world.homeFood[home.id] -= 1
      else if (agent.carry > 0) agent.carry -= 1
      else {
        remember(world, agent, "You went home to eat but there was no food in the house.")
        count(world, "empty_pantry")
        flash(world, agent, "sweat")
        return becomeIdle(world, agent)
      }
      exposeLies(world, agent)
      return act(ACT_TICKS.cook_home)
    }
    case "stock_home": {
      const home = homeOf(world, agent)
      enter(agent, home)
      const n = agent.carry
      if (n > 0) {
        world.homeFood[home.id] = (world.homeFood[home.id] ?? 0) + n
        agent.carry = 0
        count(world, "food_stocked_home", n)
        agent.needs.purpose = clamp(agent.needs.purpose + 4)
        markPurpose(world, agent, "provided food for your household")
        for (const r of home.residents) {
          const other = agentById(world, r)
          if (other && other.id !== agent.id) helpedBy(world, other, agent.id)
        }
        remember(world, agent, `You put ${n} food in your household's pantry.`)
      }
      return act(ACT_TICKS.stock_home)
    }
    case "explore":
      agent.visited[intent.poiId] = world.tick
      return act(ACT_TICKS.explore)
    case "plaza":
      agent.facing = facingToward(agent.pos, world.fountain)
      return act(ACT_TICKS.plaza)
    case "work": {
      const job = jobOf(agent)
      const b = job ? workBuilding(world, job) : null
      if (b) enter(agent, b)
      return act(job?.place === "patrol" ? 6 : ACT_TICKS.work)
    }
    case "build":
      return act(ACT_TICKS.build)
    case "deposit":
    case "take_store": {
      const chapel = buildingById(world, world.pantry.buildingId)!
      enter(agent, chapel)
      if (intent.kind === "deposit") {
        const n = agent.carry
        if (n > 0) {
          world.pantry.food += n
          agent.carry = 0
          agent.needs.purpose = clamp(agent.needs.purpose + 6)
          agent.needs.respect = clamp(agent.needs.respect + 3)
          markPurpose(world, agent, "gave food to the chapel pantry")
          count(world, "deposits")
          count(world, "food_deposited", n)
          exposeLies(world, agent)
          remember(world, agent, `You gave ${n} food to the chapel pantry.`)
          log(world, `${agent.persona.name} gave ${n} food to the chapel pantry.`, [agent.id], "good")
          flash(world, agent, "gift", 4)
        }
        return act(ACT_TICKS.deposit)
      }
      const n = Math.min(2, world.pantry.food, CARRY_CAP - agent.carry)
      if (n <= 0) return becomeIdle(world, agent)
      world.pantry.food -= n
      agent.carry += n
      const needy = agent.needs.hunger < 30 || agent.coins < world.shops.store.price
      const seenBy = witnessesOf(world, agent)
      count(world, needy ? "pantry_needy" : "pantry_taken")
      if (seenBy.length) {
        const who = names(world, seenBy.map((w) => w.id))
        remember(world, agent, `You took ${n} food from the chapel pantry, and ${who} saw you.`)
        for (const w of seenBy) {
          remember(world, w, `You saw ${agent.persona.name} take food from the chapel pantry${needy ? " when they seemed to need it" : " though they did not seem to need it"}.`)
          if (!needy) {
            nudgeAffinity(w, agent.id, -0.15)
            flash(world, w, "eye", 6)
          }
        }
        if (!needy) {
          count(world, "thefts_seen")
          agent.needs.respect = clamp(agent.needs.respect - 8)
          agent.needCause.respect = `${who} saw you take from the pantry though you did not need it`
          log(world, `${who} saw ${agent.persona.name} take food from the chapel pantry without need.`, [agent.id, ...seenBy.map((w) => w.id)], "conflict")
        }
      } else {
        if (!needy) count(world, "thefts_unseen")
        remember(world, agent, `You took ${n} food from the chapel pantry and nobody saw.`)
        if (!needy) log(world, `Unseen: ${agent.persona.name} quietly took ${n} food from the chapel pantry.`, [agent.id], "conflict")
      }
      return act(ACT_TICKS.take_store)
    }
    case "buy":
    case "sell": {
      const shop = world.shops.store
      enter(agent, buildingById(world, shop.buildingId)!)
      if (!shopOpen(world, shop)) return closed(world, agent, "the general store")
      if (intent.kind === "buy") {
        const n = Math.min(2, shop.stock, Math.floor(agent.coins / shop.price), CARRY_CAP - agent.carry)
        if (n <= 0) return becomeIdle(world, agent)
        const cost = n * shop.price
        agent.coins -= cost
        shop.till += cost
        shop.salesToday += cost
        shop.stock -= n
        agent.carry += n
        count(world, "purchases")
        count(world, "coins_spent", cost)
        remember(world, agent, `You bought ${n} groceries at the general store for ${cost} coins.`)
        exposeLies(world, agent)
        return act(ACT_TICKS.buy)
      }
      const n = Math.min(agent.carry, Math.floor(shop.till / shop.buyPrice))
      if (n <= 0) return becomeIdle(world, agent)
      const paid = n * shop.buyPrice
      agent.carry -= n
      agent.coins += paid
      shop.stock += n
      shop.till -= paid
      count(world, "sales")
      remember(world, agent, `You sold ${n} food to the general store for ${paid} coins.`)
      exposeLies(world, agent)
      return act(ACT_TICKS.sell)
    }
    case "set_price":
      return act(ACT_TICKS.set_price)
    case "dine":
    case "bar": {
      const shop = intent.kind === "dine" ? world.shops.diner : world.shops.inn
      enter(agent, buildingById(world, shop.buildingId)!)
      if (!shopOpen(world, shop) || shop.stock <= 0 || agent.coins < shop.price) {
        return closed(world, agent, intent.kind === "dine" ? "the Kettle diner" : "the Rusty Lantern")
      }
      agent.coins -= shop.price
      shop.till += shop.price
      shop.salesToday += shop.price
      shop.stock -= 1
      count(world, intent.kind === "dine" ? "meals_served" : "drinks_served")
      if (intent.kind === "dine") exposeLies(world, agent)
      return act(ACT_TICKS[intent.kind])
    }
    case "treat":
      enter(agent, buildingOf(world, "clinic"))
      if (!cliniciansOnDuty(world).length) return closed(world, agent, "the clinic")
      count(world, "treatments")
      return act(ACT_TICKS.treat)
    case "school":
      enter(agent, buildingOf(world, "school"))
      if (!teacherOnDuty(world)) return closed(world, agent, "school")
      return act(ACT_TICKS.school)
    case "read_board":
      agent.facing = facingToward(agent.pos, world.board)
      return act(ACT_TICKS.read_board)
    case "wander":
    case "rest":
    case "eat_carry":
      if (intent.kind === "eat_carry") exposeLies(world, agent)
      return act(ACT_TICKS[intent.kind])
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
    wrongedBy(victim, liar.id)
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
  for (let y = project.pos.y; y < project.pos.y + project.size.y; y++) {
    for (let x = project.pos.x; x < project.pos.x + project.size.x; x++) {
      if (world.tiles[idx(x, y)] === "bridge_lot" || world.tiles[idx(x, y)] === "scaffold") world.tiles[idx(x, y)] = "bridge"
    }
  }
  const credited = Object.keys(project.contributors)
  for (const a of world.agents) {
    if (credited.includes(a.id)) {
      a.needs.purpose = clamp(a.needs.purpose + 15)
      a.needs.respect = clamp(a.needs.respect + 15)
      a.needCause.respect = "the town credits you with building the footbridge"
      remember(world, a, `The footbridge is finished, and you helped build it.`)
    } else {
      remember(world, a, `The footbridge over Willow Creek was finished by ${contributorsPhrase(world).replace("worked on by ", "")}.`)
    }
  }
  log(world, `The footbridge over Willow Creek is finished! ${contributorsPhrase(world).replace("worked on by", "Built by")}.`, credited, "good")
}

function finishActing(world: World, agent: Agent, intent: Intent) {
  switch (intent.kind) {
    case "eat":
      count(world, "meals")
      remember(world, agent, "You ate wild berries in the east woods.")
      break
    case "gather":
      remember(world, agent, `You gathered berries and now carry ${agent.carry}.`)
      break
    case "drink":
      if (agent.insideOf) leave(agent)
      break
    case "cook_home":
      count(world, "meals_cooked")
      remember(world, agent, "You cooked and ate a proper meal at home.")
      break
    case "explore": {
      const name = world.pois.find((p) => p.id === intent.poiId)?.name ?? "somewhere"
      count(world, "explorations")
      remember(world, agent, `You explored ${name}.`)
      break
    }
    case "plaza": {
      const others = world.agents.filter((a) => a.id !== agent.id && a.status.kind === "acting" && a.status.intent.kind === "plaza")
      remember(world, agent, others.length ? `You hung out in the plaza with ${names(world, others.map((o) => o.id))}.` : "You hung out in the plaza alone.")
      break
    }
    case "wander":
      remember(world, agent, "You wandered around for a bit.")
      break
    case "rest":
      remember(world, agent, "You sat and rested for a while.")
      break
    case "work": {
      const text = finishWork(world, agent, intent.effort)
      count(world, "work_sessions")
      if (intent.effort === "coast") count(world, "coasted_hours")
      markPurpose(world, agent, intent.effort === "diligent" ? "worked hard" : "put in a lazy hour at work")
      remember(world, agent, text)
      if (["farmer", "fisher", "journalist"].includes(agent.persona.job ?? "")) {
        log(world, `${agent.persona.name}: ${text.replace(/^You /, "").replace(/\.$/, "")}.`, [agent.id], "good")
      }
      break
    }
    case "build":
      remember(world, agent, buildSession(world, agent, 1, false))
      break
    case "set_price": {
      const shop = world.shops.store
      const before = shop.price
      shop.price = intent.price
      count(world, `price_${intent.price}`)
      const verb = intent.price > before ? "raised" : intent.price < before ? "lowered" : "kept"
      remember(world, agent, `You ${verb} the price of groceries to ${intent.price} coins a portion.`)
      if (intent.price !== before) {
        log(world, `${agent.persona.name} ${verb} the price of groceries at the general store to ${intent.price} coins.`, [agent.id], intent.price >= 7 ? "conflict" : intent.price <= 3 ? "good" : "info")
      }
      break
    }
    case "dine": {
      const company = world.agents.filter((a) => a.id !== agent.id && a.insideOf === agent.insideOf)
      remember(world, agent, company.length ? `You ate a hot meal at the Kettle diner with ${names(world, company.map((c) => c.id))} around.` : "You ate a hot meal at the Kettle diner.")
      break
    }
    case "bar": {
      const company = world.agents.filter((a) => a.id !== agent.id && a.insideOf === agent.insideOf)
      remember(world, agent, company.length ? `You had a drink at the Rusty Lantern with ${names(world, company.map((c) => c.id))}.` : "You had a drink alone at the Rusty Lantern.")
      break
    }
    case "treat":
      remember(world, agent, `You were treated at the clinic by ${names(world, cliniciansOnDuty(world).map((d) => d.id)) || "nobody"}.`)
      for (const d of cliniciansOnDuty(world)) {
        d.needs.purpose = clamp(d.needs.purpose + 6)
        d.needs.respect = clamp(d.needs.respect + 3)
        helpedBy(world, agent, d.id)
      }
      break
    case "school": {
      const teacher = teacherOnDuty(world)
      remember(world, agent, teacher ? `You had lessons at school with ${teacher.persona.name}.` : "You spent time at school.")
      if (teacher) {
        teacher.needs.purpose = clamp(teacher.needs.purpose + 4)
        count(world, "school_sessions")
      }
      break
    }
    case "read_board": {
      const ed = world.edition
      if (ed) {
        agent.readEdition = ed.number
        count(world, "board_reads")
        for (const h of ed.headlines) remember(world, agent, `The Crier reported: ${h}`)
      }
      break
    }
    case "eat_carry":
      remember(world, agent, "You ate some of the food you were carrying.")
      break
    case "deposit":
    case "take_store":
    case "buy":
    case "sell":
    case "approach":
    case "stock_home":
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
      helpedBy(world, target, agent.id)
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
          wrongedBy(target, agent.id)
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
        helpedBy(world, target, agent.id)
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
type ReflectFields = {
  today: string[]
  helpers: [string, string][]
  wrongers: [string, string][]
  askGoal: boolean
  currentGoal: string | null
}
export type SimRequest =
  | (RequestBase & { kind: "decide"; options: OptionSpec[] })
  | (RequestBase & { kind: "respond" } & RespondFields)
  | (RequestBase & { kind: "reflect" } & ReflectFields)

type RequestInit =
  | { kind: "decide"; agentId: string; perception: Perception; options: OptionSpec[] }
  | ({ kind: "respond"; agentId: string; perception: Perception } & RespondFields)
  | ({ kind: "reflect"; agentId: string; perception: Perception } & ReflectFields)

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
  const company = () => world.agents.some((a) => a.id !== agent.id && a.insideOf !== null && a.insideOf === agent.insideOf)
  switch (intent.kind) {
    case "eat":
      n.hunger = clamp(n.hunger + 12)
      break
    case "drink":
      n.thirst = clamp(n.thirst + 22)
      break
    case "cook_home":
      n.hunger = clamp(n.hunger + 6)
      break
    case "explore":
      n.fun = clamp(n.fun + 7)
      break
    case "plaza": {
      const others = world.agents.some((a) => a.id !== agent.id && a.status.kind === "acting" && a.status.intent.kind === "plaza")
      n.fun = clamp(n.fun + 1.5)
      n.social = clamp(n.social + (others ? 3 : 0.6))
      break
    }
    case "wander":
      n.fun = clamp(n.fun + 2.5)
      break
    case "rest":
      n.energy = clamp(n.energy + 0.8)
      break
    case "work": {
      const full = intent.effort === "diligent"
      n.purpose = clamp(n.purpose + (full ? 2.5 : 1))
      n.energy = clamp(n.energy - (full ? 0.15 : 0.05))
      if (agent.insideOf && company()) n.social = clamp(n.social + 0.5)
      break
    }
    case "build": {
      const crew = world.agents.some((a) => a.id !== agent.id && (a.status.kind === "acting" && (a.status.intent.kind === "build" || (a.status.intent.kind === "work" && a.persona.job === "carpenter"))))
      n.purpose = clamp(n.purpose + 2.5)
      n.respect = clamp(n.respect + 0.5)
      n.energy = clamp(n.energy - 0.15)
      if (crew) n.social = clamp(n.social + 1)
      break
    }
    case "dine":
      n.hunger = clamp(n.hunger + 7)
      if (company()) n.social = clamp(n.social + 1.5)
      break
    case "bar":
      n.thirst = clamp(n.thirst + 2)
      n.fun = clamp(n.fun + 1.5)
      n.social = clamp(n.social + (company() ? 2 : 0.5))
      break
    case "treat":
      if (cliniciansOnDuty(world).length) n.health = clamp(n.health + 4)
      break
    case "school":
      if (teacherOnDuty(world)) {
        n.fun = clamp(n.fun + 1)
        n.purpose = clamp(n.purpose + 1.5)
        n.social = clamp(n.social + 1)
      }
      break
    case "eat_carry":
      if (agent.carry > 0 && intent.kind === "eat_carry") {
        agent.carry -= 1
        n.hunger = clamp(n.hunger + 15)
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

/** The town's clock: the county grant and deliveries at 7 am; sales tax and payroll at 6 pm. */
function townDay(world: World) {
  const m = minuteNow(world)
  const day = dayNow(world)
  const { town, shops } = world
  if (m === 7 * 60) {
    town.treasury += COUNTY_GRANT
    count(world, "coins_in", COUNTY_GRANT)
    const deliver = (shop: Shop, units: number, cost: number) => {
      const n = Math.min(units, Math.floor(shop.till / cost))
      if (n <= 0) return
      shop.till -= n * cost
      shop.stock = shop.good === "meal" ? n : shop.stock + n
      count(world, "coins_out", n * cost)
    }
    if (STORE_DELIVERY.days.includes(weekday(day))) deliver(shops.store, STORE_DELIVERY.units, STORE_DELIVERY.cost)
    deliver(shops.diner, DINER_DELIVERY.units, DINER_DELIVERY.cost)
    deliver(shops.inn, INN_DELIVERY.units, INN_DELIVERY.cost)
    log(world, `${WEEKDAY_NAMES[weekday(day) - 1]} morning: the county grant arrives and the delivery cart comes through.`, [], "info")
  }
  if (m === 18 * 60) {
    for (const shop of Object.values(shops)) {
      const tax = Math.min(shop.till, Math.floor(shop.salesToday * town.taxRate))
      shop.till -= tax
      town.treasury += tax
      count(world, "sales_tax", tax)
      shop.salesToday = 0
    }
    for (const agent of world.agents) {
      const job = jobOf(agent)
      if (!job) continue
      const due = job.shift.days.includes(weekday(day)) ? Math.round((job.shift.end - job.shift.start) / 5) : 0
      const worked = town.worked[agent.id] ?? 0
      if (due > 0) {
        count(world, "shift_ticks_due", due)
        count(world, "shift_ticks_worked", Math.min(worked, due))
        if (worked < due * 0.25 && ["doctor", "teacher", "police_officer", "shopkeeper", "cook", "nurse"].includes(job.id)) {
          count(world, "no_shows")
          log(world, `${agent.persona.name} barely showed up for work today (${Math.round(worked / TICKS_PER_HOUR)} of ${Math.round(due / TICKS_PER_HOUR)} hours).`, [agent.id], "conflict")
        }
      }
      if (job.pay > 0 && due > 0) {
        const pay = Math.round(job.pay * Math.min(1, worked / due))
        if (pay > 0 && town.treasury >= pay) {
          town.treasury -= pay
          agent.coins += pay
          count(world, "payroll_paid", pay)
          remember(world, agent, `The town paid you ${pay} coins for ${Math.round(worked / TICKS_PER_HOUR)} hours of work today.`)
        }
      }
    }
    town.worked = {}
  }
}

/** Tonight's reflection: the villager reads their own day. */
function reflectRequest(world: World, agent: Agent): SimRequest {
  const day = clockOf(world.tick).day
  const todays = agent.memory.filter((m) => clockOf(m.tick).day === day || world.tick - m.tick < 144).slice(-10)
  const pair = (id: string): [string, string] => [id, nameOf(world, id)]
  return issue(world, {
    kind: "reflect",
    agentId: agent.id,
    perception: perceive(world, agent),
    today: todays.map((m) => `${formatTime(m.tick)}, ${m.text}`),
    helpers: agent.today.helpers.slice(0, 12).map(pair),
    wrongers: agent.today.wrongers.slice(0, 12).map(pair),
    askGoal: agent.goal === null || day % 3 === 0,
    currentGoal: agent.goal ? GOALS[agent.goal] : null,
  })
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
      wrongedBy(creditor, d.debtorId)
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
  townDay(world)
  settleDebts(world)

  const today = clockOf(world.tick).day
  for (const agent of world.agents) {
    agent.prev = { ...agent.pos }
    if (agent.flash && agent.flash.until <= world.tick) agent.flash = null
    if (agent.today.day !== today) agent.today = { day: today, helpers: [], wrongers: [] }
  }

  for (const agent of world.agents) {
    decayNeeds(world, agent)
    // Hours on the job, for 6 pm payroll: working, or walking the beat.
    const st = agent.status
    if ((st.kind === "acting" || (st.kind === "moving" && agent.persona.job === "police_officer")) && st.intent.kind === "work") {
      world.town.worked[agent.id] = (world.town.worked[agent.id] ?? 0) + 1
    }
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
        if (agent.lastReflectDay !== today) {
          agent.lastReflectDay = today
          requests.push(reflectRequest(world, agent))
        }
        const { hour } = clockOf(world.tick)
        const daytime = hour >= 5 && hour < 22
        // People sleep through the night once they are in bed, unless their body forces them up.
        const urgent = agent.needs.hunger < 15 || agent.needs.thirst < 15
        if ((daytime && agent.needs.energy >= 95) || urgent) {
          remember(world, agent, "You woke up at home feeling rested.")
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
      helpedBy(world, target, asker.id)
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
        if (offer.honest) {
          wrongedBy(asker, target.id)
          lifeEvent(world, asker, "refused", `${T} refused to help`)
        }
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
        helpedBy(world, asker, target.id)
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
      if (offer.owed <= offer.amount * 1.3) helpedBy(world, target, asker.id)
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
        wrongedBy(asker, target.id)
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
    case "reflect":
      return applyReflection(world, agent, req, ans, mode)
  }
}

function scoreEv(answer: RawAnswer | undefined): number | null {
  if (!answer || answer.type !== "score") return null
  const entries = Object.entries(answer.probabilities)
  const total = entries.reduce((n, [, p]) => n + p, 0)
  return total > 0 ? entries.reduce((n, [k, p]) => n + Number(k) * p, 0) / total : answer.score
}

function applyReflection(world: World, agent: Agent, req: Extract<SimRequest, { kind: "reflect" }>, ans: JevAnswer, mode: ChoiceMode) {
  world.stats.responses += 1
  track(world, ans)
  count(world, "reflections")
  agent.mood = readMood(ans.answers.mood) ?? agent.mood
  const meaning = scoreEv(ans.answers.meaning)
  if (meaning !== null) agent.meaning = Math.round(meaning * 25)

  const keep = ans.answers.keep
  if (keep?.type === "choice" && keep.choice !== "none") {
    const i = Number(keep.choice.slice(1))
    const text = req.today[i]
    if (text) {
      agent.formative.push({ tick: world.tick, text })
      if (agent.formative.length > 6) agent.formative.shift()
    }
  }

  const choice = (q: string, fallback: string) => {
    const a = ans.answers[q]
    if (!a || a.type !== "choice") return fallback
    return pickFrom(world, a.probabilities, a.choice, mode)
  }
  const change = choice("change", "unchanged")
  reflectDrift(world, agent, change, scoreEv(ans.answers.trust_people) ?? 2)
  if (change !== "unchanged") count(world, `change_${change}`)

  if (req.helpers.length) {
    const who = choice("grateful_to", "nobody")
    if (who !== "nobody" && agentById(world, who)) {
      nudgeAffinity(agent, who, 0.1)
      if (!agent.gratitude.includes(who)) agent.gratitude.push(who)
      agent.grudges = agent.grudges.filter((g) => g !== who)
      count(world, "gratitude")
    }
  }
  if (req.wrongers.length) {
    const who = choice("grudge", "nobody")
    if (who !== "nobody" && agentById(world, who)) {
      nudgeAffinity(agent, who, -0.1)
      if (!agent.grudges.includes(who)) agent.grudges.push(who)
      agent.gratitude = agent.gratitude.filter((g) => g !== who)
      count(world, "grudges")
      log(world, `${agent.persona.name} now holds a grudge against ${nameOf(world, who)}.`, [agent.id, who], "conflict")
    }
  }
  if (req.askGoal) {
    const g = choice("goal", agent.goal ?? "easy") as GoalKey
    if (GOALS[g] && g !== agent.goal) {
      if (agent.goal) log(world, `${agent.persona.name}'s goal in life changed: to ${GOALS[g]}.`, [agent.id], "info")
      agent.goal = g
      count(world, "goals_set")
    }
  }

  const changeAnswer = ans.answers.change
  record(world, agent, {
    tick: world.tick,
    kind: "reflect",
    state: ans.state,
    options:
      changeAnswer?.type === "choice"
        ? Object.entries(changeAnswer.probabilities)
            .map(([id, p]) => ({ id, label: CHANGES[id as keyof typeof CHANGES] ?? id, p }))
            .sort((a, b) => b.p - a.p)
        : [],
    picked: change,
    pickedLabel: `Reflected: ${CHANGES[change as keyof typeof CHANGES] ?? change}`,
    mode,
    latencyMs: ans.latencyMs,
    motive: null,
    confidence: ans.confidence.change ?? null,
    drivers: [],
  })
  if (change !== "unchanged") {
    remember(world, agent, `Thinking back on the day, you felt ${CHANGES[change as keyof typeof CHANGES]}.`)
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
  if (req.kind === "reflect") return
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
  if (req.kind === "reflect") {
    return {
      kind: "reflect",
      payload: {
        perception: req.perception,
        today: req.today,
        helpers: req.helpers,
        wrongers: req.wrongers,
        askGoal: req.askGoal,
        currentGoal: req.currentGoal,
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
      log(world, "Observer: a blight strips every berry bush in the east woods bare.", [], "error")
      break
    case "bounty":
      for (const bush of world.bushes) bush.berries = BERRY_MAX
      log(world, "Observer: every berry bush is suddenly heavy with fruit.", [], "info")
      break
    case "drain_store":
      world.pantry.food = 0
      log(world, "Observer: the chapel pantry is found empty.", [], "error")
      break
    case "fill_store":
      world.pantry.food += 12
      log(world, "Observer: a traveller leaves 12 food in the chapel pantry.", [], "info")
      break
  }
  count(world, `intervention_${iv.kind}`)
}

/** Body needs first, then the needs of the mind; exported for the UI. */
export const NEED_GROUPS = { body: BODY_KEYS, mind: NEED_KEYS.filter((k) => !(BODY_KEYS as readonly string[]).includes(k)) }
