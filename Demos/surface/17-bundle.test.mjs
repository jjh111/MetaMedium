// The board out and back whole, on its own.
//
//   node --test Demos/surface/17-bundle.test.mjs
//
// 17-bundle.js is the pure half of PLAN-IPAD-NOTES I4: the board bundle (a ZIP holding the log and its
// pictures, written and read by hand — a CRC, store-only on the way out, deflate on the way back in because
// the iPad's Files app compresses what it zips), the board as one SVG with its pictures and figures in it, a
// PDF made by hand from one picture of the board, and the plans that size them. Like 17-assets.js it names
// nothing outside itself — no DOM, no storage, no session — so it loads here exactly as the browser loads it.
// 18-images.js is the adapter. A file that cannot be read is a sentence, never a throw.
//
// Not part of the built surface — Demos/build-surface.mjs concatenates `/^\d\d-.*\.js$/`.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { deflateRawSync, deflateSync, inflateSync, inflateRawSync } from 'node:zlib';
import { readFileSync, existsSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const NAMES = [
  'crc32', 'isZipBytes', 'zipWrite', 'zipRead', 'assetEntryName', 'bundleName', 'bundleBuild', 'bundleRead',
  'base64Of', 'svgDataUrl', 'pictureDataUrl', 'boardFrame', 'boardSvg', 'pngPlan', 'paperOf', 'pdfPlan', 'pdfWrite',
  'BUNDLE_LOG', 'PNG_MAX_SIDE', 'PNG_MAX_PIXELS',
];
const file = join(dirname(fileURLToPath(import.meta.url)), '17-bundle.js');
const B = (() => {
  if (!existsSync(file)) return {};
  const src = readFileSync(file, 'utf8');
  return new Function(src + '\n  return { ' + NAMES.map((n) => n + ': typeof ' + n + " === 'undefined' ? undefined : " + n).join(', ') + ' };')();
})();

const enc = (s) => new TextEncoder().encode(s);
const dec = (b) => new TextDecoder().decode(b);
const noise = (n, seed) => { const b = new Uint8Array(n); let a = seed || 7; for (let i = 0; i < n; i++) { a = (a * 1664525 + 1013904223) >>> 0; b[i] = a >>> 24; } return b; };
const join8 = (parts) => { const out = new Uint8Array(parts.reduce((a, p) => a + p.length, 0)); let o = 0; for (const p of parts) { out.set(p, o); o += p.length; } return out; };
const zipBytes = (entries, o) => { const z = B.zipWrite(entries, o); return join8(z.parts); };
const digest = async (bytes) => createHash('sha256').update(bytes).digest('hex');
const inflate = async (raw) => new Uint8Array(inflateRawSync(Buffer.from(raw)));

// ----- the checksum ----------------------------------------------------------------------

test('crc32 is the zip checksum: the standard vector, the empty input, and what a stream of noise comes to', () => {
  assert.equal(B.crc32(enc('123456789')), 0xCBF43926);
  assert.equal(B.crc32(new Uint8Array(0)), 0);
  assert.equal(B.crc32(enc('a')), 0xE8B7BE43);
  // The unsigned value, whatever the high bit says.
  assert.ok(B.crc32(enc('hello world')) > 0);
  const big = noise(50000, 3);
  const py = spawnSync('python3', ['-c', 'import sys,zlib;print(zlib.crc32(sys.stdin.buffer.read()))'], { input: Buffer.from(big) });
  if (py.status === 0) assert.equal(B.crc32(big), Number(String(py.stdout).trim()));
});

// ----- the zip ---------------------------------------------------------------------------

test('a zip written by hand reads back: every name and every byte, the empty file and the unicode name included', async () => {
  const entries = [
    { name: 'board.jsonl', data: enc('{"a":1}\n{"b":2}\n') },
    { name: 'assets/' + 'a'.repeat(64) + '.jpg', data: noise(100000, 9) },
    { name: 'empty.txt', data: new Uint8Array(0) },
    { name: 'notes/café — 日本.txt', data: enc('héllo') },
  ];
  const z = B.zipWrite(entries, { time: Date.UTC(2026, 9, 1, 12, 30, 10) });
  assert.equal(z.size, z.parts.reduce((a, p) => a + p.length, 0));
  const bytes = join8(z.parts);
  assert.equal(B.isZipBytes(bytes), true);
  assert.equal(B.isZipBytes(enc('{"type":"format"}')), false);
  assert.equal(B.isZipBytes(new Uint8Array(2)), false);
  const r = await B.zipRead(bytes, {});
  assert.equal(r.ok, true);
  assert.deepEqual(r.entries.map((e) => e.name), entries.map((e) => e.name));
  r.entries.forEach((e, i) => { assert.deepEqual(Array.from(e.data), Array.from(entries[i].data), e.name); assert.equal(e.bad, undefined); });
});

test('the zip is a real one: unzip and Python read it, the checksums and the names agreeing (skipped where neither is here)', () => {
  const dir = mkdtempSync(join(tmpdir(), 'mm-zip-'));
  try {
    const entries = [{ name: 'board.jsonl', data: enc('x\n'.repeat(1000)) }, { name: 'assets/p.png', data: noise(70000, 5) }, { name: 'ü.txt', data: enc('ü') }];
    const f = join(dir, 'b.zip');
    writeFileSync(f, zipBytes(entries, { time: Date.UTC(2026, 9, 1, 0, 0, 0) }));
    const py = spawnSync('python3', ['-c', 'import zipfile,sys,json;z=zipfile.ZipFile(sys.argv[1]);assert z.testzip() is None;print(json.dumps({i.filename:(i.file_size,i.CRC) for i in z.infolist()}))', f]);
    if (py.status === 0) {
      const got = JSON.parse(String(py.stdout));
      for (const e of entries) assert.deepEqual(got[e.name], [e.data.length, B.crc32(e.data)], e.name);
    } else assert.ok(py.error, 'python ran and refused: ' + String(py.stderr));
    const un = spawnSync('unzip', ['-tq', f]);
    if (!un.error) assert.equal(un.status, 0, String(un.stdout) + String(un.stderr));
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

/** A zip with deflate entries, the way the Files app writes one (written here by hand: local header, data, central directory). */
function zipDeflated(entries) {
  const parts = [], cds = [];
  let off = 0;
  for (const e of entries) {
    const name = Buffer.from(e.name), raw = Buffer.from(e.data), comp = deflateRawSync(raw);
    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0); lh.writeUInt16LE(20, 4); lh.writeUInt16LE(0x0800, 6); lh.writeUInt16LE(8, 8);
    lh.writeUInt32LE(B.crc32(raw), 14); lh.writeUInt32LE(comp.length, 18); lh.writeUInt32LE(raw.length, 22); lh.writeUInt16LE(name.length, 26);
    parts.push(lh, name, comp);
    const cd = Buffer.alloc(46);
    cd.writeUInt32LE(0x02014b50, 0); cd.writeUInt16LE(20, 4); cd.writeUInt16LE(20, 6); cd.writeUInt16LE(0x0800, 8); cd.writeUInt16LE(8, 10);
    cd.writeUInt32LE(B.crc32(raw), 16); cd.writeUInt32LE(comp.length, 20); cd.writeUInt32LE(raw.length, 24); cd.writeUInt16LE(name.length, 28); cd.writeUInt32LE(off, 42);
    cds.push(cd, name);
    off += 30 + name.length + comp.length;
  }
  const cdSize = cds.reduce((a, b) => a + b.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(entries.length, 8); end.writeUInt16LE(entries.length, 10); end.writeUInt32LE(cdSize, 12); end.writeUInt32LE(off, 16);
  return new Uint8Array(Buffer.concat([...parts, ...cds, end]));
}

test('a zip that was compressed on the way (the Files app deflates what it zips) reads back, given a way to inflate — and says so when it has none', async () => {
  const entries = [{ name: 'board.jsonl', data: enc('{"a":1}\n'.repeat(500)) }, { name: 'assets/x.png', data: noise(3000, 4) }];
  const bytes = zipDeflated(entries);
  const r = await B.zipRead(bytes, { inflate });
  assert.equal(r.ok, true);
  assert.deepEqual(r.entries.map((e) => e.data.length), entries.map((e) => e.data.length));
  assert.deepEqual(Array.from(r.entries[1].data), Array.from(entries[1].data));
  const none = await B.zipRead(bytes, {});
  assert.equal(none.ok, false);
  assert.match(none.words, /compress/i);
});

test('a file that is not a whole zip is a sentence, never a throw: garbage, a cut-off file, a smashed directory, a flipped byte', async () => {
  const good = zipBytes([{ name: 'board.jsonl', data: enc('{"a":1}\n') }, { name: 'assets/p.png', data: noise(5000, 2) }]);
  const cases = {
    'garbage': noise(500, 11),
    'empty': new Uint8Array(0),
    'cut off': good.slice(0, good.length - 30),
    'only the front': good.slice(0, 60),
    'text': enc('{"type":"format","format":"metamedium-log","version":1}\n'),
    'directory smashed': (() => { const c = good.slice(); for (let i = c.length - 60; i < c.length - 22; i++) c[i] ^= 0xFF; return c; })(),
  };
  for (const [what, bytes] of Object.entries(cases)) {
    let r;
    await assert.doesNotReject(async () => { r = await B.zipRead(bytes, { inflate }); }, what);
    assert.equal(r.ok, false, what);
    assert.ok(typeof r.words === 'string' && r.words.length > 20 && !/undefined|\[object/.test(r.words), what + ': ' + r.words);
  }
  // A byte flipped inside one entry's data: the file reads, the entry says it is bad (its checksum does not match).
  const flipped = good.slice(); flipped[good.length - 300] ^= 0x55;
  const r = await B.zipRead(flipped, { inflate });
  assert.equal(r.ok, true);
  assert.deepEqual(r.entries.map((e) => !!e.bad), [false, true]);
  assert.match(String(r.entries[1].bad), /checksum/);
});

test('a zip that claims more than it holds, or names a path out of its folder, is refused or left out — nothing is read past the file', async () => {
  const good = zipBytes([{ name: 'board.jsonl', data: enc('x\n') }]);
  // The directory says the data is a gigabyte long.
  const lie = good.slice();
  const dv = new DataView(lie.buffer);
  const eocd = lie.length - 22;
  const cdOff = dv.getUint32(eocd + 16, true);
  dv.setUint32(cdOff + 20, 0x7fffffff, true); dv.setUint32(cdOff + 24, 0x7fffffff, true);
  const r = await B.zipRead(lie, { inflate });
  assert.equal(r.ok, false);
  const out = await B.zipRead(zipBytes([{ name: '../../evil.txt', data: enc('x') }, { name: '/abs.txt', data: enc('y') }, { name: 'board.jsonl', data: enc('z') }]), {});
  assert.equal(out.ok, true);
  assert.deepEqual(out.entries.map((e) => e.name), ['board.jsonl']);
});

// ----- the bundle ------------------------------------------------------------------------

const HEX_A = createHash('sha256').update('picture a').digest('hex');
const HEX_B = createHash('sha256').update('picture b').digest('hex');
const asset = (text, mime) => { const bytes = enc(text); return { ref: 'sha256:' + createHash('sha256').update(bytes).digest('hex'), mime, bytes }; };

test('an asset is stored under assets/<hash>.<ext>, the extension the bytes are kept as', () => {
  assert.equal(B.assetEntryName('sha256:' + HEX_A, 'image/jpeg'), 'assets/' + HEX_A + '.jpg');
  assert.equal(B.assetEntryName('sha256:' + HEX_A, 'image/png'), 'assets/' + HEX_A + '.png');
  assert.equal(B.assetEntryName('sha256:' + HEX_A, 'image/webp'), 'assets/' + HEX_A + '.webp');
  assert.equal(B.assetEntryName('sha256:' + HEX_A, 'text/plain'), 'assets/' + HEX_A + '.bin');
  assert.equal(B.BUNDLE_LOG, 'board.jsonl');
});

test('a bundle is named for its board, as a zip a person can find in Files', () => {
  assert.equal(B.bundleName('My board'), 'My-board.dyna.zip');
  assert.equal(B.bundleName('Sketches / 2026: “bust”'), 'Sketches-2026-bust.dyna.zip');
  assert.equal(B.bundleName(''), 'board.dyna.zip');
  assert.equal(B.bundleName(null), 'board.dyna.zip');
  assert.ok(B.bundleName('x'.repeat(200)).length < 100);
});

test('a bundle round trip: the log first, each picture under its hash, read back with every hash verified', async () => {
  const a = asset('picture a bytes', 'image/jpeg'), b = asset('picture b bytes', 'image/png');
  const log = '{"type":"format","format":"metamedium-log","version":1,"assets":2}\n{"type":"import","asset":"' + a.ref + '"}\n';
  const z = B.bundleBuild({ log, assets: [b, a], time: Date.UTC(2026, 9, 1) });
  const bytes = join8(z.parts);
  const z2 = await B.zipRead(bytes, {});
  assert.equal(z2.entries[0].name, 'board.jsonl', 'the log is first, so a person opening it finds it first');
  assert.deepEqual(z2.entries.slice(1).map((e) => e.name), [B.assetEntryName(a.ref, a.mime), B.assetEntryName(b.ref, b.mime)].sort());
  const r = await B.bundleRead(bytes, { digest, inflate });
  assert.equal(r.ok, true);
  assert.equal(r.text, log);
  assert.deepEqual(r.damaged, []);
  assert.deepEqual(r.assets.map((x) => x.ref).sort(), [a.ref, b.ref].sort());
  for (const x of r.assets) { const want = x.ref === a.ref ? a : b; assert.equal(x.mime, want.mime); assert.deepEqual(Array.from(x.bytes), Array.from(want.bytes)); }
});

test('a picture whose bytes do not match their name is not kept and is said — the board and the sound pictures still open', async () => {
  const a = asset('picture a bytes', 'image/jpeg'), b = asset('picture b bytes', 'image/png');
  const liar = { ref: 'sha256:' + HEX_B, mime: 'image/png', bytes: enc('not what the name says') };
  const bytes = zipBytes([{ name: 'board.jsonl', data: enc('{"type":"x"}\n') }, ...[a, b, liar].map((x) => ({ name: B.assetEntryName(x.ref, x.mime), data: x.bytes }))]);
  const r = await B.bundleRead(bytes, { digest, inflate });
  assert.equal(r.ok, true);
  assert.equal(r.assets.length, 2);
  assert.equal(r.damaged.length, 1);
  assert.match(r.damaged[0].name, new RegExp(HEX_B.slice(0, 8)));
  assert.match(r.damaged[0].why, /fingerprint|match/);
  // …and a picture whose own checksum is off is the same: damaged, left out.
  const flipped = zipBytes([{ name: 'board.jsonl', data: enc('{"type":"x"}\n') }, { name: B.assetEntryName(a.ref, a.mime), data: a.bytes }]);
  flipped[Buffer.from(flipped).indexOf(Buffer.from('picture a bytes')) + 3] ^= 0x01;
  const r2 = await B.bundleRead(flipped, { digest, inflate });
  assert.equal(r2.ok, true);
  assert.equal(r2.assets.length, 0);
  assert.equal(r2.damaged.length, 1);
});

test('a bundle with no log, with a damaged log, or that is no zip at all is refused in a sentence', async () => {
  const a = asset('picture a bytes', 'image/jpeg');
  const noLog = await B.bundleRead(zipBytes([{ name: B.assetEntryName(a.ref, a.mime), data: a.bytes }]), { digest, inflate });
  assert.equal(noLog.ok, false);
  assert.match(noLog.words, /board\.jsonl/);
  const flipped = zipBytes([{ name: 'board.jsonl', data: enc('{"type":"x"}\n{"type":"y"}\n') }]);
  flipped[Buffer.from(flipped).indexOf(Buffer.from('"x"')) + 1] ^= 0x01;
  const bad = await B.bundleRead(flipped, { digest, inflate });
  assert.equal(bad.ok, false);
  assert.match(bad.words, /board\.jsonl|log/);
  const text = await B.bundleRead(enc('{"type":"x"}'), { digest, inflate });
  assert.equal(text.ok, false);
  assert.ok(text.words.length > 20);
  // A folder of files someone unzipped and zipped again by hand: the log may be one level down.
  const nested = await B.bundleRead(zipBytes([{ name: 'My board/board.jsonl', data: enc('{"type":"x"}\n') }, { name: 'My board/assets/' + HEX_A + '.jpg', data: enc('picture a') }]), { digest, inflate });
  assert.equal(nested.ok, true);
  assert.equal(nested.text, '{"type":"x"}\n');
});

// ----- base64, the picture the SVG carries -------------------------------------------------

test('base64Of is base64, whatever the length, and svgDataUrl carries any text — non-ASCII included — back out', () => {
  for (const n of [0, 1, 2, 3, 4, 5, 100, 4097]) { const b = noise(n, n + 1); assert.equal(B.base64Of(b), Buffer.from(b).toString('base64'), n + ' bytes'); }
  const svg = '<svg xmlns="http://www.w3.org/2000/svg"><text>café — 日本 <b>&amp;</b></text><script>alert(1)</script></svg>';
  const url = B.svgDataUrl(svg);
  assert.match(url, /^data:image\/svg\+xml;base64,[A-Za-z0-9+/=]+$/);
  assert.equal(Buffer.from(url.split(',')[1], 'base64').toString('utf8'), svg);
});

// ----- the board as one SVG --------------------------------------------------------------

const box = (minX, minY, maxX, maxY) => ({ minX, minY, maxX, maxY });
const JPEG_URL = 'data:image/jpeg;base64,/9j/AAAA';
const PNG_URL = 'data:image/png;base64,iVBORw0KGgo=';
const layers = () => [
  { kind: 'path', id: 'stroke:1', reads: 'circle', d: 'M0 0 L10 10' },
  { kind: 'picture', id: 'a', name: 'IMG 0001.jpg', box: box(0, 0, 300, 200), href: JPEG_URL },
  { kind: 'text', id: 't', name: 'note.txt', box: box(320, 0, 520, 60), text: 'Hello board\nsecond line', fitted: true },
  { kind: 'figure', id: 'f', name: 'logo.svg', box: box(0, 220, 200, 320), svg: '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4"/></svg>' },
  { kind: 'picture', id: 'b', name: 'b "quoted" <&>.png', box: box(320, 100, 520, 300), href: PNG_URL, turn: Math.PI / 2 },
  { kind: 'picture', id: 'c', name: 'lost.jpg', box: box(0, 340, 100, 400), href: null },
  { kind: 'path', id: 'stroke:2', reads: 'line "x"', d: 'M5 5 L50 50' },
];

test('the board as an SVG carries its pictures as <image> at their bounds, a figure as an image of its own svg, and writing as <text> — all under the ink, in board order', () => {
  const svg = B.boardSvg(layers(), box(0, 0, 520, 400), {});
  assert.match(svg, /^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg"[^>]*viewBox="-20 -20 560 440"/);
  const images = svg.match(/<image [^>]*>/g) || [];
  assert.equal(images.filter((i) => /href="data:image\/(jpeg|png);/.test(i)).length, 2, 'two pictures');
  assert.equal(images.filter((i) => /href="data:image\/svg\+xml;base64,/.test(i)).length, 1, 'one figure');
  const first = images.find((i) => /data:image\/jpeg/.test(i));
  assert.match(first, /x="0"/); assert.match(first, /y="0"/); assert.match(first, /width="300"/); assert.match(first, /height="200"/);
  assert.match(svg, /<text[^>]*>Hello board<\/text>/);
  assert.match(svg, /<text[^>]*textLength="[\d.]+"/, 'a caption is fitted to its box');
  // Under the ink: every picture, figure and text comes before every path.
  const lastBelow = Math.max(svg.lastIndexOf('<image'), svg.lastIndexOf('<text'));
  const firstInk = svg.indexOf('<path');
  assert.ok(firstInk > lastBelow, 'ink is last');
  assert.ok(svg.indexOf('data:image/jpeg') < svg.indexOf('data:image/png'), 'pictures in board order');
  // A turned picture is turned about its centre.
  assert.match(svg, /transform="rotate\(90 420 200\)"/);
  // A picture this device does not hold stands as its name in a dashed plate, never as nothing.
  assert.match(svg, /<rect[^>]*stroke-dasharray[^>]*\/>\s*<text[^>]*>lost\.jpg<\/text>/);
  // Names are escaped; nothing from a figure's own text is in the file but as base64.
  assert.match(svg, /b &quot;quoted&quot; &lt;&amp;&gt;\.png/);
  assert.ok(!/<script|<circle|"quoted" </.test(svg));
  // The ink keeps its names, as it always did.
  assert.match(svg, /<path data-node="stroke:1" data-reads="circle" d="M0 0 L10 10"/);
});

test('the frame of a board is its marks and a margin of twenty, in whole units — the one place the svg, the png and the pdf agree on where the board is', () => {
  assert.deepEqual(B.boardFrame(box(0, 0, 520, 400)), { x: -20, y: -20, w: 560, h: 440 });
  assert.deepEqual(B.boardFrame(box(10.4, 20.6, 110.2, 90.2)), { x: -10, y: 1, w: 140, h: 110 });
  assert.equal(B.pictureDataUrl('image/png', new Uint8Array([1, 2, 3])), 'data:image/png;base64,AQID');
});

test('with no pictures asked for the file leaves them out and keeps the rest (what a PNG draws over the pictures it draws itself)', () => {
  const svg = B.boardSvg(layers(), box(0, 0, 520, 400), { pictures: false });
  assert.ok(!/data:image\/(jpeg|png)/.test(svg));
  assert.match(svg, /data:image\/svg\+xml/);
  assert.match(svg, /<path /);
});

test('a ground, when asked, is the first thing drawn; a board with nothing in it is a one-pixel svg as it always was', () => {
  const svg = B.boardSvg(layers(), box(0, 0, 520, 400), { ground: '#fbfaf7' });
  assert.match(svg, /<rect [^>]*fill="#fbfaf7"[^>]*\/>/);
  assert.ok(svg.indexOf('fill="#fbfaf7"') < svg.indexOf('<image'));
  assert.equal(B.boardSvg([], null, {}), '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"></svg>');
});

test('writing that is a document rather than a caption flows at a size of its own, clipped to its box', () => {
  const text = Array.from({ length: 20 }, (_, i) => 'line ' + (i + 1)).join('\n');
  const svg = B.boardSvg([{ kind: 'text', id: 't', name: 'long.txt', box: box(0, 0, 300, 400), text, fitted: false }], box(0, 0, 300, 400), {});
  assert.match(svg, /<clipPath/);
  assert.equal((svg.match(/<text /g) || []).length, 20);
  assert.ok(!/textLength/.test(svg));
});

// ----- the picture of the board: its size ------------------------------------------------

test('the board is drawn at twice the size of its marks, held to what an iPad’s canvas can make — and says when it was scaled', () => {
  assert.equal(B.PNG_MAX_SIDE, 8192);
  assert.ok(B.PNG_MAX_PIXELS <= 16777216);
  const small = B.pngPlan(400, 300);
  assert.deepEqual([small.w, small.h, small.k, small.scaled], [800, 600, 2, false]);
  const wide = B.pngPlan(20000, 1000);
  assert.ok(wide.w <= B.PNG_MAX_SIDE && wide.scaled === true && wide.k < 1);
  assert.ok(Math.abs(wide.w / wide.h - 20) < 0.1);
  const huge = B.pngPlan(9000, 9000);
  assert.ok(huge.w * huge.h <= B.PNG_MAX_PIXELS && huge.scaled);
  assert.match(huge.said, /scaled/);
  assert.equal(small.said, '');
  assert.ok(B.pngPlan(0, 0).w >= 1);
});

// ----- the PDF ---------------------------------------------------------------------------

test('paper is Letter in the places that use it and A4 everywhere else', () => {
  assert.equal(B.paperOf('en-US'), 'Letter');
  assert.equal(B.paperOf('en-CA'), 'Letter');
  assert.equal(B.paperOf('es-MX'), 'Letter');
  assert.equal(B.paperOf('en-GB'), 'A4');
  assert.equal(B.paperOf('de-DE'), 'A4');
  assert.equal(B.paperOf(''), 'Letter');
  assert.equal(B.paperOf(undefined), 'Letter');
});

test('one page, turned the way the board lies, the board fitted inside a margin and said how much smaller it is', () => {
  const wide = B.pdfPlan(1600, 900, 'en-GB');
  assert.equal(wide.paper, 'A4'); assert.equal(wide.landscape, true);
  assert.deepEqual([wide.pageW, wide.pageH], [842, 595]);
  const tall = B.pdfPlan(900, 1600, 'en-US');
  assert.equal(tall.paper, 'Letter'); assert.equal(tall.landscape, false);
  assert.deepEqual([tall.pageW, tall.pageH], [612, 792]);
  for (const p of [wide, tall]) {
    assert.ok(p.box.x >= 30 && p.box.y >= 30 && p.box.x + p.box.w <= p.pageW - 30 && p.box.y + p.box.h <= p.pageH - 30, 'inside the margin');
    assert.ok(Math.abs(p.box.w / p.box.h - (p === wide ? 1600 / 900 : 900 / 1600)) < 0.01, 'the board’s own proportions');
    assert.ok(p.rasterW <= 3000 && p.rasterH <= 3000 && Math.max(p.rasterW, p.rasterH) >= 1200, 'sharp enough to print, small enough to hold');
    assert.ok(p.scale > 0 && p.scale < 1, 'a big board is smaller on paper');
    assert.match(p.said, /Letter|A4/);
    assert.match(p.said, /%/);
  }
  // A small board is not blown up past its own size.
  const tiny = B.pdfPlan(100, 60, 'en-US');
  assert.ok(tiny.scale <= 1 && tiny.box.w <= 100 * 1.0001);
});

/** A tiny reader for the PDFs this writes: its objects by offset, its xref table, its streams. */
function readPdf(bytes) {
  const text = Buffer.from(bytes).toString('latin1');
  const start = Number(/startxref\s+(\d+)\s+%%EOF\s*$/.exec(text)[1]);
  assert.equal(text.slice(start, start + 4), 'xref', 'startxref points at the table');
  const m = /xref\s+0 (\d+)\s+((?:\d{10} \d{5} [nf] ?\r?\n)+)/.exec(text.slice(start));
  const n = Number(m[1]);
  const offs = m[2].trim().split('\n').map((l) => Number(l.slice(0, 10)));
  assert.equal(offs.length, n);
  for (let i = 1; i < n; i++) assert.ok(text.slice(offs[i]).startsWith(i + ' 0 obj'), 'object ' + i + ' stands at its offset');
  return { text, n };
}

test('a PDF is written by hand: a header, a page of the right size, one picture, an xref that points at every object, a trailer', () => {
  const w = 40, h = 30;
  const rgb = noise(w * h * 3, 5);
  const bytes = B.pdfWrite({ pageW: 612, pageH: 792, box: { x: 36, y: 200, w: 540, h: 405 }, image: { w, h, filter: 'flate', data: new Uint8Array(deflateSync(Buffer.from(rgb))) }, title: 'My board — “one”', created: Date.UTC(2026, 9, 1) });
  const head = Buffer.from(bytes.slice(0, 9)).toString('latin1');
  assert.match(head, /^%PDF-1\.\d/);
  const { text } = readPdf(bytes);
  assert.ok(text.trimEnd().endsWith('%%EOF'));
  assert.equal((text.match(/\/Type \/Page\b/g) || []).length, 1);
  assert.match(text, /\/MediaBox \[0 0 612 792\]/);
  assert.equal((text.match(/\/Subtype \/Image/g) || []).length, 1);
  assert.match(text, /\/Width 40/); assert.match(text, /\/Height 30/);
  assert.match(text, /\/ColorSpace \/DeviceRGB/); assert.match(text, /\/Filter \/FlateDecode/);
  // The picture is placed where the box says, in PDF's up-is-positive space: 540 × 405 at (36, 792 − 200 − 405).
  assert.match(text, /540 0 0 405 36 187 cm/);
  // The stream is exactly as long as it says, and inflates to the pixels.
  const lenM = /\/Subtype \/Image[^>]*?\/Length (\d+)/s.exec(text) || /\/Length (\d+)[^>]*?\/Subtype \/Image/s.exec(text);
  const at = text.indexOf('stream\n', text.indexOf('/Subtype /Image')) + 7;
  const len = Number(lenM[1]);
  assert.equal(text.slice(at + len, at + len + 10).replace(/\r?\n/g, '\n').startsWith('\nendstream'), true);
  const pixels = inflateSync(Buffer.from(bytes.slice(at, at + len)));
  assert.deepEqual(Array.from(pixels), Array.from(rgb));
  // The title is in the info, its non-ASCII safe as a hex string, never raw.
  assert.match(text, /\/Title <FEFF[0-9A-F]+>/);
  assert.match(text, /\/CreationDate \(D:20261001/);
});

test('a PDF can carry the picture as a JPEG untouched (where a browser has no way to compress), and Python reads either', () => {
  const jpeg = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 1, 2, 3, 4, 0xFF, 0xD9]);
  const bytes = B.pdfWrite({ pageW: 595, pageH: 842, box: { x: 30, y: 30, w: 100, h: 50 }, image: { w: 8, h: 4, filter: 'dct', data: jpeg }, title: 'x' });
  const { text } = readPdf(bytes);
  assert.match(text, /\/Filter \/DCTDecode/);
  const at = Buffer.from(bytes).indexOf(Buffer.from([0xFF, 0xD8, 0xFF, 0xE0]));
  assert.deepEqual(Array.from(bytes.slice(at, at + jpeg.length)), Array.from(jpeg));
  // Whole-file check with a real reader where one is here.
  const dir = mkdtempSync(join(tmpdir(), 'mm-pdf-'));
  try {
    const f = join(dir, 'b.pdf');
    const w = 16, h = 8;
    writeFileSync(f, B.pdfWrite({ pageW: 595, pageH: 842, box: { x: 30, y: 30, w: 400, h: 200 }, image: { w, h, filter: 'flate', data: new Uint8Array(deflateSync(Buffer.alloc(w * h * 3, 200))) }, title: 'one' }));
    const py = spawnSync('python3', ['-c', 'import sys\nraw=open(sys.argv[1],"rb").read()\nassert raw.startswith(b"%PDF-") and raw.rstrip().endswith(b"%%EOF")\nprint("ok")', f]);
    if (py.status === 0) assert.match(String(py.stdout), /ok/);
    const qp = spawnSync('qpdf', ['--check', f]);
    if (!qp.error) assert.equal(qp.status, 0, String(qp.stdout) + String(qp.stderr));
    const pi = spawnSync('pdfinfo', [f]);
    if (!pi.error) { assert.equal(pi.status, 0, String(pi.stderr)); assert.match(String(pi.stdout), /Pages:\s+1/); }
  } finally { rmSync(dir, { recursive: true, force: true }); }
});
