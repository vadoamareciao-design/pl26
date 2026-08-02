/* Service worker della PWA "Polonia 2026".
   Strategia: CACHE-FIRST su un elenco fisso di file (precache).
   Una volta installata, l'app si apre e legge tutto SENZA RETE.
   Per pubblicare una modifica: alzare VERSIONE qui sotto. */

var VERSIONE = "polonia-2026-v3";

var FILE = [
  "./",
  "./index.html",
  "./dati.js",
  "./manifest.webmanifest",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-512-maskable.png",
  "./icon-180.png",
  "./icon-1024.png"
];

/* INSTALL: scarica e mette in cache tutto, subito. */
self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(VERSIONE).then(function (c) {
      return c.addAll(FILE);
    }).then(function () {
      return self.skipWaiting();
    })
  );
});

/* ACTIVATE: butta via le cache delle versioni vecchie. */
self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (chiavi) {
      return Promise.all(chiavi.map(function (k) {
        if (k !== VERSIONE) return caches.delete(k);
      }));
    }).then(function () {
      return self.clients.claim();
    })
  );
});

/* FETCH: prima la cache. Se manca, la rete. Se anche la rete manca
   e si stava aprendo una pagina, si restituisce comunque index.html. */
self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;

  var url = new URL(req.url);
  if (url.origin !== self.location.origin) return; /* Google Maps ecc.: non tocchiamo */

  e.respondWith(
    caches.match(req, { ignoreSearch: true }).then(function (hit) {
      if (hit) return hit;
      return fetch(req).then(function (res) {
        if (res && res.ok && res.type === "basic") {
          var copia = res.clone();
          caches.open(VERSIONE).then(function (c) { c.put(req, copia); });
        }
        return res;
      }).catch(function () {
        if (req.mode === "navigate") return caches.match("./index.html");
        return new Response("", { status: 504, statusText: "offline" });
      });
    })
  );
});
