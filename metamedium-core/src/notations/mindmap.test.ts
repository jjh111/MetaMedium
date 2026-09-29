// The mind map as a core test (V1-PLAN §0, §9 D6): a centre with three
// branches, two of them with leaves — every node a closed shape with its word
// written in it, every branch a plain line — read as a mind map, above the
// floor and first among the readings, and export as Mermaid, the golden
// `mindmap` text. Asked through the platform's own doors (the index): the
// notation, its reading and its writer must be registered there.
//
// And the negatives: the flowchart bench's thirty-six flowcharts, the class
// bench's boards, the sequence, state and ER boards, a UI wireframe, the
// canonical molecule and a line of writing read 0 above the floor as a mind
// map — and the mind-map board reads as none of the other diagrams above the
// floor.

import { describe, it, expect } from 'vitest';
import { createSession, DEFAULT_SESSION_CONFIG, notationsOf, NOTATION_FLOOR, toMermaid } from '../index';
import type { Session, NotationReading } from '../index';
import { drawMindMap, MINDMAP_VARIANTS } from './fixtures/mindmap';
import type { MindMapExpected } from './fixtures/mindmap';
import { MINDMAP_MERMAID_UNREAD, MINDMAP_MERMAID_READ } from './fixtures/mindmap.mermaid';
import { drawFlowchart, drawWireframe, drawMolecule, drawWriting, FLOWCHART_VARIANTS } from './fixtures/flowchart';
import { drawClassDiagram, drawClassPair, CLASS_VARIANTS } from './fixtures/uml-class';
import { drawSequence, SEQUENCE_VARIANTS } from './fixtures/sequence';
import { drawState, STATE_VARIANTS } from './fixtures/state';
import { drawEr, ER_VARIANTS } from './fixtures/er';

/** What this test reads of a node and a branch — the reading's own types are the notation's. */
interface NodeView {
  id: string;
  ids: string[];
  symbol: string;
  shape: string;
  depth: number;
  parent?: string;
  children: string[];
  name: { ids: string[] };
}
interface BranchView {
  id: string;
  ids: string[];
  kind: string;
  from: string;
  to: string;
}

/** Each of these reads a few dozen boards through every registered notation: more than vitest's five seconds on a loaded machine. */
const SLOW = 120_000;

const sameSet = (a: readonly string[], b: readonly string[]) => [...a].sort().join('|') === [...b].sort().join('|');
const mapOf = (s: Session): NotationReading | undefined => notationsOf(s.getState()).find((r) => r.notation === 'mindmap');
const nodeFor = (r: NotationReading, mark: string) => (r.symbols as unknown as NodeView[]).find((p) => p.ids.includes(mark));

/** Read every piece of writing on the board as a model that can see would, by what it is. */
function readAll(s: Session, e: MindMapExpected) {
  const pid = s.join('agent', 'llm:seeing', 900_000, 2);
  let at = 900_100;
  for (const [id, text] of Object.entries(e.words)) s.propose({ participantId: pid, nodeId: id, edges: [], reps: [{ modality: 'transcript', data: { text }, confidence: 0.9 }], at: at++ });
}

describe('A6 — a mind map: a centre, three branches, two with leaves, a word in every node', () => {
  for (const v of MINDMAP_VARIANTS) {
    const label = `seed ${v.seed} jitter ${v.jitter} tilt ${v.tilt}`;

    it(`reads as a mind map, above the floor and first among the readings — ${label}`, () => {
      const s = createSession();
      drawMindMap(s, v);
      const all = notationsOf(s.getState());
      const map = all.find((r) => r.notation === 'mindmap');
      const said = `readings: ${all.map((r) => `${r.notation} ${r.confidence.toFixed(2)}`).join(', ')}`;
      expect(map, said).toBeDefined();
      expect(map!.confidence, said).toBeGreaterThanOrEqual(NOTATION_FLOOR);
      expect(all[0].notation, said).toBe('mindmap');
    });

    it(`the centre is the root; each node holds its shape and its word, and hangs from the node nearer the centre — ${label}`, () => {
      const s = createSession();
      const e = drawMindMap(s, v);
      const r = mapOf(s)!;
      expect(r).toBeDefined();
      const ns = r.symbols as unknown as NodeView[];
      expect(ns).toHaveLength(7);
      const idOf: Record<string, string> = {};
      for (const [name, want] of Object.entries(e.nodes)) {
        const got = nodeFor(r, want.box[0]);
        expect(got, name).toBeDefined();
        idOf[name] = got!.id;
        expect(sameSet(got!.ids, want.box), `${name}: ${got!.ids}`).toBe(true);
        expect(got!.symbol, name).toBe(name === 'Trip' ? 'root' : 'node');
        expect(got!.shape, name).toBe(want.shape);
        expect(got!.depth, name).toBe(want.depth);
        expect(got!.name.ids, name).toEqual(want.name);
      }
      for (const [name, want] of Object.entries(e.nodes)) {
        const got = nodeFor(r, want.box[0])!;
        expect(got.parent, `${name}'s parent`).toBe(want.parent ? idOf[want.parent] : undefined);
      }
      // Branches out of a node, clockwise from the top round the centre and from the way it faces round any other: Food, Travel, Sleep round Trip; Pizza before Ramen.
      const kids = (name: string) => (ns.find((x) => x.id === idOf[name])!.children);
      expect(kids('Trip')).toEqual([idOf.Food, idOf.Travel, idOf.Sleep]);
      expect(kids('Food')).toEqual([idOf.Pizza, idOf.Ramen]);
      expect(kids('Sleep')).toEqual([idOf.Hotel]);
      const bs = r.connectors as unknown as BranchView[];
      expect(bs.map((x) => x.kind)).toEqual(Array(6).fill('branch'));
      for (const want of e.branches) {
        const got = bs.find((x) => x.id === want.id);
        expect(got, want.name).toBeDefined();
        expect([got!.from, got!.to], want.name).toEqual([idOf[want.from], idOf[want.to]]);
      }
    });

    it(`exports the golden mindmap text before the writing is read — ${label}`, () => {
      const s = createSession();
      drawMindMap(s, v);
      const m = toMermaid(mapOf(s)!);
      expect(m, 'a writer for the mind map').not.toBeNull();
      expect(m!.diagram).toBe('mindmap');
      expect(m!.text).toBe(MINDMAP_MERMAID_UNREAD);
    });
  }

  it('and once a model that can see has read the writing, the golden with its words', () => {
    for (const v of MINDMAP_VARIANTS.slice(0, 6)) {
      const s = createSession({ ...DEFAULT_SESSION_CONFIG });
      const e = drawMindMap(s, v);
      readAll(s, e);
      expect(toMermaid(mapOf(s)!)!.text, `seed ${v.seed}`).toBe(MINDMAP_MERMAID_READ);
    }
  }, SLOW);
});

describe('the mind-map board is no other diagram above the floor', () => {
  it('no flowchart, class, sequence, state or ER diagram', () => {
    const above: string[] = [];
    for (const v of MINDMAP_VARIANTS) {
      const s = createSession();
      drawMindMap(s, v);
      for (const r of notationsOf(s.getState())) if (r.notation !== 'mindmap' && r.confidence >= NOTATION_FLOOR) above.push(`seed ${v.seed}: ${r.notation} ${r.confidence.toFixed(2)}`);
    }
    expect(above).toEqual([]);
  }, SLOW);
});

describe('the negatives: nothing else reads as a mind map above the floor', () => {
  it('the flowchart bench — thirty-six hand-drawn flowcharts', () => {
    const above: string[] = [];
    for (const v of FLOWCHART_VARIANTS) {
      const s = createSession();
      drawFlowchart(s, v);
      const r = mapOf(s);
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
        const r = mapOf(s);
        if (r && r.confidence >= NOTATION_FLOOR) above.push(`${name} seed ${v.seed}: ${r.confidence.toFixed(2)} — ${r.summary}`);
      }
    }
    expect(above).toEqual([]);
  }, SLOW);

  it('the sequence, state and ER boards — every hand: an ER diagram is boxes joined in a tree too, but its lines carry a multiplicity and a verb', () => {
    const above: string[] = [];
    for (const v of SEQUENCE_VARIANTS) {
      const s = createSession();
      drawSequence(s, v);
      const r = mapOf(s);
      if (r && r.confidence >= NOTATION_FLOOR) above.push(`sequence ${v.style} seed ${v.seed}: ${r.confidence.toFixed(2)} — ${r.summary}`);
    }
    for (const v of STATE_VARIANTS) {
      const s = createSession();
      drawState(s, v);
      const r = mapOf(s);
      if (r && r.confidence >= NOTATION_FLOOR) above.push(`state seed ${v.seed}: ${r.confidence.toFixed(2)} — ${r.summary}`);
    }
    for (const v of ER_VARIANTS) {
      const s = createSession();
      drawEr(s, v);
      const r = mapOf(s);
      if (r && r.confidence >= NOTATION_FLOOR) above.push(`er seed ${v.seed}: ${r.confidence.toFixed(2)} — ${r.summary}`);
    }
    expect(above).toEqual([]);
  }, SLOW);

  const against = (name: string, draw: (s: Session, seed: number) => unknown) =>
    it(name, () => {
      const above: string[] = [];
      for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
        const s = createSession();
        draw(s, seed);
        const r = mapOf(s);
        if (r && r.confidence >= NOTATION_FLOOR) above.push(`seed ${seed}: ${r.confidence.toFixed(2)} — ${r.summary}`);
      }
      expect(above).toEqual([]);
    }, SLOW);
  against('a UI wireframe: boxes in a frame, lines of text, nothing joining one box to another', drawWireframe);
  against('the canonical molecule — circles joined by lines, with no word in any of them', drawMolecule);
  against('a line of writing', drawWriting);
});
