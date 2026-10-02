// A pack's drawings, drawn as a hand would (V1-PLAN §2.3, B3).
//
// A definition in a pack is some drawings of the thing. The drawings are the
// shape rung's own vocabulary — the pen a model holds (`strokeFor`,
// session/synthesize.ts) — and a clean stroke is not what a hand leaves, so
// each is given a hand's tremor before the engine reads it: SEEDED, so the
// same drawing is the same ink on every machine and in every replay, and the
// signature it reads as is the same everywhere (V1-PLAN B3: replay
// deterministic, same on every machine).
//
// The tremor is the recognition corpus's (src/test/strokes.ts): a function of
// where along the stroke the pen is, a few slow waves, never white noise per
// point — which would add path length with every sample and read a slow
// straight line as an arc. Its size is a hand's, in pixels at zoom 1, and
// never more than a small share of the mark's own size, so a small mark keeps
// its shape. Every point is rounded to a hundredth of a unit, so what is read
// is plain numbers, not the last bits of an engine's sine.

import type { Point } from '../types';
import { strokeFor, type DrawnShape } from '../session/synthesize';
import type { PackDefinition } from './pack';

/** How far a hand wanders off a clean stroke, in canvas units at zoom 1 (the corpus's steady hand). */
export const HAND_TREMOR = 2;
/** …and never more than this share of the mark's own size. */
export const TREMOR_OF_SIZE = 0.02;

/** mulberry32: the corpus's tiny PRNG, the same numbers everywhere. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A seed from words (FNV-1a): a drawing is seeded by what it is — its pack, its definition, its place — never by when it is read. */
export function seedOf(text: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

const hundredth = (v: number) => Math.round(v * 100) / 100;

/**
 * A clean stroke given a hand's tremor, deterministically: three slow waves
 * along the stroke with phases from the seed, as the corpus draws a hand.
 */
export function handLike(points: readonly Point[], seed: number, amplitude = HAND_TREMOR): Point[] {
  if (points.length < 2) return points.map((p) => ({ x: hundredth(p.x), y: hundredth(p.y) }));
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  const a = Math.min(amplitude, TREMOR_OF_SIZE * Math.max(maxX - minX, maxY - minY));
  const r = mulberry32(seed);
  const waves = [1.7, 3.3, 6.1].map((freq) => ({ freq, px: r() * Math.PI * 2, py: r() * Math.PI * 2, weight: 1 / freq }));
  const norm = waves.reduce((s, w) => s + w.weight, 0);
  const last = points.length - 1;
  return points.map((p, i) => {
    const t = i / last;
    let dx = 0, dy = 0;
    for (const w of waves) {
      dx += Math.sin(t * Math.PI * 2 * w.freq + w.px) * w.weight;
      dy += Math.cos(t * Math.PI * 2 * w.freq + w.py) * w.weight;
    }
    return { x: hundredth(p.x + (dx / norm) * a), y: hundredth(p.y + (dy / norm) * a) };
  });
}

/** A definition's drawings, in order: its shape samples first, then its recorded ones. */
export function drawingsOf(def: PackDefinition): { kind: 'sample' | 'recorded'; index: number }[] {
  return [
    ...(def.samples ?? []).map((_, index) => ({ kind: 'sample' as const, index })),
    ...(def.strokes ?? []).map((_, index) => ({ kind: 'recorded' as const, index })),
  ];
}

/** Where a drawing is put: scaled by `k` about the origin, then moved by (dx, dy). */
export interface Placement {
  k: number;
  dx: number;
  dy: number;
}
const AS_DRAWN: Placement = { k: 1, dx: 0, dy: 0 };

function placeShape(s: DrawnShape, p: Placement): DrawnShape {
  const at = (q: Point): Point => ({ x: q.x * p.k + p.dx, y: q.y * p.k + p.dy });
  if (s.shape === 'line' || s.shape === 'arrow') return { shape: s.shape, from: at(s.from), to: at(s.to) };
  const b = s as Extract<DrawnShape, { x: number }>;
  const o = at({ x: b.x, y: b.y });
  return { shape: b.shape, x: o.x, y: o.y, w: b.w * p.k, h: b.h * p.k };
}

/**
 * One drawing of a definition as the strokes a hand would leave: each shape
 * of a sample through `strokeFor`, given a tremor seeded by `seed` and the
 * mark's place; a recorded drawing as it was recorded. `seed` is the caller's
 * — the signature is read from one seed per drawing, a bench redraws with
 * others, somewhere else and at another size (`place`).
 */
export function drawingStrokes(
  def: PackDefinition,
  drawing: { kind: 'sample' | 'recorded'; index: number },
  seed: number,
  place: Placement = AS_DRAWN
): Point[][] {
  if (drawing.kind === 'recorded') {
    return (def.strokes?.[drawing.index] ?? []).map((s) => s.map((q) => ({ x: q.x * place.k + place.dx, y: q.y * place.k + place.dy })));
  }
  const out: Point[][] = [];
  (def.samples?.[drawing.index] ?? []).forEach((shape, k) => {
    const clean = strokeFor(placeShape(shape, place));
    if (clean) out.push(handLike(clean, (seed ^ Math.imul(k + 1, 0x9e3779b1)) >>> 0));
  });
  return out;
}
