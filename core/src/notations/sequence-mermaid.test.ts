// The sequence diagram in Mermaid, both ways (V1-PLAN §3, §9 D5; D2 and D3's
// rules for `sequenceDiagram`).
//
// Out: a reading said as the text D5's writer writes — the goldens are by hand
// (fixtures/sequence.mermaid.ts); here, the rules under them: words escaped
// so Mermaid reads them as written, the arrows as the lines and heads say,
// participants left to right and messages down the page whatever order the
// log was merged in, nothing in the log.
//
// In: the round trip is the test. A sequenceDiagram text drawn with
// `drawMermaid` is ink the notation reads as a hand's, and `toMermaid` says
// the text again — but for its ids, the marks' own on the way back.

import { describe, it, expect } from 'vitest';
import { createSession, DEFAULT_SESSION_CONFIG } from '../session/session';
import type { Session } from '../session/session';
import { getRep, labelOf } from '../session/nodes';
import { bindingsOf } from '../session/magnets';
import { mergeLogs } from '../store/merge';
import { toMermaid, unescapeMermaid, mermaidWriters } from './mermaid';
import { drawMermaid, readMermaid, mermaidReaders } from './mermaid-in';
import { readSequence } from './sequence';
import { readSequenceText, sequenceText, BLANK_WORDS } from './sequence-mermaid';
import type { SequenceDiagramRead } from './sequence-mermaid';
import { drawSequence, SEQUENCE_VARIANTS, A3_WORDS } from './fixtures/sequence';
import type { SequenceExpected } from './fixtures/sequence';
import { A3_MERMAID_READ, A3_MERMAID_UNREAD, A3_ACTOR_MERMAID_READ } from './fixtures/sequence.mermaid';
import { SEQ_ACTORS, SEQ_ESCAPED, SEQ_EVERY_ARROW, SEQ_WRITTEN, randomSequenceText } from './fixtures/sequence.mermaid-in';

const named = (logName: string) => createSession({ ...DEFAULT_SESSION_CONFIG, logName });

/** A sequenceDiagram text with its ids renamed n1, n2, … in the order they first appear — the one normalisation the round trip allows. */
function canonical(text: string): string {
  const names = new Map<string, string>();
  const name = (id: string) => {
    if (!names.has(id)) names.set(id, `n${names.size + 1}`);
    return names.get(id)!;
  };
  return text
    .split('\n')
    .map((line) => {
      const p = /^(\s+(?:participant|actor) )(\S+)( as .*)$/.exec(line);
      if (p) return `${p[1]}${name(p[2])}${p[3]}`;
      const m = /^(\s+)([^\s<>:-]+)(<<-->>|<<->>|-->>|->>|-->|->)([^\s<>:-]+)(: .*)$/.exec(line);
      if (m) return `${m[1]}${name(m[2])}${m[3]}${name(m[4])}${m[5]}`;
      return line;
    })
    .join('\n');
}

/** A text drawn, read, and said again. */
function drawnBack(text: string, s: Session = named('importer~t1'), opts: { scale?: number } = {}) {
  const drawn = drawMermaid(s, text, { at: 1000, ...opts });
  const reading = readSequence(s.getState());
  if (!reading) throw new Error(`no sequence reading — notes: ${drawn.notes.join(' | ')}; refused: ${drawn.refused.map((r) => `${r.line}: ${r.reason}`).join(' | ')}`);
  const m = toMermaid(reading);
  if (!m) throw new Error('no Mermaid for a sequence diagram');
  return { drawn, reading, text: m.text, mermaid: m };
}

/** Read every piece of writing on the board as a model that can see would, by what it is. */
function readAll(s: Session, e: SequenceExpected) {
  const pid = s.join('agent', 'llm:seeing', 900_000, 2);
  let at = 900_100;
  const read = (id: string, text: string) => s.propose({ participantId: pid, nodeId: id, edges: [], reps: [{ modality: 'transcript', data: { text }, confidence: 0.9 }], at: at++ });
  for (const [name, p] of Object.entries(e.participants)) p.name.forEach((id) => read(id, A3_WORDS.names[name as keyof typeof A3_WORDS.names]));
  e.messages.forEach((m, i) => m.label.forEach((id) => read(id, A3_WORDS.messages[i])));
}

describe('out: the writer', () => {
  it('is registered by notation, with a reader by keyword', () => {
    expect(mermaidWriters()).toEqual(expect.arrayContaining(['flowchart', 'sequence']));
    expect(mermaidReaders()).toEqual(expect.arrayContaining(['sequenceDiagram']));
  });

  it('every hand of the board exports one text, before its writing is read and after', () => {
    for (const v of SEQUENCE_VARIANTS) {
      const s = createSession();
      const e = drawSequence(s, v);
      const unread = v.style === 'actor' ? A3_MERMAID_UNREAD.replace('participant stroke_1', 'actor stroke_1') : A3_MERMAID_UNREAD;
      expect(toMermaid(readSequence(s.getState())!)!.text, `${v.style} seed ${v.seed}`).toBe(unread);
      readAll(s, e);
      expect(toMermaid(readSequence(s.getState())!)!.text, `read, ${v.style} seed ${v.seed}`).toBe(v.style === 'actor' ? A3_ACTOR_MERMAID_READ : A3_MERMAID_READ);
    }
  });

  it('maps each Mermaid id back to its participant’s marks, and each link to its message', () => {
    const s = createSession();
    const e = drawSequence(s, SEQUENCE_VARIANTS[12]);
    const m = toMermaid(readSequence(s.getState())!)!;
    expect(m.ids.stroke_1).toBe(e.participants.Alice.figure[0]);
    expect(m.marks.stroke_2.slice().sort()).toEqual([...e.participants.Bob.figure, ...e.participants.Bob.lifeline].sort());
    // A link's ids are its message's own id — a dashed one's is derived, `dashes:…` — and every stroke it is drawn with.
    expect(m.links.map((l) => l.ids.filter((id) => !id.startsWith('dashes:')).sort())).toEqual(e.messages.map((x) => x.ids.slice().sort()));
    expect(m.links[3].id).toMatch(/^dashes:/);
    // Writing nobody has read is named, so a model that can see could be asked to read it.
    expect(m.unread).toHaveLength(7);
    expect(m.notes[0]).toMatch(/^seven pieces of writing have not been read/);
  });

  it('words are raw text with Mermaid’s entities: a hash, a semicolon, markup — and a leading wrap: — each the exact inverse of unescapeMermaid', () => {
    expect(sequenceText('item #3; then')).toBe('item #35;3#59; then');
    expect(sequenceText('A & B <team>')).toBe('A #amp; B #lt;team#gt;');
    expect(sequenceText('wrap: this')).toBe('wrap#58; this');
    expect(sequenceText('two\nlines')).toBe('two<br>lines');
    expect(sequenceText('')).toBe(BLANK_WORDS);
    for (const w of ['item #3; then', '50% "done"', 'A & B <team>', 'wrap: this', 'nowrap:x', '`code`', 'two\nlines', ' spaced ']) expect(unescapeMermaid(sequenceText(w))).toBe(w);
  });

  it('says the same text whatever order the hands’ logs were merged in', () => {
    const one = named('ada~a1'), two = named('bo~b2');
    drawSequence(one, SEQUENCE_VARIANTS[0]);
    drawSequence(two, SEQUENCE_VARIANTS[3], 500_000);
    const merged = (me: string, order: [Session, string][]) => {
      const s = named(me);
      s.load(mergeLogs(Object.fromEntries(order.map(([x, n]) => [n, [...x.getEvents()]])), { me }));
      return toMermaid(readSequence(s.getState())!)!.text;
    };
    const a = merged('ada~a1', [[one, 'ada~a1'], [two, 'bo~b2']]);
    const b = merged('bo~b2', [[two, 'bo~b2'], [one, 'ada~a1']]);
    expect(canonical(a)).toBe(canonical(b));
  });

  it('derived: exporting writes nothing into the log', () => {
    const s = createSession();
    drawSequence(s, SEQUENCE_VARIANTS[0]);
    const events = s.getEvents().length, nodes = s.getState().nodes.size;
    toMermaid(readSequence(s.getState())!);
    expect(s.getEvents().length).toBe(events);
    expect(s.getState().nodes.size).toBe(nodes);
  });
});

describe('in: the round trip — a text drawn and read again comes back', () => {
  const texts: [string, string][] = [
    ['A3, before its writing is read', A3_MERMAID_UNREAD],
    ['A3, once it is read', A3_MERMAID_READ],
    ['A3 with an actor', A3_ACTOR_MERMAID_READ],
    ['every arrow the writer writes, and a loop each way', SEQ_EVERY_ARROW],
    ['actors at each end', SEQ_ACTORS],
    ['words that break Mermaid unwritten', SEQ_ESCAPED],
  ];
  for (const [name, text] of texts) {
    it(name, () => {
      const back = drawnBack(text);
      expect(canonical(back.text)).toBe(canonical(text));
      expect(back.drawn.notes.filter((n) => /read back/.test(n))).toEqual([]);
      // Drawn from what it said, it says the same again.
      expect(canonical(drawnBack(back.text).text)).toBe(canonical(text));
    });
  }

  it('each participant is a box (or a stick figure) over its lifeline, its name on its own ink; each solid message bound at both ends along the lifelines', () => {
    const s = named('importer~t1');
    const drawn = drawMermaid(s, SEQ_EVERY_ARROW, { at: 1000 });
    const st = s.getState();
    const r = readSequence(st)!;
    expect(Object.keys(drawn.ids)).toEqual(['a1', 'a2', 'a3']);
    expect(labelOf(st.nodes.get(drawn.ids.a1)!)?.text).toBe('Client');
    expect(r.symbols.map((p) => p.symbol)).toEqual(['participant', 'participant', 'participant']);
    const links = drawn.links as unknown as { from: string; to: string; id: string; bound: boolean; route: string; start: { site: { kind: string } } }[];
    for (const l of links.filter((x) => x.bound)) {
      const b = bindingsOf(st.nodes.get(l.id)!, st.nodes);
      expect(b.map((x) => x.end).sort()).toEqual(['end', 'start']);
      expect(b.every((x) => x.site.kind === 'along:sequence')).toBe(true);
    }
    expect(links.filter((x) => x.route === 'loop')).toHaveLength(2);
    // Nothing derived enters the log: only strokes, binds and labels.
    expect([...new Set(s.getEvents().map((e) => e.type))].sort()).toEqual(['bind', 'label', 'stroke']);
  });

  it('a text a hand wrote comes back as D5 writes it — notes, frames, numbering and activations refused with their lines, a cross and an async head drawn as heads and said', () => {
    const back = drawnBack(SEQ_WRITTEN);
    const again = drawnBack(back.text);
    expect(canonical(again.text)).toBe(canonical(back.text));
    const read = readMermaid(SEQ_WRITTEN) as SequenceDiagramRead;
    expect(read.nodes.map((n) => `${n.symbol}:${n.id}:${n.text}`)).toEqual(['participant:Alice:Alice', 'participant:John:John']);
    expect(read.links.map((l) => `${l.from}${l.written}${l.to}${l.label ? `: ${l.label}` : ''}`)).toEqual(['Alice->>John: Hello John, how are you?', 'John-->>Alice: Great!', 'John-)Alice: See you later', 'Alice-xJohn: bye']);
    // Numbering, the note, the loop's frame (its message is read) and the deactivation.
    expect(read.refused.map((r) => r.line)).toEqual([2, 4, 5, 10]);
    expect(read.notes.join(' ')).toMatch(/activation/);
    expect(read.notes.join(' ')).toMatch(/cross/);
    expect(canonical(back.text).split('\n').slice(3, 7)).toEqual(['    n1->>n2: Hello John, how are you?', '    n2-->>n1: Great!', '    n2->>n1: See you later', '    n1->>n2: bye']);
  });

  it('what it cannot read is refused with its line, never thrown', () => {
    const read = readSequenceText(['sequenceDiagram', '    participant A', '    A->>A', '    A=>B: x', '    rect rgb(0,0,0)', '    end', '    end', '    participant two words as X', ''].join('\n'));
    expect(read.refused.map((r) => r.line)).toEqual([4, 5, 7, 8]);
    expect(read.nodes.map((n) => n.id)).toEqual(['A']);
    expect(read.links.map((l) => `${l.from}${l.written}${l.to}:${l.self}`)).toEqual(['A->>A:true']);
    expect(readMermaid('sequenceDiagram').notation).toBe('sequence');
    expect(drawMermaid(createSession(), 'sequenceDiagram\n', { at: 1 }).notes).toEqual(['nothing to draw: the text names no participant']);
    expect(() => readSequenceText(null as unknown as string)).not.toThrow();
  });

  it('seeded random sequence diagrams come back — at 1×, and in the hand’s space at 0.25× and 4×', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const text = randomSequenceText(seed);
      expect(canonical(drawnBack(text).text), `seed ${seed}\n${text}`).toBe(canonical(text));
    }
    for (let seed = 41; seed <= 50; seed++) {
      const text = randomSequenceText(seed);
      for (const scale of [0.25, 4]) expect(canonical(drawnBack(text, named('importer~t1'), { scale }).text), `seed ${seed} at ${scale}×\n${text}`).toBe(canonical(text));
    }
  });
});

describe('the other way: a hand’s drawing exported and drawn back reads as the same diagram', () => {
  for (const v of [...SEQUENCE_VARIANTS.slice(0, 4), ...SEQUENCE_VARIANTS.slice(12, 16), ...SEQUENCE_VARIANTS.slice(24, 28)]) {
    it(`${v.style}, seed ${v.seed}, jitter ${v.jitter}, tilt ${v.tilt}`, () => {
      const hand = named('hand~a1');
      const e = drawSequence(hand, v);
      readAll(hand, e);
      const text = toMermaid(readSequence(hand.getState())!)!.text;
      const back = drawnBack(text);
      expect(canonical(back.text)).toBe(canonical(text));
      expect(back.reading.connectors.map((m) => `${m.kind} ${m.arrow}`)).toEqual(['call ->>', 'self ->>', 'call ->>', 'return -->>']);
    });
  }

  it('the importing hand made every mark, and its words are labels on its own ink', () => {
    const s = named('importer~t1');
    drawMermaid(s, A3_MERMAID_READ, { at: 1000 });
    const st = s.getState();
    for (const id of st.contentIds) expect(getRep(st.nodes.get(id)!, 'stroke')).toBeDefined();
    expect(s.getEvents().filter((e) => e.type === 'label').length).toBe(7);
  });
});
