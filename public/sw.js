/* Simple PWA Service Worker for Logbook */
// Bump this on deploys to force old caches to be cleared
const CACHE_NAME = 'logbook-cache-v9';
const ASSETS = [
  '/',
  '/favicon.ico',
  '/manifest.webmanifest',
];
const API_PATTERN = /\/api\//;
const IMMUTABLE_EXT = /\.(?:js|css|woff2?|png|jpg|jpeg|gif|svg|webp|ico)$/i;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.map((k) => (k === CACHE_NAME ? null : caches.delete(k)))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  // Only handle GET requests
  if (req.method !== 'GET') return;
  // Never cache API calls
  if (API_PATTERN.test(new URL(req.url).pathname)) {
    return; // let the network handle it
  }
  // Network-only for HTML pages to avoid caching session-dependent content; cache-first for static assets
  if (req.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      fetch(new Request(req, { cache: 'no-store' }))
        .catch(() => caches.match('/'))
    );
  } else {
    // Stale-while-revalidate for static assets
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(req);
      const url = new URL(req.url);
      const networkFetch = fetch(req).then((res) => {
        if (res.ok && IMMUTABLE_EXT.test(url.pathname)) {
          cache.put(req, res.clone()).catch(() => {});
        }
        return res;
      }).catch(() => cached);
      return cached || networkFetch;
    })());
  }
});

