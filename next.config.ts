import type { NextConfig } from "next";
import withSerwist from "@serwist/next";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin();

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  turbopack: {},
};

const serwistConfig = withSerwist({
  swSrc: "src/app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
});

// @ts-ignore - Serwist types may have minor incompatibilities with Next.js 16
export default withNextIntl(serwistConfig(nextConfig));
