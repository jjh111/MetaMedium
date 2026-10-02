// A room of hands, for holding a live room's merge to the full merge
// (V1-PLAN §9 R4d, the oracle).
//
// The surface merges a room as each line lands. Whatever it does to be quick,
// the board it arrives at must be the one `mergeLogs` + a replay from zero
// would give — for EVERY order the lines could arrive in. Three hand-written
// cases cannot say that, so this room generates them: hands that draw, write,
// undo, name things, answer, erase, move and reshape, tie a line's end to
// another mark's site and move that mark so the line follows it (V1-PLAN E2),
// whose clocks disagree by seconds; hands that leave, arrive late, and come
// back under another name;
// a newcomer whose first marks were drawn before it had a log name; and a wire
// that delivers each sender's lines in the order they were sent, the senders
// interleaved as the seed decides, now and then handing a hand a stretch of
// lines it already heard, as a relay does when a stream reconnects.
//
// Two readers stand in the same place in the room and hear every line in the
// same order: the REFERENCE, which does what the surface did before R4d (the
// whole log merged and replayed from zero on every line), and the path UNDER
// TEST. After every merge each is checked against the oracle — `mergeLogs` of
// the logs its store holds and its own unstamped events, and a fresh session's
// replay of that — and against each other: the same events, the same state,
// the same lines sent. Deterministic: the same seed is the same room.
//
// Undo is per hand (V1-PLAN L2j). The room keeps every hand's writing beside
// its session, as it saw it happen and independently of the engine (`Writing`):
// every act in the order it was written — one per event, or all of a tool's
// act (`withTool`) as one. Every undo, the reader's and every other hand's, is
// held to it: exactly that hand's last act is taken back and nothing else on
// its board moves, whatever the merge put last; the reader's own log
// (`ownLog`) is always its writing, in the order written; and once another
// board holds the log that no longer carries the act, that board holds none
// of it.

import { createSession, DEFAULT_SESSION_CONFIG, type Session, type SessionEvent } from '../session/session';
import { LOCAL_PARTICIPANT, getRep, resemblances } from '../session/nodes';
import { handlesOf } from '../session/handles';
import { magnetSites } from '../session/magnets';
import { LiveStore, type LiveLine, type LiveTransport, type RelayNotice } from '../store/live';
import { mergeLogs } from '../store/merge';
import { LiveMerge, type MergeReport } from '../store/livemerge';
import { rng, rectStroke, circleStroke, lineStroke } from './strokes';
import type { Point } from '../types';

type Heard = (line: LiveLine | RelayNotice) => void;

interface Member {
  id: string;
  /** Lines waiting for this member, per sender, in the order they were sent. */
  inbox: Map<string, string[]>;
  /** Lines already delivered to this member, per sender (a reconnect replays a stretch of them). */
  heard: Map<string, string[]>;
  listeners: Heard[];
}

/**
 * The room's wire. A line sent by one member waits in every other member's
 * inbox until the scenario delivers it: each sender's lines in order, the
 * senders in any interleaving.
 */
export class Wire {
  private members = new Map<string, Member>();

  join(id: string): void {
    if (!this.members.has(id)) this.members.set(id, { id, inbox: new Map(), heard: new Map(), listeners: [] });
  }

  leave(id: string): void {
    this.members.delete(id);
  }

  /** A transport for a member: what it sends reaches everyone else; `tap` also sees it. */
  transport(id: string, tap?: (line: LiveLine) => void, send = true): LiveTransport {
    this.join(id);
    return {
      send: (line) => {
        if (tap) tap(JSON.parse(JSON.stringify(line)) as LiveLine);
        if (send) this.post(id, line);
      },
      onMessage: (cb) => {
        const m = this.members.get(id);
        if (!m) return () => {};
        m.listeners.push(cb);
        return () => {
          m.listeners = m.listeners.filter((l) => l !== cb);
        };
      },
    };
  }

  private post(from: string, line: LiveLine): void {
    const text = JSON.stringify(line);
    for (const m of this.members.values()) {
      if (m.id === from) continue;
      const q = m.inbox.get(from) ?? [];
      q.push(text);
      m.inbox.set(from, q);
    }
  }

  /** Senders with a line waiting at `to`. */
  waiting(to: string): string[] {
    const m = this.members.get(to);
    if (!m) return [];
    return [...m.inbox.entries()].filter(([, q]) => q.length).map(([from]) => from).sort();
  }

  pending(): number {
    let n = 0;
    for (const m of this.members.values()) for (const q of m.inbox.values()) n += q.length;
    return n;
  }

  /** Deliver the next line from `from` to `to`. Every listener gets its own copy, as separate readers would. */
  deliver(to: string, from: string): LiveLine | null {
    const m = this.members.get(to);
    const q = m?.inbox.get(from);
    if (!m || !q || !q.length) return null;
    const text = q.shift()!;
    const h = m.heard.get(from) ?? [];
    h.push(text);
    m.heard.set(from, h);
    for (const l of m.listeners.slice()) l(JSON.parse(text));
    return JSON.parse(text) as LiveLine;
  }

  /** Hand `to` the last `k` lines it already heard from `from` again, in order — a stream that reconnected. */
  redeliver(to: string, from: string, k: number): number {
    const m = this.members.get(to);
    const h = m?.heard.get(from);
    if (!m || !h || !h.length) return 0;
    const again = h.slice(-k);
    for (const text of again) for (const l of m.listeners.slice()) l(JSON.parse(text));
    return again.length;
  }

  /** Senders `to` has heard from. */
  heardFrom(to: string): string[] {
    const m = this.members.get(to);
    return m ? [...m.heard.entries()].filter(([, h]) => h.length).map(([from]) => from).sort() : [];
  }

  /** The relay's word that the room has outlived its buffer. */
  notice(to: string, dropped: number): void {
    const m = this.members.get(to);
    if (!m) return;
    for (const l of m.listeners.slice()) l({ relay: 'truncated', room: 'r', dropped, kept: 10 });
  }
}

/**
 * The room's time, for everything in it that waits: a store's `later` runs
 * when the room's clock passes it, in the order it fell due — so a room with
 * copies waiting to be handed on is as deterministic as one without.
 */
export class Clock {
  private queue: { due: number; n: number; fn: () => void; live: boolean }[] = [];
  private n = 0;
  constructor(public now: number) {}

  later = (fn: () => void, ms: number): (() => void) => {
    const t = { due: this.now + ms, n: this.n++, fn, live: true };
    this.queue.push(t);
    return () => { t.live = false; };
  };

  /** Move the clock on to `to`, running what falls due on the way. How many ran. */
  advance(to: number): number {
    let ran = 0;
    for (;;) {
      let next: (typeof this.queue)[number] | null = null;
      for (const t of this.queue) if (t.live && t.due <= to && (!next || t.due < next.due || (t.due === next.due && t.n < next.n))) next = t;
      if (!next) break;
      next.live = false;
      this.now = Math.max(this.now, next.due);
      next.fn();
      ran++;
    }
    this.queue = this.queue.filter((t) => t.live);
    this.now = Math.max(this.now, to);
    return ran;
  }
}

/** A session's own events: what it wrote, never what it merged in (those carry `by`). */
export const unstamped = (s: Session): SessionEvent[] => s.getEvents().filter((e) => !e.by);

/** An event's identity, for the room's bookkeeping: its authorship, or what it says when it has none. */
export function idOf(e: SessionEvent): string {
  if (typeof e.origin === 'string' && e.origin && typeof e.seq === 'number') return `${e.origin}#${e.seq}`;
  const { by: _by, ...rest } = e;
  void _by;
  return JSON.stringify(rest);
}

/**
 * A hand's writing as the room saw it happen, kept beside its session and
 * independently of the engine (V1-PLAN L2j): every act in the order it was
 * written, each as the identities of its events — one act per event, or one
 * for everything a tool wrote inside one `withTool`. What an undo must take
 * back is the last of these.
 */
export class Writing {
  readonly acts: string[][] = [];
  private known = new Set<string>();

  /**
   * Note what the session wrote since the last look: one act per event, or
   * one for everything written as one act — a tool's whole act, or a door
   * that writes several events at once (a connector moved whole lets go of
   * the sites it no longer sits on, E2) — which the events say by sharing
   * an `act` number (L2j).
   */
  note(s: Session, kind: string | null): void {
    const fresh = unstamped(s).filter((e) => e.type !== 'tick' && !this.known.has(idOf(e)));
    if (!fresh.length) return;
    for (const e of fresh) this.known.add(idOf(e));
    if (kind === 'tool') {
      this.acts.push(fresh.map(idOf));
      return;
    }
    let open: { act: number; keys: string[] } | null = null;
    for (const e of fresh) {
      if (typeof e.act === 'number' && open && open.act === e.act) {
        open.keys.push(idOf(e));
        continue;
      }
      const keys = [idOf(e)];
      this.acts.push(keys);
      open = typeof e.act === 'number' ? { act: e.act, keys } : null;
    }
  }

  /** Every event, in the order written. */
  order(): string[] {
    return this.acts.flat();
  }

  /** The act an undo takes back, taken off the record. */
  pop(): string[] {
    const a = this.acts.pop() ?? [];
    for (const k of a) this.known.delete(k);
    return a;
  }
}

/**
 * An undo, held to the rule (V1-PLAN L2j): what it takes back is exactly this
 * hand's last act as the room saw it written, and nothing else on the board
 * moves — every other hand's event still stands, in the order it stood. Says
 * what went wrong, or null.
 */
export function undoHeld(s: Session, w: Writing, count: (k: string) => void): string | null {
  const before = s.getEvents().slice();
  const want = w.acts[w.acts.length - 1] ?? [];
  const wanted = new Set(want);
  const own = new Set(before.filter((e) => !e.by).map(idOf));
  if (want.some((k) => !own.has(k))) return `the room's record of this hand's writing names ${want.find((k) => !own.has(k))}, which its board does not hold`;
  // What undo took before L2j: the last event on the board, whoever's.
  let top = before.length - 1;
  while (top >= 0 && before[top].type === 'tick') top--;
  if (top >= 0 && before[top].by) count("an undo with another hand's event last on the board");
  else if (top >= 0 && !wanted.has(idOf(before[top]))) count("an undo whose act the merge did not put last");
  if (want.length > 1) count("an undo of a tool's act");
  s.undo();
  w.pop();
  const after = s.getEvents();
  const kept = before.filter((e) => e.by || !wanted.has(idOf(e)));
  const same = after.length === kept.length && after.every((e, i) => idOf(e) === idOf(kept[i]) && e.by === kept[i].by);
  if (same) return null;
  const gone = before.filter((e) => !after.some((x) => idOf(x) === idOf(e) && x.by === e.by)).map((e) => idOf(e) + (e.by ? ' by ' + e.by : ''));
  return `undo took back [${gone.join(', ')}], not this hand's last act [${want.join(', ')}]`;
}

/**
 * Whether a board that holds `writer`'s log without an undone act holds none
 * of that act — it may still, only as a copy another log carries. Null while
 * the log it holds still carries the act (the undo has not reached it), else
 * what it found.
 */
function undoReached(s: Session, held: Readonly<Record<string, readonly SessionEvent[]>>, writer: string, keys: readonly string[]): 'gone' | 'a copy' | 'still held' | null {
  const log = held[writer];
  if (!log) return null;
  const set = new Set(keys);
  if (log.some((e) => set.has(idOf(e)))) return null;
  if (!s.getEvents().some((e) => set.has(idOf(e)))) return 'gone';
  for (const [name, other] of Object.entries(held)) if (name !== writer && other.some((e) => set.has(idOf(e)))) return 'a copy';
  return 'still held';
}

/**
 * Whether two values say the same thing: plain JSON first (both sides build
 * their objects the same way, so it almost always settles it, fast), and JSON
 * with its keys in a fixed order when it does not.
 */
export function same(a: unknown, b: unknown): boolean {
  return JSON.stringify(a) === JSON.stringify(b) || canonical(a) === canonical(b);
}

/** JSON with keys in a fixed order, so two objects built in different orders compare as what they say. */
export function canonical(v: unknown): string {
  if (v === null || typeof v !== 'object') return JSON.stringify(v) ?? 'null';
  if (v instanceof Map) return canonical([...v.entries()]);
  if (v instanceof Set) return canonical([...v.values()]);
  if (Array.isArray(v)) return '[' + v.map((x) => canonical(x)).join(',') + ']';
  const o = v as Record<string, unknown>;
  const keys = Object.keys(o).filter((k) => o[k] !== undefined).sort();
  return '{' + keys.map((k) => JSON.stringify(k) + ':' + canonical(o[k])).join(',') + '}';
}

/**
 * Everything a board shows, as one string: the state a replay derives — every
 * node in the order it was made, the planes, the candidates, this hand's
 * gestures — less `generation`, which counts how often the board was
 * REPLACED and is no function of the log.
 */
export function stateKey(s: Session): string {
  const st = s.getState();
  // Plain JSON: every node is built by the same code whichever way it was
  // reached, so the keys come in the same order, and this is the hot part.
  return JSON.stringify({ ...st, generation: 0, nodes: [...st.nodes.values()] });
}

/** Another hand in the room. It keeps its board the reference way — every line merged and replayed whole. */
export class RemoteHand {
  readonly session: Session;
  store: LiveStore;
  member: string;
  alive = true;
  /** Whether a line landed since this hand last merged: it merges before it next acts, as a tab would have by then. */
  stale = false;
  /** How far this hand's clock is from the room's. */
  skew: number;
  /** What this hand wrote, act by act, as the room saw it (L2j). */
  readonly writing = new Writing();
  /** The reader's undos this hand has not yet heard: once it holds the reader's log without one, its board must hold none of it. */
  readonly awaiting: string[][] = [];
  private joins = 0;

  constructor(private wire: Wire, public name: string, skew: number, readonly sitting: string, private clock: Clock, opts: { unnamedFirst?: boolean } = {}) {
    this.skew = skew;
    // A newcomer may have drawn before it had a log name (a shard tab before
    // it joined): its first marks carry no authorship and mint by counter.
    this.session = opts.unnamedFirst ? createSession() : createSession({ ...DEFAULT_SESSION_CONFIG, logName: name });
    this.member = `${name}#${this.joins}`;
    this.store = new LiveStore(this.wire.transport(this.member), name, 'r', { sitting, later: this.clock.later });
  }

  mine(): SessionEvent[] {
    return unstamped(this.session);
  }

  /** The reference merge: every log, merged and replayed from zero. */
  async merge(): Promise<void> {
    this.stale = false;
    const logs = await this.store.readLogs();
    this.session.load(mergeLogs({ ...logs, [this.name]: this.mine() }, { me: this.name }));
  }

  /** The board as this hand sees it before it acts. */
  async ready(): Promise<Session> {
    if (this.stale) await this.merge();
    return this.session;
  }

  async publish(): Promise<void> {
    await this.store.publish(this.mine());
  }

  /** Into the room: a name for the log, my log as it stands, and a hello. */
  async enter(): Promise<void> {
    this.session.setLogName(this.name);
    await this.publish();
    this.store.hello();
  }

  leave(): void {
    this.alive = false;
    this.store.close();
    this.wire.leave(this.member);
  }

  /** Back in the room under another name, in the same sitting — a tab whose person changed their name. */
  async rename(name: string): Promise<void> {
    this.store.close();
    this.wire.leave(this.member);
    this.joins++;
    this.name = name;
    this.member = `${name}#${this.joins}`;
    this.store = new LiveStore(this.wire.transport(this.member), name, 'r', { sitting: this.sitting, later: this.clock.later });
    await this.enter();
  }
}

/** A reader under test: its session, its store, and whatever its path keeps. */
export interface LocalHand {
  readonly label: string;
  readonly session: Session;
  readonly store: LiveStore;
  readonly me: string;
  /** Every line this hand's store sent, as sent. */
  readonly sent: LiveLine[];
  /** The path's own memory. */
  x: Record<string, unknown>;
  /** How many times the session has told its subscribers it changed. */
  notified: number;
}

/** What a surface does in a room: join it, merge when its store says a line landed, and say what its log is. */
export interface RoomPath {
  readonly label: string;
  join(h: LocalHand): Promise<void>;
  /** What the surface does when its store says something happened. Whether it merged. */
  merge(h: LocalHand): Promise<boolean>;
  mine(h: LocalHand): SessionEvent[];
  /** What the path did since it was last asked, one word a merge — for the counts. */
  did?(h: LocalHand): string[];
}

/**
 * The surface before R4d (Demos/surface/17-folder.js at e1f5349): `openLive`
 * publishes the board it is on and loads the merged room (`openStore`);
 * `mergeLive` reads every log, finds this hand's own events by serialising
 * every loaded one (`myLogNow`), merges, and loads — a replay from zero — on
 * every notify of the store, events or not; `saveNow` publishes `myLogNow()`.
 */
export const fullReplayPath: RoomPath = {
  label: 'the whole log merged and replayed on every line (before R4d)',
  async join(h) {
    h.session.setLogName(h.me);
    await h.store.publish(h.session.getEvents().filter((e) => !e.by));
    const logs = await h.store.readLogs();
    const merged = mergeLogs(logs, { me: h.me });
    h.x.myPrevious = (logs[h.me] || []).slice();
    h.session.load(merged);
    h.x.loadedCount = h.session.getEvents().length;
    h.store.hello();
  },
  async merge(h) {
    const logs = await h.store.readLogs();
    const mine = myLogNow(h);
    const merged = mergeLogs({ ...logs, [h.me]: mine }, { me: h.me });
    h.session.load(merged);
    h.x.myPrevious = mine;
    h.x.loadedCount = merged.length;
    h.store.notices();
    return true;
  },
  mine: (h) => myLogNow(h),
};

/**
 * The reference for R4d's path: the whole log merged and replayed from zero,
 * exactly as before — but only when a log the store holds changed, which is
 * when R4d's path merges too. So the two differ in how they merge, never in
 * when, and a local act between lines (a mark drawn, an undo) meets the same
 * board in both.
 */
export const fullReplayOnChangePath: RoomPath = {
  label: 'the whole log merged and replayed when a log changed (the reference)',
  async join(h) {
    await fullReplayPath.join(h);
    h.x.revision = h.store.revision();
  },
  async merge(h) {
    const rev = h.store.revision();
    if (rev === h.x.revision) {
      h.store.notices();
      return false;
    }
    h.x.revision = rev;
    return fullReplayPath.merge(h);
  },
  mine: (h) => myLogNow(h),
};

/**
 * The surface since R4d (Demos/surface/17-folder.js): `openLive` as before —
 * the room's logs merged and loaded once, the board replaced — then a
 * `LiveMerge` holds the merge between lines. On every notify the store says
 * whether a log changed (`revision`); only then is the merge brought up to
 * the logs as held (`heldLogs`), which hands the session what changed. This
 * hand's log is the session's own unstamped events in the order they were
 * written (`LiveStore.ownLog`).
 */
export const liveMergePath: RoomPath = {
  label: 'the merge kept standing, a line applied (R4d)',
  async join(h) {
    h.session.setLogName(h.me);
    await h.store.publish(unstamped(h.session));
    const logs = await h.store.readLogs();
    h.session.load(mergeLogs(logs, { me: h.me }));
    const merge = new LiveMerge(h.session, h.me);
    merge.sync(h.store.heldLogs());
    h.x.merge = merge;
    h.x.revision = h.store.revision();
    h.x.reports = [] as MergeReport[];
    h.store.hello();
  },
  async merge(h) {
    const rev = h.store.revision();
    h.store.notices();
    if (rev === h.x.revision) return false;
    h.x.revision = rev;
    (h.x.reports as MergeReport[]).push((h.x.merge as LiveMerge).sync(h.store.heldLogs()));
    return true;
  },
  mine: (h) => h.store.ownLog(h.session.getEvents()),
  did(h) {
    const rs = (h.x.reports as MergeReport[]).splice(0);
    return rs.map((r) => `the merge: ${r.rebuilt ? 'read again whole, then ' : ''}${r.how === 'cut' ? (r.from === 0 ? 'replayed from zero' : 'replayed from a checkpoint') : r.how === 'append' ? 'appended' : 'nothing to hand over'}`);
  },
};

/** `myLogNow` as the surface had it: my previous events still loaded, found by their JSON, then what came after. */
function myLogNow(h: LocalHand): SessionEvent[] {
  const evs = h.session.getEvents();
  const loaded = Math.min(h.x.loadedCount as number, evs.length);
  h.x.loadedCount = loaded;
  const present = new Set(evs.slice(0, loaded).map((e) => JSON.stringify(e)));
  const kept = (h.x.myPrevious as SessionEvent[]).filter((e) => present.has(JSON.stringify(e)));
  return kept.concat(evs.slice(loaded));
}

export interface RoomOptions {
  seed: number;
  /** The path held to the oracle. */
  under: RoomPath;
  /** The path it is compared with, line by line. */
  reference?: RoomPath;
  steps?: number;
}

export interface RoomReport {
  seed: number;
  /** What differed, and where; empty when nothing did. */
  failures: string[];
  /** How many times each kind of thing happened, so a run can say what it covered. */
  counts: Record<string, number>;
}

const T0 = Date.UTC(2026, 8, 27, 9, 0, 0);
const NAMES = ['ada', 'ben', 'cyd', 'dot', 'eli', 'fay', 'gus', 'hal', 'ivy', 'jon'];

/** A small hand-drawn-ish stroke: few points, so a room of them replays in milliseconds. */
function shape(rand: () => number, x: number, y: number): Point[] {
  const k = rand();
  if (k < 0.35) return rectStroke(x, y, 60 + rand() * 90, 40 + rand() * 60, 8);
  if (k < 0.6) return circleStroke(x + 40, y + 40, 20 + rand() * 30, 24);
  if (k < 0.85) return lineStroke({ x, y }, { x: x + 40 + rand() * 120, y: y + (rand() - 0.5) * 120 }, 12);
  // A squiggle the shape rung cannot place: the start of writing.
  return [0, 1, 2, 3, 4, 5, 6].map((i) => ({ x: x + i * 3, y: y + (i % 2 ? 14 : 0) + rand() * 2 }));
}

/** A letter: small, on the band of the word it belongs to. */
function letter(rand: () => number, x: number, y: number): Point[] {
  const w = 10 + rand() * 6, h = 22 + rand() * 10;
  return [0, 1, 2, 3, 4, 5, 6, 7].map((i) => ({ x: x + (w * i) / 7, y: y + (i % 2 ? h : h * 0.2) + rand() * 1.5 }));
}

/**
 * One act by a hand on its own board, at its own clock. Returns what it did,
 * or null. An undo goes through `undo` when one is given — the room's check
 * of it (L2j) — else straight to the session.
 */
function act(s: Session, rand: () => number, at: number, kinds: string[], undo?: () => void): string | null {
  const st = s.getState();
  const content = st.contentIds;
  const pick = <T>(xs: readonly T[]): T => xs[Math.floor(rand() * xs.length)];
  const kind = pick(kinds);
  const x = 40 + rand() * 700, y = 40 + rand() * 500;
  switch (kind) {
    case 'draw':
      s.addStroke(shape(rand, x, y), at, undefined, 1);
      return 'draw';
    case 'write': {
      const n = 2 + Math.floor(rand() * 3);
      for (let i = 0; i < n; i++) s.addStroke(letter(rand, x + i * 22, y), at + i * 140, undefined, 1);
      return 'write';
    }
    case 'tool': {
      // A tool's act: several events written inside one `withTool` — one act,
      // undone in one step (L2j). Two marks, and now and then one of them moved.
      s.withTool('room:pair', () => {
        const first = s.addStroke(shape(rand, x, y), at, undefined, 1);
        s.addStroke(shape(rand, x + 170, y + 30), at, undefined, 1);
        if (rand() < 0.5 && s.getState().contentIds.includes(first)) s.move({ ids: [first], dx: 24, dy: -12, at });
      }, 'room:pair');
      return 'tool';
    }
    case 'undo':
      if (!s.getEvents().some((e) => !e.by && e.type !== 'tick')) return null;
      if (undo) undo();
      else s.undo();
      return 'undo';
    case 'bless': {
      if (content.length < 2) return null;
      const ids = [pick(content), pick(content)];
      const summon = s.summonMarks(ids, at);
      if (!summon) return null;
      s.bless({ summonId: summon, name: pick(['thing', 'molecule', 'card']), at: at + 20 });
      return 'bless';
    }
    case 'answer': {
      if (!content.length) return null;
      const id = s.answer({ participantId: LOCAL_PARTICIPANT, question: 'what is this', text: 'a mark', aboutIds: [pick(content)], at });
      return id ? 'answer' : null;
    }
    case 'erase':
      if (!content.length) return null;
      s.erase(pick(content), at);
      return 'erase';
    case 'move':
      if (!content.length) return null;
      s.move({ ids: [pick(content)], dx: (rand() - 0.5) * 80, dy: (rand() - 0.5) * 80, at });
      // A connector moved whole lets go of the sites it walked off, in the same act (E2).
      return s.lastAct().some((e) => e.type === 'unbind') ? 'move, letting go of a site' : 'move';
    case 'label': {
      if (!content.length) return null;
      return s.label({ nodeId: pick(content), text: pick(['a', 'b', 'hub']), at }) ? 'label' : null;
    }
    case 'reshape': {
      // A handle dragged (V1-PLAN E1): one of a mark's own points, let go a little way off.
      if (!content.length) return null;
      const id = pick(content);
      const n = st.nodes.get(id);
      const hs = n ? handlesOf(n, st.nodes) : [];
      if (!hs.length) return null;
      const h = pick(hs);
      const to = { x: h.point.x + (rand() - 0.5) * 80, y: h.point.y + (rand() - 0.5) * 80 };
      if (!s.reshape({ id, handle: { kind: h.kind, index: h.index }, to, at })) return null;
      // A connector's own bound end dragged off its site lets go of it, in the same act (E2).
      return s.lastAct().some((e) => e.type === 'unbind') ? 'reshape, letting go of a site' : 'reshape';
    }
    case 'route': {
      // A connector routed (D7): tied at both ends first when it is not, then the route derived —
      // and, now and then, a mark it is tied to moved, or its routing taken off. A polyline is derived
      // from the board, so every board that merges the line must derive the same one.
      const tie = bindable(s, rand);
      if (!tie) return null;
      const other = s.getState().contentIds.filter((id) => id !== tie.connector && id !== tie.target && !!getRep(s.getState().nodes.get(id)!, 'stroke'));
      if (!other.length) return null;
      const far = pick(other);
      const sites = magnetSites(s.getState().nodes.get(far)!, s.getState().nodes).filter((x) => !x.notation);
      if (!sites.length) return null;
      const site = pick(sites);
      s.bind({ strokeId: tie.connector, nodeId: tie.target, site: tie.site, end: tie.end, at });
      s.bind({ strokeId: tie.connector, nodeId: far, site: { kind: site.kind, index: site.index }, end: tie.end === 'start' ? 'end' : 'start', at: at + 5 });
      if (!s.route({ ids: [tie.connector], at: at + 10 })) return null;
      const r = rand();
      if (r < 0.4) s.move({ ids: [tie.target], dx: (rand() - 0.5) * 160, dy: (rand() - 0.5) * 160, at: at + 20 });
      else if (r < 0.55) s.route({ ids: [tie.connector], mode: 'raw', at: at + 20 });
      return 'route';
    }
    case 'bind':
    case 'follow': {
      // A connector's end tied to a site on another mark (P1) — and, for a
      // follow, that mark moved at once, so the connector follows it (E2).
      const tie = bindable(s, rand);
      if (!tie) return null;
      s.bind({ strokeId: tie.connector, nodeId: tie.target, site: tie.site, end: tie.end, at });
      if (kind === 'bind') return 'bind';
      s.move({ ids: [tie.target], dx: (rand() - 0.5) * 160, dy: (rand() - 0.5) * 160, at: at + 10 });
      const line = s.getState().nodes.get(tie.connector);
      return line && getRep(line, 'follow') ? 'follow' : 'follow, with nothing carried';
    }
  }
  return null;
}

/** A line on the board, another mark, one of that mark's own sites and an end: a bind to make, or null when there is none. */
function bindable(s: Session, rand: () => number): { connector: string; target: string; site: { kind: string; index: number }; end: 'start' | 'end' } | null {
  const st = s.getState();
  const pick = <T>(xs: readonly T[]): T => xs[Math.floor(rand() * xs.length)];
  const lines = st.contentIds.filter((id) => {
    const n = st.nodes.get(id);
    return !!n && getRep(n, 'stroke') && resemblances(n)[0]?.to === 'type:line';
  });
  if (!lines.length) return null;
  const connector = pick(lines);
  const others = st.contentIds.filter((id) => id !== connector && !!st.nodes.get(id) && !!getRep(st.nodes.get(id)!, 'stroke'));
  if (!others.length) return null;
  const target = pick(others);
  const sites = magnetSites(st.nodes.get(target)!, st.nodes).filter((x) => !x.notation);
  if (!sites.length) return null;
  const site = pick(sites);
  return { connector, target, site: { kind: site.kind, index: site.index }, end: rand() < 0.5 ? 'start' : 'end' };
}

const REMOTE_ACTS = ['draw', 'draw', 'draw', 'write', 'undo', 'undo', 'bless', 'answer', 'erase', 'move', 'label', 'tool', 'reshape', 'bind', 'follow', 'route'];
const LOCAL_ACTS = ['draw', 'draw', 'write', 'undo', 'undo', 'bless', 'answer', 'erase', 'move', 'tool', 'reshape', 'bind', 'follow', 'route'];

/**
 * One room, from its seed. The readers under test join at a random moment,
 * drawn on a little first; everything after is steps of acts and deliveries,
 * then every line still on the wire is delivered and the readers merge one
 * last time. Returns what differed from the oracle (nothing, when it holds)
 * and what happened, counted.
 */
export async function runRoom(o: RoomOptions): Promise<RoomReport> {
  const rand = rng(o.seed * 7919 + 17);
  const counts: Record<string, number> = {};
  const count = (k: string, n = 1) => { counts[k] = (counts[k] ?? 0) + n; };
  const failures: string[] = [];
  const wire = new Wire();
  let now = T0;
  const clock = new Clock(now);
  let nameIx = 0;
  const nextName = () => `${NAMES[nameIx++ % NAMES.length]}${nameIx > NAMES.length ? nameIx : ''}~${(o.seed % 97).toString(36)}${nameIx}`;
  const skew = () => Math.round((rand() - 0.5) * 6000);

  // ----- the room before the readers arrive -----
  const remotes: RemoteHand[] = [];
  const nRemote = 2 + Math.floor(rand() * 2);
  for (let i = 0; i < nRemote; i++) {
    const h = new RemoteHand(wire, nextName(), skew(), `sit-${o.seed}-${i}`, clock);
    remotes.push(h);
    await h.enter();
  }
  const alive = () => remotes.filter((h) => h.alive);

  async function remoteHears(h: RemoteHand, from: string): Promise<void> {
    if (wire.deliver(h.member, from)) {
      count('line to another hand');
      h.stale = true;
    }
  }

  // ----- undo is per hand (L2j): every undo held to the hand's writing, and followed to the other boards -----
  let me = '';
  /** Other hands' undos the reader has not yet heard: once it holds the writer's log without the act, its board holds none of it. */
  const theirUndos: { writer: string; keys: string[] }[] = [];
  /** A hand's undo, held to its writing; what it took back is then awaited on the boards that hold its log. */
  const undoRemote = (h: RemoteHand, where: string) => {
    const keys = h.writing.acts[h.writing.acts.length - 1] ?? [];
    const failed = undoHeld(h.session, h.writing, count);
    if (failed) failures.push(`seed ${o.seed}, ${where}: ${h.name}'s ${failed}`);
    else if (keys.length) theirUndos.push({ writer: h.name, keys });
  };
  /** Whether a board has heard an undo it awaited, and holds none of the act once it has; what is still awaited is kept. */
  const followUndos = (s: Session, held: Readonly<Record<string, readonly SessionEvent[]>>, awaited: { writer: string; keys: string[] }[], whose: string, where: string, final = false) => {
    for (let i = awaited.length - 1; i >= 0; i--) {
      const u = awaited[i];
      const r = undoReached(s, held, u.writer, u.keys);
      if (r === null) {
        if (final) failures.push(`seed ${o.seed}, ${where}: ${u.writer}'s undo of [${u.keys.join(', ')}] never reached ${whose}`);
        continue;
      }
      awaited.splice(i, 1);
      if (r === 'still held') failures.push(`seed ${o.seed}, ${where}: ${whose} holds ${u.writer}'s log without [${u.keys.join(', ')}] and its board still holds some of it`);
      else count(r === 'gone' ? `an undo followed to ${whose === 'the reader' ? 'this' : "another hand's"} board: the act gone there too` : 'an undone act another log still carries');
    }
  };
  /** A remote hand's board before it acts, with the reader's undos it has now heard followed. */
  const remoteReady = async (h: RemoteHand, where: string): Promise<Session> => {
    const s = await h.ready();
    if (me) {
      const awaited = h.awaiting.map((keys) => ({ writer: me, keys }));
      followUndos(s, h.store.heldLogs(), awaited, h.name, where);
      h.awaiting.splice(0, h.awaiting.length, ...awaited.map((u) => u.keys));
    }
    return s;
  };

  // Let the room draw a little first, and hear itself.
  const opening = 4 + Math.floor(rand() * 6);
  for (let i = 0; i < opening; i++) {
    now += 200 + Math.floor(rand() * 1500);
    count('a wait run out', clock.advance(now));
    const h = alive()[Math.floor(rand() * alive().length)];
    const s = await remoteReady(h, 'opening');
    const did = act(s, rand, now + h.skew, ['draw', 'draw', 'write']);
    h.writing.note(s, did);
    if (did) await h.publish();
    for (const r of alive()) for (const from of wire.waiting(r.member)) await remoteHears(r, from);
  }

  // ----- the readers: the same person in the same place, one path each -----
  me = `${NAMES[(o.seed + 3) % NAMES.length]}me~t${o.seed % 7}`;
  const sitting = `sit-${o.seed}-me`;
  const paths: RoomPath[] = o.reference ? [o.reference, o.under] : [o.under];
  const checkpointEvery = 3 + Math.floor(rand() * 12);
  const locals: LocalHand[] = paths.map((p, i) => {
    const sent: LiveLine[] = [];
    // Only the first reader's lines go onto the wire; the second's are kept to compare.
    const transport = wire.transport('reader', (line) => sent.push(line), i === 0);
    // The path under test snapshots every few events, so a line that cuts
    // back goes to a checkpoint, never to zero, and a checkpoint gone back
    // to is held to the oracle too — which snapshots at its default, or never.
    const session = i === paths.length - 1 ? createSession({ ...DEFAULT_SESSION_CONFIG, checkpointEvery }) : createSession();
    const h: LocalHand = { label: p.label, session, store: new LiveStore(transport, me, 'r', { sitting, later: clock.later }), me, sent, x: {}, notified: 0 };
    session.subscribe(() => { h.notified++; });
    return h;
  });
  const myAt = () => now; // this reader's clock is the room's
  /** The path under test, and each reader's writing as the room saw it (L2j). */
  const U = locals.length - 1;
  const writings = locals.map(() => new Writing());
  // A few marks on the board before it joins, drawn before it had a log name
  // (the board a browser keeps has none) — carried into the room as its opening log.
  const before = Math.floor(rand() * 3);
  for (let i = 0; i < before; i++) {
    now += 150;
    clock.advance(now);
    const seedAt = Math.floor(rand() * 1e9);
    for (let k = 0; k < locals.length; k++) writings[k].note(locals[k].session, act(locals[k].session, rng(seedAt), myAt(), ['draw']));
  }
  for (let i = 0; i < locals.length; i++) await paths[i].join(locals[i]);
  /** The reader's own log is its writing, in the order written: an undo shrinks it from the end (L2j). */
  const ownInOrder = (where: string) => {
    const own = paths[U].mine(locals[U]).map(idOf);
    const wrote = writings[U].order();
    if (own.join('\n') !== wrote.join('\n')) failures.push(`seed ${o.seed}, ${where}: the reader's log is not its writing in the order written — ${diffAt(own.join(' '), wrote.join(' '))}`);
  };
  ownInOrder('after joining');

  const check = async (where: string) => {
    count('check');
    const keys: string[] = [];
    // The oracle: the logs a reader's store holds and its own events, merged
    // whole and replayed from zero in a session of its own. The readers hold
    // the same logs, so it is usually one replay for both.
    let last: { truth: string; state: string } | null = null;
    for (const h of locals) {
      const logs = await h.store.readLogs();
      const truth = mergeLogs({ ...logs, [h.me]: unstamped(h.session) }, { me: h.me });
      const evs = JSON.stringify(h.session.getEvents());
      const want = JSON.stringify(truth);
      if (evs !== want && !same(h.session.getEvents(), truth)) {
        failures.push(`seed ${o.seed}, ${where}: ${h.label} holds ${h.session.getEvents().length} events, the full merge ${truth.length} — first differing at ${firstDiff(h.session.getEvents(), truth)}`);
        return;
      }
      if (!last || last.truth !== want) {
        const fresh = createSession({ ...DEFAULT_SESSION_CONFIG, logName: h.me });
        fresh.load(truth);
        last = { truth: want, state: stateKey(fresh) };
      }
      const k = stateKey(h.session);
      if (k !== last.state) {
        failures.push(`seed ${o.seed}, ${where}: ${h.label} holds the right ${truth.length} events but a board that is not their replay — ${diffAt(k, last.state)}`);
        return;
      }
      keys.push(evs + '\n' + k);
    }
    if (locals.length === 2) {
      if (keys[0] !== keys[1]) failures.push(`seed ${o.seed}, ${where}: the two readers differ — ${diffAt(keys[0], keys[1])}`);
      const said = locals.map((h) => h.sent.map((l) => ({ ...l, at: 0 })));
      if (!same(said[0], said[1])) failures.push(`seed ${o.seed}, ${where}: the two readers sent different lines — ${diffAt(canonical(said[0]), canonical(said[1]))}`);
    }
  };

  const readersMerge = async (where: string) => {
    const under = locals.length - 1;
    const h = locals[under];
    const was = { evs: h.session.getEvents(), n: h.session.getEvents().length, notified: h.notified };
    const merged: boolean[] = [];
    for (let i = 0; i < locals.length; i++) merged.push(await paths[i].merge(locals[i]));
    for (const w of paths[under].did?.(h) ?? []) count(w);
    if (merged.some((m) => m !== merged[under])) {
      failures.push(`seed ${o.seed}, ${where}: the readers disagree on whether a log changed`);
      return;
    }
    if (merged[under]) {
      await check(where);
      followUndos(h.session, h.store.heldLogs(), theirUndos, 'the reader', where);
      return;
    }
    // No log changed: no work, the board not so much as told.
    count('a line that changed no log: no work');
    if (h.session.getEvents() !== was.evs || h.session.getEvents().length !== was.n || h.notified !== was.notified) {
      failures.push(`seed ${o.seed}, ${where}: ${h.label} did work for a line that changed no log`);
    }
  };
  const readersPublish = async () => {
    for (let i = 0; i < locals.length; i++) await locals[i].store.publish(paths[i].mine(locals[i]));
  };
  await check('after joining');

  // ----- the room at work -----
  const steps = o.steps ?? 40 + Math.floor(rand() * 30);
  for (let step = 0; step < steps && !failures.length; step++) {
    now += 50 + Math.floor(rand() * 1500);
    count('a wait run out', clock.advance(now));
    const r = rand();
    const where = `step ${step}`;
    if (r < 0.3) {
      // Another hand acts, and sends its log as it stands.
      const hs = alive();
      if (!hs.length) continue;
      const h = hs[Math.floor(rand() * hs.length)];
      if (rand() < 0.05) { h.skew = skew(); count('a clock that jumped'); }
      const s = await remoteReady(h, where);
      const did = act(s, rand, now + h.skew, REMOTE_ACTS, () => undoRemote(h, where));
      if (did !== 'undo') h.writing.note(s, did);
      if (did) { count('another hand: ' + did); await h.publish(); }
    } else if (r < 0.45) {
      // This reader acts — both paths, the same act — and sends its log.
      const seedAt = Math.floor(rand() * 1e9);
      let did: string | null = null;
      for (let i = 0; i < locals.length; i++) {
        const h = locals[i];
        did = act(h.session, rng(seedAt), myAt(), LOCAL_ACTS, () => {
          const keys = writings[i].acts[writings[i].acts.length - 1] ?? [];
          const failed = undoHeld(h.session, writings[i], i === U ? count : () => {});
          if (failed) failures.push(`seed ${o.seed}, ${where}: ${h.label}: the reader's ${failed}`);
          else if (i === U && keys.length) for (const r of alive()) r.awaiting.push(keys);
        });
        if (did !== 'undo') writings[i].note(h.session, did);
      }
      if (did) { count('this reader: ' + did); await readersPublish(); ownInOrder(where); }
    } else if (r < 0.72) {
      // A line reaches this reader, which merges.
      const from = wire.waiting('reader');
      if (!from.length) continue;
      const line = wire.deliver('reader', from[Math.floor(rand() * from.length)]);
      count(line ? kindOf(line) : 'nothing');
      await readersMerge(`${where} (${line ? kindOf(line) : '-'})`);
    } else if (r < 0.77) {
      // Several lines land in one tick and are merged once.
      let n = 0;
      const batch = 2 + Math.floor(rand() * 3);
      for (let k = 0; k < batch; k++) {
        const from = wire.waiting('reader');
        if (!from.length) break;
        const line = wire.deliver('reader', from[Math.floor(rand() * from.length)]);
        if (line) { n++; count(kindOf(line)); }
      }
      if (n) { count('lines merged at once', n); await readersMerge(`${where} (${n} lines at once)`); }
    } else if (r < 0.9) {
      // Other hands hear the room.
      for (const h of alive()) {
        const from = wire.waiting(h.member);
        for (let k = 0; k < from.length; k++) if (rand() < 0.6) await remoteHears(h, from[k]);
      }
    } else if (r < 0.93) {
      // A stream reconnects: lines already heard, heard again, in order.
      const from = wire.heardFrom('reader');
      if (!from.length) continue;
      const n = wire.redeliver('reader', from[Math.floor(rand() * from.length)], 1 + Math.floor(rand() * 3));
      count('a stretch heard again', n);
      await readersMerge(`${where} (heard again)`);
    } else if (r < 0.95) {
      // A hand leaves.
      const hs = alive();
      if (hs.length < 2) continue;
      hs[Math.floor(rand() * hs.length)].leave();
      count('a hand left');
    } else if (r < 0.975) {
      // A newcomer arrives — sometimes with marks drawn before it had a log name.
      const h = new RemoteHand(wire, nextName(), skew(), `sit-${o.seed}-n${step}`, clock, { unnamedFirst: rand() < 0.5 });
      // Its clock runs on between them, a second apart: a mark with no
      // authorship has no number, so where it stands among its hand's writing
      // is the log's order (L2j) — the order written, while the clock that
      // stamped them ran forward.
      if (rand() < 0.7) for (let k = 0; k < 1 + Math.floor(rand() * 2); k++) h.writing.note(h.session, act(h.session, rand, now + h.skew - 3000 + k * 1000, ['draw', 'write']));
      remotes.push(h);
      await h.enter();
      count(h.session.getEvents().some((e) => !e.origin) ? 'a newcomer with unnamed marks' : 'a newcomer');
    } else if (r < 0.99) {
      // A hand comes back under another name, in the same sitting.
      const hs = alive();
      if (!hs.length) continue;
      await hs[Math.floor(rand() * hs.length)].rename(nextName());
      count('a hand renamed');
    } else {
      wire.notice('reader', 1 + Math.floor(rand() * 20));
      count('the relay said it forgot');
      await readersMerge(`${where} (notice)`);
    }
  }

  // ----- everything still on the wire, delivered — and every wait run out -----
  now += 60_000;
  count('a wait run out', clock.advance(now));
  for (let guard = 0; guard < 10000 && wire.pending() && !failures.length; guard++) {
    for (const h of alive()) for (const from of wire.waiting(h.member)) await remoteHears(h, from);
    const from = wire.waiting('reader');
    if (from.length) {
      const line = wire.deliver('reader', from[Math.floor(rand() * from.length)]);
      if (line) count(kindOf(line));
      await readersMerge('draining');
    }
  }
  if (!failures.length) await readersMerge('at the end');
  // Every undo has reached every board that stayed: the reader holds none of
  // another hand's undone acts, and no hand still in the room holds the reader's.
  if (!failures.length) {
    followUndos(locals[U].session, locals[U].store.heldLogs(), theirUndos, 'the reader', 'at the end', true);
    for (const h of alive()) {
      const s = await remoteReady(h, 'at the end');
      followUndos(s, h.store.heldLogs(), h.awaiting.map((keys) => ({ writer: me, keys })), h.name, 'at the end', true);
    }
  }
  return { seed: o.seed, failures, counts };
}

function kindOf(line: LiveLine | RelayNotice): string {
  if ((line as RelayNotice).relay) return 'relay notice';
  const l = line as LiveLine;
  if (l.hello) return 'hello';
  if ((l as LiveLine & { bye?: boolean }).bye) return 'bye';
  if (l.full) return l.via ? 'a log handed on' : 'a whole log';
  return l.events.length ? 'an append' : 'an empty line';
}

function firstDiff(a: readonly SessionEvent[], b: readonly SessionEvent[]): string {
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) {
    if (canonical(a[i]) !== canonical(b[i])) return `event ${i}: ${short(a[i])} vs ${short(b[i])}`;
  }
  return 'nowhere';
}

function short(e: SessionEvent | undefined): string {
  if (!e) return '(none)';
  return `${e.type}${e.origin ? ' ' + e.origin + '#' + e.seq : ''}${e.by ? ' by ' + e.by : ''}${'at' in e ? ' at ' + e.at : ''}`;
}

function diffAt(a: string, b: string): string {
  let i = 0;
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  return `at character ${i}: …${a.slice(Math.max(0, i - 80), i + 80)}… vs …${b.slice(Math.max(0, i - 80), i + 80)}…`;
}
