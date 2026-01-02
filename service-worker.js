// ==========================================
// MFXStok - Service Worker (Network First)
// ==========================================

const CACHE_NAME = 'mfxstok-v3-firebase'; // Incremented version
const urlsToCache = [
    '/',
    '/index.html',
    '/styles.css',
    '/app.js',
    '/db.js', // Cached but often refreshed
    '/components.js',
    '/barcode-scanner.js',
    '/reports.js',
    '/manifest.json',
    'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap'
];

self.addEventListener('install', (event) => {
    // Force new service worker to activate immediately
    self.skipWaiting();
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(urlsToCache))
    );
});

self.addEventListener('message', (event) => {
    if (event.data.action === 'skipWaiting') {
        self.skipWaiting();
    }
});

self.addEventListener('activate', (event) => {
    // Delete all old caches
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    return caches.delete(cacheName);
                })
            );
        })
    );
    self.clients.claim();
});

// Network First implementation
// Try network -> if success, update cache and return -> if fail, return cache
self.addEventListener('fetch', (event) => {
    // Skip non-GET requests or firebase/extension requests
    if (event.request.method !== 'GET' ||
        event.request.url.includes('firestore') ||
        event.request.url.includes('googleapis') ||
        !event.request.url.startsWith('http')) {
        return;
    }

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                const responseToCache = response.clone();
                caches.open(CACHE_NAME)
                    .then((cache) => {
                        cache.put(event.request, responseToCache);
                    });
                return response;
            })
            .catch(() => {
                return caches.match(event.request);
            })
    );
});
