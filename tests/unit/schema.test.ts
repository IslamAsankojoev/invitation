import { describe, expect, it } from "vitest";
import { createDefaultInvitation } from "@/lib/defaults";
import { BODY_FONTS, FONTS, invitationDataSchema, MAX_BLOCKS, TEXTURES } from "@/lib/schema";

describe("invitationDataSchema", () => {
  it("дефолтное приглашение валидно", () => {
    expect(invitationDataSchema.safeParse(createDefaultInvitation()).success).toBe(true);
  });

  it("отклоняет невалидный hex", () => {
    const data = createDefaultInvitation();
    data.theme.decor.color = "red";
    expect(invitationDataSchema.safeParse(data).success).toBe(false);

    const data2 = createDefaultInvitation();
    const dress = data2.blocks.find((b) => b.type === "dresscode")!;
    if (dress.type === "dresscode") dress.colors.push("#12345");
    expect(invitationDataSchema.safeParse(data2).success).toBe(false);
  });

  it("блоков одного типа может быть несколько, но id уникальны, а hero и rsvp — по одному", () => {
    const withBlock = (extra: object) => {
      const data = createDefaultInvitation();
      const story = data.blocks.find((b) => b.type === "story")!;
      data.blocks.push({ ...story, ...extra } as typeof story);
      return invitationDataSchema.safeParse(data);
    };
    expect(withBlock({ id: "story-2" }).success).toBe(true);
    const dup = withBlock({});
    expect(dup.success).toBe(false);
    expect(dup.error?.issues[0].message).toMatch(/повторяется/);

    const data = createDefaultInvitation();
    data.blocks.push({ ...data.blocks.find((b) => b.type === "rsvp")!, id: "rsvp-2" });
    const result = invitationDataSchema.safeParse(data);
    expect(result.success).toBe(false);
    expect(result.error?.issues[0].message).toMatch(/только один/);
  });

  it("не больше MAX_BLOCKS блоков", () => {
    const data = createDefaultInvitation();
    const story = data.blocks.find((b) => b.type === "story")!;
    while (data.blocks.length <= MAX_BLOCKS) data.blocks.push({ ...story, id: `story-${data.blocks.length}` });
    expect(invitationDataSchema.safeParse(data).success).toBe(false);
    data.blocks.pop();
    expect(invitationDataSchema.safeParse(data).success).toBe(true);
  });

  it("старые приглашения без id блоков читаются: id стабильные, «b-<тип>», повторы — с номером", () => {
    const old = {
      theme: { palette: "cream", font: "script", background: null, decor: { type: "none", color: "#ffffff", density: 0 } },
      music: { url: null, loop: true },
      blocks: [
        { type: "hero", visible: true, names: "Анна & Иван", date: "2027-06-19T16:00" },
        { type: "story", visible: true, text: "раз" },
        { type: "story", visible: true, text: "два" },
      ],
    };
    const parsed = invitationDataSchema.parse(old);
    expect(parsed.blocks.map((b) => b.id)).toEqual(["b-hero", "b-story", "b-story-2"]);
    expect(invitationDataSchema.parse(old).blocks.map((b) => b.id)).toEqual(["b-hero", "b-story", "b-story-2"]);
    expect(old.blocks[0]).not.toHaveProperty("id"); // вход не мутируется
  });

  it("новые типы блоков проверяются: ссылка кнопки, число фото и контактов", () => {
    const ok = (block: object) => {
      const data = createDefaultInvitation() as unknown as { blocks: object[] };
      data.blocks.push({ id: "x-1", visible: true, ...block });
      return invitationDataSchema.safeParse(data).success;
    };
    expect(ok({ type: "text", text: "Привет", buttonUrl: "https://example.com" })).toBe(true);
    expect(ok({ type: "text", text: "Привет", buttonUrl: "tel:+79000000000" })).toBe(true);
    expect(ok({ type: "text", text: "Привет", buttonUrl: "javascript:alert(1)" })).toBe(false);
    expect(ok({ type: "photo" })).toBe(true);
    expect(ok({ type: "photo", height: "huge" })).toBe(false);
    expect(ok({ type: "gallery", photos: Array(9).fill("/uploads/a.jpg") })).toBe(true);
    expect(ok({ type: "gallery", photos: Array(10).fill("/uploads/a.jpg") })).toBe(false);
    expect(ok({ type: "contacts", people: [{ name: "Мария", phone: "+7 900" }] })).toBe(true);
    expect(ok({ type: "contacts", people: Array(7).fill({ name: "Мария" }) })).toBe(false);

    const data = createDefaultInvitation() as unknown as { blocks: object[] };
    data.blocks.push({ id: "photo-1", type: "photo", visible: true });
    const photo = invitationDataSchema.parse(data).blocks.at(-1)!;
    expect(photo).toMatchObject({ width: "full", height: "auto", variant: "classic", photo: null });
  });

  it("отклоняет density > 60", () => {
    const data = createDefaultInvitation();
    data.theme.decor.density = 61;
    expect(invitationDataSchema.safeParse(data).success).toBe(false);
  });

  it("принимает все шрифты и текстуры из списков, неизвестные отклоняет", () => {
    const withTheme = (patch: object) => {
      const data = createDefaultInvitation();
      Object.assign(data.theme, patch);
      return invitationDataSchema.safeParse(data).success;
    };
    FONTS.forEach((font) => expect(withTheme({ font })).toBe(true));
    BODY_FONTS.forEach((bodyFont) => expect(withTheme({ bodyFont })).toBe(true));
    TEXTURES.forEach((texture) => expect(withTheme({ texture })).toBe(true));
    expect(withTheme({ font: "comic-sans" })).toBe(false);
    expect(withTheme({ bodyFont: "arial" })).toBe(false);
    expect(withTheme({ texture: "marble" })).toBe(false);
  });

  it("прозрачность фона блока — от 0.1 до 1", () => {
    const withOpacity = (surfaceOpacity: number) => {
      const data = createDefaultInvitation();
      data.blocks.find((b) => b.type === "program")!.surfaceOpacity = surfaceOpacity;
      return invitationDataSchema.safeParse(data).success;
    };
    expect(withOpacity(0.1)).toBe(true);
    expect(withOpacity(0.55)).toBe(true);
    expect(withOpacity(0.05)).toBe(false);
    expect(withOpacity(1.2)).toBe(false);
  });

  it("размер декора — от 0.5 до 3", () => {
    const withSize = (size: number) => {
      const data = createDefaultInvitation();
      data.theme.decor.size = size;
      return invitationDataSchema.safeParse(data).success;
    };
    expect(withSize(0.5)).toBe(true);
    expect(withSize(3)).toBe(true);
    expect(withSize(0.4)).toBe(false);
    expect(withSize(3.1)).toBe(false);
  });

  it("отклоняет пустые names", () => {
    const data = createDefaultInvitation();
    const hero = data.blocks.find((b) => b.type === "hero")!;
    if (hero.type === "hero") hero.names = "   ";
    expect(invitationDataSchema.safeParse(data).success).toBe(false);
  });

  it("отклоняет неизвестный тип блока и неверную дату", () => {
    const data = createDefaultInvitation() as unknown as { blocks: unknown[] };
    data.blocks.push({ type: "slideshow", visible: true });
    expect(invitationDataSchema.safeParse(data).success).toBe(false);

    const data2 = createDefaultInvitation();
    const hero = data2.blocks.find((b) => b.type === "hero")!;
    if (hero.type === "hero") hero.date = "19.06.2027";
    expect(invitationDataSchema.safeParse(data2).success).toBe(false);
  });

  it("старые приглашения без новых полей читаются со значениями по умолчанию", () => {
    const old = {
      theme: { palette: "blush", font: "serif", background: null, decor: { type: "petals", color: "#e8a0b0", density: 25 } },
      music: { url: null, loop: true },
      blocks: [
        { type: "hero", visible: true, names: "Анна & Иван", date: "2027-06-19T16:00" },
        { type: "story", visible: true, text: "…" },
      ],
    };
    const parsed = invitationDataSchema.parse(old);
    expect(parsed.theme.texture).toBe("none");
    expect(parsed.theme.bodyFont).toBe("auto");
    expect(parsed.theme.decor.image).toBeNull();
    expect(parsed.theme.decor.size).toBe(1);
    expect(parsed.theme.decor.speed).toBe(1);
    expect(parsed.theme.envelope).toEqual({ ornament: null, style: "seal" });
    expect(parsed.theme.motion).toEqual({ style: "elegant", speed: 1 });
    expect(parsed.theme.ornamentMotion).toEqual({ enter: "auto", enterSpeed: 1, idle: "auto", idleSpeed: 1, idleAmplitude: 1 });
    expect(parsed.blocks[0]).toMatchObject({ surface: "plain", ornaments: [], photo: null });
    expect(parsed.blocks[1]).toMatchObject({ surface: "plain", surfaceOpacity: 1, ornaments: [] });
    expect(parsed.blocks[1].scriptLine).toBeUndefined();
    expect(parsed.blocks[0]).toMatchObject({ variant: "classic", entrance: "auto" });
    expect(parsed.blocks[1]).toMatchObject({ variant: "classic", photo: null });
  });

  it("проверяет украшения блока", () => {
    const withOrnament = (o: object) => {
      const data = createDefaultInvitation();
      const story = data.blocks.find((b) => b.type === "story")!;
      story.ornaments = [{ src: "/library/gardenia.webp", position: "top-left", size: 160, rotate: 0, flip: false, opacity: 1, ...o }];
      return invitationDataSchema.safeParse(data).success;
    };
    expect(withOrnament({})).toBe(true);
    expect(withOrnament({ opacity: 1.5 })).toBe(false);
    expect(withOrnament({ size: 1000 })).toBe(false);
    expect(withOrnament({ position: "center" })).toBe(true);
    expect(withOrnament({ position: "middle" })).toBe(false);
    expect(withOrnament({ src: "" })).toBe(false);
    // Своя анимация: неполная дополняется значениями по умолчанию, вне пределов — ошибка.
    expect(withOrnament({ motion: { enter: "grow", idle: "spin" } })).toBe(true);
    expect(withOrnament({ motion: { enter: "teleport" } })).toBe(false);
    expect(withOrnament({ motion: { idleSpeed: 5 } })).toBe(false);
    expect(withOrnament({ motion: { idleAmplitude: 0 } })).toBe(false);
  });

  it("не больше 6 украшений в блоке, неизвестная поверхность отклоняется", () => {
    const data = createDefaultInvitation();
    const story = data.blocks.find((b) => b.type === "story")!;
    story.ornaments = Array.from({ length: 7 }, () => ({
      src: "/library/gardenia.webp", position: "top" as const, size: 100, rotate: 0, flip: false, opacity: 1,
    }));
    expect(invitationDataSchema.safeParse(data).success).toBe(false);

    const data2 = createDefaultInvitation() as unknown as { blocks: { surface: string }[] };
    data2.blocks[0].surface = "velvet";
    expect(invitationDataSchema.safeParse(data2).success).toBe(false);
  });

  it("убранные фоны старых приглашений заменяются ближайшими: рваный край и крафт → бумага, лён и мрамор → карточка", () => {
    const data = createDefaultInvitation() as unknown as { blocks: { surface: string }[] };
    data.blocks[0].surface = "torn";
    data.blocks[1].surface = "kraft";
    data.blocks[2].surface = "fabric";
    data.blocks[3].surface = "marble";
    const parsed = invitationDataSchema.parse(data);
    expect(parsed.blocks.slice(0, 4).map((b) => b.surface)).toEqual(["paper", "paper", "card", "card"]);
  });

  it("виды блоков, появление, стиль анимаций и заставка проверяются по спискам", () => {
    const ok = (mutate: (d: Record<string, any>) => void) => {
      const d = createDefaultInvitation() as unknown as Record<string, any>;
      mutate(d);
      return invitationDataSchema.safeParse(d).success;
    };
    expect(ok((d) => (d.blocks[0].variant = "arch"))).toBe(true);
    expect(ok((d) => (d.blocks[0].variant = "stripes"))).toBe(false); // вид дресс-кода, не главного экрана
    expect(ok((d) => (d.blocks[0].entrance = "zoom"))).toBe(true);
    expect(ok((d) => (d.blocks[0].entrance = "spin"))).toBe(false);
    expect(ok((d) => (d.theme.motion = { style: "cinematic", speed: 1.5 }))).toBe(true);
    expect(ok((d) => (d.theme.motion = { style: "elegant", speed: 3 }))).toBe(false);
    expect(ok((d) => (d.theme.envelope = { ornament: null, style: "book" }))).toBe(true);
    expect(ok((d) => (d.theme.envelope = { ornament: null, style: "box" }))).toBe(false);
  });
});
