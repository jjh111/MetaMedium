// The apron dress page, with SAMPLE numbers (DIRECTOR-PLAN-W2 M1).
//
// The formulas and the way they are written are the drafter's: a lettered
// table of measurements, a heading, and numbered steps worked by hand to a
// result, one of them referring to another by a circled number. Every number
// here is a sample chosen for this repository. The real pages carry one
// person's measurements and never enter it (MATHS-PLAN.md §1 and §8.1).

/** The page's lines, in reading order, exactly as written. */
export const APRON_LINES = [
  'A. Bust 36',
  'B. Top to waist 20',
  'C. Top to bottom 46',
  'Add seam allowance',
  '1. A ÷ 3 = 12 + 2 = 14',
  '2. ① ÷ 2 = 14 ÷ 2 = 7',
  '3. B 20 + 2 = 22',
  '4. C 48',
  '5. A 38"',
  '6. (C × 2) − B 72"',
] as const;

/**
 * Written on the drawing, not in the list: the brace along the layout's
 * length carries both readings of step 6 as one range — 72 from the raw
 * measurements, 74 once seam allowance is added to both C and B. The drafter
 * kept the ambiguity rather than settle it.
 */
export const APRON_BRACE = '72–74"';

/** The step the brace's range belongs to. */
export const APRON_BRACE_STEP = '6';
