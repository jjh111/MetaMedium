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
// numbering; short (`DECIDE_STATE_MAX`, whole lines cut from the end, said), because a decision model reads a
// small context and a board's whole description (`describeSession`) runs to thousands of characters for forty
// marks; derived each time it is asked, never written anywhere — it goes to the transport and is gone.
// Pure: reads the state, changes nothing, asks no model.

import type { SessionState } from '../session/session';
import { boundsOf, getRep, wordOf, packDefinitionOf, type MMNode } from '../session/nodes';
import { interpretationsOf, isShapeRungReading } from '../session/interpretations';
import { wordsOfMarks } from '../semantic/words';
import { notationsOf, describeNotation } from '../notations/notation';
import type { Bounds } from '../types';
import type { DecideState } from './decide';

/** The most characters a decision's state runs to. */
export const DECIDE_STATE_MAX = 4000;
/** How far round the marks the words "beside them" are looked for, as a share of the marks' own size. */
export const BESIDE_SHARE = 0.5;
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

/** The words on the content plane beside some marks (within `BESIDE_SHARE` of their own size), not on them. */
export function wordsBeside(state: SessionState, ids: readonly string[]): string {
  const own = new Set(ids);
  const box = unionOf(ids.map((id) => state.nodes.get(id)).filter((n): n is MMNode => !!n).map((n) => boundsOf(n)).filter((b): b is Bounds => !!b));
  if (!box) return '';
  const m = BESIDE_SHARE * Math.max(box.maxX - box.minX, box.maxY - box.minY, 1);
  const near: string[] = [];
  for (const id of state.contentIds) {
    if (own.has(id)) continue;
    const node = state.nodes.get(id);
    const b = node && boundsOf(node);
    if (!b || b.maxX < box.minX - m || b.minX > box.maxX + m || b.maxY < box.minY - m || b.minY > box.maxY + m) continue;
    near.push(id);
  }
  return near.length ? wordsOfMarks(state, near) : '';
}

const quoted = (words: string) => (words ? `“${words}”` : 'nothing');

/** The marks a definition was drawn as on this board: the artifact's parts. */
function membersOf(node: MMNode): string[] {
  return node.edges.filter((e) => e.rel === 'has-part').map((e) => e.to);
}

/**
 * Where a definition came from, in a clause: this board's — which it was named, what it was drawn as, how often it
 * was taught since, the words written on and beside its drawing — or a pack's, and how many drawings it ships. What
 * makes two definitions named from one drawing differ, when their signatures say the same thing.
 */
export function definitionWords(state: SessionState, c: StateCandidate): string {
  const node = c.artifactId ? state.nodes.get(c.artifactId) : undefined;
  const examples = node ? ((getRep(node, 'examples')?.data as { accepted?: unknown[] } | undefined)?.accepted?.length ?? 0) : 0;
  const pack = node ? packDefinitionOf(node) : undefined;
  if (pack || c.pack) {
    const from = pack?.pack ?? c.pack ?? 'a library pack';
    const packNode = state.nodes.get(`library:${from}`);
    const packName = packNode ? wordOf(packNode) : undefined;
    return `a definition from the ${packName ? `${packName} pack` : `library pack ${from}`}` +
      (pack?.describes ? `: ${pack.describes}` : '') + `; drawn ${count(examples + 1)} ${examples ? 'ways' : 'way'}`;
  }
  if (!node) return 'a definition this board no longer holds';
  const defs = state.artifacts.filter((id) => { const n = state.nodes.get(id); return !!n && !!getRep(n, 'signature'); });
  const at = defs.indexOf(node.id);
  const members = membersOf(node).filter((id) => state.nodes.has(id));
  const on = members.length ? wordsOfMarks(state, members) : '';
  const beside = members.length ? wordsBeside(state, members.concat(node.id)) : '';
  return `this board's definition, the ${at >= 0 ? `${ordinal(at)} of ${count(defs.length)}` : 'one'} named here` +
    (members.length ? `, drawn as ${count(members.length)} ${members.length === 1 ? 'mark' : 'marks'} (${shapesCounted(state, members)})` : '') +
    `; ${examples ? `taught ${count(examples)} more ${examples === 1 ? 'example' : 'examples'} since` : 'taught no other example since'}` +
    `; written on its drawing: ${quoted(on)}; written beside it: ${quoted(beside)}`;
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
  const on = wordsOfMarks(state, marks);
  lines.push(`Written on them: ${quoted(on)}.`);
  const beside = wordsBeside(state, marks);
  lines.push(`Written beside them: ${quoted(beside)}.`);
  const defs = (options.candidates ?? []).filter((c) => c.artifactId || c.pack);
  if (defs.length) {
    lines.push('Where each candidate came from:');
    for (const c of defs) lines.push(`- ${c.name}: ${definitionWords(state, c)}.`);
  }
  return { text: capped(lines, DECIDE_STATE_MAX) };
}
