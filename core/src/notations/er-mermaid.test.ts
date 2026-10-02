// The ER diagram in Mermaid, both ways (V1-PLAN §3, §9 D6; D2 and D3's rules
// for `erDiagram`).
//
// Out: a reading said as the text the ER writer writes — the goldens are by
// hand (fixtures/er.mermaid.ts); here, the rules under them: words escaped so
// Mermaid reads them as written, each cardinality the crow's-foot token its
// writing says, entities in reading order whatever order the log was merged
// in, a leaning page put upright, nothing in the log.
//
// In: the round trip is the test. An erDiagram text drawn with `drawMermaid`
// is ink the notation reads as a hand's, and `toMermaid` says the text again —
// the same entities, relationships, cardinalities and verbs, its ids the
// marks' own on the way back.

import { describe, it, expect } from 'vitest';
import { createSession, DEFAULT_SESSION_CONFIG } from '../session/session';
import type { Session } from '../session/session';
import { getRep, labelOf } from '../session/nodes';
import { bindingsOf } from '../session/magnets';
import { mergeLogs } from '../store/merge';
import { toMermaid, unescapeMermaid, mermaidString, mermaidWriters } from './mermaid';
import { drawMermaid, readMermaid, mermaidReaders } from './mermaid-in';
import { readEr, cardinalityOf } from './er';
import { readErText, cardinalityOfToken } from './er-mermaid';
import type { ErDiagramRead } from './er-mermaid';
import { drawEr, ER_VARIANTS, ER_WORDS } from './fixtures/er';
import type { ErExpected } from './fixtures/er';
import { ER_MERMAID_READ, ER_MERMAID_UNREAD } from './fixtures/er.mermaid';
import { ER_BARE, ER_ESCAPED, ER_EVERY, ER_LR, ER_WRITTEN, randomErText } from './fixtures/er.mermaid-in';

/** Each of these draws and reads whole boards: more than vitest's five seconds on a loaded machine. */
const SLOW = 120_000;

const named = (logName: string) => createSession({ ...DEFAULT_SESSION_CONFIG, logName });

/** An erDiagram text with its ids renamed n1, n2, … in the order they first appear — the one normalisation a text that is the writer's own may need. */
function canonical(text: string): string {
  const names = new Map<string, string>();
  const name = (id: string) => {
    if (!names.has(id)) names.set(id, `n${names.size + 1}`);
    return names.get(id)!;
  };
  return text
    .split('\n')
    .map((line) => {
      const d = /^(\s+)(\S+)(\[.*\])$/.exec(line);
      if (d) return `${d[1]}${name(d[2])}${d[3]}`;
      const m = /^(\s+)(\S+) (\S+) (\S+) (:.*)$/.exec(line);
      if (m) return `${m[1]}${name(m[2])} ${m[3]} ${name(m[4])} ${m[5]}`;
      return line;
    })
    .join('\n');
}

/**
 * What a text says, whatever its ids and the order it says it in: each
 * relationship as its two entities' names with the cardinality at each and its
 * verb, the pair in name order.
 */
function said(text: string): string[] {
  const read = readErText(text);
  const name = new Map(read.nodes.map((n) => [n.id, n.text]));
  return read.links
    .map((l) => {
      const [a, b] = [name.get(l.from)!, name.get(l.to)!];
      return a <= b ? `${a} ${l.cardinality.from} — ${l.cardinality.to} ${b} : ${l.label ?? ''}` : `${b} ${l.cardinality.to} — ${l.cardinality.from} ${a} : ${l.label ?? ''}`;
    })
    .sort()
    .concat(read.nodes.map((n) => `entity ${n.text}`).sort());
}

/** A text drawn, read, and said again. */
function drawnBack(text: string, s: Session = named('importer~t1'), opts: { scale?: number } = {}) {
  const drawn = drawMermaid(s, text, { at: 1000, ...opts });
  const reading = readEr(s.getState());
  if (!reading) throw new Error(`no ER reading — notes: ${drawn.notes.join(' | ')}; refused: ${drawn.refused.map((r) => `${r.line}: ${r.reason}`).join(' | ')}`);
  const m = toMermaid(reading);
  if (!m) throw new Error('no Mermaid for an ER diagram');
  return { drawn, reading, text: m.text, mermaid: m };
}

/** Read every piece of writing on the board as a model that can see would, by what it is. */
function readAll(s: Session, e: ErExpected) {
  const pid = s.join('agent', 'llm:seeing', 900_000, 2);
  let at = 900_100;
  for (const [id, text] of Object.entries(e.words)) s.propose({ participantId: pid, nodeId: id, edges: [], reps: [{ modality: 'transcript', data: { text }, confidence: 0.9 }], at: at++ });
}

describe('out: the writer', () => {
  it('is registered by notation, with a reader by keyword', () => {
    expect(mermaidWriters()).toEqual(expect.arrayContaining(['flowchart', 'er']));
    expect(mermaidReaders()).toEqual(expect.arrayContaining(['erDiagram']));
  });

  it('maps each Mermaid id back to its entity’s marks, and each link to its relationship', () => {
    const s = createSession();
    const e = drawEr(s, ER_VARIANTS[12]);
    const m = toMermaid(readEr(s.getState())!)!;
    expect(m.ids).toEqual({ stroke_1: e.entities.Customer.box[0], stroke_2: e.entities.Order.box[0], stroke_4: e.entities.Invoice.box[0], stroke_3: e.entities.LineItem.box[0] });
    expect(m.marks.stroke_2).toEqual(e.entities.Order.box);
    expect(m.links.map((l) => `${l.from}>${l.to}`)).toEqual(['stroke_1>stroke_2', 'stroke_2>stroke_4', 'stroke_2>stroke_3']);
    expect(m.links[1].id).toBe(e.relationships[2].id);
    expect(m.direction?.value).toBe('LR');
    // Writing nobody has read is named, so a model that can see could be asked to read it.
    expect(m.unread).toHaveLength(4 + 6 + 3);
    expect(m.notes[0]).toMatch(/^13 pieces of writing have not been read/);
    expect(m.notes.join(' ')).toMatch(/nothing says how many at/);
  });

  it('says how many from the writing: each of the four cardinalities, at either side of a line, and the least a line claims where nothing does', () => {
    for (const [words, want] of [['1', 'one'], ['one', 'one'], ['1..1', 'one'], ['0..1', 'zero-one'], ['0-1', 'zero-one'], ['zero or one', 'zero-one'], ['*', 'zero-many'], ['N', 'zero-many'], ['m', 'zero-many'], ['0..*', 'zero-many'], ['many', 'zero-many'], ['1..*', 'one-many'], ['1..n', 'one-many'], ['1+', 'one-many'], ['one or more', 'one-many']] as const) expect(cardinalityOf(words), words).toBe(want);
    for (const words of ['', 'places', '2..5', '(unread writing)']) expect(cardinalityOf(words), words).toBeNull();
    expect(cardinalityOf(undefined)).toBeNull();
    expect(cardinalityOfToken('}|', 'left')).toBe('one-many');
    expect(cardinalityOfToken('|{', 'right')).toBe('one-many');
    expect(cardinalityOfToken('|o', 'left')).toBe('zero-one');
    expect(cardinalityOfToken('o|', 'right')).toBe('zero-one');
  });

  it('a tilted page is read upright: the same entities in the same order at every lean up to a few degrees, and the reading order of a level page', () => {
    for (const tilt of [-6, -3, 0, 3, 6]) {
      const s = createSession();
      drawEr(s, { seed: 41, jitter: 1.5, tilt });
      expect(toMermaid(readEr(s.getState())!)!.text, `tilt ${tilt}`).toBe(ER_MERMAID_UNREAD);
    }
  }, SLOW);

  it('words are raw text with Mermaid’s entities, each the exact inverse of unescapeMermaid — and a verb with a colon or a quote is written whole', () => {
    const s = named('importer~t1');
    drawMermaid(s, ER_ESCAPED, { at: 1000 });
    const text = toMermaid(readEr(s.getState())!)!.text;
    expect(text).toMatch(/\[\"Say #quot;hi#quot; #amp; #lt;go#gt;\"\]/);
    expect(text).toMatch(/: \"a: b\"/);
    for (const w of ['item #3; then', '50% "done"', 'A & B <team>', '`code`', 'two\nlines']) expect(unescapeMermaid(mermaidString(w))).toBe(w);
  });

  it('says the same text whatever order the hands’ logs were merged in', () => {
    const one = named('ada~a1'), two = named('bo~b2');
    drawEr(one, ER_VARIANTS[0]);
    drawEr(two, ER_VARIANTS[3], 500_000);
    const merged = (me: string, order: [Session, string][]) => {
      const s = named(me);
      s.load(mergeLogs(Object.fromEntries(order.map(([x, n]) => [n, [...x.getEvents()]])), { me }));
      return toMermaid(readEr(s.getState())!)!.text;
    };
    const a = merged('ada~a1', [[one, 'ada~a1'], [two, 'bo~b2']]);
    const b = merged('bo~b2', [[two, 'bo~b2'], [one, 'ada~a1']]);
    expect(canonical(a)).toBe(canonical(b));
  });

  it('derived: exporting writes nothing into the log', () => {
    const s = createSession();
    drawEr(s, ER_VARIANTS[0]);
    const events = s.getEvents().length, nodes = s.getState().nodes.size;
    toMermaid(readEr(s.getState())!);
    expect(s.getEvents().length).toBe(events);
    expect(s.getState().nodes.size).toBe(nodes);
  });

  it('a relationship with no verb is `""` — Mermaid wants one — and a name with no writing is a blank', () => {
    const s = named('importer~t1');
    drawMermaid(s, ER_BARE, { at: 1000 });
    const m = toMermaid(readEr(s.getState())!)!;
    expect(m.text).toMatch(/ : ""\n/);
    expect(m.notes.join(' ')).toMatch(/no verb/);
  });
});

describe('in: the round trip — a text drawn and read again comes back', () => {
  const texts: [string, string][] = [
    ['the board, before its writing is read', ER_MERMAID_UNREAD],
    ['the board, once it is read', ER_MERMAID_READ],
    ['every cardinality, running down the page', ER_EVERY],
    ['a chain running across the page', ER_LR],
    ['words that break Mermaid unwritten', ER_ESCAPED],
    ['relationships with no verb', ER_BARE],
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

  it('the writer’s own texts come back word for word, the ids the marks’ own — running down the page and across it', () => {
    for (const text of [ER_EVERY, ER_LR, ER_BARE]) expect(canonical(drawnBack(text).text)).toBe(canonical(text));
  }, SLOW);

  it('each entity is a box with its name on its own ink; every relationship a line bound at both ends, its verb on its own ink and a dash beside each end saying how many', () => {
    const s = named('importer~t1');
    const drawn = drawMermaid(s, ER_EVERY, { at: 1000 });
    const st = s.getState();
    const r = readEr(st)!;
    expect(Object.keys(drawn.ids)).toEqual(['a1', 'a2', 'a3', 'a4']);
    expect(labelOf(st.nodes.get(drawn.ids.a1)!)?.text).toBe('Author');
    expect(r.symbols.map((p) => p.symbol)).toEqual(['entity', 'entity', 'entity', 'entity']);
    const links = drawn.links as unknown as { from: string; to: string; id: string; bound: [boolean, boolean]; route: string }[];
    expect(links).toHaveLength(3);
    for (const l of links) {
      expect(l.bound).toEqual([true, true]);
      expect(bindingsOf(st.nodes.get(l.id)!, st.nodes).map((x) => x.end).sort()).toEqual(['end', 'start']);
      expect(labelOf(st.nodes.get(l.id)!)?.text).toBeTruthy();
    }
    // Nothing derived enters the log: only strokes, binds and labels — and each end's dash is a label of its own.
    expect([...new Set(s.getEvents().map((e) => e.type))].sort()).toEqual(['bind', 'label', 'stroke']);
    expect(s.getEvents().filter((e) => e.type === 'label').length).toBe(4 + 3 + 6);
  });

  it('a text a hand wrote comes back as the ER writer says it — attributes refused with their lines, a `..` line as a plain one, the words Mermaid takes for a cardinality read', () => {
    const back = drawnBack(ER_WRITTEN);
    expect(canonical(drawnBack(back.text).text)).toBe(canonical(back.text));
    const read = readMermaid(ER_WRITTEN) as ErDiagramRead;
    expect(read.nodes.map((n) => `${n.id}:${n.text}`)).toEqual(['CUSTOMER:CUSTOMER', 'ORDER:ORDER', 'LINE-ITEM:Line item', 'PRODUCT:PRODUCT', 'INVOICE:INVOICE']);
    expect(read.links.map((l) => `${l.from} ${l.cardinality.from}${l.identifying ? '--' : '..'}${l.cardinality.to} ${l.to} : ${l.label ?? ''}`)).toEqual([
      'CUSTOMER one--zero-many ORDER : places',
      'ORDER one--one-many LINE-ITEM : contains',
      'ORDER one-many..one-many PRODUCT : ordered in',
      'INVOICE one-many--zero-many PRODUCT : billed',
    ]);
    // The attributes, the one-line block and the title.
    expect(read.refused.map((r) => r.line)).toEqual([6, 7, 11, 13]);
    expect(read.refused[0].reason).toMatch(/attribute of CUSTOMER/);
    expect(read.refused[read.refused.length - 1].reason).toMatch(/title/);
    expect(read.notes.join(' ')).toMatch(/non-identifying/);
    // What was read is drawn, and says what it read.
    expect(said(back.text)).toEqual(
      [...said(ER_WRITTEN)].sort()
    );
  }, SLOW);

  it('what it cannot read is refused with its line, never thrown', () => {
    const read = readErText(['erDiagram', '    A ||--o{', '    A |x--o{ B : no', '    two words ||--o{ B : c', '    style A fill:#f9f', '    A ||--o{ B : "ok"', ''].join('\n'));
    expect(read.refused.map((r) => r.line)).toEqual([2, 3, 4, 5]);
    expect(read.links.map((l) => `${l.from}${l.written}${l.to}`)).toEqual(['A||--o{B']);
    expect(readMermaid('erDiagram').notation).toBe('er');
    expect(drawMermaid(createSession(), 'erDiagram\n', { at: 1 }).notes).toEqual(['nothing to draw: the text names no entity']);
    expect(() => readErText(null as unknown as string)).not.toThrow();
  });

  it('seeded random ER diagrams come back — at 1×, and in the hand’s space at 0.25× and 4×', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const text = randomErText(seed);
      expect(said(drawnBack(text).text), `seed ${seed}\n${text}`).toEqual(said(text));
    }
    for (let seed = 41; seed <= 46; seed++) {
      const text = randomErText(seed);
      for (const scale of [0.25, 4]) expect(said(drawnBack(text, named('importer~t1'), { scale }).text), `seed ${seed} at ${scale}×\n${text}`).toEqual(said(text));
    }
  }, SLOW);
});

describe('the other way: a hand’s drawing exported and drawn back reads as the same diagram', () => {
  for (const v of [...ER_VARIANTS.slice(0, 3), ...ER_VARIANTS.slice(12, 15), ...ER_VARIANTS.slice(24, 27)]) {
    it(`seed ${v.seed}, jitter ${v.jitter}, tilt ${v.tilt}`, () => {
      const hand = named('hand~a1');
      const e = drawEr(hand, v);
      readAll(hand, e);
      const text = toMermaid(readEr(hand.getState())!)!.text;
      expect(canonical(text)).toBe(canonical(ER_MERMAID_READ));
      const back = drawnBack(text);
      expect(said(back.text)).toEqual(said(text));
      expect(back.reading.connectors).toHaveLength(3);
      expect(back.drawn.notes.filter((n) => /read back/.test(n))).toEqual([]);
    }, SLOW);
  }

  it('the importing hand made every mark, and its words are labels on its own ink', () => {
    const s = named('importer~t1');
    drawMermaid(s, ER_MERMAID_READ, { at: 1000 });
    const st = s.getState();
    for (const id of st.contentIds) expect(getRep(st.nodes.get(id)!, 'stroke')).toBeDefined();
    // Four names, three verbs, and a dash at each of six ends.
    expect(s.getEvents().filter((e) => e.type === 'label').length).toBe(4 + 3 + 6);
    expect(ER_WORDS.ends).toHaveLength(6);
  });
});
