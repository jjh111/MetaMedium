// The index that finds the marks near a mark without walking the board
// (V1-PLAN §9 R4b). It decides what is looked at, never what is true, so the
// one thing it must never do is leave out a mark whose box meets the query —
// checked here against a walk of every box, on boards drawn in pixels, in a
// shard's metres and across both at once.

import { describe, it, expect } from 'vitest';
import type { Bounds } from '../types';
import { MarkGrid } from './grid';
import { rng } from '../test/strokes';

const meets = (a: Bounds, b: Bounds) => a.maxX >= b.minX && a.minX <= b.maxX && a.maxY >= b.minY && a.minY <= b.maxY;

function randomBoxes(seed: number, n: number, span: number, sizes: [number, number]): Map<string, Bounds> {
  const r = rng(seed);
  const out = new Map<string, Bounds>();
  for (let i = 0; i < n; i++) {
    const w = sizes[0] + (sizes[1] - sizes[0]) * r() ** 3;
    const h = r() < 0.1 ? 0 : sizes[0] + (sizes[1] - sizes[0]) * r() ** 3; // a flat line now and then
    const x = (r() - 0.5) * span, y = (r() - 0.5) * span;
    out.set(`m${i}`, { minX: x, minY: y, maxX: x + w, maxY: y + h });
  }
  return out;
}

function brute(boxes: Map<string, Bounds>, q: Bounds): string[] {
  return [...boxes].filter(([, b]) => meets(b, q)).map(([id]) => id).sort();
}

describe('MarkGrid', () => {
  for (const [label, span, sizes] of [
    ['a board in pixels', 20000, [2, 900]],
    ['a shard plane in metres', 12, [0.01, 3]],
    ['letters and pages and a wall', 50000, [0.5, 30000]],
  ] as const) {
    it(`finds exactly the boxes a query meets — ${label}`, () => {
      const boxes = randomBoxes(7, 600, span, sizes as [number, number]);
      const g = new MarkGrid();
      for (const [id, b] of boxes) g.set(id, b);
      expect(g.size).toBe(boxes.size);
      const r = rng(11);
      for (let k = 0; k < 300; k++) {
        const w = (r() ** 2) * span * 0.2, h = (r() ** 2) * span * 0.2;
        const x = (r() - 0.5) * span, y = (r() - 0.5) * span;
        const q = { minX: x, minY: y, maxX: x + w, maxY: y + h };
        expect(g.query(q).sort()).toEqual(brute(boxes, q));
      }
    });
  }

  it('counts a box that only touches the query at an edge', () => {
    const g = new MarkGrid();
    g.set('a', { minX: 0, minY: 0, maxX: 64, maxY: 64 });
    g.set('b', { minX: 64, minY: 64, maxX: 70, maxY: 70 });
    expect(g.query({ minX: 64, minY: 64, maxX: 64, maxY: 64 }).sort()).toEqual(['a', 'b']);
    expect(g.query({ minX: 64.0001, minY: 0, maxX: 64.0002, maxY: 1 })).toEqual([]);
  });

  it('moves a mark it is told has moved, and forgets one taken away', () => {
    const boxes = randomBoxes(3, 200, 5000, [5, 400]);
    const g = new MarkGrid();
    for (const [id, b] of boxes) g.set(id, b);
    const r = rng(5);
    for (let k = 0; k < 400; k++) {
      const id = `m${Math.floor(r() * 200)}`;
      if (r() < 0.3) {
        boxes.delete(id);
        g.delete(id);
      } else {
        const b = boxes.get(id) ?? { minX: 0, minY: 0, maxX: 10, maxY: 10 };
        const dx = (r() - 0.5) * 3000, s = 0.2 + r() * 4;
        const moved = { minX: b.minX + dx, minY: b.minY - dx / 2, maxX: b.minX + dx + (b.maxX - b.minX) * s, maxY: b.minY - dx / 2 + (b.maxY - b.minY) * s };
        boxes.set(id, moved);
        g.set(id, moved);
      }
      const x = (r() - 0.5) * 5000, y = (r() - 0.5) * 5000;
      const q = { minX: x, minY: y, maxX: x + r() * 900, maxY: y + r() * 900 };
      expect(g.query(q).sort()).toEqual(brute(boxes, q));
    }
    expect(g.size).toBe(boxes.size);
  });

  it('files no box that is not finite; a query without edges meets everything, one that is not a number meets nothing', () => {
    const g = new MarkGrid();
    g.set('nan', { minX: NaN, minY: 0, maxX: 1, maxY: 1 });
    g.set('inf', { minX: 0, minY: 0, maxX: Infinity, maxY: 1 });
    g.set('ok', { minX: 0, minY: 0, maxX: 1, maxY: 1 });
    g.set('far', { minX: 1e6, minY: -1e6, maxX: 1e6 + 5, maxY: -1e6 + 5 });
    expect(g.size).toBe(2);
    expect(g.has('nan')).toBe(false);
    expect(g.has('inf')).toBe(false);
    expect(g.query({ minX: -Infinity, minY: -Infinity, maxX: Infinity, maxY: Infinity }).sort()).toEqual(['far', 'ok']);
    expect(g.query({ minX: NaN, minY: NaN, maxX: NaN, maxY: NaN })).toEqual([]);
    expect(g.around({ x: NaN, y: 0 }, () => 1)).toEqual([]);
  });

  it('asks each level with its own reach: a big mark is found from as far as a big mark reaches', () => {
    const boxes = randomBoxes(9, 500, 20000, [3, 2000]);
    const g = new MarkGrid();
    for (const [id, b] of boxes) g.set(id, b);
    const r = rng(13);
    const reachOf = (size: number) => Math.max(10, size * 0.15);
    for (let k = 0; k < 200; k++) {
      const p = { x: (r() - 0.5) * 20000, y: (r() - 0.5) * 20000 };
      const found = new Set(g.around(p, (cell) => reachOf(cell)));
      for (const [id, b] of boxes) {
        const size = Math.max(b.maxX - b.minX, b.maxY - b.minY);
        const dx = Math.max(0, b.minX - p.x, p.x - b.maxX), dy = Math.max(0, b.minY - p.y, p.y - b.maxY);
        if (Math.sqrt(dx * dx + dy * dy) < reachOf(size)) expect(found.has(id)).toBe(true);
      }
    }
  });
});
