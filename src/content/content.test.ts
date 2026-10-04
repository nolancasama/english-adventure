import { readdirSync, readFileSync } from "node:fs";
import { extname, join } from "node:path";
import { describe, expect, it } from "vitest";
import { items, itemsById } from "./items";
import { world } from "./lessons";
import { patterns, patternsById } from "./patterns";
import { pets } from "./pets";
import type { Visual } from "./types";

const visualKey = (visual: Visual): string => JSON.stringify(visual);

function sourceFiles(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    return entry.isDirectory() ? sourceFiles(path) : [path];
  });
}

describe("authored content", () => {
  it("has unique item and pattern ids", () => {
    expect(new Set(items.map(({ id }) => id)).size).toBe(items.length);
    expect(Object.keys(itemsById)).toHaveLength(items.length);
    expect(new Set(patterns.map(({ id }) => id)).size).toBe(patterns.length);
    expect(Object.keys(patternsById)).toHaveLength(patterns.length);
  });

  it("contains the ten lessons in path order", () => {
    expect(world.lessons.map(({ id }) => id)).toEqual([
      "hello",
      "colors",
      "animals",
      "numbers",
      "food",
      "i-like",
      "do-you-like",
      "family",
      "review",
      "boss",
    ]);
    expect(world.lessons.map(({ kind }) => kind)).toEqual([
      "normal", "normal", "normal", "normal", "normal",
      "normal", "normal", "normal", "review", "boss",
    ]);
    expect(world.lessons.at(-1)?.generate?.count).toBe(9);
  });

  it("references only existing items, lessons and patterns", () => {
    const lessonIds = new Set(world.lessons.map(({ id }) => id));
    for (const entry of items) {
      if (entry.pattern) expect(patternsById[entry.pattern], entry.id).toBeDefined();
    }

    for (const lesson of world.lessons) {
      lesson.items.forEach((id) => expect(itemsById[id], `${lesson.id}: ${id}`).toBeDefined());
      lesson.generate?.fromLessons.forEach((id) => expect(lessonIds.has(id), `${lesson.id}: ${id}`).toBe(true));
      for (const question of lesson.questions ?? []) {
        expect(itemsById[question.target], `${lesson.id}: ${question.target}`).toBeDefined();
        if (question.type === "listen-picture" || question.type === "picture-word") {
          question.choices.forEach((id) => expect(itemsById[id], `${lesson.id}: ${id}`).toBeDefined());
        }
      }
    }

    for (const milestone of world.milestones) {
      expect(lessonIds.has(milestone.afterLesson), milestone.id).toBe(true);
    }
    for (const pet of pets) {
      if (pet.unlockedBy) expect(lessonIds.has(pet.unlockedBy), pet.id).toBe(true);
    }
  });

  it("keeps normal lessons short and ordered hear to recognise to build", () => {
    for (const lesson of world.lessons.filter(({ kind }) => kind === "normal")) {
      const questions = lesson.questions ?? [];
      expect(questions.length, lesson.id).toBeGreaterThanOrEqual(5);
      expect(questions.length, lesson.id).toBeLessThanOrEqual(7);
      expect(new Set(questions.map(({ type }) => type)), lesson.id).toEqual(
        new Set(["listen-picture", "picture-word", "sentence-builder", ...(questions.some(({ type }) => type === "speak") ? ["speak"] : [])]),
      );
      expect(questions.filter(({ type }) => type === "speak").length, lesson.id).toBeLessThanOrEqual(1);

      const questionTypes = questions.map(({ type }) => type);
      const lastListen = questionTypes.lastIndexOf("listen-picture");
      const firstPictureWord = questions.findIndex(({ type }) => type === "picture-word");
      const lastPictureWord = questionTypes.lastIndexOf("picture-word");
      const firstBuilder = questions.findIndex(({ type }) => type === "sentence-builder");
      expect(lastListen, lesson.id).toBeLessThan(firstPictureWord);
      expect(lastPictureWord, lesson.id).toBeLessThan(firstBuilder);
    }
  });

  it("uses three visually distinct choices in every authored picture question", () => {
    for (const lesson of world.lessons) {
      for (const question of lesson.questions ?? []) {
        if (question.type !== "listen-picture" && question.type !== "picture-word") continue;
        expect(question.choices, `${lesson.id}: ${question.target}`).toHaveLength(3);
        expect(question.choices, `${lesson.id}: ${question.target}`).toContain(question.target);
        const choiceItems = question.choices.map((id) => itemsById[id]);
        expect(new Set(choiceItems.map(({ visual }) => visualKey(visual))).size, `${lesson.id}: ${question.target}`).toBe(3);
        expect(new Set(choiceItems.map(({ topic }) => topic)).size, `${lesson.id}: ${question.target}`).toBe(1);
      }
    }
  });

  it("keeps abstract items out of every authored picture question", () => {
    for (const lesson of world.lessons) {
      for (const question of lesson.questions ?? []) {
        if (question.type !== "listen-picture" && question.type !== "picture-word") continue;
        expect(itemsById[question.target].abstract, `${lesson.id}: ${question.target}`).not.toBe(true);
        for (const id of question.choices) {
          expect(itemsById[id].abstract, `${lesson.id}: ${question.target} choice ${id}`).not.toBe(true);
        }
      }
    }
  });

  it("limits each emoji visual to at most two emoji", () => {
    for (const entry of items) {
      if (entry.visual.kind !== "emoji") continue;
      const emojiCount = entry.visual.value.match(/\p{Extended_Pictographic}/gu)?.length ?? 0;
      expect(emojiCount, entry.id).toBeGreaterThan(0);
      expect(emojiCount, entry.id).toBeLessThanOrEqual(2);
    }
  });

  it("does not use emoji introduced after Emoji 12.0 in source", () => {
    const srcRoot = join(process.cwd(), "src");
    const textFiles = sourceFiles(srcRoot).filter((path) => [".css", ".ts", ".tsx"].includes(extname(path)));
    const denylist = [
      { name: "coin", value: String.fromCodePoint(0x1fa99) },
      { name: "anatomical heart", value: String.fromCodePoint(0x1fac0) },
      { name: "melting face", value: String.fromCodePoint(0x1fae0) },
      { name: "pink heart", value: String.fromCodePoint(0x1fa77) },
    ];

    for (const path of textFiles) {
      const source = readFileSync(path, "utf8");
      for (const denied of denylist) {
        expect(source.includes(denied.value), `${path} contains post-12.0 emoji: ${denied.name}`).toBe(false);
      }
    }
  });

  it("places every item in an authored normal lesson", () => {
    const introduced = new Set(
      world.lessons.filter(({ kind }) => kind === "normal").flatMap(({ items: ids }) => ids),
    );
    expect([...introduced].sort()).toEqual(items.map(({ id }) => id).sort());
  });

  it("defines the requested chest and pets", () => {
    expect(world.milestones).toEqual([
      { id: "animals-treasure", afterLesson: "animals", icon: "🎁", reward: { coins: 10 } },
    ]);
    expect(pets.map(({ id, cost, unlockedBy }) => ({ id, cost, unlockedBy }))).toEqual([
      { id: "cat", cost: 10, unlockedBy: undefined },
      { id: "rabbit", cost: 25, unlockedBy: undefined },
      { id: "dragon", cost: 40, unlockedBy: undefined },
      { id: "unicorn", cost: 0, unlockedBy: "boss" },
    ]);
  });
});
