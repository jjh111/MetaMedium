// A2 as a core test (V1-PLAN §0, §9 D4): two classes with compartments and an
// inheritance arrow read as a UML class diagram — above the floor, and first,
// above the flowchart the same boxes also make — and export as Mermaid, the
// golden classDiagram text. Asked through the platform's own doors (the
// index): the notation, its reading and its writer must be registered there.
//
// And the negatives: the flowchart bench's thirty-six flowcharts, a UI
// wireframe (a frame holding a row of boxes is not a class), the canonical
// molecule and a line of writing read 0 above the floor as a class diagram.

import { describe, it, expect } from 'vitest';
import { createSession, DEFAULT_SESSION_CONFIG, notationsOf, NOTATION_FLOOR, toMermaid } from '../index';
import type { Session, NotationReading } from '../index';
import { drawClassPair, A2_WORDS, CLASS_VARIANTS } from './fixtures/uml-class';
import type { ClassExpected } from './fixtures/uml-class';
import { A2_MERMAID_UNREAD, A2_MERMAID_READ } from './fixtures/uml-class.mermaid';
import { drawFlowchart, drawWireframe, drawMolecule, drawWriting, FLOWCHART_VARIANTS } from './fixtures/flowchart';
import { handShape, boxCorners } from './fixtures/hand';
import { handLine, handArrow, handText } from '../test/strokes';

/** What this test reads of a class symbol and a relation — the reading's own types are the notation's. */
interface ClassView {
  id: string;
  ids: string[];
  symbol: string;
  name: { ids: string[] };
  members: { compartment: number; ids: string[]; kind: string }[];
}
interface RelationView {
  id: string;
  ids: string[];
  kind: string;
  from: string;
  to: string;
}

const sameSet = (a: readonly string[], b: readonly string[]) => [...a].sort().join('|') === [...b].sort().join('|');
const umlOf = (s: Session): NotationReading | undefined => notationsOf(s.getState()).find((r) => r.notation === 'uml-class');
/** The class a reading holds for an expected one: the symbol drawn with its box. */
const classFor = (r: NotationReading, want: ClassExpected['classes'][string]) => (r.symbols as unknown as ClassView[]).find((c) => want.box.every((id) => c.ids.includes(id)));

describe('A2 — two classes with compartments and an inheritance arrow', () => {
  for (const v of CLASS_VARIANTS.slice(0, 12)) {
    const label = `seed ${v.seed} jitter ${v.jitter} tilt ${v.tilt}`;

    it(`reads as a UML class diagram, above the floor and first among the readings — ${label}`, () => {
      const s = createSession();
      drawClassPair(s, v);
      const all = notationsOf(s.getState());
      const uml = all.find((r) => r.notation === 'uml-class');
      expect(uml, `readings: ${all.map((r) => `${r.notation} ${r.confidence.toFixed(2)}`).join(', ')}`).toBeDefined();
      expect(uml!.confidence).toBeGreaterThanOrEqual(NOTATION_FLOOR);
      expect(all[0].notation).toBe('uml-class');
      // The flowchart reads the same boxes as two processes and a flow — plural, and below it.
      const flow = all.find((r) => r.notation === 'flowchart');
      if (flow) expect(flow.confidence).toBeLessThan(uml!.confidence);
    });

    it(`its classes each hold their compartments, the name in the top one; its relation is an inheritance, the triangle at the parent — ${label}`, () => {
      const s = createSession();
      const e = drawClassPair(s, v);
      const r = umlOf(s)!;
      expect(r).toBeDefined();
      const classes = r.symbols as unknown as ClassView[];
      expect(classes.map((c) => c.symbol)).toEqual(['class', 'class']);
      for (const [name, want] of Object.entries(e.classes)) {
        const got = classFor(r, want);
        expect(got, name).toBeDefined();
        expect(sameSet(got!.ids, [...want.box, ...want.lines]), `${name}: ${got!.ids}`).toBe(true);
        expect(got!.name.ids).toEqual(want.name);
        expect(got!.members.map((m) => ({ compartment: m.compartment, ids: m.ids }))).toEqual(want.members);
        // Nobody has read the writing: no member is a method, and none is invented one.
        expect(got!.members.every((m) => m.kind === 'unread')).toBe(true);
      }
      const rel = r.connectors as unknown as RelationView[];
      expect(rel).toHaveLength(1);
      const want = e.relations[0];
      expect(rel[0].kind).toBe('inheritance');
      expect(sameSet(rel[0].ids, want.ids)).toBe(true);
      expect(rel[0].to).toBe(classFor(r, e.classes.Animal)!.id);
      expect(rel[0].from).toBe(classFor(r, e.classes.Dog)!.id);
    });

    it(`exports the golden classDiagram text before the writing is read — ${label}`, () => {
      const s = createSession();
      drawClassPair(s, v);
      const m = toMermaid(umlOf(s)!);
      expect(m, 'a writer for the class diagram').not.toBeNull();
      expect(m!.diagram).toBe('classDiagram');
      expect(m!.text).toBe(A2_MERMAID_UNREAD);
    });
  }

  it('and once a model that can see has read the writing, the golden with its words', () => {
    const s = createSession({ ...DEFAULT_SESSION_CONFIG });
    const e = drawClassPair(s, CLASS_VARIANTS[0]);
    const pid = s.join('agent', 'llm:seeing', 900_000, 2);
    let at = 900_100;
    const read = (id: string, text: string) => s.propose({ participantId: pid, nodeId: id, edges: [], reps: [{ modality: 'transcript', data: { text }, confidence: 0.9 }], at: at++ });
    for (const [name, words] of Object.entries(A2_WORDS)) {
      const want = e.classes[name];
      want.name.forEach((id) => read(id, words.name));
      want.members.forEach((m, i) => m.ids.forEach((id) => read(id, words.members[i])));
    }
    expect(toMermaid(umlOf(s)!)!.text).toBe(A2_MERMAID_READ);
  });
});

describe('a compartment box beside flowchart symbols reads both ways', () => {
  it('the flowchart reads it as a process and the class diagram as a class, plural — the flowchart first on a board that is mostly one', () => {
    const s = createSession();
    const e = drawFlowchart(s, FLOWCHART_VARIANTS[0]);
    let t = 200_000;
    const box = s.addStroke(handShape(boxCorners(-120, 700, 150, 110), { seed: 71 }), (t += 4000));
    const line = s.addStroke(handLine({ x: -193, y: 672 }, { x: -47, y: 672 }, { seed: 72, jitter: 1.5 }), (t += 4000));
    s.addStroke(handText(-150, 652, 60, 16, { seed: 73, humps: 3, jitter: 1 }), (t += 4000));
    s.addStroke(handText(-180, 690, 90, 16, { seed: 74, humps: 4, jitter: 1 }), (t += 4000));
    s.addStroke(handArrow({ x: -42, y: 700 }, { x: 96, y: 700 }, { wings: 2, headLen: 16, seed: 75, jitter: 1 }), (t += 4000));
    const all = notationsOf(s.getState());
    const flow = all.find((r) => r.notation === 'flowchart')!;
    const uml = all.find((r) => r.notation === 'uml-class');
    expect(all[0].notation).toBe('flowchart');
    expect(uml, 'the class diagram reads it too').toBeDefined();
    expect(flow.symbols.find((x) => x.id === box)?.symbol).toBe('process');
    expect((uml!.symbols as unknown as ClassView[]).find((x) => x.ids.includes(box) && x.ids.includes(line))?.symbol).toBe('class');
    // The process it joins is what the arrow points at in both.
    expect(flow.symbols.find((x) => x.ids.includes(e.symbols.P2.ids[0]))?.symbol).toBe('process');
  });
});

describe('the negatives: nothing else reads as a class diagram above the floor', () => {
  it('the flowchart bench — thirty-six hand-drawn flowcharts', () => {
    const above: string[] = [];
    for (const v of FLOWCHART_VARIANTS) {
      const s = createSession();
      drawFlowchart(s, v);
      const r = umlOf(s);
      if (r && r.confidence >= NOTATION_FLOOR) above.push(`seed ${v.seed}: ${r.confidence.toFixed(2)} — ${r.summary}`);
    }
    expect(above).toEqual([]);
  });

  const against = (name: string, draw: (s: Session, seed: number) => unknown) =>
    it(name, () => {
      const above: string[] = [];
      for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
        const s = createSession();
        draw(s, seed);
        const r = umlOf(s);
        if (r && r.confidence >= NOTATION_FLOOR) above.push(`seed ${seed}: ${r.confidence.toFixed(2)} — ${r.summary}`);
      }
      expect(above).toEqual([]);
    });
  against('a UI wireframe: a frame holding a row of boxes is not a class', drawWireframe);
  against('the canonical molecule', drawMolecule);
  against('a line of writing', drawWriting);
});
