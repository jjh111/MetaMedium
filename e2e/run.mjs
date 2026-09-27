#!/usr/bin/env node
//
// The release gate: the browser scenarios that already exist, run without a
// human console (DIRECTOR-REVIEW-2026-09-15.md, QA-1).
//
//     node e2e/run.mjs                        # both surfaces
//     node e2e/run.mjs canvas                 # just the canvas scenario
//     node e2e/run.mjs shard demo demo2       # just the shard's three
//     node e2e/run.mjs --browser webkit smoke # the WebKit smoke
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

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const RESULTS = process.env.E2E_RESULTS ? resolve(process.env.E2E_RESULTS) : join(here, 'results');

const HEADLESS = process.env.E2E_HEADED !== '1';
/** The engines this gate can drive. Chromium runs everything; WebKit runs the smoke. */
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
  // own four, and naming it in the default list would run it twice on Chromium.
  const all = ['canvas', 'shard', 'demo', 'demo2', 'smoke'];
  const byDefault = ['canvas', 'shard', 'demo', 'demo2'];
  const picked = wanted.length ? all.filter((n) => wanted.includes(n)) : byDefault;
  if (!picked.length) {
    console.error(`nothing to run — pick from: ${all.join(', ')}`);
    process.exit(2);
  }

  rmSync(RESULTS, { recursive: true, force: true });
  mkdirSync(RESULTS, { recursive: true });

  const needCanvas = picked.includes('canvas') || picked.includes('smoke');
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
