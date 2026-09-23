import { describe, expect, test } from "bun:test"

import {
  drawBubble,
  drawCarry,
  drawGranary,
  drawGranarySite,
  drawStoreBasket,
  PAL,
  PIXEL_MAPS,
  type EmoteKind,
} from "@/components/sandbox/sprites"

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

describe("pixel maps", () => {
  for (const [name, { map, width }] of Object.entries(PIXEL_MAPS)) {
    test(`${name} rows are ${width} wide`, () => {
      expect(map.length).toBeGreaterThan(0)
      for (const row of map) expect(row.length).toBe(width)
    })
  }

  test("new sprite maps and emote icons are registered", () => {
    for (const name of ["BASKET", "STAKE", "GRANARY_EMBLEM", ...NEW_EMOTES.map((k) => `ICON_${k}`)]) {
      expect(PIXEL_MAPS[name]).toBeDefined()
    }
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
  for (const kind of NEW_EMOTES) {
    test(`${kind} renders inside the 11x11 bubble`, () => {
      const { ctx, rects } = fakeCtx()
      expect(() => drawBubble(ctx, kind, 40, 20)).not.toThrow()
      expectPixelArt(rects, 40, 20, 11, 11)
    })
  }
})
