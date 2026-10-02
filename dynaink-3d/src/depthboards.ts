// ===== depthboards =====
// **The boards the shard's question is settled on, stated once** (L2c; week
// 1's U3, harvested from `auto/w1-U3`, whose boards these are).
//
// `demo.ts`'s own reason: `fixtures/make.mjs` writes the first two as logs and
// `depth.test.ts` stands the same numbers up headless, so what is shipped as a
// fixture and what is proved in a test cannot be two different drawings.
//
//   * **`ONE_VIEW`** — a keep's footprint and one tower drawn as a ⊓ from one
//     standpoint. Nothing drawn from another side says how far back the tower
//     runs, so the hull stands as deep as the keep's plan and ASKS how deep.
//   * **`PLAN_UNDER_IT`** — the same, with the tower's own plan drawn inside
//     the keep's. The plan the body stands on is the tower's, as wide as the
//     view shows it, so its depth was drawn: one view is enough.
//   * **`WHOLE_VIEW`** — the keep and a ⊓ as wide as the keep: the view shows
//     the whole plan across it, so the plan's depth is the thing's own —
//     the oldest way of drawing a thing in space, and nothing is asked.
//   * **`SECOND_VIEW`** — the tower again, from the other side: the answer
//     the first way. **`SECOND_TOWER`** — another tower from the FIRST
//     standpoint, which answers nothing.
//
// The first sightline is square to the world (the standpoint is along +Z), so
// every number the tests read is one a reader can check on paper.

import type { Point } from '@dynaink/core';
import {
  cross,
  foundation,
  mul,
  normalize,
  sub,
  uAxis,
  vAxis,
  type Plane,
  type Vec3,
} from './plane';

/** The pen scale both boards were "drawn" at — the shard's own, at zoom 1. */
export const BOARD_SCALE = 0.012;

/** A closed outline through corners, densified the way a hand leaves ink. */
export function loop(corners: Point[], per = 20): Point[] {
  const out: Point[] = [];
  for (let i = 0; i < corners.length; i++) {
    const a = corners[i];
    const b = corners[(i + 1) % corners.length];
    for (let s = 0; s < per; s++) {
      const t = s / per;
      out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
    }
  }
  out.push(corners[0]);
  return out;
}

export const rect = (x: number, y: number, w: number, h: number) =>
  loop([{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }]);

function span(a: Point, b: Point, per: number): Point[] {
  const out: Point[] = [];
  for (let i = 0; i <= per; i++) {
    const t = i / per;
    out.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t });
  }
  return out;
}

/** The plane a free view makes when the hand puts the cursor at `at` and stands at `from`. */
export function viewPlane(from: Vec3, at: Vec3): Plane {
  const look = normalize(sub(at, from));
  const normal = mul(look, -1);
  const right = normalize(cross(look, { x: 0, y: 1, z: 0 }));
  const up = normalize(cross(look, right)); // down the screen
  return { origin: at, normal, up, source: 'view', name: 'view', why: 'a free view' };
}

/** Where the ground crosses a plane, at a given u — in that plane's own v. */
function groundV(plane: Plane, u: number): number {
  const U = uAxis(plane);
  const V = vAxis(plane);
  return -(plane.origin.y + u * U.y) / V.y;
}

/** A ⊓ in a plane's own (u, v), both feet on the world ground. +v runs DOWN. */
export function tower(plane: Plane, u: number, w: number, tall: number, per = 10): Point[] {
  const a = groundV(plane, u);
  const b = groundV(plane, u + w);
  return [
    ...span({ x: u, y: a }, { x: u, y: a - tall }, per),
    ...span({ x: u, y: a - tall }, { x: u + w, y: b - tall }, per),
    ...span({ x: u + w, y: b - tall }, { x: u + w, y: b }, per),
  ];
}

/** The one standpoint both boards are drawn from: square down +Z, eye a little up. */
export const STANDPOINT = viewPlane({ x: 0, y: 4, z: 12 }, { x: 0, y: 1.2, z: 0 });

/** The other standpoint — the SECOND view, which is one of the two ways the question is answered. */
export const OTHER_STANDPOINT = viewPlane({ x: 12, y: 4, z: 0 }, { x: 0, y: 1.2, z: 0 });

/** Where a world point lands along a plane's own u. */
export function uOf(plane: Plane, at: Vec3): number {
  const U = uAxis(plane);
  return (at.x - plane.origin.x) * U.x + (at.y - plane.origin.y) * U.y + (at.z - plane.origin.z) * U.z;
}

/** One mark of a board: what to draw, on which plane, and when. */
export interface BoardMark {
  what: string;
  points: Point[];
  plane: Plane;
  at: number;
}

/** The footprint both boards share: a rough 6 × 4 keep on the ground. */
const KEEP = () => ({ what: 'the keep’s footprint, 6 × 4 on the ground', points: rect(-3, -2, 6, 4), plane: foundation(), at: 1000 });

/** The tower, drawn as a ⊓ from the one standpoint — 2.0 u across, 2.6 u tall. */
const TOWER = (at: number) => ({
  what: 'a tower as a ⊓, from where the hand stood',
  points: tower(STANDPOINT, uOf(STANDPOINT, { x: -2, y: 0, z: -1 }) - 1.0, 2.0, 2.6),
  plane: STANDPOINT,
  at,
});

/**
 * **One view is enough.** The hand drew the tower's own plan inside the keep's,
 * so how deep it runs is in the drawing: nothing is asked.
 */
export const PLAN_UNDER_IT: BoardMark[] = [
  KEEP(),
  {
    what: 'the tower’s own plan, drawn inside the keep’s',
    points: rect(-3, -2, 1.4, 1.2),
    plane: foundation(),
    at: 2000,
  },
  TOWER(3000),
];

/**
 * **One view is not enough.** The same keep and the same tower, and no plan
 * under it: the tower was seen once, nothing measures its depth, and the board
 * carries *how deep is this?* until a second view or a word answers it.
 */
export const ONE_VIEW: BoardMark[] = [KEEP(), TOWER(2000)];

/**
 * **The view shows the whole plan.** A ⊓ as wide as the keep, from the same
 * standpoint: plan and elevation, and the plan's depth is the thing's own.
 */
export const WHOLE_VIEW: BoardMark[] = [
  KEEP(),
  {
    what: 'the whole keep as a ⊓, from where the hand stood',
    // As tall as the tower: a ⊓ has to rise ELEVATION_RISE of its own size to be
    // a silhouette rather than a line lying on the floor.
    points: tower(STANDPOINT, uOf(STANDPOINT, { x: -3, y: 0, z: -1 }), 6.0, 2.6),
    plane: STANDPOINT,
    at: 2000,
  },
];

/** A second tower from the FIRST standpoint — one silhouette with two pieces, and no answer. */
export const SECOND_TOWER: BoardMark = {
  what: 'a second tower as a ⊓, from the same place',
  points: tower(STANDPOINT, uOf(STANDPOINT, { x: 1, y: 0, z: -1 }), 1.5, 2.2),
  plane: STANDPOINT,
  at: 3000,
};

/** The second view, drawn from the other side — the answer the FIRST way. */
export const SECOND_VIEW: BoardMark = {
  what: 'the same tower, drawn again from the other side',
  points: tower(OTHER_STANDPOINT, uOf(OTHER_STANDPOINT, { x: 0, y: 0, z: -1 }) - 0.6, 1.2, 2.6),
  plane: OTHER_STANDPOINT,
  at: 3000,
};

/** The words that answer it the SECOND way, and what they mean. */
export const A_WORD = 'as deep as it is wide';
