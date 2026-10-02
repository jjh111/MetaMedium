// The semantic seat's seam (PLAN-IPAD-NOTES I9): an injectable transport that turns texts into vectors, what
// Find does with it (a score per entry, from a cache, embedding each text once) and *notes like this* (the
// others, ranked by how near they are in meaning, each with its number and its reason said). Pure, with a
// deterministic stand-in whose related words genuinely score higher — no model, no socket, no vendor.
import { describe, it, expect } from 'vitest';
import { createSession } from '../session/session';
import { rectStroke } from '../test/strokes';
import {
  searchBoards,
  searchEntriesOf,
  SEMANTIC_FLOOR,
  type SearchBoard,
  type SearchEntry,
} from '../search';
import {
  cosine,
  createStubEmbedTransport,
  createEmbedCache,
  semanticScorer,
  notesLike,
  groupLikes,
  wordsOfMarks,
  EmbedError,
  type EmbedTransport,
} from './index';

const GROUPS = [['pricing', 'price', 'cost', 'budget', 'fee'], ['meeting', 'standup', 'sync', 'call'], ['garden', 'hose', 'lawn']];
const stub = () => createStubEmbedTransport({ groups: GROUPS, dimension: 256 });

/** A transport that counts what it was asked, around another. */
function counting(inner: EmbedTransport): EmbedTransport & { asked: string[]; calls: number } {
  const t = {
    name: inner.name,
    dimension: inner.dimension,
    asked: [] as string[],
    calls: 0,
    async embed(texts: readonly string[], opts?: { signal?: AbortSignal }) { t.calls++; t.asked.push(...texts); return inner.embed(texts, opts); },
  };
  return t;
}

const entry = (id: string | null, text: string, kind: SearchEntry['kind'] = 'label', what = 'label on a box'): SearchEntry => ({ id, kind, text, what });
const board = (id: string, name: string, entries: SearchEntry[], recency = 1): SearchBoard => ({ id, name, recency, entries });

describe('cosine', () => {
  it('is 1 for the same direction, 0 for none shared, -1 for opposite — and never NaN', () => {
    expect(cosine([1, 0], [2, 0])).toBeCloseTo(1, 6);
    expect(cosine([1, 0], [0, 3])).toBeCloseTo(0, 6);
    expect(cosine([1, 0], [-4, 0])).toBeCloseTo(-1, 6);
    expect(cosine([0, 0], [1, 1])).toBe(0);           // a text of no known word is no direction
    expect(cosine([1, 2], [1])).toBe(0);              // vectors of different sizes are not comparable
    expect(Number.isNaN(cosine([], []))).toBe(false);
  });
});

describe('the stand-in transport', () => {
  it('has a name and a dimension, answers one unit vector a text, and is deterministic', async () => {
    const t = stub();
    expect(t.name).toMatch(/stub/);
    expect(t.dimension).toBe(256);
    const [a, b] = await t.embed(['Pricing for the review', 'Pricing for the review']);
    expect(a).toHaveLength(256);
    expect(Math.hypot(...a)).toBeCloseTo(1, 5);
    expect([...a]).toEqual([...b]);
  });
  it('scores related words higher than unrelated ones — what makes it a test of meaning, not of spelling', async () => {
    const t = stub();
    const [q, cost, hose, same] = await t.embed(['pricing', 'what it costs — the budget', 'garden hose', 'Pricing']);
    expect(cosine(q, same)).toBeCloseTo(1, 5);
    expect(cosine(q, cost)).toBeGreaterThan(0.5);      // no word in common, one meaning
    expect(cosine(q, hose)).toBeLessThan(0.1);
    expect(cosine(q, cost)).toBeGreaterThan(cosine(q, hose) + 0.4);
  });
  it('an empty text is a zero vector, not an error', async () => {
    const [v] = await stub().embed(['  — ']);
    expect(v.every((x) => x === 0)).toBe(true);
  });
});

describe('the scorer Find takes', () => {
  const boards = [
    board('a', 'Alpha', [entry('m1', 'Pricing', 'label'), entry('m2', 'Standup notes', 'text', 'typed text')]),
    board('b', 'Beta', [entry('m3', 'Garden hose', 'text', 'typed text')]),
  ];
  const all = boards.flatMap((b) => b.entries);

  it('lets in what no word matched, by meaning — and says it was meaning, with the number', async () => {
    const score = await semanticScorer(stub(), 'the budget', all);
    const groups = searchBoards(boards, 'the budget', { semantic: score });
    expect(groups.map((g) => g.board)).toEqual(['a']);
    const hit = groups[0].hits[0];
    expect(hit.id).toBe('m1');
    expect(hit.spans).toEqual([]);                      // no word of it was typed
    expect(hit.meaning).toBeGreaterThanOrEqual(SEMANTIC_FLOOR);
  });

  it('is a score in 0..1, and what is unrelated is under the floor', async () => {
    const score = await semanticScorer(stub(), 'the budget', all);
    for (const e of all) { const s = score('the budget', e, boards[0]); expect(s).toBeGreaterThanOrEqual(0); expect(s).toBeLessThanOrEqual(1); }
    expect(score('the budget', all[2], boards[1])).toBeLessThan(SEMANTIC_FLOOR);
  });

  it('adds to the lexical score: the exact word and its neighbour in meaning both stand, the exact one first', async () => {
    const two = [board('a', 'Alpha', [entry('m1', 'cost of the plans'), entry('m2', 'budget')])];
    const score = await semanticScorer(stub(), 'budget', two.flatMap((b) => b.entries));
    const hits = searchBoards(two, 'budget', { semantic: score })[0].hits;
    expect(hits.map((h) => h.id)).toEqual(['m2', 'm1']);
    expect(hits[0].spans.length).toBe(1);
  });

  it('with no semantic function Find is exactly what it was', () => {
    const plain = searchBoards(boards, 'budget');
    expect(plain).toEqual([]);
    const withWord = searchBoards(boards, 'pric');
    expect(withWord[0].hits[0].meaning).toBeUndefined();
  });

  it('embeds each text once: a second query asks only for itself, and the cache is by text', async () => {
    const t = counting(stub());
    const cache = createEmbedCache();
    await semanticScorer(t, 'budget', all, { cache });
    expect(t.asked.filter((x) => x === 'Pricing')).toHaveLength(1);
    expect(t.asked).toContain('budget');
    const before = t.asked.length;
    await semanticScorer(t, 'meeting', all, { cache });
    expect(t.asked.slice(before)).toEqual(['meeting']);
    // The same text on two entries is one text.
    const dup = [entry('x', 'Same words'), entry('y', 'Same words')];
    const t2 = counting(stub());
    await semanticScorer(t2, 'q', dup);
    expect(t2.asked.filter((x) => x === 'Same words')).toHaveLength(1);
  });

  it('a cache is a transport\'s own: another model\'s vectors are never mixed in', async () => {
    const cache = createEmbedCache();
    const a = counting(createStubEmbedTransport({ groups: GROUPS, dimension: 64, name: 'stub-a' }));
    const b = counting(createStubEmbedTransport({ groups: GROUPS, dimension: 128, name: 'stub-b' }));
    await semanticScorer(a, 'budget', all, { cache });
    await semanticScorer(b, 'budget', all, { cache });
    expect(b.asked.filter((x) => x === 'Pricing')).toHaveLength(1);
  });

  it('says in words when the transport fails or answers the wrong number of vectors — and keeps nothing half-made', async () => {
    const broken: EmbedTransport = { name: 'broken', dimension: 4, embed: async () => { throw new Error('the weights did not load'); } };
    await expect(semanticScorer(broken, 'q', all)).rejects.toThrow(/weights did not load/);
    const short: EmbedTransport = { name: 'short', dimension: 4, embed: async (texts) => texts.slice(1).map(() => new Float32Array(4)) };
    const err = await semanticScorer(short, 'q', all).catch((e) => e);
    expect(err).toBeInstanceOf(EmbedError);
    expect(String(err.message)).toMatch(/vectors/);
    const wide: EmbedTransport = { name: 'wide', dimension: 4, embed: async (texts) => texts.map(() => new Float32Array(5)) };
    expect(String((await semanticScorer(wide, 'q', all).catch((e) => e)).message)).toMatch(/dimension/);
  });

  it('a cancelled ask rejects as cancelled and leaves the cache as it was', async () => {
    const cache = createEmbedCache();
    const c = new AbortController();
    const slow: EmbedTransport = { name: 'slow', dimension: 4, embed: (_texts, o) => new Promise((_, rej) => { o?.signal?.addEventListener('abort', () => rej(new Error('cancelled'))); }) };
    const p = semanticScorer(slow, 'q', all, { cache, signal: c.signal });
    c.abort();
    await expect(p).rejects.toThrow(/cancelled/);
    expect(cache.size).toBe(0);
  });

  it('a query with no word in it asks nothing and scores nothing', async () => {
    const t = counting(stub());
    const score = await semanticScorer(t, ' — ', all);
    expect(t.calls).toBe(0);
    expect(score(' — ', all[0], boards[0])).toBe(0);
  });
});

describe('notes like this', () => {
  const boards = [
    board('a', 'Alpha', [entry('m1', 'Pricing for the review', 'text', 'typed text'), entry('m2', 'Standup notes', 'text', 'typed text'), entry('m5', 'Garden hose', 'label')], 3),
    board('b', 'Beta', [entry('m3', 'Cost of the plans', 'label'), entry('m4', 'Lawn and hose', 'text', 'typed text'), entry('m6', 'Weekly sync call', 'text', 'typed text')], 2),
  ];
  const source = { text: 'Pricing for the review', board: 'a', ids: ['m1'] };

  it('ranks the others by nearness in meaning, across boards, never the thing itself', async () => {
    const likes = await notesLike(stub(), boards, source, { floor: 0 });
    expect(likes[0]).toMatchObject({ board: 'b', boardName: 'Beta', id: 'm3', kind: 'label', text: 'Cost of the plans' });
    expect(likes.map((l) => l.id)).not.toContain('m1');
    for (let i = 1; i < likes.length; i++) expect(likes[i - 1].score).toBeGreaterThanOrEqual(likes[i].score);
  });

  it('leaves out what is not near: under the floor is not a note like this', async () => {
    const likes = await notesLike(stub(), boards, source);
    expect(likes.map((l) => l.id)).toEqual(['m3']);     // the hose, the standup and the sync are other things
    for (const l of likes) expect(l.score).toBeGreaterThanOrEqual(SEMANTIC_FLOOR);
  });

  it('says why, each: the number, what measured it, and whether a word is shared', async () => {
    const likes = await notesLike(stub(), boards, source);
    const l = likes[0];
    expect(l.reason).toMatch(/0\.\d\d/);
    expect(l.reason).toContain(l.score.toFixed(2));
    expect(l.reason).toContain('stub');
    expect(l.reason).toMatch(/no word in common/);
    const shared = await notesLike(stub(), [board('c', 'Gamma', [entry('m7', 'Pricing — the budget')])], source);
    expect(shared[0].reason).toMatch(/shares “pricing”/);
  });

  it('a copy of it on another board IS a note like it (the same words, 1.00); on its own board, only the thing itself is left out', async () => {
    const both = [boards[0], board('b', 'Beta', [entry('z', 'Pricing for the review', 'label')])];
    const likes = await notesLike(stub(), both, source);
    expect(likes.map((l) => [l.board, l.id])).toEqual([['b', 'z']]);
    expect(likes[0].score).toBeCloseTo(1, 2);
  });

  it('takes a limit and a floor of its own; nothing to compare against is none', async () => {
    const wide = await notesLike(stub(), boards, source, { floor: 0, limit: 2 });
    expect(wide).toHaveLength(2);
    expect(await notesLike(stub(), boards, { text: '  ', board: 'a', ids: [] })).toEqual([]);
    expect(await notesLike(stub(), [], source)).toEqual([]);
  });

  it('groups by board for the pane that already shows Find — best board first, a hit carrying its reason', async () => {
    const likes = await notesLike(stub(), boards, source, { floor: 0.3 });
    const groups = groupLikes(likes, boards);
    expect(groups[0]).toMatchObject({ board: 'b', name: 'Beta' });
    expect(groups[0].hits[0]).toMatchObject({ id: 'm3', board: 'b', boardName: 'Beta', spans: [] });
    expect(groups[0].hits[0].score).toBeCloseTo(likes[0].score, 6);
    expect(groups[0].hits[0].reason).toBe(likes[0].reason);
    expect(groups.every((g, i) => i === 0 || groups[i - 1].score >= g.score)).toBe(true);
  });

  it('embeds from the cache: the same boards asked about twice are embedded once', async () => {
    const t = counting(stub());
    const cache = createEmbedCache();
    await notesLike(t, boards, source, { cache });
    const n = t.asked.length;
    await notesLike(t, boards, { text: 'Weekly sync call', board: 'b', ids: ['m6'] }, { cache });
    expect(t.asked.length).toBe(n);                     // every text was held already
  });
});

describe('the words a held mark carries', () => {
  it('a label, a typed text, read writing and a region\'s name with what it holds — from the board, nothing else', () => {
    const s = createSession();
    const box = s.addStroke(rectStroke(0, 0, 100, 60), 1000, undefined, 1, { content: true })!;
    s.label({ nodeId: box, text: 'Pricing', at: 1001 });
    const other = s.addStroke(rectStroke(1200, 1200, 100, 60), 1100, undefined, 1, { content: true })!;
    s.label({ nodeId: other, text: 'Elsewhere', at: 1101 });
    const inner = s.addStroke(rectStroke(40, 400, 100, 60), 1200, undefined, 1, { content: true })!;
    s.label({ nodeId: inner, text: 'Margins', at: 1201 });
    const region = s.region({ name: 'Monday', bounds: { minX: 0, minY: 380, maxX: 300, maxY: 520 }, at: 1300 })!;
    const st = s.getState();
    expect(wordsOfMarks(st, [box])).toBe('Pricing');
    expect(wordsOfMarks(st, [box, other])).toBe('Pricing Elsewhere');
    expect(wordsOfMarks(st, [region])).toBe('Monday Margins');
    expect(wordsOfMarks(st, ['nonesuch'])).toBe('');
    const bare = s.addStroke(rectStroke(600, 0, 80, 50), 1400, undefined, 1, { content: true })!;
    expect(wordsOfMarks(s.getState(), [bare])).toBe('');
  });

  it('searchEntriesOf asked only for some ids reads only those, and the whole board is unchanged', () => {
    const s = createSession();
    const a = s.addStroke(rectStroke(0, 0, 100, 60), 1000, undefined, 1, { content: true })!;
    const b = s.addStroke(rectStroke(300, 0, 100, 60), 1100, undefined, 1, { content: true })!;
    s.label({ nodeId: a, text: 'one', at: 1001 });
    s.label({ nodeId: b, text: 'two', at: 1101 });
    const st = s.getState();
    expect(searchEntriesOf(st, new Set([a])).map((e) => e.text)).toEqual(['one']);
    expect(searchEntriesOf(st).map((e) => e.text)).toEqual(['one', 'two']);
  });
});
