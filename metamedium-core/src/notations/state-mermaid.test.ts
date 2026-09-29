// The state diagram in Mermaid, both ways (V1-PLAN §3, §9 D5's state half; D2
// and D3's rules for `stateDiagram-v2`).
//
// Out: a reading said as the text the state writer writes — the goldens are by
// hand (fixtures/state.mermaid.ts); here, the rules under them: words escaped
// so Mermaid reads them as written, the initial dot and the final ring both
// [*], states in reading order whatever order the log was merged in, nothing
// in the log.
//
// In: the round trip is the test. A stateDiagram text drawn with `drawMermaid`
// is ink the notation reads as a hand's, and `toMermaid` says the text again —
// but for its ids, the marks' own on the way back.

import { describe, it, expect } from 'vitest';
import { createSession, DEFAULT_SESSION_CONFIG } from '../session/session';
import type { Session } from '../session/session';
import { getRep, isWord, labelOf } from '../session/nodes';
import { bindingsOf } from '../session/magnets';
import { mergeLogs } from '../store/merge';
import { toMermaid, unescapeMermaid, mermaidWriters } from './mermaid';
import { drawMermaid, readMermaid, mermaidReaders } from './mermaid-in';
import { readState } from './state';
import { readStateText, stateText, INITIAL_ID, FINAL_ID } from './state-mermaid';
import type { StateDiagramRead } from './state-mermaid';
import { drawState, STATE_VARIANTS, STATE_WORDS } from './fixtures/state';
import type { StateExpected } from './fixtures/state';
import { STATE_MERMAID_READ, STATE_MERMAID_UNREAD } from './fixtures/state.mermaid';
import { STATE_BARE, STATE_ESCAPED, STATE_EVERY, STATE_LR, STATE_WRITTEN, randomStateText } from './fixtures/state.mermaid-in';

/** Each of these draws and reads whole boards: more than vitest's five seconds on a loaded machine. */
const SLOW = 120_000;

const named = (logName: string) => createSession({ ...DEFAULT_SESSION_CONFIG, logName });

/** A stateDiagram text with its ids renamed n1, n2, … in the order they first appear — the one normalisation the round trip allows. */
function canonical(text: string): string {
  const names = new Map<string, string>();
  const name = (id: string) => {
    if (id === '[*]') return id;
    if (!names.has(id)) names.set(id, `n${names.size + 1}`);
    return names.get(id)!;
  };
  return text
    .split('\n')
    .map((line) => {
      const d = /^(\s+state ".*" as )(\S+)$/.exec(line);
      if (d) return `${d[1]}${name(d[2])}`;
      const m = /^(\s+)(\S+) --> (\S+)((?:: .*)?)$/.exec(line);
      if (m) return `${m[1]}${name(m[2])} --> ${name(m[3])}${m[4]}`;
      return line;
    })
    .join('\n');
}

/** A text drawn, read, and said again. */
function drawnBack(text: string, s: Session = named('importer~t1'), opts: { scale?: number } = {}) {
  const drawn = drawMermaid(s, text, { at: 1000, ...opts });
  const reading = readState(s.getState());
  if (!reading) throw new Error(`no state reading — notes: ${drawn.notes.join(' | ')}; refused: ${drawn.refused.map((r) => `${r.line}: ${r.reason}`).join(' | ')}`);
  const m = toMermaid(reading);
  if (!m) throw new Error('no Mermaid for a state diagram');
  return { drawn, reading, text: m.text, mermaid: m };
}

/** Read every piece of writing on the board as a model that can see would, by what it is. */
function readAll(s: Session, e: StateExpected) {
  const pid = s.join('agent', 'llm:seeing', 900_000, 2);
  let at = 900_100;
  const read = (id: string, text: string) => s.propose({ participantId: pid, nodeId: id, edges: [], reps: [{ modality: 'transcript', data: { text }, confidence: 0.9 }], at: at++ });
  for (const [name, st] of Object.entries(e.states)) st.name.forEach((id) => read(id, STATE_WORDS.names[name as keyof typeof STATE_WORDS.names]));
  e.transitions.filter((t) => t.label.length).forEach((t, i) => t.label.forEach((id) => read(id, STATE_WORDS.transitions[i])));
}

describe('out: the writer', () => {
  it('is registered by notation, with a reader by keyword', () => {
    expect(mermaidWriters()).toEqual(expect.arrayContaining(['flowchart', 'state']));
    expect(mermaidReaders()).toEqual(expect.arrayContaining(['stateDiagram', 'stateDiagram-v2']));
  });

  it('every hand of the board exports one text, before its writing is read and after', () => {
    for (const v of STATE_VARIANTS) {
      const s = createSession();
      const e = drawState(s, v);
      expect(toMermaid(readState(s.getState())!)!.text, `seed ${v.seed}`).toBe(STATE_MERMAID_UNREAD);
      readAll(s, e);
      expect(toMermaid(readState(s.getState())!)!.text, `read, seed ${v.seed}`).toBe(STATE_MERMAID_READ);
    }
  }, SLOW);

  it('maps each Mermaid id back to its state’s marks, and each link to its transition — the initial and the final are not states and have no id', () => {
    const s = createSession();
    const e = drawState(s, STATE_VARIANTS[12]);
    const m = toMermaid(readState(s.getState())!)!;
    expect(m.ids).toEqual({ stroke_1: e.states.Idle.box[0], stroke_2: e.states.Running.box[0], stroke_3: e.states.Paused.box[0] });
    expect(m.marks.stroke_2).toEqual(e.states.Running.box);
    expect(m.links.map((l) => `${l.from}>${l.to}`)).toEqual(['[*]>stroke_1', 'stroke_1>stroke_2', 'stroke_2>stroke_2', 'stroke_2>stroke_3', 'stroke_2>[*]', 'stroke_3>stroke_1']);
    expect(m.links[4].id).toBe(e.transitions.find((t) => t.name === 'stop')!.id);
    expect(m.direction?.value).toBe('LR');
    // Writing nobody has read is named, so a model that can see could be asked to read it.
    expect(m.unread).toHaveLength(8);
    expect(m.notes[0]).toMatch(/^eight pieces of writing have not been read/);
  });

  it('words are raw text with Mermaid’s entities — a hash, a semicolon, markup, quotes — each the exact inverse of unescapeMermaid', () => {
    expect(stateText('item #3; then')).toBe('item #35;3#59; then');
    expect(stateText('A & B <team> "x"')).toBe('A #amp; B #lt;team#gt; #quot;x#quot;');
    expect(stateText('two\nlines')).toBe('two<br>lines');
    expect(stateText('')).toBe('#32;');
    expect(stateText('style: a', { colons: true })).toBe('style#58; a');
    for (const w of ['item #3; then', '50% "done"', 'A & B <team>', '`code`', 'two\nlines', ' spaced ']) expect(unescapeMermaid(stateText(w))).toBe(w);
  });

  it('says the same text whatever order the hands’ logs were merged in', () => {
    const one = named('ada~a1'), two = named('bo~b2');
    drawState(one, STATE_VARIANTS[0]);
    drawState(two, STATE_VARIANTS[3], 500_000);
    const merged = (me: string, order: [Session, string][]) => {
      const s = named(me);
      s.load(mergeLogs(Object.fromEntries(order.map(([x, n]) => [n, [...x.getEvents()]])), { me }));
      return toMermaid(readState(s.getState())!)!.text;
    };
    const a = merged('ada~a1', [[one, 'ada~a1'], [two, 'bo~b2']]);
    const b = merged('bo~b2', [[two, 'bo~b2'], [one, 'ada~a1']]);
    expect(canonical(a)).toBe(canonical(b));
  });

  it('derived: exporting writes nothing into the log', () => {
    const s = createSession();
    drawState(s, STATE_VARIANTS[0]);
    const events = s.getEvents().length, nodes = s.getState().nodes.size;
    toMermaid(readState(s.getState())!);
    expect(s.getEvents().length).toBe(events);
    expect(s.getState().nodes.size).toBe(nodes);
  });

  it('says what Mermaid cannot: several initial dots are one [*], and a transition into an initial dot reads the other way there', () => {
    const s = named('importer~t1');
    drawMermaid(s, STATE_BARE, { at: 1000 });
    const one = toMermaid(readState(s.getState())!)!;
    expect(one.notes.filter((n) => /\[\*\]/.test(n))).toEqual([]);
    const two = named('importer~t2');
    drawMermaid(two, STATE_BARE, { at: 1000 });
    drawMermaid(two, STATE_BARE, { at: 100_000, origin: { x: 2000, y: 0 } });
    const both = toMermaid(readState(two.getState())!)!;
    expect(both.notes.join(' ')).toMatch(/two initial dots are one \[\*\]/);
    expect(both.notes.join(' ')).toMatch(/two final rings are one \[\*\]/);
  });
});

describe('in: the round trip — a text drawn and read again comes back', () => {
  const texts: [string, string][] = [
    ['the board, before its writing is read', STATE_MERMAID_UNREAD],
    ['the board, once it is read', STATE_MERMAID_READ],
    ['every kind of thing, running down the page', STATE_EVERY],
    ['running across the page, and a loop on two states', STATE_LR],
    ['words that break Mermaid unwritten', STATE_ESCAPED],
    ['transitions with no writing', STATE_BARE],
  ];
  for (const [name, text] of texts) {
    it(name, () => {
      const back = drawnBack(text);
      expect(canonical(back.text)).toBe(canonical(text));
      expect(back.drawn.notes.filter((n) => /read back/.test(n))).toEqual([]);
      // Drawn from what it said, it says the same again.
      expect(canonical(drawnBack(back.text).text)).toBe(canonical(text));
    }, SLOW);
  }

  it('each state is a rounded box with its name on its own ink; the initial a dot and the final a ring; every transition bound at both ends to what it joins, and every loop too', () => {
    const s = named('importer~t1');
    const drawn = drawMermaid(s, STATE_EVERY, { at: 1000 });
    const st = s.getState();
    const r = readState(st)!;
    expect(Object.keys(drawn.ids)).toEqual([INITIAL_ID, 'a1', 'a2', 'a3', 'a4', FINAL_ID]);
    expect(labelOf(st.nodes.get(drawn.ids.a1)!)?.text).toBe('Idle');
    expect(r.symbols.map((p) => p.symbol).sort()).toEqual(['final', 'initial', 'state', 'state', 'state', 'state']);
    const links = drawn.links as unknown as { from: string; to: string; id: string; bound: [boolean, boolean]; route: string; start: { site: { kind: string } }; end: { site: { kind: string } } }[];
    for (const l of links) {
      expect(l.bound).toEqual([true, true]);
      const b = bindingsOf(st.nodes.get(l.id)!, st.nodes);
      expect(b.map((x) => x.end).sort()).toEqual(['end', 'start']);
    }
    expect(links.filter((x) => x.route === 'loop')).toHaveLength(1);
    // Nothing derived enters the log: only strokes, binds and labels.
    expect([...new Set(s.getEvents().map((e) => e.type))].sort()).toEqual(['bind', 'label', 'stroke']);
  });

  it('a text a hand wrote comes back as the state writer says it — a composite’s frame, a choice and a note refused with their lines, the states inside read', () => {
    const back = drawnBack(STATE_WRITTEN);
    const again = drawnBack(back.text);
    expect(canonical(again.text)).toBe(canonical(back.text));
    const read = readMermaid(STATE_WRITTEN) as StateDiagramRead;
    expect(read.nodes.map((n) => `${n.symbol}:${n.id}:${n.text}`)).toEqual([
      'initial:[*]:',
      'state:Still:Still',
      'state:Moving:on the road',
      'state:Crash:Crash',
      'state:Wreck:Wreck',
      'state:Tow:Tow',
      'state:Fork:Fork',
      'final:[*]:end:',
    ]);
    expect(read.links.map((l) => `${l.from}>${l.to}`)).toEqual(['[*]>Still', 'Still>[*]:end', 'Still>Moving', 'Moving>Still', 'Moving>Crash', 'Crash>[*]:end', 'Wreck>Tow']);
    // The composite's frame, the choice and the note; the composite's close and its state are read.
    expect(read.refused.map((r) => r.line)).toEqual([10, 13, 14]);
    expect(read.refused[0].reason).toMatch(/composite state’s frame/);
    expect(read.refused[1].reason).toMatch(/choice/);
  }, SLOW);

  it('what it cannot read is refused with its line, never thrown', () => {
    const read = readStateText(['stateDiagram-v2', '    [*] --> [*]', '    A --> B --> C', '    two words --> B', '    }', '    state "x y" as', '    A --> B', ''].join('\n'));
    // The start straight to the end, a chain of arrows, a name of two words, a stray close and a state with no id.
    expect(read.refused.map((r) => r.line)).toEqual([2, 3, 4, 5, 6]);
    expect(read.links.map((l) => `${l.from}${l.written}${l.to}`)).toEqual(['A-->B']);
    expect(readMermaid('stateDiagram-v2').notation).toBe('state');
    expect(drawMermaid(createSession(), 'stateDiagram-v2\n', { at: 1 }).notes).toEqual(['nothing to draw: the text names no state']);
    expect(() => readStateText(null as unknown as string)).not.toThrow();
  });

  it('seeded random state diagrams come back — at 1×, and in the hand’s space at 0.25× and 4×', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const text = randomStateText(seed);
      expect(canonical(drawnBack(text).text), `seed ${seed}\n${text}`).toBe(canonical(text));
    }
    for (let seed = 41; seed <= 50; seed++) {
      const text = randomStateText(seed);
      for (const scale of [0.25, 4]) expect(canonical(drawnBack(text, named('importer~t1'), { scale }).text), `seed ${seed} at ${scale}×\n${text}`).toBe(canonical(text));
    }
  }, SLOW);
});

describe('the other way: a hand’s drawing exported and drawn back reads as the same diagram', () => {
  for (const v of [...STATE_VARIANTS.slice(0, 4), ...STATE_VARIANTS.slice(12, 16), ...STATE_VARIANTS.slice(24, 28)]) {
    it(`seed ${v.seed}, jitter ${v.jitter}, tilt ${v.tilt}, dot ${v.dot}, final ${v.final}`, () => {
      const hand = named('hand~a1');
      const e = drawState(hand, v);
      readAll(hand, e);
      const text = toMermaid(readState(hand.getState())!)!.text;
      const back = drawnBack(text);
      expect(canonical(back.text)).toBe(canonical(text));
      expect(back.reading.connectors.filter((k) => k.self)).toHaveLength(1);
    }, SLOW);
  }

  it('the importing hand made every mark, and its words are labels on its own ink', () => {
    const s = named('importer~t1');
    drawMermaid(s, STATE_MERMAID_READ, { at: 1000 });
    const st = s.getState();
    // Every mark is a stroke — or, where the ring and the dot in it were quick enough for the letter rules, the word they were gathered into.
    for (const id of st.contentIds) expect(getRep(st.nodes.get(id)!, 'stroke') ?? (isWord(st.nodes.get(id)!) ? true : undefined)).toBeDefined();
    expect(s.getEvents().filter((e) => e.type === 'label').length).toBe(3 + 5);
  });
});
