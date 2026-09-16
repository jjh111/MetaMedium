// The binding graph — what a stroke's ends are tied to, and what that survives.
//
// The regression this file was written for (DIRECTOR-REVIEW-2026-09-15,
// BIND-1): bind both ends of ONE stroke to two different sites on the SAME
// rectangle and the canvas kept two `bound` reps but one `bound-to` edge,
// whose reason described only the second endpoint. Edges were removed by
// TARGET, so the second bind took the first one's edge with it.

import { describe, it, expect } from 'vitest';
import { createSession } from './session';
import { rectStroke, circleStroke, lineStroke } from '../test/strokes';
import { bindingsOf, boundRepsOf, activeBindingsOf, boundToMark } from './magnets';
import { mergeLogs } from '../store/merge';

const box = (s: ReturnType<typeof createSession>, x: number, y: number, at: number) =>
  s.addStroke(rectStroke(x, y, 200, 120), at);
// Clear of the box at (100,100)+200×120 on purpose: a line drawn ACROSS it is
// a scratch, and the eraser would take the target out from under the test.
// Binding is an explicit event, so where the ink lies does not decide it.
const connector = (s: ReturnType<typeof createSession>, at: number) =>
  s.addStroke(lineStroke({ x: 400, y: 400 }, { x: 800, y: 700 }), at);
/** Every node, not only the live ones: what a HISTORICAL query has to scan. */
const allIds = (s: ReturnType<typeof createSession>) => [...s.getState().nodes.keys()];

describe('bind — an arrow ends AT the box, and the graph says so', () => {
  it('a bind lands as a blessed bound-to edge carrying the end and the site', () => {
    const s = createSession();
    const b = box(s, 100, 100, 1000);
    const line = connector(s, 1001);
    s.bind({ strokeId: line, nodeId: b, site: { kind: 'corner', index: 0 }, end: 'start', at: 1002 });
    const node = s.getState().nodes.get(line)!;
    const edge = node.edges.find((e) => e.rel === 'bound-to');
    expect(edge?.to).toBe(b);
    expect(edge?.blessed).toBe(true);
    expect(edge?.end).toBe('start');
    expect(edge?.site).toEqual({ kind: 'corner', index: 0 });
    expect(edge?.reasoning).toContain('start');
    expect(boundRepsOf(node)).toEqual([{ end: 'start', nodeId: b, site: { kind: 'corner', index: 0 } }]);
  });

  // The reproduction.
  it('both ends of one stroke on one mark keep both sites and both ends', () => {
    const s = createSession();
    const b = box(s, 100, 100, 1000);
    const line = connector(s, 1001);
    s.bind({ strokeId: line, nodeId: b, site: { kind: 'corner', index: 0 }, end: 'start', at: 1002 });
    s.bind({ strokeId: line, nodeId: b, site: { kind: 'middle', index: 2 }, end: 'end', at: 1003 });
    const node = s.getState().nodes.get(line)!;

    const edges = node.edges.filter((e) => e.rel === 'bound-to');
    expect(edges).toHaveLength(2);
    expect(edges.map((e) => e.end).sort()).toEqual(['end', 'start']);
    expect(edges.every((e) => e.to === b)).toBe(true);
    // Each claim carries its own site and its own reason — the bug was one
    // reason for two endpoints.
    expect(edges.find((e) => e.end === 'start')!.site).toEqual({ kind: 'corner', index: 0 });
    expect(edges.find((e) => e.end === 'end')!.site).toEqual({ kind: 'middle', index: 2 });
    expect(edges.find((e) => e.end === 'start')!.reasoning).toContain('corner 0');
    expect(edges.find((e) => e.end === 'end')!.reasoning).toContain('middle 2');

    // And the edge query and the rep query say the same thing.
    expect(bindingsOf(node).map((x) => ({ end: x.end, nodeId: x.nodeId, site: x.site }))).toEqual(boundRepsOf(node));
  });

  it('rebinding one end leaves the other where it was, same target or not', () => {
    const s = createSession();
    const a = box(s, 100, 100, 1000);
    const c = s.addStroke(circleStroke(600, 160, 60), 1001);
    const line = connector(s, 1002);
    s.bind({ strokeId: line, nodeId: a, site: { kind: 'corner', index: 0 }, end: 'start', at: 1003 });
    s.bind({ strokeId: line, nodeId: a, site: { kind: 'middle', index: 2 }, end: 'end', at: 1004 });
    // The tail is dragged off the box and onto the circle.
    s.bind({ strokeId: line, nodeId: c, site: { kind: 'cardinal', index: 3 }, end: 'start', at: 1005 });

    const node = s.getState().nodes.get(line)!;
    const bs = bindingsOf(node);
    expect(bs).toHaveLength(2);
    expect(bs.find((x) => x.end === 'start')).toMatchObject({ nodeId: c, site: { kind: 'cardinal', index: 3 } });
    expect(bs.find((x) => x.end === 'end')).toMatchObject({ nodeId: a, site: { kind: 'middle', index: 2 } });
    expect(node.edges.filter((e) => e.rel === 'bound-to')).toHaveLength(2);
    expect(boundRepsOf(node)).toHaveLength(2);
  });

  it('binding the same end again moves that claim, never doubles it', () => {
    const s = createSession();
    const a = box(s, 100, 100, 1000);
    const c = s.addStroke(circleStroke(600, 160, 60), 1001);
    const line = connector(s, 1002);
    s.bind({ strokeId: line, nodeId: a, site: { kind: 'corner', index: 0 }, end: 'start', at: 1003 });
    s.bind({ strokeId: line, nodeId: c, site: { kind: 'cardinal', index: 3 }, end: 'start', at: 1004 });
    const node = s.getState().nodes.get(line)!;
    expect(node.edges.filter((e) => e.rel === 'bound-to')).toHaveLength(1);
    expect(bindingsOf(node)).toHaveLength(1);
    expect(bindingsOf(node)[0].nodeId).toBe(c);
  });

  it('a bind to a mark that is not there — or to itself — is nothing, not an error', () => {
    const s = createSession();
    const line = connector(s, 1001);
    s.bind({ strokeId: line, nodeId: 'stroke:nope', site: { kind: 'corner', index: 0 }, end: 'end', at: 1002 });
    s.bind({ strokeId: line, nodeId: line, site: { kind: 'tip', index: 0 }, end: 'end', at: 1003 });
    expect(bindingsOf(s.getState().nodes.get(line)!)).toHaveLength(0);
  });

  it('undo lets one bind go and leaves the other; the stroke stays', () => {
    const s = createSession();
    const b = box(s, 100, 100, 1000);
    const line = connector(s, 1001);
    s.bind({ strokeId: line, nodeId: b, site: { kind: 'corner', index: 0 }, end: 'start', at: 1002 });
    s.bind({ strokeId: line, nodeId: b, site: { kind: 'middle', index: 2 }, end: 'end', at: 1003 });
    s.undo();
    const node = s.getState().nodes.get(line)!;
    expect(bindingsOf(node)).toHaveLength(1);
    expect(bindingsOf(node)[0].end).toBe('start');
    expect(boundRepsOf(node)).toHaveLength(1);
    expect(s.getState().nodes.has(line)).toBe(true);
    expect(s.getEvents().filter((e) => e.type === 'stroke')).toHaveLength(2);
  });

  it('what hangs off this box — both ends of one connector, counted once each', () => {
    const s = createSession();
    const b = box(s, 100, 100, 1000);
    const line = connector(s, 1001);
    s.bind({ strokeId: line, nodeId: b, site: { kind: 'corner', index: 0 }, end: 'start', at: 1002 });
    s.bind({ strokeId: line, nodeId: b, site: { kind: 'middle', index: 2 }, end: 'end', at: 1003 });
    const st = s.getState();
    const inbound = boundToMark(b, st.nodes, st.contentIds);
    expect(inbound).toHaveLength(2);
    expect(inbound.every((x) => x.strokeId === line)).toBe(true);
    expect(inbound.map((x) => x.end).sort()).toEqual(['end', 'start']);
  });
});

describe('bind — active versus historical', () => {
  it('erasing the target keeps the provenance and drops the anchor', () => {
    const s = createSession();
    const b = box(s, 100, 100, 1000);
    const line = connector(s, 1001);
    s.bind({ strokeId: line, nodeId: b, site: { kind: 'corner', index: 0 }, end: 'start', at: 1002 });
    s.erase(b, 1003);
    const st = s.getState();
    const node = st.nodes.get(line)!;
    // The claim is still in the graph — provenance is not destroyed to tidy
    // away a dangling reference.
    expect(bindingsOf(node, st.nodes)).toHaveLength(1);
    expect(bindingsOf(node, st.nodes)[0].active).toBe(false);
    expect(node.edges.filter((e) => e.rel === 'bound-to')).toHaveLength(1);
    // …but nobody asking where this stroke is ANCHORED gets a tombstone.
    expect(activeBindingsOf(node, st.nodes)).toHaveLength(0);
    expect(boundToMark(b, st.nodes, st.contentIds, { active: true })).toHaveLength(0);
  });

  it('undo of the erase makes the binding an anchor again', () => {
    const s = createSession();
    const b = box(s, 100, 100, 1000);
    const line = connector(s, 1001);
    s.bind({ strokeId: line, nodeId: b, site: { kind: 'corner', index: 0 }, end: 'start', at: 1002 });
    s.erase(b, 1003);
    s.undo();
    const st = s.getState();
    expect(activeBindingsOf(st.nodes.get(line)!, st.nodes)).toHaveLength(1);
    expect(bindingsOf(st.nodes.get(line)!, st.nodes)[0].active).toBe(true);
  });

  it('a target that is not on the board at all is historical too', () => {
    const s = createSession();
    const b = box(s, 100, 100, 1000);
    const line = connector(s, 1001);
    s.bind({ strokeId: line, nodeId: b, site: { kind: 'corner', index: 0 }, end: 'start', at: 1002 });
    const node = s.getState().nodes.get(line)!;
    // A graph without that mark in it: the claim stands, the anchor does not.
    const without = new Map(s.getState().nodes);
    without.delete(b);
    expect(activeBindingsOf(node, without)).toHaveLength(0);
    expect(bindingsOf(node, without)[0].active).toBe(false);
  });

  it('an erased connector no longer hangs off the mark it was bound to', () => {
    const s = createSession();
    const b = box(s, 100, 100, 1000);
    const line = connector(s, 1001);
    s.bind({ strokeId: line, nodeId: b, site: { kind: 'corner', index: 0 }, end: 'start', at: 1002 });
    s.erase(line, 1003);
    const st = s.getState();
    // An erased mark leaves contentIds, so history is scanned over every node.
    expect(boundToMark(b, st.nodes, allIds(s), { active: true })).toHaveLength(0);
    expect(boundToMark(b, st.nodes, allIds(s))).toHaveLength(1);
  });
});

describe('bind — replay, checkpoints and merge', () => {
  const graph = (s: ReturnType<typeof createSession>) => {
    const st = s.getState();
    return [...st.nodes.values()].flatMap((n) =>
      n.edges
        .filter((e) => e.rel === 'bound-to')
        .map((e) => ({ from: n.id, to: e.to, end: e.end, site: e.site, via: e.via, reasoning: e.reasoning })),
    );
  };

  it('a log with binds in it replays into the identical graph and attribution', () => {
    const s = createSession();
    const b = box(s, 100, 100, 1000);
    const line = connector(s, 1001);
    s.bind({ strokeId: line, nodeId: b, site: { kind: 'corner', index: 0 }, end: 'start', at: 1002 });
    s.bind({ strokeId: line, nodeId: b, site: { kind: 'middle', index: 2 }, end: 'end', at: 1003 });
    const copy = createSession();
    copy.load(JSON.parse(JSON.stringify(s.getEvents())));
    expect(graph(copy)).toEqual(graph(s));
    expect(graph(copy)).toHaveLength(2);
    expect(boundRepsOf(copy.getState().nodes.get(line)!)).toEqual(boundRepsOf(s.getState().nodes.get(line)!));
  });

  it('a bind past a checkpoint replays the same from the checkpoint as from zero', () => {
    const s = createSession();
    let t = 1000;
    for (let i = 0; i < 210; i++) s.addStroke(lineStroke({ x: 0, y: i * 10 }, { x: 400, y: i * 10 + 3 }), (t += 10));
    const b = box(s, 100, 4000, (t += 10));
    const line = connector(s, (t += 10));
    s.bind({ strokeId: line, nodeId: b, site: { kind: 'corner', index: 1 }, end: 'start', at: (t += 10) });
    s.bind({ strokeId: line, nodeId: b, site: { kind: 'corner', index: 3 }, end: 'end', at: (t += 10) });
    const viaCheckpoints = graph(s);
    const fresh = createSession();
    fresh.load(JSON.parse(JSON.stringify(s.getEvents())));
    expect(graph(fresh)).toEqual(viaCheckpoints);
    expect(viaCheckpoints).toHaveLength(2);
  }, 20000);

  it('a bind arriving from another hand keeps the graph, in that hand’s name', () => {
    // The remote hand draws its box, its connector and binds both ends; the
    // local hand draws later. Ids are assigned in MERGE order, so the remote
    // events come first and its own `stroke:1`/`stroke:2` still name its own
    // marks (the ids-per-hand debt, SURFACE-v10-PLAN D8).
    const ada = createSession();
    const ab = box(ada, 100, 100, 1000);
    const aline = connector(ada, 1001);
    ada.bind({ strokeId: aline, nodeId: ab, site: { kind: 'corner', index: 0 }, end: 'start', at: 1002 });
    ada.bind({ strokeId: aline, nodeId: ab, site: { kind: 'middle', index: 2 }, end: 'end', at: 1003 });

    const mine = createSession();
    mine.addStroke(circleStroke(900, 900, 60), 5000);

    const canvas = createSession();
    canvas.load(mergeLogs({ ada: ada.getEvents(), john: mine.getEvents() }, { me: 'john' }));

    const st = canvas.getState();
    expect(st.contentIds).toHaveLength(3);
    const node = st.nodes.get(aline)!;
    const bs = bindingsOf(node);
    expect(bs).toHaveLength(2);
    expect(bs.map((x) => x.end).sort()).toEqual(['end', 'start']);
    expect(bs.map((x) => x.nodeId)).toEqual([ab, ab]);
    expect(bs.map((x) => x.site)).toEqual([{ kind: 'corner', index: 0 }, { kind: 'middle', index: 2 }]);
    // Attribution: another hand's bind is that hand's, never the reader's.
    expect(bs.every((x) => x.via === 'participant:hand:ada')).toBe(true);
    expect(boundRepsOf(node)).toHaveLength(2);
    expect(node.reps.filter((r) => r.modality === 'bound').every((r) => r.source === 'participant:hand:ada')).toBe(true);
  });

  it('a log written by magnets P1 replays into the new representation', () => {
    // A hand-written log in the P1 event shape — the shape has not changed,
    // which is the whole backward-compatibility story: the same `bind` event,
    // a graph that no longer loses an endpoint. Two ends on ONE target is the
    // case P1 could log and could not represent.
    const p1log = [
      { type: 'stroke', points: rectStroke(100, 100, 200, 120), at: 1000 },
      { type: 'stroke', points: lineStroke({ x: 400, y: 400 }, { x: 800, y: 700 }), at: 1001 },
      { type: 'bind', strokeId: 'stroke:2', nodeId: 'stroke:1', site: { kind: 'corner', index: 0 }, end: 'start', at: 1002 },
      { type: 'bind', strokeId: 'stroke:2', nodeId: 'stroke:1', site: { kind: 'middle', index: 2 }, end: 'end', at: 1003 },
    ];
    const s = createSession();
    s.load(JSON.parse(JSON.stringify(p1log)));
    const node = s.getState().nodes.get('stroke:2')!;
    expect(bindingsOf(node)).toHaveLength(2);
    expect(bindingsOf(node).map((x) => x.site)).toEqual([{ kind: 'corner', index: 0 }, { kind: 'middle', index: 2 }]);
    expect(activeBindingsOf(node, s.getState().nodes)).toHaveLength(2);
  });
});
