/* Built from Demos/surface/*.js by Demos/build-surface.mjs — do not edit; edit the fragments. */
(function () {
// ===== core =====
// Provides: the engine handle, URL params, the theme (light · dark · system) and the colours the canvas
//   draws with (read from the stylesheet, so ink and chrome agree), device preferences (prefs), the
//   session, DOM handles, the panel toggle, shared state (state, live, hoverId, lastPen), esc().
// Uses: nothing — every other fragment reads from here.
// A fragment of one closure: Demos/build-surface.mjs concatenates surface/*.js
// in name order inside `(function () Ellipsis)();`. Shared state is the
// closure's; no imports, no exports, no build step beyond the concatenation.

  const MM = window.MetaMediumCore;

  // The page decides the look: ?theme=light|dark|paper pins a theme, ?embed
  // hides what a figure does not need, ?replay=<url> steps a recorded session.
  const params = new URLSearchParams(location.search);
  const EMBED = params.has('embed');
  if (EMBED) document.body.classList.add('embed');

  // ===== Device preferences: small, named, held on this device ==============
  const prefs = {
    get(k, d) { try { const v = JSON.parse(localStorage.getItem('mm-' + k) || 'null'); return v === null ? d : v; } catch (err) { return d; } },
    set(k, v) { try { localStorage.setItem('mm-' + k, JSON.stringify(v)); } catch (err) { /* private mode */ } },
    del(k) { try { localStorage.removeItem('mm-' + k); } catch (err) { /* nothing */ } },
  };

  // ===== Theme: light and dark are the same tokens inverted =================
  // The stylesheet defines the light set on :root and the dark set on
  // [data-theme="dark"]; the page always stamps one of the two, so no rule
  // below the token layer branches on theme. `system` follows the OS until a
  // tile says otherwise (brand/README.md, law 1).
  const THEME_MODES = ['system', 'light', 'dark'];
  const urlTheme = params.get('theme');
  let themeMode = urlTheme === 'paper' || urlTheme === 'light' ? 'light' : urlTheme === 'dark' ? 'dark' : prefs.get('theme', 'system');
  if (!THEME_MODES.includes(themeMode)) themeMode = 'system';
  const darkQuery = window.matchMedia ? window.matchMedia('(prefers-color-scheme: dark)') : null;
  function resolvedTheme() {
    if (themeMode !== 'system') return themeMode;
    return darkQuery && darkQuery.matches ? 'dark' : 'light';
  }
  /** Read the colours the canvas draws with from the stylesheet, once per theme. */
  function readColours() {
    const cs = getComputedStyle(document.documentElement);
    const v = (name) => cs.getPropertyValue(name).trim();
    // No stylesheet (a broken link, a build that inlined nothing): ink must
    // still be visible, so the instrument's own values stand in.
    if (!v('--ink')) {
      return { ink: '#e8e4d9', inkFaint: 'rgba(232,228,217,0.14)', halo: 'rgba(10,10,15,0.55)', haloText: 'rgba(10,10,15,0.7)',
        agent: '#8ab4c8', agentRGB: '138,180,200', gold: '#c9a84c', goldRGB: '201,168,76', labelRGB: '160,152,128', panelRGB: '18,18,26', dim: '#a09880' };
    }
    return {
      ink: v('--ink'), inkFaint: v('--ink-faint'), halo: v('--halo'), haloText: v('--halo-text'),
      agent: v('--agent'), agentRGB: v('--agent-rgb'), gold: v('--gold'), goldRGB: v('--gold-rgb'),
      labelRGB: v('--label-rgb'), panelRGB: v('--panel-rgb'), dim: v('--dim'),
    };
  }
  let C = null;
  function applyTheme() {
    const t = resolvedTheme();
    document.documentElement.setAttribute('data-theme', t);
    document.body.classList.toggle('paper', t === 'light');
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.content = t === 'light' ? '#f8f6f1' : '#0a0a0f';
    C = readColours();
    redrawMarkChip();
    render(state);
    syncTiles();
  }
  function setThemeMode(mode) {
    themeMode = THEME_MODES.includes(mode) ? mode : 'system';
    prefs.set('theme', themeMode);
    applyTheme();
  }
  if (darkQuery && darkQuery.addEventListener) darkQuery.addEventListener('change', () => { if (themeMode === 'system') applyTheme(); });
  document.documentElement.setAttribute('data-theme', resolvedTheme());
  document.body.classList.toggle('paper', resolvedTheme() === 'light');
  C = readColours();
  const THEME = resolvedTheme() === 'light' ? 'paper' : 'instrument';

  // The hand: the field fans to the right of the pen tip, or to the left.
  let hand = prefs.get('hand', 'right') === 'left' ? 'left' : 'right';
  function setHand(h) { hand = h === 'left' ? 'left' : 'right'; prefs.set('hand', hand); if (typeof syncTiles === 'function') syncTiles(); }
  // …and what draws, once a pen has been seen on this device (V1-PLAN R6; the rules are 07-hand.js):
  // 'pen' — the pen draws and a finger pans — or 'finger', which gives a finger its ink back. Null
  // until then, and a finger draws, as it always did. The hand tile shows it and changes it.
  let draws = ((d) => (d === 'pen' || d === 'finger' ? d : null))(prefs.get('draws', null));
  function setDraws(d) {
    draws = d === 'pen' || d === 'finger' ? d : null;
    if (draws) prefs.set('draws', draws); else prefs.del('draws');
    if (typeof syncTiles === 'function') syncTiles();
  }

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
    // The bar's toggle shows or hides the whole panel; "details" is the inspector inside it (U1a).
    panelToggle.textContent = panelOpen ? 'panel ▾' : 'panel ▸';
    panelToggle.setAttribute('aria-expanded', String(panelOpen));
  }
  panelToggle.onclick = () => { panelOpen = !panelOpen; try { localStorage.setItem(PANEL_KEY, panelOpen ? 'open' : 'closed'); } catch (err) { /* private mode */ } syncPanel(); };
  syncPanel();

  let state = session.getState();
  let live = null;      // stroke under the pointer, in WORLD coordinates
  let hoverId = null;   // inspected node (hover), else most recent
  let lastPen = null;   // where the hand last let go, on screen — the field opens there

  const esc = (t) => String(t).replace(/[&<>"]/g, (c) =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

// ===== ui =====
// Provides: the components the chrome is built from — pill, chip, tile, row, pane — each a function
//   that returns an element (row returns markup, for the panel's innerHTML), and nothing else.
// Uses: core (esc).
// A fragment of one closure: Demos/build-surface.mjs concatenates surface/*.js
// in name order inside `(function () { ... })();`. Shared state is the
// closure's; no imports, no exports, no build step beyond the concatenation.

  // ===== Components, not markup (SURFACE-v9-PLAN D5) =========================
  // Six small things, one stylesheet section each. A surface is built from
  // these or it is not built; a panel that hand-writes its own markup is how
  // three palettes and nine status lines happened.
  const ui = {
    /** A verb or a reading: a label, its reason as the tooltip, a dot when it asks a model. */
    pill(label, o) {
      o = o || {};
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'pill' + (o.cls ? ' ' + o.cls : '');
      b.innerHTML = '<span>' + esc(label) + '</span>' + (o.model ? '<i class="dot" title="asks a model"></i>' : '');
      if (o.why) b.title = o.why;
      if (o.disabled) b.disabled = true;
      if (o.onclick) b.onclick = o.onclick;
      return b;
    },
    /** A small standing label: the mark, the folder, a model, a match. */
    chip(text, o) {
      o = o || {};
      const s = document.createElement(o.onclick ? 'button' : 'span');
      if (o.onclick) { s.type = 'button'; s.onclick = o.onclick; }
      s.className = 'chip' + (o.cls ? ' ' + o.cls : '');
      s.textContent = text;
      if (o.why) s.title = o.why;
      return s;
    },
    /** A control-centre tile's face: what it is, and its state. */
    tile(el, label, value, o) {
      if (!el) return el;
      o = o || {};
      el.classList.add('tile');
      el.innerHTML = '<span class="k">' + esc(label) + '</span>' + (value !== undefined && value !== null && value !== '' ? '<span class="v">' + esc(value) + '</span>' : '');
      if (o.on !== undefined) el.classList.toggle('on', !!o.on);
      if (o.why) el.title = o.why;
      return el;
    },
    /** A label/value line in the panel, with an optional reason and an optional action. */
    row(k, v, why, action) {
      return '<div class="row"><span class="k">' + esc(k) + '</span><span class="v">' + esc(v) + '</span></div>' +
        (why ? '<div class="why">' + esc(why) + '</div>' : '') + (action || '');
    },
    /** A titled, closable box. Wraps an existing element once; the close button calls `onClose`. */
    pane(el, title, onClose) {
      if (!el || el.querySelector(':scope > .paneHead')) return el;
      el.classList.add('pane');
      const head = document.createElement('div');
      head.className = 'paneHead';
      head.innerHTML = '<span class="paneTitle">' + esc(title) + '</span>';
      const x = document.createElement('button');
      x.type = 'button'; x.className = 'paneClose'; x.setAttribute('aria-label', 'Close'); x.textContent = '×';
      x.onclick = () => { if (onClose) onClose(); else el.setAttribute('hidden', ''); };
      head.appendChild(x);
      el.insertBefore(head, el.firstChild);
      return el;
    },
  };

// ===== view =====
// Provides: view {zoom, panX, panY}, screenToWorld/worldToScreen/wpx, zoomBy, zoomAround, fitAll, afterViewChange, viewChanged (one paint a frame), the wheel/pinch/keyboard zoom, resize,
//   and the space actually visible: usableRect (pure), viewportRect, usableViewport, relayoutChrome.
// Uses: core; input (panning/pinch state, the touches down); palette (replaceOpenField).
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

  /** Zoom the view about a screen point; true when the zoom changed. The paint is the caller's. */
  function zoomBy(sx, sy, factor) {
    const before = clampZoom(view.zoom);
    const after = clampZoom(before * factor);
    if (after === before) return false;
    view.zoom = after;
    const ratio = after / before;
    view.panX = sx - (sx - view.panX) * ratio;
    view.panY = sy - (sy - view.panY) * ratio;
    return true;
  }
  function zoomAround(sx, sy, factor) {
    if (zoomBy(sx, sy, factor)) afterViewChange();
  }

  // A hand's pan, pinch or wheel moves the view on every event and paints
  // once a frame (R4c): a trackpad sends more wheel events than the screen
  // has frames, and a paint for every one of them was the frame. The ink and
  // the stage move together, in the frame that paints them.
  let viewPaint = null;
  function viewChanged() {
    if (viewPaint) return;
    viewPaint = nextFrame(() => { viewPaint = null; afterViewChange(); });
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
      if (!(r.width > 0 && r.height > 0)) continue;
      let top = r.top, bottom = r.bottom;
      // The panel's room is its own however little it says now (U1a): measured at the height it
      // may grow to, so a short panel docks as the wall it becomes the next moment, and the board
      // never fits marks under it. A column grows down; a band along the bottom grows up.
      if (id === 'inspector') {
        const mh = parseFloat(cs.maxHeight);
        if (mh > 0) {
          const band = r.width > (window.innerWidth || r.width) * 0.6;
          if (band) top = Math.min(top, r.bottom - mh); else bottom = Math.max(bottom, r.top + mh);
        }
      }
      out.push({ id: id, left: r.left, top: top, right: r.right, bottom: bottom });
    }
    return out;
  }

  function usableViewport() { return usableRect(viewportRect(), chromeRects()); }

  /**
   * Fit the CONTENT, and let the answer cards place themselves inside the
   * result (V1-PLAN L2d; NOTES-DRAWING-WITH-THE-HAND §E).
   *
   * `fitAll` used to union the content with the explanation nodes' LOGGED
   * bounds. Since placing became runtime (`renderExplanations`) a card is not
   * drawn where it is logged, so one of those two numbers was fiction: the fit
   * was widened to take in a rectangle nobody would ever see, and the cards
   * were then placed again inside the wider view, further out than before. A
   * card logged beside a mark that has since moved far away is the worst of
   * it — the union fitted twenty thousand units of nothing and slammed the
   * zoom to MIN_ZOOM (e2e 41d; one way to the slam seen once on a live board).
   *
   * So: fit the content; render, which places the cards; then, if a card
   * landed outside the free ground, widen ONCE to take in the rects the cards
   * were actually DRAWN at (`cardRects`, world units) and place them again.
   * One correction pass, never a loop — a wider view only gives the placing
   * more room, and a fit that chased its own cards would never settle.
   */
  function fitAll() {
    const boxes = state.contentIds.map((id) => MM.boundsOf(state.nodes.get(id))).filter(Boolean);
    if (!boxes.length) { view.panX = 0; view.panY = 0; view.zoom = 1; afterViewChange(); return; }
    fitTo(union(boxes));
    if (!state.explanations.length || !cardRects.length) return;
    const drawn = cardRects.map((c) => ({ minX: c.x, minY: c.y, maxX: c.x + c.w, maxY: c.y + c.h }));
    const vw = viewportWorld();
    const out = drawn.some((d) => d.minX < vw.minX || d.minY < vw.minY || d.maxX > vw.maxX || d.maxY > vw.maxY);
    if (out) fitTo(union(boxes.concat(drawn)));
  }

  /** Fit a world rectangle into the free ground, zoom capped at 2. */
  function fitTo(b) {
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
      if (zoomBy(e.clientX, e.clientY, Math.exp(-e.deltaY * k))) viewChanged();
      return;
    }
    // A line-mode wheel (a mouse) moves in bigger steps than a pixel-mode one.
    const step = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? innerHeight : 1;
    let dx = e.deltaX * step, dy = e.deltaY * step;
    if (e.shiftKey && !e.deltaX) { dx = dy; dy = 0; } // shift + a plain wheel scrolls sideways
    view.panX -= dx;
    view.panY -= dy;
    viewChanged();
  }, { passive: false });

  // Safari: pinch is a gesture event, not a wheel. On a trackpad, that is all
  // there is; on an iPad's glass the same pinch also arrives as two touch
  // pointers, which pinch and pan (07-input), so the gesture is left to them —
  // two hands zooming one view about two different points was a jitter.
  let gestureStartZoom = 1;
  canvas.addEventListener('gesturestart', (e) => { e.preventDefault(); gestureStartZoom = view.zoom; });
  canvas.addEventListener('gesturechange', (e) => {
    e.preventDefault();
    if (touches.size) return;
    const target = clampZoom(gestureStartZoom * e.scale);
    if (zoomBy(e.clientX, e.clientY, target / view.zoom)) viewChanged();
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

// ===== artifacts =====
// Provides: the live plane: frames of iframes for artifacts with code, syncStage, regionsUnderInk, pointerFrameAt.
// Uses: core, view.
// A fragment of one closure: Demos/build-surface.mjs concatenates surface/*.js
// in name order inside `(function () Ellipsis)();`. Shared state is the
// closure's; no imports, no exports, no build step beyond the concatenation.

  /** Kinds that render as a figure on the board rather than as a page: no plate, clear ground. */
  const FIGURE_KINDS = new Set(['run', 'svg', 'text', 'mermaid']);

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
  // Text made from writing is flipped over to show the ink it came from (v10 F8). Runtime only.
  const flipped = new Set();
  function isWritingArtifact(node) {
    // Born from writing: the first version says so, and every version since carries it.
    const rep = node && codeRepOf(node);
    return !!rep && rep.data.kind === 'text' && (rep.data.from === 'writing' || node.reps.some((r) => r.modality === 'code' && r.data && r.data.from === 'writing'));
  }

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
      // Past 1:1 the board reveals a page's structure: each region says its id (S4).
      'html.mm-reveal [data-region]{outline:1px dashed rgba(138,109,31,0.6);outline-offset:-1px;}' +
      'html.mm-reveal [data-region]::before{content:attr(data-region);position:absolute;left:2px;top:0;font:var(--mm-ui,10px)/1.3 ui-monospace,Menlo,monospace;color:rgba(138,109,31,0.95);background:rgba(251,250,247,0.85);padding:0 3px;z-index:9;pointer-events:none;}' +
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
      const kind = rep.data.kind || 'html';
      if (f && !f.parked && f.kind !== kind) { f.wrap.remove(); frames.delete(id); f = null; }
      if (!f) {
        const wrap = document.createElement('div');
        // A FIGURE has no plate. A page, a script or a table is something you
        // read on a page, and the white card is that page; a drawing and a line
        // of words are marks among the ink, and a card behind them fights it.
        // The program's frame had this rule alone; svg and text need it too.
        wrap.className = 'artifactFrame' + (kind === 'run' ? ' run' : '') + (FIGURE_KINDS.has(kind) ? ' figure' : '');
        const iframe = document.createElement('iframe');
        // Two sandboxes, never both: a page keeps its origin and runs no script,
        // so ink can hit-test into it; a program runs scripts in an opaque
        // origin and reports its parts back (SURFACE-v9-PLAN D7). A diagram said
        // as Mermaid is drawn by a library in the second, and reports its nodes.
        iframe.setAttribute('sandbox', kind === 'run' || kind === 'mermaid' ? 'allow-scripts' : 'allow-same-origin');
        iframe.setAttribute('scrolling', 'no');
        iframe.title = MM.wordOf(node) || id;
        iframe.onload = sizeFramesToScreen; // the type is set for the screen as soon as the document is there
        wrap.appendChild(iframe);
        stage.appendChild(wrap);
        f = { wrap: wrap, iframe: iframe, codeAt: null, parked: false, kind: kind };
        frames.set(id, f);
      }
      // Where the drawing put it, plus where its own behaviour has taken it
      // (runtime only — never in the log).
      const o = runtimeOffset(id), dd = dragFrameOffset(id);
      f.wrap.style.left = (fr.x + o.dx + dd.dx) + 'px';
      f.wrap.style.top = (fr.y + o.dy + dd.dy) + 'px';
      f.wrap.style.width = fr.w + 'px';
      f.wrap.style.height = fr.h + 'px';
      f.wrap.classList.toggle('broken', !!runtimeBroken(id));
      f.wrap.classList.toggle('playing', !!(s.clocks[id] && s.clocks[id].playing));
      f.wrap.classList.toggle('writing', isWritingArtifact(node));
      f.wrap.classList.toggle('flipped', flipped.has(id));

      // What renders is the WIRED code when a frame feeds this member.
      const wired = wiredCodeOf(s, id);
      const code = wired !== null ? wired : rep.data.code;
      const playing = !!(s.clocks[id] && s.clocks[id].playing);
      // A figure's document carries the board's own ink colour, baked in when
      // it was written — an iframe cannot inherit a token from the page — so
      // the THEME is part of what the document is made of. Without it in the
      // stamp, switching to paper left every label in the dark theme's near-
      // white ink on a light ground: a figure that vanished when the light
      // came on. A page is theme-independent and rebuilds for nothing.
      const stamp = rep.data.at + ':' + Math.round(fr.w) + 'x' + Math.round(fr.h) + ':' + hashOf(code) +
        (kind === 'run' ? ':' + (playing ? 'run' : 'still') : '') +
        (FIGURE_KINDS.has(kind) ? ':' + (document.documentElement.getAttribute('data-theme') || '') : '') +
        (kind === 'mermaid' ? ':' + hashOf(mermaidSourcesNow().join('|')) : '');
      if (!f.parked && f.codeAt !== stamp) {
        // A document that CHANGES gets a new element. Assigning srcdoc twice
        // in one tick — the source card at import, the harness at play — lost
        // the second navigation on a board with a dozen frames loading: the
        // program never started and nothing said so. A fresh iframe always
        // navigates; the message listener ignores the old window by identity.
        if (f.codeAt !== null) {
          const next = document.createElement('iframe');
          for (const attr of ['sandbox', 'scrolling', 'title']) { const v = f.iframe.getAttribute(attr); if (v !== null) next.setAttribute(attr, v); }
          next.onload = sizeFramesToScreen;
          f.iframe.replaceWith(next);
          f.iframe = next;
        }
        f.codeAt = stamp;
        if (kind === 'run' || kind === 'mermaid') { reported.delete(id); mermaidStates.delete(id); }
        f.iframe.srcdoc = documentForKind({ data: { ...rep.data, code: code } }, fr.w, fr.h, { id: id, playing: playing });
      }
    }
    syncRuntime(s);
  }

  /**
   * The playing program under a world point, if any: the one frame that takes
   * the pointer (SURFACE-v10-PLAN D2). A page has no script to receive a
   * click and a still program is its source card, so both take ink from
   * anywhere; only a program that runs has something to press.
   */
  function pointerFrameAt(w) {
    let hit = null;
    for (const [id, f] of frames) {
      if (f.parked || f.kind !== 'run' || !f.iframe) continue;
      const c = state.clocks[id];
      if (!c || !c.playing) continue;
      const node = state.nodes.get(id);
      const fr = node && MM.frameOf(node);
      if (!fr) continue;
      const o = runtimeOffset(id);
      const x = fr.x + o.dx, y = fr.y + o.dy;
      if (w.x >= x && w.x <= x + fr.w && w.y >= y && w.y <= y + fr.h) hit = { id: id, f: f, x: x, y: y };
    }
    return hit;
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
    // A program reports its own parts; the ink lands on those. So does a diagram
    // said as Mermaid, its parts named for Mermaid ids and read back to the marks
    // they were written from (`mermaidPartNames`, 25-mermaid.js).
    if (f.kind === 'run' || f.kind === 'mermaid') {
      const x0 = bounds.minX - fr.x, y0 = bounds.minY - fr.y, x1 = bounds.maxX - fr.x, y1 = bounds.maxY - fr.y;
      for (const r of reportedRegions(artifactId)) {
        if (r.x < x1 && r.x + r.w > x0 && r.y < y1 && r.y + r.h > y0) {
          if (f.kind === 'mermaid') for (const name of mermaidPartNames(artifactId, r.id)) found.add(name);
          else found.add(r.id);
        }
      }
      return [...found];
    }
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

// ===== seats (the rules) =====
// Provides: the seats' rules, pure (V1-PLAN I7) — SEATS and SEAT_WORDS (what each seat is for), resolveReaders
//   and resolveWriters (who is asked to read and who to write, with the fallback said), fallbackWords (what a seat
//   does when nothing is chosen for it), keyId, keysToKeep and migrateStored (one key a provider; what is kept on
//   the device; an old pick and key become the writer seat), orderChoices (local before hosted, quickest first),
//   seatsOfPick and pickOf (what a kept pick holds, and never a key).
// Uses: NOTHING. Like 07-hand.js and 09-field.js, this fragment names no closure variable, touches no DOM and asks
//   the session nothing; 04-models.js is the adapter that gathers the joined models, asks, and acts. So it loads on
//   its own in Node, which is how it is tested:
//     node --test Demos/surface/03-seats.test.mjs
// A fragment of one closure: Demos/build-surface.mjs concatenates surface/*.js
// in name order inside `(function () { ... })();`. Shared state is the
// closure's; no imports, no exports, no build step beyond the concatenation.
//
// THE RULES (PLAN-IPAD-NOTES §3; CLAUDE.md, "Tiered LLM Interpretation")
//   - A seat is a JOB, not a kind of participant: reader (handwriting to text — a model that sees), writer (briefs,
//     pages, programs, *What is this?*), decider (a decision model: the engine's own ranking stands unless it is
//     sure) and semantic (on this device — coming). A model holds the seats the hand gave it; one that holds none
//     is "any job", asked as every model was before seats.
//   - A seat chosen NARROWS who is asked; a seat left alone changes nothing. That is the whole of the migration:
//     with no seat chosen every rule here returns what the surface did before.
//   - Fallbacks are stated, in order. Reader: the one chosen, else Claude Code while it is seated, else the writer if
//     it sees, else the smallest model that sees. Writer: the one chosen, else every model with no other seat — and
//     Claude Code, while it is seated, stands first of all (J4). Decider: none; the engine's ranking is the answer.
//   - A decider is never a reader or a writer. It is not in the pool of models at all.
//   - One key a provider, entered once, used by every seat on it; kept on the device only for a provider whose key
//     the hand asked to remember; never in a pick, never in the log.

  /** The seats, in the order the pane shows them. */
  const SEATS = ['reader', 'writer', 'decider', 'semantic'];

  /** What each seat is for, in the person's words, and what is asked of it. */
  const SEAT_WORDS = {
    reader: { job: 'reads handwriting into text — a model that can see, quick and exact (OCR)', needs: 'a model that sees' },
    writer: { job: 'writes — briefs, pages, programs, and says what a group is (What is this?)', needs: 'a model' },
    decider: { job: 'chooses between what the engine already holds — which of two matching definitions — and only when it is sure', needs: 'a decision model' },
    semantic: { job: 'notes like this, and search beyond the word typed — on this device, nothing sent anywhere', needs: 'a small model that runs here' },
  };

  /** What a seat does when nothing is chosen for it, in one sentence. */
  function fallbackWords(seat) {
    switch (seat) {
      case 'reader': return 'nothing chosen — Claude Code reads while it is seated, else the writer if it sees, else the smallest joined model that sees';
      case 'writer': return 'nothing chosen — every joined model that holds no other seat is asked, and Claude Code first while it is seated';
      case 'decider': return 'nothing chosen — the engine’s ranking stands, and nothing offers to ask a decision model';
      case 'semantic': return 'on this device — coming: a small model that runs here, never a key and never a call';
      default: return '';
    }
  }

  /**
   * Who is asked to READ writing, from the joined models: `{ id, vision, seats[], size, claude }` each. Returns the ids
   * and why, in a clause. A model that cannot see never reads; a decider never reads.
   */
  function resolveReaders(models) {
    const seers = models.filter((m) => m.vision && !m.seats.includes('decider'));
    const chosen = seers.filter((m) => !m.claude && m.seats.includes('reader'));
    if (chosen.length) return { who: [chosen[0].id], why: 'the reader seat' };
    const claude = seers.find((m) => m.claude);
    if (claude) return { who: [claude.id], why: 'Claude Code, seated' };
    const writer = seers.find((m) => m.seats.includes('writer'));
    if (writer) return { who: [writer.id], why: 'no reader seat — the writer sees' };
    const any = seers.filter((m) => m.seats.length === 0).sort((a, b) => (a.size === b.size ? 0 : a.size < b.size ? -1 : 1));
    if (any.length) return { who: [any[0].id], why: 'no reader seat — the smallest model that sees' };
    return { who: [], why: 'no model that sees' };
  }

  /**
   * Who is asked to WRITE — a brief, a page, a program, *What is this?* — from the joined models. The writer seat
   * when one is chosen; else every model that holds no seat. Claude Code, while seated, stands first (J4). A model
   * that holds only the reader or decider seat is not asked.
   */
  function resolveWriters(models) {
    const claude = models.filter((m) => m.claude);
    const chosen = models.filter((m) => !m.claude && m.seats.includes('writer'));
    const pool = chosen.length ? chosen : models.filter((m) => !m.claude && m.seats.length === 0);
    return { who: claude.concat(pool).map((m) => m.id), why: chosen.length ? 'the writer seat' : 'every joined model with no seat' };
  }

  // ---- keys: one a provider ----

  /** A provider's key is held under its address, without a trailing slash or its case. */
  function keyId(baseUrl) { return String(baseUrl || '').trim().replace(/\/+$/, '').toLowerCase(); }

  /** What is kept on the device of the keys held: only a provider whose key the hand asked to remember. */
  function keysToKeep(held, remembered) {
    const out = {};
    for (const [id, key] of held) if (remembered.has(id) && typeof key === 'string' && key) out[id] = key;
    return out;
  }

  /**
   * What an older device kept — one pick and one key (`mm-model-pick`, `mm-model-key`) — becomes the writer seat, and
   * the reader seat too for a model that sees; the key becomes its provider's. A device whose seats are already kept is
   * never migrated again. Never lost: nothing here deletes, the adapter lets the old entries go once these are written.
   */
  function migrateStored(stored) {
    const seats = stored && stored.seats && typeof stored.seats === 'object' ? stored.seats : null;
    const keys = stored && stored.keys && typeof stored.keys === 'object' ? stored.keys : {};
    const had = seats && ['reader', 'writer', 'decider', 'any'].some((k) => seats[k]);
    const pick = stored && stored.pick;
    if (had || !pick || !pick.baseUrl || !pick.model) return { seats: seats || {}, keys: Object.assign({}, keys), migrated: false };
    const next = { writer: pick };
    if (pick.vision) next.reader = pick;
    const kept = Object.assign({}, keys);
    if (typeof stored.key === 'string' && stored.key) kept[keyId(pick.baseUrl)] = stored.key;
    return { seats: next, keys: kept, migrated: true };
  }

  // ---- the pane ----

  /** Choices in the order the pane offers them: local before hosted (latency first), then the quickest last call, never-called last, then name. */
  function orderChoices(rows) {
    const ms = (r) => (r.ms == null ? Infinity : r.ms);
    return rows.slice().sort((a, b) => (a.local === b.local ? 0 : a.local ? -1 : 1) || (ms(a) === ms(b) ? 0 : ms(a) < ms(b) ? -1 : 1) || String(a.name).localeCompare(String(b.name)));
  }

  /** The seats a model holds, read from the picks kept — the reader, writer and decider, never "any job". */
  function seatsOfPick(seats, pick) {
    if (!seats || !pick) return [];
    return ['reader', 'writer', 'decider'].filter((k) => seats[k] && keyId(seats[k].baseUrl) === keyId(pick.baseUrl) && seats[k].model === pick.model);
  }

  /** What is kept of a model: where it is, which it is, what its provider said it can do — never a key. */
  function pickOf(config, extra) {
    const out = { baseUrl: config.baseUrl, model: config.model, kind: config.kind, vision: !!config.vision };
    if (config.title) out.title = config.title;
    // `seat` is what a join was for, not what is kept of the model; a key is never kept.
    if (extra) for (const k of Object.keys(extra)) if (extra[k] !== undefined && k !== 'apiKey' && k !== 'seat') out[k] = extra[k];
    return out;
  }

// ===== teach =====
// Provides: teaching the command mark: the pad, samples, the held mark on this device, the rail chip; togglePanel/closePanel.
// Uses: core, view (render), input (capture, palmHere).
// A fragment of one closure: Demos/build-surface.mjs concatenates surface/*.js
// in name order inside `(function () Ellipsis)();`. Shared state is the
// closure's; no imports, no exports, no build step beyond the concatenation.

  // ===== Teaching the command mark ========================================
  // Five samples become a signature, through the same fingerprint machinery
  // that learns any shape you name. Taught in a dedicated pad rather than on
  // the canvas, so the canvas itself never enters a mode (MVP.md §5.2).
  const teachPanel = document.getElementById('teachPanel');
  const teachBtn = document.getElementById('teachBtn');
  ui.pane(teachPanel, 'your mark', () => closePanel(teachPanel, teachBtn));
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

  // The pad follows one pointer: a palm on the glass while the pen teaches is neither a stroke
  // of its own nor the end of the pen's (V1-PLAN R6). A mouse is one pointer, as before.
  let padPointer = null;
  pad.addEventListener('pointerdown', (e) => {
    if (e.pointerType === 'touch' && palmHere()) return;
    if (padStroke && e.pointerId !== padPointer) return;
    capture(pad, e);
    padPointer = e.pointerId;
    if (samplesHeld || samples.length >= MM.COMMAND_MARK_SAMPLES) {
      samples = []; samplesHeld = false; teachUse.disabled = true;
      teachStatus.className = ''; teachStatus.textContent = '';
    }
    const r = pad.getBoundingClientRect();
    padStroke = [{ x: e.clientX - r.left, y: e.clientY - r.top }];
  });
  pad.addEventListener('pointermove', (e) => {
    if (!padStroke || e.pointerId !== padPointer) return;
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
  // The stroke's own release ends it, wherever it lands — capture not taken,
  // the pen lifted off the pad. Otherwise the pad keeps drawing wherever the
  // pointer goes next, which is the "held pointer" that broke the first use of
  // the pad. Another pointer's release (a palm lifting) is not the stroke's.
  const padRelease = (e) => { if (padStroke && e.pointerId === padPointer) endPadStroke(); };
  pad.addEventListener('pointerup', padRelease);
  pad.addEventListener('pointercancel', padRelease);
  addEventListener('pointerup', padRelease, true);
  addEventListener('pointercancel', padRelease, true);

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
    } else if (mark.consistency < 0.5) {
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

  // What a mark is for, said before anything is asked of the hand (PLAN-USER-SURFACE U1g; it used to
  // say only "Draw your mark five times"). The chip in the bar says the same (the page's markChip).
  const MARK_SAYS = 'A mark is a gesture: circle some marks, then draw your mark across them to see what they can become.';
  // What the pane says depends on whether a mark is already held.
  function showPadState() {
    const held = !!session.getState().commandMark;
    teachForget.hidden = !held;
    if (held) {
      teachHint.innerHTML = MARK_SAYS + ' <b>Your mark</b> is held. Draw here to teach a new one; <b>Forget</b> goes back to ✓.';
      teachStatus.className = '';
      teachStatus.textContent = samples.length ? 'Held on this device — the five it learned from.' : 'Held on this device.';
    } else {
      teachHint.innerHTML = MARK_SAYS + ' The built-in mark is a check ✓ — teach your own by drawing it <b>five times</b>.';
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
    teachStatus.textContent = 'Learned, and held on this device. Your mark summons now; the check does not.';
    render(session.getState());
  };
  document.getElementById('teachClear').onclick = () => {
    samples = []; samplesHeld = false; teachUse.disabled = true; teachStatus.textContent = ''; drawPad();
    if (session.getState().commandMark) {
      teachStatus.textContent = 'Draw the new mark five times; the held one stays until you use this one.';
    }
  };
  teachForget.onclick = forgetMark;
  document.getElementById('teachClose').onclick = () => closePanel(teachPanel, teachBtn);
  teachBtn.onclick = () => {
    togglePanel(teachPanel, teachBtn);
    if (!teachPanel.hasAttribute('hidden')) { sizePad(); showPadState(); }
  };
  // The mark chip in the bar is drawn in the theme's colour; a theme change redraws it.
  function redrawMarkChip() { shownMark = undefined; shownGlyph = undefined; syncMarkChip(session.getState()); }
  document.getElementById('markChip').onclick = () => teachBtn.click();

  // The ACTIVE mark, echoed in the rail. Shown from the start, not only once you
  // have taught one — a gesture you cannot see is a gesture you have to be told
  // about, and the built-in check deserves the same visibility as yours.
  //
  // Driven from session state rather than from the teach button, so undoing the
  // teach event puts the check back in the rail. A chip that disagrees with the
  // grammar is worse than no chip.
  let shownMark = undefined, shownGlyph = undefined;
  // The check's glyph, made once: the canonical samples are made afresh on
  // every call, so asking for them in every paint made every paint redraw the
  // chip and rewrite its name — a change to the page on every frame of a pan.
  let checkGlyph = null;
  function syncMarkChip(s) {
    const name = s.commandMark ? s.commandMark.name : 'check';
    const glyph = s.commandMark && taughtGlyph ? taughtGlyph : (checkGlyph || (checkGlyph = MM.canonicalCheckSamples()[0]));
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

  // Panes are exclusive: opening one closes the other (openPane, in the controls fragment).
  function togglePanel(el, btn) {
    const open = el.hasAttribute('hidden');
    if (open) openPane(el, btn); else closePanel(el, btn);
  }
  function closePanel(el, btn) {
    el.setAttribute('hidden', ''); if (btn) btn.setAttribute('aria-pressed', 'false');
  }

// ===== models =====
// Provides: the model pane: probing local servers, joining by key, remembering the pick, offerModel,
//   and what the canvas does with no model (the tools registry's own, renderTools);
//   the work-in-progress register (withWork); askModelsAbout/cancelReading — a model is asked only by a deliberate act;
//   (V1-PLAN J5) what a provider says a model can do (factsOf), each model's last call and try it (noteOutcome),
//   an ask kept until a model that can answer it is here (keepAsk, keptFor, needFor), one local model suggested a job,
//   and a model's name and a reading in words (modelWords, readingWords);
//   (V1-PLAN I7) who is asked, by seat — writers() here, readers() in 06-handwriting.js, the rules in 03-seats.js, the pane,
//   the keys and the decider in 04-seatpane.js.
// Uses: core, ui, teach (togglePanel), render, palette (refreshPalette), input (say), seats (03-seats.js: the rules),
//   seatpane (04-seatpane.js: assignSeat, joinDecider, keyFor, holdKey, commitKey, renderSeats, seatsOf).
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
  ui.pane(panel, 'models', () => closePanel(panel, modelBtn));
  const mpProvider = document.getElementById('mpProvider');
  const mpEndpoint = document.getElementById('mpEndpoint');
  const mpModel = document.getElementById('mpModel');
  const mpKey = document.getElementById('mpKey');
  const mpRememberKey = document.getElementById('mpRememberKey');
  const mpStatus = document.getElementById('mpStatus');
  const mpList = document.getElementById('mpList');
  const mpLocal = document.getElementById('mpLocal');

  const DEFAULT_MODEL = { openRouter: 'anthropic/claude-opus-5', anthropic: 'claude-opus-5', custom: '' };
  const agents = [];       // AgentParticipant[] — several models can coexist
  const agentKeys = new WeakMap(); // agent → what this page knows it by
  let agentsMade = 0;
  /**
   * What a joined model is known by on this page — its own, and never its participant id. An id is the
   * board's counter, and a board loaded in place hands the same one to whoever joins there next: a model
   * is seated again on every board it is asked on (core's `seat`, `participants/seated.ts`), so its
   * participant id moves while the model stays. Every map below is keyed by this.
   */
  function agentKey(a) {
    let k = agentKeys.get(a);
    if (!k) { k = 'model:' + (++agentsMade); agentKeys.set(a, k); }
    return k;
  }
  let localServers = [];   // [{ source, host, baseUrl, models, skipped }]

  const store = {
    get(k) { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (err) { return null; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (err) { /* private mode */ } },
    del(k) { try { localStorage.removeItem(k); } catch (err) { /* nothing */ } },
  };

  // ===== What a provider says a model can do, and each model's last call (V1-PLAN J5) =====
  // John joined GLM Flash from OpenRouter and could not get the canvas to send
  // it anything: whether a model could see was guessed from its id, and "glm"
  // was not in the guess, so *Read the writing* never asked it — it opened this
  // pane instead, which looked exactly like "it won't send". Now a join asks
  // the provider's own list (read once a page, lazily, never waited on past
  // LIST_WAIT_MS — a list that lands later still corrects the join), and each
  // model's row keeps its last call — ok, how long, what it came to — or the
  // failure in full, until the next.
  const LIST_WAIT_MS = 3000;
  const catalogs = new Map(); // baseUrl → Promise<ModelCatalog>, read once a page; a failure is not kept
  const factsOf = new Map();  // agent id → ModelFacts: what its provider said it can do, or why that is a guess
  const lastCall = new Map(); // agent id → { ok, ms, at, reply, error, truncated, what } — kept until the next
  const asking = new Map();   // agent id → calls in flight
  const sendOf = new Map();   // agent id → the transport that keeps its last call

  /** A model's name as the board says it: no `llm:`, what its provider calls it, else its id with colons as spaces — "qwen3.5 9b". */
  function modelWords(who) {
    if (!who) return '';
    if (typeof who === 'string') {
      const a = agents.find((x) => x.name === who || x.id === who);
      if (a) return modelWords(a);
      return /^llm:/.test(who) ? MM.modelWords({ model: who.slice(4) }) : who;
    }
    const c = who.config || {};
    return c.kind === 'openai-compatible' || c.kind === 'anthropic' ? MM.modelWords(c) : (who.name || '');
  }
  /** A reading in words, not a slug: "state-transformation" → "state transformation". Display only — the held reading keeps its label. */
  function readingWords(label) { return String(label || '').replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim(); }
  /** A reply, short enough for a row. */
  function clipWords(text, n) { const t = String(text || '').replace(/\s+/g, ' ').trim(); return t.length > (n || 60) ? t.slice(0, (n || 60) - 1) + '…' : t; }
  const isModel = (a) => !!a && !!a.config && (a.config.kind === 'openai-compatible' || a.config.kind === 'anthropic');

  /** The provider's list, read once a page and kept; a list that could not be read is asked again next time. */
  function catalogOf(config) {
    const key = config.baseUrl.replace(/\/+$/, '');
    let p = catalogs.get(key);
    if (!p) {
      p = MM.readModels(config).then((c) => { if (!c.ok) catalogs.delete(key); return c; });
      catalogs.set(key, p);
    }
    return p;
  }

  /**
   * What a join is told of a model: what its provider's list says, if the list answers within
   * LIST_WAIT_MS; else what it said when the model last joined, else its id's guess — and the list,
   * still coming, corrects the join when it lands (`later`). Anthropic is not asked: its list wants
   * the key and says nothing of images, and every Claude model takes them.
   */
  async function factsFor(config, remembered) {
    const where = MM.whereOf(config.baseUrl);
    if (config.kind === 'anthropic') {
      const vision = MM.guessVision(config.model);
      return { first: { ok: true, facts: { vision: vision, from: 'id', said: 'Anthropic is not asked — every Claude model takes images', because: 'Anthropic is not asked; every Claude model takes images' } }, later: null, where: where };
    }
    const list = catalogOf(config);
    let timer = 0;
    const late = new Promise((r) => { timer = setTimeout(() => r(null), LIST_WAIT_MS); });
    const catalog = await Promise.race([list, late]);
    clearTimeout(timer);
    if (catalog) return { first: MM.modelFacts(config.model, catalog, where, remembered), later: null, where: where };
    const waiting = { ok: false, models: [], describes: false, error: 'it did not answer in ' + LIST_WAIT_MS / 1000 + ' s' };
    return { first: MM.modelFacts(config.model, waiting, where, remembered), later: list, where: where };
  }

  /** What the facts say, on the config the transport reads: whether it sees, what it is called, what it may read and write. */
  function applyFacts(config, facts) {
    config.vision = !!facts.vision;
    if (facts.title) config.title = facts.title;
    if (facts.contextLength) config.contextLength = facts.contextLength;
    if (facts.maxOutput) config.maxOutput = facts.maxOutput;
  }

  /** The kept picks keep what the provider said, so a list that cannot be read at the next visit still knows (I7: every seat's, in 04-seatpane.js). */
  function rememberFacts(config) { refreshPicks(config); }

  /** The transport a joined model is asked through: core's, with each call kept for its row. */
  function recording(holder) {
    return (config, messages, opts) => {
      const t0 = performance.now();
      if (holder.agent) { asking.set(agentKey(holder.agent), (asking.get(agentKey(holder.agent)) || 0) + 1); renderAgents(); }
      return MM.complete(config, messages, opts).then((res) => {
        if (holder.agent) noteCall(holder.agent, res, performance.now() - t0);
        return res;
      });
    };
  }
  function sendFor(agent) {
    if (!sendOf.has(agentKey(agent))) sendOf.set(agentKey(agent), recording({ agent: agent }));
    return sendOf.get(agentKey(agent));
  }
  /** A call ended: kept for the row, whatever it came to — except a cancel, which is no outcome. */
  function noteCall(agent, res, ms) {
    asking.set(agentKey(agent), Math.max(0, (asking.get(agentKey(agent)) || 1) - 1));
    if (!(res && !res.ok && res.error === 'cancelled')) {
      lastCall.set(agentKey(agent), { ok: !!res.ok, ms: ms, at: Date.now(), reply: res.ok ? res.text : null, error: res.ok ? null : res.error, truncated: !!(res.ok && res.truncated), what: null });
    }
    renderAgents();
  }
  /** What the call came to in the canvas's terms — read “hello”, reads it as molecule — or why its answer was no use. */
  function noteOutcome(agent, ok, what) {
    if (!agent || (!ok && what === 'cancelled')) return;
    const c = lastCall.get(agentKey(agent)) || { ok: ok, ms: null, at: Date.now(), reply: null, error: null, truncated: false, what: null };
    const next = Object.assign({}, c);
    if (ok) { next.ok = true; next.what = what; }
    else if (c.ok !== false) { next.ok = false; next.error = what + (c.truncated ? ' — the answer was cut off at the token limit' : ''); next.what = null; }
    lastCall.set(agentKey(agent), next);
    renderAgents();
  }
  /** A row's last call, in a line: "ok · 1.8 s · read “hello”", or "failed · 0.4 s · HTTP 401 — bad key: …". */
  function callLine(c) {
    if (!c) return '';
    const secs = c.ms == null ? '' : ' · ' + (c.ms / 1000).toFixed(1) + ' s';
    if (c.ok) return 'ok' + secs + ' · ' + (c.what || 'replied “' + clipWords(c.reply) + '”') + (c.truncated && !c.what ? ' · cut off at the token limit' : '');
    return 'failed' + secs + ' · ' + c.error;
  }
  /** Tokens, short: 202752 → "203k". */
  const tokensShort = (n) => (n >= 1000 ? Math.round(n / 1000) + 'k' : String(n));

  // ===== An ask kept until a model that can answer it is here (J5, the pure-user walkthrough) =====
  // Asking never opens this pane as a side effect. An ask that needs a model —
  // What is this?, Read the writing, a brief — with none here that can answer
  // it is KEPT: the status line says so once, the field says what it needs
  // with a way to choose one, and the moment a model that can answer it joins,
  // it runs. The pane opens only when the hand asks for it ("choose one").
  let keptAsk = null; // { what, needs: 'model'|'sees', need, sentence, ids, summonId, generation, run(ids) }
  /** What a tool's ask needs that no joined model gives — "needs a model that can see" — or null. */
  function needFor(tool) {
    if (tool === 'which') return null; // offered only with a decider seated: it is the one asked
    if (tool === 'read') return readers().length ? null : 'needs a model that can see';
    return writers().length ? null : 'needs a model';
  }
  function keepAsk(ask) {
    const s = session.getState();
    keptAsk = Object.assign({ at: Date.now(), generation: s.generation, summonId: s.summon ? s.summon.id : null }, ask);
    say(ask.sentence);
    mpStatus.textContent = ask.sentence;
    refreshPalette();
    return false;
  }
  /** The ask kept for this field, if one waits there. */
  function keptFor(summon) { return keptAsk && summon && keptAsk.summonId === summon.id ? keptAsk : null; }
  /** A model joined (or learned it can see): the kept ask runs if it can answer it. */
  function runKeptAsk(agent) {
    if (!keptAsk || !agent) return false;
    // A model joined (or learned it can see): the ask runs if some seat now can answer it — the reader for a read, the writer for the rest (I7).
    if (keptAsk.needs === 'sees' ? !readers().length : !writers().length) return false;
    const ask = keptAsk;
    keptAsk = null;
    const s = session.getState();
    const ids = (ask.ids || []).filter((id) => s.nodes.has(id));
    if (s.generation !== ask.generation || (ask.ids && ask.ids.length && !ids.length)) {
      say('the ask kept for a model was about marks no longer here — nothing asked');
      refreshPalette();
      return false;
    }
    const who = ask.needs === 'sees' ? readers() : writers();
    say('asking ' + (who.length ? who.map((a) => modelWords(a)).join(', ') : modelWords(agent)) + ' what you asked before a model was here: ' + ask.what);
    ask.run(ids);
    refreshPalette();
    return true;
  }

  function syncProviderFields() {
    const p = mpProvider.value;
    mpEndpoint.hidden = p !== 'custom' && p !== 'mcp';
    mpKey.hidden = p === 'mcp';
    mpEndpoint.placeholder = p === 'mcp' ? 'http://127.0.0.1:8030 — the door (Demos/mcp-client.mjs)' : 'http://host:port/v1';
    const forEl = document.getElementById('mpFor'), job = forEl ? forEl.value : 'any';
    mpModel.placeholder = p === 'mcp' ? 'a name for it (optional)' : (defaultModelFor(p, job) || (job === 'reader' ? 'a model that can see' : 'model id'));
    mpKey.placeholder = p === 'custom' ? 'API key (if the endpoint needs one)' : 'API key';
  }
  /** The model a seat asks for when none is typed: the writer's and the decider's are what John chose; the reader's is the hand's to name (a model that sees). */
  function defaultModelFor(provider, seat) {
    if (seat === 'decider') return MM.DEFAULT_DECIDER_MODEL;
    if (seat === 'writer' && provider === 'openRouter') return 'z-ai/glm-5.3-flash';
    if (seat === 'reader') return provider === 'anthropic' ? DEFAULT_MODEL.anthropic : '';
    return DEFAULT_MODEL[provider] || '';
  }
  mpProvider.onchange = syncProviderFields;
  syncProviderFields();

  // --- Local servers, both at once ---
  async function probeLocal() {
    // Each server says what its models can do; the pane only relays it. A
    // model that can SEE is the one that gets asked to read handwriting —
    // Ollama lists `vision` among capabilities, LM Studio types the model `vlm`.
    // How big a model is, in billions of parameters, for suggesting one a job (J5): what the
    // server says ("9.7B", "137M"), else what its name says ("qwen3:8b"); unknown is Infinity.
    const billions = (said, name) => {
      const m = /^(\d+(?:\.\d+)?)\s*([BM])/i.exec(String(said || '')) || /(\d+(?:\.\d+)?)\s*(b)\b/i.exec(String(name || ''));
      return m ? parseFloat(m[1]) / (m[2].toUpperCase() === 'M' ? 1000 : 1) : Infinity;
    };
    const probes = [
      { source: 'Ollama', preset: 'ollama', list: ['http://localhost:11434/api/tags'],
        pick: (d) => (d.models || []).map((m) => ({ name: m.name,
          chat: !(m.capabilities && m.capabilities.length && !m.capabilities.includes('completion')) && !/embed/i.test(m.name),
          vision: !!(m.capabilities && m.capabilities.includes('vision')),
          size: billions(m.details && m.details.parameter_size, m.name) })) },
      { source: 'LM Studio', preset: 'lmStudio', list: ['http://localhost:1234/api/v0/models', 'http://localhost:1234/v1/models'],
        pick: (d) => (d.data || []).map((m) => ({ name: m.id, chat: !/embed/i.test(m.id) && m.type !== 'embeddings',
          vision: m.type === 'vlm', size: billions(null, m.id) })) },
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
        sizes: Object.fromEntries(all.map((m) => [m.name, m.size])),
        skipped: all.filter((m) => !m.chat).map((m) => m.name),
      };
    }));
    localServers = settled.filter((r) => r.status === 'fulfilled').map((r) => r.value);
    renderLocal();
    return localServers;
  }

  const isJoined = (baseUrl, model) => agents.some((a) => a.config.baseUrl === baseUrl && a.config.model === model);

  // One model a job (J5, the pure-user walkthrough): with a long list on this
  // machine the pane suggests the smallest model that sees, for reading
  // writing (a word is a small job, and a 27B model takes minutes at it), and
  // a mid-size one for What is this? — and keeps the rest behind "all N
  // models". A flat list of thirteen asked the hand to know them all.
  let showAllLocal = false;
  const SUGGEST_FROM = 4; // fewer models than this are simply listed
  const MID_SIZE_B = 8;   // What is this?: the model nearest this many billions — enough to read a brief, quick enough on a laptop
  function suggestLocal(servers) {
    const all = [];
    for (const sv of servers) for (const name of sv.models) all.push({ sv: sv, name: name, sees: sv.vision.includes(name), size: (sv.sizes && sv.sizes[name]) || Infinity });
    if (all.length < SUGGEST_FROM) return null;
    const seers = all.filter((m) => m.sees).sort((a, b) => a.size - b.size || a.name.localeCompare(b.name));
    const near = (m) => Math.abs(Math.log(m.size / MID_SIZE_B));
    const sized = all.filter((m) => Number.isFinite(m.size)).sort((a, b) => near(a) - near(b) || a.name.localeCompare(b.name));
    return { read: seers[0] || null, what: sized[0] || all[Math.floor(all.length / 2)] };
  }
  function modelButton(sv, m, job) {
    const on = isJoined(sv.baseUrl, m);
    const why = (job ? job + ' · ' : '') + (on ? 'joined' : 'local' + (sv.vision.includes(m) ? ' · sees' : '') + ' · tap to join');
    return '<button class="model' + (job ? ' suggested' : '') + (on ? ' on' : '') + '" data-base="' + esc(sv.baseUrl) + '" data-model="' + esc(m) + '">' +
      '<span>' + esc(m) + '</span><span class="why">' + esc(why) + '</span></button>';
  }

  function renderLocal() {
    if (!localServers.length) {
      mpLocal.innerHTML = '<div class="note">nothing answered on :11434 or :1234</div>';
      return;
    }
    let html = '';
    const sug = suggestLocal(localServers);
    if (sug) {
      const count = localServers.reduce((n, sv) => n + sv.models.length, 0);
      const jobs = new Map();
      const add = (m, job) => { if (!m) return; const k = m.sv.baseUrl + ' ' + m.name; if (jobs.has(k)) jobs.get(k).jobs.push(job); else jobs.set(k, { m: m, jobs: [job] }); };
      add(sug.read, 'reads writing');
      add(sug.what, 'what is this?');
      html += '<div class="server"><b>suggested</b><span>one model a job</span></div>';
      for (const j of jobs.values()) html += modelButton(j.m.sv, j.m.name, j.jobs.join(' · '));
      html += '<button class="ghost mpAll" type="button">' + (showAllLocal ? 'fewer ▴' : 'all ' + count + ' models ▾') + '</button>';
    }
    if (!sug || showAllLocal) {
      for (const sv of localServers) {
        html += '<div class="server"><b>' + esc(sv.source) + '</b><span>' + esc(sv.host) + '</span></div>';
        for (const m of sv.models) html += modelButton(sv, m, null);
        if (!sv.models.length && sv.skipped.length) {
          html += '<div class="note">only embedding models here — they cannot chat</div>';
        } else if (sv.skipped.length) {
          html += '<div class="note">' + sv.skipped.length + ' embedding model' + (sv.skipped.length === 1 ? '' : 's') + ' hidden</div>';
        }
      }
    }
    mpLocal.innerHTML = html;
    mpLocal.querySelectorAll('.model').forEach((btn) => {
      btn.onclick = () => {
        const sv = localServers.find((x) => x.baseUrl === btn.dataset.base);
        const name = btn.dataset.model, sees = sv.vision.includes(name);
        const because = sv.source + (sees ? ' lists vision among what it takes' : ' lists no vision for it');
        const seat = forSeat();
        const config = Object.assign({}, MM.PRESETS[sv.preset], { model: name, vision: sees });
        const facts = { vision: sees, from: 'provider', said: because, because: because };
        // The seat the form says (For): the model tapped sits there — or, for the decider, is asked what to decide.
        if (seat === 'decider') joinDecider(config, { provider: sv.preset, seat: 'decider' });
        else join(config, { provider: sv.preset, seat: seat }, facts);
      };
    });
    const all = mpLocal.querySelector('.mpAll');
    if (all) all.onclick = () => { showAllLocal = !showAllLocal; renderLocal(); };
  }

  // --- Joining, and remembering ---
  // `facts`: what its provider said it can do, or why that is a guess (J5) — the row's tooltip, and the
  // reason a model that reads text only gives when writing is to be read. `made`: a participant made
  // elsewhere — the seat (24-seat.js, J4) — joins the same way.
  function join(config, pick, facts, made) {
    if (isJoined(config.baseUrl, config.model)) {
      mpStatus.textContent = MM.modelWords(config) + ' is already here.';
      return null;
    }
    // Several models may run at once — that is the point. Every model is
    // tier 2; local or hosted is a cost the router pays attention to. Each is
    // asked through a transport that keeps its last call for its row (J5); the
    // seat brings its own transport, and its row keeps what noteOutcome says.
    const holder = {};
    const send = recording(holder);
    const agent = made || MM.createAgentParticipant(session, config, Date.now(), { transport: send });
    holder.agent = agent;
    if (!made) sendOf.set(agentKey(agent), send);
    if (facts) factsOf.set(agentKey(agent), facts);
    agents.push(agent);
    // The seat it takes (I7) and what is kept of it: what the provider said (whether it sees, what it is called) — never the key,
    // which is the provider's, entered once (04-seatpane.js).
    if (pick) { metaOfAgent.set(agentKey(agent), pick); assignSeat(pick.seat || 'any', agent); }
    mpStatus.textContent = modelWords(agent) + ' joined' + (pick && pick.seat && pick.seat !== 'any' ? ' as the ' + pick.seat : '') + ' (' + MM.providerLocality(config) + (config.vision ? ', sees' : '') + ').';
    renderAgents();
    renderLocal();
    syncTiles();
    render(session.getState());
    // Nothing is read on join: a model is asked when you ask (§6.3). Auto-read is the one exception, and it is a tile —
    // and an ask the hand made before any model was here, kept for one that can answer it (J5).
    if (autoRead) readWriting(session.getState());
    runKeptAsk(agent);
    return agent;
  }

  /**
   * Join a hosted model, or one at a custom endpoint, the way its provider says it can be (J5): its
   * list is asked what the model is — refused, with the nearest ids, when the list holds no such id;
   * joined with whether it sees and what it reads when it does; joined on its id's guess, said to be,
   * when the list does not answer within LIST_WAIT_MS, and corrected when it lands.
   */
  const joining = new Set();
  async function joinHosted(config, pick, remembered) {
    const k = config.baseUrl + ' ' + config.model;
    if (isJoined(config.baseUrl, config.model)) { mpStatus.textContent = MM.modelWords(config) + ' is already here' + (config.apiKey ? ' — its key is set.' : '.'); return null; }
    if (joining.has(k)) return null;
    joining.add(k);
    try {
      const where = MM.whereOf(config.baseUrl);
      mpStatus.textContent = 'asking ' + where.name + ' what ' + config.model + ' can do…';
      const got = await factsFor(config, remembered);
      if (!got.first.ok) { mpStatus.textContent = got.first.error; return null; }
      applyFacts(config, got.first.facts);
      const agent = join(config, pick, got.first.facts);
      if (!agent) return null;
      rememberFacts(config);
      mpStatus.textContent = modelWords(agent) + ' joined — ' + got.first.facts.said + '.';
      if (got.later) got.later.then((catalog) => refineFacts(agent, catalog, got.where));
      return agent;
    } finally {
      joining.delete(k);
    }
  }
  /** The provider's list landed after the join: what it says now stands — or, where it holds no such id, the row says so. */
  function refineFacts(agent, catalog, where) {
    if (!agents.includes(agent) || !catalog || !catalog.ok) return;
    const f = MM.modelFacts(agent.config.model, catalog, where);
    if (!f.ok) { noteOutcome(agent, false, f.error); mpStatus.textContent = f.error; return; }
    applyFacts(agent.config, f.facts);
    factsOf.set(agentKey(agent), f.facts);
    rememberFacts(agent.config);
    renderAgents();
    syncTiles();
    runKeptAsk(agent);
  }

  function leave(agent) {
    const i = agents.indexOf(agent);
    if (i >= 0) agents.splice(i, 1);
    factsOf.delete(agentKey(agent)); lastCall.delete(agentKey(agent)); asking.delete(agentKey(agent)); sendOf.delete(agentKey(agent));
    // The session keeps the join in its history; it simply stops being asked. Its seats are let go, and a key no joined model
    // on its provider still uses is forgotten, as it was.
    forgetSeats(agent);
    mpStatus.textContent = modelWords(agent) + ' left.';
    renderAgents();
    renderLocal();
    syncTiles();
    render(session.getState());
  }

  // What the canvas does itself, with no model (V1-PLAN B1): the registered tools that
  // ask none, each with what it does as its tooltip — so what a model ADDS is what is
  // not on this line. Read from the registry, and again whenever it changes.
  const mpTools = document.getElementById('mpTools');
  function renderTools() {
    if (!mpTools) return;
    mpTools.innerHTML = MM.registeredTools().filter((t) => !t.asks)
      .map((t) => '<span title="' + esc(t.describe()) + '">' + esc(t.name) + '</span>').join(' · ');
  }
  renderTools();
  MM.onToolsChange(renderTools);

  // Each joined model, in words (J5): what it is, where, whether it sees and how much it reads — the tooltip says
  // what its provider said, or why that is a guess — its last call, kept until the next, and *try it*.
  function renderAgents() {
    mpList.innerHTML = agents.map((a, i) => {
      const f = factsOf.get(agentKey(a));
      const tags = [a.config.kind === 'mcp' ? 'mcp' : MM.providerLocality(a.config)];
      if (isModel(a)) tags.push(a.config.vision ? 'sees' : 'text only');
      if (a.config.contextLength) tags.push(tokensShort(a.config.contextLength));
      const c = lastCall.get(agentKey(a)), busy = (asking.get(agentKey(a)) || 0) > 0;
      const line = busy ? 'asking now' + (c ? ' · last: ' + callLine(c) : '') : callLine(c);
      return '<div class="mpItem">' +
        '<div class="mpItemHead"><span class="n" title="' + esc(a.name) + '">' + esc(modelWords(a)) + '</span>' +
        (isModel(a) ? '<button class="ghost" data-try="' + i + '" title="one tiny prompt: is it there, and does it answer?">try it</button>' : '') +
        '<button class="ghost" data-leave="' + i + '">leave</button></div>' +
        '<div class="t"' + (f ? ' title="' + esc(f.said) + '"' : '') + '>' + esc(tags.join(' · ')) + '</div>' +
        (line ? '<div class="mpCall ' + (busy ? 'busy' : c.ok ? 'ok' : 'bad') + '">' + esc(line) + '</div>' : '') +
        '</div>';
    }).join('');
    mpList.querySelectorAll('[data-leave]').forEach((b) => { b.onclick = () => leave(agents[Number(b.dataset.leave)]); });
    mpList.querySelectorAll('[data-try]').forEach((b) => { b.onclick = () => tryModel(agents[Number(b.dataset.try)]); });
    renderSeats();
  }

  // *Try it* (J5): one tiny prompt, a deliberate act, and the reply — or the failure, in full — in the row.
  const TRY_MESSAGES = [
    { role: 'system', content: 'This is a connection check from a drawing canvas. Reply with the single word ok and nothing else.' },
    { role: 'user', content: 'Are you there?' },
  ];
  async function tryModel(agent) {
    if (!agent || !isModel(agent)) return;
    const res = await sendFor(agent)(agent.config, TRY_MESSAGES, {});
    if (res.ok) noteOutcome(agent, true, 'replied “' + clipWords(res.text) + '”');
    mpStatus.textContent = modelWords(agent) + (res.ok ? ' answered.' : ' did not answer — ' + res.error);
  }

  document.getElementById('mpAdd').onclick = () => {
    const p = mpProvider.value;
    if (p === 'mcp') { addMcp(); return; }
    const seat = forSeat();
    const model = (mpModel.value || defaultModelFor(p, seat) || '').trim();
    const typed = mpKey.value.trim();
    if (!model) { mpStatus.textContent = 'Which model? Type its id.'; return; }
    let config;
    if (p === 'custom') {
      const base = mpEndpoint.value.trim().replace(/\/+$/, '');
      if (!base) { mpStatus.textContent = 'Where is it? Enter the endpoint, e.g. http://localhost:8080/v1'; return; }
      config = { kind: 'openai-compatible', baseUrl: /\/v1$/.test(base) ? base : base + '/v1', model: model };
    } else {
      config = Object.assign({}, MM.PRESETS[p], { model: model });
    }
    // One key a provider (I7): typed once, it serves every seat on that provider — and every model already joined there that waits for one.
    // A key typed is held now and kept on this device only when asked, once the join has worked.
    const held = keyFor(config.baseUrl);
    if (typed) holdKey(config.baseUrl, typed);
    const key = typed || held;
    if (!key && p !== 'custom') { mpStatus.textContent = (p === 'openRouter' ? 'OpenRouter' : p) + ' needs a key — typed once, it serves every seat on it.'; return; }
    if (key) config.apiKey = key;
    const meta = { provider: p, endpoint: p === 'custom' ? config.baseUrl : undefined, seat: seat };
    // What it can do is the provider's to say (J5): its list, read once a page; the id's guess only when the list cannot be read.
    (seat === 'decider' ? joinDecider(config, meta) : joinHosted(config, meta)).then((agent) => {
      if (!agent) return;
      // A key typed is kept as the hand asked; one already held is kept now if *remember* is ticked this time.
      if (typed) commitKey(config.baseUrl, mpRememberKey.checked);
      else if (key && mpRememberKey.checked && !rememberedKeys.has(keyId(config.baseUrl))) commitKey(config.baseUrl, true);
      mpKey.value = '';
      // The seat was for this join; the next starts as any job again, so a seat is never taken by a model joined for another reason.
      const f = document.getElementById('mpFor'); if (f) { f.value = 'any'; syncProviderFields(); }
    });
  };

  document.getElementById('mpDetect').onclick = () => { mpStatus.textContent = 'looking…'; probeLocal().then((s) => { mpStatus.textContent = s.length ? '' : 'Nothing answered.'; }); };

  // ===== MCP: the door — an MCP server joins as a participant =================
  // Bidirectional: Demos/mcp.mjs lets a client write to the board; this lets
  // the board ask a server — a parsing method beside the local and hosted
  // models. The bridge is Demos/mcp-client.mjs (the browser can spawn nothing,
  // and most servers send no CORS headers). Three roles are mapped from the
  // server's tools, and the contract each is called with:
  //   read:   { brief, ids } — or { image, nodeId, brief } for handwriting —
  //           answers JSON [{label, confidence, reasoning}] / [{text, confidence}]
  //   answer: { question, ids, brief } → text, placed IN the canvas
  //   draw:   { prompt, ids } → JSON { shapes, strokes, why? }
  // A role with no tool answers gracefully that this participant does not do
  // that — the field keeps working through the others.
  function mcpAgent(endpoint, serverName, roles) {
    const name = 'mcp:' + serverName;
    // Seated like every model (core's `seat`): a board loaded in place takes the join with it, and an ask joins it again there.
    const seating = { kind: 'agent', name: name, capability: 2, locality: MM.providerLocality({ baseUrl: endpoint }) };
    let id = session.join(seating.kind, seating.name, Date.now(), seating.capability, seating.locality);
    const seat = (at) => (id = MM.seatOn(session, seating, id, at));
    const briefFor = (ids) => MM.describeSession(session.getState(), { nodeIds: ids });
    const call = async (tool, args) => {
      const res = await fetch(endpoint + '/call', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: tool, arguments: args }) });
      const out = await res.json().catch(() => ({}));
      if (!res.ok || out.error) throw new Error(out.error || 'HTTP ' + res.status);
      if (out.isError) throw new Error(out.text || 'the tool said no');
      return out;
    };
    // The first JSON value in the text, array or object — tolerant of a word around it.
    const jsonBlock = (text) => {
      const m = /(\[[\s\S]*\]|\{[\s\S]*\})/.exec(text || '');
      if (!m) throw new Error('no JSON in the answer');
      return JSON.parse(m[0]);
    };
    const slug = (s) => String(s).toLowerCase().replace(/\s+/g, '-');
    return {
      get id() { return id; }, seat: seat, name: name, config: { kind: 'mcp', baseUrl: endpoint, model: serverName },
      async interpret(ids, at) {
        seat(at);
        if (!roles.read) return { ok: false, readings: [], error: 'no read tool mapped' };
        try {
          const out = await call(roles.read, { brief: briefFor(ids), ids: ids });
          const readings = jsonBlock(out.text).map((r) => ({ label: String(r.label || r.type || '?'), confidence: Math.max(0, Math.min(1, Number(r.confidence ?? 0.7))), reasoning: String(r.reasoning || 'read by ' + name) }));
          const s = session.getState();
          for (const nid of ids) {
            if (!s.nodes.has(nid)) continue;
            session.propose({ participantId: id, nodeId: nid, edges: readings.map((r) => ({ to: 'type:' + slug(r.label), rel: 'resembles', weight: r.confidence, reasoning: r.reasoning })), at: at });
          }
          return { ok: true, readings: readings };
        } catch (err) { return { ok: false, readings: [], error: err.message }; }
      },
      async ask(question, ids, at) {
        seat(at);
        if (!roles.answer) return { ok: false, error: 'no answer tool mapped' };
        try {
          const out = await call(roles.answer, { question: question, ids: ids, brief: briefFor(ids) });
          session.answer({ participantId: id, question: question, text: out.text, aboutIds: ids, at: at });
          return { ok: true };
        } catch (err) { return { ok: false, error: err.message }; }
      },
      async generate() { return { ok: false, error: 'an MCP participant reads, answers and draws; it does not write pages (yet)' }; },
      async read(args) {
        seat(args.at);
        if (!roles.read) return { ok: false, transcripts: [], error: 'no read tool mapped' };
        try {
          const out = await call(roles.read, { image: args.image, nodeId: args.nodeId, brief: 'Read the handwriting in this ink.' });
          const ts = jsonBlock(out.text).map((t) => ({ text: String(t.text || t), confidence: Number(t.confidence ?? 0.7) }));
          if (args.hold !== false) session.propose({ participantId: id, nodeId: args.nodeId, edges: [], reps: ts.map((t) => ({ modality: 'transcript', data: { text: t.text }, confidence: t.confidence })), at: args.at });
          return { ok: true, transcripts: ts };
        } catch (err) { return { ok: false, transcripts: [], error: err.message }; }
      },
      async draw({ prompt, nodeIds, at }) {
        seat(at);
        if (!roles.draw) return { ok: false, ids: [], shapes: [], error: 'no draw tool mapped' };
        try {
          const out = await call(roles.draw, { prompt: prompt, ids: nodeIds });
          const data = jsonBlock(out.text);
          const made = [];
          const shapes = Array.isArray(data.shapes) ? data.shapes : [];
          for (const sh of MM.parseShapes(JSON.stringify(shapes))) { const pts = MM.strokeFor(sh); if (pts) made.push(session.addStroke(pts, at, id, 1, { content: true })); }
          for (const st of (Array.isArray(data.strokes) ? data.strokes : [])) {
            const pts = (Array.isArray(st) ? st : []).map((p) => ({ x: Number(p.x), y: Number(p.y) })).filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y));
            if (pts.length > 1) made.push(session.addStroke(pts, at, id, 1, { content: true }));
          }
          if (data.why && made.length) session.answer({ participantId: id, question: 'why', text: String(data.why), aboutIds: made, at: at });
          return made.length
            ? { ok: true, ids: made, shapes: shapes.map((s) => s.shape || '?') }
            : { ok: false, ids: [], shapes: [], error: 'it drew nothing the canvas can read' };
        } catch (err) { return { ok: false, ids: [], shapes: [], error: err.message }; }
      },
      async behave() { return { ok: false, error: 'no behaviour tool mapped' }; },
    };
  }

  /** The likely tool for a role, by name — the hand's own verbs guess themselves. */
  function guessTool(tools, words) {
    const t = tools.find((t) => words.some((w) => t.name.toLowerCase().includes(w)));
    return t ? t.name : '';
  }

  /** Connect to a door, show its tools with the three role pickers, and join on the hand's word. */
  async function addMcp() {
    const endpoint = mpEndpoint.value.trim().replace(/\/+$/, '');
    if (!endpoint) { mpStatus.textContent = 'Where is the door? e.g. http://127.0.0.1:8030 — node Demos/mcp-client.mjs -- node server.mjs'; return; }
    mpStatus.textContent = 'knocking…';
    let server, tools;
    try {
      const res = await fetch(endpoint + '/tools', { signal: AbortSignal.timeout(8000) });
      const out = await res.json().catch(() => ({}));
      if (!res.ok || out.error) throw new Error(out.error || 'HTTP ' + res.status);
      server = out.server || {}; tools = out.tools || [];
    } catch (err) {
      mpStatus.textContent = 'No answer — is the door running? (node Demos/mcp-client.mjs -- node server.mjs) ' + err.message;
      return;
    }
    const name = (mpModel.value.trim() || server.name || 'server').replace(/\s+/g, '-');
    const guess = {
      read: guessTool(tools, ['propose', 'interpret', 'read', 'parse', 'transcribe']),
      answer: guessTool(tools, ['say', 'answer', 'ask']),
      draw: guessTool(tools, ['draw']),
    };
    let html = '<div class="server"><b>' + esc(server.name || name) + '</b><span>' + tools.length + ' tool' + (tools.length === 1 ? '' : 's') + '</span></div>';
    if (!tools.length) { mpLocal.innerHTML = html + '<div class="note">no tools here — nothing to map</div>'; mpStatus.textContent = ''; return; }
    for (const role of ['read', 'answer', 'draw']) {
      html += '<div class="mpRow"><span class="k">' + role + '</span><select data-role="' + role + '"><option value="">— not offered</option>' +
        tools.map((t) => '<option value="' + esc(t.name) + '"' + (guess[role] === t.name ? ' selected' : '') + '>' + esc(t.name) + '</option>').join('') + '</select></div>';
    }
    html += '<div class="mpRow"><button id="mcpJoin">join as mcp:' + esc(name) + '</button></div>';
    html += '<div class="note">' + tools.map((t) => esc(t.name)).join(' · ') + '</div>';
    mpLocal.innerHTML = html;
    mpStatus.textContent = (server.name || 'The server') + ' answered — map its tools, then join.';
    mpLocal.querySelector('#mcpJoin').onclick = () => {
      const roles = {};
      mpLocal.querySelectorAll('select[data-role]').forEach((sel) => { roles[sel.dataset.role] = sel.value || null; });
      const agent = mcpAgent(endpoint, name, roles);
      agents.push(agent);
      mpStatus.textContent = agent.name + ' joined (' + Object.values(roles).filter(Boolean).length + ' of 3 roles mapped).';
      renderAgents();
      syncTiles();
      render(session.getState());
    };
  }
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
  const workControllers = new Map(); // key -> AbortController, for a call the hand can stop
  let workingPulse = 0;
  function beginWork(key, ids, label) {
    working.set(key, { ids: (ids || []).slice(), label: label, since: performance.now() });
    if (!workingPulse) workingPulse = setInterval(() => { if (working.size) render(session.getState()); else { clearInterval(workingPulse); workingPulse = 0; } }, 400);
    render(session.getState());
    return key;
  }
  function endWork(key) {
    working.delete(key);
    workControllers.delete(key);
    render(session.getState());
  }
  /** Run a model call with the thinking shown; the promise is passed through untouched. */
  function withWork(key, ids, label, promise) {
    beginWork(key, ids, label);
    return promise.finally(() => endWork(key));
  }
  /** A signal for a call registered under this key, so Esc can stop it. */
  function workSignal(key) {
    const ctl = new AbortController();
    workControllers.set(key, ctl);
    return ctl.signal;
  }
  /** How long a call has been running, said after a few seconds — a model that takes a minute is not a hang. */
  function workingLabel(w) {
    const secs = Math.round((performance.now() - w.since) / 1000);
    return w.label + (secs >= 3 ? ' · ' + secs + ' s' : '') + (secs >= 30 ? ' · Esc stops it' : '');
  }
  /**
   * The work in flight, in one phrase for the status line (PLAN-USER-SURFACE U1b): one call is
   * its label; several of one model are "qwen is working on 3 things"; and Esc is said as soon
   * as there is more than one, or one has run for a while. The detail stays on the marks' own dots.
   */
  function workingSummary() {
    const all = [...working.values()];
    if (!all.length) return '';
    if (all.length === 1) return workingLabel(all[0]);
    const byWho = new Map();
    for (const w of all) { const who = String(w.label).split(' · ')[0]; byWho.set(who, (byWho.get(who) || 0) + 1); }
    return [...byWho].map(([who, n]) => n === 1 ? who + ' is working on 1 thing' : who + ' is working on ' + n + ' things').join(', ') + ' · Esc stops it';
  }
  /** Stop every model call in flight: the hand's Esc. Nothing that landed is undone. */
  function cancelWork() {
    let n = 0;
    for (const ctl of workControllers.values()) { ctl.abort(); n++; }
    workControllers.clear();
    if (reading) { cancelReading('stopped'); n++; }
    if (n) say('stopped ' + n + ' model call' + (n === 1 ? '' : 's'));
    return n;
  }

  function offerModel(why) {
    if (panel.hasAttribute('hidden')) openPane(panel, modelBtn);
    probeLocal();
    mpStatus.textContent = why || 'That needs a model.';
  }

  // A model is asked what a group IS only when the human asks (§6.3): the
  // field's *What is this?*, or `what:` typed at a selection. Every joined
  // model is asked at once and each reading lands independently, held and
  // attributed, so the certainty row can show them beside Tier 0's.
  //
  // A reading is worth having, but it is NOT worth making the human wait for.
  // A local server answers one request at a time, so it is cancellable, and
  // committing to a prompt cancels it.
  let reading = null; // AbortController for interpretations in flight

  function cancelReading(why) {
    if (!reading) return;
    reading.abort();
    reading = null;
    if (why) say(why);
  }

  // Which marks a reading was asked about: a model's readings are held on the
  // group's first member, and the chip beside the group needs the group.
  const readGroups = new Map();
  function askModelsAbout(ids) {
    if (!ids || !ids.length) { say('nothing to read'); return false; }
    // No model here: the ask is kept, said once, and runs when one joins — never the pane popped over the field (J5).
    const asked = writers();
    if (asked.length === 0) {
      return keepAsk({ what: 'What is this?', needs: 'model', need: 'needs a model', ids: ids.slice(), run: (live) => askModelsAbout(live),
        sentence: 'What is this? needs a model — kept: it runs when one joins · choose one under models' });
    }
    cancelReading();
    readGroups.set(ids[0], ids.slice());
    const ctl = new AbortController();
    reading = ctl;
    let left = asked.length;
    asked.forEach((agent) => {
      withWork('read:' + agentKey(agent) + ':' + ids.join('+'), ids, modelWords(agent) + ' · reading the group', agent.interpret(ids, Date.now(), ctl.signal)).then((res) => {
        if (ctl.signal.aborted) return;
        if (--left === 0 && reading === ctl) reading = null;
        // The row keeps what it came to; the status line says it once — a reading in words, a failure in full (J5).
        const words = res.ok ? res.readings.map((r) => readingWords(r.label)).join(', ') : '';
        noteOutcome(agent, res.ok, res.ok ? 'reads it as ' + words : res.error);
        say(res.ok
          ? modelWords(agent) + ' reads it as ' + words
          : modelWords(agent) + ' could not read it — ' + res.error);
        render(session.getState());
        refreshPalette();
      });
    });
    return true;
  }

// ===== seatpane =====
// Provides: seats, on the page (V1-PLAN I7) — what each model holds (seatsOfAgent, assignSeat, forgetSeats, refreshPicks),
//   who is asked (writers; readers is 06-handwriting.js's, both by 03-seats.js's rules), one key a provider (keyFor,
//   holdKey, commitKey), the decider (joinDecider, askDecider, deciderHost), what a reload brings back
//   (rejoinRemembered: the old pick and key become the writer seat, once), the pane's seats section (renderSeats; the
//   form's For: forSeat) and seatsNow for tests.
// Uses: core (MM, store), seats (03-seats.js — every rule), models (agents, join, joinHosted, factsFor, applyFacts,
//   recording, lastCall, noteOutcome, callLine, isModel, modelWords, withWork, workSignal, factsOf, tryModel, renderAgents,
//   probeLocal, the pane's elements), input (say), render (render), palette (refreshPalette).
// A fragment of one closure: Demos/build-surface.mjs concatenates surface/*.js
// in name order inside `(function () { ... })();`. Shared state is the
// closure's; no imports, no exports, no build step beyond the concatenation.

  // ===== Seats (V1-PLAN I7; PLAN-IPAD-NOTES §3) ===============================
  // John has one OpenRouter key and wants on it a writer (GLM 5.3 Flash), a decision model (Jev) and a fast
  // reader. So the models pane is seats — reader, writer, decider, semantic — each holding the model the hand
  // chose for that job, the key a provider's, entered once. Nothing here asks a model: who is asked, by what
  // act, is unchanged (§6.3), and a seat chosen only NARROWS who is asked (03-seats.js has the rules, tested
  // in Node). The decider is not in the pool of models at all: it is asked one thing, on a deliberate tap.
  const SEATS_KEY = 'mm-seats';        // { reader?, writer?, decider?, any? } — picks (where, which, what the provider said), never a key
  const KEYS_KEY = 'mm-model-keys';    // { <provider's address>: key } — only for a provider whose key the hand asked to remember
  const seatsOfAgent = new Map();      // agent id → Set of seats it holds ('reader' | 'writer')
  const metaOfAgent = new Map();       // agent id → { provider, endpoint } — what a rejoin needs
  const heldKeys = new Map();          // keyId → key: entered on this page, or restored from this device
  const rememberedKeys = new Set();    // keyIds whose key the hand asked to keep on this device
  let seatPicks = {};
  let decider = null;                  // { config, seat: DecideSeat, pseudo: { id, config }, name, meta, transport }
  let pendingPicks = [];               // picks that wait for a key: { pick, seats }

  // ---- what an older device kept, and what this one keeps ----
  (function loadSeats() {
    const m = migrateStored({ pick: store.get('mm-model-pick'), key: store.get('mm-model-key'), seats: store.get(SEATS_KEY), keys: store.get(KEYS_KEY) });
    seatPicks = m.seats || {};
    for (const id of Object.keys(m.keys || {})) { heldKeys.set(id, m.keys[id]); rememberedKeys.add(id); }
    if (!m.migrated) return;
    // The old pick and key became the writer seat (and the reader, if it sees) and the provider's key; the old entries
    // go only once the new ones are read back — nothing is lost on a device that will not keep them.
    store.set(SEATS_KEY, seatPicks);
    store.set(KEYS_KEY, m.keys);
    const back = store.get(SEATS_KEY), backKeys = store.get(KEYS_KEY);
    if (back && back.writer && (!Object.keys(m.keys).length || (backKeys && Object.keys(backKeys).length))) { store.del('mm-model-pick'); store.del('mm-model-key'); }
  })();
  function saveSeats() { if (Object.keys(seatPicks).length) store.set(SEATS_KEY, seatPicks); else store.del(SEATS_KEY); }
  function saveKeys() {
    const keep = keysToKeep(heldKeys, rememberedKeys);
    if (Object.keys(keep).length) store.set(KEYS_KEY, keep); else store.del(KEYS_KEY);
  }
  const samePick = (pick, config) => !!pick && !!config && keyId(pick.baseUrl) === keyId(config.baseUrl) && pick.model === config.model;

  // ---- keys: one a provider ----
  function keyFor(baseUrl) { return heldKeys.get(keyId(baseUrl)) || ''; }
  /**
   * A key typed for a provider is held now and is its seats' key: every joined model on that provider that waits for one
   * has it at once (a seat joined later needs none typed), and a pick that waited for one rejoins.
   */
  function holdKey(baseUrl, key) {
    const id = keyId(baseUrl);
    heldKeys.set(id, key);
    for (const a of agents) if (a.config && !a.config.apiKey && keyId(a.config.baseUrl) === id) a.config.apiKey = key;
    if (decider && !decider.config.apiKey && keyId(decider.config.baseUrl) === id) decider.config.apiKey = key;
    renderSeats();
    rejoinPending(baseUrl);
  }
  /** The join worked: the key is kept on this device only when the hand asked, and a key typed without asking forgets the one kept. */
  function commitKey(baseUrl, remember) {
    const id = keyId(baseUrl);
    if (remember) rememberedKeys.add(id); else rememberedKeys.delete(id);
    saveKeys();
  }
  /** A provider no joined model uses any more has no key to hold. */
  function forgetKeyIfUnused(baseUrl) {
    const id = keyId(baseUrl);
    if (agents.some((a) => a.config && keyId(a.config.baseUrl) === id) || (decider && keyId(decider.config.baseUrl) === id)) return;
    heldKeys.delete(id);
    if (rememberedKeys.delete(id)) saveKeys();
  }

  // ---- what each model holds ----
  function sizeOf(a) { const m = /(\d+(?:\.\d+)?)\s*b\b/i.exec((a.config && a.config.model) || ''); return m ? parseFloat(m[1]) : Infinity; }
  /** The joined models as the rules read them. */
  function seatModels() {
    return agents.map((a) => ({
      id: agentKey(a), vision: !!(a.config && a.config.vision), seats: [...(seatsOfAgent.get(agentKey(a)) || [])], size: sizeOf(a),
      claude: isSeatAgent(a), local: !!a.config && a.config.kind !== 'mcp' && MM.providerLocality(a.config) === 'local',
    }));
  }
  const agentById = (key) => agents.find((a) => agentKey(a) === key) || null;
  /** Who is asked a brief, a page, a program, a question, *What is this?* — Claude Code first while it is seated. */
  function writers() { return resolveWriters(seatModels()).who.map(agentById).filter(Boolean); }
  /**
   * The writers, seated on this board before an act that blesses a loop for them. A board loaded in place took
   * their joins with it, and core's ask joins one again — which, after the bless, would stand between the bless
   * and what takes a failed brief back (`dropFailedBless`: the bless must still be this hand's last act).
   */
  function seatWriters(at) { for (const a of writers()) if (a.seat) a.seat(at); }
  /** The seat a model holds, if any: the first agent that holds it. */
  const holderOf = (seat) => agents.find((a) => (seatsOfAgent.get(agentKey(a)) || new Set()).has(seat)) || null;

  /** Put a model in a seat — one holder a seat — and keep what is needed to bring it back. `any` is a model with no seat: remembered as the one last joined, as the single pick always was. */
  function assignSeat(seat, agent) {
    if (!agent || !isModel(agent)) return;
    const pick = pickOf(agent.config, metaOfAgent.get(agentKey(agent)));
    if (seat === 'reader' || seat === 'writer') {
      const was = holderOf(seat);
      if (was && was !== agent) letGoOf(was, seat);
      const set = seatsOfAgent.get(agentKey(agent)) || new Set();
      set.add(seat);
      seatsOfAgent.set(agentKey(agent), set);
      seatPicks[seat] = pick;
      if (samePick(seatPicks.any, agent.config)) delete seatPicks.any; // it has a seat now: kept under it
    } else if (!(seatsOfAgent.get(agentKey(agent)) || new Set()).size) {
      seatPicks.any = pick;
    }
    saveSeats();
    renderSeats();
  }
  /** A model lets go of a seat (another took it, or the hand chose nothing): with no seat left it is "any job" again, and kept so. */
  function letGoOf(agent, seat) {
    const set = seatsOfAgent.get(agentKey(agent));
    if (set) { set.delete(seat); if (!set.size) seatsOfAgent.delete(agentKey(agent)); }
    if (samePick(seatPicks[seat], agent.config)) delete seatPicks[seat];
    if (!(seatsOfAgent.get(agentKey(agent)) || new Set()).size && !seatPicks.any) seatPicks.any = pickOf(agent.config, metaOfAgent.get(agentKey(agent)));
  }
  /** The hand chose nothing for a seat: whoever held it is "any job" again. */
  function unseat(seat) {
    if (seat === 'decider') { leaveDecider(); return; }
    const a = holderOf(seat);
    if (a) letGoOf(a, seat); else delete seatPicks[seat];
    saveSeats();
    renderAgents();
    syncTiles();
  }
  /** A model left: its seats, its kept picks and, if none joined uses its provider, its key. */
  function forgetSeats(agent) {
    const held = seatsOfAgent.get(agentKey(agent)) || new Set();
    seatsOfAgent.delete(agentKey(agent));
    metaOfAgent.delete(agentKey(agent));
    for (const s of held) if (samePick(seatPicks[s], agent.config)) delete seatPicks[s];
    if (samePick(seatPicks.any, agent.config)) delete seatPicks.any;
    saveSeats();
    forgetKeyIfUnused(agent.config.baseUrl);
  }
  /** What the provider said of a model, kept with every pick that names it. */
  function refreshPicks(config) {
    let changed = false;
    for (const k of Object.keys(seatPicks)) {
      if (!samePick(seatPicks[k], config)) continue;
      seatPicks[k] = Object.assign({}, seatPicks[k], { vision: !!config.vision }, config.title ? { title: config.title } : {});
      changed = true;
    }
    if (changed) saveSeats();
  }

  // ===== The decider (V1-PLAN I7; PLAN-IPAD-NOTES §3) ==========================
  // A decision model is asked one thing: which of the definitions the library says match a group about equally —
  // *Which is it?*, a pill with the dot, offered only when two tie and a decider sits here (core's `tools/which.ts`).
  // It is asked only when the hand taps that. NOT on summon, NOT on a hold: CLAUDE.md is plain that a model is asked
  // only by a deliberate act, and opening the field is not one — so the tie is offered and the hand decides to ask.
  // Its answer is one more held, attributed reading beside the engine's (`jev 0.99`, never evicting) and is taken
  // only where it leads by DECIDER_TAKE_AT; under that, the status line says what it said and why it was not used.
  /** The seat as a participant: core seats it on whichever board it is asked on (`participants/seated.ts`), so a board loaded in place needs nothing here. */
  function makeDeciderSeat(transport, name, config) {
    return MM.createDecideParticipant(session, transport, Date.now(), { name: name, locality: MM.providerLocality(config), takeAt: MM.DECIDER_TAKE_AT });
  }
  function deciderHost() { return decider ? { name: decider.name } : null; }

  /** Join a decision model: its provider's list says it exists (an id it does not hold is refused, with the nearest), the seat is made over a transport that keeps each call for its row. */
  async function joinDecider(config, meta, remembered) {
    const k = config.baseUrl + ' ' + config.model;
    if (decider && samePick(pickOf(decider.config), config)) { mpStatus.textContent = MM.modelWords(config) + ' is already the decider' + (config.apiKey ? ' — its key is set.' : '.'); return null; }
    if (joining.has(k)) return null;
    joining.add(k);
    try {
      const where = MM.whereOf(config.baseUrl);
      mpStatus.textContent = 'asking ' + where.name + ' what ' + config.model + ' can do…';
      const got = await factsFor(config, remembered);
      if (!got.first.ok) { mpStatus.textContent = got.first.error; return null; }
      applyFacts(config, got.first.facts);
      if (decider) leaveDecider(true);
      const pseudo = { id: 'decider:' + k, config: config };
      const holder = { agent: pseudo };
      const transport = MM.createChatDecideTransport(config, { complete: recording(holder) });
      const name = MM.modelWords(config);
      const seat = makeDeciderSeat(transport, name, config);
      decider = { config: config, seat: seat, pseudo: pseudo, name: name, meta: meta || {}, transport: transport };
      factsOf.set(agentKey(pseudo), got.first.facts);
      seatPicks.decider = pickOf(config, meta ? { provider: meta.provider, endpoint: meta.endpoint } : undefined);
      saveSeats();
      mpStatus.textContent = name + ' joined as the decider — ' + got.first.facts.said + '.';
      // The choice the unit asked to be said: why the decider is never asked on its own.
      say(name + ' is the decider — asked only when you tap “Which is it?” on a tie between two definitions, never on its own; its answer is taken only when it is ' + MM.DECIDER_TAKE_AT + ' sure');
      if (got.later) got.later.then((catalog) => { if (decider && decider.seat === seat && catalog && catalog.ok) { const f = MM.modelFacts(config.model, catalog, got.where); if (f.ok) { applyFacts(config, f.facts); factsOf.set(agentKey(pseudo), f.facts); refreshPicks(config); renderSeats(); } } });
      renderSeats();
      syncTiles();
      refreshPalette();
      return pseudo;
    } finally {
      joining.delete(k);
    }
  }
  function leaveDecider(quiet) {
    if (!decider) return;
    const d = decider;
    decider = null;
    factsOf.delete(agentKey(d.pseudo)); lastCall.delete(agentKey(d.pseudo)); asking.delete(agentKey(d.pseudo));
    delete seatPicks.decider;
    saveSeats();
    forgetKeyIfUnused(d.config.baseUrl);
    if (!quiet) { mpStatus.textContent = d.name + ' left the decider seat.'; renderSeats(); syncTiles(); refreshPalette(); }
  }

  /**
   * *Which is it?* — one question over one snapshot: which of the tied definitions the group is, with *none of these*
   * among them. The decider's answer lands as a held reading in its own name when it leads by DECIDER_TAKE_AT, and is
   * said in the status line either way — what it chose, how surely, and that the engine's ranking stands when it was not sure.
   */
  function askDecider(data) {
    if (!decider) { say('no decider is seated — choose one under models'); return false; }
    const d = decider;
    const ids = (data.ids || []).filter((id) => session.getState().nodes.has(id));
    if (!ids.length || !data.candidates || data.candidates.length < 2) { say('nothing to decide'); return false; }
    const q = MM.choice('which:' + ids[0], 'which of these is the group of marks?', data.candidates.map((c) => ({ id: c.id, text: c.text })), ids);
    const key = 'decide:' + agentKey(d.pseudo) + ':' + ids.join('+');
    const ctl = new AbortController();
    workControllers.set(key, ctl);
    say(d.name + ' is choosing between ' + data.candidates.map((c) => c.id).join(' and ') + '…');
    withWork(key, ids, d.name + ' · choosing', d.seat.ask([q], Date.now(), ctl.signal)).then((run) => {
      if (ctl.signal.aborted) return;
      const t = (x) => Number(x).toFixed(2);
      let ok = false, said;
      if (!run.ok) said = d.name + ' could not decide — ' + run.error;
      else if (run.refused) said = d.name + ' answered, but ' + run.refused + ' — nothing was held';
      else if (!run.rows.length) said = d.name + ' gave no answer it could be asked about — the engine’s ranking stands';
      else {
        const row = run.rows[0], a = row.answer;
        const lead = a.kind === 'choice' ? (a.distribution.slice().sort((x, y) => y.p - x.p)[0] || { of: '?', p: 0 }) : { of: '?', p: 0 };
        const word = lead.of === MM.NO_MATCH ? 'none of these' : '“' + readingWords(lead.of) + '”';
        if (row.held) { ok = true; said = d.name + ' says ' + word + ' (' + t(lead.p) + ') — held beside the engine’s readings, which stand'; }
        else if (row.below) said = d.name + ' is only ' + t(lead.p) + ' sure of ' + word + ' — under ' + MM.DECIDER_TAKE_AT + ', so the engine’s ranking stands';
        else if (row.flat) said = d.name + ' could not tell them apart — the engine’s ranking stands';
        else { ok = lead.of === MM.NO_MATCH; said = d.name + ' says ' + word + ' (' + t(lead.p) + ')' + (ok ? ' — nothing held, the engine’s ranking stands' : ''); }
      }
      // The row keeps what the CALL came to — a seat that answered under the floor answered — and the status line says what that meant.
      noteOutcome(d.pseudo, !!run.ok, run.ok ? said : run.error);
      say(said);
      render(session.getState());
      refreshPalette();
      renderSeats();
    }).finally(() => workControllers.delete(key));
    return true;
  }

  /** *Try it* on the decider: one tiny question through the same transport, a deliberate act; the reply — or the failure in full — in its row. */
  async function tryDecider() {
    if (!decider) return;
    const d = decider;
    const q = MM.choice('try', 'which of these is a fruit?', [{ id: 'apple', text: 'an apple' }, { id: 'chair', text: 'a chair' }]);
    const res = await d.transport([q], {});
    if (res.ok && res.answers.length) noteOutcome(d.pseudo, true, 'answered a test question');
    else noteOutcome(d.pseudo, false, res.ok ? 'it answered, but not in the shape asked' : res.error);
    mpStatus.textContent = d.name + (res.ok && res.answers.length ? ' answered.' : ' did not answer — ' + (res.ok ? 'not in the shape asked' : res.error));
  }

  // ===== Coming back (V1-PLAN I7) ============================================
  // Every seat kept comes back as it was. A model rejoins the way it joined: its provider asked again what it can do, a
  // remembered Ollama or LM Studio pick asked for where it runs, a hosted pick with the provider's key from this device —
  // and with no key kept, a hosted preset says so in the form (a custom endpoint rejoins keyless, as it always did), the
  // seat waiting for the key the hand types once.
  async function rejoinRemembered() {
    const jobs = new Map();
    for (const k of ['writer', 'reader', 'decider', 'any']) {
      const p = seatPicks[k];
      if (!p || !p.baseUrl || !p.model) continue;
      const id = keyId(p.baseUrl) + ' ' + p.model + (k === 'decider' ? ' decider' : '');
      if (!jobs.has(id)) jobs.set(id, { pick: p, seats: [] });
      jobs.get(id).seats.push(k);
    }
    await Promise.all([...jobs.values()].map(rejoinOne));
  }
  async function rejoinOne(job) {
    const pick = job.pick, seats = job.seats;
    const isDecider = seats.includes('decider');
    const asSeats = seats.filter((s) => s !== 'decider');
    // A local server's model is asked for again where it runs. (This asked `providerTier(…) === 1`, which has been 2 for
    // every model since 6 Sep — so a remembered Ollama pick asked for a key.)
    if (pick.provider === 'ollama' || pick.provider === 'lmStudio') {
      const servers = await probeLocal();
      const sv = servers.find((x) => x.baseUrl === pick.baseUrl);
      if (sv && sv.models.includes(pick.model)) {
        const sees = sv.vision.includes(pick.model);
        const because = sv.source + (sees ? ' lists vision among what it takes' : ' lists no vision for it');
        const config = Object.assign({}, MM.PRESETS[sv.preset], { model: pick.model, vision: sees });
        if (isDecider) { joinDecider(config, { provider: pick.provider, seat: 'decider' }); return; }
        const agent = join(config, { provider: pick.provider, seat: asSeats[0] || 'any' }, { vision: sees, from: 'provider', said: because, because: because });
        if (agent) for (const s of asSeats.slice(1)) assignSeat(s, agent);
      } else mpStatus.textContent = 'Remembered ' + pick.model + ', but ' + pick.baseUrl + ' is not offering it right now.';
      return;
    }
    const key = keyFor(pick.baseUrl);
    const config = pick.provider === 'custom'
      ? { kind: 'openai-compatible', baseUrl: pick.baseUrl, model: pick.model }
      : Object.assign({}, MM.PRESETS[pick.provider] || { kind: pick.kind, baseUrl: pick.baseUrl }, { model: pick.model });
    // What the provider said when it last joined stands until its list says otherwise (J5).
    const remembered = typeof pick.vision === 'boolean' ? { vision: pick.vision, title: pick.title } : undefined;
    const meta = (seat) => ({ provider: pick.provider, endpoint: pick.provider === 'custom' ? pick.baseUrl : undefined, seat: seat });
    // A pick that does not rejoin says why where the hand is looking, not only in a pane that is closed at boot.
    const rejoin = () => {
      const done = (a) => { if (!a && mpStatus.textContent) say('the remembered model did not rejoin — ' + mpStatus.textContent); return a; };
      if (isDecider) return joinDecider(config, meta('decider'), remembered).then(done);
      return joinHosted(config, meta(asSeats[0] || 'any'), remembered).then((a) => { if (a) for (const s of asSeats.slice(1)) assignSeat(s, a); return done(a); });
    };
    if (key) { config.apiKey = key; rejoin(); return; }
    if (pick.provider !== 'custom') {
      pendingPicks.push({ pick: pick, seats: seats, rejoin: () => { const k2 = keyFor(pick.baseUrl); if (k2) config.apiKey = k2; return rejoin(); } });
      mpProvider.value = pick.provider; syncProviderFields(); mpModel.value = pick.model;
      const f = document.getElementById('mpFor'); if (f) f.value = isDecider ? 'decider' : (asSeats[0] || 'any');
      mpStatus.textContent = 'Remembered ' + pick.model + ' for the ' + (isDecider ? 'decider' : asSeats[0] || 'models') + ' seat — enter its key to rejoin' + (pendingPicks.length > 1 ? ' (it serves every seat that waits)' : '') + '.';
    } else {
      mpProvider.value = 'custom'; syncProviderFields(); mpEndpoint.value = pick.baseUrl; mpModel.value = pick.model;
      rejoin();
    }
  }
  /** A key was typed for a provider some seats waited for: they rejoin with it. */
  function rejoinPending(baseUrl) {
    const id = keyId(baseUrl);
    const now = pendingPicks.filter((p) => keyId(p.pick.baseUrl) === id);
    if (!now.length) return;
    pendingPicks = pendingPicks.filter((p) => !now.includes(p));
    for (const p of now) p.rejoin();
  }

  // ===== The pane's seats section ===============================================
  const seatsPane = document.createElement('div');
  seatsPane.id = 'mpSeats';
  seatsPane.className = 'mpSection mpSeats';
  panel.insertBefore(seatsPane, panel.querySelector(':scope > .mpSection'));

  // What a join is FOR: any job as before, or a seat of its own. One field in the form, so every seat has its own provider, model and key.
  const mpFor = document.createElement('select');
  mpFor.id = 'mpFor';
  mpFor.title = 'which seat this model sits in — a seat chosen narrows who is asked; “any job” is as models always were';
  mpFor.innerHTML = '<option value="any">for any job</option><option value="reader">for the reader seat</option><option value="writer">for the writer seat</option><option value="decider">for the decider seat</option>';
  mpProvider.parentNode.insertBefore(mpFor, mpProvider);
  mpFor.onchange = () => syncProviderFields();
  function forSeat() { return mpFor.value || 'any'; }

  function agentWords(a) {
    const tags = [a.config.kind === 'mcp' ? 'mcp' : MM.providerLocality(a.config), a.config.vision ? 'sees' : 'text only'];
    return modelWords(a) + ' · ' + tags.join(' · ');
  }
  function callOf(id) {
    const c = lastCall.get(id), busy = (asking.get(id) || 0) > 0;
    const line = busy ? 'asking now' + (c ? ' · last: ' + callLine(c) : '') : callLine(c);
    return line ? '<div class="seatCall mpCall ' + (busy ? 'busy' : c.ok ? 'ok' : 'bad') + '">' + esc(line) + '</div>' : '';
  }

  function renderSeats() {
    if (!seatsPane) return;
    const readerNow = resolveReaders(seatModels()), writerNow = resolveWriters(seatModels());
    const names = (r) => r.who.map(agentById).filter(Boolean).map((a) => modelWords(a)).join(', ');
    let html = '<div class="mpHead"><span>seats</span><span class="seatKeys" title="one key a provider, entered once, used by every seat on it">' +
      (heldKeys.size ? heldKeys.size + ' key' + (heldKeys.size === 1 ? '' : 's') + ' held' : 'no key held') + '</span></div>';
    for (const seat of SEATS) {
      const w = SEAT_WORDS[seat];
      let who = '', body = '', call = '', note = '';
      if (seat === 'semantic') {
        who = 'on this device — coming';
        note = fallbackWords('semantic');
      } else if (seat === 'decider') {
        if (decider) {
          who = decider.name + ' · ' + MM.providerLocality(decider.config) + ' · taken only at ' + MM.DECIDER_TAKE_AT;
          body = '<button class="ghost" data-seat-try="decider" title="one tiny question: is it there, and does it answer in the shape asked?">try it</button><button class="ghost" data-seat-leave="decider">leave</button>';
          call = callOf(agentKey(decider.pseudo));
        } else { who = 'nothing chosen'; note = fallbackWords('decider'); body = '<button class="ghost" data-seat-set="decider">choose a model</button>'; }
      } else {
        const held = holderOf(seat);
        const pool = agents.filter((a) => isModel(a) && !isSeatAgent(a) && (seat === 'writer' || a.config.vision));
        const rows = orderedPool(pool);
        body = '<select class="seatPick" data-seat-pick="' + seat + '"><option value="">' + (held ? '— nothing (let go of it)' : '— nothing chosen') + '</option>' +
          rows.map((r) => '<option value="' + esc(r.id) + '"' + (held && agentKey(held) === r.id ? ' selected' : '') + '>' + esc(r.name) + (r.local ? ' · local' : ' · hosted') + '</option>').join('') + '</select>' +
          '<button class="ghost" data-seat-set="' + seat + '" title="join a model for this seat — the key already entered is used">another…</button>' +
          (held ? '<button class="ghost" data-seat-try="' + seat + '">try it</button>' : '');
        if (held) { who = agentWords(held); call = callOf(agentKey(held)); }
        else { who = 'nothing chosen'; note = fallbackWords(seat) + (names(seat === 'reader' ? readerNow : writerNow) ? ' — now: ' + names(seat === 'reader' ? readerNow : writerNow) : ''); }
      }
      html += '<div class="seatRow" data-seat="' + seat + '"><div class="seatHead"><b>' + seat + '</b><span class="seatJob">' + esc(w.job) + '</span></div>' +
        (body ? '<div class="seatBody">' + body + '</div>' : '') +
        '<div class="seatWho t">' + esc(who) + '</div>' + call + (note ? '<div class="seatFallback note">' + esc(note) + '</div>' : '') + '</div>';
    }
    seatsPane.innerHTML = html;
    seatsPane.querySelectorAll('[data-seat-pick]').forEach((sel) => {
      sel.onchange = () => {
        const seat = sel.dataset.seatPick;
        if (!sel.value) { unseat(seat); mpStatus.textContent = 'The ' + seat + ' seat is let go — ' + fallbackWords(seat) + '.'; return; }
        const a = agentById(sel.value);
        if (!a) return;
        assignSeat(seat, a);
        renderAgents(); syncTiles();
        mpStatus.textContent = modelWords(a) + ' sits in the ' + seat + ' seat.';
      };
    });
    seatsPane.querySelectorAll('[data-seat-set]').forEach((b) => {
      b.onclick = () => { mpFor.value = b.dataset.seatSet; syncProviderFields(); mpModel.focus(); mpStatus.textContent = 'Name the model for the ' + b.dataset.seatSet + ' seat below — a key already entered is used.'; };
    });
    seatsPane.querySelectorAll('[data-seat-try]').forEach((b) => {
      b.onclick = () => { const seat = b.dataset.seatTry; if (seat === 'decider') tryDecider(); else tryModel(holderOf(seat)); };
    });
    seatsPane.querySelectorAll('[data-seat-leave]').forEach((b) => { b.onclick = () => unseat(b.dataset.seatLeave); });
  }
  /** Choices for a seat's select: local before hosted, the quickest last call first (03-seats.js). */
  function orderedPool(pool) {
    return orderChoices(pool.map((a) => { const c = lastCall.get(agentKey(a)); return { id: agentKey(a), name: modelWords(a), local: MM.providerLocality(a.config) === 'local', ms: c && c.ok ? c.ms : null }; }));
  }
  // The pane opens on the seats as they are now.
  new MutationObserver(() => { if (!panel.hasAttribute('hidden')) renderSeats(); }).observe(panel, { attributes: true, attributeFilter: ['hidden'] });
  renderSeats();

  /** The seats as the page holds them, for tests — never a key. */
  function seatsNow() {
    const who = (a) => (a ? { model: a.config.model, name: modelWords(a), local: MM.providerLocality(a.config) === 'local', sees: !!a.config.vision } : null);
    return {
      reader: who(holderOf('reader')),
      writer: who(holderOf('writer')),
      decider: decider ? { model: decider.config.model, name: decider.name, local: MM.providerLocality(decider.config) === 'local' } : null,
      any: agents.filter((a) => isModel(a) && !isSeatAgent(a) && !(seatsOfAgent.get(agentKey(a)) || new Set()).size).map(who),
      keys: [...heldKeys.keys()],
      remembered: [...rememberedKeys],
      pending: pendingPicks.map((p) => ({ model: p.pick.model, seats: p.seats.slice() })),
      readers: resolveReaders(seatModels()).who.map(agentById).filter(Boolean).map((a) => a.config.model),
      writers: resolveWriters(seatModels()).who.map(agentById).filter(Boolean).map((a) => a.config.model),
      kept: JSON.parse(JSON.stringify(seatPicks)),
    };
  }

// ===== selection =====
// Provides: tiedSentence (a connector tied to a mark, said in words — U1b); the selection as a thing on the canvas — a soft outline with
//   handles around what a loop became, and the one selected mark's own points
//   (V1-PLAN E1); hit tests (handleAt); the drag preview the input applies
//   while a hand moves, scales, rotates or reshapes, and what follows it —
//   the connectors bound to what the hand moves (V1-PLAN E2, dragFollowers);
//   a connector's own end, dragged, feeling the magnets; renderSelection.
// Uses: core (state, session), view (wpx, worldToScreen), render (union, logKey, magnetRing), snap (magnetQuery), input (drag, flash).
// A fragment of one closure: Demos/build-surface.mjs concatenates surface/*.js
// in name order inside `(function () { ... })();`. Shared state is the
// closure's; no imports, no exports, no build step beyond the concatenation.

  // The selection is the lasso that finished. The loop dissolves as ink and in
  // its place is an outline the hand can take hold of: drag inside to move,
  // a corner to scale, the knob above to turn. None of it is a mode — the
  // next stroke elsewhere dissolves it, a tap dismisses it (and is never a
  // dot), and undoing the dismissal brings it back where it was.
  let drag = null; // { ids, mode: 'move'|'scale'|'rotate'|'reshape', start, last, about, moved } — a reshape's also { id, handle, grab, to, pv, end, hold }

  // ===== Handles: the one mark's own points (V1-PLAN E1; CONTROL-POINTS-PLAN P2) =====
  // One mark selected alone, with a clean form — held, or the one it would be
  // offered — shows its handles: its own sites (core's `handlesOf`, the same
  // the magnets offer; an arc's ends and bulge), small rings on the selection.
  // Dragging one previews the reshape — the form as it will be, the ink faint
  // beneath — and, let go, writes one `reshape`: one act, one undo. A mark
  // with no clean form shows none.
  //
  // WHICH GESTURE OWNS WHICH ZONE. Every handle — the selection's four scale
  // corners and its knob, and the mark's own points — owns the ground nearer
  // to it than to any other handle, within a handle's reach; on an exact tie
  // the selection's own wins. The rest of the outline is the move zone. So a
  // box's corner, which carries both — its own corner on the ink, the scale
  // corner on the outline a little way out from it — is split by nearness:
  // pressed on the box's corner it reshapes, on the outline's corner it
  // scales. A mark too small on screen for its handles to leave room to move
  // it (HANDLES_MIN_PX) shows none until the board is zoomed in.
  const HANDLES_MIN_PX = 48;
  let handlesDrawn = []; // the last paint's handles, for tests: { kind, index, x, y, reasoning } in world units
  let handlesAt = { key: null, list: [] };

  /** The handles the selection offers now: the one selected mark's own points, when it has them and stands big enough on screen. */
  function markHandles(s) {
    s = s || state;
    if (s.selection.length !== 1 || (s.regions && s.regions.includes(s.selection[0]))) return [];
    const key = logKey() + '|' + s.selection[0] + '|' + view.zoom;
    if (s === state && handlesAt.key === key) return handlesAt.list;
    const n = s.nodes.get(s.selection[0]);
    const b = n && MM.boundsOf(n);
    const list = b && Math.max(b.maxX - b.minX, b.maxY - b.minY) * view.zoom >= HANDLES_MIN_PX ? MM.handlesOf(n, s.nodes) : [];
    if (s === state) handlesAt = { key: key, list: list };
    return list;
  }
  /** Moves the clean form whole rather than a point of it: drawn with a dot in its ring. */
  const movesWhole = (h) => h.kind === 'centre' || h.kind === 'point' || (h.kind === 'middle' && h.shape !== 'rectangle');
  function drawHandle(h, active) {
    ctx.beginPath();
    ctx.arc(h.point.x, h.point.y, wpx(active ? 5.5 : 4.5), 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${C.panelRGB},0.95)`;
    ctx.fill();
    ctx.lineWidth = wpx(1.5);
    ctx.strokeStyle = C.gold;
    ctx.stroke();
    if (movesWhole(h)) {
      ctx.beginPath();
      ctx.arc(h.point.x, h.point.y, wpx(1.6), 0, Math.PI * 2);
      ctx.fillStyle = C.gold;
      ctx.fill();
    }
  }
  /** The mark a reshape drag is showing as it will be, or null: the render draws that one's clean form. */
  function reshapeShownFor(id) {
    return drag && drag.mode === 'reshape' && drag.moved && drag.id === id && drag.pv ? drag.pv.node : null;
  }

  function selectionBounds(s) {
    const ids = (s || state).selection.filter((id) => (s || state).nodes.get(id) && MM.boundsOf((s || state).nodes.get(id)));
    if (!ids.length) return null;
    return union(ids.map((id) => MM.boundsOf((s || state).nodes.get(id))));
  }

  /** The drag's current transform, as a preview the renderer applies before the log has it. A reshape moves no mark as a whole: its preview is the form. */
  function dragPreview() {
    if (!drag || !drag.moved) return null;
    if (drag.mode === 'reshape') return { ids: [], kind: 'reshape', id: drag.id, handle: drag.handle, to: drag.to, node: drag.pv ? drag.pv.node : null, shape: drag.pv ? drag.pv.clean.shape : null, end: drag.end, hold: drag.hold };
    const dx = drag.last.x - drag.start.x, dy = drag.last.y - drag.start.y;
    // What a drag acts on is what the replay will carry: a region takes what it holds (12-regions.js).
    const acts = drag.carried || drag.ids;
    if (drag.mode === 'move') return { ids: acts, kind: 'move', dx, dy };
    if (drag.mode === 'scale') {
      const b = drag.bounds;
      const sx = Math.max(0.05, (drag.corner.x + dx - drag.about.x) / (drag.corner.x - drag.about.x || 1e-6));
      const sy = Math.max(0.05, (drag.corner.y + dy - drag.about.y) / (drag.corner.y - drag.about.y || 1e-6));
      return { ids: acts, kind: 'scale', about: drag.about, sx: b ? sx : 1, sy: b ? sy : 1 };
    }
    const a0 = Math.atan2(drag.start.y - drag.about.y, drag.start.x - drag.about.x);
    const a1 = Math.atan2(drag.last.y - drag.about.y, drag.last.x - drag.about.x);
    return { ids: acts, kind: 'rotate', about: drag.about, radians: a1 - a0 };
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

  /**
   * What is under a world point, as far as the selection is concerned: the
   * nearest handle in reach — the selection's scale corners and knob first, so
   * they win a tie, then the one mark's own points — else the move zone.
   */
  function handleAt(w) {
    const b = selectionBounds();
    if (!b) return null;
    const h = handles(b), r = HANDLE() * 1.6;
    let best = null, bestD = Infinity;
    const offer = (hit, p) => {
      const d = Math.hypot(w.x - p.x, w.y - p.y);
      if (d <= r && d < bestD) { best = hit; bestD = d; }
    };
    for (const k of Object.keys(h.corners)) offer({ kind: 'scale', corner: k, at: h.corners[k], bounds: b }, h.corners[k]);
    // A region does not turn (a turned rectangle is not a rectangle): no knob while one is selected (12-regions.js).
    const regionSelected = state.selection.some((id) => state.regions && state.regions.includes(id));
    if (!regionSelected) offer({ kind: 'rotate', bounds: b }, h.knob);
    for (const mh of markHandles()) offer({ kind: 'reshape', id: mh.nodeId, handle: { kind: mh.kind, index: mh.index }, at: mh.point, bounds: b }, mh.point);
    if (best) return best;
    // A selected region moves by its title and the band along its edge, not its inside: the inside is where the hand writes.
    if (regionsOnlySelected(state)) return regionMoveZone(w) ? { kind: 'move', bounds: b } : null;
    const o = h.outline;
    if (w.x >= o.minX && w.x <= o.maxX && w.y >= o.minY && w.y <= o.maxY) return { kind: 'move', bounds: b };
    return null;
  }

  function beginDrag(hit, w) {
    if (hit.kind === 'reshape') {
      // The handle follows the hand from where it was taken, not from where the pen landed on it.
      // A connector's own tail or tip is one of its ends (V1-PLAN E2): it feels the magnets as it goes.
      const n = state.nodes.get(hit.id);
      const end = n ? MM.endOfHandle(n, state.nodes, hit.handle.kind) : null;
      drag = { ids: [], mode: 'reshape', id: hit.id, handle: hit.handle, grab: hit.at, to: hit.at, pv: null, end: end, hold: null, start: w, last: w, moved: false, bounds: hit.bounds };
      canvas.style.cursor = 'grabbing';
      return;
    }
    const b = hit.bounds;
    const centre = { x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 };
    const opposite = hit.kind === 'scale'
      ? { x: hit.corner.includes('w') ? b.maxX : b.minX, y: hit.corner.includes('n') ? b.maxY : b.minY }
      : centre;
    const ids = state.selection.slice();
    drag = { ids: ids, carried: dragCarried(ids), mode: hit.kind, start: w, last: w, moved: false, about: opposite, corner: hit.at || null, bounds: b };
    canvas.style.cursor = hit.kind === 'move' ? 'grabbing' : hit.kind === 'scale' ? 'nwse-resize' : 'grab';
  }

  function updateDrag(w) {
    if (!drag) return;
    drag.last = w;
    if (!drag.moved && Math.hypot(w.x - drag.start.x, w.y - drag.start.y) > wpx(3)) drag.moved = true;
    if (drag.mode === 'reshape' && drag.moved) {
      // The form as it will be: the very function the reshape runs, on the board's own state.
      drag.to = { x: drag.grab.x + (w.x - drag.start.x), y: drag.grab.y + (w.y - drag.start.y) };
      const n = state.nodes.get(drag.id);
      // A connector's own end feels every other mark's sites as the pen does (V1-PLAN E2): in a
      // site's reach it lands on the site, and let go there it binds there — an offer, never a trap.
      drag.hold = n && drag.end ? magnetQuery(drag.to, drag.id) : null;
      drag.pv = n ? MM.reshapePreview(n, state.nodes, drag.handle, drag.hold ? drag.hold.site.point : drag.to) : null;
    }
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
    if (pv.kind === 'reshape') {
      // One reshape: the form where the hand let go, the ink as it was. A mark
      // not yet drawn clean is drawn clean by the same act — said, once. A
      // connector's own end let go where a magnet holds it binds there; let go
      // anywhere else, a bound end lets go of its site (V1-PLAN E2) — both in
      // the same act, and one undo takes it all back.
      const n = state.nodes.get(pv.id);
      const born = !!n && !MM.cleanOf(n);
      const hold = pv.hold;
      const n0 = session.getEvents().length;
      const bind = hold ? { nodeId: hold.site.nodeId, site: { kind: hold.site.kind, index: hold.site.index } } : null;
      if (!session.reshape({ id: pv.id, handle: pv.handle, to: hold ? hold.site.point : pv.to, at, bind: bind })) { render(state); return; }
      const wrote = session.getEvents().slice(n0).map((e) => e.type);
      if (wrote.includes('bind')) flash(tiedSentence(pv.id, hold.site, pv.handle && pv.handle.kind === 'tail' ? 'start' : 'end'));
      else if (wrote.includes('unbind')) flash('let go — that end is tied to nothing now; undo ties it again');
      else if (born) flash('drawn clean and reshaped — the ink stays beneath; undo takes both back');
      return;
    }
    const n0 = session.getEvents().length;
    if (pv.kind === 'move') session.move({ ids, dx: pv.dx, dy: pv.dy, at });
    else if (pv.kind === 'scale') session.scale({ ids, about: pv.about, sx: pv.sx, sy: pv.sy, at });
    else session.rotate({ ids, about: pv.about, radians: pv.radians, at });
    // A connector moved whole lets go of the sites it walked off, in the same act (V1-PLAN E2).
    const loose = session.getEvents().slice(n0).filter((e) => e.type === 'unbind').length;
    if (loose) flash('moved — ' + (loose === 1 ? 'an end' : loose + ' ends') + ' let go of the sites ' + (loose === 1 ? 'it was' : 'they were') + ' tied to; undo ties ' + (loose === 1 ? 'it' : 'them') + ' again');
  }

  // ===== What follows the drag (V1-PLAN E2) =====
  // While a hand moves, scales, turns or reshapes marks, the connectors bound
  // to them are drawn following — as they will stand when the hand lets go,
  // by the very functions the replay runs (core's manipulatedReps, releasedBy,
  // reshapeDecision and followPreview), so the preview is the act. Nothing
  // here is written: the follow is derived when the log has the move.
  let boundByAt = { key: null, index: null };
  /** The connectors that follow the drag in progress, each as it will stand — id to node — or null. */
  function dragFollowers() {
    const pv = dragPreview();
    if (!pv) return null;
    const s = state;
    const key = logKey();
    if (boundByAt.key !== key) boundByAt = { key: key, index: MM.boundByIndex(s.nodes) };
    if (!boundByAt.index.size) return null; // nothing on the board is bound: nothing follows
    const changed = new Map();
    if (pv.kind === 'reshape') {
      const n = s.nodes.get(pv.id);
      if (!n || !pv.node) return null;
      // The mark as the drag leaves it, the ends its own drag lets go of let go of here too.
      const d = MM.reshapeDecision(n, s.nodes, pv.handle, pv.node, pv.shape, pv.hold ? { nodeId: pv.hold.site.nodeId, site: { kind: pv.hold.site.kind, index: pv.hold.site.index } } : null);
      changed.set(pv.id, MM.lettingGo(pv.node, d.releases));
    } else {
      const m = pv.kind === 'move' ? { type: 'move', dx: pv.dx, dy: pv.dy } : pv.kind === 'scale' ? { type: 'scale', about: pv.about, sx: pv.sx, sy: pv.sy } : { type: 'rotate', about: pv.about, radians: pv.radians };
      const released = MM.releasedBy(s.nodes, pv.ids, m);
      for (const n of MM.manipulableOf(s.nodes, pv.ids)) {
        const reps = MM.manipulatedReps(n, m);
        if (!reps) continue;
        const mine = released.filter((r) => r.strokeId === n.id).map((r) => r.end);
        changed.set(n.id, MM.lettingGo(Object.assign({}, n, { reps: reps }), mine));
      }
    }
    if (!changed.size) return null;
    const out = MM.followPreview(s.nodes, changed, boundByAt.index);
    if (!out.size) return null;
    // A routed connector is drawn routed from where the drag takes what it is tied to (V1-PLAN D7): the
    // function the replay runs, over the board as the drag leaves it.
    let preview = null;
    for (const [id, n] of out) {
      if (!MM.routeRepOf(n)) continue;
      if (!preview) {
        preview = new Map(s.nodes);
        for (const [cid, cn] of changed) preview.set(cid, cn);
        for (const [fid, fn] of out) preview.set(fid, fn);
      }
      const near = (box) => s.contentIds.filter((cid) => { const cb = MM.boundsOf(preview.get(cid)); return !!cb && cb.minX <= box.maxX && box.minX <= cb.maxX && cb.minY <= box.maxY && box.minY <= cb.maxY; });
      out.set(id, Object.assign({}, n, { reps: n.reps.filter((r) => r.modality !== 'route').concat([{ modality: 'route', data: MM.deriveRoute(n, preview, near), source: 'engine' }]) }));
    }
    return out;
  }

  function renderSelection(s) {
    const pv = dragPreview();
    // While a handle is dragged the outline follows the form as it will be.
    const reshaping = !!pv && pv.kind === 'reshape' && !!pv.node;
    const b0 = reshaping ? MM.boundsOf(pv.node) : selectionBounds(s);
    handlesDrawn = [];
    if (!b0) return;
    ctx.save();
    if (pv && pv.kind !== 'reshape') applyPreview(pv);
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
    if (!(s.regions && s.selection.some((id) => s.regions.includes(id)))) {
      ctx.beginPath(); ctx.moveTo(h.knob.x, o.minY); ctx.lineTo(h.knob.x, h.knob.y); ctx.strokeStyle = `rgba(${C.goldRGB},0.6)`; ctx.lineWidth = wpx(1); ctx.stroke();
      ctx.beginPath(); ctx.arc(h.knob.x, h.knob.y, hs * 0.7, 0, Math.PI * 2); ctx.fill();
    }
    // The one mark's own points, where they are — or will be, while one is dragged.
    const own = reshaping ? MM.handlesOf(pv.node, s.nodes) : markHandles(s);
    for (const mh of own) {
      drawHandle(mh, reshaping && pv.handle.kind === mh.kind && pv.handle.index === mh.index);
      handlesDrawn.push({ kind: mh.kind, index: mh.index, x: mh.point.x, y: mh.point.y, reasoning: mh.reasoning });
    }
    // A connector's own end in a site's reach: the ring the pen's magnet draws, where it will bind.
    if (reshaping && pv.hold) magnetRing(pv.hold, ctx);
    ctx.restore();
  }

  /**
   * A connector tied to a mark, in words (PLAN-USER-SURFACE U1b): "the line is tied to the
   * circle", "the arrow's tip is tied to the box" — never a site's coordinates or an id.
   */
  function tiedSentence(connectorId, site, end) {
    const words = { rectangle: 'box', ink: 'mark', text: 'writing' };
    const s = session.getState();
    const c = connectorId && s.nodes.get(connectorId);
    const shape = c && MM.topInterpretation(c);
    const what = shape === 'arrow' || shape === 'arc' || shape === 'line' ? shape : 'line';
    const to = words[site.shape] || site.shape || 'mark';
    const which = end === 'end' && what === 'arrow' ? 'the arrow\'s tip' : end === 'start' && what === 'arrow' ? 'the arrow\'s tail' : 'the ' + what;
    return which + ' is tied to the ' + to + ' — undo lets it go';
  }

// ===== snap =====
// Provides: snapping: offers, auto sweep, the snap tiles (scoped to a loop while one waits).
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

  // What is offered is the log's (R4c): the offers and what a waiting loop
  // holds of them are read again when the log changes or the mode does, not
  // on every paint — a pan or a hover used to ask every mark on the board.
  // The reference paint (paintCheck) asks them afresh, as every paint did.
  let offersKey = null;
  function refreshOffers() {
    const key = logKey() + '|' + snapMode;
    if (paintReference || key !== offersKey) {
      const s = session.getState();
      snapOffers = snapMode === 'off' ? new Map() : new Map(session.snapCandidates().map((c) => [c.id, c]));
      heldCandidates = heldEnclosed(s).filter((id) => snapOffers.has(id));
      offersKey = paintReference ? null : key;
      warmMagnets();
    }
    // A held loop scopes the tile: what you circled, not everything.
    if (ccOpen()) syncTiles();
  }
  /** "3 rectangles, 2 lines" — core's words (the clean tool says them in the field too). */
  function shapesSummary(cands) { return MM.shapesSummary(cands); }
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

  // The loop that waits is plain ink: the command mark is the one thing that
  // turns it into a selection. What the loop scopes is the snap tile, quietly.
  snapBtn.onclick = () => {
    const ids = heldCandidates.length ? heldCandidates : [...snapOffers.keys()];
    snapAll(ids, shapesSummary(ids.map((id) => snapOffers.get(id))));
  };
  snapModeBtn.onclick = () => setSnapMode(SNAP_MODES[(SNAP_MODES.indexOf(snapMode) + 1) % SNAP_MODES.length]);

  // ===== Magnets: the pen feels where a mark offers attachment ===============
  // (CONTROL-POINTS-PLAN P1.) Sites are derived in core (session/magnets.ts)
  // from each mark's clean form; the surface asks what is near the live
  // stroke's end and shows the hold. Nothing pulls the stroke mid-draw — the
  // hold is an offer; releasing inside it lands the endpoint exactly on the
  // site and logs the bind, and leaving the reach dissolves it (invariant 4).
  let magnetHold = null;   // the hit the live stroke's end is in reach of, if any
  let magnetStart = null;  // the hit the live stroke began on, if any
  /**
   * Every site on the board, for one log (R4c): read when the pen first asks
   * after the log changed, then each move is a pass over a flat list of
   * points. A node keeps the sites it had when its own reps and edges are the
   * ones they were (a mark's sites are read off its own clean form, reading
   * and ink) — unless a notation offers ports, whose readings can look past
   * the mark, and then every mark is read again. The cache used to be keyed
   * by the node object, which a move or a snap changes in place.
   */
  let magnetSitesAt = { key: null, sites: [], xs: new Float64Array(0), ys: new Float64Array(0), byNode: new Map() };
  function sitesNow() {
    const key = logKey();
    if (magnetSitesAt.key === key) return magnetSitesAt;
    const s = session.getState();
    const own = !MM.registeredPorts().length;
    const before = magnetSitesAt.byNode, byNode = new Map(), sites = [];
    for (const [id, n] of s.nodes) {
      if (!MM.strokePointsOf(n)) continue;
      const was = own && before.get(id);
      const kept = was && was.node === n && was.reps === n.reps && was.nReps === n.reps.length && was.edges === n.edges && was.nEdges === n.edges.length;
      const mine = kept ? was.sites : MM.magnetSites(n, s.nodes);
      byNode.set(id, { node: n, reps: n.reps, nReps: n.reps.length, edges: n.edges, nEdges: n.edges.length, sites: mine });
      for (const site of mine) sites.push(site);
    }
    const xs = new Float64Array(sites.length), ys = new Float64Array(sites.length);
    sites.forEach((site, i) => { xs[i] = site.point.x; ys[i] = site.point.y; });
    magnetSitesAt = { key: key, sites: sites, xs: xs, ys: ys, byNode: byNode };
    return magnetSitesAt;
  }
  // …and read ahead: when the log has changed, the sites are read again while
  // the page is idle, so the pen that comes down next finds them ready — the
  // first reading of a big board's sites is tens of milliseconds, and a hand
  // would feel it at pen-down.
  let magnetsWarming = false;
  function warmMagnets() {
    if (magnetsWarming || magnetSitesAt.key === logKey()) return;
    magnetsWarming = true;
    const go = () => { magnetsWarming = false; if (!live) sitesNow(); };
    if (window.requestIdleCallback) requestIdleCallback(go, { timeout: 2000 }); else setTimeout(go, 200);
  }
  /**
   * The nearest site to a world point within the hand's radius, or null —
   * on any mark but `except`, when one is given: a connector's own end,
   * dragged by its handle, feels every other mark's sites as the pen does
   * (V1-PLAN E2), never its own.
   */
  function magnetQuery(w, except) {
    const at = sitesNow();
    const radius = MM.MAGNET_SCREEN_PX / view.zoom; // about the hand, not the world (invariant 3)
    let best = -1, bestD = 0;
    for (let i = 0; i < at.sites.length; i++) {
      if (except && at.sites[i].nodeId === except) continue;
      const distance = Math.hypot(at.xs[i] - w.x, at.ys[i] - w.y);
      if (distance <= radius && (best < 0 || distance < bestD)) { best = i; bestD = distance; }
    }
    return best < 0 ? null : { site: at.sites[best], distance: bestD };
  }

// ===== handwriting =====
// Provides: handwriting: inkImage, isWriting, isRead, readOne, readLine (a line of writing as one image), readWriting; the auto-read preference (off by default);
//   (V1-PLAN J5) whyNoReader — which joined models cannot read writing, and why — and keepRead, a read kept for a model that can see.
//   (PLAN-IPAD-NOTES I8) reading my notes: readLines (every line of the marks given, drawn from its own strokes on one numbered
//   sheet, asked in batches of a sheet's lines, progress on the marks, Esc stops), readPictureFrom (a picture's text, beside it),
//   boardWriting (the board's lines, for *Read the board*), linesPanel (what each line said, for the panel), readScopeHooks
//   (where a region's marks join a read), readStats (what each call cost).
// Uses: core (prefs), models (agents, withWork, workSignal, factsOf, keepAsk, noteOutcome, modelWords), render (logKey), input (say, flash), seat (isSeatAgent: the seat reads while seated),
//   seats (03-seats.js: resolveReaders — who reads, by seat; seatModels, agentById in 04-seatpane.js), images (assetGet), text (TEXT_DIR, TEXT_W, TEXT_H, textCount).
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
  /**
   * Who READS: the reader seat when the hand chose one (I7) — a model that sees, quick and exact, asked for
   * reading alone — else, as before, Claude Code while it is seated (V1-PLAN J4: sitting down there is a
   * deliberate act that says *ask me*), else the writer if it sees, else the smallest model that sees, not
   * every one. Reading a word is a small job, and a 27B model takes minutes at it while a 0.8B answers in
   * seconds. The order is 03-seats.js's `resolveReaders`, tested in Node.
   */
  function readers() {
    return resolveReaders(seatModels()).who.map((key) => agents.find((a) => agentKey(a) === key)).filter(Boolean);
  }
  /** The models that read now — for the panel's *read it* and the like: who can answer a read, by seat. */
  const seeing = () => readers();
  // Reading as you write is a preference, off by default: a model is asked
  // when you say *read* (§6.3). On, every mark that reads as writing is handed
  // to the models that can see as it lands.
  let autoRead = prefs.get('autoRead', false) === true;
  function setAutoRead(on) {
    autoRead = !!on;
    prefs.set('autoRead', autoRead);
    if (autoRead) readWriting(session.getState());
    syncTiles();
  }
  const askedToRead = new Set(); // node ids handed out already (per model join, see below)
  // A mark read as part of a line whose words did not split cleanly: the line's
  // text is held on the first mark, and this one was read with it. Runtime only.
  const readWith = new Map();
  const isRead = (node) => !!MM.transcriptOf(node) || readWith.has(node.id);

  /** The ink of a mark, as runs of points: a word is several strokes, a cursive word is one. */
  function runsOf(node) {
    return MM.isWord(node)
      ? MM.lettersOf(node).map((id) => state.nodes.get(id)).filter(Boolean).map((n) => MM.strokePointsOf(n)).filter((p) => p && p.length > 1)
      : [MM.strokePointsOf(node)].filter((p) => p && p.length > 1);
  }
  function inkImage(node, size) { return inkImageOf(runsOf(node), size); }
  function inkImageOf(runs, size) {
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

  /** Writing: the shape rung's own reading of the mark is `text` — core's one test (`MM.isWritingMark`), the tools' too. */
  function isWriting(node) { return MM.isWritingMark(node, state.nodes); }

  function readOne(node, force) {
    const who = readers();
    if (!who.length) return false;
    const key = node.id;
    if (!force && askedToRead.has(key)) return false;
    askedToRead.add(key);
    const image = inkImage(node);
    if (!image) return false;
    who.forEach((agent) => {
      withWork('write:' + agentKey(agent) + ':' + node.id, [node.id], modelWords(agent) + ' · reading the writing', agent.read({ nodeId: node.id, image: image, at: Date.now() })).then((res) => {
        // The row keeps what the read came to; the status line says it once (J5).
        noteOutcome(agent, res.ok, res.ok ? 'read “' + res.transcripts[0].text + '”' : res.error);
        say(res.ok
          ? modelWords(agent) + ' read “' + res.transcripts[0].text + '”' + (res.transcripts.length > 1 ? ' (or ' + res.transcripts.slice(1).map((t) => '“' + t.text + '”').join(', ') + ')' : '')
          : modelWords(agent) + ' could not read it — ' + res.error);
        if (!res.ok && res.raw) window.__mm.lastRaw = res.raw;
        render(session.getState());
        refreshPalette();
      });
    });
    return true;
  }

  /**
   * A line of writing, read as one image (SURFACE-v10-PLAN D3): words gathered
   * by nearness are handed over together, so the reader has the phrase. When
   * the reply has one word per mark, each lands on its own mark; otherwise
   * the whole line is held on the first mark and the rest were read with it.
   */
  function readLine(ids, force) {
    const who = readers();
    if (!who.length) return false;
    const s = session.getState();
    const nodes = ids.map((id) => s.nodes.get(id)).filter(Boolean);
    if (nodes.length < 2) return nodes.length === 1 ? readOne(nodes[0], force) : false;
    const key = 'line:' + ids.join(',');
    if (!force && askedToRead.has(key)) return false;
    askedToRead.add(key);
    const image = inkImageOf(nodes.flatMap(runsOf));
    if (!image) return false;
    const first = nodes[0];
    who.forEach((agent) => {
      withWork('write:' + agentKey(agent) + ':' + first.id, ids, modelWords(agent) + ' · reading the line', agent.read({ nodeId: first.id, about: nodes.map((n) => n.id), image: image, at: Date.now(), hold: false })).then((res) => {
        noteOutcome(agent, res.ok, res.ok ? 'read “' + res.transcripts[0].text + '”' : res.error);
        if (res.ok) {
          const top = res.transcripts[0];
          const words = top.text.trim().split(/\s+/);
          const at = Date.now();
          if (words.length === nodes.length) {
            nodes.forEach((n, i) => session.propose({ participantId: agent.id, nodeId: n.id, edges: [], reps: [{ modality: 'transcript', data: { text: words[i], line: top.text }, confidence: top.confidence }], at: at }));
          } else {
            session.propose({ participantId: agent.id, nodeId: first.id, edges: [], reps: res.transcripts.map((t) => ({ modality: 'transcript', data: { text: t.text }, confidence: t.confidence })), at: at });
            nodes.slice(1).forEach((n) => readWith.set(n.id, first.id));
          }
          say(modelWords(agent) + ' read “' + top.text + '”' + (res.transcripts.length > 1 ? ' (or ' + res.transcripts.slice(1).map((t) => '“' + t.text + '”').join(', ') + ')' : ''));
        } else {
          say(modelWords(agent) + ' could not read it — ' + res.error);
          if (res.raw) window.__mm.lastRaw = res.raw;
        }
        render(session.getState());
        refreshPalette();
      });
    });
    return true;
  }

  function readWriting(s) {
    if (!readers().length) return;
    const ids = s.contentIds.filter((id) => !s.artifacts.includes(id));
    for (const aid of s.artifacts) for (const e of s.nodes.get(aid).edges) if (e.rel === 'has-part') ids.push(e.to);
    for (const id of ids) {
      const node = s.nodes.get(id);
      if (!node || s.pendingLassoId === id || MM.transcriptOf(node) || !(MM.strokePointsOf(node) || MM.isWord(node))) continue;
      if (isWriting(node)) readOne(node, false);
    }
  }

  // ===== Writing with no model that can see (V1-PLAN J5) =====================
  // *Read the writing* used to open the models pane and nothing else, which
  // looked exactly like "it won't send": the model joined could not see, and
  // nothing said so. Now it says which joined models cannot, and why — what
  // each one's provider said it takes, or that its id was all there was — and
  // the read is kept: the moment a model that can see joins, it runs.
  /** Why no joined model reads writing: each one, and what its provider said it takes (or why that is a guess). `what`: the act that asked. */
  function whyNoReader(what) {
    const models = agents.filter((a) => a.config && (a.config.kind === 'openai-compatible' || a.config.kind === 'anthropic'));
    const others = agents.filter((a) => !models.includes(a));
    what = what || 'Read the writing';
    if (!agents.length) return what + ' needs a model that can see — none is joined';
    const said = models.map((a) => { const f = factsOf.get(agentKey(a)); return modelWords(a) + ' reads text only' + (f && f.because ? ' (' + f.because + ')' : ''); })
      .concat(others.map((a) => modelWords(a) + ' is not asked to read writing'));
    return what + ' needs a model that can see — ' + said.join('; ');
  }
  /** Keep a read of these marks for a model that can see (a line as one image, the rest one by one); said once, run when one joins. */
  function keepRead(d) {
    const line = (d.line || []).slice(), single = (d.single || []).slice();
    return keepAsk({
      what: 'Read the writing', needs: 'sees', need: 'needs a model that can see', ids: line.concat(single),
      sentence: whyNoReader() + ' — kept: it runs when one that sees joins',
      run: (live) => {
        const s = session.getState();
        const l = line.filter((id) => live.includes(id));
        if (l.length) readLine(l, true);
        single.filter((id) => live.includes(id)).forEach((id) => readOne(s.nodes.get(id), true));
      },
    });
  }


  // ===== Reading my notes (PLAN-IPAD-NOTES I8) =================================
  // *Read these* / *Read the board*: every LINE of handwriting among the marks held (or on the board) is drawn
  // cleanly from its own strokes — core's `sheetOf` says where every point goes, this draws it — onto ONE sheet
  // of numbered rows at one line height, and the sheet goes to the reader seat in a batch: a call asks at most a
  // sheet's lines (`MM.LINES_PER_CALL`), the calls one after another (a local server answers one at a time, and
  // Esc stops the rest), each with its dots on its own marks and its label in the status line. One deliberate
  // act is one batch; nothing on draw. Lines already read are skipped unless asked again. What each call
  // cost — the lines, the payload, the time a line — is kept for the reader's row (`noteOutcome`) and for
  // `window.__mm.lastReads()`; what each line came to is kept for the panel (`linesSaid`).
  const readStats = [];                 // runtime: { kind, lines, ok, bytes, ms, perLine, w, h, said: [{ n, ok, error }] }
  const linesSaid = new Map();          // mark id → { n, of, ok, error, at } — the first mark of a line it was said of
  /** Where a region's marks join a read (I5 puts one here): each `(ids) => ids` may widen what is held to what the region holds. */
  const readScopeHooks = [];
  const readMark = (id) => { const n = session.getState().nodes.get(id); return !!n && isRead(n); };
  /** What a read of these marks reads: the marks, and what any region held among them stands for. */
  function readScopeOf(ids) {
    let out = ids.slice();
    for (const hook of readScopeHooks) { try { out = hook(out) || out; } catch (err) { /* a region's hook never stops a read */ } }
    return [...new Set(out)];
  }
  const dataBytes = (url) => Math.round((url.length - url.indexOf(',') - 1) * 3 / 4);
  const kb = (n) => (n < 1024 * 10 ? (n / 1024).toFixed(1) : String(Math.round(n / 1024))) + ' KB';

  /** The sheet, drawn exactly as core said: white ground, a rule between rows, the numerals, the ink at one width. */
  function sheetImage(sheet) {
    const off = document.createElement('canvas');
    off.width = sheet.width; off.height = sheet.height;
    const c = off.getContext('2d');
    c.fillStyle = '#fff'; c.fillRect(0, 0, off.width, off.height);
    c.strokeStyle = '#d6d6d6'; c.lineWidth = 1;
    for (const r of sheet.rows.slice(1)) { c.beginPath(); c.moveTo(0, r.y + 0.5); c.lineTo(sheet.width, r.y + 0.5); c.stroke(); }
    c.fillStyle = '#555'; c.font = '600 26px sans-serif'; c.textBaseline = 'middle';
    for (const r of sheet.rows) c.fillText(r.n + '.', r.label.x, r.label.y);
    c.strokeStyle = '#111'; c.lineWidth = sheet.lineWidth; c.lineCap = 'round'; c.lineJoin = 'round';
    for (const r of sheet.rows) for (const run of r.strokes) {
      c.beginPath();
      run.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)));
      c.stroke();
    }
    return off.toDataURL('image/png');
  }

  /** The lines of these marks that a read would ask for: all of them when asked again, else the ones nobody has read. */
  function linesToRead(ids, force) {
    const lines = MM.writingLinesIn(session.getState(), readScopeOf(ids));
    return { lines: lines, todo: force ? lines : lines.filter((l) => !MM.lineIsRead(l, readMark)) };
  }

  /** The board's writing: its lines and how many are unread — kept while the log stands, for *Read the board* to be offered only where there is some. */
  let boardWritingAt = { key: null, val: null };
  function boardWritingIds() { const s = session.getState(); return s.contentIds.filter((id) => !s.artifacts.includes(id)); }
  function boardWriting() {
    const key = logKey() + '|' + readWith.size;
    if (boardWritingAt.key === key && boardWritingAt.val) return boardWritingAt.val;
    const lines = MM.writingLinesIn(session.getState(), boardWritingIds());
    const val = { lines: lines.length, unread: lines.filter((l) => !MM.lineIsRead(l, readMark)).length };
    boardWritingAt = { key: key, val: val };
    return val;
  }

  /**
   * Read the lines of these marks, as one batch. `force` reads the lines already read again. With no model that
   * sees, the ask is kept (J5) and runs when one joins. Returns whether something was asked.
   */
  function readLines(ids, opts) {
    opts = opts || {};
    const asked = readScopeOf(ids || []);
    const { lines, todo } = linesToRead(asked, !!opts.force);
    if (!lines.length) { say('no handwriting there to read'); return false; }
    if (!todo.length) { say('every line there is read already — Read these again asks the reader again'); return false; }
    const who = readers();
    if (!who.length) {
      keepAsk({
        what: 'Read these', needs: 'sees', need: 'needs a model that can see', ids: asked,
        sentence: whyNoReader('Read these') + ' — kept: it runs when one that sees joins',
        run: (live) => readLines(live, opts),
      });
      return false;
    }
    const agent = who[0];
    if (typeof agent.readLines !== 'function') { say(modelWords(agent) + ' cannot read a batch of lines'); return false; }
    readBatches(agent, todo);
    return true;
  }

  /** The batches, one call after another; each its own sheet, its own dots and label, its own outcome. Esc ends them. */
  async function readBatches(agent, todo) {
    const batches = MM.batchesOf(todo);
    const total = todo.length;
    const generation = session.getState().generation;
    let asked = 0, read = 0, stopped = false;
    const failures = [];
    let cost = null;
    for (const batch of batches) {
      if (session.getState().generation !== generation) { say('the board changed under the read — stopped'); return; }
      const first = asked + 1, last = asked + batch.length;
      const sheet = MM.sheetOf(batch);
      const image = sheetImage(sheet);
      const bytes = dataBytes(image);
      const key = 'read:' + agentKey(agent) + ':' + batch[0].ids[0];
      const label = modelWords(agent) + ' · reading ' + (batch.length === total ? total + ' line' + (total === 1 ? '' : 's') : 'lines ' + first + '–' + last + ' of ' + total);
      const t0 = performance.now();
      const res = await withWork(key, batch.flatMap((l) => l.ids), label,
        agent.readLines({ lines: batch.map((l) => ({ nodeId: l.ids[0], ids: l.ids })), image: image, at: Date.now(), signal: workSignal(key) }));
      const ms = Math.max(1, Math.round(performance.now() - t0));
      const said = batch.map((l, i) => {
        const r = (res.lines && res.lines[i]) || { ok: false, error: res.error || 'no answer' };
        if (r.ok) {
          read++;
          if (r.how === 'first') l.ids.slice(1).forEach((id) => readWith.set(id, l.ids[0]));
        } else failures.push({ n: first + i, error: r.error });
        linesSaid.set(l.ids[0], { n: first + i, of: total, ok: !!r.ok, error: r.ok ? null : r.error, at: Date.now() });
        return { n: first + i, ok: !!r.ok, error: r.ok ? null : r.error };
      });
      const okCount = said.filter((x) => x.ok).length;
      const perLine = +(ms / batch.length).toFixed(1);
      readStats.push({ kind: 'lines', lines: batch.length, ok: okCount, bytes: bytes, ms: ms, perLine: perLine, w: sheet.width, h: sheet.height, said: said });
      cost = { lines: okCount, bytes: bytes, perLine: perLine };
      noteOutcome(agent, !!res.ok, res.ok ? 'read ' + okCount + ' line' + (okCount === 1 ? '' : 's') + ' · ' + kb(bytes) + ' · ' + (perLine / 1000).toFixed(1) + ' s a line' : res.error);
      if (!res.ok && res.raw) window.__mm.lastRaw = res.raw;
      asked = last;
      render(session.getState());
      refreshPalette();
      if (res.error === 'cancelled' || (res.lines && res.lines.every((l) => l.error === 'cancelled'))) { stopped = true; break; }
      if (asked < total) say('read ' + read + ' of ' + total + ' lines — ' + (total - asked) + ' to go · Esc stops it');
    }
    const who = modelWords(agent);
    const why = failures.slice(0, 3).map((f) => 'line ' + f.n + ': ' + f.error).join('; ') + (failures.length > 3 ? '; …' : '');
    if (stopped) say('stopped — ' + who + ' read ' + read + ' of ' + total + ' lines');
    else if (read === total) say(who + ' read ' + (total === 1 ? '1 line' : total + ' lines') + (cost && batches.length === 1 ? ' — ' + kb(cost.bytes) + ', ' + (cost.perLine / 1000).toFixed(1) + ' s a line' : ''));
    else if (!read) say(who + ' could not read ' + (total === 1 ? 'the line' : total + ' lines') + ' — ' + why);
    else say(who + ' read ' + read + ' of ' + total + ' lines — ' + why);
  }

  /** What each line of these marks said, for the panel: "1 “hello world” · by GLM", "2 not read — no reading came back for line 2". */
  function linesPanel(ids) {
    const s = session.getState();
    const lines = MM.writingLinesIn(s, ids);
    if (lines.length < 2) return '';
    const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
    let html = '<div class="sep"></div><div class="eyebrow">handwriting · ' + lines.length + ' lines</div><div class="reads">';
    lines.forEach((l, i) => {
      const top = l.ids.map((id) => s.nodes.get(id)).filter(Boolean).map((n) => MM.transcriptsOf(n)[0]).filter(Boolean);
      const first = s.nodes.get(l.ids[0]);
      const held = first && MM.transcriptsOf(first)[0];
      const text = top.length === l.ids.length ? top.map((t) => t.text).join(' ') : held ? held.text : '';
      const said = linesSaid.get(l.ids[0]);
      if (text) html += '<div class="read' + (i === 0 ? ' top' : '') + '"><span class="type">' + (i + 1) + ' “' + esc(text) + '”</span><span class="w">' + (held ? held.confidence.toFixed(2) : '') + '</span></div><div class="why">by ' + esc(nameOfParticipant((held || top[0]).source)) + '</div>';
      else html += '<div class="read"><span class="type">' + (i + 1) + ' not read yet</span></div>' + (said && said.error ? '<div class="why">' + esc(said.error) + '</div>' : '');
    });
    return html + '</div>';
  }

  // ===== A picture, read (PLAN-IPAD-NOTES I8) ================================
  // *Read the picture*: the picture's pixels come from the asset store, are downscaled to what a reader takes (a
  // long side of `READ_PICTURE_PX`, JPEG), and go to the reader seat with the question *what does this page say*.
  // The text lands as a text artifact BESIDE the picture — never over it — made by the reader (an import in its
  // name, so it is held as the reader's), editable like any text, named for the picture it came from. Claude Code
  // at the desk cannot read a picture yet: a picture's pixels are not in the room (the log carries none), so the
  // seat is left out of who reads one, and the pane's reader or a joined model that sees is asked.
  const READ_PICTURE_PX = 1568;
  function pictureReaders() { return resolveReaders(seatModels().filter((m) => !m.claude)).who.map((k) => agents.find((a) => agentKey(a) === k)).filter(Boolean); }

  async function readPictureFrom(artifactId, asset, name) {
    const s0 = session.getState();
    const node = s0.nodes.get(artifactId);
    const box = node && MM.boundsOf(node);
    if (!box) { say('that picture is no longer there'); return false; }
    const who = pictureReaders();
    if (!who.length) {
      const seated = readers().some(isSeatAgent);
      keepAsk({
        what: 'Read the picture', needs: 'sees', need: 'needs a model that can see', ids: [artifactId],
        sentence: (seated ? 'Read the picture needs a model that can see the picture — Claude Code at the desk cannot yet (its pixels are not in the room), choose a model' : whyNoReader('Read the picture')) + ' — kept: it runs when one that sees joins',
        run: () => { readPictureFrom(artifactId, asset, name); },
      });
      return false;
    }
    const agent = who[0];
    let image, w = 0, h = 0;
    try {
      const rec = await assetGet(asset);
      if (!rec) { say('the pixels of that picture are not on this device, so it cannot be read'); return false; }
      const bmp = await createImageBitmap(new Blob([rec.bytes], { type: rec.mime || 'image/jpeg' }));
      try {
        const k = Math.min(1, READ_PICTURE_PX / Math.max(bmp.width, bmp.height));
        w = Math.max(1, Math.round(bmp.width * k)); h = Math.max(1, Math.round(bmp.height * k));
        const off = document.createElement('canvas');
        off.width = w; off.height = h;
        const c = off.getContext('2d');
        c.fillStyle = '#fff'; c.fillRect(0, 0, w, h);
        c.drawImage(bmp, 0, 0, w, h);
        image = off.toDataURL('image/jpeg', 0.85);
      } finally { bmp.close(); }
    } catch (err) { say('could not read that picture: ' + ((err && err.message) || err)); return false; }
    const generation = session.getState().generation;
    const key = 'read-picture:' + agentKey(agent) + ':' + artifactId;
    const t0 = performance.now();
    const res = await withWork(key, [artifactId], modelWords(agent) + ' · reading the picture',
      agent.readPicture({ nodeId: artifactId, image: image, at: Date.now(), signal: workSignal(key) }));
    const ms = Math.max(1, Math.round(performance.now() - t0));
    const bytes = dataBytes(image);
    const n = res.ok ? res.lines.length : 0;
    readStats.push({ kind: 'picture', lines: n, ok: n, bytes: bytes, ms: ms, perLine: n ? +(ms / n).toFixed(1) : ms, w: w, h: h, said: [] });
    noteOutcome(agent, !!res.ok, res.ok ? 'read the picture · ' + n + ' line' + (n === 1 ? '' : 's') + ' · ' + kb(bytes) + ' · ' + (ms / 1000).toFixed(1) + ' s' : res.error);
    if (!res.ok) {
      if (res.raw) window.__mm.lastRaw = res.raw;
      if (res.error !== 'cancelled') say(modelWords(agent) + ' could not read the picture — ' + res.error);
      return false;
    }
    const s1 = session.getState();
    const picture = s1.nodes.get(artifactId);
    if (s1.generation !== generation || !picture) { say('the picture left the board before its text arrived — nothing was written'); return false; }
    // Beside it, never over it: right of the picture, as wide as a text is, as tall as its lines.
    const pb = MM.boundsOf(picture) || box;
    const gap = Math.max(24, (pb.maxX - pb.minX) * 0.04);
    const tw = Math.max(TEXT_W, Math.min(pb.maxX - pb.minX, 720)), th = Math.max(TEXT_H, Math.min(res.lines.length * 26 + 24, Math.max(TEXT_H, pb.maxY - pb.minY)));
    textCount++;
    const label = name || (MM.pictureOf(picture) || {}).name || 'the picture';
    const made = session.withTool('read', () => session.import({
      kind: 'text', path: TEXT_DIR + '/' + textCount + '.txt', name: label + ', read',
      bounds: { minX: pb.maxX + gap, minY: pb.minY, maxX: pb.maxX + gap + tw, maxY: pb.minY + th },
      code: res.text, participantId: agent.id, at: Date.now(),
    }), 'read-picture');
    flash(modelWords(agent) + ' read ' + n + ' line' + (n === 1 ? '' : 's') + ' of “' + label + '” — the text stands beside it, a text of its own you can edit');
    render(session.getState());
    refreshPalette();
    return made;
  }

// ===== hand (the rules) =====
// Provides: the hand's rules for pen, finger and palm, pure (V1-PLAN R6) — handOfPointer (which
//   hand a pointer is, by its pointerType), fingerRole (what a finger that lands on the board
//   does), palmNow (whether a touch now is a palm), whenPenLands (what the fingers already down
//   become when a pen comes down, and which pan is put back), handFace and nextHand (the hand
//   tile's face and its cycle), releaseIs (whether a release is a tap or a stroke), and the
//   numbers they stand on (PALM_MS, PAN_SLOP_PX, TAP_SLOP_PX).
// Uses: NOTHING. Like 09-field.js, this fragment names no closure variable, touches no DOM and
//   asks the session nothing; 07-input.js is the adapter that gathers a record, asks, and acts.
//   So it loads on its own in Node, which is how it is tested:
//     node --test Demos/surface/07-hand.test.mjs
// A fragment of one closure: Demos/build-surface.mjs concatenates surface/*.js
// in name order inside `(function () { ... })();`. Shared state is the
// closure's; no imports, no exports, no build step beyond the concatenation.
//
// THE RULES (CLAUDE.md, "Pen, finger and palm")
//   - Decide by pointerType, never by the user agent: iPadOS reports a pencil as `pen` and a
//     finger as `touch`; a desktop test synthesises both, and a mouse is anything else — a
//     `mouse`, or the empty type a synthesised event carries — and is never touched by these.
//   - Before any pen has been seen on this device, today's rule stands: one finger draws, two
//     pinch and pan.
//   - Once a pen has been seen (said once, and held as a preference the hand tile shows), the
//     pen draws and a finger pans; two fingers pinch. The tile can give the finger its ink back.
//   - A palm: a touch that lands while a pen is on the glass, or within PALM_MS of the pen's
//     last event anywhere on the page — down, moving, hovering, lifted — does nothing for its
//     whole life, whichever the preference. And a pen coming down makes every finger already
//     down a palm; one that landed within PALM_MS before it was the palm arriving first, so the
//     pan it made is put back.
//   - A tap never leaves a dot (PLAN-USER-SURFACE W3). While something is dismissable — the
//     field, a selection, a loop that waits — a press whose pointer stays within TAP_SLOP_PX of
//     where it landed, ON SCREEN, is the dismissal, however many moves it reported: a click
//     wobbles, and a count of points called three px of jitter ink. The mouse, the pen and a
//     finger that draws alike. With nothing to dismiss, a dot deliberately drawn is a dot.
//     The trap, on purpose: the dot on an i drawn while the field is open dismisses the field
//     first — the dead state's rule; the next dot draws.

  /** A touch within this long of the pen's last event is a palm. Long enough for a heel that comes down as the pencil lifts between words; short enough that a finger meant to pan, once the pencil is put down, is a finger. */
  const PALM_MS = 500;
  /** A finger that pans must first move this far, in screen pixels; short of it, it is a tap. */
  const PAN_SLOP_PX = 6;
  /** While something is dismissable, a press that travels no further than this on screen is a tap. A click's wobble: the audit measured 3 px, and 6 is still a hand that meant to click. */
  const TAP_SLOP_PX = 8;

  /**
   * What a release on the board is.
   * @param {{points:number, travelPx:number, dismissable:boolean}} h
   *   points — the points the press recorded; travelPx — the farthest the pointer went from
   *   where it landed, in screen pixels; dismissable — a field, a selection or a waiting loop stands.
   * @returns {'tap'|'stroke'}
   */
  function releaseIs(h) {
    if (h.points < 3) return 'tap'; // too short to be a mark, whatever is open
    if (h.dismissable && h.travelPx <= TAP_SLOP_PX) return 'tap';
    return 'stroke';
  }

  /** Which hand a pointer is: 'pen', 'finger', or 'mouse' — the last is anything that is not the first two. */
  function handOfPointer(pointerType) {
    return pointerType === 'pen' ? 'pen' : pointerType === 'touch' ? 'finger' : 'mouse';
  }

  /**
   * Is a touch now a palm?
   * @param {{penDown:boolean, sincePen:number}} h  a pen on the glass; ms since the pen's last event (Infinity if never)
   */
  function palmNow(h) {
    return !!h.penDown || h.sincePen < PALM_MS;
  }

  /**
   * What a finger that lands on the board does.
   * @param {{draws:('pen'|'finger'|null), penDown:boolean, sincePen:number, fingers:number}} h
   *   draws — the preference: null until a pen has been seen on this device;
   *   penDown, sincePen — as palmNow;
   *   fingers — the fingers already down that are drawing, panning or pinching (not palms, not resting).
   * @returns {{role:('palm'|'extra'|'pinch'|'pan'|'draw'), why:string}}
   *   palm — nothing, for its whole life; extra — a third finger, nothing; pinch — with the
   *   finger already down, the view zooms and pans; pan — one finger moves the view (short of
   *   PAN_SLOP_PX it is a tap); draw — today's rule, the ink path.
   */
  function fingerRole(h) {
    if (h.penDown) return { role: 'palm', why: 'a pen is on the glass' };
    if (h.sincePen < PALM_MS) return { role: 'palm', why: 'the pen was here ' + Math.max(0, Math.round(h.sincePen)) + ' ms ago' };
    if (h.fingers >= 2) return { role: 'extra', why: 'two fingers are already down' };
    if (h.fingers === 1) return { role: 'pinch', why: 'a second finger: the two pinch and pan' };
    if (h.draws === 'pen') return { role: 'pan', why: 'the pen draws; a finger moves the view' };
    return { role: 'draw', why: h.draws === 'finger' ? 'a finger draws, by the hand tile' : 'no pen seen here yet: a finger draws' };
  }

  /**
   * A pen comes down: every finger down is a palm from now on, and the one that landed a moment
   * before the pen — the heel arriving first — has what it moved put back.
   * @param {Array<{id:*, role:string, at:number, moved:boolean}>} fingers  the fingers down, in the order they landed
   * @param {number} now  when the pen came down, on the same clock as `at`
   * @returns {{palms:Array<*>, putBack:(*|null)}}  the ids that become palms, and whose view to restore (the earliest such finger's), or null
   */
  function whenPenLands(fingers, now) {
    const palms = [];
    let putBack = null, at = Infinity;
    for (const f of fingers) {
      if (f.role === 'palm') continue;
      palms.push(f.id);
      if (now - f.at < PALM_MS && f.moved && (f.role === 'pan' || f.role === 'pinch') && f.at < at) { putBack = f.id; at = f.at; }
    }
    return { palms: palms, putBack: putBack };
  }

  /** The hand tile's face: the side the field opens on, and — once a pen has been seen — what draws. */
  function handFace(side, draws) {
    return draws ? side + ' · ' + draws : side;
  }

  /**
   * The hand tile's next state. Until a pen has been seen it flips the side, as it always did.
   * After, one word of the face changes a tap — right · pen, right · finger, left · finger,
   * left · pen — so the pen and the finger are one tap apart from where most hands start.
   */
  function nextHand(side, draws) {
    if (!draws) return { side: side === 'left' ? 'right' : 'left', draws: null };
    const ring = [['right', 'pen'], ['right', 'finger'], ['left', 'finger'], ['left', 'pen']];
    const i = ring.findIndex((r) => r[0] === side && r[1] === draws);
    const next = ring[(i + 1) % ring.length];
    return { side: next[0], draws: next[1] };
  }

// ===== input =====
// Provides: pointer input (draw, pan, pinch) for the mouse, the pen and the finger — the palm ignored,
//   the pen's pressure on every point it draws, its hover a hover (V1-PLAN R6) — keys (undo, copy,
//   paste, erase, zoom), say()/flash() for the status line.
// Uses: core (draws, setDraws), hand (the rules: fingerRole, palmNow, whenPenLands, releaseIs, PAN_SLOP_PX), view,
//   snap (autoSweep, magnetQuery), render (drawLive), palette (copyMarks, pasteClip), handwriting
//   (autoRead), artifacts (pointerFrameAt), kinds (postPointer).
// A fragment of one closure: Demos/build-surface.mjs concatenates surface/*.js
// in name order inside `(function () Ellipsis)();`. Shared state is the
// closure's; no imports, no exports, no build step beyond the concatenation.

  // ===== Input: strokes in, nothing gated, no modes ========================
  // Pointer events belong to the ink layer. You are ALWAYS drawing; panning is
  // the deliberate act (space, middle button, or alt), never the default. That
  // is what makes "doodle on top of the running page" work at all.
  let panning = null;
  let spaceHeld = false;
  // A hand inside a playing program: the frame has it until the hand lifts (SURFACE-v10-PLAN D2).
  let forward = null;
  // Whose hand the board is following (V1-PLAN R6): the pointer whose press began what is under
  // way — a stroke, a drag, a knob, a demonstration, a frame's pointer, a pan. Another pointer's
  // moves and release are not its own: a palm on the glass while the pen drew used to put its
  // points into the pen's stroke, and its release ended the stroke. A mouse is one pointer, so
  // nothing a mouse does is changed by this.
  let owner = null;   // { id, type } from the press that began it; null while nothing is under way
  let downType = '';
  let liveFrom = null; // where the press that began `live` landed on screen, and the farthest it has gone: a tap is judged by it (W3)  // the pointerType of the last press on the board — the field asks it whether to take the focus

  // Pointer capture is a nicety — it keeps a stroke alive when the pointer
  // leaves the element. It is NOT allowed to be the reason a stroke fails to
  // start, so its failure is swallowed rather than thrown into the draw loop.
  function capture(el, e) {
    try { el.setPointerCapture(e.pointerId); } catch (err) { /* not capturable */ }
  }

  // ===== Pen, finger and palm (V1-PLAN R6; the rules are 07-hand.js) =======
  // By pointerType, never by the user agent: iPadOS reports a pencil as `pen` and a
  // finger as `touch`, and a desktop test synthesises both. Before a pen has been seen
  // on this device a finger draws, as it always did; after, the pen draws and a finger
  // pans, and a touch while the pen is down or a moment after it is a palm — nothing.
  const touches = new Map(); // pointerId → a finger: { id, x, y, x0, y0, at, role, moved, view }
  let pinch = null;          // { ids, dist, mid, zoom }: the two fingers pinching, as they were when the second landed
  const pen = { down: new Set(), at: -Infinity }; // the pens on the glass, and when a pen was last heard anywhere on the page
  let penHover = null;       // the magnet a hovering pen is in reach of — where a stroke begun there would start (drawLive draws it)
  const handClock = () => performance.now();

  /** A point of the hand's, in world coordinates, with a pen's pressure on it: the log keeps it; the engine reads x and y only. */
  function pointOf(e) {
    const w = screenToWorld(e.clientX, e.clientY);
    if (e.pointerType === 'pen') w.p = Math.round(Math.max(0, Math.min(1, e.pressure || 0)) * 1000) / 1000;
    return w;
  }
  // ----- Pencil fidelity (PLAN-IPAD-NOTES I3) -----
  // A pencil reports at 240 Hz and the browser folds the samples between two frames into one move;
  // `getCoalescedEvents()` has them all. Every sample is a point, in order, and every point of a stroke
  // — the mouse's, a finger's, the pen's — says when, as whole milliseconds since the press that began
  // the stroke (core's `Point.t`: kept in the log as the hand gave it, rounded as `p` is; no reading uses
  // it, so a log with it reads as the same log without). The hold, the tap and the magnets are unchanged.
  let strokeT0 = 0;   // the press's own timeStamp, which every `t` of the stroke under way counts from
  /** A sample of the hand's — a move, or one of the moves folded into it — as a point with its time. */
  function samplePoint(s) {
    const w = pointOf(s);
    w.t = Math.max(0, Math.round((s.timeStamp || 0) - strokeT0));
    return w;
  }
  /**
   * The samples a move carries, oldest first. A browser lists the event itself last; one that leaves it
   * out gets it added, and a move that is no more than the one before it is no new sample (`pushSample`).
   */
  function samplesOf(e) {
    let list = null;
    try { list = typeof e.getCoalescedEvents === 'function' ? e.getCoalescedEvents() : null; } catch (err) { list = null; }
    if (!list || !list.length) return [e];
    const last = list[list.length - 1];
    return last.clientX === e.clientX && last.clientY === e.clientY ? list : list.concat([e]);
  }
  /** One sample onto the stroke under way: never before the one it follows in time, never the same sample twice. */
  function pushSample(points, s) {
    const w = samplePoint(s);
    const last = points[points.length - 1];
    if (last) {
      if (last.t !== undefined && w.t < last.t) w.t = last.t;
      if (last.x === w.x && last.y === w.y && last.t === w.t && last.p === w.p) return;
    }
    points.push(w);
  }
  /** Is a touch landing now a palm? */
  function palmHere() { return palmNow({ penDown: pen.down.size > 0, sincePen: handClock() - pen.at }); }
  /** The fingers down that draw, pan or pinch — not the palms, and not one left resting after a pinch. */
  function activeFingers() {
    let n = 0;
    for (const t of touches.values()) if (t.role === 'draw' || t.role === 'pan' || t.role === 'pinch') n++;
    return n;
  }

  // The pen, wherever it is on the page, heard before anything it lands on: the palm on the
  // board is known for one while the pen writes in the field or taps a pill.
  function heardPen(e) {
    if (e.pointerType !== 'pen') return;
    pen.at = handClock();
    if (draws) return;
    // The switch, said once: the first pen this device has seen. It is held as a preference
    // the hand tile shows, and the tile gives a finger its ink back.
    setDraws('pen');
    say('a pen — it draws now; a finger pans and pinches, and a palm on the glass is ignored · the hand tile switches it');
  }
  addEventListener('pointerdown', (e) => { if (e.pointerType !== 'pen') return; pen.down.add(e.pointerId); heardPen(e); penLands(e); }, true);
  addEventListener('pointermove', heardPen, true);
  const penLifts = (e) => { if (e.pointerType !== 'pen') return; pen.down.delete(e.pointerId); heardPen(e); };
  addEventListener('pointerup', penLifts, true);
  addEventListener('pointercancel', penLifts, true);
  // A page hidden with a hand on the glass may never hear it lift: a pen left "down", or a
  // palm left in the map, would make every touch after it a palm. What only watches — the
  // pens, the palms, a pan, a pinch — is forgotten; a finger's stroke is left as a mouse's is.
  const forgetHands = () => {
    pen.down.clear();
    pinch = null;
    for (const [id, t] of touches) if (t.role !== 'draw') touches.delete(id);
  };
  addEventListener('blur', forgetHands);
  document.addEventListener('visibilitychange', () => { if (document.hidden) forgetHands(); });

  /**
   * A pen comes down: every finger down is a palm from now on. A finger's stroke is dropped,
   * a pinch stops, and a pan that a heel began a moment before the pen is put back.
   */
  function penLands(e) {
    if (!touches.size) return;
    const r = whenPenLands([...touches.values()], handClock());
    if (!r.palms.length) return;
    if (owner && r.palms.includes(owner.id)) letGo(e);
    for (const id of r.palms) { const t = touches.get(id); if (t) t.role = 'palm'; }
    pinch = null;
    const back = r.putBack === null ? null : touches.get(r.putBack);
    if (back && (view.zoom !== back.view.zoom || view.panX !== back.view.panX || view.panY !== back.view.panY)) {
      view.zoom = back.view.zoom; view.panX = back.view.panX; view.panY = back.view.panY;
      viewChanged();
    }
  }

  /**
   * What a finger had under way ends where it stands: its stroke is dropped — it was a palm,
   * or the first finger of a pinch landing, not a mark — and a drag, a knob, a demonstration
   * or a program's pointer is let go as it is.
   */
  function letGo(e) {
    live = null; held = false; pressEnd(); magnetStart = null; magnetHold = null;
    if (drag) endDrag();
    knobEnd(); demoEnd();
    if (forward) { postPointer(forward, 'cancel', e, screenToWorld(e.clientX, e.clientY)); forward = null; }
    if (panning) { panning = null; canvas.style.cursor = 'crosshair'; }
    owner = null;
    drawLive();
  }

  /** A finger lands. True when that is all it does now — a palm, a third finger, a pinch, a pan; false when it draws, down the path below, as a finger always did. */
  function fingerDown(e) {
    const r = fingerRole({ draws: draws, penDown: pen.down.size > 0, sincePen: handClock() - pen.at, fingers: activeFingers() });
    const t = { id: e.pointerId, x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY, at: handClock(), role: r.role, moved: false, view: { zoom: view.zoom, panX: view.panX, panY: view.panY } };
    const first = r.role === 'pinch' ? [...touches.values()].find((o) => o.role === 'draw' || o.role === 'pan') : null;
    touches.set(e.pointerId, t);
    if (r.role === 'draw') return false;
    if (r.role === 'pinch' && first) {
      // Two fingers: a pinch, not a stroke. The first finger's ink goes — it was the first
      // finger landing, not a mark — and whatever it held is let go where it stands.
      if (owner && owner.id === first.id) letGo(e);
      first.role = 'pinch';
      pinch = { ids: [first.id, t.id], dist: Math.hypot(first.x - t.x, first.y - t.y), mid: { x: (first.x + t.x) / 2, y: (first.y + t.y) / 2 }, zoom: view.zoom };
    }
    return true;
  }

  /** A finger moves. True when the move was the finger's own — a pinch, a pan, a palm's nothing; false when it draws. */
  function fingerMove(e) {
    const t = touches.get(e.pointerId);
    const px = t.x, py = t.y;
    t.x = e.clientX; t.y = e.clientY;
    if (t.role === 'draw') return false;
    if (t.role === 'pinch') {
      const a = pinch && pinch.ids.includes(t.id) ? touches.get(pinch.ids[0]) : null;
      const b = a ? touches.get(pinch.ids[1]) : null;
      if (a && b) {
        const dist = Math.hypot(a.x - b.x, a.y - b.y);
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        const target = clampZoom(pinch.zoom * (dist / Math.max(1, pinch.dist)));
        zoomBy(pinch.mid.x, pinch.mid.y, target / view.zoom);
        view.panX += mid.x - pinch.mid.x;
        view.panY += mid.y - pinch.mid.y;
        pinch.mid = mid;
        a.moved = true; b.moved = true;
        viewChanged();
      }
      return true;
    }
    if (t.role === 'pan') {
      let fx = px, fy = py;
      if (!t.moved) {
        // Short of the slop it is still a tap; past it, the board follows the finger from where it landed.
        if (Math.hypot(t.x - t.x0, t.y - t.y0) <= PAN_SLOP_PX) return true;
        t.moved = true; fx = t.x0; fy = t.y0;
      }
      view.panX += t.x - fx;
      view.panY += t.y - fy;
      viewChanged(); // one paint a frame, however many moves the frame holds
      return true;
    }
    return true; // a palm, a third finger, a finger resting after a pinch: nothing
  }

  /** A finger lifts. True when that is all it does — a pan's end, a pinch's, a palm's; a pan that never moved is a tap. False when it drew. */
  function fingerUp(e, cancelled) {
    const t = touches.get(e.pointerId);
    if (!t) return false;
    touches.delete(e.pointerId);
    if (pinch && pinch.ids.includes(t.id)) {
      pinch = null;
      for (const o of touches.values()) if (o.role === 'pinch') o.role = 'rest'; // the finger still down rests until it lifts
      return true;
    }
    if (t.role === 'draw') return false;
    if (t.role === 'pan' && !t.moved && !cancelled) { lastPen = { x: e.clientX, y: e.clientY }; tapAt(e); }
    return true;
  }

  /** A hovering pen feels the magnets: the site in reach is drawn on the pen's layer — where a stroke begun here would start. */
  function penHoverAt(w) {
    const hit = magnetQuery(w);
    const a = hit && hit.site, b = penHover && penHover.site;
    const same = a && b ? a.nodeId === b.nodeId && a.kind === b.kind && a.index === b.index : !a && !b;
    penHover = hit;
    if (!same) drawLive();
  }
  function penHoverOff() { if (penHover) { penHover = null; drawLive(); } }

  // A moving pencil is ink, never Scribble's handwriting-to-text or a scroll: its touchmove's
  // default is refused. Only a stylus's, and only while it moves — a finger, a tap and a
  // double-tap keep theirs. (iPadOS; a desktop engine sends no touches for a mouse.)
  canvas.addEventListener('touchmove', (e) => {
    for (const t of e.changedTouches || []) if (t.touchType === 'stylus') { e.preventDefault(); return; }
  }, { passive: false });

  canvas.addEventListener('pointerdown', (e) => {
    capture(canvas, e);
    downType = e.pointerType || '';
    // A finger: a palm, a pinch or a pan is all it does; one that draws goes down the path below.
    if (e.pointerType === 'touch' && fingerDown(e)) return;
    owner = { id: e.pointerId, type: e.pointerType || '' };
    if (e.pointerType === 'pen') penHoverOff(); // the stroke's own magnet takes over from the hover's
    if (e.button === 1 || e.altKey || spaceHeld) {
      panning = { x: e.clientX, y: e.clientY };
      canvas.style.cursor = 'grabbing';
      return;
    }
    // A hand landing on the selection takes hold of it rather than drawing.
    const w0 = pointOf(e);
    // A hand on a control's knob slides it: no selection needed, one move when it lets go.
    if (knobBegin(w0)) return;
    // A press on a region's title takes hold of the region (12-regions.js).
    const hit = (state.selection.length ? handleAt(w0) : null) || regionTitlePress(w0);
    // A hand on a body in a running tank is acting it out, not moving ink.
    if (hit && hit.kind === 'move' && demoBegin(state.selection, w0)) return;
    if (hit) { beginDrag(hit, w0); return; }
    // A hand landing inside a playing program is the program's: every move and
    // the release go to it, and nothing is drawn. A stroke begun anywhere else
    // is ink, and stays ink across any frame it crosses — doodling on the 3D
    // thing is a stroke begun beside it.
    // A loop that waits is the hand's wherever it lies: the tap that takes it
    // up, or the mark across it, lands inside the loop, not in the frame.
    const pf = pointerFrameAt(w0);
    if (pf && !insideWaitingLoop(w0)) { forward = pf; postPointer(pf, 'down', e, w0); return; }
    pressBegin(e, w0);
    strokeT0 = e.timeStamp || 0;
    w0.t = 0;
    live = [w0];
    liveFrom = { x: e.clientX, y: e.clientY, far: 0 };
    // The stroke may begin ON a magnet — an arrow drawn out of a box's corner.
    magnetStart = magnetQuery(w0);
    magnetHold = magnetStart;
  });

  // ===== Hold by long-press (SURFACE-v10-PLAN D5) ============================
  // Press a mark and hold still: it is held, with what it hangs together
  // with, and the field opens — no loop drawn, which is what a newcomer tries
  // first. A tap stays a tap and a stroke stays a stroke; only stillness, on
  // a mark, with nothing held, is a hold.
  const HOLD_MS = 450, HOLD_SLOP = 6;
  let press = null; // { id, x, y, timer } while a hand rests on a mark
  let held = false; // the release after a hold is not a tap
  function pressBegin(e, w) {
    const id = nodeAt(w.x, w.y);
    if (!id || state.summon || state.selection.length || activeFingers() > 1) return;
    press = { id: id, x: e.clientX, y: e.clientY, timer: setTimeout(() => { const p = press; press = null; if (!p || !live) return; live = null; held = true; holdAround(p.id, { x: p.x, y: p.y }); }, HOLD_MS) };
  }
  function pressMove(e) { if (press && Math.hypot(e.clientX - press.x, e.clientY - press.y) > HOLD_SLOP) pressEnd(); }
  function pressEnd() { if (press) { clearTimeout(press.timer); press = null; } }
  /**
   * The marks a held mark hangs together with: the cluster `MM.clusters` finds
   * for it over the relations of every loose mark — read over the marks joined
   * to it through reach alone (R4c). Every link a cluster follows (near,
   * touching, crossing, contains) is an engaging relation, and those hold only
   * between marks within reach of each other (R4b), so the marks the index
   * walks to from the held one are its cluster; `MM.clusters` over them, in
   * the board's order, orders them as the whole plane would. It used to relate
   * every loose mark to every other: 183 ms on 2,000 marks, for one press.
   */
  function heldGroupOf(s, id) {
    // A mark as the relations read it — where it stands: a reshaped form where the hand set it (E1).
    const markOf = (cid) => {
      const n = s.nodes.get(cid);
      const b = n && MM.boundsOf(n);
      if (!b) return null;
      return { id: cid, bounds: b, points: MM.standingPointsOf(n) || undefined, closed: !!MM.standsClosed(n) };
    };
    const ix = boardIndex();
    const arts = new Set(s.artifacts);
    const loose = (x) => ix.contentAt.has(x) && !arts.has(x);
    let pool;
    if (ix.stray.some(loose)) pool = s.contentIds.filter(loose); // a box with no finite edge may meet anything: the whole plane, as before
    else {
      const seen = new Set([id]), queue = [id];
      while (queue.length) {
        const x = queue.pop();
        const b = ix.reach.boundsOf(x);
        if (!b) continue;
        const r = MM.reachAround(b);
        for (const y of ix.reach.query({ minX: b.minX - r, minY: b.minY - r, maxX: b.maxX + r, maxY: b.maxY + r })) {
          if (!seen.has(y) && loose(y) && MM.withinReach(b, ix.reach.boundsOf(y))) { seen.add(y); queue.push(y); }
        }
      }
      pool = s.contentIds.filter((cid) => seen.has(cid) && loose(cid));
    }
    const marks = pool.map(markOf).filter(Boolean);
    return MM.clusters(marks, MM.relate(marks)).find((g) => g.includes(id)) || [id];
  }
  /** Every loose mark's held group against the clusters of the whole plane, as holding it used to find them. For tests. */
  function heldCheck() {
    const s = session.getState();
    const marks = s.contentIds.filter((cid) => !s.artifacts.includes(cid)).map((cid) => {
      const n = s.nodes.get(cid);
      const b = n && MM.boundsOf(n);
      if (!b) return null;
      return { id: cid, bounds: b, points: MM.standingPointsOf(n) || undefined, closed: !!MM.standsClosed(n) };
    }).filter(Boolean);
    const whole = MM.clusters(marks, MM.relate(marks));
    const differ = [];
    for (const m of marks) {
      const mine = heldGroupOf(s, m.id), theirs = whole.find((g) => g.includes(m.id)) || [m.id];
      if (JSON.stringify(mine) !== JSON.stringify(theirs)) differ.push({ id: m.id, mine: mine, whole: theirs });
    }
    return { ok: !differ.length, marks: marks.length, differing: differ.length, differ: differ.slice(0, 3) };
  }
  /** Hold a mark with everything it hangs together with: the cluster over the relations the canvas sees. The field opens by the press (U1c). */
  function holdAround(id, at) {
    const s = session.getState();
    if (at) lastPen = { x: at.x, y: at.y };
    const group = heldGroupOf(s, id);
    lastTap = null;
    session.summonMarks(group, Date.now());
    render(session.getState());
    if (group.length > 1) flash('held with ' + (group.length - 1) + ' it hangs together with');
  }

  /** Is a world point inside the loop that waits to be taken up? */
  function insideWaitingLoop(w) {
    if (!state.pendingLassoId) return false;
    const loop = state.nodes.get(state.pendingLassoId);
    const b = loop && MM.boundsOf(loop);
    return !!b && w.x >= b.minX && w.x <= b.maxX && w.y >= b.minY && w.y <= b.maxY;
  }

  canvas.addEventListener('pointermove', (e) => {
    // A finger's pinch, pan or palm is its own; one that draws goes on below.
    if (e.pointerType === 'touch' && touches.has(e.pointerId) && fingerMove(e)) return;
    // Another pointer's move is not the one under way's: a palm, a mouse nudged while the pen draws.
    if (owner && e.pointerId !== owner.id) return;
    if (forward) { postPointer(forward, 'move', e, screenToWorld(e.clientX, e.clientY)); return; }
    pressMove(e);
    if (knobMove(screenToWorld(e.clientX, e.clientY))) return;
    if (demoMove(screenToWorld(e.clientX, e.clientY))) return;
    if (drag) { updateDrag(screenToWorld(e.clientX, e.clientY)); return; }
    if (panning) {
      view.panX += e.clientX - panning.x;
      view.panY += e.clientY - panning.y;
      panning = { x: e.clientX, y: e.clientY };
      viewChanged(); // one paint a frame, however many moves the frame holds
      return;
    }
    if (!live) {
      const w = screenToWorld(e.clientX, e.clientY);
      // Over a playing frame the cursor says the frame is live to the hand; over one of the
      // selected mark's own points, that it can be taken hold of (E1).
      if (!spaceHeld) {
        const onHandle = state.selection.length === 1 ? handleAt(w) : null;
        canvas.style.cursor = onHandle && onHandle.kind === 'reshape' ? 'grab' : pointerFrameAt(w) && !insideWaitingLoop(w) ? 'default' : 'crosshair';
      }
      const over = nodeAt(w.x, w.y);
      if (over !== hoverId) { hoverId = over; render(state); }
      // A pencil near the glass, touching nothing, is a hover: the reading of the mark under it,
      // as a mouse's gives — and it feels the magnets, the site in reach being where a stroke
      // begun here would start. A mouse's hover draws no ghost, as it never did.
      if (e.pointerType === 'pen') penHoverAt(w); else penHoverOff();
      return;
    }
    for (const smp of samplesOf(e)) pushSample(live, smp);
    if (liveFrom) liveFrom.far = Math.max(liveFrom.far, Math.hypot(e.clientX - liveFrom.x, e.clientY - liveFrom.y));
    magnetHold = magnetQuery(live[live.length - 1]); // the offer follows the pen; out of reach, it lets go
    drawLive(); // the pen and its magnet, on their own layer; the board is as it was (R4c)
  });

  canvas.addEventListener('pointercancel', (e) => {
    // A finger's cancel ends what it was doing and taps nothing; one that drew goes on below.
    if (e.pointerType === 'touch' && touches.has(e.pointerId) && fingerUp(e, true)) return;
    // Another pointer's cancel is not the one under way's.
    if (owner && e.pointerId !== owner.id) return;
    owner = null;
    // A hold the system cancelled is over too: left standing, it would eat the next stroke's release.
    held = false;
    live = null; pressEnd(); magnetStart = null; magnetHold = null; drawLive();
    if (forward) { postPointer(forward, 'cancel', e, screenToWorld(e.clientX, e.clientY)); forward = null; }
  });

  canvas.addEventListener('pointerup', (e) => {
    // A finger's pinch, pan (or tap) and palm end here; one that drew goes on below.
    if (e.pointerType === 'touch' && touches.has(e.pointerId) && fingerUp(e, false)) return;
    // Another pointer's release is not the one under way's: a palm lifting while the pen draws.
    if (owner && e.pointerId !== owner.id) return;
    // A release the board began nothing for — a press on the chrome let go over the board, a
    // pinch's last finger — ends nothing here. It used to commit a stroke with no points,
    // which threw after the event was already in the log (V1-PLAN R6, e2e P2b and P3).
    if (!owner) return;
    owner = null;
    if (panning) { panning = null; canvas.style.cursor = 'crosshair'; return; }
    if (forward) { postPointer(forward, 'up', e, screenToWorld(e.clientX, e.clientY)); forward = null; return; }
    pressEnd();
    if (held) { held = false; live = null; magnetStart = null; magnetHold = null; return; } // the release after a hold: the field is open, nothing else happens
    if (knobEnd()) return;
    if (demoEnd()) return;
    if (drag) { endDrag(); return; }
    lastPen = { x: e.clientX, y: e.clientY };
    const points = live;
    live = null;
    if (!points) return;
    // The dead state: a tap while something is dismissable is the dismissal,
    // and never a dot — judged by how far the pointer went on screen, not by
    // how many moves it reported (W3; the rule is 07-hand.js's releaseIs).
    // Only a tap on empty ground with nothing to dismiss could be a dot — and
    // a bare tap is not one either; a dot is drawn.
    const travel = liveFrom ? Math.max(liveFrom.far, Math.hypot(e.clientX - liveFrom.x, e.clientY - liveFrom.y)) : 0;
    liveFrom = null;
    const s0 = session.getState();
    const dismissable = !!(s0.summon || s0.selection.length || s0.pendingLassoId);
    if (releaseIs({ points: points.length, travelPx: travel, dismissable: dismissable }) === 'tap') { magnetStart = null; magnetHold = null; tapAt(e); return; }
    lastTap = null;

    // A stroke released inside a hold lands its endpoint exactly on the site;
    // one begun on a magnet starts exactly there. Only the endpoints move,
    // and only by the hand's own radius — the shape of the stroke is the hand's.
    // Two guards, both in the medium's own terms:
    //   - BINDING IS FOR CONNECTORS. Lines, arrows and arcs have ends that
    //     attach; a closed shape or a letter has nothing to tie. Snap only
    //     what reads as a connector.
    //   - GESTURES ARE NOT MARKS. A command mark's shape is its meaning — a
    //     check pulled seven pixels onto a box's edge-middle is no longer a
    //     check (found by e2e 12b). A stroke that matches the held mark is
    //     left exactly as drawn.
    if (points && points.length >= 3 && (magnetStart || magnetHold)) {
      const analysis = MM.analyzeStroke(points, 1 / view.zoom);
      const connector = analysis.results.some((r) => (r.type === 'line' || r.type === 'arrow' || r.type === 'arc') && r.confidence >= 0.5);
      // The ACTIVE mark: the taught one when the device holds one, else the
      // built-in check — a check multi-parses as arrow 0.52, so the connector
      // test alone is not enough (found by e2e 12b, second pass).
      const activeMark = state.commandMark || MM.BUILTIN_COMMAND_MARK;
      const isMark = !!(activeMark && MM.matchesCommandMark(analysis.fingerprint, activeMark).match);
      // …and a letter-sized stroke is writing, not a connector: an l beside a
      // box reads line 0.9, and pulling its foot onto the box's edge unwrites
      // the word (found by e2e 16 and 33).
      const letterLike = MM.isLetterLike(MM.getBounds(points), 1 / view.zoom);
      if (connector && !isMark && !letterLike) {
        // Only the place moves: a pen's pressure stays on the point it was pressed at.
        if (magnetStart) points[0] = Object.assign({}, points[0], { x: magnetStart.site.point.x, y: magnetStart.site.point.y });
        if (magnetHold) points[points.length - 1] = Object.assign({}, points[points.length - 1], { x: magnetHold.site.point.x, y: magnetHold.site.point.y });
      } else {
        magnetStart = null;
        magnetHold = null;
      }
    }

    // Clear hover *before* the engine notifies: the render it triggers must
    // report the mark just made, not whatever the cursor was resting on.
    hoverId = null;
    // Points are world coordinates; the scale says how big the hand's pixel was
    // when they were drawn. Position belongs in world space, the hand does not —
    // without this, the same check reads as a closed loop at 1.7x zoom.
    const id = session.addStroke(points, Date.now(), undefined, 1 / view.zoom);
    // The clean-form ghost shows on the mark just drawn for a moment, then goes; a repaint takes it away.
    lastDrawAt = Date.now();
    clearTimeout(ghostTimer);
    ghostTimer = setTimeout(() => render(session.getState()), GHOST_MS + 50);

    // Say what happened when a stroke rubbed something out — a silent erase is
    // indistinguishable from a bug. Read it from the stroke's own gesture rep,
    // NOT from a drop in the content count: a lasso resolved by a command mark
    // also leaves the content plane, and reporting that as "erased" would be a
    // lie about the one operation the user most needs to trust.
    const after = session.getState();
    const made = after.nodes.get(id);
    const g = made && MM.getRep(made, 'gesture');
    // Content, not a gesture: what the stroke touched, it is now tied to. The
    // bind is an edge in the log — it replays, merges, and one undo lets it go.
    if (!g && (magnetStart || magnetHold)) {
      const at = Date.now();
      if (magnetStart) session.bind({ strokeId: id, nodeId: magnetStart.site.nodeId, site: { kind: magnetStart.site.kind, index: magnetStart.site.index }, end: 'start', at: at });
      if (magnetHold) {
        session.bind({ strokeId: id, nodeId: magnetHold.site.nodeId, site: { kind: magnetHold.site.kind, index: magnetHold.site.index }, end: 'end', at: at });
        flash(tiedSentence(id, magnetHold.site, 'end'));
      }
    }
    magnetStart = null;
    magnetHold = null;
    // Auto: take every open offer the moment it is made — this stroke, and any
    // earlier closed stroke that was a loop-in-waiting until this one settled
    // it. Never the held loop itself; that is a gesture until the next mark
    // says otherwise.
    if (!g) autoSweep();
    // Reading handwriting as it is written is a preference, off by default.
    if (autoRead && !g) readWriting(after);
    if (g && g.data && g.data.role === 'scratch') {
      const n = (g.data.erased || []).length;
      flash('erased ' + n + ' mark' + (n === 1 ? '' : 's'));
    } else if (after.markMiss && after.markMiss.nearMiss) {
      // Only when the stroke was recognisably an ATTEMPT. A gesture that fails
      // silently cannot be learned — the user cannot tell whether they drew it
      // wrong, waited too long, or made it too big. Saying nothing about marks
      // that were plainly just drawing keeps this from becoming nagging.
      flash('no summon — ' + after.markMiss.detail);
    } else if (!g && made) {
      // A scratch over a word of a text made from writing strikes the word (v10 F12).
      const struck = strikeOnText(after, id, points);
      if (struck) { flash('struck “' + struck + '” — write the word beside the gap and fold it in'); return; }
      // A scratch one pass short: the stroke turned back on itself and crossed
      // one mark's outline twice, where three erases. Said, so the rule can
      // be learned by doing rather than by reading.
      const near = scratchNearMiss(after, made, points);
      if (near) flash('crossed it twice — one more pass erases it');
    }
  });

  let lastTap = null; // the last tap on empty ground, for the double-tap
  const DOUBLE_TAP_MS = 400;

  /**
   * A tap: the dead state. A tap while something is dismissable is the dismissal, and never
   * a dot — the pen's or the mouse's stroke too short to be one, or a finger's that never
   * moved while the pen is what draws.
   */
  function tapAt(e) {
    const s0 = session.getState();
    const now = Date.now();
    // A double-tap inside a waiting loop takes it up — the way in that
    // needs no mark at all, for a hand that finds the check hard to draw
    // apart from an arrow. The first tap is nothing; the second, close in
    // time and place, is the summon.
    // A tap on the chip beside a matching group opens the field on it, with the match leading.
    {
      const chip = chipAt(screenToWorld(e.clientX, e.clientY));
      if (chip && !s0.summon) { lastTap = null; session.summonMarks(chip.ids, now); render(session.getState()); return; }
    }
    if (s0.pendingLassoId && !s0.summon) {
      const w = screenToWorld(e.clientX, e.clientY);
      const loop = s0.nodes.get(s0.pendingLassoId);
      const b = loop && MM.boundsOf(loop);
      const inside = b && w.x >= b.minX && w.x <= b.maxX && w.y >= b.minY && w.y <= b.maxY;
      const again = lastTap && now - lastTap.t < DOUBLE_TAP_MS && Math.hypot(e.clientX - lastTap.x, e.clientY - lastTap.y) < 24;
      lastTap = { x: e.clientX, y: e.clientY, t: now };
      if (inside && again) { lastTap = null; session.summonHeld(now); render(session.getState()); return; }
      if (inside) { render(session.getState()); return; }
    }
    lastTap = { x: e.clientX, y: e.clientY, t: now };
    // One tap on the ground lets go of everything — the field and the
    // selection — so the next stroke draws rather than moves (v10 F9).
    if (s0.summon) session.dismiss(s0.summon.id, now);
    if (s0.selection.length) session.deselect(now);
    render(session.getState());
  }

  /** The mark a stroke crossed exactly twice while turning back on itself, if any. */
  function scratchNearMiss(s, node, points) {
    const fp = MM.fingerprintOf(node);
    if (!fp || fp.isClosed || fp.corners < 2 || !points || points.length < 6) return null;
    const sb = MM.getBounds(points);
    for (const id of s.contentIds) {
      if (id === node.id || s.artifacts.includes(id)) continue;
      const t = s.nodes.get(id);
      // Where it stands, as the scratch reads it: a reshaped form where the hand set it (E1).
      const pts = t && MM.standingPointsOf(t);
      if (!pts) continue;
      // A stroke crosses only an outline whose box its own box meets: the rest are passed over unread (R4c).
      const tb = MM.getBounds(pts);
      if (tb.maxX < sb.minX || tb.minX > sb.maxX || tb.maxY < sb.minY || tb.minY > sb.maxY) continue;
      const outline = MM.outlineOf({ points: pts, closed: !!MM.standsClosed(t) });
      if (outline && MM.countCrossings(points, outline, 3) === 2) return id;
    }
    return null;
  }

  // A pencil lifted out of reach of the glass leaves, and its magnet with it.
  canvas.addEventListener('pointerleave', (e) => { if (e.pointerType === 'pen') penHoverOff(); hoverId = null; render(state); });
  // A release the canvas never sees — capture refused, a dialog — must still
  // end whatever the hand was doing, or the next move keeps drawing with no
  // button down. The hand's OWN release: a palm lifted off the panel while the
  // pen draws is not the pen letting go (V1-PLAN R6).
  addEventListener('pointerup', (e) => {
    if (e.target === canvas) return;
    if (touches.has(e.pointerId)) fingerUp(e, true); // a finger let go off the board: forgotten, and it taps nothing
    if (owner && e.pointerId !== owner.id) return;
    owner = null;
    if (forward) { postPointer(forward, 'up', e, screenToWorld(e.clientX, e.clientY)); forward = null; return; }
    if (knobEnd() || demoEnd()) return;
    if (drag) { endDrag(); return; }
    if (panning) { panning = null; canvas.style.cursor = 'crosshair'; return; }
    if (live) { live = null; render(state); }
  }, true);
  addEventListener('pointercancel', (e) => { if (e.target !== canvas && touches.has(e.pointerId)) fingerUp(e, true); }, true);

  addEventListener('keydown', (e) => {
    if (e.code === 'Space' && !spaceHeld && e.target === document.body) {
      spaceHeld = true; canvas.style.cursor = 'grab'; e.preventDefault();
    }
    if ((e.ctrlKey || e.metaKey) && e.key === 'z') { e.preventDefault(); session.undo(); }
    // Copy holds the selection's ink (and puts it on the clipboard as SVG); paste is handled with files, in the images fragment.
    if ((e.ctrlKey || e.metaKey) && e.key === 'c' && e.target === document.body && state.selection.length) { e.preventDefault(); copyMarks(state.selection.slice()); }
    if (e.target === document.body && e.key === 'Escape' && state.selection.length && !state.summon) session.deselect(Date.now());
    // Esc with nothing held stops every model call in flight: a slow model is not a hang, and the hand can say enough.
    else if (e.target === document.body && e.key === 'Escape' && !state.selection.length && !state.summon) cancelWork();
    if (e.target === document.body && (e.key === 'Backspace' || e.key === 'Delete') && state.selection.length) {
      e.preventDefault();
      eraseSelection();
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
    // No model that can see: kept for one, and said — never the pane popped (V1-PLAN J5).
    else if (act === 'read') { const n = state.nodes.get(id); if (n && !readers().length) keepRead({ line: [], single: [id] }); else if (n && !readOne(n, true)) say('nothing there to read'); }
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

  // The status line says ONE thing: the last thing that happened, for a
  // while, then the standing state. `say` is for outcomes worth reading
  // (a model wrote a program); `flash` for the quick ones (erased 3). Both
  // re-render at once: the render triggered by the stroke itself has already
  // happened by the time we know what the stroke did, and a message set
  // after it would never show — an erase would look silent.
  let flashText = null, flashAt = 0, flashTimer = null, flashFor = 0;
  const FLASH_MS = 1600, SAY_MS = 7000;
  function say(msg, ms) {
    flashText = msg;
    flashAt = Date.now();
    flashFor = ms || SAY_MS;
    render(session.getState());
    clearTimeout(flashTimer);
    flashTimer = setTimeout(() => { flashText = null; render(session.getState()); }, flashFor);
  }
  function flash(msg) { say(msg, FLASH_MS); }

// ===== render =====
// Provides: queries over state, the rungs cache, render(), ink, the reading under the inspected mark
//   (readingUnder: its readings ranked by MM.rank, as the field ranks — V1-PLAN §2.2),
//   a hand's label on its own mark (labelsDrawn), a region's frame under everything (renderRegions, 12-regions.js), match chips,
//   the working dot, the explanation plane and its layout, the status line (one sentence).
// Uses: core, view, artifacts, snap, models, palette (contextFor), inspector, teach (syncMarkChip), folder (folderStatus, liveSet),
//   packs (packShort — a match chip says its pack; a pack this build lacks is said in the standing line),
//   input (live, magnetHold, penHover — the pen's layer draws the stroke in progress and a hovering pencil's magnet),
//   selection (dragPreview, dragFollowers — what follows a drag is drawn where it will stand, V1-PLAN E2).
// A fragment of one closure: Demos/build-surface.mjs concatenates surface/*.js
// in name order inside `(function () Ellipsis)();`. Shared state is the
// closure's; no imports, no exports, no build step beyond the concatenation.

  // ===== Queries over engine state ========================================
  const authorOf = (node) => {
    const e = node.edges.find((x) => x.rel === 'made-by');
    return e ? e.to : MM.LOCAL_PARTICIPANT;
  };
  const isAgentNode = (node) => authorOf(node) !== MM.LOCAL_PARTICIPANT;
  /** The colour a mark is drawn in: yours, a model's, or another hand's — a hue from its name. */
  function colourOf(node) {
    const pid = authorOf(node);
    if (pid === MM.LOCAL_PARTICIPANT) return C.ink;
    const p = state.nodes.get(pid);
    const kind = p && (p.reps.find((r) => r.modality === 'participant') || {}).data;
    if (!p || !kind || kind.kind === 'agent' || kind.kind === 'engine') return C.agent;
    return handColour(handLabel(MM.wordOf(p) || pid));
  }
  const handHues = new Map();
  function handColour(name) {
    let h = handHues.get(name);
    if (h === undefined) { let x = 0; for (const c of name) x = (x * 31 + c.charCodeAt(0)) >>> 0; h = x % 360; handHues.set(name, h); }
    return 'hsl(' + h + ' 55% ' + (document.documentElement.getAttribute('data-theme') === 'dark' ? '68%' : '42%') + ')';
  }
  const nameOfParticipant = (pid) =>
    pid === MM.LOCAL_PARTICIPANT ? 'you' : handLabel(MM.wordOf(state.nodes.get(pid)) || pid);

  /** The next move, for the standing line: one rung of the ladder, by what stands. */
  function nextMove(s, strokes) {
    if (s.summon) return 'type in the field, or tap a pill · a tap on the ground lets go';
    // One mark with its own points showing (E1): a ring reshapes its clean form.
    if (s.selection.length) return 'drag inside to move, a corner to scale, the knob to turn' + (markHandles(s).length ? ', a ring to reshape' : '') + ' · Esc lets go';
    if (s.pendingLassoId) return 'or double-tap inside the loop';
    if (!strokes && !s.artifacts.length) return 'draw anything · double-click empty ground to type';
    return 'press and hold a mark to hold it · or circle marks and double-tap inside';
  }

  /** The last mark on the board whose box, with a little slack, holds the point — found among the few the paint's index says could. */
  function nodeAt(x, y) {
    const slack = wpx(8);
    const ix = boardIndex();
    let best = null, bestAt = -1;
    const consider = (id) => {
      const at = ix.contentAt.get(id);
      if (at === undefined || at <= bestAt) return;
      const b = MM.boundsOf(state.nodes.get(id));
      if (b && x >= b.minX - slack && x <= b.maxX + slack && y >= b.minY - slack && y <= b.maxY + slack) { best = id; bestAt = at; }
    };
    for (const id of ix.paint.query({ minX: x - slack, minY: y - slack, maxX: x + slack, maxY: y + slack })) consider(id);
    for (const id of ix.unboxed) consider(id);
    return best;
  }

  /** An artifact that renders as a figure on the board rather than on a page. */
  function isFigureArtifact(node) {
    for (let i = node.reps.length - 1; i >= 0; i--) {
      if (node.reps[i].modality === 'code') {
        const d = node.reps[i].data;
        // A picture kept in the asset store is drawn on the board, a figure like a drawing; one that is only a name is a card with its brackets.
        return FIGURE_KINDS.has(d.kind || 'html') || (!!d.asset && MM.isPictureKind(d.kind));
      }
    }
    return false;
  }

  const union = (list) => list.reduce((a, b) => ({
    minX: Math.min(a.minX, b.minX), maxX: Math.max(a.maxX, b.maxX),
    minY: Math.min(a.minY, b.minY), maxY: Math.max(a.maxY, b.maxY),
  }));

  function lastContentId(s) {
    return s.contentIds.length ? s.contentIds[s.contentIds.length - 1] : null;
  }

  // ===== What a paint drew and said, for the equivalence check (R4c) ========
  // Off unless a test asks. `paintCheck` paints the board twice — once as the
  // surface paints it, once as the whole-board read would — records what each
  // drew (every mark's ink, a ghost, a chip, the reading under a mark, an
  // artifact's name, a label, a card, the minimap) and what each said (the
  // status line, the panel), and compares: what a hand's paint drew must be
  // what the whole-board read draws, and everything the whole-board read
  // draws on screen must be drawn. Nothing here runs in a hand's paint.
  let paintOps = null;        // while recording: what this paint drew, one op a thing
  let paintReference = false; // while painting as the whole-board read would
  let paintMoved = false;     // the ink being drawn is where a drag or a tank has taken it
  let followShown = null;     // the connectors that follow the drag in progress, id → node as it will stand (V1-PLAN E2)
  let paintNow = 0;           // a clock held still for the two paints a check compares
  const nowMs = () => paintNow || Date.now();
  /** The reading under the inspected mark, as the last paint drew it: { id, text }, or null. */
  let readingDrawn = null;
  const round2 = (v) => Math.round(v * 100) / 100;
  function boxOfPoints(points) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of points) {
      if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x;
      if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y;
    }
    return { minX: round2(minX), minY: round2(minY), maxX: round2(maxX), maxY: round2(maxY) };
  }
  const boxOfRect = (x, y, w, h) => ({ minX: round2(x), minY: round2(y), maxX: round2(x + w), maxY: round2(y + h) });
  function recordOp(op) { if (paintOps) paintOps.push(op); }

  // ===== What the log says, kept while the log stands (R4c) =================
  // A paint reads what the log derives — what each mark plays, where every
  // mark is, who read what, which labels stand — and keeps each only while
  // the log it came from stands. The key is the log itself: which array the
  // session holds (undo and load replace it), how long it is, and which event
  // ends it. Nothing else can say the board changed, so nothing else keys a
  // cache here: a stale cache is worse than a slow one.
  const serials = new WeakMap();
  let serialNext = 0;
  const serialOf = (o) => { let n = serials.get(o); if (n === undefined) { n = ++serialNext; serials.set(o, n); } return n; };
  function logKey() {
    const evs = session.getEvents();
    return serialOf(evs) + ':' + evs.length + ':' + (evs.length ? serialOf(evs[evs.length - 1]) : 0);
  }

  const growBox = (a, b) => (!a ? { minX: b.minX, minY: b.minY, maxX: b.maxX, maxY: b.maxY }
    : { minX: Math.min(a.minX, b.minX), minY: Math.min(a.minY, b.minY), maxX: Math.max(a.maxX, b.maxX), maxY: Math.max(a.maxY, b.maxY) });
  const boxMeets = (a, b) => a.maxX >= b.minX && a.minX <= b.maxX && a.maxY >= b.minY && a.minY <= b.maxY;
  function pointsBox(points) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const p of points) { if (p.x < minX) minX = p.x; if (p.x > maxX) maxX = p.x; if (p.y < minY) minY = p.y; if (p.y > maxY) maxY = p.y; }
    return points.length ? { minX, minY, maxX, maxY } : null;
  }

  /**
   * The board as the paint reads it, for one log: built once when the log
   * changes, a few milliseconds on a board of thousands of marks.
   *
   * - `scope` is the ink the rungs read, in their order: every loose mark,
   *   then each artifact's members (a box inside a live page is still a node,
   *   and the ladder says so); `at` is where each id stands in it.
   * - `reach` files those marks by their own boxes (`MM.MarkGrid`, cells sized
   *   from the marks), to find the marks within one's reach; `stray` are the
   *   marks whose boxes are not finite, which the grid does not hold and
   *   every neighbourhood carries; `wiredBy` is each mark's connectors.
   * - `paint` files each content mark by what it DRAWS — its own box, its
   *   clean form's and every part's, an artifact by its members' however far
   *   they have moved from where it was blessed — and `boxes` holds that box
   *   for the parts too; `unboxed` are the marks it has no finite box for,
   *   drawn always.
   * - `roles` and `genre` fill in as the paint asks.
   */
  let paintIndex = null;
  function boardIndex() {
    const key = logKey();
    // Built from the session's own state, which is the log's, whatever state
    // a caller holds: a cache kept by the log must be made from that log.
    if (!paintIndex || paintIndex.key !== key) {
      const before = paintIndex;
      paintIndex = buildIndex(session.getState(), key);
      // The last log's roles, and what each was read over, for roleOf to carry
      // forward — one log back, never a chain.
      if (before) { before.prev = null; paintIndex.prev = before; }
    }
    return paintIndex;
  }
  function buildIndex(s, key) {
    const artifactSet = new Set(s.artifacts);
    const scope = s.contentIds.filter((id) => !artifactSet.has(id));
    for (const aid of s.artifacts) for (const e of s.nodes.get(aid).edges) if (e.rel === 'has-part') scope.push(e.to);
    const at = new Map();
    scope.forEach((id, i) => { const p = at.get(id); if (p) p.push(i); else at.set(id, [i]); });
    const reach = new MM.MarkGrid(), stray = [], wiredBy = new Map();
    for (const id of at.keys()) {
      const n = s.nodes.get(id);
      const b = n && MM.boundsOf(n);
      if (b) { if (MM.finiteBounds(b)) reach.set(id, b); else stray.push(id); }
      if (n) for (const e of n.edges) if (e.rel === 'connects') { const w = wiredBy.get(e.to); if (w) w.push(id); else wiredBy.set(e.to, [id]); }
    }
    const boxes = new Map(), topOf = new Map();
    const boxOf = (id, top, depth) => {
      if (boxes.has(id)) return boxes.get(id);
      boxes.set(id, null);
      const n = s.nodes.get(id);
      if (!n) return null;
      let b = null;
      const own = MM.boundsOf(n);
      if (own) b = growBox(b, own);
      const points = MM.strokePointsOf(n);
      if (points) {
        const pb = pointsBox(points);
        if (pb) b = growBox(b, pb);
        const clean = MM.cleanPointsOf(n);
        const cb = clean && pointsBox(clean);
        if (cb) b = growBox(b, cb);
        // A routed connector draws its route, which may run outside its ink's box (D7).
        const rt = MM.routeRepOf(n);
        const rb = rt && rt.points.length >= 2 && pointsBox(rt.points);
        if (rb) b = growBox(b, rb);
      }
      if (depth < 12) {
        for (const e of n.edges) {
          if (e.rel !== 'has-part') continue;
          if (!topOf.has(e.to)) topOf.set(e.to, top);
          const pb = boxOf(e.to, top, depth + 1);
          if (pb) b = growBox(b, pb);
        }
      }
      boxes.set(id, b);
      return b;
    };
    const paint = new MM.MarkGrid(), contentAt = new Map(), unboxed = [];
    s.contentIds.forEach((id, i) => {
      contentAt.set(id, i);
      const b = boxOf(id, id, 0);
      if (b && MM.finiteBounds(b)) paint.set(id, b); else unboxed.push(id);
    });
    return {
      key, s, scope, at, reach, stray, wiredBy, paint, boxes, topOf, contentAt, unboxed,
      artifactsInOrder: s.contentIds.filter((id) => artifactSet.has(id)),
      roles: new Map(), roleSig: new Map(), prev: null, genre: null, readChips: null, labelled: null, candidates: null,
    };
  }

  // ===== The rungs: what a mark plays ======================================
  // Shape → role → genre. The reading under a mark and the panel's ladder
  // read one mark's role; the panel's code row for a live artifact reads the
  // board's genre. The role is placed by the table in `diagram/roles.ts` from
  // the mark's own shape, the ENGAGING relations it has (contains, inside,
  // near, touching, crossing) and the wires, and an engaging relation holds
  // only between marks within reach of each other (`MM.withinReach`, R4b) —
  // so the role the whole board would give a mark is the role its
  // neighbourhood gives it: the mark, the marks within its reach, the ends of
  // its wires and the connectors wired to it, read in the whole board's own
  // order so that ties in strength fall the same way. That is what a stroke
  // costs the surface now: the marks it touched and their neighbours, read
  // when the paint shows them, never the whole board. `paintCheck` holds a
  // hand's paint to the whole-board read (`wholeBoardRungs`, what this was on
  // every stroke until R4c).
  function readRungs(s) {
    if (paintReference) return wholeBoardRungs(s);
    return { roles: { get: (id) => roleOf(s, id) }, get genre() { return boardGenre(s); } };
  }

  /** The ids a mark's role is read over: its neighbourhood, in the board's order. */
  function neighbourhoodOf(ix, s, id) {
    if (ix.stray.includes(id)) return ix.scope.slice();
    const near = new Set([id]);
    const b = ix.reach.boundsOf(id);
    if (b) {
      const r = MM.reachAround(b);
      for (const x of ix.reach.query({ minX: b.minX - r, minY: b.minY - r, maxX: b.maxX + r, maxY: b.maxY + r })) {
        if (MM.withinReach(b, ix.reach.boundsOf(x))) near.add(x);
      }
    }
    for (const x of ix.stray) near.add(x);
    const n = s.nodes.get(id);
    if (n) for (const e of n.edges) if (e.rel === 'connects') near.add(e.to);
    for (const w of ix.wiredBy.get(id) || []) near.add(w);
    const pos = [];
    for (const x of near) { const p = ix.at.get(x); if (p) for (const i of p) pos.push(i); }
    pos.sort((a, b2) => a - b2);
    return pos.map((i) => ix.scope[i]);
  }

  /**
   * What a mark's role was read from: each mark of its neighbourhood, in the
   * board's order, and that mark's own content — the node, its reps and its
   * edges, which change only by being pushed to or replaced (and a rep or an
   * edge is never changed in place, R4b), so their identities and lengths say
   * whether anything a role is read from has changed.
   */
  const nodeSig = (n) => (n ? serialOf(n) + '.' + serialOf(n.reps) + '.' + n.reps.length + '.' + serialOf(n.edges) + '.' + n.edges.length : '-');

  /**
   * The role the whole board gives a mark, read over its neighbourhood;
   * undefined for what the rungs do not read. A role the last log read over
   * exactly the same neighbourhood — the same marks, in the same order, each
   * the same — is carried forward rather than read again: that is what keeps
   * the board's genre, every mark's role, a few milliseconds after a stroke
   * rather than a read of every neighbourhood on the board.
   */
  function roleOf(s, id) {
    const ix = boardIndex();
    if (!ix.at.has(id)) return undefined;
    if (ix.roles.has(id)) return ix.roles.get(id);
    const ids = neighbourhoodOf(ix, ix.s, id);
    let sig = '';
    for (const x of ids) sig += x + ':' + nodeSig(ix.s.nodes.get(x)) + '|';
    let role;
    if (ix.prev && ix.prev.roleSig.get(id) === sig) role = ix.prev.roles.get(id);
    else for (const r of session.read(ids).roles) if (r.id === id) role = r;
    ix.roles.set(id, role);
    ix.roleSig.set(id, sig);
    return role;
  }

  /** The board's genre: every mark's role, each read over its neighbourhood. Asked only by a live artifact's panel. */
  function boardGenre(s) {
    const ix = boardIndex();
    if (!ix.genre) {
      if (!ix.scope.length) ix.genre = { genre: 'empty', reasoning: 'nothing drawn yet' };
      else {
        const roles = [];
        for (const id of ix.scope) { const r = roleOf(s, id); if (r) roles.push(r); }
        ix.genre = MM.genreOf(roles);
      }
    }
    return ix.genre;
  }

  // ===== The reading under a mark, ranked as the field ranks (V1-PLAN §2.2) ==
  // What a mark IS, as items with a base and grounds — the name it was given,
  // the words it says, what the shape rung measured — ordered by the same
  // `MM.rank` the field's rows are, in the context where the mark stands, so
  // the reading under a mark and the field never disagree about what leads.
  // Nothing ranked here can be lifted by what stands beside it today
  // (`MM.canLift`: a name and the words are the hand's own, a shape is no
  // concept), so a stroke reads no neighbourhood; the day something can — a
  // pack's reading of a mark (B3) — the context is read for it, kept by the log.
  const KNOWN_READING = { on: 'known', confidence: 1 };
  function readingsOfMark(s, node) {
    const items = [];
    const word = MM.wordOf(node);
    if (word) items.push({ key: 'word', label: word, base: MM.baseOn(KNOWN_READING), grounds: KNOWN_READING });
    const said = MM.transcriptsOf(node)[0];
    if (said) { const g = { on: 'written', confidence: said.confidence }; items.push({ key: 'said', label: '“' + said.text + '”', base: MM.baseOn(g), grounds: g }); }
    // The shape rung's readings, in the order it holds them (blessed first,
    // then by weight): a later one never stands above an earlier one. A label
    // is its maker's word, not what the rung measured (L2b); a name is above.
    let cap = Infinity;
    for (const r of MM.interpretationsOf(node, s.nodes)) {
      if (!MM.isShapeRungReading(r)) continue;
      const g = { on: 'shape', confidence: r.weight };
      cap = Math.min(cap, MM.baseOn(g));
      items.push({ key: 'shape:' + r.label, label: r.label, base: cap, grounds: g });
    }
    return items;
  }
  function readingUnder(s, node, id) {
    const items = readingsOfMark(s, node);
    if (!items.length) return MM.topInterpretation(node);
    return MM.rank(items, MM.canLift(items) ? contextFor([id]) : MM.NO_CONTEXT)[0].label;
  }

  // The whole-board read: every mark's role, related over the whole board at
  // once — O(n·R), 7.9 s on 2,000 marks. What the reference paint reads. It
  // was kept on the set of ids alone, so a move that changed a role — a
  // circle dragged out of the box that held it — left the old role standing
  // until a mark was added or taken away; it is kept by the log now, like
  // everything else a paint reads.
  let rungs = { key: null, roles: new Map(), genre: null, reading: null };
  function wholeBoardRungs(s) {
    const ids = s.contentIds.filter((id) => !s.artifacts.includes(id));
    // Members of artifacts keep their roles — a box inside a live page is
    // still a node, and the ladder should say so.
    for (const aid of s.artifacts) {
      for (const e of s.nodes.get(aid).edges) if (e.rel === 'has-part') ids.push(e.to);
    }
    const key = logKey() + '|' + ids.join('|');
    if (rungs.key === key) return rungs;
    const reading = ids.length
      ? session.read(ids)
      : { roles: [], genre: { genre: 'empty', reasoning: 'nothing drawn yet' }, concepts: [], relations: [] };
    rungs = { key, roles: new Map(reading.roles.map((r) => [r.id, r])), genre: reading.genre, reading };
    return rungs;
  }

  // ===== Rendering: ink is ground truth ===================================
  // Below a pixel, a hand's points crowd one another: at the zoom that shows a
  // whole board a stroke of seventy points spans a few pixels, and stroking
  // every one of them — twice, with its halo — was most of the frame. So a
  // point nearer than THIN_PX on screen to the last one drawn is passed over
  // (the last point is always drawn): nothing drawn moves by as much as that,
  // and at working zoom a hand's points stand further apart than it and every
  // one is drawn. The reference paint draws every point.
  const THIN_PX = 1;
  function path(points, closed) {
    ctx.beginPath();
    const n = points.length;
    if (!n) return;
    const tol = paintReference ? 0 : THIN_PX / view.zoom, tol2 = tol * tol;
    let lx = points[0].x, ly = points[0].y;
    ctx.moveTo(lx, ly);
    for (let i = 1; i < n; i++) {
      const p = points[i];
      if (i < n - 1 && tol2 > 0) { const dx = p.x - lx, dy = p.y - ly; if (dx * dx + dy * dy < tol2) continue; }
      ctx.lineTo(p.x, p.y);
      lx = p.x; ly = p.y;
    }
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

  /** The colour each mark's ink was stroked in by the last paint, by node id. For tests. */
  const inkDrawn = new Map();
  /**
   * The colour a mark's ink WOULD be stroked in, for a mark the last paint
   * passed over because it was off screen: its maker's, or the gold of a live
   * artifact it is part of — as `inkOf` would choose. For tests.
   */
  function inkWouldBe(id) {
    const s = state, ix = boardIndex();
    const top = ix.contentAt.has(id) ? id : ix.topOf.get(id);
    const n = s.nodes.get(id), t = top && s.nodes.get(top);
    if (!n || !t || !MM.strokePointsOf(n)) return null;
    if (id !== top && (n.reps.some((r) => r.modality === 'erased') || (isWritingArtifact(t) && !flipped.has(top)))) return null;
    return s.live.includes(top) ? `rgba(${C.goldRGB},0.85)` : colourOf(n);
  }

  function inkOf(node, style) {
    const points = MM.strokePointsOf(node);
    if (points) {
      inkDrawn.set(node.id, style.color);
      // A handle being dragged (V1-PLAN E1): the form shown is the one the
      // mark will hold when the hand lets go — born clean, if it was ink.
      const reshaping = reshapeShownFor(node.id);
      const shown = reshaping || node;
      const clean = MM.cleanPointsOf(shown);
      // A routed connector (V1-PLAN D7): the route in front, at right angles between its ports and its
      // arrow's head at the tip, the hand's ink — and the clean form it held — faint beneath. The route is
      // derived from where the sites stand, so it is drawn where they stand; nothing is covered.
      const route = MM.routeRepOf(shown);
      const routed = route && route.points.length >= 2 ? route : null;
      if (paintOps) recordOp({ kind: 'ink', id: node.id, colour: style.color, width: round2(style.width), box: boxOfPoints(points), clean: routed ? boxOfPoints(routed.points) : clean ? boxOfPoints(clean) : null, moved: paintMoved || !!reshaping, gesture: !!style.gesture });
      if (routed) {
        for (const under of clean ? [points, clean] : [points]) {
          path(under, false);
          ctx.strokeStyle = C.inkFaint;
          ctx.lineWidth = Math.max(1, style.width * 0.7);
          ctx.stroke();
        }
        inkStroke(routed.points, false, style);
        if (routed.head) inkStroke([routed.head.wings[0], routed.head.tip, routed.head.wings[1]], false, style);
        routesDrawn.push({ id: node.id, points: routed.points.map((p) => ({ x: p.x, y: p.y })), head: routed.head ? { tip: Object.assign({}, routed.head.tip), wings: routed.head.wings.map((w) => Object.assign({}, w)) } : null, faint: true, avoided: routed.avoided });
        return;
      }
      if (clean) {
        // Snapped: the clean form in front, the hand's ink faint beneath it.
        // What was drawn is still there — that is the whole promise.
        path(points, false);
        ctx.strokeStyle = C.inkFaint;
        ctx.lineWidth = Math.max(1, style.width * 0.7);
        ctx.stroke();
        inkStroke(clean, MM.cleanOf(shown).closed, style);
        return;
      }
      inkStroke(points, false, style);
      // The offer: a ghost of what this mark would be, drawn clean. Dashed and
      // faint so it reads as a question, not a change already made — and for
      // a moment, not forever (v10 F4): the mark just drawn, what is hovered,
      // what is held. The offer itself stands; the dashes do not.
      const offer = snapOffers.get(node.id);
      if (offer && !style.gesture && ghostShown(state, node.id)) {
        const ideal = idealOf(node, offer.shape);
        if (ideal) {
          // The ghost follows the ink: same placement (transform, rotation).
          const ghost = MM.placed(node, ideal.points);
          if (paintOps) recordOp({ kind: 'ghost', id: node.id, box: boxOfPoints(ghost), moved: paintMoved });
          path(ghost, ideal.closed);
          ctx.setLineDash([wpx(3), wpx(4)]);
          ctx.strokeStyle = `rgba(${C.goldRGB},0.7)`;
          ctx.lineWidth = wpx(1.2);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }
      return;
    }
    // Text made from writing stands in place of the ink: the writing shows only when flipped over (v10 F8).
    if (isWritingArtifact(node) && !flipped.has(node.id)) return;
    for (const e of node.edges) { // artifact: draw its members (transparent within)
      if (e.rel !== 'has-part') continue;
      // A member that follows a drag (V1-PLAN E2) is drawn where the drag takes it.
      const m = (followShown && followShown.get(e.to)) || state.nodes.get(e.to);
      if (!m || m.reps.some((r) => r.modality === 'erased')) continue;
      // Off screen, a member is passed over — unless a drag or a tank has moved it, when its box is not where it is drawn.
      if (paintView && !paintMoved && paintIndex) { const mb = paintIndex.boxes.get(m.id); if (mb && MM.finiteBounds(mb) && !boxMeets(mb, paintView)) continue; }
      // Each mark in the colour of the hand that DREW it, not of the one that made the
      // whole: an artifact is made by whoever blessed it, and a hand may bless a group
      // several hands drew (V1-PLAN L2f). A colour the style imposes — a live page's
      // gold, the outline of what was built — holds for every mark in it.
      inkOf(m, style.byMaker ? Object.assign({}, style, { color: colourOf(m) }) : style);
    }
  }

  // The clean-form ghost is an offer for a moment, not a fixture.
  const GHOST_MS = 6000;
  let lastDrawAt = 0, ghostTimer = null;
  function ghostShown(s, id) {
    if (hoverId === id || s.selection.includes(id)) return true;
    if (s.summon && s.summon.enclosedIds.includes(id)) return true;
    if (heldCandidates.includes(id)) return true;
    return id === lastContentId(s) && nowMs() - lastDrawAt < GHOST_MS;
  }

  let chipHits = []; // the match chips drawn this frame, in world coordinates: { ids, x, y, w, h }
  /** The match chip under a world point, if any. */
  function chipAt(w) {
    for (const c of chipHits) if (w.x >= c.x && w.x <= c.x + c.w && w.y >= c.y && w.y <= c.y + c.h) return c;
    return null;
  }

  /**
   * Runtime memory keyed by node id — what is flipped, which marks a reading
   * was asked about, what was read with what, what was already handed to a
   * reader — forgets a node the log no longer holds. An id is the core's to
   * mint and opaque here; what matters is that it is NOT unique for all
   * time, so a fresh board may hand out one this memory still holds: a text
   * flipped before a `load([])` kept the next text with the same id flipped,
   * and a scratch over it struck nothing (found by e2e 35). Keying runtime
   * memory to what the log holds is right whatever the rule.
   */
  function pruneRuntime(s) {
    for (const id of [...flipped]) if (!s.live.includes(id)) flipped.delete(id);
    if (readGroups.size) {
      const inPlane = paintReference ? (id) => s.contentIds.includes(id) : ((ix) => (id) => ix.contentAt.has(id))(boardIndex());
      for (const id of [...readGroups.keys()]) if (!inPlane(id)) readGroups.delete(id);
    }
    for (const id of [...readWith.keys()]) if (!s.nodes.has(id)) readWith.delete(id);
    for (const key of [...askedToRead]) { const first = String(key).replace(/^line:/, '').split(',')[0]; if (!s.nodes.has(first)) askedToRead.delete(key); }
  }

  // ===== The stroke in progress, on a layer of its own (R4c) ================
  // A pointer move while drawing repaints the pen — the stroke so far, and the
  // magnet it is in reach of — on a canvas laid over the board's, and never
  // the board: a paint of everything on every move, on a big board, was the
  // ink lagging the pen. The layer takes no pointer; the board's canvas under
  // it takes every one, as before. Every paint of the board repaints it too,
  // so a pan or a zoom mid-stroke keeps the pen where the hand is. A pencil
  // hovering over the glass, touching nothing, has its magnet drawn here too
  // (V1-PLAN R6): the site a stroke begun there would start on.
  const liveCanvas = document.createElement('canvas');
  liveCanvas.id = 'liveInk';
  liveCanvas.setAttribute('aria-hidden', 'true');
  liveCanvas.style.cssText = 'position:absolute;left:0;top:0;pointer-events:none;z-index:2;';
  canvas.insertAdjacentElement('afterend', liveCanvas);
  const liveCtx = liveCanvas.getContext('2d');
  let liveShown = false;
  function drawLive() {
    const dpr = window.devicePixelRatio || 1;
    if (liveCanvas.width !== Math.round(innerWidth * dpr) || liveCanvas.height !== Math.round(innerHeight * dpr)) {
      liveCanvas.width = Math.round(innerWidth * dpr);
      liveCanvas.height = Math.round(innerHeight * dpr);
      liveCanvas.style.width = innerWidth + 'px';
      liveCanvas.style.height = innerHeight + 'px';
      liveShown = true;
    }
    liveCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (liveShown) liveCtx.clearRect(0, 0, innerWidth, innerHeight);
    liveShown = !!live || !!penHover;
    if (!liveShown) return;
    liveCtx.setTransform(dpr * view.zoom, 0, 0, dpr * view.zoom, dpr * view.panX, dpr * view.panY);
    // A pencil hovering over the glass: the magnet it is in reach of, where a stroke begun
    // there would start (V1-PLAN R6) — the same ring, drawn before the pen comes down.
    if (!live) { magnetRing(penHover); return; }
    liveCtx.lineCap = 'round';
    liveCtx.lineJoin = 'round';
    liveCtx.beginPath();
    live.forEach((p, i) => (i ? liveCtx.lineTo(p.x, p.y) : liveCtx.moveTo(p.x, p.y)));
    liveCtx.strokeStyle = C.ink;
    liveCtx.lineWidth = Math.max(2, wpx(1.3));
    liveCtx.stroke();
    // The hold, while the pen is in a site's reach: a ring and the site's
    // name, in the participant colour — an offer, never a trap (P1).
    if (magnetHold) magnetRing(magnetHold);
  }
  /**
   * A magnet the pen is in reach of: a ring, a dot, and the site's name — in
   * world space, on the pen's layer; or on the board's, where a connector's
   * own end dragged by its handle is held (V1-PLAN E2).
   */
  function magnetRing(hit, c) {
    c = c || liveCtx;
    const p = hit.site.point;
    c.beginPath();
    c.arc(p.x, p.y, wpx(8), 0, Math.PI * 2);
    c.strokeStyle = C.agent;
    c.lineWidth = wpx(1.5);
    c.stroke();
    c.beginPath();
    c.arc(p.x, p.y, wpx(2.2), 0, Math.PI * 2);
    c.fillStyle = C.agent;
    c.fill();
    c.font = wpx(11).toFixed(2) + "px 'Space Grotesk', system-ui, sans-serif";
    c.lineWidth = wpx(3);
    c.strokeStyle = C.haloText;
    c.strokeText(hit.site.kind, p.x + wpx(13), p.y - wpx(9));
    c.fillStyle = C.agent;
    c.fillText(hit.site.kind, p.x + wpx(13), p.y - wpx(9));
  }

  /** The canvas in world units, grown by `m` world units on every side. */
  function screenWorld(m) {
    const a = screenToWorld(0, 0), b = screenToWorld(innerWidth, innerHeight);
    return { minX: Math.min(a.x, b.x) - m, minY: Math.min(a.y, b.y) - m, maxX: Math.max(a.x, b.x) + m, maxY: Math.max(a.y, b.y) + m };
  }

  /** Where a match chip sits and how big it is, measured in the chrome's own size — drawn or not. */
  function chipRect(str, x, y) {
    ctx.font = wpx(10.5).toFixed(2) + 'px ui-monospace, SFMono-Regular, Menlo, monospace';
    const w = ctx.measureText(str).width + wpx(14), h = wpx(17);
    return { x: x, y: y - h, w: w, h: h };
  }

  /** The box each cluster candidate's marks fill, for this log. */
  function candidateBoxes(ix) {
    if (!ix.candidates) ix.candidates = ix.s.clusterCandidates.map((c) => union(c.nodeIds.map((id) => MM.boundsOf(ix.s.nodes.get(id)))));
    return ix.candidates;
  }

  /** What each model read a group as, for this log: the marks that hold a reading of the second tier, and what the chip says. */
  function readChipsOf(s, ix) {
    if (ix && ix.readChips) return ix.readChips;
    if (ix) s = ix.s;
    const out = [];
    for (const id of s.contentIds) {
      const n = s.nodes.get(id);
      if (!n || n.reps.some((r) => r.modality === 'erased')) continue;
      const reads = MM.interpretationsOf(n, s.nodes).filter((r) => r.tier === 2 && !r.blessed).sort((a, b) => b.weight - a.weight);
      if (!reads.length) continue;
      // In words, by a name in words (V1-PLAN J5): "state transformation 0.82  ·  GLM 5.3 Flash", never a slug or "llm:".
      out.push({ id: id, text: reads.slice(0, 2).map((r) => readingWords(r.label) + ' ' + r.weight.toFixed(2)).join('  ·  ') + '  ·  ' + modelWords(reads[0].sourceName) });
    }
    if (ix) ix.readChips = out;
    return out;
  }

  /** Whether an artifact wears its brackets and name: a FIGURE only while the hand is on it. */
  function chromeShown(s, id, inspectedId) {
    const node = s.nodes.get(id);
    if (!node || !MM.boundsOf(node)) return false;
    return !(isFigureArtifact(node) && id !== inspectedId && !s.selection.includes(id));
  }

  /**
   * The content marks this paint draws, in the board's order: those whose
   * box meets the screen, and — wherever they are — what the hand is on or
   * holds, what a drag or a tank has moved, and the artifacts whose name or
   * brackets reach the screen.
   */
  function paintOrder(s, ix, vb, inspectedId, pv, followers) {
    const out = new Set(ix.paint.query(vb));
    for (const id of ix.unboxed) out.add(id);
    if (inspectedId) out.add(inspectedId);
    const last = lastContentId(s);
    if (last) out.add(last);
    for (const id of s.selection) out.add(id);
    if (s.summon) for (const id of s.summon.enclosedIds) out.add(id);
    for (const id of heldCandidates) out.add(id);
    if (pv) for (const id of pv.ids) out.add(id);
    // What follows a drag is drawn where the drag takes it, wherever that is (V1-PLAN E2).
    if (followers) for (const id of followers.keys()) out.add(ix.contentAt.has(id) ? id : ix.topOf.get(id) || id);
    for (const id of tank.place.keys()) out.add(id);
    for (const id of ix.artifactsInOrder) {
      if (out.has(id) || !chromeShown(s, id, inspectedId)) continue;
      const node = s.nodes.get(id), b0 = MM.boundsOf(node), pl = bodyPlacement(id);
      const b = pl ? { minX: b0.minX + pl.dx, maxX: b0.maxX + pl.dx, minY: b0.minY + pl.dy, maxY: b0.maxY + pl.dy } : b0;
      ctx.font = wpx(11).toFixed(2) + "px 'Space Grotesk', system-ui, sans-serif";
      const w = ctx.measureText((MM.wordOf(node) || '') + '  ·  live').width;
      const chrome = { minX: b.minX - wpx(24), minY: b.minY - wpx(40), maxX: Math.max(b.maxX, b.minX + w) + wpx(24), maxY: b.maxY + wpx(24) };
      if (boxMeets(chrome, vb)) out.add(id);
    }
    return [...out].filter((id) => ix.contentAt.has(id)).sort((a, b) => ix.contentAt.get(a) - ix.contentAt.get(b));
  }

  /** While a paint culls, the world box it draws within; null when it draws everything. */
  let paintView = null;

  /** How many times the board has been painted, for tests: a pointer move while drawing must not paint it. */
  let paints = 0;
  /**
   * A tool that writes hundreds of events in one act — Draw it from a Mermaid text (D3) — holds the paint
   * until it has written them: every event still reaches the journal and every other listener, and the board
   * is painted once, after. Painted per event, a 45-node diagram took seven seconds of paints.
   */
  let paintHeld = 0;
  function holdPaint(fn) {
    paintHeld++;
    try { return fn(); } finally { if (--paintHeld === 0) render(session.getState()); }
  }
  function render(s) {
    if (paintHeld) { state = s; return; }
    paints++;
    state = s;
    picturesBegin();
    chipHits = [];
    chromeDrawn = [];
    readingDrawn = null;
    inkDrawn.clear();
    pruneRuntime(s);
    // No model is asked from here: a paint is not a request (§6.3).
    syncStage(s);
    refreshOffers();
    // The reference paint (paintCheck) reads the whole board and draws all of
    // it, as every paint did before R4c; a hand's paint reads what the log
    // keeps and draws what is on screen.
    const ix = paintReference ? null : boardIndex();

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
    // What is on screen: the canvas, with room for what a mark draws past its
    // own box — a stroke's width and its halo, a chip, a few words beside it.
    const vb = ix ? screenWorld(Math.max(wpx(48), inkW * 2)) : null;

    const cands = ix ? candidateBoxes(ix) : null;
    (ix ? ix.s : s).clusterCandidates.forEach((c, ci) => {
      const b0 = cands ? cands[ci] : union(c.nodeIds.map((id) => MM.boundsOf(s.nodes.get(id))));
      const cp = bodyPlacement(c.nodeIds[0]);
      const b = cp ? { minX: b0.minX + cp.dx, maxX: b0.maxX + cp.dx, minY: b0.minY + cp.dy, maxY: b0.maxY + cp.dy } : b0;
      const pad = wpx(14);
      // A match is a chip beside the group, with its number (D8); a tap on it
      // opens the field with the match leading. Plural, like every reading:
      // two definitions with the same shapes are both named.
      // A library pack's definition says its pack (V1-PLAN B3): molecule 0.93 · basics.
      const said = c.matches.slice(0, 2).map((m) => m.name + ' ' + m.score.toFixed(2) + (m.pack ? ' · ' + packShort(m.pack) : '')).join('  ·  ');
      const at = chipRect(said, b.minX - pad, b.minY - pad - wpx(8));
      const whole = { minX: b.minX - pad, minY: at.y, maxX: Math.max(b.minX - pad + at.w, b.maxX + pad), maxY: b.maxY + pad };
      if (!vb || cp || boxMeets(whole, vb)) {
        ctx.setLineDash([wpx(4), wpx(6)]);
        ctx.strokeStyle = `rgba(${C.goldRGB},0.38)`;
        ctx.lineWidth = wpx(1);
        ctx.strokeRect(b.minX - pad, b.minY - pad, b.maxX - b.minX + pad * 2, b.maxY - b.minY + pad * 2);
        ctx.setLineDash([]);
        chipText(said, b.minX - pad, b.minY - pad - wpx(8));
        if (paintOps) recordOp({ kind: 'match', id: c.nodeIds.join(','), text: said, box: boxOfRect(whole.minX, whole.minY, whole.maxX - whole.minX, whole.maxY - whole.minY), moved: !!cp });
      }
      // Measured wherever it is, so a tap and a test find it whether it was drawn or not.
      chipHits.push({ ids: c.nodeIds.slice(), x: at.x, y: at.y, w: at.w, h: at.h, text: said });
    });
    // What a model read a group as stays beside it (v10 F6): a chip with the
    // number and the reader, whether or not the field is still open, and a
    // tap on it opens the field on those marks again. A reading held on a
    // group's first member speaks for the group it was asked about.
    const inPlane = ix ? (g) => ix.contentAt.has(g) : (g) => s.contentIds.includes(g);
    for (const rc of readChipsOf(s, ix)) {
      const id = rc.id;
      const group = (readGroups.get(id) || [id]).filter(inPlane);
      const boxes = (group.length ? group : [id]).map((g) => MM.boundsOf(s.nodes.get(g))).filter(Boolean);
      if (!boxes.length) continue;
      const b = union(boxes);
      const pad = wpx(14);
      const at = chipRect(rc.text, b.minX - pad, b.maxY + pad + wpx(17));
      if (!vb || boxMeets({ minX: at.x, minY: at.y, maxX: at.x + at.w, maxY: at.y + at.h }, vb)) {
        chipText(rc.text, b.minX - pad, b.maxY + pad + wpx(17));
        if (paintOps) recordOp({ kind: 'read', id: id, text: rc.text, box: boxOfRect(at.x, at.y, at.w, at.h), moved: false });
      }
      chipHits.push({ ids: group.length ? group : [id], x: at.x, y: at.y, w: at.w, h: at.h, text: rc.text });
    }

    const inspectedId = hoverId || lastContentId(s);
    const pv = dragPreview();
    // The connectors bound to what a drag moves, each drawn as it will stand when the hand lets go (V1-PLAN E2).
    followShown = pv ? dragFollowers() : null;
    routesDrawn = [];
    // Which artifacts wear their brackets and name — for every artifact on the
    // board, in its order, drawn or not: a label rises above the name, and the
    // name is the same whether the artifact is on screen or not.
    for (const id of ix ? ix.artifactsInOrder : s.contentIds.filter((x) => s.artifacts.includes(x))) if (chromeShown(s, id, inspectedId)) chromeDrawn.push(id);
    const artifactSet = new Set(s.artifacts), liveSetNow = new Set(s.live);
    // Members of an artifact are culled one by one — a big drawing is mostly
    // off screen at working zoom — except while a tank moves bodies about.
    paintView = vb && !tank.place.size ? vb : null;

    // The regions first of all, a quiet frame with a name: the ground the pictures and the ink stand on (12-regions.js).
    renderRegions(s, vb, pv);

    // The pictures first — they are the ground the ink is drawn over: a picture kept in the asset store is
    // painted on this canvas, under every stroke, culled to the screen with the rest of the paint (and a
    // picture held and being dragged is drawn where the drag takes it).
    const order = ix ? paintOrder(s, ix, vb, inspectedId, pv, followShown) : s.contentIds;
    for (const id of order) {
      if (!artifactSet.has(id)) continue;
      const pn = s.nodes.get(id);
      if (!pn || !MM.pictureOf(pn)) continue;
      const heldPic = pv && pv.ids.includes(id);
      if (heldPic) { ctx.save(); applyPreview(pv); }
      const st = drawPicture(pn, id);
      if (heldPic) ctx.restore();
      if (st && paintOps) { const pb = MM.boundsOf(pn); recordOp({ kind: 'picture', id: id, text: st === 'drawn' ? 'drawn' : 'standing', box: boxOfRect(pb.minX, pb.minY, pb.maxX - pb.minX, pb.maxY - pb.minY), moved: !!heldPic }); }
    }

    for (const id of order) {
      const follows = followShown && followShown.get(id);
      const node = follows || s.nodes.get(id);
      const isArtifact = artifactSet.has(id);
      const isLive = liveSetNow.has(id);
      const pending = s.pendingLassoId === id;
      // A closed stroke around marks is plain ink until the mark takes it: nothing
      // lights up on its own. The command mark is what makes it a selection.
      const color = colourOf(node);

      // A live artifact keeps its ink: the boxes you drew ARE the outlines of
      // what got built, and that promise is only kept by drawing them on top.
      // While a hand holds the selection, the held marks follow it before the
      // log has the move — one event lands when the hand lets go.
      // A connector that follows the drag is drawn from where the drag takes it: its own
      // node, carried as the replay will carry it, never the canvas's transform on top.
      const held = !follows && pv && pv.ids.includes(id);
      if (held) { ctx.save(); applyPreview(pv); }
      // A body in a running tank is drawn where its behaviour has taken it:
      // the DRAWING moves, translated and turned, never a sprite in its place.
      const pl = bodyPlacement(id);
      if (pl) { ctx.save(); ctx.translate(pl.cx + pl.dx, pl.cy + pl.dy); ctx.rotate(pl.angle); ctx.translate(-pl.cx, -pl.cy); }
      paintMoved = !!(held || pl || follows);
      inkOf(node, {
        color: isLive ? `rgba(${C.goldRGB},0.85)` : color,
        width: id === inspectedId ? inkW * 1.3 : inkW,
        byMaker: !isLive,
      });
      paintMoved = false;
      if (pl) ctx.restore();
      if (held) ctx.restore();

      const b0 = MM.boundsOf(node);
      const b = b0 && pl ? { minX: b0.minX + pl.dx, maxX: b0.maxX + pl.dx, minY: b0.minY + pl.dy, maxY: b0.maxY + pl.dy } : b0;
      if (isArtifact && b) {
        // A FIGURE wears its chrome only while you point at it. The brackets
        // and the filename say "a thing with an identity you can grab", which
        // is what you want over a page or a program; over a title, a label
        // inside a drawn box, or a note, they are a second drawing on top of
        // the first, and a figure made of eight of them is unreadable. Same
        // rule the reading under a mark already follows: shown for the one the
        // hand is on, not for every mark on the board.
        if (chromeShown(s, id, inspectedId)) {
          const name = (MM.wordOf(node) || '') + (isLive ? '  ·  live' : '');
          if (paintOps) recordOp({ kind: 'chrome', id: id, text: name, box: boxOfRect(b.minX, b.minY, b.maxX - b.minX, b.maxY - b.minY), moved: !!pl });
          brackets(b, isLive ? C.gold : `rgba(${C.goldRGB},0.7)`);
          text(name, b.minX, b.minY - wpx(10), C.gold);
        }
      } else if (b && !pending && id === inspectedId && !s.selection.length) {
        // The reading of the mark the hand just made (or is over), and only
        // that one: what it is, and what it plays. Under every mark it was a
        // board of fragments; the panel has the rest.
        const top = readingUnder(s, node, id);
        const role = readRungs(s).roles.get(id);
        const played = role && role.role !== 'unclassified' && role.role !== top ? ' · ' + role.role : '';
        if (top) {
          readingDrawn = { id: id, text: top + played };
          if (paintOps) recordOp({ kind: 'reading', id: id, text: top + played, box: boxOfRect(b.minX, b.maxY, 0, wpx(15)), moved: !!pl });
          text(top + played, b.minX, b.maxY + wpx(15), `rgba(${C.labelRGB},0.85)`);
        }
      }
    }
    paintView = null;
    picturesPainted();

    renderLabels(s, inspectedId, ix, vb);
    // What the board's numbers say, beside its figures and its page (M5, 25-maths.js).
    renderMaths(s, ix, vb);

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

    // The stroke in progress lives on a layer of its own (drawLive), so a
    // pointer move repaints the pen and nothing else.
    drawLive();

    renderFrames(s);
    renderWorking(s);
    if (editing) placeEditor(editing.bounds);
    renderExplanations(s);
    renderSelection(s);
    syncTank(s);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); // back to screen space for the chrome
    syncMarkChip(s);
    renderSummon(s);
    renderInspector(s, inspectedId);
    renderMinimap(s);

    // The status line: what just happened, else the standing state, in a few
    // words — and a model at work is always in it, whichever it shows.
    const fresh = flashText && nowMs() - flashAt < flashFor;
    const ws = workingSummary();
    const hint = s.pendingLassoId ? 'cross the loop with ' + (s.commandMark ? 'your mark' : '✓') + ' to select what it holds' : '';
    const strokes = s.contentIds.length - s.artifacts.length;
    // Counts in the person's words (U1b): marks and things, never "loose" or "artifact".
    const parts = strokes ? [strokes + ' mark' + (strokes === 1 ? '' : 's')] : []; // an empty board: the next move says it
    if (s.artifacts.length) {
      const running = liveSet(s).size;
      parts.push(s.artifacts.length + ' thing' + (s.artifacts.length === 1 ? '' : 's') + ' made' + (s.live.length ? ' (' + (running < s.live.length ? running + ' of ' + s.live.length + ' live, the rest parked' : s.live.length + ' live') + ')' : ''));
    }
    if (s.regions.length) parts.push(s.regions.length + ' region' + (s.regions.length === 1 ? '' : 's'));
    const fs = folderStatus();
    if (fs) parts.push(fs);
    // A pack this board names that this build cannot give it is said, never hidden (V1-PLAN B3).
    if (s.packNotices.length) parts.push(s.packNotices.map((n) => n.reason === 'unknown' ? n.pack + ' is not in this build' : '“' + n.pack + '” is no pack').join(', ') + ' — its definitions are not matched here');
    if (agents.length) parts.push(agents.map((a) => modelWords(a) + (a.config && a.config.kind !== 'mcp' ? ' · ' + MM.providerLocality(a.config) : '')).join(', '));
    if (ws) parts.push('⋯ ' + ws);
    if (hint) parts.push(hint);
    // The standing line is a ladder (SURFACE-v10-PLAN D5): the next move, in a
    // few words, keyed to what the board holds — so what the board can do is
    // said before anything is asked, and never as a sentence of philosophy.
    const next = nextMove(s, strokes);
    if (next) parts.push(next);
    const standing = parts.join('  ·  ');
    // A fresh message takes the line; the one hint a waiting loop needs, and
    // a model at work, stay beside it. The standing state is kept on the
    // element for anything that needs to read it while a message shows.
    // A save that fails LEADS the line, fresh message or not, with its way
    // out, until a save succeeds (V1-PLAN R3: never silent).
    const warn = boardWarning();
    paintStatus(warn, fresh ? flashText + (ws ? '  ·  ⋯ ' + ws : '') + (hint ? '  ·  ' + hint : '') : standing);
    statusEl.dataset.standing = (warn ? warn.lead + '  ·  ' : '') + standing;
    statusEl.classList.toggle('said', !!fresh);
    statusEl.classList.toggle('warn', !!warn);
  }

  /**
   * The status line's text, and — while the board is not being kept — the
   * sentence that says so and its ways out as buttons in the line: *export
   * the log*, and *open a folder* where the browser can. Touched only when
   * what it says changes.
   */
  let statusSaid = '';
  function paintStatus(warn, text) {
    const canFolder = !!window.showDirectoryPicker;
    const ways = warn ? warn.ways.filter((w) => w !== 'folder' || canFolder) : [];
    const key = (warn ? warn.lead + '|' + ways.join(',') : '') + '\u0000' + text;
    if (key === statusSaid) return;
    statusSaid = key;
    if (!warn) { statusEl.textContent = text; return; }
    const label = { export: 'export the log', folder: 'open a folder' };
    statusEl.innerHTML = '<span class="lead">' + esc(warn.lead) + '</span>' +
      (ways.length ? ': ' + ways.map((w) => '<button type="button" data-way="' + w + '">' + label[w] + '</button>').join(', or ') : '') +
      (text ? '<span class="rest">  ·  ' + esc(text) + '</span>' : '');
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

  // ===== A hand's word on its own ink (V1-PLAN L2b; the notes, §B and §D) ====
  // A label is a word a mark's maker put on it: not a blessed name and not a
  // text artifact with a filename, so it makes no file and no card. It is
  // drawn here, on the canvas, beside the mark — in the ink's own colour,
  // which is its maker's, from the same tokens in either theme — and at a
  // size in the BOARD's units: the caption rule of 13-kinds.js, where a few
  // words written onto a drawing scale with the drawing. Held at screen size
  // they float off the thing they name the moment the board zooms (the notes,
  // fault 3). The size is the hand's: LABEL_PX on the screen the mark was
  // drawn on (its stroke's scale), so a label reads at the size its mark was
  // made at. Its chrome — who put it there — keeps quiet until the hand
  // points at the mark, like every other reading.
  const LABEL_PX = 13;
  let routesDrawn = []; // this paint's routed connectors, in world units, for tests (V1-PLAN D7): { id, points, head, faint, avoided }
  let labelsDrawn = []; // this paint's labels, in world units, for tests: { id, text, x, y, w, size, px, colour, who, whoShown }

  /** A label's size in world units: LABEL_PX in the hand's space when its mark was made. */
  function labelSizeOf(node) {
    const scaleOf = (n) => { const st = n && MM.getRep(n, 'stroke'); return st && st.data && st.data.scale > 0 ? st.data.scale : null; };
    let scale = scaleOf(node);
    for (const e of node.edges) {
      if (scale !== null) break;
      if (e.rel === 'has-part') scale = scaleOf(state.nodes.get(e.to));
    }
    return LABEL_PX * (scale || 1);
  }

  /** Every label on a mark whose ink is on the board: loose marks, and the marks an artifact holds. */
  function renderLabels(s, inspectedId, ix, vb) {
    labelsDrawn = [];
    const pv = dragPreview();
    for (const { id, placedBy } of labelledOf(s, ix)) {
      const node = s.nodes.get(id);
      drawLabel(s, node, MM.labelOf(node), placedBy, inspectedId, pv, vb);
    }
  }

  /** The marks that carry a label, and the content mark each is drawn under, in the board's order — for this log. */
  function labelledOf(s, ix) {
    if (ix && ix.labelled) return ix.labelled;
    if (ix) s = ix.s;
    const out = [];
    const seen = new Set();
    const visit = (id, placedBy) => {
      if (seen.has(id)) return;
      seen.add(id);
      const node = s.nodes.get(id);
      if (!node || node.reps.some((r) => r.modality === 'erased')) return;
      if (MM.labelOf(node)) out.push({ id: id, placedBy: placedBy });
      for (const e of node.edges) if (e.rel === 'has-part') visit(e.to, placedBy);
    };
    for (const id of s.contentIds) visit(id, id);
    if (ix) ix.labelled = out;
    return out;
  }

  /**
   * Where a label stands INSIDE its mark, when the mark is a closed form and the words fit in it (V1-PLAN D3,
   * words inside symbols): centred on the form, the whole box the words fill — with a little air — inside its
   * outline, so a diamond or a circle, whose corners take less than a box's, holds fewer words than a box. The
   * outline is the clean form the mark holds, else its own ink when that closes. Anything else — an open mark,
   * an artifact, a word too long for the form — is a caption above the mark, as a label has always been.
   */
  function labelInside(node, size, w) {
    let outline = MM.cleanPointsOf(node);
    if (!outline || outline.length < 3 || !(MM.cleanOf(node) || {}).closed) {
      const fp = MM.fingerprintOf(node);
      outline = fp && fp.isClosed ? MM.strokePointsOf(node) : null;
    }
    if (!outline || outline.length < 4) return null;
    const bb = MM.getBounds(outline);
    const cx = (bb.minX + bb.maxX) / 2, cy = (bb.minY + bb.maxY) / 2;
    const hw = w / 2 + size * 0.3, hh = size * 0.62;
    const within = (px, py) => {
      let inside = false;
      for (let i = 0, j = outline.length - 1; i < outline.length; j = i++) {
        const a = outline[i], b = outline[j];
        if ((a.y > py) !== (b.y > py) && px < ((b.x - a.x) * (py - a.y)) / (b.y - a.y) + a.x) inside = !inside;
      }
      return inside;
    };
    for (const [px, py] of [[cx - hw, cy - hh], [cx + hw, cy - hh], [cx - hw, cy + hh], [cx + hw, cy + hh]]) if (!within(px, py)) return null;
    return { x: cx - w / 2, y: cy + size * 0.32 };
  }

  function drawLabel(s, node, lab, placedBy, inspectedId, pv, vb) {
    const b0 = MM.boundsOf(node);
    if (!b0) return;
    // A body in a running tank, and a held selection mid-drag, carry their words with them.
    const pl = bodyPlacement(placedBy);
    const b = pl ? { minX: b0.minX + pl.dx, maxX: b0.maxX + pl.dx, minY: b0.minY + pl.dy, maxY: b0.maxY + pl.dy } : b0;
    const held = pv && (pv.ids.includes(node.id) || pv.ids.includes(placedBy));
    const size = labelSizeOf(node);
    // Above the artifact's own name when that chrome is showing, else just above the mark.
    const raised = chromeDrawn.includes(node.id) ? wpx(24) : 0;
    const colour = colourOf(node);
    const who = nameOfParticipant(lab.source || authorOf(node));
    const whoShown = node.id === inspectedId || placedBy === inspectedId;
    ctx.font = size.toFixed(3) + "px 'Space Grotesk', system-ui, sans-serif";
    const w = ctx.measureText(lab.text).width;
    // Inside a closed mark the words fit in, else above it. A body in a running tank carries its words above: it moves.
    const within = pl ? null : labelInside(node, size, w);
    const x = within ? within.x : b.minX, y = within ? within.y : b.minY - size * 0.45 - raised;
    // Where it stands is said wherever it is; it is drawn when it reaches the screen.
    labelsDrawn.push({ id: node.id, text: lab.text, x: x, y: y, w: w, size: size, px: size * view.zoom, colour: colour, who: who, whoShown: whoShown, inside: !!within });
    const reach = { minX: x, minY: y - size * 1.2, maxX: x + w + (whoShown ? size + wpx(11) * (who.length + 3) : 0), maxY: y + size * 0.5 };
    if (vb && !held && !pl && !boxMeets(reach, vb)) return;
    if (held) { ctx.save(); applyPreview(pv); }
    ctx.lineWidth = size * 0.24;
    ctx.strokeStyle = C.haloText;
    ctx.strokeText(lab.text, x, y);
    ctx.fillStyle = colour;
    ctx.fillText(lab.text, x, y);
    if (whoShown) text('· ' + who, x + w + size * 0.4, y, `rgba(${C.labelRGB},0.85)`);
    if (held) ctx.restore();
    if (paintOps) recordOp({ kind: 'label', id: node.id, text: lab.text, box: boxOfRect(x, y - size, w, size * 1.45), moved: !!(held || pl) });
  }

  function text(str, x, y, color) {
    ctx.font = wpx(11).toFixed(2) + "px 'Space Grotesk', system-ui, sans-serif";
    ctx.lineWidth = wpx(3);
    ctx.strokeStyle = C.haloText;
    ctx.strokeText(str, x, y);
    ctx.fillStyle = color;
    ctx.fillText(str, x, y);
  }

  /** A chip in the canvas: a small pill with a reading and its number, in the chrome's own size. */
  function chipText(str, x, y) {
    ctx.font = wpx(10.5).toFixed(2) + 'px ui-monospace, SFMono-Regular, Menlo, monospace';
    const w = ctx.measureText(str).width + wpx(14), h = wpx(17);
    roundRect(x, y - h, w, h, h / 2);
    ctx.fillStyle = `rgba(${C.panelRGB},0.92)`;
    ctx.fill();
    ctx.strokeStyle = `rgba(${C.goldRGB},0.45)`;
    ctx.lineWidth = wpx(1);
    ctx.stroke();
    ctx.fillStyle = C.gold;
    ctx.fillText(str, x + wpx(7), y - wpx(5));
    return { x: x, y: y - h, w: w, h: h };
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
   * is not enough: an answer card placed under the panel lands in the one place
   * it is guaranteed to be unreadable. The panel tucks under the bar on ONE
   * side, so the free ground is whichever side it leaves — reading its left
   * edge as the right margin (it stands on the left) left a 120px sliver of
   * world, and every answer was clamped into it, on top of the last.
   */
  function viewportWorld() {
    const rail = document.querySelector('.bar');
    const insp = document.getElementById('inspector');
    const railH = rail ? rail.getBoundingClientRect().height : 0;
    const r = insp && insp.offsetParent !== null ? insp.getBoundingClientRect() : null;
    let left = 8, right = innerWidth - 8;
    if (r && r.width > 0) {
      if (r.left + r.width / 2 < innerWidth / 2) left = Math.max(left, r.right + 16);
      else right = Math.min(right, r.left - 16);
    }
    // A window narrower than the panel leaves no free side; the whole of it is
    // better than a sliver nothing fits in.
    if (right - left < 120) { left = 8; right = Math.max(128, innerWidth - 8); }
    const a = screenToWorld(left, railH + 8);
    const b = screenToWorld(right, innerHeight - 46);
    return { minX: a.x, minY: a.y, maxX: b.x, maxY: b.y };
  }

  // The explanation plane has a LAYOUT of its own — runtime, never in the log.
  // Core anchors every answer beside the marks it is about, which is right;
  // but six marks stacked in a column each given a sentence — what the MCP
  // hand does with canvas_say — anchor six cards to the same edge, and they
  // land on each other and on the ink they are about. Ink is never covered,
  // and an answer nobody can read is not an answer. So the placing is the
  // surface's: each card keeps its anchor (a short dashed leader to the marks
  // it speaks for), and cards are pushed off each other and off the marks by a
  // greedy search — right of the anchor, then left, then below, then above,
  // shifting along the free side until it is clear. A card's place is a
  // consequence of the view, so it is found again on every zoom and pan:
  // positions in canvas units, every size in screen ones.
  const CARD_W = 260, CARD_PAD = 9, CARD_HEAD = 15, CARD_LINE = 15, CARD_GAP = 14;
  const CARD_STEPS = 8;        // half-card shifts either way along the free side
  const MAX_OBSTACLES = 200;   // the ink the search reads: bounded, so a busy board still paints
  const CARD_FONT = 'px ui-monospace, SFMono-Regular, Menlo, monospace';
  /** Where the last paint put each answer card, in world units. For tests. */
  let cardRects = [];
  /** Which artifacts wore their brackets and name in the last paint. For tests. */
  let chromeDrawn = [];

  const rectOf = (b) => ({ x: b.minX, y: b.minY, w: b.maxX - b.minX, h: b.maxY - b.minY });
  function overlapArea(a, b) {
    const ox = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
    const oy = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
    return ox > 0 && oy > 0 ? ox * oy : 0;
  }
  const meets = (a, b) =>
    a.x <= b.x + b.w && b.x <= a.x + a.w && a.y <= b.y + b.h && b.y <= a.y + a.h;
  /** The point of `box` nearest the given one — on its border when that one is outside. */
  const edgePoint = (box, toward) => ({
    x: Math.max(box.x, Math.min(toward.x, box.x + box.w)),
    y: Math.max(box.y, Math.min(toward.y, box.y + box.h)),
  });

  /**
   * WHAT a card is about, as a few words: the names its marks carry, else the
   * one mark's reading, else how many there are. A card is a sentence in a
   * live layer, not a caption someone will read cold, so the subject belongs in
   * its chrome — writing "Box 3 of six" into the prose is the writer doing by
   * hand, badly, what the card already knows.
   */
  function subjectOf(s, about) {
    const names = about.map((id) => { const n = s.nodes.get(id); return n && MM.wordOf(n); }).filter(Boolean);
    if (names.length) return names.slice(0, 2).join(', ') + (names.length > 2 ? ' +' + (names.length - 2) : '');
    if (about.length === 1) {
      const n = s.nodes.get(about[0]);
      if (!n) return 'a mark';
      const said = MM.transcriptOf(n);
      if (said) return '\u201c' + said + '\u201d';
      return MM.topInterpretation(n) || 'a mark';
    }
    return about.length + ' marks';
  }

  /**
   * How long ago, in a word. The explanation plane is the live layer — what
   * someone is saying now, not what the board holds — and a card that never
   * says its age reads as permanent, which is how it came to be used for
   * labels that belong in the drawing.
   */
  function agoOf(at) {
    const ms = nowMs() - (at || 0);
    if (!(ms > 0) || ms < 45000) return 'just now';
    const m = Math.round(ms / 60000);
    if (m < 60) return m + 'm ago';
    const h = Math.round(m / 60);
    return h < 24 ? h + 'h ago' : Math.round(h / 24) + 'd ago';
  }

  /** Measure one card: its lines at the chrome's own size, and the box they need. */
  function measureCard(s, id) {
    const node = s.nodes.get(id);
    if (!node || MM.getRep(node, 'erased') || MM.isSeatTraffic(node, s.nodes)) return null;
    const data = MM.explanationOf(node);
    const anchor = MM.boundsOf(node);
    if (!data || !anchor) return null;
    const about = MM.aboutIdsOf(node);
    const boxes = about.map((a) => (s.nodes.get(a) ? MM.boundsOf(s.nodes.get(a)) : null)).filter(Boolean);
    const w = wpx(CARD_W), pad = wpx(CARD_PAD);
    ctx.font = wpx(11).toFixed(2) + CARD_FONT;
    const lines = wrapText(data.text, w - pad * 2);
    const madeBy = node.edges.find((e) => e.rel === 'made-by');
    return {
      id: id, lines: lines, about: about,
      who: (madeBy && MM.wordOf(s.nodes.get(madeBy.to))) || 'agent',
      what: subjectOf(s, about),
      ago: agoOf(node.createdAt),
      subject: boxes.length ? union(boxes) : anchor,
      own: new Set(about),
      w: w, h: pad * 2 + wpx(CARD_HEAD) + lines.length * wpx(CARD_LINE),
    };
  }

  /**
   * The ink a card must stay off: what the content plane holds near the
   * viewport, bounded. A mark with no thickness — a level line, a dot — is
   * given the hand's own, or an overlap with it measures zero and a card sits
   * straight on top of it.
   */
  function inkObstacles(s, vw) {
    const m = wpx(600), thin = wpx(3);
    const win = { x: vw.minX - m, y: vw.minY - m, w: (vw.maxX - vw.minX) + m * 2, h: (vw.maxY - vw.minY) + m * 2 };
    const out = [];
    // The marks near the window, in the board's order: the paint's index finds them, the test below is the same.
    let ids = s.contentIds;
    if (!paintReference) {
      const ix = boardIndex();
      const near = new Set(ix.paint.query({ minX: win.x - thin, minY: win.y - thin, maxX: win.x + win.w + thin, maxY: win.y + win.h + thin }));
      for (const id of ix.unboxed) near.add(id);
      ids = [...near].filter((id) => ix.contentAt.has(id)).sort((a, b) => ix.contentAt.get(a) - ix.contentAt.get(b));
    }
    for (const id of ids) {
      const b = MM.boundsOf(s.nodes.get(id));
      if (!b) continue;
      const r = rectOf(b);
      if (r.w < thin) { r.x -= (thin - r.w) / 2; r.w = thin; }
      if (r.h < thin) { r.y -= (thin - r.h) / 2; r.h = thin; }
      if (!meets(r, win)) continue;
      out.push({ id: id, rect: r });
      if (out.length >= MAX_OBSTACLES) break;
    }
    return out;
  }

  /**
   * The free place for one card: right, left, below, above the anchor, each
   * shifted along its own free side. The first candidate that hits nothing
   * wins; when the board is too full for any of them the least-bad one does.
   *
   * The weights are an order of what may be given up. A card UNDER another
   * card is lost — nobody can read either — so that is the last thing sacrificed
   * and it outweighs every other cost put together; next comes covering the very
   * marks the card speaks for; then standing off screen, which costs the reader
   * only a pan; and cheapest, lying over other ink. Found on a board of two
   * dozen answers: with card-on-card merely dear, a small overlap kept beating
   * a whole card's worth of off-screen, and three pairs stacked.
   */
  function placeCard(card, placed, obstacles, vw, gap) {
    const s = card.subject, w = card.w, h = card.h;
    const vstep = (h + gap) / 2, hstep = (w + gap) / 2;
    const sides = [
      { x: s.maxX + gap, y: s.minY, dx: 0, dy: vstep },
      { x: s.minX - gap - w, y: s.minY, dx: 0, dy: vstep },
      { x: s.minX, y: s.maxY + gap, dx: hstep, dy: 0 },
      { x: s.minX, y: s.minY - gap - h, dx: hstep, dy: 0 },
    ];
    // Only the ink the search could reach, so a busy board costs no more.
    const reachW = w + hstep * CARD_STEPS + gap, reachH = h + vstep * CARD_STEPS + gap;
    const reach = { x: s.minX - reachW, y: s.minY - reachH,
                    w: (s.maxX - s.minX) + reachW * 2, h: (s.maxY - s.minY) + reachH * 2 };
    const near = obstacles.filter((o) => meets(o.rect, reach));
    // Staying on screen is a preference among places beside the anchor, never a
    // reason to leave it: when the marks themselves are off screen the card
    // belongs with them. Without this a card anchored a screenful away walked
    // its shifts back toward the viewport and crowded the cards that live there.
    const onScreen = meets(rectOf(s), rectOf(vw));
    const area = w * h;
    let best = null;
    for (const side of sides) {
      for (let k = 0; k <= CARD_STEPS; k++) {
        for (const sign of k === 0 ? [1] : [1, -1]) {
          const r = { x: side.x + side.dx * k * sign, y: side.y + side.dy * k * sign, w: w, h: h };
          let score = 0;
          for (const p of placed) score += overlapArea(r, p) * 24;
          for (const o of near) score += overlapArea(r, o.rect) * (card.own.has(o.id) ? 4 : 1);
          if (onScreen) {
            const iw = Math.max(0, Math.min(r.x + w, vw.maxX) - Math.max(r.x, vw.minX));
            const ih = Math.max(0, Math.min(r.y + h, vw.maxY) - Math.max(r.y, vw.minY));
            score += (area - iw * ih) * 2; // off screen: a pan away, so cheaper than a card lost under one
          }
          if (score <= 0) return r;
          // Among places that all cost something, the nearest the anchor wins:
          // the leader is short and the card is plainly that mark's.
          if (!best || score + k * area * 0.05 < best.score) best = { x: r.x, y: r.y, w: w, h: h, score: score + k * area * 0.05 };
        }
      }
    }
    return { x: best.x, y: best.y, w: w, h: h };
  }

  function renderExplanations(s) {
    cardRects = [];
    if (!s.explanations.length) return;
    const vw = viewportWorld();
    const gap = wpx(CARD_GAP), pad = wpx(CARD_PAD);

    const cards = s.explanations.map((id) => measureCard(s, id)).filter(Boolean);
    if (!cards.length) return;
    // A stable order — top-left first — so a card keeps its place when another
    // answer lands below it, and the plane does not reshuffle as it is read.
    cards.sort((a, b) => a.subject.minY - b.subject.minY || a.subject.minX - b.subject.minX || (a.id < b.id ? -1 : 1));
    const obstacles = inkObstacles(s, vw);
    const placed = [];
    for (const card of cards) {
      card.rect = placeCard(card, placed, obstacles, vw, gap);
      placed.push(card.rect);
      cardRects.push({ id: card.id, about: card.about.slice(), what: card.what, who: card.who, ago: card.ago, x: card.rect.x, y: card.rect.y, w: card.rect.w, h: card.rect.h });
    }

    // Every card is placed, on screen or not — a card off screen still keeps
    // its place from the ones that are — and drawn when it, its leader or the
    // marks it speaks for reach the screen.
    const vb = paintReference ? null : screenWorld(wpx(48));
    for (const card of cards) {
      const r = card.rect, sub = rectOf(card.subject);
      const reach = { minX: Math.min(r.x, sub.x), minY: Math.min(r.y, sub.y), maxX: Math.max(r.x + r.w, sub.x + sub.w), maxY: Math.max(r.y + r.h, sub.y + sub.h) };
      if (vb && !boxMeets(reach, vb)) continue;
      if (paintOps) recordOp({ kind: 'card', id: card.id, text: card.who + ' · ' + card.what + ' · ' + card.ago + ' · ' + card.lines.join(' '), box: boxOfRect(reach.minX, reach.minY, reach.maxX - reach.minX, reach.maxY - reach.minY), moved: false });
      // The leader keeps the anchor the placing moved: marks to card, by the
      // nearest edges, so a card always says which ink it speaks for.
      const from = edgePoint(sub, { x: r.x + r.w / 2, y: r.y + r.h / 2 });
      const to = edgePoint(r, { x: sub.x + sub.w / 2, y: sub.y + sub.h / 2 });
      if (Math.hypot(to.x - from.x, to.y - from.y) > wpx(2)) {
        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);
        ctx.strokeStyle = `rgba(${C.agentRGB},0.32)`;
        ctx.lineWidth = wpx(1);
        ctx.setLineDash([wpx(3), wpx(4)]);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      ctx.fillStyle = `rgba(${C.panelRGB},0.92)`;
      ctx.strokeStyle = `rgba(${C.agentRGB},0.38)`;
      ctx.lineWidth = wpx(1);
      roundRect(r.x, r.y, r.w, r.h, wpx(6));
      ctx.fill();
      ctx.stroke();

      // The header carries who said it, what it is about, and how long ago —
      // the three things that used to be smuggled into the sentence.
      ctx.font = wpx(10).toFixed(2) + CARD_FONT;
      const agoW = ctx.measureText(card.ago).width;
      ctx.fillStyle = `rgba(${C.labelRGB},0.7)`;
      ctx.fillText(card.ago, r.x + r.w - pad - agoW, r.y + pad + wpx(8));
      ctx.fillStyle = C.agent;
      const whoW = ctx.measureText(card.who).width;
      ctx.fillText(card.who, r.x + pad, r.y + pad + wpx(8));
      const room = r.w - pad * 2 - whoW - agoW - wpx(16);
      if (card.what && room > wpx(30)) {
        ctx.fillStyle = `rgba(${C.labelRGB},0.95)`;
        ctx.fillText(clipText(card.what, room), r.x + pad + whoW + wpx(8), r.y + pad + wpx(8));
      }

      ctx.fillStyle = C.ink;
      ctx.font = wpx(11).toFixed(2) + CARD_FONT;
      card.lines.forEach((ln, i) =>
        ctx.fillText(ln, r.x + pad, r.y + pad + wpx(CARD_HEAD) + wpx(8) + i * wpx(CARD_LINE)));
    }
  }

  /** As much of a word as fits, with an ellipsis when it does not. */
  function clipText(str, maxWidth) {
    if (ctx.measureText(str).width <= maxWidth) return str;
    let out = String(str);
    while (out.length > 1 && ctx.measureText(out + '\u2026').width > maxWidth) out = out.slice(0, -1);
    return out + '\u2026';
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

  /**
   * Every mark's role as a hand's paint reads it (over its neighbourhood)
   * against the whole-board read, and the board's genre both ways: the table
   * the reading under a mark and the panel say from. For tests.
   */
  function rolesCheck() {
    const s = session.getState();
    const whole = wholeBoardRungs(s);
    const ix = boardIndex();
    const differ = [];
    for (const id of ix.at.keys()) {
      const mine = roleOf(s, id), theirs = whole.roles.get(id);
      if (JSON.stringify(mine) !== JSON.stringify(theirs)) differ.push({ id: id, neighbourhood: mine || null, whole: theirs || null });
    }
    const genre = boardGenre(s);
    const genreSame = JSON.stringify(genre) === JSON.stringify(whole.genre);
    return { ok: !differ.length && genreSame, marks: ix.at.size, differ: differ.slice(0, 5), differing: differ.length, genre: genre.genre, genreSame: genreSame };
  }

  // ===== The equivalence check (R4c) ========================================
  /**
   * Paint the board as a hand's paint does, then as the whole-board read
   * would, and say where the two differ: everything the first drew, the second
   * drew the same; everything the second drew on screen, the first drew; and
   * both said the same thing — the reading under the mark, the status line,
   * the panel, the chips, the labels, the cards, the minimap, the offers.
   * A test's tool: it paints three times, with the clock held still, and
   * leaves the board as a hand's paint left it. `ops` is how many things a
   * hand's paint drew, `of` how many the whole-board read drew.
   */
  function paintCheck() {
    const s = session.getState();
    const take = (reference) => {
      paintOps = [];
      paintReference = reference;
      try { render(s); } finally { paintReference = false; }
      const ops = paintOps;
      paintOps = null;
      return {
        ops: ops,
        reading: readingDrawn,
        // A model at work says how long it has worked; that is the clock, not the board.
        status: statusEl.textContent.replace(/\d+s\b/g, '#s'),
        standing: (statusEl.dataset.standing || '').replace(/\d+s\b/g, '#s'),
        // A running tank's clock is said in the panel; that too is the clock.
        panel: inspectorEl.innerHTML.replace(/t = [\d.]+s/g, 't = #s'),
        chips: chipHits.map((c) => ({ ids: c.ids.slice(), x: round2(c.x), y: round2(c.y), w: round2(c.w), h: round2(c.h) })),
        labels: labelsDrawn.map((l) => ({ id: l.id, text: l.text, x: round2(l.x), y: round2(l.y), w: round2(l.w), colour: l.colour, who: l.who, whoShown: l.whoShown })),
        cards: cardRects.map((c) => ({ id: c.id, what: c.what, who: c.who, ago: c.ago, x: round2(c.x), y: round2(c.y), w: round2(c.w), h: round2(c.h) })),
        chrome: chromeDrawn.slice(),
        mini: typeof mini !== 'undefined' && mini ? { scale: mini.scale, ox: round2(mini.ox), oy: round2(mini.oy) } : null,
        offers: [...snapOffers.keys()],
        held: heldCandidates.slice(),
      };
    };
    let got, want;
    paintNow = Date.now();
    try { got = take(false); want = take(true); } finally { paintNow = 0; render(s); }
    const diffs = [];
    const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
    for (const k of ['reading', 'status', 'standing', 'panel', 'chips', 'labels', 'cards', 'chrome', 'mini', 'offers', 'held']) {
      if (!same(got[k], want[k])) diffs.push({ what: 'said differently: ' + k, got: got[k], want: want[k] });
    }
    // On screen: what an op draws — its box, and what it carries past the box
    // it was given (a stroke's width and halo, the words beside a mark or
    // above an artifact) — meets the canvas. Generous on purpose: a hand's
    // paint must draw everything this calls on screen.
    const vp = screenWorld(0);
    const carry = { ink: wpx(8) + 4, ghost: wpx(8) + 4, match: wpx(4), read: wpx(4), card: wpx(4), label: wpx(24), chrome: wpx(40), reading: wpx(24), maths: wpx(4) };
    const reach = (bx, op) => {
      const m = carry[op.kind] || wpx(8), words = op.text && (op.kind === 'reading' || op.kind === 'chrome' || op.kind === 'label') ? op.text.length * wpx(9) : 0;
      return { minX: bx.minX - m, minY: bx.minY - m, maxX: bx.maxX + m + words, maxY: bx.maxY + m };
    };
    const onScreen = (op) => op.moved || !op.box || boxMeets(reach(op.box, op), vp) || (op.clean && boxMeets(reach(op.clean, op), vp));
    const key = (op) => JSON.stringify(op);
    const wantKeys = new Set(want.ops.map(key)), gotKeys = new Set(got.ops.map(key));
    for (const op of got.ops) if (!wantKeys.has(key(op))) diffs.push({ what: 'drawn, and the whole-board read draws it otherwise or not at all', op: op });
    for (const op of want.ops) if (!gotKeys.has(key(op)) && onScreen(op)) diffs.push({ what: 'on screen, and not drawn', op: op });
    const count = (ops, kind) => ops.filter((op) => op.kind === kind).length;
    return {
      ok: diffs.length === 0, diffs: diffs, ops: got.ops.length, of: want.ops.length, marks: s.contentIds.length,
      // How much less a hand's paint stroked than the whole-board read, and that the minimap still shows everything.
      ink: { drawn: count(got.ops, 'ink'), of: count(want.ops, 'ink') }, minimap: { drawn: count(got.ops, 'mini'), of: count(want.ops, 'mini') },
    };
  }

// ===== field (the reader) =====
// Provides: the field's QUERY, pure — readFieldCommand (what Enter will do, as a named
//   command record), and the two matchers it stands on (verbFor, libraryMatch), plus
//   the prefix pattern (FIELD_PREFIXES), the sum (`= 24 ÷ 3`, read by readSum — DIRECTOR-PLAN-W2 M5)
//   notationWords (a notation's reading in the person's words, N1),
//   and typedWord (the word a typed text offers to name the selection with, or to label the
//   person's own ink with — V1-PLAN L2e), and
//   the words for another hand's marks a label will not go on (theirMarks, madeThese).
// Uses: NOTHING. This fragment names no closure variable, touches no DOM, and asks the
//   session nothing. Everything it needs arrives in a FieldContext record; everything it
//   decides leaves as a FieldReading record. That is the whole point of it
//   (DIRECTOR-REVIEW-2026-09-15, SEAM-1): 09-palette.js is now the adapter — it builds
//   the context, renders the rows, and runs the command. Because this fragment stands
//   alone it loads on its own in Node, which is how it is tested:
//     node --test Demos/surface/09-field.test.mjs
// A fragment of one closure: Demos/build-surface.mjs concatenates surface/*.js
// in name order inside `(function () { ... })();`. Shared state is the
// closure's; no imports, no exports, no build step beyond the concatenation.
//
// WHAT USED TO BE REACHED THROUGH THE CLOSURE, AND IS NOW A PARAMETER
//   session.getState().summon            → ctx.open, ctx.revising
//   paletteItems + coreItems(s)          → ctx.items (label/verbs/certain/why/disabled only)
//   agents                               → ctx.models (the joined models' names)
//   libraryEntries(session.getState())   → ctx.library
//   s.artifacts + definitionOf(s, id)    → ctx.definition
//   MM.parseBehaviour / MM.describeBehaviour / MM.wordOf → ctx.behaviour
//   targetOf(sum, text)                  → ctx.target()
// And what used to be produced BY the closure — noteUse, session.bless, session.behave,
// askModelsAbout, runAsk, runDraw, runPrompt, applyLibrary, offerModel, withWork,
// render, selectionMarks, MM.LOCAL_PARTICIPANT — is now named in the returned command
// and performed by the adapter. The reader decides; it no longer acts.

  /**
   * @typedef {Object} FieldItem  one offer, as the reader needs to see it
   * @property {string} key         unique among ctx.items; how a command names it again
   * @property {string} label       what the pill says
   * @property {string[]} [verbs]   the aliases that type to it
   * @property {boolean} [certain]  a reading of these marks (the top row), not an affordance
   * @property {string} [why]       the tooltip; the reader quotes it when the offer is disabled
   * @property {boolean} [disabled] offered, but not available on this selection
   * @property {boolean} [act]      an act Enter may take with nothing typed: an offer the row
   *                                 shows, or a reading whose taking acts rather than names (U1e)
   * @property {string} [enter]     what Enter does when this item leads, said in the line
   *                                 instead of "take it as the name" (W2: writing is read)
   * @property {*} [asks]           truthy when taking it asks a model: the line carries the dot
   * @property {string} [notation]  a reading of what the marks ARE as a diagram (a notation's id): a
   *                                 reading, but never a name — the line does not offer it as one (N1)
   *
   * @typedef {Object} FieldContext  everything the reader is allowed to know
   * @property {string} text          what has been typed, untrimmed
   * @property {boolean} open         a summon stands; with none there is nothing to read
   * @property {boolean} revising     the summon is ink over a live artifact
   * @property {FieldItem[]} items    every offer, ranked, the core verbs last
   * @property {string[]} models      the joined models, by name
   * @property {{id:string,name:string}[]} library  what the library holds
   * @property {{id:string,name:string}|null} definition  the definition in the loop, if one
   * @property {{mine:number,others:string[]}} [marks]
   *           the selection's ink: how many of its marks the person made, and who made each
   *           of the rest (a name per mark). A label goes on your own ink only; the reader
   *           says so before Enter. Absent means nothing is held to put a word on.
   * @property {{described:string,unparsed:string[],value:*}|null} behaviour
   *           what the verb table read in `text` at that definition; `value` is opaque here
   *           and travels back out in the command untouched
   * @property {function(): ('page'|'program')} target
   *           what a brief would build. A THUNK on purpose: reading the drawing's genre
   *           costs a pass over the marks, and most keystrokes settle on a verb, a name or
   *           a prefix long before the brief. Called at most once, and only on the branch
   *           that needs it.
   * @property {function(string): ({ok:true,words:string,result:string,also?:string}|{ok:false,reason:string})} [maths]
   *           what a sum typed after `=` comes to, read against the board's page by core
   *           (`evaluateTyped`): the words that would stand on the board and their result, or why
   *           not. A thunk too — the reader names nothing outside itself, and reads a sum only
   *           on the branch that needs one (M5).
   *
   * @typedef {Object} FieldCommand  what Enter will do, named rather than closed over
   * @property {'take'|'name'|'label'|'region'|'ask-what'|'ask'|'draw'|'build'|'library'|'behave'|'need-model'|'maths'} do
   *
   * @typedef {Object} FieldReading  the reader's whole answer
   * @property {string} kind        empty|default|name|label|what|ask|draw|brief|structure|verb|library|behaviour|blocked|page|run|program|new
   * @property {string} line        the sentence under the field: what Enter will do
   * @property {boolean} [quiet]    said, but not as a promise — Enter does nothing
   * @property {boolean} [model]    Enter asks a model: the line carries the dot
   * @property {FieldCommand|null} command
   */

  /** The acts a typed prefix names. */
  const FIELD_PREFIXES = /^(ask|draw|page|run|program|new|name|what|label|region)\s*:\s*([\s\S]*)$/i;
  /** The same acts typed bare, before their colon: a command half-typed, never a word to put on marks. */
  const PREFIX_WORDS = /^(ask|draw|page|run|program|new|name|what|label|region)$/i;
  /** A sum: `=` and what follows, spaced or not (`= 24 ÷ 3`, `=(39+6)/2`). */
  const SUM = /^=\s*([\s\S]*)$/;
  /** The longest word the row offers as a pill; a longer one is still taken by its prefix and Enter. */
  const WORD_MAX = 40;

  /**
   * Pure: who made the marks a label will not go on, in a few words. `others` holds one
   * name per mark, so the count is its length and each name is said once.
   * @param {string[]} others
   * @returns {{who:string,count:number}}
   */
  function makersOf(others) {
    const names = [];
    for (const n of others || []) if (names.indexOf(n) < 0) names.push(n);
    const who = names.length <= 1 ? (names[0] || 'another hand') : names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1];
    return { who: who, count: (others || []).length };
  }
  /** Pure: "the mark fern made", "the 2 marks fern and qwen3 made" — the marks a label will not go on. */
  function theirMarks(others) {
    const m = makersOf(others);
    return (m.count === 1 ? 'the mark ' : 'the ' + m.count + ' marks ') + m.who + ' made';
  }
  /** Pure: "fern made this mark", "fern made these 3 marks" — when none of the held marks is yours. */
  function madeThese(others) {
    const m = makersOf(others);
    return m.who + (m.count === 1 ? ' made this mark' : ' made these ' + m.count + ' marks');
  }

  /**
   * Pure: a notation's reading, said in the person's words (V1-PLAN §3 Reading, N1). Core says a
   * reading in one line (`describeNotation`: "a UML class diagram 0.49 — three classes, one
   * composition"); the field shows its short name and number, the tooltip its sentence, and the
   * panel *is* the two joined by a colon. A person says "a class diagram", never "UML".
   * @param {string} described  `MM.describeNotation(reading)`
   * @returns {{name:string, conf:string, label:string, said:string, is:string}}
   */
  function notationWords(described) {
    const cut = String(described || '').indexOf(' — ');
    const head = (cut < 0 ? String(described || '') : described.slice(0, cut)).replace(/^(an?) UML /, '$1 ');
    const said = cut < 0 ? '' : described.slice(cut + 3);
    const m = /^(.*\S)\s+(\d(?:\.\d+)?)$/.exec(head);
    const name = m ? m[1] : head, conf = m ? m[2] : '';
    return { name: name, conf: conf, label: conf ? name + ' ' + conf : name, said: said, is: said ? name + ': ' + said : name };
  }

  /**
   * Pure: every offer, visible or hidden, that the typed text names — by an alias or by
   * the start of its label.
   * @param {string} q
   * @param {FieldItem[]} items
   * @returns {FieldItem|null}
   */
  function verbFor(q, items) {
    const ql = (q || '').toLowerCase().trim();
    if (!ql) return null;
    const all = items || [];
    let hit = all.find((i) => (i.verbs || []).some((v) => v === ql));
    if (hit) return hit;
    hit = all.find((i) => (i.verbs || []).some((v) => v.startsWith(ql) && ql.length >= 2)) || all.find((i) => i.label.toLowerCase().startsWith(ql) && ql.length >= 2);
    return hit || null;
  }

  /**
   * Pure: the library entry a brief already answers, if any — by name, or by every word
   * of the name being in the brief.
   * @param {string} brief
   * @param {{id:string,name:string}[]} entries
   * @returns {{id:string,name:string}|null}
   */
  function libraryMatch(brief, entries) {
    const q = (brief || '').toLowerCase().trim();
    if (q.length < 2) return null;
    const words = q.split(/[^a-z0-9]+/).filter((w) => w.length > 2);
    for (const e of entries || []) {
      const name = e.name.toLowerCase();
      if (name === q) return e;
      const nw = name.split(/[^a-z0-9]+/).filter((w) => w.length > 2);
      if (nw.length && nw.every((w) => words.includes(w))) return e;
    }
    return null;
  }

  /**
   * Pure: one reader for the field. What was typed, and what stands, in; what Enter will
   * do, out. It reads in the order the hand expects to be understood — a prefix it spelled
   * out, then a verb this selection has, then a name the library knows, then words a
   * definition can be told, and only then the brief — so the cheap, certain readings win
   * over the one that asks a model.
   * @param {FieldContext} ctx
   * @returns {FieldReading}
   */
  function readFieldCommand(ctx) {
    const c = ctx || {};
    const text = (c.text || '').trim();
    const items = c.items || [];
    const models = c.models || [];
    const who = models.join(', ');
    const revising = !!c.revising;

    if (!c.open) return { kind: 'empty', line: '', command: null };

    // Nothing typed: Enter takes the likely act — the first act in the ranked order, which is
    // the top the context holds steady (U1e; V1-PLAN §2.2) — never a reading as a name. A
    // reading is taken as the name by tapping it, or by `name:`. It used to be Enter's: the
    // default act on a drawing was to rename it after a category (audit row 4).
    if (!text) {
      const act = items.find((i) => i.act && !i.disabled);
      if (act) {
        // A reading whose taking acts says what it does (writing: read it, W2; as text, here).
        const line = '↵ ' + (act.enter || (act.certain ? act.label + ' — ' + String(act.why || '').split(' — ').pop() : act.label));
        const out = { kind: 'default', line: line, command: take(act) };
        if (act.asks) out.model = true;
        return out;
      }
      // A notation's reading (a flowchart, a class diagram) is what the marks are, not a name to give them:
      // with only such readings the line says a tap uses one, not that it names anything (N1).
      if (items.some((i) => i.certain && !i.notation)) return { kind: 'empty', line: '↵ nothing yet — tap a reading to take it as the name', quiet: true, command: null };
      if (items.some((i) => i.certain)) return { kind: 'empty', line: '↵ nothing yet — tap a reading to use it', quiet: true, command: null };
      return { kind: 'empty', line: '', quiet: true, command: null };
    }

    // A sum: `=` says the rest is arithmetic, read by core against the page — no model, and
    // nothing to guess. The line says the result before Enter; Enter stands it on the board.
    const sum = SUM.exec(text);
    if (sum) return readSum(sum[1].trim(), c);

    // A prefix spells the act out, so nothing has to be guessed.
    const m = FIELD_PREFIXES.exec(text);
    if (m) {
      const act = m[1].toLowerCase(), rest = m[2].trim();
      if (act === 'name') {
        return rest
          ? { kind: 'name', line: '↵ name it “' + rest + '”', command: { do: 'name', name: rest } }
          : { kind: 'name', line: '↵ name it… (type the name)', quiet: true, command: null };
      }
      // A word on your own ink (V1-PLAN L2e). Not a name: it blesses nothing, makes
      // nothing and never asks a model. It goes on each held mark the person made; the
      // line says before Enter which marks it will not go on, and whose they are.
      if (act === 'label') return readLabel(rest, c.marks);
      // A named place on the board (PLAN-IPAD-NOTES I5): a region made round what is held, or of the rectangle that holds the rest. Makes nothing else; asks no model.
      if (act === 'region') return readRegion(rest, c.marks);
      if (act === 'what') return models.length ? { kind: 'what', line: '↵ ask ' + who + ' what this is', command: { do: 'ask-what' } } : needsModel('reading the group');
      if (!models.length) return needsModel(act === 'ask' ? 'a question' : act === 'draw' ? 'drawing' : 'building');
      if (!rest) return { kind: act, line: '↵ ' + act + ':… (say what)', quiet: true, command: null };
      if (act === 'ask') return { kind: 'ask', line: '↵ ask ' + who, command: { do: 'ask', text: rest } };
      if (act === 'draw') return { kind: 'draw', line: '↵ ' + who + ' draws', command: { do: 'draw', text: rest } };
      if (act === 'page') return { kind: 'brief', line: '↵ ' + who + ' builds a page', command: build(text, revising) };
      if (act === 'new') return { kind: 'brief', line: '↵ ' + who + ' writes it fresh', command: build(text, revising) };
      return { kind: 'brief', line: '↵ ' + who + ' writes a program', command: build(text, revising) };
    }

    // A verb this selection has.
    const verb = verbFor(text, items);
    if (verb && !verb.disabled) return { kind: 'verb', line: '↵ ' + verb.label, command: take(verb) };
    if (verb && verb.disabled) return { kind: 'verb', line: '↵ ' + verb.label + ' — ' + (verb.why || ''), quiet: true, command: null };

    // A name the library knows: the same program, here, and no model asked.
    const entry = !revising ? libraryMatch(text, c.library) : null;
    if (entry) return { kind: 'library', line: '↵ ' + entry.name + ' — from the library, no model asked', command: { do: 'library', id: entry.id } };

    // Words a definition can be told, by the verb table.
    const def = c.definition, beh = c.behaviour;
    if (def && beh && beh.value) {
      const tail = beh.unparsed && beh.unparsed.length
        ? (models.length ? ' · ' + who + ' reads “' + beh.unparsed.join(', ') + '”' : ' · could not read “' + beh.unparsed.join(', ') + '”')
        : '';
      return {
        kind: 'behaviour', line: '↵ ' + def.name + ': ' + beh.described + tail,
        command: { do: 'behave', definitionId: def.id, behaviour: beh.value, words: text, ask: !!(beh.unparsed && beh.unparsed.length && models.length) },
      };
    }

    // The brief. Tier 1 builds the structure of a page or a diagram at once, with no
    // words; tier 2 — a model — writes the words, and a program.
    if (revising) return models.length ? { kind: 'brief', line: '↵ ' + who + ' changes what the loop covers', command: build(text, true) } : needsModel('changing a page');
    if ((c.target ? c.target() : 'program') === 'page') {
      return models.length
        ? { kind: 'brief', line: '↵ the structure at once (tier 1), then ' + who + ' writes the words', command: build(text, false) }
        : { kind: 'structure', line: '↵ the structure, at once (tier 1) — join a model for the words', command: build(text, false) };
    }
    if (!models.length) return needsModel('writing a program');
    return { kind: 'brief', line: '↵ ' + who + ' writes a program', command: build(text, false) };

    function take(item) { return { do: 'take', key: item.key, index: items.indexOf(item) }; }
    function build(t, rev) { return { do: 'build', text: t, revising: !!rev }; }
    function needsModel(what) {
      return { kind: 'blocked', line: '↵ ' + what + ' needs a model — controls › models', quiet: true, command: { do: 'need-model', what: what } };
    }
  }

  /**
   * Pure: `= 24 ÷ 3`, read by the thunk the adapter gives (core's `evaluateTyped`). Says the
   * result before Enter and what Enter does with it — the words, result and all, stand on the
   * board as text — or, quietly, why it cannot: nothing typed yet, or a sum core could not read.
   * The smallest honest act: a text is words the hand can edit, and it is a line of the page,
   * so its own check follows the measurements it names.
   * @param {string} body
   * @param {FieldContext} c
   * @returns {FieldReading}
   */
  function readSum(body, c) {
    if (!body) return { kind: 'maths', line: '↵ = … type a sum, like = 24 ÷ 3', quiet: true, command: null };
    if (typeof c.maths !== 'function') return { kind: 'maths', line: '↵ = … the maths is not here', quiet: true, command: null };
    const r = c.maths(body);
    if (!r || !r.ok) return { kind: 'maths', line: '↵ = ' + ((r && r.reason) || 'cannot read that as a sum'), quiet: true, command: null };
    return {
      kind: 'maths',
      line: '↵ ' + r.words + ' — put it on the board as text' + (r.also ? ' · or ' + r.also : ''),
      command: { do: 'maths', words: r.words },
    };
  }

  /**
   * Pure: `label: word`, read against the held ink. Three answers, each said before Enter:
   * the word on each of your marks; on yours and not on another hand's (named); or on
   * none, said quietly — and Enter still runs, so the adapter says the refusal in the
   * status line rather than leaving it to a line the hand may not have read.
   * @param {string} word
   * @param {{mine:number,others:string[]}} [marks]
   * @returns {FieldReading}
   */
  function readLabel(word, marks) {
    const ink = marks || {};
    const mine = ink.mine || 0, others = ink.others || [];
    if (!word) return { kind: 'label', line: '↵ label it… (type the word)', quiet: true, command: null };
    if (!mine && !others.length) return { kind: 'label', line: '↵ label… — nothing held to put it on', quiet: true, command: null };
    const command = { do: 'label', text: word };
    if (!mine) return { kind: 'label', quiet: true, command: command, line: '↵ no label — ' + madeThese(others) + '; a label goes on your own ink' };
    const tail = others.length
      ? ' — on ' + (mine === 1 ? 'yours' : 'your ' + mine) + ', not ' + theirMarks(others)
      : mine > 1 ? ' — on each of your ' + mine + ' marks' : '';
    return { kind: 'label', line: '↵ label it “' + word + '”' + tail, command: command };
  }

  /**
   * Pure: `region: Monday`, read against what is held: a named rectangle that holds whatever stands inside
   * it. Said before Enter: what will be made, or quietly why not.
   * @param {string} name
   * @param {{mine:number,others:string[]}} [marks]
   * @returns {FieldReading}
   */
  function readRegion(name, marks) {
    const ink = marks || {};
    const held = (ink.mine || 0) + (ink.others || []).length;
    if (!name) return { kind: 'region', line: '↵ region: … type the place\'s name', quiet: true, command: null };
    if (!held) return { kind: 'region', line: '↵ region… — nothing held to stand it round', quiet: true, command: null };
    return { kind: 'region', line: '↵ make a region “' + name + '” — round what is held; what stands inside goes with it', command: { do: 'region', name: name } };
  }

  /**
   * Pure: the word a typed text offers to put on the selection — to NAME it (one thing, a
   * definition) or to LABEL the person's own ink with it (a word on each mark; nothing
   * made) — or null (V1-PLAN L2e). The row shows those two offers side by side; this only
   * decides whether there is a word, and which. Enter is still the reader's to decide.
   *   `name: w` / `label: w`  → w: the hand said what the word is for;
   *   a bare word or two       → the text, unless it is a verb, a library entry, words a
   *                              definition can be told, or a prefix typed before its colon;
   *   anything else            → null — a brief, a question, a drawing.
   * @param {FieldContext} ctx
   * @returns {{word:string, act:('name'|'label'|null)}|null}
   */
  function typedWord(ctx) {
    const c = ctx || {};
    const text = (c.text || '').trim();
    if (!c.open || c.revising || !text) return null;
    if (SUM.test(text)) return null; // a sum is arithmetic, never a word
    const ink = c.marks || {};
    if (!((ink.mine || 0) + (ink.others || []).length)) return null;
    const m = FIELD_PREFIXES.exec(text);
    if (m) {
      const act = m[1].toLowerCase(), rest = m[2].trim();
      if ((act !== 'name' && act !== 'label') || !rest || rest.length > WORD_MAX || /\n/.test(rest)) return null;
      return { word: rest, act: act };
    }
    if (text.length > WORD_MAX || /[:\n]/.test(text) || text.split(/\s+/).length > 2 || PREFIX_WORDS.test(text)) return null;
    if (verbFor(text, c.items)) return null;
    if (libraryMatch(text, c.library)) return null;
    if (c.definition && c.behaviour && c.behaviour.value) return null;
    return { word: text, act: null };
  }

// ===== palette =====
// Provides: the field — one text input at the pen tip, its geometry (fieldBox/placeField), and the
//   ADAPTER around the reader (fieldContext → readFieldCommand → runFieldCommand, exposed as readField);
//   the ADAPTER around core's tools (V1-PLAN B1): conversionsFor — what this is (readings, read here) and
//   what it affords (MM.offersFor over the scope fieldScope gathers, toolHost the surface's facts), ranked
//   by MM.rank (V1-PLAN §2.2, B2) with this device's uses, globally and per kind of context (usesHere), in
//   the context beside the marks (contextFor, paletteContext — kept by the log) and held steady per
//   context (steadyTops, runtime; afforded says what the top is among); takeOffer — the tool's act
//   (stamped with its id) and what only the surface can do for it (HOST_ACTS, TOOL_ACTS); the core
//   verbs (name, copy, paste, erase;
//   copyMarks/pasteClip/duplicateMarks, the clip); the label act's words (labelMarks, labelSentence); the
//   prompts (runPrompt → a page or a program, runAsk, runDraw); the library (libraryEntries/reuseEntry/
//   applyLibrary, targetOf); renderSummon/refreshPalette/paintField.
// Uses: core (hand, lastPen), ui, field (readFieldCommand, verbFor, libraryMatch, typedWord — pure,
//   09-field.js), view (usableViewport, viewportRect), models (agents, withWork, cancelReading,
//   askModelsAbout, offerModel), seatpane (writers, readers, deciderHost, askDecider — who is asked, by seat), snap (snapMode), render (nameOfParticipant, logKey, paintReference),
//   artifacts (flipped), frames, packs (packShort, packSaid — how a match says its pack),
//   clocks (definitionOf), handwriting (isWriting, isRead, readLine, readOne), images (svgOf), text
//   (wordToText, lineToText, foldIntoText, textNear, beginTextEdit), input (say, flash, downType — which
//   hand opened the field), hand (handOfPointer).
// A fragment of one closure: Demos/build-surface.mjs concatenates surface/*.js
// in name order inside `(function () { ... })();`. Shared state is the
// closure's; no imports, no exports, no build step beyond the concatenation.

  // ===== The field (SURFACE-v9-PLAN §6) ======================================
  //
  // One text input, at the pen tip. What is typed is read as it is typed — a
  // verb the selection has, a name the library knows, words the verb table
  // reads, a prefix, or else the brief — and the reading is shown under the
  // field before Enter is pressed. Under it, three rows in a fixed order:
  // the core verbs (the same four, in the same slots, every time), what this
  // IS (readings with their numbers; tapping one takes it as the name), and
  // what it AFFORDS (what the reading lets the engine do, ranked). The
  // palette never decides what the marks mean; it renders what the engine
  // read. Nothing here asks a model except the acts that say so.
  let shownSummonId = null;
  let paletteItems = [];     // every offer for the open selection, ranked
  let paletteScope = null;   // the scope the open field's offers were read from (V1-PLAN B1)
  let paletteIndex = -1;     // the pill the arrows chose among the visible ones; -1 is none
  let paletteNavigated = false;
  let clip = null;           // what Copy held: { strokes: [{ points }], bounds, from }
  const MAX_AFFORD = 5;      // pills shown in the affordance column before "+N more"

  // ===== What the field holds: readings, and what the tools afford (V1-PLAN B1) =====
  // What this IS is read here: a name you gave a shape like it, the words you
  // wrote, what a model read it as, the concepts it reads as — each a reading
  // with its number, and tapping one takes it. What it AFFORDS is every
  // registered tool's offer for this scope (`MM.offersFor`, core's `tools/`):
  // a new tool is a file and a line in core, and it is offered here with no
  // change to this file. Both are ranked by one pure function in core
  // (`MM.rankOffers`), with this device's use counts handed in. This file is
  // the adapter: it gathers the scope, maps offers to pills, and performs
  // what only the surface can — ask a model, open the editor, flip a text.

  /** What only this surface knows, for the tools: the snap preference, the models, what is read or flipped, where texts stand. */
  function toolHost() {
    return {
      snap: snapMode,
      // `sees`: who READS, by seat (I7) — a model that sees but sits elsewhere does not answer a read; `decider`: the decision model seated, if one is (*Which is it?*).
      models: agents.map((a) => ({ name: a.name, sees: readers().includes(a) })),
      decider: deciderHost(),
      isRead: (id) => { const n = session.getState().nodes.get(id); return !!n && isRead(n); },
      // The board's lines of writing and how many are unread (I8): *Read the board* stands only where there is some.
      writing: () => boardWriting(),
      isFlipped: (id) => flipped.has(id),
      nameOf: nameOfParticipant,
      textNear: (b) => textNear(session.getState(), b),
    };
  }

  /** The scope the field's tools read: the open summon, what is typed, and this surface's facts. */
  function fieldScope(s, text, word) {
    return MM.toolScope(session, { summon: s.summon, text: text || '', word: word || null, host: toolHost() });
  }

  /** A reading, for the top row: what it stands on ranks it, exactly as it ranks an offer. */
  function readingItem(o) {
    return Object.assign({ certain: true, tier: 1, group: o.grounds.on, groupConf: o.grounds.confidence, groupWhy: o.grounds.why, base: MM.baseOn(o.grounds) }, o);
  }

  /** An offer as a pill: its reason the tooltip, what it stands on after that, a dot when it asks a model. */
  function offerItem(o) {
    const item = {
      key: o.key, label: o.label, why: o.reason, verbs: o.verbs || [], tier: o.asks === 'model' ? 2 : 1,
      group: o.hidden ? 'hidden' : o.grounds ? o.grounds.on : 'always',
      groupConf: o.grounds ? o.grounds.confidence : 0, groupWhy: o.grounds ? o.grounds.why : '',
      base: o.base, grounds: o.grounds, asks: o.asks, tool: o.tool, offer: o,
      run: () => takeOffer(o),
    };
    if (o.lead) item.certain = true;
    // An act Enter may take with nothing typed (U1e): what the row shows — never a typed-only offer.
    if (!o.hidden) item.act = true;
    if (o.name !== undefined) item.name = o.name;
    if (o.line !== undefined) item.line = o.line;
    return item;
  }

  // ===== What the marks are as a diagram: the notations' readings (V1-PLAN §3 Reading, N1) =====
  // Each notation that reads the held marks above its floor — a flowchart, a class diagram, a sequence
  // diagram, a state diagram, an ER diagram, a mind map — plural and ranked, read ONCE while the log stands
  // (R4c: `logKey`, so an undo leaves no stale reading) and shared by the field's row and the panel. A
  // reading is what the marks ARE, never a name for a definition: Enter does not take it (09-field.js), and
  // a tap on the one Mermaid can be written from is Make it Mermaid, in that notation.
  let notationKept = { key: null, read: null };
  let notationReadCount = 0; // reads that were not the kept one, for a test
  function notationsHeld(marks) {
    const key = logKey() + '|' + marks.join(',');
    if (!paintReference && notationKept.key === key) return notationKept.read;
    const st = session.getState();
    // A drawing is two marks or more and no artifact: a page or a text is not read as one (the Mermaid tool's own rule).
    const noDrawing = marks.length < 2 || marks.some((id) => st.artifacts.includes(id));
    if (!noDrawing) notationReadCount++;
    const read = noDrawing ? [] : MM.notationsOf(st, marks).filter((r) => r.confidence >= MM.NOTATION_FLOOR);
    if (!paintReference) notationKept = { key: key, read: read };
    return read;
  }

  /** A notation's reading as a row of the field: its short name and number, the sentence its tooltip, a tap that writes its Mermaid where it can and otherwise says it. */
  function notationItem(r, offers) {
    const w = notationWords(MM.describeNotation(r));
    const mer = offers.find((i) => i.key === 'mermaid');
    const writes = !!mer && !!mer.offer.data && mer.offer.data.notation === r.notation;
    return readingItem({
      key: 'notation:' + r.notation, notation: r.notation,
      grounds: { on: 'notation', confidence: r.confidence, why: r.reason },
      label: w.label,
      why: w.label + (w.said ? ' — ' + w.said : '') + ' — ' + (writes ? 'tap to write it as Mermaid text beside it; the drawing stays' : 'tap to say it in the status line'),
      run: () => { if (writes) takeOffer(mer.offer); else say(w.label + (w.said ? ' — ' + w.said : '')); },
    });
  }

  function conversionsFor(s) {
    const sum = s.summon;
    const scope = paletteScope = fieldScope(s, '', null);
    const reading = scope.reading;
    const marks = scope.marks;
    const known = [], lined = [], worded = [], proposed = [], conceived = [];

    // --- What this IS: readings with their numbers. Tapping one takes it as the name. ---
    for (const sug of sum.suggestions) {
      if (sug.kind !== 'match') continue;
      // A library pack's definition says its pack (V1-PLAN §2.3, B3): known because this board uses it, not because you named it.
      const from = sug.pack ? packSaid(sug.pack) : null;
      known.push(readingItem({
        key: 'sug:' + sug.id, grounds: { on: 'known', confidence: sug.score || 1, why: from ? 'from ' + from + ', which this board uses' : 'you named this shape before' },
        label: sug.label + ' ' + (sug.score || 1).toFixed(2) + (sug.pack ? ' · ' + packShort(sug.pack) : ''), name: sug.label,
        why: (sug.reasoning || 'like the one you named') + (from ? ' — from ' + from : '') + ' — take it as another ' + sug.label,
        run: () => {
          const made = session.bless({ summonId: sum.id, suggestionId: sug.id, at: Date.now() });
          // A definition that holds a program hands it to its instance: a
          // drawing that matches the library IS a reuse, with no words typed.
          const entry = made && libraryEntries(session.getState()).find((e) => e.id === sug.artifactId);
          if (entry) reuseEntry(made, entry);
        },
      }));
    }
    // A line of writing — words gathered by nearness (v10 D3) — is one thing to
    // name and one thing to make text, once every word on it has been read.
    const line = MM.writingLine(scope);
    // Writing alone, taken, becomes TEXT where it is — fitted to the ink, the
    // ink underneath, editable — never a definition (v10 F8). Writing beside
    // a shape names the shape, as before.
    const allWriting = marks.length > 0 && marks.every((id) => { const n = s.nodes.get(id); return n && (isWriting(n) || MM.isWord(n)); });
    if (line.read) {
      lined.push(readingItem({
        key: 'line:' + line.ids.join(','), grounds: { on: 'written', confidence: line.confidence, why: 'read from your handwriting by ' + nameOfParticipant(line.said[0].source) },
        label: '“' + line.text + '” ' + line.confidence.toFixed(2), name: line.text,
        why: allWriting ? 'the line you wrote — take it as text, here; the ink stays underneath' : 'the line you wrote — ' + MM.NAMING_IS + ' — take it as the name',
        act: allWriting, // text where it is is an act; a name is a tap (U1e)
        run: () => { if (allWriting) writingToText(sum, line.text); else session.bless({ summonId: sum.id, name: line.text, at: Date.now() }); },
      }));
    }
    // What the writing says: write a word beside a shape and it is the shape's name.
    {
      const labels = reading.roles.filter((r) => r.role === 'label' && sum.enclosedIds.includes(r.id) && !(line.read && line.ids.includes(r.id)));
      const said = labels.map((r) => ({ r, t: MM.transcriptsOf(s.nodes.get(r.id))[0] })).filter((x) => x.t);
      for (const { r, t } of said) {
        worded.push(readingItem({
          key: 'said:' + r.id, grounds: { on: 'written', confidence: t.confidence, why: 'read from your handwriting by ' + nameOfParticipant(t.source) },
          label: '“' + t.text + '” ' + t.confidence.toFixed(2), name: t.text,
          why: r.targets.length ? 'the word beside it — ' + MM.NAMING_IS + ' — take it as the name' : allWriting ? 'the word you wrote — take it as text, here; the ink stays underneath' : 'the word you wrote — ' + MM.NAMING_IS + ' — take it as the name',
          act: allWriting && !r.targets.length,
          run: () => { if (allWriting && !r.targets.length) writingToText(sum, t.text); else session.bless({ summonId: sum.id, name: t.text, at: Date.now() }); },
        }));
      }
    }
    // What another voice read this group as — a model, or a hand such as Claude's (a tier 0 voice too, so it is told by its author, not its tier: F1) — held, attributed, and an offer to name it.
    {
      const seen = new Set();
      const heard = [];
      for (const id of sum.enclosedIds) {
        const n = s.nodes.get(id);
        if (!n) continue;
        for (const r of MM.interpretationsOf(n, s.nodes)) {
          if (!MM.isHeardReading(r)) continue;
          const key = r.label.toLowerCase();
          if (seen.has(key)) continue;
          seen.add(key);
          heard.push(r);
        }
      }
      // In words, by a name in words (J5): "state transformation 0.82 · GLM 5.3 Flash" — taking it names the thing by its label.
      heard.sort((a, b) => b.weight - a.weight).slice(0, 3).forEach((r) => {
        const who = modelWords(r.sourceName);
        proposed.push(readingItem({
          key: 'proposed:' + r.label, grounds: { on: 'proposed', confidence: r.weight, why: 'read this way by ' + who },
          label: readingWords(r.label) + ' ' + r.weight.toFixed(2) + ' · ' + who, name: r.label,
          why: who + (r.reasoning ? ' — ' + r.reasoning.slice(0, 80) : '') + ' — take it as the name',
          run: () => session.bless({ summonId: sum.id, name: r.label, at: Date.now() }),
        }));
      });
    }
    // The concepts these marks read as (Tier 0): a row, a frame, a flow — each
    // a reading with a number; what each lets the engine do is its tools' offer.
    reading.concepts.slice(0, 3).forEach((concept) => {
      conceived.push(readingItem({
        key: 'concept:' + concept.concept, grounds: { on: 'concept', confidence: concept.confidence, why: concept.reasoning },
        label: concept.concept + ' ' + concept.confidence.toFixed(2), name: concept.concept,
        why: concept.reasoning + ' — take it as the name',
        run: () => session.bless({ summonId: sum.id, name: concept.concept, at: Date.now() }),
      }));
    });

    // --- What it AFFORDS: every tool's offer for this scope, in the registry's order. ---
    const offers = MM.offersFor(scope).map(offerItem);
    // What the marks are as a diagram: each notation above the floor, ranked with the rest of the readings (N1).
    const notated = notationsHeld(marks).map((r) => notationItem(r, offers));
    // An act as particular to these marks as a reading (Fold “…” into the text)
    // stands with the readings, where it always stood: after the line it takes.
    const lead = offers.filter((i) => i.certain);
    // Writing reads when it is writing (PLAN-USER-SURFACE W2): held writing that nobody has
    // read is ONE option — its reading, taken by reading it (the read tool's own act, so a
    // model that sees, Claude's seat, or the ask kept for one), never by naming it "writing".
    // Read the writing and What is this? stay typeable and leave the row. Once the words land
    // the reading names again, and the words lead, as they always did.
    const readOffer = allWriting ? offers.find((i) => (i.key === 'read' || i.key === 'read-lines') && i.group !== 'hidden') : null;
    if (readOffer) {
      const at = conceived.findIndex((i) => i.key === 'concept:writing');
      const concept = at >= 0 ? conceived[at] : null;
      const conf = concept ? concept.groupConf : writingConfidence(s, marks);
      const need = needFor('read');
      const reads = readingItem({
        key: concept ? concept.key : 'writing', grounds: { on: 'concept', confidence: conf, why: concept ? concept.groupWhy : 'writing, unread' },
        label: 'writing' + (conf ? ' ' + conf.toFixed(2) : ''), name: 'writing',
        why: readOffer.why + ' — read it',
        tier: 2, asks: 'model', tool: 'read', verbs: ['writing'], act: true,
        enter: (readOffer.key === 'read-lines' ? 'read these' : 'read it') + (need ? ' — ' + need + ': it is kept, and runs when one joins' : ''),
        run: () => readOffer.run(),
      });
      if (concept) conceived.splice(at, 1, reads); else conceived.unshift(reads);
      for (const i of offers) if (i.key === 'read' || i.key === 'read-lines' || i.key === 'what') i.group = 'hidden';
    }
    const items = known.concat(lined, lead, worded, proposed, notated, conceived, offers.filter((i) => !i.certain));
    // A pill that asks a model none here can answer says what it needs, inline, while it is pointed at (J5).
    for (const it of items) {
      if (it.asks !== 'model' || it.line) continue;
      const need = needFor(it.tool);
      if (need) it.line = '↵ ' + it.label + ' — ' + need + ': it is kept, and runs when one joins';
    }
    return items;
  }

  /** How surely held marks read as writing, when no concept says: the shape rung's `text` reading, the least sure of them. */
  function writingConfidence(s, ids) {
    let least = null;
    for (const id of ids) {
      const n = s.nodes.get(id);
      const r = n && MM.interpretationsOf(n, s.nodes).find((x) => MM.isShapeRungReading(x) && x.label === 'text');
      if (!r) return 0;
      least = least === null ? r.weight : Math.min(least, r.weight);
    }
    return least || 0;
  }

  // ===== Taking an offer: the tool writes, the surface does the rest =========
  // Core's `takeOffer` stamps what the tool writes with its id; what only this
  // surface can do — ask a model, open the editor, flip a text, hold a clip,
  // put words in a text's places — it does here, inside the same stamp, so
  // whatever that writes carries the tool's id too. Then it says what happened.
  const HOST_ACTS = {
    // Writing becomes text where it stands: fitted to the ink when it was all writing, else a file of words.
    text: (o, scope) => { const d = o.data; if (d.act === 'writing') writingToText(scope.summon, d.text); else if (d.act === 'line') lineToText(d.ids, d.text); else wordToText(d.ids[0]); },
    fold: (o) => { const d = o.data; foldIntoText(d.text, d.words, d.ids); say('folded “' + d.words + '” into the text'); },
    'edit-text': (o) => beginTextEdit(o.data.id),
    flip: (o) => { const id = o.data.id; if (flipped.has(id)) flipped.delete(id); else flipped.add(id); render(session.getState()); refreshPalette(); },
    read: (o) => {
      const d = o.data, s = session.getState();
      // No model that can see: which joined ones cannot and why, said once, the read kept for one that can (J5) — no pane.
      if (!readers().length) { keepRead(d); return; }
      let any = false;
      if (d.line.length) any = readLine(d.line, true) || any;
      d.single.forEach((id) => { any = readOne(s.nodes.get(id), true) || any; });
      if (!any) say('nothing there to read — the marks held have no ink an image can be made of');
    },
    // Reading my notes (I8, 06-handwriting.js): every line of the marks held, or of the board, in one batch; a picture's text beside it.
    'read-lines': (o) => { readLines(o.data.ids.slice(), { force: !!o.data.force }); },
    'read-board': (o) => { readLines(boardWritingIds(), { force: !!o.data.force }); },
    'read-picture': (o) => { readPictureFrom(o.data.artifact, o.data.asset, o.data.name); },
    what: (o) => askModelsAbout(o.data.ids.slice()),
    // *Which is it?* asks the decider — only by this tap (I7; 04-seatpane.js), never on a hold.
    which: (o) => askDecider(o.data),
    // The maths tool's acts (M5): the sizes said and left showing beside their figure, the drawing printed at its real size.
    'maths-show': (o) => mathsShow(o.data),
    'maths-print': () => mathsPrint(),
    duplicate: (o, scope) => duplicateMarks(scope.summon, o.data.ids),
    // A Mermaid text drawn as ink, at this zoom and beside everything (25-mermaid.js).
    'mermaid-draw': (o) => drawMermaidFrom(o.data.artifact),
    // A held picture traced into ink over itself (18-images.js): its pixels are read again from the asset store, so it lands a moment after the tap.
    trace: (o) => { traceFrom(o.data.artifact, o.data.asset); },
    'behave-model': (o) => { const d = o.data; writers().forEach((a) => withWork('behave:' + agentKey(a) + ':' + d.nodeId, [d.nodeId], modelWords(a) + ' · reading the words', a.behave({ nodeId: d.nodeId, words: d.words, at: Date.now() })).then(() => render(session.getState()))); },
  };
  /** What the surface does around a tool's act: before it (the field rebuilt from what it leaves), and after (what to say). */
  const TOOL_ACTS = {
    // The summon stays open; the refused offer is gone from it.
    correct: { after: () => refreshPalette() },
    // The field stays open: a button click never closes it (the hand chains
    // commands — line up, then match sizes, then name).
    tidy: { after: (o, scope, t) => { flash((t.detail.mode === 'tidy' ? 'lined up ' : 'matched ') + t.detail.count + (t.detail.mode === 'tidy' ? ' marks' : ' sizes')); refreshPalette(); } },
    control: { after: (o, scope, t) => { if (t.made) flash('a slider — drag the knob to set it'); } },
    // Drawing them clean leaves the summon open, and the next offer is taken from the cleaned marks.
    clean: { before: () => { shownSummonId = null; }, after: (o, scope, t) => { if (t.detail.ids.length) flash('drew ' + t.detail.ids.length + ' clean' + (t.detail.summary ? ' — ' + t.detail.summary : '')); } },
    graph3d: { after: (o, scope, t) => say(!t.made ? 'could not hold that group' : t.detail.ok ? 'in 3D (tier 1): ' + t.detail.reasoning : 'could not stand it in 3D: ' + t.detail.error) },
    frames: { after: (o, scope, t) => { if (o.data.act !== 'frame' || !t.made) return; const st = session.getState(); flash('framed ' + t.detail.members + ' — ' + MM.describeFrame(MM.frameOfNode(st.nodes.get(t.made)), st.nodes)); } },
    // The drawing said as Mermaid stands beside it: say so, remember which marks it was written from, and keep the field.
    mermaid: { after: (o, scope, t) => { if (!t.made) { say(t.detail.error); return; } mermaidMadeFrom.set(t.made, scope.marks.slice()); flash('the drawing as Mermaid, beside it — ' + t.detail.reading + '; Draw it puts it back as marks'); refreshPalette(); } },
    // A rectangle taken as a region: said, with what it holds (12-regions.js).
    region: { after: (o, scope, t) => { regionMadeSaid(t.detail); } },
    label: { after: (o, scope, t) => { const d = t.detail; if (d.done.length || d.saying.length || d.refused.length) say(labelSentence(String(o.data.word).trim(), d.done, d.saying, d.refused)); } },
  };

  /** Take an offer: the tool's act, stamped with its id, and whatever only this surface can do for it. */
  function takeOffer(o) {
    const f = fieldInput();
    // What is typed as the pill is taken: `frame: rig` names the frame.
    const scope = Object.assign({}, paletteScope, { text: f ? f.value.trim() : '' });
    const acts = TOOL_ACTS[o.tool] || {};
    if (acts.before) acts.before(o, scope);
    session.withTool(o.tool, () => {
      const taken = MM.takeOffer(o, scope, session, Date.now());
      if (taken.host && HOST_ACTS[taken.host]) HOST_ACTS[taken.host](o, scope, taken);
      if (acts.after) acts.after(o, scope, taken);
    }, o.key);
  }

  // A tool registered or unregistered changes what the field offers with no
  // change to the log (R4c keys what a paint derives by the log): the
  // registry says so, and an open field offers again.
  MM.onToolsChange(() => refreshPalette());

  // ===== Ranking: the reading first, then learned use, then what is beside ===
  // The order itself is core's (`MM.rank`, context/rank.ts — B1's
  // `rankOffers` with the context applied): pure, and asked in Node. What this
  // surface keeps and hands in is the device's: learned use, globally and per
  // kind of context (V1-PLAN §2.2 rule 4), and the top each context led with a
  // moment ago (rule 3) — runtime, never the log.
  const USES_KEY = 'mm-palette-uses';
  const USES_HERE_KEY = 'mm-palette-uses-here';
  const uses = store.get(USES_KEY) || {};
  /** Learned use per kind of context: { 'notation:flowchart': { snap: 3 }, 'concept:row': { … } }. */
  const usesHere = store.get(USES_HERE_KEY) || {};
  /** The top offer each context led with, by the context's key and the board's generation: { key, at }. */
  const steadyTops = new Map();
  /** The context the open field was ranked in (V1-PLAN §2.2); NO_CONTEXT with nothing beside it. */
  let paletteContext = MM.NO_CONTEXT;

  /** What the steady top is among: the affordances the row shows, never a reading or a typed-only offer. */
  const afforded = (i) => !i.certain && i.group !== 'hidden';

  /**
   * What stands beside some marks (`MM.contextAt`): kept while the log stands
   * (R4c — `logKey`), so an undo can never leave a stale lift behind.
   */
  let contextKept = { key: null, ctx: null };
  function contextFor(ids) {
    const key = logKey() + '|' + ids.join(',');
    if (paintReference) return MM.contextAt(session, ids);
    if (contextKept.key !== key) contextKept = { key: key, ctx: MM.contextAt(session, ids) };
    return contextKept.ctx;
  }

  /**
   * The field's order: `MM.rank` with this device's use and the context, and
   * then the steady top — within one context the offer that led a moment ago
   * keeps the lead until another beats it by the margin. Far from any context
   * there is no key, nothing is held, and the order is B1's.
   */
  function rankItems(items, ctx) {
    const c = ctx || MM.NO_CONTEXT;
    const ranked = MM.rank(items, c, { uses: uses, usesHere: c.kind ? usesHere[c.kind] : undefined });
    if (!c.key) return ranked;
    const now = Date.now();
    const memo = c.key + '#' + session.getState().generation; // a board replaced is a new context, whatever its ids
    const steady = MM.steadyTop(ranked, steadyTops.get(memo), { eligible: afforded, now: now });
    const top = MM.topOf(steady, afforded);
    for (const [k, v] of steadyTops) if (now - v.at > MM.STEADY_MS) steadyTops.delete(k);
    if (top) steadyTops.set(memo, { key: top.key, at: now });
    return steady;
  }
  function noteUse(item) {
    uses[item.key] = (uses[item.key] || 0) + 1;
    store.set(USES_KEY, uses);
    const kind = paletteContext && paletteContext.kind;
    if (kind) {
      const here = usesHere[kind] || (usesHere[kind] = {});
      here[item.key] = (here[item.key] || 0) + 1;
      store.set(USES_HERE_KEY, usesHere);
    }
  }

  // ===== The core verbs: the same four, in the same slots (D2, I12) ==========
  function selectionMarks(s) {
    const sum = s.summon;
    return sum ? sum.enclosedIds.filter((id) => s.contentIds.includes(id)) : s.selection.filter((id) => s.contentIds.includes(id));
  }
  // The glyphs on the round buttons: the sketch drew them as circles with a mark inside.
  const GLYPH = {
    name: '<span class="g">Aa</span>',
    copy: '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="5.5" y="5.5" width="8" height="8" rx="1.5"/><path d="M10.5 4.5V3.5A1 1 0 0 0 9.5 2.5h-6a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h1"/></svg>',
    paste: '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="3.5" y="3.5" width="9" height="10.5" rx="1.5"/><path d="M6 3.5V2.5h4v1M6 8h4M6 10.5h4"/></svg>',
    erase: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M4 4l8 8M12 4l-8 8"/></svg>',
  };
  function coreItems(s) {
    const marks = selectionMarks(s);
    const sum = s.summon;
    return [
      { key: 'name', core: true, label: 'Name…', verbs: [], why: 'Name — hold it as a thing you can use again; type the name', disabled: !marks.length && !(sum && sum.onArtifact), tier: 1,
        run: () => { const f = fieldInput(); if (f) { f.value = 'name: '; paintField(f.value); f.focus(); f.setSelectionRange(f.value.length, f.value.length); } } },
      { key: 'copy', core: true, label: 'Copy', verbs: ['copy', 'cp'], why: 'Copy — hold the ink to paste; it is on the clipboard as SVG too', disabled: !marks.length, tier: 1,
        run: () => copyMarks(marks) },
      { key: 'paste', core: true, label: 'Paste', verbs: ['paste'], why: clip ? 'Paste — the copied ink, beside these' : 'Paste — nothing copied yet', disabled: !clip, tier: 1,
        run: () => { if (!clip) return; const b = selectionBounds(s) || (marks.length ? union(marks.map((id) => MM.boundsOf(s.nodes.get(id))).filter(Boolean)) : null); pasteClip(b ? { x: b.maxX + wpx(40), y: b.minY } : screenToWorld(innerWidth / 2, innerHeight / 2)); refreshPalette(); } },
      { key: 'erase', core: true, label: 'Erase', verbs: ['erase', 'delete', 'del', 'remove', 'rm'], why: 'Erase — the ink stays in the log; undo brings it back', disabled: !marks.length, tier: 1,
        run: () => { const at = Date.now(); if (sum) session.dismiss(sum.id, at); marks.forEach((id) => session.erase(id, at)); flash('erased ' + marks.length + ' mark' + (marks.length === 1 ? '' : 's')); } },
    ];
  }

  /** Copy holds some marks' ink (clean forms where held) and puts it on the clipboard as SVG. */
  function copyMarks(ids) {
    const s = session.getState();
    const strokes = [];
    const walk = (node) => {
      const pts = MM.strokePointsOf(node);
      // A pen's pressure goes with its ink (V1-PLAN R6); a clean form has none to carry.
      if (pts) { const clean = MM.cleanPointsOf(node); strokes.push({ points: (clean || pts).map((p) => (typeof p.p === 'number' ? { x: p.x, y: p.y, p: p.p } : { x: p.x, y: p.y })) }); return; }
      for (const e of node.edges) if (e.rel === 'has-part') { const p = s.nodes.get(e.to); if (p && !p.reps.some((r) => r.modality === 'erased')) walk(p); }
    };
    ids.forEach((id) => { const n = s.nodes.get(id); if (n) walk(n); });
    if (!strokes.length) { flash('nothing to copy'); return null; }
    const b = union(ids.map((id) => MM.boundsOf(s.nodes.get(id))).filter(Boolean));
    clip = { strokes: strokes, bounds: b, from: ids.slice() };
    try { const svg = svgOf(ids); if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(svg).catch(() => {}); } catch (err) { /* no clipboard here */ }
    flash('copied ' + ids.length + ' mark' + (ids.length === 1 ? '' : 's'));
    refreshPalette();
    return clip;
  }

  /** The clip's ink again, its top-left at a world point; the copies become the selection. */
  function pasteClip(at, select) {
    if (!clip) return [];
    const dx = at.x - clip.bounds.minX, dy = at.y - clip.bounds.minY;
    let t = Date.now();
    const made = [];
    for (const st of clip.strokes) made.push(session.addStroke(st.points.map((p) => (typeof p.p === 'number' ? { x: p.x + dx, y: p.y + dy, p: p.p } : { x: p.x + dx, y: p.y + dy })), t++, undefined, 1 / view.zoom, { content: true }));
    if (made.length && select !== false) session.select(made, t);
    flash('pasted ' + made.length + ' stroke' + (made.length === 1 ? '' : 's'));
    return made;
  }

  /** The ink of some marks, again, beside them; the copies become the selection. Copy and paste in one. */
  function duplicateMarks(sum, ids) {
    const s = session.getState();
    const boxes = ids.map((id) => MM.boundsOf(s.nodes.get(id))).filter(Boolean);
    if (!boxes.length) return;
    const b = union(boxes);
    const held = clip;
    if (!copyMarks(ids)) return;
    // The field stays open — the copies land selected beside the group, and
    // the hand can go straight to the next verb.
    const made = pasteClip({ x: b.maxX + wpx(40), y: b.minY });
    clip = held || clip; // a duplicate does not overwrite what Copy held
    flash('duplicated ' + ids.length + ' as ' + made.length + ' stroke' + (made.length === 1 ? '' : 's'));
    refreshPalette();
  }

  // ===== Name it, Label it: one word, two acts (V1-PLAN L2e) ==================
  // (`makersOf`, `theirMarks` and `madeThese` — the words for another hand's marks —
  // are the reader's, in 09-field.js, so the line before Enter and the status after it
  // say the same thing; core's label tool says them the same way, and the field's test
  // holds the two to it.)
  // Naming BLESSES: the marks become one thing, a definition the library keeps and
  // the next drawing like it is offered as. Labelling puts a word on your own ink and
  // MAKES NOTHING — no definition, no file, nothing the matcher learns (the notes, §B,
  // §D). Side by side, "Name it “inlet”" and "Label it “inlet”" look like one thing
  // twice, so the difference is said in the words the field already has — each pill's
  // tooltip says what it does and what it does not, and the reading line says what a
  // pill will do while it is pointed at or chosen by the arrows — never a new badge,
  // row or button. Label is an offer in the row, from core's label tool, and Name it
  // from its name tool (`MM.NAMING_IS`, `MM.LABELLING_IS`); the four core buttons stay four.

  /**
   * The held marks' ink, for the reader: how many the person made, and who made each of
   * the rest. "Is this mine?" is core's question (`session.isMine`), the one the label
   * door asks — the person's, in this sitting or another, so the marks drawn before a
   * reload are still theirs (V1-PLAN L2i). Who made the rest is said as it is shown.
   */
  function whoseInk(s, ids) {
    return MM.whoseInk({ session: session, state: s, host: { nameOf: nameOfParticipant } }, ids);
  }

  /**
   * A word on the person's own ink (V1-PLAN L2e): core's label act (`MM.labelInk`, stamped
   * as the label tool's) — one `label` event per mark they made, the field closed first, a
   * mark already saying the word left alone — and every mark accounted for in the status
   * line: labelled, already saying it, or refused with the reason, never silently skipped.
   */
  function labelMarks(sum, ids, word) {
    const r = MM.labelInk(session, { summonId: sum.id, ids: ids, word: word, at: Date.now(), nameOf: nameOfParticipant });
    if (r.done.length || r.saying.length || r.refused.length) say(labelSentence(String(word || '').trim(), r.done, r.saying, r.refused));
    return r;
  }

  /** What a label act did, in one sentence for the status line. */
  function labelSentence(text, done, saying, refused) {
    const q = '“' + text + '”';
    const parts = [];
    if (done.length) parts.push(done.length === 1 ? 'labelled it ' + q : 'labelled ' + done.length + ' marks ' + q);
    if (saying.length) parts.push(done.length ? saying.length + ' already said it' : saying.length === 1 ? 'it already says ' + q : 'these ' + saying.length + ' already say ' + q);
    const theirs = refused.filter((r) => r.reason === 'not-your-ink');
    if (theirs.length) parts.push((parts.length ? 'not on ' : 'no label on ') + theirMarks(theirs.map((r) => r.maker)) + ' — a label goes on your own ink');
    for (const r of refused) if (r.reason !== 'not-your-ink') parts.push(r.detail || 'not labelled');
    return parts.join(' · ');
  }

  // ===== The reader: what Enter will do, from what was typed ================
  // The decision itself is `readFieldCommand` in 09-field.js, which knows nothing
  // about the session, the DOM or this closure (SEAM-1). What is left here is the
  // adapter: build the context it reads, then perform the command it names.

  /** What the reader is allowed to know about the board, gathered from the closure. */
  function fieldContext(q, s, items) {
    const sum = s.summon;
    const text = (q || '').trim();
    const revising = !!(sum && sum.onArtifact);
    // A definition in the loop can be TOLD things; the verb table reads the words.
    // Both guards are the reader's own, applied here so the table is not walked on
    // every keystroke of a board that holds no definition.
    const defs = sum ? [...new Set(sum.enclosedIds.filter((id) => s.artifacts.includes(id)).map((id) => definitionOf(s, id)))] : [];
    const defId = defs.length ? defs[0] : null;
    const parsed = defId && text.length > 3 ? MM.parseBehaviour(text) : null;
    return {
      text: text,
      open: !!sum,
      revising: revising,
      items: items,
      models: agents.map((a) => a.name),
      library: revising ? [] : libraryEntries(s),
      definition: defId ? { id: defId, name: MM.wordOf(s.nodes.get(defId)) || defId } : null,
      // Whose ink is held: a label goes on the person's own marks only (V1-PLAN L2e).
      marks: sum ? whoseInk(s, selectionMarks(s)) : { mine: 0, others: [] },
      behaviour: parsed && parsed.behaviour
        ? { described: MM.describeBehaviour(parsed.behaviour), unparsed: parsed.unparsed, value: parsed.behaviour }
        : null,
      // A thunk: reading the drawing's genre costs a pass over the marks, and most
      // keystrokes settle on a verb or a name long before the brief.
      target: () => targetOf(sum, text).target,
      // A thunk too: `= 24 ÷ 3` is read by core against the board's own page (M5), and only when a sum is typed.
      maths: (body) => MM.evaluateTyped(body, mathsFor(s).board),
    };
  }

  /** The named command the reader returned, as the thing this surface actually does. */
  function runFieldCommand(cmd, sum, items) {
    if (!cmd) return;
    const at = Date.now();
    if (cmd.do === 'take') {
      const item = (items[cmd.index] && items[cmd.index].key === cmd.key) ? items[cmd.index] : items.find((i) => i.key === cmd.key);
      if (item) { noteUse(item); item.run(); }
      return;
    }
    // A sum typed after `=`: its words, result and all, stand on the board as text beside the marks held (M5).
    if (cmd.do === 'maths') { mathsWrite(sum, cmd.words); return; }
    // Naming is the name tool's act, whether a pill or `name: word` took it.
    if (cmd.do === 'name') { MM.nameMarks(session, sum.id, cmd.name, at); return; }
    // The marks this summon held when Enter was read — not whatever is held when a stale
    // closure runs again, so a second run finds them already saying the word (L2e).
    if (cmd.do === 'label') { const s = session.getState(); labelMarks(sum, sum.enclosedIds.filter((id) => s.contentIds.includes(id)), cmd.text); return; }
    // A region round what is held, or of the rectangle that holds the rest: the region tool's act, as its pill takes it (I5).
    if (cmd.do === 'region') { const s = session.getState(); regionMadeSaid(MM.makeRegion(session, { ids: sum.enclosedIds.filter((id) => s.contentIds.includes(id)), name: cmd.name, at: at, summonId: sum.id, offer: 'region-named' })); return; }
    if (cmd.do === 'ask-what') { askModelsAbout(selectionMarks(session.getState())); return; }
    if (cmd.do === 'ask') { runAsk(sum, cmd.text); return; }
    if (cmd.do === 'draw') { runDraw(sum, cmd.text); return; }
    if (cmd.do === 'build') { runPrompt(sum, cmd.text, cmd.revising); return; }
    if (cmd.do === 'library') {
      const entry = libraryEntries(session.getState()).find((e) => e.id === cmd.id);
      if (entry) applyLibrary(sum, entry);
      return;
    }
    if (cmd.do === 'behave') {
      session.behave({ nodeId: cmd.definitionId, behaviour: cmd.behaviour, participantId: MM.LOCAL_PARTICIPANT, at: at });
      if (cmd.ask) writers().forEach((a) => withWork('behave:' + agentKey(a) + ':' + cmd.definitionId, [cmd.definitionId], modelWords(a) + ' · reading the words', a.behave({ nodeId: cmd.definitionId, words: cmd.words, at: Date.now() })).then(() => render(session.getState())));
      return;
    }
    // With no model here, what was typed is kept, said once, and run when one joins — never the pane popped over the field (J5).
    if (cmd.do === 'need-model') {
      const f = fieldInput(), text = f ? f.value : '', sumId = sum.id;
      const what = cmd.what[0].toUpperCase() + cmd.what.slice(1);
      keepAsk({ what: what, needs: 'model', need: 'needs a model', ids: sum.enclosedIds.slice(),
        sentence: what + ' needs a model — kept: it runs when one joins · choose one under models',
        run: () => {
          const st = session.getState();
          if (!st.summon || st.summon.id !== sumId) { say('the field that asked for ' + cmd.what + ' has closed — ask again'); return; }
          const r = readField(text);
          if (r.run) r.run();
        } });
      return;
    }
  }

  /**
   * One reader for the field. Returns { kind, line, run, quiet } — the line is shown
   * under the field as it is typed; run is what Enter does. The shape is unchanged;
   * what decides it is now pure.
   */
  function readField(q) {
    const s = session.getState();
    const sum = s.summon;
    if (!sum) return { kind: 'empty', line: '', run: null };
    const items = paletteItems.concat(coreItems(s));
    const r = readFieldCommand(fieldContext(q, s, items));
    const cmd = r.command;
    const out = { kind: r.kind, line: r.line, run: cmd ? () => runFieldCommand(cmd, sum, items) : null };
    if (r.quiet) out.quiet = true;
    if (r.model) out.model = true;
    // The pill the reading points at, for the row to mark as chosen.
    if (cmd && cmd.do === 'take') out.item = (items[cmd.index] && items[cmd.index].key === cmd.key) ? items[cmd.index] : items.find((i) => i.key === cmd.key);
    if (cmd && cmd.do === 'library') out.entry = libraryEntries(s).find((e) => e.id === cmd.id) || null;
    // `label:` and `name:` choose one of the pair the row offers for a typed word.
    if (cmd && cmd.do === 'label') out.item = { key: 'label-word' };
    if (cmd && cmd.do === 'name') out.item = { key: 'name-word' };
    return out;
  }

  // ===== The field on screen ===================================================
  function fieldInput() { return summonEl.querySelector('input.filter'); }

  // ===== The field's geometry, apart from its content =====================
  // The field opens at the pen tip and stays put while the window turns, the
  // panel docks at the bottom or a keyboard rises. Placement is therefore a
  // function of the space actually visible (01-view's `usableRect`) and of the
  // field's MEASURED size — a fixed 230px guess put its foot under the panel
  // the moment the pills wrapped to three rows (UI-1).
  const FIELD_W = 380;       // the design width; narrower when the space is
  const FIELD_MIN_W = 200;   // …but never so narrow the input is unusable
  const FIELD_H_GUESS = 230; // only until the content has been laid out once
  const FIELD_M = 8;         // the margin the field keeps off every edge
  const FIELD_TOP = 52;      // under the bar, when the usable rect cannot hold it
  let fieldAnchor = null;    // where the hand was when this field opened, on screen

  /** Pure: fit `size` at `want` inside `soft` if it fits there, inside `hard` otherwise. */
  function fitSpan(want, size, soft, hard) {
    const box = (soft.hi - soft.lo) >= size ? soft : hard;
    const hi = Math.max(box.lo, box.hi - size);
    return Math.max(box.lo, Math.min(hi, want));
  }

  /**
   * Pure: where the field stands, given where the hand is and what is visible.
   * @param {{x:number,y:number}} anchor the pen tip, on screen
   * @param {{viewport:object,usable:object,height:number,hand:string,panel:object|null}} o
   * @returns {{x:number,y:number,w:number}} in the viewport's own space
   */
  function fieldBox(anchor, o) {
    const v = o.viewport, u = o.usable || v;
    const w = Math.max(FIELD_MIN_W, Math.min(FIELD_W, u.width - FIELD_M * 2, v.width - FIELD_M * 2));
    const h = o.height > 0 ? o.height : FIELD_H_GUESS;
    const at = anchor || { x: v.left + v.width / 2, y: v.top + v.height / 2 };
    const fit = (x, y) => ({
      x: fitSpan(x, w, { lo: u.left + FIELD_M, hi: u.right - FIELD_M }, { lo: v.left + FIELD_M, hi: v.right - FIELD_M }),
      y: fitSpan(y, h, { lo: u.top + FIELD_M, hi: u.bottom - FIELD_M }, { lo: v.top + FIELD_TOP, hi: v.bottom - FIELD_M }),
      w: w,
    });
    const want = fit(o.hand === 'left' ? at.x - 14 - w : at.x + 14, at.y - 22);
    // Off every card in the way — the panel, the minimap (U1c; the panel alone was
    // slid past before, and the field opened over the minimap). The field is placed
    // where it was wanted when nothing is in the way; else at the nearest place,
    // to the hand, beside or above or below each card that is clear of all of them
    // and still whole on screen. Nothing clear: where it was wanted, as before.
    const cards = (o.avoid || (o.panel ? [o.panel] : [])).filter(Boolean);
    // The press itself is kept clear: fitted into the screen at its edge, the field used to slide
    // back under the hand and open beneath the pointer (U2's walk). The other side of the hand is
    // among the places tried below.
    if (anchor) cards.push({ left: at.x - FIELD_M, right: at.x + FIELD_M, top: at.y - FIELD_M, bottom: at.y + FIELD_M });
    const clear = (b) => !cards.some((r) => b.x < r.right + FIELD_M - 0.5 && b.x + w > r.left - FIELD_M + 0.5 && b.y < r.bottom + FIELD_M - 0.5 && b.y + h > r.top - FIELD_M + 0.5);
    if (clear(want)) return want;
    const tries = [fit(o.hand === 'left' ? at.x + 14 : at.x - 14 - w, at.y - 22)];
    for (const r of cards) tries.push(fit(r.right + FIELD_M, want.y), fit(r.left - FIELD_M - w, want.y), fit(want.x, r.top - FIELD_M - h), fit(want.x, r.bottom + FIELD_M));
    const far = (b) => Math.hypot(Math.max(b.x - at.x, 0, at.x - (b.x + w)), Math.max(b.y - at.y, 0, at.y - (b.y + h)));
    const ok = tries.filter(clear).sort((a, b) => far(a) - far(b) || Math.hypot(a.x - want.x, a.y - want.y) - Math.hypot(b.x - want.x, b.y - want.y));
    return ok[0] || want;
  }

  /** The panel's rect while it stands, else null — a hidden panel is in nobody's way. */
  function panelRect() {
    if (document.body.classList.contains('panelHidden') || inspectorEl.hidden) return null;
    const r = inspectorEl.getBoundingClientRect();
    return r.width > 0 && r.height > 0 ? r : null;
  }
  /** The minimap's rect while it shows, else null. */
  function minimapRect() {
    const el = document.getElementById('minimap');
    if (!el || el.hidden || getComputedStyle(el).display === 'none') return null;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0 ? r : null;
  }
  /**
   * What the field keeps off (U1c): the panel and the minimap — and the marks it holds, when there
   * is room beside them (U2's walk: held writing opened a field over itself). A group too big to
   * stand beside is not kept off: fieldBox falls back to where it was wanted.
   */
  function fieldAvoids() {
    const s = session.getState();
    const held = s.summon ? heldBoxOf(s.summon) : null;
    return [panelRect(), minimapRect(), held].filter(Boolean);
  }

  /**
   * Where the field opens: by the hand's last press when that was on or beside the held
   * marks, else beside the marks themselves on the hand's side (U1c). The last press used
   * to be taken whatever it was — after a hold it was the stroke before, and the field
   * opened a screen away from what it holds.
   */
  /** The held marks' box on screen, or null. */
  function heldBoxOf(sum) {
    const s = session.getState();
    let box = null;
    for (const id of sum.enclosedIds) {
      const b = s.nodes.get(id) && MM.boundsOf(s.nodes.get(id));
      if (!b) continue;
      const a = worldToScreen(b.minX, b.minY), z = worldToScreen(b.maxX, b.maxY);
      box = box ? { left: Math.min(box.left, a.x), top: Math.min(box.top, a.y), right: Math.max(box.right, z.x), bottom: Math.max(box.bottom, z.y) } : { left: a.x, top: a.y, right: z.x, bottom: z.y };
    }
    return box;
  }
  function fieldAnchorFor(sum) {
    const box = heldBoxOf(sum);
    const NEAR = 80;
    if (lastPen && (!box || (lastPen.x >= box.left - NEAR && lastPen.x <= box.right + NEAR && lastPen.y >= box.top - NEAR && lastPen.y <= box.bottom + NEAR))) return { x: lastPen.x, y: lastPen.y };
    if (!box) return null;
    return { x: hand === 'left' ? box.left : box.right, y: Math.max(box.top, Math.min(box.bottom, box.top + 22)) };
  }

  const FIELD_LIST_MIN = 64; // the pills' list is never held shorter than about two rows

  /**
   * The pills scroll rather than fall under a keyboard (V1-PLAN R6). When the
   * field is taller than the room the visible viewport leaves it — an on-screen
   * keyboard takes half an iPad's height and the layout viewport does not
   * change, only the visual one — its list of pills is held to what fits and
   * scrolls, and the input, its reading line and the four core buttons stay in
   * view. The room is the box `fieldBox` will place the field in. Measured from
   * the list's own scroll height, so a list already scrolled keeps its place;
   * when the field fits, nothing is set and the stylesheet's rule stands.
   */
  function fitFieldHeight(v, u) {
    const list = summonEl.querySelector('.list');
    if (!list) return;
    const room = Math.max(u.height - FIELD_M * 2, v.height - FIELD_TOP - FIELD_M);
    const natural = summonEl.offsetHeight - list.offsetHeight + list.scrollHeight;
    if (natural <= room) {
      if (list.classList.contains('held')) { list.classList.remove('held'); list.style.maxHeight = ''; }
      return;
    }
    const cap = Math.max(FIELD_LIST_MIN, Math.floor(list.scrollHeight - (natural - room))) + 'px';
    if (list.style.maxHeight !== cap) list.style.maxHeight = cap;
    list.classList.add('held');
  }

  /** Place the field where it stands now. Touches left/top/width, and the list's height when it must scroll — NOTHING else. */
  function placeField() {
    const v = viewportRect(), u = usableViewport();
    // Width first: the height below is whatever the content comes to at that
    // width, measured rather than assumed.
    const avoid = fieldAvoids();
    const first = fieldBox(fieldAnchor, { viewport: v, usable: u, height: 0, hand: hand, avoid: avoid });
    summonEl.style.width = first.w + 'px';
    fitFieldHeight(v, u);
    const box = fieldBox(fieldAnchor, { viewport: v, usable: u, height: summonEl.offsetHeight, hand: hand, avoid: avoid });
    summonEl.style.left = box.x + 'px';
    summonEl.style.top = box.y + 'px';
    summonEl.style.width = box.w + 'px';
    return box;
  }

  /** A layout change: re-place the open field, keeping every character and the caret. */
  function replaceOpenField() {
    if (!summonEl.classList.contains('field') || summonEl.style.display === 'none') return;
    placeField();
  }

  function renderSummon(s) {
    document.body.classList.toggle('summoning', !!s.summon);
    if (!s.summon) { summonEl.style.display = 'none'; summonEl.className = ''; shownSummonId = null; fieldAnchor = null; return; }
    const sum = s.summon;
    // The same field, rendered again: its content already stands and rebuilding
    // it would throw away the caret — but the space it stands in may have
    // changed since, so geometry is re-run and content is not (UI-1).
    if (shownSummonId === sum.id) { placeField(); return; }
    shownSummonId = sum.id;
    fieldAnchor = fieldAnchorFor(sum);
    paletteContext = contextFor(sum.enclosedIds);
    paletteItems = rankItems(conversionsFor(s), paletteContext);
    paletteIndex = -1;
    paletteNavigated = false;
    summonEl.className = 'field' + (hand === 'left' ? ' left' : '');
    summonEl.style.display = 'block';
    summonEl.innerHTML = '';
    placeField();

    const top = document.createElement('div');
    top.className = 'fieldTop';
    const filter = document.createElement('input');
    filter.className = 'filter';
    filter.setAttribute('autocomplete', 'off');
    filter.setAttribute('spellcheck', 'false');
    const onArt = sum.onArtifact ? (MM.wordOf(s.nodes.get(sum.onArtifact.artifactId)) || 'artifact') : null;
    filter.placeholder = onArt ? 'on ' + onArt + ' — type what to change…' : sum.enclosedIds.length + ' mark' + (sum.enclosedIds.length === 1 ? '' : 's') + ' — a verb, a name, or what to make…';
    filter.onkeydown = onPaletteKey;
    filter.oninput = () => { paletteNavigated = false; paletteIndex = -1; paintField(filter.value); };
    top.appendChild(filter);
    const reading = document.createElement('div');
    reading.className = 'reading';
    top.appendChild(reading);
    // An ask kept for a model says what it needs here, where it was asked, with the way to choose one (J5).
    const need = document.createElement('div');
    need.className = 'need';
    need.hidden = true;
    top.appendChild(need);
    summonEl.appendChild(top);
    // The body, as the sketch has it: the round buttons at the left, the
    // pills stacked to their right — what this is, then what it affords.
    const body = document.createElement('div');
    body.className = 'fieldBody';
    const core = document.createElement('div');
    core.className = 'row core';
    body.appendChild(core);
    const list = document.createElement('div');
    list.className = 'list';
    for (const cls of ['certain', 'afford items']) {
      const row = document.createElement('div');
      row.className = 'row ' + cls;
      list.appendChild(row);
    }
    body.appendChild(list);
    summonEl.appendChild(body);
    paintField('');
    // A keyboard that pops up on every selection covers the pills on a phone;
    // a finger taps the input when it wants to type. A pointer gets the focus.
    // Which hand opened it is read from its pointerType, never the user agent
    // (V1-PLAN R6): a field a finger opened waits for the finger, whatever the
    // screen says of itself; a pen's waits where the screen is a touch screen.
    const coarse = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
    if (!coarse && handOfPointer(downType) !== 'finger') setTimeout(() => filter.focus(), 0);
  }

  /** Recompute the offers for the open summon and repaint, keeping what was typed. */
  function refreshPalette() {
    const s = session.getState();
    if (!s.summon || shownSummonId !== s.summon.id) return;
    const filter = fieldInput();
    if (!filter) return;
    paletteContext = contextFor(s.summon.enclosedIds);
    paletteItems = rankItems(conversionsFor(s), paletteContext);
    paintField(filter.value);
  }

  /** The pills the typed text leaves visible, in display order: what this is, then what it affords. */
  function visibleItems(query) {
    const q = query.trim().toLowerCase();
    const s = session.getState();
    const sum = s.summon;
    // Both rows in the ranked order — the order the reader walks, so the first
    // reading shown is the one Enter takes (V1-PLAN §2.2: one `rank`, no disagreeing).
    const certain = paletteItems.filter((i) => i.certain);
    const afford = paletteItems.filter(afforded);
    const hit = (i) => !q || (i.label + ' ' + (i.verbs || []).join(' ') + ' ' + i.group).toLowerCase().includes(q);
    let shown = certain.filter(hit).concat(afford.filter(hit));
    // Typing the name of something the library holds completes to it: Enter
    // reuses the entry on this loop, and no model is asked.
    if (sum && q.length >= 2 && !sum.onArtifact) {
      for (const e of libraryEntries(s)) {
        const name = e.name.toLowerCase();
        if (name.startsWith(q) || name.includes(q) || q.includes(name)) {
          shown.unshift({ key: 'lib:' + e.id, certain: true, group: 'known', groupConf: 1, groupWhy: 'in the library', label: e.name + ' · library', why: 'from the library — the same program, here; no model asked', tier: 0, run: () => applyLibrary(sum, e) });
        }
      }
    }
    // What is typed completes (V1-PLAN B1), from the tools that complete it, each
    // where the field puts it: words a definition can be told first (the verb table
    // read them), the model last (for what the table could not), and a word typed at
    // marks two ways at the head of what it affords — Name it, one thing, a
    // definition; Label it, the word on your own ink, nothing made (V1-PLAN L2e).
    // `typedWord` (pure, 09-field.js) decides whether there is a word at all. An offer
    // already standing for the same word — a reading that takes it as the name, a
    // label from the writing — is not repeated.
    if (sum) {
      const tw = typedWord(fieldContext(query, s, paletteItems.concat(coreItems(s))));
      if (!paletteScope || paletteScope.summon.id !== sum.id) paletteScope = fieldScope(s, '', null);
      const typed = Object.assign({}, paletteScope, { text: query.trim(), word: tw ? tw.word : null });
      const head = [];
      for (const it of MM.completionsFor(typed).map(offerItem)) {
        if (it.offer.place === 'first') { shown = shown.filter((i) => i.key !== it.key); shown.unshift(it); }
        else if (it.offer.place === 'last') shown.push(it);
        else head.push(it);
      }
      const pair = head.filter((p) => !shown.some((i) => i.label === p.label || (typeof p.name === 'string' && i.certain && typeof i.name === 'string' && i.name.toLowerCase() === p.name.toLowerCase())));
      const at = shown.findIndex((i) => !i.certain);
      shown.splice(at < 0 ? shown.length : at, 0, ...pair);
    }
    return shown;
  }

  /**
   * Why a pill stands where it does, when what is beside the hand moved it
   * (V1-PLAN §2.2 rule 2): "first because it sits beside a flowchart: three
   * processes, one decision". Nothing, when nothing lifted or held it.
   */
  function becauseOf(item, leads) {
    return item.because && item.because.length ? (leads ? 'first because ' : 'raised because ') + item.because.join('; ') : '';
  }

  function pillFor(item, i, selected, leads) {
    const because = becauseOf(item, leads);
    const b = ui.pill(item.label, { cls: (item.certain ? 'certain ' : '') + 'item', why: item.why + (item.groupWhy ? ' — ' + item.groupWhy : '') + (because ? ' — ' + because : ''), model: item.tier === 2, onclick: () => { noteUse(item); item.run(); } });
    b.setAttribute('aria-selected', String(selected));
    b.dataset.index = String(i);
    b.dataset.key = item.key; // what the reader and learned use call it: for tests, and for B2's context
    return b;
  }

  function paintField(query) {
    const s = session.getState();
    if (!s.summon) return;
    const core = summonEl.querySelector('.row.core');
    const certainRow = summonEl.querySelector('.row.certain');
    const affordRow = summonEl.querySelector('.row.afford');
    const readingEl = summonEl.querySelector('.reading');
    if (!core || !certainRow || !affordRow) return;
    // The core: the same four round buttons, in the same slots. The name is
    // the tooltip and the reading line while the pointer rests on one.
    core.innerHTML = '';
    for (const c of coreItems(s)) {
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'pill core';
      b.dataset.verb = c.key;
      b.setAttribute('aria-label', c.label);
      b.title = c.why;
      b.innerHTML = GLYPH[c.key] || '<span class="g">' + esc(c.label) + '</span>';
      if (c.disabled) b.disabled = true;
      b.onclick = () => { noteUse(c); c.run(); };
      b.onmouseenter = () => { if (readingEl && !query.trim()) readingEl.textContent = '↵ ' + c.label + (c.disabled ? ' — ' + c.why.split(' — ')[1] : ''); };
      b.onmouseleave = () => { if (readingEl && !query.trim()) readingEl.textContent = readField(query).line || ''; };
      core.appendChild(b);
    }
    // What this is, and what it affords.
    const shown = visibleItems(query);
    const r = readField(query);
    const selectedKey = paletteNavigated && shown[paletteIndex] ? shown[paletteIndex].key : (r.item ? r.item.key : null);
    certainRow.innerHTML = '';
    affordRow.innerHTML = '';
    // The line under the field says what Enter will do — or, for a pill that carries its
    // own line (Name it, Label it: one word, two acts), what THAT pill will do while it is
    // pointed at or chosen by the arrows. The difference said where the hand is looking.
    const chosen = paletteNavigated && shown[paletteIndex] && shown[paletteIndex].line ? shown[paletteIndex] : null;
    const sayLine = (line, quiet, model) => { if (readingEl) { readingEl.textContent = line || ''; readingEl.classList.toggle('quiet', !!quiet); readingEl.classList.toggle('model', !!model); } };
    const standingLine = () => (chosen ? sayLine(chosen.line, false) : sayLine(r.line, r.quiet, r.model));
    let i = 0, shownAfford = 0, shownCertain = 0;
    for (const item of shown) {
      // Which pill leads its row: the one a "first because" belongs to.
      const leads = item.certain ? shownCertain++ === 0 : shownAfford === 0;
      const pill = pillFor(item, i, item.key === selectedKey, leads);
      if (item.line) { pill.onmouseenter = () => sayLine(item.line, false); pill.onmouseleave = standingLine; }
      if (item.certain) certainRow.appendChild(pill);
      else if (shownAfford < MAX_AFFORD || query.trim()) { affordRow.appendChild(pill); shownAfford++; }
      i++;
    }
    const hidden = shown.filter((x) => !x.certain).length - shownAfford;
    if (hidden > 0) { const more = document.createElement('span'); more.className = 'more'; more.textContent = '+' + hidden + ' more — type to find'; affordRow.appendChild(more); }
    standingLine();
    paintNeed(s);
    keepFieldOnScreen();
  }

  /**
   * The ask this field kept for a model, said where it was asked (J5, the pure-user walkthrough):
   * what it needs, and "choose one" — the one way the models pane opens for it. Nothing when none waits.
   */
  function paintNeed(s) {
    const el = summonEl.querySelector('.need');
    if (!el) return;
    const k = keptFor(s.summon);
    el.hidden = !k;
    if (!k) { el.innerHTML = ''; return; }
    el.innerHTML = '<span>' + esc(k.what + ' ' + k.need) + ' — kept, it runs when one joins</span> <button type="button" class="choose">choose one</button>';
    el.querySelector('.choose').onclick = () => offerModel(k.sentence);
  }

  /**
   * The pills just rewrapped and the field grew: re-place it only if its foot
   * has gone off the bottom. Re-placing on every keystroke would walk the
   * field up the screen under the hand.
   */
  function keepFieldOnScreen() {
    if (!summonEl.classList.contains('field')) return;
    const v = viewportRect();
    // The pills' list held to the room a keyboard leaves, or let go once they fit again (R6).
    fitFieldHeight(v, usableViewport());
    const r = summonEl.getBoundingClientRect();
    // …or has grown over a card it keeps off — a model's readings landing make it taller (U1c).
    const over = fieldAvoids().some((c) => r.left < c.right && r.right > c.left && r.top < c.bottom && r.bottom > c.top);
    if (!over && r.bottom <= v.bottom - 2 && r.right <= v.right - 2 && r.top >= v.top - 2 && r.left >= v.left - 2) return;
    placeField();
  }

  function onPaletteKey(e) {
    e.stopPropagation();
    const q = e.target.value;
    const shown = visibleItems(q);
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); paletteNavigated = true; paletteIndex = Math.min(shown.length - 1, paletteIndex + 1); paintField(q); return; }
    if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); paletteNavigated = true; paletteIndex = Math.max(0, paletteIndex - 1); paintField(q); return; }
    if (e.key === 'Escape') { e.preventDefault(); session.dismiss(shownSummonId, Date.now()); return; }
    if (e.key !== 'Enter') return;
    e.preventDefault();
    // The arrows chose a pill: Enter takes it. Otherwise Enter does what the
    // reading line said it would.
    const chosen = paletteNavigated ? shown[paletteIndex] : null;
    if (chosen) { noteUse(chosen); chosen.run(); return; }
    const r = readField(q);
    if (!r.run) return;
    if (r.kind === 'brief' || r.kind === 'ask' || r.kind === 'draw') {
      e.target.disabled = true;
      e.target.placeholder = r.line.replace(/^↵\s*/, '') + '…';
    }
    r.run();
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

  // ===== The library ==========================================================
  /** The library: every artifact holding a program, by name. */
  function libraryEntries(s) {
    const out = [];
    for (const id of s.artifacts) {
      const n = s.nodes.get(id);
      const rep = n && codeRepOf(n);
      if (!rep || rep.data.kind !== 'run' || n.reps.some((r) => r.modality === 'erased')) continue;
      out.push({ id: id, name: MM.wordOf(n) || id, code: rep.data.code });
    }
    return out;
  }

  /** An entry's program on a new artifact: reused, not rewritten, and running because the human asked. */
  function reuseEntry(artifactId, entry) {
    const at = Date.now();
    if (entry.code.startsWith(MM.GRAPH3D_MARK)) {
      // A structure the engine built from one drawing is rebuilt from this one: the atoms are these marks, not those.
      const built = MM.buildGraph3D(session, artifactId);
      if (!built.ok) { say('could not stand it in 3D: ' + built.error); return; }
      session.attachCode({ participantId: built.participantId, nodeId: artifactId, kind: 'run', code: built.code, prompt: 'show it in 3D', from: entry.id, at: at });
      session.clock({ nodeId: artifactId, op: 'play', at: at + 1 });
      say('in 3D again, from this drawing (tier 1) — ' + built.reasoning);
      return;
    }
    session.attachCode({ participantId: MM.LOCAL_PARTICIPANT, nodeId: artifactId, kind: 'run', code: entry.code, prompt: 'reused from ' + entry.name, from: entry.id, at: at });
    session.clock({ nodeId: artifactId, op: 'play', at: at + 1 });
    say('reused ' + entry.name + ' from the library — nothing was written');
  }

  /** The loop becomes an artifact carrying an entry's program. */
  function applyLibrary(sum, entry) {
    const at = Date.now();
    const id = session.bless({ summonId: sum.id, name: entry.name, at: at });
    if (id) reuseEntry(id, entry);
    return id;
  }

  /** What a brief asks for: a page (a layout of regions) or a program (anything else), unless it says. */
  function targetOf(sum, prompt) {
    const m = /^(page|run|program|new)\s*:\s*/i.exec(prompt);
    const brief = m ? prompt.slice(m[0].length).trim() : prompt;
    if (m) return { target: m[1].toLowerCase() === 'page' ? 'page' : 'program', brief: brief, fresh: m[1].toLowerCase() === 'new' };
    const s = session.getState();
    const marks = sum.enclosedIds.filter((id) => s.contentIds.includes(id));
    const reading = marks.length ? session.read(marks) : null;
    const boxes = marks.filter((id) => { const n = s.nodes.get(id); return n && MM.topInterpretation(n) === 'rectangle'; }).length;
    // A drawing the diagram rung compiles — boxes tiling a space, nodes joined
    // by edges, or both — is a page or a diagram. Anything else (one shape,
    // nested circles, a figure) is a program that renders itself.
    const genre = reading ? reading.genre.genre : 'empty';
    const page = (genre === 'graph' || genre === 'mixed') || (genre === 'layout' && boxes >= 2);
    return { target: page ? 'page' : 'program', brief: brief, fresh: false };
  }

  /**
   * Writing, taken: the group becomes a text artifact where the writing is —
   * the words fitted to the ink's width, the ink held underneath (flip to see
   * it), editable — and never a definition (v10 F8). The selection ends with
   * the act, so the next stroke draws.
   */
  function writingToText(sum, text) {
    const at = Date.now();
    const id = session.bless({ summonId: sum.id, name: text, at: at });
    if (!id) { say('could not hold the writing'); return null; }
    session.attachCode({ participantId: MM.LOCAL_PARTICIPANT, nodeId: id, kind: 'text', code: text, from: 'writing', at: at + 1 });
    session.deselect(at + 2);
    say('“' + text + '” — text now, the writing underneath; flip it to see the ink, double-click it to edit');
    return id;
  }

  /**
   * A brief that failed leaves no artifact named after it: the bless is undone when this hand
   * has done nothing since — it is still this hand's last act (`session.lastAct`, V1-PLAN L2j),
   * whatever another hand in the room drew meanwhile. It was the last event on the BOARD, which
   * in a room is whoever acted last by the clocks, and undo takes back this hand's act.
   */
  function dropFailedBless(artifactId) {
    const act = session.lastAct();
    const s = session.getState();
    if (act.length === 1 && act[0].type === 'bless' && s.artifacts[s.artifacts.length - 1] === artifactId) { session.undo(); releasePrompted(); return true; }
    return false;
  }

  // ===== The prompts: what a model is asked, and only when asked =============

  /**
   * One Enter, one act (V1-PLAN L2d; week 1's U5). A brief is a deliberate act
   * on ONE summon, and a summon is acted on once: a second Enter on a loop
   * already building blessed a second artifact — or, on a revision, where there
   * is no bless to fail at, asked every model again: two builds in flight for
   * one drawing, the later refused as superseded when it landed, minutes after
   * the hand had stopped watching. Disabling the input covers the key, not the
   * act: the reading's `run` is a closure over the summon, and a pill, a touch
   * or a second key still holds it after the first act consumed the summon. So
   * the guard is here, at the door every brief comes through — the adapter,
   * not the reader (`09-field.js` decides what Enter will do; it is not asked
   * whether it already did). `runProgram` and the library are reached only
   * through `runPrompt`, so they need no door of their own.
   *
   * It holds ONE key, so it cannot grow, and the key is not the summon's id
   * alone: an id from a log with no name is a counter derived on replay, so a
   * fresh board can hand out one this memory still holds (the `pruneRuntime`
   * rule in `08-render.js`). The summon's own time and the marks it holds go
   * into the key, so a later summon that reuses an id is a different act.
   *
   * It is released when the act is given up on — a bless that failed, a brief
   * whose model failed and whose bless was undone — not on the next render:
   * the revising path dismisses its summon and renders at once, and clearing
   * there would open the door again in the same tick.
   */
  let promptedKey = null;

  function summonKey(sum) { return sum.id + '@' + sum.at + '#' + sum.enclosedIds.join(','); }

  /** True when this summon has already been acted on — and says so. */
  function alreadyUnderWay(sum) {
    const key = summonKey(sum);
    if (promptedKey === key) { say('that brief is already under way — one Enter, one act'); return true; }
    promptedKey = key;
    return false;
  }

  /** The act was given up on: the same summon may be tried again. */
  function releasePrompted() { promptedKey = null; }

  function runPrompt(sum, prompt, revising) {
    if (alreadyUnderWay(sum)) return;
    const at = Date.now();
    let artifactId, addressed;

    // A brief the library already answers is not sent anywhere: the entry is
    // reused. The model is asked only for what nothing here does (the
    // conservation John asked for — the library grows, the bloat does not).
    const want = revising ? null : targetOf(sum, prompt);
    if (want && want.target === 'program') {
      const entry = want.fresh ? null : libraryMatch(want.brief, libraryEntries(session.getState()));
      if (entry) { applyLibrary(sum, entry); return; }
      runProgram(sum, want.brief);
      return;
    }
    const brief = want ? want.brief : prompt;

    if (revising) {
      artifactId = sum.onArtifact.artifactId;
      addressed = addressedRegions(sum);
      session.dismiss(sum.id, at); // the addressing mark has done its work
    } else {
      // Blessing first gives the code somewhere to live, and gives the region
      // frame its origin. The name is the brief, so the artifact says what it
      // was asked to be.
      const name = brief.length > 30 ? brief.slice(0, 30) + '…' : brief;
      seatWriters(at);
      artifactId = session.bless({ summonId: sum.id, name: name, at: at });
      addressed = undefined;
      if (!artifactId) { releasePrompted(); say('could not hold that group'); return; }
      // Tier 1 first: the structure stands at once, in the engine's name —
      // every region in place, no words. It is what the canvas knows. A model
      // then writes the words into it; with none joined, this is the page.
      // (The structure tool's act, `MM.standStructure`: stamped with its id.)
      const structure = MM.standStructure(session, artifactId, brief, at + 1);
      if (structure.ok) {
        if (!writers().length) { say('the structure (tier 1): ' + structure.ids.join(', ') + ' — join a model for the words'); return; }
      } else if (!writers().length) { say('could not build the structure: ' + structure.error); return; }
    }

    // What the human typed outranks a reading nobody asked for.
    cancelReading();
    const aboutIds = session.getState().nodes.get(artifactId) ? [artifactId] : sum.enclosedIds;
    writers().forEach((agent) => {
      const key = 'build:' + agent.id + ':' + artifactId;
      withWork(key, aboutIds, modelWords(agent) + (revising ? ' · changing “' : ' · building “') + brief.slice(0, 32) + (brief.length > 32 ? '…' : '') + '”',
        agent.generate({ prompt: brief, artifactId: artifactId, at: Date.now(), addressed: addressed, signal: workSignal(key) }))
        .then((res) => {
          noteOutcome(agent, res.ok, res.ok ? (res.revised ? 'changed ' : 'built ') + (res.revised ? (res.changed || res.filled) : res.filled).join(', ') : res.error);
          if (res.ok) {
            const short = res.unfilled && res.unfilled.length ? ' — left ' + res.unfilled.join(', ') + ' empty' : '';
            say(modelWords(agent) + ' ' + (res.revised ? 'changed' : 'built') + ' ' + (res.revised ? (res.changed || res.filled) : res.filled).join(', ') + short);
          } else {
            say(modelWords(agent) + ' could not build (' + res.error + ') — the drawing is untouched');
            // A model that answered unusably is a thing you need to SEE to fix.
            if (res.raw) window.__mm.lastRaw = res.raw;
          }
          render(session.getState());
        });
    });
  }

  /** A program from a brief: the loop is blessed, every model is asked with the library in its brief, and what comes back runs. */
  function runProgram(sum, brief) {
    const at = Date.now();
    const name = brief.length > 30 ? brief.slice(0, 30) + '…' : brief;
    seatWriters(at);
    const artifactId = session.bless({ summonId: sum.id, name: name, at: at });
    if (!artifactId) { releasePrompted(); say('could not hold that group'); return; }
    cancelReading();
    const library = libraryEntries(session.getState()).map((e) => ({ id: e.id, name: e.name }));
    writers().forEach((agent) => {
      const key = 'program:' + agent.id + ':' + artifactId;
      withWork(key, [artifactId], modelWords(agent) + ' · writing “' + brief.slice(0, 32) + (brief.length > 32 ? '…' : '') + '”',
        agent.program({ prompt: brief, artifactId: artifactId, library: library, at: Date.now(), signal: workSignal(key) }))
        .then((res) => {
          noteOutcome(agent, res.ok, res.ok ? (res.reuse ? 'pointed at ' + res.reuse + ' in the library' : 'wrote ' + (res.name || 'a program')) : res.error);
          if (res.ok && res.reuse) {
            const entry = libraryEntries(session.getState()).find((e) => e.name.toLowerCase() === res.reuse.toLowerCase());
            if (entry) { reuseEntry(artifactId, entry); say(modelWords(agent) + ' pointed at ' + entry.name + ' in the library — reused'); }
            else say(modelWords(agent) + ' pointed at “' + res.reuse + '”, which the library does not hold');
          } else if (res.ok) {
            // The human asked for it: it runs on arrival. A program that
            // arrived any other way waits for play (I9).
            session.clock({ nodeId: artifactId, op: 'play', at: Date.now() });
            say(modelWords(agent) + ' wrote ' + (res.name || 'a program') + (res.parts && res.parts.length ? ' — parts: ' + res.parts.join(', ') : ''));
          } else {
            const dropped = dropFailedBless(artifactId);
            say(modelWords(agent) + ' could not write it (' + res.error + ')' + (dropped ? ' — nothing was made; the drawing is as it was' : ' — the drawing is untouched'));
            if (res.raw) window.__mm.lastRaw = res.raw;
          }
          render(session.getState());
        });
    });
  }

  /** `draw: …` — the model holds a pen: marks in the shape rung's vocabulary, in its own name, beside these. */
  function runDraw(sum, q) {
    const ids = sum.enclosedIds.slice();
    session.dismiss(sum.id, Date.now());
    cancelReading();
    writers().forEach((agent) => {
      withWork('draw:' + agentKey(agent), ids, modelWords(agent) + ' · drawing', agent.draw({ prompt: q, nodeIds: ids, at: Date.now() })).then((res) => {
        noteOutcome(agent, res.ok, res.ok ? 'drew ' + res.ids.length + ' mark' + (res.ids.length === 1 ? '' : 's') : res.error);
        if (res.ok) say(modelWords(agent) + ' drew ' + res.ids.length + ' mark' + (res.ids.length === 1 ? '' : 's') + ': ' + res.shapes.map((x) => x.shape).join(', '));
        else { say(modelWords(agent) + ' drew nothing (' + res.error + ')'); if (res.raw) window.__mm.lastRaw = res.raw; }
        render(session.getState());
      });
    });
  }

  /** `ask: …` — a question about these, answered into the canvas beside them. */
  function runAsk(sum, q) {
    const ids = sum.enclosedIds.slice();
    cancelReading();
    writers().forEach((agent) => {
      withWork('ask:' + agentKey(agent), ids, modelWords(agent) + ' · answering', agent.ask(q, ids, Date.now())).then((res) => {
        noteOutcome(agent, res.ok, res.ok ? 'answered beside the marks' : res.error);
        if (!res.ok) say(modelWords(agent) + ' could not answer (' + res.error + ')');
        render(session.getState());
      });
    });
  }

// ===== inspector =====
// Provides: the panel: a mark, an artifact, a word, the selection — what it is and what it can become
//   in plain words first, and the inspector (ids, tiers, relations, measures) behind details, closed by
//   default and remembered on this device (PLAN-USER-SURFACE U1a: markSummary, inspectDetails).
// Uses: core, render (readRungs, logKey, paintReference), snap, handwriting, models,
//   palette (contextFor, paletteItems, afforded — what stands beside a selection, and what it put first),
//   packs (packSaid — a definition from a library pack says its pack).
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
      return '<div class="row"><span class="k">behaves</span><span class="v">wander, and keep to its spot — the built-in</span></div>';
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
    const stateText = !c ? 'not played'
      : c.playing ? 'playing · t = ' + tankTime(id).toFixed(1) + 's' : 'paused' + (c.reason ? ' — ' + c.reason : '') + ' · t = ' + tankTime(id).toFixed(1) + 's';
    return '<div class="row"><span class="k">clock</span><span class="v' + (err ? ' warn' : '') + '">' + esc(stateText) + '</span></div>' +
      '<div class="acts">' +
      (c && c.playing
        ? '<button class="mini" data-act="clock-pause" data-id="' + esc(id) + '">pause</button>'
        : '<button class="mini" data-act="clock-play" data-id="' + esc(id) + '">play</button>') +
      '<button class="mini" data-act="clock-reset" data-id="' + esc(id) + '">reset</button></div>';
  }

  /** The kind of an artifact's newest code rep, html by default. */
  function codeKindOf(node) { const r = node && codeRepOf(node); return (r && r.data.kind) || 'html'; }

  // The panel is written only when what it says changed (R4c): a pan or a
  // hover repaints the board, and rebuilding the panel's DOM with the same
  // words on every frame was work for nothing — and closed whatever a hand
  // had opened in it. Every write to the panel goes through here.
  let panelSaid = null;
  function showPanel(html) {
    // The board's outline stands at the foot of every panel the board has regions for (12-regions.js).
    html += regionOutlineHtml(session.getState());
    if (html === panelSaid) return;
    panelSaid = html;
    inspectorEl.innerHTML = html;
  }

  function renderInspector(s, id) {
    if (s.summon) return renderSummonScope(s);
    // One region selected alone: what it is and holds, in words (I5; 12-regions.js).
    const rid = selectedRegion(s);
    if (rid) { showPanel(regionPanelHtml(s, rid)); return; }

    const node = id && s.nodes.get(id);
    if (!node) {
      // UI-2: on an EMPTY board the panel used to say "nothing here yet" — true,
      // and no help at all, while the one thing a first-time hand needs (what
      // to do) sat in the status line. So the panel shows the loop that already
      // exists, in its own plain voice, in the place it will report the answer.
      // It is not a tour and not a mode: it is the empty state of one row, and
      // the first mark drawn replaces it with that mark's reading.
      if (!s.contentIds.length && !s.artifacts.length) {
        showPanel('<div class="eyebrow">nothing drawn yet</div>' +
          '<ol class="firstLoop">' +
          '<li><b>draw a few marks</b> — a box, a circle, a line</li>' +
          '<li><b>press and hold one</b> — it is held with what it sits with</li>' +
          '<li><b>choose what it becomes</b> — tap a pill, or type in the field</li>' +
          '</ol>' +
          // R5: the first run's one tap — a board of your own made from the starter example (22-boards.js takes it).
          '<div class="acts"><button class="mini" type="button" data-example-start title="a new board of your own with something already drawn — the starter example, yours to draw on">start from an example</button>' +
          '<button class="mini" type="button" data-example-more title="a flowchart, a class diagram, a molecule and a pattern page — in the boards pane">more examples</button></div>' +
          '<div class="why">the canvas reads every mark as you draw it; a model is asked only when you ask one</div>');
        return;
      }
      showPanel('<div class="eyebrow">mark</div>' +
        '<div class="empty">nothing here yet</div>');
      return;
    }

    const isArtifact = s.artifacts.includes(id);
    const isLive = s.live.includes(id);
    const isWordNode = MM.isWord(node);
    // Who made it: a mark's drawer, an artifact's blesser — never who drew its marks (V1-PLAN L2f).
    const author = authorOf(node);
    const authorName = nameOfParticipant(author);
    const eyebrow = '<div class="eyebrow">' +
      (isLive ? (codeKindOf(node) === 'html' ? 'living page' : codeKindOf(node) === 'mermaid' ? 'a diagram in words' : 'living ' + codeKindOf(node)) : isArtifact ? 'artifact' : isWordNode ? 'word' : 'mark') + '</div>';
    // What the person reads first (U1a): what it is and what it can become, in a few plain
    // lines. Everything the engine holds about it — ids, tiers, relations, measures — is
    // below, behind details.
    let top = markSummary(s, node, id, { isArtifact: isArtifact, isLive: isLive, isWordNode: isWordNode, author: author, authorName: authorName });
    let html = '';
    // What the board's numbers say of this mark — its figure's answer, its page's checks — in plain lines, every value's formula behind details (M5).
    const mathsSays = mathsPanel(s, [id]);
    if (mathsSays) top += mathsSays.top;

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
      // A library pack's definition is said by name and pack (V1-PLAN B3): this thing is its own now, the pack's its provenance.
      const packDef = inst && s.nodes.get(inst.to) && MM.packDefinitionOf(s.nodes.get(inst.to));
      if (inst) html += '<div class="row"><span class="k">same as</span><span class="v">' + esc(packDef ? packDef.definition + ', from ' + packSaid(packDef.pack) : inst.to) + '</span></div>';
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
      if (!MM.isPictureKind(kind) && kind !== 'control') {
        html += '<div class="acts">' + (kind === 'text' ? '<button class="mini" data-act="edit-text" data-id="' + esc(id) + '">edit the words</button>' : '') +
          '<button class="mini" data-act="export-code" data-id="' + esc(id) + '">save as .' + esc(kind === 'text' ? 'txt' : kind) + '</button></div>';
      }
      // The clock: nothing runs until a hand plays it, and a stop says why. An act, so it stands above details.
      if (kind === 'js') {
        top += clockRows(s, id);
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
      // The tank is played and told how to behave by hand: it stands above details.
      top += '<div class="sep"></div><div class="eyebrow">tank</div>';
      const inst = tankCount(s, id);
      top += '<div class="row"><span class="k">bodies</span><span class="v">' + inst.total + (inst.held ? ' (' + inst.held + ' held, unblessed)' : '') + '</span></div>';
      top += clockRows(s, id);
      top += behaviourRows(s, node, id);
    }

    // THE LADDER. Every rung a mark has climbed, with why at each one — ink,
    // shape, what it plays, what it became. Each rung keeps the one below it,
    // so a wrong reading at the top never destroys the bottom (KEYFRAMES.md §3).
    {
      const rung = readRungs(s);
      const role = rung.roles.get(id);
      // What the shape rung measured: never a label, which is its maker's word (L2b).
      const shapeRead = MM.interpretationsOf(node, s.nodes).filter(MM.isShapeRungReading)[0];
      const rows = [];
      const fpx = MM.fingerprintOf(node);
      if (fpx) {
        const scaleRep = (node.reps.find((r) => r.modality === 'stroke') || {}).data || {};
        rows.push(['ink', fpx.pointCount + ' points' + (scaleRep.scale ? ' at ' + (1 / scaleRep.scale).toFixed(1) + '×' : ''), '']);
      } else if (isArtifact) {
        rows.push(['ink', node.edges.filter((e) => e.rel === 'has-part').length + ' marks held', '']);
      }
      if (shapeRead) rows.push(['shape', shapeRead.label + ' ' + shapeRead.weight.toFixed(2), shapeRead.reasoning || '']);
      // The word its maker put on it (L2b): said as a label, beside the shape, never as it.
      const lab = MM.labelOf(node);
      if (lab) rows.push(['label', '“' + lab.text + '” · by ' + nameOfParticipant(lab.source || authorOf(node)), 'a word its maker put on it — not a name, and not a file']);
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
        // A label is its maker's word and a name is a bless — neither is the shape rung, whatever tier the maker sits at.
        const basis = g.interpretations[0].basis;
        html += '<div class="srchead"><span class="by">' + esc(g.label) + '</span>' +
          '<span class="tier">' + (basis === 'label' ? 'label · its maker' : basis === 'name' ? 'named' : tier === 0 ? 'tier 0 · shape' : tier === 2 ? 'tier 2 · model' : 'tier ' + tier) + '</span></div>';
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
        html += '<div class="why">unread — needs a model that can see</div>';
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
    const maths = !isArtifact && MM.strokePointsOf(node) ? MM.measure(node, s.nodes, mathsFor(s).board || undefined) : null;
    if (maths && maths.measures.length) {
      html += '<div class="sep"></div><div class="eyebrow">maths <span class="srccount">' + esc(maths.shape) + '</span></div>';
      const shown = maths.measures.filter((x) => x.key !== 'centreY');
      shown.forEach((x) => {
        const v = x.key === 'centre' && x.at ? '(' + Math.round(x.at.x) + ', ' + Math.round(x.at.y) + ')'
          : (Number.isFinite(x.value) ? x.value.toLocaleString('en-US') : '∞') + esc(x.unit);
        html += '<div class="row"><span class="k">' + esc(x.label) + '</span><span class="v">' + v + '</span></div>';
      });
    }

    if (mathsSays) html += mathsSays.details;

    const fp = MM.fingerprintOf(node);
    if (fp) {
      html += '<div class="sep"></div><div class="eyebrow">measured</div>' +
        '<div class="row"><span class="k">straight</span><span class="v">' + fp.straightness.toFixed(3) + '</span></div>' +
        '<div class="row"><span class="k">corners</span><span class="v">' + fp.corners + '</span></div>' +
        '<div class="row"><span class="k">closed</span><span class="v">' + (fp.isClosed ? 'yes' : 'no') + '</span></div>' +
        '<div class="row"><span class="k">size</span><span class="v">' + Math.round(fp.size) + 'px</span></div>';
    }

    showPanel(eyebrow + top + inspectDetails(html));
  }

  // ===== The panel for the person, the inspector behind details (PLAN-USER-SURFACE U1a) =====
  // The panel opened itself after the first stroke as an inspector: an id, a tier, the
  // relations by id, coordinates. Those are the engine's view, and stay one tap away —
  // behind details, closed by default and remembered on this device.
  const INSPECT_KEY = 'mm-inspect';
  let inspectOpen = store.get(INSPECT_KEY) === 'open';
  function inspectDetails(body) {
    return body ? '<details class="inspect"' + (inspectOpen ? ' open' : '') + '><summary>details</summary>' + body + '</details>' : '';
  }
  inspectorEl.addEventListener('toggle', (e) => {
    const d = e.target;
    if (!d || !d.classList || !d.classList.contains('inspect')) return;
    inspectOpen = d.open;
    store.set(INSPECT_KEY, inspectOpen ? 'open' : 'closed');
  }, true);

  /** "a circle", "an arrow", "a box": a shape the rung read, with its article. */
  function aShape(label) {
    const words = { text: 'writing', rectangle: 'box' };
    const w = words[label] || label;
    return w === 'writing' ? w : (/^[aeiou]/.test(w) ? 'an ' : 'a ') + w;
  }

  /** Two or three plain lines: what this is, and what it can become — the words the person reads first. */
  function markSummary(s, node, id, o) {
    const row = (k, v) => '<div class="row"><span class="k">' + esc(k) + '</span><span class="v">' + esc(v) + '</span></div>';
    let out = '';
    if (o.isArtifact) {
      const members = node.edges.filter((e) => e.rel === 'has-part').length;
      const name = MM.wordOf(node);
      const rep = codeRepOf(node);
      const kind = rep ? (rep.data.kind || 'html') : null;
      const what = !rep ? 'a thing you named' : kind === 'html' ? 'a page' : kind === 'run' ? 'a program' : kind === 'text' ? 'text' : kind === 'mermaid' ? 'a diagram written in Mermaid' : MM.isPictureKind(kind) ? 'a picture' : 'a ' + kind + ' file';
      out += row('is', (name ? '“' + name + '”, ' : '') + what + (members ? ' made of ' + members + ' mark' + (members === 1 ? '' : 's') : '') + (o.author !== MM.LOCAL_PARTICIPANT ? ', by ' + o.authorName : ''));
      out += row('becomes', !rep ? 'another drawing like it is offered as one · a brief builds on it · its tank plays' : kind === 'mermaid' ? 'Draw it puts it on the board as marks · edit the text for a new version' : 'draw over it to change a part · a brief is a new version');
      return out;
    }
    const shapeRead = MM.interpretationsOf(node, s.nodes).filter(MM.isShapeRungReading)[0];
    const writing = o.isWordNode || (!!shapeRead && shapeRead.label === 'text');
    const said = MM.transcriptsOf(node)[0];
    let is = writing ? (said ? 'writing that says “' + said.text + '”' : 'writing, not read yet')
      : shapeRead ? (shapeRead.weight >= 0.7 ? aShape(shapeRead.label) : shapeRead.weight >= 0.5 ? 'probably ' + aShape(shapeRead.label) : 'not clear yet — maybe ' + aShape(shapeRead.label)) : 'a mark';
    const lab = MM.labelOf(node);
    if (lab) is += ', labelled “' + lab.text + '”';
    if (o.author !== MM.LOCAL_PARTICIPANT) is += ', drawn by ' + o.authorName;
    out += row('is', is);
    const clean = MM.cleanOf(node), offer = snapOffers.get(id);
    const next = [];
    if (writing) next.push(said ? 'text' : 'read', 'a name', 'a label');
    else {
      if (!clean && offer) next.push('a clean ' + aShape(offer.shape).replace(/^an? /, ''));
      next.push('a name', 'part of a page or a diagram');
    }
    out += row('becomes', next.join(' · ') + ' — press and hold it to choose');
    if (clean) out += '<button class="mini" data-act="raw" data-id="' + esc(id) + '">show the ink</button>';
    else if (offer && !writing) out += '<button class="mini" data-act="snap" data-id="' + esc(id) + '">draw it clean</button>';
    if (writing && !said && seeing().length) out += '<button class="mini" data-act="read" data-id="' + esc(id) + '">read it</button>';
    return out;
  }

  /**
   * A selection's rung on the map of becoming, and the rung after it — ink →
   * shape → concept or definition → structure → artifact → refined (v10 D6).
   * One line, so depth is legible a step at a time; the field's pills are
   * the step itself.
   */
  function becomesOf(s, sum, reading) {
    const ids = sum.enclosedIds;
    const arts = ids.filter((id) => s.artifacts.includes(id));
    if (arts.length) {
      const a = s.nodes.get(arts[0]);
      const rep = a && codeRepOf(a);
      if (rep) {
        const kind = rep.data.kind || 'html';
        const what = kind === 'run' ? (rep.data.code && rep.data.code.startsWith(MM.GRAPH3D_MARK) ? 'a 3D thing' : 'a program') : kind === 'html' ? 'a page' : kind === 'text' ? 'text' : kind === 'mermaid' ? 'a diagram written in Mermaid' : MM.isPictureKind(kind) ? 'a picture' : 'a ' + kind + ' file';
        return { here: 'an artifact, ' + what, next: kind === 'mermaid' ? (paletteItems.some((i) => i.key === 'mermaid-draw') ? 'Draw it puts it on the board as marks · ' : '') + 'edit the text for a new version · ink over a node addresses its marks' : 'ink over it addresses its parts · a brief is a new version · wire it in a frame' };
      }
      return { here: 'a definition' + (MM.wordOf(a) ? ' “' + MM.wordOf(a) + '”' : ''), next: 'another like it is matched · a brief builds on it · its tank plays' };
    }
    const match = sum.suggestions.find((x) => x.kind === 'match');
    if (match) return { here: 'a definition, ' + match.label + ' ' + (match.score || 1).toFixed(2) + (match.pack ? ', from ' + packSaid(match.pack) : ''), next: (libraryEntries(s).some((e) => e.id === match.artifactId) ? 'its program on this drawing' : 'take the name') + ' · a brief builds from it' };
    const genre = reading.genre && reading.genre.genre;
    const concept = reading.concepts[0];
    // Writing becomes what Enter does with it: read, then text, a name or a label (W2, U2's walk).
    const shapes0 = ids.map((id) => MM.topInterpretation(s.nodes.get(id))).filter(Boolean);
    if (shapes0.length && shapes0.every((x) => x === 'text')) return { here: 'writing' + (concept && concept.concept === 'writing' ? ' ' + concept.confidence.toFixed(2) : ''), next: 'read it · then text, a name or a label' };
    // A drawing that reads as a diagram says which (V1-PLAN §3 Reading, N1): the first reading is what it is,
    // any other above the floor is said beside it; what it becomes is Mermaid, or tidied, or a name.
    const notated = notationsHeld(ids.filter((id) => s.contentIds.includes(id)));
    if (notated.length) {
      const words = notated.map((r) => notationWords(MM.describeNotation(r)));
      const offered = (key) => paletteItems.some((i) => i.key === key);
      return {
        here: words[0].name,
        is: words[0].is + (words.length > 1 ? ' · or ' + words.slice(1).map((x) => x.label).join(', ') : ''),
        next: (offered('mermaid') ? 'Make it Mermaid · ' : '') + (offered('snap') ? 'draw them clean · ' : '') + 'a name',
      };
    }
    // Show it in 3D only when the field offers it: circles joined by lines (U1d).
    if (genre === 'graph' || genre === 'mixed') return { here: 'a structure, a graph' + (concept ? ' (' + concept.concept + ')' : ''), next: (paletteItems.some((i) => i.key === '3d') ? 'Show it in 3D · ' : '') + 'a brief builds the diagram, then a model writes the words' };
    if (genre === 'layout') return { here: 'a structure, a layout' + (concept ? ' (' + concept.concept + ')' : ''), next: 'a brief builds the page at once, then a model writes the words' };
    if (concept) return { here: 'a concept, ' + concept.concept + ' ' + concept.confidence.toFixed(2), next: concept.conversions.filter((c) => c.effect.kind !== 'name' && c.effect.kind !== 'prompt').map((c) => c.label).concat(['a name']).join(' · ') };
    const shapes = ids.map((id) => MM.topInterpretation(s.nodes.get(id))).filter(Boolean);
    if (shapes.length && shapes.every((x) => x === 'text')) return { here: 'writing', next: 'Read the writing · a name · text' };
    return { here: 'shapes' + (shapes.length ? ', ' + [...new Set(shapes)].join(', ') : ''), next: 'draw them clean · a name · a brief is a program' };
  }

  // What the selection reads as, kept while the log stands (R4c): a pan with
  // the field open used to read every held mark again on every frame.
  let scopeRead = { key: null, reading: null };
  function renderSummonScope(s) {
    const sum = s.summon;
    const key = logKey() + '|' + sum.enclosedIds.join(',');
    if (paintReference || scopeRead.key !== key) scopeRead = { key: paintReference ? null : key, reading: session.read(sum.enclosedIds) };
    const reading = scopeRead.reading;
    // What the person reads first (U1a): what is held, what it becomes, and what stands beside it.
    let top = '<div class="eyebrow">selection</div>';
    let html = '';

    top += '<div class="row"><span class="k">holds</span><span class="v">' +
      sum.enclosedIds.length + ' mark' + (sum.enclosedIds.length === 1 ? '' : 's') + '</span></div>';
    html += '<div class="row"><span class="k">scope</span><span class="v">' + esc(sum.scopeSource) + '</span></div>';
    html += '<div class="why">' + esc(sum.scopeReasoning) + '</div>';
    // Which way this will compile — a page or a diagram — and what each mark plays.
    if (reading.genre) {
      html += '<div class="row"><span class="k">genre</span><span class="v">' + esc(reading.genre.genre) + '</span></div>';
      html += '<div class="why">' + esc(reading.genre.reasoning) + '</div>';
    }
    // What the numbers written on these marks say — the answer in plain lines, the working behind details (M5).
    const mathsSays = mathsPanel(s, sum.enclosedIds);
    // Where this stands on the map of becoming, and the rung after it (SURFACE-v10-PLAN §4).
    const rung = becomesOf(s, sum, reading);
    if (rung && rung.is) top += '<div class="row"><span class="k">is</span><span class="v">' + esc(rung.is) + '</span></div><div class="row"><span class="k">becomes</span><span class="v">' + esc(rung.next) + '</span></div>';
    else if (rung) top += '<div class="row"><span class="k">becomes</span><span class="v">' + esc(rung.here + ' → ' + rung.next) + '</span></div>';
    // What stands beside it, and what that put first (V1-PLAN §2.2). Said only
    // when something does: far from any context the panel is as it was.
    const beside = contextFor(sum.enclosedIds);
    if (!MM.isEmptyContext(beside)) {
      MM.describeContext(beside).slice(0, 3).forEach((line, i) => {
        top += '<div class="row"><span class="k">' + (i ? '' : 'beside') + '</span><span class="v">' + esc(line) + '</span></div>';
      });
      const lead = paletteItems.find(afforded);
      if (lead && lead.because && lead.because.length) {
        top += '<div class="row"><span class="k">first</span><span class="v">' + esc(lead.label) + '</span></div>' +
          '<div class="why">' + esc('because ' + lead.because.join('; ')) + '</div>';
      }
    }
    // What each line of handwriting said, when several are held (I8): the reader's words per line, or why a line was not read.
    top += linesPanel(sum.enclosedIds);
    if (mathsSays) top += mathsSays.top;
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

    if (mathsSays) html += mathsSays.details;
    showPanel(top + inspectDetails(html));
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

// ===== regions =====
// Provides: regions as the board's named places (PLAN-IPAD-NOTES I5) — the quiet titled frame under the
//   pictures and the ink (renderRegions), the title as a handle to move it (regionTitleAt, regionTitlePress,
//   the move zone of a selected region), the panel's words for one (regionPanelHtml) and the board's outline
//   (regionOutlineHtml; a tap on a line fits the view to it), dragFrameOffset (a text or figure in a dragged region follows it),
//   the minimap's frames (regionsFor), and what is
//   said of a region made or erased (regionMadeSaid, eraseSaid).
// Uses: core (MM.regionsOfBoard, describeRegion, regionSaid, holdsSaid, regionOutline, regionCarries, boundsOf),
//   view (view, wpx, fitTo), render (ctx, C, roundRect, applyPreview, boxMeets, boxOfRect, recordOp, logKey,
//   paintReference, dragPreview from selection), the closure's esc, flash, say, session, state, inspectorEl.
// A fragment of one closure: Demos/build-surface.mjs concatenates surface/*.js
// in name order inside `(function () { ... })();`. Shared state is the
// closure's; no imports, no exports, no build step beyond the concatenation.

  // ===== What a region is on the board =======================================
  // A region is a named rectangle that holds whatever stands inside it (core's `board-regions.ts`): not ink and
  // not content, so it is a frame drawn UNDER the pictures and the ink, quiet — the board's own label colour,
  // never the gold the hand's chrome wears — with its name at the top left, in board units, so it scales with
  // the place it names. What it holds is derived from where things stand; nothing here writes that. Its title is
  // a handle: press it and the region is selected and dragged, one `move` that takes what it holds along.
  // A selected region's move zone is its title and the band along its edge, never its inside — the inside is
  // where the hand writes.

  /** The regions this paint knows, largest first so a nested one is drawn over the one that holds it; kept while the log stands. */
  let regionSeen = { key: null, list: [], said: new Map() };
  function regionsFor(s) {
    const key = logKey();
    if (!paintReference && regionSeen.key === key) return regionSeen;
    const list = s.regions && s.regions.length ? MM.regionsOfBoard(s) : [];
    list.sort((a, b) => (b.bounds.maxX - b.bounds.minX) * (b.bounds.maxY - b.bounds.minY) - (a.bounds.maxX - a.bounds.minX) * (a.bounds.maxY - a.bounds.minY));
    const seen = { key: paintReference ? null : key, list: list, said: new Map() };
    if (!paintReference) regionSeen = seen;
    return seen;
  }
  /** What a region holds, read once while the log stands. */
  function regionHolds(s, id) {
    const seen = regionsFor(s);
    if (!seen.said.has(id)) seen.said.set(id, MM.describeRegion(s, id));
    return seen.said.get(id);
  }

  // The title: a size in board units that grows with the region and never falls under a legible size on
  // screen, and the box it and its hit stand in — never less than a fingertip on screen.
  const REGION_TITLE_FONT = "'Space Grotesk', system-ui, sans-serif";
  function regionTitleBox(r) {
    const b = r.bounds, side = Math.min(b.maxX - b.minX, b.maxY - b.minY);
    const base = Math.max(14, Math.min(40, side * 0.06));
    const fs = Math.min(Math.max(base, wpx(11)), Math.max(wpx(11), side * 0.4));
    ctx.font = fs.toFixed(2) + 'px ' + REGION_TITLE_FONT;
    const pad = fs * 0.55;
    const w = ctx.measureText(r.name).width + pad * 2, h = fs * 1.55;
    return { x: b.minX, y: b.minY, w: w, h: h, fs: fs, pad: pad, hitW: Math.max(w, wpx(44)), hitH: Math.max(h, wpx(30)) };
  }

  function renderRegions(s, vb, pv) {
    const seen = regionsFor(s);
    if (!seen.list.length) return;
    const selected = new Set(s.selection);
    for (const r of seen.list) {
      const held = !!pv && pv.ids.includes(r.id);
      const b = r.bounds;
      if (!held && vb && !boxMeets(b, vb)) continue;
      if (held) { ctx.save(); applyPreview(pv); }
      const rw = b.maxX - b.minX, rh = b.maxY - b.minY, t = regionTitleBox(r);
      ctx.save();
      roundRect(b.minX, b.minY, rw, rh, Math.min(wpx(8), rw / 6, rh / 6));
      ctx.fillStyle = 'rgba(' + C.labelRGB + ',0.045)';
      ctx.fill();
      ctx.setLineDash([]);
      ctx.strokeStyle = 'rgba(' + C.labelRGB + (selected.has(r.id) ? ',0.95)' : ',0.55)');
      ctx.lineWidth = wpx(selected.has(r.id) ? 1.8 : 1.2);
      ctx.stroke();
      // The title, on the frame's own top left, its ground the board's so it reads over what stands behind it.
      roundRect(t.x, t.y, t.w, t.h, Math.min(t.h / 2, wpx(10)));
      ctx.fillStyle = 'rgba(' + C.panelRGB + ',0.78)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(' + C.labelRGB + ',0.55)';
      ctx.lineWidth = wpx(1);
      ctx.stroke();
      ctx.font = t.fs.toFixed(2) + 'px ' + REGION_TITLE_FONT;
      ctx.fillStyle = 'rgba(' + C.labelRGB + ',1)';
      ctx.textBaseline = 'middle';
      ctx.fillText(r.name, t.x + t.pad, t.y + t.h / 2 + t.fs * 0.04);
      ctx.restore();
      if (held) ctx.restore();
      if (paintOps) recordOp({ kind: 'region', id: r.id, text: r.name, box: boxOfRect(b.minX, b.minY, rw, rh), moved: held });
    }
  }

  // ===== The hand on a region ================================================
  /** The region whose title is under a world point — the smaller on top — or null. */
  function regionTitleAt(w) {
    const list = regionsFor(state).list;
    for (let i = list.length - 1; i >= 0; i--) {
      const r = list[i], t = regionTitleBox(r);
      if (w.x >= t.x && w.x <= t.x + t.hitW && w.y >= t.y && w.y <= t.y + t.hitH) return r.id;
    }
    return null;
  }
  /** Whether the selection is regions and nothing else. */
  function regionsOnlySelected(s) {
    s = s || state;
    return s.selection.length > 0 && s.selection.every((id) => s.regions && s.regions.includes(id));
  }
  /** The one region selected alone, or null. */
  function selectedRegion(s) {
    s = s || state;
    return s.selection.length === 1 && s.regions && s.regions.includes(s.selection[0]) ? s.selection[0] : null;
  }
  /**
   * A selected region moves by its title and the band along its edge, never its inside (the inside is where
   * the hand writes): true when a world point is on either of any selected region.
   */
  function regionMoveZone(w) {
    const band = wpx(14);
    for (const id of state.selection) {
      const r = regionsFor(state).list.find((x) => x.id === id);
      if (!r) continue;
      const b = r.bounds, t = regionTitleBox(r);
      if (w.x >= t.x && w.x <= t.x + t.hitW && w.y >= t.y && w.y <= t.y + t.hitH) return true;
      const inOuter = w.x >= b.minX - band && w.x <= b.maxX + band && w.y >= b.minY - band && w.y <= b.maxY + band;
      const inInner = w.x > b.minX + band && w.x < b.maxX - band && w.y > b.minY + band && w.y < b.maxY - band;
      if (inOuter && !inInner) return true;
    }
    return false;
  }
  /**
   * A press on a region's title takes hold of the region: it is selected and a move begins, as the
   * selection's own would — one `move` when the hand lets go. A field open, or a press that is not on a
   * title, is nothing to it.
   */
  function regionTitlePress(w) {
    if (state.summon) return null;
    const id = regionTitleAt(w);
    if (!id) return null;
    if (!(state.selection.length === 1 && state.selection[0] === id)) session.select([id], Date.now());
    const n = state.nodes.get(id), b = n && MM.boundsOf(n);
    return b ? { kind: 'move', bounds: b } : null;
  }
  /** What a drag of these ids acts on: a region takes what it holds, as the replay will carry it. */
  function dragCarried(ids) {
    return state.regions && state.regions.length && ids.some((id) => state.regions.includes(id)) ? MM.regionCarries(state, ids) : ids;
  }

  /** Where a hand's move drags an artifact's frame to, before the log has it: a text or a figure in a region follows the drag. */
  function dragFrameOffset(id) {
    const pv = dragPreview();
    return pv && pv.kind === 'move' && pv.ids.includes(id) ? { dx: pv.dx, dy: pv.dy } : { dx: 0, dy: 0 };
  }

  // ===== What is said ========================================================
  /** The status line after a region is made. */
  function regionMadeSaid(made) {
    if (!made) { say('nothing to stand a region round'); return; }
    const d = MM.describeRegion(session.getState(), made.id);
    flash((d ? MM.regionSaid(d) : 'a region “' + made.name + '”') + (made.around === 'frame' ? ' — your rectangle is its frame' : ' — drawn round what was held') + ' · press its title to move it; undo takes it away, what it holds stays');
  }
  /** The status line after an erase of the selection: a region is erased alone, and what it held stays. */
  function eraseSaid(ids, regionNames) {
    const regions = regionNames.length, marks = ids.length - regions;
    if (!regions) return 'erased ' + marks + ' mark' + (marks === 1 ? '' : 's');
    const r = regions === 1 ? 'the region “' + regionNames[0] + '”' : regions + ' regions';
    return 'erased ' + r + ' — what it held stays where it is; undo brings it back' + (marks ? ' · and ' + marks + ' mark' + (marks === 1 ? '' : 's') : '');
  }
  /** Erase the selection (Delete): a region erases alone and says what stays. */
  function eraseSelection() {
    const s = session.getState();
    const ids = s.selection.slice();
    const names = ids.filter((id) => s.regions && s.regions.includes(id)).map((id) => { const r = regionsFor(s).list.find((x) => x.id === id); return r ? r.name : id; });
    ids.forEach((id) => session.erase(id, Date.now()));
    flash(eraseSaid(ids, names));
  }

  // ===== The panel: one region, and the board's outline ======================
  /** The panel for a region selected alone: what it is, what it holds, its name to change. */
  function regionPanelHtml(s, id) {
    const d = regionHolds(s, id);
    if (!d) return '<div class="eyebrow">region</div><div class="empty">that region is gone</div>';
    return '<div class="eyebrow">region</div>' +
      '<div class="row"><span class="k">is</span><span class="v">' + esc(MM.regionSaid(d)) + '</span></div>' +
      '<div class="row"><span class="k">becomes</span><span class="v">move it by its title — what it holds goes with it, in one act</span></div>' +
      '<div class="acts"><input class="regionName" type="text" value="' + esc(d.name) + '" maxlength="60" aria-label="the region\'s name" data-region-name="' + esc(id) + '">' +
      '<button class="mini" type="button" data-region-rename="' + esc(id) + '" title="give it this name">rename</button>' +
      '<button class="mini" type="button" data-region-fit="' + esc(id) + '" title="take the view to it">show it</button></div>' +
      '<div class="why">erasing it keeps everything it holds; a mark moved out of it is let go, and one drawn in is held</div>';
  }
  /** The board's outline, at the foot of the panel: its regions as a tree, a tap on a line takes the view there. Empty when there are none. */
  function regionOutlineHtml(s) {
    if (!s.regions || !s.regions.length) return '';
    const rows = MM.regionOutline(s);
    if (!rows.length) return '';
    return '<div class="sep"></div><div class="eyebrow">outline <span class="srccount">' + rows.length + ' region' + (rows.length === 1 ? '' : 's') + '</span></div>' +
      '<div class="outline">' + rows.map((o) =>
        '<button class="mini outlineRow" type="button" data-region-fit="' + esc(o.id) + '" style="margin-left:' + (o.depth * 14) + 'px" title="take the view to it">' +
        '<b>' + esc(o.name) + '</b> <span class="v">' + esc(MM.holdsSaid(o.holds)) + '</span></button>').join('') + '</div>';
  }
  /** The view to a region: fitted to it, with room. */
  function regionFit(id) {
    const r = regionsFor(session.getState()).list.find((x) => x.id === id);
    if (!r) return;
    fitTo(r.bounds);
    flash('“' + r.name + '” — ' + MM.holdsSaid(regionHolds(session.getState(), id).holds));
  }
  function regionRename(id, name) {
    const done = session.renameRegion({ nodeId: id, name: name, at: Date.now() });
    flash(done ? 'renamed to “' + name.trim() + '” — undo takes the old name back' : 'a region needs a name');
    return done;
  }
  inspectorEl.addEventListener('click', (e) => {
    const t = e.target && e.target.closest && e.target.closest('[data-region-fit],[data-region-rename]');
    if (!t) return;
    if (t.hasAttribute('data-region-fit')) { regionFit(t.getAttribute('data-region-fit')); return; }
    const id = t.getAttribute('data-region-rename');
    const input = inspectorEl.querySelector('input[data-region-name="' + id + '"]');
    if (input) regionRename(id, input.value);
  });
  inspectorEl.addEventListener('keydown', (e) => {
    const t = e.target;
    if (e.key !== 'Enter' || !t || !t.hasAttribute || !t.hasAttribute('data-region-name')) return;
    e.preventDefault();
    regionRename(t.getAttribute('data-region-name'), t.value);
  });

// ===== kinds =====
// Provides: documentForKind (the renderers: every kind as a document ink can address), the mermaid harness (mermaidFrom, mermaidStates), postPointer (a hand forwarded into a playing frame), the worker runtime
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
  // Type is set on the root in ems, so the surface can hold it at a SCREEN
  // size whatever the zoom (sizeFramesToScreen): the frame scales with the
  // board, the text inside stays readable (SURFACE-v9-PLAN D6).
  const SOURCE_CSS =
    'html{font-size:11px;}html,body{margin:0;padding:0;background:#fbfaf7;color:#14140f;}' +
    '#mmroot{position:relative;overflow:auto;font:1em/1.45 "IBM Plex Mono",ui-monospace,Menlo,monospace;}' +
    '*{box-sizing:border-box;}' +
    '.src{margin:0;padding:0.55em 0.75em;white-space:pre-wrap;word-break:break-word;}' +
    '.rg{position:relative;padding:0.2em 0.55em 0.35em 0.55em;margin:0 0 0.2em 0;border-left:2px solid rgba(20,20,15,0.12);}' +
    '.rg:hover{background:rgba(201,168,76,0.08);}' +
    'html.mm-reveal .rg{border:1px dashed rgba(138,109,31,0.55);border-left-width:2px;margin-bottom:0.4em;}' +
    '.lb{display:block;font-size:0.82em;letter-spacing:0.06em;text-transform:uppercase;color:rgba(20,20,15,0.45);margin-bottom:0.1em;}' +
    '.gap{color:rgba(20,20,15,0.55);}' +
    'svg{max-width:100%;max-height:100%;display:block;margin:auto;}';

  // A FIGURE is not source. A script, a page or a table is something you read
  // on a page, and its white ground is the page; a drawing and a line of words
  // are marks on the board, and a white card behind them fights the ink they
  // stand among — the run harness and writing-turned-text have always known
  // this, and svg and text did not. Same type, same regions, clear ground, the
  // board's own ink colour, so a figure written onto the canvas reads in either
  // theme (brand/tokens.css by way of readColours).
  const figureCSS = () =>
    'html{font-size:11px;}html,body{margin:0;padding:0;background:transparent;color:' + (C ? C.ink : '#e8e4d9') + ';}' +
    '#mmroot{position:relative;overflow:hidden;font:1em/1.45 "IBM Plex Mono",ui-monospace,Menlo,monospace;}' +
    '*{box-sizing:border-box;}' +
    '.src{margin:0;padding:0.55em 0.75em;white-space:pre-wrap;word-break:break-word;}' +
    '.rg{position:relative;padding:0.2em 0.55em 0.35em 0.55em;margin:0 0 0.2em 0;}' +
    '.rg:hover{background:rgba(201,168,76,0.10);}' +
    'html.mm-reveal .rg{outline:1px dashed rgba(138,109,31,0.55);margin-bottom:0.4em;}' +
    '.gap{opacity:0.55;}' +
    'svg{max-width:100%;max-height:100%;display:block;margin:auto;}' +
    'text{fill:currentColor;}';

  // ===== Code legible at every zoom (v9 S4) =================================
  // A frame scales with the board; the type inside is held at a screen size —
  // set on the document root, in the frame's own pixels, as the board zooms —
  // until the frame is too small for a line, when it is left alone. Past 1:1
  // the zoom does not enlarge the text; it reveals structure: a script's
  // regions get their own boxes, a page's regions show their ids.
  const SOURCE_PX = 11, UI_PX = 10, REVEAL_ZOOM = 1.6;
  function sizeFramesToScreen() {
    const z = view.zoom;
    for (const f of frames.values()) {
      if (!f.iframe) continue;
      let doc = null;
      try { doc = f.iframe.contentDocument; } catch (err) { doc = null; }
      if (!doc || !doc.documentElement) continue; // an opaque frame draws at its own scale
      const kind = f.kind || 'html';
      const w = parseFloat(f.wrap.style.width) || 360;
      // The size that reads as SOURCE_PX on screen, but never so large that a line holds fewer than a dozen characters.
      const px = Math.min(SOURCE_PX / z, Math.max(SOURCE_PX, w / 12));
      const root = doc.documentElement;
      if (kind !== 'html' && kind !== 'png' && kind !== 'jpg') root.style.fontSize = px.toFixed(2) + 'px';
      root.style.setProperty('--mm-ui', (UI_PX / z).toFixed(2) + 'px');
      root.classList.toggle('mm-reveal', z > REVEAL_ZOOM);
    }
  }

  /** The source with its top-level regions wrapped, so each is an element ink can land on. */
  /**
   * Source with its regions marked. `named` says whether a region's label is a
   * NAME worth printing over it — a function, a key, a heading — or the region's
   * own first words, which is what text runs carry: printing those set every
   * line of a text twice, once in small caps and once as itself.
   */
  function regionsDocument(source, regions, w, h, opts) {
    const named = !opts || opts.named !== false;
    const css = opts && opts.figure ? figureCSS() : SOURCE_CSS;
    const tops = regions.filter((r) => r.depth === 0).sort((a, b) => a.start - b.start);
    let html = '', at = 0;
    for (const r of tops) {
      if (r.start > at) html += '<span class="gap">' + esc(source.slice(at, r.start)) + '</span>';
      html += '<div class="rg" data-region="' + esc(r.id) + '" title="' + esc(r.label) + '">' +
        (named ? '<span class="lb">' + esc(r.label) + '</span>' : '') +
        esc(source.slice(r.start, r.end)) + '</div>';
      at = r.end;
    }
    if (at < source.length) html += '<span class="gap">' + esc(source.slice(at)) + '</span>';
    return '<!doctype html><html><head><meta charset="utf-8"><style>' + css +
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
    return '<!doctype html><html><head><meta charset="utf-8"><style>' + figureCSS() +
      '#mmroot{width:' + Math.round(w) + 'px;height:' + Math.round(h) + 'px;display:flex;align-items:center;justify-content:center;}</style></head>' +
      '<body><div id="mmroot">' + out + '</div></body></html>';
  }

  // ===== A program that renders itself: the run harness ====================
  // The other sandbox (SURFACE-v9-PLAN D7): scripts allowed, same-origin
  // NOT — an opaque origin that can draw and compute and cannot reach the
  // page, its storage or its keys. The frame's background is clear, so the
  // thing drawn is a figure on the canvas, not a page. Addressing comes FROM
  // the frame: the program reports its parts as named rectangles, and the
  // canvas reads them back through postMessage.
  const THREE_CDN = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
  const reported = new Map(); // artifactId -> [{ id, x, y, w, h }] in frame pixels
  const RUN_HARNESS = [
    '// three.js is loaded beside this script, not before it: a program that draws in 2D',
    '// must not wait on a download, and one that needs 3D waits at most a few seconds.',
    'function __start(){',
    '  var W = __W__, H = __H__, ID = __ID__;',
    '  // An error thrown later — in a timer, a promise, an event — is reported like one thrown now.',
    '  window.onerror = function(msg){ parent.postMessage({ mm: true, id: ID, type: "error", error: String(msg) }, "*"); };',
    '  window.addEventListener("unhandledrejection", function(e){ parent.postMessage({ mm: true, id: ID, type: "error", error: String(e && e.reason && e.reason.message || e && e.reason || "rejected") }, "*"); });',
    '  var parts = new Map(), frames = [];',
    '  function post(m){ m.mm = true; m.id = ID; parent.postMessage(m, "*"); }',
    '  var mm = { width: W, height: H, THREE: window.THREE, onFrame: function(fn){ frames.push(fn); }, report: function(name, x, y, w, h){ parts.set(String(name), { x: x, y: y, w: w, h: h }); } };',
    '  var scene = null, camera = null, renderer = null;',
    '  if (mm.THREE) {',
    '    try {',
    '      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true }); renderer.setClearColor(0x000000, 0); renderer.setSize(W, H);',
    '      renderer.domElement.style.position = "absolute"; renderer.domElement.style.left = "0"; renderer.domElement.style.top = "0"; document.body.appendChild(renderer.domElement);',
    '      scene = new THREE.Scene(); camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 1000); camera.position.set(0, 0, 6); camera.lookAt(0, 0, 0);',
    '      scene.add(new THREE.AmbientLight(0xffffff, 0.7)); var dl = new THREE.DirectionalLight(0xffffff, 0.8); dl.position.set(3, 4, 5); scene.add(dl);',
    '      mm.scene = scene; mm.camera = camera; mm.renderer = renderer;',
    '    } catch (e) { mm.THREE = undefined; }',
    '  }',
    '  var c2 = document.createElement("canvas"); c2.width = W; c2.height = H; c2.style.position = "absolute"; c2.style.left = "0"; c2.style.top = "0"; document.body.appendChild(c2);',
    '  mm.ctx = c2.getContext("2d");',
    '  // A hand that lands inside this frame while it plays is forwarded here by the canvas (SURFACE-v10-PLAN D2):',
    '  // dispatched as real pointer and mouse events at the point, and handed to mm.onPointer. mm.pointer is the latest.',
    '  var pointerFns = [], downAt = null;',
    '  mm.pointer = { x: 0, y: 0, down: false };',
    '  mm.onPointer = function(fn){ pointerFns.push(fn); };',
    '  window.addEventListener("message", function(e){',
    '    var m = e.data; if (!m || m.mmPointer !== true) return;',
    '    var x = m.x, y = m.y, type = m.type;',
    '    mm.pointer.x = x; mm.pointer.y = y; if (type === "down") mm.pointer.down = true; if (type === "up" || type === "cancel") mm.pointer.down = false;',
    '    var target = (renderer && renderer.domElement) || c2;',
    '    var init = { bubbles: true, cancelable: true, clientX: x, clientY: y, screenX: x, screenY: y, button: m.button || 0, buttons: (type === "up" || type === "cancel") ? 0 : 1, pointerId: 1, pointerType: m.pointerType || "mouse", isPrimary: true, shiftKey: !!m.shiftKey, altKey: !!m.altKey, ctrlKey: !!m.ctrlKey, metaKey: !!m.metaKey };',
    '    var pn = type === "down" ? "pointerdown" : type === "move" ? "pointermove" : type === "cancel" ? "pointercancel" : "pointerup";',
    '    var mn = type === "down" ? "mousedown" : type === "move" ? "mousemove" : type === "cancel" ? null : "mouseup";',
    '    try { target.dispatchEvent(new PointerEvent(pn, init)); } catch (err) { /* no PointerEvent here */ }',
    '    if (mn) { try { target.dispatchEvent(new MouseEvent(mn, init)); } catch (err) { /* no MouseEvent here */ } }',
    '    if (type === "down") downAt = { x: x, y: y };',
    '    if (type === "up" && downAt && Math.hypot(x - downAt.x, y - downAt.y) < 6) { try { target.dispatchEvent(new MouseEvent("click", init)); } catch (err) { /* no click */ } }',
    '    if (type === "up" || type === "cancel") downAt = null;',
    '    for (var i = 0; i < pointerFns.length; i++) { try { pointerFns[i]({ type: type, x: x, y: y, button: m.button || 0, pointerType: m.pointerType || "mouse" }); } catch (err) { post({ type: "error", error: String(err && err.message || err) }); } }',
    '  });',
    '  try { (new Function("mm", __CODE__))(mm); } catch (e) { post({ type: "error", error: String(e && e.message || e) }); return; }',
    '  function report(){ var out = []; parts.forEach(function(r, id){ out.push({ id: id, x: r.x, y: r.y, w: r.w, h: r.h }); }); post({ type: "regions", regions: out }); }',
    '  var v = new THREE_VEC();',
    '  function THREE_VEC(){ this.x = 0; this.y = 0; this.z = 0; }',
    '  function projectParts(){',
    '    if (!scene || !camera) return;',
    '    scene.traverse(function(obj){',
    '      if (!obj.name || !obj.geometry) return;',
    '      var box = new THREE.Box3().setFromObject(obj); if (box.isEmpty()) return;',
    '      var minX = 1e9, minY = 1e9, maxX = -1e9, maxY = -1e9;',
    '      [[box.min.x,box.min.y,box.min.z],[box.max.x,box.min.y,box.min.z],[box.min.x,box.max.y,box.min.z],[box.max.x,box.max.y,box.min.z],[box.min.x,box.min.y,box.max.z],[box.max.x,box.min.y,box.max.z],[box.min.x,box.max.y,box.max.z],[box.max.x,box.max.y,box.max.z]].forEach(function(c){',
    '        var p = new THREE.Vector3(c[0], c[1], c[2]).project(camera); var sx = (p.x + 1) / 2 * W, sy = (1 - p.y) / 2 * H;',
    '        minX = Math.min(minX, sx); minY = Math.min(minY, sy); maxX = Math.max(maxX, sx); maxY = Math.max(maxY, sy);',
    '      });',
    '      parts.set(obj.name, { x: minX, y: minY, w: maxX - minX, h: maxY - minY });',
    '    });',
    '  }',
    '  var t0 = performance.now(), last = t0;',
    '  function loop(now){',
    '    var t = (now - t0) / 1000, dt = Math.min(0.1, (now - last) / 1000); last = now;',
    '    try { for (var i = 0; i < frames.length; i++) frames[i](t, dt); if (renderer) renderer.render(scene, camera); projectParts(); }',
    '    catch (e) { post({ type: "error", error: String(e && e.message || e) }); return; }',
    '    requestAnimationFrame(loop);',
    '  }',
    '  // The first frame runs at once, so the parts are known before any timer fires — a hidden tab gets none for a while.',
    '  try { for (var k = 0; k < frames.length; k++) frames[k](0, 0); if (renderer) renderer.render(scene, camera); projectParts(); } catch (e) { post({ type: "error", error: String(e && e.message || e) }); return; }',
    '  report();',
    '  requestAnimationFrame(loop);',
    '  setInterval(report, 300);',
    '  post({ type: "ready" });',
    '}',
    '(function(){',
    '  var started = false; function go(){ if (!started) { started = true; __start(); } }',
    '  var s = document.createElement("script"); s.src = __THREE__; s.async = true; s.onload = go; s.onerror = go;',
    '  document.head.appendChild(s);',
    '  setTimeout(go, 4000);',
    '})();',
  ].join('\n');

  /** The program in its harness: a clear frame that runs the code and reports its parts. */
  function runDocument(id, code, w, h) {
    const safe = (s) => JSON.stringify(String(s)).replace(/<\//g, '<\\/');
    const script = RUN_HARNESS.replace('__W__', Math.round(w)).replace('__H__', Math.round(h)).replace('__ID__', safe(id)).replace('__CODE__', safe(code)).replace('__THREE__', JSON.stringify(THREE_CDN));
    return '<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;background:transparent;overflow:hidden;width:' + Math.round(w) + 'px;height:' + Math.round(h) + 'px}</style>' +
      '</head><body><script>' + script + '<\/script></body></html>';
  }

  // ===== A diagram said as Mermaid: the mermaid harness (V1-PLAN D2's surface) ====
  // A `mermaid` artifact is a text. Its frame is the run sandbox's twin — scripts
  // allowed, opaque origin, clear ground — loading mermaid.js the way three.js is
  // loaded (from a CDN, beside the text, never before it) and drawing the text
  // with it. The TEXT ALWAYS STANDS: it is shown at once, stays when the library
  // cannot load or cannot read it, and says which; only a diagram that was drawn
  // takes its place. Each node of the diagram is reported as a part named for its
  // Mermaid id, the way a program reports its parts, so ink over the diagram
  // lands on the node (`mermaidPartNames` in 25-mermaid.js says which marks).
  // The text is data and nothing here runs it: mermaid's `strict` level, in a
  // frame that can reach neither the page nor its keys. Nothing is played.
  const MERMAID_CDNS = [
    'https://cdnjs.cloudflare.com/ajax/libs/mermaid/11.4.0/mermaid.min.js',
    'https://cdn.jsdelivr.net/npm/mermaid@11.4.0/dist/mermaid.min.js',
  ];
  let mermaidSources = null; // a test's library instead of the CDN's (`mermaidFrom`)
  /** What each mermaid frame last said of itself: { state: 'rendered' | 'unavailable' | 'refused', why, shown: 'diagram' | 'text' }. Runtime, never the log. */
  const mermaidStates = new Map();
  const mermaidSourcesNow = () => (mermaidSources && mermaidSources.length ? mermaidSources : MERMAID_CDNS);
  /** Load the diagram library from these URLs (a test's stand-in), or from the CDN's when none: the frames draw again. Returns what it was. */
  function mermaidFrom(urls) {
    const before = mermaidSources;
    mermaidSources = Array.isArray(urls) && urls.length ? urls.slice() : null;
    if (JSON.stringify(before) !== JSON.stringify(mermaidSources)) render(session.getState());
    return before;
  }

  const MERMAID_HARNESS = [
    '(function(){',
    '  var W = __W__, H = __H__, ID = __ID__, TEXT = __TEXT__, SRC = __SRC__;',
    '  var out = document.getElementById("out"), src = document.getElementById("src"), note = document.getElementById("note");',
    '  function post(m){ m.mm = true; m.id = ID; parent.postMessage(m, "*"); }',
    '  // The text stands, and says why the diagram is not there.',
    '  function stands(state, why, said){ note.textContent = said; note.hidden = false; src.hidden = false; out.hidden = true; post({ type: "mermaid", state: state, why: why, shown: "text" }); }',
    '  window.onerror = function(msg){ stands("unavailable", String(msg), "the diagram could not be drawn — " + msg); };',
    '  var NODE = /^(?:flowchart|classId|stateDiagram|state|erDiagram|entity)-(.+)-\\d+$/;',
    '  function unionOf(els){',
    '    var x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9;',
    '    for (var i = 0; i < els.length; i++){ var r = els[i].getBoundingClientRect(); if (!(r.width > 0 || r.height > 0)) continue; x0 = Math.min(x0, r.left); y0 = Math.min(y0, r.top); x1 = Math.max(x1, r.right); y1 = Math.max(y1, r.bottom); }',
    '    return x1 > x0 && y1 > y0 ? { x: x0, y: y0, w: x1 - x0, h: y1 - y0 } : null;',
    '  }',
    '  // Each node of the diagram is a part named for its Mermaid id: a flowchart\'s and a class\'s by the id mermaid gives its group, a participant by the name on its box and its lifeline.',
    '  function partsOf(svg){',
    '    var parts = [], seen = {}, i, els = svg.querySelectorAll("[id]");',
    '    for (i = 0; i < els.length; i++){',
    '      var m = NODE.exec(els[i].id);',
    '      if (m && !seen[m[1]]){ seen[m[1]] = 1; var b = unionOf([els[i]]); if (b) parts.push({ id: m[1], x: b.x, y: b.y, w: b.w, h: b.h }); }',
    '    }',
    '    var named = svg.querySelectorAll("rect.actor[name], line.actor-line[name]"), byName = {}, order = [];',
    '    for (i = 0; i < named.length; i++){ var n = named[i].getAttribute("name"); if (!byName[n]){ byName[n] = []; order.push(n); } byName[n].push(named[i]); }',
    '    for (i = 0; i < order.length; i++){ var u = unionOf(byName[order[i]]); if (u && !seen[order[i]]) parts.push({ id: order[i], x: u.x, y: u.y, w: u.w, h: u.h }); }',
    '    return parts;',
    '  }',
    '  function show(markup){',
    '    out.innerHTML = markup;',
    '    var svg = out.querySelector("svg");',
    '    if (!svg) return stands("refused", "no diagram came back", "the diagram could not be drawn — nothing came back");',
    '    svg.setAttribute("width", W); svg.setAttribute("height", H); svg.style.maxWidth = "none"; svg.style.display = "block";',
    '    src.hidden = true; note.hidden = true; out.hidden = false;',
    '    var parts = partsOf(svg);',
    '    post({ type: "regions", regions: parts });',
    '    post({ type: "mermaid", state: "rendered", why: "", shown: "diagram" });',
    '    // Fonts arrive after the first layout and move the boxes: the parts are read again.',
    '    setTimeout(function(){ post({ type: "regions", regions: partsOf(svg) }); }, 600);',
    '  }',
    '  function refused(e){',
    '    var why = String(e && e.message || e).split("\\n")[0];',
    '    stands("refused", why, "Mermaid could not read this — " + why);',
    '  }',
    '  function draw(){',
    '    var lib = window.mermaid;',
    '    try {',
    '      lib.initialize({ startOnLoad: false, securityLevel: "strict", theme: "base", suppressErrorRendering: true, flowchart: { htmlLabels: false }, themeVariables: { fontFamily: "IBM Plex Mono, ui-monospace, Menlo, monospace", fontSize: "14px" } });',
    '      Promise.resolve(lib.render("mm-" + String(ID).replace(/\\W/g, "_"), TEXT)).then(function(r){ show(r.svg); }, refused);',
    '    } catch (e) { refused(e); }',
    '  }',
    '  // The library is loaded beside the text, from each source in turn; a source that is slow is given up on.',
    '  function load(i){',
    '    if (window.mermaid) return draw();',
    '    if (i >= SRC.length) return stands("unavailable", "the diagram library did not load", "the diagram could not be drawn — the diagram library did not load; this is its text");',
    '    var s = document.createElement("script"), done = false;',
    '    function next(){ if (done) return; done = true; load(i + 1); }',
    '    s.src = SRC[i]; s.async = true;',
    '    s.onload = function(){ if (done) return; done = true; if (window.mermaid) draw(); else load(i + 1); };',
    '    s.onerror = next;',
    '    setTimeout(next, 8000);',
    '    document.head.appendChild(s);',
    '  }',
    '  load(0);',
    '})();',
  ].join('\n');

  /** A mermaid artifact's document: its text standing, and the harness that draws it in place of the text when it can. */
  function mermaidDocument(id, text, w, h) {
    const safe = (s) => JSON.stringify(String(s)).replace(/<\//g, '<\\/');
    const ink = C ? C.ink : '#e8e4d9';
    // Function replacers: a `$&` in the text is text, not a pattern.
    const script = MERMAID_HARNESS.replace('__W__', () => String(Math.round(w))).replace('__H__', () => String(Math.round(h))).replace('__ID__', () => safe(id)).replace('__SRC__', () => JSON.stringify(mermaidSourcesNow()).replace(/<\//g, '<\\/')).replace('__TEXT__', () => safe(text)); // the text last: whatever it says is text
    const css = 'html,body{margin:0;padding:0;background:transparent;overflow:hidden;color:' + ink + ';}' +
      '#mmroot{position:relative;width:' + Math.round(w) + 'px;height:' + Math.round(h) + 'px;overflow:hidden;font:11px/1.45 "IBM Plex Mono",ui-monospace,Menlo,monospace;}' +
      '#src{margin:0;padding:0.55em 0.75em;white-space:pre-wrap;word-break:break-word;font:inherit;}' +
      '#note{margin:0;padding:0.3em 0.75em;opacity:0.6;font:inherit;}' +
      '#out{position:absolute;left:0;top:0;}' +
      // The diagram in the board's own ink, on a clear ground: fills and strokes are the ink's, whatever theme mermaid drew in.
      '#out .node rect,#out .node polygon,#out .node circle,#out .node ellipse,#out .node path,#out .actor,#out .classGroup rect{fill:transparent !important;stroke:' + ink + ' !important;}' +
      '#out text,#out tspan,#out .nodeLabel,#out .label text{fill:' + ink + ' !important;color:' + ink + ';stroke:none !important;}' +
      '#out .flowchart-link,#out .edgePath path,#out path.relation,#out .messageLine0,#out .messageLine1,#out .actor-line,#out .divider path{stroke:' + ink + ' !important;}' +
      '#out marker path,#out marker circle,#out .arrowMarkerPath,#out #arrowhead path{fill:' + ink + ' !important;stroke:' + ink + ' !important;}' +
      '#out .edgeLabel,#out .edgeLabel rect,#out .labelBkg,#out .cluster rect{fill:transparent !important;background:transparent !important;}';
    return '<!doctype html><html><head><meta charset="utf-8"><style>' + css + '</style></head><body>' +
      '<div id="mmroot"><pre id="src">' + esc(text) + '</pre><p id="note" hidden></p><div id="out" hidden></div></div>' +
      '<script>' + script + '<\/script></body></html>';
  }

  // What a running frame says: its parts, or that it broke.
  addEventListener('message', (e) => {
    const m = e.data;
    if (!m || m.mm !== true || typeof m.id !== 'string') return;
    const f = frames.get(m.id);
    if (!f || !f.iframe || f.iframe.contentWindow !== e.source) return; // only the frame that owns the id
    if (m.type === 'regions' && Array.isArray(m.regions)) { reported.set(m.id, m.regions); return; }
    // A diagram that was not drawn is not a broken program: the text stands and the frame says why (D2).
    if (m.type === 'mermaid') {
      mermaidStates.set(m.id, { state: String(m.state), why: String(m.why || ''), shown: m.shown === 'diagram' ? 'diagram' : 'text' });
      if (m.state === 'refused') {
        const node = state.nodes.get(m.id);
        flash((node && MM.wordOf(node) || 'the diagram') + ': Mermaid could not read it — ' + String(m.why || '').slice(0, 120));
      }
      return;
    }
    if (m.type === 'error') { markBroken(m.id, 'threw: ' + m.error); }
  });
  function reportedRegions(id) { return reported.get(id) || []; }

  /** Forward a pointer to a playing frame, in the frame's own pixels (SURFACE-v10-PLAN D2). */
  function postPointer(hit, type, e, w) {
    const win = hit.f.iframe && hit.f.iframe.contentWindow;
    if (!win) return;
    win.postMessage({ mmPointer: true, type: type, x: w.x - hit.x, y: w.y - hit.y, button: e.button || 0, pointerType: e.pointerType || 'mouse', shiftKey: !!e.shiftKey, altKey: !!e.altKey, ctrlKey: !!e.ctrlKey, metaKey: !!e.metaKey }, '*');
  }

  /**
   * Writing taken as text: the words where the writing was, fitted to the
   * ink's width and height (v10 F8). SVG text with `textLength` fits with no
   * script; the ground is clear so the text stands on the canvas like ink,
   * in the ink's colour; one region, `text`, so ink over it addresses it.
   */
  /** Up to this many lines, a text is a caption that fills its frame. */
  const TEXT_FITS_LINES = 8;
  const linesOf = (code) => String(code).split(/\r?\n/).filter((l) => l.trim()).length;

  function writingDocument(code, w, h) {
    const lines = String(code).split(/\r?\n/);
    if (!lines.length) lines.push('');
    const W = Math.max(1, Math.round(w)), H = Math.max(1, Math.round(h));
    const lineH = H / lines.length;
    let k = 0; // words are regions, numbered across the text: w1, w2 … (v10 F12)
    const svgText = lines.map((l, i) => {
      const words = l.split(/\s+/).filter(Boolean);
      const chars = words.reduce((a, wd) => a + wd.length, 0) + Math.max(0, words.length - 1);
      const unit = W / Math.max(1, chars); // one character's width, the line fitted to the frame
      const fs = Math.max(6, Math.min(lineH * 0.78, unit / 0.62));
      const y = lineH * i + lineH * 0.72;
      let x = 0, out = '';
      for (const wd of words) {
        k++;
        const wpx = wd.length * unit;
        out += '<text data-region="w' + k + '"' + (wd === '…' ? ' class="gap"' : '') + ' x="' + x.toFixed(1) + '" y="' + y.toFixed(1) + '" font-size="' + fs.toFixed(1) + '" textLength="' + wpx.toFixed(1) + '" lengthAdjust="spacing">' + esc(wd) + '</text>';
        x += wpx + unit;
      }
      return out;
    }).join('');
    return '<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;padding:0;background:transparent;overflow:hidden;}' +
      'svg{display:block;}text{font-family:"IBM Plex Mono",ui-monospace,Menlo,monospace;fill:' + (C ? C.ink : '#e8e4d9') + ';}text.gap{opacity:0.45;}' +
      'html.mm-reveal text{outline:1px dashed rgba(138,109,31,0.6);}</style></head>' +
      '<body><div id="mmroot" style="width:' + W + 'px;height:' + H + 'px"><svg xmlns="http://www.w3.org/2000/svg" width="' + W + '" height="' + H + '" viewBox="0 0 ' + W + ' ' + H + '">' + svgText + '</svg></div></body></html>';
  }

  /** The document an artifact's newest code rep renders as, by its kind. */
  function documentForKind(rep, w, h, ctx) {
    const kind = rep.data.kind || 'html';
    const code = rep.data.code;
    if (kind === 'html') return documentFor(code, w, h);
    // A few words are a CAPTION and fill their frame, so they scale with the
    // board the way the ink around them does; a file of text is a document and
    // flows at a size the screen holds. Writing turned to text was the first
    // caption, and the rule was written as "did it come from ink" — but a label
    // written onto a drawing is a caption however it arrived, and held at screen
    // size it floated free of the drawing it labels as soon as the board zoomed.
    if (kind === 'text' && (rep.data.from === 'writing' || linesOf(code) <= TEXT_FITS_LINES)) return writingDocument(code, w, h);
    if (kind === 'run') {
      // Playing, the program runs in its clear frame; standing, its source shows, addressable like any script.
      if (ctx && ctx.playing) return runDocument(ctx.id, code, w, h);
      return regionsDocument(code, MM.addressablesOf('js', code), w, h);
    }
    // A diagram said as Mermaid: its text stands, and the library draws it in place of the text when it can.
    if (kind === 'mermaid') return mermaidDocument(ctx && ctx.id || '', code, w, h);
    if (MM.isPictureKind(kind)) {
      const url = pictureSrc(rep);
      return '<!doctype html><html><head><meta charset="utf-8"><style>' + SOURCE_CSS +
        '#mmroot{width:' + Math.round(w) + 'px;height:' + Math.round(h) + 'px;display:flex;align-items:center;justify-content:center;}img{max-width:100%;max-height:100%;}</style></head>' +
        '<body><div id="mmroot" data-region="picture">' + (url ? '<img src="' + esc(url) + '" alt="">' : '<span class="gap">' + esc(rep.data.path || 'a picture') + '</span>') + '</div></body></html>';
    }
    const regions = MM.addressablesOf(kind, code);
    if (kind === 'svg') return svgDocument(code, regions, w, h);
    // Words written onto the board are a figure; a script or a table is source.
    if (kind === 'text') return regionsDocument(code, regions, w, h, { named: false, figure: true });
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

  /** The definition an artifact belongs to: what it is an instance of, else itself — core's (`MM.definitionOf`), the tools' too. */
  function definitionOf(s, artifactId) { return MM.definitionOf(s, artifactId); }

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
//   and run), frame and control rendering, the knob drag, exportFrameFiles. (Making a frame or a slider,
//   and finding a frame again, are core's `frames` and `control` tools, offered in the field.)
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
  // Framing artifacts, framing them like a frame built once, and making a drawn
  // slider are core's tools now (V1-PLAN B1: `frames`, `control` in
  // metamedium-core/src/tools/) — offered in the field and taken there. What
  // stays here is the surface's side: the harness applied, the knob, rendering.

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

// ===== assets (the pictures' bytes) =====
// Provides: the pure half of keeping pictures (PLAN-IPAD-NOTES I1) — sha256Hex (the digest an asset is
//   kept under), assetRef / isAssetRef, fitLongSide, pictureFormat / pictureExt (what a picture is kept
//   as), safePictureName / uniquePicturePath (the name and path it gets), assetsOfEvents / assetGcPlan
//   (which assets nothing uses any more), pictureCells / fitInCell / clearShift / pictureGrid / pickWords (where a pick is laid out and how the
//   status line says it) and pictureTier / decodedCost / evictPlan (what the decoded pictures cost and
//   which to let go), and what a picture needs to travel in a room (PLAN-IPAD-NOTES A1: roomAssetHashes, roomAssetUrl,
//   roomAssetRetryMs, roomAssetWords).
// Uses: NOTHING. Like 17-board.js this fragment names no closure variable and touches no DOM, no storage
//   and no session: bytes, sizes and clocks arrive as arguments, and what it decides leaves as values.
//   18-images.js is the adapter — IndexedDB, workers, canvas, the status line. Because it stands alone it
//   loads on its own in Node, which is how it is tested:  node --test Demos/surface/17-assets.test.mjs
// A fragment of one closure: Demos/build-surface.mjs concatenates surface/*.js
// in name order inside `(function () { ... })();`. Shared state is the
// closure's; no imports, no exports, no build step beyond the concatenation.
//
// WHY AN ASSET STORE. A picture's pixels used to be an in-memory blob URL: gone on reload, in no log, in no
// journal. The log is events and stays small; the bytes are kept beside it, once, under the SHA-256 of the
// bytes — so the same photo brought in twice is one asset, a duplicated board names the assets it already
// has, and an `import` event is a hundred bytes however big the picture.

  /** The longest side a kept picture has, in pixels: a 12 MP camera photo is 2,560 by 1,920 (PLAN-IPAD-NOTES §5.4). */
  const ASSET_LONG_SIDE = 2560;
  /** An asset stored this recently is never collected: another tab may be between its bytes and its event. */
  const ASSET_GRACE_MS = 30000;
  /** The long side a decoded picture has while the screen shows it small. */
  const PICTURE_THUMB_PX = 640;
  /** What the decoded pictures may cost together, in pixels (four bytes each): about 160 MB. */
  const DECODED_BUDGET_PX = 40000000;

  // ----- the digest -----------------------------------------------------------
  const SHA_K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da, 0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
  ];
  /**
   * The SHA-256 of some bytes as 64 hex digits — in plain code, so a page that is not a secure context (the
   * canvas opened from a machine on the local network) can still name an asset; the adapter asks the
   * browser's own `crypto.subtle` first and falls back to this.
   */
  function sha256Hex(bytes) {
    const n = bytes.length;
    const total = (((n + 9 + 63) >> 6) << 6);
    const buf = new Uint8Array(total);
    buf.set(bytes, 0);
    buf[n] = 0x80;
    const dv = new DataView(buf.buffer);
    dv.setUint32(total - 8, Math.floor((n * 8) / 4294967296), false);
    dv.setUint32(total - 4, (n * 8) >>> 0, false);
    const h = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
    const w = new Uint32Array(64);
    const rotr = (x, k) => (x >>> k) | (x << (32 - k));
    for (let off = 0; off < total; off += 64) {
      for (let i = 0; i < 16; i++) w[i] = dv.getUint32(off + i * 4, false);
      for (let i = 16; i < 64; i++) {
        const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
        const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
        w[i] = (w[i - 16] + s0 + w[i - 7] + s1) | 0;
      }
      let a = h[0], b = h[1], c = h[2], d = h[3], e = h[4], f = h[5], g = h[6], hh = h[7];
      for (let i = 0; i < 64; i++) {
        const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
        const ch = (e & f) ^ (~e & g);
        const t1 = (hh + S1 + ch + SHA_K[i] + w[i]) | 0;
        const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
        const maj = (a & b) ^ (a & c) ^ (b & c);
        const t2 = (S0 + maj) | 0;
        hh = g; g = f; f = e; e = (d + t1) | 0; d = c; c = b; b = a; a = (t1 + t2) | 0;
      }
      h[0] = (h[0] + a) | 0; h[1] = (h[1] + b) | 0; h[2] = (h[2] + c) | 0; h[3] = (h[3] + d) | 0;
      h[4] = (h[4] + e) | 0; h[5] = (h[5] + f) | 0; h[6] = (h[6] + g) | 0; h[7] = (h[7] + hh) | 0;
    }
    let out = '';
    for (let i = 0; i < 8; i++) out += (h[i] >>> 0).toString(16).padStart(8, '0');
    return out;
  }

  /** What an `import` event names an asset by. */
  function assetRef(hex) { return 'sha256:' + hex; }
  /** Core's own test (`ASSET_REF`): `sha256:` and 64 lower-case hex digits, nothing else. */
  function isAssetRef(v) { return typeof v === 'string' && /^sha256:[0-9a-f]{64}$/.test(v); }

  // ----- what a picture is kept as -----------------------------------------------
  /** A picture's size once its long side is held to `max`: never enlarged, never under a pixel a side. */
  function fitLongSide(w, h, max) {
    if (!(w > 0) || !(h > 0)) return { w: 1, h: 1, scaled: false };
    const long = Math.max(w, h);
    if (long <= max) return { w: Math.round(w), h: Math.round(h), scaled: false };
    const k = max / long;
    return { w: Math.max(1, Math.round(w * k)), h: Math.max(1, Math.round(h * k)), scaled: true };
  }
  /**
   * The format a picture is kept in: PNG where it has transparency (a JPEG would turn it black), WebP where
   * it came out clearly smaller than the JPEG (a tenth), else JPEG — which every browser draws and every
   * decoder reads. `webpBytes` is null where the browser would not write WebP.
   */
  function pictureFormat(o) {
    if (o.hasAlpha) return 'png';
    if (o.webpBytes && o.jpegBytes && o.webpBytes < o.jpegBytes * 0.9) return 'webp';
    return 'jpeg';
  }
  /** The extension and kind a format is kept under. */
  function pictureExt(format) { return format === 'jpeg' ? 'jpg' : format; }

  /** A file's name, made safe for a path: the characters a path may hold, a run of the others one dash. */
  function safePictureName(name) {
    const s = String(name == null ? '' : name).replace(/[^A-Za-z0-9._-]+/g, '-');
    return s && s !== '-' ? s : 'picture';
  }
  /**
   * A picture's path in the board: `imports/<name>.<ext>` — the extension the picture is KEPT as — and a
   * counter when two pictures share a name (cameras call every file `image.jpg`). The path is a label; the
   * picture's identity is its asset.
   */
  function uniquePicturePath(name, taken, ext) {
    let stem = safePictureName(name);
    const dot = stem.lastIndexOf('.');
    if (dot > 0 && /^[A-Za-z0-9]{1,5}$/.test(stem.slice(dot + 1))) stem = stem.slice(0, dot);
    if (!stem) stem = 'picture';
    let path = 'imports/' + stem + '.' + ext;
    for (let n = 2; taken && taken.has(path); n++) path = 'imports/' + stem + '-' + n + '.' + ext;
    return path;
  }

  // ----- which assets are used -------------------------------------------------------
  /** The assets a log's pictures name, each once. */
  function assetsOfEvents(events) {
    const out = new Set();
    if (!events) return out;
    for (const ev of events) if (ev && ev.type === 'import' && isAssetRef(ev.asset)) out.add(ev.asset);
    return out;
  }
  /**
   * What collecting does: an asset no board uses goes — unless it is new (another tab may be between its
   * bytes and its event) or in flight in this one. `held` is `[{ hash, at }]`, `used` a set of hashes.
   */
  function assetGcPlan(held, used, o) {
    const now = o.now, grace = o.graceMs === undefined ? ASSET_GRACE_MS : o.graceMs, pending = o.pending || new Set();
    const drop = [], keep = [];
    for (const a of held) {
      const idle = !used.has(a.hash) && !pending.has(a.hash) && !(grace > 0 && now - (a.at || 0) < grace);
      (idle ? drop : keep).push(a.hash);
    }
    return { drop, keep };
  }

  // ----- a pick, laid out ----------------------------------------------------------------
  /**
   * The cells a pick of `n` is laid out in: a grid in the view (the area of the board the hand is looking at),
   * in reading order — left to right, then down. One is a large cell; many are small enough to stand in the
   * view together, so a pick of ten is never ten on one point. Cells have a floor, so a pick of thirty runs
   * past the view rather than into dust. A cell depends on the count and the view, never on the pictures, so
   * a pick can be placed one picture at a time as each is ready.
   * @returns {Array<{x:number,y:number,w:number,h:number}>}
   */
  function pictureCells(n, view) {
    if (!(n > 0)) return [];
    const vw = Math.max(1, view.maxX - view.minX), vh = Math.max(1, view.maxY - view.minY);
    const margin = Math.min(vw, vh) * 0.05, gap = margin;
    const FLOOR = 100;
    let cols, rows, cw, ch;
    if (n === 1) { cols = 1; rows = 1; cw = vw * 0.6; ch = vh * 0.6; }
    else {
      cols = Math.min(n, Math.max(1, Math.round(Math.sqrt(n * vw / vh))));
      rows = Math.ceil(n / cols);
      cw = Math.max(FLOOR, (vw - 2 * margin - (cols - 1) * gap) / cols);
      ch = Math.max(FLOOR, (vh - 2 * margin - (rows - 1) * gap) / rows);
    }
    const out = [];
    for (let i = 0; i < n; i++) {
      const col = i % cols, row = Math.floor(i / cols);
      out.push({ x: view.minX + margin + col * (cw + gap), y: view.minY + margin + row * (ch + gap), w: cw, h: ch });
    }
    return out;
  }
  /**
   * How far right a grid of cells must stand to be clear of what is already on the board: none if the view's own
   * place is free; else just past what is in the way, and past what is in the way there, until it is clear — so a
   * second picture never lands on the first, and a pick never lands on the writing it was brought in beside.
   * `boxes` are the board's marks as `{ minX, minY, maxX, maxY }`. With no clear place in reach, none.
   * @returns {{dx:number, dy:number, moved:boolean}}
   */
  function clearShift(cells, boxes, gap) {
    if (!cells.length) return { dx: 0, dy: 0, moved: false };
    const r = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
    for (const c of cells) { r.minX = Math.min(r.minX, c.x); r.minY = Math.min(r.minY, c.y); r.maxX = Math.max(r.maxX, c.x + c.w); r.maxY = Math.max(r.maxY, c.y + c.h); }
    let dx = 0;
    for (let i = 0; i < 24; i++) {
      const hit = boxes.filter((b) => b.maxX > r.minX + dx && b.minX < r.maxX + dx && b.maxY > r.minY && b.minY < r.maxY);
      if (!hit.length) return { dx: dx, dy: 0, moved: dx !== 0 };
      dx = Math.max(...hit.map((b) => b.maxX)) + gap - r.minX;
    }
    return { dx: 0, dy: 0, moved: false };
  }
  /** A picture of a size, fitted into a cell with its own proportions, standing at the cell's top left. */
  function fitInCell(size, cell) {
    const sw = Math.max(1, size.w || 1), sh = Math.max(1, size.h || 1);
    const k = Math.min(cell.w / sw, cell.h / sh);
    return { x: cell.x, y: cell.y, w: sw * k, h: sh * k };
  }
  /** Where a whole pick stands, each picture fitted into its cell: `sizes` are `{ w, h }` (the proportions are what is used). */
  function pictureGrid(sizes, view) {
    const cells = pictureCells(sizes.length, view);
    return sizes.map((s, i) => fitInCell(s, cells[i]));
  }
  /** How far a pick has come, said to the person: *3 of 10 pictures*, or *1 picture*. */
  function pickWords(i, n) {
    return n <= 1 ? '1 picture' : i + ' of ' + n + ' pictures';
  }

  // ----- what the decoded pictures cost ------------------------------------------------------
  /** Whether the screen wants a picture large or small: small while it is drawn no larger than a thumbnail. */
  function pictureTier(longSidePx) { return longSidePx <= PICTURE_THUMB_PX ? 'thumb' : 'full'; }
  /** What a decoded picture costs in pixels: its own, or a thumbnail's. */
  function decodedCost(size, tier) {
    const w = Math.max(1, size.w || 1), h = Math.max(1, size.h || 1);
    if (tier === 'full') return w * h;
    const k = Math.min(1, PICTURE_THUMB_PX / Math.max(w, h));
    return Math.max(1, Math.round(w * k) * Math.round(h * k));
  }
  /**
   * Which decoded pictures to let go: while they cost more than the budget, the least recently drawn first —
   * never one drawn in the latest paint (`drawn >= paintedAt`), whatever the budget says.
   * @param entries `[{ key, cost, drawn }]`
   */
  function evictPlan(entries, o) {
    let total = 0;
    for (const e of entries) total += e.cost;
    if (total <= o.budgetPx) return [];
    const out = [];
    const idle = entries.filter((e) => e.drawn < o.paintedAt).sort((a, b) => a.drawn - b.drawn);
    for (const e of idle) {
      if (total <= o.budgetPx) break;
      out.push(e.key);
      total -= e.cost;
    }
    return out;
  }

  // ----- pictures in a room (PLAN-IPAD-NOTES A1) -------------------------------------------------
  // A room carries LOG LINES, and an `import` event names a picture's bytes by their hash and carries none. So a tab
  // that publishes such an event puts the bytes on the room's relay first (`PUT /rooms/<room>/assets/<sha256>`), and a
  // tab that merges one it holds no bytes for asks for them by that hash. What decides it is here; 17-folder.js (the
  // relay transport, which does the asking) and 18-images.js (which draws the picture when it lands) are the adapters.

  /** The most a room takes of one picture, in bytes — the relay's own limit (relay-protocol.mjs `MAX_ASSET_BYTES`). */
  const ROOM_ASSET_MAX_BYTES = 12 * 1024 * 1024;
  /** How long, in ms, before a picture the room did not hold is asked for again, each wait longer — then it is left. */
  const ROOM_ASSET_RETRY_MS = [1500, 4000, 10000, 25000];

  /** The pictures a line sent to a room names, as bare hashes (what the relay's address takes), each once. */
  function roomAssetHashes(line) {
    const out = [];
    const events = line && Array.isArray(line.events) ? line.events : [];
    for (const ev of events) {
      if (!ev || ev.type !== 'import' || !isAssetRef(ev.asset)) continue;
      const hex = ev.asset.slice('sha256:'.length);
      if (out.indexOf(hex) < 0) out.push(hex);
    }
    return out;
  }
  /** Where a room keeps a picture: the relay, the room as text, the bare hash — from a `sha256:` reference or a hash; null for neither. */
  function roomAssetUrl(relay, room, ref) {
    const hex = typeof ref === 'string' ? ref.replace(/^sha256:/, '') : '';
    if (!/^[0-9a-f]{64}$/.test(hex)) return null;
    return String(relay).replace(/\/+$/, '') + '/rooms/' + encodeURIComponent(room) + '/assets/' + hex;
  }
  /** How long to wait before asking again for a picture the room did not hold, the `n`th time (from 0) — or null: it is left. */
  function roomAssetRetryMs(n) {
    return n >= 0 && n < ROOM_ASSET_RETRY_MS.length ? ROOM_ASSET_RETRY_MS[n] : null;
  }
  /** What the room's answer to a put is said as, to the person: the relay's own sentence where it sent one. */
  function roomAssetWords(status, body) {
    const said = String(body || '').trim();
    const why = status === 0 ? 'the room could not be reached — the picture stays on this device'
      : status === 401 || status === 403 ? 'the room does not take this key — the picture stays on this device'
      : said || ('the room answered ' + status);
    return 'a picture could not go to the room — ' + why;
  }

// ===== board (the journal) =====
// Provides: the board this browser keeps, as an APPEND-ONLY JOURNAL (V1-PLAN.md §9 R3) — the
//   pure half: journalText / journalEvents (one event per line, the folder's own format),
//   journalDiff (what the store must hear to hold the log as it now stands), journalFold (the
//   records read back into the log), createJournal (when a record is written, what a failure
//   does, when the whole log is written again), openPlan (what opening the store puts on the
//   board, and the one import of browser storage's old whole-log copy), troubleOf (a storage
//   error, as a kind) and troubleWords (what the status line says about it).
// Uses: NOTHING. Like 09-field.js this fragment names no closure variable and touches no DOM,
//   no storage and no session: the store arrives as a backend object, the clock as a function,
//   and what it decides leaves as records and states. 17-folder.js is the adapter — IndexedDB,
//   browser storage, the session, the status line. Because it stands alone it loads on its own
//   in Node, which is how it is tested:  node --test Demos/surface/17-board.test.mjs
// A fragment of one closure: Demos/build-surface.mjs concatenates surface/*.js
// in name order inside `(function () { ... })();`. Shared state is the
// closure's; no imports, no exports, no build step beyond the concatenation.
//
// WHY A JOURNAL. The board used to be kept as ONE string in browser storage, the whole log
// rewritten 900 ms after every change. Browser storage takes about five million characters under
// a key, and a board's log runs three to five thousand a mark, so saving stopped at 1,100–1,600
// marks — and the error was swallowed (PERF.md, hotspot 7). A person writing a page of formulas
// by hand reaches that in an afternoon and loses it on the next reload with nothing said.
//
// THE RECORD. `{ seq, on, base, n, text }`: keep the first `base` events of the log, then append
// the `n` events in `text` (one per line). A stroke is `{ base: <length before>, n: 1 }`; an undo
// is `{ base: <where the event was>, n: 0 }` — the log only ever changes at its end, so every
// change is a record like these, and nothing is rewritten. A record with `base: 0` is the WHOLE
// log: it starts a new chain (`on === seq`), and the transaction that adds it deletes every
// record before it — the compaction, for free. Every other record names the chain it continues
// (`on`), so an append made on top of a whole log that never landed is never applied to
// anything else.
//
// THE TRAP. IndexedDB is asynchronous, and a tab can die between the event and the write. So
// nothing here waits: the adapter hears the session BEFORE the paint (a release on a big board
// paints for seconds), `sync` issues the record in that same task, and the backend's
// transaction is begun — and committed — before `append` returns. The kill test
// (e2e/keep.mjs) is the only honest check of that, and it kills at random points.

  /** One event per line, a trailing newline — `encodeLog`'s format, so a record is a piece of a log file. */
  function journalText(events) {
    let out = '';
    for (const ev of events) out += JSON.stringify(ev) + '\n';
    return out;
  }
  /** Lines back into events; a line that does not parse is counted, never fatal. */
  function journalEvents(text) {
    const events = [];
    let bad = 0;
    for (const line of String(text || '').split('\n')) {
      const l = line.trim();
      if (!l) continue;
      try { events.push(JSON.parse(l)); } catch (err) { bad++; }
    }
    return { events, bad };
  }

  /**
   * What the store must hear so that it holds `next`, given it holds (or will, once every record
   * issued has landed) the first `len` events of `prev`. Events are compared by IDENTITY: the
   * session pushes onto one array and makes a new array only to undo (the same events, one left
   * out) or to load (every event copied). So a push is an append from `len`, an undo is a cut
   * where the undone event stood, and a load is the whole log again.
   * @returns {null | {base:number, events:Array}} null when nothing changed
   */
  function journalDiff(prev, len, next) {
    if (next === prev) {
      if (next.length === len) return null;
      if (next.length > len) return { base: len, events: next.slice(len) };
      return { base: next.length, events: [] }; // shrank in place: never done, but a prefix is a prefix
    }
    const m = Math.min(len, next.length);
    let p = 0;
    while (p < m && next[p] === prev[p]) p++;
    return { base: p, events: next.slice(p) };
  }

  /**
   * The records, back into the log. In seq order: a whole log (base 0) starts a chain; any other
   * record applies only on its own chain and only where its base is within what stands — one
   * written on top of a record that never landed is SKIPPED and counted, never applied to
   * something it was not written against.
   */
  function journalFold(records) {
    const rs = records.slice().sort((a, b) => a.seq - b.seq);
    let log = [];
    let chain = 0, sinceFull = 0, lastSeq = 0, bad = 0;
    const skipped = [];
    for (const r of rs) {
      if (r.seq > lastSeq) lastSeq = r.seq;
      const full = r.base === 0;
      if (!full && (r.on !== chain || !(r.base <= log.length))) { skipped.push(r.seq); continue; }
      const d = journalEvents(r.text);
      if (d.bad || (typeof r.n === 'number' && r.n !== d.events.length)) bad++;
      if (full) { log = d.events; chain = r.seq; sinceFull = 0; continue; }
      log.length = r.base;
      for (const ev of d.events) log.push(ev);
      sinceFull++;
    }
    return { events: log, chain, sinceFull, lastSeq, skipped, bad };
  }

  /** Browser storage's old copy of the board: the whole log as one JSON array, or nothing. */
  function legacyEventsOf(raw) {
    if (typeof raw !== 'string' || !raw) return null;
    try {
      const evs = JSON.parse(raw);
      return Array.isArray(evs) ? evs : null;
    } catch (err) { return null; }
  }

  /**
   * What opening the store puts on the board and how the journal starts, from what the store
   * holds. Pure: the adapter reads, this decides, the adapter acts.
   *   meta     — the board's meta record, or null when no owner has opened this store before
   *   records  — its records
   *   legacy   — browser storage's old whole-log copy (the raw string), or null
   *   owner    — whether this page holds the board (it may write), or another tab does
   *   fallback — no IndexedDB here: browser storage IS the store, as it was before
   * The old copy is IMPORTED ONCE, UNCHANGED, the first time an owner opens the store: its
   * events stand on the board, and the journal writes them as the first whole log, with the meta
   * record in the same transaction. Until that lands the old copy is left where it is
   * (`meta` rides with the record, and the adapter removes the copy when it hears it landed).
   * @returns {{ events: Array, from: string, arm: object|null, damaged: object|null, lastSeq: number }}
   */
  function openPlan(o) {
    const legacy = legacyEventsOf(o.legacy);
    if (o.fallback) {
      // Browser storage holds the log it held: the journal starts from it, and writes what follows.
      return { events: legacy || [], from: legacy && legacy.length ? 'browser storage' : 'nothing', arm: { seq: 0, chain: 0, sinceFull: 0, whole: false }, damaged: null, lastSeq: 0 };
    }
    const fold = journalFold(o.records || []);
    const opened = !!o.meta || (o.records || []).length > 0;
    const damaged = fold.skipped.length || fold.bad ? { skipped: fold.skipped.length, bad: fold.bad } : null;
    if (!opened) {
      const events = legacy || [];
      if (!o.owner) return { events, from: events.length ? 'browser storage' : 'nothing', arm: null, damaged: null, lastSeq: fold.lastSeq };
      return {
        events,
        from: events.length ? 'browser storage' : 'nothing',
        // Nothing is in the store yet: the whole log is what it must hear first.
        arm: { seq: fold.lastSeq, chain: 0, sinceFull: 0, whole: true, meta: { v: 1, created: o.now || 0, imported: legacy ? legacy.length : 0 } },
        damaged: null,
        lastSeq: fold.lastSeq,
      };
    }
    return {
      events: fold.events,
      from: 'store',
      arm: o.owner ? { seq: fold.lastSeq, chain: fold.chain, sinceFull: fold.sinceFull, whole: !!damaged } : null,
      damaged,
      lastSeq: fold.lastSeq,
    };
  }

  /** A storage error, as what it means to the person. `where`: 'open' | 'read' | 'write' | 'folder'. */
  function troubleOf(err, where) {
    const name = (err && err.name) || '';
    const msg = (err && err.message) || String(err || '');
    const detail = (name && name !== 'Error' ? name : '') + (msg ? (name && name !== 'Error' ? ': ' : '') + msg : '');
    if (where === 'folder') return { kind: 'folder', detail: detail || 'the folder refused' };
    if (/quota/i.test(name) || /quota|exceeded the quota|storage (is )?full/i.test(msg)) return { kind: 'full', detail: name || 'QuotaExceededError' };
    if (name === 'SecurityError' || name === 'NotAllowedError' || (name === 'InvalidStateError' && where === 'open')) return { kind: 'blocked', detail: detail };
    if (name === 'ConstraintError') return { kind: 'elsewhere', detail: detail };
    if (where === 'read') return { kind: 'unreadable', detail: detail };
    return { kind: 'refused', detail: detail || 'no reason given' };
  }

  /**
   * What the status line says about a trouble: the sentence, then the ways out. Plain words; the
   * adapter renders the ways as buttons in the line, so the line reads as one sentence.
   */
  function troubleWords(t) {
    if (!t) return null;
    const lead = {
      full: "not saved — the browser's storage for this page is full",
      blocked: 'not saved — this browser will not let the page keep anything (a private window, or site data blocked)',
      tab: 'not saved here — this board is open in another tab (close that one and reload to go on here)',
      elsewhere: 'not saved here — another tab changed this board (reload to pick it up)',
      unreadable: 'not saved — the board this browser kept could not be read (' + t.detail + ')',
      folder: 'not saved — the folder refused the write (' + t.detail + ')',
      refused: 'not saved — the browser refused to keep the board (' + t.detail + ')',
    }[t.kind] || 'not saved — ' + (t.detail || 'the browser refused');
    return { lead, ways: ['export', 'folder'] };
  }
  const troubleKey = (t) => (t ? t.kind + ':' + (t.detail || '') : '');

  /**
   * The journal: the state machine between the session and a store. `backend.append(record,
   * { compact, meta })` must BEGIN its write before it returns (it returns a promise of the
   * write landing): `sync` is called in the task that made the change, and a tab can die in the
   * next one.
   *
   * States: 'waiting' (the store is being opened; changes are held in the session, not lost),
   * 'armed' (this page holds the board and writes it), 'readonly' (another tab holds it; the
   * trouble says so), 'off' (a folder or a live room keeps this page's log instead).
   *
   * opts: now() → ms; retryMs (the least time between two tries of the whole log while writes
   * fail); compactEvery (records on one chain before the next write is the whole log again);
   * onTrouble(trouble, was) when the trouble changes; onLanded({ seq, whole, meta }).
   */
  function createJournal(backend, opts) {
    opts = opts || {};
    const now = opts.now || (() => 0);
    const retryMs = opts.retryMs === undefined ? 1500 : opts.retryMs;
    const compactEvery = opts.compactEvery || 1000;
    const EMPTY = [];
    const j = {
      state: 'waiting', trouble: null,
      seq: 0, chain: 0, arr: EMPTY, len: 0, sinceFull: 0,
      needWhole: false, lastTry: -Infinity, failedSeq: 0, meta: null, dirty: false,
      inFlight: 0, issued: 0, landed: 0, failures: 0, wholes: 0,
    };
    const waiters = [];

    function setTrouble(t) {
      const was = j.trouble;
      j.trouble = t;
      if (troubleKey(was) !== troubleKey(t) && opts.onTrouble) opts.onTrouble(t, was);
    }

    function issue(base, events, next) {
      const whole = base === 0;
      const seq = ++j.seq;
      if (whole) { j.chain = seq; j.sinceFull = 0; j.wholes++; } else j.sinceFull++;
      const rec = { seq, on: j.chain, base, n: events.length, text: journalText(events) };
      j.arr = next; j.len = next.length;
      j.inFlight++; j.issued++;
      const meta = whole ? j.meta : null;
      let p;
      try { p = Promise.resolve(backend.append(rec, { compact: whole, meta })); } catch (err) { p = Promise.reject(err); }
      p.then(() => landed(rec, whole, meta), (err) => failed(rec, err));
      return rec;
    }
    function settle() {
      if (j.inFlight) return;
      while (waiters.length) waiters.shift()();
    }
    function landed(rec, whole, meta) {
      j.inFlight--; j.landed++;
      if (meta && j.meta === meta) j.meta = null;
      // A whole log landed, issued after the last failure and with none since: the store holds
      // the board again, and the line can stop saying it does not.
      if (whole && j.state === 'armed' && j.trouble && !j.needWhole && rec.seq > j.failedSeq) setTrouble(null);
      if (opts.onLanded) opts.onLanded({ seq: rec.seq, whole, meta });
      settle();
    }
    function failed(rec, err) {
      j.inFlight--; j.failures++;
      if (rec.seq > j.failedSeq) j.failedSeq = rec.seq;
      // What the store holds is no longer certain: the next write is the whole log.
      j.needWhole = true;
      if (j.state === 'armed') setTrouble(troubleOf(err, 'write'));
      settle();
    }
    function whole(next) {
      j.needWhole = false;
      j.lastTry = now();
      j.dirty = false;
      return issue(0, next, next);
    }

    /** The session changed (or may have): write what the store has not heard. */
    function sync(next) {
      if (j.state !== 'armed') { if (j.state !== 'off') j.dirty = true; return null; }
      if (j.needWhole) {
        if (now() - j.lastTry < retryMs) { j.dirty = true; return null; }
        return whole(next);
      }
      const d = journalDiff(j.arr, j.len, next);
      if (!d) return null;
      if (d.base === j.len && !d.events.length) { j.arr = next; return null; } // the same log, in a new array
      if (d.base === 0 || j.sinceFull + 1 >= compactEvery) return whole(next);
      j.dirty = false;
      return issue(d.base, d.events, next);
    }

    return {
      /** This page holds the board: `arr`/`len` is what the store holds (the loaded log), or nothing. */
      arm(o) {
        o = o || {};
        j.state = 'armed';
        if ((o.seq || 0) > j.seq) j.seq = o.seq;
        j.chain = o.chain || 0;
        j.sinceFull = o.sinceFull || 0;
        j.arr = o.arr || EMPTY;
        j.len = o.arr ? (o.len === undefined ? o.arr.length : o.len) : 0;
        if (o.whole) { j.needWhole = true; j.lastTry = -Infinity; }
        if (o.meta) j.meta = o.meta;
        if (j.trouble && (j.trouble.kind === 'tab' || j.trouble.kind === 'elsewhere')) setTrouble(null);
      },
      /** Another tab holds the board: nothing here is written, and the trouble says so. */
      readonly(t) { j.state = 'readonly'; setTrouble(t || { kind: 'tab', detail: '' }); },
      /** A folder or a room keeps this page's log now: the journal stops, and its trouble is not this page's any more. */
      off() { j.state = 'off'; setTrouble(null); },
      /** The store could not be opened or read: said, and nothing is written over what could not be read. */
      broken(t) { j.state = 'readonly'; setTrouble(t); },
      sync,
      /** Try now: the way out of a page (pagehide) and the retry timer. The whole log if a write failed. */
      flush(next) {
        if (j.state !== 'armed') return null;
        if (j.needWhole) j.lastTry = -Infinity;
        return sync(next);
      },
      /** The store was emptied (Reset): the next change is written whole, from nothing. */
      reset() {
        j.arr = EMPTY; j.len = 0; j.chain = 0; j.sinceFull = 0; j.needWhole = false; j.dirty = false;
        if (j.state === 'armed' && j.trouble) setTrouble(null);
      },
      /** Resolves when every record issued so far has landed or failed. */
      idle() { return j.inFlight ? new Promise((r) => waiters.push(r)) : Promise.resolve(); },
      get state() { return j.state; },
      get trouble() { return j.trouble; },
      snapshot() {
        return {
          state: j.state, trouble: j.trouble, seq: j.seq, chain: j.chain, len: j.len, sinceFull: j.sinceFull,
          needWhole: j.needWhole, dirty: j.dirty, inFlight: j.inFlight, issued: j.issued, landed: j.landed,
          failures: j.failures, wholes: j.wholes,
        };
      },
    };
  }

// ===== boards (the list) =====
// Provides: several named boards this browser keeps (V1-PLAN §9 R1) — the pure half: boardName (a
//   name as typed), boardShelves (the boards, the trash, the recent places), listPlan (R3's board as
//   the first entry), nextBoardName / newBoardEntry / copyName / copyEntry / renamed / trashed /
//   restored (the entries), pickBoard (which board a page opens), nextAfter (where the page goes when
//   the board on screen goes to the trash), emptyTrashPlan (what emptying the trash will take, said
//   plainly), agoWords / sizeWords / kindWords / boardRows (what the pane shows), countMarks / statsOf
//   / statsAfter (what a board holds, kept up as records land), placeEntry / placesPlan (folders,
//   repositories and sites as recent places), leaveVerdict (whether the board on screen may be left),
//   switchPlan (what opening an entry does), boardTitle / boardSearch (the page's title and address),
//   and the examples (R5) — EXAMPLES_BASE / exampleUrl (where boards/examples stands from the page),
//   exampleRows (the pane's Examples, read from the index and never trusted), exampleName (what a board
//   made from one is called), starterOf (which one a first run's tap opens), and what the iPad needs kept
//   (PLAN-IPAD-NOTES I3) — spaceWords / storageWords (how much room this browser holds and has left, and
//   whether it may clear it, in words) and persistPlan / PERSIST_KEY (when the app asks the browser to keep
//   the device's storage: once, when a board holds something).
// Uses: NOTHING. Like 17-board.js (R3's journal: ONE board's log) this fragment names no closure
//   variable and touches no DOM, no storage and no session; 17-folder.js is the adapter (IndexedDB,
//   the lock, the switch) and 22-boards.js the pane. Tested on its own in Node:
//   node --test Demos/surface/17-boards.test.mjs
// A fragment of one closure: Demos/build-surface.mjs concatenates surface/*.js
// in name order inside `(function () { ... })();`. Shared state is the
// closure's; no imports, no exports, no build step beyond the concatenation.
//
// A BOARD IS ITS LOG. Each board is its own R3 journal, keyed by the board's id; its entry in the
// list says what it is called, when it was made, opened, and put in the trash — and nothing of what
// it holds. The NAME IS SHOWN, NEVER USED AS THE KEY: a rename changes one field of one entry, so it
// can never orphan a journal, and two boards may share a name. The board R3 kept is the first entry,
// under the key R3 kept it under ("default"), unchanged.
//
// NOTHING IS ONE TAP FROM LOST. Deleting moves a board to the trash, from which it comes back whole;
// only emptying the trash deletes, it is its own act, and what it will take is said — by name, with
// what each holds, "for good" — before it happens. A board open in another tab is never emptied.

  const FIRST_BOARD = 'default';
  const FIRST_BOARD_NAME = 'My board';
  const BOARD_NAME_MAX = 80;
  /** How many recent places (folders, repositories, sites) the list remembers. */
  const RECENT_MAX = 12;
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  /** A name as typed: its runs of space collapsed, trimmed, not too long. Nothing is not a name (null). */
  function boardName(raw) {
    if (typeof raw !== 'string') return null;
    const t = raw.replace(/\s+/g, ' ').trim();
    return t ? t.slice(0, BOARD_NAME_MAX).trim() : null;
  }
  /** A board this browser keeps — as against a place (a folder, a repository, a site) it only remembers. */
  function isKept(e) { return !!e && e.kind === 'board'; }

  const idOrder = (a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
  const byMade = (a, b) => (a.created || 0) - (b.created || 0) || idOrder(a, b);
  const byOpened = (a, b) => (b.opened || 0) - (a.opened || 0) || byMade(a, b);

  /**
   * The list, shelved: the boards in the order they were made (a list whose rows keep their
   * places), the trash newest first, the recent places most recently opened first.
   */
  function boardShelves(entries) {
    const all = (entries || []).filter(Boolean);
    const kept = all.filter(isKept);
    return {
      boards: kept.filter((e) => !e.trashed).sort(byMade),
      trash: kept.filter((e) => e.trashed).sort((a, b) => b.trashed - a.trashed || byMade(a, b)),
      places: all.filter((e) => !isKept(e)).sort(byOpened),
    };
  }

  /**
   * The list as read, and what to write so it holds a board: a list with no board at all — the
   * first read of a browser that kept one board under R3, or none — gets R3's board as its first
   * entry, "My board", under R3's own key (its journal is not moved, renamed or rewritten). A list
   * whose every board is in the trash is left alone: which board opens is pickBoard's to say.
   * `meta` is R3's meta record for that key, when there is one (its `created` is kept).
   */
  function listPlan(entries, now, meta) {
    entries = entries || [];
    if (entries.some(isKept)) return { entries, put: [] };
    const first = { id: FIRST_BOARD, kind: 'board', name: FIRST_BOARD_NAME, created: (meta && meta.created) || now, opened: 0, trashed: 0 };
    return { entries: entries.concat([first]), put: [first] };
  }

  /** A name for a new board: "My board" when there is no other on the list, else "Board 2", "Board 3" … (a name in the trash is taken). */
  function nextBoardName(entries) {
    const kept = (entries || []).filter(isKept);
    if (!kept.some((e) => !e.trashed)) return FIRST_BOARD_NAME;
    const taken = new Set(kept.map((e) => e.name));
    for (let n = 2; ; n++) if (!taken.has('Board ' + n)) return 'Board ' + n;
  }
  /** A new board's entry. `id` is minted by the adapter; `name`, as typed, or the next free one. */
  function newBoardEntry(entries, id, now, name) {
    return { id, kind: 'board', name: boardName(name) || nextBoardName(entries), created: now, opened: 0, trashed: 0 };
  }
  /** "Sketch copy", then "Sketch copy 2" … — room is left for the suffix, so a long name still gets one. */
  function copyName(entries, name) {
    const stem = (boardName(name) || FIRST_BOARD_NAME).slice(0, BOARD_NAME_MAX - 16).trim() + ' copy';
    const taken = new Set((entries || []).filter(isKept).map((e) => e.name));
    if (!taken.has(stem)) return stem;
    for (let n = 2; ; n++) if (!taken.has(stem + ' ' + n)) return stem + ' ' + n;
  }
  /** A copy's entry: its own id — so its own journal — and where it came from. */
  function copyEntry(entries, src, id, now) {
    return { id, kind: 'board', name: copyName(entries, src && src.name), created: now, opened: 0, trashed: 0, from: src ? src.id : null };
  }
  /** The same entry — the same id, so the same journal — under a new name; null when there is nothing to change. */
  function renamed(entry, raw) {
    const name = boardName(raw);
    if (!entry || !name || name === entry.name) return null;
    return Object.assign({}, entry, { name });
  }
  function trashed(entry, now) { return Object.assign({}, entry, { trashed: now || 1 }); }
  function restored(entry) { return Object.assign({}, entry, { trashed: 0 }); }

  /**
   * Which board a page opens: the one the address names — out of the trash, if it was there (it is
   * being used) — else the one opened most recently (never opened: the first made), else a new one.
   * An id this browser does not hold is `missing`, and said; a place is not a board.
   */
  function pickBoard(entries, requested) {
    const kept = (entries || []).filter(isKept);
    if (requested) {
      const e = kept.find((x) => x.id === requested);
      if (e) return { id: e.id, restore: !!e.trashed, missing: null, make: false };
    }
    const missing = requested || null;
    const live = kept.filter((e) => !e.trashed).sort(byOpened);
    if (!live.length) return { id: null, restore: false, missing, make: true };
    return { id: live[0].id, restore: false, missing, make: false };
  }
  /** Where the page goes when the board on screen goes to the trash: the board opened most recently among the rest, or null (a new one). */
  function nextAfter(entries, leavingId) {
    const live = (entries || []).filter((e) => isKept(e) && !e.trashed && e.id !== leavingId).sort(byOpened);
    return live.length ? live[0].id : null;
  }

  const listWords = (xs) => (xs.length <= 1 ? xs.join('') : xs.slice(0, -1).join(', ') + ' and ' + xs[xs.length - 1]);
  /** What a board holds, in marks: "42 marks", "1 mark", "empty". */
  function marksWords(stat) {
    if (!stat) return 'size not known yet';
    if (!stat.events && !stat.marks) return 'empty';
    return stat.marks + ' mark' + (stat.marks === 1 ? '' : 's');
  }
  function bytesWords(chars) {
    const c = chars || 0;
    if (c < 1024) return 'under 1 KB';
    if (c < 1024 * 1024) return Math.round(c / 1024) + ' KB';
    return (c / (1024 * 1024)).toFixed(1) + ' MB';
  }
  /** Roughly how big a board is: its marks and what its records take in the browser's store. */
  function sizeWords(stat) {
    if (!stat) return 'size not known yet';
    if (!stat.events && !stat.marks) return 'empty';
    return marksWords(stat) + ' · ' + bytesWords(stat.chars);
  }

  /** A size of the browser's room as a person says it: "300 KB", "12 MB" (a decimal only while small), "40 GB". */
  function spaceWords(bytes) {
    const b = typeof bytes === 'number' && isFinite(bytes) && bytes > 0 ? bytes : 0;
    if (!b) return 'nothing';
    if (b < 1024) return 'under 1 KB';
    const unit = (x, u) => (x >= 9.95 ? Math.round(x) : Math.round(x * 10) / 10) + ' ' + u;
    const kb = Math.round(b / 1024);
    if (kb < 1024) return kb + ' KB';
    const mb = b / (1024 * 1024);
    if (Math.round(mb) < 1024) return unit(mb, 'MB');
    return unit(mb / 1024, 'GB');
  }
  /**
   * What the browser keeps of this page's storage, and whether it may take it back, in words — the foot of
   * the boards pane. `usage` and `quota` are `navigator.storage.estimate()`'s (bytes, or not said), `persisted`
   * `navigator.storage.persisted()`'s (true, false, or null when it cannot say) and `installed` whether the page
   * runs from the Home Screen. Safari clears a site's storage after seven days without a visit unless the
   * site is installed or the browser agreed to keep it, so a page in a tab says so and the way out.
   */
  function storageWords(o) {
    const q = o || {};
    const known = (n) => typeof n === 'number' && isFinite(n) && n >= 0;
    const used = known(q.usage) && q.usage > 0, quota = known(q.quota) && q.quota > 0;
    if (!known(q.usage) && !quota && q.persisted !== true && q.persisted !== false) return 'this browser does not say how much room it keeps for boards';
    const room = used && quota ? spaceWords(q.usage) + ' of about ' + spaceWords(q.quota) : used ? spaceWords(q.usage) : quota ? 'room for about ' + spaceWords(q.quota) : '';
    if (q.persisted === true) return 'kept on this device' + (room ? ' — ' + room : '');
    if (q.installed) return 'kept with the app on this device' + (room ? ' — ' + room : '');
    return 'this browser may clear it after a week unused — add to Home Screen' + (room ? ' · ' + room : '');
  }
  /** The device preference that says the browser has been asked to keep this device's storage (once, whatever it answered). */
  const PERSIST_KEY = 'mm-persist-asked';
  /**
   * Whether to ask the browser, now, to keep this device's storage (`navigator.storage.persist()`): once per
   * device, when a board the device keeps holds something — never for `?fresh=1` (a test's page), a replay, an
   * embed, a room, a folder or a repository (`mode` is boardMode's: only 'restore' is the device's own board).
   * `why` says which: 'ask', 'unsupported', 'not-the-devices', 'already', 'empty'.
   */
  function persistPlan(o) {
    const q = o || {};
    if (!q.supported) return { ask: false, why: 'unsupported' };
    if (q.mode !== 'restore') return { ask: false, why: 'not-the-devices' };
    if (q.asked) return { ask: false, why: 'already' };
    if (!q.holds) return { ask: false, why: 'empty' };
    return { ask: true, why: 'ask' };
  }

  /**
   * What emptying the trash will take, said before it happens. `held` — the ids whose lock another
   * tab holds: a board open there is never emptied out from under it, and the sentence says so.
   * @returns {{ gone: Array, kept: Array, words: string }}
   */
  function emptyTrashPlan(entries, stats, held) {
    const bin = boardShelves(entries).trash;
    const heldSet = new Set(held || []);
    const gone = bin.filter((e) => !heldSet.has(e.id));
    const kept = bin.filter((e) => heldSet.has(e.id));
    if (!bin.length) return { gone, kept, words: 'the trash is empty' };
    const stat = (e) => (stats && stats[e.id]) || null;
    let words = gone.length
      ? gone.length + ' board' + (gone.length === 1 ? '' : 's') + ' will be deleted for good — ' +
        listWords(gone.map((e) => '“' + e.name + '” (' + marksWords(stat(e)) + ')')) + '. This cannot be undone.'
      : 'nothing in the trash can be deleted now.';
    if (kept.length) {
      const one = kept.length === 1;
      words += ' ' + listWords(kept.map((e) => '“' + e.name + '”')) + (one ? ' is' : ' are') + ' open in another tab — ' +
        (one ? 'it stays' : 'they stay') + ' in the trash until that tab lets ' + (one ? 'it' : 'them') + ' go.';
    }
    return { gone, kept, words };
  }

  /** When, in a few words: "just now", "4 min ago", "3 h ago", "yesterday", "4 days ago", "2 Aug", "2 Aug 2025". */
  function agoWords(ms, now) {
    if (!ms) return '';
    const d = Math.max(0, now - ms);
    if (d < 60000) return 'just now';
    if (d < 3600000) return Math.floor(d / 60000) + ' min ago';
    if (d < 86400000) return Math.floor(d / 3600000) + ' h ago';
    if (d < 2 * 86400000) return 'yesterday';
    if (d < 7 * 86400000) return Math.floor(d / 86400000) + ' days ago';
    const t = new Date(ms);
    return t.getDate() + ' ' + MONTHS[t.getMonth()] + (t.getFullYear() !== new Date(now).getFullYear() ? ' ' + t.getFullYear() : '');
  }

  /** The strokes in a log: a board's marks, drawn (an erase is a reading of the log, not a removal from it). */
  function countMarks(events) {
    let n = 0;
    for (const ev of events || []) if (ev && ev.type === 'stroke') n++;
    return n;
  }
  /** What a board holds: when it last changed, its events, its marks, and the characters its records take. */
  function statsOf(events, chars, now) {
    return { changed: now, events: (events || []).length, marks: countMarks(events), chars: chars || 0 };
  }
  /**
   * The same, after a record lands (written in the record's own transaction by the adapter).
   * `events` is the log the record brings the store to. A whole log compacts the store, so its
   * characters are the store's; anything else adds its own (an undo's cut record included).
   */
  function statsAfter(stats, rec, events, now) {
    const chars = rec.base === 0 ? rec.text.length : ((stats && stats.chars) || 0) + rec.text.length;
    return { changed: now, events: rec.base + rec.n, marks: countMarks(events), chars };
  }

  /** What kind an entry is, as the list says it. */
  function kindWords(kind) {
    return { board: 'kept in this browser', folder: 'folder', git: 'repository', static: 'site', live: 'room' }[kind] || String(kind || '');
  }
  /**
   * A place opened on the page — a folder, a repository, a site — as a recent entry. `spec` is how it
   * is opened again: a repository's owner/repo[@branch][/dir], a site's base; never a token (a key
   * never enters this list). A folder's handle, where the browser keeps one, the adapter adds.
   */
  function placeEntry(kind, spec, name, now) {
    return { id: kind + ':' + spec, kind, name: name || spec, spec, opened: now };
  }
  /** Remembering a place: it goes (or moves) to the top; past RECENT_MAX the oldest are dropped. Boards never are. */
  function placesPlan(entries, entry) {
    const others = (entries || []).filter((e) => e && !isKept(e) && e.id !== entry.id).sort(byOpened);
    return { put: entry, drop: others.slice(RECENT_MAX - 1).map((e) => e.id) };
  }

  /** The rows the pane shows, in the shelves' order: the board here marked, when and how big, places by kind, the trash with its date. */
  function boardRows(entries, stats, now, currentId) {
    const sh = boardShelves(entries);
    const st = (id) => (stats && stats[id]) || null;
    const when = (verb, ms) => (ms ? verb + ' ' + agoWords(ms, now) : '');
    return {
      boards: sh.boards.map((e) => ({ id: e.id, name: e.name, here: e.id === currentId, when: when('changed', st(e.id) && st(e.id).changed), size: sizeWords(st(e.id)) })),
      places: sh.places.map((e) => ({ id: e.id, k: e.kind, kind: kindWords(e.kind), name: e.name, here: e.id === currentId, when: when('opened', e.opened) })),
      trash: sh.trash.map((e) => ({ id: e.id, name: e.name, when: when('deleted', e.trashed), size: sizeWords(st(e.id)) })),
    };
  }

  /**
   * Whether the board on screen may be left (a switch, a folder opened over it). `s`: the journal's
   * snapshot, and the board's name. null — the store holds all of it; 'busy' — a record is on its way
   * (the adapter waits, then asks again); 'unsaved' / 'not-kept' — said, with the ways out: the log
   * as a file, or leaving it anyway, which is the person's call and a second, deliberate tap.
   */
  function leaveVerdict(s) {
    if (!s || s.state === 'off') return null;
    const name = '“' + (s.name || 'this board') + '”';
    const ways = ['export', 'leave'];
    if (s.state === 'readonly' || (s.state === 'armed' && s.trouble)) {
      if (s.state === 'readonly' && !s.dirty) return null; // nothing drawn here, nothing to keep
      const tab = s.trouble && (s.trouble.kind === 'tab' || s.trouble.kind === 'elsewhere');
      if (tab) return { kind: 'not-kept', words: name + ' is open in another tab, and what was drawn on it here was not kept — export the log to keep it, or leave it as that tab has it', ways };
      return { kind: 'unsaved', words: name + ' is not saved' + (s.trouble && s.trouble.kind === 'full' ? ' (the browser\'s storage is full)' : '') + ' — export the log to keep it, or leave it and lose what was not saved', ways };
    }
    if (s.state === 'armed') return s.inFlight || s.dirty || s.needWhole ? { kind: 'busy' } : null;
    return { kind: 'busy' }; // 'waiting': the store is still being opened
  }

  /**
   * What opening an entry of the list does. 'here' — it is on screen; 'switch' — in place, the board
   * on screen flushed first; 'navigate' — a folder, a repository or a room is on screen, and the board
   * opens in a page of its own; 'place' — a folder, a repository or a site, opened the way its tile
   * opens it; 'missing' — not on the list (emptied from the trash in another tab, say).
   */
  function switchPlan(o) {
    const e = (o.entries || []).find((x) => x && x.id === o.target);
    if (!e) return { go: 'missing', id: o.target };
    if (!isKept(e)) return { go: 'place', id: e.id };
    if (o.onBoard && o.current === e.id) return { go: 'here', id: e.id };
    return { go: o.onBoard ? 'switch' : 'navigate', id: e.id, restore: !!e.trashed };
  }

  // ----- The examples (V1-PLAN R5) ---------------------------------------------------------------
  // boards/examples/ is a folder of logs and an index (scripts/examples.mjs makes them). Opening one is
  // opening a COPY: the adapter reads the file and makes a board of its own from its events, so the example
  // is never written, and what a hand draws on the copy is the hand's. The index is read, not trusted.

  /** Where the examples stand, from the app (/app/) and the old address alike: both sit one folder below the site's root, as Demos/ does. */
  const EXAMPLES_BASE = '../boards/examples/';
  const exampleUrl = (file) => EXAMPLES_BASE + file;
  /** A log's file name as the examples folder holds one: a name and .jsonl, never a path and never another site's. */
  const EXAMPLE_FILE = /^[a-z0-9][a-z0-9-]*\.jsonl$/;

  /**
   * The rows the pane shows for the examples, in the index's order: an id, a name, what it shows, the file,
   * and what it holds in words. A list that cannot be read is no rows; a row with no name, an id seen
   * before, or a file that is not one of the folder's logs is left out — nothing throws.
   */
  function exampleRows(index) {
    const list = index && typeof index === 'object' && Array.isArray(index.examples) ? index.examples : [];
    const seen = new Set();
    const rows = [];
    for (const e of list) {
      if (!e || typeof e !== 'object' || typeof e.id !== 'string' || !e.id || seen.has(e.id)) continue;
      const name = boardName(e.name);
      if (!name || typeof e.file !== 'string' || !EXAMPLE_FILE.test(e.file)) continue;
      seen.add(e.id);
      const n = e.marks;
      rows.push({ id: e.id, name, says: typeof e.says === 'string' ? e.says : '', file: e.file, words: Number.isInteger(n) && n >= 0 ? marksWords({ events: n, marks: n }) : '' });
    }
    return rows;
  }
  /** What a board made from an example is called: "Flowchart example", then "Flowchart example 2" … (a name in the trash is taken). */
  function exampleName(entries, row) {
    const stem = (boardName(row && row.name) || 'Board').slice(0, BOARD_NAME_MAX - 20).trim() + ' example';
    const taken = new Set((entries || []).filter(isKept).map((e) => e.name));
    if (!taken.has(stem)) return stem;
    for (let n = 2; ; n++) if (!taken.has(stem + ' ' + n)) return stem + ' ' + n;
  }
  /** The example a first run's tap opens: the index's own choice when it can be opened, else the first one, else none. */
  function starterOf(index) {
    const rows = exampleRows(index);
    if (!rows.length) return null;
    const want = index && index.starter;
    return rows.some((r) => r.id === want) ? want : rows[0].id;
  }

  /** The page's title: the board's name first. */
  function boardTitle(name) { return name ? name + ' — MetaMedium' : 'MetaMedium'; }
  /**
   * The page's address on board `id`: `board=` set (in the place it had, or last), everything else
   * kept — except what would make the board not this board on a reload: `fresh` (a fresh start
   * replaces the board at its first change), and a folder, a repository, a room (and its `key`, which is the
   * room's and never a board's) or a figure.
   */
  function boardSearch(search, id) {
    const drop = { fresh: 1, folder: 1, git: 1, live: 1, relay: 1, key: 1, replay: 1, embed: 1 };
    const out = [];
    let said = false;
    for (const p of String(search || '').replace(/^\?/, '').split('&')) {
      if (!p) continue;
      let k;
      try { k = decodeURIComponent(p.split('=')[0]); } catch (err) { k = p.split('=')[0]; }
      if (drop[k]) continue;
      if (k === 'board') { if (!said) { out.push('board=' + encodeURIComponent(id)); said = true; } continue; }
      out.push(p);
    }
    if (!said) out.push('board=' + encodeURIComponent(id));
    return '?' + out.join('&');
  }

// ===== bundle (the board out and back whole) =====
// Provides: the pure half of PLAN-IPAD-NOTES I4 — crc32, zipWrite / zipRead / isZipBytes (a zip by hand: the
//   log and its pictures in one file), assetEntryName / bundleName / bundleBuild / bundleRead (what the board
//   bundle holds and how it is read back, every picture's hash verified), base64Of / svgDataUrl, boardSvg (the
//   board as one SVG: pictures, figures, writing and ink, in board order), pngPlan (how big the board's picture
//   may be), paperOf / pdfPlan / pdfWrite (one page, written by hand, holding one picture of the board).
// Uses: NOTHING. Like 17-assets.js this fragment names no closure variable and touches no DOM, no storage and
//   no session: bytes, layers, sizes and clocks arrive as arguments, and what it decides leaves as values — so
//   it loads on its own in Node, which is how it is tested:  node --test Demos/surface/17-bundle.test.mjs
//   18-images.js is the adapter (IndexedDB, canvas, the export pane's buttons, the file it is handed).
// A fragment of one closure: Demos/build-surface.mjs concatenates surface/*.js
// in name order inside `(function () { ... })();`. Shared state is the closure's; no imports, no exports,
// no build step beyond the concatenation.
//
// WHY A ZIP (and not one JSONL with the pictures in it as text). A person on an iPad meets this file in the
// Files app, the share sheet, Mail and AirDrop: a `.zip` is a thing every one of them knows, the Files app
// opens it with a tap and shows `board.jsonl` and the pictures as files, and anything — a desktop, a phone,
// `unzip` — can take the pictures out of it with no dyna.ink at all. A JSONL with each picture as base64
// is a third larger, opens in nothing, and one tap on it in Files shows a wall of text. The log stays
// exactly the log (version 1, a header that may say how many pictures sit beside it): the pictures are
// beside the log, never in it. The file is named `<board>.dyna.zip` and is found by its first bytes, never
// by its name, so a person who renames it or unzips and zips it again by hand still opens it whole. What the
// Files app writes when it zips is compressed (deflate), so the reader unpacks that too; what this writes is
// stored, because a photograph is a JPEG already and there is nothing left to take out of it.
//
// A file that cannot be read is a SENTENCE, never a throw at the person: a file cut off, one that is no zip,
// a directory smashed, a log whose checksum does not match. A picture that does not match its own name — a
// byte flipped, a file replaced — is left out and said, and the board and the pictures that are sound
// still open: a damaged backup that gives back what it can is better than one that gives back nothing.

  // ----- the checksum -------------------------------------------------------------
  let CRC_TABLE = null;
  /** The CRC-32 a zip keeps for each file, as an unsigned number. */
  function crc32(bytes) {
    if (!CRC_TABLE) {
      CRC_TABLE = new Uint32Array(256);
      for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
        CRC_TABLE[n] = c >>> 0;
      }
    }
    let crc = 0xFFFFFFFF;
    for (let i = 0; i < bytes.length; i++) crc = CRC_TABLE[(crc ^ bytes[i]) & 0xFF] ^ (crc >>> 8);
    return (crc ^ 0xFFFFFFFF) >>> 0;
  }

  // ----- the zip ----------------------------------------------------------------------
  const ZIP_LOCAL = 0x04034b50, ZIP_CENTRAL = 0x02014b50, ZIP_END = 0x06054b50;
  /** What one file of a zip may be, and how many the zip may hold: a limit on what a page will try to hold in memory. */
  const ZIP_MAX_BYTES = 1500000000, ZIP_MAX_ENTRIES = 20000;

  function zipUtf8(s) { return new TextEncoder().encode(s); }
  function zipDosTime(ms) {
    const d = new Date(Number.isFinite(ms) ? ms : 0);
    const y = Math.max(1980, d.getUTCFullYear());
    return {
      date: ((y - 1980) << 9) | ((d.getUTCMonth() + 1) << 5) | d.getUTCDate(),
      time: (d.getUTCHours() << 11) | (d.getUTCMinutes() << 5) | (d.getUTCSeconds() >> 1),
    };
  }

  /** Whether some bytes begin as a zip does (a file, a log's first line, anything). */
  function isZipBytes(bytes) {
    return !!bytes && bytes.length >= 4 && bytes[0] === 0x50 && bytes[1] === 0x4B && (bytes[2] === 3 || bytes[2] === 5) && (bytes[3] === 4 || bytes[3] === 6);
  }

  /**
   * A zip of `entries` (`{ name, data: Uint8Array }`), stored — not compressed — as `{ parts, size }`: the pieces
   * of the file in order, so a Blob can be made of them with no second copy of every picture. UTF-8 names.
   * Throws only for what a zip of this kind cannot hold (more than 65,535 files, or four gigabytes).
   */
  function zipWrite(entries, o) {
    const when = zipDosTime(o && o.time);
    const parts = [], central = [];
    let off = 0;
    if (entries.length > 65535) throw new RangeError('too many files for one zip');
    for (const e of entries) {
      const name = zipUtf8(e.name), data = e.data, crc = crc32(data);
      if (data.length >= 0xFFFFFFFF || off >= 0xFFFFFFFF) throw new RangeError('too big for one zip');
      const lh = new Uint8Array(30), v = new DataView(lh.buffer);
      v.setUint32(0, ZIP_LOCAL, true); v.setUint16(4, 20, true); v.setUint16(6, 0x0800, true); v.setUint16(8, 0, true);
      v.setUint16(10, when.time, true); v.setUint16(12, when.date, true);
      v.setUint32(14, crc, true); v.setUint32(18, data.length, true); v.setUint32(22, data.length, true);
      v.setUint16(26, name.length, true); v.setUint16(28, 0, true);
      parts.push(lh, name, data);
      const ch = new Uint8Array(46), c = new DataView(ch.buffer);
      c.setUint32(0, ZIP_CENTRAL, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, 0, true);
      c.setUint16(12, when.time, true); c.setUint16(14, when.date, true);
      c.setUint32(16, crc, true); c.setUint32(20, data.length, true); c.setUint32(24, data.length, true);
      c.setUint16(28, name.length, true); c.setUint32(42, off, true);
      central.push(ch, name);
      off += 30 + name.length + data.length;
    }
    const cdSize = central.reduce((a, p) => a + p.length, 0);
    const end = new Uint8Array(22), ev = new DataView(end.buffer);
    ev.setUint32(0, ZIP_END, true); ev.setUint16(8, entries.length, true); ev.setUint16(10, entries.length, true);
    ev.setUint32(12, cdSize, true); ev.setUint32(16, off, true);
    const all = parts.concat(central, [end]);
    return { parts: all, size: all.reduce((a, p) => a + p.length, 0) };
  }

  /** The path a zip's entry is kept under, or null for one that must not be read (out of its folder, a Mac's resource forks). */
  function zipSafeName(name) {
    const n = String(name).replace(/\\/g, '/');
    if (!n || n.endsWith('/') || n.startsWith('/') || n.indexOf('\0') >= 0) return null;
    const segs = n.split('/');
    if (segs.some((s) => s === '..' || s === '.' || s === '')) return null;
    if (segs.includes('__MACOSX') || segs[segs.length - 1] === '.DS_Store') return null;
    return n;
  }

  /**
   * A zip's files. `{ ok: true, entries: [{ name, data, bad? }] }` — `bad` is a sentence for a file whose
   * checksum does not match or that could not be unpacked — or `{ ok: false, words }` for a zip that cannot be
   * read at all. Never throws. `o.inflate` (async, raw deflate → bytes) unpacks a compressed file: a zip the
   * Files app made is compressed.
   */
  async function zipRead(bytes, o) {
    const refuse = (why) => ({ ok: false, words: why });
    try {
      if (!bytes || bytes.length < 22 || !isZipBytes(bytes)) return refuse('that is not a zip file — a board bundle is a .zip made by Export');
      const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
      let eocd = -1;
      for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 22 - 65535); i--) {
        if (dv.getUint32(i, true) === ZIP_END) { eocd = i; break; }
      }
      if (eocd < 0) return refuse('this zip is cut off — its end is missing, so it may not have finished copying; nothing was opened');
      const count = dv.getUint16(eocd + 10, true), cdSize = dv.getUint32(eocd + 12, true), cdOff = dv.getUint32(eocd + 16, true);
      if (count === 0xFFFF || cdSize === 0xFFFFFFFF || cdOff === 0xFFFFFFFF) return refuse('this zip is bigger than a browser can open (a zip64 file) — nothing was opened');
      if (count > ZIP_MAX_ENTRIES) return refuse('this zip holds ' + count + ' files — too many to be a board bundle; nothing was opened');
      if (cdOff + cdSize > eocd) return refuse('this zip’s directory is damaged — nothing was opened');
      const entries = [];
      let claimed = 0, p = cdOff;
      for (let i = 0; i < count; i++) {
        if (p + 46 > eocd || dv.getUint32(p, true) !== ZIP_CENTRAL) return refuse('this zip’s directory is damaged — nothing was opened');
        const flags = dv.getUint16(p + 8, true), method = dv.getUint16(p + 10, true), crc = dv.getUint32(p + 16, true);
        const csize = dv.getUint32(p + 20, true), usize = dv.getUint32(p + 24, true);
        const nl = dv.getUint16(p + 28, true), xl = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true), lo = dv.getUint32(p + 42, true);
        if (p + 46 + nl + xl + cl > eocd) return refuse('this zip’s directory is damaged — nothing was opened');
        const rawName = new TextDecoder().decode(bytes.subarray(p + 46, p + 46 + nl));
        p += 46 + nl + xl + cl;
        const name = zipSafeName(rawName);
        if (!name) continue;
        if (flags & 1) return refuse('this zip is encrypted — a board bundle is not, so this is not one');
        claimed += usize;
        if (claimed > ZIP_MAX_BYTES) return refuse('this zip claims more than a browser can hold — nothing was opened');
        if (lo + 30 > bytes.length || dv.getUint32(lo, true) !== ZIP_LOCAL) return refuse('this zip is damaged — “' + name + '” is not where its directory says; nothing was opened');
        const start = lo + 30 + dv.getUint16(lo + 26, true) + dv.getUint16(lo + 28, true);
        if (start + csize > bytes.length) return refuse('this zip is cut off — “' + name + '” runs past the end of the file; nothing was opened');
        const stored = bytes.subarray(start, start + csize);
        let data = null, bad = null;
        if (method === 0) data = stored;
        else if (method === 8) {
          if (!o || !o.inflate) return refuse('this zip is compressed and this browser cannot unpack it — unzip it in Files and open board.jsonl, or export the board again');
          try { data = await o.inflate(stored); } catch (err) { data = new Uint8Array(0); bad = 'it could not be unpacked'; }
        } else return refuse('this zip uses a kind of compression this build does not read (' + method + ') — nothing was opened');
        if (!bad && data.length !== usize) bad = 'it is not the size its directory says';
        if (!bad && crc32(data) !== crc) bad = 'its checksum does not match';
        entries.push(bad ? { name, data, bad } : { name, data });
      }
      return { ok: true, entries };
    } catch (err) {
      return refuse('this zip could not be read (' + ((err && err.message) || err) + ') — nothing was opened');
    }
  }

  // ----- the board bundle ---------------------------------------------------------------
  /** The log inside a bundle. */
  const BUNDLE_LOG = 'board.jsonl';
  const BUNDLE_EXT = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp', 'image/gif': 'gif' };
  const BUNDLE_MIME = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif' };

  /** Where a picture's bytes stand in a bundle: `assets/<the 64 hex digits of its hash>.<the extension it is kept as>`. */
  function assetEntryName(ref, mime) {
    const m = /^sha256:([0-9a-f]{64})$/.exec(String(ref));
    if (!m) throw new TypeError('not an asset reference: ' + ref);
    return 'assets/' + m[1] + '.' + (BUNDLE_EXT[String(mime).toLowerCase()] || 'bin');
  }

  /** The file a bundle is saved as: `<the board's name>.dyna.zip`, the name made safe and short. */
  function bundleName(boardName) {
    let s = String(boardName == null ? '' : boardName).replace(/[^\p{L}\p{N}._-]+/gu, '-').replace(/^[-.]+|[-.]+$/g, '');
    if (s.length > 60) s = s.slice(0, 60).replace(/[-.]+$/, '');
    return (s || 'board') + '.dyna.zip';
  }

  /** A bundle's pieces: `board.jsonl` first, then each picture by its name — `assets: [{ ref, mime, bytes }]`, each once. */
  function bundleBuild(o) {
    const seen = new Set(), files = [];
    for (const a of o.assets || []) {
      const name = assetEntryName(a.ref, a.mime);
      if (seen.has(name)) continue;
      seen.add(name);
      files.push({ name, data: a.bytes });
    }
    files.sort((x, y) => (x.name < y.name ? -1 : x.name > y.name ? 1 : 0));
    return zipWrite([{ name: BUNDLE_LOG, data: zipUtf8(o.log) }].concat(files), { time: o.time });
  }

  /**
   * A bundle read back: `{ ok: true, text, assets: [{ ref, mime, bytes }], damaged: [{ name, why }] }` — the log's
   * text, every picture whose bytes hash to the name it stands under (`o.digest`, async, bytes → hex), and the
   * pictures that did not — or `{ ok: false, words }`. The log may stand one folder down: a folder zipped by hand.
   */
  async function bundleRead(bytes, o) {
    const z = await zipRead(bytes, o);
    if (!z.ok) return z;
    const base = (n) => n.slice(n.lastIndexOf('/') + 1);
    const logs = z.entries.filter((e) => base(e.name) === BUNDLE_LOG).sort((a, b) => a.name.split('/').length - b.name.split('/').length);
    if (!logs.length) return { ok: false, words: 'this zip has no ' + BUNDLE_LOG + ' in it, so it is not a board bundle — nothing was opened' };
    const log = logs[0];
    if (log.bad) return { ok: false, words: 'the ' + BUNDLE_LOG + ' in this zip is damaged (' + log.bad + ') — nothing was opened' };
    let text = new TextDecoder().decode(log.data);
    if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
    const assets = [], damaged = [], seen = new Set();
    for (const e of z.entries) {
      const m = /^([0-9a-f]{64})\.(jpg|jpeg|png|webp|gif|bin)$/.exec(base(e.name));
      if (!m || !/(^|\/)assets\//.test(e.name) || seen.has(m[1])) continue;
      seen.add(m[1]);
      if (e.bad) { damaged.push({ name: e.name, why: e.bad }); continue; }
      let hex = null;
      try { hex = await o.digest(e.data); } catch (err) { hex = null; }
      if (hex !== m[1]) { damaged.push({ name: e.name, why: 'its bytes do not match the fingerprint it is named for' }); continue; }
      assets.push({ ref: 'sha256:' + m[1], mime: BUNDLE_MIME[m[2]] || 'application/octet-stream', bytes: e.data });
    }
    return { ok: true, text, assets, damaged };
  }

  // ----- base64: the picture an SVG carries -------------------------------------------------
  const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  /** Some bytes as base64, in plain code (a photograph is a million characters). */
  function base64Of(bytes) {
    let out = '';
    let i = 0;
    for (; i + 2 < bytes.length; i += 3) {
      const n = (bytes[i] << 16) | (bytes[i + 1] << 8) | bytes[i + 2];
      out += B64[n >> 18] + B64[(n >> 12) & 63] + B64[(n >> 6) & 63] + B64[n & 63];
    }
    const rest = bytes.length - i;
    if (rest === 1) { const n = bytes[i] << 16; out += B64[n >> 18] + B64[(n >> 12) & 63] + '=='; }
    else if (rest === 2) { const n = (bytes[i] << 16) | (bytes[i + 1] << 8); out += B64[n >> 18] + B64[(n >> 12) & 63] + B64[(n >> 6) & 63] + '='; }
    return out;
  }
  /** A picture's bytes as a data URL, to stand in an SVG's `<image>`. */
  function pictureDataUrl(mime, bytes) { return 'data:' + mime + ';base64,' + base64Of(bytes); }
  /** An SVG's text as a data URL, for an `<image>`: an image never runs a script, which is why a figure goes in as one. */
  function svgDataUrl(svg) { return 'data:image/svg+xml;base64,' + base64Of(zipUtf8(svg)); }

  // ----- the board as one SVG ---------------------------------------------------------------------
  const BOARD_INK = '#1a1a2e';
  const BOARD_FONT = '"IBM Plex Mono",ui-monospace,Menlo,monospace';
  function svgEsc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function svgNum(v) { return String(+Number(v).toFixed(2)); }

  /** The frame a board's picture is made in: the content's bounds and a margin, in whole world units — the SVG's viewBox, the PNG's ground, the PDF's picture. */
  function boardFrame(box) {
    const pad = 20;
    const v = [box.minX - pad, box.minY - pad, box.maxX - box.minX + pad * 2, box.maxY - box.minY + pad * 2].map((n) => Math.round(n));
    return { x: v[0], y: v[1], w: Math.max(1, v[2]), h: Math.max(1, v[3]) };
  }
  /**
   * The board as an SVG: `layers` in board order — `{ kind: 'picture', id, name, box, turn?, href }` (`href` a
   * data URL, or null for a picture this device does not hold, which stands as its name in a dashed plate),
   * `{ kind: 'figure', id, name, box, svg }` (an SVG figure, carried as an image of its own text so no script of
   * its runs), `{ kind: 'text', id, name, box, text, fitted }` (writing, as `<text>`; a caption fills its box,
   * a document flows and is clipped to it) and `{ kind: 'path', id, reads?, d }` (ink). Everything that is not
   * ink goes first, in the order given, so the ink is over it, as on the board. `o.pictures: false` leaves
   * the pictures out (a PNG draws them itself), `o.ground` fills a ground first, `o.ink` is the writing's colour.
   * `box` is the content's bounds in world units.
   */
  function boardSvg(layers, box, o) {
    const opt = o || {};
    if (!layers.length || !box) return '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"></svg>';
    const fr = boardFrame(box);
    const vb = [fr.x, fr.y, fr.w, fr.h];
    const ink = opt.ink || BOARD_INK;
    let out = '<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="' + vb[2] + '" height="' + vb[3] + '" viewBox="' + vb.join(' ') + '">\n';
    if (opt.ground) out += '  <rect x="' + vb[0] + '" y="' + vb[1] + '" width="' + vb[2] + '" height="' + vb[3] + '" fill="' + svgEsc(opt.ground) + '"/>\n';
    const geo = (b) => 'x="' + svgNum(b.minX) + '" y="' + svgNum(b.minY) + '" width="' + svgNum(b.maxX - b.minX) + '" height="' + svgNum(b.maxY - b.minY) + '"';
    const title = (name) => (name ? '<title>' + svgEsc(name) + '</title>' : '');
    let clips = 0;
    for (const l of layers) {
      if (l.kind === 'path') continue;
      const b = l.box, w = b.maxX - b.minX, h = b.maxY - b.minY;
      if (l.kind === 'picture') {
        if (l.href) {
          if (opt.pictures === false) continue;
          const turn = l.turn ? ' transform="rotate(' + svgNum(l.turn * 180 / Math.PI) + ' ' + svgNum(b.minX + w / 2) + ' ' + svgNum(b.minY + h / 2) + ')"' : '';
          out += '  <image data-node="' + svgEsc(l.id) + '" ' + geo(b) + ' preserveAspectRatio="none"' + turn + ' xlink:href="' + l.href + '">' + title(l.name) + '</image>\n';
        } else {
          out += '  <g data-node="' + svgEsc(l.id) + '"><rect ' + geo(b) + ' fill="none" stroke="#9a968c" stroke-width="1.2" stroke-dasharray="6 4"/>' +
            '<text x="' + svgNum(b.minX + 8) + '" y="' + svgNum(b.minY + Math.min(24, h * 0.5)) + '" font-size="' + svgNum(Math.max(8, Math.min(14, w / 12))) + '" font-family=\'' + BOARD_FONT + '\' fill="#7a766c">' + svgEsc(l.name) + '</text></g>\n';
        }
      } else if (l.kind === 'figure') {
        out += '  <image data-node="' + svgEsc(l.id) + '" ' + geo(b) + ' preserveAspectRatio="xMidYMid meet" xlink:href="' + svgDataUrl(l.svg) + '">' + title(l.name) + '</image>\n';
      } else if (l.kind === 'text') {
        const lines = String(l.text).split(/\r?\n/);
        if (l.fitted) {
          const lineH = h / Math.max(1, lines.length);
          out += '  <g data-node="' + svgEsc(l.id) + '" font-family=\'' + BOARD_FONT + '\' fill="' + svgEsc(ink) + '">';
          lines.forEach((ln, i) => {
            const t = ln.trim();
            if (!t) return;
            const unit = w / Math.max(1, t.length);
            const fs = Math.max(6, Math.min(lineH * 0.78, unit / 0.62));
            out += '<text x="' + svgNum(b.minX) + '" y="' + svgNum(b.minY + lineH * i + lineH * 0.72) + '" font-size="' + svgNum(fs) + '" textLength="' + svgNum(w) + '" lengthAdjust="spacing">' + svgEsc(t) + '</text>';
          });
          out += '</g>\n';
        } else {
          const id = 'mm-clip-' + (++clips);
          out += '  <clipPath id="' + id + '"><rect ' + geo(b) + '/></clipPath>\n  <g data-node="' + svgEsc(l.id) + '" clip-path="url(#' + id + ')" font-family=\'' + BOARD_FONT + '\' font-size="11" fill="' + svgEsc(ink) + '" xml:space="preserve">';
          lines.forEach((ln, i) => { if (ln.trim()) out += '<text x="' + svgNum(b.minX + 8) + '" y="' + svgNum(b.minY + 16 * (i + 1)) + '">' + svgEsc(ln) + '</text>'; });
          out += '</g>\n';
        }
      }
    }
    for (const l of layers) {
      if (l.kind !== 'path') continue;
      out += '  <path data-node="' + svgEsc(l.id) + '"' + (l.reads ? ' data-reads="' + svgEsc(l.reads) + '"' : '') + ' d="' + l.d + '" fill="none" stroke="' + BOARD_INK + '" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>\n';
    }
    return out + '</svg>\n';
  }

  // ----- the picture of the board: its size -------------------------------------------------------
  /** The longest side of the board's picture, in pixels, and the most pixels it may have in all: an iPad's canvas stops near 16.7 million. */
  const PNG_MAX_SIDE = 8192;
  const PNG_MAX_PIXELS = 16000000;
  /**
   * The size of a picture of a board whose marks fill `w` × `h` world units: twice as many pixels as units
   * (sharp on a retina screen), held to `PNG_MAX_SIDE` a side and `PNG_MAX_PIXELS` in all — and `said` says so
   * when it had to be made smaller. `k` is pixels per world unit.
   */
  function pngPlan(w, h) {
    const W = Math.max(1, w), H = Math.max(1, h);
    let k = 2;
    k = Math.min(k, PNG_MAX_SIDE / Math.max(W, H), Math.sqrt(PNG_MAX_PIXELS / (W * H)));
    const pw = Math.max(1, Math.floor(W * k)), ph = Math.max(1, Math.floor(H * k));
    const scaled = k < 2;
    return { k, w: pw, h: ph, scaled, said: scaled ? 'scaled to ' + pw + ' × ' + ph + ' pixels — the most this device can draw at once' : '' };
  }

  // ----- the PDF ------------------------------------------------------------------------------------
  /** Letter where it is used (the United States, Canada, Mexico and a few more, and a language with no place said), A4 everywhere else. */
  function paperOf(lang) {
    const l = String(lang || '');
    if (!l || /^en$/i.test(l)) return 'Letter';
    return /[-_](US|CA|MX|PH|CL|CO|VE|CR|GT|PA|PR|DO|NI|SV|HN)$/i.test(l) ? 'Letter' : 'A4';
  }
  const PDF_PAPER = { Letter: { w: 612, h: 792 }, A4: { w: 595, h: 842 } };
  const PDF_MARGIN = 36, PDF_DPI = 200, PDF_MAX_SIDE = 3000, PDF_FULL = 0.75;
  /**
   * One page for a board whose marks fill `w` × `h` world units: turned the way the board lies, the board
   * fitted inside a margin with its own proportions, no larger than it is drawn (a world unit is a CSS pixel,
   * 0.75 pt), and the size of the picture to make of it — 200 dpi on the page, never more than 3,000 pixels a
   * side. `scale` is points per world unit; `said` says the paper and how much smaller the board is.
   */
  function pdfPlan(w, h, lang) {
    const W = Math.max(1, w), H = Math.max(1, h);
    const paper = paperOf(lang), dims = PDF_PAPER[paper], landscape = W > H;
    const pageW = landscape ? dims.h : dims.w, pageH = landscape ? dims.w : dims.h;
    const scale = Math.min((pageW - PDF_MARGIN * 2) / W, (pageH - PDF_MARGIN * 2) / H, PDF_FULL);
    const bw = W * scale, bh = H * scale;
    const box = { x: (pageW - bw) / 2, y: (pageH - bh) / 2, w: bw, h: bh };
    let k = PDF_DPI / 72;
    k = Math.min(k, PDF_MAX_SIDE / Math.max(bw, bh));
    const rasterW = Math.max(1, Math.round(bw * k)), rasterH = Math.max(1, Math.round(bh * k));
    const percent = Math.max(1, Math.round(scale / PDF_FULL * 100));
    return { paper, landscape, pageW, pageH, box, scale, percent, rasterW, rasterH,
      said: paper + ', one page, ' + (landscape ? 'landscape' : 'portrait') + ' — the board at ' + percent + '% of its drawn size' };
  }

  function pdfNum(v) { return /^-?\d+$/.test(String(v)) ? String(v) : String(+Number(v).toFixed(3)); }
  function pdfHex16(s) {
    let out = 'FEFF';
    for (let i = 0; i < s.length; i++) out += s.charCodeAt(i).toString(16).toUpperCase().padStart(4, '0');
    return '<' + out + '>';
  }
  /**
   * A PDF of one page holding one picture, written by hand. `image` is `{ w, h, filter, data }` — `filter` is
   * `'flate'` (`data` is the zlib stream of the picture's raw RGB rows) or `'dct'` (`data` is a JPEG, carried
   * untouched). `box` is where it stands on the page, in points from the page's top left. No dependency, no
   * compression of its own; the xref table is exact. Returns the file's bytes.
   */
  function pdfWrite(o) {
    const latin = (s) => { const b = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) b[i] = s.charCodeAt(i) & 0xFF; return b; };
    const chunks = [], offsets = [];
    let at = 0;
    const put = (b) => { chunks.push(b); at += b.length; };
    const text = (s) => put(latin(s));
    const begin = (n) => { offsets[n] = at; text(n + ' 0 obj\n'); };
    const im = o.image, dct = im.filter === 'dct';
    const b = o.box, W = o.pageW, H = o.pageH;
    text('%PDF-1.4\n');
    put(new Uint8Array([0x25, 0xE2, 0xE3, 0xCF, 0xD3, 0x0A]));
    begin(1); text('<< /Type /Catalog /Pages 2 0 R >>\nendobj\n');
    begin(2); text('<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n');
    begin(3); text('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ' + pdfNum(W) + ' ' + pdfNum(H) + '] /Resources << /XObject << /Im0 5 0 R >> >> /Contents 4 0 R >>\nendobj\n');
    const content = 'q\n' + pdfNum(b.w) + ' 0 0 ' + pdfNum(b.h) + ' ' + pdfNum(b.x) + ' ' + pdfNum(H - b.y - b.h) + ' cm\n/Im0 Do\nQ\n';
    begin(4); text('<< /Length ' + content.length + ' >>\nstream\n' + content + 'endstream\nendobj\n');
    begin(5);
    text('<< /Type /XObject /Subtype /Image /Width ' + im.w + ' /Height ' + im.h + ' /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /' + (dct ? 'DCTDecode' : 'FlateDecode') + ' /Length ' + im.data.length + ' >>\nstream\n');
    put(im.data);
    text('\nendstream\nendobj\n');
    const d = new Date(Number.isFinite(o.created) ? o.created : 0), p2 = (n) => String(n).padStart(2, '0');
    const when = 'D:' + d.getUTCFullYear() + p2(d.getUTCMonth() + 1) + p2(d.getUTCDate()) + p2(d.getUTCHours()) + p2(d.getUTCMinutes()) + p2(d.getUTCSeconds()) + 'Z';
    begin(6); text('<< /Title ' + pdfHex16(String(o.title || '')) + ' /Producer (dyna.ink) /CreationDate (' + when + ') >>\nendobj\n');
    const xref = at;
    let table = 'xref\n0 7\n0000000000 65535 f \n';
    for (let n = 1; n <= 6; n++) table += String(offsets[n]).padStart(10, '0') + ' 00000 n \n';
    text(table + 'trailer\n<< /Size 7 /Root 1 0 R /Info 6 0 R >>\nstartxref\n' + xref + '\n%%EOF\n');
    const out = new Uint8Array(at);
    let pos = 0;
    for (const c of chunks) { out.set(c, pos); pos += c.length; }
    return out;
  }

// ===== find (the kept index, and the boards' pictures) =====
// Provides: what Find keeps beside the journals (PLAN-IPAD-NOTES I6) — for every board this browser keeps, what it
//   SAYS (the labels, names, typed text, figures' words, Mermaid, picture names, read writing: core's
//   searchEntriesOf) and a small picture of it, in IndexedDB `mm-find` (its own store, version 1: `index` and
//   `thumbs`, each keyed by board), both under one key — the board's own record of its change (core's searchKeyOf:
//   when it changed, its events, its characters, the format's version). findLoad, findChanged (the journal's hook:
//   the board on screen is indexed a moment after the last change, off the pointer path), findLeaving (a board
//   left is indexed and drawn from the live state, in the task that leaves it), findSyncSoon / findSync (every
//   board whose kept index is missing or stale — the board's records read, replayed in a scratch session, never
//   the one on screen), findDrop (a board emptied from the trash), findIdle, findBoards (what a query is asked
//   of), findThumbCurrent (the picture of the board on screen, for the pane), findState (for tests).
// Uses: core (MM.searchEntriesOf, searchKeyOf, stalePlan, thumbFit, createSession, cleanPointsOf, strokePointsOf,
//   boundsOf, pictureOf, getRep), the session (the board on screen), the boards adapter (boards, board, boardDB,
//   idbBackend, openPlan, statsOf, onBoardHere, boardEntryName, boardsListed), boards list (boardShelves),
//   assets (assetGet, pictures — the decoded pictures the paint holds), the find pane (renderFind).
// A fragment of one closure: Demos/build-surface.mjs concatenates surface/*.js
// in name order inside `(function () { ... })();`. Shared state is the closure's; no imports, no exports.
//
// DERIVED, NEVER IN A LOG. Nothing here writes an event: the index and the pictures are what the boards say and
// look like, found again when a board changes, and lost harmlessly (the next sync reads the boards again). A
// board a hand only looked at is never written, and neither is its index until a sync finds it missing.
//
// OFF THE POINTER PATH. A change only restarts a timer (`FIND_DEBOUNCE_MS`); what it fires is read from the state
// the session already holds, when the hand is not on the glass. Another board is read from its own records and
// replayed in a scratch session one at a time, with a pause between, and never while the pointer is down.

  const FIND_DB = 'mm-find';
  const FIND_DEBOUNCE_MS = 1200;
  const FIND_PAUSE_MS = 40;
  /** The picture a board has in the list: its size on the canvas (it is shown at a third of it, for the screens that are twice as dense). */
  const THUMB_W = 240, THUMB_H = 160, THUMB_PAD = 12, THUMB_JPEG = 0.72;
  /** Most marks drawn in one picture, and most pictures decoded for it. */
  const THUMB_MARKS = 6000, THUMB_PICTURES = 12;

  const finder = {
    how: 'none',          // 'indexeddb' | 'memory' (this browser would not keep it: found again each visit)
    loading: null,
    loaded: false,        // what was kept has been read: until then nothing is made, or it would be made again
    index: new Map(),     // board id → { board, key, entries }
    thumbs: new Map(),    // board id → { board, key, src }
    builds: 0,            // indexes made since this page opened (for tests: a kept index is not built again)
    timer: 0,
    syncing: null,
    syncSoon: 0,
    progress: null,       // { done, total } while boards are being read
    down: false,          // the pointer is on the glass
    dbPromise: null,
  };

  addEventListener('pointerdown', () => { finder.down = true; }, { capture: true, passive: true });
  addEventListener('pointerup', () => { finder.down = false; }, { capture: true, passive: true });
  addEventListener('pointercancel', () => { finder.down = false; }, { capture: true, passive: true });

  // ----- the store ---------------------------------------------------------------------------------
  function findDB() {
    if (!finder.dbPromise) {
      finder.dbPromise = new Promise((resolve, reject) => {
        let req;
        try { req = indexedDB.open(FIND_DB, 1); } catch (err) { reject(err); return; }
        req.onupgradeneeded = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains('index')) db.createObjectStore('index', { keyPath: 'board' });
          if (!db.objectStoreNames.contains('thumbs')) db.createObjectStore('thumbs', { keyPath: 'board' });
        };
        req.onsuccess = () => {
          const db = req.result;
          db.onversionchange = () => { db.close(); finder.dbPromise = null; };
          db.onclose = () => { finder.dbPromise = null; };
          resolve(db);
        };
        req.onerror = () => reject(req.error || new DOMException('the browser would not open its storage', 'UnknownError'));
        req.onblocked = () => reject(new DOMException('blocked', 'InvalidStateError'));
      });
      finder.dbPromise.catch(() => { finder.dbPromise = null; });
    }
    return finder.dbPromise;
  }
  /** A transaction over the kept index and pictures; `fn(tx)` issues the requests. Resolves once committed. */
  function findTx(mode, fn) {
    return findDB().then((db) => new Promise((resolve, reject) => {
      let tx, out;
      try { tx = db.transaction(['index', 'thumbs'], mode); out = fn(tx); } catch (err) { try { if (tx) tx.abort(); } catch (e) { /* nothing */ } reject(err); return; }
      tx.oncomplete = () => resolve(out);
      tx.onabort = () => reject(tx.error || new DOMException('the browser abandoned the write', 'AbortError'));
    }));
  }
  /** Written, and never waited on: what is kept here is found again if it is lost. */
  function findWrite(store, rec) { findTx('readwrite', (tx) => { tx.objectStore(store).put(rec); }).catch(() => { finder.how = finder.how === 'indexeddb' ? 'memory' : finder.how; }); }

  /** What was kept, read once into memory: a query is asked of memory. */
  function findLoad() {
    if (finder.loading) return finder.loading;
    finder.loading = (async () => {
      try {
        const got = await findTx('readonly', (tx) => {
          const out = { index: [], thumbs: [] };
          tx.objectStore('index').getAll().onsuccess = (e) => { out.index = e.target.result || []; };
          tx.objectStore('thumbs').getAll().onsuccess = (e) => { out.thumbs = e.target.result || []; };
          return out;
        });
        // What this page has made since it opened is newer than what was kept.
        for (const r of got.index) if (r && typeof r.board === 'string' && Array.isArray(r.entries) && !finder.index.has(r.board)) finder.index.set(r.board, r);
        for (const r of got.thumbs) if (r && typeof r.board === 'string' && typeof r.src === 'string' && !finder.thumbs.has(r.board)) finder.thumbs.set(r.board, r);
        finder.how = 'indexeddb';
      } catch (err) { finder.how = 'memory'; }
      finder.loaded = true;
      findNotify();
    })();
    return finder.loading;
  }
  function findNotify() {
    if (typeof renderFind === 'function') renderFind();
    if (typeof renderBoardsPane === 'function') renderBoardsPane();
  }

  // ----- keys, and what is wanted -----------------------------------------------------------------------
  const findKeyOf = (id) => MM.searchKeyOf(boards.stats.get(id));
  /** The board's use, for a tie and for the order boards are read in: the latest of when it was opened and changed. */
  function findRecency(e) {
    const st = boards.stats.get(e.id);
    return Math.max(e.opened || 0, (st && st.changed) || 0, e.created || 0);
  }
  /** The boards this browser keeps and has not thrown away, most recent first. */
  function findWanted() {
    return boardShelves([...boards.entries.values()]).boards.sort((a, b) => findRecency(b) - findRecency(a));
  }
  /** What a query is asked of: every board on the list, the name always, and what it says when that is known. */
  function findBoards() {
    return findWanted().map((e) => {
      const idx = finder.index.get(e.id);
      return { id: e.id, name: boardEntryName(e.id), recency: findRecency(e), entries: idx ? idx.entries : [] };
    });
  }
  /** Whether the board on screen is one this page may index: its own, read, not being loaded, and not another tab's. */
  function findCurrentOk(leaving) {
    return onBoardHere() && board.ready && !board.restoring && board.lock !== 'taken' && (leaving || !boards.switching);
  }

  // ----- the board on screen --------------------------------------------------------------------------------
  /** The board on screen, indexed as it stands now — when its kept index is not for what it holds. */
  function findIndexCurrent(leaving) {
    if (!findCurrentOk(leaving)) return false;
    if (!finder.loaded && !leaving) { findLoad(); return false; }
    const id = board.id, key = findKeyOf(id);
    if (!key) return false;
    const held = finder.index.get(id);
    if (held && held.key === key) return false;
    const rec = { board: id, key, entries: MM.searchEntriesOf(session.getState()) };
    finder.index.set(id, rec);
    finder.builds++;
    findWrite('index', rec);
    findNotify();
    return true;
  }
  /** A change was journaled (17-folder.js): the board on screen is indexed a moment after the last one. */
  function findChanged(id) {
    if (id !== board.id) return;
    if (finder.timer) clearTimeout(finder.timer);
    finder.timer = setTimeout(findRun, FIND_DEBOUNCE_MS);
  }
  /** The debounced run: only while the hand is not on the glass, and when the browser has a moment. */
  function findRun() {
    finder.timer = 0;
    if (finder.down) { finder.timer = setTimeout(findRun, 400); return; }
    const go = () => { try { findIndexCurrent(); findThumbCurrent(false); } catch (err) { /* the index is a convenience */ } };
    if (typeof requestIdleCallback === 'function') requestIdleCallback(go, { timeout: 2000 }); else go();
  }

  // ----- the picture of a board ------------------------------------------------------------------------------------
  /**
   * A board drawn small, from its state: the pictures first (as the paint draws them, under the ink), a faint plate
   * where anything else stands, then the ink — its clean form where it holds one — in its maker's colour. `pic(asset)`
   * is a decoded bitmap or nothing (a plate then). The same marks, forms and colours the canvas draws, in a picture
   * of its own: the board on screen is never repainted for it. Returns a JPEG as a data URL, or null.
   */
  function findPaintThumb(st, pic) {
    const cv = document.createElement('canvas');
    cv.width = THUMB_W; cv.height = THUMB_H;
    const g = cv.getContext('2d');
    if (!g) return null;
    const cs = getComputedStyle(document.documentElement);
    const tok = (n, d) => cs.getPropertyValue(n).trim() || d;
    g.fillStyle = tok('--ground', '#f8f6f1');
    g.fillRect(0, 0, THUMB_W, THUMB_H);
    const ink = tok('--ink', '#222'), agent = tok('--agent', '#68a'), goldRGB = tok('--gold-rgb', '201,168,76');
    const gone = (n) => n.reps.some((r) => r.modality === 'erased');
    const items = [];
    let box = null;
    const grow = (b) => { if (!b || !MM.finiteBounds(b)) return; box = box ? { minX: Math.min(box.minX, b.minX), minY: Math.min(box.minY, b.minY), maxX: Math.max(box.maxX, b.maxX), maxY: Math.max(box.maxY, b.maxY) } : { minX: b.minX, minY: b.minY, maxX: b.maxX, maxY: b.maxY }; };
    const artifacts = new Set(st.artifacts);
    const inkOf = (n) => {
      const pts = MM.cleanPointsOf(n) || MM.strokePointsOf(n);
      if (!pts || pts.length < 2) return;
      const b = MM.getBounds(pts);
      grow(b);
      const made = n.edges.find((e) => e.rel === 'made-by');
      items.push({ k: 'ink', pts, colour: !made || made.to === MM.LOCAL_PARTICIPANT ? ink : agent });
    };
    let pictures = 0;
    for (const id of st.contentIds) {
      const n = st.nodes.get(id);
      if (!n || gone(n)) continue;
      if (artifacts.has(id)) {
        const b = MM.boundsOf(n);
        if (!b) continue;
        grow(b);
        const p = MM.pictureOf(n);
        const code = MM.getRep(n, 'code');
        const kind = code && code.data && code.data.kind;
        items.push({ k: p ? 'pic' : 'plate', b, asset: p && p.asset, text: kind === 'text' || kind === 'md' });
        if (!p && kind !== 'text' && kind !== 'md') for (const e of n.edges) { if (e.rel !== 'has-part') continue; const m = st.nodes.get(e.to); if (m && !gone(m)) inkOf(m); }
        if (p) pictures++;
      } else inkOf(n);
      if (items.length > THUMB_MARKS * 2) break;
    }
    const fit = MM.thumbFit(box, THUMB_W, THUMB_H, THUMB_PAD);
    g.setTransform(fit.scale, 0, 0, fit.scale, fit.x, fit.y);
    g.lineCap = 'round'; g.lineJoin = 'round';
    const px = 1 / fit.scale;
    let decoded = 0;
    for (const it of items) {
      if (it.k !== 'pic') continue;
      const bmp = it.asset && decoded < THUMB_PICTURES ? pic(it.asset) : null;
      if (bmp) { decoded++; try { g.drawImage(bmp, it.b.minX, it.b.minY, it.b.maxX - it.b.minX, it.b.maxY - it.b.minY); continue; } catch (err) { /* a plate, then */ } }
      g.fillStyle = 'rgba(' + goldRGB + ',0.14)';
      g.fillRect(it.b.minX, it.b.minY, it.b.maxX - it.b.minX, it.b.maxY - it.b.minY);
    }
    for (const it of items) {
      if (it.k !== 'plate') continue;
      g.fillStyle = 'rgba(' + goldRGB + ',0.07)';
      g.fillRect(it.b.minX, it.b.minY, it.b.maxX - it.b.minX, it.b.maxY - it.b.minY);
      g.strokeStyle = 'rgba(' + goldRGB + ',0.45)'; g.lineWidth = 1.2 * px;
      g.strokeRect(it.b.minX, it.b.minY, it.b.maxX - it.b.minX, it.b.maxY - it.b.minY);
      if (it.text) {
        // A few lines where words stand: what a text looks like at a glance.
        g.strokeStyle = 'rgba(' + goldRGB + ',0.5)';
        const w = it.b.maxX - it.b.minX, h = it.b.maxY - it.b.minY, rows = Math.max(1, Math.min(6, Math.floor((h * fit.scale - 6) / 5)));
        for (let r = 0; r < rows; r++) { const y = it.b.minY + ((r + 1) * h) / (rows + 1); g.beginPath(); g.moveTo(it.b.minX + w * 0.08, y); g.lineTo(it.b.minX + w * (r === rows - 1 ? 0.5 : 0.92), y); g.stroke(); }
      }
    }
    const inks = items.filter((it) => it.k === 'ink');
    const stride = inks.length > THUMB_MARKS ? Math.ceil(inks.length / THUMB_MARKS) : 1;
    g.lineWidth = Math.max(1.3 * px, 0.6);
    const tol2 = px * px * 0.64;
    for (let i = 0; i < inks.length; i += stride) {
      const it = inks[i], pts = it.pts;
      g.strokeStyle = it.colour;
      g.beginPath();
      let lx = pts[0].x, ly = pts[0].y;
      g.moveTo(lx, ly);
      for (let j = 1; j < pts.length; j++) {
        const p = pts[j];
        if (j < pts.length - 1) { const dx = p.x - lx, dy = p.y - ly; if (dx * dx + dy * dy < tol2) continue; }
        g.lineTo(p.x, p.y); lx = p.x; ly = p.y;
      }
      g.stroke();
    }
    try { return cv.toDataURL('image/jpeg', THUMB_JPEG); } catch (err) { return null; }
  }
  /** The board on screen drawn small now — from the pictures the canvas already holds decoded. Kept under the key of what it holds. */
  function findThumbCurrent(force, leaving) {
    if (!findCurrentOk(leaving)) return false;
    if (!finder.loaded && !leaving) return false;
    const id = board.id, key = findKeyOf(id);
    if (!key) return false;
    const held = finder.thumbs.get(id);
    if (held && (held.key === key || !force)) return false;
    const src = findPaintThumb(session.getState(), (a) => { const e = pictures.get(a); return e && e.bmp ? e.bmp : null; });
    if (!src) return false;
    const rec = { board: id, key, src };
    finder.thumbs.set(id, rec);
    findWrite('thumbs', rec);
    findNotify();
    return true;
  }
  /** The board is being left (17-folder.js's switchBoard, before it goes): what it says and how it looks, from the live state — it will not be there in a moment. */
  function findLeaving() {
    try {
      findIndexCurrent(true);
      findThumbCurrent(true, true);
    } catch (err) { /* a board is left whatever Find makes of it */ }
  }

  // ----- every other board ------------------------------------------------------------------------------------------
  const findPause = (ms) => new Promise((r) => setTimeout(r, ms));
  /** The decoded pictures a thumbnail needs, for a board replayed in a scratch session: read from the asset store, small. */
  async function findPictures(st) {
    const out = new Map();
    for (const id of st.artifacts) {
      if (out.size >= THUMB_PICTURES) break;
      const n = st.nodes.get(id), p = n && MM.pictureOf(n);
      if (!p || !p.asset || out.has(p.asset)) continue;
      try {
        const rec = await assetGet(p.asset);
        if (!rec) continue;
        const blob = new Blob([rec.bytes], { type: rec.mime || 'image/jpeg' });
        const w = rec.w || p.w, h = rec.h || p.h;
        let bmp = null;
        if (w && h) { const k = Math.min(1, 320 / Math.max(w, h)); try { bmp = await createImageBitmap(blob, { resizeWidth: Math.max(1, Math.round(w * k)), resizeHeight: Math.max(1, Math.round(h * k)), resizeQuality: 'low' }); } catch (err) { bmp = null; } }
        if (!bmp) bmp = await createImageBitmap(blob);
        out.set(p.asset, bmp);
      } catch (err) { /* a plate, then */ }
    }
    return out;
  }
  /** One board, other than the one on screen: its records read, replayed in a scratch session, what it says kept and its picture drawn. */
  async function findBuildOther(id) {
    const db = await boardDB();
    const key0 = findKeyOf(id);
    const got = await idbBackend(db, id).read();
    const plan = openPlan({ meta: got.meta, records: got.records, legacy: null, owner: true, fallback: false, now: Date.now() });
    let key = key0;
    if (!key) {
      // A board R3 kept and no one has opened since says nothing of what it holds: said from its records, as opening it would.
      let chars = 0, last = 0;
      for (const r of got.records) chars += (r.text || '').length;
      for (const ev of plan.events) if (ev && typeof ev.at === 'number' && ev.at > last) last = ev.at;
      boards.stats.set(id, statsOf(plan.events, chars, last || (got.meta && got.meta.created) || 0));
      key = findKeyOf(id);
    }
    const scratch = MM.createSession();
    scratch.load(plan.events);
    const st = scratch.getState();
    const entries = MM.searchEntriesOf(st);
    const pics = await findPictures(st);
    let src = null;
    try { src = findPaintThumb(st, (a) => pics.get(a) || null); } finally { for (const b of pics.values()) { try { b.close(); } catch (err) { /* gone */ } } }
    const rec = { board: id, key, entries };
    finder.index.set(id, rec);
    finder.builds++;
    findWrite('index', rec);
    if (src) { const t = { board: id, key, src }; finder.thumbs.set(id, t); findWrite('thumbs', t); }
  }

  /**
   * Every board whose kept index is missing or stale, read and indexed, the most recent first, one at a time with a
   * pause between, and each a quiet moment: nothing while the pointer is down. The board on screen is indexed from
   * its live state. A board no longer wanted (emptied from the trash) is let go. One sync runs at a time.
   */
  function findSync() {
    if (finder.syncing) return finder.syncing;
    finder.syncing = (async () => {
      try {
        await findLoad();
        for (let i = 0; i < 300 && !(boards.ready && board.ready); i++) await findPause(100);
        if (boards.how !== 'indexeddb') return;
        if (boardsListed) await boardsListed.catch(() => {});
        const wanted = findWanted();
        const held = {};
        for (const id of new Set([...finder.index.keys(), ...finder.thumbs.keys()])) {
          const idx = finder.index.get(id), th = finder.thumbs.get(id);
          // The board on screen is drawn on leaving and when its pane opens; every other is drawn with what it says.
          const isCur = onBoardHere() && id === board.id;
          held[id] = idx && th && (th.key === idx.key || isCur) ? idx.key : '~';
        }
        const plan = MM.stalePlan(wanted.map((e) => ({ id: e.id, key: findKeyOf(e.id) })), held);
        for (const id of plan.drop) { finder.index.delete(id); finder.thumbs.delete(id); }
        if (plan.drop.length) findTx('readwrite', (tx) => { for (const id of plan.drop) { tx.objectStore('index').delete(id); tx.objectStore('thumbs').delete(id); } }).catch(() => {});
        // A board that has no key yet (nothing said of what it holds) is built too: its key is made from its records.
        const build = [...new Set(plan.build.concat(wanted.filter((e) => !findKeyOf(e.id)).map((e) => e.id)))];
        let done = 0;
        for (const id of build) {
          finder.progress = { done, total: build.length };
          findNotify();
          while (finder.down) await findPause(200);
          try {
            if (onBoardHere() && id === board.id) { findIndexCurrent(); findThumbCurrent(false); }
            else if (boards.entries.has(id)) await findBuildOther(id);
          } catch (err) { /* a board that cannot be read is found by its name only */ }
          done++;
          await findPause(FIND_PAUSE_MS);
        }
      } finally {
        finder.progress = null;
        finder.syncing = null;
        findNotify();
      }
    })();
    return finder.syncing;
  }
  /** Soon, and once: the list changed, or the page has just opened. */
  function findSyncSoon(ms) {
    if (finder.syncSoon) clearTimeout(finder.syncSoon);
    finder.syncSoon = setTimeout(() => { finder.syncSoon = 0; findSync(); }, ms === undefined ? 900 : ms);
  }
  /** Boards emptied from the trash: what was kept for them goes. */
  function findDrop(ids) {
    for (const id of ids) { finder.index.delete(id); finder.thumbs.delete(id); }
    if (ids.length) findTx('readwrite', (tx) => { for (const id of ids) { tx.objectStore('index').delete(id); tx.objectStore('thumbs').delete(id); } }).catch(() => {});
  }
  /** Everything pending done now (for tests, and for a query asked a moment after a change): the debounce run, and a sync. */
  async function findIdle() {
    if (finder.timer) { clearTimeout(finder.timer); finder.timer = 0; }
    if (finder.syncSoon) { clearTimeout(finder.syncSoon); finder.syncSoon = 0; }
    await findLoad();
    findIndexCurrent();
    await findSync();
    findIndexCurrent();
    return true;
  }
  /** For tests: what is kept, by board — its key and how much it holds — and how many indexes this page has made. */
  function findState() {
    return {
      how: finder.how, builds: finder.builds, syncing: !!finder.syncing, progress: finder.progress ? Object.assign({}, finder.progress) : null,
      index: Object.fromEntries([...finder.index].map(([k, v]) => [k, { key: v.key, entries: v.entries.length }])),
      thumbs: Object.fromEntries([...finder.thumbs].map(([k, v]) => [k, { key: v.key, bytes: v.src.length }])),
    };
  }

  // The page has opened: after the board has, read what was kept and bring it up to date — once, when the page is quiet.
  setTimeout(() => { findLoad().then(() => findSyncSoon(1500)); }, 2500);

// ===== folder =====
// Provides: the folder as the canvas — openFolder/openStatic/openStore (discovery into artifacts,
//   per-participant logs merged), autosave (to the folder), the live budget (liveSet), the grid and
//   focus views (setViewMode, focusOn), imageUrlFor, folderStatus; a live room (openLive: logs
//   arriving live over a BroadcastChannel or a relay, merged as they land, and — over a relay — the bytes of
//   the pictures they name: put on it before a line names them, fetched by hash when one is missing,
//   roomAssetFetch; PLAN-IPAD-NOTES A1); and the boards this
//   browser keeps when there is no folder (V1-PLAN R3, R1) — the adapter over 17-board.js's journal
//   and 17-boards.js's list: IndexedDB (openBoard, persistBoard, flushBoard, forgetLocalLog; the list:
//   switchBoard, newBoard, renameBoard, duplicateBoard, trashBoard, restoreBoard, planEmptyTrash,
//   emptyTrash, boardFromFile, resetBoard, rememberPlace, openPlace), the log format's surface (R2:
//   readLogText — a log's text as events or the sentence for a version this build does not read —
//   logWrite, logFileNote; a folder whose log is of a newer version is refused before it is opened),
//   the view per board, browser
//   storage where there is no IndexedDB, the one import of browser storage's old copy, the lock one
//   tab holds per board, what the status line says when a save fails (boardWarning, keepBoardIn), and the one
//   ask that the browser keep the device's storage (askPersist; PLAN-IPAD-NOTES I3).
// Uses: core, board (createJournal, openPlan, troubleOf, troubleWords, journalEvents, journalFold,
//   journalText), boards (the list's pure half), view (fitAll, afterViewChange, clampZoom), teach
//   (savedMark, restoreMark), artifacts, render, input (say, flash), images (downloadText), controls
//   (syncTiles), the boards pane (renderBoardsPane, roomChanged), the seat (seatRoomOpened: who is heard in a room).
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
    // A live room's merge, kept standing between lines (MM.LiveMerge), and the
    // store's revision it last merged — a line that moves no revision is no work.
    merge: null, mergedRevision: -1,
    me: deviceParticipant(),
    myPrevious: [], loadedCount: 0, entries: [], truncated: false,
    urls: new Map(), saveTimer: 0, lastSave: '', saving: false, error: '',
    // What the room has said about itself and has already been said out loud
    // here — a name two hands share, a history older than the relay remembers
    // (the store's `notices`) — so each is flashed once, then stands in the
    // status line.
    noticed: new Set(),
    // What the merge said about a folder's logs: a log name two DIFFERENT
    // events were both numbered under (L1b) — two writers under one name. A
    // live room says it through its store; a folder has only the merge.
    misnumbered: new Map(),
  };

  /**
   * The name this device writes a FOLDER's log under: a preference, stable
   * across page loads, because a folder's whole history is loaded before its
   * first mark (a log name is reused only when its whole history was loaded
   * first — DIRECTOR-PLAN-W2 L1). A live sitting's name is never written here.
   */
  function deviceParticipant() {
    try { return localStorage.getItem(PARTICIPANT_KEY) || 'local'; } catch (err) { return 'local'; }
  }
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

  /**
   * `carry`: the way out of a save that fails (the status line's *open a folder*) — the board
   * on screen goes into the folder as this participant's log, instead of the folder's board
   * replacing it (keepBoardIn).
   */
  async function openFolder(opts) {
    if (!window.showDirectoryPicker) { flash('this browser cannot open a folder — Chrome and Edge can'); return null; }
    let handle;
    try { handle = await window.showDirectoryPicker({ mode: 'readwrite' }); } catch (err) { return null; }
    const store = new MM.FolderStore(handle);
    return opts && opts.carry ? keepBoardIn(store, 'folder', handle.name, handle) : openStore(store, 'folder', handle.name, { handle });
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

  // ===== A live room (v9 S6) =================================================
  // Multiplayer is a transport over the per-participant logs: another hand is
  // another log arriving live. Between tabs on one machine the transport is a
  // BroadcastChannel; between machines it is a relay that forwards lines
  // (Demos/relay.mjs, Server-Sent Events in, POST out). The merge runs as each
  // line lands, and the other hand's ink draws in its colour. A room merges a
  // LINE, not the board (V1-PLAN R4d): the merge is kept standing between lines
  // (`MM.LiveMerge`), a line's events are applied where they fall — no replay
  // when they come after everything held, a replay from the nearest checkpoint
  // when one comes before — and a line that changes no log does no work.
  function broadcastTransport(room) {
    const ch = new BroadcastChannel('mm-live:' + room);
    return {
      send: (line) => ch.postMessage(line),
      onMessage: (cb) => { const h = (e) => cb(e.data); ch.addEventListener('message', h); return () => ch.removeEventListener('message', h); },
      close: () => ch.close(),
    };
  }
  /** How long a line waits for the pictures it names to reach the room — under core's own wait on a send. */
  const ROOM_ASSET_WAIT_MS = 8000;
  function relayTransport(url, room, key) {
    // A relay that asks for a key (cloudflare/relay) takes it as `?key=`: an EventSource cannot set a
    // header. The key is the page's own — from the address or a typed field — and goes nowhere but
    // this address: never the log, the board, an export, or a cache (`sw.js` does not keep a request with one).
    const base = url.replace(/\/+$/, '') + '/rooms/' + encodeURIComponent(room) + '/events' + (key ? '?key=' + encodeURIComponent(key) : '');
    const listeners = new Set();
    let es = null;
    let closed = false;
    let retry = null;
    const deliver = (line) => { for (const cb of listeners) cb(line); };
    // Every line goes to the store — the relay's own word that the room has outlived its buffer
    // included: the store says it (`notices`), and so does every other hand's.
    const onLine = (e) => {
      let line;
      try { line = JSON.parse(e.data); } catch (err) { return; /* not a line */ }
      deliver(line);
    };
    // An EventSource that is closed for good was refused, and cannot say by what: ask once with a plain
    // request. A key the relay will not take is said to the store (`{ relay: 'refused' }`) and not asked
    // again, as Node's transport does; anything else is a hiccup, and the stream is opened again.
    const refusedOr = () => {
      fetch(base, { headers: { accept: 'text/event-stream' }, cache: 'no-store' }).then((res) => {
        const status = res.status;
        if (res.body) res.body.cancel().catch(() => undefined);
        if ([401, 403, 503].includes(status)) { closed = true; deliver({ relay: 'refused', room: room, status: status }); return; }
        if (!closed) retry = setTimeout(open, 3000);
      }, () => { if (!closed) retry = setTimeout(open, 3000); });
    };
    const open = () => {
      if (closed) return;
      es = new EventSource(base);
      es.addEventListener('message', onLine);
      es.addEventListener('error', () => { if (es.readyState === 2 && !closed) refusedOr(); });
    };
    // ----- pictures in the room (PLAN-IPAD-NOTES A1; the rules are 17-assets.js's) -----
    // A header, not `?key=`: a fetch can send one, and an address is kept by logs and caches.
    const assetAuth = key ? { authorization: 'Bearer ' + key } : {};
    const held = new Set();     // pictures the room is known to hold
    const owed = new Set();     // pictures this tab kept that the room could not be given yet: tried again with the next line
    const said = new Set();     // pictures whose trouble was already said
    const sayOnce = (ref, words) => { if (said.has(ref)) return; said.add(ref); say(words); };
    /** Put one picture this tab kept on the relay: once (a HEAD first), never more than the room takes. */
    async function putAsset(ref) {
      if (held.has(ref)) return true;
      const rec = await assetGet(ref).catch(() => null);
      if (!rec) return false;   // not kept here: another hand's, whose writer put it
      const at = roomAssetUrl(url, room, ref);
      try {
        const head = await fetch(at, { method: 'HEAD', headers: assetAuth, cache: 'no-store' });
        if (head.status === 200) { held.add(ref); owed.delete(ref); return true; }
        const bytes = rec.bytes instanceof Uint8Array ? rec.bytes : new Uint8Array(rec.bytes);
        if (bytes.length > ROOM_ASSET_MAX_BYTES) { sayOnce(ref, 'a picture could not go to the room — it is larger than the 12 MB a room takes'); return false; }
        const res = await fetch(at, { method: 'PUT', headers: Object.assign({ 'content-type': rec.mime || 'application/octet-stream' }, assetAuth), body: bytes });
        if (res.status === 204) { held.add(ref); owed.delete(ref); return true; }
        // A refusal that will not change (too large, no key, not a picture) is said and let go; a relay in trouble is tried again.
        if (res.status >= 500) owed.add(ref); else owed.delete(ref);
        sayOnce(ref, roomAssetWords(res.status, await res.text()));
        return false;
      } catch (err) { owed.add(ref); sayOnce(ref, roomAssetWords(0, '')); return false; }
    }
    /** Several pictures, three at a time. */
    async function putAssets(refs) {
      let i = 0;
      const lane = async () => { while (i < refs.length) await putAsset(refs[i++]); };
      await Promise.all([lane(), lane(), lane()]);
    }
    /** A picture the room holds, asked for by its hash: verified against it (the relay is not trusted with what a hash names), kept in this browser's asset store, and returned as the store holds it — or null. */
    async function getAsset(ref, dims) {
      const at = roomAssetUrl(url, room, ref);
      if (!at) return null;
      try {
        const res = await fetch(at, { headers: assetAuth });
        if (res.status !== 200) return null;
        const bytes = new Uint8Array(await res.arrayBuffer());
        if (assetRef(await digestHex(bytes)) !== ref) return null;
        const mime = (res.headers.get('content-type') || '').split(';')[0] || 'image/jpeg';
        await assetPut({ hash: ref, bytes: bytes, mime: mime, w: dims && dims.w, h: dims && dims.h });
        assets.pending.delete(ref);   // stored under an event already in the log: never "in flight"
        held.add(ref);
        return await assetGet(ref);
      } catch (err) { return null; }
    }
    open();
    return {
      // The POST's promise goes back to the store, which sends the next line
      // only when this one has gone — two POSTs in flight can land the wrong
      // way round.
      send: (line) => {
        // A picture's bytes go first (PLAN-IPAD-NOTES A1): a line that names a picture this tab kept goes only once the
        // room holds the bytes — or after ROOM_ASSET_WAIT_MS, so a slow link never wedges the room (a hand that
        // merges the event before the bytes asks again, `roomAssetRetryMs`). A line handed on for another hand (`via`)
        // names what its writer put; one with no pictures waits for nothing.
        const refs = line && !line.via ? roomAssetHashes(line).map((h) => 'sha256:' + h) : [];
        for (const r of owed) if (refs.indexOf(r) < 0) refs.push(r);
        const todo = refs.filter((r) => !held.has(r));
        const ready = todo.length ? Promise.race([putAssets(todo), new Promise((ok) => setTimeout(ok, ROOM_ASSET_WAIT_MS))]) : Promise.resolve();
        return ready.catch(() => undefined).then(() => fetch(base, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(line) })).then(() => undefined, () => undefined);
      },
      onMessage: (cb) => { listeners.add(cb); return () => listeners.delete(cb); },
      close: () => { closed = true; clearTimeout(retry); if (es) es.close(); },
      // The room's pictures: `get` is what 18-images.js asks for a picture this browser holds no bytes for.
      assets: { get: getAsset },
    };
  }
  // The merge runs on a microtask, not a timer: a hidden tab throttles timers
  // to once a second, and another hand's line should land at once. Lines
  // that arrive in one tick coalesce into one merge.
  let liveMergePending = false;
  // A live tab's log is ONE SITTING (DIRECTOR-PLAN-W2 L1): this page load. The
  // suffix of its name and the sitting its store says it writes from are
  // minted once, here, and kept nowhere a reload would find them — a tab
  // keeps no log of its own in a room and never hears its own lines back, so
  // a reload that took the old name back would number from one under a name
  // the room already holds (D2). Joining again in this page load is the same
  // sitting, so the same name and the same sitting id.
  const PAGE_SUFFIX = MM.sittingToken();
  const PAGE_SITTING = MM.sittingToken(8);
  async function openLive(room, opts) {
    opts = opts || {};
    // The board on screen is left only once its store holds all of it (R1).
    if (onBoardHere()) { const v = await readyToLeave(); if (v && v.kind !== 'not-kept') throw new Error(v.words); }
    // From here this page's log is the room's: nothing drawn under the room's
    // name is written into the board this browser keeps (L1: a live tab keeps no local log).
    leaveBoard();
    if (folder.store && folder.store.close) folder.store.close();
    folder.noticed = new Set();
    // A hand in a room is one SITTING: a second tab of the same person is a
    // second log, or their lines would be taken for its own. The name is the
    // person's; the suffix is this page load's. Held in memory only: a
    // sitting's name is never the device's folder name.
    const me = handName();
    folder.me = me;
    // Say what this tab's log is called, so every id it mints from here is
    // derived from the event that made it and is the same mark in every hand
    // in the room (ids per hand, SURFACE-v10-PLAN D8). Unsaid, ids come off a
    // counter over the MERGED replay, and no two hands in a room merge the
    // same set of logs — so a sentence, a reading or a version about a mark
    // would land on whatever mark held that number in the reader's board.
    // What is already drawn keeps the ids it was drawn with: the name applies
    // to what is written next, and the two forms cannot collide.
    session.setLogName(me);
    const transport = opts.transport || (opts.relay ? relayTransport(opts.relay, room, opts.key || params.get('key') || '') : broadcastTransport(room));
    const store = new MM.LiveStore(transport, me, room, { sitting: PAGE_SITTING });
    // Which relay carries the room: the seat parks its questions only through one on this machine (V1-PLAN J4).
    folder.relay = opts.relay || '';
    // The room's pictures, when its relay keeps them (PLAN-IPAD-NOTES A1): between tabs on one machine the asset store is shared already.
    folder.roomAssets = (transport && transport.assets) || null;
    // What this hand already drew is its opening log in the room — sent whole,
    // as a store's first send always is, so joining the same room again in
    // this sitting replaces what the room holds of it instead of doubling it.
    await store.publish(session.getEvents().filter((e) => !e.by));
    store.subscribe(() => { if (liveMergePending) return; liveMergePending = true; Promise.resolve().then(() => { liveMergePending = false; return mergeLive(); }); });
    // `openStore` counted what it loaded BEFORE the device re-taught its mark,
    // so that teach is this hand's and goes out with its log. Counted again
    // here, it was taken for the room's, and the room's first merge dropped it:
    // the board judged this hand by the built-in check from then on (L2h).
    await openStore(store, 'live', room);
    // The room is on the board, loaded whole — joining replaces the board. From
    // here the merge stands between lines, and each line is merged into it.
    folder.merge = new MM.LiveMerge(session, me);
    folder.mergedRevision = -1;
    await mergeLive();
    // Who is heard here, for the seat: Claude's hand, offered in the models pane (24-seat.js).
    seatRoomOpened(store);
    store.hello();
    return folder;
  }
  /** A name for this hand in a room: the person's name (a preference), and this page load's suffix. */
  function handName() {
    return MM.sittingName(prefs.get('hand-name', '') || 'hand', PAGE_SUFFIX);
  }
  /**
   * A picture this browser holds no bytes for, asked of the room's relay by its hash (PLAN-IPAD-NOTES A1): an
   * `import` another hand wrote names the bytes and carries none. Null when there is no room that keeps pictures
   * or it does not hold them (yet); 18-images.js draws a plate and asks again later (`roomAssetRetryMs`).
   */
  async function roomAssetFetch(ref) {
    const ra = folder.roomAssets;
    if (!ra || folder.how !== 'live') return null;
    let dims = {};
    for (const ev of session.getEvents()) if (ev && ev.type === 'import' && ev.asset === ref) { dims = { w: ev.w, h: ev.h }; break; }
    return ra.get(ref, dims);
  }
  /** A hand's name as shown: the person's, without the sitting's suffix (core's one rule). */
  function handLabel(name) { return MM.handLabel(name); }
  /**
   * A line landed: merge it — only when a log another hand wrote changed.
   * A hello, a goodbye, the relay's word, a whole log already held change no
   * log and do no work here; what the room says about itself is still said.
   * The merge is every log the room holds and this hand's own events — sent
   * or not, never the room's copy of them, or a line landing between a send
   * and this merge would count my sent marks twice — and `LiveMerge` hands the
   * session only what changed (`MM.LiveMerge`, `session.rebase`).
   */
  async function mergeLive() {
    if (!folder.store || folder.how !== 'live' || !folder.merge) return;
    let changed = false;
    const rev = folder.store.revision();
    if (rev !== folder.mergedRevision) {
      folder.mergedRevision = rev;
      changed = folder.merge.sync(folder.store.heldLogs()).how !== 'none';
    }
    // What the room says about itself is said here once, the moment it is
    // heard, and then stands in the status line (folderStatus).
    for (const n of folder.store.notices ? folder.store.notices() : []) {
      if (folder.noticed.has(n)) continue;
      folder.noticed.add(n);
      say(n);
      changed = true;
    }
    if (changed && typeof syncTiles === 'function') syncTiles();
  }

  /**
   * Open any store: load the merged logs, discover the files, place what is
   * new. Opening the same store again is what a second machine does after a
   * pull — the board comes back and nothing is discovered twice.
   */
  async function openStore(store, how, name, opts) {
    opts = opts || {};
    // The board on screen, carried in as this participant's log (keepBoardIn), or nothing.
    const carry = opts.carry && opts.carry.length ? opts.carry.map((ev) => Object.assign({}, ev)) : null;
    // The board on screen is left only once its store holds all of it (R1) — unless it is being carried in.
    // A tab that only showed a board another tab holds is not stopped: that tab keeps it, and what was
    // drawn here was said all along not to be kept. A board that is not saved is: the line's own
    // "open a folder" carries it in instead (keepBoardIn), and "export the log" keeps it as a file.
    if (!carry && onBoardHere()) {
      const v = await readyToLeave();
      if (v && v.kind !== 'not-kept') { say(v.words + (v.kind === 'unsaved' ? ' — or "open a folder" in the line, which carries it in' : '')); return null; }
    }
    // A log of a newer version than this build reads (R2) is refused here, before the board on screen is
    // left and before anything could be written over it: half a log is a wrong board.
    let logs = {};
    let readFailed = '';
    try { logs = await store.readLogs(); }
    catch (err) {
      if (err && err.name === 'LogFormatError') { say(err.message); return null; }
      readFailed = 'could not read the logs: ' + (err.message || err);
    }
    // From here this page's log is the folder's or the room's: the board this
    // browser keeps stays as it was (where the hand left it too), and is not written again from this page.
    leaveBoard();
    folder.store = store; folder.how = how || 'store'; folder.name = name || ''; folder.error = ''; folder.saveTrouble = null;
    if (folder.how !== 'live') folder.roomAssets = null;
    // A room's merge stands for that room only; `openLive` makes the next one.
    folder.merge = null;
    // A folder is written under the device's own stable name, whatever a live
    // sitting in this page load was called.
    if (folder.how !== 'live') folder.me = deviceParticipant();
    folder.error = readFailed;
    if (carry) {
      const mine = folder.how === 'live' ? folder.me : MM.participantOfLog(MM.logPathFor(folder.me));
      logs = Object.assign({}, logs, { [mine]: (logs[mine] || []).concat(carry) });
    }
    // One event, applied once (L1b): the merge folds an event found in two
    // logs, and keeps the first of two DIFFERENT events under one number. A
    // live room says the second through its store's notices; a folder says it
    // here, once, and then in the standing line.
    folder.misnumbered = new Map();
    const merged = MM.mergeLogs(logs, Object.assign(folder.how === 'live' ? { me: folder.me } : {}, {
      onCollision: (c) => { if (folder.how !== 'live' && !folder.misnumbered.has(c.origin)) folder.misnumbered.set(c.origin, MM.describeAuthorshipCollision(c)); },
    }));
    const meKey = folder.how === 'live' ? folder.me : MM.participantOfLog(MM.logPathFor(folder.me));
    folder.myPrevious = (logs[meKey] || []).slice();
    // A folder is a room too: one log per participant, merged, and the next
    // machine to pull merges a different set. So the writing session says
    // what its log is called here as well, under the same name its file is
    // written and read back under — `meKey`, never a name of the reader's
    // own devising. Said BEFORE the load, so the load resumes the numbering
    // past whatever this name already wrote rather than starting it again.
    session.setLogName(meKey);
    session.load(merged);
    // What was loaded is everyone's; from here on, every event is this
    // participant's — including the mark this device re-teaches at open.
    folder.loadedCount = session.getEvents().length;
    folder.lastSave = '';
    // The device's mark is re-taught only when this hand's own log already
    // teaches none. A mark is the hand's that taught it (L2h): another hand's
    // teach — stamped `by` — says nothing about this one's, and waiting on it
    // left this hand judged by the other's mark.
    if (!merged.some((ev) => ev.type === 'teach' && !ev.by)) restoreMark();
    let entries = [];
    try { entries = await store.list(); } catch (err) { folder.error = 'could not list the folder: ' + (err.message || err); }
    folder.entries = entries; folder.truncated = !!store.truncated;
    await discover(entries);
    render(session.getState());
    fitAll();
    // A folder, a repository or a site is a recent place in the boards list (never a room; never a key).
    if (folder.how === 'folder' || folder.how === 'git' || folder.how === 'static') rememberPlace(folder.how, folder.name || folder.how, folder.name, opts.handle || null);
    syncBoardFaces();
    const misnumbered = [...folder.misnumbered.values()];
    flash((carry ? 'the board is kept in ' + (folder.name || 'the folder') + ' now — ' + carry.length + ' event' + (carry.length === 1 ? '' : 's') + ' carried in, '
      : 'opened ' + (folder.name || 'a folder') + ': ') + entries.length + ' file' + (entries.length === 1 ? '' : 's') + (folder.truncated ? ' shown — the folder holds more' : '') +
      (misnumbered.length ? ' · ' + misnumbered.join(' · ') : ''));
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
      if (MM.isPictureKind(e.kind)) {
        try { folder.urls.set(e.path, URL.createObjectURL(new Blob([content], { type: MM.rowOf(e.kind).mime }))); } catch (err) { /* no url */ }
        session.import({ kind: e.kind, path: e.path, bounds: bounds, code: '', at: Date.now() });
      } else {
        session.import({ kind: e.kind, path: e.path, bounds: bounds, code: String(content), at: Date.now() });
      }
    }
    return placed;
  }

  // ===== Autosave: the log is saved as it grows ==============================
  // To the folder when there is one — this participant's own file, rewritten
  // whole (nobody else writes it); to the room when this page is in one; and
  // with neither, to the board this browser keeps (below), a record a change.
  // A folder's merge stamps no `by`, so which loaded events are this hand's is
  // read off what its file held (`myLogNow`); a room's are the session's own
  // unstamped events, in the order written (`store.ownLog`) — no event
  // serialised on the way (R4d).
  function myLogNow() {
    const evs = session.getEvents();
    folder.loadedCount = Math.min(folder.loadedCount, evs.length);
    const present = new Set(evs.slice(0, folder.loadedCount).map((e) => JSON.stringify(e)));
    const kept = folder.myPrevious.filter((e) => present.has(JSON.stringify(e)));
    return kept.concat(evs.slice(folder.loadedCount));
  }

  function scheduleSave() {
    if (!folder.store) return; // the board this browser keeps is written as it changes (persistBoard)
    clearTimeout(folder.saveTimer);
    folder.saveTimer = setTimeout(saveNow, 300);
  }

  async function saveNow() {
    if (folder.store && folder.how === 'live') {
      // A live room takes my log as it stands (`publish`): the new tail when
      // it only grew, the whole of it when it did not — an undo, a reset — so
      // every hand in the room holds what this one holds (DIRECTOR-PLAN-W2 L1).
      folder.saving = true;
      try { await folder.store.publish(folder.store.ownLog(session.getEvents())); folder.error = ''; }
      catch (err) { folder.error = 'could not send: ' + (err.message || err); }
      folder.saving = false;
      return;
    }
    if (folder.store && folder.store.capabilities().write) {
      const mine = myLogNow();
      const text = MM.encodeLog(mine, logWrite());
      if (text === folder.lastSave) return;
      folder.saving = true;
      try { await folder.store.write(MM.logPathFor(folder.me), text); folder.lastSave = text; folder.error = ''; setFolderTrouble(null); }
      catch (err) { folder.error = 'could not save: ' + (err.message || err); setFolderTrouble(troubleOf(err, 'folder')); }
      folder.saving = false;
    } else if (!folder.store) {
      // The board this browser keeps: anything not yet written goes now, and
      // this resolves when every record issued has landed (or failed, and said so).
      board.journal.flush(session.getEvents());
      await board.journal.idle();
    }
  }

  /** A folder's write failed, or works again: said at once, and until it works (boardWarning). */
  function setFolderTrouble(t) {
    const was = folder.saveTrouble || null;
    folder.saveTrouble = t;
    if (!!was === !!t) return;
    if (t) render(session.getState());
    else flash('saved to ' + (folder.name || 'the folder') + ' again');
  }

  // ===== The boards this browser keeps (V1-PLAN R3, R1) ======================
  // With no folder, a board is kept in this browser: in IndexedDB, as an
  // append-only journal (17-board.js) — a record per change, begun and
  // committed in the task that made the change, before the paint. It used to
  // be one string in browser storage, the whole log rewritten 900 ms after the
  // last change: saving stopped at about 1,500 marks, the error was swallowed,
  // and a tab that died inside those 900 ms took its strokes with it
  // (PERF.md, hotspot 7). A failure is never silent: the status line leads
  // with it, with the way out, until a save succeeds (boardWarning).
  //
  // SEVERAL BOARDS (R1; 17-boards.js decides, this acts). Each board is its
  // own journal, keyed by the board's id — records under [id, seq], its meta
  // under id — and the list (the `boards` store) holds one entry a board: its
  // name, when it was made, opened and put in the trash. R3's one board is the
  // first entry, "My board", under the key R3 kept it under ("default"),
  // untouched. The name is shown, never the key. A board's meta also says what
  // it holds (when it last changed, its events, marks and characters), written
  // in the same transaction as each record, so the list is right after a kill.
  // One tab writes a board (a Web Lock per board). Switching is in place: what
  // the next board needs is read while the one on screen goes on being
  // written; then the one on screen is flushed and waited on until the store
  // holds all of it — or the switch is refused, said, with the way out — and
  // only then, in one task with nothing awaited, is it left and the next
  // loaded (switchBoard). From a folder, a repository or a room the board
  // opens in a page of its own.
  const BOARD_DB = 'mm-boards';
  const BOARD_DB_VERSION = 2; // 1: R3's records and meta; 2: R1's list of boards
  const BOARD_RETRY_MS = 5000;
  const BOARD_VIEW_KEY = 'view:';
  const boardLockName = (id) => 'mm-board:' + id;
  const board = {
    // The board this page is on: its journal's key.
    id: FIRST_BOARD,
    // Whose board this page is (boardMode): 'restore' | 'fresh' | 'off'.
    mode: 'off',
    ready: false,
    backend: null,
    how: 'none',        // 'indexeddb' | 'browser storage' (no IndexedDB here) | 'none'
    lock: 'none',       // 'held' | 'taken' (another tab holds the board) | 'none' (no Web Locks here)
    from: 'nothing',    // where the board came back from: 'store' | 'browser storage' | 'nothing'
    opened: null,       // what the store held when this page opened it: { arr, len, lastSeq }
    meta: null,         // its meta record, as this page last wrote or read it
    restoring: false,
    dbClosed: false,
    retryTimer: 0,
    release: null,      // lets the lock go: a page that stops keeping the board frees it for another tab
    waitCtl: null,      // stops waiting for a board another tab holds, when this page leaves it
    lateGrant: null,    // the lock came before the board had opened: { id, release }, taken up once it has
    gen: 0,             // bumped at every open: a read begun for a board since left is dropped
    viewSaved: null,
    resetArmed: 0,
    saidAtOpen: false,  // the open said something of its own (an id not held, a board out of the trash)
    journal: null,
  };
  // The list: every board and every recent place, and what each board holds.
  const boards = {
    ready: false,
    how: 'none',        // 'indexeddb' | 'browser storage' (one board only) | 'none'
    entries: new Map(), // id → entry (17-boards.js)
    stats: new Map(),   // id → { changed, events, marks, chars }
    switching: false,
    busy: 0,
    channel: null,
    // Entries this page could not write yet (the store refused: full, say) — held, and written once a
    // record lands again. The list never stands between a board and its journal.
    held: [],
  };
  let boardDbPromise = null;
  // Resolves once this page has read the list (openBoard, openBoardsList): a place opened at boot waits for it.
  let boardsListed = null;

  /** A journal bound to one board's store; what the board holds rides in each record's transaction. */
  function journalFor(id, backend) {
    const jn = createJournal({
      append(rec, o) {
        const stats = statsAfter(boards.stats.get(id), rec, session.getEvents(), Date.now());
        const meta = Object.assign({}, board.id === id && board.meta ? board.meta : {}, o.meta || {}, stats, { board: id });
        const p = backend.append(rec, { compact: o.compact, meta });
        if (board.id === id) board.meta = meta;
        boards.stats.set(id, stats);
        if (typeof renderBoardsPane === 'function') renderBoardsPane(true);
        findChanged(id); // Find (I6): the board on screen is indexed a moment after its last change
        return p;
      },
    }, {
      now: () => Date.now(),
      onTrouble: (t, was) => { if (board.journal === jn) boardTroubleChanged(t, was); },
      onLanded: (x) => {
        // The old copy in browser storage goes once the import has landed — not before.
        if (x.meta && id === FIRST_BOARD && board.how === 'indexeddb') { try { localStorage.removeItem(LOCAL_LOG_KEY); } catch (err) { /* nothing */ } }
        // The store takes writes again: what the list could not write, now.
        if (boards.held.length) writeHeldEntries();
      },
    });
    return jn;
  }
  board.journal = journalFor(FIRST_BOARD, { append: () => Promise.reject(new DOMException('the board is not open', 'InvalidStateError')) });

  /** This page no longer keeps its board (a folder, a room, or another board keeps its log): the journal stops, and another tab may take it. */
  function leaveBoard() {
    saveBoardView();
    if (board.waitCtl) { try { board.waitCtl.abort(); } catch (err) { /* nothing */ } board.waitCtl = null; }
    if (board.lateGrant) { board.lateGrant.release(); board.lateGrant = null; }
    board.journal.off();
    if (board.release) { board.release(); board.release = null; }
    board.lock = 'none';
    clearInterval(board.retryTimer);
    board.retryTimer = 0;
  }

  /**
   * Whose board this page is. 'restore' — the device's, brought back; 'fresh'
   * — the device's, started empty (?fresh=1: what it holds is replaced at the
   * first change, as before); 'off' — not the device's: a live room keeps no
   * log of its own (DIRECTOR-PLAN-W2 L1), a replay and an embed are figures
   * (the whitepaper embeds both, and a figure must never write over the
   * reader's board), and a folder or a repository named in the URL is its own.
   */
  function boardMode() {
    if (params.has('live') || params.has('replay') || EMBED || params.has('folder') || params.has('git')) return 'off';
    return params.has('fresh') ? 'fresh' : 'restore';
  }
  /** A board is on screen: not a folder, a repository or a room, and not a figure. */
  function onBoardHere() { return !folder.store && board.mode !== 'off'; }
  function boardEntryName(id) { const e = boards.entries.get(id); return (e && e.name) || (id === FIRST_BOARD ? FIRST_BOARD_NAME : id); }
  /** What is on screen, by name: the board's, or the folder's, repository's, site's or room's. */
  function boardOnScreenName() {
    if (folder.store) return folder.name || (folder.how === 'live' ? 'room' : 'folder');
    if (board.mode === 'off') return '';
    return boardEntryName(board.id);
  }

  function openBoardDB() {
    return new Promise((resolve, reject) => {
      let req;
      try { req = indexedDB.open(BOARD_DB, BOARD_DB_VERSION); } catch (err) { reject(err); return; }
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('records')) db.createObjectStore('records', { keyPath: ['board', 'seq'] });
        if (!db.objectStoreNames.contains('meta')) db.createObjectStore('meta', { keyPath: 'board' });
        // R1: one entry a board (and one a recent place). R3's records and meta are left as they are.
        if (!db.objectStoreNames.contains('boards')) db.createObjectStore('boards', { keyPath: 'id' });
      };
      req.onsuccess = () => {
        const db = req.result;
        // A newer page asking for a new version: it may; this page says it stopped saving.
        db.onversionchange = () => { db.close(); board.dbClosed = true; boardDbPromise = null; board.journal.broken({ kind: 'refused', detail: 'a newer copy of the page took the board over' }); };
        // Closed by the browser (site data cleared under it): the next try opens it again.
        db.onclose = () => { board.dbClosed = true; boardDbPromise = null; };
        resolve(db);
      };
      req.onerror = () => reject(req.error || new DOMException('the browser would not open its storage', 'UnknownError'));
      // An older copy of the page holds the store open at an older version and will not let go.
      req.onblocked = () => { board.journal.broken({ kind: 'tab', detail: 'an older copy of the page' }); };
    });
  }
  /** The one connection, opened once — and said, not waited on forever, when the store never answers. */
  function boardDB() {
    if (!boardDbPromise) {
      boardDbPromise = Promise.race([openBoardDB(), new Promise((resolve, reject) => setTimeout(() => reject(new DOMException('the browser did not open its storage within 10 s', 'TimeoutError')), 10000))]);
      boardDbPromise.catch(() => { boardDbPromise = null; });
    }
    return boardDbPromise;
  }

  /** IndexedDB as one board's store: `records` keyed [board, seq], `meta` keyed by board. */
  function idbBackend(db, id) {
    const every = () => IDBKeyRange.bound([id, 0], [id, Infinity]);
    return {
      id,
      // Begun AND committed before it returns: once this task ends the record
      // is the browser's to keep, whatever becomes of the tab (the kill test).
      append(rec, o) {
        return new Promise((resolve, reject) => {
          const tx = db.transaction(o.meta ? ['records', 'meta'] : ['records'], 'readwrite', { durability: 'strict' });
          try {
            const rs = tx.objectStore('records');
            if (o.compact) rs.delete(IDBKeyRange.bound([id, 0], [id, rec.seq], false, true));
            rs.add({ board: id, seq: rec.seq, on: rec.on, base: rec.base, n: rec.n, text: rec.text });
            if (o.meta) tx.objectStore('meta').put(Object.assign({}, o.meta, { board: id }));
          } catch (err) {
            // A request refused as it is made (a whole log's delete already issued): the transaction
            // is abandoned, so the delete never lands without the log that replaces what it deletes.
            try { tx.abort(); } catch (e) { /* already finished */ }
            reject(err);
            return;
          }
          tx.oncomplete = () => resolve();
          tx.onabort = () => reject(tx.error || new DOMException('the browser abandoned the write', 'AbortError'));
          if (tx.commit) tx.commit();
        });
      },
      read() {
        return new Promise((resolve, reject) => {
          const tx = db.transaction(['records', 'meta'], 'readonly');
          const out = { meta: null, records: [] };
          tx.objectStore('meta').get(id).onsuccess = (e) => { out.meta = e.target.result || null; };
          tx.objectStore('records').getAll(every()).onsuccess = (e) => { out.records = e.target.result || []; };
          tx.oncomplete = () => resolve(out);
          tx.onabort = () => reject(tx.error || new DOMException('the browser abandoned the read', 'AbortError'));
        });
      },
      /** What the board holds, said again without a record (a board opened that R3 kept had none of it). */
      putMeta(meta) {
        return new Promise((resolve, reject) => {
          const tx = db.transaction(['meta'], 'readwrite');
          tx.objectStore('meta').put(Object.assign({}, meta, { board: id }));
          tx.oncomplete = () => resolve();
          tx.onabort = () => reject(tx.error);
          if (tx.commit) tx.commit();
        });
      },
      clear() {
        return new Promise((resolve, reject) => {
          const tx = db.transaction(['records', 'meta'], 'readwrite');
          tx.objectStore('records').delete(every());
          tx.objectStore('meta').delete(id);
          tx.oncomplete = () => resolve();
          tx.onabort = () => reject(tx.error);
          if (tx.commit) tx.commit();
        });
      },
    };
  }

  /**
   * Browser storage as the journal's store, where there is no IndexedDB: the
   * whole log under one key, as before R3 — and a failure there is said like
   * any other. One board only: there is nowhere to keep a list.
   */
  function legacyBackend(events) {
    let log = (events || []).slice();
    return {
      id: FIRST_BOARD,
      append(rec) {
        try {
          const evs = journalEvents(rec.text).events;
          if (rec.base === 0) log = evs;
          else if (rec.base <= log.length) { log.length = rec.base; for (const ev of evs) log.push(ev); }
          else throw new DOMException('a record came before the one it follows', 'DataError');
          localStorage.setItem(LOCAL_LOG_KEY, JSON.stringify(log));
          return Promise.resolve();
        } catch (err) { return Promise.reject(err); }
      },
      read() { return Promise.resolve({ meta: null, records: [] }); },
      putMeta() { return Promise.resolve(); },
      clear() { log = []; try { localStorage.removeItem(LOCAL_LOG_KEY); } catch (err) { /* nothing */ } return Promise.resolve(); },
    };
  }

  /**
   * One tab writes a board. Two tabs appending to one journal would
   * interleave two logs into a board neither showed, so each board is a Web
   * Lock, held while this page is on it; a second tab shows the board and
   * writes nothing, and says so. The lock of a tab that died is released by
   * the browser, so the wait is short. Resolves { state: 'held' | 'taken' |
   * 'none' (no Web Locks here: this tab writes, as before), release }.
   */
  function takeBoardLock(id, waitMs) {
    if (!(navigator.locks && navigator.locks.request)) return Promise.resolve({ state: 'none', release: null });
    return new Promise((resolve) => {
      let settled = false;
      const ctl = typeof AbortController === 'function' ? new AbortController() : null;
      const timer = setTimeout(() => { if (settled) return; settled = true; if (ctl) ctl.abort(); resolve({ state: 'taken', release: null }); }, waitMs);
      const none = () => { if (!settled) { settled = true; clearTimeout(timer); resolve({ state: 'none', release: null }); } };
      try {
        navigator.locks.request(boardLockName(id), ctl ? { signal: ctl.signal } : {}, () => {
          let release;
          const held = new Promise((r) => { release = r; }); // first, so a page that no longer keeps the board can let it go at once
          if (settled) { lateGrant(id, release); return held; }
          settled = true; clearTimeout(timer); resolve({ state: 'held', release });
          return held;
        }).catch(none);
      } catch (err) { none(); } // a page the lock manager will not serve (an opaque origin): this tab writes, as before
    });
  }
  /** The lock came just as this page stopped waiting for it: taken up as a board let go — once this page is on that board. */
  function lateGrant(id, release) {
    if (board.id === id && board.ready && board.opened && onBoardHere() && board.journal.state === 'readonly' && board.lock !== 'held') { boardFreed(id, release); return; }
    if (board.lateGrant && board.lateGrant.release !== release) board.lateGrant.release();
    board.lateGrant = { id, release };
  }
  /** Wait for the tab holding board `id` to let it go; stopped when this page leaves the board. */
  function waitForBoard(id) {
    if (!(navigator.locks && navigator.locks.request)) return;
    const ctl = typeof AbortController === 'function' ? new AbortController() : null;
    board.waitCtl = ctl;
    try {
      navigator.locks.request(boardLockName(id), ctl ? { signal: ctl.signal } : {}, () => {
        let release;
        const held = new Promise((r) => { release = r; });
        boardFreed(id, release);
        return held;
      }).catch(() => { /* stopped waiting */ });
    } catch (err) { /* nothing */ }
  }
  /** The other tab let go of board `id`: this one writes it from here — if nothing was written since it opened. */
  async function boardFreed(id, release) {
    if (board.id !== id || !onBoardHere() || board.journal.state === 'off' || board.lock === 'held') { if (release) release(); return; }
    if (!board.backend || !board.opened || !board.ready) {
      if (board.lateGrant && board.lateGrant.release !== release) board.lateGrant.release();
      board.lateGrant = { id, release };
      return;
    }
    const gen = board.gen;
    board.lock = 'held';
    board.release = release;
    board.waitCtl = null;
    let got;
    try { got = await board.backend.read(); } catch (err) { board.journal.broken(troubleOf(err, 'read')); return; }
    if (gen !== board.gen) return; // this page has left the board since: leaveBoard let the lock go
    const fold = journalFold(got.records);
    if (fold.lastSeq !== board.opened.lastSeq) { board.journal.readonly({ kind: 'elsewhere', detail: '' }); return; }
    board.meta = got.meta;
    board.journal.arm({ seq: fold.lastSeq, chain: fold.chain, sinceFull: fold.sinceFull, arr: board.opened.arr, len: board.opened.len, whole: fold.skipped.length > 0 || fold.bad > 0 || !got.meta, meta: got.meta ? null : { v: 1, created: Date.now(), imported: 0 } });
    persistBoard();
    flash('saving here now — the other tab let the board go');
  }

  // ----- The list ------------------------------------------------------------
  /** Every entry and every board's meta, in one read. */
  function readBoardsList(db) {
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['boards', 'meta'], 'readonly');
      const out = { entries: [], metas: [] };
      tx.objectStore('boards').getAll().onsuccess = (e) => { out.entries = e.target.result || []; };
      tx.objectStore('meta').getAll().onsuccess = (e) => { out.metas = e.target.result || []; };
      tx.oncomplete = () => resolve(out);
      tx.onabort = () => reject(tx.error || new DOMException('the browser abandoned the read', 'AbortError'));
    });
  }
  /** What a meta record says the board holds, if it says (R3's said nothing of it). */
  function statsOfMeta(m) {
    return m && typeof m.events === 'number' ? { changed: m.changed || 0, events: m.events, marks: m.marks || 0, chars: m.chars || 0 } : null;
  }
  /** The list as the store holds it, taken into this page (the board on screen keeps what this page knows of it). */
  function takeBoardsList(got) {
    boards.entries = new Map(got.entries.map((e) => [e.id, e]));
    for (const h of boards.held) boards.entries.set(h.id, h); // not written yet: still this page's
    const mine = onBoardHere() ? boards.stats.get(board.id) : null;
    boards.stats = new Map();
    for (const m of got.metas) { const s = statsOfMeta(m); if (s) boards.stats.set(m.board, s); }
    if (mine) boards.stats.set(board.id, mine);
  }
  /** Read the list again (another tab changed it), and say what changed here. */
  function rereadBoards() {
    if (boards.how !== 'indexeddb') return Promise.resolve();
    return boardDB().then(readBoardsList).then((got) => { takeBoardsList(got); syncBoardFaces(); }, () => { /* the list stays as this page last knew it */ });
  }
  /** A readwrite transaction over the list; `fn(tx)` issues the writes. Resolves with what `fn` returned, once committed. */
  function boardsTx(stores, fn) {
    boards.busy++;
    return boardDB().then((db) => new Promise((resolve, reject) => {
      let tx, out;
      try { tx = db.transaction(stores, 'readwrite'); out = fn(tx); } catch (err) { try { if (tx) tx.abort(); } catch (e) { /* nothing */ } reject(err); return; }
      tx.oncomplete = () => resolve(out);
      tx.onabort = () => reject(tx.error || new DOMException('the browser abandoned the write', 'AbortError'));
    })).finally(() => { boards.busy--; });
  }
  /** Change entries as the store holds them — read and written in one transaction, since another tab may have changed them. */
  function updateBoardEntries(ids, change) {
    return boardsTx(['boards'], (tx) => {
      const st = tx.objectStore('boards');
      const done = [];
      for (const id of ids) {
        st.get(id).onsuccess = (e) => {
          // An entry the store refused earlier is changed where it is held, and written with the change.
          const cur = e.target.result || boards.held.find((h) => h.id === id);
          const next = cur && change(cur);
          if (next) { st.put(next); done.push(next); }
        };
      }
      return done;
    }).then((done) => {
      for (const e of done) { boards.entries.set(e.id, e); boards.held = boards.held.filter((h) => h.id !== e.id); }
      if (done.length) boardsChanged();
      return done;
    });
  }
  /** A new board, with a log or empty: its entry, its first record and its meta in one transaction. */
  function writeNewBoard(entry, events, view) {
    const now = Date.now();
    const evs = events || [];
    const text = journalText(evs);
    const stats = statsOf(evs, text.length, now);
    return boardsTx(['boards', 'records', 'meta'], (tx) => {
      tx.objectStore('boards').put(entry);
      if (evs.length) tx.objectStore('records').add({ board: entry.id, seq: 1, on: 1, base: 0, n: evs.length, text });
      tx.objectStore('meta').put(Object.assign({ board: entry.id, v: 1, created: now, imported: 0 }, stats));
    }).then(() => {
      boards.entries.set(entry.id, entry);
      boards.stats.set(entry.id, stats);
      if (view) prefs.set(BOARD_VIEW_KEY + entry.id, view);
      boardsChanged();
      return entry;
    });
  }
  /** Entries the store refused, held until it takes writes again. */
  function holdEntries(list) {
    for (const e of list) { boards.entries.set(e.id, e); boards.held = boards.held.filter((h) => h.id !== e.id).concat([e]); }
  }
  function writeHeldEntries() {
    const list = boards.held;
    boards.held = [];
    return boardsTx(['boards'], (tx) => { for (const e of list) tx.objectStore('boards').put(e); })
      .then(() => boardsChanged(), () => { boards.held = list.concat(boards.held); });
  }
  /** An id for a new board: never a name, never reused. */
  function mintBoardId() {
    let r = '';
    try { const a = new Uint32Array(2); crypto.getRandomValues(a); r = a[0].toString(36) + a[1].toString(36); } catch (err) { r = Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2); }
    return 'b-' + Date.now().toString(36) + '-' + r.slice(0, 8);
  }
  /** The list changed here: this page's faces, the pane, and every other tab of this browser. */
  function boardsChanged() {
    syncBoardFaces();
    findSyncSoon(); // Find (I6): a board made, copied, restored or let go is read once things are quiet
    try { if (boards.channel) boards.channel.postMessage({ type: 'boards', at: Date.now() }); } catch (err) { /* nothing */ }
  }
  try {
    if (typeof BroadcastChannel === 'function') {
      boards.channel = new BroadcastChannel('mm-boards');
      boards.channel.onmessage = () => { rereadBoards(); };
    }
  } catch (err) { boards.channel = null; }

  /** The title, the boards tile and the pane, from what is on screen. Figures keep theirs. */
  function syncBoardFaces() {
    if (!EMBED && !params.has('replay')) {
      const name = boardOnScreenName();
      if (name) document.title = boardTitle(name);
    }
    if (typeof syncTiles === 'function') syncTiles();
    if (typeof renderBoardsPane === 'function') renderBoardsPane();
  }

  /** A place opened on the page is remembered in the list: a folder (with its handle, where the browser keeps one), a repository, a site. */
  async function rememberPlace(how, spec, name, handle) {
    const kind = how === 'git' ? 'git' : how === 'static' ? 'static' : how === 'folder' ? 'folder' : null;
    if (!kind || !spec) return;
    if (boardsListed) await boardsListed.catch(() => {});
    if (boards.how !== 'indexeddb') return;
    const entry = placeEntry(kind, spec, name, Date.now());
    const plan = placesPlan([...boards.entries.values()], entry);
    const write = (withHandle) => boardsTx(['boards'], (tx) => {
      const st = tx.objectStore('boards');
      st.put(withHandle && handle ? Object.assign({}, entry, { handle }) : entry);
      for (const id of plan.drop) st.delete(id);
    });
    // A handle the browser cannot keep is left out: the folder is then opened again by its picker.
    return write(true).catch(() => write(false)).then(() => {
      boards.entries.set(entry.id, handle ? Object.assign({}, entry, { handle }) : entry);
      for (const id of plan.drop) boards.entries.delete(id);
      boardsChanged();
    }, () => { /* remembering a place is a convenience; the place itself is open */ });
  }
  /** A recent place, opened again the way its tile opens it. */
  async function openPlace(id) {
    const e = boards.entries.get(id);
    if (!e) return null;
    if (e.kind === 'static') return openStatic(e.spec);
    if (e.kind === 'git') return openGit(e.spec);
    if (e.kind === 'folder') {
      if (e.handle && e.handle.requestPermission) {
        try {
          const ok = (await e.handle.queryPermission({ mode: 'readwrite' })) === 'granted' || (await e.handle.requestPermission({ mode: 'readwrite' })) === 'granted';
          if (ok) return openStore(new MM.FolderStore(e.handle), 'folder', e.handle.name, { handle: e.handle });
        } catch (err) { /* the picker, then */ }
      }
      return openFolder();
    }
    return null;
  }

  // ----- The view, per board --------------------------------------------------
  // Where the hand left a board — its zoom and pan — is this device's, not the
  // board's (a board is its log, nothing else): a preference per board id,
  // saved on the way out of a board or a page, and a moment after the view moves.
  function saveBoardView() {
    if (!onBoardHere() || !board.ready) return;
    const v = { zoom: view.zoom, panX: view.panX, panY: view.panY };
    const was = board.viewSaved;
    if (was && was.zoom === v.zoom && was.panX === v.panX && was.panY === v.panY) return;
    board.viewSaved = v;
    prefs.set(BOARD_VIEW_KEY + board.id, v);
  }
  /** A board opens where it was left; one never looked at here opens fitted. */
  function restoreBoardView(id) {
    const v = prefs.get(BOARD_VIEW_KEY + id, null);
    if (v && isFinite(v.zoom) && v.zoom > 0 && isFinite(v.panX) && isFinite(v.panY)) {
      view.zoom = clampZoom(v.zoom); view.panX = v.panX; view.panY = v.panY;
      afterViewChange();
      board.viewSaved = { zoom: view.zoom, panX: view.panX, panY: view.panY };
    } else {
      // Fitted, and not yet anywhere the device keeps: the next save writes it, moved or not,
      // so a board left where it opened comes back there — not fitted again to what it holds by then.
      fitAll();
      board.viewSaved = null;
    }
  }
  let boardViewTimer = 0;
  const boardViewSoon = () => { clearTimeout(boardViewTimer); boardViewTimer = setTimeout(saveBoardView, 800); };
  addEventListener('pointerup', boardViewSoon, true);
  addEventListener('wheel', boardViewSoon, { capture: true, passive: true });
  addEventListener('keyup', boardViewSoon, true);

  // ----- Opening a board ------------------------------------------------------
  /**
   * Open the board this page is on at boot: the store, the list (R3's board as
   * its first entry), which board (?board=, else the one opened last), its
   * lock, its records — and the one import of browser storage's old copy
   * (openPlan decides; this acts). Resolves true when a board came back onto the page.
   */
  function openBoard(mode) {
    board.mode = mode;
    const opening = openBoardSafely(mode);
    boardsListed = opening.then(() => undefined);
    return opening;
  }
  async function openBoardSafely(mode) {
    try { return await openBoardNow(mode); } catch (err) {
      // Whatever went wrong, it is said: a page that silently stopped saving is the one thing this may not do.
      board.journal.broken(troubleOf(err, 'open'));
      board.ready = true;
      boards.ready = true;
      syncBoardFaces();
      return false;
    }
  }
  async function openBoardNow(mode) {
    let db = null, fallback = null;
    try { db = await boardDB(); board.how = 'indexeddb'; } catch (err) {
      if (err && err.name === 'TimeoutError') throw err;
      fallback = err;
    }
    if (fallback) return openFallbackBoard(mode);
    boards.how = 'indexeddb';
    // The list: read it; a list with no board gets R3's as its first entry.
    const got = await readBoardsList(db);
    const metaFirst = got.metas.find((m) => m.board === FIRST_BOARD) || null;
    const plan = listPlan(got.entries, Date.now(), metaFirst);
    takeBoardsList({ entries: plan.entries, metas: got.metas });
    // The list never stands between a board and its journal: an entry the store refuses (full) is held.
    if (plan.put.length) await boardsTx(['boards'], (tx) => { for (const e of plan.put) tx.objectStore('boards').put(e); }).catch(() => holdEntries(plan.put));
    // Which board this page opens.
    const asked = params.get('board');
    const pick = pickBoard(plan.entries, asked);
    let id = pick.id;
    if (pick.make) {
      const entry = newBoardEntry(plan.entries, mintBoardId(), Date.now());
      await writeNewBoard(entry, null, null).catch(() => holdEntries([entry]));
      id = entry.id;
    }
    if (pick.restore) await updateBoardEntries([id], (e) => (e.trashed ? restored(e) : null)).catch(() => { const e = boards.entries.get(id); if (e) holdEntries([restored(e)]); });
    boards.ready = true;
    const prep = await prepareBoard(id);
    await boardOpening(prep.approx);
    const back = applyBoard(prep, { mode, early: true });
    afterBoardOpened(id, { boot: true, address: mode === 'restore' });
    if (pick.missing) say('there is no board “' + pick.missing + '” in this browser — opened “' + boardEntryName(id) + '”');
    else if (pick.restore) say('“' + boardEntryName(id) + '” was in the trash — it is back on the list');
    board.saidAtOpen = !!(pick.missing || pick.restore);
    return back;
  }
  /** No IndexedDB: browser storage is the store, as before R3 — one board, and nowhere to keep a list. */
  async function openFallbackBoard(mode) {
    let legacy = null;
    try { legacy = localStorage.getItem(LOCAL_LOG_KEY); } catch (err) { legacy = null; }
    boards.how = 'browser storage';
    boards.entries = new Map([[FIRST_BOARD, listPlan([], Date.now(), null).put[0]]]);
    boards.ready = true;
    const plan = openPlan({ meta: null, records: [], legacy, owner: true, fallback: true, now: Date.now() });
    board.id = FIRST_BOARD;
    board.backend = legacyBackend(plan.events);
    board.how = 'browser storage';
    board.journal = journalFor(FIRST_BOARD, board.backend);
    const early = session.getEvents().slice();
    let arr = null;
    if (mode === 'restore' && plan.events.length) {
      board.from = plan.from;
      await boardOpening(plan.events.length);
      board.restoring = true;
      try { session.load(plan.events.concat(early)); } finally { board.restoring = false; }
      arr = session.getEvents();
    }
    board.opened = { arr: arr || [], len: arr ? plan.events.length : 0, lastSeq: 0 };
    const a = Object.assign({}, plan.arm);
    if (mode !== 'fresh' && arr) { a.arr = arr; a.len = plan.events.length; }
    board.journal.arm(a);
    board.ready = true;
    persistBoard();
    afterBoardOpened(FIRST_BOARD, { boot: true, address: false });
    return !!arr;
  }
  /** Everything opening board `id` needs, read before anything on screen changes: its lock, its records. */
  async function prepareBoard(id) {
    const db = await boardDB();
    const backend = idbBackend(db, id);
    const lock = await takeBoardLock(id, 1500);
    let got = null, unreadable = null;
    try { got = await backend.read(); } catch (err) { unreadable = err; }
    let approx = 0;
    if (got) for (const r of got.records) approx += r.n || 0;
    return { id, backend, lock, got, unreadable, approx };
  }
  /**
   * Put a prepared board on the page — in one task, with nothing awaited, so
   * no stroke lands between the board left and the board loaded. `early`
   * (boot only): what a quick hand drew while the store was opening stays,
   * after what comes back. Returns whether a board came back onto the page.
   */
  function applyBoard(prep, o) {
    const id = prep.id;
    board.gen++;
    board.id = id;
    board.backend = prep.backend;
    board.lock = prep.lock.state;
    board.release = prep.lock.release;
    board.meta = prep.got ? prep.got.meta : null;
    board.viewSaved = null;
    board.journal = journalFor(id, prep.backend);
    if (prep.unreadable) {
      // Never write over what could not be read — and never show the board left as if it were this one.
      if (!o.early) { board.restoring = true; try { session.load([]); } finally { board.restoring = false; } }
      board.journal.broken(troubleOf(prep.unreadable, 'read'));
      board.opened = { arr: [], len: 0, lastSeq: 0 };
      board.ready = true;
      return false;
    }
    let legacy = null;
    if (id === FIRST_BOARD) { try { legacy = localStorage.getItem(LOCAL_LOG_KEY); } catch (err) { legacy = null; } }
    const owner = prep.lock.state !== 'taken';
    const plan = openPlan({ meta: prep.got.meta, records: prep.got.records, legacy, owner, fallback: false, now: Date.now() });
    // What a quick hand drew while the store was opening stays, after what comes back (boot).
    const early = o.early ? session.getEvents().slice() : [];
    let arr = null;
    if (o.mode === 'restore' && (plan.events.length || !o.early)) {
      board.from = plan.from;
      board.restoring = true;
      try { session.load(plan.events.concat(early)); } finally { board.restoring = false; }
      arr = session.getEvents();
    } else if (!o.early) {
      board.restoring = true;
      try { session.load([]); } finally { board.restoring = false; }
    }
    board.opened = { arr: arr || [], len: arr ? plan.events.length : 0, lastSeq: plan.lastSeq };
    // What the board holds, when its meta does not say (R3 kept none of it): from its records, as of its last event.
    if (!statsOfMeta(prep.got.meta)) {
      let chars = 0;
      for (const r of prep.got.records) chars += (r.text || '').length;
      let last = 0;
      for (const ev of plan.events) if (ev && typeof ev.at === 'number' && ev.at > last) last = ev.at;
      const st = statsOf(plan.events, chars, last || (prep.got.meta && prep.got.meta.created) || 0);
      boards.stats.set(id, st);
      if (owner && prep.got.meta && plan.from === 'store') {
        board.meta = Object.assign({}, prep.got.meta, st, { board: id });
        prep.backend.putMeta(board.meta).catch(() => { /* the next record says it */ });
      }
    } else boards.stats.set(id, statsOfMeta(prep.got.meta));
    if (plan.arm) {
      const a = Object.assign({}, plan.arm);
      // A fresh board replaces what is kept at its first change, never before it.
      if (o.mode === 'fresh') a.whole = false;
      else if (arr && !a.whole) { a.arr = arr; a.len = plan.events.length; }
      board.journal.arm(a);
    } else {
      board.journal.readonly({ kind: 'tab', detail: '' });
      if (!(board.lateGrant && board.lateGrant.id === id)) waitForBoard(id);
    }
    board.ready = true;
    // The other tab let go while this one was opening: taken up now that the board is open.
    if (!plan.arm && board.lateGrant && board.lateGrant.id === id) { const g = board.lateGrant; board.lateGrant = null; boardFreed(id, g.release); }
    if (plan.damaged && plan.arm) say('the board kept in this browser had ' + (plan.damaged.skipped + plan.damaged.bad) + ' unreadable piece' + (plan.damaged.skipped + plan.damaged.bad === 1 ? '' : 's') + ' — what could be read is back, and is written whole again');
    // What the store has not heard: the import, what was drawn while it opened.
    persistBoard();
    return !!arr;
  }
  /**
   * After a board is on the page: its view (unless a hand has moved it since
   * the page opened, or it is a fresh start the page draws on at once), the
   * title, the tile, the address, the device's mark, and "opened" in its entry.
   */
  function afterBoardOpened(id, o) {
    const untouched = view.zoom === 1 && view.panX === 0 && view.panY === 0;
    if (board.mode !== 'fresh' && (!o.boot || untouched)) restoreBoardView(id);
    if (o.address && !EMBED) {
      try { history.replaceState(history.state, '', location.pathname + boardSearch(location.search, id) + location.hash); } catch (err) { /* an address this page may not change */ }
    }
    if (!o.boot) markAfterOpen();
    syncBoardFaces();
    if (boards.how === 'indexeddb') updateBoardEntries([id], (e) => Object.assign({}, e, { opened: Date.now() })).catch(() => { /* when it was opened is a convenience */ });
  }
  /** The device's taught mark, on the board just opened — taught again only where the board's own log says otherwise. */
  function markAfterOpen() {
    const saved = savedMark();
    if (!saved || !saved.mark) return;
    const now = session.getState().commandMark || null;
    if (JSON.stringify(now) !== JSON.stringify(saved.mark)) restoreMark();
  }
  /** A big board: say so, and let the line paint before the replay holds the thread. */
  function boardOpening(n) {
    if (n < 400) return Promise.resolve();
    say('opening the board kept in this browser — ' + n + ' events…', 600000);
    return new Promise((resolve) => {
      let done = false;
      const go = () => { if (!done) { done = true; resolve(); } };
      requestAnimationFrame(() => setTimeout(go, 0));
      setTimeout(go, 120);
    });
  }
  /** The list, on a page that keeps no board (a folder, a repository or a room named in the address): read, for the pane and the places. */
  function openBoardsList() {
    boardsListed = boardDB().then((db) => readBoardsList(db)).then((got) => {
      boards.how = 'indexeddb';
      takeBoardsList(got);
    }, () => { boards.how = 'none'; }).then(() => { boards.ready = true; board.ready = true; syncBoardFaces(); });
    return boardsListed;
  }

  // ----- Leaving, switching ---------------------------------------------------
  /**
   * Flush the board on screen and wait until its store holds all of it.
   * null when it may be left; else the verdict (17-boards.js: 'unsaved',
   * 'not-kept', said with the ways out). `force`: the person said leave it.
   */
  async function readyToLeave(force) {
    for (let i = 0; i < 100; i++) {
      board.journal.flush(session.getEvents());
      await board.journal.idle();
      const v = leaveVerdict(Object.assign(board.journal.snapshot(), { name: boardEntryName(board.id) }));
      if (!v) return null;
      if (v.kind !== 'busy') return force ? null : v;
      await new Promise((r) => setTimeout(r, 30));
    }
    return force ? null : { kind: 'busy', words: '“' + boardEntryName(board.id) + '” is still being written — try again in a moment', ways: [] };
  }
  /**
   * Open board `id` (or a place) from the list. In place when a board is on
   * screen: what the next needs is read first, the one on screen flushed and
   * waited on, then — in one task — left, and the next loaded. Resolves true
   * when the page is on it (or leaving for it), false when refused.
   * `o.force`: leave a board that is not saved (the person's second tap);
   * `o.said(verdict)`: where a refusal is said (the pane), else the status line.
   */
  async function switchBoard(id, o) {
    o = o || {};
    if (boards.switching) return false;
    const plan = switchPlan({ entries: [...boards.entries.values()], current: board.id, onBoard: onBoardHere(), target: id });
    const refuse = (v) => { if (o.said) o.said(v); else say(v.words); return false; };
    if (plan.go === 'here') return true;
    if (plan.go === 'missing') return refuse({ kind: 'missing', words: 'that board is not in this browser any more', ways: [] });
    boards.switching = true;
    syncBoardFaces();
    try {
      if (plan.go === 'place') { await openPlace(id); return true; }
      if (plan.restore) await updateBoardEntries([id], (e) => (e.trashed ? restored(e) : null));
      if (plan.go === 'navigate') {
        // A folder, a repository or a room is on screen: what it has not sent goes first, then the board opens in a page of its own.
        if (folder.store && folder.how !== 'static') await saveNow();
        if (folder.saveTrouble && !o.force) return refuse({ kind: 'unsaved', words: troubleWords(folder.saveTrouble).lead, ways: ['export', 'leave'] });
        location.assign(location.pathname + boardSearch(location.search, id) + location.hash);
        return true;
      }
      const prep = await prepareBoard(id);
      await boardOpening(prep.approx);
      const v = await readyToLeave(o.force);
      if (v) { if (prep.lock.release) prep.lock.release(); return refuse(v); }
      // From here to the load, nothing is awaited: no stroke can land in between.
      findLeaving(); // Find (I6): what the board says and how it looks, from the live state, before it is gone
      leaveBoard();
      applyBoard(prep, { mode: 'restore', early: false });
      afterBoardOpened(id, { boot: false, address: true });
      return true;
    } catch (err) {
      return refuse({ kind: 'refused', words: 'could not open that board — ' + ((err && err.message) || err), ways: [] });
    } finally {
      boards.switching = false;
      syncBoardFaces();
    }
  }
  /** A new board, opened. Refused, and nothing made, while the board on screen may not be left. */
  async function newBoard(o) {
    o = o || {};
    if (boards.how !== 'indexeddb') { const v = { kind: 'one', words: 'this browser keeps one board here — open a folder to keep more', ways: [] }; if (o.said) o.said(v); else say(v.words); return false; }
    if (onBoardHere()) { const v = await readyToLeave(o.force); if (v) { if (o.said) o.said(v); else say(v.words); return false; } }
    const entry = newBoardEntry([...boards.entries.values()], mintBoardId(), Date.now(), o.name);
    await writeNewBoard(entry, o.events || null, null);
    const ok = await switchBoard(entry.id, o);
    return ok ? entry : false;
  }
  async function renameBoard(id, raw) {
    const done = await updateBoardEntries([id], (e) => renamed(e, raw));
    return done[0] || null;
  }
  /** A copy under its own id, beside the original: the board on screen as it stands, any other as its store holds it. */
  async function duplicateBoard(id) {
    const src = boards.entries.get(id);
    if (!src || !isKept(src) || boards.how !== 'indexeddb') return null;
    let events;
    if (id === board.id && onBoardHere()) events = session.getEvents().map((ev) => Object.assign({}, ev));
    else { const db = await boardDB(); events = journalFold((await idbBackend(db, id).read()).records).events; }
    const entry = copyEntry([...boards.entries.values()], src, mintBoardId(), Date.now());
    return writeNewBoard(entry, events, prefs.get(BOARD_VIEW_KEY + id, null));
  }
  /** Delete: to the trash, from which it comes back whole. The board on screen: the page goes to another first. */
  async function trashBoard(id, o) {
    o = o || {};
    const e = boards.entries.get(id);
    if (!e || !isKept(e) || e.trashed) return false;
    if (onBoardHere() && id === board.id) {
      const next = nextAfter([...boards.entries.values()], id);
      const ok = next ? await switchBoard(next, o) : await newBoard(o);
      if (!ok) return false;
    }
    await updateBoardEntries([id], (cur) => (cur.trashed ? null : trashed(cur, Date.now())));
    return true;
  }
  async function restoreBoard(id) {
    const done = await updateBoardEntries([id], (e) => (e.trashed ? restored(e) : null));
    return done[0] || null;
  }
  /** The boards whose lock a tab holds — a board open there is never emptied out from under it. */
  async function boardsHeldElsewhere() {
    if (!(navigator.locks && navigator.locks.query)) return [];
    try {
      const q = await navigator.locks.query();
      return (q.held || []).map((l) => l.name || '').filter((n) => n.startsWith('mm-board:')).map((n) => n.slice('mm-board:'.length)).filter((b) => b !== board.id || !onBoardHere());
    } catch (err) { return []; }
  }
  /** What emptying the trash will take, said before it happens (17-boards.js). */
  async function planEmptyTrash() {
    await rereadBoards();
    const stats = {};
    for (const [k, v] of boards.stats) stats[k] = v;
    return emptyTrashPlan([...boards.entries.values()], stats, await boardsHeldElsewhere());
  }
  /** Take a board's lock only if no tab holds it; resolves its release, or null. */
  function boardLockIfFree(id) {
    if (!(navigator.locks && navigator.locks.request)) return Promise.resolve(() => {});
    return new Promise((resolve) => {
      try {
        navigator.locks.request(boardLockName(id), { ifAvailable: true }, (lock) => {
          if (!lock) { resolve(null); return undefined; }
          return new Promise((release) => resolve(release));
        }).catch(() => resolve(null));
      } catch (err) { resolve(null); }
    });
  }
  /**
   * Empty the trash — the second, deliberate tap: every board the plan said,
   * each only while no tab holds it (its lock is taken here for the delete),
   * its entry, meta and every record in one transaction. Nothing else.
   */
  async function emptyTrash(plan) {
    const got = [];
    for (const e of plan.gone) {
      const cur = boards.entries.get(e.id);
      if (!cur || !cur.trashed) continue; // restored since the sentence: kept
      const release = await boardLockIfFree(e.id);
      if (release) got.push({ id: e.id, release });
    }
    try {
      if (got.length) {
        await boardsTx(['boards', 'records', 'meta'], (tx) => {
          for (const g of got) {
            tx.objectStore('records').delete(IDBKeyRange.bound([g.id, 0], [g.id, Infinity]));
            tx.objectStore('meta').delete(g.id);
            tx.objectStore('boards').delete(g.id);
          }
        });
        for (const g of got) { boards.entries.delete(g.id); boards.stats.delete(g.id); prefs.del(BOARD_VIEW_KEY + g.id); }
        findDrop(got.map((g) => g.id)); // Find (I6): what was kept for them goes
      }
    } finally { for (const g of got) g.release(); }
    boardsChanged();
    // The pictures only those boards used go with them — now, and not before (a trashed board is restorable).
    try { await collectAssets(); } catch (err) { /* a board that could not be read: nothing is collected on a guess */ }
    return { gone: got.map((g) => g.id), kept: plan.gone.map((e) => e.id).filter((x) => !got.some((g) => g.id === x)).concat(plan.kept.map((e) => e.id)) };
  }
  /**
   * A log file's text as events (R2): version 1 with its header, version 0 — bare events, every log kept
   * before the header — or the old JSON array. `{ events }` for a log, `{ refused }` with the sentence for
   * a version this build does not read, `{ notLog }` for anything else. One reader for the boards pane's
   * file, the examples and any other text that is meant to be a log.
   */
  function readLogText(text, source) {
    const t = String(text || '').trim();
    let events = null;
    if (t.startsWith('[')) { try { const a = JSON.parse(t); if (Array.isArray(a)) events = a; } catch (err) { events = null; } }
    else {
      try { const d = MM.decodeLog(text, { source }); events = d.skipped ? null : d.events; }
      catch (err) { if (err && err.name === 'LogFormatError') return { refused: err.message }; throw err; }
    }
    if (!events || !events.length || !events.every((ev) => ev && typeof ev.type === 'string')) return { notLog: true };
    return { events };
  }
  /** What a log written by this page says of itself in the status line: the version, and that an older app opens it. */
  function logFileNote() { return ' · log version ' + MM.LOG_VERSION + ' — an older MetaMedium opens it too'; }
  /** What every log this page writes is written with. */
  function logWrite() {
    const app = ((document.querySelector('meta[name="metamedium-version"]') || {}).content || '').trim();
    return app ? { app } : {};
  }
  /**
   * A file as a new board: a board bundle (a zip made by Export — the log and its pictures: every picture is stored
   * first, its hash checked, and only then do the board's events land), a log — one event per line, as *export*
   * writes it, header first — or a JSON array. A zip is known by its first bytes, never its name. What a file does
   * not carry that it names is said once through `o.note` (a bare log's pictures, a bundle's damaged ones); a file
   * that cannot be read is a sentence through `o.said`, and no board is made.
   * (PLAN-IPAD-NOTES I4; the rules are 17-bundle.js's, the storing 18-out.js's `bundleLoad`.)
   */
  async function boardFromFile(file, o) {
    const refuse = (words) => { const v = { kind: 'file', words: words, ways: [] }; if (o && o.said) o.said(v); else say(words); return false; };
    const note = (words) => { if (o && o.note) o.note(words); };
    const name = String(file.name || '').replace(/\.dyna\.zip$/i, '').replace(/\.[^.]*$/, '') || null;
    const zipped = isZipBytes(new Uint8Array(await file.slice(0, 4).arrayBuffer()));
    let events = null, stored = [], notes = null;
    if (zipped) {
      if (boards.how !== 'indexeddb') return newBoard(o);   // says why, and stores nothing
      const b = await bundleLoad(file);
      if (!b.ok) return refuse('“' + file.name + '”: ' + b.words);
      events = b.events; stored = b.pending;
      notes = [];
      if (b.damaged.length) notes.push(plural(b.damaged.length, 'picture') + ' in the file ' + (b.damaged.length === 1 ? 'is' : 'are') + ' damaged (' + b.damaged.map((d) => d.name.replace(/^.*\//, '').replace(/^([0-9a-f]{8})[0-9a-f]+/, '$1…') + ' — ' + d.why).join('; ') + ') and left out — ' + (b.damaged.length === 1 ? 'it stands' : 'they stand') + ' as ' + (b.damaged.length === 1 ? 'its name' : 'their names'));
      else if (b.notCarried.length) notes.push(plural(b.notCarried.length, 'picture') + ' named in this board ' + (b.notCarried.length === 1 ? 'is' : 'are') + ' not in the file — ' + (b.notCarried.length === 1 ? 'it stands' : 'they stand') + ' as ' + (b.notCarried.length === 1 ? 'its name' : 'their names'));
    } else {
      const r = readLogText(await file.text(), file.name);
      if (!r.events) return refuse(r.refused || '“' + file.name + '” is not a board’s log — one event per line, as export writes it');
      events = r.events;
      // A bare log names pictures it does not carry: the ones this device holds draw, the rest stand as their names.
      const named = [...assetsOfEvents(events)];
      const lacking = [];
      for (const ref of named) if (!(await assetGet(ref))) lacking.push(ref);
      if (lacking.length) { notes = [plural(lacking.length, 'picture') + (lacking.length === 1 ? ' is' : ' are') + ' named in this log but ' + (lacking.length === 1 ? 'is' : 'are') + ' not in it — ' + (lacking.length === 1 ? 'it stands' : 'they stand') + ' as ' + (lacking.length === 1 ? 'its name' : 'their names') + '; export “board + pictures”, a .zip, to carry them']; }
    }
    try {
      const made = await newBoard(Object.assign({}, o, { name: name, events: events }));
      if (made && notes) for (const n of notes) note(n);
      return made;
    } finally { for (const ref of stored) assets.pending.delete(ref); }
  }
  /**
   * Reset: a fresh board, never one tap from losing this one. The board on
   * screen goes to the trash (it comes back whole from there) and a fresh one
   * opens under the same name. With no IndexedDB there is nowhere for a
   * second board: the first tap says so, and a second within five seconds
   * empties the one board there is.
   */
  async function resetBoard() {
    if (boards.how !== 'indexeddb') {
      if (Date.now() - board.resetArmed > 5000) { board.resetArmed = Date.now(); say('this browser keeps one board here and has no trash — export the log to keep it; Reset again within 5 s empties it'); return false; }
      board.resetArmed = 0;
      await forgetLocalLog();
      location.reload();
      return true;
    }
    if (!onBoardHere()) return newBoard();
    const cur = boards.entries.get(board.id);
    if (!session.getEvents().length) { flash('this board is already empty'); return false; }
    const v = await readyToLeave();
    if (v) { say(v.words); return false; }
    const entry = newBoardEntry([...boards.entries.values()], mintBoardId(), Date.now(), cur ? cur.name : null);
    await writeNewBoard(entry, null, null);
    if (!(await switchBoard(entry.id))) return false;
    if (cur) await updateBoardEntries([cur.id], (e) => (e.trashed ? null : trashed(e, Date.now())));
    say('a fresh board — what “' + (cur ? cur.name : 'the board') + '” held is in the trash; boards ▸ restore it');
    return true;
  }

  /**
   * The session's FIRST listener, ahead of the paint — a release on a big
   * board paints for seconds, and the record must not wait behind it: every
   * change reaches the store in the task that made it.
   */
  function persistBoard() {
    if (board.restoring) return; // the log being loaded is what the store holds
    if (folder.store) { if (board.journal.state !== 'off') leaveBoard(); return; }
    board.journal.sync(session.getEvents());
    if (!persistAsked.done) askPersist();
  }
  // Kept on the iPad (PLAN-IPAD-NOTES I3). Safari clears a site's storage after seven days without a visit
  // unless it is installed or the browser agreed to keep it, so once a board holds something the page asks
  // `navigator.storage.persist()` — once per device (the preference is written before the answer, whatever it
  // is: the browser decides, and asking again is nagging), never for what is not the device's own board
  // (`persistPlan`, 17-boards.js: ?fresh=1, a replay, an embed, a room, a folder). The pane's foot says what it
  // answered (22-boards.js).
  const persistAsked = { done: false };
  function askPersist() {
    let asked = false;
    try { asked = !!localStorage.getItem(PERSIST_KEY); } catch (err) { asked = true; } // no way to remember it: not to be asked on every stroke
    const st = typeof navigator !== 'undefined' ? navigator.storage : null;
    const plan = persistPlan({ supported: !!st && typeof st.persist === 'function', asked: asked, holds: session.getEvents().length > 0, mode: board.mode });
    if (plan.why === 'empty') return; // asked when there is something to keep
    persistAsked.done = true;
    if (!plan.ask) return;
    try { localStorage.setItem(PERSIST_KEY, String(Date.now())); } catch (err) { /* private mode */ }
    Promise.resolve().then(() => st.persist()).then(() => { if (typeof roomChanged === 'function') roomChanged(); }, () => { /* the browser said nothing: the pane says so */ });
  }
  /** On the way out — the tab hidden, the page going — anything not yet written goes now, and where the hand left the board. */
  function flushBoard() {
    saveBoardView();
    if (folder.store) { if (folder.how !== 'static') saveNow(); return; }
    board.journal.flush(session.getEvents());
  }
  addEventListener('pagehide', flushBoard);
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flushBoard(); });

  /** A save failed, or works again: the line says it at once; a failing store is tried again on a timer too. */
  function boardTroubleChanged(t, was) {
    clearInterval(board.retryTimer);
    board.retryTimer = 0;
    if (t && board.journal.state === 'armed') {
      board.retryTimer = setInterval(() => {
        if (board.dbClosed && board.how === 'indexeddb') {
          board.dbClosed = false;
          const id = board.id, jn = board.journal;
          boardDB().then((db) => { if (board.id === id && board.journal === jn) board.backend = idbBackend(db, id); }, () => { board.dbClosed = true; });
          return;
        }
        board.journal.flush(session.getEvents());
      }, BOARD_RETRY_MS);
    }
    render(session.getState());
    if (!t && was && board.journal.state === 'armed') flash('saved — the board is kept in this browser again');
  }

  /** What the status line leads with while the board is not being kept: the sentence and its ways out. */
  function boardWarning() {
    if (folder.store) return folder.saveTrouble ? troubleWords(folder.saveTrouble) : null;
    if (board.mode === 'off') return null;
    return troubleWords(board.journal.trouble);
  }

  /** The way out of a failing save: this board, carried into a store that keeps it from now on. */
  function keepBoardIn(store, how, name, handle) {
    return openStore(store, how, name, { carry: session.getEvents().filter((ev) => !ev.by), handle: handle || null });
  }
  /** The other way out: the whole log, as a file to keep. */
  function exportLogNow() {
    const evs = session.getEvents();
    downloadText('canvas.jsonl', MM.encodeLog(evs, logWrite()), 'application/json');
    flash('canvas.jsonl — the whole board, ' + evs.length + ' events, to keep' + logFileNote());
  }
  statusEl.addEventListener('click', (e) => {
    const b = e.target.closest && e.target.closest('button[data-way]');
    if (!b) return;
    if (b.dataset.way === 'export') exportLogNow();
    else if (b.dataset.way === 'folder') openFolder({ carry: true });
  });

  /** Empty the board on screen's store (the e2e starts from nothing with it); resolves when it is. The list keeps its entry. */
  function forgetLocalLog() {
    board.journal.reset();
    try { localStorage.removeItem(LOCAL_LOG_KEY); } catch (err) { /* nothing */ }
    boards.stats.set(board.id, statsOf([], 0, Date.now()));
    board.meta = null;
    return board.backend ? board.backend.clear().catch(() => {}) : Promise.resolve();
  }

  /** For tests: the board's own state, and what its store holds. */
  function boardState() {
    return Object.assign({ id: board.id, ready: board.ready, mode: board.mode, how: board.how, lock: board.lock, from: board.from, warning: boardWarning() }, board.journal.snapshot());
  }
  /** For tests: the list as this page holds it. */
  function boardsState() {
    return {
      ready: boards.ready, how: boards.how, switching: boards.switching, busy: boards.busy > 0,
      current: onBoardHere() ? board.id : null, name: boardOnScreenName(),
      list: [...boards.entries.values()].map((e) => { const x = Object.assign({}, e, { stats: boards.stats.get(e.id) || null }); delete x.handle; return x; }),
    };
  }
  /** For tests: one board as the store holds it — its entry, its meta, how many records, its log. */
  function boardsStore(id) {
    return boardDB().then((db) => new Promise((resolve, reject) => {
      const tx = db.transaction(['boards', 'records', 'meta'], 'readonly');
      const out = { entry: null, meta: null, records: 0, log: [] };
      let recs = [];
      tx.objectStore('boards').get(id).onsuccess = (e) => { out.entry = e.target.result || null; if (out.entry) delete out.entry.handle; };
      tx.objectStore('meta').get(id).onsuccess = (e) => { out.meta = e.target.result || null; };
      tx.objectStore('records').getAll(IDBKeyRange.bound([id, 0], [id, Infinity])).onsuccess = (e) => { recs = e.target.result || []; };
      tx.oncomplete = () => { out.records = recs.length; out.log = journalFold(recs).events; resolve(out); };
      tx.onabort = () => reject(tx.error);
    }));
  }

  function folderStatus() {
    if (!folder.store) return '';
    if (folder.how === 'live') {
      const now = Date.now();
      const here = folder.store.presence().filter((p) => now - p.at < 60000).map((p) => handLabel(p.participant));
      // Two hands under one name lose each other's work quietly, and a room
      // older than the relay remembers hands over part of itself; this line
      // is where both are said. The store holds them (`notices`): a doubled
      // name — this tab's own included, which both hands that share it hear —
      // and a truncated history.
      const notes = folder.store.notices ? folder.store.notices() : [];
      return 'live ' + folder.name + ' · you are ' + handLabel(folder.me) + (here.length ? ' · with ' + here.join(', ') : ' · alone so far') +
        (notes.length ? ' · ' + notes.join(' · ') : '') + (folder.error ? ' · ' + folder.error : '');
    }
    const n = folder.entries.length;
    const misnumbered = [...folder.misnumbered.values()];
    return (folder.how === 'static' ? 'site' : folder.how === 'git' ? 'repo' : 'folder') + (folder.name ? ' ' + folder.name : '') + ' · ' + n + ' file' + (n === 1 ? '' : 's') +
      (folder.truncated ? '+' : '') + (misnumbered.length ? ' · ' + misnumbered.join(' · ') : '') +
      // A write the folder refused leads the line instead (boardWarning), so it is not said twice.
      (folder.saveTrouble ? '' : folder.error ? ' · ' + folder.error : folder.store.capabilities().write ? (folder.saving ? ' · saving' : ' · saved') : ' · read-only');
  }

  // ===== The live budget =======================================================
  // Only the nearest N live artifacts render as iframes; the rest are parked
  // cards. Panning swaps them. The status line says how many are live.
  function liveSet(s) {
    const live = s.live.filter((id) => !s.nodes.get(id).reps.some((r) => r.modality === 'erased'));
    if (live.length <= LIVE_BUDGET) return new Set(live);
    // A playing artifact is never parked: its clock is running, and a card
    // in its place would silence it without a word. It takes the budget
    // first; the nearest of the rest fill what is left.
    const playing = live.filter((id) => s.clocks[id] && s.clocks[id].playing);
    const c = screenToWorld(innerWidth / 2, innerHeight / 2);
    const scored = live.filter((id) => !playing.includes(id)).map((id) => {
      const b = MM.boundsOf(s.nodes.get(id));
      const d = b ? Math.hypot((b.minX + b.maxX) / 2 - c.x, (b.minY + b.maxY) / 2 - c.y) : Infinity;
      return { id, d };
    }).sort((p, q) => p.d - q.d);
    return new Set(playing.concat(scored.slice(0, Math.max(0, LIVE_BUDGET - playing.length)).map((x) => x.id)));
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
    renderViewBar();
    syncTiles();
  }

  // The view's own controls live in the bar, not in a second bar over the
  // cards: the grid's count and sort, focus's prev and next (one frame, three
  // lenses — the review canvas's rule).
  const viewBarEl = document.getElementById('viewBar');
  function renderViewBar() {
    const s = session.getState();
    if (viewMode === 'canvas') { viewBarEl.hidden = true; viewBarEl.innerHTML = ''; return; }
    viewBarEl.hidden = false;
    const order = gridOrder(s);
    if (viewMode === 'grid') {
      viewBarEl.innerHTML = '<b>' + order.length + '</b> artifact' + (order.length === 1 ? '' : 's') + ' · sort ' +
        ['name', 'kind', 'recency', 'folder'].map((k) => '<button data-sort="' + k + '"' + (gridSort === k ? ' class="on"' : '') + '>' + k + '</button>').join('') +
        '<button data-view="canvas" title="Esc">canvas</button>';
    } else {
      const id = order[focusIndex];
      const name = id ? (MM.wordOf(s.nodes.get(id)) || id) : '';
      viewBarEl.innerHTML = '<button data-focus="-1" title="←">←</button><b>' + esc(name) + '</b> ' + (focusIndex + 1) + '/' + order.length +
        '<button data-focus="1" title="→">→</button><button data-view="canvas" title="Esc">canvas</button>';
    }
  }
  viewBarEl.addEventListener('click', (e) => {
    const b = e.target.closest && e.target.closest('button');
    if (!b) return;
    if (b.dataset.sort) { gridSort = b.dataset.sort; renderGrid(session.getState()); renderViewBar(); }
    else if (b.dataset.focus) focusStep(Number(b.dataset.focus));
    else if (b.dataset.view) setViewMode('canvas');
  });

  function renderGrid(s) {
    const order = gridOrder(s);
    let html = order.length ? '<div class="cards">' : '<div class="empty">no artifacts yet — name something, or open a folder</div><div class="cards">';
    for (const id of order) {
      const n = s.nodes.get(id);
      const r = codeRepOf(n);
      const kind = r ? r.data.kind : MM.isFrame(n) ? 'frame' : 'drawing';
      const path = r && r.data.path ? r.data.path : '';
      const pic = MM.isPictureKind(kind);
      const src = pic && r ? pictureSrc(r) : null;
      const preview = r && !pic ? esc(String(r.data.code).slice(0, 160)) : '';
      const img = src ? '<img src="' + esc(src) + '" alt="">' : '';
      html += '<button class="card" data-id="' + esc(id) + '"><span class="name">' + esc(MM.wordOf(n) || id) + '</span><span class="kind">' + esc(kind) + (path ? ' · ' + esc(path) : '') + '</span>' + (img || '<pre>' + preview + '</pre>') + '</button>';
    }
    gridEl.innerHTML = html + '</div>';
  }

  gridEl.addEventListener('click', (e) => {
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
    renderViewBar();
  }
  function focusStep(delta) {
    const order = gridOrder(session.getState());
    if (!order.length) return;
    const i = ((focusIndex < 0 ? 0 : focusIndex + delta) + order.length) % order.length;
    focusOn(order[i]);
  }

  document.getElementById('gridBtn').onclick = () => setViewMode(viewMode === 'grid' ? 'canvas' : 'grid');
  document.getElementById('folderBtn').onclick = () => { closeCC(); openFolder(); };
  addEventListener('keydown', (e) => {
    if (e.target !== document.body && e.target !== document && e.target !== window) return;
    if (e.key === 'Escape' && viewMode !== 'canvas') { setViewMode('canvas'); e.preventDefault(); }
    if (viewMode === 'focus' && e.key === 'ArrowRight') { focusStep(1); e.preventDefault(); }
    if (viewMode === 'focus' && e.key === 'ArrowLeft') { focusStep(-1); e.preventDefault(); }
  });

// ===== images =====
// Provides: pictures in and the board out — importPictures (a pick of files: drop, paste, the photos and camera
//   inputs; laid out, kept in the asset store, named by an `import` event), importText, the asset store
//   (assetPut/assetGet/assetList/collectAssets), the pictures drawn on the board (pictureBitmap, drawPicture,
//   pictureSrc), tracing a held picture into ink (traceFrom). The board out — SVG, PNG, PDF, the bundle, the
//   log, downloadText/downloadBlob — is 18-out.js's.
// Uses: core, view (viewportWorld), folder (folder, boards, boardDB, journalFold, isKept, session), render, 17-assets.js
//   (the rules: what a picture is kept as, where a pick stands, which assets are unused, what the decoded cost),
//   and, in a live room, roomAssetFetch / folder.roomAssets (17-folder.js: the bytes of a picture another hand imported).
// A fragment of one closure: Demos/build-surface.mjs concatenates surface/*.js
// in name order inside `(function () { ... })();`. Shared state is the
// closure's; no imports, no exports, no build step beyond the concatenation.

  // ===== The asset store: a picture's bytes, kept once ==========================
  // The log is events and stays small; a picture's bytes live beside the board's journal in IndexedDB
  // (`mm-assets`), under the SHA-256 of the bytes (PLAN-IPAD-NOTES I1). The same photo brought in twice is
  // one asset; a duplicated board names the assets it already has; the `import` event is a hundred bytes.
  // ORDER IS THE SAFETY: the bytes are committed (their own transaction, strict durability) BEFORE the event
  // exists, and the event goes to the board's journal in the task that makes it, as every event does — so a
  // tab killed at any point leaves no event naming bytes that were not kept (it can leave bytes nothing names,
  // which the next emptied trash collects). `assets.pending` is what is stored and not yet named.
  const ASSET_DB = 'mm-assets';
  const assets = {
    mem: new Map(),        // no IndexedDB here: the bytes are held for the life of the page, and said once
    pending: new Set(),    // stored, and the event naming them not yet written: never collected
    graceMs: ASSET_GRACE_MS,
    saidMem: false,
  };
  let assetDbPromise = null;
  function openAssetDB() {
    return new Promise((resolve, reject) => {
      let req;
      try { req = indexedDB.open(ASSET_DB, 1); } catch (err) { reject(err); return; }
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains('assets')) db.createObjectStore('assets', { keyPath: 'hash' });
        // What each asset is, apart from its bytes: listing and collecting never read a picture.
        if (!db.objectStoreNames.contains('info')) db.createObjectStore('info', { keyPath: 'hash' });
      };
      req.onsuccess = () => {
        const db = req.result;
        db.onversionchange = () => { db.close(); assetDbPromise = null; };
        db.onclose = () => { assetDbPromise = null; };
        resolve(db);
      };
      req.onerror = () => reject(req.error || new DOMException('the browser would not open its storage', 'UnknownError'));
    });
  }
  /** The one connection — or null where this browser keeps nothing (the bytes are then held by the page). */
  function assetDB() {
    if (!assetDbPromise) {
      assetDbPromise = (typeof indexedDB === 'undefined' ? Promise.reject(new Error('no IndexedDB')) : openAssetDB()).catch(() => { assetDbPromise = null; return null; });
    }
    return assetDbPromise;
  }
  const idbDone = (tx) => new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onabort = () => reject(tx.error || new DOMException('the browser abandoned the write', 'AbortError'));
    if (tx.commit) tx.commit();
  });
  /** Keep some bytes under their hash: resolves when the browser holds them. `rec`: { hash, bytes: Uint8Array, mime, w, h }. */
  async function assetPut(rec) {
    assets.pending.add(rec.hash);
    try {
      const db = await assetDB();
      const info = { hash: rec.hash, at: Date.now(), size: rec.bytes.length, mime: rec.mime, w: rec.w, h: rec.h };
      if (!db) {
        assets.mem.set(rec.hash, Object.assign({ bytes: rec.bytes }, info));
        if (!assets.saidMem) { assets.saidMem = true; flash('this browser will not keep pictures — they stay only while this page is open'); }
        return;
      }
      const tx = db.transaction(['assets', 'info'], 'readwrite', { durability: 'strict' });
      tx.objectStore('assets').put({ hash: rec.hash, bytes: rec.bytes.buffer.byteLength === rec.bytes.length ? rec.bytes.buffer : rec.bytes.slice().buffer, mime: rec.mime });
      tx.objectStore('info').put(info);
      await idbDone(tx);
    } catch (err) { assets.pending.delete(rec.hash); throw err; }
  }
  /** What a hash is kept as — { hash, bytes (ArrayBuffer or Uint8Array), mime, w, h } — or null. */
  async function assetGet(hash) {
    const m = assets.mem.get(hash);
    if (m) return m;
    const db = await assetDB();
    if (!db) return null;
    return new Promise((resolve, reject) => {
      const tx = db.transaction(['assets', 'info'], 'readonly');
      let bytes = null, info = null;
      tx.objectStore('assets').get(hash).onsuccess = (e) => { bytes = e.target.result || null; };
      tx.objectStore('info').get(hash).onsuccess = (e) => { info = e.target.result || null; };
      tx.oncomplete = () => resolve(bytes ? { hash: hash, bytes: bytes.bytes, mime: bytes.mime || (info && info.mime) || 'image/jpeg', w: info && info.w, h: info && info.h } : null);
      tx.onabort = () => reject(tx.error);
    });
  }
  /** Every asset kept, without its bytes: { hash, at, size, mime, w, h }. */
  async function assetList() {
    const out = new Map();
    for (const [k, v] of assets.mem) out.set(k, { hash: k, at: v.at, size: v.size, mime: v.mime, w: v.w, h: v.h });
    const db = await assetDB();
    if (db) {
      const rows = await new Promise((resolve, reject) => {
        const tx = db.transaction(['info'], 'readonly');
        let got = [];
        tx.objectStore('info').getAll().onsuccess = (e) => { got = e.target.result || []; };
        tx.oncomplete = () => resolve(got);
        tx.onabort = () => reject(tx.error);
      });
      for (const r of rows) out.set(r.hash, r);
    }
    return [...out.values()].sort((a, b) => (a.at || 0) - (b.at || 0));
  }
  async function assetDrop(hashes) {
    if (!hashes.length) return;
    for (const h of hashes) assets.mem.delete(h);
    const db = await assetDB();
    if (!db) return;
    const tx = db.transaction(['assets', 'info'], 'readwrite');
    for (const h of hashes) { tx.objectStore('assets').delete(h); tx.objectStore('info').delete(h); }
    await idbDone(tx);
  }
  /** The digest of some bytes, as hex: the browser's own where the page is a secure context, else plain code (17-assets.js). */
  async function digestHex(bytes) {
    try {
      if (window.crypto && window.crypto.subtle) {
        const d = new Uint8Array(await window.crypto.subtle.digest('SHA-256', bytes));
        let out = '';
        for (const b of d) out += b.toString(16).padStart(2, '0');
        return out;
      }
    } catch (err) { /* not a secure context: plain code */ }
    return sha256Hex(bytes);
  }

  /**
   * Collect the assets nothing uses: every asset kept that no board names — this page's board as it stands,
   * and every board the browser keeps, the trash's included (a trashed board is restorable, so its pictures
   * stay) — except what is new or in flight (17-assets.js `assetGcPlan`). Run when the trash is emptied and
   * never before; and never on a guess: a board that cannot be read stops the whole collection.
   */
  async function collectAssets() {
    const held = await assetList();
    if (!held.length) return { dropped: [], kept: [] };
    const used = assetsOfEvents(session.getEvents());
    if (boards.how === 'indexeddb') {
      const db = await boardDB();
      for (const e of boards.entries.values()) {
        if (!isKept(e)) continue;
        if (e.id === board.id && onBoardHere()) continue; // on screen: its events are the log just read
        for (const a of assetsOfEvents(journalFold((await idbBackend(db, e.id).read()).records).events)) used.add(a);
      }
    }
    const plan = assetGcPlan(held, used, { now: Date.now(), graceMs: assets.graceMs, pending: assets.pending });
    await assetDrop(plan.drop);
    return { dropped: plan.drop, kept: plan.keep };
  }

  // ===== The picture on the way in ==============================================
  // Decoded in a worker where the browser has OffscreenCanvas (off the main thread: a 12 MP photo is a
  // second of decoding and 48 MB), the main thread otherwise; the EXIF turn is honoured (a phone's photo is
  // stored turned the way it is seen); the long side held to 2,560 px; kept as a JPEG, WebP where it came out
  // clearly smaller, PNG where it has transparency; the bitmap closed. The original is not kept (an option for
  // later, PLAN-IPAD-NOTES §5.4). One file at a time, whatever the pick.
  const PICTURE_QUALITY = 0.85;
  const PICTURE_WORKER_SRC = [
    // One definition of the fit, taken from the closure by its own source.
    fitLongSide.toString(),
    'async function bitmapOf(file) { try { return await createImageBitmap(file, { imageOrientation: "from-image" }); } catch (err) { return await createImageBitmap(file); } }',
    'onmessage = async (e) => {',
    '  const m = e.data;',
    '  try {',
    '    const bmp = await bitmapOf(m.file);',
    '    const fit = fitLongSide(bmp.width, bmp.height, m.max);',
    '    const c = new OffscreenCanvas(fit.w, fit.h);',
    '    c.getContext("2d").drawImage(bmp, 0, 0, fit.w, fit.h);',
    '    bmp.close();',
    '    const sw = Math.min(256, fit.w), sh = Math.min(256, fit.h);',
    '    const small = new OffscreenCanvas(sw, sh), sg = small.getContext("2d", { willReadFrequently: true });',
    '    sg.drawImage(c, 0, 0, sw, sh);',
    '    const d = sg.getImageData(0, 0, sw, sh).data;',
    '    let alpha = false;',
    '    for (let i = 3; i < d.length; i += 4) if (d[i] < 255) { alpha = true; break; }',
    '    const out = { ok: true, w: fit.w, h: fit.h, hasAlpha: alpha };',
    '    if (alpha) out.png = await c.convertToBlob({ type: "image/png" });',
    '    else {',
    '      out.jpeg = await c.convertToBlob({ type: "image/jpeg", quality: m.quality });',
    '      try { const wb = await c.convertToBlob({ type: "image/webp", quality: m.quality }); if (wb.type === "image/webp") out.webp = wb; } catch (err) { /* no webp here */ }',
    '    }',
    '    postMessage(out);',
    '  } catch (err) { postMessage({ ok: false, error: String(err && err.message || err) }); }',
    '};',
  ].join('\n');
  /** A worker for decoding, or null where the browser cannot (no OffscreenCanvas, no Worker, a blocked blob). */
  function pictureWorker() {
    try {
      if (typeof OffscreenCanvas === 'undefined' || typeof Worker === 'undefined' || typeof createImageBitmap === 'undefined') return null;
      const url = URL.createObjectURL(new Blob([PICTURE_WORKER_SRC], { type: 'text/javascript' }));
      const w = new Worker(url);
      w.url = url;
      return w;
    } catch (err) { return null; }
  }
  function endPictureWorker(w) { if (w) { try { w.terminate(); } catch (err) { /* gone */ } try { URL.revokeObjectURL(w.url); } catch (err) { /* gone */ } } }
  function viaWorker(w, file) {
    return new Promise((resolve, reject) => {
      w.onmessage = (e) => (e.data && e.data.ok ? resolve(e.data) : reject(new Error((e.data && e.data.error) || 'the worker could not read it')));
      w.onerror = (e) => reject(new Error((e && e.message) || 'the worker failed'));
      w.postMessage({ file: file, max: ASSET_LONG_SIDE, quality: PICTURE_QUALITY });
    });
  }
  /** The same on the main thread, with an ordinary canvas. */
  async function onMainThread(file) {
    let bmp;
    try { bmp = await createImageBitmap(file, { imageOrientation: 'from-image' }); } catch (err) { bmp = await createImageBitmap(file); }
    try {
      const fit = fitLongSide(bmp.width, bmp.height, ASSET_LONG_SIDE);
      const c = document.createElement('canvas');
      c.width = fit.w; c.height = fit.h;
      c.getContext('2d').drawImage(bmp, 0, 0, fit.w, fit.h);
      const sw = Math.min(256, fit.w), sh = Math.min(256, fit.h);
      const small = document.createElement('canvas');
      small.width = sw; small.height = sh;
      const sg = small.getContext('2d', { willReadFrequently: true });
      sg.drawImage(c, 0, 0, sw, sh);
      const d = sg.getImageData(0, 0, sw, sh).data;
      let alpha = false;
      for (let i = 3; i < d.length; i += 4) if (d[i] < 255) { alpha = true; break; }
      const toBlob = (type, q) => new Promise((resolve) => c.toBlob((b) => resolve(b), type, q));
      const out = { ok: true, w: fit.w, h: fit.h, hasAlpha: alpha };
      if (alpha) out.png = await toBlob('image/png');
      else {
        out.jpeg = await toBlob('image/jpeg', PICTURE_QUALITY);
        const wb = await toBlob('image/webp', PICTURE_QUALITY);
        if (wb && wb.type === 'image/webp') out.webp = wb;
      }
      return out;
    } finally { bmp.close(); }
  }
  /** A picture file as the bytes it is kept as: { blob, format, w, h }. */
  async function encodePicture(file, worker) {
    let r = null;
    if (worker) { try { r = await viaWorker(worker, file); } catch (err) { r = null; } }
    if (!r) r = await onMainThread(file);
    const format = pictureFormat({ hasAlpha: r.hasAlpha, jpegBytes: r.jpeg ? r.jpeg.size : 0, webpBytes: r.webp ? r.webp.size : null });
    const blob = r[format === 'jpeg' ? 'jpeg' : format] || r.jpeg || r.png;
    if (!blob) throw new Error('could not make a picture of it');
    return { blob: blob, format: blob.type === 'image/png' ? 'png' : blob.type === 'image/webp' ? 'webp' : 'jpeg', w: r.w, h: r.h };
  }

  // ===== Pictures in ===============================================================
  const IMPORT_MAX_PX = 1400; // the long side a picture is traced at: tracing is not for a photograph's every pixel
  const IMPORT_DIR = 'imports';

  function safeName(name) {
    return safePictureName(name);
  }

  /** The paths the board's artifacts already carry, so two pictures called image.jpg are told apart. */
  function pathsOnBoard() {
    const s = session.getState(), out = new Set();
    for (const id of s.artifacts) { const n = s.nodes.get(id), r = n && codeRepOf(n); if (r && r.data.path) out.add(r.data.path); }
    return out;
  }

  /** Text of a known kind becomes an artifact at a place on the board. */
  function importText(name, text, at, size) {
    const row = MM.kindOf(name);
    if (!row) { flash(name + ': not a kind the canvas knows'); return null; }
    const w = size || 360, h = Math.round((size || 360) * 0.66);
    const path = IMPORT_DIR + '/' + safeName(name);
    const id = session.import({ kind: row.kind, path: path, name: safeName(name), bounds: { minX: at.x, minY: at.y, maxX: at.x + w, maxY: at.y + h }, code: text, at: Date.now() });
    // A Mermaid text dropped or pasted is held where it lands, so Draw it is in the field at once (D3's surface).
    if (id && row.kind === 'mermaid') mermaidImported(id, safeName(name));
    return id;
  }

  /**
   * One picture, kept and placed: encoded, hashed, stored — and only then named on the board by an `import`
   * event carrying the asset, never the bytes. `cell` is where it stands (a box in world units); the picture
   * is fitted into it with its own proportions.
   */
  async function importPicture(file, name, cell, taken, worker) {
    const enc = await encodePicture(file, worker);
    const buf = new Uint8Array(await enc.blob.arrayBuffer());
    const ref = assetRef(await digestHex(buf));
    const ext = pictureExt(enc.format);
    const mime = enc.blob.type || ('image/' + (ext === 'jpg' ? 'jpeg' : ext));
    await assetPut({ hash: ref, bytes: buf, mime: mime, w: enc.w, h: enc.h });
    const path = uniquePicturePath(name, taken, ext);
    taken.add(path);
    // A folder that can be written gets the file beside the log, as it always did.
    if (folder.store && folder.store.capabilities().write) {
      try { await folder.store.write(path, buf); } catch (err) { /* the board still has it */ }
    }
    const at = fitInCell({ w: enc.w, h: enc.h }, cell);
    const id = session.import({ kind: ext, path: path, name: safeName(name), bounds: { minX: at.x, minY: at.y, maxX: at.x + at.w, maxY: at.y + at.h }, asset: ref, mime: mime, w: enc.w, h: enc.h, at: Date.now() });
    assets.pending.delete(ref);
    return id;
  }

  let pickChain = Promise.resolve();
  /** What the last pick said, for tests. */
  let pickSaid = [];
  /**
   * A pick of files — several at once from the photos input, a drop, a paste — laid out in a grid in the view
   * (`opts.view`, a box in world units, else the ground the hand is looking at; `opts.at` to begin at a point,
   * as a drop does), one file at a time so a pick of twenty never holds twenty decoded photographs, each
   * placed the moment it is kept — the status line says how far it has come (*3 of 10 pictures*). A picture
   * is a picture on the board, drawn there; it is NOT traced (*Trace into ink* is an offer). An SVG or a file
   * of a known kind is an artifact of its kind in its cell. Picks are queued: a paste during a pick waits.
   * @returns {Promise<{ids: string[], skipped: Array<{name:string, why:string}>}>}
   */
  function importPictures(files, opts) {
    const o = opts || {};
    const list = [...(files || [])].filter(Boolean);
    const run = async () => {
      const out = { ids: [], skipped: [] };
      if (!list.length) return out;
      let view = o.view;
      if (!view) {
        const vw = viewportWorld();
        view = o.at ? { minX: o.at.x, minY: o.at.y, maxX: o.at.x + (vw.maxX - vw.minX), maxY: o.at.y + (vw.maxY - vw.minY) } : vw;
      }
      let cells = pictureCells(list.length, view);
      // Clear of what is on the board already: a second picture never lands on the first.
      const st0 = session.getState();
      const shift = clearShift(cells, st0.contentIds.map((id) => MM.boundsOf(st0.nodes.get(id))).filter((b) => b && MM.finiteBounds(b)), cells.length ? Math.min(cells[0].w, cells[0].h) * 0.1 : 0);
      if (shift.moved) cells = cells.map((c) => ({ x: c.x + shift.dx, y: c.y + shift.dy, w: c.w, h: c.h }));
      const taken = pathsOnBoard();
      const rasters = list.filter((f) => /^image\//.test(f.type) && !/^image\/svg/.test(f.type)).length;
      const worker = rasters ? pictureWorker() : null;
      pickSaid = [];
      try {
        for (let i = 0; i < list.length; i++) {
          const f = list[i];
          const name = f.name || ('pasted-' + Date.now() + '.png');
          const cell = cells[i];
          const say1 = (t) => { pickSaid.push(t); flash(t); };
          try {
            let id = null;
            if (/^image\/svg/.test(f.type) || /\.svg$/i.test(name)) {
              say1(list.length > 1 ? 'importing ' + pickWords(i + 1, list.length) + ' — ' + name : 'importing ' + name);
              id = importText(name.replace(/\.svg$/i, '') + '.svg', await f.text(), { x: cell.x, y: cell.y }, cell.w);
            } else if (/^image\//.test(f.type)) {
              say1(list.length > 1 ? 'importing ' + pickWords(i + 1, list.length) + ' — keeping ' + name : 'keeping ' + name);
              id = await importPicture(f, name, cell, taken, worker);
            } else if (MM.kindOf(name)) {
              id = importText(name, await f.text(), { x: cell.x, y: cell.y }, cell.w);
            } else { out.skipped.push({ name: name, why: 'not a kind the canvas knows' }); continue; }
            if (id) out.ids.push(id); else out.skipped.push({ name: name, why: 'nothing was made of it' });
          } catch (err) {
            out.skipped.push({ name: name, why: String((err && err.message) || err) });
          }
        }
      } finally { endPictureWorker(worker); }
      // Placed clear of the view's own ground, the pick is shown: the view goes to what was just kept.
      if (shift.moved && out.ids.length) {
        const sn = session.getState();
        const bs = out.ids.map((id) => sn.nodes.get(id)).filter(Boolean).map((nd) => MM.boundsOf(nd)).filter(Boolean);
        const vis = viewportWorld();
        if (bs.length && bs.some((b) => b.minX > vis.maxX || b.maxX < vis.minX || b.minY > vis.maxY || b.maxY < vis.minY)) fitTo(union(bs));
      }
      const n = out.ids.length;
      const said = (n ? (n === 1 ? '1 picture kept' : n + ' pictures kept') + ' — laid out here, drawn under your ink' : 'nothing was imported') +
        (out.skipped.length ? ' · could not read ' + out.skipped.map((x) => x.name + ' (' + x.why + ')').join(', ') : '');
      pickSaid.push(said); flash(said);
      return out;
    };
    const next = pickChain.then(run, run);
    pickChain = next.then(() => undefined, () => undefined);
    return next;
  }

  /** A file from a drop, a paste, the picker or a camera: the one-file form of a pick. */
  async function importFile(file, at) {
    return (await importPictures([file], at ? { at: at } : {})).ids[0] || null;
  }

  // ===== Pictures drawn on the board =================================================
  // A picture artifact is painted on the canvas UNDER the ink (08-render.js asks `pictureBitmap` and draws
  // it) — not an iframe, so the live budget of frames is none of its business. The decoded bitmap is cached
  // by asset: a thumbnail while the screen shows the picture small, the picture whole once it is shown large;
  // read from the asset store and decoded once, off the paint; and let go — closed — when the decoded
  // pictures cost more than a budget (the least recently drawn first, never one in the paint just made) or
  // have not been drawn for a while. The cache is runtime: it holds nothing the log or the store does not.
  const PICTURE_IDLE_MS = 20000;
  const pictures = new Map();   // asset → { state: 'loading' | 'ready' | 'missing', tier, bmp, cost, drawn, drawnAt, size, want }
  let paintSerial = 0;
  let picturesLoading = 0;
  let sweepTimer = 0;
  /** Which pictures the last paint drew and in what state, for tests. */
  let drawnPictures = [];

  /** One decode: the asset's bytes into a bitmap at a tier — a thumbnail's long side, or whole. */
  async function decodeAsset(asset, tier) {
    // Bytes this browser holds not at all — a picture another hand imported in a room — are asked of the room (17-folder.js).
    const rec = (await assetGet(asset)) || (await roomAssetFetch(asset));
    if (!rec) return null;
    const blob = new Blob([rec.bytes], { type: rec.mime || 'image/jpeg' });
    if (tier === 'thumb' && rec.w && rec.h) {
      const k = Math.min(1, PICTURE_THUMB_PX / Math.max(rec.w, rec.h));
      if (k < 1) {
        try { return { bmp: await createImageBitmap(blob, { resizeWidth: Math.max(1, Math.round(rec.w * k)), resizeHeight: Math.max(1, Math.round(rec.h * k)), resizeQuality: 'medium' }), size: { w: rec.w, h: rec.h }, tier: 'thumb' }; } catch (err) { /* whole, then */ }
      }
    }
    const bmp = await createImageBitmap(blob);
    return { bmp: bmp, size: { w: rec.w || bmp.width, h: rec.h || bmp.height }, tier: 'full' };
  }

  /**
   * The bitmap to draw for an asset at the tier the screen wants — what is held, while a better one is read —
   * or null while there is none (and a read is under way, which repaints when it lands). Marks the asset as
   * drawn in this paint. `missing` is the asset this browser does not hold: a log that came from elsewhere.
   */
  function pictureBitmap(asset, tier) {
    let e = pictures.get(asset);
    if (!e) { e = { state: 'loading', tier: null, bmp: null, cost: 0, drawn: 0, drawnAt: 0, size: null, want: null }; pictures.set(asset, e); }
    e.drawn = paintSerial; e.drawnAt = Date.now();
    // A picture held whole is never decoded small again for a screen that has shrunk a little: the budget lets it go when it must.
    const needs = !e.bmp || (e.tier === 'thumb' && tier === 'full');
    if (e.state !== 'missing' && needs && e.want !== tier) {
      e.want = tier;
      picturesLoading++;
      decodeAsset(asset, tier).then((got) => {
        picturesLoading--;
        const cur = pictures.get(asset);
        if (!cur) { if (got) got.bmp.close(); return; }
        if (!got) { cur.state = 'missing'; askAgainLater(asset); viewChanged(); return; }
        if (cur.bmp) cur.bmp.close();
        cur.bmp = got.bmp; cur.tier = got.tier; cur.size = got.size; cur.state = 'ready';
        cur.cost = decodedCost(got.size, got.tier);
        viewChanged();
      }, () => { picturesLoading--; const cur = pictures.get(asset); if (cur) { cur.state = cur.bmp ? 'ready' : 'missing'; cur.want = null; } });
    }
    return e.bmp ? { bmp: e.bmp, tier: e.tier } : null;
  }
  // A picture the room did not hold yet (a hand's line can beat its bytes, or the relay was busy) is asked for again,
  // a few times, later each time (17-assets.js `roomAssetRetryMs`) — only in a room, and only while it stays missing.
  const askedAgain = new Map();
  function askAgainLater(asset) {
    if (!folder.roomAssets) return;
    const n = askedAgain.get(asset) || 0, ms = roomAssetRetryMs(n);
    if (ms === null) return;
    askedAgain.set(asset, n + 1);
    setTimeout(() => { const e = pictures.get(asset); if (e && e.state === 'missing') { pictures.delete(asset); viewChanged(); } }, ms);
  }
  /** What the paint just made has cost: let go of what the budget cannot hold and what has not been drawn for a while. */
  function picturesPainted() {
    const entries = [...pictures].filter(([, e]) => e.bmp).map(([k, e]) => ({ key: k, cost: e.cost, drawn: e.drawn }));
    for (const k of evictPlan(entries, { budgetPx: DECODED_BUDGET_PX, paintedAt: paintSerial })) releasePicture(k);
    if (!sweepTimer && pictures.size) sweepTimer = setTimeout(sweepPictures, PICTURE_IDLE_MS + 500);
  }
  function releasePicture(asset) {
    const e = pictures.get(asset);
    if (!e) return;
    if (e.bmp) e.bmp.close();
    pictures.delete(asset);
  }
  function sweepPictures() {
    sweepTimer = 0;
    const now = Date.now();
    for (const [k, e] of [...pictures]) if (e.bmp && e.drawn < paintSerial && now - e.drawnAt > PICTURE_IDLE_MS) releasePicture(k);
    if ([...pictures.values()].some((e) => e.bmp)) sweepTimer = setTimeout(sweepPictures, PICTURE_IDLE_MS);
  }
  /** Everything decoded, let go — what a reload would do; for tests. */
  function forgetPictures() { for (const k of [...pictures.keys()]) releasePicture(k); }
  const pictureState = () => ({
    loading: picturesLoading,
    decoded: [...pictures].filter(([, e]) => e.bmp).map(([k, e]) => ({ asset: k, tier: e.tier, cost: e.cost })),
    missing: [...pictures].filter(([, e]) => e.state === 'missing').map(([k]) => k),
  });

  /**
   * Draw a picture artifact in the box where it stands: its bitmap at the tier the screen wants, or — while
   * the bytes are being read, or when this browser does not hold them — a faint plate where it stands, so the
   * place is never empty. Called by the paint under the ink, in world space. Returns its state.
   */
  function drawPicture(node, id) {
    const p = MM.pictureOf(node);
    const b = MM.boundsOf(node);
    if (!p || !p.asset || !b) return null;
    const w = b.maxX - b.minX, h = b.maxY - b.minY;
    const dpr = window.devicePixelRatio || 1;
    const got = pictureBitmap(p.asset, pictureTier(Math.max(w, h) * view.zoom * dpr));
    if (got) {
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      // A picture the hand turned stands in its frame turned about its centre, as a stroke does.
      const turn = MM.getRep(node, 'rotation');
      if (turn && typeof turn.data === 'number' && turn.data) {
        ctx.save();
        ctx.translate(b.minX + w / 2, b.minY + h / 2); ctx.rotate(turn.data);
        ctx.drawImage(got.bmp, -w / 2, -h / 2, w, h);
        ctx.restore();
      } else ctx.drawImage(got.bmp, b.minX, b.minY, w, h);
    } else {
      ctx.fillStyle = `rgba(${C.goldRGB},0.06)`;
      ctx.fillRect(b.minX, b.minY, w, h);
    }
    const state = got ? 'drawn' : (pictures.get(p.asset) || {}).state === 'missing' ? 'missing' : 'loading';
    drawnPictures.push({ id: id, asset: p.asset, state: state, tier: got ? got.tier : null, box: { minX: b.minX, minY: b.minY, maxX: b.maxX, maxY: b.maxY } });
    return state;
  }
  /** The start of a paint: the serial the pictures drawn in it are marked with. */
  function picturesBegin() { paintSerial++; drawnPictures = []; }

  /** A picture's `src` for a card or a frame (the grid view): the asset as a URL, once it is read; else the folder's file. */
  const assetUrls = new Map();
  function pictureSrc(rep) {
    const a = rep && rep.data && rep.data.asset;
    if (a) {
      if (assetUrls.has(a)) return assetUrls.get(a);
      assetUrls.set(a, null);
      assetGet(a).then((rec) => {
        if (!rec) return;
        assetUrls.set(a, URL.createObjectURL(new Blob([rec.bytes], { type: rec.mime || 'image/jpeg' })));
        if (viewMode === 'grid') renderGrid(session.getState());
      }, () => {});
      return null;
    }
    return rep && rep.data && rep.data.path ? imageUrlFor(rep.data.path) : null;
  }

  // ===== Tracing: an offer, not an import ==================================================
  // The host act of *Trace into ink* (tools/trace.ts names it). A picture used to be traced the moment it
  // came in, whatever it was; now it is traced when a hand asks, over the picture, which stays. The pixels
  // are the asset's, read again here; the strokes land as one `import` event — one act, one undo — placed
  // exactly over the picture's own box. A later unit may filter by what the shape rung reads with confidence.
  async function traceFrom(artifactId, asset) {
    const s = session.getState();
    const node = s.nodes.get(artifactId);
    const b = node && MM.boundsOf(node);
    if (!b) { flash('that picture is no longer there'); return null; }
    let bitmap;
    try {
      const rec = await assetGet(asset);
      if (!rec) { flash('the pixels of that picture are not on this device, so it cannot be traced'); return null; }
      const bmp = await createImageBitmap(new Blob([rec.bytes], { type: rec.mime || 'image/jpeg' }));
      try {
        const k = Math.min(1, IMPORT_MAX_PX / Math.max(bmp.width, bmp.height));
        const w = Math.max(1, Math.round(bmp.width * k)), h = Math.max(1, Math.round(bmp.height * k));
        const off = document.createElement('canvas');
        off.width = w; off.height = h;
        const c = off.getContext('2d', { willReadFrequently: true });
        c.drawImage(bmp, 0, 0, w, h);
        bitmap = c.getImageData(0, 0, w, h);
      } finally { bmp.close(); }
    } catch (err) { flash('could not read that picture: ' + ((err && err.message) || err)); return null; }
    const traced = MM.trace(bitmap);
    const kx = (b.maxX - b.minX) / bitmap.width, ky = (b.maxY - b.minY) / bitmap.height;
    const strokes = traced.strokes.map((st) => st.points.map((p) => ({ x: b.minX + p.x * kx, y: b.minY + p.y * ky })));
    const p = MM.pictureOf(session.getState().nodes.get(artifactId) || node);
    let ink = null;
    if (strokes.length) ink = session.withTool('trace', () => session.import({ kind: (p && p.kind) || 'png', path: (p && p.path) || 'imports/traced', bounds: { minX: b.minX, minY: b.minY, maxX: b.maxX, maxY: b.maxY }, strokes: strokes, at: Date.now() }), 'trace');
    flash('traced ' + ((p && p.name) || 'the picture') + ': ' + strokes.length + ' stroke' + (strokes.length === 1 ? '' : 's') + ' of ink over it — ' + traced.reasoning);
    return { inkId: ink, strokes: strokes.length, reasoning: traced.reasoning };
  }

  // Drop, paste, the picker, the camera.
  canvas.addEventListener('dragover', (e) => { e.preventDefault(); });
  canvas.addEventListener('drop', (e) => {
    e.preventDefault();
    const at = screenToWorld(e.clientX, e.clientY);
    importPictures([...e.dataTransfer.files], { at: at });
  });
  /** A field the hand types in: a paste there is the field's, never the board's. */
  const isTextField = (el) => !!el && el.nodeType === 1 && (el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName));
  addEventListener('paste', (e) => {
    if (isTextField(e.target)) return;
    const items = [...(e.clipboardData ? e.clipboardData.items : [])];
    const files = items.filter((i) => i.kind === 'file').map((i) => i.getAsFile()).filter(Boolean);
    const at = lastPen ? screenToWorld(lastPen.x, lastPen.y) : screenToWorld(innerWidth / 2, innerHeight / 2);
    // No file on the clipboard: what Copy held is pasted where the pen last was.
    if (!files.length) { if (clip) { e.preventDefault(); pasteClip(at); } return; }
    e.preventDefault();
    importPictures(files, { at: at });
  });
  const importInput = document.getElementById('importInput');
  const photosInput = document.getElementById('photosInput');
  const cameraInput = document.getElementById('cameraInput');
  const importPanel = document.getElementById('importPanel');
  const importBtn = document.getElementById('importBtn');
  ui.pane(importPanel, 'import', () => closePanel(importPanel, importBtn));
  importBtn.onclick = () => togglePanel(importPanel, importBtn);
  // The file dialog opens inside the tap that asks for it (a browser will not open one otherwise).
  importPanel.addEventListener('click', (e) => {
    const b = e.target.closest && e.target.closest('button[data-import]');
    if (!b) return;
    const input = { photos: photosInput, camera: cameraInput, file: importInput }[b.dataset.import];
    if (input) input.click();
    closePanel(importPanel, importBtn);
  });
  for (const input of [photosInput, cameraInput, importInput]) {
    input.onchange = () => {
      const files = [...input.files];
      input.value = '';
      importPictures(files);
    };
  }

// ===== the board out =====
// Provides: the board out and back whole (PLAN-IPAD-NOTES I4) — downloadBlob/downloadText (and `lastDownload`, for
//   tests), the marks an export is of (exportIds: the held marks, else the board), the board as layers (boardLayers),
//   the board as one SVG with its pictures and figures in it (exportSvg; exportBoardSVG and svgOf, the sync ink-and-
//   figures forms the clipboard's Copy still asks), as a PNG of the WHOLE board drawn offscreen (exportPng), as a PDF
//   of one page (exportPdf), as a bundle — a zip holding the log and its pictures (exportBundle) — and a bundle read
//   back (bundleLoad: every picture stored, hash checked, before the board's events land); exportLog; the export pane.
// Uses: core, folder (session, boards, board, boardOnScreenName, logWrite, logFileNote, readLogText), images (the asset
//   store: assetGet, assetList, assetPut, decodeAsset, digestHex), artifacts (codeRepOf, isWritingArtifact), kinds
//   (TEXT_FITS_LINES, linesOf), controls (closePanel, togglePanel), input (flash), 17-assets.js (assetsOfEvents),
//   17-bundle.js (the zip, the bundle, the svg, the plans).
// A fragment of one closure: Demos/build-surface.mjs concatenates surface/*.js
// in name order inside `(function () { ... })();`. Shared state is the closure's; no imports, no exports,
// no build step beyond the concatenation.
//
// Export is the kinds list read backwards: the board as a bundle, SVG, PNG or PDF, the session as its log. A page's
// HTML, a behaviour's source and a frame's bundle are exported from the panel, each by its own kind.
//
// WHAT AN EXPORT IS OF: the marks held, when something is held, else the whole board — said in the status line
// either way. Pictures, SVG figures and writing are drawn under the ink in board order, as the board paints them;
// a PNG and a PDF are drawn on an offscreen canvas from the same layers as board.svg — never the viewport, so the
// view's zoom and pan and what is off screen never change what comes out. Ink is the board's own paths (the clean
// form where one is held, a routed connector's route), dark on paper: a file is read away from the board's own
// theme. What is not drawn — a page, a program, a Mermaid text — is counted and said, never silently left out.

  // ===== Downloads ==========================================================
  /** The last file handed to the browser, for tests: { name, blob }. */
  let lastDownload = null;
  function downloadBlob(name, blob) {
    lastDownload = { name: name, blob: blob };
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

  // ===== The marks an export is of, as layers =======================================
  const EXPORT_PAPER = '#fbfaf7';

  /** The marks held, in board order, else every mark of the board. */
  function exportIds() {
    const s = session.getState();
    const held = new Set(s.selection.filter((id) => s.nodes.get(id) && MM.boundsOf(s.nodes.get(id))));
    const ids = held.size ? s.contentIds.filter((id) => held.has(id)) : [];
    return ids.length ? { scope: 'held', ids: ids } : { scope: 'board', ids: s.contentIds.slice() };
  }

  /**
   * Some marks as the layers 17-bundle.js's boardSvg draws, in board order: each picture (a box, the turn the hand gave
   * it, its data URL from `hrefs` — a Map from asset to what stands for its bytes — else null, which draws its name),
   * each SVG figure, each text, and the ink: the clean form where one is held, a routed connector's route and head.
   * With no `hrefs` the pictures are left out altogether (the clipboard's Copy and the old board.svg never had them).
   * Also the box the layers fill and a count of what is in them, for the sentence that says it.
   */
  function boardLayers(ids, hrefs) {
    const s = session.getState(), layers = [], boxes = [];
    const tally = { pictures: 0, plates: 0, figures: 0, writing: 0, strokes: 0, left: 0 };
    const pt = (p) => p.x.toFixed(1) + ' ' + p.y.toFixed(1);
    const path = (pts, closed) => pts.map((p, i) => (i ? 'L' : 'M') + pt(p)).join(' ') + (closed ? ' Z' : '');
    const ink = (node, depth) => {
      const pts = MM.strokePointsOf(node);
      if (pts) {
        const route = MM.routeRepOf(node);
        if (route && route.points.length >= 2) {
          layers.push({ kind: 'path', id: node.id, reads: MM.wordOf(node) || '', d: path(route.points, false) });
          if (route.head) layers.push({ kind: 'path', id: node.id, d: path([route.head.wings[0], route.head.tip, route.head.wings[1]], false) });
        } else {
          const clean = MM.cleanPointsOf(node);
          layers.push({ kind: 'path', id: node.id, reads: MM.wordOf(node) || MM.topInterpretation(node) || '', d: path(clean || pts, !!(clean && MM.cleanOf(node).closed)) });
        }
        tally.strokes++;
        return;
      }
      if (depth > 6) return;
      for (const e of node.edges) {
        if (e.rel !== 'has-part') continue;
        const m = s.nodes.get(e.to);
        if (m && !m.reps.some((r) => r.modality === 'erased')) ink(m, depth + 1);
      }
    };
    for (const id of ids) {
      const node = s.nodes.get(id);
      if (!node) continue;
      const b = MM.boundsOf(node), fin = b && MM.finiteBounds(b);
      if (!s.artifacts.includes(id)) { if (fin) boxes.push(b); ink(node, 0); continue; }
      const p = MM.pictureOf(node);
      if (p) {
        if (!hrefs || !fin) continue;
        boxes.push(b);
        const turn = MM.getRep(node, 'rotation');
        const href = p.asset ? hrefs.get(p.asset) || null : null;
        layers.push({ kind: 'picture', id: id, name: p.name, asset: p.asset || null, box: b, turn: turn && typeof turn.data === 'number' ? turn.data : 0, href: href });
        if (href) tally.pictures++; else tally.plates++;
        continue;
      }
      if (fin) boxes.push(b);
      const rep = codeRepOf(node), kind = rep && rep.data.kind;
      if (kind === 'svg' && fin) { layers.push({ kind: 'figure', id: id, name: MM.wordOf(node) || '', box: b, svg: String(rep.data.code) }); tally.figures++; ink(node, 0); }
      else if (kind === 'text' && fin) {
        const code = String(rep.data.code);
        layers.push({ kind: 'text', id: id, name: MM.wordOf(node) || '', box: b, text: code, fitted: rep.data.from === 'writing' || linesOf(code) <= TEXT_FITS_LINES });
        tally.writing++;
        // Writing taken as text stands in place of its ink, as on the board (the ink is under it, flipped over only on a tap).
        if (!isWritingArtifact(node)) ink(node, 0);
      } else { if (kind) tally.left++; ink(node, 0); }
    }
    return { layers: layers, box: boxes.length ? union(boxes) : null, tally: tally };
  }

  /** The pictures of some marks, held by this device: a Map from asset to a data URL (`bytes`), else to `true` (for a PNG, which decodes them itself). */
  async function pictureHrefs(ids, bytes) {
    const s = session.getState(), want = new Set();
    for (const id of ids) { const n = s.artifacts.includes(id) && s.nodes.get(id), p = n && MM.pictureOf(n); if (p && p.asset) want.add(p.asset); }
    const out = new Map();
    if (!want.size) return out;
    if (!bytes) {
      const held = new Set((await assetList()).map((a) => a.hash));
      for (const a of want) if (held.has(a)) out.set(a, true);
      return out;
    }
    for (const a of want) {
      const rec = await assetGet(a);
      if (rec) out.set(a, pictureDataUrl(rec.mime || 'image/jpeg', rec.bytes instanceof Uint8Array ? rec.bytes : new Uint8Array(rec.bytes)));
    }
    return out;
  }

  const plural = (n, one, many) => n + ' ' + (n === 1 ? one : many || one + 's');
  /** What an export holds, in words: *the whole board* or *the 3 held marks*, and what stands in it. */
  function exportWords(name, sel, t, extra) {
    const of = sel.scope === 'held' ? 'the ' + plural(sel.ids.length, 'held mark') : 'the whole board';
    const parts = [];
    if (t.pictures) parts.push(plural(t.pictures, 'picture'));
    if (t.plates) parts.push(plural(t.plates, 'picture') + ' this device does not hold, drawn as ' + (t.plates === 1 ? 'its name' : 'their names'));
    if (t.figures) parts.push(plural(t.figures, 'figure'));
    if (t.writing) parts.push(t.writing === 1 ? 'writing' : t.writing + ' lines of writing');
    if (t.strokes) parts.push(plural(t.strokes, 'stroke'));
    const left = t.left ? ' · ' + plural(t.left, 'page or program', 'pages and programs') + ' not drawn — only their text stands in the log' : '';
    return name + ' — ' + of + (parts.length ? ': ' + parts.join(', ') : '') + (extra ? ' · ' + extra : '') + left;
  }

  // ===== The board as SVG ===============================================================
  /** The clipboard's Copy and the first board.svg: ink, figures and writing, no pictures. */
  function svgOf(ids) {
    const L = boardLayers(ids);
    return boardSvg(L.layers, L.box, {});
  }
  function exportBoardSVG() {
    return svgOf(session.getState().contentIds);
  }
  /** board.svg: the held marks or the board, the pictures carried inside it as data URLs. */
  async function exportSvg() {
    const sel = exportIds();
    const L = boardLayers(sel.ids, await pictureHrefs(sel.ids, true));
    return { text: boardSvg(L.layers, L.box, {}), scope: sel.scope, n: sel.ids.length, tally: L.tally, words: exportWords('board.svg', sel, L.tally) };
  }

  // ===== The board as a picture ======================================================
  /** An SVG as a loaded image, to draw on a canvas. */
  function loadSvgImage(text) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(new Blob([text], { type: 'image/svg+xml' }));
      const img = new Image();
      img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('the board could not be drawn as a picture')); };
      img.src = url;
    });
  }
  /**
   * The board drawn offscreen, `w` × `h` pixels over a paper ground: the pictures from their own bytes at the
   * quality they are kept in, then every other layer (figures, writing, ink, the plates of pictures this device
   * lacks) as one SVG over them. The view is never read.
   */
  async function renderBoard(prep, w, h) {
    const fr = prep.frame, kx = w / fr.w, ky = h / fr.h;
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const g = canvas.getContext('2d', { willReadFrequently: false });
    g.fillStyle = EXPORT_PAPER;
    g.fillRect(0, 0, w, h);
    g.imageSmoothingEnabled = true;
    g.imageSmoothingQuality = 'high';
    for (const l of prep.layers) {
      if (l.kind !== 'picture' || !l.href || !l.asset) continue;
      const got = await decodeAsset(l.asset, 'full');
      if (!got) continue;
      try {
        const bw = (l.box.maxX - l.box.minX) * kx, bh = (l.box.maxY - l.box.minY) * ky;
        g.save();
        g.translate((l.box.minX - fr.x) * kx + bw / 2, (l.box.minY - fr.y) * ky + bh / 2);
        if (l.turn) g.rotate(l.turn);
        g.drawImage(got.bmp, -bw / 2, -bh / 2, bw, bh);
        g.restore();
      } finally { got.bmp.close(); }
    }
    g.drawImage(await loadSvgImage(boardSvg(prep.layers, prep.box, { pictures: false })), 0, 0, w, h);
    return canvas;
  }
  /** What an offscreen picture of the held marks or the board is made from. */
  async function prepareExport() {
    const sel = exportIds();
    const L = boardLayers(sel.ids, await pictureHrefs(sel.ids, false));
    if (!L.box) return null;
    return { sel: sel, layers: L.layers, box: L.box, tally: L.tally, frame: boardFrame(L.box) };
  }
  const canvasBlob = (canvas, type, q) => new Promise((resolve) => canvas.toBlob((b) => resolve(b), type, q));

  /** board.png: twice the size of the marks, held to what the device's canvas can make, and said when it was. */
  async function exportPng() {
    const prep = await prepareExport();
    if (!prep) return null;
    const plan = pngPlan(prep.frame.w, prep.frame.h);
    const canvas = await renderBoard(prep, plan.w, plan.h);
    const blob = await canvasBlob(canvas, 'image/png');
    if (!blob) throw new Error('the browser would not make the picture');
    return {
      blob: blob, w: plan.w, h: plan.h, k: plan.w / prep.frame.w, origin: { x: prep.frame.x, y: prep.frame.y }, scope: prep.sel.scope, n: prep.sel.ids.length, said: plan.said,
      words: exportWords('board.png', prep.sel, prep.tally, plan.w + ' × ' + plan.h + ' pixels' + (plan.said ? ', ' + plan.said : '')),
    };
  }

  /** One page of PDF: A4 or Letter turned the way the board lies, the board's picture on it at 200 dpi, said how much smaller than drawn. */
  async function exportPdf() {
    const prep = await prepareExport();
    if (!prep) return null;
    const plan = pdfPlan(prep.frame.w, prep.frame.h, typeof navigator !== 'undefined' ? navigator.language : '');
    const canvas = await renderBoard(prep, plan.rasterW, plan.rasterH);
    const w = canvas.width, h = canvas.height;
    let image = null, how = '';
    if (typeof CompressionStream !== 'undefined') {
      const px = canvas.getContext('2d').getImageData(0, 0, w, h).data;
      const rgb = new Uint8Array(w * h * 3);
      for (let i = 0, o = 0; i < px.length; i += 4, o += 3) { rgb[o] = px[i]; rgb[o + 1] = px[i + 1]; rgb[o + 2] = px[i + 2]; }
      const z = new Uint8Array(await new Response(new Blob([rgb]).stream().pipeThrough(new CompressionStream('deflate'))).arrayBuffer());
      image = { w: w, h: h, filter: 'flate', data: z };
    } else {
      // A browser with no way to compress: the picture goes in as a JPEG, untouched.
      const jpeg = await canvasBlob(canvas, 'image/jpeg', 0.92);
      if (!jpeg) throw new Error('the browser would not make the picture');
      image = { w: w, h: h, filter: 'dct', data: new Uint8Array(await jpeg.arrayBuffer()) };
      how = 'as a JPEG, this browser having no way to compress it';
    }
    const name = (boardOnScreenName() || 'board');
    const bytes = pdfWrite({ pageW: plan.pageW, pageH: plan.pageH, box: plan.box, image: image, title: name, created: Date.now() });
    return {
      blob: new Blob([bytes], { type: 'application/pdf' }), plan: plan, said: plan.said, origin: { x: prep.frame.x, y: prep.frame.y }, span: { w: prep.frame.w, h: prep.frame.h },
      scope: prep.sel.scope, n: prep.sel.ids.length, words: exportWords('board.pdf', prep.sel, prep.tally, plan.said + (how ? ', ' + how : '')),
    };
  }

  // ===== The bundle: the board and its pictures, one file ==================================
  /** Raw deflate, unpacked by the browser — what a zip the Files app made needs; null where the browser cannot. */
  const inflateRaw = typeof DecompressionStream === 'undefined' ? null : async (raw) => {
    try { return new Uint8Array(await new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer()); }
    catch (err) { throw new Error('it could not be unpacked'); }
  };
  const bytesOf = (b) => (b instanceof Uint8Array ? b : new Uint8Array(b));

  /**
   * The whole board and every picture it names, as one zip (17-bundle.js): `board.jsonl` — the version 1 log, its
   * header saying how many pictures sit beside it — and `assets/<hash>.<ext>`. A picture this device does not hold
   * (a log that came from elsewhere) cannot be put in, and is said.
   */
  async function exportBundle() {
    const evs = session.getEvents();
    const got = [];
    let missing = 0;
    for (const ref of assetsOfEvents(evs)) {
      const rec = await assetGet(ref);
      if (rec) got.push({ ref: ref, mime: rec.mime || 'image/jpeg', bytes: bytesOf(rec.bytes) }); else missing++;
    }
    const log = MM.encodeLog(evs, Object.assign(logWrite(), got.length ? { assets: got.length } : {}));
    const z = bundleBuild({ log: log, assets: got, time: Date.now() });
    const name = bundleName(boardOnScreenName());
    const held = got.length ? plural(got.length, 'picture') : 'no pictures';
    const said = name + ' — the whole board, its ' + plural(evs.length, 'event') + ' and ' + held + ' in one file; boards ▸ from a file… opens it whole' +
      (missing ? ' · ' + plural(missing, 'picture') + ' this device does not hold could not be put in it' : '');
    return { name: name, blob: new Blob(z.parts, { type: 'application/zip' }), assets: got.length, missing: missing, events: evs.length, said: said };
  }

  /**
   * A zip opened as a board's file: every picture stored (its hash checked against its name) BEFORE the log is handed
   * back — so no event of the board ever names bytes that were not kept — then the events as `readLogText` reads
   * them. `{ ok: false, words }` for what cannot be read, with nothing stored; else `{ ok: true, events, stored,
   * damaged, notCarried }` — `damaged` the pictures that did not match their names (left out), `notCarried` the
   * assets the log names that neither the file nor this device holds.
   */
  async function bundleLoad(file) {
    const bytes = new Uint8Array(await file.arrayBuffer());
    const r = await bundleRead(bytes, { inflate: inflateRaw, digest: digestHex });
    if (!r.ok) return r;
    const read = readLogText(r.text, file.name);
    if (!read.events) return { ok: false, words: read.refused || 'the board.jsonl in this zip is not a board’s log — nothing was opened' };
    const info = new Map();
    for (const ev of read.events) if (ev && ev.type === 'import' && isAssetRef(ev.asset)) info.set(ev.asset, { mime: ev.mime, w: ev.w, h: ev.h });
    let stored = 0;
    for (const a of r.assets) {
      const i = info.get(a.ref);
      if (!i) continue;      // a picture no event of the board names is not kept
      await assetPut({ hash: a.ref, bytes: a.bytes, mime: i.mime || a.mime, w: i.w, h: i.h });
      stored++;
    }
    const notCarried = [];
    for (const ref of info.keys()) if (!r.assets.some((a) => a.ref === ref) && !(await assetGet(ref))) notCarried.push(ref);
    return { ok: true, events: read.events, stored: stored, pending: r.assets.filter((a) => info.has(a.ref)).map((a) => a.ref), damaged: r.damaged, notCarried: notCarried };
  }

  /** A bundle read, for tests: what is in it, its header, how many events, and where each file's bytes stand. */
  async function bundleProbe(bytes) {
    const z = await zipRead(bytes, { inflate: inflateRaw });
    if (!z.ok) return { ok: false, words: z.words };
    const log = z.entries.find((e) => e.name === BUNDLE_LOG);
    if (!log) return { ok: false, words: 'no log' };
    const text = new TextDecoder().decode(log.data);
    return {
      ok: true, names: z.entries.map((e) => e.name), entries: z.entries.map((e) => ({ name: e.name, dataAt: e.data.byteOffset - bytes.byteOffset, bad: e.bad || null })),
      header: JSON.parse(text.split('\n')[0]), events: MM.decodeLog(text).events.length,
    };
  }

  // ===== The log =========================================================================
  function exportLog() {
    return JSON.stringify(session.getEvents());
  }

  // ===== The export pane ====================================================================
  const exportPanel = document.getElementById('exportPanel');
  const exportBtn = document.getElementById('exportBtn');
  ui.pane(exportPanel, 'export', () => closePanel(exportPanel, exportBtn));
  exportBtn.onclick = () => togglePanel(exportPanel, exportBtn);
  const outFailed = (what) => (err) => flash(what + ' could not be made — ' + ((err && err.message) || err));
  exportPanel.addEventListener('click', (e) => {
    const b = e.target.closest && e.target.closest('button[data-export]');
    if (!b) return;
    const which = b.dataset.export;
    if (which === 'svg') exportSvg().then((r) => { downloadText('board.svg', r.text, 'image/svg+xml'); flash(r.words); }, outFailed('board.svg'));
    else if (which === 'png') exportPng().then((r) => { if (r) { downloadBlob('board.png', r.blob); flash(r.words); } else flash('nothing to draw yet'); }, outFailed('board.png'));
    else if (which === 'pdf') exportPdf().then((r) => { if (r) { downloadBlob('board.pdf', r.blob); flash(r.words); } else flash('nothing to draw yet'); }, outFailed('board.pdf'));
    else if (which === 'bundle') exportBundle().then((r) => { downloadBlob(r.name, r.blob); flash(r.said); }, outFailed('the board with its pictures'));
    else if (which === 'log') {
      const evs = session.getEvents(), pics = assetsOfEvents(evs).size;
      downloadText('canvas.jsonl', MM.encodeLog(evs, logWrite()), 'application/json');
      flash('canvas.jsonl — ' + evs.length + ' events' + logFileNote() + (pics ? ' · its ' + plural(pics, 'picture') + (pics === 1 ? ' is' : ' are') + ' not in it — export “board + pictures”, a .zip, to carry them' : ''));
    }
    closePanel(exportPanel, exportBtn);
  });

// ===== text =====
// Provides: text as an element — typeText (a text artifact at a point), editText (a new version of one),
//   beginTextEdit/commitTextEdit (the editor on the canvas, opened by a double-click on empty ground or
//   from the panel), wordToText (a written word becomes a text artifact, on request), strikeOnText/foldIntoText/textNear (text folds back from ink).
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

  /** A new version of a text artifact's words. Where the text came from (writing) travels with every version. */
  function editText(id, text) {
    const n = session.getState().nodes.get(id);
    const rep = n && codeRepOf(n);
    return session.attachCode({ participantId: MM.LOCAL_PARTICIPANT, nodeId: id, kind: rep && rep.data.kind === 'mermaid' ? 'mermaid' : 'text', code: text, from: rep && rep.data.from, at: Date.now() });
  }

  /** A written word (its transcript) becomes a text artifact where the writing is; the ink stays. */
  /** A line of writing as one text artifact, standing where the line is. */
  function lineToText(ids, text) {
    const s = session.getState();
    const pts = ids.map((id) => s.nodes.get(id)).filter(Boolean).map((n) => MM.boundsOf(n)).filter(Boolean).flatMap((b) => [{ x: b.minX, y: b.minY }, { x: b.maxX, y: b.maxY }]);
    if (!text || !pts.length) return null;
    const b = MM.getBounds(pts);
    const w = Math.max(TEXT_W, b.maxX - b.minX), h = Math.max(48, b.maxY - b.minY);
    textCount++;
    return session.import({
      kind: 'text', path: TEXT_DIR + '/' + textCount + '.txt', name: text,
      bounds: { minX: b.minX, minY: b.minY, maxX: b.minX + w, maxY: b.minY + h }, code: text, at: Date.now(),
    });
  }

  // ===== Text folds back from ink (v10 F12) ===================================
  // Text is first class and it came from the hand: scratch a word of a text
  // made from writing and the word is struck — a gap stands where it was;
  // write beside the gap, read it, and *Fold “…” into the text* puts the new
  // word in its place. Every step is a new version of the text; undo walks
  // them back.
  const GAP = '…';

  /** The words of a text with their positions on the canvas, from the frame's own document. */
  function textWords(s, aid) {
    const an = s.nodes.get(aid);
    const fr = an && MM.frameOf(an);
    const f = frames.get(aid);
    let doc = null;
    try { doc = f && f.iframe ? f.iframe.contentDocument : null; } catch (err) { doc = null; }
    if (!fr || !doc) return [];
    const out = [];
    for (const el of doc.querySelectorAll('text[data-region]')) {
      const r = el.getBoundingClientRect();
      out.push({ index: Number(el.dataset.region.slice(1)) - 1, word: el.textContent, box: { minX: fr.x + r.left, minY: fr.y + r.top, maxX: fr.x + r.right, maxY: fr.y + r.bottom } });
    }
    return out;
  }
  /** A text's code with word k replaced, or a word inserted after k — lines kept. */
  function withWord(code, k, word, insertAfter) {
    let i = 0;
    return String(code).split(/\r?\n/).map((l) => l.split(/\s+/).filter(Boolean).flatMap((wd) => {
      const j = i++;
      if (j !== k) return [wd];
      return insertAfter ? [wd, word] : [word];
    }).join(' ')).join('\n');
  }
  /** A scratch over a word of a text strikes it: a gap where it was, the scratch gone, one version. Returns the word struck. */
  function strikeOnText(s, strokeId, points) {
    const node = s.nodes.get(strokeId);
    const fp = node && MM.fingerprintOf(node);
    if (!fp || fp.isClosed || fp.corners < 2) return null;
    const b = fp.bounds;
    for (const aid of s.live) {
      const an = s.nodes.get(aid);
      if (!isWritingArtifact(an) || flipped.has(aid)) continue;
      const fr = MM.frameOf(an);
      if (!fr || b.maxX < fr.x || b.minX > fr.x + fr.w || b.maxY < fr.y || b.minY > fr.y + fr.h) continue;
      for (const wd of textWords(s, aid)) {
        if (wd.word === GAP) continue;
        const outline = MM.outlineOf({ bounds: wd.box, closed: true });
        if (!outline || MM.countCrossings(points, outline, 3) < 3) continue;
        editText(aid, withWord(codeRepOf(an).data.code, wd.index, GAP, false));
        session.erase(strokeId, Date.now());
        return wd.word;
      }
    }
    return null;
  }
  /** The text made from writing that this writing sits on or just beside (above a gap, say), if any. */
  function textNear(s, b) {
    const h = Math.max(1, b.maxY - b.minY);
    for (const aid of s.live) {
      const an = s.nodes.get(aid);
      if (!isWritingArtifact(an)) continue;
      const fr = MM.frameOf(an);
      if (!fr) continue;
      // Beside: within four lines of the text, or four heights of the writing, whichever is the taller — a hand writes the replacement a line or two above.
      const lines = Math.max(1, String(codeRepOf(an).data.code).split(/\r?\n/).length);
      const tol = 4 * Math.max(h, fr.h / lines);
      if (b.maxX >= fr.x - tol && b.minX <= fr.x + fr.w + tol && b.maxY >= fr.y - tol && b.minY <= fr.y + fr.h + tol) return aid;
    }
    return null;
  }
  /** Written words fold into a text: in place of the nearest gap, else after the nearest word. The writing leaves; the text is a version richer. */
  function foldIntoText(aid, text, markIds) {
    const s = session.getState();
    const an = s.nodes.get(aid);
    const rep = an && codeRepOf(an);
    if (!rep) return null;
    const boxes = markIds.map((id) => MM.boundsOf(s.nodes.get(id))).filter(Boolean);
    const cx = boxes.length ? (Math.min(...boxes.map((x) => x.minX)) + Math.max(...boxes.map((x) => x.maxX))) / 2 : 0;
    const words = textWords(s, aid);
    const dist = (wd) => Math.abs((wd.box.minX + wd.box.maxX) / 2 - cx);
    const gaps = words.filter((wd) => wd.word === GAP).sort((p, q) => dist(p) - dist(q));
    const at = Date.now();
    let next;
    if (gaps.length) next = withWord(rep.data.code, gaps[0].index, text, false);
    else if (words.length) { const near = words.slice().sort((p, q) => dist(p) - dist(q))[0]; next = withWord(rep.data.code, near.index, text, true); }
    else next = text;
    editText(aid, next);
    markIds.forEach((id, i) => session.erase(id, at + 1 + i));
    return next;
  }

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
      // A text is edited in place; so is a Mermaid text, a new version of the same kind (D2).
      if (!rep || (rep.data.kind !== 'text' && rep.data.kind !== 'mermaid')) return false;
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
      flash(rep && rep.data.kind === 'mermaid' ? 'Mermaid revised — drawn again; every version is kept, and undo drops this one' : 'text revised — every version is kept; undo drops this one');
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
    const under = nodeAt(w.x, w.y);
    // A double-click on a text — typed, or writing taken as text — edits it in place.
    if (under) { if (beginTextEdit(under)) { const s0 = session.getState(); if (s0.summon) session.dismiss(s0.summon.id, Date.now()); if (s0.selection.length) session.deselect(Date.now()); } return; }
    beginTextEdit(null, w);
  });

// ===== controls =====
// Provides: the control centre — one button in the bar, three labelled groups of tiles in fixed slots
//   (PLAN-USER-SURFACE U1f: Board — boards, folder, import, export, reset; View — zoom, view, theme, hand,
//   snap, snap now; Helpers — models, live, auto-read, packs, your mark, help; the markup is the page's) (zoom, snap,
//   view, theme, hand, auto-read, folder, import, export, models, teach, live, reset, help, boards, packs);
//   syncTiles() writes every tile's face from state; openPane/closePanes keep one pane open at a time.
// Uses: core (prefs, themeMode, hand, draws), hand (handFace, nextHand), input (palmHere), snap (snapMode), folder (viewMode, folder; the boards adapter:
//   boardOnScreenName, resetBoard), models (agents, deciderHost), teach (teachPanel), handwriting (autoRead), packs (packsFace), seat (withClaude); the page's
//   version from its <meta name="metamedium-version"> (V1-PLAN R7), said at the head of the help pane.
// A fragment of one closure: Demos/build-surface.mjs concatenates surface/*.js
// in name order inside `(function () { ... })();`. Shared state is the
// closure's; no imports, no exports, no build step beyond the concatenation.

  // ===== The control centre (SURFACE-v9-PLAN D4) ==============================
  // Fourteen rail buttons become one button and a grid of tiles that keep
  // their slots (I12: a slot is a promise), in three labelled groups (U1f) —
  // settings, one-off acts and connections side by side had no grouping, and
  // Reset stood beside Help. Tiles are toggles where they can
  // be and say their state on their face. The centre closes on the next
  // stroke, on Esc, and on a tap outside it.
  const ccBtn = document.getElementById('ccBtn');
  const ccEl = document.getElementById('cc');
  const tiles = {
    zoom: document.getElementById('zoomTile'), snap: document.getElementById('snapMode'), snapNow: document.getElementById('snapBtn'),
    view: document.getElementById('gridBtn'), theme: document.getElementById('themeBtn'), hand: document.getElementById('handBtn'),
    autoRead: document.getElementById('autoReadBtn'), folder: document.getElementById('folderBtn'), imp: document.getElementById('importBtn'),
    exp: document.getElementById('exportBtn'), models: document.getElementById('modelBtn'), teach: document.getElementById('teachBtn'),
    reset: document.getElementById('resetBtn'), help: document.getElementById('helpBtn'), live: document.getElementById('liveBtn'),
    boards: document.getElementById('boardsBtn'), packs: document.getElementById('packsBtn'),
  };

  function ccOpen() { return !ccEl.hasAttribute('hidden'); }
  function openCC() { ccEl.removeAttribute('hidden'); ccBtn.setAttribute('aria-pressed', 'true'); syncTiles(); }
  function closeCC() { ccEl.setAttribute('hidden', ''); ccBtn.setAttribute('aria-pressed', 'false'); }
  ccBtn.onclick = () => { if (ccOpen()) closeCC(); else openCC(); };
  addEventListener('keydown', (e) => { if (e.key === 'Escape' && ccOpen()) { closeCC(); e.preventDefault(); } });
  addEventListener('pointerdown', (e) => {
    if (!ccOpen()) return;
    if (ccEl.contains(e.target) || ccBtn.contains(e.target)) return;
    if (e.pointerType === 'touch' && palmHere()) return; // a palm on the glass is not a tap outside (V1-PLAN R6)
    closeCC();
  }, true);

  /** Every tile's face, from state. Cheap; called after anything a tile reports. */
  function syncTiles() {
    if (!ccEl) return;
    const s = session.getState();
    const zoomPct = document.getElementById('zoomPct');
    if (zoomPct) zoomPct.textContent = Math.round(view.zoom * 100) + '%';
    ui.tile(tiles.snap, 'snap', snapMode, { on: snapMode !== 'off', why: 'offer: a dashed ghost under a confident shape · auto: drawn clean as you draw · off' });
    const n = heldCandidates.length || snapOffers.size;
    if (tiles.snapNow) { tiles.snapNow.hidden = n === 0; ui.tile(tiles.snapNow, heldCandidates.length ? 'snap circled' : 'snap now', n ? String(n) : '', { why: 'redraw every confidently read shape clean; the ink stays underneath' }); }
    ui.tile(tiles.view, 'view', viewMode === 'canvas' ? 'canvas' : viewMode, { on: viewMode !== 'canvas', why: 'canvas, or every artifact as a card' });
    ui.tile(tiles.theme, 'theme', themeMode, { why: 'system follows the OS; light and dark are the same tokens inverted' });
    // The hand: which side of the pen tip the field opens on — and, once a pen has been seen here, what draws (V1-PLAN R6).
    ui.tile(tiles.hand, 'hand', handFace(hand, draws), draws
      ? { on: draws === 'pen', why: 'which side of the pen tip the field opens on, and what draws: the pen — a finger pans and pinches, and a palm on the glass is ignored — or a finger too. A tap changes one word' }
      : { why: 'which side of the pen tip the field opens on' });
    ui.tile(tiles.autoRead, 'auto-read', autoRead ? 'on' : 'off', { on: autoRead, why: 'read handwriting with a model as it is written; off asks only when you say read' });
    ui.tile(tiles.folder, folder.store ? (folder.how === 'git' ? 'repo' : folder.how === 'static' ? 'site' : 'folder') : 'folder', folder.store ? (folder.name || 'open') : 'open…', { on: !!folder.store, why: 'a folder is the canvas: its files are artifacts, your ink is saved beside them' });
    ui.tile(tiles.imp, 'import', '…', { why: 'photos from your library, a picture from the camera, or a file of a known kind — pictures are kept with the board and drawn on it, under your ink. Drop or paste works too' });
    ui.tile(tiles.exp, 'export', '…', { why: 'the board as SVG or PNG, or the session as its log' });
    const seated = agents.map((a) => modelWords(a)).concat(deciderHost() ? [deciderHost().name + ' (decider)'] : []);
    ui.tile(tiles.models, 'models', seated.length ? seated.join(', ') : 'none', { on: seated.length > 0, why: 'a model joins as a participant, in a seat if you give it one; it is asked only when you ask' });
    ui.tile(tiles.teach, 'mark', s.commandMark ? s.commandMark.name : 'check ✓', { on: !!s.commandMark, why: 'the mark that turns a circled group into a selection; teach your own' });
    ui.tile(tiles.reset, 'reset', 'fresh board', { why: 'a fresh board under the same name — what this one holds goes to the trash, from which it comes back whole' });
    ui.tile(tiles.help, 'help', '?', { why: 'how to use the canvas, on one page: draw, hold, choose — and models, boards, rooms, your mark, the shortcuts' });
    ui.tile(tiles.live, 'live', folder.how === 'live' ? folder.name : 'room…', { on: folder.how === 'live', why: 'a room other hands can join: between tabs on this machine, or across machines through a relay' });
    // Its face is the name of what is on screen (V1-PLAN R1); the pane is 22-boards.js.
    ui.tile(tiles.boards, 'boards', boardOnScreenName() || '…', { why: 'the boards this browser keeps — new, open, rename, duplicate, delete, and the trash — and the folders, repositories and sites opened lately' });
    // The library packs this board uses (V1-PLAN §2.3, B3), last in the grid; the pane is 23-packs.js.
    ui.tile(tiles.packs, 'packs', packsFace(s), { on: s.packs.length > 0, why: 'the library packs this board uses — premade definitions and notations, matched as if you had taught them; using one is an event in the board’s log, and undo takes it back' });
  }

  tiles.theme.onclick = () => setThemeMode(THEME_MODES[(THEME_MODES.indexOf(themeMode) + 1) % THEME_MODES.length]);
  // Reset is a fresh board, never one tap from losing this one (V1-PLAN R1): what the board on screen
  // holds goes to the trash, whole.
  if (tiles.reset) tiles.reset.onclick = () => { closeCC(); resetBoard(); };
  // Until a pen is seen it flips the side, as it always did; after, one word of its face a tap (07-hand.js, nextHand).
  tiles.hand.onclick = () => { const n = nextHand(hand, draws); if (n.draws !== draws) setDraws(n.draws); setHand(n.side); };
  tiles.autoRead.onclick = () => setAutoRead(!autoRead);
  // A live room: a name, and a relay when the other hand is on another machine.
  const livePanel = document.getElementById('livePanel');
  ui.pane(livePanel, 'live', () => closePanel(livePanel, tiles.live));
  tiles.live.onclick = () => { togglePanel(livePanel, tiles.live); if (!livePanel.hasAttribute('hidden')) { const r = document.getElementById('liveRoom'); if (!r.value) r.value = folder.how === 'live' ? folder.name : 'table'; document.getElementById('liveName').value = prefs.get('hand-name', '') || ''; } };
  // The room Claude Code joins (Demos/mcp.mjs, SURFACE-v10-PLAN D1) — room "claude" through the relay
  // on this machine, or the one typed — and the seat, in one act (V1-PLAN J4, 24-seat.js).
  document.getElementById('liveClaude').onclick = () => { withClaude(); };
  document.getElementById('liveJoin').onclick = () => {
    const room = document.getElementById('liveRoom').value.trim();
    const name = document.getElementById('liveName').value.trim();
    const relay = document.getElementById('liveRelay').value.trim();
    if (!room) { document.getElementById('liveStatus').textContent = 'a room needs a name'; return; }
    if (name) prefs.set('hand-name', name);
    openLive(room, relay ? { relay } : {}).then(() => { closePanel(livePanel, tiles.live); say('in room ' + room + ' as ' + handLabel(folder.me) + (relay ? ' through ' + relay : ' — other tabs on this machine can join')); syncTiles(); })
      .catch((err) => { document.getElementById('liveStatus').textContent = 'could not join: ' + (err.message || err); });
  };

  // Help is HELP.md, one page for a person — draw, hold, choose — read into a pane (PLAN-USER-SURFACE U1g).
  // It used to be the hand QA plan (QA-v8.md), a developer's test plan dated 6 Sep with server
  // commands; that stays in the repository, and HELP.md names it at its foot.
  const helpPanel = document.getElementById('helpPanel');
  ui.pane(helpPanel, 'help', () => closePanel(helpPanel, tiles.help));
  // It leads with the version this page is (V1-PLAN R7): the repository's VERSION, stamped into the
  // page by scripts/build-app.mjs, so the line holds offline and in the standalone file alike.
  const pageVersion = ((document.querySelector('meta[name="metamedium-version"]') || {}).content || '').trim();
  const helpVersion = document.getElementById('helpVersion');
  if (helpVersion) {
    helpVersion.textContent = !pageVersion ? 'MetaMedium — this page carries no version'
      : pageVersion === '0.0.0' ? 'MetaMedium 0.0.0 — no release has been cut yet' : 'MetaMedium ' + pageVersion;
  }
  let helpLoaded = false;
  tiles.help.onclick = () => {
    togglePanel(helpPanel, tiles.help);
    if (helpPanel.hasAttribute('hidden') || helpLoaded) return;
    const body = helpPanel.querySelector('.helpBody');
    body.textContent = 'loading…';
    fetch('../HELP.md', { cache: 'no-cache' }).then((r) => (r.ok ? r.text() : Promise.reject(new Error('HTTP ' + r.status)))).then((md) => { body.innerHTML = markdownToHtml(md); helpLoaded = true; })
      .catch((err) => { body.innerHTML = '<p>could not load HELP.md (' + esc(err.message || err) + ') — it is in the repository root.</p>'; });
  };
  /** Enough markdown for the help: headings, lists, bold, code, links. */
  function markdownToHtml(md) {
    const inline = (t) => esc(t)
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
      .replace(/\*([^*]+)\*/g, '<i>$1</i>')
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    const out = [];
    let list = null; // 'ul' | 'ol'
    let para = [];   // the lines of a paragraph, joined at the next blank line
    const closeList = () => { if (list) { out.push('</' + list + '>'); list = null; } };
    const closePara = () => { if (para.length) { out.push('<p>' + para.join(' ') + '</p>'); para = []; } };
    for (const raw of md.split('\n')) {
      const line = raw.replace(/\s+$/, '');
      const h = /^(#{1,3})\s+(.*)$/.exec(line);
      const li = /^\s*(?:[-*]|\d+\.)\s+(.*)$/.exec(line);
      const cont = /^\s{2,}(\S.*)$/.exec(line);
      if (h) { closeList(); closePara(); out.push('<h' + (h[1].length + 1) + '>' + inline(h[2]) + '</h' + (h[1].length + 1) + '>'); }
      else if (li) { closePara(); const kind = /^\s*\d+\./.test(line) ? 'ol' : 'ul'; if (list !== kind) { closeList(); list = kind; out.push('<' + kind + '>'); } out.push('<li>' + inline(li[1]) + '</li>'); }
      else if (cont && list) { out[out.length - 1] = out[out.length - 1].replace(/<\/li>$/, ' ' + inline(cont[1]) + '</li>'); }
      else if (!line.trim()) { closeList(); closePara(); }
      else if (/^---+$/.test(line)) { closeList(); closePara(); out.push('<hr>'); }
      else { closeList(); para.push(inline(line)); }
    }
    closeList(); closePara();
    return out.join('\n');
  }

  // Panes open under the bar, one at a time.
  const panes = [];
  function openPane(el, btn) {
    for (const p of panes) if (p.el !== el) closePanel(p.el, p.btn);
    if (!panes.some((p) => p.el === el)) panes.push({ el, btn });
    el.removeAttribute('hidden');
    if (btn) btn.setAttribute('aria-pressed', 'true');
    closeCC();
  }

// ===== minimap =====
// Provides: renderMinimap — the whole board in a corner with the viewport on it; a tap or a drag there pans (SURFACE-v10-PLAN F7).
// Uses: core (C), view (view, afterViewChange, union), render, input (palmHere).
// A fragment of one closure: Demos/build-surface.mjs concatenates surface/*.js
// in name order inside `(function () Ellipsis)();`. Shared state is the
// closure's; no imports, no exports, no build step beyond the concatenation.

  // ===== The minimap ========================================================
  // Every mark as a small rect, artifacts outlined, answers faint, and the
  // viewport as a box: where you are on the whole board. The map covers the
  // content AND the viewport, so panning off the drawing still shows the
  // drawing. Hidden while the board is empty.
  const minimapEl = document.getElementById('minimap');
  const MINI_W = 176, MINI_H = 108, MINI_PAD = 8;
  let mini = null; // { scale, ox, oy } of the last paint: world → map pixels

  /**
   * What the map shows, for one log (R4c): every mark's box and what it is,
   * and the box they fill. The map still shows the whole board — only the
   * reading of it is kept while the log stands; each paint draws the boxes
   * and the viewport again, where the view now puts them.
   */
  let miniSeen = { key: null, items: null, content: null };
  function miniItems(s) {
    const key = logKey();
    if (!paintReference && miniSeen.key === key) return miniSeen;
    // The seat's traffic is no card on the board, so no box here either (V1-PLAN J4).
    const said = s.explanations.filter((id) => { const n = s.nodes.get(id); return !!n && !MM.isSeatTraffic(n, s.nodes); });
    const arts = new Set(s.artifacts), answers = new Set(said);
    const items = [];
    // A region stands as its outline, under the marks it holds (I5).
    for (const r of s.regions.length ? regionsFor(s).list : []) items.push({ id: r.id, b: r.bounds, region: true });
    for (const id of s.contentIds.concat(said)) {
      const b = MM.boundsOf(s.nodes.get(id));
      if (b) items.push({ id: id, b: b, artifact: arts.has(id), answer: answers.has(id) });
    }
    const seen = { key: paintReference ? null : key, items: items, content: items.length ? union(items.map((x) => x.b)) : null };
    if (!paintReference) miniSeen = seen;
    return seen;
  }

  function renderMinimap(s) {
    if (!minimapEl) return;
    const seen = miniItems(s);
    if (!seen.items.length) { minimapEl.hidden = true; mini = null; return; }
    minimapEl.hidden = false;
    const dpr = window.devicePixelRatio || 1;
    if (minimapEl.width !== Math.round(MINI_W * dpr)) { minimapEl.width = Math.round(MINI_W * dpr); minimapEl.height = Math.round(MINI_H * dpr); }
    const vp = { minX: -view.panX / view.zoom, minY: -view.panY / view.zoom, maxX: (innerWidth - view.panX) / view.zoom, maxY: (innerHeight - view.panY) / view.zoom };
    const all = union([seen.content, vp]);
    const w = Math.max(1, all.maxX - all.minX), h = Math.max(1, all.maxY - all.minY);
    const scale = Math.min((MINI_W - MINI_PAD * 2) / w, (MINI_H - MINI_PAD * 2) / h);
    const ox = MINI_PAD + ((MINI_W - MINI_PAD * 2) - w * scale) / 2 - all.minX * scale;
    const oy = MINI_PAD + ((MINI_H - MINI_PAD * 2) - h * scale) / 2 - all.minY * scale;
    mini = { scale: scale, ox: ox, oy: oy };
    const g = minimapEl.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, MINI_W, MINI_H);
    const answerFill = 'rgba(' + C.goldRGB + ',0.35)';
    for (const it of seen.items) {
      const b = it.b;
      const x = ox + b.minX * scale, y = oy + b.minY * scale;
      const bw = Math.max(1.5, (b.maxX - b.minX) * scale), bh = Math.max(1.5, (b.maxY - b.minY) * scale);
      if (paintOps) recordOp({ kind: 'mini', id: it.id, box: boxOfRect(x, y, bw, bh), moved: true });
      if (it.region) { g.strokeStyle = 'rgba(' + C.labelRGB + ',0.85)'; g.lineWidth = 1; g.setLineDash([2, 2]); g.strokeRect(x + 0.5, y + 0.5, bw, bh); g.setLineDash([]); }
      else if (it.artifact) { g.strokeStyle = 'rgba(' + C.goldRGB + ',0.8)'; g.lineWidth = 1; g.strokeRect(x + 0.5, y + 0.5, bw, bh); }
      else { g.fillStyle = it.answer ? answerFill : C.inkFaint; g.fillRect(x, y, bw, bh); }
    }
    g.strokeStyle = C.ink; g.lineWidth = 1; g.setLineDash([]);
    g.strokeRect(ox + vp.minX * scale + 0.5, oy + vp.minY * scale + 0.5, Math.max(2, (vp.maxX - vp.minX) * scale), Math.max(2, (vp.maxY - vp.minY) * scale));
  }

  /** The world point under a pointer on the map. */
  function miniToWorld(e) {
    const r = minimapEl.getBoundingClientRect();
    const mx = (e.clientX - r.left) * (MINI_W / Math.max(1, r.width)), my = (e.clientY - r.top) * (MINI_H / Math.max(1, r.height));
    return { x: (mx - mini.ox) / mini.scale, y: (my - mini.oy) / mini.scale };
  }
  /** Pan so a world point is the centre of the screen. */
  function miniPanTo(w) {
    view.panX = innerWidth / 2 - w.x * view.zoom;
    view.panY = innerHeight / 2 - w.y * view.zoom;
    afterViewChange();
  }
  let miniDrag = false;
  if (minimapEl) {
    minimapEl.addEventListener('pointerdown', (e) => {
      if (!mini) return;
      // A heel resting in the corner while the pen writes is a palm, not a jump across the board (V1-PLAN R6).
      if (e.pointerType === 'touch' && palmHere()) { e.preventDefault(); return; }
      miniDrag = true;
      try { minimapEl.setPointerCapture(e.pointerId); } catch (err) { /* not capturable */ }
      miniPanTo(miniToWorld(e));
      e.preventDefault();
    });
    // A drag across the map pans once a frame, like any other pan (R4c).
    minimapEl.addEventListener('pointermove', (e) => { if (miniDrag && mini) { const w = miniToWorld(e); view.panX = innerWidth / 2 - w.x * view.zoom; view.panY = innerHeight / 2 - w.y * view.zoom; viewChanged(); } });
    const miniEnd = () => { miniDrag = false; };
    minimapEl.addEventListener('pointerup', miniEnd);
    minimapEl.addEventListener('pointercancel', miniEnd);
  }

// ===== boards (the pane) =====
// Provides: the boards pane under the bar (V1-PLAN §9 R1) — the boards this browser keeps, each with
//   when it last changed and roughly how big it is, the board on screen marked; New board, a board
//   from a log file, open, rename, duplicate, delete (to the trash), restore, and emptying the trash
//   said plainly before it happens; the folders, repositories and sites opened lately, by kind;
//   and the examples (V1-PLAN R5): a few boards made by the engine, each opened as a NEW board of
//   your own, a copy — the example is never written — and the empty board's panel start (the
//   starter, one tap; *more examples* opens this pane).
//   renderBoardsPane (the adapter calls it when the list changes), and at its foot how much room this browser
//   holds and has left and whether it may clear it (PLAN-IPAD-NOTES I3: loadRoom, roomChanged).
// Uses: the kept index and pictures (17-find.js: finder, findLoad, findThumbCurrent, findSyncSoon — a board's picture in its row),
//   ui (pane, chip), controls (tiles.boards, togglePanel/closePanel), boards list (boardRows,
//   sizeWords, storageWords, isKept), folder (the boards adapter: boards, board, onBoardHere, switchBoard, newBoard,
//   renameBoard, duplicateBoard, trashBoard, restoreBoard, planEmptyTrash, emptyTrash, boardFromFile,
//   rereadBoards, boardEntryName, exportLogNow, readLogText), input (flash, say), the
//   inspector's element (the panel's start), boards list (exampleUrl, exampleRows, exampleName, starterOf).
// A fragment of one closure: Demos/build-surface.mjs concatenates surface/*.js
// in name order inside `(function () { ... })();`. Shared state is the
// closure's; no imports, no exports, no build step beyond the concatenation.
//
// One pane among the others (one open at a time, under the bar), opened by the control centre's
// boards tile, whose face is the name of what is on screen. Every sentence the pane has stays in
// the pane — a refusal to leave a board that is not saved, what a delete did, what emptying the
// trash will take — as the model pane's does; the status line keeps its one sentence.

  const boardsPanel = document.getElementById('boardsPanel');
  const bdList = boardsPanel ? boardsPanel.querySelector('.bdList') : null;
  const bdStatus = document.getElementById('boardsStatus');
  const bdFile = document.getElementById('boardsFile');
  // What the pane holds between paints: the board whose name is being typed, the trash's sentence
  // while it stands, the pane's own line (and the act a "leave it anyway" would take again).
  const bd = { renaming: null, confirm: null, said: null };

  if (boardsPanel) ui.pane(boardsPanel, 'boards', () => closePanel(boardsPanel, tiles.boards));
  if (tiles.boards) {
    tiles.boards.onclick = () => {
      togglePanel(boardsPanel, tiles.boards);
      if (boardsPanel.hasAttribute('hidden')) return;
      bd.renaming = null; bd.confirm = null; bd.said = null;
      // What was kept of each board's look, and the board on screen drawn as it stands (Find, I6).
      findLoad().then(() => { findThumbCurrent(true); findSyncSoon(300); renderBoardsPane(); });
      paintBoardsPane();
      // Another tab may have changed the list, and what its boards hold, since this page read it.
      rereadBoards();
      loadExamples();
      loadRoom();
    };
  }

  // ----- The browser's room (PLAN-IPAD-NOTES I3) -------------------------------------------------------
  // `navigator.storage.estimate()` and `.persisted()`, read when the pane opens and again when the browser has
  // answered the ask (17-folder.js's askPersist), said at the foot by storageWords (17-boards.js). A browser
  // with neither says that, and nothing is guessed.
  const room = { state: 'idle', usage: undefined, quota: undefined, persisted: null };
  function loadRoom() {
    const st = typeof navigator !== 'undefined' ? navigator.storage : null;
    const ask = (f) => { try { return st && typeof st[f] === 'function' ? Promise.resolve(st[f]()).catch(() => undefined) : Promise.resolve(undefined); } catch (err) { return Promise.resolve(undefined); } };
    room.state = 'loading';
    return Promise.all([ask('estimate'), ask('persisted')]).then((got) => {
      const est = got[0] || {};
      room.usage = typeof est.usage === 'number' ? est.usage : undefined;
      room.quota = typeof est.quota === 'number' ? est.quota : undefined;
      room.persisted = typeof got[1] === 'boolean' ? got[1] : null;
      room.state = 'ready';
      renderBoardsPane();
    });
  }
  /** The browser answered the ask, or the boards changed under it: read the room again if the pane is showing it. */
  function roomChanged() {
    if (boardsPanel && !boardsPanel.hasAttribute('hidden')) loadRoom();
    else room.state = 'idle';
  }
  /** Installed to the Home Screen: iOS's own flag, else the display mode — the one place the page can tell. */
  function runsInstalled() {
    try { return navigator.standalone === true || (typeof matchMedia === 'function' && matchMedia('(display-mode: standalone)').matches); } catch (err) { return false; }
  }
  function roomEl() {
    return bdEl('p', 'bdStorage hint', room.state === 'ready' ? storageWords({ usage: room.usage, quota: room.quota, persisted: room.persisted, installed: runsInstalled() }) : 'reading how much room this browser keeps…');
  }

  /** The list changed (a record landed, another tab spoke): the pane again, if it stands — never under a name being typed. */
  function renderBoardsPane() {
    if (!boardsPanel || boardsPanel.hasAttribute('hidden') || bd.renaming) return;
    paintBoardsPane();
  }

  function bdEl(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined && text !== null) e.textContent = text;
    return e;
  }
  /** Children with a space between each, so the pane reads as words to a screen reader and to anything that reads its text. */
  function bdJoin(parent, parts) {
    parts.filter(Boolean).forEach((p, i) => { if (i) parent.appendChild(document.createTextNode(' ')); parent.appendChild(p); });
    return parent;
  }
  function bdButton(label, cls, data, why) {
    const b = bdEl('button', cls, label);
    b.type = 'button';
    for (const k of Object.keys(data || {})) b.dataset[k] = data[k];
    if (why) b.title = why;
    return b;
  }

  function boardRowEl(r) {
    const row = bdEl('div', 'bdItem' + (r.here ? ' here' : ''));
    row.dataset.id = r.id;
    if (r.here) row.dataset.here = '';
    // A small picture of the board (Find, PLAN-IPAD-NOTES I6): made when it was left, kept beside the index.
    const th = finder.thumbs.get(r.id);
    if (th) {
      const img = bdEl('img', 'bdThumb');
      img.src = th.src; img.alt = ''; img.width = 64; img.height = 43; img.decoding = 'async';
      row.classList.add('hasThumb');
      row.appendChild(img);
    }
    let name;
    if (bd.renaming === r.id) {
      name = bdEl('input', 'bdNameInput');
      name.value = r.name;
      name.maxLength = 80;
      name.dataset.nameInput = r.id;
      name.setAttribute('aria-label', 'the board’s name');
      name.spellcheck = false;
    } else name = bdButton(r.name, 'bdName', { open: r.id }, r.here ? 'the board on screen' : 'open this board');
    bdJoin(row.appendChild(bdEl('div', 'bdTop')), [name, r.here ? ui.chip('here', { cls: 'bdHere', why: 'the board on screen' }) : null]);
    row.appendChild(document.createTextNode(' '));
    row.appendChild(bdEl('div', 'bdMeta', [r.when, r.size].filter(Boolean).join(' · ')));
    row.appendChild(document.createTextNode(' '));
    bdJoin(row.appendChild(bdEl('div', 'bdActs')), [
      bdButton('rename', '', { rename: r.id }, 'a new name — the board keeps its id, so nothing it holds moves'),
      bdButton('duplicate', '', { dup: r.id }, 'a copy beside it, under its own id'),
      bdButton('delete', '', { trash: r.id }, 'to the trash — it comes back whole from there until the trash is emptied'),
    ]);
    return row;
  }
  function placeRowEl(r) {
    const row = bdEl('div', 'bdItem bdPlace');
    row.dataset.id = r.id;
    row.dataset.kind = r.k;
    bdJoin(row.appendChild(bdEl('div', 'bdTop')), [
      bdButton(r.name, 'bdName', { open: r.id }, 'open it again, the way its tile does'),
      ui.chip(r.kind, { cls: 'bdKind', why: 'what kind of place it is' }),
    ]);
    if (r.when) { row.appendChild(document.createTextNode(' ')); row.appendChild(bdEl('div', 'bdMeta', r.when)); }
    return row;
  }
  function trashRowEl(r) {
    const row = bdEl('div', 'bdItem bdGone');
    row.dataset.id = r.id;
    row.dataset.trashed = '';
    row.appendChild(bdEl('div', 'bdTop')).appendChild(bdEl('span', 'bdName', r.name));
    row.appendChild(document.createTextNode(' '));
    row.appendChild(bdEl('div', 'bdMeta', [r.when, r.size].filter(Boolean).join(' · ')));
    row.appendChild(document.createTextNode(' '));
    row.appendChild(bdEl('div', 'bdActs')).appendChild(bdButton('restore', '', { restore: r.id }, 'back onto the list, whole'));
    return row;
  }

  function paintBoardsPane() {
    if (!bdList) return;
    const stats = {};
    for (const [k, v] of boards.stats) stats[k] = v;
    const rows = boardRows([...boards.entries.values()], stats, Date.now(), onBoardHere() ? board.id : null);
    const frag = document.createDocumentFragment();
    const many = boards.how === 'indexeddb';
    const head = bdJoin(bdEl('div', 'bdHead'), [
      bdButton('New board', 'bdNew', { boardNew: '' }, 'a new, empty board — the one on screen stays as it is'),
      bdButton('from a file…', 'bdFrom', { boardFile: '' }, 'a board from a .zip made by export with its pictures, or from a log file — one event per line'),
    ]);
    if (!many) head.querySelectorAll('button').forEach((b) => { b.disabled = true; });
    frag.appendChild(head);
    if (!boards.ready) frag.appendChild(bdEl('p', 'hint', 'reading the boards this browser keeps…'));
    else if (boards.how === 'browser storage') frag.appendChild(bdEl('p', 'hint', 'this browser keeps one board here (it has no IndexedDB) — open a folder to keep more'));
    else if (boards.how !== 'indexeddb') frag.appendChild(bdEl('p', 'hint', 'this browser will not let the page keep boards (a private window, or site data blocked)'));
    const list = frag.appendChild(bdEl('div', 'bdBoards'));
    for (const r of rows.boards) list.appendChild(boardRowEl(r));
    frag.appendChild(examplesEl(many));
    if (rows.places.length) {
      const pl = frag.appendChild(bdEl('div', 'bdPlaces'));
      pl.appendChild(bdEl('div', 'bdLabel', 'recent places'));
      for (const r of rows.places) pl.appendChild(placeRowEl(r));
    }
    if (rows.trash.length || bd.confirm) {
      const tr = frag.appendChild(bdEl('div', 'bdTrash'));
      tr.appendChild(bdEl('div', 'bdLabel', 'trash · ' + rows.trash.length));
      for (const r of rows.trash) tr.appendChild(trashRowEl(r));
      const c = bd.confirm;
      if (c) {
        // Said before it happens; the second tap is its own act.
        const box = tr.appendChild(bdEl('div', 'bdConfirm'));
        box.appendChild(bdEl('p', '', c.words));
        const btns = [];
        if (c.gone.length) btns.push(bdButton(c.gone.length === 1 ? 'Delete it for good' : 'Delete them for good', 'bdDanger', { emptyConfirm: '' }, 'cannot be undone'));
        btns.push(bdButton(c.gone.length ? 'Keep them' : 'Close', '', { emptyCancel: '' }));
        bdJoin(box.appendChild(bdEl('div', 'bdConfirmRow')), btns);
      }
      // With nothing it could take yet (a board open elsewhere), asking again is the next move.
      if (rows.trash.length && (!c || !c.gone.length)) tr.appendChild(bdButton('Empty the trash…', 'bdEmpty', { emptyTrash: '' }, 'says what it will delete, and asks again'));
    }
    frag.appendChild(roomEl());
    bdList.replaceChildren(frag);
    paintBoardsSaid();
  }

  // ----- The examples (V1-PLAN R5) ---------------------------------------------------------------
  // The index is read once a page (and again while it has not been read), from boards/examples/, which
  // the service worker keeps for offline. Opening one reads its log and makes a board from its events
  // through the adapter's own door (newBoard) — a copy under an id of its own, named for the example, so
  // the example is never written and the hand draws on it at once.
  const examples = { state: 'idle', index: null, rows: [], loading: null, opening: false };
  function loadExamples() {
    if (examples.loading) return examples.loading;
    if (examples.state === 'ready') return Promise.resolve();
    examples.state = 'loading';
    examples.loading = fetch(exampleUrl('index.json'), { cache: 'no-cache' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('HTTP ' + r.status))))
      .then((index) => { examples.index = index; examples.rows = exampleRows(index); examples.state = examples.rows.length ? 'ready' : 'failed'; })
      .catch(() => { examples.index = null; examples.rows = []; examples.state = 'failed'; })
      .then(() => { examples.loading = null; renderBoardsPane(); });
    return examples.loading;
  }
  function examplesEl(many) {
    const box = bdEl('div', 'bdExamples');
    box.appendChild(bdEl('div', 'bdLabel', 'examples'));
    if (examples.state === 'idle' || examples.state === 'loading') box.appendChild(bdEl('p', 'hint', 'reading the examples…'));
    else if (examples.state === 'failed') box.appendChild(bdEl('p', 'hint', 'the examples could not be read — this page keeps them for offline once it has been online'));
    for (const r of examples.rows) {
      const row = bdEl('div', 'bdItem bdExample');
      row.dataset.example = r.id;
      const open = bdButton(r.name, 'bdName', { exampleOpen: r.id }, 'a new board of your own, made from this example — the example itself is never changed');
      if (!many) open.disabled = true;
      row.appendChild(bdEl('div', 'bdTop')).appendChild(open);
      row.appendChild(document.createTextNode(' '));
      row.appendChild(bdEl('div', 'bdMeta', [r.says, r.words].filter(Boolean).join(' · ')));
      box.appendChild(row);
    }
    return box;
  }
  /**
   * Open an example as a board of its own. Resolves the entry made, or false with the reason said
   * through `o.said` (the pane's line, or the status line's) — never thrown, never a board half made.
   */
  async function openExample(id, o) {
    o = o || {};
    const report = (v) => { const words = typeof v === 'string' ? v : v.words; if (o.said) o.said(v); else say(words); };
    if (examples.opening) return false;
    examples.opening = true;
    try {
      await loadExamples();
      const row = examples.rows.find((r) => r.id === id);
      if (!row) { report('the examples could not be read — this page keeps them for offline once it has been online'); return false; }
      let read = null;
      try {
        const res = await fetch(exampleUrl(row.file), { cache: 'no-cache' });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        read = readLogText(await res.text(), row.name);
      } catch (err) { report('could not read the “' + row.name + '” example (' + ((err && err.message) || err) + ') — it opens once this page has been online'); return false; }
      if (!read.events) { report(read.refused || 'the “' + row.name + '” example is not a board’s log'); return false; }
      const events = read.events;
      return await newBoard({ name: exampleName([...boards.entries.values()], row), events: events, force: !!o.force, said: o.said || ((v) => say(v.words)) });
    } finally { examples.opening = false; }
  }
  async function exampleFromPane(id, force) {
    paneSay(null);
    const made = await openExample(id, { force: !!force, said: (v) => paneSay(v, () => exampleFromPane(id, true)) });
    if (made) { closePanel(boardsPanel, tiles.boards); flash('“' + made.name + '” — a board of your own, made from the example; the example is as it was'); }
  }
  // The empty board's panel offers the starter in one tap, and more of them (10-inspector.js): its buttons carry no
  // data-act, so the panel's own handler never takes them for a mark's.
  inspectorEl.addEventListener('click', async (e) => {
    const b = e.target.closest && e.target.closest('button[data-example-start], button[data-example-more]');
    if (!b) return;
    if (b.hasAttribute('data-example-more')) { if (boardsPanel && boardsPanel.hasAttribute('hidden')) tiles.boards.onclick(); return; }
    await loadExamples();
    const id = starterOf(examples.index);
    if (!id) { say('the examples could not be read — this page keeps them for offline once it has been online'); return; }
    const made = await openExample(id);
    if (made) flash('“' + made.name + '” — a board of your own, made from the example; the board before stays in boards');
  });

  /** The pane's own line: what just happened, or why not — with the ways out as buttons in it. */
  function paneSay(v, retry) {
    bd.said = v ? (typeof v === 'string' ? { words: v, ways: [] } : { words: v.words, ways: v.ways || [] }) : null;
    if (bd.said) bd.said.retry = retry || null;
    paintBoardsSaid();
  }
  function paintBoardsSaid() {
    if (!bdStatus) return;
    bdStatus.replaceChildren();
    if (!bd.said) return;
    const parts = [document.createTextNode(bd.said.words)];
    for (const w of bd.said.ways) {
      if (w === 'export') parts.push(bdButton('export the log', 'bdWay', { leaveWay: 'export' }, 'the whole board on screen, as a file to keep'));
      else if (w === 'leave' && bd.said.retry) parts.push(bdButton('leave it anyway', 'bdWay', { leaveWay: 'leave' }, 'what was not saved is lost'));
    }
    bdJoin(bdStatus, parts);
  }

  async function openFromPane(id, force) {
    paneSay(null);
    const kept = isKept(boards.entries.get(id));
    const ok = await switchBoard(id, { force: !!force, said: (v) => paneSay(v, () => openFromPane(id, true)) });
    if (!ok) return;
    closePanel(boardsPanel, tiles.boards);
    if (kept && onBoardHere() && board.id === id) flash('“' + boardEntryName(id) + '” — ' + sizeWords(boards.stats.get(id)));
  }
  async function newFromPane(force) {
    paneSay(null);
    const made = await newBoard({ force: !!force, said: (v) => paneSay(v, () => newFromPane(true)) });
    if (made) { closePanel(boardsPanel, tiles.boards); flash('“' + made.name + '” — a new board; the one before stays in boards'); }
  }
  async function trashFromPane(id, force) {
    paneSay(null);
    const name = boardEntryName(id);
    const ok = await trashBoard(id, { force: !!force, said: (v) => paneSay(v, () => trashFromPane(id, true)) });
    if (ok) paneSay('“' + name + '” is in the trash — restore it below; it stays whole there until the trash is emptied');
  }

  if (boardsPanel) {
    boardsPanel.addEventListener('click', async (e) => {
      const b = e.target.closest && e.target.closest('button');
      if (!b || !boardsPanel.contains(b) || b.classList.contains('paneClose') || b.disabled) return;
      const d = b.dataset;
      try {
        if (d.open !== undefined) await openFromPane(d.open);
        else if (d.exampleOpen !== undefined) await exampleFromPane(d.exampleOpen);
        else if (d.boardNew !== undefined) await newFromPane();
        else if (d.boardFile !== undefined) { bdFile.value = ''; bdFile.click(); }
        else if (d.rename !== undefined) {
          bd.renaming = d.rename; bd.confirm = null;
          paintBoardsPane();
          const input = bdList.querySelector('input[data-name-input]');
          if (input) { input.focus(); input.select(); }
        } else if (d.dup !== undefined) {
          paneSay(null);
          const made = await duplicateBoard(d.dup);
          if (made) paneSay('“' + made.name + '” — a copy of “' + boardEntryName(made.from) + '”, beside it; the original is as it was');
        } else if (d.trash !== undefined) await trashFromPane(d.trash);
        else if (d.restore !== undefined) {
          const back = await restoreBoard(d.restore);
          if (back) paneSay('“' + back.name + '” is back on the list, whole');
        } else if (d.emptyTrash !== undefined) {
          paneSay(null);
          bd.confirm = await planEmptyTrash();
          paintBoardsPane();
        } else if (d.emptyCancel !== undefined) { bd.confirm = null; paintBoardsPane(); }
        else if (d.emptyConfirm !== undefined && bd.confirm) {
          const plan = bd.confirm;
          bd.confirm = null;
          const r = await emptyTrash(plan);
          paintBoardsPane();
          paneSay(r.gone.length
            ? r.gone.length + ' board' + (r.gone.length === 1 ? '' : 's') + ' deleted for good' + (r.kept.length ? ' — ' + r.kept.length + ' kept: open in another tab' : '')
            : 'nothing was deleted — what is in the trash is open in another tab');
        } else if (d.leaveWay === 'export') exportLogNow();
        else if (d.leaveWay === 'leave' && bd.said && bd.said.retry) { const again = bd.said.retry; paneSay(null); await again(); }
      } catch (err) {
        paneSay('that did not work — ' + ((err && err.message) || err));
      }
    });
    // Typing a name: Enter keeps it, Esc drops it, leaving the field keeps it. Keys stay in the field
    // (⌘Z in a name is not an undo on the board).
    bdList.addEventListener('keydown', (e) => {
      const input = e.target.closest && e.target.closest('input[data-name-input]');
      if (!input) return;
      e.stopPropagation();
      if (e.key === 'Enter') { e.preventDefault(); commitRename(input); }
      else if (e.key === 'Escape') { e.preventDefault(); bd.renaming = null; paintBoardsPane(); }
    });
    bdList.addEventListener('focusout', (e) => {
      const input = e.target.closest && e.target.closest('input[data-name-input]');
      if (input) commitRename(input);
    });
  }
  async function commitRename(input) {
    const id = input.dataset.nameInput;
    if (bd.renaming !== id) return;
    bd.renaming = null;
    const done = await renameBoard(id, input.value).catch(() => null);
    paintBoardsPane();
    if (done) paneSay('“' + done.name + '” — the same board under a new name; what it holds did not move');
  }
  if (bdFile) {
    bdFile.addEventListener('change', async () => {
      const f = bdFile.files && bdFile.files[0];
      if (!f) return;
      paneSay(null);
      const notes = [];
      const made = await boardFromFile(f, { said: (v) => paneSay(v), note: (n) => { notes.push(n); paneSay(n); } }).catch((err) => { paneSay('could not read “' + f.name + '” — ' + ((err && err.message) || err)); return false; });
      bdFile.value = '';
      if (made) { closePanel(boardsPanel, tiles.boards); flash('“' + made.name + '” — ' + sizeWords(boards.stats.get(made.id)) + ', from ' + f.name + (notes.length ? ' · ' + notes.join(' · ') : '')); }
    });
  }

// ===== packs (the pane) =====
// Provides: the library packs pane under the bar (V1-PLAN §2.3, §9 B3) — every pack this build ships
//   (never a test pack), each with what it adds, whether this board uses it, and *use* / *stop using*;
//   the packs this board names that this build lacks, said, with *stop using*. packsFace (the tile's
//   face), packShort and packSaid (how a match says its pack), renderPacksPane, packsHeard (the session's
//   listener, subscribed by the boot, which also has the pen follow the board's packs — MM.followPacks).
// Uses: ui (pane, chip), controls (tiles.packs, togglePanel/closePanel, syncTiles, ccOpen), input (say), palette (refreshPalette).
// A fragment of one closure: Demos/build-surface.mjs concatenates surface/*.js
// in name order inside `(function () { ... })();`. Shared state is the
// closure's; no imports, no exports, no build step beyond the concatenation.
//
// Using a pack is an EVENT in the board's log (`session.use`), never a device preference: a board
// replays with the same library everywhere, undo takes a use back, a room carries it. So the pane is
// only a door onto the log — it keeps nothing of its own, and reads what it shows from the state.

  const packsPanel = document.getElementById('packsPanel');
  const pkList = packsPanel ? packsPanel.querySelector('.pkList') : null;
  const pkStatus = document.getElementById('packsStatus');

  /** A pack as a match says it, short: `basics@1` → `basics`. */
  function packShort(ref) { return String(ref || '').split('@')[0]; }
  /** A pack as a tooltip says it: `the Basics pack (basics@1)`. */
  function packSaid(ref) {
    const p = MM.shippedPack(ref);
    return 'the ' + (p ? p.name : packShort(ref)) + ' pack (' + ref + ')';
  }
  /** The tile's face: the packs this board uses, short — or none; a name this build lacks shows as a question. */
  function packsFace(s) {
    const names = (s.packs || []).map(packShort).concat((s.packNotices || []).map((n) => n.pack + '?'));
    return names.length ? names.join(', ') : 'none';
  }

  /** What a pack adds, in a line: its definitions by name, its notation's symbols, its connectors. */
  function packHolds(p) {
    const parts = [];
    if (p.definitions.length) parts.push(p.definitions.map((d) => d.name).join(', '));
    if (p.notation) {
      const n = MM.notationById(p.notation);
      parts.push('the ' + (n ? n.name.toLowerCase() : p.notation) + ' notation' + (n ? ': ' + n.symbols.map((x) => x.name).concat(n.connectors.map((x) => x.name + 's')).join(', ') : ''));
    }
    if (p.connectors && p.connectors.length) parts.push(p.connectors.map((c) => c.name).join(', '));
    return parts.join(' · ');
  }

  if (packsPanel) ui.pane(packsPanel, 'packs', () => closePanel(packsPanel, tiles.packs));
  if (tiles.packs) {
    tiles.packs.onclick = () => {
      togglePanel(packsPanel, tiles.packs);
      if (!packsPanel.hasAttribute('hidden')) { pkSay(null); renderPacksPane(); }
    };
  }

  function pkEl(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined && text !== null) e.textContent = text;
    return e;
  }

  /** The pane again, when it stands: after a use, an undo, another hand's line, a board loaded in place. */
  function renderPacksPane() {
    if (!pkList || !packsPanel || packsPanel.hasAttribute('hidden')) return;
    const s = session.getState();
    const frag = document.createDocumentFragment();
    for (const p of MM.listedPacks()) {
      const ref = MM.packRef(p);
      const used = s.packs.includes(ref);
      const row = frag.appendChild(pkEl('div', 'pkItem' + (used ? ' used' : '')));
      row.dataset.pack = ref;
      const top = row.appendChild(pkEl('div', 'pkTop'));
      top.appendChild(pkEl('span', 'pkName', p.name));
      top.appendChild(document.createTextNode(' '));
      top.appendChild(ui.chip(ref, { cls: 'pkRef', why: 'its name and version — content under one name never changes' }));
      if (used) { top.appendChild(document.createTextNode(' ')); top.appendChild(ui.chip('in use', { cls: 'pkUsed', why: 'this board uses it: its log says so' })); }
      row.appendChild(pkEl('div', 'pkWhat', p.describes));
      const holds = packHolds(p);
      if (holds) row.appendChild(pkEl('div', 'pkHolds', holds));
      const b = row.appendChild(pkEl('button', '', used ? 'stop using' : 'use'));
      b.type = 'button';
      b.dataset[used ? 'unuse' : 'use'] = ref;
      b.title = used ? 'its definitions leave this board’s matching — an event in its log; undo brings them back'
        : 'this board uses it from now on — an event in its log: what it ships is matched here, attributed to it';
    }
    // What this board names that this build does not ship: said, never hidden, and it can be let go.
    for (const n of s.packNotices || []) {
      const row = frag.appendChild(pkEl('div', 'pkItem pkLost'));
      row.dataset.pack = n.pack;
      const top = row.appendChild(pkEl('div', 'pkTop'));
      top.appendChild(pkEl('span', 'pkName', n.pack));
      top.appendChild(document.createTextNode(' '));
      top.appendChild(ui.chip(n.reason === 'unknown' ? 'not in this build' : 'no pack’s name', { cls: 'pkRef', why: n.detail }));
      row.appendChild(pkEl('div', 'pkWhat', n.detail));
      const b = row.appendChild(pkEl('button', '', 'stop using'));
      b.type = 'button';
      b.dataset.unuse = n.pack;
      b.title = 'the board stops naming it — an event in its log';
    }
    pkList.replaceChildren(frag);
  }

  /** The pane's own line. */
  function pkSay(words) { if (pkStatus) pkStatus.textContent = words || ''; }

  if (packsPanel) {
    packsPanel.addEventListener('click', (e) => {
      const b = e.target.closest && e.target.closest('button');
      if (!b || !packsPanel.contains(b) || b.classList.contains('paneClose') || b.disabled) return;
      const d = b.dataset;
      if (d.use !== undefined) {
        const refused = session.use(d.use, Date.now());
        if (refused) { pkSay(refused.detail); return; }
        const p = MM.shippedPack(d.use);
        const what = p && p.definitions.length ? p.definitions.map((x) => x.name).join(', ') + ' matched here' : p && p.notation ? 'its notation’s ports on the pen' : 'in use';
        pkSay('this board uses ' + d.use + ' — ' + what + '; undo takes it back');
        say('using ' + packSaid(d.use) + ' — ' + what);
      } else if (d.unuse !== undefined) {
        session.unuse(d.unuse, Date.now());
        pkSay('this board no longer uses ' + d.unuse + '; undo brings it back');
        say('stopped using ' + d.unuse);
      }
      syncTiles();
      renderPacksPane();
    });
  }

  /**
   * The pane and the tile follow the board — a use undone, another hand's line, a board loaded in
   * place. A listener of the session's, subscribed by the boot after the journal and the paint (the
   * journal hears every change first, V1-PLAN R3).
   */
  let pkHeard = '';
  function packsHeard(s) {
    const now = s.packs.join(',') + '|' + s.packNotices.map((n) => n.pack).join(',');
    if (now === pkHeard) return;
    pkHeard = now;
    if (packsPanel && !packsPanel.hasAttribute('hidden')) renderPacksPane();
    if (ccOpen()) syncTiles();
    // A field open while the packs change offers what the board now knows its marks as (core re-reads the summon's matches).
    refreshPalette();
  }

// ===== seat =====
// Provides: the seat — Claude Code, over MCP, as a model the field asks (V1-PLAN J4): the models
//   pane's first section (seatSection: "Claude Code — in this room", one tap; or what to do, in a
//   sentence), joinSeat/leaveSeat, withClaude (the Live pane's "with Claude": the room and the seat
//   in one act), isSeatAgent (the reader's preference), seatRoomOpened (a room's presence followed),
//   seatState (for tests), and the door moved under "advanced".
// Uses: core (MM, prefs, esc), models (agents, join, leave, renderAgents, workControllers, addMcp,
//   syncProviderFields, the pane's elements), input (say), folder (folder, openLive, saveNow),
//   teach (closePanel), controls (livePanel, tiles, syncTiles).
// A fragment of one closure: Demos/build-surface.mjs concatenates surface/*.js
// in name order inside `(function () { ... })();`. Shared state is the
// closure's; no imports, no exports, no build step beyond the concatenation.

  // ===== The seat (V1-PLAN J4) ===============================================
  // John's question: can *Read the writing* and *What is this?* come straight
  // back to the Claude Code session he is talking to, over MCP, instead of
  // going out to an HTTP endpoint? The shard answered it for 3D (SHARD-3D-
  // PUSH-2 G5), and core now has it for the canvas (`participants/seat.ts`):
  // the seat is a model — the same prompts, the same parsers, the same propose
  // channel — whose questions are PARKED in the live room as briefs, answered
  // by the MCP hand (`Demos/mcp.mjs`: canvas_pending, canvas_answer) and paired
  // by the brief node's own id. Nothing is posted anywhere but the room, and the
  // seat holds no key.
  //
  // What is here is the surface's half: the seat is offered where a person
  // looks for Claude — first in the models pane, "Claude Code — in this room",
  // one tap, while a hand that answers at the seat is heard in the room; and
  // the Live pane's "with Claude" joins the room and takes the seat in one act.
  // A room with no such hand gets a sentence saying what to do. The door (an
  // MCP server of your own, through a bridge you start) stops posing as the way
  // to reach Claude: it stands under "advanced".
  //
  // Seated, it is a model like any other: it joins through `join` (so whatever
  // waits for a model to join runs for it too), takes the front of `agents`
  // (sitting down is a deliberate act that says *ask me*), and is the reader
  // while seated. A brief is sent to the room the moment it is parked, shown
  // working beside its marks, stopped by Esc like any model's call, and taken
  // back when given up on; its card is never drawn — the answer is.

  const CLAUDE_ROOM = 'claude';
  const CLAUDE_RELAY = 'http://127.0.0.1:8020';
  /** How recently a hand must have been heard to be in the room — the status line's own minute. */
  const HEARD_MS = 60000;
  /** What the status line says when the seat is taken. */
  const SEATED_SAID = 'Claude is here and will read for you — what you ask waits in this room until it answers';
  let seatAgent = null;   // the SeatParticipant, once made; seated while it is in `agents`
  let seatWanted = false; // "with Claude" asked for it: taken the moment Claude's hand is heard

  /** The seat, when it sits among the models. */
  function isSeatAgent(a) { return !!a && a === seatAgent; }
  function seated() { return !!seatAgent && agents.includes(seatAgent); }

  /** Why the seat cannot take a question on this page now, in one sentence — or null. */
  function whyNoSeat() {
    if (folder.how !== 'live' || !folder.store) {
      return 'Claude answers here once this page is in its room — tap “with Claude” in the live tile, or open this page with ?live=' + CLAUDE_ROOM + '&relay=' + CLAUDE_RELAY + '.';
    }
    if (!folder.relay) return 'This room is between tabs on this machine, and Claude’s hand reaches a room only through a relay — tap “with Claude” in the live tile.';
    if (MM.providerLocality({ baseUrl: folder.relay }) !== 'local') return 'This room’s relay is on another machine, and the seat asks only through a relay on this one — tap “with Claude” in the live tile.';
    return null;
  }

  /** The hand in this room that answers at the seat, heard in the last minute, as a person sees it — or null. */
  function claudeHere() {
    if (folder.how !== 'live' || !folder.store || !folder.store.presence) return null;
    const now = Date.now();
    const p = folder.store.presence().find((x) => x.seat && now - x.at < HEARD_MS);
    return p ? MM.handLabel(p.participant) : null;
  }

  /** Take the seat: a model that parks its questions in this room. Null, with the reason in the pane, where it cannot. */
  function joinSeat() {
    if (seated()) return seatAgent;
    const why = whyNoSeat();
    if (why) { mpStatus.textContent = why; renderSeat(); return null; }
    // The same seat while its join still stands on this board; a board left and come back to seats it anew.
    if (!seatAgent || !session.getState().participants.includes(seatAgent.id)) {
      seatAgent = MM.createSeatParticipant(session, Date.now(), { baseUrl: folder.relay, canPark: whyNoSeat, onChange: seatChanged });
    }
    if (!join(seatAgent.config, null, null, seatAgent)) return null;
    // The front: `agents` is who is asked, and sitting down here says *ask me*.
    agents.splice(agents.indexOf(seatAgent), 1);
    agents.unshift(seatAgent);
    renderAgents();
    renderSeat();
    return seatAgent;
  }

  /** Leave the seat: it stops being asked. What it is waiting on still settles, or is withdrawn from the pane. */
  function leaveSeat() {
    seatWanted = false;
    if (seated()) leave(seatAgent);
    renderSeat();
  }

  /** What happened to a brief: sent to the room the moment it is parked, and Esc reaches it. */
  function seatChanged(c) {
    const key = 'seat:' + c.brief.key;
    if (c.kind === 'parked') {
      // Sent now, not on the save's next beat: the hand is waiting for it.
      saveNow();
      // A call that came without a signal of its own is stopped by Esc all the same.
      if (!c.signalled) {
        const ctl = new AbortController();
        ctl.signal.addEventListener('abort', () => { if (seatAgent) seatAgent.cancel(c.brief.key, 'stopped'); });
        workControllers.set(key, ctl);
      }
    } else workControllers.delete(key);
    renderSeat();
  }

  /**
   * The Live pane's "with Claude": room "claude" through the relay on this
   * machine (or the one typed), and the seat — one act. Taken at once when
   * Claude's hand is heard; otherwise taken the moment it is, and said.
   */
  async function withClaude() {
    const relayEl = document.getElementById('liveRelay');
    const nameEl = document.getElementById('liveName');
    const statusEl = document.getElementById('liveStatus');
    const relay = (relayEl && relayEl.value.trim()) || CLAUDE_RELAY;
    if (relayEl) relayEl.value = relay;
    document.getElementById('liveRoom').value = CLAUDE_ROOM;
    const name = nameEl ? nameEl.value.trim() : '';
    if (name) prefs.set('hand-name', name);
    seatWanted = true;
    try {
      await openLive(CLAUDE_ROOM, { relay: relay });
    } catch (err) {
      seatWanted = false;
      if (statusEl) statusEl.textContent = 'could not join: ' + (err.message || err);
      return;
    }
    closePanel(livePanel, tiles.live);
    syncTiles();
    // Claude's hand is heard as the room answers the hello — a moment.
    for (let i = 0; i < 30 && !claudeHere(); i++) await new Promise((r) => setTimeout(r, 100));
    claimSeat();
    if (!seated()) say('in room “' + CLAUDE_ROOM + '” — Claude isn’t here yet: open Claude Code in this project and its hand joins this room; Claude takes the seat the moment it does');
  }

  /** "with Claude" asked for the seat: take it once Claude's hand is heard, and say so. */
  function claimSeat() {
    if (!seatWanted || seated() || !claudeHere()) return;
    if (joinSeat()) say(SEATED_SAID);
  }

  /** A room was joined (openLive): follow who is heard in it, for the pane and for a seat asked for. */
  function seatRoomOpened(store) {
    store.subscribe(() => {
      claimSeat();
      if (!panel.hasAttribute('hidden')) renderSeat();
    });
  }

  // ===== The models pane's first section ======================================
  const seatSection = document.createElement('div');
  seatSection.id = 'mpSeat';
  seatSection.className = 'mpSection mpLocal mpSeat';
  panel.insertBefore(seatSection, panel.querySelector(':scope > .mpSection'));

  function renderSeat() {
    const why = whyNoSeat();
    const here = claudeHere();
    let html = '<div class="mpHead"><span>Claude Code</span></div>';
    if (seated()) {
      const waiting = seatAgent.waiting();
      html += '<button class="model on" id="mpSeatLeave" title="it reads and answers for you here — tap to leave the seat"><span>Claude Code — seated</span><span class="why">tap to leave</span></button>';
      html += '<div class="note">' + esc(why ? why
        : here ? here + ' is in room “' + folder.name + '” — What is this?, Read the writing and ask: are parked here until it answers'
          : 'Claude’s hand is not in room “' + folder.name + '” just now — what you ask waits here until it comes back') + '</div>';
      for (const w of waiting) {
        html += '<div class="mpItem"><span>waiting: ' + esc(w.asked) + ' · ' + w.about.length + ' mark' + (w.about.length === 1 ? '' : 's') + '</span>' +
          '<button class="ghost" data-withdraw="' + esc(w.key) + '" title="take the question back — the hand will not be asked it">withdraw</button></div>';
      }
    } else if (why) {
      html += '<div class="note">' + esc(why) + '</div>';
    } else if (here) {
      html += '<button class="model" id="mpSeatJoin" title="one tap, and it reads the writing, says what things are and answers questions for you — every question parked in this room until it answers"><span>Claude Code — in this room</span><span class="why">tap to seat</span></button>';
      html += '<div class="note">' + esc(here + ' is here, and sees: seated, What is this?, Read the writing and ask: go to it') + '</div>';
    } else {
      html += '<div class="note">' + esc(folder.name === CLAUDE_ROOM
        ? 'Claude isn’t in this room yet — it joins whenever Claude Code is open in this project (its hand is node Demos/mcp.mjs), and is offered here the moment it is heard.'
        : 'Claude isn’t in room “' + folder.name + '” — its hand joins room “' + CLAUDE_ROOM + '”: tap “with Claude” in the live tile.') + '</div>';
    }
    seatSection.innerHTML = html;
    const join1 = seatSection.querySelector('#mpSeatJoin');
    if (join1) join1.onclick = () => { if (joinSeat()) say(SEATED_SAID); };
    const leave1 = seatSection.querySelector('#mpSeatLeave');
    if (leave1) leave1.onclick = () => leaveSeat();
    seatSection.querySelectorAll('[data-withdraw]').forEach((b) => {
      b.onclick = () => { if (seatAgent && seatAgent.cancel(b.dataset.withdraw, 'withdrawn from the models pane')) say('withdrawn — the hand will not be asked it'); };
    });
  }
  // Drawn whenever the pane opens, and whenever the list of models changes (a leave there leaves the seat too).
  new MutationObserver(() => { if (!panel.hasAttribute('hidden')) renderSeat(); }).observe(panel, { attributes: true, attributeFilter: ['hidden'] });
  let wasSeated = false;
  new MutationObserver(() => {
    const now = seated();
    if (wasSeated && !now) seatWanted = false;
    wasSeated = now;
    renderSeat();
  }).observe(mpList, { childList: true });
  renderSeat();

  // ===== The door, under "advanced" ===========================================
  // An MCP server of your own, reached through a bridge started in a terminal
  // (Demos/mcp-client.mjs) — a parsing method, not the way Claude answers here.
  // It left the key form, where it asked for a key it never needed.
  (function moveTheDoor() {
    const opt = mpProvider.querySelector('option[value="mcp"]');
    if (opt) { opt.remove(); syncProviderFields(); }
    const adv = document.createElement('details');
    adv.id = 'mpAdvanced';
    adv.className = 'mpSection mpLocal mpAdvanced';
    adv.innerHTML = '<summary>advanced</summary>' +
      '<div class="note">An MCP server (the door): a server of your own, through a bridge started in a terminal — node Demos/mcp-client.mjs -- node server.mjs. Not how Claude answers here: for Claude, see the top of this pane.</div>' +
      '<input id="mpDoorEndpoint" placeholder="http://127.0.0.1:8030 — the door" autocomplete="off" spellcheck="false" />' +
      '<input id="mpDoorName" placeholder="a name for it (optional)" autocomplete="off" spellcheck="false" />' +
      '<div class="mpRow"><button id="mpDoorKnock">Knock</button></div>';
    panel.appendChild(adv);
    adv.querySelector('#mpDoorKnock').onclick = () => {
      // The door reads the key form's two fields; it is handed them for the knock and they are put back after.
      const was = { endpoint: mpEndpoint.value, model: mpModel.value };
      mpEndpoint.value = adv.querySelector('#mpDoorEndpoint').value;
      mpModel.value = adv.querySelector('#mpDoorName').value;
      Promise.resolve(addMcp()).finally(() => { mpEndpoint.value = was.endpoint; mpModel.value = was.model; });
    };
  })();

  /** The seat as the page holds it, for tests. */
  function seatState() {
    return {
      seated: seated(),
      id: seatAgent ? seatAgent.id : null,
      name: MM.SEAT_NAME,
      here: claudeHere(),
      wanted: seatWanted,
      room: folder.how === 'live' ? folder.name : null,
      why: whyNoSeat(),
      waiting: seatAgent ? seatAgent.waiting() : [],
    };
  }

// ===== maths =====
// Provides: the maths on the board (DIRECTOR-PLAN-W2 M5; V1-PLAN A4) — mathsFor (the board's maths and what is
//   said of it, kept while the log stands), renderMaths (the chips beside a figure and a page, called by render),
//   mathsPanel (the panel's words and what stands behind details), mathsShow / mathsWrite / mathsPrint (the acts
//   only the surface does: leave the sizes showing, stand a sum on the board as text, print at true size), the
//   export pane's row (true-size.svg, print.html), and window.__mmMaths, the handle the e2e drives.
// Uses: core (MM.boardMathsOf, mathsChips, mathsSaid, evaluateTyped, trueSize, printTiled), render (logKey,
//   chipRect, roundRect, boxMeets, recordOp, paintReference, paintOps, nowMs, hoverId), text (typeText),
//   images (downloadText, exportPanel), input (say, flash), view (wpx).
// A fragment of one closure: Demos/build-surface.mjs concatenates surface/*.js
// in name order inside `(function () { ... })();`. Shared state is the
// closure's; no imports, no exports, no build step beyond the concatenation.

  // ===== What the board's numbers say ========================================
  // Core derives the numbers (`maths/`) and decides what is said and where
  // (`maths/board.ts`, in Node-tested data); this only draws it. The rules it
  // keeps are the plan's, and each is a place:
  //   - beside the figure, never on a card: a chip on each derived side, on a
  //     label that cannot hold, on each step's check;
  //   - for a moment after a change, while the hand points at the marks, and
  //     while the hand asked to see them (*Show the sizes*) — the ghost rule
  //     (v10 F4): a derived side does not stay forever. A chip that is a
  //     PROBLEM — a label that cannot hold, a written result that is off —
  //     stands, because it is worth a look at rest;
  //   - always in the panel, in units, with every value's formula behind details.
  // Everything is derived from the log: nothing here writes, and an undo takes
  // the chips back with the marks.
  const MATHS_MS = 6000;      // how long a changed chip shows: GHOST_MS's sibling
  const MATHS_PIN_MS = 60000; // how long *Show the sizes* keeps them, unless what they say changes
  let mathsGen = -1;          // the board generation the chips below were read under
  let mathsRead = { key: null, board: null, chips: [], sig: '' };
  const mathsSeen = new Map();      // chip key → its text as the log before this one said it
  const mathsChangedAt = new Map(); // chip key → when its text last changed
  let mathsPin = null;        // { ids, until, sig } — the marks whose chips *Show the sizes* left showing
  let mathsTimer = null;
  let mathsDrawn = [];        // this paint's chips, for tests: { key, kind, text, x, y, w, standing, ids }
  let mathsTrue = { board: null, doc: null };

  /** What the chips say, as one string: a change in it is a change in what is said. */
  const mathsSigOf = (chips) => chips.map((c) => c.key + '|' + c.text).join('\n');

  /**
   * The board's maths and the chips it says, for this log. Kept while the log
   * stands — the key every paint keeps what it derives by (`logKey`) — and what
   * changed since the log before is noted with the time, so a chip whose text
   * is new shows for a moment. The whole-board read (`paintReference`) keeps
   * nothing: it reads the board again, and must say what the kept one says.
   */
  function mathsFor(s) {
    if (paintReference) {
      const board = MM.boardMaths(s);
      const chips = board ? MM.mathsChips(board) : [];
      return { key: null, board: board, chips: chips, sig: mathsSigOf(chips) };
    }
    const key = logKey();
    if (mathsRead.key === key) return mathsRead;
    const board = MM.boardMathsOf(session);
    const chips = board ? MM.mathsChips(board) : [];
    const now = nowMs();
    let fresh = false;
    if (s.generation !== mathsGen) {
      // A board opened or replaced: nothing on it is new.
      mathsGen = s.generation;
      mathsChangedAt.clear();
      mathsPin = null;
    } else {
      for (const c of chips) if (mathsSeen.get(c.key) !== c.text) { mathsChangedAt.set(c.key, now); fresh = true; }
    }
    mathsSeen.clear();
    for (const c of chips) mathsSeen.set(c.key, c.text);
    mathsRead = { key: key, board: board, chips: chips, sig: mathsSigOf(chips) };
    // The moment ends by itself: paint again when it is over, or the chip would stay until the next stroke.
    if (fresh) { clearTimeout(mathsTimer); mathsTimer = setTimeout(() => render(session.getState()), MATHS_MS + 50); }
    return mathsRead;
  }

  /** Whether a chip shows now: a problem always; else for a moment after it changed, while the hand is on its marks, or while it was asked for. */
  function mathsShown(c, held, sig) {
    if (c.standing) return true;
    const at = mathsChangedAt.get(c.key);
    if (at !== undefined && nowMs() - at < MATHS_MS) return true;
    if (mathsPin && mathsPin.sig === sig && nowMs() < mathsPin.until && c.ids.some((id) => mathsPin.ids.has(id))) return true;
    return c.ids.some((id) => held.has(id));
  }

  /** A chip in the canvas, in the chrome's own size: quiet for an answer, gold for a problem. */
  function mathsPill(str, left, base, problem) {
    ctx.font = wpx(10.5).toFixed(2) + 'px ui-monospace, SFMono-Regular, Menlo, monospace';
    const w = ctx.measureText(str).width + wpx(14), h = wpx(17);
    roundRect(left, base - h, w, h, h / 2);
    ctx.fillStyle = `rgba(${C.panelRGB},0.92)`;
    ctx.fill();
    ctx.strokeStyle = problem ? C.gold : `rgba(${C.labelRGB},0.55)`;
    ctx.lineWidth = wpx(problem ? 1.6 : 1);
    ctx.stroke();
    ctx.fillStyle = problem ? C.gold : `rgba(${C.labelRGB},0.95)`;
    ctx.fillText(str, left + wpx(7), base - wpx(5));
  }

  /**
   * Where a step's line stands in its text, when the text FLOWS (a page of more than a few lines is set as
   * prose at a size the screen holds, its lines wherever the frame's own layout put them — not evenly down
   * the frame, which is all core knows): the middle of the line and the right end of its words, from the
   * frame's own document, in world units. Null when the text is fitted to its frame (its lines are evenly
   * spaced, as core says), or when the frame has not loaded yet — `pending` says so, and a paint follows.
   */
  function mathsLineBox(s, c, pending) {
    if (c.kind !== 'step' || c.ids.length !== 1) return null;
    const node = s.nodes.get(c.ids[0]);
    const rep = node && codeRepOf(node);
    if (!rep || rep.data.kind !== 'text' || rep.data.from === 'writing' || linesOf(rep.data.code) <= TEXT_FITS_LINES) return null;
    const b = MM.boundsOf(node), fr = MM.frameOf(node), f = frames.get(c.ids[0]);
    let pre = null;
    try { pre = f && f.iframe && f.iframe.contentDocument ? f.iframe.contentDocument.querySelector('pre.src') : null; } catch (err) { pre = null; }
    if (!b || !fr || !pre) { pending.now = true; return null; }
    // The row core put the chip beside: it divided the frame evenly among the text's rows.
    const rows = String(rep.data.code).replace(/\r\n/g, '\n').split('\n');
    const row = Math.min(rows.length - 1, Math.max(0, Math.floor((c.at.y - b.minY) / ((b.maxY - b.minY) / rows.length))));
    if (!rows[row].length) return null;
    let start = 0;
    for (let i = 0; i < row; i++) start += rows[i].length + 1;
    const end = start + rows[row].length;
    // The text nodes of the page, in order: the source is exactly what they say.
    const walk = pre.ownerDocument.createTreeWalker(pre, NodeFilter.SHOW_TEXT);
    const range = pre.ownerDocument.createRange();
    let acc = 0, from = false, to = false;
    for (let n = walk.nextNode(); n && !to; n = walk.nextNode()) {
      const len = n.nodeValue.length;
      if (!from && start < acc + len) { range.setStart(n, start - acc); from = true; }
      if (from && end <= acc + len) { range.setEnd(n, end - acc); to = true; }
      acc += len;
    }
    if (!from || !to) return null;
    const rects = [...range.getClientRects()].filter((r) => r.width > 0);
    if (!rects.length) return null;
    const first = rects[0];
    const right = Math.max(...rects.filter((r) => Math.abs(r.top - first.top) < 2).map((r) => r.right));
    return { x: fr.x + right + c.at.x - b.maxX, y: fr.y + (first.top + first.bottom) / 2 };
  }

  let mathsRetries = 0;
  /** The chips beside the figures and the page: those that show now, and reach the screen. */
  function renderMaths(s, ix, vb) {
    mathsDrawn = [];
    const m = mathsFor(s);
    syncMathsRow(m.board);
    if (!m.chips.length) return;
    const pending = { now: false };
    const held = new Set(s.selection);
    if (s.summon) for (const id of s.summon.enclosedIds) held.add(id);
    if (hoverId) held.add(hoverId);
    for (const c of m.chips) {
      if (!mathsShown(c, held, m.sig)) continue;
      // Where it stands is measured in the chrome's size; it is drawn when it reaches the screen.
      const size = chipRect(c.text, 0, 0);
      // Beside a side, just clear of it: off the point on the figure by as much as the chip reaches that way, and a little more.
      const reach = c.from && c.away ? Math.abs(c.away.x) * size.w / 2 + Math.abs(c.away.y) * size.h / 2 + wpx(9) : 0;
      const p = c.from && c.away ? { x: c.from.x + c.away.x * reach, y: c.from.y + c.away.y * reach } : mathsLineBox(s, c, pending) || c.at;
      const left = c.align === 'left' ? p.x : p.x - size.w / 2;
      const base = p.y + size.h / 2;
      const box = { minX: left, minY: base - size.h, maxX: left + size.w, maxY: base };
      if (vb && !boxMeets(box, vb)) continue;
      mathsPill(c.text, left, base, c.standing);
      mathsDrawn.push({ key: c.key, kind: c.kind, text: c.text, x: p.x, y: p.y, w: size.w, standing: c.standing, ids: c.ids.slice() });
      if (paintOps) recordOp({ kind: 'maths', id: c.key, text: c.text, box: boxOfRect(box.minX, box.minY, size.w, size.h), moved: false });
    }
    // A page whose frame has not loaded is measured when it has: a paint again, a few times, and no more.
    if (pending.now && mathsRetries < 12) { mathsRetries++; setTimeout(() => render(session.getState()), 150); } else if (!pending.now) mathsRetries = 0;
  }

  // ===== The panel: the answer in plain lines, every value's formula behind details =====
  /** What the panel says of some marks — the figure they belong to, the page a text is a line of — or null. */
  function mathsPanel(s, ids) {
    const m = mathsFor(s);
    const said = m.board ? MM.mathsSaid(m.board, ids) : null;
    if (!said) return null;
    let top = '';
    said.lines.forEach((l, i) => { top += '<div class="row"><span class="k">' + (i ? '' : 'maths') + '</span><span class="v">' + esc(l) + '</span></div>'; });
    let details = '';
    if (said.rows.length) {
      details += '<div class="sep"></div><div class="eyebrow">worked out</div>';
      said.rows.forEach((r) => {
        details += '<div class="row"><span class="k">' + esc(r.k) + '</span><span class="v">' + esc(r.v) + '</span></div>';
        if (r.why) details += '<div class="why">' + esc(r.why) + '</div>';
      });
    }
    return { top: top, details: details };
  }

  // ===== The acts only the surface does =====================================
  /** *Show the sizes*, *Check the steps*: say the answer, and leave the chips of those marks showing until what they say changes. */
  function mathsShow(d) {
    const m = mathsFor(session.getState());
    mathsPin = { ids: new Set(d.ids || []), until: nowMs() + MATHS_PIN_MS, sig: m.sig };
    say(d.say || 'the sizes are beside the figure');
  }

  /** `= 24 ÷ 3` and Enter: the words, result and all, stand on the board as text beside the marks held — one act, one undo. */
  function mathsWrite(sum, words) {
    const s = session.getState();
    const boxes = sum.enclosedIds.map((id) => MM.boundsOf(s.nodes.get(id))).filter(Boolean);
    const b = boxes.length ? union(boxes) : null;
    const at = b ? { x: b.maxX + wpx(24), y: b.minY } : screenToWorld(innerWidth / 2, innerHeight / 2);
    session.withTool('maths', () => typeText(at, words, { w: Math.max(150, words.length * 12), h: 34 }), 'sum');
    flash('put on the board as text: ' + words);
  }

  /** The figures on the board at their real size, as a new SVG built from the numbers — null when no figure has a unit. */
  function mathsTrueSize() {
    const board = mathsFor(session.getState()).board;
    if (!board) return null;
    if (mathsTrue.board !== board) mathsTrue = { board: board, doc: MM.trueSize(board) };
    return mathsTrue.doc.figures.length ? mathsTrue.doc : null;
  }

  /** The same, tiled onto pages at 100% with a measured test square on each: Letter, or A4 for a metric drawing. */
  function mathsPrintJob() {
    const doc = mathsTrueSize();
    if (!doc) return null;
    return MM.printTiled(doc, { paper: doc.unit === 'in' || doc.unit === 'ft' ? 'letter' : 'a4' });
  }

  function mathsPrint() {
    const job = mathsPrintJob();
    if (!job) { flash('nothing to print at true size — label a side, in inches or centimetres'); return; }
    if (job.error) { flash(job.error); return; }
    downloadText('print-true-size.html', job.html, 'text/html');
    flash('print-true-size.html — ' + job.pages.length + ' page' + (job.pages.length === 1 ? '' : 's') + ' at 100%; measure the ' + job.testSquare.text + ' square on each');
  }

  // ===== The export pane's row: the figure at its real size =================
  const mathsRow = document.createElement('div');
  mathsRow.className = 'exRow exMaths';
  mathsRow.innerHTML = '<button data-mathsout="svg">true-size.svg</button><button data-mathsout="print">print.html</button>';
  exportPanel.appendChild(mathsRow);
  const MATHS_WAITS = 'the figures at their real size — label a side, in inches or centimetres, and this draws it';
  const MATHS_SVG_TITLE = 'Every labelled figure drawn from its numbers at its real size: the root in paper inches or centimetres';
  const MATHS_PRINT_TITLE = 'The same tiled onto pages at 100%, a test square on each — a printer scales without saying so';
  let mathsRowState = null;
  /** The row is always there; it waits, and says why, until a figure has numbers and a unit. */
  function syncMathsRow(board) {
    const ok = !!board && board.figures.some((fm) => fm.drawing && fm.drawing.unit && fm.solution.readings.length);
    if (ok === mathsRowState) return;
    mathsRowState = ok;
    const [svgBtn, printBtn] = mathsRow.querySelectorAll('button');
    svgBtn.disabled = printBtn.disabled = !ok;
    svgBtn.title = ok ? MATHS_SVG_TITLE : MATHS_WAITS;
    printBtn.title = ok ? MATHS_PRINT_TITLE : MATHS_WAITS;
  }
  mathsRow.addEventListener('click', (e) => {
    const b = e.target.closest && e.target.closest('button[data-mathsout]');
    if (!b || b.disabled) return;
    if (b.dataset.mathsout === 'svg') {
      const doc = mathsTrueSize();
      if (!doc) { flash('nothing to draw at true size — label a side, in inches or centimetres'); return; }
      downloadText('true-size.svg', doc.svg, 'image/svg+xml');
      flash('true-size.svg — ' + doc.figures.length + ' figure' + (doc.figures.length === 1 ? '' : 's') + ' at real size, ' + doc.width + ' × ' + doc.height + ' ' + doc.unit);
    } else mathsPrint();
    closePanel(exportPanel, exportBtn);
  });

  // ===== For the e2e ========================================================
  window.__mmMaths = {
    // What the last paint drew: each chip, where it stands (its anchor in world units), whether it stands at rest.
    chipsDrawn: () => mathsDrawn.map((c) => Object.assign({}, c, { ids: c.ids.slice() })),
    // The moment is over: only what stands, what the hand is on and what was asked for shows.
    settle: () => { mathsChangedAt.clear(); mathsPin = null; render(session.getState()); },
    board: () => mathsFor(session.getState()).board,
    trueSizeSvg: () => { const d = mathsTrueSize(); return d ? d.svg : null; },
    printJob: () => { const j = mathsPrintJob(); return j ? { pages: j.pages.length, paper: j.paper, testSquare: j.testSquare.text, error: j.error || null } : null; },
  };

// ===== mermaid =====
// Provides: the surface's half of Mermaid (V1-PLAN §3, D2 and D3): mermaidPartNames (ink over a rendered diagram
//   lands on the marks it was written from), drawMermaidFrom (the host act of Draw it: a text drawn as ink beside
//   everything, selected and fitted, said in one sentence), the export pane's Mermaid row, mermaidImported (a
//   dropped .mmd held, so Draw it is at hand), and what a test asks (mermaidLast).
// Uses: core (MM.mermaidFor, MM.readMermaid, MM.drawMermaid), view (fitTo, view), render (say, flash, logKey),
//   handwriting (isRead), images (downloadText, exportPanel, exportBtn), artifacts (codeRepOf).
// A fragment of one closure: Demos/build-surface.mjs concatenates surface/*.js
// in name order inside `(function () { ... })();`. Shared state is the
// closure's; no imports, no exports, no build step beyond the concatenation.

  // ===== Ink over a rendered diagram =========================================
  // The frame reports each node as a part named for its MERMAID id (`stroke_7`);
  // which marks that node was written from is what the writer said of the board's
  // own marks when it wrote this text (`ids`, and `marks` for a symbol drawn with
  // several strokes). It is derived where it is asked — from the marks the tool
  // wrote it from, when this page knows them, else from the board — and only when
  // that reading says exactly this text: an edited text has no marks to name, and
  // its parts keep their Mermaid ids. Runtime, never the log.
  const mermaidMadeFrom = new Map(); // artifactId -> the marks it was made from, this sitting
  let mermaidNamed = { key: null, names: null };

  const boardMarksOf = (s) => s.contentIds.filter((id) => !s.artifacts.includes(id));
  const isReadMark = (s) => (id) => { const n = s.nodes.get(id); return !!n && isRead(n); };

  /** Mermaid id → the marks it stands for on this board, for one artifact's text; null when the text is no reading of the board's. */
  function mermaidNamesFor(artifactId) {
    const s = session.getState();
    const key = logKey() + '|' + artifactId;
    if (mermaidNamed.key === key) return mermaidNamed.names;
    const n = s.nodes.get(artifactId);
    const rep = n && codeRepOf(n);
    let names = null;
    if (rep && rep.data.kind === 'mermaid') {
      const made = (mermaidMadeFrom.get(artifactId) || []).filter((id) => s.nodes.has(id) && !s.artifacts.includes(id));
      for (const scope of [made, boardMarksOf(s)]) {
        if (scope.length < 2) continue;
        const said = MM.mermaidFor(s, scope, isReadMark(s));
        if (said && said.said.text === rep.data.code) { names = { ids: said.said.ids, marks: said.said.marks }; break; }
      }
    }
    mermaidNamed = { key: key, names: names };
    return names;
  }

  /** The names ink over one node of a diagram addresses: its marks — a symbol's stroke, a figure's strokes — or, with no marks to say, the Mermaid id. */
  function mermaidPartNames(artifactId, partId) {
    const names = mermaidNamesFor(artifactId);
    if (!names || !names.ids[partId]) return [partId];
    const id = names.ids[partId];
    return id.indexOf('figure:') === 0 ? (names.marks[partId] || [id]) : [id];
  }

  // ===== Draw it: a text drawn as ink ========================================
  const MERMAID_THINGS = { sequence: ['participant', 'participants'], 'uml-class': ['class', 'classes'] };
  const MERMAID_LINKS = { sequence: ['message', 'messages'] };
  const mermaidCount = (n, [one, many]) => n + ' ' + (n === 1 ? one : many);
  let mermaidDrawn = null;

  /** Where a drawing stands so it lands beside everything on the board and off the hand's way: right of every mark, at the board's top. */
  function mermaidOrigin(s, scale) {
    const boxes = s.contentIds.map((id) => MM.boundsOf(s.nodes.get(id))).filter(Boolean);
    if (!boxes.length) { const c = screenToWorld(innerWidth / 2, innerHeight / 2); return { x: c.x, y: c.y }; }
    const b = union(boxes);
    return { x: b.maxX + 80 * scale, y: b.minY };
  }

  /** What was drawn, in one sentence — and what was not: the lines a reader could not read, and what is drawn otherwise than written. */
  function mermaidSaid(name, drawn) {
    const notation = MM.notationById(drawn.notation);
    const called = notation ? notation.name : drawn.notation;
    const article = /^[A-Z]{2,}\b/.test(called) ? 'a ' + called : (/^[aeio]/i.test(called) ? 'an ' : 'a ') + called.toLowerCase();
    const nodes = Object.keys(drawn.ids).length;
    let out = drawn.bounds
      ? 'drew ' + article + ' from ' + name + ': ' + mermaidCount(nodes, MERMAID_THINGS[drawn.notation] || ['node', 'nodes']) + ' and ' + mermaidCount(drawn.links.length, MERMAID_LINKS[drawn.notation] || ['link', 'links'])
      : 'nothing was drawn from ' + name;
    const parts = [];
    if (drawn.refused.length) {
      const lines = drawn.refused.slice(0, 3).map((r) => 'line ' + r.line + (r.text ? ' “' + r.text.trim().slice(0, 40) + '”' : '') + ' (' + r.reason + ')');
      parts.push('not read: ' + lines.join(', ') + (drawn.refused.length > 3 ? ' and ' + (drawn.refused.length - 3) + ' more' : ''));
    }
    for (const note of drawn.notes) parts.push(note);
    if (parts.length) out += ' — ' + parts.join('; ');
    return out;
  }

  /**
   * The host act of *Draw it* (tools/mermaid-draw.ts names it): the artifact's text drawn as ink the engine reads
   * as the notation it was written in, at the zoom the hand works at, beside everything on the board — inside
   * the tool's stamp, so it is one act and one undo takes it all away. The drawn marks are selected and the view
   * fitted to them; what was left out or drawn otherwise is said, never thrown.
   */
  function drawMermaidFrom(artifactId) {
    const s = session.getState();
    const n = s.nodes.get(artifactId);
    const rep = n && codeRepOf(n);
    if (!rep || rep.data.kind !== 'mermaid') { flash('that is not a Mermaid text'); return null; }
    const scale = 1 / view.zoom;
    const origin = mermaidOrigin(s, scale);
    // Hundreds of events, one paint: the board is drawn when the diagram is all there.
    const drawn = holdPaint(() => MM.drawMermaid(session, rep.data.code, { at: Date.now(), scale: scale, origin: origin }));
    const marks = Object.values(drawn.ids).concat(drawn.links.flatMap((l) => l.ids));
    const name = (MM.wordOf(n) || 'the text').replace(/^.*\//, '');
    if (drawn.bounds) {
      // The text has done its part: its field closes, and what was drawn is what is held.
      const sum = session.getState().summon;
      if (sum) session.dismiss(sum.id, drawn.lastAt + 1);
      session.select(marks, drawn.lastAt + 2);
      fitTo(drawn.bounds);
    }
    const said = mermaidSaid(name, drawn);
    mermaidDrawn = { notation: drawn.notation, ids: Object.assign({}, drawn.ids), links: drawn.links.map((l) => ({ index: l.index, from: l.from, to: l.to, ids: l.ids.slice() })), marks: marks, notes: drawn.notes.slice(), refused: drawn.refused.map((r) => Object.assign({}, r)), bounds: drawn.bounds, said: said };
    say(said);
    return drawn;
  }

  /** What the last Draw it drew and said, for tests. */
  const mermaidLast = () => (mermaidDrawn ? Object.assign({}, mermaidDrawn) : null);

  /** A dropped or pasted .mmd is held where it landed, so Draw it is in the field at once — when a reader reads it; else it stands as text and says so. */
  function mermaidImported(artifactId, name) {
    const n = session.getState().nodes.get(artifactId);
    const rep = n && codeRepOf(n);
    if (!rep) return;
    const read = MM.readMermaid(rep.data.code);
    if (read.notation) {
      session.summonMarks([artifactId], Date.now());
      say(name + ': ' + mermaidCount(read.nodes.length, MERMAID_THINGS[read.notation] || ['node', 'nodes']) + ' of Mermaid — Draw it puts it on the board as marks');
    } else {
      const why = read.refused.length ? read.refused[0].reason : 'it is not a diagram the canvas reads';
      say(name + ' stands as text: the canvas cannot draw it yet — ' + why);
    }
  }

  // ===== The export pane's Mermaid row =======================================
  // Beside the board's three files, a fourth when what is held — or, holding
  // nothing, the board — reads as a notation the canvas can write in Mermaid:
  // the file it would write, named for the notation. The pane reads the board
  // again each time it opens; a board that reads as none has no such row.
  const exMermaid = document.getElementById('exMermaid');

  /** What the pane would write: the held marks' Mermaid when they read as a diagram, else the whole board's. */
  function mermaidToExport() {
    const s = session.getState();
    const board = boardMarksOf(s);
    const held = new Set(s.summon ? s.summon.enclosedIds : s.selection);
    const heldMarks = board.filter((id) => held.has(id));
    for (const [scope, marks] of [['held', heldMarks], ['board', board]]) {
      if (marks.length < 2) continue;
      const said = MM.mermaidFor(s, marks, isReadMark(s));
      if (said) return { scope: scope, said: said };
    }
    return null;
  }

  function refreshMermaidRow() {
    const got = mermaidToExport();
    exMermaid.hidden = !got;
    if (!got) return;
    const b = exMermaid.querySelector('button');
    b.textContent = got.said.reading.notation + '.mmd';
    b.title = (got.scope === 'held' ? 'The marks held' : 'The board') + ' as Mermaid text — ' + MM.describeNotation(got.said.reading);
  }
  exportBtn.addEventListener('click', refreshMermaidRow);
  exportPanel.addEventListener('click', (e) => {
    const b = e.target.closest && e.target.closest('button[data-export="mermaid"]');
    if (!b) return;
    const got = mermaidToExport();
    if (!got) { flash('nothing here reads as a diagram the canvas can write in Mermaid'); return; }
    const file = got.said.reading.notation + '.mmd';
    downloadText(file, got.said.said.text, 'text/plain');
    flash(file + ' — ' + MM.describeNotation(got.said.reading));
  });

// ===== find (the pane) =====
// Provides: the search field under the bar (PLAN-IPAD-NOTES I6) — one tap on *find*, or `/`, or ⌘K / Ctrl K (⌘F
//   too: the board has no page text for the browser's own find to look through) — a word typed is looked for on
//   EVERY board this browser keeps, as it is typed, and the boards that say it are listed, each hit as the words in
//   context (*“Pricing” — label on a box · Board “Q4 notes”*); a tap on one opens that board in place (the switch
//   the boards pane does) and takes the view to what was found, which is ringed for a moment. renderFind (the kept
//   index landed, or a board changed), openFind / closeFind, findOpenHit, findShow, findFlashState (for tests).
// Uses: ui (pane, esc), controls (openPane, closePanel, tiles), core (MM.searchBoards, describeHit, boundsOf,
//   getRep), the session, view (fitTo, view, worldToScreen), the boards adapter (board, boards, onBoardHere,
//   switchBoard), the kept index (finder, findBoards, findSync, findIdle, findIndexCurrent), the boards pane
//   (rereadBoards), input (say, flash).
// A fragment of one closure: Demos/build-surface.mjs concatenates surface/*.js
// in name order inside `(function () { ... })();`. Shared state is the closure's; no imports, no exports.
//
// SEARCHING IS READING. Nothing here writes an event: a tap opens a board and moves the view, as a tap on the
// boards pane's row does, and the ring that says where is drawn on a layer of its own over the canvas, never in
// the paint and never in the log. The query is asked of memory (17-find.js keeps what every board says), so it
// answers as it is typed; what is not yet indexed is read in the background and the list fills as it lands.

  const findBtn = document.getElementById('findBtn');
  const findPanel = document.getElementById('findPanel');
  const findInput = document.getElementById('findInput');
  const findStatusEl = document.getElementById('findStatus');
  const findList = findPanel ? findPanel.querySelector('.fdList') : null;
  /** What the pane holds between paints: the hit the keys are on, the boards shown whole. */
  const fd = { sel: 0, whole: new Set(), query: '' };
  /** A board shows this many hits until a tap on *more*. */
  const FIND_HITS = 5;
  /** The ring round what was found: how long it stays, and the least a find is shown at (a label is small; the view should not be a blob). */
  const FIND_FLASH_MS = 2600, FIND_MIN_W = 320, FIND_MIN_H = 220, FIND_AIR = 1.6;

  if (findPanel) ui.pane(findPanel, 'find', () => closeFind());
  const findOpen = () => !!findPanel && !findPanel.hasAttribute('hidden');
  function openFind() {
    if (!findPanel || EMBED) return;
    if (!findOpen()) openPane(findPanel, findBtn);
    findInput.focus();
    findInput.select();
    // What may have changed since: another tab's boards, this board's last stroke, boards never read.
    findIndexCurrent();
    rereadBoards().then(() => { findSync(); renderFind(); });
    renderFind();
  }
  function closeFind() {
    if (!findPanel) return;
    closePanel(findPanel, findBtn);
    if (document.activeElement === findInput) findInput.blur();
  }
  if (findBtn) findBtn.onclick = () => { if (findOpen()) closeFind(); else openFind(); };

  // ----- the list -------------------------------------------------------------------------------------------------
  function fdEl(tag, cls, text) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined && text !== null) e.textContent = text;
    return e;
  }
  /** The words of a hit with what matched marked, the way a person typing sees it. */
  function fdWords(h) {
    const out = fdEl('span', 'fdText');
    let at = 0;
    const text = h.text;
    out.appendChild(document.createTextNode('“'));
    for (const sp of h.spans || []) {
      if (sp[0] < at || sp[1] > text.length) continue;
      if (sp[0] > at) out.appendChild(document.createTextNode(text.slice(at, sp[0])));
      out.appendChild(fdEl('mark', '', text.slice(sp[0], sp[1])));
      at = sp[1];
    }
    if (at < text.length) out.appendChild(document.createTextNode(text.slice(at)));
    out.appendChild(document.createTextNode('”'));
    return out;
  }
  function fdHitEl(h) {
    const b = fdEl('button', 'fdHit');
    b.type = 'button';
    b.dataset.board = h.board;
    if (h.id) b.dataset.id = h.id;
    b.dataset.kind = h.kind;
    b.title = MM.describeHit(h);
    if (h.kind === 'board') { b.appendChild(fdEl('span', 'fdText', 'open this board')); b.appendChild(fdEl('span', 'fdWhat', ' — its name says it')); }
    else { b.appendChild(fdWords(h)); b.appendChild(fdEl('span', 'fdWhat', ' — ' + h.what)); }
    return b;
  }

  /** The list for what is typed: grouped by board, a board by its best hit, the words in context. */
  function renderFind() {
    if (!findPanel || !findList || !findOpen()) return;
    const q = findInput.value;
    fd.query = q;
    const kept = findBoards();
    const frag = document.createDocumentFragment();
    const hits = [];
    if (!/[\p{L}\p{N}]/u.test(q)) {
      findStatusEl.textContent = kept.length
        ? 'a word is looked for on every board you keep here — labels, names, typed text, figures, Mermaid, and what was read from writing'
        : 'there is no board here to look through yet';
    } else {
      const groups = MM.searchBoards(kept, q, { hitsPerBoard: 60 });
      for (const g of groups) {
        const box = fdEl('div', 'fdGroup');
        box.dataset.board = g.board;
        const here = onBoardHere() && board.id === g.board;
        const head = fdEl('div', 'fdHead');
        head.appendChild(fdEl('span', 'fdBoardName', g.name));
        if (here) head.appendChild(ui.chip('here', { cls: 'bdHere', why: 'the board on screen' }));
        box.appendChild(head);
        const shown = fd.whole.has(g.board) ? g.hits : g.hits.slice(0, FIND_HITS);
        for (const h of shown) { const el = fdHitEl(h); hits.push(el); box.appendChild(el); }
        const rest = g.hits.length - shown.length + g.more;
        if (rest > 0) {
          const m = fdEl('button', 'fdMore', rest + ' more on this board');
          m.type = 'button';
          m.dataset.whole = g.board;
          box.appendChild(m);
        }
        frag.appendChild(box);
      }
      const reading = finder.progress ? ' · reading the boards… ' + finder.progress.done + ' of ' + finder.progress.total : '';
      const n = kept.length;
      findStatusEl.textContent = groups.length
        ? groups.length + ' board' + (groups.length === 1 ? '' : 's') + ' of ' + n + ' say it' + reading
        : 'nothing on ' + (n === 1 ? 'the board' : n + ' boards') + ' says “' + q.trim() + '”' + reading;
    }
    findList.replaceChildren(frag);
    fd.sel = Math.min(fd.sel, Math.max(0, hits.length - 1));
    fdMark(hits);
  }
  /** The hit the keys are on. */
  function fdMark(hits) {
    (hits || [...findList.querySelectorAll('.fdHit')]).forEach((h, i) => h.classList.toggle('on', i === fd.sel));
  }

  if (findInput) {
    findInput.addEventListener('input', () => { fd.sel = 0; fd.whole.clear(); renderFind(); });
    findInput.addEventListener('keydown', (e) => {
      // Keys stay in the field: ⌘Z in a word is not an undo on the board.
      e.stopPropagation();
      const hits = [...findList.querySelectorAll('.fdHit')];
      if (e.key === 'Escape') { e.preventDefault(); closeFind(); }
      else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault();
        if (hits.length) { fd.sel = (fd.sel + (e.key === 'ArrowDown' ? 1 : hits.length - 1)) % hits.length; fdMark(hits); hits[fd.sel].scrollIntoView({ block: 'nearest' }); }
      } else if (e.key === 'Enter') {
        e.preventDefault();
        const h = hits[fd.sel] || hits[0];
        if (h) h.click();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K' || e.key === 'f' || e.key === 'F')) { e.preventDefault(); findInput.select(); }
    });
  }
  if (findList) {
    findList.addEventListener('click', (e) => {
      const more = e.target.closest && e.target.closest('button.fdMore');
      if (more) { fd.whole.add(more.dataset.whole); renderFind(); return; }
      const b = e.target.closest && e.target.closest('button.fdHit');
      if (b) findOpenHit({ board: b.dataset.board, id: b.dataset.id || null });
    });
  }

  // The keys: `/` where nothing is being typed, ⌘K and Ctrl K anywhere, ⌘F and Ctrl F too.
  addEventListener('keydown', (e) => {
    if (EMBED || e.altKey || e.defaultPrevented) return;
    const t = e.target;
    const typing = !!t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.tagName === 'SELECT' || t.isContentEditable);
    const k = (e.key || '').toLowerCase();
    if ((e.ctrlKey || e.metaKey) && (k === 'k' || k === 'f')) { e.preventDefault(); openFind(); }
    else if (e.key === '/' && !e.ctrlKey && !e.metaKey && !typing) { e.preventDefault(); openFind(); }
  });

  // ----- taking a hit ------------------------------------------------------------------------------------------------
  /**
   * Open the board a hit stands on — in place, through the switch the boards pane makes — and show where. A
   * hit's place is read again from the mark itself when the board is open (a mark moved since it was indexed is
   * found where it is); a mark that is gone leaves the board as it opens. Writes nothing.
   */
  async function findOpenHit(hit) {
    closeFind();
    const here = onBoardHere() && board.id === hit.board;
    if (!here) {
      const ok = await switchBoard(hit.board, { said: (v) => say(v.words) });
      if (!ok) return false;
    }
    if (!(onBoardHere() && board.id === hit.board)) return true;
    return findShow(hit);
  }
  /** The view on what was found, and a ring round it for a moment. False when there is nowhere to go (a board's own name). */
  function findShow(hit) {
    const st = session.getState();
    let b = null;
    if (hit.id) {
      const n = st.nodes.get(hit.id);
      if (n && !n.reps.some((r) => r.modality === 'erased')) b = MM.boundsOf(n);
    }
    if (!b || !MM.finiteBounds(b)) {
      // Indexed where it stood; the mark itself is the better word, and this is the hit's own.
      const held = finder.index.get(hit.board);
      const e = held && held.entries.find((x) => x.id === hit.id && x.box);
      b = e ? e.box : null;
    }
    if (!b || !MM.finiteBounds(b)) return false;
    const w = Math.max(b.maxX - b.minX, FIND_MIN_W), h = Math.max(b.maxY - b.minY, FIND_MIN_H);
    const cx = (b.minX + b.maxX) / 2, cy = (b.minY + b.maxY) / 2;
    fitTo({ minX: cx - (w * FIND_AIR) / 2, minY: cy - (h * FIND_AIR) / 2, maxX: cx + (w * FIND_AIR) / 2, maxY: cy + (h * FIND_AIR) / 2 });
    findRing(b);
    return true;
  }

  // The ring: a layer of its own over the canvas, pointer-transparent, drawn from the view each frame so it
  // follows a pan, and gone after FIND_FLASH_MS or at the next touch.
  let ring = null;
  function findRing(b) {
    if (!ring) {
      const cv = document.createElement('canvas');
      cv.id = 'findRing';
      cv.setAttribute('aria-hidden', 'true');
      document.body.appendChild(cv);
      ring = { cv, g: cv.getContext('2d'), box: null, at: 0, raf: 0 };
    }
    ring.box = { minX: b.minX, minY: b.minY, maxX: b.maxX, maxY: b.maxY };
    ring.at = performance.now();
    ring.cv.hidden = false;
    if (!ring.raf) ring.raf = requestAnimationFrame(ringTick);
  }
  function ringStop() {
    if (!ring) return;
    if (ring.raf) cancelAnimationFrame(ring.raf);
    ring.raf = 0; ring.box = null; ring.cv.hidden = true;
  }
  function ringTick(now) {
    if (!ring || !ring.box) return;
    ring.raf = 0;
    const t = now - ring.at;
    const dpr = window.devicePixelRatio || 1;
    const cv = ring.cv;
    if (cv.width !== Math.round(innerWidth * dpr) || cv.height !== Math.round(innerHeight * dpr)) { cv.width = Math.round(innerWidth * dpr); cv.height = Math.round(innerHeight * dpr); }
    const g = ring.g;
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.clearRect(0, 0, innerWidth, innerHeight);
    if (t >= FIND_FLASH_MS) { ringStop(); return; }
    const a = worldToScreen(ring.box.minX, ring.box.minY), z = worldToScreen(ring.box.maxX, ring.box.maxY);
    const pad = 10 + 4 * Math.sin(t / 160);
    const alpha = Math.min(1, (FIND_FLASH_MS - t) / 700);
    g.lineWidth = 2.5;
    g.strokeStyle = 'rgba(' + (C ? C.goldRGB : '201,168,76') + ',' + (0.95 * alpha).toFixed(3) + ')';
    g.beginPath();
    if (g.roundRect) g.roundRect(a.x - pad, a.y - pad, z.x - a.x + pad * 2, z.y - a.y + pad * 2, 10); else g.rect(a.x - pad, a.y - pad, z.x - a.x + pad * 2, z.y - a.y + pad * 2);
    g.stroke();
    ring.raf = requestAnimationFrame(ringTick);
  }
  addEventListener('pointerdown', (e) => { if (ring && ring.box && !(findPanel && findPanel.contains(e.target))) ringStop(); }, { capture: true, passive: true });
  /** For tests: whether the ring is up and the box it rings. */
  function findFlashState() { return { active: !!(ring && ring.box), box: ring && ring.box ? Object.assign({}, ring.box) : null }; }

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
    readLines: readLines, readPictureFrom: readPictureFrom, lastReads: () => readStats.map((r) => Object.assign({}, r)), readScopeHooks: readScopeHooks,
    inkImage: inkImage, readOne: readOne, readWriting: readWriting, askModelsAbout: askModelsAbout,
    // A hosted model asked, and why when it cannot be (V1-PLAN J5), for tests: the ask kept for a model, and each model's last call.
    keptAsk: () => (keptAsk ? { what: keptAsk.what, needs: keptAsk.needs } : null),
    // Seats per job (V1-PLAN I7), for tests: who holds each seat, which provider's key is held (never the key), who is asked to read and to write.
    seats: () => seatsNow(),
    lastCalls: () => agents.map((a) => ({ id: agentKey(a), model: a.config.model, line: callLine(lastCall.get(agentKey(a))) })),
    // Device preferences and the chrome, for tests: the theme, the hand, auto-read, the field's reader, the clip.
    themeMode: () => themeMode, setThemeMode: setThemeMode, hand: () => hand, setHand: setHand,
    // Find (PLAN-IPAD-NOTES I6), for tests: what is kept for each board, everything pending done, the ring round what was found.
    findState: findState, findIdle: findIdle, findFlashState: findFlashState, finderThumbs: () => [...finder.thumbs.keys()],
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
    // A call registered as at work and let go, with no model asked — for the status line's tests (U1b).
    beginWork: (key, ids, label) => beginWork(key, ids, label), endWork: (key) => endWork(key),
    // A hand's word on its own ink, for tests: where the last paint drew each label, and a mark's ink colour.
    labelsDrawn: () => labelsDrawn.map((l) => Object.assign({}, l)),
    // The routed connectors (V1-PLAN D7), for tests: where the last paint drew each route — the polyline on the board, its head, the ink faint beneath.
    routesDrawn: () => routesDrawn.map((r) => Object.assign({}, r)),
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
    // How many times the held marks were read for notations (N1): once while the log stands, shared by the field and the panel.
    notationReads: () => notationReadCount,
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
    importPictures: importPictures, importText: importText, exportBoardSVG: exportBoardSVG, exportLog: exportLog,
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


  // Pictures kept and drawn (PLAN-IPAD-NOTES I1), for tests: the asset store, what is decoded, what the last paint drew, what a pick said.
  Object.assign(window.__mm, {
    assets: assetList, collectAssets: collectAssets, setAssetGrace: (ms) => { assets.graceMs = ms; },
    pictureState: pictureState, forgetPictures: forgetPictures, picturesDrawn: () => drawnPictures.map((d) => Object.assign({}, d)),
    pickSaid: () => pickSaid.slice(), traceFrom: traceFrom,
  });

  // The board out and back whole (PLAN-IPAD-NOTES I4), for tests: each export as the pane makes it, the last file handed to the browser, a bundle read, a file opened as a board, pictures dropped from the store.
  Object.assign(window.__mm, {
    exportBundle: exportBundle, exportSvg: exportSvg, exportPng: exportPng, exportPdf: exportPdf, lastDownload: () => lastDownload, bundleProbe: bundleProbe,
    boardFromFile: boardFromFile, dropAssets: assetDrop,
  });

  // Mermaid (V1-PLAN D2, D3), for tests: the library a frame loads (a stand-in, or the CDN's again), what a frame said of itself, what Draw it drew.
  Object.assign(window.__mm, {
    mermaidFrom: mermaidFrom,
    mermaidState: (id) => (mermaidStates.has(id) ? Object.assign({}, mermaidStates.get(id)) : null),
    mermaidLast: mermaidLast,
  });

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
  // A spike, not the product (PLAN-IPAD-NOTES I8 step 5): `?spike=trocr` opens the page that tries TrOCR in the browser — a page of
  // its own beside this script, loading nothing until a tap on it. Only that query does anything.
  if (params.get('spike') === 'trocr') location.replace(new URL('spike-trocr.html', (document.currentScript && document.currentScript.src) || location.href).href);
})();
