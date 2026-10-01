// Make the app at /app/ from the canvas's old address, and stamp the version into both.
//
//   node scripts/build-app.mjs            # writes what changed
//   node scripts/build-app.mjs --check    # exits 1 naming every file that drifted (CI)
//
// One app address (V1-PLAN.md §7 and §9 R7): /app/ on the Pages site is the
// board. It is a page that loads the surface from Demos/ with every path
// resolving, a manifest whose start and scope are the app, and a service
// worker whose scope covers it — so it installs, and opens with no network
// after one visit, at that address. Nothing in app/ is edited by hand:
//
//   app/index.html            Demos/session-engine.html, each file it asks for
//                             asked for from /app/ (../Demos/…), its manifest
//                             excepted — that one is the app's own
//   app/sw.js                 Demos/sw.js, byte for byte; where a copy stands
//                             decides its shell and its caches
//   app/manifest.webmanifest  Demos/manifest.webmanifest, starting and scoped
//                             at the app
//
// and the old address keeps its own three files, working as they always did.
//
// The version is the repository's VERSION file — one line, MAJOR.MINOR.PATCH
// with an optional pre-release — and this build stamps it where it is carried:
// the page's <meta name="metamedium-version"> (which the help pane says) and
// the workers' `const VERSION` (which names their caches, so a release is a new
// worker with a new cache). `scripts/release.mjs` bumps VERSION and runs this.

import { readFileSync, writeFileSync, mkdirSync, existsSync, realpathSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

/** MAJOR.MINOR.PATCH, an optional pre-release, no build metadata — semver 2.0's precedence without its `+`. */
const IDENT = '(?:0|[1-9]\\d*|\\d*[a-zA-Z-][0-9a-zA-Z-]*)';
export const VERSION_PATTERN = new RegExp(`^(0|[1-9]\\d*)\\.(0|[1-9]\\d*)\\.(0|[1-9]\\d*)(?:-(${IDENT}(?:\\.${IDENT})*))?$`);

const META = /<meta name="metamedium-version" content="[^"]*">/;
const WORKER_LINE = /^const VERSION = '[^']*';$/m;
const assertVersion = (v) => { if (!VERSION_PATTERN.test(v)) throw new Error(`"${v}" is not a version (MAJOR.MINOR.PATCH, an optional -pre-release)`); return v; };

/** The repository's version. */
export function readVersion(root) {
  const file = join(root, 'VERSION');
  if (!existsSync(file)) throw new Error('there is no VERSION at the repository root');
  return assertVersion(readFileSync(file, 'utf8').trim());
}

/** The page, saying `version`. */
export function stampPage(html, version) {
  assertVersion(version);
  if (!META.test(html)) throw new Error('the page has no <meta name="metamedium-version" content="…"> to stamp');
  return html.replace(META, `<meta name="metamedium-version" content="${version}">`);
}

/** The worker, its caches named for `version`. */
export function stampWorker(js, version) {
  assertVersion(version);
  if (!WORKER_LINE.test(js)) throw new Error("the worker has no line `const VERSION = '…';` to stamp");
  return js.replace(WORKER_LINE, `const VERSION = '${version}';`);
}

// Where the two pages stand, on any host: one folder below the site's root each.
const SITE = 'https://site.invalid/root/';
const OLD_PAGE = SITE + 'Demos/session-engine.html';
const APP_PAGE = SITE + 'app/';
/** The files the app has of its own, beside its page. */
const OWN = new Set(['manifest.webmanifest']);

/**
 * The app's page: the old address's, each file it asks for re-expressed so it
 * resolves from /app/ to the same file it resolves to from Demos/, except the
 * app's own manifest — and a line saying where it was made from.
 */
export function appPage(html) {
  const body = html.replace(/(\s(?:src|href)=")([^"]*)(")/g, (m, pre, ref, post) => {
    if (!ref || /^(?:[a-z][a-z0-9+.-]*:|\/|#|\?)/i.test(ref) || OWN.has(ref)) return m;
    const target = new URL(ref, OLD_PAGE);
    if (!target.href.startsWith(SITE)) return m;
    return pre + '../' + target.href.slice(SITE.length) + post;
  });
  const doctype = /^<!DOCTYPE html>\n/i;
  if (!doctype.test(body)) throw new Error('the page does not begin with <!DOCTYPE html>');
  return body.replace(doctype, (d) => d + '<!-- The app, at /app/ (V1-PLAN R7). Made from Demos/session-engine.html by scripts/build-app.mjs — edit that page, run the build. -->\n');
}

/**
 * The app's manifest: the old address's, starting and scoped at the app — its icons asked for from /app/
 * (`../Demos/icons/…`), since a manifest's icons are relative to the manifest, as the page's files are.
 */
export function appManifest(text) {
  const m = JSON.parse(text);
  const icons = (m.icons || []).map((ic) => (typeof ic.src === 'string' && !/^(?:[a-z][a-z0-9+.-]*:|\/)/i.test(ic.src) ? Object.assign({}, ic, { src: '../Demos/' + ic.src }) : ic));
  return JSON.stringify(Object.assign({}, m, { start_url: './', scope: './' }, m.icons ? { icons } : {}), null, 2) + '\n';
}

/**
 * Every file this build writes, as it would write it for `version` (VERSION's
 * by default): `{ path, text, changed }`, in a fixed order.
 */
export function make(root, { version } = {}) {
  const v = version ? assertVersion(version) : readVersion(root);
  const read = (p) => readFileSync(join(root, p), 'utf8');
  const page = stampPage(read('Demos/session-engine.html'), v);
  const worker = stampWorker(read('Demos/sw.js'), v);
  const out = [
    ['Demos/session-engine.html', page],
    ['Demos/sw.js', worker],
    ['app/index.html', appPage(page)],
    ['app/sw.js', worker],
    ['app/manifest.webmanifest', appManifest(read('Demos/manifest.webmanifest'))],
  ];
  return out.map(([path, text]) => {
    const file = join(root, path);
    return { path, text, changed: !existsSync(file) || readFileSync(file, 'utf8') !== text };
  });
}

/** Write what changed. */
export function write(root, files) {
  for (const f of files) {
    if (!f.changed) continue;
    mkdirSync(dirname(join(root, f.path)), { recursive: true });
    writeFileSync(join(root, f.path), f.text);
  }
}

function main() {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const check = process.argv.includes('--check');
  let files;
  try {
    files = make(root);
  } catch (err) {
    console.error('the app cannot be made: ' + (err.message || err));
    process.exit(1);
  }
  const drifted = files.filter((f) => f.changed).map((f) => f.path);
  if (check) {
    if (drifted.length) {
      console.error(`${drifted.join(', ')} ${drifted.length === 1 ? 'is' : 'are'} not the build of VERSION (${readVersion(root)}) and Demos/ — run: node scripts/build-app.mjs`);
      process.exit(1);
    }
    console.log(`app in sync (${readVersion(root)})`);
    return;
  }
  write(root, files);
  console.log(drifted.length ? `wrote ${drifted.join(', ')} (${readVersion(root)})` : `nothing to write (${readVersion(root)})`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(realpathSync(process.argv[1])).href) main();
