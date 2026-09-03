// ===== boot =====
// Provides: the debug handle (window.__mm, what the e2e drives), subscription, restore, first render.
// Uses: everything.
// A fragment of one closure: Demos/build-surface.mjs concatenates surface/*.js
// in name order inside `(function () { ... })();`. Shared state is the
// closure's; no imports, no exports, no build step beyond the concatenation.

  window.__mm = {
    session: session, agents: agents, MM: MM, view: view, frames: frames,
    savedMark: savedMark, forgetMark: forgetMark, join: join, probeLocal: probeLocal,
    screenToWorld: screenToWorld, worldToScreen: worldToScreen,
    fitAll: fitAll, regionsUnderInk: regionsUnderInk,
    snapMode: () => snapMode, setSnapMode: setSnapMode, snapOffers: () => snapOffers,
    inkImage: inkImage, readOne: readOne, readWriting: readWriting,
    replay: () => rp, rpGoTo: (i) => rpGoTo(i), theme: THEME,
    // For tests: pin the view so world coordinates map to known screen ones.
    setView: (zoom, panX, panY) => { view.zoom = zoom; view.panX = panX; view.panY = panY; afterViewChange(); },
    resetUses: () => { for (const k of Object.keys(uses)) delete uses[k]; store.del(USES_KEY); },
    // The worker runtime, for tests: what is loaded, where each body is, what broke.
    runtime: () => ({ bodies: runtime.bodies, broken: runtime.broken, loaded: runtime.loaded, budgetMs: RUN_BUDGET_MS }),
    // Frames, for tests: the wired code a member renders with, and a frame as files.
    wiredCodeOf: (id) => wiredCodeOf(session.getState(), id),
    exportFrame: (id) => exportFrameFiles(id),
    // The tank, for tests: step a definition's clock by hand and read where its bodies are.
    tank: () => ({
      defs: tank.defs,
      actOut: (defId, bodyId, samples) => actOut(defId, bodyId, samples),
      bodies: () => allBodies().map((b) => ({ id: b.id, name: b.name, x: b.x, y: b.y })),
      step: (defId, n) => stepTank(session.getState(), defId, n),
      time: (defId) => tankTime(defId),
      positions: (defId) => { const d = tank.defs.get(defId); return d ? d.order.map((id) => { const b = d.bodies.get(id).body; return { id: id, x: +b.x.toFixed(4), y: +b.y.toFixed(4) }; }) : []; },
    }),
  };


  session.subscribe(render);
  const replayUrl = params.get('replay');
  if (!replayUrl) {
    restoreMark();
    rejoinRemembered();
  } else {
    startReplay(replayUrl);
  }
  document.fonts.ready.then(() => { sizePad(); render(session.getState()); });
  resize();
  afterViewChange();
