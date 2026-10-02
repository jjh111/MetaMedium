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
//   a stroke's release, halfway through a stroke, right after an undo, a
//   moment after the last act, right after a board switch or in the middle of
//   one (R1: two boards, switched through the boards pane mid-session). The
//   page is opened again in a new tab and BOTH boards must hold EVERY stroke
//   whose release the page had taken, in order, and nothing undone. Several
//   cycles, each killing at its own point, on boards that grow across them;
//   the seed is printed, so a failure can be run again exactly
//   (`E2E_KEEP_SEED`).
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
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// The ground boxes are drawn on: clear of the panel (left), the bar (top),
// the minimap (bottom right) and the status line — one box a cell, so no box
// ever crosses another (a crossing could be read as a scratch and erase it).
export const GRID = { x0: 470, y0: 140, w: 100, h: 80, cols: 7, rows: 7 };

export function cellBox(i, rand) {
  const col = i % GRID.cols, row = Math.floor(i / GRID.cols) % GRID.rows;
  const w = 36 + Math.round(rand() * 24), h = 26 + Math.round(rand() * 22);
  const x = GRID.x0 + col * GRID.w + 10 + Math.round(rand() * (GRID.w - 20 - w));
  const y = GRID.y0 + row * GRID.h + 8 + Math.round(rand() * (GRID.h - 16 - h));
  return { x, y, w, h };
}

/**
 * The pointer path of a box: down at a corner, round the edges, lifted just
 * short of closing. Six moves an edge — Chromium delivers one move a frame, so
 * a point costs the run a frame, and six an edge still reads as a box.
 */
export function boxPath(b) {
  const corners = [[b.x, b.y], [b.x + b.w, b.y], [b.x + b.w, b.y + b.h], [b.x, b.y + b.h], [b.x + 2, b.y + 4]];
  const pts = [{ x: b.x, y: b.y }];
  for (let c = 1; c < corners.length; c++) {
    const [x0, y0] = corners[c - 1], [x1, y1] = corners[c];
    for (let k = 1; k <= 6; k++) pts.push({ x: x0 + ((x1 - x0) * k) / 6, y: y0 + ((y1 - y0) * k) / 6 });
  }
  return pts;
}

/** What a stroke is, for comparing: where it began and ended, and how many points. */
export const sig = (pts) => ({ x0: +pts[0].x.toFixed(2), y0: +pts[0].y.toFixed(2), x1: +pts[pts.length - 1].x.toFixed(2), y1: +pts[pts.length - 1].y.toFixed(2), n: pts.length });
export const sameSig = (a, b) => a.x0 === b.x0 && a.y0 === b.y0 && a.x1 === b.x1 && a.y1 === b.y1 && a.n === b.n;

/**
 * Draw a path with the real pointer; `stopAfter` lifts nothing and returns
 * halfway (a stroke cut off); `release: 'send'` sends the release and returns
 * without waiting for the page to take it (a kill that lands during it).
 */
export async function drawPath(page, pts, stopAfter, opts) {
  await page.mouse.move(pts[0].x, pts[0].y);
  await page.mouse.down();
  const last = stopAfter === undefined ? pts.length : Math.min(stopAfter, pts.length);
  for (let i = 1; i < last; i++) await page.mouse.move(pts[i].x, pts[i].y);
  if (stopAfter !== undefined) return false;
  if (opts && opts.release === 'send') { page.mouse.up().catch(() => {}); return true; }
  await page.mouse.up();
  return true;
}

/**
 * The board is open once the page says so — or at once, on a page that keeps its board
 * synchronously — and, where the page keeps several (R1), once its list is read and no
 * switch is under way. `pin: false` leaves the view where the board opened it.
 */
export async function waitReady(page, timeout = 60000, opts) {
  await page.waitForFunction(() => {
    const mm = window.__mm;
    if (!mm || !mm.session) return false;
    if (typeof mm.board === 'function' && !mm.board().ready) return false;
    if (typeof mm.boards === 'function') { const b = mm.boards(); if (!b.ready || b.switching) return false; }
    return true;
  }, null, { timeout, polling: 50 });
  // World = screen, so the points the pointer drew are the points the log holds.
  if (!opts || opts.pin !== false) await page.evaluate(() => window.__mm.setView(1, 0, 0));
}

export async function strokesOnBoard(page) {
  return page.evaluate(() => window.__mm.session.getEvents()
    .filter((e) => e.type === 'stroke')
    .map((e) => ({ x0: +e.points[0].x.toFixed(2), y0: +e.points[0].y.toFixed(2), x1: +e.points[e.points.length - 1].x.toFixed(2), y1: +e.points[e.points.length - 1].y.toFixed(2), n: e.points.length })));
}

export const statusText = (page) => page.evaluate(() => document.getElementById('status').textContent || '');

/** Close the page the abrupt way: a crashed renderer, or a closed tab with nothing waited for. */
export async function killPage(page, how, cdp) {
  if (how === 'crash') {
    const crashed = new Promise((r) => page.once('crash', r));
    cdp.send('Page.crash').catch(() => {}); // never resolves: the target is gone
    await Promise.race([crashed, sleep(5000)]);
    // A crashed page never answers a close; the context's end takes it.
  } else {
    await page.close({ runBeforeUnload: false });
  }
}

// ===== The boards pane, driven the way a hand drives it (V1-PLAN R1) =====
// The control centre, then the boards tile; a board's name in the pane opens it.

/** What the page says about its boards: the one on screen, the list, whether a switch is under way. */
export const boardsNow = (page) => page.evaluate(() => (typeof window.__mm.boards === 'function' ? window.__mm.boards() : null));

/** The boards pane, opened through the control centre and its tile. */
export async function openBoardsPane(page) {
  const open = await page.evaluate(() => { const p = document.getElementById('boardsPanel'); return !!p && !p.hasAttribute('hidden'); });
  if (open) return;
  await page.click('#ccBtn');
  await page.click('#boardsBtn', { timeout: 5000 });
  await page.waitForSelector('#boardsPanel:not([hidden])', { timeout: 5000 });
}
/** The pane closed by its own ×, so nothing of it stands over the ground the hand draws on. */
export async function closeBoardsPane(page) {
  const open = await page.evaluate(() => { const p = document.getElementById('boardsPanel'); return !!p && !p.hasAttribute('hidden'); });
  if (open) await page.click('#boardsPanel .paneClose');
}
/** Wait until the page is on board `id`, its list read and no switch under way. */
export async function waitOnBoard(page, id, timeout = 20000) {
  await page.waitForFunction((want) => {
    const mm = window.__mm;
    if (!mm || typeof mm.boards !== 'function') return false;
    const b = mm.boards();
    return b.ready && !b.switching && b.current === want && mm.board().ready;
  }, id, { timeout, polling: 50 });
}
/** Open a board by its name in the pane, wait until the page is on it, and pin the view again (world = screen). */
export async function switchTo(page, id) {
  await openBoardsPane(page);
  await page.click(`#boardsPanel button[data-open="${id}"]`);
  await waitOnBoard(page, id);
  await closeBoardsPane(page);
  await page.evaluate(() => window.__mm.setView(1, 0, 0));
}
/** A new board through the pane's own button; resolves to its id once the page is on it. */
export async function newBoardVia(page) {
  await openBoardsPane(page);
  const before = ((await boardsNow(page)) || { list: [] }).list.map((e) => e.id);
  await page.click('#boardsPanel button[data-board-new]');
  const handle = await page.waitForFunction((b4) => {
    const b = window.__mm.boards();
    const e = b.list.find((x) => x.kind === 'board' && !b4.includes(x.id));
    return e && b.ready && !b.switching && b.current === e.id && window.__mm.board().ready ? e.id : null;
  }, before, { timeout: 20000, polling: 50 });
  const id = await handle.jsonValue();
  await closeBoardsPane(page);
  await page.evaluate(() => window.__mm.setView(1, 0, 0));
  return id;
}

/**
 * The kill test, across board switches (R3, and R1's "nothing lost"). One
 * context (one browser's storage) keeping TWO boards: the first, and one made
 * through the boards pane in the first cycle. Each cycle opens the page in a
 * new tab — which opens the board opened last — checks that board, switches to
 * the other through the pane and checks it too, then draws, switching between
 * the two now and then, and is killed at its own random point: after a
 * release, during one, mid-stroke, after an undo, a moment later — or right
 * after a switch, or in the middle of one. Both boards must come back whole.
 */
export async function killTest(browser, servers, ctx) {
  const { freshContext, engineName, steps } = ctx;
  const check = (name, ok, detail) => steps.push({ name, ok: !!ok, detail });
  const seed = Number(process.env.E2E_KEEP_SEED || (Date.now() % 1e9));
  const cycles = Number(process.env.E2E_KEEP_CYCLES || DEFAULT_CYCLES);
  const rand = rng(seed);
  const guards = await freshContext(browser, { origins: [servers.staticOrigin], label: 'keep-kill' });
  const url = `${servers.staticOrigin}/Demos/session-engine.html?nosw=1`;
  const FIRST = 'default';
  const expected = { [FIRST]: [] }; // board id → its completed strokes, in log order
  let other = null;     // the second board, made through the pane in the first cycle
  let optional = null;  // { board, sig }: a stroke whose release the kill may have landed before, or after
  let cell = 0;
  const tally = { crash: 0, close: 0, phases: {}, switches: 0 };
  let page = null;
  const other_ = (id) => (id === FIRST ? other : FIRST);
  // A board as it reopened, against what it must hold; a release a kill landed during is there whole and last, or not at all.
  const settle = (id, got) => {
    const eq = (want) => got.length === want.length && got.every((s, i) => sameSig(s, want[i]));
    if (optional && optional.board === id && eq(expected[id].concat([optional.sig]))) { expected[id].push(optional.sig); tally.landedDuring = (tally.landedDuring || 0) + 1; optional = null; }
    const whole = eq(expected[id]);
    const out = { board: id, expected: expected[id].length, got: got.length, missing: expected[id].filter((s) => !got.some((o) => sameSig(o, s))).length, extra: got.filter((o) => !expected[id].some((s) => sameSig(o, s))).length, whole };
    // What the next cycle builds on is the board as it reopened.
    if (!whole) expected[id] = got.slice();
    return out;
  };
  try {
    for (let c = 1; c <= cycles + 1; c++) {
      page = await guards.context.newPage();
      await page.goto(url, { waitUntil: 'load', timeout: 60000 });
      await waitReady(page);
      if (c > 1) {
        const opened = (await boardsNow(page) || {}).current || FIRST;
        const first = settle(opened, await strokesOnBoard(page));
        let second = null;
        if (other) { await switchTo(page, other_(opened)); tally.switches++; second = settle(other_(opened), await strokesOnBoard(page)); }
        optional = null;
        const both = [first].concat(second ? [second] : []);
        check(`K${c - 1}. reopened after kill ${c - 1}: both boards whole — every completed stroke on each, in order, nothing undone (${both.map((b) => (b.board === FIRST ? 'first' : 'second') + ' ' + b.got + ' of ' + b.expected).join(', ')})`,
          both.length === 2 && both.every((b) => b.whole), { seed, cycle: c - 1, opened, boards: both });
      }
      if (c > cycles) break;
      // The second board, made the way a hand makes one: the pane's own button.
      if (!other) { other = await newBoardVia(page); if (other) expected[other] = []; tally.switches++; }
      let cur = (await boardsNow(page) || {}).current || FIRST;
      // A crash is Chromium's; WebKit's pages are closed.
      const how = engineName === 'chromium' && rand() < 0.6 ? 'crash' : 'close';
      const cdp = how === 'crash' ? await guards.context.newCDPSession(page) : null;
      const phases = ['after-release', 'mid-stroke', 'after-undo', 'a-moment-later', 'after-switch', 'mid-switch'].concat(how === 'crash' ? ['during-release'] : []);
      const phase = phases[Math.floor(rand() * phases.length)];
      const n = 2 + Math.floor(rand() * 4);
      // Half the cycles switch boards between two strokes, mid-session.
      const switchAt = rand() < 0.5 ? 1 + Math.floor(rand() * (n - 1)) : -1;
      for (let s = 0; s < n; s++) {
        if (s === switchAt && other) { cur = other_(cur); await switchTo(page, cur); tally.switches++; }
        const pts = boxPath(cellBox(cell++, rand));
        await drawPath(page, pts);
        expected[cur].push(sig(pts));
        // An undo now and then, mid-cycle: the log shrinks, and the store must follow.
        if (s < n - 1 && rand() < 0.25) {
          await page.click('#undoBtn');
          expected[cur].pop();
        }
      }
      if (phase === 'mid-stroke') {
        const pts = boxPath(cellBox(cell++, rand));
        await drawPath(page, pts, 3 + Math.floor(rand() * (pts.length - 6))); // down, some moves, no release
      } else if (phase === 'after-undo') {
        await page.click('#undoBtn');
        expected[cur].pop();
      } else if (phase === 'a-moment-later') {
        await sleep(Math.round(rand() * 400));
      } else if (phase === 'during-release') {
        const pts = boxPath(cellBox(cell++, rand));
        await drawPath(page, pts, undefined, { release: 'send' });
        // 0–25 ms behind the release: some kills land before the page takes it, some while or after.
        await sleep(Math.floor(rand() * 26));
        optional = { board: cur, sig: sig(pts) };
      } else if (phase === 'after-switch' && other) {
        cur = other_(cur);
        await switchTo(page, cur);
        tally.switches++;
      } else if (phase === 'mid-switch' && other) {
        // The switch begun and the page killed 0–25 ms into it: the board being left was written as it changed.
        await openBoardsPane(page);
        page.click(`#boardsPanel button[data-open="${other_(cur)}"]`).catch(() => {});
        await sleep(Math.floor(rand() * 26));
        tally.switches++;
      }
      await killPage(page, how, cdp);
      tally[how]++;
      tally.phases[phase] = (tally.phases[phase] || 0) + 1;
      page = null;
    }
    check(`K. ${cycles} kills across ${tally.switches} board switches (${tally.crash} crashed, ${tally.close} closed; ${Object.entries(tally.phases).map(([k, v]) => v + ' ' + k).join(', ')}${tally.phases['during-release'] ? '; ' + (tally.landedDuring || 0) + ' of the releases a kill landed during were taken first' : ''}), seed ${seed}`,
      !!other && tally.switches >= cycles, { seed, tally, other });
    if (page) await page.close().catch(() => {});
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
    // Since R2 the file is version 1: its first line is the header, and every line after it is an event.
    const isHeader = (l) => { try { const h = JSON.parse(l); return h.format === 'metamedium-log' && h.version === 1; } catch (e) { return false; } };
    check(`B2. "export the log" in the line hands over the whole board as a file (${lines.length - 1} of ${events} events after its version 1 header, ${download.suggestedFilename()})`,
      download.suggestedFilename() === 'canvas.jsonl' && isHeader(lines[0]) && lines.length === events + 1 && lines.slice(1).every((l) => { try { return !!JSON.parse(l).type; } catch (e) { return false; } }),
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

/**
 * Flush on the way out. Writes go as they happen, so what can be pending is a
 * write waiting for its retry: storage refused it, then made room, and the next
 * try is not due yet. Leaving the page then — the tab closed (pagehide), or
 * hidden and then killed (visibilitychange, and a crash that says nothing) —
 * must write it on the way out. Chromium: the refusal is the quota's.
 */
export async function flushTest(browser, servers, ctx) {
  const { freshContext, steps } = ctx;
  const check = (name, ok, detail) => steps.push({ name, ok: !!ok, detail });
  const url = `${servers.staticOrigin}/Demos/session-engine.html?nosw=1`;
  const all = [];
  for (const how of ['pagehide', 'visibilitychange']) {
    const guards = await freshContext(browser, { origins: [servers.staticOrigin], label: 'keep-flush-' + how });
    all.push(guards);
    let page = await guards.context.newPage();
    try {
      const cdp = await guards.context.newCDPSession(page);
      await page.goto(`${servers.staticOrigin}/404.html`, { waitUntil: 'load' });
      await cdp.send('Storage.overrideQuotaForOrigin', { origin: servers.staticOrigin, quotaSize: 1 });
      await page.goto(url, { waitUntil: 'load' });
      await waitReady(page);
      const rand = rng(how.length);
      const drawn = [];
      for (let i = 0; i < 2; i++) { const pts = boxPath(cellBox(i, rand)); await drawPath(page, pts); drawn.push(sig(pts)); }
      await page.evaluate(() => window.__mm.boardIdle());
      const failing = await page.evaluate(() => window.__mm.board());
      await cdp.send('Storage.overrideQuotaForOrigin', { origin: servers.staticOrigin });
      const issued = failing.issued;
      if (how === 'pagehide') {
        await page.close({ runBeforeUnload: false });
      } else {
        // Hidden — as when the person switches away — and then the tab dies without another word.
        await page.evaluate(() => {
          Object.defineProperty(document, 'visibilityState', { configurable: true, get: () => 'hidden' });
          document.dispatchEvent(new Event('visibilitychange'));
        });
        const crashed = new Promise((r) => page.once('crash', r));
        cdp.send('Page.crash').catch(() => {});
        await Promise.race([crashed, sleep(5000)]);
      }
      page = await guards.context.newPage();
      await page.goto(url, { waitUntil: 'load' });
      await waitReady(page);
      const back = await strokesOnBoard(page);
      check(`F${how === 'pagehide' ? 1 : 2}. a write waiting for its retry goes on the way out (${how}${how === 'pagehide' ? ', the tab closed' : ', then the renderer crashed'}) — ${back.length} of ${drawn.length} strokes back`,
        failing.trouble && failing.trouble.kind === 'full' && failing.needWhole && back.length === drawn.length && drawn.every((d, i) => sameSig(back[i], d)),
        { trouble: failing.trouble, needWhole: failing.needWhole, issuedBefore: issued, back: back.length });
      await page.close().catch(() => {});
    } catch (err) {
      check(`F. the flush test (${how}) ran to its end`, false, { error: String(err && err.stack ? err.stack : err) });
    }
  }
  return all;
}

/**
 * A board as the surface's autosave wrote it before R3: one string under
 * `mm-log`. Made in the page by the engine the page runs — strokes, a loop
 * taken up with the check and named, so the log carries more than strokes.
 */
function legacyBoard() {
  const MM = window.__mm.MM;
  const s = MM.createSession();
  const line = (a, b, n) => { const p = []; for (let i = 0; i < n; i++) { const t = i / (n - 1); p.push({ x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }); } return p; };
  const rect = (x, y, w, h) => { const v = [{ x, y }, { x: x + w, y }, { x: x + w, y: y + h }, { x, y: y + h }, { x, y }]; let p = []; for (let i = 0; i < 4; i++) p = p.concat(line(v[i], v[i + 1], 20).slice(i ? 1 : 0)); return p; };
  const circle = (cx, cy, r) => { const p = []; for (let i = 0; i <= 90; i++) { const a = (i / 90) * Math.PI * 2; p.push({ x: cx + r * Math.cos(a), y: cy + r * Math.sin(a) }); } return p; };
  let at = 1790000000000;
  for (let i = 0; i < 12; i++) s.addStroke(rect(500 + (i % 4) * 90, 160 + Math.floor(i / 4) * 80, 50, 34), at += 900);
  s.addStroke(circle(560, 190, 70), at += 900);
  s.addStroke(line({ x: 620, y: 180 }, { x: 640, y: 210 }, 20).concat(line({ x: 640, y: 210 }, { x: 690, y: 150 }, 20).slice(1)), at += 400);
  const sum = s.getState().summon;
  if (sum) s.bless({ summonId: sum.id, name: 'pair', at: at += 700 });
  return JSON.stringify(s.getEvents());
}

/**
 * Browser storage's old copy of the board is imported ONCE, UNCHANGED, the
 * first time the store opens; the old key stays until a save to the new store
 * has landed — and when that save fails, it stays, the board still comes back
 * from it, and the failure is said.
 */
export async function importTest(browser, servers, ctx) {
  const { freshContext, steps, engineName } = ctx;
  const check = (name, ok, detail) => steps.push({ name, ok: !!ok, detail });
  const url = `${servers.staticOrigin}/Demos/session-engine.html?nosw=1`;
  const all = [];
  // I1: it simply works.
  {
    const guards = await freshContext(browser, { origins: [servers.staticOrigin], label: 'keep-import' });
    all.push(guards);
    const page = await guards.context.newPage();
    try {
      await page.goto(url + '&fresh=1', { waitUntil: 'load' }); // an engine to write the old board with, and nothing restored
      await waitReady(page);
      const raw = await page.evaluate(legacyBoard);
      await page.goto(`${servers.staticOrigin}/404.html`, { waitUntil: 'load' });
      await page.evaluate((r) => { localStorage.clear(); localStorage.setItem('mm-log', r); }, raw);
      await page.goto(url, { waitUntil: 'load' });
      await waitReady(page);
      await page.evaluate(() => window.__mm.boardIdle());
      const got = await page.evaluate(async () => ({
        board: JSON.stringify(window.__mm.session.getEvents()),
        store: JSON.stringify(await window.__mm.boardLog()),
        key: localStorage.getItem('mm-log'),
        from: window.__mm.board().from,
        records: (await window.__mm.boardRecords()).records.length,
      }));
      const n = JSON.parse(raw).length;
      check(`I1. the board browser storage held (${n} events, a named pair among them) comes back, imported unchanged — byte for byte — into one record, and the old key goes once that has landed`,
        got.from === 'browser storage' && got.board === raw && got.store === raw && got.records === 1 && got.key === null,
        { from: got.from, same: got.board === raw, storeSame: got.store === raw, records: got.records, keyLeft: got.key !== null });
      await drawPath(page, boxPath({ x: 900, y: 420, w: 50, h: 36 }));
      await page.reload({ waitUntil: 'load' });
      await waitReady(page);
      const again = await page.evaluate(() => ({ n: window.__mm.session.getEvents().length, from: window.__mm.board().from, key: localStorage.getItem('mm-log') }));
      check('I1b. opened again: the board is the store\'s, the stroke drawn since is on it, and nothing is imported twice',
        again.from === 'store' && again.n === n + 1 && again.key === null, again);
    } catch (err) {
      check('I1. the import test ran to its end', false, { error: String(err && err.stack ? err.stack : err) });
      await ctx.screenshot(page, 'keep-import');
    }
    await page.close().catch(() => {});
  }
  // I2: the import cannot be written (storage full).
  if (engineName === 'chromium') {
    const guards = await freshContext(browser, { origins: [servers.staticOrigin], label: 'keep-import-full' });
    all.push(guards);
    const page = await guards.context.newPage();
    try {
      await page.goto(url + '&fresh=1', { waitUntil: 'load' });
      await waitReady(page);
      const raw = await page.evaluate(legacyBoard);
      await page.close();
      // A second context: the quota must be down before the store is first opened.
      const g2 = await freshContext(browser, { origins: [servers.staticOrigin], label: 'keep-import-full-2' });
      all.push(g2);
      const p2 = await g2.context.newPage();
      const cdp = await g2.context.newCDPSession(p2);
      await p2.goto(`${servers.staticOrigin}/404.html`, { waitUntil: 'load' });
      await p2.evaluate((r) => localStorage.setItem('mm-log', r), raw);
      await cdp.send('Storage.overrideQuotaForOrigin', { origin: servers.staticOrigin, quotaSize: 1 });
      await p2.goto(url, { waitUntil: 'load' });
      await waitReady(p2);
      await p2.evaluate(() => window.__mm.boardIdle());
      const first = await p2.evaluate(() => ({ board: JSON.stringify(window.__mm.session.getEvents()), key: localStorage.getItem('mm-log'), status: document.getElementById('status').textContent }));
      check('I2. when the import cannot be written, the board still comes back from the old copy, the old key stays, and the line says it is not saved',
        first.board === raw && first.key === raw && /not saved — the browser's storage for this page is full/.test(first.status),
        { same: first.board === raw, keyKept: first.key === raw, status: first.status });
      await cdp.send('Storage.overrideQuotaForOrigin', { origin: servers.staticOrigin });
      await sleep(1700);
      await drawPath(p2, boxPath({ x: 900, y: 420, w: 50, h: 36 }));
      await p2.evaluate(() => window.__mm.boardIdle());
      let later = await p2.evaluate(() => ({ key: localStorage.getItem('mm-log'), status: document.getElementById('status').textContent }));
      for (let i = 0; i < 40 && (later.key !== null || /not saved/.test(later.status)); i++) { await sleep(100); later = await p2.evaluate(() => ({ key: localStorage.getItem('mm-log'), status: document.getElementById('status').textContent })); }
      await p2.reload({ waitUntil: 'load' });
      await waitReady(p2);
      const back = await p2.evaluate(() => ({ n: window.__mm.session.getEvents().length, head: JSON.stringify(window.__mm.session.getEvents().slice(0, -1)), from: window.__mm.board().from }));
      check('I2b. room again: the next save imports it — the old key goes only then — and a reload brings the board and the stroke back from the store',
        later.key === null && !/not saved/.test(later.status) && back.from === 'store' && back.head === raw && back.n === JSON.parse(raw).length + 1,
        { keyGone: later.key === null, status: later.status, back: { n: back.n, from: back.from, same: back.head === raw } });
      await p2.close().catch(() => {});
    } catch (err) {
      check('I2. the import-when-full test ran to its end', false, { error: String(err && err.stack ? err.stack : err) });
      await ctx.screenshot(page, 'keep-import-full');
    }
  } else {
    steps.push({ name: 'I2. import when storage is full — skipped: the quota is forced through the DevTools protocol, which is Chromium\'s', ok: true });
  }
  return all;
}

/**
 * Two tabs on one board: one writes it. The second shows it, writes nothing
 * and says so; when the first lets go it takes over — unless the first wrote
 * after the second opened, which it says instead.
 */
export async function tabsTest(browser, servers, ctx) {
  const { freshContext, steps } = ctx;
  const check = (name, ok, detail) => steps.push({ name, ok: !!ok, detail });
  const guards = await freshContext(browser, { origins: [servers.staticOrigin], label: 'keep-tabs' });
  const url = `${servers.staticOrigin}/Demos/session-engine.html?nosw=1`;
  const open = async () => { const p = await guards.context.newPage(); await p.goto(url, { waitUntil: 'load' }); await waitReady(p); return p; };
  const strokes = (p) => p.evaluate(() => window.__mm.session.getEvents().filter((e) => e.type === 'stroke').length);
  const stored = (p) => p.evaluate(async () => ((await window.__mm.boardLog()) || []).filter((e) => e.type === 'stroke').length);
  const rand = rng(3);
  let cell = 0;
  const draw = (p) => drawPath(p, boxPath(cellBox(cell++, rand)));
  try {
    const a = await open();
    await draw(a);
    const b = await open(); // waits out the lock (1.5 s), then shows the board read-only
    const bState = await b.evaluate(() => window.__mm.board());
    const bSaid = await statusText(b);
    await draw(b);
    await sleep(300);
    check('T1. a second tab shows the board, writes nothing, and says so — with the way out',
      bState.state === 'readonly' && bState.lock === 'taken' && (await strokes(b)) === 2 && (await stored(a)) === 1 &&
        /not saved here — this board is open in another tab/.test(bSaid) && /export the log/.test(bSaid),
      { state: bState.state, lock: bState.lock, status: bSaid });
    // The first tab lets go having written nothing more: the second takes over and writes what it drew.
    await a.close();
    let took = null;
    for (let i = 0; i < 40; i++) { took = await b.evaluate(() => window.__mm.board()); if (took.state === 'armed' && !took.inFlight && took.landed > 0) break; await sleep(100); }
    const afterA = await stored(b);
    check('T2. when the first tab closes, the second holds the board and saves what it drew there',
      took.state === 'armed' && took.lock === 'held' && afterA === 2 && !/not saved/.test(await statusText(b)), { state: took.state, lock: took.lock, stored: afterA });
    // A third tab opens (read-only); the one holding the board draws; then lets go.
    const c = await open();
    await draw(b);
    await sleep(200);
    await b.close();
    let cState = null;
    for (let i = 0; i < 40; i++) { cState = await c.evaluate(() => window.__mm.board()); if (cState.lock === 'held') break; await sleep(100); }
    await sleep(200);
    cState = await c.evaluate(() => window.__mm.board());
    const cSaid = await statusText(c);
    check('T3. a tab that opened before the board changed elsewhere never writes over it — it says to reload',
      cState.state === 'readonly' && /not saved here — another tab changed this board/.test(cSaid) && (await stored(c)) === 3,
      { state: cState.state, status: cSaid });
    await c.reload({ waitUntil: 'load' });
    await waitReady(c);
    check('T3b. reloaded, it holds the board as the other tab left it', (await strokes(c)) === 3 && (await c.evaluate(() => window.__mm.board().state)) === 'armed');
    // The tab holding the board opens a folder: its log is the folder's now, and it lets the board go.
    const d = await open();
    await c.evaluate(async () => { const mm = window.__mm; await mm.openStore(new mm.MM.MemoryStore(), 'folder', 'elsewhere'); });
    let dState = null;
    for (let i = 0; i < 40; i++) { dState = await d.evaluate(() => window.__mm.board()); if (dState.state === 'armed') break; await sleep(100); }
    await draw(d);
    await d.evaluate(() => window.__mm.boardIdle());
    check('T4. a tab that opens a folder lets the board go, and the tab waiting for it takes it up',
      dState.state === 'armed' && dState.lock === 'held' && (await stored(d)) === 4, { state: dState.state, lock: dState.lock });
    await c.close();
    await d.close();
  } catch (err) {
    check('T. the two-tab test ran to its end', false, { error: String(err && err.stack ? err.stack : err) });
  }
  return guards;
}

/**
 * Pages that are not the device's board never write it: a live room keeps no
 * log of its own (DIRECTOR-PLAN-W2 L1), and a replay and an embed are figures
 * — the whitepaper embeds both, on the same origin as the canvas.
 */
export async function notMineTest(browser, servers, ctx) {
  const { freshContext, steps } = ctx;
  const check = (name, ok, detail) => steps.push({ name, ok: !!ok, detail });
  const guards = await freshContext(browser, { origins: [servers.staticOrigin], label: 'keep-not-mine' });
  const base = `${servers.staticOrigin}/Demos/session-engine.html?nosw=1`;
  const rand = rng(9);
  let cell = 0;
  const draw = (p) => drawPath(p, boxPath(cellBox(cell++, rand)));
  try {
    const own = await guards.context.newPage();
    await own.goto(base, { waitUntil: 'load' });
    await waitReady(own);
    await draw(own); await draw(own);
    await own.evaluate(() => window.__mm.boardIdle());
    await own.close();
    const seen = {};
    for (const [what, q] of [['a live room', '&live=keep-test'], ['an embed', '&embed=1'], ['a replay', '&replay=recordings/canonical-loop.json&embed=1']]) {
      const p = await guards.context.newPage();
      await p.goto(base + q, { waitUntil: 'load' });
      await p.waitForFunction(() => window.__mm && window.__mm.session, null, { timeout: 30000 });
      await sleep(700);
      seen[what] = { restored: await p.evaluate(() => window.__mm.session.getEvents().filter((e) => e.type === 'stroke').length), mode: await p.evaluate(() => window.__mm.board().mode) };
      if (what !== 'a replay') await drawPath(p, boxPath(cellBox(cell++, rand)));
      await sleep(300);
      await p.close();
    }
    const back = await guards.context.newPage();
    await back.goto(base, { waitUntil: 'load' });
    await waitReady(back);
    const n = await back.evaluate(() => window.__mm.session.getEvents().filter((e) => e.type === 'stroke').length);
    check(`L1. a live room, an embed and a replay neither bring the device's board in nor write over it — the board is its own two strokes afterwards (${n})`,
      n === 2 && Object.values(seen).every((x) => x.mode === 'off') && seen['a live room'].restored === 0 && seen['an embed'].restored === 0,
      { seen, after: n });
    await back.close();
  } catch (err) {
    check('L. the pages-that-are-not-the-board test ran to its end', false, { error: String(err && err.stack ? err.stack : err) });
  }
  return guards;
}

/**
 * The size that failed now holds (opt-in: `node e2e/run.mjs big`, minutes).
 *
 * A 2,000-mark board from the engine benchmark's own generator
 * (`core/bench/board.mjs`, seed 1) is put on a board the page keeps
 * — `session.load`, the call the surface makes when it opens a board — and the
 * surface's journal writes it; a stroke is drawn on it with the real pointer;
 * the page is reloaded and the board must come back, every event equal. Its
 * log is 6.6 M characters: browser storage refuses anything past about 5 M
 * under one key, which is where autosave used to stop, silently (PERF.md).
 * Each open replays the whole board, and at 2,000 marks that is the slow part
 * (R4's, not R3's): about a minute and a half each in Chromium.
 */
export async function bigTest(browser, servers, ctx) {
  const { freshContext, steps } = ctx;
  const check = (name, ok, detail) => steps.push({ name, ok: !!ok, detail });
  const marks = Number(process.env.E2E_BIG_MARKS || 2000);
  const { loadCore } = await import('../core/bench/lib.mjs');
  const { generateBoard } = await import('../core/bench/board.mjs');
  const { core } = await loadCore('bundle');
  const { events } = generateBoard(core, { marks, seed: 1 });
  const json = JSON.stringify(events);
  const guards = await freshContext(browser, { origins: [servers.staticOrigin], label: 'keep-big' });
  await guards.context.route('**/__keep/board.json', (route) => route.fulfill({ status: 200, contentType: 'application/json', body: json }));
  const page = await guards.context.newPage();
  const measured = {};
  const long = 20 * 60000;
  try {
    await page.goto(`${servers.staticOrigin}/Demos/session-engine.html?nosw=1`, { waitUntil: 'load' });
    await waitReady(page);
    let t = Date.now();
    await page.evaluate(async () => {
      const evs = await (await fetch('/__keep/board.json')).json();
      window.__mm.session.load(evs);
    });
    measured.loadS = +((Date.now() - t) / 1000).toFixed(1);
    t = Date.now();
    await page.evaluate(() => window.__mm.boardIdle());
    measured.wholeWriteS = +((Date.now() - t) / 1000).toFixed(2);
    const saved = await page.evaluate(async () => {
      const b = window.__mm.board();
      const got = await window.__mm.boardRecords();
      return { trouble: b.trouble, how: b.how, records: got.records.map((r) => ({ base: r.base, n: r.n, chars: r.text.length })) };
    });
    check(`G1. a ${marks}-mark board — ${events.length} events, ${(json.length / 1e6).toFixed(1)} M characters, past the ~5 M browser storage refuses — is kept whole, in one record, with nothing said`,
      !saved.trouble && saved.how === 'indexeddb' && saved.records.length === 1 && saved.records[0].base === 0 && saved.records[0].n === events.length,
      { saved, measured });

    // One more stroke, with the real pointer, on empty ground far from the board.
    await page.evaluate(() => window.__mm.setView(1, -60000, -60000));
    t = Date.now();
    await drawPath(page, boxPath({ x: 640, y: 320, w: 70, h: 44 }));
    measured.releaseS = +((Date.now() - t) / 1000).toFixed(1);
    await page.evaluate(() => window.__mm.boardIdle());
    const appended = await page.evaluate(async () => {
      const got = await window.__mm.boardRecords();
      return { records: got.records.map((r) => ({ base: r.base, n: r.n, chars: r.text.length })), events: window.__mm.session.getEvents().length, trouble: window.__mm.board().trouble };
    });
    const before = await page.evaluate(() => JSON.stringify(window.__mm.session.getEvents()));
    check(`G2. a stroke on it is one record of one event (${appended.records.length > 1 ? appended.records[1].chars : '?'} characters) — nothing rewritten`,
      !appended.trouble && appended.records.length === 2 && appended.records[1].n === 1 && appended.records[1].base === events.length && appended.events === events.length + 1,
      appended);

    t = Date.now();
    // Not 'load': the replay may begin before the load event, and hold it for as long as it runs.
    await page.reload({ waitUntil: 'commit', timeout: long });
    await waitReady(page, long);
    measured.restoreS = +((Date.now() - t) / 1000).toFixed(1);
    const back = await page.evaluate(() => ({ log: JSON.stringify(window.__mm.session.getEvents()), from: window.__mm.board().from, trouble: window.__mm.board().trouble }));
    check(`G3. reloaded: the board comes back from the store, every one of its ${events.length + 1} events equal`,
      back.from === 'store' && !back.trouble && back.log === before,
      { from: back.from, same: back.log === before, chars: back.log.length, measured });
  } catch (err) {
    check('G. the 2,000-mark test ran to its end', false, { error: String(err && err.stack ? err.stack : err), measured });
    await ctx.screenshot(page, 'keep-big');
  }
  await page.close().catch(() => {});
  return { guards, measured };
}

export async function runBig(browser, servers, ctx) {
  const steps = [];
  const { guards, measured } = await bigTest(browser, servers, { ...ctx, steps });
  return { steps, guards: [guards], measured };
}

/**
 * A picture imported right before the tab dies is there on reopen (PLAN-IPAD-NOTES I1). The bytes are written
 * to the asset store first (its own transaction, committed before the event exists) and the event is written to
 * the journal in the task that makes it, as every event is — so a kill can land before the asset (no picture,
 * nothing half-made), between the asset and the event (an asset nothing names: collected one day), or after the
 * event (the picture, whole). It can never leave an event naming bytes that were not kept. Each cycle imports a
 * picture of its own colour and is killed right after it (`after`: the import was awaited, so it MUST be there),
 * or a few milliseconds into it (`mid`: there whole, or not at all); the next page finds every picture the board
 * holds drawn in its own colour — read from the asset store, not from anything the first page kept.
 */
export async function pictureTest(browser, servers, ctx) {
  const { freshContext, engineName, steps } = ctx;
  const check = (name, ok, detail) => steps.push({ name, ok: !!ok, detail });
  const guards = await freshContext(browser, { origins: [servers.staticOrigin], label: 'keep-pictures' });
  const url = `${servers.staticOrigin}/Demos/session-engine.html?nosw=1`;
  const seed = Number(process.env.E2E_KEEP_SEED || (Date.now() % 1e9)) + 17;
  const rand = rng(seed);
  const COLOURS = [[200, 40, 40], [40, 160, 60], [50, 70, 210], [210, 170, 30], [150, 60, 170], [20, 150, 160]];
  const expected = []; // the colours of the pictures the board must hold, in the order imported
  let optional = null;
  const phases = ['after', 'mid', 'after', 'mid', 'after', 'after'];
  let page = null;
  // The pictures on the board, each with the colour the canvas shows where it stands and whether its asset is in the store.
  const look = (pg) => pg.evaluate(async () => {
    const mm = window.__mm, MM = mm.MM;
    // Every picture stands clear of the one before (a second never lands on the first): fit them all on screen.
    mm.fitAll();
    const st = mm.session.getState();
    const pics = st.artifacts.map((id) => ({ id, p: MM.pictureOf(st.nodes.get(id)) })).filter((x) => x.p);
    const held = new Set((await mm.assets()).map((a) => a.hash));
    const cv = document.getElementById('canvas'), dpr = window.devicePixelRatio || 1;
    const sample = (id) => {
      const b = MM.boundsOf(mm.session.getState().nodes.get(id)), p = mm.worldToScreen((b.minX + b.maxX) / 2, (b.minY + b.maxY) / 2);
      const d = cv.getContext('2d').getImageData(Math.round(p.x * dpr) - 2, Math.round(p.y * dpr) - 2, 5, 5).data;
      let r = 0, g = 0, b2 = 0; for (let i = 0; i < d.length; i += 4) { r += d[i]; g += d[i + 1]; b2 += d[i + 2]; }
      const n = d.length / 4; return [Math.round(r / n), Math.round(g / n), Math.round(b2 / n)];
    };
    // Every picture read and decoded, then painted: asked for, nothing loading, two frames on.
    const frames = () => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    await frames();
    for (let i = 0; i < 100 && mm.pictureState().loading; i++) await new Promise((r) => setTimeout(r, 50));
    await frames();
    const out = pics.map((x) => ({ asset: x.p.asset || null, stored: !!x.p.asset && held.has(x.p.asset), colour: sample(x.id) }));
    const orphans = st.artifacts.length;
    return { pictures: out, artifacts: orphans, assets: held.size };
  });
  const close = (a, b) => a.every((v, i) => Math.abs(v - b[i]) <= 26);
  try {
    for (let c = 1; c <= phases.length + 1; c++) {
      page = await guards.context.newPage();
      await page.goto(url, { waitUntil: 'load', timeout: 60000 });
      await waitReady(page);
      const seen = await look(page);
      const colours = seen.pictures.map((p) => p.colour);
      if (c > 1) {
        const want = expected.slice();
        let ok = seen.pictures.length === want.length || (optional && seen.pictures.length === want.length + 1);
        if (ok && optional && seen.pictures.length === want.length + 1) { want.push(optional); }
        optional = null;
        ok = ok && seen.pictures.length === want.length && want.every((w, i) => close(colours[i], w)) && seen.pictures.every((p) => p.stored);
        if (ok && seen.pictures.length > expected.length) expected.push(want[want.length - 1]);
        check(`P${c - 1}. reopened after kill ${c - 1} (${phases[c - 2]}): every picture imported is on the board, drawn in its own colour from the asset store, and every event's bytes are kept`,
          ok, { seed, cycle: c - 1, want, got: colours, stored: seen.pictures.map((p) => p.stored) });
      }
      if (c > phases.length) break;
      const colour = COLOURS[(c - 1) % COLOURS.length];
      const how = engineName === 'chromium' && rand() < 0.6 ? 'crash' : 'close';
      const cdp = how === 'crash' ? await guards.context.newCDPSession(page) : null;
      const phase = phases[c - 1];
      const run = page.evaluate(async ([rgb, n]) => {
        const cvs = document.createElement('canvas'); cvs.width = 640; cvs.height = 480;
        const g = cvs.getContext('2d'); g.fillStyle = 'rgb(' + rgb.join(',') + ')'; g.fillRect(0, 0, 640, 480);
        const blob = await new Promise((res) => cvs.toBlob(res, 'image/png'));
        const file = new File([blob], 'keep-' + n + '.png', { type: 'image/png' });
        await window.__mm.importPictures([file], { view: { minX: 480, minY: 140, maxX: 1380, maxY: 740 } });
        return true;
      }, [colour, c]).catch(() => false);
      if (phase === 'after') { await run; expected.push(colour); }
      else { await sleep(Math.floor(rand() * 60)); optional = colour; }
      await killPage(page, how, cdp);
      page = null;
    }
    check(`P. ${phases.length} kills right after (and during) a picture's import, seed ${seed}`, true, { seed });
    if (page) await page.close().catch(() => {});
  } catch (err) {
    check(`P. the picture kill test ran to its end (seed ${seed})`, false, { error: String(err && err.stack ? err.stack : err) });
    if (page) await ctx.screenshot(page, 'keep-pictures');
  }
  return guards;
}

/** The scenario the gate runs: the kill test, the forced failures, the import, two tabs, and the pages that are not the board. */
export async function runKeep(browser, servers, ctx) {
  const steps = [];
  const inner = { ...ctx, steps };
  const all = [];
  const measured = {};
  const timed = async (name, fn) => { const t = Date.now(); const r = await fn(); measured[name] = +((Date.now() - t) / 1000).toFixed(1); return r; };
  all.push(await timed('kill s', () => killTest(browser, servers, inner)));
  if (ctx.engineName === 'chromium') all.push(await timed('full s', () => quotaTest(browser, servers, inner)));
  else steps.push({ name: 'Q. storage full — skipped: the quota is forced through the DevTools protocol, which is Chromium\'s', ok: true });
  if (ctx.engineName === 'chromium') all.push(...(await timed('flush s', () => flushTest(browser, servers, inner))));
  else steps.push({ name: 'F. flush on the way out — skipped: a write waiting for its retry needs the quota, forced through the DevTools protocol, which is Chromium\'s', ok: true });
  all.push(await timed('blocked s', () => blockedTest(browser, servers, inner)));
  all.push(...(await timed('import s', () => importTest(browser, servers, inner))));
  all.push(await timed('pictures s', () => pictureTest(browser, servers, inner)));
  all.push(await timed('tabs s', () => tabsTest(browser, servers, inner)));
  all.push(await timed('not mine s', () => notMineTest(browser, servers, inner)));
  return { steps, guards: all, measured };
}
