// The relation vocabulary. Most of its behaviour is pinned through the
// concept and session tests that build on it; this file holds what is about
// relate() itself.

import { describe, it, expect } from 'vitest';
import { relate, type Mark, ENGAGING_KINDS, withinReach, reachAround, nearLimitOf, DEFAULT_RELATE_CONFIG } from './relations';
import { rng } from '../test/strokes';

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

// ===== Within reach (V1-PLAN §9 R4b) =====
//
// The board stores the relations of pairs within reach and finds those pairs
// through an index; both rest on one promise — `withinReach` says yes exactly
// when `relate` finds an engaging relation, and `reachAround` grows a box far
// enough to meet every mark within its reach.

describe('within reach is exactly what relate calls engaging', () => {
  const r = rng(42);
  const box = (x: number, y: number, w: number, h: number) => ({ minX: x, minY: y, maxX: x + w, maxY: y + h });
  const pairs: [ReturnType<typeof box>, ReturnType<typeof box>][] = [];
  for (let i = 0; i < 4000; i++) {
    const scale = [0.01, 1, 40, 900][i % 4];
    const w = r() * scale * (r() < 0.1 ? 0 : 1), h = r() * scale * (r() < 0.1 ? 0 : 1);
    const a = box((r() - 0.5) * scale * 4, (r() - 0.5) * scale * 4, w, h);
    const kind = i % 5;
    const b = kind === 0 ? box(a.minX + w * 0.2, a.minY + h * 0.2, w * 0.3, h * 0.3) // inside
      : kind === 1 ? box(a.maxX, a.minY, r() * scale, r() * scale) // touching an edge
      : kind === 2 ? box(a.maxX + nearLimitOf(a, a) * (0.5 + r()), a.minY, w, h) // about as far as near reaches
      : box((r() - 0.5) * scale * 4, (r() - 0.5) * scale * 4, r() * scale, r() * scale);
    pairs.push([a, b]);
  }

  it('on four thousand pairs at four scales: inside, touching, at the edge of near, and anywhere', () => {
    let engaged = 0;
    for (const [a, b] of pairs) {
      const found = relate([{ id: 'a', bounds: a }, { id: 'b', bounds: b }]);
      const engaging = found.some((x) => ENGAGING_KINDS.has(x.kind));
      if (engaging) engaged++;
      expect(withinReach(a, b)).toBe(engaging);
      expect(withinReach(b, a)).toBe(engaging);
    }
    // Both answers are exercised.
    expect(engaged).toBeGreaterThan(500);
    expect(engaged).toBeLessThan(pairs.length - 500);
  });

  it('a box grown by its reach meets every box within its reach', () => {
    for (const [a, b] of pairs) {
      if (!withinReach(a, b)) continue;
      const g = reachAround(a);
      const grown = { minX: a.minX - g, minY: a.minY - g, maxX: a.maxX + g, maxY: a.maxY + g };
      expect(grown.maxX >= b.minX && grown.minX <= b.maxX && grown.maxY >= b.minY && grown.minY <= b.maxY).toBe(true);
    }
  });

  it('is a ratio of the smaller mark, as near is: the same pair scaled is the same answer', () => {
    const a = box(0, 0, 100, 60), b = box(150, 0, 40, 40); // 50 apart; near reaches 0.6 × 40 = 24
    expect(withinReach(a, b)).toBe(false);
    const k = 1 / 37;
    expect(withinReach(box(0, 0, 100 * k, 60 * k), box(150 * k, 0, 40 * k, 40 * k), { ...DEFAULT_RELATE_CONFIG, nearRatio: 0.6 })).toBe(
      50 * k < 0.6 * Math.max(1, 40 * k)
    );
    expect(withinReach(a, box(120, 0, 40, 40))).toBe(true); // 20 apart
  });

  it('a box that is not finite is within reach of nothing', () => {
    expect(withinReach(box(0, 0, 10, 10), { minX: NaN, minY: 0, maxX: 5, maxY: 5 })).toBe(false);
    expect(withinReach({ minX: 0, minY: 0, maxX: Infinity, maxY: 5 }, box(0, 0, 10, 10))).toBe(false);
  });
});
