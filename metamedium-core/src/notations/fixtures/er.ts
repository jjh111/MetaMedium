// The ER-diagram board (V1-PLAN §9 D6): drawn the way a hand draws one —
// jittered strokes, each entity a box with its name written in it, each
// relationship a plain line with its multiplicity written at both ends and its
// verb beside its middle — and what it should read as.
//
// The board, left to right and down:
//
//    [ Customer ] 1 ------- places ------- * [ Order ] 1 ------- contains ------- 1..* [ Line item ]
//                                                 | 1
//                                                 |  bills
//                                                 | 0..1
//                                            [ Invoice ]
//
//   entities         square-cornered boxes, the name written in each
//   relationships    lines with no head, each ending on its two entities
//   multiplicities   short writing at each end: 1, *, 1, 1..*, 1, 0..1
//   verbs            writing beside the middle of each line
//
// Strokes are drawn four seconds apart, so the letter rules gather none of
// them into a word. Everything is deterministic: a variant is a seed, a
// wobble and a tilt of the whole page.
//
// The ids the golden (er.mermaid.ts) names are the entities' boxes, drawn
// first on every hand: Customer `stroke:1`, Order `stroke:2`, Line item
// `stroke:3`, Invoice `stroke:4`.

import type { Point } from '../../types';
import type { Session } from '../../session/session';
import { handLine, handText } from '../../test/strokes';
import { handShape, boxCorners } from './hand';

export interface ErVariant {
  seed: number;
  /** Wobble in px. */
  jitter: number;
  /** How far the whole page is turned, in degrees — a hand's page is never square to the screen. */
  tilt: number;
}

export const ER_VARIANTS: ErVariant[] = [];
for (const seed of [1, 2, 3, 4, 5, 6]) {
  for (const jitter of [1.5, 3]) {
    for (const tilt of [0, 3, -3]) ER_VARIANTS.push({ seed: seed * 10 + ER_VARIANTS.length, jitter, tilt });
  }
}

type EntityName = 'Customer' | 'Order' | 'LineItem' | 'Invoice';

/** What the board should read as: entities and relationships by name, each with the marks it is drawn with. */
export interface ErExpected {
  entities: Record<EntityName, { box: string[]; name: string[] }>;
  relationships: {
    name: string;
    /** The line's own stroke. */
    id: string;
    a: EntityName;
    b: EntityName;
    /** The writing at each end, and beside the middle. */
    aMult: string[];
    bMult: string[];
    verb: string[];
  }[];
  /** What a model that can see reads each piece of writing as, by mark. */
  words: Record<string, string>;
}

/** The words the writing says, in the order the board draws it. */
export const ER_WORDS = {
  names: { Customer: 'Customer', Order: 'Order', LineItem: 'Line item', Invoice: 'Invoice' },
  ends: ['1', '*', '1', '1..*', '1', '0..1'],
  verbs: ['places', 'contains', 'bills'],
};

const BOX = {
  Customer: { cx: 170, cy: 160, w: 170, h: 70 },
  Order: { cx: 520, cy: 160, w: 150, h: 70 },
  LineItem: { cx: 870, cy: 160, w: 170, h: 70 },
  Invoice: { cx: 520, cy: 400, w: 150, h: 70 },
};
/** The page turns about its middle. */
const PIVOT = { x: 520, y: 280 };

/** Draw the ER board on a session. Returns what it should read as. */
export function drawEr(s: Session, v: ErVariant, t0 = 1000, o: { round?: number } = {}): ErExpected {
  let t = t0;
  const c = Math.cos((v.tilt * Math.PI) / 180), sn = Math.sin((v.tilt * Math.PI) / 180);
  const turn = (p: Point): Point => ({ x: PIVOT.x + (p.x - PIVOT.x) * c - (p.y - PIVOT.y) * sn, y: PIVOT.y + (p.x - PIVOT.x) * sn + (p.y - PIVOT.y) * c });
  const draw = (pts: Point[], gap = 4000) => s.addStroke(pts.map(turn), (t += gap));
  const j = v.jitter;
  const seed = (k: number) => v.seed * 100 + k;
  const start = (k: number) => (v.seed * 0.37 + k * 0.23) % 1;
  const words = (x: number, y: number, w: number, h: number, k: number) => handText(x, y, w, h, { seed: seed(k), humps: Math.max(4, Math.round(w / 15)), jitter: 1 });
  const small = (x: number, y: number, w: number, h: number, k: number) => handText(x, y, w, h, { seed: seed(k), humps: 2, jitter: 0.8 });

  // 1. The entities, first on every hand: square-cornered boxes.
  const box = (name: EntityName, k: number) => {
    const b = BOX[name];
    return draw(handShape(boxCorners(b.cx, b.cy, b.w, b.h), { seed: seed(k), jitter: j, startAt: start(k), round: o.round ?? 0.06 }));
  };
  const customer = box('Customer', 1), order = box('Order', 2), item = box('LineItem', 3), invoice = box('Invoice', 4);

  // 2. The relationships: plain lines from side to side, a few pixels short of each box.
  const r1 = draw(handLine({ x: 259, y: 160 }, { x: 443, y: 160 }, { seed: seed(11), jitter: j * 0.6 }));
  const r2 = draw(handLine({ x: 597, y: 161 }, { x: 783, y: 161 }, { seed: seed(12), jitter: j * 0.6 }));
  const r3 = draw(handLine({ x: 520, y: 198 }, { x: 521, y: 362 }, { seed: seed(13), jitter: j * 0.6 }));

  // 3. The writing at their ends and beside their middles.
  const m1a = draw(small(272, 130, 12, 20, 21));
  const m1b = draw(small(418, 130, 14, 20, 22));
  const v1 = draw(words(310, 126, 66, 20, 23));
  const m2a = draw(small(610, 131, 12, 20, 24));
  const m2b = draw(small(742, 131, 30, 20, 25));
  const v2 = draw(words(660, 126, 68, 20, 26));
  const m3a = draw(small(534, 208, 12, 20, 27));
  const m3b = draw(small(534, 334, 32, 20, 28));
  const v3 = draw(words(544, 268, 52, 20, 29));

  // 4. The names, in the boxes.
  const n1 = draw(words(BOX.Customer.cx - 32, BOX.Customer.cy - 11, 64, 22, 31));
  const n2 = draw(words(BOX.Order.cx - 24, BOX.Order.cy - 11, 48, 22, 32));
  const n3 = draw(words(BOX.LineItem.cx - 38, BOX.LineItem.cy - 11, 76, 22, 33));
  const n4 = draw(words(BOX.Invoice.cx - 30, BOX.Invoice.cy - 11, 60, 22, 34));

  const marks = [m1a, m1b, m2a, m2b, m3a, m3b];
  const wordsOf: Record<string, string> = {};
  [n1, n2, n3, n4].forEach((id, i) => (wordsOf[id] = Object.values(ER_WORDS.names)[i]));
  marks.forEach((id, i) => (wordsOf[id] = ER_WORDS.ends[i]));
  [v1, v2, v3].forEach((id, i) => (wordsOf[id] = ER_WORDS.verbs[i]));

  return {
    entities: { Customer: { box: [customer], name: [n1] }, Order: { box: [order], name: [n2] }, LineItem: { box: [item], name: [n3] }, Invoice: { box: [invoice], name: [n4] } },
    relationships: [
      { name: 'places', id: r1, a: 'Customer', b: 'Order', aMult: [m1a], bMult: [m1b], verb: [v1] },
      { name: 'contains', id: r2, a: 'Order', b: 'LineItem', aMult: [m2a], bMult: [m2b], verb: [v2] },
      { name: 'bills', id: r3, a: 'Order', b: 'Invoice', aMult: [m3a], bMult: [m3b], verb: [v3] },
    ],
    words: wordsOf,
  };
}
