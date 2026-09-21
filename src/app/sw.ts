// The service worker runs in a WebWorker context (lib webworker) that this
// project's tsconfig does not include, so compiler errors are intentionally
// suppressed here; eslint has a matching per-file override.
// @ts-nocheck
declare const self: ServiceWorkerGlobalScope;

// Serwist injects __SW_MANIFEST__ with precache entries at build time
const precacheEntries: Array<{ url: string; revision: string | null }> =
  self.__SW_MANIFEST__ || [];

// Relative import: this file is bundled by Serwist outside Next's alias resolution.
import {
  PAGES_CACHE_NAME as CACHE_PAGES,
  OFFLINE_CACHE_NAME as CACHE_OFFLINE,
  isPublicOfflineRoute,
} from "../lib/utils/offline-privacy";

const CACHE_STATIC = "encounter-static-v2";
const CACHE_PRECACHE = "encounter-precache-v2";

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
      // Cache entries individually: addAll fails atomically if any single URL
      // 404s or times out, which used to abort install and silently drop
      // offline support entirely.
      const cache = await caches.open(CACHE_PRECACHE);
      await Promise.all(
        precacheEntries.map((e) =>
          cache.add(e.url).catch((err) => {
            console.warn("[SW] precache miss:", e.url, err);
          })
        )
      );

      // Also cache critical static files
      const staticCache = await caches.open(CACHE_STATIC);
      await Promise.all(
        [
          "/icon-48.png",
          "/icon-192.png",
          "/icon-512.png",
          "/icon-192-maskable.png",
          "/icon-512-maskable.png",
          "/manifest.json",
        ].map((url) => staticCache.add(url).catch(() => {}))
      );
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
            if (preloadResponse.ok && isPublicOfflineRoute(url.pathname)) {
              const cache = await caches.open(CACHE_PAGES);
              cache.put(request, preloadResponse.clone());
              trimCache(CACHE_PAGES, MAX_PAGES_ENTRIES);
            }
            return preloadResponse;
          }

          // Fallback to normal fetch
          const response = await fetch(request);
          if (response.ok && isPublicOfflineRoute(url.pathname)) {
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

          return new Response(
            `<html><body style="background:#020617;color:#f1f5f9;font-family:sans-serif;display:flex;align-items:center;justify-content:center;height:100vh;text-align:center"><div><h1>Offline</h1><p>No internet connection</p></div></body></html>`,
            {
              status: 503,
              headers: { "Content-Type": "text/html" },
            }
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
          if (
            response.ok &&
            request.method === "GET" &&
            // This branch also absorbs RSC soft-navigation payloads, which carry
            // the same encounter data as the HTML document.
            isPublicOfflineRoute(url.pathname)
          ) {
            const cache = await caches.open(CACHE_OFFLINE);
            cache.put(request, response.clone());
            // This cache also absorbs RSC payload variants — cap it or it
            // grows until storage quota eviction.
            trimCache(CACHE_OFFLINE, MAX_STATIC_ENTRIES);
          }
          return response;
        } catch {
          return caches.match(request) as Promise<Response>;
        }
      })()
    );
  }
});
