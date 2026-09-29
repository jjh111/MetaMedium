// A3 as a core test (V1-PLAN §0, §9 D5): three lifelines and four messages
// read as a sequence diagram — above the floor, and first among the readings
// — and export as Mermaid, the golden sequenceDiagram text, the messages in
// the order they run down the page. Asked through the platform's own doors
// (the index): the notation, its reading and its writer must be registered
// there.
//
// And the negatives: the flowchart bench's thirty-six flowcharts, the class
// bench's boards, a UI wireframe, the canonical molecule and a line of
// writing read 0 above the floor as a sequence diagram.

import { describe, it, expect } from 'vitest';
import { createSession, DEFAULT_SESSION_CONFIG, notationsOf, NOTATION_FLOOR, toMermaid } from '../index';
import type { Session, NotationReading } from '../index';
import { drawSequence, A3_WORDS, SEQUENCE_VARIANTS } from './fixtures/sequence';
import type { SequenceExpected } from './fixtures/sequence';
import { A3_MERMAID_UNREAD, A3_MERMAID_READ, A3_ACTOR_MERMAID_READ } from './fixtures/sequence.mermaid';
import { drawFlowchart, drawWireframe, drawMolecule, drawWriting, FLOWCHART_VARIANTS } from './fixtures/flowchart';
import { drawClassDiagram, drawClassPair, CLASS_VARIANTS } from './fixtures/uml-class';

/** What this test reads of a participant and a message — the reading's own types are the notation's. */
interface ParticipantView {
  id: string;
  ids: string[];
  symbol: string;
  figure: string[];
  lifeline: string[];
  name: { ids: string[] };
}
interface MessageView {
  id: string;
  ids: string[];
  kind: string;
  from: string;
  to: string;
  labels: string[];
}

const sameSet = (a: readonly string[], b: readonly string[]) => [...a].sort().join('|') === [...b].sort().join('|');
const sequenceOf = (s: Session): NotationReading | undefined => notationsOf(s.getState()).find((r) => r.notation === 'sequence');
/** The participant a reading holds for an expected one: the symbol drawn with its box, or its figure's head. */
const participantFor = (r: NotationReading, want: SequenceExpected['participants']['Alice']) => (r.symbols as unknown as ParticipantView[]).find((p) => p.figure.includes(want.figure[0]));
const BOXES = SEQUENCE_VARIANTS.filter((v) => v.style !== 'actor');

/** Read every piece of writing on the board as a model that can see would, by what it is. */
function readAll(s: Session, e: SequenceExpected) {
  const pid = s.join('agent', 'llm:seeing', 900_000, 2);
  let at = 900_100;
  const read = (id: string, text: string) => s.propose({ participantId: pid, nodeId: id, edges: [], reps: [{ modality: 'transcript', data: { text }, confidence: 0.9 }], at: at++ });
  for (const [name, p] of Object.entries(e.participants)) p.name.forEach((id) => read(id, A3_WORDS.names[name as keyof typeof A3_WORDS.names]));
  e.messages.forEach((m, i) => m.label.forEach((id) => read(id, A3_WORDS.messages[i])));
}

/** These read a few dozen boards through every registered notation: more than vitest's five seconds on a loaded machine. */
const SLOW = 120_000;

describe('A3 — three lifelines and four messages', () => {
  for (const v of BOXES) {
    const label = `${v.style} lifelines, seed ${v.seed} jitter ${v.jitter} tilt ${v.tilt} chevron after ${v.headAfter} ms`;

    it(`reads as a sequence diagram, above the floor and first among the readings — ${label}`, () => {
      const s = createSession();
      drawSequence(s, v);
      const all = notationsOf(s.getState());
      const seq = all.find((r) => r.notation === 'sequence');
      expect(seq, `readings: ${all.map((r) => `${r.notation} ${r.confidence.toFixed(2)}`).join(', ')}`).toBeDefined();
      expect(seq!.confidence).toBeGreaterThanOrEqual(NOTATION_FLOOR);
      expect(all[0].notation).toBe('sequence');
    });

    it(`each participant holds its box and its lifeline, its name the writing in the box; the messages run down the page, each from and to the lifelines it joins — ${label}`, () => {
      const s = createSession();
      const e = drawSequence(s, v);
      const r = sequenceOf(s)!;
      expect(r).toBeDefined();
      const ps = r.symbols as unknown as ParticipantView[];
      expect(ps.map((p) => p.symbol)).toEqual(['participant', 'participant', 'participant']);
      const idOf: Record<string, string> = {};
      for (const [name, want] of Object.entries(e.participants)) {
        const got = participantFor(r, want);
        expect(got, name).toBeDefined();
        idOf[name] = got!.id;
        expect(sameSet(got!.figure, want.figure), `${name}: figure ${got!.figure}`).toBe(true);
        expect(sameSet(got!.lifeline, want.lifeline), `${name}: lifeline ${got!.lifeline.length} marks, wanted ${want.lifeline.length}`).toBe(true);
        expect(got!.name.ids).toEqual(want.name);
      }
      // Left to right, as the drawing stands them.
      expect(ps.map((p) => p.id)).toEqual([idOf.Alice, idOf.Bob, idOf.Carol]);
      const ms = r.connectors as unknown as MessageView[];
      expect(ms.map((m) => m.kind)).toEqual(['call', 'self', 'call', 'return']);
      e.messages.forEach((want, i) => {
        const got = ms[i];
        expect(sameSet(got.ids, want.ids), `${want.name}: ${got.ids.length} marks, wanted ${want.ids.length}`).toBe(true);
        expect(got.from, want.name).toBe(idOf[want.from]);
        // The return crosses Bob's lifeline on its way and ends at Alice's.
        expect(got.to, want.name).toBe(idOf[want.to]);
        expect(got.labels, want.name).toEqual(want.label);
      });
    });

    it(`exports the golden sequenceDiagram text before the writing is read — ${label}`, () => {
      const s = createSession();
      drawSequence(s, v);
      const m = toMermaid(sequenceOf(s)!);
      expect(m, 'a writer for the sequence diagram').not.toBeNull();
      expect(m!.diagram).toBe('sequenceDiagram');
      expect(m!.text).toBe(A3_MERMAID_UNREAD);
    });
  }

  it('and once a model that can see has read the writing, the golden with its words', () => {
    const s = createSession({ ...DEFAULT_SESSION_CONFIG });
    const e = drawSequence(s, SEQUENCE_VARIANTS[0]);
    readAll(s, e);
    expect(toMermaid(sequenceOf(s)!)!.text).toBe(A3_MERMAID_READ);
  });

  it('Alice drawn as a stick figure — a circle over a body, arms and legs, her name under it — is an actor', () => {
    for (const v of SEQUENCE_VARIANTS.filter((x) => x.style === 'actor')) {
      const s = createSession();
      const e = drawSequence(s, v);
      const r = sequenceOf(s);
      expect(r, `seed ${v.seed}`).toBeDefined();
      expect(r!.confidence).toBeGreaterThanOrEqual(NOTATION_FLOOR);
      const alice = participantFor(r!, e.participants.Alice)!;
      expect(alice.symbol, `seed ${v.seed}`).toBe('actor');
      expect(sameSet(alice.figure, e.participants.Alice.figure), `seed ${v.seed}: ${alice.figure}`).toBe(true);
      readAll(s, e);
      expect(toMermaid(sequenceOf(s)!)!.text, `seed ${v.seed}`).toBe(A3_ACTOR_MERMAID_READ);
    }
  }, SLOW);
});

describe('the negatives: nothing else reads as a sequence diagram above the floor', () => {
  it('the flowchart bench — thirty-six hand-drawn flowcharts', () => {
    const above: string[] = [];
    for (const v of FLOWCHART_VARIANTS) {
      const s = createSession();
      drawFlowchart(s, v);
      const r = sequenceOf(s);
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
        const r = sequenceOf(s);
        if (r && r.confidence >= NOTATION_FLOOR) above.push(`${name} seed ${v.seed}: ${r.confidence.toFixed(2)} — ${r.summary}`);
      }
    }
    expect(above).toEqual([]);
  }, SLOW);

  const against = (name: string, draw: (s: Session, seed: number) => unknown) =>
    it(name, () => {
      const above: string[] = [];
      for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
        const s = createSession();
        draw(s, seed);
        const r = sequenceOf(s);
        if (r && r.confidence >= NOTATION_FLOOR) above.push(`seed ${seed}: ${r.confidence.toFixed(2)} — ${r.summary}`);
      }
      expect(above).toEqual([]);
    }, SLOW);
  against('a UI wireframe: boxes in a frame, lines of text, nothing hanging from a box', drawWireframe);
  against('the canonical molecule', drawMolecule);
  against('a line of writing', drawWriting);
});
