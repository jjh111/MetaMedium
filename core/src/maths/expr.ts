// Expressions — the small grammar of a pattern page (MATHS-PLAN.md §4; DIRECTOR-PLAN-W2 M1).
//
// Numbers with units, names (a letter like A, or words like Top to waist),
// step references (①, (1), step 1), + − × ÷ and their typed forms - * x / :,
// parentheses and ranges — parsed by hand, evaluated over intervals, and
// never handed to `eval`. Tier 1: no model computes a number, ever.
//
// Three traps, each written into the reader:
//
//   - **A handwritten `=` chain is a running total, not an equation.**
//     `A ÷ 3 = 12 + 2 = 14` says A ÷ 3 is 12, then 12 + 2 is 14; as algebra
//     it is false. A chain may also RESTATE its formula with the numbers put
//     in — `① ÷ 2 = 14 ÷ 2 = 7` — which is neither. Each segment after the
//     first is read both ways and the arithmetic chooses: the reading whose
//     written results check, and a restatement over a running total when
//     both do. Every written result is checked against the computed one, and
//     it is the COMPUTED value that flows on, so a changed measurement
//     re-derives the chain instead of being papered over by what was written.
//   - **A reader returns `-` for a minus, a range and an en dash alike, and
//     `x` for a letter and for times.** A dash between two numbers, the
//     smaller first, is read both as a range and as a minus, ranked with its
//     reason (a length is not negative). `x` standing between two operands is
//     times; inside a word it is a letter.
//   - **A line that reads two ways returns both.** `Chest + 6″ ÷ 2` is three
//     more than the chest by precedence, and the chest plus six, halved, as
//     worked left to right; the worked line beside it settles which, by
//     having that form. Ranked, never collapsed (MATHS-PLAN.md §3 rule 3).
//
// A result written beside a formula with no `=` (`C 48`, `(C × 2) − B 72″`)
// and a worked line across a gap (`Chest + 6″ ÷ 2   (36 + 6)/2 = 21″`) are
// read as if an `=` stood between them — that is how a drafter writes it.
//
// Maths with a variable (MATHS-SPEC lane B, M11) — five more things the grammar
// reads, each one a line that used to be read silently wrong:
//
//   - **Powers, roots, π and degrees.** `x²`, `2^10`, `√(9 + 16)`, `2π`, `sin 30°`:
//     a length to a power is a length to that power (3″² is 9 in²), a root needs
//     the dimension to come out whole, and an angle is its own quantity
//     (quantity.ts), never a bare number.
//   - **Implicit multiplication, where it cannot be a result written beside a
//     formula.** `2x`, `x(x+1)`, `2(3+1)`, `2π√(L/g)`: a number glued to a letter or a
//     bracket, a bracket glued to a bracket, a letter glued to a bracket. A space
//     before a bracket still leaves it a worked line (`C 48`, `... 2   (36 + 6)/2`).
//   - **A division with a factor stuck to its denominator is refused.** `1/2x` is
//     (1/2)x to one reader and 1/(2x) to another; both ways to write it are said.
//   - **A bare number in a trig function is plural.** `sin(30)` is radians by its
//     face and degrees as the second reading, said as such; with a name or a
//     degree sign in it there is no second reading, and the radians are noted.
//   - **A hyphen between two bare numbers is a minus first** (`3-5` is −2, the
//     range still offered); with a length on either side, or an en dash, it stays
//     a range.
//
// The function table is `fn.ts`'s, so `sin` means one thing on a sheet and in a plot.

import type { ArithOp, Arith, Comparison, LengthUnit, Quantity } from './quantity';
import {
  arithmetic,
  compareQuantities,
  formatNumber,
  formatQuantity,
  holds,
  inRadians,
  isBare,
  isRange,
  isVulgar,
  negateQuantity,
  parseQuantity,
  powQuantity,
  quantity,
  rangeOf,
  scanMeasure,
} from './quantity';
import type { FnName } from './fn';
import { FUNCTIONS, INVERSE_OF, fromSuperscript, functionNamed, toSuperscript } from './fn';

export type ExprOp = ArithOp | '^';

const GLYPH: Record<ExprOp, string> = { '+': '+', '-': '−', '*': '×', '/': '÷', '^': '^' };

/** A parsed expression. `num` ids are source offsets, so a range can be bound to the value a worked line chose. */
export type Expr =
  /** `sym` is a number written as a symbol (π): it prints as the symbol and is the number all the same. */
  | { k: 'num'; q: Quantity; text: string; id: number; sym?: string; bracketed?: boolean }
  | { k: 'name'; name: string }
  | { k: 'ref'; step: number; text: string; bare?: boolean }
  /** `implicit` is a product written by putting the factors side by side (`2x`). `^` is a power. */
  | { k: 'op'; op: ExprOp; a: Expr; b: Expr; implicit?: boolean }
  | { k: 'neg'; a: Expr }
  /** A function of one argument. `deg` reads a bare argument as degrees (the second reading of `sin(30)`). */
  | { k: 'call'; fn: FnName; a: Expr; deg?: boolean }
  /** A running total's previous result: the formula so far, with what was written for it as the fallback. */
  | { k: 'carry'; a: Expr; written: Quantity; text: string };

/** How a name is matched: case, spacing and hyphens do not matter. */
export function normName(s: string): string {
  return s.trim().replace(/[-‐]/g, ' ').replace(/\s+/g, ' ').toLowerCase();
}

// ===== Tokens =====

const SPACES = /[  -   　]/g;
const DASHES = '-–—−‐‑‒';
const TIMES = '×*·⋅✕✖';
const DIVIDES = '÷/⁄';
/** Latin letters. (Greek names are fn.ts's for now; π is a number, not a letter. Names on figures are M10's.) */
const LETTER = /[A-Za-zÀ-ɏ]/;
const PI = 'π';

const SUPERSCRIPT = '⁰¹²³⁴⁵⁶⁷⁸⁹⁻⁺ⁿ';
/** A square or a cube written on a unit word: cm², in³. */
const AREA_SUPER: Record<string, number> = { '²': 2, '³': 3 };

const CIRCLED: Record<string, number> = (() => {
  const m: Record<string, number> = {};
  for (let n = 1; n <= 20; n++) m[String.fromCharCode(0x2460 + n - 1)] = n; // ① – ⑳
  for (let n = 1; n <= 10; n++) m[String.fromCharCode(0x2776 + n - 1)] = n; // ❶ – ❿
  for (let n = 1; n <= 10; n++) m[String.fromCharCode(0x2780 + n - 1)] = n; // ➀ – ➉
  for (let n = 1; n <= 10; n++) m[String.fromCharCode(0x24f5 + n - 1)] = n; // ⓵ – ⓾
  return m;
})();

interface At {
  at: number;
  end: number;
  /** Spaces before this token: three or more is the gap between two columns. */
  space: number;
}

type Tok =
  | (At & { t: 'num'; q: Quantity; text: string; sym?: string })
  | (At & { t: 'word'; w: string })
  | (At & { t: 'name'; name: string })
  | (At & { t: 'ref'; step: number; text: string; bare: boolean })
  | (At & { t: 'op'; op: ExprOp; glyph: string; implicit?: boolean; glued?: boolean; fraction?: string })
  | (At & { t: 'fn'; fn: FnName; glyph: string })
  | (At & { t: 'pow' })
  | (At & { t: 'dash'; glyph: string })
  | (At & { t: 'lp' })
  | (At & { t: 'rp' })
  | (At & { t: 'eq'; approx: boolean; glyph: string })
  | (At & { t: 'junk'; text: string });

type NumTok = Extract<Tok, { t: 'num' }>;

const isDigit = (c: string | undefined) => c !== undefined && c >= '0' && c <= '9';

function operandEnd(t: Tok | undefined): boolean {
  return !!t && (t.t === 'num' || t.t === 'word' || t.t === 'name' || t.t === 'ref' || t.t === 'rp');
}
function operandStart(t: Tok | undefined): boolean {
  return !!t && (t.t === 'num' || t.t === 'word' || t.t === 'name' || t.t === 'ref' || t.t === 'lp' || t.t === 'fn');
}

function scan(s: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  let space = 0;
  let approxNext = false;
  const sp = () => {
    const v = space;
    space = 0;
    return v;
  };
  while (i < s.length) {
    const c = s[i];
    if (c === ' ' || c === ',' || c === ';') { space += 1; i++; continue; }
    if (c === '\t' || c === '\n' || c === '\r') { space += 4; i++; continue; }
    if (isDigit(c) || (c === '.' && isDigit(s[i + 1])) || isVulgar(c)) {
      const m = scanMeasure(s, i);
      if (m) {
        // 192 in², 5 cm³: the square belongs to the unit word, not to the number (3″² is (3″)²).
        const area = m.unit && /[A-Za-z.]$/.test(m.text) ? AREA_SUPER[s[m.end]] : undefined;
        const q = quantity(m.value, m.unit, { approx: approxNext, precision: m.precision, ...(m.angle ? { angle: m.angle } : {}), ...(area ? { dim: area } : {}) });
        const end = area ? m.end + 1 : m.end;
        out.push({ t: 'num', q, text: s.slice(i, end), at: i, end, space: sp() });
        approxNext = false;
        i = end;
        continue;
      }
    }
    if (c === PI) {
      out.push({ t: 'num', q: quantity(Math.PI), text: PI, sym: PI, at: i, end: i + 1, space: sp() });
      i++;
      continue;
    }
    if (c === '√') { out.push({ t: 'fn', fn: 'sqrt', glyph: '√', at: i, end: i + 1, space: sp() }); i++; continue; }
    if (c === '^') { out.push({ t: 'pow', at: i, end: i + 1, space: sp() }); i++; continue; }
    if (SUPERSCRIPT.includes(c)) {
      // x², x⁻¹, xⁿ: the power sign, then the exponent as a number (or n, a name).
      let j = i;
      while (j < s.length && SUPERSCRIPT.includes(s[j])) j++;
      const exp = fromSuperscript(s.slice(i, j)) ?? '';
      const first = sp();
      out.push({ t: 'pow', at: i, end: i, space: first });
      let digits = exp;
      if (digits.startsWith('-')) {
        out.push({ t: 'dash', glyph: '⁻', at: i, end: i, space: 0 });
        digits = digits.slice(1);
      } else if (digits.startsWith('+')) digits = digits.slice(1);
      if (digits === 'n') out.push({ t: 'name', name: 'n', at: i, end: j, space: 0 });
      else if (/^\d+$/.test(digits)) out.push({ t: 'num', q: quantity(Number(digits), null, { precision: 1 }), text: s.slice(i, j), at: i, end: j, space: 0 });
      else out.push({ t: 'junk', text: s.slice(i, j), at: i, end: j, space: 0 });
      i = j;
      continue;
    }
    if (c in CIRCLED) {
      out.push({ t: 'ref', step: CIRCLED[c], text: c, bare: false, at: i, end: i + 1, space: sp() });
      i++;
      continue;
    }
    if (c === '(') {
      // (1) on its own is a step reference — or the number 1 in brackets when no step 1 exists.
      const m = /^\(\s*(\d{1,2})\s*\)/.exec(s.slice(i));
      if (m) {
        out.push({ t: 'ref', step: Number(m[1]), text: m[0], bare: true, at: i, end: i + m[0].length, space: sp() });
        i += m[0].length;
        continue;
      }
      out.push({ t: 'lp', at: i, end: i + 1, space: sp() });
      i++;
      continue;
    }
    if (c === ')') { out.push({ t: 'rp', at: i, end: i + 1, space: sp() }); i++; continue; }
    if (c === '+' || c === '＋') { out.push({ t: 'op', op: '+', glyph: c, at: i, end: i + 1, space: sp() }); i++; continue; }
    if (DASHES.includes(c)) { out.push({ t: 'dash', glyph: c, at: i, end: i + 1, space: sp() }); i++; continue; }
    if (TIMES.includes(c)) { out.push({ t: 'op', op: '*', glyph: c, at: i, end: i + 1, space: sp() }); i++; continue; }
    if (DIVIDES.includes(c)) { out.push({ t: 'op', op: '/', glyph: c, at: i, end: i + 1, space: sp() }); i++; continue; }
    if (c === ':') {
      // "Bust: 36" — a colon straight after a word labels it; between numbers it divides.
      const prev = out[out.length - 1];
      if (prev && prev.t === 'word' && space === 0) out.push({ t: 'eq', approx: false, glyph: ':', at: i, end: i + 1, space: sp() });
      else out.push({ t: 'op', op: '/', glyph: ':', at: i, end: i + 1, space: sp() });
      i++;
      continue;
    }
    if (c === '=' || c === '＝') { out.push({ t: 'eq', approx: false, glyph: c, at: i, end: i + 1, space: sp() }); i++; continue; }
    if (c === '≈') {
      if (operandEnd(out[out.length - 1])) out.push({ t: 'eq', approx: true, glyph: c, at: i, end: i + 1, space: sp() });
      else approxNext = true;
      i++;
      continue;
    }
    if (c === '~') { approxNext = true; i++; continue; }
    // A full stop after a number or a word is punctuation — `= 7.` — never a decimal point with nothing after it.
    if (c === '.' && !isDigit(s[i + 1]) && operandEnd(out[out.length - 1])) { space += 1; i++; continue; }
    if (LETTER.test(c)) {
      let j = i + 1;
      while (j < s.length) {
        const d = s[j];
        if (LETTER.test(d)) { j++; continue; }
        // shoulder's; top-to-waist (a hyphen inside a word of two letters or more)
        if ((d === "'" || d === '’') && LETTER.test(s[j + 1] ?? '')) { j++; continue; }
        if ((d === '-' || d === '‐') && j - i >= 2 && /^[A-Za-zÀ-ɏ]{2}/.test(s.slice(j + 1))) { j++; continue; }
        break;
      }
      const w = s.slice(i, j);
      if (w.toLowerCase() === 'step') {
        const m = /^\s*(\d{1,3})(?!\d)/.exec(s.slice(j));
        if (m) {
          out.push({ t: 'ref', step: Number(m[1]), text: s.slice(i, j + m[0].length), bare: false, at: i, end: j + m[0].length, space: sp() });
          i = j + m[0].length;
          continue;
        }
      }
      out.push({ t: 'word', w, at: i, end: j, space: sp() });
      i = j;
      continue;
    }
    out.push({ t: 'junk', text: c, at: i, end: i + 1, space: sp() });
    i++;
  }
  return out;
}

/** A single Latin or Greek letter: a name an equation uses (x, θ, L), as opposed to a word a page uses (Bust). */
const isLetterName = (name: string) => [...name].length === 1 && LETTER.test(name);

/** A word that is a single Latin or Greek letter. */
const isLetterWord = (w: string) => [...w].length === 1 && LETTER.test(w);

/** Is this word one the function table spells, aliases included? Lower case only: `Log` may be a name. */
const isFunctionWord = (w: string) => w === w.toLowerCase() && functionNamed(w) !== null;

/** A word that is a function when it stands in front of what it takes — `sin(`, `sin 30°`, `sin x`, `log 100`. */
function functionAt(toks: Tok[], k: number): FnName | null {
  const t = toks[k];
  if (t.t !== 'word' || !isFunctionWord(t.w)) return null;
  const prev = toks[k - 1], next = toks[k + 1];
  if (prev?.t === 'word' && !isFunctionWord(prev.w) && !isLetterWord(prev.w)) return null; // "top log" — a name of several words
  if (!next || next.space > 1) return null;
  if (next.t === 'lp' || next.t === 'num' || next.t === 'pow' || (next.t === 'ref' && next.bare)) return functionNamed(t.w);
  if (next.t === 'word' && isLetterWord(next.w)) {
    // `sin x` — but not `sin x y`: more words after it make a name
    const after = toks[k + 2];
    return after?.t === 'word' && after.space <= 1 && !isFunctionWord(after.w) ? null : functionNamed(t.w);
  }
  return null;
}

/**
 * `x` between two operands is times, and `to` between two numbers is a range; runs of
 * words are names. A function word in front of what it takes is the function, `pi` on
 * its own is π, and an `x` stuck to the number before it and to a bracket or a letter
 * after it (`2x(x+1)`) is the letter, since it is not standing between two numbers.
 */
function refine(toks: Tok[]): Tok[] {
  const fns = toks.map((_, k) => functionAt(toks, k));
  /** Is token k straight after a function — or after the power written on it (sin², tan⁻¹)? */
  const afterFunction = (k: number): boolean => {
    let i = k - 1;
    if (toks[i]?.t === 'num' || toks[i]?.t === 'name') {
      i--;
      if (toks[i]?.t === 'dash') i--;
      if (toks[i]?.t !== 'pow') return false;
      i--;
    }
    return !!fns[i] || toks[i]?.t === 'fn';
  };
  const mapped = toks.flatMap((t, k): Tok[] => {
    // A function's bracket is never a step reference: sin(30) takes the number 30, whatever step 30 may be.
    if (t.t === 'ref' && t.bare && afterFunction(k)) {
      const digits = String(t.step);
      return [
        { t: 'lp', at: t.at, end: t.at + 1, space: t.space },
        { t: 'num', q: quantity(t.step, null, { precision: 1 }), text: digits, at: t.at + 1, end: t.at + 1 + digits.length, space: 0 },
        { t: 'rp', at: t.end - 1, end: t.end, space: 0 },
      ];
    }
    return [mapWord(t, k)];
  });
  function mapWord(t: Tok, k: number): Tok {
    if (t.t !== 'word') return t;
    const prev = toks[k - 1], next = toks[k + 1];
    if ((t.w === 'x' || t.w === 'X') && operandEnd(prev) && !fns[k - 1] && operandStart(next)) {
      const letter = t.space === 0 && (next?.t === 'lp' || next?.t === 'word' || next?.t === 'fn');
      if (!letter) return { t: 'op', op: '*', glyph: t.w, at: t.at, end: t.end, space: t.space };
    }
    if (t.w.toLowerCase() === 'to' && prev?.t === 'num' && next?.t === 'num') {
      return { t: 'dash', glyph: 'to', at: t.at, end: t.end, space: t.space };
    }
    const fn = fns[k];
    if (fn) return { t: 'fn', fn, glyph: t.w, at: t.at, end: t.end, space: t.space };
    if (t.w === 'pi' && (prev?.t !== 'word' || isLetterWord(prev.w)) && (next?.t !== 'word' || isLetterWord(next.w))) {
      return { t: 'num', q: quantity(Math.PI), text: 'pi', sym: PI, at: t.at, end: t.end, space: t.space };
    }
    return t;
  }
  const out: Tok[] = [];
  for (const t of mapped) {
    if (t.t !== 'word') { out.push(t); continue; }
    const last = out[out.length - 1];
    if (last && last.t === 'name' && last.end <= t.at) {
      last.name = `${last.name} ${t.w}`;
      last.end = t.end;
      continue;
    }
    out.push({ t: 'name', name: t.w, at: t.at, end: t.end, space: t.space });
  }
  return implicitProducts(out);
}

/**
 * Where two things side by side are a product and not a result written beside a
 * formula (`C 48`, `... 2   (36 + 6)/2`): a number glued to a letter, a bracket, π, a
 * function or a root; a bracket or a letter glued to a bracket; a number or a bracket
 * or a letter a space from π or a function. A space before a bracket, a number after
 * anything, and a name of several letters keep their old meaning.
 */
function productBetween(prev: Tok, next: Tok): boolean {
  const lets = prev.t === 'name' && isLetterName(prev.name);
  const left = prev.t === 'num' || prev.t === 'rp' || lets;
  const glued = next.space === 0;
  switch (next.t) {
    case 'name':
      // 2x and 2 x are products, and so is a name stuck to the number (2xy); but a name a space away is a word
      // of the line (Add 2″ seam allowance), not a factor.
      return prev.t === 'num' ? glued || (isLetterName(next.name) && next.space <= 1) : prev.t === 'rp' && glued && isLetterName(next.name);
    case 'fn':
      return left && next.space <= 1;
    case 'num':
      return next.sym !== undefined && left && next.space <= 1;
    case 'lp':
      return left && glued;
    case 'ref':
      return next.bare && left && glued;
    default:
      return false;
  }
}

function implicitProducts(toks: Tok[]): Tok[] {
  const out: Tok[] = [];
  for (const t of toks) {
    const prev = out[out.length - 1];
    if (prev && productBetween(prev, t)) {
      // 1/2x: the fraction was read as one number, but the slash is a division with a factor stuck to it.
      const fraction = prev.t === 'num' && /^\d+\s*[/⁄]\s*\d+$/.test(prev.text) ? prev.text : undefined;
      out.push({ t: 'op', op: '*', glyph: '', implicit: true, glued: t.space === 0, ...(fraction ? { fraction } : {}), at: t.at, end: t.at, space: 0 });
    }
    out.push(t);
  }
  return out;
}

// ===== Readings of one expression =====

/** A choice a reading made where the writing allows two: a dash read as a range or a minus; precedence or left to right. */
export interface ReadingChoice {
  kind: 'dash' | 'order' | 'angle';
  /** What the choice was about: `3–6"`, the whole formula for order, or the `sin(30)` whose bare number is an angle. */
  text: string;
  as: 'range' | 'minus' | 'precedence' | 'left-to-right' | 'radians' | 'degrees';
  /** True when this is the reading the notation gives on its face. */
  plain: boolean;
}

export interface ExprReading {
  expr: Expr;
  /** The formula as a person reads it, with brackets where this reading groups: `(Chest + 6″) ÷ 2`. */
  formula: string;
  /** Why this reading, and what it means, in words. */
  reason: string;
  /** How many choices this reading makes against the notation's face value: 0 is the plain one. */
  departures: number;
  choices: ReadingChoice[];
}

type PTok =
  | { t: 'num'; q: Quantity; text: string; id: number; sym?: string }
  | { t: 'name'; name: string }
  | { t: 'ref'; step: number; text: string; bare: boolean }
  | { t: 'op'; op: ExprOp; implicit?: boolean; glued?: boolean; fraction?: string }
  | { t: 'fn'; fn: FnName; glyph: string }
  | { t: 'pow' }
  | { t: 'lp' }
  | { t: 'rp' };

/** A number written as a fraction with a slash and nothing else: 3/4. */
const SLASH_FRACTION = /^(\d+)\s*[/⁄]\s*(\d+)$/;
const slashOf = (e: Expr): RegExpExecArray | null => (e.k === 'num' && !e.bracketed ? SLASH_FRACTION.exec(e.text) : null);

/** What parsing found wrong that is not just "cannot read": an ambiguity, said with both ways to write it. */
interface Issues {
  ambiguous?: string;
}

function parseTokens(toks: PTok[], leftToRight: boolean, issues: Issues): Expr | null {
  let p = 0;
  const implicitAt = (): boolean => {
    const t = toks[p];
    return t?.t === 'op' && !!t.implicit;
  };
  const mulOf = (a: Expr, b: Expr, implicit: boolean): Expr => (implicit ? { k: 'op', op: '*', a, b, implicit: true } : { k: 'op', op: '*', a, b });
  const primary = (): Expr | null => {
    const t = toks[p];
    if (!t) return null;
    switch (t.t) {
      case 'num':
        p++;
        return { k: 'num', q: t.q, text: t.text, id: t.id, ...(t.sym ? { sym: t.sym } : {}) };
      case 'name':
        p++;
        return { k: 'name', name: t.name };
      case 'ref':
        p++;
        return t.bare ? { k: 'ref', step: t.step, text: t.text, bare: true } : { k: 'ref', step: t.step, text: t.text };
      case 'lp': {
        p++;
        const e = top();
        if (!e) return null;
        // A bracket the hand never closed closes at the end of the line.
        if (toks[p]?.t === 'rp') p++;
        // (3/4) is one number by the hand's own brackets, whatever stands beside it.
        return e.k === 'num' ? { ...e, bracketed: true } : e;
      }
      case 'fn':
        return call();
      default:
        return null;
    }
  };
  /** `sin(x)`, `sin x`, `sin 2x`, `sin²x`, `sin⁻¹ x`, `√x`, `√(x + 1)`. */
  const call = (): Expr | null => {
    const t = toks[p] as Extract<PTok, { t: 'fn' }>;
    p++;
    let fn = t.fn;
    let outer: Expr | null = null;
    // A power written on the function itself: sin²x is (sin x)², and sin⁻¹ is the arc sine.
    if (toks[p]?.t === 'pow' && t.glyph !== '√') {
      p++;
      const e = unary();
      if (!e) return null;
      if (e.k === 'neg' && e.a.k === 'num' && e.a.q.lo === 1 && isBare(e.a.q)) {
        const inv = INVERSE_OF[fn];
        if (!inv) return null;
        fn = inv;
      } else outer = e;
      // sin²x: the 2 is stuck to the x, and neither is the other's factor — the power ends where the argument begins.
      if (implicitAt()) p++;
    }
    let arg: Expr | null;
    if (toks[p]?.t === 'lp') {
      p++;
      arg = top();
      if (arg && toks[p]?.t === 'rp') p++;
    } else arg = tight(t.glyph === '√');
    if (!arg) return null;
    const c: Expr = { k: 'call', fn, a: arg };
    return outer ? { k: 'op', op: '^', a: c, b: outer } : c;
  };
  /** A bracketless argument: one factor with its power, and for a named function the letters and numbers glued on (sin 2x). */
  const tight = (root: boolean): Expr | null => {
    const t = toks[p];
    if (t?.t === 'op' && (t.op === '-' || t.op === '+')) {
      p++;
      const a = tight(root);
      return a && t.op === '-' ? { k: 'neg', a } : a;
    }
    if (!t || (t.t !== 'num' && t.t !== 'name' && t.t !== 'ref' && t.t !== 'lp')) return null;
    let a = power();
    if (!a) return null;
    while (implicitAt() && (toks[p] as Extract<PTok, { t: 'op' }>).glued) {
      if (root) {
        issues.ambiguous = `√ is ambiguous before “${formatExpr(a)}” and what is stuck to it — write √(…) round all of it, or (√${formatExpr(a)}) times the rest`;
        return null;
      }
      p++;
      const b = power();
      if (!b) return null;
      a = mulOf(a, b, true);
    }
    return a;
  };
  const power = (): Expr | null => {
    const base = primary();
    if (!base) return null;
    if (toks[p]?.t === 'pow') {
      p++;
      const exp = unary();
      if (!exp) return null;
      // 2^1/3 — the cube root of 2 to one reader, 2 over 3 to another. 3/4² — likewise. Said, and neither is read.
      const eb = slashOf(exp), bb = slashOf(base);
      if (eb) {
        issues.ambiguous = `${formatExpr(base)}^${eb[0]} is ambiguous — write ${formatExpr(base)}^(${eb[0]}) or (${formatExpr(base)}^${eb[1]})/${eb[2]}`;
        return null;
      }
      if (bb) {
        issues.ambiguous = `${bb[0]}^${formatExpr(exp)} is ambiguous — write (${bb[0]})^${formatExpr(exp)} or ${bb[1]}/(${bb[2]}^${formatExpr(exp)})`;
        return null;
      }
      return { k: 'op', op: '^', a: base, b: exp };
    }
    return base;
  };
  const unary = (): Expr | null => {
    const t = toks[p];
    if (t?.t === 'op' && t.op === '-') {
      p++;
      const a = unary();
      return a ? { k: 'neg', a } : null;
    }
    if (t?.t === 'op' && t.op === '+') {
      p++;
      return unary();
    }
    return power();
  };
  /** Factors written side by side bind tighter than any operator between them: 2x + 1 is (2x) + 1 in either reading. */
  const term = (): Expr | null => {
    let a = unary();
    while (a && implicitAt()) {
      const t = toks[p] as Extract<PTok, { t: 'op' }>;
      p++;
      const b = unary();
      if (!b) return null;
      if (t.fraction) {
        const [num, den] = t.fraction.split(/\s*[/⁄]\s*/);
        issues.ambiguous = `${num}/${den}${formatExpr(b)} is ambiguous — write (${num}/${den})${formatExpr(b)} or ${num}/(${den}${formatExpr(b)})`;
        return null;
      }
      a = mulOf(a, b, true);
    }
    return a;
  };
  const level = (ops: ExprOp[], operand: () => Expr | null) => (): Expr | null => {
    let a = operand();
    while (a) {
      const t = toks[p];
      if (!t || t.t !== 'op' || t.implicit || !ops.includes(t.op)) break;
      p++;
      // A division takes one factor; a factor stuck to it is a question, not an answer.
      const b = t.op === '/' ? unary() : operand();
      if (!b) return null;
      // a ÷ 3/4 — a over three-quarters to one reader, (a ÷ 3) over 4 to another.
      const fb = t.op === '/' ? slashOf(b) : null;
      if (fb) {
        issues.ambiguous = `${formatExpr(a)} ÷ ${fb[0]} is ambiguous — write ${formatExpr(a)} ÷ (${fb[0]}) or (${formatExpr(a)} ÷ ${fb[1]})/${fb[2]}`;
        return null;
      }
      // a ÷ b c — (a ÷ b)c to one reader, a ÷ (bc) to another. Said, and neither is read.
      if (t.op === '/' && implicitAt()) {
        let rest: Expr | null = null;
        while (implicitAt()) {
          p++;
          const f = unary();
          if (!f) return null;
          rest = rest ? mulOf(rest, f, true) : f;
        }
        issues.ambiguous = `${formatExpr(a)} ÷ ${formatExpr(mulOf(b, rest!, true))} is ambiguous — write (${formatExpr(a)} ÷ ${formatExpr(b)})${formatExpr(rest!)} or ${formatExpr(a)} ÷ (${formatExpr(mulOf(b, rest!, true))})`;
        return null;
      }
      a = { k: 'op', op: t.op, a, b };
    }
    return a;
  };
  const product = level(['*', '/'], term);
  const sum = level(['+', '-'], product);
  const flat = level(['+', '-', '*', '/'], term);
  const top = leftToRight ? flat : sum;
  const e = top();
  return e && p === toks.length ? e : null;
}

export function sameExpr(a: Expr, b: Expr): boolean {
  switch (a.k) {
    case 'num':
      return b.k === 'num' && a.q.lo === b.q.lo && a.q.hi === b.q.hi && a.q.unit === b.q.unit && a.q.dim === b.q.dim && a.q.angle === b.q.angle;
    case 'name':
      return b.k === 'name' && normName(a.name) === normName(b.name);
    case 'ref':
      return b.k === 'ref' && a.step === b.step;
    case 'op':
      return b.k === 'op' && a.op === b.op && sameExpr(a.a, b.a) && sameExpr(a.b, b.b);
    case 'neg':
      return b.k === 'neg' && sameExpr(a.a, b.a);
    case 'call':
      return b.k === 'call' && a.fn === b.fn && !!a.deg === !!b.deg && sameExpr(a.a, b.a);
    case 'carry':
      return b.k === 'carry' && sameExpr(a.a, b.a);
  }
}

function opOf(e: Expr): ExprOp | null {
  if (e.k === 'op') return e.op;
  if (e.k === 'carry') return opOf(e.a);
  return null;
}

const leafText = (e: Expr): string =>
  e.k === 'num' ? (e.sym ?? formatQuantity(e.q)) : e.k === 'name' ? e.name : e.k === 'ref' ? e.text : '';

const isLeaf = (e: Expr) => e.k === 'num' || e.k === 'name' || e.k === 'ref';

/** A power by an exponent that reads as a superscript (x², x⁻¹), else the exponent after a ^. */
function powerText(base: string, e: Expr, exponent: string): string {
  if (e.k === 'num' && isBare(e.q) && !isRange(e.q) && Number.isInteger(e.q.lo) && e.q.lo >= 2) {
    const sup = toSuperscript(e.q.lo);
    if (sup) return base + sup;
  }
  if (e.k === 'neg' && e.a.k === 'num' && isBare(e.a.q) && !isRange(e.a.q) && Number.isInteger(e.a.q.lo) && e.a.q.lo >= 1) {
    const sup = toSuperscript(-e.a.q.lo);
    if (sup) return base + sup;
  }
  return `${base}^${isLeaf(e) ? exponent : `(${exponent})`}`;
}

/**
 * Brackets for clarity, not minimality: a right operand that is itself an
 * operation, and a left one whose operation differs, are always bracketed —
 * so the two readings of `Chest + 6″ ÷ 2` never print the same. A power is
 * the exception: it binds tighter than anything beside it, and `x²` is no
 * operation to bracket.
 */
function fmtExpr(e: Expr, sub?: (e: Expr) => string | undefined): string {
  const own = sub?.(e);
  if (own !== undefined) return own;
  switch (e.k) {
    case 'num':
    case 'name':
    case 'ref':
      return leafText(e);
    case 'carry':
      return fmtExpr(e.a, sub);
    case 'neg': {
      const inner = fmtExpr(e.a, sub);
      return '−' + (opOf(e.a) && opOf(e.a) !== '^' ? `(${inner})` : inner);
    }
    case 'call': {
      const inner = fmtExpr(e.a, sub);
      if (e.fn === 'sqrt') return isLeaf(e.a) ? `√${inner}` : `√(${inner})`;
      if (e.deg) return `${e.fn}(${isLeaf(e.a) ? `${inner}°` : `(${inner})°`})`;
      return `${e.fn}(${inner})`;
    }
    case 'op': {
      const la = fmtExpr(e.a, sub), lb = fmtExpr(e.b, sub);
      const oa = opOf(e.a), ob = opOf(e.b);
      if (e.op === '^') {
        const base = oa || e.a.k === 'neg' || (e.a.k === 'num' && /[A-Za-z]$/.test(la)) ? `(${la})` : la;
        return powerText(base, e.b, lb);
      }
      // A product written side by side is already grouped by its look: 2x + 1, 2x ÷ 3. Not on the right of ÷ — a ÷ 2b is a question.
      const tight = (c: Expr) => c.k === 'op' && !!c.implicit;
      const left = oa && oa !== '^' && oa !== e.op && !tight(e.a) ? `(${la})` : la;
      if (e.op === '*' && e.implicit) {
        const right = (ob && ob !== '^') || e.b.k === 'neg' ? `(${lb})` : lb;
        return /[A-Za-zÀ-ɏͰ-Ͽ]$/.test(left) && /^[A-Za-z]/.test(right) ? `${left} ${right}` : `${left}${right}`;
      }
      const bracketRight = ob && ob !== '^' && !(tight(e.b) && e.op !== '/');
      return `${left} ${GLYPH[e.op]} ${bracketRight ? `(${lb})` : lb}`;
    }
  }
}

export function formatExpr(e: Expr): string {
  return fmtExpr(e);
}

function hasNames(e: Expr): boolean {
  switch (e.k) {
    case 'name':
    case 'ref':
    case 'carry':
      return true;
    case 'num':
      return false;
    case 'neg':
    case 'call':
      return hasNames(e.a);
    case 'op':
      return hasNames(e.a) || hasNames(e.b);
  }
}

/** Does a number written as a symbol (π) stand anywhere in it? */
function hasSymbol(e: Expr): boolean {
  switch (e.k) {
    case 'num':
      return !!e.sym;
    case 'neg':
    case 'call':
    case 'carry':
      return hasSymbol(e.a);
    case 'op':
      return hasSymbol(e.a) || hasSymbol(e.b);
    default:
      return false;
  }
}

/** One operation over quantities, a power included. */
function applyOp(op: ExprOp, a: Quantity, b: Quantity): Arith {
  return op === '^' ? powQuantity(a, b) : arithmetic(op, a, b);
}

/** Constant parts worked out, so a reading can be said in words: Chest + (6″ ÷ 2) is 3″ more than Chest. */
function fold(e: Expr): Expr {
  if (e.k === 'op') {
    const a = fold(e.a), b = fold(e.b);
    if (a.k === 'num' && b.k === 'num') {
      const r = applyOp(e.op, a.q, b.q);
      if (r.quantity) return { k: 'num', q: r.quantity, text: formatQuantity(r.quantity), id: -1 };
    }
    return { k: 'op', op: e.op, a, b };
  }
  if (e.k === 'neg') {
    const a = fold(e.a);
    return a.k === 'num' ? { k: 'num', q: negateQuantity(a.q), text: formatQuantity(negateQuantity(a.q)), id: -1 } : { k: 'neg', a };
  }
  return e;
}

function depth(e: Expr): number {
  if (e.k === 'op') return 1 + Math.max(depth(e.a), depth(e.b));
  if (e.k === 'neg' || e.k === 'carry' || e.k === 'call') return depth(e.a);
  return 0;
}

const isCount = (e: Expr, n: number) => e.k === 'num' && isBare(e.q) && !isRange(e.q) && e.q.lo === n;

/** A short reading in words, when the formula is small enough to say: "Chest plus 6″, halved". */
export function describeExpr(expr: Expr): string | undefined {
  const e = fold(expr);
  if (!hasNames(e) || depth(e) > 2) return undefined;
  const say = (x: Expr, top: boolean): string => {
    switch (x.k) {
      case 'num':
      case 'name':
      case 'ref':
        return leafText(x);
      case 'carry':
        return say(x.a, top);
      case 'neg':
        return `minus ${say(x.a, false)}`;
      case 'call':
        return x.fn === 'sqrt' ? `the square root of ${say(x.a, false)}` : `${x.fn} of ${say(x.a, false)}`;
      case 'op': {
        const a = say(x.a, false), b = say(x.b, false);
        const simple = x.a.k !== 'op' && x.b.k === 'num';
        switch (x.op) {
          case '+':
            return top && simple ? `${b} more than ${a}` : `${a} plus ${b}`;
          case '-':
            return top && simple ? `${b} less than ${a}` : `${a} minus ${b}`;
          case '*':
            if (isCount(x.b, 2)) return `twice ${a}`;
            if (isCount(x.b, 3)) return `three times ${a}`;
            return `${a} times ${b}`;
          case '/':
            if (isCount(x.b, 2)) return `${a}, halved`;
            if (isCount(x.b, 3)) return `a third of ${a}`;
            if (isCount(x.b, 4)) return `a quarter of ${a}`;
            return `${a} over ${b}`;
          case '^':
            if (isCount(x.b, 2)) return `${a} squared`;
            if (isCount(x.b, 3)) return `${a} cubed`;
            return `${a} to the power ${b}`;
        }
      }
    }
  };
  return say(e, true);
}

interface DashPlan {
  index: number;
  mode: 'unary' | 'minus' | 'range' | 'choice';
  /** For a choice: what the notation gives on its face. A typed minus sign is a minus; any other dash a range. */
  plain?: 'range' | 'minus';
  /** The dash as written, for the reason. */
  glyph?: string;
}

const MAX_CHOICES = 3;

function readSegment(toks: Tok[], src: string): { readings: ExprReading[]; error?: string } {
  const junk = toks.find((t) => t.t === 'junk');
  if (junk && junk.t === 'junk') return { readings: [], error: `cannot read “${junk.text}”` };
  if (toks.some((t) => t.t === 'eq')) return { readings: [], error: 'more than one expression' };

  const plans: DashPlan[] = [];
  toks.forEach((t, k) => {
    if (t.t !== 'dash') return;
    const prev = toks[k - 1], next = toks[k + 1];
    if (!operandEnd(prev)) return plans.push({ index: k, mode: 'unary' });
    if (t.glyph === 'to') return plans.push({ index: k, mode: 'range' });
    if (
      prev.t === 'num' && next?.t === 'num' && !isRange(prev.q) && !isRange(next.q) && prev.q.lo < next.q.lo &&
      !prev.q.angle && !next.q.angle && toks[k - 2]?.t !== 'pow' &&
      (prev.q.unit === null || next.q.unit === null || prev.q.unit === next.q.unit)
    ) {
      // A typed minus sign is a minus, and so is the keyboard's hyphen between two bare numbers (3-5);
      // a length on either side, or an en dash, is a range — a length is not negative.
      const bare = prev.q.unit === null && next.q.unit === null && prev.q.dim === 0 && next.q.dim === 0;
      return plans.push({ index: k, mode: 'choice', plain: t.glyph === '−' || (t.glyph === '-' && bare) ? 'minus' : 'range', glyph: t.glyph });
    }
    plans.push({ index: k, mode: 'minus' });
  });
  const choices = plans.filter((p) => p.mode === 'choice');
  // Every combination while there are few; beyond that, the plain reading and each single departure from it.
  const masks: number[] = [];
  if (choices.length <= MAX_CHOICES) for (let m = 0; m < 1 << choices.length; m++) masks.push(m);
  else {
    masks.push(0);
    choices.forEach((_, j) => masks.push(1 << j));
  }

  const out: ExprReading[] = [];
  let ambiguous = '';
  for (const mask of masks) {
    const asOf = (plan: DashPlan): 'range' | 'minus' => {
      if (plan.mode === 'range') return 'range';
      if (plan.mode !== 'choice') return 'minus';
      const j = choices.indexOf(plan);
      const flipped = (mask >> j) & 1;
      return flipped ? (plan.plain === 'range' ? 'minus' : 'range') : plan.plain!;
    };
    const ptoks: PTok[] = [];
    const dashChoices: ReadingChoice[] = [];
    const dashReasons: string[] = [];
    let ok = true;
    for (let k = 0; k < toks.length; k++) {
      const t = toks[k];
      if (t.t === 'dash') {
        const plan = plans.find((p) => p.index === k)!;
        const as = asOf(plan);
        const prevOut = ptoks[ptoks.length - 1];
        const next = toks[k + 1];
        if (as === 'range' && prevOut?.t === 'num' && !isRange(prevOut.q) && next?.t === 'num') {
          const prevTok = toks[k - 1] as NumTok;
          const q = rangeOf(prevTok.q.lo, next.q.hi, next.q.unit ?? prevTok.q.unit, {
            approx: prevTok.q.approx || next.q.approx,
            precision: Math.min(prevTok.q.precision ?? 1, next.q.precision ?? 1),
          });
          ptoks.pop();
          const text = src.slice(prevTok.at, next.end);
          ptoks.push({ t: 'num', q, text, id: prevTok.at });
          if (plan.mode === 'choice') {
            dashChoices.push({ kind: 'dash', text, as: 'range', plain: plan.plain === 'range' });
            dashReasons.push(dashReason(prevTok.q, next.q, 'range', plan.plain === 'range', plan.glyph));
          }
          k++;
          continue;
        }
        if (plan.mode === 'choice') {
          const prevTok = toks[k - 1] as NumTok;
          const nextTok = next as NumTok;
          dashChoices.push({ kind: 'dash', text: src.slice(prevTok.at, nextTok.end), as: 'minus', plain: plan.plain === 'minus' });
          dashReasons.push(dashReason(prevTok.q, nextTok.q, 'minus', plan.plain === 'minus', plan.glyph));
        }
        ptoks.push({ t: 'op', op: '-' });
        continue;
      }
      switch (t.t) {
        case 'num':
          ptoks.push({ t: 'num', q: t.q, text: t.text, id: t.at, ...(t.sym ? { sym: t.sym } : {}) });
          break;
        case 'name':
          ptoks.push({ t: 'name', name: t.name });
          break;
        case 'word':
          ptoks.push({ t: 'name', name: t.w });
          break;
        case 'ref':
          ptoks.push({ t: 'ref', step: t.step, text: t.text, bare: t.bare });
          break;
        case 'op':
          ptoks.push(t.implicit ? { t: 'op', op: t.op, implicit: true, glued: !!t.glued, ...(t.fraction ? { fraction: t.fraction } : {}) } : { t: 'op', op: t.op });
          break;
        case 'fn':
          ptoks.push({ t: 'fn', fn: t.fn, glyph: t.glyph });
          break;
        case 'pow':
          ptoks.push({ t: 'pow' });
          break;
        case 'lp':
          ptoks.push({ t: 'lp' });
          break;
        case 'rp':
          ptoks.push({ t: 'rp' });
          break;
        default:
          ok = false;
      }
    }
    if (!ok) continue;
    const issues: Issues = {};
    const byPrecedence = parseTokens(ptoks, false, issues);
    const leftToRight = parseTokens(ptoks, true, issues);
    if (issues.ambiguous && !ambiguous) ambiguous = issues.ambiguous;
    const departures = dashChoices.filter((c) => !c.plain).length;
    const push = (expr: Expr, order: ReadingChoice | null, orderReason: string | null) => {
      if (out.some((r) => sameExpr(r.expr, expr))) return;
      // A bare number in sin, cos or tan is radians by its face and degrees as the other reading.
      const trig = bareTrigCalls(expr);
      const subsets = degreeSubsets(trig);
      const make = (e: Expr, angle: ReadingChoice | null, angleReason: string | null) => {
        const formula = formatExpr(e);
        const clauses = [...dashReasons, ...(orderReason ? [orderReason] : []), ...(angleReason ? [angleReason] : [])];
        out.push({
          expr: e,
          formula,
          reason: clauses.length ? clauses.join('; ') : `one reading: ${formula}`,
          departures: departures + (order && !order.plain ? 1 : 0) + (angle && !angle.plain ? 1 : 0),
          choices: [...dashChoices, ...(order ? [order] : []), ...(angle ? [angle] : [])],
        });
      };
      if (!subsets.length) return make(expr, null, null);
      const said = trig.map((c) => formatExpr(c)).join(' and ');
      make(expr, { kind: 'angle', text: said, as: 'radians', plain: true }, `the bare number in ${said} is taken as radians`);
      for (const set of subsets) {
        const e = withDegrees(expr, set);
        if (out.some((r) => sameExpr(r.expr, e))) continue;
        const flipped = trig.filter((c) => set.has(c)).map((c) => formatExpr(c)).join(' and ');
        make(e, { kind: 'angle', text: flipped, as: 'degrees', plain: false }, `or the bare number in ${flipped} as degrees: ${formatExpr(e)}`);
      }
    };
    if (byPrecedence && leftToRight && !sameExpr(byPrecedence, leftToRight)) {
      const f = formatExpr(byPrecedence);
      push(byPrecedence, { kind: 'order', text: f, as: 'precedence', plain: true },
        `by precedence (× and ÷ before + and −): ${describeExpr(byPrecedence) ?? f}`);
      push(leftToRight, { kind: 'order', text: formatExpr(leftToRight), as: 'left-to-right', plain: false },
        `as worked, left to right: ${describeExpr(leftToRight) ?? formatExpr(leftToRight)}`);
    } else if (byPrecedence ?? leftToRight) {
      push((byPrecedence ?? leftToRight)!, null, null);
    }
  }
  if (!out.length) return { readings: [], error: ambiguous || `cannot read “${src.slice(toks[0]?.at ?? 0, toks[toks.length - 1]?.end ?? 0)}” as a formula` };
  // The plain reading first; each departure after it, in the order found.
  const ranked = out.map((r, i) => ({ r, i })).sort((x, y) => x.r.departures - y.r.departures || x.i - y.i).map((x) => x.r);
  return { readings: ranked };
}

function dashReason(a: Quantity, b: Quantity, as: 'range' | 'minus', plain: boolean, glyph?: string): string {
  const A = formatQuantity(a), B = formatQuantity(b);
  const range = formatQuantity(rangeOf(a.lo, b.hi, b.unit ?? a.unit));
  const diff = arithmetic('-', a, b).quantity;
  const D = diff ? formatQuantity(diff) : '?';
  const lengths = a.unit !== null || b.unit !== null;
  if (as === 'range') {
    return plain
      ? `a dash between ${A} and ${B}, the smaller first, reads as a range, ${range}: ${A} − ${B} would be ${D}, and a length is not negative`
      : lengths
        ? `read as a range instead, ${range}, since a length is not negative`
        : `read as a range instead, ${range}`;
  }
  if (plain) {
    return glyph === '-' ? `a hyphen between the bare numbers ${A} and ${B} reads as a minus: ${A} − ${B} = ${D}` : `a minus sign between ${A} and ${B}: ${A} − ${B} = ${D}`;
  }
  return `the dash as a minus: ${A} − ${B} = ${D}, a negative length`;
}

// ----- sin(30): radians by its face, degrees the second reading -----

const isTrig = (fn: FnName) => fn === 'sin' || fn === 'cos' || fn === 'tan';

/** A number written plain: no unit, no angle, no symbol, no name — only digits and the signs between them. */
function isPlainNumber(e: Expr): boolean {
  switch (e.k) {
    case 'num':
      return isBare(e.q) && !isRange(e.q) && !e.sym;
    case 'neg':
      return isPlainNumber(e.a);
    case 'op':
      return isPlainNumber(e.a) && isPlainNumber(e.b);
    default:
      return false;
  }
}

type CallExpr = Extract<Expr, { k: 'call' }>;

/** The sin, cos and tan of a plain number — each of which could be degrees. */
function bareTrigCalls(e: Expr, out: CallExpr[] = []): CallExpr[] {
  if (e.k === 'call') {
    if (!e.deg && isTrig(e.fn) && isPlainNumber(e.a)) out.push(e);
    else bareTrigCalls(e.a, out);
  } else if (e.k === 'op') {
    bareTrigCalls(e.a, out);
    bareTrigCalls(e.b, out);
  } else if (e.k === 'neg' || e.k === 'carry') bareTrigCalls(e.a, out);
  return out;
}

/** Every non-empty set of them to read as degrees while there are few; all of them together beyond that. */
function degreeSubsets(calls: CallExpr[]): Set<Expr>[] {
  if (!calls.length) return [];
  if (calls.length > MAX_CHOICES) return [new Set<Expr>(calls)];
  const out: Set<Expr>[] = [];
  for (let m = 1; m < 1 << calls.length; m++) out.push(new Set<Expr>(calls.filter((_, j) => (m >> j) & 1)));
  return out;
}

function withDegrees(e: Expr, flip: ReadonlySet<Expr>): Expr {
  switch (e.k) {
    case 'call':
      return flip.has(e) ? { ...e, deg: true } : { ...e, a: withDegrees(e.a, flip) };
    case 'op':
      return { ...e, a: withDegrees(e.a, flip), b: withDegrees(e.b, flip) };
    case 'neg':
    case 'carry':
      return { ...e, a: withDegrees(e.a, flip) };
    default:
      return e;
  }
}

/**
 * Every reading of one expression, ranked, each with its reason — the plain
 * reading first. Empty when the text is not one expression (it has an `=`, or
 * two expressions side by side, or something the grammar cannot read).
 */
export function parseExpression(text: string): ExprReading[] {
  const s = text.replace(SPACES, ' ');
  const toks = refine(scan(s));
  if (!toks.length || toks.some((t) => t.t === 'eq')) return [];
  const segs = splitSegments(toks);
  if (segs.length !== 1) return [];
  return readSegment(segs[0].toks, s).readings;
}

// ===== Chains: a line split at =, at a result written beside it, at a worked line =====

/** How a segment follows the one before it: after `=` or `≈`, written beside it, or across a column's gap. */
export type SegmentJoin = '=' | '≈' | 'beside' | 'gap';

export interface ChainSegment {
  /** As written. */
  text: string;
  join?: SegmentJoin;
  readings: ExprReading[];
  /** Why there are no readings. */
  error?: string;
}

export interface ExprChain {
  text: string;
  segments: ChainSegment[];
}

/** A gap of this many spaces or more between two operands is the gap before a worked line. */
const GAP_SPACES = 3;

function splitSegments(toks: Tok[]): { toks: Tok[]; join?: SegmentJoin }[] {
  const segs: { toks: Tok[]; join?: SegmentJoin }[] = [{ toks: [] }];
  let depth = 0;
  for (const t of toks) {
    const cur = segs[segs.length - 1];
    if (t.t === 'eq' && depth === 0) {
      segs.push({ toks: [], join: t.approx ? '≈' : '=' });
      continue;
    }
    // Two operands side by side with nothing between: a result written beside its formula.
    if (depth === 0 && operandEnd(cur.toks[cur.toks.length - 1]) && operandStart(t)) {
      segs.push({ toks: [t], join: t.space >= GAP_SPACES ? 'gap' : 'beside' });
      if (t.t === 'lp') depth++;
      continue;
    }
    if (t.t === 'lp') depth++;
    if (t.t === 'rp') depth = Math.max(0, depth - 1);
    cur.toks.push(t);
  }
  return segs.filter((s) => s.toks.length > 0);
}

export function parseChain(text: string): ExprChain {
  const s = text.replace(SPACES, ' ');
  const toks = refine(scan(s));
  const segments = splitSegments(toks).map((seg): ChainSegment => {
    const first = seg.toks[0], last = seg.toks[seg.toks.length - 1];
    const { readings, error } = readSegment(seg.toks, s);
    return {
      text: s.slice(first.at, last.end),
      ...(seg.join ? { join: seg.join } : {}),
      readings,
      ...(error ? { error } : {}),
    };
  });
  return { text: s, segments };
}

// ===== A line: its label and its body =====

export type LineLabel = { kind: 'letter'; letter: string; text: string } | { kind: 'step'; n: number; text: string };

/**
 * What the body of a line looks like, before a sheet decides what it IS:
 * words only (`heading`), a name and a number (`definition`), one number
 * (`value`), anything with arithmetic (`formula`), nothing (`empty`), or
 * something the grammar cannot read (`unreadable`).
 */
export type LineShape = 'empty' | 'heading' | 'definition' | 'value' | 'formula' | 'unreadable';

export interface LineParse {
  text: string;
  label?: LineLabel;
  body: string;
  chain: ExprChain;
  shape: LineShape;
  /** For a definition: the name, as written. */
  name?: string;
  /** For a definition or a value: the number. */
  value?: Quantity;
}

const LETTER_LABEL = /^\s*([A-Z])\s*[.):]\s+(?=\S)/;
const STEP_LABEL = /^\s*(?:step\s*)?(\d{1,3})\s*[.):]\s+(?=\S)/i;
const PAREN_LABEL = /^\s*\((\d{1,3})\)\s+(?=\S)/;
const STARTS_WITH_OP = /^\s*[+\-–—−×*·÷/:=]/;

function splitLabel(s: string): { label?: LineLabel; body: string } {
  let m = LETTER_LABEL.exec(s);
  if (m) return { label: { kind: 'letter', letter: m[1], text: m[0].trim() }, body: s.slice(m[0].length) };
  m = STEP_LABEL.exec(s);
  if (m) return { label: { kind: 'step', n: Number(m[1]), text: m[0].trim() }, body: s.slice(m[0].length) };
  m = PAREN_LABEL.exec(s);
  if (m && !STARTS_WITH_OP.test(s.slice(m[0].length))) return { label: { kind: 'step', n: Number(m[1]), text: m[0].trim() }, body: s.slice(m[0].length) };
  const c = s.trimStart()[0];
  if (c && c in CIRCLED) {
    // ① followed by an operand labels a step; followed by an operator it IS the operand.
    const rest = s.trimStart().slice(1);
    if (/^\s+\S/.test(rest) && !STARTS_WITH_OP.test(rest)) return { label: { kind: 'step', n: CIRCLED[c], text: c }, body: rest.trimStart() };
  }
  return { body: s };
}

/**
 * The one number a segment is, when it is only that. An angle (30°) and a symbol (π) are
 * numbers of a kind a page's lines do not mean by "a value" — a measurement to attach to a
 * side, a definition of a name — so they are formulas, and a text holding one is not read
 * as a length.
 */
function loneQuantity(seg: ChainSegment): Quantity | null {
  const e = seg.readings[0]?.expr;
  if (!e) return null;
  if (e.k === 'num') return e.q.angle || e.sym ? null : e.q;
  if (e.k === 'neg' && e.a.k === 'num') return e.a.q.angle || e.a.sym ? null : negateQuantity(e.a.q);
  return null;
}

export function parseLine(text: string): LineParse {
  const s = text.replace(SPACES, ' ').trim();
  const { label, body } = splitLabel(s);
  const chain = parseChain(body);
  const segs = chain.segments;
  const base = { text: s, ...(label ? { label } : {}), body: body.trim(), chain };
  if (!segs.length) return { ...base, shape: 'empty' };
  if (segs.some((g) => !g.readings.length)) return { ...base, shape: 'unreadable' };
  const kinds = segs.map((g) => (g.readings[0].expr.k === 'name' ? 'name' : loneQuantity(g) ? 'quantity' : 'expr'));
  if (kinds.length === 1 && kinds[0] === 'name') return { ...base, shape: 'heading' };
  if (kinds.length === 1 && kinds[0] === 'quantity') return { ...base, shape: 'value', value: loneQuantity(segs[0])! };
  if (kinds.length === 2 && kinds[0] === 'name' && kinds[1] === 'quantity') {
    const e = segs[0].readings[0].expr;
    return { ...base, shape: 'definition', name: e.k === 'name' ? e.name : segs[0].text, value: loneQuantity(segs[1])! };
  }
  return { ...base, shape: 'formula' };
}

// ===== Evaluation =====

/**
 * One way a name can be read. The first a scope returns is the plain one
 * (`alternative` unset); an alternative carries a `label` — "with seam
 * allowance" — and every name that has an alternative of that label takes it
 * together, so a reading is consistent: all measured, or all with the
 * allowance, never half and half.
 */
export interface NameResolution {
  value: Quantity | null;
  /** What it depends on: a definition's key or a step's, for re-derivation. */
  key?: string;
  /** For people: "from the measurements", "with seam allowance". */
  label?: string;
  alternative?: boolean;
  reason?: string;
}

export interface MathsScope {
  /** Every reading of a name, the plain one first; undefined when nothing defines it. */
  name?(name: string): readonly NameResolution[] | undefined;
  /** A step's value, when the step exists. */
  step?(n: number): NameResolution | undefined;
  /** The unit a bare measurement takes — a name a worked line put 36 for is 36 of this. */
  unit?: LengthUnit | null;
  /** How to say that nothing here defines a name: "Waist is not on this sheet". */
  describeUnknown?(name: string): string;
}

/** A scope from plain tables — for tests, and for a caller with the numbers already in hand. */
export function scopeOf(
  names: Record<string, string | Quantity | readonly NameResolution[]> = {},
  steps: Record<number, string | Quantity> = {},
  unit: LengthUnit | null = null
): MathsScope {
  const toQ = (v: string | Quantity): Quantity | null => (typeof v === 'string' ? parseQuantity(v)?.quantity ?? null : v);
  const table = new Map<string, readonly NameResolution[]>();
  for (const [k, v] of Object.entries(names)) {
    table.set(normName(k), Array.isArray(v) ? (v as readonly NameResolution[]) : [{ value: toQ(v as string | Quantity), key: k }]);
  }
  return {
    unit,
    name: (n) => table.get(normName(n)),
    step: (n) => (steps[n] !== undefined ? { value: toQ(steps[n]), key: String(n) } : undefined),
  };
}

export interface EvalOptions {
  /** Which alternative reading of the names to take; the plain one when unset. */
  label?: string;
  /** What a worked line fixed: `name:<name>`, `ref:<n>`, `num:<id>` (a value chosen from a range). */
  bindings?: ReadonlyMap<string, Quantity>;
}

/** A name or step as one evaluation resolved it. */
export interface Resolved {
  subject: string;
  value: Quantity | null;
  key?: string;
  label?: string;
  alternative?: boolean;
  from: 'scope' | 'worked' | 'number';
}

export interface ExprEvaluation {
  value: Quantity | null;
  /** The formula with the values put in: `(46″ × 2) − 20″`. */
  worked: string;
  /** Keys of the definitions and steps it read. */
  uses: string[];
  /** Names nothing resolved. (A step that is not there, or has no value, is said in `notes`.) */
  unknowns: string[];
  notes: string[];
  resolved: Resolved[];
}

function pick(res: readonly NameResolution[], label: string | undefined): NameResolution {
  if (label) {
    const alt = res.find((r) => r.alternative && r.label === label);
    if (alt) return alt;
  }
  return res.find((r) => !r.alternative) ?? res[0];
}

const dimWord = (q: Quantity) => (q.angle ? 'an angle' : q.dim === 0 ? 'a number' : q.dim === 1 ? 'a length' : 'an area');

/**
 * A function of one quantity. A trig function takes an angle — a bare number is
 * radians, or degrees when the reading says so — and gives a plain number; an arc
 * function takes a plain number and gives an angle in degrees, with its unit written;
 * √ of an area is a length and √ of a length is nothing a page means; ln, log and exp
 * take plain numbers. A range, a length where a number is wanted, and a value outside
 * the function's domain are refused with the reason.
 */
function applyCall(fn: FnName, q: Quantity, deg: boolean, note: boolean): Arith {
  const notes: string[] = [];
  const fail = (error: string): Arith => ({ quantity: null, notes, error });
  const said = fn === 'sqrt' ? '√' : fn;
  const of = formatQuantity(q);
  if (isRange(q)) return fail(`${said} of a range (${of}) is not read — pick a value`);
  if (fn === 'abs') return { quantity: { ...q, lo: Math.abs(q.lo), hi: Math.abs(q.lo) }, notes };
  if (fn === 'sqrt') {
    if (q.lo < 0) return fail(`the square root of ${of} is not a real number`);
    return powQuantity(q, quantity(0.5));
  }
  if (q.unit || q.dim) return fail(`cannot take ${said} of ${dimWord(q)}`);
  if (fn === 'sin' || fn === 'cos' || fn === 'tan') {
    let rad: number;
    if (q.angle) rad = inRadians(q);
    else if (deg) rad = (q.lo * Math.PI) / 180;
    else {
      rad = q.lo;
      if (note) notes.push(`${of} taken as radians — write ${formatNumber(q.lo)}° for degrees`);
    }
    const v = FUNCTIONS[fn].eval(rad);
    return v === null ? fail(`${said}(${of}) is not defined`) : { quantity: quantity(v, null, { approx: q.approx }), notes };
  }
  if (q.angle) return fail(`cannot take ${said} of an angle`);
  const v = FUNCTIONS[fn].eval(q.lo);
  if (v === null) {
    return fail(
      fn === 'ln' || fn === 'log' ? `${said}(${of}) is not defined — it needs a number above zero`
        : fn === 'asin' || fn === 'acos' ? `${said}(${of}) is not defined — no angle has a ${fn === 'asin' ? 'sine' : 'cosine'} of ${of}`
          : `${said}(${of}) is not defined`
    );
  }
  if (fn === 'asin' || fn === 'acos' || fn === 'atan') {
    return { quantity: quantity((v * 180) / Math.PI, null, { angle: 'deg', approx: q.approx }), notes: [...notes, `${said}(${of}) is an angle, shown in degrees`] };
  }
  return { quantity: quantity(v, null, { approx: q.approx }), notes };
}

export function evaluateExpr(expr: Expr, scope: MathsScope = {}, options: EvalOptions = {}): ExprEvaluation {
  const uses = new Set<string>();
  const unknowns = new Set<string>();
  const notes: string[] = [];
  const resolved: Resolved[] = [];
  const shown = new Map<Expr, string>();
  const bound = options.bindings;
  const note = (n: string) => {
    if (!notes.includes(n)) notes.push(n);
  };
  const rec = (e: Expr): Quantity | null => {
    switch (e.k) {
      case 'num': {
        const b = bound?.get(`num:${e.id}`);
        if (b) {
          shown.set(e, formatQuantity(b));
          return b;
        }
        return e.q;
      }
      case 'name': {
        const b = bound?.get(`name:${normName(e.name)}`);
        if (b) {
          shown.set(e, formatQuantity(b));
          resolved.push({ subject: e.name, value: b, from: 'worked' });
          return b;
        }
        const res = scope.name?.(e.name);
        if (!res || !res.length) {
          // A lower-case e that nothing here defines is Euler's number, and the line says it read it so.
          if (e.name === 'e') {
            note('e read as Euler’s number, 2.718…, since nothing here defines e');
            shown.set(e, 'e');
            return quantity(Math.E);
          }
          unknowns.add(e.name);
          return null;
        }
        const r = pick(res, options.label);
        if (r.key) uses.add(r.key);
        resolved.push({ subject: e.name, value: r.value, key: r.key, label: r.label, alternative: r.alternative, from: 'scope' });
        if (!r.value) {
          unknowns.add(e.name);
          if (r.reason) note(r.reason);
          return null;
        }
        shown.set(e, formatQuantity(r.value));
        return r.value;
      }
      case 'ref': {
        const b = bound?.get(`ref:${e.step}`);
        if (b) {
          shown.set(e, formatQuantity(b));
          resolved.push({ subject: e.text, value: b, from: 'worked' });
          return b;
        }
        const r = scope.step?.(e.step);
        if (r) {
          if (r.key) uses.add(r.key);
          resolved.push({ subject: e.text, value: r.value, key: r.key, from: 'scope' });
          if (r.value) {
            shown.set(e, formatQuantity(r.value));
            return r.value;
          }
          note(r.reason ?? `step ${e.step} has no value`);
          return null;
        }
        if (e.bare) {
          const n = quantity(e.step);
          note(`${e.text} read as the number ${e.step}: there is no step ${e.step}`);
          resolved.push({ subject: e.text, value: n, from: 'number' });
          shown.set(e, String(e.step));
          return n;
        }
        note(`there is no step ${e.step}`);
        return null;
      }
      case 'neg': {
        const v = rec(e.a);
        return v && negateQuantity(v);
      }
      case 'op': {
        const a = rec(e.a), b = rec(e.b);
        if (!a || !b) return null;
        const r = applyOp(e.op, a, b);
        r.notes.forEach(note);
        if (r.error) note(r.error);
        return r.quantity;
      }
      case 'call': {
        const v = rec(e.a);
        if (!v) return null;
        const r = applyCall(e.fn, v, !!e.deg, !e.deg && hasNames(e.a) && !hasSymbol(e.a));
        r.notes.forEach(note);
        if (r.error) note(r.error);
        return r.quantity;
      }
      case 'carry': {
        const v = rec(e.a);
        if (v) return v;
        shown.set(e, e.text);
        note(`carried the written ${e.text}`);
        return e.written;
      }
    }
  };
  const value = rec(expr);
  return {
    value,
    worked: fmtExpr(expr, (e) => shown.get(e)),
    uses: [...uses],
    unknowns: [...unknowns],
    notes,
    resolved,
  };
}

// ===== A chain, evaluated: running totals, restatements, checks =====

/** A written number checked against the computed one. */
export interface WrittenCheck extends Comparison {
  /** As written: "12", `21"`. */
  text: string;
  /** Which segment of the line wrote it. */
  segment: number;
  /**
   * `result` — a result written after the formula;
   * `restated` — a number the worked line put for a name, a step or a part of the formula;
   * `carried` — the number a running total starts again from.
   */
  what: 'result' | 'restated' | 'carried';
  /** For `restated`: what the number was put in for — `①`, `A ÷ 3`. */
  subject?: string;
}

/** Something the worked line fixed that nothing else did: a measurement the page never wrote, a value chosen from a range. */
export interface WorkedBinding {
  kind: 'name' | 'step' | 'range';
  subject: string;
  value: Quantity;
  reason: string;
}

export interface ChainReading {
  /** The formula this reading computes, through every running total. Null when the line could not be read. */
  expr: Expr | null;
  formula: string;
  value: Quantity | null;
  /** The formula with the values put in. */
  worked: string;
  checks: WrittenCheck[];
  bindings: WorkedBinding[];
  /** How many segments restated the formula with numbers put in — a worked line that has this reading's form. */
  restated: number;
  /** The alternative reading of the names this took ("with seam allowance"), when it took one. */
  label?: string;
  uses: string[];
  unknowns: string[];
  notes: string[];
  reason: string;
}

interface Acc {
  bindings: Map<string, Quantity>;
  bound: WorkedBinding[];
  keyed: Keyed[];
  checks: WrittenCheck[];
  fails: number;
  passes: number;
}

function newAcc(from?: ReadonlyMap<string, Quantity>): Acc {
  return { bindings: new Map(from ?? []), bound: [], keyed: [], checks: [], fails: 0, passes: 0 };
}

/** The number a worked line wrote at this place, if it is one (a number, a sum of numbers, a bracketed count). */
function constantValue(w: Expr): Quantity | null {
  if (w.k === 'num') return w.q;
  if (w.k === 'ref' && w.bare) return quantity(w.step);
  if (hasNames(w)) return null;
  return evaluateExpr(w).value;
}

function tally(acc: Acc, c: WrittenCheck) {
  acc.checks.push(c);
  if (c.status === 'off') acc.fails++;
  else if (c.status !== 'unknown') acc.passes++;
}

interface UnifyCtx {
  scope: MathsScope;
  label?: string;
  segment: number;
}

/**
 * Does the segment `w` restate the formula `f` with numbers put in? Same
 * shape, operation for operation; a name, a step or a whole part of the
 * formula may be replaced by a number. A number put in for something known is
 * checked; for something unknown it is taken, and said to be the worked
 * line's; for a range it is the value chosen from it.
 */
function unify(f: Expr, w: Expr, ctx: UnifyCtx, acc: Acc): boolean {
  const partial = (): boolean => {
    const wv = constantValue(w);
    if (!wv) return false;
    const ev = evaluateExpr(f, ctx.scope, { label: ctx.label, bindings: acc.bindings });
    tally(acc, { ...compareQuantities(ev.value, wv), text: textOf(w), segment: ctx.segment, what: 'restated', subject: formatExpr(f) });
    return true;
  };
  switch (f.k) {
    case 'op':
      if (w.k === 'op') return f.op === w.op && unify(f.a, w.a, ctx, acc) && unify(f.b, w.b, ctx, acc);
      return w.k === 'num' || w.k === 'neg' ? partial() : false;
    case 'neg':
      if (w.k === 'neg') return unify(f.a, w.a, ctx, acc);
      return w.k === 'num' ? partial() : false;
    case 'call':
      if (w.k === 'call') return f.fn === w.fn && !!f.deg === !!w.deg && unify(f.a, w.a, ctx, acc);
      return w.k === 'num' || w.k === 'neg' ? partial() : false;
    case 'carry':
      if (w.k === 'num') return partial();
      return unify(f.a, w, ctx, acc);
    case 'name':
    case 'ref': {
      if (w.k === 'name') return f.k === 'name' && normName(f.name) === normName(w.name);
      if (w.k === 'ref' && !w.bare) return f.k === 'ref' && f.step === w.step;
      const wv = constantValue(w);
      if (!wv) return false;
      const subject = f.k === 'name' ? f.name : f.text;
      const known = evaluateExpr(f, ctx.scope, { label: ctx.label, bindings: acc.bindings });
      if (known.value) {
        tally(acc, { ...compareQuantities(known.value, wv), text: textOf(w), segment: ctx.segment, what: 'restated', subject });
        return true;
      }
      const v = isBare(wv) && ctx.scope.unit ? { ...wv, unit: ctx.scope.unit, dim: 1 } : wv;
      const key = f.k === 'name' ? `name:${normName(f.name)}` : `ref:${f.step}`;
      const binding: WorkedBinding = { kind: f.k === 'name' ? 'name' : 'step', subject, value: v, reason: `${subject} as ${formatQuantity(v)}` };
      acc.bindings.set(key, v);
      acc.bound.push(binding);
      acc.keyed.push({ key, binding });
      return true;
    }
    case 'num': {
      const wv = constantValue(w);
      if (!wv) return false;
      if (isRange(f.q)) {
        const v = isBare(wv) && f.q.unit ? { ...wv, unit: f.q.unit, dim: f.q.dim } : wv;
        const subject = formatQuantity(f.q);
        if (!isRange(v) && holds(f.q, v.lo)) {
          acc.bindings.set(`num:${f.id}`, v);
          acc.bound.push({ kind: 'range', subject, value: v, reason: `${formatQuantity(v)} chosen from ${subject}` });
          acc.passes++;
          return true;
        }
        tally(acc, { ...compareQuantities(f.q, v), text: textOf(w), segment: ctx.segment, what: 'restated', subject });
        return true;
      }
      const c = compareQuantities(f.q, wv);
      if (c.status === 'ok' || c.status === 'rounded') {
        acc.passes++;
        return true;
      }
      return false;
    }
  }
}

function textOf(e: Expr): string {
  return e.k === 'num' ? e.text : formatExpr(e);
}

function leftmostNum(e: Expr): Extract<Expr, { k: 'num' }> | null {
  if (e.k === 'num') return e;
  if (e.k === 'op') return leftmostNum(e.a);
  return null;
}

function replaceLeaf(e: Expr, leaf: Expr, by: Expr): Expr {
  if (e === leaf) return by;
  if (e.k === 'op') return { ...e, a: replaceLeaf(e.a, leaf, by), b: replaceLeaf(e.b, leaf, by) };
  if (e.k === 'neg' || e.k === 'call') return { ...e, a: replaceLeaf(e.a, leaf, by) };
  return e;
}

function namesIn(e: Expr, out: string[] = []): string[] {
  if (e.k === 'name') {
    if (!out.some((n) => normName(n) === normName(e.name))) out.push(e.name);
  } else if (e.k === 'op') {
    namesIn(e.a, out);
    namesIn(e.b, out);
  } else if (e.k === 'neg' || e.k === 'carry' || e.k === 'call') namesIn(e.a, out);
  return out;
}

/** The alternative readings the scope offers for any name in these formulas, in the order met. */
function alternativeLabels(exprs: Expr[], scope: MathsScope): string[] {
  const labels: string[] = [];
  for (const e of exprs) {
    for (const n of namesIn(e)) {
      for (const r of scope.name?.(n) ?? []) if (r.alternative && r.label && !labels.includes(r.label)) labels.push(r.label);
    }
  }
  return labels;
}

function takesLabel(e: Expr, label: string, scope: MathsScope): boolean {
  return namesIn(e).some((n) => (scope.name?.(n) ?? []).some((r) => r.alternative && r.label === label));
}

interface Run {
  reading: ExprReading;
  ri: number;
  li: number;
  label?: string;
  cur: Expr;
  acc: Acc;
  restated: number;
  /** Which segments this reading restated, and how each is named in a reason. */
  restatedSegs: number[];
  restatedTexts: string[];
  /** The worked line another reading restated, which this one does not: skipped, and said. */
  skipped: string[];
  /** What this reading took from that worked line: the measurement it put in. */
  seeded: WorkedBinding[];
  notes: string[];
}

/** A binding with the key it is held under, so another reading can take the same measurement from the same worked line. */
interface Keyed {
  key: string;
  binding: WorkedBinding;
}

function refsIn(e: Expr, out: number[] = []): number[] {
  if (e.k === 'ref') out.push(e.step);
  else if (e.k === 'op') {
    refsIn(e.a, out);
    refsIn(e.b, out);
  } else if (e.k === 'neg' || e.k === 'carry' || e.k === 'call') refsIn(e.a, out);
  return out;
}

const cmpScore = (a: number[], b: number[]) => {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] - b[i];
  return 0;
};

function runChain(
  reading: ExprReading,
  rest: ChainSegment[],
  scope: MathsScope,
  label: string | undefined,
  skip: ReadonlySet<number> = new Set(),
  seed: readonly Keyed[] = []
): Omit<Run, 'ri' | 'li'> {
  let cur = reading.expr;
  const acc = newAcc();
  const seeded: WorkedBinding[] = [];
  for (const s of seed) {
    acc.bindings.set(s.key, s.binding.value);
    seeded.push(s.binding);
  }
  const notes: string[] = [];
  let restated = 0;
  const restatedSegs: number[] = [];
  const restatedTexts: string[] = [];
  const skipped: string[] = [];
  rest.forEach((seg, k) => {
    const segment = k + 1;
    if (skip.has(segment)) {
      skipped.push(seg.text);
      return;
    }
    if (!seg.readings.length) {
      notes.push(seg.error ?? `cannot read “${seg.text}”`);
      return;
    }
    const lone = loneQuantity(seg);
    if (lone) {
      // A written result: checked, and the computed value flows on.
      const ev = evaluateExpr(cur, scope, { label, bindings: acc.bindings });
      tally(acc, { ...compareQuantities(ev.value, lone), text: seg.text, segment, what: 'result' });
      if (!ev.value) cur = { k: 'carry', a: cur, written: lone, text: seg.text };
      return;
    }
    // An expression: the formula restated with numbers put in, or the running total carried on.
    type Option = { score: number[]; apply: () => void };
    const options: Option[] = [];
    for (const sr of seg.readings) {
      const trial = newAcc(acc.bindings);
      if (unify(cur, sr.expr, { scope, label, segment }, trial)) {
        options.push({
          score: [trial.fails, 0, -trial.passes],
          apply: () => {
            for (const [key, v] of trial.bindings) acc.bindings.set(key, v);
            acc.bound.push(...trial.bound);
            acc.keyed.push(...trial.keyed);
            acc.checks.push(...trial.checks);
            acc.fails += trial.fails;
            acc.passes += trial.passes;
            restated++;
            restatedSegs.push(segment);
            restatedTexts.push(seg.join === 'gap' ? `the worked line “${seg.text}”` : `“${seg.text}”`);
          },
        });
      }
      const leaf = leftmostNum(sr.expr);
      if (leaf && !isRange(leaf.q)) {
        const ev = evaluateExpr(cur, scope, { label, bindings: acc.bindings });
        const c: WrittenCheck = { ...compareQuantities(ev.value, leaf.q), text: leaf.text, segment, what: 'carried' };
        const next = replaceLeaf(sr.expr, leaf, { k: 'carry', a: cur, written: leaf.q, text: leaf.text });
        options.push({
          score: [c.status === 'off' ? 1 : 0, 1, c.status === 'unknown' || c.status === 'off' ? 0 : -1],
          apply: () => {
            tally(acc, c);
            cur = next;
          },
        });
      }
    }
    if (!options.length) {
      notes.push(`“${seg.text}” neither restates the line nor carries it on`);
      return;
    }
    options.reduce((best, o) => (cmpScore(o.score, best.score) < 0 ? o : best)).apply();
  });
  return { reading, label, cur, acc, restated, restatedSegs, restatedTexts, skipped, seeded, notes };
}

const joinNames = (xs: string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

const runKey = (r: Run) => [r.acc.fails, -r.restated, -r.acc.passes, r.li, r.reading.departures, r.ri];
const sortRuns = (runs: Run[]) => runs.sort((a, b) => cmpScore(runKey(a), runKey(b)));

/**
 * Every reading of a line, ranked: each reading of its formula, under each
 * alternative reading of its names, run through the chain. Ranked by the
 * arithmetic — fewest written results off, then the most restatements (a
 * worked line that has this form settles it), then the most that check —
 * and only then by how plainly the notation reads. Nothing is dropped.
 *
 * A worked line one reading restates is the step's worked line for every
 * reading: another reading that does not have its form skips it — it is not
 * that reading's running total — takes the measurement it put in, and is
 * checked against the result written after it. So `Chest + 6″ ÷ 2` by
 * precedence, beside `(36 + 6)/2 = 21″`, says 39″ against the written 21″.
 */
export function evaluateChain(chain: ExprChain, scope: MathsScope = {}): ChainReading[] {
  const [first, ...rest] = chain.segments;
  if (!first) return [];
  if (!first.readings.length) {
    const why = first.error ?? `cannot read “${first.text}”`;
    return [{ expr: null, formula: first.text, value: null, worked: first.text, checks: [], bindings: [], restated: 0, uses: [], unknowns: [], notes: [why], reason: why }];
  }
  const labels = alternativeLabels(first.readings.map((r) => r.expr), scope);
  let runs: Run[] = [];
  first.readings.forEach((reading, ri) => {
    [undefined, ...labels].forEach((label, li) => {
      if (label && !takesLabel(reading.expr, label, scope)) return;
      runs.push({ ...runChain(reading, rest, scope, label), ri, li });
    });
  });
  sortRuns(runs);
  const settled = runs.find((r) => r.restated > 0);
  if (settled) {
    const worked = new Set(settled.restatedSegs);
    runs = runs.map((r) => {
      if (r.restatedSegs.some((s) => worked.has(s))) return r;
      const names = namesIn(r.reading.expr).map(normName);
      const refs = refsIn(r.reading.expr);
      const seed = settled.acc.keyed
        .filter((x) => (x.binding.kind === 'name' && names.includes(x.key.slice(5))) || (x.binding.kind === 'step' && refs.includes(Number(x.key.slice(4)))))
        .map((x) => ({ key: x.key, binding: { ...x.binding, reason: `${x.binding.reason}, as the worked line puts it` } }));
      return { ...runChain(r.reading, rest, scope, r.label, worked, seed), ri: r.ri, li: r.li };
    });
    sortRuns(runs);
  }
  const plural = first.readings.length > 1;
  return runs.map((run): ChainReading => {
    const ev = evaluateExpr(run.cur, scope, { label: run.label, bindings: run.acc.bindings });
    const unknown = (u: string) => scope.describeUnknown?.(u) ?? `${u} is not defined`;
    const notes = [...run.notes];
    for (const n of ev.notes) if (!notes.includes(n)) notes.push(n);
    for (const u of ev.unknowns) if (!notes.some((n) => n.includes(u))) notes.push(unknown(u));
    const formula = formatExpr(run.cur);
    const clauses: string[] = [];
    if (plural) clauses.push(run.reading.reason);
    if (labels.length) {
      const taken = ev.resolved.filter((r) => r.from === 'scope' && r.value);
      const alt = taken.filter((r) => r.alternative);
      if (run.label) {
        clauses.push(`${run.label} on ${joinNames(alt.map((r) => r.subject))} (${alt.map((r) => `${r.subject} ${formatQuantity(r.value!)}`).join(', ')})`);
      } else {
        const plainLabel = taken.find((r) => r.label)?.label ?? 'as written';
        clauses.push(`${plainLabel} (${taken.map((r) => `${r.subject} ${formatQuantity(r.value!)}`).join(', ')})`);
      }
    }
    if (run.restated) {
      const fixed = run.acc.bound.map((b) => b.reason);
      const across = run.restatedTexts.some((t) => t.startsWith('the worked line'));
      clauses.push(`${run.restatedTexts.join(' and ')} ${across ? 'has this form' : 'restates it with the numbers put in'}${fixed.length ? `, with ${fixed.join(' and ')}` : ''}`);
    }
    if (run.skipped.length) {
      clauses.push(`the worked line ${run.skipped.map((t) => `“${t}”`).join(' and ')} does not have this form${run.seeded.length ? `; it puts ${run.seeded.map((b) => `${b.subject} as ${formatQuantity(b.value)}`).join(' and ')}` : ''}`);
    }
    const offs = run.acc.checks.filter((c) => c.status === 'off');
    clauses.push(ev.value ? `${formula} = ${formatQuantity(ev.value)}` : `${formula}: no value`);
    if (run.acc.checks.length) {
      clauses.push(
        offs.length
          ? offs.map((c) => c.reason).join('; ')
          : run.acc.checks.some((c) => c.status === 'unknown')
            ? 'nothing to check some of the written numbers against'
            : 'every written number checks'
      );
    }
    // What the arithmetic had to say on the way: a conversion, a carried result, a step that is not there.
    for (const n of notes) if (!clauses.includes(n)) clauses.push(n);
    return {
      expr: run.cur,
      formula,
      value: ev.value,
      worked: ev.value && ev.worked !== formatQuantity(ev.value) ? `${ev.worked} = ${formatQuantity(ev.value)}` : ev.worked,
      checks: run.acc.checks,
      bindings: [...run.seeded, ...run.acc.bound],
      restated: run.restated,
      ...(run.label ? { label: run.label } : {}),
      uses: ev.uses,
      unknowns: ev.unknowns,
      notes,
      reason: clauses.join('; '),
    };
  });
}
