/* CodeSphere PWA service worker — static-asset cache-first, navigation network-first. */
const CACHE = "codesphere-v1";
const PRECACHE = ["/", "/dashboard", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(PRECACHE)).catch(() => {})
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // Never cache authenticated API responses.
  if (url.pathname.startsWith("/api/")) return;

  const isNavigation = req.mode === "navigate";
  const isAsset =
    url.pathname.includes("/_next/") ||
    /\.(png|svg|jpg|jpeg|webp|avif|gif|ico|woff2?|ttf|otf|css|js|json)$/i.test(url.pathname);

  if (isNavigation) {
    // Network-first with offline fallback to the cached shell.
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put("/", copy)).catch(() => {});
          return res;
        })
        .catch(() =>
          caches.match("/").then((shell) => shell || caches.match(req).then((m) => m || Response.error()))
        )
    );
    return;
  }

  if (isAsset) {
    event.respondWith(
      caches.match(req).then((cached) => {
        const network = fetch(req)
          .then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
            }
            return res;
          })
          .catch(() => cached);
        return cached || network;
      })
    );
    return;
  }

  // HTML/dynamic pages: network-first, fall back to cache.
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() => caches.match(req).then((m) => m || Response.error()))
  );
});
