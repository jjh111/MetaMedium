// ===== input =====
// Provides: pointer input (draw, pan, pinch) for the mouse, the pen and the finger — the palm ignored,
//   the pen's pressure on every point it draws, its hover a hover (V1-PLAN R6) — keys (undo, copy,
//   paste, erase, zoom), say()/flash() for the status line.
// Uses: core (draws, setDraws), hand (the rules: fingerRole, palmNow, whenPenLands, PAN_SLOP_PX), view,
//   snap (autoSweep, magnetQuery), render (drawLive), palette (copyMarks, pasteClip), handwriting
//   (autoRead), artifacts (pointerFrameAt), kinds (postPointer).
// A fragment of one closure: Demos/build-surface.mjs concatenates surface/*.js
// in name order inside `(function () Ellipsis)();`. Shared state is the
// closure's; no imports, no exports, no build step beyond the concatenation.

  // ===== Input: strokes in, nothing gated, no modes ========================
  // Pointer events belong to the ink layer. You are ALWAYS drawing; panning is
  // the deliberate act (space, middle button, or alt), never the default. That
  // is what makes "doodle on top of the running page" work at all.
  let panning = null;
  let spaceHeld = false;
  // A hand inside a playing program: the frame has it until the hand lifts (SURFACE-v10-PLAN D2).
  let forward = null;
  // Whose hand the board is following (V1-PLAN R6): the pointer whose press began what is under
  // way — a stroke, a drag, a knob, a demonstration, a frame's pointer, a pan. Another pointer's
  // moves and release are not its own: a palm on the glass while the pen drew used to put its
  // points into the pen's stroke, and its release ended the stroke. A mouse is one pointer, so
  // nothing a mouse does is changed by this.
  let owner = null;   // { id, type } from the press that began it; null while nothing is under way
  let downType = '';  // the pointerType of the last press on the board — the field asks it whether to take the focus

  // Pointer capture is a nicety — it keeps a stroke alive when the pointer
  // leaves the element. It is NOT allowed to be the reason a stroke fails to
  // start, so its failure is swallowed rather than thrown into the draw loop.
  function capture(el, e) {
    try { el.setPointerCapture(e.pointerId); } catch (err) { /* not capturable */ }
  }

  // ===== Pen, finger and palm (V1-PLAN R6; the rules are 07-hand.js) =======
  // By pointerType, never by the user agent: iPadOS reports a pencil as `pen` and a
  // finger as `touch`, and a desktop test synthesises both. Before a pen has been seen
  // on this device a finger draws, as it always did; after, the pen draws and a finger
  // pans, and a touch while the pen is down or a moment after it is a palm — nothing.
  const touches = new Map(); // pointerId → a finger: { id, x, y, x0, y0, at, role, moved, view }
  let pinch = null;          // { ids, dist, mid, zoom }: the two fingers pinching, as they were when the second landed
  const pen = { down: new Set(), at: -Infinity }; // the pens on the glass, and when a pen was last heard anywhere on the page
  let penHover = null;       // the magnet a hovering pen is in reach of — where a stroke begun there would start (drawLive draws it)
  const handClock = () => performance.now();

  /** A point of the hand's, in world coordinates, with a pen's pressure on it: the log keeps it; the engine reads x and y only. */
  function pointOf(e) {
    const w = screenToWorld(e.clientX, e.clientY);
    if (e.pointerType === 'pen') w.p = Math.round(Math.max(0, Math.min(1, e.pressure || 0)) * 1000) / 1000;
    return w;
  }
  /** Is a touch landing now a palm? */
  function palmHere() { return palmNow({ penDown: pen.down.size > 0, sincePen: handClock() - pen.at }); }
  /** The fingers down that draw, pan or pinch — not the palms, and not one left resting after a pinch. */
  function activeFingers() {
    let n = 0;
    for (const t of touches.values()) if (t.role === 'draw' || t.role === 'pan' || t.role === 'pinch') n++;
    return n;
  }

  // The pen, wherever it is on the page, heard before anything it lands on: the palm on the
  // board is known for one while the pen writes in the field or taps a pill.
  function heardPen(e) {
    if (e.pointerType !== 'pen') return;
    pen.at = handClock();
    if (draws) return;
    // The switch, said once: the first pen this device has seen. It is held as a preference
    // the hand tile shows, and the tile gives a finger its ink back.
    setDraws('pen');
    say('a pen — it draws now; a finger pans and pinches, and a palm on the glass is ignored · the hand tile switches it');
  }
  addEventListener('pointerdown', (e) => { if (e.pointerType !== 'pen') return; pen.down.add(e.pointerId); heardPen(e); penLands(e); }, true);
  addEventListener('pointermove', heardPen, true);
  const penLifts = (e) => { if (e.pointerType !== 'pen') return; pen.down.delete(e.pointerId); heardPen(e); };
  addEventListener('pointerup', penLifts, true);
  addEventListener('pointercancel', penLifts, true);

  /**
   * A pen comes down: every finger down is a palm from now on. A finger's stroke is dropped,
   * a pinch stops, and a pan that a heel began a moment before the pen is put back.
   */
  function penLands(e) {
    if (!touches.size) return;
    const r = whenPenLands([...touches.values()], handClock());
    if (!r.palms.length) return;
    if (owner && r.palms.includes(owner.id)) letGo(e);
    for (const id of r.palms) { const t = touches.get(id); if (t) t.role = 'palm'; }
    pinch = null;
    const back = r.putBack === null ? null : touches.get(r.putBack);
    if (back && (view.zoom !== back.view.zoom || view.panX !== back.view.panX || view.panY !== back.view.panY)) {
      view.zoom = back.view.zoom; view.panX = back.view.panX; view.panY = back.view.panY;
      viewChanged();
    }
  }

  /**
   * What a finger had under way ends where it stands: its stroke is dropped — it was a palm,
   * or the first finger of a pinch landing, not a mark — and a drag, a knob, a demonstration
   * or a program's pointer is let go as it is.
   */
  function letGo(e) {
    live = null; held = false; pressEnd(); magnetStart = null; magnetHold = null;
    if (drag) endDrag();
    knobEnd(); demoEnd();
    if (forward) { postPointer(forward, 'cancel', e, screenToWorld(e.clientX, e.clientY)); forward = null; }
    if (panning) { panning = null; canvas.style.cursor = 'crosshair'; }
    owner = null;
    drawLive();
  }

  /** A finger lands. True when that is all it does now — a palm, a third finger, a pinch, a pan; false when it draws, down the path below, as a finger always did. */
  function fingerDown(e) {
    const r = fingerRole({ draws: draws, penDown: pen.down.size > 0, sincePen: handClock() - pen.at, fingers: activeFingers() });
    const t = { id: e.pointerId, x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, at: handClock(), role: r.role, moved: false, view: { zoom: view.zoom, panX: view.panX, panY: view.panY } };
    const first = r.role === 'pinch' ? [...touches.values()].find((o) => o.role === 'draw' || o.role === 'pan') : null;
    touches.set(e.pointerId, t);
    if (r.role === 'draw') return false;
    if (r.role === 'pinch' && first) {
      // Two fingers: a pinch, not a stroke. The first finger's ink goes — it was the first
      // finger landing, not a mark — and whatever it held is let go where it stands.
      if (owner && owner.id === first.id) letGo(e);
      first.role = 'pinch';
      pinch = { ids: [first.id, t.id], dist: Math.hypot(first.x - t.x, first.y - t.y), mid: { x: (first.x + t.x) / 2, y: (first.y + t.y) / 2 }, zoom: view.zoom };
    }
    return true;
  }

  /** A finger moves. True when the move was the finger's own — a pinch, a pan, a palm's nothing; false when it draws. */
  function fingerMove(e) {
    const t = touches.get(e.pointerId);
    const px = t.x, py = t.y;
    t.x = e.clientX; t.y = e.clientY;
    if (t.role === 'draw') return false;
    if (t.role === 'pinch') {
      const a = pinch && pinch.ids.includes(t.id) ? touches.get(pinch.ids[0]) : null;
      const b = a ? touches.get(pinch.ids[1]) : null;
      if (a && b) {
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        const target = clampZoom(pinch.zoom * (dist / Math.max(1, pinch.dist)));
        zoomBy(pinch.mid.x, pinch.mid.y, target / view.zoom);
        view.panX += mid.x - pinch.mid.x;
        view.panY += mid.y - pinch.mid.y;
        pinch.mid = mid;
        a.moved = true; b.moved = true;
        viewChanged();
      }
      return true;
    }
    if (t.role === 'pan') {
      let fx = px, fy = py;
      if (!t.moved) {
        // Short of the slop it is still a tap; past it, the board follows the finger from where it landed.
        if (Math.hypot(t.x - t.x0, t.y - t.y0) <= PAN_SLOP_PX) return true;
        t.moved = true; fx = t.x0; fy = t.y0;
      }
      view.panX += t.x - fx;
      view.panY += t.y - fy;
      viewChanged(); // one paint a frame, however many moves the frame holds
      return true;
    }
    return true; // a palm, a third finger, a finger resting after a pinch: nothing
  }

  /** A finger lifts. True when that is all it does — a pan's end, a pinch's, a palm's; a pan that never moved is a tap. False when it drew. */
  function fingerUp(e, cancelled) {
    const t = touches.get(e.pointerId);
    if (!t) return false;
    touches.delete(e.pointerId);
    if (pinch && pinch.ids.includes(t.id)) {
      pinch = null;
      for (const o of touches.values()) if (o.role === 'pinch') o.role = 'rest'; // the finger still down rests until it lifts
      return true;
    }
    if (t.role === 'draw') return false;
    if (t.role === 'pan' && !t.moved && !cancelled) { lastPen = { x: e.clientX, y: e.clientY }; tapAt(e); }
    return true;
  }

  /** A hovering pen feels the magnets: the site in reach is drawn on the pen's layer — where a stroke begun here would start. */
  function penHoverAt(w) {
    const hit = magnetQuery(w);
    const a = hit && hit.site, b = penHover && penHover.site;
    const same = a && b ? a.nodeId === b.nodeId && a.kind === b.kind && a.index === b.index : !a && !b;
    penHover = hit;
    if (!same) drawLive();
  }
  function penHoverOff() { if (penHover) { penHover = null; drawLive(); } }

  // A moving pencil is ink, never Scribble's handwriting-to-text or a scroll: its touchmove's
  // default is refused. Only a stylus's, and only while it moves — a finger, a tap and a
  // double-tap keep theirs. (iPadOS; a desktop engine sends no touches for a mouse.)
  canvas.addEventListener('touchmove', (e) => {
    for (const t of e.changedTouches || []) if (t.touchType === 'stylus') { e.preventDefault(); return; }
  }, { passive: false });

  canvas.addEventListener('pointerdown', (e) => {
    capture(canvas, e);
    downType = e.pointerType || '';
    // A finger: a palm, a pinch or a pan is all it does; one that draws goes down the path below.
    if (e.pointerType === 'touch' && fingerDown(e)) return;
    owner = { id: e.pointerId, type: e.pointerType || '' };
    if (e.pointerType === 'pen') penHoverOff(); // the stroke's own magnet takes over from the hover's
    if (e.button === 1 || e.altKey || spaceHeld) {
      panning = { x: e.clientX, y: e.clientY };
      canvas.style.cursor = 'grabbing';
      return;
    }
    // A hand landing on the selection takes hold of it rather than drawing.
    const w0 = pointOf(e);
    // A hand on a control's knob slides it: no selection needed, one move when it lets go.
    if (knobBegin(w0)) return;
    const hit = state.selection.length ? handleAt(w0) : null;
    // A hand on a body in a running tank is acting it out, not moving ink.
    if (hit && hit.kind === 'move' && demoBegin(state.selection, w0)) return;
    if (hit) { beginDrag(hit, w0); return; }
    // A hand landing inside a playing program is the program's: every move and
    // the release go to it, and nothing is drawn. A stroke begun anywhere else
    // is ink, and stays ink across any frame it crosses — doodling on the 3D
    // thing is a stroke begun beside it.
    // A loop that waits is the hand's wherever it lies: the tap that takes it
    // up, or the mark across it, lands inside the loop, not in the frame.
    const pf = pointerFrameAt(w0);
    if (pf && !insideWaitingLoop(w0)) { forward = pf; postPointer(pf, 'down', e, w0); return; }
    pressBegin(e, w0);
    live = [w0];
    // The stroke may begin ON a magnet — an arrow drawn out of a box's corner.
    magnetStart = magnetQuery(w0);
    magnetHold = magnetStart;
  });

  // ===== Hold by long-press (SURFACE-v10-PLAN D5) ============================
  // Press a mark and hold still: it is held, with what it hangs together
  // with, and the field opens — no loop drawn, which is what a newcomer tries
  // first. A tap stays a tap and a stroke stays a stroke; only stillness, on
  // a mark, with nothing held, is a hold.
  const HOLD_MS = 450, HOLD_SLOP = 6;
  let press = null; // { id, x, y, timer } while a hand rests on a mark
  let held = false; // the release after a hold is not a tap
  function pressBegin(e, w) {
    const id = nodeAt(w.x, w.y);
    if (!id || state.summon || state.selection.length || activeFingers() > 1) return;
    press = { id: id, x: e.clientX, y: e.clientY, timer: setTimeout(() => { const p = press; press = null; if (!p || !live) return; live = null; held = true; holdAround(p.id); }, HOLD_MS) };
  }
  function pressMove(e) { if (press && Math.hypot(e.clientX - press.x, e.clientY - press.y) > HOLD_SLOP) pressEnd(); }
  function pressEnd() { if (press) { clearTimeout(press.timer); press = null; } }
  /**
   * The marks a held mark hangs together with: the cluster `MM.clusters` finds
   * for it over the relations of every loose mark — read over the marks joined
   * to it through reach alone (R4c). Every link a cluster follows (near,
   * touching, crossing, contains) is an engaging relation, and those hold only
   * between marks within reach of each other (R4b), so the marks the index
   * walks to from the held one are its cluster; `MM.clusters` over them, in
   * the board's order, orders them as the whole plane would. It used to relate
   * every loose mark to every other: 183 ms on 2,000 marks, for one press.
   */
  function heldGroupOf(s, id) {
    const markOf = (cid) => {
      const n = s.nodes.get(cid);
      const b = n && MM.boundsOf(n);
      if (!b) return null;
      const fp = MM.fingerprintOf(n);
      return { id: cid, bounds: b, points: MM.strokePointsOf(n) || undefined, closed: !!(fp && fp.isClosed) };
    };
    const ix = boardIndex();
    const arts = new Set(s.artifacts);
    const loose = (x) => ix.contentAt.has(x) && !arts.has(x);
    let pool;
    if (ix.stray.some(loose)) pool = s.contentIds.filter(loose); // a box with no finite edge may meet anything: the whole plane, as before
    else {
      const seen = new Set([id]), queue = [id];
      while (queue.length) {
        const x = queue.pop();
        const b = ix.reach.boundsOf(x);
        if (!b) continue;
        const r = MM.reachAround(b);
        for (const y of ix.reach.query({ minX: b.minX - r, minY: b.minY - r, maxX: b.maxX + r, maxY: b.maxY + r })) {
          if (!seen.has(y) && loose(y) && MM.withinReach(b, ix.reach.boundsOf(y))) { seen.add(y); queue.push(y); }
        }
      }
      pool = s.contentIds.filter((cid) => seen.has(cid) && loose(cid));
    }
    const marks = pool.map(markOf).filter(Boolean);
    return MM.clusters(marks, MM.relate(marks)).find((g) => g.includes(id)) || [id];
  }
  /** Every loose mark's held group against the clusters of the whole plane, as holding it used to find them. For tests. */
  function heldCheck() {
    const s = session.getState();
    const marks = s.contentIds.filter((cid) => !s.artifacts.includes(cid)).map((cid) => {
      const n = s.nodes.get(cid);
      const b = n && MM.boundsOf(n);
      if (!b) return null;
      const fp = MM.fingerprintOf(n);
      return { id: cid, bounds: b, points: MM.strokePointsOf(n) || undefined, closed: !!(fp && fp.isClosed) };
    }).filter(Boolean);
    const whole = MM.clusters(marks, MM.relate(marks));
    const differ = [];
    for (const m of marks) {
      const mine = heldGroupOf(s, m.id), theirs = whole.find((g) => g.includes(m.id)) || [m.id];
      if (JSON.stringify(mine) !== JSON.stringify(theirs)) differ.push({ id: m.id, mine: mine, whole: theirs });
    }
    return { ok: !differ.length, marks: marks.length, differing: differ.length, differ: differ.slice(0, 3) };
  }
  /** Hold a mark with everything it hangs together with: the cluster over the relations the canvas sees. */
  function holdAround(id) {
    const s = session.getState();
    const group = heldGroupOf(s, id);
    lastTap = null;
    session.summonMarks(group, Date.now());
    render(session.getState());
    if (group.length > 1) flash('held with ' + (group.length - 1) + ' it hangs together with');
  }

  /** Is a world point inside the loop that waits to be taken up? */
  function insideWaitingLoop(w) {
    if (!state.pendingLassoId) return false;
    const loop = state.nodes.get(state.pendingLassoId);
    const b = loop && MM.boundsOf(loop);
    return !!b && w.x >= b.minX && w.x <= b.maxX && w.y >= b.minY && w.y <= b.maxY;
  }

  canvas.addEventListener('pointermove', (e) => {
    // A finger's pinch, pan or palm is its own; one that draws goes on below.
    if (e.pointerType === 'touch' && touches.has(e.pointerId) && fingerMove(e)) return;
    // Another pointer's move is not the one under way's: a palm, a mouse nudged while the pen draws.
    if (owner && e.pointerId !== owner.id) return;
    if (forward) { postPointer(forward, 'move', e, screenToWorld(e.clientX, e.clientY)); return; }
    pressMove(e);
    if (knobMove(screenToWorld(e.clientX, e.clientY))) return;
    if (demoMove(screenToWorld(e.clientX, e.clientY))) return;
    if (drag) { updateDrag(screenToWorld(e.clientX, e.clientY)); return; }
    if (panning) {
      view.panX += e.clientX - panning.x;
      view.panY += e.clientY - panning.y;
      panning = { x: e.clientX, y: e.clientY };
      viewChanged(); // one paint a frame, however many moves the frame holds
      return;
    }
    if (!live) {
      const w = screenToWorld(e.clientX, e.clientY);
      // Over a playing frame the cursor says the frame is live to the hand.
      if (!spaceHeld) canvas.style.cursor = pointerFrameAt(w) && !insideWaitingLoop(w) ? 'default' : 'crosshair';
      const over = nodeAt(w.x, w.y);
      if (over !== hoverId) { hoverId = over; render(state); }
      // A pencil near the glass, touching nothing, is a hover: the reading of the mark under it,
      // as a mouse's gives — and it feels the magnets, the site in reach being where a stroke
      // begun here would start. A mouse's hover draws no ghost, as it never did.
      if (e.pointerType === 'pen') penHoverAt(w); else penHoverOff();
      return;
    }
    live.push(pointOf(e));
    magnetHold = magnetQuery(live[live.length - 1]); // the offer follows the pen; out of reach, it lets go
    drawLive(); // the pen and its magnet, on their own layer; the board is as it was (R4c)
  });

  canvas.addEventListener('pointercancel', (e) => {
    // A finger's cancel ends what it was doing and taps nothing; one that drew goes on below.
    if (e.pointerType === 'touch' && touches.has(e.pointerId) && fingerUp(e, true)) return;
    // Another pointer's cancel is not the one under way's.
    if (owner && e.pointerId !== owner.id) return;
    owner = null;
    live = null; pressEnd(); magnetStart = null; magnetHold = null; drawLive();
    if (forward) { postPointer(forward, 'cancel', e, screenToWorld(e.clientX, e.clientY)); forward = null; }
  });

  canvas.addEventListener('pointerup', (e) => {
    // A finger's pinch, pan (or tap) and palm end here; one that drew goes on below.
    if (e.pointerType === 'touch' && touches.has(e.pointerId) && fingerUp(e, false)) return;
    // Another pointer's release is not the one under way's: a palm lifting while the pen draws.
    if (owner && e.pointerId !== owner.id) return;
    // A release the board began nothing for — a press on the chrome let go over the board, a
    // pinch's last finger — ends nothing here. It used to commit a stroke with no points,
    // which threw after the event was already in the log (V1-PLAN R6, e2e P2b and P3).
    if (!owner) return;
    owner = null;
    if (panning) { panning = null; canvas.style.cursor = 'crosshair'; return; }
    if (forward) { postPointer(forward, 'up', e, screenToWorld(e.clientX, e.clientY)); forward = null; return; }
    pressEnd();
    if (held) { held = false; live = null; magnetStart = null; magnetHold = null; return; } // the release after a hold: the field is open, nothing else happens
    if (knobEnd()) return;
    if (demoEnd()) return;
    if (drag) { endDrag(); return; }
    lastPen = { x: e.clientX, y: e.clientY };
    const points = live;
    live = null;
    if (!points) return;
    // The dead state: a tap while something is dismissable is the dismissal,
    // and never a dot. Only a tap on empty ground with nothing to dismiss
    // could be a dot — and a bare tap is not one either; a dot is drawn.
    const tiny = points.length < 3;
    if (tiny) { magnetStart = null; magnetHold = null; tapAt(e); return; }
    lastTap = null;

    // A stroke released inside a hold lands its endpoint exactly on the site;
    // one begun on a magnet starts exactly there. Only the endpoints move,
    // and only by the hand's own radius — the shape of the stroke is the hand's.
    // Two guards, both in the medium's own terms:
    //   - BINDING IS FOR CONNECTORS. Lines, arrows and arcs have ends that
    //     attach; a closed shape or a letter has nothing to tie. Snap only
    //     what reads as a connector.
    //   - GESTURES ARE NOT MARKS. A command mark's shape is its meaning — a
    //     check pulled seven pixels onto a box's edge-middle is no longer a
    //     check (found by e2e 12b). A stroke that matches the held mark is
    //     left exactly as drawn.
    if (points && points.length >= 3 && (magnetStart || magnetHold)) {
      const analysis = MM.analyzeStroke(points, 1 / view.zoom);
      const connector = analysis.results.some((r) => (r.type === 'line' || r.type === 'arrow' || r.type === 'arc') && r.confidence >= 0.5);
      // The ACTIVE mark: the taught one when the device holds one, else the
      // built-in check — a check multi-parses as arrow 0.52, so the connector
      // test alone is not enough (found by e2e 12b, second pass).
      const activeMark = state.commandMark || MM.BUILTIN_COMMAND_MARK;
      const isMark = !!(activeMark && MM.matchesCommandMark(analysis.fingerprint, activeMark).match);
      // …and a letter-sized stroke is writing, not a connector: an l beside a
      // box reads line 0.9, and pulling its foot onto the box's edge unwrites
      // the word (found by e2e 16 and 33).
      const letterLike = MM.isLetterLike(MM.getBounds(points), 1 / view.zoom);
      if (connector && !isMark && !letterLike) {
        // Only the place moves: a pen's pressure stays on the point it was pressed at.
        if (magnetStart) points[0] = Object.assign({}, points[0], { x: magnetStart.site.point.x, y: magnetStart.site.point.y });
        if (magnetHold) points[points.length - 1] = Object.assign({}, points[points.length - 1], { x: magnetHold.site.point.x, y: magnetHold.site.point.y });
      } else {
        magnetStart = null;
        magnetHold = null;
      }
    }

    // Clear hover *before* the engine notifies: the render it triggers must
    // report the mark just made, not whatever the cursor was resting on.
    hoverId = null;
    // Points are world coordinates; the scale says how big the hand's pixel was
    // when they were drawn. Position belongs in world space, the hand does not —
    // without this, the same check reads as a closed loop at 1.7x zoom.
    const id = session.addStroke(points, Date.now(), undefined, 1 / view.zoom);
    // The clean-form ghost shows on the mark just drawn for a moment, then goes; a repaint takes it away.
    lastDrawAt = Date.now();
    clearTimeout(ghostTimer);
    ghostTimer = setTimeout(() => render(session.getState()), GHOST_MS + 50);

    // Say what happened when a stroke rubbed something out — a silent erase is
    // indistinguishable from a bug. Read it from the stroke's own gesture rep,
    // NOT from a drop in the content count: a lasso resolved by a command mark
    // also leaves the content plane, and reporting that as "erased" would be a
    // lie about the one operation the user most needs to trust.
    const after = session.getState();
    const made = after.nodes.get(id);
    const g = made && MM.getRep(made, 'gesture');
    // Content, not a gesture: what the stroke touched, it is now tied to. The
    // bind is an edge in the log — it replays, merges, and one undo lets it go.
    if (!g && (magnetStart || magnetHold)) {
      const at = Date.now();
      if (magnetStart) session.bind({ strokeId: id, nodeId: magnetStart.site.nodeId, site: { kind: magnetStart.site.kind, index: magnetStart.site.index }, end: 'start', at: at });
      if (magnetHold) {
        session.bind({ strokeId: id, nodeId: magnetHold.site.nodeId, site: { kind: magnetHold.site.kind, index: magnetHold.site.index }, end: 'end', at: at });
        flash('bound — ' + MM.describeMagnet(magnetHold.site));
      }
    }
    magnetStart = null;
    magnetHold = null;
    // Auto: take every open offer the moment it is made — this stroke, and any
    // earlier closed stroke that was a loop-in-waiting until this one settled
    // it. Never the held loop itself; that is a gesture until the next mark
    // says otherwise.
    if (!g) autoSweep();
    // Reading handwriting as it is written is a preference, off by default.
    if (autoRead && !g) readWriting(after);
    if (g && g.data && g.data.role === 'scratch') {
      const n = (g.data.erased || []).length;
      flash('erased ' + n + ' mark' + (n === 1 ? '' : 's'));
    } else if (after.markMiss && after.markMiss.nearMiss) {
      // Only when the stroke was recognisably an ATTEMPT. A gesture that fails
      // silently cannot be learned — the user cannot tell whether they drew it
      // wrong, waited too long, or made it too big. Saying nothing about marks
      // that were plainly just drawing keeps this from becoming nagging.
      flash('no summon — ' + after.markMiss.detail);
    } else if (!g && made) {
      // A scratch over a word of a text made from writing strikes the word (v10 F12).
      const struck = strikeOnText(after, id, points);
      if (struck) { flash('struck “' + struck + '” — write the word beside the gap and fold it in'); return; }
      // A scratch one pass short: the stroke turned back on itself and crossed
      // one mark's outline twice, where three erases. Said, so the rule can
      // be learned by doing rather than by reading.
      const near = scratchNearMiss(after, made, points);
      if (near) flash('crossed it twice — one more pass erases it');
    }
  });

  let lastTap = null; // the last tap on empty ground, for the double-tap
  const DOUBLE_TAP_MS = 400;

  /**
   * A tap: the dead state. A tap while something is dismissable is the dismissal, and never
   * a dot — the pen's or the mouse's stroke too short to be one, or a finger's that never
   * moved while the pen is what draws.
   */
  function tapAt(e) {
    const s0 = session.getState();
    const now = Date.now();
    // A double-tap inside a waiting loop takes it up — the way in that
    // needs no mark at all, for a hand that finds the check hard to draw
    // apart from an arrow. The first tap is nothing; the second, close in
    // time and place, is the summon.
    // A tap on the chip beside a matching group opens the field on it, with the match leading.
    {
      const chip = chipAt(screenToWorld(e.clientX, e.clientY));
      if (chip && !s0.summon) { lastTap = null; session.summonMarks(chip.ids, now); render(session.getState()); return; }
    }
    if (s0.pendingLassoId && !s0.summon) {
      const w = screenToWorld(e.clientX, e.clientY);
      const loop = s0.nodes.get(s0.pendingLassoId);
      const b = loop && MM.boundsOf(loop);
      const inside = b && w.x >= b.minX && w.x <= b.maxX && w.y >= b.minY && w.y <= b.maxY;
      const again = lastTap && now - lastTap.t < DOUBLE_TAP_MS && Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < 24;
      lastTap = { x: e.clientX, y: e.clientY, t: now };
      if (inside && again) { lastTap = null; session.summonHeld(now); render(session.getState()); return; }
      if (inside) { render(session.getState()); return; }
    }
    lastTap = { x: e.clientX, y: e.clientY, t: now };
    // One tap on the ground lets go of everything — the field and the
    // selection — so the next stroke draws rather than moves (v10 F9).
    if (s0.summon) session.dismiss(s0.summon.id, now);
    if (s0.selection.length) session.deselect(now);
    render(session.getState());
  }

  /** The mark a stroke crossed exactly twice while turning back on itself, if any. */
  function scratchNearMiss(s, node, points) {
    const fp = MM.fingerprintOf(node);
    if (!fp || fp.isClosed || fp.corners < 2 || !points || points.length < 6) return null;
    const sb = MM.getBounds(points);
    for (const id of s.contentIds) {
      if (id === node.id || s.artifacts.includes(id)) continue;
      const t = s.nodes.get(id);
      const pts = t && MM.strokePointsOf(t);
      if (!pts) continue;
      // A stroke crosses only an outline whose box its own box meets: the rest are passed over unread (R4c).
      const tb = MM.getBounds(pts);
      if (tb.maxX < sb.minX || tb.minX > sb.maxX || tb.maxY < sb.minY || tb.minY > sb.maxY) continue;
      const tf = MM.fingerprintOf(t);
      const outline = MM.outlineOf({ points: pts, closed: !!(tf && tf.isClosed) });
      if (outline && MM.countCrossings(points, outline, 3) === 2) return id;
    }
    return null;
  }

  // A pencil lifted out of reach of the glass leaves, and its magnet with it.
  canvas.addEventListener('pointerleave', (e) => { if (e.pointerType === 'pen') penHoverOff(); hoverId = null; render(state); });
  // A release the canvas never sees — capture refused, a dialog — must still
  // end whatever the hand was doing, or the next move keeps drawing with no
  // button down. The hand's OWN release: a palm lifted off the panel while the
  // pen draws is not the pen letting go (V1-PLAN R6).
  addEventListener('pointerup', (e) => {
    if (e.target === canvas) return;
    if (touches.has(e.pointerId)) fingerUp(e, true); // a finger let go off the board: forgotten, and it taps nothing
    if (owner && e.pointerId !== owner.id) return;
    owner = null;
    if (forward) { postPointer(forward, 'up', e, screenToWorld(e.clientX, e.clientY)); forward = null; return; }
    if (knobEnd() || demoEnd()) return;
    if (drag) { endDrag(); return; }
    if (panning) { panning = null; canvas.style.cursor = 'crosshair'; return; }
    if (live) { live = null; render(state); }
  }, true);
  addEventListener('pointercancel', (e) => { if (e.target !== canvas && touches.has(e.pointerId)) fingerUp(e, true); }, true);

  addEventListener('keydown', (e) => {
    if (e.code === 'Space' && !spaceHeld && e.target === document.body) {
      spaceHeld = true; canvas.style.cursor = 'grab'; e.preventDefault();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); session.undo(); }
    // Copy holds the selection's ink (and puts it on the clipboard as SVG); paste is handled with files, in the images fragment.
    if ((e.ctrlKey || e.metaKey) && e.key === 'c' && e.target === document.body && state.selection.length) { e.preventDefault(); copyMarks(state.selection.slice()); }
    if (e.target === document.body && e.key === 'Escape' && state.selection.length && !state.summon) session.deselect(Date.now());
    // Esc with nothing held stops every model call in flight: a slow model is not a hang, and the hand can say enough.
    else if (e.target === document.body && e.key === 'Escape' && !state.selection.length && !state.summon) cancelWork();
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
    else if (act === 'edit-text') beginTextEdit(id);
    else if (act === 'export-code') {
      const n = state.nodes.get(id);
      const rep = n && codeRepOf(n);
      if (rep) {
        const kind = rep.data.kind || 'html';
        const wired = wiredCodeOf(state, id);
        const ext = kind === 'text' ? 'txt' : kind;
        downloadText((MM.wordOf(n) || id).replace(/[^A-Za-z0-9._-]+/g, '-') + '.' + ext, wired !== null ? wired : rep.data.code, MM.rowOf(kind).mime);
      }
    }
    else if (act === 'behave-drop') session.behave({ nodeId: id, behaviour: { terms: [{ verb: 'wander', weight: 1 }, { verb: 'hold', weight: 0.35 }], source: 'hand' }, participantId: MM.LOCAL_PARTICIPANT, at: Date.now() });
    else session.snap({ ids: [id], mode: 'raw', at: Date.now() });
  });
  // Reset is a fresh board: what the browser kept goes too, or the reload would
  // bring it back — and the reload waits until it has gone.
  document.getElementById('resetBtn').onclick = () => { forgetLocalLog().then(() => location.reload()); };

  // The status line says ONE thing: the last thing that happened, for a
  // while, then the standing state. `say` is for outcomes worth reading
  // (a model wrote a program); `flash` for the quick ones (erased 3). Both
  // re-render at once: the render triggered by the stroke itself has already
  // happened by the time we know what the stroke did, and a message set
  // after it would never show — an erase would look silent.
  let flashText = null, flashAt = 0, flashTimer = null, flashFor = 0;
  const FLASH_MS = 1600, SAY_MS = 7000;
  function say(msg, ms) {
    flashText = msg;
    flashAt = Date.now();
    flashFor = ms || SAY_MS;
    render(session.getState());
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => { flashText = null; render(session.getState()); }, flashFor);
  }
  function flash(msg) { say(msg, FLASH_MS); }
