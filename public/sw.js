// F15: app shell for offline start. Network first; the cache is only a fallback.
// Never touches /api, /files, /uploads or /qris.jpg (private or changing data).
const CACHE = 'kudostack-shell-v1';
const SHELL = ['/', '/logo.jpg', '/manifest.webmanifest', '/icon-192.png'];
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  if (/^\/(api|files|uploads)\//.test(url.pathname) || url.pathname === '/qris.jpg') return;
  const key = req.mode === 'navigate' ? '/' : url.pathname;
  if (!SHELL.includes(key)) return;
  e.respondWith(fetch(req).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(key, copy)); }
    return res;
  }).catch(() => caches.match(key)));
});
