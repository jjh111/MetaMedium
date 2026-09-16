// ===== planarity =====
// Which plane a stroke lies on when the hand did NOT choose one
// (SHARD-3D-PLAN §2.1, §3, §10). P0 left `planeForPenDown` as the seam; this
// is what fills it.
//
// A read plane is a READING (invariant 2): plural, ranked above a floor, each
// candidate carrying the evidence it was scored from and the runner-up a tap
// away. A chosen plane is not a candidate at all — it is a decision, and it
// wins outright with source `chosen`, exactly as P0 has it.
//
// ---------------------------------------------------------------------------
// THE FORMULA, in one place, and this is it:
//
//     confidence = shape × facing × anchor × continuity
//
//   * **shape** — the shape rung's TOP confidence on the stroke's projection
//     onto that candidate, read at that plane's own `scaleAt` (the pen's
//     scale varies with depth under perspective, so each candidate is read at
//     its own). The strongest term, and the only one that knows what was
//     drawn. Floored at SHAPE_FLOOR when the rung places nothing, so a plane
//     is never scored zero for a squiggle.
//   * **facing** — FACING_BASE + (1 − FACING_BASE)·|n · look|: 1 flat on,
//     FACING_BASE edge-on. Gentle on purpose — a box's top face seen from
//     above is 0.85 face-on and must not be beaten by the view plane for
//     being 1.0. Below FACING_FLOOR the candidate is kept and marked
//     *too oblique to read*, and can never win (§10's last risk).
//     Below FACING_TAKES — well above that floor — the candidate is kept,
//     marked *too oblique to take the stroke*, and cannot outrank the VIEW
//     plane however well the stroke reads on it. See THE GATE, below.
//   * **anchor** — how much of the stroke lies on geometry that lies in that
//     plane (a face's own bounds, the previous stroke's bounds), as a ratio
//     of the stroke's own size. Three cases, and the third is the one that
//     was learned the hard way:
//       - nothing in the plane to anchor to → ANCHOR_BASE. Absence of
//         evidence: not rewarded, not punished.
//       - the ink lies on it → up to 1.
//       - there IS geometry and the ink is nowhere near it → down to
//         ANCHOR_MISS, BELOW the base. A face's plane is infinite and the
//         face is not: off the solid that plane is imaginary, and a stroke
//         two of its own sizes past the ink that made a candidate is
//         evidence AGAINST that candidate, not the absence of evidence.
//         Without this, a circle drawn in clear air beside a box read as
//         lying on the box's top face, purely because the stroke before it
//         had been drawn there.
//   * **continuity** — 1 for the previous stroke's own plane within
//     `recentWindowMs`, CONTINUITY_BASE otherwise. The hand that drew there a
//     moment ago is probably still drawing there.
//
// Multiplicative rather than a weighted sum, because the terms are
// independent evidence and any one of them being bad SHOULD pull the whole
// candidate down: a plane the stroke reads as nothing on, seen nearly
// edge-on, with nothing in it, is not saved by being recent.
// ---------------------------------------------------------------------------
//
// ---------------------------------------------------------------------------
// THE GATE: off-axis ink is CONSERVED (16 September 2026)
//
// John, drawing with nothing chosen: *"drawings off the main axis are on the
// camera plane mapped rather than the way it is stretching the shapes out
// now; the shapes drawn off main axes should stay conserved size at the
// angles that make sense."*
//
// The formula above is a comparison of evidence, and a half-oblique plane can
// win one: at forty-five degrees a world plane's facing term costs it only
// 22%, and continuity plus an anchor pay that back twice over. But casting a
// screen path onto a plane at forty-five degrees is not a reading of what the
// hand drew — it is a stretch of it. The circle John drew came back a long
// ellipse lying on the ground, and no amount of confidence makes that the
// shape he made.
//
// So the view plane is the DEFAULT, and evidence does not merely have to beat
// it — it has to **make sense at its angle** first. `FACING_TAKES` is that
// gate: below it a `world`, `previous` or `face` candidate is kept, said out
// loud, offered by the chip, and **cannot outrank the view plane**, whatever
// its shape score. Above it the evidence decides exactly as before.
//
// The view plane is screen-facing by construction, so casting the screen path
// onto it is a SIMILARITY transform — the same shape at the same aspect, at
// the depth of whatever the hand pointed at. That is the conservation, and it
// is a property of the geometry, not a threshold: `planarity.test.ts` pins a
// circle's aspect to within 1%.
//
// Nothing here touches a CHOSEN plane: the gizmo's tile is a decision, and a
// decision is not a reading to argue with (§2.1). Choose the foundation and
// the stroke lies on it at any angle, with the edge-on warning as it was.
// ---------------------------------------------------------------------------
//
// No three.js. The camera arrives as a ray-caster function, the way `plane.ts`
// takes it, so the whole module is arithmetic and tests headlessly — which is
// what §11 names first for landing back in core.

import { analyzeStroke, type Point } from 'metamedium-core';
import {
  cross,
  dot,
  facing,
  foundation,
  height,
  length,
  mul,
  normalize,
  rayPlane,
  scaleAt,
  sub,
  toPlane,
  width,
  type Plane,
  type PlaneSource,
  type RayCaster,
  type Vec3,
} from './plane';

// ---- the thresholds, every one named --------------------------------------

/** What a candidate's shape term is when the rung places nothing on it. */
export const SHAPE_FLOOR = 0.15;
/** The facing term edge-on; 1 flat on. */
export const FACING_BASE = 0.55;
/** Below this |n · look| a candidate is *too oblique to read* and never wins (§10). */
export const FACING_FLOOR = 0.15;
/**
 * **The gate** (see THE GATE, above). Below this |n · look| a `world`,
 * `previous` or `face` candidate cannot outrank the VIEW plane, whatever it
 * scores: at that angle the screen path is not read onto the plane, it is
 * stretched across it, and a shape the hand did not draw is not evidence.
 *
 * 0.80 is 37° off face-on, and it is bounded from above by the shard's own
 * default three-quarter view, which sees a horizontal plane — the ground, a
 * box's top — at 0.844 (`DEFAULT_PHI` in `scene.ts`, 57.6° above the
 * horizon). A gate over that number would mean the view the shard OPENS on
 * could not take a face at all, and P2/P3 — a profile on a face, a feature in
 * one — would have nowhere to land. So it sits just under it: the view you
 * are given can draw on a face, and tilting further off it conserves the
 * shape instead. At the gate the stretch is 1/0.8 = 25%, which is the most
 * distortion a reading is allowed to carry before the hand's own shape wins.
 */
export const FACING_TAKES = 0.8;
/** The anchor term with nothing in the plane to anchor to — absence of evidence. */
export const ANCHOR_BASE = 0.7;
/** The anchor term when there IS geometry in the plane and the ink is nowhere near it. */
export const ANCHOR_MISS = 0.5;
/** How far from the geometry, in the stroke's OWN sizes, an anchor still counts. */
export const ANCHOR_REACH = 1;
/** The continuity term for a plane that is not the previous stroke's. */
export const CONTINUITY_BASE = 0.85;
/** At pen-down, the pen is "near" the previous stroke within this many of its sizes. */
export const NEAR_PREVIOUS = 1.5;
/** A runner-up below this is not worth a chip — the read was not close. */
export const RUNNER_UP_FLOOR = 0.25;

// ---- what a candidate is ---------------------------------------------------

export interface Bounds2 {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/** Geometry lying IN a candidate's plane, in that plane's own (u, v). */
export interface Anchor {
  bounds: Bounds2;
  /** What it is, for the reasoning: `the top of artifact:7`, `artifact:3`. */
  what: string;
  /**
   * The solid this anchor belongs to, when it is a face. The form rung's row 3
   * needs it: a feature is a closed mark INSIDE a face, and the face's own
   * extent — not its infinite plane — is exactly this anchor's bounds.
   */
  solidId?: string;
}

export interface PlaneCandidate {
  plane: Plane;
  /** What the chip and the panel call it: `top of artifact:7`, `view`, `foundation`. */
  label: string;
  /** 0–1, from the formula above. 0 until `rank` has scored it. */
  confidence: number;
  reasoning: string;
  /** Kept, but never the winner (§10). */
  oblique: boolean;
  /**
   * Kept, offered by the chip, and never above the view plane: at this angle
   * taking the stroke would stretch it rather than read it (THE GATE). The
   * view plane itself is screen-facing by construction and is never gated.
   */
  gated?: boolean;
  /** The geometry in this plane the stroke may lie on. */
  anchor?: Anchor;
  /** Every term of the formula, so the panel can show the evidence, not only the number. */
  terms?: {
    shape: number;
    shapeLabel: string;
    facing: number;
    facingRaw: number;
    anchor: number;
    continuity: number;
  };
}

/** A face the pen's ray met at pen-down. `corners` are the face's own world corners. */
export interface FaceRef {
  solidId: string;
  /** Where the ray met it. */
  at: Vec3;
  /** The face's outward world normal. */
  normal: Vec3;
  /** The face's own corners in world space, for anchoring and for its bounds. */
  corners: Vec3[];
}

/** The stroke drawn a moment ago, as the `previous` candidate needs it. */
export interface PreviousRef {
  plane: Plane;
  /** When it was drawn. */
  at: number;
  /** Its ink, in its own plane's (u, v). */
  points: Point[];
  /** Its size in plane units — every nearness here is a ratio of it. */
  size: number;
}

/** Everything the scorer may read at pen-down. Nothing here is three.js. */
export interface PenScope {
  /** The gizmo's tile, already slid. A decision, not a candidate. */
  chosen: Plane | null;
  /** The pen's screen point at pen-down. */
  pen: Point;
  ray: RayCaster;
  /** The direction the camera looks. */
  look: Vec3;
  /** The camera's own up, for the view plane's and a face's v axis. */
  cameraUp: Vec3;
  /** The faces the pen's ray met, nearest first. */
  faces: FaceRef[];
  previous: PreviousRef | null;
  /**
   * Where the three world planes stand: the gizmo's slide when it has one, the
   * point the pen came down on when it came down on something, else the world
   * origin. `where` says which, in the words the candidate's reason uses.
   */
  worldOrigins?: { foundation?: Vec3; height?: Vec3; width?: Vec3; where?: string };
  /**
   * Where the view plane sits: **the cursor**, always (16 September 2026 —
   * Blender's 3D Cursor placement, SHARD-3D-PLAN §3). It used to be the depth
   * of the thing under the pen, or of the last thing touched, or the gizmo's
   * origin if nothing — a heuristic that put the plane somewhere different on
   * every stroke and left the hand no way to say where it wanted it. Blender's
   * answer is one place the hand puts and can see; `cursor.ts` is how it is
   * put, and the picker stands on it.
   */
  viewAnchor: Vec3;
  /** Why the view plane sits there — said out loud like every other reading. */
  viewAnchorWhy: string;
  at: number;
  recentWindowMs: number;
}

// ---- small geometry ---------------------------------------------------------

function bounds2(points: Point[]): Bounds2 {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  return { minX, minY, maxX, maxY };
}

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

function insideBounds(p: Point, b: Bounds2): boolean {
  return p.x >= b.minX && p.x <= b.maxX && p.y >= b.minY && p.y <= b.maxY;
}

/** Distance from a point to a box, in the box's own units. 0 inside it. */
function gapToBounds(p: Point, b: Bounds2): number {
  const dx = Math.max(b.minX - p.x, 0, p.x - b.maxX);
  const dy = Math.max(b.minY - p.y, 0, p.y - b.maxY);
  return Math.hypot(dx, dy);
}

/** A stroke's size in its plane's units — the diagonal of the box its ink fills. */
export function sizeOfPoints(points: Point[]): number {
  const b = bounds2(points);
  return Math.hypot(b.maxX - b.minX, b.maxY - b.minY);
}

/**
 * A plane's **v** axis, from the camera: v runs DOWN the screen, which is what
 * the engine's 2D space means by +y. The camera's own up, projected onto the
 * plane and reversed, is that direction for every plane that is not edge-on;
 * an edge-on plane falls back to the look direction, which is perpendicular
 * to the camera's up by construction.
 */
export function downScreen(normal: Vec3, cameraUp: Vec3, look: Vec3): Vec3 {
  const n = normalize(normal);
  const project = (d: Vec3) => sub(d, mul(n, dot(d, n)));
  const first = project(mul(normalize(cameraUp), -1));
  if (length(first) > 1e-4) return normalize(first);
  const second = project(normalize(look));
  if (length(second) > 1e-4) return normalize(second);
  // Degenerate only if the normal is parallel to both, which cannot happen.
  return normalize(cross(n, { x: 0, y: 1, z: 0 }));
}

/** Two candidates name the same plane when their normals agree and one's origin lies on the other. */
export function samePlane(a: Plane, b: Plane): boolean {
  const na = normalize(a.normal);
  const nb = normalize(b.normal);
  if (Math.abs(Math.abs(dot(na, nb)) - 1) > 1e-3) return false;
  return Math.abs(dot(sub(b.origin, a.origin), na)) < 1e-3;
}

// ---- building the candidates ------------------------------------------------

const AXIS_WORDS: { dir: Vec3; word: string }[] = [
  { dir: { x: 0, y: 1, z: 0 }, word: 'top' },
  { dir: { x: 0, y: -1, z: 0 }, word: 'underside' },
  { dir: { x: 0, y: 0, z: 1 }, word: 'front' },
  { dir: { x: 0, y: 0, z: -1 }, word: 'back' },
  { dir: { x: 1, y: 0, z: 0 }, word: 'right side' },
  { dir: { x: -1, y: 0, z: 0 }, word: 'left side' },
];

/** `top of artifact:7` — the face's normal said against the world's own axes. */
export function nameFace(normal: Vec3, solidId: string): string {
  const n = normalize(normal);
  let best = AXIS_WORDS[0];
  let bestDot = -Infinity;
  for (const a of AXIS_WORDS) {
    const d = dot(n, a.dir);
    if (d > bestDot) {
      bestDot = d;
      best = a;
    }
  }
  // A face square to nothing is honest about it rather than mislabelled.
  return `${bestDot > 0.8 ? best.word : `a face (${best.word}-ish)`} of ${solidId}`;
}

/** The face the pen met, as a candidate plane with the face's own bounds to anchor on. */
function faceCandidate(scope: PenScope, face: FaceRef): PlaneCandidate {
  const normal = normalize(face.normal);
  const up = downScreen(normal, scope.cameraUp, scope.look);
  const label = nameFace(normal, face.solidId);
  const plane: Plane = {
    origin: face.at,
    normal,
    up,
    source: 'face',
    name: label,
    why: `the pen came down on ${label}`,
  };
  const corners = face.corners.map((c) => toPlane(plane, c));
  return {
    plane,
    label,
    confidence: 0,
    reasoning: `the pen came down on ${label}`,
    oblique: false,
    ...(corners.length >= 2
      ? { anchor: { bounds: bounds2(corners), what: label, solidId: face.solidId } }
      : {}),
  };
}

/**
 * A world plane, standing WHERE THE PEN IS when the pen came down on
 * something, and through the world origin otherwise.
 *
 * §2.1 says "the three world planes through the origin (or through the
 * gizmo's slid origins)", and the parenthetical is the point: where a world
 * plane stands is a choice, and the gizmo's slide is the hand making it. With
 * nothing chosen there is no slide — but there is still a place the hand is
 * working, and standing the height plane at the world origin when the pen came
 * down on a profile's far corner offers a plane with nothing to do with the
 * stroke. Found by drawing an extent with nothing chosen: the line flipped
 * onto `height` landed on a plane the profile does not touch, so the form
 * rung could not see the extent it plainly was.
 */
function worldCandidate(name: 'foundation' | 'height' | 'width', origin?: Vec3, where?: string): PlaneCandidate {
  const make = name === 'foundation' ? foundation : name === 'height' ? height : width;
  const at = where ?? 'through the world origin';
  const base = make('world' as PlaneSource, `the ${name} plane ${at}, read from the evidence rather than chosen`);
  const plane: Plane = origin ? { ...base, origin } : base;
  return {
    plane,
    label: name,
    confidence: 0,
    reasoning: `the ${name} plane ${at}`,
    oblique: false,
  };
}

function viewCandidate(scope: PenScope): PlaneCandidate {
  const normal = normalize(mul(scope.look, -1)); // facing the camera
  const up = downScreen(normal, scope.cameraUp, scope.look);
  const plane: Plane = {
    origin: scope.viewAnchor,
    normal,
    up,
    source: 'view',
    name: 'view',
    why: `the view plane, ${scope.viewAnchorWhy}`,
  };
  return {
    plane,
    label: 'view',
    confidence: 0,
    reasoning: `screen-facing, ${scope.viewAnchorWhy}`,
    oblique: false,
  };
}

function previousCandidate(prev: PreviousRef): PlaneCandidate {
  const plane: Plane = {
    ...prev.plane,
    source: 'previous',
    why: `the plane the stroke a moment ago lay on (${prev.plane.name ?? 'a plane'})`,
  };
  return {
    plane,
    label: `previous · ${prev.plane.name ?? 'plane'}`,
    confidence: 0,
    reasoning: 'the stroke before this one lay here',
    oblique: false,
    anchor: { bounds: bounds2(prev.points), what: 'the stroke before this one' },
  };
}

/**
 * Every plane this stroke could be lying on, in the order the table of §2.1
 * gives them: the faces under the pen, the previous stroke's plane, the three
 * world planes, and the view plane. Duplicates are dropped by that same
 * priority, so a previous plane that IS the foundation is offered once, as
 * `previous` — the candidate that carries continuity.
 *
 * A chosen plane is not in here: it is a decision, and `pickAtPenDown` says so.
 */
export function candidatesFor(scope: PenScope): PlaneCandidate[] {
  const out: PlaneCandidate[] = [];
  for (const f of scope.faces) out.push(faceCandidate(scope, f));
  if (scope.previous && scope.at - scope.previous.at <= scope.recentWindowMs) {
    out.push(previousCandidate(scope.previous));
  }
  const o = scope.worldOrigins ?? {};
  out.push(worldCandidate('foundation', o.foundation, o.where));
  out.push(worldCandidate('height', o.height, o.where));
  out.push(worldCandidate('width', o.width, o.where));
  out.push(viewCandidate(scope));

  const kept: PlaneCandidate[] = [];
  for (const c of out) if (!kept.some((k) => samePlane(k.plane, c.plane))) kept.push(c);
  return kept;
}

/**
 * The plane to project LIVE onto, from the pen-down evidence alone (§3: "a
 * stroke's plane is fixed at pen-down and the stroke is projected live so it
 * stays flat"). A face under the pen beats everything **that makes sense at
 * its angle**; else the previous plane when it is recent AND the pen came
 * down near that stroke, under the same gate; else the view plane, which is
 * the default the table names.
 *
 * A face under the pen that is too oblique to take the stroke (THE GATE)
 * loses it to the view plane, which stands through the CURSOR (`viewAnchor`)
 * — so the ink lies in the plane the hand put there, at the size it was
 * drawn, rather than stretched across the face. The chip then offers the
 * face, one tap away. Shift + click on that face first, and the cursor is on
 * it: the ink then lands on the face's own depth, facing the camera.
 *
 * It is deliberately NOT the scorer: at pen-down there is no stroke to read,
 * so the only evidence is where the pen is. The scorer runs at pen-up.
 */
export function pickAtPenDown(scope: PenScope, candidates: PlaneCandidate[]): PlaneCandidate {
  const takeable = (c: PlaneCandidate) => facing(c.plane, scope.look) >= FACING_TAKES;

  const face = candidates.find((c) => c.plane.source === 'face');
  if (face && takeable(face)) return face;

  const prev = candidates.find((c) => c.plane.source === 'previous' && takeable(c));
  if (prev && scope.previous) {
    const at = rayPlane(scope.ray(scope.pen), prev.plane);
    if (at) {
      const uv = toPlane(prev.plane, at);
      const gap = gapToBounds(uv, bounds2(scope.previous.points));
      if (gap <= NEAR_PREVIOUS * Math.max(scope.previous.size, 1e-6)) return prev;
    }
  }

  const view = candidates.find((c) => c.plane.source === 'view');
  return view ?? candidates[0];
}

/** The stroke's screen path cast onto a plane, or null where the ray misses it. */
export function projectOnto(plane: Plane, screen: Point[], ray: RayCaster): Point[] | null {
  const out: Point[] = [];
  for (const s of screen) {
    const world = rayPlane(ray(s), plane);
    if (!world) return null; // the plane runs parallel to the eye, or lies behind it
    out.push(toPlane(plane, world));
  }
  return out.length >= 2 ? out : null;
}

// ---- the re-rank at pen-up (deferred commitment) ---------------------------

export interface RankScope {
  candidates: PlaneCandidate[];
  /** The screen path as it was drawn — kept with the stroke, so any plane is derivable. */
  screen: Point[];
  ray: RayCaster;
  look: Vec3;
  previous: PreviousRef | null;
  at: number;
  recentWindowMs: number;
}

/**
 * Score every candidate from the evidence and say the evidence.
 *
 * The same screen path is cast onto each candidate by ray, read by the shape
 * rung at that plane's own scale, and scored by the formula in the header.
 * Ranked, plural, never winner-take-all: the caller logs the winner and holds
 * them all, and the chip offers the runner-up (invariant 2).
 */
export function rank(scope: RankScope): PlaneCandidate[] {
  const mid = scope.screen[Math.floor(scope.screen.length / 2)] ?? scope.screen[0];
  const recent =
    scope.previous && scope.at - scope.previous.at <= scope.recentWindowMs ? scope.previous : null;

  const scored: PlaneCandidate[] = [];
  for (const c of scope.candidates) {
    const points = projectOnto(c.plane, scope.screen, scope.ray);
    if (!points) continue; // a plane this camera cannot draw on is not a candidate at all

    // ---- shape: the strongest term ----------------------------------------
    const scale = scaleAt(c.plane, scope.ray, mid);
    const top = analyzeStroke(points, scale).results[0];
    const shape = top ? top.confidence : SHAPE_FLOOR;
    const shapeLabel = top ? `${top.type} ${top.confidence.toFixed(2)}` : 'nothing the shape rung places';

    // ---- facing: how face-on it is, and the oblique gate -------------------
    const facingRaw = facing(c.plane, scope.look);
    const facingTerm = FACING_BASE + (1 - FACING_BASE) * facingRaw;
    const oblique = facingRaw < FACING_FLOOR;
    // THE GATE: the view plane is the default, and a plane that does not make
    // sense at its angle cannot take the stroke from it however well the ink
    // reads there. The view plane is screen-facing by construction, so it is
    // never gated — it is the thing the gate protects.
    const isView = c.plane.source === 'view';
    const gated = !isView && facingRaw < FACING_TAKES;

    // ---- anchor: does the ink lie on geometry in this plane? ---------------
    const size = Math.max(sizeOfPoints(points), 1e-6);
    let anchorTerm = ANCHOR_BASE;
    let anchorWhy = '';
    if (c.anchor) {
      const inside = points.filter((p) => insideBounds(p, c.anchor!.bounds)).length / points.length;
      const b = bounds2(points);
      const centre = { x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 };
      const gap = gapToBounds(centre, c.anchor.bounds) / size;
      const hold = Math.max(inside, clamp01(1 - gap / ANCHOR_REACH));
      anchorTerm = ANCHOR_MISS + (1 - ANCHOR_MISS) * hold;
      anchorWhy =
        inside > 0.5
          ? `, ${(inside * 100).toFixed(0)}% of its ink inside ${c.anchor.what}`
          : `, ${gap.toFixed(2)} of its own size from ${c.anchor.what}` +
            (anchorTerm < ANCHOR_BASE ? ' — too far off it for that plane to be where the ink is' : '');
    }

    // ---- continuity: the hand was drawing here a moment ago ----------------
    const continues = !!recent && samePlane(c.plane, recent.plane);
    const continuity = continues ? 1 : CONTINUITY_BASE;

    const confidence = shape * facingTerm * anchorTerm * continuity;
    const reasoning =
      `reads ${shapeLabel} there` +
      `, ${facingRaw > 0.85 ? 'nearly flat on' : `${(facingRaw * 100).toFixed(0)}% face-on`} to the camera` +
      anchorWhy +
      (continues ? ', and the stroke a moment ago lay on it' : '') +
      // The view plane says what it conserves; a gated one says what it would
      // have cost. Both are reasons, said out loud, in the panel's own list.
      (isView
        ? ' — shape conserved: the screen path lands on the plane through the cursor at the size it was drawn'
        : '') +
      (oblique
        ? ` — too oblique to read (under ${(FACING_FLOOR * 100).toFixed(0)}% face-on), so it is held but cannot win`
        : gated
          ? ` — too oblique to take the stroke (facing ${facingRaw.toFixed(2)}, under ${FACING_TAKES.toFixed(2)}): ` +
            `casting it here would stretch it by up to ×${(1 / Math.max(facingRaw, 1e-6)).toFixed(2)} across the plane's steepest direction, ` +
            `so the view plane keeps it — tap to take this one anyway`
          : '');

    scored.push({
      ...c,
      confidence,
      reasoning,
      oblique,
      gated,
      terms: { shape, shapeLabel, facing: facingTerm, facingRaw, anchor: anchorTerm, continuity },
    });
  }

  // Ranked by confidence in three bands, and the bands are the two rules:
  // every candidate that makes sense at its angle first, then every one that
  // does not (THE GATE — it cannot outrank the view plane, which is never
  // gated), then every one too oblique to read at all (§10). Each is kept and
  // said out loud; neither can win.
  const band = (c: PlaneCandidate) => (c.oblique ? 2 : c.gated ? 1 : 0);
  scored.sort((a, b) => band(a) - band(b) || b.confidence - a.confidence);
  return scored;
}

/**
 * The winner and the runner-up, for the chip: `top of artifact:7 0.82 · view 0.41`.
 *
 * A GATED runner-up is still offered. The gate says the evidence may not TAKE
 * the stroke by itself; it does not say the hand cannot have meant it, and a
 * hand that drew on the foundation from three-quarters on must be able to say
 * so in one act. Only a candidate too oblique to read at all is withheld —
 * there is nothing to flip onto.
 */
export function chipTextFor(ranked: PlaneCandidate[]): string | null {
  if (ranked.length < 2) return null;
  const [win, next] = ranked;
  if (next.oblique || next.confidence < RUNNER_UP_FLOOR) return null;
  return `${win.label} ${win.confidence.toFixed(2)} · ${next.label} ${next.confidence.toFixed(2)}`;
}

/**
 * What a candidate's number does NOT say, in a few words: why it cannot win,
 * or — for the view plane — what it keeps. The panel puts this beside the
 * confidence so the gate is visible in the list itself and not only in a
 * tooltip: a reading the hand cannot see the reason for is a verdict.
 */
export function candidateNote(c: PlaneCandidate): string {
  if (c.oblique) return ' · too oblique to read';
  if (c.gated) return ` · too oblique to take the stroke (facing ${(c.terms?.facingRaw ?? 0).toFixed(2)})`;
  return c.plane.source === 'view' ? ' · shape conserved' : '';
}

/** One line for the panel and the status line: the plane, its source, its number. */
export function describeCandidate(c: PlaneCandidate): string {
  return `${c.label} ${c.confidence.toFixed(2)}${candidateNote(c)}`;
}
