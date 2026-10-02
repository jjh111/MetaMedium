// ===== diff =====
// THE DIFF IS THE BRIEF (SHARD-3D-PLAN §4).
//
// A solid claims to be what was drawn. This module checks the claim: the
// profile's ink and the solid's own silhouette, both on one plane, rasterised
// at one resolution and subtracted from each other.
//
//     missing = ink & !silhouette   — material the drawing wants and the solid lacks
//     extra   = silhouette & !ink   — material the solid has and the drawing does not
//
// That is `validateRegions` generalised (`metamedium-core/src/parse/scaffold.ts`):
// the promise that the thing matches the drawing is CHECKED, not assumed. There
// the promise was "every region id the layout named appears once in the code";
// here it is "every square unit the drawing asked for is in the body", and the
// answer is regions with areas rather than ids with counts.
//
// PURE. No three.js: the silhouette arrives as outlines or as a mask, the ink
// as points in the same plane's own (u, v), and everything below is arithmetic
// on a grid. `silhouette.ts` is the half that needs a renderer; this half is
// the half that can be tested, and it is where every threshold lives.
//
// The one thing borrowed is core's `trace`: a region's outline is its boundary
// pixels walked into a path, which is exactly the job `image/trace.ts` already
// does for a photographed sketch.

import { trace, type Bitmap, type Point } from 'metamedium-core';
import type { Bounds2 } from './planarity';

// ---- the thresholds, every one named ---------------------------------------

/** How many pixels the longer side of the diff's grid gets. */
export const DIFF_PX = 192;
/**
 * A component smaller than this fraction of the PROFILE's own area is noise —
 * a ragged pixel where the ink and the silhouette disagree along a shared edge,
 * not a piece of the thing. A ratio of the drawing's own size (invariant 8),
 * and the sentence says how many were dropped rather than hiding them.
 */
export const NOISE_FRACTION = 0.012;
/**
 * How far a region's OUTLINE is grown past the pixels it was measured on,
 * in grid pixels — and it is only ever grown WHERE GROWING IT CANNOT CHANGE
 * THE ANSWER.
 *
 * A missing region abuts the body exactly — it is defined as what the body is
 * not — so a prism built on its raw boundary has a face coplanar with a face of
 * the body, which is the classic way to make a boolean library produce a hole
 * with a skin over it (the shard learned this once already, in `TOOL_OVERLAP`).
 * So the tool is grown into the body, where the overlap is welded away and
 * nothing can come of it.
 *
 * Grown in every direction instead, as the first version did, it oversteps the
 * hand's own outline: *Add it* then left a rim of material the drawing had not
 * asked for, and the row that was supposed to read *nothing missing, nothing
 * extra* came back *extra 1 region (0.15 u²) at the right* — the diff catching
 * the diff's own tool, which is at least the machinery working. A missing
 * region may therefore grow only into the silhouette, and an extra region only
 * away from the ink.
 *
 * The AREA is measured before any of this; only the tool is grown.
 */
export const REGION_DILATE = 2;
/** The IoU a profile's outline must reach against a solid's silhouette to be a profile OF it. */
export const PROFILE_OVERLAP = 0.15;
/** …or one is inside the other by this much, which covers a profile far bigger or far smaller than the body. */
export const PROFILE_CONTAINS = 0.85;

// ---- the grid ---------------------------------------------------------------

/** A rectangle of plane space, cut into pixels. Both masks in a diff share one. */
export interface Grid {
  bounds: Bounds2;
  width: number;
  height: number;
  /** Plane units per pixel, along u and along v. */
  pxU: number;
  pxV: number;
}

/** A grid's own pixel area, in plane units². */
export const pixelArea = (g: Grid): number => g.pxU * g.pxV;

export function boundsOf(points: Point[]): Bounds2 {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY };
}

export function unionBounds(a: Bounds2, b: Bounds2): Bounds2 {
  return {
    minX: Math.min(a.minX, b.minX),
    minY: Math.min(a.minY, b.minY),
    maxX: Math.max(a.maxX, b.maxX),
    maxY: Math.max(a.maxY, b.maxY),
  };
}

/** The bounds grown by a fraction of their own size, so nothing sits on the edge of the grid. */
export function padBounds(b: Bounds2, fraction = 0.04): Bounds2 {
  const w = Math.max(b.maxX - b.minX, 1e-6);
  const h = Math.max(b.maxY - b.minY, 1e-6);
  const p = Math.max(w, h) * fraction;
  return { minX: b.minX - p, minY: b.minY - p, maxX: b.maxX + p, maxY: b.maxY + p };
}

/**
 * A grid over a rectangle of plane space, `resolution` pixels across its longer
 * side, so a tall thing and a wide one are read at the same fineness in plane
 * units rather than at the same pixel count.
 */
export function gridFor(bounds: Bounds2, resolution = DIFF_PX): Grid {
  const w = Math.max(bounds.maxX - bounds.minX, 1e-6);
  const h = Math.max(bounds.maxY - bounds.minY, 1e-6);
  const long = Math.max(w, h);
  const width = Math.max(2, Math.round((w / long) * resolution));
  const height = Math.max(2, Math.round((h / long) * resolution));
  return { bounds, width, height, pxU: w / width, pxV: h / height };
}

/** The plane point a pixel's centre stands at. */
export function pointAt(g: Grid, px: number, py: number): Point {
  return { x: g.bounds.minX + (px + 0.5) * g.pxU, y: g.bounds.minY + (py + 0.5) * g.pxV };
}

// ---- rasterising ------------------------------------------------------------

/**
 * A closed outline filled into the grid, by scanline with the even–odd rule.
 *
 * Even–odd rather than winding, because a hand's outline has no reliable
 * direction and a traced silhouette's loops (an outer boundary and the boundary
 * of a hole) come back in whatever order the walk found them — under even–odd
 * a ring inside a ring is a hole, which is exactly what a cut body's silhouette
 * is, and under winding it might be a second wall.
 */
export function rasterise(outlines: Point[][], g: Grid): Uint8Array {
  const mask = new Uint8Array(g.width * g.height);
  const edges: { x0: number; y0: number; x1: number; y1: number }[] = [];
  for (const outline of outlines) {
    if (outline.length < 3) continue;
    for (let i = 0; i < outline.length; i++) {
      const a = outline[i];
      const b = outline[(i + 1) % outline.length]; // closed, whether or not it was said so
      if (a.y === b.y) continue; // a horizontal edge crosses no scanline
      edges.push({ x0: a.x, y0: a.y, x1: b.x, y1: b.y });
    }
  }
  if (!edges.length) return mask;
  const xs: number[] = [];
  for (let py = 0; py < g.height; py++) {
    const y = g.bounds.minY + (py + 0.5) * g.pxV;
    xs.length = 0;
    for (const e of edges) {
      const lo = Math.min(e.y0, e.y1);
      const hi = Math.max(e.y0, e.y1);
      if (y < lo || y >= hi) continue;
      xs.push(e.x0 + ((y - e.y0) / (e.y1 - e.y0)) * (e.x1 - e.x0));
    }
    if (xs.length < 2) continue;
    xs.sort((a, b) => a - b);
    for (let i = 0; i + 1 < xs.length; i += 2) {
      const from = Math.max(0, Math.ceil((xs[i] - g.bounds.minX) / g.pxU - 0.5));
      const to = Math.min(g.width - 1, Math.floor((xs[i + 1] - g.bounds.minX) / g.pxU - 0.5));
      for (let px = from; px <= to; px++) mask[py * g.width + px] = 1;
    }
  }
  return mask;
}

/** A mask taken from one grid onto another, nearest pixel. */
export function resample(mask: Uint8Array, from: Grid, to: Grid): Uint8Array {
  const out = new Uint8Array(to.width * to.height);
  for (let py = 0; py < to.height; py++) {
    for (let px = 0; px < to.width; px++) {
      const p = pointAt(to, px, py);
      const sx = Math.floor((p.x - from.bounds.minX) / from.pxU);
      const sy = Math.floor((p.y - from.bounds.minY) / from.pxV);
      if (sx < 0 || sy < 0 || sx >= from.width || sy >= from.height) continue;
      out[py * to.width + px] = mask[sy * from.width + sx];
    }
  }
  return out;
}

/** A mask grown by `r` pixels in the four directions — the tool, never the measurement. */
export function dilate(mask: Uint8Array, w: number, h: number, r: number): Uint8Array {
  let src = mask;
  for (let pass = 0; pass < r; pass++) {
    const out = new Uint8Array(src.length);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (src[i]) { out[i] = 1; continue; }
        if (
          (x > 0 && src[i - 1]) ||
          (x < w - 1 && src[i + 1]) ||
          (y > 0 && src[i - w]) ||
          (y < h - 1 && src[i + w])
        ) out[i] = 1;
      }
    }
    src = out;
  }
  return src;
}

/** The pixels of a mask that have a neighbour outside it — its own one-pixel boundary. */
export function boundaryOf(mask: Uint8Array, w: number, h: number): Uint8Array {
  const out = new Uint8Array(mask.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x;
      if (!mask[i]) continue;
      const edge =
        x === 0 || y === 0 || x === w - 1 || y === h - 1 ||
        !mask[i - 1] || !mask[i + 1] || !mask[i - w] || !mask[i + w];
      if (edge) out[i] = 1;
    }
  }
  return out;
}

/**
 * A mask's own outline, in plane units — core's `trace`, on the boundary.
 *
 * `trace` thins and walks a bitmap into paths, so it is handed the boundary
 * pixels (already one deep) rather than the filled blob: thinning a filled
 * rectangle gives its medial axis, which is a spine and not an outline. Found
 * by handing it the silhouette straight.
 */
export function outlineOfMask(mask: Uint8Array, g: Grid): Point[][] {
  const edge = boundaryOf(mask, g.width, g.height);
  const data = new Uint8Array(g.width * g.height * 4);
  for (let i = 0; i < edge.length; i++) {
    const v = edge[i] ? 255 : 0;
    data[i * 4] = v;
    data[i * 4 + 1] = v;
    data[i * 4 + 2] = v;
    data[i * 4 + 3] = 255;
  }
  const bitmap: Bitmap = { width: g.width, height: g.height, data };
  // A region may be a dozen pixels across, so the defaults (8px minimum, 1.5px
  // simplify) would drop it; the tolerances are a fraction of the grid, not of
  // a photograph.
  const out = trace(bitmap, { simplifyPx: 0.9, minLengthPx: 3 });
  return out.strokes.map((s) => s.points.map((p) => pointAt(g, p.x, p.y)));
}

// ---- components -------------------------------------------------------------

interface Component {
  mask: Uint8Array;
  pixels: number;
  bounds: { minPx: number; minPy: number; maxPx: number; maxPy: number };
}

/** Every 4-connected island in a mask, largest first. */
export function componentsOf(mask: Uint8Array, w: number, h: number): Component[] {
  const seen = new Uint8Array(mask.length);
  const out: Component[] = [];
  const stack: number[] = [];
  for (let start = 0; start < mask.length; start++) {
    if (!mask[start] || seen[start]) continue;
    const m = new Uint8Array(mask.length);
    let pixels = 0;
    let minPx = w, minPy = h, maxPx = -1, maxPy = -1;
    stack.length = 0;
    stack.push(start);
    seen[start] = 1;
    while (stack.length) {
      const i = stack.pop()!;
      m[i] = 1;
      pixels++;
      const x = i % w;
      const y = (i - x) / w;
      if (x < minPx) minPx = x;
      if (x > maxPx) maxPx = x;
      if (y < minPy) minPy = y;
      if (y > maxPy) maxPy = y;
      if (x > 0 && mask[i - 1] && !seen[i - 1]) { seen[i - 1] = 1; stack.push(i - 1); }
      if (x < w - 1 && mask[i + 1] && !seen[i + 1]) { seen[i + 1] = 1; stack.push(i + 1); }
      if (y > 0 && mask[i - w] && !seen[i - w]) { seen[i - w] = 1; stack.push(i - w); }
      if (y < h - 1 && mask[i + w] && !seen[i + w]) { seen[i + w] = 1; stack.push(i + w); }
    }
    out.push({ mask: m, pixels, bounds: { minPx, minPy, maxPx, maxPy } });
  }
  return out.sort((a, b) => b.pixels - a.pixels);
}

// ---- what the diff says -----------------------------------------------------

/** A piece of the drawing the solid lacks, or a piece of the solid the drawing does not. */
export interface DiffRegion {
  kind: 'missing' | 'extra';
  /** In plane units², measured on the pixels themselves — never on the grown tool. */
  area: number;
  bounds: Bounds2;
  /** The region's own boundary, in plane units — what a prism is built on. Grown by REGION_DILATE. */
  outline: Point[];
  /** Where it sits, in the words a hand uses: *at the right*, *at the top left*. */
  where: string;
}

export interface Diff {
  /** `top` / `front` / `side`, or the plane's own name. */
  view: string;
  /** Intersection over union — how much of the two outlines is the same material. */
  coverage: number;
  missing: DiffRegion[];
  extra: DiffRegion[];
  /** Components thrown away as noise, and the area floor they fell under. */
  dropped: number;
  /** *side · matches 84% · missing 1 region (0.62 u²) at the right · extra none* */
  sentence: string;
  /** Which outline the ink was read from, and why. */
  from: 'clean' | 'ink';
  reasoning: string;
  grid: Grid;
}

/** Where in the drawing a region sits, said in thirds. v runs DOWN, so small v is the top. */
export function whereIn(b: Bounds2, region: Bounds2): string {
  const w = Math.max(b.maxX - b.minX, 1e-6);
  const h = Math.max(b.maxY - b.minY, 1e-6);
  const cx = ((region.minX + region.maxX) / 2 - b.minX) / w;
  const cy = ((region.minY + region.maxY) / 2 - b.minY) / h;
  const across = cx < 0.34 ? 'left' : cx > 0.66 ? 'right' : '';
  const down = cy < 0.34 ? 'top' : cy > 0.66 ? 'bottom' : '';
  const words = [down, across].filter(Boolean).join(' ');
  return words ? `at the ${words}` : 'in the middle';
}

function regionsIn(
  mask: Uint8Array,
  g: Grid,
  kind: 'missing' | 'extra',
  frame: Bounds2,
  floor: number,
  /** Where the tool may be grown into without changing what it means. */
  grow: Uint8Array
): { regions: DiffRegion[]; dropped: number } {
  const px = pixelArea(g);
  const regions: DiffRegion[] = [];
  let dropped = 0;
  for (const c of componentsOf(mask, g.width, g.height)) {
    const area = c.pixels * px;
    if (area < floor) { dropped++; continue; }
    const near = dilate(c.mask, g.width, g.height, REGION_DILATE);
    const grown = new Uint8Array(near.length);
    for (let i = 0; i < near.length; i++) grown[i] = c.mask[i] || (near[i] && grow[i]) ? 1 : 0;
    const traced = outlineOfMask(grown, g);
    const lo = pointAt(g, c.bounds.minPx, c.bounds.minPy);
    const hi = pointAt(g, c.bounds.maxPx, c.bounds.maxPy);
    const bounds: Bounds2 = {
      minX: lo.x - g.pxU / 2, minY: lo.y - g.pxV / 2,
      maxX: hi.x + g.pxU / 2, maxY: hi.y + g.pxV / 2,
    };
    // A region a few pixels across may leave `trace` nothing to walk; its own
    // box is then the honest outline rather than no region at all.
    const outline =
      traced.sort((a, b) => b.length - a.length)[0] ??
      [
        { x: bounds.minX, y: bounds.minY },
        { x: bounds.maxX, y: bounds.minY },
        { x: bounds.maxX, y: bounds.maxY },
        { x: bounds.minX, y: bounds.maxY },
      ];
    regions.push({ kind, area, bounds, outline, where: whereIn(frame, bounds) });
  }
  return { regions: regions.sort((a, b) => b.area - a.area), dropped };
}

export interface DiffInput {
  /** The profile's outline in the plane's own (u, v) — the ink, or its clean form. */
  ink: Point[];
  /** Which of the two it is, and why — said out loud (invariant 2). */
  from: 'clean' | 'ink';
  inkWhy: string;
  /** The solid's silhouette on the same plane: the traced outlines… */
  silhouette?: Point[][];
  /** …or the raw mask it was read off, with the grid it was measured on. */
  silhouetteMask?: { mask: Uint8Array; grid: Grid };
  /** `top` / `front` / `side`, or the plane's own name. */
  view: string;
  resolution?: number;
}

/**
 * The diff, on one plane. Both outlines are rasterised at ONE resolution over
 * the union of what they cover, so a pixel means the same thing on both sides
 * and the subtraction is honest.
 */
export function diffProfile(input: DiffInput): Diff {
  const inkBounds = boundsOf(input.ink);
  const silBounds = input.silhouetteMask
    ? input.silhouetteMask.grid.bounds
    : boundsOf((input.silhouette ?? []).flat());
  const hasSil = !!input.silhouetteMask || !!(input.silhouette && input.silhouette.length);
  const g = gridFor(padBounds(hasSil ? unionBounds(inkBounds, silBounds) : inkBounds), input.resolution ?? DIFF_PX);

  const ink = rasterise([input.ink], g);
  const sil = input.silhouetteMask
    ? resample(input.silhouetteMask.mask, input.silhouetteMask.grid, g)
    : rasterise(input.silhouette ?? [], g);

  const missingMask = new Uint8Array(ink.length);
  const extraMask = new Uint8Array(ink.length);
  let both = 0;
  let either = 0;
  let inkPixels = 0;
  for (let i = 0; i < ink.length; i++) {
    const a = ink[i];
    const b = sil[i];
    if (a) inkPixels++;
    if (a && b) both++;
    if (a || b) either++;
    if (a && !b) missingMask[i] = 1;
    if (b && !a) extraMask[i] = 1;
  }
  const coverage = either ? both / either : 1;
  const floor = inkPixels * pixelArea(g) * NOISE_FRACTION;

  // Where each kind of tool may overlap: a missing region welds INTO the body,
  // an extra region reaches out AWAY from what the drawing asked for. Neither
  // growth can change what the region means, which is the only licence a tool
  // has to be bigger than the measurement it came from.
  const outsideInk = new Uint8Array(ink.length);
  for (let i = 0; i < ink.length; i++) outsideInk[i] = ink[i] ? 0 : 1;
  const m = regionsIn(missingMask, g, 'missing', inkBounds, floor, sil);
  const e = regionsIn(extraMask, g, 'extra', inkBounds, floor, outsideInk);

  const say = (label: string, rs: DiffRegion[]) =>
    rs.length
      ? `${label} ${rs.length} region${rs.length === 1 ? '' : 's'} (${rs
          .map((r) => r.area.toFixed(2))
          .join(' + ')} u²) ${rs[0].where}`
      : `${label} none`;

  const sentence =
    `${input.view} · matches ${(coverage * 100).toFixed(0)}% · ${say('missing', m.regions)} · ${say('extra', e.regions)}` +
    (m.dropped + e.dropped
      ? ` · ${m.dropped + e.dropped} speck${m.dropped + e.dropped === 1 ? '' : 's'} dropped as noise`
      : '');

  return {
    view: input.view,
    coverage,
    missing: m.regions,
    extra: e.regions,
    dropped: m.dropped + e.dropped,
    sentence,
    from: input.from,
    reasoning:
      `${input.inkWhy}, rasterised against the ${input.view} silhouette at ` +
      `${g.width}×${g.height} over ${(g.bounds.maxX - g.bounds.minX).toFixed(2)} × ` +
      `${(g.bounds.maxY - g.bounds.minY).toFixed(2)} u (${g.pxU.toFixed(3)} u a pixel) — ` +
      `missing is ink the silhouette does not cover, extra is silhouette the ink does not` +
      (m.dropped + e.dropped
        ? `; anything under ${floor.toFixed(3)} u² (${(NOISE_FRACTION * 100).toFixed(1)}% of the drawing) is a speck where the two edges disagree`
        : ''),
    grid: g,
  };
}

// ---- is this a profile OF that solid? ---------------------------------------

/** How a closed mark's outline sits against a solid's silhouette on one plane. */
export interface Overlap {
  /** Intersection over union. */
  iou: number;
  /** How much of the ink lies inside the silhouette, and how much of the silhouette inside the ink. */
  inkInside: number;
  solidInside: number;
  /** True when the two are about the same material at all. */
  about: boolean;
  why: string;
}

/**
 * The rule that makes a closed stroke a PROFILE OF a solid rather than the
 * start of a new one (§4): its outline overlaps that solid's silhouette on the
 * plane it was drawn on, orthographically along the plane's normal — so where
 * the plane stands along its own normal does not matter, and sliding the width
 * tile out beside the box changes nothing.
 *
 * Either the two share enough material (IoU over PROFILE_OVERLAP) or one is
 * inside the other (PROFILE_CONTAINS) — which is the case that matters, because
 * a profile drawn to correct a solid is usually bigger or smaller than it, and
 * that is the whole point of drawing it.
 */
export function overlapOf(ink: Point[], silhouette: Point[][], resolution = 96): Overlap {
  if (ink.length < 3 || !silhouette.length) {
    return { iou: 0, inkInside: 0, solidInside: 0, about: false, why: 'there is no silhouette on this plane to compare with' };
  }
  const g = gridFor(padBounds(unionBounds(boundsOf(ink), boundsOf(silhouette.flat()))), resolution);
  const a = rasterise([ink], g);
  const b = rasterise(silhouette, g);
  let both = 0, either = 0, inkPx = 0, solidPx = 0;
  for (let i = 0; i < a.length; i++) {
    if (a[i]) inkPx++;
    if (b[i]) solidPx++;
    if (a[i] && b[i]) both++;
    if (a[i] || b[i]) either++;
  }
  const iou = either ? both / either : 0;
  const inkInside = inkPx ? both / inkPx : 0;
  const solidInside = solidPx ? both / solidPx : 0;
  const about = iou >= PROFILE_OVERLAP || inkInside >= PROFILE_CONTAINS || solidInside >= PROFILE_CONTAINS;
  const why = about
    ? iou >= PROFILE_OVERLAP
      ? `its outline and that solid's silhouette share ${(iou * 100).toFixed(0)}% of their material on this plane (over ${(PROFILE_OVERLAP * 100).toFixed(0)}%)`
      : inkInside >= PROFILE_CONTAINS
        ? `${(inkInside * 100).toFixed(0)}% of it lies inside that solid's silhouette here`
        : `it holds ${(solidInside * 100).toFixed(0)}% of that solid's silhouette here`
    : `it shares ${(iou * 100).toFixed(0)}% with that solid's silhouette here — under the ${(PROFILE_OVERLAP * 100).toFixed(0)}% floor, so it is a profile of its own`;
  return { iou, inkInside, solidInside, about, why };
}

// ---- the three canonical views ----------------------------------------------

/**
 * What §4 calls the three canonical profiles, said as the hand says them: the
 * foundation is what you see looking DOWN, the height plane is what you see
 * looking at the FRONT, the width plane is the SIDE. A plane that is none of
 * the three keeps its own name.
 */
export function viewNameOf(planeName: string | undefined): string {
  if (planeName === 'foundation') return 'top';
  if (planeName === 'height') return 'front';
  if (planeName === 'width') return 'side';
  return planeName ?? 'this view';
}
