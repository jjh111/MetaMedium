// Live logs: multiplayer as a transport over the per-participant logs.
//
// Nothing in the engine changes (SURFACE-v9-PLAN D10). A second person on the
// same canvas is a second log arriving live instead of after a pull: each
// participant appends to its own log, every append is a line sent over a
// transport, and every peer keeps every log it has heard and merges them.
// There is no CRDT and no server truth — the logs ARE the truth, one per
// hand, and `mergeLogs` is the merge, exactly as with a folder.
//
// The transport is the only thing that varies: a BroadcastChannel between
// tabs on one machine, a relay that forwards lines between machines, or the
// in-memory hub the tests use. A newcomer says hello and every peer answers
// with its whole log, so history is caught up the same way a pull would.

import type { SessionEvent } from '../session/session';
import { type Store, type Entry, type Capabilities, ReadOnlyError } from './seam';

/** One line on the wire: a participant's events, or a hello, or a whole log in answer to one. */
export interface LiveLine {
  participant: string;
  events: SessionEvent[];
  at: number;
  /** A newcomer asking for everyone's log. */
  hello?: boolean;
  /**
   * The whole log of `participant`, replacing what was held (the answer to a
   * hello). Because it replaces, it is only ever applied when it is the
   * present: one older than what has already landed is a replayed snapshot and
   * is dropped, and one that DIVERGES from what is held is two hands under one
   * name and is refused.
   */
  full?: boolean;
}

export interface LiveTransport {
  send(line: LiveLine): void;
  onMessage(cb: (line: LiveLine) => void): () => void;
  close?(): void;
}

export interface Presence {
  participant: string;
  /** When their last event landed here (their clock, or ours for a hello). */
  at: number;
}

export class LiveStore implements Store {
  private logs: Record<string, SessionEvent[]> = {};
  private seen = new Map<string, number>();
  /** The newest `at` already applied from each hand, so a replayed snapshot cannot install a past state. */
  private applied = new Map<string, number>();
  /** A name two hands are both using: the sentence that says so. */
  private collided = new Map<string, string>();
  private listeners: ((participant: string, events: SessionEvent[]) => void)[] = [];
  private off: (() => void) | null;

  constructor(private transport: LiveTransport, readonly me: string, readonly room: string = 'room') {
    this.logs[me] = [];
    this.off = transport.onMessage((line) => this.receive(line));
  }

  capabilities(): Capabilities {
    return { write: true, watch: true };
  }

  /** A live room holds logs, not files: nothing to list, read or write. */
  async list(): Promise<Entry[]> { return []; }
  async read(path: string): Promise<string | Uint8Array> { throw new Error(`${path}: a live room holds no files`); }
  async write(path: string, _data: string | Uint8Array): Promise<void> { void _data; throw new ReadOnlyError(path); }

  async appendLog(participant: string, events: readonly SessionEvent[]): Promise<void> {
    if (!events.length) return;
    const log = (this.logs[participant] ??= []);
    log.push(...events);
    this.transport.send({ participant, events: events.slice(), at: Date.now() });
  }

  async readLogs(): Promise<Record<string, SessionEvent[]>> {
    const out: Record<string, SessionEvent[]> = {};
    for (const [k, v] of Object.entries(this.logs)) out[k] = v.slice();
    return out;
  }

  /** Ask the room for its logs; every peer answers with its own, in full. */
  hello(): void {
    this.transport.send({ participant: this.me, events: [], at: Date.now(), hello: true });
  }

  /** Every hand heard from, and when. */
  presence(): Presence[] {
    return [...this.seen.entries()].map(([participant, at]) => ({ participant, at })).sort((a, b) => b.at - a.at);
  }

  /**
   * Names heard from two hands at once. An append-only log cannot diverge from
   * itself, so a `full` that disagrees with what is held under the same name is
   * two hands answering to one — the fault that silently ate a drawing (§1 of
   * NOTES-DRAWING-WITH-THE-HAND). One sentence per name, for the status bar.
   */
  collisions(): string[] {
    return [...this.collided.values()];
  }

  /** Fires when another participant's events land, with what landed. */
  subscribe(cb: (participant: string, events: SessionEvent[]) => void): () => void {
    this.listeners.push(cb);
    return () => { this.listeners = this.listeners.filter((l) => l !== cb); };
  }

  close(): void {
    if (this.off) this.off();
    this.off = null;
    if (this.transport.close) this.transport.close();
  }

  private receive(line: LiveLine): void {
    if (!line || typeof line.participant !== 'string' || line.participant === this.me) return;
    this.seen.set(line.participant, Date.now());
    if (line.hello) {
      // Answer with my whole log, so the newcomer has what a pull would give.
      this.transport.send({ participant: this.me, events: this.logs[this.me].slice(), at: Date.now(), full: true });
      this.notify(line.participant, []);
      return;
    }
    const events = Array.isArray(line.events) ? line.events : [];
    const at = typeof line.at === 'number' ? line.at : Date.now();
    if (line.full) {
      // A `full` REPLACES what is held, so it must be the present. A relay
      // replays its buffer to a connecting client, and a snapshot out of its
      // moment would install a past state — the same class of fault as a late
      // result resurrecting an erased target (STATE-1). A snapshot older than
      // something already applied from that hand is not the present; drop it.
      const last = this.applied.get(line.participant);
      if (last !== undefined && at < last) return;
      const held = this.logs[line.participant];
      const i = held && held.length ? divergence(held, events) : -1;
      if (i >= 0) {
        // Two logs under one name. Keep what is held — refusing is the only
        // answer that cannot lose work — and say so.
        this.collided.set(line.participant, `two hands are both called "${line.participant}" — their logs disagree from event ${i + 1}; what is held is kept, so rename one`);
        this.notify(line.participant, []);
        return;
      }
      this.logs[line.participant] = events.slice();
    } else {
      (this.logs[line.participant] ??= []).push(...events);
    }
    this.applied.set(line.participant, Math.max(this.applied.get(line.participant) ?? 0, at));
    this.notify(line.participant, events);
  }

  private notify(participant: string, events: SessionEvent[]): void {
    for (const l of this.listeners) l(participant, events);
  }
}

/**
 * The first held event a `full` cannot account for, or -1 when the two logs
 * are one hand's.
 *
 * The test is DIVERGENCE, never length. Length says nothing here for two
 * reasons, both of them real:
 *
 *  - A **reset** legitimately leaves a hand's log shorter than what was held,
 *    and everything in it was already seen.
 *  - What is held is usually a **suffix**, not a prefix: a hand that joins a
 *    room mid-stream hears only the lines sent after it arrived, and the whole
 *    log that answers its hello starts at event one. Comparing index to index
 *    called that a collision and refused the answer — which is how the shard's
 *    seat stopped hearing the brief parked for it.
 *
 * So the question is containment in order: one log accounts for the other, in
 * either direction, or the two are not one hand's history and nothing can
 * reconcile them.
 */
function divergence(held: readonly SessionEvent[], incoming: readonly SessionEvent[]): number {
  const a = held.map((e) => JSON.stringify(e));
  const b = incoming.map((e) => JSON.stringify(e));
  const i = unaccounted(a, b);
  if (i < 0) return -1;                  // the full carries everything already held
  if (unaccounted(b, a) < 0) return -1;  // what is held carries the whole full: a reset
  return i;
}

/** The first line of `a` that is not in `b`, in order, or -1. */
function unaccounted(a: readonly string[], b: readonly string[]): number {
  let j = 0;
  for (let i = 0; i < a.length; i++) {
    while (j < b.length && b[j] !== a[i]) j++;
    if (j >= b.length) return i;
    j++;
  }
  return -1;
}

/**
 * An in-memory room: every transport it hands out hears every line the
 * others send. The tests' transport, and the shape a BroadcastChannel or a
 * relay has to match.
 */
export class LocalHub {
  private members: ((line: LiveLine) => void)[] = [];

  connect(): LiveTransport {
    let cb: ((line: LiveLine) => void) | null = null;
    const hub = this;
    const transport: LiveTransport = {
      send(line) {
        // A copy per member, delivered asynchronously like a real wire.
        const copy = JSON.parse(JSON.stringify(line)) as LiveLine;
        for (const m of hub.members) if (m !== cb) queueMicrotask(() => m(copy));
      },
      onMessage(fn) {
        cb = fn;
        hub.members.push(fn);
        return () => { hub.members = hub.members.filter((m) => m !== fn); cb = null; };
      },
    };
    return transport;
  }
}
