// The sequence-diagram board (V1-PLAN §9 D5, acceptance A3): drawn the way a
// hand draws one — jittered strokes, each participant a box (or a stick
// figure) with its lifeline below it, the messages across, writing above them
// — and what it should read as.
//
// A3, the acceptance scenario — three lifelines and four messages:
//
//        [ (Alice) ]            [ (Bob) ]               [ (Carol) ]
//             |                     |                        |
//             |  (request)          |                        |
//             |-------------------->|  (validate)            |    m1  a call: an arrow, its own barb
//             |                     |-----+                  |    m2  a self-message: a loop out and back,
//             |                     |<----+                  |        its barb at the end
//             |                     |      (store)           |
//             |                     |----------------------->|    m3  a call
//             |      (done)         |                        |
//             |< - - - - - - - - - -|- - - - - - - - - - - - |    m4  a return: dashes, then a chevron at
//             |                     |                        |        Alice — crossing Bob's lifeline on the
//                                                                     way, and ending at Alice, not at Bob
//
// Each message's label is written just above it (the self-message's above
// its loop). Three ways a hand draws the participants (`style`): boxes over
// solid lifelines; boxes over DASHED lifelines — short strokes a few hundred
// milliseconds apart, the way a hand dashes a line; and Alice as a stick
// figure — a circle over a body, arms and legs, her name written under it —
// over a solid lifeline. The return is always dashed. Its chevron is drawn
// right after the last dash on half the hands (`headAfter`), close to it, so
// the letter rules (session/words.ts) gather the chevron and every dash
// before it into one word — which the reading must see through; on the
// other half, four seconds after, and the dashes stay loose strokes.
//
// Every other stroke is drawn four seconds after the one before, so the
// letter rules gather nothing else. Arrow tips stop a few pixels short of the
// lifeline they reach: an arrow whose tip crosses a line and whose barb comes
// back across it crosses it three times, and the session reads three
// crossings as a scratch that erases the lifeline (session/erase.ts) — a
// hazard of the medium, said in V1-PLAN §9 D5, not a rule of this notation.
//
// The ids the golden (sequence.mermaid.ts) names are the participants'
// stand-ins, drawn first on every hand: Alice's box (or her figure's head),
// then Bob's box, then Carol's — `stroke:1`, `stroke:2`, `stroke:3`.
// Everything is deterministic: a variant is a style, a seed, a wobble, a
// tilt of the whole page and the chevron's timing.

import type { Point } from '../../types';
import type { Session } from '../../session/session';
import { handLine, handArrow, handText, handCircle, rng } from '../../test/strokes';
import { handShape, boxCorners } from './hand';

export type SequenceStyle = 'solid' | 'dashed' | 'actor';

export interface SequenceVariant {
  /** Boxes over solid lifelines, boxes over dashed ones, or Alice as a stick figure. */
  style: SequenceStyle;
  seed: number;
  /** Wobble in px. */
  jitter: number;
  /** How far the whole page is turned, in degrees — a hand's page is never square to the screen. */
  tilt: number;
  /** How soon after the return's last dash its chevron is drawn, in ms (the word window is 3 s). */
  headAfter: number;
}

export const SEQUENCE_VARIANTS: SequenceVariant[] = [];
for (const style of ['solid', 'dashed', 'actor'] as const) {
  for (const seed of [1, 2, 3, 4, 5, 6]) {
    for (const jitter of [1.5, 3]) {
      SEQUENCE_VARIANTS.push({ style, seed: seed * 10 + SEQUENCE_VARIANTS.length, jitter, tilt: [0, 3, -3][seed % 3], headAfter: seed % 2 ? 300 : 4000 });
    }
  }
}

/** What the board should read as — each participant and message by name, with the marks it is drawn with. */
export interface SequenceExpected {
  participants: Record<'Alice' | 'Bob' | 'Carol', {
    symbol: 'participant' | 'actor';
    /** Its box, or its figure's strokes, the head first. */
    figure: string[];
    /** Its lifeline: the stroke, or the dashes top to bottom. */
    lifeline: string[];
    /** The writing that names it. */
    name: string[];
  }>;
  /** The messages, down the page. */
  messages: {
    name: string;
    /** Every stroke it is drawn with: the arrow, the loop, or the dashes and the chevron. */
    ids: string[];
    kind: 'call' | 'return' | 'self';
    from: 'Alice' | 'Bob' | 'Carol';
    to: 'Alice' | 'Bob' | 'Carol';
    /** The writing just above it. */
    label: string[];
  }[];
}

/** What a model that can see reads the writing as. */
export const A3_WORDS = {
  names: { Alice: 'Alice', Bob: 'Bob', Carol: 'Carol' },
  messages: ['request', 'validate', 'store', 'done'],
};

// ===== Drawing by hand =====

/** Low-frequency wobble along a stroke — a hand's tremor, not a sensor's noise (hand.ts's). */
function tremor(seed: number, amplitude: number): (t: number) => Point {
  const r = rng(seed * 7919 + 17);
  const waves = [1.3, 2.9, 5.3].map((freq) => ({ freq, px: r() * Math.PI * 2, py: r() * Math.PI * 2, w: 1 / freq }));
  const norm = waves.reduce((a, w) => a + w.w, 0);
  return (t: number) => {
    let dx = 0, dy = 0;
    for (const w of waves) {
      dx += Math.sin(t * Math.PI * 2 * w.freq + w.px) * w.w;
      dy += Math.cos(t * Math.PI * 2 * w.freq + w.py) * w.w;
    }
    return { x: (dx / norm) * amplitude, y: (dy / norm) * amplitude };
  };
}

/** An open path through `vertices`, walked as a hand does: resampled evenly, wobbled. */
export function handPath(vertices: readonly Point[], o: { jitter?: number; seed?: number; density?: number } = {}): Point[] {
  const jitter = o.jitter ?? 1.5, density = o.density ?? 0.4;
  const cum = [0];
  for (let i = 1; i < vertices.length; i++) cum.push(cum[i - 1] + Math.hypot(vertices[i].x - vertices[i - 1].x, vertices[i].y - vertices[i - 1].y));
  const L = cum[cum.length - 1];
  const n = Math.max(12, Math.round(L * density));
  const wob = tremor(o.seed ?? 1, jitter);
  const out: Point[] = [];
  for (let k = 0; k <= n; k++) {
    const d = (k / n) * L;
    let i = 1;
    while (i < cum.length - 1 && cum[i] < d) i++;
    const a = vertices[i - 1], b = vertices[i];
    const u = cum[i] > cum[i - 1] ? (d - cum[i - 1]) / (cum[i] - cum[i - 1]) : 0;
    const w = wob(k / n);
    out.push({ x: a.x + (b.x - a.x) * u + w.x, y: a.y + (b.y - a.y) * u + w.y });
  }
  return out;
}

/**
 * A dashed line from `a` to `b`, as a hand dashes one: strokes about `dash`
 * long and `gap` apart — each a little longer or shorter than the last, the
 * row spaced to end where the line does — every one its own quick flick,
 * which wobbles no more than its length lets it.
 */
export function dashesAlong(a: Point, b: Point, o: { dash?: number; gap?: number; seed?: number; jitter?: number } = {}): Point[][] {
  const dash = o.dash ?? 13, gap = o.gap ?? 9, seed = o.seed ?? 1;
  const r = rng(seed * 131 + 7);
  const L = Math.hypot(b.x - a.x, b.y - a.y);
  const u = { x: (b.x - a.x) / L, y: (b.y - a.y) / L };
  const n = { x: -u.y, y: u.x };
  const count = Math.max(1, Math.round((L + gap) / (dash + gap)));
  const lens = Array.from({ length: count }, () => dash * (0.8 + 0.4 * r()));
  const gaps = Array.from({ length: count - 1 }, () => gap * (0.75 + 0.5 * r()));
  const k = L / (lens.reduce((x, y) => x + y, 0) + gaps.reduce((x, y) => x + y, 0));
  const out: Point[][] = [];
  const jitter = Math.min(o.jitter ?? 0.8, 0.08 * dash);
  let at = 0;
  lens.forEach((len0, i) => {
    const len = len0 * k;
    const off0 = (r() - 0.5) * 0.12 * dash, off1 = (r() - 0.5) * 0.12 * dash;
    const p = { x: a.x + u.x * at + n.x * off0, y: a.y + u.y * at + n.y * off0 };
    const q = { x: a.x + u.x * (at + len) + n.x * off1, y: a.y + u.y * (at + len) + n.y * off1 };
    out.push(handLine(p, q, { seed: seed * 50 + i, jitter, density: 0.6 }));
    at += len + (gaps[i] ?? 0) * k;
  });
  return out;
}

/** A chevron drawn apart: its point at `apex`, pointing along `dir`, its arms `len` long running back — an open arrow in one stroke. */
export function chevron(apex: Point, dir: Point, len: number, o: { seed?: number; jitter?: number } = {}): Point[] {
  const l = Math.hypot(dir.x, dir.y) || 1;
  const u = { x: dir.x / l, y: dir.y / l };
  const back = (side: 1 | -1): Point => {
    const a = (30 * Math.PI) / 180;
    return { x: apex.x - len * (u.x * Math.cos(a) - side * u.y * Math.sin(a)), y: apex.y - len * (u.y * Math.cos(a) + side * u.x * Math.sin(a)) };
  };
  return handPath([back(1), apex, back(-1)], { seed: o.seed, jitter: o.jitter ?? 0.6, density: 0.8 });
}

/**
 * A self-message: a loop out from the lifeline at `(x, y)` to `w` beside it
 * (to the right when `w` is positive), down `h`, and back — its barb at the
 * end, the pen turning back out along one wing, to the tip again, and out
 * along the other, as a hand draws an arrow's head.
 */
export function selfLoop(x: number, y: number, w: number, h: number, o: { seed?: number; jitter?: number; barb?: number } = {}): Point[] {
  const b = o.barb ?? 12, s = Math.sign(w) || 1;
  const tip = { x, y: y + h };
  const wing = (side: 1 | -1): Point => ({ x: tip.x + s * b * Math.cos(Math.PI / 6), y: tip.y + side * b * Math.sin(Math.PI / 6) });
  return handPath([{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, tip, wing(-1), tip, wing(1)], { seed: o.seed, jitter: o.jitter ?? 1, density: 0.5 });
}

// ===== The board =====

/** Where the participants stand, their boxes, and where each message runs. */
const X = { Alice: 170, Bob: 470, Carol: 790 };
const BOXES = { Alice: { cy: 70, w: 150, h: 56 }, Bob: { cy: 72, w: 140, h: 56 }, Carol: { cy: 70, w: 160, h: 58 } };
const BOTTOM = 540;
const Y = { m1: 170, m2: 228, m3: 330, m4: 430 };
/** The page turns about its middle. */
const PIVOT = { x: 480, y: 300 };

/** Draw A3 on a session. Returns what it should read as. */
export function drawSequence(s: Session, v: SequenceVariant, t0 = 1000): SequenceExpected {
  let t = t0;
  const c = Math.cos((v.tilt * Math.PI) / 180), sn = Math.sin((v.tilt * Math.PI) / 180);
  const turn = (p: Point): Point => ({ x: PIVOT.x + (p.x - PIVOT.x) * c - (p.y - PIVOT.y) * sn, y: PIVOT.y + (p.x - PIVOT.x) * sn + (p.y - PIVOT.y) * c });
  const draw = (pts: Point[], gap = 4000) => s.addStroke(pts.map(turn), (t += gap));
  const j = v.jitter;
  const seed = (k: number) => v.seed * 100 + k;
  const r = rng(v.seed * 977 + 3);
  const actor = v.style === 'actor';

  // 1. The participants' stand-ins, first on every hand: Alice's box or her figure's head, Bob's box, Carol's box.
  const box = (name: 'Alice' | 'Bob' | 'Carol', k: number) => {
    const b = BOXES[name];
    return draw(handShape(boxCorners(X[name], b.cy, b.w, b.h), { seed: seed(k), jitter: j, startAt: (v.seed * 0.37 + k * 0.23) % 1 }));
  };
  const head = actor ? draw(handCircle(X.Alice, 30, 13, { seed: seed(1), jitter: Math.min(j, 1.5) })) : box('Alice', 1);
  const bob = box('Bob', 2);
  const carol = box('Carol', 3);

  // 2. Alice's body, arms and legs, quickly — a stick figure.
  const figure = [head];
  if (actor) {
    const x = X.Alice;
    figure.push(draw(handLine({ x, y: 44 }, { x: x + 1, y: 76 }, { seed: seed(4), jitter: 0.6 })));
    figure.push(draw(handLine({ x: x - 18, y: 56 }, { x: x + 18, y: 57 }, { seed: seed(5), jitter: 0.6 }), 500));
    figure.push(draw(handPath([{ x: x - 14, y: 100 }, { x: x + 1, y: 76 }, { x: x + 15, y: 100 }], { seed: seed(6), jitter: 0.5, density: 0.8 }), 500));
  }

  // 3. The lifelines: from under each box (or under Alice's name) down the page — one stroke, or dashes.
  const topOf = (name: 'Alice' | 'Bob' | 'Carol') => (actor && name === 'Alice' ? 132 : BOXES[name].cy + BOXES[name].h / 2 + 3);
  const lifeline = (name: 'Alice' | 'Bob' | 'Carol', k: number): string[] => {
    const x = X[name];
    if (v.style !== 'dashed') return [draw(handLine({ x: x + 1, y: topOf(name) }, { x: x - 1, y: BOTTOM }, { seed: seed(k), jitter: j * 0.5 }))];
    return dashesAlong({ x, y: topOf(name) + 1 }, { x, y: BOTTOM }, { seed: seed(k), dash: 13, gap: 9 }).map((pts, i) => draw(pts, i ? 180 + Math.round(r() * 80) : 4000));
  };
  const lines = { Alice: lifeline('Alice', 11), Bob: lifeline('Bob', 12), Carol: lifeline('Carol', 13) };

  // 4. The names: in each box, or under Alice's figure.
  const writing = (x: number, y: number, w: number, h: number, k: number) => draw(handText(x, y, w, h, { seed: seed(k), humps: Math.max(2, Math.round(w / 20)), jitter: 1 }));
  const aName = actor ? writing(X.Alice - 28, 106, 56, 16, 21) : writing(X.Alice - 30, BOXES.Alice.cy - 10, 60, 19, 21);
  const bName = writing(X.Bob - 22, BOXES.Bob.cy - 10, 44, 19, 22);
  const cName = writing(X.Carol - 30, BOXES.Carol.cy - 10, 60, 19, 23);

  // 5. The messages, down the page, each with its label written above it.
  const m1 = draw(handArrow({ x: X.Alice + 3, y: Y.m1 }, { x: X.Bob - 4, y: Y.m1 + 1 }, { wings: 2, headLen: 14, seed: seed(31), jitter: j * 0.6 }));
  const l1 = writing(X.Alice + 70, Y.m1 - 25, 100, 17, 41);
  const m2 = draw(selfLoop(X.Bob + 4, Y.m2, 62, 42, { seed: seed(32), jitter: Math.min(j * 0.5, 1.2) }));
  const l2 = writing(X.Bob + 14, Y.m2 - 23, 62, 16, 42);
  const m3 = draw(handArrow({ x: X.Bob + 4, y: Y.m3 }, { x: X.Carol - 4, y: Y.m3 - 1 }, { wings: 2, headLen: 14, seed: seed(33), jitter: j * 0.6 }));
  const l3 = writing(X.Bob + 110, Y.m3 - 25, 90, 17, 43);
  // The return: dashes from Carol back toward Alice, across Bob's lifeline, then the chevron at Alice.
  const dashes = dashesAlong({ x: X.Carol - 4, y: Y.m4 }, { x: X.Alice + 22, y: Y.m4 }, { seed: seed(34), dash: 14, gap: 9 }).map((pts, i) => draw(pts, i ? 200 + Math.round(r() * 60) : 4000));
  const head4 = draw(chevron({ x: X.Alice + 4, y: Y.m4 }, { x: -1, y: 0 }, 15, { seed: seed(35) }), v.headAfter);
  const l4 = writing(X.Alice + 120, Y.m4 - 25, 70, 17, 44);

  const alice = actor
    ? { symbol: 'actor' as const, figure, lifeline: lines.Alice, name: [aName] }
    : { symbol: 'participant' as const, figure, lifeline: lines.Alice, name: [aName] };
  return {
    participants: {
      Alice: alice,
      Bob: { symbol: 'participant', figure: [bob], lifeline: lines.Bob, name: [bName] },
      Carol: { symbol: 'participant', figure: [carol], lifeline: lines.Carol, name: [cName] },
    },
    messages: [
      { name: 'request', ids: [m1], kind: 'call', from: 'Alice', to: 'Bob', label: [l1] },
      { name: 'validate', ids: [m2], kind: 'self', from: 'Bob', to: 'Bob', label: [l2] },
      { name: 'store', ids: [m3], kind: 'call', from: 'Bob', to: 'Carol', label: [l3] },
      { name: 'done', ids: [...dashes, head4], kind: 'return', from: 'Carol', to: 'Alice', label: [l4] },
    ],
  };
}
