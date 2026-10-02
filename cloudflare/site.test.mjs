// What is published to Cloudflare Pages, and what the headers it is published with allow.
//
//   node --test cloudflare/site.test.mjs
//
// Pure Node: the file list (git's), the generated `_headers` and `_redirects`, and the app's
// Content-Security-Policy held to what the app's source actually loads — a host the source
// names and the policy lacks is an app that breaks on dyna.ink and not on localhost; a host the
// policy names and nothing loads is a door left open. The proof that the policy lets the
// app run (a program's `new Function`, the worker, the frames) is a browser's, and was done
// with `wrangler pages dev` over this very build (cloudflare/README.md says how).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync, mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { siteFiles, headersText, LEFT_OUT } from './build-site.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const read = (f) => readFileSync(path.join(root, f), 'utf8');
const csp = read('cloudflare/pages/csp.txt').trim();

/** The `_headers` file as rules: a path and its header lines. */
function rulesOf(text) {
  const rules = [];
  for (const raw of text.split('\n')) {
    if (!raw.trim() || raw.trim().startsWith('#')) continue;
    if (/^\S/.test(raw)) rules.push({ path: raw.trim(), headers: {} });
    else { const i = raw.indexOf(':'); rules[rules.length - 1].headers[raw.slice(0, i).trim().toLowerCase()] = raw.slice(i + 1).trim(); }
  }
  return rules;
}
const policy = (directive) => (csp.split(';').map((d) => d.trim()).find((d) => d.startsWith(directive + ' ')) || '').split(/\s+/).slice(1);

test('the site is what GitHub Pages publishes, less what is not a page', () => {
  const files = siteFiles(root);
  for (const f of ['index.html', '404.html', 'app/index.html', 'app/sw.js', 'app/manifest.webmanifest', 'Demos/session-engine.html', 'Demos/session-engine.js',
    'Demos/metamedium-core.browser.js', 'Demos/sw.js', 'Demos/surface/surface.css', 'boards/examples/index.json', 'HELP.md', 'VERSION', 'MetaMedium_Whitepaper_v4.html',
    'archive/MetaMedium_Whitepaper_v4.html', 'doodle2-canvas.html', 'metadoodle1.html', 'Assets/thumb-metamedium-v5.png']) {
    assert.ok(files.includes(f), f + ' is not published');
  }
  for (const f of files) {
    assert.ok(!LEFT_OUT.some((d) => f === d || f.startsWith(d + '/')), f + ' should be left out');
    assert.ok(!f.split('/').includes('node_modules'), f);
    assert.ok(!/^\.env(\.|$)/.test(path.basename(f)), f + ' looks like a key\'s file');
  }
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
    assert.deepEqual(siteFiles(repo), ['Web App Skeleton/a.ts', 'app/index.html', 'index.html']);
  } finally { rmSync(repo, { recursive: true, force: true }); }
});

test('the _headers file: the app\'s policy on every address the app has, nosniff on all, the worker never kept', () => {
  const text = headersText();
  const rules = rulesOf(text);
  assert.ok(rules.length <= 100, 'Pages allows 100 rules');
  for (const line of text.split('\n')) assert.ok(line.length <= 2000, 'Pages allows 2,000 characters a line: ' + line.slice(0, 60));
  const by = Object.fromEntries(rules.map((r) => [r.path, r.headers]));
  assert.equal(by['/*']['x-content-type-options'], 'nosniff');
  assert.match(by['/*']['referrer-policy'], /strict-origin/);
  for (const p of ['/app', '/app/*', '/Demos/session-engine', '/Demos/session-engine.html']) {
    assert.equal(by[p]['content-security-policy'], csp, p);
    assert.equal(by[p]['referrer-policy'], 'no-referrer', p + ' — a room\'s key is in its address');
  }
  assert.equal(by['/app/sw.js']['cache-control'], 'no-cache');
  assert.equal(by['/Demos/sw.js']['cache-control'], 'no-cache');
  assert.ok(!text.includes('{{'), 'an unfilled placeholder');
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
    ...readdirSync(path.join(root, 'metamedium-core/src/llm')).filter((f) => f.endsWith('.ts') && !/\.test\./.test(f)).map((f) => 'metamedium-core/src/llm/' + f),
    'metamedium-core/src/store/git.ts'];
  // Hosts named in the source that are no fetch: an xmlns, a link in a sentence — and the two addresses a carry
  // (RENAME-PLAN N1, 17-carry.js) opens a window at and sends a message to, which no connect-src governs.
  const NOT_FETCHED = new Set(['www.w3.org', 'jjh111.github.io', 'dyna.ink', 'host']);
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

test('the deploy workflow skips cleanly without its secrets, and names no key', () => {
  const wf = read('.github/workflows/deploy-cloudflare.yml');
  assert.match(wf, /CLOUDFLARE_API_TOKEN/);
  assert.match(wf, /CLOUDFLARE_ACCOUNT_ID/);
  const deploys = wf.split('\n').filter((l) => /uses: cloudflare\/wrangler-action/.test(l)).length;
  assert.equal(deploys, 2);
  // Set up from a browser alone (John, 2 Oct 2026: the token and the secrets, then a push): the Pages project
  // is made when the account has none of that name, and the relay's secret is put from a GitHub secret when one is set.
  assert.match(wf, /pages project list[\s\S]*grep -qw dyna-ink[\s\S]*pages project create dyna-ink --production-branch=master/, 'the site job makes its Pages project when it is missing');
  assert.match(wf, /MM_RELAY_SECRET: \$\{\{ secrets\.MM_RELAY_SECRET \}\}/, 'the relay secret comes from a GitHub secret, through the env');
  assert.match(wf, /printf '%s' "\$MM_RELAY_SECRET" \| npx wrangler secret put MM_RELAY_SECRET/, 'put on the Worker from stdin, never on a command line');
  assert.match(wf, /if \[ -z "\$MM_RELAY_SECRET" \]; then[^\n]*exit 0; fi/, 'no secret set: the Worker keeps the one it has');
  assert.ok(!/echo "\$MM_RELAY_SECRET"/.test(wf), 'the secret is never echoed into a log');
  assert.equal(wf.split('\n').filter((l) => /^\s+if: steps\.have\.outputs\.yes == 'true'/.test(l)).length >= 8, true, 'every step after the check waits on it');
  // A secret is never read in an `if:` (GitHub cannot), only through the env of the job.
  assert.ok(!/if:.*secrets\./.test(wf));
  assert.ok(!/[A-Za-z0-9_-]{40,}/.test(wf.replace(/https?:\/\/\S+/g, '').replace(/cloudflare\/wrangler-action/g, '')), 'something key-shaped in the workflow');
});
