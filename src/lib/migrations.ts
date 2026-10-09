/**
 * Версия формата данных приглашения (InvitationData) и миграции старых данных.
 * ⚠️ Правило — AGENTS.md, раздел «Версия формата приглашения». Коротко:
 *   патч  1.0.x — формат не изменился (поправили сообщение об ошибке, комментарий);
 *   минор 1.x.0 — добавили поле со значением по умолчанию или новое значение в список — миграция не нужна;
 *   мажор x.0.0 — поле удалено/переименовано/сменило тип или смысл, из списка убрано значение, сужены границы,
 *                 поменялось значение по умолчанию — нужна миграция в `migrations`.
 * После изменения схемы: поднять SCHEMA_VERSION → `npm run schema:snapshot` → `npm test`.
 * Тест tests/unit/schemaVersion.test.ts сам сравнит схему со слепком прошлой версии и подскажет, что поднять.
 *
 * Версия — формата приглашений, а не сайта: package.json тут ни при чём.
 */
export const SCHEMA_VERSION = "1.1.0";

/** Приглашения, сохранённые до появления версии, — это формат 1.0.0. */
export const INITIAL_SCHEMA_VERSION = "1.0.0";

export const SEMVER = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;

export type SemverPart = "major" | "minor" | "patch";

export function parseSemver(v: string): [number, number, number] {
  const m = SEMVER.exec(v);
  if (!m) throw new Error(`Неверная версия «${v}» — нужен формат 1.2.3`);
  return [Number(m[1]), Number(m[2]), Number(m[3])];
}

/** Сравнение по числам, а не строкам: 1.10.0 новее 1.9.0. Возвращает −1, 0 или 1. */
export function compareSemver(a: string, b: string): number {
  const [pa, pb] = [parseSemver(a), parseSemver(b)];
  for (let i = 0; i < 3; i++) if (pa[i] !== pb[i]) return pa[i] < pb[i] ? -1 : 1;
  return 0;
}

/** Какая часть версии выросла от a к b (null — версия не выросла). */
export function bumpOf(from: string, to: string): SemverPart | null {
  if (compareSemver(to, from) <= 0) return null;
  const [a, b] = [parseSemver(from), parseSemver(to)];
  return a[0] !== b[0] ? "major" : a[1] !== b[1] ? "minor" : "patch";
}

type Json = Record<string, unknown>;

/**
 * Миграция данных в мажорную версию `to`. `up` получает «сырой» JSON предыдущего формата (до проверки схемой) и
 * возвращает JSON формата `to`; не мутирует вход. Порядок в массиве — по возрастанию версий (тест проверит).
 * Пример:
 *   { to: "2.0.0", why: "размер украшения: px → % ширины блока",
 *     up: (d) => ({ ...d, blocks: d.blocks.map(…) }) }
 */
export type Migration = { to: string; why: string; up: (data: Json) => Json };

export const migrations: Migration[] = [];

/**
 * Приводит сохранённый JSON к текущему формату: выполняет по порядку миграции новее его версии и ставит
 * schemaVersion = SCHEMA_VERSION. Данные из будущей версии (откат деплоя) не трогает. Не объект — как есть
 * (ошибку покажет схема). Встроена в invitationDataSchema — вызывать отдельно не нужно.
 */
export function migrateInvitation(raw: unknown, list: Migration[] = migrations, current = SCHEMA_VERSION): unknown {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return raw;
  const data = raw as Json;
  const from = typeof data.schemaVersion === "string" && SEMVER.test(data.schemaVersion) ? data.schemaVersion : INITIAL_SCHEMA_VERSION;
  if (compareSemver(from, current) > 0) return data;
  let out: Json = data;
  for (const m of list) {
    if (compareSemver(m.to, from) > 0 && compareSemver(m.to, current) <= 0) out = m.up(out);
  }
  return { ...out, schemaVersion: current };
}
