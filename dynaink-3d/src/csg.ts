// ===== csg =====
// The one seam, and the one library behind it (SHARD-3D-PLAN §2.4, §10).
//
// §10's second risk: **CSG is fragile on messy input.** So there is exactly one
// module in the shard that knows a boolean library exists — this one — and it
// exposes two functions on plain `THREE.BufferGeometry`. Nothing else imports
// `three-bvh-csg`; swapping the library is an edit to this file and to nothing
// else, and if it is ever ripped out, `cut` and `boss` still stand in the tree
// as the intent they are (the tree is the source; the mesh is derived).
//
// **It never throws.** A boolean on a hand-drawn profile can fail — a
// self-crossing outline, a degenerate tool, a library assertion deep in a
// triangle splitter — and a derivation that threw would take the whole board
// down with it while the log was perfectly fine. So every result is
// `{ ok: true, geometry }` or `{ ok: false, error }`, the caller keeps the
// solid as it was, marks it BROKEN with the library's own words, and the
// status line says so. A failure is a reading that did not come off, not a
// crash.

import * as THREE from 'three';
import { Brush, Evaluator, ADDITION, SUBTRACTION, INTERSECTION } from 'three-bvh-csg';

/** What a boolean came back with: the geometry, or the library's own complaint. */
export type CsgResult =
  | { ok: true; geometry: THREE.BufferGeometry }
  | { ok: false; error: string };

/** The library behind the seam, named once so the panel and the status can say it. */
export const CSG_LIBRARY = 'three-bvh-csg';

// One evaluator, reused: it holds scratch buffers, and `useGroups = false`
// keeps the result a single material group — the shard paints a solid with one
// quiet material, and a boolean that split it into two would silently make the
// cut face un-paintable.
let evaluator: Evaluator | null = null;
function evaluatorOf(): Evaluator {
  if (!evaluator) {
    evaluator = new Evaluator();
    evaluator.useGroups = false;
  }
  return evaluator;
}

/**
 * The library wants brushes whose attribute sets MATCH. `ExtrudeGeometry` and
 * `LatheGeometry` both carry position / normal / uv, but a geometry that has
 * been merged by hand (several steps in one tree) may carry only position and
 * normal — so every input is normalised to the same three, indexed away, before
 * it is handed over. Cheap, and it turns a whole class of library assertion
 * into arithmetic that cannot fail.
 */
function normalised(geo: THREE.BufferGeometry): THREE.BufferGeometry {
  const flat = geo.index ? geo.toNonIndexed() : geo.clone();
  const position = flat.getAttribute('position');
  if (!position) throw new Error('a geometry with no positions');
  if (!flat.getAttribute('normal')) flat.computeVertexNormals();
  if (!flat.getAttribute('uv')) {
    flat.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(position.count * 2), 2));
  }
  // Anything else (colour, tangents, a lathe's own groups) is dropped: the
  // boolean has to interpolate every attribute it is given across a new edge,
  // and an attribute nothing renders is only another way to fail.
  for (const name of Object.keys(flat.attributes)) {
    if (name !== 'position' && name !== 'normal' && name !== 'uv') flat.deleteAttribute(name);
  }
  flat.clearGroups();
  return flat;
}

function brushOf(geo: THREE.BufferGeometry): Brush {
  const b = new Brush(normalised(geo));
  b.updateMatrixWorld(true);
  return b;
}

function evaluate(a: THREE.BufferGeometry, b: THREE.BufferGeometry, op: number, what: string): CsgResult {
  try {
    const result = evaluatorOf().evaluate(brushOf(a), brushOf(b), op);
    const geometry = (result as unknown as THREE.Mesh).geometry as THREE.BufferGeometry;
    const position = geometry?.getAttribute('position');
    if (!position || position.count < 3) {
      // A boolean that came back with nothing is a failure that did not raise:
      // a tool that missed entirely, or two solids that share no volume. Said
      // out loud rather than rendered as a solid that vanished.
      return { ok: false, error: `${CSG_LIBRARY} returned an empty ${what} — the two shapes may not meet` };
    }
    // The evaluator reuses its target brush, so the geometry is copied out
    // before the next call is allowed to overwrite it.
    const out = geometry.clone();
    out.computeVertexNormals();
    return { ok: true, geometry: out };
  } catch (err) {
    return { ok: false, error: `${CSG_LIBRARY} could not ${what}: ${err instanceof Error ? err.message : String(err)}` };
  }
}

/** `a` with `b` taken out of it — what a `cut` is. */
export function subtract(a: THREE.BufferGeometry, b: THREE.BufferGeometry): CsgResult {
  return evaluate(a, b, SUBTRACTION, 'subtract');
}

/** `a` and `b` as one body — what a `boss`, a `mirror` and a `union` are. */
export function union(a: THREE.BufferGeometry, b: THREE.BufferGeometry): CsgResult {
  return evaluate(a, b, ADDITION, 'union');
}

/**
 * Only where `a` and `b` are both — what a `massing` is, and what CLIPS a
 * model's proposal to the drawing it was made from (P5, §6).
 *
 * The same contract as the other two: it never throws, and an intersection
 * that comes back empty is reported as a failure that did not raise rather
 * than rendered as a solid that vanished. That matters more here than
 * anywhere else, because two prisms that share no volume is exactly what a
 * drawing whose views do not line up produces — and the honest answer is to
 * say so, not to show nothing.
 */
export function intersect(a: THREE.BufferGeometry, b: THREE.BufferGeometry): CsgResult {
  return evaluate(a, b, INTERSECTION, 'intersect');
}
