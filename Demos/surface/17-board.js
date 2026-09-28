// ===== board (the journal) =====
// Provides: the board this browser keeps, as an APPEND-ONLY JOURNAL (V1-PLAN.md §9 R3) — the
//   pure half: journalText / journalEvents (one event per line, the folder's own format),
//   journalDiff (what the store must hear to hold the log as it now stands), journalFold (the
//   records read back into the log), createJournal (when a record is written, what a failure
//   does, when the whole log is written again), openPlan (what opening the store puts on the
//   board, and the one import of browser storage's old whole-log copy), troubleOf (a storage
//   error, as a kind) and troubleWords (what the status line says about it).
// Uses: NOTHING. Like 09-field.js this fragment names no closure variable and touches no DOM,
//   no storage and no session: the store arrives as a backend object, the clock as a function,
//   and what it decides leaves as records and states. 17-folder.js is the adapter — IndexedDB,
//   browser storage, the session, the status line. Because it stands alone it loads on its own
//   in Node, which is how it is tested:  node --test Demos/surface/17-board.test.mjs
// A fragment of one closure: Demos/build-surface.mjs concatenates surface/*.js
// in name order inside `(function () { ... })();`. Shared state is the
// closure's; no imports, no exports, no build step beyond the concatenation.
//
// WHY A JOURNAL. The board used to be kept as ONE string in browser storage, the whole log
// rewritten 900 ms after every change. Browser storage takes about five million characters under
// a key, and a board's log runs three to five thousand a mark, so saving stopped at 1,100–1,600
// marks — and the error was swallowed (PERF.md, hotspot 7). A person writing a page of formulas
// by hand reaches that in an afternoon and loses it on the next reload with nothing said.
//
// THE RECORD. `{ seq, on, base, n, text }`: keep the first `base` events of the log, then append
// the `n` events in `text` (one per line). A stroke is `{ base: <length before>, n: 1 }`; an undo
// is `{ base: <where the event was>, n: 0 }` — the log only ever changes at its end, so every
// change is a record like these, and nothing is rewritten. A record with `base: 0` is the WHOLE
// log: it starts a new chain (`on === seq`), and the transaction that adds it deletes every
// record before it — the compaction, for free. Every other record names the chain it continues
// (`on`), so an append made on top of a whole log that never landed is never applied to
// anything else.
//
// THE TRAP. IndexedDB is asynchronous, and a tab can die between the event and the write. So
// nothing here waits: the adapter hears the session BEFORE the paint (a release on a big board
// paints for seconds), `sync` issues the record in that same task, and the backend's
// transaction is begun — and committed — before `append` returns. The kill test
// (e2e/keep.mjs) is the only honest check of that, and it kills at random points.

  /** One event per line, a trailing newline — `encodeLog`'s format, so a record is a piece of a log file. */
  function journalText(events) {
    let out = '';
    for (const ev of events) out += JSON.stringify(ev) + '\n';
    return out;
  }
  /** Lines back into events; a line that does not parse is counted, never fatal. */
  function journalEvents(text) {
    const events = [];
    let bad = 0;
    for (const line of String(text || '').split('\n')) {
      const l = line.trim();
      if (!l) continue;
      try { events.push(JSON.parse(l)); } catch (err) { bad++; }
    }
    return { events, bad };
  }

  /**
   * What the store must hear so that it holds `next`, given it holds (or will, once every record
   * issued has landed) the first `len` events of `prev`. Events are compared by IDENTITY: the
   * session pushes onto one array and makes a new array only to undo (the same events, one left
   * out) or to load (every event copied). So a push is an append from `len`, an undo is a cut
   * where the undone event stood, and a load is the whole log again.
   * @returns {null | {base:number, events:Array}} null when nothing changed
   */
  function journalDiff(prev, len, next) {
    if (next === prev) {
      if (next.length === len) return null;
      if (next.length > len) return { base: len, events: next.slice(len) };
      return { base: next.length, events: [] }; // shrank in place: never done, but a prefix is a prefix
    }
    const m = Math.min(len, next.length);
    let p = 0;
    while (p < m && next[p] === prev[p]) p++;
    return { base: p, events: next.slice(p) };
  }

  /**
   * The records, back into the log. In seq order: a whole log (base 0) starts a chain; any other
   * record applies only on its own chain and only where its base is within what stands — one
   * written on top of a record that never landed is SKIPPED and counted, never applied to
   * something it was not written against.
   */
  function journalFold(records) {
    const rs = records.slice().sort((a, b) => a.seq - b.seq);
    let log = [];
    let chain = 0, sinceFull = 0, lastSeq = 0, bad = 0;
    const skipped = [];
    for (const r of rs) {
      if (r.seq > lastSeq) lastSeq = r.seq;
      const full = r.base === 0;
      if (!full && (r.on !== chain || !(r.base <= log.length))) { skipped.push(r.seq); continue; }
      const d = journalEvents(r.text);
      if (d.bad || (typeof r.n === 'number' && r.n !== d.events.length)) bad++;
      if (full) { log = d.events; chain = r.seq; sinceFull = 0; continue; }
      log.length = r.base;
      for (const ev of d.events) log.push(ev);
      sinceFull++;
    }
    return { events: log, chain, sinceFull, lastSeq, skipped, bad };
  }

  /** Browser storage's old copy of the board: the whole log as one JSON array, or nothing. */
  function legacyEventsOf(raw) {
    if (typeof raw !== 'string' || !raw) return null;
    try {
      const evs = JSON.parse(raw);
      return Array.isArray(evs) ? evs : null;
    } catch (err) { return null; }
  }

  /**
   * What opening the store puts on the board and how the journal starts, from what the store
   * holds. Pure: the adapter reads, this decides, the adapter acts.
   *   meta     — the board's meta record, or null when no owner has opened this store before
   *   records  — its records
   *   legacy   — browser storage's old whole-log copy (the raw string), or null
   *   owner    — whether this page holds the board (it may write), or another tab does
   *   fallback — no IndexedDB here: browser storage IS the store, as it was before
   * The old copy is IMPORTED ONCE, UNCHANGED, the first time an owner opens the store: its
   * events stand on the board, and the journal writes them as the first whole log, with the meta
   * record in the same transaction. Until that lands the old copy is left where it is
   * (`meta` rides with the record, and the adapter removes the copy when it hears it landed).
   * @returns {{ events: Array, from: string, arm: object|null, damaged: object|null, lastSeq: number }}
   */
  function openPlan(o) {
    const legacy = legacyEventsOf(o.legacy);
    if (o.fallback) {
      // Browser storage holds the log it held: the journal starts from it, and writes what follows.
      return { events: legacy || [], from: legacy && legacy.length ? 'browser storage' : 'nothing', arm: { seq: 0, chain: 0, sinceFull: 0, whole: false }, damaged: null, lastSeq: 0 };
    }
    const fold = journalFold(o.records || []);
    const opened = !!o.meta || (o.records || []).length > 0;
    const damaged = fold.skipped.length || fold.bad ? { skipped: fold.skipped.length, bad: fold.bad } : null;
    if (!opened) {
      const events = legacy || [];
      if (!o.owner) return { events, from: events.length ? 'browser storage' : 'nothing', arm: null, damaged: null, lastSeq: fold.lastSeq };
      return {
        events,
        from: events.length ? 'browser storage' : 'nothing',
        // Nothing is in the store yet: the whole log is what it must hear first.
        arm: { seq: fold.lastSeq, chain: 0, sinceFull: 0, whole: true, meta: { v: 1, created: o.now || 0, imported: legacy ? legacy.length : 0 } },
        damaged: null,
        lastSeq: fold.lastSeq,
      };
    }
    return {
      events: fold.events,
      from: 'store',
      arm: o.owner ? { seq: fold.lastSeq, chain: fold.chain, sinceFull: fold.sinceFull, whole: !!damaged } : null,
      damaged,
      lastSeq: fold.lastSeq,
    };
  }

  /** A storage error, as what it means to the person. `where`: 'open' | 'read' | 'write' | 'folder'. */
  function troubleOf(err, where) {
    const name = (err && err.name) || '';
    const msg = (err && err.message) || String(err || '');
    const detail = (name && name !== 'Error' ? name : '') + (msg ? (name && name !== 'Error' ? ': ' : '') + msg : '');
    if (where === 'folder') return { kind: 'folder', detail: detail || 'the folder refused' };
    if (/quota/i.test(name) || /quota|exceeded the quota|storage (is )?full/i.test(msg)) return { kind: 'full', detail: name || 'QuotaExceededError' };
    if (name === 'SecurityError' || name === 'NotAllowedError' || (name === 'InvalidStateError' && where === 'open')) return { kind: 'blocked', detail: detail };
    if (name === 'ConstraintError') return { kind: 'elsewhere', detail: detail };
    if (where === 'read') return { kind: 'unreadable', detail: detail };
    return { kind: 'refused', detail: detail || 'no reason given' };
  }

  /**
   * What the status line says about a trouble: the sentence, then the ways out. Plain words; the
   * adapter renders the ways as buttons in the line, so the line reads as one sentence.
   */
  function troubleWords(t) {
    if (!t) return null;
    const lead = {
      full: "not saved — the browser's storage for this page is full",
      blocked: 'not saved — this browser will not let the page keep anything (a private window, or site data blocked)',
      tab: 'not saved here — this board is open in another tab (close that one and reload to go on here)',
      elsewhere: 'not saved here — another tab changed this board (reload to pick it up)',
      unreadable: 'not saved — the board this browser kept could not be read (' + t.detail + ')',
      folder: 'not saved — the folder refused the write (' + t.detail + ')',
      refused: 'not saved — the browser refused to keep the board (' + t.detail + ')',
    }[t.kind] || 'not saved — ' + (t.detail || 'the browser refused');
    return { lead, ways: ['export', 'folder'] };
  }
  const troubleKey = (t) => (t ? t.kind + ':' + (t.detail || '') : '');

  /**
   * The journal: the state machine between the session and a store. `backend.append(record,
   * { compact, meta })` must BEGIN its write before it returns (it returns a promise of the
   * write landing): `sync` is called in the task that made the change, and a tab can die in the
   * next one.
   *
   * States: 'waiting' (the store is being opened; changes are held in the session, not lost),
   * 'armed' (this page holds the board and writes it), 'readonly' (another tab holds it; the
   * trouble says so), 'off' (a folder or a live room keeps this page's log instead).
   *
   * opts: now() → ms; retryMs (the least time between two tries of the whole log while writes
   * fail); compactEvery (records on one chain before the next write is the whole log again);
   * onTrouble(trouble, was) when the trouble changes; onLanded({ seq, whole, meta }).
   */
  function createJournal(backend, opts) {
    opts = opts || {};
    const now = opts.now || (() => 0);
    const retryMs = opts.retryMs === undefined ? 1500 : opts.retryMs;
    const compactEvery = opts.compactEvery || 1000;
    const EMPTY = [];
    const j = {
      state: 'waiting', trouble: null,
      seq: 0, chain: 0, arr: EMPTY, len: 0, sinceFull: 0,
      needWhole: false, lastTry: -Infinity, failedSeq: 0, meta: null, dirty: false,
      inFlight: 0, issued: 0, landed: 0, failures: 0, wholes: 0,
    };
    const waiters = [];

    function setTrouble(t) {
      const was = j.trouble;
      j.trouble = t;
      if (troubleKey(was) !== troubleKey(t) && opts.onTrouble) opts.onTrouble(t, was);
    }

    function issue(base, events, next) {
      const whole = base === 0;
      const seq = ++j.seq;
      if (whole) { j.chain = seq; j.sinceFull = 0; j.wholes++; } else j.sinceFull++;
      const rec = { seq, on: j.chain, base, n: events.length, text: journalText(events) };
      j.arr = next; j.len = next.length;
      j.inFlight++; j.issued++;
      const meta = whole ? j.meta : null;
      let p;
      try { p = Promise.resolve(backend.append(rec, { compact: whole, meta })); } catch (err) { p = Promise.reject(err); }
      p.then(() => landed(rec, whole, meta), (err) => failed(rec, err));
      return rec;
    }
    function settle() {
      if (j.inFlight) return;
      while (waiters.length) waiters.shift()();
    }
    function landed(rec, whole, meta) {
      j.inFlight--; j.landed++;
      if (meta && j.meta === meta) j.meta = null;
      // A whole log landed, issued after the last failure and with none since: the store holds
      // the board again, and the line can stop saying it does not.
      if (whole && j.state === 'armed' && j.trouble && !j.needWhole && rec.seq > j.failedSeq) setTrouble(null);
      if (opts.onLanded) opts.onLanded({ seq: rec.seq, whole, meta });
      settle();
    }
    function failed(rec, err) {
      j.inFlight--; j.failures++;
      if (rec.seq > j.failedSeq) j.failedSeq = rec.seq;
      // What the store holds is no longer certain: the next write is the whole log.
      j.needWhole = true;
      if (j.state === 'armed') setTrouble(troubleOf(err, 'write'));
      settle();
    }
    function whole(next) {
      j.needWhole = false;
      j.lastTry = now();
      j.dirty = false;
      return issue(0, next, next);
    }

    /** The session changed (or may have): write what the store has not heard. */
    function sync(next) {
      if (j.state !== 'armed') { if (j.state !== 'off') j.dirty = true; return null; }
      if (j.needWhole) {
        if (now() - j.lastTry < retryMs) { j.dirty = true; return null; }
        return whole(next);
      }
      const d = journalDiff(j.arr, j.len, next);
      if (!d) return null;
      if (d.base === j.len && !d.events.length) { j.arr = next; return null; } // the same log, in a new array
      if (d.base === 0 || j.sinceFull + 1 >= compactEvery) return whole(next);
      j.dirty = false;
      return issue(d.base, d.events, next);
    }

    return {
      /** This page holds the board: `arr`/`len` is what the store holds (the loaded log), or nothing. */
      arm(o) {
        o = o || {};
        j.state = 'armed';
        if ((o.seq || 0) > j.seq) j.seq = o.seq;
        j.chain = o.chain || 0;
        j.sinceFull = o.sinceFull || 0;
        j.arr = o.arr || EMPTY;
        j.len = o.arr ? (o.len === undefined ? o.arr.length : o.len) : 0;
        if (o.whole) { j.needWhole = true; j.lastTry = -Infinity; }
        if (o.meta) j.meta = o.meta;
        if (j.trouble && (j.trouble.kind === 'tab' || j.trouble.kind === 'elsewhere')) setTrouble(null);
      },
      /** Another tab holds the board: nothing here is written, and the trouble says so. */
      readonly(t) { j.state = 'readonly'; setTrouble(t || { kind: 'tab', detail: '' }); },
      /** A folder or a room keeps this page's log now: the journal stops, and its trouble is not this page's any more. */
      off() { j.state = 'off'; setTrouble(null); },
      /** The store could not be opened or read: said, and nothing is written over what could not be read. */
      broken(t) { j.state = 'readonly'; setTrouble(t); },
      sync,
      /** Try now: the way out of a page (pagehide) and the retry timer. The whole log if a write failed. */
      flush(next) {
        if (j.state !== 'armed') return null;
        if (j.needWhole) j.lastTry = -Infinity;
        return sync(next);
      },
      /** The store was emptied (Reset): the next change is written whole, from nothing. */
      reset() {
        j.arr = EMPTY; j.len = 0; j.chain = 0; j.sinceFull = 0; j.needWhole = false; j.dirty = false;
        if (j.state === 'armed' && j.trouble) setTrouble(null);
      },
      /** Resolves when every record issued so far has landed or failed. */
      idle() { return j.inFlight ? new Promise((r) => waiters.push(r)) : Promise.resolve(); },
      get state() { return j.state; },
      get trouble() { return j.trouble; },
      snapshot() {
        return {
          state: j.state, trouble: j.trouble, seq: j.seq, chain: j.chain, len: j.len, sinceFull: j.sinceFull,
          needWhole: j.needWhole, dirty: j.dirty, inFlight: j.inFlight, issued: j.issued, landed: j.landed,
          failures: j.failures, wholes: j.wholes,
        };
      },
    };
  }
