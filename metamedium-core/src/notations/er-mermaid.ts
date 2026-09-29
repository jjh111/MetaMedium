// Mermaid out and in for the ER diagram (V1-PLAN §3, §9 D6; D2 and D3's rules,
// for `erDiagram`).
//
// Out: an ER reading (er.ts) said as Mermaid text, at tier 1:
//
//   erDiagram
//       direction LR
//       stroke_1["Customer"]
//       stroke_2["Order"]
//       stroke_1 ||--o{ stroke_2 : "places"
//
//   - **D2's rules hold.** Ids are the marks' own said safely (`mermaidIds`: an
//     entity is its box's stroke, or a ruled box's figure); every name and verb
//     is quoted and escaped (`mermaidString`); writing nobody has read is
//     "(unread writing)", named in `unread` and the notes, never invented; the
//     order is the drawing's — entities in reading order, then relationships by
//     the entities they join — never the log's. `direction LR` says which way
//     it runs when it runs across; down, Mermaid's own default, is left unsaid.
//   - **An entity is `id["name"]`**: Mermaid's alias syntax, so the id is the
//     mark's and the name what is written in the box.
//   - **A relationship is `<from> <left><line><right> <to> : "<verb>"`**, from
//     the entity that comes first, each end's cardinality as the crow's-foot
//     token the writing at that end says (ER_TABLE.cardinalities). Writing
//     nobody has read, or nothing written, says nothing about how many, so it
//     is written as the least a line claims — zero or more — and named in the
//     notes. Mermaid wants a label on every relationship: one with no verb
//     written is `""`.
//
// In: a reader for `erDiagram` — entities (`NAME`, `NAME["alias"]`, quoted
// names), relationships with the symbol tokens and the word aliases Mermaid
// takes for each cardinality, a `..` line as a plain one (said), `direction`
// — with what it does not draw refused, each statement with its line and why
// (an entity's attribute block: the boxes carry names only; a title; styles and
// classes; front matter). The parse is drawn as ink the notation reads: each
// entity a box with its name on it, laid out by D3's layered layout; each
// relationship a plain line (an arc bowing round an entity in the way), bound
// at both ends to the entities it joins — at a side's middle where the box
// offers one, else a place along its border (`along:er`) — its verb a label on
// its own ink, and each end's cardinality a short dash beside it carrying the
// words a hand writes for it. Every mark is a confident shape or no letter,
// and read back, what does not read as written is said. Tier 1; nothing
// derived enters the log; wrap the call in `session.withTool` for one undo.

import type { Bounds, Point } from '../types';
import type { Session } from '../session/session';
import { magnetSites } from '../session/magnets';
import { alongIndex } from '../session/ports';
import { strokeFor } from '../session/synthesize';
import type { NotationReading } from './notation';
import type { MermaidLink, MermaidOptions, MermaidText } from './mermaid';
import { inReadingOrder, mermaidIds, mermaidString, naturalCompare, registerMermaidWriter, unescapeMermaid, UNREAD_WRITING } from './mermaid';
import type { DrawMermaidOptions, DrawnEnd, DrawnMermaid, MermaidFlow, MermaidLinkRead, MermaidNodeRead, MermaidRead, MermaidReader, MermaidRefusal } from './mermaid-in';
import { MERMAID_MAX_LINKS, MERMAID_MAX_NODES, MERMAID_TEXT_PX, arcThrough, registerMermaidReader } from './mermaid-in';
import { layoutLayered } from './layered';
import type { Standing } from './box-routing';
import { outward, routeBoxes, SIDES } from './box-routing';
import type { Cardinality, ErReading, ErWriting } from './er';
import { ER_TABLE, cardinalityOf, erPortsOf, readEr } from './er';
import { countWord, someWords } from './graph-kit';
import { clamp, pointAtShare, besideContent, scaled, shareAt, spanOf, unit } from './state-mermaid';
import type { Span } from './state-mermaid';

const T = ER_TABLE;

// ===== Out: the text =====

const centreOf = (b: Bounds): Point => ({ x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 });
const hasColon = /[:]/;

/** How far a page leans, in radians: the median angle of the lines that run across it, read left to right; none when none does, or when it is past what a hand leans. */
const MAX_LEAN = (15 * Math.PI) / 180;
function leanOf(lines: readonly (readonly [Point, Point])[]): number {
  const angles = lines
    .map(([a, b]) => (b.x >= a.x ? [a, b] : [b, a]) as readonly [Point, Point])
    .filter(([a, b]) => b.x - a.x > Math.abs(b.y - a.y))
    .map(([a, b]) => Math.atan2(b.y - a.y, b.x - a.x))
    .sort((p, q) => p - q);
  if (!angles.length) return 0;
  const m = angles[Math.floor(angles.length / 2)];
  return Math.abs(m) <= MAX_LEAN ? m : 0;
}

/** The words of a piece of writing, or null when there is none: its read words, then the placeholder for any piece not read (once), unless the surface reads it with its line. */
function said(w: ErWriting | undefined, opts: MermaidOptions): { text: string | null; unread: string[] } {
  if (!w) return { text: null, unread: [] };
  const missing = w.unread.filter((id) => !opts.readWith?.(id));
  const parts = [...(w.text ? [w.text] : []), ...(missing.length ? [UNREAD_WRITING] : [])];
  return { text: parts.length ? parts.join(' ') : null, unread: missing };
}

/**
 * The ER diagram in Mermaid: `erDiagram`, `direction LR` when the
 * relationships run across; each entity with its name; each relationship from
 * the entity that comes first, with the crow's-foot token each end says and
 * its verb.
 */
export function writeEr(reading: NotationReading, opts: MermaidOptions = {}): MermaidText {
  const r = reading as ErReading;
  const entities = r.symbols;
  const idOf = mermaidIds(entities.map((s) => s.id));
  const byId = new Map(entities.map((s) => [s.id, s]));
  const rels = r.connectors.filter((k) => byId.has(k.from) && byId.has(k.to));

  // Which way it runs: between the centres of what each relationship joins.
  let down = 0, acrossSum = 0, downward = 0;
  const moving = rels.filter((k) => k.from !== k.to);
  for (const k of moving) {
    const a = centreOf(byId.get(k.from)!.bounds), b = centreOf(byId.get(k.to)!.bounds);
    down += Math.abs(b.y - a.y);
    acrossSum += Math.abs(b.x - a.x);
    if (Math.abs(b.y - a.y) >= Math.abs(b.x - a.x)) downward++;
  }
  const direction: { value: 'TD' | 'LR'; reason: string } = opts.direction
    ? { value: opts.direction, reason: 'asked for' }
    : !moving.length
      ? { value: 'TD', reason: 'no relationship between two entities to follow' }
      : acrossSum > down
        ? { value: 'LR', reason: `the relationships run across — between what they join, ${Math.round(acrossSum)} across against ${Math.round(down)} down; ${moving.length - downward} of ${moving.length} more across than down` }
        : { value: 'TD', reason: `the relationships run down — between what they join, ${Math.round(down)} down against ${Math.round(acrossSum)} across; ${downward} of ${moving.length} more down than across` };
  const across = direction.value === 'LR';
  // Entities in reading order — rows down the page, each left to right — of the page as it was meant to stand: a hand's page leans, and
  // over a page's width a few degrees is a box's height, so the entities' centres are turned back by the median lean of the lines
  // that run across before they are put in rows.
  const lean = leanOf(moving.map((k) => [centreOf(byId.get(k.from)!.bounds), centreOf(byId.get(k.to)!.bounds)] as const));
  const upright = new Map(entities.map((s) => {
    const c = centreOf(s.bounds), w = s.bounds.maxX - s.bounds.minX, h = s.bounds.maxY - s.bounds.minY;
    const p = { x: c.x * Math.cos(-lean) - c.y * Math.sin(-lean), y: c.x * Math.sin(-lean) + c.y * Math.cos(-lean) };
    return [s.id, { minX: p.x - w / 2, maxX: p.x + w / 2, minY: p.y - h / 2, maxY: p.y + h / 2 }] as const;
  }));
  const ordered = inReadingOrder(entities, (s) => upright.get(s.id), (s) => s.id);
  const place = new Map(ordered.map((s, i) => [s.id, i]));

  const lines: string[] = [T.mermaid.header];
  if (across) lines.push('    direction LR');
  const ids: Record<string, string> = {};
  const marks: Record<string, string[]> = {};
  const unreadIds = new Set<string>();
  const unread: { where: string; ids: string[] }[] = [];
  const blank: string[] = [];
  for (const s of ordered) {
    const m = idOf.get(s.id)!;
    const w = said(s.name, opts);
    if (w.unread.length) {
      unread.push({ where: `the name of ${m}`, ids: w.unread });
      w.unread.forEach((id) => unreadIds.add(id));
    }
    if (w.text === null) blank.push(m);
    lines.push(`    ${m}[${mermaidString(w.text ?? ' ', { colons: hasColon.test(w.text ?? '') })}]`);
    ids[m] = s.id;
    marks[m] = [...new Set(s.ids.length ? s.ids : [s.id])].sort(naturalCompare);
  }

  const links: MermaidLink[] = [];
  const unsaid: string[] = [];
  const notCardinal: string[] = [];
  const verbless: string[] = [];
  const written = [...rels].sort((p, q) => place.get(p.from)! - place.get(q.from)! || place.get(p.to)! - place.get(q.to)! || naturalCompare(p.id, q.id));
  for (const k of written) {
    const a = idOf.get(k.from)!, b = idOf.get(k.to)!;
    const tokens = (['from', 'to'] as const).map((at) => {
      const side = k.sides[at];
      const w = said(side.multiplicity, opts);
      if (w.unread.length) {
        unread.push({ where: `the multiplicity at ${at === 'from' ? a : b} on ${a} — ${b}`, ids: w.unread });
        w.unread.forEach((id) => unreadIds.add(id));
      }
      const card: Cardinality = side.cardinality ?? T.unsaid;
      if (!side.cardinality) {
        if (!side.multiplicity) unsaid.push(`${at === 'from' ? a : b} on ${a} — ${b}`);
        else if (!w.text || w.text === UNREAD_WRITING || w.unread.length) unsaid.push(`${at === 'from' ? a : b} on ${a} — ${b}`);
        else notCardinal.push(`“${w.text}” at ${at === 'from' ? a : b} on ${a} — ${b}`);
      }
      return T.cardinalities[card][at === 'from' ? 'left' : 'right'];
    });
    const v = said(k.verb, opts);
    if (v.unread.length) {
      unread.push({ where: `the verb of ${a} — ${b}`, ids: v.unread });
      v.unread.forEach((id) => unreadIds.add(id));
    }
    if (v.text === null) verbless.push(`${a} — ${b}`);
    const verb = v.text === null ? '""' : mermaidString(v.text, { colons: hasColon.test(v.text) });
    lines.push(`    ${a} ${tokens[0]}${T.connectors.relationship.mermaid.line}${tokens[1]} ${b} :${' '}${verb}`);
    links.push({ index: links.length, id: k.id, ids: [k.id, ...[...new Set(k.ids)].filter((x) => x !== k.id).sort(naturalCompare)], from: a, to: b });
  }

  // What the text does not say as drawn.
  const notes: string[] = [];
  if (unread.length) {
    const n = unread.reduce((s, u) => s + u.ids.length, 0);
    notes.push(`${n === 1 ? 'one piece of writing has' : `${countWord(n)} pieces of writing have`} not been read, so ${n === 1 ? 'its words are' : 'their words are'} not known — written "${UNREAD_WRITING}": ${someWords(unread.map((u) => u.where), 6)}`);
  }
  if (unsaid.length) notes.push(`nothing says how many at ${someWords(unsaid, 6)} — written as zero or more, the least a line claims`);
  if (notCardinal.length) notes.push(`writing that is none of one, zero or one, zero or more, one or more — ${someWords(notCardinal, 4)} — is written as zero or more`);
  if (verbless.length) notes.push(`${verbless.length === 1 ? 'a relationship has' : `${countWord(verbless.length)} relationships have`} no verb, and Mermaid wants one: written "": ${someWords(verbless, 6)}`);
  if (blank.length) notes.push(`${blank.length === 1 ? 'one entity has' : `${countWord(blank.length)} entities have`} no name and ${blank.length === 1 ? 'is' : 'are'} written blank: ${someWords(blank, 6)}`);
  const heads = r.headed;
  if (heads) notes.push(`${heads === 1 ? 'a line has' : `${countWord(heads)} lines have`} a head, which a relationship has not — ignored`);
  if (r.classLike) notes.push(`${r.classLike === 1 ? 'a box has' : `${countWord(r.classLike)} boxes have`} compartments, as a class does — left out`);
  const saidIds = new Set<string>([...entities.flatMap((s) => [s.id, ...s.ids, ...s.name.ids]), ...rels.flatMap((k) => [...k.ids, ...(k.verb?.ids ?? []), ...(k.sides.from.multiplicity?.ids ?? []), ...(k.sides.to.multiplicity?.ids ?? [])])]);
  const alone = r.labels.filter((l) => !saidIds.has(l.id)).map((l) => l.id).sort(naturalCompare);
  if (alone.length) notes.push(`writing that labels nothing in the diagram is left out: ${someWords(alone, 6)}`);
  const left = Object.keys(r.roles).filter((id) => !saidIds.has(id) && !alone.includes(id)).sort(naturalCompare);
  if (left.length) notes.push(`${left.length === 1 ? 'one mark' : `${countWord(left.length)} marks`} the diagram has no place for ${left.length === 1 ? 'is' : 'are'} left out: ${someWords(left.map((id) => `${id} (${r.roles[id]})`), 8)}`);

  return {
    text: lines.join('\n') + '\n',
    notation: reading.notation,
    diagram: T.mermaid.header,
    direction: direction as MermaidText['direction'],
    ids,
    marks,
    links,
    unread: [...unreadIds].sort(naturalCompare),
    notes,
  };
}

registerMermaidWriter(T.notation, writeEr);

// ===== In: reading an erDiagram text =====

/** An entity as the text gives it. */
export interface ErNodeRead extends MermaidNodeRead {
  symbol: 'entity';
  /** Declared with its own line, or only named in a relationship. */
  declared: boolean;
}

/** A relationship as the text gives it. */
export interface ErLinkRead extends MermaidLinkRead {
  /** How many at each end, as the text says. */
  cardinality: { from: Cardinality; to: Cardinality };
  /** `--` (identifying) or `..` (non-identifying, drawn as a plain line all the same). */
  identifying: boolean;
}

/** An erDiagram text as read, before anything is drawn. */
export interface ErDiagramRead extends MermaidRead {
  nodes: ErNodeRead[];
  links: ErLinkRead[];
}

/** Statements the reader does not draw, by their first word, and why. */
const NOT_DRAWN: [RegExp, string][] = [
  [/^title\b/i, 'a title is not drawn yet'],
  [/^(classDef|class|style|cssClass)\b/, 'styling: the board draws in its hand’s own colour'],
  [/^click\b/, 'a click is not drawn'],
  [/^(accTitle|accDescr)\b/, 'an accessible title or description, not read yet'],
];

const DIRECTIONS: Record<string, MermaidFlow> = { TB: 'TD', TD: 'TD', BT: 'BT', LR: 'LR', RL: 'RL' };

/** What each token says at a line's left side and its right, Mermaid's own symbols and the words it takes for them. */
const LEFT_TOKENS: [string, Cardinality][] = [
  ['||', 'one'], ['|o', 'zero-one'], ['}o', 'zero-many'], ['}|', 'one-many'],
  ['only one', 'one'], ['1', 'one'], ['zero or one', 'zero-one'], ['one or zero', 'zero-one'],
  ['zero or more', 'zero-many'], ['zero or many', 'zero-many'], ['many(0)', 'zero-many'], ['0+', 'zero-many'],
  ['one or more', 'one-many'], ['one or many', 'one-many'], ['many(1)', 'one-many'], ['1+', 'one-many'],
];
const RIGHT_TOKENS: [string, Cardinality][] = [
  ['||', 'one'], ['o|', 'zero-one'], ['o{', 'zero-many'], ['|{', 'one-many'],
  ...LEFT_TOKENS.filter(([t]) => /[a-z0-9]/.test(t) && !/^[o]/.test(t)),
];
const alternatives = (xs: readonly [string, Cardinality][]) => [...xs].sort((a, b) => b[0].length - a[0].length).map(([t]) => t.replace(/[|{}()+.*]/g, '\\$&')).join('|');
const NAME = String.raw`"[^"]*"|[^\s"]+`;
const RELATIONSHIP = new RegExp(`^(${NAME})\\s+(${alternatives(LEFT_TOKENS)})\\s*(--|\\.\\.|optionally to|to)\\s*(${alternatives(RIGHT_TOKENS)})\\s+(${NAME})\\s*(?::\\s*(.*))?$`, 'i');
const ENTITY_DECL = new RegExp(`^(${NAME})\\s*(?:\\[\\s*("[^"]*"|[^\\]]*?)\\s*\\])?\\s*(\\{.*)?$`);

const wordOf = (raw: string) => unescapeMermaid(raw.trim()).replace(/[ \t]+/g, ' ').trim();
const nameOf = (raw: string) => (raw.startsWith('"') ? wordOf(raw) : raw);

/** Read an erDiagram text into its entities and relationships. Never throws. */
export function readErText(text: string): ErDiagramRead {
  const all = String(text ?? '').replace(/\r\n?/g, '\n').split('\n');
  const notes = new Set<string>();
  const refused: MermaidRefusal[] = [];
  const nodes: ErNodeRead[] = [];
  const links: ErLinkRead[] = [];
  const byId = new Map<string, ErNodeRead>();
  let keyword = '';
  let header: number | null = null;
  let direction: MermaidFlow = 'TD';
  let block: string | null = null;
  const node = (id: string, line: number): ErNodeRead => {
    let n = byId.get(id);
    if (!n) {
      n = { id, line, symbol: 'entity', shape: '', text: id, declared: false };
      byId.set(id, n);
      nodes.push(n);
    }
    return n;
  };

  for (let i = 0; i < all.length; i++) {
    const n = i + 1;
    let t = all[i].trim();
    if (!t) continue;
    if (t.startsWith('%%{')) {
      refused.push({ line: n, text: t, reason: 'a directive configures mermaid.js’s own rendering — nothing on the board takes it' });
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
      const m = /^(erDiagram)\b\s*(.*)$/.exec(t);
      header = n;
      keyword = m ? m[1] : (/^[A-Za-z][\w-]*/.exec(t)?.[0] ?? '');
      if (!m) refused.push({ line: n, text: t, reason: 'an ER diagram opens with “erDiagram”' });
      else if (m[2]) refused.push({ line: n, text: m[2], reason: 'nothing is read after the header on its own line' });
      continue;
    }
    // An entity's attribute block: a name's boxes carry names only, so each attribute is refused.
    if (block !== null) {
      if (t === '}') {
        block = null;
        continue;
      }
      refused.push({ line: n, text: t, reason: `an attribute of ${block} is not drawn — an entity is a box with its name` });
      continue;
    }
    if (t.endsWith(';') && !/#\w+;$/.test(t)) t = t.slice(0, -1).trim();
    const dir = /^direction\s+(\w+)$/i.exec(t);
    if (dir) {
      const d = DIRECTIONS[dir[1].toUpperCase()];
      if (d) direction = d;
      else refused.push({ line: n, text: t, reason: `“${dir[1]}” is no direction: TB, TD, BT, LR or RL` });
      continue;
    }
    const not = NOT_DRAWN.find(([re]) => re.test(t));
    if (not) {
      refused.push({ line: n, text: t, reason: not[1] });
      continue;
    }
    const rel = RELATIONSHIP.exec(t);
    if (rel) {
      const [, left, lt, line, rt, right, rawWords] = rel;
      const cardFrom = LEFT_TOKENS.find(([k]) => k.toLowerCase() === lt.toLowerCase())![1];
      const cardTo = RIGHT_TOKENS.find(([k]) => k.toLowerCase() === rt.toLowerCase())![1];
      const a = node(nameOf(left), n), b = node(nameOf(right), n);
      const label = rawWords !== undefined ? wordOf(rawWords) : '';
      const identifying = line === '--';
      if (!identifying) notes.add('a non-identifying relationship (“..”, “to”) is drawn as a plain line: the board has no dashed relationship');
      links.push({ index: links.length, line: n, from: a.id, to: b.id, head: 'none', written: `${lt}${line}${rt}`, ...(label ? { label } : {}), cardinality: { from: cardFrom, to: cardTo }, identifying });
      continue;
    }
    // `NAME`, `NAME["alias"]`, `NAME {` … `}`
    const decl = ENTITY_DECL.exec(t);
    if (decl) {
      const [, raw, alias, rest] = decl;
      const k = node(nameOf(raw), n);
      k.declared = true;
      if (alias !== undefined) k.text = wordOf(alias);
      else if (raw.startsWith('"')) k.text = k.id;
      if (rest) {
        const body = rest.slice(1).trim();
        if (body.endsWith('}')) {
          const inner = body.slice(0, -1).trim();
          if (inner) refused.push({ line: n, text: inner, reason: `the attributes of ${k.id} are not drawn — an entity is a box with its name` });
        } else {
          block = k.id;
          if (body) refused.push({ line: n, text: body, reason: `an attribute of ${k.id} is not drawn — an entity is a box with its name` });
        }
      }
      continue;
    }
    refused.push({ line: n, text: t, reason: 'a statement the ER diagram’s reader cannot parse' });
  }
  if (header === null) refused.push({ line: 1, text: '', reason: 'nothing to read: an ER diagram opens with “erDiagram”' });
  return { keyword, notation: keyword ? T.notation : null, direction, nodes, links, notes: [...notes], refused: refused.sort((x, y) => x.line - y.line) };
}

// ===== In: drawing a read ER diagram =====

/** A character's width, and the text's line, in text sizes (D3's). */
const CHAR = 0.6;
const LINE = 1.4;
/** An entity: at least this wide and at most, and this tall for one line, in text sizes. */
const ENTITY_MIN = 8;
const ENTITY_MAX = 20;
const ENTITY_H = 3.4;
/** The gap between ranks and between neighbours, in text sizes: room for a dash at each end of a line. */
const RANK_GAP = 8;
const NODE_GAP = 5;
/** Ink is laid every this many screen pixels along an arc. */
const INK_STEP = 3;
/**
 * A multiplicity is drawn as a short stroke of writing — a dash, as a hand's
 * “1” is — carrying its words as a label: a confident line, which the letter
 * rules never gather with the lines around it. This tall, in text sizes, and
 * this far off its line, just past its entity's side.
 */
const DASH = 0.9;
const DASH_OFF = 0.6;

const add = (a: Point, b: Point): Point => ({ x: a.x + b.x, y: a.y + b.y });

/** A relationship as drawn — D3's `DrawnLink`, with what the text wrote. */
export interface DrawnErLink {
  index: number;
  from: string;
  to: string;
  id: string;
  ids: string[];
  written: string;
  /** Straight, or an arc bowing around an entity in the way. */
  route: 'straight' | 'arc';
  label?: string;
  start: DrawnEnd;
  end: DrawnEnd;
  /** Whether each end is bound. */
  bound: [boolean, boolean];
}

/** Draw a read ER diagram. */
function drawErRead(session: Session, read: MermaidRead, opts: DrawMermaidOptions): DrawnMermaid {
  const r = read as ErDiagramRead;
  const scale = opts.scale && opts.scale > 0 ? opts.scale : 1;
  const pid = opts.participantId;
  const U = MERMAID_TEXT_PX * scale;
  const notes = [...r.notes];
  const refused = [...r.refused];
  let t = opts.at;
  const next = () => t++;
  const hand = (p: Point) => scaled(p, 1 / scale);
  const world = (p: Point) => scaled(p, scale);

  const nodes = r.nodes.slice(0, MERMAID_MAX_NODES);
  const kept = new Set(nodes.map((x) => x.id));
  if (r.nodes.length > nodes.length) notes.push(`the text holds ${r.nodes.length} entities and the board draws ${MERMAID_MAX_NODES} at most: the first ${MERMAID_MAX_NODES} are drawn`);
  let among = r.links.filter((l) => kept.has(l.from) && kept.has(l.to));
  const selfLinks = among.filter((l) => l.from === l.to);
  if (selfLinks.length) notes.push(`a relationship from an entity to itself is not drawn — ${someWords(selfLinks.map((l) => l.from))}`);
  among = among.filter((l) => l.from !== l.to);
  const links = among.slice(0, MERMAID_MAX_LINKS);
  if (among.length > links.length) notes.push(`the text holds ${among.length} relationships among the entities drawn and the board draws ${MERMAID_MAX_LINKS} at most`);
  if (!nodes.length) {
    notes.push('nothing to draw: the text names no entity');
    return { notation: r.notation, direction: r.direction, ids: {}, links: [], notes, refused, bounds: null, lastAt: t - 1 };
  }

  // Sizes, in the hand's space: an entity as wide as its name.
  const words = (s: string) => Math.max(...s.split('\n').map((x) => [...x].length), 0);
  const size = new Map(
    nodes.map((x) => {
      const lines = Math.max(1, x.text.split('\n').length);
      return [x.id, { w: clamp(words(x.text) * CHAR + 3, ENTITY_MIN, ENTITY_MAX) * U, h: Math.max(ENTITY_H, lines * LINE + 2) * U }] as const;
    })
  );
  const layout = layoutLayered(
    nodes.map((x) => ({ id: x.id, w: size.get(x.id)!.w, h: size.get(x.id)!.h })),
    links.map((l) => ({ from: l.from, to: l.to })),
    { direction: r.direction, rankGap: RANK_GAP * U, nodeGap: NODE_GAP * U }
  );
  const origin = opts.origin ?? besideContent(session, ENTITY_MIN * U);
  const standing = new Map<string, Standing>();
  for (const x of nodes) {
    const c = { x: origin.x + layout.at.get(x.id)!.x, y: origin.y + layout.at.get(x.id)!.y };
    const z = size.get(x.id)!;
    standing.set(x.id, { id: x.id, rank: layout.rank.get(x.id)!, box: { minX: c.x - z.w / 2, maxX: c.x + z.w / 2, minY: c.y - z.h / 2, maxY: c.y + z.h / 2 } });
  }

  // The entities: a box, its name on its own ink.
  const ids: Record<string, string> = {};
  const drawnMarks: string[] = [];
  const placeholder: string[] = [];
  for (const x of nodes) {
    const b = standing.get(x.id)!.box;
    const box = session.addStroke(strokeFor({ shape: 'rectangle', x: b.minX, y: b.minY, w: b.maxX - b.minX, h: b.maxY - b.minY })!, next(), pid, scale, { content: true });
    ids[x.id] = box;
    drawnMarks.push(box);
    const name = x.text.trim();
    if (name) session.label({ nodeId: box, text: name, participantId: pid, at: next() });
    if (name === UNREAD_WRITING) placeholder.push(x.id);
  }

  // Where each relationship leaves and arrives: the sides facing each other, around any entity in the way.
  const { routes, ends } = routeBoxes(standing, links.map((l) => ({ index: l.index, a: l.from, b: l.to })), r.direction, 0.5 * U, scale);
  const st = () => session.getState();
  const spans = new Map<string, Span | null>();
  const spanOfNode = (id: string): Span | null => {
    if (!spans.has(id)) {
      const node = st().nodes.get(ids[id]);
      const port = node ? erPortsOf(node, st().nodes)?.ports[0] : undefined;
      spans.set(id, port?.along && port.along.length >= 3 ? spanOf(port.along) : null);
    }
    return spans.get(id)!;
  };
  const near = (id: string, want: Point, tol: number) => {
    const node = st().nodes.get(ids[id])!;
    let best: { kind: string; index: number; point: Point; d: number } | null = null;
    for (const site of magnetSites(node, st().nodes)) {
      if (site.kind.startsWith('port:') || site.kind.startsWith('along:')) continue;
      const d = Math.hypot(site.point.x - want.x, site.point.y - want.y);
      if (d <= tol && (!best || d < best.d)) best = { kind: site.kind, index: site.index, point: { ...site.point }, d };
    }
    return best;
  };
  /** Where an end is bound: a site the mark offers at the place wanted, else a place along the entity's border, else nowhere. */
  const endAt = (id: string, want: Point, port: string): { end: DrawnEnd; bound: boolean } => {
    const nodeId = ids[id];
    const site = near(id, want, 0.3 * U);
    if (site) return { end: { nodeId, site: { kind: site.kind, index: site.index }, of: 'mark', port, point: site.point }, bound: true };
    const span = spanOfNode(id);
    if (span) {
      const share = shareAt(span, want);
      return { end: { nodeId, site: { kind: `along:${T.notation}`, index: alongIndex(SIDES.indexOf(port as (typeof SIDES)[number]), share) }, of: 'notation', port, point: pointAtShare(span, share) }, bound: true };
    }
    return { end: { nodeId, site: { kind: '', index: 0 }, of: 'mark', port, point: want }, bound: false };
  };

  // The relationships, in the text's order: the line, bound at both ends, its verb on its own ink. Then the dashes.
  const drawn: DrawnErLink[] = [];
  const crossing: string[] = [];
  const unbound: string[] = [];
  const dashes: { at: Point; toward: Point; side: (typeof SIDES)[number]; said: string }[] = [];
  const lineInk: { id: string; pts: Point[] }[] = [];
  for (const l of links) {
    const label = l.label?.trim();
    const route = routes.get(l.index)!;
    const e0 = ends.get(`${l.index}:0`)!, e1 = ends.get(`${l.index}:1`)!;
    const a = endAt(l.from, e0.point, e0.side), z = endAt(l.to, e1.point, e1.side);
    const P = a.end.point, Q = z.end.point;
    const bow = route.bow;
    const chord = Math.hypot(Q.x - P.x, Q.y - P.y) / scale;
    const arc = bow ? arcThrough(hand(P), hand(Q), bow.sweep, bow.side, Math.max(16, Math.min(300, Math.round((chord * ((bow.sweep * Math.PI) / 180)) / (2 * Math.sin((bow.sweep * Math.PI) / 360)) / INK_STEP)))) : null;
    const shaft = arc ? arc.map(world) : strokeFor({ shape: 'line', from: hand(P), to: hand(Q) })!.map(world);
    const id = session.addStroke(shaft, next(), pid, scale, { content: true });
    lineInk.push({ id, pts: shaft });
    for (const [end, e] of [['start', a], ['end', z]] as const) if (e.bound) session.bind({ strokeId: id, nodeId: e.end.nodeId, site: e.end.site, end, at: next(), participantId: pid });
    if (!a.bound || !z.bound) unbound.push(`${l.from} — ${l.to}`);
    if (label) session.label({ nodeId: id, text: label, participantId: pid, at: next() });
    if (label === UNREAD_WRITING) placeholder.push(`${l.from} — ${l.to}`);
    if (route.crossing) crossing.push(`${l.from} — ${l.to}`);
    drawnMarks.push(id);
    drawn.push({ index: l.index, from: l.from, to: l.to, id, ids: [id], written: l.written, route: arc ? 'arc' : 'straight', ...(label ? { label } : {}), start: a.end, end: z.end, bound: [a.bound, z.bound] });
    const leaving = arc ? [world(arc[Math.min(3, arc.length - 1)]), world(arc[Math.max(0, arc.length - 4)])] : [Q, P];
    dashes.push({ at: P, toward: leaving[0], side: e0.side, said: T.cardinalities[l.cardinality.from].written });
    dashes.push({ at: Q, toward: leaving[1], side: e1.side, said: T.cardinalities[l.cardinality.to].written });
  }
  // Each multiplicity: a dash beside its end, off the line and outside its entity, on the side furthest from every other line leaving near it.
  const distToPolyline = (p: Point, pts: readonly Point[]) => {
    let best = Infinity;
    for (let i = 1; i < pts.length; i++) {
      const dx = pts[i].x - pts[i - 1].x, dy = pts[i].y - pts[i - 1].y;
      const l2 = dx * dx + dy * dy;
      const u = l2 > 0 ? clamp(((p.x - pts[i - 1].x) * dx + (p.y - pts[i - 1].y) * dy) / l2, 0, 1) : 0;
      best = Math.min(best, Math.hypot(p.x - (pts[i - 1].x + u * dx), p.y - (pts[i - 1].y + u * dy)));
    }
    return best;
  };
  const leavingNear = lineInk.flatMap((k) => {
    const m = Math.max(2, Math.ceil(k.pts.length * 0.4));
    return [k.pts.slice(0, m), k.pts.slice(-m)];
  });
  const offLines = (p: Point, except: Point) => Math.min(Infinity, ...leavingNear.filter((pts) => pts.length && !pts.some((q) => q.x === except.x && q.y === except.y)).map((pts) => distToPolyline(p, pts)));
  for (const d of dashes) {
    const u = unit({ x: d.toward.x - d.at.x, y: d.toward.y - d.at.y });
    const o = outward[d.side];
    const h = DASH * U;
    const place = (n: Point) => {
      const halfAlong = Math.abs(u.y) * (h / 2), halfAcross = Math.abs(n.y) * (h / 2);
      return add(hand(d.at), add(scaled(u, 0.3 * U + halfAlong), scaled(n, DASH_OFF * U + halfAcross)));
    };
    const perp = { x: -u.y, y: u.x };
    const options = [perp, { x: -perp.x, y: -perp.y }]
      .map((n) => ({ n, c: place(n) }))
      .filter((x) => (x.c.x - hand(d.at).x) * o.x + (x.c.y - hand(d.at).y) * o.y > 0.3 * U);
    const pick = (options.length ? options : [{ n: perp, c: place(perp) }])
      .map((x) => ({ ...x, room: offLines(world(x.c), d.at) }))
      // The most room from the other lines; on a tie, above a line that runs across, right of one that runs down.
      .sort((p, q) => q.room - p.room || (Math.abs(u.x) > Math.abs(u.y) ? p.n.y - q.n.y : q.n.x - p.n.x))[0];
    const c = pick.c;
    const mark = session.addStroke(strokeFor({ shape: 'line', from: { x: c.x, y: c.y - h / 2 }, to: { x: c.x, y: c.y + h / 2 } })!.map(world), next(), pid, scale, { content: true });
    session.label({ nodeId: mark, text: d.said, participantId: pid, at: next() });
    drawnMarks.push(mark);
  }

  // Read back, as the board will read it: every entity one, every relationship between the entities written, with its cardinalities and verb.
  const back = readEr(session.getState(), drawnMarks);
  const entityFor = (id: string) => back?.symbols.find((s) => s.ids.includes(ids[id]));
  const lost = nodes.filter((x) => !entityFor(x.id)).map((x) => x.id);
  if (lost.length) notes.push(`read back, ${someWords(lost)} ${lost.length === 1 ? 'does' : 'do'} not read as an entity`);
  const misread = drawn.filter((d) => {
    const got = back?.connectors.find((c) => c.id === d.id);
    const want = links.find((l) => l.index === d.index)!;
    if (!got) return true;
    const A = entityFor(d.from)?.id, B = entityFor(d.to)?.id;
    if (!A || !B || ![got.from, got.to].every((x) => x === A || x === B) || got.from === got.to) return true;
    const at = (entity: string) => (got.sides.from.entity === entity ? got.sides.from : got.sides.to);
    if (at(A).cardinality !== want.cardinality.from || at(B).cardinality !== want.cardinality.to) return true;
    return (got.verb?.text ?? '') !== (want.label ?? '');
  });
  if (misread.length) notes.push(`read back, ${misread.length === 1 ? 'a relationship does' : `${countWord(misread.length)} relationships do`} not read as written: ${someWords(misread.map((d) => `${d.from} — ${d.to}`))}`);
  if (unbound.length) notes.push(`${unbound.length === 1 ? 'a relationship end has' : 'relationship ends have'} no site to be tied to and ${unbound.length === 1 ? 'is' : 'are'} drawn free: ${someWords(unbound)}`);
  if (crossing.length) notes.push(`no way around the entities between: ${someWords(crossing)} ${crossing.length === 1 ? 'crosses' : 'cross'} an entity on the way`);
  for (const bk of layout.back) {
    if (!bk.cycle) continue;
    const l = links[bk.index];
    notes.push(`the relationship ${l.from} — ${l.to} closes a cycle (${bk.cycle.join(' → ')}), and runs back against the direction`);
  }
  if (!layout.kept && links.length) notes.push(`every relationship runs within a rank, so read back the drawing will say ${r.direction === 'LR' ? 'down (the default)' : 'across (LR)'}`);
  if (placeholder.length) notes.push(`“${UNREAD_WRITING}” is what D2 writes for writing nobody has read: it is put on the ink as the words, since the words are not known — ${someWords(placeholder)}`);
  if (links.some((l) => !l.identifying)) notes.push('a non-identifying relationship is drawn as a plain line: the board has no dashed relationship');

  const lb = layout.bounds;
  return {
    notation: r.notation,
    direction: r.direction,
    ids,
    links: drawn.map((d) => ({ ...d, drawn: d.written })) as unknown as DrawnMermaid['links'],
    notes,
    refused,
    bounds: { minX: origin.x + lb.minX, minY: origin.y + lb.minY, maxX: origin.x + lb.maxX, maxY: origin.y + lb.maxY },
    lastAt: t - 1,
  };
}

/** The ER diagram's reader: `erDiagram`. */
export const ER_READER: MermaidReader = {
  notation: T.notation,
  read: readErText,
  draw: drawErRead,
};

registerMermaidReader('erDiagram', ER_READER);

/** The cardinality a token says at a line's left or right side, or null. */
export function cardinalityOfToken(token: string, side: 'left' | 'right'): Cardinality | null {
  const table = side === 'left' ? LEFT_TOKENS : RIGHT_TOKENS;
  return table.find(([t]) => t.toLowerCase() === token.toLowerCase())?.[1] ?? cardinalityOf(token);
}
