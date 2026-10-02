// The rights (RENAME-PLAN.md §5 N2, as John amended it on 2 Oct 2026).
//
//   node --test scripts/rights.test.mjs
//
// Everything in the repository is under the GNU AGPL-3.0, stated once — in LICENSE, the FSF's text verbatim —
// and named by its SPDX id, AGPL-3.0-only, everywhere else. Who holds the copyright is said in one home, NOTICE;
// the whitepaper's footer and TRADEMARKS.md name the same holder, so the day the holder changes (a company formed
// and the rights assigned to it) the change is a few lines, and this test fails if any one of them is left behind.
// The whitepaper's prose and figures are CC BY 4.0, and the names are not licensed at all (TRADEMARKS.md).

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const read = (p) => readFileSync(join(root, p), 'utf8');
const tracked = (...patterns) => execFileSync('git', ['ls-files', '-z', '--', ...patterns], { cwd: root, maxBuffer: 1 << 26 })
  .toString('utf8').split('\0').filter(Boolean).filter((f) => !f.split('/').includes('node_modules') && existsSync(join(root, f)));

/** The SPDX id every package names. */
const SPDX = 'AGPL-3.0-only';
/**
 * The FSF's plain text, https://www.gnu.org/licenses/agpl-3.0.txt, fetched 2 Oct 2026: 661 lines, ASCII. LICENSE is
 * that file byte for byte — never edited, never paraphrased.
 */
const AGPL_SHA256 = '0d96a4ff68ad6d4b6f1f30f713b18d5184912ba8dd389f86aa7710db079abcb0';

/** NOTICE's first line: the product, its former name, and the one statement of who holds the copyright. */
const HOLDER_LINE = /^dyna\.ink \(formerly MetaMedium\) — Copyright © (\d{4}–\d{4}) (.+)$/m;

/** The holder and the years, read from NOTICE — never written in this test, so the switch does not touch it. */
function holder() {
  const m = read('NOTICE').match(HOLDER_LINE);
  assert.ok(m, 'NOTICE begins "dyna.ink (formerly MetaMedium) — Copyright © <years> <holder>" (RENAME-PLAN N2)');
  return { years: m[1], name: m[2].trim() };
}

/** Markup to the words it shows: tags out, entities read, spaces folded. */
const words = (html) => html.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ').replace(/&copy;/g, '©')
  .replace(/&ndash;/g, '–').replace(/&mdash;/g, '—').replace(/\s+/g, ' ').trim();

/** The pages the site publishes, as they stand today — never archive/, whose pages are records that keep their words. */
const pages = () => tracked('*.html').filter((f) => !f.startsWith('archive/'));

test('LICENSE is the GNU AGPL-3.0, verbatim', () => {
  const text = read('LICENSE');
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  assert.equal(lines[0], 'GNU AFFERO GENERAL PUBLIC LICENSE');
  assert.equal(lines[1], 'Version 3, 19 November 2007');
  assert.match(text, /How to Apply These Terms to Your New Programs/, 'the text runs to its last section');
  assert.equal(createHash('sha256').update(readFileSync(join(root, 'LICENSE'))).digest('hex'), AGPL_SHA256,
    'LICENSE is the FSF\'s agpl-3.0.txt byte for byte — fetch it again, never edit it');
});

test('every package the repository tracks says AGPL-3.0-only, and so does its lockfile where it names one', () => {
  const manifests = tracked('*package.json');
  assert.ok(manifests.length >= 8, `the packages are found (${manifests.length})`);
  const wrong = manifests.map((f) => [f, JSON.parse(read(f)).license]).filter(([, l]) => l !== SPDX);
  assert.deepEqual(wrong.map(([f, l]) => `${f}: ${JSON.stringify(l)}`), [], `every package.json's license is "${SPDX}"`);
  const locks = tracked('*package-lock.json');
  const stale = locks.map((f) => [f, (JSON.parse(read(f)).packages || {})['']]).filter(([, r]) => r && 'license' in r && r.license !== SPDX);
  assert.deepEqual(stale.map(([f, r]) => `${f}: ${JSON.stringify(r.license)}`), [], `a lockfile that names the root's license names "${SPDX}"`);
});

test('NOTICE, TRADEMARKS.md and CONTRIBUTING.md stand at the root, and NOTICE names the holder', () => {
  for (const f of ['NOTICE', 'TRADEMARKS.md', 'CONTRIBUTING.md']) assert.ok(existsSync(join(root, f)), `${f} exists`);
  const { name, years } = holder();
  assert.ok(name.length > 2, 'NOTICE names who holds the copyright');
  assert.match(years, /^2015–\d{4}$/, 'from 2015, when the work began');
  const notice = read('NOTICE');
  assert.match(notice, new RegExp(`\\b${SPDX}\\b`), `NOTICE names the license by its SPDX id, ${SPDX}`);
  assert.match(notice, /CC BY 4\.0/, 'NOTICE says the whitepaper\'s prose and figures are CC BY 4.0');
  assert.match(notice, /TRADEMARKS\.md/, 'NOTICE points to TRADEMARKS.md for the names');
});

test('the whitepaper\'s footer and TRADEMARKS.md name the holder NOTICE names, in the same words', () => {
  const { name, years } = holder();
  const footer = read('index.html').match(/<p class="footer-copyright">([\s\S]*?)<\/p>/);
  assert.ok(footer, 'the whitepaper has its copyright line');
  assert.equal(words(footer[1]), `© ${years} ${name}`, 'the footer says what NOTICE says — change the holder in both');
  assert.ok(read('TRADEMARKS.md').includes(name), `TRADEMARKS.md names the holder, ${name}`);
});

test('no published page gives GPL as its license, and the whitepaper says AGPL-3.0 for the code and CC BY 4.0 for the essay', () => {
  const old = pages().filter((f) => /License:\s*(?:<\/strong>)?\s*GPL\b|\bGPL\s+—/.test(read(f)));
  assert.deepEqual(old, [], 'a page that still says GPL is its license');
  const line = read('index.html').match(/<strong>License:<\/strong>([\s\S]*?)<\/p>/);
  assert.ok(line, 'the whitepaper has its license line');
  const said = words(line[1]);
  assert.match(said, /\bdyna\.ink\b/, said);
  assert.match(said, /GNU AGPL-3\.0\b/, said);
  assert.match(said, /CC BY 4\.0/, said);
});

test('the README names the license, the essay\'s, NOTICE and TRADEMARKS.md', () => {
  const readme = read('README.md');
  const section = readme.match(/^## License\n([\s\S]*?)(?=^## |(?![\s\S]))/m);
  assert.ok(section, 'README has a License section');
  for (const want of [SPDX, 'CC BY 4.0', 'NOTICE', 'TRADEMARKS.md']) assert.ok(section[1].includes(want), `README's License section names ${want}`);
});
