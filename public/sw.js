const CACHE_NAME = 'science-hub-v1774545958044';
const PRECACHE_ASSETS = [
    '/',
    '/icon.png',
    '/favicon.ico',
    '/manifest.json',
    '/login',
];

// Runtime caches
const RUNTIME_CACHE = 'runtime-v8';
const IMAGE_CACHE = 'images-v1';
const FONT_CACHE = 'fonts-v1';

// Cache size limits
const MAX_RUNTIME_ENTRIES = 50;
const MAX_IMAGE_ENTRIES = 100;

// ==========================================
// PUSH NOTIFICATIONS - Works on phone!
// ==========================================

self.addEventListener('push', (event) => {
    console.log('[SW] Push received:', event);

    if (!event.data) {
        console.log('[SW] No data in push');
        return;
    }

    const data = event.data.json();
    console.log('[SW] Push data:', data);

    const options = {
        body: data.body || 'Class starting soon!',
        icon: '/icon.png',
        badge: '/icon.png',
        vibrate: [200, 100, 200, 100, 200],
        tag: data.tag || 'class-reminder',
        requireInteraction: true,
        actions: [
            { action: 'view', title: '📅 View Schedule' },
            { action: 'dismiss', title: '✓ Got it' }
        ],
        data: {
            url: data.url || '/schedule',
            timestamp: Date.now()
        }
    };

    event.waitUntil(
        self.registration.showNotification(data.title || '📚 Class Reminder', options)
    );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
    console.log('[SW] Notification clicked:', event.action);
    event.notification.close();

    if (event.action === 'dismiss') {
        return;
    }

    // Open or focus the app
    const urlToOpen = event.notification.data?.url || '/schedule';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then(clientList => {
                // If app is already open, focus it
                for (const client of clientList) {
                    if (client.url.includes(self.location.origin) && 'focus' in client) {
                        client.navigate(urlToOpen);
                        return client.focus();
                    }
                }
                // Otherwise open new window
                return clients.openWindow(urlToOpen);
            })
    );
});

// ==========================================
// CACHE MANAGEMENT UTILITIES
// ==========================================

async function limitCacheSize(cacheName, maxItems) {
    const cache = await caches.open(cacheName);
    const keys = await cache.keys();
    if (keys.length > maxItems) {
        // Delete oldest entries (first in cache)
        const toDelete = keys.slice(0, keys.length - maxItems);
        await Promise.all(toDelete.map(key => cache.delete(key)));
    }
}

// Periodic cache cleanup
async function cleanupCaches() {
    await limitCacheSize(RUNTIME_CACHE, MAX_RUNTIME_ENTRIES);
    await limitCacheSize(IMAGE_CACHE, MAX_IMAGE_ENTRIES);
}

// Install - precache critical assets
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                // Precache critical assets with error handling
                return Promise.allSettled(
                    PRECACHE_ASSETS.map(url =>
                        cache.add(url).catch(err => {
                            console.warn(`[SW] Failed to cache ${url}:`, err);
                        })
                    )
                );
            })
            .then(() => self.skipWaiting())
    );
});

// Activate - clean old caches and take control immediately
self.addEventListener('activate', (event) => {
    const currentCaches = [CACHE_NAME, RUNTIME_CACHE, IMAGE_CACHE, FONT_CACHE];
    event.waitUntil(
        caches.keys()
            .then(keys => Promise.all(
                keys
                    .filter(key => !currentCaches.includes(key))
                    .map(key => {
                        console.log('[SW] Deleting old cache:', key);
                        return caches.delete(key);
                    })
            ))
            .then(() => cleanupCaches())
            .then(() => self.clients.claim())
    );
});

// Fetch - optimized caching strategies
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

    // FONTS - Cache first, long-lived
    if (url.pathname.match(/\.(woff2?|ttf|otf|eot)$/i)) {
        event.respondWith(
            caches.open(FONT_CACHE).then(cache =>
                cache.match(request).then(cached => {
                    if (cached) return cached;
                    return fetch(request).then(response => {
                        if (response.ok) cache.put(request, response.clone());
                        return response;
                    });
                })
            )
        );
        return;
    }

    // IMAGES - Cache first with size limit
    if (url.pathname.match(/\.(png|jpg|jpeg|svg|gif|webp|avif|ico)$/i)) {
        event.respondWith(
            caches.open(IMAGE_CACHE).then(cache =>
                cache.match(request).then(cached => {
                    if (cached) return cached;
                    return fetch(request).then(response => {
                        if (response.ok) {
                            cache.put(request, response.clone());
                            // Async cleanup
                            limitCacheSize(IMAGE_CACHE, MAX_IMAGE_ENTRIES);
                        }
                        return response;
                    });
                })
            )
        );
        return;
    }

    // STATIC ASSETS (JS/CSS) - Cache first, immutable
    if (url.pathname.startsWith('/_next/static/')) {
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

    // NAVIGATION - Network first with offline fallback
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
                .catch(async () => {
                    const cached = await caches.match(request);
                    if (cached) return cached;
                    // Return offline page or root
                    return caches.match('/') || new Response('Offline', { status: 503 });
                })
        );
        return;
    }

    // OTHER - Stale-while-revalidate
    event.respondWith(
        caches.match(request).then(cached => {
            const fetchPromise = fetch(request)
                .then(response => {
                    if (response.ok) {
                        const clone = response.clone();
                        caches.open(RUNTIME_CACHE).then(cache => {
                            cache.put(request, clone);
                            limitCacheSize(RUNTIME_CACHE, MAX_RUNTIME_ENTRIES);
                        });
                    }
                    return response;
                })
                .catch(() => cached);

            return cached || fetchPromise;
        })
    );
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
    if (event.tag === 'sync-feedback') {
        event.waitUntil(syncFeedback());
    }
});

async function syncFeedback() {
    // Handle queued feedback submissions when back online
    try {
        const cache = await caches.open('pending-feedback');
        const requests = await cache.keys();

        for (const request of requests) {
            const response = await cache.match(request);
            if (response) {
                const data = await response.json();
                await fetch('/api/feedback', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(data)
                });
                await cache.delete(request);
            }
        }
    } catch (error) {
        console.error('[SW] Sync feedback failed:', error);
    }
}
