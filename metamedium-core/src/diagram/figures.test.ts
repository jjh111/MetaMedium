// Figures of several strokes — lines whose ends meet read as one figure
// (V1-PLAN §4, §9 E3; MATHS-PLAN §3, M3).
//
// Three ruled lines whose ends meet are a triangle; two strokes that each bend
// once and meet at both ends are a diamond — a quadrilateral turned about 45°,
// said as such. Ends meet when a magnet bound them, or when they come within
// the hand's reach of the corner their lines make; lines that merely cross are
// not a figure. A figure's sides keep the marks they were drawn with, so the
// maths can say which label sits on which side — and it goes to the solver
// through the maths lane's `polygonFigure`, so a triangle ruled in three
// strokes solves exactly as one drawn in a single stroke. Derived, like
// concepts: no node, no event.

import { describe, it, expect } from 'vitest';
import type { Bounds, Point } from '../types';
import { createSession } from '../session/session';
import type { Session } from '../session/session';
import { figuresOf, describeFigure } from './figures';
import { lineStroke, rectStroke, triangleStroke, handLine } from '../test/strokes';
import { solveBoard } from '../maths/solve';
import type { BoardMaths, Solution } from '../maths/solve';
import type { Figure } from '../maths/dimension';
import { TRIANGLE_LABELS, TRIANGLE_CORNERS, TRIANGLE_SQUARE, TRIANGLE_LABEL_BOXES, TRIANGLE_EXPECTED } from '../maths/fixtures/triangle';

const near = (a: Point, b: Point, tol = 1.5) => Math.hypot(a.x - b.x, a.y - b.y) <= tol;
const sameSet = (a: readonly string[], b: readonly string[]) => [...a].sort().join('|') === [...b].sort().join('|');

/** The side of a figure between two places, whichever way round. */
function sideBetween(f: Figure, p: Point, q: Point, tol = 12) {
  const side = f.sides.find((sd) => (near(sd.from, p, tol) && near(sd.to, q, tol)) || (near(sd.from, q, tol) && near(sd.to, p, tol)));
  if (!side) throw new Error('no such side');
  return side;
}

/** Strokes drawn a deliberate four seconds apart: no two of them are one word. */
function draw(s: Session, strokes: Point[][], t0 = 1000): string[] {
  return strokes.map((pts, i) => s.addStroke(pts, t0 + i * 4000));
}

const chevron = (a: Point, bend: Point, z: Point) => [...lineStroke(a, bend, 40), ...lineStroke(bend, z, 40).slice(1)];

describe('lines whose ends meet read as one figure', () => {
  it('a triangle ruled in three strokes: its corners, its sides by the marks that drew them, its angles', () => {
    const s = createSession();
    const { right, longLegEnd, shortLegEnd } = TRIANGLE_CORNERS;
    const [l1, l2, l3] = draw(s, [lineStroke(right, longLegEnd), lineStroke(shortLegEnd, right), lineStroke(longLegEnd, shortLegEnd)]);
    const figures = figuresOf(s.getState());
    expect(figures).toHaveLength(1);
    const f = figures[0];
    expect(f).toMatchObject({ kind: 'triangle', shape: 'triangle', closed: true });
    expect(sameSet(f.ids, [l1, l2, l3])).toBe(true);
    expect(f.vertices).toHaveLength(3);
    for (const corner of [right, longLegEnd, shortLegEnd]) expect(f.vertices.some((v) => near(v, corner))).toBe(true);
    expect(sideBetween(f, right, longLegEnd).ids).toEqual([l1]);
    expect(sideBetween(f, shortLegEnd, right).ids).toEqual([l2]);
    expect(sideBetween(f, longLegEnd, shortLegEnd).ids).toEqual([l3]);
    expect(f.angles!.map((a) => Math.round(a * 100) / 100).sort((a, b) => a - b)).toEqual([18.43, 71.57, 90]);
    expect(f.corners.map((c) => c.how)).toEqual(['touching', 'touching', 'touching']);
    expect(f.confidence).toBeGreaterThan(0.5);
    expect(f.reason).toMatch(/three/);
    expect(describeFigure(f)).toMatch(/triangle/);
  });

  it('a hand’s gaps and overshoots at the corners still meet', () => {
    const s = createSession();
    const { right, longLegEnd, shortLegEnd } = TRIANGLE_CORNERS;
    draw(s, [
      handLine({ x: right.x + 4, y: right.y + 1 }, { x: longLegEnd.x + 5, y: longLegEnd.y }, { seed: 3, jitter: 1.5 }),
      handLine({ x: shortLegEnd.x - 1, y: shortLegEnd.y - 4 }, { x: right.x, y: right.y - 5 }, { seed: 4, jitter: 1.5 }),
      handLine({ x: longLegEnd.x - 4, y: longLegEnd.y - 2 }, { x: shortLegEnd.x + 5, y: shortLegEnd.y + 1 }, { seed: 5, jitter: 1.5 }),
    ]);
    const figures = figuresOf(s.getState());
    expect(figures).toHaveLength(1);
    expect(figures[0].kind).toBe('triangle');
    // The corner is where the drawn lines meet. At the 18° corner a line drawn
    // a pixel and a half low moves that meeting some 1/sin 18° ≈ 3 times as far
    // along the other line, so the ink's corners stand within a few hand-widths
    // of the ones meant — and the sides within a few percent of their length.
    for (const corner of [right, longLegEnd, shortLegEnd]) expect(figures[0].vertices.some((v) => near(v, corner, 12))).toBe(true);
    const long = sideBetween(figures[0], right, longLegEnd, 14);
    expect(Math.abs(long.length - 240) / 240).toBeLessThan(0.05);
  });

  it('ends a magnet bound meet as bound', () => {
    const s = createSession();
    const { right, longLegEnd, shortLegEnd } = TRIANGLE_CORNERS;
    const l1 = s.addStroke(lineStroke(right, longLegEnd), 1000);
    const l2 = s.addStroke(lineStroke(longLegEnd, shortLegEnd), 5000);
    s.bind({ strokeId: l2, nodeId: l1, site: { kind: 'tip', index: 0 }, end: 'start', at: 5001 });
    const l3 = s.addStroke(lineStroke(shortLegEnd, right), 9000);
    s.bind({ strokeId: l3, nodeId: l2, site: { kind: 'tip', index: 0 }, end: 'start', at: 9001 });
    s.bind({ strokeId: l3, nodeId: l1, site: { kind: 'tail', index: 0 }, end: 'end', at: 9002 });
    const [f] = figuresOf(s.getState());
    expect(f.kind).toBe('triangle');
    expect(f.corners.map((c) => c.how)).toEqual(['bound', 'bound', 'bound']);
    expect(f.reason).toMatch(/bound/);
  });

  it('a diamond drawn in two strokes: a quadrilateral turned about 45°, said as such', () => {
    const s = createSession();
    const L = { x: 200, y: 500 }, T = { x: 280, y: 450 }, R = { x: 360, y: 500 }, B = { x: 280, y: 550 };
    const [top, bottom] = draw(s, [chevron(L, T, R), chevron(L, B, R)]);
    const figures = figuresOf(s.getState());
    expect(figures).toHaveLength(1);
    const f = figures[0];
    expect(f).toMatchObject({ kind: 'quadrilateral', shape: 'diamond' });
    expect(sameSet(f.ids, [top, bottom])).toBe(true);
    // Corners from the top, going round clockwise as the screen shows it.
    expect(f.vertices).toHaveLength(4);
    [T, R, B, L].forEach((p, i) => expect(near(f.vertices[i], p, 2), `vertex ${i}`).toBe(true));
    expect(f.sides.map((sd) => sd.ids)).toEqual([[top], [bottom], [bottom], [top]]);
    // Two corners where the strokes meet, two where each one bends.
    expect(f.corners.map((c) => c.how)).toEqual(['bend', 'touching', 'bend', 'touching']);
    expect(f.reason).toMatch(/diamond/);
    expect(f.reason).toMatch(/45°/);
  });

  it('four strokes with square corners read as a rectangle', () => {
    const s = createSession();
    const a = { x: 100, y: 100 }, b = { x: 320, y: 100 }, c = { x: 320, y: 240 }, d = { x: 100, y: 240 };
    draw(s, [lineStroke(a, b), lineStroke(b, c), lineStroke(c, d), lineStroke(d, a)]);
    const [f] = figuresOf(s.getState());
    expect(f).toMatchObject({ kind: 'rectangle', shape: 'rectangle' });
    expect(f.reason).toMatch(/right/);
  });

  it('a square turned 45° is a diamond with square corners', () => {
    const s = createSession();
    draw(s, [chevron({ x: 200, y: 500 }, { x: 270, y: 430 }, { x: 340, y: 500 }), chevron({ x: 200, y: 500 }, { x: 270, y: 570 }, { x: 340, y: 500 })]);
    const [f] = figuresOf(s.getState());
    expect(f.shape).toBe('diamond');
    expect(f.kind).toBe('rectangle');
  });

  it('a side drawn in two strokes is one side, and keeps both marks', () => {
    const s = createSession();
    const { right, longLegEnd, shortLegEnd } = TRIANGLE_CORNERS;
    const mid = { x: 220, y: 300 };
    const [a, b] = draw(s, [lineStroke(right, mid), lineStroke(mid, longLegEnd), lineStroke(longLegEnd, shortLegEnd), lineStroke(shortLegEnd, right)]);
    const [f] = figuresOf(s.getState());
    expect(f.kind).toBe('triangle');
    expect(f.vertices).toHaveLength(3);
    expect(sameSet(sideBetween(f, right, longLegEnd).ids, [a, b])).toBe(true);
  });
});

describe('what is not a figure', () => {
  it('lines that merely cross: ends must meet', () => {
    const s = createSession();
    // The same triangle's lines, each run on 60 past both corners: every pair crosses, no two ends meet.
    const ext = (p: Point, q: Point, by = 60): Point[] => {
      const L = Math.hypot(q.x - p.x, q.y - p.y);
      const u = { x: (q.x - p.x) / L, y: (q.y - p.y) / L };
      return lineStroke({ x: p.x - u.x * by, y: p.y - u.y * by }, { x: q.x + u.x * by, y: q.y + u.y * by });
    };
    const { right, longLegEnd, shortLegEnd } = TRIANGLE_CORNERS;
    draw(s, [ext(right, longLegEnd), ext(shortLegEnd, right), ext(longLegEnd, shortLegEnd)]);
    expect(figuresOf(s.getState())).toEqual([]);
    const x = createSession();
    draw(x, [lineStroke({ x: 100, y: 100 }, { x: 300, y: 300 }), lineStroke({ x: 300, y: 100 }, { x: 100, y: 300 })]);
    expect(figuresOf(x.getState())).toEqual([]);
  });

  it('an open chain closes nothing', () => {
    const s = createSession();
    draw(s, [lineStroke({ x: 100, y: 100 }, { x: 300, y: 100 }), lineStroke({ x: 300, y: 100 }, { x: 300, y: 300 }), lineStroke({ x: 300, y: 300 }, { x: 100, y: 300 })]);
    expect(figuresOf(s.getState())).toEqual([]);
  });

  it('one closed stroke is its own mark’s figure, not a figure of several', () => {
    const s = createSession();
    s.addStroke(triangleStroke({ x: 200, y: 100 }, { x: 320, y: 300 }, { x: 80, y: 300 }), 1000);
    expect(figuresOf(s.getState())).toEqual([]);
  });
});

describe('figures are derived, like concepts', () => {
  it('reading them writes nothing, and replay reads the same', () => {
    const s = createSession();
    const { right, longLegEnd, shortLegEnd } = TRIANGLE_CORNERS;
    draw(s, [lineStroke(right, longLegEnd), lineStroke(shortLegEnd, right), lineStroke(longLegEnd, shortLegEnd)]);
    const events = s.getEvents().length, nodes = s.getState().nodes.size;
    const first = figuresOf(s.getState());
    expect(s.getEvents().length).toBe(events);
    expect(s.getState().nodes.size).toBe(nodes);
    expect(figuresOf(s.getState())).toEqual(first);
    const again = createSession();
    again.load(s.getEvents());
    expect(figuresOf(again.getState())).toEqual(first);
  });

  it('erasing a side opens the figure; undo closes it again', () => {
    const s = createSession();
    const { right, longLegEnd, shortLegEnd } = TRIANGLE_CORNERS;
    const [, l2] = draw(s, [lineStroke(right, longLegEnd), lineStroke(shortLegEnd, right), lineStroke(longLegEnd, shortLegEnd)]);
    s.erase(l2, 20000);
    expect(figuresOf(s.getState())).toEqual([]);
    s.undo();
    expect(figuresOf(s.getState())).toHaveLength(1);
  });
});

// ===== The maths: a triangle ruled in three strokes solves as one drawn in one =====

function text(s: Session, code: string, box: Bounds, at: number): string {
  return s.import({ kind: 'text', path: `text/${at}.txt`, name: code, bounds: box, code, at })!;
}

/** John's triangle (MATHS-PLAN §1), drawn either way: one stroke, or three ruled lines. */
function triangleBoard(how: 'one stroke' | 'three lines', opts: { longSide?: boolean } = {}) {
  const s = createSession();
  const { right, longLegEnd, shortLegEnd } = TRIANGLE_CORNERS;
  const ids = how === 'one stroke'
    ? [s.addStroke(triangleStroke(right, longLegEnd, shortLegEnd), 1000)]
    : draw(s, [lineStroke(right, longLegEnd), lineStroke(shortLegEnd, right), lineStroke(longLegEnd, shortLegEnd)]);
  s.addStroke(rectStroke(TRIANGLE_SQUARE.x, TRIANGLE_SQUARE.y, TRIANGLE_SQUARE.size, TRIANGLE_SQUARE.size, 12), 20000);
  text(s, TRIANGLE_LABELS.legs[0], TRIANGLE_LABEL_BOXES.longLeg, 40000);
  text(s, TRIANGLE_LABELS.legs[1], TRIANGLE_LABEL_BOXES.shortLeg, 41000);
  if (opts.longSide !== false) text(s, TRIANGLE_LABELS.long, TRIANGLE_LABEL_BOXES.longSide, 42000);
  return { s, ids };
}

function solved(how: 'one stroke' | 'three lines', opts: { longSide?: boolean } = {}): { board: BoardMaths; f: Figure; sol: Solution; ids: string[] } {
  const { s, ids } = triangleBoard(how, opts);
  const board = solveBoard(s.getState(), { unit: 'in', ...(how === 'three lines' ? { figures: figuresOf(s.getState()) } : {}) });
  const fm = board.figures.find((x) => x.figure.ids.includes(ids[0]))!;
  return { board, f: fm.figure, sol: fm.solution, ids };
}

/** Every value of every reading as people read it — text and formula — whatever the corners are called. */
const said = (sol: Solution) => sol.readings.map((r) => r.values.map((v) => `${v.text} ${v.formula ?? ''}`).sort());

describe('the maths: a triangle ruled in three strokes solves as one drawn in one', () => {
  it('24 and 8 beside the legs of three ruled lines make the long side 25.30″, with its formula', () => {
    const { f, sol, ids, board } = solved('three lines', { longSide: false });
    expect(f.kind).toBe('triangle');
    const long = sideBetween(f, TRIANGLE_CORNERS.longLegEnd, TRIANGLE_CORNERS.shortLegEnd);
    expect(long.ids).toEqual([ids[2]]);
    expect(sol.readings).toHaveLength(1);
    expect(sol.conflicts).toEqual([]);
    const v = sol.readings[0].values.find((x) => x.key === long.key)!;
    expect(v).toMatchObject({ from: 'derived', text: TRIANGLE_EXPECTED.longSide, formula: TRIANGLE_EXPECTED.formula, label: 'the long side' });
    expect(v.value.unit).toBe('in');
    expect(v.value.lo).toBeCloseTo(Math.sqrt(640), 9);
    expect(sol.readings[0].sentence).toBe(`legs of 24 and 8 make the long side ${TRIANGLE_EXPECTED.longSide}`);
    expect(sol.readings[0].values.filter((x) => x.key.startsWith('angle')).map((x) => x.text).sort()).toEqual(['18.43°', '71.57°', '90°']);
    expect(sol.readings[0].values.find((x) => x.key === 'area')).toMatchObject({ text: '96 in²', formula: '½ × 24 × 8' });
    // Each label sits on the side its own line drew — which the maths can say only because the sides keep their marks.
    const on = (t: string) => board.dimensions.attachments.find((a) => a.number.text === t)!;
    expect(sideBetween(f, TRIANGLE_CORNERS.right, TRIANGLE_CORNERS.longLegEnd).key).toBe(on('24').key);
    expect(sideBetween(f, TRIANGLE_CORNERS.shortLegEnd, TRIANGLE_CORNERS.right).key).toBe(on('8').key);
    // And every number the single stroke's triangle says, the ruled one says.
    expect(said(sol)).toEqual(said(solved('one stroke', { longSide: false }).sol));
  });

  it('a third label of 24 on the long side cannot hold, ruled or not: the same conflict and the same other reading', () => {
    const { sol } = solved('three lines');
    expect(sol.readings).toHaveLength(2);
    expect(sol.conflicts).toHaveLength(1);
    expect(sol.conflicts[0].reason).toBe(TRIANGLE_EXPECTED.conflict);
    expect(sol.readings[1].sentence).toBe(TRIANGLE_EXPECTED.other);
    expect(sol.notes.join(' ')).toMatch(/80\.41°/);
    expect(said(sol)).toEqual(said(solved('one stroke').sol));
  });

  it('without figures of several strokes, the three lines are three lines and no side is derived', () => {
    const { s, ids } = triangleBoard('three lines', { longSide: false });
    const board = solveBoard(s.getState(), { unit: 'in' });
    expect(board.figures.filter((x) => ids.some((id) => x.figure.ids.includes(id))).every((x) => x.figure.kind === 'line')).toBe(true);
  });
});

