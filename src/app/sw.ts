// @ts-nocheck - Service worker environment (Serwist)
declare const self: ServiceWorkerGlobalScope;

// Serwist injects __SW_MANIFEST__ with precache entries at build time
const precacheEntries: Array<{ url: string; revision: string | null }> =
  self.__SW_MANIFEST__ || [];

const CACHE_PAGES = "encounter-pages-v2";
const CACHE_STATIC = "encounter-static-v2";
const CACHE_PRECACHE = "encounter-precache-v2";
const CACHE_OFFLINE = "encounter-offline-v2";

const STATIC_EXTS = /\.(png|jpg|jpeg|gif|webp|svg|ico|woff2?|css|js)$/;
const MAX_STATIC_ENTRIES = 150;
const MAX_PAGES_ENTRIES = 30;
const MAX_AGE_STATIC = 30 * 24 * 60 * 60; // 30 days
const MAX_AGE_PAGES = 7 * 24 * 60 * 60; // 7 days

// ---- Navigation Preload ----
// Speeds up navigations by firing the network request before SW wake-up
self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      if (self.registration.navigationPreload) {
        await self.registration.navigationPreload.enable();
      }
    })()
  );
});

// ---- Install: precache all build assets from manifest ----
self.addEventListener("install", (event) => {
  console.log("[SW] Install");
  event.waitUntil(
    (async () => {
      // Precache app shell assets from Serwist manifest
      const cache = await caches.open(CACHE_PRECACHE);
      await cache.addAll(
        precacheEntries.map((e) => e.url)
      );

      // Also cache critical static files
      const staticCache = await caches.open(CACHE_STATIC);
      await staticCache.addAll([
        "/icon-48.png",
        "/icon-192.png",
        "/icon-512.png",
        "/icon-192-maskable.png",
        "/icon-512-maskable.png",
        "/manifest.json",
      ]);
    })()
  );
  self.skipWaiting();
});

// ---- Activate: clean old caches, claim clients, notify ----
self.addEventListener("activate", (event) => {
  console.log("[SW] Activate");
  const currentCaches = [CACHE_PAGES, CACHE_STATIC, CACHE_PRECACHE, CACHE_OFFLINE];

  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys
          .filter((k) => !currentCaches.includes(k))
          .map((k) => caches.delete(k))
      );
    })()
  );
  event.waitUntil(self.clients.claim());
});

// ---- Message: handle skipWaiting request & relay to clients ----
self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});

// ---- Trim cache to prevent bloat ----
async function trimCache(cacheName: string, maxEntries: number) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  if (keys.length > maxEntries) {
    const toDelete = keys.slice(0, keys.length - maxEntries);
    await Promise.all(toDelete.map((req) => cache.delete(req)));
  }
}

// ---- Fetch: strategy-based routing ----
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== "GET") return;

  // API calls: network only, never cache
  if (
    url.pathname.startsWith("/api/") ||
    url.hostname.includes("supabase") ||
    url.hostname.includes("mapbox")
  ) {
    return;
  }

  // Static assets: cache-first with network update (stale-while-revalidate pattern)
  if (STATIC_EXTS.test(url.pathname) || url.pathname === "/manifest.json") {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request);
        const fetchPromise = fetch(request).then(async (response) => {
          if (response.ok) {
            const cache = await caches.open(CACHE_STATIC);
            cache.put(request, response.clone());
            trimCache(CACHE_STATIC, MAX_STATIC_ENTRIES);
          }
          return response;
        });
        return cached || fetchPromise;
      })()
    );
    return;
  }

  // Navigation: network-first with preload, falling back to cache
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          // Try navigation preload first (fastest)
          const preloadResponse = await event.preloadResponse;
          if (preloadResponse) {
            if (preloadResponse.ok) {
              const cache = await caches.open(CACHE_PAGES);
              cache.put(request, preloadResponse.clone());
              trimCache(CACHE_PAGES, MAX_PAGES_ENTRIES);
            }
            return preloadResponse;
          }

          // Fallback to normal fetch
          const response = await fetch(request);
          if (response.ok) {
            const cache = await caches.open(CACHE_PAGES);
            cache.put(request, response.clone());
            trimCache(CACHE_PAGES, MAX_PAGES_ENTRIES);
          }
          return response;
        } catch {
          // Offline: try cache
          const cached = await caches.match(request);
          if (cached) return cached;

          // Ultimate fallback: root page
          const root = await caches.match("/");
          if (root) return root;

          // Offline page
          const offline = await caches.match("/offline");
          return (
            offline ||
            new Response(
              `<html><body style="background:#020617;color:#f1f5f9;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;text-align:center"><div><h1>Offline</h1><p>No internet connection</p></div></body></html>`,
              {
                status: 503,
                headers: { "Content-Type": "text/html" },
              }
            )
          );
        }
      })()
    );
    return;
  }

  // Other same-origin requests: network-first
  if (url.origin === self.location.origin) {
    event.respondWith(
      (async () => {
        try {
          const response = await fetch(request);
          if (response.ok && request.method === "GET") {
            const cache = await caches.open(CACHE_OFFLINE);
            cache.put(request, response.clone());
          }
          return response;
        } catch {
          return caches.match(request) as Promise<Response>;
        }
      })()
    );
  }
});
