// Build the reference surface's script from its fragments.
//
//   node Demos/build-surface.mjs            # writes Demos/session-engine.js
//   node Demos/build-surface.mjs --check    # exits 1 if the committed file drifted
//
// Demos/surface/*.js are fragments of ONE closure, concatenated in name order
// inside `(function () { ... })();`. They share the closure's variables, so a
// fragment is a concern, not a module — the split exists so several people
// can work on the surface at once without editing one 2,800-line file. The
// built file is committed (like the engine bundle) so the demo needs no build
// to run, and CI checks it has not drifted from its fragments.

import { readFileSync, writeFileSync, readdirSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const dir = join(here, 'surface');
const out = join(here, 'session-engine.js');
const check = process.argv.includes('--check');

const names = readdirSync(dir).filter((f) => /^\d\d-.*\.js$/.test(f)).sort();
const parts = names.map((f) => readFileSync(join(dir, f), 'utf8').replace(/\s+$/, ''));
const built =
  '/* Built from Demos/surface/*.js by Demos/build-surface.mjs — do not edit; edit the fragments. */\n' +
  '(function () {\n' + parts.join('\n\n') + '\n})();\n';

// It must at least parse as one script.
try {
  new Function(built);
} catch (err) {
  console.error('the concatenated surface does not parse:', err.message);
  process.exit(1);
}

if (check) {
  const committed = readFileSync(out, 'utf8');
  if (committed !== built) {
    console.error('Demos/session-engine.js has drifted from Demos/surface/*.js — run: node Demos/build-surface.mjs');
    process.exit(1);
  }
  console.log('surface in sync');
} else {
  writeFileSync(out, built);
  console.log(`wrote ${out} from ${names.length} fragments (${(built.length / 1024).toFixed(0)}KB)`);
}
