// ===== kinds =====
// Provides: documentForKind (the renderers: every kind as a document ink can address), the mermaid harness (mermaidFrom, mermaidStates), postPointer (a hand forwarded into a playing frame), the worker runtime
//   (a blessed `js` artifact's code runs in a worker with a budget; a throw or a hang pauses its clock
//   with the reason), runtimeOffset, runtimeBroken, syncRuntime, the consent gate (trackConsent, consentedHere,
//   grantPlayingPrograms, ownPlayStands — this tab runs a program only when this hand played that very code here, C1), frameCSP (a run or
//   mermaid frame cannot fetch, open a socket or beacon), frameLoaded (one that navigates itself is stopped), WORKER_HARDEN (the js worker keeps only Math/performance/Function/postMessage).
// Uses: core (session, esc), artifacts (frames, documentFor), render (render), the first hour (27-first.js: motionReduced —
//   under reduced motion an example's program is not granted, and waits for the person's own play).
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

  // ===== A program's frame cannot connect out, and reads no key (C6) =======
  // run and mermaid frames are opaque-origin sandboxes: they cannot reach the
  // page, its storage or its keys. But they can still `fetch` — under the
  // app's own CSP that reaches the allowlisted hosts — so a program drawn by
  // someone else could beacon out. A CSP meta inside the srcdoc closes it:
  // `connect-src 'none'` (no fetch, XHR, WebSocket, EventSource or beacon),
  // and nothing loads but what the frame actually needs — the pinned library
  // by <script>, the launch film's video and the frame's own data: assets.
  // The library host is derived from the URLs the frame is given, so a test's
  // stand-in library (served from the gate's own origin) still loads and the
  // CDNs stay in one home. img/media are held to the page's own origin and
  // data:/blob:, so no <img> or <video> GET can beacon to a stranger either.
  // What no CSP here governs is a navigation: a program may set its own
  // frame's location, and a GET leaves with whatever it puts in the address.
  // So the frame can read nothing of the page worth carrying — its origin is
  // opaque, and its base URL is the page's <base>, the address less the
  // fragment where a room's key lives (00-core.js, `pinBase`) — and a frame
  // that loads another page is stopped where it stands (`frameLoaded`).
  function originOf(u) { try { return new URL(u, location.href).origin; } catch (e) { return null; } }
  function frameCSP(scriptUrls) {
    const self = location.origin && location.origin !== 'null' ? location.origin : '';
    const hosts = {};
    for (const u of scriptUrls || []) { const o = originOf(u); if (o && o !== 'null') hosts[o] = 1; }
    if (self) hosts[self] = 1;
    const script = Object.keys(hosts).join(' ');
    const sameAssets = (self ? self + ' ' : '') + 'data: blob:';
    const content =
      "default-src 'none'; " +
      'script-src ' + (script ? script + ' ' : '') + "'unsafe-inline' 'unsafe-eval' blob:; " +
      "style-src 'unsafe-inline'; " +
      'img-src ' + sameAssets + '; ' +
      'media-src ' + sameAssets + '; ' +
      'font-src ' + sameAssets + '; ' +
      "connect-src 'none'; " +
      'worker-src blob:; ' +
      "base-uri 'none'; form-action 'none'";
    return '<meta http-equiv="Content-Security-Policy" content="' + content.replace(/"/g, '&quot;') + '">';
  }
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

  /**
   * The first thing a program's or a diagram's document does, in its head: say it is here (`doc`). A frame element
   * loads its own document once, so a load that no such word came before is the frame navigating itself
   * (`frameLoaded`) — and a load before the document's first word (an engine's empty page as the element goes in) is
   * not counted at all.
   */
  function frameHello(id) {
    return '<script>parent.postMessage({ mm: true, id: ' + JSON.stringify(String(id)).replace(/<\//g, '<\\/') + ', type: "doc" }, "*");<\/script>';
  }

  /** The program in its harness: a clear frame that runs the code and reports its parts. */
  function runDocument(id, code, w, h) {
    const safe = (s) => JSON.stringify(String(s)).replace(/<\//g, '<\\/');
    const script = RUN_HARNESS.replace('__W__', Math.round(w)).replace('__H__', Math.round(h)).replace('__ID__', safe(id)).replace('__CODE__', safe(code)).replace('__THREE__', JSON.stringify(THREE_CDN));
    return '<!doctype html><html><head><meta charset="utf-8">' + frameCSP([THREE_CDN]) + frameHello(id) + '<style>html,body{margin:0;background:transparent;overflow:hidden;width:' + Math.round(w) + 'px;height:' + Math.round(h) + 'px}</style>' +
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
    return '<!doctype html><html><head><meta charset="utf-8">' + frameCSP(mermaidSourcesNow()) + frameHello(id) + '<style>' + css + '</style></head><body>' +
      '<div id="mmroot"><pre id="src">' + esc(text) + '</pre><p id="note" hidden></p><div id="out" hidden></div></div>' +
      '<script>' + script + '<\/script></body></html>';
  }

  // What a running frame says: its parts, or that it broke.
  addEventListener('message', (e) => {
    const m = e.data;
    if (!m || m.mm !== true || typeof m.id !== 'string') return;
    const f = frames.get(m.id);
    if (!f || !f.iframe || f.iframe.contentWindow !== e.source) return; // only the frame that owns the id
    if (m.type === 'doc') { f.iframe.__mmSaidHere = true; return; } // its own document, beginning (`frameHello`)
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

  // A behaviour runs arbitrary code, and needs NONE of the web platform — it
  // returns a force from a world object — so the worker is sealed in two
  // independent ways, either of which alone stops a `js` artifact opening the
  // person's boards or phoning out (C1, C6):
  //
  //  1. It runs in an OPAQUE-ORIGIN sandboxed iframe (ensureWorker) carrying a
  //     strict CSP (`WORKER_HOST_CSP`): `connect-src 'none'` kills fetch, XHR,
  //     WebSocket, EventSource and a beacon; `script-src` names no network host
  //     (only inline, eval and blob:), so `import('https://host/?data=…')` — a
  //     GET governed by script-src, which a denylist of globals can never reach
  //     because it is syntax, not a property — is refused; and the null origin
  //     makes `indexedDB` throw, so `mm-boards` is unreachable. The blob worker
  //     inherits the frame's CSP, so this is a real wall even on a dev origin
  //     with no page CSP of its own.
  //  2. Before any code loads, the worker string also strips network, storage,
  //     channels and nested workers at every place each lives (`WORKER_HARDEN`):
  //     the prototype chain of the global AND the global name, each a throwing
  //     getter, so prototype-walking, the Function constructor and shadowing all
  //     hit the same wall; `URL.createObjectURL` goes too. It cannot block
  //     `import()`/`eval` (realm syntax), which is why the CSP above is the
  //     primary wall and this is defence in depth — but it holds in any engine,
  //     and keeps only Math, performance, Function, postMessage.
  const WORKER_HARDEN = [
    '(function(){',
    '  var G = self;',
    '  var gone = ["fetch","XMLHttpRequest","WebSocket","EventSource","importScripts","Worker","SharedWorker","ServiceWorker","BroadcastChannel","MessageChannel","indexedDB","caches","navigator","openDatabase","WebTransport","RTCPeerConnection","Notification","PushManager"];',
    '  function deny(name){ return function(){ throw new Error(name + " is not available to a behaviour"); }; }',
    '  function seal(obj, name){ try { Object.defineProperty(obj, name, { configurable: false, enumerable: false, get: deny(name) }); return true; } catch (e) { try { delete obj[name]; return true; } catch (e2) { try { obj[name] = undefined; } catch (e3) {} return false; } } }',
    '  for (var i = 0; i < gone.length; i++){',
    '    var n = gone[i];',
    '    var p = G;',
    '    while (p){ if (Object.prototype.hasOwnProperty.call(p, n)) seal(p, n); p = Object.getPrototypeOf(p); }',
    '    seal(G, n);',
    '  }',
    '  try { if (G.URL && G.URL.createObjectURL) G.URL.createObjectURL = deny("URL.createObjectURL"); } catch (e) {}',
    '  try { if (G.URL && G.URL.revokeObjectURL) G.URL.revokeObjectURL = function(){}; } catch (e) {}',
    '})();',
  ].join('\n');

  const WORKER_SRC = [
    WORKER_HARDEN,
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
    worker: null,        // the opaque-origin iframe hosting the behaviour worker
    nonce: '',           // tags messages to/from that host, so no other frame is heard
    ready: false,        // the host said its worker is up
    outbox: [],          // messages posted before the host was ready, flushed on ready
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

  // The CSP the behaviour worker runs under (its host iframe's): no network of
  // any kind (`connect-src 'none'`), no module may load from any host
  // (`script-src` names none, so `import()` is refused), nothing but the inline
  // bootstrap, eval (the host compiles the behaviour with `new Function`) and
  // the worker blob. The blob worker inherits this, so it holds on a dev origin
  // that carries no page CSP of its own.
  const WORKER_HOST_CSP =
    "default-src 'none'; script-src 'unsafe-inline' 'unsafe-eval' blob:; connect-src 'none'; worker-src blob:; base-uri 'none'; form-action 'none'";

  // The host document: an opaque-origin sandboxed iframe (allow-scripts, no
  // allow-same-origin) that makes the real worker from a blob and relays
  // messages to and from the page, each tagged with a per-host nonce. Because
  // it is opaque-origin the worker's `indexedDB` throws, and because of the CSP
  // it cannot reach the network at all.
  function workerHostDoc(nonce) {
    return '<!doctype html><html><head><meta charset="utf-8">' +
      '<meta http-equiv="Content-Security-Policy" content="' + WORKER_HOST_CSP.replace(/"/g, '&quot;') + '">' +
      '</head><body><script>' +
      'var WSRC=' + JSON.stringify(WORKER_SRC).replace(/<\//g, '<\\/') + ';' +
      'var N=' + JSON.stringify(nonce) + ';' +
      'var w=new Worker(URL.createObjectURL(new Blob([WSRC],{type:"text/javascript"})));' +
      'w.onmessage=function(e){parent.postMessage({__mmw:N,m:e.data},"*");};' +
      'w.onerror=function(e){parent.postMessage({__mmw:N,err:(e&&e.message)||"error"},"*");};' +
      'onmessage=function(e){var d=e.data;if(!d||d.__mmw!==N)return;if(d.kill){try{w.terminate();}catch(_){}return;}w.postMessage(d.m);};' +
      'parent.postMessage({__mmw:N,ready:true},"*");' +
      '<\/script></body></html>';
  }

  // The page hears the host once, by the host window's identity AND its nonce,
  // so a run or mermaid frame posting the same shape is never taken for it.
  addEventListener('message', (e) => {
    const host = runtime.worker;
    if (!host || !host.contentWindow || e.source !== host.contentWindow) return;
    const d = e.data;
    if (!d || d.__mmw !== runtime.nonce) return;
    if (d.ready) { runtime.ready = true; const q = runtime.outbox; runtime.outbox = []; for (const m of q) workerPost(m); return; }
    if (d.err) { flash('runtime: ' + (d.err || 'error')); return; }
    if (d.m) onWorkerMessage(d.m);
  });

  /** Post to the behaviour worker through its host, or queue it until the host is up. */
  function workerPost(m) {
    const host = runtime.worker;
    if (host && runtime.ready && host.contentWindow) host.contentWindow.postMessage({ __mmw: runtime.nonce, m: m }, '*');
    else runtime.outbox.push(m);
  }

  function ensureWorker() {
    if (runtime.worker) return runtime.worker;
    runtime.nonce = 'w' + Date.now().toString(36) + Math.random().toString(36).slice(2);
    runtime.ready = false;
    runtime.outbox = [];
    const host = document.createElement('iframe');
    host.setAttribute('sandbox', 'allow-scripts');
    host.setAttribute('aria-hidden', 'true');
    host.style.cssText = 'position:absolute;width:0;height:0;border:0;left:-9999px;top:-9999px;';
    host.srcdoc = workerHostDoc(runtime.nonce);
    (document.body || document.documentElement).appendChild(host);
    runtime.worker = host;
    runtime.loaded.clear();
    return host;
  }

  /** Drop the host iframe and forget: after a hang, nothing it held can be trusted. */
  function dropWorker() {
    const host = runtime.worker;
    if (host) { try { if (host.contentWindow) host.contentWindow.postMessage({ __mmw: runtime.nonce, kill: true }, '*'); } catch (e) {} try { host.remove(); } catch (e) {} }
    runtime.worker = null;
    runtime.ready = false;
    runtime.outbox = [];
    runtime.loaded.clear();
    for (const t of runtime.pending.values()) clearTimeout(t);
    runtime.pending.clear();
  }

  /**
   * A frame's document is there: sized for the screen — and, for a program's or a diagram's frame, judged. Each frame
   * element loads its own document once (a document that changes gets a new element, `syncStage`), and that document
   * says so as it begins (`frameHello`), so a load after it that no such word came before is the frame navigating
   * itself: the one way out a frame's CSP cannot shut (a navigation is not a connection). It
   * carried nothing of the page — the page's <base> holds no fragment (`pinBase`) and a frame's origin is opaque — but
   * a frame that leaves for another page is stopped where it stands, given its own document back, and said.
   */
  function frameLoaded(id, iframe) {
    sizeFramesToScreen();
    const f = frames.get(id);
    if (!f || f.iframe !== iframe || (f.kind !== 'run' && f.kind !== 'mermaid')) return;
    // Its own document said it was here before this load: this is that document's load.
    if (iframe.__mmSaidHere) { iframe.__mmSaidHere = false; iframe.__mmOwnLoaded = true; return; }
    // A load before its own document said a word — an engine's empty page as the element went in, or a still card
    // that runs nothing — is not a navigation.
    if (!iframe.__mmOwnLoaded) return;
    f.codeAt = 'left'; // the next paint gives it a fresh element and its own document
    const node = state.nodes.get(id);
    const name = (node && MM.wordOf(node)) || (f.kind === 'mermaid' ? 'the diagram' : 'the program');
    if (f.kind === 'mermaid') { flash(name + ' tried to load another page in its frame — it was put back'); render(session.getState()); return; }
    markBroken(id, 'tried to load another page in its frame — a program may not, so it was stopped');
    flash(name + ' tried to load another page in its frame — it was stopped');
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

  // ===== Consent: this tab runs only what this hand played here (C1) =======
  // A `js` behaviour and a playing `run` program run arbitrary code. The log
  // may say a clock is `playing` — a pure function of the log, true on every
  // hand's board — but THIS tab executes a program only when this hand played
  // it HERE: a `clock{op:'play'}` this hand wrote live in this session. A play
  // that arrived inside a loaded log — a room line, `from a file…`, a folder,
  // a carry, an embed — grants nothing, so another hand's program never starts
  // by itself; the person taps *Play it here* (a play of their own) to run it.
  // This is runtime only (like paint culling): it governs what this tab runs,
  // never the session state, so undo per hand still stops it — undo drops this
  // hand's play, the clock stops, the loop stops.
  // A grant is for the CODE it was given to, never only the artifact: another hand may write a new version of a
  // program this hand played (a revision of theirs, the MCP hand's canvas_write), and that version runs here only
  // after *Play it here* again. So a grant holds the versions of the artifact's code this hand played, or wrote
  // itself while playing it (its own model's revision is its own); a newer version from anyone else is not among
  // them, and the program stands by — dashed, offering *Play it here* — until the person plays it.
  const grantedHere = new Map(); // artifactId -> Set of code versions (`codeVersionOf`) this hand may run here
  let consentArr = null, consentLen = 0;
  /** The version of an artifact's code: its newest code rep, by when it was written and what it says. */
  function codeVersionOf(s, id) {
    const node = s && s.nodes.get(id);
    const rep = node && codeRepOf(node);
    return rep ? rep.data.at + ':' + hashOf(rep.data.code || '') : '';
  }
  function grantCode(s, id) {
    let versions = grantedHere.get(id);
    if (!versions) grantedHere.set(id, (versions = new Set()));
    versions.add(codeVersionOf(s, id));
  }
  /**
   * Whether this hand's own play of an artifact still stands: the last of its own clock events (no `by` — every
   * other hand's line is stamped on arrival) that plays, pauses or resets it is a play. Another hand's play after it
   * leaves it standing (a guest pressed *Play it here* too); another's pause stops the clock in the log itself.
   */
  function ownPlayStands(id) {
    const evs = session.getEvents();
    for (let i = evs.length - 1; i >= 0; i--) {
      const ev = evs[i];
      if (!ev || ev.type !== 'clock' || ev.nodeId !== id || ev.by) continue;
      if (ev.op === 'play') return true;
      if (ev.op === 'pause' || ev.op === 'reset') return false;
    }
    return false;
  }
  function trackConsent(s) {
    const evs = session.getEvents();
    if (evs !== consentArr) {
      // A NEW events array — a load, an undo, a room rebase that cut, a reset.
      // Nothing LOADED is granted (another hand's program, or your own from a
      // file/reload, waits for *Play it here*), but a grant this hand already
      // gave survives an unrelated change: it is kept while the artifact is
      // still live and playing AND this hand's own play still stands
      // (`ownPlayStands`) — whoever played it after. So undoing an unrelated
      // stroke, or another hand's late line, leaves a running program running,
      // while undoing this hand's OWN play drops the grant and it stops here.
      consentArr = evs; consentLen = evs.length;
      for (const id of [...grantedHere.keys()]) {
        const c = s.clocks[id];
        if (!(s.live.includes(id) && c && c.playing && ownPlayStands(id))) grantedHere.delete(id);
      }
    } else {
      // Appended live: a `clock{op:'play'}` THIS hand wrote (no `by`) grants the
      // code as it stands; a `code` event this hand wrote (its own revision, its
      // own model's) for a program it plays grants that version too. A room
      // line that only appends keeps the same array, so a foreign play or a
      // foreign version lands here too — and is refused, because it carries `by`.
      for (let i = consentLen; i < evs.length; i++) {
        const ev = evs[i];
        if (!ev || ev.by) continue;
        if (ev.type === 'clock' && ev.op === 'play') grantCode(s, ev.nodeId);
        else if (ev.type === 'code' && grantedHere.has(ev.nodeId)) grantCode(s, ev.nodeId);
      }
      consentLen = evs.length;
      for (const id of [...grantedHere.keys()]) if (!s.live.includes(id) && !s.clocks[id]) grantedHere.delete(id);
    }
  }
  /**
   * Who wrote the version of a program's code that stands, when it is not this hand — the name of a hand whose new
   * version of a program this hand plays waits here for *Play it here* — else null.
   */
  function newVersionBy(s, id) {
    const node = s && s.nodes.get(id);
    const rep = node && codeRepOf(node);
    if (!rep || !rep.source || rep.source === MM.LOCAL_PARTICIPANT) return null;
    return nameOfParticipant(rep.source);
  }
  /** Whether this tab may run this artifact's code as it stands now: this hand played this very version here. */
  function consentedHere(id, s) {
    const versions = grantedHere.get(id);
    return !!versions && versions.has(codeVersionOf(s || session.getState(), id));
  }
  /**
   * Play a program HERE — the person's one tap when it is playing for another
   * hand (C1). It writes this hand's OWN `clock{op:'play'}`, so the consent is
   * the person's deliberate act, kept in the log as any play is: undo per hand
   * takes it back, and every peer sees this hand played it too. The live append
   * is what `trackConsent` grants on, so the program then runs here.
   */
  function playHere(id) {
    const s = session.getState();
    if (!s.live.includes(id)) return false;
    session.clock({ nodeId: id, op: 'play', at: Date.now() });
    const who = session.clockAuthor(id);
    flash('playing it here' + (who ? ' — it was playing for ' + who : ''));
    return true;
  }
  /**
   * Trust the programs a shipped example or the whitepaper's embed opens with:
   * their code is dyna.ink's own, loaded from the site's own origin, and the
   * example IS the program shown (the launch film). A deliberate, narrow grant
   * made only by the example-open path (22-boards.js), never by a load.
   */
  function grantPlayingPrograms() {
    // A person who asked for less motion starts it themselves (C4): the program waits for their own play.
    if (motionReduced()) return false;
    const s = session.getState();
    let any = false;
    for (const id of Object.keys(s.clocks)) {
      if (!s.clocks[id].playing || consentedHere(id, s)) continue;
      const node = s.nodes.get(id);
      const rep = node && codeRepOf(node);
      const kind = rep && (rep.data.kind || 'html');
      if (kind === 'js' || kind === 'run') { grantCode(s, id); any = true; }
    }
    if (any) render(session.getState());
  }

  /** The playing `js` artifacts THIS hand played here, each with code the worker holds. */
  function runnable(s) {
    const out = [];
    for (const id of s.live) {
      const c = s.clocks[id];
      if (!c || !c.playing || !consentedHere(id, s)) continue;
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
    ensureWorker();
    for (const r of want) {
      if (runtime.loaded.get(r.id) !== r.key && !runtime.pending.has(r.id)) {
        runtime.loaded.set(r.id, r.key); // in flight; a 'loaded' reply confirms
        workerPost({ type: 'load', id: r.id, code: r.code, at: r.key });
      }
    }
    if (!runtime.raf) runtime.raf = nextFrame(runLoop);
  }

  /** One step for one artifact: the world posted, the watchdog armed. Returns false when a step is already in flight. */
  function sendStep(s, r, bodies) {
    if (runtime.pending.has(r.id)) return false; // one step in flight per artifact
    ensureWorker();
    if (runtime.loaded.get(r.id) !== r.key) {
      runtime.loaded.set(r.id, r.key);
      workerPost({ type: 'load', id: r.id, code: r.code, at: r.key });
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
    workerPost({
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
