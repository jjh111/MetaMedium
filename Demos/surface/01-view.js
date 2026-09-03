// ===== view =====
// Provides: view {zoom, panX, panY}, screenToWorld/worldToScreen/wpx, zoomAround, fitAll, afterViewChange, the wheel/pinch/keyboard zoom, resize.
// Uses: core; input (panning/pinch state).
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

  function fitAll() {
    const ids = state.contentIds.concat(state.explanations);
    const boxes = ids.map((id) => MM.boundsOf(state.nodes.get(id))).filter(Boolean);
    if (!boxes.length) { view.panX = 0; view.panY = 0; view.zoom = 1; afterViewChange(); return; }
    const b = union(boxes);
    // Guard the viewport: a window smaller than the padding (or one not laid
    // out yet) would compute a negative scale and slam into MIN_ZOOM.
    const pad = Math.max(0, Math.min(90, innerWidth / 6, innerHeight / 6));
    const availW = Math.max(1, innerWidth - pad * 2);
    const availH = Math.max(1, innerHeight - pad * 2);
    const w = Math.max(1, b.maxX - b.minX), h = Math.max(1, b.maxY - b.minY);
    view.zoom = clampZoom(Math.min(availW / w, availH / h, 2));
    view.panX = (innerWidth - w * view.zoom) / 2 - b.minX * view.zoom;
    view.panY = (innerHeight - h * view.zoom) / 2 - b.minY * view.zoom;
    afterViewChange();
  }

  function afterViewChange() {
    document.getElementById('zoomPct').textContent = Math.round(view.zoom * 100) + '%';
    // ONE transform for both layers. If the ink canvas and the artifact stage
    // ever disagree, ink drifts off the divs it is supposed to outline.
    stage.style.transform =
      'translate(' + view.panX + 'px,' + view.panY + 'px) scale(' + view.zoom + ')';
    render(state);
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
  addEventListener('resize', resize);

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
