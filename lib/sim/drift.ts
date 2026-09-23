import { clockOf } from "./clock"
import type { Psyche } from "./psyche"
import type { Agent, DriverKey, World } from "./types"

// Personality drift: deterministic physics of habit and experience. Nothing
// here chooses an action. It only changes who a villager is, which changes the
// words JEV reads next time, so traits evolve organically from what people do
// and what happens to them. Every change is logged with its cause.

export type PsychePath =
  | `big5.${keyof Psyche["big5"]}`
  | `values.${keyof Psyche["values"]}`
  | `foundations.${keyof Psyche["foundations"]}`
  | `dark.${keyof Psyche["dark"]}`
  | "risk"
  | "patience"
  | "trust"

type Delta = [PsychePath, number]

/** No trait moves more than this many points in one in-game day. */
const DAILY_CAP = 3
const DRIFT_KEEP = 60

function read(p: Psyche, path: PsychePath): number {
  const [head, key] = path.split(".") as [string, string | undefined]
  if (!key) return p[head as "risk" | "patience" | "trust"]
  return (p[head as "big5" | "values" | "foundations" | "dark"] as Record<string, number>)[key]
}

function write(p: Psyche, path: PsychePath, v: number) {
  const [head, key] = path.split(".") as [string, string | undefined]
  if (!key) p[head as "risk" | "patience" | "trust"] = v
  else (p[head as "big5" | "values" | "foundations" | "dark"] as Record<string, number>)[key] = v
}

function adjust(world: World, agent: Agent, path: PsychePath, delta: number, cause: string) {
  const day = clockOf(world.tick).day
  if (agent.driftToday.day !== day) agent.driftToday = { day, used: {} }
  const used = agent.driftToday.used[path] ?? 0
  const allowed = delta > 0 ? Math.min(delta, DAILY_CAP - used) : Math.max(delta, -DAILY_CAP - used)
  if (Math.abs(allowed) < 1e-6) return
  const before = read(agent.psyche, path)
  const after = Math.max(0, Math.min(100, before + allowed))
  const applied = after - before
  if (Math.abs(applied) < 1e-6) return
  write(agent.psyche, path, Math.round(after * 100) / 100)
  agent.driftToday.used[path] = used + applied
  const last = agent.drift.at(-1)
  if (last && last.key === path && last.cause === cause && world.tick - last.tick < 72) {
    last.delta = Math.round((last.delta + applied) * 100) / 100
    last.tick = world.tick
  } else {
    agent.drift.push({ tick: world.tick, key: path, delta: Math.round(applied * 100) / 100, cause })
    if (agent.drift.length > DRIFT_KEEP) agent.drift.shift()
  }
}

/** Habit: what you keep choosing slowly becomes who you are. */
const HABITS: Partial<Record<DriverKey, Delta[]>> = {
  generosity: [["values.benevolence", 0.6], ["big5.agreeableness", 0.3]],
  kindness: [["values.benevolence", 0.4], ["big5.agreeableness", 0.4]],
  duty: [["big5.conscientiousness", 0.3], ["foundations.fairness", 0.3]],
  building: [["big5.conscientiousness", 0.3], ["values.achievement", 0.3]],
  providing: [["big5.conscientiousness", 0.2], ["values.benevolence", 0.2]],
  curiosity: [["big5.openness", 0.2]],
  belonging: [["big5.extraversion", 0.1]],
  deception: [["dark.machiavellianism", 0.8], ["big5.agreeableness", -0.2]],
  theft: [["dark.psychopathy", 0.4], ["values.power", 0.3], ["values.conformity", -0.4]],
  greed: [["values.power", 0.3], ["values.conformity", -0.3]],
  exploitation: [["values.power", 0.5], ["values.benevolence", -0.4], ["dark.machiavellianism", 0.3]],
  confrontation: [["big5.agreeableness", -0.3]],
  rest: [["big5.conscientiousness", -0.1]],
}

export function habit(world: World, agent: Agent, drivers: DriverKey[], label: string) {
  for (const d of drivers) {
    for (const [path, delta] of HABITS[d] ?? []) adjust(world, agent, path, delta, `habit: ${label.toLowerCase()}`)
  }
}

export type LifeEvent =
  | "helped"
  | "refused"
  | "robbed"
  | "lied_to"
  | "defaulted_on"
  | "thanked"
  | "got_away"
  | "caught"
  | "shamed"

const EVENTS: Record<Exclude<LifeEvent, "caught">, Delta[]> = {
  helped: [["trust", 2], ["values.benevolence", 0.5]],
  refused: [["trust", -1]],
  robbed: [["trust", -4], ["big5.neuroticism", 1]],
  lied_to: [["trust", -5], ["big5.agreeableness", -0.5]],
  defaulted_on: [["trust", -4]],
  thanked: [["values.benevolence", 0.3]],
  got_away: [["risk", 0.5], ["dark.machiavellianism", 0.4]],
  shamed: [["values.conformity", 0.5], ["dark.narcissism", -0.3]],
}

/** Experience: how events land depends on who they happen to. */
export function lifeEvent(world: World, agent: Agent, event: LifeEvent, cause: string) {
  if (event === "caught") {
    // Being caught shames the agreeable into conforming and teaches the callous to be sneakier.
    const deltas: Delta[] =
      agent.psyche.big5.agreeableness >= 40
        ? [["values.conformity", 0.8], ["dark.narcissism", -0.5]]
        : [["dark.machiavellianism", 0.8]]
    for (const [path, delta] of deltas) adjust(world, agent, path, delta, cause)
    return
  }
  for (const [path, delta] of EVENTS[event]) adjust(world, agent, path, delta, cause)
}
