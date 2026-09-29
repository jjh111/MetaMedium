// The state-diagram board (V1-PLAN §9 D5's state half): drawn the way a hand
// draws one — jittered strokes, each state a rounded box, an initial dot
// scribbled solid, a final state a ring round a dot, transitions as arrows
// with their words written beside them, a loop out of a state and back — and
// what it should read as.
//
// The board, left to right:
//
//                               ( tick )
//                                +----+
//                                |    v
//    (•) ---> [ Idle ] --start--> [ Running ] --stop--> (◉)
//                 ^                    |
//                 |                    | pause
//                 +---- resume ---- [ Paused ]
//
//   the initial state   a small dot, scribbled solid in one stroke (`dot`)
//   Idle, Running,      rounded boxes: a box whose corners are round, its name written in it
//   Paused
//   the final state     a ring with a smaller mark inside — a scribbled dot, or a second ring (`final`)
//   transitions         arrows, each one stroke with its own barb; Running's tick is a loop out of the
//                       top of the box and back, its barb where it arrives
//
// Strokes are drawn four seconds apart, so the letter rules gather none of
// them into a word. Everything is deterministic: a variant is a seed, a
// wobble, a tilt of the whole page, how the initial dot and the final state
// are drawn.
//
// The ids the golden (state.mermaid.ts) names are the states' boxes, drawn
// first on every hand: Idle `stroke:1`, Running `stroke:2`, Paused `stroke:3`.

import type { Point } from '../../types';
import type { Session } from '../../session/session';
import { handLine, handArrow, handText, handCircle, handDot, rng } from '../../test/strokes';
import { handShape, boxCorners } from './hand';
import { handPath } from './sequence';

export interface StateVariant {
  seed: number;
  /** Wobble in px. */
  jitter: number;
  /** How far the whole page is turned, in degrees — a hand's page is never square to the screen. */
  tilt: number;
  /** The initial dot: a spiral in, or a zigzag across. */
  dot: 'spiral' | 'zigzag';
  /** The final state: a ring round a scribbled dot, round a tap, or round a second ring. */
  final: 'filled' | 'tap' | 'ring';
}

export const STATE_VARIANTS: StateVariant[] = [];
for (const seed of [1, 2, 3, 4, 5, 6]) {
  for (const jitter of [1.5, 3]) {
    for (const tilt of [0, 3, -3]) {
      const k = STATE_VARIANTS.length;
      STATE_VARIANTS.push({ seed: seed * 10 + k, jitter, tilt, dot: k % 2 ? 'zigzag' : 'spiral', final: (['filled', 'tap', 'ring'] as const)[k % 3] });
    }
  }
}

/** What the board should read as: states and transitions by name, each with the marks it is drawn with. */
export interface StateExpected {
  states: Record<'Idle' | 'Running' | 'Paused', { box: string[]; name: string[] }>;
  /** The initial dot's marks. */
  initial: string[];
  /** The final state's marks: the ring, and what is inside it. */
  final: string[];
  /** The transitions, in the order they are drawn. */
  transitions: {
    name: string;
    /** The stroke that draws it: the arrow, or the loop. */
    id: string;
    from: 'initial' | 'Idle' | 'Running' | 'Paused';
    to: 'Idle' | 'Running' | 'Paused' | 'final';
    /** The writing beside it. */
    label: string[];
    self: boolean;
  }[];
}

/** What a model that can see reads the writing as. */
export const STATE_WORDS = {
  names: { Idle: 'Idle', Running: 'Running', Paused: 'Paused' },
  transitions: ['start', 'tick', 'stop', 'pause', 'resume'],
};

// ===== Drawing by hand =====

/** A spot filled solid in one stroke, as a hand fills one: a spiral in from its edge, or a zigzag across it. */
export function filledDot(cx: number, cy: number, r: number, o: { style?: 'spiral' | 'zigzag'; seed?: number; jitter?: number } = {}): Point[] {
  const rand = rng((o.seed ?? 1) * 211 + 5);
  const jitter = o.jitter ?? 0.6;
  const pts: Point[] = [];
  if ((o.style ?? 'spiral') === 'spiral') {
    const turns = Math.max(3, r / 2);
    const n = Math.round(turns * 28);
    const a0 = rand() * Math.PI * 2;
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const rr = r * (1 - 0.88 * t);
      const a = a0 + t * turns * Math.PI * 2;
      pts.push({ x: cx + rr * Math.cos(a) + (rand() - 0.5) * jitter, y: cy + rr * Math.sin(a) + (rand() - 0.5) * jitter });
    }
    return pts;
  }
  // Back and forth across the circle, top to bottom, each pass a few pixels lower.
  const passes = Math.max(6, Math.round(r / 1.4));
  for (let k = 0; k <= passes; k++) {
    const y = -r * 0.92 + (1.84 * r * k) / passes;
    const half = Math.sqrt(Math.max(0, r * r - y * y)) * 0.94;
    const [x0, x1] = k % 2 ? [half, -half] : [-half, half];
    for (let i = 0; i <= 6; i++) pts.push({ x: cx + x0 + ((x1 - x0) * i) / 6 + (rand() - 0.5) * jitter, y: cy + y + (rand() - 0.5) * jitter });
  }
  return pts;
}

/**
 * A loop out of the top of a box and back: from `(x0, y)` up `h`, across to
 * `x1`, and down to `(x1, y)` where its barb is — the pen turning back out
 * along one wing to the tip, and out along the other, as a hand draws an
 * arrow's head.
 */
export function loopOver(x0: number, x1: number, y: number, h: number, o: { seed?: number; jitter?: number; barb?: number } = {}): Point[] {
  const b = o.barb ?? 12;
  const tip = { x: x1, y };
  const wing = (side: 1 | -1): Point => ({ x: tip.x + side * b * Math.sin(Math.PI / 6), y: tip.y - b * Math.cos(Math.PI / 6) });
  return handPath([{ x: x0, y }, { x: x0, y: y - h }, { x: x1, y: y - h }, tip, wing(-1), tip, wing(1)], { seed: o.seed, jitter: o.jitter ?? 1, density: 0.5 });
}

// ===== The board =====

const BOX = {
  Idle: { cx: 330, cy: 150, w: 150, h: 64 },
  Running: { cx: 640, cy: 150, w: 170, h: 64 },
  Paused: { cx: 640, cy: 350, w: 150, h: 64 },
};
const DOT = { cx: 110, cy: 150, r: 10 };
const FINAL = { cx: 940, cy: 150, r: 20 };
/** The page turns about its middle. */
const PIVOT = { x: 520, y: 240 };

/** Draw the state board on a session. Returns what it should read as. */
export function drawState(s: Session, v: StateVariant, t0 = 1000, o: { quick?: boolean; round?: number } = {}): StateExpected {
  let t = t0;
  const c = Math.cos((v.tilt * Math.PI) / 180), sn = Math.sin((v.tilt * Math.PI) / 180);
  const turn = (p: Point): Point => ({ x: PIVOT.x + (p.x - PIVOT.x) * c - (p.y - PIVOT.y) * sn, y: PIVOT.y + (p.x - PIVOT.x) * sn + (p.y - PIVOT.y) * c });
  const draw = (pts: Point[], gap = 4000) => s.addStroke(pts.map(turn), (t += gap));
  const j = v.jitter;
  const seed = (k: number) => v.seed * 100 + k;
  const start = (k: number) => (v.seed * 0.37 + k * 0.23) % 1;
  const arrow = (from: Point, to: Point, k: number) => handArrow(from, to, { wings: 2, headLen: 15, seed: seed(k), jitter: j * 0.6 });
  const words = (x: number, y: number, w: number, h: number, k: number) => handText(x, y, w, h, { seed: seed(k), humps: Math.max(4, Math.round(w / 15)), jitter: 1 });

  // 1. The states, first on every hand: rounded boxes.
  const box = (name: keyof typeof BOX, k: number) => {
    const b = BOX[name];
    return draw(handShape(boxCorners(b.cx, b.cy, b.w, b.h), { seed: seed(k), jitter: j, startAt: start(k), round: o.round ?? 0.3 }));
  };
  const idle = box('Idle', 1), running = box('Running', 2), paused = box('Paused', 3);

  // 2. The initial dot and the final state.
  const initial = [draw(filledDot(DOT.cx, DOT.cy, DOT.r, { style: v.dot, seed: seed(4), jitter: 0.6 }))];
  const final = [draw(handCircle(FINAL.cx, FINAL.cy, FINAL.r, { seed: seed(5), jitter: Math.min(j, 2) }))];
  // What is inside the ring: drawn seconds after it, or — `quick` — right after it, when the letter rules gather the two into a word.
  const gap = o.quick ? 300 : 4000;
  final.push(
    v.final === 'filled'
      ? draw(filledDot(FINAL.cx, FINAL.cy, 9, { style: v.seed % 2 ? 'spiral' : 'zigzag', seed: seed(6), jitter: 0.5 }), gap)
      : v.final === 'tap'
        ? draw(handDot(FINAL.cx, FINAL.cy, 5, { seed: seed(6) }), gap)
        : draw(handCircle(FINAL.cx, FINAL.cy, 10, { seed: seed(6), jitter: 1 }), gap)
  );

  // 3. The transitions.
  const t0id = draw(arrow({ x: DOT.cx + DOT.r + 6, y: DOT.cy }, { x: BOX.Idle.cx - BOX.Idle.w / 2 - 2, y: BOX.Idle.cy }, 11));
  const t1 = draw(arrow({ x: BOX.Idle.cx + BOX.Idle.w / 2 + 2, y: BOX.Idle.cy }, { x: BOX.Running.cx - BOX.Running.w / 2 - 2, y: BOX.Running.cy }, 12));
  const l1 = draw(words(BOX.Idle.cx + 95, BOX.Idle.cy - 34, 52, 21, 21));
  const top = BOX.Running.cy - BOX.Running.h / 2;
  const t2 = draw(loopOver(BOX.Running.cx - 26, BOX.Running.cx + 26, top - 5, 44, { seed: seed(13), jitter: Math.min(j * 0.5, 1.2) }));
  const l2 = draw(words(BOX.Running.cx - 22, top - 74, 44, 21, 22));
  const t3 = draw(arrow({ x: BOX.Running.cx + BOX.Running.w / 2 + 2, y: BOX.Running.cy }, { x: FINAL.cx - FINAL.r - 2, y: FINAL.cy }, 14));
  const l3 = draw(words(BOX.Running.cx + 112, BOX.Running.cy - 34, 48, 21, 23));
  const t4 = draw(arrow({ x: BOX.Running.cx, y: BOX.Running.cy + BOX.Running.h / 2 + 2 }, { x: BOX.Paused.cx, y: BOX.Paused.cy - BOX.Paused.h / 2 - 2 }, 15));
  const l4 = draw(words(BOX.Running.cx + 16, 250, 48, 21, 24));
  const t5 = draw(arrow({ x: BOX.Paused.cx - BOX.Paused.w / 2 - 2, y: BOX.Paused.cy }, { x: BOX.Idle.cx + 6, y: BOX.Idle.cy + BOX.Idle.h / 2 + 2 }, 16));
  const l5 = draw(words(BOX.Idle.cx + 108, 300, 62, 21, 25));

  // 4. The names, in the boxes.
  const n1 = draw(words(BOX.Idle.cx - 20, BOX.Idle.cy - 10, 40, 22, 31));
  const n2 = draw(words(BOX.Running.cx - 30, BOX.Running.cy - 10, 60, 22, 32));
  const n3 = draw(words(BOX.Paused.cx - 26, BOX.Paused.cy - 10, 52, 22, 33));

  return {
    states: { Idle: { box: [idle], name: [n1] }, Running: { box: [running], name: [n2] }, Paused: { box: [paused], name: [n3] } },
    initial,
    final,
    transitions: [
      { name: 'begin', id: t0id, from: 'initial', to: 'Idle', label: [], self: false },
      { name: 'start', id: t1, from: 'Idle', to: 'Running', label: [l1], self: false },
      { name: 'tick', id: t2, from: 'Running', to: 'Running', label: [l2], self: true },
      { name: 'stop', id: t3, from: 'Running', to: 'final', label: [l3], self: false },
      { name: 'pause', id: t4, from: 'Running', to: 'Paused', label: [l4], self: false },
      { name: 'resume', id: t5, from: 'Paused', to: 'Idle', label: [l5], self: false },
    ],
  };
}

/** The states of a board, as a session's marks, for tests that draw a board of their own: a rounded box at `(cx, cy)`. */
export function drawRoundedBox(s: Session, t: { at: number }, cx: number, cy: number, o: { w?: number; h?: number; seed?: number; jitter?: number } = {}): string {
  return s.addStroke(handShape(boxCorners(cx, cy, o.w ?? 150, o.h ?? 64), { seed: o.seed ?? 1, jitter: o.jitter ?? 2, round: 0.3 }), (t.at += 4000));
}

/** A straight arrow, one stroke with its own barb. */
export function drawArrowBetween(s: Session, t: { at: number }, from: Point, to: Point, o: { seed?: number; jitter?: number } = {}): string {
  return s.addStroke(handArrow(from, to, { wings: 2, headLen: 15, seed: o.seed ?? 1, jitter: o.jitter ?? 1.2 }), (t.at += 4000));
}

/** A plain line, no head. */
export function drawLineBetween(s: Session, t: { at: number }, from: Point, to: Point, o: { seed?: number; jitter?: number } = {}): string {
  return s.addStroke(handLine(from, to, { seed: o.seed ?? 1, jitter: o.jitter ?? 1.2 }), (t.at += 4000));
}
