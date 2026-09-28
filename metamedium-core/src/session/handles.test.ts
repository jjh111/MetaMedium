// Handles — a mark's own points, made draggable (V1-PLAN §4 and §9 E1;
// CONTROL-POINTS-PLAN P2, John's ask for *point control on selected*).
//
// One mark with a clean form — held, or the one it would be offered — shows
// its handles: its own sites, the same the magnets offer (a box's corners,
// edge middles and centre; a circle's centre and cardinals; a line's or an
// arrow's tail, tip and middle; a triangle's corners and centroid; a dot's
// point), and for an arc its two ends and its bulge. Dragging one writes ONE
// `reshape { id, handle, to, at }` event: the clean form changes, the ink
// underneath never does, and undo drops it. A mark not yet snapped is snapped
// by the same act — its clean form is born reshaped. A mark with no clean
// form shows none: nothing is pretended.
//
// What a reshape changes is the `'clean'` rep, and everything read off it
// follows — where the mark is drawn, its sites (so the magnets, and the
// bindings that follow in E2, see the new geometry), its maths, its bounds,
// and the relations read from where it stands. What the ink was READ as does
// not change: a rectangle dragged into a thin bar is still a rectangle.

import { describe, it, expect, afterEach } from 'vitest';
import { createSession, DEFAULT_SESSION_CONFIG, type Session } from './session';
import { cleanOf, cleanPointsOf, snapReading } from './clean';
import { boundsOf, getRep, resemblances, strokePointsOf } from './nodes';
import { magnetSites, siteOf } from './magnets';
import { measure } from './measure';
import { handlesOf, reshapePreview } from './handles';
import { registerPorts, unregisterPorts } from './ports';
import { mergeLogs } from '../store/merge';
import { analyzeStroke } from '../recognition';
import type { Point } from '../types';
import {
  rectStroke,
  circleStroke,
  lineStroke,
  triangleStroke,
  arcStroke,
  handArrow,
  handBox,
  handPolygon,
  handText,
  inkOf,
} from '../test/strokes';

const named = (logName: string) => createSession({ ...DEFAULT_SESSION_CONFIG, logName });
const nodeOf = (s: Session, id: string) => s.getState().nodes.get(id)!;
const cleanNow = (s: Session, id: string) => cleanPointsOf(nodeOf(s, id));
const inkNow = (s: Session, id: string) => JSON.stringify(strokePointsOf(nodeOf(s, id)));
const dist = (p: Point, q: Point) => Math.hypot(p.x - q.x, p.y - q.y);
const expectAt = (p: Point | undefined, q: Point, eps = 1e-6) => {
  expect(p).toBeDefined();
  expect(dist(p!, q)).toBeLessThan(eps);
};
const sub = (a: Point, b: Point) => ({ x: a.x - b.x, y: a.y - b.y });
const dot = (a: Point, b: Point) => a.x * b.x + a.y * b.y;
const len = (a: Point) => Math.hypot(a.x, a.y);
/** The angle at corner i of a closed outline, in degrees. */
const angleAt = (pts: Point[], i: number) => {
  const n = pts.length;
  const u = sub(pts[(i + n - 1) % n], pts[i]), v = sub(pts[(i + 1) % n], pts[i]);
  return (Math.acos(Math.max(-1, Math.min(1, dot(u, v) / (len(u) * len(v))))) * 180) / Math.PI;
};
const kinds = (s: Session, id: string) => handlesOf(nodeOf(s, id), s.getState().nodes).map((h) => `${h.kind}${h.index}`);
const handleAt = (s: Session, id: string, kind: string, index: number) =>
  handlesOf(nodeOf(s, id), s.getState().nodes).find((h) => h.kind === kind && h.index === index)!.point;
const reshapes = (s: Session) => s.getEvents().filter((e) => e.type === 'reshape');

// The shapes, each drawn well apart so no stroke is a scratch across another.
const box = (s: Session, at = 1000) => s.addStroke(rectStroke(100, 100, 200, 120), at, undefined, 1);

describe('handles — one mark with a clean form shows its own sites', () => {
  afterEach(() => unregisterPorts('test-e1'));

  it('a rectangle offers its four corners, four edge middles and its centre — the magnets\' sites', () => {
    const s = createSession();
    const b = box(s);
    expect(kinds(s, b)).toEqual(['corner0', 'corner1', 'corner2', 'corner3', 'middle0', 'middle1', 'middle2', 'middle3', 'centre0']);
    const st = s.getState();
    const sites = magnetSites(nodeOf(s, b), st.nodes);
    for (const h of handlesOf(nodeOf(s, b), st.nodes)) {
      const site = sites.find((x) => x.kind === h.kind && x.index === h.index)!;
      expectAt(h.point, site.point);
    }
    expectAt(handleAt(s, b, 'corner', 2), { x: 300, y: 220 });
  });

  it('each shape offers its own: circle, line, arrow, triangle, arc (its ends and its bulge), dot', () => {
    const s = createSession();
    const c = s.addStroke(circleStroke(600, 160, 60), 1000, undefined, 1);
    const l = s.addStroke(lineStroke({ x: 100, y: 400 }, { x: 400, y: 400 }), 6000, undefined, 1);
    const a = s.addStroke(handArrow({ x: 600, y: 400 }, { x: 900, y: 420 }, { seed: 3, wings: 2 }), 11000, undefined, 1);
    const t = s.addStroke(triangleStroke({ x: 1200, y: 100 }, { x: 1320, y: 300 }, { x: 1080, y: 300 }), 16000, undefined, 1);
    const r = s.addStroke(arcStroke(1600, 700, 100), 21000, undefined, 1);
    expect(kinds(s, c)).toEqual(['centre0', 'cardinal0', 'cardinal1', 'cardinal2', 'cardinal3']);
    expect(kinds(s, l)).toEqual(['tail0', 'tip0', 'middle0']);
    expect(kinds(s, a)).toEqual(['tail0', 'tip0', 'middle0']);
    expect(kinds(s, t)).toEqual(['corner0', 'corner1', 'corner2', 'centre0']);
    // An arc is drawn through three points: its two ends and the bulge between them.
    expect(kinds(s, r)).toEqual(['tail0', 'tip0', 'bulge0']);
    // The bulge sits ON the arc, halfway along it — 270° of radius 100 about (1600, 700) from 0°: at 135°.
    const bulge = handleAt(s, r, 'bulge', 0);
    expect(Math.abs(dist(bulge, { x: 1600, y: 700 }) - 100)).toBeLessThan(1);
  });

  it('a mark with no clean form shows none: writing, and ink the rung cannot place — nothing is pretended', () => {
    const s = createSession();
    const w = s.addStroke(handText(100, 100, 140, 40, { seed: 2 }), 1000, undefined, 1);
    expect(snapReading(nodeOf(s, w), s.getState().nodes).ok).toBe(false);
    expect(handlesOf(nodeOf(s, w), s.getState().nodes)).toEqual([]);
    // …and a reshape of it is refused at the door, writing nothing.
    const n = s.getEvents().length;
    expect(s.reshape({ id: w, handle: { kind: 'corner', index: 0 }, to: { x: 0, y: 0 }, at: 2000 })).toBe(false);
    expect(s.getEvents()).toHaveLength(n);
  });

  it("a notation's ports are the pen's, never a handle: only the mark's own sites are", () => {
    const s = createSession();
    const b = box(s);
    registerPorts({ notation: 'test-e1', portsOf: () => ({ symbol: 'thing', ports: [{ name: 'vertex', reasoning: 'a test port', at: { x: 200, y: 50 } }] }) });
    const st = s.getState();
    expect(magnetSites(nodeOf(s, b), st.nodes).some((x) => x.kind === 'port:test-e1')).toBe(true);
    expect(handlesOf(nodeOf(s, b), st.nodes).some((h) => h.kind.startsWith('port:') || h.kind.startsWith('along:'))).toBe(false);
    expect(handlesOf(nodeOf(s, b), st.nodes)).toHaveLength(9);
  });
});

describe('reshape — a rectangle keeps its frame', () => {
  it('a corner dragged keeps it a box with the corner across it fixed; the ink stays exactly as drawn', () => {
    const s = createSession();
    const b = box(s);
    const ink = inkNow(s, b);
    const events = s.getEvents().length;
    expect(s.reshape({ id: b, handle: { kind: 'corner', index: 2 }, to: { x: 360, y: 260 }, at: 2000 })).toBe(true);
    expect(s.getEvents()).toHaveLength(events + 1);
    expect(s.getEvents()[events]).toMatchObject({ type: 'reshape', id: b, handle: { kind: 'corner', index: 2 }, to: { x: 360, y: 260 } });
    const c = cleanNow(s, b)!;
    expectAt(c[0], { x: 100, y: 100 });
    expectAt(c[1], { x: 360, y: 100 });
    expectAt(c[2], { x: 360, y: 260 });
    expectAt(c[3], { x: 100, y: 260 });
    expect(inkNow(s, b)).toBe(ink);
    expect(cleanOf(nodeOf(s, b))!.reshaped).toEqual({ kind: 'corner', index: 2 });
    expect(cleanOf(nodeOf(s, b))!.shape).toBe('rectangle');
  });

  it('a box drawn turned stays turned: its corners stay square and its sides keep their angle', () => {
    const s = createSession();
    const b = s.addStroke(handBox(700, 300, 200, 120, 30, { jitter: 0, round: 0 }), 1000, undefined, 1);
    s.snap({ ids: [b], at: 1500 });
    const before = cleanNow(s, b)!;
    const to = { x: before[2].x + 30, y: before[2].y + 45 };
    expect(s.reshape({ id: b, handle: { kind: 'corner', index: 2 }, to, at: 2000 })).toBe(true);
    const after = cleanNow(s, b)!;
    expectAt(after[0], before[0]);
    expectAt(after[2], to);
    for (let i = 0; i < 4; i++) expect(Math.abs(angleAt(after, i) - 90)).toBeLessThan(1e-6);
    const turn = (p: Point[]) => Math.atan2(p[1].y - p[0].y, p[1].x - p[0].x);
    expect(Math.abs(turn(after) - turn(before))).toBeLessThan(1e-9);
  });

  it('a box drawn leaning keeps its lean: the corners of a data symbol move and its sides stay parallel at their slant', () => {
    const s = createSession();
    const b = s.addStroke(handPolygon([{ x: 100, y: 500 }, { x: 300, y: 500 }, { x: 260, y: 620 }, { x: 60, y: 620 }], { jitter: 0, round: 0 }), 1000, undefined, 1);
    expect(cleanOf(nodeOf(s, b))).toBeUndefined();
    expect(s.reshape({ id: b, handle: { kind: 'corner', index: 1 }, to: { x: 340, y: 470 }, at: 2000 })).toBe(true);
    const after = cleanNow(s, b)!;
    // Its opposite corner held, the dragged one where the hand let go, and the same slant.
    expectAt(after[3], { x: 60, y: 620 });
    expectAt(after[1], { x: 340, y: 470 });
    const slant = (p: Point[]) => Math.abs(90 - angleAt(p, 3));
    expect(Math.abs(slant(after) - 18.43)).toBeLessThan(0.05);
    // A parallelogram: its opposite sides stay parallel.
    const cross = (u: Point, v: Point) => u.x * v.y - u.y * v.x;
    expect(Math.abs(cross(sub(after[1], after[0]), sub(after[2], after[3])))).toBeLessThan(1e-6);
    expect(Math.abs(cross(sub(after[3], after[0]), sub(after[2], after[1])))).toBeLessThan(1e-6);
    expect(cleanOf(nodeOf(s, b))!.lean).toBeGreaterThan(8);
  });

  it('an edge middle moves that one side, and only across: the side opposite stays', () => {
    const s = createSession();
    const b = box(s);
    // The right side (middle 1, between corners 1 and 2), pulled right 40 and down 25: only the 40 counts.
    expect(s.reshape({ id: b, handle: { kind: 'middle', index: 1 }, to: { x: 340, y: 185 }, at: 2000 })).toBe(true);
    const c = cleanNow(s, b)!;
    expectAt(c[0], { x: 100, y: 100 });
    expectAt(c[1], { x: 340, y: 100 });
    expectAt(c[2], { x: 340, y: 220 });
    expectAt(c[3], { x: 100, y: 220 });
  });

  it('its centre moves the clean form whole — the ink stays where it was drawn', () => {
    const s = createSession();
    const b = box(s);
    const ink = inkNow(s, b);
    expect(s.reshape({ id: b, handle: { kind: 'centre', index: 0 }, to: { x: 230, y: 190 }, at: 2000 })).toBe(true);
    const c = cleanNow(s, b)!;
    expectAt(c[0], { x: 130, y: 130 });
    expectAt(c[2], { x: 330, y: 250 });
    expect(inkNow(s, b)).toBe(ink);
  });

  it('dragged into a thin bar it is still a rectangle: the reading is the ink\'s, the geometry the clean form\'s', () => {
    const s = createSession();
    const b = box(s);
    const read = resemblances(nodeOf(s, b))[0];
    expect(s.reshape({ id: b, handle: { kind: 'corner', index: 2 }, to: { x: 500, y: 106 }, at: 2000 })).toBe(true);
    const n = nodeOf(s, b), nodes = s.getState().nodes;
    // What the ink was read as has not changed…
    expect(resemblances(n)[0]).toBe(read);
    expect(snapReading(n, nodes).shape).toBe('rectangle');
    expect(cleanOf(n)!.shape).toBe('rectangle');
    // …and what it measures, where it stands and what it offers are the bar's.
    const m = measure(n, nodes)!;
    expect(m.shape).toBe('rectangle');
    expect(m.measures.find((x) => x.key === 'width')!.value).toBe(400);
    expect(m.measures.find((x) => x.key === 'height')!.value).toBe(6);
    expect(boundsOf(n)).toEqual({ minX: 100, minY: 100, maxX: 500, maxY: 106 });
    expectAt(siteOf(n, nodes, { kind: 'corner', index: 2 })!.point, { x: 500, y: 106 });
    expect(handlesOf(n, nodes)).toHaveLength(9);
  });
});

describe('reshape — circles, lines, arrows, triangles, arcs, dots', () => {
  it("a circle's cardinal sets its radius, the centre held; its centre moves it", () => {
    const s = createSession();
    const c = s.addStroke(circleStroke(600, 160, 60), 1000, undefined, 1);
    expect(s.reshape({ id: c, handle: { kind: 'cardinal', index: 1 }, to: { x: 700, y: 160 }, at: 2000 })).toBe(true);
    let b = boundsOf(nodeOf(s, c))!;
    expect(b.maxX - b.minX).toBeCloseTo(200, 6);
    expect(b.maxY - b.minY).toBeCloseTo(200, 6);
    expect((b.minX + b.maxX) / 2).toBeCloseTo(600, 6);
    const m = measure(nodeOf(s, c), s.getState().nodes)!;
    expect(m.measures.find((x) => x.key === 'radius')!.value).toBe(100);
    expectAt(siteOf(nodeOf(s, c), s.getState().nodes, { kind: 'cardinal', index: 1 })!.point, { x: 700, y: 160 });
    // The centre, dragged, moves the circle and keeps its radius.
    expect(s.reshape({ id: c, handle: { kind: 'centre', index: 0 }, to: { x: 650, y: 200 }, at: 3000 })).toBe(true);
    b = boundsOf(nodeOf(s, c))!;
    expect((b.minX + b.maxX) / 2).toBeCloseTo(650, 6);
    expect((b.minY + b.maxY) / 2).toBeCloseTo(200, 6);
    expect(b.maxX - b.minX).toBeCloseTo(200, 6);
    expect(reshapes(s)).toHaveLength(2);
  });

  it("a line's end moves that end, the other held; its middle moves it whole", () => {
    const s = createSession();
    const l = s.addStroke(lineStroke({ x: 100, y: 400 }, { x: 400, y: 400 }), 1000, undefined, 1);
    expect(s.reshape({ id: l, handle: { kind: 'tip', index: 0 }, to: { x: 380, y: 300 }, at: 2000 })).toBe(true);
    let c = cleanNow(s, l)!;
    expectAt(c[0], { x: 100, y: 400 });
    expectAt(c[c.length - 1], { x: 380, y: 300 });
    expect(measure(nodeOf(s, l), s.getState().nodes)!.measures.find((x) => x.key === 'length')!.value).toBe(Math.round(Math.hypot(280, 100)));
    expect(s.reshape({ id: l, handle: { kind: 'middle', index: 0 }, to: { x: 250, y: 380 }, at: 3000 })).toBe(true);
    c = cleanNow(s, l)!;
    expectAt(c[0], { x: 110, y: 430 });
    expectAt(c[c.length - 1], { x: 390, y: 330 });
  });

  it("an arrow's tip moves the tip and keeps its head there: the clean form still reads as an arrow", () => {
    const s = createSession();
    const a = s.addStroke(handArrow({ x: 600, y: 400 }, { x: 900, y: 420 }, { seed: 3, wings: 2 }), 1000, undefined, 1);
    const tail = handleAt(s, a, 'tail', 0);
    expect(s.reshape({ id: a, handle: { kind: 'tip', index: 0 }, to: { x: 820, y: 600 }, at: 2000 })).toBe(true);
    const n = nodeOf(s, a), nodes = s.getState().nodes;
    const clean = cleanOf(n)!;
    expect(clean.shape).toBe('arrow');
    const pts = cleanPointsOf(n)!;
    expectAt(pts[0], tail);
    expectAt(pts[1], { x: 820, y: 600 });
    expectAt(siteOf(n, nodes, { kind: 'tip', index: 0 })!.point, { x: 820, y: 600 });
    expectAt(siteOf(n, nodes, { kind: 'tail', index: 0 })!.point, tail);
    // The head is at the tip: both wings leave it, pointing back along the new shaft.
    const shaft = sub(pts[1], pts[0]);
    for (const w of [pts[2], pts[4]]) expect(dot(sub(w, pts[1]), shaft)).toBeLessThan(0);
    expect(analyzeStroke(inkOf(pts, false), 1).results[0].type).toBe('arrow');
    const m = measure(n, nodes)!;
    expect(m.measures.find((x) => x.key === 'length')!.value).toBe(Math.round(dist(tail, { x: 820, y: 600 })));
  });

  it("a triangle's corner moves freely, the other two held", () => {
    const s = createSession();
    const t = s.addStroke(triangleStroke({ x: 1200, y: 100 }, { x: 1320, y: 300 }, { x: 1080, y: 300 }), 1000, undefined, 1);
    s.snap({ ids: [t], at: 1500 });
    const before = cleanNow(s, t)!;
    expect(s.reshape({ id: t, handle: { kind: 'corner', index: 1 }, to: { x: 1000, y: 360 }, at: 2000 })).toBe(true);
    const after = cleanNow(s, t)!;
    expectAt(after[0], before[0]);
    expectAt(after[1], { x: 1000, y: 360 });
    expectAt(after[2], before[2]);
  });

  it("an arc's end moves that end and keeps its sweep; its bulge bends it through the chord's middle", () => {
    const s = createSession();
    const r = s.addStroke(arcStroke(1600, 700, 100), 1000, undefined, 1);
    /** How far the arc stands off its chord at its farthest: its sagitta. */
    const sagitta = (pts: Point[]) => {
      const a = pts[0], z = pts[pts.length - 1], ch = dist(a, z);
      return Math.max(...pts.map((p) => Math.abs((z.x - a.x) * (p.y - a.y) - (z.y - a.y) * (p.x - a.x)) / ch));
    };
    const tail = handleAt(s, r, 'tail', 0);
    const tip = handleAt(s, r, 'tip', 0);
    // Its tip pulled out to twice as far from its tail: the same arc, twice the size.
    const to = { x: tail.x + (tip.x - tail.x) * 2, y: tail.y + (tip.y - tail.y) * 2 };
    expect(s.reshape({ id: r, handle: { kind: 'tip', index: 0 }, to, at: 2000 })).toBe(true);
    let c = cleanNow(s, r)!;
    expectAt(c[0], tail);
    expectAt(c[c.length - 1], to);
    const m = measure(nodeOf(s, r), s.getState().nodes)!;
    expect(Math.abs(m.measures.find((x) => x.key === 'radius')!.value - 200)).toBeLessThanOrEqual(2);
    // The bulge, pulled toward the chord: a shallower arc through the same ends.
    const a = c[0], z = c[c.length - 1];
    const mid = { x: (a.x + z.x) / 2, y: (a.y + z.y) / 2 };
    const bulge = handleAt(s, r, 'bulge', 0);
    const toward = { x: mid.x + (bulge.x - mid.x) * 0.25, y: mid.y + (bulge.y - mid.y) * 0.25 };
    const standingOff = sagitta(c);
    expect(s.reshape({ id: r, handle: { kind: 'bulge', index: 0 }, to: toward, at: 3000 })).toBe(true);
    c = cleanNow(s, r)!;
    expectAt(c[0], a);
    expectAt(c[c.length - 1], z);
    expect(Math.abs(sagitta(c) - standingOff * 0.25)).toBeLessThan(1e-6);
    expectAt(handleAt(s, r, 'bulge', 0), toward, 1e-6);
    expect(cleanOf(nodeOf(s, r))!.shape).toBe('arc');
  });

  it('a dot moves where its point is dragged', () => {
    const s = createSession();
    const d = s.addStroke(circleStroke(900, 900, 2, 12), 1000, undefined, 1);
    const n0 = nodeOf(s, d);
    expect(snapReading(n0, s.getState().nodes).shape).toBe('dot');
    expect(kinds(s, d)).toEqual(['point0']);
    expect(s.reshape({ id: d, handle: { kind: 'point', index: 0 }, to: { x: 950, y: 880 }, at: 2000 })).toBe(true);
    const b = boundsOf(nodeOf(s, d))!;
    expect((b.minX + b.maxX) / 2).toBeCloseTo(950, 6);
    expect((b.minY + b.maxY) / 2).toBeCloseTo(880, 6);
  });
});

describe('reshape — born reshaped, undo, replay, another hand, one act', () => {
  it('a mark not yet snapped is snapped by the same act: one event, and its clean form is born reshaped', () => {
    const s = createSession();
    const b = box(s);
    expect(cleanOf(nodeOf(s, b))).toBeUndefined();
    const n = s.getEvents().length;
    s.reshape({ id: b, handle: { kind: 'corner', index: 0 }, to: { x: 80, y: 60 }, at: 2000 });
    expect(s.getEvents()).toHaveLength(n + 1);
    expect(s.getEvents().some((e) => e.type === 'snap')).toBe(false);
    const clean = cleanOf(nodeOf(s, b))!;
    expect(clean.reshaped).toEqual({ kind: 'corner', index: 0 });
    expectAt(cleanNow(s, b)![0], { x: 80, y: 60 });
    expectAt(cleanNow(s, b)![2], { x: 300, y: 220 });
    // No offer stands for a mark that holds its clean form.
    expect(s.snapCandidates([b])).toEqual([]);
  });

  it('one undo takes the reshape back: born reshaped, the mark is ink again; snapped, the clean form is as it was', () => {
    const s = createSession();
    const b = box(s);
    const ink = inkNow(s, b);
    s.reshape({ id: b, handle: { kind: 'corner', index: 2 }, to: { x: 360, y: 260 }, at: 2000 });
    s.undo();
    expect(cleanOf(nodeOf(s, b))).toBeUndefined();
    expect(inkNow(s, b)).toBe(ink);
    expect(boundsOf(nodeOf(s, b))).toEqual({ minX: 100, minY: 100, maxX: 300, maxY: 220 });

    s.snap({ ids: [b], at: 3000 });
    const snapped = JSON.stringify(cleanNow(s, b));
    s.reshape({ id: b, handle: { kind: 'middle', index: 2 }, to: { x: 200, y: 300 }, at: 4000 });
    expect(JSON.stringify(cleanNow(s, b))).not.toBe(snapped);
    s.undo();
    expect(JSON.stringify(cleanNow(s, b))).toBe(snapped);
    expect(cleanOf(nodeOf(s, b))!.reshaped).toBeUndefined();
  });

  it('is one act: lastAct is the reshape alone, whatever else was written before it', () => {
    const s = named('ann~a1');
    const b = box(s);
    s.snap({ ids: [b], at: 1500 });
    s.reshape({ id: b, handle: { kind: 'corner', index: 1 }, to: { x: 340, y: 90 }, at: 2000 });
    expect(s.lastAct().map((e) => e.type)).toEqual(['reshape']);
    s.undo();
    expect(s.lastAct().map((e) => e.type)).toEqual(['snap']);
  });

  it('replays: the log read back gives the same clean form, the same bounds and the same sites', () => {
    const s = named('ann~a1');
    const b = box(s);
    const c = s.addStroke(circleStroke(600, 160, 60), 6000, undefined, 1);
    s.reshape({ id: b, handle: { kind: 'corner', index: 2 }, to: { x: 360, y: 260 }, at: 7000 });
    s.reshape({ id: c, handle: { kind: 'cardinal', index: 0 }, to: { x: 600, y: 60 }, at: 8000 });
    const copy = createSession();
    copy.load(JSON.parse(JSON.stringify(s.getEvents())));
    for (const id of [b, c]) {
      expect(cleanOf(nodeOf(copy, id))!.reshaped).toBeDefined();
      expect(JSON.stringify(cleanOf(nodeOf(copy, id)))).toBe(JSON.stringify(cleanOf(nodeOf(s, id))));
      expect(boundsOf(nodeOf(copy, id))).toEqual(boundsOf(nodeOf(s, id)));
      expect(JSON.stringify(magnetSites(nodeOf(copy, id), copy.getState().nodes))).toBe(JSON.stringify(magnetSites(nodeOf(s, id), s.getState().nodes)));
    }
  });

  it('a reshape past a checkpoint replays the same from the checkpoint as from zero', () => {
    const s = createSession({ ...DEFAULT_SESSION_CONFIG, checkpointEvery: 5 });
    let t = 1000;
    const ids: string[] = [];
    for (let i = 0; i < 12; i++) ids.push(s.addStroke(rectStroke(100 + (i % 4) * 300, 100 + Math.floor(i / 4) * 300, 160, 100), (t += 5000), undefined, 1));
    s.reshape({ id: ids[5], handle: { kind: 'corner', index: 2 }, to: { x: 700, y: 520 }, at: (t += 10) });
    s.addStroke(rectStroke(100, 1100, 160, 100), (t += 5000), undefined, 1);
    s.reshape({ id: ids[6], handle: { kind: 'middle', index: 3 }, to: { x: 650, y: 450 }, at: (t += 10) });
    const fresh = createSession();
    fresh.load(JSON.parse(JSON.stringify(s.getEvents())));
    for (const id of ids) expect(JSON.stringify(cleanOf(nodeOf(fresh, id)))).toBe(JSON.stringify(cleanOf(nodeOf(s, id))));
    // Back past the second reshape and the stroke before it, from a checkpoint: the first reshape stands.
    s.undo();
    s.undo();
    const back = createSession();
    back.load(JSON.parse(JSON.stringify(s.getEvents())));
    expect(cleanOf(nodeOf(s, ids[5]))!.reshaped).toBeDefined();
    expect(JSON.stringify(cleanOf(nodeOf(back, ids[5])))).toBe(JSON.stringify(cleanOf(nodeOf(s, ids[5]))));
    expect(cleanOf(nodeOf(s, ids[6]))).toBeUndefined();
  });

  it("a reshape in another hand's log lands on this board as it did on hers, in her name — and the ink is hers, untouched", () => {
    const ada = named('ada~a1');
    const b = box(ada);
    const l = ada.addStroke(lineStroke({ x: 500, y: 500 }, { x: 800, y: 560 }), 6000, undefined, 1);
    ada.reshape({ id: b, handle: { kind: 'corner', index: 2 }, to: { x: 360, y: 260 }, at: 7000 });
    ada.reshape({ id: l, handle: { kind: 'tail', index: 0 }, to: { x: 480, y: 620 }, at: 8000 });

    const mine = named('john~j1');
    mine.addStroke(circleStroke(1200, 900, 60), 500, undefined, 1);

    // Either order of the logs, the reader's own first or hers.
    for (const logs of [{ 'ada~a1': ada.getEvents(), 'john~j1': mine.getEvents() }, { 'john~j1': mine.getEvents(), 'ada~a1': ada.getEvents() }]) {
      const board = named('john~j1');
      board.load(mergeLogs(logs, { me: 'john~j1' }));
      for (const id of [b, l]) {
        expect(JSON.stringify(cleanOf(nodeOf(board, id)))).toBe(JSON.stringify(cleanOf(nodeOf(ada, id))));
        expect(inkNow(board, id)).toBe(inkNow(ada, id));
        expect(getRep(nodeOf(board, id), 'clean')!.source).toBe('participant:hand:ada~a1');
      }
      // The reader's undo takes back its own act, never hers.
      board.undo();
      expect(cleanOf(nodeOf(board, b))!.reshaped).toBeDefined();
      expect(board.getState().contentIds).toHaveLength(2);
    }
  });

  it('a moved mark is reshaped where it stands, and a later move carries the reshaped form with it', () => {
    const s = createSession();
    const b = box(s);
    s.move({ ids: [b], dx: 400, dy: 50, at: 1500 });
    // Where it stands now: (500, 150) to (700, 270).
    expectAt(handleAt(s, b, 'corner', 2), { x: 700, y: 270 });
    s.reshape({ id: b, handle: { kind: 'corner', index: 2 }, to: { x: 760, y: 310 }, at: 2000 });
    expectAt(cleanNow(s, b)![2], { x: 760, y: 310 });
    expectAt(cleanNow(s, b)![0], { x: 500, y: 150 });
    // The event keeps it in the mark's own space — the space its ink was drawn in.
    expect(reshapes(s)[0]).toMatchObject({ to: { x: 360, y: 260 } });
    s.move({ ids: [b], dx: -100, dy: 0, at: 3000 });
    expectAt(cleanNow(s, b)![2], { x: 660, y: 310 });
    expectAt(cleanNow(s, b)![0], { x: 400, y: 150 });
  });

  it('a ruled line with no height, moved, can still be reshaped up and down: an axis the ink has no extent on is carried, never collapsed', () => {
    const s = createSession();
    const l = s.addStroke(lineStroke({ x: 100, y: 400 }, { x: 400, y: 400 }), 1000, undefined, 1);
    s.move({ ids: [l], dx: 50, dy: 20, at: 1500 });
    expect(s.reshape({ id: l, handle: { kind: 'tip', index: 0 }, to: { x: 450, y: 300 }, at: 2000 })).toBe(true);
    const c = cleanNow(s, l)!;
    expectAt(c[0], { x: 150, y: 420 });
    expectAt(c[c.length - 1], { x: 450, y: 300 });
  });
});

describe('reshape — what reads from where it stands', () => {
  it('a box pulled out over a circle now holds it: relations, and the role, are read from the clean form', () => {
    const s = createSession();
    const b = box(s);
    const c = s.addStroke(circleStroke(420, 160, 30), 6000, undefined, 1);
    const holds = () => s.read([b, c]).relations.some((r) => r.kind === 'contains' && r.from === b && r.to === c);
    expect(holds()).toBe(false);
    s.reshape({ id: b, handle: { kind: 'middle', index: 1 }, to: { x: 500, y: 160 }, at: 7000 });
    expect(holds()).toBe(true);
    expect(s.read([b, c]).roles.find((r) => r.id === b)!.role).toBe('container');
    s.undo();
    expect(holds()).toBe(false);
  });

  it('a reshaped mark is the one a new stroke\'s relations find: the index files it where it stands', () => {
    const s = createSession();
    const b = box(s);
    s.reshape({ id: b, handle: { kind: 'corner', index: 2 }, to: { x: 700, y: 520 }, at: 2000 });
    // A circle drawn inside the grown box — far from the ink — is inside it.
    const c = s.addStroke(circleStroke(600, 440, 30), 7000, undefined, 1);
    expect(nodeOf(s, b).edges.some((e) => e.rel === 'contains' && e.to === c)).toBe(true);
  });

  it('the preview is the act: what reshapePreview shows is what the reshape writes', () => {
    const s = createSession();
    const b = box(s);
    const st = s.getState();
    const pv = reshapePreview(nodeOf(s, b), st.nodes, { kind: 'corner', index: 2 }, { x: 360, y: 260 })!;
    expect(pv).toBeTruthy();
    expect(cleanOf(nodeOf(s, b))).toBeUndefined();
    s.reshape({ id: b, handle: { kind: 'corner', index: 2 }, to: { x: 360, y: 260 }, at: 2000 });
    expect(JSON.stringify(cleanPointsOf(pv.node))).toBe(JSON.stringify(cleanNow(s, b)));
  });
});
