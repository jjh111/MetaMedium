// Solving — figure by figure, in closed form (MATHS-PLAN.md §4; DIRECTOR-PLAN-W2 M4).
//
// Pinned here: John's triangle — legs of 24 and 8 make the long side
// √(24² + 8²) = 25.30″; a third label of 24 on the long side cannot hold, and
// the canvas says by how much and gives the other consistent reading (24 on
// the long side and a leg of 8 make the other leg 22.63″); the same from a
// figure built by hand, the way lines meeting will fill it. Any triangle from
// three facts (SSS, SAS, ASA); a rectangle's diagonal, area and perimeter; a
// circle from any one of radius, diameter, circumference or area (a circle
// skirt's radius is its waist over 2π); an arc from chord and rise; parts
// along one edge summing to their whole; an over-determined circle; an
// unlabelled measure offered from the scale as the ink's; and a right angle
// only from a declared square or a labelled angle — a corner that measures
// near 90° is a reading, with the tolerance cited from measure.ts.

import { describe, it, expect } from 'vitest';
import type { Bounds, Point } from '../types';
import { createSession } from '../session/session';
import type { Session } from '../session/session';
import { triangleStroke, rectStroke, circleStroke, lineStroke, arcStroke } from '../test/strokes';
import { RIGHT_ANGLE_TOLERANCE } from '../session/measure';
import { polygonFigure } from './dimension';
import type { Figure, FigureLabel } from './dimension';
import { solveBoard, solveFigure, describeSolution } from './solve';
import type { BoardMaths, Solution } from './solve';
import { quantity } from './quantity';
import { TRIANGLE_LABELS, TRIANGLE_CORNERS, TRIANGLE_SQUARE, TRIANGLE_LABEL_BOXES, TRIANGLE_EXPECTED } from './fixtures/triangle';

function text(s: Session, code: string, box: Bounds, at: number): string {
  return s.import({ kind: 'text', path: `text/${at}.txt`, name: code, bounds: box, code, at })!;
}

const box = (cx: number, cy: number, w = 40, h = 30): Bounds => ({ minX: cx - w / 2, maxX: cx + w / 2, minY: cy - h / 2, maxY: cy + h / 2 });

function triangleBoard(opts: { longSide?: boolean; square?: boolean; longSideText?: string } = {}) {
  const s = createSession();
  const { right, longLegEnd, shortLegEnd } = TRIANGLE_CORNERS;
  const tri = s.addStroke(triangleStroke(right, longLegEnd, shortLegEnd), 1000);
  if (opts.square !== false) s.addStroke(rectStroke(TRIANGLE_SQUARE.x, TRIANGLE_SQUARE.y, TRIANGLE_SQUARE.size, TRIANGLE_SQUARE.size, 12), 20000);
  text(s, TRIANGLE_LABELS.legs[0], TRIANGLE_LABEL_BOXES.longLeg, 40000);
  text(s, TRIANGLE_LABELS.legs[1], TRIANGLE_LABEL_BOXES.shortLeg, 41000);
  if (opts.longSide !== false) text(s, opts.longSideText ?? TRIANGLE_LABELS.long, TRIANGLE_LABEL_BOXES.longSide, 42000);
  return { s, tri };
}

function sideBetween(f: Figure, p: Point, q: Point, tol = 12): string {
  const near = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y) <= tol;
  const k = f.sides.find((sd) => (near(sd.from, p) && near(sd.to, q)) || (near(sd.from, q) && near(sd.to, p)))?.key;
  if (!k) throw new Error('no such side');
  return k;
}

function solutionOf(board: BoardMaths, id: string): Solution {
  const f = board.figures.find((x) => x.figure.id === id || x.figure.ids.includes(id));
  if (!f) throw new Error(`no figure for ${id}`);
  return f.solution;
}

const valueOf = (sol: Solution, key: string, reading = 0) => sol.readings[reading].values.find((v) => v.key === key);

describe('the right triangle John asked about', () => {
  it('legs of 24 and 8 make the long side 25.30″, with its formula', () => {
    const { s, tri } = triangleBoard({ longSide: false });
    const board = solveBoard(s.getState(), { unit: 'in' });
    const sol = solutionOf(board, tri);
    const f = board.figures.find((x) => x.figure.id === tri)!.figure;
    const long = sideBetween(f, TRIANGLE_CORNERS.longLegEnd, TRIANGLE_CORNERS.shortLegEnd);
    expect(sol.readings).toHaveLength(1);
    expect(sol.conflicts).toEqual([]);
    const v = valueOf(sol, long)!;
    expect(v).toMatchObject({ from: 'derived', text: TRIANGLE_EXPECTED.longSide, formula: TRIANGLE_EXPECTED.formula, label: 'the long side' });
    expect(v.value.unit).toBe('in');
    expect(v.value.lo).toBeCloseTo(Math.sqrt(640), 9);
    expect(sol.readings[0].sentence).toBe(`legs of 24 and 8 make the long side ${TRIANGLE_EXPECTED.longSide}`);
    // The rest of the triangle follows: its sharp angle is 18.43°, its area half of 24 by 8.
    const angles = sol.readings[0].values.filter((x) => x.key.startsWith('angle')).map((x) => x.text).sort();
    expect(angles).toEqual(['18.43°', '71.57°', '90°']);
    expect(sol.readings[0].values.find((x) => x.key === 'area')).toMatchObject({ text: '96 in²', formula: '½ × 24 × 8' });
  });

  it('a third label of 24 on the long side cannot hold: the conflict, by how much, and the other consistent reading', () => {
    const { s, tri } = triangleBoard();
    const sol = solutionOf(solveBoard(s.getState(), { unit: 'in' }), tri);
    expect(sol.readings).toHaveLength(2);
    expect(sol.conflicts).toHaveLength(1);
    expect(sol.conflicts[0].reason).toBe(TRIANGLE_EXPECTED.conflict);
    expect(sol.conflicts[0].difference).toBeCloseTo(Math.sqrt(640) - 24, 9);
    expect(sol.readings[0].sentence).toBe(`legs of 24 and 8 make the long side ${TRIANGLE_EXPECTED.longSide}`);
    expect(sol.readings[1].sentence).toBe(TRIANGLE_EXPECTED.other);
    expect(sol.readings[1].conflicts[0].reason).toBe('labelled 24; 24 on the long side and a leg of 8 make it 22.63, 1.37 shorter (6%)');
    // The three labels hold together only if the corner is not the right angle its square declares.
    expect(sol.notes.join(' ')).toMatch(/80\.41°/);
    expect(describeSolution(sol)).toContain(TRIANGLE_EXPECTED.conflict);
  });

  it('the same from a figure built by hand, the way lines meeting will fill it', () => {
    const { right, longLegEnd, shortLegEnd } = TRIANGLE_CORNERS;
    const fig = polygonFigure([right, longLegEnd, shortLegEnd], { id: 'figure:ruled', sideIds: [['l1'], ['l2'], ['l3']] });
    const label = (key: string, t: string, id: string): FigureLabel => ({ key, value: quantity(Number(t), null, { precision: 1 }), text: t, ids: [id], number: id, confidence: 0.9, reason: 'beside it' });
    const labels: FigureLabel[] = [
      label('side0', '24', 'n1'),
      label('side2', '8', 'n2'),
      label('side1', '24', 'n3'),
      { key: 'angle0', value: quantity(90), text: '∟', ids: ['sq'], declared: true, confidence: 1, reason: 'a square in the corner' },
    ];
    const sol = solveFigure(fig, labels, { unit: 'in' });
    expect(sol.conflicts[0].reason).toBe(TRIANGLE_EXPECTED.conflict);
    expect(sol.readings[1].sentence).toBe(TRIANGLE_EXPECTED.other);
    expect(valueOf(sol, 'side1')).toMatchObject({ text: TRIANGLE_EXPECTED.longSide, formula: TRIANGLE_EXPECTED.formula });
  });
});

describe('any triangle from three facts', () => {
  const tri = (v: Point[]) => polygonFigure(v, { id: 'figure:t', sideIds: [['a'], ['b'], ['c']] });
  const side = (key: string, v: number): FigureLabel => ({ key, value: quantity(v, 'in', { precision: 1 }), text: String(v), ids: [key], number: key, confidence: 1, reason: 'written' });
  const angle = (k: number, v: number): FigureLabel => ({ key: `angle${k}`, value: quantity(v, null, { precision: 1 }), text: `${v}°`, ids: [`a${k}`], number: `a${k}`, confidence: 1, reason: 'written' });

  it('SSS: three sides make the angles — 3, 4 and 5 make a right angle', () => {
    const sol = solveFigure(tri([{ x: 0, y: 0 }, { x: 300, y: 0 }, { x: 0, y: 400 }]), [side('side0', 3), side('side1', 5), side('side2', 4)], { unit: 'in' });
    expect(sol.readings).toHaveLength(1);
    const texts = Object.fromEntries(sol.readings[0].values.map((v) => [v.key, v.text]));
    expect(texts).toMatchObject({ angle0: '90°', angle1: '53.13°', angle2: '36.87°', area: '6 in²', perimeter: '12″' });
  });

  it('SAS: two sides and the angle between them make the third', () => {
    const sol = solveFigure(tri([{ x: 0, y: 0 }, { x: 500, y: 0 }, { x: 350, y: 606 }]), [side('side0', 5), side('side2', 7), angle(0, 60)], { unit: 'in' });
    // The larger known side first, as √(24² + 8²) is written.
    expect(valueOf(sol, 'side1')).toMatchObject({ text: '6.24″', formula: '√(7² + 5² − 2 × 7 × 5 × cos 60°)' });
  });

  it('ASA: two angles and the side between them make the rest', () => {
    const sol = solveFigure(tri([{ x: 0, y: 0 }, { x: 1000, y: 0 }, { x: 669, y: 561 }]), [angle(0, 40), angle(1, 60), side('side0', 10)], { unit: 'in' });
    const texts = Object.fromEntries(sol.readings[0].values.map((v) => [v.key, v.text]));
    expect(texts).toMatchObject({ angle2: '80°', side1: '6.53″', side2: '8.79″' });
    expect(valueOf(sol, 'side1')!.formula).toBe('10 × sin 40° ÷ sin 80°');
  });

  it('three angles make no size, and angles that do not add to 180° are said to', () => {
    const sol = solveFigure(tri([{ x: 0, y: 0 }, { x: 1000, y: 0 }, { x: 669, y: 561 }]), [angle(0, 40), angle(1, 60), angle(2, 90)], { unit: 'in' });
    expect(sol.readings).toEqual([]);
    expect(sol.notes.join(' ')).toMatch(/190°/);
  });
});

describe('a rectangle, a circle, an arc', () => {
  it('a rectangle labelled on the board: its diagonal, area and perimeter', () => {
    const s = createSession();
    const r = s.addStroke(rectStroke(100, 100, 300, 100), 1000);
    text(s, '30', box(250, 80), 20000);
    text(s, '10', box(75, 150), 21000);
    const sol = solutionOf(solveBoard(s.getState(), { unit: 'in' }), r);
    expect(sol.conflicts).toEqual([]);
    const texts = Object.fromEntries(sol.readings[0].values.map((v) => [v.key, [v.text, v.formula]]));
    expect(texts.width).toEqual(['30″', undefined]);
    expect(texts.height).toEqual(['10″', undefined]);
    expect(texts.diagonal).toEqual(['31.62″', '√(30² + 10²)']);
    expect(texts.area).toEqual(['300 in²', '30 × 10']);
    expect(texts.perimeter).toEqual(['80″', '2 × (30 + 10)']);
  });

  it('a circle labelled with its circumference gives its radius — a circle skirt’s radius is its waist over 2π', () => {
    const s = createSession();
    const c = s.addStroke(circleStroke(700, 300, 80), 1000);
    text(s, 'waist 28″', box(620, 200, 80, 30), 20000);
    const sol = solutionOf(solveBoard(s.getState()), c);
    expect(valueOf(sol, 'radius')).toMatchObject({ from: 'derived', text: '4.46″', formula: '28 ÷ 2π' });
    expect(valueOf(sol, 'circumference')).toMatchObject({ from: 'labelled', text: '28″' });
    expect(valueOf(sol, 'diameter')!.text).toBe('8.91″');
  });

  it('a circle from any one of radius, diameter, circumference or area', () => {
    const fig: Figure = {
      id: 'figure:c', kind: 'circle', ids: ['c'], vertices: [{ x: 0, y: 0 }],
      sides: [
        { key: 'radius', label: 'the radius', from: { x: 0, y: 0 }, to: { x: 50, y: 0 }, length: 50, ids: ['c'] },
        { key: 'diameter', label: 'the diameter', from: { x: -50, y: 0 }, to: { x: 50, y: 0 }, length: 100, ids: ['c'] },
      ],
      centre: { x: 0, y: 0 }, radius: 50, closed: true, outline: [], reason: 'by hand',
    };
    const one = (key: string, v: number, unit: 'in' | null = 'in') => solveFigure(fig, [{ key, value: quantity(v, unit, { dim: key === 'area' ? 2 : 1 }), text: String(v), ids: ['n'], number: 'n', confidence: 1, reason: 'written' }], { unit: 'in' });
    expect(valueOf(one('radius', 5), 'circumference')).toMatchObject({ text: '31.42″', formula: '2π × 5' });
    expect(valueOf(one('radius', 5), 'area')).toMatchObject({ text: '78.54 in²', formula: 'π × 5²' });
    expect(valueOf(one('diameter', 10), 'radius')).toMatchObject({ text: '5″', formula: '10 ÷ 2' });
    expect(valueOf(one('area', 78.54), 'radius')).toMatchObject({ text: '5.00″', formula: '√(78.54 ÷ π)' });
  });

  it('an arc from its chord and its rise', () => {
    const s = createSession();
    const a = s.addStroke(arcStroke(1400, 400, 80), 1000);
    const sol0 = solveBoard(s.getState());
    const f = sol0.figures.find((x) => x.figure.id === a)!.figure;
    const sol = solveFigure(f, [
      { key: 'chord', value: quantity(12, 'in'), text: '12', ids: ['n1'], number: 'n1', confidence: 1, reason: 'written' },
      { key: 'rise', value: quantity(3, 'in'), text: '3', ids: ['n2'], number: 'n2', confidence: 1, reason: 'written' },
    ], { unit: 'in' });
    expect(valueOf(sol, 'radius')).toMatchObject({ text: '7.5″', formula: '12² ÷ (8 × 3) + 3 ÷ 2' });
    expect(valueOf(sol, 'sweep')!.text).toBe('106.26°');
    expect(valueOf(sol, 'arc')!.text).toBe('13.91″');
  });
});

describe('parts, conflicts and the ink', () => {
  it('a width checked as the sum of its parts: 21″ and 22″ make 43″ ✓', () => {
    const s = createSession();
    const r = s.addStroke(rectStroke(100, 500, 430, 200), 1000);
    s.addStroke(lineStroke({ x: 310, y: 500 }, { x: 310, y: 700 }), 20000);
    text(s, '21″', box(205, 480), 40000);
    text(s, '22″', box(420, 480), 41000);
    text(s, '43″', box(315, 722), 42000);
    text(s, '20″', box(75, 600), 43000);
    const sol = solutionOf(solveBoard(s.getState()), r);
    expect(sol.checks).toContain('21″ and 22″ make 43″ ✓');
    expect(sol.conflicts).toEqual([]);
    expect(valueOf(sol, 'width')!.text).toBe('43″');
  });

  it('parts that do not make their whole are a conflict, with both numbers', () => {
    const s = createSession();
    const r = s.addStroke(rectStroke(100, 500, 430, 200), 1000);
    s.addStroke(lineStroke({ x: 310, y: 500 }, { x: 310, y: 700 }), 20000);
    text(s, '21″', box(205, 480), 40000);
    text(s, '22″', box(420, 480), 41000);
    text(s, '44″', box(315, 722), 42000);
    const sol = solutionOf(solveBoard(s.getState()), r);
    expect(sol.conflicts.map((c) => c.reason).join(' ')).toMatch(/21″ and 22″ make .*43/);
    expect(sol.readings.length).toBe(2);
  });

  it('a circle labelled twice, radius 5 and diameter 12, cannot be both', () => {
    const s = createSession();
    const c = s.addStroke(circleStroke(700, 300, 80), 1000);
    text(s, 'r = 5', box(830, 300, 60, 30), 20000);
    text(s, '⌀ 12', box(700, 410, 60, 30), 21000);
    const sol = solutionOf(solveBoard(s.getState(), { unit: 'in' }), c);
    expect(sol.readings).toHaveLength(2);
    expect(sol.conflicts).toHaveLength(1);
    expect(sol.conflicts[0].reason).toBe('labelled ⌀ 12; a radius of 5 makes it 10, 2 shorter (17%)');
  });

  it('an unlabelled measure is offered from the scale, marked as the ink’s', () => {
    const s = createSession();
    const r = s.addStroke(rectStroke(100, 100, 300, 100), 1000);
    text(s, '30″', box(250, 80), 20000);
    const sol = solutionOf(solveBoard(s.getState()), r);
    const h = sol.ink.find((v) => v.key === 'height')!;
    expect(h).toMatchObject({ from: 'ink', text: '10″' });
    expect(h.reason).toMatch(/drawn to scale/);
    expect(h.reason).toMatch(/the ink’s/);
    // The labelled width is the thing's, and nothing the ink says moves it.
    expect(valueOf(sol, 'width')).toMatchObject({ from: 'labelled', text: '30″' });
  });
});

describe('a right angle is declared, never measured into a fact', () => {
  it('with no square, a corner that measures right is only a reading, the tolerance cited from measure.ts', () => {
    const { s, tri } = triangleBoard({ square: false, longSide: false });
    const sol = solutionOf(solveBoard(s.getState(), { unit: 'in' }), tri);
    expect(sol.readings).toHaveLength(1);
    const r = sol.readings[0];
    expect(r.assumes).toHaveLength(1);
    expect(r.assumes![0]).toMatch(/measures (89|90|91)°/);
    expect(r.assumes![0]).toContain(`±${RIGHT_ANGLE_TOLERANCE}°`);
    expect(r.assumes![0]).toMatch(/a reading, not a fact/);
    expect(r.sentence).toMatch(/^if the corner at [ABC] is right, legs of 24 and 8 make the long side 25\.30″$/);
  });

  it('with no square, three labels are a triangle of their own, and the corner is what they make it', () => {
    const { s, tri } = triangleBoard({ square: false });
    const sol = solutionOf(solveBoard(s.getState(), { unit: 'in' }), tri);
    expect(sol.readings).toHaveLength(1);
    expect(sol.conflicts).toEqual([]);
    expect(sol.readings[0].assumes ?? []).toEqual([]);
    expect(sol.readings[0].values.filter((v) => v.key.startsWith('angle')).map((v) => v.text)).toContain('80.41°');
    expect(sol.notes.join(' ')).toMatch(/measures (89|90|91)° in the ink; the labels make it 80\.41°/);
  });

  it('nothing solved enters the log', () => {
    const { s } = triangleBoard();
    const before = JSON.stringify(s.getEvents());
    solveBoard(s.getState(), { unit: 'in' });
    expect(JSON.stringify(s.getEvents())).toBe(before);
    expect(before).not.toMatch(/25\.3|22\.6/);
  });
});
