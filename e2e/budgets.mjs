// The surface's budgets (V1-PLAN.md §9 R4c; PERF.md), measured one way for
// both of the things that ask: `perf.mjs`, the runner beside the gate, which
// prints them for any board, and the gate's own `budgets` scenario
// (`run.mjs`), which records them on the 2,000-mark board as steps — a pass,
// a failure with the number, or a skip that says why this machine could not
// measure them. Never a silent pass.
//
// What is measured, per board (Chromium, the gate's viewport, 1440×900 @1x):
//
//   open    — navigation to the first animation frame whose callback finds the
//             whole log in the session: the board drawn. The board is a folder
//             (`?folder=`) served from memory by a route — the one way in that
//             holds a board of any size (browser storage refuses 2,000 marks).
//   pan     — one wheel event per frame for 60 frames, the way a trackpad
//             delivers them: the interval between frames, at working zoom
//             (1, on the board's middle) and zoomed out to the whole board.
//   draw    — boxes drawn with real mouse input: each move's handler, and from
//             the release to the first frame after it — the stroke read and
//             its reading drawn under it.
//
// The boards are the engine benchmark's own (`metamedium-core/bench/board.mjs`),
// from the same seed, served from memory; nothing is written to disk.

import os from 'node:os';

/** One frame at 60 Hz, in milliseconds. */
export const FRAME_MS = 1000 / 60;

/**
 * A frame budget is met when the interval between frames is that many 60 Hz
 * frames, within a millisecond: `requestAnimationFrame` stamps its frames on
 * the vsync with a little jitter either side, so a frame that took one vsync
 * reads 16.6–16.8 ms. The allowance is said here, once, and in PERF.md.
 */
export const frames = (n) => n * FRAME_MS + 1;

/**
 * The budgets, on the 2,000-mark board (PERF.md "Proposed budgets"; V1-PLAN
 * §11.3 — v1 ships when they hold). `pick` reads the number from what
 * `interact` and `openBoard` measured.
 */
export const BUDGETS = [
  { key: 'open', label: 'open: navigation → the board drawn', max: 1500, unit: 'ms', pick: (m) => m.open && m.open.drawnMs },
  { key: 'release', label: 'a stroke\'s release → its reading drawn, p95', max: 100, unit: 'ms', pick: (m) => m.draw && m.draw.releaseToFrame.p95 },
  { key: 'move', label: 'a pointer move while drawing: the handler, p95', max: 4, unit: 'ms', pick: (m) => m.draw && m.draw.move.p95 },
  { key: 'panWork', label: 'a pan frame at working zoom, p95', max: frames(1), unit: 'ms', said: 'one frame', pick: (m) => m.panWork && m.panWork.interval.p95 },
  { key: 'panFit', label: 'a pan frame zoomed out to the whole board, p95', max: frames(2), unit: 'ms', said: 'two frames', pick: (m) => m.panFit && m.panFit.interval.p95 },
];

/** Each budget against what was measured: `{ key, label, value, max, ok }`, value null when it was not measured. */
export function judge(measured) {
  return BUDGETS.map((b) => {
    const v = b.pick(measured);
    const value = Number.isFinite(v) ? v : null;
    return { key: b.key, label: b.label, value, max: b.max, said: b.said || null, ok: value !== null && value <= b.max };
  });
}

export const fmt = (ms) => (ms === null || ms === undefined ? '—' : ms >= 1000 ? (ms / 1000).toFixed(2) + ' s' : ms >= 100 ? ms.toFixed(0) + ' ms' : ms.toFixed(1) + ' ms');

// ---------------------------------------------------------------------------
// Is this machine one the budgets can be measured on?
// ---------------------------------------------------------------------------

/**
 * The calibration: a fixed piece of arithmetic, timed in the page. The
 * budgets were set on one machine (PERF.md: an M2 Max), where this takes
 * CALIBRATION_MS; a machine that takes much longer is not that machine, or
 * is busy, and its numbers say nothing about the budgets either way.
 */
export const CALIBRATION_MS = 41; // M2 Max, Chromium 153 headless, load 3.5 (27 Sep 2026): 40.8–41.0 ms over six runs
/** Past this many times the calibration, the budgets are skipped, by name. */
export const CALIBRATION_SLACK = 1.4;
/** A one-minute load average past this share of the cores is too loaded to measure. */
export const LOAD_SHARE = 0.75;

/** Runs in the page: the calibration's arithmetic, median of five. */
export function calibrateInPage() {
  const once = () => {
    const t0 = performance.now();
    let x = 0;
    const a = new Float64Array(200000);
    for (let k = 0; k < 12; k++) for (let i = 0; i < a.length; i++) { a[i] = Math.sin(i * 0.001 + k) * Math.sqrt(i + 1); x += a[i]; }
    const arr = Array.from({ length: 120000 }, (_, i) => (i * 7919) % 100003);
    arr.sort((p, q) => p - q);
    return { ms: performance.now() - t0, x: x + arr[7] };
  };
  const xs = [];
  for (let i = 0; i < 5; i++) xs.push(once().ms);
  xs.sort((p, q) => p - q);
  return xs[2];
}

/** Why this machine cannot measure the budgets now, or null when it can. */
export function tooLoaded(calibrationMs) {
  const cores = os.cpus().length || 1;
  const load = os.loadavg()[0];
  if (load > cores * LOAD_SHARE) return `the machine is too loaded to measure: load ${load.toFixed(1)} on ${cores} cores`;
  if (Number.isFinite(calibrationMs) && calibrationMs > CALIBRATION_MS * CALIBRATION_SLACK) {
    return `the machine runs the calibration ${(calibrationMs / CALIBRATION_MS).toFixed(1)}× slower than the one the budgets were set on (${calibrationMs.toFixed(0)} ms against ${CALIBRATION_MS})`;
  }
  return null;
}

// ---------------------------------------------------------------------------
// In the page: the probe (installed before any page script) and the tools.
// ---------------------------------------------------------------------------

/** Runs before the page's own scripts, on every document in the context. */
export function probe(expected) {
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
export function tools() {
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
    async pan(count, dx, dy) {
      const handler = [], stamps = [];
      await raf();
      for (let i = 0; i <= count; i++) {
        stamps.push(await raf());
        if (i === count) break;
        const t = performance.now();
        canvas.dispatchEvent(new WheelEvent('wheel', { deltaX: dx, deltaY: dy, deltaMode: 0, clientX: 720, clientY: 450, bubbles: true, cancelable: true }));
        handler.push(performance.now() - t);
      }
      return { handler, intervals: stamps.slice(1).map((s, i) => s - stamps[i]) };
    },
    /** Listen to a real stroke: each move's handler, the frames, the release. */
    listen() {
      const rec = { moves: [], frames: [], up: null, upToFrame: null, running: true, _t: 0 };
      const cap = () => { rec._t = performance.now(); };
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
      const drawn = typeof window.__mm.readingDrawn === 'function' ? window.__mm.readingDrawn() : null;
      // A box drawn round marks is a loop that waits (no reading is drawn under a loop, by design); say which.
      return { moves: r.moves, up: r.up, upToFrame: r.upToFrame, intervals: r.frames.slice(1).map((f, i) => f - r.frames[i]), read: read ? read.label + ' ' + read.weight.toFixed(2) : null, drawn: drawn && drawn.id === last ? drawn.text : null, waits: s.pendingLassoId === last };
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
// In Node: a board served, opened, and worked.
// ---------------------------------------------------------------------------

/** A board made from the bench's seed, as the page will fetch it. */
export function boardOf(core, generateBoard, marks, seed = 1) {
  const { events, stats } = generateBoard(core, { marks, seed });
  return { marks: stats.marks, events: events.length, json: JSON.stringify(events), jsonl: core.encodeLog(events) };
}

/**
 * Serve a board to a context from memory — `/__perf/board.json` for browser
 * storage, `/__perf/board/` as a published folder — and install the probe.
 * Registered after any route of the caller's, so it is asked first.
 */
export async function serveBoard(context, origin, board) {
  await context.route(`${origin}/__perf/**`, async (route) => {
    const p = new URL(route.request().url()).pathname;
    if (p === '/__perf/board.json') return route.fulfill({ status: 200, contentType: 'application/json', body: board.json });
    if (p === '/__perf/board/.metamedium/manifest.json') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ files: ['.metamedium/logs/local.jsonl'] }) });
    if (p === '/__perf/board/.metamedium/logs/local.jsonl') return route.fulfill({ status: 200, contentType: 'text/plain', body: board.jsonl });
    return route.fulfill({ status: 404, body: 'not here' });
  });
  await context.addInitScript(probe, board.events);
}

/** The page that opens a board as a folder: fresh, no service worker. */
export const folderUrl = (origin) => `${origin}/Demos/session-engine.html?nosw=1&fresh=1&folder=${encodeURIComponent('/__perf/board/')}`;

/**
 * Open the board as a folder in a new page of `context`, and wait for it to be
 * drawn. Resolves with `{ out, page }`: `out.opened`, `out.drawnMs` (navigation
 * → board drawn), the longest task, the heap; or `out.why` it did not open.
 */
export async function openBoard(context, origin, { capMs = 20 * 60000, url } = {}) {
  const page = await context.newPage();
  const out = { how: 'folder' };
  let crashed = null;
  page.on('crash', () => { crashed = new Date().toISOString(); });
  try {
    const t0 = Date.now();
    await page.goto(url || folderUrl(origin), { waitUntil: 'commit', timeout: 60000 });
    const done = await page.waitForFunction(() => window.__perf && window.__perf.drawnAt !== null, null, { timeout: capMs, polling: 100 })
      .then(() => true)
      .catch((err) => { out.why = crashed ? `the tab crashed (${crashed})` : String(err.message || err).split('\n')[0]; return false; });
    out.wallMs = Date.now() - t0;
    if (!done) { out.opened = false; out.crashed = crashed; return { out, page: null }; }
    Object.assign(out, await page.evaluate(() => {
      const lt = window.__perf.longtasks.slice().sort((x, y) => y.ms - x.ms);
      const m = performance.memory;
      const s = window.__mm.session.getState();
      return {
        drawnMs: window.__perf.drawnAt,
        longestTaskMs: lt.length ? lt[0].ms : null,
        longTasksOver1s: lt.filter((x) => x.ms > 1000).length,
        heap: m ? { usedMB: Math.round(m.usedJSHeapSize / 1048576), limitMB: Math.round(m.jsHeapSizeLimit / 1048576) } : null,
        state: { content: s.contentIds.length, artifacts: s.artifacts.length, live: s.live.length },
      };
    }), { opened: true });
    return { out, page };
  } catch (err) {
    out.opened = false;
    out.why = String(err && err.message ? err.message : err).split('\n')[0];
    out.crashed = crashed;
    return { out, page: null };
  }
}

/**
 * Everything a hand does on an open board: the pans, then boxes drawn with the
 * real pointer. `profile(name, fn)` wraps what a CPU profile should cover
 * (perf.mjs passes one; the gate does not). `summarize` is the bench's.
 */
export async function interact(page, { summarize, strokes = 5, profile = (name, fn) => fn(), size = '' } = {}) {
  const r = {};
  await page.evaluate(tools);
  r.stub = await page.evaluate(() => window.__perfTools.joinStub());
  await page.waitForTimeout(1500);

  // fit-all, then zoom 1 on the board's middle
  await page.evaluate(() => window.__mm.fitAll());
  await page.waitForTimeout(300);
  r.fitView = await page.evaluate(() => window.__perfTools.view());
  r.renderFit = summarize(await page.evaluate(() => window.__perfTools.renders(8)));
  r.panFit = await profile(`pan-fit-${size}`, () => page.evaluate(() => window.__perfTools.pan(60, 6, 4)));
  const box = await page.evaluate(() => window.__perfTools.worldBox());
  const cx = (box.minX + box.maxX) / 2, cy = (box.minY + box.maxY) / 2;
  await page.evaluate(([x, y]) => window.__mm.setView(1, 720 - x, 450 - y), [cx, cy]);
  await page.waitForTimeout(300);
  r.workView = await page.evaluate(() => window.__perfTools.view());
  r.renderWork = summarize(await page.evaluate(() => window.__perfTools.renders(8)));
  r.panWork = await profile(`pan-${size}`, () => page.evaluate(() => window.__perfTools.pan(60, 6, 4)));

  // boxes, drawn with the real pointer, each in its own patch of the screen
  r.strokes = [];
  // Clear of the panel (left), the bar (top) and the minimap (bottom right):
  // a pen that lands on chrome draws nothing, and the reading read back would
  // be the last mark's, not this one's.
  const spots = [[480, 260], [800, 300], [1050, 220], [560, 560], [880, 600]];
  for (let i = 0; i < strokes; i++) {
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
      await page.waitForFunction(() => window.__perfRec && window.__perfRec.upToFrame !== null, null, { timeout: 20 * 60000, polling: 50 });
    };
    if (i === 0) await profile(`stroke-${size}`, run);
    else await run();
    r.strokes.push(await page.evaluate(() => window.__perfTools.heard()));
    await page.waitForTimeout(1500); // a save falls due after a change; let it land between strokes
  }
  const moves = r.strokes.flatMap((s) => s.moves);
  const intervals = r.strokes.flatMap((s) => s.intervals);
  r.draw = {
    move: summarize(moves),
    frameWhileDrawing: summarize(intervals),
    release: summarize(r.strokes.map((s) => s.up)),
    releaseToFrame: summarize(r.strokes.map((s) => s.upToFrame)),
    readings: r.strokes.map((s) => s.read),
    drawn: r.strokes.map((s) => s.drawn),
    waits: r.strokes.map((s) => s.waits),
  };
  r.save = await page.evaluate(() => window.__perfTools.save());
  r.heap = await page.evaluate(() => window.__perfTools.heap());
  r.longTasks = await page.evaluate(() => window.__perf.longtasks.filter((t) => t.ms > 200).length);
  for (const k of ['panFit', 'panWork']) r[k] = { handler: summarize(r[k].handler), interval: summarize(r[k].intervals) };
  return r;
}

// ---------------------------------------------------------------------------
// The equivalence check on a board of the bench's (R4c, done-criterion 1).
// ---------------------------------------------------------------------------

/**
 * On an open board: every mark pointed at in turn — the view centred on it,
 * the mark inspected — then boxes drawn with the real pointer and undone, and
 * after each the board painted both ways (`paintCheck`, 08-render.js). Resolves
 * with how many checks ran and the first few that differed.
 */
export async function equivalence(page, { strokes = 3 } = {}) {
  const marks = await page.evaluate(() => {
    const s = window.__mm.session.getState(), MM = window.__mm.MM;
    return s.contentIds.map((id) => { const b = MM.boundsOf(s.nodes.get(id)); return b ? { id, x: (b.minX + b.maxX) / 2, y: (b.minY + b.maxY) / 2 } : null; }).filter(Boolean);
  });
  const found = { checks: 0, differed: 0, first: [], marks: marks.length, strokes: 0, undos: 0, roles: [], ink: { drawn: 0, of: 0 }, minimap: { drawn: 0, of: 0 } };
  // Every mark's role, read over its neighbourhood, against the whole-board read, and the genre.
  const roles = async (where) => {
    const r = await page.evaluate(() => window.__mm.rolesCheck());
    found.roles.push({ where, marks: r.marks, ok: r.ok });
    note('the role table, ' + where, { ok: r.ok, diffs: r.differ.concat(r.genreSame ? [] : [{ what: 'genre', genre: r.genre }]) });
  };
  const note = (where, c) => {
    found.checks++;
    if (c.ok) return;
    found.differed++;
    if (found.first.length < 5) found.first.push({ where, diffs: c.diffs.slice(0, 3) });
  };
  await roles('as opened');
  // Every loose mark held: its group, found through the index, against the clusters of the whole plane.
  {
    const h = await page.evaluate(() => window.__mm.heldCheck());
    found.held = { marks: h.marks, differing: h.differing };
    note('every mark held', { ok: h.ok, diffs: h.differ });
  }
  // Every mark, pointed at: its reading drawn under it, its ladder in the panel.
  const batch = 40;
  for (let i = 0; i < marks.length; i += batch) {
    const got = await page.evaluate((list) => list.map((m) => {
      window.__mm.setView(1, 720 - m.x, 450 - m.y);
      window.__mm.inspect(m.id);
      return { id: m.id, c: window.__mm.paintCheck() };
    }), marks.slice(i, i + batch));
    for (const g of got) {
      note('pointed at ' + g.id, g.c);
      if (g.c.ink) { found.ink.drawn += g.c.ink.drawn; found.ink.of += g.c.ink.of; found.minimap.drawn += g.c.minimap.drawn; found.minimap.of += g.c.minimap.of; }
    }
  }
  await page.evaluate(() => window.__mm.inspect(null));
  // Strokes with the real pointer, each checked; then each undone, checked.
  const spots = [[520, 300], [840, 340], [620, 560]];
  const box = await page.evaluate(() => { const s = window.__mm.session.getState(), MM = window.__mm.MM; const b = MM.boundsOf(s.nodes.get(s.contentIds[0])); return b; });
  if (box) await page.evaluate(([x, y]) => window.__mm.setView(1, 720 - x, 450 - y), [(box.minX + box.maxX) / 2, (box.minY + box.maxY) / 2]);
  for (let i = 0; i < strokes; i++) {
    const [x, y] = spots[i % spots.length];
    const pts = [[x, y], [x + 140, y], [x + 140, y + 80], [x, y + 80], [x + 2, y + 4]];
    await page.mouse.move(x, y);
    await page.mouse.down();
    for (let c = 1; c < pts.length; c++) for (let k = 1; k <= 12; k++) await page.mouse.move(pts[c - 1][0] + ((pts[c][0] - pts[c - 1][0]) * k) / 12, pts[c - 1][1] + ((pts[c][1] - pts[c - 1][1]) * k) / 12);
    await page.mouse.up();
    await page.waitForTimeout(50);
    note('after stroke ' + (i + 1), await page.evaluate(() => window.__mm.paintCheck()));
    // Every mark's role again, a stroke after the last table: most are carried
    // forward from it, read over the same neighbourhood, and must still be the
    // whole-board read's.
    await roles('after stroke ' + (i + 1));
    found.strokes++;
  }
  for (let i = 0; i < strokes; i++) {
    await page.evaluate(() => window.__mm.session.undo());
    note('after undo ' + (i + 1), await page.evaluate(() => window.__mm.paintCheck()));
    await roles('after undo ' + (i + 1));
    found.undos++;
  }
  await page.evaluate(() => window.__mm.fitAll());
  note('the whole board, fitted', await page.evaluate(() => window.__mm.paintCheck()));
  return found;
}
