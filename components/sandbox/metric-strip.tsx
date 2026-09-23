"use client"

import { useState } from "react"

import { formatClock } from "@/lib/sim/clock"
import type { MetricSample } from "@/lib/sim/metrics"

const W = 240
const H = 56
const PAD = 4

/** One metric over the run: single series, hover crosshair, playhead, click to seek. */
export function MetricStrip({
  label,
  metricId,
  samples,
  endTick,
  tick,
  onSeek,
  format = (v) => v.toFixed(0),
}: {
  label: string
  metricId: string
  samples: MetricSample[]
  endTick: number
  tick: number
  onSeek: (tick: number) => void
  format?: (v: number) => string
}) {
  const [hover, setHover] = useState<MetricSample | null>(null)
  const values = samples.map((s) => s.values[metricId] ?? 0)
  const min = Math.min(...values, 0)
  const max = Math.max(...values, min + 1e-9)
  const x = (t: number) => PAD + (t / Math.max(1, endTick)) * (W - PAD * 2)
  const y = (v: number) => H - PAD - ((v - min) / (max - min)) * (H - PAD * 2)
  const path = samples.map((s, i) => `${i ? "L" : "M"}${x(s.tick).toFixed(1)},${y(values[i]).toFixed(1)}`).join("")
  const current = [...samples].reverse().find((s) => s.tick <= tick) ?? samples[0]
  const shown = hover ?? current

  function tickAt(event: React.MouseEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect()
    const frac = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width))
    return frac * endTick
  }

  function nearest(t: number) {
    let best = samples[0]
    for (const s of samples) if (Math.abs(s.tick - t) < Math.abs(best.tick - t)) best = s
    return best
  }

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="truncate text-muted-foreground">{label}</span>
        <span className="font-medium tabular-nums">{shown ? format(shown.values[metricId] ?? 0) : "-"}</span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className="h-12 w-full cursor-pointer overflow-visible text-foreground"
        onMouseMove={(e) => setHover(nearest(tickAt(e)))}
        onMouseLeave={() => setHover(null)}
        onClick={(e) => onSeek(tickAt(e))}
        role="img"
        aria-label={`${label} over the run`}
      >
        <line x1={PAD} x2={W - PAD} y1={H - PAD} y2={H - PAD} className="stroke-border" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        <path d={path} fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        <line x1={x(tick)} x2={x(tick)} y1={0} y2={H} className="stroke-primary" strokeWidth={2} vectorEffect="non-scaling-stroke" />
        {hover && (
          <line x1={x(hover.tick)} x2={x(hover.tick)} y1={0} y2={H} className="stroke-muted-foreground" strokeWidth={1} strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
        )}
      </svg>
      <span className="h-3 truncate text-[11px] text-muted-foreground tabular-nums">{hover ? formatClock(hover.tick) : ""}</span>
    </div>
  )
}
