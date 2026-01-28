// Service Worker for App ID: {{APP_ID}}
// Version: {{VERSION}}

const CACHE_NAME = 'pufferfishes-app-{{APP_ID}}-v{{VERSION}}';

// Files to cache (will be injected by build script)
const urlsToCache = [
  // INJECT_FILE_LIST_HERE
];

// Install event: cache app shell
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing...');

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching app shell');
        return cache.addAll(urlsToCache);
      })
      .then(() => {
        console.log('[Service Worker] App shell cached');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[Service Worker] Cache failed:', error);
      })
  );
});

// Activate event: clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating...');

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              // Delete old caches for this app
              return cacheName.startsWith('pufferfishes-app-{{APP_ID}}') && cacheName !== CACHE_NAME;
            })
            .map((cacheName) => {
              console.log('[Service Worker] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        console.log('[Service Worker] Activated');
        return self.clients.claim();
      })
  );
});

// Fetch event: serve from cache, fallback to network
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip external requests (different origin)
  const url = new URL(request.url);
  if (url.origin !== location.origin) {
    return;
  }

  event.respondWith(
    caches.match(request)
      .then((cachedResponse) => {
        if (cachedResponse) {
          // Return cached version
          console.log('[Service Worker] Serving from cache:', request.url);
          return cachedResponse;
        }

        // Not in cache, fetch from network
        console.log('[Service Worker] Fetching from network:', request.url);
        return fetch(request)
          .then((networkResponse) => {
            // Cache successful responses
            if (networkResponse && networkResponse.status === 200) {
              const responseToCache = networkResponse.clone();
              caches.open(CACHE_NAME)
                .then((cache) => {
                  cache.put(request, responseToCache);
                });
            }
            return networkResponse;
          })
          .catch((error) => {
            console.error('[Service Worker] Fetch failed:', error);
            // Return offline page if available
            return caches.match('/apps/{{APP_ID}}/index.html');
          });
      })
  );
});

// Message event: handle messages from app
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

console.log('[Service Worker] Loaded for app {{APP_ID}}');
