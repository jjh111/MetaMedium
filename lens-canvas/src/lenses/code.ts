// CodeLens — syntax-highlighted code block
// Best for: code strings, function definitions, config snippets
// Phase 1: replaced charW=6.6 estimate with pretext-measured truncation

import type { Rect } from '../core/types';
import type { LensRenderOptions } from '../core/lens-registry';
import { wrapText } from '../core/text-wrap';

// Simple keyword-based syntax highlighting (no parser needed for PoC)
const KEYWORDS = new Set([
  'const', 'let', 'var', 'function', 'return', 'if', 'else', 'for', 'while',
  'class', 'import', 'export', 'from', 'default', 'async', 'await', 'new',
  'try', 'catch', 'throw', 'typeof', 'instanceof', 'true', 'false', 'null',
  'undefined', 'this', 'interface', 'type', 'enum', 'extends', 'implements',
  'def', 'print', 'lambda', 'with', 'as', 'in', 'not', 'and', 'or', 'self',
]);

/**
 * Get the displayable portion of a line using pretext measurement.
 * Replaces the old charW = 6.6 pixel estimate.
 */
function getDisplayLine(
  ctx: CanvasRenderingContext2D,
  line: string,
  maxWidth: number,
): string {
  ctx.font = '400 11px "JetBrains Mono", monospace';
  if (ctx.measureText(line).width <= maxWidth) return line;
  // Use wrapText to get just what fits on one line
  const wrapped = wrapText(ctx, line, maxWidth, 1);
  const first = wrapped[0];
  return first ? first.text.trimEnd() + '…' : '';
}

export const CodeLens = {
  id: 'code',
  name: 'Code',

  matches(dataType: string, _data: unknown): number {
    if (dataType === 'code') return 0.9;
    return 0;
  },

  render(
    ctx: CanvasRenderingContext2D,
    data: unknown,
    bounds: Rect,
    options: LensRenderOptions,
  ) {
    const { x, y, width, height } = bounds;
    const { isDark, selected, source } = options;
    const code = String(data);

    // ── Background (slightly different from card — code editor feel) ──
    ctx.fillStyle = isDark ? '#030d14' : '#f5f2ed';
    roundRect(ctx, x, y, width, height, 4);
    ctx.fill();

    // Left accent (green for code)
    ctx.fillStyle = isDark ? '#b6ffba' : '#2d7a3a';
    ctx.fillRect(x, y, 4, height);

    // Border
    if (selected) {
      ctx.strokeStyle = isDark ? '#7dd8f7' : '#2a6b8a';
      ctx.lineWidth = 2;
      ctx.shadowColor = isDark ? 'rgba(77, 201, 246, 0.4)' : 'rgba(42, 107, 138, 0.15)';
      ctx.shadowBlur = 10;
    } else {
      ctx.strokeStyle = isDark ? 'rgba(77, 201, 246, 0.1)' : 'rgba(42, 74, 90, 0.1)';
      ctx.lineWidth = 1;
      ctx.shadowBlur = 0;
    }
    roundRect(ctx, x, y, width, height, 4);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // LLM border
    if (source === 'llm') {
      ctx.strokeStyle = '#8B5CF6';
      ctx.lineWidth = 1.5;
      roundRect(ctx, x + 1.5, y + 1.5, width - 3, height - 3, 3);
      ctx.stroke();
    }

    const pad = 10;
    const lineH = 15;
    const textX = x + pad + 6;
    let textY = y + pad;
    const maxLines = Math.floor((height - pad * 2 - 14) / lineH);
    const lines = code.split('\n');

    // Line numbers + code
    const gutterW = String(Math.min(lines.length, maxLines)).length * 7 + 8;
    const codeX = textX + gutterW;
    const codeMaxW = width - pad * 2 - gutterW - 8;

    ctx.textBaseline = 'top';

    for (let i = 0; i < Math.min(lines.length, maxLines); i++) {
      // Line number
      ctx.font = '400 10px "JetBrains Mono", monospace';
      ctx.fillStyle = isDark ? 'rgba(77, 201, 246, 0.2)' : 'rgba(42, 74, 90, 0.2)';
      ctx.textAlign = 'right';
      ctx.fillText(String(i + 1), textX + gutterW - 4, textY);
      ctx.textAlign = 'left';

      // Get displayable portion via pretext, then syntax highlight
      const displayLine = getDisplayLine(ctx, lines[i], codeMaxW);
      renderHighlightedLine(ctx, displayLine, codeX, textY, isDark);
      textY += lineH;
    }

    if (lines.length > maxLines) {
      ctx.font = '400 10px "JetBrains Mono", monospace';
      ctx.fillStyle = isDark ? 'rgba(77,201,246,0.4)' : 'rgba(42,107,138,0.4)';
      ctx.fillText(`… ${lines.length - maxLines} more lines`, codeX, textY);
    }

    // Lens badge
    ctx.font = '400 9px "JetBrains Mono", monospace';
    ctx.fillStyle = isDark ? 'rgba(77, 201, 246, 0.4)' : 'rgba(42, 107, 138, 0.65)';
    ctx.textAlign = 'right';
    ctx.fillText('CODE ▾', x + width - 8, y + height - 14);
    ctx.textAlign = 'left';
  },
};

function renderHighlightedLine(
  ctx: CanvasRenderingContext2D,
  line: string,
  x: number,
  y: number,
  isDark: boolean,
) {
  ctx.font = '400 11px "JetBrains Mono", monospace';

  // Simple token-based highlighting
  const tokens = tokenize(line);
  let cx = x;

  for (const token of tokens) {
    ctx.fillStyle = getTokenColor(token.type, isDark);
    ctx.fillText(token.text, cx, y);
    cx += ctx.measureText(token.text).width;
  }
}

interface Token { text: string; type: 'keyword' | 'string' | 'number' | 'comment' | 'punctuation' | 'plain' }

function tokenize(line: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < line.length) {
    // Skip whitespace
    if (line[i] === ' ' || line[i] === '\t') {
      let end = i;
      while (end < line.length && (line[end] === ' ' || line[end] === '\t')) end++;
      tokens.push({ text: line.slice(i, end), type: 'plain' });
      i = end;
      continue;
    }

    // Comments
    if (line[i] === '/' && line[i + 1] === '/') {
      tokens.push({ text: line.slice(i), type: 'comment' });
      break;
    }
    if (line[i] === '#' && (i === 0 || line[i - 1] === ' ')) {
      tokens.push({ text: line.slice(i), type: 'comment' });
      break;
    }

    // Strings
    if (line[i] === '"' || line[i] === "'" || line[i] === '`') {
      const quote = line[i];
      let end = i + 1;
      while (end < line.length && line[end] !== quote) {
        if (line[end] === '\\') end++;
        end++;
      }
      if (end < line.length) end++;
      tokens.push({ text: line.slice(i, end), type: 'string' });
      i = end;
      continue;
    }

    // Numbers
    if (/\d/.test(line[i]) && (i === 0 || /[\s,(\[{:=]/.test(line[i - 1]))) {
      let end = i;
      while (end < line.length && /[\d.xXa-fA-F_]/.test(line[end])) end++;
      tokens.push({ text: line.slice(i, end), type: 'number' });
      i = end;
      continue;
    }

    // Words (keywords or identifiers)
    if (/[a-zA-Z_$]/.test(line[i])) {
      let end = i;
      while (end < line.length && /[a-zA-Z0-9_$]/.test(line[end])) end++;
      const word = line.slice(i, end);
      tokens.push({ text: word, type: KEYWORDS.has(word) ? 'keyword' : 'plain' });
      i = end;
      continue;
    }

    // Punctuation
    tokens.push({ text: line[i], type: 'punctuation' });
    i++;
  }

  return tokens;
}

function getTokenColor(type: Token['type'], isDark: boolean): string {
  if (isDark) {
    switch (type) {
      case 'keyword': return '#7dd8f7';
      case 'string': return '#b6ffba';
      case 'number': return '#d4af37';
      case 'comment': return 'rgba(122, 154, 170, 0.5)';
      case 'punctuation': return 'rgba(77, 201, 246, 0.5)';
      default: return '#8cb8cc';
    }
  } else {
    switch (type) {
      case 'keyword': return '#2a6b8a';
      case 'string': return '#2d7a3a';
      case 'number': return '#9a7b2a';
      case 'comment': return 'rgba(138, 154, 164, 0.6)';
      case 'punctuation': return 'rgba(42, 74, 90, 0.5)';
      default: return '#4a6a7a';
    }
  }
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
