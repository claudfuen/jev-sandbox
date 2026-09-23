import { HOUSEHOLDS } from "./personas"
import type { Bush, House, Landmark, Poi, Project, Store, Tile, Vec } from "./types"

export const MAP_W = 32
export const MAP_H = 20
export const TILE = 16

export const HOUSE_W = 4
export const HOUSE_H = 3

const WALKABLE: ReadonlySet<Tile> = new Set<Tile>(["grass", "tallgrass", "flowers", "path", "sand", "door"])

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
  project: Project
  store: Store
}

/** House footprints, in the same order as HOUSEHOLDS. */
const HOUSE_SPOTS: Vec[] = [
  { x: 3, y: 2 },
  { x: 8, y: 2 },
  { x: 20, y: 2 },
  { x: 25, y: 2 },
  { x: 2, y: 7 },
  { x: 24, y: 7 },
]

export const STORE_START_FOOD = 12

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
    [11, 7], [12, 7], [11, 8], [2, 17], [3, 18], [19, 16], [19, 17],
    [29, 2], [29, 3], [1, 7], [1, 8], [21, 8], [6, 8], [26, 18], [14, 18],
  ]
  for (const [x, y] of trees) set(x, y, "tree")
  set(29, 10, "rock")
  set(7, 9, "rock")

  // Houses: 4x3 footprint, door in the bottom row. Households share a house.
  const houses: House[] = HOUSE_SPOTS.map(({ x, y }, i) => {
    rect(x, y, x + HOUSE_W - 1, y + HOUSE_H - 1, "house")
    const door = { x: x + 1, y: y + HOUSE_H - 1 }
    set(door.x, door.y, "door")
    return { id: `house_${i + 1}`, residents: [...(HOUSEHOLDS[i] ?? [])], x, y, door }
  })

  // The granary: a shared build site beside the main street.
  const project: Project = {
    id: "granary",
    name: "the granary",
    pos: { x: 18, y: 6 },
    size: { x: 3, y: 2 },
    sessionsDone: 0,
    sessionsNeeded: 12,
    contributors: {},
    doneAt: null,
  }
  rect(project.pos.x, project.pos.y, project.pos.x + project.size.x - 1, project.pos.y + project.size.y - 1, "site")

  // The village store: a communal basket in the plaza.
  const store: Store = { pos: { x: 17, y: 10 }, food: STORE_START_FOOD, nextSpoil: 0 }

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
  set(store.pos.x, store.pos.y, "store")
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
      houseId: h.id,
      center: { x: h.door.x, y: h.door.y + 1 },
      radius: 2,
    })),
    { name: "the granary build site", center: { x: 19, y: 8 }, radius: 2 },
    { name: "the flower meadow", center: { x: 15, y: 2 }, radius: 3 },
    { name: "the campfire in the plaza", center: campfire, radius: 3 },
    { name: "the berry grove", center: { x: 5, y: 13 }, radius: 4 },
    { name: "the pond shore", center: { x: 25, y: 14 }, radius: 5 },
    { name: "the old well", center: { x: 15, y: 17 }, radius: 2 },
    { name: "the tall grass", center: { x: 10, y: 17 }, radius: 3 },
    { name: "the old signpost", center: { x: 28, y: 8 }, radius: 2 },
    { name: "the main street", center: { x: 15, y: 5 }, radius: 14 },
  ]

  return { tiles, houses, bushes, pois, landmarks, campfire, project, store }
}
