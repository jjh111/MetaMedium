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
