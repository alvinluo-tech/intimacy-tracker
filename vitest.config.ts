import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["__tests__/**/*.test.ts"],
    setupFiles: ["__tests__/setup.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "json-summary"],
      include: ["src/lib/**/*.{ts,tsx}", "src/stores/**/*.ts"],
      exclude: ["src/lib/supabase/**", "src/lib/report/fonts.ts"],
    },
    deps: {
      inline: ["server-only"],
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "server-only": path.resolve(__dirname, "__tests__/__mocks__/server-only.ts"),
    },
  },
});
