// The engine's committed bundles, by their names (RENAME-PLAN N3c).
//
//   node --test Demos/core-bundle.test.mjs
//
// The browser bundle is a classic script that defines one global, `DynaInkCore` — what the app, the
// whitepaper and the standalone file read. For one release it also defines `MetaMediumCore`, the name
// it had before the rename, as the same object, so a page outside this repository that loads the bundle
// and reads the old global keeps working (§2). Loaded here as a page loads it: run as a script in a
// context of its own, where a top-level `var` is a property of the global object, as it is of `window`.
// That the bytes are a fresh build is CI's drift check, not this test's.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import vm from 'node:vm';

const here = dirname(fileURLToPath(import.meta.url));
const BROWSER = join(here, 'dynaink-core.browser.js');
const NODE = join(here, 'dynaink-core.node.mjs');

/** The browser bundle run as a page runs it: a script in a global of its own. Returns that global. */
function loadAsAPage() {
  const page = vm.createContext({
    console, setTimeout, clearTimeout, setInterval, clearInterval, queueMicrotask,
    TextEncoder, TextDecoder, URL, URLSearchParams, performance, crypto: globalThis.crypto,
  });
  vm.runInContext(readFileSync(BROWSER, 'utf8'), page, { filename: 'dynaink-core.browser.js' });
  return page;
}

test('the browser bundle defines DynaInkCore, the engine', () => {
  const page = loadAsAPage();
  assert.equal(typeof page.DynaInkCore, 'object', 'no DynaInkCore global');
  for (const f of ['createSession', 'getFingerprint', 'analyzeStroke', 'decodeLog']) {
    assert.equal(typeof page.DynaInkCore[f], 'function', 'DynaInkCore.' + f);
  }
  const s = page.DynaInkCore.createSession();
  assert.equal(typeof s.getState, 'function', 'a session made from the global');
});

test('…and MetaMediumCore, the old global, as the same object, for one release', () => {
  const page = loadAsAPage();
  assert.ok(page.MetaMediumCore, 'no MetaMediumCore alias');
  assert.equal(page.MetaMediumCore, page.DynaInkCore, 'the alias is not the same object');
});

test('the banners name the files they are, and the bundles stand only under their new names', async () => {
  assert.match(readFileSync(BROWSER, 'utf8').split('\n')[0], /dynaink-core\.browser\.js|@dynaink\/core browser bundle/);
  assert.match(readFileSync(NODE, 'utf8').split('\n')[0], /dynaink-core\.node\.mjs|@dynaink\/core node bundle/);
  const node = await import(pathToFileURL(NODE).href);
  assert.equal(typeof node.createSession, 'function', 'the Node bundle exports the engine');
  for (const old of ['metamedium-core.browser.js', 'metamedium-core.node.mjs']) {
    assert.ok(!existsSync(join(here, old)), `Demos/${old} is still here — a page or a shell could load the stale engine`);
  }
});
