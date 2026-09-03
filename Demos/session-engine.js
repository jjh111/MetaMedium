/* Built from Demos/surface/*.js by Demos/build-surface.mjs — do not edit; edit the fragments. */
(function () {
// ===== core =====
// Provides: the engine handle, URL params, the palette (instrument or paper), the session, DOM handles, the panel toggle, shared state (state, live, hoverId), esc().
// Uses: nothing — every other fragment reads from here.
// A fragment of one closure: Demos/build-surface.mjs concatenates surface/*.js
// in name order inside `(function () Ellipsis)();`. Shared state is the
// closure's; no imports, no exports, no build step beyond the concatenation.

  const MM = window.MetaMediumCore;

  // The page decides the look: ?theme=paper puts ink on the whitepaper's
  // ground, ?embed hides what a figure does not need, ?replay=<url> steps a
  // recorded session. The default is the instrument, for working in.
  const params = new URLSearchParams(location.search);
  const THEME = params.get('theme') === 'paper' ? 'paper' : 'instrument';
  const EMBED = params.has('embed');
  if (THEME === 'paper') document.body.classList.add('paper');
  if (EMBED) document.body.classList.add('embed');
  const C = THEME === 'paper'
    ? { ink: '#1a1a2e', inkFaint: 'rgba(26,26,46,0.16)', halo: 'rgba(248,246,241,0.75)', haloText: 'rgba(248,246,241,0.9)',
        agent: '#2f6f8f', gold: '#8a6d1f', goldRGB: '138,109,31', labelRGB: '90,90,110' }
    : { ink: '#e8e4d9', inkFaint: 'rgba(232,228,217,0.14)', halo: 'rgba(10,10,15,0.55)', haloText: 'rgba(10,10,15,0.7)',
        agent: '#8ab4c8', gold: '#c9a84c', goldRGB: '201,168,76', labelRGB: '160,152,128' };
  const session = MM.createSession();

  const canvas = document.getElementById('canvas');
  const ctx = canvas.getContext('2d');
  const stage = document.getElementById('stage');
  const summonEl = document.getElementById('summon');
  const statusEl = document.getElementById('status');
  const inspectorEl = document.getElementById('inspector');
  const PANEL_KEY = 'mm-panel';
  const panelToggle = document.getElementById('panelToggle');
  let panelOpen = (() => { try { const v = localStorage.getItem(PANEL_KEY); return v === null ? innerWidth > 820 : v === 'open'; } catch (err) { return true; } })();
  function syncPanel() {
    document.body.classList.toggle('panelHidden', !panelOpen);
    panelToggle.textContent = panelOpen ? 'details ▾' : 'details ▸';
    panelToggle.setAttribute('aria-expanded', String(panelOpen));
  }
  panelToggle.onclick = () => { panelOpen = !panelOpen; try { localStorage.setItem(PANEL_KEY, panelOpen ? 'open' : 'closed'); } catch (err) { /* private mode */ } syncPanel(); };
  syncPanel();

  let state = session.getState();
  let live = null;      // stroke under the pointer, in WORLD coordinates
  let hoverId = null;
  let lastPen = null;      // where the hand last let go, on screen — the palette blooms there   // inspected node (hover), else most recent

  const esc = (t) => String(t).replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

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
    // Fit into the area the chrome leaves FREE, not the whole window: the
    // inspector stands on the left and the replay bar along the bottom, and a
    // drawing centred on the window sat half under them in the whitepaper's
    // embeds. Each panel is measured only while it is shown.
    const free = { left: 0, top: 0, right: innerWidth, bottom: innerHeight };
    const shown = (el) => el && !el.hidden && getComputedStyle(el).display !== 'none' && el.getBoundingClientRect().width > 0;
    const insp = document.getElementById('inspector');
    if (shown(insp)) free.left = Math.max(free.left, insp.getBoundingClientRect().right);
    const rpBar = document.getElementById('replay');
    if (shown(rpBar)) free.bottom = Math.min(free.bottom, rpBar.getBoundingClientRect().top);
    const freeW = Math.max(1, free.right - free.left), freeH = Math.max(1, free.bottom - free.top);
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
  });

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

// ===== artifacts =====
// Provides: the live plane: frames of iframes for artifacts with code, syncStage, regionsUnderInk.
// Uses: core, view.
// A fragment of one closure: Demos/build-surface.mjs concatenates surface/*.js
// in name order inside `(function () Ellipsis)();`. Shared state is the
// closure's; no imports, no exports, no build step beyond the concatenation.

  // ===== The live plane: artifacts that render and run ====================
  // Generated code becomes real DOM in an iframe, positioned in world space
  // inside the shared transform. The ink canvas sits ON TOP of it, so the boxes
  // you drew stay visible as the outlines of what they produced (MVP.md §3.3).
  //
  // SANDBOX POSTURE, deliberate (MVP.md risk #5): `allow-same-origin` WITHOUT
  // `allow-scripts`. Same-origin is what lets ink hit-test into the artifact's
  // own DOM, which is the novel capability here. Granting both together is the
  // known sandbox escape, and running arbitrary generated JS is not needed to
  // prove the loop — so scripts stay off, and this is a choice to revisit
  // explicitly rather than a default that drifted.
  const frames = new Map(); // artifactId -> { wrap, iframe, codeAt }

  /** A cheap content hash, so a re-render happens exactly when the code changes. */
  function hashOf(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return (h >>> 0).toString(36) + ':' + str.length;
  }

  function codeRepOf(node) {
    for (let i = node.reps.length - 1; i >= 0; i--) {
      if (node.reps[i].modality === 'code') return node.reps[i];
    }
    return null;
  }

  function documentFor(code, w, h) {
    return '<!doctype html><html><head><meta charset="utf-8">' +
      '<style>' +
      'html,body{margin:0;padding:0;background:#fbfaf7;color:#14140f;' +
      "font-family:'Space Grotesk',system-ui,-apple-system,sans-serif;}" +
      '#mmroot{position:relative;width:' + Math.round(w) + 'px;height:' + Math.round(h) + 'px;overflow:hidden;}' +
      '*{box-sizing:border-box;}' +
      '</style></head><body><div id="mmroot">' + code + '</div></body></html>';
  }

  function syncStage(s) {
    // Drop frames for artifacts that are gone or erased.
    for (const [id, f] of frames) {
      if (!s.live.includes(id)) { f.wrap.remove(); frames.delete(id); }
    }
    // The live budget: the nearest N render; the rest stand as parked cards.
    const budget = liveSet(s);
    for (const id of s.live) {
      const node = s.nodes.get(id);
      const rep = node && codeRepOf(node);
      const fr = node && MM.frameOf(node);
      if (!rep || !fr) continue;

      let f = frames.get(id);
      const parked = !budget.has(id);
      if (f && f.parked !== parked) { f.wrap.remove(); frames.delete(id); f = null; }
      if (!f && parked) {
        const wrap = document.createElement('div');
        wrap.className = 'artifactFrame parked';
        const card = document.createElement('div');
        card.className = 'park';
        card.innerHTML = '<b>' + esc(MM.wordOf(node) || id) + '</b>' + esc((rep.data.kind || 'html') + (rep.data.path ? ' · ' + rep.data.path : '')) + '<br>parked — past the live budget; pan closer to run it';
        wrap.appendChild(card);
        stage.appendChild(wrap);
        f = { wrap: wrap, iframe: null, codeAt: 'parked', parked: true };
        frames.set(id, f);
      }
      if (!f) {
        const wrap = document.createElement('div');
        wrap.className = 'artifactFrame';
        const iframe = document.createElement('iframe');
        iframe.setAttribute('sandbox', 'allow-same-origin');
        iframe.setAttribute('scrolling', 'no');
        iframe.title = MM.wordOf(node) || id;
        wrap.appendChild(iframe);
        stage.appendChild(wrap);
        f = { wrap: wrap, iframe: iframe, codeAt: null, parked: false };
        frames.set(id, f);
      }
      // Where the drawing put it, plus where its own behaviour has taken it
      // (runtime only — never in the log).
      const o = runtimeOffset(id);
      f.wrap.style.left = (fr.x + o.dx) + 'px';
      f.wrap.style.top = (fr.y + o.dy) + 'px';
      f.wrap.style.width = fr.w + 'px';
      f.wrap.style.height = fr.h + 'px';
      f.wrap.classList.toggle('broken', !!runtimeBroken(id));
      f.wrap.classList.toggle('playing', !!(s.clocks[id] && s.clocks[id].playing));

      // What renders is the WIRED code when a frame feeds this member.
      const wired = wiredCodeOf(s, id);
      const code = wired !== null ? wired : rep.data.code;
      const stamp = rep.data.at + ':' + Math.round(fr.w) + 'x' + Math.round(fr.h) + ':' + hashOf(code);
      if (!f.parked && f.codeAt !== stamp) {
        f.codeAt = stamp;
        f.iframe.srcdoc = documentForKind({ data: { ...rep.data, code: code } }, fr.w, fr.h);
      }
    }
    syncRuntime(s);
  }

  /**
   * Which regions the ink actually lands on, read from the artifact's own DOM.
   *
   * This is "formal coordinate intersections with code aspects": the mark's
   * world bounds become artifact-local pixels, `elementFromPoint` resolves them
   * to real elements, and each element carries the `data-region` the generator
   * was required to emit. The engine's geometric answer is the fallback, so
   * addressing still works if the document is unreadable for any reason.
   */
  function regionsUnderInk(artifactId, bounds) {
    const f = frames.get(artifactId);
    const node = state.nodes.get(artifactId);
    const fr = node && MM.frameOf(node);
    const found = new Set();
    if (!f || !fr) return [];
    let doc = null;
    try { doc = f.iframe ? f.iframe.contentDocument : null; } catch (err) { doc = null; }
    if (!doc || !doc.elementFromPoint) return [];

    const N = 4;
    for (let i = 0; i <= N; i++) {
      for (let j = 0; j <= N; j++) {
        const x = bounds.minX + ((bounds.maxX - bounds.minX) * i) / N - fr.x;
        const y = bounds.minY + ((bounds.maxY - bounds.minY) * j) / N - fr.y;
        let el = null;
        try { el = doc.elementFromPoint(x, y); } catch (err) { el = null; }
        while (el && !(el.dataset && el.dataset.region)) el = el.parentElement;
        if (el && el.dataset.region) found.add(el.dataset.region);
      }
    }
    return [...found];
  }

// ===== teach =====
// Provides: teaching the command mark: the pad, samples, the held mark on this device, the rail chip; togglePanel/closePanel.
// Uses: core, view (render).
// A fragment of one closure: Demos/build-surface.mjs concatenates surface/*.js
// in name order inside `(function () Ellipsis)();`. Shared state is the
// closure's; no imports, no exports, no build step beyond the concatenation.

  // ===== Teaching the command mark ========================================
  // Five samples become a signature, through the same fingerprint machinery
  // that learns any shape you name. Taught in a dedicated pad rather than on
  // the canvas, so the canvas itself never enters a mode (MVP.md §5.2).
  const teachPanel = document.getElementById('teachPanel');
  const teachBtn = document.getElementById('teachBtn');
  const pad = document.getElementById('teachPad');
  const padCtx = pad.getContext('2d');
  const teachStatus = document.getElementById('teachStatus');
  const teachUse = document.getElementById('teachUse');
  const teachDots = [...document.querySelectorAll('#teachDots i')];
  let samples = [];
  let padStroke = null;
  // True while the pad shows the five a HELD mark learned from. Drawing on a
  // full pad then starts a fresh set rather than being ignored: a pad that
  // swallows strokes until you find Clear is a mode with extra steps.
  let samplesHeld = false;

  function sizePad() {
    const dpr = window.devicePixelRatio || 1;
    const r = pad.getBoundingClientRect();
    if (!r.width) return;
    pad.width = r.width * dpr; pad.height = r.height * dpr;
    padCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawPad();
  }

  function drawPad() {
    const r = pad.getBoundingClientRect();
    padCtx.clearRect(0, 0, r.width || pad.width, r.height || pad.height);
    padCtx.lineCap = 'round'; padCtx.lineJoin = 'round';
    // Earlier samples ghost behind, so you can see whether your hand is steady.
    samples.forEach((pts, i) => {
      padCtx.beginPath();
      pts.forEach((p, k) => (k ? padCtx.lineTo(p.x, p.y) : padCtx.moveTo(p.x, p.y)));
      padCtx.strokeStyle = 'rgba(201,168,76,' + (0.16 + 0.1 * i) + ')';
      padCtx.lineWidth = 2; padCtx.stroke();
    });
    if (padStroke) {
      padCtx.beginPath();
      padStroke.forEach((p, k) => (k ? padCtx.lineTo(p.x, p.y) : padCtx.moveTo(p.x, p.y)));
      padCtx.strokeStyle = C.ink; padCtx.lineWidth = 2; padCtx.stroke();
    }
    teachDots.forEach((d, i) => d.classList.toggle('on', i < samples.length));
  }

  pad.addEventListener('pointerdown', (e) => {
    capture(pad, e);
    if (samplesHeld || samples.length >= MM.COMMAND_MARK_SAMPLES) {
      samples = []; samplesHeld = false; teachUse.disabled = true;
      teachStatus.className = ''; teachStatus.textContent = '';
    }
    const r = pad.getBoundingClientRect();
    padStroke = [{ x: e.clientX - r.left, y: e.clientY - r.top }];
  });
  pad.addEventListener('pointermove', (e) => {
    if (!padStroke) return;
    const r = pad.getBoundingClientRect();
    padStroke.push({ x: e.clientX - r.left, y: e.clientY - r.top });
    drawPad();
  });
  function endPadStroke() {
    const pts = padStroke; padStroke = null;
    if (!pts) return;
    if (pts.length < 8) { drawPad(); return; }
    if (samples.length < MM.COMMAND_MARK_SAMPLES) samples.push(pts);
    drawPad();
    evaluateSamples();
  }
  pad.addEventListener('pointerup', endPadStroke);
  pad.addEventListener('pointercancel', endPadStroke);
  // A release that lands anywhere else — capture not taken, the pen lifted
  // off the pad — still ends the stroke. Otherwise the pad keeps drawing
  // wherever the pointer goes next, which is the "held pointer" that broke
  // the first use of the pad.
  addEventListener('pointerup', () => { if (padStroke) endPadStroke(); }, true);
  addEventListener('pointercancel', () => { if (padStroke) endPadStroke(); }, true);

  function evaluateSamples() {
    const need = MM.COMMAND_MARK_SAMPLES - samples.length;
    if (need > 0) {
      teachUse.disabled = true;
      teachStatus.className = '';
      teachStatus.textContent = need + ' more to go.';
      return;
    }
    let mark;
    try { mark = MM.learnCommandMark(samples, 'your mark'); }
    catch (err) { teachStatus.textContent = String(err.message || err); return; }

    // Rejection matters more than recognition: a mark that also fires while you
    // draw reads as broken, not eager. So the signature is tested against the
    // vocabulary the canvas already knows before it is offered.
    const drawn = state.contentIds
      .map((id) => MM.fingerprintOf(state.nodes.get(id)))
      .filter(Boolean);
    const collides = MM.collidesWith(mark, drawn);

    teachUse.disabled = false;
    if (collides) {
      teachStatus.className = 'warn';
      teachStatus.textContent =
        'Careful — this mark also matches something already on the canvas. It would fire while you draw.';
    } else if (mark.consistency < 0.35) {
      teachStatus.className = 'warn';
      teachStatus.textContent =
        'Those five were quite different from each other, so the band is wide and it may over-trigger. Clear and try again for a tighter mark.';
    } else {
      teachStatus.className = '';
      teachStatus.textContent =
        'Consistent (' + Math.round(mark.consistency * 100) + '%). Cross a circled group with this to summon.';
    }
    teachUse.dataset.ready = '1';
  }

  let taughtGlyph = null; // the sample we show in the rail once a mark is taught

  // The taught mark is HELD: on this device, across reloads. Teaching is a
  // session event (it replays with the log), and the device remembers it too,
  // so opening the canvas tomorrow finds your mark waiting rather than the
  // check. The five samples are kept with it, so the pad can show you what
  // it learned when you come back to it.
  const MARK_KEY = 'mm-command-mark';
  const teachHint = document.getElementById('teachHint');
  const teachForget = document.getElementById('teachForget');
  function savedMark() {
    try { return JSON.parse(localStorage.getItem(MARK_KEY) || 'null'); } catch (err) { return null; }
  }
  function rememberMark(mark, pts) {
    try { localStorage.setItem(MARK_KEY, JSON.stringify({ mark: mark, samples: pts, at: Date.now() })); } catch (err) { /* private mode */ }
  }
  function forgetMark() {
    try { localStorage.removeItem(MARK_KEY); } catch (err) { /* nothing to forget */ }
    session.teachCommandMark(null, Date.now());
    samples = []; samplesHeld = false; taughtGlyph = null;
    teachUse.disabled = true;
    drawPad();
    showPadState();
    render(session.getState());
  }
  function restoreMark() {
    const saved = savedMark();
    if (!saved || !saved.mark) return false;
    // The glyph before the event: teaching re-renders at once, and the rail
    // chip is drawn in that render — from whatever glyph is held at the time.
    samples = Array.isArray(saved.samples) ? saved.samples : [];
    samplesHeld = samples.length > 0;
    taughtGlyph = samples.length ? samples[samples.length - 1] : null;
    session.teachCommandMark(saved.mark, Date.now());
    return true;
  }

  // What the pane says depends on whether a mark is already held.
  function showPadState() {
    const held = !!session.getState().commandMark;
    teachForget.hidden = !held;
    if (held) {
      teachHint.innerHTML = 'This is <b>your mark</b> — the canvas watches for it instead of the check. ' +
        'To replace it, <b>Clear</b> and draw a new one five times. <b>Forget</b> goes back to ✓.';
      teachStatus.className = '';
      teachStatus.textContent = samples.length
        ? 'Held on this device. These are the five it learned from — draw here to start a new one.'
        : 'Held on this device.';
    } else {
      teachHint.innerHTML = 'The canvas watches for a <b>check ✓</b> until you replace it. Draw your own mark ' +
        '<b>five times</b>: it learns your hand\'s spread, so the sixth one it has never seen still counts. ' +
        'It will refuse a mark that looks like something you draw.';
      evaluateSamples();
    }
  }

  teachUse.onclick = () => {
    if (samples.length < MM.COMMAND_MARK_SAMPLES) return;
    const mark = MM.learnCommandMark(samples, 'your mark');
    taughtGlyph = samples[samples.length - 1];
    samplesHeld = true;
    session.teachCommandMark(mark, Date.now());
    rememberMark(mark, samples);
    showPadState();
    teachStatus.textContent = 'Learned, and held on this device. The check ✓ no longer summons — your mark does.';
    render(session.getState());
  };
  document.getElementById('teachClear').onclick = () => {
    samples = []; samplesHeld = false; teachUse.disabled = true; teachStatus.textContent = ''; drawPad();
    if (session.getState().commandMark) {
      teachStatus.textContent = 'Draw the new mark five times. Your held mark stays until you use the new one.';
    }
  };
  teachForget.onclick = forgetMark;
  document.getElementById('teachClose').onclick = () => closePanel(teachPanel, teachBtn);
  teachBtn.onclick = () => {
    togglePanel(teachPanel, teachBtn);
    if (!teachPanel.hasAttribute('hidden')) { sizePad(); showPadState(); }
  };
  document.getElementById('markChip').onclick = () => teachBtn.click();

  // The ACTIVE mark, echoed in the rail. Shown from the start, not only once you
  // have taught one — a gesture you cannot see is a gesture you have to be told
  // about, and the built-in check deserves the same visibility as yours.
  //
  // Driven from session state rather than from the teach button, so undoing the
  // teach event puts the check back in the rail. A chip that disagrees with the
  // grammar is worse than no chip.
  let shownMark = undefined, shownGlyph = undefined;
  function syncMarkChip(s) {
    const name = s.commandMark ? s.commandMark.name : 'check';
    const glyph = s.commandMark && taughtGlyph ? taughtGlyph : MM.canonicalCheckSamples()[0];
    if (shownMark === name && shownGlyph === glyph) return;
    shownMark = name; shownGlyph = glyph;
    drawMarkChip(glyph, name);
  }

  function drawMarkChip(pts, name) {
    const chip = document.getElementById('markChip');
    const g = document.getElementById('markGlyph');
    const gc = g.getContext('2d');
    const b = MM.getBounds(pts);
    const w = Math.max(1, b.maxX - b.minX), h = Math.max(1, b.maxY - b.minY);
    const k = Math.min((g.width - 6) / w, (g.height - 6) / h);
    gc.clearRect(0, 0, g.width, g.height);
    gc.beginPath();
    pts.forEach((p, i) => {
      const x = (p.x - b.minX) * k + 3, y = (p.y - b.minY) * k + 3;
      i ? gc.lineTo(x, y) : gc.moveTo(x, y);
    });
    gc.strokeStyle = C.gold; gc.lineWidth = 1.6; gc.lineCap = 'round'; gc.stroke();
    document.getElementById('markName').textContent = name || 'your mark';
    chip.hidden = false;
  }

  function togglePanel(el, btn) {
    const open = el.hasAttribute('hidden');
    if (open) el.removeAttribute('hidden'); else el.setAttribute('hidden', '');
    btn.setAttribute('aria-pressed', String(open));
  }
  function closePanel(el, btn) {
    el.setAttribute('hidden', ''); btn.setAttribute('aria-pressed', 'false');
  }

// ===== models =====
// Provides: the model pane: probing local servers, joining by key, remembering the pick, offerModel, askModels/cancelReading.
// Uses: core, teach (togglePanel), render, palette (refreshPalette).
// A fragment of one closure: Demos/build-surface.mjs concatenates surface/*.js
// in name order inside `(function () Ellipsis)();`. Shared state is the
// closure's; no imports, no exports, no build step beyond the concatenation.

  // ===== Model participants (Tier 1–2) ====================================
  // A model joins through the SAME channel a human uses — session.join() then
  // session.propose(). Every reading it offers is held as an attributed,
  // unblessed edge beside Tier 0's, never instead of it.
  //
  // The picker, following what the site's search bar learned the hard way:
  //   - BOTH local servers are probed, in parallel. Returning on the first one
  //     that answered meant a running LM Studio hid Ollama entirely.
  //   - Embedding-only models are hidden AND explained. An Ollama holding only
  //     nomic-embed-text used to show nothing and say nothing.
  //   - The pick is remembered as a PREFERENCE: honoured when that server still
  //     offers that model, quietly ignored otherwise. A remembered pointer at
  //     something no longer running is worse than no memory at all.
  const modelBtn = document.getElementById('modelBtn');
  const panel = document.getElementById('modelPanel');
  const mpProvider = document.getElementById('mpProvider');
  const mpEndpoint = document.getElementById('mpEndpoint');
  const mpModel = document.getElementById('mpModel');
  const mpKey = document.getElementById('mpKey');
  const mpRememberKey = document.getElementById('mpRememberKey');
  const mpStatus = document.getElementById('mpStatus');
  const mpList = document.getElementById('mpList');
  const mpLocal = document.getElementById('mpLocal');

  const PICK_KEY = 'mm-model-pick';
  const KEY_KEY = 'mm-model-key';
  const DEFAULT_MODEL = { openRouter: 'anthropic/claude-opus-5', anthropic: 'claude-opus-5', custom: '' };
  const agents = [];       // AgentParticipant[] — several models can coexist
  let localServers = [];   // [{ source, host, baseUrl, models, skipped }]

  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (err) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (err) { /* private mode */ } },
    del(k) { try { localStorage.removeItem(k); } catch (err) { /* nothing */ } },
  };

  function syncProviderFields() {
    const p = mpProvider.value;
    mpEndpoint.hidden = p !== 'custom';
    mpModel.placeholder = DEFAULT_MODEL[p] || 'model id';
    mpKey.placeholder = p === 'custom' ? 'API key (if the endpoint needs one)' : 'API key';
  }
  mpProvider.onchange = syncProviderFields;
  syncProviderFields();

  // --- Local servers, both at once ---
  async function probeLocal() {
    // Each server says what its models can do; the pane only relays it. A
    // model that can SEE is the one that gets asked to read handwriting —
    // Ollama lists `vision` among capabilities, LM Studio types the model `vlm`.
    const probes = [
      { source: 'Ollama', preset: 'ollama', list: ['http://localhost:11434/api/tags'],
        pick: (d) => (d.models || []).map((m) => ({ name: m.name,
          chat: !(m.capabilities && m.capabilities.length && !m.capabilities.includes('completion')) && !/embed/i.test(m.name),
          vision: !!(m.capabilities && m.capabilities.includes('vision')) })) },
      { source: 'LM Studio', preset: 'lmStudio', list: ['http://localhost:1234/api/v0/models', 'http://localhost:1234/v1/models'],
        pick: (d) => (d.data || []).map((m) => ({ name: m.id, chat: !/embed/i.test(m.id) && m.type !== 'embeddings',
          vision: m.type === 'vlm' })) },
    ];
    const settled = await Promise.allSettled(probes.map(async (pr) => {
      let all = null, err = null;
      for (const url of pr.list) {
        try {
          const res = await fetch(url, { signal: AbortSignal.timeout(2500) });
          if (!res.ok) { err = new Error('HTTP ' + res.status); continue; }
          all = pr.pick(await res.json());
          break;
        } catch (e) { err = e; }
      }
      if (!all) throw err || new Error('no answer');
      return {
        source: pr.source, preset: pr.preset, baseUrl: MM.PRESETS[pr.preset].baseUrl,
        host: MM.PRESETS[pr.preset].baseUrl.replace(/^https?:\/\//, '').replace(/\/v1$/, ''),
        models: all.filter((m) => m.chat).map((m) => m.name).sort(),
        vision: all.filter((m) => m.chat && m.vision).map((m) => m.name),
        skipped: all.filter((m) => !m.chat).map((m) => m.name),
      };
    }));
    localServers = settled.filter((r) => r.status === 'fulfilled').map((r) => r.value);
    renderLocal();
    return localServers;
  }

  const isJoined = (baseUrl, model) => agents.some((a) => a.config.baseUrl === baseUrl && a.config.model === model);

  function renderLocal() {
    if (!localServers.length) {
      mpLocal.innerHTML = '<div class="note">No local server answered on :11434 or :1234. ' +
        'Start Ollama or LM Studio, then Detect.</div>';
      return;
    }
    let html = '';
    for (const sv of localServers) {
      html += '<div class="server"><b>' + esc(sv.source) + '</b><span>' + esc(sv.host) + '</span></div>';
      for (const m of sv.models) {
        const on = isJoined(sv.baseUrl, m);
        html += '<button class="model' + (on ? ' on' : '') + '" data-base="' + esc(sv.baseUrl) + '" data-model="' + esc(m) + '">' +
          '<span>' + esc(m) + '</span><span class="why">' + (on ? 'joined' : 'tier 1' + (sv.vision.includes(m) ? ' · sees' : '') + ' · tap to join') + '</span></button>';
      }
      if (!sv.models.length && sv.skipped.length) {
        html += '<div class="note">only embedding models here — they cannot chat</div>';
      } else if (sv.skipped.length) {
        html += '<div class="note">' + sv.skipped.length + ' embedding model' + (sv.skipped.length === 1 ? '' : 's') + ' hidden</div>';
      }
    }
    mpLocal.innerHTML = html;
    mpLocal.querySelectorAll('.model').forEach((btn) => {
      btn.onclick = () => {
        const sv = localServers.find((x) => x.baseUrl === btn.dataset.base);
        join(Object.assign({}, MM.PRESETS[sv.preset], { model: btn.dataset.model, vision: sv.vision.includes(btn.dataset.model) }), { provider: sv.preset });
      };
    });
  }

  // --- Joining, and remembering ---
  function join(config, pick) {
    if (isJoined(config.baseUrl, config.model)) {
      mpStatus.textContent = config.model + ' is already here.';
      return null;
    }
    // Several models may run in the same tier — that is the point.
    const agent = MM.createAgentParticipant(session, config, Date.now());
    agents.push(agent);
    if (pick) store.set(PICK_KEY, Object.assign({ baseUrl: config.baseUrl, model: config.model, kind: config.kind }, pick));
    mpStatus.textContent = agent.name + ' joined (tier ' + MM.providerTier(config) + '). It reads what you summon' +
      (config.vision ? ', reads your writing,' : '') + ' and builds what you describe.';
    readWriting(session.getState());
    renderAgents();
    renderLocal();
    render(session.getState());
    return agent;
  }

  function leave(agent) {
    const i = agents.indexOf(agent);
    if (i >= 0) agents.splice(i, 1);
    // The session keeps the join in its history; it simply stops being asked.
    const pick = store.get(PICK_KEY);
    if (pick && pick.baseUrl === agent.config.baseUrl && pick.model === agent.config.model) { store.del(PICK_KEY); store.del(KEY_KEY); }
    mpStatus.textContent = agent.name + ' left.';
    renderAgents();
    renderLocal();
    render(session.getState());
  }

  function renderAgents() {
    mpList.innerHTML = agents.map((a, i) =>
      '<div class="mpItem"><span>' + esc(a.name) + '</span>' +
      '<span class="t">tier ' + MM.providerTier(a.config) + (a.config.vision ? ' · sees' : '') + '</span>' +
      '<button class="ghost" data-leave="' + i + '">leave</button></div>'
    ).join('');
    mpList.querySelectorAll('[data-leave]').forEach((b) => { b.onclick = () => leave(agents[Number(b.dataset.leave)]); });
  }

  document.getElementById('mpAdd').onclick = () => {
    const p = mpProvider.value;
    const model = (mpModel.value || DEFAULT_MODEL[p] || '').trim();
    const key = mpKey.value.trim();
    if (!model) { mpStatus.textContent = 'Which model? Type its id.'; return; }
    // Hosted servers do not say what a model can do; the id is the only clue.
    const vision = /claude|gpt-4o|gpt-5|gemini|qwen3\.5|qwen.*vl|vision|pixtral|llava/i.test(model);
    let config;
    if (p === 'custom') {
      const base = mpEndpoint.value.trim().replace(/\/+$/, '');
      if (!base) { mpStatus.textContent = 'Where is it? Enter the endpoint, e.g. http://localhost:8080/v1'; return; }
      config = { kind: 'openai-compatible', baseUrl: /\/v1$/.test(base) ? base : base + '/v1', model: model };
    } else {
      if (!key) { mpStatus.textContent = p + ' needs a key.'; return; }
      config = Object.assign({}, MM.PRESETS[p], { model: model });
    }
    if (key) config.apiKey = key;
    const agent = join(config, { provider: p, endpoint: p === 'custom' ? config.baseUrl : undefined });
    if (!agent) return;
    // The key is remembered only when asked, and only on this device.
    if (key && mpRememberKey.checked) store.set(KEY_KEY, key); else store.del(KEY_KEY);
    mpKey.value = '';
  };

  // --- Coming back: the remembered pick rejoins if it can ---
  async function rejoinRemembered() {
    const pick = store.get(PICK_KEY);
    if (!pick) return;
    if (MM.providerTier({ baseUrl: pick.baseUrl }) === 1) {
      const servers = await probeLocal();
      const sv = servers.find((x) => x.baseUrl === pick.baseUrl);
      if (sv && sv.models.includes(pick.model)) join(Object.assign({}, MM.PRESETS[sv.preset], { model: pick.model, vision: sv.vision.includes(pick.model) }), null);
      else mpStatus.textContent = 'Remembered ' + pick.model + ', but ' + pick.baseUrl + ' is not offering it right now.';
      return;
    }
    const key = store.get(KEY_KEY);
    const config = pick.provider === 'custom'
      ? { kind: 'openai-compatible', baseUrl: pick.baseUrl, model: pick.model }
      : Object.assign({}, MM.PRESETS[pick.provider] || { kind: pick.kind, baseUrl: pick.baseUrl }, { model: pick.model });
    if (key) { config.apiKey = key; join(config, null); return; }
    if (pick.provider !== 'custom') {
      mpProvider.value = pick.provider; syncProviderFields(); mpModel.value = pick.model;
      mpStatus.textContent = 'Remembered ' + pick.model + ' — enter its key to rejoin.';
    } else {
      mpProvider.value = 'custom'; syncProviderFields(); mpEndpoint.value = pick.baseUrl; mpModel.value = pick.model;
      join(config, null);
    }
  }

  document.getElementById('mpDetect').onclick = () => { mpStatus.textContent = 'looking…'; probeLocal().then((s) => { mpStatus.textContent = s.length ? '' : 'Nothing answered.'; }); };
  modelBtn.onclick = () => {
    togglePanel(panel, modelBtn);
    if (!panel.hasAttribute('hidden')) probeLocal();
  };
  document.getElementById('mpClose').onclick = () => closePanel(panel, modelBtn);

  /** Open the models pane because something needed one — says why. */
  // ===== Work in progress: a model is thinking, and the board says so =====
  // Every call to a model is registered here while it runs, with the marks it
  // is about, so the canvas can show the thinking NEAR what it is thinking
  // about — not only in a pane the hand may have closed. A call that ends,
  // succeeds or fails, leaves the list.
  const working = new Map(); // key -> { ids, label, since }
  let workingPulse = 0;
  function beginWork(key, ids, label) {
    working.set(key, { ids: (ids || []).slice(), label: label, since: performance.now() });
    if (!workingPulse) workingPulse = setInterval(() => { if (working.size) render(session.getState()); else { clearInterval(workingPulse); workingPulse = 0; } }, 400);
    render(session.getState());
    return key;
  }
  function endWork(key) {
    working.delete(key);
    render(session.getState());
  }
  /** Run a model call with the thinking shown; the promise is passed through untouched. */
  function withWork(key, ids, label, promise) {
    beginWork(key, ids, label);
    return promise.finally(() => endWork(key));
  }
  function workingSummary() {
    return [...working.values()].map((w) => w.label).join(' · ');
  }

  function offerModel(why) {
    if (panel.hasAttribute('hidden')) togglePanel(panel, modelBtn);
    probeLocal();
    mpStatus.textContent = why || 'That needs a model. Tap one to join it.';
  }

  // When a group is summoned, ask EVERY model at once. They answer in parallel
  // and each proposal lands independently — no escalation, no waiting for a
  // cheaper tier to fail first.
  //
  // A reading is worth having, but it is NOT worth making the human wait for.
  // A local server answers one request at a time, so an unasked-for
  // interpretation sits in front of whatever they type next — 35 seconds of a
  // model describing a drawing they were about to replace. So it is cancellable,
  // and committing to a prompt cancels it.
  let lastAskedSummon = null;
  let reading = null; // AbortController for interpretations in flight

  function cancelReading(why) {
    if (!reading) return;
    reading.abort();
    reading = null;
    if (why) mpStatus.textContent = why;
  }

  function askModels(s) {
    if (!s.summon || agents.length === 0) return;
    if (s.summon.id === lastAskedSummon) return;
    lastAskedSummon = s.summon.id;
    if (s.summon.enclosedIds.length === 0) return; // nothing to read (ink on a page)

    cancelReading();
    const ctl = new AbortController();
    reading = ctl;
    const ids = s.summon.enclosedIds.slice();
    mpStatus.textContent = 'reading with ' + agents.length + ' model(s)…';
    let left = agents.length;
    agents.forEach((agent) => {
      withWork('read:' + agent.id + ':' + ids.join('+'), ids, agent.name + ' is reading the group…', agent.interpret(ids, Date.now(), ctl.signal)).then((res) => {
        if (ctl.signal.aborted) return;
        if (--left === 0 && reading === ctl) reading = null;
        mpStatus.textContent = res.ok
          ? agent.name + ': ' + res.readings.map((r) => r.label).join(', ')
          : agent.name + ' unavailable (' + res.error + ') — tier 0 still holds.';
        render(session.getState());
        refreshPalette();
      });
    });
  }

// ===== selection =====
// Provides: the selection as a thing on the canvas — a soft outline with
//   handles around what a loop became; hit tests (handleAt); the drag preview
//   the input applies while a hand moves, scales or rotates; renderSelection.
// Uses: core (state, session), view (wpx, worldToScreen), render (union), input (drag).
// A fragment of one closure: Demos/build-surface.mjs concatenates surface/*.js
// in name order inside `(function () { ... })();`. Shared state is the
// closure's; no imports, no exports, no build step beyond the concatenation.

  // The selection is the lasso that finished. The loop dissolves as ink and in
  // its place is an outline the hand can take hold of: drag inside to move,
  // a corner to scale, the knob above to turn. None of it is a mode — the
  // next stroke elsewhere dissolves it, a tap dismisses it (and is never a
  // dot), and undoing the dismissal brings it back where it was.
  let drag = null; // { ids, mode: 'move'|'scale'|'rotate', start, last, about, moved }

  function selectionBounds(s) {
    const ids = (s || state).selection.filter((id) => (s || state).nodes.get(id) && MM.boundsOf((s || state).nodes.get(id)));
    if (!ids.length) return null;
    return union(ids.map((id) => MM.boundsOf((s || state).nodes.get(id))));
  }

  /** The drag's current transform, as a preview the renderer applies before the log has it. */
  function dragPreview() {
    if (!drag || !drag.moved) return null;
    const dx = drag.last.x - drag.start.x, dy = drag.last.y - drag.start.y;
    if (drag.mode === 'move') return { ids: drag.ids, kind: 'move', dx, dy };
    if (drag.mode === 'scale') {
      const b = drag.bounds;
      const sx = Math.max(0.05, (drag.corner.x + dx - drag.about.x) / (drag.corner.x - drag.about.x || 1e-6));
      const sy = Math.max(0.05, (drag.corner.y + dy - drag.about.y) / (drag.corner.y - drag.about.y || 1e-6));
      return { ids: drag.ids, kind: 'scale', about: drag.about, sx: b ? sx : 1, sy: b ? sy : 1 };
    }
    const a0 = Math.atan2(drag.start.y - drag.about.y, drag.start.x - drag.about.x);
    const a1 = Math.atan2(drag.last.y - drag.about.y, drag.last.x - drag.about.x);
    return { ids: drag.ids, kind: 'rotate', about: drag.about, radians: a1 - a0 };
  }

  /** Apply the preview to the canvas transform for one mark's drawing. */
  function applyPreview(pv) {
    if (pv.kind === 'move') ctx.translate(pv.dx, pv.dy);
    else if (pv.kind === 'scale') { ctx.translate(pv.about.x, pv.about.y); ctx.scale(pv.sx, pv.sy); ctx.translate(-pv.about.x, -pv.about.y); }
    else { ctx.translate(pv.about.x, pv.about.y); ctx.rotate(pv.radians); ctx.translate(-pv.about.x, -pv.about.y); }
  }

  const HANDLE = () => wpx(7);
  function handles(b) {
    const pad = wpx(10);
    const o = { minX: b.minX - pad, maxX: b.maxX + pad, minY: b.minY - pad, maxY: b.maxY + pad };
    return {
      outline: o,
      corners: { nw: { x: o.minX, y: o.minY }, ne: { x: o.maxX, y: o.minY }, sw: { x: o.minX, y: o.maxY }, se: { x: o.maxX, y: o.maxY } },
      knob: { x: (o.minX + o.maxX) / 2, y: o.minY - wpx(26) },
    };
  }

  /** What is under a world point, as far as the selection is concerned. */
  function handleAt(w) {
    const b = selectionBounds();
    if (!b) return null;
    const h = handles(b), r = HANDLE() * 1.6;
    for (const k of Object.keys(h.corners)) {
      const c = h.corners[k];
      if (Math.hypot(w.x - c.x, w.y - c.y) <= r) return { kind: 'scale', corner: k, at: c, bounds: b };
    }
    if (Math.hypot(w.x - h.knob.x, w.y - h.knob.y) <= r) return { kind: 'rotate', bounds: b };
    const o = h.outline;
    if (w.x >= o.minX && w.x <= o.maxX && w.y >= o.minY && w.y <= o.maxY) return { kind: 'move', bounds: b };
    return null;
  }

  function beginDrag(hit, w) {
    const b = hit.bounds;
    const centre = { x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 };
    const opposite = hit.kind === 'scale'
      ? { x: hit.corner.includes('w') ? b.maxX : b.minX, y: hit.corner.includes('n') ? b.maxY : b.minY }
      : centre;
    drag = { ids: state.selection.slice(), mode: hit.kind, start: w, last: w, moved: false, about: opposite, corner: hit.at || null, bounds: b };
    canvas.style.cursor = hit.kind === 'move' ? 'grabbing' : hit.kind === 'scale' ? 'nwse-resize' : 'grab';
  }

  function updateDrag(w) {
    if (!drag) return;
    drag.last = w;
    if (!drag.moved && Math.hypot(w.x - drag.start.x, w.y - drag.start.y) > wpx(3)) drag.moved = true;
    render(state);
  }

  /** One event for the whole drag, so undo is one step. */
  function endDrag() {
    if (!drag) return;
    const pv = dragPreview();
    const ids = drag.ids;
    drag = null;
    canvas.style.cursor = 'crosshair';
    if (!pv) { render(state); return; }
    const at = Date.now();
    if (pv.kind === 'move') session.move({ ids, dx: pv.dx, dy: pv.dy, at });
    else if (pv.kind === 'scale') session.scale({ ids, about: pv.about, sx: pv.sx, sy: pv.sy, at });
    else session.rotate({ ids, about: pv.about, radians: pv.radians, at });
  }

  function renderSelection(s) {
    const b0 = selectionBounds(s);
    if (!b0) return;
    ctx.save();
    const pv = dragPreview();
    if (pv) applyPreview(pv);
    const h = handles(b0), o = h.outline;
    ctx.setLineDash([wpx(5), wpx(5)]);
    ctx.strokeStyle = `rgba(${C.goldRGB},0.75)`;
    ctx.lineWidth = wpx(1.2);
    roundRect(o.minX, o.minY, o.maxX - o.minX, o.maxY - o.minY, wpx(6));
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = C.gold;
    const hs = HANDLE();
    for (const k of Object.keys(h.corners)) { const c = h.corners[k]; ctx.fillRect(c.x - hs / 2, c.y - hs / 2, hs, hs); }
    ctx.beginPath(); ctx.moveTo(h.knob.x, o.minY); ctx.lineTo(h.knob.x, h.knob.y); ctx.strokeStyle = `rgba(${C.goldRGB},0.6)`; ctx.lineWidth = wpx(1); ctx.stroke();
    ctx.beginPath(); ctx.arc(h.knob.x, h.knob.y, hs * 0.7, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
  }

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

// ===== handwriting =====
// Provides: handwriting: inkImage, isWriting, readOne, readWriting.
// Uses: core, models (agents), render.
// A fragment of one closure: Demos/build-surface.mjs concatenates surface/*.js
// in name order inside `(function () Ellipsis)();`. Shared state is the
// closure's; no imports, no exports, no build step beyond the concatenation.

  // ===== Handwriting: the one thing sent as pixels =========================
  //
  // A mark that reads as writing is rendered on its own — dark ink on a light
  // ground, nothing else on the board — and handed to every model that can
  // SEE, once. What comes back is held on the mark as transcripts, attributed
  // and ranked, never blessed (v7 Stage E). A model that cannot see is never
  // asked; with none present the mark simply stays "text".
  const seeing = () => agents.filter((a) => a.config.vision);
  const askedToRead = new Set(); // node ids handed out already (per model join, see below)

  function inkImage(node, size) {
    // A word is several strokes; a cursive word is one. Same image either way.
    const runs = MM.isWord(node)
      ? MM.lettersOf(node).map((id) => state.nodes.get(id)).filter(Boolean).map((n) => MM.strokePointsOf(n)).filter((p) => p && p.length > 1)
      : [MM.strokePointsOf(node)].filter((p) => p && p.length > 1);
    if (!runs.length) return null;
    const pts = runs.flat();
    const b = MM.getBounds(pts);
    const w = Math.max(1, b.maxX - b.minX), h = Math.max(1, b.maxY - b.minY);
    const S = size || 320, pad = 16;
    const k = Math.min((S - pad * 2) / w, (S / 2 - pad * 2) / h);
    const cw = Math.round(w * k + pad * 2), ch = Math.round(h * k + pad * 2);
    const off = document.createElement('canvas');
    off.width = cw; off.height = ch;
    const c = off.getContext('2d');
    c.fillStyle = '#fff'; c.fillRect(0, 0, cw, ch);
    c.strokeStyle = '#111'; c.lineWidth = Math.max(2, 3 * k); c.lineCap = 'round'; c.lineJoin = 'round';
    for (const run of runs) {
      c.beginPath();
      run.forEach((p, i) => { const x = pad + (p.x - b.minX) * k, y = pad + (p.y - b.minY) * k; i ? c.lineTo(x, y) : c.moveTo(x, y); });
      c.stroke();
    }
    return off.toDataURL('image/png');
  }

  function isWriting(node) {
    const shape = MM.interpretationsOf(node, state.nodes).filter((r) => r.tier === 0)[0];
    return !!shape && shape.label === 'text';
  }

  function readOne(node, force) {
    const readers = seeing();
    if (!readers.length) return false;
    const key = node.id;
    if (!force && askedToRead.has(key)) return false;
    askedToRead.add(key);
    const image = inkImage(node);
    if (!image) return false;
    mpStatus.textContent = 'reading the writing with ' + readers.map((a) => a.name).join(', ') + '…';
    readers.forEach((agent) => {
      withWork('write:' + agent.id + ':' + node.id, [node.id], agent.name + ' is reading the writing…', agent.read({ nodeId: node.id, image: image, at: Date.now() })).then((res) => {
        mpStatus.textContent = res.ok
          ? agent.name + ' read “' + res.transcripts[0].text + '”' + (res.transcripts.length > 1 ? ' (or ' + res.transcripts.slice(1).map((t) => '“' + t.text + '”').join(', ') + ')' : '')
          : agent.name + ' could not read it (' + res.error + ').';
        if (!res.ok && res.raw) window.__mm.lastRaw = res.raw;
        render(session.getState());
      });
    });
    return true;
  }

  function readWriting(s) {
    if (!seeing().length) return;
    const ids = s.contentIds.filter((id) => !s.artifacts.includes(id));
    for (const aid of s.artifacts) for (const e of s.nodes.get(aid).edges) if (e.rel === 'has-part') ids.push(e.to);
    for (const id of ids) {
      const node = s.nodes.get(id);
      if (!node || s.pendingLassoId === id || MM.transcriptOf(node) || !(MM.strokePointsOf(node) || MM.isWord(node))) continue;
      if (isWriting(node)) readOne(node, false);
    }
  }

// ===== input =====
// Provides: pointer input (draw, pan, pinch), keys, flash().
// Uses: core, view, snap (autoSweep), render.
// A fragment of one closure: Demos/build-surface.mjs concatenates surface/*.js
// in name order inside `(function () Ellipsis)();`. Shared state is the
// closure's; no imports, no exports, no build step beyond the concatenation.

  // ===== Input: strokes in, nothing gated, no modes ========================
  // Pointer events belong to the ink layer. You are ALWAYS drawing; panning is
  // the deliberate act (space, middle button, or alt), never the default. That
  // is what makes "doodle on top of the running page" work at all.
  let panning = null;
  let spaceHeld = false;

  // Pointer capture is a nicety — it keeps a stroke alive when the pointer
  // leaves the element. It is NOT allowed to be the reason a stroke fails to
  // start, so its failure is swallowed rather than thrown into the draw loop.
  function capture(el, e) {
    try { el.setPointerCapture(e.pointerId); } catch (err) { /* not capturable */ }
  }

  const touches = new Map(); // pointerId → {x, y}, for two-finger pinch
  let pinch = null;          // { dist, mid, zoom } at the moment the second finger landed

  canvas.addEventListener('pointerdown', (e) => {
    capture(canvas, e);
    if (e.pointerType === 'touch') {
      touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (touches.size === 2) {
        // Two fingers: this is a pinch, not a stroke. Drop the live ink — it
        // was the first finger landing, not a mark.
        live = null;
        const [a, b] = [...touches.values()];
        pinch = { dist: Math.hypot(a.x - b.x, a.y - b.y), mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, zoom: view.zoom };
        return;
      }
    }
    if (e.button === 1 || e.altKey || spaceHeld) {
      panning = { x: e.clientX, y: e.clientY };
      canvas.style.cursor = 'grabbing';
      return;
    }
    // A hand landing on the selection takes hold of it rather than drawing.
    const w0 = screenToWorld(e.clientX, e.clientY);
    // A hand on a control's knob slides it: no selection needed, one move when it lets go.
    if (knobBegin(w0)) return;
    const hit = state.selection.length ? handleAt(w0) : null;
    // A hand on a body in a running tank is acting it out, not moving ink.
    if (hit && hit.kind === 'move' && demoBegin(state.selection, w0)) return;
    if (hit) { beginDrag(hit, w0); return; }
    live = [w0];
  });

  canvas.addEventListener('pointermove', (e) => {
    if (e.pointerType === 'touch' && touches.has(e.pointerId)) {
      touches.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch && touches.size === 2) {
        const [a, b] = [...touches.values()];
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        const target = clampZoom(pinch.zoom * (dist / Math.max(1, pinch.dist)));
        zoomAround(pinch.mid.x, pinch.mid.y, target / view.zoom);
        view.panX += mid.x - pinch.mid.x;
        view.panY += mid.y - pinch.mid.y;
        pinch.mid = mid;
        afterViewChange();
        return;
      }
    }
    if (knobMove(screenToWorld(e.clientX, e.clientY))) return;
    if (demoMove(screenToWorld(e.clientX, e.clientY))) return;
    if (drag) { updateDrag(screenToWorld(e.clientX, e.clientY)); return; }
    if (panning) {
      view.panX += e.clientX - panning.x;
      view.panY += e.clientY - panning.y;
      panning = { x: e.clientX, y: e.clientY };
      afterViewChange();
      return;
    }
    if (!live) {
      const w = screenToWorld(e.clientX, e.clientY);
      const over = nodeAt(w.x, w.y);
      if (over !== hoverId) { hoverId = over; render(state); }
      return;
    }
    live.push(screenToWorld(e.clientX, e.clientY));
    render(state); // live ink
  });

  const endTouch = (e) => {
    if (e.pointerType !== 'touch') return false;
    touches.delete(e.pointerId);
    if (touches.size < 2) pinch = null;
    return touches.size > 0; // a finger is still down: nothing to commit yet
  };
  canvas.addEventListener('pointercancel', (e) => { endTouch(e); live = null; });

  canvas.addEventListener('pointerup', (e) => {
    if (endTouch(e)) { live = null; return; }
    if (panning) { panning = null; canvas.style.cursor = 'crosshair'; return; }
    if (knobEnd()) return;
    if (demoEnd()) return;
    if (drag) { endDrag(); return; }
    lastPen = { x: e.clientX, y: e.clientY };
    const points = live;
    live = null;
    // The dead state: a tap while something is dismissable is the dismissal,
    // and never a dot. Only a tap on empty ground with nothing to dismiss
    // could be a dot — and a bare tap is not one either; a dot is drawn.
    const tiny = points && points.length < 3;
    if (tiny) {
      const s0 = session.getState();
      if (s0.summon) session.dismiss(s0.summon.id, Date.now());
      else if (s0.selection.length) session.deselect(Date.now());
      render(session.getState());
      return;
    }

    // Clear hover *before* the engine notifies: the render it triggers must
    // report the mark just made, not whatever the cursor was resting on.
    hoverId = null;
    // Points are world coordinates; the scale says how big the hand's pixel was
    // when they were drawn. Position belongs in world space, the hand does not —
    // without this, the same check reads as a closed loop at 1.7x zoom.
    const id = session.addStroke(points, Date.now(), undefined, 1 / view.zoom);

    // Say what happened when a stroke rubbed something out — a silent erase is
    // indistinguishable from a bug. Read it from the stroke's own gesture rep,
    // NOT from a drop in the content count: a lasso resolved by a command mark
    // also leaves the content plane, and reporting that as "erased" would be a
    // lie about the one operation the user most needs to trust.
    const after = session.getState();
    const made = after.nodes.get(id);
    const g = made && MM.getRep(made, 'gesture');
    // Auto: take every open offer the moment it is made — this stroke, and any
    // earlier closed stroke that was a loop-in-waiting until this one settled
    // it. Never the held loop itself; that is a gesture until the next mark
    // says otherwise.
    if (!g) autoSweep();
    if (g && g.data && g.data.role === 'scratch') {
      const n = (g.data.erased || []).length;
      flash('erased ' + n + ' mark' + (n === 1 ? '' : 's'));
    } else if (after.markMiss && after.markMiss.nearMiss) {
      // Only when the stroke was recognisably an ATTEMPT. A gesture that fails
      // silently cannot be learned — the user cannot tell whether they drew it
      // wrong, waited too long, or made it too big. Saying nothing about marks
      // that were plainly just drawing keeps this from becoming nagging.
      flash('no summon — ' + after.markMiss.detail);
    }
  });

  canvas.addEventListener('pointerleave', () => { hoverId = null; render(state); });
  // A release the canvas never sees — capture refused, a dialog, a second
  // pointer — must still end whatever the hand was doing, or the next move
  // keeps drawing with no button down.
  addEventListener('pointerup', (e) => {
    if (e.target === canvas) return;
    if (knobEnd() || demoEnd()) return;
    if (drag) { endDrag(); return; }
    if (panning) { panning = null; canvas.style.cursor = 'crosshair'; return; }
    if (live) { live = null; render(state); }
  }, true);

  addEventListener('keydown', (e) => {
    if (e.code === 'Space' && !spaceHeld && e.target === document.body) {
      spaceHeld = true; canvas.style.cursor = 'grab'; e.preventDefault();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); session.undo(); }
    if (e.target === document.body && e.key === 'Escape' && state.selection.length && !state.summon) session.deselect(Date.now());
    if (e.target === document.body && (e.key === 'Backspace' || e.key === 'Delete') && state.selection.length) {
      e.preventDefault();
      const ids = state.selection.slice();
      ids.forEach((id) => session.erase(id, Date.now()));
      flash('erased ' + ids.length + ' mark' + (ids.length === 1 ? '' : 's'));
    }
    if (e.key === '0' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); fitAll(); }
    if (e.target === document.body && (e.key === '=' || e.key === '+')) zoomAround(innerWidth / 2, innerHeight / 2, 1.2);
    if (e.target === document.body && (e.key === '-' || e.key === '_')) zoomAround(innerWidth / 2, innerHeight / 2, 1 / 1.2);
  });
  addEventListener('keyup', (e) => {
    if (e.code === 'Space') { spaceHeld = false; canvas.style.cursor = 'crosshair'; }
  });

  // A slider is a term's weight; one event when the hand lets go, so undo is one step.
  inspectorEl.addEventListener('change', (e) => {
    const r = e.target;
    if (!r || r.type !== 'range' || !r.dataset.term) return;
    const id = r.dataset.id;
    const n = state.nodes.get(id);
    const b = n && MM.blessedBehaviourOf(n);
    if (!b) return;
    const terms = b.terms.map((t, i) => (i === Number(r.dataset.term) ? { ...t, weight: Number(r.value) } : t));
    session.behave({ nodeId: id, behaviour: { terms: terms, source: 'hand', speed: b.speed }, participantId: MM.LOCAL_PARTICIPANT, at: Date.now() });
  });
  document.getElementById('undoBtn').onclick = () => session.undo();
  inspectorEl.addEventListener('click', (e) => {
    const b = e.target.closest && e.target.closest('button[data-act]');
    if (!b) return;
    const id = b.getAttribute('data-id');
    const act = b.getAttribute('data-act');
    if (act === 'snap') snapAll([id]);
    else if (act === 'read') { const n = state.nodes.get(id); if (n && !readOne(n, true)) offerModel('Reading writing needs a model that can see.'); }
    else if (act === 'split') session.splitWord(id, Date.now());
    else if (act === 'clock-play') session.clock({ nodeId: id, op: 'play', at: Date.now() });
    else if (act === 'clock-pause') session.clock({ nodeId: id, op: 'pause', at: Date.now() });
    else if (act === 'clock-reset') session.clock({ nodeId: id, op: 'reset', at: Date.now() });
    else if (act === 'behave-use') {
      // A held behaviour, given in the human's name: that is the bless.
      const n = state.nodes.get(id);
      const rep = n && MM.behavioursOf(n)[Number(b.getAttribute('data-index'))];
      if (rep) session.behave({ nodeId: id, behaviour: { terms: rep.data.terms, source: rep.data.source, speed: rep.data.speed }, participantId: MM.LOCAL_PARTICIPANT, at: Date.now() });
    }
    else if (act === 'edit-text') beginTextEdit(id);
    else if (act === 'export-code') {
      const n = state.nodes.get(id);
      const rep = n && codeRepOf(n);
      if (rep) {
        const kind = rep.data.kind || 'html';
        const wired = wiredCodeOf(state, id);
        const ext = kind === 'text' ? 'txt' : kind;
        downloadText((MM.wordOf(n) || id).replace(/[^A-Za-z0-9._-]+/g, '-') + '.' + ext, wired !== null ? wired : rep.data.code, MM.rowOf(kind).mime);
      }
    }
    else if (act === 'behave-drop') session.behave({ nodeId: id, behaviour: { terms: [{ verb: 'wander', weight: 1 }, { verb: 'hold', weight: 0.35 }], source: 'hand' }, participantId: MM.LOCAL_PARTICIPANT, at: Date.now() });
    else session.snap({ ids: [id], mode: 'raw', at: Date.now() });
  });
  // Reset is a fresh board: what browser storage held goes too, or the reload would bring it back.
  document.getElementById('resetBtn').onclick = () => { forgetLocalLog(); location.reload(); };

  // A transient line in the status bar. It must re-render IMMEDIATELY: the
  // render triggered by the stroke itself has already happened by the time we
  // know what the stroke did, so without this the message is set and never
  // shown, and an erase looks silent.
  let flashText = null, flashAt = 0, flashTimer = null;
  const FLASH_MS = 1600;
  function flash(msg) {
    flashText = msg;
    flashAt = Date.now();
    render(session.getState());
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => { flashText = null; render(session.getState()); }, FLASH_MS);
  }

// ===== render =====
// Provides: queries over state, the rungs cache, render(), ink, labels, explanations.
// Uses: core, view, artifacts, snap, models, handwriting, palette, inspector, teach (syncMarkChip).
// A fragment of one closure: Demos/build-surface.mjs concatenates surface/*.js
// in name order inside `(function () Ellipsis)();`. Shared state is the
// closure's; no imports, no exports, no build step beyond the concatenation.

  // ===== Queries over engine state ========================================
  const authorOf = (node) => {
    const e = node.edges.find((x) => x.rel === 'made-by');
    return e ? e.to : MM.LOCAL_PARTICIPANT;
  };
  const isAgentNode = (node) => authorOf(node) !== MM.LOCAL_PARTICIPANT;
  const nameOfParticipant = (pid) =>
    pid === MM.LOCAL_PARTICIPANT ? 'you' : (MM.wordOf(state.nodes.get(pid)) || pid);

  function nodeAt(x, y) {
    const slack = wpx(8);
    for (let i = state.contentIds.length - 1; i >= 0; i--) {
      const b = MM.boundsOf(state.nodes.get(state.contentIds[i]));
      if (b && x >= b.minX - slack && x <= b.maxX + slack &&
               y >= b.minY - slack && y <= b.maxY + slack) {
        return state.contentIds[i];
      }
    }
    return null;
  }

  const union = (list) => list.reduce((a, b) => ({
    minX: Math.min(a.minX, b.minX), maxX: Math.max(a.maxX, b.maxX),
    minY: Math.min(a.minY, b.minY), maxY: Math.max(a.maxY, b.maxY),
  }));

  function lastContentId(s) {
    return s.contentIds.length ? s.contentIds[s.contentIds.length - 1] : null;
  }

  // ===== The rungs, read once per frame ====================================
  // Shape → role → genre for everything on the board, from session.read().
  // Labels under marks, the inspector's ladder and the palette all read from
  // the same reading, so they cannot disagree with each other. Cached on the
  // set of ids, because hover re-renders and relate() is O(n²).
  let rungs = { key: null, roles: new Map(), genre: null, reading: null };
  function readRungs(s) {
    const ids = s.contentIds.filter((id) => !s.artifacts.includes(id));
    // Members of artifacts keep their roles — a box inside a live page is
    // still a node, and the ladder should say so.
    for (const aid of s.artifacts) {
      for (const e of s.nodes.get(aid).edges) if (e.rel === 'has-part') ids.push(e.to);
    }
    const key = ids.join('|');
    if (rungs.key === key) return rungs;
    const reading = ids.length
      ? session.read(ids)
      : { roles: [], genre: { genre: 'empty', reasoning: 'nothing drawn yet' }, concepts: [], relations: [] };
    rungs = { key, roles: new Map(reading.roles.map((r) => [r.id, r])), genre: reading.genre, reading };
    return rungs;
  }

  // ===== Rendering: ink is ground truth ===================================
  function path(points, closed) {
    ctx.beginPath();
    points.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
    if (closed) ctx.closePath();
  }
  function inkStroke(points, closed, style) {
    path(points, closed);
    // A dark halo under every mark. On the ground it is invisible; over a
    // live artifact it is the difference between ink you can see and ink that
    // disappears into whatever colour the model happened to choose. One rule,
    // no special case for "is this stroke over a page".
    ctx.strokeStyle = C.halo;
    ctx.lineWidth = style.width + wpx(2.5);
    ctx.stroke();
    ctx.strokeStyle = style.color;
    ctx.lineWidth = style.width;
    ctx.stroke();
  }

  function inkOf(node, style) {
    const points = MM.strokePointsOf(node);
    if (points) {
      const clean = MM.cleanPointsOf(node);
      if (clean) {
        // Snapped: the clean form in front, the hand's ink faint beneath it.
        // What was drawn is still there — that is the whole promise.
        path(points, false);
        ctx.strokeStyle = C.inkFaint;
        ctx.lineWidth = Math.max(1, style.width * 0.7);
        ctx.stroke();
        inkStroke(clean, MM.cleanOf(node).closed, style);
        return;
      }
      inkStroke(points, false, style);
      // The offer: a ghost of what this mark would be, drawn clean. Dashed and
      // faint so it reads as a question, not a change already made.
      const offer = snapOffers.get(node.id);
      if (offer && !style.gesture) {
        const ideal = idealOf(node, offer.shape);
        if (ideal) {
          // The ghost follows the ink: same placement (transform, rotation).
          path(MM.placed(node, ideal.points), ideal.closed);
          ctx.setLineDash([wpx(3), wpx(4)]);
          ctx.strokeStyle = `rgba(${C.goldRGB},0.7)`;
          ctx.lineWidth = wpx(1.2);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }
      return;
    }
    for (const e of node.edges) { // artifact: draw its members (transparent within)
      if (e.rel !== 'has-part') continue;
      const m = state.nodes.get(e.to);
      if (m && !m.reps.some((r) => r.modality === 'erased')) inkOf(m, style);
    }
  }

  function render(s) {
    state = s;
    askModels(s);
    readWriting(s);
    syncStage(s);
    refreshOffers();

    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, innerWidth, innerHeight);
    // World space from here down. Ink scales with the drawing; chrome that must
    // stay legible uses wpx() to hold a constant size on screen.
    ctx.setTransform(dpr * view.zoom, 0, 0, dpr * view.zoom, dpr * view.panX, dpr * view.panY);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    // Ink thins as you zoom out; hold a visible floor so a wide board still reads.
    const inkW = Math.max(2, wpx(1.3));

    for (const c of s.clusterCandidates) {
      const b0 = union(c.nodeIds.map((id) => MM.boundsOf(s.nodes.get(id))));
      const cp = bodyPlacement(c.nodeIds[0]);
      const b = cp ? { minX: b0.minX + cp.dx, maxX: b0.maxX + cp.dx, minY: b0.minY + cp.dy, maxY: b0.maxY + cp.dy } : b0;
      const pad = wpx(14);
      ctx.setLineDash([wpx(4), wpx(6)]);
      ctx.strokeStyle = `rgba(${C.goldRGB},0.38)`;
      ctx.lineWidth = wpx(1);
      ctx.strokeRect(b.minX - pad, b.minY - pad, b.maxX - b.minX + pad * 2, b.maxY - b.minY + pad * 2);
      ctx.setLineDash([]);
      // Plural, like every reading: two definitions with the same shapes are both named.
      text(c.matches.map((m) => m.name).join(' or ') + '?  circle + mark to confirm', b.minX - wpx(12), b.minY - wpx(20), `rgba(${C.goldRGB},0.72)`);
    }

    const inspectedId = hoverId || lastContentId(s);

    for (const id of s.contentIds) {
      const node = s.nodes.get(id);
      const isArtifact = s.artifacts.includes(id);
      const isLive = s.live.includes(id);
      const pending = s.pendingLassoId === id;
      // A closed stroke around marks is plain ink until the mark takes it: nothing
      // lights up on its own. The command mark is what makes it a selection.
      const color = isAgentNode(node) ? C.agent : C.ink;

      // A live artifact keeps its ink: the boxes you drew ARE the outlines of
      // what got built, and that promise is only kept by drawing them on top.
      // While a hand holds the selection, the held marks follow it before the
      // log has the move — one event lands when the hand lets go.
      const pv = dragPreview();
      const held = pv && pv.ids.includes(id);
      if (held) { ctx.save(); applyPreview(pv); }
      // A body in a running tank is drawn where its behaviour has taken it:
      // the DRAWING moves, translated and turned, never a sprite in its place.
      const pl = bodyPlacement(id);
      if (pl) { ctx.save(); ctx.translate(pl.cx + pl.dx, pl.cy + pl.dy); ctx.rotate(pl.angle); ctx.translate(-pl.cx, -pl.cy); }
      inkOf(node, {
        color: isLive ? `rgba(${C.goldRGB},0.85)` : color,
        width: id === inspectedId ? inkW * 1.3 : inkW,
      });
      if (pl) ctx.restore();
      if (held) ctx.restore();

      const b0 = MM.boundsOf(node);
      const b = b0 && pl ? { minX: b0.minX + pl.dx, maxX: b0.maxX + pl.dx, minY: b0.minY + pl.dy, maxY: b0.maxY + pl.dy } : b0;
      if (isArtifact && b) {
        brackets(b, isLive ? C.gold : `rgba(${C.goldRGB},0.7)`);
        text((MM.wordOf(node) || '') + (isLive ? '  ·  live' : ''), b.minX, b.minY - wpx(10), C.gold);
      } else if (b && !pending) {
        // Two rungs at a glance: what it is, and what it plays.
        // What it IS: the blessed name, the words it says, or the shape rung's
        // reading. A model's reading of the GROUP this mark is in lands on the
        // mark too, and it belongs in the panel and the palette, not under a
        // circle as if the circle were "network-node-connections".
        const said = MM.transcriptOf(node);
        const shape = MM.interpretationsOf(node, s.nodes).filter((r) => r.tier === 0)[0];
        const top = MM.wordOf(node) || (said ? '“' + said + '”' : shape ? shape.label : MM.topInterpretation(node));
        const role = readRungs(s).roles.get(id);
        const played = role && role.role !== 'unclassified' && role.role !== top ? ' · ' + role.role : '';
        if (top) text(top + played, b.minX, b.maxY + wpx(15),
          id === inspectedId ? `rgba(${C.labelRGB},0.95)` : `rgba(${C.labelRGB},0.5)`);
      }
    }

    if (s.summon) {
      for (const gid of s.summon.gestureIds) {
        const g = s.nodes.get(gid);
        const role = (MM.getRep(g, 'gesture') || {}).data;
        // The loop and the mark that took it dissolved into the selection: the
        // command has become the outline and its handles, and showing the
        // stroke that was the command on top of them says two things at once.
        if (s.selection.length && role && (role.role === 'lasso' || role.role === 'command' || role.role === 'check')) continue;
        inkOf(g, { color: `rgba(${C.goldRGB},0.55)`, width: inkW * 1.5, gesture: true });
      }
    }

    if (live) {
      ctx.beginPath();
      live.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)));
      ctx.strokeStyle = C.ink;
      ctx.lineWidth = inkW;
      ctx.stroke();
    }

    renderFrames(s);
    renderWorking(s);
    if (editing) placeEditor(editing.bounds);
    renderExplanations(s);
    renderSelection(s);
    syncTank(s);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // back to screen space for the chrome
    syncMarkChip(s);
    renderSummon(s);
    renderHeld(s);
    renderInspector(s, inspectedId);

    const strokes = s.contentIds.length - s.artifacts.length;
    const fresh = flashText && Date.now() - flashAt < FLASH_MS;
    const parts = [strokes + ' loose'];
    if (s.artifacts.length) {
      const running = liveSet(s).size;
      parts.push(s.artifacts.length + ' artifact' + (s.artifacts.length === 1 ? '' : 's') + (s.live.length ? ' (' + (running < s.live.length ? running + ' of ' + s.live.length + ' live, the rest parked' : s.live.length + ' live') + ')' : ''));
    }
    const fs = folderStatus();
    if (fs) parts.push(fs);
    const ws = workingSummary();
    if (ws) parts.push('⋯ ' + ws);
    if (agents.length) parts.push(agents.map((a) => a.config.model).join(', '));
    if (snapOffers.size) parts.push(snapOffers.size + ' read clean');
    if (s.pendingLassoId) parts.push('cross the loop with ' + (s.commandMark ? 'your mark' : '✓') + ' to select what it holds');
    if (fresh) parts.push(flashText);
    statusEl.textContent = parts.join('  ·  ');
  }

  /** A model at work: a breathing dot and its words, above the marks it is working on. */
  function renderWorking(s) {
    if (!working.size) return;
    const t = performance.now() / 1000;
    for (const w of working.values()) {
      // The marks may have been undone while the model was still thinking.
      const boxes = w.ids.map((id) => s.nodes.get(id)).filter(Boolean).map((n) => MM.boundsOf(n)).filter(Boolean);
      let x, y;
      if (boxes.length) { const b = union(boxes); x = b.minX; y = b.minY - wpx(28); }
      else { const c = screenToWorld(innerWidth / 2, 70); x = c.x; y = c.y; }
      const r = wpx(4 + 2 * Math.sin(t * 4));
      ctx.beginPath(); ctx.arc(x + wpx(5), y - wpx(4), r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${C.goldRGB},0.85)`; ctx.fill();
      text(w.label, x + wpx(16), y, C.gold);
    }
  }

  function text(str, x, y, color) {
    ctx.font = wpx(11).toFixed(2) + "px 'Space Grotesk', system-ui, sans-serif";
    ctx.lineWidth = wpx(3);
    ctx.strokeStyle = C.haloText;
    ctx.strokeText(str, x, y);
    ctx.fillStyle = color;
    ctx.fillText(str, x, y);
  }

  function brackets(b, color) {
    const L = wpx(12), p = wpx(9);
    ctx.strokeStyle = color;
    ctx.lineWidth = wpx(1.5);
    const corners = [
      [b.minX - p, b.minY - p, L, 0, 0, L], [b.maxX + p, b.minY - p, -L, 0, 0, L],
      [b.minX - p, b.maxY + p, L, 0, 0, -L], [b.maxX + p, b.maxY + p, -L, 0, 0, -L],
    ];
    for (const [x, y, dx1, dy1, dx2, dy2] of corners) {
      ctx.beginPath();
      ctx.moveTo(x + dx1, y + dy1); ctx.lineTo(x, y); ctx.lineTo(x + dx2, y + dy2);
      ctx.stroke();
    }
  }

  // ===== Explanations: answers live IN the canvas ==========================
  /**
   * The world rectangle a canvas object can occupy and still be READ — the
   * viewport minus the chrome that floats over it. Fitting to the raw viewport
   * is not enough: an answer card placed at the right edge lands underneath the
   * inspector, which is the one place it is guaranteed to be unreadable.
   */
  function viewportWorld() {
    const rail = document.querySelector('.rail');
    const insp = document.getElementById('inspector');
    const railH = rail ? rail.getBoundingClientRect().height : 0;
    const inspRect = insp && insp.offsetParent !== null ? insp.getBoundingClientRect() : null;
    const right = inspRect ? Math.min(innerWidth, inspRect.left) - 16 : innerWidth - 8;
    const a = screenToWorld(8, railH + 8);
    const b = screenToWorld(Math.max(120, right), innerHeight - 46);
    return { minX: a.x, minY: a.y, maxX: b.x, maxY: b.y };
  }

  function renderExplanations(s) {
    if (!s.explanations.length) return;
    const vw = viewportWorld();
    const stacked = new Map(); // subject key -> how many answers already drawn

    for (const id of s.explanations) {
      const node = s.nodes.get(id);
      if (!node || MM.getRep(node, 'erased')) continue;
      const data = MM.explanationOf(node);
      const b = MM.boundsOf(node);
      if (!data || !b) continue;

      const about = MM.aboutIdsOf(node);
      const key = about.join(',');
      const slot = stacked.get(key) || 0;

      const pad = 9, w = b.maxX - b.minX;
      ctx.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
      const lines = wrapText(data.text, w - pad * 2);
      const madeBy = node.edges.find((e) => e.rel === 'made-by');
      const who = (madeBy && MM.wordOf(s.nodes.get(madeBy.to))) || 'agent';
      const headH = 15, lineH = 15;
      const h = pad * 2 + headH + lines.length * lineH;

      // Core anchors the answer beside its subject; only the surface knows the
      // viewport, so fitting it on screen is the surface's job. Stack later
      // answers below earlier ones rather than overlapping them.
      let x = b.minX, y = b.minY + slot * (h + 10);
      const subjectBounds = about
        .map((a) => (s.nodes.get(a) ? MM.boundsOf(s.nodes.get(a)) : null))
        .filter(Boolean);
      const subject = subjectBounds.length ? union(subjectBounds) : null;
      // No room to the right of the subject — tuck the card under it instead.
      if (x + w > vw.maxX && subject) {
        x = Math.min(subject.minX, vw.maxX - w);
        y = subject.maxY + wpx(16) + slot * (h + 10);
      }
      x = Math.max(vw.minX, Math.min(x, vw.maxX - w));
      y = Math.max(vw.minY, Math.min(y, vw.maxY - h));
      stacked.set(key, slot + 1);

      if (subject) {
        ctx.beginPath();
        ctx.moveTo(subject.maxX, (subject.minY + subject.maxY) / 2);
        ctx.lineTo(x, y + h / 2);
        ctx.strokeStyle = 'rgba(138,180,200,0.32)';
        ctx.lineWidth = wpx(1);
        ctx.setLineDash([wpx(3), wpx(4)]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      ctx.fillStyle = 'rgba(10,10,15,0.86)';
      ctx.strokeStyle = 'rgba(138,180,200,0.38)';
      ctx.lineWidth = wpx(1);
      roundRect(x, y, w, h, 6);
      ctx.fill();
      ctx.stroke();

      ctx.fillStyle = 'rgba(138,180,200,0.85)';
      ctx.font = '10px ui-monospace, SFMono-Regular, Menlo, monospace';
      ctx.fillText(who, x + pad, y + pad + 8);

      ctx.fillStyle = C.ink;
      ctx.font = '11px ui-monospace, SFMono-Regular, Menlo, monospace';
      lines.forEach((ln, i) => ctx.fillText(ln, x + pad, y + pad + headH + 8 + i * lineH));
    }
  }

  function wrapText(text, maxWidth) {
    const words = String(text).split(/\s+/);
    const lines = [];
    let line = '';
    for (const word of words) {
      const next = line ? line + ' ' + word : word;
      if (ctx.measureText(next).width > maxWidth && line) { lines.push(line); line = word; }
      else line = next;
    }
    if (line) lines.push(line);
    return lines.slice(0, 6);
  }

  function roundRect(x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  }

// ===== palette =====
// Provides: the command palette: conversions, painting, prompts (build/revise/ask/draw).
// Uses: core, models, snap, render, artifacts.
// A fragment of one closure: Demos/build-surface.mjs concatenates surface/*.js
// in name order inside `(function () Ellipsis)();`. Shared state is the
// closure's; no imports, no exports, no build step beyond the concatenation.

  // ===== The command palette ==============================================
  //
  // What the marks could BECOME, offered as one list. The order is the argument:
  // conversions the engine can do by itself come first, because they are instant
  // and work with nothing attached, and the ones that need a model come after,
  // marked. A canvas whose every offer is "ask a model" is a chat box with a
  // drawing area; a canvas that can tidy your boxes before anything is
  // configured is a tool.
  //
  // Concepts come from `session.read()` — Tier 0 relations (insideness,
  // nearness, alignment, peerhood) matched against the concept library. The
  // palette never decides what the marks mean; it renders what the engine read.
  let shownSummonId = null;
  let paletteItems = [];
  let paletteIndex = 0;

  function conversionsFor(s) {
    const sum = s.summon;
    const reading = session.read(sum.enclosedIds);
    const items = [];

    for (const concept of reading.concepts) {
      for (const conv of concept.conversions) {
        // The same conversion can be offered by two concepts; keep the stronger.
        const seen = items.find((i) => i.key === concept.concept + ':' + conv.id);
        if (seen) continue;
        items.push({
          key: concept.concept + ':' + conv.id,
          group: concept.concept,
          groupConf: concept.confidence,
          groupWhy: concept.reasoning,
          label: conv.label,
          why: conv.hint || '',
          tier: conv.tier,
          run: () => runConversion(sum, conv, concept),
        });
      }
    }

    // The engine's own offers: an artifact this matches, and the plain ways out.
    for (const sug of sum.suggestions) {
      if (sug.kind === 'match') {
        // The refusal sits beside the offer: a match the engine will not stop
        // making is a mode, and the correction is what teaches it (WP-12).
        items.push({
          key: 'not:' + sug.id, group: 'always', groupConf: 0, groupWhy: '',
          label: 'Not a ' + sug.label, why: 'remembered — a group like this is not offered as one again', tier: 0,
          run: () => {
            session.correct({ ids: sum.enclosedIds.slice(), definitionId: sug.artifactId, verdict: 'is-not', at: Date.now() });
            refreshPalette(); // the summon stays open; the refused offer is gone from it
          },
        });
        items.unshift({
          key: 'sug:' + sug.id, group: 'known', groupConf: sug.score || 1,
          groupWhy: 'you have named this shape before',
          label: 'It’s a ' + sug.label, why: sug.reasoning || 'hold it as another one', tier: 0,
          run: () => session.bless({ summonId: sum.id, suggestionId: sug.id, at: Date.now() }),
        });
      }
    }
    // What the writing says becomes the offer to NAME with — the ship criterion
    // for handwriting: write a word next to a shape and it becomes its name.
    {
      const labels = reading.roles.filter((r) => r.role === 'label' && sum.enclosedIds.includes(r.id));
      const said = labels.map((r) => ({ r, t: MM.transcriptsOf(s.nodes.get(r.id))[0] })).filter((x) => x.t);
      for (const { r, t } of said) {
        items.unshift({
          key: 'said:' + r.id, group: 'written', groupConf: t.confidence,
          groupWhy: 'read from your handwriting by ' + nameOfParticipant(t.source),
          label: 'Name it “' + t.text + '”', why: r.targets.length ? 'the word beside it, as its name' : 'the word you wrote, as its name', tier: 0,
          run: () => session.bless({ summonId: sum.id, name: t.text, at: Date.now() }),
        });
      }
      // What every selection can do with itself: go, be doubled, be copied out.
      {
        const marks = sum.enclosedIds.filter((id) => s.contentIds.includes(id));
        if (marks.length) {
          items.push({
            key: 'erase', group: 'always', groupConf: 0, groupWhy: '',
            label: 'Erase ' + (marks.length === 1 ? 'it' : 'these'), why: 'the ink stays in the log; undo brings it back', tier: 0,
            run: () => { const at = Date.now(); session.dismiss(sum.id, at); marks.forEach((id) => session.erase(id, at)); flash('erased ' + marks.length + ' mark' + (marks.length === 1 ? '' : 's')); },
          });
          items.push({
            key: 'duplicate', group: 'always', groupConf: 0, groupWhy: '',
            label: 'Duplicate ' + (marks.length === 1 ? 'it' : 'these'), why: 'a copy of the ink beside it, selected — a named thing copies as its ink', tier: 0,
            run: () => duplicateMarks(sum, marks),
          });
          items.push({
            key: 'copy-svg', group: 'always', groupConf: 0, groupWhy: '',
            label: 'Copy as SVG', why: 'the ink as paths, on the clipboard, for anywhere', tier: 0,
            run: () => { const svg = svgOf(marks); (navigator.clipboard ? navigator.clipboard.writeText(svg) : Promise.reject()).then(() => flash('copied ' + marks.length + ' mark' + (marks.length === 1 ? '' : 's') + ' as SVG'), () => { downloadText('selection.svg', svg, 'image/svg+xml'); flash('saved selection.svg — the clipboard was not available'); }); },
          });
        }
      }
      // Writing in the loop that a model has read can become text — a file of
      // words that a frame wires into a slot. Only on request: handwriting
      // stays handwriting until it is asked to be a heading.
      for (const lid of sum.enclosedIds) {
        const ln = s.nodes.get(lid);
        const said = ln && !s.artifacts.includes(lid) && MM.transcriptOf(ln);
        if (!said) continue;
        items.push({
          key: 'word-text:' + lid, group: 'always', groupConf: 0, groupWhy: '',
          label: 'Make it text “' + said + '”', why: 'a file of words where the writing is; the ink stays', tier: 0,
          run: () => { session.dismiss(sum.id, Date.now()); wordToText(lid); },
        });
      }
      // Artifacts in the loop can be wired into a frame — and a frame built
      // once is offered again, by the name written beside them or by resemblance.
      {
        const arts = artifactsIn(s, sum.enclosedIds);
        if (arts.length) {
          const wiring = bestWiring(arts, s.nodes);
          if (arts.length >= 2 || wiring.length) {
            items.push({
              key: 'frame', group: 'always', groupConf: 0, groupWhy: '',
              label: 'Frame these', why: wiring.length ? wiring.length + ' connection' + (wiring.length === 1 ? '' : 's') + ': ' + wiring.map((c) => c.from.port + ' → ' + c.to.port).join(', ') : arts.length + ' artifacts, nothing to wire yet', tier: 0,
              run: () => { const f = document.querySelector('#summon input.filter'); makeFrame(sum, f && f.value.trim() ? f.value.trim() : ''); },
            });
          }
          for (const tpl of frameTemplatesFor(s, sum.enclosedIds)) {
            const name = MM.wordOf(tpl.frame) || tpl.frame.id;
            items.unshift({
              key: 'frame-like:' + tpl.frame.id, group: tpl.how === 'name' ? 'written' : 'known', groupConf: tpl.how === 'name' ? 0.95 : 0.8,
              groupWhy: tpl.why, label: 'Frame these like “' + name + '”', why: 'the same wiring, on these', tier: 0,
              run: () => frameLike(sum, tpl.frame),
            });
          }
        }
      }
      // A definition in the loop: what it has been offered to do, and what
      // the words beside it say it does.
      for (const defId of [...new Set(sum.enclosedIds.filter((id) => s.artifacts.includes(id)).map((id) => definitionOf(s, id)))]) {
        const dn = s.nodes.get(defId);
        const name = MM.wordOf(dn) || defId;
        MM.behavioursOf(dn).forEach((r, i) => {
          if (r.data.blessed) return;
          items.unshift({
            key: 'use-behaviour:' + defId + ':' + i, group: 'proposed', groupConf: typeof r.data.residual === 'number' ? 1 - r.data.residual : 0.7,
            groupWhy: (r.data.source === 'demo' ? 'acted out' : 'read by ' + nameOfParticipant(r.source)),
            label: name + ': ' + MM.describeBehaviour(r.data), why: 'give it in your name', tier: 0,
            run: () => session.behave({ nodeId: defId, behaviour: { terms: r.data.terms, source: r.data.source, speed: r.data.speed }, participantId: MM.LOCAL_PARTICIPANT, at: Date.now() }),
          });
        });
        // Writing in the loop that reads as verbs: the label's words as the behaviour.
        for (const lid of sum.enclosedIds) {
          const ln = s.nodes.get(lid);
          const said = ln && MM.transcriptOf(ln);
          if (!said) continue;
          const parsed = MM.parseBehaviour(said);
          if (!parsed.behaviour) continue;
          items.unshift({
            key: 'behave-said:' + defId + ':' + lid, group: 'written', groupConf: 0.9, groupWhy: 'read from your handwriting',
            label: name + ': ' + MM.describeBehaviour(parsed.behaviour), why: 'the words beside it, as what it does', tier: 0,
            run: () => session.behave({ nodeId: defId, behaviour: parsed.behaviour, participantId: MM.LOCAL_PARTICIPANT, at: Date.now() }),
          });
        }
      }
      // A definition in the loop: its clock. Play is the bless that lets it run (I9).
      const defs = [...new Set(sum.enclosedIds.filter((id) => s.artifacts.includes(id)).map((id) => definitionOf(s, id)))];
      for (const defId of defs) {
        const c = s.clocks[defId];
        const name = MM.wordOf(s.nodes.get(defId)) || defId;
        items.push({
          key: 'clock:' + defId, group: 'always', groupConf: 0, groupWhy: '',
          label: (c && c.playing ? 'Pause ' : 'Play ') + name,
          why: c && c.playing ? 'hold every ' + name + ' where it is' : 'let every ' + name + ' move — nothing runs until you play it', tier: 0,
          run: () => session.clock({ nodeId: defId, op: c && c.playing ? 'pause' : 'play', at: Date.now() }),
        });
        if (c) items.push({
          key: 'reset:' + defId, group: 'always', groupConf: 0, groupWhy: '',
          label: 'Reset ' + name, why: 'back to t = 0, where they were drawn', tier: 0,
          run: () => session.clock({ nodeId: defId, op: 'reset', at: Date.now() }),
        });
      }
      const unread = sum.enclosedIds.filter((id) => { const n = s.nodes.get(id); return n && isWriting(n) && !MM.transcriptOf(n); });
      if (unread.length && agents.length) {
        items.push({
          key: 'read', group: 'always', groupConf: 0, groupWhy: '',
          label: 'Read the writing', why: seeing().length ? unread.length + ' mark' + (unread.length === 1 ? '' : 's') + ' of writing, unread' : 'needs a model that can see', tier: 2,
          run: () => { let any = false; unread.forEach((id) => { any = readOne(s.nodes.get(id), true) || any; }); if (!any) offerModel('Reading writing needs a model that can see — one marked “sees”.'); },
        });
      }
    }

    // What a model read this group as becomes an offer to NAME it — the
    // benchmark's last clause. The model proposed; the human blesses; the
    // engine then recognises the next one by its signature like any entry
    // the human named. Readings arrive after the palette opens, so the list
    // is repainted when they do (see askModels).
    {
      const seen = new Set();
      const proposed = [];
      for (const id of sum.enclosedIds) {
        const n = s.nodes.get(id);
        if (!n) continue;
        for (const r of MM.interpretationsOf(n, s.nodes)) {
          if (r.tier === 0 || r.blessed) continue;
          const key = r.label.toLowerCase();
          if (seen.has(key)) continue;
          seen.add(key);
          proposed.push(r);
        }
      }
      proposed.sort((a, b) => b.weight - a.weight).slice(0, 3).forEach((r) => {
        items.push({
          key: 'proposed:' + r.label, group: 'proposed', groupConf: r.weight,
          groupWhy: 'read this way by ' + r.sourceName,
          label: 'Name it “' + r.label + '”', why: r.sourceName + (r.reasoning ? ' — ' + r.reasoning.slice(0, 60) : ''), tier: 0,
          run: () => session.bless({ summonId: sum.id, name: r.label, at: Date.now() }),
        });
      });
    }

    // Drawing them clean: instant, offline, and the summon stays open so the
    // next offer is taken from the cleaned-up marks.
    const offers = snapMode === 'off' ? [] : session.snapCandidates(sum.enclosedIds);
    if (offers.length) {
      const all = offers.length === sum.enclosedIds.length;
      items.unshift({
        key: 'snap', group: 'clean',
        groupConf: offers.reduce((a, o) => a + o.weight, 0) / offers.length,
        groupWhy: 'each reads confidently as one shape',
        label: all ? 'Draw them clean' : 'Draw ' + offers.length + ' of ' + sum.enclosedIds.length + ' clean',
        why: shapesSummary(offers) + ' · ink kept', tier: 0,
        run: () => { shownSummonId = null; snapAll(offers.map((o) => o.id), shapesSummary(offers)); },
      });
    }
    if (!items.some((i) => i.label === 'Name this…')) {
      items.push({
        key: 'name', group: 'always', groupConf: 0, groupWhy: '',
        label: 'Name this…', why: 'hold it as a thing you can use again', tier: 0,
        run: (btn) => swapToInput(sum.id, btn),
      });
    }
    items.push({
      key: 'make', group: 'always', groupConf: 0, groupWhy: '',
      // One gesture, one box; whether it builds or changes is context, not a mode.
      label: sum.onArtifact ? 'Change it…' : 'Describe it…',
      why: agents.length === 0 ? 'needs a model — tap to add one'
        : sum.onArtifact ? 'change what this ink covers'
        : (reading.genre && reading.genre.genre === 'graph' ? 'build it as a running diagram'
          : reading.genre && reading.genre.genre === 'mixed' ? 'build it — a diagram inside a page'
          : 'say what it should become'),
      tier: 2,
      run: (btn) => swapToPrompt(sum, btn),
    });
    if (agents.length > 0 && sum.enclosedIds.length > 0) {
      items.push({
        key: 'ask', group: 'always', groupConf: 0, groupWhy: '',
        label: 'Ask about it…', why: 'answered into the canvas', tier: 2,
        run: (btn) => swapToQuestion(sum.enclosedIds.slice(), btn),
      });
    }
    if (agents.length > 0 && !sum.onArtifact) {
      // The model holds a pen too: it says what it would add, in the shapes
      // the canvas can read, and the engine draws it in its name.
      items.push({
        key: 'draw', group: 'always', groupConf: 0, groupWhy: '',
        label: 'Ask it to draw…', why: 'marks added in the model’s name, beside these', tier: 2,
        run: (btn) => swapToDraw(sum, btn),
      });
    }
    items.push({
      key: 'keep', group: 'always', groupConf: 0, groupWhy: '',
      label: 'Keep as drawing', why: 'leave the marks as they are', tier: 0,
      run: () => {
        const keep = sum.suggestions.find((x) => x.kind === 'keep-as-drawing');
        if (keep) session.bless({ summonId: sum.id, suggestionId: keep.id, at: Date.now() });
        else session.dismiss(sum.id, Date.now());
      },
    });

    // Groups stay whole — a reading split across the list reads as two readings.
    // Within a group, what the engine can do alone comes first: instant,
    // offline, and true regardless of what is plugged in. Between groups, the
    // strongest reading leads and the always-available actions sit at the end.
    const order = new Map();
    for (const i of items) {
      const best = order.get(i.group);
      const rank = i.group === 'always' ? -1 : i.groupConf;
      if (best === undefined || rank > best) order.set(i.group, rank);
    }
    return items.sort((a, b) => {
      if (a.group !== b.group) return order.get(b.group) - order.get(a.group);
      return a.tier - b.tier;
    });
  }

  function runConversion(sum, conv, concept) {
    const at = Date.now();
    const ids = sum.enclosedIds.slice();
    if (conv.effect.kind === 'tidy') {
      session.dismiss(sum.id, at);
      session.tidy({ ids: ids, mode: 'align', axis: conv.effect.axis, at: at });
      flash('lined up ' + ids.length + ' marks');
    } else if (conv.effect.kind === 'equalize') {
      session.dismiss(sum.id, at);
      session.tidy({ ids: ids, mode: 'equalize', at: at });
      flash('matched ' + ids.length + ' sizes');
    } else if (conv.effect.kind === 'name') {
      session.bless({ summonId: sum.id, name: concept.concept, at: at });
    } else if (conv.effect.kind === 'prompt') {
      const input = document.querySelector('#summon input.filter');
      if (input) { input.value = conv.effect.seed; }
      swapToPrompt(sum, input, conv.effect.seed);
    } else if (conv.effect.kind === 'control') {
      makeControl(sum);
    }
  }

  // ===== The blob: verbs packed in rings from the pen tip ====================
  //
  // A palette is a list for artists. This is packing: the two most likely
  // verbs nearest where the hand let go, then four around them, then eight,
  // then twelve — each ring further out — with the text filter at the
  // centre. Likelihood comes from the same reading the engine made (a known
  // name, a written word, a clean form, a concept, always-there verbs), times
  // learned use, so the rings settle toward the hand that uses them. No
  // drill-down: everything is in the rings, and typing filters all of it.
  const USES_KEY = 'mm-palette-uses';
  const uses = store.get(USES_KEY) || {};
  const RINGS = [2, 4, 8, 12];
  const RADII = [56, 122, 196, 268];
  let paletteOrigin = null;

  function baseLikelihood(item) {
    const g = item.group, c = item.groupConf || 0;
    let l;
    // Offers specific to THESE marks sit above every generic verb, whatever
    // the hand has learned to reach for: a match to something you named, the
    // word you just wrote, a model's reading of this group.
    if (g === 'known') l = 1.4;
    else if (g === 'written') l = 1.35;
    else if (g === 'proposed') l = 1.2 + 0.1 * c;
    else if (g === 'clean') l = 0.6 + 0.35 * c;
    else if (g === 'always') l = { name: 0.58, keep: 0.5, make: 0.56, ask: 0.42, draw: 0.38, read: 0.52, erase: 0.55, duplicate: 0.5, 'copy-svg': 0.44, frame: 0.5 }[item.key] || 0.4;
    else l = 0.5 + 0.45 * c; // a concept's conversions
    if (item.tier === 2) l *= 0.85;
    // Learned use lifts the GENERIC verbs toward the hand that uses them. An
    // offer specific to these marks — a known match, the word just written, a
    // model's reading of this group — is not generic, and nothing learned
    // outranks it.
    const specific = g === 'known' || g === 'written' || g === 'proposed';
    return specific ? l : l * Math.min(1.25, 1 + 0.2 * Math.log1p(uses[item.key] || 0));
  }
  function rankItems(items) {
    return items.map((i) => Object.assign(i, { likelihood: baseLikelihood(i) })).sort((a, b) => b.likelihood - a.likelihood);
  }
  function noteUse(item) {
    uses[item.key] = (uses[item.key] || 0) + 1;
    store.set(USES_KEY, uses);
  }

  /** Where the rings sit: at the pen, pulled in so the outer ring stays on screen and off the panel. */
  function ringsShown() { return Math.min(innerWidth, innerHeight) < 600 ? 2 : RINGS.length; }
  function placeOrigin() {
    // On a small screen the rings shrink, but never so far that pills collide;
    // the outer rings may run off the edge, and typing still finds them.
    const scale = Math.max(0.72, Math.min(1, (Math.min(innerWidth, innerHeight) - 24) / (2 * RADII[RADII.length - 1] + 120)));
    const rMax = RADII[ringsShown() - 1] * scale + 70;
    let x = lastPen ? lastPen.x : innerWidth / 2, y = lastPen ? lastPen.y : innerHeight / 2;
    x = Math.max(rMax, Math.min(innerWidth - rMax, x));
    y = Math.max(rMax, Math.min(innerHeight - rMax - 30, y));
    const panel = inspectorEl.getBoundingClientRect();
    if (!document.body.classList.contains('panelHidden') && panel.width && x - rMax < panel.right && y < panel.bottom + rMax && y > panel.top - rMax) {
      x = Math.min(innerWidth - rMax, panel.right + rMax);
    }
    return { x, y, scale };
  }

  function renderSummon(s) {
    document.body.classList.toggle('summoning', !!s.summon);
    if (!s.summon) { summonEl.style.display = 'none'; summonEl.className = ''; shownSummonId = null; paletteOrigin = null; return; }
    const sum = s.summon;
    if (shownSummonId !== sum.id) {
      shownSummonId = sum.id;
      paletteItems = rankItems(conversionsFor(s));
      paletteIndex = 0;
      paletteOrigin = placeOrigin();
      summonEl.className = 'blob';
      summonEl.style.display = 'block';
      summonEl.innerHTML = '';
      summonEl.style.left = paletteOrigin.x + 'px';
      summonEl.style.top = paletteOrigin.y + 'px';

      // The centre: the filter, and under it what this acts on and how it
      // decided — a wrong guess should be visible before you act on it.
      const centre = document.createElement('div');
      centre.className = 'centre';
      const filter = document.createElement('input');
      filter.className = 'filter';
      filter.placeholder = 'type to find, or to ask…';
      filter.onkeydown = onPaletteKey;
      filter.oninput = () => { paletteNavigated = false; paintPalette(filter.value); };
      centre.appendChild(filter);
      const scope = document.createElement('div');
      scope.className = 'scope';
      const onArt = sum.onArtifact
        ? ' on <b>' + esc(MM.wordOf(s.nodes.get(sum.onArtifact.artifactId)) || 'artifact') + '</b>' +
          (sum.onArtifact.regionIds.length ? ' · ' + esc(sum.onArtifact.regionIds.join(' ')) : '')
        : '';
      const genre = session.read(sum.enclosedIds).genre;
      scope.innerHTML = '<b>' + sum.enclosedIds.length + ' mark' + (sum.enclosedIds.length === 1 ? '' : 's') + '</b>' + onArt +
        (genre && genre.genre !== 'empty' ? ' · ' + esc(genre.genre) : '') + '<span class="how">' + esc(sum.scopeReasoning) + '</span>';
      centre.appendChild(scope);
      summonEl.appendChild(centre);

      const list = document.createElement('div');
      list.className = 'items';
      summonEl.appendChild(list);
      paintPalette('');
      setTimeout(() => filter.focus(), 0);
    }
  }

  /** Recompute the offers for the open summon and repaint, keeping what was typed. */
  function refreshPalette() {
    const s = session.getState();
    if (!s.summon || shownSummonId !== s.summon.id) return;
    const filter = summonEl.querySelector('input.filter');
    if (!filter || !summonEl.querySelector('.items')) return; // a prompt or name field has replaced the list
    paletteItems = conversionsFor(s);
    paintPalette(filter.value);
  }

  function visibleItems(query) {
    const q = query.trim().toLowerCase();
    if (!q) return paletteItems;
    const matching = paletteItems.filter((i) =>
      (i.label + ' ' + i.group + ' ' + i.why).toLowerCase().includes(q));
    // Words typed at a definition are its behaviour, when the table can read
    // them: Tier 0, blessed by the act. What it cannot read goes to a model.
    const s = session.getState();
    const sum = s.summon;
    const defs = sum ? [...new Set(sum.enclosedIds.filter((id) => s.artifacts.includes(id)).map((id) => definitionOf(s, id)))] : [];
    if (defs.length && q.length > 3) {
      const parsed = MM.parseBehaviour(query);
      for (const defId of defs) {
        const name = MM.wordOf(s.nodes.get(defId)) || defId;
        if (parsed.behaviour) {
          matching.unshift({
            key: 'behave:' + defId, group: 'written', groupConf: 1, groupWhy: parsed.reasoning,
            label: name + ': ' + MM.describeBehaviour(parsed.behaviour), why: parsed.unparsed.length ? 'could not read: ' + parsed.unparsed.join(', ') : 'from your words — every ' + name + ' will', tier: 0,
            run: () => { session.behave({ nodeId: defId, behaviour: parsed.behaviour, participantId: MM.LOCAL_PARTICIPANT, at: Date.now() }); },
          });
        }
        if (parsed.unparsed.length && agents.length) {
          matching.push({
            key: 'behave-model:' + defId, group: 'always', groupConf: 0, groupWhy: '',
            label: 'Read it with the model', why: 'for what the table could not: ' + parsed.unparsed.join(', '), tier: 2,
            run: () => { agents.forEach((a) => withWork('behave:' + a.id + ':' + defId, [defId], a.name + ' is reading the words…', a.behave({ nodeId: defId, words: query, at: Date.now() })).then(() => render(session.getState()))); },
          });
        }
      }
    }
    return matching;
  }

  /**
   * Slots on a ring. Pills are wide and low, so the first ring sits above and
   * below the field and the second on the diagonals — no pill over another —
   * and only the outer rings spread evenly, turned so the most stay on screen.
   */
  function ringSlots(ring, n, r, o) {
    const fixed = ring === 0 ? [-90, 90] : ring === 1 ? [-45, 45, 135, -135] : null;
    if (fixed) {
      return fixed.slice(0, n).map((deg) => ({ x: o.x + r * Math.cos(deg * Math.PI / 180), y: o.y + r * Math.sin(deg * Math.PI / 180) }));
    }
    let best = null;
    for (let k = 0; k < 24; k++) {
      const a0 = (ring === 2 ? 0 : Math.PI / 12) + (k / 24) * Math.PI * 2;
      const pts = [];
      let score = 0;
      for (let i = 0; i < n; i++) {
        const a = a0 + (i / n) * Math.PI * 2;
        const x = o.x + r * Math.cos(a), y = o.y + r * Math.sin(a);
        pts.push({ x, y });
        score += Math.min(x - 70, innerWidth - 70 - x, y - 30, innerHeight - 60 - y);
      }
      if (!best || score > best.score) best = { score, pts };
    }
    return best.pts;
  }

  function paintPalette(query) {
    const list = summonEl.querySelector('.items');
    if (!list) return;
    const shown = visibleItems(query);
    if (paletteIndex >= shown.length) paletteIndex = Math.max(0, shown.length - 1);
    list.innerHTML = '';
    if (shown.length === 0) {
      const empty = document.createElement('div');
      empty.className = 'empty2';
      empty.textContent = query.trim() && agents.length ? 'nothing matches — Enter asks the model' : 'nothing matches';
      empty.style.left = '0px'; empty.style.top = (RADII[0] * (paletteOrigin ? paletteOrigin.scale : 1)) + 'px';
      list.appendChild(empty);
      return;
    }
    const o = { x: 0, y: 0 }, scale = paletteOrigin ? paletteOrigin.scale : 1;
    const origin = paletteOrigin || { x: innerWidth / 2, y: innerHeight / 2 };
    let i = 0;
    // A phone has room for the two inner rings; the rest is a keystroke away.
    const maxRings = ringsShown();
    for (let ring = 0; ring < maxRings && i < shown.length; ring++) {
      const n = Math.min(RINGS[ring], shown.length - i);
      const slots = ringSlots(ring, n, RADII[ring] * scale, origin);
      for (let k = 0; k < n; k++, i++) {
        const item = shown[i];
        const btn = document.createElement('button');
        btn.className = 'item ring' + ring;
        btn.setAttribute('aria-selected', String(i === paletteIndex));
        btn.title = item.why + (item.groupWhy ? ' — ' + item.groupWhy : '');
        btn.innerHTML = '<span>' + esc(item.label) + '</span>' +
          (item.tier === 0 ? '<span class="tier0">·now</span>' : '') +
          (ring === 0 ? '<span class="why">' + esc(item.why) + '</span>' : '');
        btn.style.left = (slots[k].x - origin.x) + 'px';
        btn.style.top = (slots[k].y - origin.y) + 'px';
        btn.onclick = () => { noteUse(item); item.run(btn); };
        list.appendChild(btn);
      }
    }
    if (i < shown.length) {
      const more = document.createElement('div');
      more.className = 'empty2';
      more.textContent = '+' + (shown.length - i) + ' more — type to find';
      more.style.left = '0px'; more.style.top = (RADII[maxRings - 1] * scale + 34) + 'px';
      list.appendChild(more);
    }
    relax(list, origin);
  }

  /**
   * Packing, not placing. Slots put pills roughly where they belong; this
   * lets them settle: each pill is pulled toward its slot by a spring and
   * pushed off any pill (or the centre field) it overlaps, a few dozen times,
   * until nothing overlaps. Wide pills make room for themselves; the rings
   * bulge where the labels are long. Cheap — a dozen pills, forty steps.
   */
  function relax(list, origin) {
    const pills = [...list.querySelectorAll('.item')].map((el) => {
      const r = el.getBoundingClientRect();
      return { el, w: r.width + 10, h: r.height + 8, x: parseFloat(el.style.left), y: parseFloat(el.style.top), tx: parseFloat(el.style.left), ty: parseFloat(el.style.top) };
    });
    const centre = summonEl.querySelector('.centre');
    const cr = centre ? centre.getBoundingClientRect() : null;
    const field = cr ? { w: cr.width + 16, h: cr.height + 12, x: cr.left + cr.width / 2 - origin.x, y: cr.top + cr.height / 2 - origin.y } : null;
    const bodies = field ? [Object.assign({ fixed: true }, field)] : [];
    const all = bodies.concat(pills);
    for (let step = 0; step < 48; step++) {
      for (const p of pills) { p.x += (p.tx - p.x) * 0.08; p.y += (p.ty - p.y) * 0.08; }
      for (let i = 0; i < all.length; i++) {
        for (let j = i + 1; j < all.length; j++) {
          const a = all[i], b = all[j];
          const ox = (a.w + b.w) / 2 - Math.abs(a.x - b.x);
          const oy = (a.h + b.h) / 2 - Math.abs(a.y - b.y);
          if (ox <= 0 || oy <= 0) continue;
          // Push apart along the shorter escape; a fixed body (the field) does not move.
          const sx = a.x < b.x ? -1 : 1, sy = a.y < b.y ? -1 : 1;
          const along = ox < oy ? { x: ox, y: 0 } : { x: 0, y: oy };
          const share = a.fixed || b.fixed ? 1 : 0.5;
          if (!a.fixed) { a.x += sx * along.x * share; a.y += sy * along.y * share; }
          if (!b.fixed) { b.x -= sx * along.x * share; b.y -= sy * along.y * share; }
        }
      }
    }
    for (const p of pills) { p.el.style.left = p.x + 'px'; p.el.style.top = p.y + 'px'; }
  }

  let paletteNavigated = false; // the arrows chose a pill; Enter takes it
  function onPaletteKey(e) {
    e.stopPropagation();
    const shown = visibleItems(e.target.value);
    if (e.key === 'ArrowDown') { e.preventDefault(); paletteNavigated = true; paletteIndex = Math.min(shown.length - 1, paletteIndex + 1); paintPalette(e.target.value); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); paletteNavigated = true; paletteIndex = Math.max(0, paletteIndex - 1); paintPalette(e.target.value); }
    else if (e.key === 'Enter') {
      e.preventDefault();
      const q = e.target.value.trim();
      const ql = q.toLowerCase();
      // What was typed is a verb when a pill was chosen with the arrows, or a
      // pill's name begins with it. Anything else — "website about dolphins" —
      // is a brief, and goes to the model as one. A word inside a pill's hint
      // ("about" in "Ask about it…") is not a command.
      const chosen = paletteNavigated ? shown[paletteIndex] : null;
      const named = !chosen && ql ? shown.find((i) => i.label.toLowerCase().startsWith(ql) || i.key.startsWith('behave:') || i.key.startsWith('frame')) : null;
      const item = chosen || named || (!ql ? shown[paletteIndex] : null);
      if (item) { item.run(summonEl.querySelectorAll('.item')[shown.indexOf(item)]); return; }
      if (!ql) return;
      const sum = session.getState().summon;
      if (!sum) return;
      if (agents.length === 0) { offerModel('“' + q.slice(0, 40) + '” needs a model to build. Tap one to join it, then press Enter again.'); return; }
      e.target.disabled = true;
      e.target.placeholder = 'building with ' + agents.length + ' model(s)…';
      runPrompt(sum, q, !!sum.onArtifact);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      session.dismiss(shownSummonId, Date.now());
    }
  }

  /**
   * Which regions this summon addresses. The engine's geometric answer, merged
   * with what the artifact's own DOM reports under the ink — two independent
   * reads of the same question, and the union is what the model is told.
   */
  function addressedRegions(sum) {
    if (!sum.onArtifact) return [];
    const lasso = state.nodes.get(sum.gestureIds[0]);
    const b = lasso && MM.boundsOf(lasso);
    const fromDom = b ? regionsUnderInk(sum.onArtifact.artifactId, b) : [];
    return [...new Set((sum.onArtifact.regionIds || []).concat(fromDom))];
  }

  function swapToInput(summonId, btn) {
    const input = document.createElement('input');
    input.placeholder = 'name it…';
    input.onkeydown = (e) => {
      e.stopPropagation();
      if (e.key === 'Enter' && input.value.trim()) {
        session.bless({ summonId: summonId, name: input.value.trim(), at: Date.now() });
      }
    };
    replaceWithField(btn, input);
  }

  // The freeform prompt — MVP.md §2 step 6. One box for building and for
  // changing, because it is one gesture; whether the artifact already carries
  // code is what decides, not a mode the human has to pick.
  function swapToPrompt(sum, btn, seed) {
    const revising = !!sum.onArtifact;
    const input = document.createElement('input');
    input.className = 'make filter';
    input.value = seed || '';
    input.placeholder = revising
      ? 'change what this covers…'
      : 'website with the copy in the squares…';
    input.onkeydown = (e) => {
      e.stopPropagation();
      if (e.key !== 'Enter') return;
      const prompt = input.value.trim();
      if (!prompt) return;
      if (agents.length === 0) {
        // The escalation, made visible: the engine did all it could, and this
        // is the step that needs a model. Open the pane instead of a dead box.
        offerModel('“' + prompt.slice(0, 40) + '” needs a model to build. Tap one to join it, then describe it again.');
        return;
      }
      input.disabled = true;
      input.placeholder = 'building with ' + agents.length + ' model(s)…';
      runPrompt(sum, prompt, revising);
    };
    replaceWithField(btn, input);
  }

  /**
   * Swap the palette for a single field. The list is removed rather than left
   * behind: once you are typing, the options are stale.
   */
  function replaceWithField(btn, input) {
    // The rings fold away; the field takes the centre, where the filter was.
    const list = summonEl.querySelector('.items');
    if (list) list.remove();
    const scope = summonEl.querySelector('.scope');
    if (scope) scope.remove();
    const filter = summonEl.querySelector('input.filter');
    if (filter && filter !== input) filter.replaceWith(input);
    else if (btn && btn.replaceWith) btn.replaceWith(input);
    else (summonEl.querySelector('.centre') || summonEl).appendChild(input);
    input.classList.add('field');
    input.focus();
    input.setSelectionRange(input.value.length, input.value.length);
  }

  function runPrompt(sum, prompt, revising) {
    const at = Date.now();
    let artifactId, addressed;

    if (revising) {
      artifactId = sum.onArtifact.artifactId;
      addressed = addressedRegions(sum);
      session.dismiss(sum.id, at); // the addressing mark has done its work
    } else {
      // Blessing first gives the code somewhere to live, and gives the region
      // frame its origin. The name is the prompt, so the artifact says what it
      // was asked to be.
      const name = prompt.length > 30 ? prompt.slice(0, 30) + '…' : prompt;
      artifactId = session.bless({ summonId: sum.id, name: name, at: at });
      addressed = undefined;
      if (!artifactId) { mpStatus.textContent = 'Could not hold that group.'; return; }
    }

    // What the human typed outranks a reading nobody asked for.
    cancelReading();
    mpStatus.textContent = (revising ? 'revising' : 'building') + ' with ' + agents.length + ' model(s)…';
    const aboutIds = session.getState().nodes.get(artifactId) ? [artifactId] : sum.enclosedIds;
    agents.forEach((agent) => {
      withWork('build:' + agent.id + ':' + artifactId, aboutIds, agent.name + (revising ? ' is revising “' : ' is building “') + prompt.slice(0, 32) + (prompt.length > 32 ? '…' : '') + '”…',
        agent.generate({ prompt: prompt, artifactId: artifactId, at: Date.now(), addressed: addressed }))
        .then((res) => {
          if (res.ok) {
            const short = res.unfilled && res.unfilled.length
              ? ' — left ' + res.unfilled.join(', ') + ' empty'
              : '';
            mpStatus.textContent =
              agent.name + ' ' + (res.revised ? 'revised' : 'built') + ' ' + (res.revised ? (res.changed || res.filled) : res.filled).join(', ') + short;
          } else {
            mpStatus.textContent = agent.name + ' could not build (' + res.error + ') — the drawing is untouched.';
            // A model that answered unusably is a thing you need to SEE to fix.
            if (res.raw) window.__mm.lastRaw = res.raw;
          }
          render(session.getState());
        });
    });
  }

  /** The ink of some marks, again, beside them; the copies become the selection. */
  function duplicateMarks(sum, ids) {
    const s = session.getState();
    const boxes = ids.map((id) => MM.boundsOf(s.nodes.get(id))).filter(Boolean);
    if (!boxes.length) return;
    const b = union(boxes);
    const dx = (b.maxX - b.minX) + wpx(40), dy = 0;
    const at = Date.now();
    session.dismiss(sum.id, at);
    const made = [];
    let t = at + 1;
    const copyInk = (node) => {
      const pts = MM.strokePointsOf(node);
      if (pts) {
        const clean = MM.cleanPointsOf(node);
        const src = clean || pts;
        made.push(session.addStroke(src.map((p) => ({ x: p.x + dx, y: p.y + dy })), t++, undefined, 1 / view.zoom, { content: true }));
        return;
      }
      for (const e of node.edges) if (e.rel === 'has-part') { const p = s.nodes.get(e.to); if (p && !p.reps.some((r) => r.modality === 'erased')) copyInk(p); }
    };
    for (const id of ids) copyInk(s.nodes.get(id));
    if (made.length) session.select(made, t);
    flash('duplicated ' + ids.length + ' as ' + made.length + ' stroke' + (made.length === 1 ? '' : 's'));
  }

  function swapToDraw(sum, btn) {
    const input = document.createElement('input');
    input.placeholder = 'add a footer under these…';
    input.className = 'ask';
    input.onkeydown = (e) => {
      e.stopPropagation();
      if (e.key !== 'Enter') return;
      const q = input.value.trim();
      if (!q) return;
      const ids = sum.enclosedIds.slice();
      session.dismiss(sum.id, Date.now());
      cancelReading();
      mpStatus.textContent = 'drawing with ' + agents.length + ' model(s)…';
      agents.forEach((agent) => {
        withWork('draw:' + agent.id, ids, agent.name + ' is drawing…', agent.draw({ prompt: q, nodeIds: ids, at: Date.now() })).then((res) => {
          if (res.ok) {
            mpStatus.textContent = agent.name + ' drew ' + res.ids.length + ' mark' + (res.ids.length === 1 ? '' : 's') +
              ': ' + res.shapes.map((s) => s.shape).join(', ');
            flash(agent.name + ' drew ' + res.ids.length);
          } else {
            mpStatus.textContent = agent.name + ' drew nothing (' + res.error + ').';
            if (res.raw) window.__mm.lastRaw = res.raw;
          }
          render(session.getState());
        });
      });
    };
    replaceWithField(btn, input);
  }

  function swapToQuestion(nodeIds, btn) {
    const input = document.createElement('input');
    input.placeholder = 'ask about these…';
    input.className = 'ask';
    input.onkeydown = (e) => {
      e.stopPropagation();
      if (e.key !== 'Enter') return;
      const q = input.value.trim();
      if (!q) return;
      input.disabled = true;
      input.placeholder = 'asking ' + agents.length + ' model(s)…';
      cancelReading();
      agents.forEach((agent) => {
        withWork('ask:' + agent.id, nodeIds, agent.name + ' is answering…', agent.ask(q, nodeIds, Date.now())).then((res) => {
          if (!res.ok) mpStatus.textContent = agent.name + ' could not answer (' + res.error + ').';
          render(session.getState());
        });
      });
    };
    replaceWithField(btn, input);
  }

// ===== inspector =====
// Provides: the panel: a mark, an artifact, a word, the selection.
// Uses: core, render (readRungs), snap, handwriting, models.
// A fragment of one closure: Demos/build-surface.mjs concatenates surface/*.js
// in name order inside `(function () { ... })();`. Shared state is the
// closure's; no imports, no exports, no build step beyond the concatenation.

  // ===== Inspector: what the machine currently holds, and why ==============
  /**
   * THE LADDER of a behaviour: words → sliders → what each verb is doing now →
   * source. The blessed one is what runs; held ones are offers with a reason.
   */
  function behaviourRows(s, node, id) {
    const reps = MM.behavioursOf(node);
    if (!reps.length) {
      return '<div class="row"><span class="k">behaves</span><span class="v">wander, and keep to its spot — the built-in</span></div>' +
        '<div class="why">write what it does beside it, type it in the loop\'s palette, or drag it while the clock runs to act it out</div>';
    }
    let html = '';
    const blessedRep = reps.find((r) => r.data.blessed);
    if (blessedRep) {
      const b = blessedRep.data;
      html += '<div class="row"><span class="k">behaves</span><span class="v">' + esc(MM.describeBehaviour(b)) + '</span></div>';
      html += '<div class="why">' + esc(b.source === 'words' ? 'from the words' : b.source === 'demo' ? 'acted out' : b.source === 'model' ? 'read by a model, given by you' : 'set by hand') + ' · given by ' + esc(nameOfParticipant(blessedRep.source)) + '</div>';
      const shares = liveShares(id);
      b.terms.forEach((t, i) => {
        const share = shares && shares[i] ? Math.round(shares[i].share * 100) : null;
        html += '<div class="slider"><label>' + esc(t.verb + (t.target ? ' ' + (t.target === '*' ? 'anything' : t.target) : '') + (t.params && t.params.only ? ' ' + t.params.only : '')) + '</label>' +
          '<input type="range" min="0" max="2" step="0.05" value="' + (+t.weight).toFixed(2) + '" data-id="' + esc(id) + '" data-term="' + i + '">' +
          '<span class="v">' + (+t.weight).toFixed(2) + (share !== null ? ' · ' + share + '% now' : '') + '</span>' +
          (t.reasoning ? '<div class="why">' + esc(t.reasoning) + '</div>' : '') + '</div>';
      });
      html += '<details class="src"><summary>source</summary><pre>' + esc(MM.behaviourSource(b)) + '</pre></details>';
      html += '<button class="mini" data-act="behave-drop" data-id="' + esc(id) + '">back to the built-in</button>';
    }
    reps.forEach((r, i) => {
      if (r.data.blessed) return;
      const b = r.data;
      const who = nameOfParticipant(r.source);
      const how = b.source === 'demo' ? 'acted out' : b.source === 'model' ? 'read by ' + who : 'from the words, by ' + who;
      html += '<div class="row"><span class="k">offered</span><span class="v">' + esc(MM.describeBehaviour(b)) + '</span></div>';
      html += '<div class="why">' + esc(how) + (typeof b.residual === 'number' ? ' · ' + Math.round((1 - b.residual) * 100) + '% of the path explained' : '') + (b.reasoning ? ' — ' + esc(b.reasoning) : '') + '</div>';
      html += '<div class="acts"><button class="mini" data-act="behave-use" data-id="' + esc(id) + '" data-index="' + i + '">use it</button></div>';
    });
    return html;
  }

  /** The clock's state and its buttons, for any artifact that can run. */
  function clockRows(s, id) {
    const c = s.clocks[id];
    const err = runtimeBroken(id);
    const stateText = !c ? 'not played — nothing of it runs until you play it'
      : c.playing ? 'playing · t = ' + tankTime(id).toFixed(1) + 's' : 'paused' + (c.reason ? ' — ' + c.reason : '') + ' · t = ' + tankTime(id).toFixed(1) + 's';
    return '<div class="row"><span class="k">clock</span><span class="v' + (err ? ' warn' : '') + '">' + esc(stateText) + '</span></div>' +
      '<div class="acts">' +
      (c && c.playing
        ? '<button class="mini" data-act="clock-pause" data-id="' + esc(id) + '">pause</button>'
        : '<button class="mini" data-act="clock-play" data-id="' + esc(id) + '">' + (c ? 'play' : 'play — let it run') + '</button>') +
      '<button class="mini" data-act="clock-reset" data-id="' + esc(id) + '">reset</button></div>';
  }

  /** The kind of an artifact's newest code rep, html by default. */
  function codeKindOf(node) { const r = node && codeRepOf(node); return (r && r.data.kind) || 'html'; }

  function renderInspector(s, id) {
    if (s.summon) return renderSummonScope(s);

    const node = id && s.nodes.get(id);
    if (!node) {
      inspectorEl.innerHTML = '<div class="eyebrow">mark</div>' +
        '<div class="empty">Draw something. Each mark keeps every reading it has; ' +
        'nothing is committed until you bless it.</div>';
      return;
    }

    const isArtifact = s.artifacts.includes(id);
    const isLive = s.live.includes(id);
    const isWordNode = MM.isWord(node);
    const author = MM.strokePointsOf(node)
      ? authorOf(node)
      : ((node.reps.find((r) => r.modality === 'word') || {}).source || MM.LOCAL_PARTICIPANT);
    const authorName = nameOfParticipant(author);
    let html = '<div class="eyebrow">' +
      (isLive ? (codeKindOf(node) === 'html' ? 'living page' : 'living ' + codeKindOf(node)) : isArtifact ? 'artifact' : isWordNode ? 'word' : 'mark') + '</div>';

    html += '<div class="row"><span class="k">id</span><span class="v">' + esc(id) + '</span></div>';
    html += '<div class="row"><span class="k">by</span><span class="v ' +
      (author !== MM.LOCAL_PARTICIPANT ? 'by-agent' : 'by-human') + '">' + esc(authorName) + '</span></div>';

    if (isWordNode) {
      const letters = MM.lettersOf(node);
      html += '<div class="row"><span class="k">letters</span><span class="v">' + letters.length + ' strokes, gathered as one word</span></div>' +
        '<button class="mini" data-act="split" data-id="' + esc(id) + '">not a word — split it</button>';
    }
    if (isArtifact) {
      const members = node.edges.filter((e) => e.rel === 'has-part');
      html += '<div class="row"><span class="k">name</span><span class="v">' + esc(MM.wordOf(node)) + '</span></div>';
      html += '<div class="row"><span class="k">holds</span><span class="v">' + members.length + ' marks</span></div>';
      const sig = (node.reps.find((r) => r.modality === 'signature') || {}).data;
      if (sig) {
        html += '<div class="row"><span class="k">sig</span><span class="v">' +
          esc(sig.shapes ? MM.describeStructure(sig) : Object.entries(sig).map(([k, v]) => v + '×' + k).join(' + ')) + '</span></div>';
      }
      const ex = (node.reps.find((r) => r.modality === 'examples') || {}).data;
      if (ex && (ex.accepted.length || ex.rejected.length)) {
        html += '<div class="row"><span class="k">corrected</span><span class="v">' +
          ex.accepted.length + ' is, ' + ex.rejected.length + ' is not</span></div>';
      }
      const inst = node.edges.find((e) => e.rel === 'instance-of');
      if (inst) html += '<div class="row"><span class="k">same as</span><span class="v">' + esc(inst.to) + '</span></div>';
    }

    // The code plane. Every attempt is kept and attributed; the newest is what
    // renders. Generation is a proposal like any other reading (MVP.md §7).
    const codes = node.reps.filter((r) => r.modality === 'code');
    if (codes.length) {
      const newest = codes[codes.length - 1];
      html += '<div class="sep"></div><div class="eyebrow">code' +
        (codes.length > 1 ? ' <span class="srccount">' + codes.length + ' versions</span>' : '') + '</div>';
      html += '<div class="row"><span class="k">built by</span><span class="v by-agent">' +
        esc(nameOfParticipant(newest.source)) + '</span></div>';
      html += '<div class="row"><span class="k">size</span><span class="v">' +
        newest.data.code.length + ' chars</span></div>';
      if (newest.data.prompt) html += '<div class="why">“' + esc(newest.data.prompt) + '”</div>';

      const kind = newest.data.kind || 'html';
      html += '<div class="row"><span class="k">kind</span><span class="v">' + esc(kind) + '</span></div>';
      if (kind === 'html') {
        const regions = MM.regionsOf(node, s.nodes);
        html += '<div class="row"><span class="k">regions</span><span class="v">' +
          regions.map((r) => r.id).join(' ') + '</span></div>';
      } else {
        const parts = MM.addressablesOf(kind, newest.data.code).filter((r) => r.depth === 0);
        html += '<div class="row"><span class="k">addresses</span><span class="v">' +
          esc(parts.map((r) => r.id).join(' ') || 'nothing yet') + '</span></div>';
      }
      if (codes.length > 1) html += '<div class="why">Earlier versions are kept.</div>';
      if (kind !== 'png' && kind !== 'jpg' && kind !== 'control') {
        html += '<div class="acts">' + (kind === 'text' ? '<button class="mini" data-act="edit-text" data-id="' + esc(id) + '">edit the words</button>' : '') +
          '<button class="mini" data-act="export-code" data-id="' + esc(id) + '">save as .' + esc(kind === 'text' ? 'txt' : kind) + '</button></div>';
      }
      // The clock: nothing runs until a hand plays it, and a stop says why.
      if (kind === 'js') {
        html += clockRows(s, id);
      }
    }
    // A frame: what it holds and how it is wired, each connection with its reason and what it carries now.
    if (isArtifact && MM.isFrame(node)) {
      const f = MM.frameOfNode(node);
      const r = MM.resolveFrame(f, s.nodes);
      html += '<div class="sep"></div><div class="eyebrow">frame</div>';
      html += '<div class="row"><span class="k">members</span><span class="v">' + esc(f.members.map((m) => MM.wordOf(s.nodes.get(m)) || m).join(', ')) + '</span></div>';
      if (!f.connections.length) html += '<div class="why">no connections — nothing among them offers a value another accepts</div>';
      r.carried.forEach((c) => {
        html += '<div class="row"><span class="k">wire</span><span class="v">' + esc((MM.wordOf(s.nodes.get(c.connection.from.id)) || c.connection.from.id) + '.' + c.connection.from.port + ' → ' + (MM.wordOf(s.nodes.get(c.connection.to.id)) || c.connection.to.id) + '.' + c.connection.to.port) +
          (c.value !== undefined ? ' = ' + esc(typeof c.value === 'number' ? (+c.value.toFixed(3)).toString() : String(c.value)) : '') + '</span></div>';
        if (c.connection.reasoning) html += '<div class="why">' + esc(c.connection.reasoning) + '</div>';
      });
      const files = exportFrameFiles(id);
      if (files) html += '<div class="row"><span class="k">exports as</span><span class="v">' + esc(Object.keys(files).join(', ')) + '</span></div>';
    }
    // A control: its value is where the knob sits.
    if (isArtifact && codes.length && (codes[codes.length - 1].data.kind === 'control')) {
      const c = MM.controlOf(node, s.nodes);
      html += '<div class="row"><span class="k">value</span><span class="v">' + (c ? esc((+c.value.toFixed(3)).toString() + ' of ' + c.min + '–' + c.max) : 'no knob on the track') + '</span></div>';
      if (c) html += '<div class="why">' + esc(c.reasoning) + ' — drag the knob to set it</div>';
    }
    // A definition without code has a clock too: play, and its instances move
    // by the built-in behaviour until words or a hand give it another.
    if (isArtifact && !codes.length && !MM.isFrame(node)) {
      html += '<div class="sep"></div><div class="eyebrow">tank</div>';
      const inst = tankCount(s, id);
      html += '<div class="row"><span class="k">bodies</span><span class="v">' + inst.total + (inst.held ? ' (' + inst.held + ' held, unblessed)' : '') + '</span></div>';
      html += clockRows(s, id);
      html += behaviourRows(s, node, id);
    }

    // THE LADDER. Every rung a mark has climbed, with why at each one — ink,
    // shape, what it plays, what it became. Each rung keeps the one below it,
    // so a wrong reading at the top never destroys the bottom (KEYFRAMES.md §3).
    {
      const rung = readRungs(s);
      const role = rung.roles.get(id);
      const shapeRead = MM.interpretationsOf(node, s.nodes).filter((r) => r.tier === 0)[0];
      const rows = [];
      const fpx = MM.fingerprintOf(node);
      if (fpx) {
        const scaleRep = (node.reps.find((r) => r.modality === 'stroke') || {}).data || {};
        rows.push(['ink', fpx.pointCount + ' points' + (scaleRep.scale ? ' at ' + (1 / scaleRep.scale).toFixed(1) + '×' : ''), '']);
      } else if (isArtifact) {
        rows.push(['ink', node.edges.filter((e) => e.rel === 'has-part').length + ' marks held', '']);
      }
      if (shapeRead) rows.push(['shape', shapeRead.label + ' ' + shapeRead.weight.toFixed(2), shapeRead.reasoning || '']);
      // Clean form: held, offered, or neither — and the one-mark way to take it up.
      const clean = MM.cleanOf(node);
      const offer = snapOffers.get(id);
      if (clean) {
        rows.push(['clean', 'drawn as a ' + clean.shape, clean.reasoning,
          '<button class="mini" data-act="raw" data-id="' + esc(id) + '">show the ink</button>']);
      } else if (offer) {
        rows.push(['clean?', 'could be a ' + offer.shape, offer.reasoning,
          '<button class="mini" data-act="snap" data-id="' + esc(id) + '">draw it clean</button>']);
      } else if (shapeRead && !isArtifact && snapMode !== 'off' && s.pendingLassoId !== id) {
        // Not offered — and the reason is the useful part: a reading that is
        // too weak or too close to another is exactly what a redraw would hide.
        const why = MM.snapReading(node, s.nodes);
        if (why.shape !== 'text') rows.push(['clean?', 'not offered', why.reasoning]);
      }
      if (role) {
        const dir = role.direction ? ' ' + role.direction.from + ' → ' + role.direction.to : '';
        rows.push(['plays', role.role + dir, role.reasoning]);
      }
      // The code rung: the element this mark became, if it is inside a live artifact.
      const owner = s.live.map((aid) => s.nodes.get(aid)).find((a) => a && a.edges.some((e) => e.rel === 'has-part' && e.to === id));
      const ownCode = isLive ? codes[codes.length - 1] : (owner ? owner.reps.filter((r) => r.modality === 'code').pop() : null);
      if (ownCode) {
        const regs = (ownCode.data.regions || []);
        const mine = isLive ? null : regs.find((r) => r.nodeId === id);
        const m = mine && String(ownCode.data.code).match(new RegExp('<([a-z]+)[^>]*data-region="' + mine.id + '"'));
        rows.push(['code', isLive
          ? (codeKindOf(node) !== 'html' ? 'a running ' + codeKindOf(node) + (codeKindOf(node) === 'js' ? ' — code that runs when played' : '') : rung.genre && (rung.genre.genre === 'graph' || rung.genre.genre === 'mixed') ? 'a running diagram' : 'a running page')
          : (m ? '<' + m[1] + ' data-region="' + mine.id + '">' : 'part of ' + (MM.wordOf(owner) || 'an artifact')),
          isLive && rung.genre ? rung.genre.reasoning : '']);
      }
      if (rows.length) {
        html += '<div class="sep"></div><div class="eyebrow">reading</div><div class="ladder">';
        rows.forEach(([k, v, why, action]) => {
          html += '<div class="row"><span class="k">' + esc(k) + '</span><span class="v">' + esc(v) + '</span></div>';
          if (why) html += '<div class="why">' + esc(why) + '</div>';
          if (action) html += action;
        });
        html += '</div>';
      }
    }

    // Held interpretations — EVERY reading, from EVERY source, grouped by who
    // said it. Tiers are simultaneous, not an escalation ladder.
    const reads = MM.interpretationsOf(node, s.nodes);
    if (reads.length) {
      const groups = MM.bySource(reads);
      const gap = MM.disagreement(reads);

      html += '<div class="sep"></div><div class="eyebrow">read as' +
        (groups.length > 1 ? ' <span class="srccount">' + groups.length + ' sources</span>' : '') + '</div>';

      if (gap && gap.crossSource) {
        html += '<div class="gap">sources differ: ' +
          gap.labels.slice(0, 3).map((l) => esc(l.label)).join(' vs ') + '</div>';
      }

      html += '<div class="reads">';
      groups.forEach((g) => {
        const tier = g.interpretations[0].tier;
        html += '<div class="srchead"><span class="by">' + esc(g.label) + '</span>' +
          '<span class="tier">tier ' + tier + '</span></div>';
        g.interpretations.forEach((r, i) => {
          html += '<div class="read' + (i === 0 ? ' top' : '') + (r.blessed ? ' blessed' : '') + '">' +
            '<span class="type">' + esc(r.label) + '</span>' +
            '<span class="w">' + r.weight.toFixed(2) + '</span></div>';
          if (r.reasoning) html += '<div class="why">' + esc(r.reasoning) + '</div>';
        });
      });
      html += '</div>';
    }

    // What the writing says — every transcript, attributed. The one reading
    // that came in as pixels, and the model that gave it is named.
    if ((MM.strokePointsOf(node) || MM.isWord(node)) && !isArtifact && isWriting(node)) {
      const said = MM.transcriptsOf(node);
      html += '<div class="sep"></div><div class="eyebrow">handwriting</div>';
      if (said.length) {
        html += '<div class="reads">';
        said.forEach((t, i) => {
          html += '<div class="read' + (i === 0 ? ' top' : '') + '"><span class="type">“' + esc(t.text) + '”</span>' +
            '<span class="w">' + t.confidence.toFixed(2) + '</span></div>' +
            '<div class="why">by ' + esc(nameOfParticipant(t.source)) + '</div>';
        });
        html += '</div>';
        if (seeing().length) html += '<button class="mini" data-act="read" data-id="' + esc(id) + '">read it again</button>';
      } else if (seeing().length) {
        html += '<div class="why">not read yet</div><button class="mini" data-act="read" data-id="' + esc(id) + '">read it</button>';
      } else {
        html += '<div class="why">writing, unread — needs a model that can see (add one that says “sees”)</div>';
      }
    }

    // The engaging relations and the wires — not the peer/alignment ones,
    // which are true of nearly everything and would drown the list.
    const rels = node.edges.filter((e) =>
      ['near', 'touching', 'crossing', 'contains', 'inside', 'connects', 'connected-by', 'points-to', 'points-from', 'part-of'].includes(e.rel));
    if (rels.length) {
      html += '<div class="sep"></div><div class="eyebrow">relations</div>';
      const seen = new Set();
      rels.forEach((e) => {
        const key = e.rel + e.to;
        if (seen.has(key)) return;
        seen.add(key);
        const label = e.rel === 'part-of' ? 'part of ' + (MM.wordOf(s.nodes.get(e.to)) || e.to) : e.rel + ' ' + e.to;
        html += '<div class="row"><span class="k">' + (e.blessed ? 'blessed' : 'held') + '</span>' +
          '<span class="v">' + esc(label) + '</span></div>';
      });
    }

    // The maths: what follows from the reading, measured from the ink. A
    // circle has a radius; a triangle's angles add to 180°. Arithmetic on a
    // reading, not a reading — no confidence, nothing to argue with.
    const maths = !isArtifact && MM.strokePointsOf(node) ? MM.measure(node, s.nodes) : null;
    if (maths && maths.measures.length) {
      html += '<div class="sep"></div><div class="eyebrow">maths <span class="srccount">' + esc(maths.shape) + '</span></div>';
      const shown = maths.measures.filter((x) => x.key !== 'centreY');
      shown.forEach((x) => {
        const v = x.key === 'centre' && x.at ? '(' + Math.round(x.at.x) + ', ' + Math.round(x.at.y) + ')'
          : (Number.isFinite(x.value) ? x.value.toLocaleString('en-US') : '∞') + esc(x.unit);
        html += '<div class="row"><span class="k">' + esc(x.label) + '</span><span class="v">' + v + '</span></div>';
      });
    }

    const fp = MM.fingerprintOf(node);
    if (fp) {
      html += '<div class="sep"></div><div class="eyebrow">measured</div>' +
        '<div class="row"><span class="k">straight</span><span class="v">' + fp.straightness.toFixed(3) + '</span></div>' +
        '<div class="row"><span class="k">corners</span><span class="v">' + fp.corners + '</span></div>' +
        '<div class="row"><span class="k">closed</span><span class="v">' + (fp.isClosed ? 'yes' : 'no') + '</span></div>' +
        '<div class="row"><span class="k">size</span><span class="v">' + Math.round(fp.size) + 'px</span></div>';
    }

    inspectorEl.innerHTML = html;
  }

  function renderSummonScope(s) {
    const sum = s.summon;
    const reading = session.read(sum.enclosedIds);
    let html = '<div class="eyebrow">selection</div>';

    html += '<div class="row"><span class="k">holds</span><span class="v">' +
      sum.enclosedIds.length + ' mark' + (sum.enclosedIds.length === 1 ? '' : 's') + '</span></div>';
    html += '<div class="row"><span class="k">scope</span><span class="v">' + esc(sum.scopeSource) + '</span></div>';
    html += '<div class="why">' + esc(sum.scopeReasoning) + '</div>';
    // Which way this will compile — a page or a diagram — and what each mark plays.
    if (reading.genre) {
      html += '<div class="row"><span class="k">genre</span><span class="v">' + esc(reading.genre.genre) + '</span></div>';
      html += '<div class="why">' + esc(reading.genre.reasoning) + '</div>';
    }
    if (reading.roles && reading.roles.length) {
      html += '<div class="sep"></div><div class="eyebrow">roles</div>';
      reading.roles.forEach((r) => {
        const dir = r.direction ? ' ' + r.direction.from + ' → ' + r.direction.to : '';
        html += '<div class="row"><span class="k">' + esc(r.role) + '</span><span class="v">' + esc(r.id + dir) + '</span></div>';
      });
    }

    if (sum.onArtifact) {
      const art = s.nodes.get(sum.onArtifact.artifactId);
      html += '<div class="row"><span class="k">on</span><span class="v">' +
        esc(MM.wordOf(art) || sum.onArtifact.artifactId) + '</span></div>';
      html += '<div class="row"><span class="k">covers</span><span class="v">' +
        (sum.onArtifact.regionIds.length ? esc(sum.onArtifact.regionIds.join(', ')) : 'the whole page') + '</span></div>';
    }

    // The concepts these marks read as. Tier 0, from measured relations — this
    // is what the palette is offering from, so it is what the inspector must
    // explain. Several at once, ranked, like every other reading in the engine.
    if (reading.concepts.length) {
      html += '<div class="sep"></div><div class="eyebrow">read as' +
        (reading.concepts.length > 1 ? ' <span class="srccount">' + reading.concepts.length + ' concepts</span>' : '') +
        '</div><div class="reads">';
      reading.concepts.forEach((c, i) => {
        html += '<div class="read' + (i === 0 ? ' top' : '') + '">' +
          '<span class="type">' + esc(c.concept) + '</span>' +
          '<span class="w">' + c.confidence.toFixed(2) + '</span></div>';
        html += '<div class="why">' + esc(c.reasoning) + '</div>';
        if (c.roles) {
          for (const role of Object.keys(c.roles)) {
            html += '<div class="row"><span class="k">' + esc(role) + '</span>' +
              '<span class="v">' + esc(c.roles[role].join(', ')) + '</span></div>';
          }
        }
      });
      html += '</div>';
    } else {
      html += '<div class="sep"></div><div class="why">No concept matched yet.</div>';
    }

    // The relations underneath, which is where those readings came from.
    const rels = reading.relations.filter((r, i, all) =>
      all.findIndex((x) => x.kind === r.kind && x.from === r.from && x.to === r.to) === i);
    if (rels.length) {
      const byKind = {};
      rels.forEach((r) => { byKind[r.kind] = (byKind[r.kind] || 0) + 1; });
      html += '<div class="sep"></div><div class="eyebrow">relations</div>';
      Object.keys(byKind).sort().forEach((kind) => {
        html += '<div class="row"><span class="k">' + esc(kind) + '</span>' +
          '<span class="v">' + byKind[kind] + '</span></div>';
      });
      const strongest = rels.slice().sort((a, b) => b.strength - a.strength)[0];
      if (strongest) html += '<div class="why">' + esc(strongest.kind + ': ' + strongest.reasoning) + '</div>';
    }

    inspectorEl.innerHTML = html;
  }

  // Debug handle. This is a reference surface for the engine, so reading the
  // graph from the console is a feature, not a leak.

// ===== replay =====
// Provides: replay: a recorded session stepped through (rpGoTo, rpStart, startReplay).
// Uses: core, view, render, input.
// A fragment of one closure: Demos/build-surface.mjs concatenates surface/*.js
// in name order inside `(function () { ... })();`. Shared state is the
// closure's; no imports, no exports, no build step beyond the concatenation.

  // ===== Replay: a recorded session as a figure =============================
  //
  // State is a pure function of the log, so a session recorded once — every
  // model reply captured as the event it was — replays here with no model
  // attached, at any step, inspectable. Load a prefix to stand at a step;
  // draw afterwards and the recording continues with your marks.
  const rp = { rec: null, step: -1, timer: null };
  const rpEl = document.getElementById('replay');
  const rpCaption = document.getElementById('rpCaption'), rpStep = document.getElementById('rpStep');
  const rpScrub = document.getElementById('rpScrub'), rpPlay = document.getElementById('rpPlay');

  function rpGoTo(i) {
    if (!rp.rec) return;
    const steps = rp.rec.steps;
    i = Math.max(0, Math.min(steps.length - 1, i));
    rp.step = i;
    session.load(rp.rec.events.slice(0, steps[i].after));
    rpScrub.value = String(i);
    rpStep.textContent = (i + 1) + ' / ' + steps.length;
    rpCaption.innerHTML = '<b>' + (i + 1) + '.</b> ' + esc(steps[i].caption);
    if (i === steps.length - 1) rpStop();
  }
  function rpStop() { if (rp.timer) { clearInterval(rp.timer); rp.timer = null; } rpPlay.textContent = '▶'; }
  function rpStart() {
    if (!rp.rec) return;
    if (rp.step >= rp.rec.steps.length - 1) rpGoTo(0);
    rpStop();
    rp.timer = setInterval(() => rpGoTo(rp.step + 1), Number(params.get('every') || 3200));
    rpPlay.textContent = '❚❚';
  }
  async function startReplay(url) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error('HTTP ' + res.status);
      rp.rec = await res.json();
    } catch (err) {
      flash('could not load the recording (' + err.message + ')');
      return;
    }
    rpScrub.max = String(rp.rec.steps.length - 1);
    rpEl.hidden = false;
    // Fit the whole recording once, so stepping never moves the view.
    session.load(rp.rec.events);
    fitAll();
    rpGoTo(0);
    if (params.has('autoplay')) rpStart();
  }
  rpScrub.oninput = () => { rpStop(); rpGoTo(Number(rpScrub.value)); };
  document.getElementById('rpPrev').onclick = () => { rpStop(); rpGoTo(rp.step - 1); };
  document.getElementById('rpNext').onclick = () => { rpStop(); rpGoTo(rp.step + 1); };
  rpPlay.onclick = () => (rp.timer ? rpStop() : rpStart());
  addEventListener('keydown', (e) => {
    if (!rp.rec || e.target !== document.body) return;
    if (e.key === 'ArrowRight') { rpStop(); rpGoTo(rp.step + 1); }
    else if (e.key === 'ArrowLeft') { rpStop(); rpGoTo(rp.step - 1); }
    else if (e.key === ' ') { e.preventDefault(); rpPlay.onclick(); }
  });
  // A stroke of the reader's own continues the recording from where it stands.
  canvas.addEventListener('pointerdown', () => { if (rp.rec && rp.timer) { rpStop(); rpCaption.innerHTML = '<b>' + (rp.step + 1) + '.</b> ' + esc(rp.rec.steps[rp.step].caption) + ' <span style="color:var(--dim)">— continuing from here with your marks</span>'; } });

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

  /** What drives a definition: the newest behaviour a human gave it, else the built-in. */
  function behaviourOf(s, defId) {
    const n = s.nodes.get(defId);
    const b = n && MM.blessedBehaviourOf(n);
    return wiredBehaviourOf(s, defId, (b && b.terms && b.terms.length) ? b : BUILTIN_BEHAVIOUR);
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
        e.shares = r.steering.terms; // each verb's share of the last step, for the panel
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

  /** The last step's shares for a definition's first body: what each verb is doing right now. */
  function liveShares(defId) {
    const d = tank.defs.get(defId);
    if (!d || !d.order.length) return null;
    return d.bodies.get(d.order[0]).shares || null;
  }

  // ===== Acting it out ======================================================
  // Drag a body while its clock runs and the path is a demonstration: sampled
  // against where everything else was at each moment, fitted onto the verb
  // basis, and held on the definition with each term's share and the residual
  // named. The human then gives it in their own name, or not.
  let demo = null; // { defId, bodyId, samples: [{x, y, t, others}], t0 }

  /** The body a node belongs to, if it is in a playing tank. */
  function bodyOfNode(s, nodeId) {
    for (const [defId, d] of tank.defs) {
      if (!s.clocks[defId] || !s.clocks[defId].playing) continue;
      for (const id of d.order) {
        const e = d.bodies.get(id);
        if (e.entry.memberIds.includes(nodeId)) return { defId, bodyId: id };
      }
    }
    return null;
  }

  /** Start a demonstration if the selection is a body in a running tank. */
  function demoBegin(selection, w) {
    const s = session.getState();
    const hit = selection.map((id) => bodyOfNode(s, id)).find(Boolean);
    if (!hit) return false;
    demo = { defId: hit.defId, bodyId: hit.bodyId, samples: [], t0: performance.now() / 1000 };
    demoSample(w, 0);
    canvas.style.cursor = 'grabbing';
    return true;
  }

  function demoSample(w, t) {
    const d = tank.defs.get(demo.defId);
    const e = d && d.bodies.get(demo.bodyId);
    if (!e) return;
    // The hand places the body; the tank keeps running around it.
    e.body = { ...e.body, x: w.x, y: w.y };
    refreshPlacements();
    const others = allBodies().filter((b) => b.id !== demo.bodyId).map((b) => ({ ...b }));
    demo.samples.push({ x: w.x, y: w.y, t: t, others: others });
  }

  function demoMove(w) {
    if (!demo) return false;
    demoSample(w, performance.now() / 1000 - demo.t0);
    render(state);
    return true;
  }

  /** The path fitted onto the basis, held on the definition — nothing blessed. */
  function demoEnd() {
    if (!demo) return false;
    const done = demo;
    demo = null;
    canvas.style.cursor = 'crosshair';
    actOut(done.defId, done.bodyId, done.samples);
    return true;
  }

  function actOut(defId, bodyId, samples) {
    const s = session.getState();
    const d = tank.defs.get(defId);
    const e = d && d.bodies.get(bodyId);
    if (!e || samples.length < 3) { flash('too short to read as a behaviour'); return null; }
    // A sample recorded by the hand carries where everything else was; one
    // fed in bare (a test, a replayed path) sees the tank as it stands now.
    const now = allBodies().filter((b) => b.id !== bodyId).map((b) => ({ ...b }));
    const worldAt = (t, me) => {
      let best = samples[0];
      for (const smp of samples) if (Math.abs(smp.t - t) < Math.abs(best.t - t)) best = smp;
      return MM.worldOf(me, best.others || now, [], t, FIXED_DT, () => 0.5);
    };
    const behaviour = behaviourOf(s, defId);
    const basis = MM.VERBS.filter((v) => v !== 'wander' && v !== 'spawn' && v !== 'expire');
    // The verbs steer toward a speed. A hand drags at its own pace, and a
    // path faster than the verbs' speed reads as every verb pulling back —
    // so the fit is made at the pace that was shown, and the behaviour keeps it.
    let peak = 0;
    for (let i = 1; i < samples.length; i++) {
      const dt = Math.max(1e-3, samples[i].t - samples[i - 1].t);
      peak = Math.max(peak, Math.hypot(samples[i].x - samples[i - 1].x, samples[i].y - samples[i - 1].y) / dt);
    }
    const speed = Math.max(behaviour.speed || MM.DEFAULT_SPEED, Math.round(peak * 0.8));
    const fitted = MM.fit(samples.map((p) => ({ x: p.x, y: p.y, t: p.t })), basis, worldAt, speed, { id: bodyId, name: e.body.name, w: e.body.w, h: e.body.h });
    if (!fitted.terms.length) { flash('the path fits no verb — ' + fitted.reasoning); return fitted; }
    session.behave({
      nodeId: defId,
      behaviour: { terms: fitted.terms, source: 'demo', speed: speed, residual: fitted.residual, explained: fitted.explained, reasoning: fitted.reasoning + ' at ' + speed + ' px/s' },
      participantId: MM.TIER0_PARTICIPANT,
      at: Date.now(),
    });
    flash('acted out: ' + MM.describeBehaviour({ terms: fitted.terms }) + ' — ' + Math.round((1 - fitted.residual) * 100) + '% explained; see the panel to use it');
    return fitted;
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
    if (playing && !tank.raf) { tank.last = performance.now(); tank.acc = 0; tank.raf = nextFrame(tankLoop); }
    if (!playing && tank.raf) { tank.raf.cancel(); tank.raf = 0; }
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
    tank.raf = nextFrame(tankLoop);
  }

// ===== frames =====
// Provides: frames on the surface — wiredCodeOf/wiredBehaviourOf (the harness applied where members render
//   and run), frame and control rendering, the knob drag, makeControl/makeFrame/frameLike for the palette,
//   frameTemplatesFor (conjure by resemblance and by name), exportFrameFiles.
// Uses: core, artifacts (frames map), render, kinds, clocks.
// A fragment of one closure: Demos/build-surface.mjs concatenates surface/*.js
// in name order inside `(function () { ... })();`. Shared state is the
// closure's; no imports, no exports, no build step beyond the concatenation.

  // ===== The harness, applied ==============================================
  // A frame references its members and wires their ports. Nothing is written
  // back: where a member renders or runs, it is asked for its WIRED code —
  // the newest frame that holds it, resolved from the current values.
  function framesHolding(s, id) {
    return s.artifacts
      .map((aid) => s.nodes.get(aid))
      .filter((n) => n && MM.isFrame(n) && !n.reps.some((r) => r.modality === 'erased') && MM.frameOfNode(n).members.includes(id));
  }

  /** The member's code with its connections applied, or null when nothing feeds it. */
  function wiredCodeOf(s, id) {
    const holders = framesHolding(s, id);
    for (let i = holders.length - 1; i >= 0; i--) {
      const r = MM.resolveFrame(MM.frameOfNode(holders[i]), s.nodes);
      if (r.code[id] !== undefined) return r.code[id];
    }
    return null;
  }

  /** A definition's behaviour with its wired speed and weights, or the behaviour itself. */
  function wiredBehaviourOf(s, id, behaviour) {
    const holders = framesHolding(s, id);
    for (let i = holders.length - 1; i >= 0; i--) {
      const r = MM.resolveFrame(MM.frameOfNode(holders[i]), s.nodes);
      const w = r.behaviour[id];
      if (!w) continue;
      const terms = behaviour.terms.map((t, k) => (w.weights[k] !== undefined ? { ...t, weight: w.weights[k] } : t));
      return { ...behaviour, terms: terms, speed: w.speed !== undefined ? w.speed : behaviour.speed };
    }
    return behaviour;
  }

  // ===== Making them ==========================================================
  /** The circled line and dot become a control: the drawing IS the slider. */
  function makeControl(sum) {
    const at = Date.now();
    const id = session.bless({ summonId: sum.id, name: 'slider', at: at });
    if (!id) return null;
    session.attachCode({ participantId: MM.LOCAL_PARTICIPANT, nodeId: id, kind: 'control', code: JSON.stringify({ min: 0, max: 1 }), at: at + 1 });
    flash('a slider — drag the knob to set it');
    return id;
  }

  /** One connection per input port, best first, so a value feeds each place it fits without fighting. */
  function bestWiring(ids, nodes) {
    const taken = new Set();
    const out = [];
    for (const c of MM.connectionsFor(ids, nodes)) {
      const key = c.to.id + '|' + c.to.port;
      if (taken.has(key)) continue;
      taken.add(key);
      out.push({ from: c.from, to: c.to, reasoning: c.reasoning });
    }
    return out;
  }

  /** The artifacts among some ids, each taken to its definition once. */
  function artifactsIn(s, ids) {
    return [...new Set(ids.filter((id) => s.artifacts.includes(id)))];
  }

  function makeFrame(sum, name) {
    const s = session.getState();
    const members = artifactsIn(s, sum.enclosedIds);
    if (!members.length) return null;
    const connections = bestWiring(members, s.nodes);
    const at = Date.now();
    session.dismiss(sum.id, at);
    const id = session.frame({ ids: members, name: name || 'frame', connections: connections, at: at + 1 });
    if (id) flash('framed ' + members.length + ' — ' + MM.describeFrame(MM.frameOfNode(s.nodes.get(id) || session.getState().nodes.get(id)), session.getState().nodes));
    return id;
  }

  /** A frame built once, offered again: the template's connections mapped onto members with the same ports. */
  function frameLike(sum, template) {
    const s = session.getState();
    const members = artifactsIn(s, sum.enclosedIds);
    const tf = MM.frameOfNode(template);
    const ifaces = new Map(members.map((id) => [id, MM.interfacesOf(s.nodes.get(id), s.nodes)]));
    const connections = [];
    for (const c of tf.connections) {
      const src = members.find((id) => ifaces.get(id).offers.some((o) => o.id === c.from.port));
      const dst = members.find((id) => id !== src && ifaces.get(id).accepts.some((a) => a.id === c.to.port));
      if (src && dst) connections.push({ from: { id: src, port: c.from.port }, to: { id: dst, port: c.to.port }, reasoning: 'as in ' + (MM.wordOf(template) || template.id) });
    }
    const at = Date.now();
    session.dismiss(sum.id, at);
    return session.frame({ ids: members, name: MM.wordOf(template) || 'frame', connections: connections, at: at + 1 });
  }

  /**
   * Frames this loop could be: by name, when writing in the loop says a
   * frame's name; by resemblance, when a frame's members are the same kinds.
   */
  function frameTemplatesFor(s, ids) {
    const members = artifactsIn(s, ids);
    if (!members.length) return [];
    const kindsOf = (list) => list.map((id) => { const n = s.nodes.get(id); const r = n && codeRepOf(n); return (r && r.data.kind) || (n && MM.blessedBehaviourOf(n) ? 'behaviour' : 'ink'); }).sort().join(',');
    const mine = kindsOf(members);
    const said = ids.map((id) => { const n = s.nodes.get(id); return n && MM.transcriptOf(n); }).filter(Boolean).map((w) => w.toLowerCase().trim());
    const out = [];
    for (const aid of s.artifacts) {
      const n = s.nodes.get(aid);
      if (!n || !MM.isFrame(n) || members.includes(aid)) continue;
      const name = (MM.wordOf(n) || '').toLowerCase();
      if (name && said.includes(name)) { out.push({ frame: n, how: 'name', why: 'you wrote “' + name + '” beside them' }); continue; }
      if (kindsOf(MM.frameOfNode(n).members) === mine) out.push({ frame: n, how: 'resemblance', why: 'the same kinds of thing, wired the same way' });
    }
    return out;
  }

  function exportFrameFiles(id) {
    const s = session.getState();
    const n = s.nodes.get(id);
    if (!n || !MM.isFrame(n)) return null;
    return MM.exportFrame(MM.wordOf(n) || 'frame', MM.frameOfNode(n), s.nodes);
  }

  // ===== The knob: dragging it sets the value ================================
  // A control's knob may be taken without selecting anything: the hand lands
  // on it and slides it along the track. One `move` event when it lets go;
  // the value is read from where the ink now stands.
  let knobDrag = null; // { controlId, knob, track: {a, b}, start, last }

  function knobAt(s, w) {
    for (const aid of s.artifacts) {
      const n = s.nodes.get(aid);
      const rep = n && codeRepOf(n);
      if (!rep || rep.data.kind !== 'control') continue;
      const members = n.edges.filter((e) => e.rel === 'has-part').map((e) => e.to);
      const sl = MM.sliderOf(members, s.nodes, 1 / view.zoom);
      if (!sl) continue;
      const kb = MM.boundsOf(s.nodes.get(sl.knob));
      const c = { x: (kb.minX + kb.maxX) / 2, y: (kb.minY + kb.maxY) / 2 };
      const r = Math.max(kb.maxX - kb.minX, kb.maxY - kb.minY) / 2 + wpx(10);
      if (Math.hypot(w.x - c.x, w.y - c.y) <= r) {
        const pts = MM.strokePointsOf(s.nodes.get(sl.track));
        return { controlId: aid, knob: sl.knob, track: { a: pts[0], b: pts[pts.length - 1] }, centre: c };
      }
    }
    return null;
  }

  function knobBegin(w) {
    const hit = knobAt(state, w);
    if (!hit) return false;
    knobDrag = { ...hit, start: w, last: w };
    canvas.style.cursor = 'ew-resize';
    return true;
  }
  function knobMove(w) {
    if (!knobDrag) return false;
    knobDrag.last = w;
    render(state);
    return true;
  }
  /** Where the knob would land: the hand's point projected onto the track. */
  function knobPreview() {
    if (!knobDrag) return null;
    const { a, b } = knobDrag.track;
    const p = MM.alongSegment(a, b, knobDrag.last);
    const q = { x: a.x + (b.x - a.x) * p.t, y: a.y + (b.y - a.y) * p.t };
    return { knob: knobDrag.knob, dx: q.x - knobDrag.centre.x, dy: q.y - knobDrag.centre.y, controlId: knobDrag.controlId };
  }
  function knobEnd() {
    if (!knobDrag) return false;
    const pv = knobPreview();
    knobDrag = null;
    canvas.style.cursor = 'crosshair';
    if (pv && Math.hypot(pv.dx, pv.dy) > 0.5) session.move({ ids: [pv.knob], dx: pv.dx, dy: pv.dy, at: Date.now() });
    else render(state);
    return true;
  }

  // ===== Rendering ==============================================================
  /** Frames: a dashed bracket around the members, the name, and each connection as a thin wire. */
  function renderFrames(s) {
    for (const aid of s.artifacts) {
      const n = s.nodes.get(aid);
      if (!n || !MM.isFrame(n)) continue;
      const f = MM.frameOfNode(n);
      const bs = f.members.map((id) => MM.boundsOf(s.nodes.get(id))).filter(Boolean);
      if (!bs.length) continue;
      const b = union(bs);
      const pad = wpx(22);
      ctx.setLineDash([wpx(6), wpx(5)]);
      ctx.strokeStyle = `rgba(${C.goldRGB},0.5)`;
      ctx.lineWidth = wpx(1);
      ctx.strokeRect(b.minX - pad, b.minY - pad, b.maxX - b.minX + pad * 2, b.maxY - b.minY + pad * 2);
      ctx.setLineDash([]);
      text((MM.wordOf(n) || 'frame') + '  ·  frame', b.minX - pad, b.minY - pad - wpx(8), C.gold);
      const centre = (id) => { const bb = MM.boundsOf(s.nodes.get(id)); return bb ? { x: (bb.minX + bb.maxX) / 2, y: (bb.minY + bb.maxY) / 2 } : null; };
      for (const c of f.connections) {
        const p = centre(c.from.id), q = centre(c.to.id);
        if (!p || !q) continue;
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(q.x, q.y);
        ctx.strokeStyle = `rgba(${C.goldRGB},0.35)`; ctx.lineWidth = wpx(1); ctx.stroke();
        const mx = (p.x + q.x) / 2, my = (p.y + q.y) / 2;
        text(c.from.port + ' → ' + c.to.port, mx, my - wpx(4), `rgba(${C.labelRGB},0.7)`);
      }
    }
    // Controls: the value beside the knob, and the knob under a hand while it slides.
    const pv = knobPreview();
    for (const aid of s.artifacts) {
      const n = s.nodes.get(aid);
      const rep = n && codeRepOf(n);
      if (!rep || rep.data.kind !== 'control') continue;
      const c = MM.controlOf(n, s.nodes);
      if (!c) continue;
      const members = n.edges.filter((e) => e.rel === 'has-part').map((e) => e.to);
      const sl = MM.sliderOf(members, s.nodes, 1 / view.zoom);
      if (!sl) continue;
      const kb = MM.boundsOf(s.nodes.get(sl.knob));
      let kx = (kb.minX + kb.maxX) / 2, ky = (kb.minY + kb.maxY) / 2;
      if (pv && pv.controlId === aid) {
        kx += pv.dx; ky += pv.dy;
        ctx.beginPath(); ctx.arc(kx, ky, Math.max(wpx(5), (kb.maxX - kb.minX) / 2), 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${C.goldRGB},0.6)`; ctx.fill();
      }
      const shown = pv && pv.controlId === aid ? (() => { const p = MM.alongSegment(knobDrag.track.a, knobDrag.track.b, { x: kx, y: ky }); return c.min + (c.max - c.min) * p.t; })() : c.value;
      text((+shown.toFixed(2)).toString(), kx + wpx(10), ky - wpx(10), C.gold);
    }
  }

// ===== folder =====
// Provides: the folder as the canvas — openFolder/openStatic/openStore (discovery into artifacts,
//   per-participant logs merged), autosave (to the folder, else browser storage), the live budget
//   (liveSet), the grid and focus views (setViewMode, focusOn), imageUrlFor, folderStatus.
// Uses: core, view (fitAll, afterViewChange), artifacts, render.
// A fragment of one closure: Demos/build-surface.mjs concatenates surface/*.js
// in name order inside `(function () { ... })();`. Shared state is the
// closure's; no imports, no exports, no build step beyond the concatenation.

  // ===== The folder ==========================================================
  // Nothing is invented: a canvas is a folder. Every file of a known kind is
  // an artifact; each participant appends to its own log under .metamedium/;
  // the canvas is the merge (ARCHITECTURE-v8 §11). Opening a folder loads the
  // merged logs, then brings in any file not yet on the board as an import —
  // an event in THIS participant's log, so the next machine to pull sees the
  // same board without discovering twice.
  const PARTICIPANT_KEY = 'mm-participant';
  const LOCAL_LOG_KEY = 'mm-log';
  const CARD = { w: 360, h: 240, gap: 40, cols: 4 };
  const LIVE_BUDGET = 12;

  const folder = {
    store: null, how: 'none', name: '',
    me: (() => { try { return localStorage.getItem(PARTICIPANT_KEY) || 'local'; } catch (err) { return 'local'; } })(),
    myPrevious: [], loadedCount: 0, entries: [], truncated: false,
    urls: new Map(), saveTimer: 0, lastSave: '', saving: false, error: '',
  };

  function setParticipant(name) {
    folder.me = String(name || 'local').trim() || 'local';
    try { localStorage.setItem(PARTICIPANT_KEY, folder.me); } catch (err) { /* private mode */ }
  }

  /** The artifact that already stands for a path, if any. */
  function artifactForPath(s, path) {
    for (const id of s.artifacts) {
      const n = s.nodes.get(id);
      const r = n && codeRepOf(n);
      if (r && r.data.path === path && !n.reps.some((x) => x.modality === 'erased')) return id;
    }
    return null;
  }

  /** A blob URL for a picture in the folder, made once. */
  function imageUrlFor(path) {
    return folder.urls.get(path) || null;
  }

  async function openFolder() {
    if (!window.showDirectoryPicker) { flash('this browser cannot open a folder — Chrome and Edge can'); return null; }
    let handle;
    try { handle = await window.showDirectoryPicker({ mode: 'readwrite' }); } catch (err) { return null; }
    const store = new MM.FolderStore(handle);
    return openStore(store, 'folder', handle.name);
  }

  /**
   * A repository as the folder (ARCHITECTURE-v8 §18): `owner/repo`,
   * `owner/repo@branch`, `owner/repo/some/dir`. Reads need no token; writes
   * need one the user has pasted, held on this device only when asked.
   */
  const GIT_TOKEN_KEY = 'mm-git-token';
  async function openGit(spec, token, remember) {
    const parsed = MM.parseGitSpec(spec);
    if (!parsed) { flash('a repository is owner/repo, owner/repo@branch or owner/repo/dir'); return null; }
    let tok = token;
    if (!tok) { try { tok = localStorage.getItem(GIT_TOKEN_KEY) || undefined; } catch (err) { tok = undefined; } }
    if (token && remember) { try { localStorage.setItem(GIT_TOKEN_KEY, token); } catch (err) { /* private mode */ } }
    const store = new MM.GitStore(parsed, (url, init) => fetch(url, init), tok);
    return openStore(store, 'git', spec);
  }

  async function openStatic(base) {
    const store = new MM.StaticStore(base, (url) => fetch(url));
    return openStore(store, 'static', base);
  }

  /**
   * Open any store: load the merged logs, discover the files, place what is
   * new. Opening the same store again is what a second machine does after a
   * pull — the board comes back and nothing is discovered twice.
   */
  async function openStore(store, how, name) {
    folder.store = store; folder.how = how || 'store'; folder.name = name || ''; folder.error = '';
    let logs = {};
    try { logs = await store.readLogs(); } catch (err) { folder.error = 'could not read the logs: ' + (err.message || err); }
    const merged = MM.mergeLogs(logs);
    const meKey = MM.participantOfLog(MM.logPathFor(folder.me));
    folder.myPrevious = (logs[meKey] || []).slice();
    session.load(merged);
    // What was loaded is everyone's; from here on, every event is this
    // participant's — including the mark this device re-teaches at open.
    folder.loadedCount = session.getEvents().length;
    folder.lastSave = '';
    // The device's mark is re-taught only when no log already teaches one.
    if (!merged.some((ev) => ev.type === 'teach')) restoreMark();
    let entries = [];
    try { entries = await store.list(); } catch (err) { folder.error = 'could not list the folder: ' + (err.message || err); }
    folder.entries = entries; folder.truncated = !!store.truncated;
    await discover(entries);
    render(session.getState());
    fitAll();
    flash('opened ' + (folder.name || 'a folder') + ': ' + entries.length + ' file' + (entries.length === 1 ? '' : 's') + (folder.truncated ? ' shown — the folder holds more' : ''));
    return folder;
  }

  /** Every file not yet on the board becomes an artifact, laid out in a grid below what is there. */
  async function discover(entries) {
    const s0 = session.getState();
    const boxes = s0.contentIds.map((id) => MM.boundsOf(s0.nodes.get(id))).filter(Boolean);
    const below = boxes.length ? union(boxes).maxY + CARD.gap * 2 : 0;
    let placed = 0;
    for (const e of entries) {
      const s = session.getState();
      if (artifactForPath(s, e.path)) continue;
      let content;
      try { content = await folder.store.read(e.path); } catch (err) { continue; }
      const col = placed % CARD.cols, row = Math.floor(placed / CARD.cols);
      const bounds = { minX: col * (CARD.w + CARD.gap), minY: below + row * (CARD.h + CARD.gap), maxX: col * (CARD.w + CARD.gap) + CARD.w, maxY: below + row * (CARD.h + CARD.gap) + CARD.h };
      placed++;
      if (e.kind === 'png' || e.kind === 'jpg') {
        try { folder.urls.set(e.path, URL.createObjectURL(new Blob([content], { type: e.kind === 'png' ? 'image/png' : 'image/jpeg' }))); } catch (err) { /* no url */ }
        session.import({ kind: e.kind, path: e.path, bounds: bounds, code: '', at: Date.now() });
      } else {
        session.import({ kind: e.kind, path: e.path, bounds: bounds, code: String(content), at: Date.now() });
      }
    }
    return placed;
  }

  // ===== Autosave: the log is saved as it grows ==============================
  // To the folder when there is one — this participant's own file, rewritten
  // whole (nobody else writes it) — else to browser storage, so a reload
  // replays and a crash loses nothing.
  function myLogNow() {
    const evs = session.getEvents();
    folder.loadedCount = Math.min(folder.loadedCount, evs.length);
    const present = new Set(evs.slice(0, folder.loadedCount).map((e) => JSON.stringify(e)));
    const kept = folder.myPrevious.filter((e) => present.has(JSON.stringify(e)));
    return kept.concat(evs.slice(folder.loadedCount));
  }

  function scheduleSave() {
    clearTimeout(folder.saveTimer);
    folder.saveTimer = setTimeout(saveNow, folder.store ? 300 : 900);
  }

  /** A cheap key for "has the log changed": its length and its last event's time. */
  function logKey(evs) {
    const last = evs[evs.length - 1];
    return evs.length + ':' + (last ? (last.at || 0) + ':' + last.type : '');
  }

  async function saveNow() {
    const evs = session.getEvents();
    if (folder.store && folder.store.capabilities().write) {
      const mine = myLogNow();
      const text = MM.encodeLog(mine);
      if (text === folder.lastSave) return;
      folder.saving = true;
      try { await folder.store.write(MM.logPathFor(folder.me), text); folder.lastSave = text; folder.error = ''; }
      catch (err) { folder.error = 'could not save: ' + (err.message || err); }
      folder.saving = false;
    } else if (!folder.store) {
      // Browser storage holds the whole log; writing it is the one cost here,
      // so it is written only when the log actually changed.
      const key = logKey(evs);
      if (key === folder.lastSave) return;
      folder.lastSave = key;
      try { localStorage.setItem(LOCAL_LOG_KEY, JSON.stringify(evs)); } catch (err) { /* storage full or private */ }
    }
  }

  /** What browser storage held from last time, when there is no folder. */
  function restoreLocalLog() {
    if (params.has('replay') || params.has('fresh')) return false;
    try {
      const raw = localStorage.getItem(LOCAL_LOG_KEY);
      if (!raw) return false;
      const evs = JSON.parse(raw);
      if (!Array.isArray(evs) || !evs.length) return false;
      session.load(evs);
      return true;
    } catch (err) { return false; }
  }
  function forgetLocalLog() {
    try { localStorage.removeItem(LOCAL_LOG_KEY); } catch (err) { /* nothing */ }
  }

  function folderStatus() {
    if (!folder.store) return '';
    const n = folder.entries.length;
    return (folder.how === 'static' ? 'site' : folder.how === 'git' ? 'repo' : 'folder') + (folder.name ? ' ' + folder.name : '') + ' · ' + n + ' file' + (n === 1 ? '' : 's') +
      (folder.truncated ? '+' : '') + (folder.error ? ' · ' + folder.error : folder.store.capabilities().write ? (folder.saving ? ' · saving' : ' · saved') : ' · read-only');
  }

  // ===== The live budget =======================================================
  // Only the nearest N live artifacts render as iframes; the rest are parked
  // cards. Panning swaps them. The status line says how many are live.
  function liveSet(s) {
    const live = s.live.filter((id) => !s.nodes.get(id).reps.some((r) => r.modality === 'erased'));
    if (live.length <= LIVE_BUDGET) return new Set(live);
    const c = screenToWorld(innerWidth / 2, innerHeight / 2);
    const scored = live.map((id) => {
      const b = MM.boundsOf(s.nodes.get(id));
      const d = b ? Math.hypot((b.minX + b.maxX) / 2 - c.x, (b.minY + b.maxY) / 2 - c.y) : Infinity;
      return { id, d };
    }).sort((p, q) => p.d - q.d);
    return new Set(scored.slice(0, LIVE_BUDGET).map((x) => x.id));
  }

  // ===== Three views, one log ==================================================
  // Canvas is the pure form; grid surfaces every artifact as a card, sortable;
  // focus is one artifact filling the screen, prev and next through the
  // grid's order. Lenses over the same log — a card is the artifact.
  const gridEl = document.getElementById('grid');
  let viewMode = 'canvas';
  let gridSort = 'name';
  let focusIndex = -1;

  function gridOrder(s) {
    const ids = s.artifacts.filter((id) => !s.nodes.get(id).reps.some((r) => r.modality === 'erased'));
    const key = (id) => {
      const n = s.nodes.get(id);
      const r = codeRepOf(n);
      if (gridSort === 'kind') return (r ? r.data.kind : MM.isFrame(n) ? 'frame' : 'drawing') + ' ' + (MM.wordOf(n) || '');
      if (gridSort === 'recency') return String(1e15 - (n.createdAt || 0)).padStart(16, '0');
      if (gridSort === 'folder') return (r && r.data.path ? r.data.path : '~' + (MM.wordOf(n) || ''));
      return (MM.wordOf(n) || id).toLowerCase();
    };
    return ids.sort((a, b) => (key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0));
  }

  function setViewMode(mode) {
    viewMode = mode;
    if (mode === 'grid') { renderGrid(session.getState()); gridEl.hidden = false; }
    else gridEl.hidden = true;
    document.getElementById('gridBtn').setAttribute('aria-pressed', String(mode === 'grid'));
    if (mode === 'canvas') focusIndex = -1;
  }

  function renderGrid(s) {
    const order = gridOrder(s);
    let html = '<div class="gridBar"><b>' + order.length + '</b> artifact' + (order.length === 1 ? '' : 's') +
      ' · sort <button data-sort="name">name</button><button data-sort="kind">kind</button><button data-sort="recency">recency</button><button data-sort="folder">folder</button>' +
      '<span class="how">click a card to focus it; Esc back to the canvas</span></div><div class="cards">';
    for (const id of order) {
      const n = s.nodes.get(id);
      const r = codeRepOf(n);
      const kind = r ? r.data.kind : MM.isFrame(n) ? 'frame' : 'drawing';
      const path = r && r.data.path ? r.data.path : '';
      const preview = r && kind !== 'png' && kind !== 'jpg' ? esc(String(r.data.code).slice(0, 160)) : '';
      const img = (kind === 'png' || kind === 'jpg') && r && imageUrlFor(r.data.path) ? '<img src="' + imageUrlFor(r.data.path) + '" alt="">' : '';
      html += '<button class="card" data-id="' + esc(id) + '"><span class="name">' + esc(MM.wordOf(n) || id) + '</span><span class="kind">' + esc(kind) + (path ? ' · ' + esc(path) : '') + '</span>' + (img || '<pre>' + preview + '</pre>') + '</button>';
    }
    gridEl.innerHTML = html + '</div>';
  }

  gridEl.addEventListener('click', (e) => {
    const sortBtn = e.target.closest && e.target.closest('button[data-sort]');
    if (sortBtn) { gridSort = sortBtn.getAttribute('data-sort'); renderGrid(session.getState()); return; }
    const card = e.target.closest && e.target.closest('button.card');
    if (card) focusOn(card.getAttribute('data-id'));
  });

  /** Fit one artifact to the screen; prev and next walk the grid's order. */
  function focusOn(id) {
    const s = session.getState();
    const order = gridOrder(s);
    focusIndex = order.indexOf(id);
    const b = MM.boundsOf(s.nodes.get(id));
    if (!b) return;
    setViewMode('focus');
    const pad = Math.max(40, Math.min(innerWidth, innerHeight) / 8);
    const w = Math.max(1, b.maxX - b.minX), h = Math.max(1, b.maxY - b.minY);
    view.zoom = clampZoom(Math.min((innerWidth - pad * 2) / w, (innerHeight - pad * 2) / h, 4));
    view.panX = (innerWidth - w * view.zoom) / 2 - b.minX * view.zoom;
    view.panY = (innerHeight - h * view.zoom) / 2 - b.minY * view.zoom;
    afterViewChange();
    flash('focus: ' + (MM.wordOf(s.nodes.get(id)) || id) + ' · ← → for the next, Esc for the canvas');
  }
  function focusStep(delta) {
    const order = gridOrder(session.getState());
    if (!order.length) return;
    const i = ((focusIndex < 0 ? 0 : focusIndex + delta) + order.length) % order.length;
    focusOn(order[i]);
  }

  document.getElementById('gridBtn').onclick = () => setViewMode(viewMode === 'grid' ? 'canvas' : 'grid');
  document.getElementById('folderBtn').onclick = () => { openFolder(); };
  addEventListener('keydown', (e) => {
    if (e.target !== document.body && e.target !== document && e.target !== window) return;
    if (e.key === 'Escape' && viewMode !== 'canvas') { setViewMode('canvas'); e.preventDefault(); }
    if (viewMode === 'focus' && e.key === 'ArrowRight') { focusStep(1); e.preventDefault(); }
    if (viewMode === 'focus' && e.key === 'ArrowLeft') { focusStep(-1); e.preventDefault(); }
  });

// ===== images =====
// Provides: pictures in and the board out — importFile/importBitmap/importText (drop, paste, the Import…
//   button, a phone's camera), tracing into ink beside the raster; exportBoardSVG/exportBoardPNG/exportLog,
//   downloadText/downloadBlob.
// Uses: core, view, folder (folder, imageUrlFor), render.
// A fragment of one closure: Demos/build-surface.mjs concatenates surface/*.js
// in name order inside `(function () { ... })();`. Shared state is the
// closure's; no imports, no exports, no build step beyond the concatenation.

  // ===== Pictures in =========================================================
  // Import keeps both representations (ARCHITECTURE-v8 §17): the raster as an
  // image artifact — the file in the folder when there is one, a URL in memory
  // when there is not — and the traced strokes as ink that gets everything a
  // pen stroke gets. A photographed sketch of boxes is a page the engine can
  // build. Direct SVG import is the same path with the tracing skipped.
  const IMPORT_MAX_PX = 1400;
  const IMPORT_DIR = 'imports';

  /** A picture's pixels, downsampled so the longest side fits, as ImageData-like {width, height, data}. */
  async function bitmapOf(blob) {
    const bmp = await createImageBitmap(blob);
    const k = Math.min(1, IMPORT_MAX_PX / Math.max(bmp.width, bmp.height));
    const w = Math.max(1, Math.round(bmp.width * k)), h = Math.max(1, Math.round(bmp.height * k));
    const off = document.createElement('canvas');
    off.width = w; off.height = h;
    const c = off.getContext('2d', { willReadFrequently: true });
    c.drawImage(bmp, 0, 0, w, h);
    return c.getImageData(0, 0, w, h);
  }

  function safeName(name) {
    return String(name || 'picture').replace(/[^A-Za-z0-9._-]+/g, '-');
  }

  /**
   * A picture becomes ink at a place on the board: traced, scaled so it lands
   * at `at` with its longest side `size` world units, and imported as declared
   * content. The raster is imported beside it as an image artifact.
   */
  function importBitmap(bitmap, name, at, opts) {
    const o = opts || {};
    const size = o.size || 600;
    const traced = MM.trace(bitmap, o.trace);
    const k = size / Math.max(bitmap.width, bitmap.height);
    const strokes = traced.strokes.map((s) => s.points.map((p) => ({ x: at.x + p.x * k, y: at.y + p.y * k })));
    const bounds = { minX: at.x, minY: at.y, maxX: at.x + bitmap.width * k, maxY: at.y + bitmap.height * k };
    const path = IMPORT_DIR + '/' + safeName(name);
    const now = Date.now();
    let inkId = null;
    if (strokes.length) inkId = session.import({ kind: 'png', path: path, bounds: bounds, strokes: strokes, at: now });
    // The raster, kept beside the ink: parked to the right of it, so the ink
    // stays what the hand works on and the picture stays what it came from.
    let imageId = null;
    if (o.keepRaster !== false && o.url) {
      folder.urls.set(path, o.url);
      const rb = { minX: bounds.maxX + 40, minY: bounds.minY, maxX: bounds.maxX + 40 + (bounds.maxX - bounds.minX), maxY: bounds.maxY };
      imageId = session.import({ kind: /\.jpe?g$/i.test(path) ? 'jpg' : 'png', path: path, name: safeName(name), bounds: rb, code: '', at: now + 1 });
    }
    flash('traced ' + name + ': ' + strokes.length + ' stroke' + (strokes.length === 1 ? '' : 's') + ' — ' + traced.reasoning);
    return { inkId: inkId, imageId: imageId, strokes: strokes.length, reasoning: traced.reasoning };
  }

  /** Text of a known kind becomes an artifact at a place on the board. */
  function importText(name, text, at, size) {
    const row = MM.kindOf(name);
    if (!row) { flash(name + ': not a kind the canvas knows'); return null; }
    const w = size || 360, h = Math.round((size || 360) * 0.66);
    const path = IMPORT_DIR + '/' + safeName(name);
    return session.import({ kind: row.kind, path: path, name: safeName(name), bounds: { minX: at.x, minY: at.y, maxX: at.x + w, maxY: at.y + h }, code: text, at: Date.now() });
  }

  /** A file from a drop, a paste, the picker or a camera. */
  async function importFile(file, at) {
    const where = at || screenToWorld(innerWidth / 2, innerHeight / 2);
    const name = file.name || ('pasted-' + Date.now() + '.png');
    if (/^image\/svg/.test(file.type) || /\.svg$/i.test(name)) {
      return importText(name.replace(/\.svg$/i, '') + '.svg', await file.text(), where);
    }
    if (/^image\//.test(file.type)) {
      const bitmap = await bitmapOf(file);
      const url = URL.createObjectURL(file);
      // The file lands in the folder when there is one to write to.
      if (folder.store && folder.store.capabilities().write) {
        try { await folder.store.write(IMPORT_DIR + '/' + safeName(name), new Uint8Array(await file.arrayBuffer())); } catch (err) { /* stays in memory */ }
      }
      return importBitmap(bitmap, name, where, { url: url });
    }
    if (MM.kindOf(name)) return importText(name, await file.text(), where);
    flash(name + ': not a kind the canvas knows');
    return null;
  }

  // Drop, paste, the picker, the camera.
  canvas.addEventListener('dragover', (e) => { e.preventDefault(); });
  canvas.addEventListener('drop', (e) => {
    e.preventDefault();
    const at = screenToWorld(e.clientX, e.clientY);
    for (const f of e.dataTransfer.files) importFile(f, at);
  });
  addEventListener('paste', (e) => {
    if (e.target !== document.body) return;
    const items = [...(e.clipboardData ? e.clipboardData.items : [])];
    const files = items.filter((i) => i.kind === 'file').map((i) => i.getAsFile()).filter(Boolean);
    if (!files.length) return;
    e.preventDefault();
    const at = lastPen ? screenToWorld(lastPen.x, lastPen.y) : screenToWorld(innerWidth / 2, innerHeight / 2);
    for (const f of files) importFile(f, at);
  });
  const importInput = document.getElementById('importInput');
  document.getElementById('importBtn').onclick = () => importInput.click();
  importInput.onchange = () => {
    const at = screenToWorld(innerWidth / 2, innerHeight / 2);
    for (const f of importInput.files) importFile(f, at);
    importInput.value = '';
  };

  // ===== The board out ======================================================
  // Export is the kinds list read backwards: the board as SVG or PNG, the
  // session as its log. A page's HTML, a behaviour's source and a frame's
  // bundle are exported from the panel, each by its own kind.
  function exportBoardSVG() {
    return svgOf(session.getState().contentIds);
  }

  /** Some marks as SVG paths, the clean form where one is held, each path naming its node and reading. */
  function svgOf(ids) {
    const s = session.getState();
    const boxes = ids.map((id) => MM.boundsOf(s.nodes.get(id))).filter(Boolean);
    if (!boxes.length) return '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"></svg>';
    const b = union(boxes);
    const pad = 20;
    let out = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + [b.minX - pad, b.minY - pad, b.maxX - b.minX + pad * 2, b.maxY - b.minY + pad * 2].map((v) => Math.round(v)).join(' ') + '">\n';
    const path = (pts, closed) => pts.map((p, i) => (i ? 'L' : 'M') + p.x.toFixed(1) + ' ' + p.y.toFixed(1)).join(' ') + (closed ? ' Z' : '');
    const draw = (node, depth) => {
      const clean = MM.cleanPointsOf(node);
      const pts = MM.strokePointsOf(node);
      if (pts) {
        const name = MM.wordOf(node) || MM.topInterpretation(node) || '';
        out += '  <path data-node="' + esc(node.id) + '"' + (name ? ' data-reads="' + esc(name) + '"' : '') + ' d="' + path(clean || pts, !!(clean && MM.cleanOf(node).closed)) + '" fill="none" stroke="#1a1a2e" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>\n';
        return;
      }
      if (depth > 6) return;
      for (const e of node.edges) if (e.rel === 'has-part') { const p = s.nodes.get(e.to); if (p) draw(p, depth + 1); }
    };
    for (const id of ids) { const n = s.nodes.get(id); if (n) draw(n, 0); }
    return out + '</svg>\n';
  }

  function exportBoardPNG() {
    return new Promise((resolve) => canvas.toBlob((blob) => resolve(blob), 'image/png'));
  }

  function exportLog() {
    return JSON.stringify(session.getEvents());
  }

  function downloadBlob(name, blob) {
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 1000);
  }
  function downloadText(name, text, type) {
    downloadBlob(name, new Blob([text], { type: type || 'text/plain' }));
  }

  document.getElementById('exportBtn').onclick = () => {
    const which = (prompt('Export the board as: svg, png, or log', 'svg') || '').trim().toLowerCase();
    if (which === 'svg') downloadText('board.svg', exportBoardSVG(), 'image/svg+xml');
    else if (which === 'png') exportBoardPNG().then((b) => b && downloadBlob('board.png', b));
    else if (which === 'log') downloadText('canvas.jsonl', MM.encodeLog(session.getEvents()), 'application/json');
  };

// ===== text =====
// Provides: text as an element — typeText (a text artifact at a point), editText (a new version of one),
//   beginTextEdit/commitTextEdit (the editor on the canvas, opened by a double-click on empty ground or
//   from the panel), wordToText (a written word becomes a text artifact, on request).
// Uses: core, view, artifacts (frames), render.
// A fragment of one closure: Demos/build-surface.mjs concatenates surface/*.js
// in name order inside `(function () { ... })();`. Shared state is the
// closure's; no imports, no exports, no build step beyond the concatenation.

  // ===== Text as an element ==================================================
  // A `text` artifact is a file of words: it renders as prose ink can address
  // (its paragraphs), it offers its words to any slot a frame wires it to,
  // and it is edited in place — a new version of its code, every version
  // kept, undo dropping the last. Handwriting stays handwriting; a written
  // word becomes text only when asked (ARCHITECTURE-v8 §19 S3).
  const TEXT_DIR = 'text';
  const TEXT_W = 320, TEXT_H = 120;
  let textCount = 0;
  let editing = null; // { id, el, bounds } while the editor is open

  /** A text artifact at a point, its words as its code. */
  function typeText(at, text, size) {
    const w = size && size.w || TEXT_W, h = size && size.h || TEXT_H;
    textCount++;
    const name = 'text ' + textCount;
    return session.import({
      kind: 'text', path: TEXT_DIR + '/' + textCount + '.txt', name: name,
      bounds: { minX: at.x, minY: at.y, maxX: at.x + w, maxY: at.y + h }, code: text, at: Date.now(),
    });
  }

  /** A new version of a text artifact's words. */
  function editText(id, text) {
    return session.attachCode({ participantId: MM.LOCAL_PARTICIPANT, nodeId: id, kind: 'text', code: text, at: Date.now() });
  }

  /** A written word (its transcript) becomes a text artifact where the writing is; the ink stays. */
  function wordToText(wordId) {
    const s = session.getState();
    const n = s.nodes.get(wordId);
    const said = n && MM.transcriptOf(n);
    const b = n && MM.boundsOf(n);
    if (!said || !b) return null;
    const w = Math.max(TEXT_W, b.maxX - b.minX), h = Math.max(48, b.maxY - b.minY);
    textCount++;
    return session.import({
      kind: 'text', path: TEXT_DIR + '/' + textCount + '.txt', name: said,
      bounds: { minX: b.minX, minY: b.minY, maxX: b.minX + w, maxY: b.minY + h }, code: said, at: Date.now(),
    });
  }

  // ===== The editor: on the canvas, in world space =========================
  const editorEl = document.getElementById('textEditor');

  function placeEditor(b) {
    const p = worldToScreen(b.minX, b.minY), q = worldToScreen(b.maxX, b.maxY);
    editorEl.style.left = p.x + 'px'; editorEl.style.top = p.y + 'px';
    editorEl.style.width = Math.max(120, q.x - p.x) + 'px'; editorEl.style.height = Math.max(40, q.y - p.y) + 'px';
    editorEl.style.fontSize = Math.max(11, 13 * view.zoom) + 'px';
  }

  /** Open the editor on a text artifact, or on empty ground at a world point. */
  function beginTextEdit(id, at) {
    const s = session.getState();
    let bounds, text = '';
    if (id) {
      const n = s.nodes.get(id);
      const rep = n && codeRepOf(n);
      if (!rep || rep.data.kind !== 'text') return false;
      bounds = MM.boundsOf(n); text = rep.data.code;
    } else {
      bounds = { minX: at.x, minY: at.y, maxX: at.x + TEXT_W, maxY: at.y + TEXT_H };
    }
    editing = { id: id || null, bounds: bounds };
    editorEl.value = text;
    editorEl.hidden = false;
    placeEditor(bounds);
    setTimeout(() => editorEl.focus(), 0);
    return true;
  }

  /** Commit: a new version of the artifact, or a new artifact; nothing when nothing was typed. */
  function commitTextEdit() {
    if (!editing) return null;
    const e = editing; editing = null;
    editorEl.hidden = true;
    const text = editorEl.value;
    if (e.id) {
      const n = session.getState().nodes.get(e.id);
      const rep = n && codeRepOf(n);
      if (rep && rep.data.code === text) return e.id; // unchanged: no event
      editText(e.id, text);
      flash('text revised — every version is kept; undo drops this one');
      return e.id;
    }
    if (!text.trim()) return null;
    const id = typeText({ x: e.bounds.minX, y: e.bounds.minY }, text);
    flash('text: a file of words — circle it with a page to wire it into a slot');
    return id;
  }
  function cancelTextEdit() {
    editing = null;
    editorEl.hidden = true;
  }

  editorEl.addEventListener('keydown', (e) => {
    e.stopPropagation();
    if (e.key === 'Escape') { cancelTextEdit(); return; }
    // Enter commits; Shift+Enter is a new line — a heading is one line, prose is many.
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); commitTextEdit(); }
  });
  editorEl.addEventListener('blur', () => { if (editing) commitTextEdit(); });

  // Double-click on empty ground: type here. A double-click on ink is nothing —
  // a dot is drawn, not tapped, and a tap is the dead state.
  canvas.addEventListener('dblclick', (e) => {
    const w = screenToWorld(e.clientX, e.clientY);
    if (nodeAt(w.x, w.y)) return;
    beginTextEdit(null, w);
  });

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
    runtime: () => ({ bodies: runtime.bodies, broken: runtime.broken, loaded: runtime.loaded, budgetMs: RUN_BUDGET_MS, log: runtime.log, pending: runtime.pending, stepOnce: stepOnce }),
    // Text as an element, for tests.
    typeText: typeText, editText: editText, wordToText: wordToText, beginTextEdit: beginTextEdit, commitTextEdit: commitTextEdit,
    // Pictures in and the board out, for tests.
    importBitmap: importBitmap, importText: importText, exportBoardSVG: exportBoardSVG, exportLog: exportLog,
    // The folder, for tests: open any store (a MemoryStore stands in for a folder), and read the board's home.
    openStore: (store, how, name) => openStore(store, how, name),
    openGit: (spec, token, remember) => openGit(spec, token, remember),
    folder: () => folder,
    setParticipant: setParticipant,
    forgetLocalLog: forgetLocalLog,
    saveNow: saveNow,
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


  session.subscribe(render);
  const replayUrl = params.get('replay');
  if (!replayUrl) {
    // Last time's board comes back from browser storage; a folder or a site
    // named in the URL is opened as the canvas instead.
    const restored = restoreLocalLog();
    restoreMark();
    rejoinRemembered();
    if (restored) flash('your last board is back — Reset starts a fresh one');
    if (params.get('folder')) openStatic(params.get('folder'));
    else if (params.get('git')) openGit(params.get('git'));
  } else {
    startReplay(replayUrl);
  }
  session.subscribe(scheduleSave);
  document.fonts.ready.then(() => { sizePad(); render(session.getState()); });
  // Installable, and open with no network: the shell is cached by a service
  // worker when the page is served, never from a file on disk.
  if ('serviceWorker' in navigator && /^https?:/.test(location.protocol) && !params.has('nosw')) {
    navigator.serviceWorker.register('sw.js').catch(() => { /* not available here; the page works the same */ });
  }
  resize();
  afterViewChange();
})();
