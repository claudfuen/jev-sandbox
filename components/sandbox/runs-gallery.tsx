"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { ArrowLeft, FolderOpen } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatClock } from "@/lib/sim/clock"
import { METRICS } from "@/lib/sim/metrics"
import type { RunMeta, RunRecord } from "@/lib/sim/session"

import { ReplayViewer } from "./replay-viewer"

const COMPARE = ["wellbeing", "distress", "friendship_density", "acceptance_rate", "chats", "declines", "meals"]
const PERCENT = new Set(["friendship_density", "acceptance_rate"])

function fmt(id: string, v: number) {
  return PERCENT.has(id) ? `${Math.round(v * 100)}%` : Number.isInteger(v) ? String(v) : v.toFixed(1)
}

/** Mean and range of each final metric per condition: the experiment's result table. */
function ExperimentTable({ runs }: { runs: RunMeta[] }) {
  const conditions = [...new Set(runs.map((r) => r.condition ?? "baseline"))]
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-muted-foreground">
            <th className="py-1 pr-4 font-medium">Final metric</th>
            {conditions.map((c) => (
              <th key={c} className="py-1 pr-4 font-medium">
                {c} <span className="font-normal">(n={runs.filter((r) => (r.condition ?? "baseline") === c).length})</span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {COMPARE.map((id) => {
            const label = METRICS.find((m) => m.id === id)?.label ?? id
            return (
              <tr key={id} className="border-t">
                <td className="py-1.5 pr-4 text-muted-foreground">{label}</td>
                {conditions.map((c) => {
                  const vals = runs
                    .filter((r) => (r.condition ?? "baseline") === c && r.final)
                    .map((r) => r.final![id] ?? 0)
                  if (!vals.length) return <td key={c} className="py-1.5 pr-4 text-muted-foreground">-</td>
                  const mean = vals.reduce((a, b) => a + b, 0) / vals.length
                  return (
                    <td key={c} className="py-1.5 pr-4 tabular-nums">
                      <span className="font-medium">{fmt(id, mean)}</span>
                      {vals.length > 1 && (
                        <span className="text-xs text-muted-foreground">
                          {" "}
                          ({fmt(id, Math.min(...vals))} to {fmt(id, Math.max(...vals))})
                        </span>
                      )}
                    </td>
                  )
                })}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

async function readRunFile(file: File): Promise<RunRecord> {
  const stream = file.name.endsWith(".gz") ? file.stream().pipeThrough(new DecompressionStream("gzip")) : file.stream()
  return JSON.parse(await new Response(stream).text()) as RunRecord
}

export function RunsGallery() {
  const [runs, setRuns] = useState<RunMeta[] | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [local, setLocal] = useState<RunRecord | null>(null)

  useEffect(() => {
    fetch("/api/runs")
      .then((r) => r.json())
      .then((json: { runs?: RunMeta[]; error?: string }) => {
        if (json.error) setError(json.error)
        setRuns(json.runs ?? [])
      })
      .catch((e: Error) => setError(e.message))
  }, [])

  if (local) return <ReplayViewer record={local} />

  const experiments = new Map<string, RunMeta[]>()
  for (const run of runs ?? []) {
    const key = run.experiment ?? (run.source === "live" ? "live runs" : "other")
    experiments.set(key, [...(experiments.get(key) ?? []), run])
  }

  return (
    <div className="flex h-svh flex-col overflow-hidden">
      <header className="flex shrink-0 flex-wrap items-center gap-3 border-b px-4 py-2">
        <Button variant="ghost" size="sm" nativeButton={false} render={<Link href="/" />}>
          <ArrowLeft />
          Live village
        </Button>
        <h1 className="text-sm font-semibold">Runs and experiments</h1>
        <span className="text-xs text-muted-foreground">
          Every run is recorded answer by answer, so it replays exactly without calling JEV again.
        </span>
        <label className="ml-auto">
          <input
            type="file"
            accept=".json,.gz"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0]
              if (file) readRunFile(file).then(setLocal, (err: Error) => setError(`Could not read ${file.name}: ${err.message}`))
            }}
          />
          <span className="inline-flex h-7 cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 text-[0.8rem] font-medium hover:bg-muted">
            <FolderOpen className="size-3.5" />
            Open a run file
          </span>
        </label>
      </header>

      <main className="min-h-0 flex-1 overflow-y-auto p-4">
        <div className="mx-auto flex max-w-5xl flex-col gap-6">
          {error && <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm">{error}</p>}
          {runs === null && <p className="text-sm text-muted-foreground">Loading runs...</p>}
          {runs?.length === 0 && (
            <p className="text-sm text-muted-foreground">
              No published runs yet. Run <code className="font-mono">bun scripts/lab.ts --upload</code> to add some.
            </p>
          )}
          {[...experiments.entries()].map(([name, list]) => (
            <section key={name} className="flex flex-col gap-3 rounded-xl border bg-card p-4">
              <div className="flex items-baseline justify-between gap-2">
                <h2 className="text-base font-semibold">{name}</h2>
                <span className="text-xs text-muted-foreground">{list.length} runs</span>
              </div>
              <ExperimentTable runs={list} />
              <ul className="flex flex-col divide-y rounded-lg border">
                {list.map((run) => (
                  <li key={run.id}>
                    <Link href={`/runs/${run.id}`} className="grid grid-cols-[1fr_auto] items-center gap-3 px-3 py-2 text-sm hover:bg-muted/50">
                      <span className="flex min-w-0 items-center gap-2">
                        <span className="truncate font-medium">{run.title}</span>
                        {run.condition && <Badge variant="outline">{run.condition}</Badge>}
                      </span>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        until {formatClock(run.endTick)} · {run.calls} answers · ${run.costUsd.toFixed(4)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </main>
    </div>
  )
}
