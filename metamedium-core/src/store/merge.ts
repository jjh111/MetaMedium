// One log per participant; the canvas is the merge.
//
// Each person, machine and model appends to its OWN log file, so nobody ever
// writes anyone else's and git carries the files between machines with no
// locks and no conflicts. State is a pure function of the merged log, and
// the merge is a pure function of the logs: every event is timestamped, so
// they interleave by `at`, ties broken by the log's name so the order is the
// same on every machine. A model's proposals are, literally, its own file.
//
// Whose hand: an event from another participant's log is stamped `by` with
// that log's name, and the session attributes it to a participant of that
// name — so another hand's ink is another hand's, in its own colour, with
// no join event anyone had to write. The local log (`me`) is left unstamped:
// its events are this participant's own.

import type { SessionEvent } from '../session/session';

export interface MergeOptions {
  /** The log that is this participant's own; its events are not stamped. */
  me?: string;
}

export function mergeLogs(logs: Record<string, readonly SessionEvent[]>, opts: MergeOptions = {}): SessionEvent[] {
  const names = Object.keys(logs).sort();
  const tagged: { ev: SessionEvent; name: string; i: number }[] = [];
  for (const name of names) logs[name].forEach((ev, i) => tagged.push({ ev, name, i }));
  tagged.sort((a, b) => {
    const ta = atOf(a.ev), tb = atOf(b.ev);
    if (ta !== tb) return ta - tb;
    if (a.name !== b.name) return a.name < b.name ? -1 : 1;
    return a.i - b.i;
  });
  const stamp = opts.me !== undefined;
  return tagged.map((t) => (stamp && t.name !== opts.me ? { ...t.ev, by: t.name } : { ...t.ev }));
}

function atOf(ev: SessionEvent): number {
  return 'at' in ev && typeof ev.at === 'number' ? ev.at : 0;
}
