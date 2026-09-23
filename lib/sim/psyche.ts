// Individual psychology. The engine stores it as numbers (0-100) and only ever
// reaches JEV through `psycheLines`, a few honest first-person sentences. Live
// probes showed worded profiles steer JEV about twice as strongly as numbers,
// so the wording is versioned: changing it is an experimental change.
//
// Psychology never ranks options. It affects (1) the words in perception,
// (2) how fast each person's higher needs drain, and (3) how consequences feel.

export const PSYCHE_RENDER_VERSION = 1

export type Big5 = {
  openness: number
  conscientiousness: number
  extraversion: number
  agreeableness: number
  neuroticism: number
}

/** Schwartz basic values. */
export const VALUE_KEYS = [
  "selfDirection",
  "stimulation",
  "hedonism",
  "achievement",
  "power",
  "security",
  "conformity",
  "tradition",
  "benevolence",
  "universalism",
] as const
export type ValueKey = (typeof VALUE_KEYS)[number]

/** Moral foundations. */
export const FOUNDATION_KEYS = ["care", "fairness", "loyalty", "authority", "sanctity", "liberty"] as const
export type FoundationKey = (typeof FOUNDATION_KEYS)[number]

export type Attachment = "secure" | "anxious" | "avoidant" | "fearful"

export type Dark = { machiavellianism: number; narcissism: number; psychopathy: number }

export type Psyche = {
  big5: Big5
  values: Record<ValueKey, number>
  foundations: Record<FoundationKey, number>
  attachment: Attachment
  dark: Dark
  /** 0 cautious .. 100 bold */
  risk: number
  /** 0 lives for today .. 100 plans for the long run */
  patience: number
  /** Generalised trust in others. */
  trust: number
}

export type PsycheSpec = {
  big5?: Partial<Big5>
  values?: Partial<Record<ValueKey, number>>
  foundations?: Partial<Record<FoundationKey, number>>
  attachment?: Attachment
  dark?: Partial<Dark>
  risk?: number
  patience?: number
  trust?: number
}

const fill = <K extends string>(keys: readonly K[], partial: Partial<Record<K, number>> = {}, base = 50) =>
  Object.fromEntries(keys.map((k) => [k, partial[k] ?? base])) as Record<K, number>

/** Everything unspecified sits at the population middle (50), dark traits low (20). */
export function makePsyche(spec: PsycheSpec = {}): Psyche {
  return {
    big5: fill(["openness", "conscientiousness", "extraversion", "agreeableness", "neuroticism"] as const, spec.big5),
    values: fill(VALUE_KEYS, spec.values),
    foundations: fill(FOUNDATION_KEYS, spec.foundations),
    attachment: spec.attachment ?? "secure",
    dark: fill(["machiavellianism", "narcissism", "psychopathy"] as const, spec.dark, 20),
    risk: spec.risk ?? 50,
    patience: spec.patience ?? 50,
    trust: spec.trust ?? 55,
  }
}

// ---------------------------------------------------------------------------
// Words

const TRAIT_WORDS: Record<keyof Big5, { high: string; low: string }> = {
  openness: { high: "curious and imaginative, drawn to anything new", low: "practical and set in your ways, wary of the unfamiliar" },
  conscientiousness: { high: "diligent and disciplined, you finish what you start", low: "easygoing and careless about duties" },
  extraversion: { high: "outgoing, energised by company", low: "reserved, happy with your own company" },
  agreeableness: { high: "warm and cooperative", low: "blunt, competitive and hard to please" },
  neuroticism: { high: "anxious and quick to worry", low: "calm and steady under pressure" },
}

const VALUE_WORDS: Record<ValueKey, string> = {
  selfDirection: "your independence",
  stimulation: "excitement and novelty",
  hedonism: "pleasure and comfort",
  achievement: "achievement and doing well",
  power: "power and getting ahead of others",
  security: "safety and stability",
  conformity: "fitting in and following the rules",
  tradition: "tradition and custom",
  benevolence: "caring for the people close to you",
  universalism: "fairness for everyone",
}

const FOUNDATION_WORDS: Record<FoundationKey, string> = {
  care: "protecting the vulnerable",
  fairness: "fairness",
  loyalty: "loyalty to your people",
  authority: "respect for order and leaders",
  sanctity: "purity and the sacred",
  liberty: "freedom from being controlled",
}

const ATTACHMENT_WORDS: Record<Attachment, string> = {
  secure: "You trust that the people who care about you will stay.",
  anxious: "You worry people will drift away and you crave reassurance.",
  avoidant: "You keep people at arm's length and rely on yourself.",
  fearful: "You want closeness but expect to be hurt.",
}

const list = (xs: string[]) => (xs.length <= 1 ? xs.join("") : `${xs.slice(0, -1).join(", ")} and ${xs.at(-1)}`)

/** At most seven short first-person lines: the only way psychology reaches JEV. */
export function psycheLines(p: Psyche, vocation?: string): string[] {
  const lines: string[] = []

  const traits = (Object.keys(TRAIT_WORDS) as (keyof Big5)[])
    .filter((k) => p.big5[k] >= 66 || p.big5[k] <= 34)
    .sort((a, b) => Math.abs(p.big5[b] - 50) - Math.abs(p.big5[a] - 50))
    .map((k) => {
      const v = p.big5[k]
      const word = v >= 66 ? TRAIT_WORDS[k].high : TRAIT_WORDS[k].low
      return v >= 80 || v <= 20 ? `very ${word}` : word
    })
  if (traits.length) lines.push(`Temperament: ${list(traits)}.`)

  const values = [...VALUE_KEYS].sort((a, b) => p.values[b] - p.values[a])
  const top = values.slice(0, 3).filter((k) => p.values[k] > 55)
  const bottom = values.at(-1)!
  if (top.length) {
    lines.push(
      `What matters most to you: ${list(top.map((k) => VALUE_WORDS[k]))}.${p.values[bottom] < 35 ? ` You care little for ${VALUE_WORDS[bottom]}.` : ""}`,
    )
  }

  const strong = FOUNDATION_KEYS.filter((k) => p.foundations[k] >= 70).map((k) => FOUNDATION_WORDS[k])
  const weak = FOUNDATION_KEYS.filter((k) => p.foundations[k] <= 30).map((k) => FOUNDATION_WORDS[k])
  if (strong.length || weak.length) {
    const parts = [strong.length ? `you feel strongly about ${list(strong)}` : "", weak.length ? `you care little about ${list(weak)}` : ""]
    lines.push(`Moral instincts: ${parts.filter(Boolean).join("; ")}.`)
  }

  const trust = p.trust >= 70 ? " You tend to trust others." : p.trust <= 30 ? " You are slow to trust anyone." : ""
  lines.push(`${ATTACHMENT_WORDS[p.attachment]}${trust}`)

  const shadow: string[] = []
  if (p.dark.machiavellianism >= 55) shadow.push("you deceive and manipulate people when it pays and you will not be caught")
  if (p.dark.narcissism >= 55) shadow.push("you crave admiration and resent others getting credit")
  if (p.dark.psychopathy >= 55) shadow.push("you feel little guilt when your choices hurt people")
  if (p.big5.neuroticism >= 75) shadow.push("fear can make you selfish")
  if (p.big5.conscientiousness <= 25 && p.values.hedonism >= 65) shadow.push("you happily let others do the work")
  if (shadow.length) lines.push(`Your shadow: ${list(shadow)}.`)

  const horizon = p.patience >= 70 ? "You plan for the long run" : p.patience <= 30 ? "You live for today" : "You balance today and tomorrow"
  const risk = p.risk >= 70 ? " and you take bold risks." : p.risk <= 30 ? " and you avoid risks." : "."
  lines.push(`${horizon}${risk}`)

  if (vocation) lines.push(`Your calling: ${vocation}.`)
  return lines.slice(0, 7)
}

// ---------------------------------------------------------------------------
// Physics hooks: how the psyche shapes need decay (never option choice)

/** Per-tick drain multipliers for the needs a psyche changes. */
export function needRates(p: Psyche) {
  return {
    social: 0.5 + p.big5.extraversion / 100,
    fun: 0.5 + p.big5.openness / 200 + p.values.stimulation / 200,
    purpose: 0.5 + p.big5.conscientiousness / 100 + p.values.achievement / 200,
    respect: 0.4 + p.dark.narcissism / 100 + p.values.achievement / 200,
  }
}
