// Where marks are, so a question about the marks near one does not walk the
// whole board (V1-PLAN.md §9 R4b; PERF.md hotspots 2, 4 and 5).
//
// A hierarchical grid, and its cells are sized FROM THE MARKS: each mark lives
// at the level whose cell is the smallest power of two its own size fits in,
// in the cell holding its top-left corner. So a letter is filed among cells a
// letter wide and a page frame among cells a page wide, on a board drawn in
// pixels or a shard's plane drawn in metres alike — there is no pixel
// constant here, which is the rule every threshold in this engine keeps
// (relations.ts). A mark no bigger than its cell spans at most the cell it is
// filed in and the next one along each axis, so a query looks one cell back
// on each axis at every level that holds anything.
//
// The index answers one question — which marks' boxes meet this box — and
// answers it with a superset of nothing: every caller applies its own exact
// test (within reach, contained, crossed) to what comes back, so the index
// decides what is looked at and never what is true. The order of what it
// returns is not an order anyone may rely on; callers that need the board's
// order sort by it.

import type { Bounds, Point } from '../types';

interface Filed {
  level: number;
  cx: number;
  cy: number;
  bounds: Bounds;
}

/** Below this a level is numerically meaningless; far past any mark a hand or a plane makes. */
const MIN_LEVEL = -40;

export function finiteBounds(b: Bounds): boolean {
  return Number.isFinite(b.minX) && Number.isFinite(b.minY) && Number.isFinite(b.maxX) && Number.isFinite(b.maxY);
}

/** The level a box is filed at: the smallest power of two its size fits in. */
function levelOf(b: Bounds): number {
  const size = Math.max(b.maxX - b.minX, b.maxY - b.minY);
  if (!(size > 0)) return MIN_LEVEL;
  let level = Math.max(MIN_LEVEL, Math.ceil(Math.log2(size)));
  // log2 can land a hair under an exact power; the cell must hold the mark.
  while (2 ** level < size) level++;
  return level;
}

export class MarkGrid {
  /** level → cx → cy → the ids filed there. */
  private levels = new Map<number, Map<number, Map<number, Set<string>>>>();
  /** How many marks each level holds, and how many cells, so a query skips empty levels. */
  private counts = new Map<number, { marks: number; cells: number }>();
  private filed = new Map<string, Filed>();

  get size(): number {
    return this.filed.size;
  }

  has(id: string): boolean {
    return this.filed.has(id);
  }

  /** The box a mark is filed under, as it was given. */
  boundsOf(id: string): Bounds | undefined {
    return this.filed.get(id)?.bounds;
  }

  ids(): IterableIterator<string> {
    return this.filed.keys();
  }

  /** File a mark (or move it, when it is already filed). A box that is not finite is not filed. */
  set(id: string, bounds: Bounds): void {
    this.delete(id);
    if (!finiteBounds(bounds)) return;
    const level = levelOf(bounds);
    const cell = 2 ** level;
    const cx = Math.floor(bounds.minX / cell);
    const cy = Math.floor(bounds.minY / cell);
    let xs = this.levels.get(level);
    if (!xs) this.levels.set(level, (xs = new Map()));
    let ys = xs.get(cx);
    if (!ys) xs.set(cx, (ys = new Map()));
    let here = ys.get(cy);
    const count = this.counts.get(level) ?? { marks: 0, cells: 0 };
    if (!here) {
      ys.set(cy, (here = new Set()));
      count.cells++;
    }
    here.add(id);
    count.marks++;
    this.counts.set(level, count);
    this.filed.set(id, { level, cx, cy, bounds: { minX: bounds.minX, minY: bounds.minY, maxX: bounds.maxX, maxY: bounds.maxY } });
  }

  delete(id: string): boolean {
    const f = this.filed.get(id);
    if (!f) return false;
    this.filed.delete(id);
    const xs = this.levels.get(f.level)!;
    const ys = xs.get(f.cx)!;
    const here = ys.get(f.cy)!;
    here.delete(id);
    const count = this.counts.get(f.level)!;
    count.marks--;
    if (here.size === 0) {
      ys.delete(f.cy);
      count.cells--;
      if (ys.size === 0) xs.delete(f.cx);
    }
    if (count.marks === 0) {
      this.counts.delete(f.level);
      this.levels.delete(f.level);
    }
    return true;
  }

  clear(): void {
    this.levels.clear();
    this.counts.clear();
    this.filed.clear();
  }

  /** Every mark whose box meets `box` (edges touching count), in no particular order. */
  query(box: Bounds): string[] {
    const out: string[] = [];
    this.visit(() => box, (id, b) => {
      if (b.maxX >= box.minX && b.minX <= box.maxX && b.maxY >= box.minY && b.minY <= box.maxY) out.push(id);
    });
    return out;
  }

  /**
   * Marks near a point, where how near depends on how big the mark is:
   * `radiusFor(cell)` is the farthest a mark of at most `cell` across can be
   * and still count. Every mark whose box comes within its level's radius of
   * the point is returned — a superset, for the caller's exact test.
   */
  around(p: Point, radiusFor: (cell: number) => number): string[] {
    const out: string[] = [];
    this.visit(
      (cell) => {
        const r = radiusFor(cell);
        return { minX: p.x - r, minY: p.y - r, maxX: p.x + r, maxY: p.y + r };
      },
      (id, b, box) => {
        if (b.maxX >= box.minX && b.minX <= box.maxX && b.maxY >= box.minY && b.minY <= box.maxY) out.push(id);
      }
    );
    return out;
  }

  /** Walk the cells a box (per level) could reach, handing each filed mark to `fn`. */
  private visit(boxAt: (cell: number) => Bounds, fn: (id: string, b: Bounds, box: Bounds) => void): void {
    for (const [level, xs] of this.levels) {
      const cell = 2 ** level;
      const box = boxAt(cell);
      if (!finiteBounds(box)) {
        // A box with no edge reaches every cell of the level.
        for (const ys of xs.values()) for (const here of ys.values()) for (const id of here) fn(id, this.filed.get(id)!.bounds, box);
        continue;
      }
      const x0 = Math.floor(box.minX / cell) - 1, x1 = Math.floor(box.maxX / cell);
      const y0 = Math.floor(box.minY / cell) - 1, y1 = Math.floor(box.maxY / cell);
      const span = (x1 - x0 + 1) * (y1 - y0 + 1);
      const count = this.counts.get(level)!;
      if (span > count.cells) {
        // A wide box over a sparse level: walk what is there rather than every cell it covers.
        for (const [cx, ys] of xs) {
          if (cx < x0 || cx > x1) continue;
          for (const [cy, here] of ys) {
            if (cy < y0 || cy > y1) continue;
            for (const id of here) fn(id, this.filed.get(id)!.bounds, box);
          }
        }
        continue;
      }
      for (let cx = x0; cx <= x1; cx++) {
        const ys = xs.get(cx);
        if (!ys) continue;
        for (let cy = y0; cy <= y1; cy++) {
          const here = ys.get(cy);
          if (!here) continue;
          for (const id of here) fn(id, this.filed.get(id)!.bounds, box);
        }
      }
    }
  }
}
