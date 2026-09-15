// Magnets — the places a mark offers attachment.
//
// A diagram is marks that hang together: an arrow ends AT a box, not near
// it. This module says where "at" is, for any mark the engine has read:
// a line's ends, a box's corners and edge-middles, a circle's centre and
// cardinals, an arrow's tip and tail. The pen (P1) attracts to these while
// drawing; handles (P2) are the same sites made draggable.
//
// Sites are DERIVED, never stored — arithmetic on the clean form the mark
// carries or would be offered, exactly like measure.ts, so replay stays
// deterministic and the log stays the only source. A mark with no confident
// reading still offers its bounds' corners and centre, from its own ink:
// an offer, never a lie about shape.

import type { Point } from '../types';
import type { MMNode } from './nodes';
import { boundsOf, fingerprintOf, getRep, strokePointsOf } from './nodes';
import { cleanPointsOf, idealize, snapReading } from './clean';
import { getBounds } from '../geometry';

export type MagnetKind = 'tip' | 'tail' | 'corner' | 'middle' | 'centre' | 'cardinal' | 'point';

export interface MagnetSite {
  nodeId: string;
  /** The reading the sites were derived from: 'rectangle', 'circle', … or 'ink' for the bounds fallback. */
  shape: string;
  kind: MagnetKind;
  /** 0-based among same-kind sites of this mark, in a stable order (corners: TL, TR, BR, BL; cardinals: N, E, S, W). */
  index: number;
  point: Point;
  /** Why this site is here, in the terms it was measured in. */
  reasoning: string;
}

/** The attraction radius's screen part: about the HAND, not the world (plan invariant 3). */
export const MAGNET_SCREEN_PX = 14;
/** …and its size-relative part: a big mark is easier to aim at. */
export const MAGNET_SIZE_FRACTION = 0.06;

/**
 * How far a magnet reaches, in world units. `scale` is world-units-per-screen-pixel
 * (1/zoom), the same scale getFingerprint takes; `sizePx` is the target mark's own size.
 */
export function magnetRadius(sizePx: number, scale = 1): number {
  return Math.max(MAGNET_SCREEN_PX * scale, sizePx * MAGNET_SIZE_FRACTION);
}

const mid = (a: Point, b: Point): Point => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });

/** The outline a mark's sites derive from: the held clean form, else the offered one, else the ink. */
function formOf(node: MMNode, nodes: ReadonlyMap<string, MMNode>): { shape: string; points: Point[] } | null {
  const fp = fingerprintOf(node);
  const ink = strokePointsOf(node);
  if (!fp || !ink || ink.length < 2) return null;
  const reading = snapReading(node, nodes);
  const held = getRep(node, 'clean') ? cleanPointsOf(node) : undefined;
  const ideal = held ?? (reading.ok ? idealize(node, reading.shape)?.points : undefined);
  if (ideal && ideal.length >= 2 && reading.shape) return { shape: reading.shape, points: ideal };
  return { shape: 'ink', points: ink };
}

/**
 * The attachment sites a mark offers, in a stable order. Empty for marks
 * with nothing to measure (below the hand's resolution).
 */
export function magnetSites(node: MMNode, nodes: ReadonlyMap<string, MMNode>): MagnetSite[] {
  const form = formOf(node, nodes);
  if (!form) return [];
  const b = boundsOf(node) ?? getBounds(form.points);
  const w = b.maxX - b.minX, h = b.maxY - b.minY;
  const centre = { x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 };
  const out: MagnetSite[] = [];
  const counts: Partial<Record<MagnetKind, number>> = {};
  const add = (kind: MagnetKind, point: Point, why: string) => {
    const index = counts[kind] ?? 0;
    counts[kind] = index + 1;
    out.push({ nodeId: node.id, shape: form.shape, kind, index, point, reasoning: why });
  };

  switch (form.shape) {
    case 'line':
    case 'arrow': {
      const arrow = getRep(node, 'reading:arrow')?.data as { tip?: Point; tail?: Point } | undefined;
      const tail = form.shape === 'arrow' && arrow?.tail ? arrow.tail : form.points[0];
      const tip = form.shape === 'arrow' && arrow?.tip ? arrow.tip : form.points[form.points.length - 1];
      add('tail', tail, `the ${form.shape}'s tail — where it begins`);
      add('tip', tip, `the ${form.shape}'s tip — where it ends`);
      add('middle', mid(tail, tip), 'halfway along it');
      break;
    }
    case 'rectangle': {
      const v = form.points.slice(0, 4);
      if (v.length === 4) {
        v.forEach((p) => add('corner', p, 'a corner of the rectangle'));
        for (let i = 0; i < 4; i++) add('middle', mid(v[i], v[(i + 1) % 4]), 'the middle of an edge');
      } else {
        boundsSites(add, b);
      }
      add('centre', centre, 'the centre of the rectangle');
      break;
    }
    case 'circle': {
      add('centre', centre, 'the centre of the circle');
      const rx = w / 2, ry = h / 2;
      const cardinals: [string, Point][] = [
        ['north', { x: centre.x, y: centre.y - ry }],
        ['east', { x: centre.x + rx, y: centre.y }],
        ['south', { x: centre.x, y: centre.y + ry }],
        ['west', { x: centre.x - rx, y: centre.y }],
      ];
      for (const [name, p] of cardinals) add('cardinal', p, `the ${name} of the circle`);
      break;
    }
    case 'triangle': {
      const v = form.points.slice(0, 3);
      if (v.length === 3) {
        v.forEach((p) => add('corner', p, 'a corner of the triangle'));
        add('centre', { x: (v[0].x + v[1].x + v[2].x) / 3, y: (v[0].y + v[1].y + v[2].y) / 3 }, 'the centroid');
      } else {
        boundsSites(add, b);
      }
      break;
    }
    case 'arc': {
      add('tail', form.points[0], 'where the arc begins');
      add('tip', form.points[form.points.length - 1], 'where the arc ends');
      add('centre', centre, 'the middle of the arc’s span');
      break;
    }
    case 'dot':
      add('point', centre, 'the dot');
      break;
    default:
      // Invariant 5: no confident reading, no pretended shape — the ink's own box.
      boundsSites(add, b);
      add('centre', centre, 'the centre of the mark’s bounds');
      break;
  }
  return out;
}

/** Corners from the bounds alone — the fallback for unread ink. */
function boundsSites(add: (kind: MagnetKind, point: Point, why: string) => void, b: { minX: number; minY: number; maxX: number; maxY: number }) {
  add('corner', { x: b.minX, y: b.minY }, 'a corner of the mark’s bounds');
  add('corner', { x: b.maxX, y: b.minY }, 'a corner of the mark’s bounds');
  add('corner', { x: b.maxX, y: b.maxY }, 'a corner of the mark’s bounds');
  add('corner', { x: b.minX, y: b.maxY }, 'a corner of the mark’s bounds');
}

export interface MagnetHit {
  site: MagnetSite;
  /** World-units distance from the query point to the site. */
  distance: number;
}

/**
 * The nearest site to a point, within `radius` world units — or null, which
 * is most of the canvas: a magnet is an offer, not a trap (plan invariant 4).
 * A tie goes to the earlier site in stable order, and to the smaller mark:
 * a junction of two boxes is the inner one's corner.
 */
export function nearestMagnet(at: Point, sites: MagnetSite[], radius: number): MagnetHit | null {
  let best: MagnetHit | null = null;
  for (const site of sites) {
    const distance = Math.hypot(site.point.x - at.x, site.point.y - at.y);
    if (distance > radius) continue;
    if (!best || distance < best.distance) best = { site, distance };
  }
  return best;
}

/**
 * Every site near a point across many marks: the gather for the pen's query.
 * `exclude` keeps a stroke from attracting to its own sites mid-draw.
 */
export function magnetsNear(
  at: Point,
  nodes: ReadonlyMap<string, MMNode>,
  ids: readonly string[],
  radius: number,
  exclude?: ReadonlySet<string>,
): MagnetHit[] {
  const hits: MagnetHit[] = [];
  for (const id of ids) {
    if (exclude?.has(id)) continue;
    const node = nodes.get(id);
    if (!node) continue;
    for (const site of magnetSites(node, nodes)) {
      const distance = Math.hypot(site.point.x - at.x, site.point.y - at.y);
      if (distance <= radius) hits.push({ site, distance });
    }
  }
  hits.sort((a, b) => a.distance - b.distance);
  return hits;
}

/** One line, for a status line or a brief: "corner of the rectangle at (100, 100)". */
export function describeMagnet(site: MagnetSite): string {
  const r = (v: number) => Math.round(v);
  return `${site.reasoning} at (${r(site.point.x)}, ${r(site.point.y)})`;
}
