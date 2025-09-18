const CACHE_NAME = 'ble-scan-drive-v1';
const CORE_ASSETS = [
  './',
  './index.html',
  './styles.css',
  './manifest.json',
  './js/main.js',
  './js/geo.js',
  './js/storage.js',
  './js/map.js',
  './js/filters.js',
  './js/export.js',
  './js/ble.js',
  './js/cluster.js',
  './js/profiler.js',
  './js/session.js'
];
self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_ASSETS)));
});
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))))
  );
});
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (url.origin === location.origin) {
    e.respondWith(caches.match(e.request).then(cached => cached || fetch(e.request)));
  }
});
