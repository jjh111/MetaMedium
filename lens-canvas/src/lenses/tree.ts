// TreeLens — expandable JSON/object tree view
// Best for: JSON objects, nested structures, config data
// Phase 1: long string values now wrap via wrapText instead of truncating

import type { Rect } from '../core/types';
import type { LensRenderOptions } from '../core/lens-registry';
import { fitValue, wrapText } from '../core/text-wrap';

export const TreeLens = {
  id: 'tree',
  name: 'Tree',

  matches(dataType: string, data: unknown): number {
    if (dataType === 'json') {
      // Higher confidence for deeper objects
      if (typeof data === 'object' && data !== null) {
        const depth = getDepth(data);
        return depth > 1 ? 0.85 : 0.6;  // flat objects → CardLens wins at 0.7
      }
      // JSON string — try to parse
      if (typeof data === 'string') {
        try {
          const parsed = JSON.parse(data);
          if (typeof parsed === 'object') return 0.8;
        } catch { /* not json */ }
      }
      return 0.7;
    }
    if (dataType === 'array') return 0.7;
    return 0;
  },

  render(
    ctx: CanvasRenderingContext2D,
    data: unknown,
    bounds: Rect,
    options: LensRenderOptions,
  ) {
    const { x, y, width, height } = bounds;
    const { isDark, selected, source, descriptor, abstractionLevel } = options;
    const dataType = options.dataType;

    // Parse if string
    let obj = data;
    if (typeof data === 'string') {
      try { obj = JSON.parse(data); } catch { /* keep string */ }
    }

    // ── Card chrome ──
    drawCardChrome(ctx, x, y, width, height, isDark, selected, source, dataType);

    const pad = 12;
    const textX = x + pad + 6; // +6 for accent bar
    let textY = y + pad;
    const maxY = y + height - pad - 14; // leave room for lens badge
    const contentWidth = width - pad * 2 - 8;

    // ── Header: extract title from data (like CardLens) ──
    ctx.textBaseline = 'top';

    // Bold title — extract name/model/title from data
    let title = '';
    if (typeof obj === 'object' && obj !== null) {
      const d = obj as Record<string, unknown>;
      if (d.name) title = String(d.name);
      else if (d.model) title = String(d.model);
      else if (d.title) title = String(d.title);
    }

    if (title) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(x + 6, y, width - 6, height);
      ctx.clip();
      ctx.font = '600 13px "JetBrains Mono", monospace';
      ctx.fillStyle = isDark ? '#e8f4ff' : '#1a2a3a';
      const titleLines = wrapText(ctx, title, contentWidth, 2);
      for (const line of titleLines) {
        ctx.fillText(line.text, textX, textY);
        textY += 18;
      }
      ctx.restore();
    }

    // Descriptor (muted, below title — wrapped to fit)
    if (abstractionLevel !== 'type' && descriptor) {
      ctx.font = '400 10px "JetBrains Mono", monospace';
      ctx.fillStyle = isDark ? '#8cb8cc' : '#4a6a7a';
      const descLines = wrapText(ctx, descriptor, contentWidth, 2);
      for (const line of descLines) {
        ctx.fillText(line.text, textX, textY);
        textY += 15;
      }
    }

    // ── Separator line ──
    ctx.strokeStyle = isDark ? 'rgba(77,201,246,0.25)' : 'rgba(42,74,90,0.20)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 8, textY);
    ctx.lineTo(x + width - 8, textY);
    ctx.stroke();
    textY += 8;

    // ── Tree content ──
    if (typeof obj === 'object' && obj !== null) {
      renderTree(ctx, obj, textX, textY, width - pad * 2 - 8, maxY, 0, isDark);
    } else {
      ctx.font = '400 11px "JetBrains Mono", monospace';
      ctx.fillStyle = isDark ? '#7a9aaa' : '#8a9aa4';
      ctx.fillText(String(obj), textX, textY);
    }

    // ── Lens badge ──
    ctx.font = '400 9px "JetBrains Mono", monospace';
    ctx.fillStyle = isDark ? 'rgba(77, 201, 246, 0.4)' : 'rgba(42, 107, 138, 0.65)';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'top';
    ctx.fillText('TREE ▾', x + width - 8, y + height - 14);
    ctx.textAlign = 'left';
  },
};

const INDENT = 14;
const LINE_H = 15;

function renderTree(
  ctx: CanvasRenderingContext2D,
  obj: unknown,
  startX: number,
  startY: number,
  maxWidth: number,
  maxY: number,
  depth: number,
  isDark: boolean,
): number {
  let y = startY;
  const x = startX + depth * INDENT;
  const entries = Array.isArray(obj) 
    ? (obj as unknown[]).map((v, i) => [String(i), v] as [string, unknown])
    : Object.entries(obj as Record<string, unknown>);

  const keyColor = isDark ? '#4dc9f6' : '#3a7d9c';
  const strColor = isDark ? '#b6ffba' : '#2d7a3a';
  const numColor = isDark ? '#d4af37' : '#9a7b2a';
  const nullColor = isDark ? '#7a9aaa' : '#8a9aa4';
  const braceColor = isDark ? 'rgba(77, 201, 246, 0.3)' : 'rgba(42, 74, 90, 0.3)';

  for (const [key, val] of entries) {
    if (y > maxY) {
      ctx.font = '400 10px "JetBrains Mono", monospace';
      ctx.fillStyle = isDark ? 'rgba(77,201,246,0.4)' : 'rgba(42,107,138,0.4)';
      ctx.fillText(`… ${entries.length - entries.indexOf([key, val] as [string, unknown])} more`, x, y);
      break;
    }

    ctx.font = '400 11px "JetBrains Mono", monospace';
    ctx.textBaseline = 'top';

    // Key
    ctx.fillStyle = keyColor;
    const keyText = Array.isArray(obj) ? `[${key}]` : key;
    ctx.fillText(keyText, x, y);
    const keyW = ctx.measureText(keyText).width;

    if (val === null || val === undefined) {
      ctx.fillStyle = nullColor;
      ctx.fillText(': null', x + keyW, y);
      y += LINE_H;
    } else if (typeof val === 'object') {
      // Nested object/array
      const bracket = Array.isArray(val) ? `[${(val as unknown[]).length}]` : `{${Object.keys(val).length}}`;
      ctx.fillStyle = braceColor;
      ctx.fillText(': ' + bracket, x + keyW, y);
      y += LINE_H;
      if (depth < 3) { // max render depth
        y = renderTree(ctx, val, startX, y, maxWidth, maxY, depth + 1, isDark);
      }
    } else if (typeof val === 'string') {
      // Phase 1: wrap long string values instead of just truncating
      const raw = `"${val}"`;
      const remainW = maxWidth - (x - startX) - keyW - 16;
      if (ctx.measureText(': ' + raw).width > remainW && raw.length > 30) {
        // Display key with colon, value wrapped below
        ctx.fillStyle = strColor;
        ctx.fillText(':', x + keyW, y);
        y += LINE_H;
        const valLines = wrapText(ctx, raw, maxWidth - depth * INDENT - INDENT, 2);
        for (const vl of valLines) {
          if (y > maxY) break;
          ctx.fillText(vl.text, x + INDENT, y);
          y += LINE_H;
        }
      } else {
        ctx.fillStyle = strColor;
        const display = fitValue(ctx, ': ' + raw, remainW);
        ctx.fillText(display, x + keyW, y);
        y += LINE_H;
      }
    } else if (typeof val === 'number') {
      ctx.fillStyle = numColor;
      ctx.fillText(': ' + String(val), x + keyW, y);
      y += LINE_H;
    } else if (typeof val === 'boolean') {
      ctx.fillStyle = numColor;
      ctx.fillText(': ' + String(val), x + keyW, y);
      y += LINE_H;
    } else {
      ctx.fillStyle = nullColor;
      ctx.fillText(': ' + String(val), x + keyW, y);
      y += LINE_H;
    }
  }

  return y;
}

function drawCardChrome(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number,
  isDark: boolean, selected: boolean, source: string, _dataType: string,
) {
  // Background
  ctx.fillStyle = isDark ? '#051018' : '#f0ece4';
  ctx.beginPath();
  roundRect(ctx, x, y, w, h, 4);
  ctx.fill();

  // Left accent (green for tree/data)
  ctx.fillStyle = isDark ? '#7dd8f7' : '#2a6b8a';
  ctx.fillRect(x, y, 4, h);

  // Border
  if (selected) {
    ctx.strokeStyle = isDark ? '#7dd8f7' : '#2a6b8a';
    ctx.lineWidth = 2;
    ctx.shadowColor = isDark ? 'rgba(77, 201, 246, 0.4)' : 'rgba(42, 107, 138, 0.15)';
    ctx.shadowBlur = 10;
  } else {
    ctx.strokeStyle = isDark ? 'rgba(77, 201, 246, 0.15)' : 'rgba(42, 74, 90, 0.15)';
    ctx.lineWidth = 1;
    ctx.shadowBlur = 0;
  }
  roundRect(ctx, x, y, w, h, 4);
  ctx.stroke();
  ctx.shadowBlur = 0;

  // LLM border
  if (source === 'llm') {
    ctx.strokeStyle = '#8B5CF6';
    ctx.lineWidth = 1.5;
    roundRect(ctx, x + 1.5, y + 1.5, w - 3, h - 3, 3);
    ctx.stroke();
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

function getDepth(obj: unknown, max = 5): number {
  if (max <= 0 || typeof obj !== 'object' || obj === null) return 0;
  const vals = Array.isArray(obj) ? obj : Object.values(obj);
  return 1 + Math.max(0, ...vals.map(v => getDepth(v, max - 1)));
}
