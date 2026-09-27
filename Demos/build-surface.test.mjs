// The surface's build, asked about a closure it would break.
//
//   node --test Demos/build-surface.test.mjs
//
// Demos/surface/*.js are fragments of ONE closure. Two fragments that declare a
// function of one name are legal JavaScript there: the closure keeps the second,
// everywhere, calls made before it included, and says nothing — which is how
// rendering broke once. So the build must refuse it, and `--check` (CI's) must
// fail on it. Each case builds a scratch surface of its own — the real build
// script copied beside a `surface/` of the fragments given — so nothing here
// reads or writes the real one.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, copyFileSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const here = dirname(fileURLToPath(import.meta.url));

/** A scratch surface: the build script beside the fragments given. */
function scratch(fragments) {
  const dir = mkdtempSync(join(tmpdir(), 'mm-surface-'));
  mkdirSync(join(dir, 'surface'));
  copyFileSync(join(here, 'build-surface.mjs'), join(dir, 'build-surface.mjs'));
  for (const [name, source] of Object.entries(fragments)) writeFileSync(join(dir, 'surface', name), source);
  const run = (...args) => spawnSync(process.execPath, [join(dir, 'build-surface.mjs'), ...args], { encoding: 'utf8' });
  return { run, built: () => existsSync(join(dir, 'session-engine.js')), done: () => rmSync(dir, { recursive: true, force: true }) };
}

test('distinct names build, and --check says the surface is in sync', () => {
  const s = scratch({
    '00-a.js': '  function draw() { return 1; }\n  function paint() { function step() {} return step; }\n',
    '01-b.js': '  function erase() { return draw(); }\n  function tidy() { function step() {} return step; }\n',
  });
  try {
    assert.equal(s.run().status, 0, 'the build refused fragments that share no top-level name');
    const check = s.run('--check');
    assert.equal(check.status, 0, check.stderr);
    assert.match(check.stdout, /surface in sync/);
  } finally { s.done(); }
});

test('two fragments that declare one function: --check fails, naming it and both fragments', () => {
  const s = scratch({
    '00-a.js': "  function draw() { return 'a'; }\n  const first = draw();\n",
    '01-b.js': "  function draw() { return 'b'; }\n",
  });
  try {
    s.run();
    const check = s.run('--check');
    assert.equal(check.status, 1, 'the second `draw` silently replaced the first, and --check passed');
    assert.match(check.stderr, /\bdraw\b/);
    assert.match(check.stderr, /00-a\.js/);
    assert.match(check.stderr, /01-b\.js/);
  } finally { s.done(); }
});

test('…and the build refuses to write it', () => {
  const s = scratch({
    '00-a.js': "  function draw() { return 'a'; }\n",
    '01-b.js': "  function draw() { return 'b'; }\n",
  });
  try {
    const build = s.run();
    assert.equal(build.status, 1, 'the build wrote a surface whose first `draw` is dead');
    assert.equal(s.built(), false);
  } finally { s.done(); }
});

test('an async or a generator declaration is a declaration too', () => {
  const s = scratch({
    '00-a.js': '  async function load() { return 1; }\n',
    '01-b.js': '  function* load() { yield 2; }\n',
  });
  try {
    const build = s.run();
    assert.equal(build.status, 1, 'two top-level `load`s were built into one closure');
    assert.match(build.stderr, /\bload\b/);
  } finally { s.done(); }
});
