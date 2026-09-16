// ===== constraints =====
// WHAT A BODY IS STILL ANSWERING TO (SHARD-3D-PLAN §4; director review GRAPH-1).
//
// `honours the drawing` is a comparison between ink and a body's silhouette,
// and the whole question is WHICH INK. A tree's steps reference strokes for
// several different reasons, and the references are not interchangeable: the
// outline drawn where this body stands is a claim about THIS body; the outline
// a definition was made from lives at the original's position and in the
// original's frame; a hole's outline is a claim about a face, not about the
// extent. Reading `steps[0].from` and rasterising every closed mark where it
// happens to lie compares a placed mug against the first mug's plan, gets 0%,
// and reports that as the drawing being dishonoured — which is how the placed
// mug came to say *honours the drawing 20% · top 39 · top 0*.
//
// So this file answers one question — **what are the active constraints of this
// instance?** — by walking the tree and classifying every closed mark it
// references into one of three kinds:
//
//   * **target sketch** — an outline drawn AT this instance: a massing's
//     profiles, an `extrude`/`revolve` profile, a feature, a `match` profile,
//     and the profile a `place` step was put at (`toMark`). It lies in the
//     body's own space already, so it scores as it lies.
//   * **source correspondence** — the profiles the definition a `place` step
//     copied was made from (`of`, and every stroke the copied steps name).
//     These lie at the SOURCE's position, in the source's frame.
//   * **subsequently drawn revision** — an outline drawn against this body
//     after it stood (the form rung's *profile of* readings). It lies in the
//     body's own space too.
//
// **The decision on source correspondences: they are CARRIED, not dropped.** A
// placement's pose is already re-derived from two inks on every walk
// (`placeFrames`, invariant 4), so the same pose carries the definition's own
// outlines onto the instance, and a placed mug is then measured against the
// mug's own plan standing where the placed mug stands. That is semantically
// what a placement claims — *this is one of those, here, this big* — and it
// means a translation, a turn or a uniform scale cannot lower agreement merely
// because the source sketch is still lying somewhere else. When the pose cannot
// be derived (the source ink has been erased, so `deriveTree` calls the solid
// broken), the constraint is kept with its ids and `scores: false`: the
// provenance stays in the answer, the number does not.
//
// **A feature's outline is not a claim about the extent.** Coverage is an
// intersection over a union: a small circle on a face measured against the
// whole body's silhouette reads near zero whether it was cut or bossed, and a
// cut's outline is a claim that there is NOTHING there. Both are kept, both say
// so, neither is counted — and an extent claim drawn before a cut carries the
// note that it is expected to read low, which is the difference between a
// number that is wrong and a number that is explained.
//
// Pure: no session, no renderer, no three.js. The ink and the closedness come
// in through a context, so `log.ts` passes its own and a test passes two lines.

import type { Point } from 'metamedium-core';
import {
  frameVectors,
  placeFrames,
  type MassingStep,
  type MatchStep,
  type OpKind,
  type OpStep,
  type OpTree,
  type PlaceStep,
} from './op';
import { add, mul, normalize, sub, toPlane, toWorld, type Plane, type Vec3 } from './plane';

/** Which of the three roles a referenced mark plays for this instance. */
export type ConstraintKind = 'target' | 'source' | 'revision';

/** A plane's own axes, as `frameVectors` reads them out of a step. */
export type Frame = ReturnType<typeof frameVectors>;

/**
 * How an outline is carried out of the frame it was drawn in and into the
 * body's own. A `place` of a definition poses it; P3's `dup` shifts it.
 */
export type Carry =
  | { how: 'shift'; offset: Vec3; why: string }
  | {
      how: 'posed';
      scale: number;
      centreFrom: Vec3;
      centreTo: Vec3;
      frameFrom: Frame;
      frameTo: Frame;
      why: string;
    };

/** One claim the body is answering to, and what kind of claim it is. */
export interface ActiveConstraint {
  markId: string;
  kind: ConstraintKind;
  /** The step that references it; empty for a revision, which no step does. */
  stepId: string;
  /** The step's verb, or `drawn-since` for a revision. */
  op: OpKind | 'drawn-since';
  /** The definition it came through, when it came through a placement of one. */
  definition?: string;
  /** Innermost first: what to apply to put the ink where this body stands. */
  carry: Carry[];
  /** True when it is a claim about this body's extent, measurable in its space. */
  scores: boolean;
  /** Why it is not counted, when it is not. */
  aside?: string;
  /** A counted claim the tree says is expected to read low, and why. */
  expect?: string;
  reasoning: string;
}

export interface ConstraintContext {
  /** A mark's outline in its own plane's (u, v) — what a placement's pose is derived from. */
  inkOf(markId: string): { points: Point[] } | null;
  /** True when the mark is a closed outline. An open one is an extent, not a claim about the extent. */
  closed(markId: string): boolean;
}

// ---- carrying ---------------------------------------------------------------

/** R · x, where R takes the `from` frame onto the `to` frame. A rotation: no scale, no shear. */
function turn(frameFrom: Frame, frameTo: Frame, x: Vec3): Vec3 {
  const a = x.x * frameFrom.u.x + x.y * frameFrom.u.y + x.z * frameFrom.u.z;
  const b = x.x * frameFrom.v.x + x.y * frameFrom.v.y + x.z * frameFrom.v.z;
  const c = x.x * frameFrom.n.x + x.y * frameFrom.n.y + x.z * frameFrom.n.z;
  return add(add(mul(frameTo.u, a), mul(frameTo.v, b)), mul(frameTo.n, c));
}

/** One world point, carried. */
export function carryPoint(carry: Carry[], world: Vec3): Vec3 {
  let p = world;
  for (const c of carry) {
    if (c.how === 'shift') p = add(p, c.offset);
    else p = add(c.centreTo, mul(turn(c.frameFrom, c.frameTo, sub(p, c.centreFrom)), c.scale));
  }
  return p;
}

/**
 * The plane an outline lies on, carried with it — the origin moved, the normal
 * and the up turned. The scale is deliberately not applied to the directions:
 * a plane has no size, and normalising a scaled normal is the same normal.
 */
export function carryPlane(carry: Carry[], plane: Plane): Plane {
  let out = plane;
  for (const c of carry) {
    if (c.how === 'shift') {
      out = { ...out, origin: add(out.origin, c.offset) };
      continue;
    }
    out = {
      ...out,
      origin: carryPoint([c], out.origin),
      normal: normalize(turn(c.frameFrom, c.frameTo, out.normal)),
      up: normalize(turn(c.frameFrom, c.frameTo, out.up)),
    };
  }
  return out;
}

/**
 * An outline and its plane, carried together: the points go out to the world,
 * through the carries, and back into the carried plane's own (u, v) — so what
 * comes out is comparable with a silhouette taken on that plane, which is the
 * whole point of doing any of this.
 */
export function carryOutline(
  carry: Carry[],
  plane: Plane,
  points: Point[]
): { plane: Plane; points: Point[] } {
  if (!carry.length) return { plane, points };
  const carried = carryPlane(carry, plane);
  return {
    plane: carried,
    points: points.map((p) => toPlane(carried, carryPoint(carry, toWorld(plane, p)))),
  };
}

// ---- the query --------------------------------------------------------------

/** A step that takes material off after the fact: what makes an earlier outline read low. */
function removesMaterial(step: OpStep): boolean {
  if (step.op === 'cut') return true;
  if (step.op === 'match' && (step as MatchStep).how === 'remove') return true;
  // A clip (`massing` with `bound`) is not one: it holds a proposal INSIDE the
  // drawing, so it can only raise agreement with it.
  if (step.op === 'place') return (step as PlaceStep).steps.some(removesMaterial);
  return false;
}

/**
 * Short, because it stands in the middle of the row. A hole cut after an
 * outline was drawn makes that outline read low BY DESIGN, and the row saying
 * so is the difference between a number that is explained and a bare 39%.
 */
const CUT_SINCE = 'material was taken off since it was drawn — less is expected to show';

/** The pose a `place` step carries, re-derived from its two inks (never read out of the step). */
function carryOf(step: PlaceStep, ctx: ConstraintContext): { carry: Carry | null; why: string } {
  if (!step.definition || !step.of || !step.fromPlane) {
    const o = step.offset;
    return {
      carry: {
        how: 'shift',
        offset: o,
        why: `the copy stands ${Math.hypot(o.x, o.y, o.z).toFixed(2)} u from the body it was duplicated from`,
      },
      why: '',
    };
  }
  const src = ctx.inkOf(step.of);
  if (!src || src.points.length < 3) {
    return {
      carry: null,
      why:
        `${step.of}, the outline ${step.definition} is posed from, is not on the board — ` +
        `nothing of the definition's could be carried onto this body`,
    };
  }
  if (step.toMark && step.toPlane) {
    const dst = ctx.inkOf(step.toMark);
    if (!dst || dst.points.length < 3) {
      return {
        carry: null,
        why: `the outline ${step.toMark} this placement stands at is not on the board, so it has no pose`,
      };
    }
    const f = placeFrames({
      from: { points: src.points, plane: step.fromPlane },
      to: { points: dst.points, plane: step.toPlane },
    });
    return {
      carry: {
        how: 'posed',
        ...f,
        why:
          `${step.definition}'s own profiles, carried onto this one by the placement's own pose — ` +
          `${f.scale.toFixed(2)}× from ${step.of} onto ${step.toMark}, re-derived from both inks`,
      },
      why: '',
    };
  }
  const f = placeFrames({
    from: { points: src.points, plane: step.fromPlane },
    to: { point: step.toPoint ?? { x: 0, y: 0, z: 0 } },
  });
  return {
    carry: {
      how: 'posed',
      ...f,
      why: `${step.definition}'s own profiles, carried onto the copy standing at the point it was placed at`,
    },
    why: '',
  };
}

/**
 * A feature is a claim about a FACE; the extent claim is not the place to read
 * it. The short line stands in the row, the long one in the constraint's own
 * reasoning — a row is a sentence, and a paragraph in it is not a row.
 */
function featureAside(step: OpStep, markId: string): { short: string; long: string } {
  return step.op === 'cut'
    ? {
        short: `${markId} is the hole, not the outline`,
        long:
          `${markId} is the outline of the hole cut into this body, not the outline of the body — ` +
          `the silhouette is meant to show nothing there, and an intersection over a union would ` +
          `read that as a disagreement`,
      }
    : {
        short: `${markId} is a boss on a face, not the outline`,
        long:
          `${markId} is a boss standing on a face of this body, not its outline — a part measured ` +
          `against the whole reads near zero however well it fits`,
      };
}

interface WalkArgs {
  steps: OpStep[];
  carry: Carry[];
  kind: ConstraintKind;
  definition?: string;
  /** Set when the pose above could not be derived: everything under it keeps its ids and no number. */
  unposed?: string;
  ctx: ConstraintContext;
  out: ActiveConstraint[];
  seen: Set<string>;
  depth: number;
}

/** How deep a placement of a placement of a placement may go before this stops walking. */
export const MAX_PLACE_DEPTH = 8;

function walk(a: WalkArgs): void {
  if (a.depth > MAX_PLACE_DEPTH) return;

  const emit = (
    markId: string,
    step: { id: string; op: OpKind },
    say: { kind?: ConstraintKind; scores?: boolean; aside?: string; expect?: string; reasoning: string }
  ) => {
    if (a.seen.has(markId) || !a.ctx.closed(markId)) return;
    a.seen.add(markId);
    const scores = (say.scores ?? true) && !a.unposed;
    const aside = say.aside ?? a.unposed;
    a.out.push({
      markId,
      kind: say.kind ?? a.kind,
      stepId: step.id,
      op: step.op,
      ...(a.definition ? { definition: a.definition } : {}),
      carry: a.carry,
      scores,
      ...(scores ? {} : aside ? { aside } : {}),
      ...(scores && say.expect ? { expect: say.expect } : {}),
      reasoning: say.reasoning,
    });
  };

  a.steps.forEach((step, i) => {
    const cutSince = a.steps.slice(i + 1).some(removesMaterial) ? CUT_SINCE : undefined;

    if (step.op === 'place') {
      const ps = step as PlaceStep;
      const pose = carryOf(ps, a.ctx);
      const under: WalkArgs = {
        ...a,
        steps: ps.steps,
        carry: pose.carry ? [...a.carry, pose.carry] : a.carry,
        kind: 'source',
        ...(ps.definition ?? a.definition ? { definition: ps.definition ?? a.definition } : {}),
        ...(pose.carry ? {} : { unposed: a.unposed ?? pose.why }),
        depth: a.depth + 1,
      };
      // The outline this placement STANDS AT is a target sketch: it was drawn
      // here, at this instance, and it is what the pose was derived onto. It is
      // emitted before the copied tree, so the body's own drawing leads the row.
      if (ps.toMark) {
        const holed = cutSince ?? (ps.steps.some(removesMaterial) ? CUT_SINCE : undefined);
        emit(ps.toMark, step, {
          // …unless this placement is itself inside one: a copied tree's own
          // `toMark` was drawn at the DEFINITION, and is carried like the rest.
          kind: a.kind === 'source' ? 'source' : 'target',
          ...(holed ? { expect: holed } : {}),
          reasoning:
            `${ps.toMark} is the outline ${ps.definition ?? 'this copy'} was placed at — drawn here, ` +
            `at this instance, and measured where it lies`,
        });
      }
      // …and everything the copied tree names is a source correspondence: it
      // lies at the original, and the placement's own pose carries it here.
      walk(under);
      // A definition's matching profile no copied step happens to name is still
      // a correspondence, and is still owed an answer.
      if (ps.of && !a.seen.has(ps.of)) {
        const inner = { ...under, out: a.out, seen: a.seen };
        walkOne(inner, ps.of, step);
      }
      return;
    }

    if (step.op === 'massing') {
      for (const p of (step as MassingStep).profiles) {
        emit(p.id, step, {
          ...(cutSince ? { expect: cutSince } : {}),
          reasoning:
            `${p.id} is one of the profiles this body's extent was massed from, on the ` +
            `${p.plane.name ?? 'plane'} it was drawn on`,
        });
      }
    }

    if (step.op === 'cut' || step.op === 'boss') {
      for (const id of step.from) {
        const said = featureAside(step, id);
        emit(id, step, { scores: false, aside: said.short, reasoning: said.long });
      }
      return;
    }

    for (const id of step.from) {
      emit(id, step, {
        ...(cutSince ? { expect: cutSince } : {}),
        reasoning:
          a.kind === 'source'
            ? `${id} is an outline ${a.definition ?? 'the definition'} was made from, carried onto ` +
              `this body by the placement's own pose`
            : `${id} is an outline of this body, drawn on the plane it lies on and measured where it lies`,
      });
    }
  });
}

/** One mark, under the frame a walk is in — the `of` a placement names and nothing else does. */
function walkOne(a: WalkArgs, markId: string, step: { id: string; op: OpKind }): void {
  if (a.seen.has(markId) || !a.ctx.closed(markId)) return;
  a.seen.add(markId);
  a.out.push({
    markId,
    kind: 'source',
    stepId: step.id,
    op: step.op,
    ...(a.definition ? { definition: a.definition } : {}),
    carry: a.carry,
    scores: !a.unposed,
    ...(a.unposed ? { aside: a.unposed } : {}),
    reasoning:
      `${markId} is the profile ${a.definition ?? 'the definition'} was matched on, at the original — ` +
      `carried onto this body by the placement's own pose`,
  });
}

/**
 * The active constraints of one instance: every closed mark its tree
 * references, classified, with what it takes to measure it here.
 *
 * `drawnSince` is what the form rung reads as a profile OF this solid and no
 * step has taken in — the revisions. They are appended last and deduplicated
 * against the tree, so a `match`'s own profile is counted once, as the step's.
 */
export function activeConstraints(
  tree: OpTree,
  ctx: ConstraintContext,
  drawnSince: string[] = []
): ActiveConstraint[] {
  const out: ActiveConstraint[] = [];
  const seen = new Set<string>();
  walk({ steps: tree.steps, carry: [], kind: 'target', ctx, out, seen, depth: 0 });
  for (const markId of drawnSince) {
    if (seen.has(markId) || !ctx.closed(markId)) continue;
    seen.add(markId);
    out.push({
      markId,
      kind: 'revision',
      stepId: '',
      op: 'drawn-since',
      carry: [],
      scores: true,
      reasoning: `${markId} was drawn against this body after it stood — measured in the body's own space, where it lies`,
    });
  }
  return out;
}
