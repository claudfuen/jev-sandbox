import {
  ASSESS_HIGHLIGHTS,
  ASSESS_ROADMAP,
  MOOD_LEVELS,
  MOTIVES,
  NEED_KEYS,
  type NeedKey,
  type OfferWire,
  type Perception,
  type WireOption,
} from "./schema"
import type { Experimental_EvaluationQuestion as EvaluationQuestion } from "ai"
import type { z } from "zod"
import type { assessPayloadSchema } from "./schema"

export const JEV_MODEL = "typesafe-ai/jev"

const NEED_WORDS: Record<NeedKey, readonly [string, string, string, string, string]> = {
  hunger: ["starving", "very hungry", "a bit peckish", "satisfied", "full"],
  thirst: ["parched", "very thirsty", "a little thirsty", "fine", "well hydrated"],
  energy: ["exhausted", "tired", "okay", "rested", "full of energy"],
  health: ["collapsing", "very weak", "weakening", "slightly weakened", "healthy"],
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
  if (key === "hunger" && value < 15) return "you are starving; your body is failing and you will collapse without food"
  if (key === "hunger" && value < 25) return "you are getting faint from hunger and need to eat soon"
  if (key === "thirst" && value < 15) return "you are badly dehydrated; your body is failing and you will collapse without water"
  if (key === "thirst" && value < 25) return "you are dehydrated and need water soon"
  if (key === "energy" && value < 10) return "you can barely keep your eyes open"
  return null
}

/** One plain sentence when the body is in real trouble, placed above everything else about needs. */
function bodyAlarm(p: Perception): string | null {
  const parts: string[] = []
  if (p.needs.thirst < 25) parts.push("you badly need water")
  if (p.needs.hunger < 25) parts.push("you badly need food")
  if (p.needs.health < 85) parts.push(`your health is ${Math.round(p.needs.health)}/100 and falling`)
  if (!parts.length) return null
  return `Your body needs attention: ${parts.join(", ")}.`
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
    ...(bodyAlarm(p) ? [bodyAlarm(p)!] : []),
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

/** The reply options for each kind of offer, from the approached villager's side. */
export function replyCriteria(offer: OfferWire, can: { food: number; coins: number }, askerName: string): Record<string, string> {
  switch (offer.kind) {
    case "chat":
      return {}
    case "gift_food":
    case "gift_coins": {
      const what = offer.kind === "gift_food" ? `${offer.n} food` : `${offer.n} coins`
      return {
        thank: `Accept the ${what} gratefully and thank ${askerName} warmly`,
        accept: `Accept the ${what} without making a fuss`,
        refuse: `Refuse the gift`,
      }
    }
    case "ask_food": {
      const c: Record<string, string> = {}
      if (can.food > 0) c.give_food = `Give ${askerName} 1 of your ${can.food} food`
      if (can.coins >= 2) c.give_coins = `Give ${askerName} 2 of your ${can.coins} coins to buy food`
      c.refuse = `Refuse and keep what you have`
      return c
    }
    case "lend":
      return {
        accept: `Borrow the ${offer.amount} coins and owe ${askerName} ${offer.owed} by tomorrow evening`,
        refuse: "Decline the loan",
      }
    case "demand_repay": {
      const c: Record<string, string> = {}
      if (can.coins >= offer.owed) c.repay = `Pay ${askerName} the ${offer.owed} coins you owe now`
      c.promise = "Promise to pay later"
      c.refuse = "Refuse to pay"
      return c
    }
  }
}

function offerSentence(offer: OfferWire, askerName: string): string {
  switch (offer.kind) {
    case "chat":
      return `${askerName} just walked up and wants to stop and chat.`
    case "gift_food":
      return `${askerName} just walked up and is offering you ${offer.n} food as a gift.`
    case "gift_coins":
      return `${askerName} just walked up and is offering you ${offer.n} coins as a gift.`
    case "ask_food":
      return `${askerName} just walked up, says they have not eaten properly in a long time, and begs you for something to eat.`
    case "lend":
      return `${askerName} just walked up and offers to lend you ${offer.amount} coins, to be paid back as ${offer.owed} coins by tomorrow evening.`
    case "demand_repay":
      return `${askerName} just walked up and, in front of anyone nearby, demands the ${offer.owed} coins you owe them.`
  }
}

export function respondQuestions(
  p: Perception,
  askerName: string,
  offer: OfferWire,
  can: { food: number; coins: number },
): Record<string, EvaluationQuestion> {
  const mood = moodQuestion(p.name)
  if (offer.kind === "chat") {
    return {
      engage: {
        type: "boolean",
        instructions: `${askerName} just walked up to ${p.name} and wants to stop and chat. Given who ${p.name} is, how they feel right now and what they were doing, does ${p.name} actually stop to chat with ${askerName}?`,
      },
      mood,
    }
  }
  return {
    reply: {
      type: "choice",
      instructions: `${offerSentence(offer, askerName)} Given who ${p.name} is, how they feel about ${askerName}, their own situation and what they know, how does ${p.name} actually respond?`,
      criteria: replyCriteria(offer, can, askerName),
    },
    mood,
  }
}

export { offerSentence }

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
