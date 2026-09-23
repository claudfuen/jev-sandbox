import { createWorld, type SimRequest } from "./engine"
import type { MetricSample } from "./metrics"
import type { ChoiceMode, World } from "./types"

// A checkpoint is the whole live world at one moment: the source of truth for
// resuming after a reload, independent of the replay log. Shared by the browser
// (which writes it) and the server (which stores it and stamps the lease).

export const CHECKPOINT_VERSION = 1
export const LIVE_WORLD_ID = "fernhollow"
export const LIVE_WORLD = /^[a-z0-9][a-z0-9-]{2,40}$/
/** A driver that stops writing loses the world to the next tab after this long. */
export const LEASE_MS = 45_000
/** Hourly metric samples kept in a checkpoint: one week. */
const METRICS_KEPT = 168
/** Decisions per villager that keep the full text JEV read. Older ones keep only the outcome. */
const STATES_KEPT = 3

export type LiveSettings = { speed: 1 | 2 | 4; mode: ChoiceMode; running: boolean }

export type Checkpoint = {
  v: typeof CHECKPOINT_VERSION
  worldId: string
  savedAt: string
  /** Stamped by the server on every write. The only tab allowed to advance the world. */
  lease: { clientId: string; until: number } | null
  settings: LiveSettings
  world: World
  /** JEV requests that were in flight when this was written. Re-sent on resume. */
  pending: SimRequest[]
  metrics: MetricSample[]
}

export function makeCheckpoint(
  worldId: string,
  world: World,
  pending: SimRequest[],
  metrics: MetricSample[],
  settings: LiveSettings,
): Checkpoint {
  // Shallow copies only: the text JEV read is the bulk of a world, and only the latest matter.
  const slim: World = {
    ...world,
    agents: world.agents.map((a) => ({
      ...a,
      decisions: a.decisions.map((d, i) => (i >= a.decisions.length - STATES_KEPT ? d : { ...d, state: "" })),
    })),
  }
  return {
    v: CHECKPOINT_VERSION,
    worldId,
    savedAt: new Date().toISOString(),
    lease: null,
    settings,
    world: slim,
    pending,
    metrics: metrics.slice(-METRICS_KEPT),
  }
}

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  typeof v === "object" && v !== null && !Array.isArray(v)

/** Copies fields the snapshot lacks from a fresh value, one level deep into plain objects. */
function fill(target: Record<string, unknown>, fresh: Record<string, unknown>) {
  for (const [k, v] of Object.entries(fresh)) {
    if (!(k in target)) target[k] = structuredClone(v)
    else if (isPlainObject(target[k]) && isPlainObject(v) && k !== "affinity" && k !== "counters") {
      for (const [k2, v2] of Object.entries(v)) if (!(k2 in (target[k] as Record<string, unknown>))) (target[k] as Record<string, unknown>)[k2] = structuredClone(v2)
    }
  }
}

/**
 * Additive migration: a world saved by older engine code gets any fields the
 * current code expects from a freshly built world with the same config. Renamed
 * or retyped fields still need an explicit migration here.
 */
export function hydrateWorld(snapshot: World): World {
  const fresh = createWorld(snapshot.config)
  const world = snapshot as unknown as Record<string, unknown>
  fill(world, fresh as unknown as Record<string, unknown>)
  const freshAgents = new Map(fresh.agents.map((a) => [a.id, a]))
  for (const agent of snapshot.agents) {
    const base = freshAgents.get(agent.id) ?? fresh.agents[0]
    fill(agent as unknown as Record<string, unknown>, base as unknown as Record<string, unknown>)
  }
  return snapshot
}

export function isCheckpoint(v: unknown): v is Checkpoint {
  if (!isPlainObject(v)) return false
  const world = v.world as Record<string, unknown> | undefined
  return (
    v.v === CHECKPOINT_VERSION &&
    typeof v.worldId === "string" &&
    isPlainObject(world) &&
    Array.isArray(world.agents) &&
    typeof world.tick === "number" &&
    Array.isArray(v.pending) &&
    Array.isArray(v.metrics) &&
    isPlainObject(v.settings)
  )
}
