"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import type { JevResponse } from "@/lib/jev/schema"
import { applyDecision, applyResponse, createWorld, failRequest, step, toWire, type SimRequest } from "@/lib/sim/engine"
import type { ChoiceMode, World } from "@/lib/sim/types"

/** Real milliseconds per tick at 1x. One tick is five in-game minutes. */
const BASE_TICK_MS = 260
/** Hard cap on JEV calls per session so a forgotten tab cannot run up a bill. */
export const CALL_BUDGET_STEP = 600

export type Speed = 1 | 2 | 4

async function callJev(world: World, req: SimRequest): Promise<JevResponse> {
  const res = await fetch("/api/jev", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(toWire(world, req)),
  })
  const json = (await res.json().catch(() => ({}))) as JevResponse | { error?: string }
  if (!res.ok || "error" in json) {
    throw new Error(("error" in json && json.error) || `HTTP ${res.status}`)
  }
  return json as JevResponse
}

export function useSandbox() {
  const worldRef = useRef<World>(null as unknown as World)
  if (worldRef.current === null) worldRef.current = createWorld()
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
    (world: World, req: SimRequest) => {
      world.stats.calls += 1
      callJev(world, req)
        .then((res) => {
          // Ignore answers that arrive after a reset.
          if (worldRef.current !== world) return
          if (res.kind === "decide") applyDecision(world, req.agentId, res, modeRef.current)
          else applyResponse(world, req.agentId, res, modeRef.current)
        })
        .catch((error: Error) => {
          if (worldRef.current === world) failRequest(world, req, error.message)
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
          const world = worldRef.current
          const allowDecisions = world.stats.calls < budgetRef.current
          for (const req of step(world, { allowDecisions })) dispatch(world, req)
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
    worldRef.current = createWorld(Math.floor(Math.random() * 2 ** 31))
    alphaRef.current = 0
    setBudget(CALL_BUDGET_STEP)
    bump()
  }, [bump])

  const world = worldRef.current
  const budgetHit = world.stats.calls >= budget

  return {
    worldRef,
    alphaRef,
    world,
    version,
    running,
    setRunning,
    speed,
    setSpeed,
    mode,
    setMode,
    budget,
    budgetHit,
    extendBudget: () => setBudget((b) => b + CALL_BUDGET_STEP),
    reset,
  }
}
