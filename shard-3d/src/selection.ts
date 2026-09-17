// ===== selection =====
// "Selection by default: the part the last stroke touched, or the last solid
// made, stands selected with its handles — no loop required" (§7).
//
// The shard's selection is one thing at a time: a solid, or a mark. It is
// RUNTIME state, not log state — what the hand is looking at is not something
// a replay should decide — and it is derived from the last act rather than
// waited for: a solid that has just been made is selected, and a stroke
// selects whatever it landed on.
//
// The outline is the teal keyword colour, and nothing else in the space uses
// it (brand: colour is signal, not decoration).

import * as THREE from 'three';
import { Line2 } from 'three/examples/jsm/lines/Line2.js';
import { LineGeometry } from 'three/examples/jsm/lines/LineGeometry.js';
import { LineMaterial } from 'three/examples/jsm/lines/LineMaterial.js';
import type { Point } from 'metamedium-core';
import type { Space } from './scene';
import type { Colours } from './theme';
import type { Solids } from './solid';
import { add, mul, normalize, toWorld, type Plane } from './plane';

export type Sel = { kind: 'solid'; id: string } | { kind: 'mark'; id: string };

export interface Selection {
  group: THREE.Group;
  current(): Sel | null;
  set(sel: Sel | null): void;
  clear(): void;
  /** Redraw the outline from what stands selected now. */
  sync(): void;
  paint(c: Colours): void;
  onChange(fn: (sel: Sel | null) => void): void;
  /**
   * P4: a diff region, outlined where it lies — on the profile's own plane, in
   * the same teal that says *selected*, because a region is what the board is
   * pointing at while the chip is hovered. Null takes it away.
   */
  showRegion(at: { plane: Plane; outline: Point[] } | null): void;
  /**
   * G2: a PART of a hull, caged where it stands — the same teal, because the
   * board is pointing at what a sentence in the panel is a claim about. Null
   * takes it away. A second cage rather than the selection's own: a part is
   * shown *inside* whatever stands selected, and moving the one cage would say
   * the selection had changed when it had not.
   */
  showPart(bounds: THREE.Box3 | null): void;
}

export function createSelection(space: Space, solids: Solids, colours: Colours): Selection {
  let cols = colours;
  let sel: Sel | null = null;
  const listeners: ((sel: Sel | null) => void)[] = [];

  const group = new THREE.Group();
  group.name = 'selection';
  space.scene.add(group);

  // Depth test off: a cage that is half swallowed by the thing it is around
  // reads as a rendering fault rather than as a selection.
  const material = new THREE.LineBasicMaterial({
    color: new THREE.Color(cols.teal),
    transparent: true,
    opacity: 0.95,
    depthTest: false,
  });
  // A box the selected solid fills: the plainest honest outline, and it says
  // the same thing from every angle — which a silhouette would not.
  const box = new THREE.Box3Helper(new THREE.Box3(), new THREE.Color(cols.teal));
  (box.material as THREE.Material).dispose();
  box.material = material;
  box.renderOrder = 20;
  box.visible = false;
  group.add(box);

  // ---- a part of a hull, caged where it stands (G2) ------------------------
  // Dashed rather than solid, so the two cages never read as one thing: the
  // selection is what the acts apply to, a part is what a sentence is about.
  const partMaterial = new THREE.LineDashedMaterial({
    color: new THREE.Color(cols.teal),
    transparent: true,
    opacity: 0.95,
    depthTest: false,
    dashSize: 0.12,
    gapSize: 0.08,
  });
  const partBox = new THREE.Box3Helper(new THREE.Box3(), new THREE.Color(cols.teal));
  (partBox.material as THREE.Material).dispose();
  partBox.material = partMaterial;
  partBox.renderOrder = 22;
  partBox.visible = false;
  group.add(partBox);

  function showPart(bounds: THREE.Box3 | null) {
    if (!bounds || bounds.isEmpty()) {
      partBox.visible = false;
      space.render();
      return;
    }
    const size = bounds.getSize(new THREE.Vector3());
    partBox.box.copy(bounds.clone().expandByScalar(Math.max(size.x, size.y, size.z) * 0.02));
    partBox.visible = true;
    // A dashed line needs its distances computed, and a Box3Helper rebuilds its
    // own geometry when the box moves — so this cannot be done once at set-up.
    (partBox as unknown as THREE.Line).computeLineDistances();
    space.render();
  }

  // ---- the diff region, outlined on its own plane (P4) ---------------------
  // Depth test off, like the cage: a region that is half inside the body it is
  // about — which a *missing* region is, by definition, along its edge — would
  // otherwise be drawn as a broken line and read as a fault.
  const regionMaterial = new LineMaterial({
    color: new THREE.Color(cols.teal).getHex(),
    linewidth: 3,
    transparent: true,
    opacity: 1,
    depthTest: false,
  });
  const region = new Line2(new LineGeometry(), regionMaterial);
  region.renderOrder = 21;
  region.visible = false;
  group.add(region);

  /** Just off the plane, so the outline never fights the ink lying on it. */
  const REGION_LIFT = 0.006;

  function showRegion(at: { plane: Plane; outline: Point[] } | null) {
    if (!at || at.outline.length < 2) {
      region.visible = false;
      space.render();
      return;
    }
    const lift = mul(normalize(at.plane.normal), REGION_LIFT);
    const loop = [...at.outline, at.outline[0]];
    const flat: number[] = [];
    for (const p of loop) {
      const w = add(toWorld(at.plane, p), lift);
      flat.push(w.x, w.y, w.z);
    }
    (region.geometry as LineGeometry).setPositions(flat);
    region.computeLineDistances();
    region.geometry.computeBoundingSphere();
    const size = new THREE.Vector2();
    space.renderer.getSize(size);
    regionMaterial.resolution.set(size.x, size.y);
    region.visible = true;
    space.render();
  }

  function sync() {
    box.visible = false;
    if (sel?.kind === 'solid') {
      const b = solids.boundsOf(sel.id);
      if (b && !b.isEmpty()) {
        // Stand the cage off the solid: exactly on its edges it would be
        // indistinguishable from the edges the solid draws for itself.
        const size = b.getSize(new THREE.Vector3());
        box.box.copy(b.expandByScalar(Math.max(size.x, size.y, size.z) * 0.035));
        box.visible = true;
      }
    }
    space.render();
  }

  function set(next: Sel | null) {
    const same = (!next && !sel) || (next && sel && next.kind === sel.kind && next.id === sel.id);
    sel = next;
    sync();
    if (!same) listeners.forEach((fn) => fn(sel));
  }

  return {
    group,
    current: () => sel,
    set,
    clear: () => set(null),
    sync,
    paint(c) {
      cols = c;
      material.color.set(cols.teal);
      regionMaterial.color.set(cols.teal);
      partMaterial.color.set(cols.teal);
      sync();
    },
    onChange: (fn) => void listeners.push(fn),
    showRegion,
    showPart,
  };
}
