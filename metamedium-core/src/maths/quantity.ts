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
// Tier 1: pure functions, no dependencies, no `eval`. The engine does the
// arithmetic; no model ever computes a number (DIRECTOR-PLAN-W2 §1).

export type LengthUnit = 'in' | 'ft' | 'cm' | 'mm' | 'm';

export const LENGTH_UNITS: readonly LengthUnit[] = ['in', 'ft', 'cm', 'mm', 'm'];

export interface Quantity {
  /** The value; for a range, its low end. */
  lo: number;
  /** For a range, its high end; equal to `lo` for a single value. */
  hi: number;
  /** The unit, or null for a bare number — a count, or a measurement whose unit was not written. */
  unit: LengthUnit | null;
  /** 0 a bare number, 1 a length, 2 an area: what × and ÷ of lengths make. */
  dim: number;
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
  opts: { approx?: boolean; precision?: number; dim?: number } = {}
): Quantity {
  const q: Quantity = { lo: value, hi: value, unit, dim: opts.dim ?? (unit ? 1 : 0), approx: !!opts.approx };
  if (opts.precision !== undefined) q.precision = opts.precision;
  return q;
}

export function rangeOf(
  lo: number,
  hi: number,
  unit: LengthUnit | null = null,
  opts: { approx?: boolean; precision?: number; dim?: number } = {}
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

/** A bare number that could still be anything's: no unit and no dimension. */
export function isBare(q: Quantity): boolean {
  return q.unit === null && q.dim === 0;
}

// ===== Formatting =====

/** A number for people: at most `digits` decimals, trailing zeros dropped, a real minus sign. */
export function formatNumber(v: number, digits = 2): string {
  if (!Number.isFinite(v)) return Number.isNaN(v) ? '?' : v > 0 ? '∞' : '−∞';
  const f = 10 ** digits;
  const r = Math.round(v * f) / f;
  if (r === 0) return '0';
  const s = digits > 0 ? r.toFixed(digits).replace(/\.?0+$/, '') : r.toFixed(0);
  return s.startsWith('-') ? '−' + s.slice(1) : s;
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

export function formatQuantity(q: Quantity, opts: { digits?: number; words?: boolean } = {}): string {
  const n = (v: number) => formatNumber(v, opts.digits ?? 2);
  let body: string;
  if (!isRange(q)) body = n(q.lo);
  else if (q.lo < 0 || q.hi < 0) body = `${n(q.lo)} to ${n(q.hi)}`;
  else body = `${n(q.lo)}–${n(q.hi)}`;
  return (q.approx ? '~' : '') + body + unitSuffix(q.unit, q.dim, opts.words);
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

/** A number with its unit, and feet followed by inches (5′ 4″) as one length in inches. */
export function scanMeasure(s: string, i: number): { value: number; precision: number; unit: LengthUnit | null; text: string; end: number } | null {
  const n = scanNumber(s, i);
  if (!n) return null;
  const u = scanUnit(s, n.end);
  if (!u) return { value: n.value, precision: n.precision, unit: null, text: n.text, end: n.end };
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
  let precision = a.precision;
  let isRangeWritten = false;
  const note: string[] = [];
  const rest = /^\s*(?:[-–—−‐‑‒]|to\s)\s*/.exec(s.slice(i));
  if (rest) {
    const b = scanMeasure(s, i + rest[0].length);
    if (!b) return null;
    if (b.value <= lo) return null;
    const bv = b.value;
    if (unit && b.unit && unit !== b.unit) {
      // 1 ft–18 in: the second end's unit wins; say so.
      const c = convertQuantity(quantity(lo, unit), b.unit);
      note.push(c.note ?? '');
      lo = c.quantity.lo;
      if (bv <= lo) return null;
    }
    unit = b.unit ?? unit;
    hi = bv;
    precision = Math.min(precision, b.precision);
    isRangeWritten = true;
    i = b.end;
  }
  if (s.slice(i).trim().length > 0) return null;
  const q = rangeOf(lo, hi, unit, { approx, precision });
  const unitWords = unit ? ` ${unitName(unit, true)}` : '';
  let reason: string;
  if (isRangeWritten) reason = `a range, from ${formatNumber(lo)} to ${formatNumber(hi)}${unitWords}`;
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

// ===== Arithmetic =====

export type ArithOp = '+' | '-' | '*' | '/';

export interface Arith {
  quantity: Quantity | null;
  /** Conversions and anything else worth saying about how the number was reached. */
  notes: string[];
  /** Why there is no number: an area added to a length, a division by zero. Never thrown. */
  error?: string;
}

const dimName = (q: Quantity) => (q.dim === 0 ? 'a number' : q.dim === 1 ? 'a length' : q.dim === 2 ? 'an area' : `a quantity of dimension ${q.dim}`);

function computed(lo: number, hi: number, unit: LengthUnit | null, dim: number, approx: boolean): Quantity {
  return { lo: Math.min(lo, hi), hi: Math.max(lo, hi), unit: dim === 0 ? null : unit, dim, approx };
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
  // A bare written number is read in the computed value's unit: 14 written for 14″.
  const shown = isBare(written) && c.unit ? { ...written, unit: c.unit, dim: c.dim } : written;
  const ws = formatQuantity(shown);
  const cs = formatQuantity(c);
  const base = { written, computed: computedQ, ...(note ? { note } : {}) };
  if (written.unit && c.unit && written.dim !== c.dim) {
    return { ...base, status: 'off', reason: `written ${ws} is ${dimName(written)}, computed ${cs} is ${dimName(c)}` };
  }
  const t = tolFor(c.lo, c.hi, written.lo, written.hi);
  const wRange = isRange(written), cRange = isRange(c);
  const off = (d: number) => ({
    ...base,
    status: 'off' as const,
    difference: d,
    reason: `written ${ws}, computed ${cs}: ${formatNumber(Math.abs(d))}${unitSuffix(c.unit ?? written.unit, c.unit ? c.dim : written.dim)} ${d > 0 ? 'more' : 'less'} than computed`,
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
