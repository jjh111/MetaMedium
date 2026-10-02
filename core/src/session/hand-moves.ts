// What a hand may move (PLAN-IPAD-NOTES A2, changed by John's answer of 2 Oct 2026 — A2b): anything on the board.
//
// An agent organising notes has to put things in places. A2 first ruled that a hand moves only what it made, as it
// labels only its own ink (L2b, L2i) — for the reason that undo is per hand (L2j), so a person's own undo cannot take
// back another hand's move of their marks. John chose otherwise, asked in those words: *"ya claude can move marks"*. So a
// hand may move another hand's marks, John's included, and a region it made — one that carries his marks too (a region
// moved carries what it holds, I5: one `move` naming the region). This still refuses what is not there.
//
// What replaces the refusal is HONESTY, since the person's undo does not reach it: the hand's reply says whose marks it
// moved (`movedSaid`: *3 marks — 2 of john’s*), and a tab is told, in the status line and attributed, when another hand
// moved marks of the reader's own (`otherHandMoves`). The way back is not undo: the person moves them back, or asks the
// hand, which moves them back. Labels and renames keep their rule — a hand labels only its own ink and renames only a
// region it made; moving is the only thing John changed.
//
// It is still the hand's door, not the board's: the board applies a `move` from anyone, as it always has. Pure: it reads
// the board and writes nothing.
import { handLabel } from './hands';
import { getRep, type MMNode } from './nodes';
import { manipulableOf } from './manipulate';
import { regionCarries, type RegionBoard } from './board-regions';
import type { SessionEvent } from './session';

/** Why a mark cannot be moved: it is not there. (A2's *not-yours* and *carries-not-yours* are gone: John, 2 Oct 2026.) */
export type MoveWhy = 'missing';

export interface MoveRefusal {
  /** The id asked to move. */
  id: string;
  why: MoveWhy;
  /** The id that is the reason: the one that is not there. */
  of: string;
}

export interface MoveVerdict {
  /** What may move, in the order asked, each once. */
  allowed: string[];
  refused: MoveRefusal[];
  /** Every thing the allowed moves move, each once: the ids named, what a region holds, an artifact's marks. For saying whose moved. */
  moved: string[];
}

const live = (n: MMNode | undefined): n is MMNode => !!n && !getRep(n, 'erased');

/** Everything a move of these ids moves — the ids themselves, a region's contents, an artifact's marks — each once, live ones only. */
export function movedThings(board: RegionBoard, ids: readonly string[]): string[] {
  const out: string[] = [];
  const seen = new Set<string>();
  const add = (id: string) => { if (!seen.has(id) && live(board.nodes.get(id))) { seen.add(id); out.push(id); } };
  for (const id of ids) {
    add(id);
    const carried = regionCarries(board, [id]);
    carried.forEach(add);
    manipulableOf(board.nodes, carried).forEach((n) => add(n.id));
  }
  return out;
}

/**
 * Of these ids, which may move — every one that is on the board — and which may not, and what the allowed moves move.
 * Each id stands on its own: a list may be half allowed.
 */
export function handMoves(board: RegionBoard, ids: readonly string[]): MoveVerdict {
  const allowed: string[] = [];
  const refused: MoveRefusal[] = [];
  const seen = new Set<string>();
  for (const id of ids) {
    if (seen.has(id)) continue;
    seen.add(id);
    if (!live(board.nodes.get(id))) refused.push({ id, why: 'missing', of: id });
    else allowed.push(id);
  }
  return { allowed, refused, moved: movedThings(board, allowed) };
}

/**
 * What a move moved, in the words the hand says it and a person reads: *3 marks — 2 of john’s*, *1 mark*, or *1 region*
 * when only a region's own rectangle moved. A region is counted for what it holds, not as a mark. `isMine` is whose
 * marks the speaker made and `nameOf` the name of a mark's maker, for the marks that are not.
 */
export function movedSaid(board: RegionBoard, moved: readonly string[], isMine: (id: string) => boolean, nameOf: (id: string) => string): string {
  const regions = new Set(board.regions);
  const marks = moved.filter((id) => !regions.has(id));
  if (!marks.length) return moved.length + ' region' + (moved.length === 1 ? '' : 's');
  const others = new Map<string, number>();
  for (const id of marks) if (!isMine(id)) { const who = nameOf(id); others.set(who, (others.get(who) ?? 0) + 1); }
  const of = [...others].map(([who, n]) => n + ' of ' + who + '’s').join(', ');
  return marks.length + ' mark' + (marks.length === 1 ? '' : 's') + (of ? ' — ' + of : '');
}

/** Another hand's move that moved marks of the reader's own. */
export interface OtherHandMove {
  /** One per event, the same on every read: a surface that says a move once keeps these. */
  key: string;
  /** The hand's name as shown (the sitting's suffix left off). */
  by: string;
  /** The reader's own marks it moved, in the order the move holds them. */
  mine: string[];
}

/**
 * The moves in `events` that another hand — an event stamped `by` — wrote and that moved marks the reader made
 * (`isMine`), so the reader can be told, once, and by whom. A hand that moved only its own marks, and the reader's own
 * moves, are not here. Derived from the events and the board as it stands; nothing is written.
 */
export function otherHandMoves(board: RegionBoard, events: readonly SessionEvent[], isMine: (id: string) => boolean): OtherHandMove[] {
  const regions = new Set(board.regions);
  const out: OtherHandMove[] = [];
  for (const ev of events) {
    if (!ev || ev.type !== 'move' || !ev.by || !Array.isArray(ev.ids)) continue;
    const mine = movedThings(board, ev.ids).filter((id) => !regions.has(id) && isMine(id));
    if (mine.length) out.push({ key: ev.by + ':' + (ev.seq ?? ev.at) + ':' + ev.at, by: handLabel(ev.by), mine });
  }
  return out;
}
