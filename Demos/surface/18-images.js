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
