// ===== parts =====
// **The parts of a hull, said** (SHARD-3D-PUSH-2.md G2, and §1's last
// paragraph).
//
// A hull is one body, and a hand that drew a castle did not draw one thing: it
// drew two towers and a wall. §2.6's rule is that *names bind to steps*, and a
// model can only name what the engine can point at — so before a brief can ask
// for a name per part, the engine has to have parts, with ids, numbers and a
// sentence each.
//
// **A part claim is a RUN.** An elevation is an open stroke closed on the
// ground, and where it touches the ground it finishes one thing and starts the
// next: a ⊓ touches twice and is one run; a stroke that touches three times is
// two runs (a hand draws two towers without lifting the pen); a closed
// silhouette is one run, by its own ink. So the runs of the claims are the part
// claims, and **a part is the hull's material inside that run's prism**.
//
// Two rules keep the count honest:
//
//   * **The same material seen twice is one part.** A tower drawn from the
//     front and again from the side is two runs and one thing, so parts whose
//     bodies overlap by more than `PART_OVERLAP` of the smaller are merged, and
//     the merged part carries BOTH runs as its provenance.
//   * **A part's place is said in the footprint's own frame.** North is −Z
//     (said out loud, because a compass on a drawing is a convention and not a
//     measurement), the footprint's own box is cut in thirds each way, and the
//     part's footprint centre lands in one of the nine — *at the north-west
//     corner*, *along the east edge*, *in the middle* — or covers most of both
//     axes and is *the whole footprint*.
//
// **Where the geometry is.** The run-splitting, the frame, the thirds, the
// merge rule and the sentences are pure arithmetic and live here, testable with
// no renderer. The bodies come through the CSG seam (`csg.ts`), which never
// throws — a part whose intersection fails is dropped with its reason, and the
// board goes on standing.

import * as THREE from 'three';
import { intersect } from './csg';
import type { HullStep, Profile2D, PlaneRef } from './op';
import { offsetOf, toWorld, type Plane, type Vec3 } from './plane';
import { prismOn } from './solid';
import { viewLabelOf } from './form';

/**
 * A foot reaches the ground when it sits this near it, as a fraction of the
 * claim's own size.
 *
 * The same ratio `form.ts` reads a ⊓'s feet with (`FEET_ON_GROUND`), and
 * deliberately the same number: a stroke the form rung called an elevation
 * because its feet reach the ground must have those same feet found again here,
 * or a claim would stand with no runs in it and the hull would have no parts.
 * It is restated rather than imported to keep this file free of the form rung
 * (the rung imports nothing from here either), and `parts.test.ts` pins that
 * the two agree.
 */
export const RUN_ON_GROUND = 0.15;

/**
 * How much two parts' bodies must share, as a fraction of the SMALLER one's
 * volume, before they are one part.
 *
 * Two views of one tower overlap almost entirely — the intersection IS the
 * tower — so the bar is high; two towers standing side by side share at most
 * the sliver where their prisms graze, which is nothing like a half. Measured
 * on bounding boxes, and said so: an exact solid intersection volume is a third
 * boolean per pair, and the question being asked is only *are these the same
 * thing*.
 */
export const PART_OVERLAP = 0.5;

/** A run of a claim: the piece of it that stands between two ground touches. */
export interface Run {
  /** The claim's stroke id — several runs may share one. */
  claimId: string;
  /** Which run of that claim, from its start: 0, 1, … */
  index: number;
  /** The run's own outline, in the claim's plane's (u, v). */
  profile: Profile2D;
  /** The plane the claim was drawn on. */
  plane: PlaneRef;
  /** True when the run is closed by the GROUND rather than by its own ink. */
  ground: boolean;
  /** Why this is a run, in the words the panel can say. */
  reasoning: string;
}

/** Where a part sits on the footprint, and how it was said. */
export interface Place {
  /** *at the north-west corner* · *along the east edge* · *in the middle* · *the whole footprint*. */
  words: string;
  /** The third it landed in, along the footprint frame's two axes: -1, 0, +1. */
  cell: { u: number; v: number };
  /** The reason, with the compass convention named. */
  reasoning: string;
}

/** One part of a hull: its id, its body, its numbers, and where it stands in words. */
export interface Part {
  /** `part:1` … `part:n`, per hull, left to right along the footprint's longest edge seen from the front. */
  id: string;
  /** The runs that claim it — more than one when two views saw the same material. */
  runs: Run[];
  /** The stroke ids behind those runs, without repeats. */
  from: string[];
  geometry: THREE.BufferGeometry;
  /** The part's bounds in world units. */
  bounds: THREE.Box3;
  /** Its extent across the footprint, in the footprint's own frame. */
  span: { u: number; v: number };
  /** How far it reaches up, in world units. */
  height: number;
  place: Place;
  /** One sentence: the numbers and the words. */
  sentence: string;
}

/** What the parts came to, and what could not be made into one. */
export interface PartsOfHull {
  parts: Part[];
  /** A run that claimed nothing of the hull, or whose boolean did not come off, with its reason. */
  dropped: string[];
  /** The frame the places were said in — the footprint's own, or the hull's box when no footprint was drawn. */
  frame: FootprintFrame;
}

// ---- the footprint's own frame ----------------------------------------------

/**
 * The frame a part's place is said in: an origin, two axes across the ground,
 * and how far the footprint runs along each.
 *
 * Its `u` is the footprint's LONGEST edge direction, oriented so that it runs
 * left to right as the front view sees it (+X is screen right from the front),
 * which is what makes `part:1` … `part:n` a reading order a hand can follow.
 */
export interface FootprintFrame {
  origin: { x: number; z: number };
  u: { x: number; z: number };
  v: { x: number; z: number };
  /** Half-extents along u and v, from the origin. */
  half: { u: number; v: number };
  /** What each axis is called on the compass, from its own direction. */
  compass: { u: { plus: string; minus: string }; v: { plus: string; minus: string } };
  reasoning: string;
}

const NORTH = 'north';
const SOUTH = 'south';
const EAST = 'east';
const WEST = 'west';

/**
 * The compass, stated once: **north is −Z**, east is +X.
 *
 * A drawing has no north. The shard's foundation plane is the ground seen from
 * the top with −Z running away from the camera at home, so *away* is north —
 * the convention every plan drawing uses, and the only one that makes *the
 * north-west corner* mean the same thing twice. Every sentence that uses it
 * says so.
 */
export const COMPASS_NOTE = 'north is −Z, east is +X — the plan convention, stated so the words mean the same thing twice';

/** Which way a direction across the ground points, on the compass. */
function compassOf(d: { x: number; z: number }): { plus: string; minus: string } {
  return Math.abs(d.x) >= Math.abs(d.z)
    ? { plus: d.x >= 0 ? EAST : WEST, minus: d.x >= 0 ? WEST : EAST }
    : { plus: d.z >= 0 ? SOUTH : NORTH, minus: d.z >= 0 ? NORTH : SOUTH };
}

function planeOf(ref: PlaneRef): Plane {
  return {
    origin: ref.origin,
    normal: ref.normal,
    up: ref.up,
    source: 'chosen',
    ...(ref.name ? { name: ref.name } : {}),
    why: "the claim's own plane",
  } as Plane;
}

/** The claim's outline in world space. */
function worldOf(profile: Profile2D, plane: PlaneRef): Vec3[] {
  const p = planeOf(plane);
  return profile.points.map((pt) => toWorld(p, pt));
}

/**
 * The frame the footprint defines, or — with no footprint drawn — the frame the
 * standing body's own ground box defines.
 *
 * The longest edge is found from the outline's own convex extent: the direction
 * across the ground along which it reaches furthest. That is the same answer as
 * the longest edge for a rectangle and a sane answer for anything else, and it
 * needs no corner detection.
 */
export function footprintFrame(
  footprint: { profile: Profile2D; plane: PlaneRef } | null,
  fallback: THREE.Box3 | null
): FootprintFrame {
  let pts: { x: number; z: number }[] = [];
  let why: string;
  if (footprint) {
    pts = worldOf(footprint.profile, footprint.plane).map((w) => ({ x: w.x, z: w.z }));
    why = 'the footprint the hand drew, as it lies on the ground';
  } else if (fallback && !fallback.isEmpty()) {
    pts = [
      { x: fallback.min.x, z: fallback.min.z },
      { x: fallback.max.x, z: fallback.min.z },
      { x: fallback.max.x, z: fallback.max.z },
      { x: fallback.min.x, z: fallback.max.z },
    ];
    why = 'no footprint was drawn, so the standing body’s own ground box is the frame';
  } else {
    pts = [{ x: 0, z: 0 }];
    why = 'nothing stands and nothing was drawn on the ground — the world axes are the frame';
  }

  let cx = 0;
  let cz = 0;
  for (const p of pts) {
    cx += p.x;
    cz += p.z;
  }
  cx /= pts.length || 1;
  cz /= pts.length || 1;

  // **The longest edge is the long side of the TIGHTEST box**, not the
  // direction of furthest reach — which for any rectangle is its diagonal, so
  // a 6 × 4 plan came back with a frame turned 34° and a half-span of 3.6.
  // The same lesson `extent` taught the shape rung: measure against the
  // rotating-calipers box, not against the axis-aligned bounds.
  let best = { x: 1, z: 0 };
  let bestArea = Infinity;
  for (let deg = 0; deg < 180; deg++) {
    const t = (deg * Math.PI) / 180;
    const d = { x: Math.cos(t), z: Math.sin(t) };
    const n = { x: -d.z, z: d.x };
    let lo = Infinity;
    let hi = -Infinity;
    let loN = Infinity;
    let hiN = -Infinity;
    for (const p of pts) {
      const s = (p.x - cx) * d.x + (p.z - cz) * d.z;
      const sn = (p.x - cx) * n.x + (p.z - cz) * n.z;
      if (s < lo) lo = s;
      if (s > hi) hi = s;
      if (sn < loN) loN = sn;
      if (sn > hiN) hiN = sn;
    }
    const area = (hi - lo) * (hiN - loN);
    // The long side of that box is the frame's u, so a tie in area is settled
    // by taking the axis the outline reaches furthest along.
    if (area < bestArea - 1e-9 || (Math.abs(area - bestArea) <= 1e-9 && hi - lo > hiN - loN)) {
      bestArea = area;
      best = hi - lo >= hiN - loN ? d : n;
    }
  }
  // Left to right as the front view sees it: +X is screen right from the front.
  // A tie on x is settled by z, so the frame is the same on every run.
  if (best.x < 0 || (Math.abs(best.x) < 1e-9 && best.z < 0)) best = { x: -best.x, z: -best.z };
  const u = best;
  const v = { x: -u.z, z: u.x };

  let halfU = 0;
  let halfV = 0;
  for (const p of pts) {
    halfU = Math.max(halfU, Math.abs((p.x - cx) * u.x + (p.z - cz) * u.z));
    halfV = Math.max(halfV, Math.abs((p.x - cx) * v.x + (p.z - cz) * v.z));
  }

  return {
    origin: { x: cx, z: cz },
    u,
    v,
    half: { u: Math.max(halfU, 1e-6), v: Math.max(halfV, 1e-6) },
    compass: { u: compassOf(u), v: compassOf(v) },
    reasoning: `${why}. ${COMPASS_NOTE}`,
  };
}

/** A world point in the frame's own (u, v) across the ground. */
function inFrame(frame: FootprintFrame, x: number, z: number): { u: number; v: number } {
  const dx = x - frame.origin.x;
  const dz = z - frame.origin.z;
  return { u: dx * frame.u.x + dz * frame.u.z, v: dx * frame.v.x + dz * frame.v.z };
}

// ---- the place, in words -----------------------------------------------------

/** How much of the footprint a part must cover, each way, before it IS the footprint. */
export const WHOLE_SPAN = 0.8;

/**
 * A third either way, from a part's footprint centre.
 *
 * The cell is −1 / 0 / +1 on each axis; the words come from the compass name of
 * the axis direction that cell points along. A part that covers most of both
 * axes is *the whole footprint*, however its centre falls — a keep that fills
 * its own plan is not *in the middle* of it.
 */
export function placeOf(
  frame: FootprintFrame,
  centre: { u: number; v: number },
  span: { u: number; v: number }
): Place {
  const wholeU = span.u >= frame.half.u * 2 * WHOLE_SPAN;
  const wholeV = span.v >= frame.half.v * 2 * WHOLE_SPAN;
  if (wholeU && wholeV) {
    return {
      words: 'the whole footprint',
      cell: { u: 0, v: 0 },
      reasoning:
        `it covers ${(span.u / (frame.half.u * 2) * 100).toFixed(0)}% of the footprint one way and ` +
        `${(span.v / (frame.half.v * 2) * 100).toFixed(0)}% the other, both over ${(WHOLE_SPAN * 100).toFixed(0)}% — ` +
        `so it is the thing, not a place on it. ${COMPASS_NOTE}`,
    };
  }
  const third = (s: number, half: number) => (s < -half / 3 ? -1 : s > half / 3 ? 1 : 0);
  const cu = third(centre.u, frame.half.u);
  const cv = third(centre.v, frame.half.v);
  const nameU = cu === 0 ? null : cu > 0 ? frame.compass.u.plus : frame.compass.u.minus;
  const nameV = cv === 0 ? null : cv > 0 ? frame.compass.v.plus : frame.compass.v.minus;

  // North/south lead a corner's name, the way a compass rose is read.
  const ns = [nameU, nameV].find((n) => n === NORTH || n === SOUTH) ?? null;
  const we = [nameU, nameV].find((n) => n === EAST || n === WEST) ?? null;

  let words: string;
  if (ns && we) words = `at the ${ns}-${we} corner`;
  else if (ns || we) words = `along the ${ns ?? we} edge`;
  else words = 'in the middle';

  return {
    words,
    cell: { u: cu, v: cv },
    reasoning:
      `its footprint centre sits ${centre.u >= 0 ? '+' : ''}${centre.u.toFixed(2)} u and ` +
      `${centre.v >= 0 ? '+' : ''}${centre.v.toFixed(2)} u from the footprint's middle, in a plan ` +
      `${(frame.half.u * 2).toFixed(2)} × ${(frame.half.v * 2).toFixed(2)} u cut in thirds each way. ${COMPASS_NOTE}`,
  };
}

// ---- the runs ----------------------------------------------------------------

/**
 * The runs of one claim.
 *
 * A closed claim is one run, by its own ink. An elevation is walked along its
 * own path: every maximal stretch of points sitting on the ground is a TOUCH,
 * and what stands between two touches is a run, closed on the ground by joining
 * its ends. A stroke with two touches — the ⊓ every hand draws — is one run;
 * three touches is two runs; a stroke that never leaves the ground is none, and
 * says so.
 */
export function runsOf(claim: {
  id: string;
  profile: Profile2D;
  plane: PlaneRef;
  ground?: boolean;
}): { runs: Run[]; why: string } {
  const { id, profile, plane } = claim;
  // **`ground` is read FIRST, before `closed`.** An elevation's profile is held
  // with `closed: true` — it is closed ON THE GROUND, and the flag is what tells
  // the prism to join its feet (`claimShape` in `log.ts`). Reading that flag as
  // *closed by its own ink* takes a ⊓ down the wrong branch and reports the
  // whole stroke as one run that stands on nothing, which is what it did.
  if (!claim.ground) {
    return {
      runs: [
        {
          claimId: id,
          index: 0,
          profile,
          plane,
          ground: false,
          reasoning: `a closed silhouette from ${viewLabelOf(planeOf(plane))} — one run, closed by its own ink`,
        },
      ],
      why: 'closed by its own ink',
    };
  }

  const world = worldOf(profile, plane);
  if (world.length < 3) return { runs: [], why: 'too few points to walk' };
  let size = 0;
  for (const a of world) for (const b of world) size = Math.max(size, Math.abs(a.x - b.x), Math.abs(a.y - b.y), Math.abs(a.z - b.z));
  const near = Math.max(size, 1e-6) * RUN_ON_GROUND;
  const onGround = world.map((w) => Math.abs(w.y) <= near);

  // The touches: maximal stretches of points on the ground, as index ranges.
  const touches: { from: number; to: number }[] = [];
  for (let i = 0; i < onGround.length; i++) {
    if (!onGround[i]) continue;
    const from = i;
    while (i + 1 < onGround.length && onGround[i + 1]) i++;
    touches.push({ from, to: i });
  }
  if (touches.length < 2) {
    return {
      runs: [],
      why:
        touches.length === 1
          ? 'it touches the ground once — a run needs two feet, and one foot is a lean, not a thing standing'
          : 'it never reaches the ground, so nothing here stands on it',
    };
  }

  const runs: Run[] = [];
  for (let t = 0; t + 1 < touches.length; t++) {
    // From the LAST point of one touch to the FIRST of the next: the piece that
    // left the ground and came back. Both ends are on the ground, so the line
    // that joins them is the ground, which is the run's fourth side.
    const from = touches[t].to;
    const to = touches[t + 1].from;
    const points = profile.points.slice(from, to + 1);
    if (points.length < 3) continue;
    let top = 0;
    for (let i = from; i <= to; i++) top = Math.max(top, world[i].y);
    if (top <= near) continue; // it crawled along the floor: a plan, not a silhouette
    runs.push({
      claimId: id,
      index: runs.length,
      profile: { shape: profile.shape, points, closed: false, reasoning: profile.reasoning },
      plane,
      ground: true,
      reasoning:
        `run ${runs.length + 1} of ${id}, from ${viewLabelOf(planeOf(plane))}: it leaves the ground and comes back, ` +
        `rising ${top.toFixed(2)} u between its feet — closed on the ground`,
    });
  }
  return {
    runs,
    why:
      `${touches.length} ground touches → ${runs.length} run${runs.length === 1 ? '' : 's'} ` +
      `(a foot is within ${(RUN_ON_GROUND * 100).toFixed(0)}% of the stroke's own size of the ground)`,
  };
}

/** Every run of a hull's claims, in the order the claims were drawn. */
export function runsOfHull(step: HullStep): { runs: Run[]; dropped: string[] } {
  const runs: Run[] = [];
  const dropped: string[] = [];
  for (const claim of step.claims) {
    const r = runsOf(claim);
    if (!r.runs.length) dropped.push(`${claim.id} claims no part — ${r.why}`);
    runs.push(...r.runs);
  }
  return { runs, dropped };
}

// ---- the bodies --------------------------------------------------------------

/** How far past the site a run's prism runs at each end, as a ratio of the site's own span. */
const PART_OVERSHOOT = 0.05;

/**
 * A run's prism, run through the site's own span along the run's plane normal.
 *
 * The prism's job here is only to CUT the site, so it needs to reach past it
 * and no further — which also means a part never depends on how deep the hand's
 * cursor happened to be when the claim was drawn.
 */
function prismOf(run: Run, site: THREE.BufferGeometry): THREE.BufferGeometry | null {
  const plane = planeOf(run.plane);
  site.computeBoundingBox();
  const box = site.boundingBox;
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
  const span = Math.max(max - min, 1e-3);
  const pad = span * PART_OVERSHOOT;
  // `prismOn` is `solid.ts`'s own prism builder, in world space: the shard has
  // one place that knows how a profile stands up on a plane, and two copies of
  // that would be two places for the frame convention to drift.
  return prismOn(run.profile.points, run.profile.closed || run.ground, plane, min - pad, span + pad * 2);
}

/**
 * **The site a part is cut out of is the hull itself** — G2's own first
 * sentence, kept literally, and worth writing down why after the alternative
 * was built and measured.
 *
 * The alternative was to bound each run by the FOOTPRINT instead: *the thing
 * stands here, to this plan*. It sounds right and it is wrong, because a single
 * ⊓ carries no depth. Bounded only by the plan, John's tower came out a slab
 * 2.8 u across a 6 × 4 footprint — the engine inventing a size nobody drew,
 * which is the one thing no rung here may do. Bounded by the hull, a part is
 * always material that is actually standing, so the cage the panel draws is
 * around something the hand can see.
 *
 * What that costs is said plainly in the README and in `parts.test.ts`: three
 * PARTIAL silhouettes from two standpoints do not determine three masses, so
 * John's own castle-sketch stands two parts and not three. The information is
 * not in the drawing; a second view of each tower would put it there.
 */
function siteOf(_step: HullStep, hull: THREE.BufferGeometry | null): THREE.BufferGeometry | null {
  return hull;
}

function boxVolume(b: THREE.Box3): number {
  const s = b.getSize(new THREE.Vector3());
  return Math.max(s.x, 0) * Math.max(s.y, 0) * Math.max(s.z, 0);
}

/** How much two boxes share, as a fraction of the smaller one's volume. */
export function boxOverlap(a: THREE.Box3, b: THREE.Box3): number {
  const shared = a.clone().intersect(b);
  if (shared.isEmpty()) return 0;
  const smaller = Math.min(boxVolume(a), boxVolume(b));
  return smaller > 0 ? boxVolume(shared) / smaller : 0;
}

/**
 * **The parts of a hull**: every run's prism cut out of the standing body, with
 * the ones that turn out to be the same material merged.
 *
 * Nothing is thrown: a boolean that does not come off, or a run that claims no
 * material at all, is dropped with its reason and the rest still stand.
 */
export function partsOfHull(step: HullStep, hull: THREE.BufferGeometry | null): PartsOfHull {
  const footprintClaim = step.footprint ? step.claims.find((c) => c.id === step.footprint) ?? null : null;
  if (!hull) {
    return {
      parts: [],
      dropped: ['nothing stands — a part is the hull’s own material, and there is no hull'],
      frame: footprintFrame(footprintClaim, null),
    };
  }
  hull.computeBoundingBox();
  const frame = footprintFrame(footprintClaim, hull.boundingBox);
  const { runs, dropped } = runsOfHull(step);
  const site = siteOf(step, hull);
  if (!site) {
    return { parts: [], dropped: [...dropped, 'no footprint and no standing body — nothing bounds a mass'], frame };
  }

  // Each run, cut out of the site.
  let found: { runs: Run[]; geometry: THREE.BufferGeometry; bounds: THREE.Box3 }[] = [];
  for (const run of runs) {
    // The footprint itself claims the whole site, which is not a part of it.
    if (run.claimId === step.footprint) continue;
    const tool = prismOf(run, site);
    if (!tool) {
      dropped.push(`${run.claimId} run ${run.index + 1} — its outline is degenerate, so it cuts nothing`);
      continue;
    }
    const r = intersect(site, tool);
    if (!r.ok) {
      dropped.push(`${run.claimId} run ${run.index + 1} — ${r.error}`);
      continue;
    }
    const geometry = r.geometry;
    geometry.computeBoundingBox();
    const bounds = geometry.boundingBox?.clone() ?? new THREE.Box3();
    if (bounds.isEmpty() || boxVolume(bounds) < 1e-9) {
      dropped.push(`${run.claimId} run ${run.index + 1} — it claims none of the site`);
      continue;
    }
    found.push({ runs: [run], geometry, bounds });
  }

  // The same material, seen twice, is one part.
  const merged: typeof found = [];
  for (const candidate of found) {
    const into = merged.find((m) => boxOverlap(m.bounds, candidate.bounds) > PART_OVERLAP);
    if (into) {
      into.runs.push(...candidate.runs);
      // The material is the same material; the tighter reading of it is the
      // one both views agree on, so the smaller body is kept.
      if (boxVolume(candidate.bounds) < boxVolume(into.bounds)) {
        into.geometry = candidate.geometry;
        into.bounds = candidate.bounds;
      }
      continue;
    }
    merged.push(candidate);
  }
  found = merged;

  // Reading order: left to right along the footprint's longest edge.
  const centreOf = (b: THREE.Box3) => {
    const c = b.getCenter(new THREE.Vector3());
    return inFrame(frame, c.x, c.z);
  };
  found.sort((a, b) => {
    const ca = centreOf(a.bounds);
    const cb = centreOf(b.bounds);
    return ca.u - cb.u || ca.v - cb.v;
  });

  const parts: Part[] = found.map((f, i) => {
    const centre = centreOf(f.bounds);
    // The part's extent across the ground, in the frame's own axes: measured
    // from its box's four ground corners, which is exact for a box and honest
    // for anything else (the box is what the cage draws).
    const corners = [
      { x: f.bounds.min.x, z: f.bounds.min.z },
      { x: f.bounds.max.x, z: f.bounds.min.z },
      { x: f.bounds.max.x, z: f.bounds.max.z },
      { x: f.bounds.min.x, z: f.bounds.max.z },
    ].map((c) => inFrame(frame, c.x, c.z));
    const span = {
      u: Math.max(...corners.map((c) => c.u)) - Math.min(...corners.map((c) => c.u)),
      v: Math.max(...corners.map((c) => c.v)) - Math.min(...corners.map((c) => c.v)),
    };
    const height = f.bounds.max.y - f.bounds.min.y;
    const place = placeOf(frame, centre, span);
    const from = [...new Set(f.runs.map((r) => r.claimId))];
    const id = `part:${i + 1}`;
    return {
      id,
      runs: f.runs,
      from,
      geometry: f.geometry,
      bounds: f.bounds,
      span,
      height,
      place,
      sentence: sentenceFor(id, span, height, place, f.runs),
    };
  });

  return { parts, dropped, frame };
}

/**
 * One part, in numbers and words — G2's own sentence:
 *
 *     part 2 — 1.2 × 1.0 u on the footprint, 3.1 u tall, at the north-west
 *     corner; from stroke:4 (drawn from 34° · +24°)
 */
function sentenceFor(
  id: string,
  span: { u: number; v: number },
  height: number,
  place: Place,
  runs: Run[]
): string {
  const seen = new Set<string>();
  const sources: string[] = [];
  for (const r of runs) {
    const key = r.claimId;
    if (seen.has(key)) continue;
    seen.add(key);
    sources.push(`${r.claimId} (drawn from ${viewLabelOf(planeOf(r.plane))})`);
  }
  return (
    `${id.replace(':', ' ')} — ${span.u.toFixed(1)} × ${span.v.toFixed(1)} u on the footprint, ` +
    `${height.toFixed(1)} u tall, ${place.words}; from ${sources.join(' and ')}`
  );
}

/** Every part of a hull, one sentence each. */
export function describeParts(found: PartsOfHull): string[] {
  return found.parts.map((p) => p.sentence);
}
