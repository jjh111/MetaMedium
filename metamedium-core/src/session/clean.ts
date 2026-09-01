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
//      A diamond is triangle 0.61 and rectangle 0.58; redrawing it as either
//      would silently settle an argument the engine deliberately holds open.
//      So `snapReading` asks for a floor on the top reading and a margin over
//      the next (ARCHITECTURE-v6 principle 2, applied to geometry).
//   3. **The clean form is built from the ink's own measurements** — bounds,
//      corners, tip and tail — never from a template placed by hand. A circle
//      that was drawn as a slight oval stays a slight oval; only the wobble
//      goes.
//
// Writing has no clean form. Handwriting redrawn as a box is a lie about what
// was written, so `text` is never idealized and stays ink.

import type { Bounds, Point } from '../types';
import type { MMNode } from './nodes';
import { fingerprintOf, getRep, wordOf } from './nodes';
import { getBounds } from '../geometry';
import { interpretationsOf } from './interpretations';

export interface CleanShape {
  /** Which shape this is the clean form of: 'rectangle', 'circle', … */
  shape: string;
  /** The idealized outline, in the same space as the raw ink was drawn. */
  points: Point[];
  closed: boolean;
  /** How the form was derived, in the terms it was measured in. */
  reasoning: string;
}

/** The top Tier 0 reading must reach this to be offered for snapping. */
export const SNAP_CONFIDENCE = 0.7;
/** …and lead the next reading by this much, or the mark is ambiguous. */
export const SNAP_MARGIN = 0.12;

/** Shapes that have a clean form at all. */
export const SNAPPABLE = new Set(['rectangle', 'circle', 'triangle', 'line', 'arrow', 'arc', 'dot']);

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
      const meta = getRep(node, 'reading:arrow')?.data as { tip?: Point; tail?: Point } | undefined;
      const tail = meta?.tail ?? fp.start, tip = meta?.tip ?? fp.end;
      const len = Math.hypot(tip.x - tail.x, tip.y - tail.y);
      if (len < 1e-6) return null;
      const ux = (tip.x - tail.x) / len, uy = (tip.y - tail.y) / len;
      const barb = Math.max(6, Math.min(len * 0.28, 40));
      const wing = (s: number) => ({
        x: tip.x - barb * (ux * Math.cos(0.5) - s * uy * Math.sin(0.5)),
        y: tip.y - barb * (uy * Math.cos(0.5) + s * ux * Math.sin(0.5)),
      });
      return {
        shape, closed: false,
        points: [tail, tip, wing(1), tip, wing(-1)],
        reasoning: 'a straight shaft from tail to tip, with an even barb',
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
  const to = getRep(node, 'transform')?.data as Bounds | undefined;
  if (!to) return clean.points;
  const raw = (getRep(node, 'stroke')?.data as { points?: Point[] } | undefined)?.points;
  if (!raw) return clean.points;
  const from = getBounds(raw);
  const fw = Math.max(1e-6, from.maxX - from.minX);
  const fh = Math.max(1e-6, from.maxY - from.minY);
  const sx = (to.maxX - to.minX) / fw;
  const sy = (to.maxY - to.minY) / fh;
  return clean.points.map((p) => ({
    x: to.minX + (p.x - from.minX) * sx,
    y: to.minY + (p.y - from.minY) * sy,
  }));
}

/** A one-line account of a mark's snap standing, for status lines and hints. */
export function describeSnap(node: MMNode, nodes: ReadonlyMap<string, MMNode>): string {
  const clean = cleanOf(node);
  if (clean) return `drawn clean as a ${clean.shape} — ${clean.reasoning}`;
  const r = snapReading(node, nodes);
  const name = wordOf(node);
  return (r.ok ? `could be drawn clean as a ${r.shape}` : `kept as ink`) + (name ? ` (${name})` : '') + ` — ${r.reasoning}`;
}
