// Procedural 16px pixel art in the spirit of the Game Boy Color era.
// Everything is drawn with fillRect on integer world pixels, then scaled.

import type { Building, Dir, Persona } from "@/lib/sim/types"

type Ctx = CanvasRenderingContext2D
type PixelMap = readonly string[]

export const PAL = {
  grass: "#8fd06a",
  grassDark: "#6fb453",
  grassLight: "#b0e28a",
  tall: "#4f9e45",
  tallDark: "#2f7432",
  tallLight: "#76c25e",
  path: "#e6d09a",
  pathDark: "#cdb57c",
  pathLight: "#f2e2b4",
  sand: "#f1e3ae",
  sandDark: "#dccb8e",
  water: "#5aa8ec",
  waterDark: "#3c86d0",
  waterLight: "#a9dcff",
  outline: "#1f2430",
  treeOutline: "#1b4a26",
  trunk: "#8a5a30",
  roof: "#d24f45",
  roofDark: "#a3342e",
  roofLight: "#ec7a66",
  wall: "#f4ead2",
  wallDark: "#d6c8a4",
  wood: "#8a5a30",
  woodDark: "#5e3a1c",
  glass: "#8fcdf2",
  glassLit: "#ffd866",
  stone: "#b4b4bc",
  stoneDark: "#7a7a86",
  berry: "#e2383c",
  berryLight: "#ff9a9a",
  berryDark: "#a82230",
  white: "#ffffff",
  // Granary thatch and planks: warm yellows and browns, kept apart from the red house roofs.
  thatch: "#e8c25a",
  thatchLight: "#f6de8e",
  thatchShade: "#c49232",
  thatchDark: "#a8791e",
  thatchDarker: "#8c6218",
  thatchDeep: "#7a5418",
  plank: "#c48a4e",
  plankLight: "#dcaa6c",
  plankDark: "#9a6434",
  straw: "#e8c47e",
  // Progress bars: dark track, bright fill.
  barTrack: "#3b4252",
  barFill: "#58d858",
  barLight: "#a8f0a0",
  // Market stall awning: teal and cream stripes, kept apart from the red roofs and the thatch.
  awning: "#38b3a4",
  awningLight: "#7fdccb",
  awningDark: "#23847a",
  cream: "#f6e8bc",
  creamLight: "#fff8e2",
  creamDark: "#d9c48e",
  stallBack: "#4a2e18",
  stallBackDark: "#382210",
  // Coins: gold for a fair price, hot orange and red once the price is gouging.
  coin: "#ffd866",
  coinShine: "#fff6d0",
  coinEdge: "#e8a830",
  coinDark: "#c8841c",
  coinHot: "#ff9a2e",
  coinHotShine: "#fff0a0",
  coinHotEdge: "#ff5a1e",
  coinHotDark: "#b8200e",
  // Fernhollow roofs: one colour family per building kind so the town reads at a glance.
  // Homes keep the red roof above; nothing else in town uses it.
  farmRoof: "#8c4a30",
  farmRoofLight: "#b8764e",
  farmRoofDark: "#5e2e1a",
  clinicRoof: "#5ec49c",
  clinicRoofLight: "#98e2c2",
  clinicRoofDark: "#379474",
  policeRoof: "#4a6ad8",
  policeRoofLight: "#86a2f2",
  policeRoofDark: "#2f47a6",
  hallRoof: "#6f7a96",
  hallRoofLight: "#a2abc2",
  hallRoofDark: "#4a536c",
  schoolRoof: "#e8803a",
  schoolRoofLight: "#f8b072",
  schoolRoofDark: "#b0561e",
  chapelRoof: "#8e64c8",
  chapelRoofLight: "#b996e6",
  chapelRoofDark: "#63409a",
  storeRoof: "#94ac3e",
  storeRoofLight: "#c2d66e",
  storeRoofDark: "#667c22",
  dinerRoof: "#e46e9e",
  dinerRoofLight: "#f6a6c6",
  dinerRoofDark: "#ae4478",
  innRoof: "#3e8a50",
  innRoofLight: "#70b87c",
  innRoofDark: "#256034",
  crierRoof: "#545a68",
  crierRoofLight: "#828898",
  crierRoofDark: "#373b47",
  tinRoof: "#a4acb8",
  tinRoofLight: "#d2d8e0",
  tinRoofDark: "#727a88",
  // Walls and trim for the civic buildings.
  clinicWall: "#eef2f6",
  clinicWallDark: "#c4ccd8",
  policeWall: "#dde2ec",
  policeWallDark: "#a8b0c4",
  navy: "#243a8c",
  hallStone: "#e6dfcb",
  hallStoneLight: "#fbf7ea",
  hallStoneDark: "#bdb298",
  chapelStone: "#c6c6d0",
  chapelStoneLight: "#e4e4ec",
  paper: "#f4f2ea",
  paperDark: "#b8b4a8",
  ink: "#2a2e3a",
  cross: "#e8384c",
  crossDark: "#b0202e",
  crossLight: "#ff8a8a",
  shutter: "#4f9e45",
  shutterDark: "#2f7432",
  metal: "#3b4252",
  steel: "#9aa4b4",
  steelLight: "#d4dae4",
  steelDark: "#5e6878",
  flame: "#fff6d0",
  // Tilled soil for the farm fields, and the shallow water of the ford.
  soil: "#a8723e",
  soilLight: "#c89458",
  soilDark: "#7a4e26",
  crop: "#58b048",
  cropLight: "#9ad866",
  cropDark: "#2f7a32",
  shallow: "#86c8f2",
  shallowDark: "#5aa8ec",
} as const

/** Paint a character map. `flip` mirrors horizontally. "." is transparent. */
export function paint(ctx: Ctx, map: PixelMap, colors: Record<string, string>, x: number, y: number, flip = false) {
  const w = map[0].length
  for (let r = 0; r < map.length; r++) {
    const row = map[r]
    for (let c = 0; c < row.length; c++) {
      const ch = row[c]
      if (ch === ".") continue
      const color = colors[ch]
      if (!color) continue
      ctx.fillStyle = color
      ctx.fillRect(x + (flip ? w - 1 - c : c), y + r, 1, 1)
    }
  }
}

// Stable per-tile noise so decorations do not flicker between renders.
export function hash(x: number, y: number, salt = 0): number {
  let h = (x * 374761393 + y * 668265263 + salt * 2147483647) | 0
  h = Math.imul(h ^ (h >>> 13), 1274126177)
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296
}

// ---------------------------------------------------------------------------
// Terrain

export function drawGrass(ctx: Ctx, px: number, py: number, tx: number, ty: number) {
  ctx.fillStyle = PAL.grass
  ctx.fillRect(px, py, 16, 16)
  for (let i = 0; i < 3; i++) {
    const r = hash(tx, ty, i)
    if (r > 0.55) continue
    const gx = px + 2 + Math.floor(hash(tx, ty, i + 10) * 11)
    const gy = py + 3 + Math.floor(hash(tx, ty, i + 20) * 10)
    ctx.fillStyle = PAL.grassDark
    ctx.fillRect(gx, gy, 1, 2)
    ctx.fillRect(gx + 2, gy, 1, 2)
    ctx.fillRect(gx + 1, gy + 1, 1, 1)
  }
  if (hash(tx, ty, 5) > 0.7) {
    ctx.fillStyle = PAL.grassLight
    ctx.fillRect(px + Math.floor(hash(tx, ty, 6) * 14), py + Math.floor(hash(tx, ty, 7) * 14), 1, 1)
  }
}

export function drawTallGrass(ctx: Ctx, px: number, py: number) {
  ctx.fillStyle = PAL.tall
  ctx.fillRect(px, py, 16, 16)
  for (let row = 0; row < 2; row++) {
    for (let col = 0; col < 4; col++) {
      const bx = px + col * 4 + (row % 2) * 2
      const by = py + row * 8 + 1
      ctx.fillStyle = PAL.tallDark
      ctx.fillRect(bx, by + 2, 1, 5)
      ctx.fillRect(bx + 2, by + 2, 1, 5)
      ctx.fillRect(bx + 1, by + 4, 1, 3)
      ctx.fillStyle = PAL.tallLight
      ctx.fillRect(bx, by + 1, 1, 1)
      ctx.fillRect(bx + 2, by + 1, 1, 1)
      ctx.fillRect(bx + 1, by + 3, 1, 1)
    }
  }
}

const FLOWER_COLORS = ["#f25f6f", "#ffe066", "#ffffff", "#f7a8d8"]

export function drawFlowers(ctx: Ctx, px: number, py: number, tx: number, ty: number) {
  drawGrass(ctx, px, py, tx, ty)
  const spots: [number, number][] = [
    [3, 3],
    [10, 5],
    [5, 11],
    [12, 12],
  ]
  spots.forEach(([fx, fy], i) => {
    if (hash(tx, ty, 30 + i) > 0.75) return
    const color = FLOWER_COLORS[Math.floor(hash(tx, ty, 40 + i) * FLOWER_COLORS.length)]
    ctx.fillStyle = color
    ctx.fillRect(px + fx, py + fy - 1, 1, 1)
    ctx.fillRect(px + fx - 1, py + fy, 1, 1)
    ctx.fillRect(px + fx + 1, py + fy, 1, 1)
    ctx.fillRect(px + fx, py + fy + 1, 1, 1)
    ctx.fillStyle = "#f5a623"
    ctx.fillRect(px + fx, py + fy, 1, 1)
  })
}

export function drawPath(ctx: Ctx, px: number, py: number, tx: number, ty: number) {
  ctx.fillStyle = PAL.path
  ctx.fillRect(px, py, 16, 16)
  for (let i = 0; i < 5; i++) {
    const sx = px + Math.floor(hash(tx, ty, 50 + i) * 15)
    const sy = py + Math.floor(hash(tx, ty, 60 + i) * 15)
    ctx.fillStyle = i % 2 ? PAL.pathDark : PAL.pathLight
    ctx.fillRect(sx, sy, 1, 1)
  }
}

export function drawSand(ctx: Ctx, px: number, py: number, tx: number, ty: number) {
  ctx.fillStyle = PAL.sand
  ctx.fillRect(px, py, 16, 16)
  for (let i = 0; i < 4; i++) {
    ctx.fillStyle = PAL.sandDark
    ctx.fillRect(px + Math.floor(hash(tx, ty, 70 + i) * 15), py + Math.floor(hash(tx, ty, 80 + i) * 15), 1, 1)
  }
}

/** Water is drawn every frame so the ripples move. */
export function drawWater(ctx: Ctx, px: number, py: number, tx: number, ty: number, t: number) {
  ctx.fillStyle = PAL.water
  ctx.fillRect(px, py, 16, 16)
  ctx.fillStyle = PAL.waterDark
  ctx.fillRect(px, py + 15, 16, 1)
  const phase = Math.floor(t / 400)
  for (let i = 0; i < 2; i++) {
    const wy = py + 4 + i * 7
    const wx = px + ((Math.floor(hash(tx, ty, 90 + i) * 12) + phase + i * 3) % 12)
    ctx.fillStyle = PAL.waterLight
    ctx.fillRect(wx, wy, 3, 1)
    ctx.fillRect(wx + 1, wy - 1, 1, 1)
  }
}

const TREE: PixelMap = [
  "......kkkk......",
  "....kkggggkk....",
  "...kggllggggk...",
  "..kgllllggggdk..",
  ".kggllggggggddk.",
  ".kgggggggggggdk.",
  "kggggggglgggddk.",
  "kgglgggggggdddk.",
  ".kgggggggggdddk.",
  ".kdgggggggdddk..",
  "..kddgggdddddk..",
  "...kkdddddkkk...",
  "......kttk......",
  "......kttk......",
  ".....kkttkk.....",
  "................",
]

export function drawTree(ctx: Ctx, px: number, py: number, tx: number, ty: number) {
  drawGrass(ctx, px, py, tx, ty)
  ctx.fillStyle = "rgba(20,60,30,0.25)"
  ctx.fillRect(px + 3, py + 14, 10, 2)
  paint(ctx, TREE, { k: PAL.treeOutline, g: "#48a048", l: "#78c868", d: "#2e7a38", t: PAL.trunk }, px, py)
}

const BUSH: PixelMap = [
  "................",
  "................",
  "................",
  ".....kkkkkk.....",
  "...kkggggggkk...",
  "..kgglgggggglk..",
  ".kggggggggggggk.",
  ".kglggggggggglk.",
  ".kggggggggggggk.",
  ".kdgggggggggggk.",
  "..kddgggggggdk..",
  "...kkddddddkk...",
  ".....kkkkkk.....",
  "................",
  "................",
  "................",
]
const BERRY_SPOTS: [number, number][] = [
  [5, 6],
  [9, 5],
  [11, 8],
  [6, 9],
]

export function drawBush(ctx: Ctx, px: number, py: number, berries: number) {
  ctx.fillStyle = "rgba(20,60,30,0.25)"
  ctx.fillRect(px + 3, py + 12, 10, 2)
  paint(ctx, BUSH, { k: PAL.treeOutline, g: "#3f9a45", l: "#6cc262", d: "#2a7034" }, px, py)
  for (let i = 0; i < Math.min(berries, BERRY_SPOTS.length); i++) {
    const [bx, by] = BERRY_SPOTS[i]
    ctx.fillStyle = PAL.berry
    ctx.fillRect(px + bx, py + by, 2, 2)
    ctx.fillStyle = PAL.berryLight
    ctx.fillRect(px + bx, py + by, 1, 1)
  }
}

export function drawRock(ctx: Ctx, px: number, py: number) {
  ctx.fillStyle = PAL.outline
  ctx.fillRect(px + 3, py + 6, 10, 8)
  ctx.fillRect(px + 4, py + 5, 8, 10)
  ctx.fillStyle = PAL.stone
  ctx.fillRect(px + 4, py + 6, 8, 8)
  ctx.fillStyle = PAL.stoneDark
  ctx.fillRect(px + 4, py + 11, 8, 3)
  ctx.fillStyle = PAL.white
  ctx.fillRect(px + 5, py + 7, 2, 1)
}

export function drawSign(ctx: Ctx, px: number, py: number) {
  ctx.fillStyle = PAL.woodDark
  ctx.fillRect(px + 7, py + 8, 2, 7)
  ctx.fillRect(px + 2, py + 2, 12, 8)
  ctx.fillStyle = "#c89858"
  ctx.fillRect(px + 3, py + 3, 10, 6)
  ctx.fillStyle = PAL.woodDark
  ctx.fillRect(px + 5, py + 5, 6, 1)
  ctx.fillRect(px + 5, py + 7, 4, 1)
}

export function drawWell(ctx: Ctx, px: number, py: number) {
  ctx.fillStyle = PAL.woodDark
  ctx.fillRect(px + 2, py + 1, 12, 2)
  ctx.fillRect(px + 3, py + 3, 1, 6)
  ctx.fillRect(px + 12, py + 3, 1, 6)
  ctx.fillStyle = PAL.outline
  ctx.fillRect(px + 1, py + 7, 14, 8)
  ctx.fillStyle = PAL.stone
  ctx.fillRect(px + 2, py + 8, 12, 6)
  ctx.fillStyle = "#2a3a58"
  ctx.fillRect(px + 4, py + 8, 8, 3)
  ctx.fillStyle = PAL.stoneDark
  ctx.fillRect(px + 2, py + 12, 12, 2)
  ctx.fillRect(px + 6, py + 12, 1, 2)
}

/** Campfire flames flicker, so this is drawn every frame. */
export function drawCampfire(ctx: Ctx, px: number, py: number, t: number) {
  ctx.fillStyle = PAL.stoneDark
  for (const [sx, sy] of [
    [2, 11],
    [5, 13],
    [9, 13],
    [12, 11],
    [4, 9],
    [11, 9],
  ]) {
    ctx.fillRect(px + sx, py + sy, 3, 2)
  }
  ctx.fillStyle = PAL.woodDark
  ctx.fillRect(px + 4, py + 11, 8, 2)
  ctx.fillStyle = PAL.wood
  ctx.fillRect(px + 5, py + 10, 6, 1)
  const f = Math.floor(t / 140) % 3
  ctx.fillStyle = "#e0482c"
  ctx.fillRect(px + 5, py + 6 + (f === 1 ? 1 : 0), 6, 5)
  ctx.fillStyle = "#f8902c"
  ctx.fillRect(px + 6, py + 4 + (f === 2 ? 1 : 0), 4, 6)
  ctx.fillRect(px + 7, py + 3, 2, 1)
  ctx.fillStyle = "#ffe066"
  ctx.fillRect(px + 7, py + 6 + f % 2, 2, 4)
}

export function drawHouse(ctx: Ctx, px: number, py: number, lit: boolean, night: number) {
  const W = 64
  // Roof.
  ctx.fillStyle = PAL.outline
  ctx.fillRect(px, py + 1, W, 25)
  ctx.fillStyle = PAL.roof
  ctx.fillRect(px + 1, py + 2, W - 2, 23)
  ctx.fillStyle = PAL.roofLight
  ctx.fillRect(px + 1, py + 2, W - 2, 2)
  ctx.fillStyle = PAL.roofDark
  for (let ry = py + 7; ry < py + 25; ry += 5) ctx.fillRect(px + 1, ry, W - 2, 1)
  for (let ry = py + 7, row = 0; ry < py + 25; ry += 5, row++) {
    for (let rx = px + 4 + (row % 2) * 4; rx < px + W - 2; rx += 8) ctx.fillRect(rx, ry - 4, 1, 4)
  }
  ctx.fillStyle = PAL.roofDark
  ctx.fillRect(px + 1, py + 23, W - 2, 2)
  // Chimney.
  ctx.fillStyle = PAL.outline
  ctx.fillRect(px + 45, py - 4, 8, 9)
  ctx.fillStyle = PAL.stone
  ctx.fillRect(px + 46, py - 3, 6, 7)
  // Walls.
  ctx.fillStyle = PAL.outline
  ctx.fillRect(px + 2, py + 25, W - 4, 23)
  ctx.fillStyle = PAL.wall
  ctx.fillRect(px + 3, py + 25, W - 6, 22)
  ctx.fillStyle = PAL.wallDark
  ctx.fillRect(px + 3, py + 44, W - 6, 3)
  // Door (second column of the footprint).
  ctx.fillStyle = PAL.woodDark
  ctx.fillRect(px + 18, py + 30, 12, 18)
  ctx.fillStyle = PAL.wood
  ctx.fillRect(px + 19, py + 31, 10, 17)
  ctx.fillStyle = PAL.glassLit
  ctx.fillRect(px + 26, py + 39, 2, 2)
  // Window.
  ctx.fillStyle = PAL.woodDark
  ctx.fillRect(px + 38, py + 29, 16, 12)
  const glow = lit || night > 0.2
  ctx.fillStyle = glow ? PAL.glassLit : PAL.glass
  ctx.fillRect(px + 39, py + 30, 14, 10)
  ctx.fillStyle = PAL.woodDark
  ctx.fillRect(px + 45, py + 30, 2, 10)
  ctx.fillRect(px + 39, py + 34, 14, 2)
  if (!glow) {
    ctx.fillStyle = PAL.white
    ctx.fillRect(px + 40, py + 31, 2, 1)
  }
}

// ---------------------------------------------------------------------------
// Village granary (3x2 tiles), its construction site, the communal store and carried berries

function clamp01(v: number): number {
  return Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0
}

// Survey stake with a red ribbon; the bottom row is the foot.
const STAKE: PixelMap = [".k.", "krk", "kwk", "kwk", "kdk", "kdk", ".k."]

// Round wooden plaque with a berry, hung in the granary gable.
const GRANARY_EMBLEM: PixelMap = [
  ".kkkkkkkk.",
  "kccccccgck",
  "kcccccgcck",
  "kcclrrrcck",
  "kcrrrrrrck",
  "kcrrrrrrck",
  "kccrrrrcck",
  ".kkkkkkkk.",
]

const GRANARY_W = 48

/** Rows the gable roof drops at column x: the peak faces the viewer, stepping 3 px per row. */
function gableDrop(x: number): number {
  return Math.floor(Math.abs(x - (GRANARY_W - 1) / 2) / 3)
}

function drawPlanks(ctx: Ctx, x: number, y: number, count: number) {
  // Bottom plank first so each board above shares the outline below it.
  for (let k = 0; k < count; k++) {
    const bx = x + (k % 2)
    const by = y - k * 2
    ctx.fillStyle = PAL.outline
    ctx.fillRect(bx, by, 14, 3)
    ctx.fillStyle = PAL.plankLight
    ctx.fillRect(bx + 1, by + 1, 12, 1)
    ctx.fillStyle = PAL.plankDark
    ctx.fillRect(bx + 12, by + 1, 1, 1)
  }
}

function drawProgressBar(ctx: Ctx, x: number, y: number, w: number, progress: number) {
  ctx.fillStyle = PAL.outline
  ctx.fillRect(x, y, w, 4)
  ctx.fillStyle = PAL.barTrack
  ctx.fillRect(x + 1, y + 1, w - 2, 2)
  const fill = Math.round(clamp01(progress) * (w - 2))
  if (fill <= 0) return
  ctx.fillStyle = PAL.barFill
  ctx.fillRect(x + 1, y + 1, fill, 2)
  ctx.fillStyle = PAL.barLight
  ctx.fillRect(x + 1, y + 1, fill, 1)
}

/**
 * A 48x32 granary under construction. `progress` (0..1) raises the timber frame: posts first,
 * then the top plate, then the rafters up to the ridge. At 0 it is a staked plot with planks.
 */
export function drawGranarySite(ctx: Ctx, px: number, py: number, progress: number) {
  const p = clamp01(progress)
  // Trampled dirt plot with a darker rim.
  ctx.fillStyle = PAL.pathDark
  ctx.fillRect(px + 3, py + 8, 42, 18)
  ctx.fillRect(px + 4, py + 7, 40, 20)
  ctx.fillStyle = PAL.path
  ctx.fillRect(px + 4, py + 8, 40, 18)
  for (let i = 0; i < 10; i++) {
    ctx.fillStyle = i % 2 ? PAL.pathLight : PAL.pathDark
    ctx.fillRect(px + 5 + Math.floor(hash(i, 3, 17) * 37), py + 9 + Math.floor(hash(i, 5, 19) * 15), 1, 1)
  }
  // Survey string, dotted between the corner stakes.
  ctx.fillStyle = PAL.white
  for (let x = 5; x <= 42; x += 2) {
    ctx.fillRect(px + x, py + 7, 1, 1)
    ctx.fillRect(px + x, py + 26, 1, 1)
  }
  for (let y = 9; y <= 24; y += 2) {
    ctx.fillRect(px + 3, py + y, 1, 1)
    ctx.fillRect(px + 44, py + y, 1, 1)
  }
  const stakeColors = { k: PAL.outline, r: "#e8384c", w: PAL.plankLight, d: PAL.wood }
  paint(ctx, STAKE, stakeColors, px + 2, py + 1)
  paint(ctx, STAKE, stakeColors, px + 43, py + 1)

  // Timber frame. Posts rise over the first 60%, rafters close the gable over the rest.
  const wallP = clamp01(p / 0.6)
  const roofP = clamp01((p - 0.6) / 0.4)
  const postH = Math.round(wallP * 14)
  const timber = (x: number, y: number, w: number, h: number, vertical: boolean) => {
    ctx.fillStyle = PAL.woodDark
    ctx.fillRect(x, y, w, h)
    ctx.fillStyle = PAL.wood
    if (vertical) ctx.fillRect(x, y, 1, h)
    else ctx.fillRect(x, y, w, 1)
  }
  if (p > 0) timber(px + 5, py + 23, 38, 2, false)
  if (postH > 0) {
    for (const x of [6, 16, 30, 40]) timber(px + x, py + 23 - postH, 2, postH, true)
  }
  if (wallP >= 1) {
    timber(px + 5, py + 8, 38, 2, false)
    // Diagonal braces across the outer bays.
    ctx.fillStyle = PAL.woodDark
    for (let i = 0; i < 13; i++) {
      const dx = Math.floor((i * 7) / 12)
      ctx.fillRect(px + 8 + dx, py + 22 - i, 1, 1)
      ctx.fillRect(px + 39 - dx, py + 22 - i, 1, 1)
    }
  }
  const rafterLen = Math.round(roofP * 20)
  for (let i = 0; i < rafterLen; i++) {
    const y = py + 8 - Math.floor((i * 7) / 19)
    for (const x of [px + 4 + i, px + 43 - i]) {
      ctx.fillStyle = PAL.wood
      ctx.fillRect(x, y - 1, 1, 1)
      ctx.fillStyle = PAL.woodDark
      ctx.fillRect(x, y, 1, 1)
    }
  }
  if (roofP >= 1) timber(px + 23, py + 2, 2, 6, true)

  // Ladder against the frame once there is something to climb.
  if (postH >= 6) {
    const top = Math.max(8, 22 - postH)
    ctx.fillStyle = PAL.woodDark
    ctx.fillRect(px + 25, py + top, 1, 27 - top)
    ctx.fillRect(px + 29, py + top, 1, 27 - top)
    ctx.fillStyle = PAL.plankLight
    for (let y = top + 1; y < 26; y += 3) ctx.fillRect(px + 26, py + y, 3, 1)
  }

  // Stock of planks, used up as the frame goes up; front stakes stand in front of everything.
  drawPlanks(ctx, px + 7, py + 23, Math.max(1, 3 - Math.floor(p * 3)))
  paint(ctx, STAKE, stakeColors, px + 2, py + 20)
  paint(ctx, STAKE, stakeColors, px + 43, py + 20)

  drawProgressBar(ctx, px + 4, py + 28, 40, p)
}

/** The finished 48x32 granary: thatched gable roof, plank walls on a stone footing, double door. */
export function drawGranary(ctx: Ctx, px: number, py: number) {
  // Front wall.
  ctx.fillStyle = PAL.outline
  ctx.fillRect(px + 2, py + 12, 44, 20)
  ctx.fillStyle = PAL.plank
  ctx.fillRect(px + 3, py + 12, 42, 16)
  ctx.fillStyle = PAL.plankDark
  for (const x of [5, 9, 13, 34, 38, 42]) ctx.fillRect(px + x, py + 12, 1, 16)
  ctx.fillStyle = PAL.plankLight
  for (const x of [6, 10, 14, 35, 39, 43]) ctx.fillRect(px + x, py + 12, 1, 16)
  // Stone footing.
  ctx.fillStyle = PAL.stone
  ctx.fillRect(px + 3, py + 28, 42, 3)
  ctx.fillStyle = PAL.stoneDark
  ctx.fillRect(px + 3, py + 30, 42, 1)
  for (const x of [8, 14, 33, 39]) ctx.fillRect(px + x, py + 28, 1, 2)
  ctx.fillStyle = PAL.white
  for (const x of [4, 10, 35, 41]) ctx.fillRect(px + x, py + 28, 2, 1)

  // Thatched gable roof, lit from the left, courses running parallel to the eave.
  for (let x = 0; x < GRANARY_W; x++) {
    const top = gableDrop(x)
    const edge = 12 + top
    if (x >= 3 && x <= 44) {
      ctx.fillStyle = PAL.plankDark
      ctx.fillRect(px + x, py + edge + 1, 1, 1)
    }
    ctx.fillStyle = PAL.outline
    ctx.fillRect(px + x, py + top, 1, edge - top + 1)
    if (x === 0 || x === GRANARY_W - 1) continue
    const lit = x < GRANARY_W / 2
    ctx.fillStyle = lit ? PAL.thatch : PAL.thatchShade
    ctx.fillRect(px + x, py + top + 1, 1, edge - top - 2)
    for (let y = edge - 4; y > top; y -= 3) {
      ctx.fillStyle = lit ? PAL.thatchDark : PAL.thatchDarker
      ctx.fillRect(px + x, py + y, 1, 1)
      if ((x + y) % 4 === 0) {
        ctx.fillStyle = lit ? PAL.thatchLight : PAL.thatch
        ctx.fillRect(px + x, py + y - 1, 1, 1)
      }
    }
    ctx.fillStyle = PAL.thatchDeep
    ctx.fillRect(px + x, py + edge - 1, 1, 1)
    if (x % 2 === 0) {
      // Ragged straw fringe hanging over the wall.
      ctx.fillStyle = PAL.thatchDark
      ctx.fillRect(px + x, py + edge, 1, 1)
      ctx.fillStyle = PAL.outline
      ctx.fillRect(px + x, py + edge + 1, 1, 1)
    }
  }
  // Ridge cap with straw bindings.
  ctx.fillStyle = PAL.thatchDeep
  ctx.fillRect(px + 23, py + 1, 2, 10)
  ctx.fillStyle = PAL.thatchLight
  for (let y = 2; y < 11; y += 3) ctx.fillRect(px + 23, py + y, 1, 1)

  // Berry plaque in the gable.
  paint(
    ctx,
    GRANARY_EMBLEM,
    { k: PAL.woodDark, c: PAL.wall, r: PAL.berry, l: PAL.berryLight, g: "#3f9a45" },
    px + 19,
    py + 11,
  )

  // Plank double door with a latch bar across the seam.
  ctx.fillStyle = PAL.woodDark
  ctx.fillRect(px + 18, py + 20, 12, 12)
  ctx.fillStyle = PAL.wood
  ctx.fillRect(px + 19, py + 21, 10, 11)
  ctx.fillStyle = PAL.woodDark
  ctx.fillRect(px + 23, py + 21, 2, 11)
  ctx.fillRect(px + 21, py + 21, 1, 11)
  ctx.fillRect(px + 26, py + 21, 1, 11)
  ctx.fillStyle = PAL.plankLight
  ctx.fillRect(px + 19, py + 21, 4, 1)
  ctx.fillRect(px + 25, py + 21, 4, 1)
  ctx.fillRect(px + 20, py + 25, 8, 2)
  ctx.fillStyle = PAL.plankDark
  ctx.fillRect(px + 20, py + 26, 8, 1)
}

// 16x16 woven basket on a little stand; berries heap in the opening.
const BASKET: PixelMap = [
  "................",
  "................",
  "................",
  "................",
  "..kkkkkkkkkkkk..",
  ".kllllllllllllk.",
  "kliiiiiiiiiiiilk",
  "kliiiiiiiiiiiilk",
  "kllllllllllllllk",
  "kddddddddddddddk",
  ".kwwvwwwvwwwvwk.",
  ".kvwwwvwwwvwwwk.",
  ".kwwvwwwvwwwvwk.",
  "..kkkkkkkkkkkk..",
  "..kt........tk..",
  "..kt........tk..",
]
// Fill order: the bottom row fills the opening from the centre out, then the heap grows.
const STORE_SPOTS: readonly (readonly [number, number])[] = [
  [6, 6],
  [8, 6],
  [4, 6],
  [10, 6],
  [2, 6],
  [12, 6],
  [6, 4],
  [8, 4],
  [4, 4],
  [10, 4],
  [6, 2],
  [8, 2],
]

/** Communal village store: shows up to 12 berries; an empty basket at 0. */
export function drawStoreBasket(ctx: Ctx, px: number, py: number, berries: number) {
  ctx.fillStyle = "rgba(0,0,0,0.22)"
  ctx.fillRect(px + 2, py + 14, 12, 2)
  paint(
    ctx,
    BASKET,
    { k: PAL.outline, l: PAL.straw, i: PAL.woodDark, d: PAL.wood, w: PAL.plankLight, v: PAL.plankDark, t: PAL.wood },
    px,
    py,
  )
  const n = Number.isFinite(berries) ? Math.max(0, Math.min(STORE_SPOTS.length, Math.floor(berries))) : 0
  for (let i = 0; i < n; i++) {
    const [bx, by] = STORE_SPOTS[i]
    ctx.fillStyle = PAL.berry
    ctx.fillRect(px + bx, py + by, 2, 2)
    ctx.fillStyle = PAL.berryLight
    ctx.fillRect(px + bx, py + by, 1, 1)
    ctx.fillStyle = PAL.berryDark
    ctx.fillRect(px + bx + 1, py + by + 1, 1, 1)
  }
}

// Berry clusters for 1 to 4 carried berries, inside a 6x6 box (outline included).
const CARRY_LAYOUTS: readonly (readonly (readonly [number, number])[])[] = [
  [],
  [[2, 3]],
  [
    [1, 3],
    [3, 3],
  ],
  [
    [1, 3],
    [3, 3],
    [2, 1],
  ],
  [
    [1, 3],
    [3, 3],
    [1, 1],
    [3, 1],
  ],
]

/** Berries held in a character's hand; (px, py) is the top-left of a 6x6 box. Draws 1 to 4, none at 0. */
export function drawCarry(ctx: Ctx, px: number, py: number, n: number) {
  const count = Number.isFinite(n) ? Math.max(0, Math.min(4, Math.floor(n))) : 0
  const spots = CARRY_LAYOUTS[count]
  // One shared outline so the cluster reads against any shirt colour.
  ctx.fillStyle = PAL.outline
  for (const [bx, by] of spots) {
    ctx.fillRect(px + bx - 1, py + by, 4, 2)
    ctx.fillRect(px + bx, py + by - 1, 2, 4)
  }
  for (const [bx, by] of spots) {
    ctx.fillStyle = PAL.berry
    ctx.fillRect(px + bx, py + by, 2, 2)
    ctx.fillStyle = PAL.berryLight
    ctx.fillRect(px + bx, py + by, 1, 1)
  }
}

// ---------------------------------------------------------------------------
// Market stall (2x1 tiles) and coin piles

// 32x19 stall painted from 4 px above the tile: striped awning with a scalloped valance,
// two posts, a dark plank back wall and a plank counter. Food and coins are drawn on top.
const STALL: PixelMap = [
  ".kkkkkkkkkkkkkkkkkkkkkkkkkkkkkk.",
  "kaaaaaccccaaaaccccaaaaccccaaaaak",
  "ktttttmmmmttttmmmmttttmmmmtttttk",
  "ktttttmmmmttttmmmmttttmmmmtttttk",
  "kTTTTTMMMMTTTTMMMMTTTTMMMMTTTTTk",
  ".kkTTkkMMkkTTkkMMkkTTkkMMkkTTkk.",
  "..kwdkbkkbbkkbbkkbbkkbbkkbkwdk..",
  "..kwdkbbbbbBbbbbbbbbBbbbbbkwdk..",
  "..kwdkbbbbbBbbbbbbbbBbbbbbkwdk..",
  "..kwdkbbbbbBbbbbbbbbBbbbbbkwdk..",
  "..kwdkBBBBBBBBBBBBBBBBBBBBkwdk..",
  ".kkkkkkkkkkkkkkkkkkkkkkkkkkkkkk.",
  ".kppppppppppppppppppppppppppppk.",
  ".kPPPPPPPPPPPPPPPPPPPPPPPPPPPPk.",
  ".kkkkkkkkkkkkkkkkkkkkkkkkkkkkkk.",
  ".kpPPPPqpPPPqpPPPPPqpPPPqpPPPPk.",
  ".kpPPPPqpPPPqpPPPPPqpPPPqpPPPPk.",
  ".kqqqqqqqqqqqqqqqqqqqqqqqqqqqqk.",
  ".kkkkkkkkkkkkkkkkkkkkkkkkkkkkkk.",
]
const STALL_OVERHANG = 4
const STALL_COLORS: Record<string, string> = {
  k: PAL.outline,
  a: PAL.awningLight,
  t: PAL.awning,
  T: PAL.awningDark,
  c: PAL.creamLight,
  m: PAL.cream,
  M: PAL.creamDark,
  w: PAL.wood,
  d: PAL.woodDark,
  b: PAL.stallBack,
  B: PAL.stallBackDark,
  p: PAL.plankLight,
  P: PAL.plank,
  q: PAL.plankDark,
}

// Food heap on the counter, a 4-3-1 pyramid; fills the bottom row from the centre out.
const STALL_FOOD_SPOTS: readonly (readonly [number, number])[] = [
  [8, 6],
  [10, 6],
  [6, 6],
  [12, 6],
  [9, 4],
  [7, 4],
  [11, 4],
  [9, 2],
]

// Small upright coin with a slot, used for fair prices on the counter. The rim is dark gold so the
// coin stays round against the dark back wall; the bottom row is a contact shadow on the counter.
const COIN: PixelMap = [".ddd.", "dwyyd", "dyoyd", "dyyyd", ".kkk."]
const COIN_COLORS = { k: PAL.outline, w: PAL.coinShine, y: PAL.coin, d: PAL.coinDark, o: PAL.coinEdge }

type CoinTone = { face: string; shine: string; edge: string; dark: string }
const GOLD: CoinTone = { face: PAL.coin, shine: PAL.coinShine, edge: PAL.coinEdge, dark: PAL.coinDark }
const HOT: CoinTone = { face: PAL.coinHot, shine: PAL.coinHotShine, edge: PAL.coinHotEdge, dark: PAL.coinHotDark }

/** A 5 px wide stack of `n` flat coins whose bottom outline sits on row `bottom`; n + 3 rows tall. */
function drawCoinStack(ctx: Ctx, x: number, bottom: number, n: number, tone: CoinTone) {
  const top = bottom - n - 2
  ctx.fillStyle = PAL.outline
  ctx.fillRect(x + 1, top, 3, 1)
  ctx.fillRect(x, top + 1, 5, n + 1)
  ctx.fillRect(x + 1, bottom, 3, 1)
  ctx.fillStyle = tone.face
  ctx.fillRect(x + 1, top + 1, 3, 1)
  ctx.fillStyle = tone.shine
  ctx.fillRect(x + 1, top + 1, 1, 1)
  // One rim row per coin, alternating shades so the coins read as separate.
  for (let i = 0; i < n; i++) {
    ctx.fillStyle = i % 2 ? tone.dark : tone.edge
    ctx.fillRect(x + 1, top + 2 + i, 3, 1)
  }
}

/** 0 = free (no marker), 1 = one coin, 2 = two coins, 3 = a gold stack, 4 = gouging. */
function priceTier(price: number): 0 | 1 | 2 | 3 | 4 {
  if (Number.isNaN(price) || price <= 0) return 0
  if (price >= 4) return 4
  return Math.min(3, Math.max(1, Math.round(price))) as 1 | 2 | 3
}

/**
 * A 32x16 market stall (2x1 tiles); the awning overhangs 4 px above `py`. The counter shows
 * up to 8 food items, and the coins beside them grow with `price`: one gold coin at 1, two at 2,
 * a gold stack at 3, and a hot orange and red pile at 4 or more so gouging stands out.
 */
export function drawStall(ctx: Ctx, px: number, py: number, food: number, price: number) {
  ctx.fillStyle = "rgba(0,0,0,0.22)"
  ctx.fillRect(px + 2, py + 15, 28, 1)
  paint(ctx, STALL, STALL_COLORS, px, py - STALL_OVERHANG)

  const n = Number.isFinite(food) ? Math.max(0, Math.min(STALL_FOOD_SPOTS.length, Math.floor(food))) : 0
  const spots = STALL_FOOD_SPOTS.slice(0, n)
  // Shared outline first so the heap reads as one pile, then the berries.
  ctx.fillStyle = PAL.outline
  for (const [bx, by] of spots) {
    ctx.fillRect(px + bx - 1, py + by, 4, 2)
    ctx.fillRect(px + bx, py + by - 1, 2, 4)
  }
  for (const [bx, by] of spots) {
    ctx.fillStyle = PAL.berry
    ctx.fillRect(px + bx, py + by, 2, 2)
    ctx.fillStyle = PAL.berryLight
    ctx.fillRect(px + bx, py + by, 1, 1)
    ctx.fillStyle = PAL.berryDark
    ctx.fillRect(px + bx + 1, py + by + 1, 1, 1)
  }

  // Price marker on the right of the counter; every tier sits on counter row 8.
  const tier = priceTier(price)
  if (tier === 1) paint(ctx, COIN, COIN_COLORS, px + 19, py + 4)
  else if (tier === 2) {
    paint(ctx, COIN, COIN_COLORS, px + 17, py + 4)
    paint(ctx, COIN, COIN_COLORS, px + 21, py + 4)
  } else if (tier === 3) drawCoinStack(ctx, px + 19, py + 8, 3, GOLD)
  else if (tier === 4) {
    drawCoinStack(ctx, px + 17, py + 8, 3, HOT)
    drawCoinStack(ctx, px + 21, py + 8, 2, HOT)
  }
}

/** A coin pile in a 6x6 box at (px, py): a stack of 1 to 3 gold coins on the bottom row, none at 0. */
export function drawCoins(ctx: Ctx, px: number, py: number, n: number) {
  const count = Number.isFinite(n) ? Math.max(0, Math.min(3, Math.floor(n))) : 0
  if (count === 0) return
  drawCoinStack(ctx, px, py + 5, count, GOLD)
}

// ---------------------------------------------------------------------------
// Fernhollow buildings: any kind, any footprint. The roof sits on the upper part of the
// footprint and the front wall below it; details may rise up to ROOF_OVERHANG px above.

const T = 16

/** How far a roof detail (chimney, flag, bell, steeple) may rise above a building's footprint. */
export const ROOF_OVERHANG = 4

/** The parts of a `Building` the painter needs. */
export type BuildingSprite = Pick<Building, "kind" | "pos" | "size" | "door">

type Tone = { light: string; base: string; dark: string }
const tone = (light: string, base: string, dark: string): Tone => ({ light, base, dark })

type RoofPattern = "tile" | "shingle" | "slate" | "rib"
type WallPattern = "plaster" | "clapboard" | "plank" | "stone" | "timber"
type WindowStyle = "cross" | "tall" | "arch" | "shop" | "shutter"
type DoorStyle = "wood" | "navy" | "glass" | "double" | "arch" | "barn"

type Look = {
  roof: Tone
  pattern: RoofPattern
  /** Front gable: the roof edge drops a row every `gable` px from the ridge; 0 is a straight ridge. */
  gable: number
  /** Roof start relative to the footprint top; negative rises into the overhang. */
  roofTop: number
  /** Where the front wall starts, as a fraction of the footprint height. */
  wallAt: number
  wall: Tone
  wallPattern: WallPattern
  window: WindowStyle
  frame: string
  door: DoorStyle
}

const CREAM_WALL = tone(PAL.white, PAL.wall, PAL.wallDark)
const PLANK_WALL = tone(PAL.plankLight, PAL.plank, PAL.plankDark)

const LOOKS: Record<Building["kind"], Look> = {
  home: {
    roof: tone(PAL.roofLight, PAL.roof, PAL.roofDark),
    pattern: "tile",
    gable: 0,
    roofTop: 1,
    wallAt: 0.52,
    wall: CREAM_WALL,
    wallPattern: "plaster",
    window: "cross",
    frame: PAL.woodDark,
    door: "wood",
  },
  farmhouse: {
    roof: tone(PAL.farmRoofLight, PAL.farmRoof, PAL.farmRoofDark),
    pattern: "shingle",
    gable: 3,
    roofTop: -3,
    wallAt: 0.52,
    wall: PLANK_WALL,
    wallPattern: "plank",
    window: "shutter",
    frame: PAL.woodDark,
    door: "wood",
  },
  clinic: {
    roof: tone(PAL.clinicRoofLight, PAL.clinicRoof, PAL.clinicRoofDark),
    pattern: "tile",
    gable: 0,
    roofTop: 1,
    wallAt: 0.5,
    wall: tone(PAL.white, PAL.clinicWall, PAL.clinicWallDark),
    wallPattern: "plaster",
    window: "cross",
    frame: PAL.stoneDark,
    door: "glass",
  },
  police: {
    roof: tone(PAL.policeRoofLight, PAL.policeRoof, PAL.policeRoofDark),
    pattern: "tile",
    gable: 0,
    roofTop: 1,
    wallAt: 0.5,
    wall: tone(PAL.white, PAL.policeWall, PAL.policeWallDark),
    wallPattern: "stone",
    window: "cross",
    frame: PAL.navy,
    door: "navy",
  },
  town_hall: {
    roof: tone(PAL.hallRoofLight, PAL.hallRoof, PAL.hallRoofDark),
    pattern: "slate",
    gable: 0,
    roofTop: 6,
    wallAt: 0.5,
    wall: tone(PAL.hallStoneLight, PAL.hallStone, PAL.hallStoneDark),
    wallPattern: "stone",
    window: "tall",
    frame: PAL.stoneDark,
    door: "double",
  },
  school: {
    roof: tone(PAL.schoolRoofLight, PAL.schoolRoof, PAL.schoolRoofDark),
    pattern: "tile",
    gable: 0,
    roofTop: 5,
    wallAt: 0.54,
    wall: CREAM_WALL,
    wallPattern: "clapboard",
    window: "cross",
    frame: PAL.woodDark,
    door: "double",
  },
  chapel: {
    roof: tone(PAL.chapelRoofLight, PAL.chapelRoof, PAL.chapelRoofDark),
    pattern: "slate",
    gable: 3,
    roofTop: 8,
    wallAt: 0.52,
    wall: tone(PAL.chapelStoneLight, PAL.chapelStone, PAL.stoneDark),
    wallPattern: "stone",
    window: "arch",
    frame: PAL.outline,
    door: "arch",
  },
  store: {
    roof: tone(PAL.storeRoofLight, PAL.storeRoof, PAL.storeRoofDark),
    pattern: "tile",
    gable: 0,
    roofTop: 1,
    wallAt: 0.46,
    wall: CREAM_WALL,
    wallPattern: "plaster",
    window: "shop",
    frame: PAL.woodDark,
    door: "glass",
  },
  diner: {
    roof: tone(PAL.dinerRoofLight, PAL.dinerRoof, PAL.dinerRoofDark),
    pattern: "tile",
    gable: 0,
    roofTop: 1,
    wallAt: 0.48,
    wall: tone(PAL.white, PAL.clinicWall, PAL.clinicWallDark),
    wallPattern: "plaster",
    window: "shop",
    frame: PAL.steelDark,
    door: "glass",
  },
  inn: {
    roof: tone(PAL.innRoofLight, PAL.innRoof, PAL.innRoofDark),
    pattern: "shingle",
    gable: 0,
    roofTop: 1,
    wallAt: 0.5,
    wall: CREAM_WALL,
    wallPattern: "timber",
    window: "cross",
    frame: PAL.woodDark,
    door: "double",
  },
  crier: {
    roof: tone(PAL.crierRoofLight, PAL.crierRoof, PAL.crierRoofDark),
    pattern: "slate",
    gable: 0,
    roofTop: 1,
    wallAt: 0.52,
    wall: tone(PAL.white, PAL.paper, PAL.paperDark),
    wallPattern: "clapboard",
    window: "cross",
    frame: PAL.ink,
    door: "wood",
  },
  workshop: {
    roof: tone(PAL.tinRoofLight, PAL.tinRoof, PAL.tinRoofDark),
    pattern: "rib",
    gable: 0,
    roofTop: 1,
    wallAt: 0.5,
    wall: PLANK_WALL,
    wallPattern: "plank",
    window: "cross",
    frame: PAL.woodDark,
    door: "barn",
  },
}

/** The base roof colour of each building kind (exposed for the distinct-colour test). */
export const ROOF_COLORS: Record<Building["kind"], string> = Object.fromEntries(
  Object.entries(LOOKS).map(([kind, look]) => [kind, look.roof.base]),
) as Record<Building["kind"], string>

type Geom = {
  x: number
  y: number
  w: number
  h: number
  /** First wall row, absolute. */
  eave: number
  /** One past the last row of the footprint. */
  bottom: number
  cols: number
  doorCol: number
  /** Left edge of the door tile. */
  doorX: number
  glow: boolean
  look: Look
}

const clampInt = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(v)))

const ROOF_PATTERNS: Record<RoofPattern, { first: number; every: number; seam: number; stagger: number }> = {
  tile: { first: 6, every: 5, seam: 8, stagger: 4 },
  shingle: { first: 5, every: 4, seam: 6, stagger: 3 },
  slate: { first: 5, every: 4, seam: 8, stagger: 4 },
  rib: { first: 0, every: 0, seam: 4, stagger: 0 },
}

/**
 * A w x h roof whose bottom row is an outline the wall covers. Lit along its top edge, a dark eave
 * along the bottom, and courses of tiles, shingles, slates or tin ribs in between.
 */
function drawRoof(ctx: Ctx, x: number, y: number, w: number, h: number, look: Look) {
  if (w < 3 || h < 4) return
  const { roof, pattern } = look
  const c = (w - 1) / 2
  const maxDrop = Math.max(0, h - 7)
  const drop = (i: number) => (look.gable > 0 ? Math.min(maxDrop, Math.floor(Math.abs(i - c) / look.gable)) : 0)
  // Leftmost column covered by row k; the roof is symmetric and its edge falls away from the ridge.
  const start = (k: number) => {
    for (let i = 0; i <= c; i++) if (drop(i) <= k) return i
    return w
  }
  const { first, every, seam, stagger } = ROOF_PATTERNS[pattern]
  const isCourse = (k: number) => every > 0 && k >= first && (k - first) % every === 0
  for (let k = 0; k < h; k++) {
    const s = start(k)
    if (s > w - 1 - s) continue
    ctx.fillStyle = PAL.outline
    ctx.fillRect(x + s, y + k, w - 2 * s, 1)
    if (k === h - 1) continue
    const a = Math.max(1, start(k - 1))
    if (a > w - 1 - a) continue
    const eave = k >= h - 3
    ctx.fillStyle = eave ? roof.dark : roof.light
    ctx.fillRect(x + a, y + k, w - 2 * a, 1)
    if (eave) continue
    const b = Math.max(1, start(k - 3))
    if (b > w - 1 - b) continue
    ctx.fillStyle = isCourse(k) ? roof.dark : roof.base
    ctx.fillRect(x + b, y + k, w - 2 * b, 1)
    if (pattern === "slate" && isCourse(k - 1)) {
      // Slates overlap: a lit lip just under each course line.
      ctx.fillStyle = roof.light
      for (let i = b + ((k >> 2) % 2) * 2; i < w - b; i += 4) ctx.fillRect(x + i, y + k, 2, 1)
    }
  }
  if (pattern === "rib") {
    // Corrugated tin: a lit rib and its shadow every few px.
    for (let i = 2; i < w - 3; i += seam) {
      const top = drop(i) + 3
      const end = h - 4
      if (top > end) continue
      ctx.fillStyle = roof.light
      ctx.fillRect(x + i, y + top, 1, end - top + 1)
      ctx.fillStyle = roof.dark
      ctx.fillRect(x + i + 1, y + top, 1, end - top + 1)
    }
    return
  }
  // Vertical seams between courses, staggered band to band like laid tiles.
  const courses: number[] = []
  for (let k = first; k <= h - 4; k += every) courses.push(k)
  for (let n = 0; n <= courses.length; n++) {
    const bandTop = n === 0 ? 2 : courses[n - 1] + 1
    const bandEnd = n < courses.length ? courses[n] - 1 : h - 4
    if (bandEnd < bandTop) continue
    for (let i = stagger + (n % 2) * stagger; i < w - 2; i += seam) {
      const top = Math.max(bandTop, drop(i) + 2)
      if (top > bandEnd) continue
      ctx.fillStyle = roof.dark
      ctx.fillRect(x + i, y + top, 1, bandEnd - top + 1)
      if (pattern === "shingle") {
        ctx.fillStyle = roof.light
        ctx.fillRect(x + i + 1, y + top, 1, 1)
      }
    }
  }
}

/** The front wall: outlined sides and bottom, a shadow under the eave and a darker plinth. */
function drawWall(ctx: Ctx, g: Geom, x: number, w: number) {
  const { wall, wallPattern } = g.look
  const y = g.eave
  const h = g.bottom - y
  if (w < 3 || h < 2) return
  ctx.fillStyle = PAL.outline
  ctx.fillRect(x, y, w, h)
  ctx.fillStyle = wall.base
  ctx.fillRect(x + 1, y, w - 2, h - 1)
  const inner = x + 1
  const right = x + w - 1
  const plinth = g.bottom - 4
  switch (wallPattern) {
    case "clapboard":
      for (let r = y + 4; r < plinth - 1; r += 4) {
        ctx.fillStyle = wall.dark
        ctx.fillRect(inner, r, w - 2, 1)
        ctx.fillStyle = wall.light
        ctx.fillRect(inner, r + 1, w - 2, 1)
      }
      break
    case "plank":
      for (let i = inner + 3; i < right - 1; i += 5) {
        ctx.fillStyle = wall.dark
        ctx.fillRect(i, y, 1, h - 1)
        ctx.fillStyle = wall.light
        ctx.fillRect(i + 1, y, 1, h - 1)
      }
      break
    case "stone":
      for (let r = y + 5, n = 0; r < plinth; r += 5, n++) {
        ctx.fillStyle = wall.dark
        ctx.fillRect(inner, r, w - 2, 1)
        for (let i = inner + 3 + (n % 2) * 4; i < right; i += 8) ctx.fillRect(i, r - 4, 1, 4)
        ctx.fillStyle = wall.light
        for (let i = inner + 4 + (n % 2) * 4; i < right - 1; i += 8) ctx.fillRect(i, r - 4, 2, 1)
      }
      break
    case "timber": {
      // Half-timbering: dark posts on the tile lines, a rail at mid height and short braces.
      const mid = y + Math.max(3, Math.floor((h - 5) / 2))
      ctx.fillStyle = PAL.woodDark
      ctx.fillRect(inner, y + 1, w - 2, 2)
      ctx.fillRect(inner, mid, w - 2, 2)
      for (let c = 0; c <= g.cols; c++) {
        const px = Math.min(right - 2, Math.max(inner, g.x + c * T - 1))
        ctx.fillRect(px, y + 1, 2, plinth - y - 1)
        // Braces lean into the bays either side of the post, but not into the doorway.
        for (let d = 0; d < 4; d++) {
          if (c !== g.doorCol && px + 2 + d < right - 1) ctx.fillRect(px + 2 + d, mid - 1 - d, 1, 1)
          if (c - 1 !== g.doorCol && px - 1 - d > inner) ctx.fillRect(px - 1 - d, mid - 1 - d, 1, 1)
        }
      }
      break
    }
    case "plaster":
      break
  }
  ctx.fillStyle = wall.dark
  ctx.fillRect(inner, y, w - 2, 1)
  ctx.fillRect(inner, plinth, w - 2, 3)
}

function glassOf(glow: boolean) {
  return glow ? PAL.glassLit : PAL.glass
}

/** A window with a frame; lit panes glow, unlit ones show sky and a white glint. */
function drawWindow(ctx: Ctx, x: number, y: number, w: number, h: number, g: Geom, style: WindowStyle = g.look.window) {
  if (w < 4 || h < 4) return
  const frame = g.look.frame
  const glass = glassOf(g.glow)
  if (style === "shutter") {
    // Green shutters either side of a cross window.
    ctx.fillStyle = PAL.outline
    ctx.fillRect(x - 3, y, 3, h)
    ctx.fillRect(x + w, y, 3, h)
    ctx.fillStyle = PAL.shutter
    ctx.fillRect(x - 2, y + 1, 2, h - 2)
    ctx.fillRect(x + w, y + 1, 2, h - 2)
    ctx.fillStyle = PAL.shutterDark
    for (let r = y + 2; r < y + h - 1; r += 2) {
      ctx.fillRect(x - 2, r, 2, 1)
      ctx.fillRect(x + w, r, 2, 1)
    }
    style = "cross"
  }
  ctx.fillStyle = frame
  if (style === "arch") {
    ctx.fillRect(x + 2, y, w - 4, 1)
    ctx.fillRect(x + 1, y + 1, w - 2, 1)
    ctx.fillRect(x, y + 2, w, h - 2)
    ctx.fillStyle = glass
    ctx.fillRect(x + 2, y + 1, w - 4, 1)
    ctx.fillRect(x + 1, y + 2, w - 2, h - 3)
    if (!g.glow) {
      // Stained glass: a violet head and a berry-red middle pane.
      ctx.fillStyle = PAL.chapelRoofLight
      ctx.fillRect(x + 2, y + 1, w - 4, 1)
      ctx.fillRect(x + 1, y + 2, w - 2, 2)
      ctx.fillStyle = PAL.berry
      ctx.fillRect(x + 1, y + 2 + Math.floor((h - 3) / 2), w - 2, 2)
    }
    ctx.fillStyle = frame
    ctx.fillRect(x + Math.floor(w / 2), y + 1, 1, h - 1)
    ctx.fillRect(x + 1, y + 4, w - 2, 1)
    return
  }
  ctx.fillRect(x, y, w, h)
  ctx.fillStyle = glass
  ctx.fillRect(x + 1, y + 1, w - 2, h - 2)
  ctx.fillStyle = frame
  if (style === "cross") {
    const bar = w >= 12 ? 2 : 1
    ctx.fillRect(x + Math.floor((w - bar) / 2), y + 1, bar, h - 2)
    ctx.fillRect(x + 1, y + Math.floor((h - bar) / 2), w - 2, bar)
  } else if (style === "tall") {
    ctx.fillRect(x + 1, y + Math.floor(h / 3), w - 2, 1)
    ctx.fillRect(x + Math.floor(w / 2), y + 1, 1, h - 2)
  } else if (style === "shop") {
    for (let i = x + 12; i < x + w - 4; i += 12) ctx.fillRect(i, y + 1, 2, h - 2)
    ctx.fillRect(x + 1, y + Math.floor(h * 0.4), w - 2, 1)
  }
  if (!g.glow) {
    ctx.fillStyle = PAL.white
    ctx.fillRect(x + 2, y + 2, 2, 1)
    if (h >= 8) ctx.fillRect(x + 2, y + 3, 1, 1)
  }
  if (style === "shop") {
    // A sill under display windows.
    ctx.fillStyle = PAL.outline
    ctx.fillRect(x - 1, y + h, w + 2, 1)
  }
}

/** The door on the door tile, reaching the bottom of the footprint. */
function drawDoor(ctx: Ctx, g: Geom, style: DoorStyle = g.look.door) {
  const tall = style === "double" || style === "arch" || style === "barn"
  const dh = Math.min(tall ? 20 : 18, g.bottom - g.eave - 3)
  if (dh < 4) return
  // On a very short wall only a plain door fits.
  if (dh < 10 && style !== "navy") style = "wood"
  const top = g.bottom - dh
  const wide = style === "double" || style === "arch" || style === "barn" || style === "glass"
  const dw = wide ? 14 : 12
  const x = g.doorX + (T - dw) / 2
  const mid = x + dw / 2
  switch (style) {
    case "wood":
    case "navy": {
      const [frame, fill, light] =
        style === "navy" ? [PAL.outline, PAL.navy, PAL.policeRoof] : [PAL.woodDark, PAL.wood, PAL.plank]
      ctx.fillStyle = frame
      ctx.fillRect(x, top, dw, dh)
      ctx.fillStyle = fill
      ctx.fillRect(x + 1, top + 1, dw - 2, dh - 1)
      ctx.fillStyle = light
      ctx.fillRect(x + 2, top + 2, dw - 4, 1)
      ctx.fillRect(x + 2, top + 2, 1, dh - 3)
      ctx.fillStyle = PAL.coin
      ctx.fillRect(x + dw - 4, top + Math.floor(dh / 2), 2, 2)
      return
    }
    case "glass": {
      ctx.fillStyle = PAL.metal
      ctx.fillRect(x, top, dw, dh)
      ctx.fillStyle = glassOf(g.glow)
      ctx.fillRect(x + 1, top + 1, dw / 2 - 2, dh - 4)
      ctx.fillRect(mid + 1, top + 1, dw / 2 - 2, dh - 4)
      ctx.fillStyle = PAL.steel
      ctx.fillRect(x + 1, g.bottom - 3, dw - 2, 2)
      if (!g.glow) {
        ctx.fillStyle = PAL.white
        ctx.fillRect(x + 2, top + 2, 1, 3)
        ctx.fillRect(mid + 2, top + 2, 1, 3)
      }
      return
    }
    case "double":
    case "arch": {
      ctx.fillStyle = PAL.woodDark
      if (style === "arch") {
        ctx.fillRect(x + 3, top, dw - 6, 1)
        ctx.fillRect(x + 1, top + 1, dw - 2, 1)
        ctx.fillRect(x, top + 2, dw, dh - 2)
      } else ctx.fillRect(x, top, dw, dh)
      ctx.fillStyle = PAL.wood
      if (style === "arch") {
        ctx.fillRect(x + 3, top + 1, dw - 6, 1)
        ctx.fillRect(x + 1, top + 2, dw - 2, dh - 2)
      } else {
        ctx.fillRect(x + 1, top + 4, dw - 2, dh - 4)
        // Transom light over the doors.
        ctx.fillStyle = glassOf(g.glow)
        ctx.fillRect(x + 1, top + 1, dw - 2, 2)
      }
      ctx.fillStyle = PAL.woodDark
      const seam = top + (style === "arch" ? 1 : 3)
      ctx.fillRect(mid - 1, seam, 2, g.bottom - seam)
      ctx.fillStyle = PAL.plank
      ctx.fillRect(x + 2, top + (style === "arch" ? 3 : 5), 1, dh - 6)
      ctx.fillRect(mid + 1, top + (style === "arch" ? 3 : 5), 1, dh - 6)
      ctx.fillStyle = PAL.coin
      ctx.fillRect(mid - 3, top + Math.floor(dh / 2) + 1, 1, 2)
      ctx.fillRect(mid + 2, top + Math.floor(dh / 2) + 1, 1, 2)
      return
    }
    case "barn": {
      ctx.fillStyle = PAL.woodDark
      ctx.fillRect(x, top, dw, dh)
      ctx.fillStyle = PAL.plank
      ctx.fillRect(x + 1, top + 1, dw - 2, dh - 1)
      ctx.fillStyle = PAL.plankDark
      for (let i = x + 3; i < x + dw - 1; i += 3) ctx.fillRect(i, top + 1, 1, dh - 1)
      // A Z brace on each leaf.
      ctx.fillStyle = PAL.woodDark
      ctx.fillRect(x + 1, top + 2, dw - 2, 2)
      ctx.fillRect(x + 1, g.bottom - 4, dw - 2, 2)
      const span = g.bottom - 4 - (top + 4)
      for (let s = 0; s < span; s++) {
        const dx = Math.floor((s * (dw / 2 - 2)) / Math.max(1, span))
        ctx.fillRect(x + 1 + dx, g.bottom - 5 - s, 1, 1)
        ctx.fillRect(x + dw - 2 - dx, g.bottom - 5 - s, 1, 1)
      }
      ctx.fillRect(mid, top + 1, 1, dh - 1)
      return
    }
  }
}

/** A rounded plaque with an outline, for signs mounted over the eave. */
function drawPlaque(ctx: Ctx, x: number, y: number, w: number, h: number, fill: string, rim: string) {
  ctx.fillStyle = PAL.outline
  ctx.fillRect(x + 1, y, w - 2, h)
  ctx.fillRect(x, y + 1, w, h - 2)
  ctx.fillStyle = fill
  ctx.fillRect(x + 1, y + 1, w - 2, h - 2)
  ctx.fillStyle = rim
  ctx.fillRect(x + 1, y + h - 2, w - 2, 1)
  ctx.fillRect(x + w - 2, y + 1, 1, h - 2)
}

/** Top-left x of a w px wide sign centred on the door tile, kept inside the footprint. */
function overDoor(g: Geom, w: number) {
  return Math.max(g.x, Math.min(g.x + g.w - w, g.doorX + Math.floor((T - w) / 2)))
}

/** Top y of an h px sign whose bottom hangs `below` px under the eave, kept inside the footprint. */
function onEave(g: Geom, h: number, below = 3) {
  return Math.max(g.y, Math.min(g.bottom - h, g.eave + below - h))
}

// Signs and emblems. Each glyph is painted on a plaque by its building.
const RED_CROSS: PixelMap = ["..lrr..", "..rrd..", "lrrrrrd", "rrrrrrd", "rrrrrrd", "..rrd..", "..ddd.."]
const STAR_BADGE: PixelMap = ["...y...", "...y...", "yyyyyyo", ".yyyyo.", "..yyo..", ".yo.yo.", ".o...o."]
const KETTLE: PixelMap = [
  "....k....",
  "...klk...",
  ".kkkkkkk.",
  "kllsssskk",
  "klsssssdk",
  "kssssssdk",
  ".kddddk..",
  "..kkkk...",
]
const STEAM: PixelMap = [".w.w.", "w.w..", ".w.w."]
const LANTERN: PixelMap = ["...k...", ".kkkkk.", "kmmmmmk", "kgggggk", "kggfggk", "kgfffgk", "kgggggk", "kmmmmmk", ".kkkkk."]
const NEWSPAPER: PixelMap = [
  "kkkkkkkkkkkk.",
  "kwwwwwwwwwwkk",
  "kwnnnnnnnnwwk",
  "kwwwwwwwwwwwk",
  "kwpppwlllllwk",
  "kwpppwwwwwwwk",
  "kwpppwllllwwk",
  "kwwwwwwwwwwwk",
  "kwllllwllllwk",
  "kkkkkkkkkkkkk",
]
const SAW: PixelMap = [
  "........kkkk",
  "kkkkkkkkkhhk",
  "klllllllkh.k",
  "ksssssssskhk",
  ".ksssssskhhk",
  "..k.k.k.kkkk",
]
const BELL: PixelMap = ["..k..", ".kyk.", ".yly.", ".yyy.", "yyyyo", "..d.."]
const LOFT: PixelMap = ["..kkk..", ".kgggk.", "kgggggk", "kkkkkkk", "kgggggk", ".kgggk.", "..kkk.."]

const LANTERN_COLORS = (glow: boolean) => ({
  k: PAL.outline,
  m: PAL.metal,
  g: glow ? PAL.glassLit : PAL.thatchDark,
  f: glow ? PAL.flame : PAL.woodDark,
})

/** Tile columns that get a window: all but the door's and any the kind reserves for a sign. */
function freeCols(g: Geom, reserved: number[] = []) {
  const out: number[] = []
  for (let c = 0; c < g.cols; c++) if (c !== g.doorCol && !reserved.includes(c)) out.push(c)
  return out
}

/** The column beside the door on the given side, or the other side when the door is at the edge. */
function besideDoor(g: Geom, prefer: 1 | -1): number | null {
  if (g.cols < 2) return null
  const c = g.doorCol + prefer
  return c >= 0 && c < g.cols ? c : g.doorCol - prefer
}

/** One window per free column, centred in its tile. */
function windowRow(ctx: Ctx, g: Geom, cols: number[], top: number, w: number, h: number, style?: WindowStyle) {
  const hh = Math.min(h, g.bottom - 6 - top)
  if (hh < 6) return
  for (const c of cols) drawWindow(ctx, g.x + c * T + Math.floor((T - w) / 2), top, w, hh, g, style)
}

/** Runs of adjacent free columns become one long display window each. */
function shopWindows(ctx: Ctx, g: Geom, cols: number[], top: number, h: number) {
  const hh = Math.min(h, g.bottom - 7 - top)
  if (hh < 6) return
  let i = 0
  while (i < cols.length) {
    let j = i
    while (j + 1 < cols.length && cols[j + 1] === cols[j] + 1) j++
    const x0 = g.x + cols[i] * T + 3
    const x1 = g.x + (cols[j] + 1) * T - 3
    drawWindow(ctx, x0, top, x1 - x0, hh, g, "shop")
    i = j + 1
  }
}

function drawChimney(ctx: Ctx, x: number, top: number, bottom: number) {
  ctx.fillStyle = PAL.outline
  ctx.fillRect(x, top, 8, bottom - top)
  ctx.fillStyle = PAL.stone
  ctx.fillRect(x + 1, top + 1, 6, bottom - top - 2)
  ctx.fillStyle = PAL.stoneDark
  ctx.fillRect(x + 5, top + 1, 2, bottom - top - 2)
  ctx.fillRect(x + 1, top + 1, 6, 1)
  ctx.fillStyle = PAL.white
  ctx.fillRect(x + 2, top + 3, 2, 1)
}

// Each kind's signature detail, drawn over the shell.
const DETAILS: Record<Building["kind"], (ctx: Ctx, g: Geom) => void> = {
  home(ctx, g) {
    if (g.w >= 24) drawChimney(ctx, Math.max(g.x + 2, g.x + g.w - 19), g.y - ROOF_OVERHANG, g.y + 5)
    // One wide window on the pair of free tiles farthest from the door, as on the village houses.
    const free = freeCols(g)
    let best: number | null = null
    for (const c of free) {
      if (!free.includes(c + 1)) continue
      if (best === null || Math.abs(c + 0.5 - g.doorCol) > Math.abs(best + 0.5 - g.doorCol)) best = c
    }
    const top = g.eave + 4
    const hh = Math.min(12, g.bottom - 7 - top)
    if (best !== null && hh >= 4) drawWindow(ctx, g.x + (best + 1) * T - 8, top, 16, hh, g)
    else if (free.length && hh >= 4) {
      const far = free.reduce((a, c) => (Math.abs(c - g.doorCol) > Math.abs(a - g.doorCol) ? c : a))
      drawWindow(ctx, g.x + far * T + 2, top, 12, hh, g)
    }
    drawDoor(ctx, g)
  },

  farmhouse(ctx, g) {
    // Stone footing along the base, then shuttered windows and a porch roof over the door.
    ctx.fillStyle = PAL.stone
    ctx.fillRect(g.x + 3, g.bottom - 4, g.w - 6, 3)
    ctx.fillStyle = PAL.stoneDark
    ctx.fillRect(g.x + 3, g.bottom - 2, g.w - 6, 1)
    for (let i = g.x + 7; i < g.x + g.w - 4; i += 7) ctx.fillRect(i, g.bottom - 4, 1, 2)
    ctx.fillStyle = PAL.white
    for (let i = g.x + 4; i < g.x + g.w - 5; i += 7) ctx.fillRect(i, g.bottom - 4, 2, 1)
    windowRow(ctx, g, freeCols(g), g.eave + 5, 10, 10)
    drawDoor(ctx, g)
    const px = Math.max(g.x + 1, g.doorX - 2)
    const pw = Math.min(g.x + g.w - 1, g.doorX + T + 2) - px
    const py = g.bottom - 21
    if (py > g.eave + 1) {
      ctx.fillStyle = PAL.outline
      ctx.fillRect(px, py, pw, 4)
      ctx.fillStyle = PAL.farmRoofLight
      ctx.fillRect(px + 1, py + 1, pw - 2, 1)
      ctx.fillStyle = PAL.farmRoof
      ctx.fillRect(px + 1, py + 2, pw - 2, 1)
      for (let i = px + 3; i < px + pw - 1; i += 4) {
        ctx.fillStyle = PAL.farmRoofDark
        ctx.fillRect(i, py + 1, 1, 2)
      }
    }
    // Hay loft window in the gable, and a stone chimney on the lit side.
    if (g.eave - g.y >= 18) paint(ctx, LOFT, { k: PAL.woodDark, g: glassOf(g.glow) }, g.x + Math.floor(g.w / 2) - 3, g.y + 3)
    if (g.w >= 32) drawChimney(ctx, g.x + 6, g.y - ROOF_OVERHANG, g.y + 9)
  },

  clinic(ctx, g) {
    // A red band under the eave, windows, the glass door and the red cross over it.
    ctx.fillStyle = PAL.cross
    ctx.fillRect(g.x + 3, g.eave + 2, g.w - 6, 2)
    ctx.fillStyle = PAL.crossDark
    ctx.fillRect(g.x + 3, g.eave + 4, g.w - 6, 1)
    windowRow(ctx, g, freeCols(g), g.eave + 7, 12, 11)
    drawDoor(ctx, g)
    const px = overDoor(g, 11)
    const py = onEave(g, 11)
    drawPlaque(ctx, px, py, 11, 11, PAL.white, PAL.clinicWallDark)
    paint(ctx, RED_CROSS, { r: PAL.cross, l: PAL.crossLight, d: PAL.crossDark }, px + 2, py + 2)
  },

  police(ctx, g) {
    const free = freeCols(g)
    windowRow(ctx, g, free, g.eave + 6, 12, 11)
    // The holding cell: iron bars over the window farthest from the door.
    if (free.length) {
      const far = free.reduce((a, c) => (Math.abs(c - g.doorCol) > Math.abs(a - g.doorCol) ? c : a))
      const top = g.eave + 6
      const hh = Math.min(11, g.bottom - 6 - top)
      if (hh >= 6) {
        ctx.fillStyle = PAL.outline
        for (let i = 2; i < 12; i += 3) ctx.fillRect(g.x + far * T + 2 + i, top + 1, 1, hh - 2)
      }
    }
    drawDoor(ctx, g)
    const px = overDoor(g, 11)
    const py = onEave(g, 11)
    drawPlaque(ctx, px, py, 11, 11, PAL.navy, PAL.outline)
    paint(ctx, STAR_BADGE, { y: PAL.coin, o: PAL.coinEdge }, px + 2, py + 2)
  },

  town_hall(ctx, g) {
    const wallH = g.bottom - g.eave
    // Entablature across the top of the wall.
    ctx.fillStyle = g.look.wall.light
    ctx.fillRect(g.x + 3, g.eave, g.w - 6, 3)
    ctx.fillStyle = PAL.outline
    ctx.fillRect(g.x + 2, g.eave + 3, g.w - 4, 1)
    // Tall windows between the columns.
    const winTop = g.eave + 7
    windowRow(ctx, g, freeCols(g), winTop, 8, wallH - 15)
    drawDoor(ctx, g)
    // Columns on every tile line, capital and base in the lit stone.
    const colTop = g.eave + 4
    const colBottom = g.bottom - 4
    if (colBottom - colTop >= 6) {
      for (let c = 0; c <= g.cols; c++) {
        const cx = Math.min(g.x + g.w - 7, Math.max(g.x + 3, g.x + c * T - 2))
        ctx.fillStyle = PAL.outline
        ctx.fillRect(cx - 1, colTop, 6, colBottom - colTop)
        ctx.fillStyle = PAL.white
        ctx.fillRect(cx, colTop + 2, 3, colBottom - colTop - 4)
        ctx.fillStyle = PAL.hallStoneDark
        ctx.fillRect(cx + 3, colTop + 2, 1, colBottom - colTop - 4)
        ctx.fillStyle = g.look.wall.light
        ctx.fillRect(cx, colTop, 4, 2)
        ctx.fillRect(cx, colBottom - 2, 4, 2)
      }
    }
    // Two stone steps up to the door.
    const sx = Math.max(g.x + 2, g.doorX - 4)
    const sw = Math.min(g.x + g.w - 2, g.doorX + T + 4) - sx
    ctx.fillStyle = PAL.outline
    ctx.fillRect(sx, g.bottom - 4, sw, 4)
    ctx.fillStyle = PAL.hallStoneLight
    ctx.fillRect(sx + 1, g.bottom - 3, sw - 2, 1)
    ctx.fillStyle = PAL.hallStone
    ctx.fillRect(sx + 1, g.bottom - 2, sw - 2, 1)
    // Pediment over the entrance, with a gold medallion.
    const pw = Math.min(47, g.w - 4) | 1
    const ph = Math.min(Math.floor(pw / 4), g.eave - g.y - 1)
    const pcx = Math.max(g.x + 2 + (pw - 1) / 2, Math.min(g.x + g.w - 3 - (pw - 1) / 2, g.doorX + 8))
    for (let r = 0; r < ph; r++) {
      const half = Math.round(((r + 1) * (pw - 1)) / 2 / ph)
      const ry = g.eave - ph + r
      ctx.fillStyle = PAL.outline
      ctx.fillRect(pcx - half, ry, 2 * half + 1, 1)
      if (r === 0 || r === ph - 1) continue
      ctx.fillStyle = r === 1 ? PAL.white : g.look.wall.light
      ctx.fillRect(pcx - half + 2, ry, 2 * half - 3, 1)
    }
    ctx.fillStyle = PAL.outline
    ctx.fillRect(pcx - (pw - 1) / 2, g.eave, pw, 1)
    if (ph >= 6) {
      const my = g.eave - Math.ceil(ph / 2) - 1
      ctx.fillStyle = PAL.coinDark
      ctx.fillRect(pcx - 1, my - 1, 3, 4)
      ctx.fillRect(pcx - 2, my, 5, 2)
      ctx.fillStyle = PAL.coin
      ctx.fillRect(pcx - 1, my, 2, 2)
    }
    // Flagpole on the ridge above the entrance.
    const fx = Math.min(g.x + g.w - 11, Math.max(g.x + 1, g.doorX + 8))
    const poleBottom = g.y + Math.max(2, g.look.roofTop + 4)
    ctx.fillStyle = PAL.coin
    ctx.fillRect(fx - 1, g.y - ROOF_OVERHANG, 3, 1)
    ctx.fillStyle = PAL.outline
    ctx.fillRect(fx, g.y - ROOF_OVERHANG + 1, 1, poleBottom - (g.y - ROOF_OVERHANG + 1))
    ctx.fillRect(fx + 1, g.y - 3, 9, 7)
    ctx.fillStyle = PAL.cross
    ctx.fillRect(fx + 1, g.y - 2, 8, 5)
    ctx.fillStyle = PAL.white
    ctx.fillRect(fx + 1, g.y, 8, 1)
    ctx.fillStyle = PAL.crossDark
    ctx.fillRect(fx + 8, g.y - 2, 1, 5)
  },

  school(ctx, g) {
    windowRow(ctx, g, freeCols(g), g.eave + 5, 12, 12)
    drawDoor(ctx, g)
    // Bell cupola on the ridge: an orange cap, an open belfry with the bell, a white base.
    const cx = g.x + Math.floor(g.w / 2)
    const top = g.y - ROOF_OVERHANG
    const x0 = cx - 7
    ctx.fillStyle = PAL.outline
    ctx.fillRect(cx - 2, top, 4, 1)
    ctx.fillRect(cx - 4, top + 1, 8, 1)
    ctx.fillRect(x0, top + 2, 14, 2)
    ctx.fillStyle = PAL.schoolRoofLight
    ctx.fillRect(cx - 2, top + 1, 4, 1)
    ctx.fillStyle = PAL.schoolRoof
    ctx.fillRect(x0 + 1, top + 2, 12, 1)
    ctx.fillStyle = PAL.outline
    ctx.fillRect(x0 + 1, top + 4, 12, 9)
    ctx.fillStyle = PAL.metal
    ctx.fillRect(x0 + 4, top + 4, 6, 5)
    ctx.fillStyle = PAL.white
    ctx.fillRect(x0 + 2, top + 4, 2, 5)
    ctx.fillRect(x0 + 10, top + 4, 2, 5)
    ctx.fillRect(x0 + 2, top + 9, 10, 3)
    ctx.fillStyle = PAL.wallDark
    ctx.fillRect(x0 + 2, top + 11, 10, 1)
    paint(ctx, BELL, { k: PAL.outline, y: PAL.coin, l: PAL.coinShine, o: PAL.coinDark, d: PAL.woodDark }, cx - 3, top + 4)
  },

  chapel(ctx, g) {
    const free = freeCols(g)
    windowRow(ctx, g, free, g.eave + 5, 8, 16)
    drawDoor(ctx, g)
    // Steeple over the door: a stone tower with a belfry, a slate spire and a gold cross.
    // `th` is the tower's half width; the spire's eaves overhang it by 1 px on each side.
    const th = Math.min(7, Math.floor(g.w / 2) - 1)
    const cx = Math.max(g.x + th + 1, Math.min(g.x + g.w - th - 1, g.doorX + 8))
    const towerTop = g.y + 13
    const towerBottom = Math.min(g.eave + 2, g.bottom - 22)
    if (towerBottom > towerTop + 4) {
      ctx.fillStyle = PAL.outline
      ctx.fillRect(cx - th, towerTop, 2 * th, towerBottom - towerTop + 1)
      ctx.fillStyle = PAL.chapelStone
      ctx.fillRect(cx - th + 1, towerTop, 2 * th - 2, towerBottom - towerTop)
      ctx.fillStyle = PAL.chapelStoneLight
      ctx.fillRect(cx - th + 1, towerTop, 1, towerBottom - towerTop)
      ctx.fillStyle = PAL.stoneDark
      ctx.fillRect(cx + th - 3, towerTop, 2, towerBottom - towerTop)
      for (let r = towerTop + 5; r < towerBottom; r += 5) ctx.fillRect(cx - th + 1, r, 2 * th - 2, 1)
      // Louvred belfry opening.
      ctx.fillStyle = PAL.outline
      ctx.fillRect(cx - 3, towerTop + 3, 6, 8)
      ctx.fillRect(cx - 2, towerTop + 2, 4, 1)
      ctx.fillStyle = PAL.metal
      ctx.fillRect(cx - 2, towerTop + 3, 4, 7)
      ctx.fillStyle = PAL.coin
      ctx.fillRect(cx - 1, towerTop + 5, 2, 3)
      ctx.fillRect(cx - 2, towerTop + 7, 4, 1)
    }
    const spireTop = g.y + 1
    const rows = towerTop - spireTop
    for (let r = 0; r < rows; r++) {
      const half = 1 + Math.floor((r * (th - 1)) / Math.max(1, rows - 1))
      const ry = spireTop + r
      ctx.fillStyle = PAL.outline
      ctx.fillRect(cx - half - 1, ry, 2 * half + 2, 1)
      if (half < 2) continue
      ctx.fillStyle = PAL.chapelRoofLight
      ctx.fillRect(cx - half, ry, half, 1)
      ctx.fillStyle = r % 3 === 2 ? PAL.chapelRoofDark : PAL.chapelRoof
      ctx.fillRect(cx, ry, half, 1)
    }
    ctx.fillStyle = PAL.coin
    ctx.fillRect(cx - 1, g.y - ROOF_OVERHANG, 2, ROOF_OVERHANG + 1)
    ctx.fillRect(cx - 2, g.y - ROOF_OVERHANG + 1, 4, 1)
    ctx.fillStyle = PAL.coinDark
    ctx.fillRect(cx, g.y - ROOF_OVERHANG + 2, 1, 3)
  },

  store(ctx, g) {
    // Striped awning under the eave, over the display windows.
    const ax = g.x + 1
    const aw = g.w - 2
    const ay = g.eave
    const stripe = (i: number) => Math.floor((i - ax) / 4) % 2 === 0
    if (g.bottom - ay < 16) {
      // A wall too short for the full awning gets a striped band under the eave.
      for (let i = ax + 1; i < ax + aw - 1; i += 4) {
        ctx.fillStyle = stripe(i) ? PAL.cross : PAL.cream
        ctx.fillRect(i, ay + 1, Math.min(4, ax + aw - 1 - i), 2)
      }
      drawDoor(ctx, g)
      return
    }
    ctx.fillStyle = PAL.outline
    ctx.fillRect(ax, ay, aw, 7)
    for (let i = ax + 1; i < ax + aw - 1; i += 4) {
      const red = stripe(i)
      const sw = Math.min(4, ax + aw - 1 - i)
      ctx.fillStyle = red ? PAL.crossLight : PAL.creamLight
      ctx.fillRect(i, ay + 1, sw, 1)
      ctx.fillStyle = red ? PAL.cross : PAL.cream
      ctx.fillRect(i, ay + 2, sw, 3)
      ctx.fillStyle = red ? PAL.crossDark : PAL.creamDark
      ctx.fillRect(i, ay + 5, sw, 1)
    }
    // Scalloped valance: a rounded tongue hangs under every stripe.
    for (let i = ax + 1; i + 3 < ax + aw; i += 4) {
      const red = stripe(i)
      ctx.fillStyle = PAL.outline
      ctx.fillRect(i, ay + 6, 4, 2)
      ctx.fillRect(i + 1, ay + 8, 2, 1)
      ctx.fillStyle = red ? PAL.cross : PAL.cream
      ctx.fillRect(i, ay + 6, 4, 1)
      ctx.fillStyle = red ? PAL.crossDark : PAL.creamDark
      ctx.fillRect(i + 1, ay + 7, 2, 1)
    }
    shopWindows(ctx, g, freeCols(g), g.eave + 11, 11)
    drawDoor(ctx, g)
  },

  diner(ctx, g) {
    // Chequered band along the base, long diner windows, the kettle sign over the door.
    for (let i = g.x + 3; i < g.x + g.w - 3; i += 2) {
      for (let r = 0; r < 2; r++) {
        ctx.fillStyle = (Math.floor((i - g.x - 3) / 2) + r) % 2 === 0 ? PAL.cross : PAL.white
        ctx.fillRect(i, g.bottom - 8 + r * 2, 2, 2)
      }
    }
    ctx.fillStyle = PAL.outline
    ctx.fillRect(g.x + 3, g.bottom - 9, g.w - 6, 1)
    shopWindows(ctx, g, freeCols(g), g.eave + 5, 11)
    drawDoor(ctx, g)
    const px = overDoor(g, 15)
    const py = onEave(g, 13, 4)
    drawPlaque(ctx, px, py, 15, 13, PAL.cream, PAL.creamDark)
    paint(ctx, STEAM, { w: PAL.steel }, px + 7, py + 1)
    paint(
      ctx,
      KETTLE,
      { k: PAL.outline, l: PAL.steelLight, s: PAL.steel, d: PAL.steelDark },
      px + 3,
      py + 3,
    )
  },

  inn(ctx, g) {
    const lamp = besideDoor(g, 1)
    windowRow(ctx, g, freeCols(g, lamp === null ? [] : [lamp]), g.eave + 6, 12, 10)
    drawDoor(ctx, g)
    if (lamp === null) return
    // A wrought-iron bracket off the wall with the lantern hanging from it.
    const lx = g.x + lamp * T
    const side = lamp > g.doorCol ? 1 : -1
    const wallX = side > 0 ? lx + 1 : lx + T - 2
    const by = g.eave + 5
    if (by + 3 + LANTERN.length > g.bottom - 1) return
    ctx.fillStyle = PAL.outline
    ctx.fillRect(side > 0 ? wallX : wallX - 9, by, 10, 1)
    for (let d = 0; d < 4; d++) ctx.fillRect(wallX + side * d, by + 4 - d, 1, 1)
    const hook = wallX + side * 7
    ctx.fillRect(hook, by + 1, 1, 2)
    paint(ctx, LANTERN, LANTERN_COLORS(g.glow), hook - 3, by + 3)
  },

  crier(ctx, g) {
    windowRow(ctx, g, freeCols(g), g.eave + 6, 12, 10)
    drawDoor(ctx, g)
    // The Crier's front page, pinned up over the door.
    const px = overDoor(g, 13)
    const py = onEave(g, 10, 3)
    paint(ctx, NEWSPAPER, { k: PAL.outline, w: PAL.white, n: PAL.ink, p: PAL.waterDark, l: PAL.stone }, px, py)
  },

  workshop(ctx, g) {
    const board = besideDoor(g, -1)
    windowRow(ctx, g, freeCols(g, board === null ? [] : [board]), g.eave + 5, 12, 10)
    drawDoor(ctx, g)
    if (board === null) return
    // A plank sign with Wren's saw on it.
    const bx = g.x + board * T + 1
    const by = g.eave + 4
    if (by + 10 > g.bottom - 4) return
    ctx.fillStyle = PAL.outline
    ctx.fillRect(bx, by, 14, 10)
    ctx.fillStyle = PAL.plankLight
    ctx.fillRect(bx + 1, by + 1, 12, 8)
    ctx.fillStyle = PAL.plankDark
    ctx.fillRect(bx + 1, by + 8, 12, 1)
    paint(ctx, SAW, { k: PAL.outline, l: PAL.steelLight, s: PAL.steel, h: PAL.berry }, bx + 1, by + 2)
  },
}

/**
 * Any Fernhollow building, filling its footprint (size.x * 16 by size.y * 16 px from pos * 16).
 * Chimneys, flags, bells and steeples may rise up to ROOF_OVERHANG px above it. The door sits on
 * the door tile; windows glow when someone is inside (`lit`) or once night passes 0.2.
 */
export function drawBuilding(ctx: Ctx, b: BuildingSprite, lit: boolean, night: number) {
  const cols = Math.max(1, Math.floor(b.size.x))
  const rows = Math.max(1, Math.floor(b.size.y))
  const look = LOOKS[b.kind] ?? LOOKS.home
  const x = Math.round(b.pos.x) * T
  const y = Math.round(b.pos.y) * T
  const w = cols * T
  const h = rows * T
  const roofTop = Math.max(-ROOF_OVERHANG, Math.min(look.roofTop, Math.floor(h / 4)))
  const eaveRel = clampInt(h * look.wallAt, Math.min(h - 8, roofTop + 8), h - 8)
  const doorCol = Math.min(cols - 1, Math.max(0, Math.floor(b.door.x - b.pos.x)))
  const g: Geom = {
    x,
    y,
    w,
    h,
    eave: y + eaveRel,
    bottom: y + h,
    cols,
    doorCol,
    doorX: x + doorCol * T,
    glow: lit || night > 0.2,
    look,
  }
  drawRoof(ctx, x, y + roofTop, w, eaveRel - roofTop + 1, look)
  drawWall(ctx, g, x + 2, w - 4)
  DETAILS[b.kind]?.(ctx, g)
}

// ---------------------------------------------------------------------------
// Fernhollow tiles. Each paints one 16x16 tile at (px, py); animated ones take t in ms.

/** Which sides of a multi-tile lot or crossing a tile sits on, so stakes, strings and rails land only on the outside. */
export type TileEdges = { top?: boolean; right?: boolean; bottom?: boolean; left?: boolean }
const ALL_EDGES: TileEdges = { top: true, right: true, bottom: true, left: true }

const STAKE_COLORS = { k: PAL.outline, r: "#e8384c", w: PAL.plankLight, d: PAL.wood }

/** Dotted survey string along the outer edges and a stake on every outer corner. */
function drawSurvey(ctx: Ctx, px: number, py: number, e: TileEdges) {
  ctx.fillStyle = PAL.white
  for (let i = 0; i < 16; i += 2) {
    if (e.top) ctx.fillRect(px + i, py + 2, 1, 1)
    if (e.bottom) ctx.fillRect(px + i, py + 11, 1, 1)
  }
  for (let i = 1; i < 16; i += 2) {
    if (e.left) ctx.fillRect(px + 1, py + i, 1, 1)
    if (e.right) ctx.fillRect(px + 14, py + i, 1, 1)
  }
  if (e.top && e.left) paint(ctx, STAKE, STAKE_COLORS, px, py)
  if (e.top && e.right) paint(ctx, STAKE, STAKE_COLORS, px + 13, py)
  if (e.bottom && e.left) paint(ctx, STAKE, STAKE_COLORS, px, py + 9)
  if (e.bottom && e.right) paint(ctx, STAKE, STAKE_COLORS, px + 13, py + 9)
}

/** Tile coordinates for the stable noise when a painter only gets pixels. */
const tileOf = (p: number) => Math.floor(p / T)

/** Tilled soil in four ridges with a row of crops; the growth stage varies from tile to tile. */
export function drawField(ctx: Ctx, px: number, py: number, tx: number, ty: number) {
  ctx.fillStyle = PAL.soil
  ctx.fillRect(px, py, 16, 16)
  const stage = Math.floor(hash(tx, ty, 111) * 3)
  for (let r = 0; r < 4; r++) {
    const ry = py + r * 4
    ctx.fillStyle = PAL.soilLight
    ctx.fillRect(px, ry, 16, 1)
    ctx.fillStyle = PAL.soilDark
    ctx.fillRect(px, ry + 3, 16, 1)
    if (hash(tx, ty, 120 + r) > 0.6) {
      ctx.fillStyle = PAL.soilDark
      ctx.fillRect(px + Math.floor(hash(tx, ty, 130 + r) * 14), ry + 1, 1, 1)
    }
    for (let cx = 1 + (r % 2) * 2; cx < 15; cx += 4) {
      const x = px + cx
      if (stage === 0) {
        ctx.fillStyle = PAL.crop
        ctx.fillRect(x, ry + 1, 1, 1)
        ctx.fillStyle = PAL.cropLight
        ctx.fillRect(x + 1, ry, 1, 1)
      } else {
        ctx.fillStyle = PAL.cropDark
        ctx.fillRect(x, ry + 1, 3, 1)
        ctx.fillRect(x + 1, ry + 2, 1, 1)
        ctx.fillStyle = PAL.crop
        ctx.fillRect(x, ry, 1, 1)
        ctx.fillRect(x + 2, ry, 1, 1)
        ctx.fillStyle = PAL.cropLight
        ctx.fillRect(x + 1, ry, 1, 1)
        if (stage === 2 && hash(tx * 7 + cx, ty * 5 + r, 140) > 0.45) {
          // Ripe: a little red fruit hanging off the plant.
          ctx.fillStyle = PAL.berry
          ctx.fillRect(x + 2, ry + 1, 1, 2)
        }
      }
    }
  }
}

/** The plaza fountain: a round stone basin, a centre spout and water that ripples and splashes. */
export function drawFountain(ctx: Ctx, px: number, py: number, t: number) {
  const f = Math.floor(t / 180) % 4
  ctx.fillStyle = "rgba(0,0,0,0.22)"
  ctx.fillRect(px + 2, py + 15, 12, 1)
  // Basin rim, an octagon in outline, stone, and a darker front face.
  ctx.fillStyle = PAL.outline
  ctx.fillRect(px + 3, py + 5, 10, 11)
  ctx.fillRect(px + 1, py + 7, 14, 7)
  ctx.fillRect(px + 2, py + 6, 12, 9)
  ctx.fillStyle = PAL.stone
  ctx.fillRect(px + 3, py + 6, 10, 8)
  ctx.fillRect(px + 2, py + 7, 12, 6)
  ctx.fillStyle = PAL.white
  ctx.fillRect(px + 4, py + 6, 3, 1)
  ctx.fillStyle = PAL.stoneDark
  ctx.fillRect(px + 2, py + 12, 12, 2)
  ctx.fillRect(px + 3, py + 14, 10, 1)
  // Water in the bowl.
  ctx.fillStyle = PAL.waterDark
  ctx.fillRect(px + 4, py + 8, 8, 4)
  ctx.fillRect(px + 3, py + 9, 10, 2)
  ctx.fillStyle = PAL.water
  ctx.fillRect(px + 4, py + 9, 8, 2)
  ctx.fillStyle = PAL.waterLight
  ctx.fillRect(px + 4 + f, py + 9, 2, 1)
  ctx.fillRect(px + 10 - f, py + 10, 2, 1)
  // Spout column and its top bowl.
  ctx.fillStyle = PAL.outline
  ctx.fillRect(px + 6, py + 3, 4, 7)
  ctx.fillRect(px + 5, py + 3, 6, 2)
  ctx.fillStyle = PAL.stone
  ctx.fillRect(px + 7, py + 5, 2, 4)
  ctx.fillRect(px + 6, py + 3, 4, 1)
  ctx.fillStyle = PAL.white
  ctx.fillRect(px + 7, py + 5, 1, 2)
  // The jet and its falling drops, stepping through four frames.
  ctx.fillStyle = PAL.waterLight
  ctx.fillRect(px + 7, py + (f % 2), 2, 3 - (f % 2))
  ctx.fillStyle = PAL.white
  ctx.fillRect(px + 7 + (f % 2), py + (f % 2), 1, 1)
  ctx.fillStyle = PAL.waterLight
  const drops: [number, number][] = [
    [5, 2],
    [10, 2],
    [4, 4],
    [11, 4],
  ]
  const [a, b] = [drops[f], drops[(f + 2) % 4]]
  ctx.fillRect(px + a[0], py + a[1], 1, 1)
  ctx.fillRect(px + b[0], py + b[1] + 1, 1, 1)
}

/** The plaza notice board: a small roofed board on two posts with papers pinned to it. */
export function drawBoard(ctx: Ctx, px: number, py: number) {
  ctx.fillStyle = "rgba(0,0,0,0.22)"
  ctx.fillRect(px + 2, py + 14, 12, 2)
  ctx.fillStyle = PAL.outline
  ctx.fillRect(px + 3, py + 9, 3, 7)
  ctx.fillRect(px + 10, py + 9, 3, 7)
  ctx.fillStyle = PAL.wood
  ctx.fillRect(px + 4, py + 9, 1, 6)
  ctx.fillRect(px + 11, py + 9, 1, 6)
  // Board and its little roof.
  ctx.fillStyle = PAL.outline
  ctx.fillRect(px + 1, py + 2, 14, 10)
  ctx.fillRect(px, py + 1, 16, 3)
  ctx.fillStyle = PAL.plank
  ctx.fillRect(px + 2, py + 4, 12, 7)
  ctx.fillStyle = PAL.plankDark
  ctx.fillRect(px + 2, py + 10, 12, 1)
  ctx.fillStyle = PAL.roofDark
  ctx.fillRect(px + 1, py + 2, 14, 1)
  ctx.fillStyle = PAL.roof
  ctx.fillRect(px + 1, py + 1, 14, 1)
  // Papers, each with a pin and a line of writing.
  const sheets: [number, number, number, number, string][] = [
    [3, 5, 4, 5, PAL.white],
    [8, 4, 5, 4, PAL.paper],
    [9, 9, 3, 2, PAL.white],
  ]
  for (const [sx, sy, sw, sh, color] of sheets) {
    ctx.fillStyle = color
    ctx.fillRect(px + sx, py + sy, sw, sh)
    ctx.fillStyle = PAL.stone
    ctx.fillRect(px + sx + 1, py + sy + 2, sw - 2, 1)
  }
  ctx.fillStyle = PAL.cross
  ctx.fillRect(px + 4, py + 5, 1, 1)
  ctx.fillRect(px + 10, py + 4, 1, 1)
  ctx.fillStyle = PAL.policeRoof
  ctx.fillRect(px + 10, py + 9, 1, 1)
}

/** The pond dock: boards over water on four posts. */
export function drawDock(ctx: Ctx, px: number, py: number) {
  ctx.fillStyle = PAL.water
  ctx.fillRect(px, py, 16, 16)
  ctx.fillStyle = PAL.waterLight
  ctx.fillRect(px, py + 5, 1, 1)
  ctx.fillRect(px + 15, py + 11, 1, 1)
  // Posts show at the corners and under the far end.
  ctx.fillStyle = PAL.outline
  ctx.fillRect(px + 2, py + 12, 3, 4)
  ctx.fillRect(px + 11, py + 12, 3, 4)
  ctx.fillStyle = PAL.woodDark
  ctx.fillRect(px + 3, py + 12, 1, 3)
  ctx.fillRect(px + 12, py + 12, 1, 3)
  ctx.fillStyle = PAL.waterLight
  ctx.fillRect(px + 2, py + 15, 3, 1)
  ctx.fillRect(px + 11, py + 15, 3, 1)
  // Deck boards laid across, each with a lit top edge and a dark gap.
  ctx.fillStyle = PAL.outline
  ctx.fillRect(px + 1, py, 14, 13)
  for (let r = 0; r < 4; r++) {
    const by = py + r * 3
    ctx.fillStyle = PAL.plankLight
    ctx.fillRect(px + 2, by, 12, 1)
    ctx.fillStyle = PAL.plank
    ctx.fillRect(px + 2, by + 1, 12, 1)
    ctx.fillStyle = PAL.plankDark
    ctx.fillRect(px + 2, by + 2, 12, 1)
    ctx.fillStyle = PAL.woodDark
    ctx.fillRect(px + 4 + ((r * 5) % 8), by + 1, 1, 1)
  }
  ctx.fillStyle = PAL.woodDark
  ctx.fillRect(px + 2, py + 12, 12, 1)
}

const HEADSTONE: PixelMap = ["..kkk..", ".kwssk.", "kwsdssk", "kwdddsk", "kssdsdk", "kssdsdk", "ksssddk", "kssssdk", "kkkkkkk"]

/** A small grey headstone with a carved cross, on a mound of grass. */
export function drawGrave(ctx: Ctx, px: number, py: number) {
  drawGrass(ctx, px, py, tileOf(px), tileOf(py))
  ctx.fillStyle = "rgba(20,60,30,0.25)"
  ctx.fillRect(px + 3, py + 12, 11, 3)
  ctx.fillStyle = PAL.grassDark
  ctx.fillRect(px + 4, py + 11, 9, 3)
  ctx.fillRect(px + 3, py + 12, 11, 1)
  paint(ctx, HEADSTONE, { k: PAL.outline, w: PAL.white, s: PAL.stone, d: PAL.stoneDark }, px + 5, py + 3)
}

/** A wooden post-and-rail fence across the tile, on grass. The rails run edge to edge so fences join. */
export function drawFence(ctx: Ctx, px: number, py: number, tx: number, ty: number) {
  drawGrass(ctx, px, py, tx, ty)
  ctx.fillStyle = "rgba(20,60,30,0.25)"
  ctx.fillRect(px, py + 13, 16, 2)
  for (const ry of [5, 9]) {
    ctx.fillStyle = PAL.outline
    ctx.fillRect(px, py + ry, 16, 3)
    ctx.fillStyle = PAL.plankLight
    ctx.fillRect(px, py + ry + 1, 16, 1)
  }
  for (const fx of [2, 10]) {
    ctx.fillStyle = PAL.outline
    ctx.fillRect(px + fx, py + 3, 4, 11)
    ctx.fillRect(px + fx + 1, py + 2, 2, 1)
    ctx.fillStyle = PAL.plank
    ctx.fillRect(px + fx + 1, py + 3, 2, 10)
    ctx.fillStyle = PAL.plankLight
    ctx.fillRect(px + fx + 1, py + 3, 1, 10)
    ctx.fillStyle = PAL.plankDark
    ctx.fillRect(px + fx + 1, py + 12, 2, 1)
  }
}

/** The ford: shallow water over a sandy bed, with flat stepping stones and ripples that move. */
export function drawFord(ctx: Ctx, px: number, py: number, tx: number, ty: number, t: number) {
  ctx.fillStyle = PAL.shallow
  ctx.fillRect(px, py, 16, 16)
  ctx.fillStyle = PAL.sandDark
  for (let i = 0; i < 5; i++) {
    ctx.fillRect(px + Math.floor(hash(tx, ty, 150 + i) * 15), py + Math.floor(hash(tx, ty, 160 + i) * 15), 1, 1)
  }
  const phase = Math.floor(t / 400)
  ctx.fillStyle = PAL.waterLight
  for (let i = 0; i < 2; i++) {
    const wy = py + 3 + i * 8
    const wx = px + ((Math.floor(hash(tx, ty, 170 + i) * 12) + phase + i * 5) % 13)
    ctx.fillRect(wx, wy, 3, 1)
  }
  // Two stones per tile, placed so the stones of neighbouring ford tiles make a crossing.
  const off = Math.floor(hash(tx, ty, 180) * 3)
  const stones: [number, number][] = [
    [1 + off, 4 + off],
    [9 - off, 10 - off],
  ]
  const foam = Math.floor(t / 300) % 2
  for (const [sx, sy] of stones) {
    const x = px + sx
    const y = py + sy
    ctx.fillStyle = PAL.white
    ctx.fillRect(x - 1 + foam * 7, y + 2, 1, 1)
    ctx.fillStyle = PAL.shallowDark
    ctx.fillRect(x, y + 3, 6, 1)
    ctx.fillStyle = PAL.outline
    ctx.fillRect(x, y, 6, 3)
    ctx.fillRect(x + 1, y - 1, 4, 5)
    ctx.fillStyle = PAL.stone
    ctx.fillRect(x + 1, y, 4, 2)
    ctx.fillStyle = PAL.stoneDark
    ctx.fillRect(x + 1, y + 2, 4, 1)
    ctx.fillStyle = PAL.white
    ctx.fillRect(x + 1, y, 2, 1)
  }
}

/** Creek water where the footbridge will go, with survey stakes and string marking the span. */
export function drawBridgeLot(ctx: Ctx, px: number, py: number, t: number, edges: TileEdges = ALL_EDGES) {
  drawWater(ctx, px, py, tileOf(px), tileOf(py), t)
  drawSurvey(ctx, px, py, edges)
}

/**
 * The footbridge while it is being built, over still water. Below 1/3 only pilings stand in the creek;
 * from 1/3 two stringers span them; from 2/3 deck boards are laid from the west, more as progress rises.
 */
export function drawScaffold(ctx: Ctx, px: number, py: number, progress: number) {
  const p = clamp01(progress)
  drawWater(ctx, px, py, tileOf(px), tileOf(py), 0)
  const stage = p < 1 / 3 ? 0 : p < 2 / 3 ? 1 : 2
  // Pilings with a ring of ripples where they meet the water.
  for (const [x, y] of [
    [2, 1],
    [11, 1],
    [2, 9],
    [11, 9],
  ]) {
    ctx.fillStyle = PAL.waterLight
    ctx.fillRect(px + x - 1, py + y + 5, 5, 1)
    ctx.fillStyle = PAL.outline
    ctx.fillRect(px + x, py + y, 3, 6)
    ctx.fillStyle = PAL.wood
    ctx.fillRect(px + x + 1, py + y + 1, 1, 4)
    ctx.fillStyle = PAL.plankLight
    ctx.fillRect(px + x + 1, py + y, 1, 1)
  }
  if (stage === 0) return
  // Stringers run edge to edge so neighbouring scaffold tiles join up.
  for (const y of [2, 10]) {
    ctx.fillStyle = PAL.outline
    ctx.fillRect(px, py + y, 16, 3)
    ctx.fillStyle = PAL.wood
    ctx.fillRect(px, py + y + 1, 16, 1)
    ctx.fillStyle = PAL.plankLight
    ctx.fillRect(px, py + y, 16, 1)
  }
  if (stage === 1) {
    // Cross braces between the stringers.
    ctx.fillStyle = PAL.woodDark
    for (let i = 0; i < 6; i++) {
      ctx.fillRect(px + 4 + i, py + 4 + i, 1, 1)
      ctx.fillRect(px + 11 - i, py + 4 + i, 1, 1)
    }
    return
  }
  // Deck boards, three px wide, laid from the west edge.
  const boards = 1 + Math.min(4, Math.floor(((p - 2 / 3) / (1 / 3)) * 5))
  for (let i = 0; i < boards; i++) {
    const bx = px + i * 3
    ctx.fillStyle = PAL.outline
    ctx.fillRect(bx, py + 1, 3, 14)
    ctx.fillStyle = PAL.plank
    ctx.fillRect(bx, py + 2, 2, 12)
    ctx.fillStyle = PAL.plankLight
    ctx.fillRect(bx, py + 2, 1, 12)
  }

}

/**
 * The finished plank footbridge. Boards run across the tile so bridge tiles join edge to edge;
 * `edges.top` and `edges.bottom` add the handrails, and water shows beyond them.
 */
export function drawBridge(ctx: Ctx, px: number, py: number, edges: TileEdges = ALL_EDGES) {
  drawWater(ctx, px, py, tileOf(px), tileOf(py), 0)
  const top = edges.top ? py + 2 : py
  const bottom = edges.bottom ? py + 14 : py + 16
  ctx.fillStyle = PAL.outline
  ctx.fillRect(px, top, 16, bottom - top)
  for (let bx = px; bx < px + 16; bx += 4) {
    ctx.fillStyle = PAL.plank
    ctx.fillRect(bx, top + (edges.top ? 1 : 0), 3, bottom - top - (edges.top ? 1 : 0) - (edges.bottom ? 1 : 0))
    ctx.fillStyle = PAL.plankLight
    ctx.fillRect(bx, top + (edges.top ? 1 : 0), 1, bottom - top - (edges.top ? 1 : 0) - (edges.bottom ? 1 : 0))
  }
  // A nail line along the deck, then each rail with its posts.
  ctx.fillStyle = PAL.woodDark
  for (let bx = px + 1; bx < px + 16; bx += 4) ctx.fillRect(bx + 1, py + 8, 1, 1)
  if (edges.bottom) {
    ctx.fillStyle = PAL.woodDark
    ctx.fillRect(px, bottom - 2, 16, 1)
  }
  for (const [on, ry] of [
    [edges.top, py],
    [edges.bottom, py + 10],
  ] as const) {
    if (!on) continue
    ctx.fillStyle = PAL.outline
    ctx.fillRect(px, ry, 16, 3)
    ctx.fillRect(px + 1, ry, 3, 6)
    ctx.fillRect(px + 9, ry, 3, 6)
    ctx.fillStyle = PAL.wood
    ctx.fillRect(px, ry + 1, 16, 1)
    ctx.fillRect(px + 2, ry + 1, 1, 4)
    ctx.fillRect(px + 10, ry + 1, 1, 4)
    ctx.fillStyle = PAL.plankLight
    ctx.fillRect(px + 2, ry + 1, 1, 1)
    ctx.fillRect(px + 10, ry + 1, 1, 1)
  }
}

/**
 * An empty building lot: bare, trampled earth with a few pebbles and weeds. Outer edges get the
 * survey string and outer corners a stake, so a 4x3 lot reads as one staked plot.
 */
export function drawLot(ctx: Ctx, px: number, py: number, tx: number, ty: number, edges: TileEdges = ALL_EDGES) {
  ctx.fillStyle = PAL.pathDark
  ctx.fillRect(px, py, 16, 16)
  for (let i = 0; i < 6; i++) {
    ctx.fillStyle = i % 3 === 0 ? PAL.path : i % 3 === 1 ? PAL.sandDark : PAL.soilLight
    ctx.fillRect(px + Math.floor(hash(tx, ty, 190 + i) * 15), py + Math.floor(hash(tx, ty, 200 + i) * 15), 1, 1)
  }
  if (hash(tx, ty, 210) > 0.5) {
    const x = px + 3 + Math.floor(hash(tx, ty, 211) * 9)
    const y = py + 4 + Math.floor(hash(tx, ty, 212) * 8)
    ctx.fillStyle = PAL.stoneDark
    ctx.fillRect(x, y, 2, 1)
    ctx.fillStyle = PAL.stone
    ctx.fillRect(x, y - 1, 1, 1)
  }
  if (hash(tx, ty, 213) > 0.55) {
    const x = px + 3 + Math.floor(hash(tx, ty, 214) * 9)
    const y = py + 5 + Math.floor(hash(tx, ty, 215) * 7)
    ctx.fillStyle = PAL.grassDark
    ctx.fillRect(x, y, 1, 2)
    ctx.fillRect(x + 2, y, 1, 2)
    ctx.fillRect(x + 1, y + 1, 1, 1)
  }
  drawSurvey(ctx, px, py, edges)
}

// ---------------------------------------------------------------------------
// Characters: 16x16, 2-frame walk, left is a mirrored right.

const FRONT: PixelMap = [
  "................",
  ".....kkkkkk.....",
  "....khhhhhhk....",
  "...khhhhhhhhk...",
  "...khhhhhhhhk...",
  "...khsssssshk...",
  "...ksesssssesk..",
  "...kssssssssk...",
  "....kssssssk....",
  "...kcccccccck...",
  "..ksccccccccsk..",
  "..kscccccccsk...",
  "...kppppppppk...",
  "...kpppkkpppk...",
  "....kkk..kkk....",
  "................",
]
const BACK: PixelMap = [
  "................",
  ".....kkkkkk.....",
  "....khhhhhhk....",
  "...khhhhhhhhk...",
  "...khhhhhhhhk...",
  "...khhhhhhhhk...",
  "...khhhhhhhhk...",
  "...khhhhhhhhk...",
  "....khhhhhhk....",
  "...kcccccccck...",
  "..kscccccccsk...",
  "..kscccccccsk...",
  "...kppppppppk...",
  "...kpppkkpppk...",
  "....kkk..kkk....",
  "................",
]
const SIDE: PixelMap = [
  "................",
  ".....kkkkkk.....",
  "....khhhhhhk....",
  "...khhhhhhhhk...",
  "...khhhhhhhhk...",
  "...khhhhhsssk...",
  "...khhhhssesk...",
  "...khhhhssssk...",
  "....khsssssk....",
  "....kcccccck....",
  "....kccsccck....",
  "....kccsccck....",
  "....kppppppk....",
  "....kppkkppk....",
  ".....kk..kk.....",
  "................",
]
// Leg rows (13 and 14) swapped in for the walk frames.
const WALK_FRONT: [string, string][] = [
  ["...kpppk.kppk...", "....kkk...kk...."],
  ["...kppk.kpppk...", "....kk...kkk...."],
]
const WALK_SIDE: [string, string][] = [
  ["...kppk..kppk...", "...kk......kk..."],
  ["....kppkkppk....", ".....kkkkkk....."],
]

function framed(base: PixelMap, legs: [string, string] | null): PixelMap {
  if (!legs) return base
  return [...base.slice(0, 13), legs[0], legs[1], base[15]]
}

export function drawCharacter(
  ctx: Ctx,
  persona: Persona,
  px: number,
  py: number,
  facing: Dir,
  walkFrame: 0 | 1 | null,
) {
  const colors = {
    k: PAL.outline,
    e: PAL.outline,
    h: persona.colors.hair,
    s: persona.colors.skin,
    c: persona.colors.shirt,
    p: persona.colors.pants,
  }
  ctx.fillStyle = "rgba(0,0,0,0.22)"
  ctx.fillRect(px + 4, py + 14, 8, 2)
  ctx.fillRect(px + 3, py + 15, 10, 1)
  const bob = walkFrame === null ? 0 : -1
  if (facing === "down" || facing === "up") {
    const base = facing === "down" ? FRONT : BACK
    paint(ctx, framed(base, walkFrame === null ? null : WALK_FRONT[walkFrame]), colors, px, py + bob)
  } else {
    paint(ctx, framed(SIDE, walkFrame === null ? null : WALK_SIDE[walkFrame]), colors, px, py + bob, facing === "left")
  }
}

// Children: the same build, 12x12 with a big head, drawn feet-down on the same 16x16 tile.
const CHILD_FRONT: PixelMap = [
  "...kkkkkk...",
  "..khhhhhhk..",
  ".khhhhhhhhk.",
  ".khsssssshk.",
  ".ksessssesk.",
  "..kssssssk..",
  "..kcccccck..",
  ".ksccccccsk.",
  "..kcccccck..",
  "..kppppppk..",
  "..kppkkppk..",
  "...kk..kk...",
]
const CHILD_BACK: PixelMap = [
  "...kkkkkk...",
  "..khhhhhhk..",
  ".khhhhhhhhk.",
  ".khhhhhhhhk.",
  ".khhhhhhhhk.",
  "..khhhhhhk..",
  "..kcccccck..",
  ".ksccccccsk.",
  "..kcccccck..",
  "..kppppppk..",
  "..kppkkppk..",
  "...kk..kk...",
]
const CHILD_SIDE: PixelMap = [
  "...kkkkkk...",
  "..khhhhhhk..",
  ".khhhhhhhhk.",
  ".khhhhhsssk.",
  ".khhhhssesk.",
  "..khhssssk..",
  "..kcccccck..",
  "..kccsccck..",
  "..kcccccck..",
  "..kppppppk..",
  "..kppkkppk..",
  "...kk..kk...",
]
// Leg rows (10 and 11) for the two walk frames.
const CHILD_WALK_FRONT: [string, string][] = [
  ["..kppk.kpk..", "...kk...k..."],
  ["..kpk.kppk..", "...k...kk..."],
]
const CHILD_WALK_SIDE: [string, string][] = [
  [".kppk..kppk.", ".kk......kk."],
  ["..kppkkppk..", "...kkkkkk..."],
]

function childFramed(base: PixelMap, legs: [string, string] | null): PixelMap {
  if (!legs) return base
  return [...base.slice(0, 10), legs[0], legs[1]]
}

/** A child (Kit, Tansy): 12 px tall, centred on the tile with the feet on the same row as an adult's. */
export function drawChild(ctx: Ctx, persona: Persona, px: number, py: number, facing: Dir, walkFrame: 0 | 1 | null) {
  const colors = {
    k: PAL.outline,
    e: PAL.outline,
    h: persona.colors.hair,
    s: persona.colors.skin,
    c: persona.colors.shirt,
    p: persona.colors.pants,
  }
  ctx.fillStyle = "rgba(0,0,0,0.22)"
  ctx.fillRect(px + 5, py + 14, 6, 2)
  ctx.fillRect(px + 4, py + 15, 8, 1)
  const bob = walkFrame === null ? 0 : -1
  const x = px + 2
  const y = py + 3 + bob
  if (facing === "down" || facing === "up") {
    const base = facing === "down" ? CHILD_FRONT : CHILD_BACK
    paint(ctx, childFramed(base, walkFrame === null ? null : CHILD_WALK_FRONT[walkFrame]), colors, x, y)
  } else {
    paint(ctx, childFramed(CHILD_SIDE, walkFrame === null ? null : CHILD_WALK_SIDE[walkFrame]), colors, x, y, facing === "left")
  }
}

// ---------------------------------------------------------------------------
// Emote bubbles (drawn above heads)

export type EmoteKind =
  | "dots"
  | "heart"
  | "zzz"
  | "exclaim"
  | "question"
  | "angry"
  | "berry"
  | "drop"
  | "note"
  | "sparkle"
  | "sweat"
  | "fire"
  | "hammer"
  | "coin"
  | "gift"
  | "eye"
  | "thought"
  | "sad"
  | "thanks"
  | "badge"
  | "cross"
  | "book"
  | "paper"
  | "beer"
  | "bell"

const ICONS: Record<EmoteKind, { map: PixelMap; colors: Record<string, string> }> = {
  dots: { map: [".......", ".......", ".......", "a.a.a..", ".......", "......."], colors: { a: PAL.outline } },
  heart: { map: [".rr.rr.", "rrrrrrr", "rrrrrrr", ".rrrrr.", "..rrr..", "...r..."], colors: { r: "#e8384c" } },
  zzz: { map: ["bbbb...", "..b....", ".b.....", "bbbb...", "....bbb", ".....b."], colors: { b: "#4a6ad8" } },
  exclaim: { map: ["...r...", "...r...", "...r...", "...r...", ".......", "...r..."], colors: { r: "#e8384c" } },
  question: { map: ["..bbb..", ".b...b.", "....b..", "...b...", ".......", "...b..."], colors: { b: "#4a6ad8" } },
  angry: { map: ["r.r.r..", ".rrr...", "rr.rr..", ".rrr...", "r.r.r..", "......."], colors: { r: "#e8384c" } },
  berry: { map: ["...g...", "..g....", ".rrr...", "rrrrr..", "rrrrr..", ".rrr..."], colors: { r: PAL.berry, g: "#3f9a45" } },
  drop: { map: ["...b...", "..bbb..", ".bbbbb.", ".bbwbb.", ".bbbbb.", "..bbb.."], colors: { b: "#3c86d0", w: PAL.white } },
  note: { map: ["..kkkk.", "..k..k.", "..k..k.", "kkk.kkk", "kkk.kkk", "......."], colors: { k: "#7a3ac8" } },
  sparkle: { map: ["...y...", "...y...", "yyyyyyy", "...y...", "...y...", "......."], colors: { y: "#f5a623" } },
  sweat: { map: [".....b.", "....bb.", "...bbb.", "...bbb.", "....b..", "......."], colors: { b: "#3c86d0" } },
  fire: { map: ["...o...", "..ooo..", ".oyoyo.", ".oyyyo.", "..ooo..", "......."], colors: { o: "#f8902c", y: "#ffe066" } },
  hammer: {
    map: ["sslsss.", ".sssss.", "...w...", "...w...", "...w...", "...d..."],
    colors: { s: PAL.stoneDark, l: PAL.stone, w: PAL.wood, d: PAL.woodDark },
  },
  coin: {
    map: ["..ooo..", ".owyyo.", ".oydyo.", ".oydyo.", ".oyyyo.", "..ooo.."],
    colors: { o: "#c8841c", y: "#ffd866", d: "#c8841c", w: PAL.white },
  },
  gift: {
    map: [".rr.rr.", "..rrr..", "bbbrbbb", ".bbrbb.", ".bbrbb.", ".ddrdd."],
    colors: { r: "#f5a623", b: "#4a6ad8", d: "#2f4aa8" },
  },
  eye: {
    map: ["..kkk..", ".kwbwk.", "kwbpbwk", ".kwbwk.", "..kkk..", "......."],
    colors: { k: PAL.outline, w: PAL.white, b: "#4a6ad8", p: PAL.outline },
  },
  thought: {
    map: ["..c.cc.", ".ccwccc", "ccccccc", ".ccccc.", ".......", "c......"],
    colors: { c: "#7a88c8", w: PAL.white },
  },
  sad: {
    map: [".ooooo.", "oykykyo", "oybyyyo", "oykkkyo", "okyyyko", ".ooooo."],
    colors: { o: "#f5a623", y: "#ffe066", k: PAL.outline, b: "#3c86d0" },
  },
  thanks: {
    map: [".pp.pp.", "pwppppp", ".ppppp.", "s.ppp.s", "ss.p.ss", ".sssss."],
    colors: { p: "#f25f8f", w: PAL.white, s: "#e0a070" },
  },
  // Police duty: a gold star on a blue shield.
  badge: {
    map: ["bbbbbbb", "bbbybbb", "byyyyyb", "bbyyybb", ".bybyb.", "..bbb.."],
    colors: { b: PAL.policeRoofDark, y: PAL.coin },
  },
  // Medical: a red cross.
  cross: {
    map: ["..rrr..", "..rlr..", "rrrrrrr", "rrrrrrr", "..rrr..", "..rrr.."],
    colors: { r: PAL.cross, l: PAL.crossLight },
  },
  // School and teaching: an open book.
  book: {
    map: [".bb.bb.", "bwwbwwb", "bllbllb", "bwwbwwb", "bbbbbbb", "...b..."],
    colors: { b: "#c0503a", w: PAL.paper, l: PAL.stone },
  },
  // News: a folded front page with a masthead and a picture.
  paper: {
    map: ["ggggggg", "gkkkkkg", "gwwwwwg", "gppwllg", "gppwwwg", "ggggggg"],
    colors: { g: PAL.stoneDark, k: PAL.ink, w: PAL.white, p: PAL.policeRoof, l: PAL.stone },
  },
  // The inn: a foaming mug.
  beer: {
    map: [".fff...", "kfffk..", "kyyykkk", "kyyyk.k", "kyyykkk", "kkkkk.."],
    colors: { k: PAL.woodDark, f: PAL.cream, y: "#f5b820" },
  },
  // The school bell or the chapel bell.
  bell: {
    map: ["...d...", "..yyy..", ".ylyyy.", ".yyyyy.", "yyyyyyy", "...d..."],
    colors: { y: "#f5b820", l: PAL.coinShine, d: PAL.woodDark },
  },
}

export function drawBubble(ctx: Ctx, kind: EmoteKind, px: number, py: number) {
  // 11x9 bubble with a tail; px/py is the bubble's top-left.
  ctx.fillStyle = PAL.outline
  ctx.fillRect(px + 1, py, 9, 9)
  ctx.fillRect(px, py + 1, 11, 7)
  ctx.fillRect(px + 4, py + 9, 3, 1)
  ctx.fillRect(px + 5, py + 10, 1, 1)
  ctx.fillStyle = PAL.white
  ctx.fillRect(px + 1, py + 1, 9, 7)
  ctx.fillRect(px + 5, py + 8, 1, 2)
  ctx.fillRect(px + 4, py + 8, 3, 1)
  const icon = ICONS[kind]
  paint(ctx, icon.map, icon.colors, px + 2, py + 2)
}

/** Exposed for the map-shape test. */
export const PIXEL_MAPS: Record<string, { map: PixelMap; width: number }> = {
  TREE: { map: TREE, width: 16 },
  BUSH: { map: BUSH, width: 16 },
  FRONT: { map: FRONT, width: 16 },
  BACK: { map: BACK, width: 16 },
  SIDE: { map: SIDE, width: 16 },
  WALK: { map: [...WALK_FRONT.flat(), ...WALK_SIDE.flat()], width: 16 },
  BASKET: { map: BASKET, width: 16 },
  STAKE: { map: STAKE, width: 3 },
  GRANARY_EMBLEM: { map: GRANARY_EMBLEM, width: 10 },
  STALL: { map: STALL, width: 32 },
  COIN: { map: COIN, width: 5 },
  RED_CROSS: { map: RED_CROSS, width: 7 },
  STAR_BADGE: { map: STAR_BADGE, width: 7 },
  KETTLE: { map: KETTLE, width: 9 },
  STEAM: { map: STEAM, width: 5 },
  LANTERN: { map: LANTERN, width: 7 },
  NEWSPAPER: { map: NEWSPAPER, width: 13 },
  SAW: { map: SAW, width: 12 },
  BELL: { map: BELL, width: 5 },
  LOFT: { map: LOFT, width: 7 },
  HEADSTONE: { map: HEADSTONE, width: 7 },
  CHILD_FRONT: { map: CHILD_FRONT, width: 12 },
  CHILD_BACK: { map: CHILD_BACK, width: 12 },
  CHILD_SIDE: { map: CHILD_SIDE, width: 12 },
  CHILD_WALK: { map: [...CHILD_WALK_FRONT.flat(), ...CHILD_WALK_SIDE.flat()], width: 12 },
  ...Object.fromEntries(Object.entries(ICONS).map(([k, v]) => [`ICON_${k}`, { map: v.map, width: 7 }])),
}
