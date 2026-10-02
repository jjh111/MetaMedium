// ===== demo =====
// **The numbers of `?demo=castle`, stated once** (push 2, G4).
//
// Its own module, and for one reason: `main.ts` carries three.js, so nothing in
// it can be imported by a test. The demo's reply is a copy of a FIXTURE — the
// contract's own worked example in `fixtures/exchanges/castle-sketch.ideal.json`
// — and a copy nothing checks is a copy that drifts. From here `demo.test.ts`
// can hold the two against each other, in Node, with no browser.
//
// Everything else here is geometry, in the plane's own units and in screen
// pixels where the hand works in screen pixels. `main.ts` draws it at boot and
// `__demo2()` in `e2e.js` drives the same numbers through the same pointer
// path, so what is shown and what is proved are one board.

import { v3 } from './plane';

/**
 * **`?demo=castle` — the loop on John's own drawing** (push 2, G4).
 *
 * `SHARD-3D-PLAN.md` §9's demo was the mug: a draftsman's board, drawn on the
 * three tiles, with a model filling it. This is its successor, and it is the
 * board a hand actually makes — John's first board of 16 September 2026, the
 * one that stood nothing at all before G1.
 *
 * Eight beats, each timed and asserted by `__demo2()` in `e2e.js`, which drives
 * these same numbers through the same pointer path. The demo and the test are
 * one board: what is shown is what is proved.
 *
 *  1 · nothing chosen. Tap the compass's Y ball — the top view IS the choice —
 *      and draw the footprint. *rectangle 0.92 · profile*.
 *  2 · leave the axis view and orbit to where you would stand. Two towers as ⊓
 *      with their feet on the ground: the hull stands on the FIRST of them,
 *      tier 1, *hull from 2 claims*.
 *  3 · orbit the other way and draw what you see from there. The hull narrows,
 *      and it is two parts, each said in words.
 *  4 · the free loop, with nothing chosen and nothing to land on: it goes on the
 *      view plane through the centre of the view, its aspect conserved, and NOT
 *      in the floor. That was push 2's first fault, and it is a beat now.
 *  5 · *castle with green tops* → the parts are named from the words and the
 *      tops are green.
 *  6 · *make the turrets taller* → a regen over that part alone.
 *  7 · *why*: the panel's summary for one part — what it is, where it came from,
 *      what Enter would do. Then *name: castle* and take it: definitions for the
 *      whole and for each named part.
 *  8 · the footprint drawn again, elsewhere: *castle* is offered, and one tap
 *      places it.
 *
 * **Three ⊓ and two standpoints, not two and two.** A tower seen once has no
 * depth — G2's finding, pinned in `parts.test.ts` — so two claims from two
 * standpoints give ONE part, and the count only reaches two when one standpoint
 * has shown two towers. Beat 2 draws both from where it stands, which is also
 * what a hand does; beat 3 walks around.
 */
export const CASTLE_DEMO = {
  /** The footprint: a rough 6 × 4 keep, drawn in the top view. */
  plan: { x: -3, y: -2, w: 6, h: 4 },
  /**
   * The three ⊓, as `CASTLE_SKETCH` carries them: a world anchor to aim at, a
   * half-width and a height in SCREEN pixels — because that is what drawing on
   * the view plane is — and which standpoint each was drawn from.
   */
  ups: [
    { at: v3(-2.4, 0, -1.4), halfW: 52, tall: 150, from: 0 },
    { at: v3(2.4, 0, -1.4), halfW: 52, tall: 150, from: 0 },
    { at: v3(0, 0, 1.8), halfW: 96, tall: 124, from: 1 },
  ],
  /** The two standpoints, as orbits from the free view, each with clear ground to stand on. */
  views: [
    { dTheta: 0.42, dPhi: -0.5, stand: v3(0, 0, 7) },
    { dTheta: 1.25, dPhi: -0.12, stand: v3(7, 0, 1) },
  ],
  /** Beat 4: how far the eye is raised before the free loop, and the loop's own screen radii. */
  loop: { raise: 200, rx: 92, ry: 66 },
  /** Beat 8: the footprint drawn again, elsewhere — three quarters the size, and less square. */
  again: { x: 5.2, y: -1.4, w: 4.5, h: 2.8 },
  /** The words the hand types, in order. */
  words: { brief: 'castle with green tops', regen: 'make the turrets taller', name: 'name: castle' },
  /**
   * What the seat says to *castle with green tops* — **verbatim** the reply in
   * `fixtures/exchanges/castle-sketch.ideal.json`, which is the contract's own
   * worked example: every part named from the human's words, one colour word
   * each from the closed list, and two small ops BY PART ID. `brief.test.ts`
   * pins this string against that file, so the demo cannot drift from the
   * fixture and the fixture cannot drift from the demo.
   */
  reply: JSON.stringify({
    parts: [
      { id: 'part:1', name: 'wall', material: 'grey', why: 'the low run along the east edge of the plan' },
      { id: 'part:2', name: 'turret', material: 'green', why: 'the human asked for green tops, and this is the tall one' },
    ],
    steps: [
      { id: 's1', op: 'boss', part: 'part:2', height: 0.5, why: 'a turret reads as a turret when it stands over its wall' },
      { id: 's2', op: 'cut', part: 'part:2', shape: 'circle', centre: { x: 0, y: 0 }, r: 0.25, depth: 0.3, why: 'a well down the middle of the turret' },
    ],
  }),
  /**
   * …and to *make the turrets taller*: the same part, by the name the reply
   * itself gave it. The words are *turrets* and not *towers* for exactly that
   * reason — a regen resolves a name that is in play, and nothing on this board
   * is called a tower until someone says so.
   */
  taller: JSON.stringify({
    parts: [{ id: 'part:2', name: 'turret' }],
    steps: [{ id: 's1', op: 'boss', part: 'part:2', height: 0.9, why: 'taller, as asked' }],
  }),
};
