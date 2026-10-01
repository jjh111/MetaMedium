// ===== assets (the pictures' bytes) =====
// Provides: the pure half of keeping pictures (PLAN-IPAD-NOTES I1) — sha256Hex (the digest an asset is
//   kept under), assetRef / isAssetRef, fitLongSide, pictureFormat / pictureExt (what a picture is kept
//   as), safePictureName / uniquePicturePath (the name and path it gets), assetsOfEvents / assetGcPlan
//   (which assets nothing uses any more), pictureGrid / pickWords (where a pick is laid out and how the
//   status line says it) and pictureTier / decodedCost / evictPlan (what the decoded pictures cost and
//   which to let go).
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
   * Where a pick of pictures stands: a grid of cells in the view (the area of the board the hand is looking
   * at), each picture fitted into a cell with its own proportions, in reading order — left to right, then
   * down. One picture is a large one; many are small enough to stand in the view together, so a pick of ten
   * is never ten on one point. `sizes` are `{ w, h }` (the proportions are what is used), `view` a box in
   * world units. Cells have a floor, so a pick of thirty runs past the view rather than into dust.
   * @returns {Array<{x:number,y:number,w:number,h:number}>} one place a picture, in the order given
   */
  function pictureGrid(sizes, view) {
    const n = sizes.length;
    if (!n) return [];
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
      const s = sizes[i], sw = Math.max(1, s.w || 1), sh = Math.max(1, s.h || 1);
      const k = Math.min(cw / sw, ch / sh);
      const col = i % cols, row = Math.floor(i / cols);
      out.push({ x: view.minX + margin + col * (cw + gap), y: view.minY + margin + row * (ch + gap), w: sw * k, h: sh * k });
    }
    return out;
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
