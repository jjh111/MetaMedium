// ===== input =====
// Provides: pointer input (draw, pan, pinch), keys, flash().
// Uses: core, view, snap (autoSweep), render.
// A fragment of one closure: Demos/build-surface.mjs concatenates surface/*.js
// in name order inside `(function () Ellipsis)();`. Shared state is the
// closure's; no imports, no exports, no build step beyond the concatenation.

  // ===== Input: strokes in, nothing gated, no modes ========================
  // Pointer events belong to the ink layer. You are ALWAYS drawing; panning is
  // the deliberate act (space, middle button, or alt), never the default. That
  // is what makes "doodle on top of the running page" work at all.
  let panning = null;
  let spaceHeld = false;

  // Pointer capture is a nicety — it keeps a stroke alive when the pointer
  // leaves the element. It is NOT allowed to be the reason a stroke fails to
  // start, so its failure is swallowed rather than thrown into the draw loop.
  function capture(el, e) {
    try { el.setPointerCapture(e.pointerId); } catch (err) { /* not capturable */ }
  }

  const touches = new Map(); // pointerId → {x, y}, for two-finger pinch
  let pinch = null;          // { dist, mid, zoom } at the moment the second finger landed

  canvas.addEventListener('pointerdown', (e) => {
    capture(canvas, e);
    if (e.pointerType === 'touch') {
      touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (touches.size === 2) {
        // Two fingers: this is a pinch, not a stroke. Drop the live ink — it
        // was the first finger landing, not a mark.
        live = null;
        const [a, b] = [...touches.values()];
        pinch = { dist: Math.hypot(a.x - b.x, a.y - b.y), mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, zoom: view.zoom };
        return;
      }
    }
    if (e.button === 1 || e.altKey || spaceHeld) {
      panning = { x: e.clientX, y: e.clientY };
      canvas.style.cursor = 'grabbing';
      return;
    }
    // A hand landing on the selection takes hold of it rather than drawing.
    const w0 = screenToWorld(e.clientX, e.clientY);
    const hit = state.selection.length ? handleAt(w0) : null;
    // A hand on a body in a running tank is acting it out, not moving ink.
    if (hit && hit.kind === 'move' && demoBegin(state.selection, w0)) return;
    if (hit) { beginDrag(hit, w0); return; }
    live = [w0];
  });

  canvas.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch' && touches.has(e.pointerId)) {
      touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch && touches.size === 2) {
        const [a, b] = [...touches.values()];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        const target = clampZoom(pinch.zoom * (dist / Math.max(1, pinch.dist)));
        zoomAround(pinch.mid.x, pinch.mid.y, target / view.zoom);
        view.panX += mid.x - pinch.mid.x;
        view.panY += mid.y - pinch.mid.y;
        pinch.mid = mid;
        afterViewChange();
        return;
      }
    }
    if (demoMove(screenToWorld(e.clientX, e.clientY))) return;
    if (drag) { updateDrag(screenToWorld(e.clientX, e.clientY)); return; }
    if (panning) {
      view.panX += e.clientX - panning.x;
      view.panY += e.clientY - panning.y;
      panning = { x: e.clientX, y: e.clientY };
      afterViewChange();
      return;
    }
    if (!live) {
      const w = screenToWorld(e.clientX, e.clientY);
      const over = nodeAt(w.x, w.y);
      if (over !== hoverId) { hoverId = over; render(state); }
      return;
    }
    live.push(screenToWorld(e.clientX, e.clientY));
    render(state); // live ink
  });

  const endTouch = (e) => {
    if (e.pointerType !== 'touch') return false;
    touches.delete(e.pointerId);
    if (touches.size < 2) pinch = null;
    return touches.size > 0; // a finger is still down: nothing to commit yet
  };
  canvas.addEventListener('pointercancel', (e) => { endTouch(e); live = null; });

  canvas.addEventListener('pointerup', (e) => {
    if (endTouch(e)) { live = null; return; }
    if (panning) { panning = null; canvas.style.cursor = 'crosshair'; return; }
    if (demoEnd()) return;
    if (drag) { endDrag(); return; }
    lastPen = { x: e.clientX, y: e.clientY };
    const points = live;
    live = null;
    // The dead state: a tap while something is dismissable is the dismissal,
    // and never a dot. Only a tap on empty ground with nothing to dismiss
    // could be a dot — and a bare tap is not one either; a dot is drawn.
    const tiny = points && points.length < 3;
    if (tiny) {
      const s0 = session.getState();
      if (s0.summon) session.dismiss(s0.summon.id, Date.now());
      else if (s0.selection.length) session.deselect(Date.now());
      render(session.getState());
      return;
    }

    // Clear hover *before* the engine notifies: the render it triggers must
    // report the mark just made, not whatever the cursor was resting on.
    hoverId = null;
    // Points are world coordinates; the scale says how big the hand's pixel was
    // when they were drawn. Position belongs in world space, the hand does not —
    // without this, the same check reads as a closed loop at 1.7x zoom.
    const id = session.addStroke(points, Date.now(), undefined, 1 / view.zoom);

    // Say what happened when a stroke rubbed something out — a silent erase is
    // indistinguishable from a bug. Read it from the stroke's own gesture rep,
    // NOT from a drop in the content count: a lasso resolved by a command mark
    // also leaves the content plane, and reporting that as "erased" would be a
    // lie about the one operation the user most needs to trust.
    const after = session.getState();
    const made = after.nodes.get(id);
    const g = made && MM.getRep(made, 'gesture');
    // Auto: take every open offer the moment it is made — this stroke, and any
    // earlier closed stroke that was a loop-in-waiting until this one settled
    // it. Never the held loop itself; that is a gesture until the next mark
    // says otherwise.
    if (!g) autoSweep();
    if (g && g.data && g.data.role === 'scratch') {
      const n = (g.data.erased || []).length;
      flash('erased ' + n + ' mark' + (n === 1 ? '' : 's'));
    } else if (after.markMiss && after.markMiss.nearMiss) {
      // Only when the stroke was recognisably an ATTEMPT. A gesture that fails
      // silently cannot be learned — the user cannot tell whether they drew it
      // wrong, waited too long, or made it too big. Saying nothing about marks
      // that were plainly just drawing keeps this from becoming nagging.
      flash('no summon — ' + after.markMiss.detail);
    }
  });

  canvas.addEventListener('pointerleave', () => { hoverId = null; render(state); });

  addEventListener('keydown', (e) => {
    if (e.code === 'Space' && !spaceHeld && e.target === document.body) {
      spaceHeld = true; canvas.style.cursor = 'grab'; e.preventDefault();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); session.undo(); }
    if (e.target === document.body && e.key === 'Escape' && state.selection.length && !state.summon) session.deselect(Date.now());
    if (e.target === document.body && (e.key === 'Backspace' || e.key === 'Delete') && state.selection.length) {
      e.preventDefault();
      const ids = state.selection.slice();
      ids.forEach((id) => session.erase(id, Date.now()));
      flash('erased ' + ids.length + ' mark' + (ids.length === 1 ? '' : 's'));
    }
    if (e.key === '0' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); fitAll(); }
    if (e.target === document.body && (e.key === '=' || e.key === '+')) zoomAround(innerWidth / 2, innerHeight / 2, 1.2);
    if (e.target === document.body && (e.key === '-' || e.key === '_')) zoomAround(innerWidth / 2, innerHeight / 2, 1 / 1.2);
  });
  addEventListener('keyup', (e) => {
    if (e.code === 'Space') { spaceHeld = false; canvas.style.cursor = 'crosshair'; }
  });

  // A slider is a term's weight; one event when the hand lets go, so undo is one step.
  inspectorEl.addEventListener('change', (e) => {
    const r = e.target;
    if (!r || r.type !== 'range' || !r.dataset.term) return;
    const id = r.dataset.id;
    const n = state.nodes.get(id);
    const b = n && MM.blessedBehaviourOf(n);
    if (!b) return;
    const terms = b.terms.map((t, i) => (i === Number(r.dataset.term) ? { ...t, weight: Number(r.value) } : t));
    session.behave({ nodeId: id, behaviour: { terms: terms, source: 'hand', speed: b.speed }, participantId: MM.LOCAL_PARTICIPANT, at: Date.now() });
  });
  document.getElementById('undoBtn').onclick = () => session.undo();
  inspectorEl.addEventListener('click', (e) => {
    const b = e.target.closest && e.target.closest('button[data-act]');
    if (!b) return;
    const id = b.getAttribute('data-id');
    const act = b.getAttribute('data-act');
    if (act === 'snap') snapAll([id]);
    else if (act === 'read') { const n = state.nodes.get(id); if (n && !readOne(n, true)) offerModel('Reading writing needs a model that can see.'); }
    else if (act === 'split') session.splitWord(id, Date.now());
    else if (act === 'clock-play') session.clock({ nodeId: id, op: 'play', at: Date.now() });
    else if (act === 'clock-pause') session.clock({ nodeId: id, op: 'pause', at: Date.now() });
    else if (act === 'clock-reset') session.clock({ nodeId: id, op: 'reset', at: Date.now() });
    else if (act === 'behave-use') {
      // A held behaviour, given in the human's name: that is the bless.
      const n = state.nodes.get(id);
      const rep = n && MM.behavioursOf(n)[Number(b.getAttribute('data-index'))];
      if (rep) session.behave({ nodeId: id, behaviour: { terms: rep.data.terms, source: rep.data.source, speed: rep.data.speed }, participantId: MM.LOCAL_PARTICIPANT, at: Date.now() });
    }
    else if (act === 'behave-drop') session.behave({ nodeId: id, behaviour: { terms: [{ verb: 'wander', weight: 1 }, { verb: 'hold', weight: 0.35 }], source: 'hand' }, participantId: MM.LOCAL_PARTICIPANT, at: Date.now() });
    else session.snap({ ids: [id], mode: 'raw', at: Date.now() });
  });
  document.getElementById('resetBtn').onclick = () => location.reload();

  // A transient line in the status bar. It must re-render IMMEDIATELY: the
  // render triggered by the stroke itself has already happened by the time we
  // know what the stroke did, so without this the message is set and never
  // shown, and an erase looks silent.
  let flashText = null, flashAt = 0, flashTimer = null;
  const FLASH_MS = 1600;
  function flash(msg) {
    flashText = msg;
    flashAt = Date.now();
    render(session.getState());
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => { flashText = null; render(session.getState()); }, FLASH_MS);
  }
