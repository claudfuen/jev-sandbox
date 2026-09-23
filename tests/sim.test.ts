import { describe, expect, test } from "bun:test"

import { PIXEL_MAPS } from "@/components/sandbox/sprites"
import { createWorld, perceive, buildOptions, step, type SimRequest } from "@/lib/sim/engine"
import { findPath } from "@/lib/sim/geometry"
import { isWalkable, MAP_H, MAP_W } from "@/lib/sim/map"
import { ReplayCursor, Session } from "@/lib/sim/session"
import type { JevAnswer } from "@/lib/jev/schema"

describe("pixel maps", () => {
  for (const [name, { map, width }] of Object.entries(PIXEL_MAPS)) {
    test(`${name} rows are ${width} wide`, () => {
      for (const row of map) expect(row.length).toBe(width)
    })
  }
})

describe("world", () => {
  const world = createWorld()

  test("every agent can reach every POI, the pond, the grove and home", () => {
    for (const agent of world.agents) {
      for (const poi of world.pois) {
        expect(isWalkable(world.tiles, poi.stand.x, poi.stand.y)).toBe(true)
        expect(findPath(world.tiles, agent.pos, (p) => p.x === poi.stand.x && p.y === poi.stand.y)).not.toBeNull()
      }
      const options = buildOptions(world, agent)
      for (const id of ["eat", "drink", "sleep", "campfire", "rest"]) {
        expect(options.some((o) => o.id === id)).toBe(true)
      }
    }
  })

  test("option ids are unique and wire-safe", () => {
    for (const agent of world.agents) {
      const ids = buildOptions(world, agent).map((o) => o.id)
      expect(new Set(ids).size).toBe(ids.length)
      for (const id of ids) expect(id).toMatch(/^[a-z0-9_]{1,40}$/)
    }
  })

  test("first tick asks every agent for a decision with a valid perception", () => {
    const w = createWorld()
    const reqs = step(w)
    expect(reqs).toHaveLength(w.agents.length)
    for (const r of reqs) expect(r.perception.noticing.length).toBeGreaterThan(0)
    expect(perceive(w, w.agents[0]).name).toBe("Pip")
  })

  test("map is fully bordered", () => {
    for (let x = 0; x < MAP_W; x++) {
      expect(isWalkable(world.tiles, x, 0)).toBe(false)
      expect(isWalkable(world.tiles, x, MAP_H - 1)).toBe(false)
    }
  })
})

// A deterministic stand-in for JEV so the replay test needs no network.
function fakeAnswer(req: SimRequest): JevAnswer {
  const h = (n: number) => ((req.id * 2654435761 + n * 97) >>> 0) / 4294967296
  const mood = { type: "score" as const, score: Math.floor(h(1) * 5), probabilities: { "0": 0.1, "1": 0.2, "2": 0.4, "3": 0.2, "4": 0.1 } }
  if (req.kind === "decide") {
    const weights = req.options.map((_, i) => h(i + 2) + 0.05)
    const total = weights.reduce((a, b) => a + b, 0)
    const probabilities = Object.fromEntries(req.options.map((o, i) => [o.id, weights[i] / total]))
    const choice = req.options[weights.indexOf(Math.max(...weights))].id
    return { kind: "decide", state: "", answers: { action: { type: "choice", choice, probabilities }, mood }, confidence: {}, latencyMs: 300, costUsd: 0.00002 }
  }
  return { kind: "respond", state: "", answers: { engage: { type: "boolean", probability: h(3) }, mood }, confidence: {}, latencyMs: 300, costUsd: 0.00002 }
}

describe("record and replay", () => {
  test("a recorded run replays to the identical world, including after seeking back", () => {
    const session = new Session({ seed: 42 })
    const lagged: SimRequest[] = []
    for (let t = 0; t < 700; t++) {
      if (session.world.tick === 150) session.intervene({ kind: "famine" })
      if (session.world.tick === 400) session.intervene({ kind: "bounty" })
      const reqs = session.tick()
      // Answer last tick's requests now (a one-tick thinking lag), and fail every 17th.
      for (const req of lagged.splice(0)) {
        if (req.id % 17 === 0) session.fail(req.id, "simulated outage")
        else session.answer(req.id, fakeAnswer(req), req.id % 5 === 0 ? "argmax" : "sample")
      }
      lagged.push(...reqs)
    }
    const record = session.toRecord({ id: "test-run", title: "test", createdAt: "2026-01-01T00:00:00Z", source: "lab" })
    expect(record.events.length).toBeGreaterThan(100)

    const cursor = new ReplayCursor(record)
    cursor.seek(record.meta.endTick)
    expect(cursor.desyncs).toBe(0)
    const strip = (w: unknown) => JSON.stringify(w, (k, v) => (k === "state" ? undefined : v))
    expect(strip(cursor.world)).toBe(strip(session.world))

    cursor.seek(200)
    expect(cursor.tick).toBe(200)
    cursor.seek(record.meta.endTick)
    expect(strip(cursor.world)).toBe(strip(session.world))
    expect(cursor.desyncs).toBe(0)
  })

  test("replay recomputes what JEV saw", () => {
    const session = new Session({ seed: 3 })
    const reqs = session.tick()
    for (const req of reqs) session.answer(req.id, fakeAnswer(req), "sample")
    const record = session.toRecord({ id: "test-run-2", title: "t", createdAt: "2026-01-01T00:00:00Z", source: "lab" })
    const cursor = new ReplayCursor(record)
    cursor.seek(1)
    const d = cursor.world.agents[0].decisions.at(-1)!
    expect(d.state).toContain("You are Pip")
  })
})
