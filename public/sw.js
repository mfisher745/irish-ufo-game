// Hand-written service worker. Precaches the build (file list from precache.json,
// written at build time) so the game runs offline. Same-origin requests only.
const PREFIX = 'ufo-precache-';

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const scope = self.registration.scope;
      const res = await fetch(new URL('precache.json', scope), { cache: 'no-cache' });
      const { version, files } = await res.json();
      const cache = await caches.open(PREFIX + version);
      await cache.addAll(['./', ...files].map((f) => new URL(f, scope).href));
      await self.skipWaiting();
    })(),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      try {
        const res = await fetch(new URL('precache.json', self.registration.scope));
        const { version } = await res.json();
        const keys = await caches.keys();
        await Promise.all(
          keys.filter((k) => k.startsWith(PREFIX) && k !== PREFIX + version).map((k) => caches.delete(k)),
        );
      } catch {
        // Offline at activation: keep existing caches.
      }
      await self.clients.claim();
    })(),
  );
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  event.respondWith(caches.match(req, { ignoreSearch: true }).then((hit) => hit || fetch(req)));
});
