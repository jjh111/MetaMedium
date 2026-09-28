// A live room's merge, kept standing between lines (V1-PLAN §9 R4d).
//
// `mergeLogs` is what a room's board IS: every log interleaved by time, one
// event per authorship, the reader's own events unstamped and every other
// hand's stamped `by`. Computed afresh and replayed from zero on every line,
// it cost a 2,000-mark board 0.3 s a line — and a line with nothing in it (a
// hello, the relay's word) cost the same. This keeps that merge standing: each
// log's events in their places in it, so a line costs what it carries. Its
// events find their places (a binary search each), and the session is handed
// only what changed (`Session.rebase`): an append when they fall after
// everything it holds — the common case, nothing replayed — and, when one
// falls before events already applied, a replay from the nearest checkpoint.
//
// Three things change the merge, and it tells them apart without asking:
//
//   - **Another hand's log grew or was replaced** (`sync(logs)`, the store's
//     own arrays): a log is only ever appended to or replaced whole (the
//     store's rule), so the same array longer is an append of its tail, and a
//     different array is a replacement — an undo, a reset, a late arrival's
//     whole log — whose events are matched to the old ones by authorship
//     until they part.
//   - **This hand drew** — the session appended its own events, which is the
//     only way its log grows: they join the merge where their time puts them.
//   - **This hand's log changed any other way** — an undo, a load: the
//     session's log is a different array, and the merge is read again whole
//     from the logs and the session's own events, then compared with what the
//     session holds to find where they part. Rare, and still no replay from
//     zero unless the logs part at the start.
//
// The rules are `mergeLogs`' own, so the two cannot drift: the order is
// `atOf`, then the log's name, then the event's place in its log; an event
// is its authorship (`authorKey`), and of several copies of one the reader's
// own stands, else the first in that order. The full merge stays the oracle
// (src/store/room.oracle.test.ts): for every order of arrival the seeded
// rooms generate, the session this leaves behind holds `mergeLogs` of the same
// logs, event for event, and the board its replay gives.

import type { Session, SessionEvent } from '../session/session';
import { atOf, authorKey } from './merge';

/** One event where it falls in the merge. */
interface Entry {
  /** The event as the session holds it: the reader's own as written, another log's stamped `by`. */
  ev: SessionEvent;
  /** The event as its log holds it, to match a replacement against. */
  src: SessionEvent;
  /** The log it was found in. */
  name: string;
  /** Its place in that log — only ever compared between events of one log. */
  i: number;
  at: number;
  /** Its authorship, or null for an event written before there was any. */
  key: string | null;
  /** Whether it stands in the merge: the copy of its authorship that wins, or an event with none. */
  standing: boolean;
}

interface Held {
  ref: readonly SessionEvent[];
  entries: Entry[];
}

/** What one `sync` did. */
export interface MergeReport {
  /** 'none': the session already held the merge. 'append': events applied after everything it held. 'cut': replayed from a checkpoint. */
  how: 'none' | 'append' | 'cut';
  /** Events of the session's log left as they were. */
  kept: number;
  /** Events the session applied — for a cut, from the checkpoint it went back to. */
  applied: number;
  /** For a cut, the checkpoint the replay began at. */
  from: number;
  /** Whether the merge was read again whole, because the session's log changed under it (an undo, a load, the first sync). */
  rebuilt: boolean;
}

const order = (a: Entry, b: Entry): number => {
  if (a.at !== b.at) return a.at - b.at;
  if (a.name !== b.name) return a.name < b.name ? -1 : 1;
  return a.i - b.i;
};

/** The first place in `list` at or after `e`. */
function lowerBound(list: readonly Entry[], e: Entry): number {
  let lo = 0, hi = list.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (order(list[mid], e) < 0) lo = mid + 1;
    else hi = mid;
  }
  return lo;
}

/** JSON of an event with no authorship, made once per object — the only way such an event can be told from another. */
const written = new WeakMap<object, string>();
function jsonOf(ev: SessionEvent): string {
  let s = written.get(ev);
  if (s === undefined) {
    s = JSON.stringify(ev);
    written.set(ev, s);
  }
  return s;
}

/**
 * Whether two events are one: the same object, or the same authorship — an
 * event IS its authorship (V1-PLAN L1b), and a store holds a log from one
 * writer that never numbers two events alike — or, with no authorship to go
 * by, the same words.
 */
function sameEventAs(a: SessionEvent, b: SessionEvent): boolean {
  if (a === b) return true;
  const ka = authorKey(a), kb = authorKey(b);
  if (ka !== null || kb !== null) return ka === kb && a.type === b.type && atOf(a) === atOf(b);
  const { by: _a, ...ra } = a;
  const { by: _b, ...rb } = b;
  void _a; void _b;
  return (a.by === undefined ? jsonOf(a) : JSON.stringify(ra)) === (b.by === undefined ? jsonOf(b) : JSON.stringify(rb));
}

/**
 * A room's merge, held between lines, for one reader's session. Give it the
 * logs the room holds whenever they change (`sync`); it leaves the session
 * holding `mergeLogs({ ...logs, [me]: the session's own events }, { me })` and
 * the board that log replays to, doing only the work the change needs.
 */
export class LiveMerge {
  /** The merge: every standing entry, in order. The session's log is exactly their `ev`s. */
  private list: Entry[] = [];
  /** Every other log, as last seen. */
  private logs = new Map<string, Held>();
  /** This reader's own events, in the order it wrote them. */
  private mine: Entry[] = [];
  /** Every entry of each authorship, standing or not. */
  private copies = new Map<string, Entry[]>();
  /** The session's log as the last sync left it, and how long it was. */
  private held: readonly SessionEvent[] | null = null;
  private heldLength = 0;
  /** The earliest entry that stood up or fell since the sync began: nothing before it moved. */
  private lowest: Entry | null = null;

  constructor(private readonly session: Session, readonly me: string) {}

  /** How many events the merge holds. */
  get length(): number {
    return this.list.length;
  }

  /**
   * Bring the session to the merge of `logs` and its own events. `logs` may
   * hold this reader's log too (a store keeps what it sent); it is never read —
   * this reader's log is the session's own events, sent or not.
   */
  sync(logs: Readonly<Record<string, readonly SessionEvent[]>>): MergeReport {
    const evs = this.session.getEvents();
    this.lowest = null;
    if (this.held === null || evs !== this.held || evs.length < this.heldLength || !this.adoptMine(evs)) {
      return this.rebuild(logs, evs);
    }
    for (const name of Object.keys(logs)) if (name !== this.me) this.syncLog(name, logs[name]);
    for (const name of [...this.logs.keys()]) if (!(name in logs)) this.dropLog(name);
    // Nothing before the lowest entry that moved has changed, and until the
    // last sync the session held the merge exactly — so they agree up to it,
    // and on past it for as long as the session's own new events are where
    // the merge puts them.
    let d = this.lowest ? lowerBound(this.list, this.lowest) : this.list.length;
    while (d < this.list.length && d < evs.length && this.list[d].ev === evs[d]) d++;
    return this.handOver(d, evs, false);
  }

  /** The session drew: its new events are mine, and join the merge where their time puts them. False when one is not mine to adopt. */
  private adoptMine(evs: readonly SessionEvent[]): boolean {
    for (let j = this.heldLength; j < evs.length; j++) if (evs[j].by !== undefined) return false;
    for (let j = this.heldLength; j < evs.length; j++) this.add(this.entry(evs[j], evs[j], this.me, this.mine.length, this.mine));
    return true;
  }

  private entry(src: SessionEvent, ev: SessionEvent, name: string, i: number, into: Entry[]): Entry {
    const e: Entry = { ev, src, name, i, at: atOf(src), key: authorKey(src), standing: false };
    into.push(e);
    return e;
  }

  /** Another log's event, stamped as `mergeLogs` stamps it. */
  private theirs(name: string, src: SessionEvent, i: number, into: Entry[]): Entry {
    return this.entry(src, { ...src, by: name }, name, i, into);
  }

  /** Another hand's log as the store holds it now: an append of its tail, or a replacement matched by authorship until the two part. */
  private syncLog(name: string, arr: readonly SessionEvent[]): void {
    const held = this.logs.get(name);
    if (!held) {
      const entries: Entry[] = [];
      for (let i = 0; i < arr.length; i++) this.add(this.theirs(name, arr[i], i, entries));
      this.logs.set(name, { ref: arr, entries });
      return;
    }
    const { entries } = held;
    if (held.ref === arr && arr.length >= entries.length) {
      for (let i = entries.length; i < arr.length; i++) this.add(this.theirs(name, arr[i], i, entries));
      return;
    }
    let p = 0;
    const n = Math.min(entries.length, arr.length);
    while (p < n && sameEventAs(entries[p].src, arr[p])) {
      entries[p].src = arr[p];
      p++;
    }
    for (let j = entries.length - 1; j >= p; j--) this.remove(entries[j]);
    entries.length = p;
    for (let i = p; i < arr.length; i++) this.add(this.theirs(name, arr[i], i, entries));
    held.ref = arr;
  }

  private dropLog(name: string): void {
    const held = this.logs.get(name);
    if (!held) return;
    for (let j = held.entries.length - 1; j >= 0; j--) this.remove(held.entries[j]);
    this.logs.delete(name);
  }

  private add(e: Entry): void {
    if (e.key === null) {
      this.stand(e);
      return;
    }
    const cs = this.copies.get(e.key);
    if (!cs) {
      this.copies.set(e.key, [e]);
      this.stand(e);
      return;
    }
    cs.push(e);
    this.settle(cs);
  }

  private remove(e: Entry): void {
    if (e.key === null) {
      if (e.standing) this.fall(e);
      return;
    }
    const cs = this.copies.get(e.key);
    if (e.standing) this.fall(e);
    if (!cs) return;
    const k = cs.indexOf(e);
    if (k >= 0) cs.splice(k, 1);
    if (!cs.length) this.copies.delete(e.key);
    else this.settle(cs);
  }

  /** Of the copies of one authorship, the reader's own stands; else the first in the merge's order (`mergeLogs`' fold). */
  private settle(cs: Entry[]): void {
    let win: Entry | null = null;
    for (const c of cs) {
      const mineC = c.name === this.me;
      if (!win) { win = c; continue; }
      const mineW = win.name === this.me;
      if (mineC !== mineW) { if (mineC) win = c; continue; }
      if (order(c, win) < 0) win = c;
    }
    for (const c of cs) if (c !== win && c.standing) this.fall(c);
    if (win && !win.standing) this.stand(win);
  }

  private stand(e: Entry): void {
    const at = lowerBound(this.list, e);
    this.list.splice(at, 0, e);
    e.standing = true;
    if (!this.lowest || order(e, this.lowest) < 0) this.lowest = e;
  }

  private fall(e: Entry): void {
    let at = lowerBound(this.list, e);
    while (at < this.list.length && this.list[at] !== e) at++;
    if (at < this.list.length) this.list.splice(at, 1);
    e.standing = false;
    if (!this.lowest || order(e, this.lowest) < 0) this.lowest = e;
  }

  /**
   * Read the merge again whole: every other log from the store, and this
   * reader's own events from the session — then find where the session's log
   * and the merge part, and hand over the rest from there.
   */
  private rebuild(logs: Readonly<Record<string, readonly SessionEvent[]>>, evs: readonly SessionEvent[]): MergeReport {
    this.list = [];
    this.logs = new Map();
    this.mine = [];
    this.copies = new Map();
    const all: Entry[] = [];
    for (const ev of evs) if (ev.by === undefined) all.push(this.entry(ev, ev, this.me, this.mine.length, this.mine));
    for (const name of Object.keys(logs)) {
      if (name === this.me) continue;
      const arr = logs[name];
      const entries: Entry[] = [];
      for (let i = 0; i < arr.length; i++) all.push(this.theirs(name, arr[i], i, entries));
      this.logs.set(name, { ref: arr, entries });
    }
    all.sort(order);
    for (const e of all) {
      if (e.key === null) continue;
      const cs = this.copies.get(e.key);
      if (cs) cs.push(e);
      else this.copies.set(e.key, [e]);
    }
    const winners = new Set<Entry>();
    for (const cs of this.copies.values()) {
      let win = cs[0];
      if (win.name !== this.me) for (const c of cs) if (c.name === this.me) { win = c; break; }
      winners.add(win);
    }
    for (const e of all) {
      if (e.key !== null && !winners.has(e)) continue;
      e.standing = true;
      this.list.push(e);
    }
    // Where the session and the merge part. What the session holds of
    // another log may be the same event in another object (a load copies
    // every event): take the session's object, so the next sync can tell
    // them apart by identity alone.
    let d = 0;
    while (d < this.list.length && d < evs.length) {
      const e = this.list[d];
      if (e.ev !== evs[d]) {
        if (e.name === this.me || evs[d].by !== e.name || !sameEventAs(e.src, evs[d])) break;
        e.ev = evs[d];
      }
      d++;
    }
    return this.handOver(d, evs, true);
  }

  /** Hand the session the merge from `d` on, and remember what it then holds. */
  private handOver(d: number, evs: readonly SessionEvent[], rebuilt: boolean): MergeReport {
    let report: MergeReport;
    if (d === this.list.length && d === evs.length) {
      report = { how: 'none', kept: d, applied: 0, from: d, rebuilt };
    } else {
      const r = this.session.rebase(d, this.list.slice(d).map((e) => e.ev));
      report = { how: r.cut ? 'cut' : 'append', kept: d, applied: r.applied, from: r.from, rebuilt };
    }
    this.held = this.session.getEvents();
    this.heldLength = this.held.length;
    this.lowest = null;
    return report;
  }
}
