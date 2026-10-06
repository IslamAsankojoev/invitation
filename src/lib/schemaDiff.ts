/**
 * Слепок формата приглашения (JSON Schema из Zod) и сравнение слепков: что изменилось и какую часть версии
 * поднимать. Нужен тесту-сторожу tests/unit/schemaVersion.test.ts и скрипту scripts/schema-snapshot.ts; в
 * приложение не попадает. Правило версий — lib/migrations.ts и AGENTS.md.
 */
import { zodToJsonSchema } from "zod-to-json-schema";
import type { SemverPart } from "./migrations";
import { invitationDataObject } from "./schema";

type Node = Record<string, unknown>;

/** Слепок: что принимает формат на входе (поля со значением по умолчанию — необязательные). */
export function invitationJsonSchema(): Node {
  const schema = zodToJsonSchema(invitationDataObject, { effectStrategy: "input", $refStrategy: "none" }) as Node;
  delete schema.$schema;
  return canonical(schema) as Node;
}

/** Ключи по алфавиту — слепок в git не «дрожит» и сравнивается строкой. */
export function canonical(v: unknown): unknown {
  if (Array.isArray(v)) return v.map(canonical);
  if (v && typeof v === "object") return Object.fromEntries(Object.keys(v).sort().map((k) => [k, canonical((v as Node)[k])]));
  return v;
}

const same = (a: unknown, b: unknown) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));

/** Изменение формата: major — старые данные могут не пройти или поменять смысл, minor — только расширение. */
export type SchemaChange = { path: string; level: Exclude<SemverPart, "patch">; what: string };

/** Ключи, которые разбираются явно; изменение любого другого — «неизвестное», считаем мажорным. */
const HANDLED = new Set([
  "type",
  "enum",
  "const",
  "default",
  "properties",
  "required",
  "additionalProperties",
  "items",
  "anyOf",
  "oneOf",
  "minimum",
  "exclusiveMinimum",
  "minLength",
  "minItems",
  "maximum",
  "exclusiveMaximum",
  "maxLength",
  "maxItems",
  "pattern",
  "format",
]);
/** Нижние границы: выросла — старые значения могут не пройти. */
const LOWER = ["minimum", "exclusiveMinimum", "minLength", "minItems"];
/** Верхние границы: уменьшилась — старые значения могут не пройти. */
const UPPER = ["maximum", "exclusiveMaximum", "maxLength", "maxItems"];

const show = (v: unknown) => JSON.stringify(v);
const join = (path: string, key: string) => (path ? `${path}.${key}` : key);

/** Все изменения от слепка old к слепку next. */
export function diffSchemas(old: Node, next: Node, path = ""): SchemaChange[] {
  const out: SchemaChange[] = [];
  const add = (level: SchemaChange["level"], what: string, at = path) => out.push({ path: at || "(корень)", level, what });
  if (same(old, next)) return out;

  if (!same(old.type, next.type)) add("major", `тип ${show(old.type)} → ${show(next.type)}`);
  if (!same(old.const, next.const)) add("major", `значение ${show(old.const)} → ${show(next.const)}`);
  if (!same(old.pattern, next.pattern)) add("major", "изменился шаблон строки (pattern)");
  if (!same(old.format, next.format)) add("major", "изменился формат строки (format)");

  // Значение по умолчанию: старые данные без поля получат другое значение — смысл меняется.
  if ("default" in old && !same(old.default, next.default)) {
    add("major", "default" in next ? `значение по умолчанию ${show(old.default)} → ${show(next.default)}` : "убрано значение по умолчанию");
  }

  // Списки допустимых значений.
  if (Array.isArray(old.enum) || Array.isArray(next.enum)) {
    const [a, b] = [(old.enum ?? []) as unknown[], (next.enum ?? []) as unknown[]];
    const removed = a.filter((v) => !b.some((w) => same(v, w)));
    const added = b.filter((v) => !a.some((w) => same(v, w)));
    if (!Array.isArray(next.enum)) add("minor", "снят список допустимых значений");
    else if (!Array.isArray(old.enum)) add("major", "появился список допустимых значений");
    else {
      if (removed.length) add("major", `убраны значения ${removed.map(show).join(", ")}`);
      if (added.length) add("minor", `добавлены значения ${added.map(show).join(", ")}`);
    }
  }

  for (const key of LOWER) {
    const [a, b] = [old[key] as number | undefined, next[key] as number | undefined];
    if (a === b) continue;
    if (b !== undefined && (a === undefined || b > a)) add("major", `${key} ${a ?? "нет"} → ${b} (сужение)`);
    else add("minor", `${key} ${a} → ${b ?? "нет"} (расширение)`);
  }
  for (const key of UPPER) {
    const [a, b] = [old[key] as number | undefined, next[key] as number | undefined];
    if (a === b) continue;
    if (b !== undefined && (a === undefined || b < a)) add("major", `${key} ${a ?? "нет"} → ${b} (сужение)`);
    else add("minor", `${key} ${a} → ${b ?? "нет"} (расширение)`);
  }

  // Поля объекта.
  const [pa, pb] = [(old.properties ?? {}) as Record<string, Node>, (next.properties ?? {}) as Record<string, Node>];
  const [ra, rb] = [new Set((old.required ?? []) as string[]), new Set((next.required ?? []) as string[])];
  for (const key of Object.keys(pa)) {
    if (!(key in pb)) add("major", "поле удалено (или переименовано)", join(path, key));
  }
  for (const key of Object.keys(pb)) {
    const at = join(path, key);
    if (!(key in pa)) {
      if (rb.has(key)) add("major", "новое обязательное поле — у старых данных его нет (дайте .default())", at);
      else add("minor", "новое поле", at);
      continue;
    }
    if (!ra.has(key) && rb.has(key)) add("major", "поле стало обязательным", at);
    if (ra.has(key) && !rb.has(key)) add("minor", "поле стало необязательным", at);
    out.push(...diffSchemas(pa[key], pb[key], at));
  }

  // Словари (textStyles) и запрет лишних полей.
  const [aa, ab] = [old.additionalProperties, next.additionalProperties];
  if (aa && typeof aa === "object" && ab && typeof ab === "object") out.push(...diffSchemas(aa as Node, ab as Node, join(path, "*")));
  else if (!same(aa, ab)) add(ab === false ? "major" : "minor", `additionalProperties ${show(aa)} → ${show(ab)}`);

  // Элементы массива.
  if (old.items && next.items && !Array.isArray(old.items)) out.push(...diffSchemas(old.items as Node, next.items as Node, join(path, "[]")));
  else if (!same(old.items, next.items)) add("major", "изменились элементы массива");

  // Варианты (блоки по type): сопоставляем по значению type, иначе по позиции.
  for (const key of ["anyOf", "oneOf"] as const) {
    if (!old[key] && !next[key]) continue;
    const [va, vb] = [(old[key] ?? []) as Node[], (next[key] ?? []) as Node[]];
    const tag = (v: Node, i: number) => {
      const t = (v.properties as Record<string, Node> | undefined)?.type?.const;
      return t === undefined ? `#${i}` : String(t);
    };
    const mb = new Map(vb.map((v, i) => [tag(v, i), v]));
    const ma = new Map(va.map((v, i) => [tag(v, i), v]));
    for (const [t, v] of ma) {
      const w = mb.get(t);
      if (!w) add("major", `убран вариант «${t}»`);
      else out.push(...diffSchemas(v, w, join(path, t)));
    }
    for (const t of mb.keys()) if (!ma.has(t)) add("minor", `добавлен вариант «${t}»`);
  }

  // Всё остальное — не умеем оценить: осторожно считаем мажорным, пусть человек решит.
  for (const key of new Set([...Object.keys(old), ...Object.keys(next)])) {
    if (!HANDLED.has(key) && !same(old[key], next[key])) add("major", `неизвестное изменение «${key}» — проверь вручную`);
  }
  return out;
}

/** Какую часть версии нужно поднять минимум (null — формат не изменился). */
export function requiredBump(changes: SchemaChange[]): Exclude<SemverPart, "patch"> | null {
  if (changes.some((c) => c.level === "major")) return "major";
  return changes.length ? "minor" : null;
}

/** Сообщение для разработчика: что изменилось и что делать. */
export function describeChanges(changes: SchemaChange[]): string {
  return changes.map((c) => `  ${c.level === "major" ? "МАЖОР" : "минор"}  ${c.path}: ${c.what}`).join("\n");
}
