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
//
// Either way it refuses a surface that does not parse, or one where a name is
// declared twice at the closure's top — two fragments with a function of one
// name — which the closure would take without a word (below). That check
// reads the fragments as strict code, so they must also compile as strict
// code; they do, and `Demos/build-surface.test.mjs` asks it both questions.

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

// And no name may be declared twice at the closure's top. In the closure that
// is legal: two fragments that each declare `function draw` leave one `draw`,
// the last, and every call — the first fragment's own, made before the second
// was reached, included — goes to it without a word. It broke rendering once.
// Read as ONE STRICT BLOCK the same source is an early error the parser
// reports by name (a function body may declare a function twice; a strict
// block may not, nor a `var` and a function of one name), so the check is the
// engine's own reading of the fragments, not a pattern over their text: a
// function nested inside another, in however many fragments, is no clash.
const strictBlockError = (source) => {
  try {
    new Function('"use strict"; {\n' + source + '\n}');
    return null;
  } catch (err) {
    return err;
  }
};
const REDECLARED = /Identifier '([^']+)' has already been declared/;
const clash = strictBlockError(parts.join('\n\n'));
if (clash) {
  const name = (REDECLARED.exec(clash.message) || [])[1];
  if (!name) {
    console.error('the surface must also compile as strict code, which is how the build looks for a name declared twice:', clash.message);
    process.exit(1);
  }
  // Which fragments declare it: the same question put to each on its own,
  // with one more declaration of the name beside what it already has.
  const where = names.filter((f, i) => REDECLARED.test((strictBlockError(parts[i] + '\nlet ' + name + ';') || {}).message || ''));
  console.error(
    `\`${name}\` is declared twice at the top of the surface (${where.join(', ')}) — they share one closure, ` +
      'so the last replaces the first everywhere, without a word. Rename one.',
  );
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
