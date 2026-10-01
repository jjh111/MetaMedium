// A query across boards (PLAN-IPAD-NOTES I6): the words typed against what every board says, lexical first.
// Pure: boards come in with what they say (their entries, the index the surface keeps) and groups go out, one a
// board, each hit with the words in context. Nothing is read from a clock or a store, so it runs as well in Node.
//
// RANKING. Every word typed must be among the entry's words (a short saying in any order); an exact word is
// worth more than one that only begins with what was typed, a word that follows the one before gets a little
// more, what a person wrote on a mark (a label, a name) weighs a little above prose, and a short saying beats a
// long one that has the word somewhere in it — never so far that a prefix in a short label outranks the exact
// word in a long text. Ties go to the board used most recently. NOT THE LAST WORD ONLY: while a person types
// `pricing no`, *pricing* and *no* may each be a prefix, which is what typing is.
//
// THE SEMANTIC SEAT (I9) joins at `options.semantic`: a number from 0 to 1 for an entry and the query, added to
// the lexical score, and what no word matched is let in when it is at least SEMANTIC_FLOOR. Nothing else changes.
import type { Bounds } from '../types';
import { tokenize, type Token } from './tokens';
import type { SearchEntry, SearchKind } from './extract';

/** A board as the query sees it: what it is called, when it was last used, and what it says. */
export interface SearchBoard { id: string; name: string; recency: number; entries: readonly SearchEntry[] }

export const EXACT = 3;
export const PREFIX = 1.5;
/** A semantic score below this lets nothing in on its own. */
export const SEMANTIC_FLOOR = 0.5;
const SEMANTIC_WEIGHT = 3;
const FOLLOWS = 0.3;
const KIND_WEIGHT: Record<SearchKind, number> = { label: 1.15, name: 1.1, board: 1.1, region: 1.1, picture: 1.0, text: 1.0, figure: 1.0, mermaid: 1.0, page: 0.95, transcript: 0.95 };
export const EXCERPT_CHARS = 80;

export interface SearchOptions {
  /** Most hits a board shows (the rest are counted in `more`). */
  hitsPerBoard?: number;
  /** Most boards. */
  boards?: number;
  /** A meaning seat's score for an entry against the query (0..1), or nothing. */
  semantic?: (query: string, entry: SearchEntry, board: SearchBoard) => number;
}

export interface SearchHit {
  board: string;
  boardName: string;
  /** The mark or artifact to open the board at; null for the board's own name. */
  id: string | null;
  kind: SearchKind;
  what: string;
  /** The words, around what matched when they are long. */
  text: string;
  /** Where the typed words matched in `text`: [start, end) pairs. */
  spans: [number, number][];
  box?: Bounds;
  score: number;
}
export interface SearchGroup { board: string; name: string; recency: number; score: number; hits: SearchHit[]; more: number }

interface Lexical { score: number; spans: [number, number][] }

/** How the typed words match an entry's words, or null when one of them is not there. */
function lexical(q: Token[], words: Token[]): Lexical | null {
  if (!q.length || !words.length) return null;
  let total = 0, follows = true, last = -1;
  const spans: [number, number][] = [];
  for (const t of q) {
    let best = 0, at = -1, span: [number, number] | null = null;
    for (let i = 0; i < words.length; i++) {
      const w = words[i];
      let s = 0;
      if (w.text === t.text) s = EXACT;
      else if (w.text.startsWith(t.text)) s = PREFIX;
      if (s > best) { best = s; at = i; span = s === EXACT ? [w.start, w.end] : [w.start, Math.min(w.end, w.start + t.text.length)]; if (s === EXACT) break; }
    }
    if (!best || !span) return null;
    total += best;
    if (last >= 0 && at !== last + 1) follows = false;
    last = at;
    spans.push(span);
  }
  let score = total / q.length;
  if (q.length > 1 && follows) score += FOLLOWS;
  // A short saying over a long one, by at most a third.
  score *= 1 - Math.min(0.3, 0.02 * (words.length - q.length));
  return { score, spans };
}

/** Some words around the first that matched, cut at a space, with `…` where it was cut; the spans moved with them. */
export function excerptOf(text: string, spans: readonly [number, number][], width = EXCERPT_CHARS): { text: string; spans: [number, number][] } {
  if (text.length <= width) return { text, spans: spans.map((s) => [s[0], s[1]] as [number, number]) };
  const first = spans.length ? spans[0][0] : 0;
  let start = Math.max(0, first - Math.floor(width / 3));
  if (start > 0) { const sp = text.indexOf(' ', start); if (sp >= 0 && sp < first) start = sp + 1; }
  let end = Math.min(text.length, start + width);
  if (end < text.length) { const sp = text.lastIndexOf(' ', end); if (sp > Math.max(first + 1, start + width / 2)) end = sp; }
  const head = start > 0 ? '…' : '', tail = end < text.length ? '…' : '';
  const shift = head.length - start;
  const kept = spans.filter((s) => s[0] >= start && s[1] <= end).map((s) => [s[0] + shift, s[1] + shift] as [number, number]);
  return { text: head + text.slice(start, end) + tail, spans: kept };
}

/**
 * The boards that say what was typed, best first, each with its best hits: grouped by board, a board by its best
 * hit and then by use. Nothing typed — or nothing that is a word — finds nothing.
 */
export function searchBoards(boards: readonly SearchBoard[], query: string, options: SearchOptions = {}): SearchGroup[] {
  const q = tokenize(query);
  if (!q.length) return [];
  const perBoard = Math.max(1, options.hitsPerBoard ?? 5);
  const groups: SearchGroup[] = [];
  for (const b of boards) {
    const hits: SearchHit[] = [];
    const add = (e: SearchEntry, lex: Lexical | null, sem: number) => {
      if (!lex && sem < SEMANTIC_FLOOR) return;
      const score = (lex ? lex.score : 0) * KIND_WEIGHT[e.kind] + sem * SEMANTIC_WEIGHT;
      const ex = excerptOf(e.text, lex ? lex.spans : []);
      hits.push({ board: b.id, boardName: b.name, id: e.id, kind: e.kind, what: e.what, text: ex.text, spans: ex.spans, ...(e.box ? { box: e.box } : {}), score });
    };
    const nameLex = lexical(q, tokenize(b.name));
    if (nameLex) add({ id: null, kind: 'board', text: b.name, what: 'board name' }, nameLex, 0);
    for (const e of b.entries) {
      const lex = lexical(q, tokenize(e.text));
      const sem = options.semantic ? Math.max(0, Math.min(1, options.semantic(query, e, b) || 0)) : 0;
      add(e, lex, sem);
    }
    if (!hits.length) continue;
    hits.sort((x, y) => y.score - x.score);
    groups.push({ board: b.id, name: b.name, recency: b.recency, score: hits[0].score, hits: hits.slice(0, perBoard), more: Math.max(0, hits.length - perBoard) });
  }
  groups.sort((x, y) => y.score - x.score || y.recency - x.recency || (x.board < y.board ? -1 : x.board > y.board ? 1 : 0));
  return groups.slice(0, options.boards ?? 40);
}

/** A hit as one line: *“Pricing” — label on a box · Board “Q4 notes”*. A board's own name is just the board. */
export function describeHit(h: Pick<SearchHit, 'kind' | 'text' | 'what' | 'boardName'>): string {
  if (h.kind === 'board') return 'Board “' + h.boardName + '”';
  return '“' + h.text + '” — ' + h.what + ' · Board “' + h.boardName + '”';
}
