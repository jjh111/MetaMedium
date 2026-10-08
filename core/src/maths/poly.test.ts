// Polynomials and rational functions (MATHS-SPEC lane B, M12): exact over the
// rationals, school algebra in one variable, and what is left when a rational
// function is cancelled — its holes and its poles.

import { describe, it, expect } from 'vitest';
import { factor, expand, analyseRational, polyFromNumbers, polyText, polyGcd, polyDivide, polyDegree, rat, ratText, parsePoly, realRoots } from './poly';

const factored = (t: string) => {
  const r = factor(t);
  if (!r.ok) throw new Error(`${t}: ${r.reason}`);
  return r;
};

describe('factor over the rationals', () => {
  it('x^3-1 is (x − 1)(x² + x + 1) — the difference of cubes', () => {
    const r = factored('x^3-1');
    expect(r.text).toBe('(x − 1)(x² + x + 1)');
    expect(r.complete).toBe(true);
    expect(r.reason).toMatch(/rational root/);
  });

  it('sums and differences of cubes and squares', () => {
    expect(factored('x^3+8').text).toBe('(x + 2)(x² − 2x + 4)');
    expect(factored('8x^3-27').text).toBe('(2x − 3)(4x² + 6x + 9)');
    expect(factored('x^2-4').text).toBe('(x + 2)(x − 2)');
    expect(factored('x^2-9').text).toBe('(x + 3)(x − 3)');
    expect(factored('x^4-1').text).toBe('(x + 1)(x − 1)(x² + 1)');
    expect(factored('x^6-1').text).toBe('(x + 1)(x − 1)(x² − x + 1)(x² + x + 1)');
  });

  it('a content, a sign, a repeated factor, a power of x', () => {
    expect(factored('2x^2-2').text).toBe('2(x + 1)(x − 1)');
    expect(factored('-x^2+4').text).toBe('−(x + 2)(x − 2)');
    expect(factored('x^2-2x+1').text).toBe('(x − 1)²');
    expect(factored('x^3-x').text).toBe('x(x + 1)(x − 1)');
    expect(factored('x^3').text).toBe('x³');
    expect(factored('x^3-3x^2+3x-1').text).toBe('(x − 1)³');
    expect(factored('x^2+x').text).toBe('x(x + 1)');
    expect(factored('3x^2+6x').text).toBe('3x(x + 2)');
  });

  it('leading coefficients and rational coefficients', () => {
    expect(factored('6x^2+x-2').text).toBe('(3x + 2)(2x − 1)');
    expect(factored('0.5x^2-2').text).toBe('(1/2)(x + 2)(x − 2)');
    expect(factored('x^2-1/4').text).toBe('(1/4)(2x + 1)(2x − 1)');
    expect(factored('x^2/2 - 2').text).toBe('(1/2)(x + 2)(x − 2)');
  });

  it('what has no rational factor is left whole, and said to be', () => {
    for (const t of ['x^2+1', 'x^2-2', 'x^3-2', 'x^2+x+1', 'x^4+x+1']) {
      const r = factored(t);
      expect(r.factors, t).toHaveLength(1);
      expect(r.complete, t).toBe(true);
      expect(r.reason, t).toMatch(/no (rational )?factor|irreducible|cannot be split/);
    }
    expect(factored('x^2+1').text).toBe('x² + 1');
  });

  it('quartics that split into quadratics', () => {
    expect(factored('x^4+4').text).toBe('(x² − 2x + 2)(x² + 2x + 2)');
    expect(factored('x^4+x^2+1').text).toBe('(x² − x + 1)(x² + x + 1)');
    expect(factored('x^4-5x^2+4').text).toBe('(x + 2)(x + 1)(x − 1)(x − 2)');
  });

  it('a constant, a line, and what is not a polynomial', () => {
    expect(factored('7').text).toBe('7');
    expect(factored('x+3').text).toBe('x + 3');
    expect(factor('sin(x)').ok).toBe(false);
    expect(!factor('sin(x)').ok && (factor('sin(x)') as { reason: string }).reason).toMatch(/not a polynomial/);
    expect(factor('1/x').ok).toBe(false);
    expect(factor('x^0.5').ok).toBe(false);
    expect(factor('x^-1').ok).toBe(false);
    expect(factor('x*y').ok).toBe(false);
    expect(factor('').ok).toBe(false);
  });

  it('works in whatever variable it is written in', () => {
    const r = factor('t^2-9', 't');
    expect(r.ok && r.text).toBe('(t + 3)(t − 3)');
    const auto = factor('t^2-9');
    expect(auto.ok && auto.text).toBe('(t + 3)(t − 3)');
  });

  it('factors multiply back to the polynomial', () => {
    for (const t of ['x^3-1', '6x^2+x-2', 'x^4+4', 'x^6-1', '2x^3-3x^2-11x+6', 'x^5-x', '4x^4-1']) {
      const r = factored(t);
      const e = expand(r.text);
      const orig = expand(t);
      expect(e.ok && orig.ok && e.text, t).toBe(orig.ok ? orig.text : '');
    }
  });
});

describe('expand, divide, gcd', () => {
  it('expands products and powers', () => {
    const e = (t: string) => {
      const r = expand(t);
      return r.ok ? r.text : r.reason;
    };
    expect(e('(x+1)(x-1)')).toBe('x² − 1');
    expect(e('(x+1)^3')).toBe('x³ + 3x² + 3x + 1');
    expect(e('(x-2)(x+2)(x^2+4)')).toBe('x⁴ − 16');
    expect(e('2(x+3)')).toBe('2x + 6');
    expect(e('(2x+1)/2')).toBe('x + 1/2');
    expect(e('x(x+1)')).toBe('x² + x');
    expect(e('(x+1)^2 - (x-1)^2')).toBe('4x');
    expect(e('0.1x + 0.2x')).toBe('(3/10)x');
    expect(e('x - x')).toBe('0');
  });

  it('divides with a remainder, exactly', () => {
    const a = parsePoly('x^3-1');
    const b = parsePoly('x-1');
    if (!a.ok || !b.ok) throw new Error('parse');
    const { quotient, remainder } = polyDivide(a.poly, b.poly)!;
    expect(polyText(quotient)).toBe('x² + x + 1');
    expect(remainder).toEqual([]);
    const c = parsePoly('x^2+1');
    if (!c.ok) throw new Error('parse');
    const d = polyDivide(c.poly, b.poly)!;
    expect(polyText(d.quotient)).toBe('x + 1');
    expect(polyText(d.remainder)).toBe('2');
    expect(polyDivide(c.poly, [])).toBeNull();
  });

  it('gcd is monic', () => {
    const a = parsePoly('x^2-4');
    const b = parsePoly('x^2-x-2');
    if (!a.ok || !b.ok) throw new Error('parse');
    expect(polyText(polyGcd(a.poly, b.poly))).toBe('x − 2');
    expect(polyText(polyGcd(polyFromNumbers([2, 4]), polyFromNumbers([6, 12])))).toBe('x + 1/2');
  });

  it('coefficients are exact rationals', () => {
    expect(ratText(rat(6n, -4n))).toBe('−3/2');
    expect(polyDegree(polyFromNumbers([1, 0, 0, 5]))).toBe(3);
    expect(polyDegree([])).toBe(-Infinity);
    expect(polyText(polyFromNumbers([0.5, 0.25]))).toBe('(1/4)x + 1/2');
  });

  it('real roots, exact where they are rational and numeric where not', () => {
    const p = parsePoly('x^3-2x^2-x+2');
    if (!p.ok) throw new Error('parse');
    expect(realRoots(p.poly).map((r) => Math.round(r * 1e9) / 1e9)).toEqual([-1, 1, 2]);
    const q = parsePoly('x^2-2');
    if (!q.ok) throw new Error('parse');
    const rs = realRoots(q.poly);
    expect(rs).toHaveLength(2);
    expect(rs[0]).toBeCloseTo(-Math.SQRT2, 10);
    expect(rs[1]).toBeCloseTo(Math.SQRT2, 10);
    const none = parsePoly('x^2+1');
    if (!none.ok) throw new Error('parse');
    expect(realRoots(none.poly)).toEqual([]);
  });
});

describe('rational functions: cancelled, and what is left', () => {
  const analysed = (t: string) => {
    const a = analyseRational(t);
    if (!a.ok) throw new Error(`${t}: ${a.reason}`);
    return a;
  };

  it('(x²−4)/(x−2) has a hole at (2, 4) and no pole', () => {
    const a = analysed('(x^2-4)/(x-2)');
    expect(a.cancelled).toBe('x − 2');
    expect(a.reduced).toBe('x + 2');
    expect(a.holes).toEqual([{ x: 2, y: 4, exactX: '2', exactY: '4', factor: 'x − 2' }]);
    expect(a.poles).toEqual([]);
  });

  it('a hole and a pole together', () => {
    const a = analysed('(x^2-1)/(x^2-x)');
    expect(a.reduced).toBe('(x + 1)/x');
    expect(a.holes.map((h) => [h.x, h.y])).toEqual([[1, 2]]);
    expect(a.poles.map((p) => p.x)).toEqual([0]);
  });

  it('the cubic of Jake\'s limit: (x³−8)/(x−2) has a hole at (2, 12)', () => {
    const a = analysed('(x^3-8)/(x-2)');
    expect(a.reduced).toBe('x² + 2x + 4');
    expect(a.holes.map((h) => [h.x, h.y])).toEqual([[2, 12]]);
  });

  it('poles, their order and which way the curve goes either side', () => {
    const a = analysed('1/(x^2-1)');
    expect(a.poles.map((p) => p.x)).toEqual([-1, 1]);
    expect(a.poles.map((p) => p.order)).toEqual([1, 1]);
    // 1/(x²−1): just left of −1 it is positive, just right negative; just left of 1 negative, right positive
    expect(a.poles[0].sides).toEqual(['+∞', '−∞']);
    expect(a.poles[1].sides).toEqual(['−∞', '+∞']);
    const b = analysed('(x+1)/(x-2)^2');
    expect(b.poles.map((p) => [p.x, p.order, p.sides])).toEqual([[2, 2, ['+∞', '+∞']]]);
    expect(analysed('1/(x^2+1)').poles).toEqual([]);
  });

  it('a factor that cancels completely leaves a hole, not a pole', () => {
    const a = analysed('x/x');
    expect(a.holes.map((h) => [h.x, h.y])).toEqual([[0, 1]]);
    expect(a.poles).toEqual([]);
    const b = analysed('(x-2)/(x-2)^2');
    expect(b.holes).toEqual([]);
    expect(b.poles.map((p) => [p.x, p.order])).toEqual([[2, 1]]);
  });

  it('holes and poles with irrational places are numeric, and say so', () => {
    const a = analysed('(x^2-2)/(x^2-2)');
    expect(a.holes.map((h) => h.y)).toEqual([1, 1]);
    expect(a.holes[0].x).toBeCloseTo(-Math.SQRT2, 9);
    expect(a.holes[0].exactX).toBeUndefined();
  });

  it('the end behaviour: horizontal, slant, none', () => {
    expect(analysed('(3x^2+1)/(x^2-5)').end).toEqual({ kind: 'horizontal', y: 3, text: 'y = 3' });
    expect(analysed('1/x').end).toEqual({ kind: 'horizontal', y: 0, text: 'y = 0' });
    expect(analysed('(x^2+1)/x').end).toEqual({ kind: 'slant', slope: 1, intercept: 0, text: 'y = x' });
    expect(analysed('(x^3+2x)/(x^2+1)').end).toEqual({ kind: 'slant', slope: 1, intercept: 0, text: 'y = x' });
    expect(analysed('(x^2-3x)/(x-1)').end).toEqual({ kind: 'slant', slope: 1, intercept: -2, text: 'y = x − 2' });
    expect(analysed('x^3/(x+1)').end).toEqual({ kind: 'none', text: 'grows faster than a line' });
  });

  it('a polynomial is a rational function with nothing to cancel', () => {
    const a = analysed('x^2-4');
    expect(a.holes).toEqual([]);
    expect(a.poles).toEqual([]);
    expect(a.cancelled).toBe('');
  });

  it('refuses what is not a ratio of polynomials', () => {
    const a = analyseRational('sin(x)/x');
    expect(a.ok).toBe(false);
    expect(!a.ok && a.reason).toMatch(/not a ratio of polynomials/);
    expect(analyseRational('x/0').ok).toBe(false);
    expect(analyseRational('2^x').ok).toBe(false);
  });

  it('the reduced function agrees with the original everywhere it is defined', () => {
    const a = analysed('(x^2-4)/(x-2)');
    for (const x of [-3, -0.5, 0, 1.5, 2.5, 7]) expect(a.reducedFn(x)).toBeCloseTo((x * x - 4) / (x - 2), 12);
    expect(a.reducedFn(2)).toBe(4); // the hole is filled in the reduced form; plot it as a ring
  });
});
