// ===== boards (the pane) =====
// Provides: the boards pane under the bar (V1-PLAN §9 R1) — the boards this browser keeps, each with
//   when it last changed and roughly how big it is, the board on screen marked; New board, a board
//   from a log file, open, rename, duplicate, delete (to the trash), restore, and emptying the trash
//   said plainly before it happens; the folders, repositories and sites opened lately, by kind;
//   and the examples (V1-PLAN R5): a few boards made by the engine, each opened as a NEW board of
//   your own, a copy — the example is never written — and the empty board's panel start (the
//   starter, one tap; *more examples* opens this pane).
//   renderBoardsPane (the adapter calls it when the list changes), and at its foot how much room this browser
//   holds and has left and whether it may clear it (PLAN-IPAD-NOTES I3: loadRoom, roomChanged).
// Uses: ui (pane, chip), controls (tiles.boards, togglePanel/closePanel), boards list (boardRows,
//   sizeWords, storageWords, isKept), folder (the boards adapter: boards, board, onBoardHere, switchBoard, newBoard,
//   renameBoard, duplicateBoard, trashBoard, restoreBoard, planEmptyTrash, emptyTrash, boardFromFile,
//   rereadBoards, boardEntryName, exportLogNow, readLogText), input (flash, say), the
//   inspector's element (the panel's start), boards list (exampleUrl, exampleRows, exampleName, starterOf).
// A fragment of one closure: Demos/build-surface.mjs concatenates surface/*.js
// in name order inside `(function () { ... })();`. Shared state is the
// closure's; no imports, no exports, no build step beyond the concatenation.
//
// One pane among the others (one open at a time, under the bar), opened by the control centre's
// boards tile, whose face is the name of what is on screen. Every sentence the pane has stays in
// the pane — a refusal to leave a board that is not saved, what a delete did, what emptying the
// trash will take — as the model pane's does; the status line keeps its one sentence.

  const boardsPanel = document.getElementById('boardsPanel');
  const bdList = boardsPanel ? boardsPanel.querySelector('.bdList') : null;
  const bdStatus = document.getElementById('boardsStatus');
  const bdFile = document.getElementById('boardsFile');
  // What the pane holds between paints: the board whose name is being typed, the trash's sentence
  // while it stands, the pane's own line (and the act a "leave it anyway" would take again).
  const bd = { renaming: null, confirm: null, said: null };

  if (boardsPanel) ui.pane(boardsPanel, 'boards', () => closePanel(boardsPanel, tiles.boards));
  if (tiles.boards) {
    tiles.boards.onclick = () => {
      togglePanel(boardsPanel, tiles.boards);
      if (boardsPanel.hasAttribute('hidden')) return;
      bd.renaming = null; bd.confirm = null; bd.said = null;
      paintBoardsPane();
      // Another tab may have changed the list, and what its boards hold, since this page read it.
      rereadBoards();
      loadExamples();
      loadRoom();
    };
  }

  // ----- The browser's room (PLAN-IPAD-NOTES I3) -------------------------------------------------------
  // `navigator.storage.estimate()` and `.persisted()`, read when the pane opens and again when the browser has
  // answered the ask (17-folder.js's askPersist), said at the foot by storageWords (17-boards.js). A browser
  // with neither says that, and nothing is guessed.
  const room = { state: 'idle', usage: undefined, quota: undefined, persisted: null };
  function loadRoom() {
    const st = typeof navigator !== 'undefined' ? navigator.storage : null;
    const ask = (f) => { try { return st && typeof st[f] === 'function' ? Promise.resolve(st[f]()).catch(() => undefined) : Promise.resolve(undefined); } catch (err) { return Promise.resolve(undefined); } };
    room.state = 'loading';
    return Promise.all([ask('estimate'), ask('persisted')]).then((got) => {
      const est = got[0] || {};
      room.usage = typeof est.usage === 'number' ? est.usage : undefined;
      room.quota = typeof est.quota === 'number' ? est.quota : undefined;
      room.persisted = typeof got[1] === 'boolean' ? got[1] : null;
      room.state = 'ready';
      renderBoardsPane();
    });
  }
  /** The browser answered the ask, or the boards changed under it: read the room again if the pane is showing it. */
  function roomChanged() {
    if (boardsPanel && !boardsPanel.hasAttribute('hidden')) loadRoom();
    else room.state = 'idle';
  }
  /** Installed to the Home Screen: iOS's own flag, else the display mode — the one place the page can tell. */
  function runsInstalled() {
    try { return navigator.standalone === true || (typeof matchMedia === 'function' && matchMedia('(display-mode: standalone)').matches); } catch (err) { return false; }
  }
  function roomEl() {
    return bdEl('p', 'bdStorage hint', room.state === 'ready' ? storageWords({ usage: room.usage, quota: room.quota, persisted: room.persisted, installed: runsInstalled() }) : 'reading how much room this browser keeps…');
  }

  /** The list changed (a record landed, another tab spoke): the pane again, if it stands — never under a name being typed. */
  function renderBoardsPane() {
    if (!boardsPanel || boardsPanel.hasAttribute('hidden') || bd.renaming) return;
    paintBoardsPane();
  }

  function bdEl(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined && text !== null) e.textContent = text;
    return e;
  }
  /** Children with a space between each, so the pane reads as words to a screen reader and to anything that reads its text. */
  function bdJoin(parent, parts) {
    parts.filter(Boolean).forEach((p, i) => { if (i) parent.appendChild(document.createTextNode(' ')); parent.appendChild(p); });
    return parent;
  }
  function bdButton(label, cls, data, why) {
    const b = bdEl('button', cls, label);
    b.type = 'button';
    for (const k of Object.keys(data || {})) b.dataset[k] = data[k];
    if (why) b.title = why;
    return b;
  }

  function boardRowEl(r) {
    const row = bdEl('div', 'bdItem' + (r.here ? ' here' : ''));
    row.dataset.id = r.id;
    if (r.here) row.dataset.here = '';
    let name;
    if (bd.renaming === r.id) {
      name = bdEl('input', 'bdNameInput');
      name.value = r.name;
      name.maxLength = 80;
      name.dataset.nameInput = r.id;
      name.setAttribute('aria-label', 'the board’s name');
      name.spellcheck = false;
    } else name = bdButton(r.name, 'bdName', { open: r.id }, r.here ? 'the board on screen' : 'open this board');
    bdJoin(row.appendChild(bdEl('div', 'bdTop')), [name, r.here ? ui.chip('here', { cls: 'bdHere', why: 'the board on screen' }) : null]);
    row.appendChild(document.createTextNode(' '));
    row.appendChild(bdEl('div', 'bdMeta', [r.when, r.size].filter(Boolean).join(' · ')));
    row.appendChild(document.createTextNode(' '));
    bdJoin(row.appendChild(bdEl('div', 'bdActs')), [
      bdButton('rename', '', { rename: r.id }, 'a new name — the board keeps its id, so nothing it holds moves'),
      bdButton('duplicate', '', { dup: r.id }, 'a copy beside it, under its own id'),
      bdButton('delete', '', { trash: r.id }, 'to the trash — it comes back whole from there until the trash is emptied'),
    ]);
    return row;
  }
  function placeRowEl(r) {
    const row = bdEl('div', 'bdItem bdPlace');
    row.dataset.id = r.id;
    row.dataset.kind = r.k;
    bdJoin(row.appendChild(bdEl('div', 'bdTop')), [
      bdButton(r.name, 'bdName', { open: r.id }, 'open it again, the way its tile does'),
      ui.chip(r.kind, { cls: 'bdKind', why: 'what kind of place it is' }),
    ]);
    if (r.when) { row.appendChild(document.createTextNode(' ')); row.appendChild(bdEl('div', 'bdMeta', r.when)); }
    return row;
  }
  function trashRowEl(r) {
    const row = bdEl('div', 'bdItem bdGone');
    row.dataset.id = r.id;
    row.dataset.trashed = '';
    row.appendChild(bdEl('div', 'bdTop')).appendChild(bdEl('span', 'bdName', r.name));
    row.appendChild(document.createTextNode(' '));
    row.appendChild(bdEl('div', 'bdMeta', [r.when, r.size].filter(Boolean).join(' · ')));
    row.appendChild(document.createTextNode(' '));
    row.appendChild(bdEl('div', 'bdActs')).appendChild(bdButton('restore', '', { restore: r.id }, 'back onto the list, whole'));
    return row;
  }

  function paintBoardsPane() {
    if (!bdList) return;
    const stats = {};
    for (const [k, v] of boards.stats) stats[k] = v;
    const rows = boardRows([...boards.entries.values()], stats, Date.now(), onBoardHere() ? board.id : null);
    const frag = document.createDocumentFragment();
    const many = boards.how === 'indexeddb';
    const head = bdJoin(bdEl('div', 'bdHead'), [
      bdButton('New board', 'bdNew', { boardNew: '' }, 'a new, empty board — the one on screen stays as it is'),
      bdButton('from a file…', 'bdFrom', { boardFile: '' }, 'a board from a .zip made by export with its pictures, or from a log file — one event per line'),
    ]);
    if (!many) head.querySelectorAll('button').forEach((b) => { b.disabled = true; });
    frag.appendChild(head);
    if (!boards.ready) frag.appendChild(bdEl('p', 'hint', 'reading the boards this browser keeps…'));
    else if (boards.how === 'browser storage') frag.appendChild(bdEl('p', 'hint', 'this browser keeps one board here (it has no IndexedDB) — open a folder to keep more'));
    else if (boards.how !== 'indexeddb') frag.appendChild(bdEl('p', 'hint', 'this browser will not let the page keep boards (a private window, or site data blocked)'));
    const list = frag.appendChild(bdEl('div', 'bdBoards'));
    for (const r of rows.boards) list.appendChild(boardRowEl(r));
    frag.appendChild(examplesEl(many));
    if (rows.places.length) {
      const pl = frag.appendChild(bdEl('div', 'bdPlaces'));
      pl.appendChild(bdEl('div', 'bdLabel', 'recent places'));
      for (const r of rows.places) pl.appendChild(placeRowEl(r));
    }
    if (rows.trash.length || bd.confirm) {
      const tr = frag.appendChild(bdEl('div', 'bdTrash'));
      tr.appendChild(bdEl('div', 'bdLabel', 'trash · ' + rows.trash.length));
      for (const r of rows.trash) tr.appendChild(trashRowEl(r));
      const c = bd.confirm;
      if (c) {
        // Said before it happens; the second tap is its own act.
        const box = tr.appendChild(bdEl('div', 'bdConfirm'));
        box.appendChild(bdEl('p', '', c.words));
        const btns = [];
        if (c.gone.length) btns.push(bdButton(c.gone.length === 1 ? 'Delete it for good' : 'Delete them for good', 'bdDanger', { emptyConfirm: '' }, 'cannot be undone'));
        btns.push(bdButton(c.gone.length ? 'Keep them' : 'Close', '', { emptyCancel: '' }));
        bdJoin(box.appendChild(bdEl('div', 'bdConfirmRow')), btns);
      }
      // With nothing it could take yet (a board open elsewhere), asking again is the next move.
      if (rows.trash.length && (!c || !c.gone.length)) tr.appendChild(bdButton('Empty the trash…', 'bdEmpty', { emptyTrash: '' }, 'says what it will delete, and asks again'));
    }
    frag.appendChild(roomEl());
    bdList.replaceChildren(frag);
    paintBoardsSaid();
  }

  // ----- The examples (V1-PLAN R5) ---------------------------------------------------------------
  // The index is read once a page (and again while it has not been read), from boards/examples/, which
  // the service worker keeps for offline. Opening one reads its log and makes a board from its events
  // through the adapter's own door (newBoard) — a copy under an id of its own, named for the example, so
  // the example is never written and the hand draws on it at once.
  const examples = { state: 'idle', index: null, rows: [], loading: null, opening: false };
  function loadExamples() {
    if (examples.loading) return examples.loading;
    if (examples.state === 'ready') return Promise.resolve();
    examples.state = 'loading';
    examples.loading = fetch(exampleUrl('index.json'), { cache: 'no-cache' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('HTTP ' + r.status))))
      .then((index) => { examples.index = index; examples.rows = exampleRows(index); examples.state = examples.rows.length ? 'ready' : 'failed'; })
      .catch(() => { examples.index = null; examples.rows = []; examples.state = 'failed'; })
      .then(() => { examples.loading = null; renderBoardsPane(); });
    return examples.loading;
  }
  function examplesEl(many) {
    const box = bdEl('div', 'bdExamples');
    box.appendChild(bdEl('div', 'bdLabel', 'examples'));
    if (examples.state === 'idle' || examples.state === 'loading') box.appendChild(bdEl('p', 'hint', 'reading the examples…'));
    else if (examples.state === 'failed') box.appendChild(bdEl('p', 'hint', 'the examples could not be read — this page keeps them for offline once it has been online'));
    for (const r of examples.rows) {
      const row = bdEl('div', 'bdItem bdExample');
      row.dataset.example = r.id;
      const open = bdButton(r.name, 'bdName', { exampleOpen: r.id }, 'a new board of your own, made from this example — the example itself is never changed');
      if (!many) open.disabled = true;
      row.appendChild(bdEl('div', 'bdTop')).appendChild(open);
      row.appendChild(document.createTextNode(' '));
      row.appendChild(bdEl('div', 'bdMeta', [r.says, r.words].filter(Boolean).join(' · ')));
      box.appendChild(row);
    }
    return box;
  }
  /**
   * Open an example as a board of its own. Resolves the entry made, or false with the reason said
   * through `o.said` (the pane's line, or the status line's) — never thrown, never a board half made.
   */
  async function openExample(id, o) {
    o = o || {};
    const report = (v) => { const words = typeof v === 'string' ? v : v.words; if (o.said) o.said(v); else say(words); };
    if (examples.opening) return false;
    examples.opening = true;
    try {
      await loadExamples();
      const row = examples.rows.find((r) => r.id === id);
      if (!row) { report('the examples could not be read — this page keeps them for offline once it has been online'); return false; }
      let read = null;
      try {
        const res = await fetch(exampleUrl(row.file), { cache: 'no-cache' });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        read = readLogText(await res.text(), row.name);
      } catch (err) { report('could not read the “' + row.name + '” example (' + ((err && err.message) || err) + ') — it opens once this page has been online'); return false; }
      if (!read.events) { report(read.refused || 'the “' + row.name + '” example is not a board’s log'); return false; }
      const events = read.events;
      return await newBoard({ name: exampleName([...boards.entries.values()], row), events: events, force: !!o.force, said: o.said || ((v) => say(v.words)) });
    } finally { examples.opening = false; }
  }
  async function exampleFromPane(id, force) {
    paneSay(null);
    const made = await openExample(id, { force: !!force, said: (v) => paneSay(v, () => exampleFromPane(id, true)) });
    if (made) { closePanel(boardsPanel, tiles.boards); flash('“' + made.name + '” — a board of your own, made from the example; the example is as it was'); }
  }
  // The empty board's panel offers the starter in one tap, and more of them (10-inspector.js): its buttons carry no
  // data-act, so the panel's own handler never takes them for a mark's.
  inspectorEl.addEventListener('click', async (e) => {
    const b = e.target.closest && e.target.closest('button[data-example-start], button[data-example-more]');
    if (!b) return;
    if (b.hasAttribute('data-example-more')) { if (boardsPanel && boardsPanel.hasAttribute('hidden')) tiles.boards.onclick(); return; }
    await loadExamples();
    const id = starterOf(examples.index);
    if (!id) { say('the examples could not be read — this page keeps them for offline once it has been online'); return; }
    const made = await openExample(id);
    if (made) flash('“' + made.name + '” — a board of your own, made from the example; the board before stays in boards');
  });

  /** The pane's own line: what just happened, or why not — with the ways out as buttons in it. */
  function paneSay(v, retry) {
    bd.said = v ? (typeof v === 'string' ? { words: v, ways: [] } : { words: v.words, ways: v.ways || [] }) : null;
    if (bd.said) bd.said.retry = retry || null;
    paintBoardsSaid();
  }
  function paintBoardsSaid() {
    if (!bdStatus) return;
    bdStatus.replaceChildren();
    if (!bd.said) return;
    const parts = [document.createTextNode(bd.said.words)];
    for (const w of bd.said.ways) {
      if (w === 'export') parts.push(bdButton('export the log', 'bdWay', { leaveWay: 'export' }, 'the whole board on screen, as a file to keep'));
      else if (w === 'leave' && bd.said.retry) parts.push(bdButton('leave it anyway', 'bdWay', { leaveWay: 'leave' }, 'what was not saved is lost'));
    }
    bdJoin(bdStatus, parts);
  }

  async function openFromPane(id, force) {
    paneSay(null);
    const kept = isKept(boards.entries.get(id));
    const ok = await switchBoard(id, { force: !!force, said: (v) => paneSay(v, () => openFromPane(id, true)) });
    if (!ok) return;
    closePanel(boardsPanel, tiles.boards);
    if (kept && onBoardHere() && board.id === id) flash('“' + boardEntryName(id) + '” — ' + sizeWords(boards.stats.get(id)));
  }
  async function newFromPane(force) {
    paneSay(null);
    const made = await newBoard({ force: !!force, said: (v) => paneSay(v, () => newFromPane(true)) });
    if (made) { closePanel(boardsPanel, tiles.boards); flash('“' + made.name + '” — a new board; the one before stays in boards'); }
  }
  async function trashFromPane(id, force) {
    paneSay(null);
    const name = boardEntryName(id);
    const ok = await trashBoard(id, { force: !!force, said: (v) => paneSay(v, () => trashFromPane(id, true)) });
    if (ok) paneSay('“' + name + '” is in the trash — restore it below; it stays whole there until the trash is emptied');
  }

  if (boardsPanel) {
    boardsPanel.addEventListener('click', async (e) => {
      const b = e.target.closest && e.target.closest('button');
      if (!b || !boardsPanel.contains(b) || b.classList.contains('paneClose') || b.disabled) return;
      const d = b.dataset;
      try {
        if (d.open !== undefined) await openFromPane(d.open);
        else if (d.exampleOpen !== undefined) await exampleFromPane(d.exampleOpen);
        else if (d.boardNew !== undefined) await newFromPane();
        else if (d.boardFile !== undefined) { bdFile.value = ''; bdFile.click(); }
        else if (d.rename !== undefined) {
          bd.renaming = d.rename; bd.confirm = null;
          paintBoardsPane();
          const input = bdList.querySelector('input[data-name-input]');
          if (input) { input.focus(); input.select(); }
        } else if (d.dup !== undefined) {
          paneSay(null);
          const made = await duplicateBoard(d.dup);
          if (made) paneSay('“' + made.name + '” — a copy of “' + boardEntryName(made.from) + '”, beside it; the original is as it was');
        } else if (d.trash !== undefined) await trashFromPane(d.trash);
        else if (d.restore !== undefined) {
          const back = await restoreBoard(d.restore);
          if (back) paneSay('“' + back.name + '” is back on the list, whole');
        } else if (d.emptyTrash !== undefined) {
          paneSay(null);
          bd.confirm = await planEmptyTrash();
          paintBoardsPane();
        } else if (d.emptyCancel !== undefined) { bd.confirm = null; paintBoardsPane(); }
        else if (d.emptyConfirm !== undefined && bd.confirm) {
          const plan = bd.confirm;
          bd.confirm = null;
          const r = await emptyTrash(plan);
          paintBoardsPane();
          paneSay(r.gone.length
            ? r.gone.length + ' board' + (r.gone.length === 1 ? '' : 's') + ' deleted for good' + (r.kept.length ? ' — ' + r.kept.length + ' kept: open in another tab' : '')
            : 'nothing was deleted — what is in the trash is open in another tab');
        } else if (d.leaveWay === 'export') exportLogNow();
        else if (d.leaveWay === 'leave' && bd.said && bd.said.retry) { const again = bd.said.retry; paneSay(null); await again(); }
      } catch (err) {
        paneSay('that did not work — ' + ((err && err.message) || err));
      }
    });
    // Typing a name: Enter keeps it, Esc drops it, leaving the field keeps it. Keys stay in the field
    // (⌘Z in a name is not an undo on the board).
    bdList.addEventListener('keydown', (e) => {
      const input = e.target.closest && e.target.closest('input[data-name-input]');
      if (!input) return;
      e.stopPropagation();
      if (e.key === 'Enter') { e.preventDefault(); commitRename(input); }
      else if (e.key === 'Escape') { e.preventDefault(); bd.renaming = null; paintBoardsPane(); }
    });
    bdList.addEventListener('focusout', (e) => {
      const input = e.target.closest && e.target.closest('input[data-name-input]');
      if (input) commitRename(input);
    });
  }
  async function commitRename(input) {
    const id = input.dataset.nameInput;
    if (bd.renaming !== id) return;
    bd.renaming = null;
    const done = await renameBoard(id, input.value).catch(() => null);
    paintBoardsPane();
    if (done) paneSay('“' + done.name + '” — the same board under a new name; what it holds did not move');
  }
  if (bdFile) {
    bdFile.addEventListener('change', async () => {
      const f = bdFile.files && bdFile.files[0];
      if (!f) return;
      paneSay(null);
      const notes = [];
      const made = await boardFromFile(f, { said: (v) => paneSay(v), note: (n) => { notes.push(n); paneSay(n); } }).catch((err) => { paneSay('could not read “' + f.name + '” — ' + ((err && err.message) || err)); return false; });
      bdFile.value = '';
      if (made) { closePanel(boardsPanel, tiles.boards); flash('“' + made.name + '” — ' + sizeWords(boards.stats.get(made.id)) + ', from ' + f.name + (notes.length ? ' · ' + notes.join(' · ') : '')); }
    });
  }
