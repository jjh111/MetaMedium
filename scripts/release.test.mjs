// The release script, asked what it keeps and what it refuses (V1-PLAN.md §9 R7).
//
//   node --test scripts/release.test.mjs
//
// Its pure parts — the order of versions, which tags are releases, which unit
// a commit belongs to, the changelog's section and where it goes — asked
// directly. Then the script itself, run on repositories made for the purpose:
// a small one where it cuts a real release (one commit, one annotated tag, the
// standalone file, and nothing pushed) and refuses what it must, and a scratch
// clone of this repository, where a dry run must print the release and change
// nothing. Git runs with a configuration of its own here — no global one, a
// test identity — so no one's signing or hooks reach these repositories.

import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, cpSync, rmSync, existsSync, appendFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

import {
  parseVersion, compareVersions, bumpVersion, releaseTagVersion, unitOf, groupByUnit,
  changelogSection, insertSection, keyShapesIn, releaseState,
} from './release.mjs';
import { make } from './build-app.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const SCRIPT = join(here, 'release.mjs');

const scratch = [];
const tmp = (what) => { const d = mkdtempSync(join(tmpdir(), `mm-release-${what}-`)); scratch.push(d); return d; };
after(() => { for (const d of scratch) rmSync(d, { recursive: true, force: true }); });

const HOME = tmp('home');
writeFileSync(join(HOME, 'gitconfig'), '');
const ENV = {
  ...process.env,
  GIT_CONFIG_GLOBAL: join(HOME, 'gitconfig'), GIT_CONFIG_NOSYSTEM: '1',
  GIT_AUTHOR_NAME: 'Release Test', GIT_AUTHOR_EMAIL: 'release-test@example.invalid',
  GIT_COMMITTER_NAME: 'Release Test', GIT_COMMITTER_EMAIL: 'release-test@example.invalid',
};
function git(cwd, ...args) {
  const r = spawnSync('git', args, { cwd, env: ENV, encoding: 'utf8' });
  if (r.status !== 0) throw new Error(`git ${args.join(' ')} failed: ${r.stderr}`);
  return r.stdout.trim();
}
const release = (cwd, ...args) => spawnSync(process.execPath, [SCRIPT, ...args], { cwd, env: ENV, encoding: 'utf8' });
/** A key-shaped string, made here so that no file of the repository holds one. */
const fakeKey = () => ['sk', 'ant', 'api03', 'x'.repeat(24) + 'Q'.repeat(24)].join('-');

// ===== the pure parts ==============================================================

test('versions are ordered as semver orders them — a pre-release before its release, numbers as numbers', () => {
  const order = ['0.0.0', '0.0.1', '0.1.0', '0.9.0', '0.10.0', '1.0.0-alpha', '1.0.0-alpha.1', '1.0.0-alpha.beta', '1.0.0-beta',
    '1.0.0-beta.2', '1.0.0-beta.11', '1.0.0-rc.1', '1.0.0', '1.0.1', '1.1.0', '2.0.0'];
  for (let i = 0; i < order.length; i++) {
    for (let j = 0; j < order.length; j++) assert.equal(Math.sign(compareVersions(order[i], order[j])), Math.sign(i - j), `${order[i]} against ${order[j]}`);
  }
  assert.equal(bumpVersion('0.1.0', 'patch'), '0.1.1');
  assert.equal(bumpVersion('0.1.9', 'minor'), '0.2.0');
  assert.equal(bumpVersion('1.0.0-rc.2', 'major'), '2.0.0');
  assert.ok(compareVersions(bumpVersion('1.0.0-rc.2', 'minor'), '1.0.0-rc.2') > 0);
});

test('a version is MAJOR.MINOR.PATCH with an optional pre-release, and nothing else', () => {
  for (const ok of ['0.0.0', '1.2.3', '10.20.30', '1.0.0-rc.1', '1.0.0-0.3.7', '1.0.0-x.7.z.92', '1.0.0-alpha-a.b-c']) assert.ok(parseVersion(ok), ok);
  for (const bad of ['', '1', '1.0', 'v1.0.0', '01.0.0', '1.02.0', '1.0.0-', '1.0.0-01', '1.0.0+build.1', '1.0.0 ', ' 1.0.0', '1.0.0-rc..1', '1.0-day1']) {
    assert.equal(parseVersion(bad), null, JSON.stringify(bad));
  }
});

test('a release tag is v and a version — the day-one tag is not a release', () => {
  assert.equal(releaseTagVersion('v1.2.3'), '1.2.3');
  assert.equal(releaseTagVersion('v1.0.0-rc.1'), '1.0.0-rc.1');
  assert.equal(releaseTagVersion('v1.0-day1'), null);
  assert.equal(releaseTagVersion('1.2.3'), null);
  assert.equal(releaseTagVersion('release-1.2.3'), null);
});

test('a commit belongs to the unit its subject names — before the colon first, then anywhere, and a plan is not a unit', () => {
  const cases = [
    ['R4d: a room merges a line, not the board — core', 'R4d'],
    ["R4d red: a room's line as budgets, and the oracle for every order of arrival", 'R4d'],
    ['R1 red first: several named boards, and the kill test across switches, failing', 'R1'],
    ["S1 docs: the status in V1-PLAN §9, the rung's bow and barb", 'S1'],
    ['Docs for R4b: what is stored and what a scope computes, the status line', 'R4b'],
    ['Core exports the grid and the reach test, for the surface (R4c)', 'R4c'],
    ['CLAUDE.md: phase 0 done, 0b next and why, the map and the tiers current (L3)', 'L3'],
    ["V1 plan: L3's status, and phase 0 done on w2", 'L3'],
    ['PERF.md: the engine after R4b, beside the baseline', 'R4b'],
    ['U1a (T8): a node id is a function of the event, not of its place in the merge', 'U1a'],
    ['QA-1: the browser gate runs headless', 'QA-1'],
    ['STATE-1 red: a late result resurrects an erased target', 'STATE-1'],
    ['WP-11: the folder as the canvas', 'WP-11'],
    ['L2i: a person is the same person across sittings', 'L2i'],
    ['Labels read as UTF-8, and R7 says so', 'R7'],
    ["CLAUDE.md: the gate's five scenarios and their counts after the merges", null],
    ['Equivalence harness: a scripted log of the acts the boards never make', null],
    ['The engine bundles, rebuilt with ports, heads and figures', null],
    ['Add files via upload', null],
  ];
  for (const [subject, unit] of cases) assert.equal(unitOf(subject), unit, subject);
});

test("the section groups commits by unit, in the names' own order, and what names none last", () => {
  const commits = [
    { hash: 'a1', subject: 'R7 red: one app address and the release script, failing' },
    { hash: 'b2', subject: 'B1: the tool contract' },
    { hash: 'c3', subject: 'R7: the app at /app/' },
    { hash: 'd4', subject: 'CLAUDE.md: the map' },
    { hash: 'e5', subject: 'R10: a unit past nine' },
    { hash: 'f6', subject: 'R4d: a line, not the board' },
  ];
  const groups = groupByUnit(commits);
  assert.deepEqual(groups.map((g) => g.unit), ['B1', 'R4d', 'R7', 'R10', null]);
  assert.deepEqual(groups.find((g) => g.unit === 'R7').commits.map((c) => c.hash), ['a1', 'c3']);

  const text = changelogSection({ version: '0.2.0', date: '2026-09-28', base: { tag: 'v0.1.0' }, commits });
  assert.match(text, /^## 0\.2\.0 — 2026-09-28\n\nSince v0\.1\.0: 6 commits/);
  assert.match(text, /\n### R7\n\n- R7 red: one app address and the release script, failing \(`a1`\)\n- R7: the app at \/app\/ \(`c3`\)\n/);
  const at = (h) => text.indexOf(`\n### ${h}\n`);
  assert.ok(at('B1') > 0 && at('B1') < at('R4d') && at('R4d') < at('R7') && at('R7') < at('R10') && at('R10') < at('Other'), text);
  assert.match(changelogSection({ version: '0.1.0', date: '2026-09-28', base: null, commits }), /From the beginning: 6 commits/);
  assert.match(changelogSection({ version: '0.1.0', date: '2026-09-28', base: { ref: 'HEAD~2' }, commits: commits.slice(0, 2) }), /Since HEAD~2: 2 commits/);
  assert.match(changelogSection({ version: '0.1.1', date: '2026-09-28', base: { tag: 'v0.1.0' }, commits: [] }), /Since v0\.1\.0: no commits\./);
});

test('a new section goes under the header, above the release before it, and the placeholder goes', () => {
  const header = '# Changelog\n\nWords about it.\n\n_No release has been cut yet._\n';
  const one = insertSection(header, '## 0.1.0 — 2026-09-28\n\nfirst\n');
  assert.equal(one, '# Changelog\n\nWords about it.\n\n## 0.1.0 — 2026-09-28\n\nfirst\n');
  const two = insertSection(one, '## 0.2.0 — 2026-10-01\n\nsecond\n');
  assert.equal(two, '# Changelog\n\nWords about it.\n\n## 0.2.0 — 2026-10-01\n\nsecond\n\n## 0.1.0 — 2026-09-28\n\nfirst\n');
  assert.equal(insertSection('', '## 0.1.0 — 2026-09-28\n\nx\n'), '# Changelog\n\n## 0.1.0 — 2026-09-28\n\nx\n');
});

test('a key-shaped string is found and never said back; the files a release ships hold none', () => {
  const found = keyShapesIn(`const k = "${fakeKey()}";`);
  assert.equal(found.length, 1);
  assert.ok(!JSON.stringify(found).includes(fakeKey()), 'the finding repeats the key');
  assert.equal(keyShapesIn(['ghp', 'A'.repeat(36)].join('_')).length, 1);
  assert.equal(keyShapesIn('<input id="mpKey" type="password" placeholder="API key" autocomplete="off" />').length, 0);
  for (const f of ['Demos/session-engine.html', 'Demos/session-engine.js', 'Demos/metamedium-core.browser.js', 'Demos/surface/surface.css']) {
    assert.equal(keyShapesIn(readFileSync(join(root, f), 'utf8')).length, 0, f);
  }
});

// ===== the script, on a small repository ============================================

/** The files a release reads or writes, copied from this repository. */
const FILES = ['.gitignore', 'CHANGELOG.md', 'VERSION', 'HELP.md', 'app', 'Demos/session-engine.html', 'Demos/sw.js', 'Demos/manifest.webmanifest',
  'Demos/session-engine.js', 'Demos/metamedium-core.browser.js', 'Demos/surface/surface.css'];

/** A small repository holding those files at `version`, released as such (tagged, pushed to a remote of its own). */
function smallRepo(version = '0.1.0') {
  const dir = tmp('repo');
  const remote = tmp('remote');
  for (const p of FILES) { mkdirSync(dirname(join(dir, p)), { recursive: true }); cpSync(join(root, p), join(dir, p), { recursive: true }); }
  writeFileSync(join(dir, 'VERSION'), version + '\n');
  for (const f of make(dir)) if (f.changed) writeFileSync(join(dir, f.path), f.text);
  git(dir, 'init', '-q', '-b', 'master');
  git(dir, 'add', '-A');
  git(dir, 'commit', '-q', '-m', 'The base');
  git(dir, 'tag', '-a', `v${version}`, '-m', `MetaMedium ${version}`); // as 0.1.0, the last before the rename, was tagged
  git(dir, 'tag', '-a', 'v1.0-day1', '-m', 'Day 1 MVP'); // looks like a 1.0 and is not a release
  git(remote, 'init', '-q', '--bare');
  git(dir, 'remote', 'add', 'origin', remote);
  git(dir, 'push', '-q', 'origin', 'master', '--tags');
  let n = 0;
  return {
    dir,
    commit(subject) { appendFileSync(join(dir, 'notes.txt'), `${++n}\n`); git(dir, 'add', 'notes.txt'); git(dir, 'commit', '-q', '-m', subject); },
    state: () => ({ status: git(dir, 'status', '--porcelain'), head: git(dir, 'rev-parse', 'HEAD'), tags: git(dir, 'tag', '-l'), remote: git(dir, 'ls-remote', 'origin') }),
  };
}

test('a dry run prints the release and changes nothing; the release is one commit and one annotated tag, and nothing is pushed', () => {
  const r = smallRepo('0.1.0');
  r.commit('R7 red: one app address, failing');
  r.commit('B1: the tool contract');
  r.commit('R7: the app at /app/');
  r.commit('CLAUDE.md: the map');
  const before = r.state();

  const dry = release(r.dir, '0.2.0', '--dry-run');
  assert.equal(dry.status, 0, dry.stderr + dry.stdout);
  assert.match(dry.stdout, /^dyna\.ink 0\.2\.0 — a dry run/);
  assert.match(dry.stdout, /## 0\.2\.0 — \d{4}-\d{2}-\d{2}\n\nSince v0\.1\.0: 4 commits/);
  assert.match(dry.stdout, /### R7\n\n- R7 red: one app address, failing \(`[0-9a-f]{7,}`\)\n- R7: the app at \/app\/ \(`[0-9a-f]{7,}`\)/);
  assert.match(dry.stdout, /dist\/release\/dynaink-0\.2\.0\.html/);
  assert.match(dry.stdout, /gh release create v0\.2\.0 dist\/release\/dynaink-0\.2\.0\.html --title "dyna\.ink 0\.2\.0" --notes-from-tag/);
  assert.ok(!/metamedium-0\.2\.0|MetaMedium 0\.2\.0/i.test(dry.stdout), 'the dry run names the release the old way');
  assert.match(dry.stdout, /git push \S+ v0\.2\.0/);
  assert.deepEqual(r.state(), before, 'the dry run changed the repository');
  assert.equal(existsSync(join(r.dir, 'dist')), false, 'the dry run wrote dist/');

  const real = release(r.dir, '0.2.0');
  assert.equal(real.status, 0, real.stderr + real.stdout);
  const now = r.state();
  assert.equal(git(r.dir, 'log', '-1', '--format=%s'), 'Release 0.2.0');
  assert.equal(git(r.dir, 'rev-parse', 'HEAD~1'), before.head, 'the release is not one commit on the last');
  assert.equal(git(r.dir, 'cat-file', '-t', 'v0.2.0'), 'tag', 'the tag is not annotated');
  assert.equal(git(r.dir, 'rev-parse', 'v0.2.0^{commit}'), now.head);
  assert.match(git(r.dir, 'tag', '-l', '--format=%(contents)', 'v0.2.0'), /### R7/);
  assert.equal(now.status, '', 'the release left the tree dirty');
  assert.equal(now.remote, before.remote, 'the release pushed');
  assert.match(real.stdout, /^Released dyna\.ink 0\.2\.0 here — nothing has been pushed/);
  assert.match(real.stdout, /--title "dyna\.ink 0\.2\.0"/);
  assert.equal(git(r.dir, 'tag', '-l', '--format=%(contents:subject)', 'v0.2.0'), 'dyna.ink 0.2.0', "the tag's message does not lead with the release's name");
  assert.match(real.stdout, /git push \S+ v0\.2\.0/);

  assert.equal(readFileSync(join(r.dir, 'VERSION'), 'utf8'), '0.2.0\n');
  const log = readFileSync(join(r.dir, 'CHANGELOG.md'), 'utf8');
  assert.match(log, /^# Changelog\n/);
  assert.match(log, /\n## 0\.2\.0 — \d{4}-\d{2}-\d{2}\n\nSince v0\.1\.0: 4 commits[\s\S]*### B1[\s\S]*### R7[\s\S]*### Other\n\n- CLAUDE\.md: the map/);
  assert.deepEqual(make(r.dir).filter((f) => f.changed).map((f) => f.path), [], 'the app and the stamps are not the build of the new VERSION');
  assert.match(readFileSync(join(r.dir, 'app', 'sw.js'), 'utf8'), /const VERSION = '0\.2\.0';/);

  const file = join(r.dir, 'dist', 'release', 'dynaink-0.2.0.html');
  assert.ok(existsSync(file), 'no standalone file');
  assert.equal(existsSync(join(r.dir, 'dist', 'release', 'metamedium-0.2.0.html')), false, 'the standalone file is named the old way too');
  const html = readFileSync(file, 'utf8');
  assert.match(html, /<meta name="dynaink-version" content="0\.2\.0">/);
  // The page's tag, not the surface inlined beside it, which falls back to the old name for a page an older worker kept.
  assert.ok(!/<meta name="metamedium-version"/.test(html), 'the standalone file carries the old tag');
  assert.ok(html.includes('var MetaMediumCore') && !html.includes('src="metamedium-core.browser.js"'), 'the engine is not inlined');
  assert.equal(keyShapesIn(html).length, 0);
});

test('it refuses a dirty tree, a version not greater than the last, and a key in what it would ship — leaving everything as it was', () => {
  const r = smallRepo('0.1.0');
  r.commit('R7: something to release');
  const clean = r.state();

  writeFileSync(join(r.dir, 'stray.txt'), 'x');
  let out = release(r.dir, '0.2.0');
  assert.equal(out.status, 1, 'an untracked file is a dirty tree');
  assert.match(out.stderr, /not clean/);
  assert.equal(release(r.dir, '0.2.0', '--dry-run').status, 1, 'the dry run says what the real one would refuse');
  rmSync(join(r.dir, 'stray.txt'));
  appendFileSync(join(r.dir, 'notes.txt'), 'edited\n');
  assert.equal(release(r.dir, '0.2.0').status, 1, 'a modified file is a dirty tree');
  git(r.dir, 'checkout', '--', 'notes.txt');

  for (const v of ['0.1.0', '0.0.9', '0.1.0-rc.1']) {
    out = release(r.dir, v);
    assert.equal(out.status, 1, `${v} was taken`);
    assert.match(out.stderr, /not greater than/);
  }
  for (const v of ['banana', 'v0.2.0', '0.2']) assert.equal(release(r.dir, v).status, 2, `${v} is not a version`);
  assert.equal(release(r.dir).status, 2, 'no version is a usage error');

  git(r.dir, 'tag', 'v0.3.0');
  out = release(r.dir, '0.2.0');
  assert.equal(out.status, 1, 'a tag above VERSION is the last release too');
  assert.match(out.stderr, /v0\.3\.0/);
  git(r.dir, 'tag', '-d', 'v0.3.0');

  appendFileSync(join(r.dir, 'Demos', 'session-engine.js'), `\n// ${fakeKey()}\n`);
  git(r.dir, 'commit', '-q', '-am', 'R7: a key where no key goes');
  const withKey = r.state();
  out = release(r.dir, '0.2.0');
  assert.equal(out.status, 1, 'a key-shaped string would have shipped');
  assert.match(out.stderr, /key/);
  assert.ok(!out.stderr.includes(fakeKey()) && !out.stdout.includes(fakeKey()), 'the refusal says the key back');
  assert.deepEqual(r.state(), withKey, 'the refusal left something behind');
  assert.equal(readFileSync(join(r.dir, 'VERSION'), 'utf8'), '0.1.0\n');
  assert.equal(existsSync(join(r.dir, 'dist', 'release', 'dynaink-0.2.0.html')), false);
  assert.notDeepEqual(withKey.head, clean.head);
});

test('--since says where the section starts', () => {
  const r = smallRepo('0.1.0');
  r.commit('R7: one');
  r.commit('R7: two');
  r.commit('R7: three');
  const out = release(r.dir, '0.2.0', '--dry-run', '--since', 'HEAD~2');
  assert.equal(out.status, 0, out.stderr);
  assert.match(out.stdout, /Since HEAD~2: 2 commits/);
  assert.ok(!out.stdout.includes('R7: one'));
});

// ===== the script, on a scratch clone of this repository ============================

test('a dry run on a scratch clone of this repository prints the release and changes nothing', () => {
  const dir = tmp('clone');
  const c = spawnSync('git', ['clone', '--quiet', '--no-hardlinks', root, dir], { env: ENV, encoding: 'utf8' });
  assert.equal(c.status, 0, c.stderr);
  const state = releaseState(dir);
  const next = bumpVersion(state.last.version, 'minor');
  const snap = () => ({ status: git(dir, 'status', '--porcelain'), head: git(dir, 'rev-parse', 'HEAD'), tags: git(dir, 'tag', '-l') });
  const before = snap();
  const out = release(dir, next, '--dry-run');
  assert.equal(out.status, 0, out.stderr + out.stdout);
  assert.match(out.stdout, /dry run/);
  assert.match(out.stdout, new RegExp(`## ${next.replace(/\./g, '\\.')} — \\d{4}-\\d{2}-\\d{2}\\n\\n(?:Since|From)`));
  assert.match(out.stdout, new RegExp(`dist/release/dynaink-${next.replace(/\./g, '\\.')}\\.html --title "dyna\\.ink ${next.replace(/\./g, '\\.')}"`));
  assert.deepEqual(snap(), before, 'the dry run changed the clone');
  assert.equal(existsSync(join(dir, 'dist')), false, 'the dry run wrote dist/');
});
