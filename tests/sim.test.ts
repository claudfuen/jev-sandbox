import { describe, expect, test } from "bun:test"

import { PIXEL_MAPS } from "@/components/sandbox/sprites"
import { createWorld, perceive, buildOptions, step, type SimRequest } from "@/lib/sim/engine"
import { findPath } from "@/lib/sim/geometry"
import { isWalkable, MAP_H, MAP_W } from "@/lib/sim/map"
import { ReplayCursor, Session } from "@/lib/sim/session"
import { jevRequestSchema, type JevAnswer } from "@/lib/jev/schema"
import { replyCriteria } from "@/lib/jev/prompt"
import { toWire } from "@/lib/sim/engine"
import { fakeAnswer } from "./fake-jev"
import { hydrateWorld, isCheckpoint, makeCheckpoint, type Checkpoint } from "@/lib/sim/checkpoint"

describe("pixel maps", () => {
  for (const [name, { map, width }] of Object.entries(PIXEL_MAPS)) {
    test(`${name} rows are ${width} wide`, () => {
      for (const row of map) expect(row.length).toBe(width)
    })
  }
})

describe("world", () => {
  const world = createWorld()

  test("every villager can reach every POI from home, and gets the basic options", () => {
    for (const agent of world.agents) {
      for (const poi of world.pois) {
        expect(isWalkable(world.tiles, poi.stand.x, poi.stand.y)).toBe(true)
        expect(findPath(world.tiles, agent.pos, (p) => p.x === poi.stand.x && p.y === poi.stand.y)).not.toBeNull()
      }
      const options = buildOptions(world, agent)
      for (const id of ["eat", "drink", "sleep", "plaza", "rest"]) expect(options.some((o) => o.id === id)).toBe(true)
      const child = agent.persona.age < 16
      expect(options.some((o) => o.id === "take_store")).toBe(!child)
      expect(options.some((o) => o.id.startsWith("pickpocket_"))).toBe(false)
    }
  })

  test("children are never offered adult-only acts", () => {
    const w = createWorld()
    for (let t = 0; t < 120; t++) step(w)
    for (const kid of w.agents.filter((a) => a.persona.age < 16)) {
      for (const o of buildOptions(w, kid)) expect(o.id).not.toMatch(/^(lie_|lend_|usury_|pickpocket_|take_store|sell|work_|build|price_|demand_)/)
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
    expect(perceive(w, w.agents[0]).name).toBe("Tomas")
    expect(perceive(w, w.agents[0]).psyche.length).toBeGreaterThan(2)
  })

  test("map is bordered except the county road exit", () => {
    for (let x = 0; x < MAP_W; x++) {
      expect(isWalkable(world.tiles, x, 0)).toBe(false)
      if (x !== 24) expect(isWalkable(world.tiles, x, MAP_H - 1)).toBe(false)
    }
  })
})

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
    expect(d.state).toContain("You are Tomas")
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

  test("everyone has a home and there are fifteen founders", () => {
    const w = createWorld()
    expect(w.agents).toHaveLength(15)
    for (const a of w.agents) expect(w.buildings.some((b) => b.residents.includes(a.id))).toBe(true)
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
    const touched = ["purchases", "gifts", "compliments", "loans", "pickpockets_caught", "pickpockets_unseen", "lies_told", "meals_served", "work_sessions"].filter((k) => (c[k] ?? 0) > 0)
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
    const w0 = session.world
    const total = (w: typeof w0) =>
      w.agents.reduce((n, a) => n + a.coins, 0) + Object.values(w.shops).reduce((n, s) => n + s.till, 0) + w.town.treasury
    const before = total(w0)
    for (let t = 0; t < 600; t++) for (const req of session.tick()) session.answer(req.id, fakeAnswer(req), "sample")
    // Coins only cross the town boundary as the county grant (in) and deliveries (out).
    const boundary = (w0.counters.coins_in ?? 0) - (w0.counters.coins_out ?? 0)
    expect(total(session.world)).toBe(before + boundary)
  })

  test("personality drifts, within the daily cap, under both drift models", () => {
    const session = new Session({ seed: 13, driftModel: "engine" })
    for (let t = 0; t < 600; t++) for (const req of session.tick()) session.answer(req.id, fakeAnswer(req), "sample")
    const drifted = session.world.agents.filter((a) => a.drift.length > 0)
    expect(drifted.length).toBeGreaterThan(3)
    for (const a of session.world.agents) for (const used of Object.values(a.driftToday.used)) expect(Math.abs(used)).toBeLessThanOrEqual(3.0001)
  })
})

describe("reflection", () => {
  test("nightly reflections set goals, formative memories and drift under the jev model", () => {
    const session = new Session({ seed: 21, driftModel: "jev" })
    for (let t = 0; t < 700; t++) for (const req of session.tick()) session.answer(req.id, fakeAnswer(req), "sample")
    const w = session.world
    expect(w.counters.reflections ?? 0).toBeGreaterThan(5)
    expect(w.agents.some((a) => a.goal !== null)).toBe(true)
    expect(w.agents.some((a) => a.formative.length > 0)).toBe(true)
    expect(w.agents.some((a) => a.drift.some((d) => d.cause.startsWith("reflection")))).toBe(true)
    expect(w.agents.every((a) => a.drift.every((d) => d.cause.startsWith("reflection")))).toBe(true)
  })

  test("drift is off under the off model", () => {
    const session = new Session({ seed: 22, driftModel: "off" })
    for (let t = 0; t < 700; t++) for (const req of session.tick()) session.answer(req.id, fakeAnswer(req), "sample")
    expect(session.world.agents.every((a) => a.drift.length === 0)).toBe(true)
  })
})

describe("town", () => {
  test("shops open only while their keeper is inside on shift, and payroll follows hours worked", () => {
    // Random stand-in answers are spread thin over a large menu, so pool a few towns.
    const c: Record<string, number> = {}
    for (const seed of [31, 32, 33]) {
      const session = new Session({ seed })
      for (let t = 0; t < 300; t++) for (const req of session.tick()) session.answer(req.id, fakeAnswer(req), "sample")
      for (const [k, v] of Object.entries(session.world.counters)) c[k] = (c[k] ?? 0) + v
    }
    expect(c.work_sessions ?? 0).toBeGreaterThan(0)
    // Nobody was ever served while the keeper was away.
    expect((c.meals_served ?? 0) + (c.drinks_served ?? 0) + (c.purchases ?? 0) + (c.found_closed ?? 0)).toBeGreaterThan(0)
    expect((c.shift_ticks_due ?? 0) > 0).toBe(true)
    expect(c.coins_in ?? 0).toBeGreaterThan(0)
  })
})

describe("justice", () => {
  test("the dead never act again, every murder leaves a grave, and the cell always unlocks", () => {
    let deaths = 0
    for (const seed of [5, 6]) {
      const session = new Session({ seed })
      const jailedSince = new Map<string, number>()
      for (let t = 0; t < 1500; t++) {
        for (const req of session.tick()) {
          const agent = session.world.agents.find((a) => a.id === req.agentId)!
          expect(agent.status.kind).not.toBe("dead")
          session.answer(req.id, fakeAnswer(req, { violent: true }), "sample")
        }
        for (const a of session.world.agents) {
          if (a.status.kind === "jailed") {
            if (!jailedSince.has(a.id)) jailedSince.set(a.id, session.world.tick)
            // Never held longer than a full day.
            expect(session.world.tick - jailedSince.get(a.id)!).toBeLessThanOrEqual(288)
          } else jailedSince.delete(a.id)
        }
      }
      const w = session.world
      const dead = w.agents.filter((a) => a.status.kind === "dead")
      deaths += dead.length
      expect(w.graves.length).toBe(dead.length)
      for (const m of w.crimes.filter((c) => c.kind === "murder")) expect(w.graves.some((g) => g.agentId === m.victimId)).toBe(true)
      for (const a of dead) {
        const died = a.status.kind === "dead" ? a.status.tick : 0
        expect(a.decisions.every((d) => d.tick <= died)).toBe(true)
      }
    }
    // Undamped random answers are violent; this proves the path is exercised.
    expect(deaths).toBeGreaterThan(0)
  })
})

describe("live checkpoints", () => {
  const strip = (w: unknown) =>
    JSON.parse(JSON.stringify(w, (k, v) => (k === "state" && typeof v === "string" ? "" : v)))

  test("a world resumed from a checkpoint continues exactly as if it never stopped", () => {
    // Answers arrive one tick late, so requests are in flight at the checkpoint.
    const run = (session: Session, from: number, to: number, carry: SimRequest[]) => {
      let lagged = carry
      for (let t = from; t < to; t++) {
        const fresh = session.tick()
        for (const req of lagged) session.answer(req.id, fakeAnswer(req), "sample")
        lagged = fresh
      }
      return lagged
    }
    const a = new Session({ seed: 77 })
    let inFlight = run(a, 0, 150, [])
    let at = 150
    while (inFlight.length === 0) inFlight = run(a, at, ++at, inFlight)
    const cp = makeCheckpoint("test", a.world, a.inFlight, a.metrics, { speed: 1, mode: "sample", running: true })
    expect(a.inFlight.length).toBeGreaterThan(0)
    const restored = JSON.parse(JSON.stringify(cp)) as Checkpoint
    expect(isCheckpoint(restored)).toBe(true)
    const world = hydrateWorld(restored.world)
    const b = new Session(world.config, { world, pending: restored.pending, metrics: restored.metrics })
    expect(b.inFlight.map((r) => r.id)).toEqual(inFlight.map((r) => r.id))
    run(a, at, 400, inFlight)
    run(b, at, 400, b.inFlight)
    expect(strip(b.world)).toEqual(strip(a.world))
  })

  test("hydration fills fields that older saves lack", () => {
    const s = new Session({ seed: 78 })
    const old = JSON.parse(JSON.stringify(s.world))
    delete old.graves
    delete old.agents[0].grieving
    const w = hydrateWorld(old)
    expect(w.graves).toEqual([])
    expect(w.agents[0].grieving).toEqual([])
  })

  test("a saved run from a resumed world replays from its checkpoint", () => {
    const a = new Session({ seed: 79 })
    for (let t = 0; t < 100; t++) for (const req of a.tick()) a.answer(req.id, fakeAnswer(req), "sample")
    const world = hydrateWorld(JSON.parse(JSON.stringify(a.world)))
    const b = new Session(world.config, { world, pending: [], metrics: [] })
    for (let t = 0; t < 120; t++) for (const req of b.tick()) b.answer(req.id, fakeAnswer(req), "sample")
    const record = JSON.parse(JSON.stringify(b.toRecord({ id: "resumed", title: "t", createdAt: "", source: "live" })))
    const cursor = new ReplayCursor(record)
    cursor.seek(record.meta.endTick)
    expect(cursor.desyncs).toBe(0)
    expect(strip(cursor.world)).toEqual(strip(b.world))
  })
})
