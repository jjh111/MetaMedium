// ===== view =====
// Provides: view {zoom, panX, panY}, screenToWorld/worldToScreen/wpx, zoomAround, fitAll, afterViewChange, the wheel/pinch/keyboard zoom, resize,
//   and the space actually visible: usableRect (pure), viewportRect, usableViewport, relayoutChrome.
// Uses: core; input (panning/pinch state); palette (replaceOpenField).
// A fragment of one closure: Demos/build-surface.mjs concatenates surface/*.js
// in name order inside `(function () Ellipsis)();`. Shared state is the
// closure's; no imports, no exports, no build step beyond the concatenation.

  // ===== Viewport =========================================================
  // The engine is renderer-agnostic and stores whatever space it is fed, so it
  // is fed WORLD coordinates — never screen. Every threshold in the engine is
  // in pixels (proximity, closure, size-relative overshoot); in world space
  // those are zoom-invariant and the grammar holds at any zoom. In screen space
  // the whole MVP flow breaks the moment you zoom out to lasso a wide group,
  // which is exactly the move the product is built on (MVP.md §5.1).
  const view = { panX: 0, panY: 0, zoom: 1 };
  const MIN_ZOOM = 0.08, MAX_ZOOM = 5;
  const clampZoom = (z) => Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, z));

  const screenToWorld = (sx, sy) => ({
    x: (sx - view.panX) / view.zoom,
    y: (sy - view.panY) / view.zoom,
  });
  const worldToScreen = (wx, wy) => ({
    x: wx * view.zoom + view.panX,
    y: wy * view.zoom + view.panY,
  });
  /** World length that renders as `n` screen pixels — for chrome that must not shrink. */
  const wpx = (n) => n / view.zoom;

  function zoomAround(sx, sy, factor) {
    const before = clampZoom(view.zoom);
    const after = clampZoom(before * factor);
    if (after === before) return;
    view.zoom = after;
    const ratio = after / before;
    view.panX = sx - (sx - view.panX) * ratio;
    view.panY = sy - (sy - view.panY) * ratio;
    afterViewChange();
  }

  // ===== The space actually visible =======================================
  // Chrome docks where the stylesheet puts it, and the stylesheet changes its
  // mind: the panel stands at the LEFT on a wide screen and lies along the
  // BOTTOM under 820px, the bar is always on top, the replay bar at the foot.
  // Fit and the field both need the rectangle that is left over, and neither
  // may assume which side a panel took — the inspector's right edge used to be
  // the canvas's left boundary even when CSS had docked it at the bottom,
  // which fitted a whole board into a ten-pixel strip and slammed the zoom to
  // its minimum (DIRECTOR-REVIEW-2026-09-15, UI-1). So the side is MEASURED,
  // from the geometry the browser actually laid out.
  const DOCK_HUG = 0.12;    // a docked panel sits within this of the edge it stands on
  const DOCK_COVER = 0.3;   // …and runs along at least this much of it
  const DOCK_MAX = 0.7;     // no one panel may eat more of an axis than this
  const MIN_USABLE = 120;   // a canvas smaller than this is not a canvas

  /**
   * Pure: the viewport minus whatever is docked to its edges.
   * @param {{left:number,top:number,right:number,bottom:number}} v the visible viewport
   * @param {Array<{id?:string,left:number,top:number,right:number,bottom:number}>} panels chrome rects, in the same space
   * @returns {{left,top,right,bottom,width,height,docks:Array<{id,edge,why}>}}
   */
  function usableRect(v, panels) {
    const vw = Math.max(1, v.right - v.left), vh = Math.max(1, v.bottom - v.top);
    const free = { left: v.left, top: v.top, right: v.right, bottom: v.bottom };
    const docks = [];
    for (const p of panels || []) {
      // Only the part of the panel that is on screen can occlude anything.
      const ox = Math.min(p.right, v.right) - Math.max(p.left, v.left);
      const oy = Math.min(p.bottom, v.bottom) - Math.max(p.top, v.top);
      if (!(ox > 0 && oy > 0)) { docks.push({ id: p.id, edge: 'none', why: 'off screen' }); continue; }
      // Which edge it hugs, and whether it runs along enough of that edge to
      // be a wall rather than a card in a corner (the minimap is a card).
      const hug = { left: p.left - v.left, right: v.right - p.right, top: p.top - v.top, bottom: v.bottom - p.bottom };
      const side = oy >= ox            // taller than wide is a side panel; wider than tall is a band
        ? (hug.left <= hug.right ? 'left' : 'right')
        : (hug.top <= hug.bottom ? 'top' : 'bottom');
      const vertical = side === 'left' || side === 'right';
      const hugs = hug[side] <= (vertical ? vw : vh) * DOCK_HUG;
      const cover = (vertical ? oy / vh : ox / vw);
      const eats = (vertical ? (side === 'left' ? p.right - v.left : v.right - p.left) / vw
        : (side === 'top' ? p.bottom - v.top : v.bottom - p.top) / vh);
      if (!hugs) { docks.push({ id: p.id, edge: 'none', why: 'floats, ' + Math.round(hug[side]) + 'px off the ' + side }); continue; }
      if (cover < DOCK_COVER) { docks.push({ id: p.id, edge: 'none', why: 'covers ' + Math.round(cover * 100) + '% of the ' + side + ' edge' }); continue; }
      if (eats > DOCK_MAX) { docks.push({ id: p.id, edge: 'none', why: 'would eat ' + Math.round(eats * 100) + '% of the canvas' }); continue; }
      docks.push({ id: p.id, edge: side, why: 'covers ' + Math.round(cover * 100) + '% of the ' + side + ' edge' });
      if (side === 'left') free.left = Math.max(free.left, p.right);
      else if (side === 'right') free.right = Math.min(free.right, p.left);
      else if (side === 'top') free.top = Math.max(free.top, p.bottom);
      else free.bottom = Math.min(free.bottom, p.top);
    }
    // Chrome that has eaten the canvas between them leaves the whole viewport:
    // a field or a fit inside nothing is worse than one under a panel.
    if (free.right - free.left < MIN_USABLE || free.bottom - free.top < MIN_USABLE) {
      return { left: v.left, top: v.top, right: v.right, bottom: v.bottom, width: vw, height: vh,
        docks: docks.map((d) => ({ id: d.id, edge: 'none', why: 'the chrome left no room; the whole viewport stands' })) };
    }
    return { left: free.left, top: free.top, right: free.right, bottom: free.bottom,
      width: free.right - free.left, height: free.bottom - free.top, docks: docks };
  }

  // A test may pin the viewport, and the chrome rects with it, so the
  // narrow-screen layout can be checked in a tab that cannot resize itself —
  // a media query the browser will not run at this width is exactly what the
  // defect lived behind. Nothing in the surface ever sets it.
  let testViewport = null;
  function setTestViewport(w, h, panels) { testViewport = w ? { width: w, height: h, panels: panels || null } : null; }

  /** The space actually visible — the VISUAL viewport, so an on-screen keyboard counts. */
  function viewportRect() {
    if (testViewport) return { left: 0, top: 0, right: testViewport.width, bottom: testViewport.height, width: testViewport.width, height: testViewport.height };
    const vv = window.visualViewport;
    if (vv && vv.width > 0 && vv.height > 0) {
      return { left: vv.offsetLeft, top: vv.offsetTop, right: vv.offsetLeft + vv.width, bottom: vv.offsetTop + vv.height, width: vv.width, height: vv.height };
    }
    return { left: 0, top: 0, right: innerWidth, bottom: innerHeight, width: innerWidth, height: innerHeight };
  }

  const CHROME_IDS = ['bar', 'inspector', 'replay'];
  /** The chrome as rects, each measured only while it is shown. */
  function chromeRects() {
    if (testViewport && testViewport.panels) return testViewport.panels;
    const out = [];
    for (const id of CHROME_IDS) {
      const el = document.getElementById(id);
      if (!el || el.hidden) continue;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || cs.visibility === 'hidden') continue;
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.height > 0) out.push({ id: id, left: r.left, top: r.top, right: r.right, bottom: r.bottom });
    }
    return out;
  }

  function usableViewport() { return usableRect(viewportRect(), chromeRects()); }

  function fitAll() {
    const ids = state.contentIds.concat(state.explanations);
    const boxes = ids.map((id) => MM.boundsOf(state.nodes.get(id))).filter(Boolean);
    if (!boxes.length) { view.panX = 0; view.panY = 0; view.zoom = 1; afterViewChange(); return; }
    const b = union(boxes);
    // Fit into the area the chrome leaves FREE, not the whole window: a drawing
    // centred on the window sat half under the panel in the whitepaper's embeds.
    const free = usableViewport();
    const freeW = Math.max(1, free.width), freeH = Math.max(1, free.height);
    // Guard the viewport: a window smaller than the padding (or one not laid
    // out yet) would compute a negative scale and slam into MIN_ZOOM.
    const pad = Math.max(0, Math.min(90, freeW / 6, freeH / 6));
    const availW = Math.max(1, freeW - pad * 2);
    const availH = Math.max(1, freeH - pad * 2);
    const w = Math.max(1, b.maxX - b.minX), h = Math.max(1, b.maxY - b.minY);
    view.zoom = clampZoom(Math.min(availW / w, availH / h, 2));
    view.panX = free.left + (freeW - w * view.zoom) / 2 - b.minX * view.zoom;
    view.panY = free.top + (freeH - h * view.zoom) / 2 - b.minY * view.zoom;
    afterViewChange();
  }

  function afterViewChange() {
    document.getElementById('zoomPct').textContent = Math.round(view.zoom * 100) + '%';
    // ONE transform for both layers. If the ink canvas and the artifact stage
    // ever disagree, ink drifts off the divs it is supposed to outline.
    stage.style.transform =
      'translate(' + view.panX + 'px,' + view.panY + 'px) scale(' + view.zoom + ')';
    render(state);
    sizeFramesToScreen(); // code stays legible at every zoom (S4)
  }

  document.getElementById('zoomIn').onclick = () => zoomAround(innerWidth / 2, innerHeight / 2, 1.25);
  document.getElementById('zoomOut').onclick = () => zoomAround(innerWidth / 2, innerHeight / 2, 0.8);
  document.getElementById('fitBtn').onclick = fitAll;

  // The wheel ZOOMS, toward the cursor. A trackpad pinch arrives as a wheel
  // with ctrlKey in Chrome and as gesture events in Safari; both zoom. Holding
  // shift turns the wheel into a pan, and space/middle/alt-drag pans — panning
  // is the deliberate act, zooming is what a wheel over a canvas means.
  // Scrolling pans; a pinch (which the browser reports as a wheel with
  // ctrlKey) or ctrl/cmd + wheel zooms. That is the convention of every
  // infinite canvas a trackpad user already knows, and the one thing a mouse
  // wheel loses — zoom on a bare wheel — is on the rail and the keyboard.
  canvas.addEventListener('wheel', (e) => {
    // Embedded in a page, the wheel belongs to the PAGE: a reader scrolling
    // the whitepaper over a figure was dragging the recording out of its
    // frame. Panning is still there by drag; the wheel passes through.
    if (EMBED) return;
    e.preventDefault();
    if (e.ctrlKey || e.metaKey) {
      // Pinch deltas are small and continuous; wheel clicks are large and
      // stepped. Scale the factor by the delta so both feel proportionate.
      const k = e.deltaMode === 0 && Math.abs(e.deltaY) < 50 ? 0.01 : 0.0022;
      zoomAround(e.clientX, e.clientY, Math.exp(-e.deltaY * k));
      return;
    }
    // A line-mode wheel (a mouse) moves in bigger steps than a pixel-mode one.
    const step = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? innerHeight : 1;
    let dx = e.deltaX * step, dy = e.deltaY * step;
    if (e.shiftKey && !e.deltaX) { dx = dy; dy = 0; } // shift + a plain wheel scrolls sideways
    view.panX -= dx;
    view.panY -= dy;
    afterViewChange();
  }, { passive: false });

  // Safari: pinch is a gesture event, not a wheel.
  let gestureStartZoom = 1;
  canvas.addEventListener('gesturestart', (e) => { e.preventDefault(); gestureStartZoom = view.zoom; });
  canvas.addEventListener('gesturechange', (e) => {
    e.preventDefault();
    const target = clampZoom(gestureStartZoom * e.scale);
    zoomAround(e.clientX, e.clientY, target / view.zoom);
  });
  canvas.addEventListener('gestureend', (e) => e.preventDefault());

  // ===== Canvas sizing =====
  function resize() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = innerWidth * dpr;
    canvas.height = innerHeight * dpr;
    // A <canvas> is a REPLACED element: `inset: 0` does not stretch it, its
    // CSS box defaults to its bitmap size. On a retina screen that made the
    // canvas twice the viewport, so every stroke landed at twice the pointer's
    // distance from the origin. The CSS size must be set explicitly.
    canvas.style.width = innerWidth + 'px';
    canvas.style.height = innerHeight + 'px';
    render(session.getState());
  }
  addEventListener('resize', () => {
    resize();
    // A replayed figure is fitted once so stepping never moves the view; a
    // lazily loaded iframe can be sized after that fit, so refit on resize.
    if (typeof rp !== 'undefined' && rp.rec) fitAll();
    relayoutChrome();
  });

  // ===== Layout changes, without touching what is in the field =============
  // The field is placed once, at the pen tip, and then the window turns, the
  // panel docks at the bottom, or the on-screen keyboard eats half the height
  // — and the field sat where it was, right edge at 878 on a 390px screen
  // (UI-1). Geometry is now re-run on every layout change, and only geometry:
  // the field's DOM node is not rebuilt, so the text, the caret, the focus and
  // the scroll are still there because nothing touched them. Drawings never
  // move: the view's zoom and pan are not read or written here.
  let relayoutPending = null;
  function relayoutChrome() {
    if (relayoutPending) return;
    relayoutPending = nextFrame(() => {
      relayoutPending = null;
      if (typeof replaceOpenField === 'function') replaceOpenField();
    });
  }
  if (window.visualViewport) {
    // The keyboard: on iOS the layout viewport does not change when it opens,
    // only the visual one, so `resize` alone never hears about it.
    visualViewport.addEventListener('resize', relayoutChrome);
    visualViewport.addEventListener('scroll', relayoutChrome);
  }
  // The panel growing a row, or changing size with the theme — a box that
  // changed, whatever caused it.
  if (window.ResizeObserver) {
    const chromeObserver = new ResizeObserver(relayoutChrome);
    for (const id of CHROME_IDS) { const el = document.getElementById(id); if (el) chromeObserver.observe(el); }
  }
  // The panel COLLAPSING is not a resize: `display: none` takes the element
  // out of layout altogether and a ResizeObserver reports nothing, either way
  // — so the class that does it is watched instead. `panelHidden` on the body
  // and `data-theme` on the root are the two switches that move the chrome.
  if (window.MutationObserver) {
    const classObserver = new MutationObserver(relayoutChrome);
    classObserver.observe(document.body, { attributes: true, attributeFilter: ['class'] });
    classObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'class'] });
  }

  // A frame that comes even when the page is not painting. Time is state
  // here, not a movie: a tank in a tab the browser has stopped painting
  // still owes its steps, so the loops ask for a frame and take a timer's
  // tick when no frame arrives in time.
  const FRAME_FALLBACK_MS = 40;
  function nextFrame(cb) {
    let done = false;
    const go = (now) => { if (done) return; done = true; cb(typeof now === 'number' ? now : performance.now()); };
    const id = requestAnimationFrame(go);
    const timer = setTimeout(() => { if (!done) { cancelAnimationFrame(id); go(performance.now()); } }, FRAME_FALLBACK_MS);
    return { cancel: () => { done = true; cancelAnimationFrame(id); clearTimeout(timer); } };
  }
