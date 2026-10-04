import { describe, expect, it } from "vitest";
import { createFreshProgress } from "./progress";
import { completeLesson, openMilestone, purchasePet, rewardCorrectAnswer } from "./rewards";

describe("reward rules", () => {
  it("awards answer XP according to retry status", () => {
    const fresh = createFreshProgress();
    expect(rewardCorrectAnswer(fresh, true).xp).toBe(2);
    expect(rewardCorrectAnswer(fresh, false).xp).toBe(1);
  });

  it("awards first completion once and replay rewards thereafter", () => {
    const first = completeLesson(createFreshProgress(), "hello");
    expect(first.firstCompletion).toBe(true);
    expect(first.state).toMatchObject({ xp: 10, coins: 5, stars: 1, completedLessons: ["hello"] });
    const replay = completeLesson(first.state, "hello");
    expect(replay.firstCompletion).toBe(false);
    expect(replay.state).toMatchObject({ xp: 15, coins: 7, stars: 1, completedLessons: ["hello"] });
  });

  it("awards the boss reward and unlocks Unicorn only on first completion", () => {
    const boss = completeLesson(createFreshProgress(), "boss", { kind: "boss" });
    expect(boss.state).toMatchObject({ xp: 30, coins: 20, stars: 1, unlockedPets: ["unicorn"] });
    const replay = completeLesson(boss.state, "boss", { kind: "boss" });
    expect(replay.state).toMatchObject({ xp: 35, coins: 22, stars: 1, unlockedPets: ["unicorn"] });
  });

  it("opens a chest only once", () => {
    const first = openMilestone(createFreshProgress(), "animals-chest");
    expect(first.opened).toBe(true);
    expect(first.state.coins).toBe(10);
    const second = openMilestone(first.state, "animals-chest");
    expect(second.opened).toBe(false);
    expect(second.state).toBe(first.state);
  });

  it("purchases affordable pets and reports shortfall", () => {
    const short = purchasePet({ ...createFreshProgress(), coins: 6 }, { id: "cat", cost: 10 });
    expect(short).toMatchObject({ purchased: false, reason: "not-enough-coins", coinsNeeded: 4 });
    const bought = purchasePet({ ...createFreshProgress(), coins: 12 }, { id: "cat", cost: 10 });
    expect(bought).toMatchObject({ purchased: true, coinsSpent: 10, state: { coins: 2, unlockedPets: ["cat"] } });
    const rewardOnly = purchasePet(createFreshProgress(), { id: "unicorn", cost: 0, unlockedBy: "boss" });
    expect(rewardOnly).toMatchObject({ purchased: false, reason: "reward-only" });
  });
});
