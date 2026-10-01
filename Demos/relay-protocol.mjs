// The relay's protocol, apart from any server: what a room keeps, what a
// connecting client is sent, and what it is owed when the room has outlived
// its buffer. Pure functions of a room and a last-seen id, with no socket, no
// clock and no Node import — so the one definition is read by the Node relay
// (Demos/relay.mjs) and by the Worker that carries the same protocol on
// Cloudflare (cloudflare/relay/src/worker.mjs), and the two cannot drift.

/** How many lines a room keeps when nothing says otherwise. */
export const DEFAULT_MAX_LINES = 5000;

/** The cap a relay runs with: the option, else MM_RELAY_MAX_LINES, else the default. */
export function maxLinesFrom(option, env = {}) {
  for (const v of [option, env.MM_RELAY_MAX_LINES]) {
    const n = Number(v);
    if (v !== undefined && v !== '' && Number.isSafeInteger(n) && n > 0) return n;
  }
  return DEFAULT_MAX_LINES;
}

/**
 * What kind of line this is, for the replay: a hello, a writer's own whole
 * log, a whole log handed on by another hand (`via`) in answer to a hello, or
 * an append.
 */
export function kindOf(line) {
  if (line && line.hello) return 'hello';
  if (line && line.full) return line.via ? 'relayed' : 'full';
  return 'append';
}

/**
 * What a connecting client is sent: the room brought up to the PRESENT, never
 * a history that installs a past state along the way.
 *
 * A `full` replaces what the client holds, so replaying an old one hands a
 * fresh tab a snapshot out of its moment — which is how a tab came up holding
 * part of the room (NOTES-DRAWING-WITH-THE-HAND §C). Only a hand's LAST `full`
 * in the replayed stretch is still true; the appends around it are kept in
 * order, so the result is that hand's log as it stands now.
 *
 * A `hello` IS replayed, and deliberately: a hand that said hello into an
 * empty room got no answer, and the replay is how the next hand to arrive
 * hears the question and answers it with its own log. Dropping them as noise
 * left the shard's MCP seat never hearing the brief that was parked for it.
 *
 * Nothing about the protocol changes: the same lines, minus the ones that were
 * only ever true in their own moment.
 */
export function replay(room, after = 0) {
  const pending = room.lines.filter((l) => l.id > after);
  const newest = new Map();
  for (const l of pending) if (l.kind === 'full') newest.set(l.participant, l.id);
  return pending.filter((l) => l.kind !== 'full' || newest.get(l.participant) === l.id);
}
// A log handed on by another hand (`relayed`) is replayed as it came and
// never supersedes the writer's own: it is a copy that may lag the log, and
// the store that receives it judges it by the writer's clock, dropping a copy
// older than what already landed. It stays in the replay because it may be
// the only whole copy left of a hand that has gone, once the relay has
// forgotten that hand's own early lines.

/**
 * What a client is owed when the room has outlived its buffer: a line saying
 * so, rather than a beginning-less history handed over as complete. Null when
 * nothing was lost, or when everything this client missed is still held.
 */
export function truncationNotice(room, after = 0) {
  if (!room.dropped) return null;
  if (after && room.lines.length && after >= room.lines[0].id - 1) return null;
  return { relay: 'truncated', room: room.name, dropped: room.dropped, kept: room.lines.length };
}
