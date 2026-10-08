// Rings: the closed outlines a fill is made of (V1-SPEC IN1, `ink-outline.ts`'s plain geometry).
//
// A fill is one or more closed rings and a rule. Which rings bound the fill and which are holes in it is the
// rule's to say: even-odd by how many rings a ring is inside, nonzero by which way the rings are walked. The
// rest — area, perimeter, a point that is really inside — is arithmetic a ring owes every method that reads it.
//
// Input is read, not trusted (DATA-1): a ring that is not an array of points, a point that is not two finite
// numbers, a ring too small to enclose anything — each is left out, and nothing throws.

import type { Point, Bounds } from '../types';

export type FillRule = 'nonzero' | 'evenodd';

/** Coordinates beyond this are not a drawing: a hand's page is thousands of units across, not millions. */
const COORD_LIMIT = 1e7;
/** The least area, in square units, that a ring may enclose. */
const MIN_AREA = 1e-9;
/** More rings than this in one fill are each their own outline: nesting them would be quadratic. */
export const MAX_NESTED_RINGS = 4000;

/** `raw` as a ring of finite points, consecutive repeats and a closing repeat taken out; null when it encloses nothing. */
export function cleanRing(raw: unknown): Point[] | null {
  if (!Array.isArray(raw)) return null;
  const out: Point[] = [];
  for (const p of raw as unknown[]) {
    if (!p || typeof p !== 'object') continue;
    const x = (p as Point).x, y = (p as Point).y;
    if (typeof x !== 'number' || typeof y !== 'number' || !Number.isFinite(x) || !Number.isFinite(y) || Math.abs(x) > COORD_LIMIT || Math.abs(y) > COORD_LIMIT) continue;
    const last = out[out.length - 1];
    if (last && Math.abs(last.x - x) < 1e-9 && Math.abs(last.y - y) < 1e-9) continue;
    out.push({ x, y });
  }
  while (out.length > 1 && Math.abs(out[0].x - out[out.length - 1].x) < 1e-9 && Math.abs(out[0].y - out[out.length - 1].y) < 1e-9) out.pop();
  if (out.length < 3) return null;
  return Math.abs(signedArea(out)) > MIN_AREA ? out : null;
}

/** The shoelace area: positive for one way round, negative for the other. */
export function signedArea(ring: readonly Point[]): number {
  let a = 0;
  for (let i = 0, n = ring.length; i < n; i++) {
    const p = ring[i], q = ring[i + 1 === n ? 0 : i + 1];
    a += p.x * q.y - q.x * p.y;
  }
  return a / 2;
}

/** The length of the ring all the way round. */
export function perimeter(ring: readonly Point[]): number {
  let len = 0;
  for (let i = 0, n = ring.length; i < n; i++) {
    const p = ring[i], q = ring[i + 1 === n ? 0 : i + 1];
    len += Math.hypot(q.x - p.x, q.y - p.y);
  }
  return len;
}

export function boundsOfRing(ring: readonly Point[]): Bounds {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of ring) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, maxX, minY, maxY };
}

/** Whether `p` is inside `ring`, by the even-odd rule (a ray to the right). */
export function pointInRing(p: Point, ring: readonly Point[]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const a = ring[i], b = ring[j];
    if ((a.y > p.y) !== (b.y > p.y) && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) inside = !inside;
  }
  return inside;
}

/**
 * A point inside the ring — not its centre, which a bent ring does not contain: the middle of the widest stretch
 * along a horizontal line through it, tried at several heights. Falls back to the mean of the vertices.
 */
export function interiorPoint(ring: readonly Point[]): Point {
  const b = boundsOfRing(ring);
  for (const f of [0.5, 0.37, 0.63, 0.25, 0.75, 0.12, 0.88]) {
    const y = b.minY + (b.maxY - b.minY) * f;
    const xs: number[] = [];
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const p = ring[i], q = ring[j];
      if ((p.y > y) !== (q.y > y)) xs.push(p.x + ((y - p.y) * (q.x - p.x)) / (q.y - p.y));
    }
    xs.sort((m, n) => m - n);
    let best = 0, at = -1;
    for (let k = 0; k + 1 < xs.length; k += 2) {
      if (xs[k + 1] - xs[k] > best) { best = xs[k + 1] - xs[k]; at = k; }
    }
    if (at >= 0 && best > 1e-9) return { x: (xs[at] + xs[at + 1]) / 2, y };
  }
  let sx = 0, sy = 0;
  for (const p of ring) { sx += p.x; sy += p.y; }
  return { x: sx / ring.length, y: sy / ring.length };
}

/** One bounded piece of the fill: its outer ring and the rings that are holes in it. */
export interface Unit {
  outer: Point[];
  holes: Point[][];
}

interface Info {
  ring: Point[];
  area: number;
  box: Bounds;
  inside: Point;
  container: number[];
}

/**
 * The fill's rings sorted into units. A ring is a hole when the fill rule says the ground just inside it is
 * empty and the ground just outside it is not; it bounds the fill when the reverse holds; a ring that is inside
 * the fill on both sides (two rings walked the same way, under nonzero) is neither and is left out of the units.
 */
export function unitsOf(rings: readonly unknown[], rule: FillRule): { units: Unit[]; dropped: number; nested: boolean } {
  const infos: Info[] = [];
  let dropped = 0;
  for (const raw of rings) {
    const ring = cleanRing(raw);
    if (!ring) { dropped++; continue; }
    infos.push({ ring, area: signedArea(ring), box: boundsOfRing(ring), inside: interiorPoint(ring), container: [] });
  }
  if (infos.length === 0) return { units: [], dropped, nested: false };
  if (infos.length > MAX_NESTED_RINGS) {
    return { units: infos.map((i) => ({ outer: i.ring, holes: [] })), dropped, nested: false };
  }
  for (let i = 0; i < infos.length; i++) {
    const p = infos[i].inside;
    for (let j = 0; j < infos.length; j++) {
      if (i === j) continue;
      const b = infos[j].box;
      if (p.x < b.minX || p.x > b.maxX || p.y < b.minY || p.y > b.maxY) continue;
      if (Math.abs(infos[j].area) <= Math.abs(infos[i].area)) continue;
      if (pointInRing(p, infos[j].ring)) infos[i].container.push(j);
    }
  }
  const role: ('outer' | 'hole' | 'inner')[] = infos.map((info) => {
    if (rule === 'evenodd') return info.container.length % 2 === 0 ? 'outer' : 'hole';
    let outside = 0;
    for (const j of info.container) outside += Math.sign(infos[j].area);
    const within = outside + Math.sign(info.area);
    if (outside === 0) return 'outer';
    return within === 0 ? 'hole' : 'inner';
  });
  const units: Unit[] = [];
  const unitOf = new Map<number, Unit>();
  infos.forEach((info, i) => {
    if (role[i] !== 'outer') return;
    const u: Unit = { outer: info.ring, holes: [] };
    unitOf.set(i, u);
    units.push(u);
  });
  infos.forEach((info, i) => {
    if (role[i] !== 'hole') return;
    // Its parent is the smallest ring that bounds the fill and contains it.
    let parent = -1;
    for (const j of info.container) {
      if (role[j] !== 'outer') continue;
      if (parent < 0 || Math.abs(infos[j].area) < Math.abs(infos[parent].area)) parent = j;
    }
    const u = parent >= 0 ? unitOf.get(parent) : undefined;
    if (u) u.holes.push(info.ring);
  });
  return { units, dropped, nested: true };
}

/** The ring's vertices at equal steps along it, `n` of them, not repeating the first. */
export function resampleClosed(ring: readonly Point[], n: number): Point[] {
  const m = ring.length;
  const cum = new Float64Array(m + 1);
  for (let i = 0; i < m; i++) {
    const p = ring[i], q = ring[i + 1 === m ? 0 : i + 1];
    cum[i + 1] = cum[i] + Math.hypot(q.x - p.x, q.y - p.y);
  }
  const total = cum[m];
  const out: Point[] = [];
  if (!(total > 0) || n < 1) return out;
  let j = 0;
  for (let k = 0; k < n; k++) {
    const target = (k / n) * total;
    while (j < m - 1 && cum[j + 1] < target) j++;
    const span = cum[j + 1] - cum[j];
    const t = span > 0 ? (target - cum[j]) / span : 0;
    const p = ring[j], q = ring[j + 1 === m ? 0 : j + 1];
    out.push({ x: p.x + (q.x - p.x) * t, y: p.y + (q.y - p.y) * t });
  }
  return out;
}

/** The polyline's vertices at equal steps along it, `n` of them, the first and the last kept. */
export function resampleOpen(path: readonly Point[], n: number): Point[] {
  const m = path.length;
  if (m === 0) return [];
  if (m === 1 || n < 2) return [{ x: path[0].x, y: path[0].y }];
  const cum = new Float64Array(m);
  for (let i = 1; i < m; i++) cum[i] = cum[i - 1] + Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y);
  const total = cum[m - 1];
  if (!(total > 0)) return [{ x: path[0].x, y: path[0].y }];
  const out: Point[] = [];
  let j = 0;
  for (let k = 0; k < n; k++) {
    const target = (k / (n - 1)) * total;
    while (j < m - 2 && cum[j + 1] < target) j++;
    const span = cum[j + 1] - cum[j];
    const t = span > 0 ? Math.min(1, (target - cum[j]) / span) : 0;
    out.push({ x: path[j].x + (path[j + 1].x - path[j].x) * t, y: path[j].y + (path[j + 1].y - path[j].y) * t });
  }
  return out;
}

/** The length of an open polyline. */
export function pathLength(path: readonly Point[]): number {
  let len = 0;
  for (let i = 1; i < path.length; i++) len += Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y);
  return len;
}
