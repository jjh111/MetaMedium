// ===== solid =====
// The mesh, DERIVED (invariant 4).
//
// Nothing in here is state. Every solid on the board is rebuilt from the op
// trees the log holds, on every change, exactly the way `ink.ts` rebuilds the
// strokes — so undo needs no bookkeeping, a replayed log stands the same
// solids up, and there is never a mesh that outlived the tree that made it.
//
// Invariant 3, ink is never covered: the profile's ink stays drawn on its own
// plane, in FRONT of the face it made. A solid grows out of the plane the ink
// lies on, so the ink sits on a face it would otherwise be flush with (or
// inside); the marks a solid was made from are therefore drawn faint and with
// the depth test off — always visible, always subordinate. The quiet material
// carries a polygon offset besides, so a coplanar face never fights the line.

import * as THREE from 'three';
import type { Point } from 'metamedium-core';
import type { Space } from './scene';
import type { Colours } from './theme';
import type { Log, Solid } from './log';
import {
  colourOf,
  latheProfile,
  placeFrames,
  rootOf,
  strokesOf,
  TOOL_OVERLAP,
  type ExtrudeStep,
  type FeatureStep,
  type MassingStep,
  type PlaneRef,
  type Profile2D,
  type MatchStep,
  type MirrorStep,
  type OpStep,
  type OpTree,
  type PlaceStep,
  type RevolveStep,
} from './op';
import { intersect, subtract, union } from './csg';
import { cross, dot, normalize, offsetOf, slide, toWorld, uAxis, vAxis, type Plane, type Pose, type Vec3 } from './plane';
import type { FaceRef } from './planarity';
import { diffProfile, viewNameOf, type Diff } from './diff';
import { planeKey, silhouetteOnPlane, type PlaneSilhouette } from './silhouette';

/**
 * How close to the hit plane a vertex has to sit to count as ON that face,
 * as a fraction of the solid's own diagonal — a ratio of the thing's size,
 * never a world unit (invariant 8).
 */
const FACE_FLATNESS = 0.004;
/** How many faces under one pen-down are worth offering. Two is the near one and what is behind it. */
const FACES_OFFERED = 2;

const vec = (v: Vec3) => new THREE.Vector3(v.x, v.y, v.z);

export interface Solids {
  group: THREE.Group;
  /** Rebuild every solid from the log. */
  sync(): void;
  paint(c: Colours): void;
  /** Which solid a screen point is over, or null. */
  pick(screen: Point): string | null;
  /** The faces the pen's ray meets at a screen point, nearest first — the `face` candidates. */
  facesAt(screen: Point): FaceRef[];
  /** World bounds of a solid, for the selection outline. */
  boundsOf(id: string): THREE.Box3 | null;
  /**
   * The geometry standing for a solid right now — what `parts.ts` cuts up
   * (push 2, G2). Derived, never held: it is whatever the last `sync` built.
   */
  geometryOf(id: string): THREE.BufferGeometry | null;
  /** The tree signature the current build was made from — what a parts cache is keyed on. */
  signatureOf(id: string): string | null;
  /** How far a solid reaches along a direction — what a cut goes THROUGH. */
  spanAlong(id: string, direction: Vec3): number;
  /**
   * A solid's outline in the screen space of a pose — what a scratch is counted
   * against (§8: three crossings of its silhouette). The mesh's own vertices
   * projected and taken round by a 2D hull: good enough for this rung, and
   * plainly a hull rather than a true silhouette — a concave solid's dent is
   * not in it, so a scratch inside a C-shape's mouth counts as crossing it.
   */
  silhouetteOf(id: string, pose?: Pose): Point[] | null;
  /**
   * Fire a ray straight down world −Y through (x, z) and say what it meets.
   * Nothing in the surface uses this; the e2e does, and it is the only honest
   * way to assert that a hole goes THROUGH — you look through it.
   */
  rayDown(at: { x: number; z: number }): { solidId: string; y: number } | null;
  /**
   * A solid seen flat on a plane — the orthographic silhouette the diff is run
   * against (P4). Cached on the tree's own signature and the plane's frame, so
   * hovering a mark does not re-render the board.
   */
  silhouetteOn(id: string, plane: Plane): PlaneSilhouette | null;
  /** Why a solid's derivation did not come off, or null. The CSG seam's own words. */
  brokenOf(id: string): string | null;
  /** Told once, when a derivation fails — so the status line says it and the panel keeps it. */
  onBroken(fn: (id: string, why: string) => void): void;
  /** The ids a solid's mesh was built from — what ink over it addresses. */
  ids(): string[];
}

/** The plane a step was drawn on, as the tree carries it. */
function planeOfStep(step: { plane: { origin: Vec3; normal: Vec3; up: Vec3; name?: string } }): Plane {
  return {
    origin: step.plane.origin,
    normal: step.plane.normal,
    up: step.plane.up,
    source: 'chosen',
    name: step.plane.name,
    why: 'the plane the profile was drawn on, carried in the tree',
  };
}

/**
 * The plane's frame as a RIGHT-handed basis.
 *
 * The plane's own axes are (u, v, n) with v running DOWN the screen, and
 * cross(u, v) is exactly -n for every plane the shard builds — so a matrix
 * made of (u, v, n) would be a mirror, and every face of every solid would be
 * inside out. The basis used is (u, v, cross(u, v)) and the extrusion is
 * signed to suit: local +z is -n, so growing `depth` along the normal is
 * growing -depth along local z.
 */
function frameOf(plane: Plane): THREE.Matrix4 {
  const u = uAxis(plane);
  const v = vAxis(plane);
  const w = cross(u, v); // = -normal, always
  const m = new THREE.Matrix4().makeBasis(vec(u), vec(v), vec(w));
  m.setPosition(vec(plane.origin));
  return m;
}

function shapeOf(points: Point[], closed: boolean): THREE.Shape | null {
  if (points.length < 3) return null;
  const pts = points.map((p) => new THREE.Vector2(p.x, p.y));
  if (closed) pts.push(pts[0].clone());
  return new THREE.Shape(pts);
}

/** `extrude(profile, extent)`: the clean profile, grown along its plane's normal. */
function extrudeGeometry(step: ExtrudeStep): THREE.BufferGeometry | null {
  const shape = shapeOf(step.profile.points, step.profile.closed);
  if (!shape || Math.abs(step.depth) < 1e-6) return null;
  const zSpan = -step.depth; // local +z is -normal (see frameOf)
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: Math.abs(zSpan),
    bevelEnabled: false,
    steps: 1,
    curveSegments: 24,
  });
  if (zSpan < 0) geo.translate(0, 0, zSpan);
  geo.computeVertexNormals();
  return geo;
}

/** `revolve(profile, axis, sweep)`: the clean profile turned about the line beside it. */
function revolveGeometry(step: RevolveStep): { geometry: THREE.BufferGeometry; matrix: THREE.Matrix4 } | null {
  const prof = latheProfile(step);
  if (prof.length < 3) return null;
  const pts = prof.map((p) => new THREE.Vector2(Math.max(p.r, 1e-4), p.h));
  if (step.profile.closed) pts.push(pts[0].clone());
  const geo = new THREE.LatheGeometry(pts, 48, 0, step.sweep);
  geo.computeVertexNormals();
  // The lathe turns about its own +Y; stand it on the axis the hand drew.
  const dir = normalize(step.axis.direction);
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), vec(dir));
  const matrix = new THREE.Matrix4().makeRotationFromQuaternion(q);
  matrix.setPosition(vec(step.axis.point));
  return { geometry: geo, matrix };
}

/**
 * `cut` / `boss`: the feature's clean form as a PRISM along the face's own
 * normal — the tool the boolean is asked with.
 *
 * The plane is slid by the step's `start` first, so the tool never has a face
 * coplanar with a face of the body (see `TOOL_OVERLAP`).
 */
function prism(
  points: Point[],
  closed: boolean,
  plane: Plane,
  start: number,
  depth: number
): { geometry: THREE.BufferGeometry; matrix: THREE.Matrix4 } | null {
  const shape = shapeOf(points, closed);
  if (!shape || Math.abs(depth) < 1e-6) return null;
  const from = start ? slide(plane, start) : plane;
  const zSpan = -depth; // local +z is -normal (see frameOf)
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: Math.abs(zSpan),
    bevelEnabled: false,
    steps: 1,
    curveSegments: 24,
  });
  if (zSpan < 0) geo.translate(0, 0, zSpan);
  geo.computeVertexNormals();
  return { geometry: geo, matrix: frameOf(from) };
}

function toolGeometry(step: FeatureStep): { geometry: THREE.BufferGeometry; matrix: THREE.Matrix4 } | null {
  return prism(step.profile.points, step.profile.closed, planeOfStep(step), step.start, step.depth);
}

/**
 * The same prism, **in world space** — the one door other files come through
 * (push 2, G2: `parts.ts` cuts a hull with a run's prism).
 *
 * The shard has one place that knows how a profile stands up on a plane, and a
 * second copy of it would be a second place for the frame convention to drift.
 */
export function prismOn(
  points: Point[],
  closed: boolean,
  plane: Plane,
  start: number,
  depth: number
): THREE.BufferGeometry | null {
  const built = prism(points, closed, plane, start, depth);
  if (!built) return null;
  const geometry = built.geometry.clone();
  geometry.applyMatrix4(built.matrix);
  return geometry;
}

/**
 * `mirror`: the reflection matrix across a plane.
 *
 * Its determinant is −1, so applying it turns every triangle inside out — the
 * winding is flipped back by hand afterwards (`flipWinding`). A mirrored body
 * whose faces point inward renders as a hole in the world and cuts wrong, and
 * nothing about the picture says why.
 */
function reflectionOf(plane: { origin: Vec3; normal: Vec3 }): THREE.Matrix4 {
  const n = normalize(plane.normal);
  const d = dot(n, plane.origin);
  return new THREE.Matrix4().set(
    1 - 2 * n.x * n.x, -2 * n.x * n.y, -2 * n.x * n.z, 2 * d * n.x,
    -2 * n.x * n.y, 1 - 2 * n.y * n.y, -2 * n.y * n.z, 2 * d * n.y,
    -2 * n.x * n.z, -2 * n.y * n.z, 1 - 2 * n.z * n.z, 2 * d * n.z,
    0, 0, 0, 1
  );
}

function flipWinding(geo: THREE.BufferGeometry): THREE.BufferGeometry {
  const flat = geo.index ? geo.toNonIndexed() : geo;
  const pos = flat.getAttribute('position') as THREE.BufferAttribute;
  for (let i = 0; i + 2 < pos.count; i += 3) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    pos.setXYZ(i, pos.getX(i + 2), pos.getY(i + 2), pos.getZ(i + 2));
    pos.setXYZ(i + 2, x, y, z);
  }
  pos.needsUpdate = true;
  flat.deleteAttribute('normal');
  flat.computeVertexNormals();
  return flat;
}

/** One step's geometry, already placed in the world. Null for a row no package has filled. */
export function geometryFor(step: OpStep): { geometry: THREE.BufferGeometry; matrix: THREE.Matrix4 } | null {
  if (step.op === 'extrude') {
    const geo = extrudeGeometry(step);
    return geo ? { geometry: geo, matrix: frameOf(planeOfStep(step)) } : null;
  }
  if (step.op === 'revolve') return revolveGeometry(step);
  if (step.op === 'cut' || step.op === 'boss') return toolGeometry(step);
  return null; // P7, P8, P10 — the row is in the tree, the geometry is not yet
}

/** The geometry of one step, placed: the clone with its matrix already applied. */
function placed(step: OpStep): THREE.BufferGeometry | null {
  const g = geometryFor(step);
  if (!g) return null;
  const out = g.geometry.clone();
  out.applyMatrix4(g.matrix);
  return out;
}

/** Two coplanar faces meeting at an edge do not draw it; this is how far apart they must be. */
const EDGE_ANGLE_DEG = 25;
/** How finely a vertex position is rounded before two of them count as the same one. */
const WELD = 1e4;

/**
 * The edges of a solid: **only the creases, never the triangulation.**
 *
 * `THREE.EdgesGeometry` draws an edge when the two faces sharing it disagree
 * by more than a threshold — and also when NOTHING shares it, because that is
 * a boundary. A boolean's triangle splitter leaves coincident-but-separate
 * vertices and T-junctions all over a re-cut face, so a great many seams of
 * the triangulation read as boundaries and a box with a hole in it comes back
 * drawn like a spider's web. Found by cutting one and looking at it.
 *
 * Every solid the shard derives is a CLOSED body, so a genuine boundary edge
 * cannot exist: an edge nothing shares is an artifact of how the face was cut
 * into triangles, and is dropped. What is left is the creases — which is what
 * a drawn edge means. Positions are welded to a grid first so that "shares"
 * survives the arithmetic.
 */
function hardEdges(geo: THREE.BufferGeometry): THREE.BufferGeometry {
  const flat = geo.index ? geo.toNonIndexed() : geo;
  const pos = flat.getAttribute('position') as THREE.BufferAttribute | undefined;
  const out = new THREE.BufferGeometry();
  if (!pos || pos.count < 3) return out;

  const key = (i: number) =>
    `${Math.round(pos.getX(i) * WELD)},${Math.round(pos.getY(i) * WELD)},${Math.round(pos.getZ(i) * WELD)}`;
  const at = (i: number) => new THREE.Vector3(pos.getX(i), pos.getY(i), pos.getZ(i));

  // edge (the two welded endpoints, ordered) → the face normals meeting on it
  const edges = new Map<string, { a: THREE.Vector3; b: THREE.Vector3; normals: THREE.Vector3[] }>();
  const ab = new THREE.Vector3();
  const ac = new THREE.Vector3();
  for (let f = 0; f + 2 < pos.count; f += 3) {
    const p = [at(f), at(f + 1), at(f + 2)];
    const k = [key(f), key(f + 1), key(f + 2)];
    const n = ab.subVectors(p[1], p[0]).cross(ac.subVectors(p[2], p[0])).clone();
    if (n.lengthSq() < 1e-20) continue; // a degenerate sliver says nothing about shape
    n.normalize();
    for (let i = 0; i < 3; i++) {
      const j = (i + 1) % 3;
      if (k[i] === k[j]) continue;
      const id = k[i] < k[j] ? `${k[i]}|${k[j]}` : `${k[j]}|${k[i]}`;
      const held = edges.get(id);
      if (held) held.normals.push(n);
      else edges.set(id, { a: p[i], b: p[j], normals: [n] });
    }
  }

  const cos = Math.cos((EDGE_ANGLE_DEG * Math.PI) / 180);
  const line: number[] = [];
  for (const e of edges.values()) {
    // Exactly two faces: a crease, or a flat seam. Anything else — one face, or
    // three — is the triangulation talking, and it is not a shape.
    if (e.normals.length !== 2) continue;
    if (e.normals[0].dot(e.normals[1]) > cos) continue;
    line.push(e.a.x, e.a.y, e.a.z, e.b.x, e.b.y, e.b.z);
  }
  out.setAttribute('position', new THREE.Float32BufferAttribute(line, 3));
  return out;
}

/** A cheap 32-bit hash, so a cache key is short rather than a whole tree. */
function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Two disjoint bodies as one geometry. No boolean: they do not touch. */
function mergeInto(parts: THREE.BufferGeometry[]): THREE.BufferGeometry {
  const out = new THREE.BufferGeometry();
  const position: number[] = [];
  const normal: number[] = [];
  for (const p of parts) {
    const flat = p.index ? p.toNonIndexed() : p;
    position.push(...Array.from(flat.getAttribute('position').array as Float32Array));
    const n = flat.getAttribute('normal');
    if (n) normal.push(...Array.from(n.array as Float32Array));
  }
  out.setAttribute('position', new THREE.Float32BufferAttribute(position, 3));
  if (normal.length === position.length) out.setAttribute('normal', new THREE.Float32BufferAttribute(normal, 3));
  else out.computeVertexNormals();
  return out;
}

/** What a tree derived to: the geometry, and why it did not come off if it did not. */
export interface Derived {
  geometry: THREE.BufferGeometry | null;
  /** The CSG seam's own words, or a row no package has filled — never an exception. */
  broken: string | null;
  /** What each `match` step re-derived as it was walked — the panel's evidence, never the log's. */
  diffs?: { stepId: string; diff: Diff }[];
  /**
   * P5: the steps that carry a MATERIAL, with the geometry each one
   * contributed — what *green turret tops* comes to on screen.
   *
   * A boolean erases which material came from where: once a boss is unioned
   * into a body there is no face on it that knows it was a turret's top. So a
   * material is drawn as the step's OWN contribution standing in front of the
   * body, which is exactly the volume the word was said about, rather than the
   * body being split into coloured groups it cannot carry.
   */
  parts?: { stepId: string; name?: string; colour: string; geometry: THREE.BufferGeometry }[];
}

/**
 * The two things a `match` step needs that the TREE does not hold, because
 * holding them would be holding something derived (invariant 4).
 *
 * Both are seams, and both are injectable — which is what lets the pure tests
 * walk a tree with a fake silhouette and no renderer at all.
 */
export interface DeriveContext {
  /** A stroke's outline, out of the log: its clean form when the engine holds one, else its ink. */
  inkOf?(strokeId: string): { points: Point[]; from: 'clean' | 'ink'; why: string } | null;
  /** The body-so-far, rendered flat on a plane. `silhouette.ts`, given a renderer. */
  silhouetteOf?(geometry: THREE.BufferGeometry, plane: Plane): PlaneSilhouette | null;
}

/**
 * How far a match's prism runs past the body at each end, as a ratio of the
 * body's own span across the plane.
 *
 * Much smaller than `TOOL_OVERLAP`, and for a reason worth writing down: that
 * one is a ratio of a FEATURE's size, so a hair on a small circle; this one is
 * a ratio of the whole body, and at a fiftieth the added material would stand
 * proud of the box's own sides by four per cent of its width — a bump wider
 * than the thing it is on, which you can see. A five-hundredth is still
 * thousands of times float32's own resolution here, which is all the boolean
 * needs to not be handed two exactly coplanar faces.
 */
const MATCH_OVERLAP = TOOL_OVERLAP / 10;

/** How far the body reaches along a plane's normal, signed from that plane's origin. */
function spanAcross(geo: THREE.BufferGeometry, plane: Plane): { min: number; max: number } | null {
  geo.computeBoundingBox();
  const box = geo.boundingBox;
  if (!box || box.isEmpty()) return null;
  let min = Infinity;
  let max = -Infinity;
  for (const x of [box.min.x, box.max.x])
    for (const y of [box.min.y, box.max.y])
      for (const z of [box.min.z, box.max.z]) {
        const d = offsetOf(plane, { x, y, z });
        if (d < min) min = d;
        if (d > max) max = d;
      }
  return { min, max };
}

/**
 * `match`: the diff, re-derived and resolved (§4).
 *
 * Nothing about the regions comes out of the step. The ink is fetched from the
 * log, the body-so-far is rendered flat on the profile's plane, the diff is run
 * again, and every region it names becomes a prism running right THROUGH the
 * body along that plane's normal — added for *Add it*, subtracted for *Take it
 * off*. A region's prism starts a hair before the body and ends a hair past it,
 * so no face of a tool is ever coplanar with a face of the body: the same rule
 * `TOOL_OVERLAP` exists for, applied to the other tool the shard builds.
 */
function matchInto(
  body: THREE.BufferGeometry,
  step: MatchStep,
  ctx: DeriveContext
): { geometry: THREE.BufferGeometry; diff: Diff | null; broken: string | null } {
  const ink = ctx.inkOf?.(step.from[0]);
  if (!ink || ink.points.length < 3) {
    return {
      geometry: body,
      diff: null,
      broken: `the match references ${step.from[0] ?? 'no stroke'}, and that ink is not on the board — the body is what it was`,
    };
  }
  const plane = planeOfStep(step);
  const sil = ctx.silhouetteOf?.(body, plane) ?? null;
  const diff = diffProfile({
    ink: ink.points,
    from: ink.from,
    inkWhy: ink.why,
    ...(sil ? { silhouetteMask: { mask: sil.mask, grid: sil.grid } } : {}),
    view: viewNameOf(plane.name),
  });
  const regions = step.how === 'add' ? diff.missing : diff.extra;
  if (!regions.length) {
    // Nothing to do is not a failure: the drawing and the body already agree.
    return { geometry: body, diff, broken: null };
  }
  const reach = spanAcross(body, plane);
  if (!reach) {
    return { geometry: body, diff, broken: 'the body has no extent along that plane — nothing to run a region through' };
  }
  const span = Math.max(reach.max - reach.min, 1e-4);
  const lift = Math.max(MATCH_OVERLAP * span, 1e-4);
  let out = body;
  let broken: string | null = null;
  for (const region of regions) {
    const tool = prism(region.outline, true, plane, reach.min - lift, span + lift * 2);
    if (!tool) {
      if (!broken) broken = `a ${region.kind} region ${region.where} is too thin to build a tool from`;
      continue;
    }
    const geometry = tool.geometry.clone();
    geometry.applyMatrix4(tool.matrix);
    const r = step.how === 'add' ? union(out, geometry) : subtract(out, geometry);
    // The body stays as it was on a failure, exactly as a cut does.
    if (r.ok) out = r.geometry;
    else if (!broken) broken = r.error;
  }
  return { geometry: out, diff, broken };
}

/**
 * A placement's transform, worked out from the two inks the step names (P6).
 *
 * The step holds the definition, its tree and two stroke ids, and nothing
 * about where the copy stands — so the whole pose is built here, every walk,
 * out of the log: the definition's matching profile, the profile drawn where
 * the copy is wanted, and the planes both lie on. A uniform scale from the
 * size ratio, a turn from one plane's frame onto the other's, and a shift that
 * puts the first outline's centre on the second's.
 *
 * A step with no `definition` is P3's dup and gets no matrix — its offset is
 * the whole of its pose, and the caller translates.
 */
function placementMatrix(step: PlaceStep, ctx: DeriveContext): { matrix: THREE.Matrix4 | null; broken: string | null } {
  if (!step.definition || !step.of || !step.fromPlane) return { matrix: null, broken: null };
  const src = ctx.inkOf?.(step.of);
  if (!src || src.points.length < 3) {
    return {
      matrix: null,
      broken:
        `the placement of ${step.definition} is posed from ${step.of}, and that ink is not on the board — ` +
        `the definition's own profile has to be there for the copy to know how big it is`,
    };
  }
  let to: { points: Point[]; plane: typeof step.fromPlane } | { point: Vec3 };
  if (step.toMark && step.toPlane) {
    const dst = ctx.inkOf?.(step.toMark);
    if (!dst || dst.points.length < 3) {
      return {
        matrix: null,
        broken: `the placement of ${step.definition} stands where ${step.toMark} was drawn, and that ink is not on the board`,
      };
    }
    to = { points: dst.points, plane: step.toPlane };
  } else {
    to = { point: step.toPoint ?? { x: 0, y: 0, z: 0 } };
  }
  const f = placeFrames({ from: { points: src.points, plane: step.fromPlane }, to });
  const s = f.scale;
  // world → the source plane's own frame → scaled → the target plane's frame.
  const basis = (fr: { u: Vec3; v: Vec3; n: Vec3 }) =>
    new THREE.Matrix4().makeBasis(vec(fr.u), vec(fr.v), vec(fr.n));
  const m = new THREE.Matrix4()
    .multiply(new THREE.Matrix4().makeTranslation(f.centreTo.x, f.centreTo.y, f.centreTo.z))
    .multiply(basis(f.frameTo))
    .multiply(new THREE.Matrix4().makeScale(s, s, s))
    .multiply(basis(f.frameFrom).clone().transpose())
    .multiply(new THREE.Matrix4().makeTranslation(-f.centreFrom.x, -f.centreFrom.y, -f.centreFrom.z));
  return { matrix: m, broken: null };
}

/**
 * `massing(profiles)`: each profile grown through the span of the OTHERS along
 * its own normal, and the prisms intersected (§2.6 rule 1).
 *
 * How far each prism runs is worked out here and held nowhere: the span is
 * every profile's world points projected onto this plane's normal, so adding a
 * third view re-derives the first two's prisms as well. A ratio of the span
 * itself pads each end, so no face of one prism is ever coplanar with a face of
 * another — the lesson `TOOL_OVERLAP` taught, on the tool the massing builds.
 */
function massingGeometry(step: MassingStep): { geometry: THREE.BufferGeometry | null; broken: string | null } {
  if (!step.profiles.length) return { geometry: null, broken: 'a massing with no profiles in it' };
  // A massing IS a hull of axis-aligned claims (push 2, G1): one derivation,
  // two doors. The profiles are closed by their own ink, and the one on the
  // foundation is the footprint — which is what it always was.
  const footprint = step.profiles.find((p) => p.plane.name === 'foundation');
  return hullBody(
    step.profiles.map((p) => ({ id: p.id, profile: p.profile, plane: p.plane })),
    footprint?.id,
    'massing'
  );
}

/**
 * **The claims, each grown through the span of the OTHERS, and intersected.**
 *
 * The one derivation behind both `massing` and `hull`, and the fix John's
 * second board asked for: the span a claim's prism runs through is measured
 * over the other claims' world points, **never its own**. A footprint drawn on
 * the floor has all of its points at y = 0, and reading its own points into
 * its own vertical span is exactly how the ground gets into a hull that no
 * claim's feet reach (push 2 §1, *the volume*).
 *
 * Two rules follow from that, and they are the whole of the volume rule:
 *
 *   * **A claim is bounded by what the other claims say.** Two loops drawn a
 *     unit above the floor make a hull a unit above the floor, because that is
 *     where their prisms cross.
 *   * **The footprint runs from the ground up to the tallest claim.** A
 *     footprint is a statement that the thing stands *here*, so its prism
 *     starts at the ground — and the other claims still bound the bottom, so
 *     the hull only reaches the floor when one of them does.
 *
 * A ratio of the span pads each end, so no face of one prism is ever coplanar
 * with a face of another — the lesson `TOOL_OVERLAP` taught.
 *
 * **One standpoint is one silhouette** (push 2, G2 — found by standing John's
 * own castle up). A hand that walks to one side and draws two towers has drawn
 * ONE outline with two pieces in it, not two claims to intersect: intersecting
 * them gives the empty set, which is what his first board came to. So claims
 * that share a plane DIRECTION are gathered into one silhouette before anything
 * is intersected, and within that silhouette:
 *
 *   * claims whose outlines lie APART are pieces of the one outline, and are
 *     **unioned** — two towers seen from the path;
 *   * claims whose outlines OVERLAP are two accounts of the same outline, and
 *     are **intersected** — the narrower ⊓ drawn over the first is a correction,
 *     and a correction tightens.
 *
 * Across directions nothing changes: silhouettes are intersected, which is the
 * visual hull as it has always been defined. The massing is untouched, because
 * its three profiles are on three different planes and each is a silhouette of
 * one.
 */
function hullBody(
  claims: { id: string; profile: Profile2D; plane: PlaneRef; ground?: boolean }[],
  footprintId: string | undefined,
  what: 'massing' | 'hull'
): { geometry: THREE.BufferGeometry | null; broken: string | null } {
  if (!claims.length) return { geometry: null, broken: `a ${what} with no claims in it` };

  const worldOf = (c: (typeof claims)[number]): Vec3[] => {
    const plane = planeOfStep(c);
    return c.profile.points.map((pt) => toWorld(plane, pt));
  };
  const world = new Map(claims.map((c) => [c.id, worldOf(c)]));

  // ---- one standpoint, one silhouette -------------------------------------
  // Claims are gathered by the DIRECTION their prism runs along — the plane's
  // normal, up to sign, because a view from in front and a view from behind
  // sweep the same line. Two claims in one group say nothing about how far the
  // other runs along that shared direction, so the span is measured over the
  // OTHER groups.
  const groups: (typeof claims)[] = [];
  for (const c of claims) {
    const n = normalize(c.plane.normal);
    const into = groups.find((g) => Math.abs(dot(normalize(g[0].plane.normal), n)) > 1 - 1e-6);
    if (into) into.push(c);
    else groups.push([c]);
  }

  let out: THREE.BufferGeometry | null = null;
  let broken: string | null = null;
  for (const group of groups) {
    const plane = planeOfStep(group[0]);
    let min = Infinity;
    let max = -Infinity;
    for (const other of claims) {
      if (group.some((c) => c.id === other.id)) continue;
      for (const w of world.get(other.id)!) {
        const d = offsetOf(plane, w);
        if (d < min) min = d;
        if (d > max) max = d;
      }
    }
    if (!Number.isFinite(min)) {
      // One silhouette on its own: nothing else says how far it runs, so it
      // runs through its own extent rather than through nothing.
      for (const c of group)
        for (const w of world.get(c.id)!) {
          const d = offsetOf(plane, w);
          if (d < min) min = d;
          if (d > max) max = d;
        }
    }
    // The footprint stands on the ground and runs up to the tallest claim.
    if (group.some((c) => c.id === footprintId)) min = Math.min(min, offsetOf(plane, { x: 0, y: 0, z: 0 }));
    const span = Math.max(max - min, 1e-3);
    const pad = span * TOOL_OVERLAP;

    // Each claim in the group, as a prism on the group's own plane.
    const built: { claim: (typeof claims)[number]; geometry: THREE.BufferGeometry }[] = [];
    for (const c of group) {
      // An OPEN elevation is closed by the ground: joining its two feet is the
      // fourth side, and both of them stand on the floor.
      const tool = prism(c.profile.points, c.profile.closed || !!c.ground, planeOfStep(c), min - pad, span + pad * 2);
      if (!tool) {
        if (!broken) broken = `the claim ${c.id} is degenerate — a ${what} cannot be grown from it`;
        continue;
      }
      const geometry = tool.geometry.clone();
      geometry.applyMatrix4(tool.matrix);
      built.push({ claim: c, geometry });
    }
    if (!built.length) continue;

    // Within the silhouette: outlines that OVERLAP are two accounts of the one
    // outline and are intersected; outlines that lie APART are two pieces of it
    // and are unioned. Overlap is read on the shared plane, in its own (u, v).
    const silhouette = gatherSilhouette(built, plane, world, what);
    if (silhouette.broken && !broken) broken = silhouette.broken;
    if (!silhouette.geometry) continue;

    if (!out) {
      out = silhouette.geometry;
      continue;
    }
    const r = intersect(out, silhouette.geometry);
    if (r.ok) out = r.geometry;
    else if (!broken) broken = r.error;
  }
  return { geometry: out, broken };
}

/**
 * One standpoint's claims, combined into that standpoint's one silhouette.
 *
 * Overlap is read as the boxes of the outlines in the shared plane's own
 * (u, v) — the question being asked is *are these two drawings of the same
 * piece*, and a box answers it without a third boolean per pair.
 */
function gatherSilhouette(
  built: { claim: { id: string }; geometry: THREE.BufferGeometry }[],
  plane: Plane,
  world: Map<string, Vec3[]>,
  what: 'massing' | 'hull'
): { geometry: THREE.BufferGeometry | null; broken: string | null } {
  if (built.length === 1) return { geometry: built[0].geometry, broken: null };
  const U = uAxis(plane);
  const V = vAxis(plane);
  const boxOf = (id: string) => {
    let minU = Infinity;
    let maxU = -Infinity;
    let minV = Infinity;
    let maxV = -Infinity;
    for (const w of world.get(id) ?? []) {
      const u = w.x * U.x + w.y * U.y + w.z * U.z;
      const v = w.x * V.x + w.y * V.y + w.z * V.z;
      minU = Math.min(minU, u);
      maxU = Math.max(maxU, u);
      minV = Math.min(minV, v);
      maxV = Math.max(maxV, v);
    }
    return { minU, maxU, minV, maxV };
  };
  const apart = (a: ReturnType<typeof boxOf>, b: ReturnType<typeof boxOf>) =>
    a.maxU <= b.minU || b.maxU <= a.minU || a.maxV <= b.minV || b.maxV <= a.minV;

  // Clusters of mutually overlapping outlines, so the answer does not depend on
  // the order the hand happened to draw them in.
  const clusters: { ids: string[]; box: ReturnType<typeof boxOf>; geometry: THREE.BufferGeometry }[] = [];
  let broken: string | null = null;
  for (const b of built) {
    const box = boxOf(b.claim.id);
    const into = clusters.find((c) => !apart(c.box, box));
    if (!into) {
      clusters.push({ ids: [b.claim.id], box, geometry: b.geometry });
      continue;
    }
    into.ids.push(b.claim.id);
    into.box = {
      minU: Math.min(into.box.minU, box.minU),
      maxU: Math.max(into.box.maxU, box.maxU),
      minV: Math.min(into.box.minV, box.minV),
      maxV: Math.max(into.box.maxV, box.maxV),
    };
    const r = intersect(into.geometry, b.geometry);
    if (r.ok) into.geometry = r.geometry;
    else if (!broken) broken = r.error;
  }

  let geometry: THREE.BufferGeometry | null = null;
  for (const c of clusters) {
    if (!geometry) {
      geometry = c.geometry;
      continue;
    }
    const r = union(geometry, c.geometry);
    if (r.ok) geometry = r.geometry;
    else if (!broken) broken = `${what}: ${r.error}`;
  }
  return { geometry, broken };
}

/**
 * The mesh, derived by WALKING THE TREE (invariant 4).
 *
 * Steps are evaluated in order into a map of step id → body; a step that names
 * an `on` takes that body and changes it; the tree's answer is the ROOT, the
 * step nothing else consumes. `cut(extrude(…), feature, depth)` is therefore
 * two entries in a flat array and one edge between them, and a version is an
 * append rather than a rewrite.
 *
 * **A boolean that fails does not take the board down** (§10). The body stays
 * exactly as it was, the tree records the intent it always did, and the reason
 * is carried out of here for the panel and the status line to say.
 */
export function deriveTree(tree: OpTree, ctx: DeriveContext = {}): Derived {
  const bodies = new Map<string, THREE.BufferGeometry>();
  const diffs: { stepId: string; diff: Diff }[] = [];
  const parts: NonNullable<Derived['parts']> = [];
  let broken: string | null = null;

  /** A step that carries a colour word contributes its own volume, painted. */
  const paint = (step: OpStep, geometry: THREE.BufferGeometry | null) => {
    const colour = colourOf(step.material);
    if (!colour || !geometry) return;
    parts.push({ stepId: step.id, ...(step.name ? { name: step.name } : {}), colour, geometry });
  };

  for (const step of tree.steps) {
    if (step.op === 'place') {
      const inner = deriveTree({ mm: 'op', version: 1, steps: (step as PlaceStep).steps }, ctx);
      if (inner.broken && !broken) broken = inner.broken;
      if (!inner.geometry) continue;
      const g = inner.geometry.clone();
      // P6: a placement OF a definition — the pose is re-derived from the two
      // inks the step names, never read out of the step (invariant 4).
      const pose = placementMatrix(step as PlaceStep, ctx);
      if (pose.broken) {
        if (!broken) broken = pose.broken;
        continue;
      }
      if (pose.matrix) {
        g.applyMatrix4(pose.matrix);
        g.computeVertexNormals();
      } else g.translate(step.offset.x, step.offset.y, step.offset.z);
      const body = step.on ? bodies.get(step.on) : null;
      // A dup's copy stands BESIDE the body by the body's own width, so the two
      // are disjoint by construction — they are merged rather than unioned.
      // Asking a boolean library to weld two shapes that do not touch is work
      // that can only fail; a merge cannot.
      bodies.set(step.id, body ? mergeInto([body, g]) : g);
      continue;
    }

    if (step.op === 'massing' && !step.on) {
      const r = massingGeometry(step);
      if (r.geometry) {
        bodies.set(step.id, r.geometry);
        paint(step, r.geometry);
      }
      if (r.broken && !broken) broken = r.broken;
      continue;
    }

    if (step.op === 'hull') {
      const r = hullBody(step.claims, step.footprint, 'hull');
      if (r.geometry) {
        bodies.set(step.id, r.geometry);
        paint(step, r.geometry);
      }
      if (r.broken && !broken) broken = r.broken;
      continue;
    }

    if (!step.on) {
      const g = placed(step);
      if (g) bodies.set(step.id, g);
      else if (!broken) broken = `the ${step.op} step ${step.id} derives no geometry — no package has filled that row yet`;
      if (g) paint(step, g);
      continue;
    }

    const body = bodies.get(step.on);
    if (!body) {
      if (!broken) broken = `${step.op} ${step.id} acts on ${step.on}, and that step has no body`;
      continue;
    }

    if (step.op === 'cut' || step.op === 'boss') {
      const tool = placed(step);
      if (!tool) {
        if (!broken) broken = `the ${step.op}'s own tool has no geometry — the feature's clean form is degenerate`;
        bodies.set(step.id, body);
        continue;
      }
      const r = step.op === 'cut' ? subtract(body, tool) : union(body, tool);
      // A boss's own tool IS the material it added, so that is what a colour
      // word on the step is about. A colour on a cut is a word about a hole.
      if (step.op === 'boss') paint(step, tool);
      // The body STAYS AS IT WAS on a failure. A solid that vanished because a
      // library complained would be the log lying about what the hand made.
      bodies.set(step.id, r.ok ? r.geometry : body);
      if (!r.ok && !broken) broken = r.error;
      continue;
    }

    if (step.op === 'massing') {
      // The clip: §6's extent invariant, literal. Nothing derived is held —
      // the volume is another step's BODY, re-derived every walk.
      const bound = step.bound ? bodies.get(step.bound) : null;
      if (!bound) {
        bodies.set(step.id, body);
        if (!broken) broken = `the clip ${step.id} is bound to ${step.bound ?? 'no step'}, and that step has no body — the proposal stands unclipped`;
        continue;
      }
      const r = intersect(body, bound);
      bodies.set(step.id, r.ok ? r.geometry : body);
      if (!r.ok && !broken) broken = r.error;
      continue;
    }

    if (step.op === 'match') {
      const r = matchInto(body, step, ctx);
      bodies.set(step.id, r.geometry);
      if (r.diff) diffs.push({ stepId: step.id, diff: r.diff });
      if (r.broken && !broken) broken = r.broken;
      continue;
    }

    if (step.op === 'mirror') {
      const m = (step as MirrorStep).plane;
      const other = flipWinding(body.clone().applyMatrix4(reflectionOf(m)));
      const r = union(body, other);
      bodies.set(step.id, r.ok ? r.geometry : body);
      if (!r.ok && !broken) broken = r.error;
      continue;
    }

    // A row no package has filled: the body passes through unchanged, and the
    // panel says which step was a no-op rather than silently dropping it.
    bodies.set(step.id, body);
    if (!broken) broken = `${step.op} is in the tree and has no geometry yet — the body is what it was`;
  }

  const root = rootOf(tree);
  const geometry = root ? bodies.get(root.id) ?? null : null;
  return { geometry, broken, ...(diffs.length ? { diffs } : {}), ...(parts.length ? { parts } : {}) };
}

export interface SolidOptions {
  space: Space;
  log: Log;
  colours: Colours;
  /**
   * G3: volumes to paint that the TREE does not know about — a colour word
   * bound to a PART of a hull, whose body is cut out of the derived geometry
   * and so cannot be a `paint` inside the walk.
   *
   * It is handed the geometry it was just derived from rather than asked to
   * look it up, because at this point the build has not been recorded yet and
   * `geometryOf` would answer about the version before it. Optional: nothing
   * about a solid depends on anyone filling it.
   */
  painted?(
    solid: Solid,
    geometry: THREE.BufferGeometry
  ): { stepId: string; name?: string; colour: string; geometry: THREE.BufferGeometry }[];
}

export function createSolids(o: SolidOptions): Solids {
  const { space, log } = o;
  let cols = o.colours;
  const group = new THREE.Group();
  group.name = 'solids';
  space.scene.add(group);

  const built = new Map<
    string,
    {
      mesh: THREE.Mesh;
      edges: THREE.LineSegments;
      /** P5: one mesh per step that carries a material — *green turret tops*. */
      parts: THREE.Mesh[];
      signature: string;
      broken: string | null;
    }
  >();
  /** Said once per broken derivation, by whoever installed it — not on every re-render. */
  let onBroken: ((id: string, why: string) => void) | null = null;

  function materials() {
    // A quiet material from the tokens: the recessed ground, lit. The polygon
    // offset pushes the faces back so ink lying ON a face never fights it.
    const face = new THREE.MeshStandardMaterial({
      color: new THREE.Color(cols.paperDk),
      roughness: 0.8,
      metalness: 0.02,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: 2,
      polygonOffsetUnits: 2,
    });
    const edge = new THREE.LineBasicMaterial({
      color: new THREE.Color(cols.ink4),
      transparent: true,
      opacity: 1,
    });
    return { face, edge };
  }

  /**
   * What a solid's mesh depends on: rebuild only when the tree actually moved.
   *
   * A `match` step is the one step whose derivation depends on something OUTSIDE
   * the tree — the profile's ink, which the step deliberately does not hold — so
   * a tree that carries one signs the ink it references too. Without this, ink
   * redrawn or undone under a match would leave the old body standing and
   * nothing would say why.
   */
  function signatureOf(s: Solid): string {
    const tree = JSON.stringify(s.tree);
    if (!s.tree.steps.some((st) => st.op === 'match')) return tree;
    const ink = strokesOf(s.tree)
      .map((id) => {
        const m = log.markOf(id);
        if (!m) return `${id}:gone`;
        const p = m.points[0];
        const q = m.points[m.points.length - 1];
        return `${id}:${m.points.length}:${p.x.toFixed(3)},${p.y.toFixed(3)}:${q.x.toFixed(3)},${q.y.toFixed(3)}`;
      })
      .join('|');
    return `${tree}#${ink}`;
  }

  /**
   * The derivation's two seams, filled in (invariant 4: nothing derived is
   * stored, so everything derived has to be askable for).
   */
  const context: DeriveContext = {
    inkOf: (id) => log.inkFor(id),
    silhouetteOf: (geometry, plane) => silhouetteOnPlane(space.renderer, geometry, plane),
  };

  /** `solid | tree | plane frame` → the silhouette. A render is not a thing to do on hover. */
  const silhouettes = new Map<string, PlaneSilhouette | null>();

  function drop(id: string) {
    const b = built.get(id);
    if (!b) return;
    group.remove(b.mesh, b.edges);
    for (const part of b.parts) {
      group.remove(part);
      part.geometry.dispose();
      (part.material as THREE.Material).dispose();
    }
    b.mesh.geometry.dispose();
    b.edges.geometry.dispose();
    (b.mesh.material as THREE.Material).dispose();
    (b.edges.material as THREE.Material).dispose();
    built.delete(id);
  }

  function build(s: Solid) {
    // DATA-1: an artifact whose own tree would not read has no steps to walk,
    // and the validator's reason is the truth about it — not "the tree derived
    // no geometry", which is what a body that WAS read and came to nothing
    // says. It is isolated here: no mesh, one reason, and the board goes on.
    if (s.broken) {
      built.set(s.id, {
        mesh: new THREE.Mesh(),
        edges: new THREE.LineSegments(),
        parts: [],
        signature: signatureOf(s),
        broken: s.broken,
      });
      onBroken?.(s.id, s.broken);
      return;
    }
    // The tree is walked, not flattened: `cut(extrude(…))` is one body, not two
    // bodies standing in the same place (`deriveTree`).
    const { geometry: geo, broken, parts } = deriveTree(s.tree, context);
    if (!geo) {
      // Nothing to stand up. The tree is still the truth of the thing and the
      // panel says what went wrong; the board goes on drawing.
      built.set(s.id, {
        mesh: new THREE.Mesh(),
        edges: new THREE.LineSegments(),
        parts: [],
        signature: signatureOf(s),
        broken: broken ?? 'the tree derived no geometry',
      });
      if (broken) onBroken?.(s.id, broken);
      return;
    }
    const { face, edge } = materials();
    const mesh = new THREE.Mesh(geo, face);
    mesh.userData = { solid: s.id };
    mesh.renderOrder = 1;
    const edges = new THREE.LineSegments(hardEdges(geo), edge);
    edges.renderOrder = 2;
    group.add(mesh, edges);
    // The materials a word bound to a step, each drawn as the volume that step
    // contributed. Not pickable — a tap is about the solid, not about a word
    // said over part of it — so they carry no `userData.solid`.
    const painted: THREE.Mesh[] = [];
    // …and the volumes the tree does not know about: a colour word said about a
    // PART of a hull, whose body is a cut of this very geometry (G3).
    const said = (() => {
      try {
        return o.painted?.(s, geo) ?? [];
      } catch {
        // A boolean that will not come off is never a reason for a body to
        // vanish; the part simply goes unpainted.
        return [];
      }
    })();
    for (const part of [...(parts ?? []), ...said]) {
      const m = new THREE.Mesh(
        part.geometry,
        new THREE.MeshStandardMaterial({
          color: new THREE.Color(part.colour),
          roughness: 0.75,
          metalness: 0.02,
          side: THREE.DoubleSide,
          polygonOffset: true,
          polygonOffsetFactor: 1,
          polygonOffsetUnits: 1,
        })
      );
      m.renderOrder = 1;
      m.userData = { part: part.stepId, of: s.id };
      group.add(m);
      painted.push(m);
    }
    built.set(s.id, { mesh, edges, parts: painted, signature: signatureOf(s), broken });
    if (broken) onBroken?.(s.id, broken);
  }

  function sync() {
    const solids = log.solids();
    const seen = new Set<string>();
    let moved = false;
    for (const s of solids) {
      seen.add(s.id);
      const existing = built.get(s.id);
      if (existing && existing.signature === signatureOf(s)) continue;
      if (existing) drop(s.id);
      build(s);
      moved = true;
    }
    for (const id of [...built.keys()]) if (!seen.has(id)) { drop(id); moved = true; }
    // A silhouette is a picture of a body that no longer stands.
    if (moved) silhouettes.clear();
    space.render();
  }

  /**
   * The solid, seen flat on a plane. Cached: the diff's row, the form rung's
   * "is this a profile OF that solid" test and the panel all ask for the same
   * picture, and an offscreen render per hover is a render per hover.
   */
  function silhouetteOn(id: string, plane: Plane): PlaneSilhouette | null {
    const b = built.get(id);
    if (!b || !b.mesh.parent) return null;
    const key = `${id}|${b.signature.length}:${hash(b.signature)}|${planeKey(plane)}`;
    if (silhouettes.has(key)) return silhouettes.get(key) ?? null;
    const out = silhouetteOnPlane(space.renderer, b.mesh.geometry, plane);
    silhouettes.set(key, out);
    // The offscreen pass left the live picture behind it; put it back.
    space.render();
    return out;
  }

  function paint(c: Colours) {
    cols = c;
    built.forEach((b) => {
      (b.mesh.material as THREE.MeshStandardMaterial).color.set(cols.paperDk);
      (b.edges.material as THREE.LineBasicMaterial).color.set(cols.ink4);
    });
  }

  /** The meshes actually in the scene — a solid whose tree derived nothing has a placeholder. */
  const standing = () => [...built.values()].filter((b) => !!b.mesh.parent).map((b) => b.mesh);

  function pick(screen: Point): string | null {
    const rect = space.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((screen.x - rect.left) / rect.width) * 2 - 1,
      -((screen.y - rect.top) / rect.height) * 2 + 1
    );
    const caster = new THREE.Raycaster();
    caster.setFromCamera(ndc, space.camera);
    const hits = caster.intersectObjects(standing(), false);
    return (hits[0]?.object.userData as { solid?: string } | undefined)?.solid ?? null;
  }

  /**
   * The faces under the pen — `face`, the first row of §2.1's table.
   *
   * A face is a PLANE plus its own extent, and both come off the mesh the
   * tree derived: the hit triangle's normal is the plane's, and every vertex
   * of that mesh lying flat on it is a corner of the face. The extent is what
   * the scorer anchors on ("the stroke's bounds lie on geometry in that
   * plane"), so a circle drawn on a box's top reads `face` and the same
   * circle drawn past its edge does not.
   */
  function facesAt(screen: Point): FaceRef[] {
    const rect = space.canvas.getBoundingClientRect();
    const ndc = new THREE.Vector2(
      ((screen.x - rect.left) / rect.width) * 2 - 1,
      -((screen.y - rect.top) / rect.height) * 2 + 1
    );
    const caster = new THREE.Raycaster();
    caster.setFromCamera(ndc, space.camera);
    const hits = caster.intersectObjects(standing(), false);
    const dir = caster.ray.direction;
    const out: FaceRef[] = [];
    for (const hit of hits) {
      if (out.length >= FACES_OFFERED) break;
      const solidId = (hit.object.userData as { solid?: string }).solid;
      if (!solidId || !hit.face) continue;
      // The material is double-sided, so a hit from behind reports the normal
      // pointing away; the face the pen is on is the one facing the pen.
      const n0 = hit.face.normal.clone().transformDirection(hit.object.matrixWorld).normalize();
      if (n0.dot(dir) > 0) n0.negate();
      const normal = { x: n0.x, y: n0.y, z: n0.z };
      const at = { x: hit.point.x, y: hit.point.y, z: hit.point.z };
      const geo = (hit.object as THREE.Mesh).geometry;
      geo.computeBoundingBox();
      const diag = geo.boundingBox ? geo.boundingBox.getSize(new THREE.Vector3()).length() : 1;
      const eps = Math.max(1e-5, diag * FACE_FLATNESS);
      const pos = geo.getAttribute('position');
      const corners: Vec3[] = [];
      const v = new THREE.Vector3();
      for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos as THREE.BufferAttribute, i).applyMatrix4(hit.object.matrixWorld);
        const p = { x: v.x, y: v.y, z: v.z };
        if (Math.abs(dot({ x: p.x - at.x, y: p.y - at.y, z: p.z - at.z }, normal)) > eps) continue;
        if (corners.some((c) => Math.abs(c.x - p.x) < eps && Math.abs(c.y - p.y) < eps && Math.abs(c.z - p.z) < eps)) continue;
        corners.push(p);
      }
      out.push({ solidId, at, normal, corners });
    }
    return out;
  }

  function boundsOf(id: string): THREE.Box3 | null {
    const b = built.get(id);
    if (!b || !b.mesh.parent) return null;
    return new THREE.Box3().setFromObject(b.mesh);
  }

  function geometryOf(id: string): THREE.BufferGeometry | null {
    const b = built.get(id);
    return b && b.mesh.parent ? b.mesh.geometry : null;
  }

  function signatureFor(id: string): string | null {
    return built.get(id)?.signature ?? null;
  }

  /**
   * How far the solid reaches along a direction — the span a cut goes THROUGH
   * when no extent said how deep. Measured on its own bounding box, which for
   * a direction is the sum of the box's sides projected onto it.
   */
  function spanAlong(id: string, direction: Vec3): number {
    const b = boundsOf(id);
    if (!b || b.isEmpty()) return 0;
    const size = b.getSize(new THREE.Vector3());
    const n = normalize(direction);
    return Math.abs(size.x * n.x) + Math.abs(size.y * n.y) + Math.abs(size.z * n.z);
  }

  /**
   * The solid's outline on screen, as a closed loop — what a scratch's
   * crossings are counted against (§8).
   *
   * The mesh's own vertices are projected and taken round by a 2D convex hull.
   * **It is a hull, not a true silhouette**: a concave solid's dent is inside
   * it, so a scratch through the mouth of a C counts as crossing the C. Good
   * enough for this rung — erasing is a coarse act and the rule degrades the
   * safe way (it takes three crossings either way) — and it is one function to
   * replace when a real silhouette is wanted.
   */
  function silhouetteOf(id: string, pose?: Pose): Point[] | null {
    const b = built.get(id);
    if (!b || !b.mesh.parent) return null;
    const pos = b.mesh.geometry.getAttribute('position') as THREE.BufferAttribute | undefined;
    if (!pos || pos.count < 3) return null;
    const v = new THREE.Vector3();
    const pts: Point[] = [];
    // A whole mesh may be tens of thousands of vertices and a hull needs none
    // of that resolution; every nth is plenty for an outline.
    const stride = Math.max(1, Math.floor(pos.count / 600));
    for (let i = 0; i < pos.count; i += stride) {
      v.fromBufferAttribute(pos, i).applyMatrix4(b.mesh.matrixWorld);
      const w = { x: v.x, y: v.y, z: v.z };
      pts.push(pose ? space.projectForPose(pose, w) : space.project(w));
    }
    const hull = convexHull(pts);
    if (hull.length < 3) return null;
    return [...hull, hull[0]]; // closed, so a crossing count sees every wall
  }

  function rayDown(at: { x: number; z: number }): { solidId: string; y: number } | null {
    const caster = new THREE.Raycaster(new THREE.Vector3(at.x, 1000, at.z), new THREE.Vector3(0, -1, 0));
    const hits = caster.intersectObjects(standing(), false);
    const hit = hits[0];
    if (!hit) return null;
    const solidId = (hit.object.userData as { solid?: string }).solid;
    return solidId ? { solidId, y: hit.point.y } : null;
  }

  function brokenOf(id: string): string | null {
    return built.get(id)?.broken ?? null;
  }

  log.subscribe(sync);
  sync();

  return {
    group,
    sync,
    paint,
    pick,
    facesAt,
    boundsOf,
    geometryOf,
    signatureOf: signatureFor,
    spanAlong,
    silhouetteOf,
    silhouetteOn,
    rayDown,
    brokenOf,
    onBroken: (fn: (id: string, why: string) => void) => { onBroken = fn; },
    ids: () => [...built.keys()],
  };
}

/**
 * The 2D convex hull of a set of screen points (Andrew's monotone chain).
 *
 * Pure, and here rather than in a geometry module because the silhouette is
 * the only thing in the shard that wants one.
 */
export function convexHull(points: Point[]): Point[] {
  const pts = [...points]
    .filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y))
    .sort((a, b) => a.x - b.x || a.y - b.y);
  if (pts.length < 3) return pts;
  const cross2 = (o: Point, a: Point, b: Point) =>
    (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);
  const lower: Point[] = [];
  for (const p of pts) {
    while (lower.length >= 2 && cross2(lower[lower.length - 2], lower[lower.length - 1], p) <= 0) lower.pop();
    lower.push(p);
  }
  const upper: Point[] = [];
  for (let i = pts.length - 1; i >= 0; i--) {
    const p = pts[i];
    while (upper.length >= 2 && cross2(upper[upper.length - 2], upper[upper.length - 1], p) <= 0) upper.pop();
    upper.push(p);
  }
  lower.pop();
  upper.pop();
  return lower.concat(upper);
}
