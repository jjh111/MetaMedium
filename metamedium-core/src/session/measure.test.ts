import { describe, it, expect } from 'vitest';
import { createSession } from './session';
import { measure, describeMaths } from './measure';
import { circleStroke, rectStroke, lineStroke, triangleStroke, handText, handArrow } from '../test/strokes';

const built = (pts: { x: number; y: number }[]) => {
  const s = createSession();
  const id = s.addStroke(pts, 1000);
  return measure(s.getState().nodes.get(id)!, s.getState().nodes);
};
const get = (m: ReturnType<typeof built>, key: string) => m!.measures.find((x) => x.key === key)!.value;

describe('measure — the maths of a mark', () => {
  it('a circle has a centre, a radius, a circumference and an area', () => {
    const m = built(circleStroke(300, 200, 80));
    expect(m!.shape).toBe('circle');
    expect(get(m, 'radius')).toBe(80);
    expect(get(m, 'circumference')).toBe(Math.round(2 * Math.PI * 80));
    expect(get(m, 'area')).toBe(Math.round(Math.PI * 80 * 80));
    expect(m!.measures.find((x) => x.key === 'centre')!.at).toEqual({ x: 300, y: 200 });
  });

  it('a rectangle has width, height, perimeter, area and aspect', () => {
    const m = built(rectStroke(100, 100, 200, 120));
    expect(get(m, 'width')).toBe(200);
    expect(get(m, 'height')).toBe(120);
    expect(get(m, 'perimeter')).toBe(640);
    expect(get(m, 'area')).toBe(24000);
  });

  it('a line has a length and a heading, up being 90°', () => {
    const m = built(lineStroke({ x: 100, y: 300 }, { x: 100, y: 100 }));
    expect(m!.shape).toBe('line');
    expect(get(m, 'length')).toBe(200);
    expect(get(m, 'heading')).toBe(90);
  });

  it('an arrow reports where it points, tail to tip', () => {
    const m = built(handArrow({ x: 100, y: 100 }, { x: 400, y: 100 }, { seed: 1 }));
    expect(m!.shape).toBe('arrow');
    expect(Math.abs(get(m, 'heading'))).toBeLessThan(6);
  });

  it('a triangle\'s angles sum to 180°', () => {
    const m = built(triangleStroke({ x: 200, y: 100 }, { x: 320, y: 300 }, { x: 80, y: 300 }));
    expect(m!.shape).toBe('triangle');
    const sum = ['angle0', 'angle1', 'angle2'].reduce((a, k) => a + get(m, k), 0);
    expect(Math.abs(sum - 180)).toBeLessThanOrEqual(2);
  });

  it('writing has no maths', () => {
    expect(built(handText(100, 100, 200, 40, { seed: 2 }))).toBeNull();
  });

  it('describes itself on one line', () => {
    const m = built(circleStroke(300, 200, 80));
    expect(describeMaths(m!)).toMatch(/^centre \(300, 200\) · radius 80px · circumference \d+px · area [\d,]+px²$/);
  });
});
