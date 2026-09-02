// A box drawn by hand is rarely square to the screen.

import { describe, it, expect } from 'vitest';
import { createSession } from './session';
import { snapReading } from './clean';
import { handRect, handCircle, handTriangle } from '../test/strokes';
import { shapeExtent } from '../geometry';
import type { Point } from '../types';

const rot = (pts: Point[], deg: number, cx: number, cy: number): Point[] => {
  const a = (deg * Math.PI) / 180;
  return pts.map((p) => ({
    x: cx + (p.x - cx) * Math.cos(a) - (p.y - cy) * Math.sin(a),
    y: cy + (p.x - cx) * Math.sin(a) + (p.y - cy) * Math.cos(a),
  }));
};
const read = (pts: Point[]) => {
  const s = createSession();
  const id = s.addStroke(pts, 1000);
  return snapReading(s.getState().nodes.get(id)!, s.getState().nodes);
};

describe('extent is measured against the tightest box at any angle', () => {
  it('a rectangle fills its box at every tilt', () => {
    for (const deg of [0, 5, 10, 15, 25, 40]) {
      const e = shapeExtent(rot(handRect(200, 200, 220, 140, { seed: 1 }), deg, 310, 270));
      expect(e, `${deg}°`).toBeGreaterThan(0.88);
    }
  });
  it('a circle still fills ~π/4 and a triangle ~½', () => {
    expect(shapeExtent(handCircle(300, 300, 80, { seed: 2 }))).toBeCloseTo(Math.PI / 4, 1);
    const tri = shapeExtent(handTriangle({ x: 200, y: 100 }, { x: 320, y: 300 }, { x: 80, y: 300 }, { seed: 3 }));
    expect(tri).toBeGreaterThan(0.4);
    expect(tri).toBeLessThan(0.62);
  });
  it('a box tilted fifteen degrees is still offered clean', () => {
    for (const deg of [5, 10, 15]) {
      const r = read(rot(handRect(200, 200, 220, 140, { seed: 4 }), deg, 310, 270));
      expect(r.shape, `${deg}°`).toBe('rectangle');
      expect(r.ok, `${deg}° ${r.reasoning}`).toBe(true);
    }
  });
});
