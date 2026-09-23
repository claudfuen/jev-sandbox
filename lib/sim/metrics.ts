import { NEED_KEYS } from "@/lib/jev/schema"

import type { World } from "./types"

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
  { id: "meals", label: "Meals", kind: "count", compute: (w) => w.counters.meals ?? 0 },
  { id: "berries", label: "Berries on bushes", kind: "level", compute: (w) => w.bushes.reduce((n, b) => n + b.berries, 0) },
  { id: "calls", label: "JEV calls", kind: "count", compute: (w) => w.stats.calls },
  { id: "cost_usd", label: "Cost (USD, list)", kind: "count", compute: (w) => w.stats.costUsd },
]

export function sampleMetrics(world: World): MetricSample {
  return { tick: world.tick, values: Object.fromEntries(METRICS.map((m) => [m.id, m.compute(world)])) }
}
