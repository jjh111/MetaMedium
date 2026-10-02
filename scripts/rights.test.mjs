// The rights (RENAME-PLAN.md §5 N2, as John amended it on 2 Oct 2026).
//
//   node --test scripts/rights.test.mjs
//
// Everything in the repository is under the GNU AGPL-3.0, stated once — in LICENSE, the FSF's text verbatim —
// and named by its SPDX id, AGPL-3.0-only, everywhere else. Who holds the copyright is said in one home, NOTICE;
// the whitepaper's footer and TRADEMARKS.md name the same holder, so the day the holder changes (a company formed
// and the rights assigned to it) the change is a few lines, and this test fails if any one of them is left behind.
// The whitepaper's prose and figures are CC BY 4.0, and the names are not licensed at all (TRADEMARKS.md).
//
// Two of John's decisions of 2 Oct 2026 are held here too. Works by others the whitepaper shows are credited where
// they are shown and in NOTICE, and covered by neither license: Alan Kay's Dynabook drawings, whose caption names him
// and links his 1972 paper, as does every place the whitepaper names it. And the source is offered (AGPL-3.0 §13):
// the app's help pane says "Source code · AGPL-3.0", built from one constant in Demos/surface/17-boards.js, at both
// addresses and in the release's standalone file, and DynaInk3D's help pane links the same.

import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

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

// ---- Works by others, credited where they are shown (John's decision, 2 Oct 2026) --------------------------------

/** Alan Kay's 1972 paper, "A Personal Computer for Children of All Ages", at its canonical page: the ACM Digital Library. */
const KAY_1972 = 'https://dl.acm.org/doi/10.1145/800193.1971922';
/** The two Dynabook drawings from that paper, which the whitepaper shows. */
const DYNABOOK = 'Assets/fig-dynabook.jpg';

/** NOTICE's section under a heading (a line at the margin): every line up to the next line at the margin. */
function noticeSection(heading) {
  const lines = read('NOTICE').split('\n');
  const at = lines.findIndex((l) => heading.test(l) && !/^\s/.test(l));
  if (at < 0) return null;
  const out = [];
  for (const l of lines.slice(at + 1)) {
    if (l.trim() && !/^\s/.test(l)) break;
    out.push(l);
  }
  return out.join('\n');
}

/** Each anchor in `html` that holds the offset `at`: its opening tag, or null. */
function anchorAround(html, at) {
  const open = html.lastIndexOf('<a ', at);
  if (open < 0) return null;
  const close = html.indexOf('</a>', open);
  return close > at ? html.slice(open, html.indexOf('>', open) + 1) : null;
}

/** `html` with its comments blanked, so a word in a comment is never read as one the page shows. */
const uncommented = (html) => html.replace(/<!--[\s\S]*?-->/g, (c) => ' '.repeat(c.length));

test('Kay\'s Dynabook drawings are shown with credit: the figure\'s caption names Alan Kay and links his 1972 paper', () => {
  const html = uncommented(read('index.html'));
  const figures = [...html.matchAll(/<figure\b[\s\S]*?<\/figure>/g)].filter((m) => m[0].includes('fig-dynabook.jpg'));
  assert.ok(figures.length >= 1, `the whitepaper shows ${DYNABOOK} in a figure (John, 2 Oct 2026)`);
  const shown = [...html.matchAll(/fig-dynabook\.jpg/g)].map((m) => m.index);
  const inFigure = (at) => figures.some((f) => at >= f.index && at < f.index + f[0].length);
  assert.deepEqual(shown.filter((at) => !inFigure(at)), [], 'the drawings are shown only inside a figure that credits them');
  for (const [fig] of figures) {
    const img = fig.match(/<img\b[^>]*fig-dynabook\.jpg[^>]*>/);
    assert.ok(img, 'the figure shows the drawings as an image');
    const alt = (img[0].match(/\balt="([^"]*)"/) || [])[1] || '';
    assert.ok(alt.length >= 40 && /child/i.test(alt) && /stylus|keyboard/i.test(alt), `the alt text describes both drawings: "${alt}"`);
    const caption = (fig.match(/<figcaption>([\s\S]*?)<\/figcaption>/) || [])[1];
    assert.ok(caption, 'the figure has its caption');
    assert.match(words(caption), /Alan (C\. )?Kay/, 'the caption names Alan Kay');
    assert.match(words(caption), /1972/, 'the caption dates the paper');
    assert.match(words(caption), /© Alan C\. Kay/, 'the caption says whose the drawings are');
    const link = caption.match(/<a\b[^>]*>/g)?.find((a) => a.includes(`href="${KAY_1972}"`));
    assert.ok(link, `the caption links the paper at ${KAY_1972}`);
    assert.match(link, /target="_blank"/);
    assert.match(link, /rel="noopener"/);
  }
});

test('wherever the whitepaper names Kay\'s 1972 paper, the title links it — the quotes\' citations and the timeline\'s 1972 entry', () => {
  const html = uncommented(read('index.html'));
  const named = [...html.matchAll(/A personal computer for children of all ages/gi)];
  assert.ok(named.length >= 3, `the paper is named where it is quoted and in the timeline (${named.length})`);
  const unlinked = named.filter((m) => { const a = anchorAround(html, m.index); return !a || !a.includes(`href="${KAY_1972}"`) || !/target="_blank"/.test(a) || !/rel="noopener"/.test(a); });
  assert.deepEqual(unlinked.map((m) => html.slice(Math.max(0, m.index - 60), m.index + 50).replace(/\s+/g, ' ')), [], `each names it inside a link to ${KAY_1972}`);
  const timeline = html.match(/<div class="tl-title">DYNABOOK\b[\s\S]*?<div class="tl-author">([\s\S]*?)<\/div>/);
  assert.ok(timeline && timeline[1].includes(`href="${KAY_1972}"`), 'the timeline\'s DYNABOOK entry links the paper from its author line');
});

test('NOTICE credits the Dynabook drawings in place, beside the works by others the whitepaper shows — never under "Not confirmed"', () => {
  const unconfirmed = noticeSection(/^Not confirmed/);
  assert.ok(unconfirmed === null || !unconfirmed.includes(DYNABOOK), `${DYNABOOK} is no longer under "Not confirmed": its source is known`);
  const credited = noticeSection(/works by others/i);
  assert.ok(credited, 'NOTICE has a section of works by others the whitepaper shows');
  assert.ok(credited.includes(DYNABOOK), `that section names ${DYNABOOK}`);
  const said = credited.replace(/\s+/g, ' ');
  assert.match(said, /Alan C\. Kay/, 'whose drawings they are');
  assert.match(said, /A Personal Computer for Children of All Ages/, 'the paper they come from');
  assert.ok(said.includes(KAY_1972), `its address, ${KAY_1972}`);
  assert.match(said, /neither LICENSE nor CC BY 4\.0/, 'that neither license covers them');
  assert.match(said, /commentary/, 'why the whitepaper shows them');
  assert.match(read('NOTICE'), /Words and works by others that it quotes or cites\s+stay theirs\./, 'NOTICE keeps its sentence that works by others stay theirs');
});

// ---- The source, offered (AGPL-3.0 §13; John's decision, 2 Oct 2026) ----------------------------------------------

/** 17-boards.js, loaded as its own test loads it: source inside a function body — the pure half of the boards. */
function boards() {
  const src = read('Demos/surface/17-boards.js');
  const names = ['SOURCE_URL', 'sourceLine'];
  return new Function(src + '\n  return { ' + names.map((n) => n + ': typeof ' + n + " === 'undefined' ? undefined : " + n).join(', ') + ' };')();
}
/** The address of the license beside the source: LICENSE at the repository's root, on the branch GitHub shows. */
const licenseOf = (url) => url + '/blob/master/LICENSE';

test('the app\'s help pane offers the source and names the AGPL-3.0 — built from one constant, the repository the rights documents send people to', () => {
  const { SOURCE_URL, sourceLine } = boards();
  assert.equal(typeof SOURCE_URL, 'string', '17-boards.js holds the source\'s address in one constant, SOURCE_URL');
  assert.match(SOURCE_URL, /^https:\/\/[^/]+\/[^/]+\/[^/]+$/, 'an address of a repository, with no trailing slash');
  for (const f of ['TRADEMARKS.md', 'CONTRIBUTING.md']) assert.ok(read(f).includes(SOURCE_URL + '/'), `${f} sends people to the same repository, ${SOURCE_URL}`);
  assert.equal(typeof sourceLine, 'function', '17-boards.js builds the line, sourceLine');
  const parts = sourceLine();
  assert.equal(parts.map((p) => p.text).join(''), 'Source code · AGPL-3.0');
  assert.equal(parts.find((p) => p.text === 'Source code').href, SOURCE_URL, 'Source code links the repository');
  assert.equal(parts.find((p) => p.text === 'AGPL-3.0').href, licenseOf(SOURCE_URL), 'AGPL-3.0 links the license in it');
  assert.ok(existsSync(join(root, 'LICENSE')), 'the license is LICENSE at the root');
  // The built surface is the fragments concatenated: the same constant, and the adapter that renders it.
  const built = read('Demos/session-engine.js');
  assert.ok(built.includes(`const SOURCE_URL = '${SOURCE_URL}';`), 'Demos/session-engine.js carries the same constant (node Demos/build-surface.mjs)');
  assert.match(built, /helpSource[\s\S]{0,400}sourceLine\(|sourceLine\([\s\S]{0,400}helpSource/, 'the adapter renders sourceLine() into #helpSource');
});

test('the line stands under the version in every help pane the app has — the old address, /app/, the release\'s standalone file — and in DynaInk3D\'s', async () => {
  const { SOURCE_URL } = boards();
  const under = /<div id="helpPanel" hidden><p class="hint" id="helpVersion"><\/p><p class="hint" id="helpSource"><\/p>/;
  for (const f of ['Demos/session-engine.html', 'app/index.html']) assert.match(read(f), under, `${f}: #helpSource right under #helpVersion (node scripts/build-app.mjs)`);
  const { standalone } = await import(pathToFileURL(join(root, 'Demos/build-standalone.mjs')).href);
  const file = standalone(join(root, 'Demos'));
  assert.match(file, under, 'the standalone file carries the line\'s place');
  assert.ok(file.includes(`const SOURCE_URL = '${SOURCE_URL}';`), 'and the constant it is built from');
  // DynaInk3D's help is markup of its own; its line names the same addresses.
  const help = (read('dynaink-3d/index.html').match(/<div id="help" hidden>([\s\S]*?)\n  <\/div>/) || [])[1] || '';
  const links = [...help.matchAll(/<a\b([^>]*)>([^<]*)<\/a>/g)].map((m) => ({ attrs: m[1], text: m[2] }));
  const source = links.find((l) => l.text === 'Source code');
  const license = links.find((l) => l.text === 'AGPL-3.0');
  assert.ok(source && source.attrs.includes(`href="${SOURCE_URL}"`), `DynaInk3D's help links its source, ${SOURCE_URL}`);
  assert.ok(license && license.attrs.includes(`href="${licenseOf(SOURCE_URL)}"`), 'and the license');
  for (const l of [source, license]) assert.ok(/target="_blank"/.test(l.attrs) && /rel="noopener"/.test(l.attrs), l.attrs);
});
