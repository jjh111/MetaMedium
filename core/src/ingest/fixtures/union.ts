// The silhouette of several pen strokes as ONE fill (V1-SPEC IN1, the fixtures).
//
// Some exporters do not write each stroke as its own ring: they merge the strokes that touch and write what is
// left — an outer ring, and a ring for every hole the strokes closed. A letter that crosses itself, two strokes
// of an x, an arrow drawn in two pieces all arrive this way. There is no polygon-clipping code in core, and none
// is wanted: the strokes are drawn as pixels (with `rasterise`, the same scan converter the skeleton uses) and
// the edge between filled and empty is walked into rings, outer rings one way round and holes the other.

import type { Point } from '../../types';
import { rasterise } from '../fill';
import { simplifyStroke } from '../../geometry';

/** The pixels to the unit the silhouette is drawn at before its edge is walked. */
const SCALE = 6;

/**
 * The rings of the union of `rings` (each filled nonzero): outer rings walked counter-clockwise on a page whose y
 * runs down, holes clockwise, so the result is a nonzero fill with its holes where they belong.
 */
export function unionRings(rings: readonly (readonly Point[])[], tolerance = 0.25): Point[][] {
  const r = rasterise(rings, 'nonzero', SCALE, 3);
  if (!r) return [];
  const W = r.width, H = r.height;
  const inside = (x: number, y: number) => x >= 0 && y >= 0 && x < W && y < H && r.data[y * W + x] === 1;
  // Directed unit edges with the fill on their left, keyed by where they start.
  type Edge = { x1: number; y1: number; x2: number; y2: number; used: boolean };
  const byStart = new Map<number, Edge[]>();
  const key = (x: number, y: number) => y * (W + 2) + x;
  const add = (x1: number, y1: number, x2: number, y2: number) => {
    const e: Edge = { x1, y1, x2, y2, used: false };
    const k = key(x1, y1);
    const list = byStart.get(k);
    if (list) list.push(e); else byStart.set(k, [e]);
  };
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      if (!inside(x, y)) continue;
      // Pixel (x, y) spans (x..x+1, y..y+1). Walking with the fill on the left of a page whose y runs down.
      if (!inside(x, y - 1)) add(x + 1, y, x, y); // top edge, right to left
      if (!inside(x, y + 1)) add(x, y + 1, x + 1, y + 1); // bottom edge, left to right
      if (!inside(x - 1, y)) add(x, y, x, y + 1); // left edge, top to bottom
      if (!inside(x + 1, y)) add(x + 1, y + 1, x + 1, y); // right edge, bottom to top
    }
  }
  const out: Point[][] = [];
  for (const list of byStart.values()) {
    for (const first of list) {
      if (first.used) continue;
      const loop: { x: number; y: number }[] = [];
      let e: Edge | undefined = first;
      while (e && !e.used) {
        e.used = true;
        loop.push({ x: e.x1, y: e.y1 });
        const nexts: Edge[] = (byStart.get(key(e.x2, e.y2)) ?? []).filter((n: Edge) => !n.used);
        if (nexts.length <= 1) { e = nexts[0]; continue; }
        // Two ways on at a pinch: turn so that the fill stays on the left and the pieces stay apart.
        const dx = e.x2 - e.x1, dy = e.y2 - e.y1;
        nexts.sort((a: Edge, b: Edge) => {
          const ca = dx * (a.y2 - a.y1) - dy * (a.x2 - a.x1);
          const cb = dx * (b.y2 - b.y1) - dy * (b.x2 - b.x1);
          return ca - cb;
        });
        e = nexts[0];
      }
      if (loop.length < 4) continue;
      const pts = loop.map((p) => ({ x: r.x0 + p.x / r.scale, y: r.y0 + p.y / r.scale }));
      const simple = simplifyStroke([...pts, pts[0]], tolerance);
      simple.pop();
      if (simple.length >= 3) out.push(simple);
    }
  }
  return out;
}
