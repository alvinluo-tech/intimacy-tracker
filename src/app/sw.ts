// @ts-nocheck - Service worker file
const precacheEntries = self.__SW_MANIFEST__ || [];

// Basic service worker setup
self.addEventListener("install", (event) => {
  console.log("[SW] Install event");
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  console.log("[SW] Activate event");
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  // Basic network-first strategy for API calls
  if (event.request.url.includes("supabase") || event.request.url.includes("mapbox")) {
    event.respondWith(
      fetch(event.request).catch(() => {
        return new Response("Offline - data not available");
      })
    );
  }
});
