// ===== runs =====
// Provides: the pendulum alive on the surface (MATHS-SPEC §8 Lane D, M23; V1-SPEC RN4) — aliveSync / renderAlive (called by render:
//   the runs the board's clocks name, kept while their inputs stand, and T and the live θ as chips beside them), placementOf (a
//   body's placement, else a run's: the one hook render asks, 08-render.js), alivePlacement / aliveMovedIds / aliveMoving /
//   aliveWith (what a run has turned, and drawing a member where it has), aliveIsRunning (the tools' host: what runs in THIS
//   sitting), aliveStopAll (Esc), and window.__mmRun, the handle the e2e drives.
// Uses: core (MM.runsIn, MM.createStepper, MM.boardMathsOf, MM.PULL_ASIDE_DEG), render (render, logKey, boxMeets, roundRect, nowMs,
//   hoverId, C, ctx), clocks (lastClockOp, bodyPlacement), palette (TOOL_ACTS), input (say, flash), view (wpx, nextFrame).
// A fragment of one closure: Demos/build-surface.mjs concatenates surface/*.js in name order inside `(function () { ... })();`.
// Shared state is the closure's; no imports, no exports, no build step beyond the concatenation.

  // ===== A run is alive by the hand's act, and its time is derived ===========
  // The log holds one thing of a run: the `clock` play (and pause, and reset) the hand wrote on the mark a runner reads — a
  // pendulum's rod (core's `applyClock`). Everything else is runtime and is found again whenever it must be:
  //   - **Nothing runs unblessed, and a blessing is this sitting's.** A play already in the log when the board was opened is an
  //     earlier sitting's act: the page opened again holds the pendulum paused, the clock still saying played, and offers Play. A run
  //     is *armed* only when the page sees a clock event arrive (a tap, a key, a hand in a room) on the board it has open.
  //   - **Time is the step count.** Each run is a stepper (core's `createStepper`: a fixed small step, keyframes, a budget that
  //     says when it stopped), kept while its INPUTS stand — a stroke drawn elsewhere changes the log, not the run — and
  //     re-derived to the same time when they change (a length written, the rod redrawn), never from t = 0 on every change.
  //   - **The ink moves only at render time.** A run puts out placements — each moving mark turned about the pivot, in the shape a
  //     tank's body has — and the paint draws the ink there. No `move`, no `rotate`, no event while it swings.
  const ALIVE_MAX_FRAME_MS = 250;         // a frame later than this is a stalled tab, not that much time
  const ALIVE_REDERIVE_MAX_S = 600;       // a run re-derived after its inputs changed is taken at most this far
  const aliveSteppers = new Map();        // key (the rod) -> the stepper over its run
  const aliveArmed = new Set();           // the keys that run in THIS sitting
  const aliveSeen = new Map();            // key -> the `at` of the clock event last seen
  const alivePlaced = new Map();          // mark id -> its placement now: { id, dx, dy, angle, cx, cy }
  let aliveGen = -1;                      // the board generation the above belong to
  let aliveKept = { key: null, runs: [] };// the runs read for this log, kept while it stands
  let aliveRaf = 0, aliveLast = 0;
  let aliveDrawn = [];                    // this paint's chips, for tests: { quantity, text, x, y }

  /** Is the run keyed by this mark running in this sitting? The tools ask (core's `ToolHost.running`). */
  function aliveIsRunning(key) {
    const st = aliveSteppers.get(key);
    return aliveArmed.has(key) && !!st && !st.stopped;
  }

  /** The keys whose clocks are a run's: held on a mark that is no artifact. */
  function aliveClocked(s) {
    return Object.keys(s.clocks).filter((id) => !s.artifacts.includes(id) && !s.live.includes(id) && s.nodes.has(id));
  }

  /** What each stepper has turned, as placements by mark: kept after every step. */
  function aliveRefreshPlaced() {
    alivePlaced.clear();
    for (const st of aliveSteppers.values()) {
      if (st.steps === 0) continue;
      for (const p of st.placements()) alivePlaced.set(p.id, p);
    }
  }

  /**
   * The runs the board's clocks name, in step with the log. Called by every render, and does nothing until the log has
   * changed. A board replaced in place seeds what it finds and arms nothing — whatever its clocks say was played before.
   */
  function aliveSync(s) {
    const key = logKey() + ':' + s.generation;
    if (aliveKept.key === key) return;
    aliveKept = { key: key, runs: aliveKept.runs };
    const fresh = s.generation !== aliveGen;
    if (fresh) {
      aliveGen = s.generation;
      aliveSteppers.clear(); aliveArmed.clear(); aliveSeen.clear(); alivePlaced.clear();
    }
    const clocked = aliveClocked(s);
    if (!clocked.length) {
      aliveSteppers.clear(); aliveArmed.clear(); aliveSeen.clear(); alivePlaced.clear();
      aliveKept.runs = [];
      aliveLoopControl();
      return;
    }
    // Only the runs the clocks name are read for their inputs; the board is read once for all of them.
    const runs = MM.runsIn(s, undefined, () => MM.boardMathsOf(session)).filter((r) => clocked.includes(r.reading.key));
    for (const run of runs) {
      const k = run.reading.key, c = s.clocks[k];
      let st = aliveSteppers.get(k);
      if (!st || st.run.inputsKey !== run.inputsKey || st.run.runner !== run.runner) {
        // New, or its inputs changed: derived again, to the time it had reached.
        const t0 = st ? st.t : 0;
        st = MM.createStepper(run);
        if (t0 > 0) st.seek(Math.min(t0, ALIVE_REDERIVE_MAX_S));
        aliveSteppers.set(k, st);
      } else st.rebase(run);
      if (aliveSeen.get(k) !== c.at) {
        aliveSeen.set(k, c.at);
        if (!fresh) {
          if (lastClockOp(k) === 'reset') st.reset();
          if (c.playing) aliveArmed.add(k); else aliveArmed.delete(k);
        }
      }
    }
    for (const k of [...aliveSteppers.keys()]) if (!runs.some((r) => r.reading.key === k)) aliveSteppers.delete(k);
    for (const k of [...aliveArmed]) if (!aliveSteppers.has(k) || !s.clocks[k] || !s.clocks[k].playing) aliveArmed.delete(k);
    for (const k of [...aliveSeen.keys()]) if (!s.clocks[k]) aliveSeen.delete(k);
    aliveKept.runs = runs;
    aliveRefreshPlaced();
    aliveLoopControl();
  }

  /** Run the frame loop while anything is armed. */
  function aliveLoopControl() {
    if (aliveArmed.size && !aliveRaf) { aliveLast = performance.now(); aliveRaf = nextFrame(aliveLoop); }
    if (!aliveArmed.size && aliveRaf) { aliveRaf.cancel(); aliveRaf = 0; }
  }

  function aliveLoop(now) {
    // `aliveRaf` stays set through the body: the render below re-enters aliveSync, and a loop that looked stopped from
    // there would start a second one (the tank's lesson, 14-clocks.js).
    const s = session.getState();
    const keys = [...aliveArmed].filter((k) => aliveSteppers.has(k));
    if (!keys.length) { aliveRaf = 0; return; }
    const dt = Math.min(ALIVE_MAX_FRAME_MS, Math.max(0, now - aliveLast));
    aliveLast = now;
    for (const k of keys) {
      const st = aliveSteppers.get(k);
      st.advance(dt / 1000);
      // A run that ran out of steps says so, and the clock says why it stopped, as a program's does.
      if (st.stopped) { aliveArmed.delete(k); session.clock({ nodeId: k, op: 'pause', reason: st.stopped.sentence, at: Date.now() }); say(st.stopped.sentence); }
    }
    aliveRefreshPlaced();
    render(s);
    aliveRaf = aliveArmed.size ? nextFrame(aliveLoop) : 0;
  }

  // ===== What render asks =====================================================
  /** Where a run has taken a mark: { dx, dy, angle, cx, cy } as a body's placement is, or null. */
  function alivePlacement(id) { return alivePlaced.get(id) || null; }
  /** The marks a run has turned, for the paint to draw wherever they are. */
  function aliveMovedIds() { return alivePlaced.keys(); }
  /** Whether any run has turned a mark. */
  function aliveMoving() { return alivePlaced.size > 0; }
  /** A body's placement (the tank's), else a run's: the one question the paint asks of a mark. */
  function placementOf(id) { return bodyPlacement(id) || alivePlacement(id); }
  /** Draw a member where a run has taken it: the same turn and move a body gets. */
  function aliveWith(id, draw) {
    const pl = alivePlacement(id);
    if (!pl) { draw(); return; }
    ctx.save();
    ctx.translate(pl.cx + pl.dx, pl.cy + pl.dy);
    ctx.rotate(pl.angle);
    ctx.translate(-pl.cx, -pl.cy);
    draw();
    ctx.restore();
  }

  // ===== T and the live θ, beside the pendulum ==================================
  // The ghost rule (v10 F4): an answer shows while it runs, while the hand points at the pendulum or holds it, and while it
  // stands turned (paused mid-swing, where θ is the answer). Quiet — they are what the run is, not a problem.
  function alivePill(str, left, base) {
    ctx.font = wpx(10.5).toFixed(2) + 'px ui-monospace, SFMono-Regular, Menlo, monospace';
    const w = ctx.measureText(str).width + wpx(14), h = wpx(17);
    roundRect(left, base - h, w, h, h / 2);
    ctx.fillStyle = `rgba(${C.panelRGB},0.92)`;
    ctx.fill();
    ctx.strokeStyle = `rgba(${C.labelRGB},0.55)`;
    ctx.lineWidth = wpx(1);
    ctx.stroke();
    ctx.fillStyle = `rgba(${C.labelRGB},0.95)`;
    ctx.fillText(str, left + wpx(7), base - wpx(5));
    return { w: w, h: h };
  }

  /** Called by every render: bring the runs up to the log, and draw what stands beside them. */
  function renderAlive(s, ix, vb) {
    aliveSync(s);
    aliveDrawn = [];
    if (!aliveSteppers.size) return;
    const held = new Set(s.selection);
    if (s.summon) for (const id of s.summon.enclosedIds) held.add(id);
    if (hoverId) held.add(hoverId);
    for (const [k, st] of aliveSteppers) {
      const marks = st.run.reading.marks;
      const shows = aliveArmed.has(k) || st.steps > 0 || marks.some((id) => held.has(id));
      if (!shows) continue;
      st.readouts().forEach((r, i) => {
        const left = r.at.x, base = r.at.y + i * wpx(22);
        ctx.font = wpx(10.5).toFixed(2) + 'px ui-monospace, SFMono-Regular, Menlo, monospace';
        const w = ctx.measureText(r.text).width + wpx(14), h = wpx(17);
        if (vb && !boxMeets({ minX: left, minY: base - h, maxX: left + w, maxY: base }, vb)) return;
        alivePill(r.text, left, base);
        aliveDrawn.push({ quantity: r.quantity, text: r.text, x: left, y: base, live: r.live });
      });
    }
  }

  // ===== What taking an offer says ==============================================
  TOOL_ACTS.run = {
    after: (o) => {
      const d = o.data;
      const st = aliveSteppers.get(d.key);
      if (d.op === 'play') say('the pendulum swings — ' + (st ? st.readouts()[0].text : 'T shown beside it') + ' · Esc stops it');
      else if (d.op === 'pause') say('the pendulum is held where it is — Play lets it go on, Reset puts it back');
      else if (d.op === 'reset') say('back where it was drawn');
      else if (d.op === 'aside') say('pulled aside ' + MM.PULL_ASIDE_DEG + '° from plumb — Play lets it swing');
    },
  };

  // ===== Esc ====================================================================
  /** The marks the hand holds — a selection or an open field — with the parts of any named artifact among them. */
  function aliveHeld(s) {
    const ids = new Set(s.selection);
    if (s.summon) for (const id of s.summon.enclosedIds) ids.add(id);
    for (const id of [...ids]) {
      const n = s.nodes.get(id);
      if (n && s.artifacts.includes(id)) for (const e of n.edges) if (e.rel === 'has-part') ids.add(e.to);
    }
    return ids;
  }

  /**
   * Stop the runs that run here: one pause each, the hand's own act, in one undo. With `heldOnly` the ones the hand holds
   * the marks of; else all.
   */
  function aliveStopAll(heldOnly) {
    const s = session.getState();
    const held = heldOnly ? aliveHeld(s) : null;
    const keys = [...aliveArmed].filter((k) => aliveSteppers.has(k) && (!held || aliveSteppers.get(k).run.reading.marks.some((id) => held.has(id))));
    if (!keys.length) return 0;
    const now = Date.now();
    session.withTool('run', () => { for (const k of keys) session.clock({ nodeId: k, op: 'pause', at: now }); }, 'run:pause');
    say('stopped ' + keys.length + (keys.length === 1 ? ' run' : ' runs') + ' — Play lets ' + (keys.length === 1 ? 'it' : 'them') + ' go on');
    return keys.length;
  }
  // Esc is the hand's way out of what runs: it stops the pendulum the hand is holding, and with nothing held every run here — the
  // same moment it stops model calls in flight (04-models.js). Asked in the capture phase, BEFORE the field closes and the selection
  // lets go, so "what the hand holds" is what it held when the key went down; a hand holding something else only deselects, as ever.
  addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !aliveArmed.size) return;
    const inField = !!(e.target && e.target.closest && e.target.closest('#summon'));
    if (e.target !== document.body && !inField) return;
    const s = session.getState();
    aliveStopAll(!!(s.selection.length || s.summon));
  }, true);

  // ===== The e2e's handle =======================================================
  window.__mmRun = {
    /** Every run the board reads, running or not (derived afresh): what the gate asks of a pendulum drawn with the pointer. */
    runs: () => MM.runsIn(session.getState(), undefined, () => MM.boardMathsOf(session)).map((r) => {
      const st = aliveSteppers.get(r.reading.key);
      const d = r.reading.data || {};
      return {
        key: r.reading.key, runner: r.runner.id, confidence: r.reading.confidence, summary: r.reading.summary, marks: r.reading.marks.slice(),
        running: aliveIsRunning(r.reading.key), t: st ? st.t : 0, steps: st ? st.steps : 0, stopped: st && st.stopped ? st.stopped.sentence : null,
        theta0: d.theta, inputs: r.inputs,
      };
    }),
    running: () => [...aliveArmed],
    placements: () => [...alivePlaced.values()].map((p) => Object.assign({}, p)),
    chips: () => aliveDrawn.map((c) => Object.assign({}, c)),
    /** The pivot, the rod's top end and the bob's centre as the paint draws them now — the same placements, applied to the points. */
    drawn: (rodId, bobId) => {
      const st = aliveSteppers.get(rodId);
      const part = (st ? st.run.reading.data : (MM.pendulumsIn(session.getState()).find((p) => p.rod === rodId) || null));
      if (!part) return null;
      const at = (id, p) => {
        const pl = alivePlaced.get(id);
        if (!pl) return { x: p.x, y: p.y };
        const c = Math.cos(pl.angle), sn = Math.sin(pl.angle), vx = p.x - pl.cx, vy = p.y - pl.cy;
        return { x: pl.cx + pl.dx + vx * c - vy * sn, y: pl.cy + pl.dy + vx * sn + vy * c };
      };
      return { pivot: at(rodId, part.pivot), bob: at(bobId, part.bobAt), moved: [...alivePlaced.values()].some((p) => p.angle !== 0), t: st ? st.t : 0, steps: st ? st.steps : 0 };
    },
    /** A test's: take n steps of a run without waiting for frames. */
    stepBy: (key, n) => { const st = aliveSteppers.get(key); if (!st) return false; st.advanceSteps(n); aliveRefreshPlaced(); render(session.getState()); return true; },
  };
