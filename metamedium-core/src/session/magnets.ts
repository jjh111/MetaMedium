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
// an offer, never a lie about shape — unless its ink is four-cornered
// beyond doubt (a flat diamond, which the rung reads as a triangle or a
// circle unsure), when its own four corners are the offer (S2).
//
// A notation that reads a mark as one of its symbols adds that symbol's ports
// after the mark's own sites — points, and places along a segment or an
// outline — through the hook in ports.ts (V1-PLAN E3). With none registered,
// every query here answers exactly as it did before the hook.
//
// ===== The binding contract (BIND-1, 16 Sep 2026) =====
//
// A bind is a claim about ONE END of a stroke. The contract, decided here so
// that the edge query and the rep query can agree:
//
//   ONE `bound-to` EDGE PER ENDPOINT. The edge carries `end` ('start' |
//   'end') and the `site` it sits on, and its `reasoning` is that one
//   endpoint's reason. The `'bound'` rep beside it carries the same payload
//   — `{ end, nodeId, site }` — and the two are kept in lockstep by
//   `applyBind`. The ENDPOINT identifies the claim; the target never does.
//
// Not one edge carrying every endpoint, because an edge in this graph is one
// claim with one reason, and two endpoints are two claims: the bug being
// fixed is precisely that a single edge could only say one of them. Binding
// both ends of a stroke to two sites on the same rectangle left two reps and
// one edge, reading "its end was released on middle 2" — the start binding
// gone. Removal is by `end`, so re-binding one end moves that claim alone.
//
// The `bind` EVENT is unchanged from magnets P1, which is the whole backward
// compatibility story: a P1 log replays into the new representation with no
// migration, because the event always carried the endpoint — only the derived
// graph was dropping it.
//
// ACTIVE versus HISTORICAL. Erasing a mark does not destroy the claims made
// about it: ink is never destroyed and neither is provenance, so the edge and
// the rep stay, and undoing the erase makes the claim an anchor again for
// free (state is a pure function of the log; the tombstone goes with the
// event). But a consumer asking where a stroke is ANCHORED — P3's "bindings
// that follow" above all — must never be handed a tombstone. So every
// binding reads `active`, false when its target is erased or no longer in
// the graph, and `activeBindingsOf` is the query that re-anchoring uses.

import type { Point } from '../types';
import type { MMNode } from './nodes';
import { boundsOf, fingerprintOf, getRep, placed, strokePointsOf } from './nodes';
import { type CleanShape, cleanOf, idealize, snapReading } from './clean';
import { getBounds } from '../geometry';
import { cornersOf, hullOf, roundFrom } from '../notations/shape';
import { alongSiteOf, portSiteOf, portSites, reachOf } from './ports';

export type MagnetKind =
  | 'tip'
  | 'tail'
  | 'corner'
  | 'middle'
  | 'centre'
  | 'cardinal'
  | 'point'
  /** A notation's point port (ports.ts): a decision's vertex. */
  | `port:${string}`
  /** A place along a notation's continuous port (ports.ts): a lifeline, a state's border. */
  | `along:${string}`;

export interface MagnetSite {
  nodeId: string;
  /** The reading the sites were derived from: 'rectangle', 'circle', … or 'ink' for the bounds fallback. */
  shape: string;
  kind: MagnetKind;
  /**
   * 0-based among same-kind sites of this mark, in a stable order (corners:
   * TL, TR, BR, BL; cardinals: N, E, S, W). For a place along a port, which
   * port and how far along it (`alongIndex` in ports.ts).
   */
  index: number;
  point: Point;
  /** Why this site is here, in the terms it was measured in. */
  reasoning: string;
  // ----- Only on a notation's port (ports.ts) -----
  /** The notation that offers it: 'flowchart'. */
  notation?: string;
  /** The port's own name in that notation: 'vertex', 'lifeline', 'border'. */
  port?: string;
  /** A place along a continuous port: the polyline the port runs along (a closed outline repeats its first point last)… */
  span?: Point[];
  /** …and how far along it, as a share of its length, in thousandths. */
  t?: number;
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

/**
 * The outline a mark's sites derive from, where the mark stands: the held
 * clean form, else the offered one, else the ink. `held` is the clean form
 * the mark carries, in its own space — a snapped one, or one a hand reshaped
 * (V1-PLAN E1) — and every site of a held form is read off it, so the sites
 * follow a reshape as the drawn form does. The offered form is placed as the
 * ink is: a moved mark offers its sites where it stands, not where it was
 * drawn.
 */
function formOf(node: MMNode, nodes: ReadonlyMap<string, MMNode>): { shape: string; points: Point[]; held: CleanShape | null; corners?: Point[] } | null {
  const fp = fingerprintOf(node);
  const ink = strokePointsOf(node);
  if (!fp || !ink || ink.length < 2) return null;
  const clean = cleanOf(node);
  if (clean && clean.points.length >= 2) return { shape: clean.shape, points: placed(node, clean.points), held: clean };
  const reading = snapReading(node, nodes);
  const ideal = reading.ok ? idealize(node, reading.shape)?.points : undefined;
  if (ideal && ideal.length >= 2 && reading.shape) return { shape: reading.shape, points: placed(node, ideal), held: null };
  const corners = inkCornersOf(node, ink);
  return { shape: 'ink', points: ink, held: null, ...(corners ? { corners } : {}) };
}

/**
 * Four corners hold a diamond or a box and not a round end: the best four on
 * the hull of a closed outline hold at least this much of it (a box or a
 * diamond hand-drawn 0.83–0.92, a stadium 0.67–0.79, an oval 0.64, a pentagon
 * or hexagon about 0.68 — `CORNERED` in notations/flowchart.ts, the same
 * measure) and its best three hold no more than this (a triangle's hold 0.83
 * and more, a quadrilateral's about half — `THREE_CORNERED`).
 */
export const INK_CORNERED = 0.8;
export const INK_NOT_THREE = 0.74;
/** …and each of the four turns between these, in degrees: a corner, not a point along a side. */
export const INK_CORNER_TURN = [35, 145] as const;

/**
 * The four corners of a closed outline the rung read with no confidence — a
 * diamond wider than it is tall, which it takes for a triangle or a circle —
 * measured from its ink, clockwise from the topmost; null for anything the
 * four corners do not hold (an oval, a pentagon, a flat triangle) and for
 * anything open. The sites of such a mark are those corners, not the corners
 * of its bounds, which lie in the air beside a diamond (V1-PLAN S2, D3).
 */
function inkCornersOf(node: MMNode, ink: readonly Point[]): Point[] | null {
  if (!fingerprintOf(node)?.isClosed) return null;
  const hull = hullOf(ink);
  if (hull.length < 4) return null;
  const { share, three, quad } = cornersOf(hull);
  if (quad.length !== 4 || share < INK_CORNERED || three > INK_NOT_THREE) return null;
  const v = roundFrom(quad, 'top');
  for (let i = 0; i < 4; i++) {
    const a = v[(i + 3) % 4], b = v[i], c = v[(i + 1) % 4];
    const ux = a.x - b.x, uy = a.y - b.y, wx = c.x - b.x, wy = c.y - b.y;
    const angle = (Math.acos(Math.max(-1, Math.min(1, (ux * wx + uy * wy) / ((Math.hypot(ux, uy) * Math.hypot(wx, wy)) || 1)))) * 180) / Math.PI;
    if (angle < INK_CORNER_TURN[0] || angle > INK_CORNER_TURN[1]) return null;
  }
  return v;
}

/**
 * The attachment sites a mark offers, in a stable order. Empty for marks
 * with nothing to measure (below the hand's resolution).
 */
export function magnetSites(node: MMNode, nodes: ReadonlyMap<string, MMNode>): MagnetSite[] {
  const out = ownSitesOf(node, nodes);
  // The hook (ports.ts): whatever a registered notation reads this mark as
  // adds its ports after the mark's own sites — nothing at all when none is.
  out.push(...portSites(node, nodes, MAGNET_SCREEN_PX));
  return out;
}

/**
 * The sites a mark offers of its own — its corners, middles, centre, ends —
 * without a notation's ports: what a binding to one of them is found again
 * by wherever the mark stands, whether or not the pen is offered any ports.
 */
export function ownSitesOf(node: MMNode, nodes: ReadonlyMap<string, MMNode>): MagnetSite[] {
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

  // A held form's own middle: the box of its outline where it stands. An
  // offered form's is the ink's box, as it always was.
  const heldBox = form.held ? getBounds(form.points) : null;
  const heldCentre = heldBox ? { x: (heldBox.minX + heldBox.maxX) / 2, y: (heldBox.minY + heldBox.maxY) / 2 } : null;

  switch (form.shape) {
    case 'line':
    case 'arrow': {
      // A held form's ends are its own — the tail its first point, the tip
      // its second for an arrow (tail, tip, wing, tip, wing), its last for a
      // line — so they follow a reshape. An offered arrow's are its reading's,
      // placed where the mark stands.
      const arrow = form.held ? undefined : (getRep(node, 'reading:arrow')?.data as { tip?: Point; tail?: Point } | undefined);
      const ends = arrow?.tail && arrow.tip && form.shape === 'arrow' ? placed(node, [arrow.tail, arrow.tip]) : null;
      const tail = ends ? ends[0] : form.points[0];
      const tip = ends ? ends[1] : form.held && form.shape === 'arrow' && form.points.length > 1 ? form.points[1] : form.points[form.points.length - 1];
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
      // A held box's centre is where its diagonals cross — turned, leaning or reshaped.
      add('centre', form.held && v.length === 4 ? mid(v[0], v[2]) : centre, 'the centre of the rectangle');
      break;
    }
    case 'circle': {
      // A held circle's centre and cardinals are its own, taken where its
      // form stands — so a reshaped radius moves them, and a turned oval's
      // lie on it.
      const own = form.held ? circleSites(node, form.held) : null;
      add('centre', own ? own[0] : centre, 'the centre of the circle');
      const rx = w / 2, ry = h / 2;
      const cardinals: [string, Point][] = [
        ['north', own ? own[1] : { x: centre.x, y: centre.y - ry }],
        ['east', own ? own[2] : { x: centre.x + rx, y: centre.y }],
        ['south', own ? own[3] : { x: centre.x, y: centre.y + ry }],
        ['west', own ? own[4] : { x: centre.x - rx, y: centre.y }],
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
      add('centre', heldCentre ?? centre, 'the middle of the arc’s span');
      break;
    }
    case 'dot':
      add('point', heldCentre ?? centre, 'the dot');
      break;
    default:
      // Invariant 5: no confident reading, no pretended shape — the ink's own
      // box, unless the ink's own four corners hold it (a flat diamond).
      if (form.corners) {
        form.corners.forEach((p) => add('corner', p, 'a corner of the mark’s outline — its four corners hold it'));
        add('centre', mid(form.corners[0], form.corners[2]), 'the centre of the mark’s four corners');
      } else {
        boundsSites(add, b);
        add('centre', centre, 'the centre of the mark’s bounds');
      }
      break;
  }
  return out;
}

/**
 * A held circle's centre, then its north, east, south and west: read off its
 * own form in its own space (an axis-aligned ellipse there, as `idealize` and
 * a reshape draw it) and placed where the mark stands.
 */
function circleSites(node: MMNode, clean: CleanShape): Point[] {
  const b = getBounds(clean.points);
  const cx = (b.minX + b.maxX) / 2, cy = (b.minY + b.maxY) / 2;
  const rx = (b.maxX - b.minX) / 2, ry = (b.maxY - b.minY) / 2;
  return placed(node, [{ x: cx, y: cy }, { x: cx, y: cy - ry }, { x: cx + rx, y: cy }, { x: cx, y: cy + ry }, { x: cx - rx, y: cy }]);
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
  const spans = new Set<Point[]>();
  for (const site of sites) {
    // A continuous port is measured once, at the nearest place on it.
    if (site.span) {
      if (spans.has(site.span)) continue;
      spans.add(site.span);
    }
    const hit = reachOf(at, site);
    if (hit.distance > radius) continue;
    if (!best || hit.distance < best.distance) best = hit;
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
    const spans = new Set<Point[]>();
    for (const site of magnetSites(node, nodes)) {
      // One hit per continuous port: the nearest place on it.
      if (site.span) {
        if (spans.has(site.span)) continue;
        spans.add(site.span);
      }
      const hit = reachOf(at, site);
      if (hit.distance <= radius) hits.push(hit);
    }
  }
  hits.sort((a, b) => a.distance - b.distance);
  return hits;
}

/**
 * A site found again from what a bind carries — `{ kind, index }` — where it
 * stands NOW: the mark's own sites re-derived, or a notation's port read
 * again. Null when the mark no longer offers it (a notation no longer in use,
 * a shape read differently now); the binding itself stays in the graph.
 */
export function siteOf(node: MMNode, nodes: ReadonlyMap<string, MMNode>, site: { kind: string; index: number }): MagnetSite | null {
  if (site.kind.startsWith('along:')) return alongSiteOf(node, nodes, site.kind.slice('along:'.length), site.index);
  return magnetSites(node, nodes).find((s) => s.kind === site.kind && s.index === site.index) ?? null;
}

/**
 * Where a BINDING's site stands now (V1-PLAN E2): the mark's own site, or the
 * port of a notation the engine knows — read whether or not the pen is
 * offered that notation's ports, because a claim already in the log is read
 * as the board stands, and what the pen is offered is the page's, not the
 * log's. This is what a connector that follows its bindings is carried to,
 * so it answers the same on every board that holds the same log. Null when
 * the mark no longer offers it; the binding stays in the graph as history.
 */
export function boundSiteOf(node: MMNode, nodes: ReadonlyMap<string, MMNode>, site: { kind: string; index: number }): MagnetSite | null {
  if (!site || typeof site.kind !== 'string' || !Number.isInteger(site.index)) return null;
  if (site.kind.startsWith('port:') || site.kind.startsWith('along:')) return portSiteOf(node, nodes, site.kind, site.index);
  return ownSitesOf(node, nodes).find((s) => s.kind === site.kind && s.index === site.index) ?? null;
}

/** One line, for a status line or a brief: "corner of the rectangle at (100, 100)". */
export function describeMagnet(site: MagnetSite): string {
  const r = (v: number) => Math.round(v);
  return `${site.reasoning} at (${r(site.point.x)}, ${r(site.point.y)})`;
}

// ===== The binding graph =====
// What a stroke's ends are tied to. See the contract in this file's header.

/** Where one end of a stroke was released, and whether that anchor still stands. */
export interface Binding {
  /** The stroke whose end this is. */
  strokeId: string;
  /** Which end of it: 'start' | 'end'. */
  end: string;
  /** The mark it was released on. */
  nodeId: string;
  /** The site on that mark — re-derive its point with `magnetSites`. */
  site: { kind: string; index: number };
  /** Whose hand or model made the claim. */
  via?: string;
  /** Why, in the terms it was measured in. */
  reasoning?: string;
  /**
   * False when the target has been erased or is not in the graph at all: the
   * claim is history, not an anchor. True when no graph was given to check
   * against — pass `nodes`, or use `activeBindingsOf`, whenever it matters.
   */
  active: boolean;
}

/** The payload of a `'bound'` rep — the rep half of the contract. */
export interface BoundRep {
  end: string;
  nodeId: string;
  site: { kind: string; index: number };
}

function onTheBoard(nodeId: string, nodes?: ReadonlyMap<string, MMNode>): boolean {
  if (!nodes) return true;
  const n = nodes.get(nodeId);
  return !!n && !getRep(n, 'erased');
}

/**
 * Every binding this mark's ends carry, historical ones included, read from
 * the edges — the canonical half of the contract. Pass `nodes` to have each
 * one say whether its target still stands.
 */
export function bindingsOf(node: MMNode, nodes?: ReadonlyMap<string, MMNode>): Binding[] {
  const out: Binding[] = [];
  for (const e of node.edges) {
    // A `bound-to` edge always carries both, because applyBind is the only
    // thing that writes one; anything else is not a binding.
    if (e.rel !== 'bound-to' || typeof e.end !== 'string' || !e.site) continue;
    out.push({
      strokeId: node.id,
      end: e.end,
      nodeId: e.to,
      site: e.site,
      via: e.via,
      reasoning: e.reasoning,
      active: onTheBoard(e.to, nodes),
    });
  }
  return out;
}

/** The same claims read from the `'bound'` reps — the two must agree. */
export function boundRepsOf(node: MMNode): BoundRep[] {
  return node.reps.filter((r) => r.modality === 'bound').map((r) => r.data as BoundRep);
}

/**
 * Where this stroke is actually ANCHORED now: bindings whose target is still
 * on the board. This is the query re-anchoring asks (CONTROL-POINTS-PLAN P3)
 * — a tombstoned target is never an anchor, and undoing the erase brings the
 * binding back here on its own.
 */
export function activeBindingsOf(node: MMNode, nodes: ReadonlyMap<string, MMNode>): Binding[] {
  return bindingsOf(node, nodes).filter((b) => b.active);
}

/**
 * What hangs off this mark: the bindings pointing AT `nodeId` from `ids`,
 * one per endpoint — so a connector tied to it at both ends is counted
 * twice, once for each end, which is what a mark carrying its arrows needs.
 * With `{ active: true }`, erased strokes and an erased target are left out.
 *
 * `ids` is the set to scan, and which set depends on the question: pass
 * `contentIds` for what hangs off this mark NOW (P3's re-anchoring), and
 * every node id for the history, because an erased mark leaves the content
 * plane while its claims stay in the graph.
 */
export function boundToMark(
  nodeId: string,
  nodes: ReadonlyMap<string, MMNode>,
  ids: readonly string[],
  opts: { active?: boolean } = {},
): Binding[] {
  if (opts.active && !onTheBoard(nodeId, nodes)) return [];
  const out: Binding[] = [];
  for (const id of ids) {
    const n = nodes.get(id);
    if (!n || (opts.active && getRep(n, 'erased'))) continue;
    for (const b of bindingsOf(n, nodes)) {
      if (b.nodeId !== nodeId) continue;
      if (opts.active && !b.active) continue;
      out.push(b);
    }
  }
  return out;
}

/** One line for a status line or a brief: "its start on corner 0 of stroke:1". */
export function describeBinding(b: Binding): string {
  const where = `its ${b.end} on ${b.site.kind} ${b.site.index} of ${b.nodeId}`;
  return b.active ? where : `${where} — erased since`;
}
