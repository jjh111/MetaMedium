// ===== folder =====
// Provides: the folder as the canvas — openFolder/openStatic/openStore (discovery into artifacts,
//   per-participant logs merged), autosave (to the folder), the live budget (liveSet), the grid and
//   focus views (setViewMode, focusOn), imageUrlFor, folderStatus; a live room (openLive: logs
//   arriving live over a BroadcastChannel or a relay, merged as they land); and the boards this
//   browser keeps when there is no folder (V1-PLAN R3, R1) — the adapter over 17-board.js's journal
//   and 17-boards.js's list: IndexedDB (openBoard, persistBoard, flushBoard, forgetLocalLog; the list:
//   switchBoard, newBoard, renameBoard, duplicateBoard, trashBoard, restoreBoard, planEmptyTrash,
//   emptyTrash, boardFromFile, resetBoard, rememberPlace, openPlace), the log format's surface (R2:
//   readLogText — a log's text as events or the sentence for a version this build does not read —
//   logWrite, logFileNote; a folder whose log is of a newer version is refused before it is opened),
//   the view per board, browser
//   storage where there is no IndexedDB, the one import of browser storage's old copy, the lock one
//   tab holds per board, what the status line says when a save fails (boardWarning, keepBoardIn), and the one
//   ask that the browser keep the device's storage (askPersist; PLAN-IPAD-NOTES I3).
// Uses: core, board (createJournal, openPlan, troubleOf, troubleWords, journalEvents, journalFold,
//   journalText), boards (the list's pure half), view (fitAll, afterViewChange, clampZoom), teach
//   (savedMark, restoreMark), artifacts, render, input (say, flash), images (downloadText), controls
//   (syncTiles), the boards pane (renderBoardsPane, roomChanged), the seat (seatRoomOpened: who is heard in a room).
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
    // A live room's merge, kept standing between lines (MM.LiveMerge), and the
    // store's revision it last merged — a line that moves no revision is no work.
    merge: null, mergedRevision: -1,
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
    return opts && opts.carry ? keepBoardIn(store, 'folder', handle.name, handle) : openStore(store, 'folder', handle.name, { handle });
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
  // line lands, and the other hand's ink draws in its colour. A room merges a
  // LINE, not the board (V1-PLAN R4d): the merge is kept standing between lines
  // (`MM.LiveMerge`), a line's events are applied where they fall — no replay
  // when they come after everything held, a replay from the nearest checkpoint
  // when one comes before — and a line that changes no log does no work.
  function broadcastTransport(room) {
    const ch = new BroadcastChannel('mm-live:' + room);
    return {
      send: (line) => ch.postMessage(line),
      onMessage: (cb) => { const h = (e) => cb(e.data); ch.addEventListener('message', h); return () => ch.removeEventListener('message', h); },
      close: () => ch.close(),
    };
  }
  function relayTransport(url, room, key) {
    // A relay that asks for a key (cloudflare/relay) takes it as `?key=`: an EventSource cannot set a
    // header. The key is the page's own — from the address or a typed field — and goes nowhere but
    // this address: never the log, the board, an export, or a cache (`sw.js` does not keep a request with one).
    const base = url.replace(/\/+$/, '') + '/rooms/' + encodeURIComponent(room) + '/events' + (key ? '?key=' + encodeURIComponent(key) : '');
    const listeners = new Set();
    let es = null;
    let closed = false;
    let retry = null;
    const deliver = (line) => { for (const cb of listeners) cb(line); };
    // Every line goes to the store — the relay's own word that the room has outlived its buffer
    // included: the store says it (`notices`), and so does every other hand's.
    const onLine = (e) => {
      let line;
      try { line = JSON.parse(e.data); } catch (err) { return; /* not a line */ }
      deliver(line);
    };
    // An EventSource that is closed for good was refused, and cannot say by what: ask once with a plain
    // request. A key the relay will not take is said to the store (`{ relay: 'refused' }`) and not asked
    // again, as Node's transport does; anything else is a hiccup, and the stream is opened again.
    const refusedOr = () => {
      fetch(base, { headers: { accept: 'text/event-stream' }, cache: 'no-store' }).then((res) => {
        const status = res.status;
        if (res.body) res.body.cancel().catch(() => undefined);
        if ([401, 403, 503].includes(status)) { closed = true; deliver({ relay: 'refused', room: room, status: status }); return; }
        if (!closed) retry = setTimeout(open, 3000);
      }, () => { if (!closed) retry = setTimeout(open, 3000); });
    };
    const open = () => {
      if (closed) return;
      es = new EventSource(base);
      es.addEventListener('message', onLine);
      es.addEventListener('error', () => { if (es.readyState === 2 && !closed) refusedOr(); });
    };
    open();
    return {
      // The POST's promise goes back to the store, which sends the next line
      // only when this one has gone — two POSTs in flight can land the wrong
      // way round.
      send: (line) => fetch(base, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(line) }).then(() => undefined, () => undefined),
      onMessage: (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
      close: () => { closed = true; clearTimeout(retry); if (es) es.close(); },
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
    // The board on screen is left only once its store holds all of it (R1).
    if (onBoardHere()) { const v = await readyToLeave(); if (v && v.kind !== 'not-kept') throw new Error(v.words); }
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
    const transport = opts.transport || (opts.relay ? relayTransport(opts.relay, room, opts.key || params.get('key') || '') : broadcastTransport(room));
    const store = new MM.LiveStore(transport, me, room, { sitting: PAGE_SITTING });
    // Which relay carries the room: the seat parks its questions only through one on this machine (V1-PLAN J4).
    folder.relay = opts.relay || '';
    // What this hand already drew is its opening log in the room — sent whole,
    // as a store's first send always is, so joining the same room again in
    // this sitting replaces what the room holds of it instead of doubling it.
    await store.publish(session.getEvents().filter((e) => !e.by));
    store.subscribe(() => { if (liveMergePending) return; liveMergePending = true; Promise.resolve().then(() => { liveMergePending = false; return mergeLive(); }); });
    // `openStore` counted what it loaded BEFORE the device re-taught its mark,
    // so that teach is this hand's and goes out with its log. Counted again
    // here, it was taken for the room's, and the room's first merge dropped it:
    // the board judged this hand by the built-in check from then on (L2h).
    await openStore(store, 'live', room);
    // The room is on the board, loaded whole — joining replaces the board. From
    // here the merge stands between lines, and each line is merged into it.
    folder.merge = new MM.LiveMerge(session, me);
    folder.mergedRevision = -1;
    await mergeLive();
    // Who is heard here, for the seat: Claude's hand, offered in the models pane (24-seat.js).
    seatRoomOpened(store);
    store.hello();
    return folder;
  }
  /** A name for this hand in a room: the person's name (a preference), and this page load's suffix. */
  function handName() {
    return MM.sittingName(prefs.get('hand-name', '') || 'hand', PAGE_SUFFIX);
  }
  /** A hand's name as shown: the person's, without the sitting's suffix (core's one rule). */
  function handLabel(name) { return MM.handLabel(name); }
  /**
   * A line landed: merge it — only when a log another hand wrote changed.
   * A hello, a goodbye, the relay's word, a whole log already held change no
   * log and do no work here; what the room says about itself is still said.
   * The merge is every log the room holds and this hand's own events — sent
   * or not, never the room's copy of them, or a line landing between a send
   * and this merge would count my sent marks twice — and `LiveMerge` hands the
   * session only what changed (`MM.LiveMerge`, `session.rebase`).
   */
  async function mergeLive() {
    if (!folder.store || folder.how !== 'live' || !folder.merge) return;
    let changed = false;
    const rev = folder.store.revision();
    if (rev !== folder.mergedRevision) {
      folder.mergedRevision = rev;
      changed = folder.merge.sync(folder.store.heldLogs()).how !== 'none';
    }
    // What the room says about itself is said here once, the moment it is
    // heard, and then stands in the status line (folderStatus).
    for (const n of folder.store.notices ? folder.store.notices() : []) {
      if (folder.noticed.has(n)) continue;
      folder.noticed.add(n);
      say(n);
      changed = true;
    }
    if (changed && typeof syncTiles === 'function') syncTiles();
  }

  /**
   * Open any store: load the merged logs, discover the files, place what is
   * new. Opening the same store again is what a second machine does after a
   * pull — the board comes back and nothing is discovered twice.
   */
  async function openStore(store, how, name, opts) {
    opts = opts || {};
    // The board on screen, carried in as this participant's log (keepBoardIn), or nothing.
    const carry = opts.carry && opts.carry.length ? opts.carry.map((ev) => Object.assign({}, ev)) : null;
    // The board on screen is left only once its store holds all of it (R1) — unless it is being carried in.
    // A tab that only showed a board another tab holds is not stopped: that tab keeps it, and what was
    // drawn here was said all along not to be kept. A board that is not saved is: the line's own
    // "open a folder" carries it in instead (keepBoardIn), and "export the log" keeps it as a file.
    if (!carry && onBoardHere()) {
      const v = await readyToLeave();
      if (v && v.kind !== 'not-kept') { say(v.words + (v.kind === 'unsaved' ? ' — or "open a folder" in the line, which carries it in' : '')); return null; }
    }
    // A log of a newer version than this build reads (R2) is refused here, before the board on screen is
    // left and before anything could be written over it: half a log is a wrong board.
    let logs = {};
    let readFailed = '';
    try { logs = await store.readLogs(); }
    catch (err) {
      if (err && err.name === 'LogFormatError') { say(err.message); return null; }
      readFailed = 'could not read the logs: ' + (err.message || err);
    }
    // From here this page's log is the folder's or the room's: the board this
    // browser keeps stays as it was (where the hand left it too), and is not written again from this page.
    leaveBoard();
    folder.store = store; folder.how = how || 'store'; folder.name = name || ''; folder.error = ''; folder.saveTrouble = null;
    // A room's merge stands for that room only; `openLive` makes the next one.
    folder.merge = null;
    // A folder is written under the device's own stable name, whatever a live
    // sitting in this page load was called.
    if (folder.how !== 'live') folder.me = deviceParticipant();
    folder.error = readFailed;
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
    // The device's mark is re-taught only when this hand's own log already
    // teaches none. A mark is the hand's that taught it (L2h): another hand's
    // teach — stamped `by` — says nothing about this one's, and waiting on it
    // left this hand judged by the other's mark.
    if (!merged.some((ev) => ev.type === 'teach' && !ev.by)) restoreMark();
    let entries = [];
    try { entries = await store.list(); } catch (err) { folder.error = 'could not list the folder: ' + (err.message || err); }
    folder.entries = entries; folder.truncated = !!store.truncated;
    await discover(entries);
    render(session.getState());
    fitAll();
    // A folder, a repository or a site is a recent place in the boards list (never a room; never a key).
    if (folder.how === 'folder' || folder.how === 'git' || folder.how === 'static') rememberPlace(folder.how, folder.name || folder.how, folder.name, opts.handle || null);
    syncBoardFaces();
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
      if (MM.isPictureKind(e.kind)) {
        try { folder.urls.set(e.path, URL.createObjectURL(new Blob([content], { type: MM.rowOf(e.kind).mime }))); } catch (err) { /* no url */ }
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
  // A folder's merge stamps no `by`, so which loaded events are this hand's is
  // read off what its file held (`myLogNow`); a room's are the session's own
  // unstamped events, in the order written (`store.ownLog`) — no event
  // serialised on the way (R4d).
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
      try { await folder.store.publish(folder.store.ownLog(session.getEvents())); folder.error = ''; }
      catch (err) { folder.error = 'could not send: ' + (err.message || err); }
      folder.saving = false;
      return;
    }
    if (folder.store && folder.store.capabilities().write) {
      const mine = myLogNow();
      const text = MM.encodeLog(mine, logWrite());
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

  // ===== The boards this browser keeps (V1-PLAN R3, R1) ======================
  // With no folder, a board is kept in this browser: in IndexedDB, as an
  // append-only journal (17-board.js) — a record per change, begun and
  // committed in the task that made the change, before the paint. It used to
  // be one string in browser storage, the whole log rewritten 900 ms after the
  // last change: saving stopped at about 1,500 marks, the error was swallowed,
  // and a tab that died inside those 900 ms took its strokes with it
  // (PERF.md, hotspot 7). A failure is never silent: the status line leads
  // with it, with the way out, until a save succeeds (boardWarning).
  //
  // SEVERAL BOARDS (R1; 17-boards.js decides, this acts). Each board is its
  // own journal, keyed by the board's id — records under [id, seq], its meta
  // under id — and the list (the `boards` store) holds one entry a board: its
  // name, when it was made, opened and put in the trash. R3's one board is the
  // first entry, "My board", under the key R3 kept it under ("default"),
  // untouched. The name is shown, never the key. A board's meta also says what
  // it holds (when it last changed, its events, marks and characters), written
  // in the same transaction as each record, so the list is right after a kill.
  // One tab writes a board (a Web Lock per board). Switching is in place: what
  // the next board needs is read while the one on screen goes on being
  // written; then the one on screen is flushed and waited on until the store
  // holds all of it — or the switch is refused, said, with the way out — and
  // only then, in one task with nothing awaited, is it left and the next
  // loaded (switchBoard). From a folder, a repository or a room the board
  // opens in a page of its own.
  const BOARD_DB = 'mm-boards';
  const BOARD_DB_VERSION = 2; // 1: R3's records and meta; 2: R1's list of boards
  const BOARD_RETRY_MS = 5000;
  const BOARD_VIEW_KEY = 'view:';
  const boardLockName = (id) => 'mm-board:' + id;
  const board = {
    // The board this page is on: its journal's key.
    id: FIRST_BOARD,
    // Whose board this page is (boardMode): 'restore' | 'fresh' | 'off'.
    mode: 'off',
    ready: false,
    backend: null,
    how: 'none',        // 'indexeddb' | 'browser storage' (no IndexedDB here) | 'none'
    lock: 'none',       // 'held' | 'taken' (another tab holds the board) | 'none' (no Web Locks here)
    from: 'nothing',    // where the board came back from: 'store' | 'browser storage' | 'nothing'
    opened: null,       // what the store held when this page opened it: { arr, len, lastSeq }
    meta: null,         // its meta record, as this page last wrote or read it
    restoring: false,
    dbClosed: false,
    retryTimer: 0,
    release: null,      // lets the lock go: a page that stops keeping the board frees it for another tab
    waitCtl: null,      // stops waiting for a board another tab holds, when this page leaves it
    lateGrant: null,    // the lock came before the board had opened: { id, release }, taken up once it has
    gen: 0,             // bumped at every open: a read begun for a board since left is dropped
    viewSaved: null,
    resetArmed: 0,
    saidAtOpen: false,  // the open said something of its own (an id not held, a board out of the trash)
    journal: null,
  };
  // The list: every board and every recent place, and what each board holds.
  const boards = {
    ready: false,
    how: 'none',        // 'indexeddb' | 'browser storage' (one board only) | 'none'
    entries: new Map(), // id → entry (17-boards.js)
    stats: new Map(),   // id → { changed, events, marks, chars }
    switching: false,
    busy: 0,
    channel: null,
    // Entries this page could not write yet (the store refused: full, say) — held, and written once a
    // record lands again. The list never stands between a board and its journal.
    held: [],
  };
  let boardDbPromise = null;
  // Resolves once this page has read the list (openBoard, openBoardsList): a place opened at boot waits for it.
  let boardsListed = null;

  /** A journal bound to one board's store; what the board holds rides in each record's transaction. */
  function journalFor(id, backend) {
    const jn = createJournal({
      append(rec, o) {
        const stats = statsAfter(boards.stats.get(id), rec, session.getEvents(), Date.now());
        const meta = Object.assign({}, board.id === id && board.meta ? board.meta : {}, o.meta || {}, stats, { board: id });
        const p = backend.append(rec, { compact: o.compact, meta });
        if (board.id === id) board.meta = meta;
        boards.stats.set(id, stats);
        if (typeof renderBoardsPane === 'function') renderBoardsPane(true);
        findChanged(id); // Find (I6): the board on screen is indexed a moment after its last change
        return p;
      },
    }, {
      now: () => Date.now(),
      onTrouble: (t, was) => { if (board.journal === jn) boardTroubleChanged(t, was); },
      onLanded: (x) => {
        // The old copy in browser storage goes once the import has landed — not before.
        if (x.meta && id === FIRST_BOARD && board.how === 'indexeddb') { try { localStorage.removeItem(LOCAL_LOG_KEY); } catch (err) { /* nothing */ } }
        // The store takes writes again: what the list could not write, now.
        if (boards.held.length) writeHeldEntries();
      },
    });
    return jn;
  }
  board.journal = journalFor(FIRST_BOARD, { append: () => Promise.reject(new DOMException('the board is not open', 'InvalidStateError')) });

  /** This page no longer keeps its board (a folder, a room, or another board keeps its log): the journal stops, and another tab may take it. */
  function leaveBoard() {
    saveBoardView();
    if (board.waitCtl) { try { board.waitCtl.abort(); } catch (err) { /* nothing */ } board.waitCtl = null; }
    if (board.lateGrant) { board.lateGrant.release(); board.lateGrant = null; }
    board.journal.off();
    if (board.release) { board.release(); board.release = null; }
    board.lock = 'none';
    clearInterval(board.retryTimer);
    board.retryTimer = 0;
  }

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
  /** A board is on screen: not a folder, a repository or a room, and not a figure. */
  function onBoardHere() { return !folder.store && board.mode !== 'off'; }
  function boardEntryName(id) { const e = boards.entries.get(id); return (e && e.name) || (id === FIRST_BOARD ? FIRST_BOARD_NAME : id); }
  /** What is on screen, by name: the board's, or the folder's, repository's, site's or room's. */
  function boardOnScreenName() {
    if (folder.store) return folder.name || (folder.how === 'live' ? 'room' : 'folder');
    if (board.mode === 'off') return '';
    return boardEntryName(board.id);
  }

  function openBoardDB() {
    return new Promise((resolve, reject) => {
      let req;
      try { req = indexedDB.open(BOARD_DB, BOARD_DB_VERSION); } catch (err) { reject(err); return; }
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('records')) db.createObjectStore('records', { keyPath: ['board', 'seq'] });
        if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta', { keyPath: 'board' });
        // R1: one entry a board (and one a recent place). R3's records and meta are left as they are.
        if (!db.objectStoreNames.contains('boards')) db.createObjectStore('boards', { keyPath: 'id' });
      };
      req.onsuccess = () => {
        const db = req.result;
        // A newer page asking for a new version: it may; this page says it stopped saving.
        db.onversionchange = () => { db.close(); board.dbClosed = true; boardDbPromise = null; board.journal.broken({ kind: 'refused', detail: 'a newer copy of the page took the board over' }); };
        // Closed by the browser (site data cleared under it): the next try opens it again.
        db.onclose = () => { board.dbClosed = true; boardDbPromise = null; };
        resolve(db);
      };
      req.onerror = () => reject(req.error || new DOMException('the browser would not open its storage', 'UnknownError'));
      // An older copy of the page holds the store open at an older version and will not let go.
      req.onblocked = () => { board.journal.broken({ kind: 'tab', detail: 'an older copy of the page' }); };
    });
  }
  /** The one connection, opened once — and said, not waited on forever, when the store never answers. */
  function boardDB() {
    if (!boardDbPromise) {
      boardDbPromise = Promise.race([openBoardDB(), new Promise((resolve, reject) => setTimeout(() => reject(new DOMException('the browser did not open its storage within 10 s', 'TimeoutError')), 10000))]);
      boardDbPromise.catch(() => { boardDbPromise = null; });
    }
    return boardDbPromise;
  }

  /** IndexedDB as one board's store: `records` keyed [board, seq], `meta` keyed by board. */
  function idbBackend(db, id) {
    const every = () => IDBKeyRange.bound([id, 0], [id, Infinity]);
    return {
      id,
      // Begun AND committed before it returns: once this task ends the record
      // is the browser's to keep, whatever becomes of the tab (the kill test).
      append(rec, o) {
        return new Promise((resolve, reject) => {
          const tx = db.transaction(o.meta ? ['records', 'meta'] : ['records'], 'readwrite', { durability: 'strict' });
          try {
            const rs = tx.objectStore('records');
            if (o.compact) rs.delete(IDBKeyRange.bound([id, 0], [id, rec.seq], false, true));
            rs.add({ board: id, seq: rec.seq, on: rec.on, base: rec.base, n: rec.n, text: rec.text });
            if (o.meta) tx.objectStore('meta').put(Object.assign({}, o.meta, { board: id }));
          } catch (err) {
            // A request refused as it is made (a whole log's delete already issued): the transaction
            // is abandoned, so the delete never lands without the log that replaces what it deletes.
            try { tx.abort(); } catch (e) { /* already finished */ }
            reject(err);
            return;
          }
          tx.oncomplete = () => resolve();
          tx.onabort = () => reject(tx.error || new DOMException('the browser abandoned the write', 'AbortError'));
          if (tx.commit) tx.commit();
        });
      },
      read() {
        return new Promise((resolve, reject) => {
          const tx = db.transaction(['records', 'meta'], 'readonly');
          const out = { meta: null, records: [] };
          tx.objectStore('meta').get(id).onsuccess = (e) => { out.meta = e.target.result || null; };
          tx.objectStore('records').getAll(every()).onsuccess = (e) => { out.records = e.target.result || []; };
          tx.oncomplete = () => resolve(out);
          tx.onabort = () => reject(tx.error || new DOMException('the browser abandoned the read', 'AbortError'));
        });
      },
      /** What the board holds, said again without a record (a board opened that R3 kept had none of it). */
      putMeta(meta) {
        return new Promise((resolve, reject) => {
          const tx = db.transaction(['meta'], 'readwrite');
          tx.objectStore('meta').put(Object.assign({}, meta, { board: id }));
          tx.oncomplete = () => resolve();
          tx.onabort = () => reject(tx.error);
          if (tx.commit) tx.commit();
        });
      },
      clear() {
        return new Promise((resolve, reject) => {
          const tx = db.transaction(['records', 'meta'], 'readwrite');
          tx.objectStore('records').delete(every());
          tx.objectStore('meta').delete(id);
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
   * any other. One board only: there is nowhere to keep a list.
   */
  function legacyBackend(events) {
    let log = (events || []).slice();
    return {
      id: FIRST_BOARD,
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
      putMeta() { return Promise.resolve(); },
      clear() { log = []; try { localStorage.removeItem(LOCAL_LOG_KEY); } catch (err) { /* nothing */ } return Promise.resolve(); },
    };
  }

  /**
   * One tab writes a board. Two tabs appending to one journal would
   * interleave two logs into a board neither showed, so each board is a Web
   * Lock, held while this page is on it; a second tab shows the board and
   * writes nothing, and says so. The lock of a tab that died is released by
   * the browser, so the wait is short. Resolves { state: 'held' | 'taken' |
   * 'none' (no Web Locks here: this tab writes, as before), release }.
   */
  function takeBoardLock(id, waitMs) {
    if (!(navigator.locks && navigator.locks.request)) return Promise.resolve({ state: 'none', release: null });
    return new Promise((resolve) => {
      let settled = false;
      const ctl = typeof AbortController === 'function' ? new AbortController() : null;
      const timer = setTimeout(() => { if (settled) return; settled = true; if (ctl) ctl.abort(); resolve({ state: 'taken', release: null }); }, waitMs);
      const none = () => { if (!settled) { settled = true; clearTimeout(timer); resolve({ state: 'none', release: null }); } };
      try {
        navigator.locks.request(boardLockName(id), ctl ? { signal: ctl.signal } : {}, () => {
          let release;
          const held = new Promise((r) => { release = r; }); // first, so a page that no longer keeps the board can let it go at once
          if (settled) { lateGrant(id, release); return held; }
          settled = true; clearTimeout(timer); resolve({ state: 'held', release });
          return held;
        }).catch(none);
      } catch (err) { none(); } // a page the lock manager will not serve (an opaque origin): this tab writes, as before
    });
  }
  /** The lock came just as this page stopped waiting for it: taken up as a board let go — once this page is on that board. */
  function lateGrant(id, release) {
    if (board.id === id && board.ready && board.opened && onBoardHere() && board.journal.state === 'readonly' && board.lock !== 'held') { boardFreed(id, release); return; }
    if (board.lateGrant && board.lateGrant.release !== release) board.lateGrant.release();
    board.lateGrant = { id, release };
  }
  /** Wait for the tab holding board `id` to let it go; stopped when this page leaves the board. */
  function waitForBoard(id) {
    if (!(navigator.locks && navigator.locks.request)) return;
    const ctl = typeof AbortController === 'function' ? new AbortController() : null;
    board.waitCtl = ctl;
    try {
      navigator.locks.request(boardLockName(id), ctl ? { signal: ctl.signal } : {}, () => {
        let release;
        const held = new Promise((r) => { release = r; });
        boardFreed(id, release);
        return held;
      }).catch(() => { /* stopped waiting */ });
    } catch (err) { /* nothing */ }
  }
  /** The other tab let go of board `id`: this one writes it from here — if nothing was written since it opened. */
  async function boardFreed(id, release) {
    if (board.id !== id || !onBoardHere() || board.journal.state === 'off' || board.lock === 'held') { if (release) release(); return; }
    if (!board.backend || !board.opened || !board.ready) {
      if (board.lateGrant && board.lateGrant.release !== release) board.lateGrant.release();
      board.lateGrant = { id, release };
      return;
    }
    const gen = board.gen;
    board.lock = 'held';
    board.release = release;
    board.waitCtl = null;
    let got;
    try { got = await board.backend.read(); } catch (err) { board.journal.broken(troubleOf(err, 'read')); return; }
    if (gen !== board.gen) return; // this page has left the board since: leaveBoard let the lock go
    const fold = journalFold(got.records);
    if (fold.lastSeq !== board.opened.lastSeq) { board.journal.readonly({ kind: 'elsewhere', detail: '' }); return; }
    board.meta = got.meta;
    board.journal.arm({ seq: fold.lastSeq, chain: fold.chain, sinceFull: fold.sinceFull, arr: board.opened.arr, len: board.opened.len, whole: fold.skipped.length > 0 || fold.bad > 0 || !got.meta, meta: got.meta ? null : { v: 1, created: Date.now(), imported: 0 } });
    persistBoard();
    flash('saving here now — the other tab let the board go');
  }

  // ----- The list ------------------------------------------------------------
  /** Every entry and every board's meta, in one read. */
  function readBoardsList(db) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['boards', 'meta'], 'readonly');
      const out = { entries: [], metas: [] };
      tx.objectStore('boards').getAll().onsuccess = (e) => { out.entries = e.target.result || []; };
      tx.objectStore('meta').getAll().onsuccess = (e) => { out.metas = e.target.result || []; };
      tx.oncomplete = () => resolve(out);
      tx.onabort = () => reject(tx.error || new DOMException('the browser abandoned the read', 'AbortError'));
    });
  }
  /** What a meta record says the board holds, if it says (R3's said nothing of it). */
  function statsOfMeta(m) {
    return m && typeof m.events === 'number' ? { changed: m.changed || 0, events: m.events, marks: m.marks || 0, chars: m.chars || 0 } : null;
  }
  /** The list as the store holds it, taken into this page (the board on screen keeps what this page knows of it). */
  function takeBoardsList(got) {
    boards.entries = new Map(got.entries.map((e) => [e.id, e]));
    for (const h of boards.held) boards.entries.set(h.id, h); // not written yet: still this page's
    const mine = onBoardHere() ? boards.stats.get(board.id) : null;
    boards.stats = new Map();
    for (const m of got.metas) { const s = statsOfMeta(m); if (s) boards.stats.set(m.board, s); }
    if (mine) boards.stats.set(board.id, mine);
  }
  /** Read the list again (another tab changed it), and say what changed here. */
  function rereadBoards() {
    if (boards.how !== 'indexeddb') return Promise.resolve();
    return boardDB().then(readBoardsList).then((got) => { takeBoardsList(got); syncBoardFaces(); }, () => { /* the list stays as this page last knew it */ });
  }
  /** A readwrite transaction over the list; `fn(tx)` issues the writes. Resolves with what `fn` returned, once committed. */
  function boardsTx(stores, fn) {
    boards.busy++;
    return boardDB().then((db) => new Promise((resolve, reject) => {
      let tx, out;
      try { tx = db.transaction(stores, 'readwrite'); out = fn(tx); } catch (err) { try { if (tx) tx.abort(); } catch (e) { /* nothing */ } reject(err); return; }
      tx.oncomplete = () => resolve(out);
      tx.onabort = () => reject(tx.error || new DOMException('the browser abandoned the write', 'AbortError'));
    })).finally(() => { boards.busy--; });
  }
  /** Change entries as the store holds them — read and written in one transaction, since another tab may have changed them. */
  function updateBoardEntries(ids, change) {
    return boardsTx(['boards'], (tx) => {
      const st = tx.objectStore('boards');
      const done = [];
      for (const id of ids) {
        st.get(id).onsuccess = (e) => {
          // An entry the store refused earlier is changed where it is held, and written with the change.
          const cur = e.target.result || boards.held.find((h) => h.id === id);
          const next = cur && change(cur);
          if (next) { st.put(next); done.push(next); }
        };
      }
      return done;
    }).then((done) => {
      for (const e of done) { boards.entries.set(e.id, e); boards.held = boards.held.filter((h) => h.id !== e.id); }
      if (done.length) boardsChanged();
      return done;
    });
  }
  /** A new board, with a log or empty: its entry, its first record and its meta in one transaction. */
  function writeNewBoard(entry, events, view) {
    const now = Date.now();
    const evs = events || [];
    const text = journalText(evs);
    const stats = statsOf(evs, text.length, now);
    return boardsTx(['boards', 'records', 'meta'], (tx) => {
      tx.objectStore('boards').put(entry);
      if (evs.length) tx.objectStore('records').add({ board: entry.id, seq: 1, on: 1, base: 0, n: evs.length, text });
      tx.objectStore('meta').put(Object.assign({ board: entry.id, v: 1, created: now, imported: 0 }, stats));
    }).then(() => {
      boards.entries.set(entry.id, entry);
      boards.stats.set(entry.id, stats);
      if (view) prefs.set(BOARD_VIEW_KEY + entry.id, view);
      boardsChanged();
      return entry;
    });
  }
  /** Entries the store refused, held until it takes writes again. */
  function holdEntries(list) {
    for (const e of list) { boards.entries.set(e.id, e); boards.held = boards.held.filter((h) => h.id !== e.id).concat([e]); }
  }
  function writeHeldEntries() {
    const list = boards.held;
    boards.held = [];
    return boardsTx(['boards'], (tx) => { for (const e of list) tx.objectStore('boards').put(e); })
      .then(() => boardsChanged(), () => { boards.held = list.concat(boards.held); });
  }
  /** An id for a new board: never a name, never reused. */
  function mintBoardId() {
    let r = '';
    try { const a = new Uint32Array(2); crypto.getRandomValues(a); r = a[0].toString(36) + a[1].toString(36); } catch (err) { r = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2); }
    return 'b-' + Date.now().toString(36) + '-' + r.slice(0, 8);
  }
  /** The list changed here: this page's faces, the pane, and every other tab of this browser. */
  function boardsChanged() {
    syncBoardFaces();
    findSyncSoon(); // Find (I6): a board made, copied, restored or let go is read once things are quiet
    try { if (boards.channel) boards.channel.postMessage({ type: 'boards', at: Date.now() }); } catch (err) { /* nothing */ }
  }
  try {
    if (typeof BroadcastChannel === 'function') {
      boards.channel = new BroadcastChannel('mm-boards');
      boards.channel.onmessage = () => { rereadBoards(); };
    }
  } catch (err) { boards.channel = null; }

  /** The title, the boards tile and the pane, from what is on screen. Figures keep theirs. */
  function syncBoardFaces() {
    if (!EMBED && !params.has('replay')) {
      const name = boardOnScreenName();
      if (name) document.title = boardTitle(name);
    }
    if (typeof syncTiles === 'function') syncTiles();
    if (typeof renderBoardsPane === 'function') renderBoardsPane();
  }

  /** A place opened on the page is remembered in the list: a folder (with its handle, where the browser keeps one), a repository, a site. */
  async function rememberPlace(how, spec, name, handle) {
    const kind = how === 'git' ? 'git' : how === 'static' ? 'static' : how === 'folder' ? 'folder' : null;
    if (!kind || !spec) return;
    if (boardsListed) await boardsListed.catch(() => {});
    if (boards.how !== 'indexeddb') return;
    const entry = placeEntry(kind, spec, name, Date.now());
    const plan = placesPlan([...boards.entries.values()], entry);
    const write = (withHandle) => boardsTx(['boards'], (tx) => {
      const st = tx.objectStore('boards');
      st.put(withHandle && handle ? Object.assign({}, entry, { handle }) : entry);
      for (const id of plan.drop) st.delete(id);
    });
    // A handle the browser cannot keep is left out: the folder is then opened again by its picker.
    return write(true).catch(() => write(false)).then(() => {
      boards.entries.set(entry.id, handle ? Object.assign({}, entry, { handle }) : entry);
      for (const id of plan.drop) boards.entries.delete(id);
      boardsChanged();
    }, () => { /* remembering a place is a convenience; the place itself is open */ });
  }
  /** A recent place, opened again the way its tile opens it. */
  async function openPlace(id) {
    const e = boards.entries.get(id);
    if (!e) return null;
    if (e.kind === 'static') return openStatic(e.spec);
    if (e.kind === 'git') return openGit(e.spec);
    if (e.kind === 'folder') {
      if (e.handle && e.handle.requestPermission) {
        try {
          const ok = (await e.handle.queryPermission({ mode: 'readwrite' })) === 'granted' || (await e.handle.requestPermission({ mode: 'readwrite' })) === 'granted';
          if (ok) return openStore(new MM.FolderStore(e.handle), 'folder', e.handle.name, { handle: e.handle });
        } catch (err) { /* the picker, then */ }
      }
      return openFolder();
    }
    return null;
  }

  // ----- The view, per board --------------------------------------------------
  // Where the hand left a board — its zoom and pan — is this device's, not the
  // board's (a board is its log, nothing else): a preference per board id,
  // saved on the way out of a board or a page, and a moment after the view moves.
  function saveBoardView() {
    if (!onBoardHere() || !board.ready) return;
    const v = { zoom: view.zoom, panX: view.panX, panY: view.panY };
    const was = board.viewSaved;
    if (was && was.zoom === v.zoom && was.panX === v.panX && was.panY === v.panY) return;
    board.viewSaved = v;
    prefs.set(BOARD_VIEW_KEY + board.id, v);
  }
  /** A board opens where it was left; one never looked at here opens fitted. */
  function restoreBoardView(id) {
    const v = prefs.get(BOARD_VIEW_KEY + id, null);
    if (v && isFinite(v.zoom) && v.zoom > 0 && isFinite(v.panX) && isFinite(v.panY)) {
      view.zoom = clampZoom(v.zoom); view.panX = v.panX; view.panY = v.panY;
      afterViewChange();
      board.viewSaved = { zoom: view.zoom, panX: view.panX, panY: view.panY };
    } else {
      // Fitted, and not yet anywhere the device keeps: the next save writes it, moved or not,
      // so a board left where it opened comes back there — not fitted again to what it holds by then.
      fitAll();
      board.viewSaved = null;
    }
  }
  let boardViewTimer = 0;
  const boardViewSoon = () => { clearTimeout(boardViewTimer); boardViewTimer = setTimeout(saveBoardView, 800); };
  addEventListener('pointerup', boardViewSoon, true);
  addEventListener('wheel', boardViewSoon, { capture: true, passive: true });
  addEventListener('keyup', boardViewSoon, true);

  // ----- Opening a board ------------------------------------------------------
  /**
   * Open the board this page is on at boot: the store, the list (R3's board as
   * its first entry), which board (?board=, else the one opened last), its
   * lock, its records — and the one import of browser storage's old copy
   * (openPlan decides; this acts). Resolves true when a board came back onto the page.
   */
  function openBoard(mode) {
    board.mode = mode;
    const opening = openBoardSafely(mode);
    boardsListed = opening.then(() => undefined);
    return opening;
  }
  async function openBoardSafely(mode) {
    try { return await openBoardNow(mode); } catch (err) {
      // Whatever went wrong, it is said: a page that silently stopped saving is the one thing this may not do.
      board.journal.broken(troubleOf(err, 'open'));
      board.ready = true;
      boards.ready = true;
      syncBoardFaces();
      return false;
    }
  }
  async function openBoardNow(mode) {
    let db = null, fallback = null;
    try { db = await boardDB(); board.how = 'indexeddb'; } catch (err) {
      if (err && err.name === 'TimeoutError') throw err;
      fallback = err;
    }
    if (fallback) return openFallbackBoard(mode);
    boards.how = 'indexeddb';
    // The list: read it; a list with no board gets R3's as its first entry.
    const got = await readBoardsList(db);
    const metaFirst = got.metas.find((m) => m.board === FIRST_BOARD) || null;
    const plan = listPlan(got.entries, Date.now(), metaFirst);
    takeBoardsList({ entries: plan.entries, metas: got.metas });
    // The list never stands between a board and its journal: an entry the store refuses (full) is held.
    if (plan.put.length) await boardsTx(['boards'], (tx) => { for (const e of plan.put) tx.objectStore('boards').put(e); }).catch(() => holdEntries(plan.put));
    // Which board this page opens.
    const asked = params.get('board');
    const pick = pickBoard(plan.entries, asked);
    let id = pick.id;
    if (pick.make) {
      const entry = newBoardEntry(plan.entries, mintBoardId(), Date.now());
      await writeNewBoard(entry, null, null).catch(() => holdEntries([entry]));
      id = entry.id;
    }
    if (pick.restore) await updateBoardEntries([id], (e) => (e.trashed ? restored(e) : null)).catch(() => { const e = boards.entries.get(id); if (e) holdEntries([restored(e)]); });
    boards.ready = true;
    const prep = await prepareBoard(id);
    await boardOpening(prep.approx);
    const back = applyBoard(prep, { mode, early: true });
    afterBoardOpened(id, { boot: true, address: mode === 'restore' });
    if (pick.missing) say('there is no board “' + pick.missing + '” in this browser — opened “' + boardEntryName(id) + '”');
    else if (pick.restore) say('“' + boardEntryName(id) + '” was in the trash — it is back on the list');
    board.saidAtOpen = !!(pick.missing || pick.restore);
    return back;
  }
  /** No IndexedDB: browser storage is the store, as before R3 — one board, and nowhere to keep a list. */
  async function openFallbackBoard(mode) {
    let legacy = null;
    try { legacy = localStorage.getItem(LOCAL_LOG_KEY); } catch (err) { legacy = null; }
    boards.how = 'browser storage';
    boards.entries = new Map([[FIRST_BOARD, listPlan([], Date.now(), null).put[0]]]);
    boards.ready = true;
    const plan = openPlan({ meta: null, records: [], legacy, owner: true, fallback: true, now: Date.now() });
    board.id = FIRST_BOARD;
    board.backend = legacyBackend(plan.events);
    board.how = 'browser storage';
    board.journal = journalFor(FIRST_BOARD, board.backend);
    const early = session.getEvents().slice();
    let arr = null;
    if (mode === 'restore' && plan.events.length) {
      board.from = plan.from;
      await boardOpening(plan.events.length);
      board.restoring = true;
      try { session.load(plan.events.concat(early)); } finally { board.restoring = false; }
      arr = session.getEvents();
    }
    board.opened = { arr: arr || [], len: arr ? plan.events.length : 0, lastSeq: 0 };
    const a = Object.assign({}, plan.arm);
    if (mode !== 'fresh' && arr) { a.arr = arr; a.len = plan.events.length; }
    board.journal.arm(a);
    board.ready = true;
    persistBoard();
    afterBoardOpened(FIRST_BOARD, { boot: true, address: false });
    return !!arr;
  }
  /** Everything opening board `id` needs, read before anything on screen changes: its lock, its records. */
  async function prepareBoard(id) {
    const db = await boardDB();
    const backend = idbBackend(db, id);
    const lock = await takeBoardLock(id, 1500);
    let got = null, unreadable = null;
    try { got = await backend.read(); } catch (err) { unreadable = err; }
    let approx = 0;
    if (got) for (const r of got.records) approx += r.n || 0;
    return { id, backend, lock, got, unreadable, approx };
  }
  /**
   * Put a prepared board on the page — in one task, with nothing awaited, so
   * no stroke lands between the board left and the board loaded. `early`
   * (boot only): what a quick hand drew while the store was opening stays,
   * after what comes back. Returns whether a board came back onto the page.
   */
  function applyBoard(prep, o) {
    const id = prep.id;
    board.gen++;
    board.id = id;
    board.backend = prep.backend;
    board.lock = prep.lock.state;
    board.release = prep.lock.release;
    board.meta = prep.got ? prep.got.meta : null;
    board.viewSaved = null;
    board.journal = journalFor(id, prep.backend);
    if (prep.unreadable) {
      // Never write over what could not be read — and never show the board left as if it were this one.
      if (!o.early) { board.restoring = true; try { session.load([]); } finally { board.restoring = false; } }
      board.journal.broken(troubleOf(prep.unreadable, 'read'));
      board.opened = { arr: [], len: 0, lastSeq: 0 };
      board.ready = true;
      return false;
    }
    let legacy = null;
    if (id === FIRST_BOARD) { try { legacy = localStorage.getItem(LOCAL_LOG_KEY); } catch (err) { legacy = null; } }
    const owner = prep.lock.state !== 'taken';
    const plan = openPlan({ meta: prep.got.meta, records: prep.got.records, legacy, owner, fallback: false, now: Date.now() });
    // What a quick hand drew while the store was opening stays, after what comes back (boot).
    const early = o.early ? session.getEvents().slice() : [];
    let arr = null;
    if (o.mode === 'restore' && (plan.events.length || !o.early)) {
      board.from = plan.from;
      board.restoring = true;
      try { session.load(plan.events.concat(early)); } finally { board.restoring = false; }
      arr = session.getEvents();
    } else if (!o.early) {
      board.restoring = true;
      try { session.load([]); } finally { board.restoring = false; }
    }
    board.opened = { arr: arr || [], len: arr ? plan.events.length : 0, lastSeq: plan.lastSeq };
    // What the board holds, when its meta does not say (R3 kept none of it): from its records, as of its last event.
    if (!statsOfMeta(prep.got.meta)) {
      let chars = 0;
      for (const r of prep.got.records) chars += (r.text || '').length;
      let last = 0;
      for (const ev of plan.events) if (ev && typeof ev.at === 'number' && ev.at > last) last = ev.at;
      const st = statsOf(plan.events, chars, last || (prep.got.meta && prep.got.meta.created) || 0);
      boards.stats.set(id, st);
      if (owner && prep.got.meta && plan.from === 'store') {
        board.meta = Object.assign({}, prep.got.meta, st, { board: id });
        prep.backend.putMeta(board.meta).catch(() => { /* the next record says it */ });
      }
    } else boards.stats.set(id, statsOfMeta(prep.got.meta));
    if (plan.arm) {
      const a = Object.assign({}, plan.arm);
      // A fresh board replaces what is kept at its first change, never before it.
      if (o.mode === 'fresh') a.whole = false;
      else if (arr && !a.whole) { a.arr = arr; a.len = plan.events.length; }
      board.journal.arm(a);
    } else {
      board.journal.readonly({ kind: 'tab', detail: '' });
      if (!(board.lateGrant && board.lateGrant.id === id)) waitForBoard(id);
    }
    board.ready = true;
    // The other tab let go while this one was opening: taken up now that the board is open.
    if (!plan.arm && board.lateGrant && board.lateGrant.id === id) { const g = board.lateGrant; board.lateGrant = null; boardFreed(id, g.release); }
    if (plan.damaged && plan.arm) say('the board kept in this browser had ' + (plan.damaged.skipped + plan.damaged.bad) + ' unreadable piece' + (plan.damaged.skipped + plan.damaged.bad === 1 ? '' : 's') + ' — what could be read is back, and is written whole again');
    // What the store has not heard: the import, what was drawn while it opened.
    persistBoard();
    return !!arr;
  }
  /**
   * After a board is on the page: its view (unless a hand has moved it since
   * the page opened, or it is a fresh start the page draws on at once), the
   * title, the tile, the address, the device's mark, and "opened" in its entry.
   */
  function afterBoardOpened(id, o) {
    const untouched = view.zoom === 1 && view.panX === 0 && view.panY === 0;
    if (board.mode !== 'fresh' && (!o.boot || untouched)) restoreBoardView(id);
    if (o.address && !EMBED) {
      try { history.replaceState(history.state, '', location.pathname + boardSearch(location.search, id) + location.hash); } catch (err) { /* an address this page may not change */ }
    }
    if (!o.boot) markAfterOpen();
    syncBoardFaces();
    if (boards.how === 'indexeddb') updateBoardEntries([id], (e) => Object.assign({}, e, { opened: Date.now() })).catch(() => { /* when it was opened is a convenience */ });
  }
  /** The device's taught mark, on the board just opened — taught again only where the board's own log says otherwise. */
  function markAfterOpen() {
    const saved = savedMark();
    if (!saved || !saved.mark) return;
    const now = session.getState().commandMark || null;
    if (JSON.stringify(now) !== JSON.stringify(saved.mark)) restoreMark();
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
  /** The list, on a page that keeps no board (a folder, a repository or a room named in the address): read, for the pane and the places. */
  function openBoardsList() {
    boardsListed = boardDB().then((db) => readBoardsList(db)).then((got) => {
      boards.how = 'indexeddb';
      takeBoardsList(got);
    }, () => { boards.how = 'none'; }).then(() => { boards.ready = true; board.ready = true; syncBoardFaces(); });
    return boardsListed;
  }

  // ----- Leaving, switching ---------------------------------------------------
  /**
   * Flush the board on screen and wait until its store holds all of it.
   * null when it may be left; else the verdict (17-boards.js: 'unsaved',
   * 'not-kept', said with the ways out). `force`: the person said leave it.
   */
  async function readyToLeave(force) {
    for (let i = 0; i < 100; i++) {
      board.journal.flush(session.getEvents());
      await board.journal.idle();
      const v = leaveVerdict(Object.assign(board.journal.snapshot(), { name: boardEntryName(board.id) }));
      if (!v) return null;
      if (v.kind !== 'busy') return force ? null : v;
      await new Promise((r) => setTimeout(r, 30));
    }
    return force ? null : { kind: 'busy', words: '“' + boardEntryName(board.id) + '” is still being written — try again in a moment', ways: [] };
  }
  /**
   * Open board `id` (or a place) from the list. In place when a board is on
   * screen: what the next needs is read first, the one on screen flushed and
   * waited on, then — in one task — left, and the next loaded. Resolves true
   * when the page is on it (or leaving for it), false when refused.
   * `o.force`: leave a board that is not saved (the person's second tap);
   * `o.said(verdict)`: where a refusal is said (the pane), else the status line.
   */
  async function switchBoard(id, o) {
    o = o || {};
    if (boards.switching) return false;
    const plan = switchPlan({ entries: [...boards.entries.values()], current: board.id, onBoard: onBoardHere(), target: id });
    const refuse = (v) => { if (o.said) o.said(v); else say(v.words); return false; };
    if (plan.go === 'here') return true;
    if (plan.go === 'missing') return refuse({ kind: 'missing', words: 'that board is not in this browser any more', ways: [] });
    boards.switching = true;
    syncBoardFaces();
    try {
      if (plan.go === 'place') { await openPlace(id); return true; }
      if (plan.restore) await updateBoardEntries([id], (e) => (e.trashed ? restored(e) : null));
      if (plan.go === 'navigate') {
        // A folder, a repository or a room is on screen: what it has not sent goes first, then the board opens in a page of its own.
        if (folder.store && folder.how !== 'static') await saveNow();
        if (folder.saveTrouble && !o.force) return refuse({ kind: 'unsaved', words: troubleWords(folder.saveTrouble).lead, ways: ['export', 'leave'] });
        location.assign(location.pathname + boardSearch(location.search, id) + location.hash);
        return true;
      }
      const prep = await prepareBoard(id);
      await boardOpening(prep.approx);
      const v = await readyToLeave(o.force);
      if (v) { if (prep.lock.release) prep.lock.release(); return refuse(v); }
      // From here to the load, nothing is awaited: no stroke can land in between.
      findLeaving(); // Find (I6): what the board says and how it looks, from the live state, before it is gone
      leaveBoard();
      applyBoard(prep, { mode: 'restore', early: false });
      afterBoardOpened(id, { boot: false, address: true });
      return true;
    } catch (err) {
      return refuse({ kind: 'refused', words: 'could not open that board — ' + ((err && err.message) || err), ways: [] });
    } finally {
      boards.switching = false;
      syncBoardFaces();
    }
  }
  /** A new board, opened. Refused, and nothing made, while the board on screen may not be left. */
  async function newBoard(o) {
    o = o || {};
    if (boards.how !== 'indexeddb') { const v = { kind: 'one', words: 'this browser keeps one board here — open a folder to keep more', ways: [] }; if (o.said) o.said(v); else say(v.words); return false; }
    if (onBoardHere()) { const v = await readyToLeave(o.force); if (v) { if (o.said) o.said(v); else say(v.words); return false; } }
    const entry = newBoardEntry([...boards.entries.values()], mintBoardId(), Date.now(), o.name);
    await writeNewBoard(entry, o.events || null, null);
    const ok = await switchBoard(entry.id, o);
    return ok ? entry : false;
  }
  async function renameBoard(id, raw) {
    const done = await updateBoardEntries([id], (e) => renamed(e, raw));
    return done[0] || null;
  }
  /** A copy under its own id, beside the original: the board on screen as it stands, any other as its store holds it. */
  async function duplicateBoard(id) {
    const src = boards.entries.get(id);
    if (!src || !isKept(src) || boards.how !== 'indexeddb') return null;
    let events;
    if (id === board.id && onBoardHere()) events = session.getEvents().map((ev) => Object.assign({}, ev));
    else { const db = await boardDB(); events = journalFold((await idbBackend(db, id).read()).records).events; }
    const entry = copyEntry([...boards.entries.values()], src, mintBoardId(), Date.now());
    return writeNewBoard(entry, events, prefs.get(BOARD_VIEW_KEY + id, null));
  }
  /** Delete: to the trash, from which it comes back whole. The board on screen: the page goes to another first. */
  async function trashBoard(id, o) {
    o = o || {};
    const e = boards.entries.get(id);
    if (!e || !isKept(e) || e.trashed) return false;
    if (onBoardHere() && id === board.id) {
      const next = nextAfter([...boards.entries.values()], id);
      const ok = next ? await switchBoard(next, o) : await newBoard(o);
      if (!ok) return false;
    }
    await updateBoardEntries([id], (cur) => (cur.trashed ? null : trashed(cur, Date.now())));
    return true;
  }
  async function restoreBoard(id) {
    const done = await updateBoardEntries([id], (e) => (e.trashed ? restored(e) : null));
    return done[0] || null;
  }
  /** The boards whose lock a tab holds — a board open there is never emptied out from under it. */
  async function boardsHeldElsewhere() {
    if (!(navigator.locks && navigator.locks.query)) return [];
    try {
      const q = await navigator.locks.query();
      return (q.held || []).map((l) => l.name || '').filter((n) => n.startsWith('mm-board:')).map((n) => n.slice('mm-board:'.length)).filter((b) => b !== board.id || !onBoardHere());
    } catch (err) { return []; }
  }
  /** What emptying the trash will take, said before it happens (17-boards.js). */
  async function planEmptyTrash() {
    await rereadBoards();
    const stats = {};
    for (const [k, v] of boards.stats) stats[k] = v;
    return emptyTrashPlan([...boards.entries.values()], stats, await boardsHeldElsewhere());
  }
  /** Take a board's lock only if no tab holds it; resolves its release, or null. */
  function boardLockIfFree(id) {
    if (!(navigator.locks && navigator.locks.request)) return Promise.resolve(() => {});
    return new Promise((resolve) => {
      try {
        navigator.locks.request(boardLockName(id), { ifAvailable: true }, (lock) => {
          if (!lock) { resolve(null); return undefined; }
          return new Promise((release) => resolve(release));
        }).catch(() => resolve(null));
      } catch (err) { resolve(null); }
    });
  }
  /**
   * Empty the trash — the second, deliberate tap: every board the plan said,
   * each only while no tab holds it (its lock is taken here for the delete),
   * its entry, meta and every record in one transaction. Nothing else.
   */
  async function emptyTrash(plan) {
    const got = [];
    for (const e of plan.gone) {
      const cur = boards.entries.get(e.id);
      if (!cur || !cur.trashed) continue; // restored since the sentence: kept
      const release = await boardLockIfFree(e.id);
      if (release) got.push({ id: e.id, release });
    }
    try {
      if (got.length) {
        await boardsTx(['boards', 'records', 'meta'], (tx) => {
          for (const g of got) {
            tx.objectStore('records').delete(IDBKeyRange.bound([g.id, 0], [g.id, Infinity]));
            tx.objectStore('meta').delete(g.id);
            tx.objectStore('boards').delete(g.id);
          }
        });
        for (const g of got) { boards.entries.delete(g.id); boards.stats.delete(g.id); prefs.del(BOARD_VIEW_KEY + g.id); }
        findDrop(got.map((g) => g.id)); // Find (I6): what was kept for them goes
      }
    } finally { for (const g of got) g.release(); }
    boardsChanged();
    // The pictures only those boards used go with them — now, and not before (a trashed board is restorable).
    try { await collectAssets(); } catch (err) { /* a board that could not be read: nothing is collected on a guess */ }
    return { gone: got.map((g) => g.id), kept: plan.gone.map((e) => e.id).filter((x) => !got.some((g) => g.id === x)).concat(plan.kept.map((e) => e.id)) };
  }
  /**
   * A log file's text as events (R2): version 1 with its header, version 0 — bare events, every log kept
   * before the header — or the old JSON array. `{ events }` for a log, `{ refused }` with the sentence for
   * a version this build does not read, `{ notLog }` for anything else. One reader for the boards pane's
   * file, the examples and any other text that is meant to be a log.
   */
  function readLogText(text, source) {
    const t = String(text || '').trim();
    let events = null;
    if (t.startsWith('[')) { try { const a = JSON.parse(t); if (Array.isArray(a)) events = a; } catch (err) { events = null; } }
    else {
      try { const d = MM.decodeLog(text, { source }); events = d.skipped ? null : d.events; }
      catch (err) { if (err && err.name === 'LogFormatError') return { refused: err.message }; throw err; }
    }
    if (!events || !events.length || !events.every((ev) => ev && typeof ev.type === 'string')) return { notLog: true };
    return { events };
  }
  /** What a log written by this page says of itself in the status line: the version, and that an older app opens it. */
  function logFileNote() { return ' · log version ' + MM.LOG_VERSION + ' — an older MetaMedium opens it too'; }
  /** What every log this page writes is written with. */
  function logWrite() {
    const app = ((document.querySelector('meta[name="metamedium-version"]') || {}).content || '').trim();
    return app ? { app } : {};
  }
  /** A log file as a new board: one event per line (as *export* writes it, header first), or a JSON array. */
  async function boardFromFile(file, o) {
    const text = await file.text();
    const r = readLogText(text, file.name);
    if (!r.events) {
      const v = { kind: 'file', words: r.refused || '“' + file.name + '” is not a board’s log — one event per line, as export writes it', ways: [] };
      if (o && o.said) o.said(v); else say(v.words);
      return false;
    }
    return newBoard(Object.assign({}, o, { name: String(file.name || '').replace(/\.[^.]*$/, '') || null, events: r.events }));
  }
  /**
   * Reset: a fresh board, never one tap from losing this one. The board on
   * screen goes to the trash (it comes back whole from there) and a fresh one
   * opens under the same name. With no IndexedDB there is nowhere for a
   * second board: the first tap says so, and a second within five seconds
   * empties the one board there is.
   */
  async function resetBoard() {
    if (boards.how !== 'indexeddb') {
      if (Date.now() - board.resetArmed > 5000) { board.resetArmed = Date.now(); say('this browser keeps one board here and has no trash — export the log to keep it; Reset again within 5 s empties it'); return false; }
      board.resetArmed = 0;
      await forgetLocalLog();
      location.reload();
      return true;
    }
    if (!onBoardHere()) return newBoard();
    const cur = boards.entries.get(board.id);
    if (!session.getEvents().length) { flash('this board is already empty'); return false; }
    const v = await readyToLeave();
    if (v) { say(v.words); return false; }
    const entry = newBoardEntry([...boards.entries.values()], mintBoardId(), Date.now(), cur ? cur.name : null);
    await writeNewBoard(entry, null, null);
    if (!(await switchBoard(entry.id))) return false;
    if (cur) await updateBoardEntries([cur.id], (e) => (e.trashed ? null : trashed(e, Date.now())));
    say('a fresh board — what “' + (cur ? cur.name : 'the board') + '” held is in the trash; boards ▸ restore it');
    return true;
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
    if (!persistAsked.done) askPersist();
  }
  // Kept on the iPad (PLAN-IPAD-NOTES I3). Safari clears a site's storage after seven days without a visit
  // unless it is installed or the browser agreed to keep it, so once a board holds something the page asks
  // `navigator.storage.persist()` — once per device (the preference is written before the answer, whatever it
  // is: the browser decides, and asking again is nagging), never for what is not the device's own board
  // (`persistPlan`, 17-boards.js: ?fresh=1, a replay, an embed, a room, a folder). The pane's foot says what it
  // answered (22-boards.js).
  const persistAsked = { done: false };
  function askPersist() {
    let asked = false;
    try { asked = !!localStorage.getItem(PERSIST_KEY); } catch (err) { asked = true; } // no way to remember it: not to be asked on every stroke
    const st = typeof navigator !== 'undefined' ? navigator.storage : null;
    const plan = persistPlan({ supported: !!st && typeof st.persist === 'function', asked: asked, holds: session.getEvents().length > 0, mode: board.mode });
    if (plan.why === 'empty') return; // asked when there is something to keep
    persistAsked.done = true;
    if (!plan.ask) return;
    try { localStorage.setItem(PERSIST_KEY, String(Date.now())); } catch (err) { /* private mode */ }
    Promise.resolve().then(() => st.persist()).then(() => { if (typeof roomChanged === 'function') roomChanged(); }, () => { /* the browser said nothing: the pane says so */ });
  }
  /** On the way out — the tab hidden, the page going — anything not yet written goes now, and where the hand left the board. */
  function flushBoard() {
    saveBoardView();
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
          const id = board.id, jn = board.journal;
          boardDB().then((db) => { if (board.id === id && board.journal === jn) board.backend = idbBackend(db, id); }, () => { board.dbClosed = true; });
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
  function keepBoardIn(store, how, name, handle) {
    return openStore(store, how, name, { carry: session.getEvents().filter((ev) => !ev.by), handle: handle || null });
  }
  /** The other way out: the whole log, as a file to keep. */
  function exportLogNow() {
    const evs = session.getEvents();
    downloadText('canvas.jsonl', MM.encodeLog(evs, logWrite()), 'application/json');
    flash('canvas.jsonl — the whole board, ' + evs.length + ' events, to keep' + logFileNote());
  }
  statusEl.addEventListener('click', (e) => {
    const b = e.target.closest && e.target.closest('button[data-way]');
    if (!b) return;
    if (b.dataset.way === 'export') exportLogNow();
    else if (b.dataset.way === 'folder') openFolder({ carry: true });
  });

  /** Empty the board on screen's store (the e2e starts from nothing with it); resolves when it is. The list keeps its entry. */
  function forgetLocalLog() {
    board.journal.reset();
    try { localStorage.removeItem(LOCAL_LOG_KEY); } catch (err) { /* nothing */ }
    boards.stats.set(board.id, statsOf([], 0, Date.now()));
    board.meta = null;
    return board.backend ? board.backend.clear().catch(() => {}) : Promise.resolve();
  }

  /** For tests: the board's own state, and what its store holds. */
  function boardState() {
    return Object.assign({ id: board.id, ready: board.ready, mode: board.mode, how: board.how, lock: board.lock, from: board.from, warning: boardWarning() }, board.journal.snapshot());
  }
  /** For tests: the list as this page holds it. */
  function boardsState() {
    return {
      ready: boards.ready, how: boards.how, switching: boards.switching, busy: boards.busy > 0,
      current: onBoardHere() ? board.id : null, name: boardOnScreenName(),
      list: [...boards.entries.values()].map((e) => { const x = Object.assign({}, e, { stats: boards.stats.get(e.id) || null }); delete x.handle; return x; }),
    };
  }
  /** For tests: one board as the store holds it — its entry, its meta, how many records, its log. */
  function boardsStore(id) {
    return boardDB().then((db) => new Promise((resolve, reject) => {
      const tx = db.transaction(['boards', 'records', 'meta'], 'readonly');
      const out = { entry: null, meta: null, records: 0, log: [] };
      let recs = [];
      tx.objectStore('boards').get(id).onsuccess = (e) => { out.entry = e.target.result || null; if (out.entry) delete out.entry.handle; };
      tx.objectStore('meta').get(id).onsuccess = (e) => { out.meta = e.target.result || null; };
      tx.objectStore('records').getAll(IDBKeyRange.bound([id, 0], [id, Infinity])).onsuccess = (e) => { recs = e.target.result || []; };
      tx.oncomplete = () => { out.records = recs.length; out.log = journalFold(recs).events; resolve(out); };
      tx.onabort = () => reject(tx.error);
    }));
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
      const pic = MM.isPictureKind(kind);
      const src = pic && r ? pictureSrc(r) : null;
      const preview = r && !pic ? esc(String(r.data.code).slice(0, 160)) : '';
      const img = src ? '<img src="' + esc(src) + '" alt="">' : '';
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
