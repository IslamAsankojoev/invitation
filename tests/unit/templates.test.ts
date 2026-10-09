import { existsSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { findBlock, moveBlock, toggleBlock, updateBlock } from "@/lib/blocks";
import { createDefaultInvitation } from "@/lib/defaults";
import { invitationDataSchema, type InvitationData } from "@/lib/schema";
import { applyTemplate, createBlock, createFromTemplate, findTemplate, templates } from "@/lib/templates";

/** Все URL картинок, на которые ссылается приглашение: украшения, фоны блоков и фото-примеры. */
function imageUrls(data: InvitationData): string[] {
  return [
    data.theme.decor.image,
    data.theme.envelope.ornament,
    ...data.blocks.flatMap((b) => [
      ...b.ornaments.map((o) => o.src),
      b.bgImage,
      "photo" in b ? b.photo : null,
      ...(b.type === "gallery" ? b.photos : []),
    ]),
  ].filter((u): u is string => !!u);
}

describe("шаблоны", () => {
  it("их двенадцать, id уникальны", () => {
    expect(templates).toHaveLength(12);
    expect(new Set(templates.map((t) => t.id)).size).toBe(12);
  });

  it.each(templates.map((t) => [t.name, t] as const))("«%s» проходит схему и ссылается только на существующие картинки", (_, t) => {
    const data = createFromTemplate(t);
    expect(invitationDataSchema.safeParse(data).success).toBe(true);
    for (const url of imageUrls(data)) {
      expect(existsSync(path.join(process.cwd(), "public", url)), url).toBe(true);
    }
  });

  it("шаблоны действительно разные: палитра не повторяется, как и сочетание палитра/шрифт/текстура", () => {
    // Шрифт имён может повторяться: изящных рукописных с кириллицей мало (Great Vibes, Comforter…).
    const keys = templates.map((t) => [t.theme.palette, t.theme.font, t.theme.texture].join("/"));
    expect(new Set(templates.map((t) => t.theme.palette)).size).toBe(templates.length);
    expect(new Set(keys).size).toBe(templates.length);
  });

  it("приглашение по умолчанию — первый шаблон", () => {
    expect(createDefaultInvitation()).toEqual(createFromTemplate(templates[0]));
    expect(findTemplate("starry-night")?.name).toBe("Звёздная ночь");
    expect(findTemplate("nope")).toBeUndefined();
  });
});

describe("applyTemplate", () => {
  // Приглашение, которое пользователь уже настроил: свои тексты, фото, порядок, скрытый блок, музыка.
  function customized(): InvitationData {
    let data = createDefaultInvitation();
    data = updateBlock(data, "hero", { names: "Мария & Пётр", date: "2027-09-01T15:00", photo: "/uploads/couple.jpg" });
    data = updateBlock(data, "program", { title: "Наш день", items: [{ time: "12:00", title: "Сбор" }] });
    data = updateBlock(data, "location", { placeName: "Шато", photo: "/uploads/hall.jpg" });
    data = toggleBlock(data, "story");
    data = moveBlock(data, 4, 1);
    return { ...data, music: { url: "/uploads/song.mp3", loop: false }, theme: { ...data.theme, background: "/uploads/bg.jpg" } };
  }

  it("меняет оформление: тему, фоны, украшения блоков и цвета дресс-кода", () => {
    const night = findTemplate("starry-night")!;
    const result = applyTemplate(customized(), night);
    expect(result.theme).toMatchObject({ palette: "night", font: "poiret", texture: "stars" });
    expect(result.theme.decor).toEqual(night.theme.decor);
    expect(findBlock(result, "calendar")).toMatchObject({ surface: "card", surfaceOpacity: 0.12 });
    expect(findBlock(result, "hero")!.ornaments.map((o) => o.src)).toContain("/library/white-roses.webp");
    // В ночном шаблоне у дресс-кода нет украшений — старые сухоцветы убираются.
    expect(findBlock(result, "dresscode")!.ornaments).toEqual([]);
    expect(findBlock(result, "dresscode")!.colors).toEqual(night.dresscodeColors);
  });

  it("сохраняет содержимое: тексты, фото, музыку, фоновое фото, порядок, видимость и заголовки", () => {
    const before = customized();
    const result = applyTemplate(before, findTemplate("rose-garden")!);
    expect(result.blocks.map((b) => b.type)).toEqual(before.blocks.map((b) => b.type));
    expect(result.blocks.map((b) => b.visible)).toEqual(before.blocks.map((b) => b.visible));
    expect(findBlock(result, "hero")).toMatchObject({ names: "Мария & Пётр", date: "2027-09-01T15:00", photo: "/uploads/couple.jpg" });
    expect(findBlock(result, "program")).toMatchObject({ title: "Наш день", items: [{ time: "12:00", title: "Сбор" }] });
    expect(findBlock(result, "location")).toMatchObject({ placeName: "Шато", photo: "/uploads/hall.jpg" });
    expect(result.music).toEqual(before.music);
    expect(result.theme.background).toBe("/uploads/bg.jpg");
    expect(invitationDataSchema.safeParse(result).success).toBe(true);
  });

  it("задаёт виды блоков и появление, а шаблон без видов возвращает «классику»", () => {
    const deco = applyTemplate(customized(), findTemplate("art-deco")!);
    expect(findBlock(deco, "hero")!.variant).toBe("minimal");
    expect(findBlock(deco, "calendar")!.variant).toBe("tearoff");
    expect(findBlock(deco, "story")!.entrance).toBe("blur");

    const back = applyTemplate(deco, findTemplate("cream-classic")!);
    expect(back.blocks.every((b) => b.variant === "classic" && b.entrance === "auto")).toBe(true);
  });

  it("не мутирует ни приглашение, ни сам шаблон", () => {
    const before = customized();
    const snapshot = structuredClone(before);
    const template = findTemplate("golden-autumn")!;
    const templateSnapshot = structuredClone(template);

    const result = applyTemplate(before, template);
    result.theme.decor.density = 60;
    findBlock(result, "hero")!.ornaments[0].size = 400;
    findBlock(result, "dresscode")!.colors.push("#000000");

    expect(before).toEqual(snapshot);
    expect(template).toEqual(templateSnapshot);
  });

  it("повторное применение того же шаблона ничего не меняет", () => {
    const t = findTemplate("rose-garden")!;
    const once = applyTemplate(customized(), t);
    expect(applyTemplate(once, t)).toEqual(once);
  });
});

describe("createBlock", () => {
  it("новый блок — с примером содержимого, уникальным id и валидный", () => {
    const data = createFromTemplate(templates[0]);
    for (const type of ["text", "photo", "gallery", "contacts", "story", "program"] as const) {
      const block = createBlock(data, type);
      expect(block.type).toBe(type);
      expect(data.blocks.some((b) => b.id === block.id)).toBe(false);
      expect(invitationDataSchema.safeParse({ ...data, blocks: [...data.blocks, block] }).success).toBe(true);
    }
    expect(createBlock(data, "photo").width).toBe("full");
  });

  it("пресет задаёт заголовок, значок и текст блока «Текст»", () => {
    const block = createBlock(createFromTemplate(templates[0]), "text", "gifts");
    expect(block).toMatchObject({ type: "text", title: "Подарки", icon: "gift" });
  });

  it("оформление — как у блока того же типа, иначе как в шаблоне по теме", () => {
    const rose = findTemplate("rose-garden")!;
    let data = createFromTemplate(rose);
    const story = createBlock(data, "story");
    expect(story).toMatchObject({ surface: findBlock(data, "story")!.surface, ornaments: findBlock(data, "story")!.ornaments });
    data = updateBlock(data, "program", { surface: "scroll", variant: "cards" });
    expect(createBlock(data, "program")).toMatchObject({ surface: "scroll", variant: "cards" });
    // Шаблон не задаёт оформление «Тексту» — блок без фона и украшений.
    expect(createBlock(data, "text")).toMatchObject({ surface: "plain", ornaments: [], variant: "classic" });
  });

  it("applyTemplate сохраняет добавленные блоки и оформляет их по типу", () => {
    let data = createFromTemplate(templates[0]);
    data = { ...data, blocks: [...data.blocks, { ...createBlock(data, "story"), id: "story-2" }, createBlock(data, "gallery")] };
    const result = applyTemplate(data, findTemplate("rose-garden")!);
    expect(result.blocks.map((b) => b.id)).toEqual(data.blocks.map((b) => b.id));
    expect(result.blocks.find((b) => b.id === "story-2")!.surface).toBe(findBlock(result, "story")!.surface);
    expect(invitationDataSchema.safeParse(result).success).toBe(true);
  });
});

describe("шаблоны со своей структурой", () => {
  const withLayout = templates.filter((t) => t.layout);

  it("новое приглашение получает структуру шаблона: блоки по порядку, id «b-<тип>», повторы — с номером", () => {
    expect(withLayout.length).toBeGreaterThanOrEqual(4);
    for (const t of withLayout) {
      const data = createFromTemplate(t);
      expect(data.blocks.map((b) => b.type), t.id).toEqual(t.layout!.map((b) => b.type));
      expect(new Set(data.blocks.map((b) => b.id)).size).toBe(data.blocks.length);
      expect(data.blocks[0].id).toBe("b-hero");
    }
    const lago = createFromTemplate(findTemplate("lago")!);
    expect(lago.blocks.filter((b) => b.type === "photo").map((b) => b.id)).toEqual(["b-photo", "b-photo-2"]);
    expect(findBlock(lago, "hero")).toMatchObject({ names: "Камила & Нурсултан", photo: "/templates/lago-walk.webp", edgeBottom: "torn" });
  });

  it("смена шаблона раздаёт оформление по номеру блока своего типа, а содержимое и число блоков сохраняет", () => {
    const mocha = findTemplate("mocha")!;
    const before = createFromTemplate(findTemplate("lago")!);
    const result = applyTemplate(before, mocha);
    expect(result.blocks.map((b) => b.id)).toEqual(before.blocks.map((b) => b.id));
    // Первый «Текст» шаблона — полоса цвета латте во всю ширину, второй — цитата на шёлке (у него тексты свои).
    const texts = result.blocks.filter((b) => b.type === "text");
    expect(texts[0]).toMatchObject({ bgColor: "#e9dfd3", width: "full", title: "Дорогие" });
    expect(texts[1]).toMatchObject({ variant: "card", bgColor: null });
    // Фоновая картинка — содержимое: шаблон её не переносит.
    expect(texts[1].bgImage).toBeNull();
    // Анкета шаблона — шоколадная, с сургучом; дата ответа — своя.
    expect(findBlock(result, "rsvp")).toMatchObject({ bgColor: "#3b2b21", deadline: "2027-05-15" });
    expect(findBlock(result, "rsvp")!.ornaments.map((o) => o.src)).toEqual(["/library/wax-seal.svg"]);
    // Блоки, которых в структуре нет, — оформление «без шаблона».
    const lagoOnDefault = applyTemplate(createDefaultInvitation(), findTemplate("lago")!);
    expect(findBlock(lagoOnDefault, "story")).toMatchObject({ surface: "plain", bgColor: null, ornaments: [] });
    expect(invitationDataSchema.safeParse(result).success).toBe(true);
  });

  it("возврат к старому шаблону сбрасывает цвет фона и стили надписей", () => {
    const styled = updateBlock(createFromTemplate(findTemplate("mocha")!), "program", { textStyles: { title: { color: "#ff0000" } } });
    const back = applyTemplate(styled, findTemplate("cream-classic")!);
    expect(back.blocks.every((b) => b.bgColor === null)).toBe(true);
    expect(findBlock(back, "program")!.textStyles).toEqual({});
    expect(back.theme.headings).toBe("caps");
  });
});
