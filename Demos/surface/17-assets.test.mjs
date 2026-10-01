// The asset store's decisions, on their own.
//
//   node --test Demos/surface/17-assets.test.mjs
//
// 17-assets.js is the pure half of keeping pictures (PLAN-IPAD-NOTES I1): what a picture is kept as,
// the name it gets, where a pick is laid out, which assets nothing uses any more, and what the decoded
// pictures cost. Like 17-board.js it names nothing outside itself — no DOM, no storage, no session — so
// it loads here exactly as the browser loads it. 18-images.js is the adapter (IndexedDB, workers, canvas).
//
// Not part of the built surface — Demos/build-surface.mjs concatenates `/^\d\d-.*\.js$/`.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const NAMES = [
  'ASSET_LONG_SIDE', 'ASSET_GRACE_MS', 'sha256Hex', 'assetRef', 'isAssetRef', 'fitLongSide', 'pictureFormat', 'pictureExt',
  'safePictureName', 'uniquePicturePath', 'assetsOfEvents', 'assetGcPlan', 'pictureGrid', 'pictureCells', 'fitInCell', 'clearShift', 'pickWords',
  'pictureTier', 'decodedCost', 'evictPlan', 'PICTURE_THUMB_PX', 'DECODED_BUDGET_PX',
];
const file = join(dirname(fileURLToPath(import.meta.url)), '17-assets.js');
const A = (() => {
  if (!existsSync(file)) return {};
  const src = readFileSync(file, 'utf8');
  return new Function(src + '\n  return { ' + NAMES.map((n) => n + ': typeof ' + n + " === 'undefined' ? undefined : " + n).join(', ') + ' };')();
})();

const hex = (c) => c.repeat(64);

test('sha256Hex is SHA-256: the empty string, a short one, and 100 KB of noise', () => {
  const enc = (s) => new TextEncoder().encode(s);
  assert.equal(A.sha256Hex(new Uint8Array(0)), createHash('sha256').update('').digest('hex'));
  assert.equal(A.sha256Hex(enc('abc')), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad');
  const big = new Uint8Array(100000);
  let a = 7; for (let i = 0; i < big.length; i++) { a = (a * 1664525 + 1013904223) >>> 0; big[i] = a >>> 24; }
  assert.equal(A.sha256Hex(big), createHash('sha256').update(big).digest('hex'));
  // The padding's edges: 55, 56 and 64 bytes.
  for (const n of [55, 56, 63, 64, 65]) assert.equal(A.sha256Hex(new Uint8Array(n).fill(97)), createHash('sha256').update(Buffer.alloc(n, 97)).digest('hex'), n + ' bytes');
});

test('an asset reference is sha256: and 64 hex digits, and nothing else is one', () => {
  assert.equal(A.assetRef(hex('a')), 'sha256:' + hex('a'));
  assert.equal(A.isAssetRef('sha256:' + hex('0')), true);
  for (const bad of ['', null, undefined, 3, 'sha256:abc', 'sha256:' + hex('G'), 'sha1:' + hex('a'), 'sha256:' + hex('A'), '../' + hex('a'), 'sha256:' + hex('a') + '/x']) assert.equal(A.isAssetRef(bad), false, String(bad));
});

test('a picture is fitted to a long side of 2,560 and never enlarged', () => {
  assert.equal(A.ASSET_LONG_SIDE, 2560);
  assert.deepEqual(A.fitLongSide(4032, 3024, 2560), { w: 2560, h: 1920, scaled: true });
  assert.deepEqual(A.fitLongSide(3024, 4032, 2560), { w: 1920, h: 2560, scaled: true });
  assert.deepEqual(A.fitLongSide(800, 600, 2560), { w: 800, h: 600, scaled: false });
  assert.deepEqual(A.fitLongSide(2560, 100, 2560), { w: 2560, h: 100, scaled: false });
  // A sliver never rounds to nothing.
  assert.deepEqual(A.fitLongSide(100000, 3, 2560), { w: 2560, h: 1, scaled: true });
  assert.deepEqual(A.fitLongSide(0, 0, 2560), { w: 1, h: 1, scaled: false });
});

test('a picture is kept as a JPEG, WebP where it is clearly smaller, PNG where it has transparency', () => {
  assert.equal(A.pictureFormat({ hasAlpha: false, jpegBytes: 500000, webpBytes: null }), 'jpeg');
  assert.equal(A.pictureFormat({ hasAlpha: false, jpegBytes: 500000, webpBytes: 300000 }), 'webp');
  assert.equal(A.pictureFormat({ hasAlpha: false, jpegBytes: 500000, webpBytes: 480000 }), 'jpeg', 'a few percent is not worth a format Safari may not draw');
  assert.equal(A.pictureFormat({ hasAlpha: true, jpegBytes: 500000, webpBytes: 300000 }), 'png');
  assert.equal(A.pictureExt('jpeg'), 'jpg');
  assert.equal(A.pictureExt('webp'), 'webp');
  assert.equal(A.pictureExt('png'), 'png');
});

test('a picture\'s name is made safe, and a path is unique when two pictures share a name', () => {
  assert.equal(A.safePictureName('IMG 0001 (1).JPG'), 'IMG-0001-1-.JPG');
  assert.equal(A.safePictureName(''), 'picture');
  assert.equal(A.safePictureName(null), 'picture');
  const taken = new Set();
  const first = A.uniquePicturePath('image.jpg', taken, 'jpg');
  assert.equal(first, 'imports/image.jpg');
  taken.add(first);
  const second = A.uniquePicturePath('image.jpg', taken, 'jpg');
  assert.equal(second, 'imports/image-2.jpg');
  taken.add(second);
  assert.equal(A.uniquePicturePath('image.jpg', taken, 'jpg'), 'imports/image-3.jpg');
  // The kept format decides the extension: a HEIC or PNG name kept as JPEG says so.
  assert.equal(A.uniquePicturePath('IMG_1.HEIC', new Set(), 'jpg'), 'imports/IMG_1.jpg');
  assert.equal(A.uniquePicturePath('shot.png', new Set(), 'png'), 'imports/shot.png');
  assert.equal(A.uniquePicturePath('', new Set(), 'webp'), 'imports/picture.webp');
});

test('the assets a log uses are the ones its imports name, each once', () => {
  const evs = [
    { type: 'stroke', points: [] },
    { type: 'import', kind: 'jpg', path: 'a', asset: 'sha256:' + hex('a') },
    { type: 'import', kind: 'jpg', path: 'b', asset: 'sha256:' + hex('b') },
    { type: 'import', kind: 'jpg', path: 'c', asset: 'sha256:' + hex('a') },
    { type: 'import', kind: 'md', path: 'd', code: 'x' },
    { type: 'import', kind: 'jpg', path: 'e', asset: 'not-a-ref' },
    null,
  ];
  assert.deepEqual([...A.assetsOfEvents(evs)].sort(), ['sha256:' + hex('a'), 'sha256:' + hex('b')]);
  assert.equal(A.assetsOfEvents(null).size, 0);
});

test('collecting: an asset no board uses goes, unless it is new, in flight, or used', () => {
  const NOW = 10_000_000;
  const ref = (c) => 'sha256:' + hex(c);
  const held = [{ hash: ref('a'), at: 1000 }, { hash: ref('b'), at: 1000 }, { hash: ref('c'), at: NOW - 1000 }, { hash: ref('d'), at: 1000 }, { hash: ref('e'), at: 1000 }];
  const used = new Set([ref('a')]);
  const plan = A.assetGcPlan(held, used, { now: NOW, graceMs: 30000, pending: new Set([ref('e')]) });
  assert.deepEqual(plan.drop.slice().sort(), [ref('b'), ref('d')]);
  assert.deepEqual(plan.keep.slice().sort(), [ref('a'), ref('c'), ref('e')]);
  // With no grace a new one goes too — what the e2e asks.
  assert.deepEqual(A.assetGcPlan(held, used, { now: NOW, graceMs: 0, pending: new Set() }).drop.sort(), [ref('b'), ref('c'), ref('d'), ref('e')]);
  assert.equal(A.ASSET_GRACE_MS > 0, true);
  // Nothing held, nothing to do.
  assert.deepEqual(A.assetGcPlan([], used, { now: NOW, graceMs: 0, pending: new Set() }), { drop: [], keep: [] });
});

test('a pick is laid out in a grid in the view, not stacked on one point', () => {
  const view = { minX: 0, minY: 0, maxX: 1600, maxY: 900 };
  const sizes = [{ w: 2560, h: 1920 }, { w: 1920, h: 2560 }, { w: 800, h: 600 }, { w: 2560, h: 1440 }, { w: 1000, h: 1000 }];
  const g = A.pictureGrid(sizes, view);
  assert.equal(g.length, sizes.length);
  // Nothing overlaps, and each keeps its own proportions.
  for (let i = 0; i < g.length; i++) {
    assert.ok(Math.abs(g[i].w / g[i].h - sizes[i].w / sizes[i].h) < 1e-6, 'proportions ' + i);
    for (let j = i + 1; j < g.length; j++) {
      const sep = g[i].x + g[i].w <= g[j].x || g[j].x + g[j].w <= g[i].x || g[i].y + g[i].h <= g[j].y || g[j].y + g[j].h <= g[i].y;
      assert.ok(sep, i + ' and ' + j + ' overlap');
    }
  }
  // The grid begins in the view, reading order: left to right, then down.
  assert.ok(g[0].x >= view.minX && g[0].y >= view.minY && g[0].x < view.maxX && g[0].y < view.maxY);
  assert.ok(g[1].x > g[0].x && g[1].y === g[0].y, 'the second beside the first');
  const rows = [...new Set(g.map((p) => Math.round(p.y)))];
  assert.ok(rows.length >= 2, 'more than a row for five pictures in a wide view');
  // One picture is bigger than one of many; a lone one still fits the view.
  const one = A.pictureGrid([{ w: 2560, h: 1920 }], view)[0];
  assert.ok(one.w > g[0].w && one.h <= (view.maxY - view.minY));
  assert.deepEqual(A.pictureGrid([], view), []);
  // A view with no size is no reason to throw.
  assert.equal(A.pictureGrid([{ w: 10, h: 10 }, { w: 10, h: 10 }], { minX: 0, minY: 0, maxX: 0, maxY: 0 }).length, 2);
});

test('the status line says how far a pick has come, in the person\'s words', () => {
  assert.equal(A.pickWords(3, 10), '3 of 10 pictures');
  assert.equal(A.pickWords(1, 1), '1 picture');
  assert.equal(A.pickWords(2, 2), '2 of 2 pictures');
  assert.equal(A.pickWords(0, 1), '1 picture');
});

test('a picture is decoded small until the screen wants it large', () => {
  assert.equal(A.PICTURE_THUMB_PX > 0 && A.PICTURE_THUMB_PX < A.ASSET_LONG_SIDE, true);
  assert.equal(A.pictureTier(200), 'thumb');
  assert.equal(A.pictureTier(A.PICTURE_THUMB_PX), 'thumb');
  assert.equal(A.pictureTier(A.PICTURE_THUMB_PX + 1), 'full');
  assert.equal(A.pictureTier(4000), 'full');
  assert.equal(A.decodedCost({ w: 2560, h: 1920 }, 'full'), 2560 * 1920);
  const t = A.decodedCost({ w: 2560, h: 1920 }, 'thumb');
  assert.ok(t < 2560 * 1920 / 10 && t > 0);
});

test('what the decoded pictures cost is held to a budget: the least recently drawn go, never one just drawn', () => {
  const NOW = 100000;
  const e = (key, cost, drawn) => ({ key, cost, drawn });
  const entries = [e('a', 5_000_000, NOW), e('b', 5_000_000, NOW - 60000), e('c', 5_000_000, NOW - 90000), e('d', 1_000_000, NOW - 1000)];
  // Over budget: drop oldest first until it fits; a picture drawn in this paint stays whatever it costs.
  const plan = A.evictPlan(entries, { budgetPx: 8_000_000, now: NOW, paintedAt: NOW });
  assert.deepEqual(plan, ['c', 'b']);
  // Within budget nothing goes, however old.
  assert.deepEqual(A.evictPlan(entries, { budgetPx: 20_000_000, now: NOW, paintedAt: NOW }), []);
  // A budget that cannot be met by the unpainted ones leaves the painted ones alone.
  assert.deepEqual(A.evictPlan([e('a', 9e6, NOW), e('b', 9e6, NOW)], { budgetPx: 1000, now: NOW, paintedAt: NOW }), []);
  assert.equal(A.DECODED_BUDGET_PX >= 16_000_000, true);
});

test('a pick can be placed a picture at a time: the cells depend on the count and the view, never on the pictures', () => {
  const view = { minX: 100, minY: 50, maxX: 1700, maxY: 950 };
  const cells = A.pictureCells(4, view);
  assert.equal(cells.length, 4);
  for (const c of cells) assert.ok(c.x >= view.minX && c.y >= view.minY && c.w > 0 && c.h > 0);
  const a = A.fitInCell({ w: 2560, h: 1920 }, cells[0]), b = A.fitInCell({ w: 1920, h: 2560 }, cells[1]);
  assert.ok(a.w <= cells[0].w + 1e-9 && a.h <= cells[0].h + 1e-9 && b.w <= cells[1].w + 1e-9 && b.h <= cells[1].h + 1e-9);
  assert.equal(a.x, cells[0].x); assert.equal(b.y, cells[1].y);
  // The same pictures, whole, stand where the pick was placed one at a time.
  assert.deepEqual(A.pictureGrid([{ w: 2560, h: 1920 }, { w: 1920, h: 2560 }, { w: 1, h: 1 }, { w: 1, h: 1 }], view).slice(0, 2), [a, b]);
  assert.deepEqual(A.pictureCells(0, view), []);
});

test('a pick stands clear of what is on the board: where the view says if that is free, else just past what is in the way', () => {
  const view = { minX: 0, minY: 0, maxX: 1000, maxY: 700 };
  const cells = A.pictureCells(1, view);
  assert.deepEqual(A.clearShift(cells, [], 20), { dx: 0, dy: 0, moved: false });
  // Far away from the cells: nothing in the way.
  assert.deepEqual(A.clearShift(cells, [{ minX: 5000, minY: 5000, maxX: 5100, maxY: 5100 }], 20), { dx: 0, dy: 0, moved: false });
  // A picture where the cell is: the next stands just right of it.
  const first = A.fitInCell({ w: 4, h: 3 }, cells[0]);
  const one = A.clearShift(cells, [{ minX: first.x, minY: first.y, maxX: first.x + first.w, maxY: first.y + first.h }], 20);
  assert.equal(one.moved, true);
  assert.equal(cells[0].x + one.dx, first.x + first.w + 20);
  // Something in the way there too: past that as well.
  const second = { minX: first.x + first.w + 20, minY: first.y, maxX: first.x + first.w + 20 + 300, maxY: first.y + 200 };
  const two = A.clearShift(cells, [{ minX: first.x, minY: first.y, maxX: first.x + first.w, maxY: first.y + first.h }, second], 20);
  assert.equal(cells[0].x + two.dx, second.maxX + 20);
  // Marks above or below the band the cells stand in are not in the way.
  assert.deepEqual(A.clearShift(cells, [{ minX: 0, minY: 5000, maxX: 9999, maxY: 5100 }], 20).moved, false);
  assert.deepEqual(A.clearShift([], [{ minX: 0, minY: 0, maxX: 1, maxY: 1 }], 20), { dx: 0, dy: 0, moved: false });
});
