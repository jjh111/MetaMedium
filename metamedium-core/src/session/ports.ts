// Ports by notation — the one hook beside `magnetSites` (V1-PLAN §4, §9 E3).
//
// A mark offers attachment where its own geometry says (magnets.ts): a box's
// corners, a line's ends. A NOTATION knows more. Once it reads a mark as one
// of its symbols it can say where that symbol takes a connector — a
// decision's four vertices, a class's sides, a lifeline's whole length, a
// state's border — and that is what a port is. Two kinds:
//
//   - a **point** port: one place (`at`);
//   - a **continuous** port: a segment or an outline (`along`), where the
//     nearest point on it to the pen is the port.
//
// A notation registers here and is asked, per mark, what it reads the mark
// as and which ports it offers there. Its answers come back through the very
// queries the pen already asks — `magnetSites`, `nearestMagnet`,
// `magnetsNear` — so a surface feels a notation's ports with no change of its
// own, and a connector released on one binds there through the `bind` event
// as it stands. With no notation registered nothing here runs, and every
// query answers exactly as it did before the hook (the golden in
// src/test/magnets.golden.ts holds it to that).
//
// **How a port is named in a bind.** The `bind` event carries a site as
// `{ kind, index }` and nothing more, so a port must be found again from
// those two alone — on replay, after the mark moves, on another machine:
//
//   - a point port is `port:<notation>`, its index its place among that
//     notation's point ports on the mark;
//   - a place along a continuous port is `along:<notation>`, its index saying
//     WHICH continuous port and HOW FAR along it, as a share of its length in
//     thousandths (`alongIndex`, `alongOf`). A share, not a point: when the
//     mark moves or is reshaped the place moves with it, which is what
//     bindings that follow (E2) will need.
//
// The notation is in the kind, not the index, so a binding does not depend on
// the order notations happen to be registered in.
//
// **The surface feels a continuous port through `magnetSites` alone.** It
// takes the site points and measures to them itself, with no query point to
// project, so a continuous port is also offered as places along it no further
// apart than the hand's radius at 1× (the spacing magnets.ts passes in). Each
// sample carries the whole span, and `nearestMagnet` / `magnetsNear` project
// onto the span exactly, one hit per port.
//
// Everything here is derived: a port is computed from the marks on demand,
// never stored, and a notation that throws is left out rather than allowed to
// stop the pen. A binding to the port of a notation no longer in use is kept
// as history — the claim stays in the log — and simply cannot be found.

import type { Point } from '../types';
import type { MMNode } from './nodes';
import type { MagnetHit, MagnetSite } from './magnets';

/** A place a notation says its symbol takes a connector. */
export interface NotationPort {
  /** The notation's own name for it: 'vertex', 'side', 'lifeline', 'border'. */
  name: string;
  /** Why it is here, in the notation's words: 'the decision's top vertex'. */
  reasoning: string;
  /** A point port: this place. */
  at?: Point;
  /** A continuous port — a segment (two points) or an outline: the nearest point on it is the port. */
  along?: Point[];
  /** The outline closes on itself: its last point joins its first. */
  closed?: boolean;
}

/** A notation's side of the hook. */
export interface NotationPorts {
  /** The notation's id — 'flowchart', 'uml-class' — which names its sites: 'port:flowchart', 'along:flowchart'. */
  notation: string;
  /**
   * What this notation reads the mark as ('decision', 'lifeline') and the
   * ports its symbol offers there — or null when it does not read the mark as
   * one of its symbols, which is most marks. Derived: the same marks give the
   * same ports, in the same order.
   */
  portsOf(node: MMNode, nodes: ReadonlyMap<string, MMNode>): { symbol: string; ports: NotationPort[] } | null;
}

const registry = new Map<string, NotationPorts>();

/**
 * Let a notation offer ports. A second registration under the same id
 * replaces the first. Returns the way to take it back.
 */
export function registerPorts(notation: NotationPorts): () => void {
  registry.set(notation.notation, notation);
  return () => {
    if (registry.get(notation.notation) === notation) registry.delete(notation.notation);
  };
}

/** Stop a notation offering ports. False when it was not registered. */
export function unregisterPorts(notation: string): boolean {
  return registry.delete(notation);
}

/** The notations offering ports, in the order they registered. */
export function registeredPorts(): string[] {
  return [...registry.keys()];
}

// ===== Where along a port =====

/** A place along a continuous port is said in thousandths of its length. */
export const ALONG_STEPS = 1000;

/** The site index of a place `t` (0–1) along a mark's `ordinal`-th continuous port. */
export function alongIndex(ordinal: number, t: number): number {
  const step = Math.round(Math.min(1, Math.max(0, t)) * ALONG_STEPS);
  return ordinal * (ALONG_STEPS + 1) + step;
}

/** Which continuous port a site index names, and how far along it. */
export function alongOf(index: number): { ordinal: number; t: number } {
  const ordinal = Math.floor(index / (ALONG_STEPS + 1));
  return { ordinal, t: (index - ordinal * (ALONG_STEPS + 1)) / ALONG_STEPS };
}

const quantised = (t: number) => Math.round(Math.min(1, Math.max(0, t)) * ALONG_STEPS) / ALONG_STEPS;

// ===== Spans =====

interface Span {
  /** The polyline, a closed outline's first point repeated last. */
  points: Point[];
  /** Length along it to each point. */
  cum: number[];
  length: number;
}

const finite = (p: unknown): p is Point =>
  !!p && typeof (p as Point).x === 'number' && typeof (p as Point).y === 'number' && Number.isFinite((p as Point).x) && Number.isFinite((p as Point).y);

function spanOf(points: readonly Point[], closed: boolean): Span | null {
  if (!Array.isArray(points) || points.length < 2 || !points.every(finite)) return null;
  const pts = points.map((p) => ({ x: p.x, y: p.y }));
  if (closed && (pts[0].x !== pts[pts.length - 1].x || pts[0].y !== pts[pts.length - 1].y)) pts.push({ ...pts[0] });
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  const length = cum[cum.length - 1];
  return length > 0 ? { points: pts, cum, length } : null;
}

/** A span a site already carries — its points are the closed polyline itself. */
function spanOfSite(points: readonly Point[]): Span | null {
  return spanOf(points, false);
}

function pointAt(span: Span, t: number): Point {
  const target = t * span.length;
  let i = 1;
  while (i < span.cum.length - 1 && span.cum[i] < target) i++;
  const a = span.points[i - 1], b = span.points[i];
  const seg = span.cum[i] - span.cum[i - 1];
  const u = seg > 0 ? (target - span.cum[i - 1]) / seg : 0;
  return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u };
}

/** The nearest point on the span to `at`, as a share of the span's length. */
function project(span: Span, at: Point): number {
  let best = Infinity, bestT = 0;
  for (let i = 1; i < span.points.length; i++) {
    const a = span.points[i - 1], b = span.points[i];
    const dx = b.x - a.x, dy = b.y - a.y;
    const l2 = dx * dx + dy * dy;
    const u = l2 > 0 ? Math.max(0, Math.min(1, ((at.x - a.x) * dx + (at.y - a.y) * dy) / l2)) : 0;
    const d = Math.hypot(at.x - (a.x + u * dx), at.y - (a.y + u * dy));
    if (d < best) {
      best = d;
      bestT = (span.cum[i - 1] + u * (span.cum[i] - span.cum[i - 1])) / span.length;
    }
  }
  return bestT;
}

// ===== Sites =====

interface Read {
  notation: string;
  symbol: string;
  ports: NotationPort[];
}

/** What one notation reads this mark as, with its ports — or null, which a notation that throws also gets. */
function readingOf(provider: NotationPorts, node: MMNode, nodes: ReadonlyMap<string, MMNode>): Read | null {
  let read: { symbol: string; ports: NotationPort[] } | null;
  try {
    read = provider.portsOf(node, nodes);
  } catch {
    return null;
  }
  if (!read || !Array.isArray(read.ports)) return null;
  return { notation: provider.notation, symbol: typeof read.symbol === 'string' ? read.symbol : provider.notation, ports: read.ports };
}

/** What every registered notation reads this mark as, in the order they registered. */
function readings(node: MMNode, nodes: ReadonlyMap<string, MMNode>): Read[] {
  const out: Read[] = [];
  for (const provider of registry.values()) {
    const read = readingOf(provider, node, nodes);
    if (read) out.push(read);
  }
  return out;
}

const said = (port: NotationPort, notation: string) => `${typeof port.reasoning === 'string' ? port.reasoning : port.name} (${notation})`;

const isPointPort = (p: NotationPort) => finite(p.at) && p.along === undefined;
const continuousSpan = (p: NotationPort) => (p.at === undefined ? spanOf(p.along ?? [], !!p.closed) : null);

function alongSite(nodeId: string, symbol: string, notation: string, port: NotationPort, span: Span, ordinal: number, t: number): MagnetSite {
  const tq = quantised(t);
  return {
    nodeId,
    shape: symbol,
    kind: `along:${notation}`,
    index: alongIndex(ordinal, tq),
    point: pointAt(span, tq),
    reasoning: said(port, notation),
    notation,
    port: port.name,
    span: span.points,
    t: tq,
  };
}

/**
 * Every port the registered notations offer on this mark, as magnet sites:
 * point ports first in each notation's order, then each continuous port as
 * places along it no more than `spacing` apart. Empty — and nothing asked —
 * when no notation is registered.
 */
export function portSites(node: MMNode, nodes: ReadonlyMap<string, MMNode>, spacing: number): MagnetSite[] {
  if (registry.size === 0) return [];
  const out: MagnetSite[] = [];
  for (const { notation, symbol, ports } of readings(node, nodes)) {
    let points = 0, spans = 0;
    for (const port of ports) {
      if (!port || typeof port.name !== 'string') continue;
      if (isPointPort(port)) {
        out.push({
          nodeId: node.id,
          shape: symbol,
          kind: `port:${notation}`,
          index: points++,
          point: { x: port.at!.x, y: port.at!.y },
          reasoning: said(port, notation),
          notation,
          port: port.name,
        });
        continue;
      }
      const span = continuousSpan(port);
      if (!span) continue;
      const ordinal = spans++;
      const closedLoop = !!port.closed;
      const n = Math.max(1, Math.ceil(span.length / Math.max(1e-6, spacing)));
      for (let i = 0; i <= (closedLoop ? n - 1 : n); i++) out.push(alongSite(node.id, symbol, notation, port, span, ordinal, i / n));
    }
  }
  return out;
}

/**
 * How far a point is from a site — and, for a place along a continuous port,
 * the nearest place on that port instead, re-indexed to where it is. For
 * every other site, exactly the distance to its point.
 */
export function reachOf(at: Point, site: MagnetSite): MagnetHit {
  if (!site.span) return { site, distance: Math.hypot(site.point.x - at.x, site.point.y - at.y) };
  const span = spanOfSite(site.span);
  if (!span) return { site, distance: Math.hypot(site.point.x - at.x, site.point.y - at.y) };
  const t = quantised(project(span, at));
  const point = pointAt(span, t);
  const { ordinal } = alongOf(site.index);
  return { site: { ...site, index: alongIndex(ordinal, t), point, t }, distance: Math.hypot(point.x - at.x, point.y - at.y) };
}

/**
 * A place along a notation's continuous port, found again from the index a
 * bind carries — where that port is NOW. Null when the notation is not
 * registered, no longer reads the mark, or has no such port.
 */
export function alongSiteOf(node: MMNode, nodes: ReadonlyMap<string, MMNode>, notation: string, index: number): MagnetSite | null {
  const provider = registry.get(notation);
  if (!provider || !Number.isInteger(index) || index < 0) return null;
  const read = readingOf(provider, node, nodes);
  if (!read) return null;
  const { ordinal, t } = alongOf(index);
  let k = 0;
  for (const port of read.ports) {
    if (!port || typeof port.name !== 'string' || isPointPort(port)) continue;
    const span = continuousSpan(port);
    if (!span) continue;
    if (k++ === ordinal) return alongSite(node.id, read.symbol, notation, port, span, ordinal, t);
  }
  return null;
}
