"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import type { JevAnswer } from "@/lib/jev/schema"
import { toWire, type SimRequest } from "@/lib/sim/engine"
import { sampleMetrics } from "@/lib/sim/metrics"
import { Session, type RunRecord } from "@/lib/sim/session"
import type { ChoiceMode, Intervention, World } from "@/lib/sim/types"

/** Real milliseconds per tick at 1x. One tick is five in-game minutes. */
const BASE_TICK_MS = 260
/** Hard cap on JEV calls per session so a forgotten tab cannot run up a bill. */
export const CALL_BUDGET_STEP = 600

export type Speed = 1 | 2 | 4

async function callJev(world: World, req: SimRequest): Promise<JevAnswer> {
  const res = await fetch("/api/jev", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(toWire(world, req)),
  })
  const json = (await res.json().catch(() => ({}))) as JevAnswer | { error?: string }
  if (!res.ok || "error" in json) {
    throw new Error(("error" in json && json.error) || `HTTP ${res.status}`)
  }
  return json as JevAnswer
}

export function useSandbox() {
  const sessionRef = useRef<Session>(null as unknown as Session)
  if (sessionRef.current === null) sessionRef.current = new Session()
  const worldRef = useRef<World>(sessionRef.current.world)
  const alphaRef = useRef(0)

  const [version, setVersion] = useState(0)
  const [running, setRunning] = useState(true)
  const [speed, setSpeed] = useState<Speed>(1)
  const [mode, setMode] = useState<ChoiceMode>("sample")
  const [budget, setBudget] = useState(CALL_BUDGET_STEP)

  const runningRef = useRef(running)
  const speedRef = useRef(speed)
  const modeRef = useRef(mode)
  const budgetRef = useRef(budget)
  runningRef.current = running
  speedRef.current = speed
  modeRef.current = mode
  budgetRef.current = budget

  const bump = useCallback(() => setVersion((v) => v + 1), [])

  const dispatch = useCallback(
    (session: Session, req: SimRequest) => {
      if (session.world.stats.calls > budgetRef.current) {
        session.fail(req.id, "call budget spent")
        return
      }
      callJev(session.world, req)
        .then((ans) => {
          // Ignore answers that arrive after a reset.
          if (sessionRef.current === session) session.answer(req.id, ans, modeRef.current)
        })
        .catch((error: Error) => {
          if (sessionRef.current === session) session.fail(req.id, error.message)
        })
        .finally(bump)
    },
    [bump],
  )

  useEffect(() => {
    let raf = 0
    let last = performance.now()
    let acc = 0
    const frame = (now: number) => {
      const dt = Math.min(now - last, 250)
      last = now
      if (runningRef.current) {
        const tickMs = BASE_TICK_MS / speedRef.current
        acc += dt
        let ticked = false
        while (acc >= tickMs) {
          acc -= tickMs
          const session = sessionRef.current
          if (session.world.stats.calls >= budgetRef.current) {
            runningRef.current = false
            setRunning(false)
            break
          }
          for (const req of session.tick()) dispatch(session, req)
          ticked = true
        }
        alphaRef.current = acc / tickMs
        if (ticked) bump()
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [bump, dispatch])

  const reset = useCallback(() => {
    sessionRef.current = new Session({ seed: Math.floor(Math.random() * 2 ** 31) })
    worldRef.current = sessionRef.current.world
    alphaRef.current = 0
    setBudget(CALL_BUDGET_STEP)
    setRunning(true)
    bump()
  }, [bump])

  const intervene = useCallback(
    (intervention: Intervention) => {
      sessionRef.current.intervene(intervention)
      bump()
    },
    [bump],
  )

  const exportRun = useCallback((): RunRecord => {
    const stamp = new Date().toISOString()
    const seed = sessionRef.current.world.config.seed
    return sessionRef.current.toRecord({
      id: `live-s${seed}-${stamp.replace(/[^0-9]/g, "").slice(0, 14)}`,
      title: `Live run, seed ${seed}`,
      createdAt: stamp,
      source: "live",
    })
  }, [])

  const world = sessionRef.current.world
  const budgetHit = world.stats.calls >= budget
  // Hourly samples plus a live point for right now, so the charts move every tick.
  const metrics = [...sessionRef.current.metrics, sampleMetrics(world)]

  return {
    worldRef,
    alphaRef,
    world,
    metrics,
    version,
    running,
    setRunning,
    speed,
    setSpeed,
    mode,
    setMode,
    budget,
    budgetHit,
    extendBudget: () => {
      setBudget((b) => b + CALL_BUDGET_STEP)
      setRunning(true)
    },
    reset,
    intervene,
    exportRun,
  }
}
