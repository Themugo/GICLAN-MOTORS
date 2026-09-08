/**
 * KAYAD Mobile Service Worker
 * Provides offline support and caching for the mobile automotive marketplace
 */

const CACHE_NAME = 'kayad-mobile-v2';
const STATIC_CACHE = 'kayad-static-v2';
const IMAGE_CACHE = 'kayad-images-v2';
const API_CACHE = 'kayad-api-v2';

// Static assets to cache on install (only content-hashed assets, NOT index.html)
const STATIC_ASSETS = [
  '/manifest.webmanifest',
];

// API routes to cache
const API_ROUTES = [
  '/api/cars',
  '/api/brands',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => name !== CACHE_NAME && name !== STATIC_CACHE && name !== IMAGE_CACHE && name !== API_CACHE)
            .map((name) => {
              console.log('[SW] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Fetch event - serve from cache with network fallback
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') return;

  // Skip chrome-extension and other non-http(s) requests
  if (!url.protocol.startsWith('http')) return;

  // Handle different request types
  if (isImageRequest(request)) {
    event.respondWith(handleImageRequest(request));
  } else if (isApiRequest(request)) {
    event.respondWith(handleApiRequest(request));
  } else if (isStaticAsset(request)) {
    event.respondWith(handleStaticRequest(request));
  } else {
    event.respondWith(handleDynamicRequest(request));
  }
});

// Check request types
function isImageRequest(request) {
  const url = new URL(request.url);
  return request.destination === 'image' ||
         /\.(jpg|jpeg|png|gif|webp|svg|ico)$/i.test(url.pathname) ||
         url.hostname.includes('pexels.com') ||
         url.hostname.includes('images.unsplash.com');
}

function isApiRequest(request) {
  const url = new URL(request.url);
  return url.pathname.startsWith('/api/');
}

function isStaticAsset(request) {
  const url = new URL(request.url);
  return url.pathname.match(/\.(js|css|woff2?|ttf|eot|html)$/i) ||
         url.pathname === '/' ||
         url.pathname.endsWith('.json');
}

// Handle image requests with cache-first strategy
async function handleImageRequest(request) {
  const cachedResponse = await caches.match(request);

  if (cachedResponse) {
    // Return cached image and update cache in background
    fetchAndCache(request, IMAGE_CACHE);
    return cachedResponse;
  }

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(IMAGE_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    // Return a placeholder image if offline
    return caches.match('/placeholder-car.svg');
  }
}

// Handle API requests with network-first strategy
async function handleApiRequest(request) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(API_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    const cachedResponse = await caches.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    // Return offline API response
    return new Response(JSON.stringify({
      error: 'offline',
      message: 'You are currently offline. Showing cached data.',
      cars: [],
      total: 0,
      hasMore: false
    }), {
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// Handle static assets with network-first for HTML, cache-first for JS/CSS
async function handleStaticRequest(request) {
  const url = new URL(request.url);
  const isHtml = url.pathname === '/' || url.pathname.endsWith('.html');

  if (isHtml) {
    // Network-first for HTML so new deploys take effect immediately
    try {
      const networkResponse = await fetch(request);
      if (networkResponse.ok) {
        const cache = await caches.open(STATIC_CACHE);
        cache.put(request, networkResponse.clone());
      }
      return networkResponse;
    } catch (error) {
      const cachedResponse = await caches.match(request);
      if (cachedResponse) return cachedResponse;
      return caches.match('/index.html');
    }
  }

  // Cache-first for content-hashed JS/CSS/fonts
  const cachedResponse = await caches.match(request);
  if (cachedResponse) return cachedResponse;

  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(STATIC_CACHE);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    throw error;
  }
}

// Handle dynamic content with stale-while-revalidate
async function handleDynamicRequest(request) {
  const cachedResponse = await caches.match(request);

  const fetchPromise = fetchAndCache(request, CACHE_NAME);

  // Return cached response immediately if available
  if (cachedResponse) {
    return cachedResponse;
  }

  // Otherwise wait for network
  try {
    return await fetchPromise;
  } catch (error) {
    // For navigation requests, return the cached index.html
    if (request.mode === 'navigate') {
      return caches.match('/index.html');
    }
    throw error;
  }
}

// Helper to fetch and cache
async function fetchAndCache(request, cacheName) {
  try {
    const networkResponse = await fetch(request);
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    return networkResponse;
  } catch (error) {
    throw error;
  }
}

// Handle push notifications
self.addEventListener('push', (event) => {
  if (!event.data) return;

  const data = event.data.json();
  const options = {
    body: data.body || 'New update from KAYAD',
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-72.png',
    vibrate: [100, 50, 100],
    data: {
      url: data.url || '/',
    },
    actions: [
      { action: 'open', title: 'View' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(data.title || 'KAYAD', options)
  );
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') return;

  const url = event.notification.data?.url || '/';

  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        // Check if there's already a window open
        for (const client of clientList) {
          if (client.url.includes(self.location.origin) && 'focus' in client) {
            client.navigate(url);
            return client.focus();
          }
        }
        // Open a new window
        if (clients.openWindow) {
          return clients.openWindow(url);
        }
      })
  );
});

// Background sync for offline actions
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-favorites') {
    event.waitUntil(syncFavorites());
  }
});

async function syncFavorites() {
  // Sync favorites when back online
  console.log('[SW] Syncing favorites...');
  // Implementation would sync local favorites with server
}

// Message handler for cache management
self.addEventListener('message', (event) => {
  if (event.data === 'skipWaiting') {
    self.skipWaiting();
  }

  if (event.data === 'clearImageCache') {
    caches.delete(IMAGE_CACHE);
    console.log('[SW] Image cache cleared');
  }

  if (event.data === 'clearAllCaches') {
    caches.keys().then((names) => {
      return Promise.all(names.map((name) => caches.delete(name)));
    });
    console.log('[SW] All caches cleared');
  }
});
