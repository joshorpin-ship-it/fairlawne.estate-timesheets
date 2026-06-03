// ══════════════════════════════════════════════════════════════════
//  SERVICE WORKER — Timesheet App
//  Caches the app shell for offline use
// ══════════════════════════════════════════════════════════════════

const CACHE_NAME = 'timesheet-v1';

// Files to cache on install
const PRECACHE_URLS = [
  '/',
  '/index.html'
];

// Install — cache the app shell
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// Activate — clean up old caches
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(key => key !== CACHE_NAME)
          .map(key => caches.delete(key))
      )
    ).then(() => self.clients.claim())
  );
});

// Fetch — serve from cache when offline, network first when online
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);

  // Never intercept Google Apps Script requests — always needs network
  if (url.hostname.includes('script.google.com')) {
    return;
  }

  // For the app shell (HTML) — network first, fall back to cache
  if (event.request.mode === 'navigate' || event.request.destination === 'document') {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Update cache with fresh version
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
          return response;
        })
        .catch(() => caches.match('/index.html'))
    );
    return;
  }

  // For everything else — cache first
  event.respondWith(
    caches.match(event.request)
      .then(cached => cached || fetch(event.request))
  );
});
