// The pendulum's bench boards (MATHS-SPEC §8 Lane D, M23): a pendulum drawn the
// way a hand draws one — a ceiling, hatching above it, a rod hung from the
// ceiling's middle, a bob at the rod's far end — and what it should read as.
//
//          ////////////          hatching   short strokes leaning one way, above the ceiling
//        ──────────┬───────       ceiling    a level line; the rod hangs from its middle
//                  │              rod        a line from the pivot to the bob
//                  │
//                 ( )             bob        a circle, or a spot filled solid
//
// Five ways a hand marks where it hangs from (`pivot`): the ceiling and its
// hatching, a ceiling alone, a short hatched stub no wider than a rod's quarter,
// a dot at the rod's top end, or nothing at all (the rod's top end alone). Two ways it draws the bob (`bob`): a ring, or a spot
// scribbled solid. The rod leans `theta` degrees from plumb, positive to the
// right — a pendulum hangs, so plumb is straight down the page.
//
// Strokes are drawn four seconds apart, so the letter rules gather none of
// them into a word. Everything is deterministic: a variant is a seed, a wobble,
// an angle, a length, and the two ways above.

import type { Point } from '../../types';
import type { Session } from '../../session/session';
import { handCircle, handLine } from '../../test/strokes';
import { filledDot } from './state';

export interface PendulumVariant {
  seed: number;
  /** Wobble in px. */
  jitter: number;
  /** How far the rod leans from plumb, in degrees; positive to the right. */
  theta: number;
  /** The rod, pivot to the bob's centre, in px at k = 1. */
  length: number;
  pivot: 'hatched' | 'ceiling' | 'stub' | 'dot' | 'none';
  bob: 'ring' | 'filled';
}

export const PENDULUM_VARIANTS: PendulumVariant[] = [];
{
  const thetas = [-32, -20, -8, 0, 6, 14, 20, 28, 41];
  const pivots = ['hatched', 'ceiling', 'dot', 'hatched', 'stub'] as const;
  for (const seed of [1, 2, 3, 4]) {
    for (const jitter of [1.5, 3]) {
      thetas.forEach((theta, i) => {
        const n = PENDULUM_VARIANTS.length;
        PENDULUM_VARIANTS.push({ seed: seed * 10 + n, jitter, theta, length: 190 + ((n * 37) % 90), pivot: pivots[(n + i) % pivots.length], bob: n % 3 === 2 ? 'filled' : 'ring' });
      });
    }
  }
}

/** What the bench expects: the marks each part is drawn with. */
export interface PendulumExpected {
  /** The rod's stroke. */
  rod: string;
  /** The bob's stroke. */
  bob: string;
  /** What it hangs from: the ceiling, its hatching, a dot — none when nothing is drawn. */
  pivot: string[];
  /** Every mark on the board. */
  all: string[];
  /** The pivot, the bob's centre and the drawn angle in degrees, where they were meant to stand. */
  pivotAt: Point;
  bobAt: Point;
  theta: number;
  /** The rod's length (pivot to the bob's centre) in px. */
  length: number;
}

/** The pivot, where the rod hangs from. */
export const PENDULUM_PIVOT: Point = { x: 400, y: 120 };
/** The bob's radius at k = 1. */
export const PENDULUM_BOB_R = 22;

/** Draw a pendulum on a session at `at` (its pivot) and `k` times its size. Returns what it should read as. */
export function drawPendulum(s: Session, v: PendulumVariant, t0 = 1000, o: { at?: Point; k?: number } = {}): PendulumExpected {
  let t = t0;
  const k = o.k ?? 1;
  const P = o.at ?? PENDULUM_PIVOT;
  const L = v.length * k;
  const a = (v.theta * Math.PI) / 180;
  const u = { x: Math.sin(a), y: Math.cos(a) };
  const B = { x: P.x + u.x * L, y: P.y + u.y * L };
  const r = PENDULUM_BOB_R * k;
  const j = v.jitter;
  const seed = (n: number) => v.seed * 100 + n;
  const all: string[] = [];
  const draw = (pts: Point[]) => {
    const id = s.addStroke(pts, (t += 4000));
    all.push(id);
    return id;
  };
  const line = (from: Point, to: Point, n: number) => handLine(from, to, { seed: seed(n), jitter: j * Math.min(1, k) });

  const pivot: string[] = [];
  if (v.pivot === 'stub') {
    // A short line with hatching: the pivot as a drafter draws it when the wall is not the point.
    pivot.push(draw(line({ x: P.x - 34 * k, y: P.y }, { x: P.x + 34 * k, y: P.y }, 1)));
    for (let i = 0; i < 4; i++) {
      const x = P.x - 26 * k + i * 17 * k;
      pivot.push(draw(line({ x, y: P.y - 3 * k }, { x: x + 12 * k, y: P.y - 19 * k }, 2 + i)));
    }
  } else if (v.pivot === 'hatched' || v.pivot === 'ceiling') {
    pivot.push(draw(line({ x: P.x - 95 * k, y: P.y }, { x: P.x + 95 * k, y: P.y }, 1)));
    if (v.pivot === 'hatched') {
      for (let i = 0; i < 7; i++) {
        const x = P.x - 84 * k + i * 28 * k;
        pivot.push(draw(line({ x, y: P.y - 4 * k }, { x: x + 14 * k, y: P.y - 22 * k }, 2 + i)));
      }
    }
  } else if (v.pivot === 'dot') {
    pivot.push(draw(filledDot(P.x, P.y, 5 * k, { seed: seed(1), jitter: 0.4 * k })));
  }
  // The rod runs from the pivot to the bob's near edge, as a hand stops at a ring — or at a solid spot, which scribbled across the rod's end would be a scratch that erases it.
  const reach = v.bob === 'ring' ? r : r * 0.7 + 2 * k;
  const rodEnd = { x: B.x - u.x * reach, y: B.y - u.y * reach };
  const rodStart = v.pivot === 'dot' ? { x: P.x + u.x * 5 * k, y: P.y + u.y * 5 * k } : P;
  const rod = draw(line(rodStart, rodEnd, 20));
  const bob = draw(v.bob === 'ring' ? handCircle(B.x, B.y, r, { seed: seed(21), jitter: Math.min(j, 2) * k }) : filledDot(B.x, B.y, r * 0.7, { seed: seed(21), jitter: 0.6 * k }));
  return { rod, bob, pivot, all, pivotAt: P, bobAt: B, theta: v.theta, length: L };
}
