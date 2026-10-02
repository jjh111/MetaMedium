// The sheet — a page of lines read as definitions, steps and checks
// (MATHS-PLAN.md §4; DIRECTOR-PLAN-W2 M2).
//
// A pattern page is a table of measurements (`A. Bust 36`), a heading or two
// (`Add seam allowance`), and numbered steps worked by hand (`1. A ÷ 3 = 12 +
// 2 = 14`). The sheet reads plain lines — strings in reading order, with
// where they stand if the caller knows — and says what each one is:
//
//   - a DEFINITION, found by its letter and by its name, in the unit the page
//     writes when it wrote none;
//   - a STEP, worked in dependency order, every written result checked, and
//     every reading kept (M1's chains), ranked by the arithmetic;
//   - a HEADING, kept as context for the lines under it. A heading that says
//     to add something — `Add seam allowance` — is an ALLOWANCE: its amount is
//     what the steps under it add (steps 1 and 3 add 2), and a step under it
//     that does not add it itself is read both ways, from the measurements
//     and with the allowance on every measurement it names. That is how
//     `4. C 48` checks (46 + 2), and how `(C × 2) − B` is 72 or 74;
//   - a LABEL — a step's number written on the drawing with a value
//     (`1. 15″`), which is not a new step but a reference to one, checked;
//   - a VALUE on its own (the brace's `72–74″`), matched to the steps it
//     agrees with; a CHECK (arithmetic with no label); a WORKED line on a line
//     of its own, which belongs to the step above it; or a NOTE saying why a
//     line could not be read.
//
// A cycle, an unknown name or a missing step is a reading that says so, never
// a throw. And the sheet is a pure function of its lines: nothing here writes
// anything, so changing one definition re-derives every step that depends on
// it and nothing else (`diffSheets`), and undo is the lines as they were.

import type { Bounds, Point } from '../types';
import type { ChainReading, Expr, ExprChain, LineParse, MathsScope, NameResolution } from './expr';
import { evaluateChain, normName, parseChain, parseLine } from './expr';
import type { CheckStatus, LengthUnit, Quantity } from './quantity';
import { arithmetic, compareQuantities, formatQuantity, isBare, isRange, parseQuantity, unitSuffix } from './quantity';

export type SheetLineInput =
  | string
  | {
      text: string;
      at?: Point;
      bounds?: Bounds;
      ids?: readonly string[];
      /** Typed as a sum (`= Waist ÷ 2`): read as maths whatever its words, so what it lacks is said. */
      maths?: boolean;
    };

export interface SheetOptions {
  /** The unit a bare measurement takes. Unset: the unit the page writes most. Null: none — numbers stay bare. */
  unit?: LengthUnit | null;
}

interface EntryBase {
  /** Which input line this is, counting from 0. */
  line: number;
  text: string;
  at?: Point;
  bounds?: Bounds;
  ids?: string[];
  /** The line of the heading this line sits under. */
  under?: number;
  /** What the line was read as, and why — for people. */
  reason: string;
}

export interface DefinitionEntry extends EntryBase {
  kind: 'definition';
  /** The letter when there is one, else the name. */
  key: string;
  letter?: string;
  name?: string;
  value: Quantity | null;
  /** A second definition of the same letter or name: it is not used, and this says so. */
  conflict?: string;
}

export interface StepEntry extends EntryBase {
  kind: 'step';
  /** The step's number as a string, or its letter for a lettered formula. */
  key: string;
  n: number | null;
  letter?: string;
  /** The first reading's formula. */
  formula: string;
  /** The first reading's value — what another step referring to this one takes. */
  value: Quantity | null;
  /** Every reading, ranked; nothing dropped. */
  readings: ChainReading[];
  /** The keys of the definitions and steps its readings read. */
  uses: string[];
  /** The line of its worked line, when that stood on a line of its own. */
  worked?: number;
  conflict?: string;
}

/** An amount a heading says to add, and the reading it makes: "with seam allowance". */
export interface Allowance {
  amount: Quantity;
  label: string;
  /** The steps it was read from: the ones that add it themselves. Empty when the heading states it. */
  from: string[];
  reason: string;
}

export interface HeadingEntry extends EntryBase {
  kind: 'heading';
  title: string;
  allowance?: Allowance;
}

export interface CheckEntry extends EntryBase {
  kind: 'check';
  value: Quantity | null;
  readings: ChainReading[];
}

export interface WorkedEntry extends EntryBase {
  kind: 'worked';
  step: string;
}

/** How a written number stands against a step — `spans` when a written range runs from one reading to another. */
export type StepCheckStatus = CheckStatus | 'spans';

export interface StepCheck {
  step: string;
  written: Quantity;
  status: StepCheckStatus;
  readings: { index: number; status: CheckStatus; value: Quantity | null }[];
  reason: string;
}

export interface LabelEntry extends EntryBase {
  kind: 'label';
  step: string;
  written: Quantity;
  check: StepCheck | null;
}

export interface ValueEntry extends EntryBase {
  kind: 'value';
  written: Quantity;
  /** The steps this number agrees with, and how. */
  matches: StepCheck[];
}

export interface NoteEntry extends EntryBase {
  kind: 'note';
}

export type SheetEntry =
  | DefinitionEntry
  | StepEntry
  | HeadingEntry
  | CheckEntry
  | WorkedEntry
  | LabelEntry
  | ValueEntry
  | NoteEntry;

export interface Sheet {
  /** One entry per input line, in the order given. */
  entries: SheetEntry[];
  unit: LengthUnit | null;
  unitReason: string;
}

// ===== Reading =====

interface Source {
  text: string;
  at?: Point;
  bounds?: Bounds;
  ids?: string[];
  maths?: boolean;
}

interface Draft {
  line: number;
  src: Source;
  parse: LineParse;
  kind: SheetEntry['kind'];
  key?: string;
  n?: number | null;
  letter?: string;
  name?: string;
  value?: Quantity | null;
  chain?: ExprChain;
  under?: number;
  conflict?: string;
  step?: string;
  written?: Quantity;
  workedLine?: number;
  title?: string;
  amount?: Quantity;
  note?: string;
}

const fmt = (q: Quantity | null | undefined) => (q ? formatQuantity(q) : 'no value');
const ADDS = /^\s*(add|plus)\b/i;

function unitsWritten(p: LineParse): LengthUnit[] {
  const out: LengthUnit[] = [];
  const walk = (e: Expr) => {
    if (e.k === 'num') {
      if (e.q.unit && e.q.dim === 1) out.push(e.q.unit);
    } else if (e.k === 'op') {
      walk(e.a);
      walk(e.b);
    } else if (e.k === 'neg' || e.k === 'carry') walk(e.a);
  };
  for (const seg of p.chain.segments) if (seg.readings[0]) walk(seg.readings[0].expr);
  return out;
}

const UNIT_NAMES: Record<LengthUnit, string> = { in: 'inches', ft: 'feet', cm: 'centimetres', mm: 'millimetres', m: 'metres' };

function inferUnit(parses: LineParse[]): { unit: LengthUnit | null; reason: string } {
  const lines = new Map<LengthUnit, number>();
  for (const p of parses) for (const u of new Set(unitsWritten(p))) lines.set(u, (lines.get(u) ?? 0) + 1);
  if (!lines.size) return { unit: null, reason: 'no unit is written here, so the numbers stay bare' };
  let best: LengthUnit | null = null;
  for (const [u, n] of lines) if (!best || n > lines.get(best)!) best = u;
  const n = lines.get(best!)!;
  const others = [...lines.keys()].filter((u) => u !== best);
  return {
    unit: best,
    reason: `${UNIT_NAMES[best!]} (${unitSuffix(best, 1).trim()}), the unit written on ${n} line${n === 1 ? '' : 's'}; a bare measurement here is in ${UNIT_NAMES[best!]}${others.length ? ` (also written: ${others.join(', ')})` : ''}`,
  };
}

/** `Add 2″ seam allowance`, `Add seam allowance 2` — a heading that states its amount. */
function headingAmount(p: LineParse): Quantity | undefined {
  if (!ADDS.test(p.body)) return undefined;
  const kinds = p.chain.segments.map((g) => {
    const e = g.readings[0]?.expr;
    return !e ? 'x' : e.k === 'name' ? 'name' : e.k === 'num' ? 'num' : 'x';
  });
  if (kinds.includes('x') || kinds.filter((k) => k === 'num').length !== 1) return undefined;
  const g = p.chain.segments[kinds.indexOf('num')];
  const e = g.readings[0].expr;
  return e.k === 'num' ? e.q : undefined;
}

function headingWords(p: LineParse): string {
  const names = p.chain.segments.map((g) => g.readings[0]?.expr).filter((e): e is Extract<Expr, { k: 'name' }> => e?.k === 'name').map((e) => e.name);
  return (names.length ? names.join(' ') : p.body).replace(/^\s*(add|plus)\s*/i, '').trim();
}

function classify(src: Source, line: number): Draft {
  const parse = parseLine(src.text);
  const d: Draft = { line, src, parse, kind: 'note' };
  const L = parse.label;
  const unreadable = () => (parse.shape === 'empty' ? `${L ? `${L.text} with nothing after it` : 'an empty line'}` : `cannot read “${parse.body}”`);
  if (L?.kind === 'letter') {
    if (parse.shape === 'definition') return { ...d, kind: 'definition', key: L.letter, letter: L.letter, name: parse.name, value: parse.value };
    if (parse.shape === 'value') return { ...d, kind: 'definition', key: L.letter, letter: L.letter, value: parse.value };
    if (parse.shape === 'heading') return { ...d, kind: 'definition', key: L.letter, letter: L.letter, name: parse.body, value: null };
    if (parse.shape === 'formula') return { ...d, kind: 'step', key: L.letter, letter: L.letter, n: null, chain: parse.chain };
    return { ...d, note: unreadable() };
  }
  if (L?.kind === 'step') {
    if (parse.shape === 'value') return { ...d, kind: 'label', key: String(L.n), n: L.n, step: String(L.n), written: parse.value, chain: parse.chain };
    if (parse.shape === 'formula' || parse.shape === 'definition' || parse.shape === 'heading') return { ...d, kind: 'step', key: String(L.n), n: L.n, chain: parse.chain };
    return { ...d, note: unreadable() };
  }
  const amount = headingAmount(parse);
  if (amount) return { ...d, kind: 'heading', title: parse.body, amount };
  if (parse.shape === 'heading') return { ...d, kind: 'heading', title: parse.body };
  if (parse.shape === 'definition') return { ...d, kind: 'definition', key: parse.name!, name: parse.name, value: parse.value };
  if (parse.shape === 'value') return { ...d, kind: 'value', written: parse.value };
  if (parse.shape === 'formula') return { ...d, kind: 'check', chain: parse.chain };
  return { ...d, note: unreadable() };
}

// ===== Prose is not maths (F2) =====
//
// The grammar reads a colon as `=` and a dash as a minus, and any run of words as a name, so an ordinary note —
// `Draw a box: then an arrow - and it reads` — parses as a check whose operands are words, and stood a `?` at
// rest, a problem, on a page that was only writing. A line counts as maths only when it looks like it:
//
//   - no operator has two words for its operands — words joined by a dash or a colon are a sentence;
//   - a line with no label (a letter or a step's number) says nothing of itself, so it needs an operator and
//     every name in it defined on the page: the line is maths because of what it is made of;
//   - a labelled line is the person's own word that this is a step, so a name the page lacks is a problem worth
//     saying (`1. Waist ÷ 4`), as long as it has an operator, or is only names the page defines (`4. C 48`);
//   - a line typed as a sum (`maths: true`) is read whatever it says.
//
// A line that fails is a note, said in words, and stays out of the steps, the checks and every chip.

/** The names a page defines: each definition's letter and name, and a lettered formula's letter. */
function definedNames(drafts: readonly Draft[]): Set<string> {
  const out = new Set<string>();
  for (const d of drafts) {
    if (d.kind === 'definition') {
      for (const k of [d.letter, d.name]) if (k) out.add(normName(k));
    } else if (d.kind === 'step' && d.letter) out.add(normName(d.letter));
  }
  return out;
}

function proseToNotes(drafts: Draft[]): void {
  const known = definedNames(drafts);
  const wordsOnly = (e: Expr, op: { n: number; prose: boolean }): boolean => {
    switch (e.k) {
      case 'name': return !known.has(normName(e.name));
      case 'op': {
        op.n++;
        const a = wordsOnly(e.a, op), b = wordsOnly(e.b, op);
        if (a && b) op.prose = true;
        return a && b;
      }
      case 'neg': case 'carry': return wordsOnly(e.a, op);
      default: return false;
    }
  };
  for (const d of drafts) {
    if (d.src.maths || !d.chain) continue;
    if (d.kind !== 'check' && d.kind !== 'step') continue;
    const op = { n: 0, prose: false };
    for (const g of d.chain.segments) {
      const e = g.readings[0]?.expr;
      if (e) wordsOnly(e, op);
    }
    const unknown = mentions(d.chain).names.filter((n) => !known.has(normName(n))).length;
    // An `=` joining two segments that are each only words.
    const segs = d.chain.segments;
    segs.forEach((g, i) => {
      if (i === 0 || (g.join !== '=' && g.join !== '≈')) return;
      op.n++;
      const a = g.readings[0]?.expr, b = segs[i - 1].readings[0]?.expr;
      if (a && b && wordsOnly(a, { n: 0, prose: false }) && wordsOnly(b, { n: 0, prose: false })) op.prose = true;
    });
    const labelled = !!d.parse.label;
    const maths = !op.prose && (labelled ? op.n > 0 || unknown === 0 : op.n > 0 && unknown === 0);
    if (maths) continue;
    d.kind = 'note';
    d.note = `${d.parse.body} is words, not maths — no operator between numbers or names the page defines`;
    d.key = undefined;
    d.chain = undefined;
  }
}

function hasNames(chain: ExprChain): boolean {
  const walk = (e: Expr): boolean => (e.k === 'name' || e.k === 'ref' ? true : e.k === 'op' ? walk(e.a) || walk(e.b) : e.k === 'neg' || e.k === 'carry' ? walk(e.a) : false);
  return chain.segments.some((g) => g.readings.some((r) => walk(r.expr)));
}

/** Every name and step a chain mentions, in any reading. */
function mentions(chain: ExprChain): { names: string[]; steps: number[] } {
  const names: string[] = [];
  const steps: number[] = [];
  const walk = (e: Expr) => {
    if (e.k === 'name') names.push(e.name);
    else if (e.k === 'ref') steps.push(e.step);
    else if (e.k === 'op') {
      walk(e.a);
      walk(e.b);
    } else if (e.k === 'neg' || e.k === 'carry') walk(e.a);
  };
  for (const g of chain.segments) for (const r of g.readings) walk(r.expr);
  return { names, steps };
}

/** Does this formula add the amount itself, anywhere? */
function addsAmount(e: Expr | null | undefined, amount: Quantity): boolean {
  if (!e) return false;
  if (e.k === 'op') {
    if (e.op === '+' && e.b.k === 'num' && !isRange(e.b.q) && compareQuantities(amount, e.b.q).status === 'ok') return true;
    return addsAmount(e.a, amount) || addsAmount(e.b, amount);
  }
  if (e.k === 'neg' || e.k === 'carry') return addsAmount(e.a, amount);
  return false;
}

const stepsPhrase = (keys: string[]) =>
  keys.length === 1 ? `step ${keys[0]}` : `steps ${keys.slice(0, -1).join(', ')} and ${keys[keys.length - 1]}`;

/** Strongly connected steps: every step that reaches itself through the others is in a cycle. */
function cyclesOf(keys: string[], deps: Map<string, Set<string>>): Map<string, string[]> {
  const index = new Map<string, number>();
  const low = new Map<string, number>();
  const onStack = new Set<string>();
  const stack: string[] = [];
  const out = new Map<string, string[]>();
  let i = 0;
  const visit = (v: string) => {
    index.set(v, i);
    low.set(v, i);
    i++;
    stack.push(v);
    onStack.add(v);
    for (const w of deps.get(v) ?? []) {
      if (!index.has(w)) {
        visit(w);
        low.set(v, Math.min(low.get(v)!, low.get(w)!));
      } else if (onStack.has(w)) low.set(v, Math.min(low.get(v)!, index.get(w)!));
    }
    if (low.get(v) === index.get(v)) {
      const scc: string[] = [];
      let w: string;
      do {
        w = stack.pop()!;
        onStack.delete(w);
        scc.push(w);
      } while (w !== v);
      if (scc.length > 1 || deps.get(v)?.has(v)) {
        const members = keys.filter((k) => scc.includes(k));
        for (const m of members) out.set(m, members);
      }
    }
  };
  for (const k of keys) if (!index.has(k)) visit(k);
  return out;
}

export function readSheet(input: readonly SheetLineInput[], options: SheetOptions = {}): Sheet {
  const sources: Source[] = input.map((x) =>
    typeof x === 'string' ? { text: x } : { text: x.text, ...(x.at ? { at: x.at } : {}), ...(x.bounds ? { bounds: x.bounds } : {}), ...(x.ids ? { ids: [...x.ids] } : {}), ...(x.maths ? { maths: true } : {}) }
  );
  const drafts = sources.map((src, line) => classify(src, line));
  proseToNotes(drafts);
  const { unit, reason: unitReason } =
    options.unit !== undefined
      ? { unit: options.unit, reason: options.unit ? `${UNIT_NAMES[options.unit]}, as given` : 'no unit, as given' }
      : inferUnit(drafts.map((d) => d.parse));
  const withUnit = (q: Quantity): Quantity => (isBare(q) && unit ? { ...q, unit, dim: 1 } : q);

  // What each name and step number means. The first definition of a letter or a name holds it.
  const nameIndex = new Map<string, string>();
  const defByKey = new Map<string, Draft>();
  const stepByKey = new Map<string, Draft>();
  for (const d of drafts) {
    if (d.kind === 'definition') {
      const keys = [d.letter, d.name].filter((k): k is string => !!k).map(normName);
      const taken = keys.find((k) => nameIndex.has(k));
      if (taken) {
        const first = defByKey.get(nameIndex.get(taken)!);
        d.conflict = `${d.letter ?? d.name} is written again as ${d.value ? fmt(withUnit(d.value)) : 'nothing'}; the first, ${first?.value ? fmt(withUnit(first.value)) : 'with no number'}, is kept`;
        continue;
      }
      for (const k of keys) nameIndex.set(k, d.key!);
      defByKey.set(d.key!, d);
    } else if (d.kind === 'step') {
      if (stepByKey.has(d.key!) || (d.letter && nameIndex.has(normName(d.letter)))) {
        d.conflict = `${d.n !== null && d.n !== undefined ? `step ${d.n}` : d.letter} is written twice; the first is kept`;
        continue;
      }
      stepByKey.set(d.key!, d);
      if (d.letter) nameIndex.set(normName(d.letter), d.key!);
    }
  }
  // A step's number written with only a value is a label to check — unless no formula has that number, when it is a step of its own.
  for (const d of drafts) {
    if (d.kind === 'label' && !stepByKey.has(d.step!)) {
      d.kind = 'step';
      stepByKey.set(d.key!, d);
    }
  }
  // The heading each line sits under.
  let heading: number | undefined;
  for (const d of drafts) {
    if (d.kind === 'heading') {
      heading = d.line;
      continue;
    }
    if (heading !== undefined) d.under = heading;
  }
  // A worked line on a line of its own belongs to the step just above it, when it has that step's form.
  drafts.forEach((d, i) => {
    const above = drafts[i - 1];
    if (d.kind !== 'check' || !above || above.kind !== 'step' || above.conflict || above.workedLine !== undefined || hasNames(d.chain!)) return;
    if (above.chain!.segments.some((g) => g.join === 'gap')) return;
    const joined = parseChain(`${above.parse.body}   ${d.parse.body}`);
    if (!evaluateChain(joined, { unit }).some((r) => r.restated > 0)) return;
    above.chain = joined;
    above.workedLine = d.line;
    d.kind = 'worked';
    d.step = above.key;
  });

  // Dependencies between steps, and the cycles among them.
  const stepKeys = [...stepByKey.keys()];
  const deps = new Map<string, Set<string>>();
  for (const k of stepKeys) {
    const m = mentions(stepByKey.get(k)!.chain!);
    const set = new Set<string>();
    for (const n of m.names) {
      const key = nameIndex.get(normName(n));
      if (key && stepByKey.has(key)) set.add(key);
    }
    for (const s of m.steps) if (stepByKey.has(String(s))) set.add(String(s));
    deps.set(k, set);
  }
  const cycles = cyclesOf(stepKeys, deps);
  const who = (k: string) => (/^\d+$/.test(k) ? `step ${k}` : k);

  // Evaluation, in dependency order. `alternatives` says which steps read their measurements with an allowance too.
  const evaluate = (alternatives: Map<string, Allowance>) => {
    const values = new Map<string, Quantity | null>();
    const readings = new Map<string, ChainReading[]>();
    const scopeFor = (allowance: Allowance | undefined): MathsScope => ({
      unit,
      describeUnknown: (name) => `${name} is not on this sheet`,
      name: (n) => {
        const key = nameIndex.get(normName(n));
        if (key === undefined) return undefined;
        const def = defByKey.get(key);
        if (!def) {
          // A lettered formula, referred to by its letter.
          const v = values.get(key) ?? null;
          return [{ value: v, key, ...(v ? {} : { reason: cycles.has(key) ? `${key} is in a cycle` : `${key} has no value` }) }];
        }
        const v = def.value ? withUnit(def.value) : null;
        const plain: NameResolution = { value: v, key, label: 'from the measurements', ...(v ? {} : { reason: `${key} has no number yet` }) };
        if (!allowance || !v) return [plain];
        const alt = arithmetic('+', v, allowance.amount).quantity;
        if (!alt) return [plain];
        return [plain, { value: alt, key, label: allowance.label, alternative: true, reason: `${key} ${fmt(v)} + ${fmt(allowance.amount)}` }];
      },
      step: (n) => {
        const key = String(n);
        if (!stepByKey.has(key)) return undefined;
        if (cycles.has(key)) return { value: null, key, reason: `step ${n} is in a cycle` };
        const v = values.get(key) ?? null;
        return { value: v, key, ...(v ? {} : { reason: `step ${n} has no value` }) };
      },
    });
    const run = (key: string) => {
      if (readings.has(key)) return;
      const d = stepByKey.get(key)!;
      const loop = cycles.get(key);
      if (loop) {
        const why = loop.length === 1
          ? `${who(key)} refers to itself — a cycle, so it cannot be worked out`
          : `${loop.map(who).join(' and ')} refer to each other — a cycle, so none of them can be worked out`;
        readings.set(key, [{ expr: null, formula: d.parse.body, value: null, worked: d.parse.body, checks: [], bindings: [], restated: 0, uses: [...deps.get(key)!], unknowns: [], notes: [why], reason: why }]);
        values.set(key, null);
        return;
      }
      for (const dep of deps.get(key) ?? []) run(dep);
      const r = evaluateChain(d.chain!, scopeFor(alternatives.get(key)));
      readings.set(key, r);
      values.set(key, r[0]?.value ?? null);
    };
    stepKeys.forEach(run);
    return { values, readings, scopeFor };
  };

  // Pass one: every step as written. The allowances are read from it: what the steps under a heading add.
  const plain = evaluate(new Map());
  const allowances = new Map<number, Allowance>();
  for (const h of drafts) {
    if (h.kind !== 'heading' || (!ADDS.test(h.title!) && !/\ballowance\b/i.test(h.title!))) continue;
    const label = `with ${headingWords(h.parse)}`;
    if (h.amount) {
      const amount = withUnit(h.amount);
      allowances.set(h.line, { amount, label, from: [], reason: `${h.title}: ${fmt(amount)}, as the heading says` });
      continue;
    }
    const seen: { key: string; k: Quantity }[] = [];
    for (const d of drafts) {
      if (d.kind !== 'step' || d.under !== h.line || d.conflict) continue;
      const e = plain.readings.get(d.key!)?.[0]?.expr;
      if (e && e.k === 'op' && e.op === '+' && e.b.k === 'num' && !isRange(e.b.q) && e.a.k !== 'num') seen.push({ key: d.key!, k: withUnit(e.b.q) });
    }
    if (!seen.length) continue;
    const tally = seen.map((s) => ({ ...s, n: seen.filter((o) => compareQuantities(o.k, s.k).status === 'ok').length }));
    const top = tally.reduce((a, b) => (b.n > a.n ? b : a));
    const from = seen.filter((s) => compareQuantities(s.k, top.k).status === 'ok').map((s) => s.key);
    allowances.set(h.line, { amount: top.k, label, from, reason: `${h.title}: ${fmt(top.k)}, as ${stepsPhrase(from)} ${from.length === 1 ? 'adds' : 'add'} it` });
  }
  // Pass two: a step under an allowance that does not add it itself is read both ways.
  const alternatives = new Map<string, Allowance>();
  for (const d of drafts) {
    if (d.kind !== 'step' || d.conflict || d.under === undefined) continue;
    const a = allowances.get(d.under);
    if (!a) continue;
    if (plain.readings.get(d.key!)?.some((r) => addsAmount(r.expr, a.amount))) continue;
    alternatives.set(d.key!, a);
  }
  const done = alternatives.size ? evaluate(alternatives) : plain;
  const readingsOf = (key: string) => done.readings.get(key) ?? [];

  const entries = drafts.map((d): SheetEntry => {
    const base: EntryBase = {
      line: d.line,
      text: d.src.text,
      ...(d.src.at ? { at: d.src.at } : {}),
      ...(d.src.bounds ? { bounds: d.src.bounds } : {}),
      ...(d.src.ids ? { ids: d.src.ids } : {}),
      ...(d.under !== undefined ? { under: d.under } : {}),
      reason: '',
    };
    switch (d.kind) {
      case 'definition': {
        const value = d.value ? withUnit(d.value) : null;
        const head = [d.letter, d.name].filter(Boolean).join(' · ');
        const reason = d.conflict
          ? d.conflict
          : value
            ? `${head} = ${fmt(value)}${d.value && isBare(d.value) && unit ? `, in the ${UNIT_NAMES[unit]} this page writes` : ''}`
            : `${head}: a measurement with no number yet`;
        return { ...base, kind: 'definition', key: d.key!, ...(d.letter ? { letter: d.letter } : {}), ...(d.name ? { name: d.name } : {}), value, ...(d.conflict ? { conflict: d.conflict } : {}), reason };
      }
      case 'step': {
        if (d.conflict) {
          return { ...base, kind: 'step', key: d.key!, n: d.n ?? null, ...(d.letter ? { letter: d.letter } : {}), formula: d.parse.body, value: null, readings: [], uses: [], conflict: d.conflict, reason: d.conflict };
        }
        const readings = readingsOf(d.key!);
        const top = readings[0];
        const uses = [...new Set(readings.flatMap((r) => r.uses))];
        return {
          ...base,
          kind: 'step',
          key: d.key!,
          n: d.n ?? null,
          ...(d.letter ? { letter: d.letter } : {}),
          formula: top?.formula ?? d.parse.body,
          value: top?.value ?? null,
          readings,
          uses,
          ...(d.workedLine !== undefined ? { worked: d.workedLine } : {}),
          reason: stepReason(readings, nameIndex),
        };
      }
      case 'heading': {
        const allowance = allowances.get(d.line);
        return { ...base, kind: 'heading', title: d.title!, ...(allowance ? { allowance } : {}), reason: allowance ? allowance.reason : `${d.title}: kept as context for the lines under it` };
      }
      case 'check': {
        const readings = evaluateChain(d.chain!, done.scopeFor(undefined));
        return { ...base, kind: 'check', value: readings[0]?.value ?? null, readings, reason: readings[0]?.reason ?? `cannot read “${d.parse.body}”` };
      }
      case 'worked':
        return { ...base, kind: 'worked', step: d.step!, reason: `the worked line of ${who(d.step!)}` };
      case 'label': {
        const written = withUnit(d.written!);
        const check = checkReadings(d.step!, readingsOf(d.step!), written);
        return { ...base, kind: 'label', step: d.step!, written, check, reason: check.reason };
      }
      case 'value': {
        const written = withUnit(d.written!);
        const matches = stepKeys
          .filter((k) => !cycles.has(k))
          .map((k) => checkReadings(k, readingsOf(k), written))
          .filter((c) => c.status === 'ok' || c.status === 'rounded' || c.status === 'within' || c.status === 'spans');
        return { ...base, kind: 'value', written, matches, reason: matches.length ? matches.map((m) => m.reason).join('; ') : `${fmt(written)} agrees with no step here` };
      }
      default:
        return { ...base, kind: 'note', reason: d.note ?? `cannot read “${d.parse.body}”` };
    }
  });
  return { entries, unit, unitReason };
}

/** What a reading is called in a sentence about the step: its label, or its formula. */
function nameOf(r: ChainReading, readings: ChainReading[]): string {
  return r.label ?? (readings.some((x) => x.label) ? 'from the measurements' : `as ${r.formula}`);
}

function stepReason(readings: ChainReading[], nameIndex: Map<string, string>): string {
  const top = readings[0];
  if (!top) return 'nothing to read';
  const parts = [top.reason];
  for (const b of top.bindings) {
    if (b.kind === 'name' && !nameIndex.has(normName(b.subject))) parts.push(`${b.subject} is not on this sheet; the worked line puts ${fmt(b.value)} for it`);
  }
  for (const o of readings.slice(1)) parts.push(`or ${fmt(o.value)} ${nameOf(o, readings)}`);
  return parts.join('; ');
}

function checkReadings(key: string, readings: ChainReading[], w: Quantity): StepCheck {
  const who = /^\d+$/.test(key) ? `step ${key}` : key;
  const per = readings.map((r, index) => ({ index, value: r.value, ...pick(compareQuantities(r.value, w)) }));
  const out = (status: StepCheckStatus, reason: string): StepCheck => ({
    step: key,
    written: w,
    status,
    readings: per.map((p) => ({ index: p.index, status: p.status, value: p.value })),
    reason,
  });
  if (!readings.length) return out('unknown', `${who} has no reading to check ${fmt(w)} against`);
  if (isRange(w) && readings.length >= 2) {
    const at = (v: number) =>
      readings.findIndex((r) => r.value && !isRange(r.value) && compareQuantities(r.value, { ...w, lo: v, hi: v }).status === 'ok');
    const lo = at(w.lo), hi = at(w.hi);
    if (lo >= 0 && hi >= 0 && lo !== hi) {
      return out('spans', `${fmt(w)} spans ${who}'s readings: ${fmt(readings[lo].value)} ${nameOf(readings[lo], readings)}, ${fmt(readings[hi].value)} ${nameOf(readings[hi], readings)}`);
    }
  }
  const good = (s: CheckStatus) => s === 'ok' || s === 'rounded' || s === 'within';
  if (good(per[0].status)) return out(per[0].status, `${fmt(w)} is ${who}: ${per[0].reason}`);
  const other = per.find((p) => good(p.status));
  if (other) {
    const r = readings[other.index];
    return out(other.status, `${fmt(w)} is ${who} ${nameOf(r, readings)} (${fmt(r.value)}), not its first reading (${fmt(readings[0].value)})`);
  }
  if (per.every((p) => p.status === 'unknown')) return out('unknown', `${who} has no value to check ${fmt(w)} against`);
  return out('off', `${who} is ${fmt(readings[0].value)}; written ${fmt(w)}`);
}

function pick(c: { status: CheckStatus; reason: string }) {
  return { status: c.status, reason: c.reason };
}

// ===== Asking a sheet =====

/** A definition or step by its key — a letter, a name, a step number (`1`, `step 1`, `1.`). */
export function sheetEntry(sheet: Sheet, key: string): SheetEntry | undefined {
  const k = key.trim();
  const live = (e: SheetEntry) => (e.kind === 'definition' || e.kind === 'step') && !e.conflict;
  const direct = sheet.entries.find((e) => live(e) && (e as DefinitionEntry | StepEntry).key === k);
  if (direct) return direct;
  const n = normName(k.replace(/^step\s+/i, '').replace(/[.)]$/, ''));
  return sheet.entries.find((e) => {
    if (!live(e)) return false;
    if (e.kind === 'definition') return normName(e.key) === n || (!!e.name && normName(e.name) === n) || (!!e.letter && normName(e.letter) === n);
    return e.kind === 'step' && normName(e.key) === n;
  });
}

/** The value a definition holds, or a step's first reading. */
export function sheetValue(sheet: Sheet, key: string): Quantity | null {
  const e = sheetEntry(sheet, key);
  return e && (e.kind === 'definition' || e.kind === 'step') ? e.value : null;
}

/** Every step that reads this one, however indirectly, in sheet order. */
export function dependentsOf(sheet: Sheet, key: string): string[] {
  const start = sheetEntry(sheet, key);
  if (!start || (start.kind !== 'definition' && start.kind !== 'step')) return [];
  const steps = sheet.entries.filter((e): e is StepEntry => e.kind === 'step' && !e.conflict);
  const found = new Set<string>();
  const frontier = [start.key];
  while (frontier.length) {
    const k = frontier.pop()!;
    for (const s of steps) {
      if (s.uses.includes(k) && !found.has(s.key)) {
        found.add(s.key);
        frontier.push(s.key);
      }
    }
  }
  return steps.filter((s) => found.has(s.key)).map((s) => s.key);
}

/** A written number against a step's readings: `1. 15″` on a drawing, or a brace's `72–74″`. */
export function checkWritten(sheet: Sheet, key: string, written: string | Quantity): StepCheck | null {
  const e = sheetEntry(sheet, key);
  if (!e || e.kind !== 'step') return null;
  const q = typeof written === 'string' ? parseQuantity(written)?.quantity : written;
  if (!q) return null;
  return checkReadings(e.key, e.readings, isBare(q) && sheet.unit ? { ...q, unit: sheet.unit, dim: 1 } : q);
}

const sig = (q: Quantity | null | undefined) => (q ? `${q.lo}|${q.hi}|${q.unit}|${q.dim}|${q.approx}` : '-');

function entryKey(e: SheetEntry): string | null {
  switch (e.kind) {
    case 'definition':
    case 'step':
      return e.conflict ? null : e.key;
    case 'heading':
      return `heading ${e.title}`;
    case 'label':
    case 'value':
    case 'check':
      return `${e.kind} ${e.line}`;
    default:
      return null;
  }
}

function signature(e: SheetEntry): string {
  const readings = (rs: ChainReading[]) => rs.map((r) => [sig(r.value), r.label ?? '', r.formula, r.checks.map((c) => `${c.status}:${sig(c.computed)}`).join(',')].join(' ')).join(' / ');
  switch (e.kind) {
    case 'definition':
      return sig(e.value);
    case 'step':
    case 'check':
      return readings(e.readings);
    case 'heading':
      return e.allowance ? `${sig(e.allowance.amount)} ${e.allowance.from.join(',')}` : '';
    case 'label':
      return e.check ? `${e.check.status} ${e.check.readings.map((r) => r.status).join(',')}` : '';
    case 'value':
      return e.matches.map((m) => `${m.step}:${m.status}`).join(',');
    default:
      return '';
  }
}

/**
 * What changed between two readings of a page: the keys — letters, names,
 * step numbers — whose values or checks differ, in the newer sheet's order.
 * Change one measurement and this is that measurement and every step that
 * depends on it; nothing else.
 */
export function diffSheets(a: Sheet, b: Sheet): string[] {
  const index = (s: Sheet) => {
    const m = new Map<string, string>();
    for (const e of s.entries) {
      const k = entryKey(e);
      if (k !== null && !m.has(k)) m.set(k, signature(e));
    }
    return m;
  };
  const A = index(a), B = index(b);
  const out: string[] = [];
  for (const [k, v] of B) if (A.get(k) !== v) out.push(k);
  for (const k of A.keys()) if (!B.has(k)) out.push(k);
  return out;
}

/** The sheet in a few lines, for a status line, a panel or a brief. */
export function describeSheet(sheet: Sheet): string {
  const lines: string[] = [];
  for (const e of sheet.entries) {
    switch (e.kind) {
      case 'definition':
        lines.push(e.conflict ? `${e.text} — ${e.conflict}` : `${[e.letter, e.name].filter(Boolean).join(' · ')} = ${fmt(e.value)}`);
        break;
      case 'heading':
        lines.push(e.allowance ? `${e.title} — ${fmt(e.allowance.amount)}${e.allowance.from.length ? `, as ${stepsPhrase(e.allowance.from)} ${e.allowance.from.length === 1 ? 'adds' : 'add'} it` : ''}` : e.title);
        break;
      case 'step': {
        if (e.conflict) {
          lines.push(`${e.text} — ${e.conflict}`);
          break;
        }
        const [top, ...rest] = e.readings;
        if (!top) break;
        const mark = (r: ChainReading) => {
          const off = r.checks.find((c) => c.status === 'off');
          if (off) return ` ✗ written ${fmt(off.written)}`;
          return r.checks.length && r.checks.every((c) => c.status !== 'unknown') ? ' ✓' : '';
        };
        const head = e.n !== null ? `${e.n}.` : `${e.letter}.`;
        if (!top.value) {
          // No value: say why — the cycle, the name that is not here, the step that is missing.
          const why = [...top.notes, ...top.unknowns.map((u) => `${u} is not on this sheet`)].filter((x, i, xs) => xs.indexOf(x) === i);
          lines.push(`${head} ${top.formula} — ${why.join('; ') || 'no value'}`);
          break;
        }
        lines.push(`${head} ${top.formula} = ${fmt(top.value)}${top.label ? ` ${top.label}` : ''}${mark(top)}${rest.map((r) => ` · or ${fmt(r.value)} ${nameOf(r, e.readings)}${mark(r)}`).join('')}`);
        break;
      }
      case 'label':
      case 'value':
      case 'check':
        lines.push(`${e.text} — ${e.reason}`);
        break;
      default:
        break;
    }
  }
  return lines.join('\n');
}
