import { describe, expect, it } from "vitest";
import { updateBlock } from "@/lib/blocks";
import { createDefaultInvitation } from "@/lib/defaults";
import {
  dateWords,
  shareMessage,
  shareMeta,
  sharePhoto,
  slugFromNames,
  slugSuggestions,
  telegramShareUrl,
  transliterate,
  whatsappShareUrl,
} from "@/lib/share";

describe("ссылка из имён", () => {
  it("русские и кыргызские буквы → латиница", () => {
    expect(transliterate("Щука, ёж и Яна")).toBe("schuka, ezh i yana");
    expect(transliterate("Өмүр Үсөн Ңаа")).toBe("omur uson ngaa");
  });

  it.each([
    ["Айбек & Айзада", "aibek-aizada"],
    ["Анна & Иван", "anna-ivan"],
    ["Нурсултан", "nursultan"],
    ["Жылдыз Сүйүнбаева", "zhyldyz-suiunbaeva"],
    ["  John & Мээрим!!  ", "john-meerim"],
  ])("%s → %s", (names, slug) => {
    expect(slugFromNames(names)).toBe(slug);
  });

  it("слишком коротко или одни символы — null; длинное обрезается до 40 без дефиса в конце", () => {
    expect(slugFromNames("Я")).toBeNull();
    expect(slugFromNames("❤ & ❤")).toBeNull();
    const long = slugFromNames("Александра-Виктория Константиновна & Максимилиан")!;
    expect(long.length).toBeLessThanOrEqual(40);
    expect(long.endsWith("-")).toBe(false);
  });

  it("варианты: из имён и с годом события", () => {
    expect(slugSuggestions(createDefaultInvitation())).toEqual(["anna-ivan", "anna-ivan-2027"]);
  });
});

describe("сообщение гостям и превью ссылки", () => {
  const data = createDefaultInvitation();
  const url = "https://example.kg/i/anna-ivan";

  it("дата словами", () => {
    expect(dateWords("2027-06-19T16:00")).toBe("19 июня 2027, 16:00");
  });

  it("заголовок и описание превью: имена, повод, дата, место", () => {
    expect(shareMeta(data)).toEqual({
      title: "Анна & Иван — приглашение на свадьбу",
      description: "19 июня 2027, 16:00 · Ресторан «Сад»",
    });
    const noLabel = updateBlock(data, "hero", { label: "" });
    expect(shareMeta(noLabel).title).toBe("Анна & Иван — приглашение");
  });

  it("текст сообщения заканчивается ссылкой", () => {
    expect(shareMessage(data, url)).toBe(`Приглашение на свадьбу\nАнна & Иван\n19 июня 2027, 16:00\nРесторан «Сад»\n\n${url}`);
  });

  it("WhatsApp — весь текст; Telegram — ссылка отдельно, без повтора в тексте", () => {
    const text = shareMessage(data, url);
    expect(whatsappShareUrl(text)).toBe(`https://wa.me/?text=${encodeURIComponent(text)}`);
    const tg = new URL(telegramShareUrl(url, text));
    expect(tg.searchParams.get("url")).toBe(url);
    expect(tg.searchParams.get("text")).not.toContain(url);
    expect(tg.searchParams.get("text")).toContain("Анна & Иван");
  });

  it("картинка превью — первое фото видимых блоков, нет фото — null", () => {
    expect(sharePhoto(updateBlock(data, "hero", { photo: null }))).toBeNull();
    const withPhoto = updateBlock(data, "location", { photo: "/uploads/place.webp" });
    expect(sharePhoto(withPhoto)).toBe("/uploads/place.webp");
    expect(sharePhoto(updateBlock(withPhoto, "hero", { photo: "/uploads/us.webp" }))).toBe("/uploads/us.webp");
    expect(sharePhoto(updateBlock(withPhoto, "location", { visible: false }))).toBeNull();
  });
});
