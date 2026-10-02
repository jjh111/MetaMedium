// The flowchart bench's boards (V1-PLAN §9 D1): one hand-drawn flowchart
// that must read with every symbol and every flow right, and three boards
// that must NOT read as a flowchart above the floor — a UI wireframe, the
// canonical molecule, and a line of writing.
//
// The flowchart, top to bottom:
//
//                 ( T1 )                a stadium — a terminator
//                   | f1
//                 / D0 /                a parallelogram — data
//                   | f2
//                 [ P1 ]                a process, drawn a little tilted (the trap)
//                   | f3
//                 < Q1 >                a decision in ONE stroke
//          yes f4 /     \ f5 no
//             [ P2 ]    < Q2 >          a process; a decision in TWO strokes
//            f6 |          | f7         f7 is a line with no head
//             ( E1 ) <--- [ P3 ]        a small circle — the end; a process ruled in four strokes
//                     f8
//
// Every arrow is one stroke with its own barb; f7 is a plain line; "yes" and
// "no" are written beside the flows leaving the decision; P1, P2, Q1 and T1
// have writing inside them. Strokes are drawn four seconds apart, so the
// letter rules gather none of them into a word. Q2's two halves are drawn a
// second apart, and so are P3's four sides: top and bottom halves share no
// band, and a side as long as a box is no letter, so they stay strokes.
//
// Everything is deterministic: a variant is a seed, a wobble, a tilt for P1
// and where each closed stroke starts.

import type { Point } from '../../types';
import type { Session } from '../../session/session';
import { handArrow, handLine, handText, handCircle } from '../../test/strokes';
import { inkAround, stadiumOutline, diamondCorners, boxCorners, parallelogramCorners, handShape, diamondTopBottom, boxInFour } from './hand';

export interface FlowchartVariant {
  seed: number;
  /** Wobble in px. */
  jitter: number;
  /** How far P1 is drawn off square, in degrees. */
  tilt: number;
}

/** What the bench expects: symbols and flows by name, each with the marks it is drawn with. */
export interface Expected {
  symbols: Record<string, { symbol: string; ids: string[] }>;
  flows: { name: string; id: string; from: string; to: string; directed: boolean }[];
  /** Writing, by mark id, and the symbol or flow name it labels. */
  labels: { id: string; of: string; where: 'inside' | 'beside' }[];
}

export const FLOWCHART_VARIANTS: FlowchartVariant[] = [];
for (const seed of [1, 2, 3, 4, 5, 6]) {
  for (const jitter of [1.5, 3]) {
    for (const tilt of [0, 6, 10]) FLOWCHART_VARIANTS.push({ seed: seed * 10 + FLOWCHART_VARIANTS.length, jitter, tilt: seed % 2 ? tilt : -tilt });
  }
}

/** Draw the flowchart on a session. Returns what it should read as. */
export function drawFlowchart(s: Session, v: FlowchartVariant, t0 = 1000): Expected {
  let t = t0;
  const at = (gap = 4000) => (t += gap);
  const j = v.jitter;
  const seed = (k: number) => v.seed * 100 + k;
  const start = (k: number) => ((v.seed * 0.37 + k * 0.23) % 1);
  const draw = (pts: Point[], gap?: number) => s.addStroke(pts, at(gap));
  const arrow = (from: Point, to: Point, k: number) => handArrow(from, to, { wings: 2, headLen: 16, seed: seed(k), jitter: j * 0.6 });
  const words = (x: number, y: number, w: number, h: number, k: number) => handText(x, y, w, h, { seed: seed(k), humps: Math.max(3, Math.round(w / 22)), jitter: 1 });

  const T1 = draw(inkAround(stadiumOutline(400, 60, 170, 56), { seed: seed(1), jitter: j, startAt: start(1) }));
  const D0 = draw(handShape(parallelogramCorners(400, 200, 180, 64, 28), { seed: seed(2), jitter: j, startAt: start(2) }));
  const P1 = draw(handShape(boxCorners(400, 350, 170, 70, v.tilt), { seed: seed(3), jitter: j, startAt: start(3) }));
  const Q1 = draw(handShape(diamondCorners(400, 520, 180, 110), { seed: seed(4), jitter: j, startAt: start(4) }));
  const P2 = draw(handShape(boxCorners(180, 700, 160, 70), { seed: seed(5), jitter: j, startAt: start(5) }));
  const [q2top, q2bottom] = diamondTopBottom(diamondCorners(620, 700, 160, 100), { seed: seed(6), jitter: j * 0.6 });
  const Q2a = draw(q2top);
  const Q2b = draw(q2bottom, 1000);
  const P3 = boxInFour(boxCorners(620, 880, 160, 70), { seed: seed(7), jitter: j * 0.6 }).map((pts) => draw(pts, 1000));
  const E1 = draw(handCircle(180, 880, 16, { seed: seed(8), jitter: Math.min(j, 2) }));

  const f1 = draw(arrow({ x: 400, y: 93 }, { x: 400, y: 165 }, 11));
  const f2 = draw(arrow({ x: 400, y: 236 }, { x: 400, y: 312 }, 12));
  const f3 = draw(arrow({ x: 400, y: 390 }, { x: 400, y: 462 }, 13));
  const f4 = draw(arrow({ x: 306, y: 524 }, { x: 184, y: 661 }, 14));
  const f5 = draw(arrow({ x: 494, y: 524 }, { x: 617, y: 646 }, 15));
  const f6 = draw(arrow({ x: 180, y: 740 }, { x: 180, y: 860 }, 16));
  const f7 = draw(handLine({ x: 620, y: 755 }, { x: 620, y: 841 }, { seed: seed(17), jitter: j * 0.6 }));
  const f8 = draw(arrow({ x: 536, y: 880 }, { x: 201, y: 880 }, 18));

  const inT1 = draw(words(372, 51, 56, 18, 21));
  const inP1 = draw(words(355, 339, 90, 22, 22));
  const inQ1 = draw(words(372, 510, 56, 20, 23));
  const inP2 = draw(words(140, 689, 80, 22, 24));
  const yes = draw(words(196, 560, 44, 18, 25));
  const no = draw(words(566, 548, 34, 16, 26));

  return {
    symbols: {
      T1: { symbol: 'terminator', ids: [T1] },
      D0: { symbol: 'data', ids: [D0] },
      P1: { symbol: 'process', ids: [P1] },
      Q1: { symbol: 'decision', ids: [Q1] },
      P2: { symbol: 'process', ids: [P2] },
      Q2: { symbol: 'decision', ids: [Q2a, Q2b] },
      P3: { symbol: 'process', ids: P3 },
      E1: { symbol: 'end', ids: [E1] },
    },
    flows: [
      { name: 'f1', id: f1, from: 'T1', to: 'D0', directed: true },
      { name: 'f2', id: f2, from: 'D0', to: 'P1', directed: true },
      { name: 'f3', id: f3, from: 'P1', to: 'Q1', directed: true },
      { name: 'f4', id: f4, from: 'Q1', to: 'P2', directed: true },
      { name: 'f5', id: f5, from: 'Q1', to: 'Q2', directed: true },
      { name: 'f6', id: f6, from: 'P2', to: 'E1', directed: true },
      { name: 'f7', id: f7, from: 'Q2', to: 'P3', directed: false },
      { name: 'f8', id: f8, from: 'P3', to: 'E1', directed: true },
    ],
    labels: [
      { id: inT1, of: 'T1', where: 'inside' },
      { id: inP1, of: 'P1', where: 'inside' },
      { id: inQ1, of: 'Q1', where: 'inside' },
      { id: inP2, of: 'P2', where: 'inside' },
      { id: yes, of: 'f4', where: 'beside' },
      { id: no, of: 'f5', where: 'beside' },
    ],
  };
}

/**
 * A UI wireframe: a page with a header (a logo and three nav buttons), a
 * sidebar of text lines, a content area with an image placeholder crossed
 * corner to corner, a headline, text lines and a button, and a footer. Boxes
 * inside boxes and lines inside boxes — and nothing joining one box to another.
 */
export function drawWireframe(s: Session, seed: number, t0 = 1000): string[] {
  let t = t0;
  const ids: string[] = [];
  const j = 2;
  const k = (n: number) => seed * 100 + n;
  const box = (x: number, y: number, w: number, h: number, n: number) => handShape(boxCorners(x + w / 2, y + h / 2, w, h), { seed: k(n), jitter: j, startAt: (n * 0.17) % 1 });
  const draw = (pts: Point[]) => {
    ids.push(s.addStroke(pts, (t += 4000)));
  };
  draw(box(40, 40, 600, 420, 1)); // the page
  draw(box(60, 60, 560, 50, 2)); // header
  draw(handCircle(85, 85, 12, { seed: k(3), jitter: 1 })); // logo
  for (let i = 0; i < 3; i++) draw(box(400 + i * 70, 72, 56, 26, 4 + i)); // nav
  draw(box(60, 130, 140, 310, 8)); // sidebar
  for (let i = 0; i < 4; i++) draw(handLine({ x: 76, y: 160 + i * 30 }, { x: 184, y: 160 + i * 30 }, { seed: k(9 + i), jitter: 1.5 }));
  draw(box(220, 130, 400, 250, 14)); // content
  draw(box(240, 150, 180, 130, 15)); // image placeholder…
  draw(handLine({ x: 243, y: 153 }, { x: 417, y: 277 }, { seed: k(16), jitter: 1 })); // …crossed
  draw(handLine({ x: 417, y: 153 }, { x: 243, y: 277 }, { seed: k(17), jitter: 1 }));
  draw(handText(440, 150, 150, 26, { seed: k(18), humps: 6, jitter: 1 })); // headline
  for (let i = 0; i < 3; i++) draw(handLine({ x: 440, y: 205 + i * 24 }, { x: 600, y: 205 + i * 24 }, { seed: k(19 + i), jitter: 1.5 }));
  draw(box(440, 300, 100, 40, 23)); // button…
  draw(handText(458, 311, 64, 18, { seed: k(24), humps: 3, jitter: 1 })); // …with its label
  draw(box(220, 395, 400, 45, 25)); // footer
  return ids;
}

/** The canonical molecule (CLAUDE.md): three bubbles and two lines joining them, hand-drawn. */
export function drawMolecule(s: Session, seed: number, t0 = 1000): string[] {
  let t = t0;
  const o = { seed, jitter: 2 };
  return [
    handCircle(200, 200, 40, { ...o, seed: seed + 1 }),
    handCircle(380, 200, 40, { ...o, seed: seed + 2 }),
    handCircle(290, 340, 40, { ...o, seed: seed + 3 }),
    handLine({ x: 245, y: 200 }, { x: 335, y: 200 }, { ...o, seed: seed + 4 }),
    handLine({ x: 220, y: 245 }, { x: 270, y: 320 }, { ...o, seed: seed + 5 }),
  ].map((pts) => s.addStroke(pts, (t += 4000)));
}

/** A line of writing: four scribbled words on one band. */
export function drawWriting(s: Session, seed: number, t0 = 1000): string[] {
  let t = t0;
  const words: [number, number][] = [[100, 110], [226, 90], [332, 120], [468, 80]];
  return words.map(([x, w], i) => s.addStroke(handText(x, 200, w, 28, { seed: seed * 10 + i, humps: Math.round(w / 22), jitter: 1.5 }), (t += 4000)));
}
