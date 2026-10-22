/**
 * Service worker for 1024.
 *
 * Precaches the app shell and assets. Uses network-first for navigation and cache-first for
 * static assets. The worker MUST NOT call skipWaiting() on its own. (FR-059, FR-061)
 */

const CACHE_NAME = "1024-v1";
const PRECACHE_ASSETS = [
  "./",
  "./index.html",
  "./manifest.webmanifest",
  "./src/main.js",
  "./src/core/board.js",
  "./src/core/game.js",
  "./src/core/constants.js",
  "./src/core/random.js",
  "./src/core/types.js",
  "./src/ui/animations.js",
  "./src/ui/dialogs.js",
  "./src/ui/input.js",
  "./src/ui/render.js",
  "./src/ui/strings.js",
  "./src/ui/swipe.js",
  "./src/services/persist.js",
  "./src/services/settings.js",
  "./src/services/sw-register.js",
  "./src/styles/base.css",
  "./src/styles/board.css",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png",
  "./assets/icons/icon-maskable-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(PRECACHE_ASSETS))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((key) => key !== CACHE_NAME)
          .map((key) => caches.delete(key))
      )
    )
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          return response;
        })
        .catch(() => caches.match(request).then((cached) => cached || caches.match("./index.html")))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          if (response.ok && request.method === "GET") {
            const copy = response.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
          }
          return response;
        })
        .catch(() => cached);
    })
  );
});
