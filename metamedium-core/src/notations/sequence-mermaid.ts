// Mermaid out and in for the sequence diagram (V1-PLAN §3, §9 D5; D2 and D3's
// rules, for `sequenceDiagram`).
//
// Out: a sequence reading (sequence.ts) said as Mermaid text, at tier 1:
//
//   sequenceDiagram
//       participant stroke_1 as Alice
//       actor stroke_4 as Bob
//       stroke_1->>stroke_4: request
//       stroke_4->>stroke_4: validate
//       stroke_4-->>stroke_1: done
//
//   - **D2's rules hold.** Ids are the marks' own said safely (`mermaidIds`:
//     a participant is its box's stroke, a ruled box's figure, or its stick
//     figure's head); writing nobody has read is "(unread writing)", named
//     in `unread` and the notes, never invented; the order is the drawing's —
//     participants left to right, messages down the page — never the log's.
//   - **Words are raw text to the end of the line**, as Mermaid's sequence
//     grammar reads a participant's alias and a message's text: it stops at
//     `#` and `;`, and its preprocessing reads `#…;`, `%%` and markup — so
//     each such character is written as the entity Mermaid decodes back to
//     it, a line break as `<br>`, and `unescapeMermaid` is still the exact
//     inverse. A name or a label with no writing at all is a space, `#32;`:
//     Mermaid wants words after `as` and after a message's colon.
//   - **Each message's arrow is its line and its head**: `->>` solid with a
//     head, `-->>` dashed with one, `->` and `-->` with none, `<<->>` and
//     `<<-->>` with one at each end; a self-message is from a participant
//     to itself. Mermaid's cross (`-x`) and open async head (`-)`) are never
//     written: the board reads neither.
//
// In: a reader for `sequenceDiagram` — the subset the writer writes, and the
// common forms a hand writes besides (participants declared or only named in
// a message, `actor`, the ten arrows, activation marks, `autonumber`, notes
// and frames refused with their lines, their messages read) — and the parse
// drawn as ink the notation reads: participants left to right in the text's
// order, each a box (or a stick figure, for an actor) over a lifeline — one
// straight stroke — its name a label on its own ink; each message down the
// page in the text's order: a call an arrow (its own barb), a return a row of
// dashes with a closed triangle drawn apart at the end it points to, a
// message with no head a line, a self-message a loop out and back with its
// barb where it comes back; a message's words a label on its own ink. Every
// mark is a confident shape or wider than a letter, and the letter rules
// gather none of them. The solid messages are bound at both ends to the
// lifelines they join (`along:sequence`); a row of dashes has no single end to
// bind. Read back, what does not read as written is said. Tier 1; nothing
// derived enters the log; wrap the call in `session.withTool` for one undo.

import type { Bounds, Point } from '../types';
import type { Session } from '../session/session';
import { alongIndex } from '../session/ports';
import { strokeFor } from '../session/synthesize';
import type { NotationReading } from './notation';
import type { MermaidLink, MermaidOptions, MermaidText } from './mermaid';
import { mermaidIds, naturalCompare, registerMermaidWriter, unescapeMermaid, UNREAD_WRITING } from './mermaid';
import type { DrawMermaidOptions, DrawnEnd, DrawnMermaid, MermaidLinkRead, MermaidNodeRead, MermaidRead, MermaidReader, MermaidRefusal } from './mermaid-in';
import { MERMAID_MAX_LINKS, MERMAID_MAX_NODES, MERMAID_TEXT_PX, registerMermaidReader } from './mermaid-in';
import type { SequenceReading } from './sequence';
import { readSequence, SEQUENCE_TABLE } from './sequence';

const T = SEQUENCE_TABLE;
const COUNT = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
const count = (n: number) => COUNT[n] ?? String(n);
const list = (xs: readonly string[]) => (xs.length <= 1 ? xs.join('') : `${xs.slice(0, -1).join(', ')} and ${xs[xs.length - 1]}`);
const some = (xs: readonly string[], max = 4) => (xs.length > max ? `${xs.slice(0, max).join(', ')} and ${count(xs.length - max)} more` : list(xs));

// ===== Out: the text =====

/** What Mermaid's sequence grammar or its preprocessing would read as something other than the character: the entity it decodes back to. */
const ENTITY: Record<string, string> = { '#': '#35;', ';': '#59;', '"': '#quot;', '%': '#37;', '`': '#96;', '<': '#lt;', '>': '#gt;', '&': '#amp;' };
/** Words with nothing in them: a space, which Mermaid still reads as words. */
export const BLANK_WORDS = '#32;';

/**
 * Words as a sequence diagram's raw text — a participant's alias or a
 * message's text: every character Mermaid would read otherwise as its
 * entity, a line break as `<br>`, and a leading `wrap:` or `nowrap:` — which
 * Mermaid takes for an instruction — with its colon as an entity. Empty words
 * are a space. `unescapeMermaid` is the exact inverse.
 */
export function sequenceText(text: string): string {
  const lines = String(text)
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => [...line.replace(/\t/g, ' ').replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '')].map((ch) => ENTITY[ch] ?? ch).join(''));
  let body = lines.join('<br>');
  const wrap = /^(no)?wrap:/i.exec(body);
  if (wrap) body = body.slice(0, wrap[0].length - 1) + '#58;' + body.slice(wrap[0].length);
  // Mermaid trims a line's words; a space at either end is written so it survives.
  body = body.replace(/^ /, '#32;').replace(/ $/, '#32;');
  return body.length ? body : BLANK_WORDS;
}

/** Words with the placeholder taken out, for writing read with its line (`readWith`). */
const withoutPlaceholder = (text: string) => text.split(UNREAD_WRITING).join(' ').replace(/\s+/g, ' ').trim();

/**
 * The sequence diagram in Mermaid: `sequenceDiagram`; each participant left
 * to right as `participant` or `actor`, its name its alias; each message down
 * the page, its arrow as its line and head say, its words after the colon.
 */
export function writeSequence(reading: NotationReading, opts: MermaidOptions = {}): MermaidText {
  const r = reading as SequenceReading;
  const ps = [...r.symbols].sort((a, b) => a.top.x - b.top.x || naturalCompare(a.id, b.id));
  const idOf = mermaidIds(ps.map((p) => p.id));
  const byId = new Map(ps.map((p) => [p.id, p]));
  const messages = [...r.connectors].filter((m) => byId.has(m.from) && byId.has(m.to)).sort((a, b) => a.order - b.order || naturalCompare(a.id, b.id));
  const labelOf = new Map(r.labels.map((l) => [l.id, l]));
  const readWith = (id: string) => !!opts.readWith?.(id);

  const unread: { where: string; ids: string[] }[] = [];
  const unreadIds = new Set<string>();
  /** What a name says: its words, the placeholder for a run of writing nobody has read — or, all of it read with its line, only the words known. */
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
  const ids: Record<string, string> = {};
  const marks: Record<string, string[]> = {};
  const blank: string[] = [];
  for (const p of ps) {
    const m = idOf.get(p.id)!;
    const name = said(p.name.text, p.name.unread, `the name of ${m}`);
    if (name === null) blank.push(m);
    lines.push(`    ${T.symbols[p.symbol].mermaid} ${m} as ${name === null ? BLANK_WORDS : sequenceText(name)}`);
    ids[m] = p.id;
    marks[m] = [...new Set(p.ids.length ? p.ids : [p.id])].sort(naturalCompare);
  }

  const links: MermaidLink[] = [];
  const quiet: string[] = [];
  for (const msg of messages) {
    const a = idOf.get(msg.from)!, b = idOf.get(msg.to)!;
    // Its words: a word on its own ink, then the writing above it, in reading order.
    const parts: string[] = msg.text?.trim() ? [msg.text.trim()] : [];
    const missing: string[] = [];
    for (const id of msg.labels) {
      const t = labelOf.get(id)?.text?.trim();
      if (t) parts.push(t);
      else if (readWith(id)) continue;
      else {
        missing.push(id);
        if (parts[parts.length - 1] !== UNREAD_WRITING) parts.push(UNREAD_WRITING);
      }
    }
    if (missing.length) {
      unread.push({ where: `the label of ${a}${msg.arrow}${b}`, ids: missing });
      missing.forEach((id) => unreadIds.add(id));
    }
    if (!parts.length) quiet.push(`${a}${msg.arrow}${b}`);
    lines.push(`    ${a}${msg.arrow}${b}: ${parts.length ? sequenceText(parts.join(' ')) : BLANK_WORDS}`);
    links.push({ index: links.length, id: msg.id, ids: [msg.id, ...[...new Set(msg.ids)].filter((x) => x !== msg.id).sort(naturalCompare)], from: a, to: b });
  }

  // What the text does not say as drawn.
  const notes: string[] = [];
  const pieces = unreadIds.size;
  if (unread.length) notes.push(`${pieces === 1 ? 'one piece of writing has' : `${count(pieces)} pieces of writing have`} not been read, so ${pieces === 1 ? 'its words are' : 'their words are'} not known — written "${UNREAD_WRITING}": ${some([...new Set(unread.map((u) => u.where))])}`);
  if (blank.length) notes.push(`${blank.length === 1 ? 'one participant has' : `${count(blank.length)} participants have`} no writing for a name and ${blank.length === 1 ? 'is' : 'are'} written with a blank one: ${list(blank)}`);
  if (quiet.length) notes.push(`${quiet.length === 1 ? 'one message has' : `${count(quiet.length)} messages have`} no writing above ${quiet.length === 1 ? 'it and is' : 'them and are'} written with blank words: ${some(quiet)}`);
  const saidIds = new Set<string>([...ps.flatMap((p) => [p.id, ...p.ids, ...p.labels]), ...messages.flatMap((m) => [...m.ids, ...m.labels])]);
  const alone = r.labels.filter((l) => !saidIds.has(l.id)).map((l) => l.id).sort(naturalCompare);
  if (alone.length) notes.push(`writing beside nothing in the diagram is left out: ${some(alone, 6)}`);
  const left = Object.keys(r.roles).filter((id) => !saidIds.has(id) && !alone.includes(id) && r.roles[id] !== 'edge' && r.roles[id] !== 'node').sort(naturalCompare);
  if (left.length) notes.push(`${left.length === 1 ? 'one mark' : `${count(left.length)} marks`} the diagram has no place for ${left.length === 1 ? 'is' : 'are'} left out: ${some(left.map((id) => `${id} (${r.roles[id]})`), 8)}`);

  return {
    text: lines.join('\n') + '\n',
    notation: reading.notation,
    diagram: T.mermaid.header,
    ids,
    marks,
    links,
    unread: [...unreadIds].sort(naturalCompare),
    notes,
  };
}

registerMermaidWriter(T.notation, writeSequence);

// ===== In: reading a sequenceDiagram text =====

/** A participant as the text gives it. */
export interface SequenceNodeRead extends MermaidNodeRead {
  symbol: 'participant' | 'actor';
  /** Declared with `participant` or `actor`, or only named in a message. */
  declared: boolean;
}

/** A message as the text gives it. */
export interface SequenceLinkRead extends MermaidLinkRead {
  /** Dashed (`--`), or one line. */
  dashed: boolean;
  /** The arrow the board draws it as: one of the six the writer writes. */
  arrow: string;
  self: boolean;
}

/** A sequenceDiagram text as read, before anything is drawn. */
export interface SequenceDiagramRead extends MermaidRead {
  nodes: SequenceNodeRead[];
  links: SequenceLinkRead[];
}

/** The arrows Mermaid's sequence grammar knows, longest first: what each is drawn as, and whether that is not what it says. */
const ARROWS: { token: string; dashed: boolean; head: MermaidLinkRead['head']; draws: string; said?: string }[] = [
  { token: '<<-->>', dashed: true, head: 'both', draws: '<<-->>' },
  { token: '<<->>', dashed: false, head: 'both', draws: '<<->>' },
  { token: '-->>', dashed: true, head: 'forward', draws: '-->>' },
  { token: '->>', dashed: false, head: 'forward', draws: '->>' },
  { token: '--x', dashed: true, head: 'forward', draws: '-->>', said: 'a cross (--x) is drawn as an arrowhead' },
  { token: '-x', dashed: false, head: 'forward', draws: '->>', said: 'a cross (-x) is drawn as an arrowhead' },
  { token: '--)', dashed: true, head: 'forward', draws: '-->>', said: 'an open async head (--)) is drawn as an arrowhead' },
  { token: '-)', dashed: false, head: 'forward', draws: '->>', said: 'an open async head (-)) is drawn as an arrowhead' },
  { token: '-->', dashed: true, head: 'none', draws: '-->' },
  { token: '->', dashed: false, head: 'none', draws: '->' },
];

/** A participant's id as a message names it: no space, no arrow, no colon. */
const ACTOR = /^[^\s+\-<>=:,;]+/u;

/** Statements the reader does not draw, by their first word, and why. */
const NOT_DRAWN: [RegExp, string][] = [
  [/^note\b/i, 'a note is not drawn yet'],
  [/^(activate|deactivate)\b/, 'an activation bar is not drawn yet'],
  [/^autonumber\b/, 'numbering is not drawn: the messages are in order down the page'],
  [/^title\b/, 'a title is not drawn yet'],
  [/^destroy\b/, 'a participant’s end is not drawn yet'],
  [/^(links?|properties|details)\b/, 'a participant’s menu is not drawn'],
  [/^(accTitle|accDescr)\b/, 'an accessible title or description, not read yet'],
  [/^(style|classDef|class)\b/, 'styling: the board draws in its hand’s own colour'],
];

/** Frames whose contents are read and whose frame is not drawn, by their opening word. */
const FRAMES = /^(loop|alt|else|opt|par|and|critical|option|break|rect|box)\b/;

/** Read a sequence-diagram text — `sequenceDiagram` — into its participants and messages. Never throws. */
export function readSequenceText(text: string): SequenceDiagramRead {
  const all = String(text ?? '').replace(/\r\n?/g, '\n').split('\n');
  const notes = new Set<string>();
  const refused: MermaidRefusal[] = [];
  const nodes: SequenceNodeRead[] = [];
  const links: SequenceLinkRead[] = [];
  const byId = new Map<string, SequenceNodeRead>();
  let keyword = '';
  let header: number | null = null;
  let depth = 0;
  const node = (id: string, line: number, symbol?: 'participant' | 'actor', alias?: string): SequenceNodeRead => {
    let n = byId.get(id);
    if (!n) {
      n = { id, line, symbol: symbol ?? 'participant', shape: '', text: id, declared: !!symbol };
      byId.set(id, n);
      nodes.push(n);
    } else if (symbol && !n.declared) {
      n.symbol = symbol;
      n.declared = true;
    }
    if (alias !== undefined) n.text = alias;
    return n;
  };
  const decoded = (raw: string) => unescapeMermaid(raw.trim()).replace(/[ \t]+/g, ' ').trim();

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
      const m = /^(sequenceDiagram)\b\s*(.*)$/.exec(t);
      header = n;
      keyword = m ? m[1] : (/^[A-Za-z][\w-]*/.exec(t)?.[0] ?? '');
      if (!m) refused.push({ line: n, text: t, reason: 'a sequence diagram opens with “sequenceDiagram”' });
      else if (m[2]) refused.push({ line: n, text: m[2], reason: 'nothing is read after the header on its own line' });
      continue;
    }
    // A statement may end in a semicolon — never the one that ends an entity (`#59;`).
    if (t.endsWith(';') && !/#\w+;$/.test(t)) t = t.slice(0, -1).trim();
    if (t === 'end') {
      if (depth > 0) depth--;
      else refused.push({ line: n, text: t, reason: '“end” with no frame open' });
      continue;
    }
    if (FRAMES.test(t)) {
      const word = FRAMES.exec(t)![1];
      if (!['else', 'and', 'option'].includes(word)) depth++;
      refused.push({ line: n, text: t, reason: word === 'box' ? 'a box around participants is not drawn — the participants inside it are' : `a frame (${word}) is not drawn yet — the messages inside it are` });
      continue;
    }
    const not = NOT_DRAWN.find(([re]) => re.test(t));
    if (not) {
      refused.push({ line: n, text: t, reason: not[1] });
      continue;
    }
    // `participant A`, `participant A as Alice`, `actor B as Bob`, and `create participant C`.
    const decl = /^(create\s+)?(participant|actor)\s+(.+)$/.exec(t);
    if (decl) {
      if (decl[1]) notes.add('a participant created partway down is drawn at the top with the rest');
      let rest = decl[3].trim();
      if (/@\{/.test(rest)) {
        refused.push({ line: n, text: t, reason: 'a participant’s shape (@{ … }) is not read — it is drawn as a box' });
        rest = rest.replace(/@\{.*$/, '').trim();
      }
      const as = /^(\S+)\s+as\s+(.*)$/.exec(rest);
      const id = (as ? as[1] : rest).trim();
      if (!id || /\s/.test(id)) {
        refused.push({ line: n, text: t, reason: 'a participant’s id is one word' });
        continue;
      }
      node(id, n, decl[2] as 'participant' | 'actor', as ? decoded(as[2]) : undefined);
      continue;
    }
    // A message: `A->>B: words`, with an activation mark (+/-) before B, and the words optional.
    const a = ACTOR.exec(t);
    if (a) {
      let k = a[0].length;
      while (k < t.length && /\s/.test(t[k])) k++;
      const arrow = ARROWS.find((x) => t.startsWith(x.token, k));
      if (arrow) {
        k += arrow.token.length;
        while (k < t.length && /\s/.test(t[k])) k++;
        if (t[k] === '+' || t[k] === '-') {
          notes.add('an activation (+ or − before a participant) is not drawn');
          k++;
        }
        const rest = t.slice(k);
        const b = ACTOR.exec(rest);
        if (!b) {
          refused.push({ line: n, text: t, reason: 'a message that leads nowhere' });
          continue;
        }
        const after = rest.slice(b[0].length).trim();
        if (after && !after.startsWith(':')) {
          refused.push({ line: n, text: t, reason: `“${after.slice(0, 16)}” follows the message` });
          continue;
        }
        let words = after ? after.slice(1) : '';
        words = words.replace(/^(no)?wrap:/i, '');
        const label = decoded(words);
        const from = node(a[0], n), to = node(b[0], n);
        if (arrow.said) notes.add(arrow.said);
        links.push({
          index: links.length,
          line: n,
          from: from.id,
          to: to.id,
          head: arrow.head,
          written: arrow.token,
          ...(label ? { label } : {}),
          dashed: arrow.dashed,
          arrow: arrow.draws,
          self: from.id === to.id,
        });
        continue;
      }
    }
    refused.push({ line: n, text: t, reason: 'a statement the sequence diagram’s reader cannot parse' });
  }
  if (header === null) refused.push({ line: 1, text: '', reason: 'nothing to read: a sequence diagram opens with “sequenceDiagram”' });
  const said = [...notes];
  const dashedSelf = links.filter((l) => l.self && l.dashed);
  if (dashedSelf.length) said.push(`the board reads a self-message’s loop drawn solid: ${dashedSelf.length === 1 ? 'a dashed self-message is' : 'dashed self-messages are'} drawn solid and read back as ${dashedSelf.length === 1 ? 'a call' : 'calls'} — ${some(dashedSelf.map((l) => `${l.from}${l.written}${l.to}`))}`);
  return { keyword, notation: keyword ? T.notation : null, direction: 'TD', nodes, links, notes: said, refused: refused.sort((x, y) => x.line - y.line) };
}

// ===== In: drawing a read sequence diagram =====

/** A character's width, and a line of words, in text sizes (D3's). */
const CHAR = 0.6;
/** A participant's box: at least this wide and at most, and this tall, in text sizes. */
const BOX_MIN = 7;
const BOX_MAX = 20;
const BOX_H = 3;
/** An actor's head, its body and how far its arms and legs reach, in text sizes. */
const HEAD_D = 1.8;
const BODY = 2.2;
const LIMB = 1.2;
/** The room under an actor for its name, in text sizes. */
const NAME_ROOM = 1.8;
/** The least gap between two participants' boxes, and the room around a message's words, in text sizes. */
const COLUMN_GAP = 4;
const WORDS_ROOM = 3;
/** The first message stands this far under the lowest participant; each next one this far under the last; a self-message's loop is this tall, and this far out. */
const FIRST_ROW = 3;
const ROW = 3.4;
const LOOP_H = 1.8;
const LOOP_W = 3.2;
/** A self-message's barb, and a closed triangle drawn apart at a dashed message's end, in text sizes. */
const BARB = 0.9;
const HEAD = 1.2;
/** A dash, and the gap after it, in text sizes. */
const DASH = 1;
const GAP = 0.6;
/** The lifelines run on this far under the last message. */
const TAIL = 2.5;
/** Ink is laid every this many screen pixels along an outline. */
const INK_STEP = 3;
/** An arrow longer than this on screen is drawn with its barb in proportion (D3's). */
const ARROW_PROPORTION_PX = 800;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const scaled = (a: Point, k: number): Point => ({ x: a.x * k, y: a.y * k });

/** A path walked as ink: every `step` along it — closed, back to its start. */
function inkAlong(points: readonly Point[], step: number, closed = false): Point[] {
  const ring = closed ? [...points, points[0]] : [...points];
  const out: Point[] = [{ ...ring[0] }];
  for (let i = 1; i < ring.length; i++) {
    const a = ring[i - 1], b = ring[i];
    const n = Math.max(1, Math.round(Math.hypot(b.x - a.x, b.y - a.y) / step));
    for (let k = 1; k <= n; k++) out.push({ x: a.x + ((b.x - a.x) * k) / n, y: a.y + ((b.y - a.y) * k) / n });
  }
  return out;
}

/** A closed triangle drawn apart, its apex on `apex`, pointing along `dir`, `len` long — a head heads.ts reads. */
function triangleAt(apex: Point, dir: Point, len: number, step: number): Point[] {
  const l = Math.hypot(dir.x, dir.y) || 1;
  const u = { x: dir.x / l, y: dir.y / l };
  const base = { x: apex.x - u.x * len, y: apex.y - u.y * len };
  const v = { x: -u.y * len * 0.55, y: u.x * len * 0.55 };
  return inkAlong([apex, { x: base.x + v.x, y: base.y + v.y }, { x: base.x - v.x, y: base.y - v.y }], step, true);
}

/** Beside everything on the board: right of its content, level with its top. The origin when the board is empty. */
function besideContent(session: Session, margin: number): Point {
  const st = session.getState();
  let minY = Infinity, maxX = -Infinity;
  for (const id of st.contentIds) {
    const n = st.nodes.get(id);
    const b = n ? (n.reps.find((r) => r.modality === 'fingerprint')?.data as { bounds?: Bounds } | undefined)?.bounds : undefined;
    if (!b || n!.reps.some((r) => r.modality === 'erased')) continue;
    maxX = Math.max(maxX, b.maxX);
    minY = Math.min(minY, b.minY);
  }
  return Number.isFinite(maxX) ? { x: maxX + margin, y: minY } : { x: 0, y: 0 };
}

/** A message as drawn — D3's `DrawnLink`, with what the text wrote. */
export interface DrawnSequenceLink {
  index: number;
  from: string;
  to: string;
  id: string;
  ids: string[];
  /** The arrow it is drawn as. */
  written: string;
  route: 'straight' | 'loop';
  label?: string;
  start: DrawnEnd;
  end: DrawnEnd;
  /** Whether each end is bound — a solid message's are; a row of dashes has no single end to bind. */
  bound: boolean;
}

/** Draw a read sequence diagram. */
function drawSequenceRead(session: Session, read: MermaidRead, opts: DrawMermaidOptions): DrawnMermaid {
  const r = read as SequenceDiagramRead;
  const scale = opts.scale && opts.scale > 0 ? opts.scale : 1;
  const pid = opts.participantId;
  const U = MERMAID_TEXT_PX * scale;
  const notes = [...r.notes];
  const refused = [...r.refused];
  let t = opts.at;
  const next = () => t++;
  const world = (p: Point) => scaled(p, scale);
  const hand = (p: Point) => scaled(p, 1 / scale);

  const nodes = r.nodes.slice(0, MERMAID_MAX_NODES);
  const kept = new Set(nodes.map((x) => x.id));
  if (r.nodes.length > nodes.length) notes.push(`the text holds ${r.nodes.length} participants and the board draws ${MERMAID_MAX_NODES} at most: the first ${MERMAID_MAX_NODES} are drawn`);
  const among = r.links.filter((l) => kept.has(l.from) && kept.has(l.to));
  const links = among.slice(0, MERMAID_MAX_LINKS);
  if (among.length > links.length) notes.push(`the text holds ${among.length} messages among the participants drawn and the board draws ${MERMAID_MAX_LINKS} at most`);
  if (!nodes.length) {
    notes.push('nothing to draw: the text names no participant');
    return { notation: r.notation, ids: {}, links: [], notes, refused, bounds: null, lastAt: t - 1 };
  }

  // Columns: each participant's box as wide as its name, the gaps wide enough for the words between.
  const words = (s: string) => Math.max(...s.split('\n').map((x) => [...x].length), 0);
  const widths = nodes.map((x) => (x.symbol === 'actor' ? Math.max(HEAD_D * 2, words(x.text) * CHAR + 1) : clamp(words(x.text) * CHAR + 3, BOX_MIN, BOX_MAX)) * U);
  const col = new Map(nodes.map((x, i) => [x.id, i]));
  const gaps = nodes.slice(1).map((_, i) => Math.max(COLUMN_GAP * U + (widths[i] + widths[i + 1]) / 2, 0));
  for (const l of links) {
    const i = col.get(l.from)!, j = col.get(l.to)!;
    const need = (words(l.label ?? '') * CHAR + WORDS_ROOM) * U + (l.self ? (LOOP_W + 1) * U : 0);
    if (l.self) {
      if (i < gaps.length) gaps[i] = Math.max(gaps[i], need + widths[i + 1] / 2);
      continue;
    }
    const [lo, hi] = i < j ? [i, j] : [j, i];
    const have = gaps.slice(lo, hi).reduce((a, g) => a + g, 0);
    if (have < need) for (let k = lo; k < hi; k++) gaps[k] += (need - have) / (hi - lo);
  }
  const origin = opts.origin ?? besideContent(session, BOX_MIN * U);
  const xs: number[] = [];
  nodes.forEach((_, i) => xs.push(i ? xs[i - 1] + gaps[i - 1] : origin.x + widths[0] / 2));

  // The participants: a box and its name, or a stick figure and its name; then, under the lowest, the messages.
  const ids: Record<string, string> = {};
  const foot: number[] = [];
  const drawnMarks: string[] = [];
  const top = origin.y;
  const actorH = (HEAD_D + BODY + LIMB) * U;
  const headTop = nodes.some((x) => x.symbol === 'actor') ? top : top;
  for (const [i, x] of nodes.entries()) {
    if (x.symbol === 'actor') {
      const cx = xs[i], d = HEAD_D * U;
      const head = session.addStroke(strokeFor({ shape: 'circle', x: hand({ x: cx - d / 2, y: headTop }).x, y: hand({ x: 0, y: headTop }).y, w: d / scale, h: d / scale })!.map(world), next(), pid, scale, { content: true });
      const neck = headTop + d, hip = neck + BODY * U;
      const line = (a: Point, b: Point) => session.addStroke(strokeFor({ shape: 'line', from: hand(a), to: hand(b) })!.map(world), next(), pid, scale, { content: true });
      const body = line({ x: cx, y: neck }, { x: cx, y: hip });
      const arms = line({ x: cx - LIMB * U, y: neck + 0.6 * U }, { x: cx + LIMB * U, y: neck + 0.6 * U });
      const legs = session.addStroke(inkAlong([{ x: cx - LIMB * U * 0.8, y: hip + LIMB * U }, { x: cx, y: hip }, { x: cx + LIMB * U * 0.8, y: hip + LIMB * U }], INK_STEP * scale), next(), pid, scale, { content: true });
      drawnMarks.push(head, body, arms, legs);
      ids[x.id] = head;
      if (x.text.trim()) session.label({ nodeId: head, text: x.text, participantId: pid, at: next() });
      foot.push(headTop + actorH + NAME_ROOM * U);
    } else {
      const w = widths[i], h = BOX_H * U;
      const box = session.addStroke(strokeFor({ shape: 'rectangle', x: (xs[i] - w / 2) / scale, y: top / scale, w: w / scale, h: h / scale })!.map(world), next(), pid, scale, { content: true });
      drawnMarks.push(box);
      ids[x.id] = box;
      if (x.text.trim()) session.label({ nodeId: box, text: x.text, participantId: pid, at: next() });
      foot.push(top + h);
    }
  }
  const lowest = Math.max(...foot);
  let y = lowest + FIRST_ROW * U;
  const rows = links.map((l) => {
    const at = y;
    y += l.self ? ROW * U + LOOP_H * U : ROW * U;
    return at;
  });
  const bottom = y - ROW * U + TAIL * U + (links.length ? 0 : ROW * U);
  const lifelines = nodes.map((x, i) => {
    const from = { x: xs[i], y: foot[i] + (x.symbol === 'actor' ? 0.3 * U : 0) };
    const id = session.addStroke(strokeFor({ shape: 'line', from: hand(from), to: hand({ x: xs[i], y: bottom }) })!.map(world), next(), pid, scale, { content: true });
    drawnMarks.push(id);
    return { id, top: from, bottom: { x: xs[i], y: bottom } };
  });
  const along = (i: number, yy: number): DrawnEnd => {
    const l = lifelines[i];
    const share = (yy - l.top.y) / Math.max(1e-9, l.bottom.y - l.top.y);
    return { nodeId: l.id, site: { kind: `along:${T.notation}`, index: alongIndex(0, share) }, of: 'notation', port: 'lifeline', point: { x: l.top.x, y: yy } };
  };

  // The messages, down the page in the text's order.
  const drawn: DrawnSequenceLink[] = [];
  const placeholder: string[] = [];
  for (const [k, l] of links.entries()) {
    const i = col.get(l.from)!, j = col.get(l.to)!;
    const yy = rows[k];
    const ends = { start: along(i, yy), end: along(j, l.self ? yy + LOOP_H * U : yy) };
    const own: string[] = [];
    let bound = false;
    if (l.self) {
      // A loop out to the right (to the left from the last participant) and back, its barb folding back out where it arrives.
      const side = i === nodes.length - 1 && nodes.length > 1 ? -1 : 1;
      const x = xs[i], w = LOOP_W * U * side, h = LOOP_H * U;
      const tip = { x, y: yy + h };
      const b = BARB * U;
      const wing = (s: number): Point => ({ x: x + side * b * Math.cos(Math.PI / 6), y: tip.y + s * b * Math.sin(Math.PI / 6) });
      const path = l.head === 'none' ? [{ x, y: yy }, { x: x + w, y: yy }, { x: x + w, y: yy + h }, tip] : [{ x, y: yy }, { x: x + w, y: yy }, { x: x + w, y: yy + h }, tip, wing(-1), tip, wing(1)];
      const id = session.addStroke(inkAlong(path, INK_STEP * scale), next(), pid, scale, { content: true });
      own.push(id);
      session.bind({ strokeId: id, nodeId: ends.start.nodeId, site: ends.start.site, end: 'start', at: next(), participantId: pid });
      session.bind({ strokeId: id, nodeId: ends.end.nodeId, site: ends.end.site, end: 'end', at: next(), participantId: pid });
      bound = true;
    } else if (!l.dashed) {
      const P = ends.start.point, Q = ends.end.point;
      const len = Math.abs(Q.x - P.x) / scale;
      const kk = Math.max(1, len / ARROW_PROPORTION_PX);
      const small = (p: Point) => scaled(p, 1 / (scale * kk));
      const shaft = l.head === 'none' ? strokeFor({ shape: 'line', from: hand(P), to: hand(Q) })! : strokeFor({ shape: 'arrow', from: small(P), to: small(Q) })!.map((p) => scaled(p, kk));
      const id = session.addStroke(shaft.map(world), next(), pid, scale, { content: true });
      own.push(id);
      session.bind({ strokeId: id, nodeId: ends.start.nodeId, site: ends.start.site, end: 'start', at: next(), participantId: pid });
      session.bind({ strokeId: id, nodeId: ends.end.nodeId, site: ends.end.site, end: 'end', at: next(), participantId: pid });
      bound = true;
      if (l.head === 'both') {
        // A stroke with a barb at each end reads as neither: the second head is a closed triangle drawn apart (D3's).
        const dir = { x: P.x - Q.x, y: 0 };
        const tri = session.addStroke(triangleAt(P, dir, HEAD * U, (INK_STEP * scale) / 1.5), next(), pid, scale, { content: true });
        own.push(tri);
      }
    } else {
      // Dashes from the sender toward the receiver, stopping a head short of each end that carries one; each head a closed triangle.
      const P = ends.start.point, Q = ends.end.point;
      const dir = Math.sign(Q.x - P.x) || 1;
      const startGap = l.head === 'both' ? HEAD * U : 0;
      const endGap = l.head === 'none' ? 0 : HEAD * U;
      const x0 = P.x + dir * startGap, x1 = Q.x - dir * endGap;
      const span = Math.abs(x1 - x0);
      const n = Math.max(3, Math.round((span + GAP * U) / ((DASH + GAP) * U)));
      const unit = (span + GAP * U) / n;
      const dash = unit - GAP * U;
      for (let d = 0; d < n; d++) {
        const a = x0 + dir * d * unit, b = a + dir * dash;
        own.push(session.addStroke(strokeFor({ shape: 'line', from: hand({ x: a, y: yy }), to: hand({ x: b, y: yy }) })!.map(world), next(), pid, scale, { content: true }));
      }
      if (l.head !== 'none') own.push(session.addStroke(triangleAt(Q, { x: dir, y: 0 }, HEAD * U, (INK_STEP * scale) / 1.5), next(), pid, scale, { content: true }));
      if (l.head === 'both') own.push(session.addStroke(triangleAt(P, { x: -dir, y: 0 }, HEAD * U, (INK_STEP * scale) / 1.5), next(), pid, scale, { content: true }));
    }
    const label = l.label?.trim();
    if (label) session.label({ nodeId: own[0], text: label, participantId: pid, at: next() });
    if (label === UNREAD_WRITING) placeholder.push(`${l.from}${l.written}${l.to}`);
    drawnMarks.push(...own);
    drawn.push({ index: l.index, from: l.from, to: l.to, id: own[0], ids: own, written: l.self && l.dashed ? (l.head === 'none' ? '->' : '->>') : l.arrow, route: l.self ? 'loop' : 'straight', ...(label ? { label } : {}), start: ends.start, end: ends.end, bound });
  }
  for (const x of nodes) if (x.text === UNREAD_WRITING) placeholder.push(x.id);

  // Read back, as the board will read it: every participant one, every message of the kind written, between the participants written.
  const back = readSequence(session.getState(), drawnMarks);
  const lost = nodes.filter((x) => !back?.symbols.some((p) => p.id === ids[x.id] && p.symbol === x.symbol)).map((x) => x.id);
  if (lost.length) notes.push(`read back, ${some(lost)} ${lost.length === 1 ? 'does' : 'do'} not read as ${lost.length === 1 ? 'a participant' : 'participants'} as written`);
  const misread = drawn.filter((d, k) => {
    const got = back?.connectors.find((c) => c.ids.includes(d.id));
    return !got || got.order !== k + 1 || got.arrow !== d.written || got.from !== ids[d.from] || got.to !== ids[d.to];
  });
  if (misread.length) notes.push(`read back, ${misread.length === 1 ? 'a message does' : `${count(misread.length)} messages do`} not read as written: ${some(misread.map((d) => `${d.from}${d.written}${d.to}`))}`);
  if (placeholder.length) notes.push(`“${UNREAD_WRITING}” is what D2 writes for writing nobody has read: it is put on the ink as the words, since the words are not known — ${some(placeholder)}`);

  const minX = Math.min(...xs.map((x, i) => x - widths[i] / 2)), maxX = Math.max(...xs.map((x, i) => x + widths[i] / 2), ...drawn.filter((d) => d.route === 'loop').map((d) => d.start.point.x + LOOP_W * U));
  return {
    notation: r.notation,
    ids,
    links: drawn.map((d) => ({ ...d, drawn: d.written.startsWith('<<') ? '<-->' : d.written.endsWith('>>') ? '-->' : '---' })) as unknown as DrawnMermaid['links'],
    notes,
    refused,
    bounds: { minX, minY: top, maxX, maxY: bottom },
    lastAt: t - 1,
  };
}

/** The sequence diagram's reader: `sequenceDiagram`. */
export const SEQUENCE_READER: MermaidReader = {
  notation: T.notation,
  read: readSequenceText,
  draw: drawSequenceRead,
};

registerMermaidReader('sequenceDiagram', SEQUENCE_READER);
