// ===== gizmo =====
// "The plane is chosen by the hand, read otherwise" (§3). Three axes at the
// world origin, a square tile at each corner where two axes meet — foundation
// (XZ), height (XY), width (YZ) — and a handle on the chosen tile's normal
// that slides the plane along it. Tapping the centre un-chooses.
//
// The tile is the mitigation for §10's first risk: drawing on a scene with a
// mouse is hard, and a chosen plane is the hand saying where, not the engine
// guessing.

import * as THREE from 'three';
import type { Colours } from './theme';
import { NAMED, PLANE_NAMES, slide, type Plane, type PlaneName } from './plane';

const ARM = 3.2; // how far the axes reach
const TILE = 1.5; // the square at each corner
const TILE_AT = 1.1; // where the tile's near corner sits

export interface Gizmo {
  group: THREE.Group;
  chosen: PlaneName | null;
  offset: number;
  /** The chosen plane as it stands, slid; null when nothing is chosen. */
  plane(): Plane | null;
  choose(name: PlaneName | null): void;
  /** Objects a pointer may hit: tiles, the centre, the slide handle. */
  pickables(): THREE.Object3D[];
  /** What a hit object means, or null when it is not the gizmo's. */
  hit(object: THREE.Object3D): { kind: 'tile'; name: PlaneName } | { kind: 'centre' } | { kind: 'handle' } | null;
  setOffset(d: number): void;
  paint(c: Colours): void;
  refresh(): void;
}

/** Each tile lies in its own plane, its near corner out along both axes. */
const TILE_PLACEMENT: Record<PlaneName, { pos: [number, number, number]; rot: [number, number, number] }> = {
  // XZ, lying flat on the ground
  foundation: { pos: [TILE_AT + TILE / 2, 0, TILE_AT + TILE / 2], rot: [-Math.PI / 2, 0, 0] },
  // XY, facing +Z
  height: { pos: [TILE_AT + TILE / 2, TILE_AT + TILE / 2, 0], rot: [0, 0, 0] },
  // YZ, facing +X
  width: { pos: [0, TILE_AT + TILE / 2, TILE_AT + TILE / 2], rot: [0, Math.PI / 2, 0] },
};

export function createGizmo(colours: Colours): Gizmo {
  let cols = colours;
  const group = new THREE.Group();
  group.name = 'gizmo';

  // ---- the three axes ------------------------------------------------------
  const axes: THREE.Line[] = [];
  for (const dir of [
    new THREE.Vector3(1, 0, 0),
    new THREE.Vector3(0, 1, 0),
    new THREE.Vector3(0, 0, 1),
  ]) {
    const geo = new THREE.BufferGeometry().setFromPoints([
      new THREE.Vector3(0, 0, 0),
      dir.clone().multiplyScalar(ARM),
    ]);
    const line = new THREE.Line(geo, new THREE.LineBasicMaterial({ transparent: true, opacity: 0.85 }));
    line.renderOrder = 2;
    axes.push(line);
    group.add(line);
  }

  // ---- the three tiles -----------------------------------------------------
  const tiles = new Map<PlaneName, { face: THREE.Mesh; edge: THREE.LineSegments }>();
  for (const name of PLANE_NAMES) {
    const p = TILE_PLACEMENT[name];
    const geo = new THREE.PlaneGeometry(TILE, TILE);
    const face = new THREE.Mesh(
      geo,
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false })
    );
    face.position.set(...p.pos);
    face.rotation.set(...p.rot);
    face.userData = { gizmo: 'tile', name };
    face.renderOrder = 3;
    const edge = new THREE.LineSegments(
      new THREE.EdgesGeometry(geo),
      new THREE.LineBasicMaterial({ transparent: true, opacity: 0.9 })
    );
    edge.position.copy(face.position);
    edge.rotation.copy(face.rotation);
    edge.renderOrder = 4;
    group.add(face, edge);
    tiles.set(name, { face, edge });
  }

  // ---- the centre: tap to un-choose ---------------------------------------
  const centre = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 16, 12),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.9 })
  );
  centre.userData = { gizmo: 'centre' };
  centre.renderOrder = 5;
  group.add(centre);

  // ---- the slide handle, on the chosen tile's normal ------------------------
  const handle = new THREE.Mesh(
    new THREE.ConeGeometry(0.16, 0.42, 12),
    new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.95 })
  );
  handle.userData = { gizmo: 'handle' };
  handle.renderOrder = 6;
  handle.visible = false;
  group.add(handle);

  const stem = new THREE.Line(
    new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]),
    new THREE.LineDashedMaterial({ dashSize: 0.14, gapSize: 0.1, transparent: true, opacity: 0.8 })
  );
  stem.renderOrder = 5;
  stem.visible = false;
  group.add(stem);

  const g: Gizmo = {
    group,
    chosen: 'foundation',
    offset: 0,
    plane() {
      if (!g.chosen) return null;
      const p = NAMED[g.chosen]('chosen', `the ${g.chosen} tile was held when the pen went down`);
      return g.offset ? slide(p, g.offset) : p;
    },
    choose(name) {
      g.chosen = name;
      if (!name) g.offset = 0;
      g.refresh();
    },
    pickables() {
      const out: THREE.Object3D[] = [centre];
      tiles.forEach((t) => out.push(t.face));
      if (handle.visible) out.push(handle);
      return out;
    },
    hit(object) {
      const d = object.userData as { gizmo?: string; name?: PlaneName };
      if (d?.gizmo === 'tile' && d.name) return { kind: 'tile', name: d.name };
      if (d?.gizmo === 'centre') return { kind: 'centre' };
      if (d?.gizmo === 'handle') return { kind: 'handle' };
      return null;
    },
    setOffset(distance) {
      g.offset = distance;
      g.refresh();
    },
    paint(c) {
      cols = c;
      const ink = new THREE.Color(c.ink3);
      const teal = new THREE.Color(c.teal);
      axes.forEach((a) => (a.material as THREE.LineBasicMaterial).color.copy(ink));
      tiles.forEach(({ face, edge }, name) => {
        const on = name === g.chosen;
        (face.material as THREE.MeshBasicMaterial).color.copy(on ? teal : ink);
        (face.material as THREE.MeshBasicMaterial).opacity = on ? 0.3 : 0.1;
        (edge.material as THREE.LineBasicMaterial).color.copy(on ? teal : ink);
        (edge.material as THREE.LineBasicMaterial).opacity = on ? 1 : 0.5;
      });
      (centre.material as THREE.MeshBasicMaterial).color.copy(g.chosen ? ink : teal);
      (handle.material as THREE.MeshBasicMaterial).color.copy(teal);
      (stem.material as THREE.LineDashedMaterial).color.copy(teal);
    },
    refresh() {
      const plane = g.plane();
      // Every tile, and the whole gizmo, rides the chosen plane's slide, so
      // the hand can see where the ink will land.
      tiles.forEach(({ face, edge }, name) => {
        const p = TILE_PLACEMENT[name];
        const on = plane && name === g.chosen;
        const o = on ? plane.origin : { x: 0, y: 0, z: 0 };
        face.position.set(p.pos[0] + o.x, p.pos[1] + o.y, p.pos[2] + o.z);
        edge.position.copy(face.position);
      });
      if (plane) {
        const n = new THREE.Vector3(plane.normal.x, plane.normal.y, plane.normal.z).normalize();
        const base = new THREE.Vector3(plane.origin.x, plane.origin.y, plane.origin.z);
        const at = base.clone().add(n.clone().multiplyScalar(1.5));
        handle.position.copy(at);
        handle.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), n);
        handle.visible = true;
        stem.geometry.setFromPoints([base, at]);
        stem.computeLineDistances();
        stem.visible = true;
      } else {
        handle.visible = false;
        stem.visible = false;
      }
      g.paint(cols);
    },
  };

  g.refresh();
  return g;
}
