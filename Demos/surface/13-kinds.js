// ===== kinds =====
// Provides: documentForKind (the renderers: every kind as a document ink can address), the worker runtime
//   (a blessed `js` artifact's code runs in a worker with a budget; a throw or a hang pauses its clock
//   with the reason), runtimeOffset, runtimeBroken, syncRuntime.
// Uses: core (session, esc), artifacts (frames, documentFor).
// A fragment of one closure: Demos/build-surface.mjs concatenates surface/*.js
// in name order inside `(function () { ... })();`. Shared state is the
// closure's; no imports, no exports, no build step beyond the concatenation.

  // ===== Renderers: a kind is a document with regions =====================
  // MVP's rule — the drawn boxes are the outlines of the divs — generalises:
  // every kind renders as something ink can address (ARCHITECTURE-v8 §6).
  // A page has regions; a script has functions; data has keys; prose has
  // headings; a vector has elements. All of them render into the same
  // same-origin, script-less iframe, carrying `data-region` on what ink
  // lands on, so `regionsUnderInk` reads a script exactly as it reads a page.
  const SOURCE_CSS =
    'html,body{margin:0;padding:0;background:#fbfaf7;color:#14140f;}' +
    '#mmroot{position:relative;overflow:auto;font:11px/1.45 "IBM Plex Mono",ui-monospace,Menlo,monospace;}' +
    '*{box-sizing:border-box;}' +
    '.src{margin:0;padding:6px 8px;white-space:pre-wrap;word-break:break-word;}' +
    '.rg{position:relative;padding:2px 6px 4px 6px;margin:0 0 2px 0;border-left:2px solid rgba(20,20,15,0.12);}' +
    '.rg:hover{background:rgba(201,168,76,0.08);}' +
    '.lb{display:block;font-size:9px;letter-spacing:0.06em;text-transform:uppercase;color:rgba(20,20,15,0.45);margin-bottom:1px;}' +
    '.gap{color:rgba(20,20,15,0.55);}' +
    'svg{max-width:100%;max-height:100%;display:block;margin:auto;}';

  /** The source with its top-level regions wrapped, so each is an element ink can land on. */
  function regionsDocument(source, regions, w, h) {
    const tops = regions.filter((r) => r.depth === 0).sort((a, b) => a.start - b.start);
    let html = '', at = 0;
    for (const r of tops) {
      if (r.start > at) html += '<span class="gap">' + esc(source.slice(at, r.start)) + '</span>';
      html += '<div class="rg" data-region="' + esc(r.id) + '"><span class="lb">' + esc(r.label) + '</span>' +
        esc(source.slice(r.start, r.end)) + '</div>';
      at = r.end;
    }
    if (at < source.length) html += '<span class="gap">' + esc(source.slice(at)) + '</span>';
    return '<!doctype html><html><head><meta charset="utf-8"><style>' + SOURCE_CSS +
      '#mmroot{width:' + Math.round(w) + 'px;height:' + Math.round(h) + 'px;}</style></head>' +
      '<body><div id="mmroot"><pre class="src">' + html + '</pre></div></body></html>';
  }

  /** An SVG with `data-region` stamped on each top-level element, in place. */
  function svgDocument(source, regions, w, h) {
    let out = source;
    const tops = regions.filter((r) => r.depth === 0).sort((a, b) => b.start - a.start);
    for (const r of tops) {
      // Just past the tag name: the first whitespace, '/', or '>' after '<name'.
      let i = r.start + 1;
      while (i < out.length && !/[\s\/>]/.test(out[i])) i++;
      out = out.slice(0, i) + ' data-region="' + esc(r.id) + '"' + out.slice(i);
    }
    return '<!doctype html><html><head><meta charset="utf-8"><style>' + SOURCE_CSS +
      '#mmroot{width:' + Math.round(w) + 'px;height:' + Math.round(h) + 'px;display:flex;align-items:center;justify-content:center;}</style></head>' +
      '<body><div id="mmroot">' + out + '</div></body></html>';
  }

  /** The document an artifact's newest code rep renders as, by its kind. */
  function documentForKind(rep, w, h) {
    const kind = rep.data.kind || 'html';
    const code = rep.data.code;
    if (kind === 'html') return documentFor(code, w, h);
    if (kind === 'png' || kind === 'jpg') {
      const url = rep.data.path ? imageUrlFor(rep.data.path) : null;
      return '<!doctype html><html><head><meta charset="utf-8"><style>' + SOURCE_CSS +
        '#mmroot{width:' + Math.round(w) + 'px;height:' + Math.round(h) + 'px;display:flex;align-items:center;justify-content:center;}img{max-width:100%;max-height:100%;}</style></head>' +
        '<body><div id="mmroot" data-region="picture">' + (url ? '<img src="' + esc(url) + '" alt="">' : '<span class="gap">' + esc(rep.data.path || 'a picture') + '</span>') + '</div></body></html>';
    }
    const regions = MM.addressablesOf(kind, code);
    if (kind === 'svg') return svgDocument(code, regions, w, h);
    return regionsDocument(code, regions, w, h);
  }

  // ===== The worker runtime: blessed code runs, with a budget ==============
  // I9: nothing runs unblessed. A `js` artifact's code is loaded into a worker
  // and stepped only while its clock is playing, and play is a hand's event
  // in the log. The worker is made from a string, so the standalone build
  // needs no second file; a step past its budget terminates the worker and
  // pauses the clock with the reason, and the board goes on drawing.
  const RUN_BUDGET_MS = 120;
  const RUN_DT = 1 / 60;
  const RUN_SPEED_CAP = 400; // world units per second, the cap `steer` uses

  const WORKER_SRC = [
    'const fns = new Map();',
    'function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}',
    'onmessage = (e) => {',
    '  const m = e.data;',
    '  if (m.type === "load") {',
    '    try { fns.set(m.id, new Function("world", m.code)); postMessage({ type: "loaded", id: m.id, at: m.at }); }',
    '    catch (err) { postMessage({ type: "broken", id: m.id, error: String(err && err.message || err) }); }',
    '  } else if (m.type === "step") {',
    '    const fn = fns.get(m.id);',
    '    if (!fn) { postMessage({ type: "broken", id: m.id, error: "not loaded" }); return; }',
    '    const w = m.world;',
    '    w.named = (n) => w.others.filter((o) => o.name === n);',
    '    w.rng = mulberry32(((m.seed >>> 0) * 1000003 + m.tick) >>> 0);',
    '    const t0 = performance.now();',
    '    try {',
    '      const out = fn(w) || {};',
    '      const fx = +out.fx || 0, fy = +out.fy || 0;',
    '      if (!isFinite(fx) || !isFinite(fy)) throw new Error("the force is not a number");',
    '      postMessage({ type: "force", id: m.id, tick: m.tick, fx, fy, ms: performance.now() - t0 });',
    '    } catch (err) { postMessage({ type: "broken", id: m.id, error: String(err && err.message || err) }); }',
    '  } else if (m.type === "unload") fns.delete(m.id);',
    '};',
  ].join('\n');

  const runtime = {
    worker: null,
    loaded: new Map(),   // artifactId -> code rep `at` the worker holds
    pending: new Map(),  // artifactId -> watchdog timer for the step in flight
    bodies: new Map(),   // artifactId -> { x, y, vx, vy, heading, age, tick } — offsets from the frame, runtime only
    broken: new Map(),   // artifactId -> error text
    seenClockAt: new Map(),
    raf: 0,
    tick: 0,
    log: [],             // the last messages in and out, for the panel and for tests
    waiters: new Map(),  // artifactId -> resolvers waiting for the step in flight to answer
  };
  function settle(id) {
    const ws = runtime.waiters.get(id) || [];
    runtime.waiters.delete(id);
    for (const w of ws) w();
  }
  function runtimeNote(dir, m) {
    runtime.log.push({ dir: dir, type: m.type, id: m.id, tick: m.tick, error: m.error, at: Math.round(performance.now()) });
    if (runtime.log.length > 40) runtime.log.shift();
  }

  function ensureWorker() {
    if (runtime.worker) return runtime.worker;
    const url = URL.createObjectURL(new Blob([WORKER_SRC], { type: 'text/javascript' }));
    const w = new Worker(url);
    w.onmessage = (e) => onWorkerMessage(e.data);
    w.onerror = (e) => { flash('runtime: ' + (e.message || 'error')); };
    runtime.worker = w;
    runtime.loaded.clear();
    return w;
  }

  /** Terminate and forget: after a hang, nothing in the old worker can be trusted. */
  function dropWorker() {
    if (runtime.worker) runtime.worker.terminate();
    runtime.worker = null;
    runtime.loaded.clear();
    for (const t of runtime.pending.values()) clearTimeout(t);
    runtime.pending.clear();
  }

  function markBroken(id, error) {
    runtime.broken.set(id, error);
    const t = runtime.pending.get(id);
    if (t) { clearTimeout(t); runtime.pending.delete(id); }
    settle(id);
    const s = session.getState();
    if (s.clocks[id] && s.clocks[id].playing) {
      session.clock({ nodeId: id, op: 'pause', reason: error, at: Date.now() });
    } else {
      render(session.getState());
    }
  }

  function onWorkerMessage(m) {
    runtimeNote('in', m);
    if (m.type === 'loaded') { runtime.loaded.set(m.id, m.at); return; }
    if (m.type === 'broken') { markBroken(m.id, 'threw: ' + m.error); return; }
    if (m.type !== 'force') return;
    const t = runtime.pending.get(m.id);
    if (t) { clearTimeout(t); runtime.pending.delete(m.id); }
    settle(m.id);
    const b = runtime.bodies.get(m.id);
    if (!b || b.tick !== m.tick) return; // a stale answer, from before a reset
    // Integrate: force to velocity, capped; velocity to position.
    b.vx += m.fx * RUN_DT; b.vy += m.fy * RUN_DT;
    const sp = Math.hypot(b.vx, b.vy);
    if (sp > RUN_SPEED_CAP) { b.vx *= RUN_SPEED_CAP / sp; b.vy *= RUN_SPEED_CAP / sp; }
    b.x += b.vx * RUN_DT; b.y += b.vy * RUN_DT;
    if (sp > 1e-6) b.heading = Math.atan2(b.vy, b.vx);
    b.age += RUN_DT;
    b.ms = m.ms;
    placeFrame(m.id);
  }

  /** The frame moved by its runtime body, straight to the DOM — no render pass for a tick. */
  function placeFrame(id) {
    const f = frames.get(id);
    const node = state.nodes.get(id);
    const fr = node && MM.frameOf(node);
    if (!f || !fr) return;
    const o = runtimeOffset(id);
    f.wrap.style.left = (fr.x + o.dx) + 'px';
    f.wrap.style.top = (fr.y + o.dy) + 'px';
  }

  function runtimeOffset(id) {
    const b = runtime.bodies.get(id);
    return b ? { dx: b.x, dy: b.y } : { dx: 0, dy: 0 };
  }
  function runtimeBroken(id) { return runtime.broken.get(id) || null; }

  function bodyOf(id, s) {
    const node = s.nodes.get(id);
    const fr = node && MM.frameOf(node);
    if (!fr) return null;
    const b = runtime.bodies.get(id) || { x: 0, y: 0, vx: 0, vy: 0, heading: 0, age: 0, tick: 0 };
    return {
      id: id, name: MM.wordOf(node) || id,
      x: fr.x + fr.w / 2 + b.x, y: fr.y + fr.h / 2 + b.y,
      vx: b.vx, vy: b.vy, w: fr.w, h: fr.h, heading: b.heading, age: b.age,
      origin: { x: fr.x + fr.w / 2, y: fr.y + fr.h / 2 },
    };
  }

  /** The playing `js` artifacts, each with code the worker holds. */
  function runnable(s) {
    const out = [];
    for (const id of s.live) {
      const c = s.clocks[id];
      if (!c || !c.playing) continue;
      const node = s.nodes.get(id);
      const rep = node && codeRepOf(node);
      if (!rep || (rep.data.kind || 'html') !== 'js') continue;
      const wired = wiredCodeOf(s, id);
      const code = wired !== null ? wired : rep.data.code;
      out.push({ id: id, rep: rep, code: code, key: rep.data.at + ':' + hashOf(code) });
    }
    return out;
  }

  /** Called from every render: load what should be loaded, honour resets, start or stop the loop. */
  function syncRuntime(s) {
    // A reset zeroes the body: the last clock event for the artifact says so.
    for (const id of Object.keys(s.clocks)) {
      const c = s.clocks[id];
      if (runtime.seenClockAt.get(id) === c.at) continue;
      runtime.seenClockAt.set(id, c.at);
      const evs = session.getEvents();
      for (let i = evs.length - 1; i >= 0; i--) {
        const ev = evs[i];
        if (ev.type === 'clock' && ev.nodeId === id) {
          if (ev.op === 'reset') { runtime.bodies.delete(id); placeFrame(id); }
          if (ev.op === 'play') runtime.broken.delete(id);
          break;
        }
      }
    }
    for (const id of runtime.bodies.keys()) if (!s.live.includes(id)) runtime.bodies.delete(id);
    const want = runnable(s);
    if (want.length === 0) {
      if (runtime.raf) { runtime.raf.cancel(); runtime.raf = 0; }
      return;
    }
    const w = ensureWorker();
    for (const r of want) {
      if (runtime.loaded.get(r.id) !== r.key && !runtime.pending.has(r.id)) {
        runtime.loaded.set(r.id, r.key); // in flight; a 'loaded' reply confirms
        w.postMessage({ type: 'load', id: r.id, code: r.code, at: r.key });
      }
    }
    if (!runtime.raf) runtime.raf = nextFrame(runLoop);
  }

  /** One step for one artifact: the world posted, the watchdog armed. Returns false when a step is already in flight. */
  function sendStep(s, r, bodies) {
    if (runtime.pending.has(r.id)) return false; // one step in flight per artifact
    const w = ensureWorker();
    if (runtime.loaded.get(r.id) !== r.key) {
      runtime.loaded.set(r.id, r.key);
      w.postMessage({ type: 'load', id: r.id, code: r.code, at: r.key });
    }
    if (!runtime.bodies.has(r.id)) runtime.bodies.set(r.id, { x: 0, y: 0, vx: 0, vy: 0, heading: 0, age: 0, tick: 0 });
    const me = bodies.get(r.id);
    if (!me) return false;
    const others = [...bodies.values()].filter((b) => b.id !== r.id);
    const body = runtime.bodies.get(r.id);
    runtime.tick++;
    body.tick = runtime.tick;
    const clock = s.clocks[r.id];
    runtimeNote('out', { type: 'step', id: r.id, tick: runtime.tick });
    w.postMessage({
      type: 'step', id: r.id, tick: runtime.tick, seed: clock ? clock.seed : 1,
      world: { t: body.age, dt: RUN_DT, me: me, others: others, walls: [] },
    });
    runtime.pending.set(r.id, setTimeout(() => {
      // Past its budget: the worker is gone, and so is everything it held.
      dropWorker();
      markBroken(r.id, 'took longer than its ' + RUN_BUDGET_MS + 'ms budget for one step');
    }, RUN_BUDGET_MS));
    return true;
  }

  function runLoop() {
    runtime.raf = 0;
    const s = session.getState();
    const want = runnable(s);
    if (want.length === 0) return;
    const bodies = new Map();
    for (const id of s.live) { const b = bodyOf(id, s); if (b) bodies.set(id, b); }
    for (const r of want) sendStep(s, r, bodies);
    runtime.raf = nextFrame(runLoop);
  }

  function settled(id) {
    return new Promise((resolve) => {
      if (!runtime.waiters.has(id)) runtime.waiters.set(id, []);
      runtime.waiters.get(id).push(resolve);
    });
  }

  /**
   * For tests: one step of one artifact, with the CURRENT code, resolved when
   * its answer lands or its budget runs out. A step already in flight is
   * waited out first, so the answer is this step's and not an earlier one's.
   */
  async function stepOnce(id) {
    if (runtime.pending.has(id)) await settled(id);
    const s = session.getState();
    const r = runnable(s).find((x) => x.id === id);
    if (!r) return false;
    const bodies = new Map();
    for (const lid of s.live) { const b = bodyOf(lid, s); if (b) bodies.set(lid, b); }
    const answered = settled(id);
    if (!sendStep(s, r, bodies)) { runtime.waiters.delete(id); return false; }
    await answered;
    return true;
  }
