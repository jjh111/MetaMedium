// mindmap@1 — the mind-map notation, put in use (V1-PLAN §2.3, §3, §9 D6).
//
// What a mind map IS — a node and the word written in it, the root the most
// central of the tree, a branch as a plain line from one node to the next,
// the circle and the box each bracketed as Mermaid brackets them — is code
// and a table: `src/notations/mindmap.ts` finds the root, keeps the branches
// in the order a hand reads round a node and tells a mind map's plain lines
// from an ER diagram's written ones (what no signature can see), and
// MINDMAP_TABLE is the single home of its content. This pack names that
// notation and restates none of it. The notation reads on every board whether
// or not the pack is used — recognition is never gated on a declaration — and
// a board that uses the pack ADDS two things:
//
//   - the notation's ports on the pen (`notation`): a node's border, anywhere
//     along it — offered while the pack is in use (`followPacks`,
//     `offerPorts`), taken back when it is not;
//   - what a mind map beside the hand makes likelier (`affinities`,
//     context/rank.ts): its nodes drawn clean, and lined up.
//
// It has no definitions: a mind map's symbols are the notation's.

import type { Pack } from '../pack';

export const MINDMAP_PACK: Pack = {
  id: 'mindmap',
  version: 1,
  name: 'Mind map',
  describes: 'the mind-map notation in use: the border of each node on the pen, and clean forms and lining up likelier beside a mind map',
  notation: 'mindmap',
  definitions: [],
  affinities: { 'notation:mindmap': ['on:clean', 'tool:tidy'] },
};
