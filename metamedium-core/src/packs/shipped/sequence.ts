// sequence@1 — the sequence notation, put in use (V1-PLAN §2.3, §3, §9 D5).
//
// What a sequence diagram IS — a participant (a box or a stick figure) over
// its lifeline, the messages between lifelines (a call, a return, a
// self-message) in order down the page, and how each is said in Mermaid — is
// code and a table: `src/notations/sequence.ts` reads a participant from the
// geometry (a box with a long line from its bottom middle — never the
// relation table, which calls the lifeline an edge from the box) and a
// message by where its ends land past their heads, and SEQUENCE_TABLE is the
// single home of its content. This pack names that notation and restates
// none of it. The notation reads on every board whether or not the pack is
// used — recognition is never gated on a declaration — and a board that uses
// the pack ADDS two things:
//
//   - the notation's ports on the pen (`notation`): each lifeline's whole
//     length — offered while the pack is in use (`followPacks`,
//     `offerPorts`), taken back when it is not;
//   - what a sequence diagram beside the hand makes likelier (`affinities`,
//     context/rank.ts): its boxes and lines drawn clean, and the participants
//     lined up.
//
// It has no definitions: a sequence diagram's symbols are the notation's.

import type { Pack } from '../pack';

export const SEQUENCE_PACK: Pack = {
  id: 'sequence',
  version: 1,
  name: 'Sequence diagram',
  describes: 'the sequence notation in use: its lifelines on the pen, and clean forms and lining up likelier beside a sequence diagram',
  notation: 'sequence',
  definitions: [],
  affinities: { 'notation:sequence': ['on:clean', 'tool:tidy'] },
};
