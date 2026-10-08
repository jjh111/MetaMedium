// The coordinate plane's bench boards (MATHS-SPEC §8 Lane C, M19): a plane drawn the way a teacher draws one.
//
//              y
//              ↑
//           3 ─┤                     axes      two long strokes, an arrow at each positive end
//           2 ─┤                     ticks     short strokes across them, a number by each
//           1 ─┤                     names     x and y written past the arrowheads
//     ───┼────┼────┼────┼────→ x
//        −1   0│   1    2    3
//
// Six ways of drawing it (`style`), from everything to nothing but the crossing: `full`, `arrows`, `ticks` (the
// first quadrant, no arrows), `tee` (the upper half plane, with arrows), `names` (plain lines, ticks and x and y)
// and `bare` (a plus sign). Strokes are drawn four seconds apart so the letter rules gather none of them into a
// word; numbers and names are texts (the way a model's reading of handwriting arrives as one). Everything is
// deterministic: a variant is a seed, a wobble and a style.

import type { Bounds, Point } from '../../types';
import type { Session } from '../../session/session';
import { handArrow, handLine } from '../../test/strokes';

export type PlaneStyle = 'full' | 'arrows' | 'ticks' | 'tee' | 'names' | 'bare';

export interface PlaneVariant {
  seed: number;
  /** Wobble in px. */
  jitter: number;
  style: PlaneStyle;
  /** The unit, in px at k = 1. */
  unit: number;
}

const STYLES: PlaneStyle[] = ['full', 'arrows', 'ticks', 'tee', 'names', 'bare'];

export const PLANE_VARIANTS: PlaneVariant[] = [];
for (const seed of [1, 2, 3, 4]) {
  for (const jitter of [1.5, 3]) {
    STYLES.forEach((style, i) => PLANE_VARIANTS.push({ seed: seed * 10 + i, jitter, style, unit: 52 + ((seed * 7 + i * 5) % 17) }));
  }
}

/** What the bench expects of a drawing. */
export interface PlaneExpected {
  x: string;
  y: string;
  /** Every stroke on the board. */
  all: string[];
  ticks: string[];
  /** Texts written: numbers and names. */
  texts: string[];
  /** Where the axes cross, the unit in px, and the ranges drawn to (tips excluded). */
  origin: Point;
  unit: number;
  xr: [number, number];
  yr: [number, number];
  numbered: boolean;
  named: boolean;
  arrows: boolean;
}

export const PLANE_ORIGIN: Point = { x: 400, y: 330 };

let clock = 70000;
/** A one-line text, where `centre` is its middle: the way a read number or name arrives. */
export function putText(s: Session, text: string, centre: Point, w = 22, h = 15): string {
  clock += 1000;
  const b: Bounds = { minX: centre.x - w / 2, maxX: centre.x + w / 2, minY: centre.y - h / 2, maxY: centre.y + h / 2 };
  return s.import({ kind: 'text', path: `text/${clock}.txt`, name: text, bounds: b, code: text, at: clock })!;
}

const mins = (v: string) => v.replace('-', '−');

/** Draw a plane on a session at `at` (where the axes cross) and `k` times its size. Returns what it should read as. */
export function drawPlane(s: Session, v: PlaneVariant, t0 = 1000, o: { at?: Point; k?: number } = {}): PlaneExpected {
  let t = t0;
  const k = o.k ?? 1;
  const O = o.at ?? PLANE_ORIGIN;
  const U = v.unit * k;
  const j = v.jitter * Math.min(1, k);
  const seed = (n: number) => v.seed * 100 + n;
  const all: string[] = [];
  const draw = (pts: Point[]) => {
    const id = s.addStroke(pts, (t += 4000));
    all.push(id);
    return id;
  };
  const arrows = v.style === 'full' || v.style === 'arrows' || v.style === 'tee';
  const named = v.style === 'full' || v.style === 'names' || v.style === 'tee';
  const numbered = v.style === 'full' || v.style === 'ticks' || v.style === 'tee';
  const ticked = numbered || v.style === 'names';
  // How far each axis runs each way, in units.
  const half = v.style === 'ticks' ? { xl: 0, xr: 5.6, yl: 0, yr: 5.2 } : v.style === 'tee' ? { xl: 3.5, xr: 3.6, yl: 0, yr: 4.8 } : { xl: 3.5, xr: 3.6, yl: 3.3, yr: 3.5 };
  const left = { x: O.x - half.xl * U, y: O.y }, right = { x: O.x + half.xr * U, y: O.y };
  const bottom = { x: O.x, y: O.y + half.yl * U }, top = { x: O.x, y: O.y - half.yr * U };
  const headLen = 16 * k;
  const x = draw(arrows ? handArrow(left, right, { seed: seed(1), jitter: j, headLen, wings: 2 }) : handLine(left, right, { seed: seed(1), jitter: j }));
  const y = draw(arrows ? handArrow(bottom, top, { seed: seed(2), jitter: j, headLen, wings: 2 }) : handLine(bottom, top, { seed: seed(2), jitter: j }));
  const ticks: string[] = [];
  const texts: string[] = [];
  if (ticked) {
    const range = (lo: number, hi: number) => {
      const out: number[] = [];
      for (let i = Math.ceil(lo); i <= Math.floor(hi); i++) if (i !== 0) out.push(i);
      return out;
    };
    for (const i of range(-half.xl + 0.2, half.xr - 0.5)) {
      ticks.push(draw(handLine({ x: O.x + i * U, y: O.y - 6 * k }, { x: O.x + i * U, y: O.y + 6 * k }, { seed: seed(10 + i + 8), jitter: j * 0.3 })));
      if (numbered) texts.push(putText(s, mins(String(i)), { x: O.x + i * U, y: O.y + 20 * k }, (i < 0 ? 24 : 14) * k, 15 * k));
    }
    for (const i of range(-half.yl + 0.2, half.yr - 0.5)) {
      ticks.push(draw(handLine({ x: O.x - 6 * k, y: O.y - i * U }, { x: O.x + 6 * k, y: O.y - i * U }, { seed: seed(30 + i + 8), jitter: j * 0.3 })));
      if (numbered) texts.push(putText(s, mins(String(i)), { x: O.x - 22 * k, y: O.y - i * U }, (i < 0 ? 24 : 14) * k, 15 * k));
    }
  }
  if (named) {
    texts.push(putText(s, 'x', { x: right.x + 22 * k, y: right.y + 2 * k }, 12 * k, 15 * k));
    texts.push(putText(s, 'y', { x: top.x + 2 * k, y: top.y - 22 * k }, 12 * k, 15 * k));
  }
  return {
    x, y, all, ticks, texts, origin: O, unit: U,
    xr: [-half.xl, half.xr], yr: [-half.yl, half.yr],
    numbered, named, arrows,
  };
}

/**
 * The plane of Jake's story: x from −3 to 3 at 60 px a unit, y from 0 to 9 at 36 px a unit, the crossing at (300, 500),
 * arrows, ticks and the numbers by them. Returns where it is.
 */
export function drawHalfPlane(s: Session, o: { seed?: number; jitter?: number; t0?: number } = {}) {
  const seed = o.seed ?? 1, j = o.jitter ?? 1.5;
  let t = o.t0 ?? 1000;
  const O = { x: 300, y: 500 }, U = 60, V = 36;
  const x = s.addStroke(handArrow({ x: O.x - 3.5 * U, y: O.y }, { x: O.x + 3.6 * U, y: O.y }, { seed, jitter: j, headLen: 16, wings: 2 }), (t += 4000));
  const y = s.addStroke(handArrow({ x: O.x, y: O.y }, { x: O.x, y: O.y - 9.5 * V }, { seed: seed + 1, jitter: j, headLen: 16, wings: 2 }), (t += 4000));
  for (const i of [-3, -2, -1, 1, 2, 3]) {
    s.addStroke(handLine({ x: O.x + i * U, y: O.y - 6 }, { x: O.x + i * U, y: O.y + 6 }, { seed: seed + 10 + i, jitter: 0.4 }), (t += 4000));
    putText(s, String(i).replace('-', '−'), { x: O.x + i * U, y: O.y + 20 }, i < 0 ? 24 : 14);
  }
  for (const i of [3, 6, 9]) {
    s.addStroke(handLine({ x: O.x - 6, y: O.y - i * V }, { x: O.x + 6, y: O.y - i * V }, { seed: seed + 30 + i, jitter: 0.4 }), (t += 4000));
    putText(s, String(i), { x: O.x - 24, y: O.y - i * V });
  }
  return { x, y, O, U, V, next: t + 4000 };
}
