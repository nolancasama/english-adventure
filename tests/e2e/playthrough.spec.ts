import { expect, test, type Locator, type Page } from "@playwright/test";

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

async function hook<T>(page: Page, key: MeaHookKey): Promise<T> {
  return page.evaluate((hookKey) => {
    const api = window.__mea;
    if (!api) throw new Error("window.__mea is unavailable; open the app with ?e2e=1");
    const value = api[hookKey];
    return (typeof value === "function" ? value() : value) as T;
  }, key);
}

async function assertNoHorizontalOverflow(page: Page) {
  await expect
    .poll(() =>
      page.evaluate(() => ({
        scrollWidth: document.documentElement.scrollWidth,
        innerWidth: window.innerWidth
      }))
    )
    .toEqual({ scrollWidth: 320, innerWidth: 320 });
}

async function numberIn(testId: string, page: Page) {
  const text = (await page.getByTestId(testId).innerText()).replaceAll(",", "");
  const value = Number(text.match(/\d+/)?.[0]);
  expect(Number.isFinite(value), `${testId} should contain a number`).toBe(true);
  return value;
}

function optionId(option: Locator) {
  return option.evaluate((node) => {
    const explicit = node.getAttribute("data-item-id");
    if (explicit) return explicit;
    return node.getAttribute("data-testid")?.replace(/^choice-/, "") ?? "";
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

async function waitForQuestionOrCelebration(page: Page, lessonId: string) {
  await expect
    .poll(async () => {
      if (await page.getByTestId("lesson-celebration").isVisible().catch(() => false)) {
        return "celebration";
      }
      const [activeLesson, questionType] = await Promise.all([
        hook<string | null>(page, "currentLessonId"),
        hook<QuestionType | null>(page, "currentQuestionType")
      ]);
      return activeLesson === lessonId && questionType ? "question" : "waiting";
    })
    .not.toBe("waiting");
}

async function waitForAdvance(page: Page, oldSignature: string) {
  await expect
    .poll(async () => {
      if (await page.getByTestId("lesson-celebration").isVisible().catch(() => false)) return true;
      if ((await hook<string | null>(page, "currentLessonId")) === null) return true;
      return (await questionSignature(page)) !== oldSignature;
    })
    .toBe(true);
}

async function clickChoice(page: Page, itemId: string) {
  const choice = page
    .locator(`[data-testid="choice-${itemId}"]:visible, [data-item-id="${itemId}"]:visible`)
    .first();
  await expect(choice, `choice for ${itemId}`).toBeVisible();
  await choice.click();
}

async function answerCurrentQuestion(page: Page, answerWrongFirst: boolean) {
  const type = await hook<QuestionType>(page, "currentQuestionType");
  const signature = await questionSignature(page);

  if (type === "listen-picture" || type === "picture-word") {
    const correct = await hook<string[]>(page, "correctAnswerIds");
    expect(correct.length).toBeGreaterThan(0);

    if (answerWrongFirst) {
      const choices = page.locator('[data-testid^="choice-"]:visible, [data-item-id]:visible');
      let wrong: Locator | undefined;
      for (let index = 0; index < (await choices.count()); index += 1) {
        const candidate = choices.nth(index);
        if (!correct.includes(await optionId(candidate))) {
          wrong = candidate;
          break;
        }
      }
      expect(wrong, "a visually distinct wrong choice should be available").toBeDefined();
      await wrong!.click();
      await expect(page.getByTestId("feedback-wrong")).toBeVisible();
      await expect(page.getByText("もういちど！", { exact: true })).toBeVisible();
    }

    await clickChoice(page, correct[0]);
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
      if (await tile.count()) await tile.click();
      else await page.getByRole("button", { name: word, exact: true }).first().click();
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

async function playLesson(page: Page, lessonId: string, includeWrongAnswer = false) {
  const node = page.getByTestId(`lesson-node-${lessonId}`);
  await expect(node).toBeVisible();
  await node.click();

  await expect.poll(() => hook(page, "currentLessonId")).toBe(lessonId);
  await waitForQuestionOrCelebration(page, lessonId);
  await assertNoHorizontalOverflow(page);

  let answeredWrong = false;
  let guard = 0;
  while (!(await page.getByTestId("lesson-celebration").isVisible().catch(() => false))) {
    guard += 1;
    expect(guard, `${lessonId} should finish without an infinite question loop`).toBeLessThan(40);
    await waitForQuestionOrCelebration(page, lessonId);
    if (await page.getByTestId("lesson-celebration").isVisible().catch(() => false)) break;
    await answerCurrentQuestion(page, includeWrongAnswer && !answeredWrong);
    answeredWrong ||= includeWrongAnswer;
  }

  if (includeWrongAnswer) expect(answeredWrong).toBe(true);
  await expect(page.getByTestId("lesson-celebration")).toBeVisible();
  if (lessonId === "boss") await expect(page.getByText("World Complete!", { exact: true })).toBeVisible();
  await page.getByTestId("celebration-continue").click();
  await expect(page.getByTestId("screen-home")).toBeVisible();
}

test("complete the world, keep progress, inspect parent stats, and reset", async ({ page }) => {
  const consoleErrors: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("pageerror", (error) => consoleErrors.push(error.message));

  await page.addInitScript(() => { if (!sessionStorage.getItem("mea.e2e.cleared")) { localStorage.removeItem("mea.progress.v1"); sessionStorage.setItem("mea.e2e.cleared", "1"); } });
  await page.goto("/?e2e=1");

  await expect(page.getByTestId("screen-home")).toBeVisible();
  await expect(page.getByTestId("start-bubble")).toBeVisible();
  await assertNoHorizontalOverflow(page);

  for (let index = 0; index < lessonIds.length; index += 1) {
    const lessonId = lessonIds[index];
    const before = {
      stars: await numberIn("stat-stars", page),
      xp: await numberIn("stat-xp", page),
      coins: await numberIn("stat-coins", page)
    };

    await playLesson(page, lessonId, index === 0);

    expect(await numberIn("stat-stars", page)).toBeGreaterThan(before.stars);
    expect(await numberIn("stat-xp", page)).toBeGreaterThan(before.xp);
    expect(await numberIn("stat-coins", page)).toBeGreaterThanOrEqual(before.coins);
    await expect(page.getByTestId(`lesson-node-${lessonId}`)).toHaveAttribute("data-state", "completed");

    if (index + 1 < lessonIds.length) {
      await expect(page.getByTestId(`lesson-node-${lessonIds[index + 1]}`)).not.toHaveAttribute(
        "data-state",
        "locked"
      );
    }
  }

  await expect(page.getByTestId("milestone-chest")).toHaveAttribute("data-state", "ready");
  const coinsBeforeChest = await numberIn("stat-coins", page);
  await page.getByTestId("milestone-chest").click();
  await expect.poll(() => numberIn("stat-coins", page)).toBe(coinsBeforeChest + 10);

  await page.getByTestId("pets-button").click();
  await expect(page.getByTestId("screen-pets")).toBeVisible();
  await assertNoHorizontalOverflow(page);
  await page.getByTestId("pet-cat").click();
  await expect(page.getByTestId("pet-confirm")).toBeVisible();
  await page.getByTestId("pet-confirm").click();
  await expect(page.getByTestId("pet-cat")).toHaveAttribute("data-unlocked", "true");
  await page.getByTestId("pets-back").click();
  await expect(page.getByTestId("screen-home")).toBeVisible();

  const persisted = {
    stars: await numberIn("stat-stars", page),
    xp: await numberIn("stat-xp", page),
    coins: await numberIn("stat-coins", page)
  };
  await page.reload();
  await expect(page.getByTestId("screen-home")).toBeVisible();
  await page.getByTestId("pets-button").click();
  await expect(page.getByTestId("pet-cat")).toHaveAttribute("data-unlocked", "true");
  await page.getByTestId("pets-back").click();
  await expect(page.getByTestId("screen-home")).toBeVisible();
  expect(await numberIn("stat-stars", page)).toBe(persisted.stars);
  expect(await numberIn("stat-xp", page)).toBe(persisted.xp);
  expect(await numberIn("stat-coins", page)).toBe(persisted.coins);
  for (const lessonId of lessonIds) {
    await expect(page.getByTestId(`lesson-node-${lessonId}`)).toHaveAttribute("data-state", "completed");
  }

  const gate = page.getByTestId("parent-gate");
  const box = await gate.boundingBox();
  expect(box).not.toBeNull();
  await page.mouse.move(box!.x + box!.width / 2, box!.y + box!.height / 2);
  await page.mouse.down();
  await expect(page.getByTestId("screen-parent")).toBeVisible({ timeout: 5_000 });
  await page.mouse.up();

  await expect(page.getByTestId("parent-lessons-completed")).toContainText("10");
  await expect(page.getByTestId("parent-total-xp")).toContainText(String(persisted.xp));
  await expect(page.getByTestId("parent-learning-days")).toBeVisible();
  await expect(page.getByTestId("parent-words-practised")).toBeVisible();
  await assertNoHorizontalOverflow(page);

  await page.getByTestId("parent-reset").click();
  await page.getByTestId("reset-confirm-1").click();
  await page.getByTestId("reset-confirm-2").click();
  await expect(page.getByTestId("screen-home")).toBeVisible();
  await expect(page.getByTestId("start-bubble")).toBeVisible();
  expect(await numberIn("stat-stars", page)).toBe(0);
  expect(await numberIn("stat-xp", page)).toBe(0);
  expect(await numberIn("stat-coins", page)).toBe(0);

  expect(consoleErrors, "the full playthrough should not emit console errors").toEqual([]);
});
