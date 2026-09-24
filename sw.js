// Service worker do PWA: guarda o app pra abrir offline. Nunca mexe em /api, IGDB ou Firebase.

// O build (scripts/minify.js) troca __BUILD_ID__ por um id novo a cada deploy.
const CACHE_NAME = "pokemon-games-tracker-__BUILD_ID__";

const APP_SHELL_FILES = [
  "index.html",
  "css/styles.css",
  "manifest.json",
  "js/main.js",
  "js/progress.js",
  "js/filters.js",
  "js/ratings.js",
  "js/igdb.js",
  "js/storage-local.js",
  "js/firebase-app.js",
  "js/backup.js",
  "js/stats.js",
  "js/debounce.js",
  "js/config.js",
  "icons/icon-192.png",
  "icons/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      // Um por um: arquivo faltando (ex.: js/config.js) nao derruba a instalacao.
      await Promise.all(APP_SHELL_FILES.map((url) => cache.add(url).catch(() => {})));
    }),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) => Promise.all(names.filter((name) => name !== CACHE_NAME).map((name) => caches.delete(name))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || url.origin !== self.location.origin || url.pathname.startsWith("/api/")) {
    return;
  }
  // Rede primeiro (deploy novo aparece na hora); o cache so entra quando estiver offline.
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      })
      .catch(() =>
        caches.match(event.request, { ignoreSearch: true }).then((cached) => cached || caches.match("index.html")),
      ),
  );
});
