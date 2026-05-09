// sw.js - Service Worker untuk Al Quran Pintar
const CACHE_NAME = 'alquran-pintar-v1';
const OFFLINE_URL = './offline.html';

// Asset wajib yang di-cache saat instalasi
const PRECACHE_ASSETS = [
  './',
  './index.html',
  './offline.html',
  './manifest.json',
  './style.css',
  './app.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-192-maskable.png',
  './icons/icon-512-maskable.png'
];

// 1️⃣ INSTALL: Cache asset statis
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Promise.allSettled memastikan jika 1 file gagal, yang lain tetap ter-cache
      const results = await Promise.allSettled(PRECACHE_ASSETS.map(url => cache.add(url)));
      const failed = results.filter(r => r.status === 'rejected');
      if (failed.length) console.warn('[SW] Beberapa asset gagal di-cache:', failed.map(f => f.reason));
    })
  );
  self.skipWaiting(); // Aktifkan versi baru langsung
});

// 2️⃣ ACTIVATE: Hapus cache lama
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then(cacheNames => 
      Promise.all(
        cacheNames
          .filter(name => name !== CACHE_NAME)
          .map(name => caches.delete(name))
      )
    )
  );
  self.clients.claim(); // Ambil alih kontrol halaman yang sudah terbuka
});

// 3️⃣ FETCH: Strategi Hybrid (Cache-First untuk statis, Network-Fallback untuk navigasi)
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET' || event.request.url.startsWith('chrome-extension')) return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached; // Cache-first

      return fetch(event.request).then(response => {
        // Hanya cache response sukses & same-origin
        if (!response || response.status !== 200 || response.type !== 'basic') return response;
        
        const clone = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
        return response;
      }).catch(() => {
        // Fallback ke halaman offline jika gagal
        if (event.request.mode === 'navigate') {
          return caches.match(OFFLINE_URL);
        }
        return new Response('Offline', { status: 503, statusText: 'Service Unavailable' });
      });
    })
  );
});