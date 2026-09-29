// state@1 — the state notation, put in use (V1-PLAN §2.3, §3, §9 D5's state half).
//
// What a state diagram IS — a state and its round corners, the initial dot
// scribbled solid, the final ring, the transitions between them and the loop
// out of a state and back, and how each is said in Mermaid — is code and a
// table: `src/notations/state.ts` reads a dot from its ink and a loop by its
// barb (what no signature can see), and STATE_TABLE is the single home of its
// content. This pack names that notation and restates none of it. The notation
// reads on every board whether or not the pack is used — recognition is never
// gated on a declaration — and a board that uses the pack ADDS two things:
//
//   - the notation's ports on the pen (`notation`): a state's border, anywhere
//     along it, and the four cardinals of a dot scribbled solid — offered
//     while the pack is in use (`followPacks`, `offerPorts`), taken back when
//     it is not;
//   - what a state diagram beside the hand makes likelier (`affinities`,
//     context/rank.ts): its states drawn clean, and lined up.
//
// It has no definitions: a state diagram's symbols are the notation's.

import type { Pack } from '../pack';

export const STATE_PACK: Pack = {
  id: 'state',
  version: 1,
  name: 'State diagram',
  describes: 'the state notation in use: the border of each state and the sides of an initial dot on the pen, and clean forms and lining up likelier beside a state diagram',
  notation: 'state',
  definitions: [],
  affinities: { 'notation:state': ['on:clean', 'tool:tidy'] },
};
