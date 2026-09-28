// A pack's notation on the pen while the board uses it (V1-PLAN §2.3, §4, B3).
//
// A notation's ports reach the pen through E3's hook (`session/ports.ts`) only
// when something offers them (`offerPorts`, notations/notation.ts), because
// what the pen feels on every board is not a notation's to change by being
// known. A board that uses a pack naming a notation offers them: the ports
// come on with the `use` and go with the `unuse` — or with the undo of the
// `use`, or a board that never used it loaded in its place — because they
// follow the board's state, which is a pure function of its log.
//
// The pen is the page's: the ports hook is one registry for everything the
// page draws with, so a page follows ONE board, the one on screen. The session
// knows nothing of it; the host that shows the board says to follow it.

import type { SessionState } from '../session/session';
import { offerPorts } from '../notations/notation';
import { type PackSource, shippedPack } from './registry';

/** What `followPacks` reads of a board: its state, and word when it changes. */
export interface PackBoard {
  getState(): Pick<SessionState, 'packs'>;
  subscribe(listener: (state: SessionState) => void): () => void;
}

/** The notations the packs a board uses carry, in the order it uses them, each once. */
export function notationsInUse(state: Pick<SessionState, 'packs'>, source: PackSource = shippedPack): string[] {
  const out: string[] = [];
  for (const ref of state.packs ?? []) {
    const n = source(ref)?.notation;
    if (n && !out.includes(n)) out.push(n);
  }
  return out;
}

/**
 * Keep the pen's ports in step with the packs a board uses: every notation a
 * pack in use carries is offered (`offerPorts`), and one no pack in use
 * carries any more is taken back. Returns the way to stop following, which
 * takes back everything it offered.
 */
export function followPacks(board: PackBoard, source: PackSource = shippedPack): () => void {
  const offered = new Map<string, () => void>();
  const sync = (state: Pick<SessionState, 'packs'>) => {
    const want = notationsInUse(state, source);
    for (const [n, off] of offered) {
      if (want.includes(n)) continue;
      off();
      offered.delete(n);
    }
    for (const n of want) if (!offered.has(n)) offered.set(n, offerPorts(n));
  };
  sync(board.getState());
  const stop = board.subscribe(sync);
  return () => {
    stop();
    for (const off of offered.values()) off();
    offered.clear();
  };
}
