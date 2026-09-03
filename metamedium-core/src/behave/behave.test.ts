// The fourth rung: verbs as forces, walls as physics, a demonstration as a fit.

import { describe, it, expect } from 'vitest';
import { force, intents, type Body, type Term } from './verbs';
import { steer, step, seeded, worldOf } from './steer';
import { applyWalls, wallBoxes } from './walls';
import { fit } from './fit';

const body = (id: string, name: string, x: number, y: number, w = 20, h = 12, vx = 0, vy = 0): Body =>
  ({ id, name, x, y, vx, vy, w, h, heading: 0, age: 0, origin: { x, y } });

describe('verbs are forces with reasons', () => {
  it('seek points at the nearest thing of that name', () => {
    const me = body('m', 'mover', 0, 0);
    const w = worldOf(me, [body('a1', 'target-a', 300, 0), body('a2', 'target-a', -800, 0)], [], 0, 1 / 60, seeded(1));
    const f = force({ verb: 'seek', target: 'target-a', weight: 1 }, w);
    expect(f.fx).toBeGreaterThan(0);
    expect(Math.abs(f.fy)).toBeLessThan(1e-6);
    expect(f.reasoning).toMatch(/seeking a1 \(target-a\) 300px/);
  });
  it('flee points away, only from the bigger ones when asked, and fades with distance', () => {
    const me = body('m', 'mover', 0, 0, 20, 12);
    const big = body('b', 'target-b', 50, 0, 60, 40), small = body('s', 'target-b', -30, 0, 8, 6);
    const w = worldOf(me, [big, small], [], 0, 1 / 60, seeded(1));
    const f = force({ verb: 'flee', target: 'target-b', weight: 1, params: { only: 'bigger' } }, w);
    expect(f.fx).toBeLessThan(0);
    expect(f.reasoning).toMatch(/fleeing b/);
    const far = worldOf(me, [body('b', 'target-b', 900, 0, 60, 40)], [], 0, 1 / 60, seeded(1));
    expect(force({ verb: 'flee', target: 'target-b', weight: 1 }, far).fx).toBe(0);
  });
  it('drift pushes a constant direction; hold pulls back past its radius', () => {
    const me = body('m', 'mover', 0, 0);
    const w = worldOf(me, [], [], 0, 1 / 60, seeded(1));
    const up = force({ verb: 'drift', weight: 1, params: { direction: -90 } }, w);
    expect(up.fy).toBeLessThan(0);
    const out = body('m', 'mover', 500, 0); out.origin = { x: 0, y: 0 };
    const h = force({ verb: 'hold', weight: 1, params: { radius: 100 } }, worldOf(out, [], [], 0, 1 / 60, seeded(1)));
    expect(h.fx).toBeLessThan(0);
    expect(h.reasoning).toMatch(/past its 100px hold/);
  });
  it('consume and spawn are intents, raised on contact and on the interval', () => {
    const me = body('m', 'mover', 0, 0);
    const near = worldOf(me, [body('f', 'item', 8, 0, 6, 6)], [], 0, 1 / 60, seeded(1));
    expect(intents({ verb: 'consume', target: 'item', weight: 1 }, near)).toEqual([{ kind: 'consume', target: 'item', body: 'f' }]);
    const aged = { ...me, age: 4.005 };
    expect(intents({ verb: 'spawn', target: 'thing', weight: 1, params: { every: 4 } }, worldOf(aged, [], [], 4, 1 / 60, seeded(1)))).toHaveLength(1);
    expect(intents({ verb: 'spawn', target: 'thing', weight: 1, params: { every: 4 } }, worldOf({ ...me, age: 2 }, [], [], 2, 1 / 60, seeded(1)))).toHaveLength(0);
  });
  it('steer sums, clamps, and reports each term\'s share', () => {
    const me = body('m', 'mover', 0, 0);
    const w = worldOf(me, [body('a', 'target-a', 300, 0)], [], 0, 1 / 60, seeded(1));
    const s = steer({ terms: [{ verb: 'seek', target: 'target-a', weight: 1 }, { verb: 'drift', weight: 1, params: { direction: -90 } }], maxForce: 100 }, w);
    expect(Math.hypot(s.fx, s.fy)).toBeLessThanOrEqual(100 + 1e-6);
    expect(s.terms.reduce((a, t) => a + t.share, 0)).toBeCloseTo(1, 5);
  });
});

describe('walls are physics', () => {
  it('a body in contact with a wall is never stationary', () => {
    const boxes = wallBoxes([{ points: [{ x: 100, y: 0 }, { x: 140, y: 0 }, { x: 140, y: 400 }, { x: 100, y: 400 }], closed: true }]);
    let b = body('m', 'mover', 90, 200, 20, 12, 60, 0); // heading straight into the wall
    let state = { contactSteps: 0 };
    for (let i = 0; i < 120; i++) {
      const r = applyWalls(b, boxes, 1 / 60, state);
      state = r.state;
      b = { ...b, x: r.x + r.vx / 60, y: r.y + r.vy / 60, vx: r.vx, vy: r.vy, heading: Math.atan2(r.vy, r.vx) };
      expect(Math.hypot(b.vx, b.vy)).toBeGreaterThan(1);
      expect(b.x).toBeLessThan(100); // never inside
    }
  });
  it('a body stepping toward a wall slides along it and keeps its speed', () => {
    const walls = [{ points: [{ x: 200, y: -500 }, { x: 240, y: -500 }, { x: 240, y: 500 }, { x: 200, y: 500 }], closed: true }];
    let me = body('m', 'mover', 0, 0, 20, 12, 120, 0);
    const rng = seeded(3);
    let ws = { contactSteps: 0 };
    for (let i = 0; i < 240; i++) {
      const r = step({ terms: [{ verb: 'seek', target: 'target-a', weight: 1 }] }, worldOf(me, [body('a', 'target-a', 600, 0)], walls, i / 60, 1 / 60, rng), ws);
      me = r.body; ws = r.wallState;
    }
    expect(me.x).toBeLessThan(200);
    expect(Math.hypot(me.vx, me.vy)).toBeGreaterThan(10);
  });
});

describe('acting it out: the fit', () => {
  // A hand's path has no speed cap, so the demonstration is generated with
  // the caps out of reach; and the two targets pull in distinct directions so
  // no two columns of the basis are one line.
  const SPEED = 400;
  function demonstrate(terms: Term[], others: Body[], steps = 120) {
    let me = body('m', 'mover', 0, 0);
    const rng = seeded(7);
    const samples = [{ x: me.x, y: me.y, t: 0 }];
    for (let i = 0; i < steps; i++) {
      me = step({ terms, speed: SPEED, maxForce: 5000 }, worldOf(me, others, [], i / 30, 1 / 30, rng)).body;
      samples.push({ x: me.x, y: me.y, t: (i + 1) / 30 });
    }
    return samples;
  }
  const others = [body('a', 'target-a', 400, 40), body('b', 'target-b', 30, -70, 60, 40)];
  const worldAt = (t: number, me: Body) => worldOf(me, others, [], t, 1 / 30, seeded(7));

  it('recovers a two-verb mix from the path it produced, and nothing else', () => {
    const demo = demonstrate([{ verb: 'seek', target: 'target-a', weight: 1.0 }, { verb: 'flee', target: 'target-b', weight: 1.4 }], others);
    const r = fit(demo, ['seek', 'flee', 'drift', 'hold', 'home', 'school'], worldAt, SPEED);
    const seek = r.terms.find((t) => t.verb === 'seek' && t.target === 'target-a');
    const flee = r.terms.find((t) => t.verb === 'flee' && t.target === 'target-b');
    expect(seek, r.reasoning).toBeDefined();
    expect(flee, r.reasoning).toBeDefined();
    expect(Math.abs(seek!.weight - 1.0)).toBeLessThan(0.1);
    expect(Math.abs(flee!.weight - 1.4)).toBeLessThan(0.14);
    const others2 = r.terms.filter((t) => t !== seek && t !== flee);
    expect(others2.every((t) => t.weight <= 0.1), r.reasoning).toBe(true);
    expect(r.residual).toBeLessThan(0.15);
    expect(r.terms[0].reasoning).toMatch(/explains \d+%/);
  });

  it('prefers the fewest verbs: a one-verb path fits one verb', () => {
    const demo = demonstrate([{ verb: 'seek', target: 'target-a', weight: 1.0 }], others);
    const r = fit(demo, ['seek', 'flee', 'drift', 'hold', 'home', 'school'], worldAt, SPEED);
    expect(r.terms).toHaveLength(1);
    expect(r.terms[0].verb).toBe('seek');
  });

  it('says what is missing when nothing explains the motion', () => {
    const demo = Array.from({ length: 40 }, (_, i) => ({ x: 100 * Math.cos(i / 4), y: 100 * Math.sin(i / 4), t: i / 30 }));
    const r = fit(demo, ['seek', 'flee', 'drift'], (t, me) => worldOf(me, [], [], t, 1 / 30, seeded(1)));
    expect(r.terms).toHaveLength(0);
    expect(r.reasoning).toMatch(/no verb explains/);
  });
});
