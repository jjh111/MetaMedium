// A confident reading, redrawn: the doodle's clean form.
//
// The shape rung says "rectangle 0.86". This module says what a rectangle
// drawn HERE, at THIS size, would look like — and the session can hold that as
// a `'clean'` rep beside the ink, the same way `tidy` holds a `'transform'`.
// Three rules keep it honest:
//
//   1. **Ink is never destroyed.** The clean form is a rep added to the mark;
//      the stroke underneath is untouched, and dropping the rep is the undo.
//   2. **Only a reading that is both confident AND unambiguous qualifies.**
//      A pentagon is rectangle 0.44 and circle 0.43; redrawing it as either
//      would silently settle an argument the engine deliberately holds open.
//      So `snapReading` asks for a floor on the top reading and a margin over
//      the next (ARCHITECTURE-v6 principle 2, applied to geometry).
//   3. **The clean form is built from the ink's own measurements** — bounds,
//      corners, tip and tail — never from a template placed by hand. A circle
//      that was drawn as a slight oval stays a slight oval; only the wobble
//      goes. A box drawn turned stays turned: its clean form is the tightest
//      box at any angle, so a diamond is redrawn as a diamond, not as the
//      upright box around it — which turned a flowchart's decision into a
//      process (S1). A box drawn LEANING stays leaning: its clean form is the
//      parallelogram its corners make, so a flowchart's data symbol is not
//      redrawn as the upright box around it either (D2). An arrow keeps the
//      barb the hand drew, and a stroke that BENDS is not offered as the
//      straight line through its ends.
//
// Writing has no clean form. Handwriting redrawn as a box is a lie about what
// was written, so `text` is never idealized and stays ink.

import type { Bounds, Point } from '../types';
import type { MMNode } from './nodes';
import { fingerprintOf, getRep, wordOf, placed } from './nodes';
import { bowOf, tightestBox } from '../geometry';
import { ARC_BULGE_PX, ARC_SWEEP } from '../recognition';
import { between, cornersOf, hullOf, offLevel, offSquare } from '../notations/shape';

import { interpretationsOf } from './interpretations';

export interface CleanShape {
  /** Which shape this is the clean form of: 'rectangle', 'circle', … */
  shape: string;
  /** The idealized outline, in the same space as the raw ink was drawn. */
  points: Point[];
  closed: boolean;
  /** How the form was derived, in the terms it was measured in. */
  reasoning: string;
  /** A box drawn leaning, kept so: how far its sides lean off square, in degrees. Absent for a square-cornered box. */
  lean?: number;
}

/** The top Tier 0 reading must reach this to be offered for snapping. */
export const SNAP_CONFIDENCE = 0.7;
/** …and lead the next reading by this much, or the mark is ambiguous. */
export const SNAP_MARGIN = 0.12;

/** Shapes that have a clean form at all. */
export const SNAPPABLE = new Set(['rectangle', 'circle', 'triangle', 'line', 'arrow', 'arc', 'dot']);

/**
 * A box within this many degrees of square to the screen is squared up; past
 * it the turn was drawn and is kept. The corpus's boxes drawn square measure
 * within 3.2° of it, the rounded ones the most (their tightest box at any
 * angle, measured).
 */
export const SQUARE_UP_DEG = 5;
/**
 * Squared up, a box is the bounds its ink fills — when those bounds hold it
 * as tightly as its own box, give or take this share of its area. The
 * corpus's boxes drawn square fill their bounds within 2.5% of that. A box
 * turned only a little, or a long bar a degree off level, fills its bounds
 * loosely: squared up to them it would grow — a 170×70 box turned 6° has
 * bounds 176×87 — so it is squared up at its own size instead.
 */
export const BOUNDS_SLACK = 0.05;

/**
 * A box whose sides lean off square by more than this keeps its lean: its
 * clean form is the parallelogram it was drawn as, not the box around it. A
 * hand's box leans by its wobble alone — 1,548 of them (the corpus's boxes,
 * turned or not, the flowchart bench's processes and its boxes tilted to
 * 12°) within 4.4°, each side fitted along its middle run of ink and the
 * sides averaged in opposite pairs — where a flowchart's data symbol leans
 * 22°–27° and a hand's box leaning 12° measures 9.2° at the least. The
 * flowchart reads no lean under 8° as data (LEAN, notations/flowchart.ts),
 * so a lean under this is wobble to the notation and to the clean form alike.
 */
export const LEAN_KEPT_DEG = 8;
/**
 * …and only when its opposite sides lie parallel within this, pair by pair —
 * a parallelogram, not a trapezoid. A hand's parallelograms measure within
 * 11.1°. A trapezoid with one side plumb and the other leaning θ differs by θ
 * and leans only θ/2 on average, so it cannot pass LEAN_KEPT_DEG until θ
 * passes 16°, and this refuses it first.
 */
export const LEAN_PARALLEL_DEG = 15;

const sub = (a: Point, b: Point): Point => ({ x: a.x - b.x, y: a.y - b.y });
const turned = (v: Point, t: number): Point => ({ x: v.x * Math.cos(t) - v.y * Math.sin(t), y: v.x * Math.sin(t) + v.y * Math.cos(t) });

/**
 * Which way the ink runs along one side of a quadrilateral, from `p` toward
 * `q`, as long as the side: a line fitted (principal axis) to the ink in the
 * side's middle run, away from the corners, within a fifth of its length of
 * the chord. A hand rounds its corners, and more at an acute corner than an
 * obtuse one, so the chord between two corner points leans with the
 * rounding — on a data symbol's short slanted side by as much as 5°. The
 * chord itself when the run holds too little ink to fit.
 */
function inkAlong(raw: readonly Point[], p: Point, q: Point): Point {
  const d = sub(q, p);
  const len = Math.hypot(d.x, d.y);
  if (len < 1e-9) return d;
  const u = { x: d.x / len, y: d.y / len };
  const run = raw.filter((r) => {
    const t = ((r.x - p.x) * u.x + (r.y - p.y) * u.y) / len;
    return t >= 0.2 && t <= 0.8 && Math.abs((r.x - p.x) * -u.y + (r.y - p.y) * u.x) <= 0.2 * len;
  });
  if (run.length < 3) return d;
  const mx = run.reduce((k, r) => k + r.x, 0) / run.length, my = run.reduce((k, r) => k + r.y, 0) / run.length;
  let sxx = 0, sxy = 0, syy = 0;
  for (const r of run) {
    sxx += (r.x - mx) ** 2;
    sxy += (r.x - mx) * (r.y - my);
    syy += (r.y - my) ** 2;
  }
  const angle = 0.5 * Math.atan2(2 * sxy, sxx - syy);
  const sign = Math.cos(angle) * u.x + Math.sin(angle) * u.y < 0 ? -1 : 1;
  return { x: sign * Math.cos(angle) * len, y: sign * Math.sin(angle) * len };
}

/**
 * A box drawn leaning, as the parallelogram it was drawn as: the four
 * corners on the ink's hull (notations/shape.ts) say where its sides are,
 * each side's direction is fitted to the ink along it (`inkAlong`), opposite
 * sides are averaged, and the parallelogram with those sides is the tightest
 * that holds the ink — the size the ink is, as a box's tightest box is. A
 * pair of sides within SQUARE_UP_DEG of level or plumb is laid exactly so,
 * the lean kept. Its corners come from the top-left of the side nearer
 * level, clockwise on screen, as a box's do. Null for a box that does not
 * lean past LEAN_KEPT_DEG, or whose sides are not parallel pairs.
 */
function leaningBox(raw: readonly Point[]): { points: Point[]; lean: number; base: number; height: number } | null {
  const hull = hullOf(raw);
  const { quad } = cornersOf(hull);
  if (quad.length !== 4) return null;
  const s = quad.map((p, i) => inkAlong(raw, p, quad[(i + 1) % 4]));
  if (between(s[0], s[2]) > LEAN_PARALLEL_DEG || between(s[1], s[3]) > LEAN_PARALLEL_DEG) return null;
  let a = { x: (s[0].x - s[2].x) / 2, y: (s[0].y - s[2].y) / 2 };
  let b = { x: (s[1].x - s[3].x) / 2, y: (s[1].y - s[3].y) / 2 };
  const lean = 90 - between(a, b);
  if (!(lean > LEAN_KEPT_DEG)) return null;
  // Squared up within the hand's wobble: the pair nearer level or plumb is laid exactly so.
  const ref = offSquare(a) <= offSquare(b) ? a : b;
  if (offSquare(ref) <= SQUARE_UP_DEG) {
    const angle = Math.atan2(ref.y, ref.x);
    const t = Math.round(angle / (Math.PI / 2)) * (Math.PI / 2) - angle;
    a = turned(a, t);
    b = turned(b, t);
  }
  // Across each pair of sides, the ink's extent: the parallelogram with these sides that holds it.
  const la = Math.hypot(a.x, a.y), lb = Math.hypot(b.x, b.y);
  if (la < 1e-9 || lb < 1e-9) return null;
  const na = { x: -a.y / la, y: a.x / la }, nb = { x: -b.y / lb, y: b.x / lb };
  let loA = Infinity, hiA = -Infinity, loB = Infinity, hiB = -Infinity;
  for (const p of hull) {
    const pa = p.x * na.x + p.y * na.y, pb = p.x * nb.x + p.y * nb.y;
    loA = Math.min(loA, pa); hiA = Math.max(hiA, pa);
    loB = Math.min(loB, pb); hiB = Math.max(hiB, pb);
  }
  const det = na.x * nb.y - na.y * nb.x;
  if (Math.abs(det) < 1e-9 || hiA - loA < 1e-9 || hiB - loB < 1e-9) return null;
  // Each corner is where a side along a (p·na = u) meets a side along b (p·nb = v).
  const corners = [loA, hiA].flatMap((u) => [loB, hiB].map((v) => ({ u, v, p: { x: (u * nb.y - na.y * v) / det, y: (na.x * v - u * nb.x) / det } })));
  // The sides nearer level are the top and the bottom; the top is the higher of them on screen.
  const across: 'u' | 'v' = offLevel(a) <= offLevel(b) ? 'u' : 'v';
  const along: 'u' | 'v' = across === 'u' ? 'v' : 'u';
  const meanY = (k: number) => corners.filter((c) => c[across] === k).reduce((y, c) => y + c.p.y, 0) / 2;
  const [first, second] = across === 'u' ? [loA, hiA] : [loB, hiB];
  const topSide = meanY(first) <= meanY(second) ? first : second;
  const [tl, tr] = corners.filter((c) => c[across] === topSide).sort((p, q) => p.p.x - q.p.x);
  const br = corners.find((c) => c[across] !== topSide && c[along] === tr[along])!;
  const bl = corners.find((c) => c[across] !== topSide && c[along] === tl[along])!;
  const points = [tl.p, tr.p, br.p, bl.p];
  const top = sub(points[1], points[0]), side = sub(points[3], points[0]);
  const base = Math.hypot(top.x, top.y);
  const area = Math.abs(top.x * side.y - top.y * side.x);
  return { points, lean: 90 - between(top, side), base, height: base > 0 ? area / base : 0 };
}

/**
 * How far a line's ink may stand off the straight line through its ends and
 * still be drawn clean as that line: no further than a hand's straight line
 * bows — under the bulge an arc must show to be one (ARC_BULGE_PX, in the
 * hand's space), or under the bulge of the shallowest arc (ARC_SWEEP) on a
 * long line. Past it the stroke BENDS: half of a diamond drawn in two
 * strokes, redrawn straight, turned the diamond into a triangle (S1).
 */
function lineBendsTooFar(node: MMNode): { bends: boolean; off: number } {
  const stroke = getRep(node, 'stroke')?.data as { points?: Point[]; scale?: number } | undefined;
  const bow = stroke?.points ? bowOf(stroke.points) : null;
  if (!bow) return { bends: false, off: 0 };
  const scale = stroke?.scale ?? 1;
  const allowed = Math.max(ARC_BULGE_PX[1] * scale, (bow.chord * Math.tan((ARC_SWEEP[0] * Math.PI) / 180 / 4)) / 2);
  return { bends: bow.sagitta > allowed, off: bow.sagitta / scale };
}

export interface SnapReading {
  shape: string;
  weight: number;
  /** Whether this mark qualifies to be redrawn. */
  ok: boolean;
  /** Why it does or does not. */
  reasoning: string;
}

/**
 * Whether a mark reads cleanly enough to be redrawn, and as what.
 *
 * Reads the ENGINE's own shape reading only (tier 0). A model may call a box
 * "a card" with confidence 0.9, and that reading is held — but it is a claim
 * about meaning, not geometry, and geometry is what a snap redraws.
 */
export function snapReading(node: MMNode, nodes: ReadonlyMap<string, MMNode>): SnapReading {
  const tier0 = interpretationsOf(node, nodes).filter((r) => r.tier === 0 && r.to.startsWith('type:'));
  const top = tier0[0];
  if (!top) return { shape: 'art', weight: 0, ok: false, reasoning: 'no shape reading' };
  const second = tier0[1];
  const shape = top.label;
  if (!SNAPPABLE.has(shape)) {
    return { shape, weight: top.weight, ok: false, reasoning: `${shape} has no clean form` };
  }
  if (top.weight < SNAP_CONFIDENCE) {
    return { shape, weight: top.weight, ok: false, reasoning: `${shape} ${top.weight.toFixed(2)} is below ${SNAP_CONFIDENCE}` };
  }
  if (second && top.weight - second.weight < SNAP_MARGIN) {
    return {
      shape,
      weight: top.weight,
      ok: false,
      reasoning: `${shape} ${top.weight.toFixed(2)} and ${second.label} ${second.weight.toFixed(2)} are too close to call`,
    };
  }
  if (shape === 'line') {
    const bend = lineBendsTooFar(node);
    if (bend.bends) {
      return {
        shape,
        weight: top.weight,
        ok: false,
        reasoning: `${shape} ${top.weight.toFixed(2)}, but it bends ${Math.round(bend.off)}px off the straight line through its ends — more than a hand's straight line bows`,
      };
    }
  }
  return {
    shape,
    weight: top.weight,
    ok: true,
    reasoning: second
      ? `${shape} ${top.weight.toFixed(2)}, well ahead of ${second.label} ${second.weight.toFixed(2)}`
      : `${shape} ${top.weight.toFixed(2)}, unopposed`,
  };
}

const TAU = Math.PI * 2;

function ellipse(b: Bounds, n = 64): Point[] {
  const cx = (b.minX + b.maxX) / 2, cy = (b.minY + b.maxY) / 2;
  const rx = (b.maxX - b.minX) / 2, ry = (b.maxY - b.minY) / 2;
  const out: Point[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU;
    out.push({ x: cx + rx * Math.cos(a), y: cy + ry * Math.sin(a) });
  }
  return out;
}

/** Distance from p to the line through a and b, signed by side. */
function sideOf(a: Point, b: Point, p: Point): number {
  return (b.x - a.x) * (p.y - a.y) - (b.y - a.y) * (p.x - a.x);
}

/** Circumcircle through three points, or null when they are collinear. */
function circumcircle(a: Point, b: Point, c: Point): { cx: number; cy: number; r: number } | null {
  const d = 2 * (a.x * (b.y - c.y) + b.x * (c.y - a.y) + c.x * (a.y - b.y));
  if (Math.abs(d) < 1e-9) return null;
  const a2 = a.x * a.x + a.y * a.y, b2 = b.x * b.x + b.y * b.y, c2 = c.x * c.x + c.y * c.y;
  const cx = (a2 * (b.y - c.y) + b2 * (c.y - a.y) + c2 * (a.y - b.y)) / d;
  const cy = (a2 * (c.x - b.x) + b2 * (a.x - c.x) + c2 * (b.x - a.x)) / d;
  return { cx, cy, r: Math.hypot(a.x - cx, a.y - cy) };
}

/**
 * The clean form of a mark, as the shape it reads as.
 *
 * Works from the RAW stroke — where it was drawn, before any tidy moved it —
 * so the result composes with a later `'transform'` exactly as the ink does
 * (see `cleanPointsOf`). Returns null for shapes with no clean form, and for
 * ink too poor to measure.
 */
export function idealize(node: MMNode, shape: string): CleanShape | null {
  const fp = fingerprintOf(node);
  const raw = (getRep(node, 'stroke')?.data as { points?: Point[] } | undefined)?.points;
  if (!fp || !raw || raw.length < 2) return null;
  const b = fp.bounds;
  const w = b.maxX - b.minX, h = b.maxY - b.minY;

  switch (shape) {
    case 'rectangle': {
      // A box drawn leaning keeps its lean: a flowchart's data symbol is a
      // parallelogram, and the rung reads it as a rectangle, whose tightest
      // box is upright — redrawn so, it was a process (D2).
      const leaning = leaningBox(raw);
      if (leaning) {
        return {
          shape,
          closed: true,
          points: leaning.points,
          lean: leaning.lean,
          reasoning: `its four corners: a box ${Math.round(leaning.base)}×${Math.round(leaning.height)} leaning ${Math.round(leaning.lean)}° as drawn — its sides parallel and not square, and kept so`,
        };
      }
      // The tightest box at any angle — the one extent measures against. Near
      // square to the screen it is the hand's wobble, squared up; turned
      // further, the turn was drawn and is kept, so a diamond stays one.
      const box = tightestBox(raw);
      if (box && Math.abs(box.angle) > SQUARE_UP_DEG) {
        const { centre: c, axis: u, width: bw, height: bh } = box;
        const corner = (su: number, sv: number): Point => ({
          x: c.x + (u.x * su * bw) / 2 - (u.y * sv * bh) / 2,
          y: c.y + (u.y * su * bw) / 2 + (u.x * sv * bh) / 2,
        });
        // Its diagonals square to the screen too: a square turned 45°.
        const tilt = (Math.atan2(bh, bw) * 180) / Math.PI;
        const offSquare = (deg: number) => {
          const d = ((deg % 90) + 90) % 90;
          return Math.min(d, 90 - d);
        };
        const diamond = Math.max(offSquare(box.angle + tilt), offSquare(box.angle - tilt)) <= SQUARE_UP_DEG;
        return {
          shape,
          closed: true,
          // Its own top-left, top-right, bottom-right and bottom-left, as an upright box's.
          points: [corner(-1, -1), corner(1, -1), corner(1, 1), corner(-1, 1)],
          reasoning:
            `the tightest box the ink fills, ${Math.round(bw)}×${Math.round(bh)}, turned ${Math.round(Math.abs(box.angle))}° as drawn` +
            (diamond ? ' — a diamond: a square turned 45°, its diagonals level and plumb' : ''),
        };
      }
      if (box && w * h > box.area * (1 + BOUNDS_SLACK)) {
        const { centre: c, width: bw, height: bh } = box;
        return {
          shape,
          closed: true,
          points: [
            { x: c.x - bw / 2, y: c.y - bh / 2 }, { x: c.x + bw / 2, y: c.y - bh / 2 },
            { x: c.x + bw / 2, y: c.y + bh / 2 }, { x: c.x - bw / 2, y: c.y + bh / 2 },
          ],
          reasoning: `its own box, ${Math.round(bw)}×${Math.round(bh)}, squared up from ${Math.round(Math.abs(box.angle))}° — the bounds it fills are looser`,
        };
      }
      return {
        shape,
        closed: true,
        points: [
          { x: b.minX, y: b.minY }, { x: b.maxX, y: b.minY },
          { x: b.maxX, y: b.maxY }, { x: b.minX, y: b.maxY },
        ],
        reasoning: `the box the ink fills, ${Math.round(w)}×${Math.round(h)}, squared up`,
      };
    }
    case 'circle': {
      // Near-round is drawn round; a deliberate oval keeps its axes.
      const aspect = Math.min(w, h) / Math.max(1e-6, w, h);
      if (aspect > 0.85) {
        const r = (w + h) / 4;
        const cx = (b.minX + b.maxX) / 2, cy = (b.minY + b.maxY) / 2;
        return {
          shape, closed: true,
          points: ellipse({ minX: cx - r, maxX: cx + r, minY: cy - r, maxY: cy + r }),
          reasoning: `a circle of radius ${Math.round(r)} on the ink's centre`,
        };
      }
      return { shape, closed: true, points: ellipse(b), reasoning: `an oval ${Math.round(w)}×${Math.round(h)}, as drawn` };
    }
    case 'triangle': {
      const corners = (fp.cornerData ?? []).slice().sort((p, q) => q.angle - p.angle).slice(0, 3);
      if (corners.length === 3) {
        corners.sort((p, q) => p.t - q.t); // back into drawing order
        return {
          shape, closed: true,
          points: corners.map((c) => ({ x: c.x, y: c.y })),
          reasoning: 'its three sharpest corners, joined straight',
        };
      }
      // Too few corners measured: an upright triangle in the box the ink fills.
      return {
        shape, closed: true,
        points: [{ x: (b.minX + b.maxX) / 2, y: b.minY }, { x: b.maxX, y: b.maxY }, { x: b.minX, y: b.maxY }],
        reasoning: 'an upright triangle in the box the ink fills',
      };
    }
    case 'line': {
      return { shape, closed: false, points: [fp.start, fp.end], reasoning: 'its two ends, joined straight' };
    }
    case 'arrow': {
      const meta = getRep(node, 'reading:arrow')?.data as { tip?: Point; tail?: Point; barb?: number } | undefined;
      const tail = meta?.tail ?? fp.start, tip = meta?.tip ?? fp.end;
      const len = Math.hypot(tip.x - tail.x, tip.y - tail.y);
      if (len < 1e-6) return null;
      const ux = (tip.x - tail.x) / len, uy = (tip.y - tail.y) / len;
      // The barb the hand drew, as long as it was — at most a fifth of the
      // shaft, because two wings drawn out and back are three barbs' worth of
      // the head the rung reads, and a longer one would not read back as an
      // arrow at all (the old 0.28 of the shaft never did under 143px).
      const barb = Math.min(len * 0.2, Math.max(6, meta?.barb ?? len * 0.2));
      const wing = (s: number) => ({
        x: tip.x - barb * (ux * Math.cos(0.5) - s * uy * Math.sin(0.5)),
        y: tip.y - barb * (uy * Math.cos(0.5) + s * ux * Math.sin(0.5)),
      });
      return {
        shape, closed: false,
        points: [tail, tip, wing(1), tip, wing(-1)],
        reasoning:
          meta?.barb !== undefined && barb < meta.barb - 0.5
            ? `a straight shaft from tail to tip, with an even barb ${Math.round(barb)}px long — a fifth of the shaft, where the hand drew ${Math.round(meta.barb)}`
            : `a straight shaft from tail to tip, with an even barb ${Math.round(barb)}px long${meta?.barb !== undefined ? ', as drawn' : ''}`,
      };
    }
    case 'arc': {
      const a = fp.start, c = fp.end;
      // The point on the ink farthest from the chord fixes the bulge.
      let mid = raw[Math.floor(raw.length / 2)], best = -1;
      for (const p of raw) {
        const d = Math.abs(sideOf(a, c, p));
        if (d > best) { best = d; mid = p; }
      }
      const cc = circumcircle(a, mid, c);
      if (!cc) return { shape: 'line', closed: false, points: [a, c], reasoning: 'too flat to bow; drawn straight' };
      const a0 = Math.atan2(a.y - cc.cy, a.x - cc.cx);
      const a1 = Math.atan2(c.y - cc.cy, c.x - cc.cx);
      const am = Math.atan2(mid.y - cc.cy, mid.x - cc.cx);
      // Sweep from a0 to a1 through am.
      let sweep = a1 - a0;
      const norm = (x: number) => ((x % TAU) + TAU) % TAU;
      const viaCcw = norm(am - a0) < norm(a1 - a0);
      sweep = viaCcw ? norm(a1 - a0) : -norm(a0 - a1);
      const n = 40;
      const points: Point[] = [];
      for (let i = 0; i <= n; i++) {
        const t = a0 + (sweep * i) / n;
        points.push({ x: cc.cx + cc.r * Math.cos(t), y: cc.cy + cc.r * Math.sin(t) });
      }
      return { shape, closed: false, points, reasoning: `a circular arc of radius ${Math.round(cc.r)} through its ends and its bulge` };
    }
    case 'dot': {
      const cx = (b.minX + b.maxX) / 2, cy = (b.minY + b.maxY) / 2;
      const r = Math.max(1.5, Math.max(w, h) / 2);
      return {
        shape, closed: true,
        points: ellipse({ minX: cx - r, maxX: cx + r, minY: cy - r, maxY: cy + r }, 24),
        reasoning: 'a round dot where the ink landed',
      };
    }
    default:
      return null;
  }
}

/** The clean rep a snapped mark carries, if any. */
export function cleanOf(node: MMNode): CleanShape | undefined {
  return getRep(node, 'clean')?.data as CleanShape | undefined;
}

/**
 * A snapped mark's clean outline, where it stands NOW.
 *
 * Composed with the `'transform'` rep exactly as `strokePointsOf` composes the
 * ink, so tidying a snapped row moves the clean forms with it and undoing the
 * tidy springs both back.
 */
export function cleanPointsOf(node: MMNode): Point[] | undefined {
  const clean = cleanOf(node);
  if (!clean) return undefined;
  if (!getRep(node, 'stroke')) return clean.points;
  return placed(node, clean.points);
}

/** A one-line account of a mark's snap standing, for status lines and hints. */
export function describeSnap(node: MMNode, nodes: ReadonlyMap<string, MMNode>): string {
  const clean = cleanOf(node);
  if (clean) return `drawn clean as a ${clean.shape} — ${clean.reasoning}`;
  const r = snapReading(node, nodes);
  const name = wordOf(node);
  return (r.ok ? `could be drawn clean as a ${r.shape}` : `kept as ink`) + (name ? ` (${name})` : '') + ` — ${r.reasoning}`;
}
