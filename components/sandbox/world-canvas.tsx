"use client"

import { useEffect, useRef, useState, type RefObject } from "react"

import { darkness } from "@/lib/sim/clock"
import { MAP_H, MAP_W, TILE, tileAt } from "@/lib/sim/map"
import type { Agent, World } from "@/lib/sim/types"

import {
  drawBubble,
  drawBush,
  drawCampfire,
  drawCharacter,
  drawFlowers,
  drawGrass,
  drawHouse,
  drawPath,
  drawRock,
  drawSand,
  drawSign,
  drawTallGrass,
  drawTree,
  drawWater,
  drawWell,
  PAL,
  type EmoteKind,
} from "./sprites"

const SCALE = 3
const W = MAP_W * TILE
const H = MAP_H * TILE

/** Everything that never changes, painted once. */
function paintStatic(world: World): HTMLCanvasElement {
  const canvas = document.createElement("canvas")
  canvas.width = W * SCALE
  canvas.height = H * SCALE
  const ctx = canvas.getContext("2d")!
  ctx.imageSmoothingEnabled = false
  ctx.scale(SCALE, SCALE)
  for (let ty = 0; ty < MAP_H; ty++) {
    for (let tx = 0; tx < MAP_W; tx++) {
      const px = tx * TILE
      const py = ty * TILE
      switch (tileAt(world.tiles, tx, ty)) {
        case "tallgrass":
          drawTallGrass(ctx, px, py)
          break
        case "flowers":
          drawFlowers(ctx, px, py, tx, ty)
          break
        case "path":
        case "door":
          drawPath(ctx, px, py, tx, ty)
          break
        case "sand":
          drawSand(ctx, px, py, tx, ty)
          break
        case "tree":
          drawTree(ctx, px, py, tx, ty)
          break
        case "rock":
          drawGrass(ctx, px, py, tx, ty)
          drawRock(ctx, px, py)
          break
        case "sign":
          drawGrass(ctx, px, py, tx, ty)
          drawSign(ctx, px, py)
          break
        case "well":
          drawPath(ctx, px, py, tx, ty)
          drawWell(ctx, px, py)
          break
        case "campfire":
          drawPath(ctx, px, py, tx, ty)
          break
        case "water":
          break
        default:
          drawGrass(ctx, px, py, tx, ty)
      }
    }
  }
  return canvas
}

function emoteFor(world: World, agent: Agent, t: number): EmoteKind | null {
  if (agent.flash) return agent.flash.kind
  const s = agent.status
  switch (s.kind) {
    case "deciding":
      return "dots"
    case "considering":
      return "question"
    case "asking":
      return "exclaim"
    case "chatting":
      return Math.floor(t / 600) % 2 ? "note" : "heart"
    case "acting":
      switch (s.intent.kind) {
        case "eat":
          return "berry"
        case "drink":
          return "drop"
        case "explore":
          return "sparkle"
        case "campfire":
          return "fire"
        default:
          return null
      }
    default:
      return null
  }
}

type Props = {
  worldRef: RefObject<World>
  alphaRef: RefObject<number>
  selectedId: string
  onSelect: (id: string) => void
}

/** Largest box with the world's aspect ratio that fits inside the frame. */
function useFit(frameRef: RefObject<HTMLDivElement | null>) {
  const [fit, setFit] = useState<{ width: number; height: number } | null>(null)
  useEffect(() => {
    const frame = frameRef.current
    if (!frame) return
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      const scale = Math.min(width / W, height / H)
      setFit({ width: Math.floor(W * scale), height: Math.floor(H * scale) })
    })
    observer.observe(frame)
    return () => observer.disconnect()
  }, [frameRef])
  return fit
}

export function WorldCanvas({ worldRef, alphaRef, selectedId, onSelect }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const fit = useFit(frameRef)
  const selectedRef = useRef(selectedId)
  selectedRef.current = selectedId

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")!
    let staticLayer: HTMLCanvasElement | null = null
    let staticFor: World | null = null
    let raf = 0

    const frame = (t: number) => {
      const world = worldRef.current
      if (world !== staticFor) {
        staticLayer = paintStatic(world)
        staticFor = world
      }
      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.imageSmoothingEnabled = false
      ctx.drawImage(staticLayer!, 0, 0)
      ctx.setTransform(SCALE, 0, 0, SCALE, 0, 0)

      // Animated tiles.
      for (let ty = 0; ty < MAP_H; ty++) {
        for (let tx = 0; tx < MAP_W; tx++) {
          const tile = tileAt(world.tiles, tx, ty)
          if (tile === "water") drawWater(ctx, tx * TILE, ty * TILE, tx, ty, t)
          else if (tile === "campfire") drawCampfire(ctx, tx * TILE, ty * TILE, t)
        }
      }
      for (const bush of world.bushes) drawBush(ctx, bush.pos.x * TILE, bush.pos.y * TILE, bush.berries)

      const night = darkness(world.tick)
      for (const house of world.houses) {
        const owner = world.agents.find((a) => a.id === house.ownerId)
        drawHouse(ctx, house.x * TILE, house.y * TILE, !!owner?.inside, night)
      }

      // Characters, sorted by y so lower ones overlap higher ones.
      const alpha = Math.max(0, Math.min(1, alphaRef.current))
      const drawn = world.agents
        .filter((a) => !a.inside)
        .map((a) => {
          const moving = a.prev.x !== a.pos.x || a.prev.y !== a.pos.y
          const x = (a.prev.x + (a.pos.x - a.prev.x) * alpha) * TILE
          const y = (a.prev.y + (a.pos.y - a.prev.y) * alpha) * TILE - 4
          return { a, x: Math.round(x), y: Math.round(y), moving }
        })
        .sort((p, q) => p.y - q.y)

      for (const { a, x, y, moving } of drawn) {
        if (a.id === selectedRef.current) {
          ctx.fillStyle = "rgba(255,255,255,0.55)"
          ctx.fillRect(x + 2, y + 15, 12, 2)
          ctx.fillRect(x + 1, y + 16, 14, 1)
        }
        const walkFrame = moving && alpha < 0.85 ? ((a.steps % 2) as 0 | 1) : null
        drawCharacter(ctx, a.persona, x, y, a.facing, walkFrame)
      }

      // Night falls over the world but not over the UI marks.
      if (night > 0) {
        ctx.fillStyle = `rgba(18, 26, 74, ${night})`
        ctx.fillRect(0, 0, W, H)
        const fx = world.campfire.x * TILE + 8
        const fy = world.campfire.y * TILE + 8
        const glow = ctx.createRadialGradient(fx, fy, 2, fx, fy, 44)
        glow.addColorStop(0, `rgba(255, 190, 90, ${night * 0.9})`)
        glow.addColorStop(1, "rgba(255, 190, 90, 0)")
        ctx.fillStyle = glow
        ctx.fillRect(fx - 44, fy - 44, 88, 88)
      }

      // Bubbles and name tags stay readable at night.
      ctx.textBaseline = "top"
      ctx.font = "600 6px Inter, system-ui, sans-serif"
      for (const { a, x, y } of drawn) {
        const emote = emoteFor(world, a, t)
        if (emote) drawBubble(ctx, emote, x + 3, y - 12)
        const label = a.persona.name
        const width = Math.ceil(ctx.measureText(label).width) + 4
        const lx = x + 8 - width / 2
        const selected = a.id === selectedRef.current
        ctx.fillStyle = selected ? "rgba(255,255,255,0.95)" : "rgba(20,24,40,0.72)"
        ctx.fillRect(lx, y + 17, width, 8)
        ctx.fillStyle = selected ? PAL.outline : PAL.white
        ctx.fillText(label, lx + 2, y + 18)
      }

      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [worldRef, alphaRef])

  function handleClick(event: React.MouseEvent<HTMLCanvasElement>) {
    const rect = event.currentTarget.getBoundingClientRect()
    const wx = ((event.clientX - rect.left) / rect.width) * MAP_W
    const wy = ((event.clientY - rect.top) / rect.height) * MAP_H
    let best: { id: string; d: number } | null = null
    for (const a of worldRef.current.agents) {
      if (a.inside) continue
      const d = Math.hypot(a.pos.x + 0.5 - wx, a.pos.y + 0.3 - wy)
      if (d < 1.4 && (!best || d < best.d)) best = { id: a.id, d }
    }
    if (best) onSelect(best.id)
  }

  return (
    <div ref={frameRef} className="absolute inset-0 flex items-center justify-center">
      <canvas
        ref={canvasRef}
        width={W * SCALE}
        height={H * SCALE}
        onClick={handleClick}
        style={fit ? { width: fit.width, height: fit.height } : { visibility: "hidden" }}
        className="block cursor-pointer rounded-md [image-rendering:pixelated]"
        aria-label="Village simulation. Click a character to inspect them."
      />
    </div>
  )
}

