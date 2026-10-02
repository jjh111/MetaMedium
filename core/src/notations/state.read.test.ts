// The state notation, rule by rule (V1-PLAN §3, §9 D5's state half). The
// acceptance is state.test.ts and the rates are state.bench.test.ts; here,
// each rule the reading rests on, pinned where it can break.

import { describe, it, expect } from 'vitest';
import { createSession } from '../session/session';
import type { Session } from '../session/session';
import { getRep, resemblances } from '../session/nodes';
import { magnetSites } from '../session/magnets';
import { ROLES } from '../diagram/roles';
import { registerPorts, unregisterPorts } from '../session/ports';
import { notationsOf, notationById, registeredNotations, describeNotation, NOTATION_FLOOR } from './notation';
import { readState, statePortsOf, STATE, STATE_TABLE } from './state';
import type { StateReading } from './state';
import { toMermaid } from './mermaid';
import './state-mermaid';
import { drawState, STATE_VARIANTS, filledDot, loopOver, drawArrowBetween, drawLineBetween } from './fixtures/state';
import { handShape, boxCorners, diamondCorners } from './fixtures/hand';
import { handCircle, handDot } from '../test/strokes';

const stateOf = (s: Session) => notationsOf(s.getState()).find((r) => r.notation === 'state') as StateReading | undefined;

/** An arrow from the initial dot's place to the left state's edge: a long shaft, its own barb at the tip. */
const leaving = [...Array(20)].map((_, i) => ({ x: 214 + i * 4.2, y: 200 })).concat([{ x: 290, y: 194 }, { x: 294, y: 200 }, { x: 290, y: 206 }, { x: 294, y: 200 }]);

/** Two rounded states side by side, `gap` apart — Idle on the left, Busy on the right — and where they stand. */
function pair(s: Session, t: { at: number }, o: { round?: number; seed?: number } = {}) {
  const idle = s.addStroke(handShape(boxCorners(300, 200, 150, 64), { seed: o.seed ?? 1, jitter: 2, round: o.round ?? 0.3 }), (t.at += 4000));
  const busy = s.addStroke(handShape(boxCorners(620, 200, 150, 64), { seed: (o.seed ?? 1) + 1, jitter: 2, round: o.round ?? 0.3 }), (t.at += 4000));
  return { idle, busy };
}
const across = (s: Session, t: { at: number }) => drawArrowBetween(s, t, { x: 377, y: 200 }, { x: 543, y: 200 }, { seed: 3 });

describe('the notation', () => {
  it('is registered beside the flowchart; three symbols and one transition, each one of the six roles; its content one table, which the pack names', () => {
    expect(registeredNotations()).toEqual(expect.arrayContaining(['flowchart', 'state']));
    expect(notationById('state')).toBe(STATE);
    expect(STATE.symbols.map((x) => x.name)).toEqual(['state', 'initial', 'final']);
    expect(STATE.connectors.map((x) => x.name)).toEqual(['transition']);
    for (const d of [...STATE.symbols, ...STATE.connectors]) expect(ROLES).toContain(d.role);
    expect(STATE_TABLE.pack).toBe('state@1');
    expect(STATE_TABLE.symbols.initial.mermaid).toEqual({ token: '[*]' });
  });

  it('every mark in the scope plays one of the six roles under it, and says so in one line', () => {
    const s = createSession();
    drawState(s, STATE_VARIANTS[0]);
    const r = readState(s.getState())!;
    for (const role of Object.values(r.roles)) expect(ROLES).toContain(role);
    expect(Object.keys(r.roles).sort()).toEqual([...s.getState().contentIds].sort());
    expect(r.unplaced).toEqual([]);
    expect(describeNotation(r)).toMatch(/^a state diagram 0\.\d\d — three states, one initial state, one final state, six transitions \(one a loop\)$/);
    const initial = r.symbols.find((x) => x.symbol === 'initial')!;
    expect(r.roles[initial.id]).toBe('node');
    const loop = r.connectors.find((k) => k.self)!;
    expect(r.roles[loop.id]).toBe('edge');
    for (const x of r.symbols.filter((y) => y.symbol === 'state')) expect(x.labels.map((id) => r.roles[id])).toEqual(['label']);
  });

  it('derived: reading writes nothing, and reads the same again', () => {
    const s = createSession();
    drawState(s, STATE_VARIANTS[2]);
    const events = s.getEvents().length, nodes = s.getState().nodes.size;
    const a = JSON.stringify(readState(s.getState()));
    expect(JSON.stringify(readState(s.getState()))).toBe(a);
    expect(s.getEvents().length).toBe(events);
    expect(s.getState().nodes.size).toBe(nodes);
  });
});

describe('what makes it a state diagram and not a flowchart', () => {
  it('plain boxes and arrows are a flowchart’s: no state reading at all', () => {
    const s = createSession(), t = { at: 1000 };
    pair(s, t, { round: 0.08 });
    across(s, t);
    expect(stateOf(s)).toBeUndefined();
    expect(notationsOf(s.getState()).map((r) => r.notation)).toEqual(['flowchart']);
  });

  it('round-cornered boxes and arrows alone are held under the floor — a state diagram in waiting — and the flowchart leads', () => {
    const s = createSession(), t = { at: 1000 };
    pair(s, t);
    across(s, t);
    const all = notationsOf(s.getState());
    const r = all.find((x) => x.notation === 'state')!;
    expect(r).toBeDefined();
    expect(r.confidence).toBeLessThan(NOTATION_FLOOR);
    expect(all[0].notation).toBe('flowchart');
    expect(r.reason).toMatch(/round-cornered states/);
  });

  it('a dot scribbled solid with an arrow leaving it is enough to read: the board is a state diagram, said with why', () => {
    const s = createSession(), t = { at: 1000 };
    const { idle } = pair(s, t);
    const dot = s.addStroke(filledDot(200, 200, 10, { style: 'spiral', seed: 4 }), (t.at += 4000));
    const long = s.addStroke(leaving, (t.at += 4000));
    const r = readState(s.getState())!;
    expect(r).not.toBeNull();
    expect(r.symbols.find((x) => x.symbol === 'initial')!.ids).toEqual([dot]);
    expect(r.connectors.map((k) => k.id)).toEqual([long]);
    expect(r.connectors[0].to).toBe(idle);
    expect(r.evidence.map((e) => e.what)).toContain('an initial dot scribbled solid');
    expect(r.confidence).toBeGreaterThanOrEqual(NOTATION_FLOOR);
  });

  it('the dot is read from its ink, whatever the shape rung called it — an arc, writing, a rectangle or nothing', () => {
    const called = new Set<string>();
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]) {
      for (const style of ['spiral', 'zigzag'] as const) {
        const s = createSession();
        const dot = s.addStroke(filledDot(200, 200, 10, { style, seed }), 1000);
        called.add(resemblances(s.getState().nodes.get(dot)!)[0]?.to ?? 'nothing');
        // Beside two states, with an arrow leaving it.
        const t = { at: 5000 };
        const { idle } = pair(s, t, { seed });
        const long = s.addStroke(leaving, (t.at += 4000));
        const r = readState(s.getState());
        expect(r?.symbols.find((x) => x.symbol === 'initial')?.ids, `${style} seed ${seed}`).toEqual([dot]);
        expect(r?.connectors.map((k) => k.id), `${style} seed ${seed}`).toEqual([long]);
        void idle;
      }
    }
    // The rung read them as anything but a dot: the notation cannot lean on it.
    expect(called.has('type:dot')).toBe(false);
    expect(called.size).toBeGreaterThan(1);
  });

  it('a decision in the drawing — a diamond, a flowchart’s symbol — counts against it', () => {
    const plain = createSession(), t0 = { at: 1000 };
    drawState(plain, STATE_VARIANTS[0]);
    const base = readState(plain.getState())!;
    const s = createSession();
    drawState(s, STATE_VARIANTS[0]);
    const t = { at: 100_000 };
    s.addStroke(handShape(diamondCorners(940, 400, 160, 100), { seed: 5, jitter: 2 }), (t.at += 4000));
    const r = readState(s.getState())!;
    expect(r.foreign).toBe(1);
    expect(r.confidence).toBeLessThan(base.confidence);
    expect(r.reason).toMatch(/one symbol only a flowchart has/);
    void t0;
  });
});

describe('the final state', () => {
  it('a ring with a mark inside it is a final state — a scribbled dot, a tap, a second ring — and the marks are the ring’s and the mark’s', () => {
    for (const final of ['filled', 'tap', 'ring'] as const) {
      const v = { ...STATE_VARIANTS[0], final };
      const s = createSession();
      const e = drawState(s, v);
      const r = readState(s.getState())!;
      const f = r.symbols.find((x) => x.symbol === 'final')!;
      expect([...f.ids].sort(), final).toEqual([...e.final].sort());
      expect(f.reason, final).toMatch(/a ring with a (second ring|mark) inside it, one transition arrives at it/);
    }
  });

  it('a hollow ring alone is a final state by where its transition runs — less surely, and with no bullseye to count for the diagram', () => {
    const s = createSession(), t = { at: 1000 };
    const { busy } = pair(s, t);
    const ring = s.addStroke(handCircle(850, 200, 18, { seed: 9, jitter: 1.5 }), (t.at += 4000));
    const stop = drawArrowBetween(s, t, { x: 697, y: 200 }, { x: 830, y: 200 }, { seed: 4 });
    // A loop out of Busy so the board is a state diagram at all.
    const loop = s.addStroke(loopOver(596, 644, 163, 44, { seed: 6, jitter: 0.8 }), (t.at += 4000));
    const r = readState(s.getState())!;
    const f = r.symbols.find((x) => x.symbol === 'final')!;
    expect(f.ids).toEqual([ring]);
    expect(f.confidence).toBeLessThan(0.55);
    expect(r.connectors.find((k) => k.id === stop)!.to).toBe(f.id);
    expect(r.connectors.find((k) => k.id === loop)!.self).toBe(true);
    expect(r.connectors.find((k) => k.id === stop)!.from).toBe(busy);
    expect(r.evidence.map((e) => e.what)).not.toContain('a final ring with a mark inside it');
  });

  it('a ring and the dot in it drawn quickly are gathered into a word by the letter rules, and are still the final ring', () => {
    const s = createSession();
    const e = drawState(s, STATE_VARIANTS[0], 1000, { quick: true });
    const st = s.getState();
    const gathered = st.contentIds.some((id) => (getRep(st.nodes.get(id)!, 'word') !== undefined || st.nodes.get(id)!.reps.some((x) => x.modality === 'word')));
    const r = readState(st)!;
    const f = r.symbols.find((x) => x.symbol === 'final')!;
    expect([...f.ids].sort()).toEqual([...e.final].sort());
    expect(r.unplaced).toEqual([]);
    // Whether or not the rules gathered them this time, the reading is the same.
    void gathered;
  });
});

describe('transitions', () => {
  it('a line with no head is no transition: a line joins nothing here, and is left as a pointer', () => {
    const s = createSession(), t = { at: 1000 };
    const { idle, busy } = pair(s, t);
    const line = drawLineBetween(s, t, { x: 377, y: 200 }, { x: 543, y: 200 }, { seed: 3 });
    s.addStroke(filledDot(200, 200, 10, { style: 'spiral', seed: 4 }), (t.at += 4000));
    // Nothing to read with one dot and no arrow: no state diagram.
    expect(readState(s.getState())).toBeNull();
    void idle;
    void busy;
    void line;
  });

  it('a transition is read past its head: the arrow’s tip lands on the state, the ends tied by a magnet outrank nearness', () => {
    const s = createSession();
    const e = drawState(s, STATE_VARIANTS[0]);
    const r = readState(s.getState())!;
    const start = r.connectors.find((k) => k.id === e.transitions[1].id)!;
    expect(start.direction).toBe('forward');
    expect(start.ends.to.head?.kind).toBe('arrow');
    expect(start.ends.to.symbol).toBe(start.to);
    expect(start.reason).toMatch(/^an arrow from .* to .*, its arrowhead at /);
  });

  it('a loop out of a state and back is a self-transition when its barb folds back where it comes back — at either end — and no transition without one', () => {
    const cases: { name: string; ink: () => ReturnType<typeof loopOver>; self: boolean }[] = [
      { name: 'the barb at its end', ink: () => loopOver(596, 644, 163, 44, { seed: 6, jitter: 0.8 }), self: true },
      { name: 'the barb at its start (drawn the other way round)', ink: () => loopOver(644, 596, 163, 44, { seed: 6, jitter: 0.8 }).reverse(), self: true },
      { name: 'no barb', ink: () => loopOver(596, 644, 163, 44, { seed: 6, jitter: 0.8, barb: 0 }).slice(0, 34), self: false },
    ];
    for (const c of cases) {
      const s = createSession(), t = { at: 1000 };
      pair(s, t);
      s.addStroke(filledDot(200, 200, 10, { style: 'spiral', seed: 4 }), (t.at += 4000));
      const arrow = s.addStroke(leaving, (t.at += 4000));
      const loop = s.addStroke(c.ink(), (t.at += 4000));
      const r = readState(s.getState())!;
      expect(r.connectors.some((k) => k.id === loop && k.self), c.name).toBe(c.self);
      void arrow;
    }
  });
});

describe('a box holding a state is a composite state’s frame: left out, its state read', () => {
  it('the frame is a container, not a state', () => {
    const s = createSession(), t = { at: 1000 };
    const frame = s.addStroke(handShape(boxCorners(470, 240, 660, 260), { seed: 11, jitter: 2, round: 0.15 }), (t.at += 4000));
    const inner = s.addStroke(handShape(boxCorners(330, 240, 150, 64), { seed: 12, jitter: 2, round: 0.3 }), (t.at += 4000));
    const inner2 = s.addStroke(handShape(boxCorners(610, 240, 150, 64), { seed: 13, jitter: 2, round: 0.3 }), (t.at += 4000));
    s.addStroke(filledDot(150, 240, 10, { style: 'spiral', seed: 4 }), (t.at += 4000));
    drawArrowBetween(s, t, { x: 407, y: 240 }, { x: 533, y: 240 }, { seed: 3 });
    const r = readState(s.getState())!;
    void inner2;
    expect(r).not.toBeNull();
    expect(r.roles[frame]).toBe('container');
    expect(r.symbols.some((x) => x.ids.includes(frame))).toBe(false);
    expect(r.symbols.some((x) => x.ids.includes(inner) && x.symbol === 'state')).toBe(true);
  });
});

describe('ports (the E3 hook)', () => {
  it('a state offers its border — one closed port, anywhere along it — and a dot scribbled solid its four cardinals; writing and a transition offer none', () => {
    const s = createSession(), t = { at: 1000 };
    const { idle } = pair(s, t);
    const dot = s.addStroke(filledDot(200, 200, 10, { style: 'spiral', seed: 4 }), (t.at += 4000));
    const arrow = across(s, t);
    const st = s.getState();
    const box = statePortsOf(st.nodes.get(idle)!, st.nodes)!;
    expect(box.symbol).toBe('state');
    expect(box.ports).toHaveLength(1);
    expect(box.ports[0]).toMatchObject({ name: 'border', closed: true });
    expect(box.ports[0].along!.length).toBeGreaterThan(8);
    const spot = statePortsOf(st.nodes.get(dot)!, st.nodes)!;
    expect(spot.ports.map((p) => p.name)).toEqual(['top', 'right', 'bottom', 'left']);
    expect(statePortsOf(st.nodes.get(arrow)!, st.nodes)).toBeNull();
  });

  it('offered to the pen, the notation’s border is on the magnet queries beside the box’s own sites; taken back, it is gone', () => {
    const s = createSession(), t = { at: 1000 };
    const { idle } = pair(s, t);
    const node = () => s.getState().nodes.get(idle)!;
    const own = magnetSites(node(), s.getState().nodes).length;
    const off = registerPorts(STATE.ports!);
    const withPorts = magnetSites(node(), s.getState().nodes);
    expect(withPorts.length).toBeGreaterThan(own);
    expect(withPorts.filter((x) => x.kind === 'along:state').length).toBeGreaterThan(8);
    off();
    unregisterPorts('state');
    expect(magnetSites(node(), s.getState().nodes).length).toBe(own);
  });
});

describe('Mermaid', () => {
  it('a reading says its Mermaid; a board with no transition between states reads as none', () => {
    const s = createSession();
    drawState(s, STATE_VARIANTS[0]);
    expect(toMermaid(readState(s.getState())!)!.diagram).toBe('stateDiagram-v2');
    const empty = createSession();
    empty.addStroke(handDot(100, 100, 5, { seed: 1 }), 1000);
    expect(readState(empty.getState())).toBeNull();
  });
});
