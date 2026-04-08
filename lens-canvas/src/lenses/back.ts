// BackLens — the "back side" of any card
// Shows: data type header, formatted JSON/text with pretext wrapping
// This is the lens that renders when a node is flipped

import type { Rect } from '../core/types';
import type { LensRenderOptions } from '../core/lens-registry';
import { fitValue } from '../core/text-wrap';

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function getValueColor(val: string, isDark: boolean): string {
  const trimmed = val.trim().replace(/,\s*$/, '');
  if (/^"/.test(trimmed)) return isDark ? '#6bdb7b' : '#2a7a3a'; // green for strings
  if (/^-?\d/.test(trimmed)) return isDark ? '#d4af37' : '#9a7b2a'; // gold for numbers
  if (trimmed === 'true' || trimmed === 'false') return isDark ? '#c792ea' : '#7c3aed'; // purple for booleans
  if (trimmed === 'null') return isDark ? '#ff6b6b' : '#c0392b'; // red for null
  return isDark ? 'rgba(77,201,246,0.6)' : 'rgba(42,74,90,0.6)'; // dim for structural
}

export const BackLens = {
  id: 'back',
  name: 'Back',

  render(
    ctx: CanvasRenderingContext2D,
    data: unknown,
    bounds: Rect,
    options: LensRenderOptions,
  ) {
    const { x, y, width, height } = bounds;
    const { isDark, selected } = options;

    // Different bg tint — slightly warmer to signal "other side"
    ctx.fillStyle = isDark ? '#060c10' : '#ece8e0';
    roundRect(ctx, x, y, width, height, 4);
    ctx.fill();

    // Right accent bar (reversed orientation signals flip)
    ctx.fillStyle = isDark ? '#d4af37' : '#9a7b2a'; // gold = "back side"
    ctx.fillRect(x + width - 4, y, 4, height);

    // Border
    if (selected) {
      ctx.strokeStyle = isDark ? '#d4af37' : '#9a7b2a';
      ctx.lineWidth = 2;
      ctx.shadowColor = isDark ? 'rgba(212,175,55,0.4)' : 'rgba(154,123,42,0.15)';
      ctx.shadowBlur = 8;
    } else {
      ctx.strokeStyle = isDark ? 'rgba(212,175,55,0.25)' : 'rgba(154,123,42,0.2)';
      ctx.lineWidth = 1;
      ctx.shadowBlur = 0;
    }
    roundRect(ctx, x, y, width, height, 4);
    ctx.stroke();
    ctx.shadowBlur = 0;

    const pad = 12;
    let textY = y + pad;
    const textX = x + pad;
    const contentW = width - pad * 2 - 8; // -8 for right accent bar

    ctx.textBaseline = 'top';

    // Header: data type
    ctx.font = '500 9px "JetBrains Mono", monospace';
    ctx.fillStyle = isDark ? '#d4af37' : '#9a7b2a';
    ctx.fillText(`RAW · ${options.dataType?.toUpperCase() ?? 'UNKNOWN'}`, textX, textY);
    textY += 16;

    // Separator
    ctx.strokeStyle = isDark ? 'rgba(212,175,55,0.15)' : 'rgba(154,123,42,0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 8, textY);
    ctx.lineTo(x + width - 8, textY);
    ctx.stroke();
    textY += 8;

    // Data content — line-by-line JSON with syntax coloring
    const raw = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    const maxContentY = y + height - pad - 16;

    ctx.font = '400 10px "JetBrains Mono", monospace';

    const lines = raw.split('\n');
    const lineH = 13;
    const maxLines = Math.floor((maxContentY - textY) / lineH);

    // Clip content area
    ctx.save();
    ctx.beginPath();
    ctx.rect(x, textY - 2, width, maxContentY - textY + 4);
    ctx.clip();

    for (let i = 0; i < Math.min(lines.length, maxLines); i++) {
      renderJsonLine(ctx, lines[i], textX, textY, contentW, isDark);
      textY += lineH;
    }

    ctx.restore();

    if (lines.length > maxLines) {
      ctx.font = '400 10px "JetBrains Mono", monospace';
      ctx.fillStyle = isDark ? 'rgba(212,175,55,0.5)' : 'rgba(154,123,42,0.5)';
      ctx.fillText(`… ${lines.length - maxLines} more lines`, textX, textY);
    }

    // Corner flip indicator
    ctx.font = '400 9px "JetBrains Mono", monospace';
    ctx.fillStyle = isDark ? 'rgba(212,175,55,0.4)' : 'rgba(154,123,42,0.4)';
    ctx.textAlign = 'left';
    ctx.fillText('↩ F to flip', textX, y + height - 12);
    ctx.textAlign = 'left';
  },
};

function renderJsonLine(
  ctx: CanvasRenderingContext2D,
  line: string,
  x: number,
  y: number,
  maxW: number,
  isDark: boolean,
) {
  // Truncate line to fit width using pretext
  ctx.font = '400 10px "JetBrains Mono", monospace';
  const truncated = fitValue(ctx, line, maxW);

  // Simple coloring: detect if line contains a key pattern "  "key":"
  if (/^\s+"[^"]+"[\s]*:/.test(line)) {
    // Has a key — color key and value separately
    const colonIdx = truncated.indexOf(':');
    if (colonIdx >= 0) {
      const keyPart = truncated.slice(0, colonIdx + 1);
      const valPart = truncated.slice(colonIdx + 1);
      ctx.fillStyle = isDark ? '#4dc9f6' : '#2a6b8a';
      ctx.fillText(keyPart, x, y);
      const keyW = ctx.measureText(keyPart).width;
      ctx.fillStyle = getValueColor(valPart.trim(), isDark);
      ctx.fillText(valPart, x + keyW, y);
    } else {
      ctx.fillStyle = isDark ? '#4dc9f6' : '#2a6b8a';
      ctx.fillText(truncated, x, y);
    }
  } else {
    // Structural (braces, brackets) or plain text
    ctx.fillStyle = isDark ? 'rgba(77,201,246,0.4)' : 'rgba(42,74,90,0.4)';
    ctx.fillText(truncated, x, y);
  }
}
