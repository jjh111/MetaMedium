// Regions (PLAN-IPAD-NOTES I5): a named rectangle that holds whatever stands inside it — ink,
// pictures, text, figures, other regions — so Monday and Pricing are places on a board.
//
// What it holds is DERIVED, never copied into the log: what stands inside its bounds by the one
// rule in `board-regions.ts` (`REGION_HOLDS`). Moving or scaling the region is ONE `move` or
// `scale` carrying what it holds; the bound connectors follow by the machinery E2 already has;
// renaming is an event; erasing a region keeps what it held; undo brings it back.

import { describe, it, expect } from 'vitest';
import { createSession, DEFAULT_SESSION_CONFIG, type Session } from './session';
import { boundsOf, getRep } from './nodes';
import { connectorEnds } from './follow';
import { activeBindingsOf } from './magnets';
import { rectStroke, lineStroke } from '../test/strokes';
import {
  REGION_HOLDS, regionRepOf, regionMembers, regionCarries, describeRegion, regionSaid, regionsOfBoard,
} from './board-regions';
import { mergeLogs } from '../store/merge';

const HASH = 'sha256:' + 'cd'.repeat(32);
const box = (s: Session, x: number, y: number, w: number, h: number, at: number) => s.addStroke(rectStroke(x, y, w, h), at);
const bx = (s: Session, id: string) => boundsOf(s.getState().nodes.get(id)!)!;
const R = (x: number, y: number, w: number, h: number) => ({ minX: x, minY: y, maxX: x + w, maxY: y + h });
const picture = (s: Session, x: number, y: number, at: number) =>
  s.import({ kind: 'jpg', path: 'imports/p.jpg', name: 'p.jpg', bounds: R(x, y, 160, 120), asset: HASH, mime: 'image/jpeg', w: 1600, h: 1200, at })!;
const note = (s: Session, x: number, y: number, at: number) =>
  s.import({ kind: 'text', path: 'note.txt', name: 'note', bounds: R(x, y, 140, 60), code: 'Call Ada', at })!;

describe('regions — a named rectangle holds what stands inside it', () => {
  it('is made by an event, is no ink, and its name and bounds are read from the node', () => {
    const s = createSession();
    const id = s.region({ name: 'Monday', bounds: R(0, 0, 600, 400), at: 1000 })!;
    expect(id).toBeTruthy();
    const st = s.getState();
    expect(st.regions).toEqual([id]);
    expect(st.contentIds).not.toContain(id);
    expect(st.artifacts).not.toContain(id);
    expect(regionRepOf(st.nodes.get(id)!)).toMatchObject({ name: 'Monday' });
    expect(boundsOf(st.nodes.get(id)!)).toEqual(R(0, 0, 600, 400));
    expect(s.getEvents().filter((e) => e.type === 'region')).toHaveLength(1);
  });

  it('refuses no name, and bounds that are not a box', () => {
    const s = createSession();
    expect(s.region({ name: '  ', bounds: R(0, 0, 100, 100), at: 1 })).toBeNull();
    expect(s.region({ name: 'x', bounds: { minX: 5, minY: 5, maxX: 5, maxY: 90 }, at: 2 })).toBeNull();
    expect(s.getState().regions).toEqual([]);
  });

  it('holds what stands inside by one rule — most of a thing\'s box inside — and nothing it only touches', () => {
    const s = createSession();
    const a = box(s, 50, 50, 100, 80, 1000);          // inside
    const b = box(s, 560, 100, 100, 80, 1001);        // 40 of 100 wide inside
    const c = box(s, 520, 100, 100, 80, 1002);        // 80 of 100 inside
    const far = box(s, 900, 900, 100, 80, 1003);      // outside
    const id = s.region({ name: 'Monday', bounds: R(0, 0, 600, 400), at: 1004 })!;
    const held = regionMembers(s.getState(), id);
    expect(held).toContain(a);
    expect(held).toContain(c);
    expect(held).not.toContain(b);
    expect(held).not.toContain(far);
    expect(REGION_HOLDS).toBeGreaterThan(0.4);
    expect(REGION_HOLDS).toBeLessThanOrEqual(0.8);
  });

  it('holds ink, a picture, a text and a figure alike, and says what in words', () => {
    const s = createSession();
    box(s, 50, 50, 100, 80, 1000);
    box(s, 200, 50, 100, 80, 1001);
    picture(s, 60, 200, 1002);
    note(s, 300, 220, 1003);
    s.import({ kind: 'svg', path: 'f.svg', bounds: R(400, 40, 120, 90), code: '<svg xmlns="http://www.w3.org/2000/svg"/>', at: 1004 });
    const id = s.region({ name: 'Monday', bounds: R(0, 0, 600, 400), at: 1005 })!;
    const d = describeRegion(s.getState(), id)!;
    expect(d).toMatchObject({ id, name: 'Monday', holds: { marks: 2, pictures: 1, texts: 1, figures: 1, regions: 0 } });
    expect(regionSaid(d)).toBe('a region “Monday” — holds 2 marks, 1 picture, 1 text, 1 figure');
    const empty = s.region({ name: 'Later', bounds: R(2000, 2000, 300, 300), at: 1006 })!;
    expect(regionSaid(describeRegion(s.getState(), empty)!)).toBe('a region “Later” — holds nothing yet');
  });

  it('a region inside a region nests: the outer holds the inner and all it holds', () => {
    const s = createSession();
    const a = box(s, 60, 60, 80, 60, 1000);
    const b = box(s, 700, 60, 80, 60, 1001);
    const outer = s.region({ name: 'Week', bounds: R(0, 0, 1000, 400), at: 1002 })!;
    const inner = s.region({ name: 'Monday', bounds: R(20, 20, 300, 300), at: 1003 })!;
    const st = s.getState();
    expect(regionMembers(st, outer)).toEqual(expect.arrayContaining([inner, b]));
    expect(regionCarries(st, [outer])).toEqual(expect.arrayContaining([outer, inner, a, b]));
    expect(regionCarries(st, [inner])).toEqual(expect.arrayContaining([inner, a]));
    expect(regionCarries(st, [inner])).not.toContain(b);
    expect(describeRegion(st, outer)!.holds).toMatchObject({ regions: 1, marks: 2 });
    expect(regionsOfBoard(st).map((r) => r.name)).toEqual(['Week', 'Monday']);
    // Two regions of one size never hold each other.
    const twin = s.region({ name: 'Twin', bounds: R(0, 0, 1000, 400), at: 1004 })!;
    expect(regionMembers(s.getState(), twin)).not.toContain(outer);
    expect(regionMembers(s.getState(), outer)).not.toContain(twin);
  });

  it('moving a region is ONE move event that carries what it holds, and one undo takes it all back', () => {
    const s = createSession();
    const a = box(s, 50, 50, 100, 80, 1000);
    const p = picture(s, 60, 200, 1001);
    const t = note(s, 300, 220, 1002);
    const out = box(s, 900, 900, 100, 80, 1003);
    const id = s.region({ name: 'Monday', bounds: R(0, 0, 600, 400), at: 1004 })!;
    const n0 = s.getEvents().length;
    s.move({ ids: [id], dx: 1000, dy: 50, at: 1005 });
    expect(s.getEvents().length).toBe(n0 + 1);
    expect(s.getEvents()[n0]).toMatchObject({ type: 'move', ids: [id] });
    expect(bx(s, id)).toEqual(R(1000, 50, 600, 400));
    expect(bx(s, a).minX).toBeCloseTo(1050, 5);
    expect(bx(s, a).minY).toBeCloseTo(100, 5);
    expect(bx(s, p)).toEqual(R(1060, 250, 160, 120));
    expect(bx(s, t)).toEqual(R(1300, 270, 140, 60));
    expect(bx(s, out).minX).toBeCloseTo(900, 5);
    // What it holds is still what stands inside: nothing was copied into the log.
    expect(regionMembers(s.getState(), id)).toEqual(expect.arrayContaining([a, p, t]));
    s.undo();
    expect(s.getEvents().length).toBe(n0);
    expect(bx(s, id)).toEqual(R(0, 0, 600, 400));
    expect(bx(s, p)).toEqual(R(60, 200, 160, 120));
    expect(bx(s, a).minX).toBeCloseTo(50, 5);
  });

  it('scaling a region is ONE scale that carries what it holds, about the same point', () => {
    const s = createSession();
    const a = box(s, 100, 100, 100, 100, 1000);
    const id = s.region({ name: 'Pricing', bounds: R(0, 0, 400, 400), at: 1001 })!;
    const n0 = s.getEvents().length;
    s.scale({ ids: [id], about: { x: 0, y: 0 }, sx: 2, sy: 2, at: 1002 });
    expect(s.getEvents().length).toBe(n0 + 1);
    expect(bx(s, id)).toEqual(R(0, 0, 800, 800));
    expect(bx(s, a).minX).toBeCloseTo(200, 3);
    expect(bx(s, a).maxX).toBeCloseTo(400, 3);
  });

  it('a nested region and what it holds go with the outer one', () => {
    const s = createSession();
    const a = box(s, 60, 60, 80, 60, 1000);
    const outer = s.region({ name: 'Week', bounds: R(0, 0, 1000, 400), at: 1002 })!;
    const inner = s.region({ name: 'Monday', bounds: R(20, 20, 300, 300), at: 1003 })!;
    s.move({ ids: [outer], dx: 0, dy: 500, at: 1004 });
    expect(bx(s, inner)).toEqual(R(20, 520, 300, 300));
    expect(bx(s, a).minY).toBeCloseTo(560, 5);
  });

  it('an arrow tied to a box inside and a box outside follows the one that moved, and its other end stays tied', () => {
    const s = createSession();
    const inside = box(s, 100, 100, 160, 100, 1000);
    const outside = box(s, 900, 100, 160, 100, 1001);
    const arrow = s.addStroke(lineStroke({ x: 260, y: 150 }, { x: 900, y: 150 }), 1002);
    s.bind({ strokeId: arrow, nodeId: inside, site: { kind: 'middle', index: 1 }, end: 'start', at: 1003 });
    s.bind({ strokeId: arrow, nodeId: outside, site: { kind: 'middle', index: 3 }, end: 'end', at: 1004 });
    const id = s.region({ name: 'Left', bounds: R(0, 0, 400, 400), at: 1005 })!;
    const tipBefore = connectorEnds(s.getState().nodes.get(arrow)!, s.getState().nodes)!.end;
    const startBefore = connectorEnds(s.getState().nodes.get(arrow)!, s.getState().nodes)!.start;
    s.move({ ids: [id], dx: 0, dy: 300, at: 1006 });
    const st = s.getState();
    const e = connectorEnds(st.nodes.get(arrow)!, st.nodes)!;
    expect(e.end.x).toBeCloseTo(tipBefore.x, 3);
    expect(e.end.y).toBeCloseTo(tipBefore.y, 3);
    expect(e.start.y).toBeCloseTo(startBefore.y + 300, 3);
    expect(activeBindingsOf(st.nodes.get(arrow)!, st.nodes)).toHaveLength(2);
    // The outside box did not move.
    expect(bx(s, outside).minY).toBeCloseTo(100, 5);
    s.undo();
    const back = connectorEnds(s.getState().nodes.get(arrow)!, s.getState().nodes)!;
    expect(back.start.y).toBeCloseTo(startBefore.y, 3);
  });

  it('an arrow between two boxes inside travels with them, still tied at both ends', () => {
    const s = createSession();
    const one = box(s, 100, 100, 120, 80, 1000);
    const two = box(s, 400, 100, 120, 80, 1001);
    const arrow = s.addStroke(lineStroke({ x: 220, y: 140 }, { x: 400, y: 140 }), 1002);
    s.bind({ strokeId: arrow, nodeId: one, site: { kind: 'middle', index: 1 }, end: 'start', at: 1003 });
    s.bind({ strokeId: arrow, nodeId: two, site: { kind: 'middle', index: 3 }, end: 'end', at: 1004 });
    const id = s.region({ name: 'Flow', bounds: R(0, 0, 700, 300), at: 1005 })!;
    const n0 = s.getEvents().length;
    s.move({ ids: [id], dx: 40, dy: 200, at: 1006 });
    expect(s.getEvents().slice(n0).map((e) => e.type)).toEqual(['move']);
    expect(activeBindingsOf(s.getState().nodes.get(arrow)!, s.getState().nodes)).toHaveLength(2);
    expect(bx(s, two).minX).toBeCloseTo(440, 5);
    const e = connectorEnds(s.getState().nodes.get(arrow)!, s.getState().nodes)!;
    expect(e.start.y).toBeCloseTo(340, 3);
    expect(e.end.x).toBeCloseTo(440, 3);
  });

  it('a region drawn as a rectangle keeps that ink out of what it holds, and the ink goes with it', () => {
    const s = createSession();
    const frame = box(s, 0, 0, 600, 400, 1000);
    const a = box(s, 50, 50, 100, 80, 1001);
    const id = s.region({ name: 'Monday', bounds: bx(s, frame), from: frame, at: 1002 })!;
    const st = s.getState();
    expect(regionMembers(st, id)).toEqual([a]);
    expect(describeRegion(st, id)!.holds.marks).toBe(1);
    s.move({ ids: [id], dx: 300, dy: 0, at: 1003 });
    expect(bx(s, frame).minX).toBeCloseTo(300, 5);
    expect(bx(s, a).minX).toBeCloseTo(350, 5);
  });

  it('renaming is an event; the name is read from the newest', () => {
    const s = createSession();
    const id = s.region({ name: 'Monday', bounds: R(0, 0, 300, 300), at: 1000 })!;
    const n0 = s.getEvents().length;
    expect(s.renameRegion({ nodeId: id, name: 'Tuesday', at: 1001 })).toBe(id);
    expect(s.getEvents().length).toBe(n0 + 1);
    expect(regionRepOf(s.getState().nodes.get(id)!)!.name).toBe('Tuesday');
    s.undo();
    expect(regionRepOf(s.getState().nodes.get(id)!)!.name).toBe('Monday');
    // A mark is no region: renaming it is refused and writes nothing.
    const m = box(s, 400, 400, 50, 50, 1002);
    const n1 = s.getEvents().length;
    expect(s.renameRegion({ nodeId: m, name: 'Nope', at: 1003 })).toBeNull();
    expect(s.getEvents().length).toBe(n1);
  });

  it('erasing a region keeps what it held; undo brings the region back', () => {
    const s = createSession();
    const a = box(s, 50, 50, 100, 80, 1000);
    const p = picture(s, 60, 200, 1001);
    const id = s.region({ name: 'Monday', bounds: R(0, 0, 600, 400), at: 1002 })!;
    s.erase(id, 1003);
    const st = s.getState();
    expect(st.regions).toEqual([]);
    expect(getRep(st.nodes.get(id)!, 'erased')).toBeTruthy();
    expect(st.contentIds).toEqual(expect.arrayContaining([a, p]));
    expect(getRep(st.nodes.get(a)!, 'erased')).toBeUndefined();
    expect(getRep(st.nodes.get(p)!, 'erased')).toBeUndefined();
    // An erased region holds nothing and carries nothing: a move of it moves only itself.
    s.undo();
    expect(s.getState().regions).toEqual([id]);
    expect(regionMembers(s.getState(), id)).toEqual(expect.arrayContaining([a, p]));
  });

  it('a mark erased leaves what its region holds', () => {
    const s = createSession();
    const a = box(s, 50, 50, 100, 80, 1000);
    box(s, 200, 50, 100, 80, 1001);
    const id = s.region({ name: 'Monday', bounds: R(0, 0, 600, 400), at: 1002 })!;
    s.erase(a, 1003);
    expect(describeRegion(s.getState(), id)!.holds.marks).toBe(1);
  });

  it('replays the same from the log, through a checkpoint, and in either merge order', () => {
    const make = (every?: number) => createSession({ ...DEFAULT_SESSION_CONFIG, logName: 'ada', ...(every ? { checkpointEvery: every } : {}) });
    const s = make(3);
    const a = box(s, 50, 50, 100, 80, 1000);
    const id = s.region({ name: 'Monday', bounds: R(0, 0, 600, 400), at: 1001 })!;
    picture(s, 60, 200, 1002);
    s.move({ ids: [id], dx: 100, dy: 100, at: 1003 });
    s.renameRegion({ nodeId: id, name: 'Tuesday', at: 1004 });
    s.scale({ ids: [id], about: { x: 100, y: 100 }, sx: 1.5, sy: 1.5, at: 1005 });
    const fresh = make();
    fresh.load(s.getEvents());
    const flat = (x: Session) => JSON.stringify([...x.getState().nodes].map(([k, n]) => [k, boundsOf(n), regionRepOf(n)]));
    expect(flat(fresh)).toBe(flat(s));
    expect(fresh.getState().regions).toEqual(s.getState().regions);
    // A second hand's merge puts the same board.
    const merged = createSession({ ...DEFAULT_SESSION_CONFIG, logName: 'bea' });
    merged.load(mergeLogs({ ada: s.getEvents() }, { me: 'bea' }));
    expect(merged.getState().regions).toHaveLength(1);
    expect(regionRepOf(merged.getState().nodes.get(merged.getState().regions[0])!)!.name).toBe('Tuesday');
    expect(bx(merged, a).minX).toBeCloseTo(bx(s, a).minX, 5);
  });

  it('a region is no cluster: the marks inside read as they did without it', () => {
    const plain = createSession();
    box(plain, 50, 50, 100, 80, 1000);
    box(plain, 200, 50, 100, 80, 1001);
    const withR = createSession();
    box(withR, 50, 50, 100, 80, 1000);
    box(withR, 200, 50, 100, 80, 1001);
    withR.region({ name: 'Monday', bounds: R(0, 0, 600, 400), at: 1002 });
    expect(withR.getState().clusterCandidates.map((c) => c.nodeIds)).toEqual(plain.getState().clusterCandidates.map((c) => c.nodeIds));
    expect(withR.getState().contentIds).toEqual(plain.getState().contentIds);
  });
});
