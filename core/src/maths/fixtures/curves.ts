// Curves drawn the way a hand draws them on a plane (MATHS-SPEC §8 Lane C, M21): a function sampled along its x,
// walked at a pen's pace (a point every few pixels of path, not of x), with the low waves of a hand's tremor and a
// little sensor noise — deterministic from a seed, so a bench draws the same ink on every machine.

import type { Point } from '../../types';
import type { PlaneGeometry } from '../plot';
import { planeToCanvas } from '../plot';
import { rng } from '../../test/strokes';

export interface HandCurve {
  /** Wobble in canvas units: 1.5 is a steady hand, 3 a loose one. */
  jitter?: number;
  /** A point every this many canvas units of path. */
  step?: number;
  sensorNoise?: number;
  seed?: number;
  /** Draw from the right end to the left. */
  reverse?: boolean;
}

/** The slow waves a hand's position wanders on, as a function of how far along the stroke it is. */
function tremor(seed: number, amplitude: number): (t: number) => Point {
  const r = rng(seed);
  const waves = [1.7, 3.3, 6.1].map((freq) => ({ freq, px: r() * Math.PI * 2, py: r() * Math.PI * 2, w: 1 / freq }));
  const norm = waves.reduce((a, w) => a + w.w, 0);
  return (t) => {
    let dx = 0, dy = 0;
    for (const w of waves) {
      dx += Math.sin(t * Math.PI * 2 * w.freq + w.px) * w.w;
      dy += Math.cos(t * Math.PI * 2 * w.freq + w.py) * w.w;
    }
    return { x: (dx / norm) * amplitude, y: (dy / norm) * amplitude };
  };
}

/** `fn` over `[x0, x1]` on the plane, drawn by hand: the canvas points of the stroke. */
export function handCurve(plane: PlaneGeometry, fn: (x: number) => number, x0: number, x1: number, o: HandCurve = {}): Point[] {
  const jitter = o.jitter ?? 2;
  const step = o.step ?? 3;
  const seed = o.seed ?? 1;
  const wob = tremor(seed, jitter);
  const noise = rng(seed * 977 + 13);
  // The ideal path, finely, then walked by arc length.
  const fine: Point[] = [];
  const M = 2000;
  for (let i = 0; i <= M; i++) {
    const x = x0 + ((x1 - x0) * i) / M;
    fine.push(planeToCanvas(plane, { x, y: fn(x) }));
  }
  const pts: Point[] = [];
  let acc = 0;
  let next = 0;
  let total = 0;
  for (let i = 1; i < fine.length; i++) total += Math.hypot(fine[i].x - fine[i - 1].x, fine[i].y - fine[i - 1].y);
  pts.push(fine[0]);
  for (let i = 1; i < fine.length; i++) {
    acc += Math.hypot(fine[i].x - fine[i - 1].x, fine[i].y - fine[i - 1].y);
    if (acc >= next + step || i === fine.length - 1) {
      next = acc;
      pts.push(fine[i]);
    }
  }
  const out = pts.map((p, i) => {
    const d = wob(i / Math.max(1, pts.length - 1));
    const s = o.sensorNoise ?? 0.4;
    return { x: p.x + d.x + (noise() - 0.5) * 2 * s, y: p.y + d.y + (noise() - 0.5) * 2 * s };
  });
  void total;
  return o.reverse ? out.reverse() : out;
}

export type CurveKind = 'line' | 'parabola' | 'cubic' | 'sine' | 'exponential' | 'reciprocal';

export interface CurveSpec {
  kind: CurveKind;
  /** What it is, for a failure message. */
  label: string;
  fn: (x: number) => number;
  x0: number;
  x1: number;
  /** The plane it is drawn on (ranges). */
  xr: [number, number];
  yr: [number, number];
  /** The form it should round to, when it should. */
  rounds?: string;
}

/** What the bench draws: each family, three or four ways. */
export const CURVE_SPECS: CurveSpec[] = [
  { kind: 'line', label: 'y = 1.5x + 2', fn: (x) => 1.5 * x + 2, x0: -3, x1: 3, xr: [-4, 4], yr: [-6, 12], rounds: 'y = 1.5x + 2' },
  { kind: 'line', label: 'y = −x + 1', fn: (x) => -x + 1, x0: -4, x1: 4, xr: [-5, 5], yr: [-5, 6], rounds: 'y = −x + 1' },
  { kind: 'line', label: 'y = 0.5x', fn: (x) => 0.5 * x, x0: -5, x1: 5, xr: [-6, 6], yr: [-4, 4], rounds: 'y = 0.5x' },
  { kind: 'line', label: 'y = 3 (level)', fn: () => 3, x0: -4, x1: 4, xr: [-5, 5], yr: [-1, 6], rounds: 'y = 3' },
  { kind: 'parabola', label: 'y = x²', fn: (x) => x * x, x0: -3, x1: 3, xr: [-4, 4], yr: [-1, 10], rounds: 'y = x²' },
  { kind: 'parabola', label: 'y = −0.5x² + 4', fn: (x) => -0.5 * x * x + 4, x0: -4, x1: 4, xr: [-5, 5], yr: [-6, 6], rounds: 'y = −0.5x² + 4' },
  { kind: 'parabola', label: 'y = (x − 1)²', fn: (x) => (x - 1) * (x - 1), x0: -2, x1: 4, xr: [-3, 5], yr: [-1, 10], rounds: 'y = x² − 2x + 1' },
  { kind: 'parabola', label: 'y = 2x²', fn: (x) => 2 * x * x, x0: -2, x1: 2, xr: [-3, 3], yr: [-1, 9], rounds: 'y = 2x²' },
  { kind: 'cubic', label: 'y = x³ − 3x', fn: (x) => x * x * x - 3 * x, x0: -2.2, x1: 2.2, xr: [-3, 3], yr: [-5, 5], rounds: 'y = x³ − 3x' },
  { kind: 'cubic', label: 'y = x³', fn: (x) => x * x * x, x0: -2, x1: 2, xr: [-3, 3], yr: [-9, 9], rounds: 'y = x³' },
  { kind: 'cubic', label: 'y = −0.5x³ + 2x', fn: (x) => -0.5 * x * x * x + 2 * x, x0: -2.5, x1: 2.5, xr: [-3, 3], yr: [-6, 6], rounds: 'y = −0.5x³ + 2x' },
  { kind: 'sine', label: 'y = sin x', fn: (x) => Math.sin(x), x0: -6.3, x1: 6.3, xr: [-7, 7], yr: [-2, 2], rounds: 'y = sin(x)' },
  { kind: 'sine', label: 'y = 2 sin(0.5x)', fn: (x) => 2 * Math.sin(0.5 * x), x0: -10, x1: 10, xr: [-11, 11], yr: [-3, 3], rounds: 'y = 2sin(0.5x)' },
  { kind: 'sine', label: 'y = cos x', fn: (x) => Math.cos(x), x0: -6.3, x1: 6.3, xr: [-7, 7], yr: [-2, 2], rounds: 'y = cos(x)' },
  { kind: 'sine', label: 'y = sin(2x) + 1', fn: (x) => Math.sin(2 * x) + 1, x0: -3, x1: 3, xr: [-4, 4], yr: [-1, 3], rounds: 'y = sin(2x) + 1' },
  { kind: 'exponential', label: 'y = eˣ', fn: (x) => Math.exp(x), x0: -2, x1: 2, xr: [-3, 3], yr: [-1, 8], rounds: 'y = e^x' },
  { kind: 'exponential', label: 'y = 2^x', fn: (x) => 2 ** x, x0: -1, x1: 4, xr: [-2, 5], yr: [-2, 18], rounds: 'y = 2^x' },
  { kind: 'exponential', label: 'y = e^(−x)', fn: (x) => Math.exp(-x), x0: -2, x1: 2, xr: [-3, 3], yr: [-1, 8], rounds: 'y = e^(−x)' },
  { kind: 'reciprocal', label: 'y = 1/x', fn: (x) => 1 / x, x0: 0.4, x1: 4, xr: [-4, 5], yr: [-4, 4], rounds: 'y = 1/x' },
  { kind: 'reciprocal', label: 'y = 2/x (left)', fn: (x) => 2 / x, x0: -4, x1: -0.6, xr: [-5, 4], yr: [-5, 2], rounds: 'y = 2/x' },
  { kind: 'reciprocal', label: 'y = −1/x', fn: (x) => -1 / x, x0: 0.4, x1: 4, xr: [-4, 5], yr: [-4, 4], rounds: 'y = −1/x' },
];
