// The pendulum's physics (MATHS-SPEC §8 Lane D, M23): θ″ = −(g/L) sin θ by RK4 at a
// fixed small step, and its period exact, by the arithmetic–geometric mean.
//
// Pinned here, red first: L = 1 m and θ₀ = 10° give a period of 2.0099 s against
// 2.0061 s for small angles (MATHS-SPEC says "≈ 2.0102"; that is what 9.80665
// m/s² gives — at the 9.81 the same sentence names for g it is 2.0099, and the
// two agree to 3 parts in 10,000, which is what the spec's "≈" asks); the RK4
// integrator measures that same period; energy is conserved within 1e-6 over
// 100 s; and a run is a pure function of its inputs — the same steps, the same
// bits, whether taken in one go or in pieces.

import { describe, it, expect } from 'vitest';
import { GRAVITY, PENDULUM_DT, agm, pendulumEnergy, pendulumPeriod, pendulumPosition, pendulumStart, pendulumStep, smallAnglePeriod } from './pendulum';
import type { PendulumState } from './pendulum';

const rad = (d: number) => (d * Math.PI) / 180;

/** n fixed steps. */
function run(s: PendulumState, n: number, L = 1, g = GRAVITY): PendulumState {
  for (let i = 0; i < n; i++) s = pendulumStep(s, PENDULUM_DT, g, L);
  return s;
}

describe('the period', () => {
  it('is 2π√(L/g) for small angles: 2.0061 s for a metre', () => {
    expect(GRAVITY).toBe(9.81);
    expect(smallAnglePeriod(1)).toBeCloseTo(2.0061, 4);
    expect(pendulumPeriod(1, 0)).toBeCloseTo(smallAnglePeriod(1), 12);
  });

  it('is longer at 10°: 2.0099 s at g = 9.81, the spec’s “≈ 2.0102” to 3 parts in 10,000', () => {
    const T = pendulumPeriod(1, rad(10));
    expect(T).toBeCloseTo(2.0099, 4);
    expect(Math.abs(T - 2.0102)).toBeLessThan(5e-4);
    expect(T).toBeGreaterThan(smallAnglePeriod(1));
  });

  it('is the arithmetic–geometric mean: AGM(1, cos(θ₀/2)) divides the small-angle period', () => {
    expect(agm(1, 1)).toBe(1);
    // Gauss's constant is 1/AGM(1, √2) = 0.8346…; AGM(1, ½) = 0.72839551552… by the same iteration done by hand.
    expect(agm(1, 0.5)).toBeCloseTo(0.7283955155, 9);
    expect(1 / agm(1, Math.SQRT2)).toBeCloseTo(0.8346268416740731, 12);
    const th = rad(60);
    expect(pendulumPeriod(1, th)).toBeCloseTo(smallAnglePeriod(1) / agm(1, Math.cos(th / 2)), 12);
  });

  it('scales as √L and ignores the sign of the angle', () => {
    expect(pendulumPeriod(4, rad(10)) / pendulumPeriod(1, rad(10))).toBeCloseTo(2, 12);
    expect(pendulumPeriod(1, rad(-25))).toBe(pendulumPeriod(1, rad(25)));
  });

  it('grows without bound as the bob is pulled toward the top, and is finite below it', () => {
    // 2K(sin 45°)/π = 1.18034: the textbook ratio of a swing from the horizontal.
    expect(pendulumPeriod(1, rad(90)) / smallAnglePeriod(1)).toBeCloseTo(1.18034, 4);
    expect(Number.isFinite(pendulumPeriod(1, rad(170)))).toBe(true);
    expect(pendulumPeriod(1, rad(170))).toBeGreaterThan(pendulumPeriod(1, rad(90)));
  });
});

describe('the integrator', () => {
  it('measures the period the formula gives: a quarter swing to plumb, four times', () => {
    // Step until θ crosses zero, interpolate the crossing: that is T/4.
    for (const [deg, L] of [[10, 1], [30, 1], [60, 2.5]] as const) {
      let s = pendulumStart(rad(deg));
      let prev = s;
      let n = 0;
      while (s.theta > 0 && n < 10 * 480) {
        prev = s;
        s = pendulumStep(s, PENDULUM_DT, GRAVITY, L);
        n++;
      }
      const frac = prev.theta / (prev.theta - s.theta);
      const quarter = (n - 1 + frac) * PENDULUM_DT;
      expect(4 * quarter).toBeCloseTo(pendulumPeriod(L, rad(deg)), 4);
    }
  });

  it('conserves energy within 1e-6 over 100 s', () => {
    for (const deg of [10, 60, 120]) {
      const L = 1;
      let s = pendulumStart(rad(deg));
      const e0 = pendulumEnergy(s, L, GRAVITY);
      let worst = 0;
      for (let i = 0; i < 100 * 480; i++) {
        s = pendulumStep(s, PENDULUM_DT, GRAVITY, L);
        if (i % 480 === 0) worst = Math.max(worst, Math.abs(pendulumEnergy(s, L, GRAVITY) - e0) / e0);
      }
      worst = Math.max(worst, Math.abs(pendulumEnergy(s, L, GRAVITY) - e0) / e0);
      expect(s.n).toBe(100 * 480);
      expect(worst).toBeLessThan(1e-6);
    }
  });

  it('is a pure function of its inputs: the same bits whether taken in one go or in pieces, and again', () => {
    const a = run(pendulumStart(rad(35)), 12345);
    const b = run(run(run(pendulumStart(rad(35)), 5000), 7000), 345);
    const c = run(pendulumStart(rad(35)), 12345);
    expect(b).toEqual(a);
    expect(c).toEqual(a);
    expect(a.n).toBe(12345);
  });

  it('keeps a pendulum hanging plumb at rest, and swings one let go from the side symmetrically', () => {
    expect(run(pendulumStart(0), 4800).theta).toBe(0);
    const right = run(pendulumStart(rad(20)), 777);
    const left = run(pendulumStart(rad(-20)), 777);
    expect(left.theta).toBeCloseTo(-right.theta, 12);
  });

  it('stays in bounds: a bob let go at 170° swings back, never past where it started', () => {
    let s = pendulumStart(rad(170));
    let top = 0;
    for (let i = 0; i < 60 * 480; i++) {
      s = pendulumStep(s, PENDULUM_DT, GRAVITY, 1);
      top = Math.max(top, Math.abs(s.theta));
    }
    expect(top).toBeLessThanOrEqual(rad(170) + 1e-6);
  });
});

describe('where the bob is', () => {
  it('x = L sin θ and y = −L cos θ from the pivot, y up', () => {
    expect(pendulumPosition(0, 2)).toEqual({ x: 0, y: -2 });
    const p = pendulumPosition(rad(30), 2);
    expect(p.x).toBeCloseTo(1, 12);
    expect(p.y).toBeCloseTo(-Math.sqrt(3), 12);
  });
});
