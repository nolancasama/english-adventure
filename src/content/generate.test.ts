import { describe, expect, it } from "vitest";
import { generateQuestions, getItemWeight } from "./generate";
import { items, itemsById } from "./items";
import { world } from "./lessons";
import { SCORED_TYPES } from "./types";

const reviewSpec = world.lessons.find(({ id }) => id === "review")?.generate;
const bossSpec = world.lessons.find(({ id }) => id === "boss")?.generate;

if (!reviewSpec || !bossSpec) throw new Error("Review and boss GenerateSpecs are required.");

const words = (text: string): string[] =>
  text
    .split(/\s+/)
    .map((word) => word.replace(/^[^\p{L}\p{N}']+|[^\p{L}\p{N}']+$/gu, ""))
    .filter(Boolean);

describe("generateQuestions", () => {
  it("is deterministic for a seed and changes with a different seed", () => {
    const mastery = {
      cat: { attempts: 4, correct: 1 },
      red: { attempts: 3, correct: 3 },
    };
    const first = generateQuestions(bossSpec, { mastery, seed: "same-seed" });
    const again = generateQuestions(bossSpec, { mastery, seed: "same-seed" });
    const other = generateQuestions(bossSpec, { mastery, seed: "other-seed" });
    expect(again).toEqual(first);
    expect(other).not.toEqual(first);
  });

  it("honours count and includes every scored type", () => {
    const questions = generateQuestions(reviewSpec, { seed: 17 });
    expect(questions).toHaveLength(reviewSpec.count);
    for (const type of SCORED_TYPES) {
      expect(questions.some((question) => question.type === type), type).toBe(true);
    }
  });

  it("uses phrases only for sentence builders", () => {
    for (let seed = 0; seed < 20; seed += 1) {
      const questions = generateQuestions(bossSpec, { seed });
      for (const question of questions) {
        if (question.type !== "sentence-builder") continue;
        expect(itemsById[question.target].text, question.target).toMatch(/[.!?]$/);
      }
    }
  });

  it("makes same-topic, visually distinct picture choices", () => {
    for (let seed = 0; seed < 20; seed += 1) {
      for (const question of generateQuestions(bossSpec, { seed })) {
        if (question.type !== "listen-picture" && question.type !== "picture-word") continue;
        expect(question.choices).toHaveLength(3);
        expect(question.choices).toContain(question.target);
        const choices = question.choices.map((id) => itemsById[id]);
        expect(new Set(choices.map(({ topic }) => topic)).size, question.target).toBe(1);
        expect(new Set(choices.map(({ visual }) => JSON.stringify(visual))).size, question.target).toBe(3);
      }
    }
  });

  it("keeps abstract items out of generated review and boss picture questions", () => {
    for (const spec of [reviewSpec, bossSpec]) {
      for (let seed = 0; seed < 20; seed += 1) {
        for (const question of generateQuestions(spec, { seed })) {
          if (question.type !== "listen-picture" && question.type !== "picture-word") continue;
          expect(itemsById[question.target].abstract, `${seed}: target ${question.target}`).not.toBe(true);
          for (const id of question.choices) {
            expect(itemsById[id].abstract, `${seed}: ${question.target} choice ${id}`).not.toBe(true);
          }
        }
      }
    }
  });

  it("keeps generated picture choices the same phrase shape as the target", () => {
    for (const spec of [reviewSpec, bossSpec]) {
      for (let seed = 0; seed < 40; seed += 1) {
        for (const question of generateQuestions(spec, { seed })) {
          if (question.type !== "listen-picture" && question.type !== "picture-word") continue;
          const shape = (text: string) => text.includes(" ") && /[.!?]$/.test(text.trim());
          const targetShape = shape(itemsById[question.target].text);
          for (const id of question.choices) expect(shape(itemsById[id].text), `${seed}: ${id}`).toBe(targetShape);
        }
      }
    }
  });

  it("takes builder distractor words from the target topic", () => {
    for (let seed = 0; seed < 20; seed += 1) {
      for (const question of generateQuestions(bossSpec, { seed })) {
        if (question.type !== "sentence-builder") continue;
        const target = itemsById[question.target];
        const topicWords = new Set(
          items
            .filter(({ topic }) => topic === target.topic)
            .flatMap(({ text }) => words(text))
            .map((word) => word.toLocaleLowerCase("en-US")),
        );
        for (const distractor of question.distractors ?? []) {
          expect(topicWords.has(distractor.toLocaleLowerCase("en-US")), distractor).toBe(true);
        }
      }
    }
  });

  it("does not use answer-revealing casing for builder distractors", () => {
    for (let seed = 0; seed < 40; seed += 1) {
      for (const question of generateQuestions(bossSpec, { seed })) {
        if (question.type !== "sentence-builder") continue;
        for (const distractor of question.distractors ?? []) {
          expect(distractor === distractor.toLocaleLowerCase("en-US") || distractor === "I" || distractor === "Kiko").toBe(true);
        }
      }
    }
  });

  it("implements the specified mastery weights", () => {
    expect(getItemWeight(undefined)).toBe(2);
    expect(getItemWeight({ attempts: 0, correct: 0 })).toBe(2);
    expect(getItemWeight({ attempts: 4, correct: 4 })).toBe(1);
    expect(getItemWeight({ attempts: 4, correct: 2 })).toBe(2.5);
    expect(getItemWeight({ attempts: 4, correct: 0 })).toBe(4);
  });

  it("rejects specs that cannot cover all scored types", () => {
    expect(() => generateQuestions({
      fromLessons: ["hello"],
      count: 3,
      types: ["listen-picture", "picture-word"],
    })).toThrow(/sentence-builder/);
  });
});
