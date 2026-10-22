// Every address into the site that the whitepaper, its 404 page and the README give — the oracle
// that says a published address still answers. Pure Node, no browser: the gate's `app` scenario
// asks each of them of the repository served as GitHub Pages serves it, the `prod` scenario asks
// them of the site Cloudflare Pages publishes (cloudflare/build-site.mjs) served as Pages serves
// it, and cloudflare/site.test.mjs asks that the site holds a file for each.
//
// An address counts wherever it stands: each relative href and src, and each absolute address
// under one of the site's homes — the old one on GitHub Pages and dyna.ink — in a link, a social
// card's image or the root; with a replay's recording beside the page that plays it.

import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');

/** The site's homes: an absolute address under one of them is an address into the site. */
export const SITE_URLS = ['https://jjh111.github.io/MetaMedium/', 'https://dyna.ink/'];
/** The documents whose links are the published addresses. */
export const LINKING = ['index.html', '404.html', 'README.md'];

/** Every published address, relative to the site's root (a query kept, a fragment dropped). */
export function publishedLinks(repo = root) {
  const out = new Set();
  const add = (path) => {
    out.add(path);
    const replay = /^Demos\/[^?]+\?(?:.*&)?replay=([^&]+)/.exec(path);
    if (replay) out.add('Demos/' + decodeURIComponent(replay[1]));
  };
  const escape = (s) => s.replace(/[.*+?^${}()|[\]\\/]/g, '\\$&');
  for (const f of LINKING) {
    const text = readFileSync(join(repo, f), 'utf8').replace(/&amp;/g, '&');
    for (const site of SITE_URLS) {
      for (const m of text.matchAll(new RegExp(escape(site) + `[^"'\\s)<>]*`, 'g'))) add(m[0].slice(site.length).split('#')[0]);
    }
    for (const m of text.matchAll(/\s(?:href|src)="([^"]+)"/g)) {
      const u = m[1];
      if (/^(?:[a-z][a-z0-9+.-]*:|\/\/|#|\/)/i.test(u)) continue;
      const path = u.split('#')[0];
      if (path) add(path);
    }
  }
  // And the address the whitepaper had before v5, kept as a redirect stub (CLAUDE.md: keep it).
  add('MetaMedium_Whitepaper_v4.html');
  return [...out];
}

/**
 * The file a published address is answered from, relative to the site's root, `/`-separated —
 * a folder's index.html, a page with or without its .html — or the candidates, for a caller that
 * asks which one exists: `[exact, exact + '.html', exact + '/index.html']`, the query and any
 * `./` taken off and the path decoded.
 */
export function fileCandidates(address) {
  let p = decodeURIComponent(String(address).split('?')[0]).replace(/^(\.\/)+/, '');
  if (p === '' || p.endsWith('/')) return [p + 'index.html'];
  return [p, p + '.html', p + '/index.html'];
}
