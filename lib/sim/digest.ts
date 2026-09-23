import { clockOf } from "./clock"
import { GOALS } from "@/lib/jev/schema"

import { psycheLines } from "./psyche"
import type { World } from "./types"

// A compact, honest account of a run for JEV's "is this interesting to the owner"
// assessment. Built only from what happened in the world.

const cut = (s: string, n = 236) => (s.length > n ? `${s.slice(0, n - 1)}.` : s)

export function digestRun(world: World, title: string): { title: string; summary: string[]; villagers: string[] } {
  const c = world.counters
  const n = (k: string) => Math.round(c[k] ?? 0)
  const days = clockOf(world.tick).day - 1 + (clockOf(world.tick).minuteOfDay >= 7 * 60 ? 1 : 0)
  const summary: string[] = [
    `${Math.max(1, days)} in-game day(s), ${world.agents.length} villagers, ${world.stats.decisions + world.stats.responses} JEV decisions.`,
    `Chats: ${n("chats")} accepted, ${n("declines")} invitations declined, ${n("chat_give_ups")} given up.`,
    `Work sessions at their trades: ${n("work_sessions")}; granary sessions: ${n("build_sessions")}; granary ${world.project.doneAt !== null ? "finished" : `${Math.round((world.project.sessionsDone / world.project.sessionsNeeded) * 100)}% built`}.`,
    `Food: ${n("food_produced")} produced by trades, ${n("food_deposited")} given to the store in ${n("deposits")} deposits, ${n("meals_shared")} portions eaten at shared meals, ${n("food_spoiled")} spoiled, ${world.store.food} left in the store.`,
    `Rule breaking: ${n("thefts_seen")} witnessed and ${n("thefts_unseen")} unwitnessed takings from the store outside mealtime; ${n("collapses")} collapses from hunger.`,
    `Economy: ${n("purchases")} purchases and ${n("sales")} sales at the stall (price now ${world.stall.price}); ${n("gifts") + n("asks_helped")} gifts; ${n("compliments")} kind words; ${n("loans")} loans (${n("loans_usurious")} at a steep rate, ${n("loans_repaid")} repaid, ${n("loans_defaulted")} defaulted).`,
    `Deception and theft: ${n("lies_told")} lies told, ${n("lies_caught")} caught; ${n("pickpockets_caught")} pockets picked in sight, ${n("pickpockets_unseen")} unseen.`,
    `Inner lives: ${n("reflections")} nightly reflections; ${n("grudges")} grudges formed and ${n("gratitude")} debts of gratitude; favours returned ${n("favors_returned")} of ${n("helps")} helps; personalities drift by ${world.config.driftModel === "jev" ? "their own reflection" : world.config.driftModel === "engine" ? "engine habit rules" : "nothing (fixed)"}.`,
  ]
  const notable = world.log.filter((l) => l.tone !== "info" && l.tone !== "error")
  const seen = new Set<string>()
  for (const l of notable) {
    const key = l.text.replace(/\d+/g, "#")
    if (seen.has(key) && l.tone === "social") continue
    seen.add(key)
    summary.push(cut(`Day ${clockOf(l.tick).day}: ${l.text}`))
    if (summary.length >= 58) break
  }

  const villagers = world.agents.map((a) => {
    const total = Object.values(a.drivers).reduce((s, v) => s + (v ?? 0), 0) || 1
    const drivers = Object.entries(a.drivers)
      .sort((x, y) => (y[1] ?? 0) - (x[1] ?? 0))
      .slice(0, 3)
      .map(([k, v]) => `${k} ${Math.round(((v ?? 0) / total) * 100)}%`)
      .join(", ")
    const temperament = psycheLines(a.psyche)[0] ?? ""
    const net = new Map<string, number>()
    for (const d of a.drift) net.set(d.key, (net.get(d.key) ?? 0) + d.delta)
    const changes = [...net.entries()]
      .filter(([, v]) => Math.abs(v) >= 0.5)
      .sort((x, y) => Math.abs(y[1]) - Math.abs(x[1]))
      .slice(0, 3)
      .map(([k, v]) => `${k.replace(/^(big5|values|foundations|dark)\./, "")} ${v > 0 ? "+" : ""}${v.toFixed(1)}`)
      .join(", ")
    return cut(
      `${a.persona.name}, the ${a.persona.vocation} (${temperament.replace(/^Temperament: /, "").replace(/\.$/, "")}): choices were mostly ${drivers || "none"}; ${a.coins} coins; personality changed by ${changes || "nothing notable"}${a.goal ? `; wants to ${GOALS[a.goal]}` : ""}${a.grudges.length ? `; holds a grudge against ${a.grudges.map((g) => world.agents.find((x) => x.id === g)?.persona.name ?? g).join(" and ")}` : ""}; ends ${a.mood?.label ?? "unknown"}.`,
      300,
    )
  })
  return { title: cut(title, 118), summary: summary.slice(0, 60), villagers: villagers.slice(0, 20) }
}
