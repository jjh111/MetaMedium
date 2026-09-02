// Marks a participant makes WITHOUT a hand.
//
// A model takes part in the conversation benchmark by contributing marks, not
// only words (ARCHITECTURE-v7 §1). It cannot hold a pen, so it says what it
// would draw in the vocabulary the canvas already reads — the shape rung's
// closed set — and this module turns that into strokes the engine takes in
// through `addStroke` exactly as it takes a human's. Nothing downstream knows
// the difference: the same fingerprint, the same readings, the same offers,
// and the mark is attributed to the participant that made it.
//
// The vocabulary is deliberately the shape rung and nothing more. A model that
// could only draw what the canvas can read is a model whose every mark is
// legible to the human on the same terms as their own.

import type { Point } from '../types';

export type DrawnShape =
  | { shape: 'rectangle' | 'circle' | 'triangle'; x: number; y: number; w: number; h: number; why?: string }
  | { shape: 'line' | 'arrow'; from: Point; to: Point; why?: string };

export const MAX_DRAWN = 8;

function seg(a: Point, b: Point, n: number, out: Point[], skipFirst: boolean) {
  for (let i = skipFirst ? 1 : 0; i < n; i++) {
    const t = i / (n - 1);
    out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
  }
}

/** A clean stroke for one drawn shape, or null when it has no size. */
export function strokeFor(s: DrawnShape): Point[] | null {
  if (s.shape === 'line' || s.shape === 'arrow') {
    const len = Math.hypot(s.to.x - s.from.x, s.to.y - s.from.y);
    if (!(len > 1)) return null;
    const out: Point[] = [];
    seg(s.from, s.to, Math.max(12, Math.round(len / 6)), out, false);
    if (s.shape === 'arrow') {
      // Shaft, then one wing back from the tip, back to the tip, then the other:
      // the barb the arrow detector measures, drawn the way a hand draws it.
      const ux = (s.to.x - s.from.x) / len, uy = (s.to.y - s.from.y) / len;
      // A fifth of the shaft at most: the arrow detector reads the head as a
      // window at the end of the stroke, and two wings drawn back and forth
      // are three barb-lengths of it.
      const barb = Math.max(8, Math.min(len * 0.2, 40));
      const wing = (side: number): Point => ({
        x: s.to.x - barb * (ux * Math.cos(0.5) - side * uy * Math.sin(0.5)),
        y: s.to.y - barb * (uy * Math.cos(0.5) + side * ux * Math.sin(0.5)),
      });
      seg(s.to, wing(1), 8, out, true);
      seg(wing(1), s.to, 8, out, true);
      seg(s.to, wing(-1), 8, out, true);
    }
    return out;
  }
  const r = s as Extract<DrawnShape, { x: number }>;
  const { x, y, w, h } = r;
  if (!(w > 1) || !(h > 1)) return null;
  if (r.shape === 'circle') {
    const out: Point[] = [];
    const n = 96;
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI * 2;
      out.push({ x: x + w / 2 + (w / 2) * Math.cos(a), y: y + h / 2 + (h / 2) * Math.sin(a) });
    }
    return out;
  }
  const verts: Point[] =
    r.shape === 'triangle'
      ? [{ x: x + w / 2, y }, { x: x + w, y: y + h }, { x, y: y + h }]
      : [{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }];
  const out: Point[] = [];
  const per = Math.max(10, Math.round(Math.max(w, h) / 8));
  for (let i = 0; i < verts.length; i++) seg(verts[i], verts[(i + 1) % verts.length], per, out, i > 0);
  return out;
}

/**
 * Parse a model's list of shapes. Tolerant of fences and prose around the
 * array, of `width`/`height` for `w`/`h`, of `x1,y1,x2,y2` for `from`/`to`;
 * strict about the vocabulary — a shape the canvas cannot read is dropped, and
 * the list is capped so a runaway reply cannot paper the board.
 */
export function parseShapes(text: string): DrawnShape[] {
  if (!text) return [];
  const unfenced = text.replace(/```(?:json)?/gi, '').trim();
  const start = unfenced.indexOf('[');
  const end = unfenced.lastIndexOf(']');
  if (start === -1 || end === -1 || end < start) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(unfenced.slice(start, end + 1));
  } catch {
    return [];
  }
  if (!Array.isArray(parsed)) return [];
  const num = (v: unknown): number | null => (typeof v === 'number' && Number.isFinite(v) ? v : typeof v === 'string' && v.trim() && Number.isFinite(Number(v)) ? Number(v) : null);
  const pt = (v: unknown): Point | null => {
    if (!v || typeof v !== 'object') return null;
    const r = v as Record<string, unknown>;
    const x = num(r.x), y = num(r.y);
    return x === null || y === null ? null : { x, y };
  };
  const out: DrawnShape[] = [];
  for (const item of parsed) {
    if (out.length >= MAX_DRAWN) break;
    if (!item || typeof item !== 'object') continue;
    const r = item as Record<string, unknown>;
    const kind = String(r.shape ?? r.type ?? r.kind ?? '').toLowerCase().trim();
    const why = typeof r.why === 'string' ? r.why : typeof r.reasoning === 'string' ? r.reasoning : undefined;
    if (kind === 'line' || kind === 'arrow') {
      const from = pt(r.from) ?? (num(r.x1) !== null && num(r.y1) !== null ? { x: num(r.x1)!, y: num(r.y1)! } : null);
      const to = pt(r.to) ?? (num(r.x2) !== null && num(r.y2) !== null ? { x: num(r.x2)!, y: num(r.y2)! } : null);
      if (from && to) out.push({ shape: kind, from, to, why });
      continue;
    }
    if (kind === 'rectangle' || kind === 'rect' || kind === 'box' || kind === 'circle' || kind === 'ellipse' || kind === 'triangle') {
      const x = num(r.x), y = num(r.y), w = num(r.w ?? r.width), h = num(r.h ?? r.height);
      if (x === null || y === null || w === null || h === null) continue;
      const shape = kind === 'rect' || kind === 'box' ? 'rectangle' : kind === 'ellipse' ? 'circle' : kind;
      out.push({ shape: shape as 'rectangle' | 'circle' | 'triangle', x, y, w, h, why });
    }
  }
  return out;
}
