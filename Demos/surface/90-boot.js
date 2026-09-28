// ===== boot =====
// Provides: the debug handle (window.__mm, what the e2e drives), subscription (the journal first, the paint,
//   the packs pane and the pen's ports), restore, first render.
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
    inkImage: inkImage, readOne: readOne, readWriting: readWriting, askModelsAbout: askModelsAbout,
    // A hosted model asked, and why when it cannot be (V1-PLAN J5), for tests: the ask kept for a model, and each model's last call.
    keptAsk: () => (keptAsk ? { what: keptAsk.what, needs: keptAsk.needs } : null),
    lastCalls: () => agents.map((a) => ({ id: a.id, model: a.config.model, line: callLine(lastCall.get(a.id)) })),
    // Device preferences and the chrome, for tests: the theme, the hand, auto-read, the field's reader, the clip.
    themeMode: () => themeMode, setThemeMode: setThemeMode, hand: () => hand, setHand: setHand,
    // Pen, finger and palm (V1-PLAN R6), for tests: what draws, the magnet a hovering pen feels, and the hands down.
    draws: () => draws, setDraws: setDraws, palmMs: PALM_MS,
    penHover: () => (penHover ? { kind: penHover.site.kind, index: penHover.site.index, nodeId: penHover.site.nodeId, point: { x: penHover.site.point.x, y: penHover.site.point.y } } : null),
    hands: () => ({ pens: pen.down.size, fingers: [...touches.values()].map((t) => ({ id: t.id, role: t.role, moved: t.moved })), owner: owner ? Object.assign({}, owner) : null, downType: downType }),
    autoRead: () => autoRead, setAutoRead: setAutoRead, readField: (q) => readField(q), clip: () => clip,
    copyMarks: copyMarks, pasteClip: pasteClip, openCC: openCC, closeCC: closeCC, syncTiles: syncTiles,
    replay: () => rp, rpGoTo: (i) => rpGoTo(i), theme: THEME,
    // The minimap, for tests: where the last paint put the world.
    minimap: () => mini, readGroups: readGroups, chips: () => chipHits,
    // The chrome a figure wears only while pointed at, for tests.
    chromeDrawn: () => chromeDrawn.slice(),
    // The models at work, for tests: the key of every call in flight (one Enter, one act).
    working: () => [...working.keys()],
    // A hand's word on its own ink, for tests: where the last paint drew each label, and a mark's ink colour.
    labelsDrawn: () => labelsDrawn.map((l) => Object.assign({}, l)),
    // The one selected mark's own points (V1-PLAN E1), for tests: where the last paint drew each handle, in world units.
    handlesDrawn: () => handlesDrawn.map((h) => Object.assign({}, h)),
    // What followed the drag in progress (V1-PLAN E2), for tests: each connector the last paint drew following, and its ends where it drew them.
    followDrawn: () => (followShown ? [...followShown].map(([id, n]) => ({ id: id, ends: MM.connectorEnds(n, state.nodes) })) : []),
    // The site a connector's own end dragged by its handle is held on (V1-PLAN E2), for tests — or null.
    dragHold: () => (drag && drag.hold ? { nodeId: drag.hold.site.nodeId, kind: drag.hold.site.kind, index: drag.hold.site.index } : null),
    // What the last paint drew under the inspected mark, and the check that a hand's paint draws and says what the whole-board read would (R4c).
    readingDrawn: () => (readingDrawn ? Object.assign({}, readingDrawn) : null), paintCheck: paintCheck, rolesCheck: rolesCheck, heldCheck: heldCheck, paints: () => paints,
    // Point at a mark the way a hover does, for tests: it is inspected, its reading drawn under it and its ladder in the panel.
    inspect: (id) => { hoverId = id || null; render(state); },
    colourOf: (id) => { const n = session.getState().nodes.get(id); return n ? colourOf(n) : null; },
    // The colour the last paint stroked a mark's ink in — inside an artifact too, where each mark keeps its drawer's (L2f).
    inkDrawn: (id) => inkDrawn.get(id) || inkWouldBe(id) || null,
    // The explanation plane, for tests: where the last paint put each answer card.
    answerCards: () => cardRects.map((c) => ({ id: c.id, about: c.about.slice(), what: c.what, who: c.who, ago: c.ago, x: c.x, y: c.y, w: c.w, h: c.h })),
    // Text folds back from ink, for tests: the words of a text where they stand.
    textWords: (id) => textWords(session.getState(), id), foldIntoText: foldIntoText,
    strikeOnText: (strokeId, pts) => strikeOnText(session.getState(), strokeId, pts), textNear: (b) => textNear(session.getState(), b),
    // For tests: pin the view so world coordinates map to known screen ones.
    setView: (zoom, panX, panY) => { view.zoom = zoom; view.panX = panX; view.panY = panY; afterViewChange(); },
    // The space actually visible, and where the field stands in it (UI-1).
    // `usableRect` and `fieldBox` are pure: a test hands them rects.
    usableRect: usableRect, usableViewport: usableViewport, viewportRect: viewportRect,
    fieldBox: fieldBox, placeField: placeField, chromeRects: chromeRects,
    // For tests: pin the viewport, so narrow-screen geometry can be checked in
    // a tab that cannot resize itself.
    setTestViewport: setTestViewport,
    // Learned use, globally and per kind of context, and the top each context held — all device state, reset for a run.
    resetUses: () => {
      for (const k of Object.keys(uses)) delete uses[k];
      for (const k of Object.keys(usesHere)) delete usesHere[k];
      store.del(USES_KEY); store.del(USES_HERE_KEY);
      steadyTops.clear();
    },
    // The open field's items, for tests (V1-PLAN B1): every one it holds, ranked, and the ones a query leaves visible, in display order.
    fieldItems: (q) => {
      const of = (i) => ({ key: i.key, label: i.label, why: i.why + (i.groupWhy ? ' — ' + i.groupWhy : ''), tier: i.tier, certain: !!i.certain, because: (i.because || []).slice(), steady: !!i.steady });
      return session.getState().summon ? { ranked: paletteItems.map(of), shown: visibleItems(q || '').map(of) } : null;
    },
    // What stands beside the open field's marks (V1-PLAN §2.2, B2), and the tops the contexts hold, for tests.
    paletteContext: () => (session.getState().summon ? paletteContext : null),
    steadyTops: () => [...steadyTops].map(([k, v]) => ({ context: k, key: v.key, at: v.at })),
    usesHere: () => JSON.parse(JSON.stringify(usesHere)),
    // The worker runtime, for tests: what is loaded, where each body is, what broke.
    runtime: () => ({ bodies: runtime.bodies, broken: runtime.broken, loaded: runtime.loaded, budgetMs: RUN_BUDGET_MS, log: runtime.log, pending: runtime.pending, stepOnce: stepOnce }),
    // Programs, for tests: what a running frame reported, and the library.
    reportedRegions: (id) => reportedRegions(id),
    libraryEntries: () => libraryEntries(session.getState()),
    // Text as an element, for tests.
    typeText: typeText, editText: editText, wordToText: wordToText, beginTextEdit: beginTextEdit, commitTextEdit: commitTextEdit,
    // Pictures in and the board out, for tests.
    importBitmap: importBitmap, importText: importText, exportBoardSVG: exportBoardSVG, exportLog: exportLog,
    // The folder, for tests: open any store (a MemoryStore stands in for a folder), and read the board's home.
    openStore: (store, how, name) => openStore(store, how, name),
    openGit: (spec, token, remember) => openGit(spec, token, remember),
    openLive: (room, opts) => openLive(room, opts), mergeLive: mergeLive, handColour: handColour,
    // The seat (V1-PLAN J4), for tests: where it stands, and the acts.
    seat: seatState, joinSeat: joinSeat, leaveSeat: leaveSeat, withClaude: withClaude,
    folder: () => folder,
    setParticipant: setParticipant,
    forgetLocalLog: forgetLocalLog,
    saveNow: saveNow,
    // The board this browser keeps (V1-PLAN R3), for tests: its state, what its store holds, and the way out into a folder.
    board: boardState, boardRecords: () => (board.backend ? board.backend.read() : Promise.resolve(null)), keepBoardIn: keepBoardIn,
    // The boards this browser keeps (V1-PLAN R1), for tests: the list as this page holds it, one board as its store holds it, and the acts.
    boards: boardsState, boardsStore: boardsStore, switchBoard: switchBoard, newBoard: newBoard, renameBoard: renameBoard,
    duplicateBoard: duplicateBoard, trashBoard: trashBoard, restoreBoard: restoreBoard, planEmptyTrash: planEmptyTrash, emptyTrash: emptyTrash,
    boardLog: () => (board.backend ? board.backend.read().then((got) => journalFold(got.records).events) : Promise.resolve(null)),
    boardIdle: () => board.journal.idle(),
    setViewMode: setViewMode, viewMode: () => viewMode, focusOn: focusOn,
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


  // The board this browser keeps hears every change FIRST, before the paint:
  // a release on a big board paints for seconds, and the record of the stroke
  // must be the browser's before then (V1-PLAN R3, the kill test).
  session.subscribe(persistBoard);
  session.subscribe(render);
  // The library packs the board uses (V1-PLAN §2.3, B3): the pane and the tile follow its log, and so
  // does the pen — a pack naming a notation offers its ports while in use, and takes them back after.
  session.subscribe(packsHeard);
  MM.followPacks(session);
  const replayUrl = params.get('replay');
  const mode = boardMode();
  if (mode === 'off') board.journal.off();
  if (!replayUrl) {
    // Last time's board comes back from the browser (IndexedDB — a moment,
    // not at once): the one the address names (?board=), else the one opened
    // last; a folder, a repository or a room named in the URL is the canvas
    // instead, and this page keeps no board of its own — it reads the list,
    // for the boards pane and the places it remembers.
    const settle = (restored) => {
      // The device's mark, taught again only where the board's log says otherwise (so opening a board is not a change to it).
      markAfterOpen();
      rejoinRemembered();
      const others = [...boards.entries.values()].filter((e) => isKept(e) && !e.trashed && e.id !== board.id).length;
      if (restored && !board.saidAtOpen) flash('“' + boardOnScreenName() + '” is back' + (others ? ' — ' + others + ' more in boards' : ''));
    };
    if (mode === 'restore') openBoard(mode).then(settle, () => settle(false));
    else {
      if (mode === 'fresh') openBoard(mode);
      else if (!EMBED) openBoardsList();
      settle(false);
    }
    if (params.get('folder')) openStatic(params.get('folder'));
    else if (params.get('git')) openGit(params.get('git'));
    else if (params.get('live')) openLive(params.get('live'), params.get('relay') ? { relay: params.get('relay') } : {});
  } else {
    startReplay(replayUrl);
  }
  session.subscribe(scheduleSave);
  document.fonts.ready.then(() => { sizePad(); render(session.getState()); });
  syncTiles();
  // Installable, and open with no network: the shell is cached by a service
  // worker when the page is served, never from a file on disk.
  if ('serviceWorker' in navigator && /^https?:/.test(location.protocol) && !params.has('nosw')) {
    navigator.serviceWorker.register('sw.js').catch(() => { /* not available here; the page works the same */ });
  }
  resize();
  afterViewChange();
