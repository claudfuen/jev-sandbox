import { describe, expect, test } from "bun:test"

import {
  GRAVE_SLOTS,
  TOWN_H,
  TOWN_W,
  buildTownMap,
  isTownWalkable,
  townIdx,
  townTileAt,
} from "@/lib/sim/town-map"
import type { Building, Tile, Vec } from "@/lib/sim/types"

const PLAZA: Vec = { x: 24, y: 17 }
const STEPS: Vec[] = [
  { x: 1, y: 0 },
  { x: -1, y: 0 },
  { x: 0, y: 1 },
  { x: 0, y: -1 },
]

/** Steps from `start` to every tile on foot; -1 when unreachable. */
function bfs(tiles: Tile[], start: Vec): Int32Array {
  const dist = new Int32Array(TOWN_W * TOWN_H).fill(-1)
  dist[townIdx(start.x, start.y)] = 0
  const queue: Vec[] = [start]
  for (let head = 0; head < queue.length; head++) {
    const p = queue[head]
    for (const s of STEPS) {
      const x = p.x + s.x
      const y = p.y + s.y
      if (!isTownWalkable(tiles, x, y) || dist[townIdx(x, y)] !== -1) continue
      dist[townIdx(x, y)] = dist[townIdx(p.x, p.y)] + 1
      queue.push({ x, y })
    }
  }
  return dist
}

const neighbours = (p: Vec): Vec[] =>
  STEPS.map((s) => ({ x: p.x + s.x, y: p.y + s.y }))

function footprint(b: Building): Vec[] {
  const out: Vec[] = []
  for (let y = b.pos.y; y < b.pos.y + b.size.y; y++)
    for (let x = b.pos.x; x < b.pos.x + b.size.x; x++) out.push({ x, y })
  return out
}

const inFootprint = (b: Building, p: Vec) =>
  p.x >= b.pos.x &&
  p.x < b.pos.x + b.size.x &&
  p.y >= b.pos.y &&
  p.y < b.pos.y + b.size.y

describe("town map", () => {
  const town = buildTownMap()
  const { tiles } = town
  const byId = new Map(town.buildings.map((b) => [b.id, b]))
  const reach = bfs(tiles, PLAZA)
  const reachable = (p: Vec) => reach[townIdx(p.x, p.y)] >= 0

  test("is 48 x 30", () => {
    expect(TOWN_W).toBe(48)
    expect(TOWN_H).toBe(30)
    expect(tiles).toHaveLength(48 * 30)
  })

  test("trees border the map except the county road exit", () => {
    expect(town.roadExit).toEqual({ x: 24, y: 29 })
    for (let y = 0; y < TOWN_H; y++) {
      for (let x = 0; x < TOWN_W; x++) {
        const edge = x === 0 || y === 0 || x === TOWN_W - 1 || y === TOWN_H - 1
        if (!edge) continue
        if (x === 24 && y === 29) {
          expect(townTileAt(tiles, x, y)).toBe("path")
          expect(isTownWalkable(tiles, x, y)).toBe(true)
        } else {
          expect(townTileAt(tiles, x, y)).toBe("tree")
        }
      }
    }
    expect(isTownWalkable(tiles, -1, 5)).toBe(false)
    expect(isTownWalkable(tiles, 24, 30)).toBe(false)
  })

  test("every building has one walkable door on its bottom row", () => {
    expect(town.buildings).toHaveLength(21)
    expect(new Set(town.buildings.map((b) => b.id)).size).toBe(21)
    let doorsOnMap = 0
    for (const t of tiles) if (t === "door") doorsOnMap++
    expect(doorsOnMap).toBe(town.buildings.length)

    for (const b of town.buildings) {
      const home = b.kind === "home" || b.kind === "farmhouse"
      const doors = footprint(b).filter(
        (p) => townTileAt(tiles, p.x, p.y) === "door"
      )
      expect(doors).toEqual([b.door])
      expect(b.door.y).toBe(b.pos.y + b.size.y - 1)
      expect(isTownWalkable(tiles, b.door.x, b.door.y)).toBe(true)
      for (const p of footprint(b)) {
        if (p.x === b.door.x && p.y === b.door.y) continue
        expect(townTileAt(tiles, p.x, p.y)).toBe(home ? "house" : "building")
      }
      const outside = [
        { x: b.door.x, y: b.door.y + 1 },
        { x: b.door.x - 1, y: b.door.y },
        { x: b.door.x + 1, y: b.door.y },
      ].filter((p) => !inFootprint(b, p) && isTownWalkable(tiles, p.x, p.y))
      expect(outside.length).toBeGreaterThan(0)
    }
  })

  test("11 homes house the spec 3.1 households", () => {
    const homes = town.buildings.filter(
      (b) => b.kind === "home" || b.kind === "farmhouse"
    )
    expect(homes).toHaveLength(11)
    expect(homes.filter((b) => b.kind === "home")).toHaveLength(10)
    for (const h of homes) {
      expect(h.size).toEqual({ x: 4, y: 3 })
      expect(h.door).toEqual({ x: h.pos.x + 1, y: h.pos.y + 2 })
      expect(h.hours).toBeNull()
    }

    const expected: Record<string, string> = {
      tomas: "h_vale", // Tomas Vale
      odile: "h_marsh", // Odile Marsh
      hazel: "h_quill", // Hazel Quill
      linnea: "h_fairbanks", // Linnea Fairbanks
      juniper: "h_moss", // Juniper Moss
      wren: "h_aldous", // Wren Aldous
      sable: "h_crane", // Sable Crane
      mo: "h_mo", // Mo Harrow
      bram: "h_oakes", // Bram Oakes
      hollis: "h_reed", // Hollis Reed
    }
    for (const [person, homeId] of Object.entries(expected)) {
      expect(byId.get(homeId)?.kind).toBe("home")
      expect(byId.get(homeId)?.residents).toEqual([person])
    }
    const farmhouse = byId.get("h_harrow")!
    expect(farmhouse.kind).toBe("farmhouse")
    expect(farmhouse.residents).toEqual(["pip", "ivy", "kit", "tansy"])
    expect(byId.get("b_inn")?.residents).toEqual(["lark"])

    const everyone = town.buildings.flatMap((b) => b.residents).sort()
    expect(everyone).toEqual(
      [
        "tomas",
        "odile",
        "hazel",
        "ivy",
        "linnea",
        "juniper",
        "wren",
        "sable",
        "mo",
        "lark",
        "pip",
        "hollis",
        "bram",
        "kit",
        "tansy",
      ].sort()
    )
  })

  test("posted hours follow spec 2.2", () => {
    const weekdays = [1, 2, 3, 4, 5]
    const monSat = [1, 2, 3, 4, 5, 6]
    const daily = [1, 2, 3, 4, 5, 6, 7]
    const hours: Record<string, Building["hours"]> = {
      b_clinic: { open: 540, close: 1020, days: weekdays },
      b_police: { open: 480, close: 1200, days: daily },
      b_town_hall: { open: 540, close: 1020, days: weekdays },
      b_school: { open: 480, close: 900, days: weekdays },
      b_chapel: null,
      b_store: { open: 480, close: 1080, days: monSat },
      b_diner: { open: 420, close: 1200, days: daily },
      b_inn: { open: 960, close: 1440, days: daily },
      b_crier: null,
      b_workshop: { open: 480, close: 1020, days: monSat },
    }
    for (const [id, h] of Object.entries(hours)) {
      expect(byId.get(id)?.hours).toEqual(h)
    }
  })

  test("spec coordinates for buildings and plaza features", () => {
    const at = (id: string) => {
      const b = byId.get(id)!
      return { pos: b.pos, size: b.size, door: b.door }
    }
    expect(at("b_clinic")).toEqual({
      pos: { x: 2, y: 9 },
      size: { x: 5, y: 4 },
      door: { x: 4, y: 12 },
    })
    expect(at("b_town_hall")).toEqual({
      pos: { x: 14, y: 8 },
      size: { x: 8, y: 5 },
      door: { x: 17, y: 12 },
    })
    expect(at("b_inn")).toEqual({
      pos: { x: 14, y: 16 },
      size: { x: 7, y: 4 },
      door: { x: 17, y: 19 },
    })
    expect(at("b_crier")).toEqual({
      pos: { x: 33, y: 16 },
      size: { x: 4, y: 4 },
      door: { x: 34, y: 19 },
    })
    expect(at("b_workshop")).toEqual({
      pos: { x: 32, y: 2 },
      size: { x: 4, y: 3 },
      door: { x: 33, y: 4 },
    })
    expect(at("h_harrow")).toEqual({
      pos: { x: 12, y: 25 },
      size: { x: 4, y: 3 },
      door: { x: 13, y: 27 },
    })
    expect(at("h_reed").pos).toEqual({ x: 31, y: 21 })
    expect(at("h_aldous").pos).toEqual({ x: 27, y: 2 })

    expect(town.fountain).toEqual({ x: 26, y: 17 })
    expect(townTileAt(tiles, 26, 17)).toBe("fountain")
    expect(isTownWalkable(tiles, 26, 17)).toBe(false)
    expect(town.board).toEqual({ x: 23, y: 15 })
    expect(townTileAt(tiles, 23, 15)).toBe("board")
    expect(isTownWalkable(tiles, 23, 15)).toBe(false)
    expect(town.dock).toEqual({ x: 30, y: 26 })
    expect(townTileAt(tiles, 30, 26)).toBe("dock")
    expect(
      neighbours(town.dock).some((p) => townTileAt(tiles, p.x, p.y) === "water")
    ).toBe(true)
  })

  test("terrain features sit where the spec puts them", () => {
    expect(town.bushes.map((b) => b.pos)).toEqual([
      { x: 43, y: 4 },
      { x: 45, y: 7 },
      { x: 43, y: 11 },
      { x: 45, y: 16 },
      { x: 43, y: 21 },
      { x: 45, y: 24 },
    ])
    for (const b of town.bushes) {
      expect(b.berries).toBe(3)
      expect(b.nextRegrow).toBe(0)
      expect(townTileAt(tiles, b.pos.x, b.pos.y)).toBe("bush")
    }
    expect(townTileAt(tiles, 44, 14)).toBe("tree") // the old oak
    expect(townTileAt(tiles, 44, 3)).toBe("rock") // the old mill ruins

    // Willow Creek: water, except the ford and the footbridge lot.
    for (let y = 1; y <= 28; y++) {
      for (const x of [40, 41]) {
        const t = townTileAt(tiles, x, y)
        if (y === 26 || y === 27) expect(t).toBe("ford")
        else if (y === 13 || y === 14) expect(t).toBe("bridge_lot")
        else expect(t).toBe("water")
      }
    }
    expect(town.bridgeLot).toHaveLength(4)
    for (const p of town.bridgeLot) {
      expect(townTileAt(tiles, p.x, p.y)).toBe("bridge_lot")
      expect(isTownWalkable(tiles, p.x, p.y)).toBe(false)
    }

    expect(town.fields).toEqual([
      { x: 1, y: 25 },
      { x: 4, y: 25 },
      { x: 7, y: 25 },
      { x: 1, y: 27 },
      { x: 4, y: 27 },
      { x: 7, y: 27 },
    ])
    for (const f of town.fields)
      for (let dy = 0; dy < 2; dy++)
        for (let dx = 0; dx < 3; dx++)
          expect(townTileAt(tiles, f.x + dx, f.y + dy)).toBe("field")

    expect(town.lots).toEqual([
      { id: "lot_a", pos: { x: 17, y: 21 }, size: { x: 4, y: 3 } },
      { id: "lot_b", pos: { x: 22, y: 21 }, size: { x: 4, y: 3 } },
    ])
    for (const lot of town.lots)
      for (let dy = 0; dy < lot.size.y; dy++)
        for (let dx = 0; dx < lot.size.x; dx++)
          expect(townTileAt(tiles, lot.pos.x + dx, lot.pos.y + dy)).toBe("lot")

    expect(GRAVE_SLOTS).toHaveLength(12)
    for (const g of GRAVE_SLOTS) {
      expect(g.x >= 35 && g.x <= 38 && g.y >= 9 && g.y <= 11).toBe(true)
      expect(isTownWalkable(tiles, g.x, g.y)).toBe(true)
    }
  })

  test("lanes and the plaza are path", () => {
    const lanes: [number, number, number, number][] = [
      [1, 5, 39, 5], // Elm Lane
      [1, 13, 39, 14], // Main Street
      [1, 20, 39, 20], // Market Lane
      [1, 24, 39, 24], // Farm Lane
      [13, 5, 13, 20],
      [22, 5, 22, 13],
      [28, 20, 28, 24],
      [39, 5, 39, 27],
      [24, 24, 24, 29], // county road
      [11, 24, 11, 28],
      [11, 28, 16, 28],
      [22, 15, 31, 19], // plaza
    ]
    for (const [x0, y0, x1, y1] of lanes)
      for (let y = y0; y <= y1; y++)
        for (let x = x0; x <= x1; x++) {
          if ((x === 26 && y === 17) || (x === 23 && y === 15)) continue
          expect(`${x},${y}:${townTileAt(tiles, x, y)}`).toBe(`${x},${y}:path`)
        }
  })

  test("everything that matters is reachable on foot from the plaza", () => {
    expect(isTownWalkable(tiles, PLAZA.x, PLAZA.y)).toBe(true)
    const targets: [string, Vec][] = [
      ...town.buildings.map((b): [string, Vec] => [`door ${b.id}`, b.door]),
      ...town.pois.map((p): [string, Vec] => [`poi ${p.id}`, p.stand]),
      ["dock", town.dock],
      ["road exit", town.roadExit],
      ...town.fields.flatMap((f): [string, Vec][] =>
        [0, 1, 2].flatMap((dx) =>
          [0, 1].map((dy): [string, Vec] => [
            `field ${f.x},${f.y}`,
            { x: f.x + dx, y: f.y + dy },
          ])
        )
      ),
      ...town.lots.map((l): [string, Vec] => [`lot ${l.id}`, l.pos]),
    ]
    for (const [label, p] of targets) {
      expect(`${label}:${reachable(p)}`).toBe(`${label}:true`)
    }

    const anyReachableNeighbour = (p: Vec) => neighbours(p).some(reachable)
    for (const b of town.bushes) expect(anyReachableNeighbour(b.pos)).toBe(true)
    for (const p of neighbours(town.fountain)) expect(reachable(p)).toBe(true)
    for (const p of neighbours(town.board)) expect(reachable(p)).toBe(true)

    // No sealed pockets: every walkable tile is one connected component.
    for (let y = 0; y < TOWN_H; y++)
      for (let x = 0; x < TOWN_W; x++)
        if (isTownWalkable(tiles, x, y))
          expect(`${x},${y}:${reachable({ x, y })}`).toBe(`${x},${y}:true`)

    expect(town.pois.length).toBeGreaterThanOrEqual(6)
    expect(new Set(town.pois.map((p) => p.id)).size).toBe(town.pois.length)
  })

  test("the east woods are reachable only through the ford", () => {
    // Columns 40 and 41 are the creek: the ford is their only walkable ground.
    for (let y = 0; y < TOWN_H; y++)
      for (const x of [40, 41])
        expect(isTownWalkable(tiles, x, y)).toBe(y === 26 || y === 27)

    const woodsReached = (dist: Int32Array) => {
      let n = 0
      for (let y = 0; y < TOWN_H; y++)
        for (let x = 42; x < TOWN_W; x++) if (dist[townIdx(x, y)] >= 0) n++
      return n
    }
    expect(woodsReached(reach)).toBeGreaterThan(0)

    const noFord = [...tiles]
    for (let y = 26; y <= 27; y++)
      for (const x of [40, 41]) noFord[townIdx(x, y)] = "water"
    expect(woodsReached(bfs(noFord, PLAZA))).toBe(0)
  })

  test("a finished footbridge shortens plaza to old oak by 15+ steps", () => {
    const oak = town.pois.find((p) => p.id === "old_oak")!.stand
    const viaFord = reach[townIdx(oak.x, oak.y)]
    const bridged = [...tiles]
    for (const p of town.bridgeLot) bridged[townIdx(p.x, p.y)] = "bridge"
    const viaBridge = bfs(bridged, PLAZA)[townIdx(oak.x, oak.y)]
    expect(viaBridge).toBeGreaterThan(0)
    expect(viaFord - viaBridge).toBeGreaterThanOrEqual(15)
  })

  test("landmarks name every building and area", () => {
    const names = new Set(town.landmarks.map((l) => l.name))
    for (const b of town.buildings) {
      expect(names.has(b.name)).toBe(true)
      const home = b.kind === "home" || b.kind === "farmhouse"
      const lm = town.landmarks.find((l) => l.name === b.name)!
      expect(lm.houseId).toBe(home ? b.id : undefined)
    }
    for (const name of [
      "the plaza",
      "Elm Lane",
      "Main Street",
      "Market Lane",
      "Farm Lane",
      "the farm",
      "the pond",
      "the east woods",
      "Willow Creek",
      "the graveyard",
      "the schoolyard",
      "the county road",
    ]) {
      expect(names.has(name)).toBe(true)
    }
    for (const lm of town.landmarks) expect(lm.radius).toBeGreaterThan(0)
  })
})
