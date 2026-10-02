// Push 2, G1 — the sketch hull, in the volume its claims define
// (SHARD-3D-PUSH-2.md §1, and §0's two boards).
//
// Two things are pinned here, and the first one is a measurement rather than a
// design: John's second board stood a massing while its side and front
// profiles were drawn one to three units above the floor, and his words were
// *the way the shapes are drawn in the volume of space is always in the
// floor*. So the first `describe` rebuilds those three profiles from the
// exported fixture's own bounds and derives the massing headless, with the
// real CSG seam. It does NOT float down: the body stands at y 0.97–3.09, where
// its claims are. What was in the floor was the free INK — every view stroke
// on that board lay on a plane through a cursor nobody had moved from the
// world origin while the camera looked one to four units up — and that is the
// view-anchor fix in `cursor.ts`, tested in `cursor.test.ts`.
//
// The rest is the hull itself: a footprint and two ⊓ drawn from two free
// views, which is how John drew his first board and how an architect sketches.
//
// Headless, like `massing.test.ts` — the prisms and their intersection are
// arithmetic, not a renderer.

import { describe, it, expect } from 'vitest';
import type { Point } from 'metamedium-core';
import { createLog, type SpaceRead } from './log';
import { deriveTree } from './solid';
import { assignForms, hullableFrom, viewLabelOf, prismsMeet, type FormMark } from './form';
import {
  foundation,
  height,
  width,
  normalize,
  sub,
  cross,
  mul,
  toWorld,
  uAxis,
  vAxis,
  type Plane,
  type Vec3,
} from './plane';
import type { HullStep } from './op';

const SCALE = 0.012;

/** No renderer: the diff's seam is not what these tests are about. */
const blindSpace: SpaceRead = {
  silhouettes: () => [],
  spanAlong: () => 0,
  silhouetteOn: () => null,
};

// ---- the shapes a hand draws ------------------------------------------------

function loop(corners: Point[], per = 20): Point[] {
  const out: Point[] = [];
  for (let i = 0; i < corners.length; i++) {
    const a = corners[i];
    const b = corners[(i + 1) % corners.length];
    for (let s = 0; s < per; s++) {
      const t = s / per;
      out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    }
  }
  out.push(corners[0]);
  return out;
}

const rect = (x: number, y: number, w: number, h: number) =>
  loop([{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }]);

/** An ellipse through a box, as a hand's circle lands in the log. */
function ellipse(minX: number, minY: number, maxX: number, maxY: number, n = 48): Point[] {
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;
  const rx = (maxX - minX) / 2;
  const ry = (maxY - minY) / 2;
  const out: Point[] = [];
  for (let i = 0; i <= n; i++) {
    const t = (i / n) * Math.PI * 2;
    out.push({ x: cx + rx * Math.cos(t), y: cy + ry * Math.sin(t) });
  }
  return out;
}

/**
 * Where the GROUND crosses a plane, at a given u — in that plane's own v.
 *
 * A view plane stands through the point the hand is working at, which is not
 * the floor, so a ⊓ whose feet are meant to touch the ground has to be drawn
 * where the ground actually is in that plane. This is the arithmetic the hand
 * does by eye, and getting it wrong in the first draft of this file is exactly
 * the mistake the rung is there to catch.
 */
function groundV(plane: Plane, u: number): number {
  const U = uAxis(plane);
  const V = vAxis(plane);
  return -(plane.origin.y + u * U.y) / V.y;
}

/**
 * A ⊓ in a plane's own (u, v): up one side, across, down the other, with both
 * feet ON the world ground. +v runs DOWN the screen, so the top is `tall`
 * below the feet in v.
 */
function tower(plane: Plane, u: number, w: number, tall: number, per = 10): Point[] {
  const a = groundV(plane, u);
  const b = groundV(plane, u + w);
  return [
    ...run({ x: u, y: a }, { x: u, y: a - tall }, per),
    ...run({ x: u, y: a - tall }, { x: u + w, y: b - tall }, per),
    ...run({ x: u + w, y: b - tall }, { x: u + w, y: b }, per),
  ];
}

function run(a: Point, b: Point, per: number): Point[] {
  const out: Point[] = [];
  for (let i = 0; i <= per; i++) {
    const t = i / per;
    out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
  }
  return out;
}

/** A ⊓ lifted off the ground by `gap` — the floating one §5 leaves as an annotation. */
function floating(plane: Plane, u: number, w: number, tall: number, gap: number): Point[] {
  return tower(plane, u, w, tall).map((p) => ({ x: p.x, y: p.y - gap }));
}

/**
 * A free view's plane, exactly as `planarity.ts` builds one: through the point
 * the hand is working at, facing the camera, +v down the screen.
 */
function viewPlane(from: Vec3, at: Vec3, why = 'a free view'): Plane {
  const look = normalize(sub(at, from));
  const normal = mul(look, -1);
  const worldUp = { x: 0, y: 1, z: 0 };
  const right = normalize(cross(look, worldUp));
  const up = normalize(cross(look, right)); // down the screen
  return { origin: at, normal, up, source: 'view', name: 'view', why };
}

// ---- 1 · the volume, from John's own board ----------------------------------

/**
 * The three profiles of `fixtures/john-2026-09-16-massing.json`, rebuilt from
 * that file's own `bounds` (the hook exported bounds, not points — the export
 * is G0's). The circles are ellipses through those boxes; the footprint is the
 * rectangle it was read as.
 */
function johnsSecondBoard() {
  const log = createLog();
  log.sees(blindSpace);
  // stroke:8 — a circle on the HEIGHT plane, v −3.18…−1.015. +v runs down, so
  // that is world y 1.015…3.18: drawn ABOVE the floor, around the target.
  const front = log.add(ellipse(1.225, -3.18, 3.654, -1.015), height(), SCALE, 1000);
  // stroke:9 — a circle on the WIDTH plane, v −3.012…−1.048 → y 1.048…3.012.
  const side = log.add(ellipse(-4.296, -3.012, -2.022, -1.048), width(), SCALE, 2000);
  // stroke:15 — the rectangle footprint on the FOUNDATION, at y = 0.
  const plan = log.add(rect(0.41, 1.219, 5.451 - 0.41, 5.64 - 1.219), foundation(), SCALE, 3000);
  return { log, front, side, plan };
}

describe('the volume: a hull stands where its claims are', () => {
  it('John’s own three profiles mass into a body ABOVE the floor, not on it', () => {
    const { log } = johnsSecondBoard();
    const m = log.massable();
    expect(m).toBeTruthy();
    log.mass(m!, 4000);

    const { geometry, broken } = deriveTree(log.solids()[0].tree, {});
    expect(broken).toBeNull();
    geometry!.computeBoundingBox();
    const b = geometry!.boundingBox!;
    // The two elevations bound y between them (1.01…3.18 and 1.05…3.01), and
    // the clean circle the rung offers for a hand's ellipse widens that a
    // little. What matters is the floor: the body starts a whole unit up.
    expect(b.min.y).toBeGreaterThan(0.8);
    expect(b.max.y).toBeLessThan(3.3);
    // The footprint's own points sit at y = 0, and they do not drag it down:
    // a claim's prism runs through the span of the OTHERS, never its own.
    expect(b.min.y).not.toBeCloseTo(0, 1);
  });

  it('two loops drawn a unit above the floor make a hull a unit above the floor', () => {
    const log = createLog();
    log.sees(blindSpace);
    // Two squares, one on each wall plane, spanning world y 1…2.
    log.add(rect(-1, -2, 2, 1), height(), SCALE, 1000);
    log.add(rect(-1, -2, 2, 1), width(), SCALE, 2000);
    log.mass(log.massable()!, 3000);
    const { geometry } = deriveTree(log.solids()[0].tree, {});
    geometry!.computeBoundingBox();
    const b = geometry!.boundingBox!;
    expect(b.min.y).toBeCloseTo(1, 1);
    expect(b.max.y).toBeCloseTo(2, 1);
  });

  it('the ground bounds a hull only where a claim’s feet reach it', () => {
    const { log } = castleSketch();
    const h = log.hullable()!;
    log.hull(h, 5000);
    const { geometry, broken } = deriveTree(log.solidOf(log.solids()[0].id)!.tree, {});
    expect(broken).toBeNull();
    geometry!.computeBoundingBox();
    // Both towers stand ON the ground, so this hull does reach the floor —
    // the same rule, the other way round. Not EXACTLY the floor: a claim from
    // an oblique view is swept along an oblique normal, so the bottom of its
    // prism is a slanted surface that grazes a little under the ground. The
    // ground is where the claims put the body, not a knife.
    expect(Math.abs(geometry!.boundingBox!.min.y)).toBeLessThan(0.2);
  });
});

// ---- 2 · the claims ----------------------------------------------------------

/** One mark, as the form rung sees it, without a session. */
function markOn(id: string, plane: Plane, points: Point[], shape: string, closed: boolean): FormMark {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
  }
  return {
    id,
    shape,
    confidence: 0.8,
    closed,
    plane,
    points,
    size: Math.max(maxX - minX, maxY - minY),
  };
}

const FROM_FRONT = viewPlane({ x: 8, y: 5, z: 14 }, { x: 2, y: 1.2, z: 2 });
const FROM_SIDE = viewPlane({ x: 14, y: 5, z: -5 }, { x: 2, y: 1.2, z: 2 });
const FROM_ABOVE = viewPlane({ x: 2, y: 16, z: 2.4 }, { x: 2, y: 1.2, z: 2 });

describe('the form rung reads a sketch as claims', () => {
  it('a ⊓ from a free view, its feet on the ground, is an elevation', () => {
    const marks = [
      markOn('stroke:1', foundation(), rect(0, 0, 4, 4), 'rectangle', true),
      markOn('stroke:2', FROM_FRONT, tower(FROM_FRONT, -1.5, 1.2, 3), 'rectangle', false),
    ];
    const forms = assignForms({ marks });
    const elevation = forms.find((f) => f.id === 'stroke:2')!;
    expect(elevation.role).toBe('elevation');
    expect(elevation.rule).toBe(8);
    expect(elevation.reasoning).toMatch(/feet both reach the ground/);
    expect(elevation.reasoning).toMatch(/closed on the ground/);
  });

  it('a ⊓ whose feet miss the ground is an annotation, and says why', () => {
    const marks = [
      markOn('stroke:1', foundation(), rect(0, 0, 4, 4), 'rectangle', true),
      markOn('stroke:2', FROM_FRONT, floating(FROM_FRONT, -1.5, 1.2, 3, 1.4), 'rectangle', false),
    ];
    const forms = assignForms({ marks });
    const note = forms.find((f) => f.id === 'stroke:2')!;
    expect(note.role).toBe('annotation');
    expect(note.reasoning).toMatch(/its feet do not reach the ground/);
  });

  it('a view from almost overhead shows a plan, and the row says so', () => {
    const marks = [
      markOn('stroke:1', foundation(), rect(0, 0, 4, 4), 'rectangle', true),
      markOn('stroke:2', FROM_ABOVE, tower(FROM_ABOVE, -1.5, 1.2, 3), 'rectangle', false),
    ];
    const note = assignForms({ marks }).find((f) => f.id === 'stroke:2')!;
    expect(note.role).toBe('annotation');
    expect(note.reasoning).toMatch(/almost overhead/);
  });

  it('a closed stroke on a free view whose prism meets the footprint is a claim', () => {
    const marks = [
      markOn('stroke:1', foundation(), rect(0, 0, 4, 4), 'rectangle', true),
      markOn('stroke:2', FROM_FRONT, rect(-1, -2.5, 2, 2), 'rectangle', true),
    ];
    const claim = assignForms({ marks }).find((f) => f.id === 'stroke:2')!;
    expect(claim.role).toBe('profile');
    expect(claim.rule).toBe(2);
    expect(claim.reasoning).toMatch(/a claim from \d+° · [+-]\d+°/);
    expect(claim.targets).toEqual(['stroke:1']);
  });

  it('a closed stroke whose prism meets nothing is not a claim about anything', () => {
    const marks = [
      markOn('stroke:1', foundation(), rect(0, 0, 4, 4), 'rectangle', true),
      // The same loop, a hundred units down the view's own across-direction.
      markOn('stroke:2', FROM_FRONT, rect(99, -2.5, 2, 2), 'rectangle', true),
    ];
    const read = assignForms({ marks }).find((f) => f.id === 'stroke:2')!;
    expect(read.role).toBe('annotation');
    expect(prismsMeet(marks[1], marks[0]).meet).toBe(false);
  });

  it('the label a claim carries is WHICH view it was drawn from', () => {
    // The fixture's own pinned chip for this pose reads `34° · +24°`.
    const plane = viewPlane({ x: 10.38, y: 8.336, z: 16.096 }, { x: 2.716, y: 2.133, z: 4.792 });
    expect(viewLabelOf(plane)).toMatch(/^3[34]° · \+2[45]°$/);
    expect(viewLabelOf(foundation())).toBe('the foundation');
  });
});

// ---- 3 · the hull ------------------------------------------------------------

/**
 * John's first board, in the shard's own terms (§0): a rough footprint on the
 * foundation, then two towers as ⊓ from two free views — one from the front
 * quarter, one from the side quarter, each standing on the footprint.
 */
function castleSketch() {
  const log = createLog();
  log.sees(blindSpace);
  // The footprint: 4 × 4 on the ground, x ∈ [0, 4], z ∈ [0, 4].
  const plan = log.add(rect(0, 0, 4, 4), foundation(), SCALE, 1000);
  // A tower from the front quarter, 3 u tall, standing on the ground.
  const front = log.add(tower(FROM_FRONT, -1.4, 2.4, 3), FROM_FRONT, SCALE, 2000);
  // …and one from the side quarter, 2 u tall.
  const side = log.add(tower(FROM_SIDE, -1.2, 2.2, 2), FROM_SIDE, SCALE, 3000);
  return { log, plan, front, side };
}

describe('the hull: a footprint and two ⊓ from two views stand a solid', () => {
  it('two claims are a hull, and the engine stands it at tier 1', () => {
    const { log, plan, front } = castleSketch();
    // A footprint alone is not a hull — it still waits for an extent (P2).
    const one = createLog();
    one.sees(blindSpace);
    one.add(rect(0, 0, 4, 4), foundation(), SCALE, 1000);
    expect(one.hullable()).toBeNull();

    const h = log.hullable()!;
    expect(h).toBeTruthy();
    expect(h.claimIds).toContain(plan);
    expect(h.claimIds).toContain(front);
    expect(h.footprintId).toBe(plan);
    expect(h.reasoning).toMatch(/a footprint on the foundation/);
    expect(h.reasoning).toMatch(/closed on the ground/);

    const stood = log.hull(h, 5000)!;
    expect(stood.name).toBe('hull');
    expect(stood.step.op).toBe('hull');
    const solid = log.solids()[0];
    expect(solid.named).toBe('engine');
    // Ink is never covered: every claim is still a stroke on the board.
    expect(log.marks()).toHaveLength(3);
  });

  it('the body is the footprint’s plan, as tall as the tallest claim', () => {
    const { log } = castleSketch();
    log.hull(log.hullable()!, 5000);
    const { geometry, broken } = deriveTree(log.solids()[0].tree, {});
    expect(broken).toBeNull();
    geometry!.computeBoundingBox();
    const b = geometry!.boundingBox!;
    // Inside the footprint the hand drew…
    expect(b.min.x).toBeGreaterThanOrEqual(-0.1);
    expect(b.max.x).toBeLessThanOrEqual(4.1);
    expect(b.min.z).toBeGreaterThanOrEqual(-0.1);
    expect(b.max.z).toBeLessThanOrEqual(4.1);
    // …standing on the ground, as tall as the shorter tower says it may be
    // (the two claims are intersected, so the shorter one is the roof).
    expect(Math.abs(b.min.y)).toBeLessThan(0.2);
    expect(b.max.y).toBeGreaterThan(1.5);
    expect(b.max.y).toBeLessThan(2.3);
  });

  it('a third claim goes INTO the hull as a new version, and undo takes it back', () => {
    const { log } = castleSketch();
    const first = log.hull(log.hullable()!, 5000)!;
    expect(first.count).toBe(3);
    const before = log.solidOf(first.id)!.tree.steps[0] as HullStep;

    // A fourth claim, from the front again but narrower: it goes in.
    const narrow = log.add(tower(FROM_FRONT, -0.6, 1.0, 3), FROM_FRONT, SCALE, 6000);
    const grow = log.hullable()!;
    expect(grow.solidId).toBe(first.id);
    expect(grow.add).toEqual([narrow]);
    const grown = log.hull(grow, 7000)!;
    expect(grown.id).toBe(first.id);
    expect(grown.count).toBe(4);

    const after = log.solidOf(first.id)!.tree.steps[0] as HullStep;
    expect(after.id).toBe(before.id); // one step, a new version of it
    expect(after.claims).toHaveLength(4);
    expect(log.solids()).toHaveLength(1);

    // The hull narrowed: the new claim is 1 u wide where the old was 2.4.
    const wide = deriveTree({ mm: 'op', version: 1, steps: [before] }, {});
    const tight = deriveTree(log.solidOf(first.id)!.tree, {});
    wide.geometry!.computeBoundingBox();
    tight.geometry!.computeBoundingBox();
    expect(tight.geometry!.boundingBox!.max.x - tight.geometry!.boundingBox!.min.x)
      .toBeLessThan(wide.geometry!.boundingBox!.max.x - wide.geometry!.boundingBox!.min.x);

    // One undo is one act: the claim's contribution goes, the hull stays.
    log.undo();
    const back = log.solidOf(first.id)!.tree.steps[0] as HullStep;
    expect(back.claims).toHaveLength(3);
    expect(log.marks()).toHaveLength(4); // the ink stays: it always does
  });

  it('undo of the hull itself leaves every claim where it was', () => {
    const { log } = castleSketch();
    log.hull(log.hullable()!, 5000);
    expect(log.solids()).toHaveLength(1);
    log.undo();
    expect(log.solids()).toHaveLength(0);
    expect(log.marks()).toHaveLength(3);
  });

  it('a claim’s prism runs along its OWN plane’s normal — an oblique view, an oblique prism', () => {
    const { log } = castleSketch();
    log.hull(log.hullable()!, 5000);
    const step = log.solidOf(log.solids()[0].id)!.tree.steps[0] as HullStep;
    const oblique = step.claims.find((c) => c.plane.name === 'view')!;
    const n = normalize(oblique.plane.normal);
    // Neither axis-aligned nor vertical: it is the direction the hand looked.
    expect(Math.abs(n.x)).toBeGreaterThan(0.05);
    expect(Math.abs(n.z)).toBeGreaterThan(0.05);
    expect(Math.abs(n.y)).toBeLessThan(0.8);
    // And the claim really does carry the plane it was drawn on: a point of
    // its ink, put back in the world, lies in that plane.
    const world = toWorld(
      { ...oblique.plane, source: 'view', why: 'the claim’s own plane' } as Plane,
      oblique.profile.points[0]
    );
    const off = Math.abs(
      (world.x - oblique.plane.origin.x) * n.x +
        (world.y - oblique.plane.origin.y) * n.y +
        (world.z - oblique.plane.origin.z) * n.z
    );
    expect(off).toBeLessThan(1e-6);
  });

  it('the hull round-trips through its code rep and through a whole replay', () => {
    const { log } = castleSketch();
    log.hull(log.hullable()!, 5000);
    const tree = log.solids()[0].tree;
    const fresh = createLog();
    fresh.sees(blindSpace);
    fresh.session.load(log.session.getEvents());
    expect(fresh.solids()[0].tree).toEqual(tree);
  });

  it('three axis profiles are a MASSING, not a hull — one drawing, one door', () => {
    const log = createLog();
    log.sees(blindSpace);
    log.add(rect(-2, -1.5, 4, 3), foundation(), SCALE, 1000);
    log.add(rect(-2, -3, 4, 3), height(), SCALE, 2000);
    log.add(rect(-1.5, -3, 3, 3), width(), SCALE, 3000);
    expect(log.massable()).toBeTruthy();
    expect(log.hullable()).toBeNull();
  });

  it('a loop whose prism meets nothing is never a claim, and the rung says why', () => {
    const { log } = castleSketch();
    // A loop from the front view, far off along the view's own across-axis.
    const stray = log.add(rect(99, -2.5, 2, 2), FROM_FRONT, SCALE, 4000);
    const h = log.hullable()!;
    expect(h.claimIds).toHaveLength(3);
    expect(h.claimIds).not.toContain(stray);
    const read = log.formOf(stray)!;
    expect(read.role).toBe('annotation');
    expect(read.reasoning).toMatch(/would be a claim, but its prism misses/);
  });
});

// ---- 4 · the claims, as pure arithmetic --------------------------------------

describe('two prisms meet, or they do not — one axis decides it', () => {
  it('prisms from two different views that cross share a volume', () => {
    const a = markOn('a', FROM_FRONT, rect(-1, -2, 2, 2), 'rectangle', true);
    const b = markOn('b', FROM_SIDE, rect(-1, -2, 2, 2), 'rectangle', true);
    expect(prismsMeet(a, b).meet).toBe(true);
    expect(prismsMeet(a, b).why).toMatch(/they share [\d.]+ u/);
  });

  it('two views from the SAME direction are one view, and not a claim about each other', () => {
    const a = markOn('a', FROM_FRONT, rect(-1, -2, 2, 2), 'rectangle', true);
    const b = markOn('b', FROM_FRONT, rect(-1, -2, 2, 2), 'rectangle', true);
    const m = prismsMeet(a, b);
    expect(m.meet).toBe(false);
    expect(m.why).toMatch(/the same direction/);
  });

  it('hullableFrom needs two claims, and something the massing cannot take', () => {
    const marks = [markOn('stroke:1', foundation(), rect(0, 0, 4, 4), 'rectangle', true)];
    expect(hullableFrom(assignForms({ marks }), marks)).toBeNull();
  });
});
