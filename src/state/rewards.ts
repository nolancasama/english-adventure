import type { ProgressState } from "./progress";

export const ANSWER_XP = { firstTry: 2, afterRetry: 1 } as const;
export const FIRST_COMPLETION_REWARD = { xp: 10, coins: 5, stars: 1 } as const;
export const REPLAY_REWARD = { xp: 5, coins: 2, stars: 0 } as const;
export const BOSS_COMPLETION_REWARD = { xp: 30, coins: 20, stars: 1 } as const;
export const TREASURE_CHEST_COINS = 10;

export function rewardCorrectAnswer(state: ProgressState, correctFirstTry: boolean): ProgressState {
  return { ...state, xp: state.xp + (correctFirstTry ? ANSWER_XP.firstTry : ANSWER_XP.afterRetry) };
}

export interface CompleteLessonOptions {
  kind?: "normal" | "review" | "boss";
  /** Boss reward pet. Defaults to the MVP's Unicorn id. */
  rewardPetId?: string;
}

export interface LessonCompletionResult {
  state: ProgressState;
  firstCompletion: boolean;
  reward: { xp: number; coins: number; stars: number };
}

/** Applies first-completion/boss/replay rewards and keeps lesson completion idempotent. */
export function completeLesson(
  state: ProgressState,
  lessonId: string,
  options: CompleteLessonOptions = {},
): LessonCompletionResult {
  const firstCompletion = !state.completedLessons.includes(lessonId);
  const reward = firstCompletion
    ? options.kind === "boss" ? BOSS_COMPLETION_REWARD : FIRST_COMPLETION_REWARD
    : REPLAY_REWARD;
  const rewardPetId = options.rewardPetId ?? "unicorn";
  const grantsPet = firstCompletion && options.kind === "boss";

  return {
    firstCompletion,
    reward,
    state: {
      ...state,
      completedLessons: firstCompletion
        ? [...state.completedLessons, lessonId]
        : state.completedLessons,
      xp: state.xp + reward.xp,
      coins: state.coins + reward.coins,
      stars: state.stars + reward.stars,
      unlockedPets: grantsPet && !state.unlockedPets.includes(rewardPetId)
        ? [...state.unlockedPets, rewardPetId]
        : state.unlockedPets,
    },
  };
}

export interface OpenMilestoneResult {
  state: ProgressState;
  opened: boolean;
}

/** Opens a completed milestone only once. Eligibility remains a UI/domain decision. */
export function openMilestone(
  state: ProgressState,
  milestoneId: string,
  coins = TREASURE_CHEST_COINS,
): OpenMilestoneResult {
  if (state.openedMilestones.includes(milestoneId)) return { state, opened: false };
  return {
    opened: true,
    state: {
      ...state,
      coins: state.coins + coins,
      openedMilestones: [...state.openedMilestones, milestoneId],
    },
  };
}

export type PurchaseFailure = "already-unlocked" | "reward-only" | "not-enough-coins";

export type PurchasePetResult =
  | { purchased: true; state: ProgressState; coinsSpent: number }
  | { purchased: false; state: ProgressState; reason: PurchaseFailure; coinsNeeded: number };

export interface PurchasablePet {
  id: string;
  cost: number;
  unlockedBy?: string;
}

export function purchasePet(state: ProgressState, pet: PurchasablePet): PurchasePetResult {
  if (state.unlockedPets.includes(pet.id)) {
    return { purchased: false, state, reason: "already-unlocked", coinsNeeded: 0 };
  }
  if (pet.unlockedBy) {
    return { purchased: false, state, reason: "reward-only", coinsNeeded: 0 };
  }
  if (state.coins < pet.cost) {
    return {
      purchased: false,
      state,
      reason: "not-enough-coins",
      coinsNeeded: pet.cost - state.coins,
    };
  }
  return {
    purchased: true,
    coinsSpent: pet.cost,
    state: {
      ...state,
      coins: state.coins - pet.cost,
      unlockedPets: [...state.unlockedPets, pet.id],
    },
  };
}
