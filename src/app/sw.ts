// @ts-nocheck - Service worker environment (Serwist)
declare const self: ServiceWorkerGlobalScope;

// Serwist injects __SW_MANIFEST__ with precache entries at build time
const precacheEntries = self.__SW_MANIFEST__ || [];

const CACHE_NAME_PAGES = "encounter-pages-v1";
const CACHE_NAME_STATIC = "encounter-static-v1";

// ---- Install: precache critical assets ----
self.addEventListener("install", (event) => {
  console.log("[SW] Install");
  event.waitUntil(
    caches.open(CACHE_NAME_STATIC).then((cache) => {
      return cache.addAll([
        "/icon-48.png",
        "/icon-192.png",
        "/icon-512.png",
        "/manifest.json",
      ]);
    })
  );
  self.skipWaiting();
});

// ---- Activate: clean old caches, claim clients ----
self.addEventListener("activate", (event) => {
  console.log("[SW] Activate");
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME_PAGES && k !== CACHE_NAME_STATIC)
          .map((k) => caches.delete(k))
      );
    })
  );
  event.waitUntil(self.clients.claim());
});

// ---- Fetch: network-first for data, cache-first for assets ----
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") return;

  // API calls: network only (no stale data)
  if (
    url.pathname.startsWith("/api/") ||
    url.hostname.includes("supabase") ||
    url.hostname.includes("mapbox")
  ) {
    return;
  }

  // Static assets: cache-first
  if (
    url.pathname.match(/\.(png|jpg|jpeg|gif|webp|svg|ico|woff2?|css)$/) ||
    url.pathname === "/manifest.json"
  ) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME_STATIC).then((cache) => {
              cache.put(request, clone);
            });
          }
          return response;
        });
        return cached || fetchPromise;
      })
    );
    return;
  }

  // Navigation / app pages: network-first with offline fallback
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CACHE_NAME_PAGES).then((cache) => {
              cache.put(request, clone);
            });
          }
          return response;
        })
        .catch(async () => {
          const cached = await caches.match(request);
          if (cached) return cached;
          // Ultimate fallback: try to serve the root page
          const root = await caches.match("/");
          return root || new Response("Offline", { status: 503 });
        })
    );
  }
});
