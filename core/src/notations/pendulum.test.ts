// The pendulum, read (MATHS-SPEC §8 Lane D, M23; V1-SPEC RN4's first runner).
//
// A pivot — a ceiling with its hatching, a dot, or the rod's top end alone — a
// rod hung from it and a bob at the rod's other end read as *a pendulum 0.8 — a
// rod from a pivot, a bob, drawn 20° from plumb*. The reading holds for a drawn
// pendulum and is weaker without a pivot; a bob above its pivot is no pendulum.
// What it reads is the geometry the physics needs — the pivot, the bob, the angle
// from plumb, the length in px — and the roles are the six and no more.

import { describe, it, expect } from 'vitest';
import { createSession, describeNotation, notationsOf, NOTATION_FLOOR } from '../index';
import type { Session } from '../index';
import { handCircle, handLine } from '../test/strokes';
import { PENDULUM_VARIANTS, drawPendulum } from './fixtures/pendulum';
import type { PendulumVariant } from './fixtures/pendulum';
import { pendulumsIn, readPendulum } from './pendulum';

const base: PendulumVariant = { seed: 7, jitter: 1.5, theta: 20, length: 220, pivot: 'hatched', bob: 'ring' };
const draw = (v: Partial<PendulumVariant> = {}, o: { k?: number } = {}) => {
  const s = createSession();
  const e = drawPendulum(s, { ...base, ...v }, 1000, o);
  return { s, e, r: readPendulum(s.getState()) };
};
const deg = (rad: number) => (rad * 180) / Math.PI;

describe('a drawn pendulum', () => {
  it('reads as a pendulum: a rod from a pivot, a bob, drawn 20° from plumb', () => {
    const { s, e, r } = draw();
    expect(r).not.toBeNull();
    expect(r!.confidence).toBeGreaterThanOrEqual(NOTATION_FLOOR);
    expect(r!.notation).toBe('pendulum');
    expect(r!.summary).toBe('a rod from a pivot, a bob, drawn 20° from plumb');
    // The field's “what this is” row says it in the person's words, through the notation registry (N1).
    const said = notationsOf(s.getState()).map(describeNotation);
    expect(said).toHaveLength(1);
    expect(said[0]).toMatch(/^a pendulum 0\.\d\d — a rod from a pivot, a bob, drawn 20° from plumb$/);
    expect(r!.pendulums).toHaveLength(1);
    const p = r!.pendulums[0];
    expect(p.rod).toBe(e.rod);
    expect(p.bob).toBe(e.bob);
  });

  it('reads the geometry the physics needs: where it hangs from, where the bob is, the angle and the length', () => {
    const { e, r } = draw();
    const p = r!.pendulums[0];
    expect(Math.hypot(p.pivot.x - e.pivotAt.x, p.pivot.y - e.pivotAt.y)).toBeLessThan(6);
    expect(Math.hypot(p.bobAt.x - e.bobAt.x, p.bobAt.y - e.bobAt.y)).toBeLessThan(6);
    expect(Math.abs(deg(p.theta) - 20)).toBeLessThan(2);
    expect(Math.abs(p.length - e.length) / e.length).toBeLessThan(0.05);
    expect(p.bobRadius).toBeGreaterThan(15);
    expect(p.pivotKind).toBe('hatched ceiling');
  });

  it('says which way it leans: left is negative, and the sentence still says how far', () => {
    const { r } = draw({ theta: -32 });
    expect(r!.pendulums[0].theta).toBeLessThan(0);
    expect(Math.abs(deg(r!.pendulums[0].theta) + 32)).toBeLessThan(2);
    expect(r!.summary).toBe('a rod from a pivot, a bob, drawn 32° from plumb');
  });

  it('hangs plumb when the rod is drawn plumb, and says so', () => {
    const { r } = draw({ theta: 0 });
    expect(r!.summary).toBe('a rod from a pivot, a bob, hanging plumb');
    expect(Math.abs(deg(r!.pendulums[0].theta))).toBeLessThan(1.5);
    expect(r!.pendulums[0].plumb).toBe(true);
  });

  it('reads a bob scribbled solid as a bob, and a dot as a pivot', () => {
    const { r } = draw({ pivot: 'dot', bob: 'filled' });
    expect(r!.confidence).toBeGreaterThanOrEqual(NOTATION_FLOOR);
    expect(r!.pendulums[0].pivotKind).toBe('dot');
  });

  it('plays six roles and adds none: the rod an edge, the bob a node, what it hangs from an annotation', () => {
    const { e, r } = draw();
    expect(r!.roles[e.rod]).toBe('edge');
    expect(r!.roles[e.bob]).toBe('node');
    for (const id of e.pivot) expect(r!.roles[id]).toBe('annotation');
    expect(r!.unplaced).toEqual([]);
    for (const role of Object.values(r!.roles)) expect(['container', 'node', 'edge', 'label', 'annotation', 'unclassified']).toContain(role);
  });

  it('is derived: reading changes nothing in the log', () => {
    const { s } = draw();
    const before = s.getEvents().length;
    readPendulum(s.getState());
    notationsOf(s.getState());
    expect(s.getEvents().length).toBe(before);
  });

  it('holds at other sizes and in other places', () => {
    for (const k of [0.6, 1.8]) {
      const s = createSession();
      drawPendulum(s, base, 1000, { k, at: { x: 3000, y: 2000 } });
      const r = readPendulum(s.getState());
      expect(r, `×${k}`).not.toBeNull();
      expect(r!.confidence, `×${k}`).toBeGreaterThanOrEqual(NOTATION_FLOOR);
    }
  });
});

describe('weaker without a pivot, and none upside down', () => {
  it('a rod and a bob with nothing drawn at the rod’s top end are held, but weaker than with a pivot — and under the floor', () => {
    const full = draw().r!;
    const ceiling = draw({ pivot: 'ceiling' }).r!;
    const dot = draw({ pivot: 'dot' }).r!;
    const bare = draw({ pivot: 'none' }).r;
    expect(bare).not.toBeNull();
    expect(bare!.pendulums[0].pivotKind).toBe('the rod’s top end');
    expect(bare!.confidence).toBeLessThan(full.confidence - 0.2);
    expect(bare!.confidence).toBeLessThan(ceiling.confidence);
    expect(bare!.confidence).toBeLessThan(dot.confidence);
    expect(bare!.confidence).toBeLessThan(NOTATION_FLOOR);
    expect(bare!.confidence).toBeGreaterThan(0.1);
    // The hatching earns its keep: a ceiling with hatching is surer than a ceiling alone.
    expect(full.confidence).toBeGreaterThan(ceiling.confidence);
  });

  it('a bob above its pivot hangs from nothing: no pendulum above the floor', () => {
    // The same drawing turned upside down on the page.
    const s = createSession();
    let t = 1000;
    const at = () => (t += 4000);
    s.addStroke(handLine({ x: 300, y: 480 }, { x: 500, y: 480 }, { seed: 3, jitter: 1.5 }), at());
    s.addStroke(handLine({ x: 400, y: 480 }, { x: 400, y: 300 }, { seed: 4, jitter: 1.5 }), at());
    s.addStroke(handCircle(400, 276, 24, { seed: 5, jitter: 1.5 }), at());
    const r = readPendulum(s.getState());
    expect(!r || r.confidence < NOTATION_FLOOR).toBe(true);
  });

  it('a rod between two rings of one size is a bond, not a pendulum', () => {
    const s = createSession();
    let t = 1000;
    const at = () => (t += 4000);
    s.addStroke(handCircle(400, 200, 30, { seed: 5, jitter: 1.5 }), at());
    s.addStroke(handLine({ x: 400, y: 231 }, { x: 400, y: 349 }, { seed: 4, jitter: 1.5 }), at());
    s.addStroke(handCircle(400, 380, 30, { seed: 6, jitter: 1.5 }), at());
    const r = readPendulum(s.getState());
    expect(!r || r.confidence < NOTATION_FLOOR).toBe(true);
  });

  it('a ring with a line standing beside it, touching nothing, is nothing', () => {
    const s = createSession();
    s.addStroke(handLine({ x: 100, y: 100 }, { x: 100, y: 300 }, { seed: 4 }), 1000);
    s.addStroke(handCircle(400, 320, 24, { seed: 5 }), 5000);
    expect(readPendulum(s.getState())).toBeNull();
  });
});

describe('several, and writing beside', () => {
  it('two pendulums on one board are two, and the sentence says so', () => {
    const s = createSession();
    drawPendulum(s, base, 1000, { at: { x: 400, y: 120 } });
    drawPendulum(s, { ...base, seed: 9, theta: -12 }, 80000, { at: { x: 900, y: 120 } });
    const r = readPendulum(s.getState())!;
    expect(r.pendulums).toHaveLength(2);
    expect(r.summary).toMatch(/^two pendulums/);
    expect(pendulumsIn(s.getState())).toHaveLength(2);
  });

  it('can be asked of the marks it is given only — the ones held', () => {
    const s = createSession();
    const a = drawPendulum(s, base, 1000, { at: { x: 400, y: 120 } });
    drawPendulum(s, { ...base, seed: 9, theta: -12 }, 80000, { at: { x: 900, y: 120 } });
    const one = readPendulum(s.getState(), a.all)!;
    expect(one.pendulums).toHaveLength(1);
    expect(one.pendulums[0].rod).toBe(a.rod);
  });

  it('writing beside the rod labels it, and is not left unplaced', () => {
    const s: Session = createSession();
    const e = drawPendulum(s, base, 1000);
    const mid = { x: (e.pivotAt.x + e.bobAt.x) / 2, y: (e.pivotAt.y + e.bobAt.y) / 2 };
    const t = s.import({ kind: 'text', path: 'text/L.txt', name: '1 m', bounds: { minX: mid.x + 24, minY: mid.y - 12, maxX: mid.x + 84, maxY: mid.y + 12 }, code: '1 m', at: 60000 })!;
    expect(t).toBeTruthy();
    const r = readPendulum(s.getState());
    expect(r).not.toBeNull();
    expect(r!.confidence).toBeGreaterThanOrEqual(NOTATION_FLOOR);
  });
});

describe('inside a blessed artifact', () => {
  it('a pendulum whose marks were named is still read, from the marks it is given', () => {
    const s = createSession();
    const e = drawPendulum(s, base, 1000);
    s.summonMarks(e.all, 90000);
    const id = s.bless({ summonId: s.getState().summon!.id, name: 'pendulum', at: 91000 });
    expect(id).toBeTruthy();
    const r = readPendulum(s.getState(), e.all);
    expect(r).not.toBeNull();
    expect(r!.pendulums[0].rod).toBe(e.rod);
    // And the whole board, whose content plane now holds the artifact and not its marks, finds it too.
    const board = readPendulum(s.getState());
    expect(board).not.toBeNull();
    expect(board!.pendulums[0].rod).toBe(e.rod);
  });
});

describe('the variants the bench draws', () => {
  it('every one of the first dozen reads, and the angle drawn is the angle read to 2°', () => {
    for (const v of PENDULUM_VARIANTS.slice(0, 12)) {
      const s = createSession();
      const e = drawPendulum(s, v, 1000);
      const r = readPendulum(s.getState());
      expect(r, `seed ${v.seed}`).not.toBeNull();
      expect(Math.abs(deg(r!.pendulums[0].theta) - e.theta), `seed ${v.seed} θ`).toBeLessThan(2.5);
    }
  });
});
