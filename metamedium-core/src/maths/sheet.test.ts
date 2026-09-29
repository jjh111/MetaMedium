// The sheet — lines of writing or text become definitions, steps and checks
// (MATHS-PLAN.md §4; DIRECTOR-PLAN-W2 M2).
//
// Red first: over the M1 fixtures, change A from 36 to 38 — steps 1, 2 and 5
// re-derive and nothing else moves. The sheet is a pure function of its
// lines: nothing it derives is written anywhere, and the same lines always
// read the same way.

import { describe, it, expect } from 'vitest';
import { readSheet, sheetEntry, sheetValue, dependentsOf, diffSheets, checkWritten, describeSheet } from './sheet';
import type { Sheet, StepEntry, SheetEntry } from './sheet';
import { formatQuantity } from './quantity';
import type { Quantity } from './quantity';
import { APRON_LINES, APRON_BRACE, APRON_BRACE_STEP } from './fixtures/apron.sample';
import { TUNIC_LINES } from './fixtures/tunic.sample';

const fmt = (x: Quantity | null | undefined) => (x ? formatQuantity(x) : null);
const step = (sheet: Sheet, n: string) => {
  const e = sheetEntry(sheet, n);
  if (!e || e.kind !== 'step') throw new Error(`no step ${n}`);
  return e as StepEntry;
};
const withA = (v: string) => APRON_LINES.map((l) => (l === 'A. Bust 36' ? `A. Bust ${v}` : l));

describe('the apron page as a sheet', () => {
  const sheet = readSheet(APRON_LINES);

  it('reads each line as what it is: three measurements, a heading, six steps', () => {
    expect(sheet.entries.map((e) => e.kind)).toEqual([
      'definition', 'definition', 'definition', 'heading', 'step', 'step', 'step', 'step', 'step', 'step',
    ]);
  });

  it('speaks inches, because the page writes ″, and says so', () => {
    expect(sheet.unit).toBe('in');
    expect(sheet.unitReason).toMatch(/″/);
  });

  it('a measurement is found by its letter and by its name', () => {
    expect(fmt(sheetValue(sheet, 'A'))).toBe('36″');
    expect(fmt(sheetValue(sheet, 'Bust'))).toBe('36″');
    expect(fmt(sheetValue(sheet, 'B'))).toBe('20″');
    expect(fmt(sheetValue(sheet, 'top to waist'))).toBe('20″');
    expect(fmt(sheetValue(sheet, 'Top to bottom'))).toBe('46″');
  });

  it('keeps the heading as context: the seam allowance is 2″, as steps 1 and 3 add it', () => {
    const h = sheet.entries[3];
    expect(h.kind).toBe('heading');
    if (h.kind !== 'heading') return;
    expect(h.title).toBe('Add seam allowance');
    expect(h.allowance).toMatchObject({ label: 'with seam allowance', from: ['1', '3'] });
    expect(fmt(h.allowance!.amount)).toBe('2″');
  });

  it('works every step, and every written result of 1, 2 and 3 checks', () => {
    expect(['1', '2', '3', '4', '5', '6'].map((n) => fmt(step(sheet, n).value))).toEqual(['14″', '7″', '22″', '48″', '38″', '72″']);
    for (const n of ['1', '2', '3']) {
      const s = step(sheet, n);
      expect(s.readings, n).toHaveLength(1);
      expect(s.readings[0].checks.every((c) => c.status === 'ok'), n).toBe(true);
    }
  });

  it('4. C 48 and 5. A 38″ are the measurement with seam allowance — the reading that checks leads, the bare measurement beside it', () => {
    const four = step(sheet, '4');
    expect(four.readings.map((r) => [fmt(r.value), r.label ?? null, r.checks.map((c) => c.status)])).toEqual([
      ['48″', 'with seam allowance', ['ok']],
      ['46″', null, ['off']],
    ]);
    const five = step(sheet, '5');
    expect(five.readings.map((r) => fmt(r.value))).toEqual(['38″', '36″']);
    expect(five.readings[0].label).toBe('with seam allowance');
  });

  it('6. (C × 2) − B reads two ways: 72 from the measurements, 74 with seam allowance on both', () => {
    const six = step(sheet, '6');
    expect(six.readings.map((r) => fmt(r.value))).toEqual(['72″', '74″']);
    expect(six.readings[0].checks.map((c) => c.status)).toEqual(['ok']);
    expect(six.readings[0].reason).toMatch(/from the measurements/);
    expect(six.readings[1].reason).toMatch(/with seam allowance on C and B/);
    expect(six.reason).toMatch(/74″/);
  });

  it('the brace\'s 72–74″ spans both readings of step 6', () => {
    const c = checkWritten(sheet, APRON_BRACE_STEP, APRON_BRACE)!;
    expect(c.status).toBe('spans');
    expect(c.reason).toMatch(/72″/);
    expect(c.reason).toMatch(/74″/);
  });

  it('knows what depends on what', () => {
    expect(dependentsOf(sheet, 'A')).toEqual(['1', '2', '5']);
    expect(dependentsOf(sheet, 'Bust')).toEqual(['1', '2', '5']);
    expect(dependentsOf(sheet, 'B')).toEqual(['3', '6']);
    expect(dependentsOf(sheet, 'C')).toEqual(['4', '6']);
    expect(dependentsOf(sheet, '1')).toEqual(['2']);
  });

  it('describes itself in a few lines', () => {
    const d = describeSheet(sheet);
    expect(d).toMatch(/A · Bust = 36″/);
    expect(d).toMatch(/6\. .*72″.*74″/);
  });
});

describe('change the bust — the red-first regression', () => {
  it('A from 36 to 38: steps 1, 2 and 5 re-derive and nothing else moves', () => {
    const before = readSheet(APRON_LINES);
    const after = readSheet(withA('38'));
    expect(diffSheets(before, after)).toEqual(['A', '1', '2', '5']);
    expect(fmt(step(after, '1').value)).toBe('14.67″');
    expect(step(after, '1').readings[0].checks.map((c) => c.status)).toEqual(['off', 'off']);
    expect(fmt(step(after, '2').value)).toBe('7.33″');
    // 38 is now the measurement itself: the reading that checks is the plain one.
    expect(step(after, '5').readings[0]).toMatchObject({ checks: [expect.objectContaining({ status: 'ok' })] });
    expect(step(after, '5').readings[0].label).toBeUndefined();
    for (const n of ['3', '4', '6']) expect(step(after, n).readings, n).toEqual(step(before, n).readings);
  });

  it('changing it back restores every step exactly', () => {
    expect(diffSheets(readSheet(APRON_LINES), readSheet(withA('36')))).toEqual([]);
    expect(readSheet(withA('36'))).toEqual(readSheet(APRON_LINES));
  });

  it('is a pure function of its lines', () => {
    expect(readSheet(APRON_LINES)).toEqual(readSheet(APRON_LINES));
  });
});

describe('the tunic page as a sheet', () => {
  const sheet = readSheet(TUNIC_LINES);

  it('works every step from its worked line', () => {
    expect(sheet.unit).toBe('in');
    expect(['1', '2', '3', '4', '5'].map((n) => fmt(step(sheet, n).value))).toEqual(['21″', '56″', '22″', '7.5″', '23″']);
  });

  it('step 1 keeps both readings, the one its worked line has first', () => {
    const s = step(sheet, '1');
    expect(s.readings.map((r) => r.formula)).toEqual(['(Chest + 6″) ÷ 2', 'Chest + (6″ ÷ 2)']);
  });

  it('says the chest is not on this sheet and the worked line put 36 for it', () => {
    const s = step(sheet, '1');
    expect(s.reason).toMatch(/Chest is not on this sheet/);
    expect(s.reason).toMatch(/36″/);
  });
});

describe('what a sheet never does: throw, guess, or settle', () => {
  it('a cycle is a reading that says so', () => {
    const sheet = readSheet(['1. ② + 1', '2. ① + 1']);
    for (const n of ['1', '2']) {
      expect(step(sheet, n).value, n).toBeNull();
      expect(step(sheet, n).reason, n).toMatch(/cycle/);
    }
    expect(step(readSheet(['1. ① + 1']), '1').reason).toMatch(/cycle/);
  });

  it('an unknown name, or a step that is not there, is said', () => {
    expect(step(readSheet(['1. Waist ÷ 4']), '1').reason).toMatch(/Waist is not on this sheet/);
    expect(step(readSheet(['1. ③ + 1']), '1').reason).toMatch(/no step 3/);
  });

  it('a measurement written twice keeps the first and says the second disagrees', () => {
    const sheet = readSheet(['A. Bust 36', 'A. Bust 38']);
    expect(fmt(sheetValue(sheet, 'A'))).toBe('36');
    const second = sheet.entries[1];
    expect(second.kind === 'definition' && second.conflict).toMatch(/36/);
  });

  it('a step\'s number written on the drawing is a label to check, not a new step', () => {
    const off = readSheet([...APRON_LINES, '1. 15"']);
    const label = off.entries[off.entries.length - 1];
    expect(label).toMatchObject({ kind: 'label', step: '1' });
    expect(label.kind === 'label' && label.check?.status).toBe('off');
    const ok = readSheet([...APRON_LINES, '1. 14"']);
    const good = ok.entries[ok.entries.length - 1];
    expect(good.kind === 'label' && good.check?.status).toBe('ok');
  });

  it('a value on its own is matched to the step it agrees with', () => {
    const sheet = readSheet([...APRON_LINES, APRON_BRACE]);
    const v = sheet.entries[sheet.entries.length - 1] as SheetEntry;
    expect(v.kind).toBe('value');
    if (v.kind !== 'value') return;
    expect(v.matches.map((m) => [m.step, m.status])).toContainEqual(['6', 'spans']);
  });

  it('a worked line on a line of its own belongs to the step above it', () => {
    const sheet = readSheet(['1. Chest + 6" ÷ 2', '(36 + 6)/2 = 21"']);
    expect(sheet.entries[1]).toMatchObject({ kind: 'worked', step: '1' });
    expect(fmt(step(sheet, '1').value)).toBe('21″');
    expect(step(sheet, '1').readings[0].formula).toBe('(Chest + 6″) ÷ 2');
  });

  it('arithmetic on its own is a check', () => {
    const ok = readSheet(['13 + 2 = 15']).entries[0];
    expect(ok.kind).toBe('check');
    expect(ok.kind === 'check' && ok.readings[0].checks.map((c) => c.status)).toEqual(['ok']);
    const off = readSheet(['13 + 2 = 16']).entries[0];
    expect(off.kind === 'check' && off.readings[0].checks.map((c) => c.status)).toEqual(['off']);
  });

  it('where a line stands, and what it was read from, pass through untouched', () => {
    const sheet = readSheet([{ text: 'A. Bust 36', at: { x: 10, y: 20 }, ids: ['stroke:7'] }]);
    expect(sheet.entries[0]).toMatchObject({ at: { x: 10, y: 20 }, ids: ['stroke:7'] });
  });

  it('a heading may state its amount; a step that adds it itself is not read twice', () => {
    const sheet = readSheet(['A. Bust 36', 'Add 5/8" seam allowance', '1. A', '2. A ÷ 4 + 5/8']);
    const h = sheet.entries[1];
    expect(h.kind === 'heading' && h.allowance).toMatchObject({ label: 'with seam allowance', from: [] });
    expect(h.kind === 'heading' && fmt(h.allowance!.amount)).toBe('⅝″');
    expect(step(sheet, '1').readings.map((r) => [fmt(r.value), r.label ?? null])).toEqual([['36″', null], ['36.63″', 'with seam allowance']]);
    expect(step(sheet, '2').readings).toHaveLength(1);
  });

  it('mixed units convert, and the reading says so', () => {
    const sheet = readSheet(['A. Bust 91 cm', 'B. Waist 30"', '1. A + B']);
    expect(fmt(step(sheet, '1').value)).toBe('167.2 cm');
    expect(step(sheet, '1').reason).toMatch(/30″ is 76\.2 cm/);
  });

  it('a step with no value says why, in the sheet\'s own description too', () => {
    const d = describeSheet(readSheet(['1. ② + 1', '2. ① + 1', '3. ① × 2', '4. Waist ÷ 4']));
    expect(d).toMatch(/1\. ② \+ 1 — .*cycle/);
    expect(d).toMatch(/3\. ① × 2 — step 1 is in a cycle/);
    expect(d).toMatch(/4\. Waist ÷ 4 — Waist is not on this sheet/);
  });

  it('a unit given is the unit a bare measurement takes; no unit anywhere leaves numbers bare', () => {
    expect(fmt(sheetValue(readSheet(['A. Bust 91'], { unit: 'cm' }), 'A'))).toBe('91 cm');
    const bare = readSheet(['A. 3', '1. A × 2']);
    expect(bare.unit).toBeNull();
    expect(fmt(step(bare, '1').value)).toBe('6');
  });
});

// F2 — prose on the board is not maths. A colon is an `=` and a dash a minus to the grammar, so an
// ordinary note used to read as a step or a check with words for operands, and each stood a `?` at
// rest (a "problem"). A line counts as maths only when it looks like it: an operator whose operands
// are numbers, references or names the page defines — never two words with a dash between them.
describe('prose is not maths', () => {
  const PROSE = [
    'Draw a box: then an arrow - and it reads',
    'Note: keep it short',
    'Step one: draw',
    'Total: many',
    'color: red',
    'Draw 3 boxes - then join them',
    'Wait 5 min then go',
    'Hold a molecule and the field says what it reads as.',
    'Hold the lone bubble and it says bubble - draw more',
    '1. Draw a box',
    '2. Hold it - then choose what it becomes',
    '3. Draw 3 boxes - then join them',
  ];
  const says = (e: SheetEntry) => e.kind === 'step' || e.kind === 'check';

  it('says nothing: no step, no check, on any line of it', () => {
    for (const line of PROSE) {
      const e = readSheet([line]).entries[0];
      expect(says(e), `${line} → ${e.kind}: ${e.reason}`).toBe(false);
    }
  });

  it('says nothing beside a page that has maths on it, and leaves the page alone', () => {
    const page = readSheet([...APRON_LINES, ...PROSE]);
    const plain = readSheet(APRON_LINES);
    expect(page.entries.slice(0, APRON_LINES.length).map((e) => [e.kind, e.reason])).toEqual(plain.entries.map((e) => [e.kind, e.reason]));
    expect(page.entries.slice(APRON_LINES.length).filter(says)).toEqual([]);
    expect(page.unit).toBe(plain.unit);
  });

  it('a name the page defines still makes a line maths, and so does a sum of numbers', () => {
    expect(readSheet(['A. Bust 36', 'Bust ÷ 3']).entries[1].kind).toBe('check');
    expect(readSheet(['24 - 8 = 16']).entries[0].kind).toBe('check');
    expect(readSheet(['1. Waist ÷ 4']).entries[0].kind).toBe('step');
  });

  it('a line typed as a sum is read as one, whatever its words', () => {
    const e = readSheet([{ text: 'Waist ÷ 2', maths: true }]).entries[0];
    expect(e.kind).toBe('check');
  });
});
