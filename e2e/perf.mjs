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
// It asserts nothing and fails nothing: its product is numbers. The boards
// are the engine benchmark's own (`metamedium-core/bench/board.mjs`), made
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

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const OUT = join(here, 'results', 'perf');
const { loadCore, summarize, args } = await import('../metamedium-core/bench/lib.mjs');
const { generateBoard } = await import('../metamedium-core/bench/board.mjs');

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

// ---------------------------------------------------------------------------
// In the page: the probe (installed before any page script) and the tools.
// ---------------------------------------------------------------------------

/** Runs before the page's own scripts, on every document in the context. */
function probe(expected) {
  window.__perf = { drawnAt: null, longtasks: [], expected };
  try {
    new PerformanceObserver((list) => {
      for (const e of list.getEntries()) window.__perf.longtasks.push({ start: Math.round(e.startTime), ms: Math.round(e.duration) });
    }).observe({ type: 'longtask', buffered: true });
  } catch (err) { /* no longtask here (WebKit) */ }
  const tick = () => {
    const mm = window.__mm;
    if (mm && mm.session && mm.session.getEvents().length >= expected) {
      window.__perf.drawnAt = performance.now();
      return;
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

/** Installed after the board is open. */
function tools() {
  const canvas = document.getElementById('canvas');
  const raf = () => new Promise((r) => requestAnimationFrame(r));
  const tools = {
    raf,
    /** The board's world box. */
    worldBox() {
      const s = window.__mm.session.getState(), MM = window.__mm.MM;
      let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      for (const id of s.contentIds) {
        const b = MM.boundsOf(s.nodes.get(id));
        if (!b) continue;
        minX = Math.min(minX, b.minX); minY = Math.min(minY, b.minY);
        maxX = Math.max(maxX, b.maxX); maxY = Math.max(maxY, b.maxY);
      }
      return { minX, minY, maxX, maxY };
    },
    view() { const v = window.__mm.view; return { zoom: v.zoom, panX: v.panX, panY: v.panY }; },
    /** A paint alone, at the view that stands. */
    renders(n) {
      const v = window.__mm.view, out = [];
      for (let i = 0; i < n; i++) {
        const t = performance.now();
        window.__mm.setView(v.zoom, v.panX, v.panY);
        out.push(performance.now() - t);
      }
      return out;
    },
    /** One wheel event per frame, as a trackpad delivers them. */
    async pan(frames, dx, dy) {
      const handler = [], stamps = [];
      await raf();
      for (let i = 0; i <= frames; i++) {
        stamps.push(await raf());
        if (i === frames) break;
        const t = performance.now();
        canvas.dispatchEvent(new WheelEvent('wheel', { deltaX: dx, deltaY: dy, deltaMode: 0, clientX: 720, clientY: 450, bubbles: true, cancelable: true }));
        handler.push(performance.now() - t);
      }
      return { handler, intervals: stamps.slice(1).map((s, i) => s - stamps[i]) };
    },
    /** Listen to a real stroke: each move's handler, the frames, the release. */
    listen() {
      const rec = { moves: [], frames: [], up: null, upToFrame: null, running: true, _t: 0 };
      const cap = (e) => { rec._t = performance.now(); };
      const bub = (e) => {
        const d = performance.now() - rec._t;
        if (e.type === 'pointermove') rec.moves.push(d);
        else if (e.type === 'pointerup') {
          rec.up = d;
          const t0 = rec._t;
          requestAnimationFrame(() => { rec.upToFrame = performance.now() - t0; });
        }
      };
      for (const type of ['pointermove', 'pointerup']) {
        window.addEventListener(type, cap, true);
        window.addEventListener(type, bub, false);
      }
      const loop = (ts) => { if (!rec.running) return; rec.frames.push(ts); requestAnimationFrame(loop); };
      requestAnimationFrame(loop);
      rec.stop = () => {
        rec.running = false;
        for (const type of ['pointermove', 'pointerup']) {
          window.removeEventListener(type, cap, true);
          window.removeEventListener(type, bub, false);
        }
      };
      window.__perfRec = rec;
      return true;
    },
    heard() {
      const r = window.__perfRec;
      r.stop();
      const s = window.__mm.session.getState();
      const last = s.contentIds[s.contentIds.length - 1];
      const n = last && s.nodes.get(last);
      const read = n && window.__mm.MM.interpretationsOf(n, s.nodes)[0];
      return { moves: r.moves, up: r.up, upToFrame: r.upToFrame, intervals: r.frames.slice(1).map((f, i) => f - r.frames[i]), read: read ? read.label + ' ' + read.weight.toFixed(2) : null };
    },
    /** Autosave's own work (17-folder.js saveNow), and whether browser storage takes it. */
    save() {
      const t = performance.now();
      const text = JSON.stringify(window.__mm.session.getEvents());
      const stringify = performance.now() - t;
      let store = null, error = null;
      const t2 = performance.now();
      try { localStorage.setItem('mm-perf-probe', text); store = performance.now() - t2; }
      catch (err) { error = String(err && err.name ? err.name + ': ' + err.message : err); }
      try { localStorage.removeItem('mm-perf-probe'); } catch (err) { /* nothing */ }
      return { chars: text.length, stringify, store, error };
    },
    heap() {
      const m = performance.memory;
      return m ? { usedMB: Math.round(m.usedJSHeapSize / 1048576), limitMB: Math.round(m.jsHeapSizeLimit / 1048576) } : null;
    },
    /** The gate's stub, minimally: nothing a model says here is ever needed. */
    joinStub() {
      window.fetch = async () => new Response(JSON.stringify({ choices: [{ message: { content: '[]' } }] }), { status: 200, headers: { 'content-type': 'application/json' } });
      const mm = window.__mm;
      mm.agents.splice(0);
      const agent = mm.MM.createAgentParticipant(mm.session, Object.assign({}, mm.MM.PRESETS.ollama, { model: 'perf-stub' }), Date.now());
      mm.agents.push(agent);
      return agent.name;
    },
  };
  window.__perfTools = tools;
  return true;
}

// ---------------------------------------------------------------------------

async function freshContext(browser, origin, board) {
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
  const blocked = [];
  await context.route('**/*', async (route) => {
    const url = route.request().url();
    const hit = isModelRequest(url, [origin]);
    if (hit) { blocked.push(url); await route.abort('blockedbyclient'); return; }
    const u = new URL(url);
    if (u.origin === origin && u.pathname.startsWith('/__perf/')) {
      const p = u.pathname;
      if (p === '/__perf/board.json') return route.fulfill({ status: 200, contentType: 'application/json', body: board.json });
      if (p === '/__perf/board/.metamedium/manifest.json') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ files: ['.metamedium/logs/local.jsonl'] }) });
      if (p === '/__perf/board/.metamedium/logs/local.jsonl') return route.fulfill({ status: 200, contentType: 'text/plain', body: board.jsonl });
      return route.fulfill({ status: 404, body: 'not here' });
    }
    await route.continue();
  });
  await context.addInitScript(probe, board.events);
  return { context, blocked };
}

/** Open the board one way; resolves with the numbers, or with why it did not open. */
async function open(browser, origin, board, how) {
  const { context, blocked } = await freshContext(browser, origin, board);
  const page = await context.newPage();
  const out = { how };
  let crashed = null;
  page.on('crash', () => { crashed = new Date().toISOString(); });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e && e.message ? e.message : e).slice(0, 300)));
  try {
    let url;
    if (how === 'restore') {
      // A blank page on the same origin puts the log where the surface's
      // autosave would have left it; the quota is found here, not assumed.
      await page.goto(`${origin}/404.html`, { waitUntil: 'load' });
      const seeded = await page.evaluate(async () => {
        const text = await (await fetch('/__perf/board.json')).text();
        try { localStorage.setItem('mm-log', text); return { ok: true, chars: text.length }; }
        catch (err) { return { ok: false, chars: text.length, error: String(err && err.name ? err.name + ': ' + err.message : err) }; }
      });
      out.seeded = seeded;
      if (!seeded.ok) { out.opened = false; out.why = 'browser storage refused the log: ' + seeded.error; return { out, context, page: null }; }
      url = `${origin}/Demos/session-engine.html?nosw=1`;
    } else {
      url = `${origin}/Demos/session-engine.html?nosw=1&fresh=1&folder=${encodeURIComponent('/__perf/board/')}`;
    }
    const t0 = Date.now();
    await page.goto(url, { waitUntil: 'commit', timeout: 60000 });
    const done = await page.waitForFunction(() => window.__perf && window.__perf.drawnAt !== null, null, { timeout: capMs, polling: 1000 })
      .then(() => true)
      .catch((err) => { out.why = crashed ? `the tab crashed (${crashed})` : String(err.message || err).split('\n')[0]; return false; });
    out.wallMs = Date.now() - t0;
    if (!done) { out.opened = false; out.crashed = crashed; out.errors = errors; return { out, context, page: null }; }
    const got = await page.evaluate(() => {
      const nav = performance.getEntriesByType('navigation')[0];
      const lt = window.__perf.longtasks.slice().sort((x, y) => y.ms - x.ms);
      const m = performance.memory;
      return {
        drawnMs: window.__perf.drawnAt,
        domContentLoadedMs: nav ? nav.domContentLoadedEventEnd : null,
        longestTaskMs: lt.length ? lt[0].ms : null,
        longTasksOver1s: lt.filter((x) => x.ms > 1000).length,
        heap: m ? { usedMB: Math.round(m.usedJSHeapSize / 1048576), limitMB: Math.round(m.jsHeapSizeLimit / 1048576) } : null,
        state: (() => { const s = window.__mm.session.getState(); return { content: s.contentIds.length, artifacts: s.artifacts.length, live: s.live.length }; })(),
      };
    });
    Object.assign(out, got, { opened: true, blocked, errors });
    return { out, context, page };
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

/** Everything a hand does on an open board. */
async function interact(page, context, size) {
  const r = {};
  await page.evaluate(tools);
  r.stub = await page.evaluate(() => window.__perfTools.joinStub());
  await page.waitForTimeout(1500);

  // fit-all, then zoom 1 on the board's middle
  await page.evaluate(() => window.__mm.fitAll());
  await page.waitForTimeout(300);
  r.fitView = await page.evaluate(() => window.__perfTools.view());
  r.renderFit = summarize(await page.evaluate(() => window.__perfTools.renders(8)));
  r.panFit = await page.evaluate(() => window.__perfTools.pan(60, 6, 4));
  const box = await page.evaluate(() => window.__perfTools.worldBox());
  const cx = (box.minX + box.maxX) / 2, cy = (box.minY + box.maxY) / 2;
  await page.evaluate(([x, y]) => window.__mm.setView(1, 720 - x, 450 - y), [cx, cy]);
  await page.waitForTimeout(300);
  r.workView = await page.evaluate(() => window.__perfTools.view());
  r.renderWork = summarize(await page.evaluate(() => window.__perfTools.renders(8)));
  r.panWork = await profile(page, context, `pan-${size}`, () => page.evaluate(() => window.__perfTools.pan(60, 6, 4)));

  // five boxes, drawn with the real pointer, each in its own patch of the screen
  r.strokes = [];
  // Clear of the panel (left), the bar (top) and the minimap (bottom right):
  // a pen that lands on chrome draws nothing, and the reading read back would
  // be the last mark's, not this one's.
  const spots = [[480, 260], [800, 300], [1050, 220], [560, 560], [880, 600]];
  for (let i = 0; i < strokesToDraw; i++) {
    const [x, y] = spots[i % spots.length];
    const w = 150, h = 90;
    const corners = [[x, y], [x + w, y], [x + w, y + h], [x, y + h], [x + 2, y + 4]];
    const run = async () => {
      await page.mouse.move(x, y);
      // Listening starts BEFORE the pen goes down, never between down and the
      // first move: a pause there longer than the hold (HOLD_MS, 450 ms, in
      // 07-input.js) turns a stroke begun on a mark into press-and-hold.
      await page.evaluate(() => window.__perfTools.listen());
      await page.mouse.down();
      for (let c = 1; c < corners.length; c++) {
        const [x0, y0] = corners[c - 1], [x1, y1] = corners[c];
        // 20 moves an edge: a point every 5–8 px, near what a pointer leaves.
        for (let k = 1; k <= 20; k++) await page.mouse.move(x0 + ((x1 - x0) * k) / 20, y0 + ((y1 - y0) * k) / 20);
      }
      await page.mouse.up();
      await page.waitForFunction(() => window.__perfRec && window.__perfRec.upToFrame !== null, null, { timeout: capMs, polling: 200 });
    };
    if (i === 0) await profile(page, context, `stroke-${size}`, run);
    else await run();
    const heard = await page.evaluate(() => window.__perfTools.heard());
    r.strokes.push(heard);
    await page.waitForTimeout(1500); // autosave falls due 900 ms after a change; let it land between strokes
  }
  const moves = r.strokes.flatMap((s) => s.moves);
  const intervals = r.strokes.flatMap((s) => s.intervals);
  r.draw = {
    move: summarize(moves),
    frameWhileDrawing: summarize(intervals),
    release: summarize(r.strokes.map((s) => s.up)),
    releaseToFrame: summarize(r.strokes.map((s) => s.upToFrame)),
    readings: r.strokes.map((s) => s.read),
  };
  r.save = await page.evaluate(() => window.__perfTools.save());
  r.heap = await page.evaluate(() => window.__perfTools.heap());
  r.longTasks = await page.evaluate(() => window.__perf.longtasks.filter((t) => t.ms > 200).length);
  // what the pan and the strokes cost as frame times
  for (const k of ['panFit', 'panWork']) {
    r[k] = { handler: summarize(r[k].handler), interval: summarize(r[k].intervals) };
  }
  return r;
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
        writeFileSync(join(OUT, `perf-${engineName}.json`), JSON.stringify(report, null, 2));
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
          } catch (err) {
            res.interactError = String(err && err.message ? err.message : err).split('\n')[0];
            say(`  interaction failed: ${res.interactError}`);
          }
        }
        await context.close().catch(() => {});
        writeFileSync(join(OUT, `perf-${engineName}.json`), JSON.stringify(report, null, 2));
      }
    }
  } finally {
    await browser.close().catch(() => {});
    await server.stop().catch(() => {});
  }
  const file = join(OUT, `perf-${engineName}.json`);
  writeFileSync(file, JSON.stringify(report, null, 2));
  say(`\nresults: ${file}`);
}

main().catch((err) => {
  console.error(err && err.stack ? err.stack : err);
  process.exit(1);
});
