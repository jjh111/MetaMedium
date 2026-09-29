// The mind map in Mermaid, both ways (V1-PLAN §3, §9 D6; D2 and D3's rules for
// `mindmap`).
//
// Out: a reading said as the text the mind-map writer writes — the goldens are
// by hand (fixtures/mindmap.mermaid.ts, checked against every hand of the board
// in mindmap.test.ts); here, the rules under them: words escaped so Mermaid
// reads them as written, the tree as indentation in the order a hand reads
// round a node, nodes in their shapes' brackets, nothing in the log.
//
// In: the round trip is the test. A mindmap text drawn with `drawMermaid` is
// ink the notation reads as a hand's, and `toMermaid` says it again — the same
// root, the same nodes with their words and shapes, in the same order among
// their parent's branches — its ids the marks' own on the way back.

import { describe, it, expect } from 'vitest';
import { createSession, DEFAULT_SESSION_CONFIG } from '../session/session';
import type { Session } from '../session/session';
import { getRep, labelOf } from '../session/nodes';
import { bindingsOf } from '../session/magnets';
import { mergeLogs } from '../store/merge';
import { toMermaid, unescapeMermaid, mermaidString, mermaidWriters } from './mermaid';
import { drawMermaid, readMermaid, mermaidReaders } from './mermaid-in';
import { readMindMap, clockwiseFromTop } from './mindmap';
import { readMindMapText } from './mindmap-mermaid';
import type { MindMapDiagramRead } from './mindmap-mermaid';
import { drawMindMap, MINDMAP_VARIANTS } from './fixtures/mindmap';
import type { MindMapExpected } from './fixtures/mindmap';
import { MINDMAP_MERMAID_READ, MINDMAP_MERMAID_UNREAD } from './fixtures/mindmap.mermaid';
import { MINDMAP_ESCAPED, MINDMAP_EVERY, MINDMAP_WIDE, MINDMAP_WRITTEN, randomMindMapText } from './fixtures/mindmap.mermaid-in';

/** Each of these draws and reads whole boards: more than vitest's five seconds on a loaded machine. */
const SLOW = 120_000;

const named = (logName: string) => createSession({ ...DEFAULT_SESSION_CONFIG, logName });

/** A mindmap text with its ids renamed n1, n2, … in the order they first appear. */
function canonical(text: string): string {
  const names = new Map<string, string>();
  return text
    .split('\n')
    .map((line) => {
      const m = /^(\s+)(\S+?)((?:\(\(|\[).*)$/.exec(line);
      if (!m) return line;
      if (!names.has(m[2])) names.set(m[2], `n${names.size + 1}`);
      return `${m[1]}${names.get(m[2])}${m[3]}`;
    })
    .join('\n');
}

/** What a text says, whatever its ids: the root, and every node with its words, its shape and its place among its parent's branches. */
function said(text: string): string[] {
  const read = readMindMapText(text);
  const by = new Map(read.nodes.map((n) => [n.id, n]));
  const place = new Map<string, number>();
  const seen = new Map<string, number>();
  for (const l of read.links) place.set(l.to, seen.set(l.from, (seen.get(l.from) ?? 0) + 1).get(l.from)! - 1);
  return read.nodes.map((n) => `${n.parent ? `${by.get(n.parent)!.text} #${place.get(n.id)} >` : 'root'} ${n.text} (${n.drawn})`);
}

/** A text drawn, read, and said again. */
function drawnBack(text: string, s: Session = named('importer~t1'), opts: { scale?: number } = {}) {
  const drawn = drawMermaid(s, text, { at: 1000, ...opts });
  const reading = readMindMap(s.getState());
  if (!reading) throw new Error(`no mind-map reading — notes: ${drawn.notes.join(' | ')}; refused: ${drawn.refused.map((r) => `${r.line}: ${r.reason}`).join(' | ')}`);
  const m = toMermaid(reading);
  if (!m) throw new Error('no Mermaid for a mind map');
  return { drawn, reading, text: m.text, mermaid: m };
}

/** Read every piece of writing on the board as a model that can see would, by what it is. */
function readAll(s: Session, e: MindMapExpected) {
  const pid = s.join('agent', 'llm:seeing', 900_000, 2);
  let at = 900_100;
  for (const [id, text] of Object.entries(e.words)) s.propose({ participantId: pid, nodeId: id, edges: [], reps: [{ modality: 'transcript', data: { text }, confidence: 0.9 }], at: at++ });
}

describe('out: the writer', () => {
  it('is registered by notation, with a reader by keyword', () => {
    expect(mermaidWriters()).toEqual(expect.arrayContaining(['flowchart', 'mindmap']));
    expect(mermaidReaders()).toEqual(expect.arrayContaining(['mindmap']));
  });

  it('maps each Mermaid id back to its node’s marks, and each link to its branch, the parent first', () => {
    const s = createSession();
    const e = drawMindMap(s, MINDMAP_VARIANTS[12]);
    const m = toMermaid(readMindMap(s.getState())!)!;
    expect(Object.keys(m.ids)).toEqual(['stroke_1', 'stroke_2', 'stroke_5', 'stroke_6', 'stroke_3', 'stroke_4', 'stroke_7']);
    expect(m.ids.stroke_1).toBe(e.nodes.Trip.box[0]);
    expect(m.marks.stroke_2).toEqual(e.nodes.Food.box);
    expect(m.links.map((l) => `${l.from}>${l.to}`)).toEqual(['stroke_1>stroke_2', 'stroke_2>stroke_5', 'stroke_2>stroke_6', 'stroke_1>stroke_3', 'stroke_1>stroke_4', 'stroke_4>stroke_7']);
    expect(m.links[0].id).toBe(e.branches[0].id);
    // Writing nobody has read is named, so a model that can see could be asked to read it.
    expect(m.unread).toHaveLength(7);
    expect(m.notes[0]).toMatch(/^seven pieces of writing have not been read/);
  });

  it('a tree is read round its centre clockwise from the top, and round any other node clockwise from the way it faces', () => {
    const at = { x: 0, y: 0 };
    const deg = (d: number) => (clockwiseFromTop(at, { x: Math.sin((d * Math.PI) / 180), y: -Math.cos((d * Math.PI) / 180) }) * 180) / Math.PI;
    for (const d of [0, 45, 90, 180, 270, 359]) expect(Math.round(deg(d)) % 360).toBe(d % 360);
  });

  it('words are raw text with Mermaid’s entities, each the exact inverse of unescapeMermaid — and a colon on a line with “style” is written whole', () => {
    const s = named('importer~t1');
    drawMermaid(s, MINDMAP_ESCAPED, { at: 1000 });
    const text = toMermaid(readMindMap(s.getState())!)!.text;
    expect(text).toMatch(/\(\("Say #quot;hi#quot; #amp; #lt;go#gt;"\)\)/);
    expect(text).toMatch(/\["style#58; two<br>lines"\]/);
    for (const w of ['item #3; then', '50% "done"', 'A & B <team>', '`code`', 'two\nlines']) expect(unescapeMermaid(mermaidString(w))).toBe(w);
  });

  it('says the same text whatever order the hands’ logs were merged in', () => {
    const one = named('ada~a1'), two = named('bo~b2');
    drawMindMap(one, MINDMAP_VARIANTS[0]);
    drawMindMap(two, MINDMAP_VARIANTS[3], 500_000);
    const merged = (me: string, order: [Session, string][]) => {
      const s = named(me);
      s.load(mergeLogs(Object.fromEntries(order.map(([x, n]) => [n, [...x.getEvents()]])), { me }));
      return toMermaid(readMindMap(s.getState())!)!.text;
    };
    const a = merged('ada~a1', [[one, 'ada~a1'], [two, 'bo~b2']]);
    const b = merged('bo~b2', [[two, 'bo~b2'], [one, 'ada~a1']]);
    expect(canonical(a)).toBe(canonical(b));
  });

  it('derived: exporting writes nothing into the log', () => {
    const s = createSession();
    drawMindMap(s, MINDMAP_VARIANTS[0]);
    const events = s.getEvents().length, nodes = s.getState().nodes.size;
    toMermaid(readMindMap(s.getState())!);
    expect(s.getEvents().length).toBe(events);
    expect(s.getState().nodes.size).toBe(nodes);
  });

  it('a node with no word is a blank, said', () => {
    const s = named('importer~t1');
    drawMermaid(s, ['mindmap', '    b1(("Hub"))', '        b2[" "]', '        b3["Leaf"]', '        b4["Other"]', ''].join('\n'), { at: 1000 });
    const m = toMermaid(readMindMap(s.getState())!)!;
    expect(m.notes.join(' ')).toMatch(/one node has no word in it/);
  });
});

describe('in: the round trip — a text drawn and read again comes back', () => {
  const texts: [string, string][] = [
    ['the board, before its writing is read', MINDMAP_MERMAID_UNREAD],
    ['the board, once it is read', MINDMAP_MERMAID_READ],
    ['a circle and boxes, three levels', MINDMAP_EVERY],
    ['a root with five branches', MINDMAP_WIDE],
    ['words that break Mermaid unwritten', MINDMAP_ESCAPED],
  ];
  for (const [name, text] of texts) {
    it(name, () => {
      const back = drawnBack(text);
      expect(said(back.text)).toEqual(said(text));
      expect(back.drawn.notes.filter((n) => /read back/.test(n))).toEqual([]);
      // Drawn from what it said, it says the same again.
      expect(canonical(drawnBack(back.text).text)).toBe(canonical(back.text));
    }, SLOW);
  }

  it('the writer’s own texts come back word for word, the ids the marks’ own', () => {
    for (const text of [MINDMAP_MERMAID_READ, MINDMAP_EVERY, MINDMAP_WIDE]) expect(canonical(drawnBack(text).text)).toBe(canonical(text));
  }, SLOW);

  it('each node is a circle or a box with its words on its own ink; every branch a line bound at both ends to the nodes it joins', () => {
    const s = named('importer~t1');
    const drawn = drawMermaid(s, MINDMAP_EVERY, { at: 1000 });
    const st = s.getState();
    const r = readMindMap(st)!;
    expect(Object.keys(drawn.ids)).toEqual(['a1', 'a2', 'a4', 'a5', 'a3', 'a6', 'a7']);
    expect(labelOf(st.nodes.get(drawn.ids.a1)!)?.text).toBe('Plan');
    expect(r.symbols.map((p) => p.shape).sort()).toEqual(['box', 'box', 'box', 'box', 'box', 'circle', 'circle']);
    expect(r.symbols.filter((p) => p.symbol === 'root')).toHaveLength(1);
    const links = drawn.links as unknown as { from: string; to: string; id: string; bound: [boolean, boolean]; route: string }[];
    expect(links).toHaveLength(6);
    for (const l of links) {
      expect(l.bound).toEqual([true, true]);
      expect(bindingsOf(st.nodes.get(l.id)!, st.nodes).map((x) => x.end).sort()).toEqual(['end', 'start']);
    }
    // Nothing derived enters the log: only strokes, binds and labels.
    expect([...new Set(s.getEvents().map((e) => e.type))].sort()).toEqual(['bind', 'label', 'stroke']);
    expect(s.getEvents().filter((e) => e.type === 'label').length).toBe(7);
  });

  it('a text a hand wrote comes back as the mind-map writer says it — an icon and a class refused with their lines, a second root and what is under it, and the shapes Mermaid takes read', () => {
    const read = readMermaid(MINDMAP_WRITTEN) as MindMapDiagramRead;
    expect(read.nodes.map((n) => `${'-'.repeat(n.depth)}${n.id}:${n.text}:${n.drawn}`)).toEqual([
      'root:mindmap:circle',
      '-Origins:Origins:box',
      '--Long history:Long history:box',
      '--Popularisation:Popularisation:box',
      '-Research:Research:box',
      '--On effectiveness and features:On effectiveness\nand features:box',
      '--On Automatic creation:On Automatic creation:box',
      '-Tools:Tools:box',
      '--id1:Pen and paper:box',
      '--id2:Mermaid:box',
    ]);
    expect(read.refused.map((r) => r.line)).toEqual([6, 10, 14, 15]);
    expect(read.refused[0].reason).toMatch(/icon/);
    expect(read.refused[1].reason).toMatch(/class/);
    expect(read.refused[2].reason).toMatch(/second root/);
    expect(read.refused[3].reason).toMatch(/inside a second root/);
    expect(read.notes.join(' ')).toMatch(/no shape is drawn as a box/);
    const back = drawnBack(MINDMAP_WRITTEN);
    expect(canonical(drawnBack(back.text).text)).toBe(canonical(back.text));
  }, SLOW);

  it('what it cannot read is refused with its line, never thrown', () => {
    const read = readMindMapText(['mindmap', '  Root', '    A', '  Another root', '    B', '    ::icon(x)', ''].join('\n'));
    expect(read.refused.map((r) => r.line)).toEqual([4, 5, 6]);
    expect(read.nodes.map((n) => n.id)).toEqual(['Root', 'A']);
    expect(readMermaid('mindmap').notation).toBe('mindmap');
    expect(drawMermaid(createSession(), 'mindmap\n', { at: 1 }).notes).toEqual(['nothing to draw: the text names no node']);
    expect(() => readMindMapText(null as unknown as string)).not.toThrow();
  });

  it('seeded random mind maps come back — at 1×, and in the hand’s space at 0.25× and 4×', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const text = randomMindMapText(seed);
      expect(said(drawnBack(text).text), `seed ${seed}\n${text}`).toEqual(said(text));
    }
    for (let seed = 41; seed <= 46; seed++) {
      const text = randomMindMapText(seed);
      for (const scale of [0.25, 4]) expect(said(drawnBack(text, named('importer~t1'), { scale }).text), `seed ${seed} at ${scale}×\n${text}`).toEqual(said(text));
    }
  }, SLOW);
});

describe('the other way: a hand’s drawing exported and drawn back reads as the same diagram', () => {
  for (const v of [...MINDMAP_VARIANTS.slice(0, 3), ...MINDMAP_VARIANTS.slice(12, 15), ...MINDMAP_VARIANTS.slice(24, 27)]) {
    it(`seed ${v.seed}, jitter ${v.jitter}, tilt ${v.tilt}`, () => {
      const hand = named('hand~a1');
      const e = drawMindMap(hand, v);
      readAll(hand, e);
      const text = toMermaid(readMindMap(hand.getState())!)!.text;
      expect(canonical(text)).toBe(canonical(MINDMAP_MERMAID_READ));
      const back = drawnBack(text);
      expect(said(back.text)).toEqual(said(text));
      expect(back.reading.connectors).toHaveLength(6);
      expect(back.drawn.notes.filter((n) => /read back/.test(n))).toEqual([]);
    }, SLOW);
  }

  it('the importing hand made every mark, and its words are labels on its own ink', () => {
    const s = named('importer~t1');
    drawMermaid(s, MINDMAP_MERMAID_READ, { at: 1000 });
    const st = s.getState();
    for (const id of st.contentIds) expect(getRep(st.nodes.get(id)!, 'stroke')).toBeDefined();
    expect(s.getEvents().filter((e) => e.type === 'label').length).toBe(7);
  });
});
