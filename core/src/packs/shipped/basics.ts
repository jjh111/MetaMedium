// basics@1 — the canonical loop's vocabulary, shipped (V1-PLAN §2.3, B3).
//
// The loop that proves the thesis: draw a circle, save it as "bubble"; draw
// three bubbles and two lines, save them as "molecule"; the next molecule is
// recognised by itself. A board that uses this pack starts where that loop
// ends — a bubble and a molecule already known, matched by the signatures
// their drawings read as, as if a hand had taught them.
//
// A bubble is a circle on its own. A molecule is three circles joined by two
// bonds, drawn three ways a hand draws one: the bonds stopping short of the
// circles, the bonds touching them, and the three in a row. Each drawing
// reads a little differently (what the bonds cross, touch or only come near);
// the first is the definition's signature and the others its accepted
// examples, so each way is matched as well as the first.
//
// Content, never code: this object is the whole pack, and `basics@1` means
// exactly this for ever. Changed content is `basics@2`.

import type { Pack } from '../pack';
import type { DrawnShape } from '../../session/synthesize';

/** A circle of radius `r` about (cx, cy). */
const circle = (cx: number, cy: number, r = 40): DrawnShape => ({ shape: 'circle', x: cx - r, y: cy - r, w: 2 * r, h: 2 * r });
/** A bond: a line from one point to another. */
const bond = (x1: number, y1: number, x2: number, y2: number): DrawnShape => ({ shape: 'line', from: { x: x1, y: y1 }, to: { x: x2, y: y2 } });

export const BASICS: Pack = {
  id: 'basics',
  version: 1,
  name: 'Basics',
  describes: 'the canonical loop’s vocabulary, already taught: a bubble, and a molecule of three bubbles joined by two bonds',
  definitions: [
    {
      name: 'bubble',
      describes: 'a circle on its own',
      role: 'node',
      samples: [[circle(0, 0)]],
      ports: 'anywhere on its rim',
    },
    {
      name: 'molecule',
      describes: 'three circles joined by two bonds',
      samples: [
        // The bonds stopping a little short of the circles, as the canonical loop draws them.
        [circle(200, 200), circle(380, 200), circle(290, 340), bond(245, 200, 335, 200), bond(220, 245, 270, 320)],
        // The bonds drawn to the circles' edges.
        [circle(300, 300), circle(500, 300), circle(400, 460), bond(340, 300, 460, 300), bond(328, 328, 372, 432)],
        // Three in a row.
        [circle(100, 300), circle(260, 300), circle(420, 300), bond(140, 300, 220, 300), bond(300, 300, 380, 300)],
      ],
    },
  ],
  connectors: [{ name: 'bond', describes: 'a line joining two bubbles', head: 'none', role: 'edge' }],
};
