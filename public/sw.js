// Minimal, dependency-free service worker. Its job is twofold: make the app
// installable (a fetch handler is the bar browsers set) and let it open offline.
//
// Build output is content-hashed, so we can't precache by name. Instead we
// precache the shell entry points we *do* know, then cache everything else
// at runtime (stale-while-revalidate). All URLs are relative to the SW's own
// location, so this works unchanged under a GitHub Pages project subpath.

const CACHE = 'msn-messenger-v1';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icon-192.png', './icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const { request } = event;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  // Only ever cache our own origin; relay traffic is WebSocket and never hits here.
  if (url.origin !== self.location.origin) return;

  // SPA navigations: serve the cached shell when the network is unavailable so
  // a home-screen launch works offline.
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() => caches.match('./index.html').then((r) => r ?? caches.match('./'))),
    );
    return;
  }

  // Everything else: serve from cache fast, refresh in the background.
  event.respondWith(
    caches.match(request).then((cached) => {
      const network = fetch(request)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached ?? network;
    }),
  );
});
