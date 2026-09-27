// Writing SVG by hand — what true size (truesize.ts) and printing (print.ts)
// share (V1-PLAN.md M7).
//
// Two promises rest here. **The same figures give the same bytes**: every
// number is rounded to a fixed number of places before it is written, with an
// ASCII minus and no exponent, so nothing depends on how a float happened to
// print. **Nothing measures a font**: a line's width is estimated from the
// advance of a monospace face — IBM Plex Mono, the brand's one face, and each
// of its fallbacks advance 0.6 of the size — so a layout is a pure function of
// its text.

import type { Bounds } from '../types';
import type { LengthUnit } from './quantity';
import { convertQuantity, quantity } from './quantity';

/** A number with at most `places` decimals, trailing zeros dropped and an ASCII minus: what an SVG attribute wants. */
export function fmt(v: number, places: number): string {
  const f = 10 ** places;
  const r = Math.round(v * f) / f;
  if (r === 0 || !Number.isFinite(r)) return '0';
  const s = r.toFixed(places);
  return places > 0 ? s.replace(/\.?0+$/, '') : s;
}

/** Text or an attribute value, escaped for XML. */
export function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** The brand's face first, then monospace faces that advance the same. */
export const FONT_FAMILY = 'IBM Plex Mono, ui-monospace, Menlo, Consolas, monospace';

/** A monospace face's advance, as a share of its size. */
export const MONO_ADVANCE = 0.6;

export function textWidth(text: string, size: number): number {
  return [...text].length * MONO_ADVANCE * size;
}

/** Words laid into lines no wider than `width` at `size`; a word longer than a line stands on its own. */
export function wrap(text: string, width: number, size: number): string[] {
  const most = Math.max(8, Math.floor(width / (MONO_ADVANCE * size)));
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(' ')) {
    if (!line) line = word;
    else if ([...line].length + 1 + [...word].length <= most) line += ' ' + word;
    else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** How many `to` make one `from`: 12 for feet to inches, 0.1 for millimetres to centimetres. */
export function unitFactor(from: LengthUnit, to: LengthUnit): number {
  return from === to ? 1 : convertQuantity(quantity(1, from), to).quantity.lo;
}

export type UnitSystem = 'imperial' | 'metric';

/** Inches and feet are one system, and the metric units the other: a test square and an overlap follow it. */
export function systemOf(unit: LengthUnit): UnitSystem {
  return unit === 'in' || unit === 'ft' ? 'imperial' : 'metric';
}

export function unionBounds(boxes: readonly Bounds[]): Bounds {
  return {
    minX: Math.min(...boxes.map((b) => b.minX)),
    maxX: Math.max(...boxes.map((b) => b.maxX)),
    minY: Math.min(...boxes.map((b) => b.minY)),
    maxY: Math.max(...boxes.map((b) => b.maxY)),
  };
}

export function expandBounds(b: Bounds, d: number): Bounds {
  return { minX: b.minX - d, maxX: b.maxX + d, minY: b.minY - d, maxY: b.maxY + d };
}
