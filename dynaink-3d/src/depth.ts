// ===== depth =====
// **A hull stood on one standpoint asks how deep** (DIRECTOR-PLAN-W2 L2c; week
// 1's U3 — `SHARD-3D-PUSH-2.md`'s *honest limit*, given a door).
//
// The visual hull is the intersection of silhouettes. A footprint and a ⊓
// drawn from ONE standpoint stand a hull at tier 1, and along that
// standpoint's sightline nothing but the plan bounds it: the tower runs as far
// back as the keep's footprint does. That depth was a default, taken silently
// — `hullBody` in `solid.ts` grows every prism through the span of the others,
// and here the only other is the plan. This module says so, and nothing else:
//
//   * **When is a depth lacking?** When the hull's claims, gathered by the
//     direction they look along (the grouping `hullBody` itself uses), are a
//     plan — claims looking down, past the form rung's own `PLAN_NORMAL` — and
//     exactly ONE other standpoint,
//     and that standpoint's silhouette covers less of the plan across the view
//     than `SEEN_WHOLE`. A view that shows the whole plan across it is plan and
//     elevation, the oldest way of drawing a thing, and the plan's depth is the
//     thing's own; a tower on a keep shows a sliver of it, and the keep's depth
//     is not the tower's. Two standpoints bound each other, and no plan means
//     the views bound one another: neither asks.
//   * **The candidates, each with its number and its reason.** The depth it
//     took — as far as the plan runs behind the silhouette, the number the body
//     stands at now — and as deep as it is wide across the view. Plural, never
//     one number, and the one it took is marked as the default it is.
//   * **Two answers, one closure.** A second view closes it by MEASURING — the
//     claim is in the log and the hull has two standpoints — and a word closes
//     it by SAYING, held on the hull step (`HullStep.depth`) and read by
//     `solid.ts` as a slab the body is cut to, measured back from the side the
//     view was drawn from. Whether the question stands is derived here, from
//     the step, on every read: undo, a dropped claim and a replay all re-ask
//     it with nothing remembered.
//
// Pure: plain numbers in, plain numbers out. No renderer, no three.js, no DOM,
// no session — `log.ts` puts the question on the explanation plane and holds
// the word; `solid.ts` cuts the body.

import { PLAN_NORMAL, viewLabelOf } from './form';
import { dot, normalize, toWorld, type Plane, type Vec3 } from './plane';
import type { HullDepth, HullStep, PlaneRef } from './op';

/**
 * The question's own word on the explanation plane — `session.answer`'s
 * `question`, the way `room.ts` marks a brief with `brief`. The text is the
 * sentence; this says which kind of sentence it is.
 */
export const DEPTH_QUESTION = 'how deep?';

/**
 * How much of the plan, across the view, a silhouette must cover before the
 * view is a view of the WHOLE plan — and the plan's depth the thing's own.
 *
 * A ratio of the plan's own width (invariant 8). Four fifths leaves a hand
 * room to draw an elevation a little narrower than the footprint it stands on
 * and still be plan-and-elevation; a tower on a keep covers a third at most.
 */
export const SEEN_WHOLE = 0.8;

/** Two claims look the same way when their normals agree this closely — `hullBody`'s own tolerance. */
const SAME_DIRECTION = 1 - 1e-6;

/** One reading of how deep, with its number and its reason. */
export interface DepthCandidate {
  words: string;
  /** World units along the sightline. */
  u: number;
  /** The depth the body stands at now — the default it took. */
  took: boolean;
  reasoning: string;
}

/** What a hull seen from one standpoint lacks, measured. */
export interface DepthLack {
  /** The standpoint's claims — the silhouette it was seen as. */
  claims: string[];
  /** Where it was seen from, the way the pinned-view chips say it: *64° · +29°*. */
  view: string;
  /** The sightline across the ground, unit length, pointing TOWARD the standpoint. */
  along: Vec3;
  /** What the body stands at along it now: the plan's reach behind the silhouette. */
  took: number;
  /** How far toward the standpoint that reach comes — where a said depth is measured back from. */
  near: number;
  /** The silhouette's widest piece, across the view. */
  wide: number;
  candidates: DepthCandidate[];
  /** The sentence the board carries. */
  question: string;
}

/**
 * Where a hull's depth stands.
 *
 *   * `measured` — the drawing bounds it: two standpoints, no plan, or a view
 *     of the whole plan. Nothing is asked.
 *   * `asking` — one standpoint, and nothing but the plan bounds it.
 *   * `said` — it was asking, and a word answered it.
 */
export type DepthState = 'measured' | 'asking' | 'said';

export interface DepthReading {
  state: DepthState;
  lack: DepthLack | null;
  said: HullDepth | null;
  reasoning: string;
}

const f = (u: number) => `${u.toFixed(2)} u`;

function planeOf(ref: PlaneRef): Plane {
  return {
    origin: ref.origin,
    normal: ref.normal,
    up: ref.up,
    source: 'world',
    ...(ref.name ? { name: ref.name } : {}),
    why: "the claim's own plane",
  } as Plane;
}

/** Where a claim was drawn from, in the words a person uses. */
function standpointOf(ref: PlaneRef): string {
  if (ref.name && ref.name !== 'view') return `the ${ref.name} plane`;
  return viewLabelOf(planeOf(ref));
}

type Claim = HullStep['claims'][number];

function worldOf(c: Claim): Vec3[] {
  const plane = planeOf(c.plane);
  return c.profile.points.map((p) => toWorld(plane, p));
}

/** The claims, gathered by the direction they look along, up to sign. */
function groupsOf(claims: readonly Claim[]): { normal: Vec3; claims: Claim[] }[] {
  const out: { normal: Vec3; claims: Claim[] }[] = [];
  for (const c of claims) {
    const n = normalize(c.plane.normal);
    const into = out.find((g) => Math.abs(dot(g.normal, n)) > SAME_DIRECTION);
    if (into) into.claims.push(c);
    else out.push({ normal: n, claims: [c] });
  }
  return out;
}

/**
 * A claim looks down — is a PLAN — past the form rung's own `PLAN_NORMAL`: what
 * a view from up there shows is a plan, not an elevation (`form.ts`), so it
 * bounds the hull the way a footprint does and is no standpoint to lack a
 * depth from.
 */
const looksDown = (n: Vec3) => Math.abs(n.y) > PLAN_NORMAL;

/** A point across the ground: `a` along the sightline, `b` across it. */
interface AB {
  a: number;
  b: number;
}

/** A polygon kept to one side of `b = edge` — one pass of Sutherland–Hodgman. */
function clipHalf(pts: AB[], keep: (p: AB) => boolean, edge: number): AB[] {
  const out: AB[] = [];
  const at = (p: AB, q: AB): AB => {
    const t = (edge - p.b) / (q.b - p.b);
    return { a: p.a + (q.a - p.a) * t, b: edge };
  };
  for (let i = 0; i < pts.length; i++) {
    const cur = pts[i];
    const prev = pts[(i + pts.length - 1) % pts.length];
    if (keep(cur)) {
      if (!keep(prev)) out.push(at(prev, cur));
      out.push(cur);
    } else if (keep(prev)) out.push(at(prev, cur));
  }
  return out;
}

/** The part of a polygon inside the band `lo ≤ b ≤ hi`. */
function clipBand(poly: AB[], lo: number, hi: number): AB[] {
  return clipHalf(clipHalf(poly, (p) => p.b >= lo, lo), (p) => p.b <= hi, hi);
}

/**
 * The plan the body stands on, as `hullBody` gathers it: outlines that lie
 * APART are pieces of one plan and all count; outlines that OVERLAP are two
 * accounts of it and are intersected. Read on their boxes, as the hull reads
 * them (`gatherSilhouette`), so a keep's footprint with a tower's own plan
 * drawn inside it stands on the tower's plan — here as there.
 */
function planOf(plans: readonly Claim[], toAB: (p: Vec3) => AB): AB[][] {
  const boxes = plans.map((c) => {
    const w = worldOf(c);
    return {
      w,
      minX: Math.min(...w.map((p) => p.x)),
      maxX: Math.max(...w.map((p) => p.x)),
      minZ: Math.min(...w.map((p) => p.z)),
      maxZ: Math.max(...w.map((p) => p.z)),
    };
  });
  const apart = (p: (typeof boxes)[number], q: (typeof boxes)[number]) =>
    p.maxX <= q.minX || q.maxX <= p.minX || p.maxZ <= q.minZ || q.maxZ <= p.minZ;
  const clusters: (typeof boxes)[] = [];
  for (const b of boxes) {
    const into = clusters.find((c) => c.some((o) => !apart(o, b)));
    if (into) into.push(b);
    else clusters.push([b]);
  }
  return clusters.map((c) => {
    if (c.length === 1) return c[0].w.map(toAB);
    const minX = Math.max(...c.map((b) => b.minX));
    const maxX = Math.min(...c.map((b) => b.maxX));
    const minZ = Math.max(...c.map((b) => b.minZ));
    const maxZ = Math.min(...c.map((b) => b.maxZ));
    if (!(maxX > minX && maxZ > minZ)) return [];
    const y = c[0].w[0]?.y ?? 0;
    return [
      { x: minX, y, z: minZ },
      { x: maxX, y, z: minZ },
      { x: maxX, y, z: maxZ },
      { x: minX, y, z: maxZ },
    ].map(toAB);
  });
}

/** How much of the line the intervals cover, overlaps counted once. */
function coverage(intervals: { lo: number; hi: number }[]): number {
  const s = intervals.filter((i) => i.hi > i.lo).sort((p, q) => p.lo - q.lo);
  let total = 0;
  let lo = -Infinity;
  let hi = -Infinity;
  for (const i of s) {
    if (i.lo > hi) {
      if (hi > lo) total += hi - lo;
      lo = i.lo;
      hi = i.hi;
    } else hi = Math.max(hi, i.hi);
  }
  if (hi > lo) total += hi - lo;
  return total;
}

/**
 * **How deep a hull is, and whether it is asking** — a pure function of the
 * hull step, so the question is re-derived on every read and nothing about it
 * is remembered outside the log.
 */
export function depthOf(step: HullStep): DepthReading {
  const groups = groupsOf(step.claims);
  const plans = groups.filter((g) => looksDown(g.normal));
  const views = groups.filter((g) => !looksDown(g.normal));
  const measured = (reasoning: string): DepthReading => ({ state: 'measured', lack: null, said: null, reasoning });

  if (!plans.length) {
    return measured(`no plan among its claims — its ${views.length} views bound one another, so its depth is drawn`);
  }
  if (views.length !== 1) {
    const from = views.map((g) => standpointOf(g.claims[0].plane));
    return measured(
      views.length
        ? `seen from ${views.length} standpoints (${from.join(' and ')}) — each bounds how far the others run, so its depth is drawn`
        : 'nothing but plans — no view has given it a height to ask a depth of'
    );
  }

  const view = views[0];
  const n = view.normal;
  // The sightline across the ground, toward the standpoint (a view plane faces
  // the camera — `planarity.ts`'s `viewCandidate`), and the line across it.
  const d = normalize({ x: n.x, y: 0, z: n.z });
  const e = { x: -d.z, y: 0, z: d.x };
  const toAB = (p: Vec3): AB => ({ a: dot(p, d), b: dot(p, e) });
  const label = standpointOf(view.claims[0].plane);

  // The silhouette's pieces across the view, one per claim.
  const pieces = view.claims.map((c) => {
    const bs = worldOf(c).map((p) => dot(p, e));
    return { id: c.id, lo: Math.min(...bs), hi: Math.max(...bs) };
  });
  const plan = planOf(plans.flatMap((g) => g.claims), toAB).filter((poly) => poly.length >= 3);
  const across = plan.flat();
  if (!across.length) return measured('its plan has no area left to stand on');
  const planWide = Math.max(...across.map((p) => p.b)) - Math.min(...across.map((p) => p.b));
  const covered = coverage(pieces);
  if (covered >= SEEN_WHOLE * planWide) {
    return measured(
      `the view from ${label} shows the whole plan across it (${f(covered)} of ${f(planWide)}) — plan and ` +
        `elevation, so the plan's depth is the thing's own`
    );
  }

  // What the plan does behind each piece: how far back it runs, and how near.
  let took = 0;
  let near = -Infinity;
  for (const piece of pieces) {
    let lo = Infinity;
    let hi = -Infinity;
    for (const poly of plan) {
      for (const p of clipBand(poly, piece.lo, piece.hi)) {
        lo = Math.min(lo, p.a);
        hi = Math.max(hi, p.a);
      }
    }
    if (hi > lo) {
      took = Math.max(took, hi - lo);
      near = Math.max(near, hi);
    }
  }
  if (!(took > 0) || !Number.isFinite(near)) return measured(`its plan does not run behind the view from ${label}`);
  const wide = Math.max(...pieces.map((p) => p.hi - p.lo));

  const candidates: DepthCandidate[] = [
    {
      words: 'as far as the plan runs behind it',
      u: took,
      took: true,
      reasoning:
        `the depth it took: seen from ${label} only, nothing but the plan bounds it along that sightline, and ` +
        `the plan runs ${f(took)} behind the silhouette — a default, not a depth anybody drew`,
    },
    {
      words: 'as deep as it is wide',
      u: wide,
      took: false,
      reasoning:
        `the silhouette from ${label} is ${f(wide)} across at its widest — a mass seen from one side only is ` +
        `most often about as deep as it is wide`,
    },
  ];
  const question =
    `how deep does it run along the view from ${label}? It was seen from there only, so nothing but the plan ` +
    `bounds it along that sightline: it stands ${f(took)} deep, which nobody drew. ` +
    candidates.map((c) => `${f(c.u)} — ${c.words}${c.took ? ' (the depth it took)' : ''}`).join(' · ') +
    `. A view from another side settles it, or a word — “${wide.toFixed(1)} deep”.`;
  const lack: DepthLack = {
    claims: view.claims.map((c) => c.id),
    view: label,
    along: d,
    took,
    near,
    wide,
    candidates,
    question,
  };

  const said = step.depth && Math.abs(dot(normalize(step.depth.along), d)) > SAME_DIRECTION ? step.depth : null;
  if (said) {
    return {
      state: 'said',
      lack,
      said,
      reasoning:
        `${f(said.u)} along the view from ${label} — ${said.by ?? 'someone'} said “${said.words}”` +
        (said.u > took ? `; the plan runs only ${f(took)} behind it, so the plan still bounds it` : ''),
    };
  }
  return { state: 'asking', lack, said: null, reasoning: question };
}

/**
 * The slab a said depth cuts the body to, or null when no word is standing:
 * `u` back from `near` along `along` — measured from the side the view was
 * drawn from, because that is the face the hand saw.
 */
export function depthSlabOf(step: HullStep): { along: Vec3; near: number; u: number; took: number } | null {
  const r = depthOf(step);
  if (r.state !== 'said' || !r.lack || !r.said) return null;
  return { along: r.lack.along, near: r.lack.near, u: r.said.u, took: r.lack.took };
}

export type DepthWord =
  | { read: true; u: number; how: 'number' | 'wide' | 'plan'; words: string; reasoning: string }
  | { read: false; unread: string; why: string };

/**
 * **A word, read as a depth — or handed back whole with the reason.**
 *
 * A number (*3 deep*, *2.5 u*, *depth 3*), or one of the question's own
 * candidates by its words (*as deep as it is wide*, *as deep as the plan*).
 * What it cannot read comes back unread, the verb table's rule: never a guess.
 */
export function readDepthWord(text: string, lack: DepthLack): DepthWord {
  const words = (text ?? '').trim();
  // Quotes and a closing stop go; a decimal point stays — *2.5 u* is a number.
  const said = words.toLowerCase().replace(/[“”"!]/g, ' ').replace(/\.\s*$/, '').replace(/\s+/g, ' ').trim();
  if (/\b(square|as deep as (it is )?wide)\b/.test(said)) {
    return {
      read: true,
      u: lack.wide,
      how: 'wide',
      words,
      reasoning: `its own width across the view from ${lack.view}, ${f(lack.wide)}`,
    };
  }
  if (/\bas (deep|far) as the (plan|footprint|keep)\b/.test(said)) {
    return {
      read: true,
      u: lack.took,
      how: 'plan',
      words,
      reasoning: `as far as the plan runs behind it, ${f(lack.took)} — the depth it took, now said rather than defaulted`,
    };
  }
  const num = /^(?:depth\s*[:=]?\s*)?(-?\d*\.?\d+)\s*(?:u|units?)?\s*(?:deep|back|in depth)?$/.exec(said);
  if (num) {
    const u = Number(num[1]);
    if (Number.isFinite(u) && u > 0) {
      return { read: true, u, how: 'number', words, reasoning: `${f(u)} along the view from ${lack.view}, as said` };
    }
    return { read: false, unread: words, why: `“${num[1]}” is not a depth anything could stand at` };
  }
  return {
    read: false,
    unread: words,
    why:
      `nothing in “${words}” says how deep — it reads a number (“3 deep”), its own width (“as deep as it is ` +
      `wide”) or the plan (“as deep as the plan”)`,
  };
}
