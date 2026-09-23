"use client"

import { useCallback, useEffect, useRef, useState } from "react"

import type { JevAnswer } from "@/lib/jev/schema"
import { hydrateWorld, isCheckpoint, LIVE_WORLD, makeCheckpoint, type Checkpoint, type LiveSettings } from "@/lib/sim/checkpoint"
import { toWire, type SimRequest } from "@/lib/sim/engine"
import { sampleMetrics } from "@/lib/sim/metrics"
import { Session, type RunRecord } from "@/lib/sim/session"
import type { ChoiceMode, Intervention, World } from "@/lib/sim/types"

// The live world is persistent. One tab at a time "drives" it: advances ticks,
// calls JEV, and checkpoints to the server every few seconds. Every other tab
// watches the latest checkpoint and takes over when the driver goes quiet. With
// no tab open the world simply waits, and resumes where it stopped.

/** Real milliseconds per tick at 1x. One tick is five in-game minutes. */
const BASE_TICK_MS = 260
const SAVE_EVERY_MS = 8_000
/** Even a paused world rewrites its lease this often, so it is not taken over. */
const HEARTBEAT_MS = 20_000
const WATCH_EVERY_MS = 4_000
/** A slow or backgrounded tab catches up at most this many ticks per clock beat. */
const MAX_TICKS_PER_BEAT = 8
const RENDER_EVERY_MS = 120

const DEFAULT_WORLD =
  process.env.NEXT_PUBLIC_LIVE_WORLD ??
  (process.env.NODE_ENV !== "production"
    ? "fernhollow-dev"
    : process.env.NEXT_PUBLIC_VERCEL_ENV === "preview"
      ? "fernhollow-preview"
      : "fernhollow")

export type Speed = 1 | 2 | 4
/** driver: this tab runs the world. spectator: another tab does. local: no server storage, nothing is saved. */
export type LiveRole = "loading" | "driver" | "spectator" | "local"

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

/** One id per browser tab: a reload keeps it (and reclaims the world at once), a second tab gets its own. */
function clientId(): string {
  const make = () => `c-${crypto.randomUUID()}`
  try {
    const key = "jev-sandbox:client"
    const saved = sessionStorage.getItem(key)
    if (saved && /^[a-z0-9-]{8,64}$/.test(saved)) return saved
    const id = make()
    sessionStorage.setItem(key, id)
    return id
  } catch {
    return make()
  }
}

async function gzip(text: string): Promise<Blob> {
  return new Response(new Blob([text]).stream().pipeThrough(new CompressionStream("gzip"))).blob()
}

/** `?world=<id>` opens (or founds) a separate persistent world. */
function worldIdFromUrl(): string {
  try {
    const id = new URLSearchParams(window.location.search).get("world")
    if (id && LIVE_WORLD.test(id)) return id
  } catch {
    /* default */
  }
  return DEFAULT_WORLD
}

async function fetchCheckpoint(worldId: string, ifNoneMatch: string | null): Promise<{ cp: Checkpoint; etag: string } | "unchanged" | null> {
  const res = await fetch(`/api/live/${worldId}`, { headers: ifNoneMatch ? { "if-none-match": ifNoneMatch } : {}, cache: "no-store" })
  if (res.status === 304) return "unchanged"
  if (res.status === 404) return null
  if (!res.ok) throw new Error(`load ${res.status}`)
  const cp: unknown = await res.json()
  if (!isCheckpoint(cp)) throw new Error("The stored world is not a checkpoint")
  return { cp, etag: res.headers.get("etag") ?? "" }
}

/** Worker timers keep firing in a background tab, where page timers and animation frames are throttled. */
function startClock(onBeat: () => void): () => void {
  try {
    const url = URL.createObjectURL(new Blob(["setInterval(() => postMessage(0), 50)"], { type: "text/javascript" }))
    const worker = new Worker(url)
    worker.onmessage = onBeat
    return () => {
      worker.terminate()
      URL.revokeObjectURL(url)
    }
  } catch {
    const id = setInterval(onBeat, 50)
    return () => clearInterval(id)
  }
}

const randomSeed = () => Math.floor(Math.random() * 2 ** 31)

export type SaveState = { at: number | null; error: string | null }

export function useSandbox() {
  const sessionRef = useRef<Session>(null as unknown as Session)
  // A placeholder town to render while the live world loads; it never ticks.
  if (sessionRef.current === null) sessionRef.current = new Session({ seed: 1 })
  const worldRef = useRef<World>(sessionRef.current.world)
  const alphaRef = useRef(0)

  const [version, setVersion] = useState(0)
  const [role, setRoleState] = useState<LiveRole>("loading")
  const [running, setRunningState] = useState(true)
  const [speed, setSpeedState] = useState<Speed>(1)
  const [mode, setModeState] = useState<ChoiceMode>("sample")
  const [saved, setSaved] = useState<SaveState>({ at: null, error: null })

  const roleRef = useRef<LiveRole>("loading")
  const settingsRef = useRef<LiveSettings>({ speed: 1, mode: "sample", running: true })
  const idRef = useRef<string>("")
  const worldIdRef = useRef<string>(DEFAULT_WORLD)
  const [worldId, setWorldId] = useState(DEFAULT_WORLD)
  const etagRef = useRef<string | null>(null)
  const dirtyRef = useRef(true)
  const savingRef = useRef(false)
  const lastSave = useRef({ tick: -1, at: 0, settings: "" })
  const lastTickAt = useRef(0)
  /** While watching: when the driving tab's lease runs out. */
  const leaseUntil = useRef(0)

  const setRole = useCallback((r: LiveRole) => {
    roleRef.current = r
    setRoleState(r)
  }, [])

  const applySettings = useCallback((s: LiveSettings) => {
    settingsRef.current = s
    setRunningState(s.running)
    setSpeedState(s.speed)
    setModeState(s.mode)
  }, [])

  const adopt = useCallback((session: Session) => {
    sessionRef.current = session
    worldRef.current = session.world
    alphaRef.current = 0
    dirtyRef.current = true
  }, [])

  const adoptCheckpoint = useCallback(
    (cp: Checkpoint) => {
      const world = hydrateWorld(cp.world)
      adopt(new Session(world.config, { world, pending: cp.pending, metrics: cp.metrics }))
      applySettings(cp.settings)
    },
    [adopt, applySettings],
  )

  const dispatch = useCallback((session: Session, req: SimRequest) => {
    callJev(session.world, req)
      .then((ans) => {
        // Ignore answers for a world this tab no longer runs.
        if (sessionRef.current === session && roleRef.current !== "spectator") session.answer(req.id, ans, settingsRef.current.mode)
      })
      .catch((error: Error) => {
        if (sessionRef.current === session && roleRef.current !== "spectator") session.fail(req.id, error.message)
      })
      .finally(() => {
        dirtyRef.current = true
      })
  }, [])

  const save = useCallback(async () => {
    if (savingRef.current || roleRef.current !== "driver") return
    savingRef.current = true
    const session = sessionRef.current
    try {
      const settings = settingsRef.current
      const cp = makeCheckpoint(worldIdRef.current, session.world, session.inFlight, session.metrics, settings)
      const tick = session.world.tick
      const body = await gzip(JSON.stringify(cp))
      const res = await fetch(`/api/live/${worldIdRef.current}`, {
        method: "PUT",
        headers: { "x-client-id": idRef.current, "if-match": etagRef.current ?? "*", "content-type": "application/gzip" },
        body,
      })
      if (res.status === 409) {
        // Another tab took the world over. Watch it instead.
        etagRef.current = null
        setRole("spectator")
        return
      }
      if (!res.ok) throw new Error(`save failed (${res.status})`)
      etagRef.current = ((await res.json()) as { etag: string }).etag
      lastSave.current = { tick, at: Date.now(), settings: JSON.stringify(settings) }
      setSaved({ at: Date.now(), error: null })
    } catch (error) {
      setSaved((s) => ({ ...s, error: (error as Error).message }))
    } finally {
      savingRef.current = false
    }
  }, [setRole])

  const booting = useRef(false)
  const boot = useCallback(
    async (force = false) => {
      // One claim at a time (React runs mount effects twice in development).
      if (booting.current) return
      booting.current = true
      setRole("loading")
      try {
        const res = await fetch(`/api/live/${worldIdRef.current}/claim`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ clientId: idRef.current, force }),
        })
        if (!res.ok) throw new Error(`claim ${res.status}`)
        const claim = (await res.json()) as { role: "driver" | "spectator"; etag: string | null; exists: boolean }
        if (claim.role === "driver" && !claim.exists) {
          // The very first visit: found the world, and store it right away.
          adopt(new Session({ seed: randomSeed() }))
          etagRef.current = null
          setRole("driver")
          await save()
          return
        }
        const loaded = await fetchCheckpoint(worldIdRef.current, null)
        if (!loaded || loaded === "unchanged") throw new Error("The live world vanished")
        adoptCheckpoint(loaded.cp)
        if (claim.role === "driver") {
          etagRef.current = claim.etag
          setRole("driver")
          // Whatever was in flight when the last tab stopped is asked again.
          for (const req of sessionRef.current.inFlight) dispatch(sessionRef.current, req)
        } else {
          etagRef.current = loaded.etag
          leaseUntil.current = loaded.cp.lease?.until ?? 0
          setRole("spectator")
        }
      } catch {
        // No server storage (a local build without Blob, or offline): run in memory, unsaved.
        if (roleRef.current === "loading") {
          adopt(new Session({ seed: randomSeed() }))
          setRole("local")
        }
      } finally {
        booting.current = false
      }
    },
    [adopt, adoptCheckpoint, dispatch, save, setRole],
  )

  // Boot once.
  useEffect(() => {
    idRef.current = clientId()
    worldIdRef.current = worldIdFromUrl()
    setWorldId(worldIdRef.current)
    void boot()
  }, [boot])

  // The simulation clock.
  useEffect(() => {
    let last = performance.now()
    let acc = 0
    return startClock(() => {
      const now = performance.now()
      const dt = Math.min(now - last, 1000)
      last = now
      const r = roleRef.current
      if ((r !== "driver" && r !== "local") || !settingsRef.current.running) {
        acc = 0
        return
      }
      const tickMs = BASE_TICK_MS / settingsRef.current.speed
      acc += dt
      let n = 0
      while (acc >= tickMs && n < MAX_TICKS_PER_BEAT) {
        acc -= tickMs
        n += 1
        const session = sessionRef.current
        for (const req of session.tick()) dispatch(session, req)
      }
      if (n >= MAX_TICKS_PER_BEAT) acc = 0
      if (n > 0) {
        lastTickAt.current = now
        dirtyRef.current = true
      }
    })
  }, [dispatch])

  // Rendering: smooth motion every frame, React state a few times a second.
  useEffect(() => {
    let raf = 0
    let lastRender = 0
    const frame = (now: number) => {
      const tickMs = BASE_TICK_MS / settingsRef.current.speed
      const moving = roleRef.current === "driver" || roleRef.current === "local"
      alphaRef.current = moving && settingsRef.current.running ? Math.min(1, (now - lastTickAt.current) / tickMs) : 1
      if (dirtyRef.current && now - lastRender >= RENDER_EVERY_MS) {
        dirtyRef.current = false
        lastRender = now
        setVersion((v) => v + 1)
      }
      raf = requestAnimationFrame(frame)
    }
    raf = requestAnimationFrame(frame)
    return () => cancelAnimationFrame(raf)
  }, [])

  // Checkpoints while driving; following the driver while watching.
  useEffect(() => {
    const beat = setInterval(() => {
      const r = roleRef.current
      if (r === "driver") {
        const tick = sessionRef.current.world.tick
        const settings = JSON.stringify(settingsRef.current)
        const since = Date.now() - lastSave.current.at
        const changed = tick !== lastSave.current.tick || settings !== lastSave.current.settings
        if ((changed && since >= SAVE_EVERY_MS) || since >= HEARTBEAT_MS) void save()
      }
    }, 1000)
    const watch = setInterval(async () => {
      if (roleRef.current !== "spectator") return
      try {
        const loaded = await fetchCheckpoint(worldIdRef.current, etagRef.current)
        if (!loaded) return
        if (loaded !== "unchanged") {
          etagRef.current = loaded.etag
          leaseUntil.current = loaded.cp.lease?.until ?? 0
          adoptCheckpoint(loaded.cp)
        }
        // The driver went quiet: take the world over so it keeps living.
        if (leaseUntil.current < Date.now()) void boot()
      } catch {
        /* keep watching */
      }
    }, WATCH_EVERY_MS)
    const onHide = () => {
      if (document.visibilityState === "hidden") void save()
    }
    document.addEventListener("visibilitychange", onHide)
    return () => {
      clearInterval(beat)
      clearInterval(watch)
      document.removeEventListener("visibilitychange", onHide)
    }
  }, [adoptCheckpoint, boot, save])

  const changeSettings = useCallback(
    (patch: Partial<LiveSettings>) => {
      applySettings({ ...settingsRef.current, ...patch })
      dirtyRef.current = true
    },
    [applySettings],
  )

  const reset = useCallback(() => {
    if (roleRef.current === "spectator" || roleRef.current === "loading") return
    if (roleRef.current === "driver" && !window.confirm("Start a new world? The current Fernhollow ends for everyone watching.")) return
    adopt(new Session({ seed: randomSeed() }))
    changeSettings({ running: true })
    void save()
  }, [adopt, changeSettings, save])

  const intervene = useCallback((intervention: Intervention) => {
    if (roleRef.current === "spectator" || roleRef.current === "loading") return
    sessionRef.current.intervene(intervention)
    dirtyRef.current = true
  }, [])

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
  // Hourly samples plus a live point for right now, so the charts move every tick.
  const metrics = [...sessionRef.current.metrics, sampleMetrics(world)]

  return {
    worldRef,
    alphaRef,
    world,
    metrics,
    version,
    role,
    saved,
    liveId: worldId,
    takeOver: () => void boot(true),
    running,
    setRunning: (r: boolean) => changeSettings({ running: r }),
    speed,
    setSpeed: (s: Speed) => changeSettings({ speed: s }),
    mode,
    setMode: (m: ChoiceMode) => changeSettings({ mode: m }),
    reset,
    intervene,
    exportRun,
  }
}
