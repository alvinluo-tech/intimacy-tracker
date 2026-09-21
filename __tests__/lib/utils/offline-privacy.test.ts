import { describe, it, expect, vi, afterEach } from "vitest";

import {
  isPublicOfflineRoute,
  purgePrivatePageCaches,
  PAGES_CACHE_NAME,
  OFFLINE_CACHE_NAME,
} from "@/lib/utils/offline-privacy";

// The worker answers an offline navigation from CacheStorage without consulting
// middleware or the PIN gate, so a cached app page hands the previous session's
// records to whoever opens the device next.

describe("isPublicOfflineRoute", () => {
  it.each([
    "/timeline",
    "/dashboard",
    "/records/6f1d2b3c-0000-4000-8000-000000000001",
    "/records/6f1d2b3c-0000-4000-8000-000000000001/edit",
    "/partners",
    "/partners/9a8b7c6d-0000-4000-8000-000000000002",
    "/settings",
    "/settings/privacy",
    "/playback",
    "/map",
    "/report",
    "/location-picker",
    "/lock",
    "/admin",
    "/admin/users",
  ])("keeps %s out of the offline cache", (path) => {
    expect(isPublicOfflineRoute(path)).toBe(false);
  });

  it.each([
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
  ])("allows %s", (path) => {
    expect(isPublicOfflineRoute(path)).toBe(true);
  });

  it("does not let the legal page prefix make /settings/privacy cacheable", () => {
    expect(isPublicOfflineRoute("/settings/privacy-policy")).toBe(true);
    expect(isPublicOfflineRoute("/settings/privacy")).toBe(false);
  });

  it("ignores a trailing slash", () => {
    expect(isPublicOfflineRoute("/login/")).toBe(true);
    expect(isPublicOfflineRoute("/timeline/")).toBe(false);
  });

  it("treats the bare root as public", () => {
    expect(isPublicOfflineRoute("/")).toBe(true);
  });
});

describe("purgePrivatePageCaches", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("deletes exactly the two caches that can hold record data", async () => {
    const deleted: string[] = [];
    vi.stubGlobal("caches", {
      delete: async (name: string) => {
        deleted.push(name);
        return true;
      },
    });

    await purgePrivatePageCaches();

    expect([...deleted].sort()).toEqual([OFFLINE_CACHE_NAME, PAGES_CACHE_NAME].sort());
  });

  it("leaves static and precache entries alone", async () => {
    const deleted: string[] = [];
    vi.stubGlobal("caches", {
      delete: async (name: string) => {
        deleted.push(name);
        return true;
      },
    });

    await purgePrivatePageCaches();

    expect(deleted).not.toContain("encounter-static-v2");
    expect(deleted).not.toContain("encounter-precache-v2");
  });

  it("does nothing when CacheStorage is unavailable", async () => {
    vi.stubGlobal("caches", undefined);
    await expect(purgePrivatePageCaches()).resolves.toBeUndefined();
  });
});
