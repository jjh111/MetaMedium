// The plane's fill-ins (MATHS-SPEC §8 Lane C, M19–M21; T4): Jake's rough parabola, and the function he writes.
//
// Red first: `y = (x²−4)/(x−2)` written near a plane gives that curve as a fill-in — a line in two pieces with a ring at
// (2, 4) — and a parabola drawn on it gives its equation and its clean curve. Around it: what a tap writes, that a
// thing already drawn is not offered again, that one function is one colour, and that nothing here enters the log.

import { describe, it, expect } from 'vitest';
import type { Point } from '../types';
import { createSession } from '../session/session';
import type { Session } from '../session/session';
import { boardMaths, mathsChips } from './board';
import { fillInsOf, fillInsOfSession } from './fill';
import type { FillIn } from './fill';
import './fill-builtin';
import { quantityHuesOfSession } from './fill-figure';
import { writeFillIn } from '../tools/fill';
import { planesIn } from '../notations/plane';
import { drawHalfPlane, putText } from '../notations/fixtures/plane';
import { handCurve } from './fixtures/curves';
import { handCircle, handDot, handLine, handRect } from '../test/strokes';
import { canvasToPlane, planeToCanvas } from './plot';

const planeFills = (s: Session): FillIn[] => fillInsOf(s.getState()).filter((f) => f.source === 'plane');
const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

/** Take a fill-in as the surface does: one act, tool `fill`, stamped with the offer. */
function take(s: Session, f: FillIn, at = 900_000): string | null {
  return s.withTool('fill', () => writeFillIn(s, f, at), f.key);
}

describe('red first: a function written near the plane gives its curve, with its hole', () => {
  const s = createSession();
  const g = drawHalfPlane(s);
  const text = putText(s, 'y = (x²−4)/(x−2)', { x: 150, y: 120 }, 210, 18);
  const plane = planesIn(s.getState(), undefined, { fits: false })[0];
  const fills = planeFills(s);

  it('is a line in two pieces and a ring at (2, 4), all about the text and the axes, in one colour', () => {
    const curves = fills.filter((f) => /:curve:\d$/.test(f.key));
    const holes = fills.filter((f) => /:hole:\d$/.test(f.key));
    expect(curves).toHaveLength(2);
    expect(holes).toHaveLength(1);
    const h = holes[0];
    expect(h.kind).toBe('mark');
    expect(h.closed).toBe(true);
    const want = planeToCanvas(plane, { x: 2, y: 4 });
    expect(dist(h.at, want)).toBeLessThan(0.1);
    expect(h.text).toBe('(2, 4)');
    for (const f of [...curves, h]) {
      expect(f.about).toEqual(expect.arrayContaining([text, g.x, g.y]));
      expect(f.quantity).toBe(h.quantity);
      expect(f.source).toBe('plane');
    }
    expect(h.quantity).toMatch(/^fn:/);
    // Neither piece goes through the ring.
    for (const c of curves) for (const q of c.points!) expect(dist(q, h.at)).toBeGreaterThanOrEqual(4.9);
    // The pieces lie on the line y = x + 2 as the plane draws it.
    for (const c of curves) for (const q of c.points!) {
      const w = canvasToPlane(plane, q);
      expect(Math.abs(w.y - (w.x + 2))).toBeLessThan(0.02);
    }
    expect(h.reason).toMatch(/a hole at \(2, 4\)/);
  });

  it('writes nothing until a tap, and a tap along a piece draws that piece as ink, one act', () => {
    const before = s.getEvents().length;
    expect(fillInsOf(s.getState())).toBeDefined();
    expect(s.getEvents().length).toBe(before);
    const curves = planeFills(s).filter((f) => /:curve:\d$/.test(f.key));
    const t = curves[0].take;
    expect(t.kind).toBe('strokes');
    const made = take(s, curves[0], 910_000);
    expect(made).not.toBeNull();
    const events = s.getEvents().slice(before);
    expect(events.every((e) => (e as { tool?: string }).tool === 'fill' || e.type === 'dismiss' || e.type === 'deselect')).toBe(true);
    // That piece is no longer offered; the other, and the hole, still are.
    const after = planeFills(s);
    expect(after.filter((f) => /:curve:\d$/.test(f.key))).toHaveLength(1);
    expect(after.filter((f) => /:hole:\d$/.test(f.key))).toHaveLength(1);
    // One undo takes it back.
    s.undo();
    expect(planeFills(s).filter((f) => /:curve:\d$/.test(f.key))).toHaveLength(2);
  });

  it('a tap on the hole draws a ring, which reads as the point (2, 4) and is not offered as one', () => {
    const hole = planeFills(s).find((f) => /:hole:\d$/.test(f.key))!;
    take(s, hole, 920_000);
    const p = planesIn(s.getState())[0];
    expect(p.points.map((q) => q.text)).toEqual(['(2, 4)']);
    expect(planeFills(s).filter((f) => /:hole:\d$/.test(f.key))).toHaveLength(0);
    expect(planeFills(s).filter((f) => /:coordinates$/.test(f.key))).toHaveLength(0);
    s.undo();
  });
});

describe('T4: a rough parabola on the axes gives y = x² and its clean curve', () => {
  const s = createSession();
  const g = drawHalfPlane(s);
  const plane = planesIn(s.getState(), undefined, { fits: false })[0];
  const sketch = s.addStroke(handCurve(plane, (x) => x * x, -3, 3, { seed: 4, jitter: 2.5 }), 100_000);
  const fills = planeFills(s);

  it('offers the equation as a value a tap writes, and the clean curve under the ink as a mark', () => {
    const eq = fills.find((f) => f.key === `plane:${sketch}:equation`)!;
    const cv = fills.find((f) => f.key === `plane:${sketch}:curve`)!;
    expect(eq).toMatchObject({ kind: 'expression', text: 'y = x²', source: 'plane', answer: true });
    expect(eq.take.kind).toBe('text');
    expect(eq.take.kind === 'text' && eq.take.text).toBe('y = x²');
    expect(eq.about).toEqual([sketch]);
    expect(eq.reason).toMatch(/^a parabola, y = x², within \d+% of the span/);
    expect(cv).toMatchObject({ kind: 'mark', text: 'y = x²', closed: false });
    expect(cv.take.kind).toBe('strokes');
    expect(cv.about).toEqual([sketch]);
    // One quantity, one colour.
    expect(eq.quantity).toBe(`fn:${sketch}`);
    expect(cv.quantity).toBe(eq.quantity);
    expect(eq.rank).toBeGreaterThan(cv.rank);
    // The clean curve is y = x², exactly, between the ends of the sketch.
    for (const q of cv.points!) {
      const w = canvasToPlane(plane, q);
      expect(Math.abs(w.y - w.x * w.x) * plane.y.perUnit).toBeLessThan(0.3);
    }
    void g;
  });

  it('gives the curve its own hue, placed for the board', () => {
    const hues = quantityHuesOfSession(s);
    expect(hues.has(`fn:${sketch}`)).toBe(true);
    expect(Number.isFinite(hues.get(`fn:${sketch}`)!.hue)).toBe(true);
  });

  it('taking the equation writes a text, after which that offer is gone; taking the curve draws it, and it is not offered a second time', () => {
    const eq = fillInsOfSession(s).find((f) => f.key === `plane:${sketch}:equation`)!;
    const n0 = s.getEvents().length;
    take(s, eq, 200_000);
    const text = s.getEvents().slice(n0).find((e) => e.type === 'import');
    expect(text).toBeDefined();
    expect(planeFills(s).find((f) => f.key === `plane:${sketch}:equation`)).toBeUndefined();
    const cv = planeFills(s).find((f) => f.key === `plane:${sketch}:curve`)!;
    take(s, cv, 210_000);
    // The clean curve is a curve on the plane too — and it speaks through the sketch: still one equation offer's worth of nothing, no second curve.
    const after = planeFills(s);
    expect(after.filter((f) => f.kind === 'mark')).toHaveLength(0);
    expect(after.filter((f) => f.kind === 'expression')).toHaveLength(0);
    // The written equation near the plane is a function of it, and it lies on the curve drawn: nothing to offer.
    expect(after).toEqual([]);
  });
});

describe('a point drawn on the plane is offered its coordinates', () => {
  it('a dot at (2, 3) gets (2, 3) beside it as text a tap writes; coordinates already written there are not offered again', () => {
    const s = createSession();
    const { O, U, V } = drawHalfPlane(s);
    const dot = s.addStroke(handDot(O.x + 2 * U, O.y - 3 * V, 4, { seed: 3 }), 100_000);
    const f = planeFills(s).find((x) => x.key === `plane:${dot}:coordinates`)!;
    expect(f).toBeDefined();
    expect(f).toMatchObject({ kind: 'value', text: '(2, 3)', answer: true, source: 'plane' });
    expect(f.take.kind === 'text' && f.take.text).toBe('(2, 3)');
    expect(dist(f.at, { x: O.x + 2 * U, y: O.y - 3 * V })).toBeLessThan(60);
    take(s, f, 200_000);
    expect(planeFills(s).find((x) => x.key === `plane:${dot}:coordinates`)).toBeUndefined();
  });
  it('the maths says nothing of the written coordinates: no chip, no problem', () => {
    const s = createSession();
    const { O, U, V } = drawHalfPlane(s);
    s.addStroke(handDot(O.x + 2 * U, O.y - 3 * V, 4, { seed: 3 }), 100_000);
    const f = planeFills(s).find((x) => /coordinates$/.test(x.key))!;
    take(s, f, 200_000);
    const b = boardMaths(s.getState());
    expect(b === null || mathsChips(b).length === 0).toBe(true);
  });
});

describe('what the plane source leaves alone', () => {
  it('a board with no plane gets nothing from it: a right triangle, a flowchart’s boxes, a bare plus', () => {
    const s = createSession();
    s.addStroke(handLine({ x: 100, y: 400 }, { x: 340, y: 400 }, { seed: 1 }), 1000);
    s.addStroke(handLine({ x: 100, y: 400 }, { x: 100, y: 200 }, { seed: 2 }), 6000);
    s.addStroke(handLine({ x: 100, y: 200 }, { x: 340, y: 400 }, { seed: 3 }), 11000);
    s.addStroke(handRect(400, 200, 100, 60, { seed: 4 }), 16000);
    s.addStroke(handCircle(600, 300, 30, { seed: 5 }), 21000);
    expect(planeFills(s)).toEqual([]);
  });
  it('a bare plus hosts a curve, and says the scale was assumed', () => {
    const s = createSession();
    s.addStroke(handLine({ x: 100, y: 300 }, { x: 500, y: 300 }, { seed: 1 }), 1000);
    s.addStroke(handLine({ x: 300, y: 500 }, { x: 300, y: 100 }, { seed: 2 }), 6000);
    const p = planesIn(s.getState(), undefined, { fits: false })[0];
    s.addStroke(handCurve(p, (x) => x * x, -2.2, 2.2, { seed: 4 }), 11000);
    const eq = planeFills(s).find((f) => f.kind === 'expression')!;
    expect(eq).toBeDefined();
    expect(eq.reason).toMatch(/scale was assumed/);
    expect(eq.rank).toBeLessThan(0.78);
  });
  it('a function the page gives names for (y = a x + b) is not plotted; one with the plane’s own variable is', () => {
    const s = createSession();
    drawHalfPlane(s);
    putText(s, 'y = ax + b', { x: 150, y: 120 }, 100, 18);
    expect(planeFills(s)).toEqual([]);
    putText(s, 'y = 2x + 1', { x: 450, y: 120 }, 100, 18);
    const f = planeFills(s);
    expect(f.length).toBeGreaterThan(0);
    expect(f.every((x) => x.kind === 'mark')).toBe(true);
  });
  it('a rational function with a pole stands a dashed asymptote that a tap cannot draw', () => {
    const s = createSession();
    drawHalfPlane(s);
    putText(s, 'y = 1/(x−1)', { x: 150, y: 120 }, 100, 18);
    const asym = planeFills(s).filter((f) => /:asymptote:\d$/.test(f.key));
    expect(asym).toHaveLength(1);
    expect(asym[0].dashed).toBe(true);
    expect(asym[0].take.kind).toBe('none');
    expect(asym[0].text).toBe('x = 1');
  });
  it('nothing is ever logged: asking changes no event', () => {
    const s = createSession();
    const { next } = drawHalfPlane(s);
    putText(s, 'y = (x²−4)/(x−2)', { x: 150, y: 120 }, 210, 18);
    s.addStroke(handCurve(planesIn(s.getState(), undefined, { fits: false })[0], (x) => x * x, -3, 3, { seed: 4 }), next);
    const n = s.getEvents().length;
    fillInsOf(s.getState());
    fillInsOfSession(s);
    expect(s.getEvents().length).toBe(n);
  });
});
