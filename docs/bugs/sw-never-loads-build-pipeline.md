# Service worker never loads — two independent build defects

Found 2026-09-22 while landing the offline-cache fix (`b326805`). The PWA has
never worked in production, in either build mode.

## Symptom

Browser console on any page:

```
[PWA] SW registration failed: TypeError: Failed to register a ServiceWorker for
scope ('http://localhost:3111/') with script ('http://localhost:3111/sw.js'):
ServiceWorker script evaluation failed
```

## Defect 1 — Turbopack skips the Serwist plugin entirely

`@serwist/next` is a **webpack** plugin. Next 16 builds with Turbopack by
default, so `withSerwist(...)` in `next.config.ts` never runs and `public/sw.js`
is not produced at all (`next start` then 404s on it).

Reproduce: `rm -rf .next public/sw.js && npx next build && ls public/sw.js`

## Defect 2 — the webpack build emits invalid JavaScript

`npx next build --webpack` does run the plugin and writes `public/sw.js`
(15.9 KB, manifest injected), but the substitution is malformed: it replaces
`self.__SW_MANIFEST` and leaves the trailing `__` of the source token behind.

```
source   const precacheEntries = self.__SW_MANIFEST__ || [];
emitted  let i=[{'revision':'…','url':'/window.svg'}]__||[],t="e…
result   SyntaxError: Unexpected identifier '__'
```

Reproduce: `npx next build --webpack && node --check public/sw.js`

## Not caused by the offline-cache change

Verified by checking out `src/app/sw.ts` as of `6812d6c` (before any edit in
this area) and rebuilding: `node --check` fails identically. The source
declaration shape is not the trigger — it is `@serwist/next` 9.5.7.

## Consequence

Precaching, the offline fallback page, the update prompt and
`beforeinstallprompt` capture are all dead. Which means `src/app/sw.ts` is
currently dead code, and the `caches.delete` purge added in `b326805` cannot run
until this is fixed. The prior audit's PWA items (`docs/bugs/2026-09-audit-bug-fix-sweep.md:52`)
were therefore never exercised end to end.

## Options (needs a decision — dependency change)

1. Pin/upgrade `@serwist/next` and re-verify with `node --check public/sw.js`.
2. Replace Serwist with a Workbox `generateSW`/`injectManifest` setup.
3. Stop using the injected manifest: hand-maintain the precache list in
   `src/app/sw.ts` so no substitution happens, and build with `--webpack`.

Option 3 is the smallest diff and keeps a working service worker; option 1 is
the least code. Any of them must end with: build, `node --check public/sw.js`,
`next start`, then confirm the console reports a successful registration.

## RESOLVED 2026-09-22 — hybrid of 2 and 3, no webpack, no Serwist bundler

Implemented on `fix/service-worker-build`:

- `@serwist/next` (and the unused `@serwist/sw` / `@serwist/precaching` /
  `serwist` packages) are removed. `next.config.ts` no longer wraps with
  `withSerwist`; the app build stays on Turbopack untouched.
- `scripts/build-sw.mjs` (wired as the `prebuild` npm hook) now produces
  `public/sw.js`: `tsc` emits plain JS from `src/app/sw.ts`, then
  `@serwist/build`'s `injectManifest` (the workbox-build injector, whose
  literal replacement of the injection point is battle-tested) bundles it and
  substitutes the precache manifest at `self.__SW_MANIFEST__`. Glob is the
  curated public assets (icons, apple-touch-icon, manifest.json, favicon) —
  16 entries ≈ 2.2 MB, each cached with an individual catch as before.
- `src/app/sw.ts` no longer imports from `../lib/utils/offline-privacy`:
  the injector does not resolve extensionless relative imports (verified —
  the first build left a dangling `from "../lib/utils/offline-privacy"` and
  none of the module body). The three values (two cache names, the public
  offline route set + predicate) are inlined, and
  `__tests__/sw/sw-source-sync.test.ts` fails if the copies drift from
  `offline-privacy.ts` (whose route set is now exported for this purpose).

Verification: `pnpm build` (prebuild runs, Turbopack compile succeeds),
`node --check public/sw.js` passes, no `self.__SW_MANIFEST__` token left in
the output, the offline-privacy bodies are present in the bundle, full test
suite (329) and eslint pass. Live registration still needs a `next start`
smoke check by a human with a browser.
