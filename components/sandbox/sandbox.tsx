"use client"

import { useState } from "react"
import Link from "next/link"
import { ChevronDown, Download, Film, Pause, Play, RotateCcw } from "lucide-react"

import { Button } from "@/components/ui/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { formatClock } from "@/lib/sim/clock"
import type { ChoiceMode } from "@/lib/sim/types"

import { InspectorPanel, VillageLog } from "./inspector"
import { MetricsPanel } from "./metric-strip"
import { CALL_BUDGET_STEP, useSandbox, type Speed } from "./use-sandbox"
import { WorldCanvas } from "./world-canvas"

const TICKS_PER_DAY = 288

function downloadJson(filename: string, data: unknown) {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data)], { type: "application/json" }))
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function Sandbox() {
  const sim = useSandbox()
  const { world } = sim
  const [selectedId, setSelectedId] = useState(world.agents[0].id)
  const selected = world.agents.find((a) => a.id === selectedId) ?? world.agents[0]
  const { stats } = world
  const answered = stats.decisions + stats.responses
  const avgLatency = answered ? Math.round(stats.totalLatencyMs / answered) : null

  return (
    <div className="flex min-h-svh flex-col lg:h-svh lg:overflow-hidden">
      <header className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-b px-4 py-2">
        <h1 className="text-sm font-semibold">JEV Sandbox</h1>
        <span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium tabular-nums first-letter:uppercase">
          {formatClock(world.tick)}
        </span>
        <div className="hidden flex-wrap items-center gap-x-4 text-xs text-muted-foreground tabular-nums md:flex">
          <span>
            {stats.calls}/{sim.budget} JEV calls
          </span>
          <span>{avgLatency === null ? "no answers yet" : `${avgLatency} ms avg`}</span>
          <span>${stats.costUsd.toFixed(4)} list price</span>
          {stats.errors > 0 && <span className="text-destructive">{stats.errors} errors</span>}
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <Button
            variant={sim.running ? "outline" : "default"}
            size="sm"
            onClick={() => sim.setRunning(!sim.running)}
            aria-label={sim.running ? "Pause" : "Play"}
          >
            {sim.running ? <Pause /> : <Play />}
            {sim.running ? "Pause" : "Play"}
          </Button>
          <ToggleGroup
            variant="outline"
            size="sm"
            value={[String(sim.speed)]}
            onValueChange={(v: string[]) => v[0] && sim.setSpeed(Number(v[0]) as Speed)}
            aria-label="Speed"
          >
            {[1, 2, 4].map((s) => (
              <ToggleGroupItem key={s} value={String(s)}>
                {s}x
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
          <ToggleGroup
            variant="outline"
            size="sm"
            value={[sim.mode]}
            onValueChange={(v: string[]) => v[0] && sim.setMode(v[0] as ChoiceMode)}
            aria-label="How JEV's probabilities become a choice"
          >
            <ToggleGroupItem value="sample">Sample</ToggleGroupItem>
            <ToggleGroupItem value="argmax">Top pick</ToggleGroupItem>
          </ToggleGroup>
          <DropdownMenu>
            <DropdownMenuTrigger render={<Button variant="outline" size="sm" />}>
              Intervene
              <ChevronDown />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => sim.intervene({ kind: "famine" })}>Blight: strip every berry bush</DropdownMenuItem>
              <DropdownMenuItem onClick={() => sim.intervene({ kind: "bounty" })}>Bounty: refill every bush</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="ghost" size="sm" onClick={sim.reset}>
            <RotateCcw />
            New world
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              const run = sim.exportRun()
              downloadJson(`${run.meta.id}.json`, run)
            }}
          >
            <Download />
            Save run
          </Button>
          <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/runs" />}>
            <Film />
            Runs
          </Button>
        </div>
      </header>

      <main className="grid min-h-0 flex-1 gap-3 p-3 lg:grid-cols-[minmax(0,1fr)_380px] xl:grid-cols-[minmax(0,1fr)_420px]">
        <section className="flex min-h-0 min-w-0 flex-col gap-3">
          <div className="relative aspect-[8/5] w-full rounded-xl bg-neutral-900 lg:aspect-auto lg:min-h-0 lg:flex-1">
            <WorldCanvas worldRef={sim.worldRef} alphaRef={sim.alphaRef} selectedId={selected.id} onSelect={setSelectedId} />
          </div>

          {sim.budgetHit && (
            <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm">
              <span>The call budget is spent, so nobody can make new decisions. Characters finish what they are doing and wait.</span>
              <Button size="sm" onClick={sim.extendBudget}>
                Allow {CALL_BUDGET_STEP} more calls
              </Button>
            </div>
          )}

          <div className="grid shrink-0 gap-3 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
            <VillageLog world={world} />
            <MetricsPanel
              samples={sim.metrics}
              domainEnd={Math.max(TICKS_PER_DAY, world.tick)}
              aside={<span className="text-xs text-muted-foreground">live, sampled hourly</span>}
            />
          </div>
        </section>

        <InspectorPanel world={world} selectedId={selected.id} onSelect={setSelectedId} />
      </main>
    </div>
  )
}
