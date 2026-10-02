#!/usr/bin/env node
//
// A board of pictures traced into ink, panned (V1-PLAN P1; PERF.md "After P1").
//
//     node e2e/pictures.mjs                      # 3 pictures of 1,667 traced strokes + 2 SVGs, Chromium
//     node e2e/pictures.mjs --pictures=5 --strokes=1000 --svgs=5
//
// Beside the gate, like `perf.mjs`, on its servers and model guard, and never
// run by it: its product is numbers — a paint's JavaScript, a pan frame's
// interval, and how many `stroke()` calls a paint makes — for this machine, each
// view with the ink's raster (P1) and without it (`mm.setInkCache(false)`: every
// mark stroked every frame, the paint as it was).
// Headless Chromium rasterises on the CPU, so a frame here is not an iPad's.

import { chromium } from 'playwright';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startStatic } from './servers.mjs';
import { isModelRequest } from './guards.mjs';
import { serveBoard, openBoard, tools, fmt, countCanvasCalls } from './budgets.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const { loadCore, summarize, args } = await import('../metamedium-core/bench/lib.mjs');
const { importedBoard } = await import('../metamedium-core/bench/board.mjs');
const a = args();
const pictures = Number(a.pictures || 3), strokesEach = Number(a.strokes || 1667), svgs = Number(a.svgs ?? 2);

const { core } = await loadCore('bundle');
const made = importedBoard(core, { pictures, strokesEach, svgs });
const board = { marks: made.marks, events: made.events.length, json: JSON.stringify(made.events), jsonl: core.encodeLog(made.events) };
const server = await startStatic(root);
const browser = await chromium.launch();
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  await context.route('**/*', (route) => (isModelRequest(route.request().url(), [server.origin]) ? route.abort('blockedbyclient') : route.continue()));
  await serveBoard(context, server.origin, board);
  await context.addInitScript(countCanvasCalls);
  const { out, page } = await openBoard(context, server.origin, { capMs: 5 * 60000 });
  if (!page) throw new Error('did not open: ' + out.why);
  console.log(`board: ${made.marks} traced strokes, ${pictures} pictures + ${svgs} SVGs · opened in ${fmt(out.drawnMs)}`);
  await page.evaluate(tools);
  await page.waitForTimeout(1500);
  const result = {};
  const views = [['fit-all', async () => { await page.evaluate(() => window.__mm.fitAll()); }],
    ['zoom 1', async () => { const box = await page.evaluate(() => window.__perfTools.worldBox()); await page.evaluate(([x, y]) => window.__mm.setView(1, 720 - x, 450 - y), [(box.minX + box.maxX) / 2, (box.minY + box.maxY) / 2]); }]];
  // Each view twice: with the ink's raster (V1-PLAN P1) and without it, every mark stroked every frame — what the paint did before.
  for (const [name, setup] of views) {
    for (const raster of [false, true]) {
      await page.evaluate((on) => window.__mm.setInkCache(on), raster);
      await setup();
      await page.waitForTimeout(800); // the raster is drawn once the paint has asked for it for INK_CACHE_SETTLE_MS
      const before = await page.evaluate(() => window.__mm.inkCache());
      const calls = await page.evaluate(() => { const v = window.__mm.view; window.__canvasCalls.reset(); window.__mm.setView(v.zoom, v.panX, v.panY); return window.__canvasCalls.take(); });
      const renders = summarize(await page.evaluate(() => window.__perfTools.renders(8)));
      const pan = await page.evaluate(() => window.__perfTools.pan(60, 6, 4));
      const handler = summarize(pan.handler), interval = summarize(pan.intervals);
      const after = await page.evaluate(() => window.__mm.inkCache());
      const label = `${name}${raster ? ' + raster' : ''}`;
      result[label] = { calls, render: renders, handler, interval, cache: { builds: after.builds - before.builds, hits: after.hits - before.hits, live: after.live - before.live } };
      console.log(`${label.padEnd(18)} a paint makes ${String(calls.stroke).padStart(6)} stroke() · paint JS median ${fmt(renders.median).padStart(7)} · pan frame interval median ${fmt(interval.median).padStart(7)} p95 ${fmt(interval.p95).padStart(7)} · over 60 pans the raster was drawn ${after.builds - before.builds}× and blitted ${after.hits - before.hits}×`);
    }
  }
  if (a.json) console.log(JSON.stringify(result));
} finally {
  await browser.close();
  await server.stop();
}
