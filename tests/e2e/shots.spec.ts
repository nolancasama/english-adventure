import { expect, test, type Page } from "@playwright/test";
import { mkdir, rm } from "node:fs/promises";
import path from "node:path";

type QuestionType = "listen-picture" | "picture-word" | "sentence-builder" | "speak";
type MeaHookKey =
  | "currentQuestionType"
  | "correctAnswerIds"
  | "tileOrder"
  | "currentLessonId";

declare global {
  interface Window {
    __mea?: Record<MeaHookKey, unknown>;
  }
}

const lessonIds = [
  "hello",
  "colors",
  "animals",
  "numbers",
  "food",
  "i-like",
  "do-you-like",
  "family",
  "review",
  "boss"
] as const;

const shotsDirectory = path.join(".tmp", "shots");

test.beforeAll(async () => {
  await rm(shotsDirectory, { recursive: true, force: true });
  await mkdir(shotsDirectory, { recursive: true });
});

async function hook<T>(page: Page, key: MeaHookKey): Promise<T> {
  return page.evaluate((hookKey) => {
    const api = window.__mea;
    if (!api) throw new Error("window.__mea is unavailable; open the app with ?e2e=1");
    const value = api[hookKey];
    return (typeof value === "function" ? value() : value) as T;
  }, key);
}

async function capture(page: Page, name: string) {
  await page.screenshot({
    path: path.join(shotsDirectory, name),
    animations: "disabled"
  });
}

async function questionSignature(page: Page) {
  const [type, answers, tiles] = await Promise.all([
    hook<QuestionType | null>(page, "currentQuestionType"),
    hook<string[]>(page, "correctAnswerIds"),
    hook<string[]>(page, "tileOrder")
  ]);
  return JSON.stringify({ type, answers, tiles });
}

async function waitForAdvance(page: Page, oldSignature: string) {
  await expect
    .poll(async () => {
      if (await page.getByTestId("lesson-celebration").isVisible().catch(() => false)) return true;
      return (await questionSignature(page)) !== oldSignature;
    })
    .toBe(true);
}

async function answerCurrentQuestion(page: Page) {
  const type = await hook<QuestionType>(page, "currentQuestionType");
  const signature = await questionSignature(page);

  if (type === "listen-picture" || type === "picture-word") {
    const [correct] = await hook<string[]>(page, "correctAnswerIds");
    expect(correct, "picture question should expose its answer in e2e mode").toBeTruthy();
    const choice = page
      .locator(`[data-testid="choice-${correct}"]:visible, [data-item-id="${correct}"]:visible`)
      .first();
    await expect(choice).toBeVisible();
    await choice.click();
    await waitForAdvance(page, signature);
    return;
  }

  if (type === "sentence-builder") {
    const words = await hook<string[]>(page, "tileOrder");
    expect(words.length).toBeGreaterThan(0);
    for (const word of words) {
      const tile = page
        .locator(`[data-testid^="tile-"][data-word="${word}"]:visible, button[data-word="${word}"]:visible`)
        .first();
      await expect(tile).toBeVisible();
      await tile.click();
    }
    await waitForAdvance(page, signature);
    return;
  }

  expect(type).toBe("speak");
  await page.getByTestId("speak-say").click();
  await expect(page.getByTestId("speak-done")).toBeEnabled();
  await page.getByTestId("speak-done").click();
  await waitForAdvance(page, signature);
}

async function playAndCaptureLesson(page: Page, lessonId: string) {
  await page.getByTestId(`lesson-node-${lessonId}`).click();

  const titleCard = page.getByTestId("lesson-title-card");
  await expect(titleCard).toBeVisible();
  await capture(page, `${lessonId}-00-title.png`);
  await titleCard.click();
  await expect.poll(() => hook(page, "currentLessonId")).toBe(lessonId);

  let questionNumber = 1;
  while (!(await page.getByTestId("lesson-celebration").isVisible().catch(() => false))) {
    expect(questionNumber, `${lessonId} should finish without an infinite question loop`).toBeLessThan(40);
    await expect.poll(() => hook(page, "currentQuestionType")).not.toBeNull();
    const type = await hook<QuestionType>(page, "currentQuestionType");
    await capture(page, `${lessonId}-${String(questionNumber).padStart(2, "0")}-${type}.png`);
    await answerCurrentQuestion(page);
    questionNumber += 1;
  }

  await capture(
    page,
    `${lessonId}-${String(questionNumber).padStart(2, "0")}-celebration.png`
  );
  await page.getByTestId("celebration-continue").click();
  await expect(page.getByTestId("screen-home")).toBeVisible();
}

test("capture every lesson and supporting screen at 320x640", async ({ page }) => {
  test.setTimeout(120_000);
  await page.addInitScript(() => { if (!sessionStorage.getItem("mea.e2e.cleared")) { localStorage.removeItem("mea.progress.v1"); sessionStorage.setItem("mea.e2e.cleared", "1"); } });
  await page.goto("/?e2e=1&shots=1");

  await expect(page.getByTestId("screen-home")).toBeVisible();
  await capture(page, "home-00-fresh.png");

  for (const lessonId of lessonIds) await playAndCaptureLesson(page, lessonId);

  await capture(page, "home-01-complete.png");
  await page.getByTestId("pets-button").click();
  await expect(page.getByTestId("screen-pets")).toBeVisible();
  await capture(page, "pets-00-list.png");

  await page.getByTestId("pet-cat").click();
  await expect(page.getByTestId("pet-confirm")).toBeVisible();
  await capture(page, "pets-01-confirm.png");
  await page.getByTestId("pet-confirm").click();
  await page.getByTestId("pets-back").click();
  await expect(page.getByTestId("screen-home")).toBeVisible();

  const gate = page.getByTestId("parent-gate");
  const box = await gate.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.down();
  await expect(page.getByTestId("screen-parent")).toBeVisible({ timeout: 5_000 });
  await page.mouse.up();
  await capture(page, "parent-00-view.png");
});
