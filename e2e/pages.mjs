// The site as Cloudflare Pages serves it, on a free port of 127.0.0.1 — for the gate's `prod`
// scenario (prod.mjs), which runs the app under the headers dyna.ink sends.
//
// What Pages does that a plain static server does not, and so what this does:
//   - `_headers`, read and applied by cloudflare/build-site.mjs's headerRules and headersFor —
//     every matching rule in the file's order, a header set again joined with ", ", `! Name`
//     taking one away — on every response, by the path asked for;
//   - `_redirects` (exact paths, and one `*` with :splat), the query kept, before any file;
//   - a page without its .html: /x serves x.html, /x.html and /x/index.html are sent with a 308
//     to /x and /x/, a folder asked for without its slash is sent to it — the query kept —
//     exactly when the address it is sent to is answered by the same file (workers-shared's
//     "auto-trailing-slash", which is what Pages does by default);
//   - a missing file is the nearest 404.html, with a 404 and `no-store`;
//   - Pages' own Cache-Control on a file, `public, max-age=0, must-revalidate`, unless a rule says otherwise.
// Checked against `wrangler pages dev` (4.146) over the same build: every status, location and
// header the scenario reads agreed on two dozen paths, `! Name` included.
//
// What it does not: ETags, ranges, compression, the edge's own headers. `stop()` closes it, so a
// page that has been here once finds its worker's cache and no server, as a phone with no signal
// does.

import { createServer } from 'node:http';
import { createReadStream, statSync, existsSync, readFileSync } from 'node:fs';
import { join, extname, resolve, sep } from 'node:path';
import { headerRules, headersFor } from '../cloudflare/build-site.mjs';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'application/javascript',
  '.mjs': 'application/javascript',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json',
  '.jsonl': 'application/octet-stream',
  '.webmanifest': 'application/manifest+json',
  '.md': 'text/markdown; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.wasm': 'application/wasm',
};
const PAGES_CACHE = 'public, max-age=0, must-revalidate';

/** `_redirects` as rules: `{ from, to, status }`. */
function redirectRules(text) {
  const out = [];
  for (const raw of String(text).split('\n')) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const [from, to, status] = line.split(/\s+/);
    out.push({ from, to, status: Number(status || 302) });
  }
  return out;
}
function redirectFor(rules, pathname) {
  for (const r of rules) {
    if (!r.from.includes('*')) { if (r.from === pathname) return { to: r.to, status: r.status }; continue; }
    const [head, tail] = r.from.split('*');
    if (pathname.startsWith(head) && pathname.endsWith(tail) && pathname.length >= head.length + tail.length) {
      return { to: r.to.replace(':splat', pathname.slice(head.length, pathname.length - tail.length)), status: r.status };
    }
  }
  return null;
}

/**
 * Serve `dir` — a built site (cloudflare/build-site.mjs) — as Pages does. `transformHeaders`
 * rewrites the `_headers` text before it is read: how the scenario's control serves a broken
 * policy without touching the build.
 */
export async function startPages(dir, { transformHeaders = (t) => t } = {}) {
  const base = resolve(dir);
  const rules = headerRules(transformHeaders(readFileSync(join(base, '_headers'), 'utf8')));
  const redirects = existsSync(join(base, '_redirects')) ? redirectRules(readFileSync(join(base, '_redirects'), 'utf8')) : [];
  const log = [];

  const fileAt = (p) => {
    const f = resolve(base, '.' + p);
    if (f !== base && !f.startsWith(base + sep)) return null;
    try { return statSync(f).isFile() ? f : null; } catch { return null; }
  };
  const isFile = (p) => !!fileAt(p);
  // workers-shared's htmlHandlingAutoTrailingSlash, with its safeRedirect: a redirect only to an
  // address that would be answered by the same file. Returns { asset } (a path), { redirect } or null.
  function intentOf(p, skip = false) {
    const safe = (file, dest) => {
      if (skip || isFile(dest)) return null;
      const i = intentOf(dest, true);
      return i && i.asset === file && isFile(file) ? { redirect: dest } : null;
    };
    let r;
    const exact = isFile(p) ? { asset: p } : null;
    if (p.endsWith('/index')) {
      if (exact) return exact;
      if ((r = safe(p + '.html', p.slice(0, -5)))) return r;
      if ((r = safe(p.slice(0, -6) + '.html', p.slice(0, -6)))) return r;
    } else if (p.endsWith('/index.html')) {
      if ((r = safe(p, p.slice(0, -10)))) return r;
      if ((r = safe(p.slice(0, -11) + '.html', p.slice(0, -11)))) return r;
    } else if (p.endsWith('/')) {
      if (isFile(p + 'index.html')) return { asset: p + 'index.html' };
      if ((r = safe(p.slice(0, -1) + '.html', p.slice(0, -1)))) return r;
    } else if (p.endsWith('.html')) {
      if ((r = safe(p, p.slice(0, -5)))) return r;
      if ((r = safe(p.slice(0, -5) + '/index.html', p.slice(0, -5) + '/'))) return r;
    }
    if (exact) return exact;
    if (isFile(p + '.html')) return { asset: p + '.html' };
    if ((r = safe(p + '/index.html', p + '/'))) return r;
    return null;
  }
  const notFoundPage = (p) => {
    const parts = p.split('/').slice(0, -1);
    for (let i = parts.length; i >= 1; i--) { const at = parts.slice(0, i).join('/') + '/404.html'; if (isFile(at)) return at; }
    return null;
  };
  const encodePath = (p) => p.split('/').map(encodeURIComponent).join('/');

  const server = createServer((req, res) => {
    let url, pathname;
    try {
      url = new URL(req.url, 'http://127.0.0.1');
      pathname = url.pathname.split('/').map((s) => { try { return decodeURIComponent(s); } catch { return s; } }).join('/').replace(/\/+/g, '/');
    } catch { res.writeHead(400).end('bad address'); return; }
    const send = (status, headers, file) => {
      const h = headersFor(rules, url.pathname, headers);
      res.writeHead(status, Object.fromEntries(h));
      log.push(`${req.method} ${url.pathname}${url.search} ${status}`);
      if (req.method === 'HEAD' || !file) { res.end(); return; }
      createReadStream(file).pipe(res);
    };
    if (req.method !== 'GET' && req.method !== 'HEAD') { send(405, { 'content-type': 'text/plain; charset=utf-8' }); return; }
    const red = redirectFor(redirects, pathname);
    if (red) {
      const to = new URL(red.to, url);
      const location = to.origin === url.origin ? `${to.pathname}${to.search || url.search}${to.hash}` : `${to.href}${to.search ? '' : url.search}`;
      send(red.status, { location });
      return;
    }
    const intent = intentOf(pathname);
    if (intent && intent.redirect !== undefined) { send(308, { location: encodePath(intent.redirect) + url.search }); return; }
    if (intent && intent.asset) {
      const file = fileAt(intent.asset);
      send(200, { 'content-type': TYPES[extname(file).toLowerCase()] || 'application/octet-stream', 'cache-control': PAGES_CACHE }, file);
      return;
    }
    const page = notFoundPage(pathname);
    if (page) send(404, { 'content-type': TYPES['.html'], 'cache-control': 'no-store' }, fileAt(page));
    else send(404, { 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'no-store' });
  });
  await new Promise((ok, fail) => { server.once('error', fail); server.listen(0, '127.0.0.1', ok); });
  const port = server.address().port;
  const sockets = new Set();
  server.on('connection', (s) => { sockets.add(s); s.on('close', () => sockets.delete(s)); });
  return {
    origin: `http://127.0.0.1:${port}`,
    port,
    log: () => log.slice(),
    // Closed for good: every open socket is dropped too, so a page cannot be answered on a connection it kept alive.
    stop: () => new Promise((ok) => { server.close(() => ok()); for (const s of sockets) s.destroy(); }),
  };
}
