// A room of hands, for holding a live room's merge to the full merge
// (V1-PLAN §9 R4d, the oracle).
//
// The surface merges a room as each line lands. Whatever it does to be quick,
// the board it arrives at must be the one `mergeLogs` + a replay from zero
// would give — for EVERY order the lines could arrive in. Three hand-written
// cases cannot say that, so this room generates them: hands that draw, write,
// undo, name things, answer, erase and move, whose clocks disagree by
// seconds; hands that leave, arrive late, and come back under another name;
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

import { createSession, DEFAULT_SESSION_CONFIG, type Session, type SessionEvent } from '../session/session';
import { LOCAL_PARTICIPANT } from '../session/nodes';
import { LiveStore, type LiveLine, type LiveTransport, type RelayNotice } from '../store/live';
import { mergeLogs } from '../store/merge';
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

/** A session's own events: what it wrote, never what it merged in (those carry `by`). */
export const unstamped = (s: Session): SessionEvent[] => s.getEvents().filter((e) => !e.by);

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
  private joins = 0;

  constructor(private wire: Wire, public name: string, skew: number, readonly sitting: string, opts: { unnamedFirst?: boolean } = {}) {
    this.skew = skew;
    // A newcomer may have drawn before it had a log name (a shard tab before
    // it joined): its first marks carry no authorship and mint by counter.
    this.session = opts.unnamedFirst ? createSession() : createSession({ ...DEFAULT_SESSION_CONFIG, logName: name });
    this.member = `${name}#${this.joins}`;
    this.store = new LiveStore(this.wire.transport(this.member), name, 'r', { sitting });
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
    this.store = new LiveStore(this.wire.transport(this.member), name, 'r', { sitting: this.sitting });
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
}

/** What a surface does in a room: join it, merge when its store says a line landed, and say what its log is. */
export interface RoomPath {
  readonly label: string;
  join(h: LocalHand): Promise<void>;
  merge(h: LocalHand): Promise<void>;
  mine(h: LocalHand): SessionEvent[];
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
  },
  mine: (h) => myLogNow(h),
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

/** One act by a hand on its own board, at its own clock. Returns what it did, or null. */
function act(s: Session, rand: () => number, at: number, kinds: string[]): string | null {
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
    case 'undo':
      if (!s.getEvents().some((e) => !e.by && e.type !== 'tick')) return null;
      s.undo();
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
      return 'move';
    case 'label': {
      if (!content.length) return null;
      return s.label({ nodeId: pick(content), text: pick(['a', 'b', 'hub']), at }) ? 'label' : null;
    }
  }
  return null;
}

const REMOTE_ACTS = ['draw', 'draw', 'draw', 'write', 'undo', 'bless', 'answer', 'erase', 'move', 'label'];
const LOCAL_ACTS = ['draw', 'draw', 'write', 'undo', 'bless', 'answer', 'erase', 'move'];

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
  let nameIx = 0;
  const nextName = () => `${NAMES[nameIx++ % NAMES.length]}${nameIx > NAMES.length ? nameIx : ''}~${(o.seed % 97).toString(36)}${nameIx}`;
  const skew = () => Math.round((rand() - 0.5) * 6000);

  // ----- the room before the readers arrive -----
  const remotes: RemoteHand[] = [];
  const nRemote = 2 + Math.floor(rand() * 2);
  for (let i = 0; i < nRemote; i++) {
    const h = new RemoteHand(wire, nextName(), skew(), `sit-${o.seed}-${i}`);
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

  // Let the room draw a little first, and hear itself.
  const opening = 4 + Math.floor(rand() * 6);
  for (let i = 0; i < opening; i++) {
    now += 200 + Math.floor(rand() * 1500);
    const h = alive()[Math.floor(rand() * alive().length)];
    if (act(await h.ready(), rand, now + h.skew, ['draw', 'draw', 'write'])) await h.publish();
    for (const r of alive()) for (const from of wire.waiting(r.member)) await remoteHears(r, from);
  }

  // ----- the readers: the same person in the same place, one path each -----
  const me = `${NAMES[(o.seed + 3) % NAMES.length]}me~t${o.seed % 7}`;
  const sitting = `sit-${o.seed}-me`;
  const paths: RoomPath[] = o.reference ? [o.reference, o.under] : [o.under];
  const locals: LocalHand[] = paths.map((p, i) => {
    const sent: LiveLine[] = [];
    // Only the first reader's lines go onto the wire; the second's are kept to compare.
    const transport = wire.transport('reader', (line) => sent.push(line), i === 0);
    return { label: p.label, session: createSession(), store: new LiveStore(transport, me, 'r', { sitting }), me, sent, x: {} };
  });
  const myAt = () => now; // this reader's clock is the room's
  // A few marks on the board before it joins, drawn before it had a log name
  // (the board a browser keeps has none) — carried into the room as its opening log.
  const before = Math.floor(rand() * 3);
  for (let i = 0; i < before; i++) {
    now += 150;
    const seedAt = Math.floor(rand() * 1e9);
    for (const h of locals) act(h.session, rng(seedAt), myAt(), ['draw']);
  }
  for (let i = 0; i < locals.length; i++) await paths[i].join(locals[i]);

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
    for (let i = 0; i < locals.length; i++) await paths[i].merge(locals[i]);
    await check(where);
  };
  const readersPublish = async () => {
    for (let i = 0; i < locals.length; i++) await locals[i].store.publish(paths[i].mine(locals[i]));
  };
  await readersMerge('after joining');

  // ----- the room at work -----
  const steps = o.steps ?? 40 + Math.floor(rand() * 30);
  for (let step = 0; step < steps && !failures.length; step++) {
    now += 50 + Math.floor(rand() * 1500);
    const r = rand();
    const where = `step ${step}`;
    if (r < 0.3) {
      // Another hand acts, and sends its log as it stands.
      const hs = alive();
      if (!hs.length) continue;
      const h = hs[Math.floor(rand() * hs.length)];
      if (rand() < 0.05) { h.skew = skew(); count('a clock that jumped'); }
      const did = act(await h.ready(), rand, now + h.skew, REMOTE_ACTS);
      if (did) { count('another hand: ' + did); await h.publish(); }
    } else if (r < 0.45) {
      // This reader acts — both paths, the same act — and sends its log.
      const seedAt = Math.floor(rand() * 1e9);
      let did: string | null = null;
      for (const h of locals) did = act(h.session, rng(seedAt), myAt(), LOCAL_ACTS);
      if (did) { count('this reader: ' + did); await readersPublish(); }
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
      const h = new RemoteHand(wire, nextName(), skew(), `sit-${o.seed}-n${step}`, { unnamedFirst: rand() < 0.5 });
      if (rand() < 0.7) for (let k = 0; k < 1 + Math.floor(rand() * 2); k++) act(h.session, rand, now + h.skew - 3000 + k * 100, ['draw', 'write']);
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

  // ----- everything still on the wire, delivered -----
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
