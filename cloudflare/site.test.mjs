// What is published to Cloudflare Pages, and what the headers it is published with allow.
//
//   node --test cloudflare/site.test.mjs
//
// Pure Node: the file list (git's, less what the product's site never serves), the generated
// `_headers` read as Pages applies it, `_redirects`, `robots.txt`, the deployed commit named in
// the app's pages, and the app's Content-Security-Policy held to what the app's source actually
// loads — a host the source names and the policy lacks is an app that breaks on dyna.ink and not
// on localhost; a host the policy names and nothing loads is a door left open. The proof that the
// policy lets the app run (a program's `new Function`, the worker, the frames, offline) is a
// browser's: the gate's `prod` scenario serves this very build with these headers (e2e/prod.mjs).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, mkdtempSync, mkdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { siteFiles, headersText, LEFT_OUT, whyLeftOut, headerRules, headersFor, ruleMatches, stampCommit, STAMPED, buildSite, metaPolicy, withPolicy } from './build-site.mjs';
import { publishedLinks, fileCandidates } from '../e2e/links.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const read = (f) => readFileSync(path.join(root, f), 'utf8');
const csp = read('cloudflare/pages/csp.txt').trim();

const policy = (directive) => (csp.split(';').map((d) => d.trim()).find((d) => d.startsWith(directive + ' ')) || '').split(/\s+/).slice(1);

test('the site is the product\'s pages: the whitepaper, the app, its demos and boards — never the tests, the plans, the source or a page that cannot run', () => {
  const files = siteFiles(root);
  for (const f of ['index.html', '404.html', 'app/index.html', 'app/sw.js', 'app/manifest.webmanifest', 'Demos/session-engine.html', 'Demos/session-engine.js',
    'Demos/dynaink-core.browser.js', 'Demos/sw.js', 'Demos/surface/surface.css', 'boards/examples/index.json', 'HELP.md', 'VERSION', 'MetaMedium_Whitepaper_v4.html',
    'archive/MetaMedium_Whitepaper_v4.html', 'doodle2-canvas.html', 'metadoodle1.html', 'Assets/thumb-metamedium-v5.png', 'Assets/thumb-dynaink.png',
    'LICENSE', 'NOTICE', 'stories/reader.js', 'v2-poc/index.html', 'launch-video/dynaink-soft-launch.mp4']) {
    assert.ok(files.includes(f), f + ' is not published');
  }
  // What a browser on dyna.ink never asks for, each with its reason: a dead page (dynaink-3d loads ./src/main.ts
  // through a dev server), a harness, a test, a plan, the engine's source, the repository's configuration.
  for (const [f, why] of [['dynaink-3d/index.html', /dev server/], ['Web App Skeleton/index.html', /dev server/], ['lens-canvas/index.html', /dev server/],
    ['test-vision.html', /harness/], ['test-llm.html', /harness/], ['CLAUDE.md', /plan/], ['RENAME-PLAN.md', /plan/], ['core/src/session/session.ts', /source/],
    ['Demos/session-engine.e2e.js', /test/], ['Demos/surface/09-field.test.mjs', /test/], ['Demos/mcp-smoke.mjs', /test/], ['Demos/relay-assets.conformance.mjs', /test/],
    ['.mcp.json', /configuration/], ['.nojekyll', /configuration/], ['skills/dynaink-code/.DS_Store', /configuration/], ['e2e/run.mjs', /gate/], ['.env.example', /key/]]) {
    assert.match(whyLeftOut(f) || '', why, f + ' should be left out');
    assert.ok(!files.includes(f), f + ' is published');
  }
  for (const f of files) {
    assert.equal(whyLeftOut(f), null, f);
    assert.ok(!LEFT_OUT.some((d) => f === d || f.startsWith(d + '/')), f + ' should be left out');
    assert.ok(!f.split('/').includes('node_modules'), f);
    assert.ok(!/^\.env(\.|$)/.test(path.basename(f)), f + ' looks like a key\'s file');
  }
});

test('every address the whitepaper, its 404 page and the README link into the site is a file the site publishes', () => {
  const files = new Set(siteFiles(root));
  const links = publishedLinks(root);
  assert.ok(links.length > 20, 'the oracle found the links');
  assert.deepEqual(links.filter((a) => !fileCandidates(a).some((f) => files.has(f))), [], 'a linked address the site would not answer');
});

test('every file the whitepaper loads by a relative address is published — its figures, the drawings it credits, its scripts', () => {
  const files = new Set(siteFiles(root));
  const html = read('index.html').replace(/<!--[\s\S]*?-->/g, '');
  const loaded = [...new Set([...html.matchAll(/\bsrc="([^"]+)"/g)].map((m) => m[1]).filter((s) => !/^(?:[a-z]+:|\/\/|#)/i.test(s))
    .map((s) => decodeURIComponent(s.replace(/^\.\//, '').split(/[?#]/)[0])))];
  assert.ok(loaded.includes('Assets/fig-dynabook.jpg'), 'the whitepaper shows Kay\'s Dynabook drawings (NOTICE credits them)');
  assert.deepEqual(loaded.filter((f) => !files.has(f)), [], 'a file the whitepaper loads that the site would not publish');
});

test('only what git tracks is published: an untracked key, a committed node_modules and the working parts stay out', () => {
  const repo = mkdtempSync(path.join(tmpdir(), 'dyna-site-'));
  try {
    const put = (f, c = 'x') => { mkdirSync(path.dirname(path.join(repo, f)), { recursive: true }); writeFileSync(path.join(repo, f), c); };
    for (const f of ['index.html', 'app/index.html', 'Web App Skeleton/a.ts', 'node_modules/x/index.js', 'e2e/run.mjs', '.env', 'cloudflare/relay/src/worker.mjs']) put(f);
    for (const f of ['index.html', 'app/index.html', 'Web App Skeleton/a.ts', 'node_modules/x/index.js', 'e2e/run.mjs', 'cloudflare/relay/src/worker.mjs']) put(f);
    put('.env.local', 'OPENROUTER_KEY=sk-not-real');
    put('untracked-notes.md');
    execFileSync('git', ['init', '-q'], { cwd: repo });
    execFileSync('git', ['add', '-f', 'index.html', 'app', 'Web App Skeleton', 'node_modules', 'e2e', 'cloudflare', '.env.local'], { cwd: repo });
    assert.deepEqual(siteFiles(repo), ['app/index.html', 'index.html']);
  } finally { rmSync(repo, { recursive: true, force: true }); }
});

test('_headers is read as Pages reads it: every matching rule in order, a header set twice joined, "! Name" taking it away first', () => {
  const rules = headerRules('/*\n  A: one\n  B: x\n/app/*\n  A: two\n  ! B\n  B: y\n/:dir/page\n  C: z\n/*\n  X: 1\n  X: 2\n');
  assert.deepEqual(rules.map((r) => r.path), ['/*', '/app/*', '/:dir/page', '/*']);
  assert.deepEqual(rules[1].unset, ['b']);
  assert.equal(rules[3].set.x, '1, 2', 'the same name twice in a rule is joined');
  const h = (p) => Object.fromEntries(headersFor(rules, p, { 'Content-Type': 'text/html' }));
  assert.deepEqual(h('/index.html'), { 'content-type': 'text/html', a: 'one', b: 'x', x: '1, 2' });
  assert.deepEqual(h('/app/'), { 'content-type': 'text/html', a: 'one, two', b: 'y', x: '1, 2' }, 'joined without "!", replaced with it');
  assert.equal(h('/Demos/page').c, 'z', 'a placeholder is one segment');
  assert.equal(h('/a/b/page').c, undefined);
  assert.ok(ruleMatches('/app/*', '/app/') && ruleMatches('/app/*', '/app/sw.js') && !ruleMatches('/app/*', '/app') && ruleMatches('/app', '/app'));
  assert.throws(() => headerRules('  A: before any path'), /before any path/);
  assert.throws(() => headerRules('/*\n  !B'), /neither a header/, 'Pages takes "! Name" with its space');
});

test('the _headers file: the app\'s policy once on every address the app has, a floor on every other page, HSTS and nosniff on all, the worker never kept', () => {
  const text = headersText();
  const rules = headerRules(text);
  assert.ok(rules.length <= 100, 'Pages allows 100 rules');
  assert.equal(new Set(rules.map((r) => r.path)).size, rules.length, 'a path is one rule (Pages keys them by path)');
  for (const line of text.split('\n')) assert.ok(line.length <= 2000, 'Pages allows 2,000 characters a line: ' + line.slice(0, 60));
  assert.ok(!text.includes('{{'), 'an unfilled placeholder');
  const at = (p) => headersFor(rules, p);
  // Every page: nosniff, a referrer rule, six months of HTTPS for this host alone, no FLoC's retired word, and the floor.
  const SITE_CSP = "object-src 'none'; base-uri 'self'; frame-ancestors 'self'";
  for (const p of ['/', '/404', '/doodle2-canvas', '/stories/reader.js', '/app/', '/Demos/session-engine', '/robots.txt']) {
    const h = at(p);
    assert.equal(h.get('x-content-type-options'), 'nosniff', p);
    assert.equal(h.get('strict-transport-security'), 'max-age=15552000', p + ' — six months, no includeSubDomains (the relay is a subdomain), no preload');
    assert.ok(h.get('permissions-policy') && !/interest-cohort/.test(h.get('permissions-policy')), p + ' — interest-cohort is retired');
  }
  for (const p of ['/', '/404', '/doodle2-canvas', '/metadoodle1', '/launch-video/', '/Demos/sw.js']) {
    assert.equal(at(p).get('content-security-policy'), SITE_CSP, p);
    assert.match(at(p).get('referrer-policy'), /^strict-origin-when-cross-origin$/, p);
  }
  // The app: csp.txt alone — the floor taken away, not joined as a second policy — and no-referrer once.
  for (const p of ['/app', '/app/', '/app/sw.js', '/Demos/session-engine', '/Demos/session-engine.html']) {
    assert.equal(at(p).get('content-security-policy'), csp, p);
    assert.equal(at(p).get('referrer-policy'), 'no-referrer', p + ' — a room\'s key is in its address; sent once');
  }
  // …which loses nothing the floor said: the app's policy says each of the floor's directives the same way.
  for (const d of SITE_CSP.split(';').map((x) => x.trim())) assert.ok(csp.split(';').map((x) => x.trim()).includes(d), 'the app\'s policy lacks the floor\'s ' + d);
  assert.equal(at('/app/sw.js').get('cache-control'), 'no-cache');
  assert.equal(at('/Demos/sw.js').get('cache-control'), 'no-cache');
  // COOP and COEP are not sent, on purpose (the template says why): require-corp would refuse the CDN scripts.
  assert.ok(!/cross-origin-(opener|embedder)-policy/i.test(text.replace(/^#.*$/gm, '')), 'COOP/COEP in the headers themselves');
});

test('the policy lets the app run: scripts and styles inline, a program\'s eval, blob workers and pictures, data fonts — and shuts the rest', () => {
  assert.deepEqual(policy('default-src'), ["'self'"]);
  for (const s of ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'blob:']) assert.ok(policy('script-src').includes(s), 'script-src ' + s);
  assert.ok(policy('worker-src').includes('blob:'));
  assert.ok(policy('img-src').includes('blob:') && policy('img-src').includes('data:'));
  assert.ok(policy('font-src').includes('data:'), 'surface.css carries its face as data:');
  assert.ok(policy('style-src').includes("'unsafe-inline'"));
  assert.deepEqual(policy('object-src'), ["'none'"]);
  assert.deepEqual(policy('base-uri'), ["'self'"]);
  assert.deepEqual(policy('frame-ancestors'), ["'self'"]);
  // Every source in the policy is one a browser reads: an invalid one is dropped, with a console line on every page load.
  for (const d of csp.split(';')) for (const s of d.trim().split(/\s+/).slice(1)) assert.ok(!/\[/.test(s), 'an IPv6 literal is not a valid CSP source: ' + s);
});

test('the policy and the source agree on which hosts the app talks to', () => {
  const sources = [...readdirSync(path.join(root, 'Demos/surface')).filter((f) => f.endsWith('.js')).map((f) => 'Demos/surface/' + f),
    ...readdirSync(path.join(root, 'core/src/llm')).filter((f) => f.endsWith('.ts') && !/\.test\./.test(f)).map((f) => 'core/src/llm/' + f),
    'core/src/store/git.ts'];
  // Hosts named in the source that are no fetch: an xmlns, a link in a sentence — the two addresses a carry
  // (RENAME-PLAN N1, 17-carry.js) opens a window at and sends a message to, which no connect-src governs — and the
  // repository the help pane links as the source (17-boards.js's SOURCE_URL, AGPL-3.0 §13), a page a person opens.
  const NOT_FETCHED = new Set(['www.w3.org', 'jjh111.github.io', 'dyna.ink', 'host', 'github.com']);
  const named = new Set();
  for (const f of sources) for (const m of read(f).matchAll(/https:\/\/([a-zA-Z0-9.-]+)/g)) if (!NOT_FETCHED.has(m[1])) named.add(m[1]);
  const allowed = new Set([...csp.matchAll(/https:\/\/([a-zA-Z0-9.-]+)/g)].map((m) => m[1]));
  for (const h of named) assert.ok(allowed.has(h), `the source names ${h} and the policy does not allow it`);
  // The relay is the one host the policy names that the source does not: its address comes from the page's own URL.
  for (const h of allowed) assert.ok(named.has(h) || h === 'relay.dyna.ink', `the policy allows ${h} and nothing in the source loads from it`);
  // …and a model on this machine, whatever its port.
  assert.ok(policy('connect-src').includes('http://localhost:*') && policy('connect-src').includes('http://127.0.0.1:*'));
  assert.ok(named.has('cdnjs.cloudflare.com') && named.has('cdn.jsdelivr.net'), 'the CDNs the frames load from are in the source');
  for (const h of ['cdnjs.cloudflare.com', 'cdn.jsdelivr.net']) assert.ok(policy('script-src').includes('https://' + h), 'script-src ' + h);
});

test('/app keeps its query on the way to /app/ — what GitHub Pages did', () => {
  const lines = read('cloudflare/pages/_redirects').split('\n').filter((l) => l.trim() && !l.startsWith('#'));
  assert.deepEqual(lines, ['/app /app/ 301']);
});

test('robots.txt lets the pages be read and keeps every app address with a query — a board, a room and its key, a replay — out', () => {
  const rows = read('cloudflare/pages/robots.txt').split('\n').filter((l) => l.trim() && !l.startsWith('#'));
  assert.deepEqual(rows, ['User-agent: *', 'Allow: /', 'Disallow: /app/?', 'Disallow: /Demos/session-engine?', 'Disallow: /Demos/session-engine.html?']);
});

test('the deployed commit is named in the app\'s pages of the built site, and nowhere in the repository', () => {
  const sha = 'a'.repeat(40);
  for (const f of STAMPED) {
    const page = read(f);
    assert.ok(!/dynaink-commit/.test(page), f + ' names a commit in the repository');
    const stamped = stampCommit(page, sha);
    assert.equal((stamped.match(/<meta name="dynaink-commit" content="a{40}">/g) || []).length, 1, f);
    assert.match(stamped, /<meta name="dynaink-version"[^>]*>\n\s*<meta name="dynaink-commit"/, f + ': beside the version');
    assert.equal(stampCommit(stamped, 'b'.repeat(40)).match(/dynaink-commit/g).length, 1, 'stamped again, replaced');
  }
  for (const bad of ['', 'HEAD', 'abc', 'A'.repeat(40), '"><script>', 'a'.repeat(41)]) assert.throws(() => stampCommit(read(STAMPED[0]), bad), /not a commit/, JSON.stringify(bad));
  assert.throws(() => stampCommit('<html></html>', sha), /dynaink-version/);
  // A build: the two pages carry it, nothing else does, the repository is untouched, and the Pages files are there.
  const out = mkdtempSync(path.join(tmpdir(), 'dyna-built-'));
  try {
    const before = STAMPED.map((f) => read(f));
    assert.throws(() => buildSite({ out, commit: 'not-a-sha' }), /not a commit/);
    const written = buildSite({ out, commit: sha });
    for (const f of ['_headers', '_redirects', 'robots.txt']) assert.ok(written.includes(f) && readFileSync(path.join(out, f), 'utf8').length > 0, f);
    assert.equal(readFileSync(path.join(out, '_headers'), 'utf8'), headersText());
    for (const f of STAMPED) assert.match(readFileSync(path.join(out, f), 'utf8'), /<meta name="dynaink-commit" content="a{40}">/, f);
    assert.ok(!/dynaink-commit/.test(readFileSync(path.join(out, 'index.html'), 'utf8')), 'the whitepaper names no commit');
    assert.deepEqual(STAMPED.map((f) => read(f)), before, 'the build wrote into the repository');
    assert.ok(!existsSync(path.join(out, 'dynaink-3d')) && !existsSync(path.join(out, 'CLAUDE.md')) && !existsSync(path.join(out, 'core')), 'what is left out is not in the build');
  } finally { rmSync(out, { recursive: true, force: true }); }
});

test('the app\'s pages carry its policy in themselves in the built site — so it holds at an address no _headers rule names', () => {
  // What a <meta> cannot say stays the header's; everything else is csp.txt, word for word.
  const meta = metaPolicy(csp);
  assert.ok(!/frame-ancestors/.test(meta), 'frame-ancestors is ignored in a <meta> (and the browser says so)');
  assert.equal(meta, csp.split(';').map((d) => d.trim()).filter((d) => !d.startsWith('frame-ancestors')).join('; '));
  for (const d of ['default-src', 'script-src', 'connect-src', 'worker-src', 'frame-src', 'object-src', 'base-uri']) assert.match(meta, new RegExp('(^|; )' + d + ' '), d);
  for (const f of STAMPED) {
    const page = read(f);
    assert.ok(!/http-equiv="Content-Security-Policy"/i.test(page), f + ' carries a policy in the repository — GitHub Pages and the gate serve it as it is');
    const carried = withPolicy(page, csp);
    const tags = carried.match(/<meta http-equiv="Content-Security-Policy" content="([^"]*)">/g) || [];
    assert.equal(tags.length, 1, f);
    assert.equal(/content="([^"]*)"/.exec(tags[0])[1], meta, f + ': the policy as csp.txt says it');
    // Right after the charset: before the stylesheet, the manifest and every script, or it would not cover them.
    const at = carried.indexOf(tags[0]);
    assert.ok(at > carried.indexOf('<meta charset'), f);
    assert.ok(!/<(?:script|link|style|base)\b/i.test(carried.slice(0, at).replace(/<!--[\s\S]*?-->/g, '')), f + ': something loads before the policy');
    assert.equal(withPolicy(carried, csp), carried, 'carried again, replaced, not doubled');
  }
  assert.throws(() => withPolicy('<html><head></head></html>', csp), /charset/);
  assert.throws(() => withPolicy('<head><script src="x.js"></script>\n<meta charset="UTF-8">\n', csp), /before its charset/);
  // Why: _headers matches the path as asked, still encoded; the file is found decoded, its slashes merged. These are the app
  // under the floor alone, which says nothing of scripts or connections — the page's own policy is what holds there.
  const rules = headerRules(headersText());
  const floor = headersFor(rules, '/').get('content-security-policy');
  for (const p of ['/ap%70/', '//app/', '/Demos//session-engine', '/Demos/session-engin%65']) {
    assert.equal(headersFor(rules, p).get('content-security-policy'), floor, p + ' — if a rule names it now, this test can say so');
  }
  const out = mkdtempSync(path.join(tmpdir(), 'dyna-policy-'));
  try {
    buildSite({ out });
    for (const f of STAMPED) {
      const built = readFileSync(path.join(out, f), 'utf8');
      assert.equal((/<meta http-equiv="Content-Security-Policy" content="([^"]*)">/.exec(built) || [])[1], meta, f + ' in the built site');
      assert.ok(!/dynaink-commit/.test(built), 'no commit asked for, none named');
    }
    assert.ok(!/http-equiv="Content-Security-Policy"/i.test(readFileSync(path.join(out, 'index.html'), 'utf8')), 'the whitepaper keeps the floor alone: Google Fonts, GoatCounter');
  } finally { rmSync(out, { recursive: true, force: true }); }
});

test('the relay\'s config binds the class the Worker exports, SQLite-backed, and asks for no route that needs a zone it may not have', () => {
  const toml = read('cloudflare/relay/wrangler.toml');
  assert.match(toml, /main = "src\/worker\.mjs"/);
  assert.match(toml, /name = "ROOMS"\s*\nclass_name = "Room"/);
  assert.match(toml, /new_sqlite_classes = \["Room"\]/);
  assert.ok(!/^routes\s*=/m.test(toml), 'a route is a decision John takes (README)');
  const src = read('cloudflare/relay/src/worker.mjs');
  assert.deepEqual([...src.matchAll(/^export (?:default|class|const|function|async function) ?(\w+)?/gm)].map((m) => m[1] || 'default').sort(), ['Room', 'default'],
    'workerd refuses an entry module that exports anything but handlers and classes');
});

test('the deploy workflow deploys only what CI passed on master, the commit CI ran, with the lockfile\'s wrangler — and skips cleanly without its secrets, naming no key', () => {
  const wf = read('.github/workflows/deploy-cloudflare.yml');
  // After CI, never on a push alone: a change that breaks the gate is not deployed.
  assert.match(wf, /^on:\n  workflow_run:\n    workflows: \[CI\]\n    types: \[completed\]\n    branches: \[master\]\n  workflow_dispatch:\n/m, 'triggered by CI\'s completion on master, or by hand');
  assert.ok(!/^\s+push:/m.test(wf), 'a push alone deploys');
  const name = /^name: (.+)$/m.exec(read('.github/workflows/ci.yml'));
  assert.equal(name && name[1], 'CI', 'workflow_run names the CI workflow by its name');
  const jobs = wf.split(/\n  (?=\w+:\n    name:)/).slice(1);
  assert.equal(jobs.length, 2, 'the site and the relay');
  for (const job of jobs) {
    const guard = /\n    if: >-\n([\s\S]*?)\n    runs-on:/.exec(job);
    assert.ok(guard, 'each job is guarded');
    const g = guard[1].replace(/\s+/g, ' ');
    assert.match(g, /github\.event\.workflow_run\.conclusion == 'success'/, 'only a CI that passed');
    assert.match(g, /github\.event\.workflow_run\.event == 'push'/, 'never a CI run for a pull request');
    assert.match(g, /github\.event\.workflow_run\.head_repository\.full_name == github\.repository/, 'never a fork\'s branch that happens to be called master');
    assert.match(g, /github\.event_name == 'workflow_dispatch' && github\.ref == 'refs\/heads\/master'/, 'by hand, from master only');
    assert.match(job, /runs-on: ubuntu-24\.04\n    timeout-minutes: 15\n/, 'a pinned runner and a timeout');
    assert.match(job, /DEPLOY_SHA: \$\{\{ github\.event\.workflow_run\.head_sha \|\| github\.sha \}\}/, 'the commit CI ran');
    assert.match(job, /- uses: actions\/checkout@v4\n {8}if: steps\.have\.outputs\.yes == 'true'\n {8}with:\n {10}ref: \$\{\{ env\.DEPLOY_SHA \}\}/, 'checked out at that commit');
    // Its steps: the first decides, and every one after it waits on that decision — each step, not a count of lines.
    const steps = job.split('\n    steps:\n')[1].split(/\n(?= {6}- )/);
    assert.match(steps[0], /^ {6}- name: [^\n]*\n {8}id: have\n/, 'the first step is the check');
    assert.ok(steps.length >= 5, 'the job has its steps');
    for (const step of steps.slice(1)) assert.match(step, /\n {8}if: steps\.have\.outputs\.yes == 'true'\n/, 'a step that does not wait on the check: ' + step.split('\n')[0].trim());
    // …which deploys a commit CI ran only while it is master's tip: CI runs finish in any order and an old one can be
    // re-run, so without this an older commit's CI finishing last would put production back on it.
    const have = steps[0];
    assert.match(have, /GH_TOKEN: \$\{\{ github\.token \}\}/, 'the check reads master with the run\'s own token');
    assert.match(have, /tip=\$\(gh api "repos\/\$GITHUB_REPOSITORY\/commits\/master" --jq \.sha\) \|\| \{[^}]*exit 1; \}/, 'master\'s tip is read, and a failure to read it deploys nothing, out loud');
    assert.ok(have.indexOf('gh api') < have.indexOf('if [ "$EVENT" = "workflow_run" ]'), 'the tip is read for every deploy — after CI and by hand alike');
    assert.match(have, /if \[ "\$EVENT" = "workflow_run" \]; then\n\s+if \[ "\$tip" != "\$DEPLOY_SHA" \]; then echo "yes=false" >> "\$GITHUB_OUTPUT"; echo "[^"]+"; exit 0; fi/, 'a commit master has moved past since CI is not deployed, and the run says so');
    // A deploy by hand is held to the tip too: GitHub re-runs a run with the commit it was first dispatched at, so a
    // failed manual deploy re-run days later would put dyna.ink back on it.
    assert.match(have, /elif \[ "\$tip" != "\$DEPLOY_SHA" \]; then\n\s+echo "yes=false" >> "\$GITHUB_OUTPUT"; echo "[^"]*Run the workflow again[^"]*"; exit 1\n\s+fi/, 'a run by hand dispatched at a commit master has moved past deploys nothing, and fails saying so');
    assert.ok(have.indexOf('CLOUDFLARE_API_TOKEN') < have.indexOf('gh api'), 'with no secrets, nothing is asked of GitHub');
  }
  assert.match(wf, /node cloudflare\/build-site\.mjs --commit "\$DEPLOY_SHA"/, 'the built app names the commit it was built from');
  // One wrangler, the relay's lockfile's: no action that installs a version of its own.
  assert.ok(!/wrangler-action/.test(wf), 'wrangler-action installs a wrangler of its own');
  assert.match(wf, /"\$W" pages deploy cloudflare\/dist --project-name=dyna-ink --branch=master --commit-hash="\$DEPLOY_SHA" --commit-dirty=true/);
  assert.match(wf, /working-directory: cloudflare\/relay\n {8}run: npx wrangler deploy\n/, 'the Worker is deployed by the lockfile\'s wrangler, from its folder');
  assert.match(wf, /CLOUDFLARE_API_TOKEN/);
  assert.match(wf, /CLOUDFLARE_ACCOUNT_ID/);
  // Set up from a browser alone (John, 2 Oct 2026: the token and the secrets, then a push): the Pages project
  // is made when the account has none of that name, and the relay's secret is put from a GitHub secret when one is set.
  assert.match(wf, /pages project list[\s\S]*grep -qw dyna-ink[\s\S]*pages project create dyna-ink --production-branch=master/, 'the site job makes its Pages project when it is missing');
  assert.match(wf, /MM_RELAY_SECRET: \$\{\{ secrets\.MM_RELAY_SECRET \}\}/, 'the relay secret comes from a GitHub secret, through the env');
  assert.match(wf, /printf '%s' "\$MM_RELAY_SECRET" \| npx wrangler secret put MM_RELAY_SECRET/, 'put on the Worker from stdin, never on a command line');
  assert.match(wf, /if \[ -z "\$MM_RELAY_SECRET" \]; then[^\n]*exit 0; fi/, 'no secret set: the Worker keeps the one it has');
  assert.ok(!/echo "\$MM_RELAY_SECRET"/.test(wf), 'the secret is never echoed into a log');
  // A secret is never read in an `if:` (GitHub cannot), only through the env of the job.
  assert.ok(!/if:.*secrets\./.test(wf));
  assert.ok(!/[A-Za-z0-9_-]{40,}/.test(wf.replace(/https?:\/\/\S+/g, '')), 'something key-shaped in the workflow');
});

test('CI pins its runner and bounds every job, and runs every Node test the surface and the MCP door have', () => {
  const ci = read('.github/workflows/ci.yml');
  const jobs = Object.fromEntries(ci.split(/\n  (?=[\w-]+:\n    name:)/).slice(1).map((j) => [j.split(':')[0], j]));
  // The limits the jobs have now; a job added later is held to a pinned image and a limit of its own.
  const LIMITS = { core: 20, shard: 20, browser: 45, webkit: 25, 'web-app': 20 };
  for (const job of Object.keys(LIMITS)) assert.ok(jobs[job], 'CI has no job ' + job);
  for (const [job, text] of Object.entries(jobs)) {
    assert.match(text, /\n    runs-on: ubuntu-24\.04\n/, job + ' runs on a pinned image');
    const limit = /\n    timeout-minutes: (\d+)\n/.exec(text);
    assert.ok(limit, job + ' has no timeout: a run hung for six hours once (7 Oct 2026)');
    if (LIMITS[job]) assert.equal(Number(limit[1]), LIMITS[job], job + ' is bounded at ' + LIMITS[job] + ' minutes');
  }
  assert.ok(!/ubuntu-latest/.test(ci), 'a runner that moves under the jobs');
  // Every pure fragment's Node test, and the door's smoke, run in the core job.
  for (const f of readdirSync(path.join(root, 'Demos/surface')).filter((x) => x.endsWith('.test.mjs'))) {
    assert.ok(ci.includes(`../Demos/surface/${f}`), `Demos/surface/${f} is not run in CI`);
  }
  assert.ok(ci.includes('node ../Demos/mcp-client.smoke.mjs'), 'the MCP door\'s smoke is not run in CI');
});
