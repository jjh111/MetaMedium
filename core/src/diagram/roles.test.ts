// The diagram rung: every row of the table, and the genre it adds up to.
//
// Two kinds of test. The first builds RoleScopes by hand, so each table row is
// exercised in isolation with nothing else in the way. The second goes through
// a real session — draw it, read it — so the rung is tested against what the
// shape rung and the relation graph actually produce, not against what I
// assumed they would.

import { describe, it, expect } from 'vitest';
import { assignRoles, genreOf, describeRoles, ROLES, type RoleScope } from './roles';
import { relate, type Mark } from '../relate/relations';
import { createSession } from '../session/session';
import { handRect, handCircle, handArrow, handLine, handText, handDot } from '../test/strokes';

const box = (id: string, x: number, y: number, w: number, h: number): Mark => ({
  id, bounds: { minX: x, minY: y, maxX: x + w, maxY: y + h }, closed: true,
});

function scopeOf(marks: Mark[], shapes: Record<string, string>, wires: RoleScope['wires'] = {}): RoleScope {
  const shapeConfidence: Record<string, number> = {};
  for (const id of Object.keys(shapes)) shapeConfidence[id] = 0.85;
  return { ids: marks.map((m) => m.id), shapes, shapeConfidence, relations: relate(marks), wires };
}

describe('the role vocabulary is closed', () => {
  it('has exactly six entries, and unclassified is one of them', () => {
    expect(ROLES).toEqual(['container', 'node', 'edge', 'label', 'annotation', 'unclassified']);
  });
});

describe('the table, row by row', () => {
  it('1. a closed mark enclosing others is a container', () => {
    const s = scopeOf([box('a', 0, 0, 400, 300), box('b', 40, 40, 100, 60)], { a: 'rectangle', b: 'rectangle' });
    const [a, b] = assignRoles(s);
    expect(a.role).toBe('container');
    expect(a.rule).toBe(1);
    expect(a.targets).toEqual(['b']);
    expect(b.role).toBe('node');
  });

  it('2. writing inside a closed mark is its label', () => {
    const s = scopeOf(
      [box('btn', 0, 0, 160, 50), { id: 'w', bounds: { minX: 30, minY: 15, maxX: 130, maxY: 35 } }],
      { btn: 'rectangle', w: 'text' }
    );
    const w = assignRoles(s).find((r) => r.id === 'w')!;
    expect(w.role).toBe('label');
    expect(w.rule).toBe(2);
    expect(w.targets).toEqual(['btn']);
    // The box is still a container — it holds the label.
    expect(assignRoles(s).find((r) => r.id === 'btn')!.role).toBe('container');
  });

  it('2. a dot inside a box is a label too', () => {
    const s = scopeOf(
      [box('cb', 0, 0, 40, 40), { id: 'd', bounds: { minX: 17, minY: 17, maxX: 23, maxY: 23 } }],
      { cb: 'rectangle', d: 'dot' }
    );
    expect(assignRoles(s).find((r) => r.id === 'd')!.role).toBe('label');
  });

  it('3. writing beside a mark, not inside it, is a caption', () => {
    const s = scopeOf(
      [box('pic', 0, 0, 200, 150), { id: 'cap', bounds: { minX: 20, minY: 165, maxX: 180, maxY: 190 } }],
      { pic: 'rectangle', cap: 'text' }
    );
    const cap = assignRoles(s).find((r) => r.id === 'cap')!;
    expect(cap.role).toBe('label');
    expect(cap.rule).toBe(3);
    expect(cap.targets).toEqual(['pic']);
  });

  it('4. an arrow joining two marks is a directed edge', () => {
    const s = scopeOf(
      [box('a', 0, 0, 100, 60), box('b', 300, 0, 100, 60), { id: 'e', bounds: { minX: 100, minY: 25, maxX: 300, maxY: 40 } }],
      { a: 'rectangle', b: 'rectangle', e: 'arrow' },
      { e: { ends: ['a', 'b'], from: 'a', to: 'b' } }
    );
    const e = assignRoles(s).find((r) => r.id === 'e')!;
    expect(e.role).toBe('edge');
    expect(e.rule).toBe(4);
    expect(e.direction).toEqual({ from: 'a', to: 'b' });
  });

  it('5. a line joining two marks is an undirected edge', () => {
    const s = scopeOf(
      [box('a', 0, 0, 100, 60), box('b', 300, 0, 100, 60), { id: 'e', bounds: { minX: 100, minY: 25, maxX: 300, maxY: 40 } }],
      { a: 'rectangle', b: 'rectangle', e: 'line' },
      { e: { ends: ['a', 'b'] } }
    );
    const e = assignRoles(s).find((r) => r.id === 'e')!;
    expect(e.role).toBe('edge');
    expect(e.rule).toBe(5);
    expect(e.direction).toBeUndefined();
  });

  it('6. a line with one end on a mark is a pointer — an annotation', () => {
    const s = scopeOf(
      [box('a', 0, 0, 100, 60), { id: 'p', bounds: { minX: 100, minY: 25, maxX: 250, maxY: 120 } }],
      { a: 'rectangle', p: 'arrow' },
      { p: { ends: ['a'] } }
    );
    const p = assignRoles(s).find((r) => r.id === 'p')!;
    expect(p.role).toBe('annotation');
    expect(p.rule).toBe(6);
    expect(p.targets).toEqual(['a']);
  });

  it('7. a closed mark on its own is a node; so is a dot something connects to', () => {
    const s = scopeOf([box('a', 0, 0, 100, 60)], { a: 'circle' });
    expect(assignRoles(s)[0].role).toBe('node');
    expect(assignRoles(s)[0].rule).toBe(7);

    const t = scopeOf(
      [{ id: 'd', bounds: { minX: 0, minY: 0, maxX: 6, maxY: 6 } }, box('b', 100, 0, 80, 50), { id: 'l', bounds: { minX: 6, minY: 3, maxX: 100, maxY: 25 } }],
      { d: 'dot', b: 'rectangle', l: 'line' },
      { l: { ends: ['d', 'b'] } }
    );
    expect(assignRoles(t).find((r) => r.id === 'd')!.role).toBe('node');
  });

  it('8. a mark that relates to nothing is an annotation', () => {
    const s = scopeOf(
      [box('a', 0, 0, 100, 60), { id: 'far', bounds: { minX: 2000, minY: 2000, maxX: 2040, maxY: 2010 } }],
      { a: 'rectangle', far: 'arc' }
    );
    const far = assignRoles(s).find((r) => r.id === 'far')!;
    expect(far.role).toBe('annotation');
    expect(far.rule).toBe(8);
  });

  it('9. says unclassified out loud rather than guessing', () => {
    // An arc that is near a box but neither a connector with ends nor writing.
    const s = scopeOf(
      [box('a', 0, 0, 100, 60), { id: 'arc', bounds: { minX: 110, minY: 0, maxX: 170, maxY: 60 } }],
      { a: 'rectangle', arc: 'arc' }
    );
    const arc = assignRoles(s).find((r) => r.id === 'arc')!;
    expect(arc.role).toBe('unclassified');
    expect(arc.rule).toBe(0);
    expect(arc.confidence).toBe(0);
  });
});

describe('genre', () => {
  it('boxes with no edges are a layout', () => {
    const s = scopeOf([box('a', 0, 0, 100, 60), box('b', 120, 0, 100, 60)], { a: 'rectangle', b: 'rectangle' });
    expect(genreOf(assignRoles(s)).genre).toBe('layout');
  });

  it('nodes joined by edges are a graph', () => {
    const s = scopeOf(
      [box('a', 0, 0, 100, 60), box('b', 300, 0, 100, 60), { id: 'e', bounds: { minX: 100, minY: 25, maxX: 300, maxY: 40 } }],
      { a: 'rectangle', b: 'rectangle', e: 'arrow' },
      { e: { ends: ['a', 'b'], from: 'a', to: 'b' } }
    );
    expect(genreOf(assignRoles(s)).genre).toBe('graph');
  });

  it('a graph inside a container is mixed', () => {
    const s = scopeOf(
      [box('frame', -50, -50, 500, 200), box('a', 0, 0, 100, 60), box('b', 300, 0, 100, 60), { id: 'e', bounds: { minX: 100, minY: 25, maxX: 300, maxY: 40 } }],
      { frame: 'rectangle', a: 'rectangle', b: 'rectangle', e: 'arrow' },
      { e: { ends: ['a', 'b'], from: 'a', to: 'b' } }
    );
    expect(genreOf(assignRoles(s)).genre).toBe('mixed');
  });

  it('nothing playing a node is empty', () => {
    const s = scopeOf([{ id: 'w', bounds: { minX: 0, minY: 0, maxX: 100, maxY: 20 } }], { w: 'text' });
    expect(genreOf(assignRoles(s)).genre).toBe('empty');
  });
});

describe('through a real session — the rung on what the engine actually reads', () => {
  it('a flowchart: two boxes and an arrow read as node, node, directed edge; genre graph', () => {
    const s = createSession();
    const a = s.addStroke(handRect(100, 100, 140, 80, { seed: 1 }), 1000);
    const b = s.addStroke(handRect(420, 100, 140, 80, { seed: 2 }), 1100);
    const e = s.addStroke(handArrow({ x: 245, y: 140 }, { x: 415, y: 140 }, { seed: 3 }), 1200);
    const r = s.read([a, b, e]);
    const role = (id: string) => r.roles.find((x) => x.id === id)!;
    expect(role(a).role).toBe('node');
    expect(role(b).role).toBe('node');
    expect(role(e).role).toBe('edge');
    expect(role(e).direction).toEqual({ from: a, to: b });
    expect(r.genre.genre).toBe('graph');
  });

  it('a page: header, two columns, footer read as four nodes; genre layout', () => {
    const s = createSession();
    const ids = [
      s.addStroke(handRect(100, 100, 600, 90, { seed: 1 }), 1000),
      s.addStroke(handRect(100, 220, 290, 240, { seed: 2 }), 1100),
      s.addStroke(handRect(410, 220, 290, 240, { seed: 3 }), 1200),
      s.addStroke(handRect(100, 490, 600, 70, { seed: 4 }), 1300),
    ];
    const r = s.read(ids);
    expect(r.roles.map((x) => x.role)).toEqual(['node', 'node', 'node', 'node']);
    expect(r.genre.genre).toBe('layout');
  });

  it('a labelled button: writing inside a box is its label', () => {
    const s = createSession();
    const btn = s.addStroke(handRect(100, 100, 200, 60, { seed: 1 }), 1000);
    const w = s.addStroke(handText(130, 115, 140, 28, { seed: 2, humps: 5 }), 1100);
    const r = s.read([btn, w]);
    expect(r.roles.find((x) => x.id === w)!.role).toBe('label');
    expect(r.roles.find((x) => x.id === btn)!.role).toBe('container');
  });

  it('a closed mark far from everything is still a node — you draw boxes before you connect them', () => {
    const s = createSession();
    const a = s.addStroke(handRect(100, 100, 140, 80, { seed: 1 }), 1000);
    const lone = s.addStroke(handCircle(1500, 1500, 30, { seed: 2 }), 1100);
    const r = s.read([a, lone]);
    const reading = r.roles.find((x) => x.id === lone)!;
    expect(reading.role).toBe('node');
    expect(reading.reasoning).toMatch(/on its own/);
  });

  it('an open stray far from everything is a note in the margin', () => {
    const s = createSession();
    const a = s.addStroke(handRect(100, 100, 140, 80, { seed: 1 }), 1000);
    const stray = s.addStroke(handLine({ x: 1500, y: 1500 }, { x: 1620, y: 1540 }, { seed: 2 }), 1100);
    const r = s.read([a, stray]);
    expect(r.roles.find((x) => x.id === stray)!.role).toBe('annotation');
    expect(r.roles.find((x) => x.id === stray)!.rule).toBe(8);
  });

  it('a plain line between two boxes is an undirected edge', () => {
    const s = createSession();
    const a = s.addStroke(handRect(100, 100, 140, 80, { seed: 1 }), 1000);
    const b = s.addStroke(handRect(420, 100, 140, 80, { seed: 2 }), 1100);
    const l = s.addStroke(handLine({ x: 242, y: 140 }, { x: 418, y: 140 }, { seed: 3 }), 1200);
    const r = s.read([a, b, l]);
    expect(r.roles.find((x) => x.id === l)!.role).toBe('edge');
    expect(r.roles.find((x) => x.id === l)!.direction).toBeUndefined();
  });

  it('a dot on its own is a note; a dot with a line to it is a node', () => {
    const s = createSession();
    const d = s.addStroke(handDot(100, 100, 3, { seed: 1 }), 1000);
    const b = s.addStroke(handRect(300, 80, 120, 60, { seed: 2 }), 1100);
    const l = s.addStroke(handLine({ x: 104, y: 100 }, { x: 298, y: 110 }, { seed: 3 }), 1200);
    const r = s.read([d, b, l]);
    expect(r.roles.find((x) => x.id === d)!.role).toBe('node');
  });

  it('describes itself for a model or a person', () => {
    const s = createSession();
    const a = s.addStroke(handRect(100, 100, 140, 80, { seed: 1 }), 1000);
    const b = s.addStroke(handRect(420, 100, 140, 80, { seed: 2 }), 1100);
    const e = s.addStroke(handArrow({ x: 245, y: 140 }, { x: 415, y: 140 }, { seed: 3 }), 1200);
    const r = s.read([a, b, e]);
    const text = describeRoles(r.roles, r.genre);
    expect(text).toContain('GENRE: graph');
    expect(text).toContain(`${e}: edge (${a} → ${b})`);
  });
});
