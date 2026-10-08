// ===== packs (the pane) =====
// Provides: the library packs pane under the bar (V1-PLAN §2.3, §9 B3) — every pack this build ships
//   (never a test pack), each with what it adds, whether this board uses it, and *use* / *stop using*;
//   the packs this board names that this build lacks, said, with *stop using*. packsFace (the tile's
//   face), packShort and packSaid (how a match says its pack), renderPacksPane, packsHeard (the session's
//   listener, subscribed by the boot, which also has the pen follow the board's packs — MM.followPacks).
// Uses: ui (pane, chip), controls (tiles.packs, togglePanel/closePanel, syncTiles, ccOpen), input (say), palette (refreshPalette).
// A fragment of one closure: Demos/build-surface.mjs concatenates surface/*.js
// in name order inside `(function () { ... })();`. Shared state is the
// closure's; no imports, no exports, no build step beyond the concatenation.
//
// Using a pack is an EVENT in the board's log (`session.use`), never a device preference: a board
// replays with the same library everywhere, undo takes a use back, a room carries it. So the pane is
// only a door onto the log — it keeps nothing of its own, and reads what it shows from the state.

  const packsPanel = document.getElementById('packsPanel');
  const pkList = packsPanel ? packsPanel.querySelector('.pkList') : null;
  const pkStatus = document.getElementById('packsStatus');

  /** A pack as a match says it, short: `basics@1` → `basics`. */
  function packShort(ref) { return String(ref || '').split('@')[0]; }
  /** A pack as a tooltip says it: `the Basics pack (basics@1)`. */
  function packSaid(ref) {
    const p = MM.shippedPack(ref);
    return 'the ' + (p ? p.name : packShort(ref)) + ' pack (' + ref + ')';
  }
  /** The tile's face: the packs this board uses, short — or none; a name this build lacks shows as a question. */
  function packsFace(s) {
    const names = (s.packs || []).map(packShort).concat((s.packNotices || []).map((n) => n.pack + '?'));
    return names.length ? names.join(', ') : 'none';
  }

  /** What a pack adds, in a line: its definitions by name, its notation's symbols, its connectors. */
  function packHolds(p) {
    const parts = [];
    if (p.definitions.length) parts.push(p.definitions.map((d) => d.name).join(', '));
    if (p.notation) {
      const n = MM.notationById(p.notation);
      parts.push('the ' + (n ? MM.notationNameInSentence(n.name, n.id) : p.notation) + ' notation' + (n ? ': ' + n.symbols.map((x) => x.name).concat(n.connectors.map((x) => x.name + 's')).join(', ') : ''));
    }
    if (p.connectors && p.connectors.length) parts.push(p.connectors.map((c) => c.name).join(', '));
    return parts.join(' · ');
  }

  if (packsPanel) ui.pane(packsPanel, 'packs', () => closePanel(packsPanel, tiles.packs));
  if (tiles.packs) {
    tiles.packs.onclick = () => {
      togglePanel(packsPanel, tiles.packs);
      if (!packsPanel.hasAttribute('hidden')) { pkSay(null); renderPacksPane(); }
    };
  }

  function pkEl(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined && text !== null) e.textContent = text;
    return e;
  }

  /** The pane again, when it stands: after a use, an undo, another hand's line, a board loaded in place. */
  function renderPacksPane() {
    if (!pkList || !packsPanel || packsPanel.hasAttribute('hidden')) return;
    const s = session.getState();
    const frag = document.createDocumentFragment();
    for (const p of MM.listedPacks()) {
      const ref = MM.packRef(p);
      const used = s.packs.includes(ref);
      const row = frag.appendChild(pkEl('div', 'pkItem' + (used ? ' used' : '')));
      row.dataset.pack = ref;
      const top = row.appendChild(pkEl('div', 'pkTop'));
      top.appendChild(pkEl('span', 'pkName', p.name));
      top.appendChild(document.createTextNode(' '));
      top.appendChild(ui.chip(ref, { cls: 'pkRef', why: 'its name and version — content under one name never changes' }));
      if (used) { top.appendChild(document.createTextNode(' ')); top.appendChild(ui.chip('in use', { cls: 'pkUsed', why: 'this board uses it: its log says so' })); }
      row.appendChild(pkEl('div', 'pkWhat', p.describes));
      const holds = packHolds(p);
      if (holds) row.appendChild(pkEl('div', 'pkHolds', holds));
      const b = row.appendChild(pkEl('button', '', used ? 'stop using' : 'use'));
      b.type = 'button';
      b.dataset[used ? 'unuse' : 'use'] = ref;
      b.title = used ? 'its definitions leave this board’s matching — an event in its log; undo brings them back'
        : 'this board uses it from now on — an event in its log: what it ships is matched here, attributed to it';
    }
    // What this board names that this build does not ship: said, never hidden, and it can be let go.
    for (const n of s.packNotices || []) {
      const row = frag.appendChild(pkEl('div', 'pkItem pkLost'));
      row.dataset.pack = n.pack;
      const top = row.appendChild(pkEl('div', 'pkTop'));
      top.appendChild(pkEl('span', 'pkName', n.pack));
      top.appendChild(document.createTextNode(' '));
      top.appendChild(ui.chip(n.reason === 'unknown' ? 'not in this build' : 'no pack’s name', { cls: 'pkRef', why: n.detail }));
      row.appendChild(pkEl('div', 'pkWhat', n.detail));
      const b = row.appendChild(pkEl('button', '', 'stop using'));
      b.type = 'button';
      b.dataset.unuse = n.pack;
      b.title = 'the board stops naming it — an event in its log';
    }
    pkList.replaceChildren(frag);
  }

  /** The pane's own line. */
  function pkSay(words) { if (pkStatus) pkStatus.textContent = words || ''; }

  if (packsPanel) {
    packsPanel.addEventListener('click', (e) => {
      const b = e.target.closest && e.target.closest('button');
      if (!b || !packsPanel.contains(b) || b.classList.contains('paneClose') || b.disabled) return;
      const d = b.dataset;
      if (d.use !== undefined) {
        const refused = session.use(d.use, Date.now());
        if (refused) { pkSay(refused.detail); return; }
        const p = MM.shippedPack(d.use);
        const what = p && p.definitions.length ? p.definitions.map((x) => x.name).join(', ') + ' matched here' : p && p.notation ? 'its notation’s ports on the pen' : 'in use';
        pkSay('this board uses ' + d.use + ' — ' + what + '; undo takes it back');
        say('using ' + packSaid(d.use) + ' — ' + what);
      } else if (d.unuse !== undefined) {
        session.unuse(d.unuse, Date.now());
        pkSay('this board no longer uses ' + d.unuse + '; undo brings it back');
        say('stopped using ' + d.unuse);
      }
      syncTiles();
      renderPacksPane();
    });
  }

  /**
   * The pane and the tile follow the board — a use undone, another hand's line, a board loaded in
   * place. A listener of the session's, subscribed by the boot after the journal and the paint (the
   * journal hears every change first, V1-PLAN R3).
   */
  let pkHeard = '';
  function packsHeard(s) {
    const now = s.packs.join(',') + '|' + s.packNotices.map((n) => n.pack).join(',');
    if (now === pkHeard) return;
    pkHeard = now;
    if (packsPanel && !packsPanel.hasAttribute('hidden')) renderPacksPane();
    if (ccOpen()) syncTiles();
    // A field open while the packs change offers what the board now knows its marks as (core re-reads the summon's matches).
    refreshPalette();
  }
