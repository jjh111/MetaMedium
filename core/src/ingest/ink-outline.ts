// Outline to centerline (V1-SPEC IN1): a pen stroke stored as the shape its tip swept comes back as the line it
// followed.
//
// Every source of ink on John's machine stores a stroke this way — OneNote's PDFs, the Wacom Inkspace SVGs, a
// whiteboard export, Illustrator's brushes — as a FILL in the stroke's colour, never a stroked line. One method
// brings the strokes back from all of them, in two parts, and a number decides between them:
//
//   1. **Ribbon pairing, the fast path.** A pen leaves a ring with two ends. The ring is walked at equal steps and
//      its turning is measured over a window of `CAP_WINDOW` pen widths: a cap turns by half a revolution inside
//      it, a bend of the pen's own path by less. The two sharpest turns, at least a quarter of the ring apart, are
//      the caps; the ring is cut there into its two sides, the sides are walked to one count of points, and the
//      pairs are averaged. Where more than two places turn that sharply (a pen that doubled back, as an arrow's head
//      does) each pairing is tried and fidelity chooses. A ring and the hole inside it (a loop the pen closed) are
//      paired with each other the same way. A round cap's apex stands half a pen beyond the line the pen followed,
//      so the line runs half a pen long at each such end.
//   2. **The skeleton, where a ring will not pair.** A stroke that crosses itself, forks, or was merged with another
//      has no two sides. The fill is drawn as pixels, thinned, and walked into lines by `image/trace.ts`'s own
//      thinning and straightest-branch walk, then mapped back, simplified and given the density of ink.
//
// FIDELITY decides. For the line a method gave, *recall* is the share of the fill's area within half a pen width
// (and a pixel) of it and *precision* the share of its length inside the fill (and a pixel); it is *faithful* when
// both reach `FAITHFUL_AT`. The ribbon is tried first and stands if it is faithful; otherwise the skeleton is
// tried too and the better of the two stands by the lesser of its two numbers, the ribbon on a tie. The numbers
// are kept with the answer, so a bench can say how much of a source came back and a surface can say what it doubts.
//
// THE FILL, NOT THE SUBPATH: what is read is the region the rings and the rule make — a hole is a hole by the
// rule, and rings that bound separate pieces are separate outlines. Each piece is one outline and gives one
// recovery.
//
// Read, not trusted (DATA-1): a ring that is not points, a point that is not a number, a fill with nothing in it
// are left out. Nothing throws; an outline that cannot be read is `failed`, with the reason.

import type { Point } from '../types';
import type { Fidelity, Recovery } from './source';
import { simplifyStroke } from '../geometry';
import { thin, tracePaths, densify, DENSIFY_STEP_PX } from '../image/trace';
import {
  type FillRule, type Unit, unitsOf, signedArea, perimeter, boundsOfRing, resampleClosed, resampleOpen, pathLength,
} from './ring';
import { FAITHFUL_AT, MAX_RASTER_PX, rasterise, measure, fromRaster, type Raster } from './fill';

export { FAITHFUL_AT, NEAR_AT } from './fill';
export type { FillRule } from './ring';

export interface Fill {
  rings: Point[][];
  rule: FillRule;
}

export interface RecoveredStroke {
  points: Point[];
  closed: boolean;
  recovery: Recovery;
}

export interface Attempt {
  method: 'ribbon' | 'skeleton';
  recall: number;
  precision: number;
}

export interface OutlineRecovery {
  /**
   * A *pen* stroke gives its line; a *dot* is a pen's tap, too small to be a shape, and gives a point; a *blob* is a
   * solid shape no pen made (a filled box), and gives its edge as it is; *failed* is an outline this could not read.
   */
  kind: 'pen' | 'dot' | 'blob' | 'failed';
  strokes: RecoveredStroke[];
  /** The pen's mean width in the fill's units: twice its area over its perimeter. */
  width: number;
  /** For a pen: the method that stood and how faithfully it stands for the fill. */
  method?: 'ribbon' | 'skeleton';
  fidelity?: Fidelity;
  /** What each method came to, in the order tried. */
  tried: Attempt[];
  notes: string[];
}

export interface RecoverOptions {
  /**
   * Raster pixels left to spend across a whole file. Every raster this makes is taken from it; with none left an
   * outline keeps its ribbon, unmeasured, and says so.
   */
  work?: { rasterPx: number };
}

/** The pen's width in raster pixels: wide enough to thin, narrow enough to be cheap. */
export const RASTER_PEN_PX = 5;
/** A solid mark this small is a dot, whatever its shape. About the shape rung's own resolution. */
export const DOT_MAX_PX = 12;
/** Length over width below which a mark is not a stroke: a disc is 1.1, a square 2, a short dash 3. */
export const PEN_ELONGATION = 3;
/** The window, in pen widths, over which a ring's turning is measured: a cap turns round inside it. */
export const CAP_WINDOW = 1.8;
/** The least turning, in radians, over that window that can be a cap (a cap turns by half a revolution). */
export const CAP_TURN = 2.2;
/** How many ends are looked at, and how many pairings of them are tried, before the skeleton. */
export const MAX_CAP_CANDIDATES = 6;
export const MAX_CAP_PAIRS = 8;
/** The most points a ring is walked to. */
const MAX_WALK = 8000;
/** A raster bigger than this is thinned once: drawing it again at other offsets costs more than it is likely to find. */
const RETRY_MAX_PX = 400_000;
/** A thinned branch shorter than this many pen widths is junction debris, not a stroke. */
const SCRAP_OF_WIDTH = 1.5;
/** The scales, as multiples of the first, a fill is thinned at until a skeleton stands for it. */
const SKELETON_SCALES: { mul: number; x: number; y: number }[] = [{ mul: 1, x: 0, y: 0 }, { mul: 1, x: 0.5, y: 0.25 }, { mul: 1.31, x: 0.25, y: 0.75 }, { mul: 0.79, x: 0.75, y: 0.5 }];

const TAU = Math.PI * 2;
const wrapPi = (a: number) => {
  let x = a % TAU;
  if (x > Math.PI) x -= TAU;
  else if (x < -Math.PI) x += TAU;
  return x;
};
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** The spacing ink is given: a pixel or two, finer for a hairline pen. */
export const inkStep = (width: number) => Math.min(DENSIFY_STEP_PX, Math.max(0.5, width));
/** The most points one stroke is given: a line a hundred thousand pixels long is sampled more coarsely, not asked for a million points. */
export const MAX_STROKE_POINTS = 20_000;
/** The spacing for a line of `len` that keeps it to `MAX_STROKE_POINTS`. */
export const stepFor = (len: number, step: number) => Math.max(step, len / MAX_STROKE_POINTS);

export function recoverFill(fill: Fill, opts: RecoverOptions = {}): OutlineRecovery[] {
  try {
    if (!fill || typeof fill !== 'object' || !Array.isArray(fill.rings)) return [];
    const rule: FillRule = fill.rule === 'evenodd' ? 'evenodd' : 'nonzero';
    const { units } = unitsOf(fill.rings, rule);
    const out: OutlineRecovery[] = [];
    for (const u of units) {
      try {
        out.push(recoverUnit(u, rule, opts));
      } catch (err) {
        out.push({ kind: 'failed', strokes: [], width: 0, tried: [], notes: ['an outline could not be read: ' + (err instanceof Error ? err.message : String(err))] });
      }
    }
    return out;
  } catch {
    return [];
  }
}

function recoverUnit(u: Unit, rule: FillRule, opts: RecoverOptions): OutlineRecovery {
  const rings = [u.outer, ...u.holes];
  let area = Math.abs(signedArea(u.outer));
  let perim = perimeter(u.outer);
  for (const h of u.holes) { area -= Math.abs(signedArea(h)); perim += perimeter(h); }
  if (!(area > 0) || !(perim > 0)) return { kind: 'failed', strokes: [], width: 0, tried: [], notes: ['an outline encloses nothing'] };
  const w = (2 * area) / perim;
  const box = boundsOfRing(u.outer);
  const size = Math.max(box.maxX - box.minX, box.maxY - box.minY);
  const elongation = perim / (2 * w) - 2;
  const step = inkStep(w);

  if (elongation < PEN_ELONGATION) {
    if (size <= DOT_MAX_PX) return dotOf(u, w);
    return { kind: 'blob', strokes: edgesOf(rings, step), width: 0, tried: [], notes: [] };
  }

  const notes: string[] = [];
  const tried: Attempt[] = [];
  const scale = clamp(RASTER_PEN_PX / w, 0.02, 60);
  const work = opts.work;
  const charge = (px: number) => {
    if (!work) return true;
    if (work.rasterPx < px) return false;
    work.rasterPx -= px;
    return true;
  };
  const estimatePx = (Math.max(1, box.maxX - box.minX) * scale + 4) * (Math.max(1, box.maxY - box.minY) * scale + 4);

  const candidates = ribbonCandidates(u, w);
  if (!charge(Math.min(estimatePx, MAX_RASTER_PX))) {
    // Out of work: keep the first ribbon unmeasured, or nothing.
    const first = candidates[0];
    if (!first) return { kind: 'failed', strokes: [], width: w, tried, notes: ['the work on this file ran out before this outline was read'] };
    notes.push('the work on this file ran out; this outline is a ribbon that was not measured');
    return { kind: 'pen', strokes: [strokeOf(first.points, first.closed, 'ribbon', w, step)], width: w, method: 'ribbon', tried, notes };
  }
  const raster = rasterise(rings, rule, scale);
  if (!raster || raster.filled === 0) return { kind: 'failed', strokes: [], width: w, tried, notes: ['an outline has no area at this size'] };

  // The ribbon: of every pairing of its ends, the one that stands for the fill best.
  let best: { cand: Candidate; m: { recall: number; precision: number } } | null = null;
  for (const cand of candidates) {
    const m = measure(raster, [cand.closed ? [...cand.points, cand.points[0]] : cand.points], w);
    if (!best || Math.min(m.recall, m.precision) > Math.min(best.m.recall, best.m.precision)) best = { cand, m };
  }
  if (best) tried.push({ method: 'ribbon', recall: best.m.recall, precision: best.m.precision });
  if (best && Math.min(best.m.recall, best.m.precision) >= FAITHFUL_AT) {
    return penResult(best.cand, 'ribbon', best.m, w, step, tried, notes);
  }

  // The skeleton: the fill thinned and walked. Zhang–Suen thinning can leave a diagonal of even width two pixels
  // wide, or lose a diagonal branch altogether, and which it does depends on the pixels the fill happens to land
  // on — so where the first drawing does not stand for the fill, it is drawn again at another scale.
  let skel: Candidate[] | null = null;
  let skelM: { recall: number; precision: number } | null = null;
  const tries = raster.width * raster.height > RETRY_MAX_PX ? SKELETON_SCALES.slice(0, 1) : SKELETON_SCALES;
  for (const { mul, x, y } of tries) {
    let r = raster;
    if (mul !== 1 || x !== 0 || y !== 0) {
      if (!charge(raster.width * raster.height * mul * mul)) break;
      const again = rasterise(rings, rule, raster.scale * mul, 2, { x, y });
      if (!again || again.filled === 0) continue;
      r = again;
    } else if (!charge(raster.width * raster.height)) {
      notes.push('the work on this file ran out before this outline could be thinned');
      break;
    }
    const lines = skeletonLines(r, w, step);
    if (!lines.length) continue;
    const m = measure(r, lines.map((c) => (c.closed ? [...c.points, c.points[0]] : c.points)), w);
    if (!skelM || Math.min(m.recall, m.precision) > Math.min(skelM.recall, skelM.precision)) { skel = lines; skelM = m; }
    if (Math.min(m.recall, m.precision) >= FAITHFUL_AT) break;
  }
  if (skelM) tried.push({ method: 'skeleton', recall: skelM.recall, precision: skelM.precision });
  const ribbonScore = best ? Math.min(best.m.recall, best.m.precision) : -1;
  const skelScore = skelM ? Math.min(skelM.recall, skelM.precision) : -1;
  if (skel && skelM && skelScore > ribbonScore + 1e-9) {
    return {
      kind: 'pen',
      strokes: skel.map((c) => strokeOf(c.points, c.closed, 'skeleton', w, step)),
      width: w,
      method: 'skeleton',
      fidelity: fidelityOf(skelM),
      tried,
      notes,
    };
  }
  if (best) return penResult(best.cand, 'ribbon', best.m, w, step, tried, notes);
  if (skel && skelM) {
    return { kind: 'pen', strokes: skel.map((c) => strokeOf(c.points, c.closed, 'skeleton', w, step)), width: w, method: 'skeleton', fidelity: fidelityOf(skelM), tried, notes };
  }
  return { kind: 'failed', strokes: [], width: w, tried, notes: [...notes, 'no line could be found for an outline'] };
}

const fidelityOf = (m: { recall: number; precision: number }): Fidelity => ({
  recall: m.recall,
  precision: m.precision,
  faithful: m.recall >= FAITHFUL_AT && m.precision >= FAITHFUL_AT,
});

function penResult(cand: Candidate, method: 'ribbon' | 'skeleton', m: { recall: number; precision: number }, w: number, step: number, tried: Attempt[], notes: string[]): OutlineRecovery {
  return { kind: 'pen', strokes: [strokeOf(cand.points, cand.closed, method, w, step)], width: w, method, fidelity: fidelityOf(m), tried, notes };
}

// ---- what a line is given on the way out ---------------------------------------------------------------

interface Candidate {
  points: Point[];
  closed: boolean;
}

/** A recovered line at ink spacing, closed when it ends where it began. */
function strokeOf(points: Point[], closed: boolean, recovery: Recovery, w: number, step: number): RecoveredStroke {
  const len = pathLength(points) + (closed ? Math.hypot(points[0].x - points[points.length - 1].x, points[0].y - points[points.length - 1].y) : 0);
  const n = Math.max(2, Math.round(len / stepFor(len, step)) + 1);
  let out: Point[];
  if (closed) {
    out = resampleClosed(points, Math.max(3, n - 1));
    out.push({ x: out[0].x, y: out[0].y });
  } else {
    out = resampleOpen(points, n);
  }
  const first = out[0], last = out[out.length - 1];
  const looped = closed || (out.length >= 8 && Math.hypot(first.x - last.x, first.y - last.y) <= Math.max(w, 1e-6) && len >= 4 * w);
  return { points: out, closed: looped, recovery };
}

function dotOf(u: Unit, w: number): OutlineRecovery {
  let a = 0, cx = 0, cy = 0;
  const r = u.outer;
  for (let i = 0, n = r.length; i < n; i++) {
    const p = r[i], q = r[i + 1 === n ? 0 : i + 1];
    const f = p.x * q.y - q.x * p.y;
    a += f; cx += (p.x + q.x) * f; cy += (p.y + q.y) * f;
  }
  const b = boundsOfRing(r);
  const c = Math.abs(a) > 1e-12 ? { x: cx / (3 * a), y: cy / (3 * a) } : { x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 };
  const horizontal = b.maxX - b.minX >= b.maxY - b.minY;
  const h = Math.max(0.1, Math.abs(b.maxX - b.minX - (b.maxY - b.minY)) / 2);
  const points = horizontal
    ? [{ x: c.x - h, y: c.y }, c, { x: c.x + h, y: c.y }]
    : [{ x: c.x, y: c.y - h }, c, { x: c.x, y: c.y + h }];
  return { kind: 'dot', strokes: [{ points, closed: false, recovery: 'ribbon' }], width: w, method: 'ribbon', fidelity: { recall: 1, precision: 1, faithful: true }, tried: [], notes: [] };
}

/** A solid shape's edges as they were drawn, each ring a closed line at ink spacing. */
function edgesOf(rings: Point[][], step: number): RecoveredStroke[] {
  return rings.map((ring) => {
    const closedRing = [...ring, ring[0]];
    const simple = simplifyStroke(closedRing, 0.25);
    const dense = densify(simple, stepFor(perimeter(ring), Math.max(step, 1)));
    return { points: dense, closed: true, recovery: 'stroke' as Recovery };
  });
}

// ---- ribbon pairing -------------------------------------------------------------------------------------

function ribbonCandidates(u: Unit, w: number): Candidate[] {
  if (u.holes.length === 0) return openRibbons(u.outer, w);
  if (u.holes.length === 1) {
    const c = closedRibbon(u.outer, u.holes[0], w);
    return c ? [c] : [];
  }
  return [];
}

interface End {
  index: number;
  turn: number;
}

/** The ends of the pen in a ring walked at `N` points: the places it turns by about half a revolution inside a window of a pen's width and a bit. */
function endsOf(pts: Point[], w: number, s: number): End[] {
  const N = pts.length;
  const m = Math.max(1, Math.round((0.2 * w) / s));
  const k = Math.max(2, Math.round((CAP_WINDOW * w) / (2 * s)));
  const heading = new Float64Array(N);
  for (let j = 0; j < N; j++) {
    const a = pts[(j - m + N) % N], b = pts[(j + m) % N];
    heading[j] = Math.atan2(b.y - a.y, b.x - a.x);
  }
  const turn = new Float64Array(N);
  for (let i = 0; i < N; i++) turn[i] = Math.abs(wrapPi(heading[(i + k) % N] - heading[(i - k + N) % N]));
  // Runs of indices that turn enough; each run is one end, placed at the middle of its sharpest stretch.
  const ends: End[] = [];
  const inRun = (i: number) => turn[((i % N) + N) % N] >= CAP_TURN;
  let start = -1;
  for (let i = 0; i < N; i++) if (!inRun(i)) { start = i; break; }
  if (start < 0) return [];
  let i = start + 1;
  while (i < start + N) {
    if (!inRun(i)) { i++; continue; }
    const i0 = i;
    while (i < start + N && inRun(i)) i++;
    const i1 = i - 1;
    let peak = 0;
    for (let q = i0; q <= i1; q++) peak = Math.max(peak, turn[((q % N) + N) % N]);
    let a = -1, b = -1;
    for (let q = i0; q <= i1; q++) {
      if (turn[((q % N) + N) % N] >= peak - 0.05) { if (a < 0) a = q; b = q; }
    }
    ends.push({ index: (((Math.round((a + b) / 2)) % N) + N) % N, turn: peak });
  }
  ends.sort((p, q) => q.turn - p.turn);
  return ends.slice(0, MAX_CAP_CANDIDATES);
}

const circDist = (a: number, b: number, N: number) => {
  const d = Math.abs(a - b) % N;
  return Math.min(d, N - d);
};

function openRibbons(ring: Point[], w: number): Candidate[] {
  const len = perimeter(ring);
  const s = Math.max(w / 4, len / MAX_WALK);
  const N = Math.max(24, Math.round(len / s));
  const pts = resampleClosed(ring, N);
  if (pts.length < 24) return [];
  const ends = endsOf(pts, w, s);
  if (ends.length < 2) return [];
  const pairs: { a: number; b: number; score: number }[] = [];
  for (let i = 0; i < ends.length; i++) {
    for (let j = i + 1; j < ends.length; j++) {
      if (circDist(ends[i].index, ends[j].index, N) < N / 4) continue;
      pairs.push({ a: ends[i].index, b: ends[j].index, score: ends[i].turn + ends[j].turn });
    }
  }
  pairs.sort((p, q) => q.score - p.score);
  const out: Candidate[] = [];
  for (const pr of pairs.slice(0, MAX_CAP_PAIRS)) {
    const line = pairSides(pts, pr.a, pr.b, s);
    if (line) out.push({ points: line, closed: false });
  }
  return out;
}

/** The ring cut at two ends into its two sides, walked to one count and averaged. */
function pairSides(pts: Point[], i: number, j: number, s: number): Point[] | null {
  const N = pts.length;
  const chain = (from: number, to: number): Point[] => {
    const out: Point[] = [];
    for (let k = from; ; k = (k + 1) % N) {
      out.push(pts[k]);
      if (k === to) break;
      if (out.length > N + 1) return [];
    }
    return out;
  };
  const a = chain(i, j);
  const b = chain(j, i).reverse();
  if (a.length < 2 || b.length < 2) return null;
  const M = Math.max(8, Math.round(Math.max(pathLength(a), pathLength(b)) / s));
  const ra = resampleOpen(a, M), rb = resampleOpen(b, M);
  const mid: Point[] = [];
  for (let k = 0; k < M; k++) mid.push({ x: (ra[k].x + rb[k].x) / 2, y: (ra[k].y + rb[k].y) / 2 });
  return mid;
}

/** A ring and the hole inside it, paired point for point into one closed line between them. */
function closedRibbon(outer: Point[], hole: Point[], w: number): Candidate | null {
  const lenO = perimeter(outer), lenH = perimeter(hole);
  const s = Math.max(w / 4, Math.max(lenO, lenH) / MAX_WALK);
  const M = clamp(Math.round(Math.max(lenO, lenH) / s), 24, MAX_WALK);
  const A = resampleClosed(outer, M);
  const B0 = resampleClosed(hole, M);
  if (A.length < 24 || B0.length < 24) return null;
  let bestCost = Infinity, bestB: Point[] | null = null;
  for (const B of [B0, B0.slice().reverse()]) {
    // The start of the hole that sits nearest the start of the ring, and a little round it.
    let near = 0, nd = Infinity;
    for (let k = 0; k < M; k++) {
      const d = Math.hypot(B[k].x - A[0].x, B[k].y - A[0].y);
      if (d < nd) { nd = d; near = k; }
    }
    const span = Math.max(3, Math.round(M / 20));
    for (let r = -span; r <= span; r++) {
      let cost = 0;
      for (let k = 0; k < M; k += 2) {
        const q = B[(((near + r + k) % M) + M) % M];
        cost += Math.hypot(A[k].x - q.x, A[k].y - q.y);
      }
      if (cost < bestCost) {
        bestCost = cost;
        bestB = Array.from({ length: M }, (_, k) => B[(((near + r + k) % M) + M) % M]);
      }
    }
  }
  if (!bestB) return null;
  const mid = A.map((p, k) => ({ x: (p.x + bestB![k].x) / 2, y: (p.y + bestB![k].y) / 2 }));
  return { points: mid, closed: true };
}

// ---- the skeleton ---------------------------------------------------------------------------------------

const N8: [number, number][] = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];

/** A thinned stroke with its end spurs cut and its true ends grown back (opening by endpoints, then conditional dilation). */
function prune(skel: Uint8Array, W: number, H: number, k: number): Uint8Array {
  const nb = (a: Uint8Array, x: number, y: number) => {
    let n = 0;
    for (const [dx, dy] of N8) {
      const xx = x + dx, yy = y + dy;
      if (xx >= 0 && yy >= 0 && xx < W && yy < H && a[yy * W + xx]) n++;
    }
    return n;
  };
  const cur = skel.slice();
  for (let it = 0; it < k; it++) {
    const ends: number[] = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (cur[y * W + x] && nb(cur, x, y) <= 1) ends.push(y * W + x);
    if (!ends.length) break;
    for (const e of ends) cur[e] = 0;
  }
  let left = 0;
  for (let i = 0; i < cur.length; i++) left += cur[i];
  if (left === 0) return skel;
  // Grow back from what are now the ends, along the original skeleton only.
  let front: number[] = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (cur[y * W + x] && nb(cur, x, y) <= 1) front.push(y * W + x);
  const out = cur.slice();
  for (let it = 0; it < k && front.length; it++) {
    const next: number[] = [];
    for (const e of front) {
      const x = e % W, y = (e / W) | 0;
      for (const [dx, dy] of N8) {
        const xx = x + dx, yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= W || yy >= H) continue;
        const i = yy * W + xx;
        if (skel[i] && !out[i]) { out[i] = 1; next.push(i); }
      }
    }
    front = next;
  }
  return out;
}

function skeletonLines(raster: Raster, w: number, step: number): Candidate[] {
  const wpx = w * raster.scale;
  const skel = prune(thin(raster.data, raster.width, raster.height), raster.width, raster.height, clamp(Math.ceil(0.6 * wpx), 2, 6));
  const paths = tracePaths(skel, raster.width, raster.height);
  const minPx = Math.max(2, SCRAP_OF_WIDTH * wpx);
  const tol = 0.6 / raster.scale;
  const out: Candidate[] = [];
  const longest = paths.reduce((m, p) => Math.max(m, p.points.length), 0);
  for (const p of paths) {
    // A branch shorter than a pen and a half is a scrap of the thinning, unless it is all there is.
    if (p.points.length < minPx && longest >= minPx) continue;
    if (p.points.length < 2) continue;
    const page = p.points.map((q) => fromRaster(raster, q.x, q.y));
    let pts = simplifyStroke(page, tol);
    if (p.closed) pts = pts.concat([{ x: pts[0].x, y: pts[0].y }]);
    pts = densify(pts, stepFor(pathLength(pts), step));
    if (pts.length < 2) continue;
    out.push({ points: p.closed ? pts.slice(0, -1) : pts, closed: p.closed });
  }
  return out;
}
