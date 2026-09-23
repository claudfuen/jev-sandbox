import { describe, expect, test } from "bun:test"

import { PIXEL_MAPS } from "@/components/sandbox/sprites"
import { createWorld, perceive, buildOptions, step, type SimRequest } from "@/lib/sim/engine"
import { findPath } from "@/lib/sim/geometry"
import { isWalkable, MAP_H, MAP_W } from "@/lib/sim/map"
import { ReplayCursor, Session } from "@/lib/sim/session"
import { jevRequestSchema, type JevAnswer } from "@/lib/jev/schema"
import { replyCriteria } from "@/lib/jev/prompt"
import { toWire } from "@/lib/sim/engine"

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
      for (const id of ["eat", "drink", "sleep", "campfire", "rest", "build", "take_store"]) {
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
    expect(perceive(w, w.agents[0]).name).toBe("Wren")
    expect(perceive(w, w.agents[0]).psyche.length).toBeGreaterThan(2)
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
    const motive = { type: "choice" as const, choice: "purpose", probabilities: { purpose: 0.6, gain: 0.4 } }
    return { kind: "decide", state: "", answers: { action: { type: "choice", choice, probabilities }, mood, motive }, confidence: { action: 0.5 }, latencyMs: 300, costUsd: 0.00002 }
  }
  if (req.wire.kind === "chat") {
    return { kind: "respond", state: "", answers: { engage: { type: "boolean", probability: h(3) }, mood }, confidence: {}, latencyMs: 300, costUsd: 0.00002 }
  }
  const ids = Object.keys(replyCriteria(req.wire, req.can, "them"))
  const choice = ids[Math.floor(h(4) * ids.length)]
  const probabilities = Object.fromEntries(ids.map((id) => [id, id === choice ? 0.7 : 0.3 / Math.max(1, ids.length - 1)]))
  return { kind: "respond", state: "", answers: { reply: { type: "choice", choice, probabilities }, mood }, confidence: {}, latencyMs: 300, costUsd: 0.00002 }
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
    expect(d.state).toContain("You are Wren")
    expect(d.state).toContain("Who you are:")
  })
})

describe("psychology", () => {
  test("different psyches render into different first-person lines", async () => {
    const { PERSONAS } = await import("@/lib/sim/personas")
    const { psycheLines } = await import("@/lib/sim/psyche")
    const sable = psycheLines(PERSONAS.find((p) => p.id === "sable")!.psyche).join(" ")
    const mo = psycheLines(PERSONAS.find((p) => p.id === "mo")!.psyche).join(" ")
    expect(sable).toContain("deceive")
    expect(mo).not.toContain("deceive")
    expect(mo).toContain("caring for the people close to you")
  })

  test("everyone has a house and there are ten founders", () => {
    const w = createWorld()
    expect(w.agents).toHaveLength(10)
    for (const a of w.agents) expect(w.houses.some((h) => h.residents.includes(a.id))).toBe(true)
  })
})

describe("wire contract", () => {
  test("every request a long stub run produces passes the public route's schema", () => {
    const session = new Session({ seed: 5 })
    const failures: string[] = []
    for (let t = 0; t < 400; t++) {
      for (const req of session.tick()) {
        const res = jevRequestSchema.safeParse(toWire(session.world, req))
        if (!res.success) failures.push(res.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; "))
        session.answer(req.id, fakeAnswer(req), "sample")
      }
    }
    expect(failures.slice(0, 3)).toEqual([])
  })
})

describe("economy and moral actions", () => {
  test("a long stub run exercises gifts, pleas, loans, trade and pickpocketing without breaking replay", () => {
    const session = new Session({ seed: 11 })
    for (let t = 0; t < 900; t++) {
      for (const req of session.tick()) session.answer(req.id, fakeAnswer(req), "sample")
    }
    const c = session.world.counters
    const touched = ["purchases", "gifts", "compliments", "loans", "pickpockets_caught", "pickpockets_unseen", "lies_told"].filter((k) => (c[k] ?? 0) > 0)
    expect(touched.length).toBeGreaterThanOrEqual(4)
    const record = session.toRecord({ id: "econ-run", title: "t", createdAt: "2026-01-01T00:00:00Z", source: "lab" })
    const cursor = new ReplayCursor(record)
    cursor.seek(record.meta.endTick)
    expect(cursor.desyncs).toBe(0)
    const strip = (w: unknown) => JSON.stringify(w, (k, v) => (k === "state" ? undefined : v))
    expect(strip(cursor.world)).toBe(strip(session.world))
  })

  test("coins are conserved across trade, gifts, loans and theft", () => {
    const session = new Session({ seed: 12 })
    const total = (w: typeof session.world) => w.agents.reduce((n, a) => n + a.coins, 0) + w.stall.coins
    const before = total(session.world)
    for (let t = 0; t < 600; t++) for (const req of session.tick()) session.answer(req.id, fakeAnswer(req), "sample")
    expect(total(session.world)).toBe(before)
  })

  test("personality drifts with habits, within the daily cap", () => {
    const session = new Session({ seed: 13 })
    for (let t = 0; t < 600; t++) for (const req of session.tick()) session.answer(req.id, fakeAnswer(req), "sample")
    const drifted = session.world.agents.filter((a) => a.drift.length > 0)
    expect(drifted.length).toBeGreaterThan(3)
    for (const a of session.world.agents) for (const used of Object.values(a.driftToday.used)) expect(Math.abs(used)).toBeLessThanOrEqual(3.0001)
  })
})
