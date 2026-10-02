// True size — a solved figure drawn at its real size (MATHS-PLAN.md §4 "draw
// it to scale"; V1-PLAN.md M7).
//
// Pinned here: John's triangle at true size — a document whose root says
// 24in-ish of paper per 24 units of viewBox, legs exactly 24 and 8 in the
// drawing's unit, laid level and plumb as the ink drew them, and a long side
// 25.30 long, labelled to a place finer than the labels were written (25.3″);
// a triangle whose labels conflict drawn from the reading the solver ranks
// first, and the title saying so; the ink supplying only which side is which
// (a triangle drawn 4:3 and labelled 24 and 8 is drawn 24 and 8); an unsolved
// figure left out and listed; a metric piece in centimetres; a circle, an arc
// and a line; the precision the person wrote (tenths make hundredths, eighths
// make sixteenths); byte-identical output; and nothing entering the log.

import { describe, it, expect } from 'vitest';
import type { Bounds, Point } from '../types';
import { createSession } from '../session/session';
import type { Session } from '../session/session';
import { triangleStroke, rectStroke, circleStroke, lineStroke } from '../test/strokes';
import { polygonFigure } from './dimension';
import type { Figure, FigureLabel } from './dimension';
import { solveBoard, solveFigure } from './solve';
import { quantity } from './quantity';
import { trueSize } from './truesize';
import { TRIANGLE_LABELS, TRIANGLE_CORNERS, TRIANGLE_SQUARE, TRIANGLE_LABEL_BOXES } from './fixtures/triangle';

function text(s: Session, code: string, b: Bounds, at: number): string {
  return s.import({ kind: 'text', path: `text/${at}.txt`, name: code, bounds: b, code, at })!;
}

const box = (cx: number, cy: number, w = 40, h = 30): Bounds => ({ minX: cx - w / 2, maxX: cx + w / 2, minY: cy - h / 2, maxY: cy + h / 2 });

function triangleBoard(opts: { longSide?: boolean } = {}) {
  const s = createSession();
  const { right, longLegEnd, shortLegEnd } = TRIANGLE_CORNERS;
  const tri = s.addStroke(triangleStroke(right, longLegEnd, shortLegEnd), 1000);
  s.addStroke(rectStroke(TRIANGLE_SQUARE.x, TRIANGLE_SQUARE.y, TRIANGLE_SQUARE.size, TRIANGLE_SQUARE.size, 12), 20000);
  text(s, TRIANGLE_LABELS.legs[0], TRIANGLE_LABEL_BOXES.longLeg, 40000);
  text(s, TRIANGLE_LABELS.legs[1], TRIANGLE_LABEL_BOXES.shortLeg, 41000);
  if (opts.longSide !== false) text(s, TRIANGLE_LABELS.long, TRIANGLE_LABEL_BOXES.longSide, 42000);
  return { s, tri };
}

// ===== Reading the SVG back, as a printer would =====

const unescape = (t: string) => t.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&amp;/g, '&');

function rootOf(svg: string) {
  const tag = /<svg\b[^>]*>/.exec(svg)![0];
  const a = (name: string) => new RegExp(`\\s${name}="([^"]*)"`).exec(tag)?.[1];
  const len = (v: string | undefined) => {
    const m = /^([\d.]+)([a-z]+)$/.exec(v ?? '');
    return m ? { value: Number(m[1]), unit: m[2] } : null;
  };
  return { width: len(a('width')), height: len(a('height')), viewBox: (a('viewBox') ?? '').split(/\s+/).map(Number) };
}

function figureGroup(svg: string, id: string): string {
  const esc = id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const m = new RegExp(`<g data-figure="${esc}"[^>]*>([\\s\\S]*?)</g>`).exec(svg);
  if (!m) throw new Error(`no figure ${id} in the svg`);
  return m[1];
}

/** The outline's corners, read from its path: M x y L x y … Z. */
function outlineOf(svg: string, id: string): Point[] {
  const d = /<path data-role="outline" d="([^"]+)"/.exec(figureGroup(svg, id))![1];
  const nums = d.replace(/[MLZ]/g, ' ').trim().split(/[\s,]+/).map(Number);
  const pts: Point[] = [];
  for (let i = 0; i < nums.length; i += 2) pts.push({ x: nums[i], y: nums[i + 1] });
  return pts;
}

function labelTexts(svg: string, id: string): string[] {
  return [...figureGroup(svg, id).matchAll(/<text\b[^>]*>([^<]*)<\/text>/g)].map((m) => unescape(m[1]));
}

const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

function sidesOf(pts: Point[]): { from: Point; to: Point; length: number }[] {
  return pts.map((p, i) => ({ from: p, to: pts[(i + 1) % pts.length], length: dist(p, pts[(i + 1) % pts.length]) }));
}

describe('the right triangle John asked about, at true size', () => {
  it('its root is paper: one unit of its viewBox is one inch', () => {
    const { s } = triangleBoard({ longSide: false });
    const doc = trueSize(solveBoard(s.getState(), { unit: 'in' }));
    expect(doc.unit).toBe('in');
    const root = rootOf(doc.svg);
    expect(root.width).toEqual({ value: doc.width, unit: 'in' });
    expect(root.height).toEqual({ value: doc.height, unit: 'in' });
    expect(root.viewBox).toEqual([0, 0, doc.width, doc.height]);
  });

  it('legs of 24 and 8 and a long side 25.30 long in the drawing’s units, drawn by the numbers', () => {
    const { s, tri } = triangleBoard({ longSide: false });
    const doc = trueSize(solveBoard(s.getState(), { unit: 'in' }));
    const pts = outlineOf(doc.svg, tri);
    expect(pts).toHaveLength(3);
    const lengths = sidesOf(pts).map((x) => x.length).sort((a, b) => a - b);
    expect(lengths[0]).toBeCloseTo(8, 3);
    expect(lengths[1]).toBeCloseTo(24, 3);
    expect(lengths[2]).toBeCloseTo(25.3, 2);
    expect(lengths[2]).toBeCloseTo(Math.sqrt(24 * 24 + 8 * 8), 3);
    // Squared to the page as the ink drew it: the long leg level, the short leg plumb, the corner at the bottom left.
    const legs = sidesOf(pts).filter((x) => x.length < 25);
    const level = legs.find((x) => Math.abs(x.from.y - x.to.y) < 1e-3)!;
    const plumb = legs.find((x) => Math.abs(x.from.x - x.to.x) < 1e-3)!;
    expect(level.length).toBeCloseTo(24, 3);
    expect(plumb.length).toBeCloseTo(8, 3);
    const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(24, 3);
    expect(Math.max(...ys) - Math.min(...ys)).toBeCloseTo(8, 3);
    // The same numbers on the result, for a caller that does not read SVG.
    const f = doc.figures.find((x) => x.id === tri)!;
    expect(f.kind).toBe('triangle');
    expect(f.sides.map((x) => x.length).sort((a, b) => a - b).map((x) => Number(x.toFixed(3)))).toEqual([8, 24, 25.298]);
  });

  it('its labels stand on its sides — as written, and the derived one a place finer than they were written', () => {
    const { s, tri } = triangleBoard({ longSide: false });
    const doc = trueSize(solveBoard(s.getState(), { unit: 'in' }));
    const texts = labelTexts(doc.svg, tri);
    expect(texts).toEqual(expect.arrayContaining(['24″', '8″', '25.3″']));
    expect(texts.join(' ')).not.toMatch(/25\.30|25\.29/);
    const long = doc.figures[0].sides.find((x) => x.length > 25)!;
    expect(long).toMatchObject({ text: '25.3″', source: 'derived', label: 'the long side' });
  });

  it('a scale bar, and a short title that says what it is', () => {
    const { s } = triangleBoard({ longSide: false });
    const doc = trueSize(solveBoard(s.getState(), { unit: 'in' }));
    expect(doc.svg).toMatch(/<g data-scale-bar="6 in"/);
    expect(doc.title).toBe('A triangle at true size, in inches');
    expect(doc.svg).toContain(`<title>${doc.title}</title>`);
  });

  it('the same figures give byte-identical SVG, and no number carries more than a printer can use', () => {
    const one = triangleBoard({ longSide: false });
    const two = triangleBoard({ longSide: false });
    const a = trueSize(solveBoard(one.s.getState(), { unit: 'in' })).svg;
    const b = trueSize(solveBoard(two.s.getState(), { unit: 'in' })).svg;
    expect(a).toBe(b);
    expect(trueSize(solveBoard(one.s.getState(), { unit: 'in' })).svg).toBe(a);
    // A thousandth of an inch is 0.025 mm, finer than a printer's dot; nothing is written finer.
    for (const n of a.match(/\d+\.\d+/g) ?? []) expect(n.split('.')[1].length).toBeLessThanOrEqual(3);
    expect(a).not.toMatch(/e-\d|NaN|Infinity|undefined/);
  });

  it('nothing it draws enters the log, and the ink is not moved', () => {
    const { s } = triangleBoard();
    const before = JSON.stringify(s.getEvents());
    const nodes = JSON.stringify([...s.getState().nodes.values()]);
    trueSize(solveBoard(s.getState(), { unit: 'in' }));
    expect(JSON.stringify(s.getEvents())).toBe(before);
    expect(JSON.stringify([...s.getState().nodes.values()])).toBe(nodes);
  });
});

describe('what is drawn, and from which reading', () => {
  it('labels that conflict: drawn from the reading the solver ranks first, and the title says so', () => {
    const { s, tri } = triangleBoard();
    const doc = trueSize(solveBoard(s.getState(), { unit: 'in' }));
    const lengths = sidesOf(outlineOf(doc.svg, tri)).map((x) => x.length).sort((a, b) => a - b);
    // The first reading keeps the legs: 24 and 8 make the long side 25.30, not the 24 written on it.
    expect(lengths[0]).toBeCloseTo(8, 3);
    expect(lengths[1]).toBeCloseTo(24, 3);
    expect(lengths[2]).toBeCloseTo(Math.sqrt(640), 3);
    expect(doc.title).toBe('A triangle at true size, in inches — drawn from the first of 2 readings: its labels conflict');
    expect(labelTexts(doc.svg, tri)).toContain('25.3″ (labelled 24)');
    expect(doc.notes).toContain('the triangle: the long side is labelled 24, which cannot hold; drawn 25.3″, from the first of 2 readings');
    expect(doc.figures[0]).toMatchObject({ readings: 2 });
    expect(doc.figures[0].conflicts).toHaveLength(1);
  });

  it('the ink says only which side is which: a triangle drawn 4:3 and labelled 24 and 8 is drawn 24 and 8', () => {
    // Legs drawn 200 and 150 canvas units long; labelled 24 and 8, with the corner declared right.
    const fig = polygonFigure([{ x: 100, y: 300 }, { x: 300, y: 300 }, { x: 100, y: 150 }], { id: 'figure:ruled', sideIds: [['l1'], ['l2'], ['l3']] });
    const label = (key: string, t: string, id: string): FigureLabel => ({ key, value: quantity(Number(t), null, { precision: 1 }), text: t, ids: [id], number: id, confidence: 0.9, reason: 'beside it' });
    const sol = solveFigure(fig, [
      label('side0', '24', 'n1'),
      label('side2', '8', 'n2'),
      { key: 'angle0', value: quantity(90), text: '∟', ids: ['sq'], declared: true, confidence: 1, reason: 'a square in the corner' },
    ], { unit: 'in' });
    const doc = trueSize([sol]);
    const pts = outlineOf(doc.svg, 'figure:ruled');
    const s = sidesOf(pts);
    expect(s[0].length).toBeCloseTo(24, 3); // side0, the level one in the ink
    expect(s[0].from.y).toBeCloseTo(s[0].to.y, 6);
    expect(s[2].length).toBeCloseTo(8, 3); // side2, the plumb one
    expect(s[2].from.x).toBeCloseTo(s[2].to.x, 6);
    expect(s[1].length).toBeCloseTo(Math.sqrt(640), 3);
    // The corner goes round the way the ink's does: the short leg stands up from the right angle.
    expect(pts[2].y).toBeLessThan(pts[0].y);
  });

  it('an unsolved figure is left out and listed; unlabelled marks are counted, not named', () => {
    const { s, tri } = triangleBoard({ longSide: false });
    const rect = s.addStroke(rectStroke(600, 100, 300, 100), 50000);
    text(s, '30″', box(750, 80), 51000);
    const line = s.addStroke(lineStroke({ x: 600, y: 500 }, { x: 900, y: 500 }), 52000);
    const doc = trueSize(solveBoard(s.getState(), { unit: 'in' }));
    expect(doc.figures.map((f) => f.id)).toEqual([tri]);
    expect(doc.omitted).toEqual([
      expect.objectContaining({ id: rect, kind: 'rectangle', labelled: true, reason: 'nothing fixes its height' }),
      expect.objectContaining({ id: line, kind: 'line', labelled: false, reason: 'no numbers on it' }),
    ]);
    expect(doc.svg).not.toContain(`data-figure="${rect}"`);
    expect(doc.notes).toContain('left out: the rectangle — nothing fixes its height');
    expect(doc.notes).toContain('left out: 1 mark with no numbers on it');
    expect(doc.title).toBe('A triangle at true size, in inches — 1 figure left out');
    for (const n of doc.notes) expect(doc.svg).toContain(`>${n}<`);
  });

  it('a range is no size to draw until a value is chosen', () => {
    const fig = polygonFigure([{ x: 100, y: 300 }, { x: 340, y: 300 }, { x: 100, y: 220 }], { id: 'figure:r', sideIds: [['a'], ['b'], ['c']] });
    const sol = solveFigure(fig, [
      { key: 'side0', value: { lo: 2, hi: 4, unit: 'in', dim: 1, approx: false, precision: 1 }, text: '2–4″', ids: ['n1'], number: 'n1', confidence: 1, reason: 'written' },
      { key: 'side2', value: quantity(8, 'in', { precision: 1 }), text: '8″', ids: ['n2'], number: 'n2', confidence: 1, reason: 'written' },
      { key: 'angle0', value: quantity(90), text: '∟', ids: ['sq'], declared: true, confidence: 1, reason: 'a square in the corner' },
    ], { unit: 'in' });
    const doc = trueSize([sol]);
    expect(doc.figures).toEqual([]);
    expect(doc.omitted[0].reason).toMatch(/^side AB is 2–4″, a range: /);
  });

  it('bare numbers are no size to print', () => {
    const { s, tri } = triangleBoard({ longSide: false });
    const doc = trueSize(solveBoard(s.getState(), { unit: null }));
    expect(doc.figures).toEqual([]);
    expect(doc.omitted).toEqual([expect.objectContaining({ id: tri, labelled: true, reason: expect.stringMatching(/no unit/) })]);
  });
});

describe('units, kinds and the precision the person wrote', () => {
  it('a metric piece is drawn in centimetres: 50 cm by 80 cm, and its root says so', () => {
    const s = createSession();
    const r = s.addStroke(rectStroke(100, 100, 250, 400), 1000);
    text(s, '50 cm', box(225, 80, 70, 30), 20000);
    text(s, '80 cm', box(60, 300, 70, 30), 21000);
    const doc = trueSize(solveBoard(s.getState()));
    expect(doc.unit).toBe('cm');
    const root = rootOf(doc.svg);
    expect(root.width).toEqual({ value: doc.width, unit: 'cm' });
    expect(root.viewBox).toEqual([0, 0, doc.width, doc.height]);
    const pts = outlineOf(doc.svg, r);
    const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y);
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(50, 3);
    expect(Math.max(...ys) - Math.min(...ys)).toBeCloseTo(80, 3);
    expect(labelTexts(doc.svg, r)).toEqual(expect.arrayContaining(['50 cm', '80 cm']));
    expect(doc.svg).toMatch(/<g data-scale-bar="10 cm"/);
  });

  it('labels written to tenths make a derived side in hundredths; eighths make sixteenths', () => {
    const tri = (id: string) => polygonFigure([{ x: 0, y: 100 }, { x: 300, y: 100 }, { x: 0, y: 0 }], { id, sideIds: [['a'], ['b'], ['c']] });
    const right: FigureLabel = { key: 'angle0', value: quantity(90), text: '∟', ids: ['sq'], declared: true, confidence: 1, reason: 'a square' };
    const leg = (key: string, v: number, p: number, t: string): FigureLabel => ({ key, value: quantity(v, 'in', { precision: p }), text: t, ids: [key], number: key, confidence: 1, reason: 'written' });
    const tenths = trueSize([solveFigure(tri('figure:tenths'), [leg('side0', 7.5, 0.1, '7.5'), leg('side2', 3, 1, '3'), right], { unit: 'in' })]);
    expect(tenths.figures[0].sides.map((x) => x.text)).toEqual(['7.5″', '8.08″', '3″']);
    const eighths = trueSize([solveFigure(tri('figure:eighths'), [leg('side0', 4.125, 0.125, '4⅛'), leg('side2', 2.625, 0.125, '2⅝'), right], { unit: 'in' })]);
    // √(4.125² + 2.625²) = 4.889…, to the nearest sixteenth 4⅞.
    expect(eighths.figures[0].sides.map((x) => x.text)).toEqual(['4⅛″', '4⅞″', '2⅝″']);
    expect(eighths.figures[0].precision).toBe(0.125);
  });

  it('a circle skirt’s waist: a circle of radius 28 ÷ 2π, the radius on it and the waist written inside', () => {
    const s = createSession();
    const c = s.addStroke(circleStroke(700, 300, 80), 1000);
    text(s, 'waist 28″', box(620, 200, 80, 30), 20000);
    const doc = trueSize(solveBoard(s.getState()));
    const g = figureGroup(doc.svg, c);
    const r = Number(/<circle data-role="outline" [^>]*r="([\d.]+)"/.exec(g)![1]);
    expect(r).toBeCloseTo(28 / (2 * Math.PI), 3);
    expect(labelTexts(doc.svg, c)).toEqual(expect.arrayContaining(['r 4.5″', 'waist 28″']));
  });

  it('an arc from its chord and rise: the chord 12 apart, bulging 3, on a radius of 7.5', () => {
    const fig: Figure = {
      id: 'figure:arc', kind: 'arc', ids: ['a'], vertices: [{ x: 0, y: 100 }, { x: 240, y: 100 }, { x: 120, y: 40 }],
      sides: [
        { key: 'chord', label: 'the chord', from: { x: 0, y: 100 }, to: { x: 240, y: 100 }, length: 240, ids: ['a'] },
        { key: 'rise', label: 'the rise', from: { x: 120, y: 100 }, to: { x: 120, y: 40 }, length: 60, ids: ['a'] },
      ],
      centre: { x: 120, y: 190 }, radius: 150, rise: 60, arcLength: 270, closed: false,
      outline: [{ x: 0, y: 100 }, { x: 120, y: 40 }, { x: 240, y: 100 }], reason: 'by hand',
    };
    const sol = solveFigure(fig, [
      { key: 'chord', value: quantity(12, 'in', { precision: 1 }), text: '12', ids: ['n1'], number: 'n1', confidence: 1, reason: 'written' },
      { key: 'rise', value: quantity(3, 'in', { precision: 1 }), text: '3', ids: ['n2'], number: 'n2', confidence: 1, reason: 'written' },
    ], { unit: 'in' });
    const doc = trueSize([sol]);
    const d = /<path data-role="outline" d="M ([\d.]+) ([\d.]+) A ([\d.]+) ([\d.]+) 0 0 [01] ([\d.]+) ([\d.]+)"/.exec(figureGroup(doc.svg, 'figure:arc'))!;
    const [x0, y0, rx, ry, x1, y1] = [1, 2, 3, 4, 5, 6].map((i) => Number(d[i]));
    expect(rx).toBeCloseTo(7.5, 3);
    expect(ry).toBeCloseTo(7.5, 3);
    expect(Math.hypot(x1 - x0, y1 - y0)).toBeCloseTo(12, 3);
    expect(y0).toBeCloseTo(y1, 6); // the chord laid level, as drawn
    const bounds = doc.figures[0].bounds;
    expect(bounds.maxY - bounds.minY).toBeCloseTo(3, 3); // the rise
    expect(bounds.maxX - bounds.minX).toBeCloseTo(12, 3); // a minor arc spans its chord
  });

  it('a document asked for in another unit converts the drawing and keeps the labels as written, and says so', () => {
    const { s, tri } = triangleBoard({ longSide: false });
    const doc = trueSize(solveBoard(s.getState(), { unit: 'in' }), { unit: 'cm' });
    expect(doc.unit).toBe('cm');
    expect(rootOf(doc.svg).width).toEqual({ value: doc.width, unit: 'cm' });
    const lengths = sidesOf(outlineOf(doc.svg, tri)).map((x) => x.length).sort((a, b) => a - b);
    expect(lengths[0]).toBeCloseTo(8 * 2.54, 3);
    expect(lengths[1]).toBeCloseTo(24 * 2.54, 3);
    expect(labelTexts(doc.svg, tri)).toEqual(expect.arrayContaining(['24″', '8″', '25.3″']));
    expect(doc.notes).toContain('the triangle: labelled in inches, drawn in centimetres');
  });

  it('a figure takes the name the person gave it', () => {
    const { s, tri } = triangleBoard();
    const doc = trueSize(solveBoard(s.getState(), { unit: 'in' }), { names: { [tri]: 'gusset' } });
    expect(doc.figures[0].name).toBe('gusset');
    expect(labelTexts(doc.svg, tri)).toContain('gusset');
    expect(doc.notes[0]).toMatch(/^the gusset: the long side is labelled 24/);
  });

  it('figures stand apart in a row, in the order the ink reads left to right', () => {
    const { s, tri } = triangleBoard({ longSide: false });
    const r = s.addStroke(rectStroke(600, 100, 300, 100), 50000);
    text(s, '30″', box(750, 80), 51000);
    text(s, '10″', box(575, 150), 52000);
    const doc = trueSize(solveBoard(s.getState(), { unit: 'in' }));
    expect(doc.figures.map((f) => f.id)).toEqual([tri, r]);
    expect(doc.figures.map((f) => f.name)).toEqual(['triangle', 'rectangle']);
    const [a, b] = doc.figures;
    expect(b.box.minX).toBeGreaterThan(a.box.maxX);
    expect(doc.title).toBe('2 figures at true size, in inches');
    // What the print covers: both pieces, their labels and their names.
    expect(doc.print.region.minX).toBeLessThanOrEqual(a.box.minX);
    expect(doc.print.region.maxX).toBeGreaterThanOrEqual(b.box.maxX);
  });
});
