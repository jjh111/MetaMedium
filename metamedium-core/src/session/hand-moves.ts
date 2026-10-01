// What a hand may move (PLAN-IPAD-NOTES A2): the marks it made, and the regions it made that carry only those.
//
// An agent organising notes has to put things in places, and a hand in a room is one voice among several. The
// rule is the label's (L2b, L2i) carried to moving: a hand labels only its own ink, proposes and never blesses,
// and **moves only what it made** — for the reason that decides it: undo is per hand (L2j), so a person's own
// undo cannot take back another hand's move of their marks. A mark moved by someone else is a mark the person
// cannot get back by the one gesture they have.
//
// A region is the case worth saying. It holds by geometry and writes nothing when it is made, so a hand may
// make one round anyone's marks (`canvas_region`). But a region MOVED carries what it holds — one `move` event
// naming the region (I5, `regionCarries`) — so moving one is moving every mark inside it, and the rule asks
// about all of them: a region of the hand's own holding another hand's note is refused, with the note named,
// and the way round is a new region drawn round the hand's own marks.
//
// This is a rule of the hand's door, not of the board: the board still applies a `move` from anyone, as it
// always has (a person moves what is in front of them, and a person's act is their own to undo). Pure: it
// reads the board and writes nothing, and `isMine` is the host's (`session.isMine`, the person across sittings).
import { getRep, type MMNode } from './nodes';
import { manipulableOf } from './manipulate';
import { regionCarries, type RegionBoard } from './board-regions';

/** Why a mark may not be moved: it is not there, it is another hand's, or it is a region that would carry another hand's. */
export type MoveWhy = 'missing' | 'not-yours' | 'carries-not-yours';

export interface MoveRefusal {
  /** The id asked to move. */
  id: string;
  why: MoveWhy;
  /** The id that is the reason: the mark itself, or the first thing a region would carry that is not the hand's. */
  of: string;
}

export interface MoveVerdict {
  /** What may move, in the order asked, each once. */
  allowed: string[];
  refused: MoveRefusal[];
}

const live = (n: MMNode | undefined): n is MMNode => !!n && !getRep(n, 'erased');

/**
 * Of these ids, which this hand may move and which it may not, and why. Each id stands on its own: a list may be
 * half allowed. A move of an id carries what `regionCarries` and `manipulableOf` say it carries — a region's
 * contents, an artifact's marks — and every one of them must be the hand's.
 */
export function handMoves(board: RegionBoard, ids: readonly string[], isMine: (id: string) => boolean): MoveVerdict {
  const allowed: string[] = [];
  const refused: MoveRefusal[] = [];
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) continue;
    seen.add(id);
    if (!live(board.nodes.get(id))) { refused.push({ id, why: 'missing', of: id }); continue; }
    if (!isMine(id)) { refused.push({ id, why: 'not-yours', of: id }); continue; }
    // What moving it would move: the region's contents, then the marks of any artifact among them.
    const carried = regionCarries(board, [id]);
    const moved = manipulableOf(board.nodes, carried).map((n) => n.id);
    const other = [...carried, ...moved].find((c) => c !== id && live(board.nodes.get(c)) && !isMine(c));
    if (other !== undefined) refused.push({ id, why: 'carries-not-yours', of: other });
    else allowed.push(id);
  }
  return { allowed, refused };
}
