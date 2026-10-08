// A curve read (MATHS-SPEC §8 Lane C, M21): a stroke on a plane, read as a function.
//
// Red first: a parabola stroke reads first as y = x². Around it, what makes the reading honest: every family a
// school draws comes first for its own drawings at three sizes and four hands; the others are held below it with
// their reasons; a stroke the pen doubled back on is no function and is not fitted; the plane's scale rules the
// numbers; and the rounded form is offered only where it is within the drawing's own wobble.

import { describe, it, expect } from 'vitest';
import { planeOf } from './plot';
import type { PlaneGeometry } from './plot';
import { fitCurve, FIT_OFFER_FLOOR } from './fit';
import type { FitReading } from './fit';
import { compileFunction } from './fn';
import { CURVE_SPECS, handCurve } from './fixtures/curves';
import type { CurveSpec } from './fixtures/curves';
import { handCircle } from '../test/strokes';

const RECT = { minX: 100, maxX: 500, minY: 100, maxY: 400 };
const planeFor = (s: CurveSpec, k = 1): PlaneGeometry => planeOf({ x: s.xr, y: s.yr, rect: { minX: 100, maxX: 100 + 400 * k, minY: 100, maxY: 100 + 300 * k } });
const top = (r: ReturnType<typeof fitCurve>): FitReading => {
  if (!r.ok) throw new Error(r.reason);
  return r.fits[0];
};

describe('red first: a parabola stroke reads first as y = x²', () => {
  const s = CURVE_SPECS.find((c) => c.label === 'y = x²')!;
  const plane = planeFor(s);
  const stroke = handCurve(plane, s.fn, s.x0, s.x1, { seed: 3, jitter: 2.5 });
  const r = fitCurve(plane, stroke);

  it('first is a parabola, and the rounded form is y = x²', () => {
    const f = top(r);
    expect(f.family).toBe('parabola');
    expect(f.rounded?.text).toBe('y = x²');
    expect(f.best.text).toBe('y = x²');
    expect(f.confidence).toBeGreaterThan(FIT_OFFER_FLOOR);
  });
  it('says it in the person’s words: what it is, the numbers it was fitted to, how far off', () => {
    const f = top(r);
    expect(f.say).toMatch(/^a parabola, y = x², within \d+% of the span$/);
    expect(f.fitted.text).toMatch(/^y = (0\.9\d|1\.0\d?)x²( [+−] 0\.\d+)?$/);
    expect(f.reason).toMatch(/^a parabola needing [123] numbers?: the stroke is [\d.]+% of the span off it/);
  });
  it('is plural: the line and the others it also is are below it, or left out because they are worse', () => {
    if (!r.ok) throw new Error(r.reason);
    const families = r.fits.map((x) => x.family);
    expect(families[0]).toBe('parabola');
    expect(families).not.toContain('line');
    // A parabola is a poor cubic only by adding a term it does not need: that is the parabola, said once.
    expect(families.filter((f) => f === 'cubic')).toEqual([]);
    for (let i = 1; i < r.fits.length; i++) expect(r.fits[i].score).toBeGreaterThanOrEqual(r.fits[i - 1].score);
  });
});

describe('each family, drawn four ways at three sizes, is the first choice for its own drawings', () => {
  const hands = [{ seed: 1, jitter: 1.5 }, { seed: 2, jitter: 2.5 }, { seed: 3, jitter: 3 }, { seed: 4, jitter: 2, reverse: true }];
  const sizes = [0.6, 1, 1.8];
  it('first-choice rate per family', () => {
    const rates = new Map<string, { n: number; first: number; rounded: number; roundedWanted: number }>();
    const misses: string[] = [];
    for (const s of CURVE_SPECS) {
      for (const k of sizes) {
        for (const h of hands) {
          const plane = planeFor(s, k);
          const stroke = handCurve(plane, s.fn, s.x0, s.x1, { ...h, jitter: h.jitter * Math.min(1, k), step: 3 });
          const r = fitCurve(plane, stroke);
          const rate = rates.get(s.kind) ?? { n: 0, first: 0, rounded: 0, roundedWanted: 0 };
          rate.n++;
          rates.set(s.kind, rate);
          const f = r.ok ? r.fits[0] : undefined;
          // A level line is a line whatever it is called; a cosine is a sine.
          if (f && f.family === s.kind) rate.first++;
          else misses.push(`${s.label} ×${k} seed ${h.seed}: ${f ? `${f.family} ${f.best.text}` : r.ok ? 'nothing' : r.reason}`);
          if (s.rounds) {
            rate.roundedWanted++;
            if (f?.best.text === s.rounds) rate.rounded++;
          }
        }
      }
    }
    for (const [kind, r] of rates) console.log(`fit: ${kind.padEnd(11)} first ${r.first}/${r.n}, rounded as drawn ${r.rounded}/${r.roundedWanted}`);
    if (misses.length) console.log(misses.slice(0, 40).join('\n'));
    for (const [kind, r] of rates) expect(r.first / r.n, `${kind}: ${misses.filter((m) => m.includes(kind)).join(' | ')}`).toBeGreaterThanOrEqual(0.95);
  });
});

describe('the plane’s scale rules the numbers', () => {
  it('the same stroke on axes numbered twice as far reads y = 0.5x², not y = x²', () => {
    const s = CURVE_SPECS.find((c) => c.label === 'y = x²')!;
    const one = planeOf({ x: [-4, 4], y: [-1, 10], rect: RECT });
    const stroke = handCurve(one, s.fn, -3, 3, { seed: 5, jitter: 2 });
    expect(top(fitCurve(one, stroke)).best.text).toBe('y = x²');
    // Each axis numbered twice as far: x from −8 to 8, y from −2 to 20.
    const two = planeOf({ x: [-8, 8], y: [-2, 20], rect: RECT });
    expect(top(fitCurve(two, stroke)).best.text).toBe('y = 0.5x²');
  });
  it('says when the scale was assumed', () => {
    const s = CURVE_SPECS.find((c) => c.label === 'y = x²')!;
    const plane = planeFor(s);
    const stroke = handCurve(plane, s.fn, s.x0, s.x1, { seed: 1 });
    const r = fitCurve({ ...plane, x: { ...plane.x, how: 'assumed' } }, stroke);
    expect(r.ok && r.note).toMatch(/scale was assumed/);
  });
});

describe('a function of x or nothing', () => {
  const plane = planeOf({ x: [-4, 4], y: [-4, 4], rect: RECT });
  it('a loop is not fitted', () => {
    const r = fitCurve(plane, handCircle(300, 250, 70, { seed: 4 }));
    expect(r.ok).toBe(false);
    expect(!r.ok && r.reason).toMatch(/doubled back/);
    expect(r.fits).toEqual([]);
  });
  it('a stroke that turns back on itself midway is not fitted either', () => {
    const forward = handCurve(plane, (x) => x * 0.5, -3, 3, { seed: 1 });
    const back = handCurve(plane, (x) => x * 0.5 + 0.7, -1, 3, { seed: 2, reverse: true });
    const r = fitCurve(plane, [...forward, ...back]);
    expect(r.ok).toBe(false);
  });
  it('a vertical stroke, or a dot, is no curve of x', () => {
    const up = [] as { x: number; y: number }[];
    for (let i = 0; i < 40; i++) up.push({ x: 300 + (i % 2) * 0.5, y: 100 + i * 7 });
    expect(fitCurve(plane, up).ok).toBe(false);
    expect(fitCurve(plane, [{ x: 1, y: 1 }]).ok).toBe(false);
  });
  it('a scribble nothing here fits comes back ok, with no fit and the reason said', () => {
    // A staircase: monotone in x, but none of the six.
    const pts = [] as { x: number; y: number }[];
    for (let s = 0; s < 6; s++) for (let i = 0; i < 12; i++) pts.push({ x: 130 + s * 60 + i * 5, y: 380 - s * 50 - (i > 6 ? 40 : 0) });
    const r = fitCurve(plane, pts);
    expect(r.ok).toBe(true);
    if (r.ok && r.fits.length === 0) expect(r.note).toMatch(/no curve I know/);
  });
});

describe('the rounded form is the drawing’s precision, no finer', () => {
  it('a rough hand rounds further than a steady one', () => {
    const s = CURVE_SPECS.find((c) => c.label === 'y = 2x²')!;
    const plane = planeFor(s);
    const steady = fitCurve(plane, handCurve(plane, (x) => 2 * x * x + 0.04, s.x0, s.x1, { seed: 2, jitter: 0.5, sensorNoise: 0.1 }));
    const loose = fitCurve(plane, handCurve(plane, (x) => 2 * x * x + 0.3, s.x0, s.x1, { seed: 2, jitter: 4 }));
    expect(top(loose).best.text).toBe('y = 2x²');
    expect(top(steady).best.params.length).toBeLessThanOrEqual(2);
  });
  it('a rounded form is never further off than the wobble allows, and reads back through compileFunction', () => {
    for (const s of CURVE_SPECS) {
      const plane = planeFor(s);
      const f = top(fitCurve(plane, handCurve(plane, s.fn, s.x0, s.x1, { seed: 7, jitter: 2 })));
      for (const form of [f.fitted, f.rounded].filter((x) => !!x)) {
        const c = compileFunction(`y = ${form!.expr}`);
        expect(c.ok, `${s.label}: ${form!.text}`).toBe(true);
        if (!c.ok) continue;
        for (const x of [s.x0, (s.x0 + s.x1) / 2, s.x1]) {
          const want = form!.fn(x);
          // A rounded form is written exactly; a fitted one to two figures, which is within a twentieth of the plane's height.
          const tol = form === f.rounded ? 1e-3 : 0.05 * (s.yr[1] - s.yr[0]);
          expect(Math.abs(c.f(x)! - want), `${s.label}: ${form!.text} at ${x}`).toBeLessThanOrEqual(tol);
        }
      }
      if (f.rounded) expect(f.rounded.rms).toBeLessThanOrEqual(Math.max(f.fitted.rms * 1.5, f.fitted.rms + 0.012) + 1e-9);
    }
  });
  it('a stroke no plain numbers describe keeps the fitted form', () => {
    const plane = planeOf({ x: [-4, 4], y: [-1, 12], rect: RECT });
    const f = top(fitCurve(plane, handCurve(plane, (x) => 0.37 * x * x + 1.3, -3, 3, { seed: 3, jitter: 0.6, sensorNoise: 0.1 })));
    expect(f.family).toBe('parabola');
    // Either no rounding, or one the stroke cannot tell from the fit.
    if (f.rounded) expect(f.rounded.rms - f.fitted.rms).toBeLessThan(0.012);
  });
});

describe('costs', () => {
  it('reads a stroke in a few milliseconds', () => {
    const s = CURVE_SPECS.find((c) => c.label === 'y = sin x')!;
    const plane = planeFor(s);
    const stroke = handCurve(plane, s.fn, s.x0, s.x1, { seed: 1 });
    const t0 = performance.now();
    for (let i = 0; i < 20; i++) fitCurve(plane, stroke);
    const each = (performance.now() - t0) / 20;
    console.log(`fit: a sine stroke of ${stroke.length} points ${each.toFixed(1)} ms`);
    expect(each).toBeLessThan(80);
  });
});
