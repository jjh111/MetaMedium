// CardLens — summary card with title, descriptor, type badge, palette accent
// Best for: any data type at a glance. The default "overview" lens.
// Phase 1 redesign: clear visual zones (header / separator / content / footer)

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

// Layout constants — clear visual zones
const HEADER_PAD = 12;
const LINE_TITLE = 18;    // title line height
const LINE_DESC = 15;     // descriptor line height
const LINE_BODY = 14;     // body/content line height
const FOOTER_H = 20;      // lens badge zone

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
    const dataType = options.dataType ?? 'default';
    const pal = getPalette(dataType, isDark);

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

    const textX = x + HEADER_PAD + 4; // after accent bar
    let textY = y + HEADER_PAD;
    const contentWidth = width - HEADER_PAD * 2 - 8;

    // ── Title (full width, bold 600, word-wrapped to 2 lines) ──
    ctx.save();
    ctx.beginPath();
    ctx.rect(x + 6, y, width - 6, height);
    ctx.clip();

    ctx.font = '600 13px "JetBrains Mono", monospace';
    ctx.fillStyle = isDark ? '#e8f4ff' : '#1a2a3a';
    ctx.textBaseline = 'top';

    let title = '';
    if (abstractionLevel === 'meaning' && options.meaning) {
      title = String(options.meaning);
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

    // Title gets full width — no badge competition
    const titleLines = wrapText(ctx, title, contentWidth, 2);
    for (const line of titleLines) {
      ctx.fillText(line.text, textX, textY);
      textY += LINE_TITLE;
    }

    // ── Descriptor (muted, smaller, below title) ──
    if (descriptor && abstractionLevel !== 'type') {
      ctx.font = '400 10px "JetBrains Mono", monospace';
      ctx.fillStyle = isDark ? '#8cb8cc' : '#4a6a7a';
      const descLines = wrapText(ctx, descriptor, contentWidth, 3);
      for (const line of descLines) {
        ctx.fillText(line.text, textX, textY);
        textY += LINE_DESC;
      }
    }
    textY += 4;

    ctx.restore();

    // ── Separator line between header and content ──
    ctx.strokeStyle = isDark ? 'rgba(77,201,246,0.12)' : 'rgba(42,74,90,0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x + 8, textY);
    ctx.lineTo(x + width - 8, textY);
    ctx.stroke();
    textY += 8;

    // ── Content zone (clipped) ──
    const contentBottom = y + height - FOOTER_H;
    ctx.save();
    ctx.beginPath();
    ctx.rect(x + 6, textY, width - 10, contentBottom - textY);
    ctx.clip();

    ctx.font = '400 11px "JetBrains Mono", monospace';
    ctx.fillStyle = isDark ? '#7a9aaa' : '#8a9aa4';
    ctx.textBaseline = 'top';

    if (typeof data === 'object' && data !== null) {
      const entries = Object.entries(data as Record<string, unknown>);
      for (let idx = 0; idx < entries.length; idx++) {
        const [k, v] = entries[idx];
        if (textY > contentBottom - LINE_BODY) {
          ctx.fillStyle = isDark ? 'rgba(77,201,246,0.4)' : 'rgba(42,107,138,0.4)';
          ctx.fillText(`+${entries.length - idx} more`, textX, textY);
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
          textY += LINE_BODY;
          const valLines = wrapText(ctx, valStr, contentWidth - 12, 2);
          for (const vl of valLines) {
            if (textY > contentBottom - LINE_BODY) break;
            ctx.fillText(vl.text, textX + 12, textY);
            textY += LINE_BODY;
          }
        } else {
          const fitted = fitValue(ctx, ': ' + valStr, contentWidth - ctx.measureText(k).width);
          ctx.fillText(fitted, textX + ctx.measureText(k).width, textY);
          textY += LINE_BODY;
        }
      }
    } else {
      // Text content — proper word wrap
      const text = String(data);
      const maxLines = Math.floor((contentBottom - textY) / LINE_BODY);
      const lines = wrapText(ctx, text, contentWidth, maxLines);
      for (const line of lines) {
        ctx.fillText(line.text, textX, textY);
        textY += LINE_BODY;
      }
    }

    ctx.restore();

    // ── Footer: Type badge (bottom-right) + Lens badge ──
    const badgeText = abstractionLevel === 'type'
      ? dataType.toUpperCase()
      : abstractionLevel.toUpperCase().slice(0, 4);
    ctx.font = '500 9px "JetBrains Mono", monospace';
    const badgeW = ctx.measureText(badgeText).width + 10;
    const badgeX = x + width - badgeW - 8;
    const badgeY = y + height - FOOTER_H + 2;
    ctx.fillStyle = pal.bg;
    roundRect(ctx, badgeX, badgeY, badgeW, 16, 2);
    ctx.fill();
    ctx.fillStyle = pal.color;
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    ctx.fillText(badgeText, badgeX + 5, badgeY + 3);

    // Lens badge
    ctx.font = '400 9px "JetBrains Mono", monospace';
    ctx.fillStyle = isDark ? 'rgba(77, 201, 246, 0.4)' : 'rgba(42, 107, 138, 0.4)';
    ctx.textAlign = 'left';
    ctx.fillText('CARD ∿', x + HEADER_PAD + 4, y + height - FOOTER_H + 5);
    ctx.textAlign = 'left';

    // ── Source badge for LLM ──
    if (source === 'llm') {
      ctx.font = '400 9px "JetBrains Mono", monospace';
      ctx.fillStyle = '#8B5CF6';
      ctx.textAlign = 'left';
      ctx.fillText('✦ AI', x + HEADER_PAD + 4 + ctx.measureText('CARD ∿  ').width, y + height - FOOTER_H + 5);
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
