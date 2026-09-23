import type { BuildingKind, DriverKey, JobId } from "./types"

// Jobs in Fernhollow. Pure data: where each job is done, its posted shift, and
// its pay. Nobody is forced to work. A job holder chooses each hour whether to
// go in, work diligently, coast or leave, and a shop is open only while its
// keeper is actually inside on shift, so a no-show is visible to everyone.

export type Job = {
  id: JobId
  title: string
  /** Where the work happens: a building kind, or an outdoor spot. */
  place: BuildingKind | "fields" | "pond" | "bridge" | "patrol"
  /** Posted shift in minutes of day, and ISO weekdays (1 = Monday). */
  shift: { start: number; end: number; days: number[] }
  /** Town payroll per full shift, paid at 6 pm pro rata by hours worked. 0 = self-employed. */
  pay: number
  /** What the work is, in the worker's own words. */
  doing: string
  drivers: DriverKey[]
}

const WEEKDAYS = [1, 2, 3, 4, 5]
const MON_SAT = [1, 2, 3, 4, 5, 6]
const DAILY = [1, 2, 3, 4, 5, 6, 7]
const h = (hour: number) => hour * 60

export const JOBS: Record<JobId, Job> = {
  mayor: {
    id: "mayor",
    title: "the mayor",
    place: "town_hall",
    shift: { start: h(9), end: h(17), days: WEEKDAYS },
    pay: 35,
    doing: "run the town from the town hall",
    drivers: ["purpose", "duty"],
  },
  police_officer: {
    id: "police_officer",
    title: "the police officer",
    place: "patrol",
    shift: { start: h(8), end: h(20), days: DAILY },
    pay: 30,
    doing: "patrol the town and keep the peace",
    drivers: ["purpose", "duty"],
  },
  doctor: {
    id: "doctor",
    title: "the town doctor",
    place: "clinic",
    shift: { start: h(9), end: h(17), days: WEEKDAYS },
    pay: 40,
    doing: "see patients at the clinic",
    drivers: ["purpose", "providing"],
  },
  nurse: {
    id: "nurse",
    title: "the nurse",
    place: "clinic",
    shift: { start: h(9), end: h(17), days: WEEKDAYS },
    pay: 22,
    doing: "care for patients at the clinic",
    drivers: ["purpose", "providing"],
  },
  teacher: {
    id: "teacher",
    title: "the teacher",
    place: "school",
    shift: { start: h(8), end: h(15), days: WEEKDAYS },
    pay: 25,
    doing: "teach the children at the school",
    drivers: ["purpose", "providing"],
  },
  journalist: {
    id: "journalist",
    title: "the journalist",
    place: "crier",
    shift: { start: h(10), end: h(16), days: WEEKDAYS },
    pay: 12,
    doing: "write and print the Fernhollow Crier",
    drivers: ["purpose", "curiosity"],
  },
  carpenter: {
    id: "carpenter",
    title: "the carpenter",
    place: "bridge",
    shift: { start: h(8), end: h(17), days: MON_SAT },
    pay: 25,
    doing: "work on the footbridge over Willow Creek",
    drivers: ["purpose", "building"],
  },
  shopkeeper: {
    id: "shopkeeper",
    title: "the shopkeeper",
    place: "store",
    shift: { start: h(8), end: h(18), days: MON_SAT },
    pay: 0,
    doing: "run the general store",
    drivers: ["purpose", "trade"],
  },
  cook: {
    id: "cook",
    title: "the cook at the Kettle diner",
    place: "diner",
    shift: { start: h(7), end: h(20), days: DAILY },
    pay: 0,
    doing: "cook and serve meals at the Kettle diner",
    drivers: ["purpose", "providing"],
  },
  innkeeper: {
    id: "innkeeper",
    title: "the innkeeper of the Rusty Lantern",
    place: "inn",
    shift: { start: h(16), end: h(24), days: DAILY },
    pay: 0,
    doing: "run the bar at the Rusty Lantern",
    drivers: ["purpose", "belonging"],
  },
  farmer: {
    id: "farmer",
    title: "the farmer",
    place: "fields",
    shift: { start: h(6), end: h(14), days: MON_SAT },
    pay: 0,
    doing: "work the Harrow fields",
    drivers: ["purpose", "providing"],
  },
  fisher: {
    id: "fisher",
    title: "the fisher",
    place: "pond",
    shift: { start: h(6), end: h(12), days: DAILY },
    pay: 0,
    doing: "fish at the pond",
    drivers: ["purpose", "providing"],
  },
}

/** ISO weekday for a 1-based day number; day 1 is a Monday. */
export const weekday = (day: number) => ((day - 1) % 7) + 1
export const WEEKDAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

export function onShift(job: Job, day: number, minuteOfDay: number): boolean {
  return job.shift.days.includes(weekday(day)) && minuteOfDay >= job.shift.start && minuteOfDay < job.shift.end
}

export function shiftPhrase(job: Job): string {
  const fmt = (m: number) => {
    const hr = Math.floor(m / 60) % 24
    return `${hr % 12 === 0 ? 12 : hr % 12} ${hr < 12 ? "am" : "pm"}`
  }
  const days =
    job.shift.days.length === 7 ? "every day" : job.shift.days.length === 5 ? "Monday to Friday" : "Monday to Saturday"
  return `${fmt(job.shift.start)} to ${job.shift.end >= 1440 ? "midnight" : fmt(job.shift.end)}, ${days}`
}
