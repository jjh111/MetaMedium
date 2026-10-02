// The garment pattern piece (V1-PLAN §9 M6, acceptance A4): drawn the way a
// hand draws one — jittered strokes, a piece outlined in one stroke, its grain
// line an arrow at both ends, notches as ticks across the outline, a dart as a
// narrow wedge from an edge, and either a seam allowance (a second outline
// standing off the first all round) or a fold (an arrow along an edge) — and
// what it should read as.
//
// The board, the piece a panel of fabric, its cutting line round it:
//
//        +--------------------------------+        the cutting line, 28 px out (`seam`)
//        |  +--------------------------+  |
//        |  |  /\        ^             |  |        dart   a narrow wedge, its base on the top edge
//        |  |  \/        |             |  |        grain  a line with a head at both ends
//        |  -  notch     |             |  |        notch  two ticks across the left edge
//        |  |            |             |  |
//        |  -  notch     v             |  |
//        |  +--------------------------+  |
//        +--------------------------------+
//
// Two ways a hand ends the grain line (`grain`): a line with a chevron drawn
// at each end (three strokes), or one stroke with a hook at both ends. Two
// ways a hand draws the dart (`dart`): a closed wedge, or a V of one open
// stroke. The piece has a seam allowance, or — `edge: 'fold'` — stands on a
// fold, an arrow with a head at both ends drawn just outside its right edge,
// and has no allowance.
//
// Strokes are drawn four seconds apart, so the letter rules gather none of
// them into a word. Everything is deterministic: a variant is a seed, a wobble
// and a tilt of the whole page.

import type { Point } from '../../types';
import type { Session } from '../../session/session';
import { handLine, handTriangle } from '../../test/strokes';
import { boxCorners, handShape } from './hand';

export interface GarmentVariant {
  seed: number;
  /** Wobble in px. */
  jitter: number;
  /** How far the whole page is turned, in degrees. */
  tilt: number;
  grain: 'chevrons' | 'hooks';
  dart: 'triangle' | 'v';
  /** What stands off the piece's edge: a cutting line all round, or a fold on its right side. */
  edge: 'seam' | 'fold';
}

export const GARMENT_VARIANTS: GarmentVariant[] = [];
for (const seed of [1, 2, 3, 4]) {
  for (const jitter of [1.5, 3]) {
    for (const tilt of [0, 3, -3]) {
      for (const grain of ['chevrons', 'hooks'] as const) {
        GARMENT_VARIANTS.push({ seed: seed * 10 + GARMENT_VARIANTS.length, jitter, tilt, grain, dart: GARMENT_VARIANTS.length % 2 ? 'v' : 'triangle', edge: GARMENT_VARIANTS.length % 3 === 2 ? 'fold' : 'seam' });
      }
    }
  }
}

/** What the board should read as: the marks each thing is drawn with. */
export interface GarmentExpected {
  piece: string;
  /** The grain line's shaft, then the heads drawn apart, if any. */
  grain: string[];
  notches: string[];
  dart: string;
  /** The cutting line — `edge: 'seam'`. */
  seam?: string;
  /** The fold's arrow and its heads — `edge: 'fold'`. */
  fold?: string[];
  /** Every mark on the board. */
  all: string[];
}

/** The piece: a panel of fabric, 360 wide and 520 tall. */
export const GARMENT_PIECE = { minX: 120, maxX: 480, minY: 80, maxY: 600 } as const;
/** How far the cutting line stands off the piece, all round. */
export const GARMENT_SEAM_PX = 28;
export const GARMENT_NOTCH_YS = [250, 420] as const;
/** The dart: its base on the top edge and its apex inside. */
export const GARMENT_DART = { base: [{ x: 190, y: 80 }, { x: 240, y: 80 }], apex: { x: 215, y: 250 } } as const;
export const GARMENT_GRAIN = { from: { x: 300, y: 150 }, to: { x: 300, y: 530 } } as const;
const PIVOT = { x: 300, y: 340 };

/** A line's head: the two wings back along the shaft from the tip. */
function wings(tip: Point, toward: Point, len = 22): [Point, Point] {
  const L = Math.hypot(toward.x - tip.x, toward.y - tip.y) || 1;
  const ux = (toward.x - tip.x) / L, uy = (toward.y - tip.y) / L;
  const a = Math.PI / 6, c = Math.cos(a), s = Math.sin(a);
  return [
    { x: tip.x + (ux * c - uy * s) * len, y: tip.y + (uy * c + ux * s) * len },
    { x: tip.x + (ux * c + uy * s) * len, y: tip.y + (uy * c - ux * s) * len },
  ];
}

/** Ruled runs joined end to end, each a hand's line. */
function polyline(pts: Point[], seed: number, jitter: number): Point[] {
  const out: Point[] = [];
  for (let i = 0; i < pts.length - 1; i++) out.push(...handLine(pts[i], pts[i + 1], { jitter, seed: seed + i * 7 }).slice(i ? 1 : 0));
  return out;
}

/** Draw the garment board on a session, at `at` (its pivot) and `k` times its size. Returns what it should read as. */
export function drawGarment(s: Session, v: GarmentVariant, t0 = 1000, o: { at?: Point; k?: number; seam?: boolean } = {}): GarmentExpected {
  let t = t0;
  const k = o.k ?? 1;
  const at = o.at ?? PIVOT;
  const cs = Math.cos((v.tilt * Math.PI) / 180), sn = Math.sin((v.tilt * Math.PI) / 180);
  const turn = (p: Point): Point => {
    const x = (p.x - PIVOT.x) * k, y = (p.y - PIVOT.y) * k;
    return { x: at.x + x * cs - y * sn, y: at.y + x * sn + y * cs };
  };
  const draw = (pts: Point[], gap = 4000) => s.addStroke(pts.map(turn), (t += gap));
  const j = v.jitter / k;
  const seed = (n: number) => v.seed * 100 + n;
  const start = (n: number) => (v.seed * 0.37 + n * 0.23) % 1;
  const P = GARMENT_PIECE;
  const cx = (P.minX + P.maxX) / 2, cy = (P.minY + P.maxY) / 2;
  const box = (grow: number, n: number) => draw(handShape(boxCorners(cx, cy, P.maxX - P.minX + 2 * grow, P.maxY - P.minY + 2 * grow), { seed: seed(n), jitter: j, startAt: start(n), round: 0.04 }));

  // 1. The piece, in one stroke; its cutting line round it when it has one.
  const piece = box(0, 1);
  const seam = v.edge === 'seam' && o.seam !== false ? box(GARMENT_SEAM_PX, 2) : undefined;

  // 2. The grain line: a shaft with a head at each end.
  const { from, to } = GARMENT_GRAIN;
  const grain: string[] = [];
  const [fa, fb] = wings(from, to), [ta, tb] = wings(to, from);
  if (v.grain === 'chevrons') {
    grain.push(draw(handLine(from, to, { seed: seed(3), jitter: j })));
    grain.push(draw(polyline([fa, from, fb], seed(4), j * 0.5)));
    grain.push(draw(polyline([ta, to, tb], seed(5), j * 0.5)));
  } else {
    grain.push(draw(polyline([fa, from, to, ta], seed(3), j * 0.8)));
  }

  // 3. The notches: ticks across the left edge, a dozen pixels out and a dozen and more in.
  const notches = GARMENT_NOTCH_YS.map((y, n) => draw(handLine({ x: P.minX - 12, y }, { x: P.minX + 14, y }, { seed: seed(6 + n), jitter: j * 0.3 })));

  // 4. The dart: a narrow wedge standing on the top edge.
  const [b0, b1] = GARMENT_DART.base, apex = GARMENT_DART.apex;
  const dart = v.dart === 'triangle' ? draw(handTriangle(b0, b1, apex, { seed: seed(8), jitter: j * 0.6, round: 0.04 })) : draw(polyline([b0, apex, b1], seed(8), j * 0.6));

  // 5. Or the fold: an arrow with a head at both ends, drawn just outside the right edge.
  let fold: string[] | undefined;
  if (v.edge === 'fold') {
    const a = { x: P.maxX + 14, y: 140 }, b = { x: P.maxX + 14, y: 540 };
    const [ha, hb] = wings(a, b), [ia, ib] = wings(b, a);
    fold = [draw(handLine(a, b, { seed: seed(9), jitter: j })), draw(polyline([ha, a, hb], seed(10), j * 0.5)), draw(polyline([ia, b, ib], seed(11), j * 0.5))];
  }

  return { piece, grain, notches, dart, ...(seam ? { seam } : {}), ...(fold ? { fold } : {}), all: [piece, ...(seam ? [seam] : []), ...grain, ...notches, dart, ...(fold ?? [])] };
}
