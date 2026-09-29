// Connector heads — what sits at each end of a line or arrow (V1-PLAN §3, §9 E3).
//
// A connector's kind is written at its ends. UML says inheritance with a
// hollow triangle and composition with a filled diamond; a flowchart says
// "then" with an arrow; ER says "zero" with a small circle. So at each end of
// a line, an arrow or an arc this reads what sits there:
//
//   - **the arrow's own barb** — an open arrow; a hollow triangle when the
//     barb is closed across its back in the same stroke; a filled one when
//     ink fills it;
//   - **a small closed mark touching the end** — a triangle, a diamond or a
//     circle, told apart by the corners that hold its hull (a triangle's three
//     hold all of it, a quadrilateral's four, a circle's none), a diamond
//     being a quadrilateral with a diagonal along the line;
//   - **a separate chevron** whose point is the end and whose arms run back
//     along the line — an open arrow drawn in two goes;
//   - **a fill with no outline** — a compact scribble covering its own hull.
//
// **Filled is coverage relative to the head's own area, never a pixel count.**
// A fast hatch leaves gaps, and a head drawn three times the size must read
// the same. So the head's inside is what lies deeper than a share of its own
// inradius from its outline — clear of a wobbling outline — and a place there
// is covered when fill ink lies within a smaller share of that inradius: a
// hollow outline covers none of its inside, a hatch of a few passes most.
// The number is kept on the reading and said in its reason.
//
// **Writing is not a head.** A word, a scribble that reads as writing, or a
// mark somebody has read as a letter, sitting at a line's end, is a label: it
// is left out and the end says so. And a head is SMALL beside its connector
// and sits ON its axis — the box a connector runs to is a node, and a mark
// touching the end from beside it stands where a label stands.
//
// Every reading is derived — plural, each with a confidence and a reason,
// the likeliest first — and nothing is written to the log. Thresholds of the
// hand are cited, not restated: "touching" is the magnet radius relative to
// the head's own size (magnets.ts); the constants below are this module's own.

import type { Point } from '../types';
import type { SessionState } from '../session/session';
import type { MMNode } from '../session/nodes';
import { boundsOf, fingerprintOf, getRep, isWord, placed, strokePointsOf, transcriptOf } from '../session/nodes';
import { snapReading } from '../session/clean';
import { magnetRadius } from '../session/magnets';
import { arrowTipIndex, calculateStraightness } from '../geometry';
import { HAND_RESOLUTION_PX, MAX_TIER0_CONFIDENCE } from '../recognition';

/** What a connector's end can carry. */
export type HeadKind = 'arrow' | 'triangle' | 'diamond' | 'circle';

export interface HeadReading {
  kind: HeadKind;
  /** Ink fills it, or leaves its inside empty. An open arrow has no inside and is never filled. */
  filled: boolean;
  /** 0–1, below the shape rung's own ceiling. */
  confidence: number;
  reason: string;
  /** The marks the head is drawn with — the connector itself, for its own barb. */
  ids: string[];
  /** The head's far point along the line: where the connector really ends. */
  tip: Point;
  /** 0–1: how much of its inside the ink covers. Unset for an open arrow. */
  fill?: number;
}

export interface ConnectorEnd {
  /** Which end of the stroke — the names a bind uses. */
  end: 'start' | 'end';
  /** Where it is: an arrow's tip or tail, a line's first or last point. */
  point: Point;
  /** Every reading of what sits there, the likeliest first. Empty: a plain end. */
  heads: HeadReading[];
  /** What sits there, or that writing does, or that nothing does. */
  reason: string;
}

export interface ConnectorHeads {
  id: string;
  shape: 'line' | 'arrow' | 'arc';
  start: ConnectorEnd;
  end: ConnectorEnd;
}

/** A head is at most this share of its connector's length; past it, the mark at the end is a node the connector runs to. */
export const HEAD_MAX_SHARE = 0.5;
/** A head sits on the connector's axis: its middle within this share of its own size to either side. Further off, it stands where a label stands. */
export const HEAD_AXIS_SHARE = 0.3;
/** A head's inside: deeper than this share of its inradius from its outline, clear of the outline's own wobble. */
export const FILL_CORE = 0.45;
/** Ink covers a place inside within this share of the inradius — so a hatch's gaps up to half the inradius are bridged. */
export const FILL_REACH = 0.25;
/** A head whose inside the ink covers at least this share of is filled; a hollow outline covers none of it. */
export const FILLED_AT = 0.3;
/** Within this of FILLED_AT a head is read both ways, the likelier first. */
export const FILL_UNSURE = 0.1;
/** A barb with two wings encloses its hull at least this roundly (4πA/P²: an even barb is about 0.6, a narrow one 0.5); one wing's hull is a sliver, 0.25 at the most. */
export const BARB_ROUND = 0.35;
/** A barb is closed when its ink runs along this share of its hull's boundary: an open two-wing barb covers two sides of three. */
export const BARB_CLOSED = 0.85;
/** A closed mark whose path is more than this many times its hull's perimeter is an outline and its fill in one stroke. */
export const OUTLINE_PATH = 1.6;
/** A fill with no outline is compact: no more than this many times as long as it is wide. Writing runs wide. */
export const HEAD_COMPACT = 2.2;

const GRID = 40;
const DEG = Math.PI / 180;

// ===== Geometry =====

const sub = (a: Point, b: Point): Point => ({ x: a.x - b.x, y: a.y - b.y });
const dot = (a: Point, b: Point) => a.x * b.x + a.y * b.y;
const cross = (a: Point, b: Point) => a.x * b.y - a.y * b.x;
const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const unit = (v: Point): Point => {
  const l = Math.hypot(v.x, v.y);
  return l > 1e-12 ? { x: v.x / l, y: v.y / l } : { x: 1, y: 0 };
};
const ramp = (v: number, lo: number, hi: number) => Math.max(0, Math.min(1, (v - lo) / (hi - lo)));
const pct = (x: number) => `${Math.round(x * 100)}%`;

/** The convex hull, counter-clockwise (monotone chain): robust to repeats and straight runs. */
function hullOf(points: readonly Point[]): Point[] {
  const pts = [...points].sort((a, b) => a.x - b.x || a.y - b.y);
  if (pts.length < 3) return pts.slice();
  const lower: Point[] = [], upper: Point[] = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross(sub(lower[lower.length - 1], lower[lower.length - 2]), sub(p, lower[lower.length - 2])) <= 0) lower.pop();
    lower.push(p);
  }
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (upper.length >= 2 && cross(sub(upper[upper.length - 1], upper[upper.length - 2]), sub(p, upper[upper.length - 2])) <= 0) upper.pop();
    upper.push(p);
  }
  return lower.slice(0, -1).concat(upper.slice(0, -1));
}

function area(v: readonly Point[]): number {
  let s = 0;
  for (let i = 0; i < v.length; i++) s += cross(v[i], v[(i + 1) % v.length]);
  return Math.abs(s) / 2;
}

function perimeter(v: readonly Point[]): number {
  let s = 0;
  for (let i = 0; i < v.length; i++) s += dist(v[i], v[(i + 1) % v.length]);
  return s;
}

function centroidOf(v: readonly Point[]): Point {
  let a = 0, cx = 0, cy = 0;
  for (let i = 0; i < v.length; i++) {
    const p = v[i], q = v[(i + 1) % v.length];
    const c = cross(p, q);
    a += c;
    cx += (p.x + q.x) * c;
    cy += (p.y + q.y) * c;
  }
  if (Math.abs(a) < 1e-9) return { x: v.reduce((s, p) => s + p.x, 0) / v.length, y: v.reduce((s, p) => s + p.y, 0) / v.length };
  return { x: cx / (3 * a), y: cy / (3 * a) };
}

function distToSegment(p: Point, a: Point, b: Point): number {
  const ab = sub(b, a);
  const l2 = dot(ab, ab);
  const t = l2 > 0 ? Math.max(0, Math.min(1, dot(sub(p, a), ab) / l2)) : 0;
  return Math.hypot(p.x - (a.x + ab.x * t), p.y - (a.y + ab.y * t));
}

function distToRing(p: Point, v: readonly Point[]): number {
  let best = Infinity;
  for (let i = 0; i < v.length; i++) best = Math.min(best, distToSegment(p, v[i], v[(i + 1) % v.length]));
  return best;
}

/** Inside a convex polygon, either way round. */
function insideConvex(p: Point, v: readonly Point[]): boolean {
  if (v.length < 3) return false;
  let sign = 0;
  for (let i = 0; i < v.length; i++) {
    const c = cross(sub(v[(i + 1) % v.length], v[i]), sub(p, v[i]));
    if (Math.abs(c) < 1e-12) continue;
    if (sign === 0) sign = Math.sign(c);
    else if (Math.sign(c) !== sign) return false;
  }
  return true;
}

function distToInk(p: Point, ink: readonly Point[][]): number {
  let best = Infinity;
  for (const line of ink) {
    if (line.length === 1) best = Math.min(best, dist(p, line[0]));
    for (let i = 1; i < line.length; i++) best = Math.min(best, distToSegment(p, line[i - 1], line[i]));
  }
  return best;
}

/** Reduce a hull to at most `max` corners, dropping each time the one whose loss costs least area. */
function reduceHull(hull: readonly Point[], max = 16): Point[] {
  const v = hull.slice();
  while (v.length > max) {
    let k = 0, least = Infinity;
    for (let i = 0; i < v.length; i++) {
      const a = v[(i - 1 + v.length) % v.length], b = v[i], c = v[(i + 1) % v.length];
      const cost = Math.abs(cross(sub(b, a), sub(c, a))) / 2;
      if (cost < least) {
        least = cost;
        k = i;
      }
    }
    v.splice(k, 1);
  }
  return v;
}

/** The largest triangle and quadrilateral with corners on the hull, as shares of its area. */
function cornerFits(hull: readonly Point[]): { three: number; four: number; quad: Point[] } {
  const v = reduceHull(hull);
  const A = area(hull);
  let three = 0, four = 0, quad: Point[] = [];
  const n = v.length;
  for (let i = 0; i < n; i++)
    for (let j = i + 1; j < n; j++)
      for (let k = j + 1; k < n; k++) {
        three = Math.max(three, area([v[i], v[j], v[k]]));
        for (let l = k + 1; l < n; l++) {
          const q = [v[i], v[j], v[k], v[l]];
          const a = area(q);
          if (a > four) {
            four = a;
            quad = q;
          }
        }
      }
  if (n === 3) four = three;
  return { three: A > 0 ? three / A : 0, four: A > 0 ? four / A : 0, quad };
}

// ===== Fill =====

interface Fill {
  /** Share of the inside the fill ink covers. */
  cover: number;
  inradius: number;
}

/**
 * How much of a head's inside its fill covers. The inside is what lies deeper
 * than FILL_CORE of the inradius from the hull's boundary and from the
 * outline's own ink; a place there is covered when fill ink lies within
 * FILL_REACH of the inradius. Measured on a grid laid over the head itself,
 * so the same head at any size reads the same.
 */
function fillOf(hull: readonly Point[], outline: readonly Point[][], fill: readonly Point[][]): Fill {
  const A = area(hull), P = perimeter(hull);
  const inradius = P > 0 ? (2 * A) / P : 0;
  if (inradius <= 0 || !fill.length) return { cover: 0, inradius };
  const xs = hull.map((p) => p.x), ys = hull.map((p) => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs), minY = Math.min(...ys), maxY = Math.max(...ys);
  const cell = Math.max(maxX - minX, maxY - minY) / GRID;
  if (!(cell > 0)) return { cover: 0, inradius };
  let inside = 0, covered = 0;
  for (let y = minY + cell / 2; y < maxY; y += cell) {
    for (let x = minX + cell / 2; x < maxX; x += cell) {
      const p = { x, y };
      if (!insideConvex(p, hull)) continue;
      const depth = Math.min(distToRing(p, hull), outline.length ? distToInk(p, outline) : Infinity);
      if (depth < FILL_CORE * inradius) continue;
      inside++;
      if (distToInk(p, fill) <= FILL_REACH * inradius) covered++;
    }
  }
  return { cover: inside ? covered / inside : 0, inradius };
}

/** How much of a hull's boundary the ink runs along. */
function boundaryCover(hull: readonly Point[], ink: readonly Point[][], reach: number): number {
  const P = perimeter(hull);
  if (P <= 0) return 0;
  const step = P / 60;
  let n = 0, on = 0;
  for (let i = 0; i < hull.length; i++) {
    const a = hull[i], b = hull[(i + 1) % hull.length];
    const L = dist(a, b);
    for (let s = 0; s < L; s += step) {
      const p = { x: a.x + ((b.x - a.x) * s) / L, y: a.y + ((b.y - a.y) * s) / L };
      n++;
      if (distToInk(p, ink) <= reach) on++;
    }
  }
  return n ? on / n : 0;
}

// ===== The connector =====

interface EndGeom {
  end: 'start' | 'end';
  point: Point;
  /** Unit, pointing out of the connector at this end. */
  out: Point;
  /** The arrow's own barb at this end: its ink, from the tip on. */
  barb?: Point[];
}

interface Connector {
  id: string;
  shape: 'line' | 'arrow' | 'arc';
  length: number;
  scale: number;
  ends: [EndGeom, EndGeom];
}

function connectorOf(node: MMNode, nodes: ReadonlyMap<string, MMNode>): Connector | null {
  const pts = strokePointsOf(node);
  const fp = fingerprintOf(node);
  if (!pts || !fp || pts.length < 2 || getRep(node, 'erased') || getRep(node, 'gesture')) return null;
  const shape = snapReading(node, nodes).shape;
  if (shape !== 'line' && shape !== 'arrow' && shape !== 'arc') return null;
  const scale = (getRep(node, 'stroke')?.data as { scale?: number } | undefined)?.scale ?? 1;
  const first = pts[0], last = pts[pts.length - 1];

  if (shape === 'arrow') {
    const meta = getRep(node, 'reading:arrow')?.data as { head?: string; tip?: Point; tail?: Point } | undefined;
    const raw = (getRep(node, 'stroke')?.data as { points?: Point[] } | undefined)?.points;
    if (meta?.tip && meta.tail && raw && raw.length === pts.length) {
      const [, tail] = placed(node, [meta.tip, meta.tail]);
      // The rung's tip is the ink the pen first reached farthest along the
      // shaft (S2: `inkTipIndex`, geometry.ts), one of the stroke's own points
      // — a two-wing barb comes back to the tip between its wings — and the
      // barb is the ink from there on.
      const headAtEnd = meta.head !== 'start';
      const k = arrowTipIndex(raw, { head: meta.head, tip: meta.tip, tail: meta.tail }, HAND_RESOLUTION_PX * scale);
      const tip = pts[k];
      const barb = headAtEnd ? pts.slice(k) : pts.slice(0, k + 1).reverse();
      const u = unit(sub(tip, tail));
      const tipEnd: EndGeom = { end: headAtEnd ? 'end' : 'start', point: tip, out: u, barb };
      const tailEnd: EndGeom = { end: headAtEnd ? 'start' : 'end', point: tail, out: { x: -u.x, y: -u.y } };
      return { id: node.id, shape, length: dist(tip, tail), scale, ends: headAtEnd ? [tailEnd, tipEnd] : [tipEnd, tailEnd] };
    }
  }
  // A line's ends and its heading; an arc's ends and the way it leaves them.
  const along = (t: number) => pts[Math.min(pts.length - 1, Math.max(0, Math.round(t * (pts.length - 1))))];
  const outStart = shape === 'arc' ? unit(sub(first, along(0.15))) : unit(sub(first, last));
  const outEnd = shape === 'arc' ? unit(sub(last, along(0.85))) : unit(sub(last, first));
  return {
    id: node.id,
    shape,
    length: Math.max(dist(first, last), 1e-6),
    scale,
    ends: [
      { end: 'start', point: first, out: outStart },
      { end: 'end', point: last, out: outEnd },
    ],
  };
}

/**
 * A connector's two ends where its INK stands, by the end of the stroke each
 * is: an arrow's tail and its tip — the ink the pen first reached farthest
 * along the shaft, where the rung's own tip can sit a wing's length short —
 * a line's or an arc's first and last points; and which of them is the tail.
 * Null for anything the rung does not read as a line, an arrow or an arc.
 * What a connector's bound ends are, as ink (V1-PLAN E2, session/follow.ts).
 */
export function inkEndsOf(node: MMNode, nodes: ReadonlyMap<string, MMNode>): { start: Point; end: Point; tail: 'start' | 'end' } | null {
  const c = connectorOf(node, nodes);
  if (!c) return null;
  return { start: c.ends[0].point, end: c.ends[1].point, tail: c.shape === 'arrow' && c.ends[0].barb ? 'end' : 'start' };
}

/**
 * A connector's two ends where its ink stands, each with the way the
 * connector leaves through it — a line's and an arrow's along its chord, an
 * arc's along its own curve there — as `headsOf` reads them. Null for
 * anything the rung does not read as a line, an arrow or an arc. What the
 * letter rules ask a connector's ends meet (session.ts, V1-PLAN §9 W1).
 */
export function connectorEndsOf(node: MMNode, nodes: ReadonlyMap<string, MMNode>): { end: 'start' | 'end'; point: Point; out: Point }[] | null {
  const c = connectorOf(node, nodes);
  return c ? c.ends.map((e) => ({ end: e.end, point: e.point, out: e.out })) : null;
}

// ===== Reading a head =====

interface Candidate {
  id: string;
  node: MMNode;
  ink: Point[];
  hull: Point[];
  size: number;
  touch: number; // 0–1, 1 = the end is on it
  axis: number; // 0–1, 1 = centred on the line
}

/** A word, or a mark somebody has read: writing, whatever its shape. */
const isRead = (node: MMNode) => isWord(node) || !!transcriptOf(node);

/** Writing: a word, a mark somebody has read, or a scribble that reads as text and is not a compact fill. */
function isWriting(node: MMNode, nodes: ReadonlyMap<string, MMNode>, ink: readonly Point[], hull: readonly Point[]): boolean {
  if (isRead(node)) return true;
  return snapReading(node, nodes).shape === 'text' && !compactFill(ink, hull);
}

/** The far point of a hull along the line: where the connector really ends. */
function farAlong(hull: readonly Point[], from: Point, out: Point): Point {
  let best = hull[0], bestT = -Infinity;
  for (const p of hull) {
    const t = dot(sub(p, from), out);
    if (t > bestT) {
      bestT = t;
      best = p;
    }
  }
  return { x: best.x, y: best.y };
}

/**
 * Readings of a closed or filled head from its hull: which shape its corners
 * say, each with a score and why. Measured on hand-drawn heads 30 px long —
 * corners rounded up to a quarter of an edge, a shaky hand — the best three
 * corners on the hull hold 64–100% of a triangle but at most 54% of a diamond
 * or a circle; the best four hold 73–100% of a diamond but at most 70% of a
 * circle; and only a circle (or an oval) is as round as 0.9 of a circle's area
 * for its perimeter. The ramps sit in those gaps.
 */
function shapesOf(hull: readonly Point[], out: Point): { kind: 'triangle' | 'diamond' | 'circle'; score: number; why: string }[] {
  const A = area(hull), P = perimeter(hull);
  if (A <= 0 || P <= 0) return [];
  const fits = cornerFits(hull);
  const round = (4 * Math.PI * A) / (P * P);
  const found: { kind: 'triangle' | 'diamond' | 'circle'; score: number; why: string }[] = [];
  const three = ramp(fits.three, 0.56, 0.72);
  if (three > 0) found.push({ kind: 'triangle', score: three, why: `its three corners hold ${pct(fits.three)} of it` });
  // Four corners that three cannot do without; a diamond's diagonal lies along the line.
  const four = ramp(fits.four, 0.7, 0.8) * (1 - three);
  if (four > 0 && fits.quad.length === 4) {
    const q = fits.quad;
    const axisOf = (a: Point, b: Point) => Math.abs(dot(unit(sub(b, a)), out));
    const off = Math.acos(Math.min(1, Math.max(axisOf(q[0], q[2]), axisOf(q[1], q[3])))) / DEG;
    const turned = 1 - ramp(off, 10, 25);
    if (turned > 0) found.push({ kind: 'diamond', score: four * turned, why: `its four corners hold ${pct(fits.four)} of it, a diagonal within ${Math.max(1, Math.round(off))}° of the line` });
  }
  // No corners at all: round.
  const circle = ramp(round, 0.8, 0.92) * (1 - ramp(fits.four, 0.72, 0.8));
  if (circle > 0) found.push({ kind: 'circle', score: circle, why: `round — ${pct(round)} of a circle's area for its perimeter` });
  return found;
}

/** How likely a head is filled, from its cover: 0 or 1 away from FILLED_AT, between within FILL_UNSURE of it. */
const filledShare = (cover: number) => Math.max(0, Math.min(1, 0.5 + (cover - FILLED_AT) / (2 * FILL_UNSURE)));

/**
 * An open barb — the arrow's own, or a separate chevron: an open arrow, or a
 * filled triangle when ink fills it; both, when the fill is too close to call.
 * Never a hollow triangle: nothing closes it.
 */
function openBarb(base: { score: number; ids: string[]; openIds: string[]; tip: Point; lead: string }, fill: Fill, push: (h: HeadReading) => void) {
  const p = filledShare(fill.cover);
  if (p > 0) withFill({ kind: 'triangle', score: base.score * p, ids: base.ids, tip: base.tip, lead: base.lead }, { ...fill, cover: Math.max(fill.cover, FILLED_AT + FILL_UNSURE) }, push, fill.cover);
  if (p < 1)
    push({ kind: 'arrow', filled: false, confidence: MAX_TIER0_CONFIDENCE * base.score * (1 - p), reason: `${base.lead}, open — an arrow`, ids: base.openIds, tip: base.tip });
}

/** One reading, or two when the fill is too close to call. `shown` is the cover said in the reason, when it differs from the one decided on. */
function withFill(
  base: { kind: HeadKind; score: number; ids: string[]; tip: Point; lead: string },
  fill: Fill,
  push: (h: HeadReading) => void,
  shown = fill.cover
) {
  const p = filledShare(fill.cover);
  const said = (filled: boolean) =>
    filled
      ? `filled: ink within reach of ${pct(shown)} of its inside`
      : shown > 0
        ? `hollow: ink covers only ${pct(shown)} of its inside`
        : 'hollow: nothing inside its outline';
  const make = (filled: boolean, share: number) =>
    push({
      kind: base.kind,
      filled,
      confidence: MAX_TIER0_CONFIDENCE * base.score * share,
      reason: `${base.lead}; ${said(filled)} — a ${filled ? 'filled' : 'hollow'} ${base.kind}`,
      ids: base.ids,
      tip: base.tip,
      fill: shown,
    });
  if (p >= 1 || p <= 0) make(p >= 1, 1);
  else {
    make(true, p);
    make(false, 1 - p);
  }
}

/** Other marks inside a hull: its fill. */
function fillsIn(hull: readonly Point[], cands: readonly { id: string; ink: Point[] }[], grow: number): { id: string; ink: Point[] }[] {
  const c = centroidOf(hull);
  const bigger = hull.map((p) => {
    const d = unit(sub(p, c));
    return { x: p.x + d.x * grow, y: p.y + d.y * grow };
  });
  return cands.filter((m) => m.ink.length > 0 && m.ink.filter((p) => insideConvex(p, bigger)).length >= 0.8 * m.ink.length);
}

function readEnd(conn: Connector, e: EndGeom, state: SessionState): ConnectorEnd {
  const nodes = state.nodes;
  const heads: HeadReading[] = [];
  const push = (h: HeadReading) => heads.push(h);
  const artifacts = new Set(state.artifacts);

  // Every other mark that could be ink at this end: whatever lies within a head's length of it.
  const within = HEAD_MAX_SHARE * conn.length + magnetRadius(HEAD_MAX_SHARE * conn.length, conn.scale);
  const others: { id: string; node: MMNode; ink: Point[] }[] = [];
  for (const id of state.contentIds) {
    if (id === conn.id || artifacts.has(id)) continue;
    const node = nodes.get(id);
    if (!node || getRep(node, 'erased') || getRep(node, 'gesture')) continue;
    const b = boundsOf(node);
    if (!b) continue;
    const dx = Math.max(b.minX - e.point.x, 0, e.point.x - b.maxX), dy = Math.max(b.minY - e.point.y, 0, e.point.y - b.maxY);
    if (Math.hypot(dx, dy) > within) continue;
    others.push({ id, node, ink: strokePointsOf(node) ?? [] });
  }
  const used = new Set<string>();
  let writing = false;

  // 1. The arrow's own barb.
  if (e.barb && e.barb.length >= 2) {
    const hull = hullOf(e.barb);
    const size = Math.max(...hull.map((p) => dist(p, e.point)));
    const tip = e.point;
    // One wing encloses nothing — its hull is a sliver; two wings enclose the barb.
    const round = hull.length >= 3 ? (4 * Math.PI * area(hull)) / perimeter(hull) ** 2 : 0;
    if (round >= BARB_ROUND && size > 0) {
      const fills = fillsIn(hull, others.filter((o) => !isRead(o.node)), 0.1 * size);
      fills.forEach((f) => used.add(f.id));
      const fill = fillOf(hull, [e.barb], fills.map((f) => f.ink));
      const closedBack = boundaryCover(hull, [e.barb, ...fills.map((f) => f.ink)], 0.1 * size) >= BARB_CLOSED;
      const ids = [conn.id, ...fills.map((f) => f.id)];
      if (closedBack) withFill({ kind: 'triangle', score: 1, ids, tip, lead: `its own barb at its ${e.end}, closed across its back` }, fill, push);
      else openBarb({ score: 1, ids, openIds: [conn.id], tip, lead: `its own barb at its ${e.end}` }, fill, push);
    } else {
      push({ kind: 'arrow', filled: false, confidence: MAX_TIER0_CONFIDENCE, reason: `its own barb at its ${e.end}, one wing — an open arrow`, ids: [conn.id], tip });
    }
  }

  // 2. Marks touching the end: small beside the connector, on its axis, not writing.
  const near: Candidate[] = [];
  for (const o of others) {
    if (used.has(o.id)) continue;
    const b = boundsOf(o.node);
    if (!b) continue;
    const size = Math.max(b.maxX - b.minX, b.maxY - b.minY);
    if (size > HEAD_MAX_SHARE * conn.length) continue;
    const reach = magnetRadius(size, conn.scale);
    const ink = o.ink.length ? o.ink : [{ x: b.minX, y: b.minY }, { x: b.maxX, y: b.minY }, { x: b.maxX, y: b.maxY }, { x: b.minX, y: b.maxY }];
    const hull = hullOf(ink);
    const d = hull.length >= 3 && insideConvex(e.point, hull) ? 0 : hull.length >= 2 ? distToRing(e.point, hull) : dist(e.point, hull[0]);
    if (d > reach) continue;
    if (isWriting(o.node, nodes, o.ink, hull)) {
      writing = true;
      continue;
    }
    const c = hull.length >= 3 ? centroidOf(hull) : hull[0];
    const across = Math.abs(cross(e.out, sub(c, e.point)));
    const alongIt = dot(e.out, sub(c, e.point));
    if (across > HEAD_AXIS_SHARE * size || alongIt < -size) continue;
    near.push({ id: o.id, node: o.node, ink, hull, size, touch: 1 - 0.5 * (d / reach), axis: 1 - 0.5 * (across / (HEAD_AXIS_SHARE * size)) });
  }

  // 2a. Closed outlines, and what fills them.
  for (const c of near) {
    if (used.has(c.id)) continue;
    const fp = fingerprintOf(c.node);
    if (!fp?.isClosed) continue;
    const pathLength = c.ink.reduce((s, p, i) => (i ? s + dist(p, c.ink[i - 1]) : 0), 0);
    const oneStroke = pathLength > OUTLINE_PATH * perimeter(c.hull);
    const fills = oneStroke ? [] : fillsIn(c.hull, others.filter((o) => o.id !== c.id && !used.has(o.id) && !isRead(o.node)), 0.1 * c.size);
    used.add(c.id);
    fills.forEach((f) => used.add(f.id));
    const hull = hullOf([...c.ink, ...fills.flatMap((f) => f.ink)]);
    const fill = oneStroke ? fillOf(hull, [], [c.ink]) : fillOf(hull, [c.ink], fills.map((f) => f.ink));
    const ids = [c.id, ...fills.map((f) => f.id)];
    const tip = farAlong(hull, e.point, e.out);
    for (const s of shapesOf(hull, e.out)) {
      withFill({ kind: s.kind, score: s.score * c.touch * c.axis, ids, tip, lead: `a closed ${s.kind} touching its ${e.end} — ${s.why}${oneStroke ? ', outline and fill in one stroke' : ''}` }, fill, push);
    }
  }

  // 2b. A separate chevron: its point at the end, its arms back along the line.
  for (const c of near) {
    if (used.has(c.id) || c.ink.length < 3) continue;
    const v = chevronOf(c.ink, e, conn.scale);
    if (!v) continue;
    used.add(c.id);
    const hull = hullOf(c.ink);
    const fills = fillsIn(hull, others.filter((o) => !used.has(o.id) && !isRead(o.node)), 0.1 * c.size);
    fills.forEach((f) => used.add(f.id));
    const fill = fillOf(hull, [c.ink], fills.map((f) => f.ink));
    const lead = `a separate chevron at its ${e.end}, its point on the end and its arms back along the line (${v.why})`;
    openBarb({ score: v.score * c.touch, ids: [c.id, ...fills.map((f) => f.id)], openIds: [c.id], tip: e.point, lead }, fill, push);
  }

  // 2c. A fill with no outline: a compact scribble covering its own hull.
  for (const c of near) {
    if (used.has(c.id) || !c.ink.length) continue;
    if (!compactFill(c.ink, c.hull)) continue;
    used.add(c.id);
    const fill = fillOf(c.hull, [], [c.ink]);
    const tip = farAlong(c.hull, e.point, e.out);
    for (const s of shapesOf(c.hull, e.out)) {
      withFill({ kind: s.kind, score: s.score * c.touch * c.axis * 0.9, ids: [c.id], tip, lead: `a fill at its ${e.end} with no outline — ${s.why}` }, fill, push);
    }
  }

  heads.sort((a, b) => b.confidence - a.confidence);
  // One reading per kind and fill: the likeliest source of it.
  const seen = new Set<string>();
  const readings = heads.filter((h) => {
    const k = `${h.kind}:${h.filled}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  const reason = readings.length
    ? readings[0].reason
    : writing
      ? `writing sits at its ${e.end} — a label, not a head`
      : near.length
        ? `a mark touches its ${e.end} but reads as no head`
        : `a plain ${e.end}: nothing sits there`;
  return { end: e.end, point: { x: e.point.x, y: e.point.y }, heads: readings, reason };
}

/** A chevron's arms are straight: their chords at least this share of their length. Short and quick, so looser than a ruled side. */
const CHEVRON_STRAIGHT = 0.9;

/** A chevron at this end: one bend near the end, both arms running back along the line on either side of it. */
function chevronOf(ink: readonly Point[], e: EndGeom, scale: number): { score: number; why: string } | null {
  const a = ink[0], z = ink[ink.length - 1];
  const L = dist(a, z);
  let k = 0, off = -1;
  ink.forEach((p, i) => {
    const d = L > 1e-9 ? Math.abs(cross(sub(z, a), sub(p, a))) / L : dist(p, a);
    if (d > off) {
      off = d;
      k = i;
    }
  });
  if (k < 2 || k > ink.length - 3) return null;
  const apex = ink[k];
  const size = Math.max(dist(apex, a), dist(apex, z));
  if (dist(apex, e.point) > magnetRadius(size, scale)) return null;
  const arm1 = ink.slice(0, k + 1), arm2 = ink.slice(k);
  if (calculateStraightness(arm1) < CHEVRON_STRAIGHT || calculateStraightness(arm2) < CHEVRON_STRAIGHT) return null;
  const d1 = unit(sub(a, apex)), d2 = unit(sub(z, apex));
  // Both arms run back: at least a little against the line's heading, one on each side of it.
  const back1 = -dot(d1, e.out), back2 = -dot(d2, e.out);
  if (back1 < 0.2 || back2 < 0.2) return null;
  if (Math.sign(cross(e.out, d1)) === Math.sign(cross(e.out, d2))) return null;
  const s1 = Math.acos(Math.min(1, back1)) / DEG, s2 = Math.acos(Math.min(1, back2)) / DEG;
  const even = 1 - Math.abs(s1 - s2) / Math.max(1, s1 + s2);
  const lengths = Math.min(dist(a, apex), dist(z, apex)) / Math.max(1e-6, Math.max(dist(a, apex), dist(z, apex)));
  return { score: Math.max(0.3, even) * ramp(lengths, 0.25, 0.6), why: `arms ${Math.round(s1)}° and ${Math.round(s2)}° off the line` };
}

/** A compact scribble that covers its own hull: a fill, however the rung reads it. */
function compactFill(ink: readonly Point[], hull: readonly Point[]): boolean {
  if (ink.length < 6 || hull.length < 3) return false;
  const xs = hull.map((p) => p.x), ys = hull.map((p) => p.y);
  const w = Math.max(...xs) - Math.min(...xs), h = Math.max(...ys) - Math.min(...ys);
  if (Math.max(w, h) > HEAD_COMPACT * Math.max(1e-6, Math.min(w, h))) return false;
  return fillOf(hull, [], [ink as Point[]]).cover >= FILLED_AT;
}

// ===== Public =====

/**
 * What sits at each end of a line, an arrow or an arc — every reading, the
 * likeliest first, each with a confidence and a reason. Null for anything
 * that is not a connector. Reads the session and changes nothing in it.
 */
export function headsOf(state: SessionState, id: string): ConnectorHeads | null {
  const node = state.nodes.get(id);
  if (!node || !state.contentIds.includes(id)) return null;
  const conn = connectorOf(node, state.nodes);
  if (!conn) return null;
  return { id, shape: conn.shape, start: readEnd(conn, conn.ends[0], state), end: readEnd(conn, conn.ends[1], state) };
}

/**
 * Whether `mark` is a head drawn apart at an end of `connector`, read on the
 * two marks alone by the rules `headsOf` reads a head with: a small closed
 * mark touching that end, on its line, at most half the connector's length —
 * or a separate chevron, its point on the end and its arms back along the
 * line, of any size (the last dash of a dashed line is shorter than the
 * chevron that ends it). Never writing, never a dot below the hand's
 * resolution (an i's), and never a fill with no outline: a scribble at a
 * line's end is as likely a letter of the label written there. The end it
 * sits at, or null. The letter rules ask it so a head drawn right after its
 * connector is never a letter (session.ts, V1-PLAN §9 W1).
 */
export function headApartAt(connector: MMNode, mark: MMNode, nodes: ReadonlyMap<string, MMNode>): 'start' | 'end' | null {
  if (connector === mark || getRep(mark, 'erased') || getRep(mark, 'gesture')) return null;
  const conn = connectorOf(connector, nodes);
  const b = boundsOf(mark);
  const raw = strokePointsOf(mark);
  if (!conn || !b || !raw || raw.length < 3) return null;
  const hull = hullOf(raw);
  if (hull.length < 2 || isWriting(mark, nodes, raw, hull)) return null;
  const size = Math.max(b.maxX - b.minX, b.maxY - b.minY);
  // Below the hand's resolution a mark is a dot — a point, the dot of an i
  // over its stem — and no head.
  const markScale = (getRep(mark, 'stroke')?.data as { scale?: number } | undefined)?.scale ?? 1;
  if (size / markScale < HAND_RESOLUTION_PX) return null;
  const reach = magnetRadius(size, conn.scale);
  for (const e of conn.ends) {
    const d = hull.length >= 3 && insideConvex(e.point, hull) ? 0 : distToRing(e.point, hull);
    if (d > reach) continue;
    if (chevronOf(raw, e, conn.scale)) return e.end;
    if (size > HEAD_MAX_SHARE * conn.length) continue;
    const c = hull.length >= 3 ? centroidOf(hull) : hull[0];
    if (Math.abs(cross(e.out, sub(c, e.point))) > HEAD_AXIS_SHARE * size || dot(e.out, sub(c, e.point)) < -size) continue;
    if (fingerprintOf(mark)?.isClosed) return e.end;
  }
  return null;
}

/** Every connector on the board, and what sits at its ends. */
export function connectorHeads(state: SessionState): ConnectorHeads[] {
  const out: ConnectorHeads[] = [];
  for (const id of state.contentIds) {
    if (state.artifacts.includes(id)) continue;
    const h = headsOf(state, id);
    if (h) out.push(h);
  }
  return out;
}

/** A connector's ends in a line, for a status line, a panel or a brief. */
export function describeHeads(h: ConnectorHeads): string {
  const one = (e: ConnectorEnd) => (e.heads[0] ? `${e.end}: ${e.heads[0].filled ? 'filled ' : e.heads[0].kind === 'arrow' ? 'open ' : 'hollow '}${e.heads[0].kind} ${e.heads[0].confidence.toFixed(2)}` : `${e.end}: plain`);
  return `${h.shape} ${h.id} — ${one(h.start)}; ${one(h.end)}`;
}
