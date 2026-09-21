import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Syncing external state (localStorage, media queries, third-party widget
      // config) into React state on mount is the established pattern in this
      // codebase; the rule flags all of them but they are deliberate.
      "react-hooks/set-state-in-effect": "warn",
    },
  },
  {
    files: ["src/app/sw.ts"],
    rules: {
      // The SW bundle runs in a WebWorker lib context excluded from tsconfig;
      // @ts-nocheck is the only viable way to compile it in this setup.
      "@typescript-eslint/ban-ts-comment": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Standalone Node scripts and generated build artifacts:
    "scripts/**",
    "public/sw.js",
    "public/workbox-*.js",
  ]),
]);

export default eslintConfig;
