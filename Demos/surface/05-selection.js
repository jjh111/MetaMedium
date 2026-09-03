// ===== selection =====
// Provides: the selection as a thing on the canvas — a soft outline with
//   handles around what a loop became; hit tests (handleAt); the drag preview
//   the input applies while a hand moves, scales or rotates; renderSelection.
// Uses: core (state, session), view (wpx, worldToScreen), render (union), input (drag).
// A fragment of one closure: Demos/build-surface.mjs concatenates surface/*.js
// in name order inside `(function () { ... })();`. Shared state is the
// closure's; no imports, no exports, no build step beyond the concatenation.

  // The selection is the lasso that finished. The loop dissolves as ink and in
  // its place is an outline the hand can take hold of: drag inside to move,
  // a corner to scale, the knob above to turn. None of it is a mode — the
  // next stroke elsewhere dissolves it, a tap dismisses it (and is never a
  // dot), and undoing the dismissal brings it back where it was.
  let drag = null; // { ids, mode: 'move'|'scale'|'rotate', start, last, about, moved }

  function selectionBounds(s) {
    const ids = (s || state).selection.filter((id) => (s || state).nodes.get(id) && MM.boundsOf((s || state).nodes.get(id)));
    if (!ids.length) return null;
    return union(ids.map((id) => MM.boundsOf((s || state).nodes.get(id))));
  }

  /** The drag's current transform, as a preview the renderer applies before the log has it. */
  function dragPreview() {
    if (!drag || !drag.moved) return null;
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

  /** What is under a world point, as far as the selection is concerned. */
  function handleAt(w) {
    const b = selectionBounds();
    if (!b) return null;
    const h = handles(b), r = HANDLE() * 1.6;
    for (const k of Object.keys(h.corners)) {
      const c = h.corners[k];
      if (Math.hypot(w.x - c.x, w.y - c.y) <= r) return { kind: 'scale', corner: k, at: c, bounds: b };
    }
    if (Math.hypot(w.x - h.knob.x, w.y - h.knob.y) <= r) return { kind: 'rotate', bounds: b };
    const o = h.outline;
    if (w.x >= o.minX && w.x <= o.maxX && w.y >= o.minY && w.y <= o.maxY) return { kind: 'move', bounds: b };
    return null;
  }

  function beginDrag(hit, w) {
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
    if (pv.kind === 'move') session.move({ ids, dx: pv.dx, dy: pv.dy, at });
    else if (pv.kind === 'scale') session.scale({ ids, about: pv.about, sx: pv.sx, sy: pv.sy, at });
    else session.rotate({ ids, about: pv.about, radians: pv.radians, at });
  }

  function renderSelection(s) {
    const b0 = selectionBounds(s);
    if (!b0) return;
    ctx.save();
    const pv = dragPreview();
    if (pv) applyPreview(pv);
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
    ctx.restore();
  }
