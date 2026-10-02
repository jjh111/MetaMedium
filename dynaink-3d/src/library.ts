// ===== library =====
// A definition carries its profiles, and a profile drawn again is matched
// against them (SHARD-3D-PLAN §2.5, §2.6 rule 3: *drawn later, a turret's
// profile is offered by its signature*).
//
// The rule the file exists to keep is the one §2.6 states twice: **the engine
// never learns what a definition is called, it learns that THIS is called
// that.** Nothing here knows the word "mug". It is handed definitions with
// names already bound by the hand, and it answers one question — how alike is
// this outline to the outlines that definition was made from — with a number
// and a sentence.
//
// Two things follow from the invariants:
//
//   * **Nothing derived is held that cannot be re-derived from the ink**
//     (invariant 4). A profile signature is the engine's OWN fingerprint of
//     the stroke, taken at the scale the stroke was drawn at — the same
//     fingerprint the shape rung read — plus which kind of plane it lay on.
//     Re-play the log and the same numbers come back.
//   * **Every reading is plural and says why** (invariant 2). `rankMatches`
//     returns every definition above the floor, best first, each with the
//     measurements it was scored on; a wrong one is arguable rather than
//     mysterious, and *Not a …* is how it is argued with.
//
// Pure: no three.js, no session, no DOM.

import { describeStructure, type Fingerprint, type StructuralSignature } from 'metamedium-core';
import type { Plane } from './plane';

/**
 * What kind of plane a profile was drawn on. Not WHICH plane — where a plane
 * has been slid to is not part of what makes a shape that shape — but which
 * of the three the gizmo names, or a face, or the view.
 */
export type PlaneKind = 'foundation' | 'height' | 'width' | 'face' | 'view' | 'previous' | 'plane';

export function planeKindOf(plane: Plane): PlaneKind {
  const name = plane.name;
  if (name === 'foundation' || name === 'height' || name === 'width') return name;
  if (plane.source === 'face') return 'face';
  if (plane.source === 'view') return 'view';
  if (plane.source === 'previous') return 'previous';
  return 'plane';
}

/**
 * The scale-free half of core's fingerprint, plus the size.
 *
 * Every number here is the engine's own (`getFingerprint`, at the stroke's own
 * scale); nothing is measured a second time by this file. The size is carried
 * but **does not score**: it is what `place` scales by, so two mugs of
 * different sizes are the same mug, which is the whole point of holding a
 * definition rather than a drawing.
 */
export interface ProfilePrint {
  aspectRatio: number;
  straightness: number;
  isClosed: boolean;
  extent: number;
  corners: number;
  size: number;
}

export function printOf(fp: Fingerprint): ProfilePrint {
  return {
    aspectRatio: fp.aspectRatio,
    straightness: fp.straightness,
    isClosed: fp.isClosed,
    extent: fp.extent,
    corners: fp.corners,
    size: fp.size,
  };
}

/** One profile a definition was made from: the ink's id, its print, its plane. */
export interface ProfileSignature {
  /** The stroke in the log. The placement's pose is re-derived from this ink. */
  markId: string;
  /** The step of the definition's tree that used it. */
  stepId?: string;
  planeKind: PlaneKind;
  /** What the shape rung called it, or '' when it placed nothing. */
  shape: string;
  print: ProfilePrint;
}

/** The structural signature of the profiles that share one plane — core's own. */
export interface ProfileStructure {
  planeKind: PlaneKind;
  signature: StructuralSignature;
  /** "3×circle + 2×line; circle-near-line ×2" */
  says: string;
}

/**
 * What a correction taught: this outline, on this plane, is NOT that
 * definition. Core's `correct` pattern (`session/signature.ts`), at the profile
 * rung — held in the log as its own rep, so it replays and one undo takes it
 * back.
 */
export interface ProfileExamples {
  accepted: ProfileSignature[];
  rejected: ProfileSignature[];
}

/** A definition, as far as matching is concerned. The log holds more beside it. */
export interface LibraryDefinition {
  name: string;
  /** The thing this is part of. For the whole, its own name. */
  basedOn: string;
  /** True for the definition that is the WHOLE thing rather than a named part of it. */
  whole?: boolean;
  profiles: ProfileSignature[];
  structures?: ProfileStructure[];
  examples?: ProfileExamples;
}

// ---- the thresholds, every one a ratio --------------------------------------

/**
 * The weights the profile comparison runs on — core's
 * `matchPrimitiveFromLibrary` re-weighted for a question it does not ask.
 *
 * Core weighs a stroke against a user's own primitive, where size is evidence
 * and a stroke may be open. Here both outlines are closed profiles and the
 * size is what the placement scales by, so the two terms that actually
 * separate a mug's outline from a plain box — **the corner count and the
 * extent** — carry most of the weight, and their falloffs are steeper.
 *
 * Measured, not guessed: with core's own weights a plain 2.4-square rectangle
 * scored **0.79** against a mug's side outline, which is over any floor worth
 * having. The two shapes differ by one corner and by a quarter of their
 * extent (a rectangle fills its box; the mug's outline fills three quarters of
 * it), and core reads the first at a fifth of the total and the second not at
 * all. With these the same rectangle scores **0.62** against the mug and
 * **1.00** against a box, and the mug's own outline the other way round.
 */
export const WEIGHTS = {
  straightness: 0.15,
  aspect: 0.2,
  corners: 0.28,
  closure: 0.12,
  extent: 0.25,
} as const;

/** Core's own veto, unchanged: too far apart in straightness and it is not the same kind of mark. */
export const STRAIGHTNESS_VETO = 0.5;
/** A definition is offered at or above this. */
export const PROFILE_FLOOR = 0.7;
/** At or above this, two profiles are the same profile — what a correction is compared at. */
export const SAME_PROFILE = 0.93;
/** Drawn on the same kind of plane it was first drawn on: evidence for. */
export const PLANE_LIFT = 0.06;
/** …and on another kind: evidence against, never a veto — a mug drawn on the width plane is still a mug. */
export const PLANE_DROP = 0.08;

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/**
 * How alike two profiles are, 0–1, and why.
 *
 * The straightness veto is core's and comes first: a closed outline and a
 * straight line are not the same thing however their boxes compare. Everything
 * after is a weighted agreement, each term said out loud in the terms it was
 * measured in.
 */
export function compareProfiles(a: ProfilePrint, b: ProfilePrint): { score: number; reasoning: string; vetoed: boolean } {
  const straightDiff = Math.abs(a.straightness - b.straightness);
  if (straightDiff > STRAIGHTNESS_VETO) {
    return {
      score: 0,
      vetoed: true,
      reasoning:
        `straightness ${a.straightness.toFixed(2)} against ${b.straightness.toFixed(2)} — ` +
        `over the ${STRAIGHTNESS_VETO} veto, so these are not the same kind of mark at all`,
    };
  }
  const straight = clamp01(1 - straightDiff);
  const ar = (p: ProfilePrint) => Math.min(p.aspectRatio, 1 / p.aspectRatio);
  const aspectDiff = Math.abs(ar(a) - ar(b));
  const aspect = clamp01(1 - aspectDiff * 2);
  // A corner apart is a hand being a hand; two apart is another shape. Core
  // divides by four, which was measured against a library of single primitives
  // where a stroke may also be open; between two closed outlines it is too
  // forgiving — four corners against eight still scored a fifth of the total.
  const cornerDiff = Math.abs(a.corners - b.corners);
  const corners = clamp01(1 - cornerDiff / 3);
  const closure = a.isClosed === b.isClosed ? 1 : 0;
  // **Extent is the strongest single discriminator** (CLAUDE.md, the shape
  // rung's own lesson): a rectangle fills its box and a mug's outline does not,
  // and the difference between 1.00 and 0.75 is the handle. A tenth of it is a
  // lot, so the falloff is steep.
  const extentDiff = Math.abs(a.extent - b.extent);
  const extent = clamp01(1 - extentDiff * 3);

  const score =
    straight * WEIGHTS.straightness +
    aspect * WEIGHTS.aspect +
    corners * WEIGHTS.corners +
    closure * WEIGHTS.closure +
    extent * WEIGHTS.extent;

  const said = [
    `${a.corners} corners against ${b.corners}`,
    `extent ${a.extent.toFixed(2)} against ${b.extent.toFixed(2)}`,
    `aspect ${ar(a).toFixed(2)} against ${ar(b).toFixed(2)}`,
    a.isClosed === b.isClosed ? (a.isClosed ? 'both closed' : 'both open') : 'one closed, one open',
  ];
  return { score, vetoed: false, reasoning: said.join(', ') };
}

export interface ProfileMatch {
  /** The definition's own name, as the hand bound it. */
  name: string;
  basedOn: string;
  whole: boolean;
  score: number;
  reasoning: string;
  /** The profile of the definition this outline matched — what `place` takes its pose from. */
  profile: ProfileSignature;
  /** True when a correction says this outline is not that. */
  vetoed: boolean;
}

/**
 * One outline against one definition: its best profile, lifted or lowered by
 * whether it was drawn on the same kind of plane, and vetoed outright by a
 * correction that says this is not that.
 */
export function matchLibraryDefinition(
  print: ProfilePrint,
  planeKind: PlaneKind,
  definition: LibraryDefinition
): ProfileMatch | null {
  if (!definition.profiles.length) return null;

  for (const r of definition.examples?.rejected ?? []) {
    const same = compareProfiles(print, r.print);
    if (!same.vetoed && same.score >= SAME_PROFILE && r.planeKind === planeKind) {
      return {
        name: definition.name,
        basedOn: definition.basedOn,
        whole: !!definition.whole,
        score: 0,
        vetoed: true,
        reasoning: `an outline like this on the ${planeKind} was corrected: not a ${definition.name}`,
        profile: r,
      };
    }
  }

  let best: ProfileMatch | null = null;
  const pool = [...definition.profiles, ...(definition.examples?.accepted ?? [])];
  for (const p of pool) {
    const c = compareProfiles(print, p.print);
    const agrees = p.planeKind === planeKind;
    const score = clamp01(c.vetoed ? 0 : c.score + (agrees ? PLANE_LIFT : -PLANE_DROP));
    const reasoning =
      `${c.reasoning}` +
      (c.vetoed
        ? ''
        : agrees
          ? ` — and drawn on the ${planeKind}, the same kind of plane ${p.markId} was (+${PLANE_LIFT.toFixed(2)})`
          : ` — but drawn on the ${planeKind} where ${p.markId} lay on the ${p.planeKind} (−${PLANE_DROP.toFixed(2)}); ` +
            `a plane is where a thing was drawn, not what it is`);
    if (best && score <= best.score) continue;
    best = {
      name: definition.name,
      basedOn: definition.basedOn,
      whole: !!definition.whole,
      score,
      vetoed: false,
      reasoning,
      profile: p,
    };
  }
  return best;
}

/**
 * Every definition this outline could be, best first, above the floor — the
 * plural reading (invariant 2). A vetoed one is dropped, not hidden: the
 * correction is why it is not here, and the log still carries it.
 */
export function rankMatches(
  print: ProfilePrint,
  planeKind: PlaneKind,
  definitions: LibraryDefinition[],
  floor = PROFILE_FLOOR
): ProfileMatch[] {
  const out: ProfileMatch[] = [];
  for (const d of definitions) {
    const m = matchLibraryDefinition(print, planeKind, d);
    if (!m || m.vetoed || m.score < floor) continue;
    out.push(m);
  }
  return out.sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
}

/** *mug 0.82* — what the chip beside the mark says. */
export function describeMatch(m: ProfileMatch): string {
  return `${m.name} ${m.score.toFixed(2)}`;
}

/**
 * Add an outline to a definition's examples, deduplicated and taken off the
 * other list — core's `addExample`, at the profile rung.
 */
export function addProfileExample(
  examples: ProfileExamples | undefined,
  sig: ProfileSignature,
  verdict: 'is' | 'is-not'
): ProfileExamples {
  const ex: ProfileExamples = {
    accepted: [...(examples?.accepted ?? [])],
    rejected: [...(examples?.rejected ?? [])],
  };
  const same = (s: ProfileSignature) =>
    s.planeKind === sig.planeKind && compareProfiles(s.print, sig.print).score >= SAME_PROFILE;
  if (verdict === 'is') {
    ex.rejected = ex.rejected.filter((s) => !same(s));
    if (!ex.accepted.some(same)) ex.accepted.push(sig);
  } else {
    ex.accepted = ex.accepted.filter((s) => !same(s));
    if (!ex.rejected.some(same)) ex.rejected.push(sig);
  }
  return ex;
}

/**
 * The structural signature of the profiles that share a plane — core's own
 * (`session/signature.ts`), and only where it applies.
 *
 * A signature's LINKS are the relations between marks, and the engine's
 * relations are computed in plane coordinates: two marks on different planes
 * have incomparable numbers, so a signature across planes would be arithmetic
 * about nothing (the README's core gap, unchanged). So one signature per plane
 * kind, and only where two or more profiles share one. It is held for what it
 * says about a definition and for the group matching a later package will
 * want; the offer P6 makes runs on the profile prints above, because a single
 * outline drawn again is a group of one and a group of one has no links.
 */
export function structuresFor(
  profiles: ProfileSignature[],
  signatureOf: (ids: string[]) => StructuralSignature | null
): ProfileStructure[] {
  const byPlane = new Map<PlaneKind, ProfileSignature[]>();
  for (const p of profiles) byPlane.set(p.planeKind, [...(byPlane.get(p.planeKind) ?? []), p]);
  const out: ProfileStructure[] = [];
  for (const [planeKind, group] of byPlane) {
    if (group.length < 2) continue;
    const signature = signatureOf(group.map((g) => g.markId));
    if (!signature) continue;
    out.push({ planeKind, signature, says: describeStructure(signature) });
  }
  return out;
}
