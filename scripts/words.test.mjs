// No sentence the engine says names one of its own source files.
//
//   node --test scripts/words.test.mjs
//
// The engine's sentences reach a person — a reading's reason in the panel, a chip's tooltip, a solver's sentence
// beside a figure — and a file name in one is the developer's note left in the person's words: *right within ±4°
// (measure.ts)* told nobody using the canvas anything (found 27 Oct 2026, with *which heads.ts reads as a head* in
// three notations' reasons). Say what the rule is, or what read it, in words; the file belongs in a comment.
//
// What is read is the string literals of every source file of the engine (core/src, never a test or a fixture), as
// name.test.mjs reads them. What may stand is on the allowlist, each entry with its reason. Not read: the surface's
// and the hands' strings, which name a file on purpose where they tell a person what to run (`node Demos/mcp.mjs`).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { scriptStrings } from './strings.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ENGINE = readdirSync(join(root, 'core/src'), { recursive: true })
  .filter((f) => /\.ts$/.test(f) && !/\.test\.ts$/.test(f) && !/(^|\/)(test|fixtures)\//.test(f)).sort().map((f) => 'core/src/' + f);

/** A source file of the engine's, by name: `measure.ts`, `session/measure.ts`. */
const SOURCE_FILE = /\b[\w-]+(?:\/[\w-]+)*\.ts\b/g;

const ALLOWLIST = [
  {
    why: 'the instant library\'s `source`: where each module lives, for a developer reading the registry — a field no surface says (`InstantModule.source`)',
    files: ['core/src/tier1/library.ts'], at: /\bsource: '[^']*\.ts/,
  },
];

function hits() {
  const found = [];
  for (const file of ENGINE) {
    const text = readFileSync(join(root, file), 'utf8');
    const seen = scriptStrings(text);
    for (const m of seen.matchAll(SOURCE_FILE)) {
      const n = text.slice(0, m.index).split('\n').length;
      found.push({ file, line: n, name: m[0], text: text.split('\n')[n - 1].trim() });
    }
  }
  return found;
}

const allowedBy = (hit) => ALLOWLIST.find((e) => e.files.includes(hit.file) && e.at.test(hit.text));

test('a sentence the engine says names none of its source files', () => {
  const wrong = hits().filter((h) => !allowedBy(h));
  assert.deepEqual(wrong.map((h) => `${h.file}:${h.line} — “${h.name}” in ${h.text.slice(0, 140)}`), [],
    'say what the rule is, or what read it, in words — the file belongs in a comment');
});

test('every allowlist entry is still needed and says why', () => {
  const all = hits();
  for (const e of ALLOWLIST) {
    assert.ok(e.why.length > 20, 'an allowlist entry must say why');
    assert.ok(all.some((h) => allowedBy(h) === e), `an allowlist entry matches nothing now — remove it: ${e.why}`);
  }
});
