// The state diagram as a core test (V1-PLAN §0, §9 D5's state half): three
// rounded states, an initial dot, a final ring and six transitions — one of
// them a loop out of a state and back — read as a state diagram, above the
// floor and first among the readings, and export as Mermaid, the golden
// stateDiagram-v2 text. Asked through the platform's own doors (the index):
// the notation, its reading and its writer must be registered there.
//
// And the negatives: the flowchart bench's thirty-six flowcharts, the class
// bench's boards, the sequence board, a UI wireframe, the canonical molecule
// and a line of writing read 0 above the floor as a state diagram — and the
// state board reads as none of the other diagrams above the floor.

import { describe, it, expect } from 'vitest';
import { createSession, DEFAULT_SESSION_CONFIG, notationsOf, NOTATION_FLOOR, toMermaid } from '../index';
import type { Session, NotationReading } from '../index';
import { drawState, STATE_WORDS, STATE_VARIANTS } from './fixtures/state';
import type { StateExpected } from './fixtures/state';
import { STATE_MERMAID_UNREAD, STATE_MERMAID_READ } from './fixtures/state.mermaid';
import { drawFlowchart, drawWireframe, drawMolecule, drawWriting, FLOWCHART_VARIANTS } from './fixtures/flowchart';
import { drawClassDiagram, drawClassPair, CLASS_VARIANTS } from './fixtures/uml-class';
import { drawSequence, SEQUENCE_VARIANTS } from './fixtures/sequence';

/** What this test reads of a symbol and a transition — the reading's own types are the notation's. */
interface SymbolView {
  id: string;
  ids: string[];
  symbol: string;
  labels: string[];
}
interface TransitionView {
  id: string;
  ids: string[];
  kind: string;
  from: string;
  to: string;
  labels: string[];
  self: boolean;
}

const sameSet = (a: readonly string[], b: readonly string[]) => [...a].sort().join('|') === [...b].sort().join('|');
const stateOf = (s: Session): NotationReading | undefined => notationsOf(s.getState()).find((r) => r.notation === 'state');
const symbolFor = (r: NotationReading, mark: string) => (r.symbols as unknown as SymbolView[]).find((p) => p.ids.includes(mark));

/** Read every piece of writing on the board as a model that can see would, by what it is. */
function readAll(s: Session, e: StateExpected) {
  const pid = s.join('agent', 'llm:seeing', 900_000, 2);
  let at = 900_100;
  const read = (id: string, text: string) => s.propose({ participantId: pid, nodeId: id, edges: [], reps: [{ modality: 'transcript', data: { text }, confidence: 0.9 }], at: at++ });
  for (const [name, st] of Object.entries(e.states)) st.name.forEach((id) => read(id, STATE_WORDS.names[name as keyof typeof STATE_WORDS.names]));
  e.transitions.filter((t) => t.label.length).forEach((t, i) => t.label.forEach((id) => read(id, STATE_WORDS.transitions[i])));
}

describe('A4 — a state diagram: three states, an initial dot, a final ring, six transitions', () => {
  for (const v of STATE_VARIANTS) {
    const label = `seed ${v.seed} jitter ${v.jitter} tilt ${v.tilt}, dot ${v.dot}, final ${v.final}`;

    it(`reads as a state diagram, above the floor and first among the readings — ${label}`, () => {
      const s = createSession();
      drawState(s, v);
      const all = notationsOf(s.getState());
      const st = all.find((r) => r.notation === 'state');
      expect(st, `readings: ${all.map((r) => `${r.notation} ${r.confidence.toFixed(2)}`).join(', ')}`).toBeDefined();
      expect(st!.confidence).toBeGreaterThanOrEqual(NOTATION_FLOOR);
      expect(all[0].notation, `readings: ${all.map((r) => `${r.notation} ${r.confidence.toFixed(2)}`).join(', ')}`).toBe('state');
    });

    it(`three states with their names, an initial dot and a final ring, and six transitions each from and to what it joins — ${label}`, () => {
      const s = createSession();
      const e = drawState(s, v);
      const r = stateOf(s)!;
      expect(r).toBeDefined();
      const symbols = r.symbols as unknown as SymbolView[];
      expect(symbols.map((p) => p.symbol).sort()).toEqual(['final', 'initial', 'state', 'state', 'state']);
      const idOf: Record<string, string> = {};
      for (const [name, want] of Object.entries(e.states)) {
        const got = symbolFor(r, want.box[0]);
        expect(got, name).toBeDefined();
        idOf[name] = got!.id;
        expect(got!.symbol, name).toBe('state');
        expect(sameSet(got!.ids, want.box), `${name}: ${got!.ids}`).toBe(true);
        expect(got!.labels, name).toEqual(want.name);
      }
      const initial = symbolFor(r, e.initial[0]);
      expect(initial, 'the initial dot').toBeDefined();
      expect(initial!.symbol).toBe('initial');
      expect(sameSet(initial!.ids, e.initial)).toBe(true);
      idOf.initial = initial!.id;
      const final = symbolFor(r, e.final[0]);
      expect(final, 'the final ring').toBeDefined();
      expect(final!.symbol).toBe('final');
      expect(sameSet(final!.ids, e.final), `the ring and what is inside it: ${final!.ids}`).toBe(true);
      idOf.final = final!.id;

      const ts = r.connectors as unknown as TransitionView[];
      expect(ts.map((t) => t.kind)).toEqual(Array(6).fill('transition'));
      for (const want of e.transitions) {
        const got = ts.find((t) => t.id === want.id);
        expect(got, want.name).toBeDefined();
        expect(got!.from, `${want.name}: from`).toBe(idOf[want.from]);
        expect(got!.to, `${want.name}: to`).toBe(idOf[want.to]);
        expect(got!.self, want.name).toBe(want.self);
        expect(got!.labels, want.name).toEqual(want.label);
      }
    });

    it(`exports the golden stateDiagram-v2 text before the writing is read — ${label}`, () => {
      const s = createSession();
      drawState(s, v);
      const m = toMermaid(stateOf(s)!);
      expect(m, 'a writer for the state diagram').not.toBeNull();
      expect(m!.diagram).toBe('stateDiagram-v2');
      expect(m!.text).toBe(STATE_MERMAID_UNREAD);
    });
  }

  it('and once a model that can see has read the writing, the golden with its words', () => {
    for (const v of STATE_VARIANTS.slice(0, 6)) {
      const s = createSession({ ...DEFAULT_SESSION_CONFIG });
      const e = drawState(s, v);
      readAll(s, e);
      expect(toMermaid(stateOf(s)!)!.text, `seed ${v.seed}`).toBe(STATE_MERMAID_READ);
    }
  });
});

describe('the state board is no other diagram above the floor — the flowchart reads it and says it is a flowchart, lower', () => {
  it('no class diagram and no sequence diagram; a flowchart below the state diagram', () => {
    const above: string[] = [];
    for (const v of STATE_VARIANTS) {
      const s = createSession();
      drawState(s, v);
      for (const r of notationsOf(s.getState())) if (r.notation !== 'state' && r.notation !== 'flowchart' && r.confidence >= NOTATION_FLOOR) above.push(`seed ${v.seed}: ${r.notation} ${r.confidence.toFixed(2)}`);
    }
    expect(above).toEqual([]);
  });
});

describe('the negatives: nothing else reads as a state diagram above the floor', () => {
  it('the flowchart bench — thirty-six hand-drawn flowcharts', () => {
    const above: string[] = [];
    for (const v of FLOWCHART_VARIANTS) {
      const s = createSession();
      drawFlowchart(s, v);
      const r = stateOf(s);
      if (r && r.confidence >= NOTATION_FLOOR) above.push(`seed ${v.seed}: ${r.confidence.toFixed(2)} — ${r.summary}`);
    }
    expect(above).toEqual([]);
  });

  it('the class bench — its six-class board and A2, every hand', () => {
    const above: string[] = [];
    for (const v of CLASS_VARIANTS) {
      for (const [name, draw] of [['board', drawClassDiagram], ['A2', drawClassPair]] as const) {
        const s = createSession();
        draw(s, v);
        const r = stateOf(s);
        if (r && r.confidence >= NOTATION_FLOOR) above.push(`${name} seed ${v.seed}: ${r.confidence.toFixed(2)} — ${r.summary}`);
      }
    }
    expect(above).toEqual([]);
  });

  it('the sequence board — every hand', () => {
    const above: string[] = [];
    for (const v of SEQUENCE_VARIANTS) {
      const s = createSession();
      drawSequence(s, v);
      const r = stateOf(s);
      if (r && r.confidence >= NOTATION_FLOOR) above.push(`${v.style} seed ${v.seed}: ${r.confidence.toFixed(2)} — ${r.summary}`);
    }
    expect(above).toEqual([]);
  });

  const against = (name: string, draw: (s: Session, seed: number) => unknown) =>
    it(name, () => {
      const above: string[] = [];
      for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
        const s = createSession();
        draw(s, seed);
        const r = stateOf(s);
        if (r && r.confidence >= NOTATION_FLOOR) above.push(`seed ${seed}: ${r.confidence.toFixed(2)} — ${r.summary}`);
      }
      expect(above).toEqual([]);
    });
  against('a UI wireframe: boxes in a frame, lines of text, nothing joined by an arrow', drawWireframe);
  against('the canonical molecule', drawMolecule);
  against('a line of writing', drawWriting);
});
