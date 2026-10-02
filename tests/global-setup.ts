import { execSync } from "node:child_process";

// Создаёт/синхронизирует схему отдельной тестовой БД. Данные API-тесты чистят сами (deleteMany).
export default function setup() {
  execSync("npx prisma db push --skip-generate", {
    env: { ...process.env, DATABASE_URL: "file:./test.db" },
    stdio: "ignore",
  });
}
