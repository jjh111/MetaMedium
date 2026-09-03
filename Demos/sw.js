// MetaMedium's service worker: the shell works offline.
//
// The reference surface is a few files — the page, its script, its style,
// the engine bundle. They are cached on install, so the canvas opens with no
// network at all and a phone can install it as an app (ARCHITECTURE-v8 §18).
// Every request is network-first with the cache as the fallback: a fresh
// build shows on the next reload, not the one after, and nothing is ever
// served stale while the network is there. Bumping VERSION drops the old
// cache on activate.
const VERSION = 'mm-shell-v1';
const SHELL = [
  './session-engine.html',
  './session-engine.js',
  './surface/surface.css',
  './metamedium-core.browser.js',
  './manifest.webmanifest',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(VERSION).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== VERSION).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) return;
  e.respondWith(fetch(e.request).then((res) => {
    if (res.ok) caches.open(VERSION).then((c) => c.put(e.request, res.clone()));
    return res;
  }).catch(() => caches.match(e.request, { ignoreSearch: true })));
});
