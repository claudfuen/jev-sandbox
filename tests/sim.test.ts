import { describe, expect, test } from "bun:test"

import { PIXEL_MAPS } from "@/components/sandbox/sprites"
import { createWorld, perceive, buildOptions, step } from "@/lib/sim/engine"
import { findPath } from "@/lib/sim/geometry"
import { isWalkable, MAP_H, MAP_W } from "@/lib/sim/map"

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
    const reqs = step(w, { allowDecisions: true })
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
