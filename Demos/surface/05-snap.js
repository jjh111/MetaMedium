// ===== snap =====
// Provides: snapping: offers, auto sweep, the rail button (scoped to a loop while one waits).
// Uses: core, view, render, input (flash).
// A fragment of one closure: Demos/build-surface.mjs concatenates surface/*.js
// in name order inside `(function () Ellipsis)();`. Shared state is the
// closure's; no imports, no exports, no build step beyond the concatenation.

  // ===== Snapping: a confident reading, redrawn ============================
  //
  // The engine says "rectangle 0.86"; the canvas can draw that rectangle. Three
  // ways in, one mechanism: the ghost under each confident mark is the OFFER,
  // the rail button and the palette take it up for many at once, and the
  // inspector for one. `auto` takes it up as you draw. The ink is never
  // replaced — it stays faint under the clean form, and undo drops the form.
  const SNAP_KEY = 'mm-snap';
  const SNAP_MODES = ['offer', 'auto', 'off'];
  let snapMode = SNAP_MODES.includes(store.get(SNAP_KEY)) ? store.get(SNAP_KEY) : 'offer';
  let snapOffers = new Map(); // id → candidate, recomputed each render
  const idealCache = new WeakMap(); // node → clean form (nodes are rebuilt on replay)
  const snapBtn = document.getElementById('snapBtn');
  const snapModeBtn = document.getElementById('snapMode');

  function idealOf(node, shape) {
    let c = idealCache.get(node);
    if (c === undefined || (c && c.shape !== shape)) { c = MM.idealize(node, shape); idealCache.set(node, c); }
    return c;
  }
  /** The marks a held loop encloses — the same test the engine will make when it resolves. */
  function heldEnclosed(s) {
    if (!s.pendingLassoId) return [];
    const lasso = s.nodes.get(s.pendingLassoId);
    const b = lasso && MM.boundsOf(lasso);
    if (!b) return [];
    return MM.enclosedBy(b, s.contentIds.filter((id) => id !== s.pendingLassoId)
      .map((id) => ({ id, bounds: MM.boundsOf(s.nodes.get(id)) })).filter((c) => c.bounds));
  }
  let heldCandidates = []; // offers among what the held loop encloses

  function refreshOffers() {
    const s = session.getState();
    snapOffers = snapMode === 'off' ? new Map() : new Map(session.snapCandidates().map((c) => [c.id, c]));
    heldCandidates = heldEnclosed(s).filter((id) => snapOffers.has(id));
    // A held loop scopes the button: what you circled, not everything.
    const n = heldCandidates.length || snapOffers.size;
    snapBtn.hidden = n === 0;
    snapBtn.textContent = (heldCandidates.length ? 'Snap circled ' : 'Snap ') + n;
    snapModeBtn.textContent = 'snap · ' + snapMode;
  }
  function shapesSummary(cands) {
    const counts = {};
    cands.forEach((c) => { counts[c.shape] = (counts[c.shape] || 0) + 1; });
    return Object.entries(counts).map(([k, v]) => v + ' ' + k + (v === 1 ? '' : 's')).join(', ');
  }
  function snapAll(ids, why) {
    if (!ids.length) return;
    session.snap({ ids: ids, at: Date.now() });
    flash('drew ' + ids.length + ' clean' + (why ? ' — ' + why : ''));
  }
  function setSnapMode(mode) {
    snapMode = SNAP_MODES.includes(mode) ? mode : 'offer';
    store.set(SNAP_KEY, snapMode);
    // Auto means everything that reads clean IS clean — including what was
    // drawn before the switch.
    if (snapMode === 'auto') autoSweep();
    render(session.getState());
  }
  /** Auto: take every open offer except the held loop, which is a gesture in waiting. */
  function autoSweep() {
    if (snapMode !== 'auto') return;
    const ids = session.snapCandidates().map((c) => c.id);
    if (ids.length) session.snap({ ids: ids, at: Date.now() });
  }

  // The loop that waits is plain ink. It used to raise a chip beside itself
  // ("N circled · Draw them clean / What could these be?") the moment it was
  // drawn — an affordance that fired on every circle, whether or not one was
  // meant. The command mark is the one thing that turns a loop into a
  // selection; the loop's ink then leaves in favour of the outline and its
  // handles. What the loop scopes is the rail's Snap button, quietly.
  function renderHeld(s) { void s; }
  snapBtn.onclick = () => {
    const ids = heldCandidates.length ? heldCandidates : [...snapOffers.keys()];
    snapAll(ids, shapesSummary(ids.map((id) => snapOffers.get(id))));
  };
  snapModeBtn.onclick = () => setSnapMode(SNAP_MODES[(SNAP_MODES.indexOf(snapMode) + 1) % SNAP_MODES.length]);
