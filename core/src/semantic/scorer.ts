// What Find and *notes like this* do with the semantic seat (PLAN-IPAD-NOTES I9).
//
//   semanticScorer — the `semantic` function `searchBoards` takes: a score from 0 to 1 for an entry against the
//     query, from vectors held by text. Find's own function is synchronous (it is called for every entry of every
//     board at every key) and a transport is not, so the scorer is made by an async step that embeds what it
//     lacks — the query and every entry text, each ONCE, whatever the cache holds — and then answers from memory.
//   notesLike — given the boards and one thing (its words), the others ranked by how near they are in meaning,
//     each with its number and the reason said. The thing itself is left out; a copy of it on another board is
//     not (the same words are the nearest of all).
//
// Everything here is derived and held in memory, never in a log: a cache is lost harmlessly and built again.
import { tokenize } from '../search/tokens';
import { excerptOf, SEMANTIC_FLOOR, type SearchBoard, type SearchGroup, type SearchHit, type SearchOptions } from '../search/query';
import type { SearchEntry } from '../search/extract';
import { cosine, createEmbedCache, embedAll, type EmbedCache, type EmbedOptions, type EmbedTransport } from './embed';

/** The function Find takes at `options.semantic`. */
export type SemanticFn = NonNullable<SearchOptions['semantic']>;

const clamp01 = (x: number) => (x < 0 ? 0 : x > 1 ? 1 : x);

/**
 * The score function for one query over these entries. Embeds the query and the entries' texts it lacks (each text
 * once; the cache is the transport's own), then answers from memory: the cosine of the query and the entry's
 * words, clamped to 0..1 — and 0 for anything it was not given vectors for. A query with no word in it asks nothing.
 */
export async function semanticScorer(
  transport: EmbedTransport,
  query: string,
  entries: readonly SearchEntry[],
  opts: EmbedOptions & { cache?: EmbedCache } = {},
): Promise<SemanticFn> {
  const cache = opts.cache ?? createEmbedCache();
  if (!tokenize(query).length) return () => 0;
  const q = query.trim();
  await embedAll(transport, [q, ...entries.map((e) => e.text)], cache, opts);
  return (asked, entry) => {
    const qv = cache.get(transport.name, asked.trim());
    const ev = cache.get(transport.name, entry.text);
    return qv && ev ? clamp01(cosine(qv, ev)) : 0;
  };
}

/** A hit that says why it is a note like another: `reason` is its number and what it shares. */
export type NoteLike = SearchHit & { reason: string };

export interface NotesSource {
  /** The words of the thing: what a held mark or region says (`wordsOfMarks`). */
  text: string;
  /** Where it is, so it is left out of its own list. */
  board?: string;
  ids?: readonly string[];
}
export interface NotesOptions extends EmbedOptions {
  cache?: EmbedCache;
  /** Most notes returned (the nearest). */
  limit?: number;
  /** Nearer than this, or not a note like it: Find's own floor unless the caller says. */
  floor?: number;
}

/** Words said as shared that mean nothing: a reason that said *shares “the”* would be noise. */
const FUNCTION_WORDS = new Set(['a', 'an', 'and', 'the', 'of', 'for', 'to', 'in', 'on', 'at', 'is', 'it', 'or', 'by', 'with', 'as', 'be']);

/** The words two sayings share, in the order the second has them, function words left out. */
function sharedWords(a: string, b: string): string[] {
  const mine = new Set(tokenize(a).map((t) => t.text));
  const out: string[] = [];
  for (const t of tokenize(b)) if (mine.has(t.text) && !FUNCTION_WORDS.has(t.text) && !out.includes(t.text)) out.push(t.text);
  return out;
}

/** Why a note is near: the number, what measured it and whether a word is shared — arithmetic on what the seat said, no prose of its own. */
function reasonOf(score: number, transport: string, source: string, text: string): string {
  const band = score >= 0.85 ? 'says nearly the same thing' : score >= 0.7 ? 'is about the same thing' : 'is near in meaning';
  const shared = sharedWords(source, text).slice(0, 3);
  return `${band} — ${score.toFixed(2)} by ${transport}; ` + (shared.length ? 'shares ' + shared.map((w) => `“${w}”`).join(', ') : 'no word in common');
}

/**
 * The notes nearest in meaning to one thing, across boards, best first. The thing's own entries (its ids on its
 * board) are left out; anything under the floor is not a note like it; ties go to the board used most recently.
 * Nothing to compare — no word in the thing, no boards — is none, and asks nothing.
 */
export async function notesLike(
  transport: EmbedTransport,
  boards: readonly SearchBoard[],
  source: NotesSource,
  opts: NotesOptions = {},
): Promise<NoteLike[]> {
  if (!tokenize(source.text).length) return [];
  const own = new Set(source.ids ?? []);
  const candidates: { board: SearchBoard; entry: SearchEntry; order: number }[] = [];
  let order = 0;
  for (const b of boards) {
    for (const e of b.entries) {
      if (!e.text || !tokenize(e.text).length) continue;
      if (source.board !== undefined && b.id === source.board && e.id && own.has(e.id)) continue;
      candidates.push({ board: b, entry: e, order: order++ });
    }
  }
  if (!candidates.length) return [];
  const cache = opts.cache ?? createEmbedCache();
  const said = source.text.trim();
  await embedAll(transport, [said, ...candidates.map((c) => c.entry.text)], cache, opts);
  const sv = cache.get(transport.name, said);
  if (!sv) return [];
  const floor = opts.floor ?? SEMANTIC_FLOOR;
  const found = candidates
    .map((c) => ({ c, score: clamp01(cosine(sv, cache.get(transport.name, c.entry.text) ?? new Float32Array(0))) }))
    .filter((x) => x.score >= floor)
    .sort((x, y) => y.score - x.score || y.c.board.recency - x.c.board.recency || x.c.order - y.c.order)
    .slice(0, Math.max(1, opts.limit ?? 20));
  return found.map(({ c, score }) => {
    const ex = excerptOf(c.entry.text, []);
    return {
      board: c.board.id, boardName: c.board.name, id: c.entry.id, kind: c.entry.kind, what: c.entry.what,
      text: ex.text, spans: [], ...(c.entry.box ? { box: c.entry.box } : {}),
      score, meaning: score, reason: reasonOf(score, transport.name, said, c.entry.text),
    };
  });
}

/** Notes grouped by board, the way Find's pane shows what it found: a board by its best note, then by use. */
export function groupLikes(likes: readonly NoteLike[], boards: readonly SearchBoard[]): SearchGroup[] {
  const by = new Map<string, SearchGroup>();
  const info = new Map(boards.map((b) => [b.id, b]));
  for (const l of likes) {
    let g = by.get(l.board);
    if (!g) {
      const b = info.get(l.board);
      g = { board: l.board, name: b ? b.name : l.boardName, recency: b ? b.recency : 0, score: l.score, hits: [], more: 0 };
      by.set(l.board, g);
    }
    g.hits.push(l);
    if (l.score > g.score) g.score = l.score;
  }
  const groups = [...by.values()];
  for (const g of groups) g.hits.sort((x, y) => y.score - x.score);
  groups.sort((x, y) => y.score - x.score || y.recency - x.recency || (x.board < y.board ? -1 : x.board > y.board ? 1 : 0));
  return groups;
}
