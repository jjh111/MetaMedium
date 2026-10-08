// The figure source (MATHS-SPEC §8 Lane A, M16): what a solved figure derives that nobody wrote, as fill-ins.
//
// Draw a right triangle and write 3 and 4 by its legs: the solver already knows the long side is 5, the angles
// 36.87° and 53.13°, the area 6. This says each of them as a fill-in (`fill.ts`, the contract) — a value standing
// faint where it would be written, in its quantity's colour, that a tap writes as the hand's own text, which the
// maths then reads back and checks (`numbersOf`; John, 8 Oct: *written text the maths checks, not a live value*).
//
// What is a fill-in. Every value the top reading of a figure DERIVES — a side, an angle, the area, the perimeter, a
// circle's radius, diameter, circumference and area, an arc's measures, the part of a side that is left — that is
// not written, and every value the ink gives at the drawing's scale (weaker: a lower rank, and it says *at the
// drawing's scale*). A label that cannot hold stands beside what the labels make it (*5.83* beside the written 5):
// a correction the hand makes by changing what it wrote, so a tap writes nothing there.
//
// Where it stands. A side's fill-in stands where the side chip stood (M5's `from` + `away`), the text's own size
// clear of the line; an angle's inside its corner along the bisector, far enough in that the words fit between
// the arms; the area at the centroid; the measures that belong to no side one under another below the figure. At
// the hand's size — the size a label is drawn at on the screen the figure was drawn on — in the board's text face.
//
// What a tap writes. The words as they would be written, named where a bare number would be taken for something
// else (`area 6`, `r = 5`, `⌀ 10`), as a one-line text centred where the ghost stands. Before it is offered the
// text is READ BACK the way the maths would read it (`attachNumber` against the board's figures): a number that
// would not land on the side it is offered for is never offered, and is moved nearer or declined, with the reason —
// a taken value that attaches to the wrong side is the trap (two sides' middles are close on a small figure).
//
// Derived only: nothing here writes, and the fill-ins are kept while the log stands (`fillInsOfSession`).

import type { Bounds, Point } from '../types';
import type { Session, SessionState } from '../session/session';
import { getRep } from '../session/nodes';
import { boardMathsOf, marksOfValue, outwardFrom, placeOf, quantityKeyOf } from './board';
import { attachNumber, readNumber } from './dimension';
import type { BoardNumber, Figure } from './dimension';
import { rectanglePairs } from './solve';
import type { BoardMaths, FigureMaths, SolvedValue } from './solve';
import { fillInsOfSession, fillSourcesVersion } from './fill';
import type { FillContext, FillIn, FillSource, FillTake } from './fill';
import { boardKinds, quantityHues, roleHue } from './hues';
import type { QuantityHue, Role } from './hues';

// ===== What a fill-in is worth =====

export const FILL_SOURCE_ID = 'figure';

/** The hand's label size on the screen a figure was drawn on (the surface's `LABEL_PX`): in canvas units, times the figure's scale. */
export const FILL_TEXT_PX = 13;

/**
 * How strong each kind of fill-in is, 0–1 (the one quiet offer at rest is the strongest). A label that cannot
 * hold is a problem, and outranks any answer; a side, then an angle, then the measures that belong to no side. A
 * value the ink gives at the drawing's scale is `ink` of that; one that rests on a corner the ink only measures
 * right (a reading, not a fact) is `assumed` of that.
 */
export const RANK = Object.freeze({ conflict: 0.9, side: 0.8, angle: 0.7, measure: 0.5, ink: 0.45, assumed: 0.85 });

/** One character is this wide in a fitted text, and a line's text fills this much of its height (`writingDocument`, 13-kinds.js). */
const CHAR_W = 0.62;
const FIT = 0.78;
/** The air between a label and the line it speaks of, and between one below-row and the next, in sizes of the text. */
const GAP = 0.55;

const hypot = (p: Point) => Math.hypot(p.x, p.y);
const sub = (a: Point, b: Point): Point => ({ x: a.x - b.x, y: a.y - b.y });
const add = (a: Point, b: Point): Point => ({ x: a.x + b.x, y: a.y + b.y });
const mul = (a: Point, k: number): Point => ({ x: a.x * k, y: a.y * k });
const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const unit = (p: Point): Point => { const l = hypot(p); return l > 1e-12 ? { x: p.x / l, y: p.y / l } : { x: 1, y: 0 }; };
const cross = (a: Point, b: Point) => a.x * b.y - a.y * b.x;
const mid = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

// ===== Text, as it will be written =====

/** The size a fitted one-line text of these characters stands at, for a font size in canvas units. */
export function textBoxOf(text: string, fontSize: number): { w: number; h: number } {
  return { w: Math.max(1, [...text].length) * CHAR_W * fontSize, h: fontSize / FIT };
}

const boundsAround = (c: Point, w: number, h: number): Bounds => ({ minX: c.x - w / 2, maxX: c.x + w / 2, minY: c.y - h / 2, maxY: c.y + h / 2 });

/** The label size of a figure in canvas units: the hand's `FILL_TEXT_PX` on the screen its strokes were drawn on (their `scale`, the median). */
function fontSizeOf(state: SessionState, f: Figure): number {
  const scales: number[] = [];
  for (const id of f.ids) {
    const n = state.nodes.get(id);
    const st = n && getRep(n, 'stroke');
    const sc = st && (st.data as { scale?: unknown }).scale;
    if (typeof sc === 'number' && sc > 0 && Number.isFinite(sc)) scales.push(sc);
  }
  scales.sort((a, b) => a - b);
  return FILL_TEXT_PX * (scales.length ? scales[Math.floor(scales.length / 2)] : 1);
}

/**
 * The size a fill-in's words stand at, in canvas units: what a text of its take's height is fitted to when it is
 * written, else the hand's label size on the screen the marks it is about were drawn on. A ghost is drawn at the
 * size its words will be written at, so a tap puts them where the ghost was and no bigger.
 */
export function fillFontSize(state: SessionState, fill: FillIn): number {
  if (fill.take.kind === 'text') return (fill.take.bounds.maxY - fill.take.bounds.minY) * FIT;
  const scales: number[] = [];
  for (const id of fill.about) {
    const st = state.nodes.get(id) && getRep(state.nodes.get(id)!, 'stroke');
    const sc = st && (st.data as { scale?: unknown }).scale;
    if (typeof sc === 'number' && sc > 0 && Number.isFinite(sc)) scales.push(sc);
  }
  scales.sort((a, b) => a - b);
  return FILL_TEXT_PX * (scales.length ? scales[Math.floor(scales.length / 2)] : 1);
}

// ===== Where a value stands =====

interface Spot {
  at: Point;
  from?: Point;
  away?: Point;
}

const figureBox = (f: Figure): Bounds => {
  const pts = f.outline.length ? f.outline : f.vertices;
  return { minX: Math.min(...pts.map((p) => p.x)), maxX: Math.max(...pts.map((p) => p.x)), minY: Math.min(...pts.map((p) => p.y)), maxY: Math.max(...pts.map((p) => p.y)) };
};

const centroidOf = (v: readonly Point[]): Point => ({ x: v.reduce((a, p) => a + p.x, 0) / v.length, y: v.reduce((a, p) => a + p.y, 0) / v.length });

/** A label's centre stood clear of `from` along `away`: its nearest edge a gap off the line it speaks of. */
function standOff(from: Point, away: Point, w: number, h: number, gap: number): Point {
  const reach = Math.abs(away.x) * w / 2 + Math.abs(away.y) * h / 2 + gap;
  return add(from, mul(away, reach));
}

/** Whether two boxes meet. */
const meets = (a: Bounds, b: Bounds) => a.minX < b.maxX && a.maxX > b.minX && a.minY < b.maxY && a.maxY > b.minY;

/** The key a side of a figure is standing for when the value is a rectangle's width or height: the side where no number stands. */
function sideForPair(fm: FigureMaths, keys: string[], numbers: readonly BoardNumber[], w: number, h: number, gap: number): string {
  let best = keys[0], bestScore = -Infinity;
  for (const key of keys) {
    const there = placeOf(fm, key);
    if (!there) continue;
    const away = outwardFrom(fm, there);
    const c = standOff(there.at, away, w, h, gap);
    const nearest = numbers.length ? Math.min(...numbers.map((n) => dist(c, n.centre))) : Infinity;
    // Furthest from a written number; on a tie, the lower side, then the right one — where a label is usually written.
    const score = nearest * 1000 + c.y + c.x * 1e-3;
    if (score > bestScore) { bestScore = score; best = key; }
  }
  return best;
}

/**
 * Every place a value's words may stand, the best first: the place its chip stood, and nearer the line it speaks of
 * where that one would be mistaken for another side's (a small figure). Null when it has no place on this figure.
 */
function spotsOf(fm: FigureMaths, key: string, text: string, fs: number, numbers: readonly BoardNumber[], rows: { n: number }): Spot[] | null {
  const f = fm.figure;
  const { w, h } = textBoxOf(text, fs);
  const gap = fs * GAP;
  const side = (k: string, away?: Point): Spot[] | null => {
    const there = placeOf(fm, k);
    if (!there) return null;
    const n = away ?? outwardFrom(fm, there);
    return [1, 0.6, 0.25].map((share) => ({ at: standOff(there.at, n, w, h, gap * share), from: there.at, away: n }));
  };
  const below = (): Spot[] => {
    const b = figureBox(f);
    const row = rows.n++;
    const x = (b.minX + b.maxX) / 2;
    let y = b.maxY + gap + h / 2 + row * (h + gap * 0.5);
    // Not on a number written under the figure: down past it.
    for (let i = 0; i < 8 && numbers.some((n) => meets(boundsAround({ x, y }, w, h), n.bounds)); i++) y += h + gap * 0.5;
    return [{ at: { x, y } }];
  };

  const angle = /^angle(\d+)$/.exec(key);
  if (angle && f.kind === 'triangle') return angleSpots(f, Number(angle[1]), w, h, fs);

  if (/^side\d+(?:\.part\d+)?$/.test(key)) return side(key);
  if (f.kind === 'line' && key === 'length') return side(key);

  switch (f.kind) {
    case 'rectangle': {
      const pair = rectanglePairs(f);
      if (key === 'width') return side(sideForPair(fm, pair.width, numbers, w, h, gap));
      if (key === 'height') return side(sideForPair(fm, pair.height, numbers, w, h, gap));
      if (key === 'area') return [{ at: centroidOf(f.vertices) }];
      return below(); // perimeter, diagonal
    }
    case 'triangle':
    case 'quadrilateral':
    case 'polygon':
      if (key === 'area') return [{ at: centroidOf(f.vertices) }];
      return below(); // perimeter
    case 'circle': {
      if (!f.centre || !f.radius) return below();
      if (key === 'radius') return side('radius', { x: 0, y: -1 });
      if (key === 'diameter') return side('diameter', { x: 0, y: 1 });
      return below(); // circumference, area
    }
    case 'arc':
      if (key === 'chord') return side('chord');
      if (key === 'rise') return side('rise');
      return below(); // radius, sweep, arc length
    default:
      return below();
  }
}

/**
 * Inside the corner, along its bisector, at the nearest distance the words fit between the arms (every corner of
 * their box inside the wedge, a little air off each arm); further in when the first place would be taken for
 * another corner's. A corner too narrow for the words within most of the shorter arm gives its farthest place — the
 * text may not land, and then it is declined with the reason.
 */
function angleSpots(f: Figure, k: number, w: number, h: number, fs: number): Spot[] {
  const n = f.vertices.length;
  const v = f.vertices[k], p = f.vertices[(k - 1 + n) % n], q = f.vertices[(k + 1) % n];
  const a1 = unit(sub(p, v)), a2 = unit(sub(q, v));
  const bis = unit(add(a1, a2));
  const shorter = Math.min(dist(v, p), dist(v, q));
  const reach = 0.7 * shorter;
  const wedge = cross(a1, a2);
  const air = fs * 0.3;
  const fits = (c: Point) => {
    for (const dx of [-w / 2, w / 2]) {
      for (const dy of [-h / 2, h / 2]) {
        const r = sub({ x: c.x + dx, y: c.y + dy }, v);
        // Inside the wedge, and off each arm by the air.
        if (cross(a1, r) * Math.sign(wedge) < air || cross(r, a2) * Math.sign(wedge) < air) return false;
      }
    }
    return true;
  };
  const spots: Spot[] = [];
  const push = (d: number) => {
    const at = add(v, mul(bis, d));
    if (!spots.some((s) => dist(s.at, at) < 1e-9)) spots.push({ at });
  };
  let first: number | null = null;
  for (let d = fs * 1.2; d <= reach; d += fs * 0.25) {
    if (fits(add(v, mul(bis, d)))) { first = d; break; }
  }
  if (first !== null) for (const grow of [1, 1.15, 1.3, 1.5]) push(Math.min(first * grow, Math.max(first, reach)));
  // A corner too narrow, or a figure too small, for the words between its arms: they may touch an arm, but stand
  // inside the figure on the bisector as far in as the corner's reach — the number must still be read as this corner's.
  for (const share of [1, 0.85, 0.7, 0.55]) push(Math.max(fs * 1.2, reach * share));
  return spots;
}

// ===== Would it land? =====

/** The sides a rectangle's width or height may land on; any other key lands on itself. */
function landingKeys(f: Figure, key: string): string[] {
  if (f.kind === 'rectangle' && (key === 'width' || key === 'height')) {
    const pair = rectanglePairs(f);
    return key === 'width' ? pair.width : pair.height;
  }
  return [key];
}

/** The number a text would be, read the way the maths would read it, standing at `centre` with these bounds. */
function probe(text: string, bounds: Bounds, centre: Point): BoardNumber | null {
  const reading = readNumber(text);
  return reading ? { id: 'fill:probe', ids: ['fill:probe'], from: 'text', text, bounds, centre, reading } : null;
}

/** Whether writing `text` with these bounds would attach to this value of this figure — the check a tap's text must pass. */
function lands(board: BoardMaths, figureId: string, key: string, text: string, bounds: Bounds, centre: Point): boolean {
  const f = board.dimensions.figures.find((x) => x.id === figureId);
  const num = probe(text, bounds, centre);
  if (!f || !num) return false;
  const a = attachNumber(num, board.dimensions.figures);
  return (a.as === 'dimension' || a.as === 'angle') && a.figure === figureId && !!a.key && landingKeys(f, key).includes(a.key);
}

/**
 * Whether a fill-in's words, stood with their centre at `centre` — where the surface drew the ghost, nudged off
 * what it would cover — would still be read as the value it was offered for. A fill-in that writes no text has
 * nothing to land, and one that is not the figure source's cannot be judged here: both are true.
 */
export function fillLandsOnBoard(board: BoardMaths | null, fill: FillIn, centre: Point): boolean {
  if (fill.source !== FILL_SOURCE_ID || fill.take.kind !== 'text') return true;
  if (!board) return false;
  const m = /^fig:(.*):([^:]+)$/.exec(fill.quantity);
  if (!m) return false;
  const { w, h } = { w: fill.take.bounds.maxX - fill.take.bounds.minX, h: fill.take.bounds.maxY - fill.take.bounds.minY };
  return lands(board, m[1], m[2], fill.take.text, boundsAround(centre, w, h), centre);
}

/** A fill-in's take with a text moved to be centred at `centre` (where the ghost was drawn); the record itself is not changed. */
export function fillTakeAt(fill: FillIn, centre: Point): FillTake {
  const t = fill.take;
  if (t.kind !== 'text') return t;
  const dx = centre.x - fill.at.x, dy = centre.y - fill.at.y;
  return { kind: 'text', text: t.text, bounds: { minX: t.bounds.minX + dx, maxX: t.bounds.maxX + dx, minY: t.bounds.minY + dy, maxY: t.bounds.maxY + dy } };
}

// ===== What a value is written as =====

const NAMED: Record<string, (n: string) => string> = {
  area: (n) => `area ${n}`,
  perimeter: (n) => `perimeter ${n}`,
  diagonal: (n) => `diagonal ${n}`,
  circumference: (n) => `circumference ${n}`,
  chord: (n) => `chord ${n}`,
  rise: (n) => `rise ${n}`,
  arc: (n) => `arc ${n}`,
};

/**
 * A value as the hand writes it, for the maths to read back: its number (with the drawing's unit only where the
 * drawing writes one), named where a bare number would be taken for another measure — `area 6`, `r = 5`, `⌀ 10`.
 * Null where no number written would be read back as it (an arc's sweep).
 */
function writtenAs(fm: FigureMaths, key: string, v: SolvedValue): string | null {
  const f = fm.figure;
  const isAngle = /^angle\d+$/.test(key);
  if (key === 'sweep') return null;
  const writesUnit = !!fm.drawing?.unit && /written on/.test(fm.drawing.unitReason);
  // The number in the drawing's unit: as the solver says it, less the unit where the drawing writes none.
  const n = isAngle ? v.text : writesUnit ? v.text : v.text.replace(/\s*[^\d.\s][^\d]*$/, '');
  if (isAngle) return n;
  if (f.kind === 'circle') {
    if (key === 'radius') return `r = ${n}`;
    if (key === 'diameter') return `⌀ ${n}`;
  }
  if (f.kind === 'arc' && key === 'radius') return `radius ${n}`;
  if (NAMED[key]) {
    // A named measure takes its number bare, as the page's unit gives it: `area 96`, never `area 96 in²`.
    const bare = v.text.replace(/\s*[^\d.\s][^\d]*$/, '');
    return NAMED[key](writesUnit && key !== 'area' ? n : bare);
  }
  return n;
}

// ===== The geometry a value measures (for the halo) =====

/** What a value on a figure measures, drawn: a side's segment, an angle's two arms, an area's outline. */
function geometryOf(fm: FigureMaths, key: string, spot: Spot | null): { points: Point[]; closed: boolean } {
  const f = fm.figure;
  const seg = (a: Point, b: Point) => ({ points: [a, b], closed: false });
  const side = /^side(\d+)(?:\.part\d+)?$/.exec(key);
  if (side) {
    const there = placeOf(fm, key);
    const s = f.sides[Number(side[1])];
    if (key.includes('.') && there) {
      const part = s?.parts?.find((x) => x.key === key);
      if (part) return seg(part.from, part.to);
    }
    if (s) return seg(s.from, s.to);
  }
  const angle = /^angle(\d+)$/.exec(key);
  if (angle) {
    const k = Number(angle[1]), n = f.vertices.length;
    return { points: [f.vertices[(k - 1 + n) % n], f.vertices[k], f.vertices[(k + 1) % n]], closed: false };
  }
  if (f.kind === 'rectangle' && (key === 'width' || key === 'height')) {
    const pair = rectanglePairs(f);
    const keys = key === 'width' ? pair.width : pair.height;
    const near = spot ? keys.slice().sort((a, b) => dist(spot.at, mid(f.sides.find((s) => s.key === a)!.from, f.sides.find((s) => s.key === a)!.to)) - dist(spot.at, mid(f.sides.find((s) => s.key === b)!.from, f.sides.find((s) => s.key === b)!.to)))[0] : keys[0];
    const s = f.sides.find((x) => x.key === near)!;
    return seg(s.from, s.to);
  }
  if (f.kind === 'rectangle' && key === 'diagonal') return seg(f.vertices[0], f.vertices[2]);
  if (f.kind === 'circle' && f.centre && f.radius) {
    if (key === 'radius' || key === 'diameter') {
      const s = f.sides.find((x) => x.key === key);
      if (s) return seg(s.from, s.to);
    }
  }
  if (f.kind === 'arc') {
    if (key === 'chord' || key === 'rise') {
      const s = f.sides.find((x) => x.key === key);
      if (s) return seg(s.from, s.to);
    }
    if (key === 'sweep' && f.centre) return { points: [f.vertices[0], f.centre, f.vertices[1]], closed: false };
    return { points: f.outline.slice(), closed: false };
  }
  // Area, perimeter, circumference: the whole outline.
  return { points: f.outline.length ? f.outline.slice() : f.vertices.slice(), closed: f.closed };
}

// ===== The roles =====

/** The vertex at which a triangle's top reading has a right angle, or null. */
function rightVertexOf(fm: FigureMaths): number | null {
  if (fm.figure.kind !== 'triangle') return null;
  const top = fm.solution.readings[0];
  if (!top) return null;
  for (const v of top.values) {
    const m = /^angle(\d)$/.exec(v.key);
    if (m && Math.abs(v.value.lo - 90) < 1e-4 && Math.abs(v.value.hi - 90) < 1e-4) return Number(m[1]);
  }
  return null;
}

/**
 * The quantities that play a role of a right triangle (MATHS-SPEC §5): its long side — the one across from the
 * right angle — is the hypotenuse, on every board and whatever the angle is called. (Opposite, adjacent and the
 * angle are seen from a named angle, M14.)
 */
export function roleQuantities(board: BoardMaths | null): Map<string, Role> {
  const out = new Map<string, Role>();
  for (const fm of board?.figures ?? []) {
    const right = rightVertexOf(fm);
    if (right !== null) out.set(quantityKeyOf(fm.figure.id, `side${(right + 1) % 3}`), 'hypotenuse');
  }
  return out;
}

// ===== Every quantity a figure speaks of =====

export interface FigureQuantity {
  /** `fig:<figureId>:<valueKey>`: what it is, for its colour. */
  quantity: string;
  figure: string;
  /** The solver's own key: 'side0', 'angle1', 'area', 'radius'. */
  key: string;
  label: string;
  /** Written (labelled or declared), assumed, derived, or the ink's at the drawing's scale. */
  from: SolvedValue['from'];
  text: string;
  /** The geometry it measures, in canvas units: the halo lies along it. */
  points: Point[];
  closed: boolean;
  /** The marks it is about: a side's own marks. */
  about: string[];
  /** The marks of the numbers written for it, where there are any: the halo behind a written number. */
  numberIds: string[];
  role?: Role;
}

/** The label keys a value on a figure is written under (a rectangle's width is written on either of its sides). */
const writtenUnder = (f: Figure, key: string): string[] => (f.kind === 'rectangle' && (key === 'width' || key === 'height') ? [...landingKeys(f, key), key] : [key]);

/**
 * Every value the top reading of every solved figure speaks of — written, declared, derived or the ink's — with the
 * geometry it measures, its marks, and the marks of the numbers written for it: the quantities the board colours.
 */
export function figureQuantities(board: BoardMaths | null): FigureQuantity[] {
  const out: FigureQuantity[] = [];
  const roles = roleQuantities(board);
  for (const fm of board?.figures ?? []) {
    const top = fm.solution.readings[0];
    const f = fm.figure;
    const push = (v: SolvedValue) => {
      const g = geometryOf(fm, v.key, null);
      const numberIds = fm.labels.filter((l) => !l.declared && writtenUnder(f, v.key).includes(l.key)).flatMap((l) => l.ids);
      const quantity = quantityKeyOf(f.id, v.key);
      out.push({
        quantity, figure: f.id, key: v.key, label: v.label, from: v.from, text: v.text, points: g.points, closed: g.closed,
        about: marksOfValue(fm, v.key), numberIds: [...new Set(numberIds)],
        ...(roles.has(quantity) ? { role: roles.get(quantity)! } : {}),
      });
    };
    if (top) for (const v of top.values) push(v);
    for (const v of fm.solution.ink) push(v);
  }
  return out;
}

// ===== The source =====

/** The ink's words for what it gives: the scale for a length or an area, as drawn for an angle. */
const inkWords = (key: string) => (/^angle\d+$/.test(key) || key === 'sweep' ? 'as the ink draws it' : 'at the drawing’s scale');

function rankOf(key: string): number {
  if (/^side\d+/.test(key) || key === 'length' || key === 'width' || key === 'height' || key === 'chord' || key === 'rise') return RANK.side;
  if (/^angle\d+$/.test(key)) return RANK.angle;
  return RANK.measure;
}

/** The sentence that says a fill-in's value is what it is: the formula with its inputs put in. */
function reasonOf(v: SolvedValue): string {
  return v.formula ? `${v.formula} = ${v.text}` : v.reason;
}

function figureFillIns(state: SessionState, board: BoardMaths): FillIn[] {
  const out: FillIn[] = [];
  const numbers = board.dimensions.numbers;
  const roles = roleQuantities(board);
  const kinds = boardKinds(state);
  const hypotenuse = roleHue('hypotenuse', kinds);

  for (const fm of board.figures) {
    const top = fm.solution.readings[0];
    const f = fm.figure;
    const fs = fontSizeOf(state, f);
    const rows = { n: 0 };
    const contested = new Set((top?.conflicts ?? []).map((c) => c.key));

    const make = (v: SolvedValue, how: 'derived' | 'ink', conflict?: (typeof top.conflicts)[number]) => {
      const key = v.key;
      const written = writtenAs(fm, key, v);
      const shown = written ?? v.text;
      const spots = spotsOf(fm, key, shown, fs, numbers, rows);
      if (!spots || !spots.length) return;
      const quantity = quantityKeyOf(f.id, key);
      const geometry = geometryOf(fm, key, spots[0]);
      const { w, h } = textBoxOf(shown, fs);
      let spot = spots[0];
      let take: FillTake;
      let rank = how === 'ink' ? rankOf(key) * RANK.ink : rankOf(key);
      let reason = how === 'ink' ? `${v.label} ${v.text} ${inkWords(key)} — the ink’s, not the thing’s` : reasonOf(v);
      if (top?.assumes?.length && how === 'derived') {
        reason += ` — ${top.assumes[0]}`;
        rank *= RANK.assumed;
      }
      if (roles.get(quantity) === 'hypotenuse' && hypotenuse.nudged) reason += ` — ${hypotenuse.nudged.said}`;

      if (conflict) {
        // Beside the number that cannot hold: beyond it, the way the side faces.
        const num = numbers.find((n) => n.ids.some((id) => conflict.ids.includes(id)));
        const there = placeOf(fm, key);
        if (num && there) {
          const away = outwardFrom(fm, there);
          const nb = num.bounds;
          const edge = add(num.centre, mul(away, Math.abs(away.x) * (nb.maxX - nb.minX) / 2 + Math.abs(away.y) * (nb.maxY - nb.minY) / 2));
          spot = { at: standOff(edge, away, w, h, fs * GAP * 0.4), from: edge, away };
        }
        rank = RANK.conflict;
        reason = conflict.reason;
        take = { kind: 'none', why: `change the ${conflict.text} you wrote to ${v.text} to make it agree — it stays as written until you do` };
      } else if (written === null) {
        take = { kind: 'none', why: `${v.label} is shown, not written: no number written beside the drawing is read back as ${v.label}` };
      } else {
        // The first place its words would be read back as this value, nearest the line it speaks of last.
        const landed = spots.find((s) => lands(board, f.id, key, written, boundsAround(s.at, w, h), s.at));
        if (landed) {
          spot = landed;
          take = { kind: 'text', text: written, bounds: boundsAround(landed.at, w, h) };
        } else {
          take = { kind: 'none', why: `“${written}” written here would not be read as ${v.label} — write it beside the ${/^angle/.test(key) ? 'corner' : 'side'} yourself` };
        }
      }
      out.push({
        key: `${FILL_SOURCE_ID}:${f.id}:${key}`,
        kind: 'value',
        source: FILL_SOURCE_ID,
        text: shown,
        points: geometry.points,
        closed: geometry.closed,
        at: spot.at,
        ...(spot.from ? { from: spot.from } : {}),
        ...(spot.away ? { away: spot.away } : {}),
        about: marksOfValue(fm, key),
        quantity,
        reason,
        answer: true,
        rank,
        take,
      });
    };

    // A value already written on the figure — and kept, for it agrees — has nothing to offer: it is no fill-in once written.
    const writtenKeys = new Set(fm.labels.filter((l) => !l.declared).map((l) => l.key));
    const isWritten = (key: string) => writtenUnder(f, key).some((k) => writtenKeys.has(k));
    if (top) {
      for (const v of top.values) {
        if (v.from !== 'derived') continue;
        const conflict = top.conflicts.find((c) => c.key === v.key);
        if (!conflict && isWritten(v.key)) continue;
        make(v, 'derived', conflict);
      }
      // A label that cannot hold whose derived value the reading does not carry on its own is still said.
      for (const c of top.conflicts) {
        if (!contested.has(c.key) || out.some((o) => o.quantity === quantityKeyOf(f.id, c.key))) continue;
        const v = top.values.find((x) => x.key === c.key);
        if (v) make(v, 'derived', c);
      }
    }
    for (const v of fm.solution.ink) make(v, 'ink');
  }
  return out;
}

/** The figure source: registered in `fill-builtin.ts`, asked by `fillInsOf` with the board's maths read once. */
export const FIGURE_SOURCE: FillSource = {
  id: FILL_SOURCE_ID,
  fillIns(state: SessionState, ctx: FillContext): FillIn[] {
    const board = ctx.board();
    return board ? figureFillIns(state, board) : [];
  },
};

// ===== The hues of a board's quantities, kept while its log stands =====

type HueMemo = { events: unknown; length: number; last: unknown; sources: number; hues: Map<string, QuantityHue> };
let memo: HueMemo | null = null;

/**
 * The hue of every quantity the board speaks of — the figures' values, written or derived, and every other
 * source's fill-ins — kept while the log and the sources stand, as the fill-ins are. Roles are fixed, the rest
 * placed for the board (`hues.ts`); derived, never logged.
 */
export function quantityHuesOfSession(session: Pick<Session, 'getState' | 'getEvents'>): Map<string, QuantityHue> {
  const events = session.getEvents();
  const last = events.length ? events[events.length - 1] : undefined;
  const sources = fillSourcesVersion();
  if (memo && memo.events === events && memo.length === events.length && memo.last === last && memo.sources === sources) return memo.hues;
  const board = boardMathsOf(session);
  const keys = new Set<string>(figureQuantities(board).map((q) => q.quantity));
  for (const f of fillInsOfSession(session)) keys.add(f.quantity);
  const hues = quantityHues(keys, { roles: roleQuantities(board), kinds: boardKinds(session.getState()) });
  memo = { events, length: events.length, last, sources, hues };
  return hues;
}
