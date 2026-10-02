// ===== silhouette =====
// What the solid LOOKS LIKE from a plane, as strokes (SHARD-3D-PLAN §4).
//
// "Render the solid orthographically to a small buffer, run `trace` to get its
// silhouette as strokes, and compare with the ink on that plane." This is that
// sentence, and it is the only part of the diff that needs a renderer — which
// is why it is its own file and why `diff.ts` takes its output rather than
// making it.
//
// Three decisions, each earned:
//
//   * **Orthographic, along the plane's own normal.** A perspective silhouette
//     is a picture of where the camera was standing; the diff is a comparison
//     with ink that lies IN the plane, and the only projection that makes those
//     two comparable is the one that throws the normal away. It also means
//     where the plane stands along its normal does not matter — slide the width
//     tile out beside the box and the side view is the same side view.
//   * **Flat white on black, and the MASK is the answer.** No lighting, no
//     shading, no edges: a pixel is covered or it is not. The outline is then
//     the boundary of that mask, which is what `trace` is handed.
//   * **`trace` is given the BOUNDARY, not the blob.** Core's tracer thins what
//     it is given down to a centreline, so a filled rectangle comes back as its
//     medial axis — a spine, not an outline. Found by handing it the silhouette
//     straight and getting a cross.

import * as THREE from 'three';
import type { Point } from 'metamedium-core';
import { boundsOf, gridFor, outlineOfMask, padBounds, type Grid } from './diff';
import { mul, add, normalize, toPlane, toWorld, uAxis, vAxis, type Plane, type Vec3 } from './plane';

/**
 * How many pixels the longer side of the solid's own extent gets. A few hundred
 * across the thing, not across the screen: the diff's regions are areas, and an
 * area is not made truer by being measured on more pixels than the hand drew.
 */
export const SILHOUETTE_PX = 256;
/** How far past the solid's own extent the buffer reaches, as a fraction of it. */
export const SILHOUETTE_MARGIN = 0.05;

/** A solid seen flat on a plane: the mask, the outline, and the grid both are in. */
export interface PlaneSilhouette {
  /** 1 where the solid covers the plane. Row-major, row 0 at the SMALLEST v. */
  mask: Uint8Array;
  grid: Grid;
  /** The mask's boundary, walked into paths by core's `trace`, in plane units. */
  outlines: Point[][];
  /** How much of the buffer the solid covered — 0 when it missed it entirely. */
  fraction: number;
  reasoning: string;
}

const vec = (v: Vec3) => new THREE.Vector3(v.x, v.y, v.z);

/** Every corner of a geometry's own box, in the plane's (u, v). */
function cornersOnPlane(box: THREE.Box3, plane: Plane): Point[] {
  const out: Point[] = [];
  for (const x of [box.min.x, box.max.x])
    for (const y of [box.min.y, box.max.y])
      for (const z of [box.min.z, box.max.z]) out.push(toPlane(plane, { x, y, z }));
  return out;
}

/**
 * The solid's silhouette on a plane.
 *
 * The camera stands off the plane along its normal, looking back along it, with
 * its own up set to −v — so the buffer's x axis IS the plane's u and its y axis
 * IS the plane's v, running down the image the way v runs down the screen. That
 * is what lets a pixel be turned straight back into a plane point with no
 * frame-juggling, and it is worth saying out loud because getting it wrong
 * produces a silhouette that is right and mirrored.
 */
export function silhouetteOnPlane(
  renderer: THREE.WebGLRenderer,
  geometry: THREE.BufferGeometry,
  plane: Plane,
  px = SILHOUETTE_PX
): PlaneSilhouette | null {
  const position = geometry.getAttribute('position');
  if (!position || position.count < 3) return null;
  geometry.computeBoundingBox();
  const box = geometry.boundingBox;
  if (!box || box.isEmpty()) return null;

  const grid = gridFor(padBounds(boundsOf(cornersOnPlane(box, plane)), SILHOUETTE_MARGIN), px);
  const w = grid.bounds.maxX - grid.bounds.minX;
  const h = grid.bounds.maxY - grid.bounds.minY;
  const centre = toWorld(plane, {
    x: (grid.bounds.minX + grid.bounds.maxX) / 2,
    y: (grid.bounds.minY + grid.bounds.maxY) / 2,
  });

  const n = normalize(plane.normal);
  const radius = box.getSize(new THREE.Vector3()).length() / 2 + 1;
  const camera = new THREE.OrthographicCamera(-w / 2, w / 2, h / 2, -h / 2, 0.01, radius * 4 + 2);
  camera.position.copy(vec(add(centre, mul(n, radius * 2))));
  // +Y of the camera is −v, so the image's rows run the way v does.
  camera.up.copy(vec(mul(vAxis(plane), -1)));
  camera.lookAt(vec(centre));
  camera.updateMatrixWorld(true);
  camera.updateProjectionMatrix();

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  const material = new THREE.MeshBasicMaterial({ color: 0xffffff, side: THREE.DoubleSide });
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  const target = new THREE.WebGLRenderTarget(grid.width, grid.height, {
    depthBuffer: true,
    stencilBuffer: false,
    minFilter: THREE.NearestFilter,
    magFilter: THREE.NearestFilter,
  });
  const buffer = new Uint8Array(grid.width * grid.height * 4);
  const held = renderer.getRenderTarget();
  try {
    renderer.setRenderTarget(target);
    renderer.render(scene, camera);
    renderer.readRenderTargetPixels(target, 0, 0, grid.width, grid.height, buffer);
  } finally {
    renderer.setRenderTarget(held);
    target.dispose();
    material.dispose();
    scene.remove(mesh);
  }

  // WebGL hands back rows from the BOTTOM of the image up, and the bottom of
  // the image is the LARGEST v — so the rows are turned over on the way into
  // the mask, which is row 0 at the smallest v like every grid in the diff.
  const mask = new Uint8Array(grid.width * grid.height);
  let covered = 0;
  for (let row = 0; row < grid.height; row++) {
    const from = (grid.height - 1 - row) * grid.width;
    for (let col = 0; col < grid.width; col++) {
      if (buffer[(from + col) * 4] > 127) {
        mask[row * grid.width + col] = 1;
        covered++;
      }
    }
  }

  const outlines = covered ? outlineOfMask(mask, grid) : [];
  const fraction = covered / mask.length;
  return {
    mask,
    grid,
    outlines,
    fraction,
    reasoning:
      `rendered flat along the ${plane.name ?? 'plane'}'s own normal into ${grid.width}×${grid.height} pixels ` +
      `over ${w.toFixed(2)} × ${h.toFixed(2)} u (${grid.pxU.toFixed(3)} u a pixel); ` +
      `${(fraction * 100).toFixed(0)}% of the buffer is solid, and its boundary traced into ` +
      `${outlines.length} outline${outlines.length === 1 ? '' : 's'}`,
  };
}

/** Where a plane's own frame stands, for a cache key: the two axes and the origin IN the plane. */
export function planeKey(plane: Plane): string {
  const r = (v: number) => v.toFixed(3);
  const n = normalize(plane.normal);
  const u = uAxis(plane);
  const v = vAxis(plane);
  const o = toPlane(plane, { x: 0, y: 0, z: 0 });
  // The offset ALONG the normal is deliberately not in the key: the comparison
  // is orthographic, so sliding the plane along its normal is the same view.
  return `${r(n.x)},${r(n.y)},${r(n.z)}|${r(u.x)},${r(u.y)},${r(u.z)}|${r(v.x)},${r(v.y)},${r(v.z)}|${r(o.x)},${r(o.y)}`;
}
