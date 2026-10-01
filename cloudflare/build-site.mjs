// The site Cloudflare Pages publishes: what GitHub Pages publishes — the repository as it is
// committed, so every address the whitepaper, 404.html and the README link keeps answering — less
// what is not a page (the tests, the CI, the model seat's tooling, this folder), plus the two files
// Pages reads, `_headers` (made from cloudflare/pages/headers.template and csp.txt) and `_redirects`.
//
//   node cloudflare/build-site.mjs            # writes cloudflare/dist/
//   wrangler pages deploy cloudflare/dist --project-name dyna-ink
//
// Only files git tracks are copied, so a key in an untracked .env, a model's weights or a stray
// build can never be published by this; node_modules is never tracked, and is left out whatever
// a mistake commits. A site test (cloudflare/site.test.mjs) asks what is in and what is not.

import { execFileSync } from 'node:child_process';
import { cpSync, mkdirSync, rmSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');

/** Folders that are the repository's working parts, not the site's pages. */
export const LEFT_OUT = ['.git', '.github', '.claude', 'cloudflare', 'e2e', 'gliner-seat', 'scripts'];

/** The files the site is made of, relative to the repository root, `/`-separated, sorted. */
export function siteFiles(repo = root) {
  const tracked = execFileSync('git', ['ls-files', '-z'], { cwd: repo, maxBuffer: 1 << 28 }).toString('utf8').split('\0').filter(Boolean);
  return tracked
    .filter((f) => !LEFT_OUT.some((d) => f === d || f.startsWith(d + '/')))
    .filter((f) => !f.split('/').includes('node_modules'))
    .filter((f) => !/^\.env(\.|$)/.test(path.basename(f)))   // a key's file, even if one were committed
    .filter((f) => existsSync(path.join(repo, f)))
    .sort();
}

/** The `_headers` file: the template with the app's policy (pages/csp.txt) put in. */
export function headersText() {
  const csp = readFileSync(path.join(here, 'pages', 'csp.txt'), 'utf8').trim();
  return readFileSync(path.join(here, 'pages', 'headers.template'), 'utf8').replaceAll('{{APP_CSP}}', csp);
}

/** Write the site into `out` (emptied first), with the Pages files; returns the files written. */
export function buildSite({ repo = root, out = path.join(here, 'dist') } = {}) {
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  const files = siteFiles(repo);
  for (const f of files) {
    mkdirSync(path.dirname(path.join(out, f)), { recursive: true });
    cpSync(path.join(repo, f), path.join(out, f));
  }
  writeFileSync(path.join(out, '_headers'), headersText());
  cpSync(path.join(here, 'pages', '_redirects'), path.join(out, '_redirects'));
  return files.concat(['_headers', '_redirects']);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const files = buildSite();
  console.log(`site: ${files.length} files in cloudflare/dist (${readFileSync(path.join(root, 'VERSION'), 'utf8').trim()})`);
}
