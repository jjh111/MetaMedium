// The app's build, asked what it makes (V1-PLAN.md §9 R7).
//
//   node --test scripts/build-app.test.mjs
//
// /app/ is made, never edited: its page from Demos/session-engine.html, its
// worker a copy of Demos/sw.js, its manifest from the old address's with a
// start and a scope of its own — and the version, the repository's VERSION,
// stamped into the page and into both workers' caches. The pure parts are
// asked directly; the build itself runs on scratch copies, so nothing here
// writes the real files.

import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, cpSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

import { appPage, stampPage, stampWorker, appManifest, make, readVersion, VERSION_PATTERN } from './build-app.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const read = (p) => readFileSync(join(root, p), 'utf8');

const scratch = [];
after(() => { for (const d of scratch) rmSync(d, { recursive: true, force: true }); });

/** Every src and href of a page, in order. */
const refs = (html) => [...html.matchAll(/\s(?:src|href)="([^"]*)"/g)].map((m) => m[1]);
const OLD = 'https://example.org/MetaMedium/Demos/session-engine.html';
const APP = 'https://example.org/MetaMedium/app/';

test('the app page asks, from /app/, for every file the old address asks for — its manifest excepted, which is its own', () => {
  const src = read('Demos/session-engine.html');
  const page = appPage(src);
  const was = refs(src).map((r) => new URL(r, OLD).href);
  const is = refs(page).map((r) => new URL(r, APP).href);
  assert.equal(is.length, was.length);
  assert.ok(was.length >= 4, 'the page asks for fewer files than it did');
  for (let i = 0; i < was.length; i++) {
    if (was[i].endsWith('/manifest.webmanifest')) assert.equal(is[i], APP + 'manifest.webmanifest');
    else assert.equal(is[i], was[i], `${refs(src)[i]} resolves elsewhere from /app/`);
  }
  // …and apart from that, and the line saying it was made, the page is the old one word for word.
  const back = page.replace(/^<!DOCTYPE html>\n<!--[\s\S]*?-->\n/, '<!DOCTYPE html>\n').replace(/((?:src|href)=")\.\.\/Demos\//g, '$1');
  assert.equal(back, src);
  assert.match(page, /^<!DOCTYPE html>\n<!-- [^\n]*scripts\/build-app\.mjs[^\n]*-->\n/);
});

test('a file the page comes to ask for is asked for from /app/ too; what is not a file of the site is left alone', () => {
  const src = '<!DOCTYPE html>\n<html><head><link rel="icon" href="icon.svg"><link rel="manifest" href="manifest.webmanifest"></head>' +
    '<body><img src="data:image/png;base64,AA"><a href="#x">x</a><a href="https://example.org/">y</a><a href="../index.html">z</a>' +
    '<script src="new.js"></script></body></html>';
  const page = appPage(src);
  assert.match(page, /href="\.\.\/Demos\/icon\.svg"/);
  assert.match(page, /src="\.\.\/Demos\/new\.js"/);
  assert.match(page, /href="manifest\.webmanifest"/);
  assert.match(page, /src="data:image\/png;base64,AA"/);
  assert.match(page, /href="#x"/);
  assert.match(page, /href="https:\/\/example\.org\/"/);
  assert.match(page, /href="\.\.\/index\.html"/);
});

test('the version is stamped into the page and into the worker — and a page or a worker with no line for it is refused', () => {
  assert.equal(stampPage('<head>\n<meta name="metamedium-version" content="0.0.0">\n</head>', '1.2.3'), '<head>\n<meta name="metamedium-version" content="1.2.3">\n</head>');
  assert.equal(stampWorker("// a worker\nconst VERSION = '0.0.0';\nconst X = 1;\n", '1.2.3-rc.1'), "// a worker\nconst VERSION = '1.2.3-rc.1';\nconst X = 1;\n");
  assert.throws(() => stampPage('<head></head>', '1.2.3'), /metamedium-version/);
  assert.throws(() => stampWorker('const X = 1;\n', '1.2.3'), /VERSION/);
  assert.throws(() => stampWorker("const VERSION = '0.0.0';\n", 'banana'), /version/);
});

test("the app's manifest starts and is scoped at the app; the rest is the old address's", () => {
  const old = JSON.parse(read('Demos/manifest.webmanifest'));
  const app = JSON.parse(appManifest(read('Demos/manifest.webmanifest')));
  assert.equal(app.start_url, './');
  assert.equal(app.scope, './');
  for (const k of Object.keys(old)) if (k !== 'start_url' && k !== 'scope' && k !== 'icons') assert.deepEqual(app[k], old[k], k);
  // The icons are the same files, asked for from /app/ instead of Demos/ (PLAN-IPAD-NOTES I3).
  assert.equal(app.icons.length, old.icons.length);
  app.icons.forEach((ic, i) => {
    assert.equal(new URL(ic.src, APP + 'manifest.webmanifest').href, new URL(old.icons[i].src, APP + '../Demos/manifest.webmanifest').href, ic.src);
    assert.deepEqual({ ...ic, src: 0 }, { ...old.icons[i], src: 0 });
  });
  assert.equal(new URL(app.start_url, APP + 'manifest.webmanifest').href, APP);
});

test('what is committed is the build of what is committed — the worker at /app/ the one at the old address', () => {
  assert.match(readVersion(root), VERSION_PATTERN);
  const drift = make(root).filter((f) => f.changed).map((f) => f.path);
  assert.deepEqual(drift, [], 'run: node scripts/build-app.mjs');
  assert.equal(read('app/sw.js'), read('Demos/sw.js'));
  assert.match(read('Demos/sw.js'), new RegExp(`const VERSION = '${readVersion(root).replace(/\./g, '\\.')}';`));
  assert.match(read('Demos/session-engine.html'), new RegExp(`<meta name="metamedium-version" content="${readVersion(root).replace(/\./g, '\\.')}">`));
});

test('--check fails by name on a page edited or a version bumped without the build, and the build puts it right', () => {
  const dir = mkdtempSync(join(tmpdir(), 'mm-build-app-'));
  scratch.push(dir);
  for (const p of ['VERSION', 'app', 'Demos/session-engine.html', 'Demos/sw.js', 'Demos/manifest.webmanifest', 'scripts/build-app.mjs']) {
    mkdirSync(dirname(join(dir, p)), { recursive: true });
    cpSync(join(root, p), join(dir, p), { recursive: true });
  }
  const run = (...args) => spawnSync(process.execPath, [join(dir, 'scripts', 'build-app.mjs'), ...args], { encoding: 'utf8' });
  assert.equal(run('--check').status, 0, 'a faithful copy drifted');

  const page = join(dir, 'Demos', 'session-engine.html');
  writeFileSync(page, readFileSync(page, 'utf8').replace('<div id="stage"></div>', '<div id="stage"></div>\n<div id="somethingNew"></div>'));
  let check = run('--check');
  assert.equal(check.status, 1, 'an edited page passed');
  assert.match(check.stderr, /app\/index\.html/);
  assert.equal(run().status, 0);
  assert.match(readFileSync(join(dir, 'app', 'index.html'), 'utf8'), /<div id="somethingNew"><\/div>/);
  assert.equal(run('--check').status, 0);

  writeFileSync(join(dir, 'VERSION'), '7.8.9\n');
  check = run('--check');
  assert.equal(check.status, 1, 'a bumped version passed');
  for (const p of ['Demos/session-engine.html', 'Demos/sw.js', 'app/index.html', 'app/sw.js']) assert.ok(check.stderr.includes(p), `--check did not name ${p}`);
  assert.equal(run().status, 0);
  assert.match(readFileSync(join(dir, 'app', 'sw.js'), 'utf8'), /const VERSION = '7\.8\.9';/);
  assert.match(readFileSync(join(dir, 'app', 'index.html'), 'utf8'), /<meta name="metamedium-version" content="7\.8\.9">/);
  assert.equal(run('--check').status, 0);

  writeFileSync(join(dir, 'VERSION'), 'banana\n');
  assert.equal(run('--check').status, 1, 'a VERSION that is not a version passed');
});
