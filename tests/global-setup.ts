import { execSync } from "node:child_process";

// Применяет миграции к тестовой базе (Postgres из docker-compose.yml). Данные API-тесты чистят сами (deleteMany).
export default function setup() {
  const url = process.env.DATABASE_URL ?? "postgresql://postgres:postgres@localhost:5433/wedding_test";
  try {
    execSync("npx prisma migrate deploy", { env: { ...process.env, DATABASE_URL: url, DIRECT_URL: url }, stdio: "pipe" });
  } catch (e) {
    const out = String((e as { stderr?: Buffer }).stderr ?? e);
    throw new Error(`Тестовая база недоступна — запущен ли Postgres? npm run db:up\n${out}`);
  }
}
