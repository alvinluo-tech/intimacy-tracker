// Builds public/sw.js from src/app/sw.ts without touching the app build.
//
// Why this exists: @serwist/next is a webpack plugin, so the Turbopack build
// never ran it, and its webpack run emitted invalid JavaScript (the manifest
// substitution left a stray `__` behind — see docs/bugs/
// sw-never-loads-build-pipeline.md). This script replaces it with the
// workbox-derived injector from @serwist/build, whose literal replacement of
// the injection point is battle-tested:
//   1. tsc emits plain JS from sw.ts and the relative imports it pulls in.
//   2. injectManifest bundles that JS with rollup and substitutes the precache
//      manifest at self.__SW_MANIFEST__.
// The app build stays on Turbopack; public/sw.js is a plain static file it
// serves, and `npm run build` regenerates it via the prebuild hook.
import { execSync } from "node:child_process";
import { rm } from "node:fs/promises";

import { injectManifest } from "@serwist/build";

const OUT_DIR = ".sw-build";

await rm(OUT_DIR, { recursive: true, force: true });
try {
  execSync(
    [
      "npx tsc src/app/sw.ts",
      `--outDir ${OUT_DIR}`,
      "--rootDir src",
      "--module esnext",
      "--target es2020",
      "--moduleResolution bundler",
      "--lib es2022,webworker,dom",
      "--skipLibCheck",
    ].join(" "),
    { stdio: "inherit" }
  );

  const result = await injectManifest({
    swSrc: `${OUT_DIR}/app/sw.js`,
    swDest: "public/sw.js",
    globDirectory: "public",
    globPatterns: ["icon-*.png", "apple-touch-icon.png", "manifest.json", "favicon.ico"],
    // Matches the token in src/app/sw.ts exactly; workbox-style injectors do a
    // literal string replace, so the full token must be spelled out here.
    injectionPoint: "self.__SW_MANIFEST__",
  });

  for (const warning of result.warnings ?? []) {
    console.warn("[build-sw] warning:", warning);
  }
  console.log(
    `[build-sw] public/sw.js written — precache: ${result.count} entries, ` +
      `${(result.size / 1024).toFixed(1)} KB`
  );
} finally {
  await rm(OUT_DIR, { recursive: true, force: true });
}
