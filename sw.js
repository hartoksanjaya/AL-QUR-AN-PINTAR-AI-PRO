const CACHE_NAME = "quran-ai-v3";
const STATIC_CACHE = [
  "/",
  "index.html",
  "manifest.json",
  "assets/icon-192.png",
  "assets/icon-512.png"
];

// INSTALL
self.addEventListener("install", event => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(STATIC_CACHE))
  );
});

// ACTIVATE
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.map(key => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      )
    )
  );
  self.clients.claim();
});

// FETCH (SMART CACHE STRATEGY)
self.addEventListener("fetch", event => {
  const req = event.request;

  // API → NETWORK FIRST
  if (req.url.includes("api.alquran.cloud") || req.url.includes("cdn.islamic.network")) {
    event.respondWith(
      fetch(req)
        .then(res => {
          return caches.open(CACHE_NAME).then(cache => {
            cache.put(req, res.clone());
            return res;
          });
        })
        .catch(() => caches.match(req))
    );
    return;
  }

  // STATIC → CACHE FIRST
  event.respondWith(
    caches.match(req).then(cached => {
      return cached || fetch(req).then(res => {
        return caches.open(CACHE_NAME).then(cache => {
          cache.put(req, res.clone());
          return res;
        });
      }).catch(() => {
        // OFFLINE FALLBACK
        if (req.destination === "document") {
          return caches.match("/index.html");
        }
      });
    })
  );
});