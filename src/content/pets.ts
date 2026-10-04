import type { Pet } from "./types";

export const pets: Pet[] = [
  { id: "cat", name: "Cat", visual: { kind: "emoji", value: "🐱" }, cost: 10 },
  { id: "rabbit", name: "Rabbit", visual: { kind: "emoji", value: "🐰" }, cost: 25 },
  { id: "dragon", name: "Dragon", visual: { kind: "emoji", value: "🐲" }, cost: 40 },
  {
    id: "unicorn",
    name: "Unicorn",
    visual: { kind: "emoji", value: "🦄" },
    cost: 0,
    unlockedBy: "boss",
  },
];
