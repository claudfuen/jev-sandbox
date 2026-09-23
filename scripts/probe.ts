// Headless probe with the deterministic fake JEV: counters and timing, no network.
import { Session } from "@/lib/sim/session"
import { fakeAnswer } from "@/tests/fake-jev"

const seed = Number(process.argv[2] ?? 31)
const ticks = Number(process.argv[3] ?? 300)
const s = new Session({ seed })
const t0 = performance.now()
let calls = 0
for (let t = 0; t < ticks; t++) for (const req of s.tick()) { calls++; s.answer(req.id, fakeAnswer(req), "sample") }
const ms = performance.now() - t0
const w = s.world
console.log(JSON.stringify({ ms: Math.round(ms), perTick: +(ms / ticks).toFixed(2), calls, counters: w.counters, statuses: w.agents.map((a) => `${a.persona.name}:${a.status.kind}`) }, null, 1))
