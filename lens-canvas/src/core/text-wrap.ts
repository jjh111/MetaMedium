// Canvas text layout powered by pretext
// Proper grapheme-aware line breaking, Unicode-correct measurement
// One engine for all lenses — cards, trees, code, and future free-form reflow

import { prepareWithSegments, layout, layoutNextLine } from '@chenglou/pretext';
import type { PreparedTextWithSegments, LayoutCursor } from '@chenglou/pretext';

export interface WrappedLine {
  text: string;
  width: number;
}

// Cache prepared text to avoid re-measuring on every frame
const prepCache = new WeakMap<CanvasRenderingContext2D, Map<string, { prepared: PreparedTextWithSegments; font: string }>>();

function getPrepared(ctx: CanvasRenderingContext2D, text: string, font: string): PreparedTextWithSegments {
  let cache = prepCache.get(ctx);
  if (!cache) {
    cache = new Map();
    prepCache.set(ctx, cache);
  }

  const key = `${font}::${text}`;
  const cached = cache.get(key);
  if (cached && cached.font === font) return cached.prepared;

  // Evict old entries if cache gets big
  if (cache.size > 200) {
    const keys = [...cache.keys()];
    for (let i = 0; i < 100; i++) cache.delete(keys[i]);
  }

  const prepared = prepareWithSegments(text, font);
  cache.set(key, { prepared, font });
  return prepared;
}

/**
 * Word-wrap text to fit within maxWidth using pretext layout engine.
 * Returns array of lines with proper grapheme-aware breaking.
 */
export function wrapText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines = Infinity,
): WrappedLine[] {
  if (!text || maxWidth <= 0) return [];

  const font = ctx.font;
  const lines: WrappedLine[] = [];

  try {
    const prepared = getPrepared(ctx, text, font);
    let cursor: LayoutCursor = { segmentIndex: 0, graphemeIndex: 0 };

    // Get total line count for overflow detection
    const lineHeight = 14; // approximate, used only for count
    const { lineCount } = layout(prepared, maxWidth, lineHeight);
    const hasOverflow = lineCount > maxLines;

    for (let i = 0; i < Math.min(lineCount, maxLines); i++) {
      const line = layoutNextLine(prepared, cursor, maxWidth);
      if (!line) break;
      lines.push({ text: line.text, width: line.width });
      cursor = line.end;
    }

    // Add ellipsis to last line if truncated
    if (hasOverflow && lines.length > 0) {
      const last = lines[lines.length - 1];
      lines[lines.length - 1] = {
        text: last.text.trimEnd() + '…',
        width: last.width, // approximate — close enough
      };
    }
  } catch {
    // Fallback to naive split if pretext fails (shouldn't happen but safety)
    return naiveWrap(ctx, text, maxWidth, maxLines);
  }

  return lines;
}

/**
 * Truncate text to fit within maxWidth using pretext measurement.
 * Single line only — returns the portion that fits.
 */
export function truncateToWidth(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
): string {
  if (!text || maxWidth <= 0) return '';
  if (ctx.measureText(text).width <= maxWidth) return text;

  try {
    const font = ctx.font;
    const prepared = getPrepared(ctx, text, font);
    const line = layoutNextLine(prepared, { segmentIndex: 0, graphemeIndex: 0 }, maxWidth);
    return line ? line.text.trimEnd() : '';
  } catch {
    // Binary search fallback
    let lo = 0, hi = text.length;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (ctx.measureText(text.slice(0, mid)).width <= maxWidth) lo = mid;
      else hi = mid - 1;
    }
    return text.slice(0, lo);
  }
}

/**
 * Fit a value string into available width, with ellipsis if needed.
 */
export function fitValue(
  ctx: CanvasRenderingContext2D,
  value: string,
  maxWidth: number,
): string {
  if (!value) return '';
  if (ctx.measureText(value).width <= maxWidth) return value;
  const truncated = truncateToWidth(ctx, value, maxWidth - ctx.measureText('…').width);
  return truncated + '…';
}

/**
 * Measure text height for a given width (how many lines it would take).
 * Useful for auto-sizing card heights.
 */
export function measureTextHeight(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  lineHeight: number,
): { height: number; lineCount: number } {
  if (!text || maxWidth <= 0) return { height: 0, lineCount: 0 };

  try {
    const font = ctx.font;
    const prepared = getPrepared(ctx, text, font);
    const result = layout(prepared, maxWidth, lineHeight);
    return { height: result.height, lineCount: result.lineCount };
  } catch {
    // Fallback
    const lines = naiveWrap(ctx, text, maxWidth);
    return { height: lines.length * lineHeight, lineCount: lines.length };
  }
}

// ── Naive fallback (no pretext) ──

function naiveWrap(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines = Infinity,
): WrappedLine[] {
  const lines: WrappedLine[] = [];
  const words = text.split(/\s+/);
  let current = '';

  for (const word of words) {
    if (lines.length >= maxLines) break;
    const test = current ? `${current} ${word}` : word;
    if (ctx.measureText(test).width > maxWidth && current) {
      const m = ctx.measureText(current);
      lines.push({ text: current, width: m.width });
      current = word;
    } else {
      current = test;
    }
  }

  if (current && lines.length < maxLines) {
    lines.push({ text: current, width: ctx.measureText(current).width });
  }

  return lines;
}
