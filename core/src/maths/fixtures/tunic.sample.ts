// The tunic (Viking-era dress) page, with SAMPLE numbers (DIRECTOR-PLAN-W2 M1).
//
// Each step is a formula over a measurement the page never writes down, with
// the drafter's worked line beside it: the measurement put in, the sum done,
// the result underlined. Two steps carry a range (3–6″, 2–4″) and the worked
// line shows the value chosen from it. Every number is a sample; the real
// pages never enter the repository (MATHS-PLAN.md §1 and §8.1).
//
// Three spaces stand for the gap between a formula and its worked line — the
// gap a hand leaves between two columns on one line.

/** The page's lines, in reading order, exactly as written. */
export const TUNIC_LINES = [
  '1. Chest + 6" ÷ 2   (36 + 6)/2 = 21"',
  '2. Shoulder to length desired + 2   54 + 2 = 56"',
  '3. Top shoulder to under armpit × 2 + 3–6"   (9 × 2) + 4 = 22"',
  '4. Fist + 2–4"   3.5 + 4 = 7.5"',
  '5. Arm length + 2"   21 + 2 = 23"',
] as const;
