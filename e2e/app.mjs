// One app address (V1-PLAN.md §7 and §9 R7), as a scenario of the gate.
//
//     node e2e/run.mjs app
//     node e2e/run.mjs --browser webkit app
//
// /app/ on the Pages site is the board: a page that loads the surface from
// Demos/ — made from Demos/session-engine.html by scripts/build-app.mjs — with
// a manifest and a service worker of its own, so it installs and opens with no
// network at that address. The old address, Demos/session-engine.html, keeps
// working exactly as it did, and so does every address the whitepaper links.
//
// What must hold (R7's done-means, and its traps):
//   - every file /app/ asks for answers — the stylesheet, the fragments' build,
//     the engine bundle, the manifest, the service worker — and the query is
//     the page's own: ?board= and ?fresh= are read there, and /app?… lands on
//     /app/?… as Pages sends it;
//   - the manifest's start_url and scope are /app/; the worker's scope covers
//     the page AND the page is controlled by it — a worker registered at a
//     narrower scope than its page does nothing and says nothing, so the scope
//     is tested, not the registration;
//   - a box drawn at /app/ comes back on a reload the worker served, and after
//     one visit the board opens with the server gone;
//   - the help pane says the version, VERSION's;
//   - a release renames the cache, so after the new release's first network
//     fetch the old release's shell is never served — beside a control that
//     shows what a cache that kept its name serves instead;
//   - a request that carries a key is never kept by the worker.
//
// "Offline" here is the server gone — connection refused — not Playwright's
// offline switch, which in WebKit fails a request before the worker can answer
// it (a phone with no signal still reaches its worker).

import { readFileSync, mkdtempSync, mkdirSync, cpSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { startStatic } from './servers.mjs';
import { rng, sleep, cellBox, boxPath, sig, sameSig, drawPath, waitReady, strokesOnBoard } from './keep.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');

/** The repository's version, the one line the release script keeps. */
const versionIn = (dir) => readFileSync(join(dir, 'VERSION'), 'utf8').trim();
/** What the app's worker must hold after one visit, relative to the site's root. */
const APP_SHELL = ['app/', 'app/manifest.webmanifest', 'Demos/session-engine.js', 'Demos/surface/surface.css', 'Demos/metamedium-core.browser.js', 'QA-v8.md'];
/** What a copy of the site needs for the app to open and for its build to run (the release, in part C). */
const SITE = ['VERSION', 'QA-v8.md', 'app', 'Demos/session-engine.html', 'Demos/session-engine.js', 'Demos/metamedium-core.browser.js', 'Demos/surface/surface.css', 'Demos/sw.js', 'Demos/manifest.webmanifest'];

/** Every response of the site's own origin that failed while the page was open (the host's favicon is not the site's). */
function watchFailures(page, origin) {
  const failed = [];
  const mine = (u) => u.startsWith(origin) && !u.endsWith('/favicon.ico');
  page.on('response', (r) => { if (mine(r.url()) && r.status() >= 400) failed.push(r.status() + ' ' + r.url().slice(origin.length)); });
  page.on('requestfailed', (q) => { if (mine(q.url())) failed.push('failed ' + q.url().slice(origin.length) + ' ' + ((q.failure() || {}).errorText || '')); });
  return failed;
}

/** The worker the page has: its registration's scope, the controller's script, whether the page is controlled. */
const workerOf = (page, ms = 20000) => page.evaluate(async (wait) => {
  if (!('serviceWorker' in navigator)) return { supported: false };
  const late = (v) => new Promise((r) => setTimeout(() => r(v), wait));
  const reg = await Promise.race([navigator.serviceWorker.ready, late(null)]);
  if (!reg) return { supported: true, reg: false, href: location.href };
  if (!navigator.serviceWorker.controller) {
    await Promise.race([new Promise((ok) => navigator.serviceWorker.addEventListener('controllerchange', ok, { once: true })), late(null)]);
  }
  const c = navigator.serviceWorker.controller;
  return { supported: true, reg: true, scope: reg.scope, script: c ? c.scriptURL : null, controlled: !!c, href: location.href };
}, ms);

/** The origin's caches, read directly — never through the worker, which would fetch and keep. `file`: one file's text in each. */
const cachesOf = (page, file) => page.evaluate(async (f) => {
  const out = {};
  for (const k of await caches.keys()) {
    const c = await caches.open(k);
    const urls = (await c.keys()).map((q) => q.url);
    const hit = f ? await c.match(new URL(f, location.href).href) : null;
    out[k] = { urls, file: hit ? await hit.text() : null };
  }
  return out;
}, file || null);

/** The version the page says: its meta, and the help pane's line. */
const versionSaid = (page) => page.evaluate(() => ({
  meta: (document.querySelector('meta[name="metamedium-version"]') || {}).content || '',
  line: ((document.getElementById('helpVersion') || {}).textContent || '').trim(),
}));

/** The help pane opened by its tile, the way a hand opens it; resolves to its text once it has loaded (or failed to). */
async function helpText(page) {
  await page.click('#ccBtn');
  await page.click('#helpBtn', { timeout: 5000 });
  await page.waitForSelector('#helpPanel:not([hidden])', { timeout: 5000 });
  await page.waitForFunction(() => { const b = document.querySelector('#helpPanel .helpBody'); return !!b && b.textContent && b.textContent !== 'loading…'; }, null, { timeout: 10000, polling: 50 }).catch(() => {});
  const text = await page.evaluate(() => (document.querySelector('#helpPanel .helpBody') || {}).textContent || '');
  await page.click('#helpPanel .paneClose').catch(() => {});
  return text;
}

/**
 * Every address into the site that the whitepaper, its 404 page and the README
 * give: each relative href and src, and each absolute address under the
 * published site wherever it stands (a link, a social card's image, the root)
 * — with a replay's recording beside the page that plays it.
 */
function publishedLinks() {
  const SITE_URL = 'https://jjh111.github.io/MetaMedium/';
  const out = new Set();
  const add = (path) => {
    out.add(path);
    const replay = /^Demos\/[^?]+\?(?:.*&)?replay=([^&]+)/.exec(path);
    if (replay) out.add('Demos/' + decodeURIComponent(replay[1]));
  };
  for (const f of ['index.html', '404.html', 'README.md']) {
    const text = readFileSync(join(root, f), 'utf8').replace(/&amp;/g, '&');
    for (const m of text.matchAll(/https:\/\/jjh111\.github\.io\/MetaMedium\/[^"'\s)<>]*/g)) add(m[0].slice(SITE_URL.length).split('#')[0]);
    for (const m of text.matchAll(/\s(?:href|src)="([^"]+)"/g)) {
      const u = m[1];
      if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|#|\/)/i.test(u)) continue;
      const path = u.split('#')[0];
      if (path) add(path);
    }
  }
  // And the address the whitepaper had before v5, kept as a redirect stub (CLAUDE.md: keep it).
  add('MetaMedium_Whitepaper_v4.html');
  return [...out];
}

// ===== A. The app on the gate's own static server ===============================

async function appTest(browser, servers, ctx) {
  const { freshContext, engineName, steps } = ctx;
  const check = (name, ok, detail) => steps.push({ name, ok: !!ok, detail });
  const origin = servers.staticOrigin;
  const appUrl = `${origin}/app/`;
  const guards = await freshContext(browser, { origins: [origin], label: 'app' });
  let page = await guards.context.newPage();
  let version = null;
  try { version = versionIn(root); } catch (err) { check('A0. VERSION at the repository root says the version', false, String(err.message || err)); }
  const cacheName = `mm-app-${version}`;
  try {
    // ---- A1. /app/ opens the board, and every file it asks for answers ------------------------
    const failed = watchFailures(page, origin);
    const res = await page.goto(appUrl, { waitUntil: 'load', timeout: 60000 });
    const status = res ? res.status() : 0;
    const ready = status === 200 && await waitReady(page, 60000).then(() => true, () => false);
    const asked = status === 200 ? await page.evaluate(() => [...document.querySelectorAll('link[href], script[src]')].map((el) => el.href || el.src)) : [];
    const answers = [];
    for (const u of asked.filter((x) => x.startsWith(origin))) answers.push({ path: u.slice(origin.length), status: (await page.request.get(u)).status() });
    const styled = ready && await page.evaluate(() => [...document.styleSheets].some((s) => /\/Demos\/surface\/surface\.css$/.test(s.href || '') && s.cssRules.length > 50));
    check(`A1. /app/ opens the board, and every file it asks for answers — ${answers.map((a) => a.path + ' ' + a.status).join(', ') || 'nothing asked'}${failed.length ? '; failed: ' + failed.join(', ') : ''}`,
      status === 200 && ready && styled && answers.length >= 4 && answers.every((a) => a.status === 200) && failed.length === 0,
      { status, ready, styled, answers, failed });

    // ---- A2. Installable there: the manifest starts and is scoped at /app/ ---------------------
    const manifestHref = ready ? await page.evaluate(() => { const l = document.querySelector('link[rel="manifest"]'); return l ? l.href : null; }) : null;
    const manifest = manifestHref ? await page.request.get(manifestHref).then((r) => (r.ok() ? r.json() : null)).catch(() => null) : null;
    const startUrl = manifest && manifest.start_url ? new URL(manifest.start_url, manifestHref).href : null;
    const scope = manifest ? new URL(manifest.scope || './', manifestHref).href : null;
    let installable = { asked: false };
    if (engineName === 'chromium' && ready) {
      const cdp = await guards.context.newCDPSession(page);
      const m = await cdp.send('Page.getAppManifest').catch((e) => ({ error: String(e.message || e) }));
      const inst = await cdp.send('Page.getInstallabilityErrors').catch((e) => ({ error: String(e.message || e) }));
      installable = { asked: true, manifestUrl: m.url, manifestErrors: m.errors, errors: inst.installabilityErrors, error: m.error || inst.error };
      await cdp.detach().catch(() => {});
    }
    const chromiumSays = !installable.asked || (installable.manifestUrl === manifestHref && (installable.manifestErrors || []).length === 0 && Array.isArray(installable.errors) && installable.errors.length === 0);
    check(`A2. installable at /app/ — the manifest it links, ${manifestHref ? manifestHref.slice(origin.length) : 'none'}, starts at ${startUrl ? startUrl.slice(origin.length) : '?'} and is scoped at ${scope ? scope.slice(origin.length) : '?'}${installable.asked ? ', and Chromium finds nothing in the way of installing it' : ''}`,
      manifestHref === `${origin}/app/manifest.webmanifest` && startUrl === appUrl && scope === appUrl && chromiumSays,
      { manifestHref, startUrl, scope, installable });

    // ---- A3. The worker's scope covers the page, and the page is controlled by it ---------------
    const sw = ready ? await workerOf(page) : { reg: false };
    const held = sw.controlled ? await cachesOf(page) : {};
    const shell = held[cacheName] ? APP_SHELL.filter((p) => !held[cacheName].urls.includes(`${origin}/${p}`)) : APP_SHELL;
    check(`A3. the worker's scope is /app/ and the page is controlled by it — ${sw.script ? sw.script.slice(origin.length) : 'no controller'} at ${sw.scope ? sw.scope.slice(origin.length) : '?'}, the shell kept in ${cacheName}${shell.length ? ' — missing ' + shell.join(', ') : ''}`,
      sw.scope === appUrl && typeof sw.href === 'string' && sw.href.startsWith(sw.scope) && sw.controlled && sw.script === `${origin}/app/sw.js` && shell.length === 0,
      { sw, caches: Object.keys(held), missing: shell });

    // ---- A4. A box drawn at /app/ is kept -------------------------------------------------------
    const pts = boxPath(cellBox(0, rng(7)));
    let boardId = null, kept = 0;
    if (ready) {
      await drawPath(page, pts);
      await page.evaluate(() => window.__mm.boardIdle());
      kept = await page.evaluate(async () => ((await window.__mm.boardLog()) || []).filter((e) => e.type === 'stroke').length);
      boardId = await page.evaluate(() => window.__mm.board().id);
    }
    check(`A4. a box drawn at /app/ is kept — ${kept} stroke(s) on board ${boardId}`, kept === 1 && !!boardId, { kept, boardId });

    // ---- A5. Reloaded, the worker serves the page, and the board comes back ---------------------
    const r5 = ready ? await page.reload({ waitUntil: 'load', timeout: 60000 }) : null;
    const back5 = r5 && await waitReady(page, 60000).then(() => strokesOnBoard(page), () => []);
    const at5 = r5 ? await page.evaluate(() => ({ path: location.pathname, search: location.search })) : null;
    check(`A5. reloaded, the worker serves /app/ and the board comes back — ${back5 ? back5.length : 0} stroke(s), the box among them, at ${at5 ? at5.path + at5.search : '?'}`,
      !!r5 && r5.status() === 200 && r5.fromServiceWorker() && !!back5 && back5.some((s) => sameSig(s, sig(pts))) && at5.path === '/app/',
      { status: r5 && r5.status(), fromServiceWorker: r5 && r5.fromServiceWorker(), strokes: back5, at: at5 });

    // ---- A6. The query is the page's own --------------------------------------------------------
    let q = { board: null, fresh: null, slashless: null };
    if (boardId) {
      await page.goto(`${appUrl}?fresh=1`, { waitUntil: 'load' });
      await waitReady(page);
      q.fresh = (await strokesOnBoard(page)).length;
      await page.goto(`${appUrl}?board=${encodeURIComponent(boardId)}`, { waitUntil: 'load' });
      await waitReady(page);
      q.board = { strokes: (await strokesOnBoard(page)).length, id: await page.evaluate(() => window.__mm.board().id) };
      await page.goto(`${origin}/app?board=${encodeURIComponent(boardId)}`, { waitUntil: 'load' });
      await waitReady(page);
      q.slashless = { url: page.url().slice(origin.length), strokes: (await strokesOnBoard(page)).length };
    }
    check(`A6. the query is the page's own at /app/ — ?fresh=1 starts empty (${q.fresh}), ?board= opens that board (${q.board ? q.board.strokes : '?'} stroke), /app?board= lands on ${q.slashless ? q.slashless.url : '?'}`,
      q.fresh === 0 && q.board && q.board.id === boardId && q.board.strokes === 1 && q.slashless && q.slashless.url.startsWith('/app/?board=') && q.slashless.strokes === 1,
      q);

    // ---- A7. The help pane says the version ------------------------------------------------------
    const said = ready ? await versionSaid(page) : {};
    check(`A7. the help pane says the version — “${said.line || ''}” (VERSION ${version})`,
      !!version && said.meta === version && typeof said.line === 'string' && said.line.includes(version), said);

    // ---- A8. A request that carries a key is never kept -----------------------------------------
    let keyed = null;
    if (sw.controlled) {
      keyed = await page.evaluate(async (name) => {
        const probe = (q) => new URL('../VERSION?probe=' + q + '-' + Date.now(), location.href).href;
        const withKey = probe('key'), stream = probe('stream'), plain = probe('plain');
        await fetch(withKey, { headers: { Authorization: 'Bearer e2e-probe-not-a-key' } });
        await fetch(stream, { headers: { Accept: 'text/event-stream' } });
        await fetch(plain);
        const c = await caches.open(name);
        // The worker keeps a response once it has answered with it: wait for the plain one, then look for the others.
        for (let i = 0; i < 60 && !(await c.match(plain)); i++) await new Promise((r) => setTimeout(r, 50));
        const all = await c.keys();
        return { key: !!(await c.match(withKey)), stream: !!(await c.match(stream)), plain: !!(await c.match(plain)), withAuthorization: all.filter((q) => q.headers.has('authorization')).length };
      }, cacheName);
    }
    check('A8. a request that carries a key is never kept by the worker, nor a stream — the same request without one is',
      !!keyed && !keyed.key && !keyed.stream && keyed.plain && keyed.withAuthorization === 0, keyed);

    // ---- A9. The old address opens exactly as before --------------------------------------------
    await page.close();
    page = await guards.context.newPage();
    const failedOld = watchFailures(page, origin);
    const r9 = await page.goto(`${origin}/Demos/session-engine.html`, { waitUntil: 'load', timeout: 60000 });
    const ready9 = r9 && r9.status() === 200 && await waitReady(page, 60000).then(() => true, () => false);
    const sw9 = ready9 ? await workerOf(page) : {};
    const back9 = ready9 ? await strokesOnBoard(page) : [];
    check(`A9. the old address opens as it did — Demos/session-engine.html, its own worker ${sw9.script ? sw9.script.slice(origin.length) : '?'} at ${sw9.scope ? sw9.scope.slice(origin.length) : '?'}, the same board (${back9.length} stroke)${failedOld.length ? '; failed: ' + failedOld.join(', ') : ''}`,
      ready9 && sw9.scope === `${origin}/Demos/` && sw9.script === `${origin}/Demos/sw.js` && sw9.controlled && back9.some((s) => sameSig(s, sig(pts))) && failedOld.length === 0,
      { status: r9 && r9.status(), sw: sw9, strokes: back9.length, failed: failedOld });

    // ---- A10. …and its worker keeps to its own caches -------------------------------------------
    const keys10 = ready9 ? Object.keys(await cachesOf(page)) : [];
    await page.close();
    page = await guards.context.newPage();
    await page.goto(appUrl, { waitUntil: 'load', timeout: 60000 });
    const sw10 = await waitReady(page, 60000).then(() => workerOf(page), () => ({}));
    check(`A10. the old address's worker keeps to its own caches — ${keys10.join(', ') || 'none'} — and /app/ is still its own worker's`,
      keys10.includes(cacheName) && keys10.some((k) => k.startsWith('mm-shell-')) && sw10.controlled && sw10.script === `${origin}/app/sw.js`,
      { caches: keys10, app: sw10 });

    // ---- A11. Every address the whitepaper links into the site still answers --------------------
    const links = publishedLinks();
    const broken = [];
    for (const p of links) { const st = (await page.request.get(`${origin}/${p}`)).status(); if (st !== 200) broken.push(`${st} ${p}`); }
    check(`A11. every address the whitepaper, its 404 page and the README link into the site still answers — ${links.length - broken.length} of ${links.length}${broken.length ? '; broken: ' + broken.join(', ') : ''}`,
      links.length > 0 && broken.length === 0, { links, broken });
  } catch (err) {
    check('A. the app scenario ran to its end', false, String(err && err.stack ? err.stack : err));
    if (ctx.screenshot) await ctx.screenshot(page, 'app');
  }
  return guards;
}

// ===== B. After one visit, the board opens with the server gone ===================

async function offlineTest(browser, ctx) {
  const { freshContext, steps } = ctx;
  const check = (name, ok, detail) => steps.push({ name, ok: !!ok, detail });
  const own = await startStatic(root);
  const guards = await freshContext(browser, { origins: [own.origin], label: 'app-offline' });
  const page = await guards.context.newPage();
  try {
    const version = versionIn(root);
    await page.goto(`${own.origin}/app/`, { waitUntil: 'load', timeout: 60000 });
    await waitReady(page, 60000);
    const sw = await workerOf(page);
    const pts = boxPath(cellBox(1, rng(11)));
    await drawPath(page, pts);
    await page.evaluate(() => window.__mm.boardIdle());
    const id = await page.evaluate(() => window.__mm.board().id);
    await own.stop(); // the network is gone: every request is refused
    const r1 = await page.reload({ waitUntil: 'load', timeout: 60000 }).catch((e) => ({ error: String(e.message || e) }));
    const ok1 = r1 && !r1.error && r1.status() === 200 && r1.fromServiceWorker();
    const back = ok1 ? await waitReady(page, 60000).then(() => strokesOnBoard(page), () => []) : [];
    const said = ok1 ? await versionSaid(page) : {};
    // An address the worker never saw online: the page is kept once, whatever its query.
    const r2 = ok1 ? await page.goto(`${own.origin}/app/?board=${encodeURIComponent(id)}&from=nowhere`, { waitUntil: 'load', timeout: 60000 }).catch((e) => ({ error: String(e.message || e) })) : null;
    const ok2 = r2 && !r2.error && r2.status() === 200 && r2.fromServiceWorker();
    const back2 = ok2 ? await waitReady(page, 60000).then(() => strokesOnBoard(page), () => []) : [];
    check(`B1. after one visit, with the server gone, /app/ opens from its worker's cache — the box is on the board (${back.length} stroke), the version says ${said.meta || '?'}, and an address it never saw opens too (${back2.length} stroke)`,
      sw.controlled && ok1 && back.some((s) => sameSig(s, sig(pts))) && said.meta === version && ok2 && back2.some((s) => sameSig(s, sig(pts))),
      { sw, reload: r1 && r1.error ? r1.error : { status: r1 && r1.status(), fromServiceWorker: r1 && r1.fromServiceWorker() }, strokes: back.length, said, never: r2 && r2.error ? r2.error : { status: r2 && r2.status(), strokes: back2.length } });
  } catch (err) {
    check('B. the offline scenario ran to its end', false, String(err && err.stack ? err.stack : err));
  } finally {
    await own.stop().catch(() => {});
  }
  return guards;
}

// ===== C. A release renames the cache ==============================================

/**
 * A copy of the site at one version, visited once; then the next release made
 * over the copy the way the release script makes it — VERSION bumped and
 * scripts/build-app.mjs run, the help's text changed — and one online visit;
 * then the server gone. `stamp: false` is the control: the release made, but
 * the worker put back as it was, so its cache keeps its name.
 */
async function releaseTest(browser, ctx, { stamp }) {
  const { freshContext, steps } = ctx;
  const check = (name, ok, detail) => steps.push({ name, ok: !!ok, detail });
  const dir = mkdtempSync(join(tmpdir(), 'mm-app-release-'));
  let srv = null, guards = null;
  try {
    for (const p of SITE) { mkdirSync(dirname(join(dir, p)), { recursive: true }); cpSync(join(root, p), join(dir, p), { recursive: true }); }
    const { make } = await import(pathToFileURL(join(root, 'scripts', 'build-app.mjs')).href);
    const was = versionIn(dir);
    const next = was.replace(/^(\d+)\.(\d+)\.(\d+).*$/, (m, a, b, c) => `${a}.${b}.${Number(c) + 1}`);
    const marker = `The help of release ${next}.`;
    srv = await startStatic(dir);
    guards = await freshContext(browser, { origins: [srv.origin], label: stamp ? 'app-release' : 'app-release-control' });
    const page = await guards.context.newPage();
    await page.goto(`${srv.origin}/app/`, { waitUntil: 'load', timeout: 60000 });
    await waitReady(page, 60000);
    const sw = await workerOf(page);
    const before = Object.keys(await cachesOf(page));

    // The next release, over the copy.
    const workers = ['Demos/sw.js', 'app/sw.js'].map((p) => [p, readFileSync(join(dir, p), 'utf8')]);
    writeFileSync(join(dir, 'VERSION'), next + '\n');
    for (const f of make(dir)) if (f.changed) writeFileSync(join(dir, f.path), f.text);
    writeFileSync(join(dir, 'QA-v8.md'), readFileSync(join(dir, 'QA-v8.md'), 'utf8') + '\n' + marker + '\n');
    if (!stamp) for (const [p, text] of workers) writeFileSync(join(dir, p), text);

    // Its first network fetch: one reload, online.
    const t = Date.now();
    await page.reload({ waitUntil: 'load', timeout: 60000 });
    await waitReady(page, 60000);
    let keys = [];
    for (;;) {
      keys = Object.keys(await cachesOf(page));
      if (keys.includes(`mm-app-${next}`) && !keys.includes(`mm-app-${was}`)) break;
      if (Date.now() - t > (stamp ? 15000 : 4000)) break;
      await sleep(100);
    }
    const settledMs = Date.now() - t;

    // Then the server is gone.
    await srv.stop();
    const r = await page.reload({ waitUntil: 'load', timeout: 60000 });
    await waitReady(page, 60000);
    const said = await versionSaid(page);
    const help = await helpText(page);
    const after = Object.keys(await cachesOf(page));
    const detail = { was, next, sw, before, afterOnline: keys, settledMs, offline: { status: r && r.status(), fromServiceWorker: r && r.fromServiceWorker(), said, newHelp: help.includes(marker), caches: after } };
    if (stamp) {
      check(`C1. a release renames the cache — after ${next}'s first network fetch (${settledMs} ms), with the server gone: the page is ${said.meta}, the help is ${next}'s, and ${was}'s cache is gone (${after.join(', ')})`,
        sw.controlled && before.includes(`mm-app-${was}`) && r && r.fromServiceWorker() && said.meta === next && said.line.includes(next) && help.includes(marker) && after.includes(`mm-app-${next}`) && !after.includes(`mm-app-${was}`),
        detail);
    } else {
      check(`C2. control — had the release kept the cache's name, the new page (${said.meta}) would come back offline beside the old help, still in ${after.join(', ')}: the stale shell the renaming prevents`,
        sw.controlled && r && r.fromServiceWorker() && said.meta === next && !help.includes(marker) && after.includes(`mm-app-${was}`) && !after.includes(`mm-app-${next}`),
        detail);
    }
  } catch (err) {
    check(`${stamp ? 'C1' : 'C2'}. the release scenario ran to its end`, false, String(err && err.stack ? err.stack : err));
  } finally {
    if (srv) await srv.stop().catch(() => {});
    rmSync(dir, { recursive: true, force: true });
  }
  return guards;
}

export async function runApp(browser, servers, ctx) {
  const steps = [];
  const measured = {};
  const guards = [];
  const timed = async (label, fn) => { const t = Date.now(); const g = await fn(); if (g) guards.push(g); measured[label] = +((Date.now() - t) / 1000).toFixed(1); };
  const c = { ...ctx, steps };
  await timed('app s', () => appTest(browser, servers, c));
  await timed('offline s', () => offlineTest(browser, c));
  await timed('release s', () => releaseTest(browser, c, { stamp: true }));
  await timed('control s', () => releaseTest(browser, c, { stamp: false }));
  return { steps, guards, measured };
}
