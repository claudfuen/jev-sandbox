import { describe, expect, test } from "bun:test"

import {
  drawBoard,
  drawBridge,
  drawBridgeLot,
  drawBubble,
  drawBuilding,
  drawCarry,
  drawCharacter,
  drawChild,
  drawCoins,
  drawDock,
  drawFence,
  drawField,
  drawFord,
  drawFountain,
  drawGrave,
  drawGranary,
  drawGranarySite,
  drawLot,
  drawScaffold,
  drawStall,
  drawStoreBasket,
  PAL,
  PIXEL_MAPS,
  ROOF_COLORS,
  ROOF_OVERHANG,
  type BuildingSprite,
  type EmoteKind,
  type TileEdges,
} from "@/components/sandbox/sprites"
import type { BuildingKind, Persona } from "@/lib/sim/types"

type Rect = { x: number; y: number; w: number; h: number; style: string }

/** Minimal stand-in for a 2D context: records every fillRect with the fillStyle in effect. */
function fakeCtx() {
  const rects: Rect[] = []
  const noop = () => {}
  const ctx = {
    fillStyle: "#000000" as string,
    strokeStyle: "#000000",
    globalAlpha: 1,
    imageSmoothingEnabled: false,
    fillRect(x: number, y: number, w: number, h: number) {
      rects.push({ x, y, w, h, style: String(this.fillStyle) })
    },
    clearRect: noop,
    strokeRect: noop,
    beginPath: noop,
    closePath: noop,
    moveTo: noop,
    lineTo: noop,
    fill: noop,
    stroke: noop,
    save: noop,
    restore: noop,
    translate: noop,
    scale: noop,
    drawImage: noop,
  }
  return { ctx: ctx as unknown as CanvasRenderingContext2D, rects }
}

/** Every rect is on integer pixels, uses a flat colour, and stays inside the footprint. */
function expectPixelArt(rects: Rect[], ox: number, oy: number, w: number, h: number) {
  for (const r of rects) {
    for (const v of [r.x, r.y, r.w, r.h]) expect(Number.isInteger(v)).toBe(true)
    expect(r.w).toBeGreaterThan(0)
    expect(r.h).toBeGreaterThan(0)
    expect(r.style).toMatch(/^(#[0-9a-f]{6}|rgba\(\d+,\d+,\d+,[\d.]+\))$/i)
    expect(r.x).toBeGreaterThanOrEqual(ox)
    expect(r.y).toBeGreaterThanOrEqual(oy)
    expect(r.x + r.w).toBeLessThanOrEqual(ox + w)
    expect(r.y + r.h).toBeLessThanOrEqual(oy + h)
  }
}

const countStyle = (rects: Rect[], style: string) => rects.filter((r) => r.style === style).length

const NEW_EMOTES: EmoteKind[] = ["hammer", "coin", "gift", "eye", "thought", "sad", "thanks"]
const TOWN_EMOTES: EmoteKind[] = ["badge", "cross", "book", "paper", "beer", "bell"]

describe("pixel maps", () => {
  for (const [name, { map, width }] of Object.entries(PIXEL_MAPS)) {
    test(`${name} rows are ${width} wide`, () => {
      expect(map.length).toBeGreaterThan(0)
      for (const row of map) expect(row.length).toBe(width)
    })
  }

  test("new sprite maps and emote icons are registered", () => {
    for (const name of ["BASKET", "STAKE", "GRANARY_EMBLEM", "STALL", "COIN", ...NEW_EMOTES.map((k) => `ICON_${k}`)]) {
      expect(PIXEL_MAPS[name]).toBeDefined()
    }
  })

  test("the stall map is 32 wide and 20 rows at most (16 px tile plus the 4 px awning)", () => {
    expect(PIXEL_MAPS.STALL.width).toBe(32)
    expect(PIXEL_MAPS.STALL.map.length).toBeLessThanOrEqual(20)
    expect(PIXEL_MAPS.COIN.width).toBe(5)
  })

  test("emote icons are 7 wide and 6 tall", () => {
    for (const [name, { map, width }] of Object.entries(PIXEL_MAPS)) {
      if (!name.startsWith("ICON_")) continue
      expect(width).toBe(7)
      expect(map.length).toBe(6)
    }
  })

  test("new emote icons are distinct from each other and from the existing ones", () => {
    const icons = Object.entries(PIXEL_MAPS).filter(([name]) => name.startsWith("ICON_"))
    const shapes = new Set(icons.map(([, { map }]) => map.join("/")))
    expect(shapes.size).toBe(icons.length)
  })
})

describe("granary site", () => {
  const stages = [0, 0.01, 0.2, 0.35, 0.5, 0.6, 0.75, 0.9, 1]

  for (const p of stages) {
    test(`progress ${p} draws pixel art inside the 48x32 footprint`, () => {
      const { ctx, rects } = fakeCtx()
      expect(() => drawGranarySite(ctx, 32, 48, p)).not.toThrow()
      expect(rects.length).toBeGreaterThan(0)
      expectPixelArt(rects, 32, 48, 48, 32)
    })
  }

  test("out-of-range and non-finite progress is clamped instead of throwing", () => {
    for (const p of [-1, 2, Number.NaN, Number.POSITIVE_INFINITY]) {
      const { ctx, rects } = fakeCtx()
      expect(() => drawGranarySite(ctx, 0, 0, p)).not.toThrow()
      expectPixelArt(rects, 0, 0, 48, 32)
    }
  })

  test("the progress bar fill grows with progress and is empty at 0", () => {
    const fillWidth = (p: number) => {
      const { ctx, rects } = fakeCtx()
      drawGranarySite(ctx, 0, 0, p)
      return rects.filter((r) => r.style === PAL.barFill).reduce((sum, r) => sum + r.w, 0)
    }
    expect(fillWidth(0)).toBe(0)
    expect(fillWidth(0.25)).toBeGreaterThan(0)
    expect(fillWidth(0.75)).toBeGreaterThan(fillWidth(0.25))
    expect(fillWidth(1)).toBe(38)
  })

  test("the frame gets taller as progress rises", () => {
    const topOfTimber = (p: number) => {
      const { ctx, rects } = fakeCtx()
      drawGranarySite(ctx, 0, 0, p)
      const timber = rects.filter((r) => r.style === PAL.woodDark && r.y < 23)
      return timber.length ? Math.min(...timber.map((r) => r.y)) : Infinity
    }
    expect(topOfTimber(0)).toBe(Infinity)
    expect(topOfTimber(0.3)).toBeLessThan(23)
    expect(topOfTimber(0.6)).toBeLessThan(topOfTimber(0.3))
    expect(topOfTimber(1)).toBeLessThan(topOfTimber(0.6))
  })
})

describe("granary", () => {
  test("draws pixel art inside the 48x32 footprint", () => {
    const { ctx, rects } = fakeCtx()
    expect(() => drawGranary(ctx, 16, 80)).not.toThrow()
    expect(rects.length).toBeGreaterThan(0)
    expectPixelArt(rects, 16, 80, 48, 32)
  })

  test("uses a thatch roof, not the red house roof", () => {
    const { ctx, rects } = fakeCtx()
    drawGranary(ctx, 0, 0)
    expect(countStyle(rects, PAL.thatch)).toBeGreaterThan(0)
    for (const red of [PAL.roof, PAL.roofDark, PAL.roofLight]) expect(countStyle(rects, red)).toBe(0)
  })
})

describe("store basket", () => {
  test("draws inside one tile for any berry count", () => {
    for (const n of [0, 1, 5, 12, 40, -3, Number.NaN]) {
      const { ctx, rects } = fakeCtx()
      expect(() => drawStoreBasket(ctx, 64, 16, n)).not.toThrow()
      expectPixelArt(rects, 64, 16, 16, 16)
    }
  })

  test("shows one berry per stored berry, capped at 12, empty at 0", () => {
    const shown = (n: number) => {
      const { ctx, rects } = fakeCtx()
      drawStoreBasket(ctx, 0, 0, n)
      return countStyle(rects, PAL.berry)
    }
    expect(shown(0)).toBe(0)
    expect(shown(1)).toBe(1)
    expect(shown(7)).toBe(7)
    expect(shown(12)).toBe(12)
    expect(shown(50)).toBe(12)
  })
})

describe("carried berries", () => {
  test("stays within a 6x6 box", () => {
    for (const n of [0, 1, 2, 3, 4, 9, -1, Number.NaN]) {
      const { ctx, rects } = fakeCtx()
      expect(() => drawCarry(ctx, 100, 50, n)).not.toThrow()
      expectPixelArt(rects, 100, 50, 6, 6)
    }
  })

  test("shows 1 to 4 berries and nothing when empty", () => {
    const shown = (n: number) => {
      const { ctx, rects } = fakeCtx()
      drawCarry(ctx, 0, 0, n)
      return { berries: countStyle(rects, PAL.berry), total: rects.length }
    }
    expect(shown(0)).toEqual({ berries: 0, total: 0 })
    for (const n of [1, 2, 3, 4]) expect(shown(n).berries).toBe(n)
    expect(shown(10).berries).toBe(4)
  })
})

describe("emote bubbles", () => {
  for (const kind of [...NEW_EMOTES, ...TOWN_EMOTES]) {
    test(`${kind} renders inside the 11x11 bubble`, () => {
      const { ctx, rects } = fakeCtx()
      expect(() => drawBubble(ctx, kind, 40, 20)).not.toThrow()
      expectPixelArt(rects, 40, 20, 11, 11)
    })
  }
})

describe("market stall", () => {
  const AWNING = new Set<string>([
    PAL.outline,
    PAL.awning,
    PAL.awningLight,
    PAL.awningDark,
    PAL.cream,
    PAL.creamLight,
    PAL.creamDark,
  ])

  const draw = (food: number, price: number, px = 0, py = 0) => {
    const { ctx, rects } = fakeCtx()
    drawStall(ctx, px, py, food, price)
    return rects
  }

  test("stays in its 32x16 footprint, with only the awning overhanging up to 4 px above", () => {
    for (const food of [0, 1, 4, 8, 30, -2, Number.NaN]) {
      for (const price of [0, 1, 2, 3, 4, 9, -1, Number.NaN, Number.POSITIVE_INFINITY]) {
        const { ctx, rects } = fakeCtx()
        expect(() => drawStall(ctx, 48, 64, food, price)).not.toThrow()
        expect(rects.length).toBeGreaterThan(0)
        expectPixelArt(rects, 48, 60, 32, 20)
        for (const r of rects.filter((r) => r.y < 64)) {
          expect(AWNING.has(r.style)).toBe(true)
          expect(r.y + r.h).toBeLessThanOrEqual(64)
        }
      }
    }
  })

  test("uses its own awning colours, not the red house roof or the granary thatch", () => {
    const rects = draw(8, 4)
    expect(countStyle(rects, PAL.awning)).toBeGreaterThan(0)
    expect(countStyle(rects, PAL.cream)).toBeGreaterThan(0)
    for (const other of [PAL.roof, PAL.roofDark, PAL.roofLight, PAL.thatch, PAL.thatchShade, PAL.thatchDark]) {
      expect(countStyle(rects, other)).toBe(0)
    }
  })

  test("shows one food item per unit of food, capped at 8, none at 0", () => {
    const shown = (food: number) => countStyle(draw(food, 1), PAL.berry)
    expect(shown(0)).toBe(0)
    for (const n of [1, 3, 5, 8]) expect(shown(n)).toBe(n)
    expect(shown(20)).toBe(8)
    expect(shown(-4)).toBe(0)
    expect(shown(Number.NaN)).toBe(0)
  })

  test("the price marker differs between price 1, 2 and 4", () => {
    const signature = (price: number) => draw(3, price).map((r) => `${r.x},${r.y},${r.w},${r.h},${r.style}`).join("|")
    const marks = [1, 2, 4].map(signature)
    expect(new Set(marks).size).toBe(3)
    // Food does not change with price, so the difference is the marker alone.
    expect(countStyle(draw(3, 1), PAL.berry)).toBe(countStyle(draw(3, 4), PAL.berry))
  })

  test("fair prices show that many gold coins; gouging shows a hot pile and no gold", () => {
    const coins = (price: number) => {
      const rects = draw(0, price)
      return { gold: countStyle(rects, PAL.coinShine), hot: countStyle(rects, PAL.coinHot) }
    }
    expect(coins(0)).toEqual({ gold: 0, hot: 0 })
    expect(coins(1)).toEqual({ gold: 1, hot: 0 })
    expect(coins(2)).toEqual({ gold: 2, hot: 0 })
    expect(coins(3).gold).toBe(1)
    expect(coins(3).hot).toBe(0)
    for (const p of [4, 7, Number.POSITIVE_INFINITY]) {
      expect(coins(p).gold).toBe(0)
      expect(coins(p).hot).toBeGreaterThan(0)
    }
  })
})

describe("coin pile", () => {
  test("stays within a 6x6 box", () => {
    for (const n of [0, 1, 2, 3, 7, -1, Number.NaN]) {
      const { ctx, rects } = fakeCtx()
      expect(() => drawCoins(ctx, 30, 40, n)).not.toThrow()
      expectPixelArt(rects, 30, 40, 6, 6)
    }
  })

  test("draws nothing at 0 and one coin rim per coin, capped at 3", () => {
    const rims = (n: number) => {
      const { ctx, rects } = fakeCtx()
      drawCoins(ctx, 0, 0, n)
      return { rims: countStyle(rects, PAL.coinEdge) + countStyle(rects, PAL.coinDark), total: rects.length }
    }
    expect(rims(0)).toEqual({ rims: 0, total: 0 })
    expect(rims(-2).total).toBe(0)
    for (const n of [1, 2, 3]) expect(rims(n).rims).toBe(n)
    expect(rims(12).rims).toBe(3)
  })
})

// ---------------------------------------------------------------------------
// Fernhollow town

/** Rects that break the pixel-art rules or leave the box; collected so thousands of draws stay fast. */
function violations(rects: Rect[], ox: number, oy: number, w: number, h: number) {
  return rects
    .filter(
      (r) =>
        ![r.x, r.y, r.w, r.h].every(Number.isInteger) ||
        r.w <= 0 ||
        r.h <= 0 ||
        !/^(#[0-9a-f]{6}|rgba\(\d+,\d+,\d+,[\d.]+\))$/i.test(r.style) ||
        r.x < ox ||
        r.y < oy ||
        r.x + r.w > ox + w ||
        r.y + r.h > oy + h,
    )
    .map((r) => `${r.x},${r.y} ${r.w}x${r.h} ${r.style}`)
}

const KINDS: BuildingKind[] = [
  "home",
  "farmhouse",
  "clinic",
  "police",
  "town_hall",
  "school",
  "chapel",
  "store",
  "diner",
  "inn",
  "crier",
  "workshop",
]
const CIVIC: BuildingKind[] = KINDS.filter((k) => k !== "home")

// The footprints and doors from the society spec, table 2.2.
const TOWN: BuildingSprite[] = [
  { kind: "clinic", pos: { x: 2, y: 9 }, size: { x: 5, y: 4 }, door: { x: 4, y: 12 } },
  { kind: "police", pos: { x: 8, y: 9 }, size: { x: 5, y: 4 }, door: { x: 10, y: 12 } },
  { kind: "town_hall", pos: { x: 14, y: 8 }, size: { x: 8, y: 5 }, door: { x: 17, y: 12 } },
  { kind: "school", pos: { x: 23, y: 9 }, size: { x: 6, y: 4 }, door: { x: 25, y: 12 } },
  { kind: "chapel", pos: { x: 30, y: 8 }, size: { x: 5, y: 5 }, door: { x: 32, y: 12 } },
  { kind: "store", pos: { x: 2, y: 16 }, size: { x: 5, y: 4 }, door: { x: 4, y: 19 } },
  { kind: "diner", pos: { x: 8, y: 16 }, size: { x: 5, y: 4 }, door: { x: 10, y: 19 } },
  { kind: "inn", pos: { x: 14, y: 16 }, size: { x: 7, y: 4 }, door: { x: 17, y: 19 } },
  { kind: "crier", pos: { x: 33, y: 16 }, size: { x: 4, y: 4 }, door: { x: 34, y: 19 } },
  { kind: "workshop", pos: { x: 32, y: 2 }, size: { x: 4, y: 3 }, door: { x: 33, y: 4 } },
  { kind: "home", pos: { x: 2, y: 2 }, size: { x: 4, y: 3 }, door: { x: 3, y: 4 } },
  { kind: "farmhouse", pos: { x: 12, y: 25 }, size: { x: 4, y: 3 }, door: { x: 13, y: 27 } },
]

const drawn = (b: BuildingSprite, lit = false, night = 0) => {
  const { ctx, rects } = fakeCtx()
  drawBuilding(ctx, b, lit, night)
  return rects
}

/** The footprint box in world pixels, with the roof overhang above it. */
const box = (b: BuildingSprite) =>
  [b.pos.x * 16, b.pos.y * 16 - ROOF_OVERHANG, b.size.x * 16, b.size.y * 16 + ROOF_OVERHANG] as const

describe("town buildings", () => {
  test("the spec's town covers every building kind", () => {
    expect(new Set(TOWN.map((b) => b.kind)).size).toBe(KINDS.length)
  })

  for (const b of TOWN) {
    test(`${b.kind} fills its ${b.size.x}x${b.size.y} footprint with at most a ${ROOF_OVERHANG} px roof overhang`, () => {
      for (const [lit, night] of [
        [false, 0],
        [true, 0],
        [false, 0.6],
      ] as const) {
        const rects = drawn(b, lit, night)
        expect(rects.length).toBeGreaterThan(20)
        expect(violations(rects, ...box(b))).toEqual([])
        // It really fills the footprint: something is drawn in the top rows and on the bottom row.
        const [x, , w] = box(b)
        const bottom = (b.pos.y + b.size.y) * 16
        expect(rects.some((r) => r.y <= b.pos.y * 16 + 8)).toBe(true)
        expect(rects.some((r) => r.y + r.h === bottom && r.x <= x + 2 && r.x + r.w >= x + w - 2)).toBe(true)
      }
    })
  }

  test("every kind stays in bounds at any size from 1x1 to 8x5 and any door column, without throwing", () => {
    const bad: string[] = []
    for (const kind of KINDS) {
      for (let sx = 1; sx <= 8; sx++) {
        for (let sy = 1; sy <= 5; sy++) {
          for (let dc = 0; dc < sx; dc++) {
            const b: BuildingSprite = { kind, pos: { x: 3, y: 2 }, size: { x: sx, y: sy }, door: { x: 3 + dc, y: 1 + sy } }
            for (const lit of [false, true]) {
              let rects: Rect[] = []
              try {
                rects = drawn(b, lit, 0)
              } catch (e) {
                bad.push(`${kind} ${sx}x${sy} door ${dc} threw ${String(e)}`)
                continue
              }
              const v = violations(rects, ...box(b))
              if (v.length) bad.push(`${kind} ${sx}x${sy} door ${dc}: ${v.slice(0, 3).join("; ")}`)
            }
          }
        }
      }
    }
    expect(bad).toEqual([])
  })

  test("a door outside the footprint is clamped to it", () => {
    for (const kind of KINDS) {
      const b: BuildingSprite = { kind, pos: { x: 1, y: 1 }, size: { x: 4, y: 3 }, door: { x: 40, y: 3 } }
      expect(violations(drawn(b), ...box(b))).toEqual([])
    }
  })

  test("the door is drawn on the door tile and reaches the ground", () => {
    for (const kind of KINDS) {
      for (const dc of [0, 1, 3]) {
        const b: BuildingSprite = { kind, pos: { x: 0, y: 0 }, size: { x: 5, y: 4 }, door: { x: dc, y: 3 } }
        const doorX = dc * 16
        const door = drawn(b).filter(
          (r) => r.y + r.h === 64 && r.h >= 8 && r.w >= 10 && r.w <= 14 && r.x >= doorX && r.x + r.w <= doorX + 16,
        )
        expect(door.length).toBeGreaterThan(0)
      }
    }
  })

  test("every kind has its own roof colour, distinct across the town", () => {
    expect(new Set(Object.values(ROOF_COLORS)).size).toBe(KINDS.length)
    for (const kind of KINDS) expect(ROOF_COLORS[kind]).toMatch(/^#[0-9a-f]{6}$/i)
    expect(ROOF_COLORS.home).toBe(PAL.roof)
  })

  test("each civic building paints its own roof colour and no other building's", () => {
    for (const b of TOWN) {
      const rects = drawn(b)
      expect(countStyle(rects, ROOF_COLORS[b.kind])).toBeGreaterThan(0)
      for (const other of KINDS) {
        if (other === b.kind) continue
        expect(countStyle(rects, ROOF_COLORS[other])).toBe(0)
      }
    }
    // The civic row in particular never borrows the red house roof.
    for (const kind of CIVIC) {
      const b = TOWN.find((t) => t.kind === kind)!
      expect(countStyle(drawn(b), PAL.roof)).toBe(0)
    }
  })

  test("lit windows use a different colour than unlit ones, and night lights them too", () => {
    expect(PAL.glassLit).not.toBe(PAL.glass)
    const area = (rects: Rect[], style: string) => rects.filter((r) => r.style === style).reduce((s, r) => s + r.w * r.h, 0)
    for (const b of TOWN) {
      const day = drawn(b, false, 0)
      const lit = drawn(b, true, 0)
      const night = drawn(b, false, 0.3)
      expect(area(day, PAL.glass)).toBeGreaterThan(0)
      expect(area(lit, PAL.glass)).toBe(0)
      expect(area(night, PAL.glass)).toBe(0)
      expect(area(lit, PAL.glassLit)).toBeGreaterThan(area(day, PAL.glassLit))
      expect(area(night, PAL.glassLit)).toBe(area(lit, PAL.glassLit))
      // Dusk below the threshold still reads as day.
      expect(area(drawn(b, false, 0.2), PAL.glass)).toBe(area(day, PAL.glass))
    }
  })

  test("the signature details are present", () => {
    const of = (kind: BuildingKind) => drawn(TOWN.find((t) => t.kind === kind)!)
    expect(countStyle(of("clinic"), PAL.cross)).toBeGreaterThan(0)
    expect(countStyle(of("police"), PAL.navy)).toBeGreaterThan(0)
    expect(countStyle(of("store"), PAL.cross)).toBeGreaterThan(0)
    expect(countStyle(of("store"), PAL.cream)).toBeGreaterThan(0)
    expect(countStyle(of("diner"), PAL.steel)).toBeGreaterThan(0)
    expect(countStyle(of("crier"), PAL.ink)).toBeGreaterThan(0)
    expect(countStyle(of("workshop"), PAL.steelLight)).toBeGreaterThan(0)
    expect(countStyle(of("farmhouse"), PAL.shutter)).toBeGreaterThan(0)
    // Flag, bell, steeple cross and chimneys rise into the overhang; plain roofs do not.
    for (const kind of ["town_hall", "school", "chapel", "home", "farmhouse"] as BuildingKind[]) {
      const b = TOWN.find((t) => t.kind === kind)!
      expect(drawn(b).some((r) => r.y < b.pos.y * 16)).toBe(true)
    }
    for (const kind of ["clinic", "police", "store", "diner", "inn", "crier", "workshop"] as BuildingKind[]) {
      const b = TOWN.find((t) => t.kind === kind)!
      expect(drawn(b).some((r) => r.y < b.pos.y * 16)).toBe(false)
    }
  })

  test("the inn's lantern glows when lit", () => {
    const inn = TOWN.find((t) => t.kind === "inn")!
    expect(countStyle(drawn(inn, false, 0), PAL.flame)).toBe(0)
    expect(countStyle(drawn(inn, true, 0), PAL.flame)).toBeGreaterThan(0)
  })
})

describe("town tiles", () => {
  const EDGE_SETS: TileEdges[] = [{}, { top: true }, { bottom: true, right: true }, { top: true, right: true, bottom: true, left: true }]
  const painters: [string, (ctx: CanvasRenderingContext2D, px: number, py: number, t: number) => void][] = [
    ["field", (c, x, y) => drawField(c, x, y, x / 16, y / 16)],
    ["fountain", (c, x, y, t) => drawFountain(c, x, y, t)],
    ["board", (c, x, y) => drawBoard(c, x, y)],
    ["dock", (c, x, y) => drawDock(c, x, y)],
    ["grave", (c, x, y) => drawGrave(c, x, y)],
    ["fence", (c, x, y) => drawFence(c, x, y, x / 16, y / 16)],
    ["ford", (c, x, y, t) => drawFord(c, x, y, x / 16, y / 16, t)],
    ["bridge lot", (c, x, y, t) => drawBridgeLot(c, x, y, t)],
    ["scaffold", (c, x, y, t) => drawScaffold(c, x, y, (t % 1000) / 1000)],
    ["bridge", (c, x, y) => drawBridge(c, x, y)],
    ["lot", (c, x, y) => drawLot(c, x, y, x / 16, y / 16)],
  ]

  for (const [name, paintTile] of painters) {
    test(`${name} paints pixel art inside its tile`, () => {
      for (const [tx, ty] of [
        [0, 0],
        [7, 3],
        [40, 13],
        [26, 17],
      ]) {
        for (const t of [0, 170, 400, 999, 12345]) {
          const { ctx, rects } = fakeCtx()
          expect(() => paintTile(ctx, tx * 16, ty * 16, t)).not.toThrow()
          expect(rects.length).toBeGreaterThan(0)
          expect(violations(rects, tx * 16, ty * 16, 16, 16)).toEqual([])
        }
      }
    })
  }

  test("edge-aware painters stay inside the tile for every edge set", () => {
    for (const e of EDGE_SETS) {
      for (const paintTile of [
        (c: CanvasRenderingContext2D) => drawBridgeLot(c, 32, 16, 0, e),
        (c: CanvasRenderingContext2D) => drawBridge(c, 32, 16, e),
        (c: CanvasRenderingContext2D) => drawLot(c, 32, 16, 2, 1, e),
      ]) {
        const { ctx, rects } = fakeCtx()
        paintTile(ctx)
        expect(violations(rects, 32, 16, 16, 16)).toEqual([])
      }
    }
  })

  test("the fountain and the ford animate", () => {
    const sig = (paintTile: (c: CanvasRenderingContext2D) => void) => {
      const { ctx, rects } = fakeCtx()
      paintTile(ctx)
      return rects.map((r) => `${r.x},${r.y},${r.w},${r.h},${r.style}`).join("|")
    }
    expect(sig((c) => drawFountain(c, 0, 0, 0))).not.toBe(sig((c) => drawFountain(c, 0, 0, 400)))
    expect(sig((c) => drawFord(c, 0, 0, 3, 4, 0))).not.toBe(sig((c) => drawFord(c, 0, 0, 3, 4, 900)))
  })

  test("the scaffold shows three distinct stages, with more timber as it rises", () => {
    const WOOD = new Set<string>([PAL.wood, PAL.woodDark, PAL.plank, PAL.plankLight])
    const timber = (p: number) => {
      const { ctx, rects } = fakeCtx()
      drawScaffold(ctx, 0, 0, p)
      return rects.filter((r) => WOOD.has(r.style)).reduce((s, r) => s + r.w * r.h, 0)
    }
    const stages = [0.1, 0.5, 0.9].map(timber)
    expect(stages[1]).toBeGreaterThan(stages[0])
    expect(stages[2]).toBeGreaterThan(stages[1])
    expect(timber(0.7)).toBeLessThan(timber(1))
    for (const p of [-1, Number.NaN, 5]) {
      const { ctx, rects } = fakeCtx()
      expect(() => drawScaffold(ctx, 0, 0, p)).not.toThrow()
      expect(violations(rects, 0, 0, 16, 16)).toEqual([])
    }
  })

  test("survey stakes mark only the outer corners of a lot", () => {
    const stakes = (e: TileEdges) => {
      const { ctx, rects } = fakeCtx()
      drawLot(ctx, 0, 0, 1, 1, e)
      return countStyle(rects, "#e8384c")
    }
    expect(stakes({})).toBe(0)
    expect(stakes({ top: true })).toBe(0)
    expect(stakes({ top: true, left: true })).toBe(1)
    expect(stakes({ top: true, right: true, bottom: true, left: true })).toBe(4)
  })

  test("the bridge's handrails follow its outer edges", () => {
    const railRows = (e: TileEdges) => {
      const { ctx, rects } = fakeCtx()
      drawBridge(ctx, 0, 0, e)
      return new Set(rects.filter((r) => r.style === PAL.wood && r.w === 16).map((r) => r.y))
    }
    expect(railRows({}).size).toBe(0)
    expect([...railRows({ top: true })]).toEqual([1])
    expect(railRows({ top: true, bottom: true }).size).toBe(2)
  })
})

describe("children", () => {
  const kid = { colors: { hair: "#6b3e26", skin: "#f5c9a0", shirt: "#f0b030", pants: "#3b4a8c" } } as unknown as Persona
  const figure = (draw: (c: CanvasRenderingContext2D) => void) => {
    const { ctx, rects } = fakeCtx()
    draw(ctx)
    const body = rects.filter((r) => !r.style.startsWith("rgba"))
    const top = Math.min(...body.map((r) => r.y))
    const bottom = Math.max(...body.map((r) => r.y + r.h))
    const left = Math.min(...body.map((r) => r.x))
    const right = Math.max(...body.map((r) => r.x + r.w))
    return { rects, height: bottom - top, width: right - left, bottom }
  }

  test("a child is 12 px tall, narrower than an adult, and stands on the same row", () => {
    for (const facing of ["down", "up", "left", "right"] as const) {
      const child = figure((c) => drawChild(c, kid, 32, 48, facing, null))
      const adult = figure((c) => drawCharacter(c, kid, 32, 48, facing, null))
      expect(child.height).toBe(12)
      expect(child.height).toBeLessThan(adult.height)
      expect(child.width).toBeLessThanOrEqual(adult.width)
      if (facing === "down" || facing === "up") expect(child.width).toBeLessThan(adult.width)
      expect(child.bottom).toBe(adult.bottom)
    }
  })

  test("walk frames bob and stay inside the tile", () => {
    for (const facing of ["down", "up", "left", "right"] as const) {
      for (const frame of [null, 0, 1] as const) {
        const { rects } = figure((c) => drawChild(c, kid, 16, 16, facing, frame))
        expect(violations(rects, 16, 16, 16, 16)).toEqual([])
      }
    }
  })

  test("the child uses the persona's colours", () => {
    const { rects } = figure((c) => drawChild(c, kid, 0, 0, "down", null))
    for (const color of Object.values(kid.colors)) expect(countStyle(rects, color)).toBeGreaterThan(0)
  })
})

describe("town pixel maps", () => {
  test("building glyphs, the headstone and the child maps are registered", () => {
    for (const name of [
      "RED_CROSS",
      "STAR_BADGE",
      "KETTLE",
      "STEAM",
      "LANTERN",
      "NEWSPAPER",
      "SAW",
      "BELL",
      "LOFT",
      "HEADSTONE",
      "CHILD_FRONT",
      "CHILD_BACK",
      "CHILD_SIDE",
      "CHILD_WALK",
      ...TOWN_EMOTES.map((k) => `ICON_${k}`),
    ]) {
      expect(PIXEL_MAPS[name]).toBeDefined()
    }
    for (const name of ["CHILD_FRONT", "CHILD_BACK", "CHILD_SIDE"]) expect(PIXEL_MAPS[name].map.length).toBe(12)
  })
})
