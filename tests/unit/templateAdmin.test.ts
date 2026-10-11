import { describe, expect, it } from "vitest";
import { adminAvailable, adminKeyValid } from "@/lib/admin";
import { parseVideoName, VIDEO_NAME, videoFileName } from "@/lib/adminFiles";
import { findBlock, toggleBlock, updateBlock } from "@/lib/blocks";
import { invitationDataSchema } from "@/lib/schema";
import { copyTemplate, replaceUrls, sameAsTemplate, templateFromInvitation } from "@/lib/templateAdmin";
import { baseTemplates, createFromTemplate, findTemplate, mergeTemplates } from "@/lib/templates";

const KEY = "0123456789abcdef0123";

describe("доступ к админке", () => {
  it("нужен ADMIN_KEY не короче 16 символов и не Vercel", () => {
    expect(adminAvailable({ ADMIN_KEY: KEY })).toBe(true);
    expect(adminAvailable({ ADMIN_KEY: "short" })).toBe(false);
    expect(adminAvailable({})).toBe(false);
    expect(adminAvailable({ ADMIN_KEY: KEY, VERCEL: "1" })).toBe(false);
  });

  it("ключ сверяется целиком", () => {
    expect(adminKeyValid(KEY, { ADMIN_KEY: KEY })).toBe(true);
    expect(adminKeyValid(KEY.slice(0, -1), { ADMIN_KEY: KEY })).toBe(false);
    expect(adminKeyValid(KEY, { ADMIN_KEY: KEY, VERCEL: "1" })).toBe(false);
  });
});

describe("шаблон из приглашения", () => {
  const mocha = findTemplate("mocha")!;

  it("новое приглашение по сохранённому шаблону — такое же, как черновик (тема, музыка, блоки и их порядок)", () => {
    let draft = createFromTemplate(mocha);
    draft = toggleBlock(updateBlock(draft, "hero", { names: "Мария & Пётр", edgeTop: "wave" }), "b-gallery");
    draft = { ...draft, theme: { ...draft.theme, palette: "night" }, music: { ...draft.music, url: "/music/a-thousand-years.mp3" } };
    // Через JSON, как в template-overrides.json: пустые поля там пропадают.
    const saved = JSON.parse(JSON.stringify(templateFromInvitation(mocha, draft)));
    const again = createFromTemplate(saved);
    expect(invitationDataSchema.safeParse(again).success).toBe(true);
    expect(sameAsTemplate(saved, draft)).toBe(true);
    expect(findBlock(again, "hero")).toMatchObject({ names: "Мария & Пётр", edgeTop: "wave" });
    expect(again.blocks.find((b) => b.type === "gallery")!.visible).toBe(false);
    expect(again.theme.palette).toBe("night");
    expect(again.music.url).toBe("/music/a-thousand-years.mp3");
    // Название и описание — прежние; вход не мутирован.
    expect(saved).toMatchObject({ id: "mocha", name: mocha.name, description: mocha.description });
    expect(findBlock(createFromTemplate(mocha), "hero")!.names).toBe("Санжар & Мадина");
  });

  it("пустые поля после сохранения остаются пустыми — пример шаблона их не заполняет", () => {
    for (const t of [mocha, findTemplate("lago")!, findTemplate("cream-classic")!]) {
      const draft = updateBlock(createFromTemplate(t), "hero", { subtitle: undefined, label: undefined });
      const saved = JSON.parse(JSON.stringify(templateFromInvitation(t, draft)));
      expect(sameAsTemplate(saved, draft), t.id).toBe(true);
      const hero = findBlock(createFromTemplate(saved), "hero")!;
      expect([hero.subtitle, hero.label], t.id).toEqual([undefined, undefined]);
    }
  });

  it("цвета дресс-кода — из блока дресс-кода", () => {
    const draft = updateBlock(createFromTemplate(mocha), "dresscode", { colors: ["#111111", "#222222"] });
    expect(templateFromInvitation(mocha, draft).dresscodeColors).toEqual(["#111111", "#222222"]);
  });

  it("правка видна как отличие от шаблона, порядок ключей (jsonb) — нет", () => {
    const draft = createFromTemplate(mocha);
    expect(sameAsTemplate(mocha, draft)).toBe(true);
    // Ключи в обратном порядке на всех уровнях — как после чтения из jsonb.
    const reverse = (v: unknown): unknown =>
      Array.isArray(v) ? v.map(reverse) : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).reverse().map(([k, x]) => [k, reverse(x)])) : v;
    expect(sameAsTemplate(mocha, reverse(draft) as typeof draft)).toBe(true);
    expect(sameAsTemplate(mocha, updateBlock(draft, "hero", { names: "Другие" }))).toBe(false);
  });

  it("новые адреса фото подставляются везде, вход не мутируется", () => {
    const draft = updateBlock(createFromTemplate(mocha), "hero", { photo: "/uploads/a.webp" });
    const next = replaceUrls(draft, { "/uploads/a.webp": "/templates/mocha-1.webp" });
    expect(findBlock(next, "hero")!.photo).toBe("/templates/mocha-1.webp");
    expect(findBlock(draft, "hero")!.photo).toBe("/uploads/a.webp");
  });

  it("копия — под свободным id и с пометкой в названии", () => {
    const copy = copyTemplate(mocha, ["mocha", "mocha-2"]);
    expect(copy).toMatchObject({ id: "mocha-3", name: "Шоколад и сургуч (копия)" });
    expect(copyTemplate(copy, ["mocha-2", "mocha-3"]).id).toBe("mocha-4");
  });
});

describe("правки шаблонов (template-overrides.json)", () => {
  it("правка заменяет шаблон из кода, новый встаёт в конец, битая — пропускается", () => {
    const mocha = baseTemplates.find((t) => t.id === "mocha")!;
    const edited = { ...mocha, name: "Шоколад 2.0" };
    const added = copyTemplate(mocha, ["mocha"]);
    const broken = { ...copyTemplate(mocha, ["mocha", "mocha-2"]), theme: { ...mocha.theme, palette: "nope" } } as never;
    const merged = mergeTemplates(baseTemplates, { edited: { mocha: edited }, added: [added, broken] });
    expect(merged).toHaveLength(baseTemplates.length + 1);
    expect(merged.find((t) => t.id === "mocha")!.name).toBe("Шоколад 2.0");
    expect(merged.at(-1)!.id).toBe("mocha-2");
  });
});

describe("имена роликов", () => {
  it("шаблон, дата и вид кадра — в имени; старые <шаблон>.mp4 тоже читаются", () => {
    const name = videoFileName("mocha", true, new Date(2026, 9, 12, 14, 3, 9));
    expect(name).toBe("mocha--2026-10-12_14-03-09--full.mp4");
    expect(VIDEO_NAME.test(name)).toBe(true);
    expect(parseVideoName(name)).toEqual({ templateId: "mocha", fullscreen: true });
    expect(parseVideoName("cream-classic.mp4")).toEqual({ templateId: "cream-classic", fullscreen: false });
    for (const bad of ["../x.mp4", "a/b.mp4", ".env", "x.mov"]) expect(VIDEO_NAME.test(bad), bad).toBe(false);
  });
});
