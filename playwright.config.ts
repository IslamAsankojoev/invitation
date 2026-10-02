import { defineConfig, devices } from "@playwright/test";

const PORT = 3100;

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
    command: `npx prisma db push --skip-generate && npx next dev -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    // Вход через Google выключен (пустые ключи перекрывают .env): сценарий идёт по секретной ссылке редактора.
    env: { DATABASE_URL: "file:./e2e.db", NEXT_DIST_DIR: ".next-e2e", AUTH_GOOGLE_ID: "", AUTH_GOOGLE_SECRET: "" },
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
});
