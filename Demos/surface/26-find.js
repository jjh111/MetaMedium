// ===== find (the pane) =====
// Provides: the search field under the bar (PLAN-IPAD-NOTES I6) — one tap on *find*, or `/`, or ⌘K / Ctrl K (⌘F
//   too: the board has no page text for the browser's own find to look through) — a word typed is looked for on
//   EVERY board this browser keeps, as it is typed, and the boards that say it are listed, each hit as the words in
//   context (*“Pricing” — label on a box · Board “Q4 notes”*); a tap on one opens that board in place (the switch
//   the boards pane does) and takes the view to what was found, which is ringed for a moment. renderFind (the kept
//   index landed, or a board changed), openFind / closeFind, findOpenHit, findShow, findFlashState (for tests).
//   With the semantic seat held (I9, 03-semantic.js) the same query is also asked by meaning — what no word typed
//   matched is let in when the seat scores it near, each such hit said *by meaning 0.72* — and likeNotes (the field's
//   *Notes like this*, a region's button) lists the notes nearest one thing's words across every board in this same
//   list, each with its number and reason. With nobody in the seat none of that exists and Find is as it was.
// Uses: ui (pane, esc), controls (openPane, closePanel, tiles), core (MM.searchBoards, describeHit, boundsOf,
//   getRep), the session, view (fitTo, view, worldToScreen), the boards adapter (board, boards, onBoardHere,
//   switchBoard), the kept index (finder, findBoards, findSync, findIdle, findIndexCurrent), the boards pane
//   (rereadBoards), input (say, flash), the semantic seat (semanticHost, findSemantic, semanticNotesLike).
// A fragment of one closure: Demos/build-surface.mjs concatenates surface/*.js
// in name order inside `(function () { ... })();`. Shared state is the closure's; no imports, no exports.
//
// SEARCHING IS READING. Nothing here writes an event: a tap opens a board and moves the view, as a tap on the
// boards pane's row does, and the ring that says where is drawn on a layer of its own over the canvas, never in
// the paint and never in the log. The query is asked of memory (17-find.js keeps what every board says), so it
// answers as it is typed; what is not yet indexed is read in the background and the list fills as it lands.

  const findBtn = document.getElementById('findBtn');
  const findPanel = document.getElementById('findPanel');
  const findInput = document.getElementById('findInput');
  const findStatusEl = document.getElementById('findStatus');
  const findList = findPanel ? findPanel.querySelector('.fdList') : null;
  /** What the pane holds between paints: the hit the keys are on, the boards shown whole. */
  const fd = {
    sel: 0, whole: new Set(), query: '',
    // The semantic seat's side (I9): the score function made for the last query asked by meaning, and the key it was made under
    // (the query and how many entries stood then); and *notes like this* when a thing's words are being looked for instead of a typed word.
    sem: { fn: null, key: '', pending: '', timer: 0 }, like: null, likeSeq: 0,
  };
  /** How long a typed query rests before it is asked by meaning: a word being typed is not asked at every key. */
  const FIND_SEM_MS = 180;
  /** A board shows this many hits until a tap on *more*. */
  const FIND_HITS = 5;
  /** The ring round what was found: how long it stays, and the least a find is shown at (a label is small; the view should not be a blob). */
  const FIND_FLASH_MS = 2600, FIND_MIN_W = 320, FIND_MIN_H = 220, FIND_AIR = 1.6;

  if (findPanel) ui.pane(findPanel, 'find', () => closeFind());
  const findOpen = () => !!findPanel && !findPanel.hasAttribute('hidden');
  function openFind(keepLike) {
    if (!findPanel || EMBED) return;
    if (!keepLike) { fd.like = null; findInput.placeholder = ''; }
    if (!findOpen()) openPane(findPanel, findBtn);
    findInput.focus();
    findInput.select();
    // What may have changed since: another tab's boards, this board's last stroke, boards never read.
    findIndexCurrent();
    rereadBoards().then(() => { findSync(); renderFind(); });
    renderFind();
  }
  function closeFind() {
    if (!findPanel) return;
    closePanel(findPanel, findBtn);
    if (document.activeElement === findInput) findInput.blur();
  }
  if (findBtn) findBtn.onclick = () => { if (findOpen()) closeFind(); else openFind(); };

  // ----- the list -------------------------------------------------------------------------------------------------
  function fdEl(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined && text !== null) e.textContent = text;
    return e;
  }
  /** The words of a hit with what matched marked, the way a person typing sees it. */
  function fdWords(h) {
    const out = fdEl('span', 'fdText');
    let at = 0;
    const text = h.text;
    out.appendChild(document.createTextNode('“'));
    for (const sp of h.spans || []) {
      if (sp[0] < at || sp[1] > text.length) continue;
      if (sp[0] > at) out.appendChild(document.createTextNode(text.slice(at, sp[0])));
      out.appendChild(fdEl('mark', '', text.slice(sp[0], sp[1])));
      at = sp[1];
    }
    if (at < text.length) out.appendChild(document.createTextNode(text.slice(at)));
    out.appendChild(document.createTextNode('”'));
    return out;
  }
  function fdHitEl(h) {
    const b = fdEl('button', 'fdHit');
    b.type = 'button';
    b.dataset.board = h.board;
    if (h.id) b.dataset.id = h.id;
    b.dataset.kind = h.kind;
    b.title = MM.describeHit(h);
    if (h.kind === 'board') { b.appendChild(fdEl('span', 'fdText', 'open this board')); b.appendChild(fdEl('span', 'fdWhat', ' — its name says it')); }
    else {
      b.appendChild(fdWords(h));
      b.appendChild(fdEl('span', 'fdWhat', ' — ' + h.what + (h.meaning && !(h.spans && h.spans.length) && !h.reason ? ' · by meaning ' + h.meaning.toFixed(2) : '')));
      // *Notes like this*: each note says why it is near — its number, what measured it, whether a word is shared.
      if (h.reason) { b.appendChild(fdEl('span', 'fdWhy', h.reason)); b.title = h.reason; }
    }
    return b;
  }

  /** One board's group of hits, as the list shows it; the hit buttons go into `hits` for the keys. */
  function fdGroupEl(g, hits) {
    const box = fdEl('div', 'fdGroup');
    box.dataset.board = g.board;
    const here = onBoardHere() && board.id === g.board;
    const head = fdEl('div', 'fdHead');
    head.appendChild(fdEl('span', 'fdBoardName', g.name));
    if (here) head.appendChild(ui.chip('here', { cls: 'bdHere', why: 'the board on screen' }));
    box.appendChild(head);
    const shown = fd.whole.has(g.board) ? g.hits : g.hits.slice(0, FIND_HITS);
    for (const h of shown) { const el = fdHitEl(h); hits.push(el); box.appendChild(el); }
    const rest = g.hits.length - shown.length + g.more;
    if (rest > 0) {
      const m = fdEl('button', 'fdMore', rest + ' more on this board');
      m.type = 'button';
      m.dataset.whole = g.board;
      box.appendChild(m);
    }
    return box;
  }
  /** The entries every board says, counted: part of what a meaning score was made under. */
  const fdEntryCount = (kept) => kept.reduce((n, b) => n + b.entries.length, 0);
  /**
   * Ask the seat about this query, once it has rested: the query and every entry text it lacks are embedded, and the score
   * function that comes back is kept for the list, which is drawn again. Never at a key, never with nobody in the seat.
   */
  function fdAskMeaning(q, kept) {
    const key = q.trim() + '|' + fdEntryCount(kept);
    if (fd.sem.key === key || fd.sem.pending === key) return;
    fd.sem.pending = key;
    clearTimeout(fd.sem.timer);
    fd.sem.timer = setTimeout(async () => {
      const fn = await findSemantic(q, findBoards());
      if (fd.sem.pending !== key) return;
      fd.sem.pending = '';
      if (fn) { fd.sem.fn = fn; fd.sem.key = key; renderFind(); }
    }, FIND_SEM_MS);
  }

  /** The list for what is typed: grouped by board, a board by its best hit, the words in context — and by meaning too while the seat is held. */
  function renderFind() {
    if (!findPanel || !findList || !findOpen()) return;
    const q = findInput.value;
    fd.query = q;
    const kept = findBoards();
    if (fd.like) { renderLike(kept); return; }
    const frag = document.createDocumentFragment();
    const hits = [];
    const seat = semanticHost();
    if (!seat) { fd.sem.fn = null; fd.sem.key = ''; fd.sem.pending = ''; }
    if (!/[\p{L}\p{N}]/u.test(q)) {
      findStatusEl.textContent = kept.length
        ? 'a word is looked for on every board you keep here — labels, names, typed text, figures, Mermaid, and what was read from writing' + (seat ? ' — and by meaning, by ' + seat.name : '')
        : 'there is no board here to look through yet';
    } else {
      if (seat) fdAskMeaning(q, kept);
      const groups = MM.searchBoards(kept, q, Object.assign({ hitsPerBoard: 60 }, seat && fd.sem.fn ? { semantic: fd.sem.fn } : {}));
      for (const g of groups) frag.appendChild(fdGroupEl(g, hits));
      const reading = finder.progress ? ' · reading the boards… ' + finder.progress.done + ' of ' + finder.progress.total : '';
      const meaning = seat ? (fd.sem.pending ? ' · reading by meaning…' : ' · by meaning too') : '';
      const n = kept.length;
      findStatusEl.textContent = groups.length
        ? groups.length + ' board' + (groups.length === 1 ? '' : 's') + ' of ' + n + ' say it' + reading + meaning
        : 'nothing on ' + (n === 1 ? 'the board' : n + ' boards') + ' says “' + q.trim() + '”' + reading + meaning;
    }
    findList.replaceChildren(frag);
    fd.sel = Math.min(fd.sel, Math.max(0, hits.length - 1));
    fdMark(hits);
  }

  // ----- notes like this (I9) -------------------------------------------------------------------------------------------
  /** The list for *notes like this*: the thing's words at the head, then the notes nearest it, by board, each with its reason. */
  function renderLike(kept) {
    const L = fd.like;
    const frag = document.createDocumentFragment();
    const hits = [];
    const head = fdEl('div', 'fdLikeHead');
    head.appendChild(fdEl('span', 'fdText', 'notes like “' + (L.text.length > 90 ? L.text.slice(0, 90) + '…' : L.text) + '”'));
    const clear = fdEl('button', 'fdMore', 'search instead');
    clear.type = 'button';
    clear.dataset.likeClear = '1';
    head.appendChild(clear);
    frag.appendChild(head);
    if (L.busy) findStatusEl.textContent = 'reading what every board says, by meaning — the first time takes a moment';
    else if (L.error) findStatusEl.textContent = L.error;
    else {
      for (const g of L.groups || []) frag.appendChild(fdGroupEl(g, hits));
      const n = (L.likes || []).length;
      const boardsN = (L.groups || []).length;
      findStatusEl.textContent = n
        ? n + ' note' + (n === 1 ? '' : 's') + ' near it, on ' + boardsN + ' board' + (boardsN === 1 ? '' : 's') + ' of ' + kept.length + ' · by ' + L.name + ', on this device, nothing sent'
        : 'nothing on ' + (kept.length === 1 ? 'the board' : kept.length + ' boards') + ' is near “' + (L.text.length > 40 ? L.text.slice(0, 40) + '…' : L.text) + '”';
    }
    findList.replaceChildren(frag);
    fd.sel = Math.min(fd.sel, Math.max(0, hits.length - 1));
    fdMark(hits);
  }
  /**
   * *Notes like this*, taken: the pane opens on the notes nearest one thing's words across every board — a deliberate act, the
   * only thing here that asks the seat besides a query typed in the pane. `data`: `{ text, ids }` (the tool's offer data).
   * Reads the boards first (a board never indexed is read) and writes nothing.
   */
  async function likeNotes(data) {
    if (!findPanel || EMBED) return false;
    if (!semanticHost()) { say('no semantic seat is held — load one under models'); return false; }
    const my = { text: String(data.text || ''), ids: (data.ids || []).slice(), board: onBoardHere() ? board.id : null, busy: true, groups: null, likes: null, error: null, name: null, seq: ++fd.likeSeq };
    fd.like = my;
    fd.sel = 0; fd.whole.clear();
    openFind(true);
    findInput.value = '';
    findInput.placeholder = 'type to search instead';
    renderFind();
    try { findIndexCurrent(); await rereadBoards(); await findSync(); findIndexCurrent(); } catch (e) { /* what is indexed is what is asked about */ }
    if (fd.like !== my) return false;
    const r = await semanticNotesLike(my, findBoards());
    if (fd.like !== my) return false;
    my.busy = false;
    my.groups = r.groups || null; my.likes = r.likes || null; my.error = r.error || null; my.name = r.name || null;
    renderFind();
    return !r.error;
  }

  /** The hit the keys are on. */
  function fdMark(hits) {
    (hits || [...findList.querySelectorAll('.fdHit')]).forEach((h, i) => h.classList.toggle('on', i === fd.sel));
  }

  if (findInput) {
    findInput.addEventListener('input', () => { fd.sel = 0; fd.whole.clear(); if (fd.like) { fd.like = null; findInput.placeholder = ''; } renderFind(); });
    findInput.addEventListener('keydown', (e) => {
      // Keys stay in the field: ⌘Z in a word is not an undo on the board.
      e.stopPropagation();
      const hits = [...findList.querySelectorAll('.fdHit')];
      if (e.key === 'Escape') { e.preventDefault(); closeFind(); }
      else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (hits.length) { fd.sel = (fd.sel + (e.key === 'ArrowDown' ? 1 : hits.length - 1)) % hits.length; fdMark(hits); hits[fd.sel].scrollIntoView({ block: 'nearest' }); }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const h = hits[fd.sel] || hits[0];
        if (h) h.click();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K' || e.key === 'f' || e.key === 'F')) { e.preventDefault(); findInput.select(); }
    });
  }
  if (findList) {
    findList.addEventListener('click', (e) => {
      const more = e.target.closest && e.target.closest('button.fdMore');
      if (more && more.dataset.likeClear) { fd.like = null; findInput.placeholder = ''; findInput.focus(); renderFind(); return; }
      if (more) { fd.whole.add(more.dataset.whole); renderFind(); return; }
      const b = e.target.closest && e.target.closest('button.fdHit');
      if (b) findOpenHit({ board: b.dataset.board, id: b.dataset.id || null });
    });
  }

  // The keys: `/` where nothing is being typed, ⌘K and Ctrl K anywhere, ⌘F and Ctrl F too.
  addEventListener('keydown', (e) => {
    if (EMBED || e.altKey || e.defaultPrevented) return;
    const t = e.target;
    const typing = !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
    const k = (e.key || '').toLowerCase();
    if ((e.ctrlKey || e.metaKey) && (k === 'k' || k === 'f')) { e.preventDefault(); openFind(); }
    else if (e.key === '/' && !e.ctrlKey && !e.metaKey && !typing) { e.preventDefault(); openFind(); }
  });

  // ----- taking a hit ------------------------------------------------------------------------------------------------
  /**
   * Open the board a hit stands on — in place, through the switch the boards pane makes — and show where. A
   * hit's place is read again from the mark itself when the board is open (a mark moved since it was indexed is
   * found where it is); a mark that is gone leaves the board as it opens. Writes nothing.
   */
  async function findOpenHit(hit) {
    closeFind();
    const here = onBoardHere() && board.id === hit.board;
    if (!here) {
      const ok = await switchBoard(hit.board, { said: (v) => say(v.words) });
      if (!ok) return false;
    }
    if (!(onBoardHere() && board.id === hit.board)) return true;
    return findShow(hit);
  }
  /** The view on what was found, and a ring round it for a moment. False when there is nowhere to go (a board's own name). */
  function findShow(hit) {
    const st = session.getState();
    let b = null;
    if (hit.id) {
      const n = st.nodes.get(hit.id);
      if (n && !n.reps.some((r) => r.modality === 'erased')) b = MM.boundsOf(n);
    }
    if (!b || !MM.finiteBounds(b)) {
      // Indexed where it stood; the mark itself is the better word, and this is the hit's own.
      const held = finder.index.get(hit.board);
      const e = held && held.entries.find((x) => x.id === hit.id && x.box);
      b = e ? e.box : null;
    }
    if (!b || !MM.finiteBounds(b)) return false;
    const w = Math.max(b.maxX - b.minX, FIND_MIN_W), h = Math.max(b.maxY - b.minY, FIND_MIN_H);
    const cx = (b.minX + b.maxX) / 2, cy = (b.minY + b.maxY) / 2;
    fitTo({ minX: cx - (w * FIND_AIR) / 2, minY: cy - (h * FIND_AIR) / 2, maxX: cx + (w * FIND_AIR) / 2, maxY: cy + (h * FIND_AIR) / 2 });
    findRing(b);
    return true;
  }

  // The ring: a layer of its own over the canvas, pointer-transparent, drawn from the view each frame so it
  // follows a pan, and gone after FIND_FLASH_MS or at the next touch.
  let ring = null;
  function findRing(b) {
    if (!ring) {
      const cv = document.createElement('canvas');
      cv.id = 'findRing';
      cv.setAttribute('aria-hidden', 'true');
      document.body.appendChild(cv);
      ring = { cv, g: cv.getContext('2d'), box: null, at: 0, raf: 0 };
    }
    ring.box = { minX: b.minX, minY: b.minY, maxX: b.maxX, maxY: b.maxY };
    ring.at = performance.now();
    ring.cv.hidden = false;
    if (!ring.raf) ring.raf = requestAnimationFrame(ringTick);
  }
  function ringStop() {
    if (!ring) return;
    if (ring.raf) cancelAnimationFrame(ring.raf);
    ring.raf = 0; ring.box = null; ring.cv.hidden = true;
  }
  function ringTick(now) {
    if (!ring || !ring.box) return;
    ring.raf = 0;
    const t = now - ring.at;
    const dpr = window.devicePixelRatio || 1;
    const cv = ring.cv;
    if (cv.width !== Math.round(innerWidth * dpr) || cv.height !== Math.round(innerHeight * dpr)) { cv.width = Math.round(innerWidth * dpr); cv.height = Math.round(innerHeight * dpr); }
    const g = ring.g;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, innerWidth, innerHeight);
    if (t >= FIND_FLASH_MS) { ringStop(); return; }
    const a = worldToScreen(ring.box.minX, ring.box.minY), z = worldToScreen(ring.box.maxX, ring.box.maxY);
    const pad = 10 + 4 * Math.sin(t / 160);
    const alpha = Math.min(1, (FIND_FLASH_MS - t) / 700);
    g.lineWidth = 2.5;
    g.strokeStyle = 'rgba(' + (C ? C.goldRGB : '201,168,76') + ',' + (0.95 * alpha).toFixed(3) + ')';
    g.beginPath();
    if (g.roundRect) g.roundRect(a.x - pad, a.y - pad, z.x - a.x + pad * 2, z.y - a.y + pad * 2, 10); else g.rect(a.x - pad, a.y - pad, z.x - a.x + pad * 2, z.y - a.y + pad * 2);
    g.stroke();
    ring.raf = requestAnimationFrame(ringTick);
  }
  addEventListener('pointerdown', (e) => { if (ring && ring.box && !(findPanel && findPanel.contains(e.target))) ringStop(); }, { capture: true, passive: true });
  /** For tests: whether the ring is up and the box it rings. */
  function findFlashState() { return { active: !!(ring && ring.box), box: ring && ring.box ? Object.assign({}, ring.box) : null }; }
