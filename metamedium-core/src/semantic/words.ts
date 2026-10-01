// The words a held thing carries (PLAN-IPAD-NOTES I9): what *notes like this* asks the semantic seat about.
//
// Read from the board's state through the same extraction Find indexes (`searchEntriesOf`): a mark's label,
// what was read from its writing, an artifact's name and words — and for a region its name and then what it
// holds, one level, in the order the region's own rule lists them. In the order the hand holds them, each
// thing's words once. Nothing is read from the surface and nothing is written; no model is asked.
import type { SessionState } from '../session/session';
import { regionMembers } from '../session/board-regions';
import { searchEntriesOf } from '../search/extract';

/** The most characters of words one thing is asked about: a seat is asked about a sentence, not a book. */
export const LIKE_MAX_CHARS = 1200;

export function wordsOfMarks(state: SessionState, ids: readonly string[]): string {
  const regions = new Set(state.regions ?? []);
  const order: string[] = [];
  const take = (id: string) => { if (!order.includes(id)) order.push(id); };
  for (const id of ids) {
    take(id);
    if (regions.has(id)) for (const m of regionMembers(state, id)) take(m);
  }
  const said: string[] = [];
  for (const id of order) {
    for (const e of searchEntriesOf(state, new Set([id]))) {
      const t = e.text.replace(/\s+/g, ' ').trim();
      if (t && !said.includes(t)) said.push(t);
    }
  }
  const text = said.join(' ');
  return text.length > LIKE_MAX_CHARS ? text.slice(0, LIKE_MAX_CHARS) : text;
}
