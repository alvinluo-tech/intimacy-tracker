import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import {
  OFFLINE_CACHE_NAME,
  PAGES_CACHE_NAME,
  PUBLIC_OFFLINE_ROUTES,
} from "@/lib/utils/offline-privacy";

// The service worker inlines these values instead of importing them (see the
// comment in src/app/sw.ts), so this test fails when the copies drift.
const swSource = readFileSync(
  join(__dirname, "..", "..", "src", "app", "sw.ts"),
  "utf8"
);

function extractRouteSet(source: string): Set<string> {
  const match = source.match(/const PUBLIC_OFFLINE_ROUTES = new Set\(\[([\s\S]*?)\]\)/);
  expect(match, "sw.ts must declare PUBLIC_OFFLINE_ROUTES as a Set literal").toBeTruthy();
  return new Set(
    [...match![1].matchAll(/"([^"]+)"/g)].map((m) => m[1])
  );
}

function extractCacheName(source: string, constName: string): string {
  const match = source.match(new RegExp(`const ${constName} = "([^"]+)"`));
  expect(match, `sw.ts must declare ${constName} as a string literal`).toBeTruthy();
  return match![1];
}

describe("service worker source stays in sync with offline-privacy", () => {
  it("declares the same public offline routes", () => {
    expect(extractRouteSet(swSource)).toEqual(PUBLIC_OFFLINE_ROUTES);
  });

  it("declares the same cache names", () => {
    expect(extractCacheName(swSource, "CACHE_PAGES")).toBe(PAGES_CACHE_NAME);
    expect(extractCacheName(swSource, "CACHE_OFFLINE")).toBe(OFFLINE_CACHE_NAME);
  });
});
