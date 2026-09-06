// ===== controls =====
// Provides: the control centre — one button in the bar, a grid of tiles in fixed slots (zoom, snap,
//   view, theme, hand, auto-read, folder, import, export, models, teach, reset, help); syncTiles()
//   writes every tile's face from state; openPane/closePanes keep one pane open at a time.
// Uses: core (prefs, themeMode, hand), snap (snapMode), folder (viewMode, folder), models (agents),
//   teach (teachPanel), handwriting (autoRead).
// A fragment of one closure: Demos/build-surface.mjs concatenates surface/*.js
// in name order inside `(function () { ... })();`. Shared state is the
// closure's; no imports, no exports, no build step beyond the concatenation.

  // ===== The control centre (SURFACE-v9-PLAN D4) ==============================
  // Fourteen rail buttons become one button and a grid of tiles that keep
  // their slots (I12: a slot is a promise). Tiles are toggles where they can
  // be and say their state on their face. The centre closes on the next
  // stroke, on Esc, and on a tap outside it.
  const ccBtn = document.getElementById('ccBtn');
  const ccEl = document.getElementById('cc');
  const tiles = {
    zoom: document.getElementById('zoomTile'), snap: document.getElementById('snapMode'), snapNow: document.getElementById('snapBtn'),
    view: document.getElementById('gridBtn'), theme: document.getElementById('themeBtn'), hand: document.getElementById('handBtn'),
    autoRead: document.getElementById('autoReadBtn'), folder: document.getElementById('folderBtn'), imp: document.getElementById('importBtn'),
    exp: document.getElementById('exportBtn'), models: document.getElementById('modelBtn'), teach: document.getElementById('teachBtn'),
    reset: document.getElementById('resetBtn'), help: document.getElementById('helpBtn'),
  };

  function ccOpen() { return !ccEl.hasAttribute('hidden'); }
  function openCC() { ccEl.removeAttribute('hidden'); ccBtn.setAttribute('aria-pressed', 'true'); syncTiles(); }
  function closeCC() { ccEl.setAttribute('hidden', ''); ccBtn.setAttribute('aria-pressed', 'false'); }
  ccBtn.onclick = () => { if (ccOpen()) closeCC(); else openCC(); };
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && ccOpen()) { closeCC(); e.preventDefault(); } });
  addEventListener('pointerdown', (e) => {
    if (!ccOpen()) return;
    if (ccEl.contains(e.target) || ccBtn.contains(e.target)) return;
    closeCC();
  }, true);

  /** Every tile's face, from state. Cheap; called after anything a tile reports. */
  function syncTiles() {
    if (!ccEl) return;
    const s = session.getState();
    const zoomPct = document.getElementById('zoomPct');
    if (zoomPct) zoomPct.textContent = Math.round(view.zoom * 100) + '%';
    ui.tile(tiles.snap, 'snap', snapMode, { on: snapMode !== 'off', why: 'offer: a dashed ghost under a confident shape · auto: drawn clean as you draw · off' });
    const n = heldCandidates.length || snapOffers.size;
    if (tiles.snapNow) { tiles.snapNow.hidden = n === 0; ui.tile(tiles.snapNow, heldCandidates.length ? 'snap circled' : 'snap now', n ? String(n) : '', { why: 'redraw every confidently read shape clean; the ink stays underneath' }); }
    ui.tile(tiles.view, 'view', viewMode === 'canvas' ? 'canvas' : viewMode, { on: viewMode !== 'canvas', why: 'canvas, or every artifact as a card' });
    ui.tile(tiles.theme, 'theme', themeMode, { why: 'system follows the OS; light and dark are the same tokens inverted' });
    ui.tile(tiles.hand, 'hand', hand, { why: 'which side of the pen tip the field opens on' });
    ui.tile(tiles.autoRead, 'auto-read', autoRead ? 'on' : 'off', { on: autoRead, why: 'read handwriting with a model as it is written; off asks only when you say read' });
    ui.tile(tiles.folder, folder.store ? (folder.how === 'git' ? 'repo' : folder.how === 'static' ? 'site' : 'folder') : 'folder', folder.store ? (folder.name || 'open') : 'open…', { on: !!folder.store, why: 'a folder is the canvas: its files are artifacts, your ink is saved beside them' });
    ui.tile(tiles.imp, 'import', '…', { why: 'a picture is traced into ink; a file of a known kind becomes an artifact. Drop or paste works too' });
    ui.tile(tiles.exp, 'export', '…', { why: 'the board as SVG or PNG, or the session as its log' });
    ui.tile(tiles.models, 'models', agents.length ? agents.map((a) => a.config.model).join(', ') : 'none', { on: agents.length > 0, why: 'a model joins as a participant; it is asked only when you ask' });
    ui.tile(tiles.teach, 'mark', s.commandMark ? s.commandMark.name : 'check ✓', { on: !!s.commandMark, why: 'the mark that turns a circled group into a selection; teach your own' });
    ui.tile(tiles.reset, 'reset', 'fresh board', { why: 'a fresh board; the one in browser storage is forgotten too' });
    ui.tile(tiles.help, 'help', '?', { why: 'the hand QA plan, which doubles as the manual' });
  }

  tiles.theme.onclick = () => setThemeMode(THEME_MODES[(THEME_MODES.indexOf(themeMode) + 1) % THEME_MODES.length]);
  tiles.hand.onclick = () => setHand(hand === 'right' ? 'left' : 'right');
  tiles.autoRead.onclick = () => setAutoRead(!autoRead);
  tiles.help.onclick = () => { window.open('../QA-v8.md', '_blank'); };

  // Panes open under the bar, one at a time.
  const panes = [];
  function openPane(el, btn) {
    for (const p of panes) if (p.el !== el) closePanel(p.el, p.btn);
    if (!panes.some((p) => p.el === el)) panes.push({ el, btn });
    el.removeAttribute('hidden');
    if (btn) btn.setAttribute('aria-pressed', 'true');
    closeCC();
  }
