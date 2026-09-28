// The UML class notation, rule by rule (V1-PLAN §3, §9 D4). A2's acceptance
// is uml-class.test.ts and the rates are uml-class.bench.test.ts; here, each
// rule the reading rests on, pinned where it can break.

import { describe, it, expect } from 'vitest';
import { createSession } from '../session/session';
import type { Session } from '../session/session';
import { ROLES } from '../diagram/roles';
import { headsOf } from '../diagram/heads';
import { notationsOf, notationById, registeredNotations, describeNotation } from './notation';
import { readUmlClass, umlClassPortsOf, memberKind, UML_CLASS, UML_CLASS_TABLE } from './uml-class';
import type { UmlClassReading } from './uml-class';
import { toMermaid } from './mermaid';
import './uml-class-mermaid';
import { drawClassPair, triangleHead, CLASS_VARIANTS } from './fixtures/uml-class';
import { handShape, boxCorners } from './fixtures/hand';
import { handArrow, handCircle, handLine, handPolygon, handText } from '../test/strokes';

/** A class: a box with lines across it at the given heights, writing in each compartment. */
function classAt(s: Session, t: { at: number }, cx: number, cy: number, o: { w?: number; h?: number; lines?: number[]; seed?: number; writing?: boolean } = {}) {
  const w = o.w ?? 200, h = o.h ?? 150, seed = o.seed ?? 1;
  const box = s.addStroke(handShape(boxCorners(cx, cy, w, h), { seed }), (t.at += 4000));
  const lines = (o.lines ?? [40, 95]).map((y, i) => s.addStroke(handLine({ x: cx - w / 2 + 2, y: cy - h / 2 + y }, { x: cx + w / 2 - 2, y: cy - h / 2 + y }, { seed: seed * 10 + i, jitter: 1.2 }), (t.at += 4000)));
  const writing = o.writing === false ? [] : [s.addStroke(handText(cx - 30, cy - h / 2 + 10, 60, 18, { seed: seed + 50, humps: 3, jitter: 1 }), (t.at += 4000))];
  return { box, lines, writing };
}

const umlOf = (s: Session) => notationsOf(s.getState()).find((r) => r.notation === 'uml-class') as UmlClassReading | undefined;

describe('the notation', () => {
  it('is registered beside the flowchart; one symbol and five relations, each one of the six roles; its content one table, which the pack names', () => {
    expect(registeredNotations()).toEqual(expect.arrayContaining(['flowchart', 'uml-class']));
    expect(notationById('uml-class')).toBe(UML_CLASS);
    expect(UML_CLASS.symbols.map((x) => x.name)).toEqual(['class']);
    expect(UML_CLASS.connectors.map((x) => x.name)).toEqual(['inheritance', 'composition', 'aggregation', 'association', 'link']);
    for (const d of [...UML_CLASS.symbols, ...UML_CLASS.connectors]) expect(ROLES).toContain(d.role);
    expect(UML_CLASS_TABLE.pack).toBe('uml-class@1');
    expect(UML_CLASS_TABLE.connectors.inheritance.mermaid).toEqual({ left: '<|', right: '|>' });
  });

  it('every mark in the scope plays one of the six roles under it, and says so in one line', () => {
    const s = createSession();
    drawClassPair(s, CLASS_VARIANTS[0]);
    const r = readUmlClass(s.getState())!;
    for (const role of Object.values(r.roles)) expect(ROLES).toContain(role);
    expect(Object.keys(r.roles).sort()).toEqual([...s.getState().contentIds].sort());
    expect(r.unplaced).toEqual([]);
    expect(describeNotation(r)).toMatch(/^a UML class diagram 0\.\d\d — two classes, one inheritance$/);
    const c = r.symbols[0];
    expect(c.lines.map((id) => r.roles[id])).toEqual(['node', 'node']);
    expect(c.name.ids.map((id) => r.roles[id])).toEqual(['label']);
    expect(r.connectors[0].ids.map((id) => r.roles[id])).toEqual(['edge', 'edge']);
  });

  it('derived: reading writes nothing, and reads the same again', () => {
    const s = createSession();
    drawClassPair(s, CLASS_VARIANTS[2]);
    const events = s.getEvents().length, nodes = s.getState().nodes.size;
    const a = JSON.stringify(readUmlClass(s.getState()));
    expect(JSON.stringify(readUmlClass(s.getState()))).toBe(a);
    expect(s.getEvents().length).toBe(events);
    expect(s.getState().nodes.size).toBe(nodes);
  });
});

describe('plural, beside the flowchart', () => {
  it('a lone class reads as a class diagram and as nothing a flowchart knows (no flow)', () => {
    const s = createSession();
    classAt(s, { at: 0 }, 300, 200);
    const all = notationsOf(s.getState());
    expect(all.map((r) => r.notation)).toEqual(['uml-class']);
    expect(all[0].summary).toBe('one class');
  });

  it('plain boxes and open arrows are a flowchart and no class diagram: nothing there says UML', () => {
    const s = createSession();
    let t = 0;
    s.addStroke(handShape(boxCorners(200, 100, 160, 70), { seed: 1 }), (t += 4000));
    s.addStroke(handShape(boxCorners(200, 300, 160, 70), { seed: 2 }), (t += 4000));
    s.addStroke(handArrow({ x: 200, y: 138 }, { x: 200, y: 262 }, { wings: 2, headLen: 16, seed: 3, jitter: 1 }), (t += 4000));
    expect(notationsOf(s.getState()).map((r) => r.notation)).toEqual(['flowchart']);
  });

  it('plain boxes a hollow triangle joins are classes with only a name — a class diagram, read lower, beside the flowchart', () => {
    const s = createSession();
    let t = 0;
    const a = s.addStroke(handShape(boxCorners(200, 100, 160, 70), { seed: 1 }), (t += 4000));
    s.addStroke(handShape(boxCorners(200, 320, 160, 70), { seed: 2 }), (t += 4000));
    s.addStroke(handLine({ x: 200, y: 284 }, { x: 200, y: 160 }, { seed: 3, jitter: 1 }), (t += 4000));
    s.addStroke(triangleHead({ x: 200, y: 136 }, { x: 0, y: -1 }, 24, { seed: 4 }), (t += 4000));
    const r = umlOf(s)!;
    expect(r).toBeDefined();
    expect(r.connectors.map((c) => c.kind)).toEqual(['inheritance']);
    expect(r.connectors[0].to).toBe(a);
    expect(r.symbols.every((c) => c.lines.length === 0 && /only a name, read lower/.test(c.reason))).toBe(true);
    // Lower than classes with their compartments.
    const a2 = createSession();
    drawClassPair(a2, CLASS_VARIANTS[0]);
    expect(r.confidence).toBeLessThan(readUmlClass(a2.getState())!.confidence);
  });
});

describe('the trap: compartments are read in the box’s own frame, never from the relation or role tables', () => {
  it('the relation table sees a compartment line as inside the box and crossing it — the notation reads a compartment', () => {
    const s = createSession();
    const k = classAt(s, { at: 0 }, 300, 200);
    const rel = s.read([k.box, k.lines[0]]).relations.filter((r) => r.from === k.lines[0] || r.to === k.lines[0]).map((r) => r.kind);
    expect(rel).toEqual(expect.arrayContaining(['inside']));
    const c = readUmlClass(s.getState())!.symbols[0];
    expect(c.lines).toEqual(k.lines);
    expect(c.compartments.map((x) => x.index)).toEqual([1, 2, 3]);
  });

  it('a box holding boxes is a frame, a box crossed corner to corner a sketch, a box with three lines across it a table — none a class', () => {
    const s = createSession();
    let t = 0;
    // A frame: a box holding a row of boxes, a line across it as a header.
    s.addStroke(handShape(boxCorners(300, 200, 400, 240), { seed: 1 }), (t += 4000));
    s.addStroke(handLine({ x: 102, y: 120 }, { x: 498, y: 120 }, { seed: 2, jitter: 1 }), (t += 4000));
    for (let i = 0; i < 3; i++) s.addStroke(handShape(boxCorners(180 + i * 120, 230, 90, 70), { seed: 3 + i }), (t += 4000));
    expect(readUmlClass(s.getState())).toBeNull();
    // A sketch: a box with a line across it and a diagonal through it.
    const k = createSession();
    const tt = { at: 0 };
    classAt(k, tt, 300, 200, { lines: [40] });
    k.addStroke(handLine({ x: 205, y: 130 }, { x: 395, y: 270 }, { seed: 9, jitter: 1 }), (tt.at += 4000));
    expect(readUmlClass(k.getState())).toBeNull();
    // A table: three lines across.
    const tb = createSession();
    classAt(tb, { at: 0 }, 300, 200, { lines: [35, 70, 110] });
    expect(readUmlClass(tb.getState())).toBeNull();
  });

  it('a turned class reads in its own frame, and says how far it is turned', () => {
    const s = createSession();
    let t = 0;
    const tilt = 20, rad = (tilt * Math.PI) / 180;
    const at = (x: number, y: number) => ({ x: 300 + x * Math.cos(rad) - y * Math.sin(rad), y: 200 + x * Math.sin(rad) + y * Math.cos(rad) });
    const box = s.addStroke(handShape(boxCorners(300, 200, 220, 160, tilt), { seed: 1 }), (t += 4000));
    const l1 = s.addStroke(handLine(at(-108, -40), at(108, -40), { seed: 2, jitter: 1 }), (t += 4000));
    const c = readUmlClass(s.getState())!.symbols.find((x) => x.box[0] === box)!;
    expect(c.lines).toEqual([l1]);
    expect(c.turn).toBeGreaterThan(15);
    expect(c.turn).toBeLessThan(25);
  });
});

describe('names and members', () => {
  /** A class whose writing a model has read. */
  function readClass(words: { name: string; attrs: string[]; methods: string[] }, placeMethodsIn = 3) {
    const s = createSession();
    const t = { at: 0 };
    const k = classAt(s, t, 300, 200, { h: 170, lines: [40, 105], writing: false });
    const pid = s.join('agent', 'llm:seeing', 900_000, 2);
    const write = (y: number, text: string) => {
      const id = s.addStroke(handText(215, 115 + y, 110, 16, { seed: y + 1, humps: 5, jitter: 1 }), (t.at += 4000));
      s.propose({ participantId: pid, nodeId: id, edges: [], reps: [{ modality: 'transcript', data: { text }, confidence: 0.9 }], at: (t.at += 10) });
      return id;
    };
    write(8, words.name);
    words.attrs.forEach((w, i) => write(47 + i * 24, w));
    words.methods.forEach((w, i) => write((placeMethodsIn === 3 ? 112 : 47 + (words.attrs.length + i) * 24) + (placeMethodsIn === 3 ? i * 24 : 0), w));
    return { s, k, reading: readUmlClass(s.getState())! };
  }

  it('a member is a method only when its words say so: a name straight into its parentheses', () => {
    expect(['+eat()', 'move(dx, dy)', '+area() double', '-audit(x)'].map(memberKind)).toEqual(['method', 'method', 'method', 'method']);
    expect(['+name: String', 'name (optional)', '(unread writing)', undefined].map(memberKind)).toEqual(['attribute', 'attribute', 'unread', 'unread']);
    const { reading } = readClass({ name: 'Account', attrs: ['-balance: Money', 'owner (optional)'], methods: ['+deposit(x)'] });
    const c = reading.symbols[0];
    expect(c.name.text).toBe('Account');
    expect(c.members.map((m) => [m.compartment, m.kind, m.text])).toEqual([
      [2, 'attribute', '-balance: Money'],
      [2, 'attribute', 'owner (optional)'],
      [3, 'method', '+deposit(x)'],
    ]);
  });

  it('a method written among the attributes stays where it was drawn, a method by its words — and Mermaid is told so', () => {
    const { reading } = readClass({ name: 'Account', attrs: ['-balance: Money'], methods: ['+deposit(x)'] }, 2);
    const c = reading.symbols[0];
    expect(c.members.map((m) => [m.compartment, m.kind])).toEqual([[2, 'attribute'], [2, 'method']]);
    const m = toMermaid(reading)!;
    expect(m.text).toContain('        +deposit(x)\n');
    expect(m.notes.join(' ')).toMatch(/in the other compartment from what its words say/);
  });

  it('a word a hand put on the box is the name, and on a compartment’s line its members, a line each — what Mermaid in draws', () => {
    const s = createSession();
    const k = classAt(s, { at: 0 }, 300, 200, { writing: false });
    s.label({ nodeId: k.box, text: 'Order', at: 100_000 });
    s.label({ nodeId: k.lines[0], text: '+id: int\n-total: Money', at: 100_001 });
    s.label({ nodeId: k.lines[1], text: '+pay()', at: 100_002 });
    const c = readUmlClass(s.getState())!.symbols[0];
    expect(c.name.text).toBe('Order');
    expect(c.members.map((m) => [m.compartment, m.kind, m.text, m.from])).toEqual([
      [2, 'attribute', '+id: int', 'label'],
      [2, 'attribute', '-total: Money', 'label'],
      [3, 'method', '+pay()', 'label'],
    ]);
  });
});

describe('relations and their ends', () => {
  it('a head read first as a circle — a small, heavily rounded triangle — degrades: an inheritance, less surely, a plain link its other reading, and says so', () => {
    const s = createSession();
    let t = 1000;
    s.addStroke(handShape(boxCorners(300, 120, 200, 150), { seed: 3 }), (t += 4000));
    s.addStroke(handLine({ x: 202, y: 90 }, { x: 398, y: 90 }, { seed: 4, jitter: 1 }), (t += 4000));
    s.addStroke(handShape(boxCorners(300, 420, 200, 120), { seed: 5 }), (t += 4000));
    s.addStroke(handLine({ x: 202, y: 395 }, { x: 398, y: 395 }, { seed: 6, jitter: 1 }), (t += 4000));
    const line = s.addStroke(handLine({ x: 300, y: 358 }, { x: 300, y: 214 }, { seed: 7, jitter: 1.2 }), (t += 4000));
    s.addStroke(handPolygon([{ x: 300, y: 196 }, { x: 310.8, y: 214 }, { x: 289.2, y: 214 }], { seed: 4, jitter: 2.5, round: 0.35, density: 0.6, startAt: 0.15 }), (t += 4000));
    expect(headsOf(s.getState(), line)!.end.heads.map((h) => h.kind)).toEqual(['circle', 'triangle']);
    const rel = readUmlClass(s.getState())!.connectors[0];
    expect(rel.kind).toBe('inheritance');
    expect(rel.reason).toMatch(/reads first as a hollow circle .* which no class relation has, then as a hollow triangle .* an inheritance, less surely/);
    expect(rel.readings.map((x) => x.kind)).toEqual(['inheritance', 'link']);
  });

  it('a "1" written as a single stroke near an end is its multiplicity; writing beside a relation’s middle is its label', () => {
    const s = createSession();
    const t = { at: 0 };
    const a = classAt(s, t, 150, 150, { lines: [40] });
    const b = classAt(s, t, 600, 150, { lines: [40], seed: 2 });
    const line = s.addStroke(handArrow({ x: 252, y: 170 }, { x: 497, y: 170 }, { wings: 2, headLen: 16, seed: 5, jitter: 1 }), (t.at += 4000));
    const one = s.addStroke(handLine({ x: 268, y: 145 }, { x: 268, y: 160 }, { seed: 6, jitter: 0.5 }), (t.at += 4000));
    const owns = s.addStroke(handText(348, 140, 50, 16, { seed: 7, humps: 3, jitter: 1 }), (t.at += 4000));
    const r = readUmlClass(s.getState())!;
    const rel = r.connectors.find((c) => c.id === line)!;
    expect(rel.kind).toBe('association');
    expect(rel.to).toBe(b.box);
    expect(rel.ends.from.multiplicity?.ids).toEqual([one]);
    expect(rel.labels).toEqual(expect.arrayContaining([one, owns]));
    expect(r.labels.find((l) => l.id === owns)?.reason).toMatch(/its label/);
    void a;
  });

  it('a relation’s ends are read past its heads, a magnet’s bind first', () => {
    const s = createSession();
    const t = { at: 0 };
    const a = classAt(s, t, 200, 120);
    const b = classAt(s, t, 200, 450, { seed: 2 });
    const line = s.addStroke(handLine({ x: 200, y: 373 }, { x: 200, y: 222 }, { seed: 5, jitter: 1 }), (t.at += 4000));
    s.addStroke(triangleHead({ x: 200, y: 196 }, { x: 0, y: -1 }, 26, { seed: 6 }), (t.at += 4000));
    s.bind({ strokeId: line, nodeId: b.box, site: { kind: 'middle', index: 0 }, end: 'start', at: (t.at += 10) });
    const rel = readUmlClass(s.getState())!.connectors[0];
    expect(rel.ends.from.bound).toBe(true);
    expect(rel.ends.to.head?.kind).toBe('triangle');
    expect(rel.ends.to.point.y).toBeLessThan(200);
    expect([rel.from, rel.to]).toEqual([b.box, a.box]);
  });
});

describe('ports: E3’s hook', () => {
  it('a box with its lines across it offers its four sides; a plain box, a line, a circle offer nothing', () => {
    const s = createSession();
    const k = classAt(s, { at: 0 }, 300, 200);
    const nodes = s.getState().nodes;
    const p = umlClassPortsOf(nodes.get(k.box)!, nodes)!;
    expect(p.symbol).toBe('class');
    expect(p.ports.map((x) => x.name)).toEqual(['top side', 'right side', 'bottom side', 'left side']);
    expect(p.ports.every((x) => x.along?.length === 2)).toBe(true);
    expect(umlClassPortsOf(nodes.get(k.lines[0])!, nodes)).toBeNull();
    const plain = createSession();
    const box = plain.addStroke(handShape(boxCorners(300, 200, 200, 150), { seed: 1 }), 1000);
    const c = plain.addStroke(handCircle(600, 200, 40, { seed: 2 }), 5000);
    expect(umlClassPortsOf(plain.getState().nodes.get(box)!, plain.getState().nodes)).toBeNull();
    expect(umlClassPortsOf(plain.getState().nodes.get(c)!, plain.getState().nodes)).toBeNull();
  });
});
