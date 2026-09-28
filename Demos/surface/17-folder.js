// ===== folder =====
// Provides: the folder as the canvas — openFolder/openStatic/openStore (discovery into artifacts,
//   per-participant logs merged), autosave (to the folder), the live budget (liveSet), the grid and
//   focus views (setViewMode, focusOn), imageUrlFor, folderStatus; a live room (openLive: logs
//   arriving live over a BroadcastChannel or a relay, merged as they land); and the board this
//   browser keeps when there is no folder (V1-PLAN R3) — the adapter over 17-board.js's journal:
//   IndexedDB (openBoard, persistBoard, flushBoard, forgetLocalLog), browser storage where there is
//   no IndexedDB, the one import of browser storage's old copy, the lock one tab holds, and what the
//   status line says when a save fails (boardWarning, keepBoardIn — the way out into a folder).
// Uses: core, board (createJournal, openPlan, troubleOf, troubleWords, journalEvents, journalFold),
//   view (fitAll, afterViewChange), artifacts, render, input (say, flash), images (downloadText).
// A fragment of one closure: Demos/build-surface.mjs concatenates surface/*.js
// in name order inside `(function () { ... })();`. Shared state is the
// closure's; no imports, no exports, no build step beyond the concatenation.

  // ===== The folder ==========================================================
  // Nothing is invented: a canvas is a folder. Every file of a known kind is
  // an artifact; each participant appends to its own log under .metamedium/;
  // the canvas is the merge (ARCHITECTURE-v8 §11). Opening a folder loads the
  // merged logs, then brings in any file not yet on the board as an import —
  // an event in THIS participant's log, so the next machine to pull sees the
  // same board without discovering twice.
  const PARTICIPANT_KEY = 'mm-participant';
  const LOCAL_LOG_KEY = 'mm-log';
  const CARD = { w: 360, h: 240, gap: 40, cols: 4 };
  const LIVE_BUDGET = 12;

  const folder = {
    store: null, how: 'none', name: '',
    me: deviceParticipant(),
    myPrevious: [], loadedCount: 0, entries: [], truncated: false,
    urls: new Map(), saveTimer: 0, lastSave: '', saving: false, error: '',
    // What the room has said about itself and has already been said out loud
    // here — a name two hands share, a history older than the relay remembers
    // (the store's `notices`) — so each is flashed once, then stands in the
    // status line.
    noticed: new Set(),
    // What the merge said about a folder's logs: a log name two DIFFERENT
    // events were both numbered under (L1b) — two writers under one name. A
    // live room says it through its store; a folder has only the merge.
    misnumbered: new Map(),
  };

  /**
   * The name this device writes a FOLDER's log under: a preference, stable
   * across page loads, because a folder's whole history is loaded before its
   * first mark (a log name is reused only when its whole history was loaded
   * first — DIRECTOR-PLAN-W2 L1). A live sitting's name is never written here.
   */
  function deviceParticipant() {
    try { return localStorage.getItem(PARTICIPANT_KEY) || 'local'; } catch (err) { return 'local'; }
  }
  function setParticipant(name) {
    folder.me = String(name || 'local').trim() || 'local';
    try { localStorage.setItem(PARTICIPANT_KEY, folder.me); } catch (err) { /* private mode */ }
  }

  /** The artifact that already stands for a path, if any. */
  function artifactForPath(s, path) {
    for (const id of s.artifacts) {
      const n = s.nodes.get(id);
      const r = n && codeRepOf(n);
      if (r && r.data.path === path && !n.reps.some((x) => x.modality === 'erased')) return id;
    }
    return null;
  }

  /** A blob URL for a picture in the folder, made once. */
  function imageUrlFor(path) {
    return folder.urls.get(path) || null;
  }

  /**
   * `carry`: the way out of a save that fails (the status line's *open a folder*) — the board
   * on screen goes into the folder as this participant's log, instead of the folder's board
   * replacing it (keepBoardIn).
   */
  async function openFolder(opts) {
    if (!window.showDirectoryPicker) { flash('this browser cannot open a folder — Chrome and Edge can'); return null; }
    let handle;
    try { handle = await window.showDirectoryPicker({ mode: 'readwrite' }); } catch (err) { return null; }
    const store = new MM.FolderStore(handle);
    return opts && opts.carry ? keepBoardIn(store, 'folder', handle.name) : openStore(store, 'folder', handle.name);
  }

  /**
   * A repository as the folder (ARCHITECTURE-v8 §18): `owner/repo`,
   * `owner/repo@branch`, `owner/repo/some/dir`. Reads need no token; writes
   * need one the user has pasted, held on this device only when asked.
   */
  const GIT_TOKEN_KEY = 'mm-git-token';
  async function openGit(spec, token, remember) {
    const parsed = MM.parseGitSpec(spec);
    if (!parsed) { flash('a repository is owner/repo, owner/repo@branch or owner/repo/dir'); return null; }
    let tok = token;
    if (!tok) { try { tok = localStorage.getItem(GIT_TOKEN_KEY) || undefined; } catch (err) { tok = undefined; } }
    if (token && remember) { try { localStorage.setItem(GIT_TOKEN_KEY, token); } catch (err) { /* private mode */ } }
    const store = new MM.GitStore(parsed, (url, init) => fetch(url, init), tok);
    return openStore(store, 'git', spec);
  }

  async function openStatic(base) {
    const store = new MM.StaticStore(base, (url) => fetch(url));
    return openStore(store, 'static', base);
  }

  // ===== A live room (v9 S6) =================================================
  // Multiplayer is a transport over the per-participant logs: another hand is
  // another log arriving live. Between tabs on one machine the transport is a
  // BroadcastChannel; between machines it is a relay that forwards lines
  // (Demos/relay.mjs, Server-Sent Events in, POST out). The merge runs as each
  // line lands, and the other hand's ink draws in its colour.
  function broadcastTransport(room) {
    const ch = new BroadcastChannel('mm-live:' + room);
    return {
      send: (line) => ch.postMessage(line),
      onMessage: (cb) => { const h = (e) => cb(e.data); ch.addEventListener('message', h); return () => ch.removeEventListener('message', h); },
      close: () => ch.close(),
    };
  }
  function relayTransport(url, room) {
    const base = url.replace(/\/+$/, '') + '/rooms/' + encodeURIComponent(room) + '/events';
    const es = new EventSource(base);
    return {
      // The POST's promise goes back to the store, which sends the next line
      // only when this one has gone — two POSTs in flight can land the wrong
      // way round.
      send: (line) => fetch(base, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(line) }).then(() => undefined, () => undefined),
      onMessage: (cb) => {
        // Every line goes to the store — the relay's own word that the room
        // has outlived its buffer included: the store says it (`notices`),
        // and so does every other hand's.
        const h = (e) => {
          let line;
          try { line = JSON.parse(e.data); } catch (err) { return; /* not a line */ }
          cb(line);
        };
        es.addEventListener('message', h);
        return () => es.removeEventListener('message', h);
      },
      close: () => es.close(),
    };
  }
  // The merge runs on a microtask, not a timer: a hidden tab throttles timers
  // to once a second, and another hand's line should land at once. Lines
  // that arrive in one tick coalesce into one merge.
  let liveMergePending = false;
  // A live tab's log is ONE SITTING (DIRECTOR-PLAN-W2 L1): this page load. The
  // suffix of its name and the sitting its store says it writes from are
  // minted once, here, and kept nowhere a reload would find them — a tab
  // keeps no log of its own in a room and never hears its own lines back, so
  // a reload that took the old name back would number from one under a name
  // the room already holds (D2). Joining again in this page load is the same
  // sitting, so the same name and the same sitting id.
  const PAGE_SUFFIX = MM.sittingToken();
  const PAGE_SITTING = MM.sittingToken(8);
  async function openLive(room, opts) {
    opts = opts || {};
    // From here this page's log is the room's: nothing drawn under the room's
    // name is written into the board this browser keeps (L1: a live tab keeps no local log).
    leaveBoard();
    if (folder.store && folder.store.close) folder.store.close();
    folder.noticed = new Set();
    // A hand in a room is one SITTING: a second tab of the same person is a
    // second log, or their lines would be taken for its own. The name is the
    // person's; the suffix is this page load's. Held in memory only: a
    // sitting's name is never the device's folder name.
    const me = handName();
    folder.me = me;
    // Say what this tab's log is called, so every id it mints from here is
    // derived from the event that made it and is the same mark in every hand
    // in the room (ids per hand, SURFACE-v10-PLAN D8). Unsaid, ids come off a
    // counter over the MERGED replay, and no two hands in a room merge the
    // same set of logs — so a sentence, a reading or a version about a mark
    // would land on whatever mark held that number in the reader's board.
    // What is already drawn keeps the ids it was drawn with: the name applies
    // to what is written next, and the two forms cannot collide.
    session.setLogName(me);
    const transport = opts.transport || (opts.relay ? relayTransport(opts.relay, room) : broadcastTransport(room));
    const store = new MM.LiveStore(transport, me, room, { sitting: PAGE_SITTING });
    // What this hand already drew is its opening log in the room — sent whole,
    // as a store's first send always is, so joining the same room again in
    // this sitting replaces what the room holds of it instead of doubling it.
    await store.publish(session.getEvents().filter((e) => !e.by));
    store.subscribe(() => { if (liveMergePending) return; liveMergePending = true; Promise.resolve().then(() => { liveMergePending = false; return mergeLive(); }); });
    await openStore(store, 'live', room);
    folder.loadedCount = session.getEvents().length;
    store.hello();
    return folder;
  }
  /** A name for this hand in a room: the person's name (a preference), and this page load's suffix. */
  function handName() {
    return MM.sittingName(prefs.get('hand-name', '') || 'hand', PAGE_SUFFIX);
  }
  /** A hand's name as shown: the person's, without the sitting's suffix (core's one rule). */
  function handLabel(name) { return MM.handLabel(name); }
  /** Every log the room has, merged and loaded; my own events stay mine. */
  async function mergeLive() {
    if (!folder.store || folder.how !== 'live') return;
    const logs = await folder.store.readLogs();
    // My log is what this session holds of mine — sent or not — never the
    // room's copy of it: a line that lands between a send and this merge
    // would otherwise count my sent events twice, and every mark of mine
    // would stand doubled.
    const mine = myLogNow();
    const merged = MM.mergeLogs(Object.assign({}, logs, { [folder.me]: mine }), { me: folder.me });
    session.load(merged);
    folder.myPrevious = mine;
    folder.loadedCount = merged.length;
    // What the room says about itself is said here once, the moment it is
    // heard, and then stands in the status line (folderStatus).
    for (const n of folder.store.notices ? folder.store.notices() : []) {
      if (folder.noticed.has(n)) continue;
      folder.noticed.add(n);
      say(n);
    }
    if (typeof syncTiles === 'function') syncTiles();
  }

  /**
   * Open any store: load the merged logs, discover the files, place what is
   * new. Opening the same store again is what a second machine does after a
   * pull — the board comes back and nothing is discovered twice.
   */
  async function openStore(store, how, name, opts) {
    // The board on screen, carried in as this participant's log (keepBoardIn), or nothing.
    const carry = opts && opts.carry && opts.carry.length ? opts.carry.map((ev) => Object.assign({}, ev)) : null;
    folder.store = store; folder.how = how || 'store'; folder.name = name || ''; folder.error = ''; folder.saveTrouble = null;
    // From here this page's log is the folder's or the room's: the board this
    // browser keeps stays as it was, and is not written again from this page.
    leaveBoard();
    // A folder is written under the device's own stable name, whatever a live
    // sitting in this page load was called.
    if (folder.how !== 'live') folder.me = deviceParticipant();
    let logs = {};
    try { logs = await store.readLogs(); } catch (err) { folder.error = 'could not read the logs: ' + (err.message || err); }
    if (carry) {
      const mine = folder.how === 'live' ? folder.me : MM.participantOfLog(MM.logPathFor(folder.me));
      logs = Object.assign({}, logs, { [mine]: (logs[mine] || []).concat(carry) });
    }
    // One event, applied once (L1b): the merge folds an event found in two
    // logs, and keeps the first of two DIFFERENT events under one number. A
    // live room says the second through its store's notices; a folder says it
    // here, once, and then in the standing line.
    folder.misnumbered = new Map();
    const merged = MM.mergeLogs(logs, Object.assign(folder.how === 'live' ? { me: folder.me } : {}, {
      onCollision: (c) => { if (folder.how !== 'live' && !folder.misnumbered.has(c.origin)) folder.misnumbered.set(c.origin, MM.describeAuthorshipCollision(c)); },
    }));
    const meKey = folder.how === 'live' ? folder.me : MM.participantOfLog(MM.logPathFor(folder.me));
    folder.myPrevious = (logs[meKey] || []).slice();
    // A folder is a room too: one log per participant, merged, and the next
    // machine to pull merges a different set. So the writing session says
    // what its log is called here as well, under the same name its file is
    // written and read back under — `meKey`, never a name of the reader's
    // own devising. Said BEFORE the load, so the load resumes the numbering
    // past whatever this name already wrote rather than starting it again.
    session.setLogName(meKey);
    session.load(merged);
    // What was loaded is everyone's; from here on, every event is this
    // participant's — including the mark this device re-teaches at open.
    folder.loadedCount = session.getEvents().length;
    folder.lastSave = '';
    // The device's mark is re-taught only when no log already teaches one.
    if (!merged.some((ev) => ev.type === 'teach')) restoreMark();
    let entries = [];
    try { entries = await store.list(); } catch (err) { folder.error = 'could not list the folder: ' + (err.message || err); }
    folder.entries = entries; folder.truncated = !!store.truncated;
    await discover(entries);
    render(session.getState());
    fitAll();
    const misnumbered = [...folder.misnumbered.values()];
    flash((carry ? 'the board is kept in ' + (folder.name || 'the folder') + ' now — ' + carry.length + ' event' + (carry.length === 1 ? '' : 's') + ' carried in, '
      : 'opened ' + (folder.name || 'a folder') + ': ') + entries.length + ' file' + (entries.length === 1 ? '' : 's') + (folder.truncated ? ' shown — the folder holds more' : '') +
      (misnumbered.length ? ' · ' + misnumbered.join(' · ') : ''));
    return folder;
  }

  /** Every file not yet on the board becomes an artifact, laid out in a grid below what is there. */
  async function discover(entries) {
    const s0 = session.getState();
    const boxes = s0.contentIds.map((id) => MM.boundsOf(s0.nodes.get(id))).filter(Boolean);
    const below = boxes.length ? union(boxes).maxY + CARD.gap * 2 : 0;
    let placed = 0;
    for (const e of entries) {
      const s = session.getState();
      if (artifactForPath(s, e.path)) continue;
      let content;
      try { content = await folder.store.read(e.path); } catch (err) { continue; }
      const col = placed % CARD.cols, row = Math.floor(placed / CARD.cols);
      const bounds = { minX: col * (CARD.w + CARD.gap), minY: below + row * (CARD.h + CARD.gap), maxX: col * (CARD.w + CARD.gap) + CARD.w, maxY: below + row * (CARD.h + CARD.gap) + CARD.h };
      placed++;
      if (e.kind === 'png' || e.kind === 'jpg') {
        try { folder.urls.set(e.path, URL.createObjectURL(new Blob([content], { type: e.kind === 'png' ? 'image/png' : 'image/jpeg' }))); } catch (err) { /* no url */ }
        session.import({ kind: e.kind, path: e.path, bounds: bounds, code: '', at: Date.now() });
      } else {
        session.import({ kind: e.kind, path: e.path, bounds: bounds, code: String(content), at: Date.now() });
      }
    }
    return placed;
  }

  // ===== Autosave: the log is saved as it grows ==============================
  // To the folder when there is one — this participant's own file, rewritten
  // whole (nobody else writes it); to the room when this page is in one; and
  // with neither, to the board this browser keeps (below), a record a change.
  function myLogNow() {
    const evs = session.getEvents();
    folder.loadedCount = Math.min(folder.loadedCount, evs.length);
    const present = new Set(evs.slice(0, folder.loadedCount).map((e) => JSON.stringify(e)));
    const kept = folder.myPrevious.filter((e) => present.has(JSON.stringify(e)));
    return kept.concat(evs.slice(folder.loadedCount));
  }

  function scheduleSave() {
    if (!folder.store) return; // the board this browser keeps is written as it changes (persistBoard)
    clearTimeout(folder.saveTimer);
    folder.saveTimer = setTimeout(saveNow, 300);
  }

  async function saveNow() {
    if (folder.store && folder.how === 'live') {
      // A live room takes my log as it stands (`publish`): the new tail when
      // it only grew, the whole of it when it did not — an undo, a reset — so
      // every hand in the room holds what this one holds (DIRECTOR-PLAN-W2 L1).
      folder.saving = true;
      try { await folder.store.publish(myLogNow()); folder.error = ''; }
      catch (err) { folder.error = 'could not send: ' + (err.message || err); }
      folder.saving = false;
      return;
    }
    if (folder.store && folder.store.capabilities().write) {
      const mine = myLogNow();
      const text = MM.encodeLog(mine);
      if (text === folder.lastSave) return;
      folder.saving = true;
      try { await folder.store.write(MM.logPathFor(folder.me), text); folder.lastSave = text; folder.error = ''; setFolderTrouble(null); }
      catch (err) { folder.error = 'could not save: ' + (err.message || err); setFolderTrouble(troubleOf(err, 'folder')); }
      folder.saving = false;
    } else if (!folder.store) {
      // The board this browser keeps: anything not yet written goes now, and
      // this resolves when every record issued has landed (or failed, and said so).
      board.journal.flush(session.getEvents());
      await board.journal.idle();
    }
  }

  /** A folder's write failed, or works again: said at once, and until it works (boardWarning). */
  function setFolderTrouble(t) {
    const was = folder.saveTrouble || null;
    folder.saveTrouble = t;
    if (!!was === !!t) return;
    if (t) render(session.getState());
    else flash('saved to ' + (folder.name || 'the folder') + ' again');
  }

  // ===== The board this browser keeps (V1-PLAN R3) ===========================
  // With no folder, the board is kept in this browser: in IndexedDB, as an
  // append-only journal (17-board.js) — a record per change, begun and
  // committed in the task that made the change, before the paint. It used to
  // be one string in browser storage, the whole log rewritten 900 ms after the
  // last change: saving stopped at about 1,500 marks, the error was swallowed,
  // and a tab that died inside those 900 ms took its strokes with it
  // (PERF.md, hotspot 7). One board for now, under one name — naming boards
  // is R1. A failure is never silent: the status line leads with it, with the
  // way out, until a save succeeds (boardWarning).
  const BOARD_DB = 'mm-boards';
  const BOARD_KEY = 'default';
  const BOARD_LOCK = 'mm-board:' + BOARD_KEY;
  const BOARD_RETRY_MS = 5000;
  const board = {
    // Whose board this page is (boardMode).
    mode: 'off',
    ready: false,
    backend: null,
    how: 'none',        // 'indexeddb' | 'browser storage' (no IndexedDB here) | 'none'
    lock: 'none',       // 'held' | 'taken' (another tab holds the board) | 'none' (no Web Locks here)
    from: 'nothing',    // where the board came back from: 'store' | 'browser storage' | 'nothing'
    opened: null,       // what the store held when this page opened it: { arr, len, lastSeq }
    restoring: false,
    dbClosed: false,
    retryTimer: 0,
    release: null,      // lets the lock go: a page that stops keeping the board frees it for another tab
    freedEarly: false,  // the lock came before the board had opened: take it up once it has
    journal: null,
  };
  /** This page no longer keeps the board (a folder or a room keeps its log): the journal stops, and another tab may take the board. */
  function leaveBoard() {
    board.journal.off();
    if (board.release) { board.release(); board.release = null; }
  }
  board.journal = createJournal({
    append: (rec, o) => (board.backend ? board.backend.append(rec, o) : Promise.reject(new DOMException('the board is not open', 'InvalidStateError'))),
  }, {
    now: () => Date.now(),
    onTrouble: boardTroubleChanged,
    // The old copy in browser storage goes once the import has landed — not before.
    onLanded: (x) => { if (x.meta && board.how === 'indexeddb') { try { localStorage.removeItem(LOCAL_LOG_KEY); } catch (err) { /* nothing */ } } },
  });

  /**
   * Whose board this page is. 'restore' — the device's, brought back; 'fresh'
   * — the device's, started empty (?fresh=1: what it holds is replaced at the
   * first change, as before); 'off' — not the device's: a live room keeps no
   * log of its own (DIRECTOR-PLAN-W2 L1), a replay and an embed are figures
   * (the whitepaper embeds both, and a figure must never write over the
   * reader's board), and a folder or a repository named in the URL is its own.
   */
  function boardMode() {
    if (params.has('live') || params.has('replay') || EMBED || params.has('folder') || params.has('git')) return 'off';
    return params.has('fresh') ? 'fresh' : 'restore';
  }

  function openBoardDB() {
    return new Promise((resolve, reject) => {
      let req;
      try { req = indexedDB.open(BOARD_DB, 1); } catch (err) { reject(err); return; }
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('records')) db.createObjectStore('records', { keyPath: ['board', 'seq'] });
        if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta', { keyPath: 'board' });
      };
      req.onsuccess = () => {
        const db = req.result;
        // A newer page asking for a new version: it may; this page says it stopped saving.
        db.onversionchange = () => { db.close(); board.dbClosed = true; board.journal.broken({ kind: 'refused', detail: 'a newer copy of the page took the board over' }); };
        // Closed by the browser (site data cleared under it): the next try opens it again.
        db.onclose = () => { board.dbClosed = true; };
        resolve(db);
      };
      req.onerror = () => reject(req.error || new DOMException('the browser would not open its storage', 'UnknownError'));
      // An older copy of the page holds the store open at an older version and will not let go.
      req.onblocked = () => { board.journal.broken({ kind: 'tab', detail: 'an older copy of the page' }); };
    });
  }

  /** IndexedDB as the journal's store: `records` keyed [board, seq], `meta` keyed by board. */
  function idbBackend(db) {
    const every = () => IDBKeyRange.bound([BOARD_KEY, 0], [BOARD_KEY, Infinity]);
    return {
      // Begun AND committed before it returns: once this task ends the record
      // is the browser's to keep, whatever becomes of the tab (the kill test).
      append(rec, o) {
        return new Promise((resolve, reject) => {
          const tx = db.transaction(o.meta ? ['records', 'meta'] : ['records'], 'readwrite', { durability: 'strict' });
          const rs = tx.objectStore('records');
          if (o.compact) rs.delete(IDBKeyRange.bound([BOARD_KEY, 0], [BOARD_KEY, rec.seq], false, true));
          rs.add({ board: BOARD_KEY, seq: rec.seq, on: rec.on, base: rec.base, n: rec.n, text: rec.text });
          if (o.meta) tx.objectStore('meta').put(Object.assign({ board: BOARD_KEY }, o.meta));
          tx.oncomplete = () => resolve();
          tx.onabort = () => reject(tx.error || new DOMException('the browser abandoned the write', 'AbortError'));
          if (tx.commit) tx.commit();
        });
      },
      read() {
        return new Promise((resolve, reject) => {
          const tx = db.transaction(['records', 'meta'], 'readonly');
          const out = { meta: null, records: [] };
          tx.objectStore('meta').get(BOARD_KEY).onsuccess = (e) => { out.meta = e.target.result || null; };
          tx.objectStore('records').getAll(every()).onsuccess = (e) => { out.records = e.target.result || []; };
          tx.oncomplete = () => resolve(out);
          tx.onabort = () => reject(tx.error || new DOMException('the browser abandoned the read', 'AbortError'));
        });
      },
      clear() {
        return new Promise((resolve, reject) => {
          const tx = db.transaction(['records', 'meta'], 'readwrite');
          tx.objectStore('records').delete(every());
          tx.objectStore('meta').delete(BOARD_KEY);
          tx.oncomplete = () => resolve();
          tx.onabort = () => reject(tx.error);
          if (tx.commit) tx.commit();
        });
      },
    };
  }

  /**
   * Browser storage as the journal's store, where there is no IndexedDB: the
   * whole log under one key, as before R3 — and a failure there is said like
   * any other.
   */
  function legacyBackend(events) {
    let log = (events || []).slice();
    return {
      append(rec) {
        try {
          const evs = journalEvents(rec.text).events;
          if (rec.base === 0) log = evs;
          else if (rec.base <= log.length) { log.length = rec.base; for (const ev of evs) log.push(ev); }
          else throw new DOMException('a record came before the one it follows', 'DataError');
          localStorage.setItem(LOCAL_LOG_KEY, JSON.stringify(log));
          return Promise.resolve();
        } catch (err) { return Promise.reject(err); }
      },
      read() { return Promise.resolve({ meta: null, records: [] }); },
      clear() { log = []; try { localStorage.removeItem(LOCAL_LOG_KEY); } catch (err) { /* nothing */ } return Promise.resolve(); },
    };
  }

  /**
   * One tab writes the board. Two tabs appending to one journal would
   * interleave two logs into a board neither showed, so the board is a Web
   * Lock held for the page's life; a second tab shows the board and writes
   * nothing, and says so. The lock of a tab that died is released by the
   * browser, so the wait is short. 'held' | 'taken' | 'none' (no Web Locks
   * here: this tab writes, as before).
   */
  function takeBoardLock(waitMs) {
    if (!(navigator.locks && navigator.locks.request)) return Promise.resolve('none');
    return new Promise((resolve) => {
      let settled = false;
      const ctl = typeof AbortController === 'function' ? new AbortController() : null;
      // Held for the page's life — or until it stops keeping the board (leaveBoard).
      const forever = () => new Promise((r) => { board.release = r; });
      const timer = setTimeout(() => { if (settled) return; settled = true; if (ctl) ctl.abort(); resolve('taken'); }, waitMs);
      const none = () => { if (!settled) { settled = true; clearTimeout(timer); resolve('none'); } };
      try {
        navigator.locks.request(BOARD_LOCK, ctl ? { signal: ctl.signal } : {}, () => {
          const held = forever(); // first, so a page that no longer keeps the board can let it go at once
          if (settled) { boardFreed(); return held; }
          settled = true; clearTimeout(timer); resolve('held');
          return held;
        }).catch(none);
      } catch (err) { none(); } // a page the lock manager will not serve (an opaque origin): this tab writes, as before
    });
  }
  /** Wait for the other tab to let the board go. */
  function waitForBoard() {
    if (!(navigator.locks && navigator.locks.request)) return;
    try { navigator.locks.request(BOARD_LOCK, () => { const held = new Promise((r) => { board.release = r; }); boardFreed(); return held; }).catch(() => { /* nothing */ }); } catch (err) { /* nothing */ }
  }
  /** The other tab let go: this one writes from here — if nothing was written since it opened. */
  async function boardFreed() {
    if (board.lock === 'held') return;
    if (folder.store || board.journal.state === 'off') { if (board.release) { board.release(); board.release = null; } return; }
    if (!board.backend || !board.opened) { board.freedEarly = true; return; } // opening still: taken up at its end
    board.lock = 'held';
    let got;
    try { got = await board.backend.read(); } catch (err) { board.journal.broken(troubleOf(err, 'read')); return; }
    const fold = journalFold(got.records);
    if (fold.lastSeq !== board.opened.lastSeq) { board.journal.readonly({ kind: 'elsewhere', detail: '' }); return; }
    board.journal.arm({ seq: fold.lastSeq, chain: fold.chain, sinceFull: fold.sinceFull, arr: board.opened.arr, len: board.opened.len, whole: fold.skipped.length > 0 || fold.bad > 0 || !got.meta, meta: got.meta ? null : { v: 1, created: Date.now(), imported: 0 } });
    persistBoard();
    flash('saving here now — the other tab let the board go');
  }

  /**
   * Open the board this browser keeps: the store, the lock, the records, the
   * one import of browser storage's old copy (openPlan decides; this acts).
   * Resolves true when a board came back onto the page.
   */
  async function openBoard(mode) {
    board.mode = mode;
    try { return await openBoardNow(mode); } catch (err) {
      // Whatever went wrong, it is said: a page that silently stopped saving is the one thing this may not do.
      board.journal.broken(troubleOf(err, 'open'));
      board.ready = true;
      return false;
    }
  }
  async function openBoardNow(mode) {
    let legacy = null;
    try { legacy = localStorage.getItem(LOCAL_LOG_KEY); } catch (err) { legacy = null; }
    let got = null, fallback = null, unreadable = null;
    try {
      // A store that never answers is a store that does not work: said, not waited on forever.
      const db = await Promise.race([openBoardDB(), new Promise((resolve, reject) => setTimeout(() => reject(new DOMException('the browser did not open its storage within 10 s', 'TimeoutError')), 10000))]);
      board.backend = idbBackend(db);
      board.how = 'indexeddb';
    } catch (err) {
      if (err && err.name === 'TimeoutError') throw err;
      fallback = err;
    }
    if (!fallback) {
      board.lock = await takeBoardLock(1500);
      try { got = await board.backend.read(); } catch (err) { unreadable = err; }
    }
    if (unreadable) {
      // Never write over what could not be read.
      board.journal.broken(troubleOf(unreadable, 'read'));
      board.ready = true;
      return false;
    }
    const owner = board.lock !== 'taken';
    const plan = openPlan({ meta: got && got.meta, records: got ? got.records : [], legacy, owner, fallback: !!fallback, now: Date.now() });
    if (fallback) { board.backend = legacyBackend(plan.events); board.how = 'browser storage'; }
    // What a quick hand drew while the store was opening stays, after what comes back.
    const early = session.getEvents().slice();
    let arr = null;
    if (mode === 'restore' && plan.events.length) {
      board.from = plan.from;
      await boardOpening(plan.events.length);
      board.restoring = true;
      try { session.load(plan.events.concat(early)); } finally { board.restoring = false; }
      arr = session.getEvents();
    }
    board.opened = { arr: arr || [], len: arr ? plan.events.length : 0, lastSeq: plan.lastSeq };
    if (plan.arm) {
      const a = Object.assign({}, plan.arm);
      // A fresh board replaces what is kept at its first change, never before it.
      if (mode === 'fresh') a.whole = false;
      else if (arr && !a.whole) { a.arr = arr; a.len = plan.events.length; }
      board.journal.arm(a);
    } else {
      board.journal.readonly({ kind: 'tab', detail: '' });
      if (board.freedEarly) boardFreed(); else waitForBoard();
    }
    board.ready = true;
    if (plan.damaged) say('the board kept in this browser had ' + (plan.damaged.skipped + plan.damaged.bad) + ' unreadable piece' + (plan.damaged.skipped + plan.damaged.bad === 1 ? '' : 's') + ' — what could be read is back, and is written whole again');
    // What the store has not heard: the import, what was drawn while it opened.
    persistBoard();
    return !!arr;
  }
  /** A big board: say so, and let the line paint before the replay holds the thread. */
  function boardOpening(n) {
    if (n < 400) return Promise.resolve();
    say('opening the board kept in this browser — ' + n + ' events…', 600000);
    return new Promise((resolve) => {
      let done = false;
      const go = () => { if (!done) { done = true; resolve(); } };
      requestAnimationFrame(() => setTimeout(go, 0));
      setTimeout(go, 120);
    });
  }

  /**
   * The session's FIRST listener, ahead of the paint — a release on a big
   * board paints for seconds, and the record must not wait behind it: every
   * change reaches the store in the task that made it.
   */
  function persistBoard() {
    if (board.restoring) return; // the log being loaded is what the store holds
    if (folder.store) { if (board.journal.state !== 'off') leaveBoard(); return; }
    board.journal.sync(session.getEvents());
  }
  /** On the way out — the tab hidden, the page going — anything not yet written goes now. */
  function flushBoard() {
    if (folder.store) { if (folder.how !== 'static') saveNow(); return; }
    board.journal.flush(session.getEvents());
  }
  addEventListener('pagehide', flushBoard);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flushBoard(); });

  /** A save failed, or works again: the line says it at once; a failing store is tried again on a timer too. */
  function boardTroubleChanged(t, was) {
    clearInterval(board.retryTimer);
    board.retryTimer = 0;
    if (t && board.journal.state === 'armed') {
      board.retryTimer = setInterval(() => {
        if (board.dbClosed && board.how === 'indexeddb') {
          board.dbClosed = false;
          openBoardDB().then((db) => { board.backend = idbBackend(db); }, () => { board.dbClosed = true; });
          return;
        }
        board.journal.flush(session.getEvents());
      }, BOARD_RETRY_MS);
    }
    render(session.getState());
    if (!t && was && board.journal.state === 'armed') flash('saved — the board is kept in this browser again');
  }

  /** What the status line leads with while the board is not being kept: the sentence and its ways out. */
  function boardWarning() {
    if (folder.store) return folder.saveTrouble ? troubleWords(folder.saveTrouble) : null;
    if (board.mode === 'off') return null;
    return troubleWords(board.journal.trouble);
  }

  /** The way out of a failing save: this board, carried into a store that keeps it from now on. */
  function keepBoardIn(store, how, name) {
    return openStore(store, how, name, { carry: session.getEvents().filter((ev) => !ev.by) });
  }
  /** The other way out: the whole log, as a file to keep. */
  function exportLogNow() {
    const evs = session.getEvents();
    downloadText('canvas.jsonl', MM.encodeLog(evs), 'application/json');
    flash('canvas.jsonl — the whole board, ' + evs.length + ' events, to keep');
  }
  statusEl.addEventListener('click', (e) => {
    const b = e.target.closest && e.target.closest('button[data-way]');
    if (!b) return;
    if (b.dataset.way === 'export') exportLogNow();
    else if (b.dataset.way === 'folder') openFolder({ carry: true });
  });

  /** Reset: the board this browser keeps is emptied; resolves when it is. */
  function forgetLocalLog() {
    board.journal.reset();
    try { localStorage.removeItem(LOCAL_LOG_KEY); } catch (err) { /* nothing */ }
    return board.backend ? board.backend.clear().catch(() => {}) : Promise.resolve();
  }

  /** For tests: the board's own state, and what its store holds. */
  function boardState() {
    return Object.assign({ ready: board.ready, mode: board.mode, how: board.how, lock: board.lock, from: board.from, warning: boardWarning() }, board.journal.snapshot());
  }

  function folderStatus() {
    if (!folder.store) return '';
    if (folder.how === 'live') {
      const now = Date.now();
      const here = folder.store.presence().filter((p) => now - p.at < 60000).map((p) => handLabel(p.participant));
      // Two hands under one name lose each other's work quietly, and a room
      // older than the relay remembers hands over part of itself; this line
      // is where both are said. The store holds them (`notices`): a doubled
      // name — this tab's own included, which both hands that share it hear —
      // and a truncated history.
      const notes = folder.store.notices ? folder.store.notices() : [];
      return 'live ' + folder.name + ' · you are ' + handLabel(folder.me) + (here.length ? ' · with ' + here.join(', ') : ' · alone so far') +
        (notes.length ? ' · ' + notes.join(' · ') : '') + (folder.error ? ' · ' + folder.error : '');
    }
    const n = folder.entries.length;
    const misnumbered = [...folder.misnumbered.values()];
    return (folder.how === 'static' ? 'site' : folder.how === 'git' ? 'repo' : 'folder') + (folder.name ? ' ' + folder.name : '') + ' · ' + n + ' file' + (n === 1 ? '' : 's') +
      (folder.truncated ? '+' : '') + (misnumbered.length ? ' · ' + misnumbered.join(' · ') : '') +
      // A write the folder refused leads the line instead (boardWarning), so it is not said twice.
      (folder.saveTrouble ? '' : folder.error ? ' · ' + folder.error : folder.store.capabilities().write ? (folder.saving ? ' · saving' : ' · saved') : ' · read-only');
  }

  // ===== The live budget =======================================================
  // Only the nearest N live artifacts render as iframes; the rest are parked
  // cards. Panning swaps them. The status line says how many are live.
  function liveSet(s) {
    const live = s.live.filter((id) => !s.nodes.get(id).reps.some((r) => r.modality === 'erased'));
    if (live.length <= LIVE_BUDGET) return new Set(live);
    // A playing artifact is never parked: its clock is running, and a card
    // in its place would silence it without a word. It takes the budget
    // first; the nearest of the rest fill what is left.
    const playing = live.filter((id) => s.clocks[id] && s.clocks[id].playing);
    const c = screenToWorld(innerWidth / 2, innerHeight / 2);
    const scored = live.filter((id) => !playing.includes(id)).map((id) => {
      const b = MM.boundsOf(s.nodes.get(id));
      const d = b ? Math.hypot((b.minX + b.maxX) / 2 - c.x, (b.minY + b.maxY) / 2 - c.y) : Infinity;
      return { id, d };
    }).sort((p, q) => p.d - q.d);
    return new Set(playing.concat(scored.slice(0, Math.max(0, LIVE_BUDGET - playing.length)).map((x) => x.id)));
  }

  // ===== Three views, one log ==================================================
  // Canvas is the pure form; grid surfaces every artifact as a card, sortable;
  // focus is one artifact filling the screen, prev and next through the
  // grid's order. Lenses over the same log — a card is the artifact.
  const gridEl = document.getElementById('grid');
  let viewMode = 'canvas';
  let gridSort = 'name';
  let focusIndex = -1;

  function gridOrder(s) {
    const ids = s.artifacts.filter((id) => !s.nodes.get(id).reps.some((r) => r.modality === 'erased'));
    const key = (id) => {
      const n = s.nodes.get(id);
      const r = codeRepOf(n);
      if (gridSort === 'kind') return (r ? r.data.kind : MM.isFrame(n) ? 'frame' : 'drawing') + ' ' + (MM.wordOf(n) || '');
      if (gridSort === 'recency') return String(1e15 - (n.createdAt || 0)).padStart(16, '0');
      if (gridSort === 'folder') return (r && r.data.path ? r.data.path : '~' + (MM.wordOf(n) || ''));
      return (MM.wordOf(n) || id).toLowerCase();
    };
    return ids.sort((a, b) => (key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0));
  }

  function setViewMode(mode) {
    viewMode = mode;
    if (mode === 'grid') { renderGrid(session.getState()); gridEl.hidden = false; }
    else gridEl.hidden = true;
    document.getElementById('gridBtn').setAttribute('aria-pressed', String(mode === 'grid'));
    if (mode === 'canvas') focusIndex = -1;
    renderViewBar();
    syncTiles();
  }

  // The view's own controls live in the bar, not in a second bar over the
  // cards: the grid's count and sort, focus's prev and next (one frame, three
  // lenses — the review canvas's rule).
  const viewBarEl = document.getElementById('viewBar');
  function renderViewBar() {
    const s = session.getState();
    if (viewMode === 'canvas') { viewBarEl.hidden = true; viewBarEl.innerHTML = ''; return; }
    viewBarEl.hidden = false;
    const order = gridOrder(s);
    if (viewMode === 'grid') {
      viewBarEl.innerHTML = '<b>' + order.length + '</b> artifact' + (order.length === 1 ? '' : 's') + ' · sort ' +
        ['name', 'kind', 'recency', 'folder'].map((k) => '<button data-sort="' + k + '"' + (gridSort === k ? ' class="on"' : '') + '>' + k + '</button>').join('') +
        '<button data-view="canvas" title="Esc">canvas</button>';
    } else {
      const id = order[focusIndex];
      const name = id ? (MM.wordOf(s.nodes.get(id)) || id) : '';
      viewBarEl.innerHTML = '<button data-focus="-1" title="←">←</button><b>' + esc(name) + '</b> ' + (focusIndex + 1) + '/' + order.length +
        '<button data-focus="1" title="→">→</button><button data-view="canvas" title="Esc">canvas</button>';
    }
  }
  viewBarEl.addEventListener('click', (e) => {
    const b = e.target.closest && e.target.closest('button');
    if (!b) return;
    if (b.dataset.sort) { gridSort = b.dataset.sort; renderGrid(session.getState()); renderViewBar(); }
    else if (b.dataset.focus) focusStep(Number(b.dataset.focus));
    else if (b.dataset.view) setViewMode('canvas');
  });

  function renderGrid(s) {
    const order = gridOrder(s);
    let html = order.length ? '<div class="cards">' : '<div class="empty">no artifacts yet — name something, or open a folder</div><div class="cards">';
    for (const id of order) {
      const n = s.nodes.get(id);
      const r = codeRepOf(n);
      const kind = r ? r.data.kind : MM.isFrame(n) ? 'frame' : 'drawing';
      const path = r && r.data.path ? r.data.path : '';
      const preview = r && kind !== 'png' && kind !== 'jpg' ? esc(String(r.data.code).slice(0, 160)) : '';
      const img = (kind === 'png' || kind === 'jpg') && r && imageUrlFor(r.data.path) ? '<img src="' + imageUrlFor(r.data.path) + '" alt="">' : '';
      html += '<button class="card" data-id="' + esc(id) + '"><span class="name">' + esc(MM.wordOf(n) || id) + '</span><span class="kind">' + esc(kind) + (path ? ' · ' + esc(path) : '') + '</span>' + (img || '<pre>' + preview + '</pre>') + '</button>';
    }
    gridEl.innerHTML = html + '</div>';
  }

  gridEl.addEventListener('click', (e) => {
    const card = e.target.closest && e.target.closest('button.card');
    if (card) focusOn(card.getAttribute('data-id'));
  });

  /** Fit one artifact to the screen; prev and next walk the grid's order. */
  function focusOn(id) {
    const s = session.getState();
    const order = gridOrder(s);
    focusIndex = order.indexOf(id);
    const b = MM.boundsOf(s.nodes.get(id));
    if (!b) return;
    setViewMode('focus');
    const pad = Math.max(40, Math.min(innerWidth, innerHeight) / 8);
    const w = Math.max(1, b.maxX - b.minX), h = Math.max(1, b.maxY - b.minY);
    view.zoom = clampZoom(Math.min((innerWidth - pad * 2) / w, (innerHeight - pad * 2) / h, 4));
    view.panX = (innerWidth - w * view.zoom) / 2 - b.minX * view.zoom;
    view.panY = (innerHeight - h * view.zoom) / 2 - b.minY * view.zoom;
    afterViewChange();
    renderViewBar();
  }
  function focusStep(delta) {
    const order = gridOrder(session.getState());
    if (!order.length) return;
    const i = ((focusIndex < 0 ? 0 : focusIndex + delta) + order.length) % order.length;
    focusOn(order[i]);
  }

  document.getElementById('gridBtn').onclick = () => setViewMode(viewMode === 'grid' ? 'canvas' : 'grid');
  document.getElementById('folderBtn').onclick = () => { closeCC(); openFolder(); };
  addEventListener('keydown', (e) => {
    if (e.target !== document.body && e.target !== document && e.target !== window) return;
    if (e.key === 'Escape' && viewMode !== 'canvas') { setViewMode('canvas'); e.preventDefault(); }
    if (viewMode === 'focus' && e.key === 'ArrowRight') { focusStep(1); e.preventDefault(); }
    if (viewMode === 'focus' && e.key === 'ArrowLeft') { focusStep(-1); e.preventDefault(); }
  });
