# JEV Sandbox

A little top-down village, in the spirit of old-school Pokémon, where every character decision
is a live [JEV](https://vercel.com/ai-gateway) evaluation. JEV is TypeSafe's evaluation model:
state and typed questions in, calibrated probabilities out. No text generation, no scripts.

Each villager has a personality, needs that drain at their own rates (hunger, thirst, energy,
social, fun), memories and feelings about the others. When a villager is free, the sim builds
what they can see and feel, asks JEV what they would genuinely do next, and samples from the
answer. When one villager walks up to another, JEV decides, from the other villager's point of
view, whether they stop to chat.

The inspector shows every decision's full probability distribution, the villager's mood, and
the exact text JEV saw.

Live: https://jev-sandbox-rho.vercel.app

## Run it

```bash
bun install
bun run dev --port 3317
```

Needs a Vercel AI Gateway key in `AI_GATEWAY_API_KEY` (or the macOS Keychain under that
service name). Calls cost roughly $0.0001 each at list price; the key's own monthly budget is
the only cap.

## The live world is persistent

Fernhollow does not reset when you reload. One browser tab at a time drives the world (ticks,
JEV calls) and checkpoints it to the private Blob store every few seconds
(`live/<world>.json.gz`, conditional on the last ETag so two tabs can never interleave). Every
other tab watches and takes over when the driver goes quiet. With no tab open the world waits
and resumes where it stopped. Background tabs keep ticking (a worker clock).

- `?world=<id>` opens or founds a separate persistent world. Development uses `fernhollow-dev`,
  previews `fernhollow-preview`, production `fernhollow`.
- A checkpoint is the source of truth, independent of replay: `lib/sim/checkpoint.ts`.
  `hydrateWorld` fills fields that older saves lack, so additive engine changes keep old worlds
  alive; renames or retypes need an explicit migration there.
- "Save run" records from the moment this tab resumed (`RunRecord.start`), and replays from there.

```bash
bun test                      # engine and sprite checks
bun scripts/headless.ts 100   # a real JEV run in the terminal, no browser
```
