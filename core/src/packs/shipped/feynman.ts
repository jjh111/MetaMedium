// feynman@1 — the Feynman diagram, put in use (MATHS-SPEC §8, M27).
//
// What a Feynman diagram IS — fermions drawn solid with an arrow (a chevron on
// the middle or a barb at an end), photons, W and Z wavy, gluons curly, the
// Higgs dashed, meeting three or four to a vertex; the particles with their
// charges, lepton and baryon numbers; which way time runs; the process, the
// channel, the order and what each vertex keeps — is code and a table:
// `src/notations/feynman.ts` reads it from the geometry of ink (a wave by
// `src/diagram/waves.ts`, which no signature can see: a signature is a bag of
// shapes and the links between them, and a wavy line is writing to the shape
// rung), and FEYNMAN_TABLE is the single home of its content. TikZ-Feynman
// out is `src/notations/feynman-tikz.ts`; the names a diagram offers for its
// unnamed lines are `src/maths/fill-feynman.ts`. This pack names the notation
// and restates none of it. The notation reads on every board whether or not
// the pack is used — recognition is never gated on a declaration — and a board
// that uses the pack ADDS one thing:
//
//   - what a Feynman diagram beside the hand makes likelier (`affinities`,
//     context/rank.ts): its solid lines drawn clean.
//
// It puts nothing on the pen: a line's own ends are already the places another
// line's end is tied. It has no definitions: a diagram's lines are the notation's.

import type { Pack } from '../pack';

export const FEYNMAN_PACK: Pack = {
  id: 'feynman',
  version: 1,
  name: 'Feynman diagram',
  describes: 'the Feynman diagram notation in use: clean forms likelier beside a Feynman diagram',
  notation: 'feynman',
  definitions: [],
  affinities: { 'notation:feynman': ['on:clean'] },
};
