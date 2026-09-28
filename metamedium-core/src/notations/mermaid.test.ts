// Mermaid out (V1-PLAN §3, §9 D2).
//
// A notation reading becomes Mermaid text at tier 1 — no model writes it. The
// flowchart first: `flowchart TD` (LR when the drawing runs across, said with
// its reason), each symbol in its shape, each flow `-->` or `---` with its
// label, ids that are the marks' own said safely, writing nobody has read
// written as a placeholder and said in the notes. The same drawing exports the
// same text on every run, in every replay and in any merge order.
//
// The trap: a label with `"`, `|`, `[`, `]`, `{`, `}` or `(` in it breaks
// Mermaid's parse, and two ids that differ only in characters Mermaid cannot
// hold must not become one.

import { describe, it, expect } from 'vitest';
import type { Bounds } from '../types';
import { createSession, DEFAULT_SESSION_CONFIG } from '../session/session';
import type { Session, SessionEvent } from '../session/session';
import { mergeLogs } from '../store/merge';
import { readFlowchart } from './flowchart';
import type { NotationReading, NotationSymbol, NotationConnector, NotationLabel } from './notation';
import { toMermaid, mermaidIds, mermaidString, unescapeMermaid, registerMermaidWriter, mermaidWriters, UNREAD_WRITING } from './mermaid';
import type { MermaidOptions, MermaidText } from './mermaid';
import { drawFlowchart, FLOWCHART_VARIANTS } from './fixtures/flowchart';
import type { Expected } from './fixtures/flowchart';
import { FLOWCHART_MERMAID_UNREAD, FLOWCHART_MERMAID_READ, FLOWCHART_WORDS } from './fixtures/flowchart.mermaid';
import { handShape, boxCorners, diamondCorners } from './fixtures/hand';
import { handArrow, handCircle } from '../test/strokes';

const named = (logName: string) => createSession({ ...DEFAULT_SESSION_CONFIG, logName });

function exported(s: Session, opts?: MermaidOptions): MermaidText {
  const r = readFlowchart(s.getState());
  if (!r) throw new Error('no flowchart reading');
  const m = toMermaid(r, opts);
  if (!m) throw new Error('no Mermaid for a flowchart');
  return m;
}

/** A model that can see reads every piece of writing in the fixture — or says each one as `words` has it. */
function readTheWriting(s: Session, e: Expected, words: Record<string, string> = FLOWCHART_WORDS, at = 900_000) {
  const pid = s.join('agent', 'llm:seeing', at, 2);
  e.labels.forEach((l, i) =>
    s.propose({ participantId: pid, nodeId: l.id, edges: [], reps: [{ modality: 'transcript', data: { text: words[l.of] }, confidence: 0.9 }], at: at + 100 + i })
  );
}

const arrow = (from: { x: number; y: number }, to: { x: number; y: number }, seed: number) => handArrow(from, to, { wings: 2, headLen: 16, seed, jitter: 1 });

// ===== A reading built by hand, for the writer alone =====

const box = (x: number, y: number, w = 160, h = 70): Bounds => ({ minX: x - w / 2, maxX: x + w / 2, minY: y - h / 2, maxY: y + h / 2 });

function sym(id: string, symbol: string, at: [number, number], o: { ids?: string[]; labels?: string[]; text?: string } = {}): NotationSymbol {
  const b = box(at[0], at[1]);
  return {
    id,
    ids: o.ids ?? [id],
    symbol,
    role: 'node',
    confidence: 0.8,
    reason: `a ${symbol}`,
    readings: [{ symbol, role: 'node', confidence: 0.8, reason: `a ${symbol}` }],
    outline: [{ x: b.minX, y: b.minY }, { x: b.maxX, y: b.minY }, { x: b.maxX, y: b.maxY }, { x: b.minX, y: b.maxY }],
    bounds: b,
    ports: [],
    labels: o.labels ?? [],
    ...(o.text ? { text: o.text } : {}),
  };
}

function flow(id: string, from: string, to: string, direction: NotationConnector['direction'] = 'forward', labels: string[] = []): NotationConnector {
  const end = (e: 'start' | 'end') => ({ end: e, point: { x: 0, y: 0 }, reason: 'drawn' });
  return { id, ids: [id], kind: 'flow', role: 'edge', direction, directed: direction !== 'none', from, to, ends: { from: end('start'), to: end('end') }, confidence: 0.8, reason: 'a flow', labels };
}

function label(id: string, of: string, where: NotationLabel['where'], at: [number, number], text?: string): NotationLabel {
  return { id, of, where, role: 'label', confidence: 0.8, reason: 'writing', bounds: box(at[0], at[1], 40, 16), ...(text !== undefined ? { text } : {}) };
}

function reading(symbols: NotationSymbol[], connectors: NotationConnector[], labels: NotationLabel[] = []): NotationReading {
  const roles: NotationReading['roles'] = {};
  for (const s of symbols) for (const id of s.ids) roles[id] = 'node';
  for (const c of connectors) roles[c.id] = 'edge';
  for (const l of labels) roles[l.id] = 'label';
  return { notation: 'flowchart', name: 'Flowchart', confidence: 0.8, summary: 'a test chart', reason: 'a test chart', symbols, connectors, labels, roles, unplaced: [], counts: {} };
}

/** A reading's lists in another order: what it holds is the same, how it lists them is not an input. */
function shuffled(r: NotationReading): NotationReading {
  const turn = <T>(xs: readonly T[]) => [...xs.slice(1), ...xs.slice(0, 1)].reverse();
  return {
    ...r,
    symbols: turn(r.symbols).map((s) => ({ ...s, ids: [...s.ids].reverse(), labels: [...s.labels].reverse() })),
    connectors: turn(r.connectors).map((c) => ({ ...c, labels: [...c.labels].reverse() })),
    labels: turn(r.labels),
  };
}

// ===== The golden text =====

describe('D1’s hand-drawn flowchart, in Mermaid', () => {
  it('every hand of the bench exports one text — the golden — with writing nobody has read written as a placeholder', () => {
    const wrong: string[] = [];
    for (const v of FLOWCHART_VARIANTS) {
      const s = createSession();
      drawFlowchart(s, v);
      const m = exported(s);
      if (m.text !== FLOWCHART_MERMAID_UNREAD) wrong.push(`seed ${v.seed} jitter ${v.jitter} tilt ${v.tilt}:\n${m.text}`);
    }
    expect(wrong.slice(0, 2)).toEqual([]);
    expect(wrong.length).toBe(0);
  });

  it('once a model has read the writing, its words — every hand the same', () => {
    const wrong: string[] = [];
    for (const v of FLOWCHART_VARIANTS) {
      const s = createSession();
      readTheWriting(s, drawFlowchart(s, v));
      const m = exported(s);
      if (m.text !== FLOWCHART_MERMAID_READ) wrong.push(`seed ${v.seed} jitter ${v.jitter} tilt ${v.tilt}:\n${m.text}`);
    }
    expect(wrong.slice(0, 2)).toEqual([]);
    expect(wrong.length).toBe(0);
  });

  it('the notes say what the text does not: the writing nobody has read, and the symbols with no writing in them', () => {
    const s = createSession();
    const e = drawFlowchart(s, FLOWCHART_VARIANTS[0]);
    const m = exported(s);
    const unread = m.notes.find((n) => n.includes('not been read'));
    expect(unread).toBeDefined();
    for (const id of ['stroke_1', 'stroke_3', 'stroke_4', 'stroke_5']) expect(unread).toContain(id);
    expect(unread).toContain('stroke_4 --> stroke_5');
    expect(unread).toContain(`"${UNREAD_WRITING}"`);
    const blank = m.notes.find((n) => n.includes('no writing'));
    for (const id of ['stroke_2', 'figure_6_7', 'stroke_12', 'figure_8_9_10_11']) expect(blank).toContain(id);
    // Read, nothing is unknown any more.
    readTheWriting(s, e);
    const read = exported(s);
    expect(read.notes.some((n) => n.includes('not been read'))).toBe(false);
    expect(read.text).not.toContain(UNREAD_WRITING);
  });

  it('maps back to the marks: each Mermaid id to what stands for its symbol, every stroke it is drawn with, and each link to its connector', () => {
    const s = createSession();
    drawFlowchart(s, FLOWCHART_VARIANTS[0]);
    const m = exported(s);
    expect(m.notation).toBe('flowchart');
    expect(m.diagram).toBe('flowchart');
    expect(m.ids).toEqual({
      stroke_1: 'stroke:1',
      stroke_2: 'stroke:2',
      stroke_3: 'stroke:3',
      stroke_4: 'stroke:4',
      stroke_5: 'stroke:5',
      figure_6_7: 'figure:stroke:6+stroke:7',
      stroke_12: 'stroke:12',
      figure_8_9_10_11: 'figure:stroke:10+stroke:11+stroke:8+stroke:9',
    });
    expect(m.marks.figure_6_7).toEqual(['stroke:6', 'stroke:7']);
    expect(m.marks.figure_8_9_10_11).toEqual(['stroke:8', 'stroke:9', 'stroke:10', 'stroke:11']);
    expect(m.marks.stroke_1).toEqual(['stroke:1']);
    // Mermaid numbers links in the order they are written (linkStyle 0, 1, …).
    expect(m.links.map((l) => [l.index, l.id, l.from, l.to])).toEqual([
      [0, 'stroke:13', 'stroke_1', 'stroke_2'],
      [1, 'stroke:14', 'stroke_2', 'stroke_3'],
      [2, 'stroke:15', 'stroke_3', 'stroke_4'],
      [3, 'stroke:16', 'stroke_4', 'stroke_5'],
      [4, 'stroke:17', 'stroke_4', 'figure_6_7'],
      [5, 'stroke:18', 'stroke_5', 'stroke_12'],
      [6, 'stroke:19', 'figure_6_7', 'figure_8_9_10_11'],
      [7, 'stroke:20', 'figure_8_9_10_11', 'stroke_12'],
    ]);
  });

  it('the header says which way the flows run, and why', () => {
    const s = createSession();
    drawFlowchart(s, FLOWCHART_VARIANTS[0]);
    const m = exported(s);
    expect(m.text.split('\n')[0]).toBe('flowchart TD');
    expect(m.direction?.value).toBe('TD');
    expect(m.direction?.reason).toMatch(/down/);
    expect(m.direction?.reason).toMatch(/\d+ of \d+ flows/);
  });
});

// ===== Determinism =====

describe('the same drawing, the same text', () => {
  it('on every run, after a replay, and whatever order the reading lists things in', () => {
    const s = createSession();
    readTheWriting(s, drawFlowchart(s, FLOWCHART_VARIANTS[5]));
    const first = exported(s);
    expect(exported(s)).toEqual(first);
    const again = createSession();
    again.load(s.getEvents());
    expect(exported(again)).toEqual(first);
    const r = readFlowchart(s.getState())!;
    expect(toMermaid(shuffled(r))).toEqual(first);
  });

  it('two hands, any merge order: whoever merges, however the logs are listed or laid end to end', () => {
    // Ada draws the symbols; Bob draws the flows and writes the labels.
    const ada = named('ada');
    const bob = named('bob~t1');
    let k = 0;
    const hand = { addStroke: (pts: { x: number; y: number }[], at: number) => (k++ < 12 ? ada : bob).addStroke(pts, at) } as unknown as Session;
    drawFlowchart(hand, FLOWCHART_VARIANTS[2]);
    const adaLog = ada.getEvents().slice();
    const bobLog = bob.getEvents().slice();

    const texts = new Map<string, string>();
    for (const me of ['ada', 'bob~t1', 'cleo']) {
      for (const [how, logs] of [['ada first', { ada: adaLog, 'bob~t1': bobLog }], ['bob first', { 'bob~t1': bobLog, ada: adaLog }]] as const) {
        const c = named(me);
        c.load(mergeLogs(logs, { me }));
        texts.set(`${me}, ${how}`, exported(c).text);
      }
    }
    const stamp = (log: readonly SessionEvent[], by: string) => log.map((e) => ({ ...e, by }));
    for (const log of [[...stamp(adaLog, 'ada'), ...stamp(bobLog, 'bob~t1')], [...stamp(bobLog, 'bob~t1'), ...stamp(adaLog, 'ada')]]) {
      const c = named('cleo');
      c.load(JSON.parse(JSON.stringify(log)));
      texts.set(`end to end, ${log[0].by} first`, exported(c).text);
    }
    const all = [...new Set(texts.values())];
    expect(all.length, [...texts].map(([k2, t]) => `${k2}:\n${t}`).join('\n')).toBe(1);
    // The ids are the hands' own, said safely: a hand's name with `~` in it cannot collide with one without.
    const text = all[0];
    expect(text).toContain('stroke_ada_1(["(unread writing)"])');
    expect(text).toContain('figure_ada_8_ada_9_ada_10_ada_11[" "]');
    expect(text).toMatch(/stroke_ada_1 --> stroke_ada_2/);
  });
});

// ===== Shapes, flows, direction =====

describe('each symbol in its shape, each flow in its line', () => {
  it('[process] {decision} ([terminator]) [/data/] ((start)) (((end)))', () => {
    const r = reading(
      [sym('stroke:1', 'start', [300, 0]), sym('stroke:2', 'terminator', [300, 100]), sym('stroke:3', 'data', [300, 200]), sym('stroke:4', 'process', [300, 300]), sym('stroke:5', 'decision', [300, 400]), sym('stroke:6', 'end', [300, 500])],
      [flow('stroke:7', 'stroke:1', 'stroke:2'), flow('stroke:8', 'stroke:2', 'stroke:3'), flow('stroke:9', 'stroke:3', 'stroke:4'), flow('stroke:10', 'stroke:4', 'stroke:5'), flow('stroke:11', 'stroke:5', 'stroke:6')]
    );
    const lines = toMermaid(r)!.text.split('\n');
    expect(lines.slice(1, 7)).toEqual([
      '    stroke_1((" "))',
      '    stroke_2([" "])',
      '    stroke_3[/" "/]',
      '    stroke_4[" "]',
      '    stroke_5{" "}',
      '    stroke_6(((" ")))',
    ]);
  });

  it('a head at one end is -->, none is ---, both is <-->; writing beside a flow rides on it as |"…"|', () => {
    const r = reading(
      [sym('stroke:1', 'process', [100, 0]), sym('stroke:2', 'process', [100, 200]), sym('stroke:3', 'process', [100, 400]), sym('stroke:4', 'process', [100, 600])],
      [flow('stroke:5', 'stroke:1', 'stroke:2', 'forward', ['stroke:8']), flow('stroke:6', 'stroke:2', 'stroke:3', 'none'), flow('stroke:7', 'stroke:3', 'stroke:4', 'both')],
      [label('stroke:8', 'stroke:5', 'beside', [140, 100], 'then')]
    );
    const text = toMermaid(r)!.text;
    expect(text).toContain('    stroke_1 -->|"then"| stroke_2\n');
    expect(text).toContain('    stroke_2 --- stroke_3\n');
    expect(text).toContain('    stroke_3 <--> stroke_4\n');
  });

  it('LR when the drawing runs across — measured between the symbols each flow joins — with the reason', () => {
    const s = createSession();
    let t = 1000;
    const at = () => (t += 4000);
    s.addStroke(handShape(boxCorners(100, 300, 150, 70), { seed: 1 }), at());
    s.addStroke(handShape(diamondCorners(360, 300, 170, 110), { seed: 2 }), at());
    s.addStroke(handShape(boxCorners(620, 300, 150, 70), { seed: 3 }), at());
    s.addStroke(handCircle(820, 300, 14, { seed: 4, jitter: 1 }), at());
    s.addStroke(arrow({ x: 179, y: 300 }, { x: 270, y: 300 }, 5), at());
    s.addStroke(arrow({ x: 449, y: 300 }, { x: 540, y: 300 }, 6), at());
    s.addStroke(arrow({ x: 699, y: 300 }, { x: 802, y: 300 }, 7), at());
    const m = exported(s);
    expect(m.text.split('\n')[0]).toBe('flowchart LR');
    expect(m.direction).toMatchObject({ value: 'LR' });
    expect(m.direction!.reason).toMatch(/across/);
    // Across, a column is read top to bottom and the columns left to right — here one row, left to right.
    expect(m.text.split('\n').slice(1, 5).map((l) => l.trim().split(/[[{(]/)[0])).toEqual(['stroke_1', 'stroke_2', 'stroke_3', 'stroke_4']);
  });

  it('the direction can be asked for, and the reason says it was', () => {
    const s = createSession();
    drawFlowchart(s, FLOWCHART_VARIANTS[0]);
    const m = exported(s, { direction: 'LR' });
    expect(m.text.split('\n')[0]).toBe('flowchart LR');
    expect(m.direction!.reason).toMatch(/asked/);
  });
});

// ===== The trap: escaping =====

/** Characters that break Mermaid's parse unquoted, and the ones its own preprocessing reads (entities, comments, directives, markdown). */
const NASTY = [
  'Say "hi"',
  'a|b',
  '[x]',
  '{y}',
  '(z)',
  'Is x > 0?',
  'a < b & c',
  '#1 and #quot; as typed',
  '100%',
  '%%{init: {"theme":"dark"}}%%',
  '`code`',
  'end',
  'style: bold; #fff;',
  'classDef x fill:#f9f;',
  'two\nlines',
  'semi; colon: done',
  'café → ok',
];

describe('the trap: every label is quoted, and escaped', () => {
  it('quoted, with nothing inside that ends the string, starts a comment or a directive, or reads as markup — and nothing lost', () => {
    for (const raw of NASTY) {
      const q = mermaidString(raw);
      expect(q.startsWith('"') && q.endsWith('"'), raw).toBe(true);
      const inner = q.slice(1, -1);
      expect(inner, raw).not.toMatch(/["%`<>&\n]|<(?!br>)/);
      // Every # is an entity Mermaid decodes: #name; or #digits;.
      expect(inner.replace(/#(\w+);/g, ''), raw).not.toContain('#');
      expect(unescapeMermaid(q), raw).toBe(raw);
    }
  });

  it('on a board: labels that break Mermaid unquoted stand whole in a process, a decision and a flow', () => {
    const s = createSession();
    const e = drawFlowchart(s, FLOWCHART_VARIANTS[1]);
    const words = { ...FLOWCHART_WORDS, P1: 'Parse "a|b" [x] {y} (z)', Q1: 'x > 0 & y < 1?', f4: 'yes | (default)', f5: 'no {else}' };
    readTheWriting(s, e, words);
    const m = exported(s);
    const node = /^ {4}[A-Za-z][A-Za-z0-9_]*(\(\(\(|\(\(|\(\[|\[\/|\[|\{)"[^"]*"(\)\)\)|\)\)|\]\)|\/\]|\]|\})$/;
    const link = /^ {4}[A-Za-z][A-Za-z0-9_]* (-->|---|<-->)(\|"[^"]*"\|)? [A-Za-z][A-Za-z0-9_]*$/;
    const lines = m.text.trimEnd().split('\n');
    expect(lines[0]).toBe('flowchart TD');
    for (const l of lines.slice(1)) expect(node.test(l) || link.test(l), l).toBe(true);
    const said = (line: string | undefined) => unescapeMermaid(/"[^"]*"/.exec(line ?? '')![0]);
    expect(said(lines.find((l) => l.startsWith('    stroke_3[')))).toBe(words.P1);
    expect(said(lines.find((l) => l.startsWith('    stroke_4{')))).toBe(words.Q1);
    expect(said(lines.find((l) => l.startsWith('    stroke_4 -->|') && l.endsWith('stroke_5')))).toBe(words.f4);
    expect(said(lines.find((l) => l.startsWith('    stroke_4 -->|') && l.endsWith('figure_6_7')))).toBe(words.f5);
  });

  it('what Mermaid does to the text before it parses changes nothing written here', () => {
    // Mermaid (mermaidAPI encodeEntities) strips the last character of any line
    // matching these before it reads entities, so `style A fill:#f9f;` keeps
    // its colour. On a line of ours it would eat the `;` that ends an entity.
    const quirks = [/style.*:\S*#.*;/, /classDef.*:\S*#.*;/];
    const hand = named('style~ada'); // a hand whose name puts "style" in every id it mints
    hand.addStroke(handShape(boxCorners(200, 100, 160, 70), { seed: 11 }), 1000);
    hand.addStroke(handShape(boxCorners(200, 320, 160, 70), { seed: 12 }), 5000);
    hand.addStroke(arrow({ x: 200, y: 139 }, { x: 200, y: 281 }, 13), 9000);
    const r = readFlowchart(hand.getState())!;
    const [a, b] = r.symbols;
    const withWords = { ...r, symbols: [{ ...a, text: 'style: "bold"' }, { ...b, text: 'classDef x fill:#f9f;' }], connectors: r.connectors.map((c) => ({ ...c, text: 'note: 50%' })) };
    const text = toMermaid(withWords)!.text;
    for (const line of text.split('\n')) {
      for (const q of quirks) expect(q.test(line), line).toBe(false);
      expect(line.trimStart().startsWith('%%'), line).toBe(false);
      expect(line, line).not.toContain('%%{');
    }
  });
});

// ===== Ids =====

describe('ids: the marks’ own, said safely', () => {
  const tricky = [
    'stroke:1',
    'stroke:ada:1',
    'stroke:qwen3:8b:1',
    'stroke:qwen3-8b:1',
    'stroke:qwen3_8b:1',
    'stroke:qwen3.8b:1',
    'stroke:bob~t1:3.2',
    'word:7',
    'figure:stroke:10+stroke:11+stroke:8+stroke:9',
    'figure:stroke:ada:6+stroke:ada:7',
    'style:1',
    'classDef:2',
    'end',
    'n:end',
    'n_end',
    'subgraph:1',
    'graph:3',
    'click:4',
    '1:2',
    '::',
    '',
    'éé:5',
  ];

  it('letters, digits and underscores; a letter first; never a keyword Mermaid reads first; never two alike', () => {
    const ids = mermaidIds(tricky);
    expect([...ids.keys()].sort()).toEqual([...new Set(tricky)].sort());
    const said = [...ids.values()];
    expect(new Set(said).size).toBe(said.length);
    for (const m of said) {
      expect(m).toMatch(/^[A-Za-z][A-Za-z0-9_]*$/);
      expect(m).not.toMatch(/^(end|graph|flowchart|subgraph|style|classdef|class|click|linkstyle|default|direction|call|href|interpolate|acc)/i);
    }
    // The plain ones read plainly.
    expect(ids.get('stroke:1')).toBe('stroke_1');
    expect(ids.get('stroke:ada:1')).toBe('stroke_ada_1');
    expect(ids.get('word:7')).toBe('word_7');
    expect(ids.get('figure:stroke:10+stroke:11+stroke:8+stroke:9')).toBe('figure_8_9_10_11');
    expect(ids.get('figure:stroke:ada:6+stroke:ada:7')).toBe('figure_ada_6_ada_7');
  });

  it('the same ids in any order, or among others that do not collide with them, are said the same', () => {
    const once = mermaidIds(tricky);
    expect(mermaidIds([...tricky].reverse())).toEqual(once);
    const more = mermaidIds([...tricky, 'stroke:99', 'word:ada:4']);
    for (const id of tricky) expect(more.get(id), id).toBe(once.get(id));
  });
});

// ===== Words on the ink itself, and a line read as one =====

describe('what the ink itself says', () => {
  it('a word a hand put on its own symbol or flow is its text', () => {
    const s = createSession();
    const e = drawFlowchart(s, FLOWCHART_VARIANTS[0]);
    readTheWriting(s, e);
    const f7 = e.flows.find((f) => f.name === 'f7')!.id;
    s.label({ nodeId: e.symbols.D0.ids[0], text: 'The order', at: 950_000 });
    s.label({ nodeId: f7, text: 'then', at: 950_001 });
    const m = exported(s);
    expect(m.text).toContain('    stroke_2[/"The order"/]\n');
    expect(m.text).toContain('    figure_6_7 ---|"then"| figure_8_9_10_11\n');
    expect(m.notes.find((n) => n.includes('no writing'))).not.toContain('stroke_2');
  });

  it('writing read with its line says nothing of its own — the line’s words are on its first mark', () => {
    const s = createSession();
    const e = drawFlowchart(s, FLOWCHART_VARIANTS[0]);
    const yes = e.labels.find((l) => l.of === 'f4')!.id;
    const m = exported(s, { readWith: (id) => id === yes });
    expect(m.text).toContain('    stroke_4 --> stroke_5\n');
    expect(m.notes.find((n) => n.includes('not been read'))).not.toContain('stroke_4 --> stroke_5');
  });
});

// ===== Dispatch and derivation =====

describe('dispatch by notation', () => {
  it('the flowchart writes; a notation with no writer gives null; D4–D6 register theirs by notation id', () => {
    expect(mermaidWriters()).toContain('flowchart');
    const r = reading([sym('stroke:1', 'process', [0, 0]), sym('stroke:2', 'process', [0, 200])], [flow('stroke:3', 'stroke:1', 'stroke:2')]);
    expect(toMermaid({ ...r, notation: 'test-class' })).toBeNull();
    const off = registerMermaidWriter('test-class', (rr) => ({ text: `classDiagram\n    class ${rr.symbols.length}\n`, notation: rr.notation, diagram: 'classDiagram', ids: {}, marks: {}, links: [], notes: [] }));
    try {
      expect(mermaidWriters()).toContain('test-class');
      expect(toMermaid({ ...r, notation: 'test-class' })!.text).toBe('classDiagram\n    class 2\n');
    } finally {
      off();
    }
    expect(toMermaid({ ...r, notation: 'test-class' })).toBeNull();
    expect(mermaidWriters()).not.toContain('test-class');
  });

  it('derived: exporting writes nothing into the log', () => {
    const s = createSession();
    drawFlowchart(s, FLOWCHART_VARIANTS[0]);
    const events = s.getEvents().length;
    const nodes = s.getState().nodes.size;
    exported(s);
    exported(s, { direction: 'LR' });
    expect(s.getEvents().length).toBe(events);
    expect(s.getState().nodes.size).toBe(nodes);
  });
});
