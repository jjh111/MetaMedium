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
// with every log it holds — its own, and every other hand's it has heard —
// so history is caught up the way a pull would, even for a hand that has
// since left the room.
//
// Ids that hold (DIRECTOR-PLAN-W2 L1). A hand's log is ONE SITTING — a tab's
// page load, a process — under a name of its own (`sittingName`, in
// session/hands.ts), and every line it sends carries its SITTING id, so two
// hands that came up under one name are told apart by every store that hears
// them: the room, and both of the hands themselves. What a hand sends is its
// log as it stands (`publish`): the new tail when it only grew, the whole of it
// when it did not — an undo reaches every peer.

import type { SessionEvent } from '../session/session';
import { sittingToken } from '../session/hands';
import { type Store, type Entry, type Capabilities, ReadOnlyError } from './seam';

/** One line on the wire: a participant's events, or a hello, or a whole log in answer to one. */
export interface LiveLine {
  /** Whose log this is. */
  participant: string;
  events: SessionEvent[];
  /**
   * The writer's clock when the line was sent. For a log handed on by another
   * hand (`via`), the newest line of it that hand had applied — still the
   * writer's clock, so the two can be compared.
   */
  at: number;
  /** A newcomer asking for everyone's log. */
  hello?: boolean;
  /**
   * The whole log of `participant`, replacing what was held (the answer to a
   * hello, or a log that has shrunk: an undo, a reset). Because it replaces,
   * it is only ever applied when it is the present: one older than what has
   * already landed is a replayed snapshot and is dropped.
   */
  full?: boolean;
  /**
   * The SITTING that writes this log — one per store, never shown. A log is
   * written by one sitting; a second sitting under the same name is a second
   * hand answering to it, and every store that hears both says so. A line with
   * none was sent before sittings, and is judged by the old rule: a `full`
   * that diverges from what is held is refused as two hands.
   */
  sid?: string;
  /**
   * The hand that sent this line when it is not the log's own writer: a peer
   * answering a newcomer's hello with its copy of another hand's log, so a
   * hand that has left is still caught up. Presence is the sender's, never
   * the absent writer's.
   */
  via?: string;
}

/**
 * The relay's one word of its own (`Demos/relay.mjs`): this room has outlived
 * the relay's buffer, so what it replayed is not the whole of it. It carries
 * no `participant`, so a store that only knows about logs would drop it; this
 * one says it.
 */
export interface RelayNotice {
  relay: 'truncated';
  room?: string;
  dropped: number;
  kept?: number;
}

export interface LiveTransport {
  /**
   * Put a line on the wire. A transport that is asynchronous — a POST to a
   * relay — returns a promise, and the store waits for it before the next
   * line, so a hand's lines reach the relay in the order it wrote them.
   */
  send(line: LiveLine): void | Promise<unknown>;
  onMessage(cb: (line: LiveLine | RelayNotice) => void): () => void;
  close?(): void;
}

export interface LiveStoreOptions {
  /**
   * Which sitting of this hand is writing — a tab's page load, a process.
   * Defaults to a fresh one per store. A host that opens a second store under
   * the same name in the same sitting (joining a room again) passes the same
   * one, or its own earlier lines, replayed by a relay, read as a second hand.
   */
  sitting?: string;
}

export interface Presence {
  participant: string;
  /** When their last event landed here (their clock, or ours for a hello). */
  at: number;
}

export class LiveStore implements Store {
  /** Which sitting of this hand is writing (never shown; see `LiveLine.sid`). */
  readonly sitting: string;
  private logs: Record<string, SessionEvent[]> = {};
  /** The authorship of every event each held log carries, so an event heard twice is held once. */
  private carried = new Map<string, Set<string>>();
  private seen = new Map<string, number>();
  /** The newest `at` already applied from each hand, so a replayed snapshot cannot install a past state. */
  private applied = new Map<string, number>();
  /** The sitting heard writing each log. */
  private sittings = new Map<string, string>();
  /** A name two hands are both using: the sentence that says so. */
  private collided = new Map<string, string>();
  /** The relay's word that this room is older than its buffer. */
  private truncated: RelayNotice | null = null;
  /** Whether this store has put MY log on the wire yet, in any form. */
  private published = false;
  private lastAt = 0;
  /** The line still leaving, when the transport is asynchronous. */
  private tail: Promise<void> | null = null;
  private listeners: ((participant: string, events: SessionEvent[]) => void)[] = [];
  private off: (() => void) | null;

  constructor(private transport: LiveTransport, readonly me: string, readonly room: string = 'room', opts: LiveStoreOptions = {}) {
    this.sitting = opts.sitting || sittingToken(8);
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
    if (participant === this.me) this.published = true;
    await this.post({ participant, events: events.slice(), at: this.stamp(), sid: this.sitting });
  }

  /**
   * Put MY log on the wire as it stands: `events` is the whole of it, and the
   * store sends whatever makes every peer's copy equal it. When it only grew
   * since the last send, that is the new tail, as an append. When it did not —
   * an undo, a reset, anything that is not growth — it is the whole log, as a
   * `full`, which every peer takes in place of what it held: an undo reaches
   * the room instead of standing only here (L1). The first send of a store is
   * always whole, so a hand that joins a room again in the same sitting
   * replaces what the room holds of it rather than doubling it.
   */
  async publish(events: readonly SessionEvent[]): Promise<void> {
    const sent = this.logs[this.me];
    if (this.published && extendsLog(sent, events)) {
      if (events.length > sent.length) await this.appendLog(this.me, events.slice(sent.length));
      return;
    }
    this.published = true;
    this.logs[this.me] = events.slice();
    await this.post({ participant: this.me, events: events.slice(), at: this.stamp(), full: true, sid: this.sitting });
  }

  async readLogs(): Promise<Record<string, SessionEvent[]>> {
    const out: Record<string, SessionEvent[]> = {};
    for (const [k, v] of Object.entries(this.logs)) out[k] = v.slice();
    return out;
  }

  /** Ask the room for its logs; every peer answers with every log it holds, in full. */
  hello(): void {
    void this.post({ participant: this.me, events: [], at: this.stamp(), hello: true, sid: this.sitting });
  }

  /** Every hand heard from, and when. */
  presence(): Presence[] {
    return [...this.seen.entries()].map(([participant, at]) => ({ participant, at })).sort((a, b) => b.at - a.at);
  }

  /**
   * Names heard from two hands at once — two sittings writing under one name,
   * or, for a line from before sittings, a `full` that disagrees with what is
   * held (an append-only log cannot diverge from itself). The fault that
   * silently ate a drawing (§1 of NOTES-DRAWING-WITH-THE-HAND). One sentence
   * per name, for the status bar. The two hands that share the name hear it
   * too: this hand's own name is checked before any line is discarded.
   */
  collisions(): string[] {
    return [...this.collided.values()];
  }

  /** The relay's word that this room is older than its buffer, as a sentence, or null. */
  truncation(): string | null {
    const n = this.truncated;
    if (!n) return null;
    return `the room is older than the relay remembers — ${n.dropped} earlier line${n.dropped === 1 ? ' is' : 's are'} gone`;
  }

  /** Everything the room has said about itself, one sentence each: the collisions, then the truncation. */
  notices(): string[] {
    const out = this.collisions();
    const t = this.truncation();
    if (t) out.push(t);
    return out;
  }

  /**
   * Fires when another participant's events land, with what landed — and,
   * with no events, when the room says something about itself (a hello, a
   * collision, the relay's truncation, whose participant is '').
   */
  subscribe(cb: (participant: string, events: SessionEvent[]) => void): () => void {
    this.listeners.push(cb);
    return () => { this.listeners = this.listeners.filter((l) => l !== cb); };
  }

  close(): void {
    if (this.off) this.off();
    this.off = null;
    if (this.transport.close) this.transport.close();
  }

  /** A clock for this store's own lines that never runs backwards, so the newest of them is always the present. */
  private stamp(): number {
    this.lastAt = Math.max(Date.now(), this.lastAt + 1);
    return this.lastAt;
  }

  /**
   * Send lines in the order they were written. A synchronous transport sends
   * at once; an asynchronous one (a POST) is waited for before the next line
   * goes, or two POSTs in flight could reach the relay the wrong way round.
   * A line that fails is gone — the next whole log carries what it held.
   */
  private post(line: LiveLine): Promise<void> {
    const go = (): Promise<void> | undefined => {
      let r: unknown;
      try { r = this.transport.send(line); } catch { return undefined; }
      return r && typeof (r as Promise<unknown>).then === 'function'
        ? (r as Promise<unknown>).then(() => undefined, () => undefined)
        : undefined;
    };
    const settle = (t: Promise<void>) => t.then(() => { if (this.tail === t) this.tail = null; });
    if (!this.tail) {
      const r = go();
      if (!r) return Promise.resolve();
      const t: Promise<void> = settle(r);
      this.tail = t;
      return t;
    }
    const t: Promise<void> = settle(this.tail.then(go));
    this.tail = t;
    return t;
  }

  /**
   * Answer a hello: my own log, and every other log held — each still marked
   * with the sitting that wrote it and the newest line of it applied here — so
   * a hand that has left is caught up by the hands that stayed.
   */
  private answer(): void {
    void this.post({ participant: this.me, events: this.logs[this.me].slice(), at: this.stamp(), full: true, sid: this.sitting });
    for (const [name, events] of Object.entries(this.logs)) {
      if (name === this.me) continue;
      const at = this.applied.get(name);
      if (at === undefined) continue;
      const line: LiveLine = { participant: name, events: events.slice(), at, full: true, via: this.me };
      const sid = this.sittings.get(name);
      if (sid) line.sid = sid;
      void this.post(line);
    }
  }

  private collide(name: string, sentence: string): void {
    if (this.collided.has(name)) return;
    this.collided.set(name, sentence);
    this.notify(name, []);
  }

  private receive(raw: LiveLine | RelayNotice | null | undefined): void {
    if (!raw || typeof raw !== 'object') return;
    if ((raw as RelayNotice).relay === 'truncated') {
      const n = raw as RelayNotice;
      this.truncated = { relay: 'truncated', room: n.room, dropped: Math.max(0, Number(n.dropped) || 0), kept: n.kept };
      this.notify('', []);
      return;
    }
    const line = raw as LiveLine;
    if (typeof line.participant !== 'string') return;
    const sid = typeof line.sid === 'string' && line.sid ? line.sid : undefined;
    const from = typeof line.via === 'string' && line.via ? line.via : line.participant;

    // Two hands under one name, checked FIRST — before any line is discarded,
    // this hand's own name included. Discarding my own name's lines before
    // looking at them is exactly why the two hands that shared a name were
    // the only two never told (D4).
    if (line.participant === this.me) {
      // My own line, come back: a relay echoes every line to its sender and
      // replays them on a reconnect, and a peer answering a hello hands every
      // hand its own log back. Nothing in it that I do not already have.
      if (!sid || sid === this.sitting) return;
      this.collide(this.me, `two hands are both called "${this.me}" — this one, and another writing under its name; neither is taken for the other, so reload one to give it a new name`);
      // Answered all the same: my own log, from my sitting, is how the other
      // hand learns it shares a name with me.
      if (line.hello) this.answer();
      return;
    }
    if (from !== this.me) this.seen.set(from, Date.now());
    if (sid) {
      const known = this.sittings.get(line.participant);
      if (known === undefined) this.sittings.set(line.participant, sid);
      else if (known !== sid) {
        // Keep what was heard first — refusing is the only answer that cannot
        // lose work — and say so.
        this.collide(line.participant, `two hands are both called "${line.participant}" — the one heard first is kept and the other's lines are refused; reload one to give it a new name`);
        if (line.hello) this.answer();
        return;
      }
    }
    if (line.hello) {
      // Answer with every log held, so the newcomer has what a pull would give.
      this.answer();
      this.notify(line.participant, []);
      return;
    }
    const events = Array.isArray(line.events) ? line.events : [];
    const at = typeof line.at === 'number' ? line.at : Date.now();
    if (line.full) {
      // A `full` REPLACES what is held, so it must be the present. A relay
      // replays its buffer to a connecting client, and a peer's copy of a log
      // can lag the log itself; a snapshot out of its moment would install a
      // past state — the same class of fault as a late result resurrecting an
      // erased target (STATE-1). A snapshot older than something already
      // applied from that hand is not the present; drop it.
      const last = this.applied.get(line.participant);
      if (last !== undefined && at < last) return;
      const held = this.logs[line.participant];
      if (!sid) {
        // No sitting to judge by — a line from before sittings. The old rule:
        // an append-only log cannot diverge from itself.
        const i = held && held.length ? divergence(held, events) : -1;
        if (i >= 0) {
          this.collide(line.participant, `two hands are both called "${line.participant}" — their logs disagree from event ${i + 1}; what is held is kept, so rename one`);
          return;
        }
      }
      // From its own sitting a log may be anything: its writer undid, reset or
      // rewrote it, and what it sends is what it holds.
      this.logs[line.participant] = events.slice();
      this.carried.set(line.participant, new Set(events.map(authorKey).filter((k): k is string => k !== null)));
    } else {
      // An event already held — one a newcomer was handed in a peer's copy
      // before the writer's own line reached it — is held once. Only an event
      // with authorship can be known twice; one written before it is taken as
      // it comes.
      const log = (this.logs[line.participant] ??= []);
      let keys = this.carried.get(line.participant);
      if (!keys) this.carried.set(line.participant, (keys = new Set()));
      for (const ev of events) {
        const k = authorKey(ev);
        if (k !== null) {
          if (keys.has(k)) continue;
          keys.add(k);
        }
        log.push(ev);
      }
    }
    this.applied.set(line.participant, Math.max(this.applied.get(line.participant) ?? 0, at));
    this.notify(line.participant, events);
  }

  private notify(participant: string, events: SessionEvent[]): void {
    for (const l of this.listeners) l(participant, events);
  }
}

/**
 * An event's authorship as one string — the log that wrote it and its number
 * there — or null for an event written before authorship. Within one sitting a
 * number is issued once, so this is what makes an event itself.
 */
function authorKey(ev: SessionEvent): string | null {
  return typeof ev.origin === 'string' && ev.origin && typeof ev.seq === 'number' && Number.isSafeInteger(ev.seq)
    ? `${ev.origin}#${ev.seq}`
    : null;
}

/** Content keys for events with no authorship, made once per event object. */
const contentKeys = new WeakMap<object, string>();
function eventKey(ev: SessionEvent): string {
  const k = authorKey(ev);
  if (k !== null) return k;
  let s = contentKeys.get(ev);
  if (s === undefined) {
    s = JSON.stringify(ev);
    contentKeys.set(ev, s);
  }
  return s;
}

/** Whether `now` is `sent` with events added after it and nothing before them changed. */
function extendsLog(sent: readonly SessionEvent[], now: readonly SessionEvent[]): boolean {
  if (now.length < sent.length) return false;
  for (let i = 0; i < sent.length; i++) if (eventKey(sent[i]) !== eventKey(now[i])) return false;
  return true;
}

/**
 * The first held event a `full` cannot account for, or -1 when the two logs
 * are one hand's. The rule for a line from before sittings.
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
