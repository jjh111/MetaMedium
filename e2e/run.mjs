#!/usr/bin/env node
//
// The release gate: the browser scenarios that already exist, run without a
// human console (DIRECTOR-REVIEW-2026-09-15.md, QA-1).
//
//     node e2e/run.mjs                        # both surfaces
//     node e2e/run.mjs canvas                 # just the canvas scenario
//     node e2e/run.mjs shard demo demo2       # just the shard's three
//     node e2e/run.mjs --browser webkit smoke # the WebKit smoke
//     node e2e/run.mjs keep                   # no lost work: the kill test, the forced failures
//     node e2e/run.mjs boards                 # several named boards: the list, the trash, the switch
//     node e2e/run.mjs big                    # a 2,000-mark board saved and opened again (minutes)
//     node e2e/run.mjs app                    # one app address: /app/ installs, opens offline, is versioned per release
//     node e2e/run.mjs budgets                # the surface's budgets on 2,000 marks; the 500-mark board painted both ways; a board of 5 artifacts and 5,000 traced strokes opened (I2)
//     node e2e/run.mjs pencil                 # pencil and tablet: pen, finger, palm, hover, the keyboard (also --browser webkit)
//     node e2e/run.mjs models                 # a hosted model is asked, and says why when it cannot be — against a stub provider
//     node e2e/run.mjs seat                   # the canvas's seat: Claude Code over MCP as a model the field asks (a relay and the hand of its own)
//     node e2e/run.mjs hand                   # the hand in the gate: QA-v10's machine rows with Demos/mcp.mjs in a room of its own (two hands, A7)
//
// It starts its own servers on ports the OS hands out, opens a FRESH browser
// context per scenario (no profile, no cache, no board carried over from the
// last one), loads each scenario's own harness, awaits the result object the
// harness actually returns, and exits nonzero if anything in it failed.
//
// What it does NOT do: reimplement the scenarios. `Demos/session-engine.e2e.js`
// and `shard-3d/e2e.js` remain the tests; this is the thing that runs them.
//
// First time: `cd e2e && npm ci && npx playwright install chromium`.

import { chromium, webkit } from 'playwright';
import { mkdirSync, rmSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { startStatic, startVite } from './servers.mjs';
import { isModelRequest, allowedError, ALLOWED_PAGE_ERRORS } from './guards.mjs';
import { runKeep, runBig } from './keep.mjs';
import { boardOf, serveBoard, openBoard, interact, equivalence, judge, fmt, calibrateInPage, tooLoaded, rendererInPage, softwareRaster, CALIBRATION_MS, countCanvasCalls, pictureFacts, PAINT_STROKE_CALLS_MAX, BLIT_DIFF_MAX } from './budgets.mjs';
import { runBoards } from './boards.mjs';
import { runApp } from './app.mjs';
import { runPencil } from './pencil.mjs';
import { runModels } from './models.mjs';
import { runSeat } from './seat.mjs';
import { runHand } from './hand.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const RESULTS = process.env.E2E_RESULTS ? resolve(process.env.E2E_RESULTS) : join(here, 'results');

const HEADLESS = process.env.E2E_HEADED !== '1';
/** The engines this gate can drive. Chromium runs everything; WebKit runs the smoke, pencil, keep, boards and app (CI's `webkit` job: the first three). */
const ENGINES = { chromium, webkit };
const SCENARIO_TIMEOUT = Number(process.env.E2E_TIMEOUT_MS || 420000);

// ---------------------------------------------------------------------------

/** A context nothing has touched: its own storage, its own cache, its own board. */
async function freshContext(browser, { origins, label }) {
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
    bypassCSP: false,
  });
  const pageErrors = [];
  const consoleErrors = [];
  const modelAttempts = [];

  // Nothing reaches a real model. The canvas stub replaces `fetch` after
  // `__setup()`, but that is the page's own promise to itself; this is the
  // run's, and it covers the shard, which has no stub, and everything before
  // setup runs.
  await context.route('**/*', async (route) => {
    const url = route.request().url();
    const hit = isModelRequest(url, origins);
    if (hit) {
      modelAttempts.push({ what: hit.what, url, method: route.request().method() });
      await route.abort('blockedbyclient');
      return;
    }
    await route.continue();
  });

  context.on('page', (page) => {
    page.on('pageerror', (err) => {
      pageErrors.push({ text: String(err && err.stack ? err.stack : err), url: page.url() });
    });
    page.on('console', (msg) => {
      if (msg.type() === 'error') consoleErrors.push({ text: msg.text(), url: page.url() });
    });
  });

  return { context, pageErrors, consoleErrors, modelAttempts, label };
}

/** Split the harness's own records into pass / fail / skip. A record whose name
 *  says it skipped is a SKIP, not a pass — the review's point exactly. */
function tally(steps) {
  let pass = 0, fail = 0, skip = 0;
  const skipped = [];
  for (const s of steps || []) {
    if (!s.ok) { fail++; continue; }
    if (/\bskip(ped)?\b/i.test(s.name || '')) { skip++; skipped.push(s.name); continue; }
    pass++;
  }
  return { pass, fail, skip, skipped };
}

function verdict(result, guards) {
  const bad = [];
  if (result.harnessError) bad.push(`harness threw: ${result.harnessError}`);
  if (result.fail > 0) bad.push(`${result.fail} failed assertion${result.fail === 1 ? '' : 's'}`);
  if (result.reportedOk === false && result.fail === 0) {
    bad.push('the harness reported pass:false with no failed record');
  }
  if (guards.modelAttempts.length) {
    bad.push(`${guards.modelAttempts.length} request(s) to a live model were attempted`);
  }
  for (const e of result.unexpectedErrors || []) bad.push(`unexpected page error: ${e.text.split('\n')[0]}`);
  return bad;
}

function sortErrors(pageErrors) {
  const expected = [], unexpected = [];
  for (const e of pageErrors) {
    const hit = allowedError(e.text);
    if (hit) expected.push({ ...e, allowedAs: hit.name, reason: hit.reason });
    else unexpected.push(e);
  }
  return { expected, unexpected };
}

// ---------------------------------------------------------------------------
// The four scenarios. Each one only ever: opens a page, loads the harness that
// already exists, calls it, and returns what it returned.
// ---------------------------------------------------------------------------

async function runCanvas(browser, servers) {
  const guards = await freshContext(browser, { origins: [servers.staticOrigin], label: 'canvas' });
  const page = await guards.context.newPage();
  const out = { name: 'canvas', url: `${servers.staticOrigin}/Demos/session-engine.html?fresh=1&nosw=1` };
  try {
    await page.goto(out.url, { waitUntil: 'load', timeout: 60000 });
    await page.waitForFunction(() => window.__mm && window.__mm.session, null, { timeout: 60000 });
    await page.addScriptTag({ path: join(root, 'Demos', 'session-engine.e2e.js') });
    await page.waitForFunction(() => typeof window.__setup === 'function', null, { timeout: 30000 });
    const r = await page.evaluate(async () => {
      window.__setup();
      const res = await window.__scenario();
      return { steps: res.steps, pass: res.pass };
    }, { timeout: SCENARIO_TIMEOUT });
    out.steps = r.steps;
    out.reportedOk = r.pass;
    Object.assign(out, tally(r.steps));
  } catch (err) {
    out.harnessError = String(err && err.message ? err.message : err);
    // What the run had got through before it died, for the report.
    out.steps = await page.evaluate(() => (window.__Rlive ? window.__Rlive.steps : [])).catch(() => []);
    Object.assign(out, tally(out.steps));
    await screenshot(page, 'canvas');
  }
  const sorted = sortErrors(guards.pageErrors);
  out.expectedErrors = sorted.expected;
  out.unexpectedErrors = sorted.unexpected;
  out.modelAttempts = guards.modelAttempts;
  out.problems = verdict(out, guards);
  out.ok = out.problems.length === 0;
  if (!out.ok) await screenshot(page, 'canvas');
  await guards.context.close();
  return out;
}

/**
 * Which harness the shard exports, by the name this runner is asked for.
 *
 * `__scenario` is the whole loop, `__demo` the mug of `SHARD-3D-PLAN.md` §9,
 * and `__demo2` its successor — the loop on John's own drawing
 * (`SHARD-3D-PUSH-2.md` G4). The scenario is called `shard` on the command
 * line and `__scenario` in the page, and that mismatch is the whole reason
 * this is a table: reading the name twice, once here and once at the call, is
 * how the scenario silently waited thirty seconds for `window[undefined]`.
 */
const SHARD_SCENARIOS = {
  shard: { as: 'scenario', harness: '__scenario' },
  demo: { as: 'demo', harness: '__demo' },
  demo2: { as: 'demo2', harness: '__demo2' },
};

async function runShard(browser, servers, which /* 'shard' | 'demo' | 'demo2' */) {
  const { as, harness } = SHARD_SCENARIOS[which];
  const guards = await freshContext(browser, { origins: [servers.shardOrigin], label: `shard-${as}` });
  const page = await guards.context.newPage();
  // A bare URL, never `?demo=…`: a demo page seats its own stub before the test
  // arrives, and the run that failed on that in the review was the test's
  // mistake, not the app's. The gate can only open the clean page.
  const out = { name: `shard-${as}`, url: `${servers.shardOrigin}/` };
  try {
    await page.goto(out.url, { waitUntil: 'load', timeout: 90000 });
    await page.waitForFunction(() => !!window.__shard, null, { timeout: 90000 });
    await page.addScriptTag({ path: join(root, 'shard-3d', 'e2e.js') });
    await page.waitForFunction((w) => typeof window[w] === 'function', harness, { timeout: 30000 });
    const r = await page.evaluate(
      async (w) => {
        const res = await window[w]();
        return {
          steps: res.steps,
          ok: res.ok,
          passed: res.passed,
          failed: res.failed,
          error: res.error,
          totalMs: res.totalMs,
          // A number a harness measured (the shard's silhouette cache, L2d) —
          // kept in the result JSON and printed under the scenario's line.
          measured: res.measured,
        };
      },
      harness,
      { timeout: SCENARIO_TIMEOUT },
    );
    out.steps = r.steps;
    out.reportedOk = r.ok;
    out.totalMs = r.totalMs;
    if (r.measured) out.measured = r.measured;
    if (r.error) out.harnessError = r.error; // "window.__shard is not there" and its kin
    Object.assign(out, tally(r.steps));
  } catch (err) {
    out.harnessError = String(err && err.message ? err.message : err);
    out.steps = out.steps || [];
    Object.assign(out, tally(out.steps));
    await screenshot(page, out.name);
  }
  const sorted = sortErrors(guards.pageErrors);
  out.expectedErrors = sorted.expected;
  out.unexpectedErrors = sorted.unexpected;
  out.modelAttempts = guards.modelAttempts;
  out.problems = verdict(out, guards);
  out.ok = out.problems.length === 0;
  if (!out.ok) await screenshot(page, out.name);
  await guards.context.close();
  return out;
}

/**
 * The WebKit smoke (DIRECTOR-REVIEW-2026-09-15.md; the review's own words).
 *
 * This is a SMOKE, not an iPhone test: a desktop WebKit, headless, doing the
 * shortest thing that is still the product — the board loads, a hand draws ink
 * with real pointer input, the engine reads that ink back, press-and-hold
 * opens the field, and one pill in it is taken with a click (week 1's plan:
 * draw, hold, the field opens, one pill taken). It runs in seconds. Anything
 * longer is a second gate, and a gate whoever waits on it will turn off.
 *
 * It deliberately does NOT load `session-engine.e2e.js`: that harness is over
 * 200 records and its own stub model, and running it on a second engine would be a
 * second full gate wearing the word "smoke".
 */
async function runSmoke(browser, servers) {
  const guards = await freshContext(browser, { origins: [servers.staticOrigin], label: 'smoke' });
  const page = await guards.context.newPage();
  const out = { name: 'smoke', url: `${servers.staticOrigin}/Demos/session-engine.html?fresh=1&nosw=1` };
  const steps = [];
  const check = (name, ok, detail) => steps.push({ name, ok: !!ok, detail });
  try {
    await page.goto(out.url, { waitUntil: 'load', timeout: 60000 });
    await page.waitForFunction(() => window.__mm && window.__mm.session, null, { timeout: 60000 });
    check('the board loads', true);

    // Ink, drawn the way a hand draws it: down, a path, up. Not `addStroke` —
    // the point of a second engine is the input path, not the engine's maths.
    const y = 520, x0 = 400, span = 300;
    await page.mouse.move(x0, y);
    await page.mouse.down();
    for (let i = 1; i <= 20; i++) await page.mouse.move(x0 + (span * i) / 20, y);
    await page.mouse.up();

    const read = await page.evaluate(() => {
      const MM = window.__mm.MM, s = window.__mm.session.getState();
      const ids = s.contentIds.filter((id) => !s.artifacts.includes(id));
      const n = ids.length ? s.nodes.get(ids[ids.length - 1]) : null;
      const r = n && MM.interpretationsOf(n, s.nodes)[0];
      return { marks: ids.length, label: r && r.label, weight: r && r.weight, tier: r && r.tier };
    });
    check(
      `ink is drawn and read back — ${read.marks} mark, read as ${read.label} ${read.weight}`,
      read.marks === 1 && read.label === 'line' && read.weight > 0,
      read,
    );

    // Press and hold, the way in that needs no mark drawn (v10 D5).
    await page.mouse.move(x0 + span / 2, y);
    await page.mouse.down();
    const opened = await page
      .waitForFunction(() => !!window.__mm.session.getState().summon, null, { timeout: 5000 })
      .then(() => true)
      .catch(() => false);
    await page.mouse.up();
    check('press and hold opens the field', opened);

    // One pill taken, with a click. A held line is offered *Draw them clean*
    // — tier 1, the one pill of its three that asks no model — and taking it
    // gives the mark its clean form beside the ink (`MM.cleanOf`, core's
    // `session/clean.ts`): the pill found by its label, pressed by the
    // engine's own pointer, and the board read for what it did.
    const cleanOfLast = () => {
      const MM = window.__mm.MM, s = window.__mm.session.getState();
      const ids = s.contentIds.filter((id) => !s.artifacts.includes(id));
      const n = ids.length ? s.nodes.get(ids[ids.length - 1]) : null;
      const c = n && MM.cleanOf(n);
      return c ? c.shape : null;
    };
    const pill = page.locator('#summon .pill.item', { hasText: 'Draw them clean' });
    const offered = opened ? await pill.count() : 0;
    const before = await page.evaluate(cleanOfLast);
    if (offered === 1) await pill.click({ timeout: 5000 });
    const taken = offered === 1 && await page
      .waitForFunction(cleanOfLast, null, { timeout: 5000 })
      .then(() => true)
      .catch(() => false);
    const after = await page.evaluate(cleanOfLast);
    check(
      `one pill taken — Draw them clean, and the line carries its clean form (${after || 'none'})`,
      offered === 1 && !before && taken && after === 'line',
      { offered, before, after },
    );
  } catch (err) {
    out.harnessError = String(err && err.message ? err.message : err);
    await screenshot(page, 'smoke');
  }
  out.steps = steps;
  out.reportedOk = steps.length > 0 && steps.every((s) => s.ok);
  Object.assign(out, tally(steps));
  const sorted = sortErrors(guards.pageErrors);
  out.expectedErrors = sorted.expected;
  out.unexpectedErrors = sorted.unexpected;
  out.modelAttempts = guards.modelAttempts;
  out.problems = verdict(out, guards);
  out.ok = out.problems.length === 0;
  if (!out.ok) await screenshot(page, 'smoke');
  await guards.context.close();
  return out;
}

/**
 * No lost work (V1-PLAN R3; `keep.mjs`): the kill test and the forced
 * failures; several named boards (R1; `boards.mjs`); and one app address
 * (R7; `app.mjs`). Unlike the others they open several contexts or pages of
 * their own — each with the gate's guards — because a board kept by the
 * browser is only tested by closing the page that kept it and opening
 * another, and an app that opens offline only by taking its server away.
 * The seat (J4; `seat.mjs`) is one of them too: it brings its own relay and
 * the MCP hand that answers, and reloads its page. So does the hand (H1;
 * `hand.mjs`): a relay, the MCP hand and a counting model of its own.
 */
const OWN_PAGES = { keep: runKeep, big: runBig, boards: runBoards, app: runApp, pencil: runPencil, models: runModels, seat: runSeat, hand: runHand };
const OWN_URL = { app: 'app/', models: 'app/', seat: 'Demos/session-engine.html?live=claude&relay=…', hand: 'Demos/session-engine.html?live=mcp-test&relay=…' };
async function runKeepScenario(browser, servers, engineName, which = 'keep') {
  const out = { name: which, url: `${servers.staticOrigin}/${OWN_URL[which] || 'Demos/session-engine.html?nosw=1'}` };
  let guards = [];
  try {
    const r = await OWN_PAGES[which](browser, servers, { freshContext, engineName, screenshot });
    out.steps = r.steps;
    out.measured = r.measured;
    guards = r.guards;
  } catch (err) {
    out.harnessError = String(err && err.stack ? err.stack : err);
    out.steps = out.steps || [];
  }
  out.reportedOk = out.steps.length > 0 && out.steps.every((s) => s.ok);
  Object.assign(out, tally(out.steps));
  const merged = { pageErrors: [], modelAttempts: [] };
  for (const g of guards) { merged.pageErrors.push(...g.pageErrors); merged.modelAttempts.push(...g.modelAttempts); }
  const sorted = sortErrors(merged.pageErrors);
  out.expectedErrors = sorted.expected;
  out.unexpectedErrors = sorted.unexpected;
  out.modelAttempts = merged.modelAttempts;
  out.problems = verdict(out, merged);
  out.ok = out.problems.length === 0;
  for (const g of guards) await g.context.close().catch(() => {});
  return out;
}

/** PERF.md's open budget at 5,000 marks, 3 s, as a rate: what a board of traced pictures is held to (I2). */
const OPEN_MS_PER_MARK = 0.6;

/**
 * The surface's budgets and the equivalence check (V1-PLAN.md §9 R4c;
 * `budgets.mjs`). First the 500-mark board of the bench, painted both ways
 * mark by mark and after boxes drawn and undone: what a hand's paint draws
 * and says must be what the whole-board read draws and says. That is not a
 * speed, so it always runs. Then the 2,000-mark board opened as a folder,
 * panned and drawn on, each budget a step with its number. A machine too
 * loaded to measure, or much slower than the one the budgets were set on
 * (the calibration, budgets.mjs), says so in each budget's name and skips it
 * — never a silent pass. Last, a board of five artifacts and 5,000 strokes
 * traced from pictures opened, held to PERF.md's open budget at that size
 * (V1-PLAN I2).
 */
async function runBudgets(browser, servers, engineName) {
  const out = { name: 'budgets', url: `${servers.staticOrigin}/Demos/session-engine.html?folder=…` };
  const steps = [];
  const check = (name, ok, detail) => steps.push({ name, ok: !!ok, detail });
  const guardsList = [];
  const measured = {};
  let page = null;
  try {
    const { loadCore, summarize } = await import('../metamedium-core/bench/lib.mjs');
    const { generateBoard } = await import('../metamedium-core/bench/board.mjs');
    const { core } = await loadCore('bundle');

    // 1. The 500-mark board, painted both ways.
    {
      const board = boardOf(core, generateBoard, 500);
      const guards = await freshContext(browser, { origins: [servers.staticOrigin], label: 'budgets-500' });
      guardsList.push(guards);
      await serveBoard(guards.context, servers.staticOrigin, board);
      const opened = await openBoard(guards.context, servers.staticOrigin, { capMs: 5 * 60000 });
      page = opened.page;
      if (!page) check('R4c. the 500-mark board opens', false, opened.out);
      else {
        const eq = await equivalence(page, { strokes: 3 });
        const share = eq.ink.of ? Math.round((100 * eq.ink.drawn) / eq.ink.of) : 100;
        measured.equivalence500 = { paints: eq.checks, marks: eq.marks, differed: eq.differed, inkDrawnPct: share };
        check(`R4c. the 500-mark board: ${eq.marks} marks pointed at one by one at zoom 1, ${eq.strokes} boxes drawn and undone, every mark held — what is drawn and said equals the whole-board read (${eq.checks} paints and tables compared; the pointed-at paints stroked ${share}% of the ink the whole-board read stroked, the minimap every mark)`,
          eq.differed === 0 && eq.checks >= eq.marks && eq.minimap.drawn === eq.minimap.of && eq.ink.drawn < eq.ink.of,
          eq.differed ? eq.first : { paints: eq.checks, ink: eq.ink, minimap: eq.minimap, held: eq.held });
      }
      page = null;
      await guards.context.close();
    }

    // 2. The budgets, on the 2,000-mark board.
    const name = (b) => `R4c budget, 2,000 marks — ${b.label}`;
    const skipAll = (why) => { for (const b of judge({})) check(`${name(b)} — skipped: ${why}`, true, { why }); };
    if (engineName !== 'chromium') skipAll('the budgets were set in Chromium');
    else if (tooLoaded(NaN)) skipAll(tooLoaded(NaN));
    else {
      const board = boardOf(core, generateBoard, 2000);
      const guards = await freshContext(browser, { origins: [servers.staticOrigin], label: 'budgets-2000' });
      guardsList.push(guards);
      await serveBoard(guards.context, servers.staticOrigin, board);
      const opened = await openBoard(guards.context, servers.staticOrigin, { capMs: 5 * 60000 });
      page = opened.page;
      if (!page) {
        check(`${name(judge({})[0])}: the board did not open — ${opened.out.why}`, false, opened.out);
      } else {
        const calibration = await page.evaluate(calibrateInPage);
        measured.calibrationMs = +calibration.toFixed(1);
        measured.renderer = await page.evaluate(rendererInPage);
        const why = tooLoaded(calibration) || softwareRaster(measured.renderer);
        if (why) skipAll(why);
        else {
          const r = await interact(page, { summarize, strokes: 5, size: 2000 });
          const verdict = judge({ open: opened.out, draw: r.draw, panWork: r.panWork, panFit: r.panFit });
          measured.budgets2000 = Object.fromEntries(verdict.map((b) => [b.key, b.value === null ? null : +b.value.toFixed(1)]));
          for (const b of verdict) {
            check(`${name(b)}: ${fmt(b.value)} ${b.ok ? '≤' : '>'} ${fmt(b.max)}${b.said ? ' (' + b.said + ')' : ''}`, b.ok,
              { value: b.value, max: b.max, calibrationMs: measured.calibrationMs, releases: r.strokes.map((x) => Math.round(x.upToFrame)), handlers: r.strokes.map((x) => Math.round(x.up)), readings: r.draw.readings, drawn: r.draw.drawn });
          }
          // The reading drawn under each box is the box's: the release was read, not skipped.
          check('R4c. each box drawn on the 2,000-mark board has its reading drawn under it, the moment it is released (a box round marks is a loop that waits, and has none)',
            r.draw.drawn.length === 5 && r.draw.drawn.every((d, i) => r.draw.waits[i] ? d === null : typeof d === 'string' && /^rectangle/.test(d)), { drawn: r.draw.drawn, waits: r.draw.waits });
        }
      }
      page = null;
      await guards.context.close();
    }

    // 3. Pictures traced into ink beside artifacts (V1-PLAN I2): 2 SVG figures
    //    and 3 pictures of 1,667 traced strokes — 5 artifacts, 5,000 marks, the
    //    strokes of each picture one connected group — opened as a folder. It
    //    took 96 s (one task of 95 s) before the groups were settled once an
    //    event instead of once a stroke; the budget is PERF.md's for 5,000
    //    marks, 3 s (`OPEN_MS_PER_MARK`).
    {
      const { importedBoard } = await import('../metamedium-core/bench/board.mjs');
      const label = 'I2 budget, 5 artifacts and 5,000 traced strokes — open: navigation → the board drawn';
      if (engineName !== 'chromium') check(`${label} — skipped: the budgets were set in Chromium`, true, { why: 'the budgets were set in Chromium' });
      else if (tooLoaded(NaN)) check(`${label} — skipped: ${tooLoaded(NaN)}`, true, { why: tooLoaded(NaN) });
      else {
        const made = importedBoard(core, { pictures: 3, strokesEach: 1667, svgs: 2 });
        const board = { marks: made.marks, events: made.events.length, json: JSON.stringify(made.events), jsonl: core.encodeLog(made.events) };
        const guards = await freshContext(browser, { origins: [servers.staticOrigin], label: 'budgets-pictures' });
        guardsList.push(guards);
        await serveBoard(guards.context, servers.staticOrigin, board);
        const opened = await openBoard(guards.context, servers.staticOrigin, { capMs: 5 * 60000 });
        page = opened.page;
        if (!page) check(`${label}: the board did not open — ${opened.out.why}`, false, opened.out);
        else {
          const calibration = await page.evaluate(calibrateInPage);
          const why = tooLoaded(calibration);
          const st = opened.out.state;
          // Every traced stroke is a mark of its own on the board (small ones gather into words on the content plane, so count the ink).
          const ink = await page.evaluate(() => { let n = 0; for (const node of window.__mm.session.getState().nodes.values()) if (node.reps.some((r) => r.modality === 'stroke')) n++; return n; });
          check(`I2. the board of pictures opens whole: ${st.artifacts} artifacts and ${ink} traced strokes`,
            st.artifacts === 5 && ink === made.marks, { state: st, ink, expected: { artifacts: 5, strokes: made.marks } });
          const max = OPEN_MS_PER_MARK * made.marks;
          measured.picturesOpenMs = +opened.out.drawnMs.toFixed(0);
          if (why) check(`${label} — skipped: ${why}`, true, { why, drawnMs: opened.out.drawnMs, calibrationMs: +calibration.toFixed(1) });
          else check(`${label}: ${fmt(opened.out.drawnMs)} ${opened.out.drawnMs <= max ? '≤' : '>'} ${fmt(max)} (${OPEN_MS_PER_MARK} ms a mark)`, opened.out.drawnMs <= max,
            { drawnMs: opened.out.drawnMs, max, longestTaskMs: opened.out.longestTaskMs, marks: made.marks, calibrationMs: +calibration.toFixed(1) });
        }
        page = null;
        await guards.context.close();
      }
    }
    // 4. P1 (V1-PLAN; PERF.md "After P1"): a board of pictures traced into ink is drawn once and blitted, not stroked
    //    again every frame. Facts about what a paint does, never a time — so they run on any machine, a loaded one and a
    //    software renderer too, where the pan's own frame is skipped by name above. (On this container's Chromium a pan
    //    frame of such a board took 117 ms before it, and drawing the same strokes as 18 paths instead of 10,014 took
    //    just as long: the raster is bound by the geometry, not the calls.)
    {
      const { importedBoard } = await import('../metamedium-core/bench/board.mjs');
      const label = 'P1. a board of 2 pictures of 1,000 traced strokes beside a figure';
      if (engineName !== 'chromium') check(`${label} — skipped: the paint's calls are counted in Chromium`, true, { why: 'counted in Chromium' });
      else {
        const made = importedBoard(core, { pictures: 2, strokesEach: 1000, svgs: 1 });
        const board = { marks: made.marks, events: made.events.length, json: JSON.stringify(made.events), jsonl: core.encodeLog(made.events) };
        const guards = await freshContext(browser, { origins: [servers.staticOrigin], label: 'budgets-p1' });
        guardsList.push(guards);
        await serveBoard(guards.context, servers.staticOrigin, board);
        await guards.context.addInitScript(countCanvasCalls);
        const opened = await openBoard(guards.context, servers.staticOrigin, { capMs: 5 * 60000 });
        page = opened.page;
        if (!page) check(`${label}: the board did not open`, false, opened.out);
        else {
          const f = await page.evaluate(pictureFacts, BLIT_DIFF_MAX);
          measured.pictureFacts = f;
          const same = (x) => !!x && x.differ <= f.allow;
          check(`${label}: the board holds its ${made.marks} traced strokes and the surface has the ink's raster`, f.hook && f.strokes === made.marks, { strokes: f.strokes, expected: made.marks, hook: f.hook });
          check(`P1. settled, the paint holds the strokes in one raster and blits it (${f.opened ? f.opened.held : '—'} held, drawn ${f.opened ? f.opened.builds : '—'}×)`,
            !!f.opened && f.opened.held >= made.marks * 0.95 && f.opened.builds >= 1 && f.opened.blitted, f.opened);
          check(`P1. a paint with it makes ${f.calls ? f.calls.stroke : '—'} stroke() calls, at most ${PAINT_STROKE_CALLS_MAX} (the ${made.marks} strokes drawn alone make ${2 * made.marks})`,
            !!f.calls && f.calls.stroke <= PAINT_STROKE_CALLS_MAX, f.calls);
          check(`P1. the canvas with the raster is the canvas without it (${f.atRest ? f.atRest.differ : '—'} of ${f.pixels} pixels differ, by more than rounding; at most ${f.allow} are allowed)`, same(f.atRest) && f.atRest.blitted, f.atRest);
          check(`P1. twenty pans inside its margin draw it again ${f.pan ? f.pan.builds : '—'} times and blit it ${f.pan ? f.pan.hits : '—'}, a paint's stroke() calls at most ${f.pan ? f.pan.maxStrokeCalls : '—'}, and the panned canvas is the canvas without the raster (${f.panned ? f.panned.differ : '—'} pixels differ)`,
            !!f.pan && f.pan.builds === 0 && f.pan.hits === 20 && f.pan.live === 0 && f.pan.maxStrokeCalls <= PAINT_STROKE_CALLS_MAX && same(f.panned) && f.panned.blitted, { pan: f.pan, panned: f.panned });
          check(`P1. never stale — a zoom is painted live at once, the raster not blitted and the canvas the unrastered one (${f.zoomAtOnce ? f.zoomAtOnce.differ : '—'} pixels differ), and drawn again, once, when the paint settles (${f.zoomSettled ? f.zoomSettled.differ : '—'} differ)`,
            same(f.zoomAtOnce) && !f.zoomAtOnce.blitted && same(f.zoomSettled) && f.zoomSettled.blitted && f.zoomSettled.builds === 1, { atOnce: f.zoomAtOnce, settled: f.zoomSettled });
          check(`P1. never stale — a stroke drawn is on the canvas at once and in the raster drawn again when the paint settles (${f.drawnAtOnce ? f.drawnAtOnce.differ : '—'} then ${f.drawnSettled ? f.drawnSettled.differ : '—'} pixels differ); an undo the same (${f.undoneAtOnce ? f.undoneAtOnce.differ : '—'} then ${f.undoneSettled ? f.undoneSettled.differ : '—'})`,
            same(f.drawnAtOnce) && !f.drawnAtOnce.blitted && same(f.drawnSettled) && f.drawnSettled.blitted && f.drawnSettled.builds === 1 && same(f.undoneAtOnce) && !f.undoneAtOnce.blitted && same(f.undoneSettled) && f.undoneSettled.blitted,
            { drawn: [f.drawnAtOnce, f.drawnSettled], undone: [f.undoneAtOnce, f.undoneSettled] });
          check(`P1. a mark a drag moves is out of the raster while it moves and leaves nothing behind (${f.dragSettled ? f.dragSettled.differ : '—'} pixels differ; ${f.dragSettled ? f.dragSettled.heldBefore - f.dragSettled.held : '—'} fewer held), and the drop is the canvas without the raster (${f.dropSettled ? f.dropSettled.differ : '—'})`,
            !!f.target && same(f.dragAtOnce) && same(f.dragSettled) && f.dragSettled.blitted && f.dragSettled.heldBefore - f.dragSettled.held >= 1 && same(f.dropAtOnce) && same(f.dropSettled) && f.dropSettled.blitted,
            { target: f.target, atOnce: f.dragAtOnce, settled: f.dragSettled, drop: [f.dropAtOnce, f.dropSettled] });
          // What is drawn is what the whole-board read would draw (R4c's check), on this board too — through the raster.
          const pc = await page.evaluate(() => { window.__mm.fitAll(); const id = window.__mm.session.getState().contentIds[0]; window.__mm.inspect(id); const r = window.__mm.paintCheck(); window.__mm.inspect(null); return { ok: r.ok, diffs: r.diffs.slice(0, 3), ink: r.ink, minimap: r.minimap }; });
          check(`P1. a hand's paint of the board of pictures draws what the whole-board read draws (${pc.ink.drawn} ink ops of ${pc.ink.of}, the minimap ${pc.minimap.drawn} of ${pc.minimap.of})`, pc.ok && pc.minimap.drawn === pc.minimap.of, pc);
        }
        page = null;
        await guards.context.close();
      }
    }
  } catch (err) {
    out.harnessError = String(err && err.stack ? err.stack : err);
    if (page) await screenshot(page, 'budgets');
  }
  out.steps = steps;
  out.measured = measured;
  out.reportedOk = steps.length > 0 && steps.every((s) => s.ok);
  Object.assign(out, tally(steps));
  const merged = { pageErrors: [], modelAttempts: [] };
  for (const g of guardsList) { merged.pageErrors.push(...g.pageErrors); merged.modelAttempts.push(...g.modelAttempts); }
  const sorted = sortErrors(merged.pageErrors);
  out.expectedErrors = sorted.expected;
  out.unexpectedErrors = sorted.unexpected;
  out.modelAttempts = merged.modelAttempts;
  out.problems = verdict(out, merged);
  out.ok = out.problems.length === 0;
  for (const g of guardsList) await g.context.close().catch(() => {});
  return out;
}

async function screenshot(page, name) {
  try {
    mkdirSync(RESULTS, { recursive: true });
    await page.screenshot({ path: join(RESULTS, `${name}-failure.png`), fullPage: false, timeout: 15000 });
  } catch { /* a screenshot of a dead page is not worth failing over */ }
}

// ---------------------------------------------------------------------------

async function main() {
  const argv = process.argv.slice(2);
  // `--browser webkit` or `--browser=webkit`. Default chromium: the four large
  // scenarios are Chromium's, and the default run must not need a second engine
  // installed to say anything at all.
  let engineName = 'chromium';
  const flag = argv.findIndex((a) => a === '--browser' || a.startsWith('--browser='));
  if (flag >= 0) {
    engineName = argv[flag].includes('=') ? argv[flag].split('=')[1] : argv[flag + 1];
    if (!ENGINES[engineName]) {
      console.error(`unknown browser "${engineName}" — pick from: ${Object.keys(ENGINES).join(', ')}`);
      process.exit(2);
    }
    argv.splice(flag, argv[flag].includes('=') ? 1 : 2);
  }

  const wanted = argv.filter((a) => !a.startsWith('-'));
  // `smoke` is opt-in: it is the short WebKit interaction, not part of the gate's
  // own scenarios, and naming it in the default list would run it twice on Chromium.
  // `pencil` is in the default list (Chromium) and CI's `webkit` job runs it again on WebKit.
  // `big` is opt-in too: a 2,000-mark board saved and opened again, minutes of replay.
  const all = ['canvas', 'keep', 'boards', 'app', 'pencil', 'models', 'seat', 'hand', 'budgets', 'shard', 'demo', 'demo2', 'smoke', 'big'];
  const byDefault = ['canvas', 'keep', 'boards', 'app', 'pencil', 'models', 'seat', 'hand', 'budgets', 'shard', 'demo', 'demo2'];
  const picked = wanted.length ? all.filter((n) => wanted.includes(n)) : byDefault;
  if (!picked.length) {
    console.error(`nothing to run — pick from: ${all.join(', ')}`);
    process.exit(2);
  }

  rmSync(RESULTS, { recursive: true, force: true });
  mkdirSync(RESULTS, { recursive: true });

  const needCanvas = picked.includes('canvas') || picked.includes('smoke') || picked.includes('keep') || picked.includes('boards') || picked.includes('big') || picked.includes('app') || picked.includes('pencil') || picked.includes('models') || picked.includes('seat') || picked.includes('hand') || picked.includes('budgets');
  const needShard = picked.includes('shard') || picked.includes('demo') || picked.includes('demo2');

  const started = Date.now();
  const servers = {};
  const stops = [];
  let browser;
  let browserVersion = null;
  const scenarios = [];

  try {
    if (needCanvas) {
      const s = await startStatic(root);
      servers.staticOrigin = s.origin;
      stops.push(s.stop);
      console.log(`· static  ${s.origin}  (repo root, no-store)`);
    }
    if (needShard) {
      const shardDir = join(root, 'shard-3d');
      if (!existsSync(join(shardDir, 'node_modules'))) {
        throw new Error('shard-3d has no node_modules — run `npm ci` in shard-3d/ first');
      }
      const v = await startVite(shardDir);
      servers.shardOrigin = v.origin;
      stops.push(v.stop);
      console.log(`· vite    ${v.origin}  (shard-3d, core from source)`);
    }

    browser = await ENGINES[engineName].launch({ headless: HEADLESS });
    browserVersion = browser.version();
    console.log(`· ${engineName} ${browserVersion}${HEADLESS ? '' : ' (headed)'}\n`);

    for (const name of picked) {
      const at = Date.now();
      const r = name === 'canvas'
        ? await runCanvas(browser, servers)
        : name === 'smoke'
          ? await runSmoke(browser, servers)
          : OWN_PAGES[name]
            ? await runKeepScenario(browser, servers, engineName, name)
            : name === 'budgets'
              ? await runBudgets(browser, servers, engineName)
              : await runShard(browser, servers, name);
      r.browser = engineName;
      r.durationMs = Date.now() - at;
      scenarios.push(r);
      console.log(
        `▸ ${r.name} — ${r.ok ? 'ok' : 'FAILED'} — ${r.pass} passed, ${r.fail} failed, ${r.skip} skipped (${Math.round(r.durationMs / 1000)}s)`,
      );
      for (const s of r.skipped || []) console.log(`    skip: ${s}`);
      if (r.measured) console.log(`    measured: ${JSON.stringify(r.measured)}`);
      for (const p of r.problems || []) console.log(`    ✗ ${p}`);
    }
  } finally {
    if (browser) await browser.close().catch(() => {});
    for (const stop of stops) await stop().catch(() => {});
  }

  const totals = scenarios.reduce(
    (a, s) => ({ pass: a.pass + s.pass, fail: a.fail + s.fail, skip: a.skip + s.skip }),
    { pass: 0, fail: 0, skip: 0 },
  );
  const ok = scenarios.every((s) => s.ok);
  const report = {
    ok,
    startedAt: new Date(started).toISOString(),
    durationMs: Date.now() - started,
    browser: engineName,
    browserVersion: browserVersion,
    // Kept under its old name so anything reading last week's report still reads.
    chromium: engineName === 'chromium' ? browserVersion : null,
    node: process.version,
    totals,
    allowlist: ALLOWED_PAGE_ERRORS.map(({ name, where, reason }) => ({ name, where, reason })),
    scenarios,
  };
  writeFileSync(join(RESULTS, 'e2e.json'), JSON.stringify(report, null, 2));
  for (const s of scenarios) {
    writeFileSync(join(RESULTS, `${s.name}.json`), JSON.stringify(s, null, 2));
  }

  console.log(
    `\n${ok ? 'PASS' : 'FAIL'} — ${totals.pass} passed, ${totals.fail} failed, ${totals.skip} skipped` +
      ` across ${scenarios.length} scenario${scenarios.length === 1 ? '' : 's'}` +
      ` in ${Math.round(report.durationMs / 1000)}s`,
  );
  console.log(`results: ${RESULTS}`);
  process.exit(ok ? 0 : 1);
}

main().catch((err) => {
  console.error('\nthe runner itself fell over:');
  console.error(err && err.stack ? err.stack : err);
  try {
    mkdirSync(RESULTS, { recursive: true });
    writeFileSync(join(RESULTS, 'e2e.json'), JSON.stringify({ ok: false, runnerError: String(err && err.stack ? err.stack : err) }, null, 2));
  } catch { /* nothing left to write with */ }
  process.exit(1);
});
