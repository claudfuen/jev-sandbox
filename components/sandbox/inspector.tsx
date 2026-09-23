"use client"

import { useEffect, useRef } from "react"
import { cn } from "cn"

import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { NEED_NAMES, needWord } from "@/lib/jev/prompt"
import { MOOD_LEVELS, MOTIVES, NEED_KEYS, type NeedKey } from "@/lib/jev/schema"
import { formatTime } from "@/lib/sim/clock"
import { describeLocation, describeStatus } from "@/lib/sim/engine"
import { FOUNDATION_KEYS, psycheLines, VALUE_KEYS } from "@/lib/sim/psyche"
import type { Agent, Persona, World } from "@/lib/sim/types"

import { drawCharacter } from "./sprites"

const NEED_LABEL: Record<NeedKey, string> = NEED_NAMES

export function Avatar({ persona, size = 32 }: { persona: Persona; size?: number }) {
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

export function Meter({ value, tone = "default" }: { value: number; tone?: "default" | "picked" | "muted" }) {
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

export function Section({ title, children, aside }: { title: string; children: React.ReactNode; aside?: React.ReactNode }) {
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

function AgentHeader({ agent, world }: { world: World; agent: Agent }) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-start gap-3">
        <Avatar persona={agent.persona} size={44} />
        <div className="flex min-w-0 flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-semibold">{agent.persona.name}</h2>
            <span className="text-xs text-muted-foreground">{agent.persona.vocation}</span>
            {agent.mood && <Badge variant="secondary">feeling {agent.mood.label}</Badge>}
            {agent.carry > 0 && <Badge variant="outline">carrying {agent.carry} food</Badge>}
          </div>
          <p className="text-[13px] leading-snug text-muted-foreground">{agent.persona.blurb}</p>
        </div>
      </div>
      <div className="rounded-lg border bg-muted/40 px-3 py-2 text-sm">
        <span className="font-medium">Now: </span>
        {describeStatus(world, agent)}
        <span className="text-muted-foreground">, {describeLocation(world, agent)}</span>
      </div>
    </div>
  )
}

function MindTab({ agent }: { agent: Agent }) {
  const last = agent.decisions.at(-1)
  return (
    <div className="flex flex-col gap-5">
      <Section title="Needs">
        <div className="grid grid-cols-[4.5rem_1fr_6.5rem] items-center gap-x-3 gap-y-2 text-sm">
          {NEED_KEYS.map((k) => (
            <div key={k} className="contents" title={agent.needCause[k] ?? ""}>
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
            {last.options.map((o) => {
              const picked = o.id === last.picked
              return (
                <div key={o.id} className="grid grid-cols-[1fr_6rem_2.5rem] items-center gap-3 text-sm">
                  <span className={cn("truncate", picked ? "font-medium" : "text-muted-foreground")}>
                    {picked ? "▸ " : ""}
                    {o.label}
                  </span>
                  <Meter value={o.p * 100} tone={picked ? "picked" : "muted"} />
                  <span className="text-right text-xs text-muted-foreground tabular-nums">{Math.round(o.p * 100)}%</span>
                </div>
              )
            })}
            {last.motive && (
              <div className="mt-2 flex flex-col gap-1.5 border-t pt-2">
                <div className="flex items-baseline justify-between text-xs text-muted-foreground">
                  <span>What JEV says is driving them</span>
                  {last.confidence !== null && <span className="tabular-nums">confidence {Math.round(last.confidence * 100)}%</span>}
                </div>
                {last.motive.slice(0, 4).map((m, i) => (
                  <div key={m.id} className="grid grid-cols-[1fr_6rem_2.5rem] items-center gap-3 text-sm">
                    <span className={cn("truncate", i === 0 ? "font-medium" : "text-muted-foreground")} title={MOTIVES[m.id]}>
                      {m.id}
                    </span>
                    <Meter value={m.p * 100} tone={i === 0 ? "picked" : "muted"} />
                    <span className="text-right text-xs text-muted-foreground tabular-nums">{Math.round(m.p * 100)}%</span>
                  </div>
                ))}
              </div>
            )}
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
    </div>
  )
}

function RelationsTab({ world, agent }: { world: World; agent: Agent }) {
  return (
    <div className="flex flex-col gap-5">
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
    </div>
  )
}


const TRAIT_LABELS = [
  ["openness", "Openness"],
  ["conscientiousness", "Conscientiousness"],
  ["extraversion", "Extraversion"],
  ["agreeableness", "Agreeableness"],
  ["neuroticism", "Neuroticism"],
] as const

function PsycheTab({ agent }: { agent: Agent }) {
  const p = agent.psyche
  const topValues = [...VALUE_KEYS].sort((a, b) => p.values[b] - p.values[a]).slice(0, 4)
  const strongFoundations = FOUNDATION_KEYS.filter((k) => p.foundations[k] >= 65 || p.foundations[k] <= 30)
  const drivers = Object.entries(agent.drivers).sort((a, b) => (b[1] ?? 0) - (a[1] ?? 0))
  const totalDrivers = drivers.reduce((n, [, v]) => n + (v ?? 0), 0)
  return (
    <div className="flex flex-col gap-5">
      <Section title="Who they are, as JEV reads it">
        <ul className="flex flex-col gap-1.5 rounded-lg border bg-muted/40 p-3 text-[13px] leading-snug">
          {psycheLines(p).map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </Section>
      <Section title="Temperament">
        <div className="grid grid-cols-[8.5rem_1fr_2rem] items-center gap-x-3 gap-y-1.5 text-sm">
          {TRAIT_LABELS.map(([k, label]) => (
            <div key={k} className="contents">
              <span className="text-muted-foreground">{label}</span>
              <Meter value={p.big5[k]} tone="muted" />
              <span className="text-right text-xs text-muted-foreground tabular-nums">{p.big5[k]}</span>
            </div>
          ))}
          <div className="contents">
            <span className="text-muted-foreground">Trust in others</span>
            <Meter value={p.trust} tone="muted" />
            <span className="text-right text-xs text-muted-foreground tabular-nums">{p.trust}</span>
          </div>
        </div>
      </Section>
      <Section title="Values and moral instincts">
        <div className="flex flex-wrap gap-1">
          {topValues.map((k) => (
            <Badge key={k} variant="secondary">
              {k} {p.values[k]}
            </Badge>
          ))}
          {strongFoundations.map((k) => (
            <Badge key={k} variant="outline">
              {p.foundations[k] >= 65 ? "strong" : "weak"} {k}
            </Badge>
          ))}
          <Badge variant="outline">{p.attachment} attachment</Badge>
          {(["machiavellianism", "narcissism", "psychopathy"] as const)
            .filter((k) => p.dark[k] >= 45)
            .map((k) => (
              <Badge key={k} variant="destructive">
                {k} {p.dark[k]}
              </Badge>
            ))}
        </div>
      </Section>
      <Section title="What their choices were about" aside={<span className="text-xs text-muted-foreground">tagged by the engine</span>}>
        {drivers.length ? (
          <div className="grid grid-cols-[6.5rem_1fr_2.5rem] items-center gap-x-3 gap-y-1.5 text-sm">
            {drivers.map(([k, v]) => (
              <div key={k} className="contents">
                <span className="text-muted-foreground">{k}</span>
                <Meter value={((v ?? 0) / Math.max(1e-9, totalDrivers)) * 100} tone="muted" />
                <span className="text-right text-xs text-muted-foreground tabular-nums">{Math.round(((v ?? 0) / totalDrivers) * 100)}%</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No choices yet.</p>
        )}
      </Section>
    </div>
  )
}

function MemoryTab({ agent }: { agent: Agent }) {
  return (
    <div className="flex flex-col gap-5">
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
      {agent.decisions.length > 0 && (
        <Section title="Decision history">
          <ol className="flex flex-col gap-1 text-sm">
            {[...agent.decisions].reverse().map((d, i) => {
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

function JevTab({ agent }: { agent: Agent }) {
  const last = agent.decisions.at(-1)
  if (!last) return <p className="text-sm text-muted-foreground">Nothing sent to JEV yet.</p>
  return (
    <Section
      title="Exact state sent to JEV"
      aside={<span className="text-xs text-muted-foreground tabular-nums">{formatTime(last.tick)} · {last.latencyMs} ms</span>}
    >
      <pre className="rounded-lg border bg-muted/40 p-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap">{last.state}</pre>
    </Section>
  )
}


/** Villager picker, identity header and tabbed mind, shared by live runs and replays. */
export function InspectorPanel({
  world,
  selectedId,
  onSelect,
}: {
  world: World
  selectedId: string
  onSelect: (id: string) => void
}) {
  const selected = world.agents.find((a) => a.id === selectedId) ?? world.agents[0]
  return (
    <aside className="flex min-h-[600px] min-w-0 flex-col overflow-hidden rounded-xl border bg-card lg:min-h-0">
      <div className="grid shrink-0 grid-cols-5 gap-1 border-b p-2" role="tablist" aria-label="Villagers">
        {world.agents.map((a) => (
          <button
            key={a.id}
            role="tab"
            aria-selected={a.id === selected.id}
            onClick={() => onSelect(a.id)}
            className={cn(
              "flex items-center gap-1.5 rounded-lg border px-1.5 py-1 text-xs font-medium transition-colors",
              a.id === selected.id ? "border-primary bg-primary/10" : "border-transparent hover:bg-muted",
            )}
          >
            <Avatar persona={a.persona} size={22} />
            <span className="truncate">{a.persona.name}</span>
          </button>
        ))}
      </div>
      <div className="shrink-0 border-b p-3">
        <AgentHeader world={world} agent={selected} />
      </div>
      <Tabs defaultValue="mind" className="min-h-0 flex-1 gap-0">
        <TabsList variant="line" className="w-full shrink-0 justify-start border-b px-2">
          <TabsTrigger value="mind">Mind</TabsTrigger>
          <TabsTrigger value="psyche">Psyche</TabsTrigger>
          <TabsTrigger value="relations">Relations</TabsTrigger>
          <TabsTrigger value="memory">Memory</TabsTrigger>
          <TabsTrigger value="jev">JEV input</TabsTrigger>
        </TabsList>
        <TabsContent value="mind" className="min-h-0 overflow-y-auto p-3">
          <MindTab agent={selected} />
        </TabsContent>
        <TabsContent value="psyche" className="min-h-0 overflow-y-auto p-3">
          <PsycheTab agent={selected} />
        </TabsContent>
        <TabsContent value="relations" className="min-h-0 overflow-y-auto p-3">
          <RelationsTab world={world} agent={selected} />
        </TabsContent>
        <TabsContent value="memory" className="min-h-0 overflow-y-auto p-3">
          <MemoryTab agent={selected} />
        </TabsContent>
        <TabsContent value="jev" className="min-h-0 overflow-y-auto p-3">
          <JevTab agent={selected} />
        </TabsContent>
      </Tabs>
    </aside>
  )
}

/** The village event log, docked under the world. */
export function VillageLog({ world }: { world: World }) {
  return (
    <div className="flex h-44 min-w-0 shrink-0 flex-col overflow-hidden rounded-xl border bg-card">
      <div className="flex shrink-0 items-center justify-between border-b px-3 py-1.5">
        <h3 className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">Village log</h3>
        <span className="text-xs text-muted-foreground tabular-nums">{world.log.length} events</span>
      </div>
      <ol className="min-h-0 flex-1 overflow-y-auto px-3 py-2 font-mono text-[12.5px]">
        {[...world.log].reverse().map((l, i) => (
          <li key={`${l.tick}-${i}`} className="grid grid-cols-[4.5rem_1fr] gap-2 py-px">
            <span className="text-muted-foreground tabular-nums">{formatTime(l.tick)}</span>
            <span
              className={cn(
                l.tone === "error" && "text-destructive",
                l.tone === "social" && "text-sky-600 dark:text-sky-400",
                l.tone === "conflict" && "text-amber-600 dark:text-amber-400",
                l.tone === "good" && "text-emerald-600 dark:text-emerald-400",
              )}
            >
              {l.text}
            </span>
          </li>
        ))}
      </ol>
    </div>
  )
}
