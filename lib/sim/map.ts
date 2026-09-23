import type { Bush, House, Landmark, Poi, Tile, Vec } from "./types"

export const MAP_W = 32
export const MAP_H = 20
export const TILE = 16

export const HOUSE_W = 4
export const HOUSE_H = 3

const WALKABLE: ReadonlySet<Tile> = new Set(["grass", "tallgrass", "flowers", "path", "sand", "door"])

export const idx = (x: number, y: number) => y * MAP_W + x
export const inBounds = (x: number, y: number) => x >= 0 && y >= 0 && x < MAP_W && y < MAP_H

export function tileAt(tiles: Tile[], x: number, y: number): Tile {
  return inBounds(x, y) ? tiles[idx(x, y)] : "tree"
}

export function isWalkable(tiles: Tile[], x: number, y: number): boolean {
  return WALKABLE.has(tileAt(tiles, x, y))
}

type MapData = {
  tiles: Tile[]
  houses: House[]
  bushes: Bush[]
  pois: Poi[]
  landmarks: Landmark[]
  campfire: Vec
}

// Owners map to persona ids in personas.ts.
const HOUSES: { ownerId: string; x: number; y: number }[] = [
  { ownerId: "pip", x: 3, y: 2 },
  { ownerId: "bram", x: 8, y: 2 },
  { ownerId: "mo", x: 20, y: 2 },
  { ownerId: "juniper", x: 25, y: 2 },
]

export function buildMap(): MapData {
  const tiles: Tile[] = new Array(MAP_W * MAP_H).fill("grass")
  const set = (x: number, y: number, t: Tile) => {
    if (inBounds(x, y)) tiles[idx(x, y)] = t
  }
  const rect = (x0: number, y0: number, x1: number, y1: number, t: Tile) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, t)
  }

  // Tree border.
  for (let x = 0; x < MAP_W; x++) {
    set(x, 0, "tree")
    set(x, MAP_H - 1, "tree")
  }
  for (let y = 0; y < MAP_H; y++) {
    set(0, y, "tree")
    set(MAP_W - 1, y, "tree")
  }

  // Flower meadow between the two pairs of houses.
  rect(13, 1, 18, 3, "flowers")

  // Paths: main street, the lane down to the plaza, the plaza, side lanes.
  rect(2, 5, 29, 5, "path")
  rect(15, 6, 16, 16, "path")
  rect(13, 9, 18, 12, "path")
  rect(8, 11, 12, 11, "path")
  rect(19, 11, 21, 11, "path")

  // Pond with a sandy shore.
  rect(21, 11, 29, 17, "sand")
  rect(22, 12, 28, 16, "water")
  set(22, 12, "sand")
  set(28, 16, "sand")

  // Tall grass patch in the south.
  rect(9, 15, 12, 18, "tallgrass")

  // Scattered trees and rocks.
  const trees: [number, number][] = [
    [11, 7], [12, 7], [11, 8], [23, 8], [24, 8], [2, 17], [3, 18], [19, 16], [19, 17],
    [29, 2], [29, 3], [1, 7], [1, 8], [20, 8], [6, 7], [26, 18], [14, 18],
  ]
  for (const [x, y] of trees) set(x, y, "tree")
  set(26, 9, "rock")
  set(5, 8, "rock")

  // Houses: 4x3 footprint, door in the bottom row.
  const houses: House[] = HOUSES.map(({ ownerId, x, y }) => {
    rect(x, y, x + HOUSE_W - 1, y + HOUSE_H - 1, "house")
    const door = { x: x + 1, y: y + HOUSE_H - 1 }
    set(door.x, door.y, "door")
    return { id: `house_${ownerId}`, ownerId, x, y, door }
  })

  // Berry grove west of the plaza.
  const bushPositions: Vec[] = [
    { x: 4, y: 11 },
    { x: 7, y: 12 },
    { x: 3, y: 14 },
    { x: 6, y: 15 },
  ]
  const bushes: Bush[] = bushPositions.map((pos, i) => {
    set(pos.x, pos.y, "bush")
    return { id: `bush_${i + 1}`, pos, berries: 3, nextRegrow: 0 }
  })

  const campfire = { x: 15, y: 10 }
  set(campfire.x, campfire.y, "campfire")
  set(15, 17, "well")
  set(28, 8, "sign")

  const pois: Poi[] = [
    { id: "meadow", name: "the flower meadow", stand: { x: 15, y: 2 } },
    { id: "well", name: "the old well", stand: { x: 15, y: 16 } },
    { id: "tallgrass", name: "the tall grass", stand: { x: 10, y: 17 } },
    { id: "signpost", name: "the old signpost", stand: { x: 28, y: 9 } },
  ]

  const landmarks: Landmark[] = [
    ...houses.map((h) => ({
      name: "house",
      ownerId: h.ownerId,
      center: { x: h.door.x, y: h.door.y + 1 },
      radius: 2,
    })),
    { name: "the flower meadow", center: { x: 15, y: 2 }, radius: 3 },
    { name: "the campfire in the plaza", center: campfire, radius: 3 },
    { name: "the berry grove", center: { x: 5, y: 13 }, radius: 4 },
    { name: "the pond shore", center: { x: 25, y: 14 }, radius: 5 },
    { name: "the old well", center: { x: 15, y: 17 }, radius: 2 },
    { name: "the tall grass", center: { x: 10, y: 17 }, radius: 3 },
    { name: "the old signpost", center: { x: 28, y: 8 }, radius: 2 },
    { name: "the main street", center: { x: 15, y: 5 }, radius: 14 },
  ]

  return { tiles, houses, bushes, pois, landmarks, campfire }
}
