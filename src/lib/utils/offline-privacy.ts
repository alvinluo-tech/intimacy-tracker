export const PAGES_CACHE_NAME = "encounter-pages-v2";
export const OFFLINE_CACHE_NAME = "encounter-offline-v2";

/**
 * Routes whose HTML may be kept for offline use.
 *
 * A service worker cannot consult middleware: an offline navigation is answered
 * straight out of CacheStorage, so nothing redirects to /login and nothing
 * enforces the PIN gate. Any app page that renders encounter rows into its HTML
 * or RSC payload therefore leaks the last online session's records — partner
 * names, cities, ratings, timestamps — to whoever opens the app next on that
 * device, for as long as the cache entry lives.
 */
// Exported so __tests__/sw/sw-source-sync.test.ts can verify the service
// worker's inlined copy (it cannot import this module) stays identical.
export const PUBLIC_OFFLINE_ROUTES = new Set([
  "/",
  "/login",
  "/register",
  "/forgot-password",
  "/reset-password",
  "/verify-email",
  "/privacy-policy",
  "/terms-of-service",
  "/settings/about",
  "/settings/privacy-policy",
  "/settings/terms-of-service",
]);

export function isPublicOfflineRoute(pathname: string): boolean {
  const path = pathname.replace(/\/+$/, "") || "/";
  return PUBLIC_OFFLINE_ROUTES.has(path);
}

/**
 * Drops every cached page/payload. CacheStorage is shared by the origin, so a
 * signed-out or PIN-locked tab can clear what the worker stored without a
 * message round-trip.
 */
export async function purgePrivatePageCaches(): Promise<void> {
  if (typeof caches === "undefined") return;
  await Promise.all([
    caches.delete(PAGES_CACHE_NAME),
    caches.delete(OFFLINE_CACHE_NAME),
  ]);
}
