/**
 * Fernhollow, the 48 x 30 town map (docs/society-spec.md sections 2.1, 2.2,
 * 2.5 and 3.1). Hand-laid and fixed. Coordinates are tile x, y and every
 * rectangle below is inclusive, exactly as the spec tables write them.
 */
import type {
  Building,
  BuildingKind,
  Bush,
  Landmark,
  Poi,
  Tile,
  Vec,
} from "./types"

export const TOWN_W = 48
export const TOWN_H = 30

export type TownMap = {
  /** Row-major, TOWN_W * TOWN_H. */
  tiles: Tile[]
  /** Every building from spec 2.2, including the 11 homes. */
  buildings: Building[]
  /** The 6 east woods berry bushes. */
  bushes: Bush[]
  /** Explorable spots, each with a walkable stand tile. */
  pois: Poi[]
  /** Named areas for "where you are" text. Nearest center within radius wins. */
  landmarks: Landmark[]
  /** Plaza fountain, the town water source. Blocks. */
  fountain: Vec
  /** Notice board in the plaza. Blocks. */
  board: Vec
  /** Walkable dock tile beside the pond water. */
  dock: Vec
  /** Footbridge lot tiles over the creek (bridge_lot, not walkable). */
  bridgeLot: Vec[]
  /** Top-left tile of each 3x2 field plot. */
  fields: Vec[]
  /** The county road gap in the tree border. */
  roadExit: Vec
  /** The empty house lots, walkable "lot" tiles. */
  lots: { id: string; pos: Vec; size: Vec }[]
}

const WALKABLE: ReadonlySet<Tile> = new Set<Tile>([
  "grass",
  "tallgrass",
  "flowers",
  "path",
  "sand",
  "door",
  "lot",
  "field",
  "dock",
  "bridge",
  "ford",
])

export const townIdx = (x: number, y: number) => y * TOWN_W + x
export const inTown = (x: number, y: number) =>
  x >= 0 && y >= 0 && x < TOWN_W && y < TOWN_H

export function townTileAt(tiles: Tile[], x: number, y: number): Tile {
  return inTown(x, y) ? tiles[townIdx(x, y)] : "tree"
}

export function isTownWalkable(tiles: Tile[], x: number, y: number): boolean {
  return WALKABLE.has(townTileAt(tiles, x, y))
}

/** The 12 graveyard slots (x 35 to 38, y 9 to 11), filled in order by burials. */
export const GRAVE_SLOTS: Vec[] = [9, 10, 11].flatMap((y) =>
  [35, 36, 37, 38].map((x) => ({ x, y }))
)

// Posted hours: minutes of day and ISO weekdays (1 Monday .. 7 Sunday).
const WEEKDAYS = [1, 2, 3, 4, 5]
const MON_TO_SAT = [1, 2, 3, 4, 5, 6]
const DAILY = [1, 2, 3, 4, 5, 6, 7]
const at = (hour: number) => hour * 60

type Spec = {
  id: string
  kind: BuildingKind
  name: string
  /** Inclusive footprint x0, y0 to x1, y1. */
  rect: [number, number, number, number]
  door: Vec
  hours: Building["hours"]
  residents: string[]
}

/** Spec 2.2, the working buildings. */
const WORK_BUILDINGS: Spec[] = [
  {
    id: "b_clinic",
    kind: "clinic",
    name: "the clinic",
    rect: [2, 9, 6, 12],
    door: { x: 4, y: 12 },
    hours: { open: at(9), close: at(17), days: WEEKDAYS },
    residents: [],
  },
  {
    id: "b_police",
    kind: "police",
    name: "the police station",
    rect: [8, 9, 12, 12],
    door: { x: 10, y: 12 },
    hours: { open: at(8), close: at(20), days: DAILY },
    residents: [],
  },
  {
    id: "b_town_hall",
    kind: "town_hall",
    name: "the town hall",
    rect: [14, 8, 21, 12],
    door: { x: 17, y: 12 },
    hours: { open: at(9), close: at(17), days: WEEKDAYS },
    residents: [],
  },
  {
    id: "b_school",
    kind: "school",
    name: "the school",
    rect: [23, 9, 28, 12],
    door: { x: 25, y: 12 },
    hours: { open: at(8), close: at(15), days: WEEKDAYS },
    residents: [],
  },
  {
    id: "b_chapel",
    kind: "chapel",
    name: "the chapel",
    rect: [30, 8, 34, 12],
    door: { x: 32, y: 12 },
    hours: null, // always open
    residents: [],
  },
  {
    id: "b_store",
    kind: "store",
    name: "the general store",
    rect: [2, 16, 6, 19],
    door: { x: 4, y: 19 },
    hours: { open: at(8), close: at(18), days: MON_TO_SAT },
    residents: [],
  },
  {
    id: "b_diner",
    kind: "diner",
    name: "the Kettle diner",
    rect: [8, 16, 12, 19],
    door: { x: 10, y: 19 },
    hours: { open: at(7), close: at(20), days: DAILY },
    residents: [],
  },
  {
    id: "b_inn",
    kind: "inn",
    name: "the Rusty Lantern",
    rect: [14, 16, 20, 19],
    door: { x: 17, y: 19 },
    // The bar's hours; rooms are always open.
    hours: { open: at(16), close: at(24), days: DAILY },
    residents: ["lark"],
  },
  {
    id: "b_crier",
    kind: "crier",
    name: "the Crier print shop",
    rect: [33, 16, 36, 19],
    door: { x: 34, y: 19 },
    hours: null, // open when Juniper is in, no posted hours
    residents: [],
  },
  {
    id: "b_workshop",
    kind: "workshop",
    name: "Wren's workshop",
    rect: [32, 2, 35, 4],
    door: { x: 33, y: 4 },
    hours: { open: at(8), close: at(17), days: MON_TO_SAT },
    residents: [],
  },
]

/** Spec 2.1 and 3.1: 10 houses (4x3, door on the bottom row, second tile) plus the farmhouse. */
const HOMES: {
  id: string
  name: string
  x: number
  y: number
  residents: string[]
}[] = [
  { id: "h_vale", name: "the Vale house", x: 2, y: 2, residents: ["tomas"] },
  { id: "h_marsh", name: "the Marsh house", x: 7, y: 2, residents: ["odile"] },
  { id: "h_quill", name: "the Quill house", x: 12, y: 2, residents: ["hazel"] },
  {
    id: "h_fairbanks",
    name: "the Fairbanks house",
    x: 17,
    y: 2,
    residents: ["linnea"],
  },
  { id: "h_moss", name: "the Moss house", x: 22, y: 2, residents: ["juniper"] },
  {
    id: "h_aldous",
    name: "the Aldous house",
    x: 27,
    y: 2,
    residents: ["wren"],
  },
  { id: "h_mo", name: "Mo's house", x: 2, y: 21, residents: ["mo"] },
  { id: "h_crane", name: "the Crane house", x: 7, y: 21, residents: ["sable"] },
  { id: "h_oakes", name: "the Oakes house", x: 12, y: 21, residents: ["bram"] },
  { id: "h_reed", name: "the Reed house", x: 31, y: 21, residents: ["hollis"] },
  {
    id: "h_harrow",
    name: "the Harrow farmhouse",
    x: 12,
    y: 25,
    residents: ["pip", "ivy", "kit", "tansy"],
  },
]

const HOME_SPECS: Spec[] = HOMES.map((h) => ({
  id: h.id,
  kind: h.id === "h_harrow" ? "farmhouse" : "home",
  name: h.name,
  rect: [h.x, h.y, h.x + 3, h.y + 2],
  door: { x: h.x + 1, y: h.y + 2 },
  hours: null,
  residents: h.residents,
}))

/**
 * East woods terrain, x 42 to 46, one string per row from y 1 to 28.
 * T tree, g grass, t tall grass. A trail winds from the ford landing
 * (42,26) north to the mill clearing, with the footbridge landing at
 * (42,13) and (42,14). Bushes, the old oak and the mill ruins are laid
 * over this from their spec coordinates.
 */
const WOODS_X0 = 42
const WOODS_Y0 = 1
const WOODS: string[] = [
  "TTTTT", // y 1
  "TgggT", // y 2  mill clearing
  "TgggT", // y 3  mill ruins at 44,3
  "TgggT", // y 4  bush at 43,4
  "TTtTT", // y 5
  "TttTT", // y 6
  "TTttT", // y 7  bush at 45,7
  "TTtTT", // y 8
  "TTttT", // y 9
  "TttTT", // y 10
  "TgtTT", // y 11 bush at 43,11
  "TTtTT", // y 12
  "ggtTT", // y 13 footbridge landing
  "gggTT", // y 14 footbridge landing; the old oak at 44,14
  "TgggT", // y 15
  "TTtgT", // y 16 bush at 45,16
  "TTtTT", // y 17
  "TttTT", // y 18
  "TTtTT", // y 19
  "TTttT", // y 20
  "TgtTT", // y 21 bush at 43,21
  "TTtTT", // y 22
  "TTttT", // y 23
  "TTtgT", // y 24 bush at 45,24
  "TgtTT", // y 25
  "gggTT", // y 26 ford landing
  "ggTTT", // y 27 ford landing
  "TTTTT", // y 28
]
const WOODS_TILE: Record<string, Tile> = {
  T: "tree",
  g: "grass",
  t: "tallgrass",
}

const BUSH_SPOTS: Vec[] = [
  { x: 43, y: 4 },
  { x: 45, y: 7 },
  { x: 43, y: 11 },
  { x: 45, y: 16 },
  { x: 43, y: 21 },
  { x: 45, y: 24 },
]
const OLD_OAK: Vec = { x: 44, y: 14 }
const MILL_RUINS: Vec = { x: 44, y: 3 }

const FIELD_SPOTS: Vec[] = [
  { x: 1, y: 25 },
  { x: 4, y: 25 },
  { x: 7, y: 25 },
  { x: 1, y: 27 },
  { x: 4, y: 27 },
  { x: 7, y: 27 },
]

const LOTS: { id: string; pos: Vec; size: Vec }[] = [
  { id: "lot_a", pos: { x: 17, y: 21 }, size: { x: 4, y: 3 } },
  { id: "lot_b", pos: { x: 22, y: 21 }, size: { x: 4, y: 3 } },
]

export function buildTownMap(): TownMap {
  const tiles: Tile[] = new Array(TOWN_W * TOWN_H).fill("grass")
  const set = (x: number, y: number, t: Tile) => {
    if (inTown(x, y)) tiles[townIdx(x, y)] = t
  }
  const rect = (x0: number, y0: number, x1: number, y1: number, t: Tile) => {
    for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) set(x, y, t)
  }

  // Tree border, with the county road gap at (24, 29).
  rect(0, 0, TOWN_W - 1, 0, "tree")
  rect(0, TOWN_H - 1, TOWN_W - 1, TOWN_H - 1, "tree")
  rect(0, 0, 0, TOWN_H - 1, "tree")
  rect(TOWN_W - 1, 0, TOWN_W - 1, TOWN_H - 1, "tree")
  const roadExit: Vec = { x: 24, y: 29 }

  // East woods, 42,1 to 46,28.
  WOODS.forEach((row, dy) => {
    for (let dx = 0; dx < row.length; dx++) {
      set(WOODS_X0 + dx, WOODS_Y0 + dy, WOODS_TILE[row[dx]])
    }
  })

  // Willow Creek, 40,1 to 41,28, with the ford and the footbridge lot.
  rect(40, 1, 41, 28, "water")
  rect(40, 26, 41, 27, "ford")
  rect(40, 13, 41, 14, "bridge_lot")
  const bridgeLot: Vec[] = [
    { x: 40, y: 13 },
    { x: 41, y: 13 },
    { x: 40, y: 14 },
    { x: 41, y: 14 },
  ]

  // Lanes.
  rect(1, 5, 39, 5, "path") // Elm Lane
  rect(1, 13, 39, 14, "path") // Main Street
  rect(1, 20, 39, 20, "path") // Market Lane
  rect(1, 24, 39, 24, "path") // Farm Lane
  rect(13, 5, 13, 20, "path") // vertical lanes
  rect(22, 5, 22, 13, "path")
  rect(28, 20, 28, 24, "path")
  rect(39, 5, 39, 27, "path")
  rect(24, 24, 24, 29, "path") // county road, off the map at (24, 29)
  rect(11, 24, 11, 28, "path") // farm paths
  rect(11, 28, 16, 28, "path")

  // Plaza, 22,15 to 31,19. The bandstand lot (29,15 to 30,16) is Slice B,
  // so it stays plaza path for now.
  rect(22, 15, 31, 19, "path")
  const fountain: Vec = { x: 26, y: 17 }
  const board: Vec = { x: 23, y: 15 }
  set(fountain.x, fountain.y, "fountain")
  set(board.x, board.y, "board")

  // Schoolyard, 23,6 to 28,7: grass, fenced along its south edge (toward
  // the school's back wall) and its east edge. It opens onto Elm Lane and
  // the x = 22 lane.
  rect(23, 6, 28, 7, "grass")
  rect(23, 8, 29, 8, "fence")
  rect(29, 6, 29, 7, "fence")

  // Graveyard, 35,8 to 38,12: open ground. GRAVE_SLOTS become "grave"
  // tiles only when someone is buried.
  rect(35, 8, 38, 12, "grass")

  // Buildings and homes: footprint tiles plus one door on the bottom row.
  const specs = [...WORK_BUILDINGS, ...HOME_SPECS]
  const buildings: Building[] = specs.map((s) => {
    const [x0, y0, x1, y1] = s.rect
    const home = s.kind === "home" || s.kind === "farmhouse"
    rect(x0, y0, x1, y1, home ? "house" : "building")
    set(s.door.x, s.door.y, "door")
    return {
      id: s.id,
      kind: s.kind,
      name: s.name,
      pos: { x: x0, y: y0 },
      size: { x: x1 - x0 + 1, y: y1 - y0 + 1 },
      door: { ...s.door },
      hours: s.hours ? { ...s.hours, days: [...s.hours.days] } : null,
      residents: [...s.residents],
    }
  })

  // Empty lots.
  for (const lot of LOTS) {
    rect(
      lot.pos.x,
      lot.pos.y,
      lot.pos.x + lot.size.x - 1,
      lot.pos.y + lot.size.y - 1,
      "lot"
    )
  }

  // Farm: six 3x2 field plots.
  for (const f of FIELD_SPOTS) rect(f.x, f.y, f.x + 2, f.y + 1, "field")

  // Pond, 26,25 to 37,28: sand shore, water 27,26 to 36,28, dock at (30,26).
  rect(26, 25, 37, 28, "sand")
  rect(27, 26, 36, 28, "water")
  const dock: Vec = { x: 30, y: 26 }
  set(dock.x, dock.y, "dock")

  // East woods features.
  const bushes: Bush[] = BUSH_SPOTS.map((pos, i) => {
    set(pos.x, pos.y, "bush")
    return { id: `bush_${i + 1}`, pos: { ...pos }, berries: 3, nextRegrow: 0 }
  })
  set(OLD_OAK.x, OLD_OAK.y, "tree")
  set(MILL_RUINS.x, MILL_RUINS.y, "rock")

  const pois: Poi[] = [
    { id: "old_oak", name: "the old oak", stand: { x: 43, y: 14 } },
    { id: "mill_ruins", name: "the old mill ruins", stand: { x: 45, y: 3 } },
    { id: "ford", name: "the creek ford", stand: { x: 39, y: 26 } },
    { id: "dock", name: "the dock", stand: { ...dock } },
    { id: "graveyard", name: "the graveyard", stand: { x: 36, y: 12 } },
    { id: "schoolyard", name: "the schoolyard", stand: { x: 25, y: 6 } },
    {
      id: "woods_edge",
      name: "the edge of the east woods",
      stand: { x: 43, y: 26 },
    },
  ]

  // Landmarks. Buildings come first so they win distance ties. A building
  // landmark sits just outside its door. Long lanes and the woods use
  // several centers under one name.
  const along = (name: string, points: [number, number][], radius: number) =>
    points.map(([x, y]): Landmark => ({ name, center: { x, y }, radius }))
  const landmarks: Landmark[] = [
    ...buildings.map((b): Landmark => {
      const home = b.kind === "home" || b.kind === "farmhouse"
      const lm: Landmark = {
        name: b.name,
        center: { x: b.door.x, y: b.door.y + 1 },
        radius: home ? 2 : 3,
      }
      if (home) lm.houseId = b.id
      return lm
    }),
    { name: "the old oak", center: { ...OLD_OAK }, radius: 2 },
    { name: "the old mill ruins", center: { ...MILL_RUINS }, radius: 2 },
    { name: "the creek ford", center: { x: 40, y: 26 }, radius: 2 },
    { name: "the dock", center: { ...dock }, radius: 1 },
    { name: "the plaza", center: { x: 26, y: 17 }, radius: 6 },
    { name: "the schoolyard", center: { x: 25, y: 6 }, radius: 4 },
    { name: "the graveyard", center: { x: 36, y: 10 }, radius: 3 },
    { name: "the farm", center: { x: 5, y: 26 }, radius: 5 },
    { name: "the pond", center: { x: 31, y: 27 }, radius: 6 },
    { name: "the county road", center: { x: 24, y: 27 }, radius: 3 },
    ...along(
      "Elm Lane",
      [
        [5, 5],
        [15, 5],
        [25, 5],
        [35, 5],
      ],
      5
    ),
    ...along(
      "Main Street",
      [
        [5, 13],
        [15, 13],
        [25, 13],
        [35, 13],
      ],
      5
    ),
    ...along(
      "Market Lane",
      [
        [5, 20],
        [15, 20],
        [25, 20],
        [35, 20],
      ],
      5
    ),
    ...along(
      "Farm Lane",
      [
        [5, 24],
        [15, 24],
        [25, 24],
        [35, 24],
      ],
      5
    ),
    ...along(
      "the east woods",
      [
        [44, 3],
        [44, 9],
        [44, 15],
        [44, 21],
        [44, 27],
      ],
      5
    ),
    ...along(
      "Willow Creek",
      [
        [40, 4],
        [40, 10],
        [40, 17],
        [40, 22],
      ],
      4
    ),
  ]

  return {
    tiles,
    buildings,
    bushes,
    pois,
    landmarks,
    fountain,
    board,
    dock,
    bridgeLot,
    fields: FIELD_SPOTS.map((f) => ({ ...f })),
    roadExit,
    lots: LOTS.map((l) => ({
      id: l.id,
      pos: { ...l.pos },
      size: { ...l.size },
    })),
  }
}
