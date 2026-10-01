// ===== find (the kept index, and the boards' pictures) =====
// Provides: what Find keeps beside the journals (PLAN-IPAD-NOTES I6) — for every board this browser keeps, what it
//   SAYS (the labels, names, typed text, figures' words, Mermaid, picture names, read writing: core's
//   searchEntriesOf) and a small picture of it, in IndexedDB `mm-find` (its own store, version 1: `index` and
//   `thumbs`, each keyed by board), both under one key — the board's own record of its change (core's searchKeyOf:
//   when it changed, its events, its characters, the format's version). findLoad, findChanged (the journal's hook:
//   the board on screen is indexed a moment after the last change, off the pointer path), findLeaving (a board
//   left is indexed and drawn from the live state, in the task that leaves it), findSyncSoon / findSync (every
//   board whose kept index is missing or stale — the board's records read, replayed in a scratch session, never
//   the one on screen), findDrop (a board emptied from the trash), findIdle, findBoards (what a query is asked
//   of), findThumbCurrent (the picture of the board on screen, for the pane), findState (for tests).
// Uses: core (MM.searchEntriesOf, searchKeyOf, stalePlan, thumbFit, createSession, cleanPointsOf, strokePointsOf,
//   boundsOf, pictureOf, getRep), the session (the board on screen), the boards adapter (boards, board, boardDB,
//   idbBackend, openPlan, statsOf, onBoardHere, boardEntryName, boardsListed), boards list (boardShelves),
//   assets (assetGet, pictures — the decoded pictures the paint holds), the find pane (renderFind).
// A fragment of one closure: Demos/build-surface.mjs concatenates surface/*.js
// in name order inside `(function () { ... })();`. Shared state is the closure's; no imports, no exports.
//
// DERIVED, NEVER IN A LOG. Nothing here writes an event: the index and the pictures are what the boards say and
// look like, found again when a board changes, and lost harmlessly (the next sync reads the boards again). A
// board a hand only looked at is never written, and neither is its index until a sync finds it missing.
//
// OFF THE POINTER PATH. A change only restarts a timer (`FIND_DEBOUNCE_MS`); what it fires is read from the state
// the session already holds, when the hand is not on the glass. Another board is read from its own records and
// replayed in a scratch session one at a time, with a pause between, and never while the pointer is down.

  const FIND_DB = 'mm-find';
  const FIND_DEBOUNCE_MS = 1200;
  const FIND_PAUSE_MS = 40;
  /** The picture a board has in the list: its size on the canvas (it is shown at a third of it, for the screens that are twice as dense). */
  const THUMB_W = 240, THUMB_H = 160, THUMB_PAD = 12, THUMB_JPEG = 0.72;
  /** Most marks drawn in one picture, and most pictures decoded for it. */
  const THUMB_MARKS = 6000, THUMB_PICTURES = 12;

  const finder = {
    how: 'none',          // 'indexeddb' | 'memory' (this browser would not keep it: found again each visit)
    loading: null,
    loaded: false,        // what was kept has been read: until then nothing is made, or it would be made again
    index: new Map(),     // board id → { board, key, entries }
    thumbs: new Map(),    // board id → { board, key, src }
    builds: 0,            // indexes made since this page opened (for tests: a kept index is not built again)
    timer: 0,
    syncing: null,
    syncSoon: 0,
    progress: null,       // { done, total } while boards are being read
    down: false,          // the pointer is on the glass
    dbPromise: null,
  };

  addEventListener('pointerdown', () => { finder.down = true; }, { capture: true, passive: true });
  addEventListener('pointerup', () => { finder.down = false; }, { capture: true, passive: true });
  addEventListener('pointercancel', () => { finder.down = false; }, { capture: true, passive: true });

  // ----- the store ---------------------------------------------------------------------------------
  function findDB() {
    if (!finder.dbPromise) {
      finder.dbPromise = new Promise((resolve, reject) => {
        let req;
        try { req = indexedDB.open(FIND_DB, 1); } catch (err) { reject(err); return; }
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains('index')) db.createObjectStore('index', { keyPath: 'board' });
          if (!db.objectStoreNames.contains('thumbs')) db.createObjectStore('thumbs', { keyPath: 'board' });
        };
        req.onsuccess = () => {
          const db = req.result;
          db.onversionchange = () => { db.close(); finder.dbPromise = null; };
          db.onclose = () => { finder.dbPromise = null; };
          resolve(db);
        };
        req.onerror = () => reject(req.error || new DOMException('the browser would not open its storage', 'UnknownError'));
        req.onblocked = () => reject(new DOMException('blocked', 'InvalidStateError'));
      });
      finder.dbPromise.catch(() => { finder.dbPromise = null; });
    }
    return finder.dbPromise;
  }
  /** A transaction over the kept index and pictures; `fn(tx)` issues the requests. Resolves once committed. */
  function findTx(mode, fn) {
    return findDB().then((db) => new Promise((resolve, reject) => {
      let tx, out;
      try { tx = db.transaction(['index', 'thumbs'], mode); out = fn(tx); } catch (err) { try { if (tx) tx.abort(); } catch (e) { /* nothing */ } reject(err); return; }
      tx.oncomplete = () => resolve(out);
      tx.onabort = () => reject(tx.error || new DOMException('the browser abandoned the write', 'AbortError'));
    }));
  }
  /** Written, and never waited on: what is kept here is found again if it is lost. */
  function findWrite(store, rec) { findTx('readwrite', (tx) => { tx.objectStore(store).put(rec); }).catch(() => { finder.how = finder.how === 'indexeddb' ? 'memory' : finder.how; }); }

  /** What was kept, read once into memory: a query is asked of memory. */
  function findLoad() {
    if (finder.loading) return finder.loading;
    finder.loading = (async () => {
      try {
        const got = await findTx('readonly', (tx) => {
          const out = { index: [], thumbs: [] };
          tx.objectStore('index').getAll().onsuccess = (e) => { out.index = e.target.result || []; };
          tx.objectStore('thumbs').getAll().onsuccess = (e) => { out.thumbs = e.target.result || []; };
          return out;
        });
        // What this page has made since it opened is newer than what was kept.
        for (const r of got.index) if (r && typeof r.board === 'string' && Array.isArray(r.entries) && !finder.index.has(r.board)) finder.index.set(r.board, r);
        for (const r of got.thumbs) if (r && typeof r.board === 'string' && typeof r.src === 'string' && !finder.thumbs.has(r.board)) finder.thumbs.set(r.board, r);
        finder.how = 'indexeddb';
      } catch (err) { finder.how = 'memory'; }
      finder.loaded = true;
      findNotify();
    })();
    return finder.loading;
  }
  function findNotify() {
    if (typeof renderFind === 'function') renderFind();
    if (typeof renderBoardsPane === 'function') renderBoardsPane();
  }

  // ----- keys, and what is wanted -----------------------------------------------------------------------
  const findKeyOf = (id) => MM.searchKeyOf(boards.stats.get(id));
  /** The board's use, for a tie and for the order boards are read in: the latest of when it was opened and changed. */
  function findRecency(e) {
    const st = boards.stats.get(e.id);
    return Math.max(e.opened || 0, (st && st.changed) || 0, e.created || 0);
  }
  /** The boards this browser keeps and has not thrown away, most recent first. */
  function findWanted() {
    return boardShelves([...boards.entries.values()]).boards.sort((a, b) => findRecency(b) - findRecency(a));
  }
  /** What a query is asked of: every board on the list, the name always, and what it says when that is known. */
  function findBoards() {
    return findWanted().map((e) => {
      const idx = finder.index.get(e.id);
      return { id: e.id, name: boardEntryName(e.id), recency: findRecency(e), entries: idx ? idx.entries : [] };
    });
  }
  /** Whether the board on screen is one this page may index: its own, read, not being loaded, and not another tab's. */
  function findCurrentOk(leaving) {
    return onBoardHere() && board.ready && !board.restoring && board.lock !== 'taken' && (leaving || !boards.switching);
  }

  // ----- the board on screen --------------------------------------------------------------------------------
  /** The board on screen, indexed as it stands now — when its kept index is not for what it holds. */
  function findIndexCurrent(leaving) {
    if (!findCurrentOk(leaving)) return false;
    if (!finder.loaded && !leaving) { findLoad(); return false; }
    const id = board.id, key = findKeyOf(id);
    if (!key) return false;
    const held = finder.index.get(id);
    if (held && held.key === key) return false;
    const rec = { board: id, key, entries: MM.searchEntriesOf(session.getState()) };
    finder.index.set(id, rec);
    finder.builds++;
    findWrite('index', rec);
    findNotify();
    return true;
  }
  /** A change was journaled (17-folder.js): the board on screen is indexed a moment after the last one. */
  function findChanged(id) {
    if (id !== board.id) return;
    if (finder.timer) clearTimeout(finder.timer);
    finder.timer = setTimeout(findRun, FIND_DEBOUNCE_MS);
  }
  /** The debounced run: only while the hand is not on the glass, and when the browser has a moment. */
  function findRun() {
    finder.timer = 0;
    if (finder.down) { finder.timer = setTimeout(findRun, 400); return; }
    const go = () => { try { findIndexCurrent(); findThumbCurrent(false); } catch (err) { /* the index is a convenience */ } };
    if (typeof requestIdleCallback === 'function') requestIdleCallback(go, { timeout: 2000 }); else go();
  }

  // ----- the picture of a board ------------------------------------------------------------------------------------
  /**
   * A board drawn small, from its state: the pictures first (as the paint draws them, under the ink), a faint plate
   * where anything else stands, then the ink — its clean form where it holds one — in its maker's colour. `pic(asset)`
   * is a decoded bitmap or nothing (a plate then). The same marks, forms and colours the canvas draws, in a picture
   * of its own: the board on screen is never repainted for it. Returns a JPEG as a data URL, or null.
   */
  function findPaintThumb(st, pic) {
    const cv = document.createElement('canvas');
    cv.width = THUMB_W; cv.height = THUMB_H;
    const g = cv.getContext('2d');
    if (!g) return null;
    const cs = getComputedStyle(document.documentElement);
    const tok = (n, d) => cs.getPropertyValue(n).trim() || d;
    g.fillStyle = tok('--ground', '#f8f6f1');
    g.fillRect(0, 0, THUMB_W, THUMB_H);
    const ink = tok('--ink', '#222'), agent = tok('--agent', '#68a'), goldRGB = tok('--gold-rgb', '201,168,76');
    const gone = (n) => n.reps.some((r) => r.modality === 'erased');
    const items = [];
    let box = null;
    const grow = (b) => { if (!b || !MM.finiteBounds(b)) return; box = box ? { minX: Math.min(box.minX, b.minX), minY: Math.min(box.minY, b.minY), maxX: Math.max(box.maxX, b.maxX), maxY: Math.max(box.maxY, b.maxY) } : { minX: b.minX, minY: b.minY, maxX: b.maxX, maxY: b.maxY }; };
    const artifacts = new Set(st.artifacts);
    const inkOf = (n) => {
      const pts = MM.cleanPointsOf(n) || MM.strokePointsOf(n);
      if (!pts || pts.length < 2) return;
      const b = MM.getBounds(pts);
      grow(b);
      const made = n.edges.find((e) => e.rel === 'made-by');
      items.push({ k: 'ink', pts, colour: !made || made.to === MM.LOCAL_PARTICIPANT ? ink : agent });
    };
    let pictures = 0;
    for (const id of st.contentIds) {
      const n = st.nodes.get(id);
      if (!n || gone(n)) continue;
      if (artifacts.has(id)) {
        const b = MM.boundsOf(n);
        if (!b) continue;
        grow(b);
        const p = MM.pictureOf(n);
        const code = MM.getRep(n, 'code');
        const kind = code && code.data && code.data.kind;
        items.push({ k: p ? 'pic' : 'plate', b, asset: p && p.asset, text: kind === 'text' || kind === 'md' });
        if (!p && kind !== 'text' && kind !== 'md') for (const e of n.edges) { if (e.rel !== 'has-part') continue; const m = st.nodes.get(e.to); if (m && !gone(m)) inkOf(m); }
        if (p) pictures++;
      } else inkOf(n);
      if (items.length > THUMB_MARKS * 2) break;
    }
    const fit = MM.thumbFit(box, THUMB_W, THUMB_H, THUMB_PAD);
    g.setTransform(fit.scale, 0, 0, fit.scale, fit.x, fit.y);
    g.lineCap = 'round'; g.lineJoin = 'round';
    const px = 1 / fit.scale;
    let decoded = 0;
    for (const it of items) {
      if (it.k !== 'pic') continue;
      const bmp = it.asset && decoded < THUMB_PICTURES ? pic(it.asset) : null;
      if (bmp) { decoded++; try { g.drawImage(bmp, it.b.minX, it.b.minY, it.b.maxX - it.b.minX, it.b.maxY - it.b.minY); continue; } catch (err) { /* a plate, then */ } }
      g.fillStyle = 'rgba(' + goldRGB + ',0.14)';
      g.fillRect(it.b.minX, it.b.minY, it.b.maxX - it.b.minX, it.b.maxY - it.b.minY);
    }
    for (const it of items) {
      if (it.k !== 'plate') continue;
      g.fillStyle = 'rgba(' + goldRGB + ',0.07)';
      g.fillRect(it.b.minX, it.b.minY, it.b.maxX - it.b.minX, it.b.maxY - it.b.minY);
      g.strokeStyle = 'rgba(' + goldRGB + ',0.45)'; g.lineWidth = 1.2 * px;
      g.strokeRect(it.b.minX, it.b.minY, it.b.maxX - it.b.minX, it.b.maxY - it.b.minY);
      if (it.text) {
        // A few lines where words stand: what a text looks like at a glance.
        g.strokeStyle = 'rgba(' + goldRGB + ',0.5)';
        const w = it.b.maxX - it.b.minX, h = it.b.maxY - it.b.minY, rows = Math.max(1, Math.min(6, Math.floor((h * fit.scale - 6) / 5)));
        for (let r = 0; r < rows; r++) { const y = it.b.minY + ((r + 1) * h) / (rows + 1); g.beginPath(); g.moveTo(it.b.minX + w * 0.08, y); g.lineTo(it.b.minX + w * (r === rows - 1 ? 0.5 : 0.92), y); g.stroke(); }
      }
    }
    const inks = items.filter((it) => it.k === 'ink');
    const stride = inks.length > THUMB_MARKS ? Math.ceil(inks.length / THUMB_MARKS) : 1;
    g.lineWidth = Math.max(1.3 * px, 0.6);
    const tol2 = px * px * 0.64;
    for (let i = 0; i < inks.length; i += stride) {
      const it = inks[i], pts = it.pts;
      g.strokeStyle = it.colour;
      g.beginPath();
      let lx = pts[0].x, ly = pts[0].y;
      g.moveTo(lx, ly);
      for (let j = 1; j < pts.length; j++) {
        const p = pts[j];
        if (j < pts.length - 1) { const dx = p.x - lx, dy = p.y - ly; if (dx * dx + dy * dy < tol2) continue; }
        g.lineTo(p.x, p.y); lx = p.x; ly = p.y;
      }
      g.stroke();
    }
    try { return cv.toDataURL('image/jpeg', THUMB_JPEG); } catch (err) { return null; }
  }
  /** The board on screen drawn small now — from the pictures the canvas already holds decoded. Kept under the key of what it holds. */
  function findThumbCurrent(force, leaving) {
    if (!findCurrentOk(leaving)) return false;
    if (!finder.loaded && !leaving) return false;
    const id = board.id, key = findKeyOf(id);
    if (!key) return false;
    const held = finder.thumbs.get(id);
    if (held && (held.key === key || !force)) return false;
    const src = findPaintThumb(session.getState(), (a) => { const e = pictures.get(a); return e && e.bmp ? e.bmp : null; });
    if (!src) return false;
    const rec = { board: id, key, src };
    finder.thumbs.set(id, rec);
    findWrite('thumbs', rec);
    findNotify();
    return true;
  }
  /** The board is being left (17-folder.js's switchBoard, before it goes): what it says and how it looks, from the live state — it will not be there in a moment. */
  function findLeaving() {
    try {
      findIndexCurrent(true);
      findThumbCurrent(true, true);
    } catch (err) { /* a board is left whatever Find makes of it */ }
  }

  // ----- every other board ------------------------------------------------------------------------------------------
  const findPause = (ms) => new Promise((r) => setTimeout(r, ms));
  /** The decoded pictures a thumbnail needs, for a board replayed in a scratch session: read from the asset store, small. */
  async function findPictures(st) {
    const out = new Map();
    for (const id of st.artifacts) {
      if (out.size >= THUMB_PICTURES) break;
      const n = st.nodes.get(id), p = n && MM.pictureOf(n);
      if (!p || !p.asset || out.has(p.asset)) continue;
      try {
        const rec = await assetGet(p.asset);
        if (!rec) continue;
        const blob = new Blob([rec.bytes], { type: rec.mime || 'image/jpeg' });
        const w = rec.w || p.w, h = rec.h || p.h;
        let bmp = null;
        if (w && h) { const k = Math.min(1, 320 / Math.max(w, h)); try { bmp = await createImageBitmap(blob, { resizeWidth: Math.max(1, Math.round(w * k)), resizeHeight: Math.max(1, Math.round(h * k)), resizeQuality: 'low' }); } catch (err) { bmp = null; } }
        if (!bmp) bmp = await createImageBitmap(blob);
        out.set(p.asset, bmp);
      } catch (err) { /* a plate, then */ }
    }
    return out;
  }
  /** One board, other than the one on screen: its records read, replayed in a scratch session, what it says kept and its picture drawn. */
  async function findBuildOther(id) {
    const db = await boardDB();
    const key0 = findKeyOf(id);
    const got = await idbBackend(db, id).read();
    const plan = openPlan({ meta: got.meta, records: got.records, legacy: null, owner: true, fallback: false, now: Date.now() });
    let key = key0;
    if (!key) {
      // A board R3 kept and no one has opened since says nothing of what it holds: said from its records, as opening it would.
      let chars = 0, last = 0;
      for (const r of got.records) chars += (r.text || '').length;
      for (const ev of plan.events) if (ev && typeof ev.at === 'number' && ev.at > last) last = ev.at;
      boards.stats.set(id, statsOf(plan.events, chars, last || (got.meta && got.meta.created) || 0));
      key = findKeyOf(id);
    }
    const scratch = MM.createSession();
    scratch.load(plan.events);
    const st = scratch.getState();
    const entries = MM.searchEntriesOf(st);
    const pics = await findPictures(st);
    let src = null;
    try { src = findPaintThumb(st, (a) => pics.get(a) || null); } finally { for (const b of pics.values()) { try { b.close(); } catch (err) { /* gone */ } } }
    const rec = { board: id, key, entries };
    finder.index.set(id, rec);
    finder.builds++;
    findWrite('index', rec);
    if (src) { const t = { board: id, key, src }; finder.thumbs.set(id, t); findWrite('thumbs', t); }
  }

  /**
   * Every board whose kept index is missing or stale, read and indexed, the most recent first, one at a time with a
   * pause between, and each a quiet moment: nothing while the pointer is down. The board on screen is indexed from
   * its live state. A board no longer wanted (emptied from the trash) is let go. One sync runs at a time.
   */
  function findSync() {
    if (finder.syncing) return finder.syncing;
    finder.syncing = (async () => {
      try {
        await findLoad();
        for (let i = 0; i < 300 && !(boards.ready && board.ready); i++) await findPause(100);
        if (boards.how !== 'indexeddb') return;
        if (boardsListed) await boardsListed.catch(() => {});
        const wanted = findWanted();
        const held = {};
        for (const id of new Set([...finder.index.keys(), ...finder.thumbs.keys()])) {
          const idx = finder.index.get(id), th = finder.thumbs.get(id);
          // The board on screen is drawn on leaving and when its pane opens; every other is drawn with what it says.
          const isCur = onBoardHere() && id === board.id;
          held[id] = idx && th && (th.key === idx.key || isCur) ? idx.key : '~';
        }
        const plan = MM.stalePlan(wanted.map((e) => ({ id: e.id, key: findKeyOf(e.id) })), held);
        for (const id of plan.drop) { finder.index.delete(id); finder.thumbs.delete(id); }
        if (plan.drop.length) findTx('readwrite', (tx) => { for (const id of plan.drop) { tx.objectStore('index').delete(id); tx.objectStore('thumbs').delete(id); } }).catch(() => {});
        // A board that has no key yet (nothing said of what it holds) is built too: its key is made from its records.
        const build = [...new Set(plan.build.concat(wanted.filter((e) => !findKeyOf(e.id)).map((e) => e.id)))];
        let done = 0;
        for (const id of build) {
          finder.progress = { done, total: build.length };
          findNotify();
          while (finder.down) await findPause(200);
          try {
            if (onBoardHere() && id === board.id) { findIndexCurrent(); findThumbCurrent(false); }
            else if (boards.entries.has(id)) await findBuildOther(id);
          } catch (err) { /* a board that cannot be read is found by its name only */ }
          done++;
          await findPause(FIND_PAUSE_MS);
        }
      } finally {
        finder.progress = null;
        finder.syncing = null;
        findNotify();
      }
    })();
    return finder.syncing;
  }
  /** Soon, and once: the list changed, or the page has just opened. */
  function findSyncSoon(ms) {
    if (finder.syncSoon) clearTimeout(finder.syncSoon);
    finder.syncSoon = setTimeout(() => { finder.syncSoon = 0; findSync(); }, ms === undefined ? 900 : ms);
  }
  /** Boards emptied from the trash: what was kept for them goes. */
  function findDrop(ids) {
    for (const id of ids) { finder.index.delete(id); finder.thumbs.delete(id); }
    if (ids.length) findTx('readwrite', (tx) => { for (const id of ids) { tx.objectStore('index').delete(id); tx.objectStore('thumbs').delete(id); } }).catch(() => {});
  }
  /** Everything pending done now (for tests, and for a query asked a moment after a change): the debounce run, and a sync. */
  async function findIdle() {
    if (finder.timer) { clearTimeout(finder.timer); finder.timer = 0; }
    if (finder.syncSoon) { clearTimeout(finder.syncSoon); finder.syncSoon = 0; }
    await findLoad();
    findIndexCurrent();
    await findSync();
    findIndexCurrent();
    return true;
  }
  /** For tests: what is kept, by board — its key and how much it holds — and how many indexes this page has made. */
  function findState() {
    return {
      how: finder.how, builds: finder.builds, syncing: !!finder.syncing, progress: finder.progress ? Object.assign({}, finder.progress) : null,
      index: Object.fromEntries([...finder.index].map(([k, v]) => [k, { key: v.key, entries: v.entries.length }])),
      thumbs: Object.fromEntries([...finder.thumbs].map(([k, v]) => [k, { key: v.key, bytes: v.src.length }])),
    };
  }

  // The page has opened: after the board has, read what was kept and bring it up to date — once, when the page is quiet.
  setTimeout(() => { findLoad().then(() => findSyncSoon(1500)); }, 2500);
