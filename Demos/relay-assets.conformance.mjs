// What a relay does with a picture's bytes — one definition of the cases, run against BOTH servers
// (Demos/relay.test.mjs for the Node relay, cloudflare/relay/relay.parity.test.mjs for the Worker in
// Node), so the two cannot drift: the protocol is one file (relay-protocol.mjs) and so is its test.
//
// A picture is kept by the SHA-256 of its bytes, per room: `PUT /rooms/<room>/assets/<sha256>` with the
// bytes as the body, `GET` and `HEAD` the same address. The hash is verified on arrival (the bytes
// are the ones the address names, or nothing is kept), the bytes must be a picture (PNG, JPEG, WebP or
// GIF, by their own header — never by what the sender calls them), and a refusal is a sentence.
//
// `start(vars)` starts one server and resolves { url, close }; `vars` may carry `assetRoomBytes`, how
// much a room keeps in pictures, to make the cap small enough to meet.

import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { encodePNG } from './ink-png.mjs';

export const sha = (bytes) => createHash('sha256').update(bytes).digest('hex');
/** A real PNG of a flat colour, `n` pixels square. */
export function pngOf(n = 4, rgba = [200, 40, 40, 255]) {
  const px = new Uint8Array(n * n * 4);
  for (let i = 0; i < n * n; i++) px.set(rgba, i * 4);
  return new Uint8Array(encodePNG(n, n, px));
}
/** A PNG padded past what a room takes: a real header, then ancillary bytes — only the size matters. */
export const hugePng = (bytes) => { const base = pngOf(2); const out = new Uint8Array(bytes); out.set(base); return out; };

export function assetConformance(test, start) {
  const url = (s, room, hash) => `${s.url}/rooms/${room}/assets/${hash}`;
  const put = (s, room, bytes, hash = sha(bytes), init = {}) => fetch(url(s, room, hash), { method: 'PUT', headers: { 'content-type': 'application/octet-stream', ...(init.headers || {}) }, body: bytes });
  const withRelay = (vars, fn) => async () => { const s = await start(vars); try { await fn(s); } finally { await s.close(); } };

  test('a picture is put by its hash and got back byte for byte, with the headers of a thing that never changes', withRelay({}, async (s) => {
    const png = pngOf(8);
    const hash = sha(png);
    const missing = await fetch(url(s, 'r', hash));
    assert.equal(missing.status, 404);
    assert.match(await missing.text(), /no picture/);
    assert.equal((await put(s, 'r', png)).status, 204);
    const got = await fetch(url(s, 'r', hash));
    assert.equal(got.status, 200);
    assert.deepEqual(new Uint8Array(await got.arrayBuffer()), png);
    assert.equal(got.headers.get('content-type'), 'image/png', 'the type is what the bytes are, not what the sender said');
    assert.match(got.headers.get('cache-control'), /max-age=31536000/);
    assert.match(got.headers.get('cache-control'), /immutable/);
    assert.equal(got.headers.get('x-content-type-options'), 'nosniff');
    assert.equal(got.headers.get('etag'), '"' + hash + '"');
    const head = await fetch(url(s, 'r', hash), { method: 'HEAD' });
    assert.equal(head.status, 200);
    assert.equal(head.headers.get('content-length'), String(png.length));
    assert.equal((await head.arrayBuffer()).byteLength, 0);
    assert.equal((await fetch(url(s, 'r', 'ab'.repeat(32)), { method: 'HEAD' })).status, 404);
  }));

  test('a put of what is already held is the same 204 — a picture is kept once', withRelay({}, async (s) => {
    const png = pngOf(5);
    assert.equal((await put(s, 'r', png)).status, 204);
    assert.equal((await put(s, 'r', png)).status, 204);
    assert.deepEqual(new Uint8Array(await (await fetch(url(s, 'r', sha(png)))).arrayBuffer()), png);
  }));

  test('the bytes must be the ones the address names: another picture under this hash is refused, and nothing is kept', withRelay({}, async (s) => {
    const a = pngOf(6), b = pngOf(7);
    const res = await put(s, 'r', b, sha(a));
    assert.equal(res.status, 422);
    assert.match(await res.text(), /not the bytes/);
    assert.equal((await fetch(url(s, 'r', sha(a)))).status, 404);
    assert.equal((await fetch(url(s, 'r', sha(b)))).status, 404);
  }));

  test('only a picture is kept: bytes that are not one are refused in words, whatever they are called', withRelay({}, async (s) => {
    const text = new TextEncoder().encode('<html><script>alert(1)</script></html>');
    const res = await put(s, 'r', text, sha(text), { headers: { 'content-type': 'image/png' } });
    assert.equal(res.status, 415);
    assert.match(await res.text(), /PNG, JPEG, WebP or GIF/);
    assert.equal((await fetch(url(s, 'r', sha(text)))).status, 404);
  }));

  test('an address that is not a SHA-256 is refused, and so is a put of nothing', withRelay({}, async (s) => {
    for (const bad of ['abc', 'AB'.repeat(32), 'sha256:' + 'ab'.repeat(32), 'g'.repeat(64)]) {
      const res = await fetch(url(s, 'r', bad), { method: 'PUT', body: pngOf(2) });
      assert.equal(res.status, 400, bad);
      assert.match(await res.text(), /SHA-256/);
    }
    const empty = await put(s, 'r', new Uint8Array(0));
    assert.equal(empty.status, 400);
  }));

  test('past 12 MB a picture is refused with its size in words — and a room\'s pictures are its own', withRelay({}, async (s) => {
    const big = hugePng(12 * 1024 * 1024 + 1);
    const res = await put(s, 'r', big);
    assert.equal(res.status, 413);
    assert.match(await res.text(), /12 MB/);
    assert.equal((await fetch(url(s, 'r', sha(big)))).status, 404);
    const ok = hugePng(12 * 1024 * 1024);
    assert.equal((await put(s, 'r', ok)).status, 204, 'exactly 12 MB is taken');
    assert.equal((await fetch(url(s, 'other', sha(ok)))).status, 404, 'another room does not hold it');
    assert.equal((await fetch(url(s, 'r', sha(ok)))).status, 200);
  }));

  test('a room keeps pictures up to what it is set to hold, then says so — and what it holds stays', withRelay({ assetRoomBytes: 3000 }, async (s) => {
    const a = pngOf(9, [1, 2, 3, 255]), b = pngOf(10, [4, 5, 6, 255]);
    const noise = (n) => { const px = new Uint8Array(n * n * 4); let x = 12345; for (let i = 0; i < px.length; i++) { x = (x * 1664525 + 1013904223) >>> 0; px[i] = x >>> 24; } return px; };
    // Noise does not compress: a 30-pixel square of it is a PNG of about 3.6 KB.
    const c = new Uint8Array(encodePNG(30, 30, noise(30)));
    assert.ok(c.length > 3000, 'the third picture is larger than the room takes: ' + c.length);
    assert.equal((await put(s, 'r', a)).status, 204);
    assert.equal((await put(s, 'r', b)).status, 204);
    const full = await put(s, 'r', c);
    assert.equal(full.status, 507);
    assert.match(await full.text(), /holds all the pictures/);
    assert.equal((await fetch(url(s, 'r', sha(a)))).status, 200, 'what it held it still holds');
    assert.equal((await fetch(url(s, 'r', sha(c)))).status, 404);
    assert.equal((await put(s, 'r', a)).status, 204, 'a picture already held is not a new cost');
  }));

  test('the bytes survive a connection that comes late: a second hand gets what the first put', withRelay({}, async (s) => {
    const png = pngOf(12, [10, 200, 90, 255]);
    await put(s, 'room one', png);
    const got = await fetch(url(s, encodeURIComponent('room one'), sha(png)));
    assert.equal(got.status, 200);
    assert.deepEqual(new Uint8Array(await got.arrayBuffer()), png);
  }));
}
