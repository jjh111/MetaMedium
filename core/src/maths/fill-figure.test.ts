// The figure source (MATHS-SPEC §8 Lane A, M16; T1): what a solved figure derives that nobody wrote, as fill-ins.
//
// The scene (T1): a right triangle with 3 and 4 written as one-line texts by its legs. With it, *5* stands where the
// hypotenuse's label would, and the angles 36.87° and 53.13° at their corners; taking *5* writes one text event the
// maths reads back (`numbersOf`) as the hypotenuse, after which that fill-in is gone and a check holds; change the 4
// to a 5 and the written 5 cannot hold, with 5.83 offered beside it. Pinned beside it, because they are the trap:
// a taken value lands on the side it was offered for — wherever the figure stands, turns or is small — and nothing
// derived ever enters the log.

import { describe, it, expect } from 'vitest';
import type { Bounds, Point } from '../types';
import { createSession } from '../session/session';
import { LOCAL_PARTICIPANT } from '../session/nodes';
import type { Session } from '../session/session';
import { lineStroke, rectStroke, circleStroke, triangleStroke } from '../test/strokes';
import { boardMaths, boardMathsOf, marksOfValue, quantityKeyOf } from './board';
import { fillInsOf, fillInsOfSession, fillInsReport } from './fill';
import type { FillIn } from './fill';
import './fill-builtin';
import {
  FIGURE_SOURCE,
  FILL_TEXT_PX,
  RANK,
  figureQuantities,
  fillLandsOnBoard,
  fillTakeAt,
  quantityHuesOfSession,
  roleQuantities,
} from './fill-figure';
import { ROLE_HUES } from './hues';

// ===== The scene =====

const R = { x: 100, y: 300 }, L = { x: 340, y: 300 }, T = { x: 100, y: 120 };

const box = (cx: number, cy: number, w = 40, h = 17): Bounds => ({ minX: cx - w / 2, maxX: cx + w / 2, minY: cy - h / 2, maxY: cy + h / 2 });
let clock = 40000;
function text(s: Session, code: string, b: Bounds): string {
  clock += 1000;
  return s.import({ kind: 'text', path: `text/${clock}.txt`, name: code, bounds: b, code, at: clock })!;
}

/** A 3-4-5 triangle ruled in three lines, its square in the corner, 4 under the long leg and 3 left of the short one. */
function triangle345(legs: { long?: string; short?: string; hyp?: string } = { long: '4', short: '3' }) {
  const s = createSession();
  const ids = [lineStroke(R, L), lineStroke(T, R), lineStroke(L, T)].map((p, i) => s.addStroke(p, 1000 + i * 4000));
  const square = s.addStroke(rectStroke(100, 285, 15, 15, 12), 20000);
  const written: Record<string, string> = {};
  if (legs.long !== undefined) written.long = text(s, legs.long, box(220, 322));
  if (legs.short !== undefined) written.short = text(s, legs.short, box(76, 210));
  if (legs.hyp !== undefined) written.hyp = text(s, legs.hyp, box(238, 186));
  return { s, ids, square, written };
}

const fillsOf = (s: Session) => fillInsOf(s.getState());
const byQuantity = (fills: FillIn[], tail: string) => fills.find((f) => f.quantity.endsWith(':' + tail));
const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const centreOf = (b: Bounds): Point => ({ x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 });
const takeText = (f: FillIn) => (f.take.kind === 'text' ? f.take : null);

/** Take a fill-in as the surface does — one act, tool `fill`, a text import at the bounds. */
function take(s: Session, f: FillIn, at = 90000): string | null {
  const t = takeText(f);
  if (!t) return null;
  return s.withTool('fill', () => s.import({ kind: 'text', path: `text/${at}.txt`, name: t.text, bounds: t.bounds, code: t.text, at }), f.key);
}

describe('T1: a right triangle with 3 and 4 written by its legs', () => {
  it('offers 5 where the hypotenuse’s label would stand, outside the figure, with its formula as the reason', () => {
    const { s, ids } = triangle345();
    const fills = fillsOf(s);
    const hyp = byQuantity(fills, 'side0')!;
    expect(hyp).toBeDefined();
    expect(hyp).toMatchObject({ kind: 'value', source: 'figure', text: '5', answer: true });
    expect(hyp.key).toMatch(/^figure:.+:side0$/);
    expect(hyp.quantity).toMatch(/^fig:.+:side0$/);
    expect(hyp.reason).toBe('√(4² + 3²) = 5');
    // Beside the middle of the long side, on the side away from the right angle.
    const mid = { x: (L.x + T.x) / 2, y: (L.y + T.y) / 2 };
    expect(dist(hyp.at, mid)).toBeLessThan(60);
    expect(dist(hyp.at, R)).toBeGreaterThan(dist(mid, R));
    expect(hyp.from).toEqual(expect.objectContaining({ x: expect.closeTo(mid.x, 6), y: expect.closeTo(mid.y, 6) }));
    expect(Math.hypot(hyp.away!.x, hyp.away!.y)).toBeCloseTo(1, 6);
    // It is about the hypotenuse's own line, not the legs'.
    expect(hyp.about).toEqual([ids[2]]);
    // The geometry it measures, for the halo: the side's two ends.
    expect(hyp.points).toHaveLength(2);
  });

  it('offers the angles 36.87° and 53.13° at their corners, inside them, along the bisector — and not the right angle, nor the legs it was told', () => {
    const { s } = triangle345();
    const fills = fillsOf(s);
    const board = boardMaths(s.getState())!;
    const f = board.figures[0].figure;
    const quarter = (k: number) => byQuantity(fills, 'angle' + k);
    const found = [0, 1, 2].map((k) => quarter(k)).filter((x): x is FillIn => !!x);
    expect(found.map((x) => x.text).sort()).toEqual(['36.87°', '53.13°']);
    for (const a of found) {
      const k = Number(/angle(\d)$/.exec(a.quantity)![1]);
      const v = f.vertices[k], p = f.vertices[(k + 2) % 3], n = f.vertices[(k + 1) % 3];
      const unit = (q: Point) => { const d = dist(q, v); return { x: (q.x - v.x) / d, y: (q.y - v.y) / d }; };
      const b = { x: unit(p).x + unit(n).x, y: unit(p).y + unit(n).y };
      const bl = Math.hypot(b.x, b.y);
      const d = unit(a.at);
      // On the bisector of the corner it belongs to…
      expect((d.x * b.x + d.y * b.y) / bl).toBeGreaterThan(Math.cos((2 * Math.PI) / 180));
      // …inside the figure.
      expect(inside(f.vertices, a.at)).toBe(true);
      expect(a.reason).toMatch(/^(atan|acos|180° − )/);
      // About the two sides that meet there.
      expect(a.about.length).toBeGreaterThanOrEqual(1);
    }
    // The legs were written, so they are nobody’s fill-in; the corner is declared, so is not either.
    expect(byQuantity(fills, 'side1')).toBeUndefined();
    expect(byQuantity(fills, 'side2')).toBeUndefined();
    expect(fills.filter((x) => /:angle\d$/.test(x.quantity))).toHaveLength(2);
  });

  it('offers the area and the perimeter too, named so the maths reads them back, below those the sides and angles give', () => {
    const { s } = triangle345();
    const fills = fillsOf(s);
    expect(byQuantity(fills, 'area')).toMatchObject({ text: 'area 6', reason: '½ × 4 × 3 = 6' });
    expect(byQuantity(fills, 'perimeter')).toMatchObject({ text: 'perimeter 12' });
    expect(byQuantity(fills, 'side0')!.rank).toBeGreaterThan(byQuantity(fills, 'area')!.rank);
    expect(byQuantity(fills, 'angle1')!.rank).toBeGreaterThan(byQuantity(fills, 'area')!.rank);
    // Strongest first: the hypotenuse leads everything.
    expect(fills[0].quantity).toMatch(/:side0$/);
  });

  it('taking 5 writes one text event at that spot, in the taker’s name, stamped with its tool; the maths reads it as the hypotenuse and checks it', () => {
    const { s } = triangle345();
    const hyp = byQuantity(fillsOf(s), 'side0')!;
    const t = takeText(hyp)!;
    expect(t.text).toBe('5');
    // Centred on the spot the ghost stands at.
    expect(dist(centreOf(t.bounds), hyp.at)).toBeLessThan(1e-6);
    const before = s.getEvents().length;
    const id = take(s, hyp);
    expect(id).toBeTruthy();
    const wrote = s.getEvents().slice(before);
    expect(wrote).toHaveLength(1);
    expect(wrote[0]).toMatchObject({ type: 'import', kind: 'text', code: '5', tool: 'fill', offer: hyp.key });
    expect(wrote[0].type === 'import' ? wrote[0].participantId ?? LOCAL_PARTICIPANT : null).toBe(LOCAL_PARTICIPANT);
    // numbersOf attaches it to the hypotenuse: a label on side0, as written.
    const board = boardMaths(s.getState())!;
    const fm = board.figures[0];
    const label = fm.labels.find((l) => l.number === id);
    expect(label).toBeDefined();
    expect(label!.key).toBe('side0');
    expect(label!.text).toBe('5');
    // The fill-in is gone, and a check holds: nothing conflicts and the label is kept.
    expect(byQuantity(fillsOf(s), 'side0')).toBeUndefined();
    expect(fm.solution.readings[0].conflicts).toEqual([]);
    expect(fm.solution.readings[0].keeps).toContain('5');
    // One undo removes it, and the fill-in is back.
    s.undo();
    expect(s.getEvents().length).toBe(before);
    expect(byQuantity(fillsOf(s), 'side0')?.text).toBe('5');
  });

  it('change the 4 to a 5 and the written 5 cannot hold: 5.83 is offered beside it, and says why', () => {
    const { s, written } = triangle345();
    take(s, byQuantity(fillsOf(s), 'side0')!);
    expect(byQuantity(fillsOf(s), 'side0')).toBeUndefined();
    s.attachCode({ participantId: LOCAL_PARTICIPANT, nodeId: written.long, code: '5', kind: 'text', at: 95000 });
    const board = boardMaths(s.getState())!;
    const top = board.figures[0].solution.readings[0];
    expect(top.conflicts).toHaveLength(1);
    expect(top.conflicts[0].key).toBe('side0');
    const fix = byQuantity(fillsOf(s), 'side0')!;
    expect(fix).toBeDefined();
    expect(fix.text).toBe('5.83');
    expect(fix.answer).toBe(true);
    expect(fix.reason).toContain('5.83');
    // Beside the written 5 — beyond it, along the side’s outward direction — and about the hypotenuse.
    const num = board.dimensions.numbers.find((n) => n.text === '5' && n.ids[0] !== undefined && board.figures[0].labels.some((l) => l.number === n.id && l.key === 'side0'))!;
    expect(num).toBeDefined();
    expect(dist(fix.at, centreOf(num.bounds))).toBeLessThan(70);
    expect(dist(fix.at, centreOf(num.bounds))).toBeGreaterThan(8);
    // It is a correction the hand makes by changing what it wrote, so a tap writes nothing — and says what to do.
    expect(fix.take.kind).toBe('none');
    expect((fix.take as { why: string }).why).toMatch(/5\.83/);
    // A problem outranks an answer.
    expect(fix.rank).toBe(RANK.conflict);
    expect(fix.rank).toBeGreaterThan(RANK.side);
  });

  it('puts the hypotenuse’s quantity on the roles’ table: a right triangle’s long side is the hypotenuse, always', () => {
    const { s } = triangle345();
    const board = boardMaths(s.getState())!;
    const f = board.figures[0].figure;
    const roles = roleQuantities(board);
    expect(roles.get(quantityKeyOf(f.id, 'side0'))).toBe('hypotenuse');
    expect(roles.size).toBe(1);
    const hues = quantityHuesOfSession(s);
    expect(hues.get(quantityKeyOf(f.id, 'side0'))).toMatchObject({ source: 'role', role: 'hypotenuse', hue: ROLE_HUES.hypotenuse });
    // The other quantities of the figure are placed, away from every role.
    expect(hues.get(quantityKeyOf(f.id, 'angle1'))!.source).toBe('placed');
    // And the reason does not say a role was moved: nothing near it.
    expect(byQuantity(fillsOf(s), 'side0')!.reason).not.toMatch(/moved from its usual hue/);
  });
});

describe('one triangle drawn in one stroke, and a board with no maths', () => {
  it('a triangle drawn in one stroke gives the same fill-ins about its one mark', () => {
    const s = createSession();
    const tri = s.addStroke(triangleStroke(T, R, L), 1000);
    s.addStroke(rectStroke(100, 285, 15, 15, 12), 20000);
    text(s, '4', box(220, 322));
    text(s, '3', box(76, 210));
    const fills = fillsOf(s);
    const board = boardMaths(s.getState())!;
    const hyp = fills.find((f) => f.quantity === [...roleQuantities(board).keys()][0])!;
    expect(hyp).toBeDefined();
    expect(hyp.text).toBe('5');
    expect(hyp.about).toEqual([tri]);
    expect(fills.filter((f) => /:angle\d$/.test(f.quantity)).map((f) => f.text).sort()).toEqual(['36.87°', '53.13°']);
  });

  it('says nothing for a board with no numbers on it, a lone figure, or words that are no maths', () => {
    const s = createSession();
    s.addStroke(rectStroke(100, 100, 120, 80), 1000);
    expect(fillsOf(s)).toEqual([]);
    text(s, 'a note about the day', { minX: 300, maxX: 500, minY: 100, maxY: 140 });
    expect(fillsOf(s)).toEqual([]);
    const t = triangle345({ });
    expect(fillsOf(t.s)).toEqual([]);
  });

  it('a figure a number is written far from has nothing to say', () => {
    const { s } = triangle345({});
    text(s, '4', box(2000, 2000));
    expect(fillsOf(s)).toEqual([]);
  });
});

describe('what is derived is never written', () => {
  it('reading the fill-ins changes nothing in the log, and the registry names no source left out', () => {
    const { s } = triangle345();
    const before = JSON.stringify(s.getEvents());
    const report = fillInsReport(s.getState());
    fillInsOfSession(s);
    quantityHuesOfSession(s);
    expect(JSON.stringify(s.getEvents())).toBe(before);
    expect(report.refused).toEqual([]);
    expect(before).not.toMatch(/36\.87|53\.13|√/);
  });

  it('is kept while the log stands, and read again when it changes', () => {
    const { s } = triangle345();
    const a = fillInsOfSession(s);
    expect(fillInsOfSession(s)).toBe(a);
    s.addStroke(circleStroke(900, 600, 30), 99000);
    expect(fillInsOfSession(s)).not.toBe(a);
  });

  it('is the same after a replay of the log, fill-in for fill-in and hue for hue', () => {
    const { s } = triangle345();
    const again = createSession();
    again.load(s.getEvents().slice());
    expect(fillsOf(again).map((f) => [f.key, f.text, f.at, f.rank, f.reason])).toEqual(fillsOf(s).map((f) => [f.key, f.text, f.at, f.rank, f.reason]));
    expect([...quantityHuesOfSession(again)]).toEqual([...quantityHuesOfSession(s)]);
  });
});

describe('a taken value lands on the side it was offered for (the trap)', () => {
  /** A right triangle with its right angle at `r`, its legs along `a` and `b` (unit vectors) of lengths `la` and `lb`, labelled on the outside. */
  function rightTriangle(r: Point, a: Point, b: Point, la: number, lb: number, labelled = true) {
    const s = createSession();
    const A = { x: r.x + a.x * la, y: r.y + a.y * la }, B = { x: r.x + b.x * lb, y: r.y + b.y * lb };
    [lineStroke(r, A), lineStroke(B, r), lineStroke(A, B)].forEach((p, i) => s.addStroke(p, 1000 + i * 4000));
    // The square: in the corner, between the legs.
    const q = Math.min(la, lb) * 0.07 + 3;
    const sq = [r, { x: r.x + a.x * q, y: r.y + a.y * q }, { x: r.x + (a.x + b.x) * q, y: r.y + (a.y + b.y) * q }, { x: r.x + b.x * q, y: r.y + b.y * q }];
    s.addStroke(closedPolyline(sq), 20000);
    const c = { x: (r.x + A.x + B.x) / 3, y: (r.y + A.y + B.y) / 3 };
    const outside = (p: Point, q2: Point, gap: number): Point => {
      const m = { x: (p.x + q2.x) / 2, y: (p.y + q2.y) / 2 };
      let n = { x: -(q2.y - p.y), y: q2.x - p.x };
      const l = Math.hypot(n.x, n.y);
      n = { x: n.x / l, y: n.y / l };
      if ((m.x - c.x) * n.x + (m.y - c.y) * n.y < 0) n = { x: -n.x, y: -n.y };
      return { x: m.x + n.x * gap, y: m.y + n.y * gap };
    };
    if (labelled) {
      const gap = Math.max(14, Math.min(la, lb) * 0.15);
      const p1 = outside(r, A, gap), p2 = outside(B, r, gap);
      text(s, fmtN(la / 60), box(p1.x, p1.y, 24, 14));
      text(s, fmtN(lb / 60), box(p2.x, p2.y, 24, 14));
    }
    return s;
  }

  function closedPolyline(v: Point[]): Point[] {
    const out: Point[] = [];
    for (let i = 0; i < v.length; i++) out.push(...lineStroke(v[i], v[(i + 1) % v.length], 12));
    return out;
  }
  const fmtN = (n: number) => String(Math.round(n * 100) / 100);

  /** Every fill-in with a text take, taken on a copy of the board: where does the number land? */
  function landings(s: Session): { fill: FillIn; landed: string | null; key: string | null; figure: string | null }[] {
    const out: { fill: FillIn; landed: string | null; key: string | null; figure: string | null }[] = [];
    for (const f of fillsOf(s)) {
      const t = takeText(f);
      if (!t) continue;
      const copy = createSession();
      copy.load(s.getEvents().slice());
      const id = take(copy, f, 99000);
      const fm = boardMaths(copy.getState())!.figures.find((x) => x.labels.some((l) => l.number === id));
      const label = fm?.labels.find((l) => l.number === id);
      out.push({ fill: f, landed: id, key: label?.key ?? null, figure: fm?.figure.id ?? null });
    }
    return out;
  }
  const expectedKey = (f: FillIn) => /:([^:]+)$/.exec(f.quantity)![1];
  const okKeys = (f: FillIn, key: string | null) => {
    const want = expectedKey(f);
    return key === want;
  };

  const shapes: [string, Point, Point, Point, number, number][] = [
    ['upright', { x: 200, y: 400 }, { x: 1, y: 0 }, { x: 0, y: -1 }, 240, 180],
    ['turned 25°', { x: 200, y: 400 }, rot({ x: 1, y: 0 }, 25), rot({ x: 0, y: -1 }, 25), 240, 180],
    ['turned 140°', { x: 500, y: 300 }, rot({ x: 1, y: 0 }, 140), rot({ x: 0, y: -1 }, 140), 240, 180],
    ['turned 200°', { x: 500, y: 300 }, rot({ x: 1, y: 0 }, 200), rot({ x: 0, y: -1 }, 200), 240, 180],
    ['turned 310°', { x: 300, y: 300 }, rot({ x: 1, y: 0 }, 310), rot({ x: 0, y: -1 }, 310), 240, 180],
    ['small', { x: 200, y: 400 }, { x: 1, y: 0 }, { x: 0, y: -1 }, 96, 72],
    ['thin', { x: 200, y: 400 }, { x: 1, y: 0 }, { x: 0, y: -1 }, 360, 60],
    ['tall', { x: 200, y: 400 }, { x: 1, y: 0 }, { x: 0, y: -1 }, 90, 300],
  ];

  for (const [name, r, a, b, la, lb] of shapes) {
    it(`${name}: every number a tap writes lands on the side or corner it was offered for`, () => {
      const s = rightTriangle(r, a, b, la, lb);
      const got = landings(s);
      // The hypotenuse (wherever the figure's own numbering puts it) and both angles are offered as text in the ordinary cases.
      const board = boardMaths(s.getState())!;
      const hyp = [...roleQuantities(board).keys()][0];
      expect(got.map((g) => g.fill.quantity)).toContain(hyp);
      expect(got.filter((g) => /:angle\d$/.test(g.fill.quantity))).toHaveLength(2);
      const wrong = got.filter((g) => !okKeys(g.fill, g.key)).map((g) => `${g.fill.text} offered for ${expectedKey(g.fill)} landed on ${g.key} of ${g.figure}`);
      expect(wrong).toEqual([]);
      // And the guard is honest: what it would not stand is said, never written.
      for (const f of fillsOf(s)) if (f.take.kind === 'none') expect((f.take as { why: string }).why.length).toBeGreaterThan(10);
    });
  }

  it('a number the surface moved to avoid something still lands where it was offered, or is known not to', () => {
    const s = rightTriangle({ x: 200, y: 400 }, { x: 1, y: 0 }, { x: 0, y: -1 }, 240, 180);
    const board = boardMaths(s.getState())!;
    for (const f of fillsOf(s)) {
      if (f.take.kind !== 'text') continue;
      // Where it was offered it lands; a long way off along the side it would not (and says so).
      expect(fillLandsOnBoard(board, f, f.at)).toBe(true);
      expect(fillLandsOnBoard(board, f, { x: f.at.x + 4000, y: f.at.y + 4000 })).toBe(false);
    }
  });

  it('fillTakeAt moves a text take to the centre the ghost was drawn at', () => {
    const { s } = triangle345();
    const hyp = byQuantity(fillsOf(s), 'side0')!;
    const moved = fillTakeAt(hyp, { x: hyp.at.x + 10, y: hyp.at.y - 7 });
    expect(moved.kind).toBe('text');
    const t = moved as { bounds: Bounds };
    expect(centreOf(t.bounds).x).toBeCloseTo(hyp.at.x + 10, 6);
    expect(centreOf(t.bounds).y).toBeCloseTo(hyp.at.y - 7, 6);
    // Not mutated: the fill-in is a record the registry keeps.
    expect(centreOf((hyp.take as { bounds: Bounds }).bounds).x).toBeCloseTo(hyp.at.x, 6);
  });
});

describe('the other figures give fill-ins too', () => {
  it('a rectangle given its width and diagonal offers the height, the area and the perimeter, the height on a side where no number stands', () => {
    const s = createSession();
    const id = s.addStroke(rectStroke(100, 100, 300, 225, 20), 1000);
    text(s, '4', box(250, 80)); // width, above
    text(s, 'diagonal 5', box(250, 213, 70));
    const fills = fillsOf(s);
    const h = byQuantity(fills, 'height');
    expect(h).toBeDefined();
    expect(h!.text).toBe('3');
    expect(h!.about).toEqual([id]);
    expect(byQuantity(fills, 'area')).toMatchObject({ text: 'area 12' });
    expect(byQuantity(fills, 'perimeter')).toMatchObject({ text: 'perimeter 14' });
    const board = boardMaths(s.getState())!;
    expect(fillLandsOnBoard(board, h!, h!.at)).toBe(true);
    // Taken, it is the height.
    const copy = createSession();
    copy.load(s.getEvents().slice());
    const nid = take(copy, h!);
    const label = boardMaths(copy.getState())!.figures[0].labels.find((l) => l.number === nid);
    expect(['side1', 'side3']).toContain(label?.key);
  });

  it('a circle given its circumference offers the radius, the diameter and the area, each named so it reads back', () => {
    const s = createSession();
    s.addStroke(circleStroke(300, 300, 100), 1000);
    text(s, 'circumference 31.42', box(300, 440, 140));
    const fills = fillsOf(s);
    // 31.42 is 2π × 5 to the hundredth, so the radius is 5.00 and not exactly 5: the solver says it to two places.
    expect(byQuantity(fills, 'radius')).toMatchObject({ text: 'r = 5.00' });
    expect(byQuantity(fills, 'diameter')).toMatchObject({ text: '⌀ 10.00' });
    expect(byQuantity(fills, 'area')).toMatchObject({ text: expect.stringMatching(/^area 78\.5\d$/) });
    const board = boardMaths(s.getState())!;
    for (const f of fills) {
      if (f.take.kind !== 'text') continue;
      expect(fillLandsOnBoard(board, f, f.at), `${f.text}`).toBe(true);
    }
  });

  it('an arc given its chord offers the rise, the radius and the length at the ink’s scale, named so they read back — and its sweep, which no written number can say, only shown', () => {
    const s = createSession();
    // 120° of a circle of 100: a chord of 173.2 and a rise of 50.
    const pts = Array.from({ length: 60 }, (_, i) => { const a = ((-150 + (i / 59) * 120) * Math.PI) / 180; return { x: 300 + 100 * Math.cos(a), y: 300 + 100 * Math.sin(a) }; });
    s.addStroke(pts, 1000);
    const mid = { x: (pts[0].x + pts[59].x) / 2, y: (pts[0].y + pts[59].y) / 2 };
    text(s, 'chord 8', box(mid.x, mid.y + 30, 70));
    const fills = fillsOf(s);
    const board = boardMaths(s.getState())!;
    expect(byQuantity(fills, 'rise')).toMatchObject({ text: 'rise 2.31', answer: true });
    expect(byQuantity(fills, 'radius')).toMatchObject({ text: 'radius 4.62' });
    expect(byQuantity(fills, 'arc')).toMatchObject({ text: 'arc 9.67' });
    const sweep = byQuantity(fills, 'sweep')!;
    expect(sweep.text).toBe('120°');
    expect(sweep.take.kind).toBe('none');
    for (const f of fills) {
      expect(f.rank, f.text).toBeLessThan(RANK.side);
      expect(f.reason).toMatch(/at the drawing’s scale|as the ink draws it/);
      if (f.take.kind === 'text') expect(fillLandsOnBoard(board, f, f.at), f.text).toBe(true);
    }
  });

  it('a value the ink gives at the drawing’s scale is weaker, and says so', () => {
    const s = createSession();
    s.addStroke(rectStroke(100, 100, 300, 150, 20), 1000);
    text(s, '8', box(250, 80)); // the width alone: the scale is the ink’s
    const fills = fillsOf(s);
    const h = byQuantity(fills, 'height');
    expect(h).toBeDefined();
    expect(h!.reason).toMatch(/at the drawing’s scale/);
    expect(h!.rank).toBeLessThan(RANK.side);
    expect(h!.rank).toBeLessThan(RANK.angle);
    expect(h!.answer).toBe(true);
  });

  it('a source that has nothing to say gives nothing, and one that throws is left out by the registry, not here', () => {
    const s = createSession();
    expect(FIGURE_SOURCE.fillIns(s.getState(), { board: () => null })).toEqual([]);
    expect(FIGURE_SOURCE.id).toBe('figure');
  });
});

describe('the quantities of a board', () => {
  it('lists every value a figure speaks of — written and derived — with the geometry it measures and its marks', () => {
    const { s, ids } = triangle345();
    const board = boardMathsOf(s)!;
    const qs = figureQuantities(board);
    const f = board.figures[0].figure;
    const by = (k: string) => qs.find((q) => q.quantity === quantityKeyOf(f.id, k))!;
    expect(by('side0')).toMatchObject({ from: 'derived', closed: false });
    expect(by('side1')).toMatchObject({ from: 'labelled' });
    expect(by('side1').numberIds.length).toBe(1);
    expect(by('angle2')).toMatchObject({ from: 'declared' });
    expect(by('area').closed).toBe(true);
    expect(by('side0').points).toHaveLength(2);
    expect(by('angle1').points).toHaveLength(3);
    expect(marksOfValue(board.figures[0], 'side0')).toEqual([ids[2]]);
    expect(marksOfValue(board.figures[0], 'angle1').sort()).toEqual([ids[0], ids[2]].sort());
    expect(marksOfValue(board.figures[0], 'area').sort()).toEqual([...ids].sort());
  });

  it('FILL_TEXT_PX is the hand’s label size, 13', () => {
    expect(FILL_TEXT_PX).toBe(13);
  });
});

// ===== geometry =====

function rot(p: Point, deg: number): Point {
  const a = (deg * Math.PI) / 180;
  return { x: p.x * Math.cos(a) - p.y * Math.sin(a), y: p.x * Math.sin(a) + p.y * Math.cos(a) };
}
function inside(poly: Point[], p: Point): boolean {
  let c = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    if (poly[i].y > p.y !== poly[j].y > p.y && p.x < ((poly[j].x - poly[i].x) * (p.y - poly[i].y)) / (poly[j].y - poly[i].y) + poly[i].x) c = !c;
  }
  return c;
}
