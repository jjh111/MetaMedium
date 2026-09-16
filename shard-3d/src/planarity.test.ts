// The plane scorer, headless: no three.js, no WebGL, no camera object — a ray
// caster as a function, a box's top face as four world corners, and a screen
// path. That is everything the read needs, which is why `planarity.ts` is the
// first thing §11 names for landing back in core.

import { describe, it, expect } from 'vitest';
import type { Point } from 'metamedium-core';
import {
  ANCHOR_BASE,
  ANCHOR_MISS,
  CONTINUITY_BASE,
  FACING_FLOOR,
  FACING_TAKES,
  candidateNote,
  candidatesFor,
  chipTextFor,
  downScreen,
  nameFace,
  pickAtPenDown,
  projectOnto,
  rank,
  samePlane,
  sizeOfPoints,
  type FaceRef,
  type PenScope,
  type PlaneCandidate,
} from './planarity';
import {
  add,
  cross,
  dot,
  foundation,
  height,
  mul,
  normalize,
  sub,
  v3,
  type RayCaster,
  type Vec3,
} from './plane';

// ---- a camera, as the two functions the shard ever needs from one ----------

function camera(pos: Vec3, target: Vec3, focal = 800) {
  const forward = normalize(sub(target, pos));
  const right = normalize(cross(forward, v3(0, 1, 0)));
  const up = normalize(cross(right, forward));
  const ray: RayCaster = (s) => ({
    origin: pos,
    direction: normalize(add(add(mul(forward, focal), mul(right, s.x)), mul(up, -s.y))),
  });
  const project = (w: Vec3): Point => {
    const d = sub(w, pos);
    const z = dot(d, forward);
    return { x: (focal * dot(d, right)) / z, y: (-focal * dot(d, up)) / z };
  };
  return { ray, project, look: forward, up };
}

/** Above and in front of the origin, looking at it — a three-quarter view. */
const overhead = camera(v3(0, 10, 14), v3(0, 0, 0));

/**
 * Nearly over the origin: a horizontal plane is 0.96 face-on, well inside the
 * gate, so a face under the pen is still the face. This is the steeper half of
 * the shard's own range — `DEFAULT_PHI` puts the free camera at 0.84.
 */
const steep = camera(v3(0, 18, 5), v3(0, 0, 0));

/** How face-on a horizontal plane is from a camera — the number the gate reads. */
const facingOf = (cam: ReturnType<typeof camera>, normal: Vec3) =>
  Math.abs(dot(normalize(normal), normalize(cam.look)));

/** The aspect of a path's own box — what a similarity transform must preserve. */
function aspectOf(points: Point[]): number {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of points) {
    minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x);
    minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y);
  }
  return (maxX - minX) / (maxY - minY);
}

/** A circle drawn ON SCREEN — the stroke the whole gate is about. */
function screenCircle(cx: number, cy: number, r: number, n = 64): Point[] {
  return Array.from({ length: n + 1 }, (_, i) => {
    const t = (i / n) * Math.PI * 2;
    return { x: cx + Math.cos(t) * r, y: cy + Math.sin(t) * r };
  });
}

/** A box two units tall on the ground, four across: its top face at y = 2. */
const TOP = 2;
const topCorners = [v3(-2, TOP, -2), v3(2, TOP, -2), v3(2, TOP, 2), v3(-2, TOP, 2)];
const topFace: FaceRef = { solidId: 'artifact:7', at: v3(0, TOP, 0), normal: v3(0, 1, 0), corners: topCorners };

function worldLoop(corners: Vec3[], per = 22): Vec3[] {
  const out: Vec3[] = [];
  for (let i = 0; i < corners.length; i++) {
    const a = corners[i];
    const b = corners[(i + 1) % corners.length];
    for (let s = 0; s < per; s++) {
      const t = s / per;
      out.push(v3(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t, a.z + (b.z - a.z) * t));
    }
  }
  out.push(corners[0]);
  return out;
}

/** A rectangle drawn ON SCREEN — what a hand beside the box actually leaves. */
function screenRect(x: number, y: number, w: number, h: number, per = 22): Point[] {
  const c = [
    { x, y },
    { x: x + w, y },
    { x: x + w, y: y + h },
    { x, y: y + h },
    { x, y },
  ];
  const out: Point[] = [];
  for (let i = 0; i < c.length - 1; i++)
    for (let s = 0; s < per; s++) {
      const t = s / per;
      out.push({ x: c[i].x + (c[i + 1].x - c[i].x) * t, y: c[i].y + (c[i + 1].y - c[i].y) * t });
    }
  out.push(c[0]);
  return out;
}

function scopeOf(cam: ReturnType<typeof camera>, o: Partial<PenScope> = {}): PenScope {
  return {
    chosen: null,
    pen: { x: 0, y: 0 },
    ray: cam.ray,
    look: cam.look,
    cameraUp: cam.up,
    faces: [],
    previous: null,
    viewAnchor: v3(0, 0, 0),
    viewAnchorWhy: 'the gizmo’s own origin',
    at: 100_000,
    recentWindowMs: 20_000,
    ...o,
  };
}

function ranked(cam: ReturnType<typeof camera>, scope: PenScope, screen: Point[]): PlaneCandidate[] {
  return rank({
    candidates: candidatesFor(scope),
    screen,
    ray: cam.ray,
    look: cam.look,
    previous: scope.previous,
    at: scope.at,
    recentWindowMs: scope.recentWindowMs,
  });
}

const labels = (cs: PlaneCandidate[]) => cs.map((c) => c.label);

// ===========================================================================

describe('the candidates', () => {
  it('offers the face under the pen, the three world planes and the view', () => {
    const scope = scopeOf(overhead, { faces: [topFace], pen: overhead.project(v3(0, TOP, 0)) });
    const cs = candidatesFor(scope);
    expect(labels(cs)).toEqual(['top of artifact:7', 'foundation', 'height', 'width', 'view']);
    expect(cs[0].plane.source).toBe('face');
    expect(cs[4].plane.source).toBe('view');
  });

  it('names a face from its normal against the world’s own axes', () => {
    expect(nameFace(v3(0, 1, 0), 'artifact:7')).toBe('top of artifact:7');
    expect(nameFace(v3(0, 0, 1), 'artifact:3')).toBe('front of artifact:3');
    expect(nameFace(v3(-1, 0, 0), 'artifact:3')).toBe('left side of artifact:3');
    // A face square to nothing says so rather than being mislabelled.
    expect(nameFace(v3(0.6, 0.6, 0.5), 'artifact:9')).toMatch(/-ish\) of artifact:9/);
  });

  it('offers the previous plane ONLY while it is recent, and never twice', () => {
    const prev = { plane: height(), at: 100_000 - 500, points: [{ x: 0, y: 0 }, { x: 1, y: 1 }], size: 1.4 };
    const recent = candidatesFor(scopeOf(overhead, { previous: prev }));
    expect(labels(recent)).toContain('previous · height');
    // …and the world `height` candidate is the same plane, so it is offered once.
    expect(labels(recent).filter((l) => l === 'height')).toHaveLength(0);

    const stale = candidatesFor(
      scopeOf(overhead, { previous: { ...prev, at: 100_000 - 60_000 } })
    );
    expect(labels(stale)).not.toContain('previous · height');
    expect(labels(stale)).toContain('height');
  });

  it('picks a face under the pen at pen-down, before any stroke exists', () => {
    // From a camera that is looking AT the face — inside the gate. Seen from
    // further round, the same face does not take the stroke; that is the gate's
    // own test below.
    const scope = scopeOf(steep, { faces: [topFace], pen: steep.project(v3(0, TOP, 0)) });
    expect(facingOf(steep, topFace.normal)).toBeGreaterThan(FACING_TAKES);
    expect(pickAtPenDown(scope, candidatesFor(scope)).plane.source).toBe('face');
  });

  it('picks the previous plane when the pen comes down near the stroke a moment ago', () => {
    // A stroke on the height plane around its origin, and the pen coming down
    // on the same spot: near, and recent, so the hand is still drawing there.
    const prev = {
      plane: height(),
      at: 100_000 - 400,
      points: [{ x: -1, y: -1 }, { x: 1, y: 1 }],
      size: 2.8,
    };
    const scope = scopeOf(overhead, { previous: prev, pen: overhead.project(v3(0, 0, 0)) });
    expect(pickAtPenDown(scope, candidatesFor(scope)).plane.source).toBe('previous');
  });

  it('picks the view plane when nothing is under the pen — the table’s default', () => {
    const scope = scopeOf(overhead, { pen: { x: 300, y: 0 } });
    expect(pickAtPenDown(scope, candidatesFor(scope)).plane.source).toBe('view');
  });
});

describe('the re-rank at pen-up', () => {
  it('reads a rectangle over a box’s top as `face`, over `view`, and says why', () => {
    // Drawn from a camera looking at the face, so the face is takeable and the
    // evidence decides exactly as it always did.
    const path = worldLoop([v3(-1, TOP, -1), v3(1, TOP, -1), v3(1, TOP, 1), v3(-1, TOP, 1)]);
    const screen = path.map(steep.project);
    const scope = scopeOf(steep, {
      faces: [topFace],
      pen: steep.project(v3(0, TOP, 0)),
      viewAnchor: v3(0, TOP, 0),
    });
    const out = ranked(steep, scope, screen);

    expect(out[0].label).toBe('top of artifact:7');
    expect(out[0].plane.source).toBe('face');
    expect(out[0].gated).toBe(false);
    // The reasoning names the shape rung's own number — the strongest term —
    // and the anchoring that beat every plane the ink does not lie on.
    expect(out[0].reasoning).toMatch(/reads rectangle 0\.\d\d there/);
    expect(out[0].reasoning).toMatch(/inside top of artifact:7/);
    // The view plane is still scored, still says why, and is beaten on the
    // evidence — not held off by the gate, which this face passes.
    const view = out.find((c) => c.label === 'view')!;
    expect(out[0].confidence).toBeGreaterThan(view.confidence);
    expect(out[0].terms!.anchor).toBeGreaterThan(view.terms!.anchor);
    expect(view.reasoning).toMatch(/shape conserved/);
    // …and the runner-up is worth a chip.
    expect(chipTextFor(out)).toMatch(/^top of artifact:7 0\.\d\d · \S.* 0\.\d\d$/);
  });

  it('reads a rectangle drawn beside the box as `view`', () => {
    // The same hand, the same camera, but the shape is drawn ON SCREEN beside
    // the box rather than over it: no face is under the pen, and the plane the
    // ink reads cleanest on is the one facing the eye.
    const screen = screenRect(240, -70, 180, 140);
    const out = ranked(overhead, scopeOf(overhead, { pen: { x: 330, y: 0 } }), screen);
    expect(out[0].label).toBe('view');
    expect(out[0].plane.source).toBe('view');
    expect(out[0].terms!.shape).toBeGreaterThan(out[1].terms!.shape);
  });

  it('keeps an edge-on candidate, marks it too oblique, and never lets it win', () => {
    // A camera almost level with the ground: the foundation is 7% face-on, a
    // sliver, and a plane seen that way distorts the fingerprint rather than
    // reading it (§10's last risk). It is held and said out loud, not dropped
    // — and the stroke is drawn below the horizon, so the ink really could
    // lie there and the candidate is refused on the READING, not on a miss.
    const level = camera(v3(0, 1, 14), v3(0, 0, 0));
    const out = ranked(level, scopeOf(level, { pen: { x: 0, y: 110 } }), screenRect(-90, 40, 180, 140));
    const ground = out.find((c) => c.label === 'foundation')!;
    expect(ground).toBeTruthy();
    expect(ground.terms!.facingRaw).toBeLessThan(FACING_FLOOR);
    expect(ground.oblique).toBe(true);
    expect(ground.reasoning).toMatch(/too oblique to read/);
    // Kept — but below every readable candidate, whatever its number.
    expect(out[0].oblique).toBe(false);
    expect(out.indexOf(ground)).toBe(out.length - 1);
  });

  it('lifts the previous plane by continuity when the last stroke was a moment ago on it', () => {
    // The same screen path, scored twice: once with the height plane as a bare
    // world candidate, once as the plane the hand was drawing on a moment ago
    // AND lying right where this stroke lies. Both terms that move are the
    // ones that should: continuity, and the anchor.
    const screen = screenRect(-90, -70, 180, 140);
    const cold = ranked(overhead, scopeOf(overhead), screen);
    const here = projectOnto(height(), screen, overhead.ray)!;
    const warm = ranked(
      overhead,
      scopeOf(overhead, {
        previous: { plane: height(), at: 100_000 - 400, points: here, size: 5.6 },
      }),
      screen
    );
    const before = cold.find((c) => c.label === 'height')!;
    const after = warm.find((c) => c.label === 'previous · height')!;
    expect(before.terms!.continuity).toBeCloseTo(CONTINUITY_BASE, 6);
    expect(after.terms!.continuity).toBe(1);
    expect(after.confidence).toBeGreaterThan(before.confidence);
    expect(after.reasoning).toMatch(/the stroke a moment ago lay on it/);
    // Continuity alone is worth 1/CONTINUITY_BASE; the rest is the anchor.
    expect(after.terms!.shape).toBeCloseTo(before.terms!.shape, 6);
  });

  it('scores a plane DOWN when the ink is nowhere near the geometry that offered it', () => {
    // A face's plane is infinite and the face is not. A stroke drawn in clear
    // air beside a box used to read as lying on the box's top, purely because
    // the stroke before it had been drawn there — continuity carrying a plane
    // the ink is two of its own sizes off. Geometry in the plane that the ink
    // misses is evidence AGAINST, not absence of evidence.
    const screen = screenRect(240, -70, 180, 140);
    const far = ranked(
      overhead,
      scopeOf(overhead, {
        previous: { plane: { ...foundation(), origin: v3(0, TOP, 0) }, at: 100_000 - 400, points: [{ x: -1, y: -1 }, { x: 1, y: 1 }], size: 2.8 },
        pen: { x: 330, y: 0 },
      }),
      screen
    );
    const prev = far.find((c) => c.plane.source === 'previous')!;
    expect(prev.terms!.anchor).toBeGreaterThanOrEqual(ANCHOR_MISS);
    expect(prev.terms!.anchor).toBeLessThan(ANCHOR_BASE);
    expect(prev.reasoning).toMatch(/too far off it for that plane to be where the ink is/);
    // …so the stroke drawn beside the box reads `view`, not "still on the box".
    expect(far[0].label).toBe('view');
  });

  it('withholds the chip when the runner-up is not worth arguing about', () => {
    expect(chipTextFor([])).toBeNull();
    const one = ranked(overhead, scopeOf(overhead), screenRect(-90, -70, 180, 140));
    expect(chipTextFor([one[0]])).toBeNull();
    expect(chipTextFor([one[0], { ...one[1], confidence: 0.01 }])).toBeNull();
    expect(chipTextFor([one[0], { ...one[1], oblique: true }])).toBeNull();
  });
});

// ===========================================================================
// THE GATE (16 September 2026). John, drawing with nothing chosen: *"drawings
// off the main axis are on the camera plane mapped rather than the way it is
// stretching the shapes out now; the shapes drawn off main axes should stay
// conserved size at the angles that make sense."*
//
// With nothing chosen the view plane is the default, and a candidate has to
// make sense AT ITS ANGLE before the evidence is even compared: below
// FACING_TAKES it is kept, said out loud, offered by the chip, and cannot
// outrank the view. Above it nothing changes.

describe('the gate: off-axis ink is conserved', () => {
  /** Looking down at forty-five degrees: a horizontal plane is 0.71 face-on. */
  const three_quarter = camera(v3(0, 10, 10), v3(0, 0, 0));
  /** Ten degrees off face-on to the ground: 0.985, well inside the gate. */
  const nearlyOver = camera(v3(0, 20, 3.5), v3(0, 0, 0));

  it('keeps a circle drawn off-axis on the view plane, and says the ground is too oblique to take it', () => {
    expect(facingOf(three_quarter, v3(0, 1, 0))).toBeCloseTo(0.707, 2);
    const screen = screenCircle(260, -20, 90);
    const out = ranked(three_quarter, scopeOf(three_quarter, { pen: { x: 260, y: -20 } }), screen);

    expect(out[0].plane.source).toBe('view');
    expect(out[0].gated).toBe(false);
    expect(out[0].reasoning).toMatch(/shape conserved/);

    // The ground is held, scored, and said out loud — and it is below the view,
    // whatever it scored. This is the whole defect: at 45° the ground reads the
    // circle well enough to win the old comparison, and casting it there turns
    // the circle into a long ellipse.
    const ground = out.find((c) => c.label === 'foundation')!;
    expect(ground.gated).toBe(true);
    expect(ground.oblique).toBe(false); // kept for a reason, not unreadable
    expect(ground.reasoning).toMatch(/too oblique to take the stroke \(facing 0\.\d\d/);
    expect(ground.reasoning).toMatch(/stretch it by up to ×1\.\d\d/);
    expect(candidateNote(ground)).toMatch(/^ · too oblique to take the stroke/);
    expect(out.indexOf(ground)).toBeGreaterThan(out.indexOf(out[0]));
    // …and the gate is not a score: it holds even where the ground reads BETTER.
    expect(out.filter((c) => c.gated).every((c) => out.indexOf(c) > out.indexOf(out[0]))).toBe(true);
  });

  it('casts the screen path onto the view plane as a similarity — the aspect is conserved within 1%', () => {
    // The view plane is screen-facing by construction, so the cast is a
    // uniform scale: the circle is the circle, at the depth the hand pointed
    // at. The ground, at the same moment, stretches it — measured here so the
    // two numbers stand beside each other.
    const screen = screenCircle(260, -20, 90);
    const scope = scopeOf(three_quarter, { pen: { x: 260, y: -20 } });
    const view = candidatesFor(scope).find((c) => c.plane.source === 'view')!;
    const onView = projectOnto(view.plane, screen, three_quarter.ray)!;
    expect(aspectOf(onView)).toBeCloseTo(aspectOf(screen), 2);
    expect(Math.abs(aspectOf(onView) / aspectOf(screen) - 1)).toBeLessThan(0.01);

    const onGround = projectOnto(foundation(), screen, three_quarter.ray)!;
    expect(Math.abs(aspectOf(onGround) / aspectOf(screen) - 1)).toBeGreaterThan(0.2);
  });

  it('lets a plane ten degrees off face-on take the stroke on the evidence, as before', () => {
    // Above the gate nothing changes: the ground is not held off, and with the
    // stroke before it lying right there it wins on continuity and the anchor,
    // exactly as the formula always said.
    expect(facingOf(nearlyOver, v3(0, 1, 0))).toBeGreaterThan(FACING_TAKES);
    const screen = screenCircle(0, 0, 110);
    const here = projectOnto(foundation(), screen, nearlyOver.ray)!;
    const out = ranked(
      nearlyOver,
      scopeOf(nearlyOver, {
        previous: { plane: foundation(), at: 100_000 - 400, points: here, size: sizeOfPoints(here) },
      }),
      screen
    );
    const ground = out.find((c) => c.label === 'previous · foundation')!;
    expect(ground.gated).toBe(false);
    expect(out[0]).toBe(ground);
    expect(out[0].plane.source).toBe('previous');
  });

  it('will not let continuity lift a gated plane over the view', () => {
    // The same stroke, the same evidence, from forty-five degrees: continuity 1
    // and an anchor of 1 are worth 1.68× and used to carry the day. They do not
    // reach past the gate.
    const screen = screenCircle(0, 0, 110);
    const here = projectOnto(foundation(), screen, three_quarter.ray)!;
    const out = ranked(
      three_quarter,
      scopeOf(three_quarter, {
        previous: { plane: foundation(), at: 100_000 - 400, points: here, size: sizeOfPoints(here) },
      }),
      screen
    );
    const ground = out.find((c) => c.label === 'previous · foundation')!;
    expect(ground.terms!.continuity).toBe(1);
    expect(ground.terms!.anchor).toBeGreaterThan(ANCHOR_BASE);
    expect(ground.gated).toBe(true);
    expect(out[0].plane.source).toBe('view');
    expect(out.indexOf(ground)).toBeGreaterThan(0);
    // Held, not dropped: the hand that meant the ground takes it in one act.
    expect(chipTextFor(out)).toMatch(/^view 0\.\d\d · previous · foundation 0\.\d\d$/);
  });

  it('takes a face under the pen when it is face-on, and not when it is at sixty degrees', () => {
    const path = worldLoop([v3(-1, TOP, -1), v3(1, TOP, -1), v3(1, TOP, 1), v3(-1, TOP, 1)]);

    // Face-on: the face is the plane, at pen-down and at pen-up both.
    const look = scopeOf(steep, {
      faces: [topFace],
      pen: steep.project(v3(0, TOP, 0)),
      viewAnchor: v3(0, TOP, 0),
    });
    expect(pickAtPenDown(look, candidatesFor(look)).plane.source).toBe('face');
    expect(ranked(steep, look, path.map(steep.project))[0].plane.source).toBe('face');

    // Sixty degrees off it — a face you are looking ACROSS, from a corner where
    // no world plane is square to the eye either. The ink still lands where the
    // hand pointed, because the view plane stands at the face's own depth; it
    // simply is not stretched across the face to get there.
    const across = camera(v3(6, 5, 6.5), v3(0, 0, 0));
    expect(facingOf(across, topFace.normal)).toBeCloseTo(0.5, 1);
    const oblique = scopeOf(across, {
      faces: [topFace],
      pen: across.project(v3(0, TOP, 0)),
      viewAnchor: v3(0, TOP, 0),
      viewAnchorWhy: 'at the depth of artifact:7 under the pen',
    });
    const picked = pickAtPenDown(oblique, candidatesFor(oblique));
    expect(picked.plane.source).toBe('view');
    expect(picked.plane.origin.y).toBe(TOP); // the face's own depth, not the ground

    const out = ranked(across, oblique, path.map(across.project));
    expect(out[0].plane.source).toBe('view');
    const face = out.find((c) => c.plane.source === 'face')!;
    expect(face.gated).toBe(true);
    // …and the chip offers it, so a hand that meant the face is one tap away.
    expect(chipTextFor(out)).toMatch(/^view 0\.\d\d · top of artifact:7 0\.\d\d$/);
  });
});

describe('the geometry the read stands on', () => {
  it('runs a plane’s v axis DOWN the screen, whatever the plane', () => {
    // The engine's 2D space has y down; a plane whose v ran the other way
    // would read every drawing upside down, on a read plane as on a chosen one.
    const down = downScreen(v3(0, 1, 0), overhead.up, overhead.look);
    // On a horizontal plane, "down the screen" is toward the camera: +Z.
    expect(down.z).toBeGreaterThan(0.9);
    const wall = downScreen(v3(0, 0, 1), overhead.up, overhead.look);
    expect(wall.y).toBeLessThan(-0.9);
  });

  it('calls two planes the same only when the normals AND the offset agree', () => {
    expect(samePlane(foundation(), { ...foundation(), normal: v3(0, -1, 0) })).toBe(true);
    expect(samePlane(foundation(), { ...foundation(), origin: v3(0, 2, 0) })).toBe(false);
    expect(samePlane(foundation(), height())).toBe(false);
  });

  it('refuses to project a path the camera cannot meet the plane with', () => {
    // A plane exactly parallel to the eye has no point under the pen at all;
    // saying null is what keeps a candidate the camera cannot draw on out of
    // the ranking, rather than scoring infinities.
    const level = camera(v3(0, 0, 14), v3(0, 0, 0));
    const parallel = { ...foundation(), origin: v3(0, 3, 0) };
    expect(projectOnto(parallel, [{ x: 0, y: 0 }, { x: 10, y: 0 }], level.ray)).toBeNull();
  });
});
