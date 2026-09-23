<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# JEV Sandbox

A top-down, Game Boy Color style village where independent characters make every decision
through JEV (`typesafe-ai/jev`, TypeSafe's evaluation model) via the Vercel AI Gateway.
It is an experiment in authentic decision-making, not a game.

## How it works

- `lib/sim/` is a pure, deterministic engine (seeded RNG). `step(world)` advances one tick
  (five in-game minutes) and returns JEV requests for characters that need to decide.
- `lib/jev/` is the JEV contract: a zod-validated perception goes in, the route builds the
  exact state text (`buildState`) and typed questions, JEV returns calibrated probabilities.
  `/api/jev` never accepts free-form prompts, so it cannot be used as a generic model proxy.
- The browser runs the loop (`components/sandbox/use-sandbox.ts`), renders procedural pixel
  art on a canvas (`sprites.ts`, `world-canvas.tsx`) and shows each character's decision,
  probabilities, mood and the exact text JEV saw.
- There is no fallback brain. If a JEV call fails, the character stands still and retries.
  Every behaviour on screen is JEV's choice or deterministic world physics.
- Sampling uses min-p (options below 25% of JEV's favourite are never picked), or argmax
  with "Top pick".

## Society systems (increments shipped so far)

- The world is Fernhollow (`lib/sim/town-map.ts`, spec 2.1 to 2.5): a 48x30 town with 15 founders
  (`lib/sim/personas.ts`), homes, a clinic, police station, town hall, school, chapel, general store,
  diner, inn, print shop and workshop. `lib/sim/map.ts` is the facade everything imports.
- Jobs (`lib/sim/jobs.ts`): posted shifts and pay. Nobody is forced to work: each hour a job holder
  chooses to work diligently, coast or do something else. Shops, the clinic and the school are open
  only while their keeper is inside on shift, so a no-show is perceptible. Payroll at 6 pm is pro
  rata by hours worked; the county grant and deliveries at 7 am are the only coins crossing the town
  boundary (tested). Households have home pantries; the chapel pantry is the commons.
- The footbridge is the shared build; the Crier (the journalist's edition on the notice board) is
  how news spreads beyond eyewitnesses.

- `lib/sim/psyche.ts`: per-villager psychology rendered into words (`psycheLines`, versioned).
  Psychology shapes need drain rates and how consequences feel, never option ranking.
- `lib/sim/drift.ts`: personality drift from habit (what you keep choosing) and experience (being
  helped, lied to, robbed, caught, getting away with it). Capped at 3 points per trait per day and
  logged with causes in `agent.drift`.
- Economy: coins, the market stall (the shopkeeper chooses fair, gouging or at-cost prices), buy and
  sell, gifts, honest pleas and sob-story lies (exposed if the victim later sees the liar with
  food), loans at fair or steep rates with repayment, demands and defaults, pickpocketing (noticed or
  not). Coins are conserved (tested).
- Offers: approaching someone carries a typed `Offer`; the target's reply is their own JEV choice.
- `lib/sim/digest.ts` + lab `--assess`: JEV's advisory estimate of how interesting a run is to the owner.
- Bodily danger is stated honestly in perception (hours until collapse, a body alarm line), because
  personality words otherwise drown out thirst and hunger.

## Rules

- shadcn preset `b1PzeK`, Base UI backed: no `asChild`, compose with the `render` prop,
  menu items use `onClick`.
- Keep descriptions of world state in one place (`describeStatus`, `describeLocation`,
  `needWord`) and reuse them in both the prompt and the UI.
- Keep a call budget on the client (`CALL_BUDGET_STEP`) so a forgotten tab cannot spend.
- Validate with `bun test`, `bunx tsc --noEmit`, and `bun scripts/headless.ts 100` for a
  real JEV run without a browser. `bun run lint` currently crashes inside
  eslint-plugin-react on ESLint 10 (scaffold issue).
- AI Gateway key: `AI_GATEWAY_API_KEY` env, else macOS Keychain service
  `AI_GATEWAY_API_KEY`. Never log or commit it. Dev server: `bun run dev --port 3317`.
- No em dashes or double hyphens in prose.

## Deployment

- Vercel project `fuen-inc/jev-sandbox`, Git-connected: every push to `main` deploys production at
  https://jev-sandbox-rho.vercel.app (public, so it can be shared).
- `AI_GATEWAY_API_KEY` (production and preview) is a dedicated AI Gateway key named `jev-sandbox`
  with a $10 monthly budget and 75/100% alerts, so a shared public link cannot run up spend.
  Inspect with `vercel ai-gateway api-keys list --scope fuen-inc`.
- Private Blob store `jev-sandbox-runs` is connected (`BLOB_READ_WRITE_TOKEN` in all environments)
  for saving and sharing experiment runs.
- `vercel env pull` refreshes `.env.local` (OIDC token and Blob token). Never commit it.
