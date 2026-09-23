import { buildJevCall } from "@/lib/jev/kinds"
import type { JevAnswer, RawAnswer } from "@/lib/jev/schema"

import { applyAnswer, createWorld, failRequest, intervene, step, toWire, type SimRequest } from "./engine"
import { METRIC_EVERY, sampleMetrics, type MetricSample } from "./metrics"
import type { ChoiceMode, Intervention, World, WorldConfig } from "./types"

// A run is a seed plus the ordered list of everything that entered the world
// from outside the engine: JEV answers, failed calls and observer interventions.
// The engine is deterministic, so that list replays the run exactly, for free,
// without calling JEV again. "What JEV saw" is recomputed on replay.

export const RECORD_VERSION = 1

/** `tick` is the world tick when the event was applied, always after step() reached it. */
export type RunEvent =
  | {
      type: "answer"
      tick: number
      requestId: number
      mode: ChoiceMode
      answers: Record<string, RawAnswer>
      confidence: Record<string, number>
      latencyMs: number
      costUsd: number | null
    }
  | { type: "failure"; tick: number; requestId: number; message: string }
  | { type: "intervention"; tick: number; intervention: Intervention }

export type RunMeta = {
  id: string
  title: string
  createdAt: string
  source: "live" | "lab"
  experiment?: string
  condition?: string
  endTick: number
  calls: number
  costUsd: number
  population: number
  /** Final metric values, so the gallery can compare conditions without loading full records. */
  final?: Record<string, number>
  /** JEV's estimate of how interesting the run is to the owner. Advisory only. */
  assessment?: Assessment
}

export type Assessment = {
  interest: string
  interestScore: number
  surprise: number
  distinct: string
  society: string
  story: number
  missing: string
  best: string
}

export type RunRecord = {
  version: typeof RECORD_VERSION
  meta: RunMeta
  config: WorldConfig
  events: RunEvent[]
  metrics: MetricSample[]
}

/** A live or headless run: the world, its open JEV requests, and the recording. */
export class Session {
  readonly world: World
  readonly events: RunEvent[] = []
  readonly metrics: MetricSample[] = []
  private readonly pending = new Map<number, SimRequest>()

  constructor(readonly config: Partial<WorldConfig> = {}) {
    this.world = createWorld(config)
    this.metrics.push(sampleMetrics(this.world))
  }

  get openRequests(): number {
    return this.pending.size
  }

  request(id: number): SimRequest | undefined {
    return this.pending.get(id)
  }

  tick(): SimRequest[] {
    const requests = step(this.world)
    for (const req of requests) this.pending.set(req.id, req)
    if (this.world.tick % METRIC_EVERY === 0) this.metrics.push(sampleMetrics(this.world))
    return requests
  }

  answer(requestId: number, ans: JevAnswer, mode: ChoiceMode) {
    const req = this.pending.get(requestId)
    if (!req) return
    this.pending.delete(requestId)
    applyAnswer(this.world, req, ans, mode)
    this.events.push({
      type: "answer",
      tick: this.world.tick,
      requestId,
      mode,
      answers: ans.answers,
      confidence: ans.confidence,
      latencyMs: ans.latencyMs,
      costUsd: ans.costUsd,
    })
  }

  fail(requestId: number, message: string) {
    const req = this.pending.get(requestId)
    if (!req) return
    this.pending.delete(requestId)
    failRequest(this.world, req, message)
    this.events.push({ type: "failure", tick: this.world.tick, requestId, message })
  }

  intervene(intervention: Intervention) {
    intervene(this.world, intervention)
    this.events.push({ type: "intervention", tick: this.world.tick, intervention })
  }

  toRecord(meta: Omit<RunMeta, "endTick" | "calls" | "costUsd" | "population" | "final">): RunRecord {
    const last = sampleMetrics(this.world)
    return {
      version: RECORD_VERSION,
      meta: {
        ...meta,
        endTick: this.world.tick,
        calls: this.world.stats.calls,
        costUsd: this.world.stats.costUsd,
        population: this.world.agents.length,
        final: last.values,
      },
      config: this.world.config,
      events: this.events,
      metrics: [...this.metrics, last],
    }
  }
}

type Keyframe = { world: World; pending: Map<number, SimRequest>; eventIndex: number }

const KEYFRAME_EVERY = 144

/** Deterministic playback of a recorded run with random access via keyframes. */
export class ReplayCursor {
  world!: World
  /** Answers that referenced a request the replay never produced. Should stay 0. */
  desyncs = 0
  private pending!: Map<number, SimRequest>
  private eventIndex = 0
  private readonly keyframes = new Map<number, Keyframe>()

  constructor(readonly record: RunRecord) {
    this.reset()
  }

  get endTick(): number {
    return this.record.meta.endTick
  }

  get tick(): number {
    return this.world.tick
  }

  private reset() {
    this.world = createWorld(this.record.config)
    this.pending = new Map()
    this.eventIndex = 0
    this.applyEventsAt(0)
  }

  private applyEventsAt(tick: number) {
    const { events } = this.record
    while (this.eventIndex < events.length && events[this.eventIndex].tick <= tick) {
      const ev = events[this.eventIndex++]
      if (ev.type === "intervention") {
        intervene(this.world, ev.intervention)
        continue
      }
      const req = this.pending.get(ev.requestId)
      if (!req) {
        this.desyncs += 1
        continue
      }
      this.pending.delete(ev.requestId)
      if (ev.type === "failure") {
        failRequest(this.world, req, ev.message)
        continue
      }
      const ans: JevAnswer = {
        kind: req.kind,
        state: buildJevCall(toWire(this.world, req)).state,
        answers: ev.answers,
        confidence: ev.confidence,
        latencyMs: ev.latencyMs,
        costUsd: ev.costUsd,
      }
      applyAnswer(this.world, req, ans, ev.mode)
    }
  }

  /** Advance one tick. Returns false at the end of the recording. */
  advance(): boolean {
    if (this.world.tick >= this.endTick) return false
    for (const req of step(this.world)) this.pending.set(req.id, req)
    this.applyEventsAt(this.world.tick)
    if (this.world.tick % KEYFRAME_EVERY === 0 && !this.keyframes.has(this.world.tick)) {
      this.keyframes.set(this.world.tick, {
        world: structuredClone(this.world),
        pending: structuredClone(this.pending),
        eventIndex: this.eventIndex,
      })
    }
    return true
  }

  seek(tick: number) {
    const target = Math.max(0, Math.min(this.endTick, Math.round(tick)))
    if (target < this.world.tick) {
      let best: number | null = null
      for (const t of this.keyframes.keys()) if (t <= target && (best === null || t > best)) best = t
      if (best === null) {
        this.reset()
      } else {
        const kf = this.keyframes.get(best)!
        this.world = structuredClone(kf.world)
        this.pending = structuredClone(kf.pending)
        this.eventIndex = kf.eventIndex
      }
    }
    while (this.world.tick < target && this.advance()) {
      /* advance */
    }
  }
}
