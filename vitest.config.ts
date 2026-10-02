import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
  esbuild: { jsx: "automatic" },
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: {
    globals: true,
    include: ["tests/{unit,components,api}/**/*.test.{ts,tsx}"],
    setupFiles: ["tests/setup.ts"],
    globalSetup: ["tests/global-setup.ts"],
    // API-тесты работают с отдельной SQLite-базой, которую global-setup пересоздаёт перед прогоном.
    env: { DATABASE_URL: "file:./test.db" },
    fileParallelism: false,
  },
});
