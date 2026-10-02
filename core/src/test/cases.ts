// The recognition corpus: every shape drawn every way a hand might draw it.
//
// Lives outside the test file so the benchmark and ad-hoc diagnostics share one
// definition of "the cases" — a corpus that only the test can see is a corpus
// you cannot debug against.

import { analyzeStroke } from '../recognition';
import { handRect, handTriangle, handCircle, handLine, handArrow, handText, handDot, handArc, handBox, type HandOptions } from './strokes';
import type { Point } from '../types';

export interface Case { label: string; expect: string; points: Point[]; }

/** The hand's variants without a start point: drawn fast to slowly, a ruler to a shaky hand, a clean digitizer to a finger. */
function handVariants(): { name: string; opts: HandOptions }[] {
  const out: { name: string; opts: HandOptions }[] = [];
  for (const density of [0.12, 0.35, 1.0, 2.5]) {
    for (const jitter of [0, 2.5, 5]) {
      for (const sensorNoise of [0, 1, 2]) {
        out.push({ name: `dens${density} jit${jitter} noise${sensorNoise}`, opts: { density, jitter, sensorNoise, seed: out.length + 1 } });
      }
    }
  }
  return out;
}

/** The sweeps an arc is drawn at, shallowest to nearly closed. */
export const ARC_SWEEPS = [30, 45, 60, 90, 120, 140, 180, 240, 300] as const;

/**
 * Arcs of every sweep from 30° to 300°, every way a hand draws them, turned
 * four ways. Hand-sized: a chord of 240 up to a half circle — a shallow curve
 * is drawn long, or its bow is no bigger than the wobble of a straight line —
 * and a radius of 100 past it.
 */
export function buildArcCases(): (Case & { sweep: number })[] {
  const cases: (Case & { sweep: number })[] = [];
  for (const sweep of ARC_SWEEPS) {
    const r = sweep <= 180 ? 120 / Math.sin((sweep * Math.PI) / 360) : 100;
    for (const v of handVariants()) {
      for (const turn of [0, 70, 160, 250]) {
        cases.push({ label: `arc ${sweep}° turned ${turn} ${v.name}`, expect: 'arc', sweep, points: handArc(0, 0, r, turn - 90 - sweep / 2, sweep, v.opts) });
      }
    }
  }
  return cases;
}

/** Boxes turned off square — 10°, 20°, 30° and a diamond's 45° — a square and a rectangle, every way a hand draws them. */
export function buildTurnedCases(): (Case & { turn: number })[] {
  const cases: (Case & { turn: number })[] = [];
  for (const startAt of [0, 0.12, 0.5]) {
    for (const v of handVariants()) {
      for (const turn of [10, 20, 30, 45]) {
        const opts = { ...v.opts, startAt, seed: (v.opts.seed ?? 1) * 7 + turn };
        cases.push({ label: `square turned ${turn} start${startAt} ${v.name}`, expect: 'rectangle', turn, points: handBox(0, 0, 170, 170, turn, opts) });
        cases.push({ label: `rect turned ${turn} start${startAt} ${v.name}`, expect: 'rectangle', turn, points: handBox(0, 0, 200, 140, turn, opts) });
      }
    }
  }
  return cases;
}

/** The sweep: every shape drawn every way a hand might draw it. */
export function buildCases(): Case[] {
  const cases: Case[] = [];
  const variants: { name: string; opts: HandOptions }[] = [];

  // Where the stroke starts. 0 = at a vertex, which is the natural way to draw
  // a box and the case the old detector could never get right.
  for (const startAt of [0, 0.12, 0.5]) {
    // Drawn fast (sparse points) through drawn slowly on a 240Hz device.
    for (const density of [0.12, 0.35, 1.0, 2.5]) {
      // A ruler, a steady hand, a shaky one.
      for (const jitter of [0, 2.5, 5]) {
        // A clean digitizer, a pen, a finger. Only this noise gets worse as the
        // device reports faster, which is what makes the density axis matter.
        for (const sensorNoise of [0, 1, 2]) {
          variants.push({
            name: `start${startAt} dens${density} jit${jitter} noise${sensorNoise}`,
            opts: { startAt, density, jitter, sensorNoise, seed: variants.length + 1 },
          });
        }
      }
    }
  }

  for (const v of variants) {
    // Rectangles: square, wide, tall, sharp corners and rounded ones.
    cases.push({ label: `rect 200x140 ${v.name}`, expect: 'rectangle', points: handRect(0, 0, 200, 140, v.opts) });
    cases.push({ label: `rect square ${v.name}`, expect: 'rectangle', points: handRect(0, 0, 170, 170, v.opts) });
    cases.push({ label: `rect wide ${v.name}`, expect: 'rectangle', points: handRect(0, 0, 320, 130, v.opts) });
    cases.push({ label: `rect rounded ${v.name}`, expect: 'rectangle', points: handRect(0, 0, 200, 140, { ...v.opts, round: 0.28 }) });
    cases.push({ label: `rect openish ${v.name}`, expect: 'rectangle', points: handRect(0, 0, 200, 140, { ...v.opts, closureGap: 14 }) });

    // Triangles: upright and lopsided.
    cases.push({ label: `tri upright ${v.name}`, expect: 'triangle',
      points: handTriangle({ x: 0, y: 160 }, { x: 100, y: 0 }, { x: 200, y: 160 }, v.opts) });
    cases.push({ label: `tri lopsided ${v.name}`, expect: 'triangle',
      points: handTriangle({ x: 0, y: 170 }, { x: 160, y: 10 }, { x: 210, y: 170 }, v.opts) });

    // Circles and lines.
    cases.push({ label: `circle r90 ${v.name}`, expect: 'circle', points: handCircle(0, 0, 90, v.opts) });
    cases.push({ label: `circle r45 ${v.name}`, expect: 'circle', points: handCircle(0, 0, 45, v.opts) });
    cases.push({ label: `line ${v.name}`, expect: 'line',
      points: handLine({ x: 0, y: 0 }, { x: 240, y: 40 }, v.opts) });

    // The rest of the shape rung (KEYFRAMES.md Stage 1).
    cases.push({ label: `arrow right ${v.name}`, expect: 'arrow',
      points: handArrow({ x: 0, y: 0 }, { x: 220, y: 20 }, v.opts) });
    cases.push({ label: `arrow down 2-wing ${v.name}`, expect: 'arrow',
      points: handArrow({ x: 0, y: 0 }, { x: 30, y: 200 }, { ...v.opts, wings: 2, headLen: 32 }) });
    cases.push({ label: `arrow head-first ${v.name}`, expect: 'arrow',
      points: handArrow({ x: 200, y: 100 }, { x: 0, y: 0 }, { ...v.opts, headAt: 'start' }) });
    // A word cannot be written in a dozen samples: at the sparsest density a
    // 150px scribble is 18 points, which is not what any hand produces.
    if (v.opts.density! >= 0.35) {
      cases.push({ label: `text word ${v.name}`, expect: 'text',
        points: handText(0, 0, 150, 28, { ...v.opts, humps: 5 }) });
      cases.push({ label: `text long ${v.name}`, expect: 'text',
        points: handText(0, 0, 230, 34, { ...v.opts, humps: 8 }) });
    }
    cases.push({ label: `dot ${v.name}`, expect: 'dot', points: handDot(0, 0, 3, v.opts) });
  }
  return cases;
}

export function score(cases: Case[]) {
  const byShape: Record<string, { n: number; top: number; present: number; confusedWith: Record<string, number> }> = {};
  for (const c of cases) {
    const r = analyzeStroke(c.points).results;
    const top = r[0]?.type;
    const b = (byShape[c.expect] ??= { n: 0, top: 0, present: 0, confusedWith: {} });
    b.n++;
    if (top === c.expect) b.top++;
    else if (top) b.confusedWith[top] = (b.confusedWith[top] ?? 0) + 1;
    if (r.some((x) => x.type === c.expect)) b.present++;
  }
  const total = Object.values(byShape).reduce((a, b) => a + b.n, 0);
  const correct = Object.values(byShape).reduce((a, b) => a + b.top, 0);
  return { byShape, total, correct, accuracy: correct / total };
}

