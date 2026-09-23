"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { ArrowLeft, Pause, Play } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Slider } from "@/components/ui/slider"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { formatClock } from "@/lib/sim/clock"
import { ReplayCursor, type RunRecord } from "@/lib/sim/session"
import type { World } from "@/lib/sim/types"

import { InspectorPanel, VillageLog } from "./inspector"
import { MetricsPanel } from "./metric-strip"
import { WorldCanvas } from "./world-canvas"

const TICKS_PER_SECOND = 4
const SPEEDS = [1, 4, 16, 64] as const

export function ReplayViewer({ record }: { record: RunRecord }) {
  const cursor = useMemo(() => new ReplayCursor(record), [record])
  const worldRef = useRef<World>(cursor.world)
  const alphaRef = useRef(0)
  const [, setVersion] = useState(0)
  const [playing, setPlaying] = useState(true)
  const [speed, setSpeed] = useState<(typeof SPEEDS)[number]>(4)
  const [selectedId, setSelectedId] = useState(cursor.world.agents[0].id)
  const playingRef = useRef(playing)
  const speedRef = useRef(speed)
  playingRef.current = playing
  speedRef.current = speed

  useEffect(() => {
    let raf = 0
    let last = performance.now()
    let acc = 0
    const frame = (now: number) => {
      const dt = Math.min(now - last, 250)
      last = now
      if (playingRef.current) {
        const tickMs = 1000 / (TICKS_PER_SECOND * speedRef.current)
        acc += dt
        let ticked = false
        while (acc >= tickMs) {
          acc -= tickMs
          if (!cursor.advance()) {
            playingRef.current = false
            setPlaying(false)
            break
          }
          ticked = true
        }
        worldRef.current = cursor.world
        alphaRef.current = speedRef.current > 4 ? 1 : acc / tickMs
        if (ticked) setVersion((v) => v + 1)
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [cursor])

  function seek(tick: number) {
    cursor.seek(tick)
    worldRef.current = cursor.world
    alphaRef.current = 1
    setVersion((v) => v + 1)
  }

  const world = cursor.world
  const { meta } = record

  return (
    <div className="flex min-h-svh flex-col lg:h-svh lg:overflow-hidden">
      <header className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-b px-4 py-2">
        <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/runs" />}>
          <ArrowLeft />
          Runs
        </Button>
        <h1 className="text-sm font-semibold">{meta.title}</h1>
        <Badge variant="secondary">replay</Badge>
        {meta.condition && <Badge variant="outline">{meta.condition}</Badge>}
        <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium tabular-nums first-letter:uppercase">
          {formatClock(world.tick)}
        </span>
        <span className="hidden text-xs text-muted-foreground tabular-nums md:inline">
          {meta.calls} JEV answers recorded · ${meta.costUsd.toFixed(4)} to make · free to watch
          {cursor.desyncs > 0 && <span className="text-destructive"> · {cursor.desyncs} desyncs</span>}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <Button variant={playing ? "outline" : "default"} size="sm" onClick={() => setPlaying(!playing)}>
            {playing ? <Pause /> : <Play />}
            {playing ? "Pause" : "Play"}
          </Button>
          <ToggleGroup
            variant="outline"
            size="sm"
            value={[String(speed)]}
            onValueChange={(v: string[]) => v[0] && setSpeed(Number(v[0]) as (typeof SPEEDS)[number])}
            aria-label="Playback speed"
          >
            {SPEEDS.map((s) => (
              <ToggleGroupItem key={s} value={String(s)}>
                {s}x
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        </div>
      </header>

      <main className="grid min-h-0 flex-1 gap-3 p-3 lg:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[minmax(0,1fr)_420px]">
        <section className="flex min-h-0 min-w-0 flex-col gap-3">
          <div className="relative aspect-[8/5] w-full rounded-xl bg-neutral-900 lg:aspect-auto lg:min-h-0 lg:flex-1">
            <WorldCanvas worldRef={worldRef} alphaRef={alphaRef} selectedId={selectedId} onSelect={setSelectedId} />
          </div>

          <div className="flex shrink-0 items-center gap-3 rounded-xl border bg-card px-3 py-2">
            <span className="w-20 shrink-0 text-xs text-muted-foreground tabular-nums">tick {world.tick}</span>
            <Slider
              min={0}
              max={cursor.endTick}
              value={[world.tick]}
              onValueChange={(v) => seek(Array.isArray(v) ? v[0] : v)}
              aria-label="Timeline"
            />
            <span className="w-20 shrink-0 text-right text-xs text-muted-foreground tabular-nums">of {cursor.endTick}</span>
          </div>

          <div className="grid shrink-0 gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
            <VillageLog world={world} />
            <MetricsPanel samples={record.metrics} domainEnd={cursor.endTick} playhead={world.tick} onSeek={seek} />
          </div>
        </section>

        <InspectorPanel world={world} selectedId={selectedId} onSelect={setSelectedId} />
      </main>
    </div>
  )
}
