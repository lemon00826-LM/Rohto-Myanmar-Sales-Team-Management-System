const CACHE_NAME = 'rohto-pwa-shell-v2';
const APP_SHELL = [
  './',
  './index.html',
  './manifest.webmanifest',
  './icons/rohto-icon.svg',
  './icons/rohto-icon-192.png',
  './icons/rohto-icon-512.png'
];

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await cache.addAll(APP_SHELL);
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(
      names
        .filter(name => name.startsWith('rohto-pwa-shell-') && name !== CACHE_NAME)
        .map(name => caches.delete(name))
    );
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  // Never cache Google Apps Script, external CDNs, fonts or remote images.
  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      const cache = await caches.open(CACHE_NAME);
      try {
        const fresh = await fetch(request, { cache: 'no-store' });
        if (fresh && fresh.ok) {
          await cache.put(request, fresh.clone());
          return fresh;
        }
      } catch (error) {
        // Offline fallback below.
      }
      return (await cache.match(request)) ||
             (await cache.match('./index.html')) ||
             (await cache.match('./')) ||
             Response.error();
    })());
    return;
  }

  event.respondWith((async () => {
    const cached = await caches.match(request);
    if (cached) return cached;
    try {
      const fresh = await fetch(request);
      if (fresh && fresh.ok) {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(request, fresh.clone());
      }
      return fresh;
    } catch (error) {
      return Response.error();
    }
  })());
});
