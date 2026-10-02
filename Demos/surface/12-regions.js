// ===== regions =====
// Provides: regions as the board's named places (PLAN-IPAD-NOTES I5) — the quiet titled frame under the
//   pictures and the ink (renderRegions), the title as a handle to move it (regionTitleAt, regionTitlePress,
//   the move zone of a selected region), the panel's words for one (regionPanelHtml) and the board's outline
//   (regionOutlineHtml; a tap on a line fits the view to it), dragFrameOffset (a text or figure in a dragged region follows it),
//   the minimap's frames (regionsFor), and what is
//   said of a region made or erased (regionMadeSaid, eraseSaid).
// Uses: core (MM.regionsOfBoard, describeRegion, regionSaid, holdsSaid, regionOutline, regionCarries, boundsOf),
//   view (view, wpx, fitTo), render (ctx, C, roundRect, applyPreview, boxMeets, boxOfRect, recordOp, logKey,
//   paintReference, dragPreview from selection), the closure's esc, flash, say, session, state, inspectorEl.
// A fragment of one closure: Demos/build-surface.mjs concatenates surface/*.js
// in name order inside `(function () { ... })();`. Shared state is the
// closure's; no imports, no exports, no build step beyond the concatenation.

  // ===== What a region is on the board =======================================
  // A region is a named rectangle that holds whatever stands inside it (core's `board-regions.ts`): not ink and
  // not content, so it is a frame drawn UNDER the pictures and the ink, quiet — the board's own label colour,
  // never the gold the hand's chrome wears — with its name at the top left, in board units, so it scales with
  // the place it names. What it holds is derived from where things stand; nothing here writes that. Its title is
  // a handle: press it and the region is selected and dragged, one `move` that takes what it holds along.
  // A selected region's move zone is its title and the band along its edge, never its inside — the inside is
  // where the hand writes.

  /** The regions this paint knows, largest first so a nested one is drawn over the one that holds it; kept while the log stands. */
  let regionSeen = { key: null, list: [], said: new Map() };
  function regionsFor(s) {
    const key = logKey();
    if (!paintReference && regionSeen.key === key) return regionSeen;
    const list = s.regions && s.regions.length ? MM.regionsOfBoard(s) : [];
    list.sort((a, b) => (b.bounds.maxX - b.bounds.minX) * (b.bounds.maxY - b.bounds.minY) - (a.bounds.maxX - a.bounds.minX) * (a.bounds.maxY - a.bounds.minY));
    const seen = { key: paintReference ? null : key, list: list, said: new Map() };
    if (!paintReference) regionSeen = seen;
    return seen;
  }
  /** What a region holds, read once while the log stands. */
  function regionHolds(s, id) {
    const seen = regionsFor(s);
    if (!seen.said.has(id)) seen.said.set(id, MM.describeRegion(s, id));
    return seen.said.get(id);
  }

  // The title: a size in board units that grows with the region and never falls under a legible size on
  // screen, and the box it and its hit stand in — never less than a fingertip on screen.
  const REGION_TITLE_FONT = "'Space Grotesk', system-ui, sans-serif";
  function regionTitleBox(r) {
    const b = r.bounds, side = Math.min(b.maxX - b.minX, b.maxY - b.minY);
    const base = Math.max(14, Math.min(40, side * 0.06));
    const fs = Math.min(Math.max(base, wpx(11)), Math.max(wpx(11), side * 0.4));
    ctx.font = fs.toFixed(2) + 'px ' + REGION_TITLE_FONT;
    const pad = fs * 0.55;
    const w = ctx.measureText(r.name).width + pad * 2, h = fs * 1.55;
    return { x: b.minX, y: b.minY, w: w, h: h, fs: fs, pad: pad, hitW: Math.max(w, wpx(44)), hitH: Math.max(h, wpx(30)) };
  }

  function renderRegions(s, vb, pv) {
    const seen = regionsFor(s);
    if (!seen.list.length) return;
    const selected = new Set(s.selection);
    for (const r of seen.list) {
      const held = !!pv && pv.ids.includes(r.id);
      const b = r.bounds;
      if (!held && vb && !boxMeets(b, vb)) continue;
      if (held) { ctx.save(); applyPreview(pv); }
      const rw = b.maxX - b.minX, rh = b.maxY - b.minY, t = regionTitleBox(r);
      ctx.save();
      roundRect(b.minX, b.minY, rw, rh, Math.min(wpx(8), rw / 6, rh / 6));
      ctx.fillStyle = 'rgba(' + C.labelRGB + ',0.045)';
      ctx.fill();
      ctx.setLineDash([]);
      ctx.strokeStyle = 'rgba(' + C.labelRGB + (selected.has(r.id) ? ',0.95)' : ',0.55)');
      ctx.lineWidth = wpx(selected.has(r.id) ? 1.8 : 1.2);
      ctx.stroke();
      // The title, on the frame's own top left, its ground the board's so it reads over what stands behind it.
      roundRect(t.x, t.y, t.w, t.h, Math.min(t.h / 2, wpx(10)));
      ctx.fillStyle = 'rgba(' + C.panelRGB + ',0.78)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(' + C.labelRGB + ',0.55)';
      ctx.lineWidth = wpx(1);
      ctx.stroke();
      ctx.font = t.fs.toFixed(2) + 'px ' + REGION_TITLE_FONT;
      ctx.fillStyle = 'rgba(' + C.labelRGB + ',1)';
      ctx.textBaseline = 'middle';
      ctx.fillText(r.name, t.x + t.pad, t.y + t.h / 2 + t.fs * 0.04);
      ctx.restore();
      if (held) ctx.restore();
      if (paintOps) recordOp({ kind: 'region', id: r.id, text: r.name, box: boxOfRect(b.minX, b.minY, rw, rh), moved: held });
    }
  }

  // ===== The hand on a region ================================================
  /** The region whose title is under a world point — the smaller on top — or null. */
  function regionTitleAt(w) {
    const list = regionsFor(state).list;
    for (let i = list.length - 1; i >= 0; i--) {
      const r = list[i], t = regionTitleBox(r);
      if (w.x >= t.x && w.x <= t.x + t.hitW && w.y >= t.y && w.y <= t.y + t.hitH) return r.id;
    }
    return null;
  }
  /** Whether the selection is regions and nothing else. */
  function regionsOnlySelected(s) {
    s = s || state;
    return s.selection.length > 0 && s.selection.every((id) => s.regions && s.regions.includes(id));
  }
  /** The one region selected alone, or null. */
  function selectedRegion(s) {
    s = s || state;
    return s.selection.length === 1 && s.regions && s.regions.includes(s.selection[0]) ? s.selection[0] : null;
  }
  /**
   * A selected region moves by its title and the band along its edge, never its inside (the inside is where
   * the hand writes): true when a world point is on either of any selected region.
   */
  function regionMoveZone(w) {
    const band = wpx(14);
    for (const id of state.selection) {
      const r = regionsFor(state).list.find((x) => x.id === id);
      if (!r) continue;
      const b = r.bounds, t = regionTitleBox(r);
      if (w.x >= t.x && w.x <= t.x + t.hitW && w.y >= t.y && w.y <= t.y + t.hitH) return true;
      const inOuter = w.x >= b.minX - band && w.x <= b.maxX + band && w.y >= b.minY - band && w.y <= b.maxY + band;
      const inInner = w.x > b.minX + band && w.x < b.maxX - band && w.y > b.minY + band && w.y < b.maxY - band;
      if (inOuter && !inInner) return true;
    }
    return false;
  }
  /**
   * A press on a region's title takes hold of the region: it is selected and a move begins, as the
   * selection's own would — one `move` when the hand lets go. A field open, or a press that is not on a
   * title, is nothing to it.
   */
  function regionTitlePress(w) {
    if (state.summon) return null;
    const id = regionTitleAt(w);
    if (!id) return null;
    if (!(state.selection.length === 1 && state.selection[0] === id)) session.select([id], Date.now());
    const n = state.nodes.get(id), b = n && MM.boundsOf(n);
    return b ? { kind: 'move', bounds: b } : null;
  }
  /** What a drag of these ids acts on: a region takes what it holds, as the replay will carry it. */
  function dragCarried(ids) {
    return state.regions && state.regions.length && ids.some((id) => state.regions.includes(id)) ? MM.regionCarries(state, ids) : ids;
  }

  /** Where a hand's move drags an artifact's frame to, before the log has it: a text or a figure in a region follows the drag. */
  function dragFrameOffset(id) {
    const pv = dragPreview();
    return pv && pv.kind === 'move' && pv.ids.includes(id) ? { dx: pv.dx, dy: pv.dy } : { dx: 0, dy: 0 };
  }

  // ===== What is said ========================================================
  /** The status line after a region is made. */
  function regionMadeSaid(made) {
    if (!made) { say('nothing to stand a region round'); return; }
    const d = MM.describeRegion(session.getState(), made.id);
    flash((d ? MM.regionSaid(d) : 'a region “' + made.name + '”') + (made.around === 'frame' ? ' — your rectangle is its frame' : ' — drawn round what was held') + ' · press its title to move it; undo takes it away, what it holds stays');
  }
  /** The status line after an erase of the selection: a region is erased alone, and what it held stays. */
  function eraseSaid(ids, regionNames) {
    const regions = regionNames.length, marks = ids.length - regions;
    if (!regions) return 'erased ' + marks + ' mark' + (marks === 1 ? '' : 's');
    const r = regions === 1 ? 'the region “' + regionNames[0] + '”' : regions + ' regions';
    return 'erased ' + r + ' — what it held stays where it is; undo brings it back' + (marks ? ' · and ' + marks + ' mark' + (marks === 1 ? '' : 's') : '');
  }
  /** Erase the selection (Delete): a region erases alone and says what stays. */
  function eraseSelection() {
    const s = session.getState();
    const ids = s.selection.slice();
    const names = ids.filter((id) => s.regions && s.regions.includes(id)).map((id) => { const r = regionsFor(s).list.find((x) => x.id === id); return r ? r.name : id; });
    ids.forEach((id) => session.erase(id, Date.now()));
    flash(eraseSaid(ids, names));
  }

  // ===== The panel: one region, and the board's outline ======================
  /** The panel for a region selected alone: what it is, what it holds, its name to change. */
  function regionPanelHtml(s, id) {
    const d = regionHolds(s, id);
    if (!d) return '<div class="eyebrow">region</div><div class="empty">that region is gone</div>';
    return '<div class="eyebrow">region</div>' +
      '<div class="row"><span class="k">is</span><span class="v">' + esc(MM.regionSaid(d)) + '</span></div>' +
      '<div class="row"><span class="k">becomes</span><span class="v">move it by its title — what it holds goes with it, in one act</span></div>' +
      regionLikeHtml(s, id) +
      '<div class="acts"><input class="regionName" type="text" value="' + esc(d.name) + '" maxlength="60" aria-label="the region\'s name" data-region-name="' + esc(id) + '">' +
      '<button class="mini" type="button" data-region-rename="' + esc(id) + '" title="give it this name">rename</button>' +
      '<button class="mini" type="button" data-region-fit="' + esc(id) + '" title="take the view to it">show it</button></div>' +
      '<div class="why">erasing it keeps everything it holds; a mark moved out of it is let go, and one drawn in is held</div>';
  }
  /** *Notes like this* for a region: a region is selected, never held by the field, so its offer is a button here — only with a semantic seat held and words in it (I9). */
  function regionLikeHtml(s, id) {
    if (!semanticHost() || !MM.wordsOfMarks(s, [id])) return '';
    return '<div class="acts"><button class="mini" type="button" data-region-like="' + esc(id) + '" title="lists the notes nearest what this region says, across every board — by the model on this device, nothing sent anywhere">notes like this</button></div>';
  }
  /** The board's outline, at the foot of the panel: its regions as a tree, a tap on a line takes the view there. Empty when there are none. */
  function regionOutlineHtml(s) {
    if (!s.regions || !s.regions.length) return '';
    const rows = MM.regionOutline(s);
    if (!rows.length) return '';
    return '<div class="sep"></div><div class="eyebrow">outline <span class="srccount">' + rows.length + ' region' + (rows.length === 1 ? '' : 's') + '</span></div>' +
      '<div class="outline">' + rows.map((o) =>
        '<button class="mini outlineRow" type="button" data-region-fit="' + esc(o.id) + '" style="margin-left:' + (o.depth * 14) + 'px" title="take the view to it">' +
        '<b>' + esc(o.name) + '</b> <span class="v">' + esc(MM.holdsSaid(o.holds)) + '</span></button>').join('') + '</div>';
  }
  /** The view to a region: fitted to it, with room. */
  function regionFit(id) {
    const r = regionsFor(session.getState()).list.find((x) => x.id === id);
    if (!r) return;
    fitTo(r.bounds);
    flash('“' + r.name + '” — ' + MM.holdsSaid(regionHolds(session.getState(), id).holds));
  }
  function regionRename(id, name) {
    const done = session.renameRegion({ nodeId: id, name: name, at: Date.now() });
    flash(done ? 'renamed to “' + name.trim() + '” — undo takes the old name back' : 'a region needs a name');
    return done;
  }
  inspectorEl.addEventListener('click', (e) => {
    const t = e.target && e.target.closest && e.target.closest('[data-region-fit],[data-region-rename],[data-region-like]');
    if (!t) return;
    if (t.hasAttribute('data-region-like')) { const id = t.getAttribute('data-region-like'); likeNotes({ text: MM.wordsOfMarks(session.getState(), [id]), ids: [id] }); return; }
    if (t.hasAttribute('data-region-fit')) { regionFit(t.getAttribute('data-region-fit')); return; }
    const id = t.getAttribute('data-region-rename');
    const input = inspectorEl.querySelector('input[data-region-name="' + id + '"]');
    if (input) regionRename(id, input.value);
  });
  inspectorEl.addEventListener('keydown', (e) => {
    const t = e.target;
    if (e.key !== 'Enter' || !t || !t.hasAttribute || !t.hasAttribute('data-region-name')) return;
    e.preventDefault();
    regionRename(t.getAttribute('data-region-name'), t.value);
  });
