// MetaMedium's service worker: the shell works offline, at both addresses.
//
// One worker, two addresses (V1-PLAN R7): the app at /app/ — v1's address —
// and the canvas's old one, Demos/session-engine.html, which keeps working as
// it always has. This file is the worker at the old address, and
// `node scripts/build-app.mjs` copies it to app/sw.js, stamping VERSION (the
// repository's VERSION file) into both; where a copy stands decides its shell
// and its caches. Edit this one, run the build, commit both.
//
// The shell is a few files — the page, its manifest, the surface's script and
// style, the engine bundle — cached on install, so the board opens with no
// network after one visit and the page installs as an app (ARCHITECTURE-v8
// §18). Every request is network-first with the cache as the fallback: a fresh
// build shows on the next reload, and nothing is served stale while the
// network is there.
//
// The cache is named for the release. A release changes these bytes, so the
// browser installs the new worker on its first network fetch after it; the new
// worker keeps the new shell whole, then drops the old release's cache. It
// drops only its own: caches belong to the origin, which every page under it
// shares — the other address, and every project on the same github.io host.
const VERSION = '0.0.0';
const AT_APP = /\/app\/sw\.js$/.test(self.location.pathname);
const PREFIX = AT_APP ? 'mm-app-' : 'mm-shell-';
const CACHE = PREFIX + VERSION;
// Both addresses stand one folder below the site's root, so the surface's files are ../Demos/… from either.
const SHELL = [
  AT_APP ? './' : './session-engine.html',
  './manifest.webmanifest',
  '../Demos/session-engine.js',
  '../Demos/surface/surface.css',
  '../Demos/metamedium-core.browser.js',
];
// The help pane's text: kept for offline when it answers, never the reason a shell is not kept.
const EXTRA = ['../QA-v8.md'];

// `reload`: the release's own files, never a copy the browser's HTTP cache still holds.
const fresh = (u) => new Request(u, { cache: 'reload' });

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE)
    .then((c) => c.addAll(SHELL.map(fresh)).then(() => Promise.all(EXTRA.map((u) => c.add(fresh(u)).catch(() => {})))))
    .then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys()
    .then((keys) => Promise.all(keys.filter((k) => k.startsWith(PREFIX) && k !== CACHE).map((k) => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  // A key never enters a cache: a request that carries one is the network's alone. So is a relay's stream, which never ends.
  if (req.headers.has('authorization') || (req.headers.get('accept') || '').includes('text/event-stream')) return;
  // A page is kept once, whatever its query: ?board=, ?live=, ?fresh= are the page's to read, not the cache's to split on.
  const key = req.mode === 'navigate' ? url.origin + url.pathname.replace(/\/index\.html$/, '/') : req;
  // `no-cache` revalidates with the server every time, so a fresh build is never hidden behind the browser's own HTTP cache.
  e.respondWith(fetch(req, { cache: 'no-cache' }).then((res) => {
    if (res.ok) {
      const copy = res.clone();
      e.waitUntil(caches.open(CACHE).then((c) => c.put(key, copy)));
    }
    return res;
    // Only this worker's own cache answers: the origin's others may hold another release's copy of the same file.
  }).catch(() => caches.open(CACHE).then((c) => c.match(key, { ignoreSearch: true })).then((hit) => hit || Response.error())));
});
