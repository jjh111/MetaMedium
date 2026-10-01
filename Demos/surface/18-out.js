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
