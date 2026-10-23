// What a decision seat is shown of the board (the audit's S1): the STATE beside the questions, in words.
//
// A decider asked *which of these is the group of marks?* between two definitions named from the same drawing
// used to be shown the questions alone — and each candidate's words were the signature's reasoning, the same
// sentence for both (*same shapes (2×circle + line); same links (4 kinds)*), so it could choose only by the
// names. A seat must be shown what it decides about: here, the marks asked about (what each is, counted), what
// they play and read as, the words written on them and beside them, and where each candidate came from — this
// board's definition or a pack's, which it was named, what it was drawn as, how often it was taught since, and
// the words written beside its drawing.
//
// The rules: WORDS, never a node id — the seat sees no id it could get wrong, and the log's ids are a hand's
// numbering (and carry the hand's own name): so only what a PERSON WROTE is said as written (`WRITTEN`: a label,
// read writing, typed text, a figure's words, a region's name) — never a Mermaid text, whose ids are the marks'
// own made safe (`stroke_john_a1b2_1`), nor a page a model wrote, a picture's file name, or a thing's name, which
// nobody wrote and which would be said as if they had; and whatever is said, every id the board holds, as it is
// and as Mermaid writes it, is taken out last (`withoutIds`). What stands beside the marks is never the marks
// themselves nor the candidates' own drawings. Short (`DECIDE_STATE_MAX`, whole lines cut from the end, said; each
// run of words an excerpt, `WORDS_SAID`), because a decision model reads a small context and a board's whole
// description (`describeSession`) runs to thousands of characters for forty marks — and a candidate's words are an
// option the relay takes at most 1,000 characters of (`CANDIDATE_WORDS_SAID` keeps each well under). Derived each
// time it is asked, never written anywhere — it goes to the transport and is gone.
// Pure: reads the state, changes nothing, asks no model.

import type { SessionState } from '../session/session';
import { boundsOf, getRep, wordOf, packDefinitionOf, type MMNode } from '../session/nodes';
import { interpretationsOf, isShapeRungReading } from '../session/interpretations';
import { regionMembers } from '../session/board-regions';
import { searchEntriesOf, type SearchKind } from '../search/extract';
import { notationsOf, describeNotation } from '../notations/notation';
import type { Bounds } from '../types';
import type { DecideState } from './decide';

/** The most characters a decision's state runs to. */
export const DECIDE_STATE_MAX = 4000;
/** How far round the marks the words "beside them" are looked for, as a share of the marks' own size. */
export const BESIDE_SHARE = 0.5;
/** The most characters of one run of words a state says — the words on the marks, the words beside them. */
export const WORDS_SAID = 400;
/** The most characters of one run of words in a candidate's words (an option, which the relay takes 1,000 characters of). */
export const CANDIDATE_WORDS_SAID = 160;
/** What a person wrote, of what Find reads off a board: said as written. A thing's name, a picture's file name, a page a model wrote and a Mermaid text (its ids the marks' own) are not. */
export const WRITTEN: ReadonlySet<SearchKind> = new Set<SearchKind>(['label', 'transcript', 'text', 'figure', 'region']);
/** The most notations named in a state: the likeliest. */
const NOTATIONS_SAID = 3;

/** A candidate a decision is asked about, as the board holds it: its name, and the definition it is, if one. */
export interface StateCandidate {
  name: string;
  /** The definition's node: an artifact on this board, or a library pack's definition. */
  artifactId?: string;
  /** The pack (`basics@1`) a pack's definition comes from. */
  pack?: string;
}

export interface DecisionStateOptions {
  /** The candidates the seat chooses between, when they are definitions: where each came from is said. */
  candidates?: readonly StateCandidate[];
  /** What the engine reads of the marks (`session.read`): what each plays and the drawing's genre, said when given. */
  reading?: { roles: { role: string }[]; genre: { genre: string; reasoning?: string } };
  /** Lines of the asker's own to lead with — a brief typed, say. Words only. */
  lead?: readonly string[];
}

const PLURAL: Record<string, [string, string]> = {
  rectangle: ['box', 'boxes'],
  circle: ['circle', 'circles'],
  triangle: ['triangle', 'triangles'],
  line: ['line', 'lines'],
  arc: ['arc', 'arcs'],
  arrow: ['arrow', 'arrows'],
  dot: ['dot', 'dots'],
  text: ['piece of writing', 'pieces of writing'],
};
const NUMBER = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
const count = (n: number) => (n < NUMBER.length ? NUMBER[n] : String(n));
const ORDINAL = ['first', 'second', 'third', 'fourth', 'fifth', 'sixth', 'seventh', 'eighth', 'ninth', 'tenth'];
const ordinal = (i: number) => ORDINAL[i] ?? `number ${i + 1}`;

/** What one mark is, in a word: a thing's name, else the shape rung's top reading, else unplaced ink. */
function whatIs(state: SessionState, node: MMNode): string {
  if (state.artifacts.includes(node.id)) return 'thing';
  const rung = interpretationsOf(node, state.nodes).find(isShapeRungReading);
  return rung ? rung.label : 'ink';
}

/** Marks counted by what they are: "3 circles, 2 lines". */
export function shapesCounted(state: SessionState, ids: readonly string[]): string {
  const tally = new Map<string, number>();
  for (const id of ids) {
    const node = state.nodes.get(id);
    if (!node) continue;
    const w = whatIs(state, node);
    tally.set(w, (tally.get(w) ?? 0) + 1);
  }
  const said = [...tally].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).map(([w, n]) => {
    if (w === 'thing') return `${count(n)} ${n === 1 ? 'thing made' : 'things made'}`;
    if (w === 'ink') return `${count(n)} ${n === 1 ? 'mark the shapes do not place' : 'marks the shapes do not place'}`;
    const [one, many] = PLURAL[w] ?? [w, w + 's'];
    return `${count(n)} ${n === 1 ? one : many}`;
  });
  return said.join(', ') || 'nothing';
}

function unionOf(boxes: Bounds[]): Bounds | null {
  if (!boxes.length) return null;
  return boxes.reduce((u, b) => ({ minX: Math.min(u.minX, b.minX), minY: Math.min(u.minY, b.minY), maxX: Math.max(u.maxX, b.maxX), maxY: Math.max(u.maxY, b.maxY) }));
}

/** A run of words cut to `max` characters at a space, the cut said with an ellipsis. */
function excerpt(text: string, max: number): string {
  if (text.length <= max) return text;
  const cut = text.lastIndexOf(' ', max - 1);
  return text.slice(0, cut > max / 2 ? cut : max - 1).trimEnd() + '…';
}

/**
 * Every id the board holds taken out of some words — as it is (`stroke:john~a1b2:1`) and as Mermaid writes it
 * (`stroke_john_a1b2_1`) — the last guard: what is said is only ever what a person wrote, and none of it should
 * be an id, but a seat must never be shown one whatever a board holds.
 */
export function withoutIds(text: string, state: SessionState): string {
  let out = text;
  for (const id of state.nodes.keys()) {
    if (id.length < 4 || !/[^A-Za-z0-9]/.test(id)) continue;
    for (const form of [id, id.replace(/[^A-Za-z0-9]+/g, '_')]) if (out.includes(form)) out = out.split(form).join('…');
  }
  return out;
}

/**
 * What a person wrote on some marks, as one run of words: their labels, what was read from their writing, the words
 * of a text or a figure made of them, a region's name and then what it holds — `WRITTEN`'s kinds of what Find reads,
 * each once, in the order held, at most `max` characters.
 */
export function writtenOn(state: SessionState, ids: readonly string[], max: number = WORDS_SAID): string {
  const regions = new Set(state.regions ?? []);
  const order: string[] = [];
  const take = (id: string) => { if (!order.includes(id)) order.push(id); };
  for (const id of ids) {
    take(id);
    if (regions.has(id)) for (const m of regionMembers(state, id)) take(m);
  }
  const said: string[] = [];
  for (const id of order) {
    for (const e of searchEntriesOf(state, new Set([id]))) {
      if (!WRITTEN.has(e.kind)) continue;
      const t = e.text.replace(/\s+/g, ' ').trim();
      if (t && !said.includes(t)) said.push(t);
    }
  }
  return excerpt(said.join(' '), max);
}

/**
 * What a person wrote on the content plane beside some marks (within `BESIDE_SHARE` of their own size), not on
 * them: never the marks themselves, nor anything in `exclude` (the other side of a choice — the marks held, the
 * candidates' own drawings).
 */
export function wordsBeside(state: SessionState, ids: readonly string[], options: { exclude?: Iterable<string>; max?: number } = {}): string {
  const own = new Set([...ids, ...(options.exclude ?? [])]);
  const box = unionOf(ids.map((id) => state.nodes.get(id)).filter((n): n is MMNode => !!n).map((n) => boundsOf(n)).filter((b): b is Bounds => !!b));
  if (!box) return '';
  const m = BESIDE_SHARE * Math.max(box.maxX - box.minX, box.maxY - box.minY, 1);
  const near: string[] = [];
  for (const id of state.contentIds) {
    if (own.has(id)) continue;
    const node = state.nodes.get(id);
    const b = node && boundsOf(node);
    if (!b || b.maxX < box.minX - m || b.minX > box.maxX + m || b.maxY < box.minY - m || b.minY > box.maxY + m) continue;
    // A thing made of marks that are excluded is the excluded thing.
    if (membersOf(node!).some((x) => own.has(x))) continue;
    near.push(id);
  }
  return near.length ? writtenOn(state, near, options.max ?? WORDS_SAID) : '';
}

const quoted = (words: string) => (words ? `“${words}”` : 'nothing');

/** The marks a definition was drawn as on this board: the artifact's parts. */
function membersOf(node: MMNode): string[] {
  return node.edges.filter((e) => e.rel === 'has-part').map((e) => e.to);
}

/**
 * Where a definition came from, in a clause: this board's — which it was named, what it was drawn as, how often it
 * was taught since, the words written on and beside its drawing — or a pack's, and how many drawings it ships. What
 * makes two definitions named from one drawing differ, when their signatures say the same thing. `exclude`: what is
 * not "beside" it (the marks held, the other candidates' drawings); each run of words at most `CANDIDATE_WORDS_SAID`.
 */
export function definitionWords(state: SessionState, c: StateCandidate, options: { exclude?: Iterable<string> } = {}): string {
  const node = c.artifactId ? state.nodes.get(c.artifactId) : undefined;
  const examples = node ? ((getRep(node, 'examples')?.data as { accepted?: unknown[] } | undefined)?.accepted?.length ?? 0) : 0;
  const pack = node ? packDefinitionOf(node) : undefined;
  if (pack || c.pack) {
    const from = pack?.pack ?? c.pack ?? 'a library pack';
    const packNode = state.nodes.get(`library:${from}`);
    const packName = packNode ? wordOf(packNode) : undefined;
    return withoutIds(`a definition from the ${packName ? `${packName} pack` : `library pack ${from}`}` +
      (pack?.describes ? `: ${excerpt(pack.describes, CANDIDATE_WORDS_SAID)}` : '') + `; drawn ${count(examples + 1)} ${examples ? 'ways' : 'way'}`, state);
  }
  if (!node) return 'a definition this board no longer holds';
  const defs = state.artifacts.filter((id) => { const n = state.nodes.get(id); return !!n && !!getRep(n, 'signature'); });
  const at = defs.indexOf(node.id);
  const members = membersOf(node).filter((id) => state.nodes.has(id));
  const on = members.length ? writtenOn(state, members, CANDIDATE_WORDS_SAID) : '';
  const beside = members.length ? wordsBeside(state, members.concat(node.id), { exclude: options.exclude, max: CANDIDATE_WORDS_SAID }) : '';
  return withoutIds(`this board's definition, the ${at >= 0 ? `${ordinal(at)} of ${count(defs.length)}` : 'one'} named here` +
    (members.length ? `, drawn as ${count(members.length)} ${members.length === 1 ? 'mark' : 'marks'} (${shapesCounted(state, members)})` : '') +
    `; ${examples ? `taught ${count(examples)} more ${examples === 1 ? 'example' : 'examples'} since` : 'taught no other example since'}` +
    `; written on its drawing: ${quoted(on)}; written beside it: ${quoted(beside)}`, state);
}

/** What a candidate stands on: its definition's node and the marks it was drawn as. */
function groundOf(state: SessionState, c: StateCandidate): string[] {
  const node = c.artifactId ? state.nodes.get(c.artifactId) : undefined;
  return node ? [node.id, ...membersOf(node)] : [];
}

/**
 * Each candidate's `definitionWords` for a choice about the marks `held`: what stands beside one is never the marks
 * asked about nor another candidate's drawing — or the seat is told a neighbour's words were written beside it.
 */
export function candidateWords(state: SessionState, candidates: readonly StateCandidate[], held: readonly string[]): string[] {
  const grounds = candidates.map((c) => groundOf(state, c));
  return candidates.map((c, i) => definitionWords(state, c, { exclude: [...held, ...grounds.filter((_, j) => j !== i).flat()] }));
}

/** Lines cut from the end until the text fits, the cut said. */
function capped(lines: string[], max: number): string {
  let text = lines.join('\n');
  if (text.length <= max) return text;
  const tail = '\n(more on the board, left out)';
  const kept = lines.slice();
  while (kept.length > 1 && kept.join('\n').length + tail.length > max) kept.pop();
  text = kept.join('\n') + tail;
  return text.length <= max ? text : text.slice(0, max - 1) + '…';
}

/**
 * The state a decision seat is shown about some marks, in words: what they are, play and read as, the words on and
 * beside them, and the candidates' provenance — never a node id, at most `DECIDE_STATE_MAX` characters.
 */
export function decisionStateOf(state: SessionState, ids: readonly string[], options: DecisionStateOptions = {}): DecideState {
  const marks = ids.filter((id) => state.nodes.has(id));
  const lines: string[] = [];
  for (const l of options.lead ?? []) if (l) lines.push(l);
  lines.push(`The marks asked about: ${count(marks.length)} ${marks.length === 1 ? 'mark' : 'marks'} — ${shapesCounted(state, marks)}.`);
  if (options.reading) {
    const roles = new Map<string, number>();
    for (const r of options.reading.roles) roles.set(r.role, (roles.get(r.role) ?? 0) + 1);
    const played = [...roles].filter(([r]) => r !== 'unclassified').map(([r, n]) => `${count(n)} ${n === 1 ? r : r + 's'}`);
    if (played.length) lines.push(`They play: ${played.join(', ')}; the drawing reads as a ${options.reading.genre.genre}.`);
  }
  const notations = marks.length >= 2 && !marks.some((id) => state.artifacts.includes(id)) ? notationsOf(state, marks).slice(0, NOTATIONS_SAID) : [];
  if (notations.length) lines.push(`As diagrams they read as: ${notations.map(describeNotation).join('; ')}.`);
  const defs = (options.candidates ?? []).filter((c) => c.artifactId || c.pack);
  const grounds = defs.flatMap((c) => groundOf(state, c));
  const on = writtenOn(state, marks);
  lines.push(`Written on them: ${quoted(on)}.`);
  const beside = wordsBeside(state, marks, { exclude: grounds });
  lines.push(`Written beside them: ${quoted(beside)}.`);
  if (defs.length) {
    lines.push('Where each candidate came from:');
    candidateWords(state, defs, marks).forEach((w, i) => lines.push(`- ${defs[i].name}: ${w}.`));
  }
  return { text: capped(withoutIds(lines.join('\n'), state).split('\n'), DECIDE_STATE_MAX) };
}
