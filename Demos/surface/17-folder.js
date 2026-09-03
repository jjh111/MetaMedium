// ===== folder =====
// Provides: the folder as the canvas — openFolder/openStatic/openStore (discovery into artifacts,
//   per-participant logs merged), autosave (to the folder, else browser storage), the live budget
//   (liveSet), the grid and focus views (setViewMode, focusOn), imageUrlFor, folderStatus.
// Uses: core, view (fitAll, afterViewChange), artifacts, render.
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
    me: (() => { try { return localStorage.getItem(PARTICIPANT_KEY) || 'local'; } catch (err) { return 'local'; } })(),
    myPrevious: [], loadedCount: 0, entries: [], truncated: false,
    urls: new Map(), saveTimer: 0, lastSave: '', saving: false, error: '',
  };

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

  async function openFolder() {
    if (!window.showDirectoryPicker) { flash('this browser cannot open a folder — Chrome and Edge can'); return null; }
    let handle;
    try { handle = await window.showDirectoryPicker({ mode: 'readwrite' }); } catch (err) { return null; }
    const store = new MM.FolderStore(handle);
    return openStore(store, 'folder', handle.name);
  }

  async function openStatic(base) {
    const store = new MM.StaticStore(base, (url) => fetch(url));
    return openStore(store, 'static', base);
  }

  /**
   * Open any store: load the merged logs, discover the files, place what is
   * new. Opening the same store again is what a second machine does after a
   * pull — the board comes back and nothing is discovered twice.
   */
  async function openStore(store, how, name) {
    folder.store = store; folder.how = how || 'store'; folder.name = name || ''; folder.error = '';
    let logs = {};
    try { logs = await store.readLogs(); } catch (err) { folder.error = 'could not read the logs: ' + (err.message || err); }
    const merged = MM.mergeLogs(logs);
    const meKey = MM.participantOfLog(MM.logPathFor(folder.me));
    folder.myPrevious = (logs[meKey] || []).slice();
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
    flash('opened ' + (folder.name || 'a folder') + ': ' + entries.length + ' file' + (entries.length === 1 ? '' : 's') + (folder.truncated ? ' shown — the folder holds more' : ''));
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
  // whole (nobody else writes it) — else to browser storage, so a reload
  // replays and a crash loses nothing.
  function myLogNow() {
    const evs = session.getEvents();
    folder.loadedCount = Math.min(folder.loadedCount, evs.length);
    const present = new Set(evs.slice(0, folder.loadedCount).map((e) => JSON.stringify(e)));
    const kept = folder.myPrevious.filter((e) => present.has(JSON.stringify(e)));
    return kept.concat(evs.slice(folder.loadedCount));
  }

  function scheduleSave() {
    clearTimeout(folder.saveTimer);
    folder.saveTimer = setTimeout(saveNow, folder.store ? 300 : 900);
  }

  /** A cheap key for "has the log changed": its length and its last event's time. */
  function logKey(evs) {
    const last = evs[evs.length - 1];
    return evs.length + ':' + (last ? (last.at || 0) + ':' + last.type : '');
  }

  async function saveNow() {
    const evs = session.getEvents();
    if (folder.store && folder.store.capabilities().write) {
      const mine = myLogNow();
      const text = MM.encodeLog(mine);
      if (text === folder.lastSave) return;
      folder.saving = true;
      try { await folder.store.write(MM.logPathFor(folder.me), text); folder.lastSave = text; folder.error = ''; }
      catch (err) { folder.error = 'could not save: ' + (err.message || err); }
      folder.saving = false;
    } else if (!folder.store) {
      // Browser storage holds the whole log; writing it is the one cost here,
      // so it is written only when the log actually changed.
      const key = logKey(evs);
      if (key === folder.lastSave) return;
      folder.lastSave = key;
      try { localStorage.setItem(LOCAL_LOG_KEY, JSON.stringify(evs)); } catch (err) { /* storage full or private */ }
    }
  }

  /** What browser storage held from last time, when there is no folder. */
  function restoreLocalLog() {
    if (params.has('replay') || params.has('fresh')) return false;
    try {
      const raw = localStorage.getItem(LOCAL_LOG_KEY);
      if (!raw) return false;
      const evs = JSON.parse(raw);
      if (!Array.isArray(evs) || !evs.length) return false;
      session.load(evs);
      return true;
    } catch (err) { return false; }
  }
  function forgetLocalLog() {
    try { localStorage.removeItem(LOCAL_LOG_KEY); } catch (err) { /* nothing */ }
  }

  function folderStatus() {
    if (!folder.store) return '';
    const n = folder.entries.length;
    return (folder.how === 'static' ? 'site' : 'folder') + (folder.name ? ' ' + folder.name : '') + ' · ' + n + ' file' + (n === 1 ? '' : 's') +
      (folder.truncated ? '+' : '') + (folder.error ? ' · ' + folder.error : folder.store.capabilities().write ? (folder.saving ? ' · saving' : ' · saved') : ' · read-only');
  }

  // ===== The live budget =======================================================
  // Only the nearest N live artifacts render as iframes; the rest are parked
  // cards. Panning swaps them. The status line says how many are live.
  function liveSet(s) {
    const live = s.live.filter((id) => !s.nodes.get(id).reps.some((r) => r.modality === 'erased'));
    if (live.length <= LIVE_BUDGET) return new Set(live);
    const c = screenToWorld(innerWidth / 2, innerHeight / 2);
    const scored = live.map((id) => {
      const b = MM.boundsOf(s.nodes.get(id));
      const d = b ? Math.hypot((b.minX + b.maxX) / 2 - c.x, (b.minY + b.maxY) / 2 - c.y) : Infinity;
      return { id, d };
    }).sort((p, q) => p.d - q.d);
    return new Set(scored.slice(0, LIVE_BUDGET).map((x) => x.id));
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
  }

  function renderGrid(s) {
    const order = gridOrder(s);
    let html = '<div class="gridBar"><b>' + order.length + '</b> artifact' + (order.length === 1 ? '' : 's') +
      ' · sort <button data-sort="name">name</button><button data-sort="kind">kind</button><button data-sort="recency">recency</button><button data-sort="folder">folder</button>' +
      '<span class="how">click a card to focus it; Esc back to the canvas</span></div><div class="cards">';
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
    const sortBtn = e.target.closest && e.target.closest('button[data-sort]');
    if (sortBtn) { gridSort = sortBtn.getAttribute('data-sort'); renderGrid(session.getState()); return; }
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
    flash('focus: ' + (MM.wordOf(s.nodes.get(id)) || id) + ' · ← → for the next, Esc for the canvas');
  }
  function focusStep(delta) {
    const order = gridOrder(session.getState());
    if (!order.length) return;
    const i = ((focusIndex < 0 ? 0 : focusIndex + delta) + order.length) % order.length;
    focusOn(order[i]);
  }

  document.getElementById('gridBtn').onclick = () => setViewMode(viewMode === 'grid' ? 'canvas' : 'grid');
  document.getElementById('folderBtn').onclick = () => { openFolder(); };
  addEventListener('keydown', (e) => {
    if (e.target !== document.body && e.target !== document && e.target !== window) return;
    if (e.key === 'Escape' && viewMode !== 'canvas') { setViewMode('canvas'); e.preventDefault(); }
    if (viewMode === 'focus' && e.key === 'ArrowRight') { focusStep(1); e.preventDefault(); }
    if (viewMode === 'focus' && e.key === 'ArrowLeft') { focusStep(-1); e.preventDefault(); }
  });
