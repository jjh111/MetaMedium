// Frames: a drawn slider's value is where its knob sits; interfaces are read,
// not declared; connections are offered by type and name; resolution wires
// values in; export writes a folder. Fixtures are generic — a script with a
// tunable, a page with a slot, a control — and no name means anything.

import { describe, it, expect } from 'vitest';
import { createSession } from '../session/session';
import { LOCAL_PARTICIPANT, isFrame, frameOfNode } from '../session/nodes';
import { lineStroke, circleStroke, checkStroke, rectStroke } from '../test/strokes';
import { sliderOf, controlOf, paramsOf, withParams, interfacesOf, connectionsFor, resolveFrame, describeFrame, exportFrame, slotsIn } from './frame';
import { matchConcepts } from '../concepts/concept';
import type { Point } from '../types';

const dot = (x: number, y: number): Point[] => circleStroke(x, y, 3, 16);

/** A track and a knob a third of the way along, circled and named, then given the control kind. */
function slider(s: ReturnType<typeof createSession>, t0: number, x = 100, y = 300, at = 0.33) {
  const track = s.addStroke(lineStroke({ x, y }, { x: x + 300, y }), t0);
  const knob = s.addStroke(dot(x + 300 * at, y + 1), t0 + 500);
  s.addStroke(circleStroke(x + 150, y, 200), t0 + 1000);
  s.addStroke(checkStroke(x + 330, y + 40), t0 + 1500);
  const id = s.bless({ summonId: s.getState().summon!.id, name: 'amount', at: t0 + 2000 })!;
  s.attachCode({ participantId: LOCAL_PARTICIPANT, nodeId: id, kind: 'control', code: '{"min":0,"max":10}', at: t0 + 2500 });
  return { id, track, knob };
}

function named(s: ReturnType<typeof createSession>, t0: number, x: number, y: number, name: string, kind: 'js' | 'html' | 'json' | 'text', code: string) {
  s.addStroke(rectStroke(x, y, 200, 120), t0);
  s.addStroke(circleStroke(x + 100, y + 60, 200), t0 + 500);
  s.addStroke(checkStroke(x + 320, y + 50), t0 + 1000);
  const id = s.bless({ summonId: s.getState().summon!.id, name, at: t0 + 1500 })!;
  s.attachCode({ participantId: LOCAL_PARTICIPANT, nodeId: id, kind, code, at: t0 + 2000 });
  return id;
}

describe('the drawn slider', () => {
  it('a line with a dot on it reads as a slider, and the concept offers to make it a control', () => {
    const s = createSession();
    const track = s.addStroke(lineStroke({ x: 100, y: 300 }, { x: 400, y: 300 }), 1000);
    const knob = s.addStroke(dot(200, 301), 1500);
    const sl = sliderOf([track, knob], s.getState().nodes);
    expect(sl?.track).toBe(track);
    expect(sl?.knob).toBe(knob);
    expect(sl?.t).toBeCloseTo(0.333, 2);
    const reading = s.read([track, knob]);
    const m = matchConcepts(reading.scope);
    const slider = m.find((c) => c.concept === 'slider');
    expect(slider).toBeDefined();
    expect(slider!.conversions.some((c) => c.effect.kind === 'control')).toBe(true);
    // Two boxes are not a slider; a dot far off the line is not on it.
    const s2 = createSession();
    const a = s2.addStroke(lineStroke({ x: 100, y: 300 }, { x: 400, y: 300 }), 1000);
    const b = s2.addStroke(dot(200, 380), 1500);
    expect(sliderOf([a, b], s2.getState().nodes)).toBeNull();
  });

  it('a control artifact\'s value is where the knob sits, in its range — and moving the knob is setting it', () => {
    const s = createSession();
    const { id, knob } = slider(s, 1000);
    const nodes = () => s.getState().nodes;
    const c0 = controlOf(nodes().get(id)!, nodes())!;
    expect(c0.value).toBeCloseTo(3.3, 1);
    expect(c0.reasoning).toMatch(/33% along the track/);
    // The knob moved by a drag: one event in the log, and the value follows.
    s.move({ ids: [knob], dx: 150, dy: 0, at: 5100 });
    const c1 = controlOf(nodes().get(id)!, nodes())!;
    expect(c1.value).toBeCloseTo(8.3, 1);
    s.undo();
    expect(controlOf(nodes().get(id)!, nodes())!.value).toBeCloseTo(3.3, 1);
  });
});

describe('interfaces and connections', () => {
  const JS = 'const SPEED = 120;\nconst TURN = 0.9;\nfunction steer(world) {\n  return { fx: SPEED, fy: TURN };\n}\nreturn steer(world);';

  it('a script offers nothing and accepts its numeric constants; a page accepts its slots; a control offers its value', () => {
    expect(paramsOf(JS).map((p) => [p.name, p.value])).toEqual([['SPEED', 120], ['TURN', 0.9]]);
    expect(withParams(JS, { SPEED: 300 })).toMatch(/^const SPEED = 300;/);
    expect(withParams(JS, { SPEED: 300 })).toMatch(/const TURN = 0\.9;/);
    expect(slotsIn('<div data-region="r1">a</div><p data-region="r2">b</p><div data-region="r1">c</div>')).toEqual(['r1', 'r2']);
    const s = createSession();
    const ctl = slider(s, 1000);
    const js = named(s, 10000, 600, 100, 'speed', 'js', JS);
    const nodes = s.getState().nodes;
    const ci = interfacesOf(nodes.get(ctl.id)!, nodes);
    expect(ci.offers.map((o) => [o.id, o.type])).toEqual([['value', 'number']]);
    expect(ci.accepts).toEqual([]);
    const ji = interfacesOf(nodes.get(js)!, nodes);
    expect(ji.accepts.map((a) => a.id)).toEqual(['param:SPEED', 'param:TURN']);
    // Connections: the control named "amount" can feed either constant; both are offered, by type.
    const cs = connectionsFor([ctl.id, js], nodes);
    expect(cs.map((c) => `${c.from.port}→${c.to.port}`)).toEqual(['value→param:SPEED', 'value→param:TURN']);
    expect(cs.every((c) => c.reasoning)).toBe(true);
  });

  it('a name match outranks a type match', () => {
    const s = createSession();
    const ctl = slider(s, 1000); // named "amount"
    const js = named(s, 10000, 600, 100, 'script', 'js', 'const AMOUNT = 1;\nconst OTHER = 2;\nreturn AMOUNT;');
    const cs = connectionsFor([ctl.id, js], s.getState().nodes);
    expect(cs[0].to.port).toBe('param:AMOUNT');
    expect(cs[0].reasoning).toMatch(/names match/);
  });
});

describe('the frame', () => {
  const JS = 'const SPEED = 120;\nfunction steer(world) {\n  return { fx: SPEED, fy: 0 };\n}\nreturn steer(world);';
  const HTML = '<div data-region="r1">placeholder</div>';

  it('wires members by reference: the frame is an artifact, the members stay where they are, resolution substitutes the values', () => {
    const s = createSession();
    const ctl = slider(s, 1000);
    const js = named(s, 10000, 600, 100, 'mover', 'js', JS);
    const page = named(s, 20000, 600, 400, 'card', 'html', HTML);
    const before = s.getState();
    const cs = connectionsFor([ctl.id, js, page], before.nodes);
    const wire = cs.find((c) => c.to.port === 'param:SPEED')!;
    const frameId = s.frame({ ids: [ctl.id, js, page], name: 'rig', connections: [wire], at: 30000 })!;
    const st = s.getState();
    expect(st.artifacts).toContain(frameId);
    expect(st.contentIds).toEqual(before.contentIds); // nothing moved into it
    const fnode = st.nodes.get(frameId)!;
    expect(isFrame(fnode)).toBe(true);
    expect(frameOfNode(fnode)!.members).toEqual([ctl.id, js, page]);
    const r = resolveFrame(frameOfNode(fnode)!, st.nodes);
    expect(r.code[js]).toMatch(/^const SPEED = 3\.3/);
    expect(r.carried[0].value).toBeCloseTo(3.3, 1);
    expect(describeFrame(frameOfNode(fnode)!, st.nodes)).toMatch(/3 members; amount\.value → mover\.param:SPEED/);
    // The frame is log state: it replays and undoes.
    const copy = createSession();
    copy.load(s.getEvents());
    expect(copy.getState().artifacts).toContain(frameId);
    s.undo();
    expect(s.getState().artifacts).not.toContain(frameId);
  });

  it('words feed a slot; export writes the wired files and an index.html', () => {
    const s = createSession();
    const page = named(s, 1000, 100, 100, 'card', 'html', HTML);
    const words = named(s, 10000, 600, 100, 'title', 'text', 'Hello there');
    const cs = connectionsFor([words, page], s.getState().nodes);
    expect(cs[0].from.port).toBe('words');
    expect(cs[0].to.port).toBe('slot:r1');
    const frameId = s.frame({ ids: [page, words], name: 'card rig', connections: [cs[0]], at: 20000 })!;
    const st = s.getState();
    const files = exportFrame('card rig', frameOfNode(st.nodes.get(frameId)!)!, st.nodes);
    expect(Object.keys(files).sort()).toEqual(['card.html', 'frame.json', 'index.html', 'title.txt']);
    expect(files['card.html']).toBe('<div data-region="r1">Hello there</div>');
    expect(files['index.html']).toBe(files['card.html']);
    expect(JSON.parse(files['frame.json']).connections).toHaveLength(1);
  });

  it('a frame needs at least one live artifact member and a name', () => {
    const s = createSession();
    expect(s.frame({ ids: ['stroke:1'], name: 'x', connections: [], at: 1 })).toBeNull();
    const page = named(s, 1000, 100, 100, 'card', 'html', HTML);
    expect(s.frame({ ids: [page], name: '  ', connections: [], at: 5000 })).toBeNull();
    expect(s.frame({ ids: [page], name: 'one', connections: [], at: 5000 })).not.toBeNull();
  });
});
