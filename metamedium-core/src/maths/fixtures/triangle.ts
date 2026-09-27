// The right triangle John asked about (MATHS-PLAN.md §1), used by later units
// (M3 attaches each number to a side, M4 solves the figure).
//
// All three sides are labelled: 24 and 8 on the legs, and 24 again on the long
// side — the third label cannot hold. The right angle is declared by a small
// square in its corner. The numbers are the question's own, not anyone's
// measurements.

import type { Bounds, Point } from '../../types';

/** The labels as written beside the sides, bare numbers with no unit. */
export const TRIANGLE_LABELS = {
  legs: ['24', '8'],
  long: '24',
} as const;

/**
 * The triangle as drawn, in canvas units: the right angle at the bottom left,
 * the long leg along the bottom (240), the short leg up the left (80) — drawn
 * to the ratio 24 : 8 — and the long side between their far ends.
 */
export const TRIANGLE_CORNERS: { right: Point; longLegEnd: Point; shortLegEnd: Point } = {
  right: { x: 100, y: 300 },
  longLegEnd: { x: 340, y: 300 },
  shortLegEnd: { x: 100, y: 220 },
};

/** The small square that declares the right angle, drawn in its corner. */
export const TRIANGLE_SQUARE = { x: 100, y: 285, size: 15 };

/**
 * Where each label stands — its text box — beside the middle of its side,
 * outside the triangle: 24 under the long leg, 8 left of the short leg, and 24
 * above the long side.
 */
export const TRIANGLE_LABEL_BOXES: { longLeg: Bounds; shortLeg: Bounds; longSide: Bounds } = {
  longLeg: { minX: 200, maxX: 240, minY: 312, maxY: 342 },
  shortLeg: { minX: 62, maxX: 86, minY: 245, maxY: 275 },
  longSide: { minX: 210, maxX: 250, minY: 217, maxY: 247 },
};

/**
 * What the canvas says (DIRECTOR-PLAN-W2 M4): the legs make the long side
 * √(24² + 8²) = 25.30″; the third label cannot hold, by 1.30 (5%); and the
 * other consistent reading keeps the long side's 24 and the short leg's 8.
 * In inches when the board speaks them.
 */
export const TRIANGLE_EXPECTED = {
  longSide: '25.30″',
  formula: '√(24² + 8²)',
  conflict: 'labelled 24; legs of 24 and 8 make it 25.30, 1.30 longer (5%)',
  other: '24 on the long side and a leg of 8 make the other leg 22.63″',
} as const;
