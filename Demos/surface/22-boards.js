// ===== boards (the pane) =====
// Provides: the boards pane under the bar (V1-PLAN §9 R1) — the boards this browser keeps, each with
//   when it last changed and roughly how big it is, the board on screen marked; New board, a board
//   from a log file, open, rename, duplicate, delete (to the trash), restore, and emptying the trash
//   said plainly before it happens; the folders, repositories and sites opened lately, by kind.
//   renderBoardsPane (the adapter calls it when the list changes).
// Uses: ui (pane, chip), controls (tiles.boards, togglePanel/closePanel), boards list (boardRows,
//   sizeWords, isKept), folder (the boards adapter: boards, board, onBoardHere, switchBoard, newBoard,
//   renameBoard, duplicateBoard, trashBoard, restoreBoard, planEmptyTrash, emptyTrash, boardFromFile,
//   rereadBoards, boardEntryName, exportLogNow), input (flash).
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
    };
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
      bdButton('from a file…', 'bdFrom', { boardFile: '' }, 'a board from a log file — one event per line, as export writes it'),
    ]);
    if (!many) head.querySelectorAll('button').forEach((b) => { b.disabled = true; });
    frag.appendChild(head);
    if (!boards.ready) frag.appendChild(bdEl('p', 'hint', 'reading the boards this browser keeps…'));
    else if (boards.how === 'browser storage') frag.appendChild(bdEl('p', 'hint', 'this browser keeps one board here (it has no IndexedDB) — open a folder to keep more'));
    else if (boards.how !== 'indexeddb') frag.appendChild(bdEl('p', 'hint', 'this browser will not let the page keep boards (a private window, or site data blocked)'));
    const list = frag.appendChild(bdEl('div', 'bdBoards'));
    for (const r of rows.boards) list.appendChild(boardRowEl(r));
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
    bdList.replaceChildren(frag);
    paintBoardsSaid();
  }

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
      const made = await boardFromFile(f, { said: (v) => paneSay(v) }).catch((err) => { paneSay('could not read “' + f.name + '” — ' + ((err && err.message) || err)); return false; });
      bdFile.value = '';
      if (made) { closePanel(boardsPanel, tiles.boards); flash('“' + made.name + '” — ' + sizeWords(boards.stats.get(made.id)) + ', from ' + f.name); }
    });
  }
