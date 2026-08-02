'use strict';
const CACHE = 'cvrewriter-v5';
const SHELL = ['./', './index.html', './styles.css', './app.js',
  './engine/rules.js', './engine/nlp.js', './engine/tailor.js', './engine/render.js', './engine/pdf-extract.js', './engine/voice.js',
  './vendor/pdf.min.mjs', './vendor/pdf.worker.min.mjs', './fonts/outfit-latin-wght-normal.woff2',
  './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/icon-512-maskable.png', './icons/icon-180.png', './icons/favicon.svg'];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

/* Network first so updates land; cache fallback so the app opens offline. */
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  e.respondWith(
    fetch(e.request)
      .then((resp) => {
        const copy = resp.clone();
        caches.open(CACHE).then((c) => c.put(e.request, copy));
        return resp;
      })
      .catch(() => caches.match(e.request, { ignoreSearch: true }).then((hit) => hit || caches.match('./index.html')))
  );
});
