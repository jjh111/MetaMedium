// ===== selection =====
// Provides: tiedSentence (a connector tied to a mark, said in words — U1b); the selection as a thing on the canvas — a soft outline with
//   handles around what a loop became, and the one selected mark's own points
//   (V1-PLAN E1); hit tests (handleAt); the drag preview the input applies
//   while a hand moves, scales, rotates or reshapes, and what follows it —
//   the connectors bound to what the hand moves (V1-PLAN E2, dragFollowers);
//   a connector's own end, dragged, feeling the magnets; renderSelection.
// Uses: core (state, session), view (wpx, worldToScreen), render (union, logKey, magnetRing), snap (magnetQuery), input (drag, flash).
// A fragment of one closure: Demos/build-surface.mjs concatenates surface/*.js
// in name order inside `(function () { ... })();`. Shared state is the
// closure's; no imports, no exports, no build step beyond the concatenation.

  // The selection is the lasso that finished. The loop dissolves as ink and in
  // its place is an outline the hand can take hold of: drag inside to move,
  // a corner to scale, the knob above to turn. None of it is a mode — the
  // next stroke elsewhere dissolves it, a tap dismisses it (and is never a
  // dot), and undoing the dismissal brings it back where it was.
  let drag = null; // { ids, mode: 'move'|'scale'|'rotate'|'reshape', start, last, about, moved } — a reshape's also { id, handle, grab, to, pv, end, hold }

  // ===== Handles: the one mark's own points (V1-PLAN E1; CONTROL-POINTS-PLAN P2) =====
  // One mark selected alone, with a clean form — held, or the one it would be
  // offered — shows its handles: its own sites (core's `handlesOf`, the same
  // the magnets offer; an arc's ends and bulge), small rings on the selection.
  // Dragging one previews the reshape — the form as it will be, the ink faint
  // beneath — and, let go, writes one `reshape`: one act, one undo. A mark
  // with no clean form shows none.
  //
  // WHICH GESTURE OWNS WHICH ZONE. Every handle — the selection's four scale
  // corners and its knob, and the mark's own points — owns the ground nearer
  // to it than to any other handle, within a handle's reach; on an exact tie
  // the selection's own wins. The rest of the outline is the move zone. So a
  // box's corner, which carries both — its own corner on the ink, the scale
  // corner on the outline a little way out from it — is split by nearness:
  // pressed on the box's corner it reshapes, on the outline's corner it
  // scales. A mark too small on screen for its handles to leave room to move
  // it (HANDLES_MIN_PX) shows none until the board is zoomed in.
  const HANDLES_MIN_PX = 48;
  let handlesDrawn = []; // the last paint's handles, for tests: { kind, index, x, y, reasoning } in world units
  let handlesAt = { key: null, list: [] };

  /** The handles the selection offers now: the one selected mark's own points, when it has them and stands big enough on screen. */
  function markHandles(s) {
    s = s || state;
    if (s.selection.length !== 1) return [];
    const key = logKey() + '|' + s.selection[0] + '|' + view.zoom;
    if (s === state && handlesAt.key === key) return handlesAt.list;
    const n = s.nodes.get(s.selection[0]);
    const b = n && MM.boundsOf(n);
    const list = b && Math.max(b.maxX - b.minX, b.maxY - b.minY) * view.zoom >= HANDLES_MIN_PX ? MM.handlesOf(n, s.nodes) : [];
    if (s === state) handlesAt = { key: key, list: list };
    return list;
  }
  /** Moves the clean form whole rather than a point of it: drawn with a dot in its ring. */
  const movesWhole = (h) => h.kind === 'centre' || h.kind === 'point' || (h.kind === 'middle' && h.shape !== 'rectangle');
  function drawHandle(h, active) {
    ctx.beginPath();
    ctx.arc(h.point.x, h.point.y, wpx(active ? 5.5 : 4.5), 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${C.panelRGB},0.95)`;
    ctx.fill();
    ctx.lineWidth = wpx(1.5);
    ctx.strokeStyle = C.gold;
    ctx.stroke();
    if (movesWhole(h)) {
      ctx.beginPath();
      ctx.arc(h.point.x, h.point.y, wpx(1.6), 0, Math.PI * 2);
      ctx.fillStyle = C.gold;
      ctx.fill();
    }
  }
  /** The mark a reshape drag is showing as it will be, or null: the render draws that one's clean form. */
  function reshapeShownFor(id) {
    return drag && drag.mode === 'reshape' && drag.moved && drag.id === id && drag.pv ? drag.pv.node : null;
  }

  function selectionBounds(s) {
    const ids = (s || state).selection.filter((id) => (s || state).nodes.get(id) && MM.boundsOf((s || state).nodes.get(id)));
    if (!ids.length) return null;
    return union(ids.map((id) => MM.boundsOf((s || state).nodes.get(id))));
  }

  /** The drag's current transform, as a preview the renderer applies before the log has it. A reshape moves no mark as a whole: its preview is the form. */
  function dragPreview() {
    if (!drag || !drag.moved) return null;
    if (drag.mode === 'reshape') return { ids: [], kind: 'reshape', id: drag.id, handle: drag.handle, to: drag.to, node: drag.pv ? drag.pv.node : null, shape: drag.pv ? drag.pv.clean.shape : null, end: drag.end, hold: drag.hold };
    const dx = drag.last.x - drag.start.x, dy = drag.last.y - drag.start.y;
    if (drag.mode === 'move') return { ids: drag.ids, kind: 'move', dx, dy };
    if (drag.mode === 'scale') {
      const b = drag.bounds;
      const sx = Math.max(0.05, (drag.corner.x + dx - drag.about.x) / (drag.corner.x - drag.about.x || 1e-6));
      const sy = Math.max(0.05, (drag.corner.y + dy - drag.about.y) / (drag.corner.y - drag.about.y || 1e-6));
      return { ids: drag.ids, kind: 'scale', about: drag.about, sx: b ? sx : 1, sy: b ? sy : 1 };
    }
    const a0 = Math.atan2(drag.start.y - drag.about.y, drag.start.x - drag.about.x);
    const a1 = Math.atan2(drag.last.y - drag.about.y, drag.last.x - drag.about.x);
    return { ids: drag.ids, kind: 'rotate', about: drag.about, radians: a1 - a0 };
  }

  /** Apply the preview to the canvas transform for one mark's drawing. */
  function applyPreview(pv) {
    if (pv.kind === 'move') ctx.translate(pv.dx, pv.dy);
    else if (pv.kind === 'scale') { ctx.translate(pv.about.x, pv.about.y); ctx.scale(pv.sx, pv.sy); ctx.translate(-pv.about.x, -pv.about.y); }
    else { ctx.translate(pv.about.x, pv.about.y); ctx.rotate(pv.radians); ctx.translate(-pv.about.x, -pv.about.y); }
  }

  const HANDLE = () => wpx(7);
  function handles(b) {
    const pad = wpx(10);
    const o = { minX: b.minX - pad, maxX: b.maxX + pad, minY: b.minY - pad, maxY: b.maxY + pad };
    return {
      outline: o,
      corners: { nw: { x: o.minX, y: o.minY }, ne: { x: o.maxX, y: o.minY }, sw: { x: o.minX, y: o.maxY }, se: { x: o.maxX, y: o.maxY } },
      knob: { x: (o.minX + o.maxX) / 2, y: o.minY - wpx(26) },
    };
  }

  /**
   * What is under a world point, as far as the selection is concerned: the
   * nearest handle in reach — the selection's scale corners and knob first, so
   * they win a tie, then the one mark's own points — else the move zone.
   */
  function handleAt(w) {
    const b = selectionBounds();
    if (!b) return null;
    const h = handles(b), r = HANDLE() * 1.6;
    let best = null, bestD = Infinity;
    const offer = (hit, p) => {
      const d = Math.hypot(w.x - p.x, w.y - p.y);
      if (d <= r && d < bestD) { best = hit; bestD = d; }
    };
    for (const k of Object.keys(h.corners)) offer({ kind: 'scale', corner: k, at: h.corners[k], bounds: b }, h.corners[k]);
    offer({ kind: 'rotate', bounds: b }, h.knob);
    for (const mh of markHandles()) offer({ kind: 'reshape', id: mh.nodeId, handle: { kind: mh.kind, index: mh.index }, at: mh.point, bounds: b }, mh.point);
    if (best) return best;
    const o = h.outline;
    if (w.x >= o.minX && w.x <= o.maxX && w.y >= o.minY && w.y <= o.maxY) return { kind: 'move', bounds: b };
    return null;
  }

  function beginDrag(hit, w) {
    if (hit.kind === 'reshape') {
      // The handle follows the hand from where it was taken, not from where the pen landed on it.
      // A connector's own tail or tip is one of its ends (V1-PLAN E2): it feels the magnets as it goes.
      const n = state.nodes.get(hit.id);
      const end = n ? MM.endOfHandle(n, state.nodes, hit.handle.kind) : null;
      drag = { ids: [], mode: 'reshape', id: hit.id, handle: hit.handle, grab: hit.at, to: hit.at, pv: null, end: end, hold: null, start: w, last: w, moved: false, bounds: hit.bounds };
      canvas.style.cursor = 'grabbing';
      return;
    }
    const b = hit.bounds;
    const centre = { x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 };
    const opposite = hit.kind === 'scale'
      ? { x: hit.corner.includes('w') ? b.maxX : b.minX, y: hit.corner.includes('n') ? b.maxY : b.minY }
      : centre;
    drag = { ids: state.selection.slice(), mode: hit.kind, start: w, last: w, moved: false, about: opposite, corner: hit.at || null, bounds: b };
    canvas.style.cursor = hit.kind === 'move' ? 'grabbing' : hit.kind === 'scale' ? 'nwse-resize' : 'grab';
  }

  function updateDrag(w) {
    if (!drag) return;
    drag.last = w;
    if (!drag.moved && Math.hypot(w.x - drag.start.x, w.y - drag.start.y) > wpx(3)) drag.moved = true;
    if (drag.mode === 'reshape' && drag.moved) {
      // The form as it will be: the very function the reshape runs, on the board's own state.
      drag.to = { x: drag.grab.x + (w.x - drag.start.x), y: drag.grab.y + (w.y - drag.start.y) };
      const n = state.nodes.get(drag.id);
      // A connector's own end feels every other mark's sites as the pen does (V1-PLAN E2): in a
      // site's reach it lands on the site, and let go there it binds there — an offer, never a trap.
      drag.hold = n && drag.end ? magnetQuery(drag.to, drag.id) : null;
      drag.pv = n ? MM.reshapePreview(n, state.nodes, drag.handle, drag.hold ? drag.hold.site.point : drag.to) : null;
    }
    render(state);
  }

  /** One event for the whole drag, so undo is one step. */
  function endDrag() {
    if (!drag) return;
    const pv = dragPreview();
    const ids = drag.ids;
    drag = null;
    canvas.style.cursor = 'crosshair';
    if (!pv) { render(state); return; }
    const at = Date.now();
    if (pv.kind === 'reshape') {
      // One reshape: the form where the hand let go, the ink as it was. A mark
      // not yet drawn clean is drawn clean by the same act — said, once. A
      // connector's own end let go where a magnet holds it binds there; let go
      // anywhere else, a bound end lets go of its site (V1-PLAN E2) — both in
      // the same act, and one undo takes it all back.
      const n = state.nodes.get(pv.id);
      const born = !!n && !MM.cleanOf(n);
      const hold = pv.hold;
      const n0 = session.getEvents().length;
      const bind = hold ? { nodeId: hold.site.nodeId, site: { kind: hold.site.kind, index: hold.site.index } } : null;
      if (!session.reshape({ id: pv.id, handle: pv.handle, to: hold ? hold.site.point : pv.to, at, bind: bind })) { render(state); return; }
      const wrote = session.getEvents().slice(n0).map((e) => e.type);
      if (wrote.includes('bind')) flash(tiedSentence(pv.id, hold.site, pv.handle && pv.handle.kind === 'tail' ? 'start' : 'end'));
      else if (wrote.includes('unbind')) flash('let go — that end is tied to nothing now; undo ties it again');
      else if (born) flash('drawn clean and reshaped — the ink stays beneath; undo takes both back');
      return;
    }
    const n0 = session.getEvents().length;
    if (pv.kind === 'move') session.move({ ids, dx: pv.dx, dy: pv.dy, at });
    else if (pv.kind === 'scale') session.scale({ ids, about: pv.about, sx: pv.sx, sy: pv.sy, at });
    else session.rotate({ ids, about: pv.about, radians: pv.radians, at });
    // A connector moved whole lets go of the sites it walked off, in the same act (V1-PLAN E2).
    const loose = session.getEvents().slice(n0).filter((e) => e.type === 'unbind').length;
    if (loose) flash('moved — ' + (loose === 1 ? 'an end' : loose + ' ends') + ' let go of the sites ' + (loose === 1 ? 'it was' : 'they were') + ' tied to; undo ties ' + (loose === 1 ? 'it' : 'them') + ' again');
  }

  // ===== What follows the drag (V1-PLAN E2) =====
  // While a hand moves, scales, turns or reshapes marks, the connectors bound
  // to them are drawn following — as they will stand when the hand lets go,
  // by the very functions the replay runs (core's manipulatedReps, releasedBy,
  // reshapeDecision and followPreview), so the preview is the act. Nothing
  // here is written: the follow is derived when the log has the move.
  let boundByAt = { key: null, index: null };
  /** The connectors that follow the drag in progress, each as it will stand — id to node — or null. */
  function dragFollowers() {
    const pv = dragPreview();
    if (!pv) return null;
    const s = state;
    const key = logKey();
    if (boundByAt.key !== key) boundByAt = { key: key, index: MM.boundByIndex(s.nodes) };
    if (!boundByAt.index.size) return null; // nothing on the board is bound: nothing follows
    const changed = new Map();
    if (pv.kind === 'reshape') {
      const n = s.nodes.get(pv.id);
      if (!n || !pv.node) return null;
      // The mark as the drag leaves it, the ends its own drag lets go of let go of here too.
      const d = MM.reshapeDecision(n, s.nodes, pv.handle, pv.node, pv.shape, pv.hold ? { nodeId: pv.hold.site.nodeId, site: { kind: pv.hold.site.kind, index: pv.hold.site.index } } : null);
      changed.set(pv.id, MM.lettingGo(pv.node, d.releases));
    } else {
      const m = pv.kind === 'move' ? { type: 'move', dx: pv.dx, dy: pv.dy } : pv.kind === 'scale' ? { type: 'scale', about: pv.about, sx: pv.sx, sy: pv.sy } : { type: 'rotate', about: pv.about, radians: pv.radians };
      const released = MM.releasedBy(s.nodes, pv.ids, m);
      for (const n of MM.manipulableOf(s.nodes, pv.ids)) {
        const reps = MM.manipulatedReps(n, m);
        if (!reps) continue;
        const mine = released.filter((r) => r.strokeId === n.id).map((r) => r.end);
        changed.set(n.id, MM.lettingGo(Object.assign({}, n, { reps: reps }), mine));
      }
    }
    if (!changed.size) return null;
    const out = MM.followPreview(s.nodes, changed, boundByAt.index);
    if (!out.size) return null;
    // A routed connector is drawn routed from where the drag takes what it is tied to (V1-PLAN D7): the
    // function the replay runs, over the board as the drag leaves it.
    let preview = null;
    for (const [id, n] of out) {
      if (!MM.routeRepOf(n)) continue;
      if (!preview) {
        preview = new Map(s.nodes);
        for (const [cid, cn] of changed) preview.set(cid, cn);
        for (const [fid, fn] of out) preview.set(fid, fn);
      }
      const near = (box) => s.contentIds.filter((cid) => { const cb = MM.boundsOf(preview.get(cid)); return !!cb && cb.minX <= box.maxX && box.minX <= cb.maxX && cb.minY <= box.maxY && box.minY <= cb.maxY; });
      out.set(id, Object.assign({}, n, { reps: n.reps.filter((r) => r.modality !== 'route').concat([{ modality: 'route', data: MM.deriveRoute(n, preview, near), source: 'engine' }]) }));
    }
    return out;
  }

  function renderSelection(s) {
    const pv = dragPreview();
    // While a handle is dragged the outline follows the form as it will be.
    const reshaping = !!pv && pv.kind === 'reshape' && !!pv.node;
    const b0 = reshaping ? MM.boundsOf(pv.node) : selectionBounds(s);
    handlesDrawn = [];
    if (!b0) return;
    ctx.save();
    if (pv && pv.kind !== 'reshape') applyPreview(pv);
    const h = handles(b0), o = h.outline;
    ctx.setLineDash([wpx(5), wpx(5)]);
    ctx.strokeStyle = `rgba(${C.goldRGB},0.75)`;
    ctx.lineWidth = wpx(1.2);
    roundRect(o.minX, o.minY, o.maxX - o.minX, o.maxY - o.minY, wpx(6));
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = C.gold;
    const hs = HANDLE();
    for (const k of Object.keys(h.corners)) { const c = h.corners[k]; ctx.fillRect(c.x - hs / 2, c.y - hs / 2, hs, hs); }
    ctx.beginPath(); ctx.moveTo(h.knob.x, o.minY); ctx.lineTo(h.knob.x, h.knob.y); ctx.strokeStyle = `rgba(${C.goldRGB},0.6)`; ctx.lineWidth = wpx(1); ctx.stroke();
    ctx.beginPath(); ctx.arc(h.knob.x, h.knob.y, hs * 0.7, 0, Math.PI * 2); ctx.fill();
    // The one mark's own points, where they are — or will be, while one is dragged.
    const own = reshaping ? MM.handlesOf(pv.node, s.nodes) : markHandles(s);
    for (const mh of own) {
      drawHandle(mh, reshaping && pv.handle.kind === mh.kind && pv.handle.index === mh.index);
      handlesDrawn.push({ kind: mh.kind, index: mh.index, x: mh.point.x, y: mh.point.y, reasoning: mh.reasoning });
    }
    // A connector's own end in a site's reach: the ring the pen's magnet draws, where it will bind.
    if (reshaping && pv.hold) magnetRing(pv.hold, ctx);
    ctx.restore();
  }

  /**
   * A connector tied to a mark, in words (PLAN-USER-SURFACE U1b): "the line is tied to the
   * circle", "the arrow's tip is tied to the box" — never a site's coordinates or an id.
   */
  function tiedSentence(connectorId, site, end) {
    const words = { rectangle: 'box', ink: 'mark', text: 'writing' };
    const s = session.getState();
    const c = connectorId && s.nodes.get(connectorId);
    const shape = c && MM.topInterpretation(c);
    const what = shape === 'arrow' || shape === 'arc' || shape === 'line' ? shape : 'line';
    const to = words[site.shape] || site.shape || 'mark';
    const which = end === 'end' && what === 'arrow' ? 'the arrow\'s tip' : end === 'start' && what === 'arrow' ? 'the arrow\'s tail' : 'the ' + what;
    return which + ' is tied to the ' + to + ' — undo lets it go';
  }
