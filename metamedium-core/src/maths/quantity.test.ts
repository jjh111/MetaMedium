// Quantities — a number as the hand writes it (MATHS-PLAN.md §3 rule 5; DIRECTOR-PLAN-W2 M1).
//
// A value or an interval, a unit or none, exact or approximate. Pinned here:
// every form the pages use parses, units convert and say so, a range stays a
// range through arithmetic, and a written result is checked against a
// computed one without pretending a rounded value is wrong.

import { describe, it, expect } from 'vitest';
import {
  parseQuantity,
  formatQuantity,
  convertQuantity,
  arithmetic,
  compareQuantities,
  quantity,
  rangeOf,
  isRange,
} from './quantity';
import { TRIANGLE_LABELS } from './fixtures/triangle';

const q = (text: string) => {
  const p = parseQuantity(text);
  if (!p) throw new Error(`did not parse: ${text}`);
  return p.quantity;
};

describe('parseQuantity — the forms a pattern page uses', () => {
  it('reads inches however the mark is written', () => {
    for (const t of ['24"', '24″', '24”', "24''", '24 in', '24in', '24 inches']) {
      expect(q(t), t).toMatchObject({ lo: 24, hi: 24, unit: 'in', dim: 1, approx: false });
    }
  });

  it('reads a bare number as a number with no unit — it takes the unit its drawing speaks later', () => {
    expect(q('7.5')).toMatchObject({ lo: 7.5, hi: 7.5, unit: null, dim: 0 });
    expect(q('36')).toMatchObject({ lo: 36, unit: null, dim: 0 });
  });

  it('reads a range with an en dash or a hyphen, the unit on the second end covering both', () => {
    expect(q('2–4"')).toMatchObject({ lo: 2, hi: 4, unit: 'in' });
    expect(q('2-4"')).toMatchObject({ lo: 2, hi: 4, unit: 'in' });
    expect(q('3–6"')).toMatchObject({ lo: 3, hi: 6, unit: 'in' });
    expect(q('2 to 4 in')).toMatchObject({ lo: 2, hi: 4, unit: 'in' });
    expect(isRange(q('2–4"'))).toBe(true);
    expect(isRange(q('24"'))).toBe(false);
  });

  it('keeps an estimate approximate', () => {
    expect(q('~41"')).toMatchObject({ lo: 41, unit: 'in', approx: true });
    expect(q('≈41"')).toMatchObject({ lo: 41, approx: true });
  });

  it('reads fractions: vulgar, slashed and mixed', () => {
    expect(q('½').lo).toBe(0.5);
    expect(q('1 1/2').lo).toBe(1.5);
    expect(q('1½').lo).toBe(1.5);
    expect(q('3/4"')).toMatchObject({ lo: 0.75, unit: 'in' });
    expect(q('5⅝"').lo).toBe(5.625);
  });

  it('reads the other units the hand uses, and feet with inches', () => {
    expect(q('39 in')).toMatchObject({ lo: 39, unit: 'in' });
    expect(q('61 cm')).toMatchObject({ lo: 61, unit: 'cm' });
    expect(q('610mm')).toMatchObject({ lo: 610, unit: 'mm' });
    expect(q('1.5 m')).toMatchObject({ lo: 1.5, unit: 'm' });
    expect(q("2'")).toMatchObject({ lo: 2, unit: 'ft' });
    expect(q('2 ft')).toMatchObject({ lo: 2, unit: 'ft' });
    expect(q('5′ 4″')).toMatchObject({ lo: 64, unit: 'in' });
  });

  it('remembers how precisely it was written, so a check knows what rounding means', () => {
    expect(q('14').precision).toBe(1);
    expect(q('7.5"').precision).toBeCloseTo(0.1);
    expect(q('12.25').precision).toBeCloseTo(0.01);
    expect(q('½').precision).toBe(0.5);
    expect(q('5⅝"').precision).toBe(0.125);
  });

  it('says what it read', () => {
    expect(parseQuantity('2–4"')!.reason).toMatch(/range/);
    expect(parseQuantity('~41"')!.reason).toMatch(/approximate/);
    expect(parseQuantity('39 in')!.reason).toMatch(/inch/);
  });

  it('refuses what is not one quantity', () => {
    expect(parseQuantity('')).toBeNull();
    expect(parseQuantity('A ÷ 3')).toBeNull();
    expect(parseQuantity('Bust')).toBeNull();
    // A range is written low to high; 4-2 is a sum, not a quantity.
    expect(parseQuantity('4-2')).toBeNull();
    expect(parseQuantity('36 + 6')).toBeNull();
  });

  it('reads the triangle\'s labels as the bare numbers they are', () => {
    expect([...TRIANGLE_LABELS.legs, TRIANGLE_LABELS.long].map((t) => q(t))).toEqual([
      expect.objectContaining({ lo: 24, hi: 24, unit: null }),
      expect.objectContaining({ lo: 8, hi: 8, unit: null }),
      expect.objectContaining({ lo: 24, hi: 24, unit: null }),
    ]);
  });
});

describe('units convert, and say so', () => {
  it('inches to centimetres and back', () => {
    const c = convertQuantity(q('39 in'), 'cm');
    expect(c.quantity.lo).toBeCloseTo(99.06, 6);
    expect(c.quantity.unit).toBe('cm');
    expect(c.note).toMatch(/39″ is 99\.06 cm/);
    expect(convertQuantity(q('1.5 m'), 'cm').quantity.lo).toBeCloseTo(150, 9);
    expect(convertQuantity(q('2 ft'), 'in').quantity.lo).toBeCloseTo(24, 9);
  });

  it('a bare number has nothing to convert', () => {
    const c = convertQuantity(q('7.5'), 'cm');
    expect(c.quantity).toEqual(q('7.5'));
    expect(c.note).toBeUndefined();
  });

  it('adding centimetres to inches converts the second and says so', () => {
    const r = arithmetic('+', q('10"'), q('2.54 cm'));
    expect(r.quantity!.lo).toBeCloseTo(11, 9);
    expect(r.quantity!.unit).toBe('in');
    expect(r.notes.join(' ')).toMatch(/2\.54 cm is 1″/);
  });
});

describe('arithmetic over intervals', () => {
  it('a range stays a range until a value is chosen', () => {
    const r = arithmetic('+', q('3.5'), q('2–4"'));
    expect(r.quantity).toMatchObject({ lo: 5.5, hi: 7.5, unit: 'in' });
    expect(arithmetic('*', q('3–6"'), q('2')).quantity).toMatchObject({ lo: 6, hi: 12, unit: 'in' });
    expect(arithmetic('-', q('10"'), q('2–4"')).quantity).toMatchObject({ lo: 6, hi: 8 });
  });

  it('a bare number beside a length is a length of that unit; beside × and ÷ it is a count', () => {
    expect(arithmetic('+', q('12"'), q('2')).quantity).toMatchObject({ lo: 14, unit: 'in', dim: 1 });
    expect(arithmetic('/', q('36"'), q('3')).quantity).toMatchObject({ lo: 12, unit: 'in', dim: 1 });
    expect(arithmetic('*', q('46"'), q('2')).quantity).toMatchObject({ lo: 92, unit: 'in', dim: 1 });
  });

  it('a length by a length is an area, and a length over a length is a bare ratio', () => {
    expect(arithmetic('*', q('24"'), q('8"')).quantity).toMatchObject({ lo: 192, unit: 'in', dim: 2 });
    expect(arithmetic('/', q('24"'), q('8"')).quantity).toMatchObject({ lo: 3, unit: null, dim: 0 });
  });

  it('an area and a length cannot be added — said, not thrown', () => {
    const area = arithmetic('*', q('24"'), q('8"')).quantity!;
    const r = arithmetic('+', area, q('2"'));
    expect(r.quantity).toBeNull();
    expect(r.error).toMatch(/area/);
  });

  it('dividing by zero, or by a range that holds zero, is said, not thrown', () => {
    expect(arithmetic('/', q('36"'), q('0')).error).toMatch(/zero/);
    expect(arithmetic('/', q('36"'), rangeOf(-1, 1)).error).toMatch(/zero/);
  });

  it('an estimate makes what it touches an estimate', () => {
    expect(arithmetic('+', q('~41"'), q('2')).quantity).toMatchObject({ lo: 43, approx: true });
  });
});

describe('formatQuantity — for people', () => {
  it('speaks the hand\'s marks and drops what does not matter', () => {
    expect(formatQuantity(q('36"'))).toBe('36″');
    expect(formatQuantity(q('2–4"'))).toBe('2–4″');
    expect(formatQuantity(q('~41"'))).toBe('~41″');
    expect(formatQuantity(quantity(38 / 3, 'in'))).toBe('12.67″');
    expect(formatQuantity(q('7.5'))).toBe('7.5');
    expect(formatQuantity(quantity(99.06, 'cm'))).toBe('99.06 cm');
    expect(formatQuantity(quantity(-3, 'in'))).toBe('−3″');
    expect(formatQuantity(q("2'"))).toBe('2′');
    expect(formatQuantity(arithmetic('*', q('24"'), q('8"')).quantity!)).toBe('192 in²');
  });
});

describe('compareQuantities — a written result against the computed one', () => {
  it('equal is ✓', () => {
    const c = compareQuantities(q('12"'), q('12'));
    expect(c.status).toBe('ok');
    expect(c.reason).toMatch(/✓/);
  });

  it('a written value rounded to how it was written is said as rounded, with the computed value', () => {
    const c = compareQuantities(quantity(25.298, 'in'), q('25.3"'));
    expect(c.status).toBe('rounded');
    expect(c.reason).toMatch(/25\.3/);
  });

  it('a value outside that is off, with both values and which way', () => {
    const c = compareQuantities(q('46"'), q('48'));
    expect(c.status).toBe('off');
    expect(c.difference).toBe(2);
    expect(c.reason).toMatch(/48.*46|46.*48/);
    expect(compareQuantities(quantity(38 / 3, 'in'), q('12')).status).toBe('off');
  });

  it('a value chosen from a range is within it', () => {
    expect(compareQuantities(q('3–6"'), q('4')).status).toBe('within');
    expect(compareQuantities(q('3–6"'), q('7')).status).toBe('off');
    expect(compareQuantities(q('72"'), q('72–74"')).status).toBe('within');
  });

  it('nothing computed is unknown, never a pass', () => {
    expect(compareQuantities(null, q('14')).status).toBe('unknown');
  });
});
