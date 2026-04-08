// CardLens — summary card with title, descriptor, type badge, palette accent
// Best for: any data type at a glance. The default "overview" lens.

import type { Rect } from '../core/types';
import type { LensRenderOptions } from '../core/lens-registry';
import { wrapText, fitValue } from '../core/text-wrap';

// Palette slots for type color coding (dark / light)
const PALETTE: Record<string, { dark: string; light: string; darkBg: string; lightBg: string }> = {
  json:          { dark: '#7dd8f7', light: '#2a6b8a', darkBg: 'rgba(77,201,246,0.12)',  lightBg: 'rgba(42,107,138,0.08)' },
  text:          { dark: '#b8dced', light: '#3a5a6a', darkBg: 'rgba(184,220,237,0.08)', lightBg: 'rgba(58,90,106,0.06)' },
  code:          { dark: '#b6ffba', light: '#2d7a3a', darkBg: 'rgba(182,255,186,0.08)', lightBg: 'rgba(45,122,58,0.06)' },
  'number-array':{ dark: '#d4af37', light: '#9a7b2a', darkBg: 'rgba(212,175,55,0.12)',  lightBg: 'rgba(154,123,42,0.08)' },
  number:        { dark: '#d4af37', light: '#9a7b2a', darkBg: 'rgba(212,175,55,0.12)',  lightBg: 'rgba(154,123,42,0.08)' },
  array:         { dark: '#e8a848', light: '#b8862a', darkBg: 'rgba(232,168,72,0.12)',   lightBg: 'rgba(184,134,42,0.08)' },
  default:       { dark: '#7a9aaa', light: '#8a9aa4', darkBg: 'rgba(122,154,170,0.08)', lightBg: 'rgba(138,154,164,0.06)' },
};

function getPalette(dataType: string, isDark: boolean) {
  const p = PALETTE[dataType] ?? PALETTE.default;
  return { color: isDark ? p.dark : p.light, bg: isDark ? p.darkBg : p.lightBg };
}

export const CardLens = {
  id: 'card',
  name: 'Card',

  matches(dataType: string, _data: unknown): number {
    if (dataType === 'json') return 0.7;
    if (dataType === 'text') return 0.6;
    if (dataType === 'code') return 0.4;
    if (dataType === 'number' || dataType === 'number-array') return 0.5;
    return 0.3;
  },

  render(
    ctx: CanvasRenderingContext2D,
    data: unknown,
    bounds: Rect,
    options: LensRenderOptions,
  ) {
    const { x, y, width, height } = bounds;
    const { isDark, selected, source, descriptor, abstractionLevel } = options;
    const pal = getPalette((options as any).dataType ?? 'default', isDark);

    // ── Card background ──
    ctx.fillStyle = isDark ? '#051018' : '#f0ece4';
    roundRect(ctx, x, y, width, height, 4);
    ctx.fill();

    // ── Left accent bar ──
    ctx.fillStyle = pal.color;
    ctx.fillRect(x, y, 4, height);

    // ── Border ──
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
    roundRect(ctx, x, y, width, height, 4);
    ctx.stroke();
    ctx.shadowBlur = 0;

    // ── LLM source border ──
    if (source === 'llm') {
      ctx.strokeStyle = '#8B5CF6';
      ctx.lineWidth = 1.5;
      roundRect(ctx, x + 1.5, y + 1.5, width - 3, height - 3, 3);
      ctx.stroke();
    }

    const pad = 14;
    const textX = x + pad + 4;
    let textY = y + pad;
    const contentWidth = width - pad * 2 - 8;

    // ── Type badge (top-right) ──
    const dataType = (options as any).dataType ?? 'unknown';
    const badgeText = abstractionLevel === 'type' ? dataType.toUpperCase() : abstractionLevel.toUpperCase().slice(0, 4);
    ctx.font = '500 9px "JetBrains Mono", monospace';
    const badgeW = ctx.measureText(badgeText).width + 10;
    const badgeX = x + width - badgeW - 8;
    const badgeY = y + 8;
    ctx.fillStyle = pal.bg;
    roundRect(ctx, badgeX, badgeY, badgeW, 16, 2);
    ctx.fill();
    ctx.fillStyle = pal.color;
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    ctx.fillText(badgeText, badgeX + 5, badgeY + 3);

    // ── Title line (word-wrapped) ──
    ctx.font = '500 13px "JetBrains Mono", monospace';
    ctx.fillStyle = isDark ? '#e8f4ff' : '#1a2a3a';
    ctx.textBaseline = 'top';

    let title = '';
    if (abstractionLevel === 'meaning' && (options as any).meaning) {
      title = (options as any).meaning;
    } else if (typeof data === 'object' && data !== null) {
      const d = data as Record<string, unknown>;
      if (d.name) title = String(d.name);
      else if (d.model) title = String(d.model);
      else if (d.title) title = String(d.title);
      else {
        const keys = Object.keys(d);
        title = `{${keys.slice(0, 3).join(', ')}${keys.length > 3 ? '...' : ''}}`;
      }
    } else {
      title = String(data).slice(0, 80);
    }

    const titleMaxW = contentWidth - badgeW - 4;
    const titleLines = wrapText(ctx, title, titleMaxW, 2);
    for (const line of titleLines) {
      ctx.fillText(line.text, textX, textY);
      textY += 16;
    }
    textY += 2;

    // ── Descriptor (word-wrapped) ──
    if (descriptor && abstractionLevel !== 'type') {
      ctx.font = '400 11px "JetBrains Mono", monospace';
      ctx.fillStyle = isDark ? '#8cb8cc' : '#4a6a7a';
      const descLines = wrapText(ctx, descriptor, contentWidth, 2);
      for (const line of descLines) {
        ctx.fillText(line.text, textX, textY);
        textY += 14;
      }
      textY += 2;
    }

    // ── Preview content (word-wrapped values) ──
    ctx.font = '400 11px "JetBrains Mono", monospace';
    ctx.fillStyle = isDark ? '#7a9aaa' : '#8a9aa4';
    const maxPreviewY = y + height - pad - 16;

    if (typeof data === 'object' && data !== null) {
      const entries = Object.entries(data as Record<string, unknown>);
      for (const [k, v] of entries) {
        if (textY > maxPreviewY) {
          ctx.fillStyle = isDark ? 'rgba(77,201,246,0.4)' : 'rgba(42,107,138,0.4)';
          ctx.fillText(`+${entries.length - entries.indexOf(entries.find(e => e[0] === k)!)} more`, textX, textY);
          break;
        }

        // Key
        ctx.fillStyle = isDark ? '#4dc9f6' : '#3a7d9c';
        ctx.fillText(k, textX, textY);
        const keyW = ctx.measureText(k + ': ').width;

        // Value — fit to remaining space
        ctx.fillStyle = isDark ? '#7a9aaa' : '#8a9aa4';
        let valStr: string;
        if (typeof v === 'string') {
          valStr = `"${v}"`;
        } else if (typeof v === 'object' && v !== null) {
          valStr = JSON.stringify(v);
        } else {
          valStr = String(v);
        }

        const remainingW = contentWidth - keyW;
        if (ctx.measureText(valStr).width > remainingW && valStr.length > 20) {
          // Multi-line wrap for long values
          ctx.fillText(': ', textX + ctx.measureText(k).width, textY);
          textY += 14;
          const valLines = wrapText(ctx, valStr, contentWidth - 12, 2);
          for (const vl of valLines) {
            if (textY > maxPreviewY) break;
            ctx.fillText(vl.text, textX + 12, textY);
            textY += 14;
          }
        } else {
          const fitted = fitValue(ctx, ': ' + valStr, contentWidth - ctx.measureText(k).width);
          ctx.fillText(fitted, textX + ctx.measureText(k).width, textY);
          textY += 14;
        }
      }
    } else {
      // Text content — proper word wrap
      const text = String(data);
      const maxLines = Math.floor((maxPreviewY - textY) / 14);
      const lines = wrapText(ctx, text, contentWidth, maxLines);
      for (const line of lines) {
        ctx.fillText(line.text, textX, textY);
        textY += 14;
      }
    }

    // ── Lens badge (bottom-right) ──
    ctx.font = '400 9px "JetBrains Mono", monospace';
    ctx.fillStyle = isDark ? 'rgba(77, 201, 246, 0.4)' : 'rgba(42, 107, 138, 0.4)';
    ctx.textAlign = 'right';
    ctx.fillText('CARD ~', x + width - 8, y + height - 8);
    ctx.textAlign = 'left';

    // ── Source badge for LLM ──
    if (source === 'llm') {
      ctx.font = '400 9px "JetBrains Mono", monospace';
      ctx.fillStyle = '#8B5CF6';
      ctx.textAlign = 'left';
      ctx.fillText('* AI', x + pad + 4, y + height - 8);
    }
  },
};

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
