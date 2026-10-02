import path from "node:path";
import { defineConfig } from "vitest/config";

const TEST_DB = "postgresql://postgres:postgres@localhost:5433/wedding_test";

export default defineConfig({
  esbuild: { jsx: "automatic" },
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: {
    globals: true,
    include: ["tests/{unit,components,api}/**/*.test.{ts,tsx}"],
    setupFiles: ["tests/setup.ts"],
    globalSetup: ["tests/global-setup.ts"],
    // API-тесты работают с отдельной базой локального Postgres (docker compose up -d); global-setup применяет миграции.
    env: { DATABASE_URL: TEST_DB, DIRECT_URL: TEST_DB },
    fileParallelism: false,
  },
});
