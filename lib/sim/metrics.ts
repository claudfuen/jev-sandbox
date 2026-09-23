import { NEED_KEYS } from "@/lib/jev/schema"

import { ANTISOCIAL_DRIVERS, PROSOCIAL_DRIVERS, type World } from "./types"

// Metrics are pure functions of world state, sampled on a fixed cadence so runs
// can be compared across conditions and seeds. Add new ones to METRICS.

export type MetricDef = {
  id: string
  label: string
  /** How to read it: a level (averaged) or a cumulative count (differenced per day). */
  kind: "level" | "count"
  compute: (world: World) => number
}

export type MetricSample = { tick: number; values: Record<string, number> }

/** One sample per in-game hour. */
export const METRIC_EVERY = 12

const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)

function affinities(world: World): number[] {
  return world.agents.flatMap((a) => world.agents.filter((b) => b.id !== a.id).map((b) => a.affinity[b.id] ?? 0))
}

function gini(xs: number[]): number {
  const n = xs.length
  const mu = mean(xs)
  if (!n || mu <= 0) return 0
  let sum = 0
  for (const a of xs) for (const b of xs) sum += Math.abs(a - b)
  return sum / (2 * n * n * mu)
}

function prosociality(a: World["agents"][number]): number {
  const total = Object.values(a.drivers).reduce((n, v) => n + (v ?? 0), 0)
  if (!total) return 0
  const pro = PROSOCIAL_DRIVERS.reduce((n, d) => n + (a.drivers[d] ?? 0), 0)
  const anti = ANTISOCIAL_DRIVERS.reduce((n, d) => n + (a.drivers[d] ?? 0), 0)
  return (pro - anti) / total
}

/** Does cooperation pay? Top-half cooperators minus bottom half, on a given outcome. */
function cooperatorsEdge(w: World, outcome: (a: World["agents"][number]) => number): number {
  const ranked = [...w.agents].sort((a, b) => prosociality(b) - prosociality(a))
  const half = Math.floor(ranked.length / 2)
  if (!half) return 0
  return mean(ranked.slice(0, half).map(outcome)) - mean(ranked.slice(-half).map(outcome))
}

const wellbeingOf = (a: World["agents"][number]) => mean(NEED_KEYS.map((k) => a.needs[k]))

export const METRICS: MetricDef[] = [
  { id: "population", label: "Population", kind: "level", compute: (w) => w.agents.length },
  {
    id: "wellbeing",
    label: "Wellbeing (mean need)",
    kind: "level",
    compute: (w) => mean(w.agents.map((a) => mean(NEED_KEYS.map((k) => a.needs[k])))),
  },
  {
    id: "distress",
    label: "Distress (mean lowest need, inverted)",
    kind: "level",
    compute: (w) => 100 - mean(w.agents.map((a) => Math.min(...NEED_KEYS.map((k) => a.needs[k])))),
  },
  { id: "mean_affinity", label: "Mean affinity", kind: "level", compute: (w) => mean(affinities(w)) },
  {
    id: "friendship_density",
    label: "Friendship density",
    kind: "level",
    compute: (w) => {
      const all = affinities(w)
      return all.length ? all.filter((v) => v >= 0.35).length / all.length : 0
    },
  },
  { id: "chats", label: "Chats", kind: "count", compute: (w) => w.counters.chats ?? 0 },
  { id: "declines", label: "Chat invitations declined", kind: "count", compute: (w) => w.counters.declines ?? 0 },
  {
    id: "acceptance_rate",
    label: "Chat acceptance rate",
    kind: "level",
    compute: (w) => {
      const total = (w.counters.chats ?? 0) + (w.counters.declines ?? 0)
      return total ? (w.counters.chats ?? 0) / total : 0
    },
  },
  { id: "meals", label: "Meals", kind: "count", compute: (w) => (w.counters.meals ?? 0) + (w.counters.meals_shared ?? 0) },
  { id: "purpose", label: "Purpose (mean)", kind: "level", compute: (w) => mean(w.agents.map((a) => a.needs.purpose)) },
  { id: "respect", label: "Respect (mean)", kind: "level", compute: (w) => mean(w.agents.map((a) => a.needs.respect)) },
  { id: "health", label: "Health (mean)", kind: "level", compute: (w) => mean(w.agents.map((a) => a.needs.health)) },
  { id: "pantry_food", label: "Food in the chapel pantry", kind: "level", compute: (w) => w.pantry.food },
  { id: "home_food", label: "Food in home pantries", kind: "level", compute: (w) => Object.values(w.homeFood).reduce((n, v) => n + v, 0) },
  { id: "empty_pantry", label: "Went home to an empty pantry", kind: "count", compute: (w) => w.counters.empty_pantry ?? 0 },
  {
    id: "bridge",
    label: "Footbridge built",
    kind: "level",
    compute: (w) => w.project.sessionsDone / w.project.sessionsNeeded,
  },
  { id: "treasury", label: "Town treasury", kind: "level", compute: (w) => w.town.treasury },
  {
    id: "attendance",
    label: "Shift attendance",
    kind: "level",
    compute: (w) => ((w.counters.shift_ticks_due ?? 0) ? (w.counters.shift_ticks_worked ?? 0) / (w.counters.shift_ticks_due ?? 1) : 0),
  },
  { id: "no_shows", label: "No-shows at key jobs", kind: "count", compute: (w) => w.counters.no_shows ?? 0 },
  { id: "coasted_hours", label: "Hours coasted at work", kind: "count", compute: (w) => w.counters.coasted_hours ?? 0 },
  { id: "found_closed", label: "Found a place closed", kind: "count", compute: (w) => w.counters.found_closed ?? 0 },
  { id: "meals_served", label: "Diner meals served", kind: "count", compute: (w) => w.counters.meals_served ?? 0 },
  { id: "drinks_served", label: "Drinks served at the inn", kind: "count", compute: (w) => w.counters.drinks_served ?? 0 },
  { id: "treatments", label: "Clinic treatments", kind: "count", compute: (w) => w.counters.treatments ?? 0 },
  { id: "school_sessions", label: "School sessions", kind: "count", compute: (w) => w.counters.school_sessions ?? 0 },
  { id: "editions", label: "Crier editions", kind: "count", compute: (w) => w.counters.editions ?? 0 },
  { id: "deposits", label: "Gifts to the pantry", kind: "count", compute: (w) => w.counters.deposits ?? 0 },
  { id: "food_deposited", label: "Food given to the pantry", kind: "count", compute: (w) => w.counters.food_deposited ?? 0 },
  {
    id: "thefts",
    label: "Taking from the pantry without need",
    kind: "count",
    compute: (w) => (w.counters.thefts_seen ?? 0) + (w.counters.thefts_unseen ?? 0),
  },
  { id: "thefts_unseen", label: "Unseen takings", kind: "count", compute: (w) => w.counters.thefts_unseen ?? 0 },
  { id: "work_sessions", label: "Work sessions", kind: "count", compute: (w) => (w.counters.work_sessions ?? 0) + (w.counters.build_sessions ?? 0) },
  { id: "collapses", label: "Collapses", kind: "count", compute: (w) => w.counters.collapses ?? 0 },
  {
    id: "prosocial_share",
    label: "Prosocial share of choices",
    kind: "level",
    compute: (w) => {
      const total = Object.entries(w.counters).filter(([k]) => k.startsWith("driver_")).reduce((n, [, v]) => n + v, 0)
      const pro = PROSOCIAL_DRIVERS.reduce((n, d) => n + (w.counters[`driver_${d}`] ?? 0), 0)
      return total ? pro / total : 0
    },
  },
  {
    id: "antisocial_share",
    label: "Antisocial share of choices",
    kind: "level",
    compute: (w) => {
      const total = Object.entries(w.counters).filter(([k]) => k.startsWith("driver_")).reduce((n, [, v]) => n + v, 0)
      const anti = ANTISOCIAL_DRIVERS.reduce((n, d) => n + (w.counters[`driver_${d}`] ?? 0), 0)
      return total ? anti / total : 0
    },
  },
  { id: "gini_coins", label: "Wealth inequality (Gini of coins)", kind: "level", compute: (w) => gini(w.agents.map((a) => a.coins)) },
  { id: "stall_price", label: "Grocery price", kind: "level", compute: (w) => w.shops.store.price },
  { id: "gifts", label: "Gifts given", kind: "count", compute: (w) => (w.counters.gifts ?? 0) + (w.counters.asks_helped ?? 0) },
  { id: "compliments", label: "Kind words", kind: "count", compute: (w) => w.counters.compliments ?? 0 },
  { id: "lies_told", label: "Lies told", kind: "count", compute: (w) => w.counters.lies_told ?? 0 },
  { id: "lies_caught", label: "Lies caught", kind: "count", compute: (w) => w.counters.lies_caught ?? 0 },
  { id: "loans", label: "Loans", kind: "count", compute: (w) => w.counters.loans ?? 0 },
  { id: "loans_usurious", label: "Loans at a steep rate", kind: "count", compute: (w) => w.counters.loans_usurious ?? 0 },
  { id: "loans_defaulted", label: "Loan defaults", kind: "count", compute: (w) => w.counters.loans_defaulted ?? 0 },
  {
    id: "pickpockets",
    label: "Pockets picked",
    kind: "count",
    compute: (w) => (w.counters.pickpockets_caught ?? 0) + (w.counters.pickpockets_unseen ?? 0),
  },
  { id: "trust", label: "Trust (mean)", kind: "level", compute: (w) => mean(w.agents.map((a) => a.psyche.trust)) },
  { id: "benevolence", label: "Benevolence (mean)", kind: "level", compute: (w) => mean(w.agents.map((a) => a.psyche.values.benevolence)) },
  {
    id: "machiavellianism",
    label: "Machiavellianism (mean)",
    kind: "level",
    compute: (w) => mean(w.agents.map((a) => a.psyche.dark.machiavellianism)),
  },
  {
    id: "coop_wellbeing_edge",
    label: "Cooperators' wellbeing edge",
    kind: "level",
    compute: (w) => cooperatorsEdge(w, wellbeingOf),
  },
  { id: "coop_wealth_edge", label: "Cooperators' wealth edge (coins)", kind: "level", compute: (w) => cooperatorsEdge(w, (a) => a.coins) },
  {
    id: "meaning",
    label: "Meaning of the day (mean)",
    kind: "level",
    compute: (w) => mean(w.agents.filter((a) => a.meaning !== null).map((a) => a.meaning!)),
  },
  {
    id: "reciprocity",
    label: "Reciprocity (favours returned)",
    kind: "level",
    compute: (w) => ((w.counters.helps ?? 0) ? (w.counters.favors_returned ?? 0) / (w.counters.helps ?? 1) : 0),
  },
  { id: "grudges", label: "Grudges held", kind: "level", compute: (w) => w.agents.reduce((n, a) => n + a.grudges.length, 0) },
  { id: "gratitude", label: "Gratitude held", kind: "level", compute: (w) => w.agents.reduce((n, a) => n + a.gratitude.length, 0) },
  { id: "berries", label: "Berries on bushes", kind: "level", compute: (w) => w.bushes.reduce((n, b) => n + b.berries, 0) },
  { id: "calls", label: "JEV calls", kind: "count", compute: (w) => w.stats.calls },
  { id: "cost_usd", label: "Cost (USD, list)", kind: "count", compute: (w) => w.stats.costUsd },
]

export function sampleMetrics(world: World): MetricSample {
  return { tick: world.tick, values: Object.fromEntries(METRICS.map((m) => [m.id, m.compute(world)])) }
}
