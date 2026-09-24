<!-- Synthesized 2026-09-23 from six audit lenses (docs/engine-audits-2026-09-23.json). Not yet red-teamed: the critic pass was stopped. -->

# Fernhollow engine rethink

Synthesis of six audits (world model, cognition, social, economy, performance, longevity/validity). Line numbers are HEAD 2db20e2 ("Conflict and justice, and a persistent live world"), which landed mid-audit: justice and persistence are now the baseline to harden, not proposals. Fake-JEV numbers measure gating code, not choices; real-JEV numbers come from the s600 records before their first desync. My check: `probe.ts 31 1440` on HEAD runs 0.55 ms per tick.

## 1. Diagnosis

1. **The engine, not the villager, picks targets.** Transfers go to `approachable[0]` (engine.ts:1281), violence to the least-liked adult within 8 (:1441), nobody indoors is approachable (:879); 88-95% of real approaches hit the nearest person, and a household member in sight cannot receive kindness in 62-81% of decisions.
2. **The world cannot be changed or owned.** Fixed map (town-map.ts:3), buildings with no owner or hp (types.ts:57-72), only two tile writes (engine.ts:1564, :1900), `homeOf` throws (:305).
3. **Consequences are constants and memory forgets.** 23 fixed `nudgeAffinity` values; 14-entry FIFO with 7 shown; recall of history with the person faced is 0.58 over 10 days; the asker's feelings line is missing in 38% of replies; mood is written, never read.
4. **No intentions, only blind engine commitments.** Every action is re-chosen from ~26 options (real mean top probability 0.49); one talk pick kept Odile chasing 40 ticks of her shift; 5 of 15 villagers reflected twice at midnight.
5. **The economy has no stakes.** Tills belong to nobody (Sable ends at 274 coins at price 3, 4 or 7); free berries cover ~96% of demand; no trade between people; money grows +120/day regardless; goods are one `food` number.
6. **No collective structure.** No groups, rules, votes or offices; roles are `persona.job`, so killing the officer and keeper gave 0 cases and 0 purchases in 4 days.
7. **History cannot be trusted.** One shared RNG (one answer delayed a tick changes 15/15 villagers); live answers land at network time (frozen 15/21/33% at 1x/2x/4x); 13/13 recorded runs fail on HEAD, one silently misapplying 93 answers; the checkpoint has no engine version and is 73% decision trace.
8. **"Authentic" is not defensible yet.** `eat` first in 93% of menus, `rest` last in 100%; min-p 0.25 cuts gifts plus loans from 3.4 to 0.1 per 1,000; option texts promise effects that do not exist (engine.ts:924, :1169, :1464); the judge gave identical labels 9/9 across 6 conditions.

## 2. Target architecture

The world is made of Things, and every act goes through one verb table and emits a Deed. Minds know only what they saw, were told or concluded. JEV scores and chooses over template text; it never writes.

```ts
type Owner = { agent: Id } | { collective: Id } | null
type Thing = { id; kind; pos; owner: Owner; access: "public" | "members" | Id[]
  hp; state: "planned" | "standing" | "damaged" | "ruined"; progress?; contents: Bundle; coins
  builtBy: Record<Id, number>; business?: { keeperIds; sells: Prices; buys: Prices }
  v: number; last: { tick; verb; by } }            // buildings, pantries, tills, bushes, trees, piles, tools
type Bundle = Partial<Record<Item, number>>        // berries|produce|fish|groceries|meal|wood|stone|tool; spoil rate per item
// transfer(from, to, goods, coins, deedId) is the only mover of goods and coins

type VerbDef = { family: "body"|"work"|"build"|"property"|"kind"|"hostile"|"civic"|"leisure"
  target: null | "person" | "thing"; adultOnly; gate(ctx) /* facts only, never traits */
  specify?: ("whom" | "which" | "amount")[]        // one follow-up choice call
  effects: EffectId[] /* option text rendered from these, and tested */; run(ctx): Deed | null }
type Deed = { id; tick; verb; actorId; targetId?; thingId?; ownerIds; value /* +help -harm */; consent; witnesses }

type Memory = { id; tick; kind; about: Id[]; deedId?; text; importance /* JEV-appraised */; formative } // cap 120
type Tie = { liking; trust; fear; balance /* favours */; lastSeen? }
type Belief = { id; claim; actorId; targetId?; deedId?; source: "saw"|"found"|{ told: Id }|"reflection"|"crier"; credence; tick }
type Seen = Record<ThingId, { v; tick; hp; contents?; price? }>
type Emotion = { kind; towardId?; intensity; since }            // half-life set by psyche
type Intention = { aim: AimKey; targetId?; steps: Intent[]; step; until; why?; shared: Id[] }

type Collective = { id; kind: "town"|"household"|"club"|"crew"|"congregation"; members; purseId; ruleIds; gathering? }
type Office = { id; collectiveId; holderId: Id | null; powers: Power[] }   // persona.job only seeds it
type Rule = { id; collectiveId; template /* ~40 */; params; sanction: 0|1|2|3|4; adoptedBy: Id | "county" }
type Proposal = { id; collectiveId; kind: "adopt_rule"|"repeal_rule"|"elect"|"spend"|"start_project"|"admit"|"expel"; params; meetingId }
type Offer = Existing | { kind: "trade"; give: Bundle; get: Bundle; coins } | { kind: "hire"; wage; hours }
// Flows: grant -> town purse (mayor's budget duty) -> wages and public works; producers -> businesses -> customers;
// till -> owner at close; sinks: spoilage, imported materials, upkeep.

type Checkpoint = { v; engine; promptHash; eventSeq; world: LeanWorld; pending }
type RunEvent = { seq; tick; agentId; kind; stateHash; answer }       // any mismatch = desync
type DecisionLog = { engine; promptHash; stateHash; shownOrder; probs; eligible; prunedMass; roll; picked; staleTicks }
// rand(world, agentId, stream): keyed per-agent streams; counters live on Agent
```

**Disagreements resolved.**
- **Targeting.** World wants verb x target options with family quotas; cognition and perf a same-call `whom`; social and validity a follow-up call. **Follow-up call:** it keeps the target conditional on the chosen act (perf concedes the same-call version loses this), needs one question instead of one per verb family, and costs ~$0.00005 (p90 0.48 s) only on targeted picks. It also carries economy's `amount` tiers. World's fact-only salience score ranks candidates and logs cuts; its quotas go, since each verb is one option.
- **Assets vs Things:** Things (world). One record for a rod, a stall and a house means each verb is written once.
- **Appraisal:** world's response choice (confront, report, retaliate, repair, let go) becomes an Intention `aim`; cognition's `feel` and `emotion` set Tie and Emotion. Three questions on the next call, no new call.
- **Object knowledge:** world's versioned, bounded `seen` cache over social's store-level Beliefs; Beliefs stay for claims about people.
- **Memory cap:** 120, not cognition's 300 (about 40 KB gz for 15 villagers), to respect perf's lean checkpoint.
- **Items:** Bundles with per-item spoil rates over economy's per-lot stacks; no question reads a lot's age.
- **Sampling:** validity and economy agree min-p hides gouging (`price_high` at p 0.09-0.20 never sampled) and gifts. Full sampling is the default; min-p is a named arm.

## 3. Increments

Every pilot is a real JEV run Claudio can watch. Baseline: $0.035 per 15-villager sim day.

**1. Durable live world (hours).** Hardens 2db20e2's lease, checkpoint and uncapped calls.
- Scope: ENGINE_VERSION (commit SHA) and PROMPT_HASH on checkpoint, run record and decisions; agentId and kind on RunEvent; keyed per-agent RNG at the 4 `nextRandom` sites (engine.ts:1495, 2624, 3019, 3068); clamp `can.coins` (schema.ts:93 rejects 501); lean checkpoint (decisions as {tick, picked, p}, no static map or personas, no `state` echo); one immutable checkpoint per sim day; MIGRATIONS registry; pause after 5 min with no visible tab; spend meter and a "budget exhausted" state (raising the $10 key budget is Claudio's call).
- Pilot: 1 real hour live at 1x (~$1.6) with 3 reloads, 6 min hidden, 10 min closed, 1 deploy.
- Pass: tick never resets; 0 ticks while hidden or closed; each version segment replays with 0 desyncs; a one-tick answer delay changes at most 1 villager; a 501-coin villager can answer.
- Budget: checkpoint at most 50 KB gz (lean variant measured 41 KB), save under 10 ms.

**2. Villagers choose whom; menus stop lying.**
- Scope: one option per social verb, then a follow-up `whom` call (at most 24 known people ranked by facts, each labelled with relationship, favour balance and location) plus `amount` tiers; approach within the same building; asker's line first; explore becomes one option plus `where`; seeded shuffle; DecisionLog; sampling defaults to full; till pays its owner at close; fix the false texts (engine.ts:924, :1049, :1169, :1464); `motive` on 1 in 4 decides.
- Pilot: lab seed 600, 2 sim days, JEV arm plus uniform-policy control (~$0.10).
- Pass: nearest-person share of targets falls from 88-95% to under 70%; a known household member or top tie is a candidate in at least 95% of targeted decides; median options at most 20; criteria text down at least 25%; 0 schema failures.
- Budget: calls up at most 35%, decide p90 at most 2.5 s.

**3. Harm that is felt ("destroy my house").**
- Scope: homes get owner, hp and state; `damage` and `repair` on a known building via `which`; Deeds, discovered when the owner sees `v` advance, with suspects drawn from who they saw nearby (possibly wrong); scored memory with focus retrieval; `feel`, `emotion` and a response `aim` on the victim's next call; decaying emotions shown as "How you feel inside"; a `property_harmed` life event; `homeOf` returns null (sleep rough); reflection once per sleep cycle. Justice fold-in: a (verb, permission) to crime-kind table sends vandalism into the existing cases; cases whose suspect died are closed.
- Pilot: seed 600, 3 sim days, recorded intervention on day 2 ("Hollis smashes the Vale door"); arms: no harm, and victim psyche swapped.
- Pass: in the re-ask harness, removing the harm memory shifts the victim's probability on acts toward Hollis by at least 3x shuffle noise; 3 days later the harm is in at least 90% of the victim's prompts facing Hollis (58-68% today); 0 double reflections.
- Budget: retrieval plus appraisal under 0.3 ms per call.

**4. Plans and logical time.**
- Scope: an Intention chosen from ~20 template aims on waking and on interrupts; `continue_plan` first; typed interrupts ask a yes/no `reconsider`; chases reconsider every 12 ticks; a shift is one intent; a THINK_TICKS barrier (answers apply at issue tick + 2, the clock stalls while one is late); one hedge at 1.5 s, jittered wakes, a semaphore; event tail persisted so spectators animate.
- Pilot: 2 sim days live at 1x, then the same answers replayed in the lab at 4x.
- Pass: identical worlds; no chase past 12 ticks without a reconsider; achieved speed at least 55% of 1x (simulated 53-69%); calls per villager per day within 10% of 15-16. Observed, not gated: shift attendance (0.36-0.40 today).

**5. Things and materials.**
- Scope: buildings, pantries, homeFood, shops, the project, bushes and graves become `things`, with a spatial index and blocked overlay; Bundles moved only by `transfer()`; trees and rocks yield wood and stone; `plan`, `build` (spends recipe materials), `repair`, `demolish` (contents spill into a still-owned pile, so taking is theft), `pick_up`, `place`; a ruined home makes its residents homeless; the canvas redraws on `thingsVersion`.
- Pilot: 3 sim days; Wren sells a rod and a plough.
- Pass: 0 item and coin drift; every verb reachable by the fake policy in 7 days; a house planned, built and demolished without a crash.
- Budget: enumerate p99 under 0.6 ms (prototype 0.56).

**6. Scarcity and trade.**
- Scope: spoilage; berries regrow 1 per 240 ticks; a `trade` offer with honest price tiers (accept, counter one tier, refuse); the store buys local produce and the diner cooks from ingredients; the owner picks the truck order; price tiers as shift-start side questions; `hire` offers; purpose from work tapers after 2 hours.
- Gate before JEV spend: a needs_greedy calibration shows supply at 1.1-1.3x demand, and shirking producers leave someone hungry.
- Pilot: 5 sim days, JEV plus control.
- Pass: money stock within 10% of flat; trades, gouging and conditional cooperation reported against control.

**7. Talk carries beliefs.**
- Scope: Beliefs, with `feel` replacing all 23 nudges; chat `topic` (up to 8 beliefs, small talk, or a fabrication) and the listener's `believe` score weighted by trust; perception reads `seen` and beliefs, not live state; `knows` becomes a view; the journalist chooses the Crier headline; sectioned perception (self facts never cut, top 8 people plus an aggregate line).
- Pilot: plant one eyewitness belief about a theft, run 3 sim days.
- Pass: every holder's source chain is traceable; credence varies with trust; with 60 cloned villagers no self facts are dropped (38% lose the coins line today).

**8. Collectives, offices and rules (commons pilot).**
- Scope: `c_town` and household collectives; found, invite, join, leave; offices gate powers, so officer and keeper seats survive a death via `elect` or `appoint`; county rules for murder, assault and theft; `call_meeting`, an `agenda` choice over the catalog, `vote`; the chapel pantry as a governed Thing with a ledger.
- Pilot: 3 sim days under famine pressure.
- Pass: a meeting is called, a rule adopted, and a violation reaches a case; a vacant seat is filled within 1 sim day.
- Budget: a 10-person, 2-item meeting takes about 20 calls ($0.002) and at most 3 s.

**9. Demography and stationarity.**
- Scope: aging; births from two consent booleans; seeded arrivals below a population floor; drift pulled back toward birth traits instead of the ±25 wall; money sinks proportional to the stock.
- Pilot: 30 sim days in the lab.
- Pass: population, coins per head and the share of traits at the cap stay bounded; replay stays exact across births.

## 4. Performance budget

| Metric | Measured | Target |
|---|---|---|
| step() at 15 / 100 villagers | 0.15-0.55 / 1.37 ms per tick | 1 / 3 ms (4x tick budget is 65 ms) |
| perceive, options per call | 0.1-0.2 ms each | 0.6 ms p99 with retrieval and enumeration |
| Decide input | ~8.8K chars, 52% options; p50 30, max 52 options (cap 64) | 5.5K chars; p50 20, max 40; `whom` list at most 24 |
| Self facts dropped at 60 / 100 villagers | coins line in 38% / 70% of decisions | 0% |
| JEV latency | decide p90 2.49 s, respond p90 0.48 s; bursts of 9+ at p50 897 ms | decide p90 1.5 s; at most 6 concurrent |
| Live vs lab | frozen 15 / 21 / 33% at 1x / 2x / 4x | 0 desyncs; show achieved speed |
| Cost | $0.035 per sim day, $1.4-1.8 per real hour at 1x; the $10 key lasts ~6 h | at most $0.05 per sim day; $0 while unwatched |
| Checkpoint | 183 KB gz every 8 s (~82 MB/h); 1.14 MB at 100 | 50 KB; 300 KB at 100 |
| Replay | 30 days in 0.84-1.33 s; keyframes use 125 MB heap | same speed; at most 15 MB |
| Canvas | 8,465 fillRect per frame, 62% of it buildings | under 1K; 0 while paused |

Engine CPU is not the constraint. JEV payload, JEV latency and persistence volume are. Re-measure every row at the end of each increment.

## 5. Validity instruments

1. **DecisionLog provenance:** version, prompt hash, state hash, shown order, full probabilities, eligible set, pruned mass, roll, stale ticks.
2. **Seeded option shuffle;** fixed order only as an ablation.
3. **One declared `sample()` for every question type;** full by default, min-p 0.25 as an arm.
4. **Control policies** (uniform, needs_greedy, first_option) through the same pipeline; report JEV minus control over at least 5 seeds.
5. **Counterfactual re-ask harness** (shuffle, neutral wording, psyche swap, one fact, drop an option). "Psychology-driven" only if the psyche-swap effect is at least 3x shuffle plus wording; 1,000 probes ~$0.09.
6. **Consequence tests:** each option's `effects` asserted on a cloned world; replies whose options yield identical states fail (29 of 46 attack replies today).
7. **Replay integrity in CI:** a committed fixture replays with 0 desyncs, keyed by agentId, kind, stateHash.
8. **Pairwise blinded judge** without the feature checklist, trusted only once it prefers JEV over uniform 80% of the time; its "missing" output is advice, not roadmap evidence.

## 6. Not doing

- Free text from JEV: rules, rumours and proposals come from template catalogs.
- Embedding memory: structured `about` ids plus importance suffice.
- A server-side headless driver: pause-when-closed is accepted.
- Verb x target menus near 255 options; per-lot freshness; order books and auctions.
- Faster walking, until plans show where time goes; more than one hedged retry.
- More than 30 villagers before sectioned perception (increment 7).
- Rejected: family quotas, a 300-memory cap, `mood` on every call without reading it, choosing roadmap items from the judge.
