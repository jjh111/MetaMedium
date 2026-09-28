// No lost work (V1-PLAN.md §7 and §9 R3), as scenarios of the gate.
//
//     node e2e/run.mjs keep                      # the kill test and the forced failures
//     node e2e/run.mjs --browser webkit keep     # the same, where WebKit can (no crash, no quota)
//
// Two claims, both about the board a browser keeps when there is no folder:
//
//   THE KILL TEST. A scripted hand draws boxes with the real pointer, undoes
//   now and then, and the page is closed ABRUPTLY at a random point — the
//   renderer crashed (Chromium's `Page.crash`, no pagehide, nothing flushed)
//   or the tab closed (`page.close`, pagehide and nothing else) — right after
//   a stroke's release, halfway through a stroke, right after an undo, or a
//   moment after the last act. The board is opened again in a new tab and
//   must hold EVERY stroke whose release the page had taken, in order, and
//   nothing undone. Several cycles, each killing at its own point, on one
//   board that grows across them; the seed is printed, so a failure can be
//   run again exactly (`E2E_KEEP_SEED`).
//
//   NEVER SILENT. A save that fails is said at once in the status line, in
//   plain words, with the way out offered — export the log, open a folder —
//   and keeps being said until a save succeeds. Forced two ways: the
//   browser's storage made full for real (browser storage filled to its
//   limit, and the quota of the page's origin taken down to nothing through
//   the DevTools protocol, so IndexedDB refuses with a real
//   QuotaExceededError — Chromium only), and a store the browser will not
//   let the page use at all (a private window, blocked site data: every
//   storage door throws SecurityError, from an init script).
//
// What a stroke IS here: its first and last points and how many it has, as
// the pointer drew them (the view pinned at zoom 1, so world = screen). The
// surface records `live` from the pointer; nothing it does may move them.

const DEFAULT_CYCLES = 10;

/** mulberry32: a seeded stream, so a failing run can be run again exactly. */
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// The ground boxes are drawn on: clear of the panel (left), the bar (top),
// the minimap (bottom right) and the status line — one box a cell, so no box
// ever crosses another (a crossing could be read as a scratch and erase it).
const GRID = { x0: 470, y0: 140, w: 100, h: 80, cols: 7, rows: 7 };

function cellBox(i, rand) {
  const col = i % GRID.cols, row = Math.floor(i / GRID.cols) % GRID.rows;
  const w = 36 + Math.round(rand() * 24), h = 26 + Math.round(rand() * 22);
  const x = GRID.x0 + col * GRID.w + 10 + Math.round(rand() * (GRID.w - 20 - w));
  const y = GRID.y0 + row * GRID.h + 8 + Math.round(rand() * (GRID.h - 16 - h));
  return { x, y, w, h };
}

/** The pointer path of a box: down at a corner, round the edges, lifted just short of closing. */
function boxPath(b) {
  const corners = [[b.x, b.y], [b.x + b.w, b.y], [b.x + b.w, b.y + b.h], [b.x, b.y + b.h], [b.x + 2, b.y + 4]];
  const pts = [{ x: b.x, y: b.y }];
  for (let c = 1; c < corners.length; c++) {
    const [x0, y0] = corners[c - 1], [x1, y1] = corners[c];
    for (let k = 1; k <= 12; k++) pts.push({ x: x0 + ((x1 - x0) * k) / 12, y: y0 + ((y1 - y0) * k) / 12 });
  }
  return pts;
}

/** What a stroke is, for comparing: where it began and ended, and how many points. */
const sig = (pts) => ({ x0: +pts[0].x.toFixed(2), y0: +pts[0].y.toFixed(2), x1: +pts[pts.length - 1].x.toFixed(2), y1: +pts[pts.length - 1].y.toFixed(2), n: pts.length });
const sameSig = (a, b) => a.x0 === b.x0 && a.y0 === b.y0 && a.x1 === b.x1 && a.y1 === b.y1 && a.n === b.n;

/** Draw a path with the real pointer; `stopAfter` lifts nothing and returns halfway (a stroke cut off). */
async function drawPath(page, pts, stopAfter) {
  await page.mouse.move(pts[0].x, pts[0].y);
  await page.mouse.down();
  const last = stopAfter === undefined ? pts.length : Math.min(stopAfter, pts.length);
  for (let i = 1; i < last; i++) await page.mouse.move(pts[i].x, pts[i].y);
  if (stopAfter !== undefined) return false;
  await page.mouse.up();
  return true;
}

/** The board is open once the page says so — or at once, on a page that keeps its board synchronously. */
async function waitReady(page, timeout = 60000) {
  await page.waitForFunction(() => {
    const mm = window.__mm;
    if (!mm || !mm.session) return false;
    return typeof mm.board !== 'function' || mm.board().ready;
  }, null, { timeout, polling: 50 });
  // World = screen, so the points the pointer drew are the points the log holds.
  await page.evaluate(() => window.__mm.setView(1, 0, 0));
}

async function strokesOnBoard(page) {
  return page.evaluate(() => window.__mm.session.getEvents()
    .filter((e) => e.type === 'stroke')
    .map((e) => ({ x0: +e.points[0].x.toFixed(2), y0: +e.points[0].y.toFixed(2), x1: +e.points[e.points.length - 1].x.toFixed(2), y1: +e.points[e.points.length - 1].y.toFixed(2), n: e.points.length })));
}

const statusText = (page) => page.evaluate(() => document.getElementById('status').textContent || '');

/** Close the page the abrupt way: a crashed renderer, or a closed tab with nothing waited for. */
async function killPage(page, how, cdp) {
  if (how === 'crash') {
    const crashed = new Promise((r) => page.once('crash', r));
    cdp.send('Page.crash').catch(() => {}); // never resolves: the target is gone
    await Promise.race([crashed, sleep(5000)]);
    // A crashed page may never answer a close; the context's end takes it.
    await Promise.race([page.close().catch(() => {}), sleep(2000)]);
  } else {
    await page.close({ runBeforeUnload: false });
  }
}

/**
 * The kill test. One context (one browser's storage), one board growing
 * across cycles; each cycle opens the board in a new tab, checks every
 * stroke is there, draws, and is killed at its own random point.
 */
export async function killTest(browser, servers, ctx) {
  const { freshContext, engineName, steps } = ctx;
  const check = (name, ok, detail) => steps.push({ name, ok: !!ok, detail });
  const seed = Number(process.env.E2E_KEEP_SEED || (Date.now() % 1e9));
  const cycles = Number(process.env.E2E_KEEP_CYCLES || DEFAULT_CYCLES);
  const rand = rng(seed);
  const guards = await freshContext(browser, { origins: [servers.staticOrigin], label: 'keep-kill' });
  const url = `${servers.staticOrigin}/Demos/session-engine.html?nosw=1`;
  const expected = []; // the completed strokes, in log order
  let cell = 0;
  const tally = { crash: 0, close: 0, phases: {} };
  let page = null;
  try {
    for (let c = 1; c <= cycles; c++) {
      page = await guards.context.newPage();
      await page.goto(url, { waitUntil: 'load', timeout: 60000 });
      await waitReady(page);
      const onOpen = await strokesOnBoard(page);
      const whole = onOpen.length === expected.length && onOpen.every((s, i) => sameSig(s, expected[i]));
      if (c > 1) {
        check(`K${c - 1}. reopened after kill ${c - 1}: every completed stroke is on the board, in order, and nothing undone (${onOpen.length} of ${expected.length})`,
          whole, { seed, cycle: c - 1, expected: expected.length, got: onOpen.length, missing: expected.filter((s) => !onOpen.some((o) => sameSig(o, s))).length, extra: onOpen.filter((o) => !expected.some((s) => sameSig(o, s))).length });
        if (!whole) {
          // What the next cycle builds on is the board as it reopened; keep going from there.
          expected.splice(0, expected.length, ...onOpen);
        }
      }
      // A crash is Chromium's; WebKit's pages are closed.
      const how = engineName === 'chromium' && rand() < 0.6 ? 'crash' : 'close';
      const cdp = how === 'crash' ? await guards.context.newCDPSession(page) : null;
      const phases = ['after-release', 'after-release', 'mid-stroke', 'after-undo', 'a-moment-later'];
      const phase = phases[Math.floor(rand() * phases.length)];
      const n = 2 + Math.floor(rand() * 4);
      for (let s = 0; s < n; s++) {
        const box = cellBox(cell++, rand);
        const pts = boxPath(box);
        await drawPath(page, pts);
        expected.push(sig(pts));
        // An undo now and then, mid-cycle: the log shrinks, and the store must follow.
        if (s < n - 1 && rand() < 0.25) {
          await page.click('#undoBtn');
          expected.pop();
        }
      }
      if (phase === 'mid-stroke') {
        const pts = boxPath(cellBox(cell++, rand));
        await drawPath(page, pts, 5 + Math.floor(rand() * (pts.length - 10))); // down, some moves, no release
      } else if (phase === 'after-undo') {
        await page.click('#undoBtn');
        expected.pop();
      } else if (phase === 'a-moment-later') {
        await sleep(Math.round(rand() * 400));
      }
      await killPage(page, how, cdp);
      tally[how]++;
      tally.phases[phase] = (tally.phases[phase] || 0) + 1;
      page = null;
    }
    // The last kill, reopened.
    page = await guards.context.newPage();
    await page.goto(url, { waitUntil: 'load', timeout: 60000 });
    await waitReady(page);
    const final = await strokesOnBoard(page);
    const whole = final.length === expected.length && final.every((s, i) => sameSig(s, expected[i]));
    check(`K${cycles}. reopened after kill ${cycles}: every completed stroke is on the board, in order, and nothing undone (${final.length} of ${expected.length})`,
      whole, { seed, cycle: cycles, expected: expected.length, got: final.length, missing: expected.filter((s) => !final.some((o) => sameSig(o, s))).length });
    check(`K. ${cycles} kills (${tally.crash} crashed, ${tally.close} closed; ${Object.entries(tally.phases).map(([k, v]) => v + ' ' + k).join(', ')}), seed ${seed}`, true, { seed, tally });
    await page.close().catch(() => {});
  } catch (err) {
    check(`K. the kill test ran to its end (seed ${seed})`, false, { error: String(err && err.stack ? err.stack : err) });
    if (page) await ctx.screenshot(page, 'keep-kill');
  }
  return guards;
}

/** Fill browser storage to the brim under a key of our own; returns how much it took. */
function fillBrowserStorage() {
  let lo = 0, hi = 16 * 1024 * 1024;
  while (hi - lo > 512) {
    const mid = (lo + hi) >> 1;
    try { localStorage.setItem('mm-test-filler', 'x'.repeat(mid)); lo = mid; } catch (err) { hi = mid; }
  }
  try { localStorage.setItem('mm-test-filler', 'x'.repeat(lo)); } catch (err) { /* as full as it goes */ }
  return lo;
}

/**
 * The browser's storage full, for real: browser storage filled to its limit,
 * and the origin's quota taken to nothing, so IndexedDB refuses as a full disk
 * does. The quota is taken down BEFORE the page first opens its store: Chromium
 * works out the room a store has when it first opens it and does not look
 * again while there is room, so taken down later it would not be felt.
 */
export async function quotaTest(browser, servers, ctx) {
  const { freshContext, steps } = ctx;
  const check = (name, ok, detail) => steps.push({ name, ok: !!ok, detail });
  const guards = await freshContext(browser, { origins: [servers.staticOrigin], label: 'keep-quota' });
  const url = `${servers.staticOrigin}/Demos/session-engine.html?nosw=1`;
  const page = await guards.context.newPage();
  const rand = rng(7);
  let cell = 0;
  const drawn = []; // { sig, box }
  const draw = async () => { const box = cellBox(cell++, rand); const pts = boxPath(box); await drawPath(page, pts); drawn.push({ sig: sig(pts), box }); return pts; };
  const waitSaid = async (re, want, ms = 3000) => {
    let said = await statusText(page);
    for (let i = 0; i < ms / 50 && re.test(said) !== want; i++) { await sleep(50); said = await statusText(page); }
    return said;
  };
  try {
    const cdp = await guards.context.newCDPSession(page);
    await page.goto(`${servers.staticOrigin}/404.html`, { waitUntil: 'load' });
    const filled = await page.evaluate(fillBrowserStorage);
    await cdp.send('Storage.overrideQuotaForOrigin', { origin: servers.staticOrigin, quotaSize: 1 });
    await page.goto(url, { waitUntil: 'load', timeout: 60000 });
    await waitReady(page);
    const canFolder = await page.evaluate(() => !!window.showDirectoryPicker);
    const atOpen = await waitSaid(/not saved/, true);
    await draw();
    const said = await waitSaid(/not saved/, true);
    const full = /not saved — the browser's storage for this page is full/;
    check('Q1. storage full: said at once in the status line, in plain words, with the way out — export the log, open a folder',
      full.test(atOpen) && full.test(said) && /export the log/.test(said) && /open a folder/.test(said) === canFolder,
      { atOpen, status: said, filledChars: filled, canFolder });

    // Another stroke, and a scratch that erases a box (a message of its own in the line): still said.
    await draw();
    // Three passes across the first box, each crossing its outline twice, and
    // reaching no further than 6 px past it — no other box is within a cell's margin.
    const v = drawn[0].box;
    const sy = [v.y + v.h * 0.3, v.y + v.h * 0.5, v.y + v.h * 0.7];
    const scratch = [];
    for (let k = 0; k < 3; k++) {
      const a = k % 2 ? v.x + v.w + 6 : v.x - 6, b = k % 2 ? v.x - 6 : v.x + v.w + 6;
      for (let q = 0; q <= 10; q++) scratch.push({ x: a + ((b - a) * q) / 10, y: sy[k] });
    }
    await drawPath(page, scratch);
    await sleep(300);
    const still = await statusText(page);
    check('Q2. it keeps being said while saves fail — after another stroke, and alongside the line\'s own news (an erase)',
      full.test(still) && /erased 1 mark/.test(still), { status: still });

    // Room again: the next save succeeds, and the line says so and lets it go.
    await page.evaluate(() => localStorage.removeItem('mm-test-filler'));
    await cdp.send('Storage.overrideQuotaForOrigin', { origin: servers.staticOrigin });
    await sleep(1700);
    await draw();
    const after = await waitSaid(/not saved/, false, 4000);
    check('Q3. once a save succeeds the line stops saying it, and says it saved', !/not saved/.test(after) && /saved/.test(after), { status: after });

    await page.reload({ waitUntil: 'load' });
    await waitReady(page);
    const back = await strokesOnBoard(page);
    const want = drawn.length + 1; // the boxes and the scratch — its erase is a reading of the log, not a removal from it
    check(`Q4. reloaded: everything drawn while saves were failing is on the board (${back.length} of ${want} strokes)`,
      back.length === want && drawn.every((d) => back.some((o) => sameSig(o, d.sig))), { got: back.length, want });
    await draw();
    await sleep(1200);
    const calm = await statusText(page);
    check('Q5. a board that saves says nothing about saving', !/not saved/.test(calm), { status: calm });
  } catch (err) {
    check('Q. the storage-full test ran to its end', false, { error: String(err && err.stack ? err.stack : err) });
    await ctx.screenshot(page, 'keep-quota');
  }
  await page.close().catch(() => {});
  return guards;
}

/** Every storage door throws, as in a private window or with site data blocked. */
function blockStorage() {
  const refuse = () => { throw new DOMException('The page is not allowed to use storage here', 'SecurityError'); };
  try { Object.defineProperty(window, 'indexedDB', { configurable: true, get: refuse }); } catch (err) { /* already locked */ }
  try { Storage.prototype.setItem = function () { refuse(); }; } catch (err) { /* nothing */ }
}

export async function blockedTest(browser, servers, ctx) {
  const { freshContext, steps } = ctx;
  const check = (name, ok, detail) => steps.push({ name, ok: !!ok, detail });
  const guards = await freshContext(browser, { origins: [servers.staticOrigin], label: 'keep-blocked' });
  await guards.context.addInitScript(blockStorage);
  const page = await guards.context.newPage();
  const url = `${servers.staticOrigin}/Demos/session-engine.html?nosw=1`;
  try {
    await page.goto(url, { waitUntil: 'load', timeout: 60000 });
    await waitReady(page);
    const canFolder = await page.evaluate(() => !!window.showDirectoryPicker);
    await drawPath(page, boxPath({ x: 600, y: 300, w: 60, h: 40 }));
    await drawPath(page, boxPath({ x: 760, y: 300, w: 60, h: 40 }));
    let said = '';
    for (let i = 0; i < 60 && !/not saved/.test(said); i++) { await sleep(50); said = await statusText(page); }
    // "open a folder" is offered where the browser can open one (Chromium) and nowhere else.
    check('B1. a store the browser will not let the page use (a private window, blocked site data): said at once, with the way out',
      /not saved — this browser will not let the page keep anything/.test(said) && /export the log/.test(said) && /open a folder/.test(said) === canFolder,
      { status: said, canFolder });

    // The way out, taken: the whole log as a file.
    const events = await page.evaluate(() => window.__mm.session.getEvents().length);
    const [download] = await Promise.all([page.waitForEvent('download', { timeout: 10000 }), page.click('#status button[data-way="export"]')]);
    const { readFileSync } = await import('node:fs');
    const file = readFileSync(await download.path(), 'utf8');
    const lines = file.split('\n').filter(Boolean);
    check(`B2. "export the log" in the line hands over the whole board as a file (${lines.length} of ${events} events, ${download.suggestedFilename()})`,
      download.suggestedFilename() === 'canvas.jsonl' && lines.length === events && lines.every((l) => { try { return !!JSON.parse(l).type; } catch (e) { return false; } }),
      { lines: lines.length, events });

    // The other way out: a folder keeps the board from now on — carried in, not replaced.
    // (The picker is the browser's own dialog; the gate hands the surface a folder held in memory.)
    const kept = await page.evaluate(async () => {
      const mm = window.__mm;
      const store = new mm.MM.MemoryStore();
      const before = mm.session.getEvents().filter((e) => e.type === 'stroke').length;
      await mm.keepBoardIn(store, 'folder', 'rescue');
      await mm.saveNow();
      const logs = await store.readLogs();
      const mine = Object.values(logs)[0] || [];
      return { before, after: mm.session.getEvents().filter((e) => e.type === 'stroke').length, inFolder: mine.filter((e) => e.type === 'stroke').length, status: document.getElementById('status').textContent };
    });
    check(`B3. "open a folder" carries the board into the folder — ${kept.inFolder} of ${kept.before} strokes in its log — and the line stops saying it is not saved`,
      kept.before === 2 && kept.after === 2 && kept.inFolder === 2 && !/not saved/.test(kept.status) && /rescue/.test(kept.status), kept);
  } catch (err) {
    check('B. the blocked-store test ran to its end', false, { error: String(err && err.stack ? err.stack : err) });
    await ctx.screenshot(page, 'keep-blocked');
  }
  await page.close().catch(() => {});
  return guards;
}

/** The scenario the gate runs: the kill test, then the two forced failures. */
export async function runKeep(browser, servers, ctx) {
  const steps = [];
  const inner = { ...ctx, steps };
  const all = [];
  all.push(await killTest(browser, servers, inner));
  if (ctx.engineName === 'chromium') all.push(await quotaTest(browser, servers, inner));
  else steps.push({ name: 'Q. storage full — skipped: the quota is forced through the DevTools protocol, which is Chromium\'s', ok: true });
  all.push(await blockedTest(browser, servers, inner));
  return { steps, guards: all };
}
