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
  /** The whole log of `participant`, replacing what was held (the answer to a hello). */
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
    if (line.full) this.logs[line.participant] = events.slice();
    else (this.logs[line.participant] ??= []).push(...events);
    this.notify(line.participant, events);
  }

  private notify(participant: string, events: SessionEvent[]): void {
    for (const l of this.listeners) l(participant, events);
  }
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
