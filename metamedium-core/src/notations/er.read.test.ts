// The ER notation, rule by rule (V1-PLAN §3, §9 D6). The acceptance is
// er.test.ts and the rates are er.bench.test.ts; here, each rule the reading
// rests on, pinned where it can break.

import { describe, it, expect } from 'vitest';
import { createSession } from '../session/session';
import type { Session } from '../session/session';
import { magnetSites } from '../session/magnets';
import { ROLES } from '../diagram/roles';
import { registerPorts, unregisterPorts } from '../session/ports';
import { notationsOf, notationById, registeredNotations, describeNotation, NOTATION_FLOOR } from './notation';
import { readEr, erPortsOf, cardinalityOf, ER, ER_TABLE } from './er';
import type { ErReading } from './er';
import { toMermaid } from './mermaid';
import './er-mermaid';
import { drawEr, ER_VARIANTS } from './fixtures/er';
import { handShape, boxCorners } from './fixtures/hand';
import { handLine, handText, handArrow } from '../test/strokes';

const erOf = (s: Session) => notationsOf(s.getState()).find((r) => r.notation === 'er') as ErReading | undefined;

interface Clock {
  at: number;
}
const box = (s: Session, t: Clock, cx: number, cy: number, w = 150, h = 70, seed = 1) => s.addStroke(handShape(boxCorners(cx, cy, w, h), { seed, jitter: 1.5, round: 0.06 }), (t.at += 4000));
const line = (s: Session, t: Clock, a: [number, number], b: [number, number], seed = 3) => s.addStroke(handLine({ x: a[0], y: a[1] }, { x: b[0], y: b[1] }, { seed, jitter: 1 }), (t.at += 4000));
const small = (s: Session, t: Clock, x: number, y: number, seed = 5, w = 12) => s.addStroke(handText(x, y, w, 20, { seed, humps: 2, jitter: 0.8 }), (t.at += 4000));
const words = (s: Session, t: Clock, x: number, y: number, w = 60, seed = 7) => s.addStroke(handText(x, y, w, 20, { seed, humps: Math.max(4, Math.round(w / 15)), jitter: 1 }), (t.at += 4000));
const read = (s: Session, id: string, text: string, at = 900_100) => {
  const pid = s.join('agent', 'llm:seeing', 900_000, 2);
  s.propose({ participantId: pid, nodeId: id, edges: [], reps: [{ modality: 'transcript', data: { text }, confidence: 0.9 }], at });
};

/** Two entities side by side, a plain line between them, a multiplicity at each end and a verb beside its middle. */
function pair(s: Session, t: Clock) {
  const a = box(s, t, 200, 200, 150, 70, 1), b = box(s, t, 620, 200, 150, 70, 2);
  const l = line(s, t, [277, 200], [543, 200]);
  const m1 = small(s, t, 290, 170), m2 = small(s, t, 510, 170, 6);
  const v = words(s, t, 380, 166);
  const na = words(s, t, 170, 190, 60, 8), nb = words(s, t, 590, 190, 60, 9);
  return { a, b, l, m1, m2, v, na, nb };
}

describe('the notation', () => {
  it('is registered beside the others; one symbol and one connector, each one of the six roles; its content one table, which the pack names', () => {
    expect(registeredNotations()).toEqual(expect.arrayContaining(['flowchart', 'uml-class', 'sequence', 'state', 'er']));
    expect(notationById('er')).toBe(ER);
    expect(ER.symbols.map((x) => x.name)).toEqual(['entity']);
    expect(ER.connectors.map((x) => x.name)).toEqual(['relationship']);
    for (const d of [...ER.symbols, ...ER.connectors]) expect(ROLES).toContain(d.role);
    expect(ER_TABLE.pack).toBe('er@1');
    expect(ER_TABLE.cardinalities['one-many']).toEqual({ says: 'one or more', left: '}|', right: '|{', written: '1..*' });
  });

  it('every mark in the scope plays one of the six roles under it, and says so in one line', () => {
    const s = createSession();
    drawEr(s, ER_VARIANTS[0]);
    const r = readEr(s.getState())!;
    for (const role of Object.values(r.roles)) expect(ROLES).toContain(role);
    expect(Object.keys(r.roles).sort()).toEqual([...s.getState().contentIds].sort());
    expect(r.unplaced).toEqual([]);
    expect(describeNotation(r)).toMatch(/^an ER diagram 0\.\d\d — four entities, three relationships, six multiplicities$/);
    // A multiplicity is a label, a relationship an edge, an entity a node.
    expect(r.roles[r.connectors[0].id]).toBe('edge');
    expect(r.roles[r.symbols[0].id]).toBe('node');
    for (const k of r.connectors) for (const at of ['from', 'to'] as const) expect(r.roles[k.sides[at].multiplicity!.ids[0]]).toBe('label');
  });

  it('derived: reading writes nothing, and reads the same again', () => {
    const s = createSession();
    drawEr(s, ER_VARIANTS[2]);
    const events = s.getEvents().length, nodes = s.getState().nodes.size;
    const a = JSON.stringify(readEr(s.getState()));
    expect(JSON.stringify(readEr(s.getState()))).toBe(a);
    expect(s.getEvents().length).toBe(events);
    expect(s.getState().nodes.size).toBe(nodes);
  });
});

describe('what makes it an ER diagram and not a flowchart or a class diagram', () => {
  it('boxes and plain lines alone — no multiplicity, no verb — are held under the floor', () => {
    const s = createSession(), t = { at: 1000 };
    box(s, t, 200, 200, 150, 70, 1);
    box(s, t, 620, 200, 150, 70, 2);
    line(s, t, [277, 200], [543, 200]);
    const r = erOf(s);
    expect(r).toBeDefined();
    expect(r!.confidence).toBeLessThan(NOTATION_FLOOR);
    expect(r!.reason).toMatch(/nothing only an ER diagram has/);
  });

  it('a multiplicity at the ends lifts it above the floor, and a verb beside the middle adds to it', () => {
    const s = createSession(), t = { at: 1000 };
    const p = pair(s, t);
    const both = erOf(s)!;
    expect(both.confidence).toBeGreaterThanOrEqual(NOTATION_FLOOR);
    expect(both.evidence.map((e) => e.what).join(' ')).toMatch(/two of two line ends with a multiplicity.*one of one lines with a verb/);
    const noVerb = createSession(), u = { at: 1000 };
    box(noVerb, u, 200, 200, 150, 70, 1);
    box(noVerb, u, 620, 200, 150, 70, 2);
    line(noVerb, u, [277, 200], [543, 200]);
    small(noVerb, u, 290, 170);
    small(noVerb, u, 510, 170, 6);
    const ends = erOf(noVerb)!;
    expect(ends.confidence).toBeGreaterThanOrEqual(NOTATION_FLOOR);
    expect(both.confidence).toBeGreaterThan(ends.confidence);
    expect(p.l).toBeDefined();
  });

  it('arrows between boxes are a flowchart’s: no ER reading at all', () => {
    const s = createSession(), t = { at: 1000 };
    box(s, t, 200, 200, 150, 70, 1);
    box(s, t, 620, 200, 150, 70, 2);
    s.addStroke(handArrow({ x: 277, y: 200 }, { x: 543, y: 200 }, { seed: 3, jitter: 1 }), (t.at += 4000));
    small(s, t, 290, 170);
    small(s, t, 510, 170, 6);
    expect(erOf(s)).toBeUndefined();
    expect(notationsOf(s.getState()).map((r) => r.notation)).toContain('flowchart');
  });

  it('a line with a head — as a relationship never has — counts against it, and its head is ignored', () => {
    const s = createSession(), t = { at: 1000 };
    pair(s, t);
    const plain = erOf(s)!;
    const h = createSession(), u = { at: 1000 };
    box(h, u, 200, 200, 150, 70, 1);
    box(h, u, 620, 200, 150, 70, 2);
    // The same line, with a barb at its far end.
    h.addStroke(handArrow({ x: 277, y: 200 }, { x: 543, y: 200 }, { seed: 3, jitter: 1 }), (u.at += 4000));
    small(h, u, 290, 170);
    small(h, u, 510, 170, 6);
    words(h, u, 380, 166);
    expect(erOf(h)).toBeUndefined();
    expect(plain.headed).toBe(0);
  });

  it('a box with a line across it holds compartments — a class’s — and is no entity', () => {
    const s = createSession(), t = { at: 1000 };
    box(s, t, 200, 200, 150, 90, 1);
    box(s, t, 620, 200, 150, 90, 2);
    // A line across each box, side to side.
    line(s, t, [126, 190], [274, 190], 11);
    line(s, t, [546, 190], [694, 190], 12);
    line(s, t, [277, 220], [543, 220]);
    small(s, t, 290, 190);
    small(s, t, 510, 190, 6);
    expect(erOf(s)).toBeUndefined();
  });

  it('a hub — one entity with four relationships — reads, each relationship joining the hub to another', () => {
    const s = createSession(), t = { at: 1000 };
    const hub = box(s, t, 500, 300, 150, 70, 1);
    const others = [box(s, t, 150, 300, 130, 60, 2), box(s, t, 850, 300, 130, 60, 3), box(s, t, 500, 80, 130, 60, 4), box(s, t, 500, 520, 130, 60, 5)];
    line(s, t, [215, 300], [424, 300]);
    line(s, t, [575, 300], [784, 300]);
    line(s, t, [500, 110], [500, 264]);
    line(s, t, [500, 336], [500, 490]);
    [[300, 270], [720, 270], [520, 190], [520, 400]].forEach(([x, y], i) => {
      small(s, t, x, y, 20 + i);
    });
    const r = erOf(s)!;
    expect(r).toBeDefined();
    expect(r.connectors).toHaveLength(4);
    const hubId = r.symbols.find((x) => x.ids.includes(hub))!.id;
    for (const k of r.connectors) expect([k.from, k.to]).toContain(hubId);
    expect(r.symbols).toHaveLength(5);
    expect(others).toHaveLength(4);
  });
});

describe('the writing at the ends and beside the middle', () => {
  it('a multiplicity is the short writing near an end, the verb the writing beside the middle; a line of read words near an end that says none of the four is a verb', () => {
    const s = createSession(), t = { at: 1000 };
    const p = pair(s, t);
    const r = erOf(s)!;
    const k = r.connectors[0];
    const sideOf = () => (r.symbols.find((x) => x.ids.includes(p.a))!.id === k.sides.from.entity ? k.sides.from : k.sides.to);
    expect(sideOf().multiplicity?.ids).toEqual([p.m1]);
    expect(k.verb?.ids).toEqual([p.v]);
    read(s, p.v, 'places', 900_100);
    read(s, p.m1, '1', 900_101);
    read(s, p.m2, 'places', 900_102);
    const after = erOf(s)!;
    const kk = after.connectors[0];
    // "places" written at an end is words, not a count: a verb, and nothing counts at that end.
    expect(kk.verb?.text).toBe('places places');
    expect(kk.sides.from.cardinality === 'one' || kk.sides.to.cardinality === 'one').toBe(true);
    expect([kk.sides.from.multiplicity, kk.sides.to.multiplicity].filter(Boolean)).toHaveLength(1);
    expect(kk.labels.length).toBe(2);
  });

  it('the pieces of one end are read together: “0”, “..” and “1” are one multiplicity, 0..1', () => {
    const s = createSession(), t = { at: 1000 };
    box(s, t, 200, 200, 150, 70, 1);
    box(s, t, 620, 200, 150, 70, 2);
    line(s, t, [277, 200], [543, 200]);
    const a = small(s, t, 288, 170, 21, 8);
    const b = small(s, t, 304, 170, 22, 8);
    const c = small(s, t, 320, 170, 23, 8);
    small(s, t, 510, 170, 6);
    [a, b, c].forEach((id, i) => read(s, id, ['0', '..', '1'][i], 900_100 + i));
    const r = erOf(s)!;
    const ends = r.connectors.flatMap((k) => [k.sides.from, k.sides.to]);
    expect(ends.map((e) => e.multiplicity?.text).filter(Boolean)).toContain('0..1');
    expect(ends.map((e) => e.cardinality)).toContain('zero-one');
  });

  it('what a hand labelled a relationship’s own ink with is its verb, and an entity’s its name', () => {
    const s = createSession(), t = { at: 1000 };
    const a = box(s, t, 200, 200), b = box(s, t, 620, 200);
    const l = line(s, t, [277, 200], [543, 200]);
    small(s, t, 290, 170);
    small(s, t, 510, 170, 6);
    s.label({ nodeId: a, text: 'Customer', at: (t.at += 10) });
    s.label({ nodeId: b, text: 'Order', at: (t.at += 10) });
    s.label({ nodeId: l, text: 'places', at: (t.at += 10) });
    const r = erOf(s)!;
    expect(r.symbols.map((x) => x.name.text)).toEqual(['Customer', 'Order']);
    expect(r.connectors[0].verb?.text).toBe('places');
    expect(toMermaid(r)!.text).toMatch(/ : "places"\n$/);
  });

  it('says how many from the writing: the four cardinalities, and none where the writing says none', () => {
    expect(cardinalityOf('1')).toBe('one');
    expect(cardinalityOf('0..1')).toBe('zero-one');
    expect(cardinalityOf('*')).toBe('zero-many');
    expect(cardinalityOf('1..*')).toBe('one-many');
    expect(cardinalityOf('places')).toBeNull();
  });
});

describe('entities', () => {
  it('a box ruled in four strokes is an entity too', () => {
    const s = createSession(), t = { at: 1000 };
    const ruled = (x: number, y: number, w: number, h: number) => [
      s.addStroke(handLine({ x, y }, { x: x + w, y }, { seed: 31, jitter: 1 }), (t.at += 4000)),
      s.addStroke(handLine({ x: x + w, y }, { x: x + w, y: y + h }, { seed: 32, jitter: 1 }), (t.at += 4000)),
      s.addStroke(handLine({ x: x + w, y: y + h }, { x, y: y + h }, { seed: 33, jitter: 1 }), (t.at += 4000)),
      s.addStroke(handLine({ x, y: y + h }, { x, y }, { seed: 34, jitter: 1 }), (t.at += 4000)),
    ];
    ruled(125, 165, 150, 70);
    box(s, t, 620, 200, 150, 70, 2);
    line(s, t, [280, 200], [543, 200]);
    small(s, t, 292, 170);
    small(s, t, 510, 170, 6);
    const r = erOf(s);
    expect(r).toBeDefined();
    expect(r!.symbols).toHaveLength(2);
    expect(r!.symbols.some((x) => x.ids.length === 4)).toBe(true);
  });

  it('a box holding another box is a frame, not an entity', () => {
    const s = createSession(), t = { at: 1000 };
    box(s, t, 200, 200, 150, 70, 1);
    box(s, t, 620, 200, 150, 70, 2);
    box(s, t, 620, 200, 300, 160, 3);
    line(s, t, [277, 200], [543, 200]);
    small(s, t, 290, 170);
    small(s, t, 510, 170, 6);
    const r = erOf(s);
    expect(r?.symbols.length ?? 2).toBe(2);
  });
});

describe('ports', () => {
  it('an entity offers its border, anywhere along it, and nothing else on a board offers one', () => {
    const s = createSession(), t = { at: 1000 };
    const p = pair(s, t);
    const nodes = s.getState().nodes;
    expect(erPortsOf(nodes.get(p.a)!, nodes)?.symbol).toBe('entity');
    expect(erPortsOf(nodes.get(p.a)!, nodes)?.ports.map((x) => x.name)).toEqual(['border']);
    for (const id of [p.l, p.m1, p.v, p.na]) expect(erPortsOf(nodes.get(id)!, nodes), id).toBeNull();
    // Offered to the pen only once the notation is in use.
    const sites = () => magnetSites(nodes.get(p.a)!, nodes).filter((x) => x.kind === 'along:er');
    expect(sites()).toEqual([]);
    registerPorts(ER.ports!);
    expect(sites().length).toBeGreaterThan(8);
    unregisterPorts('er');
    expect(sites()).toEqual([]);
  });
});
