import { describe, it, expect } from 'vitest';
import { createSession } from './session';
import { magnetSites, nearestMagnet, magnetsNear, magnetRadius, describeMagnet } from './magnets';
import { circleStroke, rectStroke, lineStroke, triangleStroke, arcStroke, handArrow, handText, handBox } from '../test/strokes';
import type { Point } from '../types';
import { diamondCorners, handShape } from '../notations/fixtures/hand';

const built = (pts: { x: number; y: number }[]) => {
  const s = createSession();
  const id = s.addStroke(pts, 1000);
  const st = s.getState();
  return { id, sites: magnetSites(st.nodes.get(id)!, st.nodes), session: s };
};
const kinds = (sites: ReturnType<typeof built>['sites']) => sites.map((s) => s.kind);
const near = (a: { x: number; y: number }, b: { x: number; y: number }, tol = 2) =>
  Math.abs(a.x - b.x) <= tol && Math.abs(a.y - b.y) <= tol;

describe('magnets — the places a mark offers attachment', () => {
  it('a line offers tail, tip and middle', () => {
    const { sites } = built(lineStroke({ x: 100, y: 300 }, { x: 100, y: 100 }));
    expect(kinds(sites)).toEqual(['tail', 'tip', 'middle']);
    expect(near(sites[0].point, { x: 100, y: 300 })).toBe(true);
    expect(near(sites[1].point, { x: 100, y: 100 })).toBe(true);
    expect(near(sites[2].point, { x: 100, y: 200 })).toBe(true);
  });

  it('an arrow offers tail and tip where it actually points', () => {
    const { sites } = built(handArrow({ x: 100, y: 100 }, { x: 400, y: 100 }, { seed: 1 }));
    const tip = sites.find((s) => s.kind === 'tip')!;
    const tail = sites.find((s) => s.kind === 'tail')!;
    expect(tip.point.x).toBeGreaterThan(tail.point.x);
    expect(sites.find((s) => s.kind === 'middle')).toBeTruthy();
  });

  it('a rectangle offers four corners, four edge-middles and a centre', () => {
    const { sites } = built(rectStroke(100, 100, 200, 120));
    expect(kinds(sites).filter((k) => k === 'corner')).toHaveLength(4);
    expect(kinds(sites).filter((k) => k === 'middle')).toHaveLength(4);
    const centre = sites.find((s) => s.kind === 'centre')!;
    expect(near(centre.point, { x: 200, y: 160 })).toBe(true);
    const corners = sites.filter((s) => s.kind === 'corner');
    expect(corners.some((c) => near(c.point, { x: 100, y: 100 }, 6))).toBe(true);
    expect(corners.some((c) => near(c.point, { x: 300, y: 220 }, 6))).toBe(true);
  });

  it('a circle offers its centre and four cardinals at its own radii', () => {
    const { sites } = built(circleStroke(300, 200, 80));
    const centre = sites.find((s) => s.kind === 'centre')!;
    expect(near(centre.point, { x: 300, y: 200 })).toBe(true);
    const cardinals = sites.filter((s) => s.kind === 'cardinal');
    expect(cardinals).toHaveLength(4);
    expect(cardinals.every((c) => Math.abs(Math.hypot(c.point.x - 300, c.point.y - 200) - 80) < 4)).toBe(true);
  });

  it('a triangle offers three corners and the centroid', () => {
    const { sites } = built(triangleStroke({ x: 200, y: 100 }, { x: 320, y: 300 }, { x: 80, y: 300 }));
    expect(sites.filter((s) => s.kind === 'corner')).toHaveLength(3);
    const c = sites.find((s) => s.kind === 'centre')!;
    expect(near(c.point, { x: 200, y: 233 }, 6)).toBe(true);
  });

  it('an arc offers its two ends and the middle of its span', () => {
    const { sites } = built(arcStroke(200, 200, 100));
    expect(kinds(sites)).toEqual(['tail', 'tip', 'centre']);
  });

  it('writing offers only its bounds — an offer, never a lie about shape', () => {
    const { sites } = built(handText(100, 100, 120, 40, { seed: 2 }));
    expect(sites.length).toBeGreaterThan(0);
    expect(sites.every((s) => s.shape === 'ink')).toBe(true);
    expect(kinds(sites)).toContain('corner');
    expect(kinds(sites)).toContain('centre');
  });

  it('a flat diamond offers its vertices, not the corners of its bounds (D3)', () => {
    // A diamond wider than it is tall reads as a triangle or a circle unsure, so
    // it has no clean form to take sites from, and offered the corners of its
    // bounds — four places in the air beside the mark. Its ink is four-cornered
    // all the same: those four corners are measured, not pretended.
    const bad: string[] = [];
    for (const [w, h] of [[180, 110], [160, 100], [200, 90], [140, 80], [120, 60], [100, 100]]) {
      for (const seed of [1, 2, 3, 4, 5, 6]) {
        const { sites } = built(handShape(diamondCorners(400, 300, w, h), { seed, jitter: 2 }));
        const corners = sites.filter((s) => s.kind === 'corner');
        const vertices = [{ x: 400, y: 300 - h / 2 }, { x: 400 + w / 2, y: 300 }, { x: 400, y: 300 + h / 2 }, { x: 400 - w / 2, y: 300 }];
        const missing = vertices.filter((v) => !corners.some((c) => near(c.point, v, 12)));
        if (corners.length !== 4 || missing.length) bad.push(`${w}×${h} seed ${seed}: ${corners.map((c) => `(${Math.round(c.point.x)}, ${Math.round(c.point.y)})`).join(' ')}`);
      }
    }
    expect(bad).toEqual([]);
  });

  it('a box turned about 45° with unequal sides offers its own corners too', () => {
    for (const [w, h] of [[160, 100], [200, 90], [120, 60]]) {
      const { sites } = built(handBox(400, 300, w, h, 45, { seed: 3, jitter: 1 }));
      const centre = sites.find((s) => s.kind === 'centre')!;
      const corners = sites.filter((s) => s.kind === 'corner');
      expect(corners).toHaveLength(4);
      // Every corner is a place on the box: the same distance from its centre as the box's own half-diagonal.
      const half = Math.hypot(w, h) / 2;
      for (const c of corners) expect(Math.abs(Math.hypot(c.point.x - centre.point.x, c.point.y - centre.point.y) - half)).toBeLessThan(10);
    }
  });

  it('an oval, a pentagon, a hexagon and a flat triangle drawn unsure keep their bounds, never four pretended corners', () => {
    // Four corners hold a diamond or a box, and not these: an oval's hold 0.64
    // of it, a pentagon's and a hexagon's about 0.68, a flat triangle's four
    // are its three and one along a side.
    const ring = (n: number, rx: number, ry: number, from = 0) =>
      Array.from({ length: n }, (_, i) => ({ x: 400 + rx * Math.cos(from + (i / n) * 2 * Math.PI), y: 300 + ry * Math.sin(from + (i / n) * 2 * Math.PI) }));
    const drawn: Record<string, Point[]> = {
      oval: handShape(ring(48, 100, 40), { seed: 1, jitter: 2 }),
      pentagon: handShape(ring(5, 80, 80, -Math.PI / 2), { seed: 2, jitter: 2 }),
      hexagon: handShape(ring(6, 90, 60), { seed: 1, jitter: 2 }),
      'flat triangle': handShape([{ x: 300, y: 340 }, { x: 500, y: 340 }, { x: 400, y: 290 }], { seed: 1, jitter: 2 }),
    };
    for (const [name, pts] of Object.entries(drawn)) {
      const { sites } = built(pts);
      const corners = sites.filter((s) => s.kind === 'corner');
      expect(corners.length, name).toBeGreaterThan(0);
      expect(corners.every((s) => /bounds/.test(s.reasoning)), name).toBe(true);
    }
  });

  it('nearestMagnet takes the closest site inside the radius and refuses outside it', () => {
    const { sites } = built(rectStroke(100, 100, 200, 120));
    const corner = sites.find((s) => s.kind === 'corner' && near(s.point, { x: 100, y: 100 }, 6))!;
    const hit = nearestMagnet({ x: 108, y: 106 }, sites, 20);
    expect(hit!.site).toBe(corner);
    expect(nearestMagnet({ x: 500, y: 500 }, sites, 20)).toBeNull();
  });

  it('magnetsNear gathers across marks and honours the exclude set', () => {
    const s = createSession();
    const a = s.addStroke(rectStroke(100, 100, 100, 80), 1000);
    const bId = s.addStroke(circleStroke(320, 140, 40), 1001);
    const st = s.getState();
    const hits = magnetsNear({ x: 205, y: 140 }, st.nodes, [a, bId], 30);
    expect(hits.length).toBeGreaterThan(0);
    expect(hits[0].site.nodeId === a || hits[0].site.nodeId === bId).toBe(true);
    const excluded = magnetsNear({ x: 205, y: 140 }, st.nodes, [a, bId], 30, new Set([a]));
    expect(excluded.every((h) => h.site.nodeId !== a)).toBe(true);
  });

  it('the radius is about the hand: zoom scales the screen part, size the rest', () => {
    expect(magnetRadius(100, 1)).toBe(14);
    expect(magnetRadius(100, 2)).toBe(28);
    expect(magnetRadius(1000, 1)).toBe(60);
  });

  it('a held clean form moves the sites to the clean geometry, not the wobble', () => {
    const s = createSession();
    const id = s.addStroke(rectStroke(100, 100, 200, 120), 1000);
    s.snap({ ids: [id], at: 1001 });
    const st = s.getState();
    const sites = magnetSites(st.nodes.get(id)!, st.nodes);
    expect(sites.every((x) => x.shape === 'rectangle')).toBe(true);
    expect(sites.filter((x) => x.kind === 'corner')).toHaveLength(4);
  });

  it('describeMagnet says where, in one line', () => {
    const { sites } = built(lineStroke({ x: 100, y: 300 }, { x: 100, y: 100 }));
    expect(describeMagnet(sites[0])).toContain('(100, 300)');
  });
});

// The bind CONTRACT — one edge per endpoint, active versus historical,
// replay and merge — lives in bind.test.ts, beside the claim it pins.
