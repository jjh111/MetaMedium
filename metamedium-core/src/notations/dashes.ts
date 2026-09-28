// Dashed lines — short strokes in a row, read as one line (V1-PLAN §3, §9 D5).
//
// A hand draws a dashed line as dashes: short straight strokes one after
// another along a line, a gap between each. The shape rung reads each alone —
// a line, and sure of it — and nothing on the board says the row is one mark.
// A sequence diagram needs it (a lifeline and a return are drawn dashed), and
// so will a class diagram's dependency. So this reads the strokes together,
// the way figures.ts reads ruled strokes whose ends meet, and says what they
// make:
//
//   - **A dash** is an open stroke, short on screen (DASH_PX), straight — it
//     stands off its own chord by little (DASH_BOW) and doubles back on
//     nothing (DASH_PATH). A fleck too small to have a direction is no dash.
//     A letter the letter rules gathered into a word (session/words.ts) is a
//     stroke like any other: a chevron drawn right after a dashed line's last
//     dash is gathered with that dash into a word, and the dash is still a
//     dash (the chevron is the line's head — `dashedHeads`).
//   - **A row** is MIN_DASHES or more, both ends of each within DASH_OFF of
//     the line through them all — a corridor, measured in the hand's pixels,
//     not an angle: a dash of eight pixels has no direction a hand meant — and
//     each beside the next ALONG it, a gap between them no longer than
//     DASH_GAP of their length, or a hand's slight overlap. Letters stand side
//     by side, not end to end, so a row of them is no dashed line, and neither
//     is a column; strokes slanting across the line leave its corridor.
//   - **Nothing small touches a dash but at the row's own ends, and nothing
//     small stands in a gap.** This is what keeps writing out. Printed
//     letters are straight strokes too — the top bars of an F and two Es
//     stand in a row at the cap height — but a letter's strokes JOIN: a stem
//     meets a bar at an end. A mark no bigger than a few dashes (SMALL_MARK)
//     that touches a dash anywhere but at the row's ends (where a head is
//     drawn) breaks the row there, and so does one standing in a gap (a digit
//     between two minus signs). Long marks — a box, a lifeline, a message
//     crossing a dashed lifeline — may touch and cross freely, and so may the
//     dashes of another row crossing this one steeply (a dashed return
//     crossing a dashed lifeline).
//
// Every threshold is the hand's: a dash is short on screen, the rest are
// ratios of the dashes' own length. Derived, like figures: nothing is made
// and nothing enters the log. A row's ends run from its first dash to its
// last; which way it points is for whatever reads it, from the head at an
// end — `dashedHeads` asks heads.ts, on a scratch board where the row is one
// straight stroke, what sits at each end.

import type { Bounds, Point } from '../types';
import type { SessionState } from '../session/session';
import { createSession } from '../session/session';
import type { MMNode } from '../session/nodes';
import { boundsOf, fingerprintOf, getRep, isWord, lettersOf, strokePointsOf } from '../session/nodes';
import { magnetRadius } from '../session/magnets';
import type { ConnectorEnd } from '../diagram/heads';
import { headsOf, HEAD_MAX_SHARE } from '../diagram/heads';
import { MAX_TIER0_CONFIDENCE } from '../recognition';

/** A row of dashes read as one line. */
export interface DashedLine {
  /** `dashes:` and its dashes' ids, sorted and joined by `+` — a function of the set, like a figure's id. */
  id: string;
  /** Its dashes, in order from `from` to `to`. */
  ids: string[];
  /** What stands for them in the content plane: each loose dash, or the word the letter rules gathered one into. */
  marks: string[];
  /** Its ends, on the line through its dashes: `from` the left end — the top, for a row nearer plumb than level. */
  from: Point;
  to: Point;
  /** Unit, from `from` to `to`. */
  axis: Point;
  length: number;
  /** How many dashes, their median length and the median gap between them, in canvas units. */
  dashes: number;
  dash: number;
  gap: number;
  /** 0–1, below the shape rung's own ceiling. */
  confidence: number;
  reason: string;
}

// ===== Thresholds — the hand's, or ratios of the dashes' own length =====

/** A dash is this long on screen: from a fleck longer than a dot to a stroke no longer than a short word. */
export const DASH_PX = [5, 48] as const;
/** A dash stands off its own chord by at most this share of its length — or 2 px on screen, whichever is more. */
export const DASH_BOW = 0.2;
/** …and its path is at most this many times its chord: it doubles back on nothing. */
export const DASH_PATH = 1.35;
/** Both ends of each dash lie within this share of the row's median dash of the line through them all — or 3 px on screen, whichever is more. */
export const DASH_OFF = 0.3;
export const DASH_OFF_PX = 3;
/** The gap from one dash to the next is at most this share of their mean length — or 10 px on screen, whichever is more. */
export const DASH_GAP = 1.5;
export const DASH_GAP_PX = 10;
/** …and they overlap by at most this share of the shorter: a hand's slip, never one drawn over another. */
export const DASH_OVERLAP = 0.25;
/** A dash is no shorter than the first share of its row's median, and no longer than the second. */
export const DASH_SPREAD = [0.3, 2.5] as const;
/** A row has at least this many dashes: two strokes in line are a broken line, not a dashed one. */
export const MIN_DASHES = 3;
/** A mark no bigger than this many median dashes is small — a letter's size — and may touch a dash only at the row's ends, and stand in no gap. */
export const SMALL_MARK = 3;
/** Touching: within this share of the median dash — or 2 px on screen, whichever is more. */
export const DASH_TOUCH = 0.2;
export const DASH_TOUCH_PX = 2;
/** Another row's dash crossing this one at this many degrees or more is a line crossing, not a joint. */
export const CROSSING_DEG = 50;
/** A small mark at the end of a line at least this many times its size is that line's head — it touches other rows as the line does. */
export const HEAD_OF = 4;

const MAX = MAX_TIER0_CONFIDENCE;
const DEG = 180 / Math.PI;
const sub = (a: Point, b: Point): Point => ({ x: a.x - b.x, y: a.y - b.y });
const dot = (a: Point, b: Point) => a.x * b.x + a.y * b.y;
const cross = (a: Point, b: Point) => a.x * b.y - a.y * b.x;
const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const ramp = (v: number, lo: number, hi: number) => Math.max(0, Math.min(1, (v - lo) / (hi - lo)));
const median = (xs: readonly number[]) => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length ? (s.length % 2 ? s[(s.length - 1) / 2] : (s[s.length / 2 - 1] + s[s.length / 2]) / 2) : 0;
};
const scaleOf = (node: MMNode) => (getRep(node, 'stroke')?.data as { scale?: number } | undefined)?.scale ?? 1;
/** Pointing right — or down, for a direction nearer plumb than level. */
const canonical = (u: Point): Point => (Math.abs(u.y) > Math.abs(u.x) ? (u.y < 0 ? { x: -u.x, y: -u.y } : u) : u.x < 0 ? { x: -u.x, y: -u.y } : u);

function distToSegment(p: Point, a: Point, b: Point): number {
  const ab = sub(b, a);
  const l2 = dot(ab, ab);
  const t = l2 > 0 ? Math.max(0, Math.min(1, dot(sub(p, a), ab) / l2)) : 0;
  return Math.hypot(p.x - (a.x + ab.x * t), p.y - (a.y + ab.y * t));
}

function distToPolyline(p: Point, path: readonly Point[]): number {
  if (path.length === 1) return dist(p, path[0]);
  let best = Infinity;
  for (let i = 1; i < path.length; i++) best = Math.min(best, distToSegment(p, path[i - 1], path[i]));
  return best;
}

// ===== A dash =====

/** One stroke as a dash: its ends, middle, direction and length. */
interface Dash {
  id: string;
  /** What stands for it in the content plane: itself, or its word. */
  mark: string;
  a: Point;
  b: Point;
  c: Point;
  /** Unit, `canonical`. */
  u: Point;
  len: number;
  scale: number;
  ink: Point[];
  bounds: Bounds;
}

/** A stroke of the scope, as the obstruction tests see it: its ink, box and size. */
interface Stroke {
  id: string;
  mark: string;
  ink: Point[];
  bounds: Bounds;
  size: number;
  scale: number;
}

/** Whether a stroke is a dash: open, short on screen, straight. */
function dashOf(s: Stroke, node: MMNode): Dash | null {
  const pts = s.ink;
  if (pts.length < 2) return null;
  const fp = fingerprintOf(node);
  if (!fp || fp.isClosed) return null;
  const a = pts[0], b = pts[pts.length - 1];
  const len = dist(a, b);
  const hand = len / s.scale;
  if (hand < DASH_PX[0] || hand > DASH_PX[1]) return null;
  let path = 0, bow = 0;
  for (let i = 0; i < pts.length; i++) {
    if (i) path += dist(pts[i], pts[i - 1]);
    bow = Math.max(bow, distToSegment(pts[i], a, b));
  }
  if (path > DASH_PATH * len || bow > Math.max(DASH_BOW * len, 2 * s.scale)) return null;
  const u = canonical({ x: (b.x - a.x) / len, y: (b.y - a.y) / len });
  return { id: s.id, mark: s.mark, a, b, c: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, u, len, scale: s.scale, ink: pts, bounds: s.bounds };
}

/** The strokes a scope is drawn with: each loose stroke, and each letter of each word, standing for its word. */
function strokesOf(state: SessionState, scopeIds?: readonly string[]): { strokes: Stroke[]; nodes: Map<string, MMNode> } {
  const artifacts = new Set(state.artifacts);
  const ids = scopeIds ? [...new Set(scopeIds)] : state.contentIds.filter((id) => !artifacts.has(id));
  const strokes: Stroke[] = [];
  const nodes = new Map<string, MMNode>();
  const add = (id: string, mark: string) => {
    const n = state.nodes.get(id);
    if (!n || getRep(n, 'erased') || getRep(n, 'gesture') || !getRep(n, 'stroke')) return;
    const ink = strokePointsOf(n);
    const b = boundsOf(n);
    if (!ink || !ink.length || !b) return;
    strokes.push({ id, mark, ink, bounds: b, size: Math.max(b.maxX - b.minX, b.maxY - b.minY), scale: scaleOf(n) });
    nodes.set(id, n);
  };
  for (const id of ids) {
    const n = state.nodes.get(id);
    if (!n || artifacts.has(id) || getRep(n, 'erased') || getRep(n, 'gesture')) continue;
    if (isWord(n)) for (const l of lettersOf(n)) add(l, id);
    else add(id, id);
  }
  return { strokes, nodes };
}

// ===== Rows =====

/** Where a dash lies along a line, and how well it keeps to it: the further of its ends from the line, and how far it turns off it. */
interface Placed {
  d: Dash;
  s0: number;
  s1: number;
  off: number;
  angle: number;
}

interface Fit {
  centre: Point;
  axis: Point;
  placed: Placed[];
  dash: number;
  off: number;
  touch: number;
}

/** The line through a run of dashes (their ends, by least squares), and each dash placed along it, in order. */
function fitOf(run: readonly Dash[]): Fit {
  const pts = run.flatMap((d) => [d.a, d.b]);
  const n = pts.length;
  const centre = { x: pts.reduce((k, p) => k + p.x, 0) / n, y: pts.reduce((k, p) => k + p.y, 0) / n };
  let sxx = 0, syy = 0, sxy = 0;
  for (const p of pts) {
    sxx += (p.x - centre.x) ** 2;
    syy += (p.y - centre.y) ** 2;
    sxy += (p.x - centre.x) * (p.y - centre.y);
  }
  const t = 0.5 * Math.atan2(2 * sxy, sxx - syy);
  const axis = canonical({ x: Math.cos(t), y: Math.sin(t) });
  const placed = run
    .map((d) => {
      const pa = dot(sub(d.a, centre), axis), pb = dot(sub(d.b, centre), axis);
      const off = Math.max(Math.abs(cross(axis, sub(d.a, centre))), Math.abs(cross(axis, sub(d.b, centre))));
      return { d, s0: Math.min(pa, pb), s1: Math.max(pa, pb), off, angle: Math.acos(Math.min(1, Math.abs(dot(d.u, axis)))) * DEG };
    })
    .sort((p, q) => p.s0 + p.s1 - (q.s0 + q.s1));
  const dash = median(run.map((d) => d.len));
  const sc = median(run.map((d) => d.scale));
  return { centre, axis, placed, dash, off: Math.max(DASH_OFF * dash, DASH_OFF_PX * sc), touch: Math.max(DASH_TOUCH * dash, DASH_TOUCH_PX * sc) };
}

/** The most two dashes may stand apart along their line, and overlap. */
const gapLimits = (p: Dash, q: Dash) => {
  const sc = Math.max(p.scale, q.scale);
  return { most: Math.max(DASH_GAP * ((p.len + q.len) / 2), DASH_GAP_PX * sc), least: -DASH_OVERLAP * Math.min(p.len, q.len) };
};

/**
 * Two dashes that could stand next to each other in a row: the gap between
 * them along the line through their middles — negative when they overlap —
 * or null when either leaves that line's corridor or the gap is too wide.
 */
function gapBetween(p: Dash, q: Dash): number | null {
  const d = sub(q.c, p.c);
  const l = Math.hypot(d.x, d.y);
  if (l < 1e-9) return null;
  const u = { x: d.x / l, y: d.y / l };
  const sc = Math.max(p.scale, q.scale);
  const off = Math.max(DASH_OFF * Math.max(p.len, q.len), DASH_OFF_PX * sc);
  for (const e of [p.a, p.b, q.a, q.b]) if (Math.abs(cross(u, sub(e, p.c))) > off) return null;
  const pa = dot(sub(p.a, p.c), u), pb = dot(sub(p.b, p.c), u);
  const qa = dot(sub(q.a, p.c), u), qb = dot(sub(q.b, p.c), u);
  const gap = Math.min(qa, qb) - Math.max(pa, pb);
  const { most, least } = gapLimits(p, q);
  return gap > most || gap < least ? null : gap;
}

/**
 * Rows of dashes. Each dash keeps its nearest neighbour in the row, and the
 * nearest on the other side of it; two dashes are joined when each keeps the
 * other — so a row is a path, whatever way it runs, and a dash between two
 * rows joins neither by half.
 */
function rowsOf(dashes: readonly Dash[]): Dash[][] {
  if (dashes.length < MIN_DASHES) return [];
  const reach = Math.max(...dashes.map((d) => d.len * (1 + DASH_GAP) + DASH_GAP_PX * d.scale));
  const cell = Math.max(1e-6, reach);
  const grid = new Map<string, number[]>();
  const key = (x: number, y: number) => `${x},${y}`;
  dashes.forEach((d, i) => {
    const k = key(Math.floor(d.c.x / cell), Math.floor(d.c.y / cell));
    (grid.get(k) ?? grid.set(k, []).get(k)!).push(i);
  });
  const keep: number[][] = dashes.map((p, i) => {
    const gx = Math.floor(p.c.x / cell), gy = Math.floor(p.c.y / cell);
    const near: { j: number; gap: number; dir: Point }[] = [];
    for (let dx = -1; dx <= 1; dx++)
      for (let dy = -1; dy <= 1; dy++)
        for (const j of grid.get(key(gx + dx, gy + dy)) ?? []) {
          if (j === i) continue;
          const gap = gapBetween(p, dashes[j]);
          if (gap === null) continue;
          const d = sub(dashes[j].c, p.c);
          const l = Math.hypot(d.x, d.y);
          near.push({ j, gap, dir: { x: d.x / l, y: d.y / l } });
        }
    near.sort((a, b) => a.gap - b.gap || a.j - b.j);
    const first = near[0];
    if (!first) return [];
    const second = near.find((n) => dot(n.dir, first.dir) < -0.5);
    return second ? [first.j, second.j] : [first.j];
  });
  const links: number[][] = dashes.map(() => []);
  keep.forEach((ks, i) => {
    for (const j of ks) if (j > i && keep[j].includes(i)) (links[i].push(j), links[j].push(i));
  });
  const seen = new Set<number>();
  const rows: Dash[][] = [];
  const walk = (start: number) => {
    const row: number[] = [];
    let prev = -1, at = start;
    while (at >= 0 && !seen.has(at)) {
      seen.add(at);
      row.push(at);
      const next = links[at].find((j) => j !== prev && !seen.has(j));
      prev = at;
      at = next ?? -1;
    }
    if (row.length >= MIN_DASHES) rows.push(row.map((k) => dashes[k]));
  };
  dashes.forEach((_, i) => {
    if (!seen.has(i) && links[i].length <= 1) walk(i);
  });
  dashes.forEach((_, i) => {
    if (!seen.has(i)) walk(i);
  });
  return rows;
}

/** A row's parts once each dash that does not keep to the line, or a gap too wide, is left out. */
function kept(run: Dash[]): Dash[][] {
  const out: Dash[][] = [];
  const queue: Dash[][] = [run];
  while (queue.length) {
    const r = queue.pop()!;
    if (r.length < MIN_DASHES) continue;
    const f = fitOf(r);
    // The worst dash off its line, by how far past its allowance; none past it keeps the row.
    let worst = -1, by = 1;
    f.placed.forEach((p, k) => {
      const over = Math.max(p.off / f.off, p.d.len / (DASH_SPREAD[1] * f.dash), (DASH_SPREAD[0] * f.dash) / Math.max(1e-9, p.d.len));
      if (over > by) {
        by = over;
        worst = k;
      }
    });
    if (worst >= 0) {
      queue.push(f.placed.slice(0, worst).map((p) => p.d), f.placed.slice(worst + 1).map((p) => p.d));
      continue;
    }
    const cut = f.placed.findIndex((p, k) => {
      if (!k) return false;
      const q = f.placed[k - 1];
      const { most, least } = gapLimits(q.d, p.d);
      const gap = p.s0 - q.s1;
      return gap > most || gap < least;
    });
    if (cut > 0) {
      queue.push(f.placed.slice(0, cut).map((p) => p.d), f.placed.slice(cut).map((p) => p.d));
      continue;
    }
    out.push(f.placed.map((p) => p.d));
  }
  return out;
}

/**
 * A row's parts once each dash a small mark touches — anywhere but at the
 * row's own ends — is left out, and each gap a small mark stands in is cut.
 * `crossing` says which strokes are dashes of another row crossing this one,
 * and `heads` which are the head of another line: a mark drawn apart at the
 * end of a long stroke or of another row (a message's chevron at the
 * lifeline it reaches) belongs to that line, not to this one's letters.
 */
function clear(run: Dash[], others: readonly Stroke[], crossing: (id: string, axis: Point) => boolean, heads: (m: Stroke, run: readonly Dash[]) => boolean): { parts: Dash[][]; why: string[] } {
  const f = fitOf(run);
  const mine = new Set(run.map((d) => d.id));
  const lo = f.placed[0].s0, hi = f.placed[f.placed.length - 1].s1;
  const ends = [
    { x: f.centre.x + f.axis.x * lo, y: f.centre.y + f.axis.y * lo },
    { x: f.centre.x + f.axis.x * hi, y: f.centre.y + f.axis.y * hi },
  ];
  const box = run.reduce((b, d) => ({ minX: Math.min(b.minX, d.bounds.minX), minY: Math.min(b.minY, d.bounds.minY), maxX: Math.max(b.maxX, d.bounds.maxX), maxY: Math.max(b.maxY, d.bounds.maxY) }), { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity });
  const grow = f.dash + f.touch;
  const joined = new Set<number>();
  const blocked = new Set<number>(); // gap k: between placed k-1 and k
  const why: string[] = [];
  for (const m of others) {
    if (mine.has(m.id) || m.size > SMALL_MARK * f.dash) continue;
    const b = m.bounds;
    if (b.minX > box.maxX + grow || b.maxX < box.minX - grow || b.minY > box.maxY + grow || b.maxY < box.minY - grow) continue;
    if (crossing(m.id, f.axis) || heads(m, run)) continue;
    // A head at the row's end touches it there: not a joint.
    const atEnd = ends.some((e) => distToPolyline(e, m.ink) <= 2 * f.touch);
    f.placed.forEach((p, k) => {
      if (joined.has(k)) return;
      const near = m.ink.some((q) => distToSegment(q, p.d.a, p.d.b) <= f.touch) || distToPolyline(p.d.a, m.ink) <= f.touch || distToPolyline(p.d.b, m.ink) <= f.touch;
      if (!near) return;
      const outer = (k === 0 || k === f.placed.length - 1) && atEnd;
      if (outer) return;
      joined.add(k);
      why.push(`${m.id} touches the dash ${p.d.id}`);
    });
    // Standing in a gap: ink between two dashes, on the line.
    for (const q of m.ink) {
      const s = dot(sub(q, f.centre), f.axis);
      if (Math.abs(cross(f.axis, sub(q, f.centre))) > f.off) continue;
      for (let k = 1; k < f.placed.length; k++) {
        if (s > f.placed[k - 1].s1 && s < f.placed[k].s0 && !blocked.has(k)) {
          blocked.add(k);
          why.push(`${m.id} stands in the gap before ${f.placed[k].d.id}`);
        }
      }
    }
  }
  if (!joined.size && !blocked.size) return { parts: [run], why };
  const parts: Dash[][] = [];
  let part: Dash[] = [];
  f.placed.forEach((p, k) => {
    if (blocked.has(k) || joined.has(k)) {
      if (part.length) parts.push(part);
      part = [];
    }
    if (!joined.has(k)) part.push(p.d);
  });
  if (part.length) parts.push(part);
  return { parts: parts.filter((x) => x.length >= MIN_DASHES), why };
}

/** A row as a dashed line: its ends on its line, its measures, how sure, and why. */
function lineOf(run: readonly Dash[]): DashedLine {
  const f = fitOf(run);
  const first = f.placed[0], last = f.placed[f.placed.length - 1];
  const at = (s: number): Point => ({ x: f.centre.x + f.axis.x * s, y: f.centre.y + f.axis.y * s });
  const from = at(first.s0), to = at(last.s1);
  const gaps = f.placed.slice(1).map((p, k) => p.s0 - f.placed[k].s1);
  const gap = median(gaps);
  const meanGap = gaps.reduce((a, g) => a + g, 0) / Math.max(1, gaps.length);
  const spread = gaps.length > 1 ? Math.sqrt(gaps.reduce((a, g) => a + (g - meanGap) ** 2, 0) / gaps.length) / Math.max(1e-9, Math.abs(meanGap) + f.dash * 0.25) : 0;
  const maxOff = Math.max(...f.placed.map((p) => p.off));
  const maxAngle = Math.max(...f.placed.map((p) => p.angle));
  const n = f.placed.length;
  const sure = (0.55 + 0.45 * ramp(n, MIN_DASHES, 6)) * (1 - 0.5 * (maxOff / f.off)) * (1 - 0.3 * Math.min(1, spread));
  const ids = f.placed.map((p) => p.d.id);
  const sc = median(run.map((d) => d.scale));
  const px = (v: number) => `${Math.round(v / sc)} px`;
  return {
    id: `dashes:${[...ids].sort().join('+')}`,
    ids,
    marks: [...new Set(f.placed.map((p) => p.d.mark))],
    from,
    to,
    axis: f.axis,
    length: dist(from, to),
    dashes: n,
    dash: f.dash,
    gap,
    confidence: MAX * sure,
    reason: `${n} dashes in a row, each about ${px(f.dash)} long and ${px(gap)} apart, both ends of every one within ${px(maxOff)} of the line through them (${Math.max(1, Math.round(maxAngle))}° off it at the most)`,
  };
}

/**
 * Every dashed line in a scope — the board's content plane when none is
 * given — in reading order. Reads the session and changes nothing in it.
 */
export function dashedLines(state: SessionState, scopeIds?: readonly string[]): DashedLine[] {
  const { strokes, nodes } = strokesOf(state, scopeIds);
  const dashes = strokes.map((s) => dashOf(s, nodes.get(s.id)!)).filter((d): d is Dash => !!d);
  if (dashes.length < MIN_DASHES) return [];
  const rows = rowsOf(dashes).flatMap(kept);
  // Which row each dash is in, and its line: another row's dash crossing steeply is no joint.
  const rowOf = new Map<string, Point>();
  for (const r of rows) {
    const axis = fitOf(r).axis;
    for (const d of r) rowOf.set(d.id, axis);
  }
  const crossing = (id: string, axis: Point) => {
    const other = rowOf.get(id);
    return !!other && Math.acos(Math.min(1, Math.abs(dot(other, axis)))) * DEG >= CROSSING_DEG;
  };
  // The ends of every long stroke and of every row: a small mark drawn at one is that line's head.
  const ends: { at: Point; host: Set<string>; size: number }[] = [];
  for (const s of strokes) {
    if (s.ink.length < 2 || fingerprintOf(nodes.get(s.id)!)?.isClosed) continue;
    const host = new Set([s.id]);
    ends.push({ at: s.ink[0], host, size: s.size }, { at: s.ink[s.ink.length - 1], host, size: s.size });
  }
  for (const r of rows) {
    const l = lineOf(r);
    const host = new Set(l.ids);
    for (const at of [l.from, l.to]) ends.push({ at, host, size: l.length });
  }
  const heads = (m: Stroke, run: readonly Dash[]) => {
    const reach = magnetRadius(m.size, m.scale);
    return ends.some((e) => e.size >= HEAD_OF * m.size && !e.host.has(m.id) && !run.some((d) => e.host.has(d.id)) && distToPolyline(e.at, m.ink) <= reach);
  };
  const out: DashedLine[] = [];
  const queue = [...rows];
  while (queue.length) {
    const r = queue.pop()!;
    const { parts } = clear(r, strokes, crossing, heads);
    if (parts.length === 1 && parts[0].length === r.length) {
      out.push(lineOf(r));
      continue;
    }
    for (const p of parts) queue.push(...kept(p));
  }
  return out.sort((a, b) => a.from.y - b.from.y || a.from.x - b.from.x || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
}

/**
 * What sits at each end of a dashed line — heads.ts's reading, asked on a
 * scratch board where the line is one straight stroke from `from` to `to`
 * and each small mark near an end is drawn again as it stands (a chevron the
 * letter rules gathered into a word with the last dash is its own stroke
 * there). `start` is the `from` end, `end` the `to` end; the ids in each
 * head are the board's own. Reads the session and changes nothing in it.
 */
export function dashedHeads(state: SessionState, line: DashedLine, scopeIds?: readonly string[]): { start: ConnectorEnd; end: ConnectorEnd } {
  const { strokes } = strokesOf(state, scopeIds);
  const mine = new Set(line.ids);
  const scale = median(strokes.filter((s) => mine.has(s.id)).map((s) => s.scale)) || 1;
  const scratch = createSession();
  // The line goes on through the gap a hand leaves before its head, as far as its own gaps: the head's point is then its end.
  const past = Math.max(line.gap, 0);
  const a = { x: line.from.x - line.axis.x * past, y: line.from.y - line.axis.y * past };
  const b = { x: line.to.x + line.axis.x * past, y: line.to.y + line.axis.y * past };
  const n = Math.max(12, Math.round((line.length + 2 * past) / (3 * scale)));
  const pts: Point[] = [];
  for (let k = 0; k <= n; k++) pts.push({ x: a.x + ((b.x - a.x) * k) / n, y: a.y + ((b.y - a.y) * k) / n });
  let t = 1;
  const id = scratch.addStroke(pts, t, undefined, scale, { content: true });
  const back = new Map<string, string>([[id, id]]);
  const most = HEAD_MAX_SHARE * line.length;
  for (const s of strokes) {
    if (mine.has(s.id) || s.size > most) continue;
    const reach = magnetRadius(s.size, s.scale) * 1.5;
    const off = (e: Point) => Math.hypot(Math.max(0, s.bounds.minX - e.x, e.x - s.bounds.maxX), Math.max(0, s.bounds.minY - e.y, e.y - s.bounds.maxY));
    if (off(a) > reach && off(b) > reach) continue;
    back.set(scratch.addStroke(s.ink.map((p) => ({ x: p.x, y: p.y })), (t += 10_000), undefined, s.scale, { content: true }), s.id);
  }
  const h = headsOf(scratch.getState(), id);
  const said = (e: ConnectorEnd | undefined, end: 'start' | 'end', at: Point): ConnectorEnd => {
    if (!e) return { end, point: { ...at }, heads: [], reason: `a plain ${end}: nothing sits there` };
    const heads = e.heads
      .filter((x) => x.ids.every((k) => back.has(k)))
      .map((x) => ({ ...x, ids: x.ids.filter((k) => k !== id).map((k) => back.get(k)!), tip: { ...x.tip } }));
    return { end, point: { ...e.point }, heads, reason: e.reason };
  };
  return { start: said(h?.start, 'start', a), end: said(h?.end, 'end', b) };
}
