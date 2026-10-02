// garment@1 — the garment pattern piece, put in use (V1-PLAN §2.3, §5, §9 M6).
//
// What a pattern piece IS — a closed outline, at its sewing line, with the
// marks a drafter puts on it: a grain line (a straight line with a head at
// each end, inside), a fold (the same line, along an edge), notches (ticks
// across the outline), darts (a narrow wedge from an edge) and a seam
// allowance (a cutting line standing off it the same distance all round) —
// is code and a table: `src/notations/garment.ts` reads each from the
// geometry, never a signature (a signature is a bag of shapes and the links
// between them, rotation-free and blind to where a line ends, so a grain line
// and a fold, or a notch and a letter l, are the same signature), and
// GARMENT_TABLE is the single home of its content. What the marks mean in
// numbers — the cutting size against the sewing size, a fold's half, what
// true size prints — is `src/maths/garment.ts`. This pack names the notation
// and restates none of it. The notation reads on every board whether or not
// the pack is used — recognition is never gated on a declaration — and a
// board that uses the pack ADDS one thing:
//
//   - what a pattern piece beside the hand makes likelier (`affinities`,
//     context/rank.ts): its marks drawn clean, and the maths offered — *Show
//     the sizes*, *Print at true size*.
//
// It puts nothing on the pen: a piece's marks are not places a line is tied.
// It has no definitions: a piece's symbols are the notation's.

import type { Pack } from '../pack';

export const GARMENT_PACK: Pack = {
  id: 'garment',
  version: 1,
  name: 'Garment pattern',
  describes: 'the pattern piece notation in use: clean forms and the maths — the sizes, and the piece at true size — likelier beside a pattern piece',
  notation: 'garment',
  definitions: [],
  affinities: { 'notation:garment': ['on:clean', 'tool:maths'] },
};
