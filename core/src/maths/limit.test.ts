// Limits (MATHS-SPEC lane B, M13): Jake's limit and the ones like it — substitution,
// then cancelling, then the known limits, then numerically from both sides; each
// result says how it was got (rule 12), and never evaluates exactly at the point.

import { describe, it, expect } from 'vitest';
import { limit, limitFromText, readLimit } from './limit';
import type { LimitResult } from './limit';

function lim(text: string, a: number, side?: 'left' | 'right' | 'both', variable = 'x'): Extract<LimitResult, { ok: true }> {
  const r = limit(text, variable, a, side);
  if (!r.ok) throw new Error(`${text}: ${r.reason}`);
  return r;
}

describe('Jake\'s limit: lim x→2 (x² − 4)/(x − 2) = 4', () => {
  const r = lim('(x^2-4)/(x-2)', 2);

  it('is 4, by factoring, with the steps written out', () => {
    expect(r.value).toBe(4);
    expect(r.exact).toBe('4');
    expect(r.kind).toBe('finite');
    expect(r.method).toBe('factoring');
    expect(r.reason).toMatch(/^by factoring/);
    expect(r.steps.map((s) => s.kind)).toEqual(['substitute', 'factor', 'cancel', 'substitute']);
    expect(r.steps.map((s) => s.text)).toEqual([
      '(x² − 4)/(x − 2) at x = 2 is 0/0',
      '(x + 2)(x − 2)/(x − 2)',
      '(x + 2)(x − 2)/(x − 2) = x + 2',
      'x + 2 at x = 2 is 4',
    ]);
    expect(r.steps[2].struck).toEqual(['x − 2']);
    expect(r.steps[2].excludes).toBe('x ≠ 2');
  });

  it('gives the approach from both sides, never touching 2', () => {
    const a = r.approach!;
    expect(a.agree).toBe(true);
    expect(a.left.points.slice(0, 3).map((p) => p.x)).toEqual([1.9, 1.99, 1.999]);
    expect(a.left.points.slice(0, 3).map((p) => p.y)).toEqual([3.9, 3.99, 3.999]);
    expect(a.right.points.slice(0, 3).map((p) => p.x)).toEqual([2.1, 2.01, 2.001]);
    expect(a.right.points.slice(0, 3).map((p) => p.y)).toEqual([4.1, 4.01, 4.001]);
    for (const p of [...a.left.points, ...a.right.points]) expect(p.x).not.toBe(2);
    expect(a.left.settles).toBeCloseTo(4, 4);
    expect(a.right.settles).toBeCloseTo(4, 4);
  });

  it('the cubic: lim x→2 (x³ − 8)/(x − 2) = 12', () => {
    const c = lim('(x^3-8)/(x-2)', 2);
    expect(c.value).toBe(12);
    expect(c.method).toBe('factoring');
    expect(c.steps.map((s) => s.text)).toContain('(x − 2)(x² + 2x + 4)/(x − 2) = x² + 2x + 4');
    expect(lim('(x^3-1)/(x-1)', 1).value).toBe(3);
  });

  it('a rational limit that is not a whole number is exact', () => {
    const c = lim('(x^2-1)/(2x^2-2x)', 1);
    expect(c.value).toBe(1);
    const d = lim('(x^2-9)/(x^2-5x+6)', 3);
    expect(d.value).toBe(6);
    const e = lim('(2x^2-8)/(3x-6)', 2);
    expect(e.exact).toBe('8/3');
    expect(e.value).toBeCloseTo(8 / 3, 12);
  });
});

describe('by substitution', () => {
  it('x² + 1 at 3 is 10', () => {
    const r = lim('x^2+1', 3);
    expect(r).toMatchObject({ value: 10, method: 'substitution', kind: 'finite' });
    expect(r.reason).toMatch(/^by substitution/);
  });

  it('a function defined on one side only has a one-sided limit', () => {
    const r = lim('√x', 0);
    expect(r.kind).toBe('does not exist');
    expect(r.value).toBeNull();
    expect(r.reason).toMatch(/left/);
    const right = lim('√x', 0, 'right');
    expect(right).toMatchObject({ value: 0, kind: 'finite' });
    const left = limit('√x', 'x', 0, 'left');
    expect(left.ok && left.kind).toBe('does not exist');
  });

  it('a number over zero is infinite, and the signs on the two sides are said', () => {
    const r = lim('1/x', 0);
    expect(r.kind).toBe('does not exist');
    expect(r.sides).toEqual({ left: -Infinity, right: Infinity });
    expect(r.reason).toMatch(/opposite/);
    expect(lim('1/x', 0, 'right')).toMatchObject({ value: Infinity, kind: 'infinite' });
    expect(lim('1/x', 0, 'left')).toMatchObject({ value: -Infinity, kind: 'infinite' });
    expect(lim('1/x^2', 0)).toMatchObject({ value: Infinity, kind: 'infinite' });
    expect(lim('-1/x^2', 0)).toMatchObject({ value: -Infinity, kind: 'infinite' });
    expect(lim('(x+1)/(x-2)^2', 2)).toMatchObject({ value: Infinity, kind: 'infinite' });
  });
});

describe('the known limits', () => {
  it('sin x / x at 0 is 1 — known, and confirmed numerically', () => {
    const r = lim('sin(x)/x', 0);
    expect(r).toMatchObject({ value: 1, exact: '1', method: 'known', kind: 'finite', confirmed: true });
    expect(r.reason).toMatch(/known limit/);
    expect(r.reason).toMatch(/confirmed numerically/);
    expect(r.approach!.right.points[0].y).toBeCloseTo(0.998334, 5);
    expect(r.approach!.right.points[2].y).toBeCloseTo(0.99999983, 7);
    expect(r.steps.some((s) => s.kind === 'known')).toBe(true);
  });

  it('scaled and shifted forms', () => {
    expect(lim('sin(3x)/x', 0)).toMatchObject({ value: 3, method: 'known', confirmed: true });
    expect(lim('sin(2x)/(3x)', 0)).toMatchObject({ exact: '2/3', method: 'known' });
    expect(lim('sin(x-2)/(x-2)', 2)).toMatchObject({ value: 1, method: 'known' });
    expect(lim('tan(x)/x', 0)).toMatchObject({ value: 1, method: 'known' });
    expect(lim('x/sin(x)', 0)).toMatchObject({ value: 1 });
  });

  it('(1 − cos x)/x, (1 − cos x)/x², (eˣ − 1)/x, ln(1 + x)/x', () => {
    expect(lim('(1-cos(x))/x', 0)).toMatchObject({ value: 0, method: 'known', confirmed: true });
    expect(lim('(1-cos(x))/x^2', 0)).toMatchObject({ exact: '1/2', method: 'known', confirmed: true });
    expect(lim('(exp(x)-1)/x', 0)).toMatchObject({ value: 1, method: 'known', confirmed: true });
    expect(lim('(e^x-1)/x', 0)).toMatchObject({ value: 1, method: 'known', confirmed: true });
    expect(lim('ln(1+x)/x', 0)).toMatchObject({ value: 1, method: 'known', confirmed: true });
  });

  it('(1 + 1/x)ˣ as x grows is e', () => {
    const r = lim('(1+1/x)^x', Infinity);
    expect(r.method).toBe('known');
    expect(r.exact).toBe('e');
    expect(r.value).toBeCloseTo(Math.E, 12);
    expect(r.confirmed).toBe(true);
    expect(lim('(1+x)^(1/x)', 0).exact).toBe('e');
  });

  it('a known limit the numbers do not confirm is not claimed', () => {
    // sin(x)/x at 1 is just sin 1: substitution gets there first, the known limit never applies
    expect(lim('sin(x)/x', 1).method).toBe('substitution');
  });
});

describe('numerically from both sides', () => {
  it('(√(x+4) − 2)/x at 0 is 1/4, and the reason says it is numeric', () => {
    const r = lim('(sqrt(x+4)-2)/x', 0);
    expect(r.method).toBe('numeric');
    expect(r.value).toBeCloseTo(0.25, 6);
    expect(r.exact).toBe('1/4');
    expect(r.reason).toMatch(/numerically from both sides/);
    expect(r.approach!.agree).toBe(true);
  });

  it('sides that disagree: |x|/x at 0', () => {
    const r = lim('abs(x)/x', 0);
    expect(r.kind).toBe('does not exist');
    expect(r.value).toBeNull();
    expect(r.sides).toEqual({ left: -1, right: 1 });
    expect(r.approach!.agree).toBe(false);
    expect(r.reason).toMatch(/left.*−1.*right.*1/);
    expect(lim('abs(x)/x', 0, 'right')).toMatchObject({ value: 1, kind: 'finite' });
    expect(lim('abs(x)/x', 0, 'left')).toMatchObject({ value: -1, kind: 'finite' });
  });

  it('a function that does not settle: sin(1/x) at 0', () => {
    const r = lim('sin(1/x)', 0);
    expect(r.kind).toBe('does not exist');
    expect(r.value).toBeNull();
    expect(r.reason).toMatch(/does not settle/);
  });

  it('a one-sided infinite limit found by sampling: ln(x) at 0 from the right', () => {
    const r = lim('ln(x)', 0, 'right');
    expect(r).toMatchObject({ value: -Infinity, kind: 'infinite', method: 'numeric' });
  });
});

describe('at infinity', () => {
  it('rational functions by their leading terms', () => {
    expect(lim('(3x^2+1)/(x^2-5)', Infinity)).toMatchObject({ value: 3, method: 'factoring' });
    expect(lim('(3x^2+1)/(x^2-5)', -Infinity).value).toBe(3);
    expect(lim('(x+1)/x^2', Infinity)).toMatchObject({ value: 0, exact: '0' });
    expect(lim('x^2/(x+1)', Infinity)).toMatchObject({ value: Infinity, kind: 'infinite' });
    expect(lim('x^3/(x^2+1)', -Infinity)).toMatchObject({ value: -Infinity, kind: 'infinite' });
    expect(lim('x^3/(x+1)', Infinity).reason).toMatch(/highest power/);
    expect(lim('x^3/(x+1)', -Infinity).value).toBe(Infinity); // ~x², positive at both ends
  });

  it('a decay to zero: e^(−x) and sin(x)/x', () => {
    const r = lim('exp(-x)', Infinity);
    expect(r.value).toBeCloseTo(0, 6);
    const s = lim('sin(x)/x', Infinity);
    expect(s.value).toBeCloseTo(0, 5);
    expect(s.method).toBe('numeric');
  });
});

describe('a place that is a fraction in a double', () => {
  it('1/3 is found as one third, so (3x − 1)/(9x² − 1) cancels there', () => {
    const r = lim('(3x-1)/(9x^2-1)', 1 / 3);
    expect(r).toMatchObject({ method: 'factoring', exact: '1/2' });
    expect(r.value).toBeCloseTo(0.5, 12);
    expect(limitFromText('lim x→1/3 (3x-1)/(9x^2-1)')).toMatchObject({ ok: true, exact: '1/2' });
  });
});

describe('a limit written out is read and worked', () => {
  it('lim x→2 (x²−4)/(x−2) is Jake\'s 4', () => {
    const r = limitFromText('lim x→2 (x²−4)/(x−2)');
    expect(r).toMatchObject({ ok: true, value: 4, method: 'factoring' });
    expect(limitFromText('lim x→0 sin x / x')).toMatchObject({ ok: true, value: 1, method: 'known' });
    expect(limitFromText('lim x→0⁺ 1/x')).toMatchObject({ ok: true, value: Infinity, kind: 'infinite' });
    expect(limitFromText('lim x→∞ (1+1/x)^x')).toMatchObject({ ok: true, exact: 'e' });
    expect(limitFromText('nothing')).toMatchObject({ ok: false });
  });
});

describe('reading and refusing', () => {
  it('reads the notation a person writes', () => {
    expect(readLimit('lim x→2 (x²−4)/(x−2)')).toEqual({ ok: true, expression: '(x²−4)/(x−2)', variable: 'x', at: 2, side: 'both' });
    expect(readLimit('lim_{x→0} sin x / x')).toMatchObject({ ok: true, variable: 'x', at: 0, expression: 'sin x / x' });
    expect(readLimit('limit as t -> 3 of t^2')).toMatchObject({ ok: true, variable: 't', at: 3, expression: 't^2' });
    expect(readLimit('lim x→0⁺ 1/x')).toMatchObject({ ok: true, at: 0, side: 'right' });
    expect(readLimit('lim x→0⁻ 1/x')).toMatchObject({ ok: true, at: 0, side: 'left' });
    expect(readLimit('lim x→∞ (1+1/x)^x')).toMatchObject({ ok: true, at: Infinity });
    expect(readLimit('lim x→-∞ 1/x')).toMatchObject({ ok: true, at: -Infinity });
    expect(readLimit('lim x→1/2 2x')).toMatchObject({ ok: true, at: 0.5 });
    expect(readLimit('lim x→π sin x')).toMatchObject({ ok: true, at: Math.PI });
    expect(readLimit('hello').ok).toBe(false);
    expect(readLimit('lim x→2').ok).toBe(false);
  });

  it('limit() takes a text, a read limit, and says why when it cannot', () => {
    expect(limit('(x^2-4)/(x-2', 'x', 2).ok).toBe(false);
    const bad = limit('foo(x)/x', 'x', 0);
    expect(bad.ok).toBe(false);
    expect(!bad.ok && bad.reason).toMatch(/foo/);
    const nan = limit('x', 'x', Number.NaN);
    expect(nan.ok).toBe(false);
    // another letter in the way, with nothing known about it
    const y = limit('x*y', 'x', 2);
    expect(y.ok).toBe(false);
    expect(!y.ok && y.reason).toMatch(/y/);
  });

  it('a limit in another variable, and one with a name for a constant', () => {
    expect(limit('(t^2-9)/(t-3)', 't', 3)).toMatchObject({ ok: true, value: 6 });
    expect(limit('π x', 'x', 2)).toMatchObject({ ok: true, method: 'substitution' });
  });
});

// The exact methods against the numbers, on seeded random ratios of polynomials (the same every run).
describe('properties of the limits', () => {
  let seed = 21;
  const rnd = () => {
    seed = (seed * 1664525 + 1013904223) % 4294967296;
    return seed / 4294967296;
  };
  const ri = (a: number, b: number) => a + Math.floor(rnd() * (b - a + 1));
  const lin = (r: number) => (r === 0 ? 'x' : r > 0 ? `(x-${r})` : `(x+${-r})`);
  const ratioText = (extra: string) => {
    const nr = Array.from({ length: ri(0, 3) }, () => ri(-3, 3));
    const dr = Array.from({ length: ri(1, 3) }, () => ri(-3, 3));
    return `(${nr.map(lin).concat([extra]).join('*')})/(${dr.map(lin).join('*')})`;
  };

  it('every exact limit at a place agrees with where the samples either side are heading (400 ratios, either side or both)', () => {
    let disagree = 0;
    for (let i = 0; i < 400; i++) {
      const side = (['both', 'left', 'right'] as const)[ri(0, 2)];
      const r = limit(ratioText('(x^2+1)'), 'x', ri(-3, 3), side);
      if (!r.ok) {
        disagree++;
        continue;
      }
      const ap = r.approach!;
      const used = side === 'both' ? [ap.left, ap.right] : side === 'left' ? [ap.left] : [ap.right];
      const heads = used.map((s) => s.settles);
      if (r.kind === 'finite') {
        if (!heads.every((h) => h !== null && Math.abs(h - r.value!) <= 1e-3 * Math.max(1, Math.abs(r.value!)))) disagree++;
      } else if (r.kind === 'infinite') {
        if (!heads.every((h) => h === r.value)) disagree++;
      } else if (side !== 'both' || (heads[0] === heads[1] && heads[0] !== null)) disagree++;
    }
    expect(disagree).toBe(0);
  });

  it('and out at infinity, either way (300 ratios)', () => {
    let disagree = 0;
    for (let i = 0; i < 300; i++) {
      for (const a of [Infinity, -Infinity]) {
        const r = limit(ratioText('(2x^2+1)'), 'x', a);
        if (!r.ok) {
          disagree++;
          continue;
        }
        const heads = (a > 0 ? r.approach!.left : r.approach!.right).settles;
        const ok = r.kind === 'finite' ? heads !== null && Math.abs(heads - r.value!) <= 2e-3 * Math.max(1, Math.abs(r.value!)) : r.kind === 'infinite' && heads === r.value;
        if (!ok) disagree++;
      }
    }
    expect(disagree).toBe(0);
  });
});
