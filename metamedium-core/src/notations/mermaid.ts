// Mermaid out (V1-PLAN §3, §9 D2) — a notation reading, said as Mermaid text.
//
// A notation reads what a drawing is in its own terms (notation.ts); this
// says that reading in Mermaid, so a hand-drawn flowchart can leave the board
// as text a README, a wiki or mermaid.js can take. Tier 1: the engine writes
// it from the reading, and no model is asked. Six rules:
//
//   - **One writer per notation, found by its id.** `toMermaid` looks the
//     reading's notation up; the flowchart's writer is here, and D4–D6 add
//     `classDiagram`, `sequenceDiagram`, `stateDiagram-v2`, `erDiagram` and
//     `mindmap` beside it with `registerMermaidWriter`. A notation with no
//     writer gives null, never a guess.
//   - **The content is the notation's table.** Each symbol's brackets, each
//     connector's line, the header and its default direction come from
//     FLOWCHART_TABLE (flowchart.ts), bound for the flowchart@1 pack; what
//     stays code is what a table cannot say — the order, the ids, the quoting.
//   - **Ids are the marks' own, said safely.** `stroke:ada:7` is
//     `stroke_ada_7`; a symbol drawn with several strokes is its figure,
//     `figure:stroke:6+stroke:7`, said by its strokes' numbers in order,
//     `figure_6_7`. Letters, digits and underscores, a letter first, never a
//     word Mermaid's lexer reads as a keyword — and never two alike: ids that
//     differ only in what Mermaid cannot hold (`qwen3:8b`, `qwen3-8b`) each
//     take a suffix hashed from their own id, so the name is a function of
//     the set of ids and not of any order.
//   - **Every label is quoted and escaped.** Unquoted, `"`, `|`, `[`, `]`,
//     `{`, `}` or `(` breaks the parse; quoted, only `"` ends the string, and
//     Mermaid's own preprocessing reads `#…;` as an entity, `%%` as a comment
//     or directive, a backtick as markdown and `<` as markup — so each of
//     those is written as the entity Mermaid decodes back to it, and a line
//     break as `<br>`. `unescapeMermaid` undoes it exactly.
//   - **Writing nobody has read is said, never invented.** A label carries
//     text only once a model has read the writing (or a hand wrote a word on
//     its own ink); until then it is written "(unread writing)" and named in
//     the notes, beside the symbols that have no writing at all.
//   - **The order is the drawing's, not the log's.** A reading lists things
//     in the order the log was replayed, and the log's order depends on how
//     the hands' logs were merged. So nodes are written in reading order —
//     rows down the page, each row left to right, or columns across when the
//     chart runs across — and links by the nodes they join: the same drawing
//     says the same text in any merge order.
//
// The direction is measured, and says why: `TD` when the flows run down the
// page — between the centres of the symbols each flow joins — `LR` when they
// run across. Nothing here enters the log: the text is derived from a reading
// that is itself derived.

import type { Bounds, Point } from '../types';
import type { NotationReading, NotationSymbol, NotationConnector, NotationLabel } from './notation';
import { FLOWCHART_TABLE } from './flowchart';

export type MermaidDirection = 'TD' | 'LR';

export interface MermaidOptions {
  /** Which way the diagram runs. Measured from the drawing when not given. */
  direction?: MermaidDirection;
  /**
   * Writing read with its line: the line was read as one image and its words
   * held on the line's first mark, so this mark says nothing of its own —
   * neither a word nor a placeholder (the surface's `readWith`, runtime).
   */
  readWith?: (id: string) => boolean;
}

/** A link as written, in the order Mermaid numbers them (`linkStyle 0`, `1`, …). */
export interface MermaidLink {
  index: number;
  /** The connector's own mark. */
  id: string;
  /** It and any head drawn apart from it. */
  ids: string[];
  /** Mermaid ids of the nodes it joins. */
  from: string;
  to: string;
}

export interface MermaidText {
  /** The Mermaid source, one statement a line, ending in a newline. */
  text: string;
  /** The notation it was written from: 'flowchart'. */
  notation: string;
  /** The diagram Mermaid is told it is: 'flowchart'. */
  diagram: string;
  /** Which way it runs, and why — for a diagram that has a direction. */
  direction?: { value: MermaidDirection; reason: string };
  /** Each Mermaid node id → what stands for the symbol on the board: its stroke, its word, or a figure's `figure:a+b`. */
  ids: Record<string, string>;
  /** Each Mermaid node id → every stroke the symbol is drawn with, in natural order — where ink over the rendered node lands. */
  marks: Record<string, string[]>;
  /** The links, in the order written. */
  links: MermaidLink[];
  /** The writing written as "(unread writing)": its marks, which a model that can see could be asked to read. */
  unread: string[];
  /** What the text does not say as drawn, a sentence each: writing nobody has read, symbols with no writing, marks left out. */
  notes: string[];
}

export type MermaidWriter = (reading: NotationReading, opts: MermaidOptions) => MermaidText;

/** What writing nobody has read is written as. Its words are not known, and are never invented. */
export const UNREAD_WRITING = '(unread writing)';

/** A symbol with nothing written in it: a quoted space, since Mermaid's parse wants text between the quotes. */
const BLANK = ' ';

const writers = new Map<string, MermaidWriter>();

/**
 * Let a notation be said in Mermaid. A second writer for the same notation
 * replaces the first. Returns the way to take it back.
 */
export function registerMermaidWriter(notation: string, writer: MermaidWriter): () => void {
  writers.set(notation, writer);
  return () => {
    if (writers.get(notation) === writer) writers.delete(notation);
  };
}

/** The notations that can be said in Mermaid, in the order they registered. */
export function mermaidWriters(): string[] {
  return [...writers.keys()];
}

/**
 * A notation reading as Mermaid text, with the map back from each Mermaid id
 * to the marks, and notes on what the text does not say as drawn. Null when
 * no writer knows the reading's notation. Pure: reads the reading, writes
 * nothing anywhere.
 */
export function toMermaid(reading: NotationReading, opts: MermaidOptions = {}): MermaidText | null {
  const w = writers.get(reading.notation);
  return w ? w(reading, opts) : null;
}

// ===== Order: natural for ids, reading order for marks — never the log's =====

const codeUnit = (a: string, b: string) => (a < b ? -1 : a > b ? 1 : 0);

/**
 * Code-unit order with each run of digits compared as a number, so
 * `stroke:8` comes before `stroke:10`. No locale: the same on every machine.
 */
export function naturalCompare(a: string, b: string): number {
  const ra = a.match(/\d+|\D+/g) ?? [], rb = b.match(/\d+|\D+/g) ?? [];
  for (let i = 0; i < Math.min(ra.length, rb.length); i++) {
    const x = ra[i], y = rb[i];
    if (x === y) continue;
    if (/^\d/.test(x) && /^\d/.test(y)) {
      const nx = x.replace(/^0+(?=\d)/, ''), ny = y.replace(/^0+(?=\d)/, '');
      if (nx.length !== ny.length) return nx.length - ny.length;
      if (nx !== ny) return codeUnit(nx, ny);
      continue;
    }
    return codeUnit(x, y);
  }
  return ra.length - rb.length || codeUnit(a, b);
}

const centre = (b: Bounds): Point => ({ x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 });

/**
 * Things in the drawing's reading order: rows down the page, each row left to
 * right — or, `across`, columns left to right, each column top to bottom. A
 * thing joins a row when its middle lies within the extent of the row's first
 * member, or that member's middle within its own — so a line of boxes a hand
 * drew at slightly different heights is one row, a small dot beside a tall box
 * is in its row, and a staircase, measured against its first step only, is
 * not. Ties, and things with no bounds (last), go by `keyOf` in natural order.
 * Depends on where things are, never on the order they are given in.
 */
export function inReadingOrder<T>(items: readonly T[], boundsOf: (t: T) => Bounds | undefined, keyOf: (t: T) => string, across = false): T[] {
  const main = (b: Bounds) => (across ? centre(b).x : centre(b).y);
  const cross = (b: Bounds) => (across ? centre(b).y : centre(b).x);
  const extent = (b: Bounds) => (across ? [b.minX, b.maxX] : [b.minY, b.maxY]);
  const placed = items.filter((t) => !!boundsOf(t)).map((t) => ({ t, b: boundsOf(t)!, k: keyOf(t) }));
  const loose = items.filter((t) => !boundsOf(t)).sort((p, q) => naturalCompare(keyOf(p), keyOf(q)));
  placed.sort((p, q) => main(p.b) - main(q.b) || cross(p.b) - cross(q.b) || naturalCompare(p.k, q.k));
  const out: T[] = [];
  let band: typeof placed = [];
  const close = () => {
    band.sort((p, q) => cross(p.b) - cross(q.b) || naturalCompare(p.k, q.k));
    out.push(...band.map((x) => x.t));
    band = [];
  };
  const within = (v: number, [lo, hi]: number[]) => v >= lo && v <= hi;
  for (const x of placed) {
    if (band.length && !within(main(x.b), extent(band[0].b)) && !within(main(band[0].b), extent(x.b))) close();
    band.push(x);
  }
  close();
  return [...out, ...loose];
}

// ===== Ids =====

/** Words Mermaid's flowchart lexer takes as a keyword at the start of an id, whatever follows. */
const KEYWORD = /^(end|graph|flowchart|subgraph|style|classdef|class|click|linkstyle|default|direction|call|href|interpolate|acc)/i;

/** An id's Mermaid form before any collision is settled. */
function spoken(id: string): string {
  let raw = id;
  // A compound id — `figure:stroke:10+stroke:8` — is its family and its members, in natural order,
  // without the family word they all share: `figure_8_10`.
  const compound = /^([A-Za-z]+):(.*\+.*)$/.exec(id);
  if (compound) {
    const members = compound[2].split('+').sort(naturalCompare);
    const families = members.map((m) => /^([A-Za-z]+):./.exec(m)?.[1]);
    const shared = families[0] && families.every((f) => f === families[0]) ? families[0] : null;
    raw = [compound[1], ...members.map((m) => (shared ? m.slice(shared.length + 1) : m))].join('_');
  }
  const s = raw.replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  return !s || /^[0-9]/.test(s) || KEYWORD.test(s) ? (s ? `n_${s}` : 'n') : s;
}

/** FNV-1a, 32 bits, in base 36: a short suffix that is a function of the id alone. */
function hashOf(s: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(36);
}

/**
 * Each node id's Mermaid id: letters, digits and underscores, a letter first,
 * never a keyword — and never the same for two ids. An id that is the only
 * one to say its form keeps it plain; ids that would say the same take a
 * suffix hashed from their own id. A function of the SET of ids: the same ids
 * in any order, or beside others that collide with none of them, are said
 * the same.
 */
export function mermaidIds(nodeIds: readonly string[]): Map<string, string> {
  const unique = [...new Set(nodeIds)].sort(codeUnit);
  const groups = new Map<string, string[]>();
  for (const id of unique) {
    const s = spoken(id);
    (groups.get(s) ?? groups.set(s, []).get(s)!).push(id);
  }
  const named = new Map<string, string>();
  const taken = new Set<string>();
  for (const [s, ids] of groups) {
    if (ids.length !== 1) continue;
    named.set(ids[0], s);
    taken.add(s);
  }
  for (const [s, ids] of [...groups].filter(([, ids]) => ids.length > 1).sort(([a], [b]) => codeUnit(a, b))) {
    for (const id of ids) {
      const base = `${s}_${hashOf(id)}`;
      let name = base;
      for (let k = 2; taken.has(name); k++) name = `${base}_${k}`;
      named.set(id, name);
      taken.add(name);
    }
  }
  return new Map(unique.map((id) => [id, named.get(id)!]));
}

// ===== Labels =====

/** What Mermaid would read as something other than the character: each written as the entity it decodes back to. */
const ENTITY: Record<string, string> = { '#': '#35;', '"': '#quot;', '%': '#37;', '`': '#96;', '<': '#lt;', '>': '#gt;', '&': '#amp;' };
const NAMED: Record<string, string> = { quot: '"', lt: '<', gt: '>', amp: '&' };

/**
 * A label as Mermaid reads it back: quoted, every character that would end
 * the string or be read as something else written as its entity, a line
 * break as `<br>`, nothing lost. `colons` writes `:` as `#58;` too, for a
 * line where Mermaid's preprocessing would otherwise mistake the label for a
 * `style` or `classDef` statement and eat the `;` that ends an entity (the
 * writer asks for it only on such a line). Empty text is a quoted space.
 */
export function mermaidString(text: string, opts: { colons?: boolean } = {}): string {
  const lines = String(text)
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) =>
      [...line.replace(/\t/g, ' ').replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '')]
        .map((ch) => ENTITY[ch] ?? (opts.colons && ch === ':' ? '#58;' : ch))
        .join('')
    );
  const body = lines.join('<br>');
  return `"${body.length ? body : BLANK}"`;
}

/** A quoted Mermaid label back to its text: the exact inverse of `mermaidString`. */
export function unescapeMermaid(quoted: string): string {
  const inner = quoted.length >= 2 && quoted.startsWith('"') && quoted.endsWith('"') ? quoted.slice(1, -1) : quoted;
  return inner
    .split(/<br\s*\/?>/i)
    .map((part) =>
      part.replace(/#(\w+);/g, (whole, name: string) => {
        if (/^\d+$/.test(name)) return String.fromCodePoint(Number(name));
        return NAMED[name] ?? whole;
      })
    )
    .join('\n');
}

/** Mermaid's preprocessing (mermaidAPI's encodeEntities) strips the last character of a line matching these. */
const PREPROCESSED = /style|classDef/;

// ===== The flowchart =====

const COUNT = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
const count = (n: number) => COUNT[n] ?? String(n);
const list = (xs: readonly string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);

type FlowSymbol = keyof typeof FLOWCHART_TABLE.symbols;
const isFlowSymbol = (s: string): s is FlowSymbol => Object.prototype.hasOwnProperty.call(FLOWCHART_TABLE.symbols, s);

/** Which way the flows run, measured between the centres of the symbols each one joins. */
function flowDirection(connectors: readonly NotationConnector[], at: (id: string) => Point, symbols: readonly NotationSymbol[]): { value: MermaidDirection; reason: string } {
  let down = 0, across = 0, downward = 0;
  for (const c of connectors) {
    const a = at(c.from), b = at(c.to);
    const dx = Math.abs(b.x - a.x), dy = Math.abs(b.y - a.y);
    down += dy;
    across += dx;
    if (dy >= dx) downward++;
  }
  const n = connectors.length;
  if (!n) {
    const xs = symbols.map((s) => centre(s.bounds).x), ys = symbols.map((s) => centre(s.bounds).y);
    const wide = xs.length ? Math.max(...xs) - Math.min(...xs) : 0, tall = ys.length ? Math.max(...ys) - Math.min(...ys) : 0;
    return wide > tall
      ? { value: 'LR', reason: `no flows to follow, and the symbols spread across — ${Math.round(wide)} across against ${Math.round(tall)} down` }
      : { value: 'TD', reason: `no flows to follow, and the symbols spread down — ${Math.round(tall)} down against ${Math.round(wide)} across` };
  }
  return across > down
    ? { value: 'LR', reason: `the flows run across — between the symbols they join, ${Math.round(across)} across against ${Math.round(down)} down; ${n - downward} of ${n} flows more across than down` }
    : { value: 'TD', reason: `the flows run down — between the symbols they join, ${Math.round(down)} down against ${Math.round(across)} across; ${downward} of ${n} flows more down than across` };
}

/**
 * The flowchart in Mermaid: `flowchart TD` or `LR`; each symbol in its
 * shape, its words in it; each flow `-->`, `---` or `<-->`, the writing
 * beside it riding on it as `|"…"|`.
 */
export function writeFlowchart(reading: NotationReading, opts: MermaidOptions = {}): MermaidText {
  const T = FLOWCHART_TABLE;
  const symbols = reading.symbols.filter((s) => isFlowSymbol(s.symbol));
  const idOf = mermaidIds(symbols.map((s) => s.id));
  const byId = new Map(symbols.map((s) => [s.id, s]));
  const connectors = reading.connectors.filter((c) => byId.has(c.from) && byId.has(c.to) && c.from !== c.to);
  const labels = new Map(reading.labels.map((l) => [l.id, l]));

  const direction = opts.direction
    ? { value: opts.direction, reason: `asked for ${opts.direction === 'LR' ? 'across (LR)' : 'down (TD)'}` }
    : flowDirection(connectors, (id) => centre(byId.get(id)!.bounds), symbols);
  const ordered = inReadingOrder(symbols, (s) => s.bounds, (s) => idOf.get(s.id)!, direction.value === 'LR');
  const place = new Map(ordered.map((s, i) => [s.id, i]));

  // The words of a symbol or a flow: a word on its own ink, then the writing
  // inside it, then beside it — each in reading order; unread writing as the
  // placeholder, once for a run of it.
  const unread: { on: 'symbol' | 'flow'; where: string; ids: string[] }[] = [];
  const unreadIds = new Set<string>();
  const wordsOf = (own: string | undefined, labelIds: readonly string[], owner: string, on: 'symbol' | 'flow', where: string): string | null => {
    const mine = [...new Set([...labelIds, ...reading.labels.filter((l) => l.of === owner).map((l) => l.id)])].map(
      (id): NotationLabel => labels.get(id) ?? { id, of: owner, where: 'beside', role: 'label', confidence: 0, reason: 'writing' }
    );
    const inOrder = (at: NotationLabel['where']) => inReadingOrder(mine.filter((l) => l.where === at), (l) => l.bounds, (l) => l.id);
    const parts: string[] = own?.trim() ? [own.trim()] : [];
    const missing: string[] = [];
    for (const l of [...inOrder('inside'), ...inOrder('beside')]) {
      const text = l.text?.trim();
      if (text) parts.push(text);
      else if (opts.readWith?.(l.id)) continue;
      else {
        missing.push(l.id);
        if (parts[parts.length - 1] !== UNREAD_WRITING) parts.push(UNREAD_WRITING);
      }
    }
    if (missing.length) {
      unread.push({ on, where, ids: missing });
      missing.forEach((id) => unreadIds.add(id));
    }
    return parts.length ? parts.join(' ') : null;
  };

  const lines = [`${T.mermaid.header} ${direction.value}`];
  const ids: Record<string, string> = {};
  const marks: Record<string, string[]> = {};
  const blank: string[] = [];
  for (const s of ordered) {
    const m = idOf.get(s.id)!;
    const shape = T.symbols[s.symbol as FlowSymbol].mermaid;
    const words = wordsOf(s.text, s.labels, s.id, 'symbol', m);
    if (words === null) blank.push(m);
    const text = words ?? BLANK;
    lines.push(`    ${m}${shape.open}${mermaidString(text, { colons: PREPROCESSED.test(m + text) })}${shape.close}`);
    ids[m] = s.id;
    marks[m] = [...new Set(s.ids.length ? s.ids : [s.id])].sort(naturalCompare);
  }

  const arrows = T.connectors.flow.mermaid;
  const links: MermaidLink[] = [];
  const written = [...connectors].sort((p, q) => place.get(p.from)! - place.get(q.from)! || place.get(p.to)! - place.get(q.to)! || naturalCompare(p.id, q.id));
  for (const c of written) {
    const a = idOf.get(c.from)!, b = idOf.get(c.to)!;
    const arrow = c.direction === 'forward' ? arrows.forward : c.direction === 'both' ? arrows.both : arrows.none;
    const words = wordsOf(c.text, c.labels, c.id, 'flow', `${a} ${arrow} ${b}`);
    const label = words === null ? '' : arrows.label.replace('%label%', mermaidString(words, { colons: PREPROCESSED.test(a + b + words) }));
    lines.push(`    ${a} ${arrow}${label} ${b}`);
    links.push({ index: links.length, id: c.id, ids: [c.id, ...[...new Set(c.ids)].filter((x) => x !== c.id).sort(naturalCompare)], from: a, to: b });
  }

  // What the text does not say as drawn.
  const notes: string[] = [];
  if (unread.length) {
    const n = unread.reduce((k, u) => k + u.ids.length, 0);
    const onSymbols = unread.filter((u) => u.on === 'symbol').map((u) => u.where);
    const onFlows = unread.filter((u) => u.on === 'flow').map((u) => u.where);
    const where = [onSymbols.length ? `in ${list(onSymbols)}` : '', onFlows.length ? `on the flow${onFlows.length === 1 ? '' : 's'} ${list(onFlows)}` : ''].filter(Boolean).join('; ');
    notes.push(`${n === 1 ? 'one piece of writing has' : `${count(n)} pieces of writing have`} not been read, so ${n === 1 ? 'its words are' : 'their words are'} not known — written "${UNREAD_WRITING}": ${where}`);
  }
  if (blank.length) notes.push(`${blank.length === 1 ? 'one symbol has' : `${count(blank.length)} symbols have`} no writing in ${blank.length === 1 ? 'it and is' : 'them and are'} written blank: ${list(blank)}`);
  const said = new Set<string>([...symbols.flatMap((s) => [s.id, ...s.ids]), ...connectors.flatMap((c) => c.ids), ...reading.labels.filter((l) => l.of && (byId.has(l.of) || connectors.some((c) => c.id === l.of))).map((l) => l.id)]);
  const alone = reading.labels.filter((l) => !said.has(l.id)).map((l) => l.id).sort(naturalCompare);
  if (alone.length) notes.push(`writing that labels nothing in the chart is left out: ${list(alone)}`);
  const left = Object.keys(reading.roles).filter((id) => !said.has(id) && !alone.includes(id)).sort(naturalCompare);
  if (left.length) notes.push(`${left.length === 1 ? 'one mark' : `${count(left.length)} marks`} the chart has no place for ${left.length === 1 ? 'is' : 'are'} left out: ${list(left.map((id) => `${id} (${reading.roles[id]})`))}`);

  return {
    text: lines.join('\n') + '\n',
    notation: reading.notation,
    diagram: T.mermaid.header,
    direction,
    ids,
    marks,
    links,
    unread: [...unreadIds].sort(naturalCompare),
    notes,
  };
}

// The flowchart is said from the start; D4–D6 register theirs beside it.
registerMermaidWriter(FLOWCHART_TABLE.notation, writeFlowchart);
