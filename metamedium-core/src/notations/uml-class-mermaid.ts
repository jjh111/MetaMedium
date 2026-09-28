// Mermaid out and in for the class diagram (V1-PLAN §3, §9 D4; D2 and D3's
// rules, for `classDiagram`).
//
// Out: a class-diagram reading (uml-class.ts) said as Mermaid text, at tier 1:
//
//   classDiagram
//       class stroke_1["Animal"] {
//           +name: String
//           +eat()
//       }
//       class stroke_4["Dog"]
//       stroke_1 <|-- stroke_4
//
//   - **D2's rules hold.** Ids are the marks' own said safely (`mermaidIds`:
//     a class is its box's stroke, `stroke_1`, or its figure, `figure_12_13`);
//     a class's name is its label, quoted and escaped (`mermaidString`);
//     writing nobody has read is "(unread writing)", named in `unread` and the
//     notes, never invented; the order is the drawing's — classes in reading
//     order, relations by the classes they join — never the log's.
//   - **A member is a line of the class's body**, where Mermaid reads raw text
//     up to a brace or the line's end: each character Mermaid would read as
//     something else is written as the entity it decodes back to —
//     `unescapeMermaid` is still the exact inverse — and so is every
//     parenthesis of an attribute, because Mermaid takes any member with a `)`
//     for a method, and a member is a method only when its words say so. So
//     "(unread writing)" in a member is `#40;unread writing#41;`: its words do
//     not say it is a method, and Mermaid shows it among the attributes.
//     Attributes are written before methods, as Mermaid draws them.
//   - **A relation is written from the class at its marked end**, the way
//     Mermaid's own examples write them: `Parent <|-- Child`, `Whole *-- Part`,
//     `Whole o-- Part`; an association from the class it leaves, `From --> To`;
//     a plain link in reading order. A multiplicity is a quoted cardinality
//     beside the class it stands at (`A "1" *-- "*" B`), a relation's label
//     follows a colon (`A --> B : owns`).
//   - **The direction is measured** as D2 measures a flowchart's: the
//     relations, centre to centre, run down the page or across it. Down is
//     Mermaid's default for a class diagram and is not written; across is
//     `direction LR`.
//
// In: a reader for `classDiagram` — the subset the writer writes, and the
// common forms a hand writes besides — and the parse drawn as ink the notation
// reads: each class a box with two lines across it (a name, attributes,
// methods, as Mermaid draws one), its name a label on its box and each
// compartment's members a label on the line that opens it; each relation a
// line from side to side, bound at both ends, with its head drawn where the
// text puts it — a hollow triangle, a diamond (filled, in one stroke), an
// arrow's own barb or a chevron — and each multiplicity a short piece of
// writing ink beside its end, labelled with its words. Laid out by D3's
// layered layout, which keeps the text's order as its reading order. Tier 1,
// nothing derived in the log; wrap the call in `session.withTool` for one undo.

import type { Bounds, Point } from '../types';
import type { Session } from '../session/session';
import { getRep } from '../session/nodes';
import { magnetSites } from '../session/magnets';
import { alongIndex } from '../session/ports';
import { strokeFor } from '../session/synthesize';
import type { NotationReading } from './notation';
import type { MermaidDirection, MermaidLink, MermaidOptions, MermaidText } from './mermaid';
import { inReadingOrder, mermaidIds, mermaidString, naturalCompare, registerMermaidWriter, unescapeMermaid, UNREAD_WRITING } from './mermaid';
import type { DrawMermaidOptions, DrawnEnd, DrawnMermaid, MermaidFlow, MermaidLinkRead, MermaidNodeRead, MermaidRead, MermaidReader, MermaidRefusal } from './mermaid-in';
import { MERMAID_MAX_LINKS, MERMAID_MAX_NODES, MERMAID_TEXT_PX, registerMermaidReader } from './mermaid-in';
import { layoutLayered } from './layered';
import type { UmlClassReading, UmlClassSymbol, UmlMarker, UmlMember, UmlRelation } from './uml-class';
import { readUmlClass, UML_CLASS_TABLE } from './uml-class';

const T = UML_CLASS_TABLE;
const COUNT = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
const count = (n: number) => COUNT[n] ?? String(n);
const list = (xs: readonly string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
const some = (xs: readonly string[], max = 4) => (xs.length > max ? `${xs.slice(0, max).join(', ')} and ${count(xs.length - max)} more` : list(xs));
const centre = (b: Bounds): Point => ({ x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 });

// ===== Out: the text =====

/** What Mermaid would read as something other than the character in a member, a label after a colon or a cardinality: the entity it decodes back to. */
const ENTITY: Record<string, string> = {
  '#': '#35;', '"': '#quot;', '%': '#37;', '`': '#96;', '<': '#lt;', '>': '#gt;', '&': '#amp;',
  '{': '#123;', '}': '#125;', '[': '#91;', ']': '#93;', '~': '#126;', ';': '#59;',
};
/** Mermaid's preprocessing (mermaidAPI's encodeEntities) strips the last character of a line matching these (as D2 says). */
const PREPROCESSED = /style|classDef/;

/**
 * A member as a line of a class's body: every character Mermaid would read as
 * something else written as its entity; an attribute's parentheses too, so
 * Mermaid never takes it for a method; a line break as a space.
 */
export function memberLine(text: string, kind: UmlMember['kind'], opts: { colons?: boolean } = {}): string {
  return [...String(text).replace(/\s+/g, ' ').trim()]
    .map((ch) => ENTITY[ch] ?? (kind !== 'method' && (ch === '(' || ch === ')') ? `#${ch.charCodeAt(0)};` : opts.colons && ch === ':' ? '#58;' : ch))
    .join('');
}

/** A relation's label after its colon: every character Mermaid would read otherwise as its entity, a colon too (Mermaid's label ends at the next). */
function relationLabel(text: string): string {
  return [...String(text).replace(/\s+/g, ' ').trim()].map((ch) => ENTITY[ch] ?? (ch === ':' ? '#58;' : ch)).join('');
}

/** Words with the placeholder taken out, for writing read with its line (`readWith`). */
const withoutPlaceholder = (text: string) => text.split(UNREAD_WRITING).join(' ').replace(/\s+/g, ' ').trim();

/** Which way the relations run, measured between the centres of the classes each joins (D2's measure for a flowchart's flows). */
function directionOf(relations: readonly UmlRelation[], at: (id: string) => Point, classes: readonly UmlClassSymbol[]): { value: MermaidDirection; reason: string } {
  let down = 0, across = 0, downward = 0;
  for (const r of relations) {
    const a = at(r.from), b = at(r.to);
    const dx = Math.abs(b.x - a.x), dy = Math.abs(b.y - a.y);
    down += dy;
    across += dx;
    if (dy >= dx) downward++;
  }
  const n = relations.length;
  if (!n) {
    const xs = classes.map((s) => centre(s.bounds).x), ys = classes.map((s) => centre(s.bounds).y);
    const wide = xs.length ? Math.max(...xs) - Math.min(...xs) : 0, tall = ys.length ? Math.max(...ys) - Math.min(...ys) : 0;
    return wide > tall
      ? { value: 'LR', reason: `no relations to follow, and the classes spread across — ${Math.round(wide)} across against ${Math.round(tall)} down` }
      : { value: 'TD', reason: `no relations to follow, and the classes spread down — ${Math.round(tall)} down against ${Math.round(wide)} across` };
  }
  return across > down
    ? { value: 'LR', reason: `the relations run across — between the classes they join, ${Math.round(across)} across against ${Math.round(down)} down; ${n - downward} of ${n} more across than down` }
    : { value: 'TD', reason: `the relations run down — between the classes they join, ${Math.round(down)} down against ${Math.round(across)} across; ${downward} of ${n} more down than across` };
}

/**
 * The class diagram in Mermaid: `classDiagram`, `direction LR` when the
 * relations run across; each class with its name and its members, attributes
 * first; each relation from the class at its marked end, its multiplicities
 * quoted beside the classes they stand at, its label after a colon.
 */
export function writeUmlClass(reading: NotationReading, opts: MermaidOptions = {}): MermaidText {
  const r = reading as UmlClassReading;
  const classes = r.symbols.filter((s) => s.symbol === 'class');
  const idOf = mermaidIds(classes.map((s) => s.id));
  const byId = new Map(classes.map((s) => [s.id, s]));
  const relations = r.connectors.filter((c) => byId.has(c.from) && byId.has(c.to) && c.from !== c.to);
  const labelOf = new Map(r.labels.map((l) => [l.id, l]));
  const readWith = (id: string) => !!opts.readWith?.(id);

  const direction = opts.direction
    ? { value: opts.direction, reason: `asked for ${opts.direction === 'LR' ? 'across (LR)' : 'down (TD)'}` }
    : directionOf(relations, (id) => centre(byId.get(id)!.bounds), classes);
  const ordered = inReadingOrder(classes, (s) => s.bounds, (s) => idOf.get(s.id)!, direction.value === 'LR');
  const place = new Map(ordered.map((s, i) => [s.id, i]));

  const unread: { where: string; ids: string[] }[] = [];
  const unreadIds = new Set<string>();
  /**
   * What a name, a member or a multiplicity says: its words, the placeholder
   * standing for each run of writing nobody has read — or, when every such
   * piece was read with its line, only the words known; null when that leaves
   * nothing.
   */
  const said = (text: string | undefined, pieces: readonly string[], where: string): string | null => {
    const missing = pieces.filter((id) => !readWith(id));
    if (pieces.length && !missing.length) return withoutPlaceholder(text ?? '') || null;
    if (missing.length) {
      unread.push({ where, ids: missing });
      missing.forEach((id) => unreadIds.add(id));
    }
    return text ?? (pieces.length ? UNREAD_WRITING : null);
  };

  const lines: string[] = [T.mermaid.header];
  if (direction.value === 'LR') lines.push('    direction LR');
  const ids: Record<string, string> = {};
  const marks: Record<string, string[]> = {};
  const blank: string[] = [];
  const misplaced: string[] = [];
  for (const s of ordered) {
    const m = idOf.get(s.id)!;
    const name = said(s.name.text, s.name.unread, `the name of ${m}`);
    if (name === null) blank.push(m);
    // Attributes, then methods — as Mermaid draws them; each in the order drawn.
    const members = [...s.members.filter((x) => x.kind !== 'method'), ...s.members.filter((x) => x.kind === 'method')];
    const body: string[] = [];
    for (const x of members) {
      const words = said(x.text, x.unread, `a member of ${m}`);
      if (words === null) continue;
      if (s.lines.length === 2 && ((x.kind === 'method' && x.compartment === 2) || (x.kind === 'attribute' && x.compartment === 3))) misplaced.push(`“${x.text}” in ${m}`);
      body.push(`        ${memberLine(words, x.kind, { colons: PREPROCESSED.test(words) })}`);
    }
    const text = name ?? ' ';
    const head = `    class ${m}[${mermaidString(text, { colons: PREPROCESSED.test(m + text) })}]`;
    if (body.length) lines.push(`${head} {`, ...body, '    }');
    else lines.push(head);
    ids[m] = s.id;
    marks[m] = [...new Set(s.ids.length ? s.ids : [s.id])].sort(naturalCompare);
  }

  // Relations: from the class at the marked end, by the classes they join.
  const written = relations.map((c) => {
    const ends = [
      { end: c.ends.from, cls: c.from },
      { end: c.ends.to, cls: c.to },
    ];
    const marked = ends.filter((e) => e.end.marker);
    let first: (typeof ends)[number];
    if (marked.length === 1) first = marked[0].end.marker === 'association' ? ends.find((e) => e !== marked[0])! : marked[0];
    else if (marked.length === 2 && c.ends.to.marker !== 'association') first = ends[1];
    else first = place.get(c.from)! <= place.get(c.to)! ? ends[0] : ends[1];
    const second = ends.find((e) => e !== first)!;
    return { c, first, second };
  });
  written.sort((p, q) => place.get(p.first.cls)! - place.get(q.first.cls)! || place.get(p.second.cls)! - place.get(q.second.cls)! || naturalCompare(p.c.id, q.c.id));
  const links: MermaidLink[] = [];
  for (const { c, first, second } of written) {
    const a = idOf.get(first.cls)!, b = idOf.get(second.cls)!;
    const left = first.end.marker ? T.connectors[first.end.marker].mermaid.left : '';
    const right = second.end.marker ? T.connectors[second.end.marker].mermaid.right : '';
    const card = (e: typeof first, at: string) => {
      const mult = e.end.multiplicity;
      if (!mult) return '';
      const w = said(mult.text, mult.unread, `the multiplicity at ${at} on ${a} — ${b}`);
      return w === null ? '' : mermaidString(w);
    };
    const ca = card(first, a), cb = card(second, b);
    // Its label: a word on its own ink, then the writing beside its middle.
    const multIds = new Set([...(c.ends.from.multiplicity?.ids ?? []), ...(c.ends.to.multiplicity?.ids ?? [])]);
    const middle = c.labels.filter((id) => !multIds.has(id));
    const parts: string[] = c.text?.trim() ? [c.text.trim()] : [];
    const missing: string[] = [];
    for (const id of middle) {
      const t = labelOf.get(id)?.text?.trim();
      if (t) parts.push(t);
      else if (readWith(id)) continue;
      else {
        missing.push(id);
        if (parts[parts.length - 1] !== UNREAD_WRITING) parts.push(UNREAD_WRITING);
      }
    }
    if (missing.length) {
      unread.push({ where: `the label of ${a} — ${b}`, ids: missing });
      missing.forEach((id) => unreadIds.add(id));
    }
    const label = parts.length ? ` : ${relationLabel(parts.join(' '))}` : '';
    lines.push(`    ${a}${ca ? ` ${ca}` : ''} ${left}${T.mermaid.line}${right} ${cb ? `${cb} ` : ''}${b}${label}`);
    links.push({ index: links.length, id: c.id, ids: [c.id, ...[...new Set(c.ids)].filter((x) => x !== c.id).sort(naturalCompare)], from: a, to: b });
  }

  // What the text does not say as drawn.
  const notes: string[] = [];
  const pieces = [...unreadIds].length;
  if (unread.length) {
    const where = [...new Set(unread.map((u) => u.where))];
    notes.push(`${pieces === 1 ? 'one piece of writing has' : `${count(pieces)} pieces of writing have`} not been read, so ${pieces === 1 ? 'its words are' : 'their words are'} not known — written "${UNREAD_WRITING}" (in a member, with its parentheses as entities: its words do not say it is a method, so Mermaid shows it among the attributes): ${some(where)}`);
  }
  if (blank.length) notes.push(`${blank.length === 1 ? 'one class has' : `${count(blank.length)} classes have`} no writing in ${blank.length === 1 ? 'its' : 'their'} top compartment and ${blank.length === 1 ? 'is' : 'are'} written with a blank name: ${list(blank)}`);
  if (misplaced.length) notes.push(`${misplaced.length === 1 ? 'a member stands' : `${count(misplaced.length)} members stand`} in the other compartment from what ${misplaced.length === 1 ? 'its words say it is' : 'their words say they are'}, and Mermaid puts ${misplaced.length === 1 ? 'it' : 'them'} where the words do: ${some(misplaced)}`);
  const lower = relations.filter((c) => c.readings.length > 1 && c.readings[1].confidence > 0.6 * c.confidence);
  if (lower.length) notes.push(`${lower.length === 1 ? 'a relation’s head reads' : `${count(lower.length)} relations’ heads read`} more than one way, and ${lower.length === 1 ? 'it is' : 'they are'} written as the likelier: ${some(lower.map((c) => `${idOf.get(c.from)} — ${idOf.get(c.to)} as ${c.kind}, or ${c.readings[1].kind}`))}`);
  const saidIds = new Set<string>([...classes.flatMap((s) => [s.id, ...s.ids, ...s.labels]), ...relations.flatMap((c) => [...c.ids, ...c.labels])]);
  const alone = r.labels.filter((l) => !saidIds.has(l.id)).map((l) => l.id).sort(naturalCompare);
  if (alone.length) notes.push(`writing that belongs to no class or relation is left out: ${list(alone)}`);
  const left = Object.keys(r.roles).filter((id) => !saidIds.has(id) && !alone.includes(id)).sort(naturalCompare);
  if (left.length) notes.push(`${left.length === 1 ? 'one mark' : `${count(left.length)} marks`} the diagram has no place for ${left.length === 1 ? 'is' : 'are'} left out: ${some(left.map((id) => `${id} (${r.roles[id]})`), 8)}`);

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

registerMermaidWriter(T.notation, writeUmlClass);

// ===== In: reading a classDiagram text =====

/** A class as the text gives it: its members as written, and what Mermaid takes each for. */
export interface ClassNodeRead extends MermaidNodeRead {
  symbol: 'class';
  /** Each member, its words decoded, in the order written: a method when Mermaid takes it for one — a `)` after its first character. */
  members: { text: string; kind: 'attribute' | 'method'; line: number }[];
}

/** A relation as the text gives it. */
export interface ClassLinkRead extends MermaidLinkRead {
  /** The classes as written, left and right of the relation — the layout ranks the left one first. */
  left: string;
  right: string;
  /** What the text puts at each end. */
  markers: { left?: UmlMarker; right?: UmlMarker };
  /** The quoted cardinality beside each end, decoded. */
  cardinality: { left?: string; right?: string };
  /** Written dashed (`..`): drawn solid, and said. */
  dashed: boolean;
}

/** A classDiagram text as read, before anything is drawn. */
export interface ClassDiagramRead extends MermaidRead {
  nodes: ClassNodeRead[];
  links: ClassLinkRead[];
}

/** A class's name as the text may write it: letters, digits, underscores, `$` — and generics between tildes, `Square~Shape~`. */
const CLASS_ID = /[\p{L}\p{N}_$]+(?:~[^~\s]+~)?/uy;
/** A relation between two classes: a marker at either end, and the line — `<|--`, `*--`, `o--`, `-->`, `--`, `..>`, `..|>`, `<|--|>` … */
const RELATION = /(<\||\*|o|<|\(\))?(--|\.\.)(\|>|\*|o|>|\(\))?/y;
const LEFT: Record<string, UmlMarker> = { '<|': 'inheritance', '*': 'composition', o: 'aggregation', '<': 'association' };
const RIGHT: Record<string, UmlMarker> = { '|>': 'inheritance', '*': 'composition', o: 'aggregation', '>': 'association' };

/** Statements a class diagram's reader does not draw, by their first word, and why. */
const CLASS_NOT_DRAWN: [RegExp, string][] = [
  [/^note\b/, 'a note is not drawn yet'],
  [/^(style|classDef|cssClass)\b/, 'styling: the board draws in its hand’s own colour, and a Mermaid style is not read'],
  [/^(click|link|callback|call|href)\b/, 'an interaction the board does not run'],
  [/^(accTitle|accDescr)\b/, 'an accessible title or description, not read yet'],
  [/^<</, 'an annotation (<<…>>) is not drawn yet'],
];

/** Words as Mermaid shows them: entities decoded, runs of space as one, trimmed. */
const decoded = (raw: string) => unescapeMermaid(`"${raw}"`).replace(/[ \t]+/g, ' ').trim();

const FLOWS: Record<string, MermaidFlow> = { TB: 'TD', TD: 'TD', BT: 'BT', LR: 'LR', RL: 'RL' };

/** Read a class-diagram text — `classDiagram` — into its classes and relations. Never throws. */
export function readClassDiagramText(text: string): ClassDiagramRead {
  const all = String(text ?? '').replace(/\r\n?/g, '\n').split('\n');
  const notes = new Set<string>();
  const refused: MermaidRefusal[] = [];
  const nodes: ClassNodeRead[] = [];
  const links: ClassLinkRead[] = [];
  const byId = new Map<string, ClassNodeRead>();
  let direction: MermaidFlow = 'TD';
  let keyword = '';
  const dashed: string[] = [];
  const generic: string[] = [];

  const node = (raw: string, line: number): ClassNodeRead => {
    const g = /^(.*?)~([^~]+)~$/.exec(raw);
    const id = g ? g[1] : raw;
    let n = byId.get(id);
    if (!n) {
      n = { id, line, symbol: 'class', shape: '', text: g ? `${id}<${g[2]}>` : id, members: [] };
      byId.set(id, n);
      nodes.push(n);
      if (g) generic.push(id);
    }
    return n;
  };
  const member = (n: ClassNodeRead, raw: string, line: number) => {
    const t = raw.trim();
    if (!t) return;
    if (t.startsWith('<<') && t.endsWith('>>')) {
      refused.push({ line, text: t, reason: 'an annotation (<<…>>) is not drawn yet' });
      return;
    }
    // Mermaid's own rule: a member with a `)` after its first character is a method.
    n.members.push({ text: decoded(t), kind: t.indexOf(')') > 0 ? 'method' : 'attribute', line });
  };

  let body: { n: ClassNodeRead } | null = null;
  let depth = 0; // namespaces opened and not yet closed
  let header: number | null = null;
  for (let i = 0; i < all.length; i++) {
    const n = i + 1;
    let t = all[i].trim();
    if (!t || t.startsWith('%%{')) {
      if (t) refused.push({ line: n, text: t, reason: 'a directive configures mermaid.js’s own rendering — nothing on the board takes it' });
      continue;
    }
    if (t.startsWith('%%')) continue;
    if (header === null) {
      if (t === '---') {
        const close = all.findIndex((l, k) => k > i && l.trim() === '---');
        const last = close >= 0 ? close : all.length - 1;
        refused.push({ line: n, text: '---', reason: `front matter (lines ${n}–${last + 1}) configures mermaid.js — nothing on the board takes it` });
        i = last;
        continue;
      }
      const m = /^(classDiagram(?:-v2)?)\b\s*(.*)$/.exec(t);
      header = n;
      keyword = m ? m[1] : (/^[A-Za-z][\w-]*/.exec(t)?.[0] ?? '');
      if (!m) refused.push({ line: n, text: t, reason: 'a class diagram opens with “classDiagram”' });
      else if (m[2]) refused.push({ line: n, text: m[2], reason: 'nothing is read after the header on its own line' });
      continue;
    }
    // Inside a class's body: a member a line, until the brace that closes it.
    if (body) {
      if (t === '}') {
        body = null;
        continue;
      }
      const close = t.lastIndexOf('}');
      if (close >= 0 && t.slice(close + 1).trim() === '') {
        member(body.n, t.slice(0, close), n);
        body = null;
        continue;
      }
      member(body.n, t, n);
      continue;
    }
    // A statement may end in a semicolon — never the one that ends an entity (`#41;`).
    if (t.endsWith(';') && !/#\w+;$/.test(t)) t = t.slice(0, -1).trim();
    if (t === '}') {
      if (depth > 0) depth--;
      else refused.push({ line: n, text: t, reason: 'a closing brace with nothing open' });
      continue;
    }
    const d = /^direction\s+(TB|TD|BT|LR|RL)$/.exec(t);
    if (d) {
      direction = FLOWS[d[1]];
      continue;
    }
    if (/^namespace\b/.test(t)) {
      refused.push({ line: n, text: t, reason: 'a namespace’s frame is not drawn yet — the classes inside it are' });
      if (t.endsWith('{')) depth++;
      continue;
    }
    const not = CLASS_NOT_DRAWN.find(([re]) => re.test(t));
    if (not) {
      refused.push({ line: n, text: t, reason: not[1] });
      continue;
    }
    // `class Id`, `class Id["label"]`, `class Id:::css`, and a body opened with `{`.
    const cls = /^class\s+/.exec(t);
    if (cls) {
      CLASS_ID.lastIndex = cls[0].length;
      const idm = CLASS_ID.exec(t);
      if (!idm) {
        refused.push({ line: n, text: t, reason: 'a class statement names no class' });
        continue;
      }
      const k = node(idm[0], n);
      let rest = t.slice(CLASS_ID.lastIndex);
      const label = /^\s*\[\s*"([^"]*)"\s*\]/.exec(rest);
      if (label) {
        k.text = decoded(label[1]);
        rest = rest.slice(label[0].length);
      }
      const css = /^:::[\w-]+/.exec(rest.trim());
      if (css) {
        notes.add('a class’s style (:::…) is not drawn — the board draws in its hand’s own colour');
        rest = rest.trim().slice(css[0].length);
      }
      rest = rest.trim();
      if (rest.startsWith('{')) {
        const inner = rest.slice(1);
        const close = inner.lastIndexOf('}');
        if (close >= 0) inner.slice(0, close).split(/\n/).forEach((x) => member(k, x, n));
        else {
          if (inner.trim()) member(k, inner, n);
          body = { n: k };
        }
      } else if (rest) refused.push({ line: n, text: t, reason: `“${rest.slice(0, 16)}” follows the class and is not read` });
      continue;
    }
    // A relation: `A ["1"] <|-- ["*"] B [: label]`.
    const rel = readRelation(t);
    if (rel) {
      if ('refuse' in rel) {
        refused.push({ line: n, text: t, reason: rel.refuse });
        continue;
      }
      if (rel.left === rel.right) {
        refused.push({ line: n, text: t, reason: `a relation from ${rel.left} to itself — a line joins two classes, so it is not drawn` });
        continue;
      }
      const a = node(rel.left, n), b = node(rel.right, n);
      const markers = { ...(rel.markers.left ? { left: rel.markers.left } : {}), ...(rel.markers.right ? { right: rel.markers.right } : {}) };
      const head: MermaidLinkRead['head'] = markers.left && markers.right ? 'both' : markers.left || markers.right ? 'forward' : 'none';
      const [from, to] = markers.left && !markers.right ? [b.id, a.id] : [a.id, b.id];
      if (rel.dashed) dashed.push(`${a.id} ${rel.written} ${b.id}`);
      links.push({
        index: links.length,
        line: n,
        from,
        to,
        head,
        written: rel.written,
        ...(rel.label !== undefined ? { label: rel.label } : {}),
        left: a.id,
        right: b.id,
        markers,
        cardinality: { ...(rel.cards.left !== undefined ? { left: rel.cards.left } : {}), ...(rel.cards.right !== undefined ? { right: rel.cards.right } : {}) },
        dashed: rel.dashed,
      });
      continue;
    }
    // A member statement: `A : +name`.
    const mem = /^([\p{L}\p{N}_$]+)\s*:(.*)$/u.exec(t);
    if (mem) {
      member(node(mem[1], n), mem[2], n);
      continue;
    }
    refused.push({ line: n, text: t, reason: 'a statement the class diagram’s reader cannot parse' });
  }
  if (header === null) refused.push({ line: 1, text: '', reason: 'nothing to read: a class diagram opens with “classDiagram”' });
  if (body) refused.push({ line: all.length, text: '', reason: `the body of ${(body as { n: ClassNodeRead }).n.id} is never closed with “}” — its members are read` });

  const said = [...notes];
  if (direction === 'RL' || direction === 'BT')
    said.push(`drawn ${direction === 'RL' ? 'right to left' : 'bottom to top'}, as the text asks — read back, a drawing says ${direction === 'RL' ? 'LR' : 'down (the default)'} by the way its relations run`);
  if (dashed.length) said.push(`the board reads no dashed line yet: ${dashed.length === 1 ? 'a dashed relation is' : 'dashed relations are'} drawn solid, and read back ${dashed.length === 1 ? 'it says' : 'they say'} so — ${some(dashed)}`);
  if (generic.length) said.push(`a class’s generic type (~…~) is drawn as part of its name — ${some(generic)}`);
  return { keyword, notation: keyword ? T.notation : null, direction, nodes, links, notes: said, refused: refused.sort((a, b) => a.line - b.line) };
}

/** A relation statement read, or why it is refused — null when the line holds no relation. */
function readRelation(t: string): { left: string; right: string; markers: { left?: UmlMarker; right?: UmlMarker }; cards: { left?: string; right?: string }; label?: string; written: string; dashed: boolean } | { refuse: string } | null {
  CLASS_ID.lastIndex = 0;
  const a = CLASS_ID.exec(t);
  if (!a) return null;
  let i = CLASS_ID.lastIndex;
  const ws = () => {
    while (i < t.length && /\s/.test(t[i])) i++;
  };
  const quoted = (): string | undefined => {
    if (t[i] !== '"') return undefined;
    const end = t.indexOf('"', i + 1);
    if (end < 0) return undefined;
    const q = t.slice(i + 1, end);
    i = end + 1;
    return decoded(q);
  };
  ws();
  const leftCard = quoted();
  ws();
  RELATION.lastIndex = i;
  const r = RELATION.exec(t);
  if (!r) return null;
  const [written, lm, line, rm] = r;
  i = RELATION.lastIndex;
  if (rm === 'o' && i < t.length && !/[\s"]/.test(t[i])) return null;
  if (lm === '()' || rm === '()') return { refuse: 'a lollipop interface (()--) is not drawn yet' };
  ws();
  const rightCard = quoted();
  ws();
  CLASS_ID.lastIndex = i;
  const b = CLASS_ID.exec(t);
  if (!b) return { refuse: 'a relation that leads nowhere' };
  i = CLASS_ID.lastIndex;
  ws();
  let label: string | undefined;
  if (t[i] === ':') {
    label = decoded(t.slice(i + 1));
    i = t.length;
  }
  if (i < t.length) return { refuse: `“${t.slice(i, i + 16)}” follows the relation` };
  const gen = (x: string) => x.replace(/~[^~]+~$/, '');
  return {
    left: gen(a[0]),
    right: gen(b[0]),
    markers: { ...(lm && LEFT[lm] ? { left: LEFT[lm] } : {}), ...(rm && RIGHT[rm] ? { right: RIGHT[rm] } : {}) },
    cards: { ...(leftCard !== undefined ? { left: leftCard } : {}), ...(rightCard !== undefined ? { right: rightCard } : {}) },
    ...(label ? { label } : {}),
    written,
    dashed: line === '..',
  };
}

// ===== In: drawing a read class diagram =====

/** A character's width, and a line of words, in text sizes (D3's). */
const CHAR = 0.6;
const LINE = 1.4;
/** A class is at least this wide, and at most, in text sizes. */
const CLASS_MIN = 9;
const CLASS_MAX = 24;
/** The padding a compartment has above and below its lines, and an empty one's height, in text sizes. */
const PAD = 0.8;
const EMPTY = 1.4;
/** The gap between ranks and between neighbours in a rank, in text sizes: room for a head and a multiplicity at each end. */
const RANK_GAP = 7;
const NODE_GAP = 6;
/** A head drawn at a relation's end is this long, in text sizes. */
const HEAD = 1.7;
/** Ink is laid every this many screen pixels along an outline. */
const INK_STEP = 3;
/** An arrow longer than this on screen is drawn with its barb in proportion (D3's). */
const ARROW_PROPORTION_PX = 800;
/**
 * A multiplicity is drawn as a short stroke of writing — a dash, as a hand's
 * “1” is — carrying its words as a label: a confident line, which the letter
 * rules never gather with the lines and heads around it (a scribble beside a
 * line is gathered with it, the line taken for an “l”). This tall, in text
 * sizes, and this far off its relation's line beside the head.
 */
const DASH = 0.9;
const DASH_OFF = 0.8;


const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const add = (a: Point, b: Point): Point => ({ x: a.x + b.x, y: a.y + b.y });
const scaled = (a: Point, k: number): Point => ({ x: a.x * k, y: a.y * k });
const unit = (v: Point): Point => {
  const l = Math.hypot(v.x, v.y) || 1;
  return { x: v.x / l, y: v.y / l };
};

/** A closed outline walked as ink: every `step` along it, back to its start. */
function inkAround(corners: readonly Point[], step: number): Point[] {
  const ring = [...corners, corners[0]];
  const out: Point[] = [{ ...ring[0] }];
  for (let i = 1; i < ring.length; i++) {
    const a = ring[i - 1], b = ring[i];
    const n = Math.max(1, Math.round(Math.hypot(b.x - a.x, b.y - a.y) / step));
    for (let k = 1; k <= n; k++) out.push({ x: a.x + ((b.x - a.x) * k) / n, y: a.y + ((b.y - a.y) * k) / n });
  }
  return out;
}

/** An open path walked as ink: every `step` along it. */
function inkAlong(points: readonly Point[], step: number): Point[] {
  const out: Point[] = [{ ...points[0] }];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i];
    const n = Math.max(1, Math.round(Math.hypot(b.x - a.x, b.y - a.y) / step));
    for (let k = 1; k <= n; k++) out.push({ x: a.x + ((b.x - a.x) * k) / n, y: a.y + ((b.y - a.y) * k) / n });
  }
  return out;
}

/**
 * A head drawn apart, its point on `tip` and pointing along `out` (into the
 * class), `len` long — hand pixels. A triangle; a diamond, square and turned
 * 45°, which the rung reads as a confident rectangle — a flat one reads as
 * nothing sure, and the letter rules would take it for a letter. A filled
 * head is its outline and, apart, a hatch across its inside (`fillInk`),
 * drawn right after the outline.
 */
function headInk(kind: 'triangle' | 'diamond', tip: Point, out: Point, len: number, step: number): Point[] {
  const u = unit(out);
  const v = { x: -u.y, y: u.x };
  const at = (along: number, side: number) => ({ x: tip.x - u.x * along + v.x * side, y: tip.y - u.y * along + v.y * side });
  if (kind === 'triangle') return inkAround([tip, at(len, 0.55 * len), at(len, -0.55 * len)], step);
  return inkAround([tip, at(len / 2, len / 2), at(len, 0), at(len / 2, -len / 2)], step);
}

/** A hatch across a head drawn by `headInk` with the same point, direction and length: a zigzag over its inside. */
function fillInk(kind: 'triangle' | 'diamond', tip: Point, out: Point, len: number, step: number): Point[] {
  const u = unit(out);
  const v = { x: -u.y, y: u.x };
  const pts: Point[] = [];
  const n = 9;
  for (let k = 0; k <= n; k++) {
    const a = 0.12 + (0.76 * k) / n;
    const half = kind === 'triangle' ? 0.55 * len * a : (len / 2) * (1 - Math.abs(2 * a - 1));
    const w = 0.8 * half * (k % 2 ? 1 : -1);
    pts.push({ x: tip.x - u.x * len * a + v.x * w, y: tip.y - u.y * len * a + v.y * w });
  }
  return inkAlong(pts, step);
}


type Side = 'top' | 'right' | 'bottom' | 'left';
const SIDES: Side[] = ['top', 'right', 'bottom', 'left'];

/** A class where it stands: its box, its sides, what it is drawn as. */
interface Standing {
  id: string;
  rank: number;
  box: Bounds;
  mark?: string;
}

/** A side's two ends, as the notation's port runs along it (uml-class.ts, `sidesOf`): top TL→TR, right TR→BR, bottom BR→BL, left BL→TL. */
function sideEnds(b: Bounds, side: Side): [Point, Point] {
  const tl = { x: b.minX, y: b.minY }, tr = { x: b.maxX, y: b.minY }, br = { x: b.maxX, y: b.maxY }, bl = { x: b.minX, y: b.maxY };
  return side === 'top' ? [tl, tr] : side === 'right' ? [tr, br] : side === 'bottom' ? [br, bl] : [bl, tl];
}
const outward: Record<Side, Point> = { top: { x: 0, y: -1 }, right: { x: 1, y: 0 }, bottom: { x: 0, y: 1 }, left: { x: -1, y: 0 } };
const sideMiddle = (b: Bounds, side: Side): Point => {
  const [p, q] = sideEnds(b, side);
  return { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 };
};

/** Whether one score comes before another: the first place they differ decides. */
function lexLess(a: readonly number[], b: readonly number[]): boolean {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] < b[i];
  return false;
}

/** Whether a segment meets a box (Liang–Barsky). */
function meetsBox(p: Point, q: Point, b: Bounds): boolean {
  let t0 = 0, t1 = 1;
  const dx = q.x - p.x, dy = q.y - p.y;
  for (const [pp, qq] of [[-dx, p.x - b.minX], [dx, b.maxX - p.x], [-dy, p.y - b.minY], [dy, b.maxY - p.y]] as [number, number][]) {
    if (pp === 0) {
      if (qq < 0) return false;
      continue;
    }
    const r = qq / pp;
    if (pp < 0) t0 = Math.max(t0, r);
    else t1 = Math.min(t1, r);
    if (t0 > t1) return false;
  }
  return true;
}

/** Beside everything on the board: right of its content, level with its top. The origin when the board is empty. */
function besideContent(session: Session, margin: number): Point {
  const st = session.getState();
  let minY = Infinity, maxX = -Infinity;
  for (const id of st.contentIds) {
    const n = st.nodes.get(id);
    const fp = n && !getRep(n, 'erased') ? (getRep(n, 'fingerprint')?.data as { bounds?: Bounds } | undefined) : undefined;
    const b = fp?.bounds;
    if (!b) continue;
    maxX = Math.max(maxX, b.maxX);
    minY = Math.min(minY, b.minY);
  }
  return Number.isFinite(maxX) ? { x: maxX + margin, y: minY } : { x: 0, y: 0 };
}

/** A relation as drawn — D3's `DrawnLink`, with what the text wrote. */
export interface DrawnClassLink {
  index: number;
  from: string;
  to: string;
  id: string;
  ids: string[];
  /** The relation as the text wrote it: '<|--', '*--', '-->' … */
  written: string;
  label?: string;
  start: DrawnEnd;
  end: DrawnEnd;
}

/** Draw a read class diagram. */
function drawClassDiagramRead(session: Session, read: MermaidRead, opts: DrawMermaidOptions): DrawnMermaid {
  const r = read as ClassDiagramRead;
  const scale = opts.scale && opts.scale > 0 ? opts.scale : 1;
  const pid = opts.participantId;
  const U = MERMAID_TEXT_PX;
  const notes = [...r.notes];
  const refused = [...r.refused];
  let t = opts.at;
  const next = () => t++;

  const nodes = r.nodes.slice(0, MERMAID_MAX_NODES);
  const kept = new Set(nodes.map((n) => n.id));
  if (r.nodes.length > nodes.length) notes.push(`the text holds ${r.nodes.length} classes and the board draws ${MERMAID_MAX_NODES} at most: the first ${MERMAID_MAX_NODES} are drawn`);
  const among = r.links.filter((l) => kept.has(l.left) && kept.has(l.right));
  const links = among.slice(0, MERMAID_MAX_LINKS);
  if (among.length > links.length) notes.push(`the text holds ${among.length} relations among the classes drawn and the board draws ${MERMAID_MAX_LINKS} at most`);
  if (!nodes.length) {
    notes.push('nothing to draw: the text names no class');
    return { notation: r.notation, direction: r.direction, ids: {}, links: [], notes, refused, bounds: null, lastAt: t - 1 };
  }

  // Sizes, in the hand's space: a name, its attributes, its methods — three compartments, as Mermaid draws a class.
  const sizes = new Map(
    nodes.map((n) => {
      const attrs = n.members.filter((m) => m.kind === 'attribute').map((m) => m.text);
      const methods = n.members.filter((m) => m.kind === 'method').map((m) => m.text);
      const name = n.text.trim();
      const longest = Math.max(1, ...[name, ...attrs, ...methods].map((x) => [...x].length));
      const w = clamp(longest * CHAR * U + 3 * U, CLASS_MIN * U, CLASS_MAX * U);
      const band = (k: number) => (k ? k * LINE * U + PAD * U : EMPTY * U);
      const h1 = Math.max(1, name.split('\n').length) * LINE * U + 2 * PAD * U;
      const h2 = band(attrs.length), h3 = band(methods.length);
      return [n.id, { w, h: h1 + h2 + h3, h1, h2, h3, name, attrs, methods }] as const;
    })
  );
  const layout = layoutLayered(
    nodes.map((n) => ({ id: n.id, w: sizes.get(n.id)!.w * scale, h: sizes.get(n.id)!.h * scale })),
    links.map((l) => ({ from: l.left, to: l.right })),
    { direction: r.direction, rankGap: RANK_GAP * U * scale, nodeGap: NODE_GAP * U * scale }
  );
  const origin = opts.origin ?? besideContent(session, CLASS_MIN * U * scale);
  const standing = new Map<string, Standing>();
  for (const n of nodes) {
    const c = add(origin, layout.at.get(n.id)!);
    const z = sizes.get(n.id)!;
    standing.set(n.id, { id: n.id, rank: layout.rank.get(n.id)!, box: { minX: c.x - (z.w * scale) / 2, maxX: c.x + (z.w * scale) / 2, minY: c.y - (z.h * scale) / 2, maxY: c.y + (z.h * scale) / 2 } });
  }

  // The classes: each box, then the two lines across it, then its words — its name on the box, each compartment's members on the line that opens it.
  const ids: Record<string, string> = {};
  const placeholder: string[] = [];
  const drawnMarks: string[] = [];
  for (const n of nodes) {
    const k = standing.get(n.id)!, z = sizes.get(n.id)!;
    const b = k.box;
    const box = session.addStroke(strokeFor({ shape: 'rectangle', x: b.minX, y: b.minY, w: b.maxX - b.minX, h: b.maxY - b.minY })!, next(), pid, scale, { content: true });
    k.mark = box;
    ids[n.id] = box;
    const y1 = b.minY + z.h1 * scale, y2 = y1 + z.h2 * scale;
    const l1 = session.addStroke(strokeFor({ shape: 'line', from: { x: b.minX, y: y1 }, to: { x: b.maxX, y: y1 } })!, next(), pid, scale, { content: true });
    const l2 = session.addStroke(strokeFor({ shape: 'line', from: { x: b.minX, y: y2 }, to: { x: b.maxX, y: y2 } })!, next(), pid, scale, { content: true });
    drawnMarks.push(box, l1, l2);
    if (z.name) session.label({ nodeId: box, text: z.name, participantId: pid, at: next() });
    if (z.attrs.length) session.label({ nodeId: l1, text: z.attrs.join('\n'), participantId: pid, at: next() });
    if (z.methods.length) session.label({ nodeId: l2, text: z.methods.join('\n'), participantId: pid, at: next() });
    if ([z.name, ...z.attrs, ...z.methods].includes(UNREAD_WRITING)) placeholder.push(n.id);
  }

  // Each relation's sides: the ones facing each other across the ranks, around any class in the way.
  const across = r.direction === 'LR' || r.direction === 'RL';
  const ahead: Side = r.direction === 'LR' ? 'right' : r.direction === 'RL' ? 'left' : r.direction === 'BT' ? 'top' : 'bottom';
  const behind: Side = ahead === 'right' ? 'left' : ahead === 'left' ? 'right' : ahead === 'bottom' ? 'top' : 'bottom';
  const margin = 0.5 * U * scale;
  const grown = (b: Bounds): Bounds => ({ minX: b.minX - margin, minY: b.minY - margin, maxX: b.maxX + margin, maxY: b.maxY + margin });
  const sidesOfLink = new Map<ClassLinkRead, [Side, Side]>();
  const crossing: string[] = [];
  for (const l of links) {
    const a = standing.get(l.left)!, b = standing.get(l.right)!;
    const others = [...standing.values()].filter((o) => o !== a && o !== b);
    const pref = (sa: Side, sb: Side): number => {
      if (a.rank === b.rank) {
        const aFirst = across ? a.box.minY < b.box.minY : a.box.minX < b.box.minX;
        const facing: [Side, Side] = across ? (aFirst ? ['bottom', 'top'] : ['top', 'bottom']) : aFirst ? ['right', 'left'] : ['left', 'right'];
        return sa === facing[0] && sb === facing[1] ? 0 : 2;
      }
      const [out, into] = b.rank > a.rank ? [ahead, behind] : [behind, ahead];
      if (sa === out && sb === into) return 0;
      if (sa === out || sb === into) return 1;
      return 2;
    };
    let best: { score: number[]; sides: [Side, Side] } | null = null;
    for (const sa of SIDES) {
      for (const sb of SIDES) {
        const P = sideMiddle(a.box, sa), Q = sideMiddle(b.box, sb);
        const v = { x: Q.x - P.x, y: Q.y - P.y };
        // It leaves each class outward, never back across it or along its side.
        const leaves = v.x * outward[sa].x + v.y * outward[sa].y > 0.2 * Math.hypot(v.x, v.y) && -(v.x * outward[sb].x + v.y * outward[sb].y) > 0.2 * Math.hypot(v.x, v.y);
        const crosses = others.filter((o) => meetsBox(P, Q, grown(o.box))).length;
        const score = [leaves ? 0 : 1, crosses, pref(sa, sb), Math.hypot(v.x, v.y)];
        if (!best || lexLess(score, best.score)) best = { score, sides: [sa, sb] };
      }
    }
    sidesOfLink.set(l, best!.sides);
    if (best!.score[1]) crossing.push(`${l.left} — ${l.right}`);
  }

  // Ends sharing a side stand apart along it, in the order of what each reaches, so no two heads meet.
  const onSide = new Map<string, { l: ClassLinkRead; which: 0 | 1; toward: Point }[]>();
  for (const l of links) {
    const [sa, sb] = sidesOfLink.get(l)!;
    const a = standing.get(l.left)!, b = standing.get(l.right)!;
    for (const [k, s, other, which] of [[a, sa, b, 0], [b, sb, a, 1]] as const) {
      const key = `${k.id}:${s}`;
      const list = onSide.get(key) ?? [];
      list.push({ l, which, toward: sideMiddle(other.box, which === 0 ? sb : sa) });
      onSide.set(key, list);
    }
  }
  const endPoint = new Map<string, { point: Point; share: number; side: Side; count: number }>(); // `${link index}:${0|1}`
  for (const [key, list] of onSide) {
    const [cls, side] = key.split(/:(?=[a-z]+$)/) as [string, Side];
    const [p, q] = sideEnds(standing.get(cls)!.box, side);
    const d = { x: q.x - p.x, y: q.y - p.y };
    const along = (x: Point) => ((x.x - p.x) * d.x + (x.y - p.y) * d.y) / (d.x * d.x + d.y * d.y);
    list.sort((m, n) => along(m.toward) - along(n.toward) || m.l.index - n.l.index);
    list.forEach((e, i) => {
      const share = (i + 1) / (list.length + 1);
      endPoint.set(`${e.l.index}:${e.which}`, { point: { x: p.x + d.x * share, y: p.y + d.y * share }, share, side, count: list.length });
    });
  }

  /** Where an end is bound: the box's own edge middle when it stands there alone, else a place along the class's side. */
  const st = () => session.getState();
  const endAt = (cls: string, e: { point: Point; share: number; side: Side; count: number }): DrawnEnd => {
    const nodeId = ids[cls];
    const tol = 2 * scale;
    if (e.count === 1) {
      const node = st().nodes.get(nodeId)!;
      const site = magnetSites(node, st().nodes).find((x) => !x.kind.startsWith('port:') && !x.kind.startsWith('along:') && Math.hypot(x.point.x - e.point.x, x.point.y - e.point.y) <= tol);
      if (site) return { nodeId, site: { kind: site.kind, index: site.index }, of: 'mark', port: e.side, point: { ...site.point } };
    }
    return { nodeId, site: { kind: `along:${T.notation}`, index: alongIndex(SIDES.indexOf(e.side), e.share) }, of: 'notation', port: e.side, point: e.point };
  };

  // The relations, in the text's order: the line from side to side, bound at both ends, its words on its own ink. Then
  // each multiplicity, then each head drawn apart — every mark a confident shape or no letter, and a hatch only ever
  // right after its own outline, so the letter rules (session.ts) gather none of them into a word.
  const drawnLinks: DrawnClassLink[] = [];
  const hand = (p: Point) => scaled(p, 1 / scale);
  const world = (p: Point) => scaled(p, scale);
  const dashes: { at: Point; toward: Point; marked: boolean; said: string }[] = [];
  const apart: { link: DrawnClassLink; kind: 'triangle' | 'diamond'; filled: boolean; at: Point; from: Point }[] = [];
  const len = HEAD * U;
  for (const l of links) {
    const start = endAt(l.left, endPoint.get(`${l.index}:0`)!), end = endAt(l.right, endPoint.get(`${l.index}:1`)!);
    const P = start.point, Q = end.point;
    const { left, right } = l.markers;
    // An association is the line's own barb; with one at each end, the second is a filled triangle drawn apart (read so).
    const arrowAt: 'left' | 'right' | null = right === 'association' ? 'right' : left === 'association' ? 'left' : null;
    // A long arrow keeps its barb in proportion (D3's finding: strokeFor caps a barb, and past about 1,200 px it stops reading).
    const k = Math.max(1, Math.hypot(Q.x - P.x, Q.y - P.y) / scale / ARROW_PROPORTION_PX);
    const small = (p: Point) => scaled(p, 1 / (scale * k));
    const shaft = arrowAt === 'right'
      ? strokeFor({ shape: 'arrow', from: small(P), to: small(Q) })!.map((p) => scaled(p, k))
      : arrowAt === 'left'
        ? strokeFor({ shape: 'arrow', from: small(Q), to: small(P) })!.map((p) => scaled(p, k)).reverse()
        : strokeFor({ shape: 'line', from: hand(P), to: hand(Q) })!;
    const id = session.addStroke(shaft.map(world), next(), pid, scale, { content: true });
    drawnMarks.push(id);
    session.bind({ strokeId: id, nodeId: start.nodeId, site: start.site, end: 'start', at: next(), participantId: pid });
    session.bind({ strokeId: id, nodeId: end.nodeId, site: end.site, end: 'end', at: next(), participantId: pid });
    const words = l.label?.trim();
    if (words) session.label({ nodeId: id, text: words, participantId: pid, at: next() });
    const drawn = `${left ? T.connectors[left].mermaid.left : ''}${T.mermaid.line}${right ? T.connectors[right].mermaid.right : ''}`;
    const link: DrawnClassLink = { index: l.index, from: l.left, to: l.right, id, ids: [id], written: drawn, ...(words ? { label: words } : {}), start, end };
    drawnLinks.push(link);
    for (const [marker, at, from, card] of [[left, P, Q, l.cardinality.left], [right, Q, P, l.cardinality.right]] as const) {
      if (card?.trim()) dashes.push({ at, toward: from, marked: !!marker, said: card.trim() });
      if (!marker || (marker === 'association' && ((arrowAt === 'right' && at === Q) || (arrowAt === 'left' && at === P)))) continue;
      const kind = marker === 'inheritance' || marker === 'association' ? 'triangle' : 'diamond';
      apart.push({ link, kind, filled: marker === 'composition' || marker === 'association', at, from });
    }
    if (words === UNREAD_WRITING || l.cardinality.left === UNREAD_WRITING || l.cardinality.right === UNREAD_WRITING) placeholder.push(`${l.left} — ${l.right}`);
  }
  // Each multiplicity: a dash beside its end, off the line and clear of the head, labelled with its words.
  for (const d of dashes) {
    const u = unit({ x: d.toward.x - d.at.x, y: d.toward.y - d.at.y });
    // Beside the line: above one that runs across, right of one that runs down.
    const n = Math.abs(u.x) > Math.abs(u.y) ? (u.x > 0 ? { x: u.y, y: -u.x } : { x: -u.y, y: u.x }) : u.y > 0 ? { x: u.y, y: -u.x } : { x: -u.y, y: u.x };
    const h = DASH * U;
    const halfAlong = Math.abs(u.y) * (h / 2), halfAcross = Math.abs(n.y) * (h / 2);
    const c = add(hand(d.at), add(scaled(u, 0.5 * U + halfAlong), scaled(n, (d.marked ? 0.55 * len : 0) + DASH_OFF * U + halfAcross)));
    const mark = session.addStroke(strokeFor({ shape: 'line', from: { x: c.x, y: c.y - h / 2 }, to: { x: c.x, y: c.y + h / 2 } })!.map(world), next(), pid, scale, { content: true });
    session.label({ nodeId: mark, text: d.said, participantId: pid, at: next() });
    drawnMarks.push(mark);
  }
  // Each head drawn apart, its point on the class: an outline, then what fills it.
  for (const h of apart) {
    const out = { x: h.at.x - h.from.x, y: h.at.y - h.from.y };
    const outline = session.addStroke(headInk(h.kind, hand(h.at), out, len, INK_STEP / 1.5).map(world), next(), pid, scale, { content: true });
    h.link.ids.push(outline);
    drawnMarks.push(outline);
    if (!h.filled) continue;
    const fill = session.addStroke(fillInk(h.kind, hand(h.at), out, len, INK_STEP / 1.5).map(world), next(), pid, scale, { content: true });
    h.link.ids.push(fill);
    drawnMarks.push(fill);
  }

  // Read back, as the board will read it: every class a class, every relation of the kind written, between the classes written.
  const back = readUmlClass(session.getState(), drawnMarks);
  const classOf = new Map((back?.symbols ?? []).map((s) => [s.box[0], s]));
  const notClass = nodes.filter((n) => !classOf.has(ids[n.id])).map((n) => n.id);
  if (notClass.length) notes.push(`read back, ${some(notClass)} ${notClass.length === 1 ? 'does' : 'do'} not read as a class`);
  const misread = drawnLinks.filter((d) => {
    const got = back?.connectors.find((c) => c.id === d.id);
    const want = links.find((l) => l.index === d.index)!;
    const kind = want.markers.right ?? want.markers.left ?? 'link';
    const both = want.markers.left && want.markers.right;
    return !got || (!both && got.kind !== kind) || !([got.from, got.to].includes(ids[d.from]) && [got.from, got.to].includes(ids[d.to]));
  });
  if (misread.length) notes.push(`read back, ${misread.length === 1 ? 'a relation does' : `${count(misread.length)} relations do`} not read as written: ${some(misread.map((d) => `${d.from} ${d.written} ${d.to}`))}`);
  if (crossing.length) notes.push(`a straight relation cannot always go around: ${some(crossing)} ${crossing.length === 1 ? 'crosses' : 'cross'} a class on the way — read back, a class a line crosses may not read as one`);
  for (const b of layout.back) {
    if (!b.cycle) continue;
    const l = links[b.index];
    notes.push(`the relation ${l.left} — ${l.right} closes a cycle (${b.cycle.join(' → ')}), and runs back against the direction`);
  }
  if (!layout.kept && links.length) notes.push(`every relation runs within a rank, so read back the drawing will say ${across ? 'down (the default)' : 'across (LR)'}`);
  if (placeholder.length) notes.push(`“${UNREAD_WRITING}” is what D2 writes for writing nobody has read: it is put on the ink as the words, since the words are not known — ${some(placeholder)}`);

  const lb = layout.bounds;
  return {
    notation: r.notation,
    direction: r.direction,
    ids,
    links: drawnLinks.map((d) => ({ ...d, drawn: d.written.includes('<') && d.written.includes('>') ? '<-->' : d.written === '--' ? '---' : '-->', route: 'straight' as const })) as DrawnMermaid['links'],
    notes,
    refused,
    bounds: { minX: origin.x + lb.minX, minY: origin.y + lb.minY, maxX: origin.x + lb.maxX, maxY: origin.y + lb.maxY },
    lastAt: t - 1,
  };
}

/** The class diagram's reader: `classDiagram` and `classDiagram-v2`. */
export const CLASS_DIAGRAM_READER: MermaidReader = {
  notation: T.notation,
  read: readClassDiagramText,
  draw: drawClassDiagramRead,
};

for (const keyword of ['classDiagram', 'classDiagram-v2']) registerMermaidReader(keyword, CLASS_DIAGRAM_READER);
