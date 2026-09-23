"use client"

import { useEffect, useRef, useState } from "react"
import { ChevronDown, Pause, Play, RotateCcw } from "lucide-react"
import { cn } from "cn"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ScrollArea } from "@/components/ui/scroll-area"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { needWord } from "@/lib/jev/prompt"
import { MOOD_LEVELS, NEED_KEYS, type NeedKey } from "@/lib/jev/schema"
import { formatClock, formatTime } from "@/lib/sim/clock"
import { describeLocation, describeStatus } from "@/lib/sim/engine"
import type { Agent, ChoiceMode, Persona, World } from "@/lib/sim/types"

import { drawCharacter } from "./sprites"
import { useSandbox, type Speed } from "./use-sandbox"
import { WorldCanvas } from "./world-canvas"

const NEED_LABEL: Record<NeedKey, string> = {
  hunger: "Hunger",
  thirst: "Thirst",
  energy: "Energy",
  social: "Social",
  fun: "Fun",
}

function Avatar({ persona, size = 32 }: { persona: Persona; size?: number }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const ctx = ref.current?.getContext("2d")
    if (!ctx) return
    ctx.clearRect(0, 0, 16, 16)
    drawCharacter(ctx, persona, 0, 0, "down", null)
  }, [persona])
  return (
    <canvas
      ref={ref}
      width={16}
      height={16}
      style={{ width: size, height: size }}
      className="shrink-0 [image-rendering:pixelated]"
      aria-hidden
    />
  )
}

function Meter({ value, tone = "default" }: { value: number; tone?: "default" | "picked" | "muted" }) {
  const pct = Math.max(0, Math.min(100, value))
  const color =
    tone === "picked"
      ? "bg-primary"
      : tone === "muted"
        ? "bg-muted-foreground/40"
        : pct < 15
          ? "bg-red-500"
          : pct < 35
            ? "bg-amber-500"
            : "bg-emerald-500"
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
      <div className={cn("h-full rounded-full transition-[width] duration-300", color)} style={{ width: `${pct}%` }} />
    </div>
  )
}

function Section({ title, children, aside }: { title: string; children: React.ReactNode; aside?: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{title}</h3>
        {aside}
      </div>
      {children}
    </section>
  )
}

function Inspector({ world, agent }: { world: World; agent: Agent }) {
  const last = agent.decisions.at(-1)
  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start gap-3">
        <Avatar persona={agent.persona} size={48} />
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold">{agent.persona.name}</h2>
            {agent.mood && <Badge variant="secondary">feeling {agent.mood.label}</Badge>}
          </div>
          <p className="text-sm leading-snug text-muted-foreground">{agent.persona.blurb.replace(/^You are /, "")}</p>
          <div className="flex flex-wrap gap-1 pt-1">
            {agent.persona.traits.map((t) => (
              <Badge key={t} variant="outline">
                {t}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-lg border bg-muted/40 px-3 py-2 text-sm">
        <span className="font-medium">Now: </span>
        {describeStatus(world, agent)}
        <span className="text-muted-foreground">, {describeLocation(world, agent)}</span>
      </div>

      <Section title="Needs">
        <div className="grid grid-cols-[4.5rem_1fr_6.5rem] items-center gap-x-3 gap-y-2 text-sm">
          {NEED_KEYS.map((k) => (
            <div key={k} className="contents">
              <span className="text-muted-foreground">{NEED_LABEL[k]}</span>
              <Meter value={agent.needs[k]} />
              <span className="truncate text-xs text-muted-foreground tabular-nums">
                {Math.round(agent.needs[k])} {needWord(k, agent.needs[k])}
              </span>
            </div>
          ))}
        </div>
      </Section>

      <Section
        title={last?.kind === "respond" ? "Last choice: asked to chat" : "Last choice"}
        aside={
          last && (
            <span className="text-xs text-muted-foreground tabular-nums">
              {formatTime(last.tick)} · {last.mode === "sample" ? "sampled" : "top pick"} · {last.latencyMs} ms
            </span>
          )
        }
      >
        {last ? (
          <div className="flex flex-col gap-1.5">
            {last.options.slice(0, 7).map((o) => {
              const picked = o.id === last.picked
              return (
                <div key={o.id} className="grid grid-cols-[1fr_7rem_2.5rem] items-center gap-3 text-sm">
                  <span className={cn("truncate", picked ? "font-medium" : "text-muted-foreground")}>
                    {picked ? "▸ " : ""}
                    {o.label}
                  </span>
                  <Meter value={o.p * 100} tone={picked ? "picked" : "muted"} />
                  <span className="text-right text-xs text-muted-foreground tabular-nums">{Math.round(o.p * 100)}%</span>
                </div>
              )
            })}
            <Collapsible>
              <CollapsibleTrigger className="group mt-1 flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground">
                <ChevronDown className="size-3.5 transition-transform group-data-[panel-open]:rotate-180" />
                What JEV saw
              </CollapsibleTrigger>
              <CollapsibleContent>
                <pre className="mt-2 max-h-72 overflow-auto rounded-lg border bg-muted/40 p-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap">
                  {last.state}
                </pre>
              </CollapsibleContent>
            </Collapsible>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Waiting for the first decision.</p>
        )}
      </Section>

      {agent.mood && (
        <Section title="Mood distribution">
          <div className="flex items-end gap-1.5">
            {MOOD_LEVELS.map((label, i) => (
              <div key={label} className="flex flex-1 flex-col items-center gap-1">
                <div className="flex h-10 w-full items-end overflow-hidden rounded bg-muted">
                  <div
                    className={cn("w-full rounded", i === agent.mood!.level ? "bg-primary" : "bg-muted-foreground/40")}
                    style={{ height: `${Math.max(4, (agent.mood!.probabilities[i] ?? 0) * 100)}%` }}
                  />
                </div>
                <span className="text-[11px] text-muted-foreground">{label}</span>
              </div>
            ))}
          </div>
        </Section>
      )}

      <Section title="Feelings about others">
        <div className="flex flex-col gap-2">
          {world.agents
            .filter((a) => a.id !== agent.id)
            .map((other) => {
              const v = agent.affinity[other.id] ?? 0
              return (
                <div key={other.id} className="grid grid-cols-[1.25rem_4.5rem_1fr_2.5rem] items-center gap-2 text-sm">
                  <Avatar persona={other.persona} size={20} />
                  <span className="text-muted-foreground">{other.persona.name}</span>
                  <Meter value={((v + 1) / 2) * 100} tone={v < 0 ? "muted" : "default"} />
                  <span className="text-right text-xs text-muted-foreground tabular-nums">{v >= 0 ? `+${v.toFixed(2)}` : v.toFixed(2)}</span>
                </div>
              )
            })}
        </div>
      </Section>

      <Section title="Memories">
        <ol className="flex flex-col gap-1 text-sm">
          {[...agent.memory].reverse().map((m, i) => (
            <li key={`${m.tick}-${i}`} className="grid grid-cols-[4.5rem_1fr] gap-2">
              <span className="text-xs text-muted-foreground tabular-nums">{formatTime(m.tick)}</span>
              <span>{m.text}</span>
            </li>
          ))}
        </ol>
      </Section>

      {agent.decisions.length > 1 && (
        <Section title="Decision history">
          <ol className="flex flex-col gap-1 text-sm">
            {[...agent.decisions].reverse().slice(0, 10).map((d, i) => {
              const p = d.options.find((o) => o.id === d.picked)?.p ?? 0
              return (
                <li key={`${d.tick}-${i}`} className="grid grid-cols-[4.5rem_1fr_2.5rem] gap-2">
                  <span className="text-xs text-muted-foreground tabular-nums">{formatTime(d.tick)}</span>
                  <span className="truncate">{d.kind === "respond" ? `Asked to chat: ${d.pickedLabel.toLowerCase()}` : d.pickedLabel}</span>
                  <span className="text-right text-xs text-muted-foreground tabular-nums">{Math.round(p * 100)}%</span>
                </li>
              )
            })}
          </ol>
        </Section>
      )}
    </div>
  )
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
    <div className="mx-auto flex min-h-svh max-w-[1500px] flex-col gap-4 p-4 lg:p-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col">
          <h1 className="text-lg font-semibold">JEV Sandbox</h1>
          <p className="text-sm text-muted-foreground">
            Four villagers. Every choice they make is a live JEV evaluation of what they see, feel and remember.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
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
          <Button variant="ghost" size="sm" onClick={sim.reset}>
            <RotateCcw />
            New world
          </Button>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_400px]">
        <div className="flex min-w-0 flex-col gap-3">
          <div className="overflow-hidden rounded-xl border-4 border-neutral-800 bg-neutral-900 shadow-sm dark:border-neutral-700">
            <WorldCanvas
              worldRef={sim.worldRef}
              alphaRef={sim.alphaRef}
              selectedId={selected.id}
              onSelect={setSelectedId}
            />
          </div>

          <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm text-muted-foreground tabular-nums">
            <span className="font-medium text-foreground first-letter:uppercase">{formatClock(world.tick)}</span>
            <span>{stats.calls} JEV calls</span>
            <span>{avgLatency === null ? "no answers yet" : `${avgLatency} ms avg`}</span>
            <span>${stats.costUsd.toFixed(4)} at list price</span>
            {stats.errors > 0 && <span className="text-destructive">{stats.errors} errors</span>}
            <span>
              budget {stats.calls}/{sim.budget}
            </span>
          </div>

          {sim.budgetHit && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm">
              <span>The call budget is spent, so nobody can make new decisions. Characters finish what they are doing and wait.</span>
              <Button size="sm" onClick={sim.extendBudget}>
                Allow 600 more calls
              </Button>
            </div>
          )}

          <div className="rounded-xl border-4 border-neutral-800 bg-white text-neutral-900 dark:border-neutral-700 dark:bg-neutral-950 dark:text-neutral-100">
            <ScrollArea className="h-44">
              <ol className="flex flex-col gap-1 p-3 font-mono text-[13px]">
                {[...world.log].reverse().slice(0, 40).map((l, i) => (
                  <li key={`${l.tick}-${i}`} className="grid grid-cols-[4.5rem_1fr] gap-2">
                    <span className="text-neutral-500 tabular-nums">{formatTime(l.tick)}</span>
                    <span className={cn(l.tone === "error" && "text-red-600 dark:text-red-400", l.tone === "social" && "text-sky-700 dark:text-sky-300")}>
                      {l.text}
                    </span>
                  </li>
                ))}
              </ol>
            </ScrollArea>
          </div>
        </div>

        <aside className="flex min-w-0 flex-col gap-3 rounded-xl border bg-card p-4">
          <div className="grid grid-cols-4 gap-1.5" role="tablist" aria-label="Villagers">
            {world.agents.map((a) => (
              <button
                key={a.id}
                role="tab"
                aria-selected={a.id === selected.id}
                onClick={() => setSelectedId(a.id)}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-lg border px-1 py-2 text-xs font-medium transition-colors",
                  a.id === selected.id ? "border-primary bg-primary/10" : "border-transparent hover:bg-muted",
                )}
              >
                <Avatar persona={a.persona} size={28} />
                {a.persona.name}
              </button>
            ))}
          </div>
          <ScrollArea className="h-[calc(100svh-11rem)] min-h-[520px] pr-3">
            <Inspector world={world} agent={selected} />
          </ScrollArea>
        </aside>
      </div>
    </div>
  )
}
