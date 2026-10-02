#!/usr/bin/env node
//
// The surface's side of the performance baseline (V1-PLAN.md §9 R4a; PERF.md).
//
//     node e2e/perf.mjs                           # Chromium, boards of 500 and 2,000
//     node e2e/perf.mjs --sizes=500,2000,5000     # …and 5,000, capped (--cap-min=20)
//     node e2e/perf.mjs --browser=webkit --sizes=500
//
// A runner beside the gate, not a scenario in it: it reuses the gate's servers
// (`servers.mjs`, a static server over the repo root on a free port of
// 127.0.0.1, no-store) and its guard (`guards.mjs` — nothing reaches a real
// model; every model endpoint is aborted at the context), opens a FRESH
// context per board, and writes what it measured to `e2e/results/perf/`.
// It fails nothing: its product is numbers, and beside them each budget
// (`budgets.mjs`, the same one the gate's `budgets` scenario records) said
// within or over, with the machine's calibration. The boards
// are the engine benchmark's own (`core/bench/board.mjs`), made
// from the same seed, and served to the page from memory — no board is ever
// written to disk.
//
// What is measured, per board:
//
//   open    — from navigation to the first animation frame whose callback
//             finds the whole log in the session: the board drawn. Two ways
//             in: *restore* (the log in browser storage, as a reload finds
//             your own board — seeded on a blank same-origin page first, which
//             is also how the storage quota is found) and *folder* (the log
//             as a published canvas, `?folder=`, served by a route).
//   render  — one paint at a fixed view, alone (`__mm.setView`, same view).
//   pan     — one wheel event per frame for 60 frames, the way a trackpad
//             delivers them: the handler's time (a full render per event)
//             and the interval between frames. At fit-all and at zoom 1.
//   draw    — five boxes drawn with real mouse input (Playwright's pointer,
//             trusted events): each move's handler time, the frame interval
//             while drawing, and from the release to the first frame after
//             it — the stroke read and its reading drawn under it.
//   save    — autosave's own work: the whole log stringified and put in
//             browser storage (17-folder.js saveNow), and whether it fits.
//
// A stub model is joined once the board is open (the gate's way: `fetch`
// replaced, an agent named perf-stub); `render()` never asks a model.
// Chromium only: CPU profiles of the pan and of one stroke, and the renderer's
// heap. The viewport is the gate's, 1440×900 at device scale 1; headless
// Chromium rasterises on the CPU, so a frame's paint here is not a GPU's.

import { chromium, webkit } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import os from 'node:os';
import { startStatic } from './servers.mjs';
import { isModelRequest } from './guards.mjs';
import { probe, tools, serveBoard, openBoard as openFolder, interact as work, judge, fmt, calibrateInPage, tooLoaded, rendererInPage, softwareRaster, CALIBRATION_MS } from './budgets.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const OUT = join(here, 'results', 'perf');
const { loadCore, summarize, args } = await import('../core/bench/lib.mjs');
const { generateBoard } = await import('../core/bench/board.mjs');

const a = args();
const engineName = a.browser || 'chromium';
const ENGINES = { chromium, webkit };
if (!ENGINES[engineName]) throw new Error(`unknown browser "${engineName}"`);
const sizes = String(a.sizes || '500,2000').split(',').map(Number);
const capMs = Number(a['cap-min'] || 20) * 60000;
const seed = Number(a.seed || 1);
const paths = String(a.paths || 'restore,folder').split(',');
const strokesToDraw = Number(a.strokes || 5);
const say = (s) => console.log(s);
/** One file per browser and set of sizes, so one run never writes over another's numbers. */
const RESULT_FILE = join(OUT, `perf-${engineName}-${sizes.join('-')}.json`);

// ---------------------------------------------------------------------------

async function freshContext(browser, origin, board) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const blocked = [];
  await context.route('**/*', async (route) => {
    const url = route.request().url();
    const hit = isModelRequest(url, [origin]);
    if (hit) { blocked.push(url); await route.abort('blockedbyclient'); return; }
    await route.continue();
  });
  await serveBoard(context, origin, board);
  return { context, blocked };
}

/** Open the board one way; resolves with the numbers, or with why it did not open. */
async function open(browser, origin, board, how) {
  const { context, blocked } = await freshContext(browser, origin, board);
  const errors = [];
  context.on('page', (page) => page.on('pageerror', (e) => errors.push(String(e && e.message ? e.message : e).slice(0, 300))));
  if (how === 'folder') {
    const { out, page } = await openFolder(context, origin, { capMs });
    Object.assign(out, { blocked, errors });
    return { out, context, page };
  }
  // restore: a blank page on the same origin puts the log where the surface's
  // old autosave left it (the board imports it into its own store); the
  // quota is found here, not assumed.
  const page = await context.newPage();
  const out = { how };
  let crashed = null;
  page.on('crash', () => { crashed = new Date().toISOString(); });
  try {
    await page.goto(`${origin}/404.html`, { waitUntil: 'load' });
    const seeded = await page.evaluate(async () => {
      const text = await (await fetch('/__perf/board.json')).text();
      try { localStorage.setItem('mm-log', text); return { ok: true, chars: text.length }; }
      catch (err) { return { ok: false, chars: text.length, error: String(err && err.name ? err.name + ': ' + err.message : err) }; }
    });
    out.seeded = seeded;
    if (!seeded.ok) { out.opened = false; out.why = 'browser storage refused the log: ' + seeded.error; return { out, context, page: null }; }
    await page.close();
    const got = await openFolder(context, origin, { capMs, url: `${origin}/Demos/session-engine.html?nosw=1` });
    Object.assign(got.out, { how, seeded, blocked, errors, crashed });
    return { out: got.out, context, page: got.page };
  } catch (err) {
    out.opened = false;
    out.why = String(err && err.message ? err.message : err).split('\n')[0];
    out.crashed = crashed;
    return { out, context, page: null };
  }
}

const wantProfiles = engineName === 'chromium' && !a['no-profile'];
async function profile(page, context, name, fn) {
  if (!wantProfiles) return fn();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Profiler.enable');
  await cdp.send('Profiler.setSamplingInterval', { interval: 500 });
  await cdp.send('Profiler.start');
  let value;
  try { value = await fn(); } finally {
    const { profile: prof } = await cdp.send('Profiler.stop');
    mkdirSync(OUT, { recursive: true });
    writeFileSync(join(OUT, `${name}.cpuprofile`), JSON.stringify(prof));
    await cdp.detach().catch(() => {});
  }
  return value;
}

/** Everything a hand does on an open board (budgets.mjs), with CPU profiles of the pans and one stroke. */
async function interact(page, context, size) {
  return work(page, { summarize, strokes: strokesToDraw, size, profile: (name, fn) => profile(page, context, name, fn) });
}

/**
 * How much browser storage takes under one key — where autosave (the whole
 * log, 17-folder.js saveNow) stops saving. Found by halving, not assumed.
 */
async function storageQuota(browser, origin) {
  const context = await browser.newContext();
  try {
    const page = await context.newPage();
    await page.goto(`${origin}/404.html`, { waitUntil: 'load' });
    return await page.evaluate(() => {
      let lo = 0, hi = 64 * 1024 * 1024, error = null;
      while (hi - lo > 4096) {
        const mid = Math.floor((lo + hi) / 2);
        try { localStorage.setItem('mm-quota-probe', 'x'.repeat(mid)); lo = mid; }
        catch (err) { hi = mid; error = String(err && err.name ? err.name : err); }
        try { localStorage.removeItem('mm-quota-probe'); } catch (err) { /* nothing */ }
      }
      return { chars: lo, error };
    });
  } finally {
    await context.close().catch(() => {});
  }
}

async function main() {
  mkdirSync(OUT, { recursive: true });
  const { core } = await loadCore('bundle');
  const server = await startStatic(root);
  say(`· static ${server.origin} (repo root, no-store)`);
  const browser = await ENGINES[engineName].launch({ headless: a.headed ? false : true });
  const report = {
    at: new Date().toISOString(),
    browser: engineName,
    browserVersion: browser.version(),
    node: process.version,
    cpu: os.cpus()[0] && os.cpus()[0].model,
    loadavg: os.loadavg().map((x) => +x.toFixed(2)),
    viewport: '1440x900 @1x, headless',
    capMin: capMs / 60000,
    sizes: {},
  };
  say(`· ${engineName} ${report.browserVersion} · load ${report.loadavg.join(' ')}`);
  report.storageQuota = await storageQuota(browser, server.origin).catch((err) => ({ error: String(err && err.message ? err.message : err) }));
  say(`· browser storage takes at most ${report.storageQuota.chars ? (report.storageQuota.chars / 1048576).toFixed(2) + ' M characters under one key' : '? (' + report.storageQuota.error + ')'}`);
  try {
    for (const size of sizes) {
      const { events, stats } = generateBoard(core, { marks: size, seed });
      const board = { events: events.length, json: JSON.stringify(events), jsonl: core.encodeLog(events) };
      const res = { marks: stats.marks, events: events.length, jsonMB: +(board.json.length / 1048576).toFixed(2), open: {} };
      report.sizes[size] = res;
      say(`\n▸ ${size} marks · ${res.jsonMB} MB of log`);
      let interactive = null;
      for (const how of paths) {
        const { out, context, page } = await open(browser, server.origin, board, how);
        res.open[how] = out;
        say(out.opened
          ? `  open (${how}): board drawn ${(out.drawnMs / 1000).toFixed(2)} s after navigation · longest task ${out.longestTaskMs ?? '—'} ms · heap ${out.heap ? out.heap.usedMB + ' of ' + out.heap.limitMB + ' MB' : '—'}`
          : `  open (${how}): did not open — ${out.why}`);
        writeFileSync(RESULT_FILE, JSON.stringify(report, null, 2));
        if (out.opened && !interactive && !a['no-interact']) {
          interactive = how;
          try {
            res.interact = await interact(page, context, size);
            res.interact.on = how;
            const i = res.interact;
            say(`  render alone: fit ${i.renderFit.median.toFixed(1)} ms, zoom 1 ${i.renderWork.median.toFixed(1)} ms`);
            say(`  pan (fit): handler ${i.panFit.handler.median.toFixed(1)} / p95 ${i.panFit.handler.p95.toFixed(1)} ms · frame ${i.panFit.interval.median.toFixed(1)} / p95 ${i.panFit.interval.p95.toFixed(1)} ms`);
            say(`  pan (zoom 1): handler ${i.panWork.handler.median.toFixed(1)} / p95 ${i.panWork.handler.p95.toFixed(1)} ms · frame ${i.panWork.interval.median.toFixed(1)} / p95 ${i.panWork.interval.p95.toFixed(1)} ms`);
            say(`  draw: move handler ${i.draw.move.median.toFixed(1)} / p95 ${i.draw.move.p95.toFixed(1)} ms · frame ${i.draw.frameWhileDrawing.median.toFixed(1)} / p95 ${i.draw.frameWhileDrawing.p95.toFixed(1)} ms`);
            say(`  release → reading drawn: median ${i.draw.releaseToFrame.median.toFixed(0)} ms, p95 ${i.draw.releaseToFrame.p95.toFixed(0)} ms (read as ${i.draw.readings.join(', ')})`);
            say(`  autosave: stringify ${i.save.stringify.toFixed(0)} ms, storage ${i.save.store === null ? 'refused — ' + i.save.error : i.save.store.toFixed(0) + ' ms'} (${(i.save.chars / 1048576).toFixed(1)} M chars)`);
            // The budgets (budgets.mjs; PERF.md), judged on every board — they are
            // the 2,000-mark board's, and the others are read against them.
            res.calibrationMs = await page.evaluate(calibrateInPage);
            res.renderer = await page.evaluate(rendererInPage);
            res.loaded = tooLoaded(res.calibrationMs) || softwareRaster(res.renderer);
            res.budgets = judge({ open: res.open.folder || out, draw: i.draw, panWork: i.panWork, panFit: i.panFit });
            say(`  budgets (${size === 2000 ? 'the 2,000-mark board\'s own' : 'read against the 2,000-mark board\'s'}; calibration ${res.calibrationMs.toFixed(0)} ms against ${CALIBRATION_MS}${res.loaded ? ' — ' + res.loaded : ''}):`);
            for (const b of res.budgets) say(`    ${b.ok ? 'within' : 'OVER  '}  ${b.label}: ${fmt(b.value)} (budget ${b.said ? b.said + ', ' : ''}${fmt(b.max)})`);
          } catch (err) {
            res.interactError = String(err && err.message ? err.message : err).split('\n')[0];
            say(`  interaction failed: ${res.interactError}`);
          }
        }
        await context.close().catch(() => {});
        writeFileSync(RESULT_FILE, JSON.stringify(report, null, 2));
      }
    }
  } finally {
    await browser.close().catch(() => {});
    await server.stop().catch(() => {});
  }
  const file = RESULT_FILE;
  writeFileSync(file, JSON.stringify(report, null, 2));
  say(`\nresults: ${file}`);
}

main().catch((err) => {
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
});
