// The shape rung, on plane coordinates.
//
// P0's whole claim is that a drawing on a plane in space reads as it would on
// paper — because it IS 2D by the time the engine sees it (invariant 1). These
// tests state a shape in plane units, put it through the shard's log, and read
// what comes back from the engine untouched.

import { describe, it, expect } from 'vitest';
import type { Point } from 'metamedium-core';
import { createLog, planeOf, sizeOf } from './log';
import {
  add,
  cross,
  dot,
  foundation,
  height,
  mul,
  normalize,
  sub,
  toPlane,
  toWorld,
  v3,
  type Plane,
  type Pose,
  type RayCaster,
  type Vec3,
} from './plane';
import { candidatesFor, projectOnto, rank, type PenScope } from './planarity';

/** A rectangle in plane units, densified the way a hand leaves a path. */
function rectangle(x: number, y: number, w: number, h: number, per = 20): Point[] {
  const corners = [
    { x, y },
    { x: x + w, y },
    { x: x + w, y: y + h },
    { x, y: y + h },
    { x, y },
  ];
  const out: Point[] = [];
  for (let i = 0; i < corners.length - 1; i++) {
    const a = corners[i];
    const b = corners[i + 1];
    for (let s = 0; s < per; s++) {
      const t = s / per;
      out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    }
  }
  out.push(corners[0]);
  return out;
}

/** A regular polygon, densified — the ambiguous shape the rung argues about. */
function polygon(cx: number, cy: number, r: number, sides: number, per = 14): Point[] {
  const out: Point[] = [];
  for (let i = 0; i < sides; i++) {
    const a = (i / sides) * Math.PI * 2 - Math.PI / 2;
    const b = ((i + 1) / sides) * Math.PI * 2 - Math.PI / 2;
    const p0 = { x: cx + Math.cos(a) * r, y: cy + Math.sin(a) * r };
    const p1 = { x: cx + Math.cos(b) * r, y: cy + Math.sin(b) * r };
    for (let s = 0; s < per; s++) {
      const t = s / per;
      out.push({ x: p0.x + (p1.x - p0.x) * t, y: p0.y + (p1.y - p0.y) * t });
    }
  }
  out.push(out[0]);
  return out;
}

function circle(cx: number, cy: number, r: number, n = 64): Point[] {
  const out: Point[] = [];
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * Math.PI * 2;
    out.push({ x: cx + Math.cos(t) * r, y: cy + Math.sin(t) * r });
  }
  return out;
}

const top = (log: ReturnType<typeof createLog>, id: string) => log.markOf(id)!.readings[0];

describe('the shape rung on plane coordinates', () => {
  it('reads a rectangle drawn on the foundation as a rectangle', () => {
    const log = createLog();
    // 3 units across at 0.01 units per screen pixel is a 300px box to the hand.
    const id = log.add(rectangle(-1.5, -1, 3, 2), foundation(), 0.01);
    const r = top(log, id);
    expect(r.label).toBe('rectangle');
    expect(r.weight).toBeGreaterThanOrEqual(0.8);
    expect(r.reasoning).toBeTruthy();
  });

  it('reads a circle drawn on the height plane as a circle', () => {
    const log = createLog();
    const id = log.add(circle(0, 0, 1.2), height(), 0.01);
    const r = top(log, id);
    expect(r.label).toBe('circle');
    expect(r.weight).toBeGreaterThanOrEqual(0.8);
  });

  it('keeps every reading, not just the winner, and each says why', () => {
    // Invariant 2: plural, never winner-take-all. A clean rectangle genuinely
    // has one candidate above the floor; a pentagon has several, and the
    // shard must not have collapsed them on the way through the plane.
    const log = createLog();
    const pent = polygon(0, 0, 1.5, 5);
    const readings = log.markOf(log.add(pent, foundation(), 0.01))!.readings;
    expect(readings.length).toBeGreaterThan(1);
    for (const r of readings) expect(r.reasoning).toBeTruthy();
    // Ranked by measured confidence, never by fiat.
    for (let i = 1; i < readings.length; i++) {
      expect(readings[i].weight).toBeLessThanOrEqual(readings[i - 1].weight);
    }
  });

  it('reads the same shape the same way on any plane — the plane is not a variable', () => {
    const a = createLog();
    const b = createLog();
    const path = rectangle(-1.5, -1, 3, 2);
    const ra = top(a, a.add(path, foundation(), 0.01));
    const rb = top(b, b.add(path, height(), 0.01));
    expect(rb.label).toBe(ra.label);
    expect(rb.weight).toBeCloseTo(ra.weight, 10);
  });

  it('reads at the scale the pen was working at, not at the world’s', () => {
    // The same 0.05-unit mark is a dot at one depth and a shape at another,
    // because the hand's resolution is in screen pixels (CLAUDE.md).
    const small = createLog();
    const big = createLog();
    const path = rectangle(0, 0, 0.05, 0.04);
    const asDot = top(small, small.add(path, foundation(), 0.01)); // 5px to the hand
    const asShape = top(big, big.add(path, foundation(), 0.0001)); // 500px to the hand
    expect(asDot.label).toBe('dot');
    expect(asShape.label).toBe('rectangle');
  });
});

describe('the plane is held on the stroke', () => {
  it('is a rep with its source and its reason', () => {
    const log = createLog();
    const id = log.add(rectangle(0, 0, 3, 2), foundation(), 0.01);
    const plane = planeOf(log.session.getState().nodes.get(id)!)!;
    expect(plane.name).toBe('foundation');
    expect(plane.source).toBe('chosen');
    expect(plane.why).toMatch(/foundation tile was held/);
    expect(log.markOf(id)!.scale).toBe(0.01);
  });

  it('replays with the log — state is a function of the events', () => {
    const log = createLog();
    log.add(rectangle(0, 0, 3, 2), foundation(), 0.01);
    const events = [...log.session.getEvents()];
    log.clear();
    expect(log.marks()).toHaveLength(0);
    log.session.load(events);
    expect(log.marks()).toHaveLength(1);
    expect(log.marks()[0].plane.name).toBe('foundation');
  });

  it('undo drops the stroke AND the plane held with it', () => {
    const log = createLog();
    log.add(rectangle(0, 0, 3, 2), foundation(), 0.01);
    log.add(circle(6, 0, 1), height(), 0.01);
    expect(log.marks()).toHaveLength(2);
    log.undo();
    expect(log.marks()).toHaveLength(1);
    expect(log.marks()[0].plane.name).toBe('foundation');
    log.undo();
    expect(log.marks()).toHaveLength(0);
  });
});

describe('the maths, and the clean form, come along for free', () => {
  it('measures a circle in the hand’s own pixels, not in plane units', () => {
    // measure() rounds to whole units and labels them px, so a 1.2-unit circle
    // measured in plane units comes back "radius 1px" — the shape rounded away.
    // The shard measures the mark as the hand drew it instead, where the
    // engine's own unit label is literally true. (§11: measure() should take a
    // scale, the way analyzeStroke does.)
    const log = createLog();
    const id = log.add(circle(0, 0, 1.2), height(), 0.01);
    const m = log.mathsOf(id)!;
    expect(m.maths.shape).toBe('circle');
    const radius = m.maths.measures.find((x) => x.key === 'radius')!;
    expect(radius.unit).toBe('px');
    expect(radius.value).toBeCloseTo(120, 0); // 1.2 units at 0.01 u/px
    expect(radius.value * m.scale).toBeCloseTo(1.2, 2); // back in plane units
  });

  it('offers a clean form for a confident shape, in the plane’s own units', () => {
    const log = createLog();
    const id = log.add(rectangle(-1.5, -1, 3, 2), foundation(), 0.01);
    const clean = log.offerFor(id)!;
    expect(clean.shape).toBe('rectangle');
    // The offer lies in the plane, so it draws where the ink is.
    const plane = log.markOf(id)!.plane;
    for (const p of clean.points) {
      const back = toPlane(plane, toWorld(plane, p));
      expect(back.x).toBeCloseTo(p.x, 10);
    }
  });

  it('measures the mark in the plane’s units', () => {
    const log = createLog();
    const id = log.add(rectangle(-1.5, -1, 3, 2), foundation(), 0.01);
    expect(sizeOf(log.markOf(id)!)).toBeGreaterThan(2);
  });
});

describe('a slid plane', () => {
  it('lands the same drawing higher up, and reads it the same', () => {
    const log = createLog();
    const slid: Plane = { ...foundation(), origin: { x: 0, y: 2, z: 0 } };
    const id = log.add(rectangle(-1.5, -1, 3, 2), slid, 0.01);
    expect(top(log, id).label).toBe('rectangle');
    const world = toWorld(log.markOf(id)!.plane, { x: 0, y: 0 });
    expect(world.y).toBe(2);
  });
});

// ===== P1 — the flip, and the one undo that puts it back ====================

describe('flipping a mark onto its runner-up', () => {
  /** A camera as the two functions the shard needs from one. */
  function camera(pos: Vec3, target: Vec3, focal = 800) {
    const forward = normalize(sub(target, pos));
    const right = normalize(cross(forward, v3(0, 1, 0)));
    const up = normalize(cross(right, forward));
    const ray: RayCaster = (s) => ({
      origin: pos,
      direction: normalize(add(add(mul(forward, focal), mul(right, s.x)), mul(up, -s.y))),
    });
    const project = (w: { x: number; y: number; z: number }): Point => {
      const d = sub(w, pos);
      const z = dot(d, forward);
      return { x: (focal * dot(d, right)) / z, y: (-focal * dot(d, up)) / z };
    };
    return { ray, project, look: forward, up };
  }

  const cam = camera(v3(0, 10, 14), v3(0, 0, 0));
  const pose: Pose = { position: v3(0, 10, 14), target: v3(0, 0, 0), up: cam.up, fov: 45, aspect: 1 };

  /** A mark whose plane was READ, with the evidence the flip needs kept on it. */
  function drawRead() {
    const log = createLog();
    const screen = rectangle(-90, -70, 180, 140).map((p) => ({ x: p.x, y: p.y }));
    const scope: PenScope = {
      chosen: null,
      pen: screen[0],
      ray: cam.ray,
      look: cam.look,
      cameraUp: cam.up,
      faces: [],
      previous: null,
      viewAnchor: v3(0, 0, 0),
      viewAnchorWhy: 'the gizmo’s own origin',
      at: 100_000,
      recentWindowMs: 20_000,
    };
    const ranked = rank({
      candidates: candidatesFor(scope),
      screen,
      ray: cam.ray,
      look: cam.look,
      previous: null,
      at: scope.at,
      recentWindowMs: scope.recentWindowMs,
    });
    const win = ranked[0];
    const points = projectOnto(win.plane, screen, cam.ray)!;
    const id = log.add(points, { ...win.plane, why: win.reasoning }, 0.01, 1, {
      screen,
      pose,
      candidates: ranked,
    });
    return { log, id, ranked, screen };
  }

  it('re-projects the kept screen path onto the runner-up, and one undo restores the first plane', () => {
    const { log, id, ranked, screen } = drawRead();
    const first = log.markOf(id)!;
    expect(first.plane.source).toBe('view');
    expect(log.whyNotFlip(id)).toBeNull();

    const to = ranked[1];
    const points = projectOnto(to.plane, screen, cam.ray)!;
    const next = log.flip(id, to, points, 0.01, 2)!;
    expect(next).toBeTruthy();

    // ONE mark on the board, on the other plane, and it says where it came from.
    const marks = log.marks();
    expect(marks).toHaveLength(1);
    expect(marks[0].id).toBe(next);
    expect(marks[0].plane.name).toBe(to.plane.name);
    expect(marks[0].flippedFrom).toBe(id);
    // The ink never moved on screen: the same path, read on another plane.
    expect(marks[0].screen).toEqual(screen);
    // …and the way back is the first candidate of the flipped mark's own list.
    expect(marks[0].candidates![0].label).toBe(to.label);

    // ONE undo — a flip is one act, however many events it took.
    log.undo();
    const back = log.marks();
    expect(back).toHaveLength(1);
    expect(back[0].id).toBe(id);
    expect(back[0].plane.source).toBe('view');
    expect(back[0].flippedFrom).toBeUndefined();
  });

  it('refuses to flip a plane the hand chose, and says why', () => {
    const log = createLog();
    const id = log.add(rectangle(-1.5, -1, 3, 2), foundation(), 0.01);
    expect(log.whyNotFlip(id)).toMatch(/the hand chose this plane/);
  });

  it('refuses to flip ink a solid was made from, and says why', () => {
    const log = createLog();
    const profile = log.add(rectangle(-1.5, -1, 3, 2), foundation(), 0.01, 1);
    const extentPlane = height();
    const extent = log.add(
      Array.from({ length: 21 }, (_, i) => ({ x: -1.5, y: -(i / 20) * 2 })),
      extentPlane,
      0.01,
      2
    );
    const m = log.makeable()[0];
    expect(m).toBeTruthy();
    expect(log.make(m, 3)).toBeTruthy();
    expect(log.whyNotFlip(profile)).toMatch(/taken into/);
    expect(log.whyNotFlip(extent)).toMatch(/taken into/);
  });
});
