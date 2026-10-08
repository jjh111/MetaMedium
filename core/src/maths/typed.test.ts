// The lines the grammar used to read silently wrong (MATHS-SPEC §2, lane B, M11).
//
// Red first: every row of the table failed against `maths/wave-1` — each was read
// as something it is not and said nothing, which on a teacher's board is the worst
// way to be wrong. Now each is read right or refused with a reason (rule 14), and
// where a line truly reads two ways it returns both (rule 3).

import { describe, it, expect } from 'vitest';
import { createSession } from '../session/session';
import type { Session } from '../session/session';
import { boardMaths, evaluateTyped } from './board';
import { parseExpression, evaluateExpr, evaluateChain, parseLine, formatExpr, scopeOf } from './expr';
import { readSheet } from './sheet';
import { formatQuantity, parseQuantity, quantity, formatNumber } from './quantity';
import type { Quantity } from './quantity';

function textOn(s: Session, code: string, at: number): void {
  s.import({ kind: 'text', path: `text/${at}.txt`, name: code, bounds: { minX: 100, maxX: 500, minY: 100 + at, maxY: 140 + at }, code, at });
}

/** A page of lines, as the board reads it. */
function page(...lines: string[]) {
  const s = createSession();
  lines.forEach((l, i) => textOn(s, l, 1000 + i * 100));
  return boardMaths(s.getState());
}

const q = (t: string): Quantity => parseQuantity(t)!.quantity;
const fmt = (x: Quantity | null) => (x ? formatQuantity(x) : null);
const valueOf = (t: string, scope = {}) => fmt(evaluateExpr(parseExpression(t)[0].expr, scope).value);

describe('the table of lines the grammar read silently wrong (MATHS-SPEC §2)', () => {
  it('= 2x was `2 = 2`: with no x on the page it is refused, with x it is twice x', () => {
    const none = evaluateTyped('= 2x', null);
    expect(none).toMatchObject({ ok: false });
    expect(!none.ok && none.reason).toBe('x is not on this sheet');
    expect(evaluateTyped('= 2x', page('x = 3'))).toMatchObject({ ok: true, result: '6', words: '2x = 6' });
  });

  it('= sin(30) was `sin = 30`: radians by its face, and 30 as degrees said beside it', () => {
    const r = evaluateTyped('= sin(30)', null);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.result).toBe('−0.99');
    expect(r.words).toBe('sin(30) = −0.99');
    expect(r.also).toBe('sin(30°) = 0.5');
  });

  it('= sin(30°) and = sin 30° are 0.5, with no second reading', () => {
    for (const t of ['= sin(30°)', '= sin 30°', '= sin(30 deg)']) {
      const r = evaluateTyped(t, null);
      expect(r, t).toMatchObject({ ok: true, result: '0.5' });
      expect(r.ok && r.also, t).toBeUndefined();
    }
  });

  it('= x(x+1) with x = 3 was `x = 3`: it is 12', () => {
    expect(evaluateTyped('= x(x+1)', page('x = 3'))).toMatchObject({ ok: true, result: '12' });
  });

  it('= 2(3+1) was "2 + 1 is 3, not 3": it is 8', () => {
    expect(evaluateTyped('= 2(3+1)', null)).toMatchObject({ ok: true, result: '8', words: '2(3 + 1) = 8' });
  });

  it('= 3-5 was a range: a hyphen between two bare numbers is a minus first, the range still offered', () => {
    const r = evaluateTyped('= 3-5', null);
    expect(r).toMatchObject({ ok: true, result: '−2', also: '3–5 = 3–5' });
    // …and with a length on either side the dash stays a range, since a length is not negative
    expect(parseExpression('3-6"').map((x) => x.formula)).toEqual(['3–6″', '3 − 6″']);
  });

  it('= 2 × a = 10 with a undefined was accepted as 10: it is refused, saying a is not on the sheet', () => {
    const r = evaluateTyped('= 2 × a = 10', null);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.reason).toMatch(/a is not on this sheet/);
    // with a defined, the same line is a check, and 2 × 5 = 10 holds
    expect(evaluateTyped('= 2 × a = 10', page('a = 5'))).toMatchObject({ ok: true, result: '10' });
    expect(evaluateTyped('= 2 × a = 11', page('a = 5')).ok).toBe(false);
  });

  it('= 1.9999 + 0.0001 was `2 + 0 = 2`: the numbers are shown as written', () => {
    const r = evaluateTyped('= 1.9999 + 0.0001', null);
    expect(r).toMatchObject({ ok: true, result: '2', words: '1.9999 + 0.0001 = 2' });
  });
});

describe('what the display shows', () => {
  it('a number written with four places keeps them; a computed one is still two', () => {
    expect(fmt(q('0.0001'))).toBe('0.0001');
    expect(fmt(q('1.9999'))).toBe('1.9999');
    expect(fmt(q('7.5'))).toBe('7.5');
    expect(valueOf('2 ÷ 3')).toBe('0.67');
    expect(valueOf('1.9999 × 3')).toBe('6');
  });

  it('a value that is not zero is never shown as zero', () => {
    expect(formatNumber(0.004)).toBe('0.004');
    expect(formatNumber(0.00012)).toBe('0.00012');
    expect(formatNumber(0.1 + 0.2 - 0.3)).toBe('0');
    expect(formatNumber(12.666666)).toBe('12.67');
  });
});

describe('the plural readings survive (the trap)', () => {
  it('Chest + 6″ ÷ 2 still reads by precedence and as worked', () => {
    expect(parseExpression('Chest + 6" ÷ 2').map((r) => r.formula)).toEqual(['Chest + (6″ ÷ 2)', '(Chest + 6″) ÷ 2']);
  });

  it('a dash between two lengths is still a range first, a minus second', () => {
    expect(parseExpression('3–6"').map((r) => formatExpr(r.expr))).toEqual(['3–6″', '3 − 6″']);
    expect(parseExpression('3 − 6').map((r) => formatExpr(r.expr))).toEqual(['3 − 6', '3–6']);
  });

  it('a result written beside a formula is still a result, not a product', () => {
    const lines = parseLine('(C × 2) − B 72"').chain.segments.map((s) => s.text);
    expect(lines).toEqual(['(C × 2) − B', '72"']);
    expect(parseLine('C 48').chain.segments.map((s) => s.join)).toEqual([undefined, 'beside']);
  });

  it('a worked line across a gap is still a gap, though it starts with a bracket', () => {
    expect(parseLine('Chest + 6" ÷ 2   (36 + 6)/2 = 21"').chain.segments.map((s) => s.join)).toEqual([undefined, 'gap', '=']);
  });
});

describe('the new grammar, read both ways or refused', () => {
  it('powers, roots, π and degrees', () => {
    expect(valueOf('3²')).toBe('9');
    expect(valueOf('2^10')).toBe('1024');
    expect(valueOf('2^-1')).toBe('0.5');
    expect(valueOf('√16')).toBe('4');
    expect(valueOf('√(9 + 16)')).toBe('5');
    expect(valueOf('2π')).toBe('6.28');
    expect(valueOf('sin(90°)')).toBe('1');
    expect(valueOf('cos(60°)')).toBe('0.5');
    expect(valueOf('tan(45°)')).toBe('1');
    expect(valueOf('ln(1)')).toBe('0');
    expect(valueOf('log(1000)')).toBe('3');
    expect(valueOf('abs(0 - 4)')).toBe('4');
  });

  it('a length squared is an area; its square root is a length again', () => {
    expect(valueOf('3"^2')).toBe('9 in²');
    expect(valueOf('√(9 in²)')).toBe('3″');
    expect(valueOf('2 × 3"')).toBe('6″');
  });

  it('-2^2 is minus four, and an exponent binds before a product', () => {
    expect(valueOf('-2^2')).toBe('−4');
    expect(valueOf('2 × 3^2')).toBe('18');
    expect(valueOf('2^3^2')).toBe('512');
  });

  it('2π√(L/g) with L and g put in', () => {
    const scope = scopeOf({ L: '1', g: '9.81' });
    const e = evaluateExpr(parseExpression('2π√(L/g)')[0].expr, scope);
    expect(e.value!.lo).toBeCloseTo(2.00607, 4);
  });

  it('1 ÷ 2x is ambiguous, so it is refused with the two ways to write it', () => {
    expect(parseExpression('1/2x')).toEqual([]);
    const c = parseLine('1/2x').chain.segments[0];
    expect(c.error).toMatch(/ambiguous/);
    expect(c.error).toMatch(/\(1\/2\)x/);
    expect(c.error).toMatch(/1\/\(2x\)/);
    // the same line with a division sign, or with a name: both ways to write it are said
    const d = parseLine('A ÷ 2B').chain.segments[0];
    expect(d.error).toMatch(/ambiguous/);
    expect(d.error).toMatch(/\(A ÷ 2\)B/);
    expect(d.error).toMatch(/A ÷ \(2B\)/);
    // a product to the left of the division is no such thing
    expect(valueOf('2x/3', scopeOf({ x: '6' }))).toBe('4');
  });

  it('a fraction written with a slash beside a power or a division is a question, so it is not read', () => {
    // 3/4 is one number alone — and the end of a division, or a base, beside ÷ and ^
    expect(valueOf('3/4')).toBe('¾'); // a number written as a fraction stays one
    expect(valueOf('(3/4)^2')).toBe('0.56');
    expect(valueOf('2 ÷ (1/2)')).toBe('4');
    const cases: [string, RegExp][] = [
      ['2^1/3', /2\^1\/3 is ambiguous — write 2\^\(1\/3\) or \(2\^1\)\/3/],
      ['3/4^2', /\(3\/4\)\^2 or 3\/\(4\^2\)/],
      ['A ÷ 3/4', /A ÷ \(3\/4\) or \(A ÷ 3\)\/4/],
      ['x/2/3', /x ÷ \(2\/3\) or \(x ÷ 2\)\/3/],
    ];
    for (const [t, why] of cases) {
      const c = parseLine(t).chain.segments[0];
      expect(c.readings, t).toEqual([]);
      expect(c.error, t).toMatch(why);
    }
  });

  it('an angle is not a length, and not a bare number', () => {
    expect(valueOf('30° + 15°')).toBe('45°');
    expect(valueOf('2 × 30°')).toBe('60°');
    expect(evaluateExpr(parseExpression('30° + 5"')[0].expr).value).toBeNull();
    expect(evaluateExpr(parseExpression('30° + 15')[0].expr).value).toBeNull();
    expect(evaluateExpr(parseExpression('30° × 2°')[0].expr).value).toBeNull();
  });

  it('a name inside a function or a power is still a name the page must define', () => {
    const e = evaluateExpr(parseExpression('sin(t) + x^2')[0].expr, scopeOf({}));
    expect(e.value).toBeNull();
    expect(e.unknowns.sort()).toEqual(['t', 'x']);
  });

  it('the sheet follows a name inside a function to the step it comes from, written below', () => {
    // 1. √B reads B, a lettered step written after it: the order of the page is not the order of the work
    const sheet = readSheet(['1. √B', 'B. 9 + 7']);
    const one = sheet.entries[0];
    expect(one.kind).toBe('step');
    expect(one.kind === 'step' && fmt(one.value)).toBe('4');
  });

  it('a text with an angle or π alone is no value to attach to a side', () => {
    expect(parseLine('30°').shape).toBe('formula');
    expect(parseLine('π').shape).toBe('formula');
    expect(parseLine('30').shape).toBe('value');
    expect(parseLine('r = 30').shape).toBe('definition');
  });

  it('the plural trig reading: sin(30) is radians by its face, degrees the second reading', () => {
    const r = evaluateChain(parseLine('sin(30)').chain, scopeOf({}));
    expect(r.map((x) => x.formula)).toEqual(['sin(30)', 'sin(30°)']);
    expect(r.map((x) => fmt(x.value))).toEqual(['−0.99', '0.5']);
    expect(r[0].reason).toMatch(/radians/);
    expect(r[1].reason).toMatch(/degrees/);
  });

  it('a worked line restates a formula with a power or a function in it', () => {
    const r = evaluateChain(parseLine('3² + 4² = 9 + 16 = 25').chain, scopeOf({}));
    expect(fmt(r[0].value)).toBe('25');
    expect(r[0].checks.every((c) => c.status === 'ok')).toBe(true);
    const bad = evaluateChain(parseLine('3² + 4² = 26').chain, scopeOf({}));
    expect(bad[0].checks[0].status).toBe('off');
  });

  it('quantity() takes an angle', () => {
    const a = quantity(30, null, { angle: 'deg' });
    expect(formatQuantity(a)).toBe('30°');
    expect(formatQuantity(quantity(1.5, null, { angle: 'rad' }))).toBe('1.5 rad');
  });
});
