import type { Visual } from "../content/types";
import { emojiManifest } from "../art/emojiManifest";

const emojiSegmenter = new Intl.Segmenter(undefined, { granularity: "grapheme" });

function emojiGlyphs(value: string): string[] {
  return [...emojiSegmenter.segment(value)]
    .map(({ segment }) => segment)
    .filter((segment) => segment.trim());
}

function EmojiArt({ glyph }: { glyph: string }) {
  const path = emojiManifest[glyph];
  if (!path) return <>{glyph}</>;
  const src = `${import.meta.env.BASE_URL}${path.replace(/^\//u, "")}`;
  return <img className="emoji-art" src={src} alt="" draggable={false} />;
}

export function ItemVisual({ visual, small = false }: { visual: Visual; small?: boolean }) {
  const className = `item-visual${small ? " item-visual--small" : ""}`;
  if (visual.kind === "color") {
    return (
      <span
        className={`${className} color-blob`}
        style={{ "--blob": visual.value } as React.CSSProperties}
        aria-label={visual.value}
      />
    );
  }
  if (visual.kind === "count") {
    return (
      <span
        className={`${className} count-visual`}
        style={{
          "--count-columns": Math.min(visual.n, 5),
          "--count-rows": Math.ceil(visual.n / 5),
          "--count-total": visual.n,
        } as React.CSSProperties}
        aria-label={`${visual.n}`}
      >
        {Array.from({ length: visual.n }, (_, index) => (
          <span key={index}><EmojiArt glyph={visual.emoji} /></span>
        ))}
      </span>
    );
  }
  if (visual.kind === "image") {
    return <img className={className} src={visual.src} alt={visual.alt} />;
  }
  return (
    <span
      className={`${className} emoji-visual`}
      style={{ "--glyphs": glyphCount(visual.value) } as React.CSSProperties}
      role="img"
      aria-label="picture"
    >
      <span>
        {emojiGlyphs(visual.value).map((glyph, index) => (
          <EmojiArt key={`${glyph}-${index}`} glyph={glyph} />
        ))}
      </span>
    </span>
  );
}

// Emoji are sized per glyph so one emoji fills its card and two still fit side by side.
function glyphCount(value: string): number {
  return Math.max(1, emojiGlyphs(value).length);
}
