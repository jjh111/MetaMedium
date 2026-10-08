// The pendulum's physics (MATHS-SPEC §8 Lane D, M23): θ″ = −(g/L) sin θ, a bob on a
// rigid rod swinging in a plane, let go from rest.
//
// **Stepped, not solved.** The state is advanced by RK4 at a fixed small step
// (`PENDULUM_DT`), so a run is a pure function of its inputs and its step count:
// the same bits whether taken in one go or in pieces, on any machine, and a run
// can be re-derived from t = 0 or from a keyframe and arrive at the same state.
// Time is the step count times the step — nothing here reads a clock.
//
// **The period is exact, not measured.** For a swing let go at θ₀ it is
//
//     T = 4 √(L/g) K(sin(θ₀/2)) = 2π √(L/g) / AGM(1, cos(θ₀/2))
//
// by the arithmetic–geometric mean, which converges in a handful of rounds, so
// it needs no series and has no small-angle error. The small-angle 2π√(L/g) is
// said beside it, as the textbook's, because the two are what a teacher compares.
//
// Units are the SI the maths speaks: L in metres, g in m/s², θ in radians from
// plumb (positive to the right), ω in rad/s, T in seconds. The surface and the
// reading convert; this file knows nothing of pixels.

/** Standard gravity as the maths names it, m/s². */
export const GRAVITY = 9.81;

/**
 * The RK4 step, in seconds. At a metre's length ω₀·dt is 0.0065, and RK4's error is
 * of the fifth power of that per step: energy holds to better than a part in a
 * hundred million over a hundred seconds (pendulum.test.ts pins 1e-6).
 */
export const PENDULUM_DT = 1 / 480;

/** The state after `n` steps from rest: the angle from plumb, the angular speed, and how many steps made it. */
export interface PendulumState {
  n: number;
  theta: number;
  omega: number;
}

/** The arithmetic–geometric mean of two positive numbers, to the last bit a double holds. */
export function agm(a: number, b: number): number {
  for (let i = 0; i < 64; i++) {
    const m = (a + b) / 2;
    const g = Math.sqrt(a * b);
    if (m === a && g === b) return m;
    a = m;
    b = g;
    if (Math.abs(a - b) <= 4 * Number.EPSILON * Math.abs(a)) break;
  }
  return (a + b) / 2;
}

/** 2π√(L/g): the period for swings small enough that sin θ is θ. */
export function smallAnglePeriod(L: number, g: number = GRAVITY): number {
  return 2 * Math.PI * Math.sqrt(L / g);
}

/**
 * The exact period of a swing let go from rest at θ₀ (radians; the sign does not matter), in
 * seconds: 2π√(L/g) divided by AGM(1, cos(θ₀/2)). Longer than the small-angle period by a
 * factor that is 1.0019 at 10°, 1.018 at 30°, 1.18 at 90°.
 */
export function pendulumPeriod(L: number, theta0: number, g: number = GRAVITY): number {
  const a = Math.min(Math.abs(theta0), Math.PI - 1e-9);
  return smallAnglePeriod(L, g) / agm(1, Math.cos(a / 2));
}

/** A pendulum let go from rest at θ₀ (or thrown with ω₀), at step zero. */
export function pendulumStart(theta0: number, omega0 = 0): PendulumState {
  return { n: 0, theta: theta0, omega: omega0 };
}

/** One RK4 step of θ″ = −(g/L) sin θ of `dt` seconds. Pure: the state in is not changed. */
export function pendulumStep(s: PendulumState, dt: number, g: number, L: number): PendulumState {
  const k = g / L;
  const a = (th: number) => -k * Math.sin(th);
  const k1t = s.omega, k1w = a(s.theta);
  const k2t = s.omega + 0.5 * dt * k1w, k2w = a(s.theta + 0.5 * dt * k1t);
  const k3t = s.omega + 0.5 * dt * k2w, k3w = a(s.theta + 0.5 * dt * k2t);
  const k4t = s.omega + dt * k3w, k4w = a(s.theta + dt * k3t);
  return {
    n: s.n + 1,
    theta: s.theta + (dt / 6) * (k1t + 2 * k2t + 2 * k3t + k4t),
    omega: s.omega + (dt / 6) * (k1w + 2 * k2w + 2 * k3w + k4w),
  };
}

/** The energy per unit mass, J/kg: ½L²ω² + gL(1 − cos θ). Conserved by the motion, which is how a step is checked. */
export function pendulumEnergy(s: Pick<PendulumState, 'theta' | 'omega'>, L: number, g: number = GRAVITY): number {
  return 0.5 * L * L * s.omega * s.omega + g * L * (1 - Math.cos(s.theta));
}

/** Where the bob is from the pivot, y up: x = L sin θ and y = −L cos θ. */
export function pendulumPosition(theta: number, L: number): { x: number; y: number } {
  return { x: L * Math.sin(theta), y: -L * Math.cos(theta) };
}
