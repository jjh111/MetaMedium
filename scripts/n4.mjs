// RENAME-PLAN N4: dyna.ink becomes the address. Every change of address in the code and the pages,
// listed — and made, with --apply. The old address stays live; it is no longer the one named.
//
//   node scripts/n4.mjs            # list them, with where each stands and what it becomes (writes nothing)
//   node scripts/n4.mjs --apply    # make them, then say what to run and what is left by hand
//
// Not before dyna.ink answers: John's Cloudflare steps (cloudflare/README.md) bind dyna.ink and
// relay.dyna.ink first, and the deploy has run. Applied early, the whitepaper's social card, its
// canonical address and the 404's buttons would name a site that is not there.
//
// Each edit says how many places it expects, so a file that has drifted since this list was
// written is refused by name rather than half-changed; an edit already made is said and left.
// scripts/n4.test.mjs holds the list to the repository as it stands.

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');

/** The old home and the new one. */
export const OLD = 'https://jjh111.github.io/MetaMedium/';
export const NEW = 'https://dyna.ink/';

/**
 * The edits, in the order they are made: `find` (global) is what stands now, `to` its replacement,
 * `count` how many places it expects (or `min`, at least), `done` what the file holds once it is made.
 */
export const EDITS = [
  {
    file: 'index.html', what: "the whitepaper's social card and canonical address — absolute, on dyna.ink",
    find: /(<meta (?:property="og:(?:image|url)"|name="twitter:image") content="|<link rel="canonical" href=")https:\/\/jjh111\.github\.io\/MetaMedium\//g,
    to: '$1https://dyna.ink/', count: 4, done: /<link rel="canonical" href="https:\/\/dyna\.ink\/">/,
  },
  {
    file: 'index.html', what: '"Open it →", the storyboard as a board of your own — the app on the same site',
    find: /href="https:\/\/jjh111\.github\.io\/MetaMedium\/Demos\/session-engine\.html\?example=story"/g,
    to: 'href="app/?example=story"', count: 1, done: /href="app\/\?example=story"/,
  },
  {
    file: 'index.html', what: 'the reference surface — the app on the same site, said as dyna.ink/app/',
    find: /<a href="https:\/\/jjh111\.github\.io\/MetaMedium\/Demos\/session-engine\.html"([^>]*)>jjh111\.github\.io\/MetaMedium\/Demos\/session-engine\.html<\/a>/g,
    to: '<a href="app/"$1>dyna.ink/app/</a>', count: 1, done: />dyna\.ink\/app\/<\/a>/,
  },
  {
    file: 'index.html', what: 'every other link into the site — relative, so each home links its own copy',
    find: /href="https:\/\/jjh111\.github\.io\/MetaMedium\/([^"]*)"/g,
    to: 'href="$1"', min: 1, done: /^(?![\s\S]*href="https:\/\/jjh111\.github\.io\/MetaMedium\/)/,
  },
  {
    file: '404.html', what: "the 404's social card — absolute, on dyna.ink",
    find: /(<meta (?:property="og:image"|name="twitter:image") content=")https:\/\/jjh111\.github\.io\/MetaMedium\//g,
    to: '$1https://dyna.ink/', count: 2, done: /<meta property="og:image" content="https:\/\/dyna\.ink\//,
  },
  {
    file: '404.html', what: "the 404's way to the whitepaper and to the app — absolute on dyna.ink, since a 404 is served at any depth",
    find: /href="https:\/\/jjh111\.github\.io\/MetaMedium\/(app\/)?"/g,
    to: 'href="https://dyna.ink/$1"', count: 2, done: /href="https:\/\/dyna\.ink\/app\/"/,
  },
  {
    file: 'core/src/llm/provider.ts', what: "the app's address OpenRouter is told (HTTP-Referer)",
    find: /export const OPENROUTER_APP = \{ url: 'https:\/\/jjh111\.github\.io\/MetaMedium\/'/g,
    to: "export const OPENROUTER_APP = { url: 'https://dyna.ink/'", count: 1, done: /export const OPENROUTER_APP = \{ url: 'https:\/\/dyna\.ink\/'/,
  },
  {
    file: 'scripts/release.mjs', what: 'where a release says the app is served',
    find: /const app = pagesApp\(pushTo\);/g,
    to: "const app = 'https://dyna.ink/app/'; // RENAME-PLAN N4 (scripts/n4.mjs): dyna.ink is the address", count: 1,
    done: /const app = 'https:\/\/dyna\.ink\/app\/';/,
  },
  {
    file: 'Demos/surface/17-carry.js', what: "the old address's notice that dyna.ink is the new home — on (it shows on the old address only)",
    find: /const NEW_HOME_NOTICE = false;/g, to: 'const NEW_HOME_NOTICE = true;', count: 1, done: /const NEW_HOME_NOTICE = true;/,
  },
  {
    file: 'Demos/surface/17-carry.test.mjs', what: 'its test: the notice ships on',
    find: /assert\.equal\(C\.NEW_HOME_NOTICE, false, 'RENAME-PLAN N4 flips this, and nothing before it'\);/g,
    to: "assert.equal(C.NEW_HOME_NOTICE, true, 'RENAME-PLAN N4 turned it on');", count: 1, done: /assert\.equal\(C\.NEW_HOME_NOTICE, true,/,
  },
  {
    file: 'Demos/surface/17-carry.test.mjs', what: 'its test: as shipped, the old address shows it',
    find: /assert\.equal\(C\.homeNoticeShown\(OLD, C\.NEW_HOME_NOTICE\), false, 'as shipped: off'\);/g,
    to: "assert.equal(C.homeNoticeShown(OLD, C.NEW_HOME_NOTICE), true, 'as shipped since N4: on, at the old address');", count: 1,
    done: /homeNoticeShown\(OLD, C\.NEW_HOME_NOTICE\), true,/,
  },
];

/** What is left by hand once the edits are made: documents, a film, and John's checks. */
export const BY_HAND = [
  "README.md's links, CHANGELOG.md's header line and CLAUDE.md's \"published at\" name the old address",
  'the launch film\'s end card reads jjh111.github.io/MetaMedium/app: render it again with url=dyna.ink/app (node launch-video/render.mjs) and remake the two web copies (launch-video/README.md)',
  "John's N4 checks on an iPad: install from dyna.ink/app/, open it offline, and carry the boards from the old address (QA-v1.md)",
];

/** Then run, in this order, and commit what they write with the edits. */
export const THEN = [
  'cd core && npm run typecheck && npm test && npm run build:browser && npm run build:node && cp dist/dynaink-core.browser.js dist/dynaink-core.node.mjs ../Demos/',
  'node Demos/build-surface.mjs',
  'node --test Demos/surface/17-carry.test.mjs scripts/release.test.mjs scripts/n4.test.mjs cloudflare/site.test.mjs',
  'node e2e/run.mjs canvas app prod carry',
];

const lineOf = (text, at) => text.slice(0, at).split('\n').length;

/**
 * Each edit as it stands in `repo`, in order, each read on the text the edits before it leave:
 * `state` is 'pending' (to make: the places it expects are there), 'applied' (made: none left, and
 * the file holds what it becomes) or 'drifted' (neither — the file changed since this list was
 * written), with the places and what each becomes. `texts` is every file as the pending edits leave it.
 */
export function plan(repo = root) {
  const texts = {};
  const rows = EDITS.map((e) => {
    if (texts[e.file] === undefined) texts[e.file] = readFileSync(join(repo, e.file), 'utf8');
    const text = texts[e.file];
    const places = [...text.matchAll(new RegExp(e.find.source, 'g'))].map((m) => ({ line: lineOf(text, m.index), before: m[0], after: m[0].replace(new RegExp(e.find.source), e.to) }));
    const enough = e.count !== undefined ? places.length === e.count : places.length >= e.min;
    const state = places.length && enough ? 'pending' : !places.length && e.done.test(text) ? 'applied' : 'drifted';
    if (state === 'pending') texts[e.file] = text.replace(e.find, e.to);
    const expected = e.count !== undefined ? `${e.count}` : `at least ${e.min}`;
    return { file: e.file, what: e.what, state, places, why: state === 'drifted' ? `${e.file}: expected ${expected} place${e.count === 1 ? '' : 's'} for “${e.what}”, found ${places.length} — the file changed since this list was written; look at it, and mend the list (scripts/n4.mjs)` : null };
  });
  return { rows, texts };
}

/** Make every pending edit in `repo`: refused, writing nothing, when any has drifted. Returns the files written. */
export function apply(repo = root) {
  const { rows, texts } = plan(repo);
  const drifted = rows.filter((r) => r.state === 'drifted');
  if (drifted.length) throw new Error('nothing was changed:\n' + drifted.map((r) => '  - ' + r.why).join('\n'));
  const written = [...new Set(rows.filter((r) => r.state === 'pending').map((r) => r.file))];
  for (const f of written) writeFileSync(join(repo, f), texts[f]);
  return written;
}

function main(argv) {
  const unknown = argv.find((a) => a !== '--apply' && a !== '--dry-run');
  if (unknown) { console.error(`unknown option ${unknown}\nusage: node scripts/n4.mjs [--apply]`); process.exit(2); }
  const { rows } = plan(root);
  if (!argv.includes('--apply')) {
    console.log(`RENAME-PLAN N4 — dyna.ink becomes the address: ${OLD} → ${NEW}. A list; nothing is written (--apply makes them).\n`);
    for (const r of rows) {
      console.log(`${r.state === 'pending' ? '·' : r.state === 'applied' ? '✓' : '✗'} ${r.file} — ${r.what}${r.state === 'applied' ? ' (made)' : ''}`);
      if (r.state === 'drifted') console.log(`    ${r.why}`);
      for (const p of r.places) console.log(`    ${r.file}:${p.line}\n      ${p.before.trim()}\n    → ${p.after.trim()}`);
    }
    console.log(`\nThen run:\n${THEN.map((t) => '  ' + t).join('\n')}\n\nBy hand:\n${BY_HAND.map((t) => '  - ' + t).join('\n')}`);
    const drifted = rows.filter((r) => r.state === 'drifted');
    if (drifted.length) { console.error(`\n${drifted.length} edit(s) no longer apply — --apply would refuse.`); process.exit(1); }
    return;
  }
  let written;
  try { written = apply(root); } catch (err) { console.error(`N4 refused — ${err.message || err}`); process.exit(1); }
  console.log(written.length ? `N4: wrote ${written.join(', ')}.` : 'N4: every edit was already made; nothing written.');
  console.log(`\nNow run, and commit what they write with the edits:\n${THEN.map((t) => '  ' + t).join('\n')}\n\nBy hand:\n${BY_HAND.map((t) => '  - ' + t).join('\n')}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main(process.argv.slice(2));
