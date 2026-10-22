// RENAME-PLAN N4's list of address changes (scripts/n4.mjs), held to the repository as it stands.
//
//   node --test scripts/n4.test.mjs
//
// Before N4 every edit must still find exactly the places it expects (a file that drifted is
// refused by name, never half-changed); after it, every edit reads as made. Applied to a copy, the
// whitepaper and its 404 name dyna.ink, every address they link is still a file the site
// publishes, and applying again writes nothing. The repository itself is never written.

import { test, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, cpSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { EDITS, plan, apply } from './n4.mjs';
import { publishedLinks, fileCandidates } from '../e2e/links.mjs';
import { siteFiles } from '../cloudflare/build-site.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const scratch = [];
after(() => { for (const d of scratch) rmSync(d, { recursive: true, force: true }); });

/** A copy of the files N4 edits (and the README, which the address oracle reads), in a folder of its own. */
function copy() {
  const dir = mkdtempSync(join(tmpdir(), 'dyna-n4-'));
  scratch.push(dir);
  for (const f of new Set([...EDITS.map((e) => e.file), 'README.md'])) { mkdirSync(dirname(join(dir, f)), { recursive: true }); cpSync(join(root, f), join(dir, f)); }
  return dir;
}
const read = (dir, f) => readFileSync(join(dir, f), 'utf8');

test('every edit still applies to the repository as it stands — all to make, or all made; none drifted', () => {
  const { rows } = plan(root);
  assert.equal(rows.length, EDITS.length);
  assert.deepEqual(rows.filter((r) => r.state === 'drifted').map((r) => r.why), [], 'an edit no longer finds what it expects');
  const states = new Set(rows.map((r) => r.state));
  assert.equal(states.size, 1, 'half of N4 is made: ' + rows.map((r) => `${r.state} ${r.file}`).join(', '));
});

test('applied to a copy: dyna.ink is named, every linked address is still published, and applying again writes nothing', () => {
  const dir = copy();
  if (plan(root).rows.every((r) => r.state === 'applied')) return; // N4 is made: nothing left to try on a copy
  const written = apply(dir);
  assert.deepEqual(written.sort(), [...new Set(EDITS.map((e) => e.file))].sort());
  assert.ok(plan(dir).rows.every((r) => r.state === 'applied'), 'an edit does not read as made after --apply');
  const page = read(dir, 'index.html');
  assert.match(page, /<link rel="canonical" href="https:\/\/dyna\.ink\/">/);
  assert.match(page, /<meta property="og:image" content="https:\/\/dyna\.ink\/Assets\/thumb-dynaink\.png">/);
  assert.ok(!/href="https:\/\/jjh111\.github\.io\/MetaMedium\//.test(page), 'the whitepaper still links the old home absolutely');
  assert.match(page, /<a href="app\/\?example=story"/);
  assert.match(page, /<a href="app\/"[^>]*>dyna\.ink\/app\/<\/a>/);
  const missing = read(dir, '404.html');
  assert.match(missing, /href="https:\/\/dyna\.ink\/" class="primary"/);
  assert.match(missing, /href="https:\/\/dyna\.ink\/app\/" class="secondary"/);
  assert.match(read(dir, 'core/src/llm/provider.ts'), /OPENROUTER_APP = \{ url: 'https:\/\/dyna\.ink\/'/);
  assert.match(read(dir, 'Demos/surface/17-carry.js'), /const NEW_HOME_NOTICE = true;/);
  assert.match(read(dir, 'scripts/release.mjs'), /const app = 'https:\/\/dyna\.ink\/app\/';/);
  // The whitepaper's addresses after N4 are still files the product's site publishes (cloudflare/build-site.mjs).
  const files = new Set(siteFiles(root));
  assert.deepEqual(publishedLinks(dir).filter((a) => !fileCandidates(a).some((f) => files.has(f))), [], 'an address N4 links that the site would not answer');
  const before = Object.fromEntries(written.map((f) => [f, read(dir, f)]));
  assert.deepEqual(apply(dir), [], 'a second --apply wrote');
  for (const f of written) assert.equal(read(dir, f), before[f]);
});

test('a file that drifted is refused by name, and nothing is written', () => {
  const dir = copy();
  if (plan(root).rows.every((r) => r.state === 'applied')) return;
  writeFileSync(join(dir, 'index.html'), read(dir, 'index.html').replace(/<link rel="canonical"[^>]*>/, ''));
  const before = Object.fromEntries(EDITS.map((e) => [e.file, read(dir, e.file)]));
  assert.throws(() => apply(dir), /nothing was changed:[\s\S]*index\.html: expected 4 places for “the whitepaper's social card and canonical address/);
  for (const [f, text] of Object.entries(before)) assert.equal(read(dir, f), text, f + ' was written');
});

test('without --apply it lists, and writes nothing', () => {
  const before = Object.fromEntries(EDITS.map((e) => [e.file, read(root, e.file)]));
  const r = spawnSync(process.execPath, [join(here, 'n4.mjs')], { cwd: root, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  assert.match(r.stdout, /nothing is written/);
  assert.match(r.stdout, /core\/src\/llm\/provider\.ts:\d+/);
  assert.match(r.stdout, /By hand:/);
  for (const [f, text] of Object.entries(before)) assert.equal(read(root, f), text, f + ' was written');
  assert.equal(spawnSync(process.execPath, [join(here, 'n4.mjs'), '--now'], { cwd: root, encoding: 'utf8' }).status, 2, 'an unknown option is a usage error');
});
