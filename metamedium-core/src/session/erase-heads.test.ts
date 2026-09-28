// A head is not a scratch (V1-PLAN §9 W1, finding 1).
//
// Erasing is relational: three crossings of a mark's own outline rub it out
// (erase.ts). An arrow drawn in one stroke whose two-wing head lands on a
// box's outline crosses it three or four times — in along the shaft, out
// along one wing, back to the tip, out along the other — and the scratch rule
// rubbed the box out. Drawing an arrow into a box is the commonest act in a
// diagram, and a magnet that snaps the tip onto the outline makes it likelier
// (found by E2: an arrow had to stop short and let the bind carry its tip on).
//
// The rule: crossings that all fall within the stroke's own head — the barb
// at one end, measured from the stroke, relative to its own size — are the
// head arriving, not a scratch; nor are crossings at an end the pen's magnet
// would bind to that mark. A real scratch still erases: back and forth
// across a mark, two to four passes, sparse or dense, at any size and zoom.

import { describe, it, expect } from 'vitest';
import type { Point } from '../types';
import { createSession, type Session } from './session';
import { getRep } from './nodes';
import { scratchedOut } from './erase';
import { getFingerprint } from '../geometry';
import { magnetSites } from './magnets';
import { handArrow, handLine, handCircle, handTriangle, handPolygon, rng } from '../test/strokes';
import { handShape, boxCorners } from '../notations/fixtures/hand';

// ===== Drawing =====

const DEG = Math.PI / 180;
const turn = (v: Point, deg: number): Point => ({ x: v.x * Math.cos(deg * DEG) - v.y * Math.sin(deg * DEG), y: v.x * Math.sin(deg * DEG) + v.y * Math.cos(deg * DEG) });

/** Where segment p→q first meets the ring, as a share of p→q. */
function firstHit(p: Point, q: Point, ring: Point[]): number {
  let best = Infinity;
  for (let i = 1; i < ring.length; i++) {
    const a = ring[i - 1], b = ring[i];
    const d = (q.x - p.x) * (b.y - a.y) - (q.y - p.y) * (b.x - a.x);
    if (Math.abs(d) < 1e-12) continue;
    const t = ((a.x - p.x) * (b.y - a.y) - (a.y - p.y) * (b.x - a.x)) / d;
    const u = ((a.x - p.x) * (q.y - p.y) - (a.y - p.y) * (q.x - p.x)) / d;
    if (t >= 0 && t <= 1 && u >= 0 && u <= 1 && t < best) best = t;
  }
  return best;
}

/** The point where a ray from far outside, heading `dir` at `aim`, first lands on the ink: ON the outline, as a hand's tip lands. */
function onTheInk(ink: Point[], aim: Point, dir: Point): Point {
  const from = { x: aim.x - dir.x * 2000, y: aim.y - dir.y * 2000 };
  const to = { x: aim.x + dir.x * 200, y: aim.y + dir.y * 200 };
  const t = firstHit(from, to, ink.concat([ink[0]]));
  if (!Number.isFinite(t)) throw new Error('the ray missed the box');
  return { x: from.x + (to.x - from.x) * t, y: from.y + (to.y - from.y) * t };
}

const SIZES = [
  { name: 'small', w: 90, h: 60, len: 80, head: 11 },
  { name: 'medium', w: 200, h: 120, len: 180, head: 22 },
  { name: 'large', w: 500, h: 300, len: 420, head: 48 },
] as const;

const SIDES = [
  { name: 'left', dir: { x: 1, y: 0 } },
  { name: 'right', dir: { x: -1, y: 0 } },
  { name: 'top', dir: { x: 0, y: 1 } },
  { name: 'bottom', dir: { x: 0, y: -1 } },
] as const;

type Head = 'one wing' | 'two wings' | 'a chevron apart' | 'two wings apart' | 'a closed triangle apart';
const HEADS: Head[] = ['one wing', 'two wings', 'a chevron apart', 'two wings apart', 'a closed triangle apart'];

const CX = 1000, CY = 1000;

function sideMiddle(side: (typeof SIDES)[number], w: number, h: number): Point {
  return side.name === 'left' ? { x: CX - w / 2, y: CY } : side.name === 'right' ? { x: CX + w / 2, y: CY } : side.name === 'top' ? { x: CX, y: CY - h / 2 } : { x: CX, y: CY + h / 2 };
}

/** The strokes an arrow is drawn with, its tip at `tip`, arriving along `dir`: in one stroke, or its head apart. */
function arrowStrokes(tip: Point, dir: Point, len: number, headLen: number, head: Head, seed: number, jitter: number): Point[][] {
  const tail = { x: tip.x - dir.x * len, y: tip.y - dir.y * len };
  if (head === 'one wing' || head === 'two wings') return [handArrow(tail, tip, { wings: head === 'one wing' ? 1 : 2, headLen, seed, jitter })];
  const shaft = handLine(tail, tip, { seed, jitter: jitter * 0.6 });
  const back = { x: -dir.x, y: -dir.y };
  const wing = (sgn: number) => {
    const v = turn(back, 30 * sgn);
    return { x: tip.x + v.x * headLen, y: tip.y + v.y * headLen };
  };
  const quiet = { jitter: jitter * 0.4 };
  if (head === 'a chevron apart') return [shaft, [...handLine(wing(1), tip, { seed: seed + 5, ...quiet }), ...handLine(tip, wing(-1), { seed: seed + 6, ...quiet }).slice(1)]];
  if (head === 'two wings apart') return [shaft, handLine(tip, wing(1), { seed: seed + 5, ...quiet }), handLine(tip, wing(-1), { seed: seed + 6, ...quiet })];
  return [shaft, handPolygon([tip, wing(1), wing(-1)], { seed: seed + 5, jitter: Math.min(1, jitter * 0.4), round: 0.05, density: 0.6, startAt: 0.1 })];
}

interface Drawn {
  s: Session;
  box: string;
  ink: Point[];
  ids: string[];
}

/** A hand's box, then an arrow into it from `side`, arriving `angle`° off square, its tip `into` px past where it lands on the ink (0: ON the outline). */
function arrowIntoBox(size: (typeof SIZES)[number], side: (typeof SIDES)[number], angle: number, head: Head, into: number, seed: number, jitter: number, scale = 1): Drawn {
  const s = createSession();
  const ink = handShape(boxCorners(CX, CY, size.w, size.h), { seed: seed * 17 + size.w, jitter: Math.max(1, jitter) });
  const box = s.addStroke(ink, 1000, undefined, scale);
  const dir = turn(side.dir, angle);
  const landed = onTheInk(ink, sideMiddle(side, size.w, size.h), dir);
  const tip = { x: landed.x + dir.x * into, y: landed.y + dir.y * into };
  const ids = arrowStrokes(tip, dir, size.len, size.head, head, seed, jitter).map((pts, k) => s.addStroke(pts, 5000 + k * 600, undefined, scale));
  return { s, box, ink, ids };
}

const erased = (s: Session, id: string) => !!getRep(s.getState().nodes.get(id)!, 'erased');
const gesture = (s: Session, id: string) => getRep(s.getState().nodes.get(id)!, 'gesture')?.data as { role?: string } | undefined;

// ===== A hand's scratch =====

/**
 * A scratch across a band `w` × `h` centred on (cx, cy), turned `turnDeg`:
 * `passes` strokes back and forth, each drifting down the band toward the
 * next — `step` px between samples (6 a slow pen, 30 a fast one, what
 * defeated the old density rule), a hand's wobble on every sample. A
 * two-pass scratch leaves the band well below where it began, so it is an
 * open stroke: a closed one is a lasso, never a scratch (erase.ts).
 */
function handScratch(cx: number, cy: number, w: number, h: number, passes: number, o: { step: number; jitter: number; seed: number; turnDeg?: number }): Point[] {
  const r = rng(o.seed * 97 + 11);
  const pts: Point[] = [];
  const put = (x: number, y: number) => {
    const p = turn({ x, y }, o.turnDeg ?? 0);
    pts.push({ x: cx + p.x + (r() - 0.5) * 2 * o.jitter, y: cy + p.y + (r() - 0.5) * 2 * o.jitter });
  };
  // Two passes: along the band's top, then a long diagonal down and back, ending well clear of where it began.
  const rows = passes === 2 ? [-h / 2, -h / 2, h * 2] : Array.from({ length: passes + 1 }, (_, i) => -h / 2 + (h * i) / passes);
  for (let i = 0; i < passes; i++) {
    const rightward = i % 2 === 0;
    const x0 = rightward ? -w / 2 : w / 2, x1 = rightward ? w / 2 : -w / 2;
    const n = Math.max(2, Math.round(w / o.step));
    for (let k = i === 0 ? 0 : 1; k <= n; k++) {
      const u = k / n;
      put(x0 + (x1 - x0) * u, rows[i] + (rows[i + 1] - rows[i]) * u);
    }
  }
  return pts;
}

// ===== The finding =====

describe('a head is not a scratch: an arrow drawn into a box leaves the box standing', () => {
  for (const size of SIZES) {
    for (const head of HEADS) {
      it(`${size.name}: the head drawn as ${head}, its tip on the outline, from every side — the box stands and the arrow is ink`, () => {
        const lost: string[] = [];
        for (const side of SIDES) {
          for (const angle of [0, 30, -30]) {
            for (const into of [0, 3]) {
              for (const jitter of [0, 1, 2.5]) {
                for (const seed of [1, 2]) {
                  const d = arrowIntoBox(size, side, angle, head, into, seed, jitter);
                  const took = d.ids.filter((id) => gesture(d.s, id));
                  if (erased(d.s, d.box) || took.length) lost.push(`${side.name} ${angle}° tip ${into ? 'poking 3 px in' : 'on the ink'} jitter ${jitter} seed ${seed}${took.length ? ` — ${took.length} stroke(s) read as ${took.map((id) => gesture(d.s, id)?.role).join(', ')}` : ''}`);
                }
              }
            }
          }
        }
        expect(lost, `the box rubbed out ${lost.length} of 72 times:\n  ${lost.slice(0, 6).join('\n  ')}`).toEqual([]);
      });
    }
  }

  it('at a tenth and at twice the zoom, the same: the head is measured on the stroke, not in pixels', () => {
    const lost: string[] = [];
    for (const scale of [0.5, 2, 10]) {
      for (const side of SIDES) {
        for (const seed of [1, 2, 3]) {
          const d = arrowIntoBox(SIZES[1], side, 0, 'two wings', 0, seed, 1, scale);
          if (erased(d.s, d.box)) lost.push(`scale ${scale} ${side.name} seed ${seed}`);
        }
      }
    }
    expect(lost).toEqual([]);
  });

  it("E2's own arrow, its tip ON B's edge rather than three pixels short: B stands", () => {
    const s = createSession();
    const box = (x: number, y: number, at: number) => s.addStroke(handPolygon([{ x, y }, { x: x + 200, y }, { x: x + 200, y: y + 120 }, { x, y: y + 120 }], { seed: 5, jitter: 0, round: 0.02, startAt: 0.1 }), at);
    box(100, 100, 1000);
    const b = box(700, 100, 1500);
    const ar = s.addStroke(handArrow({ x: 300, y: 160 }, { x: 700, y: 160 }, { wings: 2, headLen: 24, seed: 3, jitter: 0 }), 2000, undefined, 1);
    expect(erased(s, b)).toBe(false);
    expect(gesture(s, ar)).toBeUndefined();
  });
});

describe('nor is an end the magnet binds: the tip bound to the box leaves it standing', () => {
  for (const size of SIZES) {
    for (const head of ['two wings', 'a chevron apart'] as Head[]) {
      it(`${size.name}: the head drawn as ${head}, the tip on the side's own middle and bound there — the box stands, bound`, () => {
        const lost: string[] = [];
        for (const side of SIDES) {
          for (const seed of [1, 2, 3]) {
            const s = createSession();
            const ink = handShape(boxCorners(CX, CY, size.w, size.h), { seed: seed * 17 + size.w, jitter: 1.5 });
            const box = s.addStroke(ink, 1000);
            const aim = sideMiddle(side, size.w, size.h);
            // The site the magnet holds the pen on: the middle of that side of the box's own form.
            const site = magnetSites(s.getState().nodes.get(box)!, s.getState().nodes)
              .filter((x) => x.kind === 'middle')
              .sort((p, q) => Math.hypot(p.point.x - aim.x, p.point.y - aim.y) - Math.hypot(q.point.x - aim.x, q.point.y - aim.y))[0];
            const strokes = arrowStrokes(site.point, side.dir, size.len, size.head, head, seed, 1);
            const ids = strokes.map((pts, k) => s.addStroke(pts, 5000 + k * 600));
            // The pen's end is where the shaft ends: its last point, in one stroke with its head, its tip.
            s.bind({ strokeId: ids[0], nodeId: box, site: { kind: site.kind, index: site.index }, end: 'end', at: 5000 + strokes.length * 600 });
            const bound = s.getState().nodes.get(ids[0])!.edges.some((e) => e.rel === 'bound-to' && e.to === box);
            if (erased(s, box) || ids.some((id) => gesture(s, id)) || !bound) lost.push(`${side.name} seed ${seed}${bound ? '' : ' — not bound'}`);
          }
        }
        expect(lost, `lost ${lost.length} of 12:\n  ${lost.join('\n  ')}`).toEqual([]);
      });
    }
  }
});

// ===== The control: a real scratch still erases =====

describe('a real scratch still erases — back and forth across a mark, two to four passes, sparse or dense, at any size and zoom', () => {
  const TARGETS = {
    box: (size: number, seed: number) => handShape(boxCorners(CX, CY, size, size * 0.6), { seed }),
    circle: (size: number, seed: number) => handCircle(CX, CY, size / 2, { seed }),
    triangle: (size: number, seed: number) => handTriangle({ x: CX, y: CY - size / 2 }, { x: CX + size / 2, y: CY + size / 2 }, { x: CX - size / 2, y: CY + size / 2 }, { seed }),
    line: (size: number, seed: number) => handLine({ x: CX - size / 2, y: CY }, { x: CX + size / 2, y: CY + 3 }, { seed }),
  };
  for (const [name, draw] of Object.entries(TARGETS)) {
    it(`across a ${name}: every open stroke that crosses it three times — the bare rule — still erases it`, () => {
      const differ: string[] = [];
      let cases = 0, scratches = 0;
      for (const size of [60, 150, 400]) {
        for (const passes of [2, 3, 4]) {
          for (const step of [6, 30]) {
            for (const zoom of [0.5, 1, 2]) {
              for (const turnDeg of [0, 25, 80]) {
                for (const seed of [1, 2]) {
                  const scale = 1 / zoom;
                  const s = createSession();
                  const ink = draw(size, seed);
                  const target = s.addStroke(ink, 1000, undefined, scale);
                  const closed = getFingerprint(ink, scale).isClosed;
                  const pts = handScratch(CX, CY, size * 1.3, name === 'line' ? size * 0.5 : size * 0.4, passes, { step: step * scale, jitter: 1.5 * scale, seed, turnDeg });
                  // The bare rule, with nothing excused: an open stroke crossing the mark's own outline three times.
                  const bare = !getFingerprint(pts, scale).isClosed && scratchedOut(pts, [{ id: target, points: ink, closed }]).length === 1;
                  s.addStroke(pts, 5000, undefined, scale);
                  cases++;
                  if (bare) scratches++;
                  if (erased(s, target) !== bare) differ.push(`${size} ${passes} passes step ${step} zoom ${zoom} turned ${turnDeg}° seed ${seed}: the bare rule says ${bare ? 'erase' : 'keep'}`);
                }
              }
            }
          }
        }
      }
      expect(cases).toBe(324);
      expect(scratches).toBeGreaterThan(100);
      expect(differ, differ.slice(0, 6).join('\n')).toEqual([]);
    });
  }

  it('three passes across a box, sparse and dense, at three sizes and three zooms: erased, every one', () => {
    const missed: string[] = [];
    for (const size of [60, 150, 400]) {
      for (const passes of [3]) {
        for (const step of [6, 30]) {
          for (const zoom of [0.5, 1, 2]) {
            for (const seed of [1, 2, 3]) {
              const scale = 1 / zoom;
              const s = createSession();
              const box = s.addStroke(handShape(boxCorners(CX, CY, size, size * 0.6), { seed }), 1000, undefined, scale);
              s.addStroke(handScratch(CX, CY, size * 1.3, size * 0.4, passes, { step: step * scale, jitter: 1.5 * scale, seed }), 5000, undefined, scale);
              if (!erased(s, box)) missed.push(`${size} ${passes} passes step ${step} zoom ${zoom} seed ${seed}`);
            }
          }
        }
      }
    }
    expect(missed).toEqual([]);
  });

  it('two passes, steep enough to be an open stroke, across a box: erased at every size and zoom', () => {
    const missed: string[] = [];
    for (const size of [60, 150, 400]) {
      for (const zoom of [0.5, 1, 2]) {
        for (const seed of [1, 2, 3]) {
          const scale = 1 / zoom;
          const s = createSession();
          const box = s.addStroke(handShape(boxCorners(CX, CY, size, size * 0.6), { seed }), 1000, undefined, scale);
          const sc = s.addStroke(handScratch(CX, CY, size * 1.3, size * 0.4, 2, { step: 6 * scale, jitter: 1.5 * scale, seed }), 5000, undefined, scale);
          if (gesture(s, sc)?.role !== 'scratch' || !erased(s, box)) missed.push(`${size} zoom ${zoom} seed ${seed}: ${gesture(s, sc)?.role ?? 'ink'}`);
        }
      }
    }
    expect(missed).toEqual([]);
  });

  it('a scratch across an arrow rubs the arrow out, and one across a box with an arrow in it rubs out the box', () => {
    const d = arrowIntoBox(SIZES[1], SIDES[0], 0, 'two wings', -12, 1, 1);
    const s = d.s;
    const arrowId = d.ids[0];
    expect(erased(s, d.box)).toBe(false);
    // Across the arrow's shaft, three passes.
    s.addStroke(handScratch(CX - 100 - 90, CY, 40, 60, 3, { step: 6, jitter: 1, seed: 4, turnDeg: 90 }), 9000);
    expect(erased(s, arrowId)).toBe(true);
    // And across the box.
    s.addStroke(handScratch(CX, CY, 260, 50, 3, { step: 8, jitter: 1, seed: 5 }), 10000);
    expect(erased(s, d.box)).toBe(true);
  });
});

// ===== An open mark too (found by the sequence-diagram unit) =====

describe('an open mark too: a message whose tip crosses a lifeline leaves the lifeline standing', () => {
  const lifeline = (s: Session, seed: number) => s.addStroke(handLine({ x: 500, y: 100 }, { x: 502, y: 700 }, { seed, jitter: 1 }), 1000);

  it('a message drawn to a lifeline from either side, at three sizes, its tip on it or past it with the barb back across — the lifeline stands and the message is ink', () => {
    const lost: string[] = [];
    for (const from of [-1, 1]) {
      for (const [len, headLen] of [[120, 12], [200, 18], [360, 30]]) {
        for (const past of [0, 3, 6]) {
          for (const head of ['one wing', 'two wings', 'a chevron apart'] as Head[]) {
            for (const seed of [1, 2, 3]) {
              const s = createSession();
              const line = lifeline(s, seed);
              const y = 250 + seed * 60;
              const dir = { x: -from, y: 0 };
              const tip = { x: 501 + dir.x * past, y };
              const ids = arrowStrokes(tip, dir, len, headLen, head, seed, 1).map((pts, k) => s.addStroke(pts, 5000 + k * 600));
              const took = ids.filter((id) => gesture(s, id));
              if (erased(s, line) || took.length) lost.push(`${from < 0 ? 'from the left' : 'from the right'} ${len} past ${past} ${head} seed ${seed}${took.length ? ` — ${took.map((id) => gesture(s, id)?.role).join(', ')}` : ''}`);
            }
          }
        }
      }
    }
    expect(lost, `lost ${lost.length}:\n  ${lost.slice(0, 8).join('\n  ')}`).toEqual([]);
  });

  it('the control: a scratch across a lifeline still rubs it out', () => {
    for (const seed of [1, 2, 3]) {
      const s = createSession();
      const line = lifeline(s, seed);
      s.addStroke(handScratch(501, 400, 60, 50, 3, { step: 6, jitter: 1, seed }), 5000);
      expect(erased(s, line)).toBe(true);
    }
  });
});
