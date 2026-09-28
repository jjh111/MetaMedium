// The class diagram in Mermaid, both ways (V1-PLAN §3, §9 D4; D2 and D3's
// rules for `classDiagram`).
//
// Out: a reading said as the text D4's writer writes — the goldens are by hand
// (fixtures/uml-class.mermaid.ts); here, the rules under them: a member's
// words escaped so Mermaid reads them as written and never takes an attribute
// for a method, relations from the marked end, the direction measured, the
// same text whatever order the log was merged in, nothing in the log.
//
// In: the round trip is the test. A classDiagram text drawn with
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
import { readUmlClass } from './uml-class';
import type { UmlClassReading } from './uml-class';
import { memberLine, readClassDiagramText } from './uml-class-mermaid';
import type { ClassDiagramRead } from './uml-class-mermaid';
import { drawClassDiagram, drawClassPair, CLASS_VARIANTS, DIAGRAM_WORDS, DIAGRAM_MULTIPLICITIES, A2_WORDS } from './fixtures/uml-class';
import { A2_MERMAID_READ, A2_MERMAID_UNREAD, DIAGRAM_MERMAID_READ, DIAGRAM_MERMAID_UNREAD } from './fixtures/uml-class.mermaid';
import { CLASS_AROUND, CLASS_ESCAPED, CLASS_EVERY_RELATION, CLASS_LR, CLASS_WRITTEN, randomClassText } from './fixtures/uml-class.mermaid-in';

const named = (logName: string) => createSession({ ...DEFAULT_SESSION_CONFIG, logName });

/** A classDiagram text with its ids renamed n1, n2, … in the order they first appear — the one normalisation the round trip allows. */
function canonical(text: string): string {
  const names = new Map<string, string>();
  const name = (id: string) => {
    if (!names.has(id)) names.set(id, `n${names.size + 1}`);
    return names.get(id)!;
  };
  return text
    .split('\n')
    .map((line) => {
      const cls = /^(\s+class )([A-Za-z][A-Za-z0-9_]*)(.*)$/.exec(line);
      if (cls) return `${cls[1]}${name(cls[2])}${cls[3]}`;
      const rel = /^(\s+)([A-Za-z][A-Za-z0-9_]*)((?: "[^"]*")? (?:<\||\*|o|<)?--(?:\|>|\*|o|>)? (?:"[^"]*" )?)([A-Za-z][A-Za-z0-9_]*)((?: : .*)?)$/.exec(line);
      if (rel) return `${rel[1]}${name(rel[2])}${rel[3]}${name(rel[4])}${rel[5]}`;
      return line;
    })
    .join('\n');
}

/** A text drawn, read, and said again. */
function drawnBack(text: string, s: Session = named('importer~t1'), opts: { scale?: number } = {}) {
  const drawn = drawMermaid(s, text, { at: 1000, ...opts });
  const reading = readUmlClass(s.getState());
  if (!reading) throw new Error(`no class-diagram reading — notes: ${drawn.notes.join(' | ')}; refused: ${drawn.refused.map((r) => `${r.line}: ${r.reason}`).join(' | ')}`);
  const m = toMermaid(reading);
  if (!m) throw new Error('no Mermaid for a class diagram');
  return { drawn, reading, text: m.text, mermaid: m };
}

/** Read every piece of writing on a board as a model that can see would, by what it is. */
function readAll(s: Session, e: ReturnType<typeof drawClassDiagram>, words: Record<string, { name: string; members: string[] }>, cards: string[] = []) {
  const pid = s.join('agent', 'llm:seeing', 900_000, 2);
  let at = 900_100;
  const read = (id: string, text: string) => s.propose({ participantId: pid, nodeId: id, edges: [], reps: [{ modality: 'transcript', data: { text }, confidence: 0.9 }], at: at++ });
  for (const [name, want] of Object.entries(e.classes)) {
    const w = words[name];
    want.name.forEach((id) => read(id, w.name));
    want.members.forEach((m, i) => m.ids.forEach((id) => read(id, w.members[i])));
  }
  e.multiplicities.forEach((m, i) => read(m.id, cards[i]));
}

describe('out: the writer', () => {
  it('is registered by notation, with a reader by keyword', () => {
    expect(mermaidWriters()).toEqual(expect.arrayContaining(['flowchart', 'uml-class']));
    expect(mermaidReaders()).toEqual(expect.arrayContaining(['classDiagram', 'classDiagram-v2']));
  });

  it('every hand of the bench board exports one text, before its writing is read and after', () => {
    for (const v of CLASS_VARIANTS) {
      const s = createSession();
      const e = drawClassDiagram(s, v);
      expect(toMermaid(readUmlClass(s.getState())!)!.text, `seed ${v.seed} jitter ${v.jitter} tilt ${v.tilt}`).toBe(DIAGRAM_MERMAID_UNREAD);
      readAll(s, e, DIAGRAM_WORDS, DIAGRAM_MULTIPLICITIES);
      expect(toMermaid(readUmlClass(s.getState())!)!.text, `read, seed ${v.seed}`).toBe(DIAGRAM_MERMAID_READ);
    }
  });

  it('maps each Mermaid id back to its class’s marks, and each link to its relation', () => {
    const s = createSession();
    const e = drawClassDiagram(s, CLASS_VARIANTS[0]);
    const m = toMermaid(readUmlClass(s.getState())!)!;
    expect(m.ids.stroke_1).toBe(e.classes.Canvas.box[0]);
    expect(m.marks.stroke_1).toEqual([...e.classes.Canvas.box, ...e.classes.Canvas.lines]);
    expect(m.ids.figure_12_13_14_15).toBe(`figure:${[...e.classes.Square.box].sort().join('+')}`);
    expect(m.links.map((l) => l.id)).toEqual([e.relations[2].id, e.relations[0].id, e.relations[1].id, e.relations[3].id, e.relations[4].id]);
    expect(m.links[0].ids).toEqual([...e.relations[2].ids].sort((a, b) => Number(a.split(':')[1]) - Number(b.split(':')[1])));
    // Writing nobody has read is named, so a model that can see could be asked to read it.
    expect(m.unread).toHaveLength(19);
    expect(m.notes[0]).toMatch(/^19 pieces of writing have not been read/);
  });

  it('a member is a method only when its words say so; an attribute’s parentheses are entities, so Mermaid never takes it for one', () => {
    expect(memberLine('+eat()', 'method')).toBe('+eat()');
    expect(memberLine('name (optional)', 'attribute')).toBe('name #40;optional#41;');
    expect(memberLine('(unread writing)', 'unread')).toBe('#40;unread writing#41;');
    expect(memberLine('-items[] {x}', 'attribute')).toBe('-items#91;#93; #123;x#125;');
    expect(memberLine('~p: a~b', 'attribute')).toBe('#126;p: a#126;b');
    expect(memberLine('#x: int', 'attribute')).toBe('#35;x: int');
    // Each is the exact inverse of unescapeMermaid.
    for (const w of ['name (optional)', '-items[] {x}', '~p: a~b', '#x: int', 'a "b" <c> & %d; `e`']) expect(unescapeMermaid(`"${memberLine(w, 'attribute')}"`)).toBe(w);
    // And Mermaid's own rule reads the same kinds back: a method has a `)` after its first character.
    const read = readClassDiagramText(`classDiagram\n    class a {\n        ${memberLine('name (optional)', 'attribute')}\n        ${memberLine('+eat()', 'method')}\n    }\n`);
    expect(read.nodes[0].members).toEqual([{ text: 'name (optional)', kind: 'attribute', line: 3 }, { text: '+eat()', kind: 'method', line: 4 }]);
  });

  it('says the same text whatever order the hands’ logs were merged in', () => {
    const one = named('ada~a1'), two = named('bo~b2');
    drawClassPair(one, CLASS_VARIANTS[0]);
    const e2 = drawClassPair(two, CLASS_VARIANTS[3], 500_000);
    void e2;
    const merged = (me: string, order: [Session, string][]) => {
      const s = named(me);
      s.load(mergeLogs(Object.fromEntries(order.map(([x, n]) => [n, [...x.getEvents()]])), { me }));
      return toMermaid(readUmlClass(s.getState())!)!.text;
    };
    const a = merged('ada~a1', [[one, 'ada~a1'], [two, 'bo~b2']]);
    const b = merged('bo~b2', [[two, 'bo~b2'], [one, 'ada~a1']]);
    expect(canonical(a)).toBe(canonical(b));
    expect(a.split('\n').filter((l) => l.includes('<|--'))).toHaveLength(2);
  });

  it('derived: exporting writes nothing into the log', () => {
    const s = createSession();
    drawClassDiagram(s, CLASS_VARIANTS[0]);
    const events = s.getEvents().length, nodes = s.getState().nodes.size;
    toMermaid(readUmlClass(s.getState())!);
    toMermaid(readUmlClass(s.getState())!, { direction: 'LR' });
    expect(s.getEvents().length).toBe(events);
    expect(s.getState().nodes.size).toBe(nodes);
  });
});

describe('in: the round trip — a text drawn and read again comes back', () => {
  const texts: [string, string][] = [
    ['A2, before its writing is read', A2_MERMAID_UNREAD],
    ['A2, once it is read', A2_MERMAID_READ],
    ['the bench board, unread', DIAGRAM_MERMAID_UNREAD],
    ['the bench board, read', DIAGRAM_MERMAID_READ],
    ['across (direction LR), with a label and multiplicities', CLASS_LR],
    ['every relation, three ends spread along one side', CLASS_EVERY_RELATION],
    ['a relation that skips a rank, bowing around the class between', CLASS_AROUND],
    ['words that break Mermaid unwritten', CLASS_ESCAPED],
  ];
  for (const [name, text] of texts) {
    it(name, () => {
      const back = drawnBack(text);
      expect(canonical(back.text)).toBe(canonical(text));
      expect(back.drawn.notes.filter((n) => /read back|crosses/.test(n))).toEqual([]);
      // Drawn from what it said, it says the same again.
      expect(canonical(drawnBack(back.text).text)).toBe(canonical(text));
    });
  }

  it('each class is drawn as one box with two lines across it, its words on its own ink; each relation bound at both ends', () => {
    const s = named('importer~t1');
    const drawn = drawMermaid(s, CLASS_EVERY_RELATION, { at: 1000 });
    const st = s.getState();
    const r = readUmlClass(st)!;
    expect(Object.keys(drawn.ids)).toEqual(['a1', 'a2', 'a3', 'a4', 'a5', 'a6']);
    for (const id of Object.values(drawn.ids)) {
      const c = r.symbols.find((x) => x.box[0] === id)!;
      expect(c.symbol).toBe('class');
      expect(c.lines).toHaveLength(2);
    }
    expect(labelOf(st.nodes.get(drawn.ids.a1)!)?.text).toBe('Vehicle');
    expect(labelOf(st.nodes.get(r.symbols.find((x) => x.box[0] === drawn.ids.a4)!.lines[0])!)?.text).toBe('-seats: int');
    for (const l of drawn.links) {
      const b = bindingsOf(st.nodes.get(l.id)!, st.nodes);
      expect(b.map((x) => x.end).sort()).toEqual(['end', 'start']);
      expect(b.map((x) => x.nodeId).sort()).toEqual([drawn.ids[l.from], drawn.ids[l.to]].sort());
    }
    // Three ends share Vehicle's bottom: spread along it, each bound at a place along the class's side.
    const spread = drawn.links.filter((l) => l.from === 'a1').map((l) => l.start);
    expect(spread.map((x) => x.site.kind)).toEqual(['along:uml-class', 'along:uml-class', 'along:uml-class']);
    expect(new Set(spread.map((x) => Math.round(x.point.x))).size).toBe(3);
    // Nothing derived enters the log: only strokes, binds and labels.
    expect([...new Set(s.getEvents().map((e) => e.type))].sort()).toEqual(['bind', 'label', 'stroke']);
  });

  it('a relation that skips a rank bows around the class between as an arc, and still reads as drawn', () => {
    const { drawn, reading } = drawnBack(CLASS_AROUND);
    expect(drawn.links.map((l) => l.route)).toEqual(['straight', 'arc', 'straight']);
    expect(reading.connectors.map((c) => c.kind).sort()).toEqual(['composition', 'inheritance', 'inheritance']);
    expect(reading.symbols.every((c) => c.lines.length === 2)).toBe(true);
  });

  it('a text a hand wrote comes back as D4 writes it — a dashed line drawn solid and said, a note refused with its line', () => {
    const back = drawnBack(CLASS_WRITTEN);
    const again = drawnBack(back.text);
    expect(canonical(again.text)).toBe(canonical(back.text));
    const read = readMermaid(CLASS_WRITTEN) as ClassDiagramRead;
    expect(read.nodes.map((n) => `${n.id}:${n.text}:${n.members.map((m) => `${m.kind[0]}${m.text}`).join('|')}`)).toEqual([
      'Animal:Animal:a+int age|m+isMammal()',
      'Duck:Duck:a+String beakColor|m+swim()',
      'Water:Water:',
    ]);
    expect(read.links.map((l) => `${l.left} ${l.written} ${l.right}${l.label ? ` : ${l.label}` : ''}`)).toEqual(['Duck --|> Animal', 'Duck ..> Water : drinks']);
    expect(read.refused.map((r) => r.line)).toEqual([3]);
    expect(read.notes.join(' ')).toMatch(/dashed/);
    // The triangle stands at Animal, however the text wrote it.
    expect(back.text).toMatch(/ <\|-- /);
    expect(back.reading.connectors.find((c) => c.kind === 'inheritance')!.to).toBe(back.drawn.ids.Animal);
  });

  it('what it cannot read is refused with its line, never thrown', () => {
    const read = readClassDiagramText(['classDiagram', '    class A', '    style A fill:#f9f', '    A ()-- B', '    A --> A', '    A => B', '    <<interface>> A', '    namespace N {', '        class C', '    }', '    click A call x()', ''].join('\n'));
    expect(read.refused.map((r) => r.line)).toEqual([3, 4, 5, 6, 7, 8, 11]);
    expect(read.nodes.map((n) => n.id)).toEqual(['A', 'C']);
    expect(readMermaid('classDiagram').notation).toBe('uml-class');
    expect(drawMermaid(createSession(), 'classDiagram\n', { at: 1 }).notes).toEqual(['nothing to draw: the text names no class']);
    expect(() => readClassDiagramText(null as unknown as string)).not.toThrow();
  });

  it('seeded random class diagrams come back — at 1×, and in the hand’s space at 0.25× and 4×', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const text = randomClassText(seed);
      expect(canonical(drawnBack(text).text), `seed ${seed}\n${text}`).toBe(canonical(text));
    }
    for (let seed = 41; seed <= 50; seed++) {
      const text = randomClassText(seed);
      for (const scale of [0.25, 4]) expect(canonical(drawnBack(text, named('importer~t1'), { scale }).text), `seed ${seed} at ${scale}×`).toBe(canonical(text));
    }
  });
});

describe('the other way: a hand’s drawing exported and drawn back reads as the same diagram', () => {
  /** Classes in reading order, and relations between their places in it. */
  function shapeOf(r: UmlClassReading) {
    const order = [...r.symbols].sort((a, b) => a.bounds.minY - b.bounds.minY || a.bounds.minX - b.bounds.minX);
    const text = toMermaid(r)!;
    const place = new Map(Object.values(text.ids).map((id, i) => [id, i]));
    void order;
    return {
      classes: r.symbols.length,
      members: [...r.symbols].sort((a, b) => place.get(a.id)! - place.get(b.id)!).map((c) => c.members.length),
      relations: r.connectors.map((c) => `${place.get(c.from)} ${c.kind} ${place.get(c.to)}`).sort(),
    };
  }
  for (const v of CLASS_VARIANTS.slice(0, 12)) {
    it(`the bench board, seed ${v.seed}, jitter ${v.jitter}, tilt ${v.tilt}`, () => {
      const hand = named('hand~a1');
      const e = drawClassDiagram(hand, v);
      readAll(hand, e, DIAGRAM_WORDS, DIAGRAM_MULTIPLICITIES);
      const first = readUmlClass(hand.getState())!;
      const text = toMermaid(first)!.text;
      const back = drawnBack(text);
      expect(shapeOf(back.reading)).toEqual(shapeOf(first));
      expect(canonical(back.text)).toBe(canonical(text));
    });
  }

  it('A2, its words read, comes back with its words', () => {
    const hand = createSession();
    const e = drawClassPair(hand, CLASS_VARIANTS[1]);
    readAll(hand, e as ReturnType<typeof drawClassDiagram>, A2_WORDS);
    const text = toMermaid(readUmlClass(hand.getState())!)!.text;
    expect(text).toBe(A2_MERMAID_READ);
    expect(canonical(drawnBack(text).text)).toBe(canonical(A2_MERMAID_READ));
  });

  it('the importing hand made every mark, and its words are labels on its own ink', () => {
    const s = named('importer~t1');
    drawMermaid(s, DIAGRAM_MERMAID_READ, { at: 1000 });
    const st = s.getState();
    for (const id of st.contentIds) {
      const n = st.nodes.get(id)!;
      expect(getRep(n, 'stroke')).toBeDefined();
    }
    expect(s.getEvents().filter((e) => e.type === 'label').length).toBeGreaterThan(10);
  });
});
