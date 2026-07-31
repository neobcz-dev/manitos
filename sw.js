/* Service Worker Manitos de la Mater — network-first con fallback a cache.
   Necesario para que la app sea "instalable" (PWA) y funcione offline básico.
   El shell (html/css/js/logo/iconos) se cachea; las llamadas a Supabase van a la red. */
const CACHE = 'manitos-v1';
const SHELL = ['./', './index.html', './logo.png', './icon-192.png', './icon-512.png', './manifest.json'];

self.addEventListener('install', e => {
  self.skipWaiting();
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).catch(() => {}));
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;                     // no cachear POST/PATCH (Supabase escribe)
  const url = new URL(req.url);
  if (url.hostname.endsWith('supabase.co')) return;     // datos siempre a la red
  e.respondWith(
    fetch(req)
      .then(net => {
        if (net && net.status === 200 && url.origin === location.origin) {
          const copy = net.clone();
          caches.open(CACHE).then(c => c.put(req, copy));
        }
        return net;
      })
      .catch(() => caches.match(req).then(hit => hit || caches.match('./index.html')))
  );
});
