import type { NextConfig } from "next";
import withSerwist from "@serwist/next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

/**
 * Browsers only report Content-Security-Policy-Report-Only violations to the
 * console, so this is the strict policy under observation rather than a policy
 * enforced blind: the map, PIN and couple-sync surfaces cannot be exercised
 * without a live session, and a wrongly omitted connect/font host would break
 * them. Once the console is quiet across those flows, move this string into the
 * enforced header below and drop the safe-subset line.
 */
const STRICT_CSP = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https://*.supabase.co https://api.mapbox.com",
  "font-src 'self' data: https://fonts.gstatic.com",
  "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.mapbox.com https://events.mapbox.com https://*.mapbox.com https://restapi.amap.com",
  "worker-src 'self' blob:",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join("; ");

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  cacheComponents: true,
  turbopack: {},
  async headers() {
    return [
      {
        // Enforced: these cannot break anything the app does today, and each one
        // closes a real hole — chiefly frame-ancestors, since a PIN lock and an
        // encrypted-notes UI are worthless behind a clickjacking overlay.
        source: "/:path*",
        headers: [
          {
            key: "Content-Security-Policy",
            value: "frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'",
          },
          { key: "Content-Security-Policy-Report-Only", value: STRICT_CSP },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Permissions-Policy",
            value: "geolocation=(self), camera=(), microphone=(), payment=(), usb=(), interest-cohort=()",
          },
          { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
        ],
      },
    ];
  },
};

// KNOWN BROKEN — the service worker does not load in any build mode:
//  1. @serwist/next is a webpack plugin, and `next build` uses Turbopack in
//     Next 16, so the plugin never runs and public/sw.js is not emitted at all.
//  2. `next build --webpack` does run it, but the emitted file is not valid
//     JavaScript: the manifest substitution replaces `self.__SW_MANIFEST` and
//     leaves the trailing `__` behind, producing `[{...}]__||[]` and a
//     SyntaxError. The browser reports "ServiceWorker script evaluation failed"
//     and precaching, offline fallback and the install prompt are all dead.
//     Reproduced against src/app/sw.ts as of 6812d6c, so it predates any edit
//     here; it is a @serwist/next 9.5.7 issue, not something the SW source did.
// Both modes were verified by building and running `node --check public/sw.js`.
// Fixing this is a dependency decision (pin/upgrade serwist, or move to
// workbox, or stop relying on the injected manifest), which is why the build
// script is deliberately left alone until that call is made.
const serwistConfig = withSerwist({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
});

export default withNextIntl(serwistConfig(nextConfig));
