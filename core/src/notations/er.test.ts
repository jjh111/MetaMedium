// The ER diagram as a core test (V1-PLAN §0, §9 D6): four entities and three
// relationships — a plain line between two boxes, its multiplicity written at
// each end and its verb beside its middle — read as an ER diagram, above the
// floor and first among the readings, and export as Mermaid, the golden
// erDiagram text. Asked through the platform's own doors (the index): the
// notation, its reading and its writer must be registered there.
//
// And the negatives: the flowchart bench's thirty-six flowcharts, the class
// bench's boards, the sequence and state boards, a UI wireframe, the canonical
// molecule and a line of writing read 0 above the floor as an ER diagram — and
// the ER board reads as none of the other diagrams above the floor.

import { describe, it, expect } from 'vitest';
import { createSession, DEFAULT_SESSION_CONFIG, notationsOf, NOTATION_FLOOR, toMermaid } from '../index';
import type { Session, NotationReading } from '../index';
import { drawEr, ER_VARIANTS } from './fixtures/er';
import type { ErExpected } from './fixtures/er';
import { ER_MERMAID_UNREAD, ER_MERMAID_READ } from './fixtures/er.mermaid';
import { drawFlowchart, drawWireframe, drawMolecule, drawWriting, FLOWCHART_VARIANTS } from './fixtures/flowchart';
import { drawClassDiagram, drawClassPair, CLASS_VARIANTS } from './fixtures/uml-class';
import { drawSequence, SEQUENCE_VARIANTS } from './fixtures/sequence';
import { drawState, STATE_VARIANTS } from './fixtures/state';

/** What this test reads of an entity and a relationship — the reading's own types are the notation's. */
interface EntityView {
  id: string;
  ids: string[];
  symbol: string;
  name: { ids: string[] };
}
interface EndView {
  entity: string;
  multiplicity?: { ids: string[] };
  cardinality: string | null;
}
interface RelationshipView {
  id: string;
  ids: string[];
  kind: string;
  from: string;
  to: string;
  labels: string[];
  sides: { from: EndView; to: EndView };
}

/** Each of these reads a few dozen boards through every registered notation: more than vitest's five seconds on a loaded machine. */
const SLOW = 120_000;

const sameSet = (a: readonly string[], b: readonly string[]) => [...a].sort().join('|') === [...b].sort().join('|');
const erOf = (s: Session): NotationReading | undefined => notationsOf(s.getState()).find((r) => r.notation === 'er');
const entityFor = (r: NotationReading, mark: string) => (r.symbols as unknown as EntityView[]).find((p) => p.ids.includes(mark));

/** Read every piece of writing on the board as a model that can see would, by what it is. */
function readAll(s: Session, e: ErExpected) {
  const pid = s.join('agent', 'llm:seeing', 900_000, 2);
  let at = 900_100;
  for (const [id, text] of Object.entries(e.words)) s.propose({ participantId: pid, nodeId: id, edges: [], reps: [{ modality: 'transcript', data: { text }, confidence: 0.9 }], at: at++ });
}

describe('A5 — an ER diagram: four entities, three relationships, a multiplicity at each end', () => {
  for (const v of ER_VARIANTS) {
    const label = `seed ${v.seed} jitter ${v.jitter} tilt ${v.tilt}`;

    it(`reads as an ER diagram, above the floor and first among the readings — ${label}`, () => {
      const s = createSession();
      drawEr(s, v);
      const all = notationsOf(s.getState());
      const er = all.find((r) => r.notation === 'er');
      const said = `readings: ${all.map((r) => `${r.notation} ${r.confidence.toFixed(2)}`).join(', ')}`;
      expect(er, said).toBeDefined();
      expect(er!.confidence, said).toBeGreaterThanOrEqual(NOTATION_FLOOR);
      expect(all[0].notation, said).toBe('er');
    });

    it(`each entity holds its box and its name; each relationship joins its two entities, with the multiplicity at each end and its verb — ${label}`, () => {
      const s = createSession();
      const e = drawEr(s, v);
      const r = erOf(s)!;
      expect(r).toBeDefined();
      const es = r.symbols as unknown as EntityView[];
      expect(es.map((x) => x.symbol)).toEqual(['entity', 'entity', 'entity', 'entity']);
      const idOf: Record<string, string> = {};
      for (const [name, want] of Object.entries(e.entities)) {
        const got = entityFor(r, want.box[0]);
        expect(got, name).toBeDefined();
        idOf[name] = got!.id;
        expect(sameSet(got!.ids, want.box), `${name}: ${got!.ids}`).toBe(true);
        expect(got!.name.ids, name).toEqual(want.name);
      }
      const rs = r.connectors as unknown as RelationshipView[];
      expect(rs.map((x) => x.kind)).toEqual(['relationship', 'relationship', 'relationship']);
      for (const want of e.relationships) {
        const got = rs.find((x) => x.id === want.id);
        expect(got, want.name).toBeDefined();
        expect([got!.from, got!.to].sort(), want.name).toEqual([idOf[want.a], idOf[want.b]].sort());
        const at = (entity: string) => (got!.sides.from.entity === idOf[entity] ? got!.sides.from : got!.sides.to);
        expect(at(want.a).multiplicity?.ids, `${want.name}: at ${want.a}`).toEqual(want.aMult);
        expect(at(want.b).multiplicity?.ids, `${want.name}: at ${want.b}`).toEqual(want.bMult);
        expect(got!.labels, `${want.name}: its verb`).toEqual(want.verb);
      }
    });

    it(`exports the golden erDiagram text before the writing is read — ${label}`, () => {
      const s = createSession();
      drawEr(s, v);
      const m = toMermaid(erOf(s)!);
      expect(m, 'a writer for the ER diagram').not.toBeNull();
      expect(m!.diagram).toBe('erDiagram');
      expect(m!.text).toBe(ER_MERMAID_UNREAD);
    });
  }

  it('and once a model that can see has read the writing, the golden with its words and the cardinality each end says', () => {
    for (const v of ER_VARIANTS.slice(0, 6)) {
      const s = createSession({ ...DEFAULT_SESSION_CONFIG });
      const e = drawEr(s, v);
      readAll(s, e);
      const r = erOf(s)!;
      expect(toMermaid(r)!.text, `seed ${v.seed}`).toBe(ER_MERMAID_READ);
      const rs = r.connectors as unknown as RelationshipView[];
      const cardinalityAt = (id: string, entity: string) => {
        const got = rs.find((x) => x.id === id)!;
        return got.sides.from.entity === entity ? got.sides.from.cardinality : got.sides.to.cardinality;
      };
      const idOf = (name: keyof typeof e.entities) => entityFor(r, e.entities[name].box[0])!.id;
      const [r1, r2, r3] = e.relationships;
      expect([cardinalityAt(r1.id, idOf('Customer')), cardinalityAt(r1.id, idOf('Order'))]).toEqual(['one', 'zero-many']);
      expect([cardinalityAt(r2.id, idOf('Order')), cardinalityAt(r2.id, idOf('LineItem'))]).toEqual(['one', 'one-many']);
      expect([cardinalityAt(r3.id, idOf('Order')), cardinalityAt(r3.id, idOf('Invoice'))]).toEqual(['one', 'zero-one']);
    }
  }, SLOW);
});

describe('the ER board is no other diagram above the floor', () => {
  it('no class diagram, no sequence diagram, no state diagram; a flowchart, if any, below the ER diagram', () => {
    const above: string[] = [];
    for (const v of ER_VARIANTS) {
      const s = createSession();
      drawEr(s, v);
      for (const r of notationsOf(s.getState())) if (r.notation !== 'er' && r.confidence >= NOTATION_FLOOR) above.push(`seed ${v.seed}: ${r.notation} ${r.confidence.toFixed(2)}`);
    }
    expect(above).toEqual([]);
  }, SLOW);
});

describe('the negatives: nothing else reads as an ER diagram above the floor', () => {
  it('the flowchart bench — thirty-six hand-drawn flowcharts', () => {
    const above: string[] = [];
    for (const v of FLOWCHART_VARIANTS) {
      const s = createSession();
      drawFlowchart(s, v);
      const r = erOf(s);
      if (r && r.confidence >= NOTATION_FLOOR) above.push(`seed ${v.seed}: ${r.confidence.toFixed(2)} — ${r.summary}`);
    }
    expect(above).toEqual([]);
  }, SLOW);

  it('the class bench — its six-class board and A2, every hand', () => {
    const above: string[] = [];
    for (const v of CLASS_VARIANTS) {
      for (const [name, draw] of [['board', drawClassDiagram], ['A2', drawClassPair]] as const) {
        const s = createSession();
        draw(s, v);
        const r = erOf(s);
        if (r && r.confidence >= NOTATION_FLOOR) above.push(`${name} seed ${v.seed}: ${r.confidence.toFixed(2)} — ${r.summary}`);
      }
    }
    expect(above).toEqual([]);
  }, SLOW);

  it('the sequence board and the state board — every hand', () => {
    const above: string[] = [];
    for (const v of SEQUENCE_VARIANTS) {
      const s = createSession();
      drawSequence(s, v);
      const r = erOf(s);
      if (r && r.confidence >= NOTATION_FLOOR) above.push(`sequence ${v.style} seed ${v.seed}: ${r.confidence.toFixed(2)} — ${r.summary}`);
    }
    for (const v of STATE_VARIANTS) {
      const s = createSession();
      drawState(s, v);
      const r = erOf(s);
      if (r && r.confidence >= NOTATION_FLOOR) above.push(`state seed ${v.seed}: ${r.confidence.toFixed(2)} — ${r.summary}`);
    }
    expect(above).toEqual([]);
  }, SLOW);

  const against = (name: string, draw: (s: Session, seed: number) => unknown) =>
    it(name, () => {
      const above: string[] = [];
      for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
        const s = createSession();
        draw(s, seed);
        const r = erOf(s);
        if (r && r.confidence >= NOTATION_FLOOR) above.push(`seed ${seed}: ${r.confidence.toFixed(2)} — ${r.summary}`);
      }
      expect(above).toEqual([]);
    }, SLOW);
  against('a UI wireframe: boxes in a frame, lines of text, nothing joining one box to another', drawWireframe);
  against('the canonical molecule', drawMolecule);
  against('a line of writing', drawWriting);
});
