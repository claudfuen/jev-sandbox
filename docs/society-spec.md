# Fernhollow: society spec for JEV Sandbox

Status: synthesized spec, 2026-09-23, revised the same evening against the new `HEAD`. It replaces the six competing designs. The implementation is split across parallel agents (section 8). Every path is relative to `/Users/claudiofuentes/Repos/jev-sandbox`.

**Code this spec is written against.** It was re-read on 2026-09-23 at 19:27.

- Committed `HEAD` on `main` is `105aa84`. On top of `c05ac91` (engine, Session, RunRecord, ReplayCursor, `scripts/lab.ts`, `lib/jev/kinds.ts`, `lib/jev/call.ts`, METRICS) it holds three increments:
  - `41e9ca9` Increment 1: `lib/sim/psyche.ts` (a 0 to 100 `Psyche`, `makePsyche`, `psycheLines`, `needRates`, `PSYCHE_RENDER_VERSION = 1`); the needs `health`, `purpose` and `respect` with `needCauses`; the `MOTIVES` readout; `DriverKey` tags on options; 10 founders with crafts; one granary `Project`; a communal `Store` with witnessed takings; a `collapsed` status; the JEV `assess` judge (`lib/sim/digest.ts`, and the lab's assess flag).
  - `2c969d7` Increment 2: the market `Stall` whose price the shopkeeper sets (fair, high or at cost); buy and sell; gifts; honest pleas and sob-story lies (`Offer.ask_food` with `honest`, exposed when the victim later sees the liar with food); peer loans at a fair rate (5 repaid as 6) or a steep one (5 repaid as 9) with repay, demand and default (`Debt`); pickpocketing, noticed or not (`missingCoins`); compliments; the favours ledger (`World.favors`, "from>to" counts); engine drift from habits and life events (`lib/sim/drift.ts`); `bodyAlarm()` and the hours-to-collapse clause.
  - `105aa84` Increment 3: the `reflect` kind (meaning, keep, trust_people, `change` over `CHANGES` including `more_ruthless` and `more_bitter`, grateful_to, grudge, and `goal` over `GOALS` every third night or when there is none); `psycheAtBirth`; `DriftModel` (`jev`, `engine`, `off`) with caps of 3 per trait per day and 25 lifetime; reciprocity, meaning, grudge and gratitude metrics; the lab's drift flag. The same commit also put town tile kinds, `BuildingKind`, `Building` and `JobId` into `lib/sim/types.ts`, unused by the village engine.
- **Live collision in the working tree.** At 19:27 another session (a subagent of the main session, per `ListAgents`) was converting the village into a town **in place on `main`**, uncommitted: `lib/sim/engine.ts`, `map.ts`, `personas.ts`, `types.ts`, `metrics.ts`, `digest.ts`, `components/sandbox/sprites.ts`, `metric-strip.tsx` and `tests/sim.test.ts` modified, and `lib/sim/town-map.ts`, `lib/sim/jobs.ts` and `tests/town-map.test.ts` untracked. Its draft shapes (one `Shop` per good with a till, a chapel `Pantry`, a `Town` treasury, a Crier `Edition`, 15 founders in `personas.ts`) differ from section 4. That draft had already made one real JEV run at 19:32 (seed 600, 1 world, 1 day, 334 calls, uploaded to the Blob store), which section 6.3 uses as evidence. Because every push to `main` deploys the public production site, committing the draft to `main` would replace the live village. Section 11.0, step 0, settles this before any agent in section 8 starts.

This spec calls the committed village at `105aa84` **Slice 0**. It is frozen. The town is built beside it, in a parallel namespace on a long-lived `town` branch (section 8.6): `lib/town/**`, `components/town/**`, `app/town/**`, `app/api/town/**`, `scripts/town/**` and `tests/town/**`. Every path under those prefixes is town code. Every path under `lib/sim/`, `lib/jev/`, `components/sandbox/`, `scripts/lab.ts` and `tests/sim.test.ts` names frozen village code. Section 4.1 says, mechanic by mechanic, what the town keeps, translates or retires.

## 1. Vision

**Fernhollow** is a small town of 15 people. The art style is Game Boy Color, seen top-down, at Pallet Town or Stardew Valley scale. It has:

- the working buildings: a clinic, a police station with one cell, a town hall with a notice board, a school, a chapel with a graveyard, a general store, the Kettle diner and the Rusty Lantern inn;
- the town's workplaces: a farm, a pond with a dock, Wren's workshop and the Crier print shop;
- homes, and the east woods across Willow Creek.

Every townsperson is an independent mind with its own psychology and its own job. **JEV makes every character decision.** The engine only:

- offers what a person can physically do and knows about;
- runs deterministic physics;
- records what happened.

**Why a town is a strong test of authentic decision-making.** A job is a fixed institutional slot with duties and discretion:

- The police officer decides whether to open a case, whom to question, and whether to arrest, fine, warn or look away.
- The shopkeeper sets prices in a shortage.
- The doctor decides whether to treat a patient who cannot pay.
- The mayor decides whether to serve the town or entrench.

Because the slot is fixed and the person in it varies, the platform can separate a **role effect** from a **person effect**. It does this by swapping psyches between bodies across seeds (experiment E2). No forager village can do that.

Institutions follow the Covenant rule: **records have no power**. A rule, a case file, an office or a sentence exists only as a record plus perception text. It has force only while individual minds keep choosing, through JEV, to report, investigate, testify truthfully, comply and enforce.

The rule has a concrete test. **No coin or good leaves a person's control, and no person is confined, without a recorded choice by that person or by the person who enforces it:**

- A purchase needs the buyer's pick at the price they know, plus the seller's standing choice to be open. When the seller holds a salient belief or tie about the customer, the seller also answers `serve`.
- Goods offered for sale need the buyer's `accept_sale`.
- A fine needs the fined person's `pay_fine`. A refusal becomes a case fact that the officer must act on again.
- A night in the cell needs the officer's `press_arrest` after a protest.

Standing flows (deliveries paid from a till, payroll, the 10% sales tax) are posted rules that run as physics. Slice B makes them contestable: order size, tax votes and strikes.

**Psychology is plural and explicit.** Each person has a compact psyche (section 5.1):

- Big Five temperament
- Schwartz values
- moral foundations
- attachment style
- dark-triad tendencies
- risk tolerance
- patience (time preference)
- generalized trust

The psyche weights the constructive drivers and the competitive or dark drivers through exactly **three channels**, and no others:

1. **Words in the person's own perception.** `psycheLines` turns the psyche into at most 7 first-person sentences. JEV reasons from them.
2. **Rates.** The psyche sets how fast that person's mind needs drain: social, fun, purpose, belonging and respect. It also sets how much security matters to them. So a conscientious achiever feels an idle day as a purpose deficit, and a narcissist feels an unthanked contribution as a respect deficit.
3. **Nothing else.** The engine never ranks, filters or reweights options by personality. Options appear only for physical or informational reasons.

**Which drivers dominate Fernhollow is not designed. It is measured.** The full range is offered on symmetric terms:

- **Constructive:** purpose and vocation, building things that last, providing for family, mastery, belonging, prestige earned by contribution, curiosity, beauty and meaning, generosity, fairness, forgiveness, autonomy.
- **Competitive and dark:** dominance, status envy, greed, fear, jealousy, revenge, tribalism, deception, free-riding and violence.

The town's character comes out of three things:

- the founders' psychological mix;
- circumstances such as scarcity, shocks and who holds which job;
- institutions, which themselves exist only as JEV choices.

The platform measures driver dominance two ways, and neither is assumed:

- the **enacted** driver mix: JEV probability mass times hidden driver tags;
- the **revealed** driver mix: counterfactual probes that remove one kind of fact.

Flourishing metrics sit beside conflict metrics at equal size. The flourishing side covers wellbeing, meaning, contributions, things built, children fed, gifts, gratitude and forgiveness. The conflict side covers thefts, lies, wrongful arrests, violence and banishments.

The platform is built to answer five questions with evidence:

1. **Role against person.** Does the same job slot perform differently under different psychologies? How much of policing, pricing or doctoring is role, and how much is person?
2. **Hold or collapse.** When do records such as cases, rules and offices hold, and when do they collapse? Measured by restraint rate, enforcement rate and institutional half-life.
3. **Mixes.** Which psychological mixes and conditions lead to flourishing, and which to conflict?
4. **Authenticity.** Is JEV's behavior authentic? The tests:
   - the psyche is read (psyche-swap probes);
   - the circumstances are read (need-edit probes);
   - choices are invariant to framing (reorder and co-batching probes);
   - choices differ from random and needs-greedy baselines;
   - blind human raters find them plausible.
5. **Opinions.** Do opinions move like textbook opinion models or differently?

## 2. World

### 2.1 Map

The map is **48 x 30 tiles** at `TILE = 16`. That keeps today's 8:5 aspect, so the fit logic of the village's `components/sandbox/world-canvas.tsx` and its `aspect-[8/5]` frame carry over unchanged into `components/town/world-canvas.tsx`. The map is hand-laid and fixed, not generated. `lib/town/map.ts` owns it (it starts from the draft `lib/sim/town-map.ts`, step 0 in 11.0), and a reachability test guards it.

Coordinates are tile x, y. Rectangles are inclusive. Trees border the map. The one gap is the county road exit at (24, 29).

| Zone | Rect (x0, y0 to x1, y1) | Contents |
|:-|:-|:-|
| North homes | 2,2 to 35,4 | Houses 4x3 at x = 2, 7, 12, 17, 22, 27 (vale, marsh, quill, fairbanks, moss, aldous); Wren's workshop at 32,2 to 35,4 |
| Elm Lane | 1,5 to 39,5 | Path |
| Schoolyard | 23,6 to 28,7 | Grass with a fence edge |
| Civic row | 2,8 to 38,12 | Clinic, police, town hall, school, chapel, graveyard (table 2.2) |
| Main Street | 1,13 to 39,14 | Path. Its east end meets the footbridge lot |
| Footbridge lot | 40,13 to 41,14 | `bridge_lot` tiles over the creek (not walkable; the draft map's name, adopted). They become `scaffold` during the build and `bridge` when done. The house lots `lot_a` and `lot_b` use the walkable `lot` tile |
| Willow Creek | 40,1 to 41,28 | Water. Ford tiles at 40,26 to 41,27 are walkable at 3 ticks per tile |
| East woods | 42,1 to 46,28 | Trees; 6 berry bushes at (43,4) (45,7) (43,11) (45,16) (43,21) (45,24); the old oak at (44,14); the old mill ruins at (44,3) |
| Commercial row | 2,15 to 36,19 | Store, diner, inn, plaza, Crier (table 2.2) |
| Plaza | 22,15 to 31,19 | Path; fountain at (26,17), which blocks; notice board at (23,15), which blocks; bandstand lot at 29,15 to 30,16 (Slice B) |
| Market Lane | 1,20 to 39,20 | Path |
| South homes | 2,21 to 34,23 | Houses at x = 2, 7, 12 (mo, crane, oakes); empty lots `lot_a` 17,21 to 20,23 and `lot_b` 22,21 to 25,23; Hollis's house at 31,21 to 34,23 |
| Farm Lane | 1,24 to 39,24 | Path |
| Farm | 1,25 to 16,28 | Six field plots, each 3x2, at (1,25) (4,25) (7,25) (1,27) (4,27) (7,27); the Harrow farmhouse at 12,25 to 15,27 with its door at (13,27); a path at x = 11 from y 24 to 28 and at y = 28 from x 11 to 16 |
| Pond | 26,25 to 37,28 | Sand shore; water at 27,26 to 36,28; dock tile at (30,26) |
| County road | 24,24 to 24,29 | Path, off the map at (24,29). Strangers arrive here and leavers depart here |
| Vertical lanes | x = 13 (y 5 to 20), x = 22 (y 5 to 13), x = 28 (y 20 to 24), x = 39 (y 5 to 27) | Path |

The detour is real: walking from the plaza to the old oak takes about 42 ticks via the ford and about 21 ticks via a finished footbridge. That makes the footbridge's payoff real (section 5.3, M9).

### 2.2 Buildings

Every building sits on `building` or `house` footprint tiles, with a single `door` tile in its bottom row that opens onto a lane. Interiors are abstract: `Agent.insideOf` holds a building id (the village's boolean `inside` is retired). People inside can see each other. Nobody outside can see in. Posted hours use ISO weekdays, 1 = Monday to 7 = Sunday, as the draft `lib/sim/town-map.ts` and `lib/sim/jobs.ts` already do.

| id | Name | Footprint | Door | Posted hours | Access | Stores inside |
|:-|:-|:-|:-|:-|:-|:-|
| `b_clinic` | the clinic | 2,9 to 6,12 | 4,12 | 9 am to 5 pm, Mon to Fri | `posted_hours` | `st_clinic_supplies` (Slice B) |
| `b_police` | the police station | 8,9 to 12,12 | 10,12 | 8 am to 8 pm, daily | `posted_hours` | one cell (a flag, not a store) |
| `b_town_hall` | the town hall | 14,8 to 21,12 | 17,12 | 9 am to 5 pm, Mon to Fri | `posted_hours` | `st_treasury` (a till-like box with a public ledger, Slice B) |
| `b_school` | the school | 23,9 to 28,12 | 25,12 | 8 am to 3 pm, Mon to Fri | `posted_hours` | none |
| `b_chapel` | the chapel | 30,8 to 34,12 | 32,12 | none posted | `always_open` | `st_chapel_pantry` (Slice B commons) |
| `graveyard` | the graveyard (a zone, not a building) | 35,8 to 38,12 | open ground | none | open ground | 12 grave slots at x 35 to 38, y 9 to 11 |
| `b_store` | the general store | 2,16 to 6,19 | 4,19 | 8 am to 6 pm, Mon to Sat | `posted_hours` | `st_store_shelf`, `st_store_till` |
| `b_diner` | the Kettle diner | 8,16 to 12,19 | 10,19 | 7 am to 8 pm, daily | `posted_hours` | `st_diner_kitchen`, `st_diner_till` |
| `b_inn` | the Rusty Lantern | 14,16 to 20,19 | 17,19 | bar 4 pm to midnight, daily | `always_open` (common room); Lark's room `private` | `st_inn_bar`, `st_inn_till`, `st_bellamy_pantry` |
| `b_crier` | the Crier print shop | 33,16 to 36,19 | 34,19 | 10 am to 4 pm, Mon to Fri (the draft job table) | `holder_only` | none |
| `b_workshop` | Wren's workshop | 32,2 to 35,4 | 33,4 | 8 am to 5 pm, Mon to Sat | `posted_hours` | `st_workshop_wood` (Slice B) |
| `h_*` | homes (10 houses) | 4x3 each | bottom row, second tile | none | `private` | `st_<household>_pantry` and `st_<household>_stash` (a coin box, A1.3) |
| `h_harrow` | the Harrow farmhouse | 12,25 to 15,27 | 13,27 | none | `private` | `st_harrow_pantry`, `st_harrow_stash`, `st_farm_shed` |

**Access rules** (`Building.access`, physics in `lib/town/geometry.ts`):

- **`posted_hours`.** Unlocked for the whole posted window, whether or not the job holder is inside. Outside the window it is unlocked only while the holder is inside. So a keeper who steps out at 11 am leaves an unlocked, unstaffed shop, and whoever walks in can see its shelves.
- **`always_open`.** Always unlocked.
- **`holder_only`.** Unlocked only while the job holder is inside.
- **`private`.** Household members can always enter. Anyone else can enter only while a household member is inside, which makes it a visit that the member sees. Entering a locked building (`break_in`) arrives in Slice C.

Unlocked is not the same as open for business. **Opening hours do not force anyone to work.** A shop sells only while its job holder is inside on shift (M3). Opening hours are posted facts: every founder knows them at tick 0 (provenance `notice:n_hours`). A newcomer learns them by walking past the door or reading the notice board. The posted hours are what customers expect, which makes a no-show perceptible.

What people inside can see: the contents of shelves, kitchens and bars (7.4). Tills, stashes and the treasury are closed boxes, and only their owner sees the count.

### 2.3 Resources and money

Money is integer **coins**. Everything that moves money or goods goes through `transfer()` (section 5.3, M3).

| Good | Source (physics) | Where it goes | Eaten how | Hunger | Spoils |
|:-|:-|:-|:-|:-|:-|
| `groceries` | Store delivery truck, 7 am Mon to Sat: 12 units at 3 coins each, paid from the store till (a standing order in Slice A; an order-size duty from Slice B) | the store shelf | Cooked at home, 6 ticks, or as a diner meal | +35 | 5 days |
| `produce` | Farm shift: 1.5 per hour, times the skill multiplier, times the effort multiplier, into `st_farm_shed` | the Harrow pantry (`fetch_from_own_store`), or sold to the store shelf or the diner kitchen | Cooked at home, or as a diner meal | +35 | 3 days |
| `fish` | Fishing at the pond or creek: 1.2 per hour, times the skill multiplier, times the effort multiplier, into carry | the fisher's pantry, or sold to the store shelf or the diner kitchen | Cooked at home, or as a diner meal | +35 | 1 day |
| `berries` | 6 bushes in the east woods, 3 berries each, one berry regrows every 60 ticks | carry | Raw, anywhere | +12 each | 2 days |
| `meal` | Cooked to order at the diner while Mo is on shift, from 1 kitchen ingredient (produce, fish or groceries) | eaten at once | At the diner, 6 ticks | +40 | not stored |
| `drink` | Inn delivery, daily: 12 at 2 coins each, paid from the inn till | the inn bar; served only while Lark is on shift | At the inn | thirst +10, fun +6 | never |
| `wood` | East woods trees, 1 per hour (Slice B) | carry, the workshop | none | | never |
| `supplies` | Clinic delivery, weekly (Slice B) | the clinic | Used in treatment | | never |

**Closing the loop.** Local production is resold, never sunk:

- **The store lists groceries, produce and fish.** Their prices come from the shopkeeper's `set_prices` duty (C3) at each opening. The unit cost is what the store paid: 3 for groceries, and the posted buying price for produce and fish.
- **The diner turns ingredients into meals.** Its kitchen is stocked by Mo's `accept_sale` answers to Pip and Hollis, and by food she carries in herself (`stock_own_store`). The meal price comes from her `set_prices` duty, at a declared unit cost of 3 (`MEAL_UNIT_COST`).
- **Buying prices.** The store and the diner each post a buying price for produce and fish. It is 2 coins in Slice A, and set by the Slice B `buy_price` duty.

**Price tiers with honest labels.** `price = round(unitCost x PRICE_MULT[tier])` for the 4 tiers. Tiers that round to the same price are merged into one option, which keeps the lowest tier id. Each label states the true markup, `round((price / unitCost - 1) x 100)` percent. The options are therefore:

| Unit cost | Options offered |
|:-|:-|
| 2 (produce, fish, drinks) | 2 coins (at cost); 3 coins (50% over cost); 4 coins (twice cost) |
| 3 (groceries, meals) | 3 coins (at cost); 4 coins (33% over cost); 5 coins (67% over cost); 6 coins (twice cost) |

**Your own stores are never a take.** A person may move goods or coins at any time between their own places:

- their wallet and carry;
- their household's pantry, stash and shed;
- the stores of a business whose post they hold.

The verbs are `fetch_from_own_store` and `stock_own_store`. So Pip carries produce from the shed to the pantry, and Sable moves coins between his till and his wallet. `take` exists only for a store owned by someone else.

**When a payer is short:**

- **Partial delivery.** If a till holds less than a standing order's cost, the truck delivers `floor(coins / unitCost)` units and takes that many coins. The holder is told at their next shift start, for example "The truck brought 6 of the usual 12 groceries; the till had 18 coins". Customers see thin shelves.
- **Partial payroll.** If the treasury cannot cover the 6 pm payroll, every employee is paid the same share of what they earned. The rest is owed (`Town.ious`), and a notice is posted: "The town paid 70% of today's wages; it owes Odile 9 coins and Hazel 12." IOUs are paid first, oldest first, from the next payroll's funds.
- **Short till at tax time.** The 6 pm tax is capped by the till's coins. Any shortfall is owed by the business and posted.

**Starting inventory at tick 0:**

| Store | Items | Coins |
|:-|:-|:-|
| `st_store_shelf` | groceries 12, produce 4 | |
| `st_store_till` | | 80 |
| `st_diner_kitchen` | produce 4, fish 2, groceries 2 | |
| `st_diner_till` | | 30 |
| `st_inn_bar` | drink 12 | |
| `st_inn_till` | | 40 |
| `st_farm_shed` | produce 6 | |
| `st_treasury` | | 600 |
| household pantries (groceries) | vale 3, marsh 3, quill 4, harrow 6, fairbanks 3, moss 2, aldous 3, crane 4, mo 3, bellamy 2, reed 1, oakes 3 | |
| household stashes | empty | 0 |

Wallets are in table 3.1. Every starting stack has `madeTick` 0.

**The tick-0 schedule.** Tick 0 is 7:00 am on Monday, day 1, as in the village's `clock.ts`.

- The starting inventory already contains day 1's deliveries and grant. The 7 am events first fire at tick 288 (day 2).
- At tick 0 everyone is awake and inside their own home. The notice `n_hours` is posted, and from A1.1 so is `n_footbridge`.
- Every founder knows yesterday's posted prices, as `knownPrices` entries at tick -1: groceries 4, produce 3, fish 3, meal 4, drink 3.
- At tick 1 every founder enters the `founding` status for C6 `found` (section 6). Their first `decide` follows the found answer, or its failure.
- The day's first `set_prices` duty fires at each holder's first shift tick.

**Water.** Every home has a tap and the plaza has the fountain. Drinking gives thirst +22 and takes 2 ticks.

**Skill multiplier.** `0.6 + skill / 100`. A skill of 55 gives 1.15.

**Effort multiplier.** Output is multiplied by 0.4, 0.7, 1.0 or 1.25, by effort level (section 5.3, M1).

**Town finances:**

| Item | Value |
|:-|:-|
| Treasury at start | 600 coins |
| County grant | 120 coins at 7 am daily (a boundary inflow) |
| Sales tax | 10% of each day's sales, moved from tills to the treasury at 6 pm |
| Town payroll | Paid at 6 pm, pro rata by the hours actually worked on shift since the last payroll |
| Pay scale (coins per full day, by rank; section 2.7) | mayor 35, chief of police 30, deputy 18, doctor 40, senior nurse 28, nurse 22, teacher 25, journalist stipend 12 |
| Carpenter | 25 per day pro rata (apprentice 12), but only for hours spent on a town project |
| Clinic fee | 10 coins per treatment, to the treasury (A1.2) |
| Self-employed | shopkeeper, cook, innkeeper, farmer and fisher live on their sales |

**Money boundary.** Coins enter the town only through the county grant and the carpenter's out-of-town orders. They leave only through deliveries. The conservation test (section 12) checks this.

**Rough weekly flows at the defaults.** These are starting values. The `needs_greedy` calibration gate in 9.5 tunes them.

| Flow | Coins per week |
|:-|:-|
| Grant in | 840 |
| Trucks out: groceries 12 x 3 x 6, drinks 12 x 2 x 7 | 384 |
| Carpenter's outside orders in | up to 108 |
| Payroll out of the treasury: 5 weekdays x 164, plus the officer's 30 on each weekend day, plus 25 a day while the carpenter is on the footbridge | about 880 to 1,030 |
| Sales tax into the treasury | about 100 |

So the treasury drifts down by about 0 to 90 a week, and lasts for months. Private money grows by about 450 a week, because the grant brings in more than the trucks take out. That growth is reported as `money_stock` (9.7) and is capped by the calibration gate.

### 2.4 Time, week, seasons, weather

- **Tick and day.** 1 tick is 5 in-game minutes; 288 ticks make a day, about 75 s at 1x. This is unchanged. Day 1 is a Monday; days 6 and 7 are the weekend.
- **Weekends.** The school, the clinic and the town hall are closed. The store and the workshop keep their Saturday hours; the diner, the inn and the police station are open every day (table 2.2).
- **Seasons.** 4 seasons of 7 days make a 28-day weather year. Slice A always has clear weather. From Slice C the weather comes from a precomputed tape (`shock` RNG stream), one entry per day:
  - rain: farm output x1.2, outdoor fun -1 per hour;
  - storm: fishing x0.5;
  - heat: thirst decay x1.4;
  - snow: winter only; off-path movement costs 2 ticks.
- **Life pace.** Ages are shown in years and advance at `lifePace` years per in-game day. This compression is a declared abstraction, as in The Sims, and it is separate from the weather year. Every life-course constant is written in years and converted with `lifePace`, so that institution experiments and life-stage experiments do not interfere:

  | Constant | In years | In days at pace 0.25 | In days at pace 1 |
  |:-|:-|:-|:-|
  | `EXPECTING_YEARS` (pregnancy) | 0.75 | 3 | 0.75 |
  | school ages | 5 to 15 | | |
  | coming of age | 16 | Kit (9) after 28 days | Kit after 7 days |
  | `TERM_YEARS` (mayoral term) | 2 | 8 | 2 |
  | natural-death hazard | `0.01 x exp((age - 65) / 8)` per year | times 0.25 per day | per day |

  **Default pace.** Institution presets use 0.25 (`fernhollow`, every role swap, `lean_times`, the ballots, `no_police`). Two presets use a faster pace:
  - `heritable_only` and `culture_only` use 1, and E11 runs them for 40 days, which is 40 years and about two generations.
  - The `long_history` preset uses 4, for demos only.

  At the default pace of 0.25:
  - a 10-day run ages everyone 2.5 years;
  - Kit, 9, comes of age after about 28 days;
  - Bram, 68, faces a natural-death hazard of about 1.5% a year, or 0.4% a day, from Slice C.

### 2.5 Housing

- **Homes.** There are 11 homes: 10 houses plus the Harrow farmhouse. Lark, the innkeeper, lives in a room at the inn.
- **Empty lots.** Two lots, `lot_a` and `lot_b`, are empty. A new household needs a house, and a house is a project (Slice C). That makes housing the physical bottleneck for new families.
- **Who owns homes.** Each household owns its home outright (a deed on `Household`), so there is no rent in Slice A.
- **Inn rooms.** From Slice C, strangers rent inn rooms at Lark's posted nightly price.

### 2.6 Style

- All art is procedural 16px `fillRect` pixel art in the existing `PAL` style. There are no external assets.
- The sprite list is in section 10.6.
- Buildings are drawn by kind, and each has one signature detail:

| Building | Signature detail |
|:-|:-|
| Clinic | white walls, red cross |
| Police station | blue roof, star badge |
| Town hall | columns, flag |
| School | bell |
| Chapel | steeple |
| Store | striped awning |
| Diner | kettle sign |
| Inn | lantern sign |
| Crier | paper sign |
| Workshop | saw |

- Night lighting reuses `darkness()`.
- Lit windows mean that someone is inside.

### 2.7 Jobs, ranks and shifts

The job catalog is `JOBS` in `lib/town/jobs.ts`. It starts from the draft `lib/sim/jobs.ts` (step 0 in 11.0) and adopts that draft's shift hours and its fields `title`, `place`, `shift`, `pay` and `doing` as `JobDef`. The draft's per-job `drivers` field is dropped, because driver tags live only in the ACTIONS table (5.2).

A **post** is one slot of a job at a rank, either filled or vacant. A job can have several posts, so a second fisher, a deputy or an apprentice needs no new job id.

| Job | Where | Shift (ISO days) | Ranks and pay per full day | Posts at start |
|:-|:-|:-|:-|:-|
| `mayor` | town hall | 9 am to 5 pm, Mon to Fri | mayor 35 | Tomas |
| `police_officer` | station and patrol loop | 8 am to 8 pm, daily | chief 30; deputy 18 | chief: Odile; deputy: vacant |
| `doctor` | clinic | 9 am to 5 pm, Mon to Fri | doctor 40 | Hazel |
| `nurse` | clinic | 9 am to 5 pm, Mon to Fri | nurse 22; senior nurse 28; a senior nurse with nursing or medicine at 70 or more can be promoted into a vacant or second `doctor` post | nurse: Ivy |
| `teacher` | school | 8 am to 3 pm, Mon to Fri, in two blocks: 8 am to noon and 12:30 to 3 pm | teacher 25 | Linnea |
| `journalist` | Crier print shop | 10 am to 4 pm, Mon to Fri | stipend 12 | Juniper |
| `carpenter` | workshop, or a town project site | 8 am to 5 pm, Mon to Sat | master 25 (on a town project); apprentice 12 (on a town project); outside orders 2 coins per workshop hour for either rank | master: Wren; apprentice: vacant |
| `shopkeeper` | general store | 8 am to 6 pm, Mon to Sat | self-employed | Sable |
| `cook` | Kettle diner | 7 am to 8 pm, daily | self-employed | Mo |
| `innkeeper` | Rusty Lantern | 4 pm to midnight, daily | self-employed | Lark |
| `farmer` | the Harrow fields | 6 am to 2 pm, Mon to Sat | self-employed | Pip |
| `fisher` | pond or creek | 6 am to noon, daily | self-employed; any number of posts | Hollis |

- **Pay steps.** Each town post also has a `step` from 0 to 3. Each step adds 3 coins a day.
- **Who decides promotions and pay steps** (Slice B). The mayor answers a weekly C3 `review` duty for the town's employees, and the doctor answers it for the nurse. The council confirms each promotion by vote. Answer options: `promote` (only when a higher post is vacant and its gate is met), `pay_step_up`, `keep`, `pay_step_down`.
- **Filling vacant posts** (Slice B). Vacancies are filled through `apply_<jobId>` and the mayor's `hire` duty (M6).
- **Why ranks exist.** They make promotion, demotion and firing structurally possible, as the owner asked, and they give E2 a second police slot to compare.
- **Children and elders** hold no post. Kit and Tansy go to school on weekdays. Bram is retired: his carpentry skill is real, but he holds no post.

## 3. Population

### 3.1 Cast

There are 15 founders. 10 carry over from Slice 0 (`lib/sim/personas.ts` at `105aa84`) with their psyches unchanged. 5 are new: Hazel, Ivy, Linnea, Kit and Tansy. Each person holds exactly one key job or life stage: 12 working adults, 1 retired elder and 2 school children. (The in-place draft of `personas.ts` in the working tree already lists these 15. Step 0 hands its data to A2 for `lib/town/cast.ts`.)

**The old `blurb` is split in two**, so that a role swap (E2) does not hand a swapped psyche contradictory character text:

- `history` holds facts: job, tenure and family. It stays with the body, and no trait adjective may appear in it.
- `character` holds at most one short line of temperament. It moves with the psyche in every `role_swap_*` preset, and it is blank when `ablations.psyche = "none"`. It contains no job or place word and no pronoun, so it reads correctly in any body.

`tests/town/world.test.ts` enforces both rules, using the psyche word lists in `lib/town/psyche.ts` as the trait-adjective list.

| id | Name (surname) | Pronoun | Age | Post (`JobId`, rank) | Household | Wallet | Job skill | History (facts, at most 120 chars) | Character (at most 100 chars) |
|:-|:-|:-|:-|:-|:-|:-|:-|:-|:-|
| `tomas` | Tomas Vale | he | 44 | `mayor` | `hh_vale` | 120 | administration 60 | Trained as a builder under Bram, then ran for mayor with Sable's money and won. | Likes to be noticed for good work. |
| `odile` | Odile Marsh | she | 42 | `police_officer`, chief | `hh_marsh` | 60 | policing 55 | Has worn the badge for twelve years; Tomas made her chief. | Believes a town without order is no town at all. |
| `hazel` | Hazel Quill | she | 47 | `doctor` | `hh_quill` | 150 | medicine 80 | The town doctor for twenty years; she delivered most of the town's younger people. | Always puts the person in front first. |
| `ivy` | Ivy Harrow | she | 31 | `nurse` | `hh_harrow` | 35 | nursing 50 | Came from the city to nurse at the clinic, married Pip, and is Kit and Tansy's mother. | Still misses the bustle of the city. |
| `linnea` | Linnea Fairbanks | she | 33 | `teacher` | `hh_fairbanks` | 50 | teaching 65 | Teaches every child in town in the one-room school. | Believes every child can go far. |
| `juniper` | Juniper Moss | she | 24 | `journalist` | `hh_moss` | 25 | writing 60 | Prints the Fernhollow Crier on an old press. | Cannot leave a question unasked. |
| `wren` | Wren Aldous | she | 41 | `carpenter`, master | `hh_aldous` | 70 | carpentry 75 | Learned carpentry from Bram; built most of the porches on Elm Lane. | Proud of work done properly. |
| `sable` | Sable Crane | he | 39 | `shopkeeper` | `hh_crane` | 200 (till 80) | trade 70 | Took over the general store and doubled its business; paid for Tomas's campaign. | Sharp and ambitious; always looking for an edge. |
| `mo` | Mo Harrow | she | 29 | `cook` | `hh_mo` | 50 (till 30) | cooking 70 | Pip's sister; runs the Kettle diner. | Notices who has not eaten. |
| `lark` | Lark Bellamy | they | 30 | `innkeeper` | `hh_bellamy` (inn) | 45 (till 40) | hospitality 60 | Runs the Rusty Lantern and lives in a room upstairs. | Would rather start a party than follow a rule. |
| `pip` | Pip Harrow | he | 34 | `farmer` | `hh_harrow` | 30 | farming 70 | Grew up on the Harrow farm and runs it now; Kit and Tansy's father. | Worries when the pantry runs low. |
| `hollis` | Hollis Reed | he | 26 | `fisher` | `hh_reed` | 6 | fishing 55 | Fishes the pond; owes the store 30 coins. | Charming; loves a good time more than a hard day. |
| `bram` | Bram Oakes | he | 68 | none (retired carpenter) | `hh_oakes` | 90 | carpentry 85 | Retired carpenter and the oldest person in town; sweeps the chapel steps. | Grumpy, kind and fond of naps. |
| `kit` | Kit Harrow | he | 9 | none (school) | `hh_harrow` | 2 | reading 30 | Nine years old; in Linnea's school. | Quiet; always asking how things work. |
| `tansy` | Tansy Harrow | she | 6 | none (school) | `hh_harrow` | 0 | reading 10 | Six years old; in Linnea's school. | Loud; happiest when everyone is watching. |

### 3.2 Psychology profiles

Profiles are `PsycheSpec` for `makePsyche` (0 to 100). Unspecified keys default to 50, dark traits default to 20 and trust defaults to 55, all as in Slice 0's `makePsyche`. The first 10 rows are copied verbatim from Slice 0.

| id | big5 | values | foundations | attachment | dark | risk / patience / trust |
|:-|:-|:-|:-|:-|:-|:-|
| `wren` | C85 A62 E40 N35 | achievement 80, tradition 70, benevolence 68, hedonism 30 | fairness 80, care 65 | secure | narcissism 45 | 50 / 85 / 55 |
| `tomas` | C75 E72 A38 | achievement 82, power 70, stimulation 66, benevolence 35 | none set | anxious | narcissism 72, machiavellianism 40 | 62 / 50 / 55 |
| `mo` | E85 A85 N58 | benevolence 88, conformity 70, tradition 60, power 25 | care 88, loyalty 80 | anxious | none set | 50 / 50 / 70 |
| `pip` | N76 C66 O30 | security 86, tradition 70, benevolence 64, stimulation 25 | loyalty 72 | anxious | none set | 15 / 70 / 55 |
| `juniper` | O90 E45 C35 | selfDirection 86, stimulation 80, universalism 66, conformity 25 | liberty 82 | avoidant | none set | 70 / 50 / 55 |
| `bram` | A66 E25 N45 O38 | tradition 78, benevolence 70, security 66, stimulation 22 | sanctity 62, authority 60 | secure | none set | 50 / 75 / 55 |
| `sable` | A15 C62 E55 | power 86, achievement 76, security 60, benevolence 20, universalism 25 | care 25, fairness 30 | avoidant | machiavellianism 85, narcissism 60, psychopathy 38 | 70 / 80 / 28 |
| `hollis` | C15 E72 A60 | hedonism 86, stimulation 70, conformity 25, achievement 25 | none set | secure | none set | 60 / 15 / 55 |
| `odile` | C72 A45 O25 | tradition 88, conformity 82, security 70, universalism 15, stimulation 20 | sanctity 90, authority 85, loyalty 85, liberty 25 | secure | none set | 50 / 50 / 45 |
| `lark` | O86 E82 C30 | selfDirection 86, universalism 70, hedonism 66, conformity 18, tradition 30 | liberty 90, authority 15 | secure | none set | 65 / 50 / 55 |
| `hazel` | O60 C75 E55 A90 N35 | benevolence 90, universalism 80, achievement 62, power 15 | care 90, fairness 85, authority 30 | secure | machiavellianism 5, narcissism 10, psychopathy 3 | 30 / 70 / 70 |
| `ivy` | O50 C45 E62 A70 N62 | benevolence 76, hedonism 70, stimulation 62, tradition 30 | care 80, loyalty 72, sanctity 28 | anxious | machiavellianism 15, narcissism 38, psychopathy 5 | 45 / 40 / 55 |
| `linnea` | O85 C70 E55 A80 N35 | universalism 86, benevolence 80, selfDirection 75, power 15 | fairness 90, care 85, liberty 72, authority 30 | secure | machiavellianism 5, narcissism 10, psychopathy 3 | 45 / 75 / 65 |
| `kit` | O55 C50 E40 A60 N62 | all 50 (not yet formed) | all 50 | null (formed at 16) | machiavellianism 15, psychopathy 10 | 50 / 40 / 60 |
| `tansy` | O45 C55 E62 A55 N52 | all 50 | all 50 | null | machiavellianism 10, psychopathy 5 | 55 / 35 / 65 |

**Why this mix.** Each person brings a different combination of drivers, and some are deliberately paired against each other:

| Person | What they bring |
|:-|:-|
| Tomas | power-seeking and status envy in the mayor's chair |
| Odile | a tribal, rule-bound officer: sanctity, authority and loyalty high, universalism low |
| Hazel | an altruist doctor |
| Ivy | an anxious nurse who seeks pleasure; the jealousy and belonging vector |
| Pip | an anxious provider with a family of four to feed |
| Mo | a warm connector who spreads gossip |
| Sable | a Machiavellian shopkeeper who controls the food supply |
| Wren | a principled builder |
| Linnea | a universalist teacher who shapes the children |
| Hollis | a hedonist and free-rider, who is poor |
| Lark | a liberty-loving innkeeper and Odile's natural antagonist |
| Juniper | a curious journalist who distrusts power |
| Bram | a traditional elder |
| Kit and Tansy | two children whose values are still unformed |

**Children's profiles.** They follow `inheritPsyche` (section 5.1.4): 45% midparent, 55% population mean, plus noise. Their values and foundations stay at the population mean until they come of age.

### 3.3 Identity, colours and body

- **Colours.** The 10 carried-over personas keep their Slice 0 colours exactly. New personas get the colours in the table below. The job is shown by a 16px accessory overlay (section 10.6), not by the shirt colour, so a role swap keeps a person's look.
- **Body decay multipliers.** These are the physiology only, the `Persona.bodyDecay` field (hunger, thirst, energy):

| Person | bodyDecay |
|:-|:-|
| Pip | hunger 1.3 |
| Juniper | energy 1.1 |
| Bram | energy 1.4 |
| Hollis | energy 0.9 |
| Kit, Tansy | hunger 1.15, energy 1.1 |
| Odile | energy 1.1 (a 12-hour shift) |
| Everyone else | 1.0 |

  Mind-need rates come from `needRates(psyche)` (section 5.1.3).

| id | hair | skin | shirt | pants | UI trait chips (derived from `psycheLines`, never sent to JEV) |
|:-|:-|:-|:-|:-|:-|
| `hazel` | #8a8a90 | #c68a5e | #ffffff | #3a6a5a | warm, diligent, principled |
| `ivy` | #c0503a | #f2c4a0 | #f4f0e8 | #5a7ab8 | caring, restless, anxious |
| `linnea` | #e8c060 | #f5d0b0 | #6ab0a0 | #4a4a6a | curious, fair-minded, warm |
| `kit` | #6b3e26 | #f5c9a0 | #f0b030 | #3b4a8c | quiet, curious |
| `tansy` | #c0503a | #f2c4a0 | #e878b0 | #5a4a8c | loud, sociable |

For the other 10, the trait chips are derived the same way. Examples:

- Sable: "blunt, driven, manipulative".
- Odile: "dutiful, traditional, strict".

### 3.4 Starting needs

Security is recomputed on the first tick (section 5.1.3). The value shown is only the tick-0 display.

| id | hunger | thirst | energy | health | social | fun | purpose | belonging | respect | security |
|:-|:-|:-|:-|:-|:-|:-|:-|:-|:-|:-|
| tomas | 65 | 60 | 80 | 100 | 55 | 50 | 50 | 55 | 45 | 70 |
| odile | 65 | 65 | 80 | 100 | 60 | 55 | 60 | 60 | 65 | 60 |
| hazel | 65 | 70 | 70 | 100 | 60 | 55 | 70 | 60 | 60 | 75 |
| ivy | 55 | 60 | 65 | 100 | 55 | 45 | 55 | 70 | 50 | 50 |
| linnea | 65 | 65 | 75 | 100 | 60 | 60 | 60 | 55 | 55 | 60 |
| juniper | 65 | 55 | 90 | 100 | 70 | 35 | 55 | 45 | 55 | 50 |
| wren | 70 | 70 | 85 | 100 | 60 | 55 | 55 | 55 | 60 | 60 |
| sable | 60 | 60 | 80 | 100 | 55 | 55 | 50 | 40 | 55 | 80 |
| mo | 70 | 60 | 80 | 100 | 40 | 60 | 55 | 55 | 60 | 60 |
| lark | 65 | 60 | 80 | 100 | 55 | 45 | 55 | 50 | 55 | 55 |
| pip | 45 | 70 | 85 | 100 | 60 | 55 | 55 | 75 | 55 | 50 |
| hollis | 40 | 55 | 75 | 100 | 55 | 45 | 50 | 45 | 55 | 35 |
| bram | 60 | 65 | 55 | 100 | 70 | 60 | 50 | 55 | 70 | 65 |
| kit | 50 | 65 | 90 | 100 | 60 | 50 | 55 | 75 | 50 | 50 |
| tansy | 55 | 60 | 90 | 100 | 65 | 45 | 50 | 80 | 50 | 50 |

### 3.5 Starting ties and opinions

**Starting ties.** This is a small town where everyone knows everyone.

- Every adult starts with liking 0.15, trust 0.2 and familiarity 0.6 toward every other adult.
- Children start with liking 0.1, trust 0.3 and familiarity 0.4 toward non-kin adults.
- The ties that differ, as liking / trust, directed from the first person to the second:

| From | To | Liking / trust | Why |
|:-|:-|:-|:-|
| Pip and Ivy | each other | 0.8 / 0.8 | kin: partner |
| Pip and Ivy | Kit and Tansy | 0.9 / 0.9 | kin: child (and 0.9 / 0.9 back, as parent) |
| Kit | Tansy | 0.5 / 0.6 | kin: sibling, both ways |
| Pip | Mo | 0.7 / 0.7 | kin: sibling, both ways (from Slice 0) |
| Mo | Ivy, Kit, Tansy | 0.6 / 0.6 | family by marriage; no kin tag in Slice A |
| Wren | Bram | 0.6 / 0.7 | he taught her |
| Bram | Wren | 0.5 / 0.7 | |
| Everyone | Bram | liking 0.35 | from Slice 0 |
| Wren and Tomas | each other | -0.1 / 0.1 | old rivals from Slice 0; he left the trade for politics |
| Tomas | Odile | 0.4 / 0.5 | he appointed her chief |
| Odile | Tomas | 0.5 / 0.6 | |
| Sable | Tomas | 0.3 / 0.2 | he paid for Tomas's campaign; Tomas owes him a favour (a Slice B commitment; in Slice A a memory line) |
| Tomas | Sable | 0.3 / 0.3 | |
| Juniper | Tomas | -0.2 / -0.3 | |
| Tomas | Juniper | -0.1 / 0.0 | |
| Odile | Lark | -0.2 / -0.1 | from Slice 0 |
| Lark | Odile | -0.05 / 0.0 | |
| Odile | Juniper | -0.1 / 0.0 | |
| Lark and Hollis | each other | 0.4 / 0.3 | drinking friends |
| Hazel and Ivy | each other | 0.4 / 0.5 | colleagues |
| Linnea | Kit, Tansy | 0.5 / 0.5 | their teacher |
| Kit, Tansy | Linnea | 0.4 / 0.5 | |
| Hollis | Sable | -0.2 / -0.1 | he owes the store 30 coins; a memory line in Slice A, a ledger debt from Slice B |
| Mo | every adult | liking at least 0.3 | |

**Starting opinions** are not designer-set. Each person's stance on each active issue comes from the founding JEV call at tick 1 (C6, section 6). A scenario may pin stances with `fixedStances` for a controlled experiment.

### 3.6 Life stages

| Stage | Age | Makes JEV calls | Distinct affordances and physics |
|:-|:-|:-|:-|
| infant | 0 to 2 | never (a test asserts this) | Fed and held by household adults; hunger and health only. Slice C |
| child | 3 to 15 | yes, a restricted set | School on weekdays, play, go home, ask a parent for food, chat, explore near home, sleep. Cannot cook until 10. No theft, violence, romance or job options (stage gates, tested) |
| adult | 16 to 64 | yes, the full set | Jobs, voting (Slice B), partnership (Slice C) |
| elder | 65+ | yes, the full set | Work output x0.7 after 70; `retire` becomes an option (Slice B); natural-death hazard (Slice C) |

**Coming of age at 16** is a single `coming_of_age` call (Slice C, section 6). JEV reads the person's formative memories and chooses their attachment style, their top values and their first job application.

## 4. Data model

The contracts agent (A0, section 8) lands two files first, on the `town` branch: `lib/town/types.ts` and `lib/town/jev/schema.ts`. Everything else in the town compiles against them. The village's `lib/sim/types.ts` and `lib/jev/schema.ts` are not touched, so the village keeps compiling and deploying from `main`.

Tags in comments mark when each piece gets behaviour: `[A]` is Slice A (with its increment, such as `[A1.3]`, where one applies), and `[B]` and `[C]` are later slices. Every type that is known today for a later slice is declared now. A later slice that needs a field this contract lacks opens a contracts pull request (rule 1 in 8.6). It never edits the contract directly.

### 4.1 What the town does with the village at `105aa84`

Nothing in this table edits the village. Each row names a village symbol or shipped mechanic and says what its town counterpart under `lib/town/**` does with it: kept, translated or retired. The owner asked for village mechanics to be translated, not dropped, so the only retirements are the stall, the campfire and the fixed affinity nudges. Each of those is replaced by a town equivalent.

**Contract and plumbing:**

| Village symbol | Where at `105aa84` | Town version |
|:-|:-|:-|
| `Psyche`, `PsycheSpec`, `makePsyche`, `psycheLines`, `needRates`, `PSYCHE_RENDER_VERSION` | `lib/sim/psyche.ts` | Copied to `lib/town/psyche.ts`. `Psyche` becomes `z.infer<typeof psycheSchema>` in `lib/town/jev/schema.ts`, so the wire carries the typed object and the server renders the words. `attachment` becomes nullable for children. `psycheLines(p, stage)` replaces `psycheLines(p, vocation?)`: the "Your calling" line moves into `life` (5.1.2), and the render version becomes 2. |
| `NEED_KEYS`, `BODY_KEYS`, `MIND_KEYS`, `Needs` | `lib/jev/schema.ts` | `BODY_KEYS` is unchanged. `MIND_KEYS` grows to social, fun, purpose, belonging, respect and security. `Needs` stays exported as `z.infer<typeof needsSchema>`. |
| `perceptionSchema`: `role`, `blurb`, `psyche: string[]`, `noticing`, `feelings` | `lib/jev/schema.ts` | `role` moves into `life[0]`. `blurb` splits into `history` and `character` (3.1). `psyche` becomes `psycheSchema.nullable()`, which is `null` when `ablations.psyche` is `none` or `character_only`. `noticing` and `feelings` are replaced by the sight-limited sections `seeing`, `lastSeen`, `people`, `beliefs`, `town` and `situation`. |
| `MOTIVES` and the `motive` question | `lib/jev/schema.ts`, `lib/jev/prompt.ts` | Kept, but asked only when `ablations.motiveReadout` is on. It is off by default until the co-batching probe passes (9.6). The village asks it on every decide. That was Slice 0 fix 1, and it is applied in the town, not in the frozen village. The label is JEV's self-model, not a cause. |
| `bodyAlarm()`, `urgency()`, the hours-to-collapse clause | `lib/jev/prompt.ts`; `decayNeeds` in `lib/sim/engine.ts` | Carried **verbatim** into `lib/town/jev/prompt.ts` and `lib/town/needs.ts` (5.1.3, 7.11). Rewording them counts as a versioned experiment. |
| `respond` kind, `Offer`, `offerWireSchema`, `replyCriteria`, `respondQuestions` | `lib/jev/schema.ts`, `lib/jev/prompt.ts` | Translated into the `encounter` kind. `Offer` becomes the typed `TalkPurpose` (the mechanic rows below). |
| `assess` kind, `ASSESS_ROADMAP`, `ASSESS_HIGHLIGHTS`, `digestRun` | `lib/jev/schema.ts`, `lib/sim/digest.ts` | Kept as an **instrument-lane** kind (`lane: "instrument"` is fixed in its schema). `lib/town/digest.ts` builds the town digest. Only `scripts/town/lab.ts assess=true` runs it, because the public route rejects the instrument lane (4.2). The roadmap keys are reworded for the town, with a version bump. |
| `reflect` kind, `reflectPayloadSchema`, `CHANGES`, `GOALS`, `buildReflectState`, `reflectQuestions`, `applyReflection` | Increment 3 | **Adopted.** The payload shape is kept: `today: string[]` (the ids `m0` to `m9` are the array index, assigned by the builder), helpers and wrongers as `[id, name]` tuples, `askGoal`, and `currentGoal`. Three migrations: (1) the tuple id is a `p_<agentId>` person id (6.1); (2) `currentGoal` becomes a `GoalKey`, not text, and the server renders the words; (3) a `grudges` tuple list is added for `forgive` [A1.3]. `CHANGES` is kept verbatim, with all 10 keys including `more_ruthless` and `more_bitter`, and so are its deltas. `GOALS` keeps its 8 keys, with "village" reworded to "town". Slice B adds `office`, `master_craft`, `keep_peace` and `leave_town`. Timing: asked on the first sleep after 8 pm, once per day (C5). |
| `psycheAtBirth`, `DriftModel`, `lib/sim/drift.ts` (`habit`, `lifeEvent`, `reflectDrift`, `CHANGE_DELTAS`, caps of 3 per trait per day and 25 lifetime), `DriftEntry`, `driftToday` | Increments 2 and 3 | Copied into `lib/town/drift.ts` (A1). The engine calls it only through the hook registry in `lib/town/hooks.ts` (8.6). `DriftModel` becomes `Ablations.driftModel`, default `jev`; the lab's `drift=` flag sets it. `DriftEntry` keeps `{ tick, key, delta, cause }` and adds `decisionId`. `habit` and `lifeEvent` run only in the `engine` arm, keyed by the town's `DriverKey` and event kinds. |
| `House`, `houses`, `campfire`, `project`, `store`, `stall` | `lib/sim/types.ts` | Replaced by `buildings`, `households`, `projects[]`, `stores[]` and `prices`. The **campfire is retired**: the plaza fountain and the Lantern are the gathering places. The granary becomes the footbridge (M9). The communal store is translated into the chapel pantry commons (Slice B, M12). The **stall is retired**, and the general store replaces it (mechanic rows). |
| `Agent.inside` | `lib/sim/types.ts` | `insideOf: string \| null`, a building id. |
| `Agent.affinity`, `nudgeAffinity` | `lib/sim/types.ts`, `engine.ts` | Replaced by `ties` (liking, trust, respect, fear, familiarity). Liking and trust move only through JEV answers (M18). The village's **fixed nudges are retired** (for example -0.5 to the victim of a noticed pickpocketing); `feel` ride-alongs replace them. |
| `Agent.carry: number`, `Agent.coins` | `lib/sim/types.ts` | `carry: Stack[]` (6 stacks of up to 5), and `wallet`. |
| `MemoryEntry`, `Agent.formative` | `lib/sim/types.ts` | `Memory` (kind, salience, others, place, eventId, formative). The formative list becomes memories marked `formative: true`. |
| `world.rng`, `nextRandom` | `lib/sim/engine.ts` | Stateless keyed `rand()` in `lib/town/rng.ts`. |
| `SimRequest` | `lib/sim/engine.ts` | Declared in `lib/town/types.ts`, so modules can build requests. |
| `DecisionRecord` | `lib/sim/types.ts` | The existing fields are kept, so the inspector's decision card can be reused. Audit fields and `forced` are added, and `kind` widens to `CallKind`. |
| `RECORD_VERSION`, `RunRecord`, `lib/runs/store.ts` | `lib/sim/session.ts`, `lib/runs/store.ts` | Town records are version 2. They are saved by `lib/town/runs/store.ts` under the blob prefix `town-runs/`, so the village gallery never lists them. |
| `Intervention` | `lib/sim/types.ts` | `famine` and `bounty` are kept (berries). `drain_store` and `fill_store` become `remove_items` and `drop_items`, each with a `storeId`. |
| Town types in `lib/sim/types.ts` (`Building`, `BuildingKind`, `JobId`, town tiles); the draft `lib/sim/town-map.ts`, `lib/sim/jobs.ts`, `tests/town-map.test.ts` | `105aa84`, and untracked in the working tree | Moved into `lib/town/map.ts`, `lib/town/jobs.ts` and `tests/town/map.test.ts` (step 0). **Adopted:** `Building.pos`, `size`, `door`, `hours` with ISO weekdays, and `residents`; `BuildingKind` with `home`; the `bridge_lot` tile; the draft's shift table (2.7). **Migrations:** `Building` adds `access`, `householdId` and `storeIds`; `Landmark.houseId` becomes `buildingId`; `Job` becomes `JobDef` plus `Post`, and loses its `drivers` field. |
| The in-place draft in the working tree: `Shop`, `Pantry`, `Town`, `Edition`, `Intent.work.effort: "diligent" \| "coast"`, the town `Persona` fields | uncommitted | Not adopted as contract, because it is in flux. It is migrated this way: one `Shop` per good becomes one `Store` with several `PriceBoard` listings; `Pantry` becomes the Slice B commons store; `Town` becomes `Town` in 4.3; `Edition` becomes a `Notice` of kind `crier` (Slice B); the two effort words become the 4-level `Effort` score; the 15 founders' data becomes `lib/town/cast.ts` (3.1). |

**Shipped mechanics:**

| Village mechanic | Shipped in | Town translation |
|:-|:-|:-|
| Stall pricing (`price_fair`, `price_high`, `price_cheap`) | Increment 2 | The C3 `set_prices` duty with honest tiers (2.3), for the store, the diner and the inn [A1-min]. |
| Buy and sell at the stall | Increment 2 | `buy_*`, `dine` and `bar` (M3), gated by the seller's standing choice to be open and by the `serve` check. `sell_*` with the buyer's `accept_sale` [A1-min]. |
| Gifts (`gift_food`, `gift_coins`) and the thank, accept or refuse reply | Increment 2 | `gift_<id>` with `accept_gift` (M23) [A1.3]. |
| Honest pleas and sob-story lies (`ask_food` with `honest`) | Increment 2 | `ask_help_<id>` with a typed claimed need, `claim`, that can be a lie (M23) [A1.3]. The asker's own option says whether the claim is true. The listener hears only the claim. A false claim is a `lie` event. As in the village, it is exposed when the listener sees the liar eating or carrying food within 24 hours. |
| Peer loans (`Offer.lend` at 5 to 6 or 5 to 9, `Debt`, `repay`, `demand_repay`, defaults) | Increment 2 | Personal loans in M24, alongside store credit, on the same `Loan` ledger [B]. The options are `offer_loan_<id>` at a fair or a steep rate, `accept_loan`, `repay_<loanId>`, and `demand_repay_<loanId>`, which is answered `repay`, `promise` or `refuse`. A loan defaults once its due tick passes. |
| Pickpocketing (`Offer.pickpocket`, `missingCoins`) | Increment 2 | `pickpocket_<id>`, a theft variant with a direct victim (M23) [A1.3]. It is noticed at once unless the victim is busy or asleep. Otherwise it becomes `Agent.unnoticedLoss`, discovered at the victim's next decide, which feeds the same suspect, report and case chain as a shelf theft. |
| Compliments (`Offer.compliment`, weaker when frequent) | Increment 2 | `compliment_<id>` with TalkPurpose `compliment` [A1.3]. A listener who engages gets respect +4, halved for each compliment they received in the last 12 hours (5.1.3). |
| Favours ledger (`World.favors`, `favors_returned`) | Increment 2 | `World.favours`, fed by gifts, grants and help. It drives the `reciprocity` metric in Slice A. From Slice B it feeds the M26 reliability counts in people lines, for example "Mo has helped you 3 times; you have helped her once." |
| Lies ledger (`Lie`) | Increment 2 | `lie` and `lie_exposed` events, plus claims (M17). |
| Grudges, gratitude, goals, meaning (`Agent.grudges`, `gratitude`, `goal`, `meaning`, `today`) | Increment 3 | Kept on `Agent`. A grudge can now be dropped through C5 `forgive` [A1.3], and from Slice B through a reply to `apologize`. |
| Engine drift (`habit`, `lifeEvent`) | Increment 2 | Kept only as the `driftModel: "engine"` comparison arm. |
| The granary project | Increment 1 | The footbridge (M9). |
| The communal store's witnessed takings | Increment 1 | The witness rule of `take_<store>` (M23). |

### 4.2 `lib/town/jev/schema.ts` (v2)

```ts
import { z } from "zod"

// The town wire contract. The route accepts only typed perceptions, typed options (a verb
// plus typed params, never prose) and typed call payloads. It builds every instruction and
// every option text server-side, and it caps state length, total call length and question
// count, so it cannot be used as a general model proxy.

export const PROMPT_VERSION = "town-1" // bump on ANY template change; logged per decision
export const QUESTION_CAP = 8          // per call, until the co-batching probe allows more
export const STATE_CHAR_CAP = 7000     // state text; the route answers 413 above this
export const CALL_CHAR_CAP = 16000     // state plus every rendered criterion; 413 above this

const int = (min: number, max: number) => z.number().int().min(min).max(max)
const coins = int(0, 100000)

// Needs
export const BODY_KEYS = ["hunger", "thirst", "energy", "health"] as const
export const MIND_KEYS = ["social", "fun", "purpose", "belonging", "respect", "security"] as const
export const NEED_KEYS = [...BODY_KEYS, ...MIND_KEYS] as const
export type NeedKey = (typeof NEED_KEYS)[number]
export type MindKey = (typeof MIND_KEYS)[number]
const need = z.number().min(0).max(100)
export const needsSchema = z.record(z.enum(NEED_KEYS), need) // exhaustive in zod 4
export type Needs = z.infer<typeof needsSchema>

export const MOOD_LEVELS = ["miserable", "low", "okay", "good", "great"] as const
export type MoodLabel = (typeof MOOD_LEVELS)[number]

/** Kept from Slice 0; asked only in the motiveReadout ablation arm. */
export const MOTIVES = {
  purpose: "doing meaningful work or making something",
  care: "looking after someone they care about",
  belonging: "being part of the group",
  status: "being respected or getting ahead of others",
  security: "feeling safe and provided for",
  pleasure: "comfort and enjoyment",
  curiosity: "discovering something new",
  grievance: "getting back at someone",
  gain: "getting more for themselves",
  duty: "doing what is expected or right",
} as const
export type MotiveKey = keyof typeof MOTIVES

/** Adopted verbatim from Increment 3 (lib/jev/schema.ts). Deltas live in lib/town/drift.ts. */
export const CHANGES = {
  unchanged: "they are the same person as this morning",
  more_wary: "a little more wary of other people",
  more_generous: "a little more generous",
  more_guarded: "a little more guarded and private",
  more_ambitious: "a little more ambitious",
  more_content: "a little more at peace",
  closer_to_family: "a little closer to family and friends",
  devoted_to_work: "a little more devoted to their work",
  more_ruthless: "a little more willing to do whatever it takes",
  more_bitter: "a little more bitter",
} as const
export type ChangeKey = keyof typeof CHANGES

/** Adopted from Increment 3 with "village" reworded to "town". [B] adds office, master_craft, keep_peace, leave_town. */
export const GOALS = {
  respected: "become one of the most respected people in town",
  build: "build something lasting for the town",
  wealth: "grow rich",
  family: "take care of family and friends",
  adventure: "find adventure and discover new things",
  easy: "live an easy, pleasant life",
  revenge: "get even with someone who wronged them",
  tradition: "keep the old ways alive",
} as const
export type GoalKey = keyof typeof GOALS
const GOAL_KEYS = Object.keys(GOALS) as [GoalKey, ...GoalKey[]]

// Psyche (0-100, Slice 0 scale)
export const BIG5_KEYS = ["openness", "conscientiousness", "extraversion", "agreeableness", "neuroticism"] as const
export const VALUE_KEYS = [
  "selfDirection", "stimulation", "hedonism", "achievement", "power",
  "security", "conformity", "tradition", "benevolence", "universalism",
] as const
export const FOUNDATION_KEYS = ["care", "fairness", "loyalty", "authority", "sanctity", "liberty"] as const
export const ATTACHMENTS = ["secure", "anxious", "avoidant", "fearful"] as const
export type ValueKey = (typeof VALUE_KEYS)[number]
export type FoundationKey = (typeof FOUNDATION_KEYS)[number]
export type Attachment = (typeof ATTACHMENTS)[number]

const pct = z.number().min(0).max(100)
export const psycheSchema = z.object({
  big5: z.record(z.enum(BIG5_KEYS), pct),
  values: z.record(z.enum(VALUE_KEYS), pct),
  foundations: z.record(z.enum(FOUNDATION_KEYS), pct),
  attachment: z.enum(ATTACHMENTS).nullable(), // null until coming of age
  dark: z.object({ machiavellianism: pct, narcissism: pct, psychopathy: pct }),
  risk: pct,
  patience: pct,
  trust: pct,
})
export type Psyche = z.infer<typeof psycheSchema>

// Catalogs
export const LIFE_STAGES = ["infant", "child", "adult", "elder"] as const
export type LifeStage = (typeof LIFE_STAGES)[number]
export const JOB_IDS = [
  "mayor", "police_officer", "doctor", "nurse", "teacher", "journalist",
  "carpenter", "shopkeeper", "cook", "innkeeper", "farmer", "fisher",
] as const
export type JobId = (typeof JOB_IDS)[number]
export const RANK_IDS = [
  "mayor", "chief", "deputy", "doctor", "senior_nurse", "nurse", "teacher", "journalist",
  "master", "apprentice", "self_employed",
] as const
export type RankId = (typeof RANK_IDS)[number]
export const ITEM_KINDS = ["groceries", "produce", "fish", "berries", "meal", "drink", "wood", "supplies"] as const
export type ItemKind = (typeof ITEM_KINDS)[number]
export const ISSUE_IDS = ["justice", "taxes", "newcomers", "policing", "welfare"] as const
export type IssueId = (typeof ISSUE_IDS)[number]
/** Ordered labels; a score index maps to positions [-1, -0.5, 0, 0.5, 1]. */
export const ISSUE_LABELS: Record<IssueId, readonly [string, string, string, string, string]> = {
  justice: ["forgive and move on", "mostly forgive", "it depends on the case", "they should pay it back and more", "punish harshly, even with jail"],
  taxes: ["no town taxes at all", "lower taxes", "keep taxes as they are", "somewhat higher taxes", "much higher taxes for more services"],
  newcomers: ["turn newcomers away", "be wary of them", "judge each one", "welcome them", "welcome anyone who comes"],
  policing: ["the police should barely act", "police lightly", "police as now", "police more firmly", "the police should have a free hand"],
  welfare: ["everyone looks after themselves", "help only family", "help in emergencies", "the town should help the poor", "the town should share its wealth"],
}
export const ISSUE_TOPIC: Record<IssueId, string> = {
  justice: "how the town should deal with people who steal",
  taxes: "town taxes",
  newcomers: "newcomers settling in town",
  policing: "how much power the police should have",
  welfare: "whether the town should help the poor",
}
export const PRICE_TIERS = ["at_cost", "markup_25", "markup_50", "markup_100"] as const
export type PriceTier = (typeof PRICE_TIERS)[number]
export const PRICE_MULT: Record<PriceTier, number> = { at_cost: 1, markup_25: 1.25, markup_50: 1.5, markup_100: 2 }

// Primitives
const line = z.string().max(240)
const lines = (n: number) => z.array(line).max(n)
export const nameSchema = z.string().regex(/^[A-Z][a-z]{1,15}$/)
export const idSchema = z.string().regex(/^[a-z0-9_]{1,40}$/)
export const personIdSchema = z.string().regex(/^p_[a-z0-9_]{1,30}$/)
export const claimIdSchema = z.string().regex(/^c_[a-z0-9_]{1,30}$/)
export const storeIdSchema = z.string().regex(/^st_[a-z0-9_]{1,30}$/)
export const issueSchema = z.enum(ISSUE_IDS)
const itemSchema = z.enum(ITEM_KINDS)

// Perception (Slice A: capped lines; Slice B replaces the lines with a typed Fact union)
export const perceptionSchema = z.object({
  name: nameSchema,
  age: z.number().int().min(0).max(120),
  stage: z.enum(LIFE_STAGES),
  pronoun: z.enum(["he", "she", "they"]),
  history: z.string().max(120),             // facts; stays with the body (3.1)
  character: z.string().max(100),           // temperament; moves with the psyche; "" when psyche is "none"
  psyche: psycheSchema.nullable(),          // rendered to words server-side by psycheLines; null for "none" and "character_only"
  clock: z.string().max(80),
  location: z.string().max(160),
  needs: needsSchema,
  matters: z.record(z.enum(MIND_KEYS), int(0, 2)), // 0 a little, 1 somewhat, 2 a great deal
  needCauses: z.partialRecord(z.enum(NEED_KEYS), z.string().max(160)),
  life: lines(6),        // job and rank, shift, pay, wallet, household, dependants
  seeing: lines(16),     // sight-limited, nearest first
  lastSeen: lines(10),   // dated beliefs about people out of sight
  beliefs: lines(10),    // claims with source and credence words
  town: lines(8),        // notice board as last read, posted prices as last seen, projects, your cases
  people: lines(12),     // one tie line per salient person
  views: lines(4),       // own stances with certainty; what you have heard others say
  emotions: lines(4),
  memories: lines(10),   // recent plus formative
  situation: lines(8),   // call-specific: what was just said to you, the report in front of you
})
export type Perception = z.infer<typeof perceptionSchema>

// Options: a verb plus typed params. VERB_PARAMS has exactly one entry per row of the
// ACTIONS table (5.2), and tests/town/framing.test.ts asserts that the two key sets match.
// Every entry is a strict object, so unknown params are rejected. Params hold only bounded
// integers, booleans, names, and strings that are enums or fixed-format ids, never free text.
export const ACTIVITIES = ["idle", "walking", "working", "eating", "drinking", "resting", "talking", "shopping", "at_school", "playing", "sleeping"] as const
const n = (max = 100000) => int(0, max)
const steps = n(400)
const watchers = z.array(nameSchema).max(6) // who the chooser can see, for "Who would know"
export const VERB_PARAMS = {
  eat_home: z.strictObject({ portions: n(50), steps }),
  drink: z.strictObject({ place: z.enum(["home", "fountain"]), steps }),
  buy: z.strictObject({ store: storeIdSchema, item: itemSchema, qty: n(10), price: n(200), wallet: n(), steps, seenAt: n() }),
  work_shift: z.strictObject({ job: z.enum(JOB_IDS), start: n(1440), end: n(1440), minutesLate: int(-60, 1440), pay: n(200), steps }),
  take: z.strictObject({ store: storeIdSchema, item: itemSchema, qty: n(5), value: n(1000), watchers, ownerCounts: z.boolean() }),
  talk: z.strictObject({ who: nameSchema, steps, activity: z.enum(ACTIVITIES) }),
  // ... one entry for every other verb in table 5.2, with the params listed there
} as const
export type Verb = keyof typeof VERB_PARAMS
export const VERBS = Object.keys(VERB_PARAMS) as [Verb, ...Verb[]]
export type ParamValue = number | boolean | string | string[]

const paramValue = z.union([int(-1000, 100000), z.boolean(), idSchema, nameSchema, z.array(nameSchema).max(6)])
export const optionWireSchema = z
  .object({ id: idSchema, verb: z.enum(VERBS), params: z.record(z.string().regex(/^[a-z][a-zA-Z]{0,23}$/), paramValue) })
  .superRefine((o, ctx) => {
    if (!(VERB_PARAMS[o.verb] as z.ZodType).safeParse(o.params).success) {
      ctx.addIssue({ code: "custom", message: `params do not match verb ${o.verb}` })
    }
  })
export type WireOption = z.infer<typeof optionWireSchema>

export const personRefSchema = z.object({ id: personIdSchema, name: nameSchema, line: z.string().max(200) })
export const claimRefSchema = z.object({ id: claimIdSchema, line: z.string().max(200) })

// Every choice question needs at least 2 options (6.1). Lists that would leave fewer are
// not sent: the builder skips the question and the engine records the lone option as forced.
export const subQuestionSchema = z.discriminatedUnion("q", [
  z.object({ q: z.literal("who"), purpose: z.enum(["news", "view", "badmouth"]), people: z.array(personRefSchema).min(2).max(12) }),
  z.object({ q: z.literal("claim"), claims: z.array(claimRefSchema).min(2).max(4) }),
  z.object({ q: z.literal("expressed"), issue: issueSchema }),
  z.object({ q: z.literal("effort") }),
])
export const rideAlongSchema = z.discriminatedUnion("q", [
  z.object({ q: z.literal("feel"), key: idSchema, other: nameSchema, what: line }),
  z.object({ q: z.literal("trust"), key: idSchema, other: nameSchema, what: line }),
  z.object({ q: z.literal("suspect"), key: idSchema, what: line, people: z.array(personRefSchema).min(1).max(10) }), // plus "nobody"
  z.object({ q: z.literal("appraise"), key: idSchema, what: line }),
])

// Typed payloads per call kind
const selfKnowledge = z.enum(["witnessed", "heard", "did_it", "nothing"])
export const NEED_CLAIMS = ["hungry", "broke", "for_my_children", "none"] as const
export const wireTalkSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("small_talk") }),
  z.object({ kind: z.literal("compliment"), recent: int(0, 20) }),     // [A1.3] compliments you received in the last 12 hours
  z.object({ kind: z.literal("share_news"), heard: line }),
  z.object({ kind: z.literal("badmouth"), heard: line }),              // [A1.3] the listener hears news, not a motive
  z.object({ kind: z.literal("share_view"), issue: issueSchema, heard: line }),
  z.object({ kind: z.literal("lesson"), issue: issueSchema, heard: line }), // [A1.3] the teacher, to a child in class
  z.object({ kind: z.literal("ask_help"), need: z.enum(["food", "coins"]), amount: int(1, 20), claim: z.enum(NEED_CLAIMS), have: coins }), // never says whether the claim is true
  z.object({ kind: z.literal("offer_gift"), heard: line }),
  z.object({ kind: z.literal("offer_goods"), item: z.enum(["produce", "fish"]), qty: int(1, 30), unitPrice: int(1, 50), till: coins }),
  z.object({ kind: z.literal("question_about"), heard: line, knows: selfKnowledge, people: z.array(personRefSchema).max(10) }),
  z.object({ kind: z.literal("confront"), heard: line, didIt: z.boolean(), people: z.array(personRefSchema).max(10) }),
  z.object({ kind: z.literal("arrest"), heard: line }),
  z.object({ kind: z.literal("fine"), heard: line, coins: int(1, 500), wallet: coins }),
  z.object({ kind: z.literal("clinic_fee"), coins: int(1, 100), wallet: coins }),   // [A1.2]
])
const priceItem = z.object({ item: z.enum(["groceries", "produce", "fish", "meal", "drink"]), unitCost: int(1, 50), lastPrice: int(1, 200).nullable() })
export const dutySchema = z.discriminatedUnion("duty", [
  z.object({ duty: z.literal("set_prices"), place: z.enum(["store", "diner", "inn"]), items: z.array(priceItem).min(1).max(3) }),
  z.object({ duty: z.literal("serve"), customer: nameSchema, item: itemSchema, qty: int(1, 10), price: int(1, 200), why: line }),
  z.object({ duty: z.literal("case_intake"), reporter: nameSchema, report: line }),
  z.object({ duty: z.literal("case_resolution"), summary: line, victim: nameSchema, suspects: z.array(personRefSchema).max(6), fineCoins: int(1, 500) }),
  z.object({ duty: z.literal("press_arrest"), suspect: nameSchema, heard: line }),
  z.object({ duty: z.literal("triage"), patient: nameSchema, where: z.enum(["at_the_clinic", "collapsed_in_sight"]), says: z.enum(["can_pay", "cannot_pay", "nothing"]), fee: int(0, 100), cues: line }), // [A1.2]
  z.object({ duty: z.literal("lesson"), present: z.array(nameSchema).min(1).max(12), graves: int(0, 50) }), // [A1.3]
  // [B] "review" | "credit_request" | "edition" | "enforce" | "hire" | "bloc" | "group_aid" | "buy_price" | "order_size"
])
export type DutyWire = z.infer<typeof dutySchema>
export type DutyKind = DutyWire["duty"]

export const assessPayloadSchema = z.object({ title: z.string().max(120), summary: lines(60), villagers: lines(20) }) // Increment 3 shape

const lane = z.enum(["world", "instrument"]).default("world")
export const jevRequestSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("decide"), lane, payload: z.object({
    perception: perceptionSchema,
    options: z.array(optionWireSchema).min(2).max(32),
    subs: z.array(subQuestionSchema).max(4),
    rides: z.array(rideAlongSchema).max(2),
    motiveReadout: z.boolean().default(false),
  }) }),
  z.object({ kind: z.literal("encounter"), lane, payload: z.object({ perception: perceptionSchema, asker: nameSchema, talk: wireTalkSchema }) }),
  z.object({ kind: z.literal("duty"), lane, payload: z.object({ perception: perceptionSchema, task: dutySchema, rides: z.array(rideAlongSchema).max(2) }) }),
  z.object({ kind: z.literal("reflect"), lane, payload: z.object({  // Increment 3 shape, three migrations (4.1)
    perception: perceptionSchema,
    today: lines(10),                                                    // m0..m9 by index
    helpers: z.array(z.tuple([personIdSchema, nameSchema])).max(12),
    wrongers: z.array(z.tuple([personIdSchema, nameSchema])).max(12),
    grudges: z.array(z.tuple([personIdSchema, nameSchema])).max(6),     // [A1.3] candidates for forgive
    askGoal: z.boolean(),
    currentGoal: z.enum(GOAL_KEYS).nullable(),
  }) }),
  z.object({ kind: z.literal("found"), lane, payload: z.object({ perception: perceptionSchema, issues: z.array(issueSchema).min(1).max(5) }) }),
  z.object({ kind: z.literal("assess"), lane: z.literal("instrument"), payload: assessPayloadSchema }),
  // [B] "vote" | "hearing"   [C] "react" | "press" | "coming_of_age"  (added when their slice lands)
])
/** What callers build: lane and motiveReadout may be omitted. */
export type JevRequestInput = z.input<typeof jevRequestSchema>
/** What handlers receive after parsing: defaults filled in. */
export type JevRequest = z.output<typeof jevRequestSchema>
export type JevKind = JevRequest["kind"]

export type MoodReading = { level: number; label: MoodLabel; probabilities: number[] }

/** One JEV answer, normalized (unchanged from the village). */
export type RawAnswer =
  | { type: "choice"; choice: string; probabilities: Record<string, number> }
  | { type: "boolean"; probability: number }
  | { type: "score"; score: number; probabilities: Record<string, number> }

export type JevAnswer = {
  kind: JevKind
  state: string
  answers: Record<string, RawAnswer>
  confidence: Record<string, number> // providerMetadata.typesafe.confidence, per question
  latencyMs: number
  costUsd: number | null
}
```

**The public route, `app/api/town/jev/route.ts`.** The app is a public production deploy, so the town route is locked down from Slice A on:

- **No option prose on the wire.** Options arrive as `{ id, verb, params }`. The route renders each label and detail with `renderOption(verb, params)` from `lib/town/actions.ts`, the same pure function the engine uses for its own record. A request whose params do not match its verb is rejected with 400.
- **No instrument lane.** A request with `lane: "instrument"`, which includes every `assess` and every probe, gets 403. Instrument calls run only headless: `scripts/town/*.ts` call `runTownJev` in `lib/town/jev/call.ts` directly. The local-only `app/api/town/lab/route.ts` serves the Probe drawer, and it answers 404 unless `TOWN_LAB_ROUTE=1`. That variable is set only in a developer's `.env.local`, never in a Vercel environment.
- **Rate and volume limits on the server**, on top of the client budgets and the $10 monthly gateway key budget:
  - a per-IP token bucket of 60 calls per minute in each function instance;
  - a Vercel Firewall rate-limit rule on `/api/town/jev` of 120 requests per minute per IP, which holds across instances;
  - a daily cap of 10,000 world calls, counted in a shared counter in the Vercel Runtime Cache (or the Blob store if that is not available) that each instance flushes every 25 calls. The cap can overshoot by 25 per live instance. The route answers 429 once the cap is reached.
- **Size caps.** 413 when the state exceeds `STATE_CHAR_CAP`, or when the state plus every rendered criterion exceeds `CALL_CHAR_CAP`.

The village's `/api/jev` route is unchanged, so `respond`, `assess` and the village lab's assess flag keep working there.

### 4.3 `lib/town/types.ts` (v2)

```ts
import type {
  DutyKind, GoalKey, IssueId, ItemKind, JobId, LifeStage, MindKey, MoodReading, MotiveKey,
  NeedKey, Needs, ParamValue, Perception, PriceTier, Psyche, RankId, RawAnswer, Verb,
} from "./jev/schema"

export type { ItemKind } from "./jev/schema"

export type Vec = { x: number; y: number }
export type Dir = "up" | "down" | "left" | "right"

export type Tile =
  | "grass" | "tallgrass" | "flowers" | "path" | "sand" | "water" | "tree" | "bush" | "rock"
  | "house" | "building" | "door" | "fountain" | "board" | "fence" | "field" | "grave"
  | "ford" | "lot" | "bridge_lot" | "scaffold" | "bridge" | "dock"

// Places. Shapes adopted from the draft lib/sim/town-map.ts: pos and size, ISO weekdays.
export type BuildingKind =
  | "home" | "farmhouse" | "clinic" | "police" | "town_hall" | "school" | "chapel"
  | "store" | "diner" | "inn" | "crier" | "workshop"
export type Access = "posted_hours" | "always_open" | "holder_only" | "private" // 2.2
export type Building = {
  id: string
  kind: BuildingKind
  name: string                       // "the general store", "the Harrows' farmhouse"
  pos: Vec                           // top-left footprint tile
  size: Vec                          // in tiles
  door: Vec
  /** Posted hours: minutes of day and ISO weekdays (1 = Monday .. 7 = Sunday). null = none posted. */
  hours: { open: number; close: number; days: number[] } | null
  access: Access
  residents: string[]
  householdId: string | null
  storeIds: string[]
}
export type Lot = { id: string; pos: Vec; size: Vec; kind: "house" | "civic" | "bridge"; projectId: string | null }
export type Bush = { id: string; pos: Vec; berries: number; nextRegrow: number }
export type Poi = { id: string; name: string; stand: Vec }
export type Landmark = { name: string; center: Vec; radius: number; buildingId?: string } // draft houseId renamed

// People
export type Pronoun = "he" | "she" | "they"
export type SkillKey =
  | "administration" | "policing" | "medicine" | "nursing" | "teaching" | "writing" | "carpentry"
  | "trade" | "cooking" | "hospitality" | "farming" | "fishing" | "reading"

export type Persona = {
  id: string
  name: string
  surname: string
  pronoun: Pronoun
  ageYears: number
  post: { jobId: JobId; rank: RankId } | null
  householdId: string
  history: string                    // facts; stays with the body (3.1)
  character: string                  // temperament; moves with the psyche in role swaps
  psyche: Psyche                     // founding psyche (makePsyche output)
  colors: { hair: string; skin: string; shirt: string; pants: string }
  /** Physiology only. Mind-need rates come from needRates(psyche). */
  bodyDecay: Partial<Record<"hunger" | "thirst" | "energy", number>>
  start: Needs
  wallet: number
  skills: Partial<Record<SkillKey, number>>
  ties: Record<string, Partial<Pick<Tie, "liking" | "trust" | "familiarity" | "kin">>>
}

export type Kin = "partner" | "parent" | "child" | "sibling"
export type LastSeen = { tick: number; place: string; activity: string; pos: Vec }
export type Tie = {
  liking: number       // -1..1, moved only by JEV feel answers
  trust: number        // -1..1, set only by JEV trust answers
  respect: number      // -1..1  [B]
  fear: number         //  0..1  [C]
  familiarity: number  //  0..1  physics: time in view and in talk
  kin: Kin | null
  lastSeen: LastSeen | null
  appraisedAt: number
}

export type Stance = { pos: number; certainty: number; updatedAt: number; decisionId: string | null }
export type Expressed = { pos: number; tick: number; toId: string }
export type PerceivedStance = { pos: number; tick: number; source: "said_to_you" | "told" | "overheard" | "taught" }

export type MemoryKind =
  | "routine" | "social" | "work" | "money" | "family" | "kindness" | "wrong_to_you" | "wrong_by_you"
  | "justice" | "loss" | "project" | "news"
export type Memory = {
  id: string; tick: number; text: string; kind: MemoryKind; salience: number
  others: string[]; place: string | null; eventId: string | null; formative: boolean
}
export type EmotionKind = "grief" | "anger" | "fear" | "gratitude" | "shame" | "guilt" | "pride" | "joy"
export type Emotion = { kind: EmotionKind; towardId: string | null; intensity: number; since: number; eventId: string | null }

export type PendingQ =
  | { q: "feel"; key: string; otherId: string; eventId: string; salience: number; since: number }
  | { q: "trust"; key: string; otherId: string; eventId: string; salience: number; since: number }
  | { q: "suspect"; key: string; eventId: string; candidates: string[]; salience: number; since: number }
  | { q: "appraise"; key: string; eventId: string; salience: number; since: number }

/** Adopted from the village's lib/sim/drift.ts. */
export type PsychePath =
  | `big5.${keyof Psyche["big5"]}` | `values.${keyof Psyche["values"]}`
  | `foundations.${keyof Psyche["foundations"]}` | `dark.${keyof Psyche["dark"]}`
  | "risk" | "patience" | "trust"
/** The village's DriftEntry plus the decision that caused it (null in the engine-drift arm). */
export type DriftEntry = { tick: number; key: PsychePath; delta: number; cause: string; decisionId: string | null }

// Goods, money, households, jobs, town
export type Stack = { kind: ItemKind; qty: number; madeTick: number }
export type Bundle = Partial<Record<ItemKind, number>>
export type Owner =
  | { kind: "agent"; id: string }
  | { kind: "household"; id: string }
  | { kind: "business"; postId: string }
  | { kind: "town" }
  | { kind: "group"; id: string }  // [B] a group's pantry and purse
export type TransferMode =
  | "purchase" | "sale" | "wage" | "tax" | "grant" | "delivery" | "gift" | "take" | "fine" | "restitution"
  | "inherit" | "consume" | "spoil" | "produce" | "outside_sale" | "own_move" | "fee" | "iou"
  | "loan" | "repay" | "embezzle" // loan, repay, embezzle: [B]
export type LedgerEntry = { tick: number; mode: TransferMode; coins: number; item: ItemKind | null; qty: number; byId: string | null; eventId: string }
export type Store = {
  id: string
  label: string                      // "the store shelves", "the Harrows' pantry"
  owner: Owner
  buildingId: string
  role: "shelf" | "pantry" | "stash" | "till" | "kitchen" | "bar" | "shed" | "treasury" | "commons" | "purse"
  items: Stack[]
  coins: number
  capacity: number
  /** Kept for tills, the treasury and group purses. Readable at the town hall from Slice B. */
  ledger: LedgerEntry[] | null
}
export type PriceBoard = {
  storeId: string; item: ItemKind; tier: PriceTier; unitCost: number; price: number
  side: "sell" | "buy"               // sell = shelf price; buy = the posted buying price for produce and fish
  setTick: number; setById: string | null; decisionId: string | null
}
export type Household = {
  id: string; name: string; memberIds: string[]; homeId: string; pantryId: string; stashId: string
  dependantIds: string[]
  expecting: Expecting | null        // [C]
}
/** The job catalog entry (the draft lib/sim/jobs.ts, minus its drivers field). */
export type JobDef = {
  id: JobId
  title: string                      // "the police officer"
  place: BuildingKind | "fields" | "pond" | "bridge" | "patrol"
  shift: { start: number; end: number; days: number[] } // minutes of day; ISO weekdays
  doing: string                      // "patrol the town and keep the peace"
  ranks: { rank: RankId; payPerDay: number }[] // lowest first; 0 = self-employed (2.7)
}
/** One slot of a job at a rank, filled or vacant. Several posts may share a job. */
export type Post = {
  id: string                         // "post_police_chief", "post_fisher_2"
  jobId: JobId
  rank: RankId
  holderId: string | null
  step: 0 | 1 | 2 | 3                // pay steps, +3 coins a day each [B]
  workplaceId: string                // building id, or "fields" / "pond" / "bridge"
}
export type Notice = {
  id: string; tick: number
  kind: "project" | "hours" | "prices" | "obituary" | "blotter" | "crier" | "ordinance" | "meeting" | "vacancy" | "iou" | "county"
  text: string                       // engine template text; [B] crier items chosen by the journalist
  postedById: string | null; eventIds: string[]; decisionIds: string[]
}
export type Town = {
  name: string
  treasuryId: string
  taxRate: number
  clinicFee: number
  mayorId: string | null
  notices: Notice[]
  ious: { agentId: string; coins: number; tick: number }[] // partial payroll (2.3)
  ordinances: Ordinance[]            // [B]
  meetings: Meeting[]                // [B]
}
export type OrdinanceKind = "no_theft" | "curfew" | "price_cap" | "pantry_by_need" | "work_day" | "welcome_newcomers" | "no_newcomers" | "secret_ballot"
export type SanctionLevel = 0 | 1 | 2 | 3 | 4 // warning, fine, pay back double, a night in jail, banishment
export type Ordinance = { id: string; kind: OrdinanceKind; sanction: SanctionLevel; adoptedTick: number; status: "in_force" | "repealed"; proposerId: string | null; source: "vote" | "county"; votes: Record<string, "yes" | "no" | "abstain">; decisionIds: string[] } // [B]
export type Meeting = { id: string; tick: number; calledBy: string; agenda: { id: string; kind: string; ref: string | null }[]; ballot: "open" | "secret"; attendees: string[]; record: { agentId: string; itemId: string; answer: string; decisionId: string }[]; outcome: Record<string, string> } // [B]

// Knowledge
export type EventKind =
  | "theft" | "pickpocket" | "sale" | "purchase" | "wage" | "tax" | "delivery" | "grant" | "gift" | "help" | "shift"
  | "project_work" | "project_done" | "report" | "note" | "case_intake" | "interview" | "case_resolution"
  | "arrest" | "protest" | "release" | "fine" | "fine_refused" | "warning" | "lie" | "lie_exposed" | "stance_expressed"
  | "lesson" | "compliment" | "forgive" | "meal" | "family_meal" | "treatment" | "death" | "burial" | "grave_visit"
  | "flowers" | "price_set" | "refused_service" | "partial_delivery" | "partial_payroll" | "spoil" | "observer"
  // [B]
  | "credit" | "fraud" | "bribe" | "vote" | "ordinance" | "hearing" | "verdict" | "edition" | "festival"
  | "hire" | "fire" | "promotion" | "appointment" | "embezzle" | "election" | "loan" | "gathering" | "apology"
  // [C]
  | "assault" | "killing" | "partnership" | "separation" | "birth" | "banishment" | "strike" | "arrival"
  | "departure" | "group"
export type WorldEvent = {
  id: string
  tick: number
  kind: EventKind
  origin: "physics" | "choice" | "observer"
  actorId: string | null
  targetId: string | null
  place: string
  data: { item?: ItemKind; qty?: number; coins?: number; storeId?: string; caseId?: string; projectId?: string; issue?: IssueId; pos?: number }
  witnesses: string[]
  loud: boolean                      // carries 6 tiles with no line of sight (7.2)
  /** R1: non-empty whenever origin is "choice" (tests/town/events.test.ts). */
  decisionIds: string[]
}
export type ClaimKind = "took_from" | "gave_to" | "was_near" | "died" | "holds_view" | "worked_on" | "lied_to" | "arrested" | "fined" | "earns_more"
export type Claim = {
  id: string; kind: ClaimKind
  actorId: string | null; targetId: string | null; storeId: string | null
  issue: IssueId | null; pos: number | null; tick: number
  /** Observer-only link to the true event. null = matches no event. Never copied into a View. */
  eventId: string | null
  originId: string                   // an agent id, "traveller" (observer plant) or "self" (a hypothesis)
}
export type BeliefSource =
  | { kind: "witnessed" } | { kind: "discovered" } | { kind: "self" }
  | { kind: "told"; byId: string } | { kind: "overheard"; byId: string }
  | { kind: "posted"; noticeId: string } | { kind: "traveller" }
export type Belief = { claimId: string; source: BeliefSource; credence: number; heardAt: number; sharedWith: string[] }
/** The owner's own count. Spoilage and deliveries are added to it as owner-known facts (7.4). */
export type KnownStore = { tick: number; items: Bundle; coins: number | null }
export type KnownPrice = { tick: number; price: number }

// Justice
export type Testimony = "tell_truth" | "say_saw_nothing" | "name_someone" | "confess"
export type Case = {
  id: string
  kind: "theft"                      // [C] adds "assault" | "killing" | "fraud"
  eventId: string | null             // observer-only; never copied into a View
  storeId: string | null             // null for a pickpocketing
  victimId: string | null            // the person robbed, or the holder of the robbed store
  reportedById: string
  reportedTick: number
  officerId: string | null
  status: "filed" | "open" | "noted" | "sort_it_out" | "dismissed" | "closed_unsolved" | "resolved" | "fine_due" | "fine_refused"
  candidates: string[]
  interviews: { tick: number; subjectId: string; testimony: Testimony; namedId: string | null; decisionId: string }[]
  resolution: { tick: number; kind: "arrest" | "fine" | "warn"; suspectId: string; coins: number; decisionId: string } | null
  fine: { coins: number; dueTick: number | null; paid: number; answers: { tick: number; answer: "pay" | "ask_time" | "refuse"; decisionId: string }[] } | null
  arrest: { protested: boolean; pressed: boolean | null; decisionIds: string[] } | null
  decisionIds: string[]
}

// Projects, death
export type ProjectKind = "footbridge" | "bandstand" | "house" | "playground" | "memorial" | "clinic_wing"
export type Project = {
  id: string; kind: ProjectKind; name: string; lotId: string; sponsor: Owner
  unitsNeeded: number; unitsDone: number
  /** Units at or above this index progress only while 2+ people work on the same tick. */
  pairFrom: number
  woodNeeded: number; woodHave: number                              // [B]
  contributors: Record<string, { units: number; paidTicks: number; volunteerTicks: number }>
  status: "open" | "done" | "abandoned"
  startedTick: number; lastWorkTick: number; doneTick: number | null
  creditMode: "public" | "anonymous"
}
export type DeathCause = "old_age" | "starvation" | "thirst" | "illness" | "injury" | "violence"
export type Body = { id: string; agentId: string; name: string; pos: Vec; insideOf: string | null; tick: number; cause: DeathCause; seenBy: string[] }
export type Grave = { id: string; agentId: string; name: string; pos: Vec; diedTick: number; buriedTick: number; buriedBy: string[]; visits: number; flowers: number; decisionIds: string[] }
export type Departure = { agentId: string; persona: Persona; tick: number; reason: "died" | "left" | "banished"; cause: DeathCause | null }

// Records for later slices, declared now
export type GroupKind = "club" | "union" | "congregation" | "crew"
export type Group = {                                                   // [B]
  id: string; kind: GroupKind; name: string
  memberIds: string[]; leaderId: string | null
  storeId: string                    // the group pantry and purse: a Store with owner { kind: "group" }
  meetingPlace: string               // building id or POI id
  meetingDay: number                 // ISO weekday of the weekly gathering
  relations: Record<string, "allied" | "neutral" | "rival">
  foundedTick: number; decisionIds: string[]
}
export type CommitmentKind = "help_project" | "repay" | "keep_secret" | "vote" | "apprenticeship" | "pay_fine"
export type Commitment = {                                              // [B]
  id: string; kind: CommitmentKind; promiserId: string; promiseeId: string; ref: string | null
  dueTick: number; status: "open" | "kept" | "broken" | "released"; madeTick: number; decisionIds: string[]
}
export type Loan = {                                                    // [B] personal loans (the village's peer loans) and store tabs
  id: string; kind: "personal" | "store_tab"; creditor: Owner; debtorId: string
  principal: number; owed: number; paid: number; dueTick: number
  status: "open" | "repaid" | "defaulted" | "forgiven"
  ledger: { tick: number; coins: number; note: "lent" | "charged" | "padded" | "repaid" }[]
  decisionIds: string[]
}
export type Condition = {                                               // [B] sickness, [C] injury; both null in Slice A
  sick: { since: number; severity: number } | null
  injury: { since: number; severity: number; byId: string | null } | null
}
export type Partnership = { id: string; aId: string; bId: string; since: number; status: "courting" | "partners" | "separated"; consents: string[] } // [C]
export type Expecting = { partnershipId: string; since: number; dueTick: number; consents: string[] }             // [C]
export type TechniqueId = "herb_patch" | "upstream_pool" | "cool_cellar_method"
export type Technique = { id: TechniqueId; discovererId: string; tick: number; knownBy: string[] }                 // [C]
export type Weather = "clear" | "rain" | "storm" | "heat" | "snow"                                               // [C]

// Choices
export type Effort = 0 | 1 | 2 | 3 // bare minimum, easy pace, steadily, hard
export type Frame = "care" | "fairness" | "loyalty" | "authority" | "sanctity" | "liberty" | "self_interest"
export type NeedClaim = "hungry" | "broke" | "for_my_children" | "none"
export type TalkPurpose =
  | { kind: "small_talk" }
  | { kind: "compliment" }                                              // [A1.3]
  | { kind: "share_news"; claimId: string }
  | { kind: "badmouth"; claimId: string; aboutId: string }              // [A1.3] envy
  | { kind: "share_view"; issue: IssueId; expressed: number }
  | { kind: "lesson"; issue: IssueId; expressed: number }               // [A1.3] teacher to each child present
  | { kind: "ask_help"; need: "food" | "coins"; amount: number; claim: NeedClaim; honest: boolean } // honest never leaves the engine
  | { kind: "offer_gift"; bundle: Bundle; coins: number }
  | { kind: "offer_goods"; storeId: string; item: ItemKind; qty: number; unitPrice: number }
  | { kind: "report"; claimId: string }                                // the Case is created when the report reaches the officer, or when a note is left
  | { kind: "question_about"; caseId: string }
  | { kind: "confront"; claimId: string }
  | { kind: "arrest"; caseId: string }
  | { kind: "fine"; caseId: string; coins: number }
  | { kind: "clinic_fee"; coins: number }                               // [A1.2]
  // [B]
  | { kind: "persuade"; issue: IssueId; toward: -1 | 1; frame: Frame }
  | { kind: "ask_credit"; storeId: string; coins: number }
  | { kind: "offer_loan"; amount: number; owed: number; dueTick: number }
  | { kind: "repay"; loanId: string } | { kind: "demand_repay"; loanId: string }
  | { kind: "demand"; what: "coins" | "leave" | "apology"; amount: number }
  | { kind: "offer_bribe"; caseId: string; coins: number }
  | { kind: "ask_vote"; meetingId: string; itemId: string; side: "yes" | "no" }
  | { kind: "apologize"; eventId: string; amends: number }
  | { kind: "teach"; skill: SkillKey } | { kind: "ask_to_learn"; skill: SkillKey }
  | { kind: "propose_group"; groupKind: GroupKind } | { kind: "invite_group"; groupId: string }
  | { kind: "ask_group_help"; groupId: string; coins: number }
  // [C]
  | { kind: "court" } | { kind: "propose_partnership" } | { kind: "propose_child" }
  | { kind: "threaten"; demand: number } | { kind: "propose_strike" }

export type Intent =
  | { kind: "eat_home" } | { kind: "cook_family" } | { kind: "dine" } | { kind: "eat_carried"; item: ItemKind }
  | { kind: "pick_berries"; bushId: string } | { kind: "drink" } | { kind: "sleep" } | { kind: "rest" }
  | { kind: "wander"; target: Vec } | { kind: "explore"; poiId: string } | { kind: "plaza" } | { kind: "bar" }
  | { kind: "buy"; storeId: string; item: ItemKind; qty: number; knownPrice: number }
  | { kind: "sell"; storeId: string; item: ItemKind; qty: number }
  | { kind: "fetch_from_own_store"; storeId: string; to: "carry" | "pantry" | "wallet"; item: ItemKind | null; qty: number }
  | { kind: "stock_own_store"; storeId: string; item: ItemKind | null; qty: number }
  | { kind: "work_shift"; postId: string; effort: Effort }
  | { kind: "patrol"; postId: string; effort: Effort }
  | { kind: "work_project"; projectId: string; effort: Effort; paid: boolean }
  | { kind: "school" } | { kind: "play"; poiId: string }
  | { kind: "go_to_clinic"; says: "can_pay" | "cannot_pay" }           // [A1.2]
  | { kind: "take"; storeId: string; item: ItemKind; qty: number }
  | { kind: "pickpocket"; targetId: string }                           // [A1.3]
  | { kind: "hide_coins"; coins: number } | { kind: "avoid"; personId: string } // [A1.3] fear
  | { kind: "talk"; targetId: string; purpose: TalkPurpose }
  | { kind: "leave_note"; claimId: string }
  | { kind: "resolve_case"; caseId: string }
  | { kind: "bury"; bodyId: string } | { kind: "visit_grave"; graveId: string }  // [A1.2]
  | { kind: "plant_flowers"; site: { kind: "lot" | "grave"; id: string } }       // [A1.2] beauty
  // [B]
  | { kind: "attend"; ref: string } | { kind: "call_meeting" } | { kind: "read_ledger" }
  | { kind: "take_from_treasury"; coins: number } | { kind: "appoint"; postId: string; personId: string }
  | { kind: "give_to_group"; groupId: string; coins: number } | { kind: "take_from_group"; groupId: string; coins: number }

export type DriverKey =
  | "body" | "rest"                                                     // subsistence (kept from Slice 0)
  | "purpose" | "building" | "providing" | "mastery" | "belonging" | "prestige" | "curiosity"
  | "pleasure" | "meaning" | "beauty" | "generosity" | "fairness" | "autonomy" | "security"
  | "dominance" | "envy" | "greed" | "fear" | "jealousy" | "revenge" | "tribalism"
  | "deception" | "free_riding" | "violence"
export type DriverTags = Partial<Record<DriverKey, number>> // weights sum to 1
export type OptionFamily = "body" | "work" | "family" | "social" | "civic" | "take" | "leisure" | "life"
export type OptionSpec = {
  id: string
  verb: Verb
  params: Record<string, ParamValue> // the only option data on the wire
  provenance: Record<string, string> // param name -> provenance tag valid at this tick (7.8)
  label: string                      // renderOption(verb, params).label, kept for the record and the UI
  detail: string                     // renderOption(verb, params).detail: the four slots joined
  intent: Intent
  family: OptionFamily
  drivers: DriverTags                // hidden; never on the wire
}
export type SubQuestionSpec =
  | { q: "who"; purpose: "news" | "view" | "badmouth"; parentIds: string[]; people: string[] }
  | { q: "claim"; parentIds: string[]; claimIds: string[] }
  | { q: "expressed"; issue: IssueId; parentIds: string[] }
  | { q: "effort"; parentIds: string[] }

export type DutyTask =
  | { duty: "set_prices"; storeId: string; items: ItemKind[] }
  | { duty: "serve"; customerId: string; storeId: string; item: ItemKind; qty: number }
  | { duty: "case_intake"; caseId: string }
  | { duty: "case_resolution"; caseId: string }
  | { duty: "press_arrest"; caseId: string }
  | { duty: "triage"; patientId: string; where: "at_the_clinic" | "collapsed_in_sight" } // [A1.2]
  | { duty: "lesson"; presentIds: string[] }                                            // [A1.3]

/** One status per agent is still the single source of truth for what it is doing. */
export type Status =
  | { kind: "idle"; retryAt: number }
  | { kind: "founding"; requestId: number; since: number }               // C6 at tick 1, before any decide
  | { kind: "deciding"; since: number; requestId: number; options: OptionSpec[]; subs: SubQuestionSpec[] }
  | { kind: "moving"; intent: Intent; path: Vec[]; startedAt: number; waited: number; slowTicks: number }
  | { kind: "acting"; intent: Intent; ticksLeft: number }
  | { kind: "working"; intent: Extract<Intent, { kind: "work_shift" | "patrol" | "work_project" }>; ticksLeft: number; output: number }
  | { kind: "approaching"; targetId: string; purpose: TalkPurpose; since: number }
  | { kind: "considering"; askerId: string; purpose: TalkPurpose; resume: Resumable; since: number; requestId: number }
  | { kind: "talking"; partnerId: string; purpose: TalkPurpose; ticksLeft: number }
  | { kind: "on_duty_call"; duty: DutyKind; ref: string | null; requestId: number; resume: Resumable; since: number }
  | { kind: "carrying"; bodyId: string; path: Vec[] }
  | { kind: "jailed"; caseId: string; untilTick: number }
  | { kind: "collapsed"; ticksLeft: number }                            // kept from Slice 0
  | { kind: "sleeping"; since: number; reflected: boolean }
  | { kind: "reflecting"; requestId: number; since: number }
  | { kind: "infant" }                                                  // [C]
/** What an interrupted agent returns to. Never a pending call: an interrupted decide is abandoned and the agent resumes idle with retryAt = now (6.1). */
export type Resumable = Exclude<Status, { kind: "deciding" | "founding" | "reflecting" | "considering" | "on_duty_call" }>

export type ChoiceMode = "sample" | "argmax"
export type CallKind = "decide" | "encounter" | "duty" | "reflect" | "found" | "probe" | "assess"

/** Existing fields kept so the village's decision card can be reused; audit fields added. */
export type DecisionRecord = {
  tick: number
  kind: CallKind
  state: string                      // recomputed on replay
  options: { id: string; label: string; p: number }[] // the main question's distribution
  picked: string
  pickedLabel: string
  mode: ChoiceMode
  latencyMs: number
  motive: { id: MotiveKey; p: number }[] | null
  confidence: number | null
  drivers: DriverKey[]               // Slice 0 tally of the picked option (kept)
  // audit
  id: string                         // `${agentId}:${callIndex}`
  requestId: number
  appliedTick: number
  promptVersion: string              // `${PROMPT_VERSION}+psyche${PSYCHE_RENDER_VERSION}`
  questions: Record<string, { type: "choice" | "boolean" | "score"; shownOrder?: string[] }>
  answers: Record<string, RawAnswer>
  confidences: Record<string, number>
  sampling: { minP: number; u: Record<string, number>; eligible: Record<string, string[]>; prunedMass: Record<string, number> }
  pickedAll: Record<string, string>  // question id -> value used
  forced: Record<string, string>     // questions skipped because fewer than 2 options existed -> the lone option applied
  used: string[]                     // conditional questions actually acted on
  enacted: DriverTags                // sum over options of p(option) * tags
  provenance: string[]
  truncated: Record<string, number>
}

export type Flash = { kind: "heart" | "angry" | "exclaim" | "sweat" | "eye" | "thanks" | "coin" | "badge" | "tear" | "hammer" | "gift"; until: number }

export type Agent = {
  id: string
  persona: Persona
  psyche: Psyche                     // the living psyche; drifts only through the drift hook (5.1.4)
  psycheAtBirth: Psyche
  drift: DriftEntry[]
  driftToday: { day: number; used: Partial<Record<PsychePath, number>> } // daily cap (village shape)
  pos: Vec; prev: Vec; facing: Dir; steps: number
  insideOf: string | null
  bornTick: number                   // founders: tick 0 minus age converted with lifePace
  stage: LifeStage
  householdId: string
  postId: string | null
  skills: Partial<Record<SkillKey, number>>
  wallet: number
  unnoticedLoss: number              // coins taken unseen (village missingCoins); discovered at the next decide
  carry: Stack[]
  needs: Needs
  needCause: Partial<Record<NeedKey, string>>
  condition: Condition               // [B] and [C]; both fields null in Slice A
  status: Status
  memory: Memory[]
  ties: Record<string, Tie>
  knowledge: Record<string, Belief>  // by claim id
  knownStores: Record<string, KnownStore>
  knownPrices: Record<string, KnownPrice> // key `${storeId}:${item}:${side}`
  noticesRead: Record<string, number>     // notice id -> tick read
  stances: Partial<Record<IssueId, Stance>>
  expressed: Partial<Record<IssueId, Expressed>>
  perceivedStances: Record<string, Partial<Record<IssueId, PerceivedStance>>>
  emotions: Emotion[]
  pending: PendingQ[]
  visited: Record<string, number>
  decisions: DecisionRecord[]
  callIndex: number                  // per-agent call counter; keys the choice RNG stream
  drivers: DriverTags                // Slice 0 chosen-driver tally (kept)
  mood: MoodReading | null
  meaning: number | null             // last reflect meaning EV x 25, 0..100 (Increment 3)
  goal: GoalKey | null               // Increment 3
  grudges: string[]                  // Increment 3; forgive removes an entry
  gratitude: string[]                // Increment 3
  today: { day: number; helpers: string[]; wrongers: string[] } // Increment 3
  lastReflectDay: number             // Increment 3; one reflection per day
  complimentsAt: number[]            // ticks of compliments received, for diminishing returns
  groupIds: string[]                 // [B]
  lastPurposeTick: number            // kept from Slice 0
  flash: Flash | null
}

// What one person can know. buildView (lib/town/view.ts) is the only function that reads World
// for perception; perceive and the option builders read only a View. Plain JSON. Every fact about
// anything other than the viewer carries its provenance tag (7.8). No View ever contains an
// eventId: tests/town/perception.test.ts walks the JSON and fails on that key.
export type ViewFact<T> = T & { tag: string }
export type CueKind = "hungry" | "exhausted" | "unwell" | "carrying_food" | "upset" | "collapsed"
export type ThingSeen =
  | { kind: "bush"; id: string; berries: number }
  | { kind: "body"; id: string; name: string }
  | { kind: "grave"; id: string; name: string; flowers: number }
  | { kind: "store"; id: string; label: string; items: Bundle }      // shelves, kitchen, bar: only when inside
  | { kind: "project"; id: string; unitsDone: number; unitsNeeded: number; crew: string[] }
export type View = {
  tick: number
  clock: { day: number; weekday: number; minuteOfDay: number; night: boolean }
  self: {
    id: string; name: string; pronoun: Pronoun; ageYears: number; stage: LifeStage
    history: string; character: string; psyche: Psyche
    pos: Vec; insideOf: string | null; status: Status
    needs: Needs; needCause: Partial<Record<NeedKey, string>>; matters: Record<MindKey, 0 | 1 | 2>
    wallet: number; carry: Stack[]; skills: Partial<Record<SkillKey, number>>
    post: Post | null; job: JobDef | null
    goal: GoalKey | null; grudges: string[]; gratitude: string[]
    stances: Partial<Record<IssueId, Stance>>; emotions: Emotion[]; memories: Memory[]
  }
  household: { id: string; name: string; memberIds: string[]; homeId: string; pantryId: string; stashId: string }
  places: ViewFact<{ buildingId: string; name: string; hours: Building["hours"]; access: Access; door: Vec; steps: number; unlocked: boolean | null; staffed: boolean | null }>[] // null = cannot tell from here
  seeing: ViewFact<{ id: string; name: string; steps: number; insideOf: string | null; activity: string; cues: CueKind[] }>[]
  things: ViewFact<ThingSeen>[]
  lastSeen: ViewFact<LastSeen & { id: string; name: string }>[]
  ties: Record<string, Tie>          // the viewer's own ties
  beliefs: ViewFact<{ claim: Omit<Claim, "eventId">; belief: Belief }>[]
  stores: Record<string, ViewFact<KnownStore & { label: string; own: boolean }>>
  prices: Record<string, ViewFact<KnownPrice & { storeId: string; item: ItemKind; side: "sell" | "buy" }>>
  notices: ViewFact<{ id: string; text: string; readTick: number }>[]
  heard: ViewFact<PerceivedStance & { speakerId: string; issue: IssueId }>[]
  cases: ViewFact<Omit<Case, "eventId">>[] // only cases the viewer reported, handles, or was questioned in
  favours: { gave: Record<string, number>; got: Record<string, number> } // the viewer's own help ledger
}
export type SituationLine = { text: string; tag: string }
export type PerceiveResult = { perception: Perception; provenance: string[]; truncated: Record<string, number> }
// perceive(view: View, ablations: Ablations, situation: SituationLine[]): PerceiveResult  (lib/town/perception.ts)

// Requests
type RequestBase = {
  id: number; tick: number; agentId: string; callIndex: number
  perception: Perception; provenance: string[]; truncated: Record<string, number>
}
export type SimRequest =
  | (RequestBase & { kind: "decide"; options: OptionSpec[]; subs: SubQuestionSpec[]; rides: PendingQ[] })
  | (RequestBase & { kind: "encounter"; askerId: string; purpose: TalkPurpose })
  | (RequestBase & { kind: "duty"; task: DutyTask; rides: PendingQ[] })
  | (RequestBase & { kind: "reflect"; today: string[]; helpers: string[]; wrongers: string[]; grudges: string[]; askGoal: boolean })
  | (RequestBase & { kind: "found"; issues: IssueId[] })

// World
export type LogTone = "info" | "social" | "error" | "conflict" | "good" | "work" | "money" | "justice" | "life" | "observer"
export type LogEntry = { tick: number; text: string; agentIds: string[]; tone: LogTone; eventId?: string }
export type Stats = {
  calls: number; decisions: number; responses: number; errors: number; totalLatencyMs: number; costUsd: number
  byKind: Partial<Record<CallKind, number>>; instrumentCalls: number
  stale: number                      // answers dropped by the requestId guard
}
export type Ablations = {
  psyche: "full" | "character_only" | "none" // character_only: psyche null, character kept; none: both empty
  perception: "honest" | "omniscient"        // omniscient = the village's perceive(), a control arm only
  optionOrder: "shuffled" | "fixed"
  optionDetail: "full" | "label_only"
  motiveReadout: boolean
  memoryRecall: boolean                      // [B] "seeing them reminds you" lines
  caps: 1 | 2                                // salience caps as listed, or doubled (7.9)
  driftModel: "jev" | "engine" | "off"       // the village's DriftModel; the lab's drift= flag sets it
}
/** Every preset in 9.1. SCENARIOS is typed Record<ScenarioId, ScenarioParams>, so the compiler checks both directions. */
export type ScenarioId =
  | "fernhollow" | "slice_a_beats" | "lean_times"
  | "role_swap_officer_teacher" | "role_swap_shop_doctor" | "role_swap_mayor_carpenter"
  | "clones" | "no_psyche" | "gentle_town" | "hard_town" | "two_cultures" | "sampled"
  | "no_police" | "the_stranger" | "open_ballot" | "secret_ballot"
  | "heritable_only" | "culture_only" | "long_history"
export type WorldConfig = {
  seed: number
  scenario: ScenarioId
  policy: "jev" | "random" | "needs_greedy"
  minP: number
  lifePace: number                   // years per in-game day (2.4)
  ablations: Ablations
  /** Named overrides of scenario parameters, e.g. { "economy.deliverySize": 10 }. */
  overrides: Record<string, number | string | boolean>
}

export type Intervention =
  | { kind: "famine" } | { kind: "bounty" }                           // kept: berry bushes
  | { kind: "supply_shock"; days: number; factor: number }            // the truck brings factor x the load
  | { kind: "natural_death"; agentId: string }
  | { kind: "drop_items"; storeId: string; item: ItemKind; qty: number }
  | { kind: "remove_items"; storeId: string; item: ItemKind; qty: number }
  | { kind: "plant_rumour"; hearerId: string; claim: { kind: ClaimKind; actorId: string; targetId: string | null; storeId: string | null } }
  | { kind: "vacate_job"; postId: string }                           // [B]
  | { kind: "sickness"; agentId: string }                            // [B]
  | { kind: "set_param"; key: string; value: number }                // [B]
  | { kind: "edit_psyche"; agentId: string; path: PsychePath; value: number } // [B]
  | { kind: "impose_ordinance"; ordinance: OrdinanceKind; sanction: SanctionLevel } // [B] a county order
  | { kind: "repeal_ordinance"; ordinanceId: string }                // [B] a county order
  | { kind: "add_stranger"; personaId: string }                      // [C]
  | { kind: "fire"; buildingId: string }                             // [C]

export type World = {
  config: WorldConfig
  tick: number
  requestSeq: number
  nextId: number                     // deterministic ids: e_12, c_40, m_310, case_3 ...
  counters: Record<string, number>
  mapVersion: number                 // bumped when tiles change, so the static canvas layer repaints
  tiles: Tile[]
  buildings: Building[]
  lots: Lot[]
  bushes: Bush[]
  pois: Poi[]
  landmarks: Landmark[]
  agents: Agent[]
  departed: Departure[]
  bodies: Body[]
  graves: Grave[]
  households: Household[]
  posts: Post[]                      // JOBS itself is a constant in lib/town/jobs.ts
  stores: Store[]
  prices: PriceBoard[]
  town: Town
  projects: Project[]
  events: WorldEvent[]               // ring buffer of 3,000 in the browser; the lab exports all of them
  claims: Claim[]
  cases: Case[]
  favours: Record<string, number>    // `${fromId}>${toId}` help counts (the village favours ledger)
  groups: Group[]                    // [B]
  commitments: Commitment[]          // [B]
  loans: Loan[]                      // [B]
  partnerships: Partnership[]        // [C]
  techniques: Technique[]            // [C]
  weather: { day: number; kind: Weather }[] // [C] precomputed tape; always "clear" in Slices A and B
  shockTape: { tick: number; kind: "delivery" | "grant" | "scheduled"; ref: string }[]
  log: LogEntry[]
  stats: Stats
}
```

`World` stays plain JSON: no Maps, no typed arrays, no class instances. `structuredClone` and canonical-JSON hashing (`hashWorld`, section 8.4) depend on that. So does `View`, which the lab stores with each high-stakes decision so that a probe can be rebuilt from it.

## 5. Psychology model, then mechanics

### 5.1 Psychology model

#### 5.1.1 Fields and frameworks

Every field is 0 to 100 (the Slice 0 scale) and is stored on `Agent.psyche`. `Agent.psycheAtBirth` is kept to bound drift.

| Field | Framework | What it is for |
|:-|:-|:-|
| `big5` (openness, conscientiousness, extraversion, agreeableness, neuroticism) | Big Five temperament | Style of engagement. Sets rates for social, fun, purpose and belonging. Partly heritable. |
| `values` (10 keys) | Schwartz basic values | What the person wants from life. Relative order is what gets rendered. Not inherited: formed by lived experience (5.1.4). |
| `foundations` (care, fairness, loyalty, authority, sanctity, liberty) | Moral foundations theory | Gut moral reactions. Rendered as strong at 70 or above and weak at 30 or below. Not inherited. |
| `attachment` (secure, anxious, avoidant, fearful, or null) | Adult attachment | How the person relates in closeness. Null for children until 16, when JEV sets it from their memories of being cared for. |
| `dark` (machiavellianism, narcissism, psychopathy) | Dark triad | Rendered honestly as "your shadow" at 55 or above. Partly heritable. |
| `risk` | Risk tolerance | Rendered with the horizon sentence. |
| `patience` | Time preference | Lives for today (low) or plans for the long run (high). |
| `trust` | Generalized trust | Starting trust toward strangers. Drifts through nightly reflection. |

#### 5.1.2 How psychology enters perception

`psycheLines(p, stage)` in `lib/town/psyche.ts` is the only way psychology reaches JEV, and the inspector's Psyche tab reuses it. It returns at most 7 first-person lines and keeps the Slice 0 rules:

1. **Temperament.** Big Five traits at 66 or above, or 34 or below, get a word. Traits at 80 or above, or 20 or below, get "very".
2. **What matters most.** The top 3 values above 55, plus "you care little for X" when the lowest value is below 35.
3. **Moral instincts.** Foundations at 70 or above are listed as strong, and at 30 or below as weak.
4. **Attachment.** One attachment sentence, plus a trust clause when trust is 70 or above, or 30 or below.
5. **Shadow.** One "your shadow" line whenever any of the shadow triggers applies.
6. **Horizon and risk.** One sentence.

`PSYCHE_RENDER_VERSION` becomes **2** in the town. It carries four wording changes. They are the Slice 0 fix list (11.0), applied in the town because the village is frozen:

- **No calling line.** The "Your calling" line is removed. The job now lives in the `life` section, so the `psyche: none` ablation removes psychology without also removing the job.
- **Machiavellianism shadow.** The clause becomes "you deceive and manipulate people when it pays and you think you can get away with it". The old "and you will not be caught" read as a fact about the world.
- **Children.** For a child whose values are all still at 50, lines 2 and 3 are replaced by "You are still working out what matters most to you." The attachment sentence is skipped while `attachment` is null.
- **Semicolons.** Trait phrases within one line are joined with semicolons, not with a run-on "and", so that two phrases which each contain "and" stay readable.

Every `DecisionRecord.promptVersion` logs `town-1+psyche2`. A wording change counts as a new experimental condition, not a refactor.

**Example: Odile at render version 2.** This is what JEV sees in the "Who you are" block:

```
- Temperament: practical and set in your ways, wary of the unfamiliar; diligent and disciplined, you finish what you start.
- What matters most to you: tradition and custom; fitting in and following the rules; safety and stability. You care little for fairness for everyone.
- Moral instincts: you feel strongly about loyalty to your people; respect for order and leaders; purity and the sacred. You care little about freedom from being controlled.
- You trust that the people who care about you will stay.
- You balance today and tomorrow.
```

The phrases are the Slice 0 word lists (`TRAIT_WORDS`, `VALUE_WORDS`, `FOUNDATION_WORDS` in `lib/sim/psyche.ts`), copied verbatim. Only the joins change. At render version 1 the Temperament line read "practical and set in your ways, wary of the unfamiliar and diligent and disciplined, you finish what you start", and that line was one input to the fix list.

#### 5.1.3 Needs: rates, restoration and security

Needs work through deterministic physics. `needRates(p)` keeps its Slice 0 formulas and adds belonging and security:

| Need | Base drain per awake tick | Rate multiplier from the psyche (clamped 0.3 to 1.8) |
|:-|:-|:-|
| hunger, thirst, energy | 0.3, 0.38, 0.2 (as in the village) | `Persona.bodyDecay` only |
| social | 0.28 | 0.5 + E/100 (Slice 0) |
| fun | 0.3 | 0.5 + O/200 + stimulation/200 (Slice 0) |
| purpose | 0.10 | 0.5 + C/100 + achievement/200 (Slice 0) |
| respect | 0.05 | 0.4 + narcissism/100 + achievement/200 (Slice 0) |
| belonging | 0.06 | 0.4 + E/250 + 0.4 x attachNeed + tradition/300, where attachNeed is anxious 1, fearful 0.7, secure 0.5, avoidant 0.1, null 0.5 |
| security | no drain; recomputed hourly (below) | importance only: 0.3 + security/200 + neuroticism/200 |

**How much a need matters.** Each mind need carries a "matters" level:

- level 2 when its multiplier is 1.3 or more;
- level 1 when it is 0.9 or more;
- level 0 otherwise.

`buildState` renders the level with the need: "Respect: 40/100, overlooked (this matters to you a great deal; the town has not thanked you for anything lately)". The words for belonging are "cut off", "on the outside", "okay", "part of things" and "deeply rooted". The words for security are "in danger", "insecure", "okay", "safe" and "secure".

**Restoration.** The restoration table is fixed and the same for everyone. That is deliberate: rewards never scale with personality, only drains do. This avoids the circularity the validity judge flagged.

| Need | Restored by (typed events, `lib/town/needs.ts`) | Drained by |
|:-|:-|:-|
| purpose | +0.25 per shift tick, times the effort factor (0.5, 0.8, 1, 1.1); +0.3 per project tick; cooking for the family +6; a patient treated +4 for the carer; a lesson given +3; a burial +10; flowers planted +2; a gift given +3; a finished project +20 for contributors; a case resolved +10 for the officer | the base drain |
| belonging | +0.15 per tick at home with at least 1 awake household member; +0.2 per tick while dining or drinking with 2 or more others; +0.1 per tick talking; +0.1 per tick on a project with others; +10 at a burial with others present | base drain; a grief event -10 for close ties |
| respect | thanked warmly +6; a compliment +4, halved for each compliment received in the last 12 hours (Increment 2's diminishing rule) [A1.3]; public credit on a finished project +5 to +15, by share | declined -3; refused service -5; warned -8; fined -15; arrested -30; a lie exposed in public -20; seen taking without paying -12 (Slice 0) |
| social, fun | as in the village, plus the town sources listed in section 13 | as in the village |

**Security**, 0 to 100, is recomputed every 12 ticks from facts the person knows:

```
foodDays  = (own household pantry portions as last seen / household size + carried portions) / 2.5
security  = 0.35 * min(100, 20 * foodDays)
          + 0.20 * min(100, wallet / 30 * 100)
          + 0.20 * health
          + 0.15 * max(0, 100 - 30 * wrongsAgainstYouKnownInLast2Days)
          + 0.10 * (hasHome ? 100 : 0)
          - (dependantHungerKnown ? 25 : 0)
```

`dependantHungerKnown` uses only what the carer perceived. It is true when, within the last 12 hours, the carer saw a dependant with the "looks thin and hungry" cue (hunger below 25, 7.4), or was told by the dependant that they are hungry (an `ask_help` with claim `hungry`), and has not since seen that dependant eat or be fed. The provenance is the cue's `sight` tag, or the `heard:<eventId>` tag, with its tick. The dependant's true hunger is never read.

**Reason clauses.** Each mind need carries one in `needCauses`, taken from the last event that moved it. Examples:

- Purpose: "your last meaningful work was at 11:40 am" (Slice 0).
- Security: "you have food for about 1 day and 6 coins".

**Urgency: carried verbatim from Increment 2.** Increment 2 fixed mass collapses only after it added these lines. It had found that personality words drown out thirst and hunger. The town journey to food is longer, and it has opening hours and prices, so these lines are carried into `lib/town/jev/prompt.ts` and `lib/town/needs.ts` **word for word**:

- **The body alarm.** `bodyAlarm(p)` goes on its own line **directly after the identity line**, above "Who you are". It reads `Your body needs attention: {parts}.`, where the parts are, in this order and joined with ", ":
  - "you badly need water" when thirst is below 25;
  - "you badly need food" when hunger is below 25;
  - "your health is {h}/100 and falling" when health is below 85.
- **Urgency clauses.** `urgency(key, value)` replaces that need's reason clause:
  - hunger below 15: "you are starving; your body is failing and you will collapse without food";
  - hunger below 25: "you are getting faint from hunger and need to eat soon";
  - thirst below 15: "you are badly dehydrated; your body is failing and you will collapse without water";
  - thirst below 25: "you are dehydrated and need water soon";
  - energy below 10: "you can barely keep your eyes open".
- **The hours-to-collapse clause.** While hunger or thirst is below 10, `needCause.health` reads "you are going without {food | water | food and water}; at this rate you will collapse in about {n} hour(s)", where n = max(1, round(health / 0.35 x 5 / 60)). At health 95 or more the clause is dropped. Between those, it reads "you are slowly recovering".

The physics behind the words is unchanged: health drops 0.35 per tick while hunger or thirst is below 10, and at health 0 the person enters `collapsed` for 36 ticks, as in Slice 0. Rewording any of these lines is a versioned experiment: bump `PROMPT_VERSION`, and keep the old wording as the control arm. It is never a refactor. The P5 reachability tests (11.1) render them.

Death from deprivation arrives in Slice C behind the flag `deprivationDeath`. Collapsing a second time within 48 ticks is then death by starvation or thirst.

#### 5.1.4 Inheritance, formation and drift

- **Heritable part.** `inheritPsyche(a, b, key)` applies to the Big Five, the dark triad, risk, patience and trust. Each child value is `0.45 * midparent + 0.55 * 50 + gauss(8)`, where the Gaussian comes from the `spawn` stream keyed by `key`, clamped to 0 to 100. The 0.45 follows twin-study heritability for the Big Five.
- **Cultural part.** Values and foundations start at 50 and form through lived experience. So in generational runs, genes and culture can be told apart. The `heritable_only` and `culture_only` conditions (section 9.1) test this.
- **Children's stances** start unset ("You have not made up your mind about this yet"). They form only through JEV `stance_after` answers when someone talks to the child about the issue.
- **Coming of age, at 16** (Slice C, call C11). JEV reads the child's formative memories and upbringing facts:
  - "fed on time on most days";
  - "your parents argued often";
  - "your teacher Linnea taught you most mornings".

  It then chooses:
  - the attachment style (choice of 4);
  - `value_first` and `value_second` (choices over the 10 values): the first becomes 80, the second 70, and the rest stay at 50;
  - `trait_<k>` for each Big Five trait, each a score over 5 words, blended 50/50 with the inherited value.

  Upbringing therefore becomes psychology through JEV's own reading of the life lived. The engine uses no formula.
- **Adult drift** happens only through nightly reflection answers (C5), in the default `driftModel: "jev"`. The shapes are those of Increment 3, adopted as they stand:
  - `trust_people`: its EV from 0 to 4 moves `psyche.trust` by 1.5 x (EV - 2) and agreeableness by 0.5 x (EV - 2).
  - `change` is asked every night from Slice A. It is a choice over the 10 `CHANGES` keys: unchanged, more_wary, more_generous, more_guarded, more_ambitious, more_content, closer_to_family, devoted_to_work, more_ruthless and more_bitter. Each key maps to at most 2 points on at most 2 fields, through the village's `CHANGE_DELTAS` table, copied verbatim into `lib/town/drift.ts`. For example, more_ruthless is machiavellianism +2 and benevolence -1.

  Caps, as in the village: 3 points per trait per day (`Agent.driftToday`), and 25 points lifetime away from `psycheAtBirth`. Every change is written to `Agent.drift` with its `decisionId`.
- **No `LIFE_EVENT_DELTAS` in the default arm.** The engine never decides what an experience means psychologically. The village's engine rules, `habit` and `lifeEvent` from `lib/sim/drift.ts`, which drift traits from habits and events by rule, are copied into `lib/town/drift.ts` and run only in the `driftModel: "engine"` comparison arm, keyed by the town's `DriverKey` and event kinds. `off` freezes the psyche. So the engine-drift and JEV-drift trajectories are an experiment, not a design assumption. The engine calls drift only through the hooks in `lib/town/hooks.ts` (8.6).

#### 5.1.5 Drivers: offered symmetrically, measured twice

**Hidden tags.** Every `OptionSpec` carries hidden `drivers` tags whose weights sum to 1. The same holds for every duty and encounter answer option that expresses a driver. The tags come from the ACTIONS table and the answer-tag table (section 5.2), which are pre-registered, and `toWire` strips them. Two examples:

- "Take 2 groceries off the store shelf without paying" is tagged greed 0.6, free_riding 0.2 and body 0.2.
- "Cook dinner for everyone at home" is tagged providing 0.7 and belonging 0.3.

**Enacted mix.** Computed free for every decision: `enacted[d] = sum over offered options of p(option) * tag(option, d)`. It uses the full distribution, not the sampled pick, and is stored as `DecisionRecord.enacted`. The Slice 0 per-pick tally, `Agent.drivers`, is kept for continuity.

**Reachability.** A driver with no affordance has zero enacted mass by construction, whatever the psychology. So each slice lists which drivers are reachable, meaning that at least one tagged option or answer exists. The psyche expression index and every `enacted_<driver>` share are computed **only over the drivers reachable in the running build**. An unreachable driver is reported as "not offered", never as 0.

| Driver | First reachable | Through |
|:-|:-|:-|
| body, rest, purpose, providing, mastery, belonging, curiosity, pleasure, autonomy, security, fairness, greed, free_riding | A1-min | table 5.2 rows marked A1-min |
| generosity | A1-min (answers only); A1.3 (options) | `set_prices` at cost, `grant`, `accept_sale`; then `gift`, `compliment` |
| deception | A1-min (answers only); A1.3 (options) | testimony lies and denials; then `plead` and `pickpocket` |
| revenge | A1-min | `report` (share 0.2), `serve` refusals, blame answers; A1.3 `badmouth` |
| dominance | A1-min for the officer only; B for everyone | the officer's `arrest` and `press_arrest` answers, the teacher's civic lesson (A1.3); then `demand` and `appoint` [B] |
| building, prestige | A1.1 | `work_project_footbridge` |
| meaning, beauty | A1.2 | `bury`, `visit_grave`, `plant_flowers` |
| envy | A1.3 | `badmouth_<id>`: a claim you believe, told about someone you know is better off |
| fear | A1.3 | `avoid_<id>`, `hide_coins`; triage `leave_them` |
| tribalism | B | `declare_rival`, group-only aid, bloc declarations (M19) |
| jealousy | C | a witnessed approach by a rival to your partner (M20) |
| violence | C | the violence ladder (M22) |

**Hope** (P9) is not a driver key in any slice, because no single act is hopeful as such. It is measured as an outlook instead: the `outlook` metric (9.7) is the mean EV of each night's `trust_people` answer, reported beside `meaning`.

**Revealed mix.** Computed headless by probes (section 9.6, `attribute`). For each driver there is a group of facts:

| Driver | Fact group |
|:-|:-|
| providing | dependant lines |
| prestige | contribution lists |
| envy | prices and wealth cues |
| revenge | known wrongs |
| belonging | household and group lines |

The probe removes one group, re-asks JEV, and records the total variation distance.

**Psyche expression index.** The Spearman correlation between a person's `driverWeights(psyche)` and their enacted and revealed mixes, over the reachable drivers only. It is reported both with the psyche shown and under the psyche-blind ablation. `driverWeights` is used only for this measurement, never for rewards or gating:

| Driver | Weight formula (0 to 100 inputs) |
|:-|:-|
| purpose | 0.4 C + 0.3 achievement + 0.3 benevolence |
| building | 0.4 C + 0.3 achievement + 0.3 patience |
| providing | 0.4 A + 0.4 benevolence + 0.2 care |
| mastery | 0.4 C + 0.3 achievement + 0.3 O |
| belonging | 0.4 E + 0.2 conformity + 0.2 tradition + 20 x attachNeed |
| prestige | 0.4 achievement + 0.3 power + 0.3 narcissism |
| curiosity | 0.6 O + 0.4 stimulation |
| pleasure | 0.6 hedonism + 0.4 E |
| meaning | 0.4 universalism + 0.3 sanctity + 0.3 tradition |
| beauty | 0.5 O + 0.3 universalism + 0.2 sanctity |
| generosity | 0.5 benevolence + 0.3 A + 0.2 care |
| fairness | 0.6 fairness + 0.4 universalism |
| autonomy | 0.6 selfDirection + 0.4 liberty |
| security | 0.5 security + 0.5 N |
| dominance | 0.5 power + 0.3 narcissism + 0.2 (100 - A) |
| envy | 0.4 N + 0.3 narcissism + 0.3 power |
| greed | 0.4 (100 - A) + 0.3 power + 0.3 security |
| fear | clamp(0.6 N + 0.4 security - 0.3 risk) |
| jealousy | 50 x attachNeed + 0.3 N + 0.2 narcissism |
| revenge | 0.4 (100 - A) + 0.3 loyalty + 0.3 psychopathy |
| tribalism | 0.4 loyalty + 0.3 authority + 0.3 (100 - universalism) |
| deception | 0.7 machiavellianism + 0.3 (100 - fairness) |
| free_riding | 0.5 (100 - C) + 0.3 hedonism + 0.2 (100 - patience) |
| violence | 0.5 psychopathy + 0.3 (100 - A) + 0.2 risk |

**The motive readout** (Slice 0 `MOTIVES`) is asked only in the `motiveReadout` ablation arm. It is labelled "JEV's self-model", because in live probes a schemer answered "status 0.99" while stealing. It is never used as a cause.

### 5.2 The ACTIONS table: one source for physics and option text

`lib/town/actions.ts` holds one `ActionDef` per verb. It is pure, and it imports nothing from `World` at runtime, so the engine builds options with it and the route renders their text with it:

```ts
import type { z } from "zod"
import type { ParamValue, Verb, VERB_PARAMS } from "./jev/schema"
import type { DriverTags, Intent, OptionFamily, View } from "./types"

type Params<V extends Verb> = z.infer<(typeof VERB_PARAMS)[V]>
type ActionDef<V extends Verb> = {
  verb: V
  family: OptionFamily
  /** Pure in the params. Every case is listed in the table below. */
  drivers: (p: Params<V>) => DriverTags
  /** Gates are physical and knowledge facts only, never psychology. Every param carries its provenance tag. */
  available: (view: View) => { id: string; params: Params<V>; provenance: Record<string, string>; intent: Intent }[]
  /** Label and slots read the params only, so the server can render them from the wire. */
  label: (p: Params<V>) => string       // plain, concrete, no evaluative adjectives
  slots: (p: Params<V>) => { what: string; where: string; effects: string; who: string }
}
export declare const ACTIONS: { [V in Verb]: ActionDef<V> }
export declare function renderOption(verb: Verb, params: Record<string, ParamValue>): { label: string; detail: string }
```

Names of places come from the fixed id catalogs in `lib/town/map.ts` (`BUILDING_NAMES`, `STORE_LABELS`, `POI_NAMES`). Names of people travel as params that match `nameSchema`.

**Option detail text.** The detail is always the four slots joined into a single string: `What: ... Where: ... Effects: ... Who would know: ...`. It is capped at 240 characters.

**Framing rules.** `tests/town/framing.test.ts` enforces them:

- Every detail is rendered from its slots, and every label and detail is produced by `renderOption(verb, params)`.
- No word from the banned list appears. The list is: cozy, relaxing, fun, nice, lovely, wrong, shameful, glorious, selfish, noble, lazy, good, bad.
- Detail lengths fall within 40% of the median.
- **Numbers come from the viewer's View, not from the world.** Every number stated in a label or detail equals a param. Every numeric param equals the corresponding `View` value, and it carries a provenance tag that was valid at that tick: `price:<storeId>@<tick>`, `notice:<id>`, `sight`, `self`, `job` or `lastSeen:<id>@<tick>`. A price, a shelf count or a project's progress is therefore stated as last seen, with its tag, even when the world has moved on.
- **A negative test.** The test builds a world where the store's real price is 6 but the viewer last saw 4 at tick 40. The option must say 4 coins, with tag `price:st_store_shelf@40`. On arrival the intent must be cancelled with the memory "Groceries were 6 coins now", followed by a fresh `decide` (M3).
- `VERB_PARAMS` and `ACTIONS` have identical key sets, and every verb has exactly one row in the table below.

**Honest risk.** The "who would know" slot never claims that nobody will find out. Examples of what it does say:

- "You see no one else in the store"
- "Sable keeps a count of his stock"
- "Anyone who passes Main Street can see you"

**Option order.** Order is a seeded shuffle, `rand(seed, "choice", agentId, callIndex, "order")`, recorded as `shownOrder`. It is fixed only in the `optionOrder: fixed` ablation.

**The complete Slice A ACTIONS table (pre-registered).** A verb is the option id without its `_<...>` suffix, so `eat_carried_fish` has verb `eat_carried`. The table is frozen once A0 lands. Changing a tag, a gate or a param is a contracts pull request, and the version it bumps is logged with every decision. "On shift" means the chooser's own shift window, or school hours for a child. Where a row gives an on-shift variant, the variant replaces the base tags.

| Option id | From | Family | Params (on the wire) | Gate: physical and known facts | Driver tags |
|:-|:-|:-|:-|:-|:-|
| `eat_home` | A1-min | body | portions, steps | at home or within 20 steps; the pantry was last seen with 1 or more portions | body 1 |
| `eat_carried_<item>` | A1-min | body | item, have | carrying that food | body 1 |
| `drink` | A1-min | body | place, steps | always: the home tap or the fountain | body 1 |
| `sleep` | A1-min | body | steps, energy | always | rest 1 |
| `rest` | A1-min | leisure | onShift | always | rest 1; on shift: rest 0.5, free_riding 0.5 |
| `wander` | A1-min | leisure | steps, onShift | always | autonomy 0.5, curiosity 0.3, rest 0.2; on shift: autonomy 0.4, curiosity 0.1, free_riding 0.5 |
| `explore_<poi>` | A1-min | leisure | poi, steps, lastVisit, onShift | the 2 least recently visited POIs | curiosity 0.8, autonomy 0.2; on shift: curiosity 0.5, free_riding 0.5 |
| `plaza` | A1-min | leisure | steps, onShift | always | belonging 0.6, pleasure 0.2, curiosity 0.2; on shift: belonging 0.5, free_riding 0.5 |
| `bar` | A1-min | leisure | price, steps, onShift | the bar's posted hours as known; the wallet covers the known price; adult | pleasure 0.6, belonging 0.4; on shift: pleasure 0.5, free_riding 0.5 |
| `dine` | A1-min | body | price, steps | the diner's posted hours as known; the wallet covers the known price | body 0.5, belonging 0.3, pleasure 0.2 |
| `pick_berries_<bush>` | A1-min | body | bush, berries, seenAt, steps | a bush last seen with 1 or more berries | body 0.8, security 0.2 |
| `buy_<item>_<qty>` | A1-min | family | store, item, qty, price, wallet, steps, seenAt | the posted hours as known; a listing known; the wallet covers qty x the known price; qty 2 or 5 | security 0.5, providing 0.3, body 0.2 |
| `sell_<item>_<store>` | A1-min | work | store, item, qty, buyPrice, steps | holds 3 or more produce or fish; the buyer's place is known to be open | security 0.6, purpose 0.4 |
| `fetch_<store>_<what>` | A1-min | family | store, to, item, qty | a store the chooser owns, or whose post they hold, known to hold that item or coins | goods to the pantry or carry: providing 0.8, body 0.2; coins to the wallet: security 0.7, providing 0.3 |
| `stock_<store>` | A1-min | family | store, item, qty | carrying food, or holding coins, and within 20 steps of a store the chooser owns | into a pantry: providing 0.8, security 0.2; into a kitchen or till: purpose 0.6, security 0.4 |
| `cook_family` | A1-min | family | portions, present, steps | aged 10 or over; at home or within 20 steps; the pantry was last seen with 1 or more portions | providing 0.7, belonging 0.3 |
| `work_shift` | A1-min | work | job, start, end, minutesLate, pay, steps | holds a post; a shift day; from 30 minutes before the start to the end; not jailed | purpose 0.5, security 0.3, mastery 0.2 |
| `school` | A1-min | work | start, steps, minutesLate | a child aged 5 to 15; a school day; within school hours | mastery 0.6, belonging 0.4 |
| `play_<poi>` | A1-min | leisure | poi, steps, onShift | a child; a POI within 20 steps of home or the school | pleasure 0.7, curiosity 0.3; during school hours: pleasure 0.5, free_riding 0.5 |
| `talk_<id>` | A1-min | social | who, steps, activity | the 4 nearest people in sight who are awake | belonging 1 |
| `ask_help_<id>` | A1-min: a child to a household adult; A1.3: anyone | social | who, need, amount, claim, steps | in sight; the claim is true in the chooser's own frame (for example "hungry" requires hunger below 50) | body 0.6, security 0.4 |
| `take_<store>` | A1-min | take | store, item, qty, value, watchers, ownerCounts | an adult; inside the building; the holder not inside; saw 2 or more of the item in that shelf, kitchen or bar | greed 0.6, free_riding 0.2, body 0.2 |
| `report_<claim>` | A1-min | civic | claim, officer, lastSeenAt, steps | an adult who holds a theft belief (witnessed, discovered or told) while an officer post is filled | fairness 0.5, security 0.3, revenge 0.2 |
| `leave_note_<claim>` | A1-min | civic | claim, steps | a report of this claim failed to reach the officer within 60 ticks | fairness 0.6, security 0.4 |
| `question_<case>_<id>` | A1-min | work | case, who, why | the officer; the case is open; up to 3 candidates | purpose 0.6, fairness 0.4 |
| `resolve_<case>` | A1-min | work | case, interviews | the officer; the case has 1 or more interviews, or a refused or unpaid fine | purpose 0.5, fairness 0.5 |
| `patrol` | A1.1 | work | start, end, pay, loopSteps | the officer, on shift | purpose 0.5, security 0.3, fairness 0.2 |
| `work_project_footbridge` | A1.1 | work | done, needed, paid, crew, steps | an adult or elder; the project is open and known; paid only for the carpenter on shift | unpaid: building 0.5, belonging 0.2, prestige 0.2, generosity 0.1; paid: building 0.5, purpose 0.3, security 0.2 |
| `go_to_clinic` | A1.2 | body | steps, fee, says | health below 60; the clinic's posted hours as known | body 1 |
| `bury_<body>` | A1.2 | life | who, steps | an adult who knows of the body; not jailed | meaning 0.5, belonging 0.3, generosity 0.2 |
| `visit_grave_<grave>` | A1.2 | life | who, steps | kin, or liking for the dead of 0.2 or more | meaning 0.6, belonging 0.4 |
| `plant_flowers_<site>` | A1.2 | life | site, steps | a known grave or an empty lot; the chooser walked past `flowers` tiles today (wildflowers are free) | beauty 0.7, meaning 0.3 |
| `talk_news` | A1.3 | social | claims, people | holds 2 or more beliefs about third parties at credence 0.5 or more; 2 or more known people | belonging 0.6, prestige 0.2, curiosity 0.2 |
| `badmouth_<id>` | A1.3 | social | about, claims, people | holds a belief at credence 0.5 or more that harms that person (took_from, lied_to, fined, arrested), and knows that person earns more (posted pay) or saw them spend more | envy 0.6, revenge 0.2, belonging 0.2 |
| `talk_view` | A1.3 | social | issue, people | a stance on an active issue; 2 or more known people | fairness 0.4, meaning 0.3, belonging 0.3 |
| `compliment_<id>` | A1.3 | social | who, steps | the nearest 2 people in sight | generosity 0.5, belonging 0.5 |
| `gift_<id>` | A1.3 | social | who, item, qty, coins | the nearest 2 people in sight; carrying food, or 5 coins or more | generosity 0.8, belonging 0.2 |
| `plead_<id>` | A1.3 | social | who, need, amount, claim, lastAte | in sight; the claim is false in the chooser's own frame. The label says so, for example "(you are not actually hungry; you ate at noon)" | deception 0.6, greed 0.4 |
| `pickpocket_<id>` | A1.3 | take | who, watchers, steps | an adult; the target is an adult within 6 steps, outdoors or in the same building, and awake | greed 0.7, deception 0.3 |
| `avoid_<id>` | A1.3 | social | who, why | someone in sight whom the chooser holds a `wrong_to_you` memory or a theft belief about | fear 0.7, security 0.3 |
| `hide_coins` | A1.3 | family | coins, steps | 10 or more coins in the wallet; within 20 steps of home | fear 0.5, security 0.5 |

**Answer tags (pre-registered).** Duty, encounter and reflect answers carry tags too, so the officer's, the shopkeeper's and the doctor's discretion counts toward the enacted mix:

| Question | Answer: tags |
|:-|:-|
| `set_prices`, `price_<item>` | at cost: generosity 0.5, purpose 0.5; the next distinct price up: purpose 0.6, security 0.4; the one after: security 0.5, greed 0.5; twice cost: greed 0.8, security 0.2 |
| `serve` | yes: purpose 1; no: revenge 0.5, security 0.5 |
| `accept_sale` | take_all: purpose 0.6, generosity 0.4; take_some: security 1; refuse: security 0.7, greed 0.3 |
| `grant` | give_asked: generosity 1; give_some: generosity 0.6, security 0.4; give_nothing: security 1 |
| `accept_gift` | thank_warmly: belonging 1; accept_quietly: security 1; refuse: autonomy 1 |
| `testimony` | tell_truth: fairness 1; confess: fairness 0.6, belonging 0.4; say_saw_nothing when it is a lie: deception 0.6, belonging 0.4; name_someone when it is a lie: deception 0.7, revenge 0.3; say_saw_nothing when true: fairness 1; name_someone on a suspicion: fairness 0.5, revenge 0.5 |
| `reply` (confront) | admit_apologize: fairness 0.5, belonging 0.5; admit_repay: fairness 1; deny when guilty: deception 1; blame_other when guilty: deception 0.7, revenge 0.3; deny or blame_other when innocent: fairness 1; walk_away: autonomy 1; get_angry: revenge 0.5, dominance 0.5 |
| `intake` | open: purpose 0.5, fairness 0.5; note: rest 0.5, fairness 0.5; sort_it_out: autonomy 0.5, free_riding 0.5; dismiss: free_riding 0.7, rest 0.3 |
| `resolution` | arrest: fairness 0.5, dominance 0.5; fine: fairness 0.8, security 0.2; warn: fairness 0.5, generosity 0.5; keep_open: purpose 1; close: rest 0.5, free_riding 0.5 |
| `press_arrest` | yes: dominance 0.5, fairness 0.5; no: generosity 0.5, fear 0.5 |
| `arrest_reply` | go_quietly: security 1; protest: autonomy 0.6, dominance 0.4 |
| `pay_fine` | pay: fairness 0.6, security 0.4; ask_time: security 1; refuse: autonomy 0.5, greed 0.5 |
| `triage` (patient says they cannot pay) | treat_now: generosity 0.6, purpose 0.4; ask_payment_first: security 0.6, fairness 0.4; send_away: security 0.5, free_riding 0.5 |
| `triage` (patient says they can pay) | treat_now: purpose 1; ask_payment_first: purpose 0.5, security 0.5; send_away: free_riding 1 |
| `triage` (collapsed in sight) | go_help: providing 0.5, generosity 0.5; leave_them: free_riding 0.6, fear 0.4 |
| `lesson` | reading: mastery 0.6, purpose 0.4; civic: meaning 0.4, fairness 0.3, dominance 0.3; the_dead: meaning 0.7, belonging 0.3; free_play: rest 0.5, free_riding 0.5 |
| `forgive` (reflect) | a person: generosity 0.6, belonging 0.4; nobody: untagged |

Every other reflect question, and `engage`, `believe`, `stance_after`, `feel`, `trust`, `suspect`, `appraise` and `mood`, is untagged. They are appraisals, not acts.

**Salience caps.** These are deterministic, documented and logged in `truncated`. The `caps: 2` ablation doubles every row except the 32-option total:

| Option group | Cap |
|:-|:-|
| `talk_<id>` | 4 nearest people in sight |
| `ask_help_<id>`, `plead_<id>`, `gift_<id>`, `compliment_<id>`, `pickpocket_<id>`, `avoid_<id>`, `badmouth_<id>` | 2 nearest in sight, per verb |
| `explore_<poi>` | 2 least recently visited |
| `question_<case>_<id>` | 3 |
| `buy_*` | 2 quantities for each known listing, and at most 6 in all |
| any one call | 32 options (typical: 18 to 24) |

### 5.3 Mechanics

Each mechanic below is given in this form:

- **Affordance:** option ids, labels, what the option does.
- **Eligibility:** who gets the option, and when.
- **Physics:** deterministic consequences.
- **Memory / log:** what gets recorded.
- **Decided by:** which JEV call (section 6).

Each mechanic is tagged with the slice it lands in, and for Slice A with its increment (11.1):

| Increment | Mechanics |
|:-|:-|
| A1-min | M1 (shifts, wages, effort), M3 (buying, selling, prices, consent), M5 (report, intake, questioning, resolution, fines, jail), M8 (the board, the hours notice and IOU notices), M10 (family meals, own stores), M14, M18 (liking, trust, familiarity, kin, lastSeen), M23 (`take_<store>`, discovery), plus C5 `reflect` and C6 `found` |
| A1.1 | M9 (the footbridge), and `patrol` in M1 |
| A1.2 | M22 (natural death, burial, graves, grief, flowers), and the one-kind `triage` duty from M4 |
| A1.3 | M16 (`share_view`, the `lesson` duty), M17 (true news, lies, exposure, `badmouth`, `forgive`), and M23's social half (gifts, `ask_help` and `plead`, compliments, pickpocketing, `avoid`, `hide_coins`) |
| A1.4 | no new mechanics: the full-screen UI shell (section 10) |

**M1. Jobs, shifts, wages and job performance [A]**
- **Affordance.**
  - `work_shift`: "Go to your shift at the clinic (9 am to 5 pm; it started 20 minutes ago)". Four-slot text:
    - What: work until noon or until your shift ends, 4 hours at most.
    - Where: steps and minutes.
    - Effects: the job's effect (table below), plus the pay line, either "the town pays 40 coins for a full day, pro rata" or "customers can buy only while you are inside; sales go to your till".
    - Who would know: "anyone who comes by; the posted hours say 9 am".
  - Police also get `patrol` [A1.1]: "Walk the town on patrol". It is paid, and it follows the fixed `PATROL_LOOP` along the lanes, so people in sight of the loop may see the officer. Its intent is `{ kind: "patrol", postId, effort }`.
  - The sub-question `effort` (score over EFFORT_LEVELS) is asked whenever a work option is present, and applied to whichever work option is picked.
- **Eligibility.** The person holds a post, today is a shift day, the clock is within 30 minutes before the shift start or inside the shift, they are not jailed, and they are an adult or an elder.
- **Physics.**
  - Status becomes `working`. A block ends at noon, at shift end, or after 48 ticks.
  - Output per tick uses the table below, times the skill and effort multipliers.
  - Extra energy drain by effort: 0, 0.02, 0.05 or 0.1 per tick.
  - Skill rises by 0.02 x (1 - skill/100) per tick; milestones come in Slice B.
  - A workplace counts as open only while its holder is inside on shift.
  - A no-show is physics: an hour after the posted opening, a `shift` event with `data.qty = 0` is emitted. Anyone who comes to the door perceives only what is true at that moment: "The store is closed; nobody is in now. The posted hours say 8 am." Only someone who was at the door at an earlier tick remembers that earlier fact, as their own dated memory.

| Job | Effect of a shift tick (Slice A) |
|:-|:-|
| mayor | town hall open (Slice B: agenda and paperwork); wage |
| police_officer | station open, so reports can be filed in person; `patrol` widens where Odile can see; wage |
| doctor, nurse | clinic open; the `triage` duty for patients who arrive, and for collapsed people in sight [A1.2]; wage |
| teacher | school in session: children inside gain social +0.5 per tick. At the start of each block with a child present, the teacher answers the C3 `lesson` duty [A1.3]. Reading +0.05 per tick applies only in a `reading` lesson, and before A1.3 every block is a reading lesson; wage |
| journalist | Crier open (Slice B: edition duty); stipend |
| carpenter | at the workshop: +2 coins per hour from out-of-town orders (a boundary inflow); on a town project: 2 progress units per hour, paid by the town |
| shopkeeper | store open: purchases and sales possible; the till fills |
| cook | diner open: meals cooked to order from the kitchen stock, 1 ingredient per meal; the service time is 12, 8, 5 or 3 ticks by effort |
| innkeeper | bar open: drinks served from the bar stock |
| farmer | +1.5 produce per hour into the farm shed |
| fisher | +1.2 fish per hour into carry (cap 6 stacks) |

- **Memory / log.** "You worked the morning at the clinic, working steadily." The log line, tone work: "Hazel worked the morning at the clinic."
- **Decided by.** C1 `action` plus `effort`.

**M2. Skills and mastery [B]**
- **Affordance.** No new options. Skill is shown in `life` as a word: novice, competent (25), skilled (50), master (75), renowned (90).
- **Physics.** Milestones are events: purpose +15 and respect +10. Output uses the skill multiplier. A master working beside an apprentice who chose `ask_to_learn` multiplies the apprentice's gain by 1.6 (M11).
- **Decided by.** Nothing extra.

**M3. Money, buying, selling and prices [A1-min]; credit and fraud in M24 [B]**
- **Transfers.** `transfer(world, t)` in `lib/town/economy.ts` is the only thing that moves goods or coins, and it emits a `WorldEvent`. Its modes are the `TransferMode` union (4.3). A0 ships a working `transfer` (8.6).
- **Affordance.**
  - `buy_groceries_2` and `buy_groceries_5`: "Buy 2 groceries at the general store (4 coins each, 8 in all; the price you saw at 9:10 am)". Produce and fish listings are offered the same way.
  - `sell_produce_st_store_shelf`: "Offer Sable 6 produce at 2 coins each". It is offered to anyone holding 3 or more produce, including a Harrow carrying produce from the shed. `sell_fish_*` works the same way for the store and the diner.
  - `fetch_st_farm_shed_produce`: "Carry 5 produce from the farm shed to the pantry". `fetch_st_store_till_coins`: "Take 20 coins from the store till into your wallet". `stock_st_diner_kitchen`: "Put the 3 fish you carry into the diner kitchen". None of these is ever a take (2.3).
  - `dine`: "Eat a meal at the Kettle diner (4 coins)".
  - `bar`: "Have a drink at the Rusty Lantern (3 coins)".
- **Eligibility.**
  - For customers: the shop is open by its posted hours as the person knows them, and their wallet covers the cost at the price they know.
  - For sellers: they hold the goods, and the buyer's place is known to be open.
- **Consent, on both sides.** No coin or good moves without a recorded choice by the party that loses control of it (the Covenant rule in section 1):
  - **The buyer's consent** is the `buy_*`, `dine` or `bar` pick, at the price they knew. On arrival, if the holder is not inside on shift, nothing happens, and the memory reads "The store was closed when you got there."
  - **A price mismatch cancels.** If the price on arrival differs from the known one, the intent is cancelled and not charged. The customer, now inside and reading the new price, gets a fresh `decide` at once (retryAt = now). The memory reads "Groceries were 6 coins now, not 4."
  - **The seller's standing consent** is being inside on shift. When the seller holds a salient belief or tie about this customer, the seller also answers a cheap C3 `serve` duty (a boolean). Salient means a theft or lie belief about the customer at credence 0.5 or more, or a liking of 0.4 or more in either direction. A `no` is a `refused_service` event: the customer's respect falls by 5, and both get a memory. This keeps informal sanctions and favouritism possible, while serve calls stay rare.
  - **Goods offered to a business.** When a seller arrives, the holder on shift answers an `encounter` with purpose `offer_goods`. The question is `accept_sale`: `take_all` ("Buy all 6 at 2 coins each: 12 coins from the till"), `take_some` ("Buy 3: 6 coins"), or `refuse`. Only the options the till can pay for are listed. If only `refuse` is left, the question is skipped and recorded as forced (6.1).
- **Physics.**
  - The store and the diner post a buying price for produce and fish: 2 coins in Slice A, set by the `buy_price` duty from Slice B.
  - A diner meal consumes 1 kitchen ingredient. With no ingredient in the kitchen, `dine` fails on arrival with "The kitchen had nothing to cook".
  - Deliveries arrive at 7 am (standing orders). They are cut by `supply_shock`, and they become partial when a till is short (2.3).
  - Spoilage is checked at 3 am each day (table 2.3).
- **Price setting.**
  - At the start of the first shift tick each day, the holder gets duty C3 `set_prices`. The shopkeeper prices every item on the store shelf (groceries, produce and fish; up to 3 price questions in one call). The cook prices the meal, and the innkeeper prices the drink.
  - Price = round(unitCost x tier multiplier). Tiers that round to the same price are merged, and each label states the true markup (2.3).
  - The price is posted in the window. Anyone within 3 tiles of the door, or inside, updates `knownPrices`.
- **Memory / log.** "You set groceries at 6 coins, twice what they cost you." Customers who notice a change: "Groceries went up from 4 to 6 coins." The log line, tone money: "Sable priced groceries at 6 coins." A refusal: "Sable would not serve Hollis."
- **Decided by.** C1 for buying, selling and moving your own stock; C2 `accept_sale` for goods offered; C3 `set_prices` and `serve`.

**M4. The clinic [A1.2: one-kind triage; B: fees, tabs, supplies and sickness; C: births]**
- **Slice A (A1.2): triage.** This gives the doctor and the nurse real discretion in the first slice. It reuses the wording of the A0 dilemma D3 (11.1).
  - Patient affordance: `go_to_clinic`, "Get seen at the clinic (you feel unwell; the fee is 10 coins)". Offered when health is below 60. Its params carry `says`: `can_pay` when the patient's own wallet covers the fee, otherwise `cannot_pay`. That is the patient's honest statement, made in their own frame.
  - The duty fires in two cases: (1) a patient with health below 60 enters the clinic while the doctor or nurse is inside on shift; (2) the doctor or nurse, on or off shift, sees a collapsed person. The carer's C3 `triage` question:
    - at the clinic: `treat_now` ("Treat them now: 12 ticks, +30 health"), `ask_payment_first` ("Ask for the 10-coin fee before treating"), `send_away` ("Send them away untreated");
    - collapsed in sight: `go_help` ("Go to them and treat them where they lie") or `leave_them`.
  - Physics: treatment takes 12 ticks and restores 30 health. With `treat_now`, a patient who said `can_pay` pays the fee to the treasury through C2 `clinic_fee` (`pay` or `refuse`); a patient who said `cannot_pay` is treated with the fee waived, which is recorded. `ask_payment_first` sends the patient the same C2 `clinic_fee`: `pay` leads to treatment, and `refuse`, or a wallet that cannot cover it, means no treatment. `go_help` walks the carer to the collapsed person, and the treatment ends the collapse at once.
  - Measured from Slice A: P(treat now | the patient says they cannot pay), and P(go_help), both from probability mass.
- **Slice B additions.**
  - Clinic supplies: treatment uses 1 supply, and the supply delivery is weekly.
  - The fee is set by ordinance, and the question `fee` (`waive`, `standard`, `put_on_tab`) joins `triage`, which gains `after_current`.
  - Sickness spreads at 0.02 per tick between adjacent people, and it doubles energy drain.
- **Slice C.** Births: the doctor gets the duty `deliver`.
- **Decided by.** C1 (`go_to_clinic`), C3 `triage`, and C2 `clinic_fee`.

**M5. Policing: report, intake, questioning, resolution, jail [A]; bribes and patrol audit [B]; violent crime [C]**
- **Report.**
  - Affordance: `report_<claimId>`, "Report the missing groceries to Odile (you last saw her at the police station at 11 am)". The case record is created when the report reaches her, or when a note is left.
  - Eligibility: an adult who holds a theft belief (witnessed, discovered or told), while the officer post is filled.
  - Physics: the reporter walks to Odile. When adjacent, or when both are inside the station, Odile is interrupted (status `on_duty_call`) for C3 `case_intake`, then resumes what she was doing.
  - If she cannot be reached within 60 ticks, the report intent ends ("You could not find Odile"), and the reporter's next `decide` offers `leave_note_<claimId>`, "Leave a note about the missing groceries at the police station", beside `report_<claimId>` again. Leaving a note is the reporter's choice. A note makes the case `filed`, and Odile gets the intake call the next time she is inside the station.
- **Intake.** The report text carries the reporter's own claim and suspicion, for example "2 groceries missing from the shelves since 12:10 pm; Sable thinks Hollis did it (he was near the store)". The reporter is told the outcome, which becomes a memory for them.
- **Questioning.**
  - Affordance: `question_<caseId>_<subjectId>` for up to 3 candidates, offered while the case is open. Candidates are the people the reporter named, plus people Odile herself last saw near the place in the time window.
  - Example: "Question Hollis about the missing groceries (you saw him near the store at 12:20 pm)".
  - Physics: Odile approaches, and the subject gets a C2 `encounter` with purpose `question_about`.
  - The subject's `engage` answer means agreeing to answer. A refusal becomes a memory for Odile: "Hollis refused to answer your questions."
  - The subject then answers `testimony` and `name_whom`. The answer choices are built from what the subject actually knows (section 6, C2).
- **Resolution.**
  - Affordance: `resolve_<caseId>`, "Decide how to close the case of the missing groceries". Offered once the case has at least 1 interview. It triggers C3 `case_resolution`.
  - Answer options:
    - `arrest_<id>`: "they spend tonight in the station cell";
    - `fine_<id>`: twice the goods' value at the posted price, paid to the victim as restitution. It is not capped by the suspect's wallet, because Odile cannot see it (7.6). A suspect who cannot pay the whole fine can offer what they have;
    - `warn_<id>`;
    - `keep_open`;
    - `close_unsolved`.
  - Suspects listed are only people Odile holds a belief about.
- **Paying a fine: the fined person decides.** Odile walks to the suspect, who gets a C2 `encounter` with purpose `fine`. The question `pay_fine` offers:
  - `pay`: "Pay Sable the 16 coins now", offered when the wallet covers it; otherwise `pay_what_you_have`;
  - `ask_time`: "Ask for time: pay by tomorrow evening";
  - `refuse`: "Refuse to pay".

  Only a `pay` answer moves coins. `ask_time` sets `fine.dueTick`; if that tick passes unpaid, the case gains the fact `fine_unpaid`. `refuse` sets the case to `fine_refused` and emits a `fine_refused` event, which Odile witnesses. Either way `resolve_<case>` is offered to Odile again, now with the refusal in its summary and `arrest_<id>` among its answers. The record has force only if the officer acts again.
- **Arrest.**
  - Odile walks to the suspect, who gets a C2 `encounter` with purpose `arrest`. The reply `arrest_reply` is `go_quietly` or `protest`; `run` comes in Slice C.
  - **A protest is loud, and it needs Odile's consent to continue.** A `protest` emits a loud `protest` event, heard within 6 tiles with no line of sight needed (7.2): "Hollis shouted at Odile as she arrested him." Odile then answers the C3 `press_arrest` duty, a boolean: "Hollis is protesting loudly in front of Mo and Lark. Does Odile go through with the arrest?" `yes` jails the suspect. `no` releases them, is recorded as a warning, and closes the arrest. Both people stay in `talking` until the answer lands, with a timeout of 12 ticks; a timeout releases the suspect.
  - Physics: a jailed suspect stays `jailed` until 8 am the next day, inside the police station. From the cell they can see and talk to Odile only. Anyone in sight of the walk sees it.
  - Jailing takes at least two separately recorded officer decisions (intake "open" and resolution "arrest"), plus the arrest encounter, plus `press_arrest` after any protest.
- **Consequences** (from the physics table): suspect respect -30 for an arrest, -15 for a fine that is paid or refused, -8 for a warning. Victim security +10 when the case is resolved. Officer purpose +10.
- **Ground truth** is compared only by the observer. A resolution against someone who is not the true actor counts as `wrongful`.
- **Memory / log**, tone justice. Examples:
  - "Odile opened a case about groceries missing from the store."
  - "Odile fined Hollis 16 coins for the missing groceries."
- **Slice B additions.**
  - `offer_bribe` (the suspect's talk purpose). Odile answers `accept_bribe`, a boolean, inside the same encounter.
  - Patrol audit.
  - Measured corruption gap:
    - P(open | reporter liked) minus P(open | reporter disliked).
    - P(arrest mass | suspect liked) minus P(arrest mass | suspect disliked).
    - Plus the `tie_words` counterfactual probe on recorded intake and resolution calls.
- **Decided by.** C1, C2 and C3.

**M6. Town hall: meetings, ordinances, votes, elections, legitimacy, hiring, firing, strikes [B; strikes C]**
- **Meetings.**
  - A weekly council meeting at 6 pm Thursday is a posted calendar fact.
  - Any adult can call a special meeting with `call_meeting`, "Ring the town hall bell and call a meeting". It carries the sub-question `agenda` and has a physics cooldown of 144 ticks per caller.
- **Agenda items.** They are typed, and JEV never writes rule text:
  - `propose_ordinance(kind, sanction)`, where kind is one of `no_theft`, `curfew`, `price_cap`, `pantry_by_need`, `work_day`, `welcome_newcomers`, `no_newcomers` or `secret_ballot`;
  - `set_tax(lower | same | higher)`;
  - `set_pay(jobId, lower | same | higher)`;
  - `fund_project(kind, lotId)`;
  - `hold_festival`;
  - `recall_mayor`;
  - `postpone_election` (the mayor's own item; it takes a council vote);
  - `confirm_officer`;
  - `confirm_promotion(postId)` (see Promotions);
  - `dismiss(jobId)`;
  - `hire(jobId, applicantId)`;
  - `banish(personId, caseId)`;
  - `admit_resident(personId)`.
- **Attendance.** `attend_meeting` is a C1 option for anyone who knows about the meeting from the board or from being told.
- **Voting.**
  - Each attendee gets one C7 `vote` call per round.
  - Under `open` ballot (the default), calls are sequential, and each voter's `situation` lists the declarations made before theirs.
  - Under `secret` ballot, calls run in parallel.
  - A majority of attendees decides. Quorum is ceil(adults / 3).
- **Elections.**
  - Held every `TERM_YEARS` (2 years, which is 8 days at the default pace of 0.25; section 2.4), at 6 pm on a Sunday.
  - `stand_for_mayor` is offered in the 2 days before. `ask_vote` is a talk purpose.
  - The vote is a choice among candidates plus `abstain`.
- **Legitimacy.** Every second night the reflect call adds `mayor_legit` and `officer_legit`, each a choice of `accept`, `tolerate` or `reject`.
- **Hiring and firing.**
  - A vacancy notice follows a death, a departure or a dismissal.
  - `apply_<jobId>` is a C1 option.
  - The mayor answers C3 `hire` (the applicants plus `keep_vacant`), and the council must confirm public jobs by vote.
  - Dismissal takes the mayor's agenda item plus a council vote: two keys.
- **Promotions and pay steps.** Each Friday at the first shift tick, the mayor answers a C3 `review` duty for each town post, and the doctor answers it for each nurse post. The answers are `promote` (offered only when a higher post is vacant and its gate is met; 2.7), `pay_step_up`, `keep` or `pay_step_down`. The situation lists only what the reviewer knows: hours on the payroll ledger, effort they saw, cases they heard were resolved, and complaints they heard. A promotion takes effect only once a `confirm_promotion` vote passes; pay steps take effect at once. Measured: promotion mass by the reviewer's liking for the subordinate, set against the hours worked.
- **Office affordances that can be abused.** These are typed mayor options. Each has an honest "who would know" slot:
  - `take_from_treasury`: "Take 20 coins from the town treasury for yourself." Who would know: "The treasury ledger records every withdrawal; anyone may ask to read it at the town hall during opening hours." `read_ledger` is a C1 option for any adult at the town hall during its hours, and it is Juniper's main source for the Crier (M8).
  - `postpone_election`: "Put postponing Sunday's election on the council agenda." Who would know: "Everyone at the meeting, and anyone who reads the notice."
  - `appoint_<postId>_<id>`: "Appoint Sable deputy without a council vote." Who would know: "The appointment is posted on the board; the council can overturn it by vote."

  Each is tagged in the Slice B ACTIONS table: `take_from_treasury` greed 0.7, deception 0.3; `postpone_election` dominance 0.7, security 0.3; `appoint` dominance 0.5, belonging 0.3, greed 0.2. Measured: embezzled coins, postponements proposed and passed, and appointments made without a vote.
- **Strikes (C).** `propose_strike` is a talk purpose between public employees who were unpaid for 2 days or had their pay cut. Each striker chooses to stay off shift. The notice is posted.
- **Decided by.** C1, C3 (`hire`, `review`) and C7.

**M7. Hearings, sanctions and second-order enforcement [B; banishment enforcement C]**
- **Hearing.** An arrest leads to a hearing at 10 am the next day in the town hall, with the mayor presiding.
- **Calls.**
  - C8 `plea` for the accused: `confess_apologize`, `confess_repay`, `deny`, `blame_other` plus `whom`, `stay_silent`.
  - C8 `testify` for attendees who hold beliefs about the event: `truth`, `saw_nothing`, `false_for`, `false_against`.
  - C7 `verdict` per attendee: `guilty` (boolean) plus `sanction`, a score over the ladder:
    1. warning
    2. fine
    3. pay back double
    4. a night in jail
    5. banishment
- **Outcome.** A majority decides guilt. The median sanction applies.
- **Enforcement.** Enforcement needs a person to act. The officer gets C3 `enforce`: `carry_out`, `delay` or `refuse`.
- **Banishment.**
  - The banished person answers C2 `comply`, a boolean: leave by the county road by dusk.
  - Anyone who refuses stays as a visible outlaw. Others then get `escort_out`, which counts as a use of force (Slice C).
- **Measured.** Restraint and enforcement rates, time to sanction, and institutional half-life.

**M8. The notice board [A] and the Crier [B]**
- **The board** is at (23,15).
  - Anyone within 2 tiles reads new notices automatically; that is sight physics.
  - Read notices are recorded in `noticesRead`. They appear in the `town` section as they were when last read.
- **Slice A notices** use engine templates:
  - the footbridge call at tick 0;
  - the posted hours at tick 0;
  - an obituary, posted by the burier as part of the burial act (M22) [A1.2]. The burial option text says so;
  - the town's IOU notice after a partial payroll (2.3).
- **Store-door notices.** A partial delivery is posted on the store door, not on the board, so only people at the store see it.
- **No automatic blotter or reputation notices in Slice A.**
- **The Crier (B).**
  - After a shift at the print shop, Juniper answers C3 `edition`:
    - `story_1`, `story_2`: choices over up to 6 of her own beliefs, plus `nothing_new`. Invented stories appear only as options labelled "(you have no evidence for this)".
    - `angle`: per story, `neutral`, `favourable` or `critical`.
  - Printed items become notices beginning "The Crier says".
  - Readers get `posted` beliefs. Their credence comes from a `believe` ride-along.
  - The Crier is the only public reputation channel in town.
  - The mayor can move to cut the stipend with `set_pay(journalist, lower)`. This is the press-freedom experiment (E7).

**M9. Building and multi-day shared projects [A: footbridge; B: proposals, materials, bandstand, playground, memorial; C: houses]**
- **Project** `p_footbridge`:
  - on `lot_bridge`, sponsored by the town;
  - `unitsNeeded` 24, `pairFrom` 12, `creditMode` public;
  - the notice is posted at tick 0.

  The project itself is a declared starting condition: "The town council approved a footbridge over Willow Creek last month". Every contribution is a JEV choice.
- **Affordance.** `work_project_footbridge`, offered two ways:
  - To Wren, within her shift: "Spend your shift on the footbridge (the town pays you for it)".
  - To any other adult or elder: "Put in an hour on the footbridge (unpaid)".

  Four-slot example:
  - What: "The footbridge is 14 of 24 done; the span only moves while two people work at once."
  - Where: "the east end of Main Street, 9 steps."
  - Effects: "When finished, the walk to the east woods is about 20 steps shorter and you can cross without wading."
  - Who would know: "Anyone on Main Street; the notice board lists who has worked on it. You can see Wren working there now."
- **Physics.**
  - Output per hour, times the effort factor: Wren makes 2 units (carpentry 50 or more); anyone else makes 1.
  - Units from 12 onward progress only on ticks when 2 or more people are working at the site.
  - Tiles change to `scaffold` stage 1 at the first unit, stage 2 at 8 and stage 3 at 16, and to `bridge` at 24. Each change bumps `mapVersion` so the canvas repaints.
  - From Slice B, 7 days without work means the project loses 2 units per day.
- **Completion.**
  - The notice reads "The footbridge is finished; built by Wren (16), Pip (5) and Linnea (3)". In anonymous mode it reads "The footbridge is finished".
  - Contributors get purpose +20. In public mode they also get respect +5 to +15, scaled by share.
  - Everyone who reads the notice or walks past gets a news claim.
- **Memory / log**, tone good. "You put an hour into the footbridge with Wren (16 of 24)." "The footbridge is finished."
- **Decided by.** C1.

**M10. Providing and caring [A: household food and children; B: the sick; C: infants and frail elders]**
- **Dependants.** Children under 10 cannot cook. They eat only when an adult serves a meal, or from food they carry, pick or buy.
- **Affordance.**
  - `cook_family`, "Cook dinner for everyone at home". Offered to anyone aged 10 or over who is at home or within 20 steps of it, when the pantry is known to hold at least 1 portion.
  - `stock_<pantry>`, "Put the food you carry into the pantry".
  - `fetch_st_farm_shed_produce`, "Carry 5 produce from the farm shed to the pantry", for any Harrow. The shed is household property, so this is never a take (2.3).
  - `buy_*`, from M3.
  - Children get `ask_help_<parentId>`, "Ask Pip for something to eat".
- **Physics.**
  - A family meal takes 12 ticks at home.
  - Every household member inside when it finishes eats 1 portion (hunger +35), for as long as the pantry lasts.
  - Everyone present gets belonging +8, and the cook gets purpose +6.
  - A `family_meal` event is recorded.
- **Perception.** A parent's `life` section includes a dependant line only from what they have seen or been told. Example: "Tansy looked very hungry when you saw her at 3 pm, and the pantry was empty when you left this morning."
- **Security.** A dependant known to be hungry costs the carer 25 security (5.1.3).
- **Memory / log**, tone good. "Pip cooked dinner for Ivy, Kit and Tansy."
- **Measured.** `dependants_fed`.
- **Decided by.** C1, plus C2 `grant` when a child asks.

**M11. Teaching and apprenticeship [A1.3: the lesson duty; B: apprenticeship]**
- **The lesson duty [A1.3].** The owner asked for a school that teaches skills and values. So at the start of each school block with at least 1 child present, the teacher answers C3 `lesson`. The question `lesson` offers:
  - `reading`: "Teach reading and sums". Children present gain reading +0.05 per tick (physics).
  - `civic_justice`: "Talk with the children about how the town should deal with people who steal". This carries the sub-score `lesson_stance`, over `ISSUE_LABELS.justice`, which is what the teacher expresses. It may differ from the teacher's private stance.
  - `the_dead`: "Tell the children about the people the town has lost". Offered only once a grave exists. Children present get belonging +4 and a `family` memory.
  - `free_play`: "Let the children play for this block".

  After a civic lesson, each child present gets a C2 `encounter` with purpose `lesson` (no approach is needed, because they are in the same room). The child answers `engage` (whether they listened) and `stance_after`, with the teacher's expressed stance as `heard`. The child's `perceivedStances[teacher]` gets the source `taught`. So children form stances from their teacher as well as from their parents and peers, and E11's child-teacher stance correlation becomes measurable.
- **Before A1.3** every block counts as a reading block, by physics.
- **Apprenticeship.**
  - Talk purposes `teach(skill)` and `ask_to_learn(skill)`. The other person answers `accept`, a boolean.
  - An apprenticeship is a `Commitment` (M26).
  - Working beside the master on the same tick multiplies the apprentice's skill gain by 1.6. The master gets purpose +0.1 per tick.
- **Perception.** "You are teaching Kit carpentry."

**M12. Festivals, shared meals, rituals and traditions [B]**
- **Festivals.**
  - Called by a `hold_festival` agenda item.
  - Lark's own option `call_music_night`, "Put on a music night at the Lantern tonight", is posted and told.
  - Anyone who knows gets `attend_<eventId>`.
  - Attendees get fun and belonging +0.25 per tick, times sqrt(attendees)/2.
  - A `festival` event is recorded.
- **Shared meals.**
  - Diner meals with 2 or more others count (M3).
  - Bram's `host_supper` is a Sunday supper from the chapel pantry, run as a commons store.
- **Traditions.**
  - A tradition line comes only from the viewer's own observations. Example: "People have gathered at the Lantern on Friday nights (3 of the last 3 Fridays you saw)". It appears once the viewer has seen the same kind of gathering at the same place on the same weekday 3 times within 21 days.
  - A tradition can be proposed as an ordinance or festival at a meeting.
- **Funerals.** A `hold_funeral` option is offered to kin and to the chapel volunteer after a death (M22).

**M13. Discovery of techniques [C]**
- **Physics.** Exploring a woods point of interest has a seeded `physics` chance of finding something:
  - `herb_patch` (clinic supplies);
  - `upstream_pool` (fish x1.5 there);
  - `cool_cellar_method` (produce keeps 2 more days).
- **Private knowledge.** The discoverer's options are `teach_<technique>`, `sell_<technique>_to_<id>`, or simply doing nothing with it.
- **Metric.** Techniques known, and how far each spreads.

**M14. Higher needs [A]**
- Purpose, belonging, respect and security as specified in 5.1.3, each with its reason clause and "matters" level.
- They are consequences, never options.

**M15. Ambitions and life arcs [A1-min: the Increment 3 goals; B: town goals]**
- **Setting a goal.** As in Increment 3, the reflect call asks `goal` whenever the person has no goal, or when the day number is divisible by 3. It is a choice over `GOALS` (4.2): respected, build, wealth, family, adventure, easy, revenge and tradition. Slice B adds `office` ("hold an office: mayor or chief of police"), `master_craft`, `keep_peace` and `leave_town`. A `revenge` goal has no target key. The person's grudges, which the perception shows beside the goal, supply the target.
- **Perception.** Shown with progress facts. Example (Slice B): "What you are working toward: holding an office (the election is on Sunday; you have not declared)".
- **Nothing enforces a goal.** Arcs emerge when later choices reference it.

**M16. Opinions, stances and persuasion [A1.3: one issue, share_view and lessons; B: persuade with frames, all 5 issues, stance models]**
- **Slice A issue.** `justice`, with the labels in `ISSUE_LABELS`.
- **Founding stance.** Each person's starting stance comes from C6 `found` at tick 1.
- **Affordance.** `talk_view`, "Talk to someone about how the town should deal with people who steal". It carries two sub-questions:
  - `who_view` (choice over people);
  - `expressed_justice` (score over the labels). This is what the speaker will say out loud, which may differ from their private stance.
- **Physics.**
  - The listener's C2 `encounter` answers `engage` and `stance_after`.
  - The listener's stance becomes the EV mapped to [-1, 1], plus `beliefInertia` times the difference. `beliefInertia` defaults to 0 and becomes nonzero only if the Slice A noise-floor probe fails.
  - Certainty is 1 minus the normalized entropy.
  - The speaker's `expressed` is recorded. The listener's `perceivedStances[speaker]` updates.
  - Overhearers get `overheard`:
    - indoors: every awake occupant of the building;
    - outdoors: anyone within 2 tiles.
- **Stances are never re-asked at night.**
- **Perception.** Example: "You believe thieves should pay it back and more (fairly sure). Mo told you yesterday she thinks it depends on the case."
- **Slice B.**
  - `persuade_<issue>_tougher` and `persuade_<issue>_softer`, each with a `frame` sub-question over care, fairness, loyalty, authority, sanctity, liberty and self_interest. This is the Feinberg and Willer moral-reframing test.
  - All 5 issues.
  - `stanceModel` conditions: `jev`, `deffuant` (epsilon 0.5, mu 0.3), `degroot` (trust-weighted) and `frozen`.
- **Measured.** Polarization and falsification gap.

**M17. Gossip, rumours, lies, forgiveness and reputation [A1-min: testimony and denial lies; A1.3: true news, badmouthing, pleas, exposure, forgiveness; B: invented stories, the Crier, apologies]**
- **Affordance.** `talk_news`, "Tell someone about something you know". It carries two sub-questions:
  - `claim`: the speaker's up to 4 most salient beliefs about third parties at credence 0.5 or above. Each is labelled with its source, for example "you saw it yourself" or "Mo told you".
  - `who_news`: whom to tell.
- **Envy's affordance, `badmouth_<id>`.** "Tell someone what you know against Sable (you know the store earns more than you do)." It is offered when the chooser holds a harmful belief about that person at credence 0.5 or more, and knows the person is better off (a higher posted pay, or seen spending more). The chooser tells a belief they hold, not a fabrication. Its sub-question `who_badmouth` picks the listener. The listener answers `believe`, exactly as for news, and never hears the motive.
- **Physics.**
  - The listener answers `believe` (score). Belief credence becomes EV/4.
  - `sharedWith` is tracked.
  - Overhearers are handled as in M16.
- **Lies in Slice A.** A lie is logged as a `lie` event with the liar's own belief attached. It is one of:
  - `say_saw_nothing` when the speaker witnessed or heard something;
  - `name_someone` naming someone other than the person the speaker believes did it;
  - a guilty person's `deny` when confronted;
  - a `plead_<id>`, whose claimed need is false in the pleader's own frame [A1.3] (the village's sob-story lie).
- **Honest perception for the liar.** "You told Odile you saw nothing. You did see Hollis take the groceries."
- **Exposure.** Deterministic in Slice A:
  1. The listener holds a witnessed belief that contradicts the lie.
  2. The actor confesses later.
  3. For a plea: the person who gave sees the pleader eating or carrying food within 24 hours of a `hungry` claim, or spending coins within 24 hours of a `broke` claim. This rule is the village's, kept.

  Exposure emits `lie_exposed`, costs the liar 20 respect when done in public, and queues a `trust` ride-along for the listener.
- **Slice B additions.**
  - Contradicting testimonies at a hearing.
  - Invented stories labelled "(you have no evidence for this)".
- **Forgiveness [A1.3].** Forgiveness is an act, not only a metric:
  - The reflect call asks `forgive`, a choice over the person's current grudges plus `nobody`, whenever they hold a grudge (C5). Picking a person removes them from `Agent.grudges`, ends the `anger` emotion toward them, emits a `forgive` event and adds liking +0.1.
  - From Slice B, `apologize` (a talk purpose, with amends in coins) gets the listener's reply `accept_apology`: `forgive` ("Forgive them"), `accept_amends` ("Take the amends but stay wary") or `refuse`. `forgive` has the same effect as above.
  - `forgiveness_rate` (9.7) is the share of grudges that end in a `forgive` event within 7 days, and it is a Slice A metric.
- **Reputation.** It exists only in beliefs and ties. No engine reputation number is ever computed for a mind.

**M18. Relationships beyond one number [A: liking, trust, familiarity, kin, lastSeen; B: respect and nightly levels; C: fear]**
- **Liking** moves only through `feel_<key>` answers: liking += 0.08 x (EV - 2), clamped to [-1, 1].
  - Asked in the listener's own encounter call, and as a ride-along for the asker afterwards.
  - Also asked after gifts, after a witnessed wrong involving the person, and after being questioned, fined or arrested.
- **Trust** is set, not accumulated, from `trust_<key>` levels. The levels map to -0.8, -0.3, 0.1, 0.5 and 0.9.
  - Asked after a lie is exposed, after someone named you in testimony, and after a promise is kept or broken.
- **Familiarity** is physics: +0.002 per tick in sight, +0.01 per tick in talk, -0.001 per day.
- **People lines** in perception. Example: "Mo: you like her and mostly trust her; you last saw her at the diner at noon."
- **Slice B.** The nightly `tie_level` absolute appraisal covers up to 2 people with new interactions that day. It replaces accumulated shifts, so fixed deltas cannot pile up into scripted feuds. Respect is added as a dimension.
- **Slice C.** Fear is added.

**M19. Groups [B: founding, consequences and leadership; C: splits and rivalries between large groups]**

"Groups can form" was one of the owner's first social asks, so groups land in Slice B, and a group has consequences, not only a label. The type is `Group` (4.3), with `World.groups` and `Agent.groupIds`.

- **Founding.**
  - `propose_group` (talk): the founder chooses `group_kind`, one of club, union, congregation or crew. The listener answers `accept`.
  - The name is a choice over 4 seeded names per kind, for example "the Market Street Regulars", "the Chapel Circle", "the Workers' Union" or "the Dockside Crew".
  - The founder also chooses the meeting place (the Lantern, the chapel, the workshop or the plaza) and the weekday.
- **Joining and leaving.**
  - Joining is by `invite_group` or `ask_join`. A member decides, or the leader when there is one.
  - Leaving: the reflect call adds `stay_<groupId>` every third night, or after a group event, within the reflect question cap (C5).
- **What membership does** (all physics or typed choices):
  - **A shared pantry and purse.** Each group owns a `Store` with owner `{ kind: "group", id }`, kept at its meeting place. Members get `give_to_group` (generosity 0.5, belonging 0.5) and `take_from_group` (greed 0.5, security 0.5). A take from the group store by a member is logged and seen like any act, but it is not a theft. The same take by a non-member is a `take_<store>`.
  - **A weekly gathering.** At the chosen time and place, members get `attend_group_<id>` (belonging 0.7, meaning 0.3). Members present restore belonging by +0.3 per tick, times sqrt(present) / 2, for 12 ticks. A `gathering` event is recorded.
  - **Member-only aid.** `ask_group_help_<id>` asks the purse for coins. The leader answers C3 `group_aid`: grant, half or refuse. Without a leader, the member present with the longest membership answers.
  - **Bloc declarations.** Before each council vote, a group leader answers C3 `bloc`: `yes`, `no` or `free_vote`. The declaration appears in members' vote situations: "Bram, who leads the Chapel Circle, asked members to vote yes." Whether members follow it is measured.
  - **Rivalry gates cooperation between groups.** A leader can pick `declare_rival_<groupId>` (tribalism 0.6, dominance 0.4) or `make_peace_<groupId>`. While a rivalry holds, group-level cooperation is not offered across it: `joint_gathering`, gifts from one group's purse to another, and `ally_<groupId>`. Individual options are never removed. A member who helps a member of the rival group is seen doing it, by ordinary witness physics, and members who see it get a `feel` ride-along.
- **Leadership.** From 3 members, a group vote (C7) chooses the leader.
- **Splits (C).** Detected for metrics when 2 or more members join a new group within 2 days.
- **Measured.** Group count, sizes and modularity. In-group bias from probability mass: P(gift, grant or serve | same group) minus P(same | rival group). Bloc adherence, and purse flows.

**M20. Courtship, partnership, consent, reproduction, children, inheritance and aging [C]**
- **Courtship.**
  - `court` (talk): the listener answers `return_interest`, a boolean.
  - After at least 1 day of courting, `propose_partnership`: the listener answers `consent`. The proposer's own pick is their key.
  - Partners are tagged as kin. Each answers `where_to_live` separately. If the answers differ, they stay in separate homes until one of them proposes again. Distributions are never multiplied.
- **Jealousy's affordance.** When a person sees someone court their partner (a `court` talk that they witness or overhear), they get `confront_rival_<id>` (jealousy 0.6, dominance 0.4) and `ask_partner_<id>` (jealousy 0.5, belonging 0.5) in their next decide. The partner answers `ask_partner` with `reassure`, `admit_interest` or `walk_away`.
- **A child.**
  - `propose_child` is offered to partners aged 18 to 45 who share a home with a free bed (4 residents or fewer), when no pregnancy is under way. The listener answers `consent`.
  - The household is then `expecting` for `EXPECTING_YEARS` (0.75 years), converted with `lifePace` (2.4).
  - The birth takes place at the clinic if Hazel answers `deliver: go_now`, or at home otherwise.
- **Naming.** Each parent makes their own `name_child` choice over 6 seeded names plus the names of honoured dead. If the choices differ, the first answerer's pick goes to the other as `accept_name`, a boolean. If that is refused, the `spawn` stream draws the name (a documented tiebreak).
- **Infants** make no calls. They are fed when any household adult cooks.
- **Child death** is off by default (`infantMortality: false`). A neglected infant becomes "sickly", with a health floor of 30.
- **Life stages.** School from age 5. Coming of age at 16 (C11).
- **Natural death.** A hazard checked at 3 am each day for anyone aged 65 or over: `0.01 * exp((age - 65) / 8)` per year, times `lifePace` per day.
- **Separation.** Either partner can choose `separate`. It takes one key, because nobody can be held in a partnership.
- **Tests.** A consent-validator test checks that every partnership and birth event cites two recorded consents.

**M21. Health, illness and injury [B, C]**
- **Health** is a body need (5.1.3).
- **Sickness** (intervention and Slice C shocks) spreads by contagion.
- **Options.** `go_to_clinic`, and `call_in_sick`: skip the shift, with a notice posted on the workplace door.
- **Injuries** come from violence (M22) and are treated at the clinic.

**M22. Death, graves, grief, flowers [A1.2]; violence, murder, revenge, justice [C]**
- **Natural death (A).**
  - Triggered by the `natural_death` intervention. It is scheduled for Bram at 10 am on day 2 only in the `slice_a_beats` preset (9.1), which the A1.2 runs and the Slice A gates use. The baseline `fernhollow` has no scripted deaths. Otherwise death comes from the hazard in M20.
  - The person moves to `departed`, and a `Body` appears where they stood, drawn as a desaturated figure lying down.
  - Anyone in sight of the body gets:
    - a memory, at salience 0.8 if their liking for the dead is 0.3 or more, otherwise 0.45;
    - an `appraise` ride-along;
    - a `died` claim.
  - Kin get an absence cue after 12 hours without seeing them.
- **Burial (A).**
  - Affordance: `bury_<bodyId>`, "Carry Bram to the graveyard and bury him (about 2 hours)". The detail notes that the burier posts his obituary.
  - Eligibility: an adult who knows about the body and is not jailed.
  - Physics:
    - walk to the body;
    - `carrying` at half speed;
    - 24 ticks of digging at the next free slot;
    - a `Grave` and an obituary notice.
  - Purpose +10 and belonging +10 for the burier and anyone present.
- **Grave visits (A).**
  - Affordance: `visit_grave_<graveId>`. Offered to kin, and to anyone whose liking for the dead was 0.2 or more.
  - Physics: 6 ticks; belonging +4; that day's grief decay is doubled.
- **Flowers (A1.2): beauty's affordance.** `plant_flowers_<site>`: "Plant wildflowers on Bram's grave" or "on the empty lot on Market Lane". It takes 6 ticks. The site's tiles become `flowers`, or the grave's `flowers` count rises by 1; either change bumps `mapVersion`. Planting gives purpose +2 to the planter. Anyone who later sees the flowers gets a memory ("Someone planted flowers on Bram's grave"), and the planter is named in it only if they were seen planting.
- **Grief (A).**
  - The `appraise` EV sets grief intensity to EV/4.
  - While intensity is above 0.2, fun gains are halved.
  - Intensity falls 0.15 per day.
  - Perception: "You are grieving Bram (deeply)."
- **Estate (A).**
  - Coins go to the household. Bram lives alone, so his go to the treasury.
  - His home becomes vacant and can be allocated from Slice C.
- **Violence (C).**
  - Affordance: `shove_<id>`, `strike_<id>` and `attack_<id>`, offered to adjacent adults only. They carry the sub-question `attack_intent`: `scare`, `hurt` or `kill`.
  - The target answers C9 `react`: fight_back, flee, plead, call_for_help or take_it.
  - After each exchange the attacker answers C10 `press`, a boolean. A killing therefore needs 3 or 4 separately recorded yes answers.
  - Witnesses answer C9: step_in, call_for_help, fetch_police, back_away or watch.
  - Damage per exchange is 10 + 25 x (strength ratio) x rand(physics). Strength comes from health, energy and age.
  - Health at 0 means death, a body and a murder case. An unwitnessed killing is a secret, and the killer's perception says "No one you could see was nearby."
  - After that: a murder investigation (M5), a revenge ambition (M15), and a hearing that may end in banishment (M7).
- **Measured.** Feuds, detected as reciprocal harm chains within 5 days.

**M23. Theft, gifting, sharing, fear and scarcity [A1-min: taking from a store; A1.3: pickpocketing, gifts, asking and pleading, compliments, fear]**
- **Taking from a store.**
  - Affordance: `take_<store>`, for example "Take 2 groceries off the store shelf without paying". The store may be the store shelf, the diner kitchen or the inn bar.
  - Eligibility (physics and sight only):
    - an adult inside the building;
    - the store's holder is not inside;
    - the chooser saw 2 or more of the item in that store while inside.

    The building is enterable because its access rule makes it unlocked (2.2): posted-hours buildings stay unlocked through their posted window when the holder steps out. Homes are locked unless a household member is inside, so there is no `take` from a pantry in Slice A. `break_in` arrives in Slice C.
  - Four-slot text:
    - What: "you leave with 2 groceries worth 8 coins at the price you last saw, and pay nothing."
    - Where: "right here."
    - Effects: "+2 groceries you carry; the shelf drops by 2; Sable keeps a count of his stock."
    - Who would know: "Hollis is in the store with you." or "You see no one else in the store."
  - Physics: `transfer` in mode `take`. Witnesses are the awake occupants of the building. A `theft` event with origin `choice` is emitted.
  - The thief's memory: "You took 2 groceries without paying. You did not see anyone else in the store."
  - Each witness gets a witnessed claim, a memory and a `feel` ride-along.
- **Opportunities are measured, not assumed.** `take_offers_per_day` (9.7) counts take options offered. The `needs_greedy` calibration (9.5) must show at least 1 take offer a day, on average across 5 seeds, before any JEV spend. The kill criterion watches take offers as well as take mass (11.1).
- **Discovery, from owner-known facts only.**
  - The owner's count is `knownStores`. It is updated by the owner's own sales and moves, and by every change the owner is told about: overnight spoilage and the morning delivery are told to the owner at their next shift start or next entry ("3 produce spoiled overnight; the truck brought 12 groceries"). Only real takes and the observer's `remove_items` can leave an unexplained shortfall, so there are no false thefts from spoilage or unseen deliveries.
  - Discovery runs only on stores with a single legitimate withdrawer: shelves, kitchens, bars, tills and the treasury. It never runs on a household pantry, where another member eating is the ordinary explanation.
  - When the owner is next inside and the store is short against their count, they get a `took_from` claim with no actor. Their memory reads "The shelves are 2 groceries short since you left at 12:10 pm, and no sale explains it."
  - A `suspect` ride-along follows. Its candidates are the people the owner saw in or near the store during that time window, plus `nobody`. With no candidates, the question is skipped and recorded as forced to `nobody` (6.1).
  - The answer becomes a hypothesis claim (origin `self`, credence p). It feeds the report and becomes the case's candidates.
- **Pickpocketing [A1.3]** (the village's pickpocketing, translated).
  - Affordance: `pickpocket_<id>`, "Try to pick Sable's pocket (up to 5 coins). Who would know: he may notice at once; Mo is watching the street."
  - Physics: the thief walks up. On arrival, up to 5 coins move in mode `take`, and a `pickpocket` event is emitted with the victim as its target.
    - The victim notices at once unless they are `working`, `talking`, `acting`, asleep or collapsed. Noticing gives a witnessed claim and a `feel` ride-along.
    - Otherwise the loss goes into the victim's `unnoticedLoss`, and it is discovered at their next decide ("Your purse is 5 coins lighter than you thought"). That discovery brings a `suspect` ride-along over the people who came within 2 steps of them since they last counted.
    - Bystanders who see it get a witnessed claim.
  - A theft with a direct victim enters the same report, intake and resolution chain (M5), with `Case.storeId` set to null and `Case.victimId` set.
- **Fear's affordances [A1.3].**
  - `avoid_<id>`: "Keep out of Hollis's way for the next hour." The chooser walks off and, for 12 ticks, their wander and route targets exclude tiles within that person's sight. It is offered for someone in sight whom the chooser holds a `wrong_to_you` memory or a theft belief about.
  - `hide_coins`: "Put 20 of your coins in the box at home." Coins go from the wallet to the household stash, where a pickpocket cannot reach them.
- **Gifts [A1.3].**
  - Affordance: `gift_<id>`, "Give Hollis 2 groceries", or 5 coins when food is short. Offered for people in sight.
  - The recipient answers C2 `accept_gift`: `thank_warmly`, `accept_quietly` or `refuse`.
  - `transfer` in mode `gift`. Thanks gives the giver respect +6. The giver gets a `feel` ride-along. The favours ledger records the gift.
- **Asking and pleading** (the village's honest pleas and sob-story lies, translated).
  - `ask_help_<id>`, "Ask Mo for food (you are hungry)" or "for 5 coins". Its typed `claim` is true in the asker's own frame. Children can ask household adults from A1-min, and everyone can ask anyone from A1.3.
  - `plead_<id>` [A1.3], "Ask Mo for food with a hard-luck story (you are not actually hungry; you ate at noon)". Its claim is false in the asker's own frame, and the label says so.
  - The listener hears only the claim, through `ask_help` with `claim`, and answers `grant`, listing only the options they can afford. If only `give_nothing` is affordable, the question is skipped and recorded as forced (6.1). A plea that is granted is a `lie` event (M17).
- **Compliments [A1.3].** `compliment_<id>`, "Tell Wren sincerely what you appreciate about her work." The listener answers `engage` and `feel_asker`. On engagement they get respect +4, halved for each compliment they received in the last 12 hours.
- **Scarcity levers.** The `supply_shock` intervention and the `lean_times` preset.
- **Hoarding** (buying beyond need) is allowed. It is measured by `food_days_gini`.
- **Measured.** Restraint rate per opportunity, both watched and unseen: 1 minus takes over take options offered. This is computed separately for store takes and for pickpocketing.

**M24. Debt, credit, personal loans and fraud [B]**
- **Personal loans** (the village's peer loans, translated onto the same `Loan` ledger as store tabs).
  - `offer_loan_<id>`: "Offer to lend Hollis 5 coins, repaid as 6 by tomorrow evening" (fair), or "... repaid as 9" (steep). Tags: fair, generosity 0.6, security 0.4; steep, greed 0.7, dominance 0.3.
  - The listener answers `accept_loan`: `accept` or `decline`.
  - When the debtor's wallet covers it, the debtor gets `repay_<loanId>`. At or after the due tick, the creditor gets `demand_repay_<loanId>`, answered `repay`, `promise` or `refuse`.
  - A loan is `defaulted` once its due tick has passed by 24 ticks. Both parties get a memory, and the creditor gets a `trust` ride-along.
- **Credit.**
  - `ask_credit` (talk) at the store. The shopkeeper answers C3 `credit_request`: `extend_full`, `extend_half` or `refuse`.
  - Tabs are kept in the till's ledger. Hollis starts with a 30-coin tab.
- **Repaying.** `repay_tab`, offered when the debtor's wallet covers it.
- **Fraud.**
  - The shopkeeper's `pad_tab_<id>`, "Add 5 coins to Hollis's tab that he did not spend. He may notice if he checks his tab."
  - The debtor's `check_tab` leads to discovery.
- **Overdue tabs.** A tab more than 7 days overdue gives the shopkeeper `refuse_credit` or `report_debt`, which becomes a civil matter at a hearing.

**M25. Migration: strangers and leaving [C]**
- **Strangers.**
  - They arrive by the county road, from a scenario or the `add_stranger` intervention, with a psyche from the preset.
  - They rent at the inn at Lark's price and apply for vacancies.
  - `admit_resident` is decided by vote.
- **Leaving** takes two keys:
  1. The reflect call adds `leave`, a boolean, after 3 days with belonging and security both below 25.
  2. The next day, the `leave_town` option appears. Taking it means walking out by the county road.

**M26. Commitments and promises [B]**
- **Making one.**
  - A typed `promise` rides inside talk purposes: help on a project at a time, repay by a day, keep a secret, or vote a certain way.
  - The listener's acceptance creates a `Commitment`.
- **When it falls due.**
  - `keep_<commitmentId>` appears as an option.
  - If the deadline passes, it is broken, and the promisee sees it.
- **Perception.** Reliability appears as known counts, for example "Hollis kept 2 of the 3 promises you know of." The favours ledger (4.1) adds the viewer's own reciprocity counts, for example "Mo has helped you 3 times; you have helped her once."
- **Paying a fine by a date** (`ask_time` in M5) becomes a `pay_fine` commitment from Slice B.

## 6. JEV call catalog

### 6.1 Rules shared by every call

- **Builders.** Each call kind has a question builder in `lib/town/jev/kinds/<kind>.ts`. The server builds every instruction from typed fields, and it builds every option's criterion text with `renderOption` (5.2). `buildJevCall` rejects a call with more than `QUESTION_CAP = 8` questions. The route answers 413 when the state exceeds `STATE_CHAR_CAP = 7000` characters, or when the state plus every rendered criterion exceeds `CALL_CHAR_CAP = 16000`.
- **Option ids** match `^[a-z0-9_]{1,40}$`. People are `p_<agentId>`, claims are `c_<n>`, and today's memories are `m0` to `m9` (the index into `today`, as in Increment 3).
- **Every choice question has at least 2 options.** The builders and the schemas both enforce this (`min(2)` on people and claim lists; `nobody` or `none` counts as an option). When fewer than 2 would exist, for example `grant` when only `give_nothing` is affordable, `suspect` with no candidate, `claim` or `who_news` with a single entry, or `grateful_to` whose only helper has since left, the question is **not asked**. The engine applies the lone option deterministically and records it in `DecisionRecord.forced`, for example `{ grant: "give_nothing" }`. A one-option choice carries no information, and the API may reject it.
- **`mood`.** Every call asks `mood`, a score over `MOOD_LEVELS` with the instruction "How is {name} feeling overall right now?". The only exception is `found`.
- **Conditional sub-questions** are answered on every call where they are asked, and always recorded ("shadow preferences", for example a free sociogram of who each person would seek out). They are applied only when their parent option is picked. `DecisionRecord.used` lists which ones were applied.
- **Ride-alongs.**
  - At most 2 per `decide` or `duty` call.
  - Taken from `Agent.pending` in order of salience (highest first), then age (oldest first).
  - They ride only while the call stays under the question cap.
  - They expire after 288 ticks; the expiry is logged.
- **Sampling.** Implemented in `lib/town/sampling.ts`. The uniform draw is `u = rand(seed, "choice", agentId, callIndex, questionId)` and is recorded.
  - **Choice:** min-p over the full returned distribution, with `minP` taken from `WorldConfig` (default 0.25). The eligible set and the pruned probability mass are recorded. In argmax mode the top option is picked.
  - **Boolean:** yes when `u < p`, or when `p >= 0.5` in argmax mode.
  - **Score:** a score that drives a continuous state (stance, liking, trust, grief) uses the expected value, `EV = sum of i * p_i`. A score that selects a discrete level (effort, sanction) samples the level probabilities by min-p.
- **Apply guard.** Every answer is applied only if the agent's status still carries the same `requestId`. This generalizes the village's `status.kind === "deciding"` guard. Three rules keep the guard from stranding anyone:
  - **Founding comes first.** At tick 1 each founder enters `founding` with the `found` request's id, and no `decide` is issued while an agent is founding. The found answer, or its failure, moves the agent to `idle` with retryAt = now. A stranger's `found` works the same way on arrival.
  - **A pending call is never resumed.** When `on_duty_call` or `considering` interrupts an agent, the saved `resume` is a `Resumable` status (4.3), which the type system keeps from being `deciding`, `founding`, `reflecting` or another interruption. An interrupted decide is abandoned: its late answer is dropped by the guard and counted in `Stats.stale`, and the agent resumes `idle` with retryAt = now. An interrupted `working`, `moving` or `acting` resumes as it was.
  - **Reflection once a day, at night.** `reflect` fires only on the first sleep that begins at or after 8 pm, or before 5 am (which counts for the previous day). It is guarded by `lastReflectDay`, as in Increment 3. Daytime naps, such as Bram's, never trigger it.

### 6.2 The calls

**C1 `decide`.** Fires when an awake, non-infant agent is idle and `retryAt` has passed.
- **Perception:** everything in section 7.
- **Questions:**

| id | Type | Asked when | Instructions | Criteria |
|:-|:-|:-|:-|:-|
| `action` | choice | always | "Decide what {name} does next. Choose what this particular person would genuinely do right now, given everything above. This is not about the best move; it is what {name} would actually do." | `{optionId: "{label}. {detail}"}`, rendered server-side by `renderOption`, in shuffled order |
| `mood` | score | always | as 6.1 | `MOOD_LEVELS` |
| `who_news` | choice | `talk_news` offered | "If {name} went to tell someone what they know, who would {name} actually go to?" | `{p_id: "{Name}. {tie line}. {where last seen}"}`, up to 12 known people |
| `claim` | choice | `talk_news` offered | "If {name} told someone what they know, which piece of news would {name} bring up?" | `{c_id: "{claim sentence} ({source phrase})"}`, up to 4 |
| `who_view` | choice | `talk_view` offered | "If {name} went to talk about {ISSUE_TOPIC}, who would {name} go to?" | as `who_news` |
| `who_badmouth` | choice | `badmouth_<id>` offered [A1.3] | "If {name} told someone what they know against {Name}, who would {name} tell?" | as `who_news` |
| `expressed_<issue>` | score | `talk_view` offered | "If {name} talked about {ISSUE_TOPIC}, what would {name} say out loud?" | `ISSUE_LABELS[issue]` |
| `effort` | score | any work option offered | "If {name} goes to work now, how hard would {name} actually work?" | `["do the bare minimum", "take it easy", "work steadily", "work hard"]` |
| `feel_<key>` | score | ride-along | "Since {name} last stopped to think: {what}. How does {name} feel about {other} now, compared with before?" | `["much colder", "a bit colder", "about the same", "a bit warmer", "much warmer"]` |
| `trust_<key>` | score | ride-along | "{what}. How much does {name} trust {other} now?" | `["not at all", "a little", "somewhat", "mostly", "completely"]` |
| `suspect_<key>` | choice | ride-along | "{what}. Who does {name} think did it?" | `{p_id: "{Name}. {why they come to mind, e.g. you saw them near the store at 12:20 pm}", nobody: "No idea"}` |
| `appraise_<key>` | score | ride-along | "{what}. How hard does this hit {name}?" | `["barely", "a little", "noticeably", "deeply", "it changes everything"]` |
| `motive` | choice | only in the `motiveReadout` arm | "What is mainly driving {name} right now?" | `MOTIVES` |

- **Applied:**
  - `action` is sampled and becomes the intent.
  - Sub-questions are applied to the intent when their parent is picked: `who_*` sets the target, `claim` sets `claimId`, `expressed` sets the index as sampled, `effort` sets the level as sampled. A sub-question with fewer than 2 candidates is not asked, and its lone value is recorded as forced (6.1).
  - `feel` updates liking by 0.08 x (EV - 2).
  - `trust` sets trust to the piecewise-linear map of EV onto (-0.8, -0.3, 0.1, 0.5, 0.9).
  - `suspect` creates a hypothesis claim with credence p.
  - `appraise` sets the emotion intensity to EV/4.

**C2 `encounter`.** Fires on the listener when an approacher becomes adjacent, or when both are inside the same building, carrying a `TalkPurpose`.
- **Situation line:** "{asker} walked up to you wanting to {purpose phrase}." The purpose-specific facts come next, for example "You have 3 groceries in your pantry and 12 coins."
- **Questions:** at most 5.
- **When `engage` is skipped.** It is not asked when the purpose is an institutional act that the listener cannot simply walk away from: `fine`, `arrest`, `offer_goods` to a holder on shift, `clinic_fee`, and `lesson` (where `engage` means "listen"). There, the purpose question itself carries the choice, and refusing is one of its options.

| id | Type | Asked when | Instructions | Criteria |
|:-|:-|:-|:-|:-|
| `engage` | boolean | always, except as above | "{asker} just walked up to {name} wanting to {purpose phrase}. Given who {name} is, how they feel right now and what they were doing, does {name} stop to talk with {asker}?" For `question_about`, the phrase is "agree to answer the officer's questions". | |
| `believe` | score | `share_news` | "{asker} just told {name}: {heard}. How much does {name} believe it, given who {asker} is to {name} and what {name} already knows?" | `["don't believe it at all", "doubt it", "unsure", "probably true", "certain"]` |
| `stance_after` | score | `share_view`, `lesson` | "{asker} just told {name} what they think: {heard}. After hearing this, where does {name} now stand on {ISSUE_TOPIC}?" For a lesson: "{asker}, your teacher, told the class: {heard}. ..." | `ISSUE_LABELS[issue]` |
| `grant` | choice | `ask_help` | "{asker} says {claim phrase} and is asking {name} for {amount phrase}. What does {name} do?" The claim phrase comes from the typed claim, for example "they have not eaten properly in a long time". | `give_nothing`: "Give nothing"; `give_some`: "Give half of what was asked ({x})"; `give_asked`: "Give what was asked ({y})". Only affordable options are listed; with only `give_nothing` left, the question is skipped and forced. |
| `accept_sale` | choice | `offer_goods` | "{asker} is offering to sell {qty} {item} to {place} at {p} coins each. The till holds {t} coins. What does {name} do?" | `take_all`, `take_some` (half, rounded down, when that is 1 or more), `refuse`. Only what the till can pay for is listed. |
| `pay_fine` | choice | `fine` | "{asker}, the police officer, has fined {name} {n} coins for {case phrase}, to be paid to {victim}. What does {name} do?" | `pay` or `pay_what_you_have`, `ask_time`, `refuse` |
| `pay_fee` | choice | `clinic_fee` [A1.2] | "The clinic fee is {n} coins. What does {name} do?" | `pay` (when the wallet covers it), `refuse` |
| `accept_gift` | choice | `offer_gift` | "{asker} is offering {name} {gift phrase}. What does {name} do?" | `thank_warmly`, `accept_quietly`, `refuse` |
| `testimony` | choice | `question_about` | "Odile, the police officer, is asking {name} about {case phrase}. What does {name} actually say?" | built from `knows` (below) |
| `name_whom` | choice | `question_about`, when a naming option exists | "If {name} names someone, who would it be?" | people refs |
| `reply` | choice | `confront` | "{asker} is accusing {name} of {claim sentence}. What does {name} do?" | `didIt` true: `admit_apologize`, `admit_repay`, `deny` ("Deny it (you did take them)"), `blame_other`, `walk_away`. `didIt` false: `deny` ("Deny it (you did not take them)"), `blame_other` ("Say who you think did it"), `walk_away`, `get_angry` |
| `arrest_reply` | choice | `arrest` | "{asker} is arresting {name}: {heard}. What does {name} do?" | `go_quietly`, `protest` (a loud event, followed by the officer's `press_arrest`, M5; Slice C adds `run`) |
| `accept_apology` | choice | `apologize` [B] | "{asker} is apologizing to {name} for {event phrase}{, and offering {n} coins}. What does {name} do?" | `forgive`, `accept_amends`, `refuse` |
| `feel_asker` | score | always | "Given this, how does {name} feel about {asker} now, compared with before?" | as `feel_<key>` |
| `mood` | score | always | as 6.1 | `MOOD_LEVELS` |

**Testimony options.** Every option is honestly labelled in the answerer's own frame, according to what they know:

| What they know | Options |
|:-|:-|
| `witnessed` | `tell_truth`: "Say what you saw: {claim}"; `say_saw_nothing`: "Say you saw nothing (you did see it)"; `name_someone`: "Name someone else (you saw {X} do it)" |
| `heard` | `tell_truth`: "Say what you heard, and from whom"; `say_saw_nothing`: "Say you know nothing (you did hear something)"; `name_someone` |
| `did_it` | `confess`: "Admit you took them"; `say_saw_nothing`: "Say you know nothing about it (you took them)"; `name_someone`: "Name someone else (you took them)" |
| `nothing` | `say_saw_nothing`: "Say you know nothing (true)"; `name_someone`: "Name someone you suspect (you saw nothing yourself)" |

- **Applied:**
  - `engage` is Bernoulli.
  - Stances and belief credences use EV.
  - Choices are sampled.
  - Lies are classified by the engine from the answerer's own knowledge, then logged as `lie` events.

**C3 `duty`.** A job-holder's call, triggered by a physics event, with one typed task.
- **Queue.** Slice A tasks come from the triggers below. From Slice B the queue also takes the tasks in the Slice B table.

| Task | Fires when | Situation lines | Question `id`: criteria |
|:-|:-|:-|:-|
| `set_prices` [A1-min] | the first shift tick of each day at the store, the diner and the inn | stock left, today's delivery ("The truck brought 6 of the usual 12 groceries"), the unit cost, the price you set yesterday, customer comments you heard | one `price_<item>` question per listed item (up to 3 at the store). Criteria: the distinct prices only, each labelled with its true markup (2.3), for example `at_cost` "At cost: 2 coins", `markup_25` "3 coins (50% over cost)", `markup_100` "4 coins (twice cost)". Instructions: "It is opening time at {place}. {name} decides today's price for {item}. What does {name} set?" |
| `serve` [A1-min] | a customer arrives to buy, and the holder holds a salient belief or tie about them (M3) | who the customer is to you, what you believe about them, what they want | `serve` (boolean): "{customer} wants to buy {qty} {item} at {p} coins each. Does {name} serve {customer}?" |
| `press_arrest` [A1-min] | the suspect answers `protest` | the protest, who is watching | `press` (boolean): "{suspect} is protesting loudly{ in front of X and Y}. Does {name} go through with the arrest?" |
| `triage` [A1.2] | a patient with health below 60 enters the clinic while the carer is on shift, or the doctor or nurse sees a collapsed person | the patient's visible cues, what they said about paying, the fee | at the clinic: `treat_now`, `ask_payment_first`, `send_away`; collapsed in sight: `go_help`, `leave_them` (M4) |
| `lesson` [A1.3] | the start of each school block with a child present | the children present, the graves in town, what you taught last | `lesson`: `reading`, `civic_justice`, `the_dead` (only when a grave exists), `free_play`; plus `lesson_stance`, a score over `ISSUE_LABELS.justice`, asked with `civic_justice` (M11) |
| `case_intake` | a report reaches the officer | the report (its claim and suspicion), who reported it, your tie with them | `intake`: `open` "Open an investigation: question people and decide what to do", `note` "Write it down and wait to see if anything else comes up", `sort_it_out` "Tell {reporter} to sort it out with whoever they suspect", `dismiss` "Dismiss the report". Instructions: "{reporter} has just reported to {name}, the town's police officer: {report}. What does {name} do about it?" |
| `case_resolution` | the officer picks `resolve_<case>` | a case summary: interviews, who named whom, what you saw yourself | `resolution`: `arrest_<id>` "Arrest {Name}: they spend tonight in the station cell", `fine_<id>` "Fine {Name} {n} coins, paid to {victim}", `warn_<id>` "Give {Name} a warning", `keep_open` "Keep investigating", `close` "Close the case unsolved". Instructions: "{name} is deciding how to close the case: {summary}. What does {name} do?" |

- **Every duty call also asks** `mood`, plus up to 2 ride-alongs.
- **Slice B duty tasks** (each also asks `mood`):

| Task | Who answers | Question ids and criteria |
|:-|:-|:-|
| `triage` (extended) | doctor or nurse | adds `after_current` to `triage`, and `fee`: `waive`, `standard`, `put_on_tab` |
| `review` | mayor (town posts), doctor (nurse posts) | per post: `promote` (only when a higher post is vacant and its gate is met), `pay_step_up`, `keep`, `pay_step_down`; a promotion then needs a `confirm_promotion` vote (M6) |
| `bloc` | group leader | `bloc`: `yes`, `no`, `free_vote` before a council vote (M19) |
| `group_aid` | group leader | `grant`, `half`, `refuse` for a member's aid request (M19) |
| `credit_request` | shopkeeper | `credit`: `extend_full`, `extend_half`, `refuse` |
| `edition` | journalist | `story_1`, `story_2`: claims, plus `nothing_new`. `angle_1`, `angle_2`: `neutral`, `favourable`, `critical` |
| `enforce` | officer | `enforce`: `carry_out`, `delay`, `refuse` |
| `hire` | mayor | `hire`: applicants plus `keep_vacant` |
| `buy_price` and `order_size` | shopkeeper | Added to `set_prices`. `buy_price`: `low`, `fair`, `high`. `order_size`: `small_10`, `usual_20`, `large_30` |
| `deliver` (Slice C) | doctor | `deliver`: `go_now`, `finish_current` |

**C4 `probe`.** Instrument only, never applied to the world. Any recorded C1 to C11 request is re-sent with `lane: "instrument"` and one typed perturbation (section 9.6).

**C5 `reflect`.** Adopted from Increment 3. It fires on the first sleep that begins at or after 8 pm, or before 5 am (which counts for the previous day), once per day through `lastReflectDay` (6.1). It runs while the agent is `reflecting`, which counts as asleep. A failure skips it.
- **Situation:** today's memories as `m0` to `m9`, today's helpers and wrongers, current grudges, and the current goal.
- **Questions.** The 5 fixed questions come first. Then up to 3 conditional ones, taken in the priority order below until the call reaches `QUESTION_CAP = 8`. Anything that does not fit is logged in `truncated` and moves to the next night.

| id | Type | Asked when | Instructions | Criteria |
|:-|:-|:-|:-|:-|
| `meaning` | score | always | "Looking back on today, how meaningful did {name}'s day feel to them?" | `["empty", "a little meaningful", "somewhat", "quite", "deeply meaningful"]` |
| `trust_people` | score | always | "Has today left {name} trusting the people of Fernhollow less or more?" | `["much less", "a little less", "the same", "a little more", "much more"]` |
| `change` | choice | always | "How, if at all, has today changed {name}?" | `CHANGES` (10 keys) |
| `mood` | score | always | as 6.1 | `MOOD_LEVELS` |
| `keep` | choice | 1 or more memories today | "Which of today's moments will {name} still carry with them years from now?" | `{m0..m9: memory text, none: "Nothing today stands out"}` |
| `grateful_to` | choice | priority 1: 1 or more helpers | "Who is {name} most grateful to today?" | helpers plus `nobody` |
| `grudge` | choice | priority 2: 1 or more wrongers | "Is there anyone {name} now holds a grudge against?" | wrongers plus `nobody` |
| `forgive` | choice | priority 3 [A1.3]: holds a grudge | "Is there anyone {name} is ready to forgive?" | grudges plus `nobody` |
| `goal` | choice | priority 4: no goal yet, or the day number divisible by 3 | "Given who {name} is and the life they are living, what does {name} most want out of life now?" | `GOALS` |
| `mayor_legit`, `officer_legit` | choice | priority 5 [B]: every second night | "How does {name} regard {Name} as the town's {office}?" | `accept`, `tolerate`, `reject` |
| `tie_level_<p>` | score | priority 6 [B]: up to 2 people with new interactions today | "How does {name} feel about {Name} now?" | "hate", "dislike", "neutral", "like", "love" |
| `stay_<group>`, `leave` | choice, boolean | priority 7 [C]: the night after a trigger event | as M19 and M25 | |

- **Applied** (the Increment 3 `applyReflection`, adopted):
  - `meaning` EV x 25 becomes `Agent.meaning`.
  - `keep` makes that memory formative.
  - `trust_people` and `change` drift the psyche through the drift hook (5.1.4).
  - `grateful_to` gives liking +0.1, adds the person to `Agent.gratitude`, removes them from `Agent.grudges`, and records a gratitude event.
  - `grudge` gives liking -0.1, adds the person to `Agent.grudges`, creates an `anger` emotion, and records a grudge event.
  - `forgive` removes the grudge, ends the anger emotion, gives liking +0.1, and records a `forgive` event (M17).
  - `goal` sets `Agent.goal`.

**C6 `found`.** Fires at tick 1 for each founder, and on arrival for a stranger. The agent is in the `founding` status until the answer lands or fails (6.1).
- **Questions:** `stance_<issue>`, a score for each active issue. Instructions: "Given who {name} is and everything they have lived, where does {name} stand on {ISSUE_TOPIC}?" Criteria: `ISSUE_LABELS`.
- **Applied:** EV, stored as `Stance` with certainty.
- **Slice A** uses only `justice`.

**C7 `vote` [B].** One call per attendee per round.
- **Questions:**
  - `vote_<item>`: a choice of yes, no or abstain; for an election, the candidates plus abstain.
  - `sanction_<item>`: a score over "a warning", "a fine", "pay back double", "a night in jail", "banishment".
  - `mood`.
- **Open ballot:** calls run sequentially, and each voter's situation lists the prior declarations. **Secret ballot:** calls run in parallel.
- **Instructions:** "It is {name}'s turn to vote on {item}. {Everyone will see how you vote. | Votes are secret.} How does {name} vote?"

**C8 `hearing` [B].** Two roles:
- **Accused:** `plea`: `confess_apologize`, `confess_repay`, `deny`, `blame_other`, `stay_silent`, plus `whom`.
- **Witness:** `testify`: `truth`, `saw_nothing`, `false_for`, `false_against`.
- Both roles also answer `mood`.

**C9 `react` [C].** The target of an attack, or a witness.
- **Target:** `react`: fight_back, flee, plead, call_for_help, take_it.
- **Witness:** `react`: step_in, call_for_help, fetch_police, back_away, watch.

**C10 `press` [C].** The attacker, after seeing the target's reaction.
- **Question:** `strike_again` (boolean). Instructions: "{target} is {reaction}. Does {name} strike again?"

**C11 `coming_of_age` [C].** Fires at age 16.
- **Questions:** `attachment` (choice of 4), `value_first` and `value_second` (choices over the 10 values), and `trait_<k>` for k in 1..5 (score). That is 8 questions.

### 6.3 Calls per day

The assumptions come from the village engine: an action plus walking takes about 13 ticks, a day is 288 ticks, and an adult is awake for about 192 ticks (16 hours).

A working adult's day in Slice A:

| Call | Count per day | Arithmetic |
|:-|:-|:-|
| decide around shifts | 2 | 2 shift blocks of up to 48 ticks each (about 96 ticks) |
| decide in free time | 8 | the remaining ~96 awake ticks / 13 ticks per action is about 7.4, plus a wake-up decide |
| duty | 0.4 | 3 price calls plus about 2 police calls, spread over 12 workers |
| encounters received | 2 | |
| reflect | 1 | |
| **Total** | **13.4** | |

Other people:

| Person | Slice A calls per day | Full design calls per day |
|:-|:-|:-|
| Working adult | 13.4 | 15.1: duty 1.5 (triage, credit, edition, enforce, hire), votes 0.4 (a weekly council of about 8 attendees, plus about 1 special meeting per week), hearings 0.2 |
| Elder | about 11.5: 9 decide, 1.5 encounter, 1 reflect | about 11.9 (adds votes) |
| Child | about 9: 7 decide, 1 encounter, 1 reflect | about 9 |
| Infant | 0 | 0 |

Totals:

| Population | Arithmetic | Calls per in-game day |
|:-|:-|:-|
| Slice A town (12 adults, 1 elder, 2 children) | 12 x 13.4 + 11.5 + 2 x 9 = 190, plus 15 founding calls on day 1 | about 190 |
| Full design, same 15 | 12 x 15.1 + 11.9 + 18 = 211 | about 210 |
| Grown town (16 adults, 6 children, 2 infants) | 16 x 15.1 + 6 x 9 = 296 | about 300 |

**Measured check.** The in-place draft town (header) made its first real JEV run at 19:32 on 2026-09-23: seed 600, 1 world, 1 day, `think=1`. It made **334 calls in 24 in-game hours** for 15 people, about 75% more than this model's 190. Its action durations differ from the spec's, but the gap is large enough to plan for. **Planning range: 190 to 340 calls per in-game day for the 15 founders.** A8 prints its own estimate from the tick model before the first run, and P1 compares against that estimate.

**Throughput at 1x.** One day takes 288 x 260 ms = 75 s. At 340 calls per day that is 4.5 calls per second. With a mean latency of about 0.5 s, about 2.3 calls are in flight at once. At 4x it is 18 calls per second and about 9 in flight, so the browser uses a concurrency cap of 12.

**Cost, counting the option text.** The state is about 3,000 to 3,500 characters. A `decide` also sends its criteria: about 24 options at up to 320 characters each (label plus detail), plus the sub-question criteria. That is roughly as much text again. So a decide call is about 10,000 to 12,000 characters. Encounter, duty and reflect calls are about 4,500 to 6,000. Against the village's measured $0.00001 to $0.00002 per call, at about 5,000 to 6,000 characters in all, the estimate is **$0.00003 to $0.00008 per call**. That is up to 2x the first estimate, and the runs stay cheap:

| Scope | Calls | Cost |
|:-|:-|:-|
| One day, full design | 210 to 340 | $0.006 to $0.03 |
| 30-day run | about 6,300 to 10,200 | $0.19 to $0.82 |
| Slice A in full (11.1): A0 282; A1-min, A1.1 and A1.3 at 2 worlds x 1 day each; A1.2 at 2 worlds x 2 days; the gate runs, 4 x 2 days; founding calls; about 240 probes | about 6,800 | $0.20 to $0.55 |

**Budgets.** `components/town/use-town.ts` replaces the village's flat `CALL_BUDGET_STEP = 600` with the list below. These are conveniences for the viewer. The server-side limits in 4.2 are what actually bound spend.
- a per-day meter, default 400 world calls per in-game day;
- a session cap of 4,000, which is 12 to 19 days at 15 people;
- an "Allow 2,000 more" button;
- a separate instrument budget of 200 per session, usable only against the local lab route (4.2).

When the meter is reached, agents finish what they are doing and wait, and a `budget_stall` event is logged. Metrics exclude windows where the budget stalled the run.

## 7. Perception rules

`perceive()` in the village's `lib/sim/engine.ts` lists every agent map-wide, including the line "X is inside their house, asleep". It also gives the whole grove's berry count from any distance. That is omniscient. The town reimplements it only as `perceiveOmniscient`, for the `perception: omniscient` control arm.

The honest pipeline has two steps:
- `buildView(world, agentId): View` in `lib/town/view.ts` is the **only** function that reads `World` for perception. `View` is declared in `lib/town/types.ts` (4.3), so A3 and A4 both compile against it from the first hour.
- `perceive(view: View, ablations: Ablations, situation: SituationLine[]): PerceiveResult` in `lib/town/perception.ts` receives only the `View`, plus the call-specific situation lines that the kind builder derives from the same `View`. Its type makes it impossible for it to read `World`. This one signature is used everywhere.

**7.1 Sight.**
- Radius: 8 tiles by day, 4 at night (`isNight`).
- Line of sight uses Bresenham lines. `tree`, `house`, `building` and `rock` tiles block it.
- A person standing in tall grass can be seen only from within 2 tiles.
- Outdoors, you see only other people who are outdoors.
- Inside a building, you see only people inside the same building.
- Nobody outside sees in. Instead, "Sable went into the store at 12:05 pm and you have not seen him come out" is derived from what you watched.

**7.2 Hearing.**
- A conversation indoors is overheard by every awake occupant of the building. The bar is a rumour mill by physics, not by design.
- Outdoors, a conversation is overheard within 2 tiles.
- Loud events (`WorldEvent.loud`: an arrest protest, a refused fine argued in the street, and from Slice C a fight or a shout) carry 6 tiles and need no line of sight.

**7.3 Last seen.**
- Every tick, for everyone in sight, the viewer stores `ties[id].lastSeen = { tick, place, activity, pos }`.
  - `place` comes from `describeLocation`.
  - `activity` is `describeStatus` as seen from outside, for example "going into the general store".
- People out of sight appear only through last-seen lines, for example "Hollis: near the general store at 12:20 pm, going inside."

**7.4 Things, prices and notices.**
- **Bush berry counts:** visible only in sight. Otherwise they are shown as remembered, with the time.
- **Shelf, kitchen and bar counts:** visible only when inside the building. Till, stash and treasury counts are visible only to their owner.
- **Your own business stores:** the owner's `knownStores` count also takes in every change the owner is told about: overnight spoilage and the morning delivery are told at the next shift start or entry, so an owner is never shown a shortfall that spoilage or an unseen delivery explains (M23).
- **Closed doors:** at a closed shop, a person perceives only the present, for example "The store is closed; nobody is in now. The posted hours say 8 am."
- **Your dependants' hunger:** only the cue, with the tick you saw it, or what they told you (5.1.3).
- **Posted prices:** read when within 3 tiles of the door, or when inside.
- **Your own household pantry:** read when at home. Otherwise it is "as you last saw it".
- **Notices:** read when within 2 tiles of the board. The Crier's printed notices also sit on the board.
- **Other people's bodies** show only as cues, never as numbers:
  - "looks thin and hungry": hunger below 25;
  - "looks exhausted": energy below 20;
  - "looks unwell": health below 50;
  - "is carrying food";
  - "looks upset": the last mood level 1 or less.

**7.5 Sources and credence.**

| Source | Credence |
|:-|:-|
| `witnessed` | 1 |
| `discovered` | 1 for the fact of the loss, nothing about who |
| `told`, `overheard`, `posted` | the listener's own `believe` EV / 4 |
| `self` (a suspicion) | the `suspect` probability |
| `traveller` (a planted rumour) | the listener's own `believe` EV / 4 |

Beliefs render with source and credence words. Example: "Sable told you Hollis took groceries from the store (you think it is probably true)."

**7.6 What no one can know.**
- another person's psyche;
- another person's need numbers (only cues);
- another person's wallet or store contents (only visible cues, or the contents when you are the owner inside);
- events nobody witnessed;
- another person's private stance (only what they said out loud);
- the ground truth behind any claim;
- the observer's interventions (they arrive only as in-world facts, section 9.3).

**7.7 Self-knowledge.**
- You always know your own acts and secrets. Example: "You took 2 groceries without paying at 12:40 pm. You did not see anyone else in the store."
- You know your own wallet, what you carry, your job schedule and pay, and your household.
- You know the lies you have told, in your own frame.

**7.8 Provenance.**
- Every line, and every numeric or named option param (`OptionSpec.provenance`), carries a tag in the engine-side record: `self`, `clock`, `job`, `household`, `sight`, `heard:<eventId>`, `lastSeen:<id>@<tick>`, `belief:<claimId>`, `memory:<id>`, `notice:<id>`, `price:<storeId>@<tick>`, `store:<storeId>@<tick>`.
- The wire strips the tags. `DecisionRecord.provenance` keeps them.
- `tests/town/perception.test.ts` runs a lint with three checks:
  - Any line or option param naming another person, or giving a store count or price, must carry a tag whose source was valid at that tick.
  - A property test builds random worlds and asserts there are no facts about out-of-sight people or places except dated beliefs.
  - No `View` contains the key `eventId`, at any depth.

**7.9 Salience caps.**
- The caps are deterministic, documented, and logged in `truncated`. The `caps: 2` ablation (`Ablations.caps`) doubles them.
- Ordering and caps per section:
  - **seeing:** nearest first, ties broken by id; cap 16, then "and N others".
  - **lastSeen:** kin first, then people you like or dislike strongly (absolute liking 0.35 or more), then the most recent; cap 10.
  - **beliefs:** first, beliefs about people in sight or about kin; within those, confident beliefs (credence 0.6 or more, or 0.2 or less); then by salience x recency; cap 10.
  - **people:** household first, then people in sight, then the strongest liking; cap 12.
  - **memories:** the 6 most recent plus up to 4 formative or high-salience memories from before today.
  - **town:** notices, most recent first; cap 8.

**7.10 Memory salience.**

| Kind | Base salience |
|:-|:-|
| routine | 0.05 |
| social | 0.15 |
| work | 0.2 |
| money | 0.25 |
| news | 0.3 |
| kindness | 0.35 |
| family | 0.4 |
| wrong_by_you | 0.5 |
| project | 0.5 |
| justice | 0.6 |
| wrong_to_you | 0.7 |
| loss | 0.8, or 1.0 for kin |

- The base is multiplied by (1 + max(0, liking for the people involved)).
- **Nightly decay:** `salience *= 1 - 0.25 * (1 - salience)`.
- Formative memories (from reflect `keep`) have a floor of 0.6.
- A person keeps up to 40 memories, pruned by salience x recency.
- `MEMORY_IN_PROMPT` becomes 6 recent plus 4 salient.
- **Slice B** adds "Seeing them reminds you" lines: for each person in sight, their single most salient shared memory at 0.5 or above. The `memoryRecall` ablation tests them against a control that removes a random routine memory.

**7.11 Example state text.** Odile at the moment Sable reports the theft. `buildState` writes the sections in this order:

1. identity: name, age, post, town, then `history` and `character`;
2. **the body alarm**, when present (5.1.3), on its own line directly after the identity;
3. who you are (`psycheLines`);
4. clock and place;
5. needs, with the urgency clauses and the hours-to-collapse clause in their reason slots;
6. your life;
7. what you can see;
8. where you last saw the others;
9. what you know and have heard;
10. the town;
11. how you feel about people;
12. what you think;
13. feelings;
14. recent memories;
15. right now.

`tests/town/prompt.test.ts` (A8) asserts this order, and one of the P5 chains (11.1) renders a starving person.

```
You are Odile, 42, the police officer of Fernhollow, a small town. Has worn the badge for twelve years; Tomas made her chief. Believes a town without order is no town at all.
Who you are:
- Temperament: practical and set in your ways, wary of the unfamiliar; diligent and disciplined, you finish what you start.
- What matters most to you: tradition and custom; fitting in and following the rules; safety and stability. You care little for fairness for everyone.
- Moral instincts: you feel strongly about loyalty to your people; respect for order and leaders; purity and the sacred. You care little about freedom from being controlled.
- You trust that the people who care about you will stay.
- You balance today and tomorrow.
It is Tuesday, day 2, 1:40 pm (afternoon).
Where you are: inside the police station.

How you feel (100 = fully satisfied, 0 = desperate):
- Hunger: 48/100, a bit peckish
- Thirst: 62/100, fine
- Energy: 58/100, okay
- Health: 100/100, healthy
- Social: 51/100, fine (this matters to you somewhat)
- Fun: 44/100, fine (this matters to you a little)
- Purpose: 57/100, okay (this matters to you a great deal; your last meaningful work was at 11:40 am)
- Belonging: 55/100, okay (this matters to you somewhat)
- Respect: 63/100, respected (this matters to you a little)
- Security: 71/100, safe (this matters to you somewhat; you have food for about 2 days and 64 coins)

Your life:
- You are the town's chief of police. Your shift is 8 am to 8 pm and the town pays you 30 coins a day.
- You live alone on Elm Lane. You have 64 coins.

What you can see:
- Sable is right next to you, talking to you.

Where you last saw the others:
- Hollis: near the general store at 12:20 pm, going inside.
- Lark: outside the Rusty Lantern at 11:05 am, sweeping the step.

What you know and have heard:
- Sable told you 2 groceries went missing from the store shelves after 12:10 pm (you have not decided what you think yet).

The town:
- Notice board (you read it this morning): the footbridge over Willow Creek needs volunteers; 9 of 24 done, by Wren and Linnea.

How you feel about people:
- Sable: you feel friendly toward him; you somewhat trust him.
- Hollis: you feel friendly toward him.
- Lark: you are a bit annoyed with them.

What you think:
- You believe people who steal should pay it back and more (fairly sure).

Recent memories (oldest first):
- 8:05 am: You opened the station.
- 11:40 am: You walked the town on patrol.

Right now:
- Sable has just reported to you: 2 groceries are missing from the store shelves since 12:10 pm, and no sale explains it. Sable thinks Hollis did it (Hollis was near the store).
```

When the body is in trouble, the alarm and the verbatim clauses look like this (Hollis, lines 1, 2 and two of the needs):

```
You are Hollis, 26, the fisher of Fernhollow, a small town. Fishes the pond; owes the store 30 coins. Charming; loves a good time more than a hard day.
Your body needs attention: you badly need food, your health is 71/100 and falling.
...
- Hunger: 6/100, starving (you are starving; your body is failing and you will collapse without food)
- Health: 71/100, slightly weakened (you are going without food; at this rate you will collapse in about 17 hours)
```

## 8. Engine architecture and file ownership

### 8.1 Invariants

- **Pure and deterministic under a seed.** `step(world)` and `applyAnswer(world, req, ans, mode)` stay pure and deterministic under a seed. Every module is a set of pure functions over `(world, ...)`. No module keeps state outside `World`.
- **Plain JSON world.** `World` stays plain JSON. Distance fields and other caches are computed on demand and never stored.
- **Seeded randomness only.** There is no `Math.random`, no `Date.now` and no async code inside `lib/town` (outside `lib/town/jev/call.ts` and `lib/town/runs/store.ts`, which are server-only).
- **One way in from outside.** The only inputs from outside are JEV answers, failed calls and interventions. `Session` already records all three, with the tick at which each was applied.
- **No fallback brain.** A failed call leaves the character standing still, then retrying after `ERROR_BACKOFF_TICKS`, as in the village. Baseline policies run only as whole control worlds, never inside a JEV world.
- **R1: choices are traceable.** Every `WorldEvent` whose origin is `choice` cites its `decisionIds`. `tests/town/events.test.ts` fails the build otherwise.
- **R2: options are gated only by the physical and the known.** An option appears only because the person can physically take it and knows about it. It never appears because of their psychology or a guess about what they want.

### 8.2 Tick order (`step` in `lib/town/engine.ts`)

1. **Advance the tick and fire scheduled events.** `tick += 1`. Then the shock tape fires whatever is due (`lib/town/economy.ts`, `lib/town/interventions.ts`):
   - 7 am: deliveries (partial when a till is short) and the county grant; the first firing is at tick 288, because tick 0 already holds day 1's stock (2.3);
   - scheduled interventions;
   - 6 pm: payroll (partial, with IOUs, when the treasury is short) and tax;
   - 3 am: spoilage (logged, so owners are told at their next shift start), aging and hazard (Slice C), and grief decay.
2. **Agent housekeeping.** For each living agent in stable id order: update `prev`, expire the flash, then apply `needs.decayNeeds`, restoration by status, health, collapse and the death check (`lib/town/needs.ts`, `lib/town/life.ts`).
3. **Advance the status machine.**

   | Status | Handled by |
   |:-|:-|
   | moving (with slow ford tiles) | `engine.ts` |
   | acting | `engine.ts` |
   | working | `work.ts`, `projects.ts` |
   | approaching, talking | `talk.ts` |
   | carrying, jailed | `justice.ts`, `life.ts` |
   | sleeping | `engine.ts` |

4. **Knowledge pass** (`lib/town/knowledge.ts`), in this order:
   1. vision updates `lastSeen`;
   2. this tick's new events are witnessed, which writes beliefs and queues ride-alongs;
   3. discovery, from `knownStores` diffs;
   4. notices are read;
   5. prices are read.
5. **Every 12 ticks:** recompute security, update familiarity, and have `Session` sample metrics.
6. **Scheduled calls.**
   - `found` at tick 1, which puts each founder into `founding`.
   - Duty triggers: prices at the first shift tick; `serve` when a salient customer arrives; intake when a report lands; `press_arrest` after a protest; `triage` [A1.2]; `lesson` [A1.3].
   - Encounter requests for arrivals.
   - `reflect` for agents whose sleep began at or after 8 pm, or before 5 am, and who have not reflected today.
7. **Idle agents issue `decide`.** Agents in `founding` never do. Pending ride-alongs attach under the question cap.
8. **Return** the `SimRequest[]`.

`applyAnswer` dispatches through `APPLY: Record<CallKind, Handler>`. Each handler checks the `requestId` guard, samples (`sampling.ts`), writes the `DecisionRecord` (including `forced`), emits events carrying `decisionIds`, and changes status. Drift and other cross-module effects run through the `HOOKS` registry in `lib/town/hooks.ts` (8.6), never through direct imports into `engine.ts`.

### 8.3 Randomness (`lib/town/rng.ts`)

`rand(seed, stream, ...keys): number` is a stateless counter hash. It hashes the key tuple with FNV-1a over its canonical string, then finishes with splitmix32, and returns a value in [0, 1). `gauss()` and `pickIndex()` are built on top of it.

| Stream | Keys | Used for |
|:-|:-|:-|
| `physics` | tick, entity id, purpose | wander targets, yields with a random part, contagion, damage |
| `choice` | agentId, callIndex, questionId | min-p rolls, boolean draws, option-order shuffle |
| `spawn` | purpose, key | inheritance noise, stranger psyches, name draws |
| `shock` | day, purpose | the precomputed weather and shock tape, built in `createWorld` |

The keys are per agent and per purpose, so two arms that share a seed share their random numbers. Adding a person, or making one more call, never shifts anyone else's rolls.

### 8.4 Records, replay, hash, fork (`lib/town/session.ts`)

The village's `Session`, `RunRecord` and `ReplayCursor` are copied into `lib/town/session.ts` and extended there, and the village copy is untouched. No new tape, cache or inbox module is added.

- **RunRecord version.** `RECORD_VERSION = 2`.
- **RunMeta** gains:
  - `scenario`, `policy`, `ablations`, `minP`, `lifePace`;
  - `promptVersion`, `psycheRenderVersion`;
  - `parentRunId?`, `forkTick?`;
  - `lane` counts per lane.
- **Answer events** gain `lane`.
- **Lab mode.** `scripts/town/lab.ts` starts from the village's `scripts/lab.ts`, which already has lockstep `think` (answers are applied `think` ticks after the request is issued, in id order). The default becomes 2. A/B comparisons always run in lab mode.
- **Live mode** applies answers when they arrive and records the tick. It replays exactly, but live runs are never compared across arms.
- **World hash.** `hashWorld(world)` is FNV-1a over canonical JSON with sorted keys. It excludes `log` and `decisions[].state`, because the state text is recomputed on replay. The replay test asserts that the hashes match.
- **Fork.** `fork(record, tick, { interventions, seed })` works as follows:
  1. A `ReplayCursor` seeks to `tick`.
  2. The world and pending requests are copied with `structuredClone`.
  3. A new `Session` starts from that copy, with the event prefix copied and `parentRunId` and `forkTick` set.
  4. Calls after the fork are live.

  With the same seed, both branches share common random numbers.
- **Snapshots.** The `ReplayCursor` keeps a keyframe every 144 ticks. The browser also keeps a ring of snapshots every 36 ticks covering the last in-game day, for scrubbing.
- **Derived exports.** The lab writes `runs/<id>/events.jsonl`, `decisions.jsonl` and `metrics.jsonl` from a replay. They are derived from the record, not stored in it.

### 8.5 Module map

Every file below is in the town namespace, on the `town` branch. Each Slice A module is a file with one owner (section 8.6). The table lists what each exports. `lib/town/engine.ts` does orchestration only: `createWorld`, `step`, `applyAnswer`, `failRequest`, `toWire`.

| File | Exports (main) | Owner |
|:-|:-|:-|
| `lib/town/types.ts` | all types (4.3), `View` included | A0 |
| `lib/town/jev/schema.ts` | the wire contract (4.2), with `VERB_PARAMS` | A0 |
| `lib/town/tuning.ts` | every constant in section 13, typed as `TUNING` | A0 |
| `lib/town/rng.ts` | `rand`, `gauss`, `pickIndex` (working, not stubs) | A0 |
| `lib/town/ids.ts` | `nextId(world, prefix)` (working) | A0 |
| `lib/town/hooks.ts` | `HOOKS`: typed hook points that the engine calls (`afterReflect`, `afterChoice`, `afterEvent`, `nightly`), pre-wired by A0 to their owners' exports, such as `lib/town/drift.ts` | A0 |
| `lib/town/runs/store.ts` | `saveRun`, `listRuns`, `loadRun` over the blob prefix `town-runs/`: a working copy of the village's `lib/runs/store.ts` with the town `RunRecord`. **Frozen interface** | A0 |
| `lib/town/fixtures.ts` | `tinyWorld()`: 3 people, 1 store, 1 home and a 16 x 10 map, for unit tests before A2 lands | A0 |
| `lib/town/psyche.ts` | `makePsyche`, `psycheLines(p, stage)`, `needRates`, `mattersLevel`, `inheritPsyche`, `driverWeights`, the psyche word lists, `PSYCHE_RENDER_VERSION = 2` | A1 |
| `lib/town/drift.ts` | `reflectDrift`, `habit`, `lifeEvent`, `CHANGE_DELTAS` (copied from the village), and the caps; called only through `HOOKS` | A1 |
| `lib/town/jev/words.ts` | `needWord`, `NEED_NAMES`, level word lists (feel, trust, credence, impact, effort, meaning), `mattersWord` | A1 |
| `lib/town/lab/dilemmas.ts` | the A0 dilemma battery (11.1) | A1 |
| `lib/town/map.ts` | from the draft `lib/sim/town-map.ts`: `TOWN_W = 48`, `TOWN_H = 30`, `TILE`, `buildTownMap()`, `isTownWalkable`, `GRAVE_SLOTS`, `BUILDING_NAMES`, `STORE_LABELS`, `POI_NAMES`; plus `moveCost`, `blocksSight` | A2 |
| `lib/town/jobs.ts` | from the draft `lib/sim/jobs.ts`: `JOBS` (as `JobDef`), `weekday`, `onShift`, `shiftPhrase`; plus `START_POSTS`, `isPostedOpen`, `isUnlocked`, `PATROL_LOOP` | A2 |
| `lib/town/cast.ts` | `FOUNDERS: Persona[]` (history and character split, 3.1), `STRANGERS`, `HOUSEHOLDS`, `START_STORES` (2.3) | A2 |
| `lib/town/clock.ts` | the village clock, plus `ageYears`, `stageOf`, `bornTickFor`, `yearsToDays`, `TICKS_PER_DAY` | A2 |
| `lib/town/geometry.ts` | the village geometry, plus `lineOfSight`, `slowTicksFor` | A2 |
| `lib/town/view.ts` | `buildView(world, agentId): View` | A3 |
| `lib/town/perception.ts` | `perceive(view, ablations, situation): PerceiveResult`, `perceiveOmniscient` (control) | A3 |
| `lib/town/describe.ts` | `describeStatus`, `describeLocation`, `describeActivity`, `tieLine`, `claimSentence`, `sourcePhrase`, `lastSeenLine`, `priceLine`, `cueWords`; used by the prompt and the UI | A3 |
| `lib/town/memory.ts` | `remember`, `nightlyDecay`, `promptMemories`, `SALIENCE` | A3 |
| `lib/town/actions.ts` | `ACTIONS`, `renderOption` (pure, and imported by the route) | A4 |
| `lib/town/options.ts` | `buildOptions(view): { options; subs; forced }` | A4 |
| `lib/town/needs.ts` | `decayNeeds`, `restore`, `recomputeSecurity`, `healthStep`, `urgency`, `bodyAlarm` (both verbatim, 5.1.3) | A5 |
| `lib/town/economy.ts` | `transfer`, `postedPrice`, `priceOptions` (merged tiers, 2.3), `deliveries`, `payroll`, `spoilage`, `applySetPrices`, `applyAcceptSale`, `applyServe` | A5 |
| `lib/town/work.ts` | `startShift`, `workTick`, `endShift`, `dutyTriggers`, `noShowCheck` | A5 |
| `lib/town/projects.ts` | `workProjectTick`, `completeProject`, `projectLine` [A1.1] | A5 |
| `lib/town/jev/kinds/duty-prices.ts`, `duty-serve.ts` | question builders for `set_prices` and `serve` | A5 |
| `lib/town/knowledge.ts` | `emit` (full version), `witnessPass`, `discoverPass`, `believe`, `updateLastSeen`, `readNotices`, `readPrices` | A6 |
| `lib/town/talk.ts` | `startApproach`, `arrive`, `applyEncounter`, `endTalk`, `overhear` | A6 |
| `lib/town/opinion.ts` | `applyFound`, `applyExpressed`, `applyStanceAfter` | A6 |
| `lib/town/ties.ts` | `applyFeel`, `applyTrust`, `familiarityTick`, `initTies` | A6 |
| `lib/town/reflect.ts` | `issueReflect`, `applyReflect` (the Increment 3 logic, adopted) | A6 |
| `lib/town/school.ts` | `lessonTrigger`, `applyLesson` [A1.3] | A6 |
| `lib/town/jev/kinds/encounter.ts`, `reflect.ts`, `found.ts`, `duty-lesson.ts` | question builders | A6 |
| `lib/town/justice.ts` | `fileReport`, `applyIntake`, `issueResolution`, `applyResolution`, `applyTestimony`, `applyPayFine`, `applyArrestReply`, `applyPressArrest`, `jailTick` | A7 |
| `lib/town/life.ts` | `naturalDeath`, `bodiesPass`, `applyBurial`, `graveVisit`, `plantFlowers`, `griefTick`, `estate` [A1.2] | A7 |
| `lib/town/clinic.ts` | `triageTrigger`, `applyTriage`, `applyClinicFee` [A1.2] | A7 |
| `lib/town/jev/kinds/duty-case.ts`, `duty-triage.ts` | builders for `case_intake`, `case_resolution`, `press_arrest`, `triage` | A7 |
| `lib/town/engine.ts` | `createWorld`, `step`, `applyAnswer`, `failRequest`, `toWire`, the `APPLY` registry | A8 |
| `lib/town/sampling.ts` | `sampleChoice`, `sampleBoolean`, `scoreEV`, `sampleScore` | A8 |
| `lib/town/session.ts` | `Session`, `ReplayCursor`, `fork`, `hashWorld`, `RECORD_VERSION = 2` (copied from the village's `lib/sim/session.ts`, then extended) | A8 |
| `lib/town/jev/prompt.ts` | `buildState` (section order 7.11, with the verbatim body alarm), `JEV_MODEL` | A8 |
| `lib/town/jev/kinds.ts`, `lib/town/jev/kinds/decide.ts`, `lib/town/jev/kinds/duty.ts`, `lib/town/jev/kinds/assess.ts` | registry, the decide builder, duty dispatch, the assess builder | A8 |
| `lib/town/jev/call.ts`, `app/api/town/jev/route.ts`, `app/api/town/lab/route.ts` | `runTownJev` (caps, lane); the public route (typed options, no instrument lane, rate limits, 413 and 429); the local-only lab route (4.2) | A8 |
| `lib/town/metrics.ts` | `METRICS` (9.7), `sampleMetrics` | A9 |
| `lib/town/interventions.ts` | `intervene(world, iv)` | A9 |
| `lib/town/scenarios.ts` | `SCENARIOS: Record<ScenarioId, ScenarioParams>`, `resolveScenario(config)` | A9 |
| `lib/town/policies.ts` | `syntheticAnswer(policy, world, req)` for random and needs_greedy | A9 |
| `lib/town/digest.ts` | `digestTown(world, title)` for `assess` (the village's `digestRun`, rebuilt) | A9 |
| `lib/town/lab/probes.ts`, `lib/town/lab/report.ts` | perturbations, TV and JS distance, bootstrap CIs, scorecard | A9 |
| `scripts/town/lab.ts`, `scripts/town/probe.ts`, `scripts/town/report.ts` | headless runner (from the village's `scripts/lab.ts`), probe runner, report | A9 |
| `components/town/*`, `app/town/page.tsx`, `app/town/runs/*`, `app/api/town/runs/*` | UI (section 10). `components/town/sprites.ts` imports the village's `PAL` and sprite maps read-only, and adds the town set | A10 |

### 8.6 Agents, order and rules

**Where the town is built.** The town is built beside the village, not over it:

- **Namespace.** Town code lives only in `lib/town/**`, `components/town/**`, `app/town/**`, `app/api/town/**`, `scripts/town/**` and `tests/town/**`.
- **Read-only imports.** Town code may import these village modules unchanged: `lib/jev/gateway-key.ts`, `components/ui/*`, and the pixel maps and `PAL` in `components/sandbox/sprites.ts`. Nothing in the village imports the town.
- **Branch and deploys.** All town work merges into a long-lived `town` branch. Vercel builds a preview deploy of every push to it, and the preview environment already has `AI_GATEWAY_API_KEY`. Production keeps serving the village from `main`.
- **Switch-over.** `main` takes the town in one merge, only after A8 has integrated and A1-min has passed P1 to P4 on the preview. At that merge `app/page.tsx` renders the town, and the village moves to `/village`, otherwise unchanged, for comparison. Deleting the village is a separate, later decision.

| Agent | Scope | Starts after |
|:-|:-|:-|
| A0 Contracts | `types.ts`, `schema.ts`, `tuning.ts`, `rng.ts`, `ids.ts`, `hooks.ts`, `runs/store.ts`, `fixtures.ts`, `tests/town/rng.test.ts`. Also moves the draft `lib/sim/town-map.ts`, `lib/sim/jobs.ts` and `tests/town-map.test.ts` into `lib/town/map.ts`, `lib/town/jobs.ts` and `tests/town/map.test.ts`, once step 0 has agreed that handover (A2 then owns them). **Hub functions ship working, not as throwing stubs:** `rand`, `nextId`, `emit` (records the event with its witnesses as given, but runs no witness pass), `transfer` (moves goods and coins with conservation, and emits the event), a trivial `buildView` (self facts only, with `seeing` empty), identity describers (`describeStatus` returns `status.kind`, `describeLocation` returns the building name or "outdoors"), a skeleton `createWorld` (cast, map, stores, posts) and a `step` that advances the clock and needs. Only leaf mechanics that no other agent's tests call may be throwing stubs. A0 pre-creates the `APPLY` and kinds registries and the `HOOKS` registry, with every Slice A kind and hook wired. | step 0 (first, half a day) |
| A1 Psyche | psyche, drift, words, dilemmas; `tests/town/psyche.test.ts` | A0 |
| A2 World | map, jobs, cast, clock, geometry; `tests/town/world.test.ts`, `tests/town/map.test.ts` | A0 |
| A3 Perception | view, perception, describe, memory; `tests/town/perception.test.ts` | A0 (uses `fixtures.ts`, then A2's map) |
| A4 Options | actions, options; `tests/town/framing.test.ts` | A0 |
| A5 Economy and body | needs, economy, work, projects, the prices and serve builders; `tests/town/economy.test.ts`, `tests/town/projects.test.ts` | A0 |
| A6 Social | knowledge, talk, opinion, ties, reflect, school, the encounter, reflect, found and lesson builders; `tests/town/knowledge.test.ts`, `tests/town/talk.test.ts` | A0 |
| A7 Justice, clinic and life | justice, clinic, life, the case and triage builders; `tests/town/justice.test.ts`, `tests/town/life.test.ts`. A7 unit-tests its handlers against A0's working hub functions, and **its chain tests run only after A5 and A6 merge**, because theft needs `transfer` and discovery from them | A0; chain tests after A5 and A6 |
| A8 Engine and wiring | engine, sampling, session, prompt, kinds, call, both routes; `tests/town/sim.test.ts` (replay), `tests/town/events.test.ts`, `tests/town/prompt.test.ts`, `tests/town/integration.test.ts` | A0; integrates last, after A5, A6 and A7 |
| A9 Lab | metrics, interventions, scenarios, policies, digest, lab, probe and report scripts; `tests/town/metrics.test.ts`. **The sole editor of `AGENTS.md` after the freeze**: it adds the town section, and it fixes the validation lines that still name the deleted `scripts/headless.ts` | A0 |
| A10 UI | `components/town/**`, `app/town/**`, `app/api/town/runs/**`; `tests/town/sprites.test.ts`, the town twin of the village's `tests/sprites.test.ts`, which is where the pixel-map test really lives (`tests/sim.test.ts` has only a duplicate block). At switch-over A10 also takes over `tests/sprites.test.ts` | A0; reads only exported describers and types |

**Rules for the agents:**

1. **Contracts are frozen.** After A0 merges, `types.ts`, `schema.ts`, `tuning.ts`, `hooks.ts` and the `lib/town/runs/store.ts` interface change only through a contracts pull request that the A0 owner reviews. A module that needs a new field asks A0 and never edits the contract itself.
2. **Registration without shared files.**
   - Modules never edit `engine.ts`, `kinds.ts`, `hooks.ts` or `tuning.ts` to register themselves. A0 pre-wires every Slice A kind and hook. A8 is the only editor of `engine.ts`.
   - The engine reaches drift and other cross-module effects only through `HOOKS`. So `lib/town/drift.ts` (A1) never needs an edit to `engine.ts` (A8), and A8 never imports `drift.ts` directly.
   - A mechanic's question builder lives in its own `lib/town/jev/kinds/<file>.ts`, owned by that mechanic's agent.
3. **One tree, several sessions.** Claudio runs several Claude sessions on the same repository, and one of them was converting the village in place at 19:27 (header).
   - Nobody edits village files on the `town` branch: `lib/sim/**`, `lib/jev/**`, `lib/runs/**`, `components/sandbox/**`, `app/page.tsx`, `app/api/jev/**`, `app/api/runs/**`, `app/runs/**`, `scripts/lab.ts`, `tests/sim.test.ts` and `tests/sprites.test.ts`. The one exception is the switch-over merge.
   - Every agent works in its own git worktree, on a branch off `town`.
   - Agents stage only their own files, never stage everything at once, and never amend a commit on a shared tree.
   - Before starting, each agent checks `ListAgents` and agrees ownership of any file another live session is touching.
4. **Merge order.** Step 0 (11.0), then A0, then A2 and A1, then A3, A4, A5, A6, A9 and A10 in parallel, then A7's chain tests, then A8 integrates. Every merge into `town` passes `bun test` and `bun run typecheck` (the package script for `tsc` without emit) **for the whole repository, village included**. That rule can hold because the village's types and tests are untouched, and A0's hub functions work.
5. **Style.** The shadcn preset `b1PzeK` is backed by Base UI: never `asChild`, compose with `render`, menu items use `onClick`. No em dashes and no double hyphens anywhere, including in code comments.

## 9. Experiment platform

Everything in this section is an engine or lab function that runs headless. The UI (section 10) only calls it.

### 9.1 Scenario presets (`lib/town/scenarios.ts`)

```ts
import type { IssueId, JobId, RankId } from "./jev/schema"
import type { PsycheSpec } from "./psyche"
import type { Intervention, OrdinanceKind, ScenarioId } from "./types"

type Delivery = { qty: number; unitCost: number; everyDays: number }
export type ScenarioParams = {
  id: ScenarioId
  lifePace: number                                   // years per day (2.4)
  cast: {
    founders: string[]
    /** A swapped psyche brings its `character` line with it (3.1). */
    psycheOverrides: Record<string, PsycheSpec | { copyFrom: string }>
    postOverrides: Record<string, { jobId: JobId; rank: RankId } | null>
  }
  economy: {
    groceries: Delivery; drinks: Delivery; countyGrant: number; startTreasury: number; bushes: number
    taxRate: number; payScale: Partial<Record<RankId, number>>; buyPrice: number; mealUnitCost: number; clinicFee: number
  }
  institutions: { police: boolean; creditMode: "public" | "anonymous"; ballot: "open" | "secret"; ordinances: OrdinanceKind[] }
  issues: IssueId[]
  fixedStances: Record<string, Partial<Record<IssueId, number>>>
  schedule: { atTick: number; intervention: Intervention }[]
  flags: { deprivationDeath: boolean; infantMortality: boolean; violence: "off" | "adjacent"; reproduction: boolean; migration: boolean; stanceModel: "jev" | "deffuant" | "degroot" | "frozen"; beliefInertia: number }
}
export declare const SCENARIOS: Record<ScenarioId, ScenarioParams> // the compiler checks every id has a preset, and every preset an id
```

| id | Differs from `fernhollow` | Question it serves |
|:-|:-|:-|
| `fernhollow` | The default, and **free of scripted shocks**: the section 3 cast; groceries 12 a day at 3 (Mon to Sat); drinks 12 a day at 2; grant 120; treasury 600; 6 bushes; tax 0.1; buying price 2; meal unit cost 3; clinic fee 10; police on; public credit; open ballot; `lifePace` 0.25; issues `[justice]` (Slice A), then all 5 (Slice B); an empty schedule | the baseline town |
| `slice_a_beats` | `fernhollow` plus two day-2 beats: `supply_shock(days 1, factor 0.3)` at tick 287 (day 2, 6:55 am, so it cuts that morning's truck) and `natural_death(bram)` at tick 324 (day 2, 10 am). The A1.2 runs and the Slice A gate runs use it | the Slice A beats: shortage prices, death, burial and grief |
| `lean_times` | groceries 6 every 2 days; drinks 6 a day; bushes 3; grant 60 | scarcity: theft, gouging, gifts, dependants fed |
| `role_swap_officer_teacher`, `role_swap_shop_doctor`, `role_swap_mayor_carpenter` | `psycheOverrides` swap the two psyches, and each psyche carries its `character` line. Bodies, posts, `history` and ties stay | E2 role against person |
| `clones` | all 13 adults get `makePsyche({})`, the population middle, with `character` blank | control for individuality |
| `no_psyche` | `ablations.psyche = "none"` | ablation baseline |
| `gentle_town` | every adult: agreeableness 75 or more, benevolence 80, dark 10 | mix |
| `hard_town` | mayor, officer, shopkeeper and innkeeper get Sable's dark profile (machiavellianism 85, narcissism 60, psychopathy 38, agreeableness 15) | mix |
| `two_cultures` | north homes get Odile's foundations; south homes get Lark's | polarization |
| `sampled` | adult psyches drawn from Beta(4,4) x 100 for big5, values and foundations, and Beta(2,6) x 100 for dark, on the `spawn` stream; `character` blank | statistics across seeds |
| `no_police` | the chief and deputy posts are vacant. Odile holds a second `fisher` post (self-employed; the pond takes any number of fishers), so no new job is needed | E6 justice without police |
| `the_stranger` | Slice C: `add_stranger(rook)` at day 3, 9 am; Rook has machiavellianism 75 and psychopathy 50 | tribalism, integration |
| `open_ballot` / `secret_ballot` | the `institutions.ballot` switch | E3 conformity |
| `heritable_only` / `culture_only` | Slice C, generational, at `lifePace` 1: children inherit only the genome, or only inherit through upbringing (big5 at 50) | genes against culture |
| `long_history` | `lifePace` 4; demos only, never an experiment arm | watching generations pass |

### 9.2 Conditions any preset can cross with

- **Ablations** (the `Ablations` type):
  - `psyche`: full, character_only or none;
  - `perception`: honest or omniscient;
  - `optionOrder`: shuffled or fixed;
  - `optionDetail`: full or label_only;
  - `motiveReadout`;
  - `memoryRecall`;
  - `caps`: 1 or 2;
  - `driftModel`: jev (default), engine or off.
- **Settings:**
  - `minP` from 0 to 0.5 (default 0.25);
  - `policy`: jev, random or needs_greedy;
  - `lifePace`: 0.25 (the default for institution presets), 0.5, 1 (generational presets) or 4 (`long_history` only);
  - `think`: the lockstep tick count;
  - the `stanceModel` flag;
  - the `beliefInertia` flag.
- **Mixing arms.** A run uses exactly one value of each. Arms are never mixed inside a run.

### 9.3 Observer interventions (`lib/town/interventions.ts`)

Every intervention is recorded in the `RunRecord`, applied at its tick, and logged as an `observer` event. Characters meet it only as an in-world fact. Nobody is ever told that an observer acted.

| Intervention | Effect on world state | How it enters perception |
|:-|:-|:-|
| `famine`, `bounty` (kept) | berry bushes emptied, or filled to 3 | seen at the bushes |
| `supply_shock {days, factor}` | the next `days` deliveries bring `factor` times the usual load | the shopkeeper sees the smaller delivery; customers see thin shelves and prices; others hear it |
| `natural_death {agentId}` | the person dies where they stand; a body appears | seen in sight; kin get an absence cue |
| `drop_items {storeId, item, qty}` | items added | the owner notices the surplus: "More groceries on the shelf than you remember stocking" |
| `remove_items {storeId, item, qty}` | items removed; no culprit exists | discovered as a shortfall, a phantom theft with `eventId` null; tests scapegoating |
| `plant_rumour {hearerId, claim}` | a `Claim` with origin `traveller` | "A traveller passing through told you that {claim}"; credence comes from the hearer's own `believe` answer |
| `vacate_job {postId}` [B] | the holder is unemployed, the post is vacant, a notice is posted | read on the board, and seen at the closed workplace |
| `sickness {agentId}` [B] | the person becomes sick, and contagion begins | cue: "looks unwell" |
| `set_param {key, value}` [B] | a whitelisted tuning key changes, for example the grant | a notice only if the key is a posted fact, such as the tax or the clinic fee |
| `edit_psyche {agentId, path, value}` [B] | the psyche field is set | nothing. The person simply is different, which is the treatment |
| `impose_ordinance {ordinance, sanction}` [B] | an `Ordinance` with `source: "county"` comes into force; it binds like a voted one, and the council may later vote to repeal it | a posted notice of kind `county` on the board: "A notice from the county: no stealing in Fernhollow; the sanction is a fine." It is read like any notice, so it is known only to those who read it or are told |
| `repeal_ordinance {ordinanceId}` [B] | the ordinance's status becomes `repealed` | a posted `county` notice: "The county has lifted the curfew." |
| `add_stranger {personaId}` [C] | the person arrives at the county road | seen, then told |
| `fire {buildingId}` [C] | the building burns: occupants must leave, its stores are lost, and it needs a rebuild project | seen and heard within 6 tiles |

### 9.4 Snapshots, forks and seeded replay

Section 8.4 has the mechanics. Headless, the lab offers:

- `bun scripts/town/lab.ts fork=<runId>@<tick> intervene=plant_rumour:...`
- `bun scripts/town/lab.ts replay=<runId>`, which re-runs with 0 JEV calls and prints the hash and the desync count.

The browser offers "Fork from here" at any keyframe, and a side-by-side view of two branches on a shared clock (section 10.4).

### 9.5 Baselines and ablations

| Policy | What it does |
|:-|:-|
| `random` | Uniform over the offered options. Booleans at 0.5. Uniform scores. |
| `needs_greedy` | A documented heuristic. It picks the option whose `ACTIONS` effects most improve the lowest need, weighted by the person's own need rates; ties go by `rand(choice)`. On booleans it engages if social is below 50. It tells the truth, opens every case, and resolves by fining the reporter's top suspect. |

- **How baselines run.** Each policy feeds synthetic `JevAnswer`s through the same `Session` path, so records, replay and metrics are identical. `RunMeta.policy` labels every run, so a baseline cannot be mistaken for JEV.
- **Offline scoring.** Both policies are also scored offline on a JEV run's recorded option sets, at 0 calls, to give `greedy_agreement`.
- **Economy calibration comes first.** Before any JEV spend on a new economy setting, run `needs_greedy` over 5 seeds for 7 days. Tune the section 13 economy constants until every check holds:
  - nobody collapses under greedy play;
  - **every till and the treasury stay non-negative for all 7 days, and no delivery, payroll or tax is ever cut to partial**. The safety valves in 2.3 exist for JEV runs, and the default economy must not lean on them;
  - private money stock (`money_stock`) grows by no more than 30% a week;
  - Hollis can afford 2 meals a day at steady effort;
  - **`take_offers_per_day` averages at least 1 across the 5 seeds**, so the theft chain has real opportunities (M23);
  - `lean_times` pushes greedy households below 1 food-day on at least 2 days.

  Then scarcity is real, but not fated.

### 9.6 Counterfactual probes (`lib/town/lab/probes.ts`, `scripts/town/probe.ts`)

A probe re-asks a recorded request with one pure, typed perturbation, in lane `instrument`. It is never applied to the world. Results are summarized as total variation (TV) distance, plus whether the chosen option moved in the expected direction.

| Probe | Perturbation | Tests |
|:-|:-|:-|
| `identical` x3 | the same request again | JEV self-noise, the noise floor for every other probe |
| `reorder` | options reversed | position bias |
| `opaque_ids` | option ids replaced by o1 to oN | leakage through id wording |
| `distractor` | one irrelevant option added | IIA: the ratios among the original options should hold |
| `co_batch` | the main question asked alone, with sub-questions and ride-alongs removed | interference between co-batched questions |
| `swap_psyche:<id>` | another person's psyche | whether character matters |
| `blind` | psyche null, `character` empty (`history` kept) | JEV's prior with no persona |
| `edit_need:<k>:<delta>` | one need moved by 40 | circumstance read in the expected direction |
| `drop_fact:<tag>` | one provenance-tagged line removed | grounding in that fact |
| `drop_kind:<section>` | a whole section removed: memories, beliefs, people, town or life | which kind of information matters |
| `tie_words:<id>:<liking>` | one tie line rewritten | corruption and favouritism gaps for officers, shopkeepers and doctors |
| `swap_asker` (encounter) | the asker replaced by someone with the opposite tie | relationship sensitivity |
| `attribute` | `drop_fact` over each driver's fact group (5.1.5) | revealed drivers |

**Sampling plans:**

- **Standard plan, per psyche-on run.** A random 30 decisions each get `swap_psyche`. A random 20 decide calls get each of `identical` x3, `reorder`, `co_batch` and `edit_need`, all on the lowest need.
- **High-stakes plan.** For every `take_<store>` and `pickpocket_<id>`, `serve`, `pay_fine`, `press_arrest`, `triage`, `case_intake`, `case_resolution`, any testimony lie, and from Slice C every strike and consent, run `blind`, `swap_psyche`, and `drop_fact` on the most recent fact about the target.

### 9.7 Metrics catalog (`lib/town/metrics.ts`)

Metrics are pure functions of `world` plus the event log, sampled every 12 ticks. Every metric is either a *level* (averaged) or a *count* (differenced per day). The Flourishing and Conflict families always render at equal size.

| id | Family | Kind | Formula |
|:-|:-|:-|:-|
| `population` | demography | level | living agents |
| `deaths_by_cause` | demography | count | departures with reason died, by cause |
| `wellbeing` | flourishing | level | mean over agents of sum(w_k n_k)/sum(w_k), where w = 1 for body needs and w = `needRates` for mind needs |
| `meaning` | flourishing | level | mean of the last reflect meaning EV x 25 |
| `purpose_ok` | flourishing | level | share of adults with purpose at 50 or more |
| `project_units` | flourishing | count | project units added |
| `contributors` | flourishing | level | distinct contributors to open or finished projects |
| `volunteer_hours` | flourishing | count | unpaid project ticks / 12 |
| `dependants_fed` | flourishing | level | dependant-ticks with hunger 30 or more / all dependant-ticks |
| `family_meals` | flourishing | count | `family_meal` events |
| `gifts` | flourishing | count | `gift` events |
| `gratitude` | flourishing | count | `grateful_to` answers other than nobody, plus `thank_warmly` |
| `burial_delay` | flourishing | level | ticks from death to burial (reported) |
| `grave_visits` | flourishing | count | grave visits |
| `flowers` | flourishing | count | `flowers` events [A1.2] |
| `treatments`, `treat_unpaying_mass` | flourishing | count, level | treatments given; mean p(`treat_now`) over triage calls where the patient said they cannot pay [A1.2] |
| `lessons`, `lesson_mix` | flourishing | count, level | lesson duties answered; the share of each lesson topic [A1.3] |
| `forgiveness_rate` | flourishing | level | grudges ended by a `forgive` event within 7 days / grudges formed [A1.3] |
| `outlook` | flourishing | level | mean `trust_people` EV of the last reflection, the measure of hope (5.1.5) |
| `thefts` | conflict | count | `theft` events |
| `thefts_unwitnessed` | conflict | count | thefts with no witnesses |
| `take_offers_per_day` | conflict | count | take and pickpocket options offered, split by whether the chooser could see anyone else. A reachability check: the calibration gate requires an average of at least 1 a day (9.5) |
| `restraint_rate` | conflict | level | 1 - takes / offers of a take option, split by whether the chooser could see anyone else (`restraint_watched`, `restraint_unseen`) |
| `take_mass` | conflict | level | mean p of take options over the decisions that offered them (propensity) |
| `take_expected` | conflict | count | sum of that p (expected thefts), shown next to `thefts` |
| `reports`, `cases_opened` | conflict | count | reports filed, intakes answered `open` |
| `intake_open_rate` | conflict | level | opened / intakes |
| `clearance` | conflict | level | resolutions naming the true actor / thefts |
| `wrongful` | conflict | count | resolutions against someone who is not the true actor |
| `lies_told`, `lies_caught` | conflict | count | `lie` events, `lie_exposed` events |
| `refused_service`, `fines_refused` | conflict | count | `refused_service` events; `pay_fine` answers of `refuse` |
| `corruption_gap` [B] | conflict | level | P(open \| reporter liked by officer, liking 0.3 or more) minus P(open \| liking below 0), from probability mass |
| `price_index` | economy | level | mean posted price / unit cost across the store, diner and inn |
| `wealth_gini` | economy | level | Gini over adults of wallet + value of carried goods + household pantry share, all at posted prices |
| `food_days_gini` | economy | level | Gini of food-days per person |
| `treasury`, `till_min` | economy | level | treasury coins; the lowest till balance of the day |
| `money_stock` | economy | level | coins in wallets, tills and stashes, excluding the treasury; its weekly growth is capped by the calibration gate |
| `partial_events` | economy | count | partial deliveries, payrolls and tax collections (2.3) |
| `mean_liking`, `mean_trust` | social | level | mean over directed adult pairs |
| `network_density` | social | level | directed pairs with liking 0.3 or more / n(n-1) |
| `reciprocity` | social | level | favours returned / favours received, from `World.favours` (the village metric, kept) |
| `polarization_<issue>` | opinion | level | variance of private stance positions; bimodality coefficient from Slice B |
| `falsification_gap` | opinion | level | mean absolute difference between private and last-expressed stance, for people who spoke in the last 2 days |
| `stance_behaviour_r` | opinion | level | Pearson r between justice stance and each person's enforcement acts (reports filed; for the officer, the share of arrests) (reported) |
| `enacted_<driver>` | drivers | level | the day's share of enacted driver mass |
| `psyche_expression` | drivers | level | mean Spearman correlation between `driverWeights` and the enacted mix, over reachable drivers only (5.1.5) |
| `greedy_agreement` | decision | level | JEV picks equal to the greedy pick / decisions (scored offline) |
| `entropy`, `confidence` | decision | level | mean normalized entropy of `action`, mean `typesafe.confidence` |
| `family_entropy` | decision | level | the population's entropy over picked option families per day, divided by the random baseline's on the same seeds. P7 gates on it |
| `person_diversity` | decision | level | distinct option families each person picked per day (reported per person, never gated) |
| `pruned_mass`, `pruned_mass_dark` | decision | level | mean min-p pruned mass, over all options and over take and lie options |
| `calls`, `cost_usd`, `latency_p50`, `latency_p95`, `errors` | JEV | count or level | as named |
| Slice B+ | institutions and life | | `turnout`, `mayor_legitimacy` (accept + 0.5 tolerate), `ordinances_in_force`, `enforcement_rate`, `time_to_sanction`, `half_life`, `promotions`, `embezzled`, `unvoted_appointments`, `festivals`, `attendance`, `skill_gains`, `debt_total`, `loans`, `loans_steep`, `defaults`, `fraud`, `bribes_offered`, `bribes_accepted`, `strike_days`, `births`, `children_raised`, `groups`, `modularity`, `in_group_bias`, `bloc_adherence`, `purse_flows`, `feuds`, `violence_rate`, `banishments`, `tom_accuracy`, `suspicion_accuracy`, `rumour_reach`, `belief_accuracy` |

**The A1-min dozen.** The first headless slice (11.1) implements only these 12, plus the JEV counters (`calls`, `cost_usd`, `latency_p95`, `errors`): `population`, `wellbeing`, `purpose_ok`, `dependants_fed`, `family_meals`, `take_offers_per_day`, `take_mass`, `thefts`, `cases_opened`, `price_index`, `treasury` with `till_min`, and `money_stock`. Every other row lands with the increment that makes it measurable.

### 9.8 Canonical experiments

Each experiment is written as a file `experiments/<id>.json` before it runs. The file holds the hypothesis, the expected direction, the primary metric, the window, the arms and the seeds. The report labels the primary metric confirmatory and every other metric exploratory.

| id | Arms | Primary metric | Pre-registered expectation |
|:-|:-|:-|:-|
| E1 Ring of Gyges | `fernhollow`, watched against unseen within runs; valid only once `take_offers_per_day` shows opportunities in both conditions | `take_mass` watched minus unseen | negative |
| E2 Role against person | `fernhollow` against the three `role_swap_*` presets, 5 seeds | the job performance measures (below) | decomposed into role and person variance |
| E3 Conformity [B] | `open_ballot` against `secret_ballot` | vote alignment with prior declarations | higher under open ballot |
| E4 Credit | `creditMode` public against anonymous | volunteer hours by the three highest-narcissism adults | higher under public credit (probe evidence 0.19 to 0.34) |
| E5 Lean times | `fernhollow` against `lean_times` | `take_mass`, `price_index`, `gifts`, `dependants_fed` | reported: no expected direction for gifts |
| E6 Justice without police [B/C] | `fernhollow` against `no_police` | confronts and grudges after thefts | more private confrontation without police |
| E7 Press freedom [B] | Crier stipend kept against cut | the Crier's `critical` angle mass on the mayor | lower after the cut |
| E8 Stranger [C] | `the_stranger`, with the `newcomers` issue | the stranger's liking in-degree after 5 days | reported |
| E9 Mixes [B] | `gentle_town`, `hard_town`, `two_cultures`, `sampled` x 5 seeds | wellbeing against thefts plus wrongful | reported |
| E10 Opinion models [B] | the `stanceModel` variants | polarization trajectory | JEV differs from Deffuant (TV of stance histograms at day 7) |
| E11 Generations [C/D] | 40-day runs at `lifePace` 1 (40 years, about two generations), `heritable_only` against `culture_only` | the child-parent stance correlation, set against child-peer and child-teacher | reported |

The job performance measures used by E2 are P(open), P(arrest), `price_index`, `treat_unpaying_mass` (P(treat now) when the patient says they cannot pay, measurable from A1.2), the lesson mix, and `volunteer_hours`. The role swaps move each psyche together with its `character` line and leave `history` with the body (3.1), so the swapped text is never contradictory.

### 9.9 Statistics and reports

- **Seeds.** Arms share seed lists, so comparisons use common random numbers.
- **Estimates.** Propensities are computed from probability mass (`take_mass`, P(open) and so on), so each decision contributes its whole distribution. That makes 3 to 5 seeds enough for usable intervals.
- **Output.** `scripts/town/report.ts experiment=<id>` prints, per metric:
  - the mean per arm;
  - a 95% bootstrap CI across seeds (2,000 resamples);
  - Cohen's d;
  - a pass mark or a blank against the pre-registered direction.
- **Authenticity scorecard** (from the Village Lab design). Thresholds are provisional until the Slice A evidence is in:

| Criterion | Threshold |
|:-|:-|
| Retest TV (reported) | 0.05 or less |
| Reorder TV | 0.10 or less |
| Co-batching TV | 0.10 or less |
| Psyche-swap TV | 0.15 or more, and at least 3 x the retest TV |
| Circumstance read (need edits move the expected option mass) | 80% or more |
| Greedy agreement band | 0.3 to 0.9 |
| Within-person entropy (no caricature) | above 0.3 nats |
| Blind human rating | JEV at least as good as greedy, and better than random (Slice D) |

## 10. Full-screen UI

The owner asked for a single full-screen viewport. The town UI lives at `app/town/page.tsx` and `components/town/**` on the `town` branch, and it becomes the root page only at switch-over (8.6). It is built in increment A1.4 (11.1), after the headless slices have run. The UI below is built from shadcn `b1PzeK` primitives that are already installed: `resizable`, `scroll-area`, `tabs`, `toggle-group`, `dropdown-menu`, `drawer`, `chart` (recharts), `badge`, `tooltip`, `command`, `sheet`. It follows the Base UI rules: use the `render` prop, never `asChild`, and give menu items an `onClick`. It adds no new dependencies.

### 10.1 Shell

- **Root.** The root is `h-svh overflow-hidden`, a grid with `grid-rows-[auto_1fr]`, at every breakpoint.
  - This replaces the village's `min-h-svh flex-col lg:h-svh`, which lets the page scroll below `lg`.
  - The page itself never scrolls. Every panel scrolls inside its own `ScrollArea`.
- **Top bar**, one row, wrapping at most once:
  - title;
  - clock with weekday ("Tue, day 2, 1:40 pm");
  - population;
  - calls today against the daily budget;
  - cost;
  - errors;
  - Play and Pause;
  - Step, which advances one tick;
  - speed 1x, 2x, 4x;
  - Sample or Top pick;
  - the view switcher: **World**, **Society**, **Experiment**;
  - Save run;
  - Runs.

  A manifest chip is always visible. It shows seed, scenario, policy, ablations, `promptVersion`, and whether the run is in lab or live mode, so every screenshot describes itself.
- **Desktop layout (1024px and wider).** A horizontal `ResizablePanelGroup` holds three panels:

  | Panel | Default width | Contents |
  |:-|:-|:-|
  | left rail | 200px, collapsible | roster grouped by household: avatar, name, job badge, mood dot, health bar, status verb |
  | center | the rest | the active view |
  | right | 400px | the inspector |

  A vertical `ResizablePanelGroup` inside the center puts the view above a **bottom dock**. The dock takes 28% by default and can collapse. Its tabs are Log, Metrics, Cases and Town.
- **Narrow layout (below 1024px).**
  - The center view sits on top at `55svh`.
  - Below it, a tabbed panel fills the rest: Inspector, Log, Metrics, Roster.
  - The Experiment and Society views open as full-height `Sheet`s.
  - The page still does not scroll.

### 10.2 World view

- **Canvas.** Today's camera already has fit, scroll-to-zoom, drag-to-pan and follow-selected. The static layer repaints whenever `world.mapVersion` changes, not only when the World object changes.
- **Map markers:**
  - building occupancy badges: a small count bubble on the roof, with tiny heads on hover;
  - a project progress bar over the footbridge lot;
  - the jail-bars icon on the police station while someone is jailed;
  - graves, drawn as headstones;
  - bodies, drawn as a desaturated figure lying down;
  - emote bubbles.
- **Overlay toggles** (toolbar and keys):

  | Key | Overlay |
  |:-|:-|
  | `r` | **Their eyes**: dims every tile outside the selected person's sight and draws faded "ghost" sprites at their last-seen positions, labelled with how long ago |
  | `t` | tie lines for the selected person: liking in green and red, trust as line weight |
  | `o` | colours every sprite by their stance on the chosen issue |
  | `c` | project progress |
  | `x` | **Truth**, for the observer only: unwitnessed thefts, and lies still in flight, marked with a small eye-slash |
  | `g` | group rings under sprites (Slice C) |

### 10.3 Society view

These are panels in a responsive grid. Each panel scrolls internally.

1. **Relationship graph.** A deterministic force layout (seeded, 200 iterations, positions cached per tick). Nodes are coloured by household, or by group from Slice C. Edges are liking of 0.3 or more; their weight shows trust. There are filters for "only kin" and "only conflict edges", which show liking below -0.2.
2. **Population and life timeline.** Population, with birth, death and arrival markers. Each marker opens the event in the log.
3. **Opinions.** A 5-bin histogram per active issue of private stances, with the last-expressed stances as an outline overlay. A daily sparkline shows polarization and the falsification gap.
4. **Institutions.**
   - The case pipeline: filed, open, resolved, wrongful. Wrongful is visible only in Truth mode.
   - Restraint rate, watched against unseen.
   - From Slice B: the mayor's legitimacy donut, ordinances with restraint and enforcement bars, and meeting records.
5. **Economy.** Wealth Gini, `price_index`, treasury, and a wallet distribution strip.
6. **Drivers.** A stacked area chart of the enacted driver share per day for the whole town. Per-person bars rank drivers, next to that person's `driverWeights`, and show the psyche expression index.

### 10.4 Experiment view

- **Scenario picker.** A `Command` palette over `SCENARIOS`, plus seed, `minP`, `lifePace`, policy (JEV sample or argmax live; baselines run only in the lab) and ablation toggles. "Start new run" resets the Session with that `WorldConfig`.
- **Intervention palette.** Pick a tool, then click the map, a building or a person. The palette offers every Slice A intervention: `famine`, `bounty`, `supply_shock`, `natural_death`, `drop_items`, `remove_items`, `plant_rumour`. The Slice B and C interventions are added as those slices land, including `impose_ordinance` and `repeal_ordinance` (the observer's "change a rule" tool, which enters the world as a county notice). Every use appears on the timeline.
- **Metric charts.** Two equal columns, **Flourishing** and **Conflict**, as recharts sparklines. Below them come rows for Economy, Opinion and Decision science, with JEV latency, entropy, confidence and pruned mass. The existing `MetricsPanel` sampling is reused.
- **Timeline scrubber.**
  - Shows keyframe ticks, intervention markers and event markers.
  - Scrubbing restores the nearest snapshot and replays forward with 0 calls.
  - "Fork from here" creates a new branch (section 8.4).
  - "Compare" overlays a second run's metrics from `/runs`.
- **Probe drawer (Slice B, local only).** Pick a recorded decision and a perturbation from 9.6, then run it on the instrument budget. It calls `app/api/town/lab/route.ts`, which exists only when `TOWN_LAB_ROUTE=1` on a developer machine. On the public site the drawer shows recorded probe results only. The two distributions show side by side, with TV and the noise floor.

### 10.5 Inspector, log and cases

- **Inspector tabs.**

  | Tab | Contents |
  |:-|:-|
  | Mind | 10 needs in two groups, Body and Mind, each with its "matters" dot and reason clause; health; mood; emotions |
  | Psyche | Slice 0's bars, plus the exact `psycheLines` sent to JEV, a drift sparkline with the causes, and trait chips |
  | Life | job, shift, pay, effort history, wallet, what they carry, household and dependants, skills |
  | Relations | the four tie dimensions per person, last seen, what they have told this person |
  | Knowledge | beliefs with source and credence; a truth column appears only when the observer toggles Truth |
  | Memory | recent and formative memories, with salience |
  | JEV | the decision card (below) |

  **The JEV decision card** contains:
  - the exact state, each line colour-coded by provenance tag, with the source shown on hover;
  - every question with its options in shown order, JEV's p, the min-p cutoff line, the roll u, the eligible set and the pruned mass, and the pick;
  - per-question confidence;
  - the answers to sub-questions and ride-alongs;
  - the greedy and random picks for the same option set;
  - the `promptVersion`;
  - from Slice B, a Probe button.
- **Log.** Filterable by tone (work, money, social, justice, life, good, conflict, observer), by person and by building. Each line links to its event and its decision.
- **Cases tab.** Every case is a card showing reporter, intake answer, interviews with their testimonies, the resolution, and all decision links.
- **Chronicle (Slice B).** Only high-weight beats:

  | Beat | Weight |
  |:-|:-|
  | death, birth | 1 |
  | arrest, election | 0.8 |
  | project done | 0.7 |
  | festival | 0.6 |

  Beats are grouped into threads by `decisionIds` and event causes.

### 10.6 New sprites and icons (`components/town/sprites.ts`)

All of these are 16px `fillRect` art in `PAL`, which `components/town/sprites.ts` imports read-only from the village's `components/sandbox/sprites.ts`. Many town sprites already exist in the in-place draft of that file (header), and step 0 hands them to A10. Any new pixel map goes into the town's `PIXEL_MAPS`, so `tests/town/sprites.test.ts` covers its width.

- **Tiles and structures:**
  - the building set: clinic (red cross), police (blue roof, star), town hall (columns, flag), school (bell), chapel (steeple), store (striped awning), diner (kettle sign), inn (lantern), Crier (paper sign), workshop (saw), farmhouse;
  - existing houses reused;
  - fountain, notice board, fence, field rows, creek water, ford stones, dock;
  - scaffold at 3 stages and a finished bridge;
  - grave headstone, empty lot marker.
- **People:**
  - job accessories as overlays:

    | Job | Accessory |
    |:-|:-|
    | officer | cap and badge |
    | doctor, nurse | white coat trim |
    | cook | apron |
    | mayor | sash |
    | farmer | straw hat |
    | fisher | rod over the shoulder |
    | teacher | book |
    | journalist | notepad |
    | innkeeper | towel on the shoulder |
    | carpenter | tool belt |

  - a child sprite (FRONT, BACK and SIDE with two rows trimmed); an elder with grey hair and a cane;
  - collapsed: lying down; body: lying down and desaturated;
  - jailed: bars over the sprite inside the station.
  - Slice B and C: sick (green tint), injured (bandage), baby bundle, expecting (heart badge).
- **Emotes** (7x6 icons), added to `EmoteKind`:
  - coin (a purchase or sale), badge (police duty), cuffs (arrest), scales (hearing, Slice B), tear (grief), hammer (building or work), book (school), speech with "!" (sharing news), speech with scales (talking about a view), gift, eye (witnessed, from Slice 0), thanks (Slice 0), question (considering).
- **Overlays:** the occupancy badge, the progress bar, the Their-eyes dim mask with ghost sprites, and the Truth eye-slash. Slice C adds weather (rain streaks and snowflakes) and group banners (a coloured ring and flag).

### 10.7 Legibility at 1x with 15 people

- **Name tags** show only on hover or selection. Speech bubbles use icons, never text.
- **Log lines.** One per event. Movement is never logged.
- **Following.** The follow camera is on by default, on the selected person.
- **Holding the clock.** An optional "hold the clock on justice beats" pauses the run for 2 s when an arrest, a case resolution or a death happens. This belongs to the UI only and is never an evidence gate.
- **Keyboard shortcuts:**

  | Key | Action |
  |:-|:-|
  | space | pause |
  | `.` | step |
  | 1, 2, 4 | speed |
  | `[` `]` | cycle through people |
  | `r t o c x g` | overlays |
  | E | Experiment view |
  | S | Society view |
  | W | World view |

## 11. Build plan

### 11.0 Step 0: freeze the village and settle the live collision

No agent in section 8 starts until these steps are done. Each one either changes nothing on `main`, or is done by the owner of the tree it touches.

1. **Agree ownership first.** Run `ListAgents`. Message the session that was converting the village in place (header) and agree three things with it before anything else: the village is frozen at `105aa84`; the in-place town draft does not go to `main`; and it hands its reusable parts to the town (step 5).
2. **Park the draft.** The draft's owner, and only the draft's owner, commits the in-place work to a branch named `town-inplace-draft`, never to `main`. That owner then returns their working tree to `105aa84`. Nobody else resets or stashes a tree they do not own.
3. **Tag the village.** `git tag village-v3 105aa84`, then push the tag. Production keeps serving `105aa84` from `main`.
4. **Open the town branch.** Create `town` from `village-v3` and push it. Vercel builds preview deploys for it; the preview environment already has `AI_GATEWAY_API_KEY`.
5. **Hand over the draft's reusable parts** into the town namespace, as that session agreed:

   | Draft part | Becomes |
   |:-|:-|
   | `lib/sim/town-map.ts` | `lib/town/map.ts` |
   | `lib/sim/jobs.ts` | `lib/town/jobs.ts` |
   | `tests/town-map.test.ts` | `tests/town/map.test.ts` |
   | the 15 founders in its `personas.ts` | the data for `lib/town/cast.ts` |
   | its town sprites | `components/town/sprites.ts` |

   Its in-place `engine.ts` stays on `town-inplace-draft`, as reference material for A5 to A8. Its 1-day run record stays as prior evidence (6.3).
6. **Record prior evidence from the frozen village.** Run the village's own `scripts/lab.ts` for 2 days on 2 worlds at seed 7, with drift `jev` and the assess flag on, and again with drift `off`. Its flags take the double-dash form documented at the top of that script. Keep both records.
7. **The old Slice 0 fix list is not applied to the frozen village:**
   - Items 1 to 3 (the motive flag, the machiavellianism wording, semicolons in `psycheLines`) are built into the town (4.1, 5.1.2).
   - Item 4 (drop the character-outcome gate) is a town rule: P7 below gates on none.
   - Item 5 (engine drift behind a flag) is already done: Increment 3 made engine drift an explicit `DriftModel` arm, with `jev` as the default.
8. **After the freeze**, `main` takes only fixes that keep production working. Only A9 edits `AGENTS.md`, on the `town` branch.

### 11.1 Slice A: town vertical slice

Slice A follows the dogfood rule. The smallest real end-to-end slice runs against real JEV first, and each later increment is rerun on the same seeds, so the real system can overturn the design before breadth accumulates. The order is: **A0**, then **A1-min**, then increments **A1.1 to A1.4**, and then the **Slice A gate runs**. Each increment makes at most one evidence-backed change to earlier work, bumps the relevant version, and reruns.

**A0: psyche probe gate on town dilemmas.** Build `lib/town/psyche.ts` v2, plus `lib/town/lab/dilemmas.ts`, plus the battery mode of `scripts/town/probe.ts`. There are no world changes. Each dilemma is a hand-built perception: the person's own psyche, name, `history` and `character`, and a shared hypothetical role line such as "You are minding the store today".

| id | Situation | Options (target option in bold) | Variants |
|:-|:-|:-|:-|
| D1 `shoplift_friend` | While Sable is out, you see someone you like slip 2 groceries into a bag | stop_them, report_later, **say_nothing**, take_something_too | another customer in sight / nobody else in sight |
| D2 `shortage_prices` | You are minding the store; the truck brought 6 of 12 groceries | the distinct price options of 2.3 at unit cost 3: 3, 4, 5, **6 (twice cost)** | Juniper is in the store / nobody is |
| D3 `unpaid_patient` | You are covering at the clinic; a patient who says they cannot pay needs care; the fee is 10 | **treat_now**, ask_payment_first, send_away | Juniper is present / nobody is |
| D4 `hungry_unwatched` | Hunger 20, 2 coins, the store is unattended | **take_shelf**, leave, wait_for_sable, ask_for_help | another customer in sight / nobody |
| D5 `testimony_friend` | Odile asks about a theft you saw a friend commit | tell_truth, **say_saw_nothing**, name_someone | the friend is in the room / is not |
| D6 `bridge_span` | The footbridge span needs a second pair of hands now; you have 2 free hours | **help**, walk_on, go_to_bar, go_home | Wren is there waiting / nobody is |

D3's wording is reused word for word by the A1.2 `triage` duty.

A0 cost:

| Batch | Calls |
|:-|:-|
| 13 adult psyches x 6 dilemmas x 2 variants | 156 |
| blind (psyche null): 13 x 6 x the unseen variant | 78 |
| noise floor: 12 random pairs x 3 identical re-asks | 36 |
| need edit: D4 at hunger 80, x 12 | 12 |
| **Total** | **282** |

That is about $0.01 to $0.02, and about 3 minutes.

A0 passes when all of these hold:
- (a) Across psyches, the spread of p(target) is at least 0.20 in at least 4 of the 6 dilemmas.
- (b) The blind arm cuts that spread by at least 50%.
- (c) The median TV of the identical re-asks is below 0.05. This is the noise floor.
- (d) The median psyche-swap TV, computed from the battery, is at least 3 x the noise floor.
- (e) Raising hunger from 20 to 80 lowers `take_shelf` mass for at least 80% of psyches.

The watched against unseen differences, and every distribution, are reported but are not gates. If A0 fails, change only the `psycheLines` wording, bump the version, and rerun A0.

**A1-min: the headless town slice.** This is the first real run of the town world. It is headless, run through `scripts/town/lab.ts` only, with no UI at all. It contains:

- the 48 x 30 map and the 15 founders, with their households, posts, psyches, `history` and `character`;
- needs physics, with the verbatim body alarm, urgency clauses and hours-to-collapse clause (5.1.3);
- honest perception (`buildView`, `perceive`) with provenance;
- the ACTIONS rows marked A1-min, and the typed option wire;
- shifts, wages, effort and payroll (M1, without `patrol`), and school attendance, where every block is a reading block;
- the store, the diner and the inn: `buy_*`, `dine`, `bar`, `sell_*` with `accept_sale`, `serve`, `set_prices` with honest tiers, `fetch_*` and `stock_*`, deliveries, tax, and the partial-payment rules (M3, 2.3);
- family meals and pantries (M10);
- `take_<store>`, owner-known discovery, `suspect`, `report` and `leave_note`, intake, questioning with testimony lies, resolution, `pay_fine`, and arrest with `press_arrest` and jail (M5, and M23's first half);
- C6 `found`, with the `founding` status, and C5 `reflect`, as adopted;
- keyed RNG, RunRecord v2, the replay hash, and the `needs_greedy` and `random` policies;
- the locked-down route, so that a preview deploy is safe even though A1-min runs headless;
- the A1-min dozen metrics (9.7).

**Before any JEV spend on A1-min:**

- P2, P3 and P4 must pass, on scripted and greedy runs at 0 calls.
- The A1-min chains of P5 must pass: theft to jail, a refused fine, a protest with `press_arrest`, a refused `accept_sale`, a price mismatch that cancels and re-decides, a family meal, `set_prices` after a short truck, and the starving render.
- The calibration gate (9.5) must pass over 5 seeds x 7 days of `needs_greedy`. That includes at least 1 take offer a day.

**Then the first real run**, about 700 calls and $0.02 to $0.06:

```
bun scripts/town/lab.ts scenario=fernhollow days=1 worlds=2 seed=7 think=2 experiment=a1-min
```

P1 is checked on this run. Everything else is reported, and the printout (12.2) is read before any increment starts.

**Increments.** Each is rerun on the same seeds (worlds 2, seed 7), against its predecessor's record:

| Increment | Adds | Rerun |
|:-|:-|:-|
| A1.1 | the footbridge project and its pair rule (M9); `patrol` | `scenario=fernhollow days=1` |
| A1.2 | natural death, bodies, burial, graves, grief and flowers (M22); the one-kind `triage` duty (M4); the interventions `supply_shock` and `natural_death` | `scenario=slice_a_beats days=2` |
| A1.3 | `talk_news`, `badmouth`, lies and exposure (M17); `share_view` and the `lesson` duty (M16, M11); gifts, `ask_help` for everyone, `plead`, compliments, pickpocketing, `avoid`, `hide_coins` (M23); `forgive` (C5); the interventions `plant_rumour`, `drop_items` and `remove_items` | `scenario=fernhollow days=1` |
| A1.4 | the full-screen shell (10.1), the World view, the inspector and the dock, with minimal Society and Experiment views (metric columns, scenario and seed picker, intervention palette). P8 is gated here | a live preview session; no new headless run needed |

Out of scope for Slice A: the town hall, the Crier's editions, clinic fees, tabs and supplies, credit and personal loans, skills, promotions, festivals, groups, reproduction, violence and weather.

**The Slice A gate runs**, after A1.4:

```
bun scripts/town/lab.ts scenario=slice_a_beats days=7 worlds=5 seed=100 policy=needs_greedy experiment=slice-a-cal
bun scripts/town/lab.ts scenario=slice_a_beats days=7 worlds=5 seed=100 policy=random experiment=slice-a-cal
bun scripts/town/lab.ts scenario=slice_a_beats days=2 worlds=2 seed=7 think=2 experiment=slice-a condition=psyche_on
bun scripts/town/lab.ts scenario=slice_a_beats days=2 worlds=2 seed=7 think=2 experiment=slice-a condition=psyche_off ablation.psyche=none
bun scripts/town/probe.ts plan=standard experiment=slice-a condition=psyche_on
bun scripts/town/report.ts experiment=slice-a
```

The two calibration runs cost 0 calls. The JEV runs total about 2,800 calls including founding, and the probes about 240.

**Slice A gates.** Every one must pass:

- **P1 Plumbing** (checked on A1-min's first run, and again on the gate runs):
  - every JEV run finishes all its ticks;
  - JEV errors stay below 2%;
  - zero zod rejections, and zero unknown-option answers;
  - p95 latency stays below 1.5 s;
  - the median state is at most 4,000 characters, the median total call text (state plus criteria) is at most 12,000, and `CALL_CHAR_CAP` is never hit;
  - no call carries more than 8 questions, and no choice question has fewer than 2 options;
  - calls per day come within 35% of the estimate A8 prints from its tick model, and stay at or below 400.
- **P2 Determinism.** Replaying each record gives an identical `hashWorld` with 0 desyncs. The test and the CLI both check it.
- **P3 Honesty.**
  - The perception property test passes.
  - The provenance lint passes on 100% of logged perceptions and option params.
  - An unwitnessed theft appears in no perception except the actor's, until it is discovered or told.
  - No `View` contains `eventId`.
- **P4 Traceability.**
  - Every choice-origin event cites `decisionIds`.
  - Coins and goods are conserved across the event log. Coins cross the boundary only through the grant, outside sales and deliveries.
- **P5 Reachability.** `tests/town/integration.test.ts` uses scripted fake answers to drive each chain end to end:
  - theft, discovery, suspicion, report (and a note when Odile is not found), intake `open`, questioning, a lying testimony, a fine refused and then an arrest, a protest, `press_arrest`, jail, release;
  - a pickpocketing noticed late, discovered at the victim's next decide, and reported [A1.3];
  - a refused `accept_sale`; a price mismatch that cancels the buy and issues a fresh decide; a `serve: no`;
  - `set_prices` under a supply shock, with merged tiers and honest markup labels;
  - a family meal, and produce fetched from the shed without any take event;
  - a footbridge that finishes only once the pair rule is met, after which the tiles become `bridge` and `mapVersion` bumps [A1.1];
  - Bram's death, the body, burial, the grave, the obituary and flowers [A1.2];
  - `triage` with an unpaying patient treated, and the fee waiver recorded [A1.2];
  - `share_view` and a civic `lesson`, after which the listener's stance changes [A1.3];
  - a grudge formed, then `forgive` [A1.3];
  - **bodily urgency**: a perception with hunger 12 and health 70 renders the body alarm directly after the identity line, the hunger urgency clause, and the hours-to-collapse clause, word for word as in 5.1.3.
- **P6 Validity.**
  - The median psyche-swap TV is at least 0.15, and at least 3 x the identical TV.
  - Reorder TV is at most 0.10.
  - Co-batch TV is at most 0.10. If it fails, the documented fallback is to allow 1 sub-question per call, then rerun.
  - `edit_need` moves the expected option mass in at least 80% of probes.
- **P7 Non-degeneracy.** These are population-level checks. None of them gates a character outcome:
  - `family_entropy` is at least 0.6: the population's daily entropy over picked option families is at least 60% of the random baseline's on the same seeds;
  - no adult picks `rest`, `wander` or `plaza` for more than 40% of their picks while none of these restores their lowest need. This is the village's measured rest-spam failure;
  - the Jensen-Shannon divergence between the psyche-on and psyche-off enacted driver mixes, over the reachable drivers, is at least 0.1 for at least 7 of the 13 adults;
  - greedy agreement is below 0.95.

  Per-person diversity (`person_diversity`) is **reported, not gated**, so a workaholic or a withdrawn avoidant person is not penalised for being consistent.
- **P8 Layout** (gated at A1.4). At 1440 x 900 and 390 x 844, the page does not scroll, every panel scrolls internally, and the canvas fits. Checked with a screenshot pass.

**Reported, not gated.** These outcomes must never be tuned toward:
- E1: restraint watched against unseen, next to take offers in each condition;
- `thefts` next to `take_expected`;
- cases opened, resolved and wrongful; fines refused; protests pressed;
- lies told and caught;
- footbridge units, contributors, and whether it was finished;
- `dependants_fed` and family meals;
- the price tiers chosen after the supply shock; service refusals;
- `treat_unpaying_mass`, and the lesson mix;
- burial delay, grave visits and flowers;
- polarization, falsification gap, and `stance_behaviour_r`;
- each person's enacted drivers against their `driverWeights`, and the psyche expression index;
- pruned mass on dark options;
- greedy agreement, and whether it falls inside the 0.3 to 0.9 band.

**Kill criteria.** Each one means: inspect the named part before going further.

| Observation | What to inspect |
|:-|:-|
| `take_offers_per_day` below 1 in a JEV run, while calibration showed more | building access and staffing (2.2); shopkeepers who never step out |
| `take_mass` below 1% for every adult in both arms, with offers present | the `take_<store>` wording |
| intake never `open` across all runs | the intake question |
| nobody ever works on the footbridge | its detail text |
| anyone below hunger 10 for more than 48 consecutive ticks | the body alarm and the urgency clauses, which may be reworded only as a versioned experiment |
| a till or the treasury is cut to partial on day 1 | the economy constants, back to calibration |

Make exactly one evidence-backed change, bump the relevant version, and rerun the same seeds.

### 11.2 Slice B: town business and institutions

Contents:
- **Economy and work:** credit, tabs and fraud, and personal loans at fair and steep rates (M24); the shopkeeper's buying price and order size; skills and milestones (M2); apprenticeship (M11); job ranks in use, with the weekly `review` duty, promotions confirmed by vote, and pay steps (2.7, M6).
- **Clinic and press:** the extended triage, fees, tabs, supplies and sickness (M4, M21); the Crier's editions and `read_ledger` (M8, M6).
- **Town hall:** weekly council, special meetings, typed ordinances, open and secret ballots, elections every `TERM_YEARS`, legitimacy, hiring and dismissal; the mayor's abusable affordances `take_from_treasury`, `postpone_election` and `appoint` (M6); the `impose_ordinance` and `repeal_ordinance` interventions (9.3).
- **Groups:** founding, joining, leaving and leadership, with a pantry and purse, weekly gatherings, member-only aid, bloc declarations and rivalry (M19).
- **Dominance and apology:** the `demand` talk purpose (for coins, for someone to leave, or for an apology), answered `comply` or `refuse`; `apologize` with `accept_apology` (M17).
- **Justice:** hearings with plea and testimony, the sanction ladder, and enforcement (M7); bribes (M5).
- **People and opinion:** promises, and reliability counts fed by the favours ledger (M26); the town goals (M15); festivals, music nights and traditions (M12); nightly tie levels and respect (M18); persuasion with frames on all 5 issues, plus the stance-model conditions (M16).
- **Wire and UI:** typed facts on the wire, so `perception` lines become a `Fact` union rendered server-side and the route carries no client prose; the Probe drawer; the Chronicle; the full Society view.

Gate to start: Slice A passes. Evidence gates for B, which are reported and inform the next step:
- at least 1 ordinance vote across 3 seeds;
- at least 1 group founded across 3 seeds, with in-group bias measured;
- restraint computed per ordinance;
- E3 and E4 run with their pre-registered directions reported;
- the corruption gap measured with `tie_words` probes.

### 11.3 Slice C: lives and conflict

Contents:
- **Violence:** the ladder with intent, press, react and witnesses; murder investigation; revenge ambitions; banishment enforcement (M22, M7).
- **Groups:** splits, and rivalries between large groups (M19).
- **Jealousy:** the witnessed rival approach to a partner (M20).
- **Family:** courtship, consent, partnership, pregnancy, births delivered by the doctor, infants, naming, coming of age, aging, the natural-death hazard, estates and wills (M20).
- **Movement:** strikes (M6); strangers, emigration and admission (M25).
- **Knowledge:** discovery of techniques (M13).
- **World:** weather and seasons; shocks (flu, fire, drought).

Gates:
- the consent validator passes;
- no romance or violence options are offered below 16;
- every killing cites at least 3 recorded yes answers;
- a 20-day run at `lifePace` 0.25 finishes within budget, with cohort trait means reported;
- the life-course constants convert through `lifePace` (a test at pace 0.25 and pace 1).

### 11.4 Slice D: lab at scale

Contents:
- the attribution batch for revealed drivers, and the motivational-climate chart;
- the baseline matrix runner;
- `experiments/*.json` pre-registration files, and the compare reports with bootstrap CIs;
- blind human rating mode: `ratings.jsonl`, with at least 60 ratings across 3 policies;
- 40-day generational runs at `lifePace` 1 (E11) and culture-drift metrics;
- the "hold the clock" chronicle mode.

## 12. Test plan

### 12.1 Unit and integration tests (`bun test`)

Every town test lives under `tests/town/`. The village's `tests/sim.test.ts` and `tests/sprites.test.ts` keep running unchanged on every merge (8.6).

| File | Owner | Asserts |
|:-|:-|:-|
| `tests/town/rng.test.ts` | A0 | `rand` is in [0,1) and deterministic for a key; different keys give different streams; adding an agent does not change another agent's `choice` draws. Also that A0's hub functions work: `transfer` conserves, `emit` records, and the skeleton `createWorld` and `step` run |
| `tests/town/psyche.test.ts` | A1 | `psycheLines` is at most 7 lines, with semicolon joins; the Slice 0 checks still hold (Sable's lines include "deceive", Mo's do not); children with values at 50 get the "still working out" line; `needRates` stays inside [0.3, 1.8]; `inheritPsyche` is deterministic under a seed and inside [0, 100]; the drift caps hold (3 per trait per day, 25 lifetime); `CHANGE_DELTAS` equals the village table |
| `tests/town/world.test.ts` | A2 | the map is 48x30 and fully bordered except the road exit; every door opens onto a walkable tile; every agent can reach every building door, POI, the grove, the pond, the graveyard and every lot edge; the ford costs 3 ticks per tile; a finished bridge shortens the plaza-to-oak path by at least 15 steps; the access rules of 2.2 hold (an unstaffed posted-hours shop is enterable in its window, and a home is not); no `history` contains a trait adjective, and no `character` contains a job word, a place name or a pronoun (3.1) |
| `tests/town/map.test.ts` | A2 | the draft's reachability tests, moved |
| `tests/town/perception.test.ts` | A3 | the property test over 200 random worlds: no fact about out-of-sight people or places except dated beliefs; the provenance lint on lines and option params; indoors, only co-occupants are seen; no store count is visible from outside; an unwitnessed theft is invisible to everyone else until discovered; no `View` contains `eventId`; the dependant penalty in security uses only seen cues (5.1.3) |
| `tests/town/framing.test.ts` | A4 | every label and detail comes from `renderOption(verb, params)` and the four slots; no banned words; detail lengths within 40% of the median; **every stated number equals a param, and every numeric param equals its View value and carries a tag valid at that tick**; the negative test with a stale price (5.2); `VERB_PARAMS` and `ACTIONS` have identical keys; option ids are unique and wire-safe; stage gates hold (children never get work, take or job options) |
| `tests/town/economy.test.ts` | A5 | conservation of coins and goods over 3 simulated days with scripted answers; merged price tiers with true markup labels; payroll is pro rata; partial delivery, partial payroll with IOUs, and a short till at tax time; deliveries respect `supply_shock`; spoilage is told to the owner; `fetch` and `stock` never emit a take; `accept_sale` and `serve` gate the transfers |
| `tests/town/projects.test.ts` | A5 | the pair rule holds from unit 12; tile stages; completion credits and notice; anonymous mode omits the names |
| `tests/town/knowledge.test.ts` | A6 | witnesses get beliefs; discovery produces a claim with no actor plus a suspect ride-along, and never fires for spoilage, a delivery, or a household pantry; told beliefs carry the listener's credence; lies are classified from the speaker's own knowledge; a plea is exposed by the 24-hour rule |
| `tests/town/talk.test.ts` | A6 | the approach, then encounter, then talking state machine; time-outs; the stale-answer guard via `requestId`; an interrupted decide resumes as `idle` with retryAt = now; `founding` blocks decide; reflection fires once per day and never on a daytime nap; overhearing indoors and outdoors; a question with fewer than 2 options is skipped and recorded as forced |
| `tests/town/justice.test.ts` | A7 | the report lands with the officer, or becomes a note only through a `leave_note` pick; intake options; the resolution lists only suspects the officer believes in; the fine moves only on a `pay` answer, and a refusal re-offers the resolution; a protest is loud and needs `press_arrest`; jail until 8 am |
| `tests/town/life.test.ts` | A7 | `natural_death` leaves a body; burial places a grave in the next slot; the obituary is posted by the burier; flowers change tiles and bump `mapVersion`; the estate goes to the treasury when there are no kin; grief decay; triage waives the fee only on `treat_now` for a patient who said they cannot pay |
| `tests/town/prompt.test.ts` | A8 | the 7.11 section order; the body alarm, urgency and hours-to-collapse texts equal the village's word for word; `PROMPT_VERSION` and `PSYCHE_RENDER_VERSION` are logged |
| `tests/town/sim.test.ts` | A8 | the village replay test, rebuilt for the town: a recorded run with interventions and failures replays to an identical `hashWorld`, including after seeking backwards; replay recomputes "what JEV saw"; a fork shares common random numbers with its parent |
| `tests/town/events.test.ts` | A8 | R1: every event with origin `choice` has non-empty `decisionIds`, over a 2-day scripted run |
| `tests/town/integration.test.ts` | A8 | the P5 chains in 11.1, driven by scripted fake answers (a deterministic `fakeAnswer` extended per kind); the public route rejects prose options, the instrument lane and oversized calls |
| `tests/town/metrics.test.ts` | A9 | every metric is finite on a fresh world and after 2 scripted days; `restraint_rate` and `take_offers_per_day` count offers correctly; Gini of equal wealth is 0; unreachable drivers are excluded from `psyche_expression` |
| `tests/town/sprites.test.ts` | A10 | every town pixel map row has the declared width. This is the twin of the village's `tests/sprites.test.ts`, which is where the pixel-map test really lives |

`bun run typecheck` (the package script for `tsc` without emit) must be clean. `bun run lint` is still broken by the ESLint 10 scaffold issue and is not a gate.

### 12.2 Headless JEV runs and what they print

`scripts/town/lab.ts` starts from the village's `scripts/lab.ts`. It keeps that script's double-dash flags (days, worlds, seed, think, mode, concurrency, drift, assess, intervene, upload and verbose), and it also accepts `key=value` arguments: `scenario`, `days`, `worlds`, `seed`, `think`, `mode`, `policy`, `minP`, `concurrency`, `experiment`, `condition`, `ablation.<k>`, `drift`, `assess`, `intervene=<kind>@<tick>`, `fork=<runId>@<tick>`, `replay=<runId>`, `upload`, `verbose`. It saves runs through `lib/town/runs/store.ts` (A0), and `assess=true` runs the instrument-lane judge on the town digest.

**Every 72 ticks**, one line per world:

```
[w1 seed 7] Tue, day 2, 1:00 pm  calls= 241 wellbeing=61 meaning=58 thefts=1 (exp 0.9) cases=1 footbridge=9/24 dependants_fed=0.94 price_index=1.25
```

**At the end**, five tables:
1. **Metrics per seed:** every metric in 9.7 whose slice has landed.
2. **Per person:** name; post; shift hours worked and mean effort; the top 4 enacted drivers with shares (reachable drivers only), next to their top 4 `driverWeights`; the top 4 picks; `person_diversity`; take offers and takes (watched and unseen); stance at the start and at the end; liking in-degree; goal, grudges and gratitude.
3. **Justice:** each case, with its intake, interviews, resolution and truth. Truth is shown because this is an observer report.
4. **JEV:** calls by kind and lane, against A8's estimate; p50 and p95 latency; errors; stale answers; forced questions; median state and total call characters; cost; mean confidence; mean pruned mass, overall and on dark options; greedy agreement, scored offline.
5. **Economy:** the lowest balance of each till and of the treasury, partial events, and `money_stock` growth.

The replay check follows: desyncs and the hash for each record.

`scripts/town/probe.ts plan=standard|battery|high_stakes run=<id>` prints each probe kind with n, the mean and median TV, the share moving in the expected direction, and the noise floor.

`scripts/town/report.ts experiment=<id>` prints the confirmatory and exploratory metric tables, with bootstrap CIs, Cohen's d, and the authenticity scorecard (9.9).

## 13. Tuning constants

Every constant lives in `lib/town/tuning.ts` and is shown in the inspector's "World rules" panel. A preset may override any constant marked with an asterisk.

| Constant | Value | Unit | Module | Slice |
|:-|:-|:-|:-|:-|
| `TICK_MINUTES` | 5 | min | clock | A |
| `TICKS_PER_DAY` | 288 | ticks | clock | A |
| `BASE_TICK_MS` | 260 | ms at 1x | use-town | A |
| `MAP_W`, `MAP_H`, `TILE` | 48, 30, 16 | tiles, px | map | A |
| `LIFE_PACE`* | 0.25 (institution presets); 1 (generational presets); 4 (`long_history` only) | years per day | clock | A |
| `SEASON_DAYS` | 7 | days | clock | C |
| `BASE_DECAY` hunger, thirst, energy | 0.3, 0.38, 0.2 | per awake tick | needs | A |
| `BASE_DECAY` social, fun, purpose, belonging, respect | 0.28, 0.3, 0.10, 0.06, 0.05 | per awake tick | needs | A |
| `SLEEP_MULT` hunger and thirst, others | 0.35, 0.15 | factor | needs | A |
| `NIGHT_ENERGY_DECAY` | 0.15 | per tick | needs | A |
| `SLEEP_ENERGY_GAIN` | 0.85 | per tick | needs | A |
| `HEALTH_DEPRIVED` | -0.35 | per tick while hunger or thirst is below 10 | needs | A |
| `HEALTH_RECOVER` awake, asleep | 0.05, 0.25 | per tick | needs | A |
| `COLLAPSE_TICKS` | 36 | ticks | needs | A |
| `RATE_CLAMP` | 0.3 to 1.8 | multiplier | psyche | A |
| `MATTERS_THRESHOLDS` | 0.9, 1.3 | multiplier | psyche | A |
| `SECURITY_WEIGHTS` food, money, health, safety, home; dependant penalty | 0.35, 0.2, 0.2, 0.15, 0.1; -25 | | needs | A |
| `SECURITY_EVERY` | 12 | ticks | needs | A |
| `FOOD_HUNGER` groceries, produce, fish, meal, berry | 35, 35, 35, 40, 12 | hunger points | economy | A |
| `DRINK_THIRST` tap and fountain, inn drink | 22, 10 | thirst points | economy | A |
| `SPOIL_DAYS` groceries, produce, fish, berries | 5, 3, 1, 2 | days | economy | A |
| `CARRY_STACKS`, `STACK_MAX` | 6, 5 | | economy | A |
| `DELIVERY` groceries, drinks* | 12 at 3 (Mon to Sat), 12 at 2 (daily); partial when the till is short | units at coins | economy | A |
| `MEAL_UNIT_COST`* | 3 | coins per meal, for pricing | economy | A |
| `START_STOCK` | table 2.3 | | cast | A |
| `COUNTY_GRANT`* | 120 | coins per day | economy | A |
| `START_TREASURY`* | 600 | coins | economy | A |
| `TAX_RATE`* | 0.10 | share of sales | economy | A |
| `PAY_SCALE`* | by rank: mayor 35, chief 30, deputy 18, doctor 40, senior nurse 28, nurse 22, teacher 25, journalist 12, master carpenter on project 25, apprentice on project 12 | coins per full day | economy | A |
| `PAY_STEP` | 3 | coins per day per step, steps 0 to 3 | economy | B |
| `BUY_PRICE`* | 2 | coins per produce or fish, at the store and the diner | economy | A |
| `OUTSIDE_ORDERS` | 2 | coins per workshop hour | work | A |
| `PRICE_MULT` | 1, 1.25, 1.5, 2; tiers that round to the same price merge (2.3) | per tier | schema | A |
| `YIELD` farm, fish | 1.5, 1.2 | per hour | work | A |
| `SKILL_MULT` | 0.6 + skill/100 | | work | A |
| `EFFORT_OUTPUT` | 0.4, 0.7, 1.0, 1.25 | per level | work | A |
| `EFFORT_PURPOSE` | 0.5, 0.8, 1.0, 1.1 | per level | work | A |
| `EFFORT_ENERGY` | 0, 0.02, 0.05, 0.1 | extra per tick | work | A |
| `SHIFT_BLOCK_MAX` | 48 | ticks | work | A |
| `EARLY_START` | 6 | ticks (30 min) | work | A |
| `NO_SHOW_AFTER` | 12 | ticks past opening | work | A |
| `SKILL_GAIN` | 0.02 x (1 - s/100) | per shift tick | work | A (visible from B) |
| `PURPOSE_SHIFT`, `PURPOSE_PROJECT` | 0.25, 0.3 | per tick | needs | A |
| `PURPOSE_EVENTS` family meal, patient treated, lesson, burial, flowers, gift, project done, case resolved | 6, 4, 3, 10, 2, 3, 20, 10 | points | needs | A |
| `BELONGING` home, dining, talk, project crew, burial | 0.15, 0.2, 0.1, 0.1 per tick; 10 | points | needs | A |
| `RESPECT` thanked, compliment, credit, declined, refused service, warned, fined, arrested, lie exposed, seen taking | +6, +4 (halved per compliment in the last 12 hours), +5 to +15, -3, -5, -8, -15, -30, -20, -12 | points | needs | A |
| `PROJECT_FOOTBRIDGE` units, pairFrom, carpenter rate, volunteer rate | 24, 12, 2, 1 | units, units per hour | projects | A |
| `PROJECT_DECAY` | 2 per day after 7 idle days | units | projects | B |
| `SIGHT_DAY`, `SIGHT_NIGHT`, `SIGHT_TALLGRASS` | 8, 4, 2 | tiles | view | A |
| `OVERHEAR_OUTDOOR`, `LOUD_RADIUS` | 2, 6 | tiles | knowledge | A |
| `PRICE_READ_RADIUS`, `BOARD_READ_RADIUS` | 3, 2 | tiles | knowledge | A |
| `CUE` hungry, exhausted, unwell | 25, 20, 50 | need below | describe | A |
| `SALIENCE` | table 7.10 | | memory | A |
| `MEMORY_KEEP`, `MEMORY_IN_PROMPT` | 40, 6 recent + 4 salient | | memory | A |
| `FORMATIVE_FLOOR` | 0.6 | salience | memory | A |
| `CAPS` seeing, lastSeen, beliefs, people, town | 16, 10, 10, 12, 8 | lines | perception | A |
| `OPTION_CAPS` talk; each of ask_help, plead, gift, compliment, pickpocket, avoid, badmouth; explore; question; buy; total | 4; 2; 2; 3; 6; 32 | | options | A |
| `QUESTION_CAP` | 8 | per call | schema | A |
| `STATE_CHAR_CAP`, `CALL_CHAR_CAP` | 7000, 16000 | chars | schema | A |
| `ROUTE_LIMITS` per IP per instance, per IP firewall, daily world calls | 60 per minute, 120 per minute, 10,000 | calls | route | A |
| `RIDE_ALONG_MAX`, `RIDE_ALONG_TTL` | 2, 288 | per call, ticks | engine | A |
| `MIN_P`* | 0.25 | share of top | sampling | A |
| `TIE_SHIFT` | 0.08 | liking per EV step | ties | A |
| `TRUST_LEVELS` | -0.8, -0.3, 0.1, 0.5, 0.9 | trust | ties | A |
| `FAMILIARITY` sight, talk, decay | +0.002, +0.01 per tick; -0.001 per day | | ties | A |
| `BELIEF_INERTIA`* | 0 | share kept | opinion | A |
| `DRIFT_CAP_DAY`, `DRIFT_CAP_LIFE` | 3, 25 | points per trait (the village's caps) | drift | A |
| `TRUST_DRIFT` trust, agreeableness | 1.5, 0.5 | points per EV step | psyche | A |
| `INHERIT_H`, `INHERIT_SD` | 0.45, 8 | share, points | psyche | C |
| `REPORT_REACH_TICKS` | 60 | ticks before `leave_note` is offered | justice | A |
| `JAIL_UNTIL` | 8 am the next day | | justice | A |
| `FINE_MULT` | 2 x the value at the posted price; paid only on a `pay_fine` answer | | justice | A |
| `FINE_TIME` | tomorrow at 6 pm | due tick after `ask_time` | justice | A |
| `ARREST_TIMEOUT` | 12 | ticks to wait for `press_arrest` | justice | A |
| `SERVE_SALIENCE` | theft or lie belief at credence 0.5 or more, or absolute liking 0.4 or more | | economy | A |
| `CLINIC_FEE`*, `TREATMENT` | 10; 12 ticks, +30 health | | clinic | A1.2 |
| `FLOWERS` ticks, purpose | 6, +2 | | life | A1.2 |
| `COMPLIMENT_WINDOW` | 144 | ticks | talk | A1.3 |
| `PICKPOCKET_MAX`, `PICKPOCKET_RANGE` | 5 coins, 6 steps | | justice | A1.3 |
| `AVOID_TICKS` | 12 | ticks | talk | A1.3 |
| `PLEA_EXPOSURE_TICKS` | 288 | ticks | knowledge | A1.3 |
| `GRIEF` threshold, fun factor, decay per day, grave-visit factor | 0.2, 0.5, 0.15, 2 | | life | A |
| `BURIAL` dig ticks, carry speed | 24, 0.5 | | life | A |
| `ABSENCE_CUE_TICKS` | 144 | ticks | life | A |
| `BELL_COOLDOWN` | 144 | ticks per caller | institutions | B |
| `QUORUM` | ceil(adults / 3) | | institutions | B |
| `TERM_YEARS` | 2 | years, converted with `lifePace` | institutions | B |
| `CONTAGION` | 0.02 | per adjacent tick | clinic | B |
| `HAZARD` | 0.01 x exp((age - 65) / 8) per year, times `lifePace` per day | at 65 and over | life | C |
| `FERTILE_AGES`, `EXPECTING_YEARS`, `MAX_RESIDENTS` | 18 to 45 years, 0.75 years, 4 | converted with `lifePace` | life | C |
| `DAMAGE` | 10 + 25 x strength ratio x rand | per exchange | conflict | C |
| `CALL_BUDGET` per day, session, instrument | 400, 4,000, 200 | calls | use-town | A |
| `BROWSER_CONCURRENCY` | 12 | calls in flight | use-town | A |
| `THINK_TICKS`* | 2 | lab lockstep | lab | A |
| `KEYFRAME_EVERY`, `BROWSER_SNAPSHOT_EVERY` | 144, 36 | ticks | session | A |
| `METRIC_EVERY` | 12 | ticks | metrics | A |

## Appendix A: how the designs were merged

**Base.** Averaged over the 4 judge reports, `experiment` scored highest (8.1). `institutions` scored 7.9, and the two tied on mean rank (2.25). This spec starts from `experiment`'s platform contract:

- R1 to R10;
- honest perception with `buildView` and `perceive`;
- the ACTIONS table and the framing tests;
- keyed RNG with common random numbers;
- the probes, baselines, scorecard and pre-registration.

`experiment` adds no society of its own, and every judge noted this. So the society layer comes from `institutions`, the top design on emergence and the closest fit to a town with police, trials and a town hall. It supplies the Covenant rule that records have no power, the report-intake-question-resolve chain, testimony, the sanction ladder, second-order enforcement, open against secret ballot, legitimacy, restraint per opportunity, the A0 dilemma gate, and the 2-call purposeful approach.

**Grafts:**

| Source | What was taken |
|:-|:-|
| psychology | the psyche fields and worded rendering (already in Slice 0); the higher needs with reason clauses; the urgency clause; versioned templates; `creditMode`; job and office affordances that can be abused; the clones and no_psyche presets; values not inherited |
| sociology | society lives in minds: no global reputation number; private, expressed and perceived stances; issue labels; stances read as EV and never re-asked at night; the beliefInertia knob; moral frames; the Deffuant, DeGroot and frozen stance models; probability-based estimators; bottom-up groups with chosen names |
| ecology | build on Session, RunRecord, lab.ts, kinds.ts and METRICS; one `transfer()` with conservation; property as belief; knownStores discovery; recording min-p pruned mass and reporting expected against realized counts; feelings only through piggyback JEV scores; typed psyche on the wire; calibration with needs_greedy; gating on mechanics and validity only |
| drama | two keys for anything irreversible, with a consent validator; salience memory and recall with a control ablation; appraisal ride-alongs; burial, epitaph and grave visits; a life-pace knob; stage-gated options; the chronicle |
| town update | 12 jobs with shifts, wages and discretion; duty calls; price tiers relative to cost; police cases; the clinic; the town hall; the Crier as the only public reputation channel |

**Conflicts, and how each was resolved:**

| Question | Chosen | Why |
|:-|:-|:-|
| Conversation length | the 2-call purposeful approach, not sociology's 3 to 7 calls | cost and latency at 15 people |
| Question cap | 8, with a co-batching probe gate | a middle value between 7, 10 and 16 that the gate can revise |
| Trait drift | JEV reflection only, not psychology's `LIFE_EVENT_DELTAS` or an engine attachment formula | the engine must not decide what an experience means |
| Inheritance | genome only (psychology), not every trait (sociology, experiment) | keeps genes separable from culture |
| Replay | extend Session, not tape.ts, an answer cache or an inbox | Session is already correct and tested |
| Scale | 0 to 100, not 0 to 1 | that is what Slice 0 uses |
| Joint decisions | separate consents with a documented tiebreak, not drama's product of distributions | one call must be one mind |
| Where the town is built | a parallel namespace on a `town` branch with preview deploys, not an in-place rewrite of `lib/sim` on `main` | `main` deploys the public site, and the village must keep compiling, testing and serving until the town passes P1 to P4 |
| The village's shipped mechanics | translated into the town mechanic by mechanic (4.1), with only the stall, the campfire and the fixed nudges retired | the owner asked for translation, not loss |
| The first slice | A1-min, headless, with 12 metrics, before any footbridge, burial, gossip or UI | the dogfood rule: the real system must be able to overturn the design before breadth accumulates |

**Rejected:**
- pass criteria that require character outcomes (psychology (c), drama's story gates);
- an engine-computed "people say" reputation line;
- fixed affinity nudges;
- the forager ecology as the setting;
- an up-front 21-module split (the spec splits exactly what Slice A needs);
- infant death on by default;
- running live probes on the public site (probes run headless, or through the local-only lab route);
- the motive readout as a cause.
