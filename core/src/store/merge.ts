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
//
// Ids per hand (SURFACE-v10-PLAN D8): an event's AUTHORSHIP — `origin` and
// `seq`, the log that wrote it and its number in that log — is carried
// through untouched, because the node ids it mints are derived from it and
// must be the same here as they were there. The merge adds nothing to it and
// takes nothing away. It deliberately does not stamp the authorship a held
// log is missing: the name would be the one the READER found the file under,
// so it would change with the reader, and a log's own events refer to the ids
// it minted, so renumbering one would break it from the inside. A log written
// before that rule keeps the numbering it always had.
//
// One event, applied once (V1-PLAN phase 0, L1b). Authorship is an event's
// identity: a log numbers each of its events once, so one `(origin, seq)` is
// one event wherever it is found. And the same event IS found in two logs: a
// tab that joins a room again under another person's name hands its whole log
// on under the new name while the room still holds the old one; two hands that
// opened one folder carry the same file's events into one room. Merged as two,
// the one mark was applied twice — one node, its id listed twice on the board,
// attributed to whichever log merged last. So the merge keeps ONE event per
// authorship: the first occurrence, in merge order — except that the reader's
// own log (`me`) always keeps its own copy, because it is the log the reader
// wrote, and an event of mine dropped here would drop out of what I send next.
// An event with no authorship has no identity to fold by and is taken as it
// comes. Two DIFFERENT events under one authorship are not one event: they are
// two writers under one name, which the id rules exist to prevent. The first
// is kept (the reader's own first, as above), and the collision is said
// (`onCollision`) — a live room says it where it says everything else about
// itself (`LiveStore.notices`).

import type { SessionEvent } from '../session/session';

/**
 * Two different events that carry one authorship — one log name, one number.
 * A log numbers each of its events once, so this is two writers under one
 * name. The merge keeps the first and leaves the other out.
 */
export interface AuthorshipCollision {
  /** The log name both events claim to have been written by. */
  origin: string;
  /** The number both carry in it. */
  seq: number;
  /** The log the kept event was found in. */
  kept: string;
  /** The log whose different event under the same authorship was left out. */
  dropped: string;
}

export interface MergeOptions {
  /** The log that is this participant's own; its events are not stamped. */
  me?: string;
  /**
   * Told of every event left out because a different one already holds its
   * authorship (the kept one is the first, in merge order, the reader's own
   * log first). Never told of a copy of the same event: that is one event,
   * found twice, and folding it is the whole point.
   */
  onCollision?: (collision: AuthorshipCollision) => void;
}

interface Tagged {
  ev: SessionEvent;
  name: string;
  i: number;
}

export function mergeLogs(logs: Record<string, readonly SessionEvent[]>, opts: MergeOptions = {}): SessionEvent[] {
  const names = Object.keys(logs).sort();
  const tagged: Tagged[] = [];
  for (const name of names) logs[name].forEach((ev, i) => tagged.push({ ev, name, i }));
  tagged.sort((a, b) => {
    const ta = atOf(a.ev), tb = atOf(b.ev);
    if (ta !== tb) return ta - tb;
    if (a.name !== b.name) return a.name < b.name ? -1 : 1;
    return a.i - b.i;
  });
  const kept = foldAuthorship(tagged, opts);
  const stamp = opts.me !== undefined;
  return kept.map((t) => (stamp && t.name !== opts.me ? { ...t.ev, by: t.name } : { ...t.ev }));
}

/** The sentence for a collision, in the human's terms — what a room says about it. */
export function describeAuthorshipCollision(c: AuthorshipCollision): string {
  return `two different events are both "${c.origin}" number ${c.seq} — the one in ${c.kept}'s log is kept and the one in ${c.dropped}'s is left out; two hands have written under one name`;
}

/**
 * One event per authorship, in merge order. Pass one decides which copy of
 * each authorship stands — the first, unless the reader's own log holds one —
 * and pass two keeps exactly that copy, telling `onCollision` of every copy
 * left out that is not the same event.
 */
function foldAuthorship(tagged: readonly Tagged[], opts: MergeOptions): Tagged[] {
  const winner = new Map<string, Tagged>();
  for (const t of tagged) {
    const k = authorKey(t.ev);
    if (k === null) continue;
    const held = winner.get(k);
    if (!held || (opts.me !== undefined && t.name === opts.me && held.name !== opts.me)) winner.set(k, t);
  }
  const out: Tagged[] = [];
  for (const t of tagged) {
    const k = authorKey(t.ev);
    if (k === null) { out.push(t); continue; }
    const w = winner.get(k)!;
    if (w === t) { out.push(t); continue; }
    if (opts.onCollision && !sameEvent(w.ev, t.ev)) {
      opts.onCollision({ origin: t.ev.origin!, seq: t.ev.seq!, kept: w.name, dropped: t.name });
    }
  }
  return out;
}

/**
 * An event's authorship as one key — the log that wrote it and its number
 * there — or null for an event written before authorship, which has no
 * identity to fold by. The same well-formedness the session mints ids by: a
 * name and a whole, non-negative number.
 */
export function authorKey(ev: SessionEvent): string | null {
  if (typeof ev.origin !== 'string' || !ev.origin) return null;
  if (typeof ev.seq !== 'number' || !Number.isSafeInteger(ev.seq) || ev.seq < 0) return null;
  return `${ev.origin}#${ev.seq}`;
}

/**
 * Whether two copies are the same event. `by` is left out — it is the name a
 * READER's merge found a copy under, not part of what was written — and keys
 * are compared in a fixed order, so two copies that took different routes
 * (a relay, a file, a peer's answer to a hello) still compare as written.
 */
export function sameEvent(a: SessionEvent, b: SessionEvent): boolean {
  if (a === b) return true;
  return canonical(a, true) === canonical(b, true);
}

/** JSON with its keys in a fixed order: what a copy says, however it travelled. */
function canonical(v: unknown, top = false): string {
  if (v === null || typeof v !== 'object') return JSON.stringify(v) ?? 'null';
  if (Array.isArray(v)) return '[' + v.map((x) => canonical(x)).join(',') + ']';
  const o = v as Record<string, unknown>;
  const keys = Object.keys(o).filter((k) => o[k] !== undefined && !(top && k === 'by')).sort();
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + canonical(o[k])).join(',') + '}';
}

/**
 * When an event happened, for the merge's order: its `at`, or 0 when it has
 * none — or one that is not a number, NaN included, which would make the order
 * no order at all (a comparison with NaN is neither less nor more), and the
 * same logs could merge two ways. The incremental merge (`livemerge.ts`)
 * orders by this too, so the two agree on every log, well formed or not.
 */
export function atOf(ev: SessionEvent): number {
  return 'at' in ev && typeof ev.at === 'number' && !Number.isNaN(ev.at) ? ev.at : 0;
}
