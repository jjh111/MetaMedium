// er@1 — the ER notation, put in use (V1-PLAN §2.3, §3, §9 D6).
//
// What an ER diagram IS — an entity and the name written in it, a relationship
// as a plain line between two of them, the verb beside its middle, the
// multiplicity written at each end and the four cardinalities it says, and how
// each is said in Mermaid — is code and a table: `src/notations/er.ts` reads
// the writing at a line's ends and tells a class's compartments from an
// entity's plain box (what no signature can see), and ER_TABLE is the single
// home of its content. This pack names that notation and restates none of it.
// The notation reads on every board whether or not the pack is used —
// recognition is never gated on a declaration — and a board that uses the pack
// ADDS two things:
//
//   - the notation's ports on the pen (`notation`): an entity's border,
//     anywhere along it — offered while the pack is in use (`followPacks`,
//     `offerPorts`), taken back when it is not;
//   - what an ER diagram beside the hand makes likelier (`affinities`,
//     context/rank.ts): its entities drawn clean, and lined up.
//
// It has no definitions: an ER diagram's symbols are the notation's.

import type { Pack } from '../pack';

export const ER_PACK: Pack = {
  id: 'er',
  version: 1,
  name: 'ER diagram',
  describes: 'the ER notation in use: the border of each entity on the pen, and clean forms and lining up likelier beside an ER diagram',
  notation: 'er',
  definitions: [],
  affinities: { 'notation:er': ['on:clean', 'tool:tidy'] },
};
