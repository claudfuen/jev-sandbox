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
  white: "#ffffff",
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

export type EmoteKind = "dots" | "heart" | "zzz" | "exclaim" | "question" | "angry" | "berry" | "drop" | "note" | "sparkle" | "sweat" | "fire"

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
  ...Object.fromEntries(Object.entries(ICONS).map(([k, v]) => [`ICON_${k}`, { map: v.map, width: 7 }])),
}
