// ===== frames =====
// Provides: frames on the surface — wiredCodeOf/wiredBehaviourOf (the harness applied where members render
//   and run), frame and control rendering, the knob drag, exportFrameFiles. (Making a frame or a slider,
//   and finding a frame again, are core's `frames` and `control` tools, offered in the field.)
// Uses: core, artifacts (frames map), render, kinds, clocks.
// A fragment of one closure: Demos/build-surface.mjs concatenates surface/*.js
// in name order inside `(function () { ... })();`. Shared state is the
// closure's; no imports, no exports, no build step beyond the concatenation.

  // ===== The harness, applied ==============================================
  // A frame references its members and wires their ports. Nothing is written
  // back: where a member renders or runs, it is asked for its WIRED code —
  // the newest frame that holds it, resolved from the current values.
  function framesHolding(s, id) {
    return s.artifacts
      .map((aid) => s.nodes.get(aid))
      .filter((n) => n && MM.isFrame(n) && !n.reps.some((r) => r.modality === 'erased') && MM.frameOfNode(n).members.includes(id));
  }

  /** The member's code with its connections applied, or null when nothing feeds it. */
  function wiredCodeOf(s, id) {
    const holders = framesHolding(s, id);
    for (let i = holders.length - 1; i >= 0; i--) {
      const r = MM.resolveFrame(MM.frameOfNode(holders[i]), s.nodes);
      if (r.code[id] !== undefined) return r.code[id];
    }
    return null;
  }

  /** A definition's behaviour with its wired speed and weights, or the behaviour itself. */
  function wiredBehaviourOf(s, id, behaviour) {
    const holders = framesHolding(s, id);
    for (let i = holders.length - 1; i >= 0; i--) {
      const r = MM.resolveFrame(MM.frameOfNode(holders[i]), s.nodes);
      const w = r.behaviour[id];
      if (!w) continue;
      const terms = behaviour.terms.map((t, k) => (w.weights[k] !== undefined ? { ...t, weight: w.weights[k] } : t));
      return { ...behaviour, terms: terms, speed: w.speed !== undefined ? w.speed : behaviour.speed };
    }
    return behaviour;
  }

  // ===== Making them ==========================================================
  // Framing artifacts, framing them like a frame built once, and making a drawn
  // slider are core's tools now (V1-PLAN B1: `frames`, `control` in
  // metamedium-core/src/tools/) — offered in the field and taken there. What
  // stays here is the surface's side: the harness applied, the knob, rendering.

  function exportFrameFiles(id) {
    const s = session.getState();
    const n = s.nodes.get(id);
    if (!n || !MM.isFrame(n)) return null;
    return MM.exportFrame(MM.wordOf(n) || 'frame', MM.frameOfNode(n), s.nodes);
  }

  // ===== The knob: dragging it sets the value ================================
  // A control's knob may be taken without selecting anything: the hand lands
  // on it and slides it along the track. One `move` event when it lets go;
  // the value is read from where the ink now stands.
  let knobDrag = null; // { controlId, knob, track: {a, b}, start, last }

  function knobAt(s, w) {
    for (const aid of s.artifacts) {
      const n = s.nodes.get(aid);
      const rep = n && codeRepOf(n);
      if (!rep || rep.data.kind !== 'control') continue;
      const members = n.edges.filter((e) => e.rel === 'has-part').map((e) => e.to);
      const sl = MM.sliderOf(members, s.nodes, 1 / view.zoom);
      if (!sl) continue;
      const kb = MM.boundsOf(s.nodes.get(sl.knob));
      const c = { x: (kb.minX + kb.maxX) / 2, y: (kb.minY + kb.maxY) / 2 };
      const r = Math.max(kb.maxX - kb.minX, kb.maxY - kb.minY) / 2 + wpx(10);
      if (Math.hypot(w.x - c.x, w.y - c.y) <= r) {
        const pts = MM.strokePointsOf(s.nodes.get(sl.track));
        return { controlId: aid, knob: sl.knob, track: { a: pts[0], b: pts[pts.length - 1] }, centre: c };
      }
    }
    return null;
  }

  function knobBegin(w) {
    const hit = knobAt(state, w);
    if (!hit) return false;
    knobDrag = { ...hit, start: w, last: w };
    canvas.style.cursor = 'ew-resize';
    return true;
  }
  function knobMove(w) {
    if (!knobDrag) return false;
    knobDrag.last = w;
    render(state);
    return true;
  }
  /** Where the knob would land: the hand's point projected onto the track. */
  function knobPreview() {
    if (!knobDrag) return null;
    const { a, b } = knobDrag.track;
    const p = MM.alongSegment(a, b, knobDrag.last);
    const q = { x: a.x + (b.x - a.x) * p.t, y: a.y + (b.y - a.y) * p.t };
    return { knob: knobDrag.knob, dx: q.x - knobDrag.centre.x, dy: q.y - knobDrag.centre.y, controlId: knobDrag.controlId };
  }
  function knobEnd() {
    if (!knobDrag) return false;
    const pv = knobPreview();
    knobDrag = null;
    canvas.style.cursor = 'crosshair';
    if (pv && Math.hypot(pv.dx, pv.dy) > 0.5) session.move({ ids: [pv.knob], dx: pv.dx, dy: pv.dy, at: Date.now() });
    else render(state);
    return true;
  }

  // ===== Rendering ==============================================================
  /** Frames: a dashed bracket around the members, the name, and each connection as a thin wire. */
  function renderFrames(s) {
    for (const aid of s.artifacts) {
      const n = s.nodes.get(aid);
      if (!n || !MM.isFrame(n)) continue;
      const f = MM.frameOfNode(n);
      const bs = f.members.map((id) => MM.boundsOf(s.nodes.get(id))).filter(Boolean);
      if (!bs.length) continue;
      const b = union(bs);
      const pad = wpx(22);
      ctx.setLineDash([wpx(6), wpx(5)]);
      ctx.strokeStyle = `rgba(${C.goldRGB},0.5)`;
      ctx.lineWidth = wpx(1);
      ctx.strokeRect(b.minX - pad, b.minY - pad, b.maxX - b.minX + pad * 2, b.maxY - b.minY + pad * 2);
      ctx.setLineDash([]);
      text((MM.wordOf(n) || 'frame') + '  ·  frame', b.minX - pad, b.minY - pad - wpx(8), C.gold);
      const centre = (id) => { const bb = MM.boundsOf(s.nodes.get(id)); return bb ? { x: (bb.minX + bb.maxX) / 2, y: (bb.minY + bb.maxY) / 2 } : null; };
      for (const c of f.connections) {
        const p = centre(c.from.id), q = centre(c.to.id);
        if (!p || !q) continue;
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y);
        ctx.strokeStyle = `rgba(${C.goldRGB},0.35)`; ctx.lineWidth = wpx(1); ctx.stroke();
        const mx = (p.x + q.x) / 2, my = (p.y + q.y) / 2;
        text(c.from.port + ' → ' + c.to.port, mx, my - wpx(4), `rgba(${C.labelRGB},0.7)`);
      }
    }
    // Controls: the value beside the knob, and the knob under a hand while it slides.
    const pv = knobPreview();
    for (const aid of s.artifacts) {
      const n = s.nodes.get(aid);
      const rep = n && codeRepOf(n);
      if (!rep || rep.data.kind !== 'control') continue;
      const c = MM.controlOf(n, s.nodes);
      if (!c) continue;
      const members = n.edges.filter((e) => e.rel === 'has-part').map((e) => e.to);
      const sl = MM.sliderOf(members, s.nodes, 1 / view.zoom);
      if (!sl) continue;
      const kb = MM.boundsOf(s.nodes.get(sl.knob));
      let kx = (kb.minX + kb.maxX) / 2, ky = (kb.minY + kb.maxY) / 2;
      if (pv && pv.controlId === aid) {
        kx += pv.dx; ky += pv.dy;
        ctx.beginPath(); ctx.arc(kx, ky, Math.max(wpx(5), (kb.maxX - kb.minX) / 2), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${C.goldRGB},0.6)`; ctx.fill();
      }
      const shown = pv && pv.controlId === aid ? (() => { const p = MM.alongSegment(knobDrag.track.a, knobDrag.track.b, { x: kx, y: ky }); return c.min + (c.max - c.min) * p.t; })() : c.value;
      text((+shown.toFixed(2)).toString(), kx + wpx(10), ky - wpx(10), C.gold);
    }
  }
