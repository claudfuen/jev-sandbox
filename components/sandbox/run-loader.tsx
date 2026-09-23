"use client"

import { useEffect, useState } from "react"

import type { RunRecord } from "@/lib/sim/session"

import { ReplayViewer } from "./replay-viewer"

export function RunLoader({ id }: { id: string }) {
  const [record, setRecord] = useState<RunRecord | null>(null)
  const [error, setError] = useState<string | null>(null)
  useEffect(() => {
    fetch(`/api/runs/${encodeURIComponent(id)}`)
      .then(async (r) => {
        const json = await r.json()
        if (!r.ok) throw new Error(json.error ?? `HTTP ${r.status}`)
        setRecord(json as RunRecord)
      })
      .catch((e: Error) => setError(e.message))
  }, [id])
  if (error) return <p className="p-6 text-sm text-destructive">Could not load run: {error}</p>
  if (!record) return <p className="p-6 text-sm text-muted-foreground">Loading run...</p>
  return <ReplayViewer record={record} />
}
