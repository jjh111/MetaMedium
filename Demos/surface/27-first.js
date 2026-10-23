// ===== the first hour =====
// Provides: what a first-time hand meets, on a desktop, a phone and an iPad (the UX pass):
//   - the first run on every screen (UX-03): on an empty board the three steps and *start from an example* whatever
//     the width — in the panel where it stands, else as a small sheet at the foot of the screen (#firstRun) that
//     leaves on the first stroke (syncFirstRun, firstRunState);
//   - the words for the hand in use (tapWords): a finger or a pen double-taps, a mouse double-clicks — read from the
//     last pointer's own pointerType, else whether the screen's main pointer is coarse; never the user agent;
//   - a board opened whole from an example inspects nothing until the hand points at a mark or draws (restAfterOpen,
//     resting; UX-11), and a thing just made is brought into view (bringIntoView; UX-13);
//   - a said sentence lets go when the hand draws again (UX-16);
//   - reduced motion (motionReduced; the critic's C4): prefers-reduced-motion, read once and on change — the working
//     dot and the find ring hold still, and an example's program waits for the person's own play.
// Uses: core (canvas, session, state, panelOpen, panelToggle, EMBED, prefs), render (render), inspector (firstLoopHtml),
//   folder (viewMode, boardMode), replay (rp), view (fitTo, usableViewport, worldToScreen, afterViewChange, union),
//   input (flashText, flashAt, FLASH_MS — the status line's own), boards (exampleButtonClick — the sheet's buttons are
//   the panel's, 22-boards.js).
// A fragment of one closure: Demos/build-surface.mjs concatenates surface/*.js
// in name order inside `(function () { ... })();`. Shared state is the
// closure's; no imports, no exports, no build step beyond the concatenation.

  // ===== Reduced motion (C4) ===================================================
  // The surface's motion is painted on the canvas, not in CSS, so the stylesheet's reduced-motion rule (no
  // transitions) reached none of it. Read the person's preference once, and again when it changes; what moves by
  // itself reads motionReduced(). A program the person plays still plays: that motion is theirs.
  const reducedMotionQuery = typeof matchMedia === 'function' ? matchMedia('(prefers-reduced-motion: reduce)') : null;
  let reducedMotion = !!(reducedMotionQuery && reducedMotionQuery.matches);
  if (reducedMotionQuery) {
    const heard = (e) => { reducedMotion = !!e.matches; render(session.getState()); };
    if (reducedMotionQuery.addEventListener) reducedMotionQuery.addEventListener('change', heard);
    else if (reducedMotionQuery.addListener) reducedMotionQuery.addListener(heard);
  }
  /** Whether the person asked for less motion: what moves by itself holds still. */
  function motionReduced() { return reducedMotion; }

  // ===== The words for the hand in use =========================================
  // "double-click" means nothing on a phone, and "double-tap" little with a mouse. The hand is told by the pointer it
  // last used — its own pointerType — and before any, by whether the screen's main pointer is coarse (a finger).
  let lastPointerType = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches ? 'touch' : 'mouse';
  addEventListener('pointerdown', (e) => { if (e.pointerType) lastPointerType = e.pointerType; }, { capture: true, passive: true });
  /** "double-tap" for a finger or a pen, "double-click" for a mouse. */
  function tapWords() { return lastPointerType === 'touch' || lastPointerType === 'pen' ? 'double-tap' : 'double-click'; }

  // ===== The first run on every screen (UX-03) ==================================
  // At 820 px and less the panel starts closed, and with it the three steps and *start from an example*: a first-time
  // hand on a phone met an empty canvas and the word "double-click". Where the panel does not stand — closed, on any
  // width — the same steps stand as a small sheet at the foot of the screen, until the first stroke. Not in an embed
  // or a replay (a figure, not a board to start on), not in the grid, and never again once the hand has drawn here.
  const firstRunEl = document.createElement('div');
  firstRunEl.id = 'firstRun';
  firstRunEl.hidden = true;
  firstRunEl.setAttribute('role', 'region');
  firstRunEl.setAttribute('aria-label', 'how to begin');
  document.body.appendChild(firstRunEl);
  let firstRunGone = false;
  let firstRunSaid = null;
  /** Whether the sheet stands now, and why not. */
  function firstRunState(s) {
    s = s || session.getState();
    const empty = !s.contentIds.length && !s.artifacts.length;
    const panelShows = !document.body.classList.contains('panelHidden');
    const why = firstRunGone ? 'drawn' : !empty ? 'not empty' : EMBED ? 'embed' : (typeof rp !== 'undefined' && rp.rec) ? 'replay'
      : viewMode !== 'canvas' ? 'grid' : panelShows ? 'the panel says it' : null;
    return { shown: !why, why: why };
  }
  function syncFirstRun(s) {
    const st = firstRunState(s);
    if (st.shown && firstRunSaid === null) { firstRunSaid = firstLoopHtml(); firstRunEl.innerHTML = firstRunSaid; }
    if (firstRunEl.hidden === st.shown) firstRunEl.hidden = !st.shown;
  }
  // The sheet's buttons are the panel's: a board of your own from the starter, or the boards pane's examples.
  firstRunEl.addEventListener('click', (e) => exampleButtonClick(e));
  // It leaves on the first stroke: a press on the canvas begins one.
  canvas.addEventListener('pointerdown', () => { if (!firstRunGone) { firstRunGone = true; firstRunEl.hidden = true; } }, { capture: true, passive: true });
  panelToggle.addEventListener('click', () => syncFirstRun(session.getState()));

  // ===== A said sentence lets go (UX-16) ========================================
  // A sentence said for a while (say, seven seconds) held the status line through the next acts — a kept ask stood
  // beside the lasso's hint after the hand had moved on. Once it has been up for a flash's time, the hand drawing
  // again is the hand having read it.
  canvas.addEventListener('pointerdown', () => {
    if (flashText && Date.now() - flashAt > FLASH_MS) { flashText = null; clearTimeout(flashTimer); }
  }, { capture: true, passive: true });

  // ===== A board opened whole inspects nothing (UX-11) ===========================
  // An example opened with its last mark inspected — its note, a text, said as "a text" in the panel — and the panel
  // over the drawing. Opened, it is fitted to the free ground and nothing is inspected until the hand points at a mark
  // or the board changes; the panel says what the board holds and how to begin.
  let restAt = null;
  function restAfterOpen() {
    const evs = session.getEvents();
    restAt = { events: evs, len: evs.length };
    hoverId = null;
    fitAll();
  }
  /** Whether nothing is to be inspected: the board as it was opened, nothing pointed at. */
  function resting() {
    if (!restAt) return false;
    const evs = session.getEvents();
    if (evs !== restAt.events || evs.length !== restAt.len) { restAt = null; return false; }
    return true;
  }

  // ===== A thing just made, in view (UX-13) ======================================
  /**
   * Bring marks into the free ground when any of them is outside it: panned, and zoomed out only as far as it takes —
   * never zoomed in to show them. Make it Mermaid stood its card right of the drawing, cut off at the window's edge,
   * and the view did not move. Returns whether the view moved.
   */
  function bringIntoView(ids) {
    const s = session.getState();
    const boxes = (ids || []).map((id) => s.nodes.get(id)).filter(Boolean).map((n) => MM.boundsOf(n)).filter(Boolean);
    if (!boxes.length) return false;
    const b = union(boxes);
    const free = usableViewport();
    const a = worldToScreen(b.minX, b.minY), z = worldToScreen(b.maxX, b.maxY);
    const M = 16;
    if (a.x >= free.left + M && a.y >= free.top + M && z.x <= free.right - M && z.y <= free.bottom - M) return false;
    const zoom = view.zoom;
    fitTo(b);
    if (view.zoom > zoom) {
      view.zoom = zoom;
      view.panX = free.left + (free.width - (b.maxX - b.minX) * zoom) / 2 - b.minX * zoom;
      view.panY = free.top + (free.height - (b.maxY - b.minY) * zoom) / 2 - b.minY * zoom;
      afterViewChange();
    }
    return true;
  }
