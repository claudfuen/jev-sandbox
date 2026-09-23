"use client"

import { useState } from "react"

import { formatTime } from "@/lib/sim/clock"
import { METRIC_EVERY, type MetricSample } from "@/lib/sim/metrics"

const W = 240
const H = 40
const PAD = 3

export type StripSpec = {
  id: string
  label: string
  /** "level" plots the value; "rate" plots the change per in-game hour of a cumulative count. */
  mode?: "level" | "rate"
  format?: (v: number) => string
}

const pct = (v: number) => `${Math.round(v * 100)}%`
const whole = (v: number) => v.toFixed(0)
const perHour = (v: number) => `${v.toFixed(1)}/h`

/** The default dashboard, shared by the live view and replays. */
export const DEFAULT_STRIPS: StripSpec[] = [
  { id: "wellbeing", label: "Wellbeing", format: whole },
  { id: "health", label: "Health", format: whole },
  { id: "purpose", label: "Purpose", format: whole },
  { id: "prosocial_share", label: "Prosocial choices", format: pct },
  { id: "antisocial_share", label: "Antisocial choices", format: pct },
  { id: "gini_coins", label: "Wealth inequality", format: (v) => v.toFixed(2) },
  { id: "trust", label: "Trust", format: whole },
  { id: "machiavellianism", label: "Machiavellianism", format: (v) => v.toFixed(1) },
  { id: "coop_wellbeing_edge", label: "Does cooperation pay?", format: (v) => `${v >= 0 ? "+" : ""}${v.toFixed(1)}` },
  { id: "reciprocity", label: "Favours returned", format: pct },
  { id: "meaning", label: "Meaning of the day", format: whole },
  { id: "grudges", label: "Grudges held", format: whole },
  { id: "stall_price", label: "Grocery price", format: whole },
  { id: "attendance", label: "Shift attendance", format: pct },
  { id: "treasury", label: "Town treasury", format: whole },
  { id: "bridge", label: "Footbridge built", format: pct },
]

/** Turn samples into the plotted series: raw levels, or per-hour deltas of a count. */
function series(samples: MetricSample[], spec: StripSpec): { tick: number; v: number }[] {
  const raw = samples.map((s) => ({ tick: s.tick, v: s.values[spec.id] ?? 0 }))
  if (spec.mode !== "rate") return raw
  return raw.map((p, i) => {
    if (i === 0) return { tick: p.tick, v: 0 }
    const prev = raw[i - 1]
    const hours = Math.max(1, (p.tick - prev.tick) / METRIC_EVERY)
    return { tick: p.tick, v: (p.v - prev.v) / hours }
  })
}

/** One metric over the run: single series, hover crosshair, optional playhead, click to seek. */
export function MetricStrip({
  spec,
  samples,
  domainEnd,
  playhead,
  onSeek,
}: {
  spec: StripSpec
  samples: MetricSample[]
  /** Right edge of the x axis, in ticks. */
  domainEnd: number
  /** Tick to mark with a playhead; omitted in the live view. */
  playhead?: number
  onSeek?: (tick: number) => void
}) {
  const [hover, setHover] = useState<{ tick: number; v: number } | null>(null)
  const points = series(samples, spec)
  const format = spec.format ?? whole
  const values = points.map((p) => p.v)
  const min = Math.min(...values, 0)
  const max = Math.max(...values, min + 1e-9)
  const x = (t: number) => PAD + (t / Math.max(1, domainEnd)) * (W - PAD * 2)
  const y = (v: number) => H - PAD - ((v - min) / (max - min)) * (H - PAD * 2)
  const path = points.map((p, i) => `${i ? "L" : "M"}${x(p.tick).toFixed(1)},${y(p.v).toFixed(1)}`).join("")
  const reference = playhead ?? Infinity
  const current = [...points].reverse().find((p) => p.tick <= reference) ?? points[0]
  const shown = hover ?? current

  function tickAt(event: React.MouseEvent<SVGSVGElement>) {
    const rect = event.currentTarget.getBoundingClientRect()
    return Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)) * domainEnd
  }

  function nearest(t: number) {
    let best = points[0]
    for (const p of points) if (Math.abs(p.tick - t) < Math.abs(best.tick - t)) best = p
    return best
  }

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="truncate text-muted-foreground">
          {spec.label}
          {hover && <span className="tabular-nums"> · {formatTime(hover.tick)}</span>}
        </span>
        <span className="font-medium tabular-nums">{shown ? format(shown.v) : "-"}</span>
      </div>
      <svg
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className={`h-10 w-full overflow-visible text-foreground ${onSeek ? "cursor-pointer" : ""}`}
        onMouseMove={(e) => points.length && setHover(nearest(tickAt(e)))}
        onMouseLeave={() => setHover(null)}
        onClick={(e) => onSeek?.(tickAt(e))}
        role="img"
        aria-label={`${spec.label} over time`}
      >
        <line x1={PAD} x2={W - PAD} y1={H - PAD} y2={H - PAD} className="stroke-border" strokeWidth={1} vectorEffect="non-scaling-stroke" />
        {points.length > 1 && (
          <path d={path} fill="none" stroke="currentColor" strokeWidth={2} strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
        )}
        {playhead !== undefined && (
          <line x1={x(playhead)} x2={x(playhead)} y1={0} y2={H} className="stroke-primary" strokeWidth={2} vectorEffect="non-scaling-stroke" />
        )}
        {hover && (
          <line x1={x(hover.tick)} x2={x(hover.tick)} y1={0} y2={H} className="stroke-muted-foreground" strokeWidth={1} strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
        )}
      </svg>
    </div>
  )
}

/** A grid of metric strips sized to fit its dock without clipping. */
export function MetricsPanel({
  samples,
  domainEnd,
  playhead,
  onSeek,
  strips = DEFAULT_STRIPS,
  title = "Village metrics",
  aside,
}: {
  samples: MetricSample[]
  domainEnd: number
  playhead?: number
  onSeek?: (tick: number) => void
  strips?: StripSpec[]
  title?: string
  aside?: React.ReactNode
}) {
  return (
    <div className="flex h-44 min-w-0 flex-col overflow-hidden rounded-xl border bg-card">
      <div className="flex shrink-0 items-center justify-between border-b px-3 py-1.5">
        <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{title}</h3>
        {aside}
      </div>
      <div className="grid min-h-0 flex-1 grid-cols-3 content-start gap-x-4 gap-y-2 overflow-y-auto px-3 py-2">
        {strips.map((spec) => (
          <MetricStrip key={spec.id} spec={spec} samples={samples} domainEnd={domainEnd} playhead={playhead} onSeek={onSeek} />
        ))}
      </div>
    </div>
  )
}
