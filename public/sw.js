const CACHE_NAME = 'science-hub-v8';
const PRECACHE_ASSETS = [
    '/icon.png?v=2',
    '/favicon.ico?v=2',
    '/manifest.json',
];

// Runtime cache for dynamic content
const RUNTIME_CACHE = 'runtime-v7';

// Install - precache critical assets (skip errors for dev)
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                // Use addAll with error handling for individual assets
                return Promise.allSettled(
                    PRECACHE_ASSETS.map(url =>
                        cache.add(url).catch(err => {
                            console.warn(`Failed to cache ${url}:`, err);
                        })
                    )
                );
            })
            .then(() => self.skipWaiting())
    );
});

// Activate - clean old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(
                keys
                    .filter(key => key !== CACHE_NAME && key !== RUNTIME_CACHE)
                    .map(key => caches.delete(key))
            ))
            .then(() => self.clients.claim())
    );
});

// Fetch - stale-while-revalidate for pages, cache-first for assets
self.addEventListener('fetch', (event) => {
    const { request } = event;
    const url = new URL(request.url);

    // Skip non-GET and external requests
    if (request.method !== 'GET' || url.origin !== self.location.origin) {
        return;
    }

    // Skip API calls and Next.js data routes - always fetch fresh
    if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/_next/data/')) {
        return;
    }

    // Skip hot reload and dev server routes
    if (url.pathname.includes('__webpack') || url.pathname.includes('_next/webpack')) {
        return;
    }

    // Navigation requests - network first to avoid stale auth/content
    if (request.mode === 'navigate' || request.destination === 'document') {
        event.respondWith(
            fetch(request)
                .then(response => {
                    if (response.ok) {
                        const clone = response.clone();
                        caches.open(RUNTIME_CACHE).then(cache => cache.put(request, clone));
                    }
                    return response;
                })
                .catch(() => caches.match(request))
        );
        return;
    }

    // Static assets - cache first
    if (
        url.pathname.startsWith('/_next/static/') ||
        url.pathname.match(/\.(png|jpg|jpeg|svg|gif|webp|avif|ico|woff2?)$/i)
    ) {
        event.respondWith(
            caches.match(request).then(cached => {
                if (cached) return cached;
                return fetch(request).then(response => {
                    if (response.ok) {
                        const clone = response.clone();
                        caches.open(RUNTIME_CACHE).then(cache => cache.put(request, clone));
                    }
                    return response;
                });
            })
        );
        return;
    }

    // Other requests - stale-while-revalidate
    event.respondWith(
        caches.match(request).then(cached => {
            const fetchPromise = fetch(request).then(response => {
                if (response.ok) {
                    const clone = response.clone();
                    caches.open(RUNTIME_CACHE).then(cache => cache.put(request, clone));
                }
                return response;
            }).catch(() => cached);

            return cached || fetchPromise;
        })
    );
});
