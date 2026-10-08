// The numerals' closed set (MATHS-SPEC §8, Lane F — M8).
//
// Digits and the signs of school arithmetic, read from ink at tier 1 with no
// model: a closed vocabulary, like the shape rung's eight, so the reader can be
// benched against everything else the canvas draws. Each glyph says what kind
// of thing it is, its words for a person, and its TWINS — what the same ink
// may as well be: a letter outside this set (O, l), a shape the shape rung
// reads (a circle, a line, a dot), or another glyph of the set that only its
// place on the line tells apart (x and ×, a dot and a degree). A twin is never
// hidden behind the reading: a lone circle is a circle first and a nought
// beside it, said as a tie.
//
// Where a glyph stands on its line is part of what it is. A full stop sits on
// the baseline, a degree at the top; a minus at the middle; x sits on the
// baseline at the height of a small letter, × in the middle. That is measured
// from the parametric samples (samples.ts), not written here.

/** Every glyph the reader reads. */
export const GLYPHS = [
  '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
  '.', '+', '−', '×', '÷', '=', '(', ')', '/', '√', 'π', 'θ', 'x', 'y', '°', '′', '″', '%',
] as const;

export type Glyph = (typeof GLYPHS)[number];

/** What part a glyph plays in a line of maths. */
export type GlyphKind = 'digit' | 'point' | 'operator' | 'relation' | 'bracket' | 'root' | 'name' | 'unit';

export interface GlyphInfo {
  glyph: Glyph;
  kind: GlyphKind;
  /** Its name in plain words, for a person. */
  words: string;
  /** The text a reading writes for it: a number's own characters, the sign as typed maths reads it. */
  text: string;
  /**
   * What the same ink may as well be, outside the set: a letter (`O`, `l`), or
   * a shape the shape rung reads (`a circle`, `a line`, `a dot`, `an arc`).
   */
  twins: readonly string[];
  /** Glyphs of the set that the ink alone cannot tell from this one; where it stands on its line does. */
  lookalikes: readonly Glyph[];
}

const info = (glyph: Glyph, kind: GlyphKind, words: string, twins: readonly string[] = [], lookalikes: readonly Glyph[] = [], text: string = glyph): GlyphInfo =>
  ({ glyph, kind, words, text, twins, lookalikes });

/** The table: one row a glyph. */
export const GLYPH_TABLE: Readonly<Record<Glyph, GlyphInfo>> = {
  '0': info('0', 'digit', 'nought', ['O', 'o', 'a circle'], ['°']),
  '1': info('1', 'digit', 'one', ['l', 'I', 'a line'], ['/', '′']),
  '2': info('2', 'digit', 'two', ['z', 'Z']),
  '3': info('3', 'digit', 'three'),
  '4': info('4', 'digit', 'four'),
  '5': info('5', 'digit', 'five', ['S', 's']),
  '6': info('6', 'digit', 'six', ['b']),
  '7': info('7', 'digit', 'seven'),
  '8': info('8', 'digit', 'eight', ['B']),
  '9': info('9', 'digit', 'nine', ['g', 'q']),
  '.': info('.', 'point', 'a point', ['a dot', 'a full stop'], ['°']),
  '+': info('+', 'operator', 'plus', ['t']),
  '−': info('−', 'operator', 'minus', ['a dash', 'a line'], [], '-'),
  '×': info('×', 'operator', 'times', ['X'], ['x']),
  '÷': info('÷', 'operator', 'divided by'),
  '=': info('=', 'relation', 'equals'),
  '(': info('(', 'bracket', 'an opening bracket', ['an arc', 'c']),
  ')': info(')', 'bracket', 'a closing bracket', ['an arc']),
  '/': info('/', 'operator', 'over', ['a line'], ['1']),
  '√': info('√', 'root', 'the square root of', ['a check']),
  'π': info('π', 'name', 'pi', ['n']),
  'θ': info('θ', 'name', 'theta', ['O with a bar']),
  'x': info('x', 'name', 'x', ['X'], ['×']),
  'y': info('y', 'name', 'y', ['Y']),
  '°': info('°', 'unit', 'degrees', ['o', 'a circle'], ['0', '.']),
  '′': info('′', 'unit', 'feet, or minutes', ["'", 'a tick'], ['1']),
  '″': info('″', 'unit', 'inches, or seconds', ['"']),
  '%': info('%', 'unit', 'per cent'),
};

export const isDigit = (g: Glyph | null | undefined): g is Glyph => !!g && GLYPH_TABLE[g].kind === 'digit';
