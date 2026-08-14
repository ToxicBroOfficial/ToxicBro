const CACHE_NAME = 'toxicbro-v2';
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/about.html',
  '/achievements.html',
  '/biography.html',
  '/contact.html',
  '/disclaimer.html',
  '/privacy-policy.html',
  '/404.html',
  '/channel.json',
  '/videos.json',
  '/favicon.ico',
  '/favicon/favicon.ico',
  '/favicon/favicon-96x96.png',
  '/favicon/apple-touch-icon.png',
  '/favicon/site.webmanifest',
  '/favicon/web-app-manifest-192x192.png',
  '/favicon/web-app-manifest-512x512.png',
  '/images/logo.png',
  '/images/Abdul Gaffar Patowary (ToxicBro).jpeg',
  '/fonts/site-fonts.css',
  '/fonts/site-fonts-secondary.css'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(STATIC_ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return;
  e.respondWith(
    caches.match(e.request).then(cached => {
      const fetchPromise = fetch(e.request).then(response => {
        if (response.ok && e.request.url.startsWith(self.location.origin)) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(e.request, clone));
        }
        return response;
      }).catch(() => cached);
      return cached || fetchPromise;
    })
  );
});
