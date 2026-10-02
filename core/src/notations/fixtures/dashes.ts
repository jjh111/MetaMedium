// Dashed lines drawn by hand, and what must never read as one (V1-PLAN §9
// D5; notations/dashes.ts).
//
// The dashed lines: dashes of a hand's length and spacing, at any heading,
// each its own stroke a few hundred milliseconds after the last, as a hand
// dashes a line — at zoom 1 and in the hand's space at other zooms.
//
// What must not: printed capitals. A printed letter is straight strokes, and
// a word of them puts straight strokes of a dash's length in a row — the top
// bars of F, E and E stand at the cap height a letter-space apart. What tells
// them apart is that a letter's strokes join (a stem meets a bar at its end),
// so every word here is made of letters whose bars and stems meet: the
// hardest writing for the dash reading, and the commonest on a whiteboard.
// The letters are the bench board's (bench/board.mjs, John's size: a cap
// height of 30–40 px), each stroke a hand's line, a few hundred milliseconds
// apart.

import type { Point } from '../../types';
import type { Session } from '../../session/session';
import { handLine, handText, rng } from '../../test/strokes';
import { dashesAlong, handPath } from './sequence';

/** Draw a dashed line from `a` to `b`, a dash every few hundred ms, at `scale` (world units per screen pixel). Returns the dashes' ids. */
export function drawDashed(s: Session, a: Point, b: Point, o: { dash?: number; gap?: number; seed?: number; jitter?: number; scale?: number; t0?: number; pace?: number } = {}): { ids: string[]; at: number } {
  const scale = o.scale ?? 1;
  let t = o.t0 ?? 1000;
  const r = rng((o.seed ?? 1) * 17 + 5);
  const ids = dashesAlong(a, b, { dash: (o.dash ?? 13) * scale, gap: (o.gap ?? 9) * scale, seed: o.seed, jitter: (o.jitter ?? 0.8) * scale }).map((pts, i) =>
    s.addStroke(pts, (t += i ? (o.pace ?? 180) + Math.round(r() * 80) : 4000), undefined, scale)
  );
  return { ids, at: t };
}

// ===== Printed capitals =====

/** Each letter's strokes in a unit box (u across, v down) and its width over its height — the bench board's table, for the letters built from straight strokes. */
const LETTERS: Record<string, { w: number; s: number[][][] }> = {
  A: { w: 0.7, s: [[[0, 1], [0.5, 0], [1, 1]], [[0.22, 0.62], [0.78, 0.62]]] },
  E: { w: 0.6, s: [[[0, 0], [0, 1]], [[0, 0], [1, 0]], [[0, 0.5], [0.8, 0.5]], [[0, 1], [1, 1]]] },
  F: { w: 0.55, s: [[[0, 0], [0, 1]], [[0, 0], [1, 0]], [[0, 0.5], [0.8, 0.5]]] },
  H: { w: 0.7, s: [[[0, 0], [0, 1]], [[1, 0], [1, 1]], [[0, 0.5], [1, 0.5]]] },
  I: { w: 0.5, s: [[[0, 0], [1, 0]], [[0.5, 0], [0.5, 1]], [[0, 1], [1, 1]]] },
  K: { w: 0.65, s: [[[0, 0], [0, 1]], [[1, 0], [0, 0.55], [1, 1]]] },
  L: { w: 0.55, s: [[[0, 0], [0, 1], [1, 1]]] },
  M: { w: 0.85, s: [[[0, 1], [0, 0], [0.5, 0.65], [1, 0], [1, 1]]] },
  N: { w: 0.7, s: [[[0, 1], [0, 0], [1, 1], [1, 0]]] },
  T: { w: 0.7, s: [[[0, 0], [1, 0]], [[0.5, 0], [0.5, 1]]] },
  V: { w: 0.7, s: [[[0, 0], [0.5, 1], [1, 0]]] },
  W: { w: 0.95, s: [[[0, 0], [0.25, 1], [0.5, 0.35], [0.75, 1], [1, 0]]] },
  X: { w: 0.65, s: [[[0, 0], [1, 1]], [[1, 0], [0, 1]]] },
  Z: { w: 0.65, s: [[[0, 0], [1, 0], [0, 1], [1, 1]]] },
  '-': { w: 0.5, s: [[[0, 0.5], [1, 0.5]]] },
  '+': { w: 0.6, s: [[[0, 0.5], [1, 0.5]], [[0.5, 0.2], [0.5, 0.8]]] },
  '=': { w: 0.6, s: [[[0, 0.38], [1, 0.38]], [[0, 0.62], [1, 0.62]]] },
};

/** Printed words the dash reading must never take for a dashed line: bars in a row, crossbars in a row, serifs in a row. */
export const PRINTED = ['FEE', 'EFFETE', 'TEETH', 'HELLFIRE', 'III', 'TITLE', 'FIELD', 'MINIMA', 'HEAVEN', 'LIFE', 'EXIT', 'ZEN', 'KNIFE', 'AFFINE', '+ + +', 'A = E + F'];

/**
 * A printed word at (x, y) with cap height `h`: each letter's strokes, each a
 * hand's line, a few hundred milliseconds apart — the joints a hand leaves
 * where a stem meets a bar a little past or short of it. Digits and other
 * characters with no straight-stroke letter are a scribble. Returns the ids
 * and the time of the last.
 */
export function drawPrinted(s: Session, text: string, x: number, y: number, h: number, o: { seed?: number; t0?: number; scale?: number } = {}): { ids: string[]; at: number } {
  const r = rng((o.seed ?? 1) * 29 + 11);
  const scale = o.scale ?? 1;
  let t = o.t0 ?? 1000;
  let cx = x;
  const ids: string[] = [];
  let first = true;
  for (const ch of text) {
    if (ch === ' ') {
      cx += h * 0.45;
      continue;
    }
    const L = LETTERS[ch];
    const w = h * (L?.w ?? 0.55);
    if (!L) {
      ids.push(s.addStroke(handText(cx, y + h * 0.1, w, h * 0.8, { seed: (o.seed ?? 1) * 7 + ids.length, humps: 2, jitter: 0.8 * scale }), (t += first ? 4000 : 250), undefined, scale));
      first = false;
    } else {
      for (const poly of L.s) {
        // A hand's joints: each end a little past or short of where it meets.
        const miss = () => (r() - 0.5) * 0.08 * h;
        const pts = poly.map(([u, v]) => ({ x: cx + u * w + miss(), y: y + v * h + miss() }));
        const ink = pts.length === 2 ? handLine(pts[0], pts[1], { seed: (o.seed ?? 1) * 13 + ids.length, jitter: 0.6 * scale, density: 0.5 / scale }) : handPath(pts, { seed: (o.seed ?? 1) * 13 + ids.length, jitter: 0.6 * scale, density: 0.5 / scale });
        ids.push(s.addStroke(ink, (t += first ? 4000 : 170 + Math.round(r() * 200)), undefined, scale));
        first = false;
      }
    }
    cx += w + h * (0.18 + 0.14 * r());
  }
  return { ids, at: t };
}
