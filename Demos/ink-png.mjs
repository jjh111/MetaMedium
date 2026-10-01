// Ink as a picture, in Node: strokes in, a PNG out. No canvas API, no
// dependency — a polyline rasteriser and the PNG container over zlib. What a
// hand that SEES gets when it asks the MCP hand for the ink (SURFACE-v10-PLAN
// D1): dark ink on a white ground, nothing else, the way handwriting is handed
// to a model that can see (CLAUDE.md, Handwriting).

import { deflateSync, inflateSync } from 'node:zlib';

// And, since pictures came to the board (PLAN-IPAD-NOTES A1), the pictures UNDER the ink: `opts.pictures` is
// `[{ name, bounds: { minX, minY, maxX, maxY }, image: { width, height, rgba } | null }]` — each drawn in its
// bounds beneath the strokes, so what a hand sees is the board as a person does, ink over a picture. A picture
// whose bytes this process cannot decode (`image: null` — a JPEG or a WebP, which would take a decoder this
// repository does not carry) is stood as its frame, nothing made up inside it; `pictures` in the result says
// which were drawn and which were only a frame, for the sentence that goes with the PNG.

/** Strokes (arrays of {x, y}) → { width, height, rgba, scale, origin, pictures }. */
export function rasterize(strokes, opts = {}) {
  const size = opts.size || 640, pad = opts.pad || 16;
  const pictures = Array.isArray(opts.pictures) ? opts.pictures.filter((p) => p && p.bounds) : [];
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const s of strokes) for (const p of s) { if (p.x < minX) minX = p.x; if (p.y < minY) minY = p.y; if (p.x > maxX) maxX = p.x; if (p.y > maxY) maxY = p.y; }
  for (const { bounds: b } of pictures) { minX = Math.min(minX, b.minX); minY = Math.min(minY, b.minY); maxX = Math.max(maxX, b.maxX); maxY = Math.max(maxY, b.maxY); }
  if (!Number.isFinite(minX)) { minX = minY = 0; maxX = maxY = 1; }
  const w = Math.max(1, maxX - minX), h = Math.max(1, maxY - minY);
  const k = Math.min((size - pad * 2) / w, (size - pad * 2) / h, 4);
  const width = Math.max(8, Math.round(w * k + pad * 2)), height = Math.max(8, Math.round(h * k + pad * 2));
  const rgba = new Uint8Array(width * height * 4).fill(255);
  const radius = Math.max(1, (opts.width || 3) * Math.min(1, k) / 2 + 0.6);
  const ink = opts.ink || [17, 17, 17];
  const stamp = (cx, cy) => {
    const r = radius, r2 = r * r;
    for (let y = Math.max(0, Math.floor(cy - r)); y <= Math.min(height - 1, Math.ceil(cy + r)); y++) {
      for (let x = Math.max(0, Math.floor(cx - r)); x <= Math.min(width - 1, Math.ceil(cx + r)); x++) {
        const d2 = (x + 0.5 - cx) ** 2 + (y + 0.5 - cy) ** 2;
        if (d2 > r2) continue;
        const i = (y * width + x) * 4;
        rgba[i] = ink[0]; rgba[i + 1] = ink[1]; rgba[i + 2] = ink[2]; rgba[i + 3] = 255;
      }
    }
  };
  // The pictures first, so the ink is over them.
  const drawn = pictures.map((pic) => {
    const x0 = pad + (pic.bounds.minX - minX) * k, y0 = pad + (pic.bounds.minY - minY) * k;
    const x1 = pad + (pic.bounds.maxX - minX) * k, y1 = pad + (pic.bounds.maxY - minY) * k;
    const ok = !!(pic.image && pic.image.width > 0 && pic.image.height > 0 && pic.image.rgba);
    if (ok) paintPicture(rgba, width, height, pic.image, x0, y0, x1, y1);
    else frame(rgba, width, height, x0, y0, x1, y1);
    return { name: pic.name || 'picture', drawn: ok };
  });
  for (const s of strokes) {
    const pts = s.map((p) => ({ x: pad + (p.x - minX) * k, y: pad + (p.y - minY) * k }));
    if (pts.length === 1) { stamp(pts[0].x, pts[0].y); continue; }
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i];
      const len = Math.hypot(b.x - a.x, b.y - a.y), n = Math.max(1, Math.ceil(len / 0.7));
      for (let j = 0; j <= n; j++) stamp(a.x + ((b.x - a.x) * j) / n, a.y + ((b.y - a.y) * j) / n);
    }
  }
  return { width, height, rgba, scale: k, origin: { x: minX - pad / k, y: minY - pad / k }, pictures: drawn };
}

/** A picture's pixels into the box (x0,y0)-(x1,y1) of an RGBA canvas, over white: each pixel the average of a few samples of the source, so a photograph shrunk is not aliased. */
function paintPicture(rgba, width, height, img, x0, y0, x1, y1) {
  const dw = x1 - x0, dh = y1 - y0;
  if (!(dw > 0) || !(dh > 0)) return;
  const sx = Math.max(1, Math.min(4, Math.ceil(img.width / dw))), sy = Math.max(1, Math.min(4, Math.ceil(img.height / dh)));
  for (let y = Math.max(0, Math.floor(y0)); y < Math.min(height, Math.ceil(y1)); y++) {
    for (let x = Math.max(0, Math.floor(x0)); x < Math.min(width, Math.ceil(x1)); x++) {
      let r = 0, g = 0, b = 0, a = 0;
      for (let j = 0; j < sy; j++) for (let i = 0; i < sx; i++) {
        const u = Math.min(img.width - 1, Math.max(0, Math.floor(((x + (i + 0.5) / sx - x0) / dw) * img.width)));
        const v = Math.min(img.height - 1, Math.max(0, Math.floor(((y + (j + 0.5) / sy - y0) / dh) * img.height)));
        const o = (v * img.width + u) * 4, al = img.rgba[o + 3] / 255;
        r += img.rgba[o] * al + 255 * (1 - al); g += img.rgba[o + 1] * al + 255 * (1 - al); b += img.rgba[o + 2] * al + 255 * (1 - al); a++;
      }
      const o = (y * width + x) * 4;
      rgba[o] = Math.round(r / a); rgba[o + 1] = Math.round(g / a); rgba[o + 2] = Math.round(b / a); rgba[o + 3] = 255;
    }
  }
}
/** A picture that could not be drawn: its frame, two pixels thick, in a grey that is not ink. */
function frame(rgba, width, height, x0, y0, x1, y1) {
  const put = (x, y) => { if (x < 0 || y < 0 || x >= width || y >= height) return; const o = (y * width + x) * 4; rgba[o] = 140; rgba[o + 1] = 140; rgba[o + 2] = 140; rgba[o + 3] = 255; };
  for (let t = 0; t < 2; t++) {
    for (let x = Math.round(x0); x <= Math.round(x1); x++) { put(x, Math.round(y0) + t); put(x, Math.round(y1) - t); }
    for (let y = Math.round(y0); y <= Math.round(y1); y++) { put(Math.round(x0) + t, y); put(Math.round(x1) - t, y); }
  }
}

const CRC = new Int32Array(256);
for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; CRC[n] = c; }
function crc32(buf) { let c = -1; for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8); return (c ^ -1) >>> 0; }
function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, 'ascii');
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}

/** RGBA pixels → a PNG file. */
export function encodePNG(width, height, rgba) {
  const raw = Buffer.alloc((width * 4 + 1) * height);
  for (let y = 0; y < height; y++) {
    raw[y * (width * 4 + 1)] = 0; // filter: none
    Buffer.from(rgba.buffer, rgba.byteOffset + y * width * 4, width * 4).copy(raw, y * (width * 4 + 1) + 1);
  }
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0); ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0; // 8-bit RGBA
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr),
    chunk('IDAT', deflateSync(raw)),
    chunk('IEND', Buffer.alloc(0)),
  ]);
}

/** Strokes → a PNG, with how it was drawn. */
export function inkPNG(strokes, opts) {
  const r = rasterize(strokes, opts);
  return { png: encodePNG(r.width, r.height, r.rgba), width: r.width, height: r.height, scale: r.scale, origin: r.origin };
}

// ----- Reading a PNG, by hand ---------------------------------------------------------------
const CHANNELS = { 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 };
/** The most pixels a picture may have to be decoded here: an address a relay served is not to be trusted with memory. */
const MAX_DECODE_PIXELS = 36e6;

/**
 * A PNG file → `{ width, height, rgba }` (8 bits a channel, straight alpha), or null when it is not one this
 * can read: not a PNG, cut short, interlaced (Adam7 is not walked here), or larger than it will decode. No image
 * library — chunks, zlib, and the five row filters. Every colour type (grey, truecolour, palette, each with or
 * without alpha, tRNS included) at every depth a file may carry; sixteen bits keep the high byte.
 */
export function decodePNG(input) {
  const b = Buffer.isBuffer(input) ? input : Buffer.from(input.buffer, input.byteOffset, input.length);
  if (b.length < 33 || b.readUInt32BE(0) !== 0x89504e47 || b.readUInt32BE(4) !== 0x0d0a1a0a) return null;
  let w = 0, h = 0, depth = 0, color = -1, interlace = 0, plte = null, trns = null;
  const idat = [];
  for (let i = 8; i + 12 <= b.length;) {
    const len = b.readUInt32BE(i), type = b.toString('ascii', i + 4, i + 8);
    if (i + 12 + len > b.length) return null;
    const data = b.subarray(i + 8, i + 8 + len);
    if (type === 'IHDR') { if (len < 13) return null; w = data.readUInt32BE(0); h = data.readUInt32BE(4); depth = data[8]; color = data[9]; interlace = data[12]; }
    else if (type === 'PLTE') plte = data;
    else if (type === 'tRNS') trns = data;
    else if (type === 'IDAT') idat.push(data);
    else if (type === 'IEND') break;
    i += 12 + len;
  }
  if (!w || !h || !CHANNELS[color] || ![1, 2, 4, 8, 16].includes(depth) || interlace !== 0 || !idat.length) return null;
  if (w * h > MAX_DECODE_PIXELS || (color === 3 && !plte)) return null;
  let raw;
  try { raw = inflateSync(Buffer.concat(idat)); } catch { return null; }
  const channels = CHANNELS[color], bits = channels * depth, rowBytes = Math.ceil((w * bits) / 8), bpp = Math.max(1, bits >> 3);
  if (raw.length < h * (rowBytes + 1)) return null;
  // The five row filters, each against the row before it (zeroes above the first).
  const px = new Uint8Array(h * rowBytes);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (rowBytes + 1)], src = y * (rowBytes + 1) + 1, dst = y * rowBytes, up = dst - rowBytes;
    for (let i = 0; i < rowBytes; i++) {
      const a = i >= bpp ? px[dst + i - bpp] : 0, u = y ? px[up + i] : 0, c = y && i >= bpp ? px[up + i - bpp] : 0;
      let v = raw[src + i];
      if (f === 1) v += a; else if (f === 2) v += u; else if (f === 3) v += (a + u) >> 1;
      else if (f === 4) { const p = a + u - c, pa = Math.abs(p - a), pb = Math.abs(p - u), pc = Math.abs(p - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? u : c; }
      else if (f !== 0) return null;
      px[dst + i] = v & 255;
    }
  }
  // A sample at index `n` of a row: its whole value at its depth.
  const sample = (row, n) => {
    if (depth === 8) return px[row + n];
    if (depth === 16) return (px[row + 2 * n] << 8) | px[row + 2 * n + 1];
    const per = 8 / depth, byte = px[row + Math.floor(n / per)], shift = 8 - depth * ((n % per) + 1);
    return (byte >> shift) & ((1 << depth) - 1);
  };
  const to8 = (v) => (depth === 8 ? v : depth === 16 ? v >> 8 : Math.round((v * 255) / ((1 << depth) - 1)));
  const out = new Uint8Array(w * h * 4);
  const key = trns && color === 0 && trns.length >= 2 ? trns.readUInt16BE(0) : color === 2 && trns && trns.length >= 6 ? [trns.readUInt16BE(0), trns.readUInt16BE(2), trns.readUInt16BE(4)] : null;
  for (let y = 0; y < h; y++) {
    const row = y * rowBytes;
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4;
      if (color === 3) {
        const i = sample(row, x);
        out[o] = plte[i * 3] || 0; out[o + 1] = plte[i * 3 + 1] || 0; out[o + 2] = plte[i * 3 + 2] || 0; out[o + 3] = trns && i < trns.length ? trns[i] : 255;
      } else if (color === 0 || color === 4) {
        const v = sample(row, x * channels), g = to8(v);
        out[o] = out[o + 1] = out[o + 2] = g;
        out[o + 3] = color === 4 ? to8(sample(row, x * 2 + 1)) : key !== null && v === key ? 0 : 255;
      } else {
        const r = sample(row, x * channels), g = sample(row, x * channels + 1), bl = sample(row, x * channels + 2);
        out[o] = to8(r); out[o + 1] = to8(g); out[o + 2] = to8(bl);
        out[o + 3] = color === 6 ? to8(sample(row, x * 4 + 3)) : key && r === key[0] && g === key[1] && bl === key[2] ? 0 : 255;
      }
    }
  }
  return { width: w, height: h, rgba: out };
}
