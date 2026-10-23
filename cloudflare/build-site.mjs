// The site Cloudflare Pages publishes at dyna.ink: the repository as it is committed — so every
// address the whitepaper, 404.html and the README link keeps answering — less what a browser on
// the product's site never asks for (the tests, the CI, the plans, the engine's source, the pages
// that cannot run there), plus the files Pages reads, `_headers` (made from
// cloudflare/pages/headers.template and csp.txt) and `_redirects`, and a `robots.txt`.
//
//   node cloudflare/build-site.mjs                    # writes cloudflare/dist/
//   node cloudflare/build-site.mjs --commit <sha>     # …and names the commit in the app's pages
//   wrangler pages deploy cloudflare/dist --project-name dyna-ink
//
// Only files git tracks are copied, so a key in an untracked .env, a model's weights or a stray
// build can never be published by this; node_modules is never tracked, and is left out whatever
// a mistake commits. GitHub Pages still publishes the whole repository at the old address; this
// is the product's site, and `whyLeftOut` says, for each file, why it is not on it. A site test
// (cloudflare/site.test.mjs) asks what is in and what is not, and the gate's `prod` scenario
// (e2e/prod.mjs) serves this very build with its headers and runs the app under them.

import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, rmSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');

/** Top-level folders that are not on the site, each with why. */
const FOLDERS = {
  // The repository's working parts.
  cloudflare: 'the deploy itself',
  e2e: 'the browser gate',
  scripts: 'the build and release scripts',
  'gliner-seat': 'an experiment parked with its answer, whose weights are never committed',
  // Pages that cannot run as published: each loads its TypeScript through a dev server
  // (dynaink-3d/index.html asks for ./src/main.ts; the shard beside the app, R9, is not built).
  'dynaink-3d': 'a page that loads its TypeScript through a dev server, and cannot run as published',
  'Web App Skeleton': 'a page that loads its TypeScript through a dev server, and cannot run as published',
  'lens-canvas': 'a page that loads its TypeScript through a dev server, and cannot run as published',
  // Source and tooling no page asks for: the pages load the engine's committed bundles in Demos/.
  core: "the engine's source and tests — the pages load its bundles from Demos/",
  skills: "Claude Code's skills",
  'manim-explainer': "an explainer video's sources",
};

/** Documents at the root that are the site's: the help pane's page, the changelog, the rights. The rest are the plans and reviews, read on GitHub. */
export const ROOT_DOCS = ['README.md', 'HELP.md', 'CHANGELOG.md', 'CONTRIBUTING.md', 'TRADEMARKS.md'];

/** Folders left out, by name (kept under this name for what reads it). */
export const LEFT_OUT = ['.git', '.github', '.claude', ...Object.keys(FOLDERS)];

/**
 * Why a tracked file is not on the product's site — a sentence — or null when it is.
 * `f` is relative to the repository's root, `/`-separated.
 */
export function whyLeftOut(f) {
  const parts = f.split('/');
  const base = parts[parts.length - 1];
  if (parts.includes('node_modules')) return 'an installed package';
  if (/^\.env(\.|$)/.test(base)) return "a key's file";
  if (parts.some((p) => p.startsWith('.'))) return "the repository's own configuration (a dot-file)";
  if (parts.length > 1 && FOLDERS[parts[0]]) return FOLDERS[parts[0]];
  if (/\.(?:test|smoke|conformance)\.[cm]?[jt]sx?$/.test(base) || base === 'mcp-smoke.mjs' || /\.e2e\.js$/.test(base)) return 'a test';
  if (parts.length === 1 && /^test-.*\.html$/.test(base)) return "a developer's harness page";
  if (parts.length === 1 && /\.md$/.test(base) && !ROOT_DOCS.includes(base)) return "a plan, a review or a guide — the repository's, read on GitHub";
  return null;
}

/** The files the site is made of, relative to the repository root, `/`-separated, sorted. */
export function siteFiles(repo = root) {
  const tracked = execFileSync('git', ['ls-files', '-z'], { cwd: repo, maxBuffer: 1 << 28 }).toString('utf8').split('\0').filter(Boolean);
  return tracked
    .filter((f) => !whyLeftOut(f))
    .filter((f) => existsSync(path.join(repo, f)))
    .sort();
}

/** The app's policy, pages/csp.txt: one line, one home. */
export function appPolicy() {
  return readFileSync(path.join(here, 'pages', 'csp.txt'), 'utf8').trim();
}

/** The `_headers` file: the template with the app's policy (pages/csp.txt) put in. */
export function headersText() {
  return readFileSync(path.join(here, 'pages', 'headers.template'), 'utf8').replaceAll('{{APP_CSP}}', appPolicy());
}

// ===== _headers, read as Pages reads it ===============================================
// The same rules Cloudflare's asset server applies (workers-shared's parseHeaders and
// attachCustomHeaders, which Pages shares): a line beginning with `/` starts a rule; under it
// `Name: value` sets a header (names lower-cased, the same name twice in a rule joined with ", ")
// and `! Name` takes away what an earlier rule set. Every rule whose path matches applies, in the
// file's order: its takings-away first, then its headers — the first rule to set a name replaces
// what the asset carried, a later one appends to it, joined with ", ". `*` matches anything, `:name`
// one segment. The site test and the gate's `prod` scenario both read the file through these.

/** `_headers` as rules: `{ path, set: { name: value }, unset: [name] }`, in the file's order. */
export function headerRules(text) {
  const rules = [];
  for (const raw of String(text).split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    if (/^([^\s]+:\/\/|\/)/.test(line)) { rules.push({ path: line, set: {}, unset: [] }); continue; }
    const rule = rules[rules.length - 1];
    if (!rule) throw new Error(`_headers: a header before any path: ${line}`);
    if (!line.includes(':')) {
      if (!line.startsWith('! ')) throw new Error(`_headers: neither a header nor "! Name": ${line}`);
      rule.unset.push(line.slice(2).trim().toLowerCase());
      continue;
    }
    const i = line.indexOf(':');
    const name = line.slice(0, i).trim().toLowerCase();
    const value = line.slice(i + 1).trim();
    if (!name || !value || name.includes(' ')) throw new Error(`_headers: not a header Pages takes: ${line}`);
    rule.set[name] = rule.set[name] ? `${rule.set[name]}, ${value}` : value;
  }
  return rules;
}

/** Whether a rule's path matches a request's pathname, as Pages matches it. */
export function ruleMatches(rulePath, pathname) {
  const esc = (s) => s.replace(/[-/\\^$*+?.()|[\]{}]/g, '\\$&');
  let re = rulePath.split('*').map(esc).join('(?<splat>.*)');
  re = re.replace(/:([A-Za-z]\w*)/g, (_, name) => `(?<${name}>[^/]+)`);
  return new RegExp('^' + re + '$').test(pathname);
}

/** The headers a response for `pathname` carries once the rules are applied over `base` (an object of the asset's own): a Map, names lower-cased. */
export function headersFor(rules, pathname, base = {}) {
  const out = new Map(Object.entries(base).map(([k, v]) => [k.toLowerCase(), v]));
  const set = new Set();
  for (const r of rules) {
    if (!ruleMatches(r.path, pathname)) continue;
    for (const k of r.unset) out.delete(k);
    for (const [k, v] of Object.entries(r.set)) {
      if (set.has(k)) out.set(k, out.has(k) ? `${out.get(k)}, ${v}` : v);
      else { out.set(k, v); set.add(k); }
    }
  }
  return out;
}

// ===== the app's pages: its policy carried in the page, and the commit named ===========

/** The app's pages, at its address and at its old one: each carries the app's policy in itself, and names the deployed commit. */
export const STAMPED = ['app/index.html', 'Demos/session-engine.html'];

/** What a browser ignores in a policy a page carries in a <meta> (and says so in the console): these stay the header's. */
const NOT_IN_META = ['frame-ancestors', 'report-uri', 'report-to', 'sandbox'];

/** The app's policy as a page carries it in a <meta>: csp.txt, less what a <meta> cannot say. */
export function metaPolicy(csp = appPolicy()) {
  return csp.split(';').map((d) => d.trim()).filter((d) => d && !NOT_IN_META.includes(d.split(/\s+/)[0].toLowerCase())).join('; ');
}

/**
 * A page that carries the app's policy in itself — `<meta http-equiv="Content-Security-Policy">`
 * right after its charset, before anything it loads — so the policy holds at whatever address the
 * page is served. `_headers` matches its rules against the path as it was asked for, still encoded,
 * while Pages finds the file with the path decoded and its slashes merged: /ap%70/, //app/ and
 * /Demos//session-engine are this page under the floor alone, which says nothing of scripts or
 * connections — and the app opens a room on any relay its address names. With the policy in the
 * page, a relay csp.txt does not name is refused there too, and so are its frames (a frame made from
 * the page inherits every policy it has). Where a header sends the same policy, both are enforced
 * and say the same. Written into the built site only; the frame-ancestors the header keeps.
 */
export function withPolicy(html, csp = appPolicy()) {
  const said = metaPolicy(csp).replace(/&/g, '&amp;').replace(/"/g, '&quot;');
  const tag = `<meta http-equiv="Content-Security-Policy" content="${said}">`;
  if (/<meta http-equiv="Content-Security-Policy"[^>]*>/i.test(html)) return html.replace(/<meta http-equiv="Content-Security-Policy"[^>]*>/i, tag);
  const m = /^([ \t]*)<meta charset="[^"]*">[^\n]*\n/im.exec(html);
  if (!m) throw new Error('the page has no <meta charset> to carry the policy after');
  const head = html.slice(0, m.index);
  if (/<(?:script|link|style|base)\b/i.test(head.replace(/<!--[\s\S]*?-->/g, ''))) throw new Error('the page loads something before its charset, which the policy would not cover');
  return html.slice(0, m.index + m[0].length) + m[1] + tag + '\n' + html.slice(m.index + m[0].length);
}

/**
 * A page with `<meta name="dynaink-commit" content="<sha>">` beside its version: the commit this
 * site was built from, so a report from dyna.ink names what it ran. Written into the built site
 * only, never into the repository. Refuses anything but a commit's hex name, and a page with no
 * version tag to stand beside.
 */
export function stampCommit(html, commit) {
  if (!/^[0-9a-f]{7,40}$/.test(String(commit))) throw new Error(`"${commit}" is not a commit's name — 7 to 40 lower-case hex digits`);
  const tag = `<meta name="dynaink-commit" content="${commit}">`;
  if (/<meta name="dynaink-commit"[^>]*>/.test(html)) return html.replace(/<meta name="dynaink-commit"[^>]*>/, tag);
  const m = /^([ \t]*)<meta name="dynaink-version"[^>]*>[^\n]*\n/m.exec(html);
  if (!m) throw new Error('the page has no <meta name="dynaink-version"> to name the commit beside');
  return html.slice(0, m.index + m[0].length) + m[1] + tag + '\n' + html.slice(m.index + m[0].length);
}

// ===== the build ========================================================================

/**
 * Write the site into `out` (emptied first), with the Pages files and robots.txt; returns the
 * files written. The app's pages (STAMPED) carry its policy in `out`; `commit`, the commit's hex
 * name, is stamped into them there too. Nothing is written into the repository.
 */
export function buildSite({ repo = root, out = path.join(here, 'dist'), commit = null } = {}) {
  if (commit !== null) stampCommit('<meta name="dynaink-version">\n', commit); // refuse a bad name before anything is written
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  const files = siteFiles(repo);
  for (const f of files) {
    mkdirSync(path.dirname(path.join(out, f)), { recursive: true });
    cpSync(path.join(repo, f), path.join(out, f));
  }
  const csp = appPolicy();
  for (const f of STAMPED) {
    const at = path.join(out, f);
    const page = withPolicy(readFileSync(at, 'utf8'), csp);
    writeFileSync(at, commit !== null ? stampCommit(page, commit) : page);
  }
  writeFileSync(path.join(out, '_headers'), headersText());
  cpSync(path.join(here, 'pages', '_redirects'), path.join(out, '_redirects'));
  cpSync(path.join(here, 'pages', 'robots.txt'), path.join(out, 'robots.txt'));
  return files.concat(['_headers', '_redirects', 'robots.txt']);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const at = args.findIndex((a) => a === '--commit' || a.startsWith('--commit='));
  const commit = at < 0 ? null : args[at].includes('=') ? args[at].slice('--commit='.length) : args[at + 1];
  if (at >= 0 && !commit) { console.error("--commit needs the commit's name"); process.exit(2); }
  try {
    const files = buildSite({ commit });
    console.log(`site: ${files.length} files in cloudflare/dist (${readFileSync(path.join(root, 'VERSION'), 'utf8').trim()}${commit ? `, commit ${commit}` : ''})`);
  } catch (err) {
    console.error(`the site was not built: ${err.message || err}`);
    process.exit(1);
  }
}
