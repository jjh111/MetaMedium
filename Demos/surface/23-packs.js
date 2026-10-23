// ===== packs (the pane) =====
// Provides: the library packs pane under the bar (V1-PLAN §2.3, §9 B3) — every pack this build ships
//   (never a test pack), each with what it does in the person's words (packDoes) and what it adds, whether this board uses it, and *use* / *stop using*;
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
  /** A pack as a tooltip says it: `the Basics pack` — its name, never its id (`basics@1`, the UX pass, UX-08). */
  function packSaid(ref) {
    const p = MM.shippedPack(ref);
    return 'the ' + (p ? p.name : packShort(ref)) + ' pack';
  }
  /** A pack's name, as the pane and the status line say it. */
  function packName(ref) { const p = MM.shippedPack(ref); return p ? p.name : packShort(ref); }
  /** The plural of a symbol or a connector's name: branch → branches, self → self-calls (a word, never name + 's'). */
  const PLURALS = { self: 'self-calls' };
  function pluralWord(w) {
    if (PLURALS[w]) return PLURALS[w];
    if (/(?:s|x|z|ch|sh)$/.test(w)) return w + 'es';
    if (/[^aeiou]y$/.test(w)) return w.slice(0, -1) + 'ies';
    return w + 's';
  }
  /** The tile's face: the packs this board uses, short — or none; a name this build lacks shows as a question. */
  function packsFace(s) {
    const names = (s.packs || []).map(packShort).concat((s.packNotices || []).map((n) => n.pack + '?'));
    return names.length ? names.join(', ') : 'none';
  }

  /**
   * What a pack does, in the person's words. A pack's own `describes` is core's and says it in the engine's
   * ("the flowchart notation in use: its ports on the pen"); the pane says what the hand will notice instead.
   * Keyed by the pack's id, which is never shown; a pack this table does not know says its own line.
   */
  const PACK_DOES = {
    basics: 'a bubble, and a molecule of three bubbles joined by two bonds — already known, nothing to teach',
    flowchart: 'lines snap to where a flowchart’s shapes join, and drawing clean and flows come first beside a flowchart',
    'uml-class': 'lines snap to the sides of a class, and drawing clean and lining up come first beside a class diagram',
    sequence: 'messages snap to the lifelines, and drawing clean and lining up come first beside a sequence diagram',
    state: 'arrows snap to the border of each state and to the start dot, and drawing clean and lining up come first beside a state diagram',
    er: 'lines snap to the border of each entity, and drawing clean and lining up come first beside an ER diagram',
    mindmap: 'branches snap to the border of each idea, and drawing clean and lining up come first beside a mind map',
    garment: 'drawing clean and the sizes — and printing the piece at its real size — come first beside a pattern piece',
  };
  function packDoes(p) { return PACK_DOES[p.id] || p.describes; }

  /** What a pack adds, in a line: its definitions by name, its notation's symbols, its connectors. */
  function packHolds(p) {
    const parts = [];
    if (p.definitions.length) parts.push(p.definitions.map((d) => d.name).join(', '));
    if (p.notation) {
      const n = MM.notationById(p.notation);
      // "Flowchart" → "a flowchart", "ER diagram" → "an ER diagram": a name in capitals keeps them.
      const what = n ? (/^[A-Z]{2}/.test(n.name) ? n.name : n.name[0].toLowerCase() + n.name.slice(1)) : p.notation;
      const joins = n && n.connectors.length ? ' — joined by ' + n.connectors.map((x) => pluralWord(x.name)).join(', ') : '';
      parts.push('reads ' + (/^(?:[aeio]|ER\b)/i.test(what) ? 'an ' : 'a ') + what + (n ? ': ' + n.symbols.map((x) => x.name).join(', ') + joins : ''));
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
      top.appendChild(ui.chip('version ' + p.version, { cls: 'pkRef', why: 'what a pack holds under one version never changes' }));
      if (used) { top.appendChild(document.createTextNode(' ')); top.appendChild(ui.chip('in use', { cls: 'pkUsed', why: 'this board uses it' })); }
      row.appendChild(pkEl('div', 'pkWhat', packDoes(p)));
      const holds = packHolds(p);
      if (holds) row.appendChild(pkEl('div', 'pkHolds', holds));
      const b = row.appendChild(pkEl('button', '', used ? 'stop using' : 'use'));
      b.type = 'button';
      b.dataset[used ? 'unuse' : 'use'] = ref;
      b.title = used ? 'what it holds is no longer recognised on this board — undo brings it back'
        : 'this board uses it from now on: what it holds is recognised here, and says it came from the pack — undo takes it back';
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
      b.title = 'the board stops asking for it — undo brings it back';
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
        const what = p && p.definitions.length ? p.definitions.map((x) => x.name).join(', ') + ' recognised here' : p && p.notation ? 'the pen ties lines to its symbols' : 'in use';
        pkSay('this board uses ' + packSaid(d.use) + ' — ' + what + '; undo takes it back');
        say('using ' + packSaid(d.use) + ' — ' + what);
      } else if (d.unuse !== undefined) {
        session.unuse(d.unuse, Date.now());
        pkSay('this board no longer uses ' + packSaid(d.unuse) + '; undo brings it back');
        say('stopped using ' + packSaid(d.unuse));
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
