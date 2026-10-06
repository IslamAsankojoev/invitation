import { describe, expect, it } from "vitest";
import { bumpOf, compareSemver, migrateInvitation, type Migration, SCHEMA_VERSION } from "@/lib/migrations";
import { invitationDataSchema } from "@/lib/schema";
import { diffSchemas, requiredBump } from "@/lib/schemaDiff";

describe("semver", () => {
  it("сравнивает числами, а не строками", () => {
    expect(compareSemver("1.10.0", "1.9.0")).toBe(1);
    expect(compareSemver("2.0.0", "10.0.0")).toBe(-1);
    expect(compareSemver("1.2.3", "1.2.3")).toBe(0);
    expect(() => compareSemver("v1", "1.0.0")).toThrow(/1\.2\.3/);
  });

  it("определяет, какая часть версии выросла", () => {
    expect(bumpOf("1.2.3", "2.0.0")).toBe("major");
    expect(bumpOf("1.2.3", "1.3.0")).toBe("minor");
    expect(bumpOf("1.2.3", "1.2.4")).toBe("patch");
    expect(bumpOf("1.2.3", "1.2.3")).toBeNull();
  });
});

describe("миграции приглашения", () => {
  const list: Migration[] = [
    { to: "2.0.0", why: "переименовали music.loop → music.repeat", up: (d) => ({ ...d, step2: true }) },
    { to: "3.0.0", why: "ещё что-то", up: (d) => ({ ...d, step3: (d as { step2?: boolean }).step2 === true }) },
  ];

  it("без версии — это 1.0.0: выполняются все миграции по порядку, ставится текущая версия", () => {
    expect(migrateInvitation({ a: 1 }, list, "3.0.0")).toEqual({ a: 1, step2: true, step3: true, schemaVersion: "3.0.0" });
  });

  it("выполняются только миграции новее версии данных", () => {
    expect(migrateInvitation({ schemaVersion: "2.1.0" }, list, "3.0.0")).toEqual({ schemaVersion: "3.0.0", step3: false });
    expect(migrateInvitation({ schemaVersion: "1.4.0" }, list, "2.3.0")).toEqual({ schemaVersion: "2.3.0", step2: true });
  });

  it("данные из будущей версии (откат деплоя) не трогает, не объект — возвращает как есть", () => {
    const future = { schemaVersion: "9.0.0", x: 1 };
    expect(migrateInvitation(future, list, "3.0.0")).toBe(future);
    expect(migrateInvitation(null, list)).toBeNull();
    expect(migrateInvitation([1], list)).toEqual([1]);
  });

  it("не мутирует вход", () => {
    const input = { schemaVersion: "1.0.0" };
    migrateInvitation(input, list, "3.0.0");
    expect(input).toEqual({ schemaVersion: "1.0.0" });
  });

  it("схема приглашения сама применяет миграции и проставляет текущую версию", () => {
    const old = {
      theme: { palette: "blush", font: "serif", background: null, decor: { type: "none", color: "#ffffff", density: 0 } },
      music: { url: null, loop: true },
      blocks: [{ type: "hero", visible: true, names: "А & Б", date: "2027-06-19T16:00" }],
    };
    expect(invitationDataSchema.parse(old).schemaVersion).toBe(SCHEMA_VERSION);
    expect(invitationDataSchema.safeParse({ ...old, schemaVersion: "v2" }).success).toBe(true); // кривая версия → 1.0.0
  });
});

describe("сравнение слепков формата", () => {
  const base = {
    type: "object",
    properties: {
      palette: { type: "string", enum: ["cream", "night"] },
      size: { type: "number", minimum: 40, maximum: 400 },
      motion: { type: "string", default: "auto" },
      blocks: {
        type: "array",
        items: { anyOf: [{ type: "object", properties: { type: { type: "string", const: "hero" } }, required: ["type"] }] },
      },
    },
    required: ["palette", "size"],
  };
  const change = (patch: (s: typeof base) => void) => {
    const next = structuredClone(base);
    patch(next);
    return requiredBump(diffSchemas(base, next));
  };

  it("без изменений — версию не трогать", () => {
    expect(diffSchemas(base, structuredClone(base))).toEqual([]);
    expect(change(() => {})).toBeNull();
  });

  it("минор: новое необязательное поле, новое значение в списке, новый тип блока, расширение границ", () => {
    expect(change((s) => Object.assign(s.properties, { pop: { type: "boolean" } }))).toBe("minor");
    expect(change((s) => s.properties.palette.enum.push("sand"))).toBe("minor");
    expect(change((s) => s.properties.blocks.items.anyOf.push({ type: "object", properties: { type: { type: "string", const: "gallery" } }, required: ["type"] }))).toBe("minor");
    expect(change((s) => (s.properties.size.maximum = 600))).toBe("minor");
  });

  it("мажор: поле удалено, тип сменился, значение убрано из списка, границы сужены, default поменялся, новое обязательное поле", () => {
    expect(change((s) => delete (s.properties as Record<string, unknown>).size)).toBe("major");
    expect(change((s) => (s.properties.size.type = "string"))).toBe("major");
    expect(change((s) => (s.properties.palette.enum = ["cream"]))).toBe("major");
    expect(change((s) => (s.properties.size.minimum = 50))).toBe("major");
    expect(change((s) => (s.properties.motion.default = "fade"))).toBe("major");
    expect(change((s) => {
      Object.assign(s.properties, { id: { type: "string" } });
      s.required.push("id");
    })).toBe("major");
    expect(change((s) => (s.properties.blocks.items.anyOf = []))).toBe("major");
  });

  it("путь к изменению понятен: блоки — по типу", () => {
    const next = structuredClone(base);
    Object.assign(next.properties.blocks.items.anyOf[0].properties, { photo: { type: "string" } });
    expect(diffSchemas(base, next)).toEqual([{ path: "blocks.[].hero.photo", level: "minor", what: "новое поле" }]);
  });
});
