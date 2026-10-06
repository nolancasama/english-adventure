import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { items } from "../content/items";
import { world } from "../content/lessons";
import { pets } from "../content/pets";
import type { Visual } from "../content/types";
import { allowedEmojiFallbacks } from "./emojiFallbacks";
import { emojiManifest } from "./emojiManifest";

const segmenter = new Intl.Segmenter("en", { granularity: "grapheme" });

function emojiGlyphs(value: string): string[] {
  return [...segmenter.segment(value)]
    .map(({ segment }) => segment)
    .filter((segment) => /\p{Extended_Pictographic}/u.test(segment));
}

function visualGlyphs(visual: Visual): string[] {
  if (visual.kind === "emoji") return emojiGlyphs(visual.value);
  if (visual.kind === "count") return emojiGlyphs(visual.emoji);
  return [];
}

describe("Fluent Emoji art", () => {
  it("covers every authored item, pet, lesson, and milestone glyph", () => {
    const authoredGlyphs = new Set([
      ...items.flatMap(({ visual }) => visualGlyphs(visual)),
      ...pets.flatMap(({ visual }) => visualGlyphs(visual)),
      ...world.lessons.flatMap(({ icon }) => emojiGlyphs(icon)),
      ...world.milestones.flatMap(({ icon }) => emojiGlyphs(icon)),
    ]);
    const fallbacks = new Set(allowedEmojiFallbacks);

    for (const glyph of authoredGlyphs) {
      expect(
        glyph in emojiManifest || fallbacks.has(glyph),
        `${glyph} must have bundled art or be explicitly allowed in emojiFallbacks.ts`,
      ).toBe(true);
    }
  });

  it("points every manifest entry at a committed WebP asset", () => {
    for (const [glyph, publicPath] of Object.entries(emojiManifest)) {
      expect(publicPath, glyph).toMatch(/^\/art\/emoji\/[0-9a-f-]+\.webp$/u);
      expect(existsSync(join(process.cwd(), "public", publicPath)), `${glyph}: ${publicPath}`).toBe(true);
    }
  });
});
