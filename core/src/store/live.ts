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
// in-memory hub the tests use. A newcomer says hello and is answered with
// each log ONCE (V1-PLAN §9 R4d): every hand answers for its own, and a copy
// of a log is handed on only when its writer cannot answer for itself — it
// said goodbye as it left, or it stayed silent when asked — by the first of
// the hands that hold one, the others hearing it go. So history is caught up
// the way a pull would, even for a hand that has since left the room, without
// every hand sending every log it holds to every other.
//
// A reader merges only when a log it holds changed (`revision`), and reads the
// logs as they are held (`heldLogs`) — an array is only ever appended to or
// replaced whole, so an append can be told from a replacement by identity
// alone, and `LiveMerge` (livemerge.ts) takes a line without reading the rest.
// A whole log equal to the one held changes nothing, and one that only
// extends it is taken as an append.
//
// Ids that hold (DIRECTOR-PLAN-W2 L1). A hand's log is ONE SITTING — a tab's
// page load, a process — under a name of its own (`sittingName`, in
// session/hands.ts), and every line it sends carries its SITTING id, so two
// hands that came up under one name are told apart by every store that hears
// them: the room, and both of the hands themselves. What a hand sends is its
// log as it stands (`publish`): the new tail when it only grew, the whole of it
// when it did not — an undo reaches every peer.
//
// Nothing a hand sends is lost on the wire (the multiuser audit, MU-7, MU-8). A
// transport says what became of each line (`SendResult`); the store keeps how
// much of its own log the room is known to hold (`confirmed`) and sends again
// from there what the room did not take — on a backoff of 2 to 30 s, at once when
// the window comes back online, after the wait a relay asked for — and a whole
// log too long for one line goes as a `full` and appends, cut between events. A
// line the room will never take is said, not retried: a name another hand holds,
// a thing too big for any line. And a copy of another hand's log handed on
// (`via`) may only ADD to what is held here: the writer's own whole log still
// replaces it — an undo still reaches every peer — but a copy that would take
// marks away is refused and said.

import type { SessionEvent } from '../session/session';
import { sittingToken, handLabel } from '../session/hands';
import { type Store, type Entry, type Capabilities, ReadOnlyError } from './seam';
import { describeAuthorshipCollision, authorKey as eventAuthorship, sameEvent, atOf } from './merge';

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
  /**
   * The writer is leaving (its store closed). Its log stays held everywhere;
   * it is only no longer here to answer a hello for it, so the hands that
   * hold a copy do.
   */
  bye?: boolean;
  /**
   * The writer answers briefs parked at the seat (V1-PLAN J4): a Claude Code
   * hand, which a page offers as the model it can ask while it is heard. Said
   * on every line such a hand writes about itself; a copy handed on (`via`)
   * never carries it, because presence is the sender's.
   */
  seat?: boolean;
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

/**
 * A relay that asks for a key (cloudflare/relay) refused this hand: it is not
 * the relay's word on the stream — a refused stream has none — but the
 * transport's, made of the status it was answered with, so a wrong or missing
 * key is a sentence in every hand's status and never a room that is silently
 * empty. Like the truncation, it carries no `participant`.
 */
export interface RelayRefusal {
  relay: 'refused';
  room?: string;
  status: number;
  /** What the relay refused: `origin` — the page's own address may not use it (a 403 that is no key's). */
  reason?: 'origin';
}

/**
 * What became of a line a transport sent: taken (`ok`), or not, with the status
 * the relay answered (0: no answer at all) and, for a 429, how many seconds it
 * asked to be left alone. A transport that answers nothing — a BroadcastChannel,
 * the tests' hub — is taken at its word: the line went.
 */
export interface SendResult {
  ok: boolean;
  status?: number;
  retryAfter?: number;
}

export interface LiveTransport {
  /**
   * Put a line on the wire. A transport that is asynchronous — a POST to a
   * relay — returns a promise, and the store waits for it before the next
   * line, so a hand's lines reach the relay in the order it wrote them. The
   * promise may resolve to a `SendResult`; anything else is a line that went.
   */
  send(line: LiveLine): void | SendResult | Promise<unknown>;
  onMessage(cb: (line: LiveLine | RelayNotice | RelayRefusal) => void): () => void;
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
  /**
   * How the store waits: run `fn` after `ms`, and return how to cancel it.
   * A timer by default; a test passes its own clock.
   */
  later?: (fn: () => void, ms: number) => () => void;
  /** This hand answers briefs parked at the seat: every line it writes about itself says so (`LiveLine.seat`). */
  seat?: boolean;
}

/** How long a line that has not yet gone holds back the next one. */
export const SEND_WAIT_MS = 10_000;

/**
 * The longest line this store sends, in characters: a whole log longer goes as
 * a `full` of its first events and appends of the rest, cut between events —
 * well under the 4,000,000 a relay takes in one line (Demos/relay-protocol.mjs).
 * A single event longer than a relay takes is refused by it (413), and then
 * never sent again, and said.
 */
export const LINE_CHARS = 3_000_000;
/** The first wait before what the room did not take is sent again, doubled each time up to the last. */
export const RETRY_FIRST_MS = 2000;
export const RETRY_MAX_MS = 30_000;

/**
 * How long a hand that holds a copy of another hand's log waits, after a
 * hello, for that hand to answer for itself before handing the copy on. A
 * writer that said goodbye is not waited for.
 */
export const COVER_WAIT_MS = 1500;
/**
 * How much longer each further hand that holds a copy waits: the first, by
 * name, goes first, and the rest hear its copy go and send none.
 */
export const COVER_STAGGER_MS = 200;

const timer = (fn: () => void, ms: number): (() => void) => {
  const t = setTimeout(fn, ms);
  (t as unknown as { unref?: () => void }).unref?.();
  return () => clearTimeout(t);
};

export interface Presence {
  participant: string;
  /** When their last event landed here (their clock, or ours for a hello). */
  at: number;
  /** It answers briefs parked at the seat (`LiveLine.seat`): a Claude Code hand. */
  seat?: boolean;
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
  /**
   * A log name two different events were both numbered under, found in the
   * logs held here (the merge's collision, L1b): one sentence per name.
   */
  private misnumbered = new Map<string, string>();
  /** Every held event under its authorship — the log, its place there — to find two different events numbered alike as they land. */
  private numbered = new Map<string, { name: string; i: number; ev: SessionEvent }[]>();
  /** Moves whenever a log another hand wrote changes here. */
  private rev = 0;
  /** Lines heard, counted, to say what was heard since a hello. */
  private heard = 0;
  /** When each log was last heard from its writer, and last handed on by another hand, in lines heard. */
  private fromWriter = new Map<string, number>();
  private fromCopy = new Map<string, number>();
  /** Writers that said goodbye and have not been heard since. */
  private gone = new Set<string>();
  /** Hands heard saying they answer briefs parked at the seat (`LiveLine.seat`). */
  private seats = new Set<string>();
  /** Whether this hand is one (`LiveStoreOptions.seat`). */
  private readonly seat: boolean;
  /** Copies waiting to be handed on, should their writers not answer. */
  private waiting = new Set<() => void>();
  private closed = false;
  private readonly later: (fn: () => void, ms: number) => () => void;
  /** The relay's word that this room is older than its buffer. */
  private truncated: RelayNotice | null = null;
  /** The relay's refusal of this hand's key (the transport's word). */
  private refused: RelayRefusal | null = null;
  /** Whether this store has put MY log on the wire yet, in any form. */
  private published = false;
  /** How many of MY log's first events the room is known to hold — what a send that failed is sent again from. */
  private confirmed = 0;
  /** The room's copy of my log is not known to be a prefix of mine (a first send, an undo, a hole): the next send of it is whole. */
  private needFull = false;
  /** Moves whenever my log is replaced rather than grown, so the answer to a send of the old one confirms nothing of the new. */
  private mineGen = 0;
  /** The longest line sent, in characters: halved when a relay says a line of several events is too large. */
  private lineChars = LINE_CHARS;
  /** Events of my log no line can carry (the relay said 413 to them alone): never sent again, said. */
  private tooBig = new WeakSet<SessionEvent>();
  private tooBigSaid: { n: number; chars: number } = { n: 0, chars: 0 };
  /** My lines are not reaching the room just now: the status it last answered (0 for none at all). Cleared when one is taken. */
  private failing: { status: number } | null = null;
  /** The room will take nothing more from this hand, and why. */
  private stopped: 'claim' | 'unreadable' | null = null;
  /** A send again, waiting its time, and how long the last wait was. */
  private retryCancel: (() => void) | null = null;
  private backoff = 0;
  /** The newest `at` applied from each writer's OWN lines — apart from copies, so a copy can never hold its writer back. */
  private ownAt = new Map<string, number>();
  /** Writers a copy of whose log was refused because it would have taken marks away: said once each. */
  private copiesRefused = new Set<string>();
  private offOnline: (() => void) | null = null;
  private lastAt = 0;
  /** The line still leaving, when the transport is asynchronous. */
  private tail: Promise<void> | null = null;
  private listeners: ((participant: string, events: SessionEvent[]) => void)[] = [];
  private off: (() => void) | null;

  constructor(private transport: LiveTransport, readonly me: string, readonly room: string = 'room', opts: LiveStoreOptions = {}) {
    this.sitting = opts.sitting || sittingToken(8);
    this.later = opts.later || timer;
    this.seat = !!opts.seat;
    this.logs[me] = [];
    this.off = transport.onMessage((line) => this.receive(line));
    // A window back online sends at once what it could not (a browser; Node has no such event).
    const g = globalThis as unknown as { addEventListener?: (t: string, f: () => void) => void; removeEventListener?: (t: string, f: () => void) => void };
    if (typeof g.addEventListener === 'function') {
      const on = () => this.resend();
      g.addEventListener('online', on);
      this.offOnline = () => g.removeEventListener?.('online', on);
    }
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
    if (participant === this.me) {
      this.grow(events);
      await this.flushMine();
      return;
    }
    const log = (this.logs[participant] ??= []);
    for (const ev of events) {
      this.number(participant, log.length, ev);
      log.push(ev);
    }
    this.rev++;
    await this.post({ participant, events: events.slice(), at: this.stamp(), sid: this.sitting });
  }

  /** My log grew by `events`: held, numbered, and owed to the room until it takes them. */
  private grow(events: readonly SessionEvent[]): void {
    const log = this.logs[this.me];
    for (const ev of events) {
      this.number(this.me, log.length, ev);
      log.push(ev);
    }
    this.published = true;
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
      // Held as the session holds them from here — a load copies every event —
      // so the next look finds them by identity alone.
      for (let i = 0; i < sent.length; i++) {
        if (sent[i] !== events[i]) {
          this.logs[this.me] = events.slice(0, sent.length);
          break;
        }
      }
      if (events.length > sent.length) {
        this.grow(events.slice(sent.length));
        await this.flushMine();
      }
      return;
    }
    this.published = true;
    this.unnumber(this.me);
    this.logs[this.me] = events.slice();
    this.logs[this.me].forEach((ev, i) => this.number(this.me, i, ev));
    this.replaced();
    await this.flushMine();
  }

  /** My log was replaced, not grown (an undo, a reset, a first send): what the room holds of it is no prefix of it, and it goes whole. */
  private replaced(): void {
    this.mineGen++;
    this.confirmed = 0;
    this.needFull = true;
  }

  /**
   * Send again, now, what the room has not taken of this hand's log — the window
   * came back online, or a person asked. A wait already set is let go of.
   */
  resend(): Promise<void> {
    if (this.closed) return Promise.resolve();
    if (this.retryCancel) { this.retryCancel(); this.retryCancel = null; }
    return this.flushMine();
  }

  /** How many of this hand's events the room has not been known to take yet (0 when it holds them all). */
  unsent(): number {
    if (this.needFull) return this.logs[this.me].length;
    return Math.max(0, this.logs[this.me].length - this.confirmed);
  }

  /**
   * My log as it stands, from the session's events: what was sent, less what
   * the session no longer holds (an undo, a reset), then what it holds of its
   * own that was never sent, in the order it holds them. The order it was
   * WRITTEN in, never the merge's: a mark stamped a moment earlier by the clock
   * than one before it would otherwise reshuffle the log, and the next send be
   * the whole of it instead of its tail. Found by identity and authorship — an
   * event is its authorship (L1b) — and by what it says only for an event
   * written before there was any, whose object a load has since copied.
   */
  ownLog(events: readonly SessionEvent[]): SessionEvent[] {
    return ownLog(this.logs[this.me], events);
  }

  async readLogs(): Promise<Record<string, SessionEvent[]>> {
    const out: Record<string, SessionEvent[]> = {};
    for (const [k, v] of Object.entries(this.logs)) out[k] = v.slice();
    return out;
  }

  /**
   * The logs as held, not copied — for a reader that merges a line at a time
   * (`LiveMerge`). An array here is only ever appended to or replaced whole,
   * never changed in place, so the same array longer is an append of its
   * tail. Read them; never change them.
   */
  heldLogs(): Readonly<Record<string, readonly SessionEvent[]>> {
    return this.logs;
  }

  /**
   * Moves whenever a log another hand wrote changes here — an append that
   * added an event, a whole log that is not the one held. A line with no
   * events (a hello, a goodbye, the relay's word) and a whole log equal to the
   * one held leave it where it was, and a reader that merges on it does no work.
   */
  revision(): number {
    return this.rev;
  }

  /** Ask the room for its logs: every hand answers with its own, and with a copy of any whose writer cannot answer. */
  hello(): void {
    void this.post({ participant: this.me, events: [], at: this.stamp(), hello: true, sid: this.sitting });
  }

  /**
   * Say this hand is here, and nothing else: a line with no events, which
   * changes no log and moves no revision anywhere, so no hand merges or
   * repaints for it. A hand that keeps quiet for long spells — the MCP hand,
   * waiting for a brief — sends one now and then, so that "heard in the last
   * minute" stays true for as long as it is in the room.
   */
  here(): void {
    void this.post({ participant: this.me, events: [], at: this.stamp(), sid: this.sitting });
  }

  /** Every hand heard from, and when — and whether it answers briefs parked at the seat. */
  presence(): Presence[] {
    return [...this.seen.entries()]
      .map(([participant, at]) => (this.seats.has(participant) ? { participant, at, seat: true } : { participant, at }))
      .sort((a, b) => b.at - a.at);
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

  /** A relay that refused this hand — no key, a wrong one — as a sentence, or null. The key is never in it. */
  refusal(): string | null {
    const r = this.refused;
    if (!r) return null;
    if (r.reason === 'origin') return 'this site may not use that relay — the room is not reached';
    if (r.status === 401) return 'the relay wants a key for this room and none was given — the room is not reached';
    if (r.status === 403) return 'the relay does not take this key for this room — the room is not reached';
    if (r.status === 503) return 'the relay has no keys set up yet — the room is not reached';
    return `the relay refused this room (HTTP ${r.status}) — the room is not reached`;
  }

  /**
   * Log names two DIFFERENT events were both numbered under, in the logs held
   * here — one sentence per name. The same event heard in two logs is one
   * event, and the merge folds it without a word; two events under one
   * authorship are two writers under one name, and the merge keeps the first
   * (L1b). Found as each event lands, against the others held under its
   * authorship — never by merging the room again — and remembered once said,
   * like a name collision.
   */
  misnumberings(): string[] {
    return [...this.misnumbered.values()];
  }

  /**
   * Everything the room has said about itself, one sentence each: the name
   * collisions, the events numbered twice under one name, then the truncation.
   */
  notices(): string[] {
    const out = this.collisions().concat(this.misnumberings());
    const f = this.refusal();
    if (f) out.push(f);
    const s = this.sendTrouble();
    if (s) out.push(s);
    for (const name of this.copiesRefused) out.push(`a copy of ${handLabel(name)}’s marks that would have taken some away was refused — what is held here is kept`);
    const t = this.truncation();
    if (t) out.push(t);
    return out;
  }

  /**
   * What this hand's own lines are going through, as one sentence, or null: the
   * room stopped taking them (a name another hand holds; a line it could not
   * read), something too big for any line, or — while it lasts — the room not
   * answering or asking to be left alone a moment. The last clears itself the
   * moment a line is taken.
   */
  sendTrouble(): string | null {
    if (this.stopped === 'claim') return 'the room takes nothing more from this hand: its name there is another hand’s — reload the page to join again';
    if (this.stopped === 'unreadable') return 'the room could not read what this hand sent, so nothing more is sent — reload the page to join again';
    const big = this.tooBigSaid;
    if (big.n) {
      return big.n === 1
        ? `something on this board is ${mb(big.chars)} — more than a room carries in one piece — and was not shared`
        : `${big.n} things on this board are more than a room carries in one piece (the largest ${mb(big.chars)}) and were not shared`;
    }
    if (!this.failing) return null;
    if (this.failing.status === 429) return 'the room is taking this hand’s lines more slowly — the rest is sent in a moment';
    return 'not reaching the room — what you draw is kept here and sent when it answers';
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

  /**
   * Leave the room: a goodbye first, so the hands that hold this hand's log
   * know it is no longer here to answer for it, and hand a copy on to the next
   * newcomer themselves. Then nothing more is heard or sent.
   */
  close(): void {
    if (this.closed) return;
    this.closed = true;
    for (const cancel of this.waiting) cancel();
    this.waiting.clear();
    if (this.retryCancel) { this.retryCancel(); this.retryCancel = null; }
    if (this.offOnline) { this.offOnline(); this.offOnline = null; }
    void this.post({ participant: this.me, events: [], at: this.stamp(), bye: true, sid: this.sitting });
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
   * goes, or two POSTs in flight could reach the relay the wrong way round —
   * but never forever: a send that has not settled in SEND_WAIT_MS lets the
   * next line go rather than wedge the hand. A line of someone else's (a hello,
   * a beat, a copy handed on) is sent once; what the room answers to it is
   * heard (a name another hand holds, a key it will not take) and nothing more.
   */
  private post(line: LiveLine): Promise<void> {
    return this.enqueue(() => {
      const r = this.sendNow(line);
      if (isThenable(r)) return r.then((res) => { this.heardBack(res); });
      this.heardBack(r);
      return undefined;
    });
  }

  /** Run `fn` after whatever is leaving; at once when nothing is. A synchronous `fn` leaves no tail. */
  private enqueue(fn: () => void | Promise<void>): Promise<void> {
    const run = (): void | Promise<void> => { try { return fn(); } catch { return undefined; } };
    // The tail is let go of once the last thing on it has left, so a hand that is idle sends its next line at once.
    const track = (p: Promise<unknown>): Promise<void> => {
      const t: Promise<void> = p.then(() => undefined, () => undefined).then(() => { if (this.tail === t) this.tail = null; });
      this.tail = t;
      return t;
    };
    if (!this.tail) {
      const r = run();
      return isThenable(r) ? track(r) : Promise.resolve();
    }
    return track(this.tail.then(run));
  }

  /**
   * Put one line on the wire and hear what became of it. A send that has not
   * settled in SEND_WAIT_MS is taken as gone — and if it then turns out not to
   * have gone, `late` is told, so what it carried is sent again.
   */
  private sendNow(line: LiveLine, late?: () => void): SendResult | Promise<SendResult> {
    // A seat's hand says so on every line of its own — never on a copy it hands on.
    if (this.seat && line.participant === this.me && !line.via) line.seat = true;
    let r: unknown;
    try { r = this.transport.send(line); } catch { return { ok: false, status: 0 }; }
    if (!isThenable(r)) return resultOf(r);
    return new Promise<SendResult>((done) => {
      let settled = false;
      const timer = setTimeout(() => { settled = true; done({ ok: true }); }, SEND_WAIT_MS);
      (timer as unknown as { unref?: () => void }).unref?.();
      const heard = (res: SendResult) => {
        if (settled) { if (!res.ok && late) late(); return; }
        settled = true;
        clearTimeout(timer);
        done(res);
      };
      (r as Promise<unknown>).then((v) => heard(resultOf(v)), () => heard({ ok: false, status: 0 }));
    });
  }

  /** What the room answered to a line that was not MY log: a name another hand holds, or a key it will not take, is said. */
  private heardBack(r: SendResult): void {
    if (r.ok) return;
    if (r.status === 409) this.stop('claim');
    else if (r.status === 401 || r.status === 403) this.refuse(r.status);
  }

  private refuse(status: number): void {
    if (!this.refused) this.refused = { relay: 'refused', room: this.room, status };
    this.notify('', []);
  }

  private stop(why: 'claim' | 'unreadable'): void {
    if (this.stopped) return;
    this.stopped = why;
    if (this.retryCancel) { this.retryCancel(); this.retryCancel = null; }
    this.notify('', []);
  }

  /**
   * Send what MY log owes the room, after whatever is leaving: worked out when
   * it goes, from what the room is known to hold — so a line that failed is
   * sent again with what was written since, never left as a hole. While a send
   * again is waiting its time, nothing goes before it (`resend` lets it go).
   */
  private flushMine(): Promise<void> {
    if (this.retryCancel) return Promise.resolve();
    return this.enqueue(() => (this.retryCancel ? undefined : this.sendMine()));
  }

  private sendMine(): void | Promise<void> {
    for (let n = 0; n < 100_000; n++) {
      if (this.stopped || (this.refused && this.refused.status !== 503)) return undefined;
      const next = this.nextOfMine();
      if (!next) return undefined;
      const late = () => { this.needFull = true; this.scheduleRetry(0); };
      const r = this.sendNow(next.line, late);
      if (isThenable(r)) return r.then((res) => (this.settleMine(next, res) ? this.sendMine() : undefined));
      if (!this.settleMine(next, r)) return undefined;
    }
    return undefined;
  }

  /** The next line my log owes the room: the whole of it (in pieces, the first a `full`), or what follows what the room holds. */
  private nextOfMine(): MineLine | null {
    const log = this.logs[this.me];
    if (this.needFull) {
      const { events, upto } = this.piece(log, 0);
      return { line: { participant: this.me, events, at: this.stamp(), full: true, sid: this.sitting }, upto, full: true, gen: this.mineGen };
    }
    while (this.confirmed < log.length) {
      const { events, upto } = this.piece(log, this.confirmed);
      // Only events no line can carry, already said: the room is owed nothing of them.
      if (!events.length) { this.confirmed = upto; continue; }
      return { line: { participant: this.me, events, at: this.stamp(), sid: this.sitting }, upto, full: false, gen: this.mineGen };
    }
    return null;
  }

  /** Events of `log` from `from`, up to `lineChars` of them as text (at least one), past any no line can carry. */
  private piece(log: readonly SessionEvent[], from: number): { events: SessionEvent[]; upto: number } {
    const events: SessionEvent[] = [];
    let size = 0;
    let i = from;
    for (; i < log.length; i++) {
      const ev = log[i];
      if (this.tooBig.has(ev)) continue;
      const n = charsOf(ev) + 1;
      if (events.length && size + n > this.lineChars) break;
      events.push(ev);
      size += n;
    }
    return { events, upto: i };
  }

  /** What became of a line of my log; whether to go on sending. */
  private settleMine(next: MineLine, r: SendResult): boolean {
    if (r.ok) {
      if (next.gen === this.mineGen) {
        this.confirmed = Math.max(next.full ? 0 : this.confirmed, next.upto);
        if (next.full) this.needFull = false;
      }
      this.backoff = 0;
      if (this.failing) { this.failing = null; this.notify('', []); }
      return true;
    }
    const status = r.status || 0;
    if (status === 413) {
      // Too large: a line of several events is cut finer; one event alone no line can carry, and it is let go of, and said.
      if (next.line.events.length > 1) { this.lineChars = Math.max(1, Math.floor(this.lineChars / 2)); return true; }
      const ev = next.line.events[0];
      if (ev && !this.tooBig.has(ev)) {
        this.tooBig.add(ev);
        this.tooBigSaid = { n: this.tooBigSaid.n + 1, chars: Math.max(this.tooBigSaid.chars, charsOf(ev)) };
        this.notify('', []);
      }
      return true;
    }
    if (status === 409) { this.stop('claim'); return false; }
    if (status === 401 || status === 403) { this.refuse(status); return false; }
    if (status === 400) { this.stop('unreadable'); return false; }
    // No answer, a relay in trouble, or one asking for a moment: sent again. An event with no authorship can be
    // told from its copy by nothing, so a stretch of them is sent again whole, never twice as an append.
    if (!next.full && next.line.events.some((e) => authorKey(e) === null)) this.needFull = true;
    if (!this.failing || this.failing.status !== status) { this.failing = { status }; this.notify('', []); }
    this.scheduleRetry(status === 429 && r.retryAfter ? r.retryAfter * 1000 : 0);
    return false;
  }

  /** Send again after `ms`, or after the next wait of the backoff — 2 s, doubling to 30 s. */
  private scheduleRetry(ms: number): void {
    if (this.closed || this.stopped) return;
    if (this.retryCancel) this.retryCancel();
    const wait = ms > 0 ? ms : (this.backoff = this.backoff ? Math.min(RETRY_MAX_MS, this.backoff * 2) : RETRY_FIRST_MS);
    const cancel = this.later(() => {
      if (this.retryCancel === cancel) this.retryCancel = null;
      void this.flushMine();
    }, wait);
    this.retryCancel = cancel;
  }

  /**
   * Answer a hello — each log once (V1-PLAN §9 R4d). My own log, at once:
   * every hand answers for its own. A copy of another hand's log only when
   * that hand cannot answer for itself: at once when it said goodbye, else
   * after `COVER_WAIT_MS`, when it has stayed silent — and only if no copy has
   * gone from another hand by then. The hands that hold a copy go in the order
   * of their names, `COVER_STAGGER_MS` apart, so the first one's copy is heard
   * by the rest and they send none. The asker's own log is never handed back.
   * `ownOnly`: a hello from a second hand under my own name, which only needs
   * to hear that I am here.
   */
  private answer(asker: string, ownOnly = false): void {
    // My own log, whole — sent as my log always is, so an answer the room did not take is sent again.
    this.needFull = true;
    void this.flushMine();
    if (ownOnly) return;
    const asked = this.heard;
    const copies = Object.keys(this.logs).filter((n) => n !== this.me && n !== asker && this.applied.has(n));
    if (!copies.length) return;
    // Who could hand a copy on: the hands whose logs are held here and have
    // not said goodbye, and this one. Every holder counts the same hands, so
    // each has its own place in the order.
    const hands = [...new Set(Object.keys(this.logs).concat(this.me))].filter((n) => n === this.me || (!this.gone.has(n) && n !== asker)).sort();
    const place = hands.indexOf(this.me) * COVER_STAGGER_MS;
    this.cover(copies.filter((n) => this.gone.has(n)), asked, place);
    this.cover(copies.filter((n) => !this.gone.has(n)), asked, COVER_WAIT_MS + place);
  }

  /** Hand on each of `names` after `ms`, unless its writer or another hand has answered for it since the hello. */
  private cover(names: string[], asked: number, ms: number): void {
    if (!names.length) return;
    const go = () => {
      for (const name of names) {
        if ((this.fromWriter.get(name) ?? -1) > asked || (this.fromCopy.get(name) ?? -1) > asked) continue;
        const at = this.applied.get(name);
        if (at === undefined) continue;
        const line: LiveLine = { participant: name, events: this.logs[name].slice(), at, full: true, via: this.me };
        const sid = this.sittings.get(name);
        if (sid) line.sid = sid;
        void this.post(line);
      }
    };
    if (ms <= 0) {
      go();
      return;
    }
    const cancel = this.later(() => {
      this.waiting.delete(cancel);
      if (!this.closed) go();
    }, ms);
    this.waiting.add(cancel);
  }

  private collide(name: string, sentence: string): void {
    if (this.collided.has(name)) return;
    this.collided.set(name, sentence);
    this.notify(name, []);
  }

  private receive(raw: LiveLine | RelayNotice | RelayRefusal | null | undefined): void {
    if (this.closed || !raw || typeof raw !== 'object') return;
    if ((raw as RelayRefusal).relay === 'refused') {
      const r = raw as RelayRefusal;
      this.refused = { relay: 'refused', room: r.room, status: Number(r.status) || 0, ...(r.reason === 'origin' ? { reason: 'origin' as const } : {}) };
      this.notify('', []);
      return;
    }
    if ((raw as RelayNotice).relay === 'truncated') {
      const n = raw as RelayNotice;
      this.truncated = { relay: 'truncated', room: n.room, dropped: Math.max(0, Number(n.dropped) || 0), kept: n.kept };
      this.notify('', []);
      return;
    }
    const line = raw as LiveLine;
    if (typeof line.participant !== 'string') return;
    // A log I handed on in answer to a hello, come back from a relay: it is my
    // own copy, and there is nothing in it I do not hold.
    if (line.via === this.me) return;
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
      if (line.hello) this.answer(line.participant, true);
      return;
    }
    this.heard++;
    if (from !== this.me) this.seen.set(from, Date.now());
    // A hand that answers briefs at the seat, said by itself — a copy handed on says nothing of its writer.
    if (!line.via && line.seat === true) this.seats.add(line.participant);
    if (sid) {
      const known = this.sittings.get(line.participant);
      if (known === undefined) this.sittings.set(line.participant, sid);
      else if (known !== sid) {
        // Keep what was heard first — refusing is the only answer that cannot
        // lose work — and say so.
        this.collide(line.participant, `two hands are both called "${line.participant}" — the one heard first is kept and the other's lines are refused; reload one to give it a new name`);
        if (line.hello) this.answer('');
        return;
      }
    }
    if (line.bye) {
      // A hand leaving. Its log stays held; it is only no longer here to
      // answer for it — and no longer here.
      if (!line.via) {
        this.gone.add(line.participant);
        this.seen.delete(line.participant);
        this.seats.delete(line.participant);
      }
      this.notify(line.participant, []);
      return;
    }
    // Who answered for this log, and when: its writer, or a copy another hand handed on.
    if (line.via) this.fromCopy.set(line.participant, this.heard);
    else {
      this.fromWriter.set(line.participant, this.heard);
      this.gone.delete(line.participant);
    }
    if (line.hello) {
      // Answered with each log once, so the newcomer has what a pull would give.
      this.answer(line.participant);
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
      // The writer's own whole log is judged against the writer's own lines alone, so a copy — whatever clock it
      // claims — can never hold back the writer's undo; a copy is judged against everything applied.
      const last = line.via ? this.applied.get(line.participant) : this.ownAt.get(line.participant);
      if (last !== undefined && at < last) return;
      const held = this.logs[line.participant];
      // A copy handed on may only ADD to what is held: one that leaves out a mark held here — a forged one, a
      // stale one — would take that mark away on this board. Refused, and said once. Its writer's own whole log
      // still replaces whatever is held: that is how an undo reaches every peer.
      if (line.via && held && held.length && !accountsFor(held, events)) {
        if (!this.copiesRefused.has(line.participant)) { this.copiesRefused.add(line.participant); this.notify('', []); }
        return;
      }
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
      // rewrote it, and what it sends is what it holds. What it holds is most
      // often what is held here already — every answer to a hello is a whole
      // log — and then nothing changes; a whole log that only runs on past
      // what is held is taken as the append it amounts to.
      const was = held ? prefixOf(held, events) : -1;
      if (held && was === held.length) {
        if (events.length > held.length) {
          const keys = this.carried.get(line.participant) ?? new Set<string>();
          this.carried.set(line.participant, keys);
          for (let i = held.length; i < events.length; i++) {
            const k = authorKey(events[i]);
            if (k !== null) keys.add(k);
            this.number(line.participant, held.length, events[i]);
            held.push(events[i]);
          }
          this.rev++;
        }
      } else {
        this.unnumber(line.participant);
        this.logs[line.participant] = events.slice();
        this.logs[line.participant].forEach((ev, i) => this.number(line.participant, i, ev));
        this.carried.set(line.participant, new Set(events.map(authorKey).filter((k): k is string => k !== null)));
        // A newcomer's empty log, where none was held, changes no board.
        if (held || events.length) this.rev++;
      }
    } else {
      // An event already held — one a newcomer was handed in a peer's copy
      // before the writer's own line reached it — is held once. Only an event
      // with authorship can be known twice; one written before it is taken as
      // it comes.
      const log = (this.logs[line.participant] ??= []);
      let keys = this.carried.get(line.participant);
      if (!keys) this.carried.set(line.participant, (keys = new Set()));
      let added = 0;
      for (const ev of events) {
        const k = authorKey(ev);
        if (k !== null) {
          if (keys.has(k)) continue;
          keys.add(k);
        }
        this.number(line.participant, log.length, ev);
        log.push(ev);
        added++;
      }
      if (added) this.rev++;
    }
    this.applied.set(line.participant, Math.max(this.applied.get(line.participant) ?? 0, at));
    if (!line.via) this.ownAt.set(line.participant, Math.max(this.ownAt.get(line.participant) ?? 0, at));
    this.notify(line.participant, events);
  }

  /**
   * Hold an event under its authorship, and say it when a DIFFERENT event is
   * already held under the same one: two writers under one name (L1b). Which
   * is kept is the merge's rule — the reader's own log first, else the first
   * in the merge's order — so the sentence is the one the merge would say.
   */
  private number(name: string, i: number, ev: SessionEvent): void {
    const k = eventAuthorship(ev);
    if (k === null) return;
    const mine = { name, i, ev };
    const list = this.numbered.get(k);
    if (!list) {
      this.numbered.set(k, [mine]);
      return;
    }
    const origin = ev.origin as string;
    for (const other of list) {
      if (this.misnumbered.has(origin)) break;
      if (sameEvent(other.ev, ev)) continue;
      const [kept, dropped] = this.keeps(other, mine) ? [other, mine] : [mine, other];
      this.misnumbered.set(origin, describeAuthorshipCollision({ origin, seq: ev.seq as number, kept: kept.name, dropped: dropped.name }));
    }
    list.push(mine);
  }

  /** A log's events, no longer held under their authorship: it is about to be replaced. */
  private unnumber(name: string): void {
    for (const ev of this.logs[name] ?? []) {
      const k = eventAuthorship(ev);
      if (k === null) continue;
      const list = this.numbered.get(k);
      if (!list) continue;
      const rest = list.filter((x) => x.name !== name);
      if (rest.length) this.numbered.set(k, rest);
      else this.numbered.delete(k);
    }
  }

  /** Whether the merge keeps `a` over `b`, two copies of one authorship: the reader's own, else the first in the merge's order. */
  private keeps(a: { name: string; i: number; ev: SessionEvent }, b: { name: string; i: number; ev: SessionEvent }): boolean {
    if ((a.name === this.me) !== (b.name === this.me)) return a.name === this.me;
    const ta = atOf(a.ev), tb = atOf(b.ev);
    if (ta !== tb) return ta < tb;
    if (a.name !== b.name) return a.name < b.name;
    return a.i < b.i;
  }

  private notify(participant: string, events: SessionEvent[]): void {
    for (const l of this.listeners) l(participant, events);
  }
}

/** A line of MY log on its way: the line, how far into my log it reaches, whether it is whole, and which log it was of. */
interface MineLine {
  line: LiveLine;
  upto: number;
  full: boolean;
  gen: number;
}

const isThenable = (r: unknown): r is Promise<unknown> => !!r && typeof (r as { then?: unknown }).then === 'function';

/** What a transport's answer says: a `SendResult` as it is, anything else a line that went. */
function resultOf(v: unknown): SendResult {
  if (v && typeof v === 'object' && typeof (v as SendResult).ok === 'boolean') {
    const r = v as SendResult;
    const out: SendResult = { ok: r.ok, status: Number(r.status) || 0 };
    if (Number(r.retryAfter) > 0) out.retryAfter = Number(r.retryAfter);
    return out;
  }
  return { ok: true };
}

/** An event's length as the text a line carries it in, measured once per event. */
const sizes = new WeakMap<object, number>();
function charsOf(ev: SessionEvent): number {
  let n = sizes.get(ev);
  if (n === undefined) {
    n = JSON.stringify(ev).length;
    sizes.set(ev, n);
  }
  return n;
}

/** Characters as megabytes, in words. */
const mb = (chars: number) => (chars / 1e6).toFixed(1) + ' MB';

/** Whether `incoming` holds every event of `held`, in the same order — so taking it in place of `held` only adds. */
function accountsFor(held: readonly SessionEvent[], incoming: readonly SessionEvent[]): boolean {
  let j = 0;
  for (const ev of held) {
    while (j < incoming.length && !sameAt(ev, incoming[j])) j++;
    if (j >= incoming.length) return false;
    j++;
  }
  return true;
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

/** A hand's log as it stands: see `LiveStore.ownLog`. */
export function ownLog(sent: readonly SessionEvent[], events: readonly SessionEvent[]): SessionEvent[] {
  const own = events.filter((e) => !e.by);
  const objects = new Set<SessionEvent>(own);
  const byKey = new Map<string, SessionEvent>();
  let words: Map<string, SessionEvent> | null = null;
  for (const e of own) {
    const k = authorKey(e);
    if (k !== null) byKey.set(k, e);
  }
  const taken = new Set<SessionEvent>();
  const out: SessionEvent[] = [];
  for (const e of sent) {
    let now: SessionEvent | undefined;
    if (objects.has(e)) now = e;
    else {
      const k = authorKey(e);
      if (k !== null) now = byKey.get(k);
      else {
        if (!words) {
          words = new Map();
          for (const x of own) if (authorKey(x) === null) words.set(eventKey(x), x);
        }
        now = words.get(eventKey(e));
      }
    }
    if (now && !taken.has(now)) {
      taken.add(now);
      out.push(now);
    }
  }
  for (const e of own) if (!taken.has(e)) out.push(e);
  return out;
}

/** Whether two events in the same place of one log are one event: the same object, or the same authorship (or, with none, the same words). */
function sameAt(a: SessionEvent, b: SessionEvent): boolean {
  return a === b || (a.type === b.type && eventKey(a) === eventKey(b));
}

/** Whether `now` is `sent` with events added after it and nothing before them changed. */
function extendsLog(sent: readonly SessionEvent[], now: readonly SessionEvent[]): boolean {
  if (now.length < sent.length) return false;
  for (let i = 0; i < sent.length; i++) if (!sameAt(sent[i], now[i])) return false;
  return true;
}

/** How many of `held`'s events `incoming` begins with. `held.length` when it begins with all of them. */
function prefixOf(held: readonly SessionEvent[], incoming: readonly SessionEvent[]): number {
  const n = Math.min(held.length, incoming.length);
  let i = 0;
  while (i < n && sameAt(held[i], incoming[i])) i++;
  return i;
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
