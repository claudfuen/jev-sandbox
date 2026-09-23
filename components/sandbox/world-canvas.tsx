"use client"

import { useEffect, useRef, useState, type RefObject } from "react"
import { Crosshair, Maximize, Minus, Plus } from "lucide-react"
import { cn } from "cn"

import { darkness } from "@/lib/sim/clock"
import { MAP_H, MAP_W, TILE, tileAt } from "@/lib/sim/map"
import type { Agent, World } from "@/lib/sim/types"

import {
  drawBoard,
  drawBridge,
  drawBridgeLot,
  drawBubble,
  drawBuilding,
  drawBush,
  drawCarry,
  drawCharacter,
  drawChild,
  drawDock,
  drawFence,
  drawField,
  drawFlowers,
  drawFord,
  drawFountain,
  drawGrass,
  drawGrave,
  drawLot,
  drawPath,
  drawRock,
  drawSand,
  drawScaffold,
  drawSign,
  drawTallGrass,
  drawTree,
  drawWater,
  PAL,
  type EmoteKind,
} from "./sprites"

// The static layer is pure pixel art at one pixel per world pixel; the camera upscales it with nearest-neighbour.
const SCALE = 1
const W = MAP_W * TILE
const H = MAP_H * TILE

/** Everything that never changes, painted once. Animated tiles and buildings are drawn per frame. */
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
      const same = (dx: number, dy: number) => tileAt(world.tiles, tx + dx, ty + dy) === tileAt(world.tiles, tx, ty)
      switch (tileAt(world.tiles, tx, ty)) {
        case "tallgrass":
          drawTallGrass(ctx, px, py)
          break
        case "flowers":
          drawFlowers(ctx, px, py, tx, ty)
          break
        case "path":
        case "door":
        case "building":
        case "house":
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
        case "field":
          drawField(ctx, px, py, tx, ty)
          break
        case "board":
          drawPath(ctx, px, py, tx, ty)
          drawBoard(ctx, px, py)
          break
        case "dock":
          drawDock(ctx, px, py)
          break
        case "grave":
          drawGrass(ctx, px, py, tx, ty)
          drawGrave(ctx, px, py)
          break
        case "fence":
          drawGrass(ctx, px, py, tx, ty)
          drawFence(ctx, px, py, tx, ty)
          break
        case "lot":
          drawLot(ctx, px, py, tx, ty, { top: !same(0, -1), right: !same(1, 0), bottom: !same(0, 1), left: !same(-1, 0) })
          break
        case "water":
        case "fountain":
        case "ford":
        case "bridge_lot":
        case "scaffold":
        case "bridge":
        case "bush":
          break
        default:
          drawGrass(ctx, px, py, tx, ty)
      }
    }
  }
  return canvas
}

const JOB_EMOTE: Partial<Record<string, EmoteKind>> = {
  police_officer: "badge",
  doctor: "cross",
  nurse: "cross",
  teacher: "book",
  journalist: "paper",
  innkeeper: "beer",
  mayor: "bell",
  shopkeeper: "coin",
  cook: "berry",
  farmer: "hammer",
  fisher: "drop",
  carpenter: "hammer",
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
    case "collapsed":
      return "sad"
    case "moving":
      return s.intent.kind === "work" && agent.persona.job === "police_officer" ? "badge" : null
    case "acting":
      switch (s.intent.kind) {
        case "work":
          return JOB_EMOTE[agent.persona.job ?? ""] ?? "hammer"
        case "build":
          return "hammer"
        case "deposit":
          return "gift"
        case "eat":
        case "gather":
          return "berry"
        case "drink":
          return "drop"
        case "explore":
          return "sparkle"
        case "plaza":
          return "note"
        case "read_board":
          return "paper"
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

const MIN_ZOOM = 1
const MAX_ZOOM = 5

type Camera = { zoom: number; cx: number; cy: number; follow: boolean }

export function WorldCanvas({ worldRef, alphaRef, selectedId, onSelect }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const fit = useFit(frameRef)
  const selectedRef = useRef(selectedId)
  selectedRef.current = selectedId
  const camRef = useRef<Camera>({ zoom: 1, cx: W / 2, cy: H / 2, follow: false })
  const [cam, setCam] = useState<Camera>(camRef.current)
  const dragRef = useRef<{ x: number; y: number; moved: boolean } | null>(null)

  const updateCam = (next: Partial<Camera>) => {
    camRef.current = { ...camRef.current, ...next }
    setCam(camRef.current)
  }

  /** Device pixels per world pixel, and the world-to-canvas offset for the current camera. */
  function view(canvas: HTMLCanvasElement) {
    const c = camRef.current
    const k = (canvas.width / W) * c.zoom
    const halfW = canvas.width / 2 / k
    const halfH = canvas.height / 2 / k
    const cx = Math.max(halfW, Math.min(W - halfW, c.cx))
    const cy = Math.max(halfH, Math.min(H - halfH, c.cy))
    return { k, ox: canvas.width / 2 - cx * k, oy: canvas.height / 2 - cy * k, cx, cy }
  }

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !fit) return
    const dpr = window.devicePixelRatio || 1
    canvas.width = Math.round(fit.width * dpr)
    canvas.height = Math.round(fit.height * dpr)
    const ctx = canvas.getContext("2d")!
    let staticLayer: HTMLCanvasElement | null = null
    let staticFor: World | null = null
    let staticGraves = -1
    let raf = 0

    const frame = (t: number) => {
      const world = worldRef.current
      // Graves are the only tiles that change after a world is created.
      if (world !== staticFor || world.graves.length !== staticGraves) {
        staticLayer = paintStatic(world)
        staticFor = world
        staticGraves = world.graves.length
      }
      const alpha = Math.max(0, Math.min(1, alphaRef.current))
      const drawn = world.agents
        .filter((a) => !a.inside && a.status.kind !== "dead")
        .map((a) => {
          const moving = a.prev.x !== a.pos.x || a.prev.y !== a.pos.y
          const x = (a.prev.x + (a.pos.x - a.prev.x) * alpha) * TILE
          const y = (a.prev.y + (a.pos.y - a.prev.y) * alpha) * TILE - 4
          return { a, x: Math.round(x), y: Math.round(y), moving }
        })
        .sort((p, q) => p.y - q.y)

      if (camRef.current.follow) {
        const target = drawn.find((d) => d.a.id === selectedRef.current)
        if (target) {
          camRef.current.cx += (target.x + 8 - camRef.current.cx) * 0.15
          camRef.current.cy += (target.y + 8 - camRef.current.cy) * 0.15
        }
      }
      const { k, ox, oy } = view(canvas)

      ctx.setTransform(1, 0, 0, 1, 0, 0)
      ctx.fillStyle = "#171717"
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.setTransform(k, 0, 0, k, ox, oy)
      ctx.imageSmoothingEnabled = false
      ctx.drawImage(staticLayer!, 0, 0, W, H)

      // Animated tiles and the footbridge.
      const progress = world.project.sessionsDone / world.project.sessionsNeeded
      for (let ty = 0; ty < MAP_H; ty++) {
        for (let tx = 0; tx < MAP_W; tx++) {
          const tile = tileAt(world.tiles, tx, ty)
          const px = tx * TILE
          const py = ty * TILE
          if (tile === "water") drawWater(ctx, px, py, tx, ty, t)
          else if (tile === "fountain") {
            drawPath(ctx, px, py, tx, ty)
            drawFountain(ctx, px, py, t)
          } else if (tile === "ford") drawFord(ctx, px, py, tx, ty, t)
          else if (tile === "bridge_lot" || tile === "scaffold") {
            if (progress > 0) {
              drawWater(ctx, px, py, tx, ty, t)
              drawScaffold(ctx, px, py, progress)
            } else drawBridgeLot(ctx, px, py, t)
          } else if (tile === "bridge") {
            drawWater(ctx, px, py, tx, ty, t)
            drawBridge(ctx, px, py)
          }
        }
      }
      for (const bush of world.bushes) {
        drawGrass(ctx, bush.pos.x * TILE, bush.pos.y * TILE, bush.pos.x, bush.pos.y)
        drawBush(ctx, bush.pos.x * TILE, bush.pos.y * TILE, bush.berries)
      }

      const night = darkness(world.tick)
      for (const b of world.buildings) {
        const lit = world.agents.some((a) => a.insideOf === b.id)
        drawBuilding(ctx, b, lit, night)
      }

      for (const { a, x, y, moving } of drawn) {
        if (a.id === selectedRef.current) {
          ctx.fillStyle = "rgba(255,255,255,0.55)"
          ctx.fillRect(x + 2, y + 15, 12, 2)
          ctx.fillRect(x + 1, y + 16, 14, 1)
        }
        const walkFrame = moving && alpha < 0.85 ? ((a.steps % 2) as 0 | 1) : null
        if (a.persona.age < 16) drawChild(ctx, a.persona, x, y, a.facing, walkFrame)
        else drawCharacter(ctx, a.persona, x, y, a.facing, walkFrame)
        if (a.carry > 0 && a.status.kind !== "collapsed") drawCarry(ctx, x + 11, y + 9, a.carry)
      }

      // Night falls over the world but not over the UI marks.
      if (night > 0) {
        ctx.fillStyle = `rgba(18, 26, 74, ${night})`
        ctx.fillRect(0, 0, W, H)
        const inn = world.buildings.find((b) => b.kind === "inn")
        for (const lamp of [world.fountain, ...(inn ? [inn.door] : [])]) {
          const fx = lamp.x * TILE + 8
          const fy = lamp.y * TILE + 8
          const glow = ctx.createRadialGradient(fx, fy, 2, fx, fy, 40)
          glow.addColorStop(0, `rgba(255, 200, 110, ${night * 0.8})`)
          glow.addColorStop(1, "rgba(255, 200, 110, 0)")
          ctx.fillStyle = glow
          ctx.fillRect(fx - 40, fy - 40, 80, 80)
        }
      }

      // Bubbles scale with the world; name tags stay a constant, readable size.
      const px = dpr / k
      ctx.textBaseline = "top"
      ctx.font = `600 ${11 * px}px Inter, system-ui, sans-serif`
      for (const { a, x, y } of drawn) {
        const emote = emoteFor(world, a, t)
        if (emote) drawBubble(ctx, emote, x + 3, y - 12)
        const label = a.persona.name
        const width = ctx.measureText(label).width + 6 * px
        const lx = x + 8 - width / 2
        const selected = a.id === selectedRef.current
        ctx.fillStyle = selected ? "rgba(255,255,255,0.95)" : "rgba(20,24,40,0.72)"
        ctx.fillRect(lx, y + 16.5, width, 14 * px)
        ctx.fillStyle = selected ? PAL.outline : PAL.white
        ctx.fillText(label, lx + 3 * px, y + 16.5 + 1.5 * px)
      }

      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)

    const onWheel = (event: WheelEvent) => {
      event.preventDefault()
      const rect = canvas.getBoundingClientRect()
      const before = view(canvas)
      const mx = (event.clientX - rect.left) * dpr
      const my = (event.clientY - rect.top) * dpr
      const wx = (mx - before.ox) / before.k
      const wy = (my - before.oy) / before.k
      const zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, camRef.current.zoom * (event.deltaY < 0 ? 1.15 : 1 / 1.15)))
      const k = (canvas.width / W) * zoom
      camRef.current = {
        ...camRef.current,
        zoom,
        cx: wx - (mx - canvas.width / 2) / k,
        cy: wy - (my - canvas.height / 2) / k,
      }
      setCam(camRef.current)
    }
    canvas.addEventListener("wheel", onWheel, { passive: false })
    return () => {
      cancelAnimationFrame(raf)
      canvas.removeEventListener("wheel", onWheel)
    }
  }, [worldRef, alphaRef, fit])

  function worldPoint(event: React.PointerEvent<HTMLCanvasElement>) {
    const canvas = event.currentTarget
    const rect = canvas.getBoundingClientRect()
    const dpr = canvas.width / rect.width
    const { k, ox, oy } = view(canvas)
    return {
      x: ((event.clientX - rect.left) * dpr - ox) / k / TILE,
      y: ((event.clientY - rect.top) * dpr - oy) / k / TILE,
    }
  }

  function onPointerDown(event: React.PointerEvent<HTMLCanvasElement>) {
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = { x: event.clientX, y: event.clientY, moved: false }
  }

  function onPointerMove(event: React.PointerEvent<HTMLCanvasElement>) {
    const drag = dragRef.current
    if (!drag) return
    const dx = event.clientX - drag.x
    const dy = event.clientY - drag.y
    if (!drag.moved && Math.hypot(dx, dy) < 4) return
    drag.moved = true
    const canvas = event.currentTarget
    const rect = canvas.getBoundingClientRect()
    const { k, cx, cy } = view(canvas)
    const dpr = canvas.width / rect.width
    camRef.current = { ...camRef.current, follow: false, cx: cx - (dx * dpr) / k, cy: cy - (dy * dpr) / k }
    drag.x = event.clientX
    drag.y = event.clientY
  }

  function onPointerUp(event: React.PointerEvent<HTMLCanvasElement>) {
    const drag = dragRef.current
    dragRef.current = null
    if (drag?.moved) {
      setCam(camRef.current)
      return
    }
    const { x: wx, y: wy } = worldPoint(event)
    let best: { id: string; d: number } | null = null
    for (const a of worldRef.current.agents) {
      if (a.inside || a.status.kind === "dead") continue
      const d = Math.hypot(a.pos.x + 0.5 - wx, a.pos.y + 0.3 - wy)
      if (d < 1.4 && (!best || d < best.d)) best = { id: a.id, d }
    }
    if (best) onSelect(best.id)
  }

  const zoomBy = (factor: number) => updateCam({ zoom: Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, camRef.current.zoom * factor)) })

  return (
    <div ref={frameRef} className="absolute inset-0 flex items-center justify-center">
      <canvas
        ref={canvasRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onDoubleClick={() => updateCam({ zoom: 1, follow: false })}
        style={fit ? { width: fit.width, height: fit.height } : { visibility: "hidden" }}
        className="block cursor-grab touch-none rounded-md active:cursor-grabbing [image-rendering:pixelated]"
        aria-label="Village simulation. Click a character to inspect them, drag to pan, scroll to zoom."
      />
      <div className="absolute right-3 bottom-3 flex items-center gap-1 rounded-lg bg-neutral-950/70 p-1 text-white backdrop-blur-sm">
        <CamButton label="Zoom out" onClick={() => zoomBy(1 / 1.4)}>
          <Minus className="size-3.5" />
        </CamButton>
        <span className="w-9 text-center text-[11px] tabular-nums">{cam.zoom.toFixed(1)}x</span>
        <CamButton label="Zoom in" onClick={() => zoomBy(1.4)}>
          <Plus className="size-3.5" />
        </CamButton>
        <CamButton label="Show whole map" onClick={() => updateCam({ zoom: 1, follow: false })}>
          <Maximize className="size-3.5" />
        </CamButton>
        <CamButton
          label="Follow the selected villager"
          active={cam.follow}
          onClick={() => updateCam({ follow: !cam.follow, zoom: cam.follow ? cam.zoom : Math.max(cam.zoom, 2.5) })}
        >
          <Crosshair className="size-3.5" />
        </CamButton>
      </div>
    </div>
  )
}

function CamButton({
  label,
  active,
  onClick,
  children,
}: {
  label: string
  active?: boolean
  onClick: () => void
  children: React.ReactNode
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "flex size-7 items-center justify-center rounded-md transition-colors hover:bg-white/15",
        active && "bg-white/25",
      )}
    >
      {children}
    </button>
  )
}
