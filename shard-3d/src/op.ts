// ===== op =====
// A solid is an OP TREE (SHARD-3D-PLAN §2.4), not a mesh.
//
// Invariant 4: the log is the source and the mesh is derived. What the log
// holds is a tree of steps in a closed vocabulary, each step referencing the
// strokes it was made from — so undo, versions, the folder and replay come for
// free, ink over the result addresses the step and the stroke at once, and a
// solid made on one machine is the same solid on another.
//
// The vocabulary of §2.4 is declared WHOLE here and P0–P3 implement `extrude`,
// `revolve`, `cut`, `boss`, `mirror` and `place`, so P7 (sweep, loft) and P8
// (along) add a step rather than restructure the tree.
//
// **The tree NESTS.** `cut(extrude(…), feature, depth)` is a cut step carrying
// `on`, the id of the step it is cutting into, and the steps stay a flat array
// in the JSON because a version is an append — the nesting is the `on` edges,
// and the tree's result is the ROOT: the step nothing else consumes. That is
// how a cut is a new version of the same solid rather than a second solid
// standing in the same place.
//
// No three.js, and nothing from the session: this is arithmetic on a clean
// profile and a line. `solid.ts` turns a tree into geometry; this file never
// mentions a mesh.

import type { Point } from 'metamedium-core';
import { cross, dot, length, normalize, offsetOf, sub, toWorld, uAxis, vAxis, type Plane, type Vec3 } from './plane';

/** The whole vocabulary of §2.4. Closed: it grows only by a release. */
export type OpKind =
  | 'extrude'
  | 'revolve'
  | 'sweep'
  | 'loft'
  | 'cut'
  | 'boss'
  | 'union'
  | 'mirror'
  | 'place'
  | 'along'
  | 'match'
  | 'massing'
  | 'mesh';

export const OP_KINDS: readonly OpKind[] = [
  'extrude',
  'revolve',
  'sweep',
  'loft',
  'cut',
  'boss',
  'union',
  'mirror',
  'place',
  'along',
  'match',
  'massing',
  'mesh',
];

/** Which package fills each row. The tree is whole; the implementations are not. */
export const OP_PACKAGES: Record<OpKind, string> = {
  extrude: 'P2',
  revolve: 'P2',
  sweep: 'P7',
  loft: 'P7',
  cut: 'P3',
  boss: 'P3',
  union: 'P3 — the CSG seam; `mirror` is the verb that uses it',
  mirror: 'P3',
  place: 'P3 — `dup`; P8 places a definition along a path',
  along: 'P8',
  match: 'P4 — the diff resolved: add what the drawing has and the body lacks, or take off what it does not',
  massing: 'P5 — the drawing as the extent, before it has a name: profiles on different world planes, each grown through the others and intersected. With `on`, the same volume CLIPPING a body — the extent invariant, literal',
  mesh: 'P10 — opaque, from a generator: a version, never the truth of the thing',
};

/**
 * The first line of every op tree the shard writes.
 *
 * The plan's `op` kind is a new row in `kinds.ts` and that is core's to add
 * (§11); until then a tree is held as `json` code with this marker on its
 * first line, exactly the way `GRAPH3D_MARK` marks a program, so the shard
 * knows its own trees from any other JSON on the board.
 */
export const OP_MARK = '// mm:op tree v1';

/** The plane a profile was drawn on, carried into the tree so the mesh can stand where the ink is. */
export interface PlaneRef {
  origin: Vec3;
  normal: Vec3;
  up: Vec3;
  name?: string;
}

/** The clean form of the profile, in its plane's own (u, v) — what is extruded, so the solid is exact. */
export interface Profile2D {
  /** 'rectangle' | 'circle' | 'triangle' | 'polygon' — what the engine read, or the raw outline. */
  shape: string;
  points: Point[];
  closed: boolean;
  /** How the clean form was derived, from `clean.ts`, or why it is the raw ink. */
  reasoning: string;
}

interface StepBase {
  id: string;
  op: OpKind;
  /** The stroke ids this step was made from. Ink over the solid addresses these. */
  from: string[];
  /**
   * The step this one acts ON — how the tree nests. A leaf (an `extrude`, a
   * `revolve`) has none; a `cut`, a `boss` or a `mirror` names the step whose
   * body it changes, and the tree's result is the step nothing else names.
   */
  on?: string;
  /** A name bound by the hand or by a model's reply (§2.6). */
  name?: string;
  /**
   * A material bound to this step by a word in the brief — *green turret tops*
   * returns as `{ colour: 'green' }` on the steps named `top` (§2.6 rule 2).
   *
   * Held in the tree, like a name, because it is something that was SAID about
   * a step and not something derived from the drawing. A colour word and
   * nothing else: the closed list is `COLOUR_WORDS`, and a word outside it is
   * dropped rather than passed through to a renderer.
   */
  material?: { colour: string };
  /** Who put this step in the tree — the engine, or a model by name. */
  by?: string;
  /** Why this step is here, in the terms it was measured in. */
  reasoning: string;
}

export interface ExtrudeStep extends StepBase {
  op: 'extrude';
  profile: Profile2D;
  plane: PlaneRef;
  /** The extent's world length, signed by which side of the plane it went. */
  depth: number;
}

export interface RevolveStep extends StepBase {
  op: 'revolve';
  profile: Profile2D;
  plane: PlaneRef;
  /** The axis as a world line. */
  axis: { point: Vec3; direction: Vec3 };
  /** Radians. Full by default. */
  sweep: number;
}

/**
 * `cut(solid, feature, depth)` and `boss(solid, feature, depth)` — the two
 * things a closed shape drawn on a face can mean (§2.4).
 *
 * Both are the same geometry with the opposite sign and the opposite boolean:
 * a PRISM grown from the feature's clean form along the face's own normal,
 * subtracted from the body or added to it. They carry the same fields for that
 * reason — one shape, two intentions, which is exactly why the field offers
 * both rather than acting on a feature automatically.
 */
export interface FeatureStep extends StepBase {
  op: 'cut' | 'boss';
  /** The step whose body this changes. */
  on: string;
  /** The feature's clean form, in the FACE plane's own (u, v). */
  profile: Profile2D;
  /** The face the feature was drawn on. */
  plane: PlaneRef;
  /** Signed along the face's normal: a boss rises (+), a cut sinks (−). */
  depth: number;
  /**
   * Where the prism starts along that normal, signed. Never 0: a tool face
   * exactly coplanar with the face it is cutting is the classic way to make a
   * boolean library produce a hole with a skin over it, so the tool is lifted
   * off (a cut) or sunk into (a boss) the body by a ratio of the feature's own
   * size before the boolean is asked.
   */
  start: number;
  /** True when no extent said how deep, so the cut goes THROUGH (§8's rule). */
  through?: boolean;
}

/** `mirror(solid, plane)` — the body and its reflection, as one body. */
export interface MirrorStep extends StepBase {
  op: 'mirror';
  on: string;
  /** The plane reflected across: the chosen tile, or the height plane. */
  plane: PlaneRef;
}

/**
 * `place(definition, pose)` — what `dup` is (§2.4).
 *
 * A dup carries a COPY of the tree so far, shifted, and `on` names the body it
 * stands beside: one tree, two bodies, a new version of the same solid. The
 * steps are copied rather than referenced because a definition is P6's
 * business and P3 has none yet — until a tree can be named and pointed at,
 * saying "this copy holds its own copy" is the honest shape, and saying where
 * it was put and why is the rest of it.
 */
export interface PlaceStep extends StepBase {
  op: 'place';
  /** The tree that was copied, whole. */
  steps: OpStep[];
  /** Where it was put, relative to the original. A dup's offset; 0 for a placement. */
  offset: Vec3;

  // ---- P6: a placement OF a definition -------------------------------------
  /**
   * The definition's own name, as the hand bound it. Held because it is what
   * the hand said — the engine never learns what a definition is called, it
   * learns that this is called that (§2.6) — and because the panel has to be
   * able to say *placed from mug*.
   */
  definition?: string;
  /**
   * The definition's own profile this placement was matched against, and the
   * profile drawn HERE. **Nothing about the pose is held**: the scale, the
   * turn and the shift are worked out from these two inks every time the tree
   * is walked, exactly as a `match` step re-runs its diff (invariant 4). A
   * scale cached here would be a second source of truth that goes stale the
   * moment either mark is undone.
   */
  of?: string;
  toMark?: string;
  /** …or, with no profile to place at, the world point the definition's centre goes to. */
  toPoint?: Vec3;
  /** The planes the two inks lie on — log data (the `plane` rep), not something derived. */
  fromPlane?: PlaneRef;
  toPlane?: PlaneRef;
}

/**
 * `match(solid, profile, { add | remove })` — the diff resolved, at tier 1 (§4).
 *
 * **The step stores nothing derived.** Not the regions, not their outlines, not
 * their areas, not the span it will run through: only which profile, which way,
 * and on which plane the comparison is made. Everything else is re-derived when
 * the tree is walked — the ink comes back out of the log, the silhouette is
 * re-rendered from the body as it stands at that step, and the diff is run
 * again. That is invariant 4 taken seriously: a region cached here would be a
 * second source of truth that goes stale the moment the ink is flipped, undone
 * or redrawn, and a replayed log would stand up a solid nobody drew.
 *
 * The plane is carried because it is where the ink LIES, which is log data (the
 * `plane` rep on the stroke) and not something derived from the body.
 */
export interface MatchStep extends StepBase {
  op: 'match';
  on: string;
  /** Add the material the drawing has and the body lacks, or take off the material it does not. */
  how: 'add' | 'remove';
  /** The plane the profile lies on — the comparison is orthographic along its normal. */
  plane: PlaneRef;
}

/**
 * `massing(profiles)` — the drawing as the extent, before it has a name (§2.6
 * rule 1), and the same volume as a CLIP (§6, the extent invariant).
 *
 * Two or three profiles on different world planes whose projections overlap
 * ARE a solid already: each one grown through the span of the others along its
 * own normal, and the prisms intersected. That is the oldest way of drawing a
 * thing in space — plan, elevation, section — and it needs no model, no name
 * and no wait, so tier 1 stands it up the moment the second profile lands.
 *
 * **With `on` and `bound` it is the other half of the same idea.** A model's
 * tree is intersected with the massing's own volume as a final step in the
 * engine's name, so a proposal cannot leave the drawing. Nothing derived is
 * held: `bound` names the step whose BODY does the clipping, and that body is
 * re-derived every time the tree is walked — the same rule `match` keeps.
 */
export interface MassingStep extends StepBase {
  op: 'massing';
  /**
   * The profiles this volume is made of: each one's clean form and the plane
   * it lies on. Empty when the step is a clip against another step's body.
   */
  profiles: { id: string; profile: Profile2D; plane: PlaneRef }[];
  /** For a clip: the step whose body is the volume `on` is intersected with. */
  bound?: string;
}

/** Every other row of §2.4: declared, so a later package adds an implementation, not a shape. */
export interface UnbuiltStep extends StepBase {
  op: Exclude<OpKind, 'extrude' | 'revolve' | 'cut' | 'boss' | 'mirror' | 'place' | 'match' | 'massing'>;
}

export type OpStep =
  | ExtrudeStep
  | RevolveStep
  | FeatureStep
  | MirrorStep
  | PlaceStep
  | MatchStep
  | MassingStep
  | UnbuiltStep;

export interface OpTree {
  mm: 'op';
  version: 1;
  steps: OpStep[];
}

export const FULL_SWEEP = Math.PI * 2;

/**
 * How far off the face a cut's tool starts and a boss's tool sinks, as a ratio
 * of the feature's own size (invariant 8 — never a world unit). Small enough
 * that the hole is the depth that was drawn to within a percent; large enough
 * that no face of the tool is ever coplanar with a face of the body.
 */
export const TOOL_OVERLAP = 0.02;

// ---- deriving the parameters from the log -----------------------------------

/** A profile as the log holds it: its ink's clean form, and the plane it lies on. */
export interface ProfileInput {
  id: string;
  plane: Plane;
  /** The clean rectangle / circle / polygon `clean.ts` offers, or the raw outline when it offers none. */
  clean: Profile2D;
}

/** A line as the log holds it: its two ends, in its plane's own (u, v). */
export interface LineInput {
  id: string;
  plane: Plane;
  points: Point[];
}

function endsOf(line: LineInput): { start: Vec3; end: Vec3; length: number } {
  const start = toWorld(line.plane, line.points[0]);
  const end = toWorld(line.plane, line.points[line.points.length - 1]);
  return { start, end, length: length(sub(end, start)) };
}

const planeRef = (p: Plane): PlaneRef => ({
  origin: { ...p.origin },
  normal: normalize(p.normal),
  up: normalize(p.up),
  name: p.name,
});

const round = (v: number) => +v.toFixed(4);
const roundV = (v: Vec3): Vec3 => ({ x: round(v.x), y: round(v.y), z: round(v.z) });

/**
 * A box from a profile and an extent (§2.4, `extrude(profile, extent)`).
 *
 * The direction is the profile plane's normal — that is what an extent MEANS,
 * a dimension along the normal. The depth is the extent's own world length,
 * signed by which side of the plane it went, so a line drawn down makes a
 * solid that hangs below the drawing rather than one that stands on it.
 */
export function extrudeStep(profile: ProfileInput, extent: LineInput, id = 'step:1'): ExtrudeStep {
  const { start, end, length: len } = endsOf(extent);
  const ds = Math.abs(offsetOf(profile.plane, start));
  const de = Math.abs(offsetOf(profile.plane, end));
  // The end ON the plane is the foot; the far one says which way it went.
  const far = ds <= de ? end : start;
  const side = offsetOf(profile.plane, far);
  const depth = round(len * (side < 0 ? -1 : 1));
  return {
    id,
    op: 'extrude',
    from: [profile.id, extent.id],
    reasoning:
      `${profile.clean.shape} on the ${profile.plane.name ?? 'plane'} grown ${Math.abs(depth).toFixed(2)} u ` +
      `${side < 0 ? 'against' : 'along'} its normal — the extent's own length, ` +
      `signed by the side of the plane it went (${profile.clean.reasoning})`,
    profile: profile.clean,
    plane: planeRef(profile.plane),
    depth,
  };
}

/**
 * A revolve from a profile and an axis (§2.4, `revolve(profile, axis, sweep)`).
 *
 * The axis is kept as a WORLD line rather than as a pair of plane points: a
 * later step may mirror or place this solid, and a line in space survives that
 * where two numbers in a plane's frame do not. Sweep is full unless asked.
 */
export function revolveStep(
  profile: ProfileInput,
  axis: LineInput,
  sweep = FULL_SWEEP,
  id = 'step:1'
): RevolveStep {
  const { start, end } = endsOf(axis);
  const direction = normalize(sub(end, start));
  return {
    id,
    op: 'revolve',
    from: [profile.id, axis.id],
    reasoning:
      `${profile.clean.shape} on the ${profile.plane.name ?? 'plane'} turned ` +
      `${sweep >= FULL_SWEEP - 1e-6 ? 'the whole way' : `${((sweep / Math.PI) * 180).toFixed(0)}°`} ` +
      `about the line beside it (${profile.clean.reasoning})`,
    profile: profile.clean,
    plane: planeRef(profile.plane),
    axis: { point: roundV(start), direction: roundV(direction) },
    sweep: round(sweep),
  };
}

/**
 * `extrude(profile, depth)` with the depth given rather than drawn — what a
 * MODEL proposes (P5).
 *
 * The hand's extrude takes its depth from a line it drew, because a number
 * invented by the shard would be the one thing in it that came from nowhere.
 * A model's depth does not come from nowhere: it is a number in the brief's own
 * units that the model wrote down and the reasoning names it as such, so the
 * panel can say where it came from and the human can argue with it.
 */
export function extrudeAt(profile: ProfileInput, depth: number, id: string, why: string): ExtrudeStep {
  return {
    id,
    op: 'extrude',
    from: [profile.id],
    reasoning: why,
    profile: profile.clean,
    plane: planeRef(profile.plane),
    depth: round(depth),
  };
}

/**
 * `cut` / `boss` with the depth given rather than drawn — a model's, again.
 *
 * The same geometry and the same `TOOL_OVERLAP` rule as the hand's: no face of
 * a tool is ever coplanar with a face of the body, because that is a property
 * of the boolean library and not of who asked for the step.
 */
export function featureAt(
  op: 'cut' | 'boss',
  feature: FeatureInput,
  depth: number,
  on: string,
  id: string,
  why: string
): FeatureStep {
  const size = sizeOfProfile(feature.clean);
  const hair = TOOL_OVERLAP * size;
  const reach = Math.max(Math.abs(depth), 1e-4);
  return {
    id,
    op,
    on,
    from: [feature.id],
    reasoning: why,
    profile: feature.clean,
    plane: planeRef(feature.plane),
    depth: round(op === 'boss' ? reach + hair : -(reach + hair)),
    start: round(op === 'boss' ? -hair : hair),
  };
}

/** A tree of one step — what P2 makes. P3 onward pushes onto the same array. */
export function treeOf(step: OpStep): OpTree {
  return { mm: 'op', version: 1, steps: [step] };
}

// ---- the tree as a tree ------------------------------------------------------

/**
 * The step the tree RESULTS IN: the last one nothing else consumes.
 *
 * With one step it is that step; with `cut(extrude(…))` it is the cut. Read
 * rather than stored, because a stored root is a second source of truth and
 * the `on` edges already say it.
 */
export function rootOf(tree: OpTree): OpStep | null {
  // A clip consumes the step it is BOUND to as well as the one it acts on:
  // the massing whose volume does the clipping is not a second answer standing
  // beside the clipped body, it is what the clipped body was measured against.
  const consumed = new Set(
    tree.steps
      .flatMap((s) => [s.on, s.op === 'massing' ? s.bound : undefined])
      .filter((x): x is string => !!x)
  );
  const free = tree.steps.filter((s) => !consumed.has(s.id));
  return free[free.length - 1] ?? tree.steps[tree.steps.length - 1] ?? null;
}

/** The next free step id in a tree — `step:1`, `step:2`, … */
export function nextStepId(tree: OpTree): string {
  let n = tree.steps.length + 1;
  const taken = new Set(tree.steps.map((s) => s.id));
  while (taken.has(`step:${n}`)) n++;
  return `step:${n}`;
}

/** The same tree with one more step on it — a version, never a mutation. */
export function withStep(tree: OpTree, step: OpStep): OpTree {
  return { ...tree, steps: [...tree.steps, step] };
}

/** How deep the tree's own drawing reaches — the fallback when nothing measured the body. */
function drawnDepth(tree: OpTree): number {
  for (const s of [...tree.steps].reverse()) {
    if (s.op === 'extrude') return Math.abs(s.depth);
    if (s.op === 'cut' || s.op === 'boss') return Math.abs(s.depth);
  }
  return 0;
}

const bounds2 = (points: Point[]) => {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY };
};

/** The feature's own SHORT side, in the face plane's units — what a boss rises by. */
export function shortSideOf(profile: Profile2D): number {
  const b = bounds2(profile.points);
  return Math.max(1e-6, Math.min(b.maxX - b.minX, b.maxY - b.minY));
}

/** The feature's own size — the diagonal of the box its ink fills. Every ratio here is of this. */
export function sizeOfProfile(profile: Profile2D): number {
  const b = bounds2(profile.points);
  return Math.max(1e-6, Math.hypot(b.maxX - b.minX, b.maxY - b.minY));
}

/** A feature as the log holds it: its clean form, and the FACE plane it lies on. */
export interface FeatureInput {
  id: string;
  /** The face plane: origin where the pen met the face, normal pointing OUT of the solid. */
  plane: Plane;
  clean: Profile2D;
  /** The solid the face belongs to, for the reasoning. */
  solidId?: string;
}

/** What a depth may come from, in the order §8 gives them. */
export interface DepthSource {
  /** The world length of an extent drawn from the feature's edge, when there is one. */
  extent?: { id: string; length: number };
  /** How far the body reaches along the face's normal — what a cut goes THROUGH. */
  span?: number;
}

/**
 * `cut(solid, feature, depth)` (§2.4).
 *
 * The depth, in the order §8 fixes: **an extent drawn from the feature's edge**
 * sets it; with none, the cut goes **THROUGH** — as deep as the body reaches
 * along that face's normal, and said out loud as *through* rather than as a
 * number nobody drew. The tool is lifted a hair off the face and run a hair
 * past the far side, so no face of it is ever coplanar with a face of the body.
 */
export function cutStep(
  tree: OpTree,
  feature: FeatureInput,
  depth: DepthSource = {},
  id = nextStepId(tree)
): FeatureStep {
  const on = rootOf(tree)?.id ?? tree.steps[0]?.id ?? '';
  const size = sizeOfProfile(feature.clean);
  const lift = TOOL_OVERLAP * size;
  const through = !depth.extent;
  const reach = through ? Math.max(depth.span ?? drawnDepth(tree), size) : depth.extent!.length;
  // A THROUGH cut has to come out the FAR side as well as start above the near
  // one: with the tool's far face exactly coplanar with the body's, the boolean
  // came back "ok" and left the prism standing in its own hole. Found by firing
  // a ray down the middle of a box that was supposed to have a hole in it.
  const past = through ? lift : 0;
  // The face's own name already says whose face it is ("top of artifact:7"),
  // so naming the solid again reads "of artifact:7 of artifact:7".
  const where = feature.plane.name ?? `a face of ${feature.solidId ?? on}`;
  return {
    id,
    op: 'cut',
    on,
    from: [feature.id],
    reasoning:
      `a ${feature.clean.shape} on the ${where}, ` +
      (through
        ? `cut THROUGH — no extent said how deep, so it goes ${reach.toFixed(2)} u down the face's own normal, all the way out the far side`
        : `cut ${reach.toFixed(2)} u down the face's own normal — the length of the extent ${depth.extent!.id} drawn from its edge`) +
      ` (${feature.clean.reasoning})`,
    profile: feature.clean,
    plane: planeRef(feature.plane),
    depth: round(-(reach + lift + past)),
    start: round(lift),
    ...(through ? { through: true } : {}),
  };
}

/**
 * `boss(solid, feature, depth)` (§2.4).
 *
 * The same feature, the other intention. With no extent it rises by the
 * feature's **own short side** — a number the drawing actually contains, which
 * is the rule everywhere else in the shard (a depth invented here would be the
 * one thing in it that came from nowhere). The tool sinks a hair into the body
 * so the union has volume to work with rather than two coplanar faces.
 */
export function bossStep(
  tree: OpTree,
  feature: FeatureInput,
  depth: DepthSource = {},
  id = nextStepId(tree)
): FeatureStep {
  const on = rootOf(tree)?.id ?? tree.steps[0]?.id ?? '';
  const size = sizeOfProfile(feature.clean);
  const sink = TOOL_OVERLAP * size;
  const short = shortSideOf(feature.clean);
  const rise = depth.extent ? depth.extent.length : short;
  const where = feature.plane.name ?? `a face of ${feature.solidId ?? on}`;
  return {
    id,
    op: 'boss',
    on,
    from: [feature.id],
    reasoning:
      `a ${feature.clean.shape} on the ${where}, ` +
      (depth.extent
        ? `raised ${rise.toFixed(2)} u along the face's own normal — the length of the extent ${depth.extent.id} drawn from its edge`
        : `raised ${rise.toFixed(2)} u along the face's own normal — its own short side, the only depth the drawing contains`) +
      ` (${feature.clean.reasoning})`,
    profile: feature.clean,
    plane: planeRef(feature.plane),
    depth: round(rise + sink),
    start: round(-sink),
  };
}

/** `mirror(solid, plane)`: the body and its reflection, as one body. */
export function mirrorStep(tree: OpTree, plane: Plane, id = nextStepId(tree)): MirrorStep {
  const on = rootOf(tree)?.id ?? tree.steps[0]?.id ?? '';
  return {
    id,
    op: 'mirror',
    on,
    from: [],
    reasoning:
      `${on} and its reflection across the ${plane.name ?? 'chosen'} plane` +
      `${plane.source === 'chosen' ? ' (the tile the hand is holding)' : ' (nothing chosen, so the height plane — the wall you face)'}, as one body`,
    plane: planeRef(plane),
  };
}

/**
 * `place(definition, pose)` — a dup: the same tree, standing beside the
 * original by its own width.
 *
 * "Beside" is measured, not guessed: the offset is the source's own extent
 * along the direction, plus a gap of a tenth of it, so two dups never overlap
 * and a small thing does not land a mile away.
 */
export function placeStep(tree: OpTree, offset: Vec3, why: string, id = 'step:1'): PlaceStep {
  return {
    id,
    op: 'place',
    from: [...new Set(tree.steps.flatMap((s) => s.from))],
    reasoning: why,
    steps: tree.steps.map((s) => ({ ...s })),
    offset: roundV(offset),
  };
}

/**
 * `place(definition, pose)` — a definition put where a profile was drawn again
 * (§2.4, §2.5: *a definition is placed in space … when it carries an op tree,
 * as its solid*).
 *
 * The step holds the definition's name, its tree, and the TWO STROKE IDS whose
 * inks fix the pose — and no pose. Scale, turn and shift are re-derived from
 * those inks every walk (`placeFrames` below), the same rule `match` keeps.
 * The tree is copied rather than referenced because a definition is a rep on
 * an artifact and not an artifact of its own (the README's core gap); when
 * core grows a door to point at one, this holds a reference instead.
 */
export function placeDefinitionStep(args: {
  definition: string;
  steps: OpStep[];
  of: string;
  fromPlane: Plane;
  to: { markId: string; plane: Plane } | { point: Vec3 };
  id: string;
  why: string;
}): PlaceStep {
  const at = 'markId' in args.to;
  return {
    id: args.id,
    op: 'place',
    from: [...(at ? [(args.to as { markId: string }).markId] : []), args.of],
    reasoning: args.why,
    steps: args.steps.map((s) => ({ ...s })),
    offset: roundV({ x: 0, y: 0, z: 0 }),
    definition: args.definition,
    of: args.of,
    fromPlane: planeRef(args.fromPlane),
    ...(at
      ? {
          toMark: (args.to as { markId: string }).markId,
          toPlane: planeRef((args.to as { plane: Plane }).plane),
        }
      : { toPoint: roundV((args.to as { point: Vec3 }).point) }),
  };
}

/** A closed outline's own box, in the plane's units. */
export function centreAndSize(points: Point[]): { centre: Point; size: number } {
  const b = bounds2(points);
  return {
    centre: { x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 },
    size: Math.max(1e-6, Math.hypot(b.maxX - b.minX, b.maxY - b.minY)),
  };
}

/** The frame a plane ref stands in: (u, v, n), as the plane's own axes. */
export function frameVectors(p: PlaneRef): { u: Vec3; v: Vec3; n: Vec3; origin: Vec3 } {
  const plane: Plane = { origin: p.origin, normal: p.normal, up: p.up, source: 'chosen', why: 'the tree' };
  return { u: uAxis(plane), v: vAxis(plane), n: normalize(plane.normal), origin: p.origin };
}

/**
 * The pose of a placement, RE-DERIVED from the two inks (§2.5, invariant 4).
 *
 * A uniform scale from the size ratio — the definition's matching profile made
 * to fit the one drawn here — a turn that carries the source plane's own frame
 * onto the target's, and a shift that puts one outline's centre on the other's.
 * Both frames are (u, v, n) with `cross(u, v) = −n`, so the turn between them
 * has determinant +1 and nothing comes out inside out.
 */
export function placeFrames(args: {
  from: { points: Point[]; plane: PlaneRef };
  to: { points: Point[]; plane: PlaneRef } | { point: Vec3 };
}): {
  scale: number;
  centreFrom: Vec3;
  centreTo: Vec3;
  frameFrom: ReturnType<typeof frameVectors>;
  frameTo: ReturnType<typeof frameVectors>;
} {
  const src = centreAndSize(args.from.points);
  const frameFrom = frameVectors(args.from.plane);
  const centreFrom = toWorld(
    { origin: args.from.plane.origin, normal: args.from.plane.normal, up: args.from.plane.up, source: 'chosen', why: '' },
    src.centre
  );
  if ('point' in args.to) {
    return { scale: 1, centreFrom, centreTo: args.to.point, frameFrom, frameTo: frameFrom };
  }
  const dst = centreAndSize(args.to.points);
  const frameTo = frameVectors(args.to.plane);
  const centreTo = toWorld(
    { origin: args.to.plane.origin, normal: args.to.plane.normal, up: args.to.plane.up, source: 'chosen', why: '' },
    dst.centre
  );
  return { scale: dst.size / src.size, centreFrom, centreTo, frameFrom, frameTo };
}

/**
 * `match(solid, profile, { add })` / `{ remove }` — §4's tier 1 resolution.
 *
 * The profile is named by its stroke id and by nothing else: what is missing
 * and what is extra is a question about the ink and the body, asked again every
 * time the tree is walked. The reasoning is written from the diff as it stands
 * NOW, because a reason is a sentence about the moment the act was taken — but
 * the geometry is not, and nothing in the step's data can be read as a region.
 */
export function matchStep(
  tree: OpTree,
  profile: { id: string; plane: Plane },
  how: 'add' | 'remove',
  why: string,
  id = nextStepId(tree)
): MatchStep {
  const on = rootOf(tree)?.id ?? tree.steps[0]?.id ?? '';
  return {
    id,
    op: 'match',
    on,
    how,
    from: [profile.id],
    plane: planeRef(profile.plane),
    reasoning: why,
  };
}

/**
 * The colour words a material may be said in. **Closed**, like every other
 * vocabulary here: a model that says "iridescent seafoam" has said nothing the
 * shard can render, and a renderer handed an arbitrary string would be the one
 * place a model's text reached the page (invariant 5).
 */
export const COLOUR_WORDS: Record<string, string> = {
  green: '#2f7d4f',
  red: '#a8332f',
  blue: '#2a5ea8',
  yellow: '#c8a22b',
  orange: '#c06a25',
  purple: '#6b4fa8',
  brown: '#7a5a3a',
  teal: '#0b6f7d',
  pink: '#c06a86',
  grey: '#7b8a94',
  gray: '#7b8a94',
  white: '#e8e6e0',
  black: '#26282a',
};

/** The colour a material word stands for, or null when the word is not one of ours. */
export function colourOf(material: { colour?: string } | undefined): string | null {
  const word = material?.colour?.trim().toLowerCase();
  return word && word in COLOUR_WORDS ? COLOUR_WORDS[word] : null;
}

/**
 * `massing(profiles)` — the profiles, whole, as one step in the engine's name.
 *
 * The step carries each profile's clean form and its plane and nothing else:
 * how far each prism runs, and what the intersection comes to, is worked out
 * every time the tree is walked (invariant 4), from the profiles themselves.
 */
export function massingStep(
  profiles: { id: string; plane: Plane; clean: Profile2D }[],
  id = 'step:1',
  why?: string
): MassingStep {
  const planes = profiles.map((p) => p.plane.name ?? 'plane');
  return {
    id,
    op: 'massing',
    from: profiles.map((p) => p.id),
    reasoning:
      why ??
      `${profiles.length} profiles on the ${planes.join(', the ')} — each one grown through the span of the others ` +
        `along its own plane's normal, and the prisms intersected. The drawing IS the extent, before it has a name`,
    profiles: profiles.map((p) => ({ id: p.id, profile: p.clean, plane: planeRef(p.plane) })),
  };
}

/**
 * The clip: `on` intersected with the body of `bound`.
 *
 * This is §6's extent invariant made literal — a proposal cannot leave the
 * drawing — and it is always the engine's own step, appended after whatever a
 * model proposed. It holds no geometry, only the two step ids.
 */
export function clipStep(on: string, bound: string, id: string, why?: string): MassingStep {
  return {
    id,
    op: 'massing',
    on,
    bound,
    from: [],
    profiles: [],
    reasoning:
      why ??
      `${on} kept only where it lies inside ${bound} — the drawing is the extent, and nothing proposed may leave it`,
  };
}

/** Every name bound to a step in this tree, in the step's own id. */
export function namesOf(tree: OpTree): { stepId: string; name: string; op: OpKind }[] {
  const out: { stepId: string; name: string; op: OpKind }[] = [];
  for (const s of tree.steps) if (s.name) out.push({ stepId: s.id, name: s.name, op: s.op });
  return out;
}

/** The steps a name covers, in the order they stand in the tree. */
export function stepsNamed(tree: OpTree, name: string): OpStep[] {
  const want = name.trim().toLowerCase();
  return tree.steps.filter((s) => (s.name ?? '').trim().toLowerCase() === want);
}

/**
 * The sub-tree a named step is the root of: that step, and everything it
 * stands on that nothing outside the sub-tree also stands on.
 *
 * A definition is the sub-tree a name covers (§2.6 rule 3), and what it covers
 * is read from the `on` edges rather than stored — the same rule as `rootOf`.
 */
export function subTreeOf(tree: OpTree, stepId: string): OpStep[] {
  const byId = new Map(tree.steps.map((s) => [s.id, s]));
  const keep = new Set<string>();
  const walk = (id: string, guard = 0) => {
    if (keep.has(id) || guard > tree.steps.length) return;
    const step = byId.get(id);
    if (!step) return;
    keep.add(id);
    if (step.on) walk(step.on, guard + 1);
    if (step.op === 'massing' && step.bound) walk(step.bound, guard + 1);
  };
  walk(stepId);
  return tree.steps.filter((s) => keep.has(s.id));
}

// ---- the tree as text, and back ---------------------------------------------

/** The tree as the `code` rep holds it: the marker line, then the JSON. */
export function encodeOpTree(tree: OpTree): string {
  return `${OP_MARK} — ${tree.steps.map((s) => s.op).join(' · ')}\n${JSON.stringify(tree, null, 2)}`;
}

/** Is this code one of the shard's own trees? */
export function isOpTree(code: string | undefined): boolean {
  return !!code && code.trimStart().startsWith(OP_MARK);
}

// ---- the tree as it arrives from somewhere else ------------------------------
//
// **A type is not a check.** `OpStep` is a discriminated union the compiler
// enforces on the code that BUILDS a tree; it says nothing about a tree that
// arrives as text — out of the log, out of a folder, out of another hand's
// log, out of a model. Casting JSON to `OpTree` and trusting the cast is the
// one place in the shard where a value nobody measured is read as a number,
// and it showed: a tree holding `{"op":"extrude"}` with no `depth` parsed
// clean, then threw out of `depth.toFixed()` the moment the panel described
// it — one malformed artifact taking the whole board's panel with it.
//
// So every tree that comes from outside is walked once, against the same
// discriminated types, and what cannot be read is refused WITH A REASON. The
// rules below are about SHAPE and SAFETY, not about geometry: an extrude with
// no depth cannot be read at all, while an extrude of depth 0 reads fine and
// derives no body — and saying so is `deriveTree`'s job, per step, where the
// panel can say it about that step instead of condemning the artifact.

/**
 * The bounds a tree from outside is held to. Named, because an unnamed bound
 * is a magic number and because a reader has to be able to say which one a
 * tree broke.
 *
 * They are ceilings on nonsense, not budgets a real drawing approaches: the
 * biggest tree the demo makes is nine steps, and a `place` nests one level.
 */
export const OP_LIMITS = {
  /** Steps in one `steps` array — the tree's own, or a `place`'s copy. */
  steps: 512,
  /** Steps in the whole tree, nesting included: what stops a deep file eating the frame. */
  totalSteps: 4096,
  /** How far `place` may nest a copied tree inside a copied tree. */
  placeDepth: 8,
  /** Points in one profile's outline. */
  profilePoints: 4096,
  /**
   * …and the fewest. An outline of two points has no area, and an EMPTY one
   * makes `bounds2` return ±Infinity, which `sizeOfProfile` turns into an
   * Infinity every transform downstream becomes NaN from. Three is an outline.
   */
  profileMinPoints: 3,
  /** Profiles in one massing — plan, elevation, section, and room to spare. */
  massingProfiles: 64,
  /** Stroke ids one step may name. */
  refs: 512,
  /** Characters in an id. */
  idChars: 200,
  /** Characters in a reasoning, a name, or a shape's word. */
  textChars: 20000,
} as const;

/** Why a tree could not be read: where in it, and what was wrong. */
export interface OpTreeFault {
  /**
   * Whether the text CLAIMED to be one of ours. A code rep that is some other
   * artifact's JSON is not a fault — it is somebody else's business — and the
   * caller skips it; a rep carrying `OP_MARK` that will not read is a fault to
   * report, because the hand made that solid and it is not on the board.
   */
  mine: boolean;
  /** The path to what failed, in the tree's own shape: `steps[3].depth`. */
  at: string;
  /** What was wrong, in the words the panel says. */
  reason: string;
}

export type OpTreeCheck = ({ ok: true; tree: OpTree }) | ({ ok: false } & OpTreeFault);

/** Thrown inside the walk and caught at its door, so every check can be one line. */
class Fault {
  constructor(readonly at: string, readonly reason: string) {}
}
const bad = (at: string, reason: string): never => {
  throw new Fault(at, reason);
};

const isRecord = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);

function wantRecord(v: unknown, at: string, what: string): Record<string, unknown> {
  if (!isRecord(v)) bad(at, `${what} is ${v === undefined ? 'missing' : `${typeof v}, not an object`}`);
  return v as Record<string, unknown>;
}

function wantText(v: unknown, at: string, what: string, max: number = OP_LIMITS.textChars): string {
  if (typeof v !== 'string') bad(at, `${what} is ${v === undefined ? 'missing' : `${typeof v}, not text`}`);
  const s = v as string;
  if (s.length > max) bad(at, `${what} is ${s.length} characters long, past the ${max} a tree may carry`);
  return s;
}

function wantId(v: unknown, at: string, what: string): string {
  const s = wantText(v, at, what, OP_LIMITS.idChars);
  if (!s.trim()) bad(at, `${what} is empty — a reference has to name something`);
  return s;
}

function wantNumber(v: unknown, at: string, what: string): number {
  if (typeof v !== 'number') bad(at, `${what} is ${v === undefined ? 'missing' : `${typeof v}, not a number`}`);
  if (!Number.isFinite(v as number)) bad(at, `${what} is ${String(v)} — a measurement has to be a finite number`);
  return v as number;
}

function wantVec(v: unknown, at: string, what: string): Vec3 {
  const r = wantRecord(v, at, what);
  return {
    x: wantNumber(r.x, `${at}.x`, `${what}'s x`),
    y: wantNumber(r.y, `${at}.y`, `${what}'s y`),
    z: wantNumber(r.z, `${at}.z`, `${what}'s z`),
  };
}

/**
 * A plane, as a frame that can actually be stood in.
 *
 * Its normal and its up must both have length and must not be parallel:
 * `uAxis` is `normalize(cross(normal, up))`, so a plane whose up lies along
 * its normal has no u axis at all and every point put through it comes out
 * NaN — a body that renders as nothing, silently, with no step to blame.
 */
function wantPlane(v: unknown, at: string, what: string): void {
  const r = wantRecord(v, at, what);
  const normal = wantVec(r.normal, `${at}.normal`, `${what}'s normal`);
  const up = wantVec(r.up, `${at}.up`, `${what}'s up`);
  wantVec(r.origin, `${at}.origin`, `${what}'s origin`);
  if (length(normal) < 1e-9) bad(`${at}.normal`, `${what}'s normal has no length — it points nowhere`);
  if (length(up) < 1e-9) bad(`${at}.up`, `${what}'s up has no length — it points nowhere`);
  if (length(cross(normal, up)) < 1e-9) {
    bad(`${at}.up`, `${what}'s up runs along its normal, so the plane has no frame to stand in`);
  }
  if (r.name !== undefined) wantText(r.name, `${at}.name`, `${what}'s name`);
}

/** A profile: the clean outline a step is grown from, in its plane's own (u, v). */
function wantProfile(v: unknown, at: string, what: string): void {
  const r = wantRecord(v, at, what);
  wantText(r.shape, `${at}.shape`, `${what}'s shape`);
  wantText(r.reasoning, `${at}.reasoning`, `${what}'s reasoning`);
  if (typeof r.closed !== 'boolean') bad(`${at}.closed`, `${what} does not say whether it is closed`);
  if (!Array.isArray(r.points)) bad(`${at}.points`, `${what} has no points — an outline is its points`);
  const points = r.points as unknown[];
  if (points.length < OP_LIMITS.profileMinPoints) {
    bad(`${at}.points`, `${what} has ${points.length} point(s); an outline needs ${OP_LIMITS.profileMinPoints}`);
  }
  if (points.length > OP_LIMITS.profilePoints) {
    bad(`${at}.points`, `${what} has ${points.length} points, past the ${OP_LIMITS.profilePoints} a profile may carry`);
  }
  points.forEach((p, i) => {
    const q = wantRecord(p, `${at}.points[${i}]`, `${what}'s point ${i}`);
    wantNumber(q.x, `${at}.points[${i}].x`, `${what}'s point ${i} x`);
    wantNumber(q.y, `${at}.points[${i}].y`, `${what}'s point ${i} y`);
  });
}

/** A budget shared by the whole walk, so nesting cannot multiply the work. */
interface Budget {
  left: number;
}

/**
 * One `steps` array — the tree's own, or the copy a `place` carries.
 *
 * Ids are unique WITHIN their array and `on` points at a step EARLIER in it:
 * the tree is built by appending (`withStep`), so a step can only ever act on
 * one that already stood. That makes the `on` edges acyclic by construction
 * rather than by a walk with a guard, which is what `rootOf` and `depthsOf`
 * already assume when they cap their recursion at the step count.
 */
function walkSteps(v: unknown, at: string, depth: number, budget: Budget): void {
  if (!Array.isArray(v)) bad(at, `steps is ${v === undefined ? 'missing' : `not an array`} — a tree is its steps`);
  const steps = v as unknown[];
  if (steps.length > OP_LIMITS.steps) {
    bad(at, `${steps.length} steps in one tree, past the ${OP_LIMITS.steps} a tree may carry`);
  }
  budget.left -= steps.length;
  if (budget.left < 0) {
    bad(at, `more than ${OP_LIMITS.totalSteps} steps in the whole tree, nesting included`);
  }
  const seen = new Set<string>();
  steps.forEach((s, i) => walkStep(s, `${at}[${i}]`, seen, depth, budget));
}

function walkStep(v: unknown, at: string, seen: Set<string>, depth: number, budget: Budget): void {
  const s = wantRecord(v, at, 'the step');
  const id = wantId(s.id, `${at}.id`, "the step's id");
  if (seen.has(id)) bad(`${at}.id`, `two steps in this tree are both called ${id}`);

  const op = wantText(s.op, `${at}.op`, "the step's op", OP_LIMITS.idChars);
  if (!OP_KINDS.includes(op as OpKind)) {
    bad(`${at}.op`, `“${op}” is not one of the ${OP_KINDS.length} steps this vocabulary has`);
  }
  wantText(s.reasoning, `${at}.reasoning`, "the step's reasoning");

  if (!Array.isArray(s.from)) bad(`${at}.from`, 'the step does not say which strokes it was made from');
  const from = s.from as unknown[];
  if (from.length > OP_LIMITS.refs) {
    bad(`${at}.from`, `the step names ${from.length} strokes, past the ${OP_LIMITS.refs} one step may name`);
  }
  from.forEach((f, i) => wantId(f, `${at}.from[${i}]`, `the stroke ${i} it was made from`));

  if (s.name !== undefined) wantText(s.name, `${at}.name`, "the step's name");
  if (s.by !== undefined) wantText(s.by, `${at}.by`, 'who put the step in the tree');
  if (s.material !== undefined) {
    const m = wantRecord(s.material, `${at}.material`, "the step's material");
    wantText(m.colour, `${at}.material.colour`, "the material's colour word");
  }

  /** A step this one stands on: a name, and a step that already stood. */
  const earlier = (value: unknown, key: string, what: string): void => {
    const ref = wantId(value, `${at}.${key}`, what);
    if (!seen.has(ref)) bad(`${at}.${key}`, `${what} is ${ref}, and no step before it in this tree is called that`);
  };

  if (s.on !== undefined) earlier(s.on, 'on', 'the step it acts on');

  const kind = op as OpKind;
  if (kind === 'extrude') {
    wantProfile(s.profile, `${at}.profile`, "the extrude's profile");
    wantPlane(s.plane, `${at}.plane`, "the extrude's plane");
    wantNumber(s.depth, `${at}.depth`, "the extrude's depth");
  } else if (kind === 'revolve') {
    wantProfile(s.profile, `${at}.profile`, "the revolve's profile");
    wantPlane(s.plane, `${at}.plane`, "the revolve's plane");
    const axis = wantRecord(s.axis, `${at}.axis`, "the revolve's axis");
    wantVec(axis.point, `${at}.axis.point`, "the axis's point");
    const dir = wantVec(axis.direction, `${at}.axis.direction`, "the axis's direction");
    if (length(dir) < 1e-9) bad(`${at}.axis.direction`, 'the axis points nowhere — there is nothing to turn about');
    wantNumber(s.sweep, `${at}.sweep`, "the revolve's sweep");
  } else if (kind === 'cut' || kind === 'boss') {
    if (s.on === undefined) bad(`${at}.on`, `a ${kind} changes a body, and this one does not say whose`);
    wantProfile(s.profile, `${at}.profile`, `the ${kind}'s feature`);
    wantPlane(s.plane, `${at}.plane`, `the ${kind}'s face`);
    wantNumber(s.depth, `${at}.depth`, `the ${kind}'s depth`);
    wantNumber(s.start, `${at}.start`, `where the ${kind}'s tool starts along the face's normal`);
    if (s.through !== undefined && typeof s.through !== 'boolean') {
      bad(`${at}.through`, `the ${kind} says “through” as ${typeof s.through}, not as yes or no`);
    }
  } else if (kind === 'mirror') {
    if (s.on === undefined) bad(`${at}.on`, 'a mirror reflects a body, and this one does not say whose');
    wantPlane(s.plane, `${at}.plane`, "the mirror's plane");
  } else if (kind === 'match') {
    if (s.on === undefined) bad(`${at}.on`, 'a match resolves a diff against a body, and this one does not say whose');
    if (s.how !== 'add' && s.how !== 'remove') {
      bad(`${at}.how`, `a match either adds what is missing or takes off what is extra, not “${String(s.how)}”`);
    }
    wantPlane(s.plane, `${at}.plane`, "the plane the match is measured on");
  } else if (kind === 'massing') {
    if (!Array.isArray(s.profiles)) bad(`${at}.profiles`, 'a massing does not say which profiles it is made of');
    const profiles = s.profiles as unknown[];
    if (profiles.length > OP_LIMITS.massingProfiles) {
      bad(`${at}.profiles`, `${profiles.length} profiles in one massing, past the ${OP_LIMITS.massingProfiles} it may carry`);
    }
    profiles.forEach((p, i) => {
      const r = wantRecord(p, `${at}.profiles[${i}]`, `the massing's profile ${i}`);
      wantId(r.id, `${at}.profiles[${i}].id`, `the mark profile ${i} was drawn as`);
      wantProfile(r.profile, `${at}.profiles[${i}].profile`, `the massing's profile ${i}`);
      wantPlane(r.plane, `${at}.profiles[${i}].plane`, `the plane profile ${i} lies on`);
    });
    // A clip: the volume it keeps its body inside is a step that already stood.
    if (s.bound !== undefined) earlier(s.bound, 'bound', 'the step whose body does the clipping');
  } else if (kind === 'place') {
    if (depth >= OP_LIMITS.placeDepth) {
      bad(`${at}.steps`, `a placement nested more than ${OP_LIMITS.placeDepth} deep — a copy of a copy of a copy`);
    }
    wantVec(s.offset, `${at}.offset`, "the placement's offset");
    walkSteps(s.steps, `${at}.steps`, depth + 1, budget);
    // A placement OF A DEFINITION re-derives its pose from two inks every walk
    // (`placeFrames`), so it must name both of them and the planes they lie on.
    // A dup carries neither: its offset is the whole of its pose.
    if (s.definition !== undefined) {
      wantText(s.definition, `${at}.definition`, "the definition's name");
      wantId(s.of, `${at}.of`, "the definition's own profile this was matched against");
      wantPlane(s.fromPlane, `${at}.fromPlane`, "the plane the definition's profile lies on");
      if (s.toMark !== undefined) {
        wantId(s.toMark, `${at}.toMark`, 'the mark the copy was placed at');
        wantPlane(s.toPlane, `${at}.toPlane`, 'the plane that mark lies on');
      } else if (s.toPoint !== undefined) {
        wantVec(s.toPoint, `${at}.toPoint`, 'the point the copy was placed at');
      } else {
        bad(at, `the placement of ${String(s.definition)} does not say where it goes — no mark and no point`);
      }
    }
  }
  // Every other row of §2.4 is declared and unbuilt: it carries the base
  // fields, which are checked above, and nothing a package has not filled yet.

  seen.add(id);
}

/**
 * A tree from outside, walked once against the types that build one.
 *
 * Returns the tree when every step can be read, and otherwise WHERE and WHY —
 * so the artifact can stand as a broken solid with the reason on it rather
 * than vanishing from the board or taking the panel down with it.
 */
export function validateOpTree(value: unknown): OpTreeCheck {
  try {
    const t = wantRecord(value, '', 'the tree');
    if (t.mm !== 'op') bad('mm', `the tree says it is “${String(t.mm)}”, not an op tree`);
    if (t.version !== 1) {
      bad('version', `this is an op tree of version ${String(t.version)}, and the shard reads version 1`);
    }
    walkSteps(t.steps, 'steps', 0, { left: OP_LIMITS.totalSteps });
    return { ok: true, tree: value as OpTree };
  } catch (err) {
    if (err instanceof Fault) return { ok: false, mine: true, at: err.at, reason: err.reason };
    throw err;
  }
}

/**
 * The tree back out of the text, with the reason when it will not read.
 *
 * The sibling of `parseOpTree`, for the callers that have somewhere to SAY a
 * reason — the load boundary, which stands a broken solid in the panel.
 */
export function readOpTree(code: string | undefined): OpTreeCheck {
  if (!isOpTree(code)) {
    return { ok: false, mine: false, at: '', reason: 'this code is not one of the shard\'s op trees' };
  }
  const body = code!
    .split('\n')
    .filter((l) => !l.trimStart().startsWith('//'))
    .join('\n');
  let parsed: unknown;
  try {
    parsed = JSON.parse(body);
  } catch (err) {
    return {
      ok: false,
      mine: true,
      at: '',
      reason: `the tree is marked as one of ours and is not JSON: ${err instanceof Error ? err.message : String(err)}`,
    };
  }
  return validateOpTree(parsed);
}

/**
 * The tree back out of the text, or null when the text is not one — or is one
 * and cannot be read.
 *
 * The null contract every caller already has, now with the second reason: a
 * tree that parses as JSON but is not a tree this shard can walk is refused
 * here rather than three files downstream, where it arrives as a number that
 * is not there.
 */
export function parseOpTree(code: string | undefined): OpTree | null {
  const read = readOpTree(code);
  return read.ok ? read.tree : null;
}

// ---- what a step is, in words and in numbers --------------------------------

/** The panel's line for one step: the verb, its number, and where it came from. */
export function describeStep(step: OpStep): string {
  const from = step.from.length ? ` · from ${step.from.join(' + ')}` : '';
  if (step.op === 'extrude') {
    return `extrude · depth ${step.depth.toFixed(2)} u${from}`;
  }
  if (step.op === 'revolve') {
    const deg = (step.sweep / Math.PI) * 180;
    return `revolve · ${deg >= 359.9 ? 'full turn' : `${deg.toFixed(0)}°`}${from}`;
  }
  if (step.op === 'cut' || step.op === 'boss') {
    const how = step.through ? 'through' : `${Math.abs(step.depth).toFixed(2)} u`;
    return `${step.op} · ${how}${from}`;
  }
  if (step.op === 'mirror') {
    return `mirror · across the ${step.plane.name ?? 'plane'}${from}`;
  }
  if (step.op === 'place') {
    if (step.definition) {
      // No scale here: the step holds none, and a number printed in this line
      // would be a number this file invented. Where it stands and how big it
      // is are re-derived from the two inks named in `from`.
      return `place · placed from ${step.definition} · ${step.steps.length} step${step.steps.length === 1 ? '' : 's'}${from}`;
    }
    const o = step.offset;
    return `place · ${step.steps.length} step${step.steps.length === 1 ? '' : 's'} at (${o.x.toFixed(2)}, ${o.y.toFixed(2)}, ${o.z.toFixed(2)})${from}`;
  }
  if (step.op === 'massing') {
    return step.bound
      ? `massing · clipped to ${step.bound}${from}`
      : `massing · ${step.profiles.length} profiles intersected${from}`;
  }
  if (step.op === 'match') {
    // No region count and no area: the step holds none, and a number printed
    // here would be a number this file invented.
    return `match · ${step.how === 'add' ? 'add what is missing' : 'take off what is extra'} · on the ${step.plane.name ?? 'plane'}${from}`;
  }
  return `${step.op} · ${OP_PACKAGES[step.op]}${from}`;
}

/**
 * Every stroke a tree was made from — what ink over the solid addresses.
 * A `place` carries a whole copied tree, so its steps are walked too.
 */
export function strokesOf(tree: OpTree): string[] {
  const out: string[] = [];
  const walk = (steps: OpStep[]) => {
    for (const s of steps) {
      out.push(...s.from);
      if (s.op === 'place') walk(s.steps);
    }
  };
  walk(tree.steps);
  return [...new Set(out)];
}

/**
 * How deep in the nesting each step sits — 0 for a leaf, 1 for what consumes
 * it, and so on. The panel indents by this, so `cut · through` reads as
 * standing ON the `extrude` rather than beside it.
 */
export function depthsOf(tree: OpTree): Map<string, number> {
  const byId = new Map(tree.steps.map((s) => [s.id, s]));
  const out = new Map<string, number>();
  const depth = (id: string, guard = 0): number => {
    if (out.has(id)) return out.get(id)!;
    const step = byId.get(id);
    const d = !step?.on || guard > tree.steps.length ? 0 : depth(step.on, guard + 1) + 1;
    out.set(id, d);
    return d;
  };
  for (const s of tree.steps) depth(s.id);
  return out;
}

/**
 * A revolve's profile in the lathe's own frame: radius from the axis, height
 * along it. Pure trigonometry, so it is tested without a renderer — `solid.ts`
 * only has to stand the result up along the axis.
 */
export function latheProfile(step: RevolveStep): { r: number; h: number }[] {
  const axis = normalize(step.axis.direction);
  const plane: Plane = {
    origin: step.plane.origin,
    normal: step.plane.normal,
    up: step.plane.up,
    source: 'chosen',
    why: 'the tree',
  };
  return step.profile.points.map((p) => {
    const w = toWorld(plane, p);
    const d = sub(w, step.axis.point);
    const h = dot(d, axis);
    const perp = sub(d, { x: axis.x * h, y: axis.y * h, z: axis.z * h });
    return { r: length(perp), h };
  });
}
