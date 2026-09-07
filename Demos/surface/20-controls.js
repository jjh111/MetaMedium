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
    reset: document.getElementById('resetBtn'), help: document.getElementById('helpBtn'), live: document.getElementById('liveBtn'),
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
    ui.tile(tiles.live, 'live', folder.how === 'live' ? folder.name : 'room…', { on: folder.how === 'live', why: 'a room other hands can join: between tabs on this machine, or across machines through a relay' });
  }

  tiles.theme.onclick = () => setThemeMode(THEME_MODES[(THEME_MODES.indexOf(themeMode) + 1) % THEME_MODES.length]);
  tiles.hand.onclick = () => setHand(hand === 'right' ? 'left' : 'right');
  tiles.autoRead.onclick = () => setAutoRead(!autoRead);
  // A live room: a name, and a relay when the other hand is on another machine.
  const livePanel = document.getElementById('livePanel');
  ui.pane(livePanel, 'live', () => closePanel(livePanel, tiles.live));
  tiles.live.onclick = () => { togglePanel(livePanel, tiles.live); if (!livePanel.hasAttribute('hidden')) { const r = document.getElementById('liveRoom'); if (!r.value) r.value = folder.how === 'live' ? folder.name : 'table'; document.getElementById('liveName').value = prefs.get('hand-name', '') || ''; } };
  document.getElementById('liveJoin').onclick = () => {
    const room = document.getElementById('liveRoom').value.trim();
    const name = document.getElementById('liveName').value.trim();
    const relay = document.getElementById('liveRelay').value.trim();
    if (!room) { document.getElementById('liveStatus').textContent = 'a room needs a name'; return; }
    if (name) prefs.set('hand-name', name);
    openLive(room, relay ? { relay } : {}).then(() => { closePanel(livePanel, tiles.live); say('in room ' + room + ' as ' + handLabel(folder.me) + (relay ? ' through ' + relay : ' — other tabs on this machine can join')); syncTiles(); })
      .catch((err) => { document.getElementById('liveStatus').textContent = 'could not join: ' + (err.message || err); });
  };

  // Help is the hand QA plan, which doubles as the manual, read into a pane.
  const helpPanel = document.getElementById('helpPanel');
  ui.pane(helpPanel, 'help', () => closePanel(helpPanel, tiles.help));
  let helpLoaded = false;
  tiles.help.onclick = () => {
    togglePanel(helpPanel, tiles.help);
    if (helpPanel.hasAttribute('hidden') || helpLoaded) return;
    const body = helpPanel.querySelector('.helpBody');
    body.textContent = 'loading…';
    fetch('../QA-v8.md', { cache: 'no-cache' }).then((r) => (r.ok ? r.text() : Promise.reject(new Error('HTTP ' + r.status)))).then((md) => { body.innerHTML = markdownToHtml(md); helpLoaded = true; })
      .catch((err) => { body.innerHTML = '<p>could not load QA-v8.md (' + esc(err.message || err) + ') — it is in the repository root.</p>'; });
  };
  /** Enough markdown for the QA plan: headings, lists, bold, code, links. */
  function markdownToHtml(md) {
    const inline = (t) => esc(t)
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
      .replace(/\*([^*]+)\*/g, '<i>$1</i>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    const out = [];
    let list = null; // 'ul' | 'ol'
    let para = [];   // the lines of a paragraph, joined at the next blank line
    const closeList = () => { if (list) { out.push('</' + list + '>'); list = null; } };
    const closePara = () => { if (para.length) { out.push('<p>' + para.join(' ') + '</p>'); para = []; } };
    for (const raw of md.split('\n')) {
      const line = raw.replace(/\s+$/, '');
      const h = /^(#{1,3})\s+(.*)$/.exec(line);
      const li = /^\s*(?:[-*]|\d+\.)\s+(.*)$/.exec(line);
      const cont = /^\s{2,}(\S.*)$/.exec(line);
      if (h) { closeList(); closePara(); out.push('<h' + (h[1].length + 1) + '>' + inline(h[2]) + '</h' + (h[1].length + 1) + '>'); }
      else if (li) { closePara(); const kind = /^\s*\d+\./.test(line) ? 'ol' : 'ul'; if (list !== kind) { closeList(); list = kind; out.push('<' + kind + '>'); } out.push('<li>' + inline(li[1]) + '</li>'); }
      else if (cont && list) { out[out.length - 1] = out[out.length - 1].replace(/<\/li>$/, ' ' + inline(cont[1]) + '</li>'); }
      else if (!line.trim()) { closeList(); closePara(); }
      else if (/^---+$/.test(line)) { closeList(); closePara(); out.push('<hr>'); }
      else { closeList(); para.push(inline(line)); }
    }
    closeList(); closePara();
    return out.join('\n');
  }

  // Panes open under the bar, one at a time.
  const panes = [];
  function openPane(el, btn) {
    for (const p of panes) if (p.el !== el) closePanel(p.el, p.btn);
    if (!panes.some((p) => p.el === el)) panes.push({ el, btn });
    el.removeAttribute('hidden');
    if (btn) btn.setAttribute('aria-pressed', 'true');
    closeCC();
  }
