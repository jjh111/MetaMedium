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
    const s = session.getState();
    const boxes = s.contentIds.map((id) => MM.boundsOf(s.nodes.get(id))).filter(Boolean);
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
    for (const id of s.contentIds) draw(s.nodes.get(id), 0);
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
