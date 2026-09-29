// Mermaid out and in for the state diagram (V1-PLAN §3, §9 D5's state half; D2
// and D3's rules, for `stateDiagram-v2`).
//
// Out: a state reading (state.ts) said as Mermaid text, at tier 1:
//
//   stateDiagram-v2
//       direction LR
//       state "Idle" as stroke_1
//       state "Running" as stroke_2
//       [*] --> stroke_1
//       stroke_1 --> stroke_2: start
//       stroke_2 --> stroke_2: tick
//       stroke_2 --> [*]: stop
//
//   - **D2's rules hold.** Ids are the marks' own said safely (`mermaidIds`: a
//     state is its box's stroke, or a ruled box's figure); writing nobody has
//     read is "(unread writing)", named in `unread` and the notes, never
//     invented; the order is the drawing's — states in reading order, columns
//     across when the transitions run across, then transitions by the states
//     they leave and arrive at — never the log's. `direction LR` says which
//     way it runs when it runs across; down, Mermaid's own default, is
//     left unsaid.
//   - **The initial dot and the final ring are both `[*]`**: where a
//     transition leaves it, Mermaid reads it as the start; where one arrives,
//     as the end. A board's several initial dots are one `[*]` to Mermaid, and
//     a transition INTO an initial dot or OUT OF a final ring reads the other
//     way round there — each said in the notes.
//   - **A state is `state "<name>" as <id>`**, words with `#`, `;` and markup
//     as Mermaid's entities (a quoted description ends at the quote, and
//     Mermaid's preprocessing reads `#…;`, `%%` and a backtick), a line break
//     as `<br>`; a transition is `<from> --> <to>: <words>`, the words the
//     event written beside it — a transition with no writing has no colon.
//
// In: a reader for `stateDiagram` and `stateDiagram-v2` — the subset the
// writer writes, and the common forms a hand writes besides (`state X`, `X :
// words`, `direction`, `[*]`) — with what it does not draw refused, each
// statement with its line and why (a composite state's frame — its contents are
// read flat — a choice, a fork, a join, a note, concurrent regions, styles and
// clicks). The parse is drawn as ink the notation reads: each state a rounded
// box, the initial `[*]` a small dot scribbled solid in one stroke, the final
// one a ring round a second ring, laid out by D3's layered layout; each
// transition an arrow (an arc bowing around a state in the way, its head a
// closed triangle drawn apart) bound at both ends to the states it joins — at
// a side's middle where the box offers one, else a place along its border
// (`along:state`); a transition from a state to itself a loop out of its
// side, bound at both ends, its barb where it arrives; a state's name and a
// transition's words are labels on their own ink. Every mark is a confident
// shape or wider than a letter, and read back, what does not read as written
// is said. Tier 1; nothing derived enters the log; wrap the call in
// `session.withTool` for one undo.

import type { Bounds, Point } from '../types';
import type { Session } from '../session/session';
import { getRep } from '../session/nodes';
import { magnetSites } from '../session/magnets';
import { alongIndex } from '../session/ports';
import { strokeFor } from '../session/synthesize';
import type { NotationReading } from './notation';
import type { MermaidLink, MermaidOptions, MermaidText } from './mermaid';
import { inReadingOrder, mermaidIds, naturalCompare, registerMermaidWriter, unescapeMermaid, UNREAD_WRITING } from './mermaid';
import type { DrawMermaidOptions, DrawnEnd, DrawnMermaid, MermaidFlow, MermaidLinkRead, MermaidNodeRead, MermaidRead, MermaidReader, MermaidRefusal } from './mermaid-in';
import { MERMAID_MAX_LINKS, MERMAID_MAX_NODES, MERMAID_TEXT_PX, arcThrough, registerMermaidReader } from './mermaid-in';
import { layoutLayered } from './layered';
import type { Standing } from './box-routing';
import { routeBoxes } from './box-routing';
import type { StateReading } from './state';
import { STATE_TABLE, readState, statePortsOf } from './state';
import { countWord, notesFor, someWords, wordsFor } from './graph-kit';

const T = STATE_TABLE;

// ===== Out: the text =====

/** What Mermaid would read as something other than the character, in a state diagram's words: the entity it decodes back to. */
const ENTITY: Record<string, string> = { '#': '#35;', ';': '#59;', '"': '#quot;', '%': '#37;', '`': '#96;', '<': '#lt;', '>': '#gt;', '&': '#amp;' };
/** Mermaid's preprocessing strips the last character of a line matching these, so a line that does has its colons written as entities too. */
const PREPROCESSED = /style|classDef/;
const START_END = '[*]';

/**
 * Words as a state diagram's text — a description in its quotes, a transition's
 * words after the colon: every character Mermaid would read otherwise as its
 * entity, a line break as `<br>`, a space at either end so it survives.
 * `unescapeMermaid` is the exact inverse.
 */
export function stateText(text: string, opts: { colons?: boolean } = {}): string {
  const lines = String(text)
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((line) => [...line.replace(/\t/g, ' ').replace(/[\u0000-\u0008\u000b-\u001f\u007f]/g, '')].map((ch) => ENTITY[ch] ?? (opts.colons && ch === ':' ? '#58;' : ch)).join(''));
  const body = lines.join('<br>').replace(/^ /, '#32;').replace(/ $/, '#32;');
  return body.length ? body : '#32;';
}

const centreOf = (b: Bounds): Point => ({ x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 });

/**
 * The state diagram in Mermaid: `stateDiagram-v2`, `direction LR` when the
 * transitions run across; each state declared with its name; each transition
 * from and to what it joins, the initial dot and the final ring `[*]`.
 */
export function writeState(reading: NotationReading, opts: MermaidOptions = {}): MermaidText {
  const r = reading as StateReading;
  const symbols = r.symbols;
  const states = symbols.filter((s) => s.symbol === 'state');
  const idOf = mermaidIds(states.map((s) => s.id));
  const byId = new Map(symbols.map((s) => [s.id, s]));
  const transitions = r.connectors.filter((k) => byId.has(k.from) && byId.has(k.to));

  // Which way it runs: between the centres of what each transition joins.
  let down = 0, acrossSum = 0, downward = 0;
  const moving = transitions.filter((k) => k.from !== k.to);
  for (const k of moving) {
    const a = centreOf(byId.get(k.from)!.bounds), b = centreOf(byId.get(k.to)!.bounds);
    down += Math.abs(b.y - a.y);
    acrossSum += Math.abs(b.x - a.x);
    if (Math.abs(b.y - a.y) >= Math.abs(b.x - a.x)) downward++;
  }
  const direction: { value: 'TD' | 'LR'; reason: string } = !moving.length
    ? { value: 'TD', reason: 'no transition between two states to follow' }
    : acrossSum > down
      ? { value: 'LR', reason: `the transitions run across — between what they join, ${Math.round(acrossSum)} across against ${Math.round(down)} down; ${moving.length - downward} of ${moving.length} more across than down` }
      : { value: 'TD', reason: `the transitions run down — between what they join, ${Math.round(down)} down against ${Math.round(acrossSum)} across; ${downward} of ${moving.length} more down than across` };
  const across = direction.value === 'LR';
  const ordered = inReadingOrder(symbols, (s) => s.bounds, (s) => s.id, across);
  const place = new Map(ordered.map((s, i) => [s.id, i]));
  const { wordsOf, unread, unreadIds } = wordsFor(reading, opts);

  const lines: string[] = [T.mermaid.header];
  if (across) lines.push('    direction LR');
  const ids: Record<string, string> = {};
  const marks: Record<string, string[]> = {};
  const blank: string[] = [];
  for (const s of ordered.filter((x) => x.symbol === 'state')) {
    const m = idOf.get(s.id)!;
    const words = wordsOf(s.text, s.labels, s.id, `the name of ${m}`);
    if (words === null) blank.push(m);
    const text = words ?? ' ';
    lines.push(`    state "${stateText(text, { colons: PREPROCESSED.test(m + text) })}" as ${m}`);
    ids[m] = s.id;
    marks[m] = [...new Set(s.ids.length ? s.ids : [s.id])].sort(naturalCompare);
  }

  const links: MermaidLink[] = [];
  const said: string[] = [];
  const backwards: string[] = [];
  const written = [...transitions].sort((p, q) => place.get(p.from)! - place.get(q.from)! || place.get(p.to)! - place.get(q.to)! || naturalCompare(p.id, q.id));
  for (const k of written) {
    const from = byId.get(k.from)!, to = byId.get(k.to)!;
    const a = from.symbol === 'state' ? idOf.get(from.id)! : START_END;
    const b = to.symbol === 'state' ? idOf.get(to.id)! : START_END;
    const words = wordsOf(k.text, k.labels, k.id, `the label of ${a} --> ${b}`);
    if (from.symbol === 'final') backwards.push(`${a} --> ${b} leaves a final ring`);
    if (to.symbol === 'initial') backwards.push(`${a} --> ${b} arrives at an initial dot`);
    if (a === START_END && b === START_END) said.push('a transition straight from the initial dot to the final ring cannot be said in Mermaid: both are [*]');
    lines.push(`    ${a} --> ${b}${words === null ? '' : `: ${stateText(words, { colons: PREPROCESSED.test(a + b + words) })}`}`);
    links.push({ index: links.length, id: k.id, ids: [k.id, ...[...new Set(k.ids)].filter((x) => x !== k.id).sort(naturalCompare)], from: a, to: b });
  }

  // What the text does not say as drawn.
  const extra: string[] = [];
  const nInitial = symbols.filter((s) => s.symbol === 'initial').length, nFinal = symbols.filter((s) => s.symbol === 'final').length;
  if (nInitial > 1) extra.push(`${countWord(nInitial)} initial dots are one [*] to Mermaid: every transition that leaves one starts from the same start`);
  if (nFinal > 1) extra.push(`${countWord(nFinal)} final rings are one [*] to Mermaid: every transition that arrives at one ends at the same end`);
  if (backwards.length) extra.push(`Mermaid reads [*] as the start where a transition leaves it and as the end where one arrives, so ${someWords(backwards)} ${backwards.length === 1 ? 'reads' : 'read'} the other way there`);
  extra.push(...said);
  const saidIds = new Set<string>([...symbols.flatMap((s) => [s.id, ...s.ids, ...s.labels]), ...transitions.flatMap((k) => [...k.ids, ...k.labels])]);
  const notes = notesFor(reading, saidIds, unread, { what: 'state', plural: 'states', ids: blank }, extra);

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

registerMermaidWriter(T.notation, writeState);

// ===== In: reading a stateDiagram text =====

/** A node as the text gives it: a state, or the diagram's initial or final `[*]`. */
export interface StateNodeRead extends MermaidNodeRead {
  symbol: 'state' | 'initial' | 'final';
  /** Declared with `state`, or only named in a transition. */
  declared: boolean;
}

/** A transition as the text gives it. */
export interface StateLinkRead extends MermaidLinkRead {
  self: boolean;
}

/** A stateDiagram text as read, before anything is drawn. */
export interface StateDiagramRead extends MermaidRead {
  nodes: StateNodeRead[];
  links: StateLinkRead[];
}

/** The ids the reader gives the diagram's `[*]` nodes: no state's id has a bracket in it. */
export const INITIAL_ID = '[*]';
export const FINAL_ID = '[*]:end';

/** Statements the reader does not draw, by their first word, and why. */
const NOT_DRAWN: [RegExp, string][] = [
  [/^note\b/i, 'a note is not drawn yet'],
  [/^(classDef|class|style|cssClass)\b/, 'styling: the board draws in its hand’s own colour'],
  [/^click\b/, 'a click is not drawn'],
  [/^(hide|scale)\b/, 'a display setting for mermaid.js — nothing on the board takes it'],
  [/^(accTitle|accDescr)\b/, 'an accessible title or description, not read yet'],
  [/^title\b/, 'a title is not drawn yet'],
  [/^--+$/, 'a divider between concurrent regions is not drawn: the states on both sides are, in one'],
];

const DIRECTIONS: Record<string, MermaidFlow> = { TB: 'TD', TD: 'TD', BT: 'BT', LR: 'LR', RL: 'RL' };
/** A state's id as a statement names it: no space, no arrow, no colon. */
const STATE_ID = /^[^\s:{}<>"]+/u;

/** Read a state-diagram text — `stateDiagram` or `stateDiagram-v2` — into its states and transitions. Never throws. */
export function readStateText(text: string): StateDiagramRead {
  const all = String(text ?? '').replace(/\r\n?/g, '\n').split('\n');
  const notes = new Set<string>();
  const refused: MermaidRefusal[] = [];
  const nodes: StateNodeRead[] = [];
  const links: StateLinkRead[] = [];
  const byId = new Map<string, StateNodeRead>();
  let keyword = '';
  let header: number | null = null;
  let direction: MermaidFlow = 'TD';
  let depth = 0;
  const decoded = (raw: string) => unescapeMermaid(raw.trim()).replace(/[ \t]+/g, ' ').trim();
  const node = (id: string, line: number): StateNodeRead => {
    let n = byId.get(id);
    if (!n) {
      const symbol = id === INITIAL_ID ? 'initial' : id === FINAL_ID ? 'final' : 'state';
      n = { id, line, symbol, shape: '', text: symbol === 'state' ? id : '', declared: false };
      byId.set(id, n);
      nodes.push(n);
    }
    return n;
  };
  const endpoint = (raw: string, role: 'from' | 'to', line: number): StateNodeRead | null => {
    if (raw === START_END) return node(role === 'from' ? INITIAL_ID : FINAL_ID, line);
    const m = STATE_ID.exec(raw);
    if (!m || m[0] !== raw) return null;
    return node(raw, line);
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
      const m = /^(stateDiagram(?:-v2)?)\b\s*(.*)$/.exec(t);
      header = n;
      keyword = m ? m[1] : (/^[A-Za-z][\w-]*/.exec(t)?.[0] ?? '');
      if (!m) refused.push({ line: n, text: t, reason: 'a state diagram opens with “stateDiagram-v2”' });
      else if (m[2]) refused.push({ line: n, text: m[2], reason: 'nothing is read after the header on its own line' });
      continue;
    }
    // A statement may end in a semicolon — never the one that ends an entity (`#59;`).
    if (t.endsWith(';') && !/#\w+;$/.test(t)) t = t.slice(0, -1).trim();
    if (t === '}') {
      if (depth > 0) depth--;
      else refused.push({ line: n, text: t, reason: '“}” with no composite state open' });
      continue;
    }
    const dir = /^direction\s+(\w+)$/i.exec(t);
    if (dir) {
      const d = DIRECTIONS[dir[1].toUpperCase()];
      if (d && depth === 0) direction = d;
      else if (!d) refused.push({ line: n, text: t, reason: `“${dir[1]}” is no direction: TB, TD, BT, LR or RL` });
      continue;
    }
    const not = NOT_DRAWN.find(([re]) => re.test(t));
    if (not) {
      refused.push({ line: n, text: t, reason: not[1] });
      continue;
    }
    // `state "words" as id`, `state id`, `state id <<choice>>`, `state id {` — a composite's frame is not drawn, its contents are.
    const decl = /^state\s+(.+)$/.exec(t);
    if (decl) {
      let rest = decl[1].trim();
      let opens = false;
      if (rest.endsWith('{')) {
        opens = true;
        rest = rest.slice(0, -1).trim();
      }
      const special = /<<\s*(choice|fork|join)\s*>>/i.exec(rest);
      if (special) {
        refused.push({ line: n, text: t, reason: `a ${special[1].toLowerCase()} is not drawn as one — it is drawn as a state` });
        rest = rest.replace(special[0], '').trim();
      }
      const quoted = /^"([^"]*)"\s+as\s+(\S+)$/.exec(rest) ?? /^(\S+)\s+as\s+"([^"]*)"$/.exec(rest);
      let id: string, words: string | undefined;
      if (quoted) {
        if (rest.startsWith('"')) [words, id] = [quoted[1], quoted[2]];
        else [id, words] = [quoted[1], quoted[2]];
      } else {
        id = rest;
        words = undefined;
      }
      if (!id || /\s/.test(id) || id === START_END) {
        refused.push({ line: n, text: t, reason: 'a state’s id is one word' });
        if (opens) depth++;
        continue;
      }
      const k = node(id, n);
      k.declared = true;
      if (words !== undefined) k.text = decoded(words);
      if (opens) {
        depth++;
        refused.push({ line: n, text: t, reason: `a composite state’s frame is not drawn — the states inside ${id} are, in the one diagram` });
      }
      continue;
    }
    // A transition: `A --> B`, `[*] --> A`, `A --> [*]`, with `: words` after.
    const arrow = t.indexOf('-->');
    if (arrow > 0) {
      const left = t.slice(0, arrow).trim();
      let right = t.slice(arrow + 3).trim();
      let words: string | undefined;
      const colon = right.indexOf(':');
      if (colon >= 0) {
        words = decoded(right.slice(colon + 1));
        right = right.slice(0, colon).trim();
      }
      if (left === START_END && right === START_END) {
        refused.push({ line: n, text: t, reason: 'a transition from the start straight to the end joins nothing' });
        continue;
      }
      const a = endpoint(left, 'from', n), b = endpoint(right, 'to', n);
      if (!a || !b) {
        refused.push({ line: n, text: t, reason: 'a transition names a state by one word on each side of “-->”' });
        continue;
      }
      if (depth > 0 && (a.symbol !== 'state' || b.symbol !== 'state')) notes.add('a composite state’s own start and end are the diagram’s [*] here: it has one');
      if (b.symbol === 'initial' || a.symbol === 'final') continue;
      links.push({ index: links.length, line: n, from: a.id, to: b.id, head: 'forward', written: '-->', ...(words ? { label: words } : {}), self: a.id === b.id });
      continue;
    }
    // `id : words` — a state's description (Mermaid adds each such line to it).
    const desc = /^([^\s:]+)\s*:\s*(.*)$/.exec(t);
    if (desc && desc[1] !== START_END) {
      const k = node(desc[1], n);
      const words = decoded(desc[2]);
      k.text = !k.declared && k.text === k.id ? words : `${k.text}\n${words}`;
      k.declared = true;
      continue;
    }
    // A lone state id.
    const lone = STATE_ID.exec(t);
    if (lone && lone[0] === t) {
      node(t, n);
      continue;
    }
    refused.push({ line: n, text: t, reason: 'a statement the state diagram’s reader cannot parse' });
  }
  if (header === null) refused.push({ line: 1, text: '', reason: 'nothing to read: a state diagram opens with “stateDiagram-v2”' });
  const said = [...notes];
  const finals = nodes.filter((n) => n.symbol === 'final').length;
  if (nodes.some((n) => n.symbol === 'initial') && nodes.filter((n) => n.symbol === 'initial').length > 1) said.push('every [*] a transition leaves is one start');
  if (finals > 1) said.push('every [*] a transition arrives at is one end');
  return { keyword, notation: keyword ? T.notation : null, direction, nodes, links, notes: said, refused: refused.sort((x, y) => x.line - y.line) };
}

// ===== In: drawing a read state diagram =====

/** A character's width, and the text's line, in text sizes (D3's). */
const CHAR = 0.6;
const LINE = 1.4;
/** A state: at least this wide and at most, and this tall for one line, in text sizes. */
const STATE_MIN = 7;
const STATE_MAX = 18;
const STATE_H = 3.4;
/** A state's corners are rounded to this share of its height. */
const ROUND = 0.3;
/** The initial dot's diameter, and the final ring's, in text sizes: small beside a state (state.ts SMALL_BESIDE), well above the hand's resolution. */
const DOT = 1.5;
const RING = 2.3;
/** The final ring's inner spot: this share of the ring's diameter. */
const RING_SPOT = 0.48;
/** A spiral fills a dot at this pitch in screen pixels: the ink runs a good many times its outline (state.ts FILLED_PATH). */
const SPIRAL_PITCH_PX = 1.6;
/** The gap between ranks and between neighbours, in text sizes; neighbours stand wider apart where a loop is drawn between them. */
const RANK_GAP = 4;
const NODE_GAP = 4;
const NODE_GAP_LOOP = 6;
/** A loop out of a state: this wide along its side, this far out, its barb this long, in text sizes. */
const LOOP_W = 2.4;
const LOOP_H = 3;
const BARB = 0.85;
/** Ink is laid every this many screen pixels. */
const INK_STEP = 3;
/** An arrow longer than this on screen is drawn with its barb in proportion (D3's). */
const ARROW_PROPORTION_PX = 800;
/** A closed triangle drawn apart at an arc's end, in text sizes. */
const HEAD = 1.2;

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const scaled = (a: Point, k: number): Point => ({ x: a.x * k, y: a.y * k });
const sub = (a: Point, b: Point): Point => ({ x: a.x - b.x, y: a.y - b.y });
const unit = (v: Point): Point => {
  const l = Math.hypot(v.x, v.y);
  return l > 1e-12 ? { x: v.x / l, y: v.y / l } : { x: 1, y: 0 };
};

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

/** A rounded box `w` × `h` about (cx, cy), corners rounded by `r`, walked as ink. */
function roundedBox(cx: number, cy: number, w: number, h: number, r: number, step: number): Point[] {
  const x0 = cx - w / 2, x1 = cx + w / 2, y0 = cy - h / 2, y1 = cy + h / 2;
  const corner = (ccx: number, ccy: number, from: number): Point[] =>
    Array.from({ length: 7 }, (_, i) => {
      const a = from + (i / 6) * (Math.PI / 2);
      return { x: ccx + r * Math.cos(a), y: ccy + r * Math.sin(a) };
    });
  const ring = [...corner(x0 + r, y0 + r, Math.PI), ...corner(x1 - r, y0 + r, Math.PI * 1.5), ...corner(x1 - r, y1 - r, 0), ...corner(x0 + r, y1 - r, Math.PI / 2)];
  return inkAlong(ring, step, true);
}

/** A spot filled solid in one stroke: a spiral in from its edge, `pitch` between the turns. */
function spiralIn(cx: number, cy: number, r: number, pitch: number, step: number): Point[] {
  const turns = Math.max(3, (0.88 * r) / pitch);
  const n = Math.max(24, Math.round((turns * 2 * Math.PI * r * 0.56) / step));
  const out: Point[] = [];
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const rr = r * (1 - 0.88 * t);
    const a = t * turns * 2 * Math.PI;
    out.push({ x: cx + rr * Math.cos(a), y: cy + rr * Math.sin(a) });
  }
  return out;
}

/** A closed triangle drawn apart, its apex on `apex`, pointing along `dir`, `len` long — a head heads.ts reads. */
function triangleAt(apex: Point, dir: Point, len: number, step: number): Point[] {
  const u = unit(dir);
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
    const fp = n && !getRep(n, 'erased') ? (getRep(n, 'fingerprint')?.data as { bounds?: Bounds } | undefined) : undefined;
    if (!fp?.bounds) continue;
    maxX = Math.max(maxX, fp.bounds.maxX);
    minY = Math.min(minY, fp.bounds.minY);
  }
  return Number.isFinite(maxX) ? { x: maxX + margin, y: minY } : { x: 0, y: 0 };
}

/** A closed border as a span: the points with the first repeated, the length to each. */
function spanOf(points: readonly Point[]) {
  const pts = points.map((p) => ({ x: p.x, y: p.y }));
  pts.push({ ...pts[0] });
  const cum = [0];
  for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  return { pts, cum, length: cum[cum.length - 1] };
}
type Span = ReturnType<typeof spanOf>;

/** The nearest point on the border to `at`, as a share of its length. */
function shareAt(span: Span, at: Point): number {
  let best = Infinity, bestT = 0;
  for (let i = 1; i < span.pts.length; i++) {
    const a = span.pts[i - 1], b = span.pts[i];
    const dx = b.x - a.x, dy = b.y - a.y;
    const l2 = dx * dx + dy * dy;
    const u = l2 > 0 ? Math.max(0, Math.min(1, ((at.x - a.x) * dx + (at.y - a.y) * dy) / l2)) : 0;
    const d = Math.hypot(at.x - (a.x + u * dx), at.y - (a.y + u * dy));
    if (d < best) {
      best = d;
      bestT = (span.cum[i - 1] + u * (span.cum[i] - span.cum[i - 1])) / span.length;
    }
  }
  return Math.round(bestT * 1000) / 1000;
}

/** The point a share along the border. */
function pointAtShare(span: Span, t: number): Point {
  const target = t * span.length;
  let i = 1;
  while (i < span.cum.length - 1 && span.cum[i] < target) i++;
  const a = span.pts[i - 1], b = span.pts[i];
  const seg = span.cum[i] - span.cum[i - 1];
  const u = seg > 0 ? (target - span.cum[i - 1]) / seg : 0;
  return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u };
}

/** A transition as drawn — D3's `DrawnLink`, with what the text wrote. */
export interface DrawnStateLink {
  index: number;
  from: string;
  to: string;
  id: string;
  ids: string[];
  written: '-->';
  /** Straight, an arc bowing around a state in the way, or a loop out of its state. */
  route: 'straight' | 'arc' | 'loop';
  label?: string;
  start: DrawnEnd;
  end: DrawnEnd;
  /** Whether each end is bound. */
  bound: [boolean, boolean];
}

/** Draw a read state diagram. */
function drawStateRead(session: Session, read: MermaidRead, opts: DrawMermaidOptions): DrawnMermaid {
  const r = read as StateDiagramRead;
  const scale = opts.scale && opts.scale > 0 ? opts.scale : 1;
  const pid = opts.participantId;
  const U = MERMAID_TEXT_PX * scale;
  const notes = [...r.notes];
  const refused = [...r.refused];
  let t = opts.at;
  const next = () => t++;
  const hand = (p: Point) => scaled(p, 1 / scale);

  const nodes = r.nodes.slice(0, MERMAID_MAX_NODES);
  const kept = new Set(nodes.map((x) => x.id));
  if (r.nodes.length > nodes.length) notes.push(`the text holds ${r.nodes.length} states and the board draws ${MERMAID_MAX_NODES} at most: the first ${MERMAID_MAX_NODES} are drawn`);
  const symbolOf = new Map(nodes.map((x) => [x.id, x.symbol]));
  let among = r.links.filter((l) => kept.has(l.from) && kept.has(l.to));
  const loopsOnMarks = among.filter((l) => l.self && symbolOf.get(l.from) !== 'state');
  if (loopsOnMarks.length) notes.push(`a transition from the start or the end to itself is not drawn — ${someWords(loopsOnMarks.map((l) => l.from))}`);
  among = among.filter((l) => !(l.self && symbolOf.get(l.from) !== 'state'));
  const links = among.slice(0, MERMAID_MAX_LINKS);
  if (among.length > links.length) notes.push(`the text holds ${among.length} transitions among the states drawn and the board draws ${MERMAID_MAX_LINKS} at most`);
  if (!nodes.length) {
    notes.push('nothing to draw: the text names no state');
    return { notation: r.notation, direction: r.direction, ids: {}, links: [], notes, refused, bounds: null, lastAt: t - 1 };
  }

  // Sizes, in the hand's space: a state as wide as its name, a dot and a ring small beside it.
  const words = (s: string) => Math.max(...s.split('\n').map((x) => [...x].length), 0);
  const size = new Map(
    nodes.map((x) => {
      if (x.symbol === 'initial') return [x.id, { w: DOT * U, h: DOT * U }] as const;
      if (x.symbol === 'final') return [x.id, { w: RING * U, h: RING * U }] as const;
      const lines = Math.max(1, x.text.split('\n').length);
      return [x.id, { w: clamp(words(x.text) * CHAR + 3, STATE_MIN, STATE_MAX) * U, h: Math.max(STATE_H, lines * LINE + 2) * U }] as const;
    })
  );
  const layout = layoutLayered(
    nodes.map((x) => ({ id: x.id, w: size.get(x.id)!.w, h: size.get(x.id)!.h })),
    links.map((l) => ({ from: l.from, to: l.to })),
    { direction: r.direction, rankGap: RANK_GAP * U, nodeGap: (links.some((l) => l.self) ? NODE_GAP_LOOP : NODE_GAP) * U }
  );
  const origin = opts.origin ?? besideContent(session, STATE_MIN * U);
  const standing = new Map<string, Standing>();
  for (const x of nodes) {
    const c = { x: origin.x + layout.at.get(x.id)!.x, y: origin.y + layout.at.get(x.id)!.y };
    const z = size.get(x.id)!;
    standing.set(x.id, { id: x.id, rank: layout.rank.get(x.id)!, box: { minX: c.x - z.w / 2, maxX: c.x + z.w / 2, minY: c.y - z.h / 2, maxY: c.y + z.h / 2 } });
  }

  // The states, the initial dot and the final ring.
  const ids: Record<string, string> = {};
  const drawnMarks: string[] = [];
  const marksOf = new Map<string, string[]>();
  const placeholder: string[] = [];
  const step = INK_STEP * scale;
  for (const x of nodes) {
    const b = standing.get(x.id)!.box, c = { x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 }, z = size.get(x.id)!;
    if (x.symbol === 'initial') {
      const dot = session.addStroke(spiralIn(c.x, c.y, z.w / 2, SPIRAL_PITCH_PX * scale, step / 2), next(), pid, scale, { content: true });
      ids[x.id] = dot;
      marksOf.set(x.id, [dot]);
      drawnMarks.push(dot);
    } else if (x.symbol === 'final') {
      const ring = session.addStroke(strokeFor({ shape: 'circle', x: b.minX, y: b.minY, w: z.w, h: z.h })!, next(), pid, scale, { content: true });
      const spot = z.w * RING_SPOT;
      const inner = session.addStroke(spiralIn(c.x, c.y, spot / 2, SPIRAL_PITCH_PX * scale, step / 2), next(), pid, scale, { content: true });
      ids[x.id] = ring;
      marksOf.set(x.id, [ring, inner]);
      drawnMarks.push(ring, inner);
    } else {
      const box = session.addStroke(roundedBox(c.x, c.y, z.w, z.h, ROUND * z.h, step), next(), pid, scale, { content: true });
      ids[x.id] = box;
      marksOf.set(x.id, [box]);
      drawnMarks.push(box);
      const words = x.text.trim();
      if (words) session.label({ nodeId: box, text: words, participantId: pid, at: next() });
      if (words === UNREAD_WRITING) placeholder.push(x.id);
    }
  }

  // Where each transition leaves and arrives: the sides facing each other, around any state in the way.
  const straight = links.filter((l) => !l.self);
  const { routes, ends } = routeBoxes(standing, straight.map((l) => ({ index: l.index, a: l.from, b: l.to })), r.direction, 0.5 * U, scale);
  const st = () => session.getState();
  const spans = new Map<string, Span | null>();
  const spanOfNode = (id: string): Span | null => {
    if (!spans.has(id)) {
      const node = st().nodes.get(ids[id]);
      const port = node ? statePortsOf(node, st().nodes)?.ports[0] : undefined;
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
  /** Where an end is bound: a site the mark offers at the place wanted, else a place along the state's border, else nowhere. */
  const endAt = (id: string, want: Point, port: string): { end: DrawnEnd; bound: boolean } => {
    const nodeId = ids[id];
    const site = near(id, want, 0.3 * U);
    if (site) return { end: { nodeId, site: { kind: site.kind, index: site.index }, of: 'mark', port, point: site.point }, bound: true };
    const span = symbolOf.get(id) === 'state' ? spanOfNode(id) : null;
    if (span) {
      const share = shareAt(span, want);
      return { end: { nodeId, site: { kind: `along:${T.notation}`, index: alongIndex(0, share) }, of: 'notation', port, point: pointAtShare(span, share) }, bound: true };
    }
    return { end: { nodeId, site: { kind: '', index: 0 }, of: 'mark', port, point: want }, bound: false };
  };

  // The transitions, in the text's order.
  const drawn: DrawnStateLink[] = [];
  const crossing: string[] = [];
  const unbound: string[] = [];
  const outwardOf = (side: string) => (side === 'top' ? { x: 0, y: -1 } : side === 'right' ? { x: 1, y: 0 } : side === 'bottom' ? { x: 0, y: 1 } : { x: -1, y: 0 });
  for (const l of links) {
    const label = l.label?.trim();
    if (l.self) {
      // A loop out of the state's side — the right for a page that runs down, the top for one that runs across — and back, its barb where it arrives.
      const down = r.direction === 'TD' || r.direction === 'BT';
      const side = down ? 'right' : 'top';
      const b = standing.get(l.from)!.box;
      const n = outwardOf(side);
      const tangent = { x: -n.y, y: n.x };
      const mid = { x: side === 'right' ? b.maxX : (b.minX + b.maxX) / 2, y: side === 'top' ? b.minY : (b.minY + b.maxY) / 2 };
      const w = LOOP_W * U, h = LOOP_H * U, bb = BARB * U;
      const a = endAt(l.from, { x: mid.x - (tangent.x * w) / 2, y: mid.y - (tangent.y * w) / 2 }, side);
      const z = endAt(l.from, { x: mid.x + (tangent.x * w) / 2, y: mid.y + (tangent.y * w) / 2 }, side);
      const S = a.end.point, E = z.end.point;
      const out = (p: Point): Point => ({ x: p.x + n.x * h, y: p.y + n.y * h });
      const wing = (s: number): Point => ({ x: E.x + n.x * bb * Math.cos(Math.PI / 6) + tangent.x * s * bb * Math.sin(Math.PI / 6), y: E.y + n.y * bb * Math.cos(Math.PI / 6) + tangent.y * s * bb * Math.sin(Math.PI / 6) });
      const id = session.addStroke(inkAlong([S, out(S), out(E), E, wing(-1), E, wing(1)], step), next(), pid, scale, { content: true });
      for (const [end, e] of [['start', a], ['end', z]] as const) if (e.bound) session.bind({ strokeId: id, nodeId: e.end.nodeId, site: e.end.site, end, at: next(), participantId: pid });
      if (!a.bound || !z.bound) unbound.push(`${l.from} --> ${l.to}`);
      if (label) session.label({ nodeId: id, text: label, participantId: pid, at: next() });
      if (label === UNREAD_WRITING) placeholder.push(`${l.from} --> ${l.to}`);
      drawnMarks.push(id);
      drawn.push({ index: l.index, from: l.from, to: l.to, id, ids: [id], written: '-->', route: 'loop', ...(label ? { label } : {}), start: a.end, end: z.end, bound: [a.bound, z.bound] });
      continue;
    }
    const route = routes.get(l.index)!;
    const e0 = ends.get(`${l.index}:0`)!, e1 = ends.get(`${l.index}:1`)!;
    const a = endAt(l.from, e0.point, e0.side), z = endAt(l.to, e1.point, e1.side);
    const P = a.end.point, Q = z.end.point;
    const bow = route.bow;
    const chord = Math.hypot(Q.x - P.x, Q.y - P.y) / scale;
    const k = Math.max(1, chord / ARROW_PROPORTION_PX);
    const small = (p: Point) => scaled(p, 1 / (scale * k));
    const arc = bow ? arcThrough(hand(P), hand(Q), bow.sweep, bow.side, Math.max(16, Math.min(300, Math.round((chord * ((bow.sweep * Math.PI) / 180)) / (2 * Math.sin((bow.sweep * Math.PI) / 360)) / INK_STEP)))) : null;
    const shaft = arc ? arc.map((p) => scaled(p, scale)) : strokeFor({ shape: 'arrow', from: small(P), to: small(Q) })!.map((p) => scaled(p, k * scale));
    const id = session.addStroke(shaft, next(), pid, scale, { content: true });
    const own = [id];
    for (const [end, e] of [['start', a], ['end', z]] as const) if (e.bound) session.bind({ strokeId: id, nodeId: e.end.nodeId, site: e.end.site, end, at: next(), participantId: pid });
    if (!a.bound || !z.bound) unbound.push(`${l.from} --> ${l.to}`);
    // An arc's head is a closed triangle drawn apart (D3's): a stroke bent round with a barb reads as neither.
    if (arc) {
      const back = scaled(arc[Math.max(0, arc.length - 4)], scale);
      own.push(session.addStroke(triangleAt(Q, sub(Q, back), HEAD * U, step / 1.5), next(), pid, scale, { content: true }));
    }
    if (label) session.label({ nodeId: id, text: label, participantId: pid, at: next() });
    if (label === UNREAD_WRITING) placeholder.push(`${l.from} --> ${l.to}`);
    if (route.crossing) crossing.push(`${l.from} --> ${l.to}`);
    drawnMarks.push(...own);
    drawn.push({ index: l.index, from: l.from, to: l.to, id, ids: own, written: '-->', route: arc ? 'arc' : 'straight', ...(label ? { label } : {}), start: a.end, end: z.end, bound: [a.bound, z.bound] });
  }

  // Read back, as the board will read it: every state one, every transition between the states written.
  const back = readState(session.getState(), drawnMarks);
  const symbolFor = (id: string) => back?.symbols.find((s) => s.ids.includes(ids[id]));
  const lost = nodes.filter((x) => symbolFor(x.id)?.symbol !== x.symbol).map((x) => x.id);
  if (lost.length) notes.push(`read back, ${someWords(lost)} ${lost.length === 1 ? 'does' : 'do'} not read as ${lost.length === 1 ? 'the' : ''} ${lost.length === 1 ? 'symbol' : 'symbols'} written`);
  const misread = drawn.filter((d) => {
    const got = back?.connectors.find((c) => c.id === d.id);
    return !got || got.from !== symbolFor(d.from)?.id || got.to !== symbolFor(d.to)?.id || got.self !== (d.route === 'loop');
  });
  if (misread.length) notes.push(`read back, ${misread.length === 1 ? 'a transition does' : `${countWord(misread.length)} transitions do`} not read as written: ${someWords(misread.map((d) => `${d.from} --> ${d.to}`))}`);
  if (unbound.length) notes.push(`${unbound.length === 1 ? 'a transition end has' : 'transition ends have'} no site to be tied to and ${unbound.length === 1 ? 'is' : 'are'} drawn free: ${someWords(unbound)}`);
  if (crossing.length) notes.push(`no way around the states between: ${someWords(crossing)} ${crossing.length === 1 ? 'crosses' : 'cross'} a state on the way`);
  for (const bk of layout.back) {
    if (!bk.cycle) continue;
    const l = links[bk.index];
    notes.push(`the transition ${l.from} --> ${l.to} closes a cycle (${bk.cycle.join(' → ')}), and runs back against the direction`);
  }
  if (!layout.kept && links.some((l) => !l.self)) notes.push(`every transition runs within a rank, so read back the drawing will say ${r.direction === 'LR' ? 'down (the default)' : 'across (LR)'}`);
  if (nodes.some((x) => x.symbol === 'final')) notes.push('the final [*] is drawn as a ring round a scribbled dot, read back as a final state');
  if (placeholder.length) notes.push(`“${UNREAD_WRITING}” is what D2 writes for writing nobody has read: it is put on the ink as the words, since the words are not known — ${someWords(placeholder)}`);

  const lb = layout.bounds;
  return {
    notation: r.notation,
    direction: r.direction,
    ids,
    links: drawn.map((d) => ({ ...d, drawn: '-->' })) as unknown as DrawnMermaid['links'],
    notes,
    refused,
    bounds: { minX: origin.x + lb.minX, minY: origin.y + lb.minY, maxX: origin.x + lb.maxX, maxY: origin.y + lb.maxY },
    lastAt: t - 1,
  };
}

/** The state diagram's reader: `stateDiagram` and `stateDiagram-v2`. */
export const STATE_READER: MermaidReader = {
  notation: T.notation,
  read: readStateText,
  draw: drawStateRead,
};

for (const keyword of ['stateDiagram', 'stateDiagram-v2']) registerMermaidReader(keyword, STATE_READER);

