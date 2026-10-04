import { describe, expect, it } from "vitest";
import {
  PROGRESS_STORAGE_KEY,
  createFreshProgress,
  deriveUnlockedLessonIds,
  loadProgress,
  localDateKey,
  masteryAccuracy,
  migrateProgress,
  recordFirstAttempt,
  resetProgress,
  saveProgress,
  type StorageLike,
} from "./progress";

function memoryStorage(initial?: string): StorageLike & { value: string | null } {
  return {
    value: initial ?? null,
    getItem(key) { return key === PROGRESS_STORAGE_KEY ? this.value : null; },
    setItem(key, value) { if (key === PROGRESS_STORAGE_KEY) this.value = value; },
  };
}

describe("progress persistence", () => {
  it("round-trips the single versioned store", () => {
    const storage = memoryStorage();
    const state = { ...createFreshProgress(), xp: 12, completedLessons: ["hello"] };
    expect(saveProgress(state, storage)).toBe(true);
    expect(loadProgress(storage)).toEqual(state);
  });

  it("falls back safely for corrupt data and storage errors", () => {
    expect(loadProgress(memoryStorage("not json"))).toEqual(createFreshProgress());
    expect(loadProgress(memoryStorage(JSON.stringify({ version: 1, xp: -2 })))).toEqual(createFreshProgress());
    expect(loadProgress(memoryStorage(JSON.stringify({ version: 1, xp: 2 })))).toEqual(createFreshProgress());
    const broken: StorageLike = {
      getItem() { throw new Error("blocked"); },
      setItem() { throw new Error("blocked"); },
    };
    expect(loadProgress(broken)).toEqual(createFreshProgress());
    expect(saveProgress(createFreshProgress(), broken)).toBe(false);
  });

  it("migrates a compatible legacy shape and rejects unknown versions", () => {
    expect(migrateProgress({ xp: 3 })?.version).toBe(1);
    expect(migrateProgress({ version: 99 })).toBeNull();
  });

  it("resets both memory and persisted progress", () => {
    const storage = memoryStorage(JSON.stringify({ ...createFreshProgress(), xp: 99 }));
    expect(resetProgress(storage)).toEqual(createFreshProgress());
    expect(loadProgress(storage)).toEqual(createFreshProgress());
  });
});

describe("mastery", () => {
  it("counts only the first attempt supplied by the engine for item and pattern", () => {
    let state = createFreshProgress();
    state = recordFirstAttempt(state, {
      itemId: "i-like-cats",
      patternId: "i-like",
      correct: false,
      day: "2026-10-04",
    });
    state = recordFirstAttempt(state, {
      itemId: "i-like-cats",
      patternId: "i-like",
      correct: true,
      day: "2026-10-04",
    });
    expect(state.itemMastery["i-like-cats"]).toEqual({ attempts: 2, correct: 1 });
    expect(state.patternMastery["i-like"]).toEqual({ attempts: 2, correct: 1 });
    expect(state.learningDays).toEqual(["2026-10-04"]);
    expect(masteryAccuracy(state.itemMastery["i-like-cats"])).toBe(0.5);
  });

  it("formats local calendar dates without UTC conversion", () => {
    expect(localDateKey(new Date(2024, 0, 2, 23, 30))).toBe("2024-01-02");
  });

  it("derives path unlocking from completion order", () => {
    const ids = ["hello", "colors", "animals"];
    expect(deriveUnlockedLessonIds(createFreshProgress(), ids)).toEqual(["hello"]);
    expect(deriveUnlockedLessonIds({
      ...createFreshProgress(),
      completedLessons: ["hello"],
    }, ids)).toEqual(["hello", "colors"]);
  });
});
