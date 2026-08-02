/* Service worker della PWA "Polonia 2026".
 *
 * Obiettivo doppio: l'app si apre SUBITO (anche in aereo) ed e' SEMPRE
 * AGGIORNATA appena c'e' un filo di rete.
 *
 * Strategia "stale-while-revalidate": servo all'istante la copia che ho in
 * cache, e nello stesso momento chiedo alla rete se ne esiste una nuova.
 * Se c'e', la salvo e avviso la pagina, che mostra la barretta
 * "Aggiornamento pronto".
 *
 * Conseguenza pratica: NON serve piu' alzare un numero di versione a ogni
 * modifica dei contenuti. Il nome qui sotto serve solo a dare un nome alla cache.
 */

var CACHE = "polonia-2026-famiglia";

var FILE = [
  "./",
  "./index.html",
  "./dati.js",
  "./manifest.webmanifest",
  "./icon-180.png",
  "./icon-192.png",
  "./icon-512.png",
  "./icon-512-maskable.png",
  "./icon-1024.png"
];

/* Solo per questi file vale la pena avvisare l'utente: sono i contenuti. */
function contaSeCambia(url) {
  return /\/(index\.html|dati\.js)$/.test(url) || /\/$/.test(url);
}

self.addEventListener("install", function (e) {
  e.waitUntil(
    caches.open(CACHE)
      .then(function (c) { return c.addAll(FILE); })
      .then(function () { return self.skipWaiting(); })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys()
      .then(function (k) {
        return Promise.all(k.map(function (n) { if (n !== CACHE) return caches.delete(n); }));
      })
      .then(function () { return self.clients.claim(); })
  );
});

function avvisa(msg) {
  return self.clients.matchAll({ type: "window" }).then(function (cs) {
    cs.forEach(function (c) { c.postMessage(msg); });
  });
}

function diversa(vecchia, nuova) {
  if (!vecchia) return false;
  var a = vecchia.headers, b = nuova.headers;
  return (a.get("etag") || "") !== (b.get("etag") || "") ||
         (a.get("last-modified") || "") !== (b.get("last-modified") || "");
}

self.addEventListener("fetch", function (e) {
  var req = e.request;
  if (req.method !== "GET") return;
  if (new URL(req.url).origin !== self.location.origin) return; /* Google Maps: non tocco */

  e.respondWith(
    caches.open(CACHE).then(function (cache) {
      return cache.match(req, { ignoreSearch: true }).then(function (vecchia) {

        /* "no-cache" salta la cache del browser: altrimenti mi ridarebbe
           la stessa copia vecchia e non scoprirei mai le novita'. */
        var fresca = fetch(req, { cache: "no-cache" }).then(function (res) {
          if (!res || !res.ok || res.type !== "basic") return res;
          var cambiata = diversa(vecchia, res);
          cache.put(req, res.clone());
          if (cambiata && contaSeCambia(req.url)) avvisa({ tipo: "aggiornamento" });
          return res;
        }).catch(function () { return null; });

        /* Ho gia' la copia? La do subito: zero attesa, e funziona in aereo. */
        if (vecchia) return vecchia;

        /* Primo caricamento di quel file: qui la rete serve davvero. */
        return fresca.then(function (r) {
          if (r) return r;
          if (req.mode === "navigate") return cache.match("./index.html");
          return new Response("", { status: 504, statusText: "offline" });
        });
      });
    })
  );
});

/* La pagina chiede un controllo esplicito ogni volta che la riapri. */
self.addEventListener("message", function (e) {
  if (e.data !== "controlla") return;
  caches.open(CACHE).then(function (cache) {
    FILE.forEach(function (f) {
      fetch(f, { cache: "no-cache" }).then(function (res) {
        if (!res || !res.ok) return;
        cache.match(f, { ignoreSearch: true }).then(function (v) {
          var cambiata = diversa(v, res);
          cache.put(f, res.clone());
          if (cambiata && contaSeCambia(new URL(f, self.location).href))
            avvisa({ tipo: "aggiornamento" });
        });
      }).catch(function () {});
    });
  });
});
