// Find (PLAN-IPAD-NOTES I6): words normalised, what a board says extracted from its state, an index of every
// board ranked by one query, which boards to index again, and the thumbnail's fit. Derived, never in a log.
import { describe, it, expect } from 'vitest';
import { createSession } from '../session/session';
import { rectStroke, circleStroke } from '../test/strokes';
import {
  tokenize,
  normalise,
  searchEntriesOf,
  searchKeyOf,
  stalePlan,
  searchBoards,
  describeHit,
  excerptOf,
  registerSearchSource,
  unregisterSearchSource,
  thumbFit,
  SEARCH_VERSION,
  SEMANTIC_FLOOR,
  type SearchBoard,
  type SearchEntry,
} from './index';

const at = { minX: 0, minY: 0, maxX: 300, maxY: 200 };

describe('words', () => {
  it('folds case and diacritics, and keeps where each word stands in what was written', () => {
    const t = tokenize('Café Crème — Straße 2nd');
    expect(t.map((x) => x.text)).toEqual(['cafe', 'creme', 'strasse', '2nd']);
    expect(t.map((x) => [x.start, x.end])).toEqual([[0, 4], [5, 10], [13, 19], [20, 23]]);
    expect(normalise('  PRICING,  notes! ')).toBe('pricing notes');
    expect(tokenize('')).toEqual([]);
    expect(tokenize('—  ·  …')).toEqual([]);
  });
  it('splits on what is not a letter or a digit, in any script', () => {
    expect(tokenize('don\'t go-to 4.5').map((x) => x.text)).toEqual(['don', 't', 'go', 'to', '4', '5']);
    expect(tokenize('Привет мир').map((x) => x.text)).toEqual(['привет', 'мир']);
  });
});

describe('what a board says', () => {
  it('a label on a box, a typed text, a figure\'s words, Mermaid, a picture\'s name, a page and what was read', () => {
    const s = createSession();
    const box = s.addStroke(rectStroke(0, 0, 100, 60), 1000, undefined, 1, { content: true })!;
    s.label({ nodeId: box, text: 'Pricing', at: 1001 });
    s.import({ kind: 'text', path: 'text/1.txt', name: 'text 1', bounds: at, code: 'Pricing notes for the Q4 review', at: 1100 });
    s.import({ kind: 'svg', path: 'fig.svg', name: 'fig.svg', bounds: at, code: '<svg xmlns="http://www.w3.org/2000/svg"><title>Pump</title><text x="1" y="2">Inlet <tspan>valve</tspan></text><text>Outlet</text></svg>', at: 1200 });
    s.import({ kind: 'mermaid', path: 'flow.mmd', name: 'flow.mmd', bounds: at, code: 'flowchart TD\n  a["Receive order"] --> b["Ship it"]', at: 1300 });
    s.import({ kind: 'png', path: 'photos/whiteboard.png', name: 'Whiteboard Monday', bounds: at, asset: 'a'.repeat(64), mime: 'image/jpeg', w: 100, h: 80, at: 1400 });
    s.import({ kind: 'html', path: 'p.html', name: 'p.html', bounds: at, code: '<html><style>.x{color:red}</style><body><h1>Welcome home</h1><script>var secret = 1</script><p>Dolphins &amp; whales</p></body></html>', at: 1500 });
    const word = s.addStroke(circleStroke(500, 500, 30), 1600, undefined, 1, { content: true })!;
    const reader = s.join('agent', 'claude', 1550, 2)!;
    s.propose({ participantId: reader, nodeId: word, edges: [], reps: [{ modality: 'transcript', data: { text: 'budget meeting' }, confidence: 0.8 }], at: 1601 });

    const entries = searchEntriesOf(s.getState());
    const by = (kind: string) => entries.filter((e) => e.kind === kind);
    expect(by('label').map((e) => [e.id, e.text, e.what])).toEqual([[box, 'Pricing', 'label on a box']]);
    expect(by('text').map((e) => e.text)).toEqual(['Pricing notes for the Q4 review']);
    expect(by('text')[0].what).toBe('typed text');
    // A figure's <text> contents, in order, and its title; never its markup.
    expect(by('figure').map((e) => e.text)).toEqual(['Pump', 'Inlet valve', 'Outlet']);
    expect(by('mermaid')[0].text).toContain('Receive order');
    expect(by('picture').map((e) => [e.text, e.what])).toEqual([['Whiteboard Monday', 'picture name']]);
    // A page: its words, not its style or its script, entities read.
    expect(by('page').map((e) => e.text).join(' ')).toContain('Dolphins & whales');
    expect(by('page').map((e) => e.text).join(' ')).not.toContain('secret');
    expect(by('page').map((e) => e.text).join(' ')).not.toContain('color');
    expect(by('transcript').map((e) => [e.id, e.text, e.what])).toEqual([[word, 'budget meeting', 'read writing']]);
    // A default name (`text 1`) says nothing; a file's name does.
    expect(entries.some((e) => e.kind === 'name' && e.text === 'text 1')).toBe(false);
    expect(entries.some((e) => e.kind === 'name' && e.text === 'flow.mmd')).toBe(true);
    // Where each stands.
    expect(by('label')[0].box).toBeTruthy();
    expect(by('text')[0].box).toEqual(at);
  });

  it('leaves out what was erased, what was relabelled and what carries no words', () => {
    const s = createSession();
    const a = s.addStroke(rectStroke(0, 0, 100, 60), 1000, undefined, 1, { content: true })!;
    s.label({ nodeId: a, text: 'old', at: 1001 });
    s.label({ nodeId: a, text: 'newer', at: 1002 });
    const b = s.addStroke(rectStroke(300, 0, 100, 60), 1100, undefined, 1, { content: true })!;
    s.label({ nodeId: b, text: 'gone', at: 1101 });
    s.erase(b, 1102);
    s.addStroke(rectStroke(600, 0, 100, 60), 1200, undefined, 1, { content: true });
    const entries = searchEntriesOf(s.getState());
    expect(entries.map((e) => e.text)).toEqual(['newer']);
  });

  it('a hook for sources the core does not know yet (regions): registered, read with the state, and part of the key', () => {
    const s = createSession();
    const before = searchKeyOf({ changed: 1, events: 1, chars: 1 });
    registerSearchSource({ id: 'test-regions', entries: () => [{ id: 'r1', kind: 'region', text: 'Monday', what: 'region name', box: at }] });
    try {
      expect(searchEntriesOf(s.getState()).map((e) => [e.kind, e.text])).toEqual([['region', 'Monday']]);
      expect(searchKeyOf({ changed: 1, events: 1, chars: 1 })).not.toBe(before);
    } finally { unregisterSearchSource('test-regions'); }
    expect(searchEntriesOf(s.getState())).toEqual([]);
    expect(searchKeyOf({ changed: 1, events: 1, chars: 1 })).toBe(before);
  });

  it('a source that throws is left out and says nothing of its own', () => {
    const s = createSession();
    const id = s.addStroke(rectStroke(0, 0, 100, 60), 1000, undefined, 1, { content: true })!;
    s.label({ nodeId: id, text: 'kept', at: 1001 });
    registerSearchSource({ id: 'test-bad', entries: () => { throw new Error('nope'); } });
    try { expect(searchEntriesOf(s.getState()).map((e) => e.text)).toEqual(['kept']); } finally { unregisterSearchSource('test-bad'); }
  });
});

const entry = (id: string, kind: SearchEntry['kind'], text: string, what = 'label on a box'): SearchEntry => ({ id, kind, text, what, box: { minX: 0, minY: 0, maxX: 10, maxY: 10 } });
const boardOf = (id: string, name: string, recency: number, entries: SearchEntry[]): SearchBoard => ({ id, name, recency, entries });

describe('a query across boards', () => {
  const q4 = boardOf('b1', 'Q4 notes', 100, [entry('m1', 'label', 'Pricing')]);
  const notes = boardOf('b2', 'Monday', 200, [entry('t1', 'text', 'Pricing notes for the review', 'typed text')]);

  it('typing a prefix lists both, and a hit says where it stands', () => {
    const groups = searchBoards([q4, notes], 'pric');
    expect(groups.map((g) => g.board).sort()).toEqual(['b1', 'b2']);
    for (const g of groups) for (const h of g.hits) expect(h.box).toBeTruthy();
  });

  it('exact words rank above prefixes, a short saying above a long one, then the recent board', () => {
    const boards = [
      boardOf('p', 'A', 100, [entry('x', 'label', 'Priceless')]),
      boardOf('e', 'B', 50, [entry('y', 'label', 'Price')]),
      boardOf('long', 'C', 300, [entry('z', 'text', 'The price of things we sell in the autumn at the market', 'typed text')]),
    ];
    // "price" is exact in e and long, only the start of a word in p.
    expect(searchBoards(boards, 'price').map((g) => g.board)).toEqual(['e', 'long', 'p']);
    // Equal saying, equal words: the more recent board first.
    const twins = [boardOf('old', 'Old', 10, [entry('a', 'label', 'Pump')]), boardOf('new', 'New', 20, [entry('a', 'label', 'Pump')])];
    expect(searchBoards(twins, 'pump').map((g) => g.board)).toEqual(['new', 'old']);
  });

  it('every word typed must be there, in any order; a diacritic or a capital does not matter', () => {
    const b = boardOf('b', 'B', 1, [entry('a', 'text', 'Crème brûlée for Monday', 'typed text'), entry('c', 'label', 'Monday')]);
    expect(searchBoards([b], 'MONDAY creme').flatMap((g) => g.hits.map((h) => h.id))).toEqual(['a']);
    expect(searchBoards([b], 'monday tuesday')).toEqual([]);
  });

  it('a board is found by its name too, opening it with no place', () => {
    const groups = searchBoards([q4, notes], 'q4');
    expect(groups.map((g) => g.board)).toEqual(['b1']);
    expect(groups[0].hits[0]).toMatchObject({ kind: 'board', id: null, what: 'board name' });
  });

  it('says the words in context, with the matched span, and counts what it left out', () => {
    const many = boardOf('m', 'Many', 1, Array.from({ length: 9 }, (_, i) => entry('e' + i, 'label', 'pump ' + i)));
    const groups = searchBoards([many], 'pump', { hitsPerBoard: 3 });
    expect(groups[0].hits).toHaveLength(3);
    expect(groups[0].more).toBe(6);
    const h = searchBoards([q4], 'pric')[0].hits[0];
    expect(describeHit(h)).toBe('“Pricing” — label on a box · Board “Q4 notes”');
    expect(h.spans).toEqual([[0, 4]]);
  });

  it('a long text is shown around the words that matched', () => {
    const text = 'x '.repeat(100) + 'the pricing sheet ' + 'y '.repeat(100);
    const ex = excerptOf(text, [[text.indexOf('pricing'), text.indexOf('pricing') + 7]], 60);
    expect(ex.text.length).toBeLessThanOrEqual(64);
    expect(ex.text.startsWith('…')).toBe(true);
    expect(ex.text.slice(ex.spans[0][0], ex.spans[0][1])).toBe('pricing');
  });

  it('nothing typed, or nothing that is a word, finds nothing', () => {
    expect(searchBoards([q4, notes], '')).toEqual([]);
    expect(searchBoards([q4, notes], '  — ')).toEqual([]);
  });

  it('a semantic seat can join: it adds a score, and lets in what no word matched, above a floor', () => {
    const b = boardOf('b', 'B', 1, [entry('a', 'label', 'invoice total'), entry('c', 'label', 'dolphins')]);
    const semantic = (_q: string, e: SearchEntry) => (e.id === 'a' ? SEMANTIC_FLOOR + 0.2 : 0);
    expect(searchBoards([b], 'pricing').length).toBe(0);
    expect(searchBoards([b], 'pricing', { semantic }).flatMap((g) => g.hits.map((h) => h.id))).toEqual(['a']);
  });
});

describe('which boards to index again', () => {
  const key = (n: number) => searchKeyOf({ changed: n, events: n, chars: n });
  it('builds what is missing or stale in the order given, and drops what the list no longer holds', () => {
    const wanted = [{ id: 'a', key: key(1) }, { id: 'b', key: key(2) }, { id: 'c', key: key(3) }];
    const held = { a: key(1), b: key(9), z: key(1) };
    expect(stalePlan(wanted, held)).toEqual({ build: ['b', 'c'], drop: ['z'] });
    expect(stalePlan(wanted, new Map(Object.entries(held)))).toEqual({ build: ['b', 'c'], drop: ['z'] });
    expect(stalePlan([], {})).toEqual({ build: [], drop: [] });
  });
  it('a key is the board\'s own record of its change, and the format\'s version', () => {
    expect(key(1)).not.toBe(key(2));
    expect(key(1)).toContain(String(SEARCH_VERSION));
    expect(searchKeyOf(null)).toBe('');
  });
});

describe('a thumbnail\'s fit', () => {
  it('fits the content into the picture with its proportions, centred, never magnified', () => {
    const f = thumbFit({ minX: 0, minY: 0, maxX: 400, maxY: 200 }, 160, 120, 8);
    expect(f.scale).toBeCloseTo((160 - 16) / 400, 5);
    expect(f.x + 200 * f.scale).toBeCloseTo(80, 5);
    expect(f.y + 100 * f.scale).toBeCloseTo(60, 5);
    // A small mark is not blown up into a blob.
    expect(thumbFit({ minX: 0, minY: 0, maxX: 10, maxY: 10 }, 160, 120, 8).scale).toBeLessThanOrEqual(1);
    // Nothing on the board: nothing to fit.
    expect(thumbFit(null, 160, 120, 8)).toEqual({ scale: 1, x: 0, y: 0 });
  });
});
