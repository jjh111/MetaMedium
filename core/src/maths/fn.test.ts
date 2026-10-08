// Maths with a variable (MATHS-SPEC lane B, M11): a text becomes a function of one
// variable, a tree that prints as it reads, or a reason it cannot. Never a guess.

import { describe, it, expect } from 'vitest';
import { compileFunction, parseFn, formatFn, evalFn, freeVariables, FUNCTIONS } from './fn';
import type { CompileFunction } from './compile';

/** The contract's shape: C will call it with exactly this type. */
const compile: CompileFunction = compileFunction;

function fnOf(text: string, variable?: string) {
  const c = compile(text, variable);
  if (!c.ok) throw new Error(`${text}: ${c.reason}`);
  return c;
}
const at = (text: string, x: number, variable?: string) => fnOf(text, variable).f(x);
const printed = (text: string) => {
  const p = parseFn(text);
  if (!p.ok) throw new Error(`${text}: ${p.reason}`);
  return formatFn(p.node);
};
const refusal = (text: string) => {
  const c = compile(text);
  return c.ok ? null : c.reason;
};

describe('compileFunction — the contract C calls', () => {
  it('2π√(L/g) evaluates given L and g, and says every name it uses', () => {
    const c = compileFunction('2π√(L/g)', 'L', { g: 9.81 });
    expect(c.ok).toBe(true);
    if (!c.ok) return;
    expect(c.f(1)).toBeCloseTo(2.00607, 5);
    expect(c.f(0.25)).toBeCloseTo(1.003033, 5);
    expect(c.variables).toEqual(['L', 'g']);
    expect(c.text).toBe('2π√(L/g)');
    const both = compileFunction('2π√(L/g)', 'L', { g: 9.81 });
    expect(both.ok && both.unbound).toEqual([]);
    // with nothing given for g, the function is readable and says what is missing
    const bare = compileFunction('2π√(L/g)', 'L');
    expect(bare.ok && bare.unbound).toEqual(['g']);
    expect(bare.ok && bare.f(1)).toBeNull();
  });

  it('y = (x²−4)/(x−2): the left side is dropped, the hole is null, the text is the printer\'s', () => {
    const c = fnOf('y = (x²−4)/(x−2)');
    expect(c.text).toBe('(x² − 4)/(x − 2)');
    expect(c.variables).toEqual(['x']);
    expect(c.f(3)).toBe(5);
    expect(c.f(2)).toBeNull();
    expect(c.f(-1)).toBeCloseTo(1, 12);
    expect(c.f(1.999999)).toBeCloseTo(3.999999, 5);
  });

  it('f(t) = … says its variable; one given outright wins', () => {
    const c = fnOf('f(t) = 3t + 1');
    expect(c.f(2)).toBe(7);
    expect(c.variables).toEqual(['t']);
    expect(at('f(t) = 3t + 1', 2, 't')).toBe(7);
    expect(at('g(x) = 3x + 1', 2)).toBe(7);
  });

  it('the variable is x when none is said', () => {
    expect(at('2x + 1', 4)).toBe(9);
    expect(at('2θ + 1', 4, 'θ')).toBe(9);
  });

  it('a constant is a function of nothing in particular', () => {
    const c = fnOf('y = 3');
    expect(c.f(100)).toBe(3);
    expect(c.variables).toEqual([]);
  });

  it('null where it is undefined: a pole, a hole, outside the domain', () => {
    expect(at('1/x', 0)).toBeNull();
    expect(at('1/x', 4)).toBe(0.25);
    expect(at('√x', -1)).toBeNull();
    expect(at('√x', 9)).toBe(3);
    expect(at('ln(x)', 0)).toBeNull();
    expect(at('ln(x)', -2)).toBeNull();
    expect(at('log(x)', 1000)).toBeCloseTo(3, 12);
    expect(at('tan(x)', Math.PI / 2)).toBeNull();
    expect(at('asin(x)', 2)).toBeNull();
    expect(at('x^0.5', -4)).toBeNull();
    expect(at('0^x', 0)).toBeNull();
    expect(at('x/x', 0)).toBeNull();
    expect(at('x/x', 3)).toBe(1);
  });

  it('refuses what it cannot read, with the reason', () => {
    expect(refusal('')).toMatch(/nothing to read/);
    expect(refusal('2 +')).toMatch(/cannot read/);
    expect(refusal('2 3')).toMatch(/two numbers/);
    expect(refusal('foo(x)')).toMatch(/foo/);
    expect(refusal('Radius * 2')).toMatch(/Radius/);
    expect(refusal('1/2x')).toMatch(/ambiguous/);
    expect(refusal('1/2x')).toMatch(/\(1\/2\)x/);
    expect(refusal('1/2x')).toMatch(/1\/\(2x\)/);
    expect(refusal('x = 3')).toMatch(/not a function/);
    expect(refusal('2x = 6')).toMatch(/equation/);
    expect(refusal('(x + 1')).toMatch(/bracket/);
    expect(refusal('x @ 2')).toMatch(/@/);
    expect(refusal('9x2')).toMatch(/after a letter|x2/);
  });
});

describe('the grammar of fn.ts', () => {
  it('numbers, names Latin and Greek, π and e', () => {
    expect(at('x + 0.5', 1)).toBe(1.5);
    expect(at('.5x', 4)).toBe(2);
    expect(at('½x', 4)).toBe(2);
    expect(at('θ + φ', 1, 'θ')).toBeNull(); // φ is not given
    const given = compileFunction('θ + φ', 'θ', { φ: 2 });
    expect(given.ok && given.f(1)).toBe(3);
    expect(at('π', 0)).toBeCloseTo(Math.PI, 12);
    expect(at('pi x', 2)).toBeCloseTo(2 * Math.PI, 12);
    expect(at('e^x', 1)).toBeCloseTo(Math.E, 12);
    for (const g of ['α', 'β', 'λ', 'ω']) expect(at(`2${g}`, 3, g)).toBe(6);
  });

  it('^ and superscripts, right-associative, binding tighter than a minus', () => {
    expect(at('x^2', 3)).toBe(9);
    expect(at('x²', 3)).toBe(9);
    expect(at('x³', -2)).toBe(-8);
    expect(at('x^10', 2)).toBe(1024);
    expect(at('x¹⁰', 2)).toBe(1024);
    expect(at('2^x^2', 2)).toBe(16);
    expect(at('-x^2', 3)).toBe(-9);
    expect(at('(-x)^2', 3)).toBe(9);
    expect(at('2^-x', 1)).toBe(0.5);
    expect(at('x⁻¹', 4)).toBe(0.25);
    expect(at('xⁿ', 3, 'x')).toBeNull(); // n is not given
    expect(at('x^2y', 3)).toBeNull(); // y is not given: (x²)·y
  });

  it('√ and sqrt, with and without brackets', () => {
    expect(at('√x', 16)).toBe(4);
    expect(at('√(x+9)', 16)).toBe(5);
    expect(at('sqrt(x)', 25)).toBe(5);
    expect(at('√x + 1', 4)).toBe(3);
    expect(at('2√x', 9)).toBe(6);
    expect(refusal('√4x')).toMatch(/ambiguous/);
    expect(refusal('√4x')).toMatch(/√\(4x\)/);
  });

  it('the functions: sin cos tan asin acos atan ln log exp abs', () => {
    const x = 0.5;
    expect(at('sin(x)', x)).toBeCloseTo(Math.sin(x), 12);
    expect(at('cos(x)', x)).toBeCloseTo(Math.cos(x), 12);
    expect(at('tan(x)', x)).toBeCloseTo(Math.tan(x), 12);
    expect(at('asin(x)', x)).toBeCloseTo(Math.asin(x), 12);
    expect(at('acos(x)', x)).toBeCloseTo(Math.acos(x), 12);
    expect(at('atan(x)', x)).toBeCloseTo(Math.atan(x), 12);
    expect(at('arcsin(x)', x)).toBeCloseTo(Math.asin(x), 12);
    expect(at('ln(x)', x)).toBeCloseTo(Math.log(x), 12);
    expect(at('log(x)', 100)).toBeCloseTo(2, 12);
    expect(at('exp(x)', x)).toBeCloseTo(Math.exp(x), 12);
    expect(at('abs(x)', -3)).toBe(3);
    expect(at('|x|', -3)).toBe(3);
    expect(at('||x| - 5|', 2)).toBe(3);
    expect(Object.keys(FUNCTIONS).sort()).toEqual(['abs', 'acos', 'asin', 'atan', 'cos', 'exp', 'ln', 'log', 'sin', 'sqrt', 'tan']);
  });

  it('a function without brackets takes the next factor, a glued 2x included', () => {
    expect(at('sin x', 1)).toBeCloseTo(Math.sin(1), 12);
    expect(at('sin 2x', 1)).toBeCloseTo(Math.sin(2), 12);
    expect(at('sin x cos x', 1)).toBeCloseTo(Math.sin(1) * Math.cos(1), 12);
    expect(at('sin x / x', 2)).toBeCloseTo(Math.sin(2) / 2, 12);
    expect(at('sin x^2', 2)).toBeCloseTo(Math.sin(4), 12);
    expect(at('sinx', 1)).toBeCloseTo(Math.sin(1), 12);
    expect(at('sin^2(x)', 1)).toBeCloseTo(Math.sin(1) ** 2, 12);
    expect(at('sin²x', 1)).toBeCloseTo(Math.sin(1) ** 2, 12);
    expect(at('sin^-1(x)', 0.5)).toBeCloseTo(Math.asin(0.5), 12);
  });

  it('degrees: sin 30° is a half', () => {
    expect(at('sin 30°', 0)).toBeCloseTo(0.5, 12);
    expect(at('sin(30°)', 0)).toBeCloseTo(0.5, 12);
    expect(at('sin(x°)', 90)).toBeCloseTo(1, 12);
    expect(at('cos(60°) + 1', 0)).toBeCloseTo(1.5, 12);
    expect(at('sin(30)', 0)).toBeCloseTo(Math.sin(30), 12); // radians, as written
  });

  it('implicit multiplication: 2x, x(x+1), 2(3+1), (x+1)(x−1), 2π√(L/g)', () => {
    expect(at('2x', 4)).toBe(8);
    expect(at('x(x+1)', 3)).toBe(12);
    expect(at('2(3+1)', 0)).toBe(8);
    expect(at('(x+1)(x-1)', 5)).toBe(24);
    expect(at('3x^2', 2)).toBe(12);
    expect(at('x y', 2)).toBeNull(); // y is not given
    expect(at('2x(x+1)', 3)).toBe(24);
    expect(at('2 x', 4)).toBe(8);
    expect(refusal('x2')).toMatch(/x2/); // refused rather than read two ways
  });

  it('division, minus and the typed forms ÷ × · *', () => {
    expect(at('x ÷ 2', 8)).toBe(4);
    expect(at('x × 2', 8)).toBe(16);
    expect(at('x * 2 · 3', 1)).toBe(6);
    expect(at('x − 2', 8)).toBe(6);
    expect(at('-x', 8)).toBe(-8);
    expect(at('x - -2', 8)).toBe(10);
    expect(at('1/x/2', 4)).toBe(0.125);
    expect(at('2/x*4', 4)).toBe(2);
  });
});

describe('the tree printer says what it read', () => {
  it('prints brackets only where they mean something', () => {
    expect(printed('(x^2-4)/(x-2)')).toBe('(x² − 4)/(x − 2)');
    expect(printed('x^2+2*x+1')).toBe('x² + 2x + 1');
    expect(printed('2*pi*sqrt(L/g)')).toBe('2π√(L/g)');
    expect(printed('sin(x)/x')).toBe('sin(x)/x');
    expect(printed('x*(x+1)')).toBe('x(x + 1)');
    expect(printed('2(3+1)')).toBe('2(3 + 1)');
    expect(printed('3 * 4')).toBe('3 × 4');
    expect(printed('a - (b - c)')).toBe('a − (b − c)');
    expect(printed('a - b - c')).toBe('a − b − c');
    expect(printed('a/(b*c)')).toBe('a/(bc)');
    expect(printed('a/b/c')).toBe('a/b/c');
    expect(printed('a/(b/c)')).toBe('a/(b/c)');
    expect(printed('-x^2')).toBe('−x²');
    expect(printed('(-x)^2')).toBe('(−x)²');
    expect(printed('x^(1/2)')).toBe('x^(1/2)');
    expect(printed('x^0.5')).toBe('x^0.5');
    expect(printed('e^(2x)')).toBe('e^(2x)');
    expect(printed('sin(30°)')).toBe('sin(30°)');
    expect(printed('x⁻¹')).toBe('x⁻¹');
    expect(printed('abs(x-1)')).toBe('abs(x − 1)');
  });

  it('what it prints reads back as the same function', () => {
    for (const t of ['(x^2-4)/(x-2)', '2*pi*sqrt(L/g)', 'sin(x)/x', 'x^3-3x+1', '1/(x^2+1)', 'e^(-x^2)', 'ln(x+1)/x', 'abs(x-1)+2x', '2^x^2', 'a-(b-c)', '(a-b)-c', 'a/(b*c)']) {
      const a = parseFn(t);
      expect(a.ok, t).toBe(true);
      if (!a.ok) continue;
      const again = parseFn(formatFn(a.node));
      expect(again.ok, `${t} → ${formatFn(a.node)}`).toBe(true);
      if (!again.ok) continue;
      const vars = freeVariables(a.node);
      const env = Object.fromEntries(vars.map((v, i) => [v, 1.3 + i * 0.7]));
      expect(evalFn(again.node, env), t).toBeCloseTo(evalFn(a.node, env) ?? NaN, 10);
    }
  });
});
