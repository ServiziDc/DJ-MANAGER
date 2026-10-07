/* Service worker: tiene in cache il guscio della pagina.
   I dati dei DJ NON vengono messi in cache qui — restano in localStorage,
   gestiti da app.js, così la pagina si apre anche a NAS spento. */

const CACHE = "bp-roster-v1";
const SHELL = ["./", "./index.html", "./app.css", "./app.js", "./icon.svg", "./manifest.webmanifest", "./fonts/ibm-plex-sans-latin-400-normal.woff2", "./fonts/ibm-plex-sans-latin-500-normal.woff2", "./fonts/ibm-plex-sans-latin-600-normal.woff2", "./fonts/barlow-condensed-latin-500-normal.woff2", "./fonts/barlow-condensed-latin-600-normal.woff2", "./fonts/ibm-plex-mono-latin-400-normal.woff2"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  // Le chiamate API passano sempre dalla rete: i dati devono essere freschi.
  if (url.pathname.startsWith("/api/")) return;

  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok && url.origin === location.origin) {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put(request, copy));
        }
        return response;
      })
      .catch(() => caches.match(request).then((hit) => hit || caches.match("./index.html")))
  );
});
