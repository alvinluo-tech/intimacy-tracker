import type { NextConfig } from "next";
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

// The service worker is NOT built here. @serwist/next is a webpack plugin:
// the Turbopack build never ran it, and its webpack run emitted invalid
// JavaScript (stray `__` left by the manifest substitution — see docs/bugs/
// sw-never-loads-build-pipeline.md). public/sw.js is instead generated from
// src/app/sw.ts by scripts/build-sw.mjs, which `npm run build` executes via
// the prebuild hook. Keep that hook wired or the browser will register a
// stale artifact.
export default withNextIntl(nextConfig);
