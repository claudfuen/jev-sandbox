import {
  MOOD_LEVELS,
  NEED_KEYS,
  type NeedKey,
  type Perception,
  type WireOption,
} from "./schema"

export const JEV_MODEL = "typesafe-ai/jev"

const NEED_WORDS: Record<NeedKey, readonly [string, string, string, string, string]> = {
  hunger: ["starving", "very hungry", "a bit peckish", "satisfied", "full"],
  thirst: ["parched", "very thirsty", "a little thirsty", "fine", "well hydrated"],
  energy: ["exhausted", "tired", "okay", "rested", "full of energy"],
  social: ["very lonely", "lonely", "fine", "connected", "socially full"],
  fun: ["bored stiff", "bored", "fine", "entertained", "delighted"],
}

const NEED_NAMES: Record<NeedKey, string> = {
  hunger: "Hunger",
  thirst: "Thirst",
  energy: "Energy",
  social: "Social",
  fun: "Fun",
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
  const needs = NEED_KEYS.map(
    (k) => `- ${NEED_NAMES[k]}: ${Math.round(p.needs[k])}/100, ${needWord(k, p.needs[k])}`,
  ).join("\n")

  return [
    `You are ${p.name}, a villager in a small top-down tile world. ${p.blurb}`,
    `Traits: ${p.traits.join(", ")}.`,
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
