import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;
/** Своя база в локальном Postgres (docker-compose.yml) — e2e не трогает данные `npm run dev`. */
const E2E_DB = "postgresql://postgres:postgres@localhost:5433/wedding_e2e";

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 120_000,
  expect: { timeout: 15_000 },
  reporter: "list",
  use: {
    baseURL: `http://localhost:${PORT}`,
    trace: "retain-on-failure",
  },
  projects: [{ name: "mobile", use: { ...devices["Pixel 7"] } }],
  webServer: {
    // Отдельная БД и папка сборки — e2e не трогает данные `npm run dev`.
    command: `npx prisma migrate deploy && npx next dev -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    // Вход через Google выключен (пустые ключи перекрывают .env): сценарий идёт по секретной ссылке редактора.
    env: { DATABASE_URL: E2E_DB, DIRECT_URL: E2E_DB, NEXT_DIST_DIR: ".next-e2e", AUTH_GOOGLE_ID: "", AUTH_GOOGLE_SECRET: "" },
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
