/**
 * Сторож версии формата приглашения. Упал — формат изменился: прочитай сообщение, подними SCHEMA_VERSION
 * (src/lib/migrations.ts), при мажорной — напиши миграцию, затем `npm run schema:snapshot`. Правило — AGENTS.md.
 */
import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { bumpOf, compareSemver, migrations, SCHEMA_VERSION, SEMVER } from "@/lib/migrations";
import { describeChanges, diffSchemas, invitationJsonSchema, requiredBump } from "@/lib/schemaDiff";

const HISTORY = path.join(process.cwd(), "src/lib/schema-history");
const versions = readdirSync(HISTORY)
  .filter((f) => f.endsWith(".json"))
  .map((f) => f.replace(/\.json$/, ""))
  .sort(compareSemver);
const snapshot = (v: string) => JSON.parse(readFileSync(path.join(HISTORY, `${v}.json`), "utf8"));
const RANK = { patch: 0, minor: 1, major: 2 } as const;

describe("версия формата приглашения", () => {
  it("SCHEMA_VERSION — semver, слепок этой версии записан и она последняя", () => {
    expect(SCHEMA_VERSION).toMatch(SEMVER);
    expect(versions, `Нет слепка ${SCHEMA_VERSION} — запусти npm run schema:snapshot`).toContain(SCHEMA_VERSION);
    expect(versions.at(-1), "Есть слепок новее SCHEMA_VERSION — версию откатили?").toBe(SCHEMA_VERSION);
  });

  it("формат совпадает со слепком текущей версии (иначе — подними версию)", () => {
    const changes = diffSchemas(snapshot(SCHEMA_VERSION), invitationJsonSchema());
    const need = requiredBump(changes);
    const hint =
      need === "major"
        ? "Подними МАЖОРНУЮ версию и напиши миграцию в src/lib/migrations.ts"
        : "Подними минорную версию в src/lib/migrations.ts (миграция не нужна)";
    expect(
      changes,
      `Формат приглашения изменился, а SCHEMA_VERSION осталась ${SCHEMA_VERSION}:\n${describeChanges(changes)}\n\n${hint}, затем npm run schema:snapshot. Правило — AGENTS.md, «Версия формата приглашения».`,
    ).toEqual([]);
  });

  it("каждая версия в истории поднята не меньше, чем требуют изменения; у мажорных есть миграция", () => {
    for (let i = 1; i < versions.length; i++) {
      const [prev, next] = [versions[i - 1], versions[i]];
      const changes = diffSchemas(snapshot(prev), snapshot(next));
      const need = requiredBump(changes);
      const done = bumpOf(prev, next)!;
      if (need) {
        expect(RANK[done], `${prev} → ${next}: поднята ${done}, а изменения требуют ${need}:\n${describeChanges(changes)}`).toBeGreaterThanOrEqual(RANK[need]);
      }
      if (done === "major") {
        expect(migrations.map((m) => m.to), `Нет миграции для мажорной версии ${next}`).toContain(next);
      }
    }
  });

  it("миграции — только в мажорные версии, по возрастанию, не новее текущей", () => {
    const tos = migrations.map((m) => m.to);
    expect([...tos].sort(compareSemver)).toEqual(tos);
    for (const to of tos) {
      expect(to).toMatch(/^\d+\.0\.0$/);
      expect(compareSemver(to, SCHEMA_VERSION)).toBeLessThanOrEqual(0);
      expect(versions, `Миграция в ${to}, а слепка ${to} нет`).toContain(to);
    }
  });
});
