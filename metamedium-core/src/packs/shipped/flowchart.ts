// flowchart@1 — the flowchart notation, put in use (V1-PLAN §2.3, §3, B3).
//
// What a flowchart IS — process, decision, terminator, data, start and end,
// the flows between them, and how each is said in Mermaid — is code and a
// table: `src/notations/flowchart.ts` reads it from the corners of the ink
// (a decision is a box turned 45°, which no signature can see), and
// FLOWCHART_TABLE is the single home of its symbols. This pack names that
// notation and restates none of it. The notation reads on every board whether
// or not the pack is used — recognition is never gated on a declaration — and
// a board that uses the pack ADDS two things:
//
//   - the notation's ports on the pen (`notation`): a decision's four
//     vertices, a process's edge middles — offered while the pack is in use
//     (`followPacks`, `offerPorts`), taken back when it is not;
//   - what a flowchart beside the hand makes likelier (`affinities`,
//     context/rank.ts): new marks drawn clean, and joined as flows (V1-PLAN
//     A1: it reads as a flowchart; clean it).
//
// It has no definitions: a flowchart's symbols are the notation's.

import type { Pack } from '../pack';

export const FLOWCHART_PACK: Pack = {
  id: 'flowchart',
  version: 1,
  name: 'Flowchart',
  describes: 'the flowchart notation in use: its ports on the pen, and clean forms and flows likelier beside a flowchart',
  notation: 'flowchart',
  definitions: [],
  affinities: { 'notation:flowchart': ['on:flow', 'on:clean'] },
};
