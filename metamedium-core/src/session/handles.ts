// Handles — a mark's own points, made draggable (V1-PLAN §4 and §9 E1;
// CONTROL-POINTS-PLAN P2, John's ask for *point control on selected*).
//
// The magnets (magnets.ts) say where a mark offers attachment: a box's
// corners, edge middles and centre, a circle's centre and cardinals, a line's
// or an arrow's tail, tip and middle, a triangle's corners and centroid, a
// dot's point. Handles are THE SAME SITES made draggable — read off the same
// clean form, so what the hand drags is what the pen binds to — and for an
// arc its two ends and its BULGE, the third point an arc is drawn through
// (its magnet at the middle of its span lies on nothing, so it is no handle).
// A notation's ports are the pen's, never a handle: only a mark's own points.
//
// Only a mark with a clean form has them: one it holds, or the one it would
// be offered (clean.ts, the magnets' rule). A mark with none — writing, ink
// the rung cannot place or cannot tell between two readings — has none, and
// nothing is pretended.
//
// ===== The act =====
//
// Dragging one writes ONE event, `reshape { id, handle, to, at }` — one act,
// taken back whole by one undo (L2j). `handle` is `{ kind, index }` as it is
// named here, and `to` is where the hand let go IN THE MARK'S OWN SPACE (the
// space its ink was drawn in; `unplaced`, nodes.ts), so a move, a scale or a
// turn that the merge puts before it or after it carries the reshape as it
// carries the ink. The event reshapes the mark's `'clean'` rep and nothing
// else: the ink is never touched (it stays faint beneath), and a mark not yet
// snapped is snapped by the same act — its clean form is born reshaped from
// the one it was offered. State stays a pure function of the log: the same
// form, the same handle and the same point give the same form on every board.
//
// ===== Per shape =====
//
//   - A rectangle keeps its own frame — turned, or leaning (a data symbol):
//     a CORNER goes where the hand lets it go and the corner across it stays,
//     the sides keeping their directions (the drag is taken in the frame of
//     the two sides that meet at the fixed corner, so a turn and a lean are
//     kept exactly); an EDGE MIDDLE moves that one side, across only; the
//     CENTRE moves the form whole. Dragged past the side across, a box
//     flips, each corner keeping its number — a bound connector (E2) follows
//     the same corner. No side goes under MIN_EXTENT_PX of the hand.
//   - A circle's CARDINAL sets its radius (a round one stays round; an oval
//     sets the axis the cardinal is on); its CENTRE moves it.
//   - A line's TAIL or TIP moves that end; its MIDDLE moves it whole.
//   - An arrow likewise, and its head is kept at the tip, drawn along the new
//     shaft: the barb the hand drew, at most a fifth of the shaft (as
//     `idealize` keeps it) and at least a fortieth, so the form drawn again as
//     ink still reads as an arrow however long the shaft is pulled.
//   - A triangle's CORNER moves freely, the other two held; its CENTRE moves
//     it whole.
//   - An arc's TAIL or TIP moves that end and the arc keeps its sweep — the
//     whole arc turned and scaled about the other end; its BULGE bends it: the
//     arc through its two ends and the point on their chord's perpendicular
//     where the hand lets go, the chord's own side or the other.
//   - A dot's POINT moves it.
//
// A reshaped form carries `reshaped` — the handle last dragged — and is the
// hand's own geometry, not the ink's measurements redrawn: where the mark
// stands is read from it (`boundsOf`, `standingPointsOf`, nodes.ts), so its
// sites, its maths and the relations read from where it stands follow it.
// What the ink was READ as does not change — the shape rung's readings are
// measurements of the ink, and the ink is as it was drawn — so a rectangle
// dragged into a thin bar is still a rectangle: its form says so.

import type { Point } from '../types';
import type { MMNode } from './nodes';
import { getRep, placed, unplaced } from './nodes';
import { type CleanShape, arcThrough, arrowPoints, cleanOf, idealize, snapReading } from './clean';
import { magnetSites } from './magnets';
import { getBounds } from '../geometry';

/** What a handle is on its mark: the magnets' own kinds, and an arc's bulge. */
export type HandleKind = 'corner' | 'middle' | 'centre' | 'cardinal' | 'tip' | 'tail' | 'point' | 'bulge';

export interface Handle {
  nodeId: string;
  /** The clean form it belongs to: 'rectangle', 'circle', … */
  shape: string;
  kind: HandleKind;
  /** 0-based among same-kind handles of the mark, in the magnets' order (corners TL, TR, BR, BL; cardinals N, E, S, W). */
  index: number;
  /** Where it stands on the board. */
  point: Point;
  /** What dragging it does, in words. */
  reasoning: string;
}

/** A reshape as it would stand: the mark holding the reshaped clean form, and where the handle lands in the mark's own space. */
export interface ReshapePreview {
  node: MMNode;
  clean: CleanShape;
  to: Point;
}

/**
 * No side, radius, shaft or arc is made shorter than this by a handle: a few
 * of the HAND's pixels (the stroke's own scale), so a box pulled flat is a
 * thin bar and never a line of no width, and the next drag still has a frame
 * to work in.
 */
export const MIN_EXTENT_PX = 2;

/** The handles each clean form has, by kind and how many — the magnets' own sites, and an arc's bulge. */
const HANDLES: Readonly<Record<string, readonly (readonly [HandleKind, number])[]>> = {
  rectangle: [['corner', 4], ['middle', 4], ['centre', 1]],
  circle: [['centre', 1], ['cardinal', 4]],
  line: [['tail', 1], ['tip', 1], ['middle', 1]],
  arrow: [['tail', 1], ['tip', 1], ['middle', 1]],
  triangle: [['corner', 3], ['centre', 1]],
  arc: [['tail', 1], ['tip', 1], ['bulge', 1]],
  dot: [['point', 1]],
};

/** Whether a clean form of `shape` has this handle. */
function hasHandle(shape: string, handle: { kind: string; index: number }): boolean {
  const own = HANDLES[shape];
  if (!own || !handle || typeof handle.kind !== 'string' || !Number.isInteger(handle.index)) return false;
  return own.some(([kind, n]) => kind === handle.kind && handle.index >= 0 && handle.index < n);
}

/**
 * The clean form a mark holds, or the one it would be offered (the magnets'
 * rule), in the mark's own space — null for a mark with none, which has no
 * handles. Ink only: an artifact, a word, a gesture or an erased mark has none.
 */
export function cleanFormOf(node: MMNode, nodes: ReadonlyMap<string, MMNode>): { clean: CleanShape; held: boolean; confidence: number } | null {
  if (!getRep(node, 'stroke') || getRep(node, 'erased') || getRep(node, 'gesture')) return null;
  const held = cleanOf(node);
  if (held) return HANDLES[held.shape] ? { clean: held, held: true, confidence: getRep(node, 'clean')!.confidence ?? 0 } : null;
  const reading = snapReading(node, nodes);
  if (!reading.ok) return null;
  const ideal = idealize(node, reading.shape);
  return ideal && HANDLES[ideal.shape] ? { clean: ideal, held: false, confidence: reading.weight } : null;
}

/** The mark as it would stand holding `clean`: its own node, but for the clean form. */
function holding(node: MMNode, clean: CleanShape, confidence: number): MMNode {
  return { ...node, reps: [...node.reps.filter((r) => r.modality !== 'clean'), { modality: 'clean', data: clean, confidence, source: 'engine' }] };
}

/** What dragging each handle does, in words. */
function wordsFor(shape: string, kind: string): string {
  switch (kind) {
    case 'corner':
      return shape === 'rectangle' ? 'a corner — drag it to size the box from the corner across it, its sides as they stand' : 'a corner — drag it anywhere; the other two stay';
    case 'middle':
      return shape === 'rectangle' ? 'the middle of a side — drag it to move that side, across only' : 'its middle — drag it to move it whole';
    case 'centre':
      return 'its centre — drag it to move the clean form whole; the ink stays where it was drawn';
    case 'cardinal':
      return 'on its rim — drag it to set the radius';
    case 'tail':
    case 'tip':
      return shape === 'arc' ? 'an end — drag it; the arc keeps its sweep' : shape === 'arrow' && kind === 'tip' ? 'its tip — drag it; the head goes with it' : 'an end — drag it; the other end stays';
    case 'bulge':
      return 'its bulge — drag it to bend the arc through its two ends';
    case 'point':
      return 'drag it to move the dot';
  }
  return '';
}

/**
 * The handles of one mark: its own sites, read off the clean form it holds or
 * would be offered, and an arc's bulge — none for a mark with no clean form.
 * The surface shows them while that mark alone is selected.
 */
export function handlesOf(node: MMNode, nodes: ReadonlyMap<string, MMNode>): Handle[] {
  const form = cleanFormOf(node, nodes);
  if (!form) return [];
  const shape = form.clean.shape;
  // Read off the form the mark would hold — born reshaped from the offer, a
  // handle's first drag starts where the handle is drawn.
  const standing = form.held ? node : holding(node, form.clean, form.confidence);
  const out: Handle[] = [];
  for (const site of magnetSites(standing, nodes)) {
    if (site.notation || !hasHandle(shape, site)) continue;
    out.push({ nodeId: node.id, shape, kind: site.kind as HandleKind, index: site.index, point: site.point, reasoning: wordsFor(shape, site.kind) });
  }
  if (shape === 'arc') {
    const pts = placed(node, form.clean.points);
    out.push({ nodeId: node.id, shape, kind: 'bulge', index: 0, point: pts[Math.round((pts.length - 1) / 2)], reasoning: wordsFor(shape, 'bulge') });
  }
  return out;
}

/**
 * What dragging `handle` to `to` — on the board, where the mark stands — would
 * make of the mark, or null when it makes nothing (no clean form, a handle it
 * does not have, a drag that would leave no extent). The same function the
 * session's door and its replay run, so the preview is the act.
 */
export function reshapePreview(node: MMNode, nodes: ReadonlyMap<string, MMNode>, handle: { kind: string; index: number }, to: Point): ReshapePreview | null {
  if (!to || !Number.isFinite(to.x) || !Number.isFinite(to.y)) return null;
  const [own] = unplaced(node, [{ x: to.x, y: to.y }]);
  const clean = reshapedClean(node, nodes, handle, own);
  if (!clean) return null;
  const form = cleanFormOf(node, nodes)!;
  return { node: holding(node, clean, form.confidence), clean, to: { x: own.x, y: own.y } };
}

/**
 * The mark's clean form reshaped by a handle let go at `to`, IN THE MARK'S
 * OWN SPACE — what a `reshape` event makes, on every board. Null when there
 * is nothing to reshape or nothing it can become.
 */
export function reshapedClean(node: MMNode, nodes: ReadonlyMap<string, MMNode>, handle: { kind: string; index: number }, to: Point): CleanShape | null {
  if (!to || !Number.isFinite(to.x) || !Number.isFinite(to.y)) return null;
  const form = cleanFormOf(node, nodes);
  if (!form || !hasHandle(form.clean.shape, handle)) return null;
  const scale = (getRep(node, 'stroke')?.data as { scale?: number } | undefined)?.scale;
  return reshapeClean(form.clean, handle, to, MIN_EXTENT_PX * (scale && scale > 0 ? scale : 1));
}

// ===== The geometry, one clean form at a time =====

const sub = (a: Point, b: Point): Point => ({ x: a.x - b.x, y: a.y - b.y });
const add = (a: Point, b: Point): Point => ({ x: a.x + b.x, y: a.y + b.y });
const mul = (a: Point, k: number): Point => ({ x: a.x * k, y: a.y * k });
const mid = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
const cross = (a: Point, b: Point) => a.x * b.y - a.y * b.x;
const len = (a: Point) => Math.hypot(a.x, a.y);
const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const pt = (p: Point): Point => ({ x: p.x, y: p.y });
const r0 = (v: number) => Math.round(v);
const deg = (rad: number) => (rad * 180) / Math.PI;
const CARDINAL = ['north', 'east', 'south', 'west'];

/** `k` times a side of length `side`, but never shorter than `floor`, and never exactly nothing: a side dragged past its other end flips. */
function atLeast(k: number, side: number, floor: number): number {
  if (side < 1e-12) return k;
  return Math.abs(k) * side >= floor ? k : ((k < 0 ? -1 : 1) * floor) / side;
}

/**
 * A clean form reshaped by one handle, all in the form's own space: `to` is
 * where the handle is let go, `floor` the least extent a side, a radius, a
 * shaft or an arc is left with. Pure geometry — no node, no board.
 */
export function reshapeClean(clean: CleanShape, handle: { kind: string; index: number }, to: Point, floor = 0): CleanShape | null {
  if (!hasHandle(clean.shape, handle)) return null;
  const p = clean.points.map(pt);
  const t = pt(to);
  const { kind, index: i } = handle;
  const made = (points: Point[], how: string): CleanShape => ({
    shape: clean.shape,
    points,
    closed: clean.closed,
    reasoning: `reshaped by hand — ${how}`,
    ...(clean.lean !== undefined ? { lean: clean.lean } : {}),
    reshaped: { kind, index: i },
  });
  const moved = (by: Point) => p.map((q) => add(q, by));

  switch (clean.shape) {
    case 'rectangle': {
      if (p.length !== 4) return null;
      let q: Point[];
      let how: string;
      if (kind === 'corner') {
        // The corner across stays; the drag is read in the frame of the two
        // sides that meet there, so the box keeps its turn and its lean.
        const o = p[(i + 2) % 4];
        const a = sub(p[(i + 1) % 4], o), b = sub(p[(i + 3) % 4], o);
        const cr = cross(a, b);
        if (Math.abs(cr) < 1e-12) return null;
        const d = sub(t, o);
        const alpha = atLeast(cross(d, b) / cr, len(a), floor);
        const beta = atLeast(cross(a, d) / cr, len(b), floor);
        q = p.slice();
        q[(i + 1) % 4] = add(o, mul(a, alpha));
        q[(i + 3) % 4] = add(o, mul(b, beta));
        q[i] = add(o, add(mul(a, alpha), mul(b, beta)));
        how = `its corner ${i} dragged, the corner across it held`;
      } else if (kind === 'middle') {
        // Side i runs from corner i to corner i+1; it moves across, along the
        // sides that join it to the side across, and only across.
        const s = sub(p[(i + 1) % 4], p[i]);
        const e = sub(p[i], p[(i + 3) % 4]);
        const cr = cross(s, e);
        if (Math.abs(cr) < 1e-12) return null;
        const v = cross(s, sub(t, mid(p[i], p[(i + 1) % 4]))) / cr;
        const k = atLeast(1 + v, len(e), floor) - 1;
        q = p.slice();
        q[i] = add(p[i], mul(e, k));
        q[(i + 1) % 4] = add(p[(i + 1) % 4], mul(e, k));
        how = `its side ${i} moved, the side across it held`;
      } else {
        q = moved(sub(t, mid(p[0], p[2])));
        how = 'moved whole by its centre';
      }
      const top = sub(q[1], q[0]), side = sub(q[3], q[0]);
      const width = len(top), height = width > 0 ? Math.abs(cross(top, side)) / width : 0;
      const turn = ((deg(Math.atan2(top.y, top.x)) % 180) + 270) % 180 - 90;
      return made(q, `${how}: a box ${r0(width)}×${r0(height)}` + (Math.abs(turn) >= 0.5 ? ` turned ${r0(Math.abs(turn))}°` : '') + (clean.lean !== undefined ? ` leaning ${r0(clean.lean)}°` : ''));
    }
    case 'circle':
    case 'dot': {
      const b = getBounds(p);
      const c = { x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 };
      const rx = (b.maxX - b.minX) / 2, ry = (b.maxY - b.minY) / 2;
      if (kind === 'centre' || kind === 'point') {
        return made(moved(sub(t, c)), clean.shape === 'dot' ? `moved to (${r0(t.x)}, ${r0(t.y)})` : `moved whole by its centre, radius ${r0(rx)}` + (Math.abs(rx - ry) > 0.5 ? `×${r0(ry)}` : ''));
      }
      // A cardinal: the radius. A round circle stays round; an oval sets the
      // axis the cardinal stands on (north and south its height, east and
      // west its width).
      if (rx < 1e-9 || ry < 1e-9) return null;
      const round = Math.abs(rx - ry) <= 1e-6 * Math.max(rx, ry);
      let sx: number, sy: number;
      if (round) {
        const r = Math.max(floor, dist(t, c));
        sx = sy = r / rx;
      } else if (i % 2 === 0) {
        sx = 1;
        sy = Math.max(floor, Math.abs(t.y - c.y)) / ry;
      } else {
        sx = Math.max(floor, Math.abs(t.x - c.x)) / rx;
        sy = 1;
      }
      const q = p.map((v) => ({ x: c.x + (v.x - c.x) * sx, y: c.y + (v.y - c.y) * sy }));
      return made(q, `its ${CARDINAL[i]} pulled to ` + (round ? `a radius of ${r0(rx * sx)}` : `an oval ${r0(2 * rx * sx)}×${r0(2 * ry * sy)}`));
    }
    case 'line': {
      if (p.length < 2) return null;
      let a = p[0], z = p[p.length - 1];
      if (kind === 'middle') {
        const by = sub(t, mid(a, z));
        return made([add(a, by), add(z, by)], `moved whole by its middle, ${r0(dist(a, z))} long`);
      }
      if (kind === 'tail') a = t;
      else z = t;
      if (dist(a, z) < floor) return null;
      return made([a, z], `its ${kind} dragged, the other end held: a line ${r0(dist(a, z))} long`);
    }
    case 'arrow': {
      if (p.length < 2) return null;
      let tail = p[0], tip = p[1];
      if (kind === 'middle') return made(moved(sub(t, mid(tail, tip))), `moved whole by its middle, ${r0(dist(tail, tip))} long`);
      const was = p.length >= 3 ? dist(p[2], p[1]) : 0;
      if (kind === 'tail') tail = t;
      else tip = t;
      const shaft = dist(tail, tip);
      if (shaft < floor) return null;
      // The barb the hand drew, kept at the tip along the new shaft: at most a
      // fifth of it, as `idealize` keeps it, and at least a fortieth, so the
      // head is still a head the rung reads however far the tip is pulled.
      const barb = Math.min(shaft * 0.2, Math.max(was, shaft * 0.025));
      return made(arrowPoints(tail, tip, barb), `its ${kind} dragged, the head kept at the tip: a shaft ${r0(shaft)} long, its barb ${r0(barb)}`);
    }
    case 'triangle': {
      if (p.length !== 3) return null;
      if (kind === 'centre') {
        const c = { x: (p[0].x + p[1].x + p[2].x) / 3, y: (p[0].y + p[1].y + p[2].y) / 3 };
        return made(moved(sub(t, c)), 'moved whole by its centroid');
      }
      const q = p.slice();
      q[i] = t;
      return made(q, `its corner ${i} dragged, the other two held`);
    }
    case 'arc': {
      if (p.length < 3) return null;
      const a = p[0], z = p[p.length - 1];
      let q: Point[];
      let how: string;
      if (kind === 'bulge') {
        // Through its two ends and the point on their chord's perpendicular
        // as far off the chord as the hand let go — on either side of it.
        const ch = dist(a, z);
        if (ch < 1e-9) return null;
        const m = mid(a, z);
        const n = { x: -(z.y - a.y) / ch, y: (z.x - a.x) / ch };
        let s = (t.x - m.x) * n.x + (t.y - m.y) * n.y;
        const least = Math.max(floor, ch * 0.01);
        if (Math.abs(s) < least) s = (s < 0 ? -1 : 1) * least;
        const arc = arcThrough(a, add(m, mul(n, s)), z);
        if (!arc) return null;
        q = arc.points;
        how = 'its bulge pulled';
      } else {
        // An end: the arc turned and scaled about the other end, so it keeps
        // its sweep and its bulge in proportion.
        const head = kind === 'tip';
        const fixed = head ? a : z, end = head ? z : a;
        const from = sub(end, fixed), toward = sub(t, fixed);
        const d = from.x * from.x + from.y * from.y;
        if (d < 1e-18 || len(toward) < floor) return null;
        const zr = (toward.x * from.x + toward.y * from.y) / d, zi = (toward.y * from.x - toward.x * from.y) / d;
        q = p.map((v) => {
          const w = sub(v, fixed);
          return { x: fixed.x + zr * w.x - zi * w.y, y: fixed.y + zi * w.x + zr * w.y };
        });
        q[head ? q.length - 1 : 0] = t;
        q[head ? 0 : q.length - 1] = fixed;
        how = `its ${kind} dragged, its sweep kept`;
      }
      // Its radius and sweep, from its chord and how far its middle stands off it.
      const ea = q[0], ez = q[q.length - 1], half = q[Math.round((q.length - 1) / 2)];
      const ch = dist(ea, ez);
      const sag = ch > 0 ? Math.abs(cross(sub(ez, ea), sub(half, ea))) / ch : 0;
      const r = sag > 0 ? (ch * ch) / (8 * sag) + sag / 2 : Infinity;
      const sweep = Number.isFinite(r) ? deg(2 * Math.atan2(ch / 2, r - sag)) : 0;
      return made(q, `${how}: an arc of radius ${Number.isFinite(r) ? r0(r) : '∞'} sweeping ${r0(sweep)}°`);
    }
  }
  return null;
}
