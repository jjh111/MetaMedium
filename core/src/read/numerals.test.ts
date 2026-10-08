// Numerals read at tier 1 (MATHS-SPEC §8, Lane F — M8): the rules, one by one.
// The rates are the bench's (numerals.bench.test.ts).

import { describe, it, expect } from 'vitest';
import type { Point } from '../types';
import { MAX_TIER0_CONFIDENCE } from '../recognition';
import { handCircle, handLine as strokeLine, handPrint, handRect, handText } from '../test/strokes';
import { GLYPHS, GLYPH_TABLE } from './glyphs';
import { GLYPH_STYLES, stylesOf, drawGlyph, handGlyph, handLine } from './samples';
import { readNumerals, readGlyph, runReadings, consistentReading, NUMERAL_FLOOR, type RunRead, type GlyphRead } from './numerals';

const SIZES = [0.6, 1, 1.8] as const;
const BASE = 40;

const sortedIds = (ids: readonly number[]) => ids.slice().sort((a, b) => a - b);

/** The glyphs' strokes as read, each a sorted list, in reading order. */
const groupsOf = (strokes: Point[][]) => readNumerals(strokes).glyphs.map((g) => sortedIds(g.strokes).join(','));

describe('the set is closed', () => {
  it('holds the digits and the signs of school arithmetic, and nothing else', () => {
    expect(GLYPHS.join('')).toBe('0123456789.+−×÷=()/√πθxy°′″%');
    for (const g of GLYPHS) {
      expect(GLYPH_TABLE[g].glyph).toBe(g);
      expect(stylesOf(g).length, `${g} has a style`).toBeGreaterThan(0);
    }
  });

  it('defines each style and draws it the same on every machine', () => {
    for (const st of GLYPH_STYLES) {
      const a = drawGlyph(st, { seed: 7 }), b = drawGlyph(st, { seed: 7 });
      expect(a.strokes).toEqual(b.strokes);
      expect(a.strokes.length).toBeGreaterThan(0);
      expect(handGlyph(st, { seed: 7 }).strokes).toEqual(handGlyph(st, { seed: 7 }).strokes);
    }
    expect(handGlyph(stylesOf('4')[0], { seed: 1 }).strokes).not.toEqual(handGlyph(stylesOf('4')[0], { seed: 2 }).strokes);
  });
});

describe('strokes into glyphs', () => {
  // The spec's red first: four, five, plus, equals, times, divided-by and pi are several strokes each.
  const several = ['4', '5', '+', '=', '×', '÷', 'π'] as const;

  it.each(several)('the strokes of %s are one glyph, alone on its line, at every size', (glyph) => {
    for (const st of stylesOf(glyph).filter((s) => drawGlyph(s, { seed: 1 }).strokes.length > 1)) {
      for (const k of SIZES) {
        for (let seed = 1; seed <= 6; seed++) {
          const g = handGlyph(st, { seed: seed * 101 + 7, size: BASE * k, x: 300, baseline: 500 });
          const read = readNumerals(g.strokes, { line: g.line, asLabel: true });
          expect(read.glyphs.map((x) => sortedIds(x.strokes)), `${glyph} ${st.style} ×${k} seed ${seed}`).toEqual([g.strokes.map((_, i) => i)]);
        }
      }
    }
  });

  it('a line of them is cut where its glyphs are, whatever order the strokes came in', () => {
    for (let seed = 1; seed <= 6; seed++) {
      const hl = handLine('4 5 + 4 = 13 × 2 ÷ π', { seed, size: BASE, x: 100, baseline: 400 });
      const truth = hl.glyphs.map((_, g) => hl.glyphOf.flatMap((of, i) => (of === g ? [i] : [])).join(','));
      expect(groupsOf(hl.strokes), `seed ${seed}`).toEqual(truth);
    }
  });

  it('a five’s flag drawn last, after the next digit, still finds its five', () => {
    const hl = handLine('52', { seed: 3, size: BASE, x: 100, baseline: 400, styles: { '5': 'two' } });
    // The flag is the five's second stroke: move it to the end, as a hand that goes back to it does.
    const flag = hl.strokes[1];
    const strokes = [hl.strokes[0], ...hl.strokes.slice(2), flag];
    const read = readNumerals(strokes);
    expect(read.runs[0].text).toBe('52');
  });
});

describe('a number is a run of digits on one baseline', () => {
  it('with a point among them, and its unit after', () => {
    const hl = handLine('24.5″', { seed: 2, size: BASE, x: 100, baseline: 400 });
    const read = readNumerals(hl.strokes);
    expect(read.numbers.map((n) => [n.text, n.value, n.unit])).toEqual([['24.5', 24.5, '″']]);
  });

  it('each number of a sum on its own', () => {
    const hl = handLine('13 + 4 = 17', { seed: 4, size: BASE, x: 100, baseline: 400 });
    expect(readNumerals(hl.strokes).numbers.map((n) => n.value)).toEqual([13, 4, 17]);
  });

  it('and not a digit raised off it — a power is the next unit’s to read', () => {
    const three = handLine('3', { seed: 5, size: BASE, x: 100, baseline: 400 });
    const two = handLine('2', { seed: 6, size: BASE * 0.55, x: three.end - 4, baseline: 400 - BASE * 0.6 });
    const read = readNumerals([...three.strokes, ...two.strokes]);
    expect(read.glyphs).toHaveLength(2);
    expect(read.glyphs[0].glyph).toBe('3');
    // Off the line, a two is nearest — not surely, where it stands is no digit's — and it is no part of the number.
    expect(read.glyphs[1].candidates[0].glyph).toBe('2');
    expect(read.numbers.map((n) => n.text)).toEqual(['3']);
  });
});

describe('a lone circle or line is a shape first', () => {
  it('a lone circle is a circle, its nought a tie beside it; asked for as a label, it is read', () => {
    const circle = handCircle(200, 200, 18, { seed: 3 });
    const lone = readNumerals([circle]);
    expect(lone.glyphs[0].glyph).toBeNull();
    expect(lone.glyphs[0].shapeFirst).toBe(true);
    expect(lone.glyphs[0].ties).toContain('a circle');
    expect(lone.numbers).toEqual([]);
    const label = readNumerals([circle], { asLabel: true });
    expect(label.glyphs[0].glyph).not.toBeNull();
    expect(label.glyphs[0].ties).toContain('a circle');
  });

  it('three bubbles and two bonds are a drawing; a one and two noughts written close are a hundred', () => {
    const molecule = [
      handCircle(100, 300, 18, { seed: 1 }), strokeLine({ x: 122, y: 300 }, { x: 158, y: 300 }, { seed: 2 }),
      handCircle(180, 300, 18, { seed: 3 }), strokeLine({ x: 202, y: 300 }, { x: 238, y: 300 }, { seed: 4 }),
      handCircle(260, 300, 18, { seed: 5 }),
    ];
    const drawing = readNumerals(molecule);
    expect(drawing.glyphs.every((g) => g.glyph === null)).toBe(true);
    expect(drawing.runs.every((r) => !r.writing)).toBe(true);
    const hundred = handLine('100', { seed: 8, size: BASE, x: 100, baseline: 400, styles: { '1': 'plain', '0': 'oval' } });
    const read = readNumerals(hundred.strokes);
    expect(read.runs[0].writing).toBe(true);
    expect(read.numbers.map((n) => n.value)).toEqual([100]);
    expect(read.glyphs[0].ties).toEqual(expect.arrayContaining(['l', 'a line']));
  });

  it('printed words are letters, not numerals: nothing of them is read, what each would be kept as a tie', () => {
    for (const seed of [1, 2, 3]) {
      const p = handPrint('hello world the dinosar ran', 0, 100, { seed });
      const read = readNumerals(p.strokes);
      expect(read.glyphs.filter((g) => g.glyph).map((g) => g.glyph), `seed ${seed}`).toEqual([]);
      expect(read.numbers).toEqual([]);
    }
  });

  it('a box left for a missing number is a box', () => {
    const hl = handLine('+ 2 = 5', { seed: 9, size: BASE, x: 160, baseline: 400 });
    const box = handRect(100, 362, 34, 36, { seed: 4, round: 0.05, jitter: 1 });
    const read = readNumerals([box, ...hl.strokes]);
    expect(read.runs.map((r) => r.text).join(' ')).toBe('+2=5');
    expect(read.glyphs.some((g) => g.strokes.includes(0) && g.glyph)).toBe(false);
  });
});

describe('readings are plural, and twins are said', () => {
  it('a one is a one, an l and a line', () => {
    const g = handGlyph(stylesOf('1').find((s) => s.style === 'plain')!, { seed: 4, size: BASE, x: 100, baseline: 400 });
    const read = readNumerals(g.strokes, { line: g.line, asLabel: true }).glyphs[0];
    expect(read.glyph).toBe('1');
    expect(read.ties).toEqual(expect.arrayContaining(['l', 'a line']));
  });

  it('x and × drawn alike, with no line to stand on, are both read and the reading is doubtful; on a line, where they stand tells them apart', () => {
    const st = stylesOf('x').find((s) => s.style === 'crossed')!;
    const g = drawGlyph(st, { seed: 11, x: 100, baseline: 400 });
    const alone = readGlyph(g.strokes);
    const both = alone.candidates.filter((c) => c.glyph === 'x' || c.glyph === '×');
    expect(both).toHaveLength(2);
    for (const c of both) expect(c.score).toBeGreaterThanOrEqual(NUMERAL_FLOOR);
    expect(alone.doubtful).toBe(true);
    expect(readGlyph(g.strokes, { line: g.line }).glyph).toBe('x');
    const times = drawGlyph(stylesOf('×')[0], { seed: 11, x: 100, baseline: 400 });
    expect(readGlyph(times.strokes, { line: times.line }).glyph).toBe('×');
  });

  it('every reading is measured, and capped below certainty', () => {
    const scores = new Set<number>();
    for (const st of GLYPH_STYLES) {
      const g = handGlyph(st, { seed: 21, size: BASE, x: 100, baseline: 400 });
      for (const c of readGlyph(g.strokes, { line: g.line }).candidates) {
        expect(c.score).toBeLessThanOrEqual(MAX_TIER0_CONFIDENCE);
        expect(c.score).toBeGreaterThanOrEqual(0);
        scores.add(Math.round(c.score * 1000));
      }
    }
    // Measured, not assigned: the scores are as many as the drawings, not a few constants.
    expect(scores.size).toBeGreaterThan(GLYPH_STYLES.length);
  });

  it('a glyph under the floor is no glyph, and says what it was nearest', () => {
    const word = readGlyph([handText(0, 0, 150, 28, { seed: 2, humps: 5 })]);
    expect(word.glyph).toBeNull();
    expect(word.confidence).toBe(0);
    for (const c of word.candidates) expect(c.score).toBeLessThan(NUMERAL_FLOOR);
    expect(word.reasoning.length).toBeGreaterThan(0);
  });
});

describe('derived, deterministic, scale-free', () => {
  it('reads the same twice, and leaves the strokes it was given as they were', () => {
    const hl = handLine('12 × 3 = 36', { seed: 12, size: BASE, x: 100, baseline: 400 });
    const frozen = hl.strokes.map((s) => Object.freeze(s.map((p) => Object.freeze({ ...p }))));
    const a = readNumerals(frozen), b = readNumerals(frozen);
    expect(a).toEqual(b);
    expect(a.runs[0].text).toBe('12×3=36');
  });

  it('reads a line written zoomed in as the same line written at zoom one', () => {
    for (const seed of [1, 2, 3]) {
      const hl = handLine('7 ÷ 7 = 1', { seed, size: BASE, x: 100, baseline: 400 });
      const zoomed = hl.strokes.map((s) => s.map((p) => ({ x: p.x / 2, y: p.y / 2 })));
      const at1 = readNumerals(hl.strokes), at2 = readNumerals(zoomed, { scale: 0.5 });
      expect(at2.runs.map((r) => r.text), `seed ${seed}`).toEqual(at1.runs.map((r) => r.text));
      at1.glyphs.forEach((g, i) => expect(at2.glyphs[i].confidence).toBeCloseTo(g.confidence, 1));
    }
  });
});

describe('the arithmetic grounds the reader', () => {
  /** A run as the reader leaves it, made by hand: each glyph's candidates in order. */
  function runOf(cands: [string, number][][]): RunRead {
    const glyphs = cands.map((cs, i) => ({
      strokes: [i],
      bounds: { minX: i * 30, maxX: i * 30 + 20, minY: 0, maxY: 40 },
      candidates: cs.map(([glyph, score]) => ({ glyph, score, style: 'plain', distance: 0, ink: 1, place: 1 })),
      glyph: cs[0][0],
      confidence: cs[0][1],
      ties: [],
      doubtful: cs.length > 1 && cs[0][1] - cs[1][1] < 0.12,
      shapeFirst: false,
      letters: false,
      reasoning: '',
    })) as GlyphRead[];
    return { glyphs, line: { baseline: 40, height: 40 }, writing: true, text: '', confidence: 0, numbers: [], readings: [], bounds: { minX: 0, maxX: 0, minY: 0, maxY: 0 }, reasoning: '' };
  }

  it('13 + 2 = 16 read surely is a doubtful reading before it is a wrong sum: the next reading holds', () => {
    const run = runOf([[['1', 0.85]], [['3', 0.8]], [['+', 0.82]], [['2', 0.78]], [['=', 0.84]], [['1', 0.86]], [['6', 0.71], ['5', 0.66]]]);
    const all = runReadings(run);
    expect(all[0].text).toBe('13+2=16');
    const holds = (text: string) => {
      const m = /^(\d+)\+(\d+)=(\d+)$/.exec(text);
      return !!m && Number(m[1]) + Number(m[2]) === Number(m[3]);
    };
    const found = consistentReading(run, holds)!;
    expect(found.reading.text).toBe('13+2=15');
    expect(found.rank).toBe(1);
    expect(found.drop).toBeGreaterThan(0);
    expect(found.drop).toBeLessThan(0.02);
    // Nothing among the readings makes 13 + 2 = 19 hold.
    expect(consistentReading(runOf([[['1', 0.85]], [['3', 0.8]], [['+', 0.82]], [['2', 0.78]], [['=', 0.84]], [['1', 0.86]], [['9', 0.8]]]), holds)).toBeNull();
  });

  it('the readings of a line read from ink lead with its text', () => {
    const hl = handLine('9 − 8 = 1', { seed: 3, size: BASE, x: 100, baseline: 400 });
    const run = readNumerals(hl.strokes).runs[0];
    expect(runReadings(run)[0].text).toBe(run.text);
    expect(run.readings[0].text).toBe(run.text);
  });
});
