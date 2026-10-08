// A pen, as a filled outline (V1-SPEC IN1, the fixtures).
//
// Every source of ink on John's machine stores a stroke as the shape the pen's tip swept, filled in the
// stroke's colour, never as the line the pen followed. These fixtures are made the same way, from a line whose
// reading is known: the engine's own shapes (`strokeFor`) given a hand's tremor (`handLike`), then swept by a
// pen of some width into one closed ring. Reading the ring back to a line is what `ink-outline.ts` is for, and
// the line this started from is what it should come back as.
//
// Nothing here is a photograph or a copy of anyone's ink: the generator is seeded, so the same call is the same
// ring on every machine.

import type { Point } from '../../types';

/** How wide the pen is along the stroke: a number, or a function of the share of the way along it (0 to 1). */
export type PenWidth = number | ((t: number) => number);

export interface PenOptions {
  width: PenWidth;
  /** The ends of the stroke: a half circle of the pen's width, or cut straight across. */
  cap?: 'round' | 'flat';
  /** Points on a round cap's half circle. */
  capSteps?: number;
}

/** The farthest a corner's miter may reach, in half widths: past it the join is cut off, as exporters do. */
const MITER_LIMIT = 2;

const clean = (path: readonly Point[]): Point[] => {
  const out: Point[] = [];
  for (const p of path) {
    const last = out[out.length - 1];
    if (!last || Math.hypot(p.x - last.x, p.y - last.y) > 1e-9) out.push({ x: p.x, y: p.y });
  }
  return out;
};

const unit = (dx: number, dy: number): Point => {
  const n = Math.hypot(dx, dy) || 1;
  return { x: dx / n, y: dy / n };
};

/** The width at a share of the way along the stroke. */
export function widthAt(width: PenWidth, t: number): number {
  return typeof width === 'number' ? width : width(Math.max(0, Math.min(1, t)));
}

/**
 * The one closed ring a pen leaves moving along `path`: the left edge going forward, the cap at the far end, the
 * right edge coming back, and the cap at the near end. A corner is offset along its bisector, so a sharp turn
 * is a miter (cut off past `MITER_LIMIT`), and a path that turns back on itself leaves the loops a real
 * exporter's outline has. The ring is not simplified, so where the stroke crosses itself the ring does.
 */
export function penOutline(path: readonly Point[], opts: PenOptions): Point[] {
  const p = clean(path);
  if (p.length < 2) return [];
  const n = p.length;
  const cum = [0];
  for (let i = 1; i < n; i++) cum.push(cum[i - 1] + Math.hypot(p[i].x - p[i - 1].x, p[i].y - p[i - 1].y));
  const total = cum[n - 1] || 1;
  const left: Point[] = [];
  const right: Point[] = [];
  const dirs: Point[] = [];
  for (let i = 0; i < n; i++) {
    const dIn = i > 0 ? unit(p[i].x - p[i - 1].x, p[i].y - p[i - 1].y) : null;
    const dOut = i < n - 1 ? unit(p[i + 1].x - p[i].x, p[i + 1].y - p[i].y) : null;
    const a = dIn ?? dOut!;
    const b = dOut ?? dIn!;
    dirs.push(a);
    const nA = { x: -a.y, y: a.x };
    const nB = { x: -b.y, y: b.x };
    let mx = nA.x + nB.x, my = nA.y + nB.y;
    let ml = Math.hypot(mx, my);
    if (ml < 1e-9) { mx = nA.x; my = nA.y; ml = 1; }
    mx /= ml; my /= ml;
    const cosHalf = Math.max(1 / MITER_LIMIT, mx * nA.x + my * nA.y);
    const half = widthAt(opts.width, cum[i] / total) / 2 / cosHalf;
    left.push({ x: p[i].x + mx * half, y: p[i].y + my * half });
    right.push({ x: p[i].x - mx * half, y: p[i].y - my * half });
  }
  const ring: Point[] = left.slice();
  const round = (opts.cap ?? 'round') === 'round';
  const steps = Math.max(3, opts.capSteps ?? 10);
  if (round) {
    // The far end: from the left edge round the front to the right edge.
    const w = widthAt(opts.width, 1) / 2;
    const d = dirs[n - 1];
    const nl = { x: -d.y, y: d.x };
    for (let k = 1; k < steps; k++) {
      const a = (k / steps) * Math.PI;
      ring.push({ x: p[n - 1].x + nl.x * w * Math.cos(a) + d.x * w * Math.sin(a), y: p[n - 1].y + nl.y * w * Math.cos(a) + d.y * w * Math.sin(a) });
    }
  }
  for (let i = n - 1; i >= 0; i--) ring.push(right[i]);
  if (round) {
    // The near end: from the right edge round the back to the left edge.
    const w = widthAt(opts.width, 0) / 2;
    const d = dirs[0];
    const nl = { x: -d.y, y: d.x };
    for (let k = 1; k < steps; k++) {
      const a = (k / steps) * Math.PI;
      ring.push({ x: p[0].x - nl.x * w * Math.cos(a) - d.x * w * Math.sin(a), y: p[0].y - nl.y * w * Math.cos(a) - d.y * w * Math.sin(a) });
    }
  }
  return ring;
}

/** The same ring started somewhere else and, if asked, walked the other way — an exporter chooses both. */
export function restart(ring: readonly Point[], start: number, reverse = false): Point[] {
  const n = ring.length;
  if (n === 0) return [];
  const out: Point[] = [];
  for (let i = 0; i < n; i++) out.push(ring[(((start + i) % n) + n) % n]);
  return reverse ? out.reverse() : out;
}

/** A pen's width that tapers to its ends and swells in the middle, as a brush's does. */
export function brushWidth(max: number, floor = 0.3): (t: number) => number {
  return (t) => max * (floor + (1 - floor) * Math.pow(Math.sin(Math.PI * Math.min(1, Math.max(0, t))), 0.6));
}

/** A pen whose width shivers a little along the stroke, as pressure does. */
export function pressureWidth(mean: number, seed: number, amount = 0.25): (t: number) => number {
  const s1 = (seed % 97) * 0.13, s2 = (seed % 53) * 0.29;
  return (t) => mean * (1 + amount * (0.6 * Math.sin(t * 11 + s1) + 0.4 * Math.sin(t * 29 + s2)));
}

/** The area a ring encloses (shoelace), positive whichever way it is walked. */
export function ringArea(ring: readonly Point[]): number {
  let a = 0;
  for (let i = 0, n = ring.length; i < n; i++) {
    const p = ring[i], q = ring[(i + 1) % n];
    a += p.x * q.y - q.x * p.y;
  }
  return Math.abs(a) / 2;
}
