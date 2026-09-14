// ===== minimap =====
// Provides: renderMinimap — the whole board in a corner with the viewport on it; a tap or a drag there pans (SURFACE-v10-PLAN F7).
// Uses: core (C), view (view, afterViewChange, union), render.
// A fragment of one closure: Demos/build-surface.mjs concatenates surface/*.js
// in name order inside `(function () Ellipsis)();`. Shared state is the
// closure's; no imports, no exports, no build step beyond the concatenation.

  // ===== The minimap ========================================================
  // Every mark as a small rect, artifacts outlined, answers faint, and the
  // viewport as a box: where you are on the whole board. The map covers the
  // content AND the viewport, so panning off the drawing still shows the
  // drawing. Hidden while the board is empty.
  const minimapEl = document.getElementById('minimap');
  const MINI_W = 176, MINI_H = 108, MINI_PAD = 8;
  let mini = null; // { scale, ox, oy } of the last paint: world → map pixels

  function renderMinimap(s) {
    if (!minimapEl) return;
    const ids = s.contentIds.concat(s.explanations);
    const boxes = ids.map((id) => MM.boundsOf(s.nodes.get(id))).filter(Boolean);
    if (!boxes.length) { minimapEl.hidden = true; mini = null; return; }
    minimapEl.hidden = false;
    const dpr = window.devicePixelRatio || 1;
    if (minimapEl.width !== Math.round(MINI_W * dpr)) { minimapEl.width = Math.round(MINI_W * dpr); minimapEl.height = Math.round(MINI_H * dpr); }
    const vp = { minX: -view.panX / view.zoom, minY: -view.panY / view.zoom, maxX: (innerWidth - view.panX) / view.zoom, maxY: (innerHeight - view.panY) / view.zoom };
    const all = union(boxes.concat([vp]));
    const w = Math.max(1, all.maxX - all.minX), h = Math.max(1, all.maxY - all.minY);
    const scale = Math.min((MINI_W - MINI_PAD * 2) / w, (MINI_H - MINI_PAD * 2) / h);
    const ox = MINI_PAD + ((MINI_W - MINI_PAD * 2) - w * scale) / 2 - all.minX * scale;
    const oy = MINI_PAD + ((MINI_H - MINI_PAD * 2) - h * scale) / 2 - all.minY * scale;
    mini = { scale: scale, ox: ox, oy: oy };
    const g = minimapEl.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, MINI_W, MINI_H);
    for (const id of ids) {
      const b = MM.boundsOf(s.nodes.get(id));
      if (!b) continue;
      const x = ox + b.minX * scale, y = oy + b.minY * scale;
      const bw = Math.max(1.5, (b.maxX - b.minX) * scale), bh = Math.max(1.5, (b.maxY - b.minY) * scale);
      if (s.artifacts.includes(id)) { g.strokeStyle = 'rgba(' + C.goldRGB + ',0.8)'; g.lineWidth = 1; g.strokeRect(x + 0.5, y + 0.5, bw, bh); }
      else { g.fillStyle = s.explanations.includes(id) ? 'rgba(' + C.goldRGB + ',0.35)' : C.inkFaint; g.fillRect(x, y, bw, bh); }
    }
    g.strokeStyle = C.ink; g.lineWidth = 1; g.setLineDash([]);
    g.strokeRect(ox + vp.minX * scale + 0.5, oy + vp.minY * scale + 0.5, Math.max(2, (vp.maxX - vp.minX) * scale), Math.max(2, (vp.maxY - vp.minY) * scale));
  }

  /** The world point under a pointer on the map. */
  function miniToWorld(e) {
    const r = minimapEl.getBoundingClientRect();
    const mx = (e.clientX - r.left) * (MINI_W / Math.max(1, r.width)), my = (e.clientY - r.top) * (MINI_H / Math.max(1, r.height));
    return { x: (mx - mini.ox) / mini.scale, y: (my - mini.oy) / mini.scale };
  }
  /** Pan so a world point is the centre of the screen. */
  function miniPanTo(w) {
    view.panX = innerWidth / 2 - w.x * view.zoom;
    view.panY = innerHeight / 2 - w.y * view.zoom;
    afterViewChange();
  }
  let miniDrag = false;
  if (minimapEl) {
    minimapEl.addEventListener('pointerdown', (e) => {
      if (!mini) return;
      miniDrag = true;
      try { minimapEl.setPointerCapture(e.pointerId); } catch (err) { /* not capturable */ }
      miniPanTo(miniToWorld(e));
      e.preventDefault();
    });
    minimapEl.addEventListener('pointermove', (e) => { if (miniDrag && mini) miniPanTo(miniToWorld(e)); });
    const miniEnd = () => { miniDrag = false; };
    minimapEl.addEventListener('pointerup', miniEnd);
    minimapEl.addEventListener('pointercancel', miniEnd);
  }
