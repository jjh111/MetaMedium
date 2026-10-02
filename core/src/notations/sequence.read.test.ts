// The sequence notation, rule by rule (V1-PLAN §3, §9 D5). A3's acceptance is
// sequence.test.ts and the rates are sequence.bench.test.ts; here, each rule
// the reading rests on, pinned where it can break.

import { describe, it, expect } from 'vitest';
import { createSession } from '../session/session';
import type { Session } from '../session/session';
import type { Point } from '../types';
import { ROLES } from '../diagram/roles';
import { notationsOf, notationById, registeredNotations, describeNotation } from './notation';
import { readSequence, sequencePortsOf, SEQUENCE, SEQUENCE_TABLE, LIFELINE_OF_BOX } from './sequence';
import type { SequenceReading } from './sequence';
import { drawSequence, SEQUENCE_VARIANTS, handPath, selfLoop } from './fixtures/sequence';
import { handShape, boxCorners, boxInFour } from './fixtures/hand';
import { triangleHead } from './fixtures/uml-class';
import { handArrow, handCircle, handLine, handText } from '../test/strokes';

const seqOf = (s: Session) => notationsOf(s.getState()).find((r) => r.notation === 'sequence') as SequenceReading | undefined;

/** Participants at the given x's — each a box over a lifeline — and a clock to draw on with. */
function board(xs: number[], o: { top?: number; bottom?: number; seed?: number } = {}) {
  const s = createSession();
  let t = 1000;
  const tick = (gap = 4000) => (t += gap);
  const top = o.top ?? 40, bottom = o.bottom ?? 520, seed = o.seed ?? 1;
  const boxes = xs.map((x, i) => s.addStroke(handShape(boxCorners(x, top + 28, 130, 56), { seed: seed * 10 + i }), tick()));
  const lifelines = xs.map((x, i) => s.addStroke(handLine({ x, y: top + 59 }, { x: x + 1, y: bottom }, { seed: seed * 20 + i, jitter: 1 }), tick()));
  const arrow = (from: Point, to: Point, k = 1) => s.addStroke(handArrow(from, to, { wings: 2, headLen: 14, seed: seed * 30 + k, jitter: 1 }), tick());
  return { s, boxes, lifelines, tick, arrow };
}

describe('the notation', () => {
  it('is registered beside the flowchart and the class diagram; two symbols and three messages, each one of the six roles; its content one table, which the pack names', () => {
    expect(registeredNotations()).toEqual(expect.arrayContaining(['flowchart', 'uml-class', 'sequence']));
    expect(notationById('sequence')).toBe(SEQUENCE);
    expect(SEQUENCE.symbols.map((x) => x.name)).toEqual(['participant', 'actor']);
    expect(SEQUENCE.connectors.map((x) => x.name)).toEqual(['call', 'return', 'self']);
    for (const d of [...SEQUENCE.symbols, ...SEQUENCE.connectors]) expect(ROLES).toContain(d.role);
    expect(SEQUENCE_TABLE.pack).toBe('sequence@1');
    expect(SEQUENCE_TABLE.connectors.call.mermaid).toEqual({ head: '->>', none: '->', both: '<<->>' });
    expect(SEQUENCE_TABLE.connectors.return.mermaid).toEqual({ head: '-->>', none: '-->', both: '<<-->>' });
  });

  it('every mark in the scope plays one of the six roles under it, and says so in one line', () => {
    const s = createSession();
    const e = drawSequence(s, SEQUENCE_VARIANTS[12]);
    const r = readSequence(s.getState())!;
    for (const role of Object.values(r.roles)) expect(ROLES).toContain(role);
    expect(Object.keys(r.roles).sort()).toEqual([...s.getState().contentIds].sort());
    expect(r.unplaced).toEqual([]);
    expect(describeNotation(r)).toMatch(/^a sequence diagram 0\.\d\d — three participants, two calls, one return, one self-message$/);
    // The box and every dash of its lifeline are the participant; the messages edges; the writing labels.
    for (const id of [...e.participants.Bob.figure, ...e.participants.Bob.lifeline]) expect(r.roles[id]).toBe('node');
    expect(r.roles[e.messages[0].ids[0]]).toBe('edge');
    for (const m of e.messages) for (const id of m.label) expect(r.roles[id]).toBe('label');
  });

  it('derived: reading writes nothing, and reads the same again', () => {
    const s = createSession();
    drawSequence(s, SEQUENCE_VARIANTS[2]);
    const events = s.getEvents().length, nodes = s.getState().nodes.size;
    const a = JSON.stringify(readSequence(s.getState()));
    expect(JSON.stringify(readSequence(s.getState()))).toBe(a);
    expect(s.getEvents().length).toBe(events);
    expect(s.getState().nodes.size).toBe(nodes);
  });

  it('the hand’s space: the board drawn at 0.5× and 2× reads as it does at 1×', () => {
    const one = createSession();
    drawSequence(one, SEQUENCE_VARIANTS[13]);
    const said = (r: SequenceReading | null) => r && `${r.summary} | ${r.connectors.map((m) => `${m.order} ${m.kind} ${m.arrow}`).join(', ')} | ${r.symbols.map((p) => `${p.symbol} ${p.lifeline.length}`).join(', ')}`;
    for (const k of [0.5, 2]) {
      const s = createSession();
      for (const e of one.getEvents()) if (e.type === 'stroke') s.addStroke(e.points.map((p) => ({ x: p.x * k, y: p.y * k })), e.at, undefined, k);
      expect(said(readSequence(s.getState())), `at ${k}×`).toBe(said(readSequence(one.getState())));
    }
  });
});

describe('participants are read from the geometry, never the relation or role tables (the trap)', () => {
  it('a box with a long line from its bottom middle is a participant — the line its lifeline, a node, though the relation table has it touch the box', () => {
    const b = board([150, 450]);
    const m = b.arrow({ x: 153, y: 200 }, { x: 446, y: 201 });
    const r = seqOf(b.s)!;
    expect(r.symbols.map((p) => [p.id, p.lifeline])).toEqual([[b.boxes[0], [b.lifelines[0]]], [b.boxes[1], [b.lifelines[1]]]]);
    expect(r.roles[b.lifelines[0]]).toBe('node');
    expect(r.connectors.map((c) => [c.id, c.from, c.to, c.arrow])).toEqual([[m, b.boxes[0], b.boxes[1], '->>']]);
  });

  it('two participants and no message between them are no sequence diagram; nor is one participant with a message to itself', () => {
    const b = board([150, 450]);
    expect(seqOf(b.s)).toBeUndefined();
    b.s.addStroke(selfLoop(154, 200, 60, 40, { seed: 3 }), b.tick());
    expect(seqOf(b.s)).toBeUndefined();
  });

  it('a flowchart’s flow is no lifeline: an arrow down from a box to the box below it', () => {
    const s = createSession();
    let t = 0;
    for (const x of [150, 450]) {
      s.addStroke(handShape(boxCorners(x, 68, 130, 56), { seed: x }), (t += 4000));
      s.addStroke(handShape(boxCorners(x, 400, 130, 56), { seed: x + 1 }), (t += 4000));
      s.addStroke(handArrow({ x, y: 99 }, { x, y: 368 }, { wings: 2, headLen: 14, seed: x, jitter: 1 }), (t += 4000));
    }
    s.addStroke(handArrow({ x: 216, y: 230 }, { x: 384, y: 230 }, { wings: 2, headLen: 14, seed: 9, jitter: 1 }), (t += 4000));
    expect(readSequence(s.getState())).toBeNull();
  });

  it('a line that lands on another box is no lifeline, and neither is one with a head drawn at its top — a class diagram’s relation', () => {
    const s = createSession();
    let t = 0;
    // Left: a line from under a box down onto another box. Right: a line with a hollow triangle at its top.
    s.addStroke(handShape(boxCorners(150, 68, 130, 56), { seed: 1 }), (t += 4000));
    s.addStroke(handShape(boxCorners(150, 460, 130, 56), { seed: 2 }), (t += 4000));
    s.addStroke(handLine({ x: 150, y: 99 }, { x: 150, y: 430 }, { seed: 3, jitter: 1 }), (t += 4000));
    s.addStroke(handShape(boxCorners(450, 68, 130, 56), { seed: 4 }), (t += 4000));
    s.addStroke(triangleHead({ x: 450, y: 98 }, { x: 0, y: -1 }, 20, { seed: 5 }), (t += 4000));
    s.addStroke(handLine({ x: 450, y: 118 }, { x: 451, y: 520 }, { seed: 6, jitter: 1 }), (t += 4000));
    s.addStroke(handArrow({ x: 153, y: 250 }, { x: 446, y: 250 }, { wings: 2, headLen: 14, seed: 7, jitter: 1 }), (t += 4000));
    expect(readSequence(s.getState())).toBeNull();
  });

  it(`a lifeline is longer than its box is tall — ${LIFELINE_OF_BOX} times — or it is a stub`, () => {
    const b = board([150, 450], { bottom: 150 });
    b.arrow({ x: 153, y: 130 }, { x: 446, y: 131 });
    expect(seqOf(b.s)).toBeUndefined();
  });

  it('a box ruled in four strokes is a participant; its id is its figure’s', () => {
    const s = createSession();
    let t = 0;
    const ruled = boxInFour(boxCorners(150, 68, 130, 56), { seed: 3 }).map((pts) => s.addStroke(pts, (t += 1000)));
    const box = s.addStroke(handShape(boxCorners(450, 68, 130, 56), { seed: 4 }), (t += 4000));
    s.addStroke(handLine({ x: 150, y: 99 }, { x: 151, y: 520 }, { seed: 5, jitter: 1 }), (t += 4000));
    s.addStroke(handLine({ x: 450, y: 99 }, { x: 451, y: 520 }, { seed: 6, jitter: 1 }), (t += 4000));
    s.addStroke(handArrow({ x: 153, y: 250 }, { x: 446, y: 250 }, { wings: 2, headLen: 14, seed: 7, jitter: 1 }), (t += 4000));
    const r = readSequence(s.getState())!;
    expect(r.symbols.map((p) => p.id)).toEqual([`figure:${[...ruled].sort().join('+')}`, box]);
    expect(r.symbols[0].figure.slice().sort()).toEqual([...ruled].sort());
  });

  it('a stick figure is an actor: a circle, a body down from under it and another short line; a circle with only a body is not', () => {
    const s = createSession();
    let t = 0;
    const head = s.addStroke(handCircle(150, 40, 13, { seed: 1, jitter: 1 }), (t += 4000));
    const body = s.addStroke(handLine({ x: 150, y: 54 }, { x: 151, y: 86 }, { seed: 2, jitter: 0.6 }), (t += 4000));
    s.addStroke(handShape(boxCorners(450, 68, 130, 56), { seed: 3 }), (t += 4000));
    s.addStroke(handLine({ x: 150, y: 130 }, { x: 151, y: 520 }, { seed: 4, jitter: 1 }), (t += 4000));
    s.addStroke(handLine({ x: 450, y: 99 }, { x: 451, y: 520 }, { seed: 5, jitter: 1 }), (t += 4000));
    s.addStroke(handArrow({ x: 153, y: 250 }, { x: 446, y: 250 }, { wings: 2, headLen: 14, seed: 6, jitter: 1 }), (t += 4000));
    expect(readSequence(s.getState())).toBeNull();
    const legs = s.addStroke(handPath([{ x: 136, y: 110 }, { x: 151, y: 86 }, { x: 165, y: 110 }], { seed: 7, jitter: 0.5, density: 0.8 }), (t += 4000));
    const name = s.addStroke(handText(122, 114, 56, 14, { seed: 8, humps: 3, jitter: 1 }), (t += 4000));
    const r = readSequence(s.getState())!;
    expect(r.symbols[0].symbol).toBe('actor');
    expect(r.symbols[0].figure).toEqual([head, body, legs]);
    expect(r.symbols[0].name.ids).toEqual([name]);
    expect(r.symbols[0].reason).toMatch(/stick figure/);
  });
});

describe('messages: where their ends land, their heads, their order and their words', () => {
  it('a message goes where its ends land, past its head — across every lifeline between', () => {
    const b = board([150, 400, 650, 900]);
    const m = b.arrow({ x: 896, y: 300 }, { x: 154, y: 302 });
    const r = seqOf(b.s)!;
    const got = r.connectors.find((c) => c.id === m)!;
    expect([got.from, got.to]).toEqual([b.boxes[3], b.boxes[0]]);
    expect(got.ends.to.head?.kind).toBe('arrow');
  });

  it('a line with no head is `->`, from the lifeline it was drawn from; heads at both ends `<<->>`', () => {
    const b = board([150, 450]);
    const plain = b.s.addStroke(handLine({ x: 447, y: 200 }, { x: 153, y: 201 }, { seed: 4, jitter: 1 }), b.tick());
    const both = b.s.addStroke(handArrow({ x: 153, y: 300 }, { x: 446, y: 300 }, { wings: 2, headLen: 14, seed: 5, jitter: 1 }), b.tick());
    b.s.addStroke(triangleHead({ x: 152, y: 300 }, { x: -1, y: 0 }, 16, { seed: 6 }), b.tick());
    const r = seqOf(b.s)!;
    const p = r.connectors.find((c) => c.id === plain)!, q = r.connectors.find((c) => c.id === both)!;
    expect([p.arrow, p.from, p.to, p.directed]).toEqual(['->', b.boxes[1], b.boxes[0], false]);
    expect([q.arrow, q.direction]).toEqual(['<<->>', 'both']);
  });

  it('a message steeper than a message is none: a line from one lifeline down to another', () => {
    const b = board([150, 450]);
    b.arrow({ x: 153, y: 150 }, { x: 446, y: 450 });
    expect(seqOf(b.s)).toBeUndefined();
  });

  it('messages are in order down the page, whatever order they were drawn in', () => {
    const b = board([150, 450]);
    const low = b.arrow({ x: 153, y: 400 }, { x: 446, y: 400 }, 1);
    const high = b.arrow({ x: 446, y: 180 }, { x: 153, y: 180 }, 2);
    const mid = b.arrow({ x: 153, y: 290 }, { x: 446, y: 290 }, 3);
    expect(seqOf(b.s)!.connectors.map((c) => [c.id, c.order])).toEqual([[high, 1], [mid, 2], [low, 3]]);
  });

  it('a message bound by a magnet to a lifeline lands there, and says so', () => {
    const b = board([150, 450]);
    const m = b.arrow({ x: 153, y: 250 }, { x: 446, y: 250 });
    b.s.bind({ strokeId: m, nodeId: b.lifelines[1], site: { kind: 'along:sequence', index: 400 }, end: 'end', at: b.tick() });
    const got = seqOf(b.s)!.connectors[0];
    expect(got.ends.to.bound).toBe(true);
    expect(got.to).toBe(b.boxes[1]);
  });

  it('a self-message: a loop out and back — its barb where it comes back, `->>`; no barb, `->`; to the left of the last lifeline', () => {
    const b = board([150, 450]);
    b.arrow({ x: 153, y: 150 }, { x: 446, y: 150 });
    const barbed = b.s.addStroke(selfLoop(154, 220, 60, 40, { seed: 1 }), b.tick());
    const bare = b.s.addStroke(handPath([{ x: 154, y: 320 }, { x: 214, y: 320 }, { x: 214, y: 360 }, { x: 154, y: 360 }], { seed: 2, jitter: 1, density: 0.5 }), b.tick());
    const left = b.s.addStroke(selfLoop(446, 420, -60, 40, { seed: 3 }), b.tick());
    const r = seqOf(b.s)!;
    const at = (id: string) => r.connectors.find((c) => c.id === id)!;
    expect([at(barbed).kind, at(barbed).arrow, at(barbed).from, at(barbed).to]).toEqual(['self', '->>', b.boxes[0], b.boxes[0]]);
    expect(at(barbed).reason).toMatch(/folds back out/);
    expect([at(bare).kind, at(bare).arrow]).toEqual(['self', '->']);
    expect([at(left).kind, at(left).arrow, at(left).from]).toEqual(['self', '->>', b.boxes[1]]);
  });

  it('the writing just above a message is its label; writing below it is not — it is the label of the message below it, or a note', () => {
    const b = board([150, 450]);
    const m1 = b.arrow({ x: 153, y: 200 }, { x: 446, y: 200 }, 1);
    const m2 = b.arrow({ x: 153, y: 330 }, { x: 446, y: 330 }, 2);
    const above = b.s.addStroke(handText(250, 178, 80, 16, { seed: 3, humps: 4, jitter: 1 }), b.tick());
    const below = b.s.addStroke(handText(250, 212, 80, 16, { seed: 4, humps: 4, jitter: 1 }), b.tick());
    const alone = b.s.addStroke(handText(250, 450, 80, 16, { seed: 5, humps: 4, jitter: 1 }), b.tick());
    const r = seqOf(b.s)!;
    expect(r.connectors.find((c) => c.id === m1)!.labels).toEqual([above]);
    expect(r.connectors.find((c) => c.id === m2)!.labels).toEqual([]);
    expect(r.labels.find((l) => l.id === below)!.where).toBe('alone');
    expect(r.labels.find((l) => l.id === alone)!.role).toBe('annotation');
  });
});

describe('ports: a lifeline’s whole length, through E3’s hook', () => {
  it('a lifeline offers one continuous port from its top to its bottom; its box, a message and a stray line offer none', () => {
    const b = board([150, 450]);
    const m = b.arrow({ x: 153, y: 200 }, { x: 446, y: 200 });
    const stray = b.s.addStroke(handLine({ x: 700, y: 100 }, { x: 701, y: 500 }, { seed: 9, jitter: 1 }), b.tick());
    const st = b.s.getState();
    const p = sequencePortsOf(st.nodes.get(b.lifelines[0])!, st.nodes)!;
    expect(p.symbol).toBe('lifeline');
    expect(p.ports).toHaveLength(1);
    const [top, bottom] = p.ports[0].along!;
    expect(Math.abs(top.y - 99)).toBeLessThan(4);
    expect(Math.abs(bottom.y - 520)).toBeLessThan(4);
    for (const id of [b.boxes[0], m, stray]) expect(sequencePortsOf(st.nodes.get(id)!, st.nodes)).toBeNull();
  });
});
