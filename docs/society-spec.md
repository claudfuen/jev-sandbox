# Fernhollow: society spec for JEV Sandbox

Status: final synthesized spec, 2026-09-23. It replaces the six competing designs. The implementation is split across parallel agents (section 8). Every path is relative to `/Users/claudiofuentes/Repos/jev-sandbox`.

**Code this spec is written against.** It was read on 2026-09-23 at 18:40:

- Committed `HEAD` is `c05ac91`. That includes the engine, the Session, RunRecord and ReplayCursor, `scripts/lab.ts`, `lib/jev/kinds.ts` and `lib/jev/call.ts`, and the METRICS registry.
- The working tree also holds an **uncommitted village slice**. It is the "Many Minds" Slice A, still in progress in another session. It adds:
  - `lib/sim/psyche.ts`: a 0 to 100 `Psyche`, `makePsyche`, `psycheLines`, `needRates` and `PSYCHE_RENDER_VERSION`.
  - The needs `health`, `purpose` and `respect`, plus `needCauses` and an urgency clause in `lib/jev/prompt.ts`.
  - A `MOTIVES` readout.
  - `DriverKey` tags on options.
  - 10 founders with crafts.
  - One granary `Project`.
  - A communal `Store` with witnessed takings.
  - A `collapsed` status.
  - A per-villager driver printout in `lab.ts`.

This spec calls that tree **Slice 0**. It keeps Slice 0's names and scales wherever they fit, and says explicitly what changes.

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

The map is **48 x 30 tiles** at `TILE = 16`. That keeps today's 8:5 aspect, so the fit logic in `world-canvas.tsx` and the `aspect-[8/5]` frame keep working. The map is hand-laid and fixed, not generated. `lib/sim/map.ts` owns it, and a reachability test guards it.

Coordinates are tile x, y. Rectangles are inclusive. Trees border the map. The one gap is the county road exit at (24, 29).

| Zone | Rect (x0, y0 to x1, y1) | Contents |
|:-|:-|:-|
| North homes | 2,2 to 35,4 | Houses 4x3 at x = 2, 7, 12, 17, 22, 27 (vale, marsh, quill, fairbanks, moss, aldous); Wren's workshop at 32,2 to 35,4 |
| Elm Lane | 1,5 to 39,5 | Path |
| Schoolyard | 23,6 to 28,7 | Grass with a fence edge |
| Civic row | 2,8 to 38,12 | Clinic, police, town hall, school, chapel, graveyard (table 2.2) |
| Main Street | 1,13 to 39,14 | Path. Its east end meets the footbridge lot |
| Footbridge lot | 40,13 to 41,14 | `lot` tiles over the creek (not walkable). They become `scaffold` during the build and `bridge` when done |
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

Every building sits on `building` or `house` footprint tiles, with a single `door` tile in its bottom row that opens onto a lane. Interiors are abstract, as the current `inside` flag is: `Agent.insideOf` holds a building id. People inside can see each other. Nobody outside can see in.

| id | Name | Footprint | Door | Posted hours | Stores inside |
|:-|:-|:-|:-|:-|:-|
| `b_clinic` | the clinic | 2,9 to 6,12 | 4,12 | 9 am to 5 pm, Mon to Fri | `st_clinic_supplies` (Slice B) |
| `b_police` | the police station | 8,9 to 12,12 | 10,12 | 8 am to 8 pm, daily | one cell (a flag, not a store) |
| `b_town_hall` | the town hall | 14,8 to 21,12 | 17,12 | 9 am to 5 pm, Mon to Fri | `st_treasury` |
| `b_school` | the school | 23,9 to 28,12 | 25,12 | 8 am to 3 pm, Mon to Fri | none |
| `b_chapel` | the chapel | 30,8 to 34,12 | 32,12 | always open | `st_chapel_pantry` (Slice B commons) |
| `graveyard` | the graveyard (a zone, not a building) | 35,8 to 38,12 | open ground | always | 12 grave slots at x 35 to 38, y 9 to 11 |
| `b_store` | the general store | 2,16 to 6,19 | 4,19 | 8 am to 6 pm, Mon to Sat | `st_store_shelf`, `st_store_till` |
| `b_diner` | the Kettle diner | 8,16 to 12,19 | 10,19 | 7 am to 8 pm, daily | `st_diner_kitchen`, `st_diner_till` |
| `b_inn` | the Rusty Lantern | 14,16 to 20,19 | 17,19 | bar 4 pm to midnight, daily; rooms always | `st_inn_bar`, `st_inn_till` |
| `b_crier` | the Crier print shop | 33,16 to 36,19 | 34,19 | when Juniper is in | none |
| `b_workshop` | Wren's workshop | 32,2 to 35,4 | 33,4 | 8 am to 5 pm, Mon to Sat | `st_workshop_wood` (Slice B) |
| `h_*` | homes (11) | 4x3 each | bottom row, second tile | private | one `st_<household>_pantry` each |
| `h_harrow` | the Harrow farmhouse | 12,25 to 15,27 | 13,27 | private | `st_harrow_pantry`, `st_farm_shed` |

Opening hours are posted facts. A person knows them if they have walked past the door or read the notice board. **Opening hours do not force anyone to work.** A shop is actually open only while its job holder is inside on shift. The posted hours are what customers expect, which makes a no-show perceptible.

### 2.3 Resources and money

Money is integer **coins**. Everything that moves money or goods goes through `transfer()` (section 5.3, M3).

| Good | Source (physics) | Eaten how | Hunger | Spoils |
|:-|:-|:-|:-|:-|
| `groceries` | Store delivery truck, 7 am Mon to Sat: 20 units at 3 coins each from the till (a standing order in Slice A; an order-size duty from Slice B) | Cooked at home, 6 ticks | +35 | 5 days |
| `produce` | Farm shift: 1.5 per hour, times the skill multiplier, times the effort multiplier, into `st_farm_shed` | Cooked at home | +35 | 3 days |
| `fish` | Fishing at the pond or creek: 1.2 per hour, times the skill multiplier, times the effort multiplier | Cooked at home | +35 | 1 day |
| `berries` | 6 bushes in the east woods, 3 berries each, one berry regrows every 60 ticks | Raw, anywhere | +12 each | 2 days |
| `meal` | Diner kitchen: 15 portions delivered daily at 3 coins each; served only while Mo is on shift | Eaten at the diner, 6 ticks | +40 | same day |
| `drink` | Inn bar: 20 delivered daily at 1 coin each; served only while Lark is on shift | At the inn | thirst +10, fun +6 | never |
| `wood` | East woods trees, 1 per hour (Slice B) | none | | never |
| `supplies` | Clinic delivery, weekly (Slice B) | Used in treatment | | never |

**Water.** Every home has a tap and the plaza has the fountain. Drinking: thirst +22, 2 ticks.

**Skill multiplier.** `0.6 + skill / 100`. A skill of 55 gives 1.15.

**Effort multiplier.** Output is multiplied by 0.4, 0.7, 1.0 or 1.25, by effort level (section 5.3, M1).

**Town finances:**

| Item | Value |
|:-|:-|
| Treasury at start | 600 coins |
| County grant | 120 coins at 7 am daily (a boundary inflow) |
| Sales tax | 10% of each day's sales, moved from tills to the treasury at 6 pm |
| Town payroll | Paid at 6 pm, pro rata by the hours actually worked on shift |
| Pay scale (coins per day) | mayor 35, police officer 30, doctor 40, nurse 22, teacher 25, journalist stipend 12 |
| Carpenter | 25 per day pro rata, but only for hours spent on a town project |
| Self-employed | shopkeeper, cook, innkeeper, farmer and fisher live on their sales |

**Money boundary.** Coins enter the town only through the county grant and the carpenter's out-of-town orders, and leave only through deliveries. The conservation test (section 12) checks this.

### 2.4 Time, week, seasons, weather

- **Tick and day.** 1 tick is 5 in-game minutes; 288 ticks make a day, about 75 s at 1x. This is unchanged. Day 1 is a Monday; days 6 and 7 are the weekend.
- **Weekends.** School is closed, and so is the town hall. The store is open from 9 am to 1 pm on Saturday.
- **Seasons.** 4 seasons of 7 days make a 28-day weather year. Slice A always has clear weather. From Slice C the weather comes from a precomputed tape (`shock` RNG stream), one entry per day:
  - rain: farm output x1.2, outdoor fun -1 per hour;
  - storm: fishing x0.5;
  - heat: thirst decay x1.4;
  - snow: winter only; off-path movement costs 2 ticks.
- **Life pace.** Ages are shown in years and advance at `lifePace` years per in-game day. The default is 1; the brisk preset uses 4. This compression is a declared abstraction, as in The Sims, and it is separate from the weather year. At the default pace:
  - a 10-day run ages everyone 10 years;
  - Tansy, 6, reaches school-leaving age (16) by day 10;
  - Bram, 68, faces a rising natural-death hazard from Slice C.

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

## 3. Population

### 3.1 Cast

There are 15 founders. 10 carry over from Slice 0 (`lib/sim/personas.ts` in the working tree) with their psyches unchanged. 5 are new: Hazel, Ivy, Linnea, Kit and Tansy. Each person holds exactly one key job or life stage: 12 working adults, 1 retired elder and 2 school children.

| id | Name (surname) | Pronoun | Age | Job (`JobId`) | Household | Wallet | Job skill | Blurb (flavour, at most 160 chars, ablatable) |
|:-|:-|:-|:-|:-|:-|:-|:-|:-|
| `tomas` | Tomas Vale | he | 44 | `mayor` | `hh_vale` | 120 | administration 60 | A gifted builder who went into politics and likes his work to be noticed. |
| `odile` | Odile Marsh | she | 42 | `police_officer` | `hh_marsh` | 60 | policing 55 | Has worn the badge for twelve years and believes a town without order is no town at all. |
| `hazel` | Hazel Quill | she | 47 | `doctor` | `hh_quill` | 150 | medicine 80 | The town doctor for twenty years; she has delivered half the people in Fernhollow. |
| `ivy` | Ivy Harrow | she | 31 | `nurse` | `hh_harrow` | 35 | nursing 50 | Came to Fernhollow to nurse at the clinic, married Pip, and still misses the bustle of the city. |
| `linnea` | Linnea Fairbanks | she | 33 | `teacher` | `hh_fairbanks` | 50 | teaching 65 | Teaches every child in town in one room and believes each of them can go far. |
| `juniper` | Juniper Moss | she | 24 | `journalist` | `hh_moss` | 25 | writing 60 | Prints the Fernhollow Crier on an old press and cannot leave a question unasked. |
| `wren` | Wren Aldous | she | 41 | `carpenter` | `hh_aldous` | 70 | carpentry 75 | Learned the trade from Bram; most of the porches on Elm Lane are hers. |
| `sable` | Sable Crane | he | 39 | `shopkeeper` | `hh_crane` | 200 (till 80) | trade 70 | A sharp, ambitious trader who took over the general store and doubled its business. |
| `mo` | Mo Harrow | she | 29 | `cook` | `hh_mo` | 50 (till 30) | cooking 70 | Pip's sister; runs the Kettle diner and notices who has not eaten. |
| `lark` | Lark Bellamy | they | 30 | `innkeeper` | `hh_bellamy` (inn) | 45 (till 40) | hospitality 60 | Keeps the Rusty Lantern loud and late; would rather start a party than follow a rule. |
| `pip` | Pip Harrow | he | 34 | `farmer` | `hh_harrow` | 30 | farming 70 | A careful farmer who grew up on the Harrow land and worries when the pantry runs low. |
| `hollis` | Hollis Reed | he | 26 | `fisher` | `hh_reed` | 6 | fishing 55 | A charming fisher who loves a good time more than a hard day. |
| `bram` | Bram Oakes | he | 68 | none (retired carpenter) | `hh_oakes` | 90 | carpentry 85 | The oldest soul in town: grumpy, kind, fond of naps; he sweeps the chapel steps. |
| `kit` | Kit Harrow | he | 9 | none (school) | `hh_harrow` | 2 | reading 30 | Nine years old, quiet, and always asking how things work. |
| `tansy` | Tansy Harrow | she | 6 | none (school) | `hh_harrow` | 0 | reading 10 | Six years old and loud about it; happiest when everyone is watching. |

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

The contracts agent (A0, section 8) lands these two files first. Everything else compiles against them. Tags in comments mark when each piece gets behaviour: `[A]` means Slice A, `[B]` and `[C]` mean later slices. The types for later slices are declared now, so later slices add behaviour without reopening the contract.

### 4.1 Symbol changes against the current code

| Symbol | Where today | Change |
|:-|:-|:-|
| `Psyche`, `PsycheSpec`, `makePsyche`, `psycheLines`, `needRates`, `PSYCHE_RENDER_VERSION` | `lib/sim/psyche.ts` (Slice 0) | Kept. The `Psyche` type becomes `z.infer` of `psycheSchema` in `lib/jev/schema.ts`, so the wire carries the typed object and the server renders the words. `attachment` becomes nullable for children. `psycheLines` stays in `psyche.ts`, the one place for the words, and both the prompt and the inspector import it. |
| `NEED_KEYS`, `BODY_KEYS`, `MIND_KEYS` | `lib/jev/schema.ts` (Slice 0) | `BODY_KEYS` stays `hunger, thirst, energy, health`. `MIND_KEYS` grows to `social, fun, purpose, belonging, respect, security`. |
| `perceptionSchema.psyche: string[]` | Slice 0 | Replaced by `psyche: psycheSchema.nullable()`. It is `null` in the `no_psyche` ablation. |
| `perceptionSchema.traits`, `role` | HEAD, Slice 0 | `traits` is removed; it was UI-only. `role` moves into `life[0]`. |
| `feelings`, `noticing` | HEAD | Replaced by sight-limited `seeing`, plus `lastSeen`, `people`, `beliefs`, `town` and `situation`. |
| `MOTIVES`, the `motive` question | Slice 0 | Kept, but asked only when `ablations.motiveReadout` is on. It stays off by default until the co-batching probe passes (section 9.6). Its label is JEV's self-model, not a cause. |
| `respond` kind | HEAD | Replaced by `encounter`. |
| `House`, `houses`, `campfire`, `project`, `store` (singular) | HEAD, Slice 0 | Replaced by `buildings`, `households`, `projects[]` and `stores[]`. The campfire tile is dropped; the plaza has a fountain. |
| `Agent.inside: boolean` | HEAD | Replaced by `insideOf: string \| null`, a building id. |
| `Agent.affinity`, `nudgeAffinity` | HEAD | Replaced by `ties` (liking, trust, respect, fear, familiarity). Liking and trust move only through JEV answers (section 5.3, M18). |
| `Agent.carry: number` | Slice 0 | Replaced by `carry: Stack[]` (6 stacks, up to 5 each). |
| `MemoryEntry` | HEAD | Replaced by `Memory` (kind, salience, others, place, eventId, formative). |
| `world.rng`, `nextRandom` | HEAD | Replaced by stateless keyed `rand()` (`lib/sim/rng.ts`). |
| `SimRequest` | `engine.ts` | Moves to `types.ts` so that modules can build requests. |
| `DecisionRecord` | HEAD, Slice 0 | Existing fields are kept, so the current inspector still renders. Audit fields are added. |
| `RECORD_VERSION` | `session.ts` | Bumped to 2. The gallery lists version 1 runs as legacy: metadata only, replay disabled. |
| `Intervention` | HEAD, Slice 0 | `famine` and `bounty` are kept (berries). `drain_store` and `fill_store` become `remove_items` and `drop_items`, each with a `storeId`. |
| `lib/sim/drift.ts` (engine-authored drift from habits and events) | Slice 0, added while this spec was being written | Not the default. It runs only in the `driftModel: "engine"` condition, compared against the default `"jev"` (reflection answers, 5.1.4) and `"off"`. Owned by A1. |

### 4.2 `lib/jev/schema.ts` (v2)

```ts
import { z } from "zod"

// The wire contract. The route accepts only typed perceptions, typed options and
// typed call payloads, builds every instruction server-side, and caps state length
// and question count, so it cannot be used as a general model proxy.

export const PROMPT_VERSION = "town-1" // bump on ANY template change; logged per decision
export const QUESTION_CAP = 8          // per call, until the co-batching probe allows more
export const STATE_CHAR_CAP = 7000     // route answers 413 above this

// Needs
export const BODY_KEYS = ["hunger", "thirst", "energy", "health"] as const
export const MIND_KEYS = ["social", "fun", "purpose", "belonging", "respect", "security"] as const
export const NEED_KEYS = [...BODY_KEYS, ...MIND_KEYS] as const
export type NeedKey = (typeof NEED_KEYS)[number]
export type MindKey = (typeof MIND_KEYS)[number]

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

// Perception
const need = z.number().min(0).max(100)
export const needsSchema = z.record(z.enum(NEED_KEYS), need)
const line = z.string().max(240)
const lines = (n: number) => z.array(line).max(n)
export const nameSchema = z.string().regex(/^[A-Z][a-z]{1,15}$/)
export const idSchema = z.string().regex(/^[a-z0-9_]{1,40}$/)
export const personIdSchema = z.string().regex(/^p_[a-z0-9_]{1,30}$/)
export const claimIdSchema = z.string().regex(/^c_[a-z0-9_]{1,30}$/)
export const issueSchema = z.enum(ISSUE_IDS)

export const perceptionSchema = z.object({
  name: nameSchema,
  age: z.number().int().min(0).max(120),
  stage: z.enum(LIFE_STAGES),
  pronoun: z.enum(["he", "she", "they"]),
  blurb: z.string().max(160),               // flavour; "" in the psyche=none ablation
  psyche: psycheSchema.nullable(),          // rendered to words server-side by psycheLines
  clock: z.string().max(80),
  location: z.string().max(160),
  needs: needsSchema,
  matters: z.record(z.enum(MIND_KEYS), z.number().int().min(0).max(2)), // 0 a little, 1 somewhat, 2 a great deal
  needCauses: z.partialRecord(z.enum(NEED_KEYS), z.string().max(160)),
  life: lines(6),        // job, shift, pay, wallet, household, dependants
  seeing: lines(16),     // sight-limited, nearest first
  lastSeen: lines(10),   // dated beliefs about people out of sight
  beliefs: lines(10),    // claims with source and credence words
  town: lines(8),        // notice board as last read, posted prices as last seen, projects, cases you are part of
  people: lines(12),     // one tie line per salient person
  views: lines(4),       // own stances with certainty; what you have heard others say
  emotions: lines(4),
  memories: lines(10),   // recent plus formative
  situation: lines(8),   // call-specific: what was just said to you, the report in front of you
})
export type Perception = z.infer<typeof perceptionSchema>

// Options, sub-questions, ride-alongs
export const optionSchema = z.object({ id: idSchema, label: z.string().max(80), detail: z.string().max(240) })
export const personRefSchema = z.object({ id: personIdSchema, name: nameSchema, line: z.string().max(200) })
export const claimRefSchema = z.object({ id: claimIdSchema, line: z.string().max(200) })

export const subQuestionSchema = z.discriminatedUnion("q", [
  z.object({ q: z.literal("who"), purpose: z.enum(["news", "view"]), people: z.array(personRefSchema).min(1).max(12) }),
  z.object({ q: z.literal("claim"), claims: z.array(claimRefSchema).min(1).max(4) }),
  z.object({ q: z.literal("expressed"), issue: issueSchema }),
  z.object({ q: z.literal("effort") }),
])
export const rideAlongSchema = z.discriminatedUnion("q", [
  z.object({ q: z.literal("feel"), key: idSchema, other: nameSchema, what: line }),
  z.object({ q: z.literal("trust"), key: idSchema, other: nameSchema, what: line }),
  z.object({ q: z.literal("suspect"), key: idSchema, what: line, people: z.array(personRefSchema).min(1).max(10) }),
  z.object({ q: z.literal("appraise"), key: idSchema, what: line }),
])

// Typed payloads per call kind
const selfKnowledge = z.enum(["witnessed", "heard", "did_it", "nothing"])
export const wireTalkSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("small_talk") }),
  z.object({ kind: z.literal("share_news"), heard: line }),
  z.object({ kind: z.literal("share_view"), issue: issueSchema, heard: line }),
  z.object({ kind: z.literal("ask_help"), need: z.enum(["food", "coins"]), amount: z.number().int().min(1).max(20), have: z.number().int().min(0).max(100000) }),
  z.object({ kind: z.literal("offer_gift"), heard: line }),
  z.object({ kind: z.literal("question_about"), heard: line, knows: selfKnowledge, people: z.array(personRefSchema).max(10) }),
  z.object({ kind: z.literal("confront"), heard: line, didIt: z.boolean(), people: z.array(personRefSchema).max(10) }),
  z.object({ kind: z.literal("arrest"), heard: line }),
])
export const dutySchema = z.discriminatedUnion("duty", [
  z.object({ duty: z.literal("set_prices"), place: z.enum(["store", "diner", "inn"]), item: z.enum(["groceries", "meal", "drink"]), unitCost: z.number().int().min(1).max(50), lastTier: z.enum(PRICE_TIERS).nullable() }),
  z.object({ duty: z.literal("case_intake"), reporter: nameSchema, report: line }),
  z.object({ duty: z.literal("case_resolution"), summary: line, victim: nameSchema, suspects: z.array(personRefSchema).max(6), fineCoins: z.number().int().min(1).max(500) }),
])
export type DutyWire = z.infer<typeof dutySchema>
export type DutyKind = DutyWire["duty"]

const lane = z.enum(["world", "instrument"]).default("world")
export const jevRequestSchema = z.discriminatedUnion("kind", [
  z.object({ kind: z.literal("decide"), lane, payload: z.object({
    perception: perceptionSchema,
    options: z.array(optionSchema).min(2).max(32),
    subs: z.array(subQuestionSchema).max(4),
    rides: z.array(rideAlongSchema).max(2),
    motiveReadout: z.boolean().default(false),
  }) }),
  z.object({ kind: z.literal("encounter"), lane, payload: z.object({ perception: perceptionSchema, asker: nameSchema, talk: wireTalkSchema }) }),
  z.object({ kind: z.literal("duty"), lane, payload: z.object({ perception: perceptionSchema, task: dutySchema, rides: z.array(rideAlongSchema).max(2) }) }),
  z.object({ kind: z.literal("reflect"), lane, payload: z.object({
    perception: perceptionSchema,
    today: z.array(z.object({ id: z.string().regex(/^m[0-9]$/), line })).max(10),
    helpers: z.array(personRefSchema).max(6),
    wrongers: z.array(personRefSchema).max(6),
  }) }),
  z.object({ kind: z.literal("found"), lane, payload: z.object({ perception: perceptionSchema, issues: z.array(issueSchema).min(1).max(5) }) }),
  // [B] "vote" | "hearing"   [C] "react" | "coming_of_age"  (added to this union when their slice lands)
])
export type JevRequest = z.infer<typeof jevRequestSchema>
export type JevKind = JevRequest["kind"]
export type WireOption = z.infer<typeof optionSchema>

export type MoodReading = { level: number; label: MoodLabel; probabilities: number[] }

/** One JEV answer, normalized (unchanged from HEAD). */
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

### 4.3 `lib/sim/types.ts` (v2)

```ts
import type {
  Attachment, DutyKind, IssueId, JobId, LifeStage, MoodReading, MotiveKey, NeedKey, Needs,
  Perception, PriceTier, Psyche, RawAnswer,
} from "@/lib/jev/schema"

export type Vec = { x: number; y: number }
export type Dir = "up" | "down" | "left" | "right"
export type Rect = { x: number; y: number; w: number; h: number }

export type Tile =
  | "grass" | "tallgrass" | "flowers" | "path" | "sand" | "water" | "tree" | "bush" | "rock"
  | "house" | "building" | "door" | "fountain" | "board" | "fence" | "field" | "grave"
  | "ford" | "lot" | "scaffold" | "bridge" | "dock"

// Places
export type BuildingKind =
  | "house" | "farmhouse" | "clinic" | "police" | "town_hall" | "school" | "chapel"
  | "store" | "diner" | "inn" | "crier" | "workshop"
export type Building = {
  id: string
  kind: BuildingKind
  name: string                       // "the general store", "the Harrows' farmhouse"
  rect: Rect
  door: Vec
  householdId: string | null
  /** Posted hours, minutes of day, weekday 0 = Monday. null = private. Not enforced: open only while staffed. */
  hours: { open: number; close: number; days: number[] } | null
  storeIds: string[]
}
export type Lot = { id: string; rect: Rect; kind: "house" | "civic" | "bridge"; projectId: string | null }
export type Bush = { id: string; pos: Vec; berries: number; nextRegrow: number }
export type Poi = { id: string; name: string; stand: Vec }
export type Landmark = { name: string; center: Vec; radius: number; buildingId?: string }

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
  jobId: JobId | null
  householdId: string
  blurb: string                      // at most 160 chars, flavour, ablatable
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
export type PerceivedStance = { pos: number; tick: number; source: "said_to_you" | "told" | "overheard" }

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

export type DriftEntry = { tick: number; path: string; from: number; to: number; cause: "reflection" | "coming_of_age"; decisionId: string }

// Goods, money, households, jobs, town
export type ItemKind = "groceries" | "produce" | "fish" | "berries" | "meal" | "drink" | "wood" | "supplies"
export type Stack = { kind: ItemKind; qty: number; madeTick: number }
export type Bundle = Partial<Record<ItemKind, number>>
export type Owner =
  | { kind: "agent"; id: string }
  | { kind: "household"; id: string }
  | { kind: "business"; jobId: JobId }
  | { kind: "town" }
  | { kind: "group"; id: string }
export type Store = {
  id: string
  label: string                      // "the store shelves", "the Harrows' pantry"
  owner: Owner
  buildingId: string
  role: "shelf" | "pantry" | "till" | "kitchen" | "bar" | "shed" | "treasury" | "commons"
  items: Stack[]
  coins: number
  capacity: number
}
export type PriceBoard = {
  storeId: string; item: ItemKind; tier: PriceTier; unitCost: number; price: number
  setTick: number; setById: string; decisionId: string | null
}
export type Household = { id: string; name: string; memberIds: string[]; homeId: string; pantryId: string; dependantIds: string[] }
export type Job = {
  id: JobId
  title: string                      // "police officer"
  workplaceId: string                // building id, or "farm" / "pond"
  employer: "town" | "self"
  shift: { start: number; end: number; days: number[] }
  holderId: string | null
  payPerDay: number
}
export type Notice = {
  id: string; tick: number
  kind: "project" | "hours" | "prices" | "obituary" | "blotter" | "crier" | "ordinance" | "meeting" | "vacancy"
  text: string                       // engine template text; B: crier items chosen by the journalist
  postedById: string | null; eventIds: string[]; decisionIds: string[]
}
export type Town = {
  name: string
  treasuryId: string
  taxRate: number
  payScale: Partial<Record<JobId, number>>
  mayorId: string | null
  notices: Notice[]
  ordinances: Ordinance[]            // [B]
  meetings: Meeting[]                // [B]
}
export type OrdinanceKind = "no_theft" | "curfew" | "price_cap" | "pantry_by_need" | "work_day" | "welcome_newcomers" | "no_newcomers" | "secret_ballot"
export type Ordinance = { id: string; kind: OrdinanceKind; sanction: SanctionLevel; adoptedTick: number; status: "in_force" | "repealed"; proposerId: string; votes: Record<string, "yes" | "no" | "abstain">; decisionIds: string[] } // [B]
export type SanctionLevel = 0 | 1 | 2 | 3 | 4 // warning, fine, pay back double, a night in jail, banishment
export type Meeting = { id: string; tick: number; calledBy: string; agenda: { id: string; kind: string; ref: string | null }[]; ballot: "open" | "secret"; attendees: string[]; record: { agentId: string; itemId: string; answer: string; decisionId: string }[]; outcome: Record<string, string> } // [B]

// Knowledge
export type EventKind =
  | "theft" | "sale" | "purchase" | "wage" | "tax" | "delivery" | "grant" | "gift" | "help" | "shift"
  | "project_work" | "project_done" | "report" | "case_intake" | "interview" | "case_resolution"
  | "arrest" | "release" | "fine" | "warning" | "lie" | "lie_exposed" | "stance_expressed"
  | "meal" | "family_meal" | "death" | "burial" | "grave_visit" | "price_set" | "observer"
  // [B]
  | "credit" | "fraud" | "bribe" | "vote" | "ordinance" | "hearing" | "verdict" | "edition" | "treatment"
  | "festival" | "hire" | "fire" | "election"
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
  /** R1: non-empty whenever origin is "choice" (tests/events.test.ts). */
  decisionIds: string[]
}
export type ClaimKind = "took_from" | "gave_to" | "was_near" | "died" | "holds_view" | "worked_on" | "lied_to" | "arrested" | "fined"
export type Claim = {
  id: string; kind: ClaimKind
  actorId: string | null; targetId: string | null; storeId: string | null
  issue: IssueId | null; pos: number | null; tick: number
  /** Observer-only link to the true event. null = matches no event (fabricated or mistaken). */
  eventId: string | null
  originId: string                   // an agent id, "traveller" (observer plant) or "self" (a hypothesis)
}
export type BeliefSource =
  | { kind: "witnessed" } | { kind: "discovered" } | { kind: "self" }
  | { kind: "told"; byId: string } | { kind: "overheard"; byId: string }
  | { kind: "posted"; noticeId: string } | { kind: "traveller" }
export type Belief = { claimId: string; source: BeliefSource; credence: number; heardAt: number; sharedWith: string[] }
export type KnownStore = { tick: number; items: Bundle; coins: number | null }
export type KnownPrice = { tick: number; price: number }

// Justice
export type Testimony = "tell_truth" | "say_saw_nothing" | "name_someone" | "confess"
export type Case = {
  id: string
  kind: "theft"                      // [C] adds "assault" | "killing" | "fraud"
  eventId: string | null             // observer-only
  storeId: string
  reportedById: string
  reportedTick: number
  officerId: string | null
  status: "filed" | "open" | "noted" | "sort_it_out" | "dismissed" | "closed_unsolved" | "resolved"
  candidates: string[]
  interviews: { tick: number; subjectId: string; testimony: Testimony; namedId: string | null; decisionId: string }[]
  resolution: { tick: number; kind: "arrest" | "fine" | "warn"; suspectId: string; coins: number; decisionId: string } | null
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
export type Grave = { id: string; agentId: string; name: string; pos: Vec; diedTick: number; buriedTick: number; buriedBy: string[]; visits: number; decisionIds: string[] }
export type Departure = { agentId: string; persona: Persona; tick: number; reason: "died" | "left" | "banished"; cause: DeathCause | null }

// Choices
export type Effort = 0 | 1 | 2 | 3 // bare minimum, easy pace, steadily, hard
export type Frame = "care" | "fairness" | "loyalty" | "authority" | "sanctity" | "liberty" | "self_interest"
export type TalkPurpose =
  | { kind: "small_talk" }
  | { kind: "share_news"; claimId: string }
  | { kind: "share_view"; issue: IssueId; expressed: number }
  | { kind: "ask_help"; need: "food" | "coins"; amount: number }
  | { kind: "offer_gift"; bundle: Bundle; coins: number }
  | { kind: "report"; caseId: string }
  | { kind: "question_about"; caseId: string }
  | { kind: "confront"; claimId: string }
  | { kind: "arrest"; caseId: string }
  // [B]
  | { kind: "persuade"; issue: IssueId; toward: -1 | 1; frame: Frame }
  | { kind: "ask_credit"; storeId: string; coins: number }
  | { kind: "offer_bribe"; caseId: string; coins: number }
  | { kind: "ask_vote"; meetingId: string; itemId: string; side: "yes" | "no" }
  | { kind: "apologize"; eventId: string; amends: number }
  | { kind: "teach"; skill: SkillKey }
  | { kind: "ask_to_learn"; skill: SkillKey }
  // [C]
  | { kind: "propose_group" } | { kind: "invite_group"; groupId: string }
  | { kind: "court" } | { kind: "propose_partnership" } | { kind: "propose_child" }
  | { kind: "threaten"; demand: number } | { kind: "propose_strike" }

export type Intent =
  | { kind: "eat_home" } | { kind: "cook_family" } | { kind: "dine" } | { kind: "eat_carried"; item: ItemKind }
  | { kind: "pick_berries"; bushId: string } | { kind: "drink" } | { kind: "sleep" } | { kind: "rest" }
  | { kind: "wander"; target: Vec } | { kind: "explore"; poiId: string } | { kind: "plaza" } | { kind: "bar" }
  | { kind: "buy"; storeId: string; item: ItemKind; qty: number }
  | { kind: "sell"; storeId: string; item: ItemKind; qty: number }
  | { kind: "stock_pantry" }
  | { kind: "work_shift"; jobId: JobId; effort: Effort }
  | { kind: "work_project"; projectId: string; effort: Effort; paid: boolean }
  | { kind: "school" } | { kind: "play"; poiId: string }
  | { kind: "take"; storeId: string; item: ItemKind; qty: number }
  | { kind: "talk"; targetId: string; purpose: TalkPurpose }
  | { kind: "resolve_case"; caseId: string }
  | { kind: "bury"; bodyId: string } | { kind: "visit_grave"; graveId: string }

export type DriverKey =
  | "body" | "rest"                                                     // subsistence (kept from Slice 0)
  | "purpose" | "building" | "providing" | "mastery" | "belonging" | "prestige" | "curiosity"
  | "pleasure" | "meaning" | "generosity" | "fairness" | "autonomy" | "security"
  | "dominance" | "envy" | "greed" | "fear" | "jealousy" | "revenge" | "tribalism"
  | "deception" | "free_riding" | "violence"
export type OptionFamily = "body" | "work" | "family" | "social" | "civic" | "take" | "leisure" | "life"
export type OptionSpec = {
  id: string
  label: string
  detail: string                     // four-slot text rendered from the ACTIONS table
  intent: Intent
  family: OptionFamily
  drivers: Partial<Record<DriverKey, number>> // hidden; weights sum to 1; never on the wire
  provenance: string[]               // facts the option was gated on
}
export type SubQuestionSpec =
  | { q: "who"; purpose: "news" | "view"; parentIds: string[]; people: string[] }
  | { q: "claim"; parentIds: string[]; claimIds: string[] }
  | { q: "expressed"; issue: IssueId; parentIds: string[] }
  | { q: "effort"; parentIds: string[] }

export type DutyTask =
  | { duty: "set_prices"; storeId: string; item: ItemKind }
  | { duty: "case_intake"; caseId: string }
  | { duty: "case_resolution"; caseId: string }

/** One status per agent is still the single source of truth for what it is doing. */
export type Status =
  | { kind: "idle"; retryAt: number }
  | { kind: "deciding"; since: number; requestId: number; options: OptionSpec[]; subs: SubQuestionSpec[] }
  | { kind: "moving"; intent: Intent; path: Vec[]; startedAt: number; waited: number; slowTicks: number }
  | { kind: "acting"; intent: Intent; ticksLeft: number }
  | { kind: "working"; intent: Extract<Intent, { kind: "work_shift" | "work_project" }>; ticksLeft: number; output: number }
  | { kind: "approaching"; targetId: string; purpose: TalkPurpose; since: number }
  | { kind: "considering"; askerId: string; purpose: TalkPurpose; resume: Status; since: number; requestId: number }
  | { kind: "talking"; partnerId: string; purpose: TalkPurpose; ticksLeft: number }
  | { kind: "on_duty_call"; duty: DutyKind; caseId: string | null; requestId: number; resume: Status; since: number }
  | { kind: "carrying"; bodyId: string; path: Vec[] }
  | { kind: "jailed"; caseId: string; untilTick: number }
  | { kind: "collapsed"; ticksLeft: number }                            // kept from Slice 0
  | { kind: "sleeping"; reflected: boolean }
  | { kind: "reflecting"; requestId: number; since: number }
  | { kind: "infant" }                                                  // [C]

export type ChoiceMode = "sample" | "argmax"
export type CallKind = "decide" | "encounter" | "duty" | "reflect" | "found" | "probe"

/** Existing fields kept so today's inspector still renders; audit fields added. */
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
  used: string[]                     // conditional questions actually acted on
  enacted: Partial<Record<DriverKey, number>> // sum over options of p(option) * tags
  provenance: string[]
  truncated: Record<string, number>
}

export type Flash = { kind: "heart" | "angry" | "exclaim" | "sweat" | "eye" | "thanks" | "coin" | "badge" | "tear" | "hammer"; until: number }

export type Agent = {
  id: string
  persona: Persona
  psyche: Psyche                     // the living psyche; drifts only through JEV reflection answers
  psycheAtBirth: Psyche
  drift: DriftEntry[]
  pos: Vec; prev: Vec; facing: Dir; steps: number
  insideOf: string | null
  bornTick: number                   // founders: tick 0 minus age in ticks at lifePace
  stage: LifeStage
  householdId: string
  jobId: JobId | null
  skills: Partial<Record<SkillKey, number>>
  wallet: number
  carry: Stack[]
  needs: Needs
  needCause: Partial<Record<NeedKey, string>>
  status: Status
  memory: Memory[]
  ties: Record<string, Tie>
  knowledge: Record<string, Belief>  // by claim id
  knownStores: Record<string, KnownStore>
  knownPrices: Record<string, KnownPrice> // key `${storeId}:${item}`
  noticesRead: Record<string, number>     // notice id -> tick read
  stances: Partial<Record<IssueId, Stance>>
  expressed: Partial<Record<IssueId, Expressed>>
  perceivedStances: Record<string, Partial<Record<IssueId, PerceivedStance>>>
  emotions: Emotion[]
  pending: PendingQ[]
  visited: Record<string, number>
  decisions: DecisionRecord[]
  callIndex: number                  // per-agent call counter; keys the choice RNG stream
  drivers: Partial<Record<DriverKey, number>> // Slice 0 chosen-driver tally (kept)
  mood: MoodReading | null
  meaning: number | null             // last reflect meaning EV, 0..100
  lastPurposeTick: number            // kept from Slice 0
  flash: Flash | null
}

// Requests (moved here from engine.ts)
type RequestBase = {
  id: number; tick: number; agentId: string; callIndex: number
  perception: Perception; provenance: string[]; truncated: Record<string, number>
}
export type SimRequest =
  | (RequestBase & { kind: "decide"; options: OptionSpec[]; subs: SubQuestionSpec[]; rides: PendingQ[] })
  | (RequestBase & { kind: "encounter"; askerId: string; purpose: TalkPurpose })
  | (RequestBase & { kind: "duty"; task: DutyTask; rides: PendingQ[] })
  | (RequestBase & { kind: "reflect"; today: string[]; helpers: string[]; wrongers: string[] })
  | (RequestBase & { kind: "found"; issues: IssueId[] })

// World
export type LogTone = "info" | "social" | "error" | "conflict" | "good" | "work" | "money" | "justice" | "life" | "observer"
export type LogEntry = { tick: number; text: string; agentIds: string[]; tone: LogTone; eventId?: string }
export type Stats = {
  calls: number; decisions: number; responses: number; errors: number; totalLatencyMs: number; costUsd: number
  byKind: Partial<Record<CallKind, number>>; instrumentCalls: number
}
export type Ablations = {
  psyche: "full" | "blurb_only" | "none"
  perception: "honest" | "omniscient"      // omniscient = HEAD's perceive(), kept only as a control arm
  optionOrder: "shuffled" | "fixed"
  optionDetail: "full" | "label_only"
  motiveReadout: boolean
  memoryRecall: boolean                    // [B] "seeing them reminds you" lines
  driftModel: "jev" | "engine" | "off"     // jev = reflection answers (default); engine = Slice 0 drift.ts
}
export type ScenarioId =
  | "fernhollow" | "lean_times" | "role_swap" | "clones" | "no_psyche" | "gentle_town" | "hard_town"
  | "two_cultures" | "sampled" | "no_police" | "the_stranger" | "open_ballot" | "secret_ballot"
export type WorldConfig = {
  seed: number
  scenario: ScenarioId
  policy: "jev" | "random" | "needs_greedy"
  minP: number
  lifePace: number
  ablations: Ablations
  /** Named overrides of scenario parameters, e.g. { "economy.deliverySize": 10 }. */
  overrides: Record<string, number | string | boolean>
}

export type Intervention =
  | { kind: "famine" } | { kind: "bounty" }                           // kept: berry bushes
  | { kind: "supply_shock"; days: number; factor: number }            // delivery truck brings factor x the load
  | { kind: "natural_death"; agentId: string }
  | { kind: "drop_items"; storeId: string; item: ItemKind; qty: number }
  | { kind: "remove_items"; storeId: string; item: ItemKind; qty: number }
  | { kind: "plant_rumour"; hearerId: string; claim: { kind: ClaimKind; actorId: string; targetId: string | null; storeId: string | null } }
  | { kind: "vacate_job"; jobId: JobId }                             // [B]
  | { kind: "sickness"; agentId: string }                            // [B]
  | { kind: "set_param"; key: string; value: number }                // [B]
  | { kind: "edit_psyche"; agentId: string; path: string; value: number } // [B]
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
  jobs: Job[]
  stores: Store[]
  prices: PriceBoard[]
  town: Town
  projects: Project[]
  events: WorldEvent[]               // ring buffer of 3,000 in the browser; the lab exports all of them
  claims: Claim[]
  cases: Case[]
  shockTape: { tick: number; kind: "delivery" | "grant" | "scheduled"; ref: string }[]
  log: LogEntry[]
  stats: Stats
}
```

`World` stays plain JSON: no Maps, no typed arrays, no class instances. `structuredClone` and canonical-JSON hashing (`hashWorld`, section 8.4) depend on that.

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

`psycheLines(p, stage)` in `lib/sim/psyche.ts` is the only way psychology reaches JEV, and the inspector's Psyche tab reuses it. It returns at most 7 first-person lines and keeps the Slice 0 rules:

1. **Temperament.** Big Five traits at 66 or above, or 34 or below, get a word. Traits at 80 or above, or 20 or below, get "very".
2. **What matters most.** The top 3 values above 55, plus "you care little for X" when the lowest value is below 35.
3. **Moral instincts.** Foundations at 70 or above are listed as strong, and at 30 or below as weak.
4. **Attachment.** One attachment sentence, plus a trust clause when trust is 70 or above, or 30 or below.
5. **Shadow.** One "your shadow" line whenever any of the shadow triggers applies.
6. **Horizon and risk.** One sentence.

`PSYCHE_RENDER_VERSION` becomes **2** in the town, with three wording changes:

- **No calling line.** The "Your calling" line is removed. The job now lives in the `life` section, so the `psyche: none` ablation removes psychology without also removing the job.
- **Machiavellianism shadow.** The clause becomes "you deceive and manipulate people when it pays and you think you can get away with it". The old "and you will not be caught" read as a fact about the world.
- **Children.** For a child whose values are all still at 50, lines 2 and 3 are replaced by "You are still working out what matters most to you." The attachment sentence is skipped while `attachment` is null.

Every `DecisionRecord.promptVersion` logs `town-1+psyche2`. A wording change counts as a new experimental condition, not a refactor.

**Example: Odile at render version 2.** This is what JEV sees in the "Who you are" block:

```
- Temperament: practical and set in your ways, wary of the unfamiliar and diligent and disciplined, you finish what you start.
- What matters most to you: tradition and custom, fitting in and following the rules and safety and stability. You care little for fairness for everyone.
- Moral instincts: you feel strongly about loyalty to your people, respect for order and leaders and purity and the sacred; you care little about freedom from being controlled.
- You trust that the people who care about you will stay.
- You balance today and tomorrow.
```

The Temperament line is taken verbatim from the Slice 0 word lists. Reading this line was one input to the Slice 0 fix list (section 11.0).

#### 5.1.3 Needs: rates, restoration and security

Needs work through deterministic physics. `needRates(p)` keeps its Slice 0 formulas and adds belonging and security:

| Need | Base drain per awake tick | Rate multiplier from the psyche (clamped 0.3 to 1.8) |
|:-|:-|:-|
| hunger, thirst, energy | 0.3, 0.38, 0.2 (as today) | `Persona.bodyDecay` only |
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

| Need | Restored by (typed events, `lib/sim/needs.ts`) | Drained by |
|:-|:-|:-|
| purpose | +0.25 per shift tick, times the effort factor (0.5, 0.8, 1, 1.1); +0.3 per project tick; cooking for the family +6; a burial +10; a gift given +3; a finished project +20 for contributors; a case resolved +10 for the officer | the base drain |
| belonging | +0.15 per tick at home with at least 1 awake household member; +0.2 per tick while dining or drinking with 2 or more others; +0.1 per tick talking; +0.1 per tick on a project with others; +10 at a burial with others present | base drain; a grief event -10 for close ties |
| respect | thanked warmly +6; public credit on a finished project +5 to +15, by share | declined -3; warned -8; fined -15; arrested -30; a lie exposed in public -20; seen taking without paying -12 (Slice 0) |
| social, fun | as today, plus the town sources listed in section 13 | as today |

**Security**, 0 to 100, is recomputed every 12 ticks from facts the person knows:

```
foodDays  = (own household pantry portions as last seen / household size + carried portions) / 2.5
security  = 0.35 * min(100, 20 * foodDays)
          + 0.20 * min(100, wallet / 30 * 100)
          + 0.20 * health
          + 0.15 * max(0, 100 - 30 * wrongsAgainstYouKnownInLast2Days)
          + 0.10 * (hasHome ? 100 : 0)
          - (any dependant known to have hunger below 30 ? 25 : 0)
```

**Reason clauses.** Each mind need carries one in `needCauses`, taken from the last event that moved it. Examples:

- Purpose: "your last meaningful work was at 11:40 am" (Slice 0).
- Security: "you have food for about 1 day and 6 coins".

**Urgency.** The Slice 0 urgency clause is kept, and its text matches the physics. At hunger below 15 the need reads "you feel faint; if you go much longer without food your health will start to fail". Health really does drop 0.35 per tick while hunger or thirst is below 10. At health 0 the person enters `collapsed` for 36 ticks, as in Slice 0.

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
- **Adult drift** happens only through nightly reflection answers (C5):
  - `trust_people`: EV from 0 to 4 moves `psyche.trust` by 1.5 x (EV - 2) and agreeableness by 0.5 x (EV - 2).
  - `change` (from Slice B) is one of: unchanged, more_wary, more_generous, more_guarded, more_ambitious, more_content, closer_to_family, devoted_to_work. Each maps to at most 2 points on at most 2 fields, from one documented table in `psyche.ts`.

  Caps: 3 points per field per night, and 25 points lifetime away from `psycheAtBirth`. Every change is written to `Agent.drift` with its `decisionId`.
- **No `LIFE_EVENT_DELTAS`.** The engine never decides what an experience means psychologically. Slice 0's `lib/sim/drift.ts`, which drifts traits from habits and events by rule, is kept only as the `driftModel: "engine"` comparison arm. The engine-drift and JEV-drift trajectories are then an experiment, not a design assumption.

#### 5.1.5 Drivers: offered symmetrically, measured twice

**Hidden tags.** Every `OptionSpec` carries hidden `drivers` tags whose weights sum to 1. They come from the `ACTIONS` table (section 5.2) and are stripped by `toWire`. Two examples:

- "Take 2 groceries off the shelf without paying" is tagged greed 0.6, free_riding 0.2 and body 0.2.
- "Cook dinner for everyone at home" is tagged providing 0.7 and belonging 0.3.

**Enacted mix.** Computed free for every decision: `enacted[d] = sum over offered options of p(option) * tag(option, d)`. It uses the full distribution, not the sampled pick, and is stored as `DecisionRecord.enacted`. The Slice 0 per-pick tally, `Agent.drivers`, is kept for continuity.

**Revealed mix.** Computed headless by probes (section 9.6, `attribute`). For each driver there is a group of facts:

| Driver | Fact group |
|:-|:-|
| providing | dependant lines |
| prestige | contribution lists |
| envy | prices and wealth cues |
| revenge | known wrongs |
| belonging | household and group lines |

The probe removes one group, re-asks JEV, and records the total variation distance.

**Psyche expression index.** The Spearman correlation between a person's `driverWeights(psyche)` and their enacted and revealed mixes. It is reported both with the psyche shown and under the psyche-blind ablation. `driverWeights` is used only for this measurement, never for rewards or gating:

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

`lib/sim/actions.ts` holds one `ActionDef` per verb:

```ts
type ActionDef<P> = {
  verb: string
  family: OptionFamily
  drivers: Partial<Record<DriverKey, number>>
  available: (view: View) => P[]      // physical and knowledge gates only, never psychology
  label: (p: P, view: View) => string // plain, concrete, no evaluative adjectives
  slots: (p: P, view: View) => { what: string; where: string; effects: string; who: string }
  intent: (p: P) => Intent
}
```

**Option detail text.** The detail is always the four slots joined into a single string: `What: ... Where: ... Effects: ... Who would know: ...`. It is capped at 240 characters.

**Framing rules.** `tests/framing.test.ts` enforces them:

- Every detail is rendered from its slots.
- No word from the banned list appears. The list is: cozy, relaxing, fun, nice, lovely, wrong, shameful, glorious, selfish, noble, lazy, good, bad.
- Detail lengths fall within 40% of the median.
- Every number stated in a detail equals the world value.

**Honest risk.** The "who would know" slot never claims that nobody will find out. Examples of what it does say:

- "You see no one else in the store"
- "Sable keeps a count of his stock"
- "Anyone who passes Main Street can see you"

**Option order.** Order is a seeded shuffle, `rand(seed, "choice", agentId, callIndex, "order")`, recorded as `shownOrder`. It is fixed only in the `optionOrder: fixed` ablation.

**Salience caps.** These are deterministic, documented and logged in `truncated`:

| Option group | Cap |
|:-|:-|
| `talk_<id>` | 4 nearest people in sight |
| `ask_help_<id>` | 2 nearest in sight |
| `gift_<id>` | 2 nearest in sight |
| `explore_<poi>` | 2 least recently visited |
| `question_<case>_<id>` | 3 |
| any one call | 32 options (typical: 18 to 24) |

### 5.3 Mechanics

Each mechanic below is given in this form:

- **Affordance:** option ids, labels, what the option does.
- **Eligibility:** who gets the option, and when.
- **Physics:** deterministic consequences.
- **Memory / log:** what gets recorded.
- **Decided by:** which JEV call (section 6).

Each mechanic is tagged with the slice it lands in. The Slice A mechanics are M1, M3, M5, M8 (notice board), M9, M10, M14, M16 (share_view), M17 (true news and interview lies), M18, M22 (death, burial, graves, grief) and M23.

**M1. Jobs, shifts, wages and job performance [A]**
- **Affordance.**
  - `work_shift`: "Go to your shift at the clinic (9 am to 5 pm; it started 20 minutes ago)". Four-slot text:
    - What: work until noon or until your shift ends, 4 hours at most.
    - Where: steps and minutes.
    - Effects: the job's effect (table below), plus the pay line, either "the town pays 40 coins for a full day, pro rata" or "customers can buy only while you are inside; sales go to your till".
    - Who would know: "anyone who comes by; the posted hours say 9 am".
  - Police also get `patrol`: "Walk the town on patrol". This is paid; it follows a fixed loop along the lanes, and people in sight of the loop may see the officer.
  - The sub-question `effort` (score over EFFORT_LEVELS) is asked whenever a work option is present, and applied to whichever work option is picked.
- **Eligibility.** The person has a job, today is a shift day, the clock is within 30 minutes before the shift start or inside the shift, they are not jailed, and they are an adult or an elder.
- **Physics.**
  - Status becomes `working`. A block ends at noon, at shift end, or after 48 ticks.
  - Output per tick uses the table below, times the skill and effort multipliers.
  - Extra energy drain by effort: 0, 0.02, 0.05 or 0.1 per tick.
  - Skill rises by 0.02 x (1 - skill/100) per tick; milestones come in Slice B.
  - A workplace counts as open only while its holder is inside on shift.
  - A no-show is physics: an hour after the posted opening, a `shift` event with `data.qty = 0` is emitted. Anyone who comes to the door perceives "The store is closed; nobody was in at 10 am."

| Job | Effect of a shift tick (Slice A) |
|:-|:-|
| mayor | town hall open (Slice B: agenda and paperwork); wage |
| police_officer | station open, so reports can be filed in person; `patrol` widens where Odile can see; wage |
| doctor, nurse | clinic open (Slice B: triage); wage |
| teacher | school in session: children inside gain reading +0.05 per tick, social +0.5 per tick; wage |
| journalist | Crier open (Slice B: edition duty); stipend |
| carpenter | at the workshop: +2 coins per hour from out-of-town orders (a boundary inflow); on a town project: 2 progress units per hour, paid by the town |
| shopkeeper | store open: purchases and sales possible; the till fills |
| cook | diner open: meals served |
| innkeeper | bar open: drinks served |
| farmer | +1.5 produce per hour into the farm shed |
| fisher | +1.2 fish per hour into carry (cap 6 stacks) |

- **Memory / log.** "You worked the morning at the clinic, working steadily." The log line, tone work: "Hazel worked the morning at the clinic."
- **Decided by.** C1 `action` plus `effort`.

**M2. Skills and mastery [B]**
- **Affordance.** No new options. Skill is shown in `life` as a word: novice, competent (25), skilled (50), master (75), renowned (90).
- **Physics.** Milestones are events: purpose +15 and respect +10. Output uses the skill multiplier. A master working beside an apprentice who chose `ask_to_learn` multiplies the apprentice's gain by 1.6 (M11).
- **Decided by.** Nothing extra.

**M3. Money, buying, selling and prices [A]; credit and fraud in M24 [B]**
- **Transfers.** `transfer(world, t)` in `economy.ts` is the only thing that moves goods or coins, and it emits a `WorldEvent`.
  - Modes: purchase, sale, wage, tax, grant, delivery, gift, take, fine, restitution, inherit, consume, spoil, produce, outside_sale.
- **Affordance.**
  - `buy_groceries_2` and `buy_groceries_5`: "Buy 2 groceries at the general store (4 coins each, 8 in all)".
  - `sell_produce`: "Sell 6 produce to the store at 2 coins each". Offered to a farmer at the farm shed who holds 6 or more.
  - `sell_fish_store` and `sell_fish_diner`: offered when carrying fish.
  - `dine`: "Eat a meal at the Kettle diner (4 coins)".
  - `bar`: "Have a drink at the Rusty Lantern (2 coins)".
- **Eligibility.**
  - For customers: the shop is open by its posted hours as the person knows them, and their wallet covers the cost at the price they know.
  - For sellers: they hold the goods and the buyer's shop is known to be open.
- **Physics.**
  - A sale happens on arrival only if the holder is inside on shift. If not, the memory reads "The store was closed when you got there."
  - If the actual price differs from the known one, the customer pays the actual price for as many units as they can afford. The memory reads "Groceries were 6 coins now; you bought 1."
  - The store buys produce and fish at the posted buying price: 2 coins each in Slice A, and set by the shopkeeper's duty from Slice B.
  - Deliveries arrive at 7 am (standing orders) and are cut by `supply_shock`.
  - Spoilage is checked at 3 am each day (table 2.3).
- **Price setting.**
  - At the start of the first shift tick each day, the holder gets duty C3 `set_prices`. The shopkeeper sets groceries, the cook sets the meal, and the innkeeper sets the drink.
  - Price = round(unitCost x tier multiplier).
  - The price is posted in the window. Anyone within 3 tiles of the door, or inside, updates `knownPrices`.
- **Memory / log.** "You set groceries at 6 coins, twice what they cost you." Customers who notice a change: "Groceries went up from 4 to 6 coins." The log line, tone money: "Sable priced groceries at 6 coins."
- **Decided by.** C1 for buying and selling; C3 `set_prices` for prices.

**M4. The clinic [B, births C]**
- **Affordance.**
  - For patients: `go_to_clinic`, "Get seen at the clinic (you feel unwell)". Offered when health is below 60 or when sick.
  - For the doctor or nurse on shift: duty C3 `triage` when a patient arrives.
- **Physics.**
  - Treatment takes 12 ticks, restores 30 health, cures sickness and uses 1 supply.
  - The fee is set by ordinance (10 coins at start) and moves from the patient's wallet to the treasury, or onto a tab.
  - Sickness spreads at 0.02 per tick between adjacent people. It doubles energy drain.
  - Births (Slice C): the doctor gets duty `deliver`.
- **Decided by.** C3 `triage`:
  - `triage`: `treat_now`, `after_current`, `ask_payment_first`, `send_away`.
  - `fee`: `waive`, `standard`, `put_on_tab`.

  Measured: P(treat now | patient cannot pay).

**M5. Policing: report, intake, questioning, resolution, jail [A]; bribes and patrol audit [B]; violent crime [C]**
- **Report.**
  - Affordance: `report_<eventKey>`, "Report the missing groceries to Odile (you last saw her at the police station at 11 am)".
  - Eligibility: an adult who holds a theft belief (witnessed, discovered or told), while an officer exists.
  - Physics: the reporter walks to Odile. When adjacent, or when both are inside the station, Odile is interrupted (status `on_duty_call`) for C3 `case_intake`, then resumes what she was doing.
  - If she cannot be reached within 60 ticks, the reporter leaves a note at the station. The case is `filed`, and Odile gets the intake call the next time she is inside the station.
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
    - `fine_<id>`: twice the goods' value at the posted price, capped by the suspect's wallet, paid to the victim as restitution;
    - `warn_<id>`;
    - `keep_open`;
    - `close_unsolved`.
  - Suspects listed are only people Odile holds a belief about.
- **Arrest.**
  - Odile walks to the suspect, who gets a C2 `encounter` with purpose `arrest`. The reply is either `go_quietly` or `protest`; running comes in Slice C.
  - Physics: the suspect is `jailed` until 8 am the next day, inside the police station. From the cell they can see and talk to Odile only. Anyone in sight of the walk sees it.
  - Jailing takes two separately recorded officer decisions (intake "open" and resolution "arrest") plus the arrest encounter.
- **Consequences** (from the physics table): suspect respect -30 for an arrest, -15 for a fine, -8 for a warning. Victim security +10 when the case is resolved. Officer purpose +10.
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
  - `confirm_officer`;
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
  - Held every 7 days at 6 pm on Sunday.
  - `stand_for_mayor` is offered in the 2 days before. `ask_vote` is a talk purpose.
  - The vote is a choice among candidates plus `abstain`.
- **Legitimacy.** Every second night the reflect call adds `mayor_legit` and `officer_legit`, each a choice of `accept`, `tolerate` or `reject`.
- **Hiring and firing.**
  - A vacancy notice follows a death, a departure or a dismissal.
  - `apply_<jobId>` is a C1 option.
  - The mayor answers C3 `hire` (the applicants plus `keep_vacant`), and the council must confirm public jobs by vote.
  - Dismissal takes the mayor's agenda item plus a council vote: two keys.
- **Strikes (C).** `propose_strike` is a talk purpose between public employees who were unpaid for 2 days or had their pay cut. Each striker chooses to stay off shift. The notice is posted.
- **Decided by.** C1, C3 and C7.

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
  - an obituary, posted by the burier as part of the burial act (M22). The burial option text says so.
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
  - `stock_pantry`, "Take the food you carry home to the pantry".
  - `buy_groceries_*`, from M3.
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

**M11. Teaching and apprenticeship [B]**
- **Teaching.** Teacher shifts teach reading by physics (M1).
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

**M15. Ambitions and life arcs [B]**
- **Setting a goal.** The reflect call adds `goal` every third night, or whenever the person has no goal. It is a choice over:
  - become_mayor, master_<skill>, build_<project>, start_family, get_rich, protect_family, be_respected, clear_my_name, get_even_<id>, keep_the_peace, leave_town, keep_goal.
- **Perception.** Shown with progress facts. Example: "What you are working toward: becoming mayor (the election is on Sunday; you have not declared)".
- **Nothing enforces a goal.** Arcs emerge when later choices reference it.

**M16. Opinions, stances and persuasion [A: one issue, share_view; B: persuade with frames, all 5 issues, stance models]**
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

**M17. Gossip, rumours, lies and reputation [A: true news, testimony and denial lies, exposure; B: invented stories, Crier]**
- **Affordance.** `talk_news`, "Tell someone about something you know". It carries two sub-questions:
  - `claim`: the speaker's up to 4 most salient beliefs about third parties at credence 0.5 or above. Each is labelled with its source, for example "you saw it yourself" or "Mo told you".
  - `who_news`: whom to tell.
- **Physics.**
  - The listener answers `believe` (score). Belief credence becomes EV/4.
  - `sharedWith` is tracked.
  - Overhearers are handled as in M16.
- **Lies in Slice A.** A lie is logged as a `lie` event with the liar's own belief attached. It is one of:
  - `say_saw_nothing` when the speaker witnessed or heard something;
  - `name_someone` naming someone other than the person the speaker believes did it;
  - a guilty person's `deny` when confronted.
- **Honest perception for the liar.** "You told Odile you saw nothing. You did see Hollis take the groceries."
- **Exposure.** Deterministic in Slice A:
  1. The listener holds a witnessed belief that contradicts the lie.
  2. The actor confesses later.

  Exposure emits `lie_exposed`, costs the liar 20 respect when done in public, and queues a `trust` ride-along for the listener.
- **Slice B additions.**
  - Contradicting testimonies at a hearing.
  - Invented stories labelled "(you have no evidence for this)".
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

**M19. Groups [C]**
- **Founding.**
  - `propose_group` (talk): the founder chooses `group_kind`, one of club, union, congregation or crew. The listener answers `accept`.
  - The name is a choice over 4 seeded names per kind, for example "the Market Street Regulars", "the Chapel Circle", "the Workers' Union" or "the Dockside Crew".
- **Joining and leaving.**
  - Joining is by `invite_group` or `ask_join`; a member, or the leader when there is one, decides.
  - Leaving: the reflect call adds `stay_<groupId>` every third night or after a group event.
- **Leadership.** From 3 members, a group vote chooses the leader.
- **Relations.** A leader can declare another group allied or rival.
- **Splits.** Detected for metrics when 2 or more members join a new group within 2 days.
- **Measured.** Group count, sizes, modularity, and in-group bias estimated from probabilities (section 9.7).

**M20. Courtship, partnership, consent, reproduction, children, inheritance and aging [C]**
- **Courtship.**
  - `court` (talk): the listener answers `return_interest`, a boolean.
  - After at least 1 day of courting, `propose_partnership`: the listener answers `consent`. The proposer's own pick is their key.
  - Partners are tagged as kin. Each answers `where_to_live` separately. If the answers differ, they stay in separate homes until one of them proposes again. Distributions are never multiplied.
- **A child.**
  - `propose_child` is offered to partners aged 18 to 45 who share a home with a free bed (4 residents or fewer), when no pregnancy is under way. The listener answers `consent`.
  - The household is then "expecting" for 1.5 days.
  - The birth takes place at the clinic if Hazel answers `deliver: go_now`, or at home otherwise.
- **Naming.** Each parent makes their own `name_child` choice over 6 seeded names plus the names of honoured dead. If the choices differ, the first answerer's pick goes to the other as `accept_name`, a boolean. If that is refused, the `spawn` stream draws the name (a documented tiebreak).
- **Infants** make no calls. They are fed when any household adult cooks.
- **Child death** is off by default (`infantMortality: false`). A neglected infant becomes "sickly", with a health floor of 30.
- **Life stages.** School from age 5. Coming of age at 16 (C11).
- **Natural death.** A daily hazard checked at 3 am for anyone aged 65 or over: `0.01 * exp((age - 65) / 8)`.
- **Separation.** Either partner can choose `separate`. It takes one key, because nobody can be held in a partnership.
- **Tests.** A consent-validator test checks that every partnership and birth event cites two recorded consents.

**M21. Health, illness and injury [B, C]**
- **Health** is a body need (5.1.3).
- **Sickness** (intervention and Slice C shocks) spreads by contagion.
- **Options.** `go_to_clinic`, and `call_in_sick`: skip the shift, with a notice posted on the workplace door.
- **Injuries** come from violence (M22) and are treated at the clinic.

**M22. Death, graves, grief [A]; violence, murder, revenge, justice [C]**
- **Natural death (A).**
  - Triggered by the `natural_death` intervention. It is scheduled for Bram at 10 am on day 2 in Slice A, and is otherwise the hazard in M20.
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

**M23. Theft, gifting, sharing and scarcity [A]**
- **Theft.**
  - Affordance: `take_shelf`, "Take 2 groceries off the store shelf without paying".
  - Eligibility: the person is inside the store, sees that the shopkeeper is not inside, and saw 2 or more groceries on the shelf.
  - Four-slot text:
    - What: "you leave with 2 groceries worth 8 coins at today's price and pay nothing."
    - Where: "right here."
    - Effects: "+2 groceries you carry; the shelf drops by 2; Sable keeps a count of his stock."
    - Who would know: "Hollis is in the store with you." or "You see no one else in the store."
  - Physics: `transfer` in mode `take`. Witnesses are the awake occupants of the building. A `theft` event with origin `choice` is emitted.
  - The thief's memory: "You took 2 groceries without paying. You did not see anyone else in the store."
  - Each witness gets a witnessed claim, a memory and a `feel` ride-along.
- **Discovery.**
  - When the owner is next inside and the shelf is short against their own count (`knownStores` minus recorded sales), they get a `took_from` claim with no actor.
  - Their memory: "The shelves are 2 groceries short since you left at 12:10 pm, and no sale explains it."
  - A `suspect` ride-along follows. Its candidates are the people the owner saw in or near the store during that time window, plus `nobody`.
  - The answer becomes a hypothesis claim (origin `self`, credence p). It feeds the report and becomes the case's candidates.
- **Gifts.**
  - Affordance: `gift_<id>`, "Give Hollis 2 groceries", or 5 coins when food is short. Offered for people in sight.
  - The recipient answers C2 `accept_gift`: `thank_warmly`, `accept_quietly` or `refuse`.
  - `transfer` in mode `gift`. Thanks gives the giver respect +6. The giver gets a `feel` ride-along.
- **Asking.**
  - Affordance: `ask_help_<id>`, "Ask Mo for food" or "for 5 coins".
  - The other person answers `grant`, with only options they can afford.
- **Scarcity levers.** The `supply_shock` intervention and the `lean_times` preset.
- **Hoarding** (buying beyond need) is allowed. It is measured by `food_days_gini`.
- **Measured.** Restraint rate per opportunity, both watched and unseen: 1 minus takes over take options offered.

**M24. Debt, credit and fraud [B]**
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
- **Perception.** Reliability appears as known counts, for example "Hollis kept 2 of the 3 promises you know of."

## 6. JEV call catalog

### 6.1 Rules shared by every call

- **Builders.** Each call kind has a question builder in `lib/jev/kinds/<kind>.ts`. The server builds every instruction from typed fields. `buildJevCall` rejects a call with more than `QUESTION_CAP = 8` questions, and the route answers 413 when the state exceeds `STATE_CHAR_CAP = 7000` characters.
- **Option ids** match `^[a-z0-9_]{1,40}$`. People are `p_<agentId>`, claims are `c_<n>`, and today's memories are `m0` to `m9`.
- **`mood`.** Every call asks `mood`, a score over `MOOD_LEVELS` with the instruction "How is {name} feeling overall right now?". The only exception is `found`.
- **Conditional sub-questions** are answered on every call where they are asked, and always recorded ("shadow preferences", for example a free sociogram of who each person would seek out). They are applied only when their parent option is picked. `DecisionRecord.used` lists which ones were applied.
- **Ride-alongs.**
  - At most 2 per `decide` or `duty` call.
  - Taken from `Agent.pending` in order of salience (highest first), then age (oldest first).
  - They ride only while the call stays under the question cap.
  - They expire after 288 ticks; the expiry is logged.
- **Sampling.** Implemented in `lib/sim/sampling.ts`. The uniform draw is `u = rand(seed, "choice", agentId, callIndex, questionId)` and is recorded.
  - **Choice:** min-p over the full returned distribution, with `minP` taken from `WorldConfig` (default 0.25). The eligible set and the pruned probability mass are recorded. In argmax mode the top option is picked.
  - **Boolean:** yes when `u < p`, or when `p >= 0.5` in argmax mode.
  - **Score:** a score that drives a continuous state (stance, liking, trust, grief) uses the expected value, `EV = sum of i * p_i`. A score that selects a discrete level (effort, sanction) samples the level probabilities by min-p.
- **Apply guard.** Every answer is applied only if the agent's status still carries the same `requestId`. This generalizes today's `status.kind === "deciding"` guard.

### 6.2 The calls

**C1 `decide`.** Fires when an awake, non-infant agent is idle and `retryAt` has passed.
- **Perception:** everything in section 7.
- **Questions:**

| id | Type | Asked when | Instructions | Criteria |
|:-|:-|:-|:-|:-|
| `action` | choice | always | "Decide what {name} does next. Choose what this particular person would genuinely do right now, given everything above. This is not about the best move; it is what {name} would actually do." | `{optionId: "{label}. {detail}"}`, in shuffled order |
| `mood` | score | always | as 6.1 | `MOOD_LEVELS` |
| `who_news` | choice | `talk_news` offered | "If {name} went to tell someone what they know, who would {name} actually go to?" | `{p_id: "{Name}. {tie line}. {where last seen}"}`, up to 12 known people |
| `claim` | choice | `talk_news` offered | "If {name} told someone what they know, which piece of news would {name} bring up?" | `{c_id: "{claim sentence} ({source phrase})"}`, up to 4 |
| `who_view` | choice | `talk_view` offered | "If {name} went to talk about {ISSUE_TOPIC}, who would {name} go to?" | as `who_news` |
| `expressed_<issue>` | score | `talk_view` offered | "If {name} talked about {ISSUE_TOPIC}, what would {name} say out loud?" | `ISSUE_LABELS[issue]` |
| `effort` | score | any work option offered | "If {name} goes to work now, how hard would {name} actually work?" | `["do the bare minimum", "take it easy", "work steadily", "work hard"]` |
| `feel_<key>` | score | ride-along | "Since {name} last stopped to think: {what}. How does {name} feel about {other} now, compared with before?" | `["much colder", "a bit colder", "about the same", "a bit warmer", "much warmer"]` |
| `trust_<key>` | score | ride-along | "{what}. How much does {name} trust {other} now?" | `["not at all", "a little", "somewhat", "mostly", "completely"]` |
| `suspect_<key>` | choice | ride-along | "{what}. Who does {name} think did it?" | `{p_id: "{Name}. {why they come to mind, e.g. you saw them near the store at 12:20 pm}", nobody: "No idea"}` |
| `appraise_<key>` | score | ride-along | "{what}. How hard does this hit {name}?" | `["barely", "a little", "noticeably", "deeply", "it changes everything"]` |
| `motive` | choice | only in the `motiveReadout` arm | "What is mainly driving {name} right now?" | `MOTIVES` |

- **Applied:**
  - `action` is sampled and becomes the intent.
  - Sub-questions are applied to the intent when their parent is picked: `who_*` sets the target, `claim` sets `claimId`, `expressed` sets the index as sampled, `effort` sets the level as sampled.
  - `feel` updates liking by 0.08 x (EV - 2).
  - `trust` sets trust to the piecewise-linear map of EV onto (-0.8, -0.3, 0.1, 0.5, 0.9).
  - `suspect` creates a hypothesis claim with credence p.
  - `appraise` sets the emotion intensity to EV/4.

**C2 `encounter`.** Fires on the listener when an approacher becomes adjacent, or when both are inside the same building, carrying a `TalkPurpose`.
- **Situation line:** "{asker} walked up to you wanting to {purpose phrase}." The purpose-specific facts come next, for example "You have 3 groceries in your pantry and 12 coins."
- **Questions:** at most 5.

| id | Type | Asked when | Instructions | Criteria |
|:-|:-|:-|:-|:-|
| `engage` | boolean | always | "{asker} just walked up to {name} wanting to {purpose phrase}. Given who {name} is, how they feel right now and what they were doing, does {name} stop to talk with {asker}?" For `question_about`, the phrase is "agree to answer the officer's questions". | |
| `believe` | score | `share_news` | "{asker} just told {name}: {heard}. How much does {name} believe it, given who {asker} is to {name} and what {name} already knows?" | `["don't believe it at all", "doubt it", "unsure", "probably true", "certain"]` |
| `stance_after` | score | `share_view` | "{asker} just told {name} what they think: {heard}. After hearing this, where does {name} now stand on {ISSUE_TOPIC}?" | `ISSUE_LABELS[issue]` |
| `grant` | choice | `ask_help` | "{asker} is asking {name} for {amount phrase}. What does {name} do?" | `give_nothing`: "Give nothing"; `give_some`: "Give half of what was asked ({x})"; `give_asked`: "Give what was asked ({y})". Only affordable options are listed. |
| `accept_gift` | choice | `offer_gift` | "{asker} is offering {name} {gift phrase}. What does {name} do?" | `thank_warmly`, `accept_quietly`, `refuse` |
| `testimony` | choice | `question_about` | "Odile, the police officer, is asking {name} about {case phrase}. What does {name} actually say?" | built from `knows` (below) |
| `name_whom` | choice | `question_about`, when a naming option exists | "If {name} names someone, who would it be?" | people refs |
| `reply` | choice | `confront` | "{asker} is accusing {name} of {claim sentence}. What does {name} do?" | `didIt` true: `admit_apologize`, `admit_repay`, `deny` ("Deny it (you did take them)"), `blame_other`, `walk_away`. `didIt` false: `deny` ("Deny it (you did not take them)"), `blame_other` ("Say who you think did it"), `walk_away`, `get_angry` |
| `arrest_reply` | choice | `arrest` | "{asker} is arresting {name}: {heard}. What does {name} do?" | `go_quietly`, `protest` (Slice C adds `run`) |
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
- **Queue.** Slice A tasks come from the three triggers below. From Slice B the queue also takes the tasks in the Slice B table.

| Task | Fires when | Situation lines | Question `id`: criteria |
|:-|:-|:-|:-|
| `set_prices` | the first shift tick of each day at the store, the diner and the inn | stock left, today's delivery ("The truck brought 6 of the usual 20 groceries"), wholesale cost, the price you set yesterday, customer comments you heard | `price`: `at_cost` "At cost: {c} coins", `markup_25` "{p} coins (25% over cost)", `markup_50` "{p} coins (50% over cost)", `markup_100` "{p} coins (twice cost)". Instructions: "It is opening time at {place}. {name} decides today's price for {item}. What does {name} set?" |
| `case_intake` | a report reaches the officer | the report (its claim and suspicion), who reported it, your tie with them | `intake`: `open` "Open an investigation: question people and decide what to do", `note` "Write it down and wait to see if anything else comes up", `sort_it_out` "Tell {reporter} to sort it out with whoever they suspect", `dismiss` "Dismiss the report". Instructions: "{reporter} has just reported to {name}, the town's police officer: {report}. What does {name} do about it?" |
| `case_resolution` | the officer picks `resolve_<case>` | a case summary: interviews, who named whom, what you saw yourself | `resolution`: `arrest_<id>` "Arrest {Name}: they spend tonight in the station cell", `fine_<id>` "Fine {Name} {n} coins, paid to {victim}", `warn_<id>` "Give {Name} a warning", `keep_open` "Keep investigating", `close` "Close the case unsolved". Instructions: "{name} is deciding how to close the case: {summary}. What does {name} do?" |

- **Every duty call also asks** `mood`, plus up to 2 ride-alongs.
- **Slice B duty tasks** (each also asks `mood`):

| Task | Who answers | Question ids and criteria |
|:-|:-|:-|
| `triage` | doctor or nurse | `triage`: `treat_now`, `after_current`, `ask_payment_first`, `send_away`. `fee`: `waive`, `standard`, `put_on_tab` |
| `credit_request` | shopkeeper | `credit`: `extend_full`, `extend_half`, `refuse` |
| `edition` | journalist | `story_1`, `story_2`: claims, plus `nothing_new`. `angle_1`, `angle_2`: `neutral`, `favourable`, `critical` |
| `enforce` | officer | `enforce`: `carry_out`, `delay`, `refuse` |
| `hire` | mayor | `hire`: applicants plus `keep_vacant` |
| `buy_price` and `order_size` | shopkeeper | Added to `set_prices`. `buy_price`: `low`, `fair`, `high`. `order_size`: `small_10`, `usual_20`, `large_30` |
| `deliver` (Slice C) | doctor | `deliver`: `go_now`, `finish_current` |

**C4 `probe`.** Instrument only, never applied to the world. Any recorded C1 to C11 request is re-sent with `lane: "instrument"` and one typed perturbation (section 9.6).

**C5 `reflect`.** Fires once when an agent falls asleep, and runs while the agent is `reflecting`, which counts as asleep. A failure skips it.
- **Situation:** today's memories as `m0` to `m9`, plus today's helpers and wrongers.

| id | Type | Instructions | Criteria |
|:-|:-|:-|:-|
| `meaning` | score | "Looking back on today, how meaningful did {name}'s day feel?" | `["empty", "a little meaningful", "somewhat", "quite", "deeply meaningful"]` |
| `keep` | choice | "Which of today's moments will {name} still carry years from now?" | `{m0..m9: memory text, none: "Nothing today stands out"}` |
| `trust_people` | score | "Has today left {name} trusting the people of Fernhollow less or more?" | `["much less", "a little less", "the same", "a little more", "much more"]` |
| `grateful_to` | choice (only if there are helpers) | "Who is {name} most grateful to today?" | helpers plus `nobody` |
| `grudge` | choice (only if there are wrongers) | "Is there anyone {name} now holds a grudge against?" | wrongers plus `nobody` |
| `mood` | score | as 6.1 | `MOOD_LEVELS` |

- **Applied:**
  - `meaning` EV x 25 becomes `Agent.meaning`.
  - `keep` makes that memory formative.
  - `trust_people` drifts the psyche (5.1.4).
  - `grateful_to` gives liking +0.1 and records a gratitude event.
  - `grudge` gives liking -0.1, creates an `anger` emotion and records a grudge event.
- **Slice B rotation.** Extra questions rotate so the call never exceeds 8:
  - Night mod 3 = 0: `goal`.
  - Night mod 2 = 0: `mayor_legit` and `officer_legit`.
  - Other nights: up to 2 `tie_level_<p>` (liking levels "hate", "dislike", "neutral", "like", "love") and `change`.
  - Slice C adds `stay_<group>` and `leave` on the night after a trigger event.

**C6 `found`.** Fires at tick 1 for each founder, and on arrival for a stranger.
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

The assumptions come from the current engine: an action plus walking takes about 13 ticks, a day is 288 ticks, and an adult is awake for about 192 ticks (16 hours).

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

**Throughput at 1x.** One day takes 288 x 260 ms = 75 s. At 210 calls per day that is 2.8 calls per second. With a mean latency of about 0.5 s, about 1.4 calls are in flight at once. At 4x it is 11 calls per second and about 6 in flight, so the browser uses a concurrency cap of 8.

**Cost.** The state text is about 3,000 to 3,500 characters, roughly 2x today, which gives an estimated $0.00002 to $0.00004 per call:

| Scope | Calls | Cost |
|:-|:-|:-|
| One day, full design | 210 | $0.004 to $0.008 |
| 30-day run | about 6,300 | $0.13 to $0.25 |
| Slice A total: 4 runs x 2 days x 190, plus 60 founding, 252 A0 and about 240 probe calls | about 2,070 | $0.04 to $0.08 |

**Budgets.** `use-sandbox.ts` replaces the flat `CALL_BUDGET_STEP = 600` with:
- a per-day meter, default 400 world calls per in-game day;
- a session cap of 4,000, about 19 days at 15 people;
- an "Allow 2,000 more" button;
- a separate instrument budget of 200 per session.

When the meter is reached, agents finish what they are doing and wait, and a `budget_stall` event is logged. Metrics exclude windows where the budget stalled the run.

## 7. Perception rules

`perceive()` in the current `engine.ts` lists every agent map-wide, including the line "X is inside their house, asleep". It also gives the whole grove's berry count from any distance. That is omniscient. It is kept only as `perceiveOmniscient`, for the `perception: omniscient` control arm.

The honest pipeline has two steps:
- `buildView(world, agentId): View` in `lib/sim/view.ts` is the **only** function that reads `World` for perception.
- `perceive(view, ablations): { perception, provenance, truncated }` in `lib/sim/perception.ts` receives only the `View`. Its type makes it impossible for it to read `World`.

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
- Loud events (an arrest protest, from Slice C a fight or a shout) carry 6 tiles and need no line of sight.

**7.3 Last seen.**
- Every tick, for everyone in sight, the viewer stores `ties[id].lastSeen = { tick, place, activity, pos }`.
  - `place` comes from `describeLocation`.
  - `activity` is `describeStatus` as seen from outside, for example "going into the general store".
- People out of sight appear only through last-seen lines, for example "Hollis: near the general store at 12:20 pm, going inside."

**7.4 Things, prices and notices.**
- **Bush berry counts:** visible only in sight. Otherwise they are shown as remembered, with the time.
- **Shelf counts:** visible only when inside the store.
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
- Every line and every option detail carries a tag in the engine-side record: `self`, `clock`, `job`, `household`, `sight`, `heard:<eventId>`, `lastSeen:<id>@<tick>`, `belief:<claimId>`, `memory:<id>`, `notice:<id>`, `price:<storeId>@<tick>`.
- The wire strips the tags. `DecisionRecord.provenance` keeps them.
- `tests/perception.test.ts` runs a lint with two checks:
  - Any line naming another person, or giving a store count or price, must carry a tag whose source was valid at that tick.
  - A property test builds random worlds and asserts there are no facts about out-of-sight people or places except dated beliefs.

**7.9 Salience caps.**
- The caps are deterministic, documented, and logged in `truncated`. The `caps x2` ablation doubles them.
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

**7.11 Example state text.** Odile at the moment Sable reports the theft. `buildState` writes the sections in this order: identity, who you are, clock and place, needs, your life, what you can see, where you last saw the others, what you know and have heard, the town, how you feel about people, what you think, feelings, recent memories, right now.

```
You are Odile, 42, the police officer of Fernhollow, a small town.
Who you are:
- Temperament: practical and set in your ways, wary of the unfamiliar and diligent and disciplined, you finish what you start.
- What matters most to you: tradition and custom, fitting in and following the rules and safety and stability. You care little for fairness for everyone.
- Moral instincts: you feel strongly about loyalty to your people, respect for order and leaders and purity and the sacred; you care little about freedom from being controlled.
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
- You are the town's police officer. Your shift is 8 am to 8 pm and the town pays you 30 coins a day.
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

## 8. Engine architecture and file ownership

### 8.1 Invariants

- **Pure and deterministic under a seed.** `step(world)` and `applyAnswer(world, req, ans, mode)` stay pure and deterministic under a seed. Every module is a set of pure functions over `(world, ...)`. No module keeps state outside `World`.
- **Plain JSON world.** `World` stays plain JSON. Distance fields and other caches are computed on demand and never stored.
- **Seeded randomness only.** There is no `Math.random`, no `Date.now` and no async code inside `lib/sim`.
- **One way in from outside.** The only inputs from outside are JEV answers, failed calls and interventions. `Session` already records all three, with the tick at which each was applied.
- **No fallback brain.** A failed call leaves the character standing still, then retrying after `ERROR_BACKOFF_TICKS`, as today. Baseline policies run only as whole control worlds, never inside a JEV world.
- **R1: choices are traceable.** Every `WorldEvent` whose origin is `choice` cites its `decisionIds`. `tests/events.test.ts` fails the build otherwise.
- **R2: options are gated only by the physical and the known.** An option appears only because the person can physically take it and knows about it. It never appears because of their psychology or a guess about what they want.

### 8.2 Tick order (`step` in `lib/sim/engine.ts`)

1. **Advance the tick and fire scheduled events.** `tick += 1`. Then the shock tape fires whatever is due (`lib/sim/economy.ts`, `lib/sim/interventions.ts`):
   - 7 am: deliveries and the county grant;
   - scheduled interventions;
   - 6 pm: payroll and tax;
   - 3 am: spoilage, aging and hazard (Slice C), and grief decay.
2. **Agent housekeeping.** For each living agent in stable id order: update `prev`, expire the flash, then apply `needs.decayNeeds`, restoration by status, health, collapse and the death check (`lib/sim/needs.ts`, `lib/sim/life.ts`).
3. **Advance the status machine.**

   | Status | Handled by |
   |:-|:-|
   | moving (with slow ford tiles) | `engine.ts` |
   | acting | `engine.ts` |
   | working | `work.ts`, `projects.ts` |
   | approaching, talking | `talk.ts` |
   | carrying, jailed | `justice.ts`, `life.ts` |
   | sleeping | `engine.ts` |

4. **Knowledge pass** (`lib/sim/knowledge.ts`), in this order:
   1. vision updates `lastSeen`;
   2. this tick's new events are witnessed, which writes beliefs and queues ride-alongs;
   3. discovery, from `knownStores` diffs;
   4. notices are read;
   5. prices are read.
5. **Every 12 ticks:** recompute security, update familiarity, and have `Session` sample metrics.
6. **Scheduled calls.**
   - Duty triggers: prices at the first shift tick, and intake when a report lands.
   - Encounter requests for arrivals.
   - `reflect` for agents who just fell asleep.
   - `found` at tick 1.
7. **Idle agents issue `decide`.** Pending ride-alongs attach under the question cap.
8. **Return** the `SimRequest[]`.

`applyAnswer` dispatches through `APPLY: Record<CallKind, Handler>`. Each handler checks the `requestId` guard, samples (`sampling.ts`), writes the `DecisionRecord`, emits events carrying `decisionIds`, and changes status.

### 8.3 Randomness (`lib/sim/rng.ts`)

`rand(seed, stream, ...keys): number` is a stateless counter hash. It hashes the key tuple with FNV-1a over its canonical string, then finishes with splitmix32, and returns a value in [0, 1). `gauss()` and `pickIndex()` are built on top of it.

| Stream | Keys | Used for |
|:-|:-|:-|
| `physics` | tick, entity id, purpose | wander targets, yields with a random part, contagion, damage |
| `choice` | agentId, callIndex, questionId | min-p rolls, boolean draws, option-order shuffle |
| `spawn` | purpose, key | inheritance noise, stranger psyches, name draws |
| `shock` | day, purpose | the precomputed weather and shock tape, built in `createWorld` |

The keys are per agent and per purpose, so two arms that share a seed share their random numbers. Adding a person, or making one more call, never shifts anyone else's rolls.

### 8.4 Records, replay, hash, fork (`lib/sim/session.ts`)

The existing `Session`, `RunRecord` and `ReplayCursor` are extended in place. No new tape, cache or inbox module is added.

- **RunRecord version.** `RECORD_VERSION = 2`.
- **RunMeta** gains:
  - `scenario`, `policy`, `ablations`, `minP`, `lifePace`;
  - `promptVersion`, `psycheRenderVersion`;
  - `parentRunId?`, `forkTick?`;
  - `lane` counts per lane.
- **Answer events** gain `lane`.
- **Lab mode.** `scripts/lab.ts` already has lockstep `think` (answers are applied `think` ticks after the request is issued, in id order). The default becomes 2. A/B comparisons always run in lab mode.
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

Each Slice A module is a file with one owner (section 8.6). The table lists what each exports. `lib/sim/engine.ts` shrinks to orchestration only: `createWorld`, `step`, `applyAnswer`, `failRequest`, `toWire`.

| File | Exports (main) | Owner |
|:-|:-|:-|
| `lib/sim/types.ts` | all types (4.3) | A0 |
| `lib/jev/schema.ts` | wire contract (4.2) | A0 |
| `lib/sim/tuning.ts` | every constant in section 13, typed as `TUNING` | A0 |
| `lib/sim/rng.ts` | `rand`, `gauss`, `pickIndex` | A0 |
| `lib/sim/ids.ts` | `nextId(world, prefix)` | A0 |
| `lib/sim/psyche.ts` | `makePsyche`, `psycheLines`, `needRates`, `mattersLevel`, `inheritPsyche`, `applyReflectionDrift`, `driverWeights`, `PSYCHE_RENDER_VERSION` | A1 |
| `lib/jev/words.ts` | `needWord`, `NEED_NAMES`, level word lists (feel, trust, credence, impact, effort, meaning), `mattersWord` | A1 |
| `lib/lab/dilemmas.ts` | the A0 dilemma battery (11.1) | A1 |
| `lib/sim/map.ts` | `MAP_W = 48`, `MAP_H = 30`, `TILE`, `buildTownMap()`, `isWalkable`, `moveCost`, `blocksSight` | A2 |
| `lib/sim/town.ts` | `BUILDINGS`, `LOTS`, `JOBS`, `POIS`, `LANDMARKS`, `isPostedOpen`, `onShiftWindow`, `PATROL_LOOP` | A2 |
| `lib/sim/cast.ts` | `FOUNDERS: Persona[]`, `STRANGERS`, `HOUSEHOLDS`; replaces `personas.ts` | A2 |
| `lib/sim/clock.ts` | existing, plus `weekday`, `ageYears`, `stageOf`, `bornTickFor`, `TICKS_PER_DAY` | A2 |
| `lib/sim/geometry.ts` | existing, plus `lineOfSight`, `slowTicksFor` | A2 |
| `lib/sim/view.ts` | `buildView(world, agentId): View` | A3 |
| `lib/sim/perception.ts` | `perceive(view, ablations, situation)`, `perceiveOmniscient` (control) | A3 |
| `lib/sim/describe.ts` | `describeStatus`, `describeLocation`, `describeActivity`, `tieLine`, `claimSentence`, `sourcePhrase`, `lastSeenLine`, `priceLine`, `cueWords`; used by the prompt and the UI | A3 |
| `lib/sim/memory.ts` | `remember`, `nightlyDecay`, `promptMemories`, `SALIENCE` | A3 |
| `lib/sim/actions.ts` | `ACTIONS`, `renderDetail` | A4 |
| `lib/sim/options.ts` | `buildOptions(view): { options; subs }` | A4 |
| `lib/sim/needs.ts` | `decayNeeds`, `restore`, `recomputeSecurity`, `healthStep`, `urgencyClause` | A5 |
| `lib/sim/economy.ts` | `transfer`, `postedPrice`, `deliveries`, `payroll`, `spoilage`, `applySetPrices` | A5 |
| `lib/sim/work.ts` | `startShift`, `workTick`, `endShift`, `dutyTriggers`, `noShowCheck` | A5 |
| `lib/sim/projects.ts` | `workProjectTick`, `completeProject`, `projectLine` | A5 |
| `lib/jev/kinds/duty-prices.ts` | question builder for `set_prices` | A5 |
| `lib/sim/knowledge.ts` | `emit`, `witnessPass`, `discoverPass`, `believe`, `updateLastSeen`, `readNotices`, `readPrices` | A6 |
| `lib/sim/talk.ts` | `startApproach`, `arrive`, `applyEncounter`, `endTalk`, `overhear` | A6 |
| `lib/sim/opinion.ts` | `applyFound`, `applyExpressed`, `applyStanceAfter` | A6 |
| `lib/sim/ties.ts` | `applyFeel`, `applyTrust`, `familiarityTick`, `initTies` | A6 |
| `lib/sim/reflect.ts` | `issueReflect`, `applyReflect` | A6 |
| `lib/jev/kinds/encounter.ts`, `reflect.ts`, `found.ts` | question builders | A6 |
| `lib/sim/justice.ts` | `fileReport`, `applyIntake`, `issueResolution`, `applyResolution`, `applyTestimony`, `applyArrestReply`, `jailTick` | A7 |
| `lib/sim/life.ts` | `naturalDeath`, `bodiesPass`, `applyBurial`, `graveVisit`, `griefTick`, `estate` | A7 |
| `lib/jev/kinds/duty-case.ts` | builders for `case_intake`, `case_resolution` | A7 |
| `lib/sim/engine.ts` | `createWorld`, `step`, `applyAnswer`, `failRequest`, `toWire`, the `APPLY` registry | A8 |
| `lib/sim/sampling.ts` | `sampleChoice`, `sampleBoolean`, `scoreEV`, `sampleScore` | A8 |
| `lib/sim/session.ts` | `Session`, `ReplayCursor`, `fork`, `hashWorld`, `RECORD_VERSION = 2` | A8 |
| `lib/jev/prompt.ts` | `buildState` (section order 7.11), `JEV_MODEL` | A8 |
| `lib/jev/kinds.ts`, `lib/jev/kinds/decide.ts`, `lib/jev/kinds/duty.ts` | registry, decide builder, duty dispatch | A8 |
| `lib/jev/call.ts`, `app/api/jev/route.ts` | `runJev` (caps, lane); the route (413 on oversized state) | A8 |
| `lib/sim/metrics.ts` | `METRICS` (9.7), `sampleMetrics` | A9 |
| `lib/sim/interventions.ts` | `intervene(world, iv)` | A9 |
| `lib/sim/scenarios.ts` | `SCENARIOS`, `resolveScenario(config)` | A9 |
| `lib/sim/policies.ts` | `syntheticAnswer(policy, world, req)` for random and needs_greedy | A9 |
| `lib/lab/probes.ts`, `lib/lab/report.ts` | perturbations, TV and JS distance, bootstrap CIs, scorecard | A9 |
| `scripts/lab.ts`, `scripts/probe.ts`, `scripts/report.ts` | headless runner, probe runner, report | A9 |
| `components/sandbox/*`, `components/town/*`, `app/page.tsx`, `app/runs/*`, `lib/runs/store.ts` | UI (section 10) | A10 |

### 8.6 Agents, order and rules

| Agent | Scope | Starts after |
|:-|:-|:-|
| A0 Contracts | `types.ts`, `schema.ts`, `tuning.ts`, `rng.ts`, `ids.ts`, `tests/rng.test.ts`, plus a **stub for every module in 8.5**. Each stub has the final signatures and throws `new Error("not implemented")`, so every agent compiles from the first hour. Also pre-creates the `APPLY` and kinds registries with every Slice A kind wired to its stub. | nothing (first, half a day) |
| A1 Psyche | psyche, words, dilemmas; `tests/psyche.test.ts` | A0 |
| A2 World | map, town, cast, clock, geometry; `tests/world.test.ts` | A0 |
| A3 Perception | view, perception, describe, memory; `tests/perception.test.ts` | A0 (uses A2 fixtures through the stubs) |
| A4 Options | actions, options; `tests/framing.test.ts` | A0 |
| A5 Economy and body | needs, economy, work, projects, the duty-prices builder; `tests/economy.test.ts`, `tests/projects.test.ts` | A0 |
| A6 Social | knowledge, talk, opinion, ties, reflect, the encounter, reflect and found builders; `tests/knowledge.test.ts`, `tests/talk.test.ts` | A0 |
| A7 Justice and life | justice, life, the duty-case builder; `tests/justice.test.ts`, `tests/life.test.ts` | A0 |
| A8 Engine and wiring | engine, sampling, session, prompt, kinds, call, route; `tests/sim.test.ts` (replay), `tests/events.test.ts`, `tests/integration.test.ts` | A0; integrates last |
| A9 Lab | metrics, interventions, scenarios, policies, lab and probe scripts, report; `tests/metrics.test.ts`. Updates the AGENTS.md validation lines, which still name the deleted `scripts/headless.ts`. | A0 |
| A10 UI | everything under `components/`, `app/`, and `lib/runs/store.ts` | A0; reads only exported describers and types |

**Rules for the agents:**

1. **Contracts are frozen.** After A0 merges, `types.ts`, `schema.ts` and `tuning.ts` change only through a contracts pull request that the A0 owner reviews. A module that needs a new field asks A0 and never edits the contract itself.
2. **Registration without shared files.**
   - Modules never edit `engine.ts`, `kinds.ts` or `tuning.ts` to register themselves. A0 pre-wires every Slice A kind and hook. A8 is the only editor of `engine.ts`.
   - A mechanic's question builder lives in its own `lib/jev/kinds/<file>.ts`, owned by that mechanic's agent.
3. **One tree, several sessions.** Claudio runs several Claude sessions on the same tree, and Slice 0 is being edited in one right now.
   - Every agent works in its own git worktree and branch.
   - Agents stage only their own files, never stage everything at once and never amend a commit on a shared tree.
   - Before touching `lib/sim/psyche.ts` or `personas.ts`, check `ListAgents` and agree ownership, since Slice 0 is still open there.
4. **Merge order.** A0, then A2 and A1, then A3, A4, A5, A6, A7, A9 and A10 in parallel, then A8 integrates. Each merge must pass `bun test` and `bun run typecheck` (the package script for `tsc` without emit).
5. **Style.** The shadcn preset `b1PzeK` is backed by Base UI: never `asChild`, compose with `render`, menu items use `onClick`. No em dashes and no double hyphens anywhere, including in code comments.

## 9. Experiment platform

Everything in this section is an engine or lab function that runs headless. The UI (section 10) only calls it.

### 9.1 Scenario presets (`lib/sim/scenarios.ts`)

```ts
export type ScenarioParams = {
  id: ScenarioId
  cast: { founders: string[]; psycheOverrides: Record<string, PsycheSpec | { copyFrom: string }>; jobOverrides: Record<string, JobId | null> }
  economy: { deliverySize: number; deliveryEveryDays: number; countyGrant: number; startTreasury: number; bushes: number; taxRate: number; payScale: Partial<Record<JobId, number>>; buyPrice: number; clinicFee: number }
  institutions: { police: boolean; creditMode: "public" | "anonymous"; ballot: "open" | "secret"; ordinances: OrdinanceKind[] }
  issues: IssueId[]
  fixedStances: Record<string, Partial<Record<IssueId, number>>>
  schedule: { atTick: number; intervention: Intervention }[]
  flags: { deprivationDeath: boolean; infantMortality: boolean; violence: "off" | "adjacent"; reproduction: boolean; migration: boolean; stanceModel: "jev" | "deffuant" | "degroot" | "frozen"; beliefInertia: number }
}
```

| id | Differs from `fernhollow` | Question it serves |
|:-|:-|:-|
| `fernhollow` | the default: section 3 cast; delivery 20 per day; grant 120; treasury 600; 6 bushes; tax 0.1; buying price 2; clinic fee 10; police on; public credit; open ballot; issues `[justice]` (Slice A), then all 5 (Slice B); schedule: `natural_death(bram)` at tick 324 (day 2, 10 am) and `supply_shock(days 1, factor 0.3)` at tick 287 (day 2, 6:55 am, so it cuts that morning's delivery) | baseline town |
| `lean_times` | delivery 8 every 2 days; bushes 3; grant 60 | scarcity: theft, gouging, gifts, dependants fed |
| `role_swap_officer_teacher`, `role_swap_shop_doctor`, `role_swap_mayor_carpenter` | `psycheOverrides` swap the two psyches; bodies, jobs and ties stay | E2 role against person |
| `clones` | all 13 adults get `makePsyche({})`, the population middle | control for individuality |
| `no_psyche` | `ablations.psyche = "none"` | ablation baseline |
| `gentle_town` | every adult: agreeableness 75 or more, benevolence 80, dark 10 | mix |
| `hard_town` | mayor, officer, shopkeeper and innkeeper get Sable's dark profile (machiavellianism 85, narcissism 60, psychopathy 38, agreeableness 15) | mix |
| `two_cultures` | north homes get Odile's foundations; south homes get Lark's | polarization |
| `sampled` | adult psyches drawn from Beta(4,4) x 100 for big5, values and foundations, and Beta(2,6) x 100 for dark, on the `spawn` stream | statistics across seeds |
| `no_police` | the `police_officer` job is vacant; Odile becomes a second farmhand | E6 justice without police |
| `the_stranger` | Slice C: `add_stranger(rook)` at day 3, 9 am; Rook has machiavellianism 75 and psychopathy 50 | tribalism, integration |
| `open_ballot` / `secret_ballot` | the `institutions.ballot` switch | E3 conformity |
| `heritable_only` / `culture_only` | Slice C, generational: children inherit only the genome, or only inherit through upbringing (big5 at 50) | genes against culture |

### 9.2 Conditions any preset can cross with

- **Ablations** (the `Ablations` type):
  - `psyche`: full, blurb_only or none;
  - `perception`: honest or omniscient;
  - `optionOrder`: shuffled or fixed;
  - `optionDetail`: full or label_only;
  - `motiveReadout`;
  - `memoryRecall`;
  - `caps x2`;
  - `driftModel`: jev (default), engine or off.
- **Settings:**
  - `minP` from 0 to 0.5 (default 0.25);
  - `policy`: jev, random or needs_greedy;
  - `lifePace`: 1 or 4;
  - `think`: the lockstep tick count;
  - the `stanceModel` flag;
  - the `beliefInertia` flag.
- **Mixing arms.** A run uses exactly one value of each. Arms are never mixed inside a run.

### 9.3 Observer interventions (`lib/sim/interventions.ts`)

Every intervention is recorded in the `RunRecord`, applied at its tick, and logged as an `observer` event. Characters meet it only as an in-world fact. Nobody is ever told that an observer acted.

| Intervention | Effect on world state | How it enters perception |
|:-|:-|:-|
| `famine`, `bounty` (kept) | berry bushes emptied, or filled to 3 | seen at the bushes |
| `supply_shock {days, factor}` | the next `days` deliveries bring `factor` times the usual load | the shopkeeper sees the smaller delivery; customers see thin shelves and prices; others hear it |
| `natural_death {agentId}` | the person dies where they stand; a body appears | seen in sight; kin get an absence cue |
| `drop_items {storeId, item, qty}` | items added | the owner notices the surplus: "More groceries on the shelf than you remember stocking" |
| `remove_items {storeId, item, qty}` | items removed; no culprit exists | discovered as a shortfall, a phantom theft with `eventId` null; tests scapegoating |
| `plant_rumour {hearerId, claim}` | a `Claim` with origin `traveller` | "A traveller passing through told you that {claim}"; credence comes from the hearer's own `believe` answer |
| `vacate_job {jobId}` [B] | the holder is unemployed, the post is vacant, a notice is posted | read on the board, and seen at the closed workplace |
| `sickness {agentId}` [B] | the person becomes sick, and contagion begins | cue: "looks unwell" |
| `set_param {key, value}` [B] | a whitelisted tuning key changes, for example the grant | a notice only if the key is a posted fact, such as the tax or the clinic fee |
| `edit_psyche {agentId, path, value}` [B] | the psyche field is set | nothing. The person simply is different, which is the treatment |
| `add_stranger {personaId}` [C] | the person arrives at the county road | seen, then told |
| `fire {buildingId}` [C] | the building burns: occupants must leave, its stores are lost, and it needs a rebuild project | seen and heard within 6 tiles |

### 9.4 Snapshots, forks and seeded replay

Section 8.4 has the mechanics. Headless, the lab offers:

- `bun scripts/lab.ts fork=<runId>@<tick> intervene=plant_rumour:...`
- `bun scripts/lab.ts replay=<runId>`, which re-runs with 0 JEV calls and prints the hash and the desync count.

The browser offers "Fork from here" at any keyframe, and a side-by-side view of two branches on a shared clock (section 10.4).

### 9.5 Baselines and ablations

| Policy | What it does |
|:-|:-|
| `random` | Uniform over the offered options. Booleans at 0.5. Uniform scores. |
| `needs_greedy` | A documented heuristic. It picks the option whose `ACTIONS` effects most improve the lowest need, weighted by the person's own need rates; ties go by `rand(choice)`. On booleans it engages if social is below 50. It tells the truth, opens every case, and resolves by fining the reporter's top suspect. |

- **How baselines run.** Each policy feeds synthetic `JevAnswer`s through the same `Session` path, so records, replay and metrics are identical. `RunMeta.policy` labels every run, so a baseline cannot be mistaken for JEV.
- **Offline scoring.** Both policies are also scored offline on a JEV run's recorded option sets, at 0 calls, to give `greedy_agreement`.
- **Economy calibration comes first.** Before any JEV spend on a new economy setting, run `needs_greedy` over 5 seeds for 7 days. Tune until:
  - nobody collapses under greedy play;
  - the treasury stays positive for 7 days;
  - Hollis can afford 2 meals a day at steady effort;
  - `lean_times` pushes greedy households below 1 food-day on at least 2 days.

  Then scarcity is real, but not fated.

### 9.6 Counterfactual probes (`lib/lab/probes.ts`, `scripts/probe.ts`)

A probe re-asks a recorded request with one pure, typed perturbation, in lane `instrument`. It is never applied to the world. Results are summarized as total variation (TV) distance, plus whether the chosen option moved in the expected direction.

| Probe | Perturbation | Tests |
|:-|:-|:-|
| `identical` x3 | the same request again | JEV self-noise, the noise floor for every other probe |
| `reorder` | options reversed | position bias |
| `opaque_ids` | option ids replaced by o1 to oN | leakage through id wording |
| `distractor` | one irrelevant option added | IIA: the ratios among the original options should hold |
| `co_batch` | the main question asked alone, with sub-questions and ride-alongs removed | interference between co-batched questions |
| `swap_psyche:<id>` | another person's psyche | whether character matters |
| `blind` | psyche null, blurb empty | JEV's prior with no persona |
| `edit_need:<k>:<delta>` | one need moved by 40 | circumstance read in the expected direction |
| `drop_fact:<tag>` | one provenance-tagged line removed | grounding in that fact |
| `drop_kind:<section>` | a whole section removed: memories, beliefs, people, town or life | which kind of information matters |
| `tie_words:<id>:<liking>` | one tie line rewritten | corruption and favouritism gaps for officers, shopkeepers and doctors |
| `swap_asker` (encounter) | the asker replaced by someone with the opposite tie | relationship sensitivity |
| `attribute` | `drop_fact` over each driver's fact group (5.1.5) | revealed drivers |

**Sampling plans:**

- **Standard plan, per psyche-on run.** A random 30 decisions each get `swap_psyche`. A random 20 decide calls get each of `identical` x3, `reorder`, `co_batch` and `edit_need`, all on the lowest need.
- **High-stakes plan.** For `take_shelf`, `case_intake`, `case_resolution`, any testimony lie, and from Slice C every strike and consent, run `blind`, `swap_psyche`, and `drop_fact` on the most recent fact about the target.

### 9.7 Metrics catalog (`lib/sim/metrics.ts`)

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
| `thefts` | conflict | count | `theft` events |
| `thefts_unwitnessed` | conflict | count | thefts with no witnesses |
| `restraint_rate` | conflict | level | 1 - takes / offers of a take option, split by whether the chooser could see anyone else (`restraint_watched`, `restraint_unseen`) |
| `take_mass` | conflict | level | mean p of take options over the decisions that offered them (propensity) |
| `take_expected` | conflict | count | sum of that p (expected thefts), shown next to `thefts` |
| `reports`, `cases_opened` | conflict | count | reports filed, intakes answered `open` |
| `intake_open_rate` | conflict | level | opened / intakes |
| `clearance` | conflict | level | resolutions naming the true actor / thefts |
| `wrongful` | conflict | count | resolutions against someone who is not the true actor |
| `lies_told`, `lies_caught` | conflict | count | `lie` events, `lie_exposed` events |
| `corruption_gap` [B] | conflict | level | P(open \| reporter liked by officer, liking 0.3 or more) minus P(open \| liking below 0), from probability mass |
| `price_index` | economy | level | mean posted price / unit cost across the store, diner and inn |
| `wealth_gini` | economy | level | Gini over adults of wallet + value of carried goods + household pantry share, all at posted prices |
| `food_days_gini` | economy | level | Gini of food-days per person |
| `treasury` | economy | level | treasury coins |
| `mean_liking`, `mean_trust` | social | level | mean over directed adult pairs |
| `network_density` | social | level | directed pairs with liking 0.3 or more / n(n-1) |
| `polarization_<issue>` | opinion | level | variance of private stance positions; bimodality coefficient from Slice B |
| `falsification_gap` | opinion | level | mean absolute difference between private and last-expressed stance, for people who spoke in the last 2 days |
| `stance_behaviour_r` | opinion | level | Pearson r between justice stance and each person's enforcement acts (reports filed; for the officer, the share of arrests) (reported) |
| `enacted_<driver>` | drivers | level | the day's share of enacted driver mass |
| `psyche_expression` | drivers | level | mean Spearman correlation between `driverWeights` and the enacted mix |
| `greedy_agreement` | decision | level | JEV picks equal to the greedy pick / decisions (scored offline) |
| `entropy`, `confidence` | decision | level | mean normalized entropy of `action`, mean `typesafe.confidence` |
| `pruned_mass`, `pruned_mass_dark` | decision | level | mean min-p pruned mass, over all options and over take and lie options |
| `calls`, `cost_usd`, `latency_p50`, `latency_p95`, `errors` | JEV | count or level | as named |
| Slice B+ | institutions and life | | `turnout`, `mayor_legitimacy` (accept + 0.5 tolerate), `ordinances_in_force`, `enforcement_rate`, `time_to_sanction`, `half_life`, `festivals`, `attendance`, `skill_gains`, `debt_total`, `fraud`, `bribes_offered`, `bribes_accepted`, `strike_days`, `births`, `children_raised`, `groups`, `modularity`, `feuds`, `violence_rate`, `banishments`, `forgiveness_rate`, `tom_accuracy`, `suspicion_accuracy`, `rumour_reach`, `belief_accuracy` |

### 9.8 Canonical experiments

Each experiment is written as a file `experiments/<id>.json` before it runs. The file holds the hypothesis, the expected direction, the primary metric, the window, the arms and the seeds. The report labels the primary metric confirmatory and every other metric exploratory.

| id | Arms | Primary metric | Pre-registered expectation |
|:-|:-|:-|:-|
| E1 Ring of Gyges | `fernhollow`, watched against unseen within runs | `take_mass` watched minus unseen | negative |
| E2 Role against person | `fernhollow` against the three `role_swap_*` presets, 5 seeds | the job performance measures (below) | decomposed into role and person variance |
| E3 Conformity [B] | `open_ballot` against `secret_ballot` | vote alignment with prior declarations | higher under open ballot |
| E4 Credit | `creditMode` public against anonymous | volunteer hours by the three highest-narcissism adults | higher under public credit (probe evidence 0.19 to 0.34) |
| E5 Lean times | `fernhollow` against `lean_times` | `take_mass`, `price_index`, `gifts`, `dependants_fed` | reported: no expected direction for gifts |
| E6 Justice without police [B/C] | `fernhollow` against `no_police` | confronts and grudges after thefts | more private confrontation without police |
| E7 Press freedom [B] | Crier stipend kept against cut | the Crier's `critical` angle mass on the mayor | lower after the cut |
| E8 Stranger [C] | `the_stranger`, with the `newcomers` issue | the stranger's liking in-degree after 5 days | reported |
| E9 Mixes [B] | `gentle_town`, `hard_town`, `two_cultures`, `sampled` x 5 seeds | wellbeing against thefts plus wrongful | reported |
| E10 Opinion models [B] | the `stanceModel` variants | polarization trajectory | JEV differs from Deffuant (TV of stance histograms at day 7) |
| E11 Generations [C/D] | 40-day runs at `lifePace` 4, `heritable_only` against `culture_only` | the child-parent stance correlation, set against child-peer | reported |

The job performance measures used by E2 are P(open), P(arrest), `price_index`, P(treat an unpaying patient) and `volunteer_hours`.

### 9.9 Statistics and reports

- **Seeds.** Arms share seed lists, so comparisons use common random numbers.
- **Estimates.** Propensities are computed from probability mass (`take_mass`, P(open) and so on), so each decision contributes its whole distribution. That makes 3 to 5 seeds enough for usable intervals.
- **Output.** `scripts/report.ts experiment=<id>` prints, per metric:
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

The owner asked for a single full-screen viewport. The UI below is built from shadcn `b1PzeK` primitives that are already installed: `resizable`, `scroll-area`, `tabs`, `toggle-group`, `dropdown-menu`, `drawer`, `chart` (recharts), `badge`, `tooltip`, `command`, `sheet`. It follows the Base UI rules: use the `render` prop, never `asChild`, and give menu items an `onClick`. It adds no new dependencies.

### 10.1 Shell

- **Root.** The root is `h-svh overflow-hidden`, a grid with `grid-rows-[auto_1fr]`, at every breakpoint.
  - This replaces today's `min-h-svh flex-col lg:h-svh`, which lets the page scroll below `lg`.
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
- **Intervention palette.** Pick a tool, then click the map, a building or a person. The palette offers every Slice A intervention: `famine`, `bounty`, `supply_shock`, `natural_death`, `drop_items`, `remove_items`, `plant_rumour`. The Slice B and C interventions are added as those slices land. Every use appears on the timeline.
- **Metric charts.** Two equal columns, **Flourishing** and **Conflict**, as recharts sparklines. Below them come rows for Economy, Opinion and Decision science, with JEV latency, entropy, confidence and pruned mass. The existing `MetricsPanel` sampling is reused.
- **Timeline scrubber.**
  - Shows keyframe ticks, intervention markers and event markers.
  - Scrubbing restores the nearest snapshot and replays forward with 0 calls.
  - "Fork from here" creates a new branch (section 8.4).
  - "Compare" overlays a second run's metrics from `/runs`.
- **Probe drawer (Slice B).** Pick a recorded decision and a perturbation from 9.6, then run it on the instrument budget. The two distributions show side by side, with TV and the noise floor.

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

### 10.6 New sprites and icons (`components/sandbox/sprites.ts`)

All of these are 16px `fillRect` art in `PAL`. Any new pixel map goes into `PIXEL_MAPS` so the width test covers it.

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

### 11.0 Slice 0: finish what is in the working tree

The village slice in the working tree is the "Many Minds" Slice A. Finish it in the session that owns it, run it once, and keep its record as prior evidence. Then stop extending it. Its modules migrate into the town (4.1).

Before it runs, apply the following fixes, each one small:

1. Put the `motive` question behind a flag, default off. It is co-batched with the action and has not yet been probed for interference.
2. Reword the machiavellianism shadow clause to "when it pays and you think you can get away with it".
3. Join trait phrases in `psycheLines` with semicolons instead of the run-on "and". Bump `PSYCHE_RENDER_VERSION`.
4. Drop its Slice A pass criterion (c), the character-outcome gate. Report those outcomes instead.
5. Put `lib/sim/drift.ts` behind a flag, default off, so the psyche on and off comparison is not confounded by engine-authored drift. In the town it becomes the `driftModel: "engine"` arm (4.1).

Run it with `bun scripts/lab.ts` (its existing flags) on 2 worlds for 2 days, with the psyche on and off. The per-villager driver printout already exists.

### 11.1 Slice A: town vertical slice

Slice A has two gates. Build A1 only after A0 passes.

**A0: psyche probe gate on town dilemmas.** Build `lib/sim/psyche.ts` v2 plus `lib/lab/dilemmas.ts` plus the battery mode of `scripts/probe.ts`. No world changes. Each dilemma is a hand-built perception: the person's own psyche, name and blurb, and a shared hypothetical role line such as "You are minding the store today".

| id | Situation | Options (target option in bold) | Variants |
|:-|:-|:-|:-|
| D1 `shoplift_friend` | While Sable is out, you see someone you like slip 2 groceries into a bag | stop_them, report_later, **say_nothing**, take_something_too | another customer in sight / nobody else in sight |
| D2 `shortage_prices` | You are minding the store; the truck brought 6 of 20 groceries | at_cost, markup_25, markup_50, **markup_100** | Juniper is in the store / nobody is |
| D3 `unpaid_patient` | You are covering at the clinic; a patient with 0 coins needs care; the fee is 10 | **treat_now**, put_on_tab, ask_payment_first, send_away | Juniper is present / nobody is |
| D4 `hungry_unwatched` | Hunger 20, 2 coins, the store is unattended | **take_shelf**, leave, wait_for_sable, ask_for_help | another customer in sight / nobody |
| D5 `testimony_friend` | Odile asks about a theft you saw a friend commit | tell_truth, **say_saw_nothing**, name_someone | the friend is in the room / is not |
| D6 `bridge_span` | The footbridge span needs a second pair of hands now; you have 2 free hours | **help**, walk_on, go_to_bar, go_home | Wren is there waiting / nobody is |

A0 cost:

| Batch | Calls |
|:-|:-|
| 13 adult psyches x 6 dilemmas x 2 variants | 156 |
| blind (psyche null): 13 x 6 x the unseen variant | 78 |
| noise floor: 12 random pairs x 3 identical re-asks | 36 |
| need edit: D4 at hunger 80, x 12 | 12 |
| **Total** | **282** |

That is about $0.01 and about 3 minutes.

A0 passes when all of these hold:
- (a) Across psyches, the spread of p(target) is at least 0.20 in at least 4 of the 6 dilemmas.
- (b) The blind arm cuts that spread by at least 50%.
- (c) The median TV of the identical re-asks is below 0.05. This is the noise floor.
- (d) The median psyche-swap TV, computed from the battery, is at least 3 x the noise floor.
- (e) Raising hunger from 20 to 80 lowers `take_shelf` mass for at least 80% of psyches.

The watched against unseen differences, and every distribution, are reported but are not gates.

If A0 fails, change only the `psycheLines` wording, bump the version, and rerun A0.

**A1: the town slice.** The file-by-agent split is in 8.6.

Slice A contains:
- the 48x30 town with every building, drawn;
- all 15 people with their psyches and full-day routines;
- the Slice A mechanics: M1, M3, M5, M8 (board), M9 (footbridge), M10, M14, M16 (justice issue), M17 (true news and lies), M18, M22 (death, burial, grief), M23;
- honest perception with provenance;
- the ACTIONS table;
- keyed RNG;
- RunRecord v2;
- every Slice A metric in 9.7 (all rows not tagged Slice B+);
- the interventions `supply_shock`, `natural_death`, `plant_rumour`, `drop_items` and `remove_items`;
- the full-screen shell (10.1), the World view, the inspector and the dock, with minimal Society and Experiment views (metric columns, scenario and seed picker, intervention palette).

Out of scope for Slice A: the town hall, the Crier's editions, the clinic, credit, skills, festivals, groups, reproduction, violence and weather.

**Runs:**

```
bun scripts/lab.ts scenario=fernhollow days=7 worlds=5 seed=100 policy=needs_greedy experiment=slice-a-cal
bun scripts/lab.ts scenario=fernhollow days=7 worlds=5 seed=100 policy=random experiment=slice-a-cal
bun scripts/lab.ts scenario=fernhollow days=2 worlds=2 seed=7 think=2 experiment=slice-a condition=psyche_on
bun scripts/lab.ts scenario=fernhollow days=2 worlds=2 seed=7 think=2 experiment=slice-a condition=psyche_off ablation.psyche=none
bun scripts/probe.ts plan=standard experiment=slice-a condition=psyche_on
bun scripts/report.ts experiment=slice-a
```

The two calibration runs cost 0 calls, and the calibration targets are in 9.5. The JEV runs total about 1,560 calls including founding, and the probes about 240.

**A1 gates.** Every one must pass:
- **P1 Plumbing.**
  - All 4 JEV runs finish 576 ticks.
  - JEV errors stay below 2%.
  - Zero zod rejections, and zero unknown-option answers.
  - p95 latency stays below 1.5 s.
  - The median state is at most 4,000 characters.
  - No call carries more than 8 questions.
  - Calls per day come within 35% of 190.
- **P2 Determinism.** Replaying each record gives an identical `hashWorld` with 0 desyncs. Checked by the test and by the CLI.
- **P3 Honesty.**
  - The perception property test passes.
  - The provenance lint passes on 100% of logged perceptions.
  - An unwitnessed theft appears in no perception except the actor's until it is discovered or told.
- **P4 Traceability.**
  - Every choice-origin event cites `decisionIds`.
  - Coins and goods are conserved across the event log. Coins cross the boundary only through the grant, outside sales and deliveries.
- **P5 Reachability.** `tests/integration.test.ts` uses scripted fake answers to drive each chain end to end:
  - theft, discovery, suspicion, report, intake `open`, questioning, a lying testimony, an arrest, jail, release;
  - a footbridge that finishes only once the pair rule is met, then the tiles become `bridge` and `mapVersion` bumps;
  - Bram's death, the body, burial, the grave, the obituary;
  - `set_prices` under a supply shock;
  - a family meal;
  - `share_view`, then the listener's stance changes.
- **P6 Validity.**
  - The median psyche-swap TV is at least 0.15 and at least 3 x the identical TV.
  - Reorder TV is at most 0.10.
  - Co-batch TV is at most 0.10. If it fails, the documented fallback is: allow 1 sub-question per call, then rerun.
  - `edit_need` moves the expected option mass in at least 80% of probes.
- **P7 Non-degeneracy.**
  - No adult picks the same option more than 40% of the time, unless that option restores their lowest need.
  - Every adult picks at least 5 distinct option families per day.
  - The Jensen-Shannon divergence between the psyche-on and psyche-off enacted driver mixes is at least 0.1 for at least 7 of the 13 adults.
  - Greedy agreement is below 0.95.
- **P8 Layout.** At 1440x900 and 390x844 the page does not scroll, every panel scrolls internally, and the canvas fits. Checked with a screenshot pass.

**Reported, not gated.** These outcomes must never be tuned toward:
- E1: restraint watched against unseen;
- `thefts` next to `take_expected`;
- cases opened, resolved and wrongful;
- lies told and caught;
- footbridge units, contributors, and whether it was finished;
- `dependants_fed` and family meals;
- the price tiers chosen after the supply shock;
- burial delay;
- polarization, falsification gap, and `stance_behaviour_r`;
- each person's enacted drivers against their `driverWeights`, and the psyche expression index;
- pruned mass on dark options;
- greedy agreement, and whether it falls inside the 0.3 to 0.9 band.

**Kill criteria.** Each one means: inspect the wording before building Slice B.

| Observation | What to inspect |
|:-|:-|
| `take_mass` below 1% for every adult in both arms | the `take_shelf` wording |
| intake never `open` across all 4 runs | the intake question |
| nobody ever works on the footbridge | its detail text |
| anyone below hunger 10 for more than 48 consecutive ticks | the urgency clause |

Make exactly one evidence-backed change, bump the relevant version, and rerun the same seeds.

### 11.2 Slice B: town business and institutions

Contents:
- **Economy and work:** credit, tabs and fraud (M24); the shopkeeper's buying price and order size; skills and milestones (M2); apprenticeship (M11).
- **Clinic and press:** triage, fees and sickness (M4, M21); the Crier's editions (M8).
- **Town hall:** weekly council, special meetings, typed ordinances, open and secret ballots, elections, legitimacy, hiring and dismissal (M6).
- **Justice:** hearings with plea and testimony, the sanction ladder, and enforcement (M7); bribes (M5).
- **People and opinion:** promises (M26); goals (M15); festivals, music nights and traditions (M12); nightly tie levels and respect (M18); persuasion with frames on all 5 issues, plus the stance-model conditions (M16).
- **Wire and UI:** typed facts on the wire, so `perception` lines become a `Fact` union rendered server-side and the route carries no client prose; the Probe drawer; the Chronicle; the full Society view.

Gate to start: Slice A passes. Evidence gates for B, which are reported and inform the next step:
- at least 1 ordinance vote across 3 seeds;
- restraint computed per ordinance;
- E3 and E4 run with their pre-registered directions reported;
- the corruption gap measured with `tie_words` probes.

### 11.3 Slice C: lives and conflict

Contents:
- **Violence:** the ladder with intent, press, react and witnesses; murder investigation; revenge ambitions; banishment enforcement (M22, M7).
- **Groups:** founding, joining, leaving and leadership (M19).
- **Family:** courtship, consent, partnership, pregnancy, births delivered by the doctor, infants, naming, coming of age, aging, the natural-death hazard, estates and wills (M20).
- **Movement:** strikes (M6); strangers, emigration and admission (M25).
- **Knowledge:** discovery of techniques (M13).
- **World:** weather and seasons; shocks (flu, fire, drought).

Gates:
- the consent validator passes;
- no romance or violence options are offered below 16;
- every killing cites at least 3 recorded yes answers;
- a 20-day run finishes within budget, with cohort trait means reported.

### 11.4 Slice D: lab at scale

Contents:
- the attribution batch for revealed drivers, and the motivational-climate chart;
- the baseline matrix runner;
- `experiments/*.json` pre-registration files, and the compare reports with bootstrap CIs;
- blind human rating mode: `ratings.jsonl`, with at least 60 ratings across 3 policies;
- 40-day generational runs (E11) and culture-drift metrics;
- the "hold the clock" chronicle mode.

## 12. Test plan

### 12.1 Unit and integration tests (`bun test`)

| File | Owner | Asserts |
|:-|:-|:-|
| `tests/rng.test.ts` | A0 | `rand` is in [0,1) and deterministic for a key; different keys give different streams; adding an agent does not change another agent's `choice` draws |
| `tests/psyche.test.ts` | A1 | `psycheLines` is at most 7 lines; the Slice 0 checks still hold (Sable's lines include "deceive", Mo's do not); children with values at 50 get the "still working out" line; `needRates` stays inside [0.3, 1.8]; `inheritPsyche` is deterministic under a seed and inside [0, 100]; drift caps hold (3 per night, 25 lifetime) |
| `tests/world.test.ts` | A2 | map is 48x30 and fully bordered except the road exit; every door opens onto a walkable tile; every agent can reach every building door, POI, the grove, the pond, the graveyard and every lot edge; the ford costs 3 ticks per tile; a finished bridge shortens the plaza-to-oak path by at least 15 steps |
| `tests/perception.test.ts` | A3 | the property test over 200 random worlds: no fact about out-of-sight people or places except dated beliefs; the provenance lint; indoors, only co-occupants are seen; no store count is visible from outside; an unwitnessed theft is invisible to everyone else until discovered |
| `tests/framing.test.ts` | A4 | every detail comes from its four slots; no banned words; detail lengths within 40% of the median; stated numbers match the world; option ids are unique and wire-safe; stage gates hold (children never get work, take or job options) |
| `tests/economy.test.ts` | A5 | conservation of coins and goods over 3 simulated days with scripted answers; the price tier equals round(cost x multiplier); payroll is pro rata; deliveries respect `supply_shock`; spoilage |
| `tests/projects.test.ts` | A5 | the pair rule holds from unit 12; tile stages; completion credits and notice; anonymous mode omits the names |
| `tests/knowledge.test.ts` | A6 | witnesses get beliefs; discovery produces a claim with no actor plus a suspect ride-along; told beliefs carry the listener's credence; lies are classified from the speaker's own knowledge |
| `tests/talk.test.ts` | A6 | the approach, then encounter, then talking state machine; time-outs; the stale-answer guard via `requestId`; overhearing indoors and outdoors |
| `tests/justice.test.ts` | A7 | the report lands with the officer or as a station note; intake options; the resolution lists only suspects the officer believes in; jail until 8 am; the fine is capped by the wallet and paid as restitution |
| `tests/life.test.ts` | A7 | `natural_death` leaves a body; burial places a grave in the next slot; the obituary is posted by the burier; the estate goes to the treasury when there are no kin; grief decay |
| `tests/sim.test.ts` | A8 | the existing replay test extended: a recorded run with interventions and failures replays to an identical `hashWorld`, including after seeking backwards; replay recomputes "what JEV saw"; a fork shares common random numbers with its parent |
| `tests/events.test.ts` | A8 | R1: every event with origin `choice` has non-empty `decisionIds`, over a 2-day scripted run |
| `tests/integration.test.ts` | A8 | the P5 chains in 11.1, driven by scripted fake answers (a deterministic `fakeAnswer` extended per kind) |
| `tests/metrics.test.ts` | A9 | every metric is finite on a fresh world and after 2 scripted days; `restraint_rate` counts offers correctly; Gini of equal wealth is 0 |
| `tests/sim.test.ts` pixel maps | A10 | every new pixel map row has the declared width (the existing test, extended) |

`bun run typecheck` (the package script for `tsc` without emit) must be clean. `bun run lint` is still broken by the ESLint 10 scaffold issue and is not a gate.

### 12.2 Headless JEV runs and what they print

`scripts/lab.ts` keeps its existing flags and also accepts `key=value` arguments: `scenario`, `days`, `worlds`, `seed`, `think`, `mode`, `policy`, `minP`, `concurrency`, `experiment`, `condition`, `ablation.<k>`, `intervene=<kind>@<tick>`, `fork=<runId>@<tick>`, `replay=<runId>`, `upload`, `verbose`.

**Every 72 ticks**, one line per world:

```
[w1 seed 7] Tue, day 2, 1:00 pm  calls= 241 wellbeing=61 meaning=58 thefts=1 (exp 0.9) cases=1 footbridge=9/24 dependants_fed=0.94 price_index=1.25
```

**At the end**, four tables:
1. **Metrics per seed:** every metric in 9.7 whose slice has landed.
2. **Per person:** name; job; shift hours worked and mean effort; the top 4 enacted drivers with shares, next to their top 4 `driverWeights`; the top 4 picks; take offers and takes (watched and unseen); stance at the start and at the end; liking in-degree.
3. **Justice:** each case, with its intake, interviews, resolution and truth. Truth is shown because this is an observer report.
4. **JEV:** calls by kind and lane; p50 and p95 latency; errors; cost; mean confidence; mean pruned mass, overall and on dark options; greedy agreement, scored offline.

The replay check follows: desyncs and the hash for each record.

`scripts/probe.ts plan=standard|battery|high_stakes run=<id>` prints each probe kind with n, the mean and median TV, the share moving in the expected direction, and the noise floor.

`scripts/report.ts experiment=<id>` prints the confirmatory and exploratory metric tables, with bootstrap CIs, Cohen's d, and the authenticity scorecard (9.9).

## 13. Tuning constants

Every constant lives in `lib/sim/tuning.ts` and is shown in the inspector's "World rules" panel. A preset may override any constant marked with an asterisk.

| Constant | Value | Unit | Module | Slice |
|:-|:-|:-|:-|:-|
| `TICK_MINUTES` | 5 | min | clock | A |
| `TICKS_PER_DAY` | 288 | ticks | clock | A |
| `BASE_TICK_MS` | 260 | ms at 1x | use-sandbox | A |
| `MAP_W`, `MAP_H`, `TILE` | 48, 30, 16 | tiles, px | map | A |
| `LIFE_PACE`* | 1 | years per day | clock | A |
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
| `DELIVERY` groceries, meals, drinks* | 20 at 3, 15 at 3, 20 at 1 | units at coins | economy | A |
| `COUNTY_GRANT`* | 120 | coins per day | economy | A |
| `START_TREASURY`* | 600 | coins | economy | A |
| `TAX_RATE`* | 0.10 | share of sales | economy | A |
| `PAY_SCALE`* | mayor 35, officer 30, doctor 40, nurse 22, teacher 25, journalist 12, carpenter on project 25 | coins per day | economy | A |
| `BUY_PRICE`* | 2 | coins per produce or fish | economy | A |
| `OUTSIDE_ORDERS` | 2 | coins per workshop hour | work | A |
| `PRICE_MULT` | 1, 1.25, 1.5, 2 | per tier | schema | A |
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
| `PURPOSE_EVENTS` family meal, burial, gift, project done, case resolved | 6, 10, 3, 20, 10 | points | needs | A |
| `BELONGING` home, dining, talk, project crew, burial | 0.15, 0.2, 0.1, 0.1 per tick; 10 | points | needs | A |
| `RESPECT` thanked, credit, declined, warned, fined, arrested, lie exposed, seen taking | +6, +5 to +15, -3, -8, -15, -30, -20, -12 | points | needs | A |
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
| `OPTION_CAPS` talk, ask_help, gift, explore, question, total | 4, 2, 2, 2, 3, 32 | | options | A |
| `QUESTION_CAP` | 8 | per call | schema | A |
| `STATE_CHAR_CAP` | 7000 | chars | schema | A |
| `RIDE_ALONG_MAX`, `RIDE_ALONG_TTL` | 2, 288 | per call, ticks | engine | A |
| `MIN_P`* | 0.25 | share of top | sampling | A |
| `TIE_SHIFT` | 0.08 | liking per EV step | ties | A |
| `TRUST_LEVELS` | -0.8, -0.3, 0.1, 0.5, 0.9 | trust | ties | A |
| `FAMILIARITY` sight, talk, decay | +0.002, +0.01 per tick; -0.001 per day | | ties | A |
| `BELIEF_INERTIA`* | 0 | share kept | opinion | A |
| `DRIFT_CAP_NIGHT`, `DRIFT_CAP_LIFE` | 3, 25 | points | psyche | A |
| `TRUST_DRIFT` trust, agreeableness | 1.5, 0.5 | points per EV step | psyche | A |
| `INHERIT_H`, `INHERIT_SD` | 0.45, 8 | share, points | psyche | C |
| `REPORT_REACH_TICKS` | 60 | ticks before a station note | justice | A |
| `JAIL_UNTIL` | 8 am the next day | | justice | A |
| `FINE_MULT` | 2 x the value at the posted price, capped by the wallet | | justice | A |
| `GRIEF` threshold, fun factor, decay per day, grave-visit factor | 0.2, 0.5, 0.15, 2 | | life | A |
| `BURIAL` dig ticks, carry speed | 24, 0.5 | | life | A |
| `ABSENCE_CUE_TICKS` | 144 | ticks | life | A |
| `BELL_COOLDOWN` | 144 | ticks per caller | institutions | B |
| `QUORUM` | ceil(adults / 3) | | institutions | B |
| `TERM_DAYS` | 7 | days | institutions | B |
| `CLINIC_FEE`*, `TREATMENT` | 10; 12 ticks, +30 health | | clinic | B |
| `CONTAGION` | 0.02 | per adjacent tick | clinic | B |
| `HAZARD` | 0.01 x exp((age - 65) / 8) | per day at 65 and over | life | C |
| `FERTILE_AGES`, `EXPECTING_DAYS`, `MAX_RESIDENTS` | 18 to 45, 1.5, 4 | | life | C |
| `DAMAGE` | 10 + 25 x strength ratio x rand | per exchange | conflict | C |
| `CALL_BUDGET` per day, session, instrument | 400, 4,000, 200 | calls | use-sandbox | A |
| `BROWSER_CONCURRENCY` | 8 | calls in flight | use-sandbox | A |
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

**Rejected:**
- pass criteria that require character outcomes (psychology (c), drama's story gates);
- an engine-computed "people say" reputation line;
- fixed affinity nudges;
- the forager ecology as the setting;
- an up-front 21-module split (the spec splits exactly what Slice A needs);
- infant death on by default;
- running live probes in the browser (the instrument budget and headless runs only);
- the motive readout as a cause.
