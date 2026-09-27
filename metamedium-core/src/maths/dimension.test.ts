// Dimensions — a number beside a mark, offered as one of its measures
// (MATHS-PLAN.md §4; DIRECTOR-PLAN-W2 M3a).
//
// Pinned here: the triangle John asked about, drawn as one closed stroke with
// a square in its right-angled corner and 24, 8 and 24 typed beside its sides
// — each number attached to the right side, with the distance to that side's
// middle relative to its length, its alignment, a reason and the runner-up;
// the square read as a declared right angle, not a figure to label; the same
// sides from a figure built by hand the way lines meeting will fill it (E3);
// a number inside a closed mark is a piece label; the underline trap; a
// circle's radius or diameter, an arc's chord and a line's length; the scale
// of a drawing and how consistently its labels agree with the ink; numbers on
// marks kept out of the sheet; and nothing written to the log.

import { describe, it, expect } from 'vitest';
import type { Bounds, Point } from '../types';
import { createSession } from '../session/session';
import type { Session } from '../session/session';
import { triangleStroke, rectStroke, circleStroke, lineStroke, arcStroke } from '../test/strokes';
import { dimensionsOf, figureOfMark, polygonFigure, readNumber, attachedNumberIds } from './dimension';
import type { BoardDimensions, Figure } from './dimension';
import { sheetLines } from './gather';
import { TRIANGLE_LABELS, TRIANGLE_CORNERS, TRIANGLE_SQUARE, TRIANGLE_LABEL_BOXES } from './fixtures/triangle';
import { APRON_LINES } from './fixtures/apron.sample';

function text(s: Session, code: string, box: Bounds, at: number): string {
  return s.import({ kind: 'text', path: `text/${at}.txt`, name: code, bounds: box, code, at })!;
}

const box = (cx: number, cy: number, w = 40, h = 30): Bounds => ({ minX: cx - w / 2, maxX: cx + w / 2, minY: cy - h / 2, maxY: cy + h / 2 });

/** The triangle of MATHS-PLAN §1, as one closed stroke, with its square and its labels typed as text. */
function triangleBoard(opts: { longSide?: boolean; square?: boolean } = {}) {
  const s = createSession();
  const { right, longLegEnd, shortLegEnd } = TRIANGLE_CORNERS;
  const tri = s.addStroke(triangleStroke(right, longLegEnd, shortLegEnd), 1000);
  const sq = opts.square === false ? null : s.addStroke(rectStroke(TRIANGLE_SQUARE.x, TRIANGLE_SQUARE.y, TRIANGLE_SQUARE.size, TRIANGLE_SQUARE.size, 12), 20000);
  const longLeg = text(s, TRIANGLE_LABELS.legs[0], TRIANGLE_LABEL_BOXES.longLeg, 40000);
  const shortLeg = text(s, TRIANGLE_LABELS.legs[1], TRIANGLE_LABEL_BOXES.shortLeg, 41000);
  const longSide = opts.longSide === false ? null : text(s, TRIANGLE_LABELS.long, TRIANGLE_LABEL_BOXES.longSide, 42000);
  return { s, tri, sq, longLeg, shortLeg, longSide };
}

/** The key of the figure's side that runs between p and q, whichever way it was drawn. */
function sideBetween(f: Figure, p: Point, q: Point, tol = 12): string | undefined {
  const near = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y) <= tol;
  return f.sides.find((sd) => (near(sd.from, p) && near(sd.to, q)) || (near(sd.from, q) && near(sd.to, p)))?.key;
}

function attachmentOf(d: BoardDimensions, id: string) {
  const a = d.attachments.find((x) => x.number.ids.includes(id));
  if (!a) throw new Error(`no attachment read for ${id}`);
  return a;
}

describe('readNumber — what a label says', () => {
  it('reads a bare number, a length, a range, a named measure, a step’s value and an angle', () => {
    expect(readNumber('24')).toMatchObject({ value: { lo: 24, hi: 24, unit: null } });
    expect(readNumber('24″')).toMatchObject({ value: { lo: 24, unit: 'in' } });
    expect(readNumber('2–4″')).toMatchObject({ value: { lo: 2, hi: 4, unit: 'in' } });
    expect(readNumber('r = 12')).toMatchObject({ value: { lo: 12 }, name: 'r', measure: 'radius' });
    expect(readNumber('⌀ 24')).toMatchObject({ value: { lo: 24 }, measure: 'diameter' });
    expect(readNumber('waist 28″')).toMatchObject({ value: { lo: 28, unit: 'in' }, measure: 'circumference' });
    expect(readNumber('1. 15″')).toMatchObject({ value: { lo: 15, unit: 'in' }, step: 1 });
    expect(readNumber('40°')).toMatchObject({ value: { lo: 40 }, angle: true });
  });

  it('a line of a table, a formula or a word is not a number to attach', () => {
    expect(readNumber('A. Bust 36')).toBeNull();
    expect(readNumber('12 + 2')).toBeNull();
    expect(readNumber('Bodice')).toBeNull();
  });
});

describe('figureOfMark — one closed stroke fills the figure', () => {
  it('a triangle has three corners, three sides and the angles the ink measures', () => {
    const { s, tri } = triangleBoard();
    const st = s.getState();
    const f = figureOfMark(st.nodes.get(tri)!, st.nodes)!;
    expect(f.kind).toBe('triangle');
    expect(f.vertices).toHaveLength(3);
    expect(f.sides.map((x) => x.key)).toEqual(['side0', 'side1', 'side2']);
    expect(f.sides.every((x) => x.ids.length === 1 && x.ids[0] === tri)).toBe(true);
    expect(f.angles!.reduce((a, b) => a + b, 0)).toBeCloseTo(180, 0);
    const { right, longLegEnd, shortLegEnd } = TRIANGLE_CORNERS;
    expect(sideBetween(f, right, longLegEnd)).toBeDefined();
    expect(sideBetween(f, right, shortLegEnd)).toBeDefined();
    expect(sideBetween(f, longLegEnd, shortLegEnd)).toBeDefined();
  });

  it('writing is not a figure', () => {
    const s = createSession();
    const id = text(s, '24', box(100, 100), 1000);
    expect(figureOfMark(s.getState().nodes.get(id)!, s.getState().nodes)).toBeNull();
  });
});

describe('dimensionsOf — the triangle John asked about', () => {
  it('each number attaches to the side it sits beside, with its distance, alignment, reason and runner-up', () => {
    const { s, tri, longLeg, shortLeg, longSide } = triangleBoard();
    const d = dimensionsOf(s.getState());
    const f = d.figures.find((x) => x.id === tri)!;
    expect(f).toBeDefined();
    const { right, longLegEnd, shortLegEnd } = TRIANGLE_CORNERS;
    const expected: [string, string | undefined][] = [
      [longLeg, sideBetween(f, right, longLegEnd)],
      [shortLeg, sideBetween(f, right, shortLegEnd)],
      [longSide!, sideBetween(f, longLegEnd, shortLegEnd)],
    ];
    for (const [id, key] of expected) {
      const a = attachmentOf(d, id);
      expect(a.as).toBe('dimension');
      expect(a.figure).toBe(tri);
      expect(a.key).toBe(key);
      const top = a.candidates[0];
      expect(top.offset!).toBeGreaterThan(0);
      expect(top.offset!).toBeLessThan(0.5);
      expect(top.alignment!).toBeGreaterThan(0.8);
      expect(a.reason).toMatch(/side [ABC]{2}/);
      expect(a.reason).toMatch(/% of its length from its middle/);
      // The runner-up is named, and it is not the side the number was given.
      expect(a.runnerUp).toBeDefined();
      expect(a.runnerUp!.key === key && a.runnerUp!.figure === tri).toBe(false);
      expect(a.reason).toMatch(/next: /);
    }
  });

  it('the square in the corner is a declared right angle, not a figure to label', () => {
    const { s, tri, sq } = triangleBoard();
    const d = dimensionsOf(s.getState());
    expect(d.figures.some((x) => x.ids.includes(sq!))).toBe(false);
    expect(d.rightAngles).toHaveLength(1);
    const ra = d.rightAngles[0];
    expect(ra.figure).toBe(tri);
    expect(ra.ids).toEqual([sq]);
    const f = d.figures.find((x) => x.id === tri)!;
    const v = f.vertices[ra.vertex];
    expect(Math.hypot(v.x - TRIANGLE_CORNERS.right.x, v.y - TRIANGLE_CORNERS.right.y)).toBeLessThan(8);
    expect(ra.reason).toMatch(/square/);
    // It is a fact on the figure's labels, held beside the three numbers.
    const labels = d.labels.get(tri)!;
    expect(labels.filter((l) => !l.declared).map((l) => l.text).sort()).toEqual(['24', '24', '8']);
    expect(labels.filter((l) => l.declared)).toHaveLength(1);
  });

  it('a figure built by hand from three lines — as lines meeting will fill it — takes the same sides', () => {
    const s = createSession();
    const { right, longLegEnd, shortLegEnd } = TRIANGLE_CORNERS;
    const l1 = s.addStroke(lineStroke(right, longLegEnd), 1000);
    const l2 = s.addStroke(lineStroke(longLegEnd, shortLegEnd), 20000);
    const l3 = s.addStroke(lineStroke(shortLegEnd, right), 40000);
    const sq = s.addStroke(rectStroke(TRIANGLE_SQUARE.x, TRIANGLE_SQUARE.y, TRIANGLE_SQUARE.size, TRIANGLE_SQUARE.size, 12), 60000);
    const longLeg = text(s, '24', TRIANGLE_LABEL_BOXES.longLeg, 80000);
    const shortLeg = text(s, '8', TRIANGLE_LABEL_BOXES.shortLeg, 81000);
    const longSide = text(s, '24', TRIANGLE_LABEL_BOXES.longSide, 82000);
    const fig = polygonFigure([right, longLegEnd, shortLegEnd], { id: 'figure:ruled', sideIds: [[l1], [l2], [l3]], reason: 'three ruled lines whose ends meet' });
    expect(fig.kind).toBe('triangle');
    expect(fig.ids.sort()).toEqual([l1, l2, l3].sort());
    const d = dimensionsOf(s.getState(), { figures: [fig] });
    // The three lines are one figure now, not three lines to label.
    expect(d.figures.filter((x) => [l1, l2, l3].some((id) => x.ids.includes(id)))).toHaveLength(1);
    expect(attachmentOf(d, longLeg)).toMatchObject({ as: 'dimension', figure: 'figure:ruled', key: sideBetween(fig, right, longLegEnd) });
    expect(attachmentOf(d, shortLeg)).toMatchObject({ as: 'dimension', figure: 'figure:ruled', key: sideBetween(fig, right, shortLegEnd) });
    expect(attachmentOf(d, longSide)).toMatchObject({ as: 'dimension', figure: 'figure:ruled', key: sideBetween(fig, longLegEnd, shortLegEnd) });
    expect(fig.sides.find((x) => x.key === sideBetween(fig, right, longLegEnd))!.ids).toEqual([l1]);
    expect(d.rightAngles.map((r) => [r.figure, r.ids])).toEqual([['figure:ruled', [sq]]]);
  });
});

describe('dimensionsOf — where a number stands', () => {
  it('a number inside a closed mark is a piece label, not a dimension', () => {
    const s = createSession();
    const rect = s.addStroke(rectStroke(100, 500, 300, 100), 1000);
    const piece = text(s, '3', box(250, 550, 20, 30), 20000);
    const d = dimensionsOf(s.getState());
    const a = attachmentOf(d, piece);
    expect(a.as).toBe('piece');
    expect(a.figure).toBe(rect);
    expect(a.reason).toMatch(/inside/);
    expect(d.labels.get(rect) ?? []).toHaveLength(0);
  });

  it('the underline: a number on a short line that spans nothing owns the line', () => {
    const s = createSession();
    const line = s.addStroke(lineStroke({ x: 110, y: 436 }, { x: 160, y: 436 }, 20), 1000);
    const n = text(s, '24', { minX: 110, maxX: 150, minY: 404, maxY: 430 }, 20000);
    const d = dimensionsOf(s.getState());
    expect(d.underlines.map((u) => [u.ids, u.number])).toEqual([[[line], n]]);
    expect(d.figures.some((f) => f.ids.includes(line))).toBe(false);
    expect(attachmentOf(d, n).as).toBe('free');
  });

  it('…and a short line that spans something is labelled by the number on it', () => {
    const s = createSession();
    const line = s.addStroke(lineStroke({ x: 110, y: 436 }, { x: 160, y: 436 }, 20), 1000);
    s.addStroke(lineStroke({ x: 110, y: 420 }, { x: 110, y: 452 }, 20), 20000);
    s.addStroke(lineStroke({ x: 160, y: 420 }, { x: 160, y: 452 }, 20), 40000);
    const n = text(s, '24', { minX: 115, maxX: 155, minY: 404, maxY: 430 }, 60000);
    const d = dimensionsOf(s.getState());
    expect(d.underlines).toHaveLength(0);
    expect(attachmentOf(d, n)).toMatchObject({ as: 'dimension', figure: line, key: 'length' });
  });

  it('a line’s length', () => {
    const s = createSession();
    const line = s.addStroke(lineStroke({ x: 100, y: 900 }, { x: 400, y: 900 }), 1000);
    const n = text(s, '30', box(250, 875), 20000);
    const d = dimensionsOf(s.getState());
    expect(attachmentOf(d, n)).toMatchObject({ as: 'dimension', figure: line, key: 'length' });
  });

  it('a circle: a named radius, a diameter, a circumference — and a bare number, radius first with the diameter beside it', () => {
    const s = createSession();
    const c = s.addStroke(circleStroke(700, 300, 80), 1000);
    const r = text(s, 'r = 12', box(830, 300, 60, 30), 20000);
    const dia = text(s, '⌀ 24', box(700, 410, 60, 30), 21000);
    const circ = text(s, 'waist 75.4″', box(570, 190, 80, 30), 22000);
    const bare = text(s, '24', box(700, 192), 23000);
    const d = dimensionsOf(s.getState());
    expect(attachmentOf(d, r)).toMatchObject({ as: 'dimension', figure: c, key: 'radius' });
    expect(attachmentOf(d, dia)).toMatchObject({ as: 'dimension', figure: c, key: 'diameter' });
    expect(attachmentOf(d, circ)).toMatchObject({ as: 'dimension', figure: c, key: 'circumference' });
    const b = attachmentOf(d, bare);
    expect(b).toMatchObject({ as: 'dimension', figure: c, key: 'radius' });
    expect(b.runnerUp).toMatchObject({ figure: c, key: 'diameter' });
    expect(b.reason).toMatch(/radius or the diameter/);
  });

  it('an arc’s chord', () => {
    const s = createSession();
    // Three quarters of a circle of radius 80 about (1400, 400), from east round to north — the
    // arc the shape rung reads as one (a shallow arc reads as a line). Its chord runs north-east
    // of the centre, 113 long; the number stands just beyond the chord's middle, away from the bulge.
    const arc = s.addStroke(arcStroke(1400, 400, 80), 1000);
    const n = text(s, '11.3', box(1458, 342, 50, 30), 20000);
    const d = dimensionsOf(s.getState());
    expect(d.figures.find((f) => f.id === arc)!.kind).toBe('arc');
    expect(attachmentOf(d, n)).toMatchObject({ as: 'dimension', figure: arc, key: 'chord' });
  });

  it('a number beside nothing stays free — the sheet’s', () => {
    const { s } = triangleBoard();
    const far = text(s, '72–74″', box(2000, 2000, 80, 30), 90000);
    expect(attachmentOf(dimensionsOf(s.getState()), far).as).toBe('free');
  });
});

describe('dimensionsOf — the scale of a drawing', () => {
  it('the triangle is to scale within a few percent; with the legs alone, within one or two', () => {
    const all = dimensionsOf(triangleBoard().s.getState(), { unit: 'in' });
    expect(all.drawings).toHaveLength(1);
    const sc = all.drawings[0].scale!;
    expect(sc.unit).toBe('in');
    expect(sc.toScale).toBe(true);
    expect(sc.spread).toBeGreaterThan(0.02);
    expect(sc.spread).toBeLessThan(0.08);
    expect(sc.reason).toMatch(/^1″ ≈ \d+(\.\d+)? px, to scale within \d%$/);
    // Units per canvas unit: 24 inches over some 234 px of ink.
    expect(sc.unitsPerCanvasUnit).toBeGreaterThan(0.095);
    expect(sc.unitsPerCanvasUnit).toBeLessThan(0.105);
    const legs = dimensionsOf(triangleBoard({ longSide: false }).s.getState(), { unit: 'in' }).drawings[0].scale!;
    expect(legs.spread).toBeLessThan(0.02);
    expect(legs.reason).toMatch(/to scale within [12]%$/);
  });

  it('labels the ink cannot agree with: not to scale, and the labels rule', () => {
    const s = createSession();
    s.addStroke(rectStroke(100, 100, 300, 100), 1000);
    text(s, '10″', box(250, 80), 20000); // the top: 300 px
    text(s, '40″', box(75, 150), 21000); // the left side: 100 px
    const sc = dimensionsOf(s.getState()).drawings[0].scale!;
    expect(sc.toScale).toBe(false);
    expect(sc.reason).toMatch(/not to scale; the labels rule/);
  });

  it('one label sets the scale and says there is nothing to check it against', () => {
    const s = createSession();
    s.addStroke(lineStroke({ x: 100, y: 900 }, { x: 400, y: 900 }), 1000);
    text(s, '30″', box(250, 875), 20000);
    const sc = dimensionsOf(s.getState()).drawings[0].scale!;
    expect(sc.labels).toBe(1);
    expect(sc.unitsPerCanvasUnit).toBeCloseTo(0.1, 3);
    expect(sc.reason).toMatch(/one label sets the scale/);
  });

  it('a bare label takes the unit its drawing writes', () => {
    const s = createSession();
    s.addStroke(rectStroke(100, 100, 300, 100), 1000);
    text(s, '30″', box(250, 80), 20000);
    const h = text(s, '10', box(75, 150), 21000);
    const d = dimensionsOf(s.getState());
    expect(d.drawings[0].unit).toBe('in');
    const label = [...d.labels.values()].flat().find((l) => l.ids.includes(h))!;
    expect(label.value).toMatchObject({ lo: 10, unit: 'in', dim: 1 });
  });
});

describe('numbers on marks are not the sheet’s lines', () => {
  it('the page beside a labelled drawing reads as the page alone', () => {
    const { s, longLeg, shortLeg, longSide } = triangleBoard();
    APRON_LINES.forEach((line, i) => text(s, line, { minX: 2000, maxX: 2400, minY: 100 + i * 40, maxY: 130 + i * 40 }, 100000 + i));
    const ids = attachedNumberIds(s.getState());
    expect([...ids].sort()).toEqual([longLeg, shortLeg, longSide!].sort());
    expect(sheetLines(s.getState()).map((l) => l.text)).toEqual([...APRON_LINES]);
  });

  it('reading the dimensions changes nothing in the session', () => {
    const { s } = triangleBoard();
    const before = JSON.stringify(s.getEvents());
    const d = dimensionsOf(s.getState(), { unit: 'in' });
    expect(d.attachments.length).toBe(3);
    expect(JSON.stringify(s.getEvents())).toBe(before);
  });
});
