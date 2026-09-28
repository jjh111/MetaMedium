// Flowchart symbols drawn the way a hand draws them (V1-PLAN §9 D1).
//
// The generators in src/test/strokes.ts draw the shape rung's shapes. A
// notation needs a few more — a stadium, an oval, a diamond in one stroke and
// in two, a parallelogram, a box in two L-shaped strokes — and needs them
// hand-drawn: wobble that depends on where along the stroke the pen is (not
// white noise per sample), rounded corners, a start anywhere along the
// outline and a small gap where it closes. Deterministic: same seed, same ink.

import type { Point } from '../../types';
import { rng, handLine, handPolygon } from '../../test/strokes';

export interface InkOptions {
  /** Wobble in px. 0 is a ruler, 2–4 a hand. */
  jitter?: number;
  /** Points per px of outline. */
  density?: number;
  /** Where along the outline the pen starts, 0–1. */
  startAt?: number;
  /** How far short of closing it stops, px. */
  gap?: number;
  seed?: number;
}

/** Low-frequency wobble as a function of how far along the stroke — a hand's tremor, not a sensor's noise. */
function tremor(seed: number, amplitude: number): (t: number) => Point {
  const r = rng(seed * 7919 + 17);
  const waves = [1.3, 2.9, 5.3].map((freq) => ({ freq, px: r() * Math.PI * 2, py: r() * Math.PI * 2, w: 1 / freq }));
  const norm = waves.reduce((a, w) => a + w.w, 0);
  return (t: number) => {
    let dx = 0, dy = 0;
    for (const w of waves) {
      dx += Math.sin(t * Math.PI * 2 * w.freq + w.px) * w.w;
      dy += Math.cos(t * Math.PI * 2 * w.freq + w.py) * w.w;
    }
    return { x: (dx / norm) * amplitude, y: (dy / norm) * amplitude };
  };
}

/** Walk an ideal closed outline as a hand does: resampled evenly, started anywhere, wobbled, a little short of closing. */
export function inkAround(outline: readonly Point[], o: InkOptions = {}): Point[] {
  const jitter = o.jitter ?? 2.5, density = o.density ?? 0.4, seed = o.seed ?? 1, gap = o.gap ?? 4;
  const ring = [...outline, outline[0]];
  const cum = [0];
  for (let i = 1; i < ring.length; i++) cum.push(cum[i - 1] + Math.hypot(ring[i].x - ring[i - 1].x, ring[i].y - ring[i - 1].y));
  const L = cum[cum.length - 1];
  const n = Math.max(24, Math.round(L * density));
  const at = (d: number): Point => {
    d = ((d % L) + L) % L;
    let i = 1;
    while (i < cum.length - 1 && cum[i] < d) i++;
    const a = ring[i - 1], b = ring[i];
    const u = cum[i] > cum[i - 1] ? (d - cum[i - 1]) / (cum[i] - cum[i - 1]) : 0;
    return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u };
  };
  const start = (o.startAt ?? 0) * L;
  const span = L - gap;
  const wob = tremor(seed, jitter);
  const out: Point[] = [];
  for (let k = 0; k <= n; k++) {
    const t = k / n;
    const p = at(start + t * span);
    const d = wob(t);
    out.push({ x: p.x + d.x, y: p.y + d.y });
  }
  return out;
}

/** A stadium — a box with round ends — `w` × `h`, centred on (cx, cy), turned `turn` degrees. */
export function stadiumOutline(cx: number, cy: number, w: number, h: number, turn = 0): Point[] {
  const r = Math.min(w, h) / 2, half = Math.max(w, h) / 2 - r;
  const pts: Point[] = [];
  const cap = (x0: number, a0: number) => {
    for (let i = 0; i <= 24; i++) {
      const a = a0 + (i / 24) * Math.PI;
      pts.push({ x: x0 + r * Math.cos(a), y: r * Math.sin(a) });
    }
  };
  cap(half, -Math.PI / 2); // the right end, top to bottom
  cap(-half, Math.PI / 2); // the left end, bottom to top
  const vertical = h > w;
  const t = (turn * Math.PI) / 180 + (vertical ? Math.PI / 2 : 0);
  const c = Math.cos(t), s = Math.sin(t);
  return pts.map((p) => ({ x: cx + p.x * c - p.y * s, y: cy + p.x * s + p.y * c }));
}

/** An oval `w` × `h` centred on (cx, cy). */
export function ovalOutline(cx: number, cy: number, w: number, h: number): Point[] {
  return Array.from({ length: 48 }, (_, i) => {
    const a = (i / 48) * Math.PI * 2;
    return { x: cx + (w / 2) * Math.cos(a), y: cy + (h / 2) * Math.sin(a) };
  });
}

/** A diamond's corners — top, right, bottom, left — `w` × `h` centred on (cx, cy). */
export function diamondCorners(cx: number, cy: number, w: number, h: number): Point[] {
  return [
    { x: cx, y: cy - h / 2 },
    { x: cx + w / 2, y: cy },
    { x: cx, y: cy + h / 2 },
    { x: cx - w / 2, y: cy },
  ];
}

/** A box's corners — top-left, top-right, bottom-right, bottom-left — `w` × `h` centred on (cx, cy), turned `turn` degrees. */
export function boxCorners(cx: number, cy: number, w: number, h: number, turn = 0): Point[] {
  const t = (turn * Math.PI) / 180, c = Math.cos(t), s = Math.sin(t);
  return [
    { x: -w / 2, y: -h / 2 },
    { x: w / 2, y: -h / 2 },
    { x: w / 2, y: h / 2 },
    { x: -w / 2, y: h / 2 },
  ].map((p) => ({ x: cx + p.x * c - p.y * s, y: cy + p.x * s + p.y * c }));
}

/** A parallelogram's corners, leaning right by `lean` px over its height: top-left, top-right, bottom-right, bottom-left. */
export function parallelogramCorners(cx: number, cy: number, w: number, h: number, lean: number): Point[] {
  return [
    { x: cx - w / 2 + lean / 2, y: cy - h / 2 },
    { x: cx + w / 2 + lean / 2, y: cy - h / 2 },
    { x: cx + w / 2 - lean / 2, y: cy + h / 2 },
    { x: cx - w / 2 - lean / 2, y: cy + h / 2 },
  ];
}

/** A closed polygon in one stroke, the hand's way: rounded corners, wobble, started anywhere. */
export function handShape(corners: Point[], o: InkOptions & { round?: number } = {}): Point[] {
  return handPolygon(corners, { jitter: o.jitter ?? 2.5, round: o.round ?? 0.12, startAt: o.startAt ?? 0.1, seed: o.seed ?? 1, density: o.density ?? 0.35 });
}

/** A ruled stroke that bends: from `a` to the bend `b` and on to `c`, each run a hand's line. */
export function bent(a: Point, b: Point, c: Point, o: InkOptions = {}): Point[] {
  const opts = { jitter: o.jitter ?? 1.5, seed: o.seed ?? 1, density: o.density ?? 0.35 };
  return [...handLine(a, b, opts), ...handLine(b, c, { ...opts, seed: (o.seed ?? 1) + 101 }).slice(1)];
}

/** A diamond in two strokes: the top half (left, top, right), then the bottom half (left, bottom, right). */
export function diamondTopBottom(corners: Point[], o: InkOptions = {}): [Point[], Point[]] {
  const [T, R, B, L] = corners;
  return [bent(L, T, R, o), bent(L, B, R, { ...o, seed: (o.seed ?? 1) + 7 })];
}

/** A diamond in two strokes: the left half (top, left, bottom), then the right half (top, right, bottom). */
export function diamondLeftRight(corners: Point[], o: InkOptions = {}): [Point[], Point[]] {
  const [T, R, B, L] = corners;
  return [bent(T, L, B, o), bent(T, R, B, { ...o, seed: (o.seed ?? 1) + 7 })];
}

/** A box ruled in four strokes, one per side, each run a little past or short of the corner as a hand does. */
export function boxInFour(corners: Point[], o: InkOptions = {}): Point[][] {
  const r = rng((o.seed ?? 1) * 31 + 3);
  const off = () => (r() - 0.5) * 6;
  return corners.map((p, i) => {
    const q = corners[(i + 1) % 4];
    return handLine({ x: p.x + off(), y: p.y + off() }, { x: q.x + off(), y: q.y + off() }, { jitter: o.jitter ?? 1.5, seed: (o.seed ?? 1) + i * 13, density: o.density ?? 0.35 });
  });
}
