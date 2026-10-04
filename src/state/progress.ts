/** The sole persisted progress key for the MVP. */
export const PROGRESS_STORAGE_KEY = "mea.progress.v1";
export const PROGRESS_VERSION = 1 as const;

export interface MasteryRecord {
  attempts: number;
  correct: number;
}

export interface ProgressState {
  version: typeof PROGRESS_VERSION;
  completedLessons: string[];
  xp: number;
  stars: number;
  coins: number;
  unlockedPets: string[];
  openedMilestones: string[];
  learningDays: string[];
  itemMastery: Record<string, MasteryRecord>;
  patternMastery: Record<string, MasteryRecord>;
}

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem?(key: string): void;
}

export function createFreshProgress(): ProgressState {
  return {
    version: PROGRESS_VERSION,
    completedLessons: [],
    xp: 0,
    stars: 0,
    coins: 0,
    unlockedPets: [],
    openedMilestones: [],
    learningDays: [],
    itemMastery: {},
    patternMastery: {},
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isNonNegativeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function uniqueStrings(value: unknown): string[] | null {
  if (!Array.isArray(value) || !value.every((entry) => typeof entry === "string")) return null;
  return [...new Set(value)];
}

function validMastery(value: unknown): Record<string, MasteryRecord> | null {
  if (!isRecord(value)) return null;
  const result: Record<string, MasteryRecord> = {};
  for (const [id, raw] of Object.entries(value)) {
    if (!isRecord(raw) || !isNonNegativeInteger(raw.attempts) || !isNonNegativeInteger(raw.correct)) {
      return null;
    }
    if (raw.correct > raw.attempts) return null;
    result[id] = { attempts: raw.attempts, correct: raw.correct };
  }
  return result;
}

/**
 * Migration hook and validation boundary. Future versions should be upgraded here.
 * Version 0 is accepted as the pre-versioned MVP shape and receives missing defaults.
 */
export function migrateProgress(raw: unknown): ProgressState | null {
  if (!isRecord(raw)) return null;
  const version = raw.version ?? 0;
  if (version !== 0 && version !== PROGRESS_VERSION) return null;

  const required = (field: string, fallback: unknown): unknown =>
    version === 0 ? (raw[field] ?? fallback) : raw[field];

  const completedLessons = uniqueStrings(required("completedLessons", []));
  const unlockedPets = uniqueStrings(required("unlockedPets", []));
  const openedMilestones = uniqueStrings(required("openedMilestones", []));
  const learningDays = uniqueStrings(required("learningDays", []));
  const itemMastery = validMastery(required("itemMastery", {}));
  const patternMastery = validMastery(required("patternMastery", {}));
  const xp = required("xp", 0);
  const stars = required("stars", 0);
  const coins = required("coins", 0);

  if (
    completedLessons === null || unlockedPets === null || openedMilestones === null ||
    learningDays === null || itemMastery === null || patternMastery === null ||
    !isNonNegativeInteger(xp) || !isNonNegativeInteger(stars) || !isNonNegativeInteger(coins)
  ) return null;

  return {
    version: PROGRESS_VERSION,
    completedLessons,
    xp,
    stars,
    coins,
    unlockedPets,
    openedMilestones,
    learningDays: learningDays.sort(),
    itemMastery,
    patternMastery,
  };
}

function browserStorage(): StorageLike | undefined {
  try {
    return typeof window === "undefined" ? undefined : window.localStorage;
  } catch {
    return undefined;
  }
}

/** Reads, migrates and validates progress. Any unavailable/corrupt storage becomes fresh state. */
export function loadProgress(storage: StorageLike | undefined = browserStorage()): ProgressState {
  if (!storage) return createFreshProgress();
  try {
    const serialized = storage.getItem(PROGRESS_STORAGE_KEY);
    if (serialized === null) return createFreshProgress();
    return migrateProgress(JSON.parse(serialized)) ?? createFreshProgress();
  } catch {
    return createFreshProgress();
  }
}

/** Best-effort persistence. Storage failures never escape into the child UI. */
export function saveProgress(
  state: ProgressState,
  storage: StorageLike | undefined = browserStorage(),
): boolean {
  if (!storage) return false;
  try {
    storage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(state));
    return true;
  } catch {
    return false;
  }
}

/** Returns fresh state and best-effort replaces the persisted value. */
export function resetProgress(storage: StorageLike | undefined = browserStorage()): ProgressState {
  const fresh = createFreshProgress();
  saveProgress(fresh, storage);
  return fresh;
}

/** Local calendar date, deliberately not UTC (learning days follow the child's day). */
export function localDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function recordLearningDay(state: ProgressState, day = localDateKey()): ProgressState {
  if (state.learningDays.includes(day)) return state;
  return { ...state, learningDays: [...state.learningDays, day].sort() };
}

/** Lesson one starts unlocked; each completed lesson unlocks the next path lesson. */
export function deriveUnlockedLessonIds(
  state: ProgressState,
  orderedLessonIds: readonly string[],
): string[] {
  if (orderedLessonIds.length === 0) return [];
  const unlocked = new Set<string>([orderedLessonIds[0]]);
  orderedLessonIds.forEach((lessonId, index) => {
    if (state.completedLessons.includes(lessonId) && orderedLessonIds[index + 1]) {
      unlocked.add(orderedLessonIds[index + 1]);
    }
  });
  return orderedLessonIds.filter((lessonId) => unlocked.has(lessonId));
}

function incrementMastery(
  records: Record<string, MasteryRecord>,
  id: string,
  correct: boolean,
): Record<string, MasteryRecord> {
  const previous = records[id] ?? { attempts: 0, correct: 0 };
  return {
    ...records,
    [id]: {
      attempts: previous.attempts + 1,
      correct: previous.correct + (correct ? 1 : 0),
    },
  };
}

export interface FirstAttempt {
  itemId: string;
  patternId?: string;
  correct: boolean;
  day?: string;
}

/**
 * Records exactly one scored question's first attempt. The engine should call this
 * once when the learner first answers, never on retries or for speak questions.
 */
export function recordFirstAttempt(state: ProgressState, attempt: FirstAttempt): ProgressState {
  const withDay = recordLearningDay(state, attempt.day);
  return {
    ...withDay,
    itemMastery: incrementMastery(withDay.itemMastery, attempt.itemId, attempt.correct),
    patternMastery: attempt.patternId
      ? incrementMastery(withDay.patternMastery, attempt.patternId, attempt.correct)
      : withDay.patternMastery,
  };
}

export function masteryAccuracy(record: MasteryRecord | undefined): number | undefined {
  return record && record.attempts > 0 ? record.correct / record.attempts : undefined;
}
