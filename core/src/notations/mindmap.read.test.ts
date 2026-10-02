// The mind-map notation, rule by rule (V1-PLAN §3, §9 D6). The acceptance is
// mindmap.test.ts and the rates are mindmap.bench.test.ts; here, each rule the
// reading rests on, pinned where it can break.

import { describe, it, expect } from 'vitest';
import { createSession } from '../session/session';
import type { Session } from '../session/session';
import { magnetSites } from '../session/magnets';
import { ROLES } from '../diagram/roles';
import { registerPorts, unregisterPorts } from '../session/ports';
import { notationsOf, notationById, registeredNotations, describeNotation, NOTATION_FLOOR } from './notation';
import { readMindMap, mindMapPortsOf, clockwiseFromTop, MINDMAP, MINDMAP_TABLE } from './mindmap';
import type { MindMapReading } from './mindmap';
import './mindmap-mermaid';
import { drawMindMap, MINDMAP_VARIANTS } from './fixtures/mindmap';
import { drawEr, ER_VARIANTS } from './fixtures/er';
import { handShape, boxCorners } from './fixtures/hand';
import { handCircle, handLine, handText, handArrow } from '../test/strokes';

const mapOf = (s: Session) => notationsOf(s.getState()).find((r) => r.notation === 'mindmap') as MindMapReading | undefined;

interface Clock {
  at: number;
}
const box = (s: Session, t: Clock, cx: number, cy: number, w = 110, h = 50, seed = 1) => s.addStroke(handShape(boxCorners(cx, cy, w, h), { seed, jitter: 1.5, round: 0.06 }), (t.at += 4000));
const circle = (s: Session, t: Clock, cx: number, cy: number, r = 40, seed = 1) => s.addStroke(handCircle(cx, cy, r, { seed, jitter: 1.5 }), (t.at += 4000));
const line = (s: Session, t: Clock, a: [number, number], b: [number, number], seed = 3) => s.addStroke(handLine({ x: a[0], y: a[1] }, { x: b[0], y: b[1] }, { seed, jitter: 1 }), (t.at += 4000));
const word = (s: Session, t: Clock, cx: number, cy: number, w = 50, seed = 7) => s.addStroke(handText(cx - w / 2, cy - 10, w, 20, { seed, humps: Math.max(4, Math.round(w / 15)), jitter: 1 }), (t.at += 4000));

/** A hub with three spokes, every node named: the smallest thing that is a mind map. */
function hub(s: Session, t: Clock) {
  const root = circle(s, t, 400, 300, 50, 1);
  const a = box(s, t, 700, 300, 110, 50, 2), b = box(s, t, 400, 90, 110, 50, 3), c = box(s, t, 100, 300, 110, 50, 4);
  const la = line(s, t, [455, 300], [640, 300]), lb = line(s, t, [400, 245], [400, 120], 4), lc = line(s, t, [345, 300], [160, 300], 5);
  const w = [word(s, t, 400, 300, 40, 21), word(s, t, 700, 300, 50, 22), word(s, t, 400, 90, 50, 23), word(s, t, 100, 300, 50, 24)];
  return { root, a, b, c, la, lb, lc, w };
}

describe('the notation', () => {
  it('is registered beside the others; two symbols and one connector, each one of the six roles; its content one table, which the pack names', () => {
    expect(registeredNotations()).toEqual(expect.arrayContaining(['flowchart', 'uml-class', 'sequence', 'state', 'er', 'mindmap']));
    expect(notationById('mindmap')).toBe(MINDMAP);
    expect(MINDMAP.symbols.map((x) => x.name)).toEqual(['root', 'node']);
    expect(MINDMAP.connectors.map((x) => x.name)).toEqual(['branch']);
    for (const d of [...MINDMAP.symbols, ...MINDMAP.connectors]) expect(ROLES).toContain(d.role);
    expect(MINDMAP_TABLE.pack).toBe('mindmap@1');
    expect(MINDMAP_TABLE.shapes.circle).toMatchObject({ open: '((', close: '))' });
  });

  it('every mark in the scope plays one of the six roles under it, and says so in one line', () => {
    const s = createSession();
    drawMindMap(s, MINDMAP_VARIANTS[0]);
    const r = readMindMap(s.getState())!;
    for (const role of Object.values(r.roles)) expect(ROLES).toContain(role);
    expect(Object.keys(r.roles).sort()).toEqual([...s.getState().contentIds].sort());
    expect(r.unplaced).toEqual([]);
    expect(describeNotation(r)).toMatch(/^a mind map 0\.\d\d — a root with three branches, seven nodes, two levels deep$/);
    expect(r.roles[r.root]).toBe('node');
    expect(r.roles[r.connectors[0].id]).toBe('edge');
    for (const x of r.symbols) expect(x.name.ids.map((id) => r.roles[id])).toEqual(['label']);
  });

  it('derived: reading writes nothing, and reads the same again', () => {
    const s = createSession();
    drawMindMap(s, MINDMAP_VARIANTS[2]);
    const events = s.getEvents().length, nodes = s.getState().nodes.size;
    const a = JSON.stringify(readMindMap(s.getState()));
    expect(JSON.stringify(readMindMap(s.getState()))).toBe(a);
    expect(s.getEvents().length).toBe(events);
    expect(s.getState().nodes.size).toBe(nodes);
  });
});

describe('what makes it a mind map and not shapes joined by lines', () => {
  it('a hub with three named spokes reads above the floor, the hub its root', () => {
    const s = createSession(), t = { at: 1000 };
    const h = hub(s, t);
    const r = mapOf(s)!;
    expect(r.confidence).toBeGreaterThanOrEqual(NOTATION_FLOOR);
    expect(r.symbols.find((x) => x.symbol === 'root')!.ids).toEqual([h.root]);
    expect(r.evidence.map((e) => e.what).join(' ')).toMatch(/a centre with three branches/);
  });

  it('the same shapes with no word in them — the molecule’s bubbles — are held under the floor', () => {
    const s = createSession(), t = { at: 1000 };
    circle(s, t, 400, 300, 50, 1);
    circle(s, t, 700, 300, 40, 2);
    circle(s, t, 400, 90, 40, 3);
    circle(s, t, 100, 300, 40, 4);
    line(s, t, [455, 300], [655, 300]);
    line(s, t, [400, 245], [400, 132], 4);
    line(s, t, [345, 300], [143, 300], 5);
    const r = mapOf(s);
    expect(r === undefined || r.confidence < NOTATION_FLOOR).toBe(true);
  });

  it('an ER diagram’s lines carry a multiplicity and a verb, and count against a mind map — the ER board is no mind map above the floor, said', () => {
    const s = createSession();
    drawEr(s, ER_VARIANTS[0]);
    const r = readMindMap(s.getState());
    expect(r === null || r.confidence < NOTATION_FLOOR).toBe(true);
    if (r) expect(r.reason).toMatch(/lines have writing beside them/);
  });

  it('arrows between the shapes are a flowchart’s: no mind-map reading at all', () => {
    const s = createSession(), t = { at: 1000 };
    circle(s, t, 400, 300, 50, 1);
    box(s, t, 700, 300, 110, 50, 2);
    box(s, t, 400, 90, 110, 50, 3);
    s.addStroke(handArrow({ x: 455, y: 300 }, { x: 640, y: 300 }, { seed: 3, jitter: 1 }), (t.at += 4000));
    s.addStroke(handArrow({ x: 400, y: 245 }, { x: 400, y: 120 }, { seed: 4, jitter: 1 }), (t.at += 4000));
    word(s, t, 400, 300, 40, 21);
    word(s, t, 700, 300, 50, 22);
    word(s, t, 400, 90, 50, 23);
    expect(mapOf(s)).toBeUndefined();
  });

  it('a head on a branch counts against it, and its head is ignored', () => {
    const s = createSession(), t = { at: 1000 };
    hub(s, t);
    const plain = mapOf(s)!;
    const h = createSession(), u = { at: 1000 };
    circle(h, u, 400, 300, 50, 1);
    box(h, u, 700, 300, 110, 50, 2);
    box(h, u, 400, 90, 110, 50, 3);
    box(h, u, 100, 300, 110, 50, 4);
    h.addStroke(handArrow({ x: 455, y: 300 }, { x: 640, y: 300 }, { seed: 3, jitter: 1 }), (u.at += 4000));
    line(h, u, [400, 245], [400, 120], 4);
    line(h, u, [345, 300], [160, 300], 5);
    [[400, 300, 40], [700, 300, 50], [400, 90, 50], [100, 300, 50]].forEach(([x, y, w], i) => word(h, u, x, y, w, 21 + i));
    const headed = readMindMap(h.getState());
    expect(plain.headed).toBe(0);
    expect(headed === null || headed.headed >= 1).toBe(true);
    if (headed) expect(headed.confidence).toBeLessThan(plain.confidence);
  });

  it('a line that closes a loop is no branch of a tree, and counts against it', () => {
    const s = createSession(), t = { at: 1000 };
    hub(s, t);
    const tree = mapOf(s)!;
    // A line from the right spoke round to the top one.
    line(s, t, [700, 275], [430, 90], 9);
    const looped = readMindMap(s.getState())!;
    expect(looped.loops).toBe(1);
    expect(looped.connectors.filter((k) => !k.tree)).toHaveLength(1);
    expect(looped.confidence).toBeLessThan(tree.confidence);
  });

  it('a box with a line across it holds compartments — a class’s — and is no node', () => {
    const s = createSession(), t = { at: 1000 };
    const h = hub(s, t);
    // Below the word in it, or the stroke across the word would scratch it out.
    line(s, t, [648, 318], [752, 318], 12);
    const r = readMindMap(s.getState())!;
    expect(r.classLike).toBe(1);
    expect(r.symbols.some((x) => x.ids.includes(h.a))).toBe(false);
  });

  it('a branch as short as a letter between two close shapes is a branch, not writing', () => {
    const s = createSession(), t = { at: 1000 };
    const a = circle(s, t, 300, 300, 50, 1), b = box(s, t, 470, 300, 110, 50, 2), c = box(s, t, 300, 150, 110, 50, 3), d = box(s, t, 130, 300, 110, 50, 4);
    // Each line is about 40 px: the size of a letter.
    line(s, t, [351, 300], [414, 300]);
    line(s, t, [300, 251], [300, 176], 4);
    line(s, t, [249, 300], [186, 300], 5);
    [[300, 300, 40], [470, 300, 50], [300, 150, 50], [130, 300, 50]].forEach(([x, y, w], i) => word(s, t, x, y, w, 21 + i));
    const r = readMindMap(s.getState())!;
    expect(r).not.toBeNull();
    expect(r.connectors).toHaveLength(3);
    expect(r.symbols.map((x) => x.ids[0]).sort()).toEqual([a, b, c, d].sort());
  });
});

describe('the root and the order round a node', () => {
  it('the root is the most central node of the tree — the middle of a chain, and the hub over a node with as many branches but farther from the rest', () => {
    const s = createSession(), t = { at: 1000 };
    const a = box(s, t, 100, 300), b = circle(s, t, 400, 300, 50, 2), c = box(s, t, 700, 300, 110, 50, 3);
    line(s, t, [156, 300], [345, 300]);
    line(s, t, [455, 300], [640, 300], 4);
    [[100, 300, 40], [400, 300, 40], [700, 300, 40]].forEach(([x, y, w], i) => word(s, t, x, y, w, 21 + i));
    const r = readMindMap(s.getState())!;
    expect(r.symbols.find((x) => x.symbol === 'root')!.ids).toEqual([b]);
    expect(r.symbols.map((x) => x.depth).sort()).toEqual([0, 1, 1]);
    expect([a, c]).toHaveLength(2);
    // The hub of the fixture: Trip has three branches and so does Food, and Trip is the more central.
    const board = createSession();
    const e = drawMindMap(board, MINDMAP_VARIANTS[0]);
    const m = readMindMap(board.getState())!;
    expect(m.symbols.find((x) => x.symbol === 'root')!.ids).toEqual(e.nodes.Trip.box);
  });

  it('round the root the branches come clockwise from the top; round any other node clockwise from the way it faces, away from its parent', () => {
    const at = { x: 0, y: 0 };
    expect(clockwiseFromTop(at, { x: 0, y: -1 })).toBe(0);
    expect(clockwiseFromTop(at, { x: 1, y: 0 })).toBeCloseTo(Math.PI / 2);
    expect(clockwiseFromTop(at, { x: 0, y: 1 })).toBeCloseTo(Math.PI);
    expect(clockwiseFromTop(at, { x: -1, y: 0 })).toBeCloseTo((3 * Math.PI) / 2);
    const s = createSession();
    const e = drawMindMap(s, MINDMAP_VARIANTS[0]);
    const r = readMindMap(s.getState())!;
    const id = (name: keyof typeof e.nodes) => r.symbols.find((x) => x.ids.includes(e.nodes[name].box[0]))!.id;
    expect(r.symbols.find((x) => x.id === id('Trip'))!.children).toEqual([id('Food'), id('Travel'), id('Sleep')]);
    expect(r.symbols.find((x) => x.id === id('Food'))!.children).toEqual([id('Pizza'), id('Ramen')]);
  });
});

describe('nodes', () => {
  it('a shape joined to nothing is beside the map, not in it, and the reading says how many of the shapes are joined', () => {
    const s = createSession(), t = { at: 1000 };
    hub(s, t);
    const stray = box(s, t, 900, 500, 110, 50, 9);
    word(s, t, 900, 500, 50, 30);
    const r = readMindMap(s.getState())!;
    expect(r.symbols.some((x) => x.ids.includes(stray))).toBe(false);
    expect(r.reason).toMatch(/four of five shapes joined/);
  });

  it('what a hand labelled a shape’s own ink with is its word', () => {
    const s = createSession(), t = { at: 1000 };
    const h = hub(s, t);
    s.label({ nodeId: h.root, text: 'Trip', at: (t.at += 10) });
    const r = readMindMap(s.getState())!;
    expect(r.symbols.find((x) => x.symbol === 'root')!.name.text).toBe('Trip');
  });
});

describe('ports', () => {
  it('a node offers its border, anywhere along it, and nothing else on a board offers one', () => {
    const s = createSession(), t = { at: 1000 };
    const h = hub(s, t);
    const nodes = s.getState().nodes;
    expect(mindMapPortsOf(nodes.get(h.a)!, nodes)?.symbol).toBe('node');
    expect(mindMapPortsOf(nodes.get(h.root)!, nodes)?.ports.map((x) => x.name)).toEqual(['border']);
    for (const id of [h.la, h.w[0]]) expect(mindMapPortsOf(nodes.get(id)!, nodes), id).toBeNull();
    // Offered to the pen only once the notation is in use.
    const sites = () => magnetSites(nodes.get(h.a)!, nodes).filter((x) => x.kind === 'along:mindmap');
    expect(sites()).toEqual([]);
    registerPorts(MINDMAP.ports!);
    expect(sites().length).toBeGreaterThan(8);
    unregisterPorts('mindmap');
    expect(sites()).toEqual([]);
  });
});
