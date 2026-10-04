import type { Visual } from "../content/types";

export function ItemVisual({ visual, small = false }: { visual: Visual; small?: boolean }) {
  const className = `item-visual${small ? " item-visual--small" : ""}`;
  if (visual.kind === "color") {
    return <span className={`${className} color-blob`} style={{ "--blob": visual.value } as React.CSSProperties} aria-label={visual.value} />;
  }
  if (visual.kind === "count") {
    return (
      <span className={`${className} count-visual`} style={{ "--count-columns": Math.min(visual.n, 5), "--count-rows": Math.ceil(visual.n / 5), "--count-total": visual.n } as React.CSSProperties} aria-label={`${visual.n}`}>
        {Array.from({ length: visual.n }, (_, index) => <span key={index}>{visual.emoji}</span>)}
      </span>
    );
  }
  if (visual.kind === "image") {
    return <img className={className} src={visual.src} alt={visual.alt} />;
  }
  return (
    <span className={`${className} emoji-visual`} style={{ "--glyphs": glyphCount(visual.value) } as React.CSSProperties} role="img" aria-label="picture">
      <span>{visual.value}</span>
    </span>
  );
}

// Emoji are sized per glyph so one emoji fills its card and two still fit side by side.
function glyphCount(value: string): number {
  const segments = [...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(value)];
  return Math.max(1, segments.filter(({ segment }) => segment.trim()).length);
}
