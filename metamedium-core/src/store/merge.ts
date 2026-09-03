// One log per participant; the canvas is the merge.
//
// Each person, machine and model appends to its OWN log file, so nobody ever
// writes anyone else's and git carries the files between machines with no
// locks and no conflicts. State is a pure function of the merged log, and
// the merge is a pure function of the logs: every event is timestamped, so
// they interleave by `at`, ties broken by the log's name so the order is the
// same on every machine. A model's proposals are, literally, its own file.

import type { SessionEvent } from '../session/session';

export function mergeLogs(logs: Record<string, readonly SessionEvent[]>): SessionEvent[] {
  const names = Object.keys(logs).sort();
  const tagged: { ev: SessionEvent; name: string; i: number }[] = [];
  for (const name of names) logs[name].forEach((ev, i) => tagged.push({ ev, name, i }));
  tagged.sort((a, b) => {
    const ta = atOf(a.ev), tb = atOf(b.ev);
    if (ta !== tb) return ta - tb;
    if (a.name !== b.name) return a.name < b.name ? -1 : 1;
    return a.i - b.i;
  });
  return tagged.map((t) => ({ ...t.ev }));
}

function atOf(ev: SessionEvent): number {
  return 'at' in ev && typeof ev.at === 'number' ? ev.at : 0;
}
