// Bindings follow (V1-PLAN §4 and §9 E2; CONTROL-POINTS-PLAN P3, as amended).
//
// A connector bound to a site re-derives its end when the mark it is bound to
// moves or is reshaped — DERIVED at replay from the bindings, never logged as
// extra events, because state is a pure function of the log and the bindings
// already are in it. One bound end: the connector pivots and stretches about
// its free end. Two: the map that carries both. Both on one mark that moves:
// it translates, and it never collapses. Undo of the move restores the
// connector by itself, and the board is the same in either merge order,
// through checkpoints and through a room's rebase.
//
// The director's decision on a connector's own ends (E1's handles): its bound
// end dragged and released where a magnet holds it rebinds there; released
// anywhere else, that end's binding is released — in the same act as the
// reshape. Moved whole by the hand, it lets go of what it no longer sits on,
// in the same act. And a notation's ports are read from the clean form where
// the mark carries one, so a binding at a decision's vertex follows the
// decision reshaped or moved.

import { describe, it, expect, afterEach } from 'vitest';
import { createSession, DEFAULT_SESSION_CONFIG, type Session, type SessionEvent } from './session';
import { getRep, standingPointsOf, strokePointsOf } from './nodes';
import { activeBindingsOf, bindingsOf, magnetSites } from './magnets';
import { handlesOf } from './handles';
import { connectorEnds } from './follow';
import { registeredPorts, unregisterPorts } from './ports';
import { mergeLogs } from '../store/merge';
import { flowchartPortsOf } from '../notations/flowchart';
import { offerPorts } from '../notations/notation';
import { rectStroke, lineStroke, circleStroke, handArrow } from '../test/strokes';
import type { Point } from '../types';

afterEach(() => {
  for (const n of registeredPorts()) unregisterPorts(n);
});

const named = (logName: string, checkpointEvery?: number) =>
  createSession({ ...DEFAULT_SESSION_CONFIG, logName, ...(checkpointEvery ? { checkpointEvery } : {}) });
const nodeOf = (s: Session, id: string) => s.getState().nodes.get(id)!;
const dist = (p: Point, q: Point) => Math.hypot(p.x - q.x, p.y - q.y);
const expectAt = (p: Point | undefined, q: Point, eps = 1e-6) => {
  expect(p, 'a point').toBeDefined();
  expect(dist(p!, q), `${JSON.stringify(p)} is not at ${JSON.stringify(q)}`).toBeLessThan(eps);
};
const siteAt = (s: Session, id: string, kind: string, index: number) =>
  magnetSites(nodeOf(s, id), s.getState().nodes).find((x) => x.kind === kind && x.index === index)!.point;
const endOf = (s: Session, id: string, which: 'start' | 'end') => connectorEnds(nodeOf(s, id), s.getState().nodes)![which];
const inkNow = (s: Session, id: string) => strokePointsOf(nodeOf(s, id))!;
const drawn = (s: Session, id: string) => JSON.stringify((getRep(nodeOf(s, id), 'stroke')!.data as { points: Point[] }).points);
const box = (s: Session, x: number, y: number, at: number, w = 200, h = 120) => s.addStroke(rectStroke(x, y, w, h), at, undefined, 1);
const line = (s: Session, a: Point, b: Point, at: number) => s.addStroke(lineStroke(a, b), at, undefined, 1);
const types = (evs: readonly SessionEvent[]) => evs.map((e) => e.type);
const bound = (s: Session, id: string) =>
  bindingsOf(nodeOf(s, id), s.getState().nodes).map((b) => `${b.end}→${b.nodeId} ${b.site.kind} ${b.site.index}`).sort();

/** Distance from p to the segment ab. */
function offSegment(p: Point, a: Point, b: Point): number {
  const dx = b.x - a.x, dy = b.y - a.y;
  const l2 = dx * dx + dy * dy;
  const t = l2 > 0 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2)) : 0;
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

/** A box at (100,100) 200×120 and a line whose END lands on its right middle (300, 160), bound there. */
function oneEnd(s: Session = createSession()) {
  const b = box(s, 100, 100, 1000);
  const l = line(s, { x: 600, y: 400 }, { x: 300, y: 160 }, 2000);
  s.bind({ strokeId: l, nodeId: b, site: { kind: 'middle', index: 1 }, end: 'end', at: 3000 });
  return { s, b, l };
}

/** Box A at (100,100), box B at (700,400), and a line from A's right middle to B's left middle, bound at both ends. */
function bothEnds(s: Session = createSession()) {
  const a = box(s, 100, 100, 1000);
  const b = box(s, 700, 400, 1500);
  const l = line(s, { x: 300, y: 160 }, { x: 700, y: 460 }, 2000);
  s.bind({ strokeId: l, nodeId: a, site: { kind: 'middle', index: 1 }, end: 'start', at: 3000 });
  s.bind({ strokeId: l, nodeId: b, site: { kind: 'middle', index: 3 }, end: 'end', at: 3001 });
  return { s, a, b, l };
}

describe('one bound end: the connector pivots and stretches about its free end', () => {
  it('a box moved carries the end bound to it; the free end stays; the ink as drawn is untouched and nothing enters the log', () => {
    const { s, b, l } = oneEnd();
    const ink = drawn(s, l);
    const n = s.getEvents().length;
    s.move({ ids: [b], dx: 100, dy: 50, at: 4000 });
    // The move, and nothing else: the following is derived, never logged.
    expect(types(s.getEvents().slice(n))).toEqual(['move']);
    const pts = inkNow(s, l);
    expectAt(pts[pts.length - 1], { x: 400, y: 210 });
    expectAt(pts[pts.length - 1], siteAt(s, b, 'middle', 1));
    expectAt(pts[0], { x: 600, y: 400 });
    // Still straight: a similarity keeps a line a line.
    for (const p of pts) expect(offSegment(p, pts[0], pts[pts.length - 1])).toBeLessThan(1e-6);
    expect(drawn(s, l)).toBe(ink);
    // Held as a derived rep, in the engine's name.
    expect(getRep(nodeOf(s, l), 'follow')?.source).toBe('engine');
    expectAt(endOf(s, l, 'end'), { x: 400, y: 210 });
    expectAt(endOf(s, l, 'start'), { x: 600, y: 400 });
  });

  it('scaled, turned, reshaped or tidied, the end follows the site to where it stands now', () => {
    // Scaled about its corner: the right side's middle goes to (400, 220).
    {
      const { s, b, l } = oneEnd();
      s.scale({ ids: [b], about: { x: 100, y: 100 }, sx: 1.5, sy: 2, at: 4000 });
      expectAt(endOf(s, l, 'end'), { x: 400, y: 220 });
      expectAt(endOf(s, l, 'end'), siteAt(s, b, 'middle', 1));
      expectAt(endOf(s, l, 'start'), { x: 600, y: 400 });
    }
    // Turned a quarter about its centre: the right middle swings down to (200, 260).
    {
      const { s, b, l } = oneEnd();
      s.rotate({ ids: [b], about: { x: 200, y: 160 }, radians: Math.PI / 2, at: 4000 });
      expectAt(endOf(s, l, 'end'), { x: 200, y: 260 });
      expectAt(endOf(s, l, 'end'), siteAt(s, b, 'middle', 1));
    }
    // Reshaped by its corner: the right side moves out to x = 360, its middle to (360, 200).
    {
      const { s, b, l } = oneEnd();
      expect(s.reshape({ id: b, handle: { kind: 'corner', index: 2 }, to: { x: 360, y: 300 }, at: 4000 })).toBe(true);
      expectAt(endOf(s, l, 'end'), { x: 360, y: 200 });
      expectAt(endOf(s, l, 'end'), siteAt(s, b, 'middle', 1));
    }
    // Tidied into a row with another box: wherever tidy put it, the end is on its middle.
    {
      const { s, b, l } = oneEnd();
      const other = box(s, 500, 20, 3500, 160, 100);
      const before = siteAt(s, b, 'middle', 1);
      s.tidy({ ids: [b, other], mode: 'align', axis: 'row', at: 4000 });
      expect(dist(siteAt(s, b, 'middle', 1), before)).toBeGreaterThan(1);
      expectAt(endOf(s, l, 'end'), siteAt(s, b, 'middle', 1));
      expectAt(endOf(s, l, 'start'), { x: 600, y: 400 });
    }
  });
});

describe('two bound ends: the map that carries both', () => {
  it('one box moved: its end follows it and the end on the other box stays; then the other moved, and the first stays', () => {
    const { s, a, b, l } = bothEnds();
    s.move({ ids: [b], dx: 0, dy: 200, at: 4000 });
    expectAt(endOf(s, l, 'end'), { x: 700, y: 660 });
    expectAt(endOf(s, l, 'start'), { x: 300, y: 160 });
    s.move({ ids: [a], dx: -50, dy: 0, at: 5000 });
    expectAt(endOf(s, l, 'start'), { x: 250, y: 160 });
    expectAt(endOf(s, l, 'end'), { x: 700, y: 660 });
    const pts = inkNow(s, l);
    for (const p of pts) expect(offSegment(p, pts[0], pts[pts.length - 1])).toBeLessThan(1e-6);
    // It still joins the two it joined: the wire is read where it stands.
    const joins = nodeOf(s, l).edges.filter((e) => e.rel === 'connects').map((e) => e.to).sort();
    expect(joins).toEqual([a, b].sort());
  });

  it('both ends on one mark: moved, the connector translates with it — every point by the same step — and never collapses', () => {
    const s = createSession();
    const b = box(s, 100, 100, 1000);
    // Drawn elsewhere, then tied to two corners of the one box.
    const l = line(s, { x: 500, y: 520 }, { x: 700, y: 520 }, 2000);
    s.bind({ strokeId: l, nodeId: b, site: { kind: 'corner', index: 0 }, end: 'start', at: 3000 });
    s.bind({ strokeId: l, nodeId: b, site: { kind: 'corner', index: 1 }, end: 'end', at: 3001 });
    expectAt(endOf(s, l, 'start'), { x: 100, y: 100 });
    expectAt(endOf(s, l, 'end'), { x: 300, y: 100 });
    const before = inkNow(s, l);
    s.move({ ids: [b], dx: 40, dy: 30, at: 4000 });
    const after = inkNow(s, l);
    before.forEach((p, i) => expectAt(after[i], { x: p.x + 40, y: p.y + 30 }, 1e-9));
    // Pulled out of square, it still carries both — and the connector is never a point.
    s.scale({ ids: [b], about: { x: 140, y: 130 }, sx: 2, sy: 1, at: 5000 });
    expectAt(endOf(s, l, 'start'), siteAt(s, b, 'corner', 0));
    expectAt(endOf(s, l, 'end'), siteAt(s, b, 'corner', 1));
    expect(dist(endOf(s, l, 'start'), endOf(s, l, 'end'))).toBeCloseTo(400, 6);
  });

  it('both ends on one SITE: centred on the site, it keeps its length and follows it — never collapsed to a point', () => {
    const s = createSession();
    const b = box(s, 100, 100, 1000);
    const l = line(s, { x: 400, y: 600 }, { x: 600, y: 600 }, 2000);
    s.bind({ strokeId: l, nodeId: b, site: { kind: 'centre', index: 0 }, end: 'start', at: 3000 });
    s.bind({ strokeId: l, nodeId: b, site: { kind: 'centre', index: 0 }, end: 'end', at: 3001 });
    const mid = () => {
      const p = endOf(s, l, 'start'), q = endOf(s, l, 'end');
      return { x: (p.x + q.x) / 2, y: (p.y + q.y) / 2 };
    };
    const length = dist(endOf(s, l, 'start'), endOf(s, l, 'end'));
    expect(length).toBeGreaterThan(100);
    expectAt(mid(), { x: 200, y: 160 });
    s.move({ ids: [b], dx: 10, dy: 20, at: 4000 });
    expect(dist(endOf(s, l, 'start'), endOf(s, l, 'end'))).toBeCloseTo(length, 6);
    expectAt(mid(), { x: 210, y: 180 });
  });
});

describe('an arrow: its tip follows the box, and it still points at it', () => {
  function arrowed() {
    const s = createSession();
    const a = box(s, 100, 100, 1000);
    const b = box(s, 700, 100, 1500);
    // Its tip three pixels short of B's edge: a two-wing head whose tip lands ON an
    // outline visits it three times, and three crossings rub the box out.
    const ar = s.addStroke(handArrow({ x: 300, y: 160 }, { x: 697, y: 160 }, { wings: 2, headLen: 24, seed: 3, jitter: 0 }), 2000, undefined, 1);
    s.bind({ strokeId: ar, nodeId: a, site: { kind: 'middle', index: 1 }, end: 'start', at: 3000 });
    s.bind({ strokeId: ar, nodeId: b, site: { kind: 'middle', index: 3 }, end: 'end', at: 3001 });
    return { s, a, b, ar };
  }

  it('its END is its tip — the ink the pen reached farthest along the shaft — and its start its tail; bound, the tip is carried onto its site', () => {
    const { s, b, ar } = arrowed();
    expect(getRep(nodeOf(s, b), 'erased')).toBeUndefined();
    expectAt(endOf(s, ar, 'end'), { x: 700, y: 160 }, 1e-6);
    expectAt(endOf(s, ar, 'start'), { x: 300, y: 160 }, 1e-6);
  });

  it('the box moved: the tip is on its left middle where it stands, the tail where it was; it points at the box and plays an edge between them', () => {
    const { s, a, b, ar } = arrowed();
    s.move({ ids: [b], dx: 0, dy: 240, at: 4000 });
    expectAt(endOf(s, ar, 'end'), { x: 700, y: 400 });
    expectAt(endOf(s, ar, 'start'), { x: 300, y: 160 });
    const n = nodeOf(s, ar);
    expect(n.edges.find((e) => e.rel === 'points-to')?.to).toBe(b);
    expect(n.edges.find((e) => e.rel === 'points-from')?.to).toBe(a);
    // Read where it stands: its ink touches the box it points at, and it plays the edge from A to B.
    const outline = standingPointsOf(nodeOf(s, b))!;
    const gap = Math.min(...inkNow(s, ar).map((p) => Math.min(...outline.slice(1).map((q, i) => offSegment(p, outline[i], q)))));
    expect(gap).toBeLessThan(1e-6);
    const r = s.read([a, b, ar]);
    const role = r.roles.find((x) => x.id === ar)!;
    expect(role.role).toBe('edge');
    expect(role.direction).toEqual({ from: a, to: b });
    // Still an arrow: a similarity keeps its shape.
    expect(n.edges.find((e) => e.rel === 'resembles')?.to).toBe('type:arrow');
  });
});

describe('where it stands is where everything reads it', () => {
  it('the index files it where it stands: a mark drawn beside its new place is related to it', () => {
    const { s, b, l } = oneEnd();
    s.move({ ids: [b], dx: 100, dy: 150, at: 4000 });
    expectAt(endOf(s, l, 'end'), { x: 400, y: 310 });
    // A small ring on the line's new end, some 40 px from where the line was drawn.
    const c = s.addStroke(circleStroke(400, 310, 12), 5000, undefined, 1);
    const toLine = nodeOf(s, c).edges.filter((e) => e.to === l).map((e) => e.rel);
    expect(toLine.length, JSON.stringify(nodeOf(s, c).edges.map((e) => `${e.rel} ${e.to}`))).toBeGreaterThan(0);
  });
});

describe('undo, replay, checkpoints, the room', () => {
  it('undo of the move takes the connector back exactly where it stood', () => {
    const { s, b, l } = oneEnd();
    const before = JSON.stringify(inkNow(s, l));
    const reps = JSON.stringify(nodeOf(s, l).reps);
    s.move({ ids: [b], dx: 100, dy: 50, at: 4000 });
    expect(JSON.stringify(inkNow(s, l))).not.toBe(before);
    s.undo();
    expect(JSON.stringify(inkNow(s, l))).toBe(before);
    expect(JSON.stringify(nodeOf(s, l).reps)).toBe(reps);
  });

  it('the log read back gives the same board, node for node', () => {
    const { s, a, b, l } = bothEnds(named('ann~a1'));
    s.move({ ids: [b], dx: 0, dy: 200, at: 4000 });
    s.rotate({ ids: [a], about: { x: 200, y: 160 }, radians: 0.4, at: 5000 });
    const copy = named('ann~a1');
    copy.load(JSON.parse(JSON.stringify(s.getEvents())));
    for (const id of [a, b, l]) expect(JSON.stringify(nodeOf(copy, id))).toBe(JSON.stringify(nodeOf(s, id)));
  });

  it('past a checkpoint, undone and replayed: the same as a replay from zero', () => {
    const s = named('ann~a1', 3);
    const { a, b, l } = bothEnds(s);
    let t = 4000;
    for (let i = 0; i < 5; i++) box(s, 1200 + i * 250, 900, (t += 500), 120, 80);
    s.move({ ids: [b], dx: 0, dy: 200, at: (t += 500) });
    for (let i = 0; i < 4; i++) box(s, 1200 + i * 250, 1200, (t += 500), 120, 80);
    s.move({ ids: [a], dx: -60, dy: 30, at: (t += 500) });
    const fresh = named('ann~a1');
    fresh.load(JSON.parse(JSON.stringify(s.getEvents())));
    expect(JSON.stringify(nodeOf(fresh, l))).toBe(JSON.stringify(nodeOf(s, l)));
    // Back past the second move and the boxes before it, from a checkpoint.
    for (let i = 0; i < 5; i++) s.undo();
    const back = named('ann~a1');
    back.load(JSON.parse(JSON.stringify(s.getEvents())));
    expect(JSON.stringify(nodeOf(back, l))).toBe(JSON.stringify(nodeOf(s, l)));
    expectAt(endOf(s, l, 'end'), { x: 700, y: 660 });
    expectAt(endOf(s, l, 'start'), { x: 300, y: 160 });
  });

  it("a room's rebase — a line landing before the move or after it — gives the board a whole load gives", () => {
    const { s: src, a, b, l } = bothEnds(named('ann~a1'));
    src.move({ ids: [b], dx: 0, dy: 200, at: 4000 });
    src.move({ ids: [a], dx: 30, dy: 0, at: 5000 });
    const log = src.getEvents().slice();
    const whole = named('cyd~c1');
    whole.load(log);
    // Appended: the moves arrive after the rest.
    const appended = named('cyd~c1');
    appended.load(log.slice(0, log.length - 2));
    expect(appended.rebase(log.length - 2, log.slice(log.length - 2)).cut).toBe(false);
    // Cut: something already applied is replaced from the bind on.
    const cut = named('cyd~c1', 2);
    cut.load(log.slice(0, log.length - 1).concat([{ ...log[log.length - 1], dx: 999 } as SessionEvent]));
    expect(cut.rebase(3, log.slice(3)).cut).toBe(true);
    for (const board of [appended, cut]) for (const id of [a, b, l]) expect(JSON.stringify(nodeOf(board, id))).toBe(JSON.stringify(nodeOf(whole, id)));
  });

  it('the merge order does not change the result: another hand moves the box after the bind, or — by the clocks — before it', () => {
    const ann = named('ann~a1');
    const { b, l } = oneEnd(ann);
    const annLog = ann.getEvents().slice();
    const boards = [3500, 2500].map((moveAt) => {
      const ben = named('ben~b1');
      ben.load(mergeLogs({ 'ann~a1': annLog }, { me: 'ben~b1' }));
      ben.move({ ids: [b], dx: 100, dy: 50, at: moveAt });
      const benLog = ben.getEvents().filter((e) => !e.by);
      const board = named('cyd~c1');
      board.load(mergeLogs({ 'ann~a1': annLog, 'ben~b1': benLog }, { me: 'cyd~c1' }));
      // The logs handed over in either order: the same board.
      const again = named('cyd~c1');
      again.load(mergeLogs({ 'ben~b1': benLog, 'ann~a1': annLog }, { me: 'cyd~c1' }));
      expect(JSON.stringify(nodeOf(again, l))).toBe(JSON.stringify(nodeOf(board, l)));
      return board;
    });
    // The move before the bind in one, after it in the other: the line's end on the moved site in both.
    const types0 = boards.map((x) => x.getEvents().filter((e) => e.type === 'bind' || e.type === 'move').map((e) => e.type).join(' '));
    expect(types0).toEqual(['bind move', 'move bind']);
    for (const x of boards) {
      expectAt(endOf(x, l, 'end'), { x: 400, y: 210 });
      expectAt(endOf(x, l, 'start'), { x: 600, y: 400 });
    }
    inkNow(boards[0], l).forEach((p, i) => expectAt(p, inkNow(boards[1], l)[i], 1e-9));
  });
});

describe('a binding whose target is erased moves nothing', () => {
  it('erased, the box leaves the connector where it stood; the erase undone, the next move of the box carries it again', () => {
    const { s, b, l } = oneEnd();
    s.move({ ids: [b], dx: 100, dy: 50, at: 4000 });
    expectAt(endOf(s, l, 'end'), { x: 400, y: 210 });
    const stood = JSON.stringify(inkNow(s, l));
    s.erase(b, 5000);
    expect(activeBindingsOf(nodeOf(s, l), s.getState().nodes)).toHaveLength(0);
    expect(JSON.stringify(inkNow(s, l))).toBe(stood);
    s.undo();
    expect(activeBindingsOf(nodeOf(s, l), s.getState().nodes)).toHaveLength(1);
    expect(JSON.stringify(inkNow(s, l))).toBe(stood);
    s.move({ ids: [b], dx: 0, dy: 100, at: 6000 });
    expectAt(endOf(s, l, 'end'), { x: 400, y: 310 });
  });
});

describe("the connector's own end dragged by its handle — one act", () => {
  it('released where no magnet holds it: that end lets go, the other stays bound; the end stands where the hand let go; one undo takes both back', () => {
    const { s, a, b, l } = bothEnds();
    const tip = handlesOf(nodeOf(s, l), s.getState().nodes).find((h) => h.kind === 'tip')!;
    expectAt(tip.point, { x: 700, y: 460 });
    const n = s.getEvents().length;
    expect(s.reshape({ id: l, handle: { kind: 'tip', index: 0 }, to: { x: 650, y: 700 }, at: 4000 })).toBe(true);
    expect(types(s.lastAct())).toEqual(['unbind', 'reshape']);
    expect(bound(s, l)).toEqual([`start→${a} middle 1`]);
    expectAt(endOf(s, l, 'end'), { x: 650, y: 700 });
    expectAt(endOf(s, l, 'start'), { x: 300, y: 160 });
    // Its tip lets go of the box: moving the box does nothing to it now.
    s.move({ ids: [b], dx: 0, dy: 100, at: 5000 });
    expectAt(endOf(s, l, 'end'), { x: 650, y: 700 });
    s.undo();
    s.undo();
    expect(s.getEvents()).toHaveLength(n);
    expect(bound(s, l)).toEqual([`end→${b} middle 3`, `start→${a} middle 1`]);
    expectAt(endOf(s, l, 'end'), { x: 700, y: 460 });
  });

  it('released where a magnet holds it: the old claim for that end replaced by the new site, in the same act — and it follows the new mark', () => {
    const { s, a, b, l } = bothEnds();
    const c = box(s, 700, 700, 3500);
    expect(s.reshape({ id: l, handle: { kind: 'tip', index: 0 }, to: { x: 700, y: 700 }, bind: { nodeId: c, site: { kind: 'corner', index: 0 } }, at: 4000 })).toBe(true);
    expect(types(s.lastAct())).toEqual(['unbind', 'reshape', 'bind']);
    expect(bound(s, l)).toEqual([`end→${c} corner 0`, `start→${a} middle 1`]);
    expect(nodeOf(s, l).edges.filter((e) => e.rel === 'bound-to')).toHaveLength(2);
    expectAt(endOf(s, l, 'end'), { x: 700, y: 700 });
    s.move({ ids: [c], dx: 50, dy: 50, at: 5000 });
    expectAt(endOf(s, l, 'end'), { x: 750, y: 750 });
    s.move({ ids: [b], dx: 0, dy: -300, at: 6000 });
    expectAt(endOf(s, l, 'end'), { x: 750, y: 750 });
    s.undo();
    s.undo();
    s.undo();
    expect(bound(s, l)).toEqual([`end→${b} middle 3`, `start→${a} middle 1`]);
    expectAt(endOf(s, l, 'end'), { x: 700, y: 460 });
  });

  it('the tail dragged while the tip is bound: the tail lets go of its own box, the tip stays bound and goes on following', () => {
    const { s, a, b, l } = bothEnds();
    expect(s.reshape({ id: l, handle: { kind: 'tail', index: 0 }, to: { x: 250, y: 320 }, at: 4000 })).toBe(true);
    expect(types(s.lastAct())).toEqual(['unbind', 'reshape']);
    expect(bound(s, l)).toEqual([`end→${b} middle 3`]);
    s.move({ ids: [b], dx: 0, dy: 100, at: 5000 });
    expectAt(endOf(s, l, 'start'), { x: 250, y: 320 });
    expectAt(endOf(s, l, 'end'), { x: 700, y: 560 });
    void a;
  });

  it('an end with no binding dragged onto a magnet binds there, in the same act', () => {
    const { s, b, l } = oneEnd();
    const c = box(s, 700, 700, 3500);
    expect(s.reshape({ id: l, handle: { kind: 'tail', index: 0 }, to: { x: 700, y: 700 }, bind: { nodeId: c, site: { kind: 'corner', index: 0 } }, at: 4000 })).toBe(true);
    expect(types(s.lastAct())).toEqual(['reshape', 'bind']);
    expect(bound(s, l)).toEqual([`end→${b} middle 1`, `start→${c} corner 0`]);
  });
});

describe('the connector moved whole by the hand lets go of what it no longer sits on — in the same act', () => {
  it('moved alone: both ends let go, and it moves from where it STOOD, not where it was drawn; one undo takes it all back', () => {
    const { s, a, b, l } = bothEnds();
    s.move({ ids: [b], dx: 0, dy: 200, at: 4000 });
    expectAt(endOf(s, l, 'end'), { x: 700, y: 660 });
    s.move({ ids: [l], dx: 30, dy: -40, at: 5000 });
    expect(types(s.lastAct())).toEqual(['unbind', 'unbind', 'move']);
    expect(bound(s, l)).toEqual([]);
    expectAt(endOf(s, l, 'start'), { x: 330, y: 120 });
    expectAt(endOf(s, l, 'end'), { x: 730, y: 620 });
    s.undo();
    expect(bound(s, l)).toEqual([`end→${b} middle 3`, `start→${a} middle 1`]);
    expectAt(endOf(s, l, 'start'), { x: 300, y: 160 });
    expectAt(endOf(s, l, 'end'), { x: 700, y: 660 });
  });

  it('moved with both its boxes: nothing lets go, and it moves with them', () => {
    const { s, a, b, l } = bothEnds();
    const before = inkNow(s, l);
    s.move({ ids: [a, b, l], dx: 100, dy: 0, at: 4000 });
    expect(types(s.lastAct())).toEqual(['move']);
    expect(bound(s, l)).toHaveLength(2);
    inkNow(s, l).forEach((p, i) => expectAt(p, { x: before[i].x + 100, y: before[i].y }, 1e-6));
  });

  it('moved with one of its boxes: the end on that box stays bound, the other lets go', () => {
    const { s, b, l } = bothEnds();
    s.move({ ids: [b, l], dx: 0, dy: 100, at: 4000 });
    expect(types(s.lastAct())).toEqual(['unbind', 'move']);
    expect(bound(s, l)).toEqual([`end→${b} middle 3`]);
    expectAt(endOf(s, l, 'start'), { x: 300, y: 260 });
    expectAt(endOf(s, l, 'end'), { x: 700, y: 560 });
  });

  it('its middle handle moves it whole: what it no longer sits on lets go, in the same act', () => {
    const { s, l } = bothEnds();
    const mid = handlesOf(nodeOf(s, l), s.getState().nodes).find((h) => h.kind === 'middle')!;
    expect(s.reshape({ id: l, handle: { kind: 'middle', index: 0 }, to: { x: mid.point.x + 60, y: mid.point.y + 80 }, at: 4000 })).toBe(true);
    expect(types(s.lastAct())).toEqual(['unbind', 'unbind', 'reshape']);
    expect(bound(s, l)).toEqual([]);
    expectAt(endOf(s, l, 'start'), { x: 360, y: 240 });
    expectAt(endOf(s, l, 'end'), { x: 760, y: 540 });
  });

  it("a nudge within the magnet's reach lets go of nothing: the ends are held on their sites", () => {
    const { s, l } = bothEnds();
    s.move({ ids: [l], dx: 3, dy: 2, at: 4000 });
    expect(types(s.lastAct())).toEqual(['move']);
    expect(bound(s, l)).toHaveLength(2);
    expectAt(endOf(s, l, 'start'), { x: 300, y: 160 });
    expectAt(endOf(s, l, 'end'), { x: 700, y: 460 });
  });
});

describe("a notation's port follows: read from the clean form where the mark carries one", () => {
  /** A square diamond — a box turned 45°, which the flowchart reads as a decision — with its vertices at (300,220), (380,300), (300,380), (220,300). */
  function diamond(s: Session, at: number) {
    const v = [{ x: 300, y: 220 }, { x: 380, y: 300 }, { x: 300, y: 380 }, { x: 220, y: 300 }];
    const mid = { x: (v[0].x + v[1].x) / 2, y: (v[0].y + v[1].y) / 2 };
    const path = [mid, v[1], v[2], v[3], v[0], mid];
    const pts: Point[] = [];
    for (let i = 0; i < path.length - 1; i++) pts.push(...lineStroke(path[i], path[i + 1], 40).slice(i === 0 ? 0 : 1));
    return s.addStroke(pts, at, undefined, 1);
  }

  it("a line bound to a decision's left vertex follows it reshaped and moved — whether or not the pen is offered the ports — and replays the same with them offered", () => {
    const s = named('ann~a1');
    const d = diamond(s, 1000);
    const read = flowchartPortsOf(nodeOf(s, d), s.getState().nodes)!;
    expect(read.symbol).toBe('decision');
    const left = read.ports.filter((p) => p.at).findIndex((p) => p.name === 'left');
    const l = line(s, { x: 40, y: 300 }, { x: 220, y: 300 }, 2000);
    s.bind({ strokeId: l, nodeId: d, site: { kind: 'port:flowchart', index: left }, end: 'end', at: 3000 });
    expectAt(endOf(s, l, 'end'), { x: 220, y: 300 });
    // The decision's left corner pulled out: its clean form's left vertex, and so the port, at (160, 300).
    const corner = handlesOf(nodeOf(s, d), s.getState().nodes).find((h) => h.kind === 'corner' && dist(h.point, { x: 220, y: 300 }) < 1e-6)!;
    expect(s.reshape({ id: d, handle: { kind: corner.kind, index: corner.index }, to: { x: 160, y: 300 }, at: 4000 })).toBe(true);
    expectAt(flowchartPortsOf(nodeOf(s, d), s.getState().nodes)!.ports.find((p) => p.name === 'left')!.at!, { x: 160, y: 300 });
    expectAt(endOf(s, l, 'end'), { x: 160, y: 300 });
    s.move({ ids: [d], dx: 0, dy: 100, at: 5000 });
    expectAt(endOf(s, l, 'end'), { x: 160, y: 400 });
    expectAt(endOf(s, l, 'start'), { x: 40, y: 300 });
    // The pen offered the flowchart's ports, the same log reads the same.
    offerPorts('flowchart');
    const again = named('ann~a1');
    again.load(JSON.parse(JSON.stringify(s.getEvents())));
    expect(JSON.stringify(nodeOf(again, l))).toBe(JSON.stringify(nodeOf(s, l)));
  });
});

describe('a connector bound to a connector: the follow runs on down the chain', () => {
  it("a line bound to another line's middle follows it as that line follows its box", () => {
    const { s, b, l } = oneEnd();
    const l2 = line(s, { x: 800, y: 100 }, { x: 450, y: 280 }, 3500);
    s.bind({ strokeId: l2, nodeId: l, site: { kind: 'middle', index: 0 }, end: 'end', at: 3600 });
    expectAt(endOf(s, l2, 'end'), { x: 450, y: 280 });
    s.move({ ids: [b], dx: 0, dy: 100, at: 4000 });
    expectAt(endOf(s, l, 'end'), { x: 300, y: 260 });
    expectAt(endOf(s, l2, 'end'), { x: 450, y: 330 });
    expectAt(endOf(s, l2, 'start'), { x: 800, y: 100 });
  });
});
