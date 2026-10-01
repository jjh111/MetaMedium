// Ink as a picture, and now pictures under it (PLAN-IPAD-NOTES A1): the PNG decoder the MCP hand
// draws a board's pictures with, and the rasteriser that puts them beneath the ink.
//
//   node --test Demos/ink-png.test.mjs
//
// The decoder is by hand over zlib — no image library — so it is asked what a PNG can be: every row
// filter, every colour type and depth a file may carry, and what it will not read (interlaced).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deflateSync } from 'node:zlib';
import { encodePNG, decodePNG, rasterize, inkPNG } from './ink-png.mjs';

// ----- a PNG writer with every filter, to give the decoder something harder than the encoder's own -----
const CRC = new Int32Array(256);
for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; CRC[n] = c; }
const crc32 = (buf) => { let c = -1; for (let i = 0; i < buf.length; i++) c = CRC[(c ^ buf[i]) & 0xff] ^ (c >>> 8); return (c ^ -1) >>> 0; };
const chunk = (type, data) => { const out = Buffer.alloc(12 + data.length); out.writeUInt32BE(data.length, 0); out.write(type, 4, 'ascii'); Buffer.from(data).copy(out, 8); out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length); return out; };
const paeth = (a, b, c) => { const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c); return pa <= pb && pa <= pc ? a : pb <= pc ? b : c; };
/** Rows of raw bytes → a PNG, each row filtered by `filters[y % filters.length]`. */
function png({ w, h, color, depth = 8, rows, filters = [0], palette, trns, interlace = 0 }) {
  const bpp = Math.max(1, ({ 0: 1, 2: 3, 3: 1, 4: 2, 6: 4 }[color] * depth) >> 3);
  const raw = [];
  let prev = new Uint8Array(rows[0].length);
  rows.forEach((row, y) => {
    const f = filters[y % filters.length];
    const out = new Uint8Array(row.length);
    for (let i = 0; i < row.length; i++) {
      const a = i >= bpp ? row[i - bpp] : 0, b = prev[i], c = i >= bpp ? prev[i - bpp] : 0;
      out[i] = (row[i] - (f === 0 ? 0 : f === 1 ? a : f === 2 ? b : f === 3 ? (a + b) >> 1 : paeth(a, b, c))) & 255;
    }
    raw.push(Buffer.from([f]), Buffer.from(out));
    prev = row;
  });
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = depth; ihdr[9] = color; ihdr[12] = interlace;
  return new Uint8Array(Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr),
    ...(palette ? [chunk('PLTE', Buffer.from(palette.flat()))] : []), ...(trns ? [chunk('tRNS', Buffer.from(trns))] : []),
    chunk('IDAT', deflateSync(Buffer.concat(raw))), chunk('IEND', Buffer.alloc(0)),
  ]));
}
const px = (img, x, y) => [...img.rgba.slice((y * img.width + x) * 4, (y * img.width + x) * 4 + 4)];

test('the decoder reads what the encoder writes', () => {
  const rgba = new Uint8Array(3 * 2 * 4);
  rgba.set([255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 10, 20, 30, 128, 40, 50, 60, 255, 0, 0, 0, 0]);
  const img = decodePNG(encodePNG(3, 2, rgba));
  assert.equal(img.width, 3); assert.equal(img.height, 2);
  assert.deepEqual([...img.rgba], [...rgba]);
});

test('every row filter is undone: none, sub, up, average and paeth, in rows that follow one another', () => {
  const w = 7, h = 10, rows = [];
  let x = 5;
  for (let y = 0; y < h; y++) { const r = new Uint8Array(w * 3); for (let i = 0; i < r.length; i++) { x = (x * 1103515245 + 12345) >>> 0; r[i] = (x >>> 16) & 255; } rows.push(r); }
  const img = decodePNG(png({ w, h, color: 2, rows, filters: [0, 1, 2, 3, 4] }));
  for (let y = 0; y < h; y++) for (let i = 0; i < w; i++) assert.deepEqual(px(img, i, y), [rows[y][i * 3], rows[y][i * 3 + 1], rows[y][i * 3 + 2], 255], `(${i},${y})`);
});

test('grey, grey with alpha, a palette (with transparency) and sixteen bits each come out as RGBA', () => {
  const grey = decodePNG(png({ w: 2, h: 1, color: 0, rows: [Uint8Array.from([0, 200])] }));
  assert.deepEqual(px(grey, 1, 0), [200, 200, 200, 255]);
  const ga = decodePNG(png({ w: 2, h: 1, color: 4, rows: [Uint8Array.from([50, 255, 90, 100])] }));
  assert.deepEqual(px(ga, 1, 0), [90, 90, 90, 100]);
  const pal = decodePNG(png({ w: 3, h: 1, color: 3, rows: [Uint8Array.from([0, 1, 2])], palette: [[255, 0, 0], [0, 255, 0], [0, 0, 255]], trns: [255, 128] }));
  assert.deepEqual([px(pal, 0, 0), px(pal, 1, 0), px(pal, 2, 0)], [[255, 0, 0, 255], [0, 255, 0, 128], [0, 0, 255, 255]]);
  const deep = decodePNG(png({ w: 1, h: 1, color: 2, depth: 16, rows: [Uint8Array.from([0xff, 0xff, 0x80, 0x00, 0x00, 0x00])] }));
  assert.deepEqual(px(deep, 0, 0), [255, 128, 0, 255], 'the high byte of each sample');
});

test('one, two and four bits to a pixel are unpacked, a row at a time', () => {
  // 10 pixels of 1-bit grey: 1010101010 → two bytes, the second's low bits padding.
  const one = decodePNG(png({ w: 10, h: 1, color: 0, depth: 1, rows: [Uint8Array.from([0b10101010, 0b10000000])] }));
  assert.deepEqual([0, 1, 8, 9].map((i) => px(one, i, 0)[0]), [255, 0, 255, 0]);
  const four = decodePNG(png({ w: 3, h: 1, color: 3, depth: 4, rows: [Uint8Array.from([0x01, 0x20])], palette: [[1, 1, 1], [2, 2, 2], [3, 3, 3]] }));
  assert.deepEqual([0, 1, 2].map((i) => px(four, i, 0)[0]), [1, 2, 3]);
});

test('what it will not read it says by returning null: interlaced, truncated, not a PNG, or an absurd size', () => {
  assert.equal(decodePNG(png({ w: 2, h: 2, color: 2, rows: [new Uint8Array(6), new Uint8Array(6)], interlace: 1 })), null);
  assert.equal(decodePNG(encodePNG(2, 2, new Uint8Array(16)).subarray(0, 40)), null);
  assert.equal(decodePNG(Uint8Array.from([1, 2, 3])), null);
  const huge = Buffer.from(png({ w: 2, h: 2, color: 2, rows: [new Uint8Array(6), new Uint8Array(6)] }));
  huge.writeUInt32BE(30000, 16); huge.writeUInt32BE(30000, 20);
  assert.equal(decodePNG(new Uint8Array(huge)), null, 'a header that claims 900 megapixels is not decoded');
});

test('a picture stands under the ink: its pixels where its bounds are, the ink over it, white elsewhere', () => {
  const red = new Uint8Array(4 * 4 * 4); for (let i = 0; i < 16; i++) red.set([200, 40, 40, 255], i * 4);
  const out = rasterize([[{ x: 0, y: 50 }, { x: 100, y: 50 }]], { size: 200, pictures: [{ name: 'swatch.png', bounds: { minX: 0, minY: 0, maxX: 100, maxY: 100 }, image: { width: 4, height: 4, rgba: red } }] });
  const at = (wx, wy) => { const x = Math.round((wx - out.origin.x) * out.scale), y = Math.round((wy - out.origin.y) * out.scale); return [...out.rgba.slice((y * out.width + x) * 4, (y * out.width + x) * 4 + 3)]; };
  assert.deepEqual(at(50, 20), [200, 40, 40], 'the picture\'s own pixels');
  assert.deepEqual(at(50, 50), [17, 17, 17], 'the ink is over the picture');
  assert.deepEqual(out.pictures, [{ name: 'swatch.png', drawn: true }]);
  assert.ok(out.width > 100 && out.height > 100, 'the bounds of the picture are in the frame: ' + out.width + '×' + out.height);
});

test('a picture it cannot decode is stood as a frame with its name beside it — never left out, never pretended', () => {
  const out = rasterize([], { size: 200, pictures: [{ name: 'holiday.jpg', bounds: { minX: 0, minY: 0, maxX: 100, maxY: 80 }, image: null }] });
  assert.deepEqual(out.pictures, [{ name: 'holiday.jpg', drawn: false }]);
  const at = (wx, wy) => { const x = Math.round((wx - out.origin.x) * out.scale), y = Math.round((wy - out.origin.y) * out.scale); return [...out.rgba.slice((y * out.width + x) * 4, (y * out.width + x) * 4 + 3)]; };
  const edge = [-2, -1, 0, 1, 2].map((d) => at(0 + d / out.scale, 40));
  assert.ok(edge.some((c) => c.some((v) => v < 250)), 'the frame\'s left edge is drawn');
  assert.deepEqual(at(50, 20), [255, 255, 255], 'and nothing is made up inside it');
  const done = inkPNG([], { pictures: [{ name: 'a.jpg', bounds: { minX: 0, minY: 0, maxX: 10, maxY: 10 }, image: null }] });
  assert.equal(done.png[0], 0x89);
});

test('with no pictures and no ink the frame is what it always was', () => {
  const out = rasterize([]);
  assert.deepEqual(out.pictures, []);
});
