// The app as production serves it, as a scenario of the gate.
//
//     node e2e/run.mjs prod
//
// The gate's own static server sends no Content-Security-Policy, and the site test only checks
// that the hosts the source names are the hosts the policy allows. So a break at the level of a
// directive — 'unsafe-eval' taken out (a program runs with `new Function`), the blob: worker, the
// frames, the floor on the whitepaper — would pass every other scenario and break only on dyna.ink.
// This one builds the site Cloudflare Pages publishes (cloudflare/build-site.mjs) into a folder of
// its own, serves it as Pages does — `_headers` applied by the same reader the site test uses, the
// .html taken off with a 308, `_redirects`, the 404 page (pages.mjs) — and runs the app under it,
// listening for a policy violation in every frame of every page:
//
//   P1  the build is served as Pages serves it: the app's policy once on the app's addresses, the
//       floor on the rest, the redirects, what is left out a 404, the commit named in the app;
//   P2  every address the whitepaper, its 404 page and the README link answers on it;
//   P3  /app/?fresh=1 opens under the policy, and its worker controls it;
//   P4  an example opens as a board of its own;
//   P5  a program that calls `new Function` plays in its frame (which inherits the policy), and a
//       behaviour steps in its worker, made from a blob: (P5b);
//   P6  the whitepaper loads under the floor, its embeds of the app opened;
//   P7  the old address opens, through Pages' 308, under the app's policy, and its worker controls it;
//   P8  with the server gone, /app/ opens from its worker's cache, and so does the old address;
//   P9  nothing anywhere broke the policy — the scenario's verdict;
//   P10 the listener hears a violation made on purpose (so P9's silence means something);
//   P11 the same build served with 'unsafe-eval' taken out of the app's policy is caught: the
//       program's frame says so — what P9 would say if csp.txt lost it.
//
// Requests to any other host are refused in the browser (the CDNs, the fonts): a policy is
// checked before a request leaves the page, so a host the policy refuses is still heard, and the
// run does not depend on what this machine can reach. A model is never asked (the gate's guard).

import { mkdtempSync, rmSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSite, headersText, headerRules, headersFor } from '../cloudflare/build-site.mjs';
import { startPages } from './pages.mjs';
import { publishedLinks } from './links.mjs';
import { isModelRequest } from './guards.mjs';
import { waitReady } from './keep.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const APP_CSP = readFileSync(join(root, 'cloudflare', 'pages', 'csp.txt'), 'utf8').trim();
/** The floor every other page gets, read from _headers as Pages reads it. */
const SITE_CSP = headersFor(headerRules(headersText()), '/').get('content-security-policy') || null;
/** The example P4 opens, and how many marks its board holds at least. */
const EXAMPLE = { id: 'molecule', marks: 5 };

/** A program that evaluates code the way a program's own harness runs it: `new Function` — then says so as a part. */
const PROGRAM = [
  "var add = new Function('a', 'b', 'return a + b');",
  "mm.report('evaluated-' + add(2, 3), 0, 0, 24, 24);",
  'mm.onFrame(function (t) { var c = mm.ctx; c.clearRect(0, 0, mm.width, mm.height); c.fillRect(4, 4, 8 + (t * 10) % 40, 8); });',
].join('\n');

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * Every policy violation in every frame of every page in `context`: the `securitypolicyviolation`
 * event, heard by a listener put in each frame before its scripts run, and the browser's own line
 * in the console — which a frame with no scripts of its own (a page's plate) still produces.
 */
async function hearViolations(context, origin) {
  const heard = [];
  await context.exposeBinding('__mmPolicyViolation', ({ frame }, v) => { heard.push({ via: 'event', frame: frame ? frame.url() : '', ...v }); });
  await context.addInitScript(() => {
    addEventListener('securitypolicyviolation', (e) => {
      try {
        window.__mmPolicyViolation({ directive: e.effectiveDirective || e.violatedDirective || '', blocked: String(e.blockedURI || ''), source: String(e.sourceFile || ''),
          line: e.lineNumber || 0, sample: String(e.sample || '').slice(0, 80), disposition: e.disposition || '' });
      } catch (err) { /* nothing to tell it with */ }
    }, true);
  });
  context.on('page', (page) => page.on('console', (m) => {
    if (/violates the following Content Security Policy/i.test(m.text())) heard.push({ via: 'console', frame: page.url(), text: m.text().slice(0, 300) });
  }));
  // Another host is never reached — but a model is still the guard's to count and refuse.
  await context.route('**/*', (route) => {
    const url = route.request().url();
    if (url.startsWith(origin + '/') || isModelRequest(url, [origin])) return route.fallback();
    return route.abort('blockedbyclient');
  });
  return heard;
}

/** The worker the page has: its scope, the controller's script, whether the page is controlled. */
const workerOf = (page, ms = 20000) => page.evaluate(async (wait) => {
  if (!('serviceWorker' in navigator)) return { supported: false };
  const late = (v) => new Promise((r) => setTimeout(() => r(v), wait));
  const reg = await Promise.race([navigator.serviceWorker.ready, late(null)]);
  if (!reg) return { supported: true, reg: false };
  if (!navigator.serviceWorker.controller) {
    await Promise.race([new Promise((ok) => navigator.serviceWorker.addEventListener('controllerchange', ok, { once: true })), late(null)]);
  }
  const c = navigator.serviceWorker.controller;
  return { supported: true, reg: true, scope: reg.scope, script: c ? c.scriptURL : null, controlled: !!c };
}, ms);

/** Import a program and play it, as a hand does; resolves to what its frame said: the parts it reported, its clock, broken or not. */
async function playProgram(page, name, code, waitMs = 15000) {
  const id = await page.evaluate(([n, c]) => {
    const mm = window.__mm;
    const at = mm.importText(n, c, { x: 560, y: 260 }, 240);
    if (at) mm.session.clock({ nodeId: at, op: 'play', at: Date.now() });
    return at;
  }, [name, code]);
  if (!id) return { id: null };
  const read = () => page.evaluate((i) => {
    const mm = window.__mm;
    const clock = mm.session.getState().clocks[i] || null;
    const f = mm.frames.get(i);
    return { parts: mm.reportedRegions(i).map((p) => p.id), playing: !!(clock && clock.playing), reason: clock ? clock.reason || null : null, broken: !!(f && f.wrap.classList.contains('broken')) };
  }, id);
  let r = await read();
  for (const until = Date.now() + waitMs; Date.now() < until && !r.parts.length && !r.broken && r.playing;) { await sleep(250); r = await read(); }
  return { id, ...r };
}

/** The site's statuses and headers by plain HTTP, redirects not followed. */
async function head(origin, path) {
  const r = await fetch(origin + path, { redirect: 'manual' });
  const body = r.status === 200 && /text\/html/.test(r.headers.get('content-type') || '') ? await r.text() : '';
  return { status: r.status, location: r.headers.get('location'), csp: r.headers.get('content-security-policy'), referrer: r.headers.get('referrer-policy'), hsts: r.headers.get('strict-transport-security'), body };
}

// ===== P. The app under production's headers ======================================

async function prodTest(browser, ctx, site, commit) {
  const { freshContext, steps } = ctx;
  const check = (name, ok, detail) => steps.push({ name, ok: !!ok, detail });
  const origin = site.origin;

  // ---- P1. Served as Pages serves it -------------------------------------------------------------
  const h = {};
  for (const p of ['/app/', '/app?x=1', '/', '/Demos/session-engine.html?fresh=1', '/Demos/session-engine', '/CLAUDE.md', '/dynaink-3d/', '/test-llm.html', '/robots.txt']) h[p] = await head(origin, p);
  const once = (v) => typeof v === 'string' && !v.includes(', ');
  const named = (b) => (/<meta name="dynaink-commit" content="([0-9a-f]+)">/.exec(b) || [])[1] || null;
  const p1 = {
    app: h['/app/'].status === 200 && h['/app/'].csp === APP_CSP && h['/app/'].referrer === 'no-referrer' && once(h['/app/'].referrer) && h['/app/'].hsts === 'max-age=15552000',
    slashless: h['/app?x=1'].status === 301 && h['/app?x=1'].location === '/app/?x=1',
    floor: h['/'].status === 200 && !!SITE_CSP && h['/'].csp === SITE_CSP && h['/'].hsts === 'max-age=15552000',
    old: h['/Demos/session-engine.html?fresh=1'].status === 308 && h['/Demos/session-engine.html?fresh=1'].location === '/Demos/session-engine?fresh=1' && h['/Demos/session-engine'].csp === APP_CSP,
    leftOut: ['/CLAUDE.md', '/dynaink-3d/', '/test-llm.html'].every((p) => h[p].status === 404),
    robots: h['/robots.txt'].status === 200,
    commit: named(h['/app/'].body) === commit && named(h['/Demos/session-engine'].body) === commit && named(h['/'].body) === null,
  };
  check(`P1. the built site is served as Pages serves it — the app's policy alone and no-referrer once at /app/, the floor and HTTPS for six months on the whitepaper, /app?x=1 to /app/?x=1, the old address by a 308 to /Demos/session-engine, what is left out a 404, the commit ${commit.slice(0, 7)} named in the app's pages`,
    Object.values(p1).every(Boolean), { ...p1, headers: Object.fromEntries(Object.entries(h).map(([k, v]) => [k, { ...v, body: v.body ? v.body.length + ' chars' : '' }])) });

  // ---- P2. Every linked address answers ----------------------------------------------------------
  const links = publishedLinks(root);
  const broken = [];
  for (const p of links) { const r = await fetch(`${origin}/${p}`); if (r.status !== 200) broken.push(`${r.status} ${p}`); await r.arrayBuffer().catch(() => {}); }
  check(`P2. every address the whitepaper, its 404 page and the README link answers on the product's site — ${links.length - broken.length} of ${links.length}${broken.length ? '; broken: ' + broken.join(', ') : ''}`,
    links.length > 20 && broken.length === 0, { broken });

  const guards = await freshContext(browser, { origins: [origin], label: 'prod' });
  const heard = await hearViolations(guards.context, origin);
  const page = await guards.context.newPage();
  try {
    // ---- P3. /app/ under the policy, its worker in control ----------------------------------------
    const r3 = await page.goto(`${origin}/app/?fresh=1`, { waitUntil: 'load', timeout: 60000 });
    const csp3 = r3 ? r3.headers()['content-security-policy'] : null;
    const ready3 = await waitReady(page, 60000).then(() => true, () => false);
    const sw3 = ready3 ? await workerOf(page) : {};
    check(`P3. /app/?fresh=1 opens under the app's policy and its worker controls it — ${sw3.script ? sw3.script.slice(origin.length) : 'no controller'} at ${sw3.scope ? sw3.scope.slice(origin.length) : '?'}`,
      r3 && r3.status() === 200 && csp3 === APP_CSP && ready3 && sw3.controlled && sw3.scope === `${origin}/app/` && sw3.script === `${origin}/app/sw.js`, { status: r3 && r3.status(), csp: csp3 === APP_CSP, ready: ready3, sw: sw3 });

    // ---- P4. An example, as a board of its own ----------------------------------------------------
    await page.goto(`${origin}/app/?example=${EXAMPLE.id}`, { waitUntil: 'load', timeout: 60000 });
    let ex = { ready: await waitReady(page, 60000, { pin: false }).then(() => true, () => false) };
    if (ex.ready) {
      await page.waitForFunction((n) => window.__mm.session.getState().contentIds.length >= n && !/[?&]example=/.test(location.search), EXAMPLE.marks, { timeout: 20000, polling: 100 }).catch(() => {});
      ex = { ...ex, ...(await page.evaluate(() => ({ marks: window.__mm.session.getState().contentIds.length, packs: window.__mm.session.getState().packs.slice(), board: window.__mm.board().id, search: location.search }))) };
    }
    check(`P4. the ${EXAMPLE.id} example opens as a board of its own — ${ex.marks || 0} marks, packs ${(ex.packs || []).join(', ') || 'none'}`,
      ex.ready && ex.marks >= EXAMPLE.marks && !/example=/.test(ex.search || ''), ex);

    // ---- P5. A program that calls new Function plays in its frame ----------------------------------
    await page.evaluate(() => window.__mm.setView(1, 0, 0));
    const run = await playProgram(page, 'prod.run.js', PROGRAM);
    check(`P5. a program that calls new Function plays in its frame, which inherits the policy — it reported ${run.parts && run.parts.length ? run.parts.join(', ') : 'nothing'}, ${run.playing ? 'still playing' : 'stopped: ' + (run.reason || '?')}${run.broken ? ', broken' : ''}`,
      !!run.id && (run.parts || []).includes('evaluated-5') && run.playing && !run.broken, run);

    // ---- P5b. A behaviour steps in its worker, which is made from a blob: ---------------------------
    const js = await page.evaluate(async () => {
      const mm = window.__mm;
      const id = mm.importText('prod-mover.js', 'function steer(world) {\n  return { fx: 60, fy: 0 };\n}\nreturn steer(world);', { x: 860, y: 260 }, 200);
      if (!id) return { id: null };
      mm.session.clock({ nodeId: id, op: 'play', at: Date.now() });
      for (let i = 0; i < 20; i++) await mm.runtime().stepOnce(id);
      const rt = mm.runtime(), body = rt.bodies.get(id), clock = mm.session.getState().clocks[id] || {};
      return { id, loaded: rt.loaded.has(id), x: body ? body.x : null, broken: rt.broken.get(id) || null, playing: !!clock.playing, reason: clock.reason || null };
    });
    check(`P5b. a behaviour steps in its worker, made from a blob: — ${js.loaded ? 'loaded' : 'not loaded'}, moved to x ${js.x === null || js.x === undefined ? '?' : js.x.toFixed(1)}${js.broken ? ', broken: ' + js.broken : ''}`,
      !!js.id && js.loaded && js.x > 1 && !js.broken && js.playing, js);

    // ---- P6. The whitepaper under the floor, its embeds of the app opened ---------------------------
    const r6 = await page.goto(`${origin}/`, { waitUntil: 'load', timeout: 60000 });
    const csp6 = r6 ? r6.headers()['content-security-policy'] : null;
    // Its embeds are lazy: each is brought into view, and waited on until the app inside has booted.
    const embeds = await page.evaluate(() => [...document.querySelectorAll('iframe')].map((f) => f.getAttribute('src')));
    for (let i = 0; i < embeds.length; i++) {
      await page.evaluate((k) => document.querySelectorAll('iframe')[k].scrollIntoView({ block: 'center' }), i);
      await sleep(300);
    }
    const booted = [];
    for (const until = Date.now() + 30000; Date.now() < until;) {
      booted.length = 0;
      for (const f of page.frames()) {
        if (f === page.mainFrame() || !f.url().startsWith(origin)) continue;
        const up = await f.evaluate(() => !!(window.__mm && window.__mm.session && window.__mm.session.getState().contentIds.length)).catch(() => false);
        if (up) booted.push(f.url().slice(origin.length));
      }
      if (booted.length >= embeds.length) break;
      await sleep(250);
    }
    // The storyboard's embed plays the launch film as a program, in a frame of its own: its <video> asks for the film
    // (media-src) and its part is reported only once the program has run — so this is a program and a film under the policy.
    const films = [];
    for (const until = Date.now() + 15000; Date.now() < until && !films.length;) {
      for (const f of page.frames()) {
        if (f === page.mainFrame() || !f.url().startsWith(origin)) continue;
        const got = await f.evaluate(() => {
          const mm = window.__mm; if (!mm || !mm.session) return [];
          const st = mm.session.getState();
          return st.live.filter((id) => (st.clocks[id] || {}).playing && mm.reportedRegions(id).some((p) => p.id === 'film')).map((id) => id);
        }).catch(() => []);
        if (got.length) films.push(f.url().slice(origin.length));
      }
      if (!films.length) await sleep(250);
    }
    check(`P6. the whitepaper loads under the floor policy, its ${embeds.length} embeds of the app opened through Pages' 308 — ${booted.length} booted, and the storyboard's film program running in ${films.length ? films[0] : 'none of them'}`,
      r6 && r6.status() === 200 && csp6 === SITE_CSP && embeds.length >= 3 && booted.length >= embeds.length && films.length > 0, { csp: csp6, embeds, booted, films });

    // ---- P7. The old address, online once ----------------------------------------------------------
    const r7 = await page.goto(`${origin}/Demos/session-engine.html?fresh=1`, { waitUntil: 'load', timeout: 60000 });
    const ready7 = await waitReady(page, 60000).then(() => true, () => false);
    const sw7 = ready7 ? await workerOf(page) : {};
    const at7 = page.url().slice(origin.length);
    check(`P7. the old address opens through Pages' 308 at ${at7}, under the app's policy, and its worker controls it — ${sw7.script ? sw7.script.slice(origin.length) : 'no controller'} at ${sw7.scope ? sw7.scope.slice(origin.length) : '?'}`,
      r7 && r7.status() === 200 && r7.headers()['content-security-policy'] === APP_CSP && at7 === '/Demos/session-engine?fresh=1' && ready7 && sw7.controlled && sw7.scope === `${origin}/Demos/`,
      { status: r7 && r7.status(), at: at7, ready: ready7, sw: sw7 });

    // ---- P8. The server gone: both addresses open from their workers' caches ----------------------
    await site.stop();
    const offline = {};
    for (const [label, path] of [['app', '/app/'], ['old', '/Demos/session-engine'], ['old .html', '/Demos/session-engine.html']]) {
      const r = await page.goto(origin + path, { waitUntil: 'load', timeout: 30000 }).catch((e) => ({ error: String(e.message || e).split('\n')[0] }));
      const ok = r && !r.error && r.status() === 200 && r.fromServiceWorker();
      const ready = ok ? await waitReady(page, 30000).then(() => true, () => false) : false;
      offline[label] = { path, ok, ready, csp: ok ? r.headers()['content-security-policy'] === APP_CSP : false, error: r && r.error, status: r && !r.error ? r.status() : null };
    }
    check(`P8. with the server gone, /app/ opens from its worker's cache (${offline.app.ready ? 'opened' : 'did not open'}), and so does the old address — at /Demos/session-engine (${offline.old.ready ? 'opened' : 'did not open'}) and at /Demos/session-engine.html (${offline['old .html'].ready ? 'opened' : 'did not open'}), each under the app's policy`,
      Object.values(offline).every((o) => o.ok && o.ready && o.csp), offline);

    // ---- P9. Nothing broke the policy ---------------------------------------------------------------
    // Back on the app, from its cache, for P10's page.
    await page.goto(`${origin}/app/`, { waitUntil: 'load', timeout: 30000 }).then(() => waitReady(page, 30000)).catch(() => {});
    const violations = heard.slice();
    check(`P9. no page and no frame broke a policy — ${violations.length ? violations.length + ' violation(s): ' + violations.slice(0, 4).map((v) => v.via === 'event' ? `${v.directive} ${v.blocked} in ${v.frame}` : v.text).join(' · ') : 'none heard'}`,
      violations.length === 0, { violations });

    // ---- P10. …and the silence means something: a violation made on purpose is heard -----------------
    const before = heard.length;
    await page.evaluate(() => { const i = new Image(); i.src = 'https://policy-control.invalid/x.png'; document.body.appendChild(i); });
    for (const until = Date.now() + 5000; Date.now() < until && !heard.slice(before).some((v) => v.via === 'event'); ) await sleep(100);
    const made = heard.slice(before);
    check(`P10. a violation made on purpose in the page is heard — ${made.map((v) => v.via + (v.directive ? ' ' + v.directive : '')).join(', ') || 'nothing'}`,
      made.some((v) => v.via === 'event' && /^img-src/.test(v.directive) && /policy-control\.invalid/.test(v.blocked)), { made });
  } catch (err) {
    check('P. the production scenario ran to its end', false, String(err && err.stack ? err.stack : err));
    if (ctx.screenshot) await ctx.screenshot(page, 'prod');
  }
  return guards;
}

// ===== C. A broken policy is caught, in the program's frame ===================================

async function brokenPolicyTest(browser, ctx, out) {
  const { freshContext, steps } = ctx;
  const check = (name, ok, detail) => steps.push({ name, ok: !!ok, detail });
  const without = APP_CSP.replace(" 'unsafe-eval'", '');
  const site = await startPages(out, { transformHeaders: (t) => t.replaceAll(APP_CSP, without) });
  const guards = await freshContext(browser, { origins: [site.origin], label: 'prod-control' });
  const heard = await hearViolations(guards.context, site.origin);
  const page = await guards.context.newPage();
  try {
    const r = await page.goto(`${site.origin}/app/?fresh=1&nosw=1`, { waitUntil: 'load', timeout: 60000 });
    const served = r ? r.headers()['content-security-policy'] : null;
    await waitReady(page, 60000);
    const run = await playProgram(page, 'prod.run.js', PROGRAM);
    for (const until = Date.now() + 5000; Date.now() < until && !heard.length; ) await sleep(100);
    const inFrame = heard.filter((v) => (v.via === 'event' && /^script-src/.test(v.directive) && v.blocked === 'eval' && /^about:srcdoc/.test(v.frame)) || (v.via === 'console' && /unsafe-eval/.test(v.text)));
    check(`P11. control — the same build served with 'unsafe-eval' taken out of the app's policy is caught in the program's frame (${inFrame.length} violation(s) heard there), and the program says it cannot run (${run.reason || (run.broken ? 'broken' : 'no reason')})`,
      served === without && inFrame.some((v) => v.via === 'event') && (run.broken || !run.playing) && !(run.parts || []).length, { served: served === without, run, heard });
  } catch (err) {
    check('P11. the broken policy control ran to its end', false, String(err && err.stack ? err.stack : err));
  } finally {
    await site.stop().catch(() => {});
  }
  return guards;
}

export async function runProd(browser, servers, ctx) {
  const steps = [];
  const measured = {};
  const guards = [];
  const c = { ...ctx, steps };
  const out = mkdtempSync(join(tmpdir(), 'dyna-prod-'));
  let site = null;
  try {
    let commit = null;
    try { commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root }).toString().trim(); } catch { commit = '0'.repeat(40); }
    let t = Date.now();
    const files = buildSite({ out, commit });
    measured['build s'] = +((Date.now() - t) / 1000).toFixed(1);
    measured.files = files.length;
    site = await startPages(out);
    t = Date.now();
    guards.push(await prodTest(browser, c, site, commit));
    measured['prod s'] = +((Date.now() - t) / 1000).toFixed(1);
    t = Date.now();
    guards.push(await brokenPolicyTest(browser, c, out));
    measured['control s'] = +((Date.now() - t) / 1000).toFixed(1);
  } catch (err) {
    steps.push({ name: 'P. the site was built and served', ok: false, detail: String(err && err.stack ? err.stack : err) });
  } finally {
    if (site) await site.stop().catch(() => {});
    rmSync(out, { recursive: true, force: true });
  }
  return { steps, guards: guards.filter(Boolean), measured };
}
