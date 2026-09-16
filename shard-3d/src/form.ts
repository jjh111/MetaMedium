// ===== form =====
// What a mark PLAYS in space — the form rung (SHARD-3D-PLAN §2.3).
//
// The shape rung says *rectangle*; this rung says *profile*. It is the sibling
// of the diagram rung (`metamedium-core/src/diagram/roles.ts`) and it is read
// the same way: a CLOSED vocabulary of seven, placed by a table read top to
// bottom, first match wins, and a mark no row places is `annotation` — said
// out loud, never silently dropped.
//
// Two rules the whole file obeys:
//
//   * **Every threshold is a ratio of the marks' own size** (invariant 8).
//     There is not one pixel count in here. A plane's u and v axes are unit
//     vectors, so a plane unit IS a world unit and a size measured on the
//     plane compares straight across planes.
//   * **Every reading says why** (invariant 2), in the terms it was measured
//     in, so a wrong row is arguable rather than mysterious.
//
// No three.js, and nothing from the session: the inputs are the marks with
// their engine readings, their planes and their ink. That is what makes this
// the second thing §11 can land back in core.

import { countCrossings, DEFAULT_ERASE_CROSSINGS, type Point } from 'metamedium-core';
import { overlapOf, viewNameOf } from './diff';
import {
  add,
  dot,
  length,
  mul,
  normalize,
  offsetOf,
  sub,
  toWorld,
  uAxis,
  vAxis,
  type Plane,
  type Vec3,
} from './plane';

/** The closed vocabulary. It grows only by a release (§2.6). */
export type FormRole =
  | 'gesture'
  | 'profile'
  | 'feature'
  | 'extent'
  | 'axis'
  | 'path'
  | 'label'
  | 'annotation';

export const FORM_ROLES: readonly FormRole[] = [
  'gesture',
  'profile',
  'feature',
  'extent',
  'axis',
  'path',
  'label',
  'annotation',
];

export interface FormReading {
  id: string;
  role: FormRole;
  /** Which row of the table placed it. 0 = none did, and it is an `annotation`. */
  rule: number;
  /** 0–1, from the measurements the row used — never a constant handed out. */
  confidence: number;
  /** Why, in the terms it was measured in. */
  reasoning: string;
  /** What it grows from (extent), turns about (axis), or names (label). */
  targets: string[];
  /**
   * P4: the solid this closed mark is a PROFILE OF — its outline overlaps that
   * solid's silhouette on the plane it was drawn on. It is still a `profile`;
   * it is just not the start of a new one, and nothing is waiting for an extent
   * beside it. What it affords instead is the diff (§4).
   */
  against?: {
    solidId: string;
    name: string;
    /** `top` / `front` / `side`, or the plane's own name. */
    view: string;
    iou: number;
    why: string;
  };
}

/** The face a mark was drawn on, when its plane was READ as one (§2.1's first row). */
export interface FaceOn {
  solidId: string;
  /** What the face is called: `top of artifact:7`. */
  label: string;
  /** The face's own extent, in the SAME plane coordinates the mark's points are in. */
  bounds: { minX: number; minY: number; maxX: number; maxY: number };
}

/** A solid's outline in the screen space of the view a mark was drawn in. */
export interface Silhouette {
  solidId: string;
  name: string;
  /** Closed, so a crossing count sees every wall. */
  outline: Point[];
}

/** A mark as the form rung needs it: its shape reading, its plane, its ink. */
export interface FormMark {
  id: string;
  /** The engine's top shape reading — 'rectangle', 'line', 'text', … or '' when the rung placed nothing. */
  shape: string;
  /** That reading's confidence. */
  confidence: number;
  closed: boolean;
  plane: Plane;
  /** The ink in the plane's own (u, v). */
  points: Point[];
  /** The mark's size in plane units, as the engine's fingerprint measured it. */
  size: number;
  /**
   * The face this mark's plane was read off, when it was (row 3). The bounds
   * are the face's own, in the mark's own plane coordinates — a face plane is
   * infinite and a face is not, which is the whole difference between a
   * feature ON a face and a mark that merely lies in the same plane.
   */
  face?: FaceOn;
  /** The screen path as the hand drew it — what row 1 counts crossings with. */
  screen?: Point[];
  /** The solids standing in THAT view, as outlines in the same screen space (row 1). */
  silhouettes?: Silhouette[];
  /** The solids this mark was taken into. Its own ink is provenance, never a gesture against them. */
  partOf?: string[];
  /**
   * P4: the solids standing on THIS mark's own plane, as orthographic
   * silhouettes in the same (u, v) the mark's points are in — the evidence row
   * 2 reads to tell a profile OF a solid from the start of a new one. The
   * projection is along the plane's normal, so how far the plane has been slid
   * along it does not enter into it.
   */
  solidsOnPlane?: { solidId: string; name: string; outlines: Point[][] }[];
}

/**
 * A solid already standing, for the rows that read against one. Row 6 (P7)
 * is still the one row nothing fills.
 */
export interface SolidRef {
  id: string;
  /** The marks it was made from. */
  memberIds: string[];
}

export interface FormScope {
  marks: FormMark[];
  solids?: SolidRef[];
  /** What stands selected, for row 1's gesture test. */
  selection?: string[];
}

// ---- the thresholds, every one a ratio -------------------------------------

/** An extent's end lies ON a profile's edge within this fraction of the profile's own size. */
export const ON_EDGE = 0.22;
/** Two planes are roughly perpendicular when |cos| between their normals is below this. */
export const PERPENDICULAR = 0.4;
/** …and the extent LEAVES the profile's plane when its far end sits this far off it, as a fraction of the extent's own length. */
export const LEAVES_PLANE = 0.45;
/** Two planes are the same plane when |cos| between their normals is above this… */
export const COPLANAR = 0.98;
/** …and the mark lies in it within this fraction of its own length. */
export const IN_PLANE = 0.15;
/** A line is roughly parallel to an edge when |cos| with that edge is above this. */
export const PARALLEL = 0.9;
/** An axis lies BESIDE a profile within this many of the profile's own sizes. */
export const BESIDE = 1.8;
/** A label sits within this many of its own sizes of what it names. */
export const LABEL_NEAR = 1.4;
/**
 * How much of a feature's ink has to lie inside the face it is drawn on.
 * A face's plane is infinite and the face is not: a circle half off the edge
 * is not a hole in that face, it is a mark that happens to be coplanar with it.
 */
export const INSIDE_FACE = 0.9;
/** Crossings of a solid's silhouette before a stroke is read as scratching it out. */
export const SCRATCH_CROSSINGS = DEFAULT_ERASE_CROSSINGS;
/** Crossings that are one pass short — what the canvas says *one more pass* about. */
export const SCRATCH_NEAR = SCRATCH_CROSSINGS - 1;

// ---- geometry, in world units ----------------------------------------------

const CLOSED_SHAPES = new Set(['rectangle', 'circle', 'triangle']);
const LINEAR_SHAPES = new Set(['line', 'arrow']);
const WRITING_SHAPES = new Set(['text', 'word', 'dot']);

/** The mark's ink in world space. */
export function outlineOf(mark: FormMark): Vec3[] {
  return mark.points.map((p) => toWorld(mark.plane, p));
}

function bounds2(points: Point[]) {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY };
}

/** The shortest distance from a world point to a segment. */
function distToSegment(p: Vec3, a: Vec3, b: Vec3): number {
  const ab = sub(b, a);
  const len2 = dot(ab, ab);
  if (len2 < 1e-12) return length(sub(p, a));
  const t = Math.max(0, Math.min(1, dot(sub(p, a), ab) / len2));
  return length(sub(p, add(a, mul(ab, t))));
}

/** The shortest distance from a world point to a polyline. */
export function distanceToOutline(p: Vec3, outline: Vec3[]): number {
  let best = Infinity;
  for (let i = 0; i < outline.length - 1; i++) {
    const d = distToSegment(p, outline[i], outline[i + 1]);
    if (d < best) best = d;
  }
  if (outline.length === 1) return length(sub(p, outline[0]));
  return best;
}

/** A mark's two ends, in world space. */
function endsOf(mark: FormMark): { start: Vec3; end: Vec3; length: number } {
  const out = outlineOf(mark);
  const start = out[0];
  const end = out[out.length - 1];
  return { start, end, length: length(sub(end, start)) };
}

/** A mark's centre, in world space — the centre of the box its ink fills. */
export function centreOf(mark: FormMark): Vec3 {
  const b = bounds2(mark.points);
  return toWorld(mark.plane, { x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 });
}

/** Is `inner` wholly inside `outer`'s box, in `outer`'s own plane? */
function insideBox(outer: FormMark, inner: FormMark): boolean {
  if (Math.abs(dot(normalize(outer.plane.normal), normalize(inner.plane.normal))) < COPLANAR) return false;
  const o = bounds2(outer.points);
  // Project the inner mark into the outer's plane — they are coplanar, so
  // this is exact up to the slide between two parallel planes.
  const pts = outlineOf(inner).map((w) => {
    const d = sub(w, outer.plane.origin);
    return { x: dot(d, uAxis(outer.plane)), y: dot(d, vAxis(outer.plane)) };
  });
  const i = bounds2(pts);
  return i.minX >= o.minX && i.maxX <= o.maxX && i.minY >= o.minY && i.maxY <= o.maxY;
}

/** The gap between a segment and a box, in one plane's own units. 0 when they meet. */
function gapToBox(a: Point, b: Point, box: ReturnType<typeof bounds2>): number {
  // Sample the segment: a polyline against a box needs no exact clipping to
  // answer "how far beside it", and sampling keeps the rule readable.
  let best = Infinity;
  const N = 24;
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const x = a.x + (b.x - a.x) * t;
    const y = a.y + (b.y - a.y) * t;
    const dx = Math.max(box.minX - x, 0, x - box.maxX);
    const dy = Math.max(box.minY - y, 0, y - box.maxY);
    const d = Math.hypot(dx, dy);
    if (d < best) best = d;
  }
  return best;
}

// ---- the table --------------------------------------------------------------

const isClosedShape = (m: FormMark) => m.closed || CLOSED_SHAPES.has(m.shape);
const isLinear = (m: FormMark) => LINEAR_SHAPES.has(m.shape);
const isWriting = (m: FormMark) => WRITING_SHAPES.has(m.shape);
const isDrawnOn = (m: FormMark) => m.plane.source === 'chosen' || m.plane.source === 'world';

/**
 * Row 1 — the gesture: a stroke that SCRATCHES a solid out.
 *
 * Relational, not gestural, and it is core's own rule unchanged
 * (`session/erase.ts`): count the crossings between the stroke and the
 * target's own outline; three erases it. No speed, no density, no size
 * constant to tune, and it degrades honestly — a line drawn *through* a solid
 * crosses twice and is safe. The outline here is the solid's **silhouette in
 * the view the stroke was drawn in**, which is what "across a solid" means on
 * a screen; §3 calls this layer the command and comment layer, and the view
 * plane is where a hand draws on it.
 *
 * Two rules keep it safe, and they are the two the canvas learned:
 *
 *   * **A CLOSED stroke is never a scratch.** It is a lasso. Closure does most
 *     of the discriminating everywhere else in the engine.
 *   * **Ink ON a solid's own face is never a scratch.** It is a `feature` —
 *     row 3 — and it is drawn where it is precisely because it is about that
 *     face. This is the rule that makes the row safe to read on any plane
 *     rather than only on the view plane: a circle on a box's top crosses its
 *     silhouette not at all, and a line drawn on the face never counts.
 */
export function scratchAgainst(mark: FormMark): { solidId: string; name: string; crossings: number } | null {
  if (mark.closed || !mark.screen || mark.screen.length < 3 || !mark.silhouettes?.length) return null;
  let best: { solidId: string; name: string; crossings: number } | null = null;
  for (const s of mark.silhouettes) {
    // Ink on that solid's own face is about the face, never across the thing;
    // and the ink a solid was MADE from is its provenance, never a scratch at it.
    if (mark.face?.solidId === s.solidId) continue;
    if (mark.partOf?.includes(s.solidId)) continue;
    const n = countCrossings(mark.screen, s.outline, SCRATCH_CROSSINGS);
    if (!best || n > best.crossings) best = { solidId: s.solidId, name: s.name, crossings: n };
  }
  return best && best.crossings > 0 ? best : null;
}

function gestureReading(mark: FormMark): FormReading | null {
  const hit = scratchAgainst(mark);
  if (!hit || hit.crossings < SCRATCH_CROSSINGS) return null;
  return {
    id: mark.id,
    role: 'gesture',
    rule: 1,
    // Measured: every crossing past the third is more certain, capped.
    confidence: Math.min(0.95, 0.7 + (hit.crossings - SCRATCH_CROSSINGS) * 0.08),
    reasoning:
      `an open ${mark.shape || 'stroke'} on the ${mark.plane.name ?? mark.plane.source} that crosses ` +
      `${hit.name}'s silhouette ${hit.crossings} time${hit.crossings === 1 ? '' : 's'} ` +
      `(${SCRATCH_CROSSINGS} erases it) — a scratch, the canvas's own layer`,
    targets: [hit.solidId],
  };
}

/**
 * Row 3 — the feature: a closed shape drawn ON a solid's face, inside it.
 *
 * Unlike a profile with an extent, a feature is **not acted on**: a hole and a
 * boss are two different intentions and the drawing does not say which, so the
 * field offers both and the hand decides. That is the whole reason this row is
 * separate from row 2 rather than a case of it.
 *
 * The two rows cannot both match, whatever order they are read in: row 2 wants
 * a `chosen` or `world` plane and this one wants a `face`, and a plane has one
 * source. §2.3's "row 3 beats row 2" is therefore a fact about the table, not
 * a tie-break that had to be implemented.
 */
function featureReading(mark: FormMark): FormReading | null {
  if (!isClosedShape(mark) || mark.plane.source !== 'face' || !mark.face) return null;
  const b = mark.face.bounds;
  const inside = mark.points.filter((p) => p.x >= b.minX && p.x <= b.maxX && p.y >= b.minY && p.y <= b.maxY).length /
    Math.max(1, mark.points.length);
  if (inside < INSIDE_FACE) return null;
  return {
    id: mark.id,
    role: 'feature',
    rule: 3,
    confidence: Math.min(0.95, 0.5 + mark.confidence * 0.3 + inside * 0.15),
    reasoning:
      `a closed ${mark.shape || 'mark'} ${mark.confidence.toFixed(2)} drawn on the ${mark.face.label}, ` +
      `${(inside * 100).toFixed(0)}% of its ink inside that face (over ${(INSIDE_FACE * 100).toFixed(0)}%) — ` +
      `a cut or a boss on it, and the drawing does not say which`,
    targets: [mark.face.solidId],
  };
}

/**
 * Row 2, on its own: a closed mark on a chosen or world plane with nothing
 * inside it. It is computed first because rows 4 and 5 read against the set
 * of profiles — the table is still read top to bottom per mark, but "is there
 * a profile here" is a fact about the whole scope, not about one mark.
 */
function profileReading(scope: FormScope, mark: FormMark): FormReading | null {
  if (!isClosedShape(mark) || !isDrawnOn(mark)) return null;
  // P5: a closed shape INSIDE a profile on the same chosen or world plane is a
  // profile of its own, and the massing takes the union of a plane's profiles.
  //
  // Row 2's *nothing inside it* clause used to refuse both marks of a nest, and
  // it threw out the commonest plan there is: a castle's footprint with its
  // turrets' footprints drawn inside it. §2.3's clause is about a FACE — "only
  // a closed shape inside a face is a feature", which is row 3 and a disjoint
  // predicate (a plane has one source) — so the nest is reported rather than
  // refused, and the reasoning says how many lie inside.
  const held = scope.marks.filter((o) => o.id !== mark.id && isClosedShape(o) && insideBox(mark, o));
  const nest = held.length
    ? `, with ${held.length} profile${held.length === 1 ? '' : 's'} inside it (${held.map((h) => h.id).join(', ')}) — ` +
      `a massing takes the union of a plane's profiles, so each of them is a profile of its own`
    : ', nothing inside it'
  const conf = Math.min(0.95, 0.55 + mark.confidence * 0.4);
  const against = profileAgainst(mark);
  if (against) {
    // Still a profile, and still row 2 — but a profile OF something. No extent
    // is awaited beside it: what it affords is the diff (§4), which is a
    // question about this outline and that body, not about a line nobody drew.
    return {
      id: mark.id,
      role: 'profile',
      rule: 2,
      confidence: conf,
      reasoning:
        `a closed ${mark.shape || 'mark'} ${mark.confidence.toFixed(2)} on the ${mark.plane.name ?? 'plane'} — ` +
        `the ${against.view} profile of ${against.name}: ${against.why}. Not the start of a new solid; ` +
        `what it affords is the diff`,
      targets: [against.solidId],
      against,
    };
  }
  return {
    id: mark.id,
    role: 'profile',
    rule: 2,
    confidence: conf,
    reasoning: `a closed ${mark.shape || 'mark'} ${mark.confidence.toFixed(2)} on the ${mark.plane.name ?? 'plane'} (${mark.plane.source})${nest} — the face a solid grows from`,
    targets: [],
  };
}

/**
 * P4's rule: which solid, if any, this closed mark is a profile OF.
 *
 * The mark's own ink is laid against every solid standing on its plane,
 * orthographically along that plane's normal, and the best overlap that clears
 * `overlapOf`'s floor wins. A mark that was TAKEN into a solid is its
 * provenance, never a comment on it — the same rule row 1 keeps for a scratch.
 */
function profileAgainst(mark: FormMark): FormReading['against'] {
  if (!mark.solidsOnPlane?.length) return undefined;
  const view = viewNameOf(mark.plane.name);
  let best: NonNullable<FormReading['against']> | null = null;
  for (const s of mark.solidsOnPlane) {
    if (mark.partOf?.includes(s.solidId)) continue;
    const o = overlapOf(mark.points, s.outlines);
    if (!o.about) continue;
    if (best && o.iou <= best.iou) continue;
    best = { solidId: s.solidId, name: s.name, view, iou: o.iou, why: o.why };
  }
  return best ?? undefined;
}

/** Row 4: a line that starts on a profile's edge and leaves its plane. */
function extentReading(mark: FormMark, profiles: FormMark[]): FormReading | null {
  if (!isLinear(mark)) return null;
  const { start, end, length: len } = endsOf(mark);
  if (len < 1e-6) return null;

  let best: { p: FormMark; touch: number; away: number; perp: number; which: 'start' | 'end' } | null = null;
  for (const p of profiles) {
    if (p.id === mark.id) continue;
    const outline = outlineOf(p);
    const ds = distanceToOutline(start, outline);
    const de = distanceToOutline(end, outline);
    const which: 'start' | 'end' = ds <= de ? 'start' : 'end';
    const touch = Math.min(ds, de);
    if (touch > ON_EDGE * p.size) continue;
    // Roughly perpendicular to the profile's plane…
    const perp = Math.abs(dot(normalize(mark.plane.normal), normalize(p.plane.normal)));
    if (perp > PERPENDICULAR) continue;
    // …and it actually LEAVES that plane: the far end sits off it.
    const far = which === 'start' ? end : start;
    const away = Math.abs(offsetOf(p.plane, far));
    if (away < LEAVES_PLANE * len) continue;
    if (!best || touch / p.size < best.touch / best.p.size) best = { p, touch, away, perp, which };
  }
  if (!best) return null;
  const ratio = best.touch / best.p.size;
  const confidence = Math.min(
    0.95,
    0.45 + (1 - ratio / ON_EDGE) * 0.3 + (1 - best.perp / PERPENDICULAR) * 0.2
  );
  return {
    id: mark.id,
    role: 'extent',
    rule: 4,
    confidence,
    reasoning:
      `a ${mark.shape} whose ${best.which} lies on ${best.p.id}'s edge ` +
      `(${(ratio * 100).toFixed(0)}% of its size away, under ${(ON_EDGE * 100).toFixed(0)}%) ` +
      `on a plane ${best.perp < 0.05 ? 'square to' : 'roughly perpendicular to'} its own, ` +
      `rising ${best.away.toFixed(2)} u off it — a dimension along the normal`,
    targets: [best.p.id],
  };
}

/** Row 5: a line beside a profile, in its plane, roughly parallel to an edge. */
function axisReading(mark: FormMark, profiles: FormMark[]): FormReading | null {
  if (!isLinear(mark)) return null;
  const ends = endsOf(mark);
  if (ends.length < 1e-6) return null;

  for (const p of profiles) {
    if (p.id === mark.id) continue;
    // In the profile's plane, or not an axis of it.
    if (Math.abs(dot(normalize(mark.plane.normal), normalize(p.plane.normal))) < COPLANAR) continue;
    const off = Math.max(Math.abs(offsetOf(p.plane, ends.start)), Math.abs(offsetOf(p.plane, ends.end)));
    if (off > IN_PLANE * ends.length) continue;

    // The profile's own edges are its box's axes, in its plane's (u, v).
    const project = (w: Vec3): Point => {
      const d = sub(w, p.plane.origin);
      return { x: dot(d, uAxis(p.plane)), y: dot(d, vAxis(p.plane)) };
    };
    const a = project(ends.start);
    const b = project(ends.end);
    const dir = { x: b.x - a.x, y: b.y - a.y };
    const dl = Math.hypot(dir.x, dir.y);
    if (dl < 1e-6) continue;
    const alongU = Math.abs(dir.x) / dl;
    const alongV = Math.abs(dir.y) / dl;
    const parallel = Math.max(alongU, alongV);
    if (parallel < PARALLEL) continue;

    const box = bounds2(p.points);
    const gap = gapToBox(a, b, box);
    if (gap <= 0) continue; // it crosses the profile — that is not an axis
    if (gap > BESIDE * p.size) continue;

    const which = alongU >= alongV ? 'across' : 'up';
    return {
      id: mark.id,
      role: 'axis',
      rule: 5,
      confidence: Math.min(0.92, 0.45 + parallel * 0.3 + (1 - gap / (BESIDE * p.size)) * 0.2),
      reasoning:
        `a ${mark.shape} lying in ${p.id}'s own plane, running ${which} it ` +
        `(${(parallel * 100).toFixed(0)}% parallel to that edge, over ${(PARALLEL * 100).toFixed(0)}%), ` +
        `beside it by ${(gap / p.size).toFixed(2)} of its size — what a profile revolves around`,
      targets: [p.id],
    };
  }
  return null;
}

/** Row 7: writing near something → its name. */
function labelReading(scope: FormScope, mark: FormMark): FormReading | null {
  if (!isWriting(mark)) return null;
  const me = centreOf(mark);
  let best: { other: FormMark; d: number } | null = null;
  for (const o of scope.marks) {
    if (o.id === mark.id) continue;
    const d = distanceToOutline(me, outlineOf(o));
    if (!best || d < best.d) best = { other: o, d };
  }
  if (!best || best.d > LABEL_NEAR * Math.max(mark.size, 1e-6)) return null;
  return {
    id: mark.id,
    role: 'label',
    rule: 7,
    confidence: Math.min(0.9, 0.4 + (1 - best.d / (LABEL_NEAR * mark.size)) * 0.5),
    reasoning: `${mark.shape} ${(best.d / mark.size).toFixed(2)} of its own size from ${best.other.id} — a name, or words for *turn into*`,
    targets: [best.other.id],
  };
}

/**
 * The table, applied to one mark. Rows are numbered as in §2.3 and read top
 * to bottom; the first that matches wins.
 *
 *   1 · gesture     — P3 (the command mark, the scratch, the lasso in space)
 *   2 · profile     — here
 *   3 · feature     — P3 (a cut or a boss on a solid's face)
 *   4 · extent      — here
 *   5 · axis        — here
 *   6 · path        — P7 (a stroke on the view plane to wrap onto a thing)
 *   7 · label       — here
 *   — · annotation  — here, the fallthrough, said out loud
 */
function place(scope: FormScope, mark: FormMark, profiles: FormMark[], growable: FormMark[]): FormReading {
  // Row 1 — gesture: a stroke that crosses a solid's silhouette three times is
  // the canvas's own layer, not content about the thing.
  const gesture = gestureReading(mark);
  if (gesture) return gesture;

  // Row 2 — profile.
  const profile = profileReading(scope, mark);
  if (profile) return profile;

  // Row 3 — feature: closed, ON a solid's face, inside that face. §2.3 says it
  // beats row 2 because a circle drawn on a face is a hole before it is a new
  // solid — and the two predicates are disjoint (chosen/world vs face), so the
  // order they are read in cannot change an answer.
  const feature = featureReading(mark);
  if (feature) return feature;

  // Row 4 — extent. It reads against profiles AND features: a line from a
  // feature's edge is how deep the hole goes (§8), and `makeableFrom` is what
  // refuses to stand a new solid on one.
  const extent = extentReading(mark, growable);
  if (extent) return extent;

  // Row 5 — axis.
  const axis = axisReading(mark, profiles);
  if (axis) return axis;

  // Row 6 — path. P7 fills it: open, on the VIEW plane, crossing a solid's
  // silhouette or lying over it. The view plane arrives with P1.
  const path = null as FormReading | null;
  if (path) return path;

  // Row 7 — label.
  const label = labelReading(scope, mark);
  if (label) return label;

  // The fallthrough. Said out loud: the canvas can name a gap it cannot fill.
  return {
    id: mark.id,
    role: 'annotation',
    rule: 0,
    confidence: 0.5,
    reasoning: `a ${mark.shape || 'mark'} on the ${mark.plane.name ?? 'plane'} that no row of the form table places — held as a comment, or as art`,
    targets: [],
  };
}

/** Every mark's role, in the order they were given. */
export function assignForms(scope: FormScope): FormReading[] {
  // Row 2 is a fact about the whole scope, so the profiles are found once and
  // rows 4 and 5 read against them. Row 3's features join the set row 4 reads
  // against — a line off a feature's edge is a depth, not a new solid.
  const profileIds = new Set(
    scope.marks.filter((m) => profileReading(scope, m) !== null).map((m) => m.id)
  );
  const profiles = scope.marks.filter((m) => profileIds.has(m.id));
  const features = scope.marks.filter((m) => featureReading(m) !== null);
  const growable = [...profiles, ...features];
  return scope.marks.map((m) => place(scope, m, profiles, growable));
}

/** One line for the panel: the role, and why. */
export function describeForm(r: FormReading): string {
  return `${r.role}${r.rule ? ` · row ${r.rule}` : ' · no row'} ${r.confidence.toFixed(2)}`;
}

// ---- what the table makes ---------------------------------------------------

export type Makeable =
  | { kind: 'extrude'; profileId: string; extentId: string; reasoning: string }
  | { kind: 'revolve'; profileId: string; axisId: string; reasoning: string };

/**
 * The solids the table says can stand right now, newest partner first.
 *
 * This is tier 1 answering (invariant 7): a profile with an extent IS a box,
 * with no model and no wait. Nothing here makes anything — it reports what the
 * readings afford, and the surface acts on it.
 */
export function makeableFrom(readings: FormReading[]): Makeable[] {
  const out: Makeable[] = [];
  // A profile OF a solid is not a face to grow a second solid from: it is a
  // statement about the solid it overlaps, and §4 says no extent is awaited
  // beside it. Growing one would put a box inside the body it was correcting.
  const profiles = new Set(
    readings.filter((r) => r.role === 'profile' && !r.against).map((r) => r.id)
  );
  for (const r of readings) {
    if (r.role === 'extent' && r.targets.some((t) => profiles.has(t))) {
      out.push({
        kind: 'extrude',
        profileId: r.targets.find((t) => profiles.has(t))!,
        extentId: r.id,
        reasoning: r.reasoning,
      });
    }
    if (r.role === 'axis' && r.targets.some((t) => profiles.has(t))) {
      out.push({
        kind: 'revolve',
        profileId: r.targets.find((t) => profiles.has(t))!,
        axisId: r.id,
        reasoning: r.reasoning,
      });
    }
  }
  return out;
}

/** A feature standing on a face, and what the drawing says about how deep it goes. */
export interface FeatureOffer {
  featureId: string;
  solidId: string;
  /** The extent drawn from the feature's own edge, when there is one — it sets the depth for either verb. */
  extentId?: string;
  reasoning: string;
}

/**
 * The features on the board, with the extent beside each one if the hand drew
 * one. **Deliberately not a `Makeable`**: a profile with an extent IS a box and
 * tier 1 stands it up, but a feature is two intentions at once — a hole and a
 * boss are the same drawing — so this is offered to the field and acted on by
 * nobody until a human taps.
 */
export function featuresFrom(readings: FormReading[]): FeatureOffer[] {
  const features = readings.filter((r) => r.role === 'feature');
  return features.map((f) => {
    const extent = readings.find((r) => r.role === 'extent' && r.targets.includes(f.id));
    return {
      featureId: f.id,
      solidId: f.targets[0],
      ...(extent ? { extentId: extent.id } : {}),
      reasoning: f.reasoning,
    };
  });
}

// ---- P5: the drawing as the extent, before it has a name --------------------

/**
 * Profiles on different world planes whose projections overlap ARE a solid
 * (§2.6 rule 1). Tier 1 stands it up the moment the second one lands.
 */
export interface Massable {
  /** The profiles, in the order they were drawn. */
  profileIds: string[];
  /** Which plane each one lies on — the union per plane is what is grown. */
  planes: string[];
  reasoning: string;
}

/** The three world planes a massing is read over. A plane the gizmo does not name is not one. */
const MASSING_PLANES = ['foundation', 'height', 'width'] as const;

/** How far an infinite prism runs, for the overlap test. Bigger than any board. */
const UNBOUNDED = 1e6;

/** A profile's world box, made infinite along its own plane's normal. */
function prismBox(marks: FormMark[]): { min: Vec3; max: Vec3 } | null {
  if (!marks.length) return null;
  let min = { x: Infinity, y: Infinity, z: Infinity };
  let max = { x: -Infinity, y: -Infinity, z: -Infinity };
  for (const m of marks) {
    for (const w of outlineOf(m)) {
      min = { x: Math.min(min.x, w.x), y: Math.min(min.y, w.y), z: Math.min(min.z, w.z) };
      max = { x: Math.max(max.x, w.x), y: Math.max(max.y, w.y), z: Math.max(max.z, w.z) };
    }
  }
  // Infinite along the normal: that is what "grown through the span of the
  // others" means before the others are known, and it is what makes the
  // overlap test a question about the PROJECTIONS rather than about depth.
  const n = normalize(marks[0].plane.normal);
  const axis = Math.abs(n.x) > 0.9 ? 'x' : Math.abs(n.y) > 0.9 ? 'y' : Math.abs(n.z) > 0.9 ? 'z' : null;
  if (!axis) return null;
  min[axis] = -UNBOUNDED;
  max[axis] = UNBOUNDED;
  return { min, max };
}

/**
 * The massing the board affords, or null.
 *
 * Two or three profiles on DIFFERENT world planes whose infinite prisms share
 * a volume. Everything is measured in world units, so the rule holds across
 * planes without a constant anywhere in it; a lone profile is not a massing
 * and still waits for an extent beside it (P2), which is the whole difference
 * between "the drawing says how tall" and "the drawing says what shape".
 */
export function massableFrom(readings: FormReading[], marks: FormMark[]): Massable | null {
  const byId = new Map(marks.map((m) => [m.id, m]));
  const profiles = readings
    .filter((r) => r.role === 'profile' && !r.against)
    .map((r) => byId.get(r.id))
    .filter((m): m is FormMark => !!m && MASSING_PLANES.includes((m.plane.name ?? '') as never));

  const groups = new Map<string, FormMark[]>();
  for (const m of profiles) {
    const name = m.plane.name!;
    groups.set(name, [...(groups.get(name) ?? []), m]);
  }
  if (groups.size < 2) return null;

  // The prisms have to share a volume. Two views that do not line up are two
  // drawings of two things, and saying so beats standing up the empty set.
  let lo = { x: -UNBOUNDED, y: -UNBOUNDED, z: -UNBOUNDED };
  let hi = { x: UNBOUNDED, y: UNBOUNDED, z: UNBOUNDED };
  const sizes: string[] = [];
  for (const [name, group] of groups) {
    const box = prismBox(group);
    if (!box) return null;
    lo = { x: Math.max(lo.x, box.min.x), y: Math.max(lo.y, box.min.y), z: Math.max(lo.z, box.min.z) };
    hi = { x: Math.min(hi.x, box.max.x), y: Math.min(hi.y, box.max.y), z: Math.min(hi.z, box.max.z) };
    sizes.push(`${group.length} on the ${name}`);
  }
  if (hi.x <= lo.x || hi.y <= lo.y || hi.z <= lo.z) return null;

  const ordered = [...groups.values()].flat().sort((a, b) => profiles.indexOf(a) - profiles.indexOf(b));
  const volume = (hi.x - lo.x) * (hi.y - lo.y) * (hi.z - lo.z);
  return {
    profileIds: ordered.map((m) => m.id),
    planes: [...groups.keys()],
    reasoning:
      `${sizes.join(', ')} — profiles on ${groups.size} different world planes whose projections overlap ` +
      `(${volume.toFixed(2)} u³ of shared space). Each is grown through the span of the others along its own ` +
      `normal and the prisms are intersected: the drawing IS the extent, and it needs no name and no model`,
  };
}
