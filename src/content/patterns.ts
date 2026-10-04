import type { Pattern } from "./types";

export const patterns: Pattern[] = [
  { id: "my-name-is", frame: "My name is ___." },
  { id: "i-like", frame: "I like ___." },
  { id: "do-you-like", frame: "Do you like ___?" },
  { id: "this-is-my", frame: "This is my ___." },
  { id: "its-a", frame: "It's a ___." },
  { id: "its-color", frame: "It's ___." },
];

export const patternsById: Readonly<Record<string, Pattern>> = Object.fromEntries(
  patterns.map((pattern) => [pattern.id, pattern]),
);
