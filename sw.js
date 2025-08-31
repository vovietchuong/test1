// sw.js (optimized)
const CACHE_NAME = 'mathhub-v2';
const urlsToCache = [
  '/',
  '/styles.css',
  '/auth-system.js',
  '/user-system.js',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', event => {
  // Kiểm tra nếu request là đến Firebase
  if (event.request.url.includes('firebase') || 
      event.request.url.includes('googleapis')) {
    // Network first strategy cho các request API
    event.respondWith(
      fetch(event.request)
        .then(response => {
          // Clone response để lưu vào cache
          const responseClone = response.clone();
          caches.open(CACHE_NAME)
            .then(cache => cache.put(event.request, responseClone));
          return response;
        })
        .catch(() => caches.match(event.request))
    );
  } else {
    // Cache first strategy cho các static assets
    event.respondWith(
      caches.match(event.request)
        .then(response => response || fetch(event.request))
    );
  }
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});