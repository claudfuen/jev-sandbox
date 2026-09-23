// Procedural 16px pixel art in the spirit of the Game Boy Color era.
// Everything is drawn with fillRect on integer world pixels, then scaled.

import type { Dir, Persona } from "@/lib/sim/types"

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
  ...Object.fromEntries(Object.entries(ICONS).map(([k, v]) => [`ICON_${k}`, { map: v.map, width: 7 }])),
}
