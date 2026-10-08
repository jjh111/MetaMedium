// A PNG, written by hand (V1-SPEC IN1, the fixtures): a solid colour of any size, stored uncompressed.
//
// Enough to be a picture a file can hold — a signature, a header with the size, one data chunk, an end — and
// valid, so a decoder opens it. Not an encoder: the pixels are one colour, and the data is zlib's stored blocks.

const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(bytes: Uint8Array): number {
  let c = 0xffffffff;
  for (let i = 0; i < bytes.length; i++) c = CRC_TABLE[(c ^ bytes[i]) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

function adler32(bytes: Uint8Array): number {
  let a = 1, b = 0;
  for (let i = 0; i < bytes.length; i++) { a = (a + bytes[i]) % 65521; b = (b + a) % 65521; }
  return ((b << 16) | a) >>> 0;
}

function chunk(type: string, data: Uint8Array): Uint8Array {
  const out = new Uint8Array(12 + data.length);
  const dv = new DataView(out.buffer);
  dv.setUint32(0, data.length);
  for (let i = 0; i < 4; i++) out[4 + i] = type.charCodeAt(i);
  out.set(data, 8);
  dv.setUint32(8 + data.length, crc32(out.subarray(4, 8 + data.length)));
  return out;
}

/** A `w` × `h` PNG of one colour (RGBA, 8 bits), stored without compression. */
export function makePng(w: number, h: number, rgba: [number, number, number, number] = [200, 220, 240, 255]): Uint8Array {
  const ihdr = new Uint8Array(13);
  const dv = new DataView(ihdr.buffer);
  dv.setUint32(0, w);
  dv.setUint32(4, h);
  ihdr[8] = 8; ihdr[9] = 6;
  // Each row: a filter byte of 0, then the pixels.
  const row = 1 + w * 4;
  const raw = new Uint8Array(row * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) raw.set(rgba, y * row + 1 + x * 4);
  // zlib: a header, stored blocks of at most 65535 bytes, the Adler-32.
  const blocks: Uint8Array[] = [new Uint8Array([0x78, 0x01])];
  for (let at = 0; at < raw.length || at === 0; at += 65535) {
    const part = raw.subarray(at, Math.min(raw.length, at + 65535));
    const last = at + 65535 >= raw.length;
    const head = new Uint8Array(5);
    head[0] = last ? 1 : 0;
    head[1] = part.length & 255; head[2] = part.length >> 8;
    head[3] = ~part.length & 255; head[4] = (~part.length >> 8) & 255;
    blocks.push(head, part);
    if (last) break;
  }
  const tail = new Uint8Array(4);
  new DataView(tail.buffer).setUint32(0, adler32(raw));
  blocks.push(tail);
  const idat = new Uint8Array(blocks.reduce((n, b) => n + b.length, 0));
  let o = 0;
  for (const b of blocks) { idat.set(b, o); o += b.length; }
  const parts = [new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), chunk('IHDR', ihdr), chunk('IDAT', idat), chunk('IEND', new Uint8Array(0))];
  const out = new Uint8Array(parts.reduce((n, b) => n + b.length, 0));
  o = 0;
  for (const b of parts) { out.set(b, o); o += b.length; }
  return out;
}

/** Bytes as base64, for a data address. */
export function toBase64(bytes: Uint8Array): string {
  const A = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
  let out = '';
  for (let i = 0; i < bytes.length; i += 3) {
    const n = (bytes[i] << 16) | ((bytes[i + 1] ?? 0) << 8) | (bytes[i + 2] ?? 0);
    out += A[(n >> 18) & 63] + A[(n >> 12) & 63] + (i + 1 < bytes.length ? A[(n >> 6) & 63] : '=') + (i + 2 < bytes.length ? A[n & 63] : '=');
  }
  return out;
}
