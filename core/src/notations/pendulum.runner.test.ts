// The pendulum as a runner (MATHS-SPEC §8 Lane D, M23): what it takes in, how it is
// stepped, what it puts out, and how it is drawn while it swings.
//
//   - **Inputs.** L from a number written beside the rod (m, cm, or the drawing's own
//     unit), else from the drawing's scale, else 1 m assumed — and said; θ₀ from the rod's
//     drawn angle; g = 9.81 m/s².
//   - **Outputs.** θ, ω, x = L sin θ, y = −L cos θ, and the period exact beside the
//     small-angle one, each a named quantity (`run:<rod>:θ`).
//   - **Placements.** The rod and the bob turn about the pivot, rigidly: the rod's top end
//     is where it was drawn at every step, the bob's centre is L from it at the angle the
//     physics says, and the ceiling is not moved at all.

import { describe, it, expect } from 'vitest';
import { createSession, createStepper, runsIn, runnerHolds, runQuantity, traceOf, boardMaths, PENDULUM_RUNNER, pendulumPeriod, pendulumPosition } from '../index';
import type { Bounds, Point } from '../index';
import { drawPendulum } from './fixtures/pendulum';
import type { PendulumVariant } from './fixtures/pendulum';

const base: PendulumVariant = { seed: 7, jitter: 1.5, theta: 20, length: 220, pivot: 'hatched', bob: 'ring' };
const deg = (r: number) => (r * 180) / Math.PI;

function board(v: Partial<PendulumVariant> = {}, texts: { code: string; at: (e: ReturnType<typeof drawPendulum>) => Bounds }[] = []) {
  const s = createSession();
  const e = drawPendulum(s, { ...base, ...v }, 1000);
  texts.forEach((t, i) => s.import({ kind: 'text', path: `text/${i}.txt`, name: t.code, bounds: t.at(e), code: t.code, at: 60000 + i * 1000 }));
  const run = runsIn(s.getState(), undefined, () => boardMaths(s.getState())).find((r) => r.runner.id === 'pendulum')!;
  return { s, e, run };
}
const beside = (e: { pivotAt: Point; bobAt: Point }): Bounds => {
  const mid = { x: (e.pivotAt.x + e.bobAt.x) / 2, y: (e.pivotAt.y + e.bobAt.y) / 2 };
  return { minX: mid.x + 24, minY: mid.y - 12, maxX: mid.x + 90, maxY: mid.y + 12 };
};
/** A placement applied to a point: turned about (cx, cy), then moved — what the paint does. */
function placed(p: { dx: number; dy: number; angle: number; cx: number; cy: number }, at: Point): Point {
  const c = Math.cos(p.angle), sn = Math.sin(p.angle), vx = at.x - p.cx, vy = at.y - p.cy;
  return { x: p.cx + p.dx + vx * c - vy * sn, y: p.cy + p.dy + vx * sn + vy * c };
}

describe('what it takes in', () => {
  it('assumes a metre and says so, takes the angle from the drawing and g as 9.81', () => {
    const { run } = board();
    expect(run.inputs.L).toMatchObject({ value: 1, unit: 'm', from: 'assumed' });
    expect(run.inputs.L.reason).toBe('L = 1 m assumed — write a length beside the rod to change it');
    expect(run.inputs.g).toMatchObject({ value: 9.81, unit: 'm/s²', from: 'standard' });
    expect(run.inputs.theta0.from).toBe('drawn');
    expect(Math.abs(deg(run.inputs.theta0.value) - 20)).toBeLessThan(2);
    expect(run.inputs.theta0.reason).toMatch(/^drawn 20° from plumb$/);
  });

  it('takes L from a number written beside the rod, in metres, centimetres — as it is written', () => {
    for (const [code, metres, how] of [['2.5 m', 2.5, '2.5 m'], ['250 cm', 2.5, '250 cm'], ['0.8m', 0.8, '0.8 m']] as const) {
      const { run } = board({}, [{ code, at: beside }]);
      expect(run.inputs.L.from, code).toBe('written');
      expect(run.inputs.L.value, code).toBeCloseTo(metres, 9);
      expect(run.inputs.L.unit).toBe('m');
      expect(run.inputs.L.reason, code).toBe(`L = ${how}, as written beside the rod`);
    }
  });

  it('takes a bare number beside the rod as metres, and says there was no unit', () => {
    const { run } = board({}, [{ code: '3', at: beside }]);
    expect(run.inputs.L).toMatchObject({ value: 3, unit: 'm', from: 'written' });
    expect(run.inputs.L.reason).toMatch(/no unit, so taken as metres/);
  });

  it('leaves a number far from the rod, an angle and a radius alone', () => {
    const { run, e } = board({}, [
      { code: '9 m', at: () => ({ minX: 40, minY: 600, maxX: 100, maxY: 620 }) },
      { code: '20°', at: (x) => ({ minX: x.pivotAt.x + 30, minY: x.pivotAt.y + 40, maxX: x.pivotAt.x + 80, maxY: x.pivotAt.y + 64 }) },
    ]);
    void e;
    expect(run.inputs.L.from).toBe('assumed');
  });

  it('takes L from the drawing’s scale when a label elsewhere on it sets one: the bob’s radius written, the rod measured in it', () => {
    const { run, e } = board({}, [{ code: 'r = 5 cm', at: (x) => ({ minX: x.bobAt.x + 26, minY: x.bobAt.y - 18, maxX: x.bobAt.x + 82, maxY: x.bobAt.y + 6 }) }]);
    // The ring is about 22 px in radius: 5 cm over 22 px, and the rod about 220 px.
    expect(run.inputs.L.from).toBe('scale');
    expect(run.inputs.L.value).toBeGreaterThan(0.4);
    expect(run.inputs.L.value).toBeLessThan(0.6);
    expect(run.inputs.L.reason).toMatch(/^L = 0\.\d+ m, from the drawing’s scale \(one label sets the scale/);
    void e;
  });
});

describe('how it is stepped and what it puts out', () => {
  it('starts at the drawn angle at rest, with the period beside the small-angle one', () => {
    const { run } = board();
    const st = createStepper(run);
    const o = st.outputs();
    expect(o.θ.value).toBeCloseTo(run.inputs.theta0.value, 12);
    expect(o.ω.value).toBe(0);
    expect(o.T.value).toBeCloseTo(pendulumPeriod(1, run.inputs.theta0.value), 12);
    expect(o.T0.value).toBeCloseTo(2.00607, 5);
    expect(o.T.text).toBe('2.02 s');
    expect(o.x.value).toBeCloseTo(Math.sin(run.inputs.theta0.value), 12);
    expect(o.y.value).toBeCloseTo(-Math.cos(run.inputs.theta0.value), 12);
    expect(Object.keys(o).sort()).toEqual(['E', 'T', 'T0', 'x', 'y', 'θ', 'ω'].sort());
  });

  it('swings with the period it says: back where it was let go after T, through plumb a quarter of T in', () => {
    const { run } = board();
    const T = pendulumPeriod(run.inputs.L.value, run.inputs.theta0.value);
    const st = createStepper(run);
    st.seek(T / 4);
    expect(Math.abs(st.outputs().θ.value)).toBeLessThan(0.01);
    st.seek(T / 2);
    expect(st.outputs().θ.value).toBeCloseTo(-run.inputs.theta0.value, 3);
    st.seek(T);
    expect(st.outputs().θ.value).toBeCloseTo(run.inputs.theta0.value, 3);
  });

  it('holds energy over a hundred seconds, read back through its own outputs', () => {
    const { run } = board();
    const tr = traceOf(run, 100, 480);
    const e0 = tr[0].outputs.E.value;
    expect(tr.length).toBe(101);
    for (const f of tr) expect(Math.abs(f.outputs.E.value - e0) / e0).toBeLessThan(1e-6);
  });

  it('takes its length into the period: 2.5 m is 1.6 times as long as 1 m', () => {
    const one = board().run, long = board({}, [{ code: '2.5 m', at: beside }]).run;
    const T1 = createStepper(one).outputs().T.value, T2 = createStepper(long).outputs().T.value;
    expect(T2 / T1).toBeCloseTo(Math.sqrt(2.5), 9);
  });

  it('is deterministic: two steppers of one run agree to the bit, however they were stepped', () => {
    const { run } = board();
    const a = createStepper(run), b = createStepper(run);
    a.advanceSteps(5000);
    for (let i = 0; i < 50; i++) b.advanceSteps(100);
    expect(b.outputs()).toEqual(a.outputs());
  });

  it('names what it puts out run:<rod>:<name>, so written maths can use it', () => {
    const { run } = board();
    expect(runQuantity(run.reading.key, 'θ')).toBe(`run:${run.reading.key}:θ`);
    const readouts = createStepper(run).readouts();
    expect(readouts.map((r) => r.quantity)).toEqual([runQuantity(run.reading.key, 'T'), runQuantity(run.reading.key, 'θ')]);
  });

  it('says T, assumed length and all, and θ live, in the person’s words', () => {
    const { run } = board();
    const st = createStepper(run);
    const [T, th] = st.readouts();
    expect(T.text).toBe('T = 2.02 s · 1 m assumed');
    expect(T.live).toBe(false);
    expect(T.reason).toMatch(/^T = 2π√\(L\/g\) = 2\.02 s; for small swings it is 2\.01 s — L = 1 m assumed/);
    expect(th.live).toBe(true);
    // As drawn: the hand's 20°, to a degree.
    const drawn = `θ = ${deg(run.inputs.theta0.value).toFixed(1)}°`;
    expect(th.text).toBe(drawn);
    expect(Math.abs(deg(run.inputs.theta0.value) - 20)).toBeLessThan(1);
    st.advance(0.5);
    expect(st.readouts()[1].text).not.toBe(drawn);
    // Written, the length is not assumed.
    const w = board({}, [{ code: '2 m', at: beside }]).run;
    // 2π√(2/9.81) = 2.837 s, and a swing of 20° adds 0.76%.
    expect(createStepper(w).readouts()[0].text).toBe('T = 2.86 s');
  });
});

describe('how it is drawn while it swings', () => {
  it('turns the rod and the bob about the pivot, rigidly, and the pivot stays where it was drawn', () => {
    const { run, e } = board();
    const part = run.reading.data as { rod: string; bob: string; pivot: Point; bobAt: Point; length: number };
    const L = part.length;
    const st = createStepper(run);
    let worst = 0;
    for (let i = 0; i < 40; i++) {
      st.advance(0.07);
      const ps = st.placements();
      expect(ps.map((p) => p.id).sort()).toEqual([e.rod, e.bob].sort());
      const rod = ps.find((p) => p.id === e.rod)!, bob = ps.find((p) => p.id === e.bob)!;
      // The rod's top end — the pivot — stays.
      const top = placed(rod, part.pivot);
      expect(Math.hypot(top.x - part.pivot.x, top.y - part.pivot.y)).toBeLessThan(1e-9);
      // The bob's centre is L from it, at the angle the physics says.
      const c = placed(bob, part.bobAt);
      const th = st.outputs().θ.value;
      const want = { x: part.pivot.x + L * Math.sin(th), y: part.pivot.y + L * Math.cos(th) };
      worst = Math.max(worst, Math.hypot(c.x - want.x, c.y - want.y));
      expect(rod.angle).toBeCloseTo(bob.angle, 12);
      expect(rod.about).toEqual(part.pivot);
    }
    expect(worst).toBeLessThan(1e-9);
  });

  it('moves nothing at t = 0: the ink is where it was drawn', () => {
    const { run } = board();
    for (const p of createStepper(run).placements()) {
      expect(p.angle).toBeCloseTo(0, 12);
      expect(Math.hypot(p.dx, p.dy)).toBeLessThan(1e-9);
    }
  });

  it('moves no other mark: not the ceiling, not the hatching', () => {
    const { run, e } = board();
    const ids = createStepper(run).placements().map((p) => p.id);
    for (const id of e.pivot) expect(ids).not.toContain(id);
  });
});

describe('what the session asks of it', () => {
  it('holds the rod of a pendulum, and nothing else', () => {
    const { s, e } = board();
    const st = s.getState();
    expect(PENDULUM_RUNNER.holds(st, e.rod)).toBe(true);
    expect(PENDULUM_RUNNER.holds(st, e.bob)).toBe(false);
    expect(PENDULUM_RUNNER.holds(st, e.pivot[0])).toBe(false);
    expect(runnerHolds(st, e.rod)).toBe(true);
    expect(runnerHolds(st, 'stroke:no-such')).toBe(false);
  });

  it('reads a position the physics agrees with (pendulumPosition: y up)', () => {
    const { run } = board();
    const st = createStepper(run);
    st.advance(0.3);
    const o = st.outputs();
    const p = pendulumPosition(o.θ.value, run.inputs.L.value);
    expect(o.x.value).toBeCloseTo(p.x, 12);
    expect(o.y.value).toBeCloseTo(p.y, 12);
  });
});
