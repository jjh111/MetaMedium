// Quantities — a number as the hand writes it (MATHS-PLAN.md §3 rule 5, §4).
//
// A drafter writes 24″, 7.5, 2–4″, ~41″, ½, 1 1/2 and 39 in, and means a
// length, a bare number, a range, an estimate, a fraction and a length spelled
// another way. One shape holds all of them: a value or an interval, a unit or
// none, exact or approximate, and how precisely it was written.
//
// Three rules, each the hand's:
//
//   - **A range stays a range until a value is chosen.** Arithmetic is
//     interval arithmetic, so 2–4″ + 3.5 is 5.5–7.5″ and nothing is settled
//     by picking the middle.
//   - **A bare number beside a length is a length of that unit** — "+ 2" in a
//     column of inches is two inches — and beside × or ÷ it is a count. A
//     bare measurement takes the unit its drawing speaks; the sheet decides
//     which (sheet.ts).
//   - **Mixed units convert, and say so.** Every conversion leaves a note, so
//     a number never changes unit silently.
//
//   - **An angle is its own thing** (MATHS-SPEC M11): 30° or 1.2 rad carries its
//     unit, is neither a length nor a bare number, and does not add to either —
//     `30° + 15` is refused, not guessed. It scales by a count and divides by an
//     angle to a count; an angle times an angle is nothing a page means.
//
// Tier 1: pure functions, no dependencies, no `eval`. The engine does the
// arithmetic; no model ever computes a number (DIRECTOR-PLAN-W2 §1).

export type LengthUnit = 'in' | 'ft' | 'cm' | 'mm' | 'm';

export const LENGTH_UNITS: readonly LengthUnit[] = ['in', 'ft', 'cm', 'mm', 'm'];

/** An angle's unit: degrees (30°) or radians (1.2 rad). */
export type AngleUnit = 'deg' | 'rad';

export interface Quantity {
  /** The value; for a range, its low end. */
  lo: number;
  /** For a range, its high end; equal to `lo` for a single value. */
  hi: number;
  /** The unit, or null for a bare number — a count, or a measurement whose unit was not written. */
  unit: LengthUnit | null;
  /** 0 a bare number, 1 a length, 2 an area: what × and ÷ of lengths make. */
  dim: number;
  /** An angle written in this unit (`30°`, `1.2 rad`): unit null and dim 0, and not a bare number. */
  angle?: AngleUnit;
  /** Written with a ~ or ≈, or computed from something that was. It stays approximate. */
  approx: boolean;
  /**
   * How precisely it was WRITTEN — 1 for 36, 0.1 for 7.5, 0.125 for ⅝ — so a
   * written result can be told rounded from wrong. Absent on computed values.
   */
  precision?: number;
}

/** Millimetres per unit: the one table every conversion reads. */
const MM_PER: Record<LengthUnit, number> = { in: 25.4, ft: 304.8, cm: 10, mm: 1, m: 1000 };

const UNIT_WORD: Record<LengthUnit, [string, string]> = {
  in: ['inch', 'inches'],
  ft: ['foot', 'feet'],
  cm: ['centimetre', 'centimetres'],
  mm: ['millimetre', 'millimetres'],
  m: ['metre', 'metres'],
};

export function quantity(
  value: number,
  unit: LengthUnit | null = null,
  opts: { approx?: boolean; precision?: number; dim?: number; angle?: AngleUnit } = {}
): Quantity {
  const q: Quantity = { lo: value, hi: value, unit, dim: opts.dim ?? (unit ? 1 : 0), approx: !!opts.approx };
  if (opts.precision !== undefined) q.precision = opts.precision;
  if (opts.angle && !unit && !q.dim) q.angle = opts.angle;
  return q;
}

export function rangeOf(
  lo: number,
  hi: number,
  unit: LengthUnit | null = null,
  opts: { approx?: boolean; precision?: number; dim?: number; angle?: AngleUnit } = {}
): Quantity {
  const q = quantity(Math.min(lo, hi), unit, opts);
  q.hi = Math.max(lo, hi);
  return q;
}

/** Tolerance for "the same number": relative, so 1e-9 of a large value is still nothing. */
function tolFor(...values: number[]): number {
  return 1e-6 * Math.max(1, ...values.map((v) => Math.abs(v)));
}

export function isRange(q: Quantity): boolean {
  return q.hi - q.lo > tolFor(q.lo, q.hi);
}

/** Is `v` inside this quantity (a range, or within tolerance of a single value)? */
export function holds(q: Quantity, v: number): boolean {
  const t = tolFor(q.lo, q.hi, v);
  return v >= q.lo - t && v <= q.hi + t;
}

/** A bare number that could still be anything's: no unit, no dimension, and not an angle. */
export function isBare(q: Quantity): boolean {
  return q.unit === null && q.dim === 0 && !q.angle;
}

/** An angle written with its unit. */
export function isAngle(q: Quantity): boolean {
  return !!q.angle;
}

// ===== Formatting =====

/** A nonzero value smaller than this is arithmetic noise (0.1 + 0.2 − 0.3), and shows as 0. */
const NOISE = 1e-6;
/** The most decimals a number is ever shown with. */
const MOST_DIGITS = 8;

/**
 * A number for people: at most `digits` decimals, trailing zeros dropped, a real
 * minus sign. A value that is not zero is never shown as zero: when `digits`
 * would round it away it gets two significant figures instead (0.004, not 0),
 * unless it is below the noise arithmetic leaves behind.
 */
export function formatNumber(v: number, digits = 2): string {
  if (!Number.isFinite(v)) return Number.isNaN(v) ? '?' : v > 0 ? '∞' : '−∞';
  let d = digits;
  let r = Math.round(v * 10 ** d) / 10 ** d;
  if (r === 0 && v !== 0 && Math.abs(v) >= NOISE) {
    d = Math.min(MOST_DIGITS, 1 - Math.floor(Math.log10(Math.abs(v))));
    r = Math.round(v * 10 ** d) / 10 ** d;
  }
  if (r === 0) return '0';
  const s = d > 0 ? r.toFixed(d).replace(/\.?0+$/, '') : r.toFixed(0);
  return s.startsWith('-') ? '−' + s.slice(1) : s;
}

/** How an angle is written after a number: 30°, 1.2 rad. */
export function angleSuffix(angle: AngleUnit | undefined, words = false): string {
  if (!angle) return '';
  if (angle === 'deg') return words ? ' degrees' : '°';
  return words ? ' radians' : ' rad';
}

/** How a unit is written after a number: 36″, 2′, 61 cm, 192 in². */
export function unitSuffix(unit: LengthUnit | null, dim: number, words = false): string {
  if (!unit || dim === 0) return '';
  if (dim === 1) {
    if (!words && unit === 'in') return '″';
    if (!words && unit === 'ft') return '′';
    return ' ' + unit;
  }
  const sup: Record<number, string> = { 2: '²', 3: '³' };
  if (dim > 0) return ' ' + unit + (sup[dim] ?? `^${dim}`);
  return ' per ' + unit + (dim < -1 ? (sup[-dim] ?? `^${-dim}`) : '');
}

const FRACTION_GLYPH: Record<string, string> = {
  '1/2': '½', '1/3': '⅓', '2/3': '⅔', '1/4': '¼', '3/4': '¾', '1/5': '⅕', '2/5': '⅖', '3/5': '⅗', '4/5': '⅘',
  '1/6': '⅙', '5/6': '⅚', '1/8': '⅛', '3/8': '⅜', '5/8': '⅝', '7/8': '⅞',
};
const FRACTION_DENOMINATORS = [2, 3, 4, 8, 16, 32];

const gcd = (a: number, b: number): number => (b === 0 ? a : gcd(b, a % b));

/** 5.625 in eighths is 5⅝; null when the value is not a whole number of `den`ths, or is whole. */
function asFraction(v: number, den: number): string | null {
  const n = Math.round(v * den);
  if (Math.abs(v * den - n) > 1e-6 || n % den === 0) return null;
  const whole = Math.trunc(Math.abs(n) / den);
  const rem = Math.abs(n) % den;
  const g = gcd(rem, den);
  const f = `${rem / g}/${den / g}`;
  const glyph = FRACTION_GLYPH[f];
  const sign = v < 0 ? '−' : '';
  if (!whole) return sign + (glyph ?? f);
  return sign + String(whole) + (glyph ?? ` ${f}`);
}

/**
 * A quantity for people: `36″`, `2–4″`, `~41″`, `12.67″`, `61 cm`, `192 in²`.
 * A number written as a fraction stays a fraction (`⅝″`, `1½`) — its
 * precision says so; a computed one is decimal unless `fractions` asks for a
 * denominator (16 prints 9.625 as 9⅝).
 */
export function formatQuantity(q: Quantity, opts: { digits?: number; words?: boolean; fractions?: number } = {}): string {
  const written = q.precision && q.precision < 1 ? Math.round(1 / q.precision) : 0;
  const den = opts.fractions ?? (FRACTION_DENOMINATORS.includes(written) && Math.abs(1 / q.precision! - written) < 1e-9 ? written : 0);
  // A number is shown with the places it was WRITTEN with: 0.0001 is not 0 and 1.9999 is not 2.
  const places = q.precision && q.precision < 0.01 ? Math.min(MOST_DIGITS, Math.ceil(-Math.log10(q.precision) - 1e-9)) : 0;
  const digits = opts.digits ?? Math.max(2, places);
  const n = (v: number) => (den ? asFraction(v, den) : null) ?? formatNumber(v, digits);
  let body: string;
  if (!isRange(q)) body = n(q.lo);
  else if (q.lo < 0 || q.hi < 0) body = `${n(q.lo)} to ${n(q.hi)}`;
  else body = `${n(q.lo)}–${n(q.hi)}`;
  return (q.approx ? '~' : '') + body + (q.angle ? angleSuffix(q.angle, opts.words) : unitSuffix(q.unit, q.dim, opts.words));
}

function unitName(unit: LengthUnit, plural: boolean): string {
  return UNIT_WORD[unit][plural ? 1 : 0];
}

// ===== Scanning — shared with the expression grammar (expr.ts) =====

const VULGAR: Record<string, [number, number]> = {
  '½': [1, 2], '⅓': [1, 3], '⅔': [2, 3], '¼': [1, 4], '¾': [3, 4], '⅕': [1, 5], '⅖': [2, 5],
  '⅗': [3, 5], '⅘': [4, 5], '⅙': [1, 6], '⅚': [5, 6], '⅐': [1, 7], '⅛': [1, 8], '⅜': [3, 8],
  '⅝': [5, 8], '⅞': [7, 8], '⅑': [1, 9], '⅒': [1, 10],
};

export function isVulgar(c: string | undefined): boolean {
  return c !== undefined && c in VULGAR;
}

const isDigit = (c: string | undefined) => c !== undefined && c >= '0' && c <= '9';
const isLetter = (c: string | undefined) => c !== undefined && /[A-Za-zÀ-ɏ]/.test(c);

export interface ScannedNumber {
  value: number;
  /** How precisely it was written: 1, 0.1, 1/8 … */
  precision: number;
  text: string;
  end: number;
}

/**
 * A number at `i`: an integer or a decimal, a vulgar fraction on its own or
 * after a whole number (1½, 1 ½), a proper fraction glued with a slash (3/4)
 * or after a whole number and a space (1 1/2). An improper slash — 6/2 — is
 * left for the grammar to read as a division.
 */
export function scanNumber(s: string, i: number): ScannedNumber | null {
  let j = i;
  let whole = '';
  while (isDigit(s[j])) whole += s[j++];
  let value: number;
  let precision = 1;
  if (s[j] === '.' && isDigit(s[j + 1])) {
    let frac = '';
    j++;
    while (isDigit(s[j])) frac += s[j++];
    value = Number(`${whole || '0'}.${frac}`);
    precision = 10 ** -frac.length;
    return { value, precision, text: s.slice(i, j), end: j };
  }
  if (!whole) {
    if (!isVulgar(s[j])) return null;
    const [a, b] = VULGAR[s[j]];
    return { value: a / b, precision: 1 / b, text: s[j], end: j + 1 };
  }
  value = Number(whole);
  // 1½, or 1 ½
  const k = s[j] === ' ' && isVulgar(s[j + 1]) ? j + 1 : j;
  if (isVulgar(s[k])) {
    const [a, b] = VULGAR[s[k]];
    return { value: value + a / b, precision: 1 / b, text: s.slice(i, k + 1), end: k + 1 };
  }
  // 3/4 glued (proper only), or 1 1/2 (a whole number, one space, a proper fraction)
  const glued = /^[/⁄](\d+)/.exec(s.slice(j));
  if (glued && !isDigit(s[j + glued[0].length]) && s[j + glued[0].length] !== '.') {
    const den = Number(glued[1]);
    if (den > 0 && value < den) return { value: value / den, precision: 1 / den, text: s.slice(i, j + glued[0].length), end: j + glued[0].length };
  }
  const mixed = /^ (\d+)[/⁄](\d+)/.exec(s.slice(j));
  if (mixed) {
    const num = Number(mixed[1]), den = Number(mixed[2]);
    const after = s[j + mixed[0].length];
    if (den > 0 && num < den && !isDigit(after) && after !== '.') {
      return { value: value + num / den, precision: 1 / den, text: s.slice(i, j + mixed[0].length), end: j + mixed[0].length };
    }
  }
  return { value, precision, text: s.slice(i, j), end: j };
}

const INCH_MARKS = ['″', '"', '”', '“', '〃'];
const FOOT_MARKS = ['′', "'", '’', '‘'];
const UNIT_WORDS: Record<string, LengthUnit> = {
  in: 'in', 'in.': 'in', inch: 'in', inches: 'in',
  ft: 'ft', 'ft.': 'ft', foot: 'ft', feet: 'ft',
  cm: 'cm', centimetre: 'cm', centimetres: 'cm', centimeter: 'cm', centimeters: 'cm',
  mm: 'mm', millimetre: 'mm', millimetres: 'mm', millimeter: 'mm', millimeters: 'mm',
  m: 'm', metre: 'm', metres: 'm', meter: 'm', meters: 'm',
};

export interface ScannedUnit {
  unit: LengthUnit;
  text: string;
  end: number;
}

/**
 * A unit right after a number: a mark with no space (″ " ” '' for inches,
 * ′ ' ’ for feet), or a unit word after at most one space (39 in, 61cm).
 * A word is a unit only when all of it is one — "2 mid" is not metres.
 */
export function scanUnit(s: string, i: number): ScannedUnit | null {
  if (s[i] === "'" && s[i + 1] === "'") return { unit: 'in', text: "''", end: i + 2 };
  if (INCH_MARKS.includes(s[i])) return { unit: 'in', text: s[i], end: i + 1 };
  if (FOOT_MARKS.includes(s[i]) && !isLetter(s[i + 1])) return { unit: 'ft', text: s[i], end: i + 1 };
  const k = s[i] === ' ' ? i + 1 : i;
  const m = /^[A-Za-z]+\.?/.exec(s.slice(k));
  if (!m) return null;
  let word = m[0];
  let unit = UNIT_WORDS[word.toLowerCase()];
  if (!unit && word.endsWith('.')) {
    word = word.slice(0, -1);
    unit = UNIT_WORDS[word.toLowerCase()];
  }
  if (!unit) return null;
  return { unit, text: s.slice(i, k + word.length), end: k + word.length };
}

const ANGLE_MARKS = ['°', 'º', '˚'];
const ANGLE_WORDS: Record<string, AngleUnit> = {
  deg: 'deg', degs: 'deg', degree: 'deg', degrees: 'deg',
  rad: 'rad', rads: 'rad', radian: 'rad', radians: 'rad',
};

export interface ScannedAngle {
  angle: AngleUnit;
  text: string;
  end: number;
}

/**
 * An angle's unit right after a number: the degree mark with no space (30°), or a
 * whole word after at most one space (30 deg, 1.2 rad, 2 radians). "3 radius" is not
 * radians, as "2 mid" is not metres.
 */
export function scanAngle(s: string, i: number): ScannedAngle | null {
  if (ANGLE_MARKS.includes(s[i])) return { angle: 'deg', text: s[i], end: i + 1 };
  const k = s[i] === ' ' ? i + 1 : i;
  const m = /^[A-Za-z]+/.exec(s.slice(k));
  if (!m) return null;
  const angle = ANGLE_WORDS[m[0].toLowerCase()];
  return angle ? { angle, text: s.slice(i, k + m[0].length), end: k + m[0].length } : null;
}

/** A number with its unit, and feet followed by inches (5′ 4″) as one length in inches; or with an angle's. */
export function scanMeasure(s: string, i: number): { value: number; precision: number; unit: LengthUnit | null; angle?: AngleUnit; text: string; end: number } | null {
  const n = scanNumber(s, i);
  if (!n) return null;
  const u = scanUnit(s, n.end);
  if (!u) {
    const a = scanAngle(s, n.end);
    if (a) return { value: n.value, precision: n.precision, unit: null, angle: a.angle, text: s.slice(i, a.end), end: a.end };
    return { value: n.value, precision: n.precision, unit: null, text: n.text, end: n.end };
  }
  if (u.unit === 'ft') {
    const k = s[u.end] === ' ' ? u.end + 1 : u.end;
    const n2 = isDigit(s[k]) || isVulgar(s[k]) ? scanNumber(s, k) : null;
    const u2 = n2 ? scanUnit(s, n2.end) : null;
    if (n2 && u2 && u2.unit === 'in') {
      return { value: n.value * 12 + n2.value, precision: n2.precision, unit: 'in', text: s.slice(i, u2.end), end: u2.end };
    }
  }
  return { value: n.value, precision: n.precision, unit: u.unit, text: s.slice(i, u.end), end: u.end };
}

// ===== Parsing one quantity =====

export interface QuantityParse {
  quantity: Quantity;
  text: string;
  /** What was read, in words: the reason this number is a reading. */
  reason: string;
}

const DASH_CHARS = '-–—−‐‑‒';

/**
 * One quantity as written: `24"`, `7.5`, `2–4"`, `~41″`, `½`, `1 1/2`,
 * `39 in`, `5′ 4″`. Returns null for anything that is not exactly one
 * quantity — a name, a sum, a range written high to low (4-2 is a sum).
 */
export function parseQuantity(text: string): QuantityParse | null {
  const s = text.replace(/[  -   　]/g, ' ').trim();
  let i = 0;
  let approx = false;
  const approxWord = /^(~|≈|about\s+|approx\.?\s*|c\.\s*|ca\.\s*)/i.exec(s);
  if (approxWord) {
    approx = true;
    i = approxWord[0].length;
  }
  let sign = 1;
  if (DASH_CHARS.includes(s[i]) && (isDigit(s[i + 1]) || s[i + 1] === '.' || isVulgar(s[i + 1]))) {
    sign = -1;
    i++;
  }
  const a = scanMeasure(s, i);
  if (!a) return null;
  i = a.end;
  let lo = sign * a.value;
  let hi = lo;
  let unit = a.unit;
  let angle = a.angle;
  let precision = a.precision;
  let isRangeWritten = false;
  const note: string[] = [];
  const rest = /^\s*(?:[-–—−‐‑‒]|to\s)\s*/.exec(s.slice(i));
  if (rest) {
    const b = scanMeasure(s, i + rest[0].length);
    if (!b) return null;
    if (b.value <= lo) return null;
    const bv = b.value;
    // A range of angles is of angles; a length and an angle make no range.
    if ((angle && b.unit) || (unit && b.angle) || (angle && b.angle && angle !== b.angle)) return null;
    if (unit && b.unit && unit !== b.unit) {
      // 1 ft–18 in: the second end's unit wins; say so.
      const c = convertQuantity(quantity(lo, unit), b.unit);
      note.push(c.note ?? '');
      lo = c.quantity.lo;
      if (bv <= lo) return null;
    }
    unit = b.unit ?? unit;
    angle = b.angle ?? angle;
    hi = bv;
    precision = Math.min(precision, b.precision);
    isRangeWritten = true;
    i = b.end;
  }
  if (s.slice(i).trim().length > 0) return null;
  const q = rangeOf(lo, hi, unit, { approx, precision, ...(angle ? { angle } : {}) });
  const unitWords = unit ? ` ${unitName(unit, true)}` : angle ? angleSuffix(angle, true) : '';
  let reason: string;
  if (isRangeWritten) reason = `a range, from ${formatNumber(lo)} to ${formatNumber(hi)}${unitWords}`;
  else if (angle) reason = `${formatNumber(lo)}${angleSuffix(angle, true)}, an angle`;
  else reason = unit ? `${formatNumber(lo)} ${unitName(unit, lo !== 1)}` : `the number ${formatNumber(lo)}, no unit written`;
  if (approx) reason = `approximate: ${reason}`;
  if (a.text.includes('/') || a.text.includes('⁄') || Object.keys(VULGAR).some((v) => a.text.includes(v))) reason += `, written as a fraction`;
  if (note.length) reason += ` (${note.filter(Boolean).join('; ')})`;
  return { quantity: q, text: s, reason };
}

// ===== Conversion =====

export interface Converted {
  quantity: Quantity;
  /** Said whenever a number changed unit: "39″ is 99.06 cm". */
  note?: string;
}

export function convertQuantity(q: Quantity, unit: LengthUnit): Converted {
  if (!q.unit || q.dim === 0 || q.unit === unit) return { quantity: q };
  const f = (MM_PER[q.unit] / MM_PER[unit]) ** q.dim;
  const out: Quantity = { ...q, lo: q.lo * f, hi: q.hi * f, unit };
  delete out.precision;
  return { quantity: out, note: `${formatQuantity(q)} is ${formatQuantity(out)}` };
}

const RAD_PER_DEG = Math.PI / 180;

/** An angle in the other unit, with the note that it changed. A quantity that is no angle comes back as it was. */
export function convertAngle(q: Quantity, angle: AngleUnit): Converted {
  if (!q.angle || q.angle === angle) return { quantity: q };
  const f = angle === 'rad' ? RAD_PER_DEG : 1 / RAD_PER_DEG;
  const out: Quantity = { ...q, lo: q.lo * f, hi: q.hi * f, angle };
  delete out.precision;
  return { quantity: out, note: `${formatQuantity(q)} is ${formatQuantity(out)}` };
}

/** A single angle, or a bare number read as radians, in radians. */
export function inRadians(q: Quantity): number {
  return q.angle === 'deg' ? q.lo * RAD_PER_DEG : q.lo;
}

// ===== Arithmetic =====

export type ArithOp = '+' | '-' | '*' | '/';

export interface Arith {
  quantity: Quantity | null;
  /** Conversions and anything else worth saying about how the number was reached. */
  notes: string[];
  /** Why there is no number: an area added to a length, a division by zero. Never thrown. */
  error?: string;
}

const dimName = (q: Quantity) => (q.angle ? 'an angle' : q.dim === 0 ? 'a number' : q.dim === 1 ? 'a length' : q.dim === 2 ? 'an area' : `a quantity of dimension ${q.dim}`);

function computed(lo: number, hi: number, unit: LengthUnit | null, dim: number, approx: boolean): Quantity {
  return { lo: Math.min(lo, hi), hi: Math.max(lo, hi), unit: dim === 0 ? null : unit, dim, approx };
}

const angled = (lo: number, hi: number, angle: AngleUnit, approx: boolean): Quantity => ({
  lo: Math.min(lo, hi), hi: Math.max(lo, hi), unit: null, dim: 0, angle, approx,
});

/**
 * An angle in a sum: an angle and an angle add (30° + 15°, converted if their
 * units differ); an angle scales by a count and divides by a count or by an angle,
 * which makes a count. Everything else — a number beside an angle, a length, an
 * angle times an angle — is refused with the reason, never read as the nearest
 * thing (`30° + 15` is not 45°; the page did not say degrees).
 */
function angleArithmetic(op: ArithOp, a: Quantity, b: Quantity): Arith {
  const notes: string[] = [];
  const approx = a.approx || b.approx;
  const fail = (error: string): Arith => ({ quantity: null, notes, error });
  if (op === '+' || op === '-') {
    if (!a.angle || !b.angle) {
      return fail(`cannot ${op === '+' ? 'add' : 'subtract'} ${dimName(b)} ${op === '+' ? 'to' : 'from'} ${dimName(a)} — write the angle's unit, as in 30° + 15°`);
    }
    let y = b;
    if (b.angle !== a.angle) {
      const c = convertAngle(b, a.angle);
      if (c.note) notes.push(c.note);
      y = c.quantity;
    }
    return op === '+'
      ? { quantity: angled(a.lo + y.lo, a.hi + y.hi, a.angle, approx), notes }
      : { quantity: angled(a.lo - y.hi, a.hi - y.lo, a.angle, approx), notes };
  }
  if (op === '*') {
    if (a.angle && b.angle) return fail('an angle times an angle is not an angle');
    const [ang, other] = a.angle ? [a, b] : [b, a];
    if (!isBare(other)) return fail(`cannot multiply an angle by ${dimName(other)}`);
    const p = [ang.lo * other.lo, ang.lo * other.hi, ang.hi * other.lo, ang.hi * other.hi];
    return { quantity: angled(Math.min(...p), Math.max(...p), ang.angle!, approx), notes };
  }
  if (!b.angle && isBare(b)) {
    if (b.lo <= 0 && b.hi >= 0) return fail(isRange(b) ? `cannot divide by ${formatQuantity(b)}: it holds zero` : 'cannot divide by zero');
    const p = [a.lo / b.lo, a.lo / b.hi, a.hi / b.lo, a.hi / b.hi];
    return { quantity: angled(Math.min(...p), Math.max(...p), a.angle!, approx), notes };
  }
  if (a.angle && b.angle) {
    let y = b;
    if (b.angle !== a.angle) {
      const c = convertAngle(b, a.angle);
      if (c.note) notes.push(c.note);
      y = c.quantity;
    }
    if (y.lo <= 0 && y.hi >= 0) return fail(isRange(y) ? `cannot divide by ${formatQuantity(y)}: it holds zero` : 'cannot divide by zero');
    const p = [a.lo / y.lo, a.lo / y.hi, a.hi / y.lo, a.hi / y.hi];
    return { quantity: computed(Math.min(...p), Math.max(...p), null, 0, approx), notes: [...notes, 'an angle over an angle is a plain number'] };
  }
  return fail(`cannot divide ${dimName(a)} by ${dimName(b)}`);
}

export function negateQuantity(q: Quantity): Quantity {
  const out: Quantity = { ...q, lo: -q.hi, hi: -q.lo };
  delete out.precision;
  return out;
}

/**
 * One operation, over intervals, with units. Never throws: a sum that has no
 * meaning (an area plus a length) or a division by something that may be zero
 * comes back as an error sentence and no number.
 */
export function arithmetic(op: ArithOp, a: Quantity, b: Quantity): Arith {
  if (a.angle || b.angle) return angleArithmetic(op, a, b);
  const notes: string[] = [];
  const approx = a.approx || b.approx;
  if (op === '+' || op === '-') {
    // "+ 2" beside a length is two of that length's unit — the hand's shorthand.
    let x = a, y = b;
    if (isBare(x) && y.dim !== 0) x = { ...x, unit: y.unit, dim: y.dim };
    if (isBare(y) && x.dim !== 0) y = { ...y, unit: x.unit, dim: x.dim };
    if (x.dim !== y.dim) return { quantity: null, notes, error: `cannot ${op === '+' ? 'add' : 'subtract'} ${dimName(y)} ${op === '+' ? 'to' : 'from'} ${dimName(x)}` };
    if (x.unit && y.unit && x.unit !== y.unit) {
      const c = convertQuantity(y, x.unit);
      if (c.note) notes.push(c.note);
      y = c.quantity;
    }
    const unit = x.unit ?? y.unit;
    if (op === '+') return { quantity: computed(x.lo + y.lo, x.hi + y.hi, unit, x.dim, approx), notes };
    return { quantity: computed(x.lo - y.hi, x.hi - y.lo, unit, x.dim, approx), notes };
  }
  let y = b;
  if (a.unit && y.unit && a.unit !== y.unit && y.dim !== 0) {
    const c = convertQuantity(y, a.unit);
    if (c.note) notes.push(c.note);
    y = c.quantity;
  }
  const unit = a.unit ?? y.unit;
  if (op === '*') {
    const p = [a.lo * y.lo, a.lo * y.hi, a.hi * y.lo, a.hi * y.hi];
    return { quantity: computed(Math.min(...p), Math.max(...p), unit, a.dim + y.dim, approx), notes };
  }
  // Division: refuse anything that may be zero.
  if (y.lo <= 0 && y.hi >= 0) {
    const error = isRange(y) ? `cannot divide by ${formatQuantity(y)}: it holds zero` : 'cannot divide by zero';
    return { quantity: null, notes, error };
  }
  const p = [a.lo / y.lo, a.lo / y.hi, a.hi / y.lo, a.hi / y.hi];
  return { quantity: computed(Math.min(...p), Math.max(...p), unit, a.dim - y.dim, approx), notes };
}

/**
 * A quantity to a power. The exponent is a plain number written once, not a range
 * and not a length; an integer power of a length is a length to that power (3″² is
 * 9 in²), a fractional one needs the dimension to come out whole (√(9 in²) is 3″,
 * √(3″) is nothing a page means); an even power of a range that holds zero starts
 * at zero. Refused, never guessed: 0⁰, a negative number to a fractional power, a
 * negative power of something that may be zero, an angle to any power.
 */
export function powQuantity(base: Quantity, exponent: Quantity): Arith {
  const notes: string[] = [];
  const fail = (error: string): Arith => ({ quantity: null, notes, error });
  if (!isBare(exponent) || isRange(exponent)) return fail('an exponent has to be one plain number');
  if (base.angle) return fail('cannot raise an angle to a power');
  const n = exponent.lo;
  const approx = base.approx || exponent.approx;
  const dim = base.dim * n;
  if (!Number.isInteger(dim)) return fail(`a power of ${n} of ${dimName(base)} would be of dimension ${formatNumber(dim)}, which is not a quantity here`);
  const result = (lo: number, hi: number): Arith => {
    if (!Number.isFinite(lo) || !Number.isFinite(hi)) return fail('that power is too large to be a number');
    return { quantity: computed(lo, hi, dim === 0 ? null : base.unit, dim, approx), notes };
  };
  if (n === 0) {
    if (base.lo <= 0 && base.hi >= 0) return fail('0 to the power 0 is not defined');
    return result(1, 1);
  }
  if (!Number.isInteger(n)) {
    if (base.lo < 0) return fail(`cannot take a power of ${formatNumber(n, 4)} of a negative number`);
    if (n < 0 && base.lo <= 0) return fail('cannot divide by zero');
    return result(base.lo ** n, base.hi ** n);
  }
  if (n < 0) {
    if (base.lo <= 0 && base.hi >= 0) return fail(isRange(base) ? `cannot divide by ${formatQuantity(base)}: it holds zero` : 'cannot divide by zero');
    const p = [base.lo ** n, base.hi ** n];
    return result(Math.min(...p), Math.max(...p));
  }
  if (n % 2 === 0) {
    const p = [base.lo ** n, base.hi ** n];
    return result(base.lo <= 0 && base.hi >= 0 ? 0 : Math.min(...p), Math.max(...p));
  }
  return result(base.lo ** n, base.hi ** n);
}

// ===== Checking a written result =====

/**
 * How a written number stands against the computed one:
 * `ok` equal; `rounded` equal to how precisely it was written; `within` a
 * value chosen from a range, or a value inside a written range; `off`
 * neither, with both numbers said; `unknown` nothing computed to check it
 * against — never a pass.
 */
export type CheckStatus = 'ok' | 'rounded' | 'within' | 'off' | 'unknown';

export interface Comparison {
  status: CheckStatus;
  written: Quantity;
  computed: Quantity | null;
  /** Written minus computed, in the written's unit: +2 when 48 is written for 46. */
  difference?: number;
  reason: string;
  /** A conversion made to compare them. */
  note?: string;
}

export function compareQuantities(computedQ: Quantity | null, written: Quantity): Comparison {
  const w = formatQuantity(written);
  if (!computedQ) return { status: 'unknown', written, computed: null, reason: `nothing to check ${w} against` };
  let c = computedQ;
  let note: string | undefined;
  if (written.unit && c.unit && written.unit !== c.unit && written.dim === c.dim) {
    const conv = convertQuantity(c, written.unit);
    c = conv.quantity;
    note = conv.note;
  }
  if (written.angle && c.angle && written.angle !== c.angle) {
    const conv = convertAngle(c, written.angle);
    c = conv.quantity;
    note = conv.note;
  }
  // A bare written number is read in the computed value's unit: 14 written for 14″, 30 for 30°.
  const shown = isBare(written) && (c.unit || c.angle) ? { ...written, unit: c.unit, dim: c.dim, ...(c.angle ? { angle: c.angle } : {}) } : written;
  const ws = formatQuantity(shown);
  const cs = formatQuantity(c);
  const base = { written, computed: computedQ, ...(note ? { note } : {}) };
  if (!!written.angle !== !!c.angle && (written.angle || c.angle)) {
    return { ...base, status: 'off', reason: `written ${ws} is ${dimName(written)}, computed ${cs} is ${dimName(c)}` };
  }
  if (written.unit && c.unit && written.dim !== c.dim) {
    return { ...base, status: 'off', reason: `written ${ws} is ${dimName(written)}, computed ${cs} is ${dimName(c)}` };
  }
  const t = tolFor(c.lo, c.hi, written.lo, written.hi);
  const wRange = isRange(written), cRange = isRange(c);
  const suffix = c.angle ? angleSuffix(c.angle) : unitSuffix(c.unit ?? written.unit, c.unit ? c.dim : written.dim);
  const off = (d: number) => ({
    ...base,
    status: 'off' as const,
    difference: d,
    reason: `written ${ws}, computed ${cs}: ${formatNumber(Math.abs(d))}${suffix} ${d > 0 ? 'more' : 'less'} than computed`,
  });
  if (!wRange && !cRange) {
    const d = written.lo - c.lo;
    if (Math.abs(d) <= t) return { ...base, status: 'ok', difference: 0, reason: `✓ ${cs}` };
    const p = written.precision ?? 0;
    const slack = written.approx ? Math.max(p, 1) : p / 2;
    if (p > 0 && Math.abs(d) <= slack + t) return { ...base, status: 'rounded', difference: d, reason: `≈ ${cs}, written ${ws}` };
    return off(d);
  }
  if (!wRange && cRange) {
    if (holds(c, written.lo)) return { ...base, status: 'within', difference: 0, reason: `${ws} chosen from ${cs}` };
    return off(written.lo < c.lo ? written.lo - c.lo : written.lo - c.hi);
  }
  if (wRange && !cRange) {
    if (holds(written, c.lo)) return { ...base, status: 'within', difference: 0, reason: `${cs} is within the written ${ws}` };
    return off(c.lo < written.lo ? written.lo - c.lo : written.hi - c.lo);
  }
  if (Math.abs(written.lo - c.lo) <= t && Math.abs(written.hi - c.hi) <= t) return { ...base, status: 'ok', difference: 0, reason: `✓ ${cs}` };
  if (written.lo <= c.hi + t && c.lo <= written.hi + t) return { ...base, status: 'within', difference: 0, reason: `${ws} overlaps ${cs}` };
  return off(written.lo > c.hi ? written.lo - c.hi : written.hi - c.lo);
}
