/**
 * Записывает слепок формата приглашения для текущей SCHEMA_VERSION: src/lib/schema-history/<версия>.json.
 * Запуск: npm run schema:snapshot. Слепки прошлых версий не трогаем — по ним тест проверяет, что версия
 * поднята правильно. Если слепок этой версии уже есть и формат отличается — значит, забыли поднять версию.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { SCHEMA_VERSION } from "../src/lib/migrations";
import { describeChanges, diffSchemas, invitationJsonSchema, requiredBump } from "../src/lib/schemaDiff";

const file = path.join(process.cwd(), "src/lib/schema-history", `${SCHEMA_VERSION}.json`);
const current = invitationJsonSchema();
const text = JSON.stringify(current, null, 2) + "\n";

if (existsSync(file)) {
  const saved = JSON.parse(readFileSync(file, "utf8"));
  const changes = diffSchemas(saved, current);
  if (!changes.length) {
    console.log(`Слепок ${SCHEMA_VERSION} актуален.`);
    process.exit(0);
  }
  if (!process.argv.includes("--force")) {
    console.error(
      `Формат изменился, а версия осталась ${SCHEMA_VERSION}:\n${describeChanges(changes)}\n\n` +
        `Подними ${requiredBump(changes) === "major" ? "МАЖОРНУЮ версию и напиши миграцию" : "минорную версию"} в src/lib/migrations.ts ` +
        `и запусти снова. (--force перезапишет слепок ${SCHEMA_VERSION} — только если эта версия ещё нигде не выкатывалась.)`,
    );
    process.exit(1);
  }
}
writeFileSync(file, text);
console.log(`Слепок записан: src/lib/schema-history/${SCHEMA_VERSION}.json`);
