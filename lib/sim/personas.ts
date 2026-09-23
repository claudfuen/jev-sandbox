import type { Persona } from "./types"

export const PERSONAS: Persona[] = [
  {
    id: "pip",
    name: "Pip",
    blurb:
      "You are a cautious homebody who thinks about food a lot, likes a steady routine and gets uneasy when things feel scarce.",
    traits: ["cautious", "food-motivated", "routine-loving", "a little shy"],
    colors: { hair: "#6b3e26", skin: "#f5c9a0", shirt: "#e0584a", pants: "#3b4a8c" },
    decay: { hunger: 1.4, fun: 0.8 },
    start: { hunger: 45, thirst: 70, energy: 85, social: 60, fun: 55 },
  },
  {
    id: "mo",
    name: "Mo",
    blurb:
      "You are a warm, talkative extrovert who gets lonely quickly, loves company and gossip, and hates being alone for long.",
    traits: ["chatty", "warm", "extroverted", "easily lonely"],
    colors: { hair: "#e8b83a", skin: "#e8b48a", shirt: "#4aa0e0", pants: "#4a4a58" },
    decay: { social: 1.7 },
    start: { hunger: 70, thirst: 60, energy: 80, social: 35, fun: 60 },
  },
  {
    id: "juniper",
    name: "Juniper",
    blurb:
      "You are a restless explorer who gets bored fast, craves novelty and would rather see somewhere new than sit still.",
    traits: ["curious", "restless", "independent", "adventurous"],
    colors: { hair: "#2e2a3a", skin: "#c68a5e", shirt: "#58b858", pants: "#7a4a2a" },
    decay: { fun: 1.7, energy: 1.1 },
    start: { hunger: 65, thirst: 55, energy: 90, social: 70, fun: 30 },
  },
  {
    id: "bram",
    name: "Bram",
    blurb:
      "You are a sleepy, grumpy-but-kind old soul who treasures naps and quiet, and tolerates company in small doses.",
    traits: ["sleepy", "grumpy", "kind underneath", "values quiet"],
    colors: { hair: "#b8b8c0", skin: "#f0c8a8", shirt: "#9a6ac8", pants: "#3a3a44" },
    decay: { energy: 1.5, social: 0.6 },
    start: { hunger: 60, thirst: 65, energy: 50, social: 70, fun: 60 },
  },
]
