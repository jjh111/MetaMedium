// Maths with a variable (MATHS-SPEC lane B, M11) — what a person writes of a
// function, read by hand into a tree, printed back as it was read, and compiled
// into a function of one variable.
//
//     y = (x²−4)/(x−2)      f(t) = 3t + 1      2π√(L/g)      sin x / x      e^(−x²)
//
// The grammar is written by hand: no `eval`, no `new Function`. It reads numbers;
// names, Latin and Greek; `^` and superscripts; `√` and `sqrt`; π and e; the
// functions in `FUNCTIONS`; degrees (`sin 30°`); implicit multiplication (`2x`,
// `x(x+1)`, `2(3+1)`, `2π√(L/g)`); `/` and a unary minus; absolute-value bars; and
// a left side (`y =`, `f(x) =`) that is dropped.
//
// Three rules, each a way a function can be read wrong and say nothing:
//
//   - **What is ambiguous is refused, with both ways to write it.** `1/2x` is
//     (1/2)x to one reader and 1/(2x) to another; a division whose denominator is
//     followed by another factor is not read. `√4x` and a number stuck to a
//     letter (`x2`) are the same kind of line.
//   - **What is not a function is refused.** `foo(x)` is not read as f·o·o·x; a
//     word of four letters or more that is not one the grammar knows is a name the
//     page has not given a meaning, not a product of letters.
//   - **Undefined is null, not a number.** A hole, a pole, the root of a negative,
//     the log of zero, 0⁰ — `f` answers null there, and a plot breaks its line.
//     Nothing evaluates exactly at a removable point and calls the 0/0 a value.
//
// Tier 1: no model computes anything. `expr.ts` shares this file's function table,
// so `sin` means one thing on a sheet and in a plot.

import type { CompiledFunction } from './compile';

// ===== The functions =====

export type FnName = 'sin' | 'cos' | 'tan' | 'asin' | 'acos' | 'atan' | 'sqrt' | 'ln' | 'log' | 'exp' | 'abs';

export interface FnSpec {
  name: FnName;
  /** Other ways it is written (`arcsin`). */
  aliases: readonly string[];
  /** The value, or null where it is undefined. Angles are in radians. */
  eval(x: number): number | null;
  /** In words, for a reason: `the natural logarithm`. */
  words: string;
}

/** How near a quarter turn the cosine may be before the tangent is a pole, not a number. */
export const POLE_EPS = 1e-12;
/** How far past ±1 an arc function is still ±1 (the arithmetic of a sine that came out 1.0000000000000002). */
const ARC_SLACK = 1e-12;

const finite = (v: number): number | null => (Number.isFinite(v) ? v : null);

export const FUNCTIONS: Record<FnName, FnSpec> = {
  sin: { name: 'sin', aliases: [], words: 'the sine', eval: (x) => finite(Math.sin(x)) },
  cos: { name: 'cos', aliases: [], words: 'the cosine', eval: (x) => finite(Math.cos(x)) },
  tan: { name: 'tan', aliases: [], words: 'the tangent', eval: (x) => (Math.abs(Math.cos(x)) < POLE_EPS ? null : finite(Math.tan(x))) },
  asin: { name: 'asin', aliases: ['arcsin'], words: 'the angle whose sine it is', eval: (x) => (Math.abs(x) > 1 + ARC_SLACK ? null : Math.asin(Math.max(-1, Math.min(1, x)))) },
  acos: { name: 'acos', aliases: ['arccos'], words: 'the angle whose cosine it is', eval: (x) => (Math.abs(x) > 1 + ARC_SLACK ? null : Math.acos(Math.max(-1, Math.min(1, x)))) },
  atan: { name: 'atan', aliases: ['arctan'], words: 'the angle whose tangent it is', eval: (x) => finite(Math.atan(x)) },
  sqrt: { name: 'sqrt', aliases: [], words: 'the square root', eval: (x) => (x < 0 ? null : finite(Math.sqrt(x))) },
  ln: { name: 'ln', aliases: [], words: 'the natural logarithm', eval: (x) => (x <= 0 ? null : finite(Math.log(x))) },
  log: { name: 'log', aliases: [], words: 'the logarithm to base 10', eval: (x) => (x <= 0 ? null : finite(Math.log10(x))) },
  exp: { name: 'exp', aliases: [], words: 'e to the power', eval: (x) => finite(Math.exp(x)) },
  abs: { name: 'abs', aliases: [], words: 'the size without the sign', eval: (x) => Math.abs(x) },
};

/** Every word that is a function, longest first, so `arcsin` is not `a`·`r`·`c`·`sin`. */
const FN_WORDS: [string, FnName][] = (Object.values(FUNCTIONS) as FnSpec[])
  .flatMap((f) => [f.name, ...f.aliases].map((w): [string, FnName] => [w, f.name]))
  .sort((a, b) => b[0].length - a[0].length);

/** The function a word names, whatever its case when it stands alone; null for any other word. */
export function functionNamed(word: string): FnName | null {
  const w = word.toLowerCase();
  return FN_WORDS.find(([k]) => k === w)?.[1] ?? null;
}

/** `sin⁻¹` is the arc sine: the functions that have an inverse written that way. */
export const INVERSE_OF: Partial<Record<FnName, FnName>> = { sin: 'asin', cos: 'acos', tan: 'atan' };

export const FUNCTION_NAMES = (Object.keys(FUNCTIONS) as FnName[]).join(' ');

/** A power of two plain numbers, or null where it is not a real number. */
export function powNumbers(a: number, b: number): number | null {
  if (a === 0 && b <= 0) return null;
  if (a < 0 && !Number.isInteger(b)) return null;
  return finite(Math.pow(a, b));
}

// ===== The tree =====

export type FnNode =
  | { k: 'num'; v: number }
  | { k: 'var'; name: string }
  | { k: 'const'; name: 'π' | 'e' }
  | { k: 'neg'; a: FnNode }
  | { k: 'bin'; op: '+' | '-' | '*' | '/' | '^'; a: FnNode; b: FnNode }
  | { k: 'call'; fn: FnName; a: FnNode }
  /** An angle in degrees: `a` degrees, a·π/180 radians. */
  | { k: 'deg'; a: FnNode };

export const num = (v: number): FnNode => ({ k: 'num', v });
export const variable = (name: string): FnNode => ({ k: 'var', name });
export const bin = (op: '+' | '-' | '*' | '/' | '^', a: FnNode, b: FnNode): FnNode => ({ k: 'bin', op, a, b });

/** Every name the tree uses, in the order it first appears. */
export function freeVariables(node: FnNode, out: string[] = []): string[] {
  switch (node.k) {
    case 'var':
      if (!out.includes(node.name)) out.push(node.name);
      break;
    case 'neg':
    case 'call':
    case 'deg':
      freeVariables(node.a, out);
      break;
    case 'bin':
      freeVariables(node.a, out);
      freeVariables(node.b, out);
      break;
    default:
      break;
  }
  return out;
}

/** The value at `env`, or null where it is undefined — a name with no value, a hole, a pole, a root of a negative. */
export function evalFn(node: FnNode, env: Readonly<Record<string, number>> = {}): number | null {
  switch (node.k) {
    case 'num':
      return node.v;
    case 'var': {
      const v = env[node.name];
      return typeof v === 'number' && Number.isFinite(v) ? v : null;
    }
    case 'const':
      return node.name === 'π' ? Math.PI : Math.E;
    case 'neg': {
      const a = evalFn(node.a, env);
      return a === null ? null : -a;
    }
    case 'deg': {
      const a = evalFn(node.a, env);
      return a === null ? null : (a * Math.PI) / 180;
    }
    case 'call': {
      const a = evalFn(node.a, env);
      return a === null ? null : FUNCTIONS[node.fn].eval(a);
    }
    case 'bin': {
      const a = evalFn(node.a, env);
      const b = evalFn(node.b, env);
      if (a === null || b === null) return null;
      switch (node.op) {
        case '+': return finite(a + b);
        case '-': return finite(a - b);
        case '*': return finite(a * b);
        case '/': return b === 0 ? null : finite(a / b);
        case '^': return powNumbers(a, b);
      }
    }
  }
}

// ===== Characters =====

const SUPERSCRIPT_DIGITS = '⁰¹²³⁴⁵⁶⁷⁸⁹';
const SUBSCRIPT_DIGITS = '₀₁₂₃₄₅₆₇₈₉';
const VULGAR: Record<string, number> = {
  '½': 1 / 2, '⅓': 1 / 3, '⅔': 2 / 3, '¼': 1 / 4, '¾': 3 / 4, '⅕': 1 / 5, '⅖': 2 / 5, '⅗': 3 / 5, '⅘': 4 / 5,
  '⅙': 1 / 6, '⅚': 5 / 6, '⅛': 1 / 8, '⅜': 3 / 8, '⅝': 5 / 8, '⅞': 7 / 8,
};
const MINUS = '-–—−‐‑‒';
const TIMES = '×*·⋅✕✖';
const DIVIDES = '÷/⁄';
const OPEN = '([{';
const CLOSE = ')]}';
/** Latin, accented Latin and Greek letters; π is its own token. */
const LETTER = /[A-Za-zÀ-ɏͰ-Ͽ]/;
const PI_CHAR = 'π';

/** A superscript run (`²`, `⁻¹`, `¹⁰`) as the text of its exponent, or null if it is not one. */
export function fromSuperscript(s: string): string | null {
  let out = '';
  for (const c of s) {
    const d = SUPERSCRIPT_DIGITS.indexOf(c);
    if (d >= 0) out += String(d);
    else if (c === '⁻') out += '-';
    else if (c === '⁺') out += '+';
    else if (c === 'ⁿ') out += 'n';
    else return null;
  }
  return out;
}

/** An integer as superscript digits, or null when it is too wide to read as one. */
export function toSuperscript(n: number): string | null {
  if (!Number.isInteger(n) || Math.abs(n) > 99) return null;
  return (n < 0 ? '⁻' : '') + String(Math.abs(n)).replace(/\d/g, (d) => SUPERSCRIPT_DIGITS[Number(d)]);
}

const isSuperChar = (c: string | undefined) => c !== undefined && (SUPERSCRIPT_DIGITS.includes(c) || c === '⁻' || c === '⁺' || c === 'ⁿ');
const isDigit = (c: string | undefined) => c !== undefined && c >= '0' && c <= '9';

// ===== Tokens =====

interface Pos {
  at: number;
  end: number;
  /** Spaces before this token: 0 is glued to the one before it. */
  space: number;
}

type Tok =
  | (Pos & { t: 'num'; v: number; text: string })
  | (Pos & { t: 'var'; name: string })
  | (Pos & { t: 'const'; name: 'π' | 'e' })
  | (Pos & { t: 'fn'; fn: FnName; text: string })
  | (Pos & { t: 'op'; ch: '+' | '-' | '*' | '/' | '^' })
  | (Pos & { t: 'lp' })
  | (Pos & { t: 'rp' })
  | (Pos & { t: 'bar' })
  | (Pos & { t: 'deg' })
  | (Pos & { t: 'sup'; text: string })
  | (Pos & { t: 'eq' })
  | (Pos & { t: 'junk'; text: string });

export interface FnOptions {
  /** Names that are variables whatever else they might mean — `e`, when a function is of e. */
  variables?: readonly string[];
}

class Refusal extends Error {}

const refuse = (reason: string): never => {
  throw new Refusal(reason);
};

function tokenize(s: string, options: FnOptions): Tok[] {
  const out: Tok[] = [];
  const names = new Set(options.variables ?? []);
  let i = 0;
  let space = 0;
  const sp = () => {
    const v = space;
    space = 0;
    return v;
  };
  while (i < s.length) {
    const c = s[i];
    if (c === ' ' || c === ',' || c === ';') { space += 1; i++; continue; }
    if (c === '\t' || c === '\n' || c === '\r') { space += 4; i++; continue; }
    if (isDigit(c) || (c === '.' && isDigit(s[i + 1])) || c in VULGAR) {
      let j = i;
      let v = 0;
      if (c in VULGAR) {
        v = VULGAR[c];
        j++;
      } else {
        while (isDigit(s[j])) j++;
        if (s[j] === '.' && isDigit(s[j + 1])) {
          j++;
          while (isDigit(s[j])) j++;
        }
        v = Number(s.slice(i, j));
        // 1½ — a whole number and a vulgar fraction glued
        if (s[j] in VULGAR) {
          v += VULGAR[s[j]];
          j++;
        }
      }
      out.push({ t: 'num', v, text: s.slice(i, j), at: i, end: j, space: sp() });
      i = j;
      continue;
    }
    if (isSuperChar(c)) {
      let j = i;
      while (isSuperChar(s[j])) j++;
      out.push({ t: 'sup', text: s.slice(i, j), at: i, end: j, space: sp() });
      i = j;
      continue;
    }
    if (c === '+' || c === '＋') { out.push({ t: 'op', ch: '+', at: i, end: i + 1, space: sp() }); i++; continue; }
    if (MINUS.includes(c)) { out.push({ t: 'op', ch: '-', at: i, end: i + 1, space: sp() }); i++; continue; }
    if (c === '*' && s[i + 1] === '*') { out.push({ t: 'op', ch: '^', at: i, end: i + 2, space: sp() }); i += 2; continue; } // x**2, as a programmer writes it
    if (TIMES.includes(c)) { out.push({ t: 'op', ch: '*', at: i, end: i + 1, space: sp() }); i++; continue; }
    if (DIVIDES.includes(c)) { out.push({ t: 'op', ch: '/', at: i, end: i + 1, space: sp() }); i++; continue; }
    if (c === '^') { out.push({ t: 'op', ch: '^', at: i, end: i + 1, space: sp() }); i++; continue; }
    if (OPEN.includes(c)) { out.push({ t: 'lp', at: i, end: i + 1, space: sp() }); i++; continue; }
    if (CLOSE.includes(c)) { out.push({ t: 'rp', at: i, end: i + 1, space: sp() }); i++; continue; }
    if (c === '|') { out.push({ t: 'bar', at: i, end: i + 1, space: sp() }); i++; continue; }
    if (c === '°' || c === 'º' || c === '˚') { out.push({ t: 'deg', at: i, end: i + 1, space: sp() }); i++; continue; }
    if (c === '√') { out.push({ t: 'fn', fn: 'sqrt', text: '√', at: i, end: i + 1, space: sp() }); i++; continue; }
    if (c === '=' || c === '＝') { out.push({ t: 'eq', at: i, end: i + 1, space: sp() }); i++; continue; }
    if (c === PI_CHAR) { out.push({ t: 'const', name: 'π', at: i, end: i + 1, space: sp() }); i++; continue; }
    if (LETTER.test(c)) {
      let j = i + 1;
      while (j < s.length && LETTER.test(s[j]) && s[j] !== PI_CHAR) j++;
      const word = s.slice(i, j);
      // A subscript on the last letter makes it another name: x₁, x_1, x_a.
      let sub = '';
      if (SUBSCRIPT_DIGITS.includes(s[j] ?? ' ')) {
        while (SUBSCRIPT_DIGITS.includes(s[j] ?? ' ')) sub += String(SUBSCRIPT_DIGITS.indexOf(s[j++]));
      } else if (s[j] === '_' && isDigit(s[j + 1])) {
        j++;
        while (isDigit(s[j])) sub += s[j++];
      } else if (s[j] === '_' && LETTER.test(s[j + 1] ?? '') && s[j + 1] !== PI_CHAR) {
        sub = s[j + 1];
        j += 2;
      }
      pushWord(out, word, sub, i, j, sp(), names, s);
      i = j;
      continue;
    }
    out.push({ t: 'junk', text: c, at: i, end: i + 1, space: sp() });
    i++;
  }
  return out;
}

/** The longest run of letters that is still read as a product of letters, the way `xy` is. */
const MOST_LETTERS = 3;

/**
 * A run of letters as the pieces it is: a function where it spells one (sinx is sin
 * and x), π for pi, e for Euler's number, and every other letter a variable of its
 * own. A longer run that spells nothing is refused — Radius is not R·a·d·i·u·s — and
 * so is a run straight into a bracket (foo(x) is not f·o·o·x).
 */
function pushWord(out: Tok[], word: string, sub: string, at: number, end: number, space: number, names: ReadonlySet<string>, src: string): void {
  const whole = sub ? null : functionNamed(word);
  if (whole && !names.has(word)) {
    out.push({ t: 'fn', fn: whole, text: word, at, end, space });
    return;
  }
  if (!sub && /^pi$/i.test(word) && !names.has(word)) {
    out.push({ t: 'const', name: 'π', at, end, space });
    return;
  }
  const pieces: Tok[] = [];
  let i = 0;
  let sawWord = false;
  while (i < word.length) {
    const rest = word.slice(i);
    const from = at + i;
    const lead = i === 0 ? space : 0;
    const fnWord = FN_WORDS.find(([k]) => rest.startsWith(k) && !names.has(k));
    if (fnWord) {
      pieces.push({ t: 'fn', fn: fnWord[1], text: fnWord[0], at: from, end: from + fnWord[0].length, space: lead });
      i += fnWord[0].length;
      sawWord = true;
      continue;
    }
    if (word.length <= MOST_LETTERS && rest.startsWith('pi') && !sub && !names.has('p') && !names.has('pi')) {
      pieces.push({ t: 'const', name: 'π', at: from, end: from + 2, space: lead });
      i += 2;
      sawWord = true;
      continue;
    }
    const last = i === word.length - 1;
    const letter = rest[0];
    if (letter === 'e' && !(last && sub) && !names.has('e')) pieces.push({ t: 'const', name: 'e', at: from, end: from + 1, space: lead });
    else pieces.push({ t: 'var', name: last && sub ? `${letter}_${sub}` : letter, at: from, end: from + 1, space: lead });
    i += 1;
  }
  if (!sawWord && word.length > MOST_LETTERS) {
    refuse(`cannot read “${word}” — it is not a function I know (${FUNCTION_NAMES}), and a name of several letters is not a product of them; write single letters, where xy means x times y`);
  }
  const next = src[end];
  if (!sawWord && !sub && word.length >= 2 && next !== undefined && OPEN.includes(next)) {
    refuse(`“${word}(…)” is not a function I know (${FUNCTION_NAMES}); to multiply, write ${word.split('').join(' × ')} × (…)`);
  }
  out.push(...pieces);
}

// ===== The parser =====

/** Tokens a factor starts with, when a factor has just ended: the implicit product. */
const startsFactor = (t: Tok | undefined, barDepth: number): boolean =>
  !!t && (t.t === 'var' || t.t === 'const' || t.t === 'fn' || t.t === 'lp' || (t.t === 'bar' && barDepth === 0));

class Parser {
  private p = 0;
  private bars = 0;
  constructor(private readonly toks: Tok[], private readonly src: string) {}

  private get tok(): Tok | undefined {
    return this.toks[this.p];
  }

  private text(from: Tok, to: Tok): string {
    return this.src.slice(from.at, to.end).trim();
  }

  parse(): FnNode {
    const e = this.sum();
    const t = this.tok;
    if (t) {
      if (t.t === 'rp') refuse('a closing bracket has no opening one');
      if (t.t === 'eq') refuse('an equals sign inside a formula makes it an equation, not a function');
      refuse(`cannot read “${this.src.slice(t.at).trim()}”`);
    }
    return e;
  }

  private sum(): FnNode {
    let a = this.product();
    for (;;) {
      const t = this.tok;
      if (t?.t === 'op' && (t.ch === '+' || t.ch === '-')) {
        this.p++;
        a = bin(t.ch, a, this.product());
      } else return a;
    }
  }

  private product(): FnNode {
    const startAt = this.tok?.at ?? 0;
    let a = this.unary();
    for (;;) {
      const t = this.tok;
      if (t?.t === 'op' && (t.ch === '*' || t.ch === '/')) {
        this.p++;
        a = bin(t.ch, a, this.unary());
        if (t.ch === '/' && startsFactor(this.tok, this.bars)) {
          // a/bc — (a/b)c to one reader, a/(bc) to another. Say both, and read neither.
          const numText = this.src.slice(startAt, t.at).trim();
          const denText = this.src.slice(t.end, this.toks[this.p - 1].end).trim();
          const from = this.tok!.at;
          while (startsFactor(this.tok, this.bars)) this.unary();
          const restText = this.src.slice(from, this.toks[this.p - 1].end).trim();
          return refuse(`“${this.src.slice(startAt, this.toks[this.p - 1].end).trim()}” is ambiguous — write (${numText}/${denText})${restText} or ${numText}/(${denText}${restText})`);
        }
        continue;
      }
      if (startsFactor(t, this.bars)) {
        a = bin('*', a, this.unary());
        continue;
      }
      if (t?.t === 'num') {
        const before = this.toks[this.p - 1];
        const whole = this.text(before, t);
        if (before.t === 'num' || before.t === 'deg') {
          return refuse(`“${whole}” is two numbers side by side — write the operator between them`);
        }
        const what = before.t === 'var' ? before.name : before.t === 'const' ? before.name : 'the bracket';
        return refuse(`“${whole}” could be a power or a product — write ${what}² or ${what} × ${t.text}, with the number where you mean it`);
      }
      return a;
    }
  }

  private unary(): FnNode {
    const t = this.tok;
    if (t?.t === 'op' && (t.ch === '-' || t.ch === '+')) {
      this.p++;
      const a = this.unary();
      return t.ch === '-' ? { k: 'neg', a } : a;
    }
    return this.power();
  }

  private power(): FnNode {
    const base = this.postfix();
    const t = this.tok;
    if (t?.t === 'op' && t.ch === '^') {
      this.p++;
      return bin('^', base, this.unary());
    }
    return base;
  }

  private postfix(): FnNode {
    let a = this.primary();
    for (;;) {
      const t = this.tok;
      if (t?.t === 'deg') {
        this.p++;
        a = { k: 'deg', a };
      } else if (t?.t === 'sup') {
        this.p++;
        a = bin('^', a, this.superscript(t));
      } else return a;
    }
  }

  /** The exponent a run of superscripts spells. */
  private superscript(t: Extract<Tok, { t: 'sup' }>): FnNode {
    const s = fromSuperscript(t.text);
    if (s === null) return refuse(`cannot read the superscript “${t.text}”`);
    if (s === 'n') return variable('n');
    const m = /^([+-]?)(\d+)$/.exec(s);
    if (!m) return refuse(`cannot read the superscript “${t.text}”`);
    const v = num(Number(m[2]));
    return m[1] === '-' ? { k: 'neg', a: v } : v;
  }

  private primary(): FnNode {
    const t = this.tok;
    if (!t) return refuse('cannot read it — it ends where a number or a letter should be');
    switch (t.t) {
      case 'num':
        this.p++;
        return num(t.v);
      case 'var':
        this.p++;
        return variable(t.name);
      case 'const':
        this.p++;
        return { k: 'const', name: t.name };
      case 'lp': {
        this.p++;
        const e = this.sum();
        if (this.tok?.t !== 'rp') refuse('a bracket is never closed');
        this.p++;
        return e;
      }
      case 'bar': {
        this.p++;
        this.bars++;
        const e = this.sum();
        this.bars--;
        if (this.tok?.t !== 'bar') refuse('a bar | is never closed');
        this.p++;
        return { k: 'call', fn: 'abs', a: e };
      }
      case 'fn':
        return this.call();
      case 'op':
        return refuse(`cannot read “${this.src.slice(t.at).trim()}” — an operator with nothing before it`);
      case 'rp':
        return refuse('a closing bracket has no opening one');
      case 'eq':
        return refuse('an equals sign inside a formula makes it an equation, not a function');
      case 'junk':
        return refuse(`cannot read “${t.text}”`);
      default:
        return refuse(`cannot read “${this.src.slice(t.at).trim()}”`);
    }
  }

  /** `sin(x)`, `sin x`, `sin 2x`, `sin²x`, `sin⁻¹ x`, `√x`, `√(x + 1)`. */
  private call(): FnNode {
    const t = this.tok as Extract<Tok, { t: 'fn' }>;
    this.p++;
    let fn = t.fn;
    let outer: FnNode | null = null;
    // A power written on the function itself: sin²x is (sin x)², and sin⁻¹ is the arc sine.
    const n = this.tok;
    if (t.text !== '√' && (n?.t === 'sup' || (n?.t === 'op' && n.ch === '^'))) {
      this.p++;
      const e = n.t === 'sup' ? this.superscript(n) : this.unary();
      const minusOne = e.k === 'neg' && e.a.k === 'num' && e.a.v === 1;
      if (minusOne) {
        const inv = INVERSE_OF[fn];
        if (!inv) refuse(`${t.text}⁻¹ is ambiguous here — write 1/${t.text}(…) for a reciprocal`);
        else fn = inv;
      } else outer = e;
    }
    const open = this.tok;
    let arg: FnNode;
    if (open?.t === 'lp') {
      this.p++;
      arg = this.sum();
      if (this.tok?.t !== 'rp') refuse('a bracket is never closed');
      this.p++;
    } else {
      arg = this.tight(t);
    }
    const call: FnNode = { k: 'call', fn, a: arg };
    return outer ? bin('^', call, outer) : call;
  }

  /** The bracketless argument: one factor with its power and its degree sign, and for a named function the letters and numbers glued on (sin 2x). */
  private tight(t: Extract<Tok, { t: 'fn' }>): FnNode {
    const first = this.tok;
    if (!first) return refuse(`${t.text} has nothing after it`);
    if (first.t === 'op' && (first.ch === '-' || first.ch === '+')) {
      this.p++;
      const a = this.tight(t);
      return first.ch === '-' ? { k: 'neg', a } : a;
    }
    if (first.t !== 'num' && first.t !== 'var' && first.t !== 'const' && first.t !== 'lp' && first.t !== 'bar' && first.t !== 'fn') {
      return refuse(`${t.text} has nothing it can take after it`);
    }
    let a = this.power();
    const glued = (x: Tok | undefined) => !!x && x.space === 0 && (x.t === 'var' || x.t === 'const' || x.t === 'lp');
    if (glued(this.tok)) {
      if (t.text === '√') {
        const firstText = this.src.slice(first.at, this.toks[this.p - 1].end).trim();
        const from = this.tok!.at;
        while (glued(this.tok)) this.power();
        const restText = this.src.slice(from, this.toks[this.p - 1].end).trim();
        refuse(`“√${firstText}${restText}” is ambiguous — write √(${firstText}${restText}) for the root of all of it, or (√${firstText})${restText} for the root of the first`);
      }
      while (glued(this.tok)) a = bin('*', a, this.power());
    }
    return a;
  }
}

export type FnParse = { ok: true; node: FnNode } | { ok: false; reason: string };

/** A formula as a tree, or the reason it cannot be read. Nothing is thrown. */
export function parseFn(text: string, options: FnOptions = {}): FnParse {
  // a full stop or a comma at the end of a line of writing is punctuation, not a decimal point with nothing after it
  const s = text.replace(/\s+/g, ' ').replace(/[.,;:\s]+$/, '').trim();
  if (!s) return { ok: false, reason: 'there is nothing to read' };
  try {
    const toks = tokenize(s, options);
    if (!toks.length) return { ok: false, reason: 'there is nothing to read' };
    return { ok: true, node: new Parser(toks, s).parse() };
  } catch (e) {
    if (e instanceof Refusal) return { ok: false, reason: e.message };
    throw e;
  }
}

// ===== The printer =====

const PREC = { add: 50, mul: 60, neg: 70, pow: 80, call: 90, deg: 95, atom: 100 } as const;

/** A number as people read it: whole, or up to twelve significant figures with the zeros trimmed. */
export function fmtNumber(v: number): string {
  if (Number.isInteger(v) && Math.abs(v) < 1e15) return String(v);
  const s = String(Number(v.toPrecision(12)));
  if (!/e/i.test(s)) return s;
  return v.toFixed(12).replace(/\.?0+$/, '');
}

function precOf(n: FnNode): number {
  switch (n.k) {
    case 'num':
    case 'var':
    case 'const':
      return PREC.atom;
    case 'deg':
      return PREC.deg;
    case 'call':
      return PREC.call;
    case 'neg':
      return PREC.neg;
    case 'bin':
      return n.op === '^' ? PREC.pow : n.op === '+' || n.op === '-' ? PREC.add : PREC.mul;
  }
}

const isAtom = (n: FnNode) => n.k === 'num' || n.k === 'var' || n.k === 'const';
const startsWithDigit = (s: string) => /^[\d.]/.test(s);

/** The letters (π apart) a text ends with, and begins with. */
const LETTERS = 'A-Za-zÀ-ɏͰ-ορ-Ͽ';
const tailLetters = (s: string) => new RegExp(`[${LETTERS}]+$`).exec(s)?.[0] ?? '';
const headLetters = (s: string) => new RegExp(`^[${LETTERS}]+`).exec(s)?.[0] ?? '';
const SPELLS_A_WORD = new RegExp(`ln|pi|${Object.keys(FUNCTIONS).join('|')}|arcsin|arccos|arctan`);

/**
 * Two factors side by side, so that they read back as two factors: a root with a bare
 * argument takes its brackets (√(2)x, not √2x), and letters that would run together into a
 * word the grammar reads otherwise — more than three, or spelling sin, ln, pi — or a word
 * straight into a bracket, are kept apart by a space.
 */
function juxtapose(l: string, r: string): string {
  const guarded = l.replace(new RegExp(`√([\\dA-Za-z.πe]+)$`), '√($1)');
  const trail = tailLetters(guarded), head = headLetters(r);
  const run = trail + head;
  const apart = (trail && head && (run.length > MOST_LETTERS || SPELLS_A_WORD.test(run))) || (trail.length >= 2 && r.startsWith('('));
  return apart ? `${guarded} ${r}` : `${guarded}${r}`;
}

/** The tree as it reads: brackets only where they mean something, `−` for minus, `x²` for a small power, `2x` for a product. */
export function formatFn(node: FnNode): string {
  const P = (n: FnNode, min: number): string => (precOf(n) < min ? `(${formatFn(n)})` : formatFn(n));
  switch (node.k) {
    case 'num':
      return fmtNumber(node.v);
    case 'var':
      return node.name.replace(/_(\d+)$/, (_m, d: string) => d.replace(/\d/g, (x) => SUBSCRIPT_DIGITS[Number(x)]));
    case 'const':
      return node.name;
    case 'deg':
      return `${P(node.a, PREC.atom)}°`;
    case 'neg':
      return `−${P(node.a, PREC.neg + 1)}`;
    case 'call': {
      if (node.fn === 'sqrt') return isAtom(node.a) ? `√${formatFn(node.a)}` : `√(${formatFn(node.a)})`;
      return `${node.fn}(${formatFn(node.a)})`;
    }
    case 'bin': {
      switch (node.op) {
        case '+':
          return `${P(node.a, PREC.add)} + ${P(node.b, PREC.add + 1)}`;
        case '-':
          return `${P(node.a, PREC.add)} − ${P(node.b, PREC.add + 1)}`;
        case '/': {
          const den = node.b.k === 'neg' ? `(${formatFn(node.b)})` : P(node.b, PREC.mul + 1);
          return `${P(node.a, PREC.mul)}/${den}`;
        }
        case '*': {
          const l = P(node.a, PREC.mul);
          const r = P(node.b, PREC.mul + 1);
          // Juxtaposition when it reads back as the same product: not after a ratio, not before a number or a minus.
          const lDiv = node.a.k === 'bin' && node.a.op === '/';
          const rStart = !startsWithDigit(r) && !r.startsWith('−') && node.b.k !== 'num';
          return !lDiv && rStart ? juxtapose(l, r) : `${l} × ${r}`;
        }
        case '^': {
          const base = node.a.k === 'call' && node.a.fn === 'sqrt' ? `(${formatFn(node.a)})` : P(node.a, PREC.pow + 1);
          const e = node.b;
          if (e.k === 'num') {
            const sup = Number.isInteger(e.v) && e.v >= 2 ? toSuperscript(e.v) : null;
            return sup ? `${base}${sup}` : `${base}^${fmtNumber(e.v)}`;
          }
          if (e.k === 'neg' && e.a.k === 'num' && Number.isInteger(e.a.v)) {
            const sup = toSuperscript(-e.a.v);
            return sup ? `${base}${sup}` : `${base}^(−${fmtNumber(e.a.v)})`;
          }
          return `${base}^${isAtom(e) ? formatFn(e) : `(${formatFn(e)})`}`;
        }
      }
    }
  }
}

// ===== compileFunction — the contract C calls (compile.ts) =====

/** A compiled function and what the caller may want to know of it beyond the contract. */
export type CompiledFn = Extract<CompiledFunction, { ok: true }> & {
  /** The variable it is a function of. */
  variable: string;
  /** Names it uses that are neither the variable nor given: it answers null until they are. */
  unbound: string[];
  /** The tree. */
  node: FnNode;
};

const LHS = /^\s*([A-Za-zÀ-ɏͰ-Ͽ][A-Za-z0-9_₀-₉]*)\s*(?:\(\s*([A-Za-zÀ-ɏͰ-Ͽ][A-Za-z0-9_₀-₉]*)\s*\))?\s*$/;

/** The text with its left side taken off: `y = …` and `f(x) = …`. The name the left side declared as the variable, if any. */
function splitLeft(text: string, variable: string | undefined): { rhs: string; declared?: string } | { reason: string } {
  const parts = text.split(/[=＝]/);
  if (parts.length === 1) return { rhs: text };
  if (parts.length > 2) return { reason: 'more than one equals sign — it is a chain, not one function' };
  const [lhs, rhs] = parts;
  const m = LHS.exec(lhs);
  if (!m) return { reason: `“${lhs.trim()} = …” is an equation, not a function: write y = … with y alone on the left` };
  const [, name, declared] = m;
  if (!declared && name === (variable ?? 'x')) return { reason: `“${name} = …” sets ${name}, it is not a function of ${name}` };
  return { rhs, ...(declared ? { declared } : {}) };
}

/**
 * A text as a function of one variable, or the reason it cannot be one. `variable`
 * is the one the function is of (`x` when none is said, else the one `f(t) =` names);
 * `given` puts numbers in for the other names it uses (`{ g: 9.81 }`). The function
 * answers null where it is undefined, or where a name has no number yet — the
 * result says which names those are in `unbound`.
 */
export function compileFunction(text: string, variable?: string, given: Readonly<Record<string, number>> = {}): CompiledFn | { ok: false; reason: string } {
  const left = splitLeft(text.trim(), variable);
  if ('reason' in left) return { ok: false, reason: left.reason };
  const v = variable ?? left.declared ?? 'x';
  const parsed = parseFn(left.rhs, { variables: [v] });
  if (!parsed.ok) return { ok: false, reason: parsed.reason };
  const node = parsed.node;
  const variables = freeVariables(node);
  const env: Record<string, number> = { ...given };
  const f = (x: number): number | null => {
    env[v] = x;
    return evalFn(node, env);
  };
  const unbound = variables.filter((n) => n !== v && !(n in given));
  return { ok: true, f, variables, text: formatFn(node), variable: v, unbound, node };
}
