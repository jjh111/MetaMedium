// Expressions — the small grammar of a pattern page (MATHS-PLAN.md §4; DIRECTOR-PLAN-W2 M1).
//
// Red first: every line of the two sample pages, with the reading or readings
// the drafter meant. Three things are pinned hardest, because each is a trap:
//
//   - A handwritten `=` chain is a RUNNING TOTAL, not an equation.
//     `A ÷ 3 = 12 + 2 = 14` says A ÷ 3 is 12, and 12 + 2 is 14; read as
//     algebra it is false. And a chain may RESTATE its formula with the
//     numbers put in (`① ÷ 2 = 14 ÷ 2`), which is not a running total either.
//   - A reader returns `-` for a minus, a range and an en dash alike, and `x`
//     for a letter and for times. `3–6″` is a range, because a length is not
//     negative; `x` between numbers is times.
//   - A line that reads two ways returns both, ranked, each with its reason,
//     and a worked line beside it settles which.

import { describe, it, expect } from 'vitest';
import {
  parseExpression,
  parseChain,
  parseLine,
  evaluateExpr,
  evaluateChain,
  formatExpr,
  scopeOf,
} from './expr';
import type { ChainReading, MathsScope } from './expr';
import { parseQuantity, formatQuantity } from './quantity';
import type { Quantity } from './quantity';
import { APRON_LINES, APRON_BRACE } from './fixtures/apron.sample';
import { TUNIC_LINES } from './fixtures/tunic.sample';

const q = (text: string): Quantity => parseQuantity(text)!.quantity;
const fmt = (x: Quantity | null) => (x ? formatQuantity(x) : null);
const statuses = (r: ChainReading) => r.checks.map((c) => c.status);
/** The body of a line, read as a chain, evaluated. */
const run = (line: string, scope: MathsScope = {}) => evaluateChain(parseLine(line).chain, scope);

// The apron's measurements as the sheet (M2) will hand them over: by letter
// and by name, in the unit the page writes.
const apron = scopeOf(
  { A: '36"', Bust: '36"', B: '20"', 'Top to waist': '20"', C: '46"', 'Top to bottom': '46"' },
  { 1: '14"' },
  'in'
);

describe('the grammar', () => {
  it('reads + − × ÷ and their typed forms - * x / :', () => {
    const v = (t: string) => fmt(evaluateExpr(parseExpression(t)[0].expr).value);
    expect(v('36 − 6')).toBe('30');
    expect(v('36 - 6')).toBe('30');
    expect(v('36 × 2')).toBe('72');
    expect(v('36 * 2')).toBe('72');
    expect(v('36 x 2')).toBe('72');
    expect(v('36 ÷ 3')).toBe('12');
    expect(v('36 / 3')).toBe('12');
    expect(v('36 : 3')).toBe('12');
  });

  it('x between numbers is times; x in a word is a letter', () => {
    expect(formatExpr(parseExpression('9x2')[0].expr)).toBe('9 × 2');
    expect(formatExpr(parseExpression('9 x 2')[0].expr)).toBe('9 × 2');
    expect(formatExpr(parseExpression('Box width + 2')[0].expr)).toBe('Box width + 2');
  });

  it('names are a single letter or several words', () => {
    expect(formatExpr(parseExpression('A ÷ 3')[0].expr)).toBe('A ÷ 3');
    expect(formatExpr(parseExpression('Top to waist + 2')[0].expr)).toBe('Top to waist + 2');
  });

  it('a step is referred to as ①, (1) or step 1', () => {
    const scope = scopeOf({}, { 1: '14"' });
    for (const t of ['① ÷ 2', '(1) ÷ 2', 'step 1 ÷ 2']) {
      expect(fmt(evaluateExpr(parseExpression(t)[0].expr, scope).value), t).toBe('7″');
    }
  });

  it('parentheses group, and a length is a length through ×, ÷, + and −', () => {
    expect(fmt(evaluateExpr(parseExpression('(C × 2) − B')[0].expr, apron).value)).toBe('72″');
    expect(fmt(evaluateExpr(parseExpression('(36 + 6)/2')[0].expr).value)).toBe('21');
  });

  it('a name nothing defines is said, not guessed', () => {
    const e = evaluateExpr(parseExpression('Waist ÷ 4')[0].expr, apron);
    expect(e.value).toBeNull();
    expect(e.unknowns).toEqual(['Waist']);
  });

  it('a line splits at =, at a result written beside its formula, and at the gap before a worked line', () => {
    expect(parseChain('A ÷ 3 = 12 + 2 = 14').segments.map((s) => s.join)).toEqual([undefined, '=', '=']);
    expect(parseChain('C 48').segments.map((s) => s.join)).toEqual([undefined, 'beside']);
    expect(parseChain('Chest + 6" ÷ 2   (36 + 6)/2 = 21"').segments.map((s) => [s.text, s.join])).toEqual([
      ['Chest + 6" ÷ 2', undefined],
      ['(36 + 6)/2', 'gap'],
      ['21"', '='],
    ]);
  });

  it('a dash with the larger number first is a minus, never a range', () => {
    const r = parseExpression('72-20');
    expect(r).toHaveLength(1);
    expect(fmt(evaluateExpr(r[0].expr).value)).toBe('52');
  });

  it('a typed minus sign between the smaller and the larger ranks the minus first, the range still offered', () => {
    const r = parseExpression('3 − 6');
    expect(r.map((x) => formatExpr(x.expr))).toEqual(['3 − 6', '3–6']);
  });
});

describe('the three lines that read two ways', () => {
  it('Chest + 6″ ÷ 2: by precedence, three more than the chest; as worked, the chest plus six, halved', () => {
    const r = parseExpression('Chest + 6" ÷ 2');
    expect(r).toHaveLength(2);
    expect(r.map((x) => x.formula)).toEqual(['Chest + (6″ ÷ 2)', '(Chest + 6″) ÷ 2']);
    expect(r[0].reason).toMatch(/precedence/);
    expect(r[0].reason).toMatch(/3″ more than Chest/);
    expect(r[1].reason).toMatch(/as worked/);
    expect(r[1].reason).toMatch(/Chest plus 6″, halved/);
  });

  it('…and the worked line beside it settles which', () => {
    const r = run(TUNIC_LINES[0]);
    expect(r.map((x) => x.formula)).toEqual(['(Chest + 6″) ÷ 2', 'Chest + (6″ ÷ 2)']);
    expect(fmt(r[0].value)).toBe('21″');
    expect(statuses(r[0]).every((s) => s === 'ok')).toBe(true);
    expect(r[0].bindings).toEqual([expect.objectContaining({ kind: 'name', subject: 'Chest', value: expect.objectContaining({ lo: 36 }) })]);
    expect(r[0].reason).toMatch(/worked line/);
    expect(r[1].reason).toMatch(/the worked line “\(36 \+ 6\)\/2” does not have this form/);
    // By precedence, with the chest the worked line put in, it would be 39″ — not the 21″ written.
    expect(fmt(r[1].value)).toBe('39″');
    expect(statuses(r[1])).toEqual(['off']);
  });

  it('3–6″ is a range, not three minus six — a length is not negative', () => {
    const r = parseExpression('3–6"');
    expect(r).toHaveLength(2);
    expect(fmt(evaluateExpr(r[0].expr).value)).toBe('3–6″');
    expect(r[0].reason).toMatch(/range/);
    expect(r[0].reason).toMatch(/negative/);
    expect(fmt(evaluateExpr(r[1].expr).value)).toBe('−3″');
    expect(r[1].reason).toMatch(/minus/);
  });

  it('(C × 2) − B: 72 from the measurements, 74 with seam allowance on both', () => {
    const withAllowance = scopeOf(
      {
        C: [{ value: q('46"'), key: 'C', label: 'from the measurements' }, { value: q('48"'), key: 'C', label: 'with seam allowance', alternative: true }],
        B: [{ value: q('20"'), key: 'B', label: 'from the measurements' }, { value: q('22"'), key: 'B', label: 'with seam allowance', alternative: true }],
      },
      {},
      'in'
    );
    const r = run(APRON_LINES[9], withAllowance);
    expect(r.map((x) => fmt(x.value))).toEqual(['72″', '74″']);
    expect(r[0].reason).toMatch(/from the measurements/);
    expect(statuses(r[0])).toEqual(['ok']);
    expect(r[1].label).toBe('with seam allowance');
    expect(r[1].reason).toMatch(/with seam allowance on C and B/);
    expect(statuses(r[1])).toEqual(['off']);
  });
});

describe('the apron page, line by line', () => {
  it('A. Bust 36 — a letter and a name for one measurement', () => {
    const p = parseLine(APRON_LINES[0]);
    expect(p.label).toEqual({ kind: 'letter', letter: 'A', text: 'A.' });
    expect(p.shape).toBe('definition');
    expect(p.name).toBe('Bust');
    expect(p.value).toMatchObject({ lo: 36, unit: null });
  });

  it('B. Top to waist 20 and C. Top to bottom 46 — names of several words', () => {
    expect(parseLine(APRON_LINES[1])).toMatchObject({ label: { letter: 'B' }, shape: 'definition', name: 'Top to waist', value: { lo: 20 } });
    expect(parseLine(APRON_LINES[2])).toMatchObject({ label: { letter: 'C' }, shape: 'definition', name: 'Top to bottom', value: { lo: 46 } });
  });

  it('Add seam allowance — words only, a heading', () => {
    const p = parseLine(APRON_LINES[3]);
    expect(p.label).toBeUndefined();
    expect(p.shape).toBe('heading');
  });

  it('1. A ÷ 3 = 12 + 2 = 14 — a running total: A ÷ 3 is 12, and 12 + 2 is 14', () => {
    const p = parseLine(APRON_LINES[4]);
    expect(p.label).toEqual({ kind: 'step', n: 1, text: '1.' });
    expect(p.chain.segments.map((s) => s.text)).toEqual(['A ÷ 3', '12 + 2', '14']);
    const r = run(APRON_LINES[4], apron);
    expect(r).toHaveLength(1);
    expect(r[0].formula).toBe('(A ÷ 3) + 2');
    expect(fmt(r[0].value)).toBe('14″');
    expect(r[0].checks.map((c) => [c.text, c.status])).toEqual([['12', 'ok'], ['14', 'ok']]);
  });

  it('2. ① ÷ 2 = 14 ÷ 2 = 7 — the middle restates the formula with step 1 put in', () => {
    const p = parseLine(APRON_LINES[5]);
    expect(p.label).toMatchObject({ kind: 'step', n: 2 });
    expect(p.chain.segments.map((s) => s.text)).toEqual(['① ÷ 2', '14 ÷ 2', '7']);
    const r = run(APRON_LINES[5], apron);
    expect(r[0].formula).toBe('① ÷ 2');
    expect(fmt(r[0].value)).toBe('7″');
    expect(r[0].restated).toBe(1);
    expect(r[0].checks.map((c) => [c.what, c.text, c.status])).toEqual([['restated', '14', 'ok'], ['result', '7', 'ok']]);
  });

  it('3. B 20 + 2 = 22 — B written with its value, then the running total', () => {
    const p = parseLine(APRON_LINES[6]);
    expect(p.chain.segments.map((s) => s.text)).toEqual(['B', '20 + 2', '22']);
    const r = run(APRON_LINES[6], apron);
    expect(r[0].formula).toBe('B + 2');
    expect(fmt(r[0].value)).toBe('22″');
    expect(statuses(r[0])).toEqual(['ok', 'ok']);
  });

  it('4. C 48 and 5. A 38″ — a measurement with its result written beside it; the 2 more is for the sheet to explain', () => {
    const c = run(APRON_LINES[7], apron);
    expect(parseLine(APRON_LINES[7]).chain.segments.map((s) => s.text)).toEqual(['C', '48']);
    expect(fmt(c[0].value)).toBe('46″');
    expect(c[0].checks[0]).toMatchObject({ status: 'off', difference: 2 });
    const a = run(APRON_LINES[8], apron);
    expect(fmt(a[0].value)).toBe('36″');
    expect(a[0].checks[0]).toMatchObject({ status: 'off', difference: 2 });
  });

  it('6. (C × 2) − B 72″ — the result written beside the formula checks', () => {
    const r = run(APRON_LINES[9], apron);
    expect(parseLine(APRON_LINES[9]).chain.segments.map((s) => s.text)).toEqual(['(C × 2) − B', '72"']);
    expect(fmt(r[0].value)).toBe('72″');
    expect(statuses(r[0])).toEqual(['ok']);
  });

  it('the brace\'s 72–74″ is one range', () => {
    expect(parseQuantity(APRON_BRACE)!.quantity).toMatchObject({ lo: 72, hi: 74, unit: 'in' });
  });

  it('read as algebra the first chain would be false; read as a running total every = checks', () => {
    for (const line of [APRON_LINES[4], APRON_LINES[5], APRON_LINES[6]]) {
      const r = run(line, apron);
      expect(statuses(r[0]).every((s) => s === 'ok'), line).toBe(true);
    }
  });
});

describe('the tunic page, line by line', () => {
  it('every worked line checks, and the measurement it put in is held as the worked line\'s', () => {
    const expected: [string, string, string][] = [
      ['21″', 'Chest', '36'],
      ['56″', 'Shoulder to length desired', '54'],
      ['22″', 'Top shoulder to under armpit', '9'],
      ['7.5″', 'Fist', '3.5'],
      ['23″', 'Arm length', '21'],
    ];
    TUNIC_LINES.forEach((line, i) => {
      const r = run(line, scopeOf({}, {}, 'in'));
      const [value, name, put] = expected[i];
      expect(fmt(r[0].value), line).toBe(value);
      expect(statuses(r[0]).every((s) => s === 'ok' || s === 'within'), line).toBe(true);
      const b = r[0].bindings.find((x) => x.kind === 'name')!;
      expect(b.subject, line).toBe(name);
      expect(formatQuantity(b.value).replace('″', ''), line).toBe(put);
    });
  });

  it('3. …× 2 + 3–6″ — the range reading first, and the worked line shows the value chosen from it', () => {
    const e = parseExpression('Top shoulder to under armpit × 2 + 3–6"');
    expect(e.map((x) => x.formula)).toEqual([
      '(Top shoulder to under armpit × 2) + 3–6″',
      '((Top shoulder to under armpit × 2) + 3) − 6″',
    ]);
    const r = run(TUNIC_LINES[2], scopeOf({}, {}, 'in'));
    expect(r[0].bindings.find((b) => b.kind === 'range')).toMatchObject({ subject: '3–6″', value: { lo: 4 } });
    expect(r[0].reason).toMatch(/4″ chosen from 3–6″/);
  });

  it('4. Fist + 2–4″ — the worked line chose the top of the range', () => {
    const r = run(TUNIC_LINES[3], scopeOf({}, {}, 'in'));
    expect(r[0].bindings.find((b) => b.kind === 'range')).toMatchObject({ subject: '2–4″', value: { lo: 4 } });
  });

  it('without its worked line a range stays a range', () => {
    const r = run('3. Top shoulder to under armpit × 2 + 3–6"', scopeOf({ 'Top shoulder to under armpit': '9"' }, {}, 'in'));
    expect(fmt(r[0].value)).toBe('21–24″');
  });
});

describe('what the chain never does', () => {
  it('a written result that disagrees is kept beside the computed one, and the computed value flows on', () => {
    const scope = scopeOf({ A: '38"' }, {}, 'in');
    const r = run('1. A ÷ 3 = 12 + 2 = 14', scope);
    expect(fmt(r[0].value)).toBe('14.67″');
    expect(r[0].checks.map((c) => [c.text, c.status])).toEqual([['12', 'off'], ['14', 'off']]);
  });

  it('a name nothing defines carries the written result forward, and says so', () => {
    const r = run('1. Waist ÷ 4 = 7 + 1 = 8');
    expect(fmt(r[0].value)).toBe('8');
    expect(r[0].unknowns).toEqual(['Waist']);
    expect(r[0].checks[0].status).toBe('unknown');
    expect(r[0].notes.join(' ')).toMatch(/Waist/);
  });

  it('a full stop after a result is punctuation', () => {
    const r = run('2. ① ÷ 2 = 14 ÷ 2 = 7.', apron);
    expect(fmt(r[0].value)).toBe('7″');
    expect(r[0].checks.map((c) => c.status)).toEqual(['ok', 'ok']);
  });

  it('an unreadable line is a reading that says so, never a throw', () => {
    expect(() => run('1. A ÷ ÷ = ?')).not.toThrow();
    const p = parseLine('1. A ÷ ÷ = ?');
    expect(p.shape).toBe('unreadable');
  });
});
