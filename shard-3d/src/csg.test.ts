// The CSG seam (SHARD-3D-PLAN §2.4, §10).
//
// `three-bvh-csg` operates on geometry and never touches a renderer, so the
// seam tests headlessly like every other rung — which is worth knowing, because
// it means a cut is checkable without a browser.
//
// The failure path is tested as hard as the success one. §10's risk is that
// booleans are fragile on messy input, and the whole point of the seam is that
// a fragile library cannot take the board down: every result is `ok` or an
// error the panel can say.

import { describe, it, expect } from 'vitest';
import * as THREE from 'three';
import { CSG_LIBRARY, subtract, union } from './csg';

const volumeish = (g: THREE.BufferGeometry) => {
  g.computeBoundingBox();
  const s = g.boundingBox!.getSize(new THREE.Vector3());
  return s.x * s.y * s.z;
};

describe('the seam: subtract', () => {
  it('takes a cylinder out of a box and leaves a box with a hole in it', () => {
    const box = new THREE.BoxGeometry(2, 2, 2);
    const drill = new THREE.CylinderGeometry(0.4, 0.4, 4, 24);
    const r = subtract(box, drill);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    // The outside is unchanged — a cut does not shrink the thing it is in…
    expect(volumeish(r.geometry)).toBeCloseTo(8, 1);
    // …and there is more surface than a plain box has: the wall of the hole.
    const plain = box.toNonIndexed().getAttribute('position').count;
    expect(r.geometry.getAttribute('position').count).toBeGreaterThan(plain);
  });

  it('never returns a geometry with no normals — the shard lights what it renders', () => {
    const r = subtract(new THREE.BoxGeometry(2, 2, 2), new THREE.BoxGeometry(1, 4, 1));
    expect(r.ok).toBe(true);
    if (r.ok) expect(r.geometry.getAttribute('normal')).toBeTruthy();
  });
});

describe('the seam: union', () => {
  it('welds two overlapping boxes into one body', () => {
    const r = union(new THREE.BoxGeometry(2, 2, 2), new THREE.BoxGeometry(1, 4, 1));
    expect(r.ok).toBe(true);
    if (r.ok) {
      // Taller than either alone: the union reaches the top of the tall one.
      r.geometry.computeBoundingBox();
      expect(r.geometry.boundingBox!.getSize(new THREE.Vector3()).y).toBeCloseTo(4, 1);
    }
  });
});

describe('the seam never throws — a failure is a reading that did not come off', () => {
  it('an empty geometry comes back as an error, not an exception', () => {
    const r = subtract(new THREE.BoxGeometry(1, 1, 1), new THREE.BufferGeometry());
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error).toContain(CSG_LIBRARY);
      expect(r.error).toMatch(/no positions/);
    }
  });

  it('a boolean that meets nothing at all is reported rather than rendered as a vanished solid', () => {
    // Two boxes a mile apart: a subtraction that removes nothing is fine, but
    // an EMPTY result is a failure the panel must be able to say.
    const a = new THREE.BoxGeometry(1, 1, 1);
    const b = new THREE.BoxGeometry(4, 4, 4); // wholly swallows a
    const r = subtract(a, b);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/empty|not meet/);
  });

  it('attributes the library by name, so the panel can say who complained', () => {
    const r = union(new THREE.BufferGeometry(), new THREE.BoxGeometry(1, 1, 1));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.startsWith(CSG_LIBRARY)).toBe(true);
  });
});
