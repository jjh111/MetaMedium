// ===== clocks =====
// Provides: the tank — definitions and their instances as bodies, the fixed-step loop, determinism
//   (positions are a function of the log and the clock's time), bodyPlacement(id) for render,
//   tankTime/tankCount for the panel, stepTank for tests.
// Uses: core (session, state, MM), render (render), kinds (runtimeBroken).
// A fragment of one closure: Demos/build-surface.mjs concatenates surface/*.js
// in name order inside `(function () { ... })();`. Shared state is the
// closure's; no imports, no exports, no build step beyond the concatenation.

  // ===== Time: a definition's clock moves its instances ====================
  // A definition is a blessed artifact; its own ink is its first instance, a
  // blessed match is another, and a held candidate the engine recognises as it
  // is one too — unblessed, so a "Not a …" takes it out of the tank. Play is
  // the human's event (I9). Positions are RUNTIME state: never in the log,
  // re-derived from t = 0 whenever the log changes, so undoing a body puts
  // every other body exactly where the shorter program leaves it.
  const FIXED_DT = 1 / 60;
  const MAX_STEPS_PER_FRAME = 8;
  const MAX_REDERIVE_STEPS = 6000;
  const MAX_FRAME_MS = 250;
  /** What a definition does until words or a hand give it a behaviour: wander, and keep to its spot. */
  const BUILTIN_BEHAVIOUR = { terms: [{ verb: 'wander', weight: 1 }, { verb: 'hold', weight: 0.35 }], source: 'hand' };

  const tank = {
    defs: new Map(),   // defId -> { t, seed, rng, bodies: Map<bodyId, entry>, order: bodyId[] }
    place: new Map(),  // nodeId -> entry (for render)
    logStamp: '',
    acc: 0, last: 0, raf: 0,
  };

  function logStamp() {
    const evs = session.getEvents();
    const last = evs[evs.length - 1];
    return evs.length + ':' + (last ? last.type + ':' + (last.at || 0) : '');
  }

  /** The definition an artifact belongs to: what it is an instance of, else itself. */
  function definitionOf(s, artifactId) {
    const n = s.nodes.get(artifactId);
    const inst = n && n.edges.find((e) => e.rel === 'instance-of');
    return inst ? inst.to : artifactId;
  }

  function behaviourOf(s, defId) {
    const n = s.nodes.get(defId);
    const rep = n && n.reps.filter((r) => r.modality === 'behaviour').pop();
    return (rep && rep.data && rep.data.terms) ? rep.data : BUILTIN_BEHAVIOUR;
  }

  /** The bodies of a definition, in creation order: itself, blessed instances, then held candidates. */
  function bodyEntriesOf(s, defId) {
    const out = [];
    for (const aid of s.artifacts) {
      if (definitionOf(s, aid) !== defId) continue;
      const n = s.nodes.get(aid);
      if (n.reps.some((r) => r.modality === 'status' && r.data === 'broken')) continue;
      out.push({ id: aid, artifactId: aid, memberIds: [aid], held: false });
    }
    for (const c of s.clusterCandidates) {
      if (!c.matches.length || c.matches[0].artifactId !== defId) continue;
      out.push({ id: 'cand:' + c.nodeIds.slice().sort().join('+'), artifactId: null, memberIds: c.nodeIds.slice(), held: true });
    }
    return out;
  }

  function boundsOfEntry(s, e) {
    const bs = e.memberIds.map((id) => MM.boundsOf(s.nodes.get(id))).filter(Boolean);
    return bs.length ? union(bs) : null;
  }

  function freshBody(s, defId, e) {
    const b = boundsOfEntry(s, e);
    if (!b) return null;
    const cx = (b.minX + b.maxX) / 2, cy = (b.minY + b.maxY) / 2;
    return {
      id: e.id, name: MM.wordOf(s.nodes.get(defId)) || defId,
      x: cx, y: cy, vx: 0, vy: 0, w: b.maxX - b.minX, h: b.maxY - b.minY,
      heading: 0, age: 0, origin: { x: cx, y: cy },
    };
  }

  /** A definition's tank at t = 0: fresh bodies, a fresh seeded stream. */
  function rebuildDef(s, defId) {
    const clock = s.clocks[defId] || { seed: 1 };
    const d = { t: 0, seed: clock.seed, rng: MM.seeded(clock.seed), bodies: new Map(), order: [] };
    for (const e of bodyEntriesOf(s, defId)) {
      const body = freshBody(s, defId, e);
      if (!body) continue;
      d.bodies.set(e.id, { entry: e, body: body, origin: body.origin, wallState: { contactSteps: 0 }, angle: 0 });
      d.order.push(e.id);
    }
    tank.defs.set(defId, d);
    return d;
  }

  /** Every body in every tank, as the plain bodies a behaviour may see. */
  function allBodies() {
    const out = [];
    for (const d of tank.defs.values()) for (const id of d.order) out.push(d.bodies.get(id).body);
    return out;
  }

  /** n fixed steps of one definition's tank. Bodies step in creation order; the stream is one per definition. */
  function stepTank(s, defId, n) {
    const d = tank.defs.get(defId) || rebuildDef(s, defId);
    const behaviour = behaviourOf(s, defId);
    for (let k = 0; k < n; k++) {
      const everyone = allBodies();
      for (const id of d.order) {
        const e = d.bodies.get(id);
        const others = everyone.filter((b) => b.id !== id);
        const world = MM.worldOf(e.body, others, [], d.t, FIXED_DT, d.rng);
        const r = MM.step(behaviour, world, e.wallState);
        e.body = r.body; e.wallState = r.wallState;
        const sp = Math.hypot(r.body.vx, r.body.vy);
        if (sp > (behaviour.speed || MM.DEFAULT_SPEED) * 0.2) e.angle = r.body.heading;
      }
      d.t += FIXED_DT;
    }
    refreshPlacements();
  }

  function refreshPlacements() {
    tank.place.clear();
    for (const d of tank.defs.values()) {
      for (const id of d.order) {
        const e = d.bodies.get(id);
        for (const nid of e.entry.memberIds) tank.place.set(nid, e);
      }
    }
  }

  /** Where render should draw a node: the offset its body has moved and the angle it has turned. */
  function bodyPlacement(nodeId) {
    const e = tank.place.get(nodeId);
    if (!e) return null;
    return { dx: e.body.x - e.origin.x, dy: e.body.y - e.origin.y, angle: e.angle, cx: e.origin.x, cy: e.origin.y };
  }

  function tankTime(defId) {
    const d = tank.defs.get(defId);
    return d ? d.t : 0;
  }
  function tankCount(s, defId) {
    const es = bodyEntriesOf(s, defId);
    return { total: es.length, held: es.filter((e) => e.held).length };
  }

  /** The last clock event for a definition, so a reset can be told from a pause. */
  function lastClockOp(defId) {
    const evs = session.getEvents();
    for (let i = evs.length - 1; i >= 0; i--) {
      const ev = evs[i];
      if (ev.type === 'clock' && ev.nodeId === defId) return ev.op;
    }
    return null;
  }

  /** Called from every render: keep the tanks true to the log, and run the loop while anything plays. */
  function syncTank(s) {
    const stamp = logStamp();
    const changed = stamp !== tank.logStamp;
    tank.logStamp = stamp;
    const wanted = new Set();
    for (const defId of Object.keys(s.clocks)) {
      if (!s.artifacts.includes(defId)) continue;
      // A live js artifact runs in the worker (13-kinds), not in a tank.
      const node = s.nodes.get(defId);
      if (node && codeRepOf(node)) continue;
      wanted.add(defId);
      const c = s.clocks[defId];
      const d = tank.defs.get(defId);
      if (!d) { rebuildDef(s, defId); continue; }
      if (d.seenAt !== c.at) {
        d.seenAt = c.at;
        const op = lastClockOp(defId);
        if (op === 'reset' || (op === 'seed' && d.seed !== c.seed)) { rebuildDef(s, defId).seenAt = c.at; continue; }
      }
      if (changed) {
        // The program changed under a running tank: re-derive it from t = 0
        // to the same t, so positions stay a function of the log.
        const t0 = d.t;
        const fresh = rebuildDef(s, defId);
        fresh.seenAt = c.at;
        stepTank(s, defId, Math.min(MAX_REDERIVE_STEPS, Math.round(t0 / FIXED_DT)));
      }
    }
    for (const defId of tank.defs.keys()) if (!wanted.has(defId)) tank.defs.delete(defId);
    refreshPlacements();
    const playing = [...wanted].some((id) => s.clocks[id].playing);
    if (playing && !tank.raf) { tank.last = performance.now(); tank.acc = 0; tank.raf = requestAnimationFrame(tankLoop); }
    if (!playing && tank.raf) { cancelAnimationFrame(tank.raf); tank.raf = 0; }
  }

  function tankLoop(now) {
    // `tank.raf` stays set through the body: the render below re-enters
    // syncTank, and a loop that looked stopped from there started a second
    // one and zeroed the accumulator — the tank ran at half speed.
    const s = session.getState();
    const playing = Object.keys(s.clocks).filter((id) => s.clocks[id].playing && tank.defs.has(id));
    if (!playing.length) { tank.raf = 0; return; }
    tank.acc += Math.min(MAX_FRAME_MS, now - tank.last);
    tank.last = now;
    let steps = 0;
    while (tank.acc >= FIXED_DT * 1000 && steps < MAX_STEPS_PER_FRAME) {
      for (const id of playing) stepTank(s, id, 1);
      tank.acc -= FIXED_DT * 1000;
      steps++;
    }
    if (steps) render(s);
    tank.raf = requestAnimationFrame(tankLoop);
  }
