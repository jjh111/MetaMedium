// uml-class@1 — the UML class notation, put in use (V1-PLAN §2.3, §3, §9 D4).
//
// What a class diagram IS — a class and its compartments, the relations
// between classes and the heads that say their kinds, multiplicities, and
// how each is said in Mermaid — is code and a table: `src/notations/uml-class.ts`
// reads a class in its box's own frame and a relation by the head at its end
// (a hollow triangle, a diamond — what no signature can see), and
// UML_CLASS_TABLE is the single home of its content. This pack names that
// notation and restates none of it. The notation reads on every board whether
// or not the pack is used — recognition is never gated on a declaration — and
// a board that uses the pack ADDS two things:
//
//   - the notation's ports on the pen (`notation`): each class's four sides,
//     anywhere along them — offered while the pack is in use (`followPacks`,
//     `offerPorts`), taken back when it is not;
//   - what a class diagram beside the hand makes likelier (`affinities`,
//     context/rank.ts): its classes drawn clean, and lined up.
//
// It has no definitions: a class diagram's symbols are the notation's.

import type { Pack } from '../pack';

export const UML_CLASS_PACK: Pack = {
  id: 'uml-class',
  version: 1,
  name: 'UML class diagram',
  describes: 'the UML class notation in use: the sides of its classes on the pen, and clean forms and lining up likelier beside a class diagram',
  notation: 'uml-class',
  definitions: [],
  affinities: { 'notation:uml-class': ['on:clean', 'tool:tidy'] },
};
