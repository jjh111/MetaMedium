// Mermaid in (V1-PLAN §3, §9 D3).
//
// The round trip is the test: a Mermaid text drawn with `drawMermaid` is real
// ink the engine reads exactly as a hand's, so the flowchart notation (D1)
// reads it and `toMermaid` (D2) says it again — and the text comes back, but
// for its ids, which are the marks' own on the way back. And the other way:
// a hand's drawing exported and drawn back reads as the same notation, with
// the same symbols and flows, in reading order.

import { describe, it, expect } from 'vitest';
import { createSession, DEFAULT_SESSION_CONFIG } from '../session/session';
import type { Session } from '../session/session';
import { authorOf, fingerprintOf, getRep, labelOf } from '../session/nodes';
import { bindingsOf, siteOf } from '../session/magnets';
import { HAND_RESOLUTION_PX } from '../recognition';
import { readFlowchart } from './flowchart';
import type { NotationReading } from './notation';
import { toMermaid, inReadingOrder, mermaidString } from './mermaid';
import { drawMermaid, readMermaid, registerMermaidReader, mermaidReaders, FLOWCHART_READER, MERMAID_TEXT_PX, MERMAID_MAX_NODES, MERMAID_MAX_LINKS } from './mermaid-in';
import type { DrawnMermaid, MermaidRead } from './mermaid-in';
import { FLOWCHART_MERMAID_UNREAD, FLOWCHART_MERMAID_READ, FLOWCHART_WORDS } from './fixtures/flowchart.mermaid';
import { MERMAID_LR, MERMAID_LABELS, MERMAID_LABELS_WRITTEN, MERMAID_CYCLE, MERMAID_EVERY_SHAPE, MERMAID_ESCAPED, randomFlowchartText } from './fixtures/flowchart.mermaid-in';
import { drawFlowchart, FLOWCHART_VARIANTS } from './fixtures/flowchart';
import { rng } from '../test/strokes';

const named = (logName: string) => createSession({ ...DEFAULT_SESSION_CONFIG, logName });

/**
 * A Mermaid text with its ids renamed n1, n2, … in the order they first
 * appear — the one normalisation the round trip allows, because the ids that
 * come back are the new marks' own.
 */
function canonical(text: string): string {
  const names = new Map<string, string>();
  const name = (id: string) => {
    if (!names.has(id)) names.set(id, `n${names.size + 1}`);
    return names.get(id)!;
  };
  return text
    .split('\n')
    .map((line) => {
      const node = /^(\s+)([A-Za-z][A-Za-z0-9_]*)([[({].*)$/.exec(line);
      if (node) return `${node[1]}${name(node[2])}${node[3]}`;
      const link = /^(\s+)([A-Za-z][A-Za-z0-9_]*) (-->|---|<-->)(\|"[^"]*"\|)? ([A-Za-z][A-Za-z0-9_]*)$/.exec(line);
      if (link) return `${link[1]}${name(link[2])} ${link[3]}${link[4] ?? ''} ${name(link[5])}`;
      return line;
    })
    .join('\n');
}

/** What the board reads after drawing a text: the flowchart, and the text it says. */
function drawnBack(text: string, s: Session = named('importer~t1')): { drawn: DrawnMermaid; reading: NotationReading; text: string } {
  const drawn = drawMermaid(s, text, { at: 1000 });
  const reading = readFlowchart(s.getState());
  if (!reading) throw new Error(`no flowchart reading — notes: ${drawn.notes.join(' | ')}; refused: ${drawn.refused.map((r) => `${r.line}: ${r.reason}`).join(' | ')}`);
  const m = toMermaid(reading);
  if (!m) throw new Error('no Mermaid for a flowchart');
  return { drawn, reading, text: m.text };
}

/** These draw and read dozens of boards through every registered notation: more than vitest's five seconds on a loaded machine. */
const SLOW = 120_000;

describe('the round trip: a text drawn and read again comes back', () => {
  const texts: [string, string][] = [
    ['D2’s golden, before the writing is read', FLOWCHART_MERMAID_UNREAD],
    ['D2’s golden, once it is read', FLOWCHART_MERMAID_READ],
    ['across (LR)', MERMAID_LR],
    ['labelled links, both ways', MERMAID_LABELS],
    ['a cycle', MERMAID_CYCLE],
    ['every shape, every link', MERMAID_EVERY_SHAPE],
    ['labels that break Mermaid unquoted', MERMAID_ESCAPED],
  ];
  for (const [name, text] of texts) {
    it(name, () => {
      const back = drawnBack(text);
      expect(canonical(back.text)).toBe(canonical(text));
      // Drawn from what it said, it says the same again.
      expect(canonical(drawnBack(back.text).text)).toBe(canonical(text));
    });
  }

  it('a text a hand wrote — graph TB, bare labels, -- label --> — comes back as D2 writes it', () => {
    expect(canonical(drawnBack(MERMAID_LABELS_WRITTEN).text)).toBe(canonical(MERMAID_LABELS));
  });

  it('every Mermaid id is drawn as one mark, and each link names the connector drawn for it', () => {
    const { drawn, reading } = drawnBack(MERMAID_EVERY_SHAPE);
    expect(Object.keys(drawn.ids)).toEqual(['s1', 't1', 'd1', 'p1', 'q1', 'e1', 'p2']);
    const symbolOf = new Map(reading.symbols.map((s) => [s.id, s.symbol]));
    expect(Object.values(drawn.ids).map((id) => symbolOf.get(id))).toEqual(['start', 'terminator', 'data', 'process', 'decision', 'end', 'process']);
    const flows = new Map(reading.connectors.map((c) => [c.id, c]));
    for (const l of drawn.links) {
      const c = flows.get(l.id);
      expect(c, `${l.from} ${l.drawn} ${l.to}`).toBeDefined();
      expect([c!.from, c!.to]).toEqual([drawn.ids[l.from], drawn.ids[l.to]]);
    }
  });
});

describe('the other way: a hand’s drawing exported and drawn back reads as the same notation', () => {
  /** Symbols in reading order, and flows between their places in it. */
  function shapeOf(r: NotationReading) {
    const across = false;
    const order = inReadingOrder(r.symbols, (s) => s.bounds, (s) => s.id, across);
    const place = new Map(order.map((s, i) => [s.id, i]));
    return {
      notation: r.notation,
      symbols: order.map((s) => s.symbol),
      flows: r.connectors.map((c) => `${place.get(c.from)} ${c.direction} ${place.get(c.to)}`).sort(),
    };
  }

  for (const v of FLOWCHART_VARIANTS) {
    it(`D1’s hand, seed ${v.seed}, jitter ${v.jitter}, tilt ${v.tilt}`, () => {
      const hand = named('hand~a1');
      drawFlowchart(hand, v);
      const first = readFlowchart(hand.getState())!;
      const text = toMermaid(first)!.text;
      const back = drawnBack(text);
      expect(back.reading.notation).toBe('flowchart');
      expect(shapeOf(back.reading)).toEqual(shapeOf(first));
      expect(canonical(back.text)).toBe(canonical(text));
    });
  }

  it('its writing read, the words come back on the same symbols and flows', () => {
    const hand = named('hand~a1');
    const e = drawFlowchart(hand, FLOWCHART_VARIANTS[0]);
    const pid = hand.join('agent', 'llm:seeing', 900_000, 2);
    e.labels.forEach((l, i) =>
      hand.propose({ participantId: pid, nodeId: l.id, edges: [], reps: [{ modality: 'transcript', data: { text: FLOWCHART_WORDS[l.of] }, confidence: 0.9 }], at: 900_100 + i })
    );
    const text = toMermaid(readFlowchart(hand.getState())!)!.text;
    expect(canonical(text)).toBe(canonical(FLOWCHART_MERMAID_READ));
    expect(canonical(drawnBack(text).text)).toBe(canonical(FLOWCHART_MERMAID_READ));
  });
});

// ===== Reading a text =====

const nodesOf = (r: MermaidRead) => r.nodes.map((n) => `${n.id}:${n.symbol}:${n.text}`);
const linksOf = (r: MermaidRead) => r.links.map((l) => `${l.from} ${l.head} ${l.to}${l.label !== undefined ? ` |${l.label}|` : ''}`);

describe('reading a text', () => {
  it('flowchart or graph, a direction or none, statements after the header and after a ;', () => {
    const r = readMermaid('graph TD;A-->B;B-->C');
    expect([r.keyword, r.notation, r.direction]).toEqual(['graph', 'flowchart', 'TD']);
    expect(linksOf(r)).toEqual(['A forward B', 'B forward C']);
    expect(r.nodes.map((n) => n.line)).toEqual([1, 1, 1]);
    for (const [head, dir] of [['flowchart TB', 'TD'], ['flowchart LR', 'LR'], ['graph RL', 'RL'], ['flowchart BT', 'BT'], ['flowchart', 'TD'], ['graph >', 'LR']] as const) {
      expect(readMermaid(`${head}\n  A --> B`).direction, head).toBe(dir);
    }
    expect(readMermaid('graph XY\n  A --> B').notes.join(' ')).toMatch(/no direction Mermaid knows \(“XY”\)/);
  });

  it('every shape the flowchart writes is its symbol; the rest are the nearest, and said', () => {
    const r = readMermaid('flowchart TD\n  a[p] --> b{d} --> c([t]) --> d[/i/] --> e((s)) --> f(((x)))\n  g(r) --> h[[s]] --> i[(c)] --> j{{h}} --> k>a] --> l[\\l\\] --> m[/t\\] --> n[\\t/]');
    expect(r.nodes.map((n) => `${n.id}${n.shape}:${n.symbol}`)).toEqual([
      'a[]:process', 'b{}:decision', 'c([]):terminator', 'd[//]:data', 'e(()):start', 'f((())):end',
      'g():process', 'h[[]]:process', 'i[()]:process', 'j{{}}:process', 'k>]:process', 'l[\\\\]:data', 'm[/\\]:process', 'n[\\/]:process',
    ]);
    expect(r.notes).toHaveLength(8);
    expect(r.notes.join(' ')).toMatch(/a box with round edges has no symbol of its own in a flowchart, so it is drawn as a process: g/);
  });

  it('links: heads at the end, at both, at neither; dotted, thick and o/x ends drawn plain and said', () => {
    const r = readMermaid('flowchart LR\n  a --> b\n  b --- c\n  c <--> d\n  d ---> e\n  e -.-> f\n  f ==> g\n  g --o h\n  h --x i\n  i o--o j\n  j -.- k');
    expect(linksOf(r)).toEqual(['a forward b', 'b none c', 'c both d', 'd forward e', 'e forward f', 'f forward g', 'g none h', 'h none i', 'i none j', 'j none k']);
    expect(r.notes.join(' ')).toMatch(/no dotted line: dotted links are drawn plain — e -\.-> f and j -\.- k/);
    expect(r.notes.join(' ')).toMatch(/no thick line: a thick link is drawn plain — f ==> g/);
    expect(r.notes.join(' ')).toMatch(/drawn with no head there — g --o h, h --x i and i o--o j/);
  });

  it('labels, both ways: -->|…| and -- … -->, quoted and bare, dotted and thick', () => {
    const r = readMermaid('flowchart TD\n  a -->|bare| b\n  b -->|"quoted | piped"| c\n  c -- inside --> d\n  d -- "inside: quoted" --- e\n  e -. dotted .-> f\n  f == thick ==> g\n  g ---|line| h');
    expect(linksOf(r)).toEqual(['a forward b |bare|', 'b forward c |quoted | piped|', 'c forward d |inside|', 'd none e |inside: quoted|', 'e forward f |dotted|', 'f forward g |thick|', 'g none h |line|']);
  });

  it('chains and & groups: every pair, in the order written', () => {
    const r = readMermaid('flowchart TD\n  a --> b --> c\n  a & b --> c & d');
    expect(linksOf(r)).toEqual(['a forward b', 'b forward c', 'a forward c', 'a forward d', 'b forward c', 'b forward d']);
    expect(r.links.map((l) => l.index)).toEqual([0, 1, 2, 3, 4, 5]);
  });

  it('a node with no shape is a process showing its id; the last shape given is the one shown', () => {
    const r = readMermaid('flowchart TD\n  a --> b\n  b{Which?}\n  1 --> 2');
    expect(nodesOf(r)).toEqual(['a:process:a', 'b:decision:Which?', '1:process:1', '2:process:2']);
  });

  it('words decoded exactly as D2 escapes them — every character that breaks Mermaid, and a line break', () => {
    const nasty = ['Say "hi"', 'a|b', '[x]', '{y}', '(z)', 'Is x > 0?', 'a < b & c', '#1 and #quot; as typed', '100%', '%%{init: {"theme":"dark"}}%%', '`code`', 'end', 'style: bold; #fff;', 'classDef x fill:#f9f;', 'two\nlines', 'semi; colon: done', 'café → ok'];
    for (const w of nasty) {
      const r = readMermaid(`flowchart TD\n    n1[${mermaidString(w, { colons: /style|classDef/.test(w) })}] -->|${mermaidString(w)}| n2`);
      expect(r.refused, w).toEqual([]);
      expect(r.nodes[0].text, w).toBe(w);
      expect(r.links[0].label, w).toBe(w);
    }
    // Bare words: entities and <br> decoded, runs of space as one.
    expect(readMermaid('flowchart TD\n  a[Hello   #35;1<br>there] --> b').nodes[0].text).toBe('Hello #1\nthere');
  });

  it('comments are passed over; a class is said; a markdown string’s words are kept', () => {
    const r = readMermaid('flowchart TD\n  %% a comment\n  a:::big --> b["`**bold** words`"]');
    expect(nodesOf(r)).toEqual(['a:process:a', 'b:process:**bold** words']);
    expect(r.refused).toEqual([]);
    expect(r.notes.join(' ')).toMatch(/a class \(:::…\) is styling/);
    expect(r.notes.join(' ')).toMatch(/markdown string/);
  });
});

describe('what is not read is refused, with its line — never thrown', () => {
  it('styles, a subgraph’s frame, interactions, a flow to itself, and lines it cannot parse; the rest read', () => {
    const text = [
      'flowchart TD', // 1
      '  A --> B', // 2
      '  classDef big fill:#f9f', // 3
      '  style A fill:#f9f', // 4
      '  linkStyle 0 stroke:red', // 5
      '  click A callback', // 6
      '  subgraph one [One]', // 7
      '    direction LR', // 8
      '    C --> D', // 9
      '  end', // 10
      '  A --> A', // 11
      '  A -> B', // 12
      '  B -->', // 13
      '  E[unclosed', // 14
      '  F["unclosed quote]', // 15
      '  G@{ shape: rect }', // 16
      '  H ~~~ I', // 17
      '  accTitle: A title', // 18
      '  J --> K', // 19
    ].join('\n');
    const r = readMermaid(text);
    expect(linksOf(r)).toEqual(['A forward B', 'C forward D', 'J forward K']);
    expect(r.refused.map((x) => x.line)).toEqual([3, 4, 5, 6, 7, 8, 10, 11, 12, 13, 14, 15, 16, 17, 18]);
    const why = Object.fromEntries(r.refused.map((x) => [x.line, x.reason]));
    expect(why[3]).toMatch(/styling/);
    expect(why[7]).toMatch(/subgraph’s frame is not drawn yet — the nodes and links inside it are/);
    expect(why[11]).toMatch(/a flow from A to itself/);
    expect(why[12]).toMatch(/expected a link/);
    expect(why[13]).toMatch(/leads nowhere/);
    expect(why[14]).toMatch(/never closed/);
    expect(why[15]).toMatch(/quotes are never closed/);
    expect(why[16]).toMatch(/@\{ shape/);
    expect(why[17]).toMatch(/invisible link/);
    expect(r.refused.find((x) => x.line === 12)!.text).toBe('A -> B');
  });

  it('a directive and front matter configure mermaid.js, and are said', () => {
    const r = readMermaid('%%{init: {"theme":"dark"}}%%\n---\ntitle: x\n---\nflowchart TD\n  A --> B');
    expect(linksOf(r)).toEqual(['A forward B']);
    expect(r.refused.map((x) => `${x.line} ${x.text}`)).toEqual(['1 %%{init: {"theme":"dark"}}%%', '2 ---']);
    expect(r.refused[1].reason).toMatch(/front matter \(lines 2–4\)/);
  });

  it('a diagram no reader knows is refused whole, at its header — and nothing is drawn', () => {
    const s = createSession();
    const d = drawMermaid(s, '\n\nsequenceDiagram\n  A->>B: hi', { at: 1000 });
    expect(d.notation).toBeNull();
    expect(d.refused).toEqual([{ line: 3, text: 'sequenceDiagram', reason: expect.stringMatching(/no reader for “sequenceDiagram” yet — the board reads “flowchart”, “graph” and “flowchart-elk”/) }]);
    expect(s.getEvents()).toEqual([]);
    expect(d.lastAt).toBe(999);
    expect(readMermaid('').refused[0].reason).toMatch(/nothing to read/);
    expect(readMermaid('A --> B').refused[0].reason).toMatch(/no reader for “A”/);
  });

  it('never throws, whatever the text', () => {
    const r = rng(5);
    const bits = ['flowchart TD', 'graph', '-->', '---', '<-->', '-.->', '==>', '|', '"', '[', ']', '(', ')', '{', '}', '((', '))', 'A', 'B', ' ', '\n', ';', '&', ':::', '%%', '#quot;', '<br>', '-- x', 'subgraph', 'end', '@{', '~~~', 'o', 'x'];
    for (let k = 0; k < 300; k++) {
      const text = Array.from({ length: 5 + Math.floor(r() * 40) }, () => bits[Math.floor(r() * bits.length)]).join(r() < 0.5 ? '' : ' ');
      expect(() => readMermaid(text), text).not.toThrow();
      expect(() => drawMermaid(createSession(), text, { at: 1000 }), text).not.toThrow();
    }
  });
});

// ===== Drawing =====

describe('the trap: every symbol, at every size and zoom, reads as itself', () => {
  const SHAPES: [string, string, string][] = [['process', '[', ']'], ['decision', '{', '}'], ['terminator', '([', '])'], ['data', '[/', '/]'], ['start', '((', '))'], ['end', '(((', ')))']];
  const WORDS = ['', 'x', 'Read the order', 'a much longer label that runs on and on', 'x'.repeat(80), 'one\ntwo', 'one\ntwo\nthree\nfour'];
  for (const scale of [0.25, 1, 4]) {
    it(`at ${scale}× — read through D1, each above the hand’s resolution, and no letters gathered into a word`, () => {
      for (const [symbol, open, close] of SHAPES) {
        for (const w of WORDS) {
          const x = `x${open}${mermaidString(w)}${close}`;
          const text = symbol === 'end' ? `flowchart TD\n    p1["Before"]\n    ${x}\n    p1 --> x\n` : `flowchart TD\n    ${x}\n    p1["After"]\n    x --> p1\n`;
          const s = createSession();
          const d = drawMermaid(s, text, { at: 1000, scale });
          const st = s.getState();
          const r = readFlowchart(st);
          const what = `${symbol} “${w}” at ${scale}×`;
          expect(r?.symbols.find((y) => y.id === d.ids.x)?.symbol, what).toBe(symbol);
          expect(r!.connectors.map((c) => c.direction), what).toEqual(['forward']);
          for (const id of st.contentIds) {
            const fp = fingerprintOf(st.nodes.get(id)!)!;
            expect(fp.size / scale, `${what}: ${id}`).toBeGreaterThan(HAND_RESOLUTION_PX);
          }
          expect([...st.nodes.keys()].filter((k) => k.startsWith('word')), what).toEqual([]);
          const size = fingerprintOf(st.nodes.get(d.ids.x)!)!.size / scale;
          if (symbol === 'start' || symbol === 'end') expect(size, what).toBeLessThan(4 * MERMAID_TEXT_PX);
          else expect(size, what).toBeGreaterThanOrEqual(8 * MERMAID_TEXT_PX - 1e-6);
        }
      }
    });
  }
});

describe('drawn as a hand draws', () => {
  it('only strokes, binds and labels enter the log: every mark declared content, the importing hand’s, and every word on its own ink', () => {
    const s = named('importer~t1');
    const d = drawMermaid(s, MERMAID_EVERY_SHAPE, { at: 1000 });
    const events = s.getEvents();
    expect(new Set(events.map((e) => e.type))).toEqual(new Set(['stroke', 'bind', 'label']));
    for (const e of events) if (e.type === 'stroke') expect(e.content).toBe(true);
    expect(events.map((e) => e.at)).toEqual(events.map((_, i) => 1000 + i));
    expect(d.lastAt).toBe(1000 + events.length - 1);
    const st = s.getState();
    expect(st.staleResult ?? null).toBeNull();
    for (const id of [...Object.values(d.ids), ...d.links.flatMap((l) => l.ids)]) {
      expect(authorOf(st.nodes.get(id)!), id).toBe(authorOf(st.nodes.get(d.ids.s1)!));
      expect(s.isMine(id), id).toBe(true);
    }
    expect(Object.fromEntries(Object.entries(d.ids).map(([m, id]) => [m, labelOf(st.nodes.get(id)!)?.text]))).toEqual({ s1: 'go', t1: 'Begin', d1: 'Read the input', p1: 'Work on it', q1: 'Done?', e1: 'stop', p2: 'Log it' });
    expect(d.links.map((l) => labelOf(st.nodes.get(l.id)!)?.text)).toEqual([undefined, undefined, undefined, undefined, 'yes', 'no', undefined]);
  });

  it('every connector bound at both ends, to the marks it joins, at sites those marks offer themselves — found again where it was drawn', () => {
    for (const text of [MERMAID_EVERY_SHAPE, MERMAID_LR, MERMAID_CYCLE, FLOWCHART_MERMAID_UNREAD]) {
      const s = createSession();
      const d = drawMermaid(s, text, { at: 1000 });
      const st = s.getState();
      for (const l of d.links) {
        const node = st.nodes.get(l.id)!;
        const bound = bindingsOf(node, st.nodes).map((b) => `${b.end} ${b.nodeId} ${b.site.kind} ${b.site.index}`).sort();
        expect(bound).toEqual([`end ${d.ids[l.to]} ${l.end.site.kind} ${l.end.site.index}`, `start ${d.ids[l.from]} ${l.start.site.kind} ${l.start.site.index}`]);
        for (const e of [l.start, l.end]) {
          expect(e.of).toBe('mark');
          const site = siteOf(st.nodes.get(e.nodeId)!, st.nodes, e.site)!;
          expect(Math.hypot(site.point.x - e.point.x, site.point.y - e.point.y)).toBeLessThan(1e-6);
        }
        const pts = getRep(node, 'stroke')!.data as { points: { x: number; y: number }[] };
        expect(pts.points[0]).toEqual(l.start.point);
      }
    }
  });

  it('a model can draw it too: every mark, bind and word is the model’s', () => {
    const s = createSession();
    const model = s.join('agent', 'llm:drawer', 500, 2);
    const d = drawMermaid(s, MERMAID_CYCLE, { at: 1000, participantId: model });
    const st = s.getState();
    for (const id of [...Object.values(d.ids), ...d.links.map((l) => l.id)]) expect(authorOf(st.nodes.get(id)!)).toBe(model);
    expect(labelOf(st.nodes.get(d.ids.q1)!)?.text).toBe('Does it read?');
    expect(canonical(toMermaid(readFlowchart(st)!)!.text)).toBe(canonical(MERMAID_CYCLE));
  });

  it('state is the log’s: replayed on another board, it reads the same text', () => {
    const s = named('importer~t1');
    drawMermaid(s, MERMAID_LABELS, { at: 1000 });
    const again = named('reader~t2');
    again.load(s.getEvents());
    expect(toMermaid(readFlowchart(again.getState())!)!.text).toBe(toMermaid(readFlowchart(s.getState())!)!.text);
  });

  it('one act when the caller wraps it: one undo takes the whole diagram back', () => {
    const s = createSession();
    s.withTool('mermaid', () => drawMermaid(s, MERMAID_LR, { at: 1000 }));
    const acts = new Set(s.getEvents().map((e) => e.act));
    expect(acts.size).toBe(1);
    expect([...acts][0]).toBeDefined();
    s.undo();
    expect(s.getEvents()).toEqual([]);
    expect(s.getState().contentIds).toEqual([]);
    // Unwrapped, each event is an act of its own: undo takes back the last.
    const t = createSession();
    drawMermaid(t, MERMAID_LR, { at: 1000 });
    const n = t.getEvents().length;
    t.undo();
    expect(t.getEvents()).toHaveLength(n - 1);
  });
});

describe('where it stands', () => {
  it('beside everything on the board, unless told where', () => {
    const s = createSession();
    const first = drawMermaid(s, MERMAID_CYCLE, { at: 1000 });
    expect([first.bounds!.minX, first.bounds!.minY]).toEqual([0, 0]);
    const second = drawMermaid(s, MERMAID_LR, { at: 5000 });
    expect(second.bounds!.minX).toBeGreaterThan(first.bounds!.maxX);
    expect(second.bounds!.minY).toBe(first.bounds!.minY);
    const third = drawMermaid(s, MERMAID_CYCLE, { at: 9000, origin: { x: -500, y: 2000 } });
    expect([third.bounds!.minX, third.bounds!.minY]).toEqual([-500, 2000]);
    // Three diagrams, each reading as itself.
    expect(readFlowchart(s.getState(), [...Object.values(second.ids), ...second.links.flatMap((l) => l.ids)])!.connectors).toHaveLength(6);
  });
});

describe('the caps, and what is said beyond them', () => {
  it(`at most ${MERMAID_MAX_NODES} nodes and ${MERMAID_MAX_LINKS} links, the rest said`, () => {
    const chain = ['flowchart TD', ...Array.from({ length: 69 }, (_, i) => `  n${i}[Step ${i}] --> n${i + 1}[Step ${i + 1}]`)].join('\n');
    const d = drawMermaid(createSession(), chain, { at: 1000 });
    expect(Object.keys(d.ids)).toHaveLength(MERMAID_MAX_NODES);
    expect(d.links).toHaveLength(MERMAID_MAX_NODES - 1);
    expect(d.notes.join(' ')).toMatch(/the text holds 70 nodes and the board draws 60 at most: the first 60 are drawn, and the 10 after them and the 10 links that touch them are not/);
    const many = ['flowchart LR', ...Array.from({ length: 130 }, (_, i) => `  a${i % 10} --> b${Math.floor(i / 10)}`)].join('\n');
    const e = drawMermaid(createSession(), many, { at: 1000 });
    expect(e.links).toHaveLength(MERMAID_MAX_LINKS);
    expect(e.notes.join(' ')).toMatch(/the text holds 130 links among the nodes drawn and the board draws 120 at most: the 10 after the first 120 are not drawn/);
}, SLOW);
});

describe('what will not read back as written is said', () => {
  it('a circle joined to nothing; a chart of circles; a chart with no flow; RL; the placeholder', () => {
    expect(drawMermaid(createSession(), 'flowchart TD\n  a[A] --> b[B]\n  c((alone))', { at: 1 }).notes.join(' ')).toMatch(/c is joined to nothing/);
    expect(drawMermaid(createSession(), 'flowchart TD\n  a((go)) --> b(((stop)))', { at: 1 }).notes.join(' ')).toMatch(/no process, decision, terminator or data symbol/);
    expect(drawMermaid(createSession(), 'flowchart TD\n  a[A]\n  b[B]', { at: 1 }).notes.join(' ')).toMatch(/has no flow/);
    expect(drawMermaid(createSession(), 'flowchart RL\n  a[A] --> b[B]', { at: 1 }).notes.join(' ')).toMatch(/right to left/);
    expect(drawMermaid(createSession(), 'flowchart TD\n  a((x)) --> b[B] --> a', { at: 1 }).notes.join(' ')).toMatch(/a flow arrives at the start a/);
    expect(drawMermaid(createSession(), FLOWCHART_MERMAID_UNREAD, { at: 1 }).notes.join(' ')).toMatch(/“\(unread writing\)” is what D2 writes for writing nobody has read/);
    expect(drawMermaid(createSession(), MERMAID_CYCLE, { at: 1 }).notes.join(' ')).toMatch(/the flow p3 → p1 closes a cycle \(p1 → q1 → p3 → p1\)/);
  });

  it('a text drawn RL says LR when read back, and every symbol and flow is still there', () => {
    const back = drawnBack('flowchart RL\n  a[A] --> b{B} --> c[C]');
    expect(back.text.split('\n')[0]).toBe('flowchart LR');
    expect(back.reading.counts).toMatchObject({ process: 2, decision: 1, flow: 2 });
  });
});

describe('random charts, written as D2 writes them, come back', () => {
  it('sixty, seeded — every shape, -->, --- and <-->, cycles, labels with every escape, TD and LR', () => {
    for (let seed = 1; seed <= 60; seed++) {
      const text = randomFlowchartText(seed);
      expect(canonical(drawnBack(text).text), `seed ${seed}\n${text}`).toBe(canonical(text));
    }
  }, SLOW);

  it('at a quarter and at four times the zoom', () => {
    for (let seed = 101; seed <= 115; seed++) {
      const text = randomFlowchartText(seed);
      for (const scale of [0.25, 4]) {
        const s = createSession();
        drawMermaid(s, text, { at: 1000, scale });
        expect(canonical(toMermaid(readFlowchart(s.getState())!)!.text), `seed ${seed} at ${scale}×`).toBe(canonical(text));
      }
    }
  });

  it('long connectors keep their heads: a fan of fourteen, its outer arrows over a thousand pixels', () => {
    const text = ['flowchart TD', '    p0["Hub"]', ...Array.from({ length: 14 }, (_, i) => `    k${i}["Leaf ${i}"]`), ...Array.from({ length: 14 }, (_, i) => `    p0 --> k${i}`)].join('\n') + '\n';
    const back = drawnBack(text);
    expect(canonical(back.text)).toBe(canonical(text));
    const longest = Math.max(...back.drawn.links.map((l) => Math.hypot(l.end.point.x - l.start.point.x, l.end.point.y - l.start.point.y)));
    expect(longest).toBeGreaterThan(1000);
  });
});

describe('the reader registry', () => {
  it('dispatch by the diagram keyword; a reader registered is used, and taken back', () => {
    expect(mermaidReaders()).toEqual(['flowchart', 'graph', 'flowchart-elk']);
    const seen: string[] = [];
    const off = registerMermaidReader('stateDiagram-v2', {
      notation: 'state',
      read: (text) => (seen.push(text), { ...FLOWCHART_READER.read('flowchart TD\n  a --> b'), keyword: 'stateDiagram-v2', notation: 'state' }),
      draw: (_session, read, opts) => ({ notation: read.notation, ids: {}, links: [], notes: ['drawn by the test'], refused: [], bounds: null, lastAt: opts.at - 1 }),
    });
    expect(readMermaid('stateDiagram-v2\n  [*] --> A').notation).toBe('state');
    expect(drawMermaid(createSession(), 'stateDiagram-v2\n  [*] --> A', { at: 1 }).notes).toEqual(['drawn by the test']);
    expect(seen).toHaveLength(2);
    off();
    expect(readMermaid('stateDiagram-v2\n  [*] --> A').notation).toBeNull();
    expect(mermaidReaders()).toEqual(['flowchart', 'graph', 'flowchart-elk']);
  });
});
