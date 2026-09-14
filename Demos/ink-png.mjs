// Ink as a picture, in Node: strokes in, a PNG out. No canvas API, no
// dependency — a polyline rasteriser and the PNG container over zlib. What a
// hand that SEES gets when it asks the MCP hand for the ink (SURFACE-v10-PLAN
// D1): dark ink on a white ground, nothing else, the way handwriting is handed
// to a model that can see (CLAUDE.md, Handwriting).

import { deflateSync } from 'node:zlib';

/** Strokes (arrays of {x, y}) → { width, height, rgba }. */
export function rasterize(strokes, opts = {}) {
  const size = opts.size || 640, pad = opts.pad || 16;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (const s of strokes) for (const p of s) { if (p.x < minX) minX = p.x; if (p.y < minY) minY = p.y; if (p.x > maxX) maxX = p.x; if (p.y > maxY) maxY = p.y; }
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
  for (const s of strokes) {
    const pts = s.map((p) => ({ x: pad + (p.x - minX) * k, y: pad + (p.y - minY) * k }));
    if (pts.length === 1) { stamp(pts[0].x, pts[0].y); continue; }
    for (let i = 1; i < pts.length; i++) {
      const a = pts[i - 1], b = pts[i];
      const len = Math.hypot(b.x - a.x, b.y - a.y), n = Math.max(1, Math.ceil(len / 0.7));
      for (let j = 0; j <= n; j++) stamp(a.x + ((b.x - a.x) * j) / n, a.y + ((b.y - a.y) * j) / n);
    }
  }
  return { width, height, rgba, scale: k, origin: { x: minX - pad / k, y: minY - pad / k } };
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
