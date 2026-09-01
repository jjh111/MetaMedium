// The relation vocabulary. Most of its behaviour is pinned through the
// concept and session tests that build on it; this file holds what is about
// relate() itself.

import { describe, it, expect } from 'vitest';
import { relate, type Mark } from './relations';

describe('relate() stays cheap on a real board', () => {
  it('does not run segment tests on pairs whose boxes cannot overlap', () => {
    // Fifty 120-point strokes spread out so no two boxes overlap: every
    // crossing test would be wasted, and there are 1225 pairs of them.
    const marks: Mark[] = [];
    for (let i = 0; i < 50; i++) {
      const x = (i % 10) * 300, y = Math.floor(i / 10) * 300;
      const pts = Array.from({ length: 120 }, (_, k) => ({ x: x + (k % 12) * 8, y: y + Math.floor(k / 12) * 8 }));
      marks.push({ id: `m${i}`, bounds: { minX: x, minY: y, maxX: x + 96, maxY: y + 80 }, points: pts });
    }
    const t0 = performance.now();
    const rels = relate(marks);
    const ms = performance.now() - t0;
    expect(rels.filter((r) => r.kind === 'crossing')).toHaveLength(0);
    expect(ms).toBeLessThan(80); // was ~10x this before the overlap guard
  });
});
