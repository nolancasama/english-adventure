import { items } from "./items";
import { world } from "./lessons";
import { SCORED_TYPES } from "./types";
import type {
  GenerateSpec,
  Item,
  Lesson,
  Question,
  QuestionType,
  SentenceBuilderQ,
  Visual,
} from "./types";

export interface ItemMastery {
  attempts: number;
  correct: number;
}

export interface GenerateQuestionsOptions {
  mastery?: Readonly<Record<string, ItemMastery>>;
  seed?: string | number;
  lessons?: readonly Lesson[];
  itemPool?: readonly Item[];
}

type Random = () => number;

/** Public for focused tests and for explaining review selection in future tooling. */
export function getItemWeight(stat: ItemMastery | undefined): number {
  if (!stat || stat.attempts <= 0) return 2;
  const accuracy = Math.max(0, Math.min(1, stat.correct / stat.attempts));
  return 1 + 3 * (1 - accuracy);
}

/**
 * Generates a review or boss set. It has no side effects and is deterministic for
 * the same content, mastery map and seed.
 */
export function generateQuestions(
  spec: GenerateSpec,
  options: GenerateQuestionsOptions = {},
): Question[] {
  const lessonSource = options.lessons ?? world.lessons;
  const allItems = options.itemPool ?? items;
  const mastery = options.mastery ?? {};
  const random = createRandom(options.seed ?? 0);

  validateSpec(spec);

  const lessonIds = new Set(spec.fromLessons);
  const matchingLessons = lessonSource.filter((lesson) => lessonIds.has(lesson.id));
  if (matchingLessons.length !== lessonIds.size) {
    const found = new Set(matchingLessons.map((lesson) => lesson.id));
    const missing = spec.fromLessons.filter((id) => !found.has(id));
    throw new Error(`Unknown generated-content lesson(s): ${missing.join(", ")}`);
  }

  const requestedItemIds = new Set(matchingLessons.flatMap((lesson) => lesson.items));
  const pool = allItems.filter((entry) => requestedItemIds.has(entry.id));
  if (pool.length === 0) throw new Error("Cannot generate questions from an empty item pool.");

  const itemIds = new Set(pool.map((entry) => entry.id));
  const missingItems = [...requestedItemIds].filter((id) => !itemIds.has(id));
  if (missingItems.length > 0) {
    throw new Error(`Unknown generated-content item(s): ${missingItems.join(", ")}`);
  }

  const typeSchedule = buildTypeSchedule(spec, random);
  const usedTargets = new Set<string>();

  return typeSchedule.map((type) => {
    const eligible = pool.filter((entry) => {
      if (type === "listen-picture" || type === "picture-word") {
        return !entry.abstract && pool.filter((candidate) => !candidate.abstract && candidate.topic === entry.topic && samePictureShape(candidate, entry)).length >= 3;
      }
      if (type === "sentence-builder") return isPhrase(entry);
      return true;
    });
    if (eligible.length === 0) throw new Error(`No eligible items for ${type}.`);

    const unused = eligible.filter((entry) => !usedTargets.has(entry.id));
    const target = weightedPick(unused.length > 0 ? unused : eligible, mastery, random);
    usedTargets.add(target.id);

    if (type === "sentence-builder") return makeSentenceBuilder(target, pool, random);
    if (type === "speak") return { type, target: target.id };

    const choices = makePictureChoices(target, pool, random);
    return { type, target: target.id, choices };
  });
}

function validateSpec(spec: GenerateSpec): void {
  if (!Number.isInteger(spec.count) || spec.count < SCORED_TYPES.length) {
    throw new Error(`Generated question count must be at least ${SCORED_TYPES.length}.`);
  }
  const allowed = new Set<QuestionType>(spec.types);
  const missingScored = SCORED_TYPES.filter((type) => !allowed.has(type));
  if (missingScored.length > 0) {
    throw new Error(`GenerateSpec.types must include: ${missingScored.join(", ")}`);
  }
}

function buildTypeSchedule(spec: GenerateSpec, random: Random): QuestionType[] {
  const schedule: QuestionType[] = [...SCORED_TYPES];
  while (schedule.length < spec.count) {
    schedule.push(spec.types[Math.floor(random() * spec.types.length)]);
  }
  return shuffle(schedule, random);
}

function weightedPick(
  candidates: readonly Item[],
  mastery: Readonly<Record<string, ItemMastery>>,
  random: Random,
): Item {
  const total = candidates.reduce((sum, entry) => sum + getItemWeight(mastery[entry.id]), 0);
  let cursor = random() * total;
  for (const entry of candidates) {
    cursor -= getItemWeight(mastery[entry.id]);
    if (cursor < 0) return entry;
  }
  return candidates[candidates.length - 1];
}

function makePictureChoices(target: Item, pool: readonly Item[], random: Random): string[] {
  const targetVisual = visualKey(target.visual);
  const candidates = shuffle(
    pool.filter(
      (entry) =>
        entry.id !== target.id &&
        !entry.abstract &&
        entry.topic === target.topic &&
        samePictureShape(entry, target) &&
        visualKey(entry.visual) !== targetVisual,
    ),
    random,
  );
  const distractors: Item[] = [];
  const seenVisuals = new Set([targetVisual]);
  for (const candidate of candidates) {
    const key = visualKey(candidate.visual);
    if (seenVisuals.has(key)) continue;
    distractors.push(candidate);
    seenVisuals.add(key);
    if (distractors.length === 2) break;
  }
  if (distractors.length < 2) {
    throw new Error(`Not enough visually distinct ${target.topic} distractors for ${target.id}.`);
  }
  return shuffle([target.id, ...distractors.map((entry) => entry.id)], random);
}

function samePictureShape(first: Item, second: Item): boolean {
  return isPhrase(first) === isPhrase(second);
}

function makeSentenceBuilder(target: Item, pool: readonly Item[], random: Random): SentenceBuilderQ {
  const answerWords = new Set(words(target.text).map((word) => word.toLocaleLowerCase("en-US")));
  const distractorWords = shuffle(
    pool
      .filter((entry) => entry.id !== target.id && entry.topic === target.topic)
      .flatMap((entry) => words(entry.text))
      .filter((word) => !answerWords.has(word.toLocaleLowerCase("en-US"))),
    random,
  );
  const distractor = distractorWords[0] && normalizeTileWord(distractorWords[0]);
  return distractor
    ? { type: "sentence-builder", target: target.id, distractors: [distractor] }
    : { type: "sentence-builder", target: target.id };
}

function normalizeTileWord(word: string): string {
  return /^(I|Kiko)$/u.test(word) ? word : word.toLocaleLowerCase("en-US");
}

function isPhrase(entry: Item): boolean {
  const text = entry.text.trim();
  return text.includes(" ") && /[.!?]$/.test(text);
}

function words(text: string): string[] {
  return text
    .split(/\s+/)
    .map((word) => word.replace(/^[^\p{L}\p{N}']+|[^\p{L}\p{N}']+$/gu, ""))
    .filter(Boolean);
}

function visualKey(visual: Visual): string {
  switch (visual.kind) {
    case "emoji": return `emoji:${visual.value}`;
    case "color": return `color:${visual.value.toLocaleLowerCase()}`;
    case "count": return `count:${visual.n}:${visual.emoji}`;
    case "image": return `image:${visual.src}`;
  }
}

function shuffle<T>(values: readonly T[], random: Random): T[] {
  const result = [...values];
  for (let index = result.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [result[index], result[swapIndex]] = [result[swapIndex], result[index]];
  }
  return result;
}

function createRandom(seed: string | number): Random {
  let state = hashSeed(String(seed));
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value ^= value + Math.imul(value ^ (value >>> 7), 61 | value);
    return ((value ^ (value >>> 14)) >>> 0) / 4_294_967_296;
  };
}

function hashSeed(seed: string): number {
  let hash = 2_166_136_261;
  for (let index = 0; index < seed.length; index += 1) {
    hash ^= seed.charCodeAt(index);
    hash = Math.imul(hash, 16_777_619);
  }
  return hash >>> 0;
}
