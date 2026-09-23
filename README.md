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

## Run it

```bash
bun install
bun run dev --port 3317
```

Needs a Vercel AI Gateway key in `AI_GATEWAY_API_KEY` (or the macOS Keychain under that
service name). Calls cost roughly $0.00001 each at list price, and the UI caps a session at
600 calls until you allow more.

```bash
bun test                      # engine and sprite checks
bun scripts/headless.ts 100   # a real JEV run in the terminal, no browser
```
