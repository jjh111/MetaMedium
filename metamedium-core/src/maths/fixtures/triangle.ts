// The right triangle John asked about (MATHS-PLAN.md §1), used by later units
// (M3 attaches each number to a side, M4 solves the figure).
//
// All three sides are labelled: 24 and 8 on the legs, and 24 again on the long
// side — the third label cannot hold. The right angle is declared by a small
// square in its corner. The numbers are the question's own, not anyone's
// measurements.

/** The labels as written beside the sides, bare numbers with no unit. */
export const TRIANGLE_LABELS = {
  legs: ['24', '8'],
  long: '24',
} as const;
