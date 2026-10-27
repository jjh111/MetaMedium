// The maths on the board (DIRECTOR-PLAN-W2 M5; V1-PLAN A4): what the surface
// says beside a figure and a page, decided here so it is asked in Node.
//
// Pinned: the three-line triangle with 24 and 8 written beside its legs says
// 25.30 beside its long side — a chip on the derived side, outside the figure;
// a third 24 on the long side says the conflict, in the solver's own words,
// and it stays; the apron page's steps each carry their check; changing a
// measurement changes exactly the chips that depend on it (and undo puts them
// back); what is typed after `=` is read as an expression against the page;
// and nothing is said for a board with no numbers on it.

import { describe, it, expect } from 'vitest';
import type { Bounds, Point } from '../types';
import { createSession } from '../session/session';
import type { Session } from '../session/session';
import { lineStroke, rectStroke, triangleStroke, circleStroke } from '../test/strokes';
import { diffSheets } from './sheet';
import { readSheet } from './sheet';
import { sheetLines } from './gather';
import { boardMaths, mathsChips, mathsSaid, evaluateTyped } from './board';
import type { MathsChip } from './board';
import { TRIANGLE_LABELS, TRIANGLE_CORNERS, TRIANGLE_SQUARE, TRIANGLE_LABEL_BOXES, TRIANGLE_EXPECTED } from './fixtures/triangle';
import { APRON_LINES } from './fixtures/apron.sample';

function text(s: Session, code: string, box: Bounds, at: number): string {
  return s.import({ kind: 'text', path: `text/${at}.txt`, name: code, bounds: box, code, at })!;
}

/** The right triangle ruled in three strokes, its square in the corner, and the legs labelled — the long side too when asked. */
function triangle(opts: { long?: string; unit?: string; square?: boolean } = {}) {
  const s = createSession();
  const { right, longLegEnd, shortLegEnd } = TRIANGLE_CORNERS;
  const unit = opts.unit ?? '';
  const ids = [lineStroke(right, longLegEnd), lineStroke(shortLegEnd, right), lineStroke(longLegEnd, shortLegEnd)].map((p, i) => s.addStroke(p, 1000 + i * 4000));
  if (opts.square !== false) s.addStroke(rectStroke(TRIANGLE_SQUARE.x, TRIANGLE_SQUARE.y, TRIANGLE_SQUARE.size, TRIANGLE_SQUARE.size, 12), 20000);
  text(s, TRIANGLE_LABELS.legs[0] + unit, TRIANGLE_LABEL_BOXES.longLeg, 40000);
  text(s, TRIANGLE_LABELS.legs[1] + unit, TRIANGLE_LABEL_BOXES.shortLeg, 41000);
  if (opts.long) text(s, opts.long + unit, TRIANGLE_LABEL_BOXES.longSide, 42000);
  return { s, ids };
}

const chipsOf = (s: Session): MathsChip[] => {
  const board = boardMaths(s.getState());
  return board ? mathsChips(board) : [];
};
const kind = (chips: MathsChip[], k: MathsChip['kind']) => chips.filter((c) => c.kind === k);
const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

describe('a derived side, beside its figure', () => {
  it('legs of 24 and 8 put 25.30 beside the long side, outside the triangle, for the marks that drew it', () => {
    const { s, ids } = triangle();
    const chips = chipsOf(s);
    const sides = kind(chips, 'side');
    expect(sides).toHaveLength(1);
    const long = sides[0];
    expect(long.text).toBe('25.30');
    // Beside the middle of the long side (between its two ends), on the side away from the right angle.
    const { longLegEnd, shortLegEnd, right } = TRIANGLE_CORNERS;
    const mid = { x: (longLegEnd.x + shortLegEnd.x) / 2, y: (longLegEnd.y + shortLegEnd.y) / 2 };
    expect(dist(long.at, mid)).toBeLessThan(60);
    expect(dist(long.at, right)).toBeGreaterThan(dist(mid, right));
    expect(long.ids).toEqual(expect.arrayContaining(ids));
    expect(long.reason).toContain('√(24² + 8²)');
    // A derived side is momentary: it is not a problem, so it does not stand.
    expect(long.standing).toBe(false);
    expect(kind(chips, 'conflict')).toHaveLength(0);
  });

  it('says the unit the labels write: 25.30″', () => {
    const { s } = triangle({ unit: '″' });
    expect(kind(chipsOf(s), 'side')[0].text).toBe('25.30″');
  });

  it('says nothing for a board with no numbers, and nothing for a board of words that are not maths', () => {
    const s = createSession();
    s.addStroke(rectStroke(100, 100, 120, 80), 1000);
    expect(boardMaths(s.getState())).toBeNull();
    text(s, 'a note about the day', { minX: 300, maxX: 500, minY: 100, maxY: 140 }, 2000);
    const board = boardMaths(s.getState());
    expect(board ? mathsChips(board) : []).toEqual([]);
  });
});

describe('a label that cannot hold', () => {
  it('a third 24 on the long side says the conflict in the solver’s words, and it stands', () => {
    const { s } = triangle({ long: '24' });
    const chips = chipsOf(s);
    const conflicts = kind(chips, 'conflict');
    expect(conflicts).toHaveLength(1);
    expect(conflicts[0].text).toBe(TRIANGLE_EXPECTED.conflict);
    expect(conflicts[0].standing).toBe(true);
    // Beside the label it is about: near the long side.
    const { longLegEnd, shortLegEnd } = TRIANGLE_CORNERS;
    const mid = { x: (longLegEnd.x + shortLegEnd.x) / 2, y: (longLegEnd.y + shortLegEnd.y) / 2 };
    expect(dist(conflicts[0].at, mid)).toBeLessThan(80);
    // The long side is labelled, so nothing is derived for it.
    expect(kind(chips, 'side')).toHaveLength(0);
  });
});

describe('the panel’s words', () => {
  it('a figure’s marks say the answer in a plain line and every derived value with its formula', () => {
    const { s, ids } = triangle();
    const board = boardMaths(s.getState())!;
    const said = mathsSaid(board, [ids[0]])!;
    expect(said.lines.join(' ')).toContain('25.30');
    expect(said.rows.some((r) => r.v.includes('25.30') && (r.why ?? '').includes('√(24² + 8²)'))).toBe(true);
  });

  it('a conflict is said in the plain lines too', () => {
    const { s, ids } = triangle({ long: '24' });
    const said = mathsSaid(boardMaths(s.getState())!, ids)!;
    expect(said.lines).toContain(TRIANGLE_EXPECTED.conflict);
  });

  it('a mark that is on no figure and no page says nothing', () => {
    const { s } = triangle();
    const far = s.addStroke(circleStroke(2000, 2000, 40), 90000);
    expect(mathsSaid(boardMaths(s.getState())!, [far])).toBeNull();
  });
});

describe('a page: each step carries its check', () => {
  const pageBoard = (lines: readonly string[]) => {
    const s = createSession();
    const id = text(s, lines.join('\n'), { minX: 100, maxX: 500, minY: 100, maxY: 100 + lines.length * 30 }, 1000);
    return { s, id };
  };
  const stepTexts = (chips: MathsChip[]) => Object.fromEntries(kind(chips, 'step').map((c) => [c.key, c.text]));

  it('the sample page’s steps are each checked, on the line they belong to', () => {
    const { s, id } = pageBoard(APRON_LINES);
    const chips = chipsOf(s);
    const steps = kind(chips, 'step');
    expect(steps).toHaveLength(6);
    expect(stepTexts(chips)).toEqual({
      'step:1': '✓ 14″',
      'step:2': '✓ 7″',
      'step:3': '✓ 22″',
      'step:4': '✓ 48″ · or 46″',
      'step:5': '✓ 38″ · or 36″',
      'step:6': '✓ 72″ · or 74″',
    });
    for (const c of steps) expect(c.ids).toEqual([id]);
    // Each stands beside its own line, in reading order down the page, right of the text.
    const ys = steps.map((c) => c.at.y);
    expect([...ys].sort((a, b) => a - b)).toEqual(ys);
    expect(steps.every((c) => c.at.x >= 500 && c.align === 'left')).toBe(true);
    // Nothing on this page is wrong, so nothing stands at rest.
    expect(steps.some((c) => c.standing)).toBe(false);
  });

  it('a written result that is off stands, with what it computes and what was written', () => {
    const { s } = pageBoard(['A. Bust 36', '1. A ÷ 3 = 15']);
    const step = kind(chipsOf(s), 'step')[0];
    expect(step.text).toBe('✗ 12 · written 15');
    expect(step.standing).toBe(true);
  });

  it('changing A changes exactly the chips that depend on it — and the panel says the same', () => {
    const before = pageBoard(APRON_LINES);
    const lines38 = APRON_LINES.map((l) => (l === 'A. Bust 36' ? 'A. Bust 38' : l));
    const after = pageBoard(lines38);
    const a = stepTexts(chipsOf(before.s)), b = stepTexts(chipsOf(after.s));
    const changed = Object.keys(b).filter((k) => a[k] !== b[k]);
    // The sheet's own diff is the oracle: the steps whose values or checks differ.
    const diff = diffSheets(readSheet(sheetLines(before.s.getState())), readSheet(sheetLines(after.s.getState())));
    expect(changed.sort()).toEqual(diff.filter((k) => /^\d+$/.test(k)).map((k) => `step:${k}`).sort());
    expect(changed).toEqual(expect.arrayContaining(['step:1', 'step:2', 'step:5']));
    expect(changed).not.toContain('step:3');
    expect(changed).not.toContain('step:6');
  });

  it('a page of prose says nothing at all', () => {
    const { s } = pageBoard(['Sew the seams first.', 'Press them open.']);
    expect(chipsOf(s)).toEqual([]);
  });

  it('a note with a colon or a dash in it is prose, not a step: no chip, no problem standing at rest (F2)', () => {
    const { s } = pageBoard(['Draw a box: then an arrow - and it reads', 'Note: keep it short', '1. Draw a box', '2. Hold it - then choose what it becomes']);
    expect(chipsOf(s)).toEqual([]);
  });
});

describe('what is typed after =', () => {
  it('reads an expression and says its result before it is put on the board', () => {
    const r = evaluateTyped('= 24 ÷ 3', null);
    expect(r).toMatchObject({ ok: true, result: '8', words: '24 ÷ 3 = 8' });
  });

  it('reads the typed forms, brackets and a unit: =(39+6)/2 is 22.5', () => {
    expect(evaluateTyped('=(39+6)/2', null)).toMatchObject({ ok: true, result: '22.5', words: '(39 + 6) ÷ 2 = 22.5' });
    expect(evaluateTyped('= 3 * 4"', null)).toMatchObject({ ok: true, result: '12″' });
  });

  it('reads a name the page defines: = A ÷ 3 on the apron page is 12', () => {
    const s = createSession();
    text(s, APRON_LINES.join('\n'), { minX: 100, maxX: 500, minY: 100, maxY: 400 }, 1000);
    const r = evaluateTyped('= A ÷ 3', boardMaths(s.getState()));
    expect(r).toMatchObject({ ok: true, result: '12″', words: 'A ÷ 3 = 12″' });
  });

  it('a chain typed whole is kept as typed, and says whether it holds', () => {
    expect(evaluateTyped('= 13 + 2 = 15', null)).toMatchObject({ ok: true, result: '15', words: '13 + 2 = 15' });
  });

  it('says why when it cannot read it, and when nothing is typed yet', () => {
    expect(evaluateTyped('= ', null)).toMatchObject({ ok: false });
    const r = evaluateTyped('= hello', null);
    expect(r.ok).toBe(false);
    expect(evaluateTyped('= Waist ÷ 2', null)).toMatchObject({ ok: false, reason: 'Waist is not on this sheet' });
  });
});

// Each of these was the committed bundle's answer in the field, 27 Oct 2026: said as if it were right.
describe('what is typed after =, as the field answered it wrongly', () => {
  const apron = () => {
    const s = createSession();
    text(s, APRON_LINES.join('\n'), { minX: 100, maxX: 500, minY: 100, maxY: 400 }, 1000);
    return boardMaths(s.getState());
  };
  /** What `=` puts on the board reads back, as a line of the page, as a sum that holds. */
  const holds = (words: string) => {
    const e = readSheet([{ text: words, maths: true }]).entries[0];
    return e.kind === 'check' && !!e.readings[0]?.value && e.readings[0].checks.every((c) => c.status === 'ok' || c.status === 'rounded');
  };

  it('sqrt(16) is a square root — never a name given the number in its brackets (it was “sqrt = 16”)', () => {
    expect(evaluateTyped('= sqrt(16)', null)).toMatchObject({ ok: true, result: '4', words: '√16 = 4' });
    expect(evaluateTyped('= sqrt 16', null)).toMatchObject({ ok: true, result: '4' });
    expect(evaluateTyped('= Sqrt(16)', null)).toMatchObject({ ok: true, result: '4' });
    expect(holds('√16 = 4')).toBe(true);
    const negative = evaluateTyped('= sqrt(-4)', null);
    expect(negative.ok).toBe(false);
    if (!negative.ok) expect(negative.reason).toMatch(/negative/);
  });

  it('a name the page lacks is not given the number in brackets beside it', () => {
    const r = evaluateTyped('= Foo(16)', null);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.reason).toMatch(/Foo is not on this sheet/);
  });

  it('the operands shown agree with the result: 1.005 + 1 = 2.005 (it was “1 + 1 = 2.01”)', () => {
    expect(evaluateTyped('= 1.005 + 1', null)).toMatchObject({ ok: true, result: '2.005', words: '1.005 + 1 = 2.005' });
    expect(evaluateTyped('= 0.125 × 3', null)).toMatchObject({ ok: true, result: '0.375', words: '0.125 × 3 = 0.375' });
    expect(holds('1.005 + 1 = 2.005')).toBe(true);
  });

  it('a dash between a product and a number is a minus first: 24 * 3 - 4 is 68, or 72–96 as a range', () => {
    const r = evaluateTyped('= 24 * 3 - 4', null);
    expect(r).toMatchObject({ ok: true, result: '68', words: '(24 × 3) − 4 = 68' });
    if (r.ok) expect(r.also).toMatch(/= 72–96$/);
    // After a sum the dash is still the range a drafter writes: + 3–6″ (the tunic's step 3).
    expect(evaluateTyped('= 2 + 3-6"', null)).toMatchObject({ ok: true, result: '5–8″' });
  });

  it('“in cm” converts, and what it cannot convert it says — never a request dropped in silence (it was “68″ = 68″”)', () => {
    expect(evaluateTyped('= 5′ 8″ in cm', null)).toMatchObject({ ok: true, result: '172.72 cm', words: '68″ = 172.72 cm' });
    expect(evaluateTyped('= 25.4 mm in in', null)).toMatchObject({ ok: true, result: '1″', words: '25.4 mm = 1″' });
    expect(evaluateTyped('= 10 ft in in', null)).toMatchObject({ ok: true, result: '120″', words: '10′ = 120″' });
    expect(evaluateTyped('= 24″ + 3″ to cm', null)).toMatchObject({ ok: true, result: '68.58 cm', words: '24″ + 3″ = 27″ = 68.58 cm' });
    for (const w of ['68″ = 172.72 cm', '25.4 mm = 1″', '24″ + 3″ = 27″ = 68.58 cm']) expect(holds(w), w).toBe(true);
    // A bare number takes the page's unit, as every bare measurement on it does.
    expect(evaluateTyped('= A in cm', apron())).toMatchObject({ ok: true, result: '91.44 cm' });
    const bare = evaluateTyped('= 24 ÷ 3 in cm', null);
    expect(bare.ok).toBe(false);
    if (!bare.ok) expect(bare.reason).toMatch(/no unit/);
    const odd = evaluateTyped('= 5′ 8″ in furlongs', null);
    expect(odd.ok).toBe(false);
    if (!odd.ok) expect(odd.reason).toMatch(/furlongs/);
  });

  it('sin 30 is a sine, in degrees — never a definition of sin (it was “sin 30 says what sin is”)', () => {
    expect(evaluateTyped('= sin 30', null)).toMatchObject({ ok: true, result: '0.5', words: 'sin 30° = 0.5' });
    expect(evaluateTyped('sin 30', null)).toMatchObject({ ok: true, result: '0.5' });
    expect(holds('sin 30° = 0.5')).toBe(true);
    const alone = evaluateTyped('= sin', null);
    expect(alone.ok).toBe(false);
    if (!alone.ok) expect(alone.reason).toMatch(/sin needs/);
    const wide = evaluateTyped('= asin(2)', null);
    expect(wide.ok).toBe(false);
    if (!wide.ok) expect(wide.reason).toMatch(/−1 to 1/);
  });

  it('reads what the engine writes in its formulas: √, ², ³, π, ° and the trig of a triangle', () => {
    const cases: [string, string][] = [
      ['= 3²', '9'], ['= 2³', '8'], ['= 3^2', '9'], ['= −3²', '−9'], ['= √16', '4'], ['= π × 2', '6.28'], ['= 2π', '6.28'],
      ['= 28 ÷ 2π', '4.46'], ['= √(24² + 8²)', '25.3'], ['= atan(8 ÷ 24)', '18.43°'], ['= 180° − 40° − 60°', '80°'],
      ['= ½ × 24 × 8 × sin 90°', '96'], ['= 10 × sin 40° ÷ sin 80°', '6.53'], ['= acos((24² + 25.3² − 8²) ÷ (2 × 24 × 25.3))', '18.43°'],
      ['= √(8² + (2–4)²)', '8.25–8.94'], ['= 2 × asin(12 ÷ (2 × 7.5))', '106.26°'], ['= π × 7.5 × 106.26° ÷ 180°', '13.91'],
    ];
    for (const [typed, result] of cases) expect(evaluateTyped(typed, null), typed).toMatchObject({ ok: true, result });
    for (const [typed] of cases) {
      const r = evaluateTyped(typed, null);
      if (r.ok) expect(holds(r.words), r.words).toBe(true);
    }
  });
});

describe('the panel says each reading once, and says when the steps do not stand on one reading', () => {
  const page = () => {
    const s = createSession();
    const id = text(s, APRON_LINES.join('\n'), { minX: 100, maxX: 500, minY: 100, maxY: 400 }, 1000);
    return mathsSaid(boardMaths(s.getState())!, [id])!;
  };

  it('a step’s second reading is said once, not twice (it was “or 46″ from the measurements; or 46″ from the measurements ✗ written 48”)', () => {
    const said = page();
    for (const row of said.rows) {
      const ors = (row.why ?? '').match(/; or /g) ?? [];
      const readings = row.v.includes(' · or ') ? row.v.split(' · or ').length - 1 : 0;
      expect(ors.length, `${row.k} ${row.why}`).toBe(readings);
    }
    const four = said.rows.find((r) => r.k === '4.')!;
    expect(four.why).toMatch(/or 46″ from the measurements ✗ written 48/);
  });

  it('every step agrees, and the summary says that steps 4 and 5 take the seam allowance and step 6 does not (it was “every one agrees”)', () => {
    expect(page().lines[0]).toBe('6 steps — every one agrees, but not all on one reading: steps 4 and 5 with seam allowance; step 6 from the measurements');
  });

  it('a page whose steps stand on one reading says only that they agree', () => {
    const s = createSession();
    const id = text(s, ['A. Bust 36', '1. A ÷ 3 = 12', '2. ① ÷ 2 = 6'].join('\n'), { minX: 100, maxX: 500, minY: 100, maxY: 200 }, 1000);
    expect(mathsSaid(boardMaths(s.getState())!, [id])!.lines[0]).toBe('2 steps — every one agrees');
  });
});

// A number's figure stands beside it, so only the ink beside a number is read for figures: on a board of
// two thousand marks with one number on it the dimensions and the solver walked every figure against every
// other, two seconds a stroke (bench/board.mjs, measured at R4c's 2,000). What the maths says of a drawing
// must not depend on what else is on the board — that is the property, and the cost follows from it.
describe('a board with a lot on it', () => {
  it('says exactly what the drawing alone says, and reads no figure a number is not beside', () => {
    const alone = triangle();
    const crowded = triangle();
    // A wall of boxes and lines far to one side, and a small drawing of them near the triangle's label on the other.
    for (let i = 0; i < 300; i++) crowded.s.addStroke(rectStroke(3000 + (i % 30) * 150, 2000 + Math.floor(i / 30) * 120, 90, 60), 100000 + i * 4000);
    for (let i = 0; i < 60; i++) crowded.s.addStroke(lineStroke({ x: 3000 + i * 40, y: 1500 }, { x: 3000 + i * 40 + 30, y: 1560 }), 2000000 + i * 4000);
    const a = boardMaths(alone.s.getState())!, b = boardMaths(crowded.s.getState())!;
    expect(b.figures).toHaveLength(a.figures.length);
    const said = (board: NonNullable<typeof a>) => mathsChips(board).map((c) => [c.key.replace(/figure:[^:]*/, 'figure'), c.kind, c.text, Math.round(c.at.x), Math.round(c.at.y)]);
    expect(said(b)).toEqual(said(a));
  });

  it('reads the drawing a number is written beside, however dense it is around, and its ruled lines with it', () => {
    const { s } = triangle();
    // Clutter touching the triangle's own corner: a ruled figure's strokes are pulled in by what they meet.
    for (let i = 0; i < 40; i++) s.addStroke(lineStroke({ x: 100 + i * 3, y: 400 + i }, { x: 130 + i * 3, y: 430 + i }), 60000 + i * 4000);
    const board = boardMaths(s.getState())!;
    expect(kind(mathsChips(board), 'side').map((c) => c.text)).toEqual(['25.30']);
  });
});

// A triangle whose ends do not close is no figure, and says nothing.
describe('an open drawing', () => {
  it('two lines and a number beside them are not a figure: no chip', () => {
    const s = createSession();
    const { right, longLegEnd, shortLegEnd } = TRIANGLE_CORNERS;
    s.addStroke(lineStroke(right, longLegEnd), 1000);
    s.addStroke(lineStroke(shortLegEnd, right), 5000);
    text(s, '24', TRIANGLE_LABEL_BOXES.longLeg, 9000);
    expect(kind(chipsOf(s), 'side')).toEqual([]);
    // (a closed stroke of the same triangle still is one)
    const t = createSession();
    t.addStroke(triangleStroke(right, longLegEnd, shortLegEnd), 1000);
    text(t, '24', TRIANGLE_LABEL_BOXES.longLeg, 9000);
    text(t, '8', TRIANGLE_LABEL_BOXES.shortLeg, 9500);
    expect(kind(chipsOf(t), 'side').length).toBe(1);
  });
});
