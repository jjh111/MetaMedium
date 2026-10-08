// A fill as pixels, and how faithfully a line stands for it (V1-SPEC IN1, `ink-outline.ts`'s measure).
//
// The skeleton method needs the outline as a bitmap to thin; the choice between methods needs a number for how
// well a line stands for the shape it came from. Both read the same raster: the rings scan-converted under their
// fill rule, at a scale where the pen is several pixels wide.
//
//   recall    — the share of the fill's area within half a pen width (and a pixel) of the line;
//   precision — the share of the line's length inside the fill (and a pixel).
//
// A line is *faithful* when both are at least `FAITHFUL_AT`.

import type { Point } from '../types';
import type { FillRule } from './ring';

/** A line is faithful to its outline when it covers and stays on at least this much of it. */
export const FAITHFUL_AT = 0.9;
/** …and *near* when it does at least this: the bench reports both. */
export const NEAR_AT = 0.8;
/** The most pixels one raster may hold; past it the scale is reduced to fit. */
export const MAX_RASTER_PX = 1_500_000;

export interface Raster {
  /** The page position of the raster's top left corner. */
  x0: number;
  y0: number;
  /** Pixels to the unit. */
  scale: number;
  width: number;
  height: number;
  /** 1 inside the fill. */
  data: Uint8Array;
  /** How many pixels are inside. */
  filled: number;
}

/**
 * The rings scan-converted: a pixel is inside when the rule says its centre is. Edges are counted half-open
 * (a ring's vertex on a scan line is counted once), so the answer does not depend on where the ring starts.
 * `pad` pixels of empty ground are left all round, for a thinning to work against. Null when the rings have no
 * extent. The scale is reduced when the raster would pass `MAX_RASTER_PX`.
 */
export function rasterise(rings: readonly (readonly Point[])[], rule: FillRule, scale: number, pad = 2, shift = { x: 0, y: 0 }): Raster | null {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const r of rings) for (const p of r) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  if (!(maxX > minX) && !(maxY > minY)) return null;
  const w = Math.max(maxX - minX, 1e-6), h = Math.max(maxY - minY, 1e-6);
  let k = scale;
  const area = (w * k + 2 * pad) * (h * k + 2 * pad);
  if (area > MAX_RASTER_PX) k *= Math.sqrt(MAX_RASTER_PX / area) * 0.98;
  const width = Math.ceil(w * k + shift.x) + 2 * pad;
  const height = Math.ceil(h * k + shift.y) + 2 * pad;
  const x0 = minX - (pad + shift.x) / k, y0 = minY - (pad + shift.y) / k;
  const data = new Uint8Array(width * height);

  // Crossings of every edge with each scan line, in raster space: [x, direction].
  const xs: number[][] = Array.from({ length: height }, () => []);
  const ds: number[][] = Array.from({ length: height }, () => []);
  for (const r of rings) {
    const n = r.length;
    for (let i = 0; i < n; i++) {
      const p = r[i], q = r[i + 1 === n ? 0 : i + 1];
      const px = (p.x - x0) * k, py = (p.y - y0) * k, qx = (q.x - x0) * k, qy = (q.y - y0) * k;
      if (py === qy) continue;
      const up = qy > py;
      const ya = up ? py : qy, yb = up ? qy : py;
      // The scan lines at pixel centres j + 0.5 with ya <= j + 0.5 < yb.
      let j0 = Math.ceil(ya - 0.5), j1 = Math.ceil(yb - 0.5) - 1;
      if (j0 < 0) j0 = 0;
      if (j1 >= height) j1 = height - 1;
      const slope = (qx - px) / (qy - py);
      for (let j = j0; j <= j1; j++) {
        xs[j].push(px + (j + 0.5 - py) * slope);
        ds[j].push(up ? 1 : -1);
      }
    }
  }
  let filled = 0;
  const order: number[] = [];
  for (let j = 0; j < height; j++) {
    const row = xs[j];
    const m = row.length;
    if (m < 2) continue;
    order.length = m;
    for (let i = 0; i < m; i++) order[i] = i;
    order.sort((a, b) => row[a] - row[b]);
    let wind = 0;
    for (let t = 0; t < m - 1; t++) {
      const cur = order[t];
      wind += ds[j][cur];
      const inside = rule === 'evenodd' ? ((t + 1) & 1) === 1 : wind !== 0;
      if (!inside) continue;
      // Pixels i with row[cur] <= i + 0.5 < row[next].
      let i0 = Math.ceil(row[cur] - 0.5), i1 = Math.ceil(row[order[t + 1]] - 0.5) - 1;
      if (i0 < 0) i0 = 0;
      if (i1 >= width) i1 = width - 1;
      for (let i = i0; i <= i1; i++) {
        if (!data[j * width + i]) { data[j * width + i] = 1; filled++; }
      }
    }
  }
  return { x0, y0, scale: k, width, height, data, filled };
}

/** The raster's pixel position of a page point. */
export const toRaster = (r: Raster, p: Point): Point => ({ x: (p.x - r.x0) * r.scale, y: (p.y - r.y0) * r.scale });
/** The page position of a raster pixel's centre. */
export const fromRaster = (r: Raster, px: number, py: number): Point => ({ x: r.x0 + (px + 0.5) / r.scale, y: r.y0 + (py + 0.5) / r.scale });

export interface Measure {
  recall: number;
  precision: number;
}

/**
 * How faithfully `lines` stand for the fill: recall and precision as the header says. `width` is the pen's, in
 * page units. A line is sampled at every pixel along it, so its length weighs what it is.
 */
export function measure(r: Raster, lines: readonly (readonly Point[])[], width: number): Measure {
  if (r.filled === 0) return { recall: 0, precision: 0 };
  const reach = Math.max(1, (width * r.scale) / 2 + 1);
  const covered = new Uint8Array(r.width * r.height);
  const R = Math.ceil(reach);
  const reach2 = reach * reach;
  let samples = 0, onFill = 0;
  const step = 1;
  for (const line of lines) {
    if (line.length === 0) continue;
    let prev: Point | null = null;
    for (const raw of line) {
      const p = toRaster(r, raw);
      const segs = prev ? Math.max(1, Math.ceil(Math.hypot(p.x - prev.x, p.y - prev.y) / step)) : 1;
      for (let s = prev ? 1 : 0; s <= segs; s++) {
        const t = prev ? s / segs : 1;
        const cx = prev ? prev.x + (p.x - prev.x) * t : p.x;
        const cy = prev ? prev.y + (p.y - prev.y) * t : p.y;
        samples++;
        const ix = Math.floor(cx), iy = Math.floor(cy);
        // Precision: the sample is on the fill when it, or a pixel beside it, is.
        let hit = ix >= 0 && iy >= 0 && ix < r.width && iy < r.height && r.data[iy * r.width + ix] === 1;
        for (let dy = -1; dy <= 1 && !hit; dy++) {
          const yy = iy + dy;
          if (yy < 0 || yy >= r.height) continue;
          for (let dx = -1; dx <= 1; dx++) {
            const xx = ix + dx;
            if (xx >= 0 && xx < r.width && r.data[yy * r.width + xx]) { hit = true; break; }
          }
        }
        if (hit) onFill++;
        // Recall: stamp the disc of reach round the sample, a row at a time. Samples a pixel apart, with a reach of
        // at least a pixel, make a solid band.
        const y0 = Math.max(0, Math.floor(cy - R)), y1 = Math.min(r.height - 1, Math.ceil(cy + R));
        for (let yy = y0; yy <= y1; yy++) {
          const ddy = yy + 0.5 - cy;
          const rest = reach2 - ddy * ddy;
          if (rest < 0) continue;
          const half = Math.sqrt(rest);
          const a = Math.max(0, Math.ceil(cx - half - 0.5)), b = Math.min(r.width - 1, Math.floor(cx + half - 0.5));
          for (let i = yy * r.width + a, end = yy * r.width + b; i <= end; i++) covered[i] = 1;
        }
      }
      prev = p;
    }
  }
  if (samples === 0) return { recall: 0, precision: 0 };
  let both = 0;
  for (let i = 0; i < covered.length; i++) if (covered[i] && r.data[i]) both++;
  return { recall: both / r.filled, precision: onFill / samples };
}
