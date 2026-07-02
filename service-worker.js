const CACHE_NAME = 'match-predictor-v3';
const ASSETS = [
  './',
  './index.html',
  './partidos.html',
  './tabla.html',
  './perfil.html',
  './CSS/Predicciones.css',
  './JS/supabaseConfig.js',
  './JS/registerServiceWorker.js',
  './JS/auth.js',
  './JS/perfil.js',
  './JS/tabla.js',
  './JS/partidos.js',
  './Imagenes/Logo Principal.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './manifest.json'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cached => cached || fetch(event.request))
  );
});
