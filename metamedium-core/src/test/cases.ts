// The recognition corpus: every shape drawn every way a hand might draw it.
//
// Lives outside the test file so the benchmark and ad-hoc diagnostics share one
// definition of "the cases" — a corpus that only the test can see is a corpus
// you cannot debug against.

import { analyzeStroke } from '../recognition';
import { handRect, handTriangle, handCircle, handLine, type HandOptions } from './strokes';
import type { Point } from '../types';

export interface Case { label: string; expect: string; points: Point[]; }

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

