// Service worker do PWA: cache-first so' do "app shell" (HTML/CSS/JS/
// manifest/icones deste mesmo site), pra abrir offline/instalado. NUNCA
// intercepta /api/* nem chamadas pra outro dominio (IGDB, Firebase) -
// senao lista de jogos ou login ficariam presos em cache velho. Fica de
// fora da minificacao (scripts/minify.js) de proposito, pra ficar facil de
// depurar problema de cache direto no F12.

const CACHE_NAME = "pokemon-games-tracker-shell-v1";

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
      // cache.add() individual (nao cache.addAll) pra um arquivo faltando
      // (ex.: js/config.js no modo visitante) nao derrubar a instalacao inteira.
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
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) {
    return;
  }
  // Rede primeiro, cache so' de reserva (offline) - com cache-first puro,
  // depois de um deploy o app fica preso na versao antiga pra sempre (o
  // service worker nunca detecta sozinho que o conteudo mudou, so' o
  // proprio sw.js). Assim quem esta online sempre pega o mais novo, e
  // atualiza o cache pra quando ficar offline.
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request)),
  );
});
