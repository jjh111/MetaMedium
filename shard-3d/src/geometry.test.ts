// The mesh a step derives (SHARD-3D-PLAN §2.4, "the mesh is derived by
// replaying the tree in three.js").
//
// three.js builds geometry with no renderer, so the derivation tests headless
// beside the rungs. What is pinned here is the part a screenshot cannot argue
// about: that a box stands where the ink is, the right way up, with both caps
// on it — and that a revolve is a ring about the line that was drawn.

import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import type { Point } from 'metamedium-core';
import { convexHull, deriveTree, geometryFor } from './solid';
import {
  bossStep,
  cutStep,
  extrudeStep,
  nextStepId,
  revolveStep,
  treeOf,
  withStep,
  type LineInput,
  type Profile2D,
  type ProfileInput,
} from './op';
import { foundation, height, v3, type Plane } from './plane';

const square: Point[] = [
  { x: -2, y: -1 },
  { x: 2, y: -1 },
  { x: 2, y: 1 },
  { x: -2, y: 1 },
];

const profile: ProfileInput = {
  id: 'stroke:1',
  plane: foundation(),
  clean: { shape: 'rectangle', points: square, closed: true, reasoning: 'the box the ink fills, squared up' },
};

/** On the height plane +v is down, so this runs from world (−2, 0, 0) up to (−2, 2.4, 0). */
const up: LineInput = { id: 'stroke:2', plane: height(), points: [{ x: -2, y: 0 }, { x: -2, y: -2.4 }] };
const down: LineInput = { id: 'stroke:2', plane: height(), points: [{ x: -2, y: 0 }, { x: -2, y: 2.4 }] };

function placed(step: Parameters<typeof geometryFor>[0]) {
  const g = geometryFor(step);
  expect(g).not.toBeNull();
  const geo = g!.geometry.clone();
  geo.applyMatrix4(g!.matrix);
  geo.computeBoundingBox();
  return geo;
}

/** How many triangles face (roughly) this world direction — a cap test. */
function facing(geo: THREE.BufferGeometry, dir: THREE.Vector3): number {
  const pos = geo.getAttribute('position');
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  const n = new THREE.Vector3();
  let count = 0;
  const index = geo.index;
  const tris = index ? index.count / 3 : pos.count / 3;
  for (let t = 0; t < tris; t++) {
    const i0 = index ? index.getX(t * 3) : t * 3;
    const i1 = index ? index.getX(t * 3 + 1) : t * 3 + 1;
    const i2 = index ? index.getX(t * 3 + 2) : t * 3 + 2;
    a.fromBufferAttribute(pos, i0);
    b.fromBufferAttribute(pos, i1);
    c.fromBufferAttribute(pos, i2);
    n.crossVectors(b.clone().sub(a), c.clone().sub(a));
    if (n.lengthSq() < 1e-12) continue;
    n.normalize();
    if (Math.abs(n.dot(dir)) > 0.95) count++;
  }
  return count;
}

describe('an extrude stands where the ink is', () => {
  it('grows UP from the plane when the extent went up, over the ink\'s own footprint', () => {
    const geo = placed(extrudeStep(profile, up));
    const b = geo.boundingBox!;
    // The foundation is XZ: the profile's (u, v) are world (x, z).
    expect(b.min.x).toBeCloseTo(-2, 5);
    expect(b.max.x).toBeCloseTo(2, 5);
    expect(b.min.z).toBeCloseTo(-1, 5);
    expect(b.max.z).toBeCloseTo(1, 5);
    // …and it stands ON the plane, not through it.
    expect(b.min.y).toBeCloseTo(0, 5);
    expect(b.max.y).toBeCloseTo(2.4, 5);
  });

  it('hangs below it when the extent went down — the depth\'s sign is the drawing\'s', () => {
    const b = placed(extrudeStep(profile, down)).boundingBox!;
    expect(b.min.y).toBeCloseTo(-2.4, 5);
    expect(b.max.y).toBeCloseTo(0, 5);
  });

  it('is a CLOSED box: it has a top and a bottom, not just walls', () => {
    const geo = placed(extrudeStep(profile, up));
    const caps = facing(geo, new THREE.Vector3(0, 1, 0));
    // Two triangles for the top, two for the bottom, at the very least.
    expect(caps).toBeGreaterThanOrEqual(4);
    const walls = facing(geo, new THREE.Vector3(1, 0, 0)) + facing(geo, new THREE.Vector3(0, 0, 1));
    expect(walls).toBeGreaterThanOrEqual(8);
  });

  it('a step no package has filled yet derives no geometry, and says nothing', () => {
    // `sweep` is P7's; `cut` and `boss` were this row until P3 filled them.
    expect(
      geometryFor({ id: 's', op: 'sweep', from: [], reasoning: 'P7' })
    ).toBeNull();
  });
});

describe('a revolve turns about the line that was drawn', () => {
  const disc: ProfileInput = {
    id: 'p',
    plane: height(),
    clean: {
      shape: 'circle',
      closed: true,
      reasoning: 'a circle of radius 0.8 on the ink\'s centre',
      points: Array.from({ length: 32 }, (_, i) => {
        const t = (i / 32) * Math.PI * 2;
        return { x: 2 + Math.cos(t) * 0.8, y: -2 + Math.sin(t) * 0.8 };
      }),
    },
  };
  const axis: LineInput = { id: 'a', plane: height(), points: [{ x: 4, y: -0.4 }, { x: 4, y: -3.6 }] };

  it('is a ring around the axis: 1.2 to 2.8 units out, and never touching it', () => {
    const geo = placed(revolveStep(disc, axis));
    const b = geo.boundingBox!;
    // The axis stands at world x = 4, z = 0, running up Y.
    expect(b.max.x).toBeCloseTo(4 + 2.8, 2);
    expect(b.min.x).toBeCloseTo(4 - 2.8, 2);
    expect(b.max.z).toBeCloseTo(2.8, 2);
    // It spans the circle's own height about the axis's foot, not more.
    expect(b.max.y - b.min.y).toBeCloseTo(1.6, 2);
  });
});

// ===== P3: the nested derivation, and the hull =============================

/** The top face of the box `up` makes: y = 2.4, normal +Y. */
const topFace: Plane = {
  origin: v3(0, 2.4, 0),
  normal: v3(0, 1, 0),
  up: v3(0, 0, 1),
  source: 'face',
  name: 'top of artifact:7',
  why: 'the pen came down on it',
};

/** A circle of radius 0.5 at the box's centre, in the face's own (u, v). */
const holeAt = (cx: number, cy: number, r = 0.5): Profile2D => ({
  shape: 'circle',
  closed: true,
  reasoning: `a circle of radius ${r} on the ink's centre`,
  points: Array.from({ length: 32 }, (_, i) => {
    const t = (i / 32) * Math.PI * 2;
    return { x: cx + Math.cos(t) * r, y: cy + Math.sin(t) * r };
  }),
});

const box = () => treeOf(extrudeStep(profile, up));

/** Fire a ray straight down world −Y through (x, z) and return every hit's y. */
function downThrough(geo: THREE.BufferGeometry, x: number, z: number): number[] {
  const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ side: THREE.DoubleSide }));
  mesh.updateMatrixWorld(true);
  const caster = new THREE.Raycaster(new THREE.Vector3(x, 100, z), new THREE.Vector3(0, -1, 0));
  return caster.intersectObject(mesh, false).map((h) => h.point.y);
}

/**
 * The face plane's (u, v) at the box's centre. The plane's origin is (0, 2.4, 0)
 * with u = normalize(n × up) and v = up — so the centre of the box (world x = 0,
 * z = 0) is (0, 0) in the face's own frame.
 */
describe('a cut goes THROUGH — you can look down the hole', () => {
  it('a ray down the hole\'s centre misses the solid entirely', () => {
    const tree = box();
    const cut = cutStep(tree, { id: 'stroke:5', plane: topFace, clean: holeAt(0, 0) }, { span: 2.4 }, nextStepId(tree));
    const { geometry, broken } = deriveTree(withStep(tree, cut));
    expect(broken).toBeNull();
    expect(geometry).toBeTruthy();
    // Down the middle: nothing. The hole is a hole.
    expect(downThrough(geometry!, 0, 0)).toHaveLength(0);
    // Beside it, still inside the box: the top and the bottom, as before.
    const beside = downThrough(geometry!, 1.5, 0);
    expect(beside.length).toBeGreaterThanOrEqual(2);
    expect(Math.max(...beside)).toBeCloseTo(2.4, 1);
  });

  it('a cut with an extent goes only that deep — a pocket, not a hole', () => {
    const tree = box();
    const cut = cutStep(
      tree,
      { id: 'stroke:5', plane: topFace, clean: holeAt(0, 0) },
      { extent: { id: 'stroke:6', length: 0.8 }, span: 2.4 },
      nextStepId(tree)
    );
    const { geometry, broken } = deriveTree(withStep(tree, cut));
    expect(broken).toBeNull();
    const hits = downThrough(geometry!, 0, 0);
    // The floor of the pocket is there — the ray does NOT pass clean through.
    expect(hits.length).toBeGreaterThan(0);
    expect(Math.max(...hits)).toBeLessThan(2.4);
    expect(Math.max(...hits)).toBeCloseTo(2.4 - 0.8, 1);
  });
});

describe('a boss stands proud of the face it was drawn on', () => {
  it('the top of the solid is higher than the face after a boss', () => {
    const tree = box();
    const step = bossStep(tree, { id: 'stroke:5', plane: topFace, clean: holeAt(0, 0) }, {}, nextStepId(tree));
    const { geometry, broken } = deriveTree(withStep(tree, step));
    expect(broken).toBeNull();
    const hits = downThrough(geometry!, 0, 0);
    expect(Math.max(...hits)).toBeGreaterThan(2.4);
    // Beside the boss, the box is still the height it was.
    expect(Math.max(...downThrough(geometry!, 1.7, 0))).toBeCloseTo(2.4, 1);
  });
});

describe('the tree nests, and a row no package has filled does not take the board down', () => {
  it('the derivation answers with the ROOT, not with every step merged', () => {
    const tree = box();
    const cut = cutStep(tree, { id: 'stroke:5', plane: topFace, clean: holeAt(0, 0) }, { span: 2.4 }, nextStepId(tree));
    const full = withStep(tree, cut);
    const derived = deriveTree(full);
    // If the steps were merged rather than nested, the tool prism would still
    // be standing in the hole and the ray would hit it.
    expect(downThrough(derived.geometry!, 0, 0)).toHaveLength(0);
  });

  it('an unbuilt step is reported as broken and the body passes through unchanged', () => {
    const tree = box();
    const sweep = { id: 'step:2', op: 'sweep' as const, on: tree.steps[0].id, from: [], reasoning: 'P7' };
    const { geometry, broken } = deriveTree(withStep(tree, sweep));
    expect(geometry).toBeTruthy();
    expect(broken).toMatch(/sweep is in the tree and has no geometry yet/);
    expect(Math.max(...downThrough(geometry!, 0, 0))).toBeCloseTo(2.4, 1);
  });

  it('a cut whose feature is degenerate leaves the body exactly as it was, and says so', () => {
    const tree = box();
    const bad = cutStep(tree, {
      id: 'stroke:5',
      plane: topFace,
      clean: { shape: 'polygon', closed: true, reasoning: 'two points', points: [{ x: 0, y: 0 }, { x: 0.1, y: 0 }] },
    }, { span: 2.4 }, nextStepId(tree));
    const { geometry, broken } = deriveTree(withStep(tree, bad));
    expect(geometry).toBeTruthy();
    expect(broken).toMatch(/tool has no geometry/);
    expect(Math.max(...downThrough(geometry!, 0, 0))).toBeCloseTo(2.4, 1);
  });
});

describe('the silhouette hull', () => {
  it('takes the outline round a cloud of points and drops what is inside it', () => {
    const pts = [
      { x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }, { x: 0, y: 10 },
      { x: 5, y: 5 }, { x: 3, y: 7 }, { x: 8, y: 2 },
    ];
    const hull = convexHull(pts);
    expect(hull).toHaveLength(4);
    expect(hull).toEqual(expect.arrayContaining([{ x: 0, y: 0 }, { x: 10, y: 10 }]));
    expect(hull).not.toEqual(expect.arrayContaining([{ x: 5, y: 5 }]));
  });

  it('drops points that are not finite — a vertex behind the eye projects to NaN', () => {
    const hull = convexHull([
      { x: 0, y: 0 }, { x: 4, y: 0 }, { x: 4, y: 4 }, { x: NaN, y: 2 }, { x: 1, y: Infinity },
    ]);
    expect(hull.every((p) => Number.isFinite(p.x) && Number.isFinite(p.y))).toBe(true);
    expect(hull).toHaveLength(3);
  });
});
