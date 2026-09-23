// One tick is five in-game minutes. The world starts at 7:00 am on day 1.
export const MINUTES_PER_TICK = 5
const START_MINUTES = 7 * 60

export type DayPhase = "early morning" | "morning" | "afternoon" | "evening" | "night"

export function clockOf(tick: number) {
  const total = START_MINUTES + tick * MINUTES_PER_TICK
  const day = Math.floor(total / 1440) + 1
  const minuteOfDay = total % 1440
  const hour = Math.floor(minuteOfDay / 60)
  const minute = minuteOfDay % 60
  const phase: DayPhase =
    hour < 5 || hour >= 21
      ? "night"
      : hour < 8
        ? "early morning"
        : hour < 12
          ? "morning"
          : hour < 17
            ? "afternoon"
            : "evening"
  return { day, hour, minute, minuteOfDay, phase }
}

export function formatTime(tick: number): string {
  const { hour, minute } = clockOf(tick)
  const h = hour % 12 === 0 ? 12 : hour % 12
  return `${h}:${String(minute).padStart(2, "0")} ${hour < 12 ? "am" : "pm"}`
}

export function formatClock(tick: number): string {
  const { day, phase } = clockOf(tick)
  return `day ${day}, ${formatTime(tick)} (${phase})`
}

export const isNight = (tick: number) => clockOf(tick).phase === "night"

/** 0 at midday, up to ~0.55 in the dead of night. Used by the renderer. */
export function darkness(tick: number): number {
  const { minuteOfDay } = clockOf(tick)
  const h = minuteOfDay / 60
  if (h >= 7 && h < 18) return 0
  if (h >= 18 && h < 21) return ((h - 18) / 3) * 0.5
  if (h >= 21 || h < 5) return 0.55
  return 0.55 - ((h - 5) / 2) * 0.55
}
