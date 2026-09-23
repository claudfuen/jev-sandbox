import {
  ASSESS_HIGHLIGHTS,
  ASSESS_ROADMAP,
  MOOD_LEVELS,
  MOTIVES,
  NEED_KEYS,
  type NeedKey,
  type Perception,
  type WireOption,
} from "./schema"
import type { z } from "zod"
import type { assessPayloadSchema } from "./schema"

export const JEV_MODEL = "typesafe-ai/jev"

const NEED_WORDS: Record<NeedKey, readonly [string, string, string, string, string]> = {
  hunger: ["starving", "very hungry", "a bit peckish", "satisfied", "full"],
  thirst: ["parched", "very thirsty", "a little thirsty", "fine", "well hydrated"],
  energy: ["exhausted", "tired", "okay", "rested", "full of energy"],
  health: ["collapsing", "ill", "unwell", "fine", "healthy"],
  social: ["very lonely", "lonely", "fine", "connected", "socially full"],
  fun: ["bored stiff", "bored", "fine", "entertained", "delighted"],
  purpose: ["aimless", "drifting", "okay", "purposeful", "fulfilled"],
  respect: ["humiliated", "overlooked", "okay", "respected", "admired"],
}

export const NEED_NAMES: Record<NeedKey, string> = {
  hunger: "Hunger",
  thirst: "Thirst",
  energy: "Energy",
  health: "Health",
  social: "Social",
  fun: "Fun",
  purpose: "Purpose",
  respect: "Respect",
}

/** Honest physical consequences, so bodily urgency is not drowned out by personality words. */
function urgency(key: NeedKey, value: number): string | null {
  if (key === "hunger" && value < 15) return "you feel faint; if you go much longer without food your health will start to fail"
  if (key === "thirst" && value < 15) return "your mouth is dry and your head aches; without water your health will start to fail"
  if (key === "energy" && value < 10) return "you can barely keep your eyes open"
  if (key === "health" && value < 40) return "you are getting weak and could collapse"
  return null
}

export function needWord(key: NeedKey, value: number): string {
  const bucket = value < 15 ? 0 : value < 35 ? 1 : value < 60 ? 2 : value < 85 ? 3 : 4
  return NEED_WORDS[key][bucket]
}

function bullets(lines: string[], empty: string): string {
  return lines.length ? lines.map((l) => `- ${l}`).join("\n") : `- ${empty}`
}

/** The exact text JEV sees. Everything is in the character's own frame. */
export function buildState(p: Perception): string {
  const needs = NEED_KEYS.map((k) => {
    const v = Math.round(p.needs[k])
    const why = urgency(k, v) ?? p.needCauses[k]
    return `- ${NEED_NAMES[k]}: ${v}/100, ${needWord(k, v)}${why ? ` (${why})` : ""}`
  }).join("\n")

  return [
    `You are ${p.name}, ${p.role} in a small village. ${p.blurb}`,
    "",
    "Who you are:",
    bullets(p.psyche, "an ordinary villager"),
    "",
    `It is ${p.clock}.`,
    `Where you are: ${p.location}.`,
    "",
    "How you feel right now (100 = fully satisfied, 0 = desperate):",
    needs,
    "",
    "What you notice:",
    bullets(p.noticing, "nothing in particular"),
    "",
    "Recent memories (oldest first):",
    bullets(p.memories, "nothing notable yet today"),
    "",
    "How you feel about the others:",
    bullets(p.feelings, "you have no strong feelings about anyone yet"),
  ].join("\n")
}

const moodQuestion = (name: string) =>
  ({
    type: "score",
    instructions: `How is ${name} feeling overall right now?`,
    criteria: [...MOOD_LEVELS],
  }) as const

export function decideQuestions(p: Perception, options: WireOption[]) {
  return {
    action: {
      type: "choice",
      instructions: `Decide what ${p.name} does next. Pick the action this particular character would genuinely choose right now, given their personality, their needs, the time of day, their memories and what is around them. This is not about the optimal move, it is about what ${p.name} would actually do.`,
      criteria: Object.fromEntries(options.map((o) => [o.id, `${o.label}. ${o.detail}`])),
    },
    mood: moodQuestion(p.name),
    motive: {
      type: "choice",
      instructions: `What is mainly driving ${p.name} right now?`,
      criteria: { ...MOTIVES },
    },
  } as const
}

export function respondQuestions(p: Perception, askerName: string) {
  return {
    engage: {
      type: "boolean",
      instructions: `${askerName} just walked up to ${p.name} and wants to stop and chat. Given who ${p.name} is, how they feel right now and what they were doing, does ${p.name} actually stop to chat with ${askerName}?`,
    },
    mood: moodQuestion(p.name),
  } as const
}

// ---------------------------------------------------------------------------
// Assessment: JEV's estimate of whether a run is interesting to the owner.
// Advisory only. It stands in for no one and approves nothing.

const OWNER_BRIEF = [
  "The owner is building a social simulation to test whether JEV makes authentic decisions for independent characters.",
  "In their own words they want: authentic decision-making; an old-school Pokemon-style world with multiple independent agents; a world model where agents interact with multiple characters and there are real dynamics; a best-in-class environment; complex social dynamics where groups form, opinions spread, and even murder and reproduction happen, a truly complex society; a genuinely interesting social experiment; not only negative drivers but purpose, building things and providing for family; different drivers for different psychologies; economies with buying, selling, exploiting, manipulating, kindness and charity; and traits that evolve organically from behaviour, almost game-theoretically.",
  "They find repetitive, scripted-looking or uniform behaviour boring, and are excited by emergent, surprising, psychologically coherent behaviour that differs between characters.",
]

export function buildAssessState(p: z.infer<typeof assessPayloadSchema>): string {
  return [
    "About the owner:",
    ...OWNER_BRIEF.map((l) => `- ${l}`),
    "",
    `Simulation run: ${p.title}`,
    "",
    "What happened:",
    bullets(p.summary, "nothing was recorded"),
    "",
    "The villagers:",
    bullets(p.villagers, "no villagers"),
  ].join("\n")
}

export function assessQuestions() {
  return {
    interest: {
      type: "score",
      instructions: "As a social simulation experiment, how interesting would the owner find this run?",
      criteria: ["boring", "mildly interesting", "interesting", "very interesting", "fascinating"],
    },
    surprise: {
      type: "boolean",
      instructions: "Does this run contain at least one genuinely surprising, emergent behaviour that does not look scripted?",
    },
    distinct: {
      type: "score",
      instructions: "How distinct and psychologically coherent are the villagers' behaviours?",
      criteria: ["all the same", "slightly different", "clearly different", "very distinct", "vivid individuals"],
    },
    society: {
      type: "score",
      instructions: "How much does this look like a complex society rather than individuals acting alone?",
      criteria: ["no society", "a crowd", "some social structure", "a real community", "a complex society"],
    },
    story: {
      type: "boolean",
      instructions: "Is there a storyline in this run the owner would want to tell someone about?",
    },
    missing: {
      type: "choice",
      instructions: "What single addition would most increase how interesting this simulation is to the owner?",
      criteria: { ...ASSESS_ROADMAP },
    },
    best: {
      type: "choice",
      instructions: "What is the most interesting aspect of this run for the owner?",
      criteria: { ...ASSESS_HIGHLIGHTS },
    },
  } as const
}
