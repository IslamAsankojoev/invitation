import { describe, expect, it } from "vitest";
import { updateBlock } from "@/lib/blocks";
import { createDefaultInvitation } from "@/lib/defaults";
import {
  dateWords,
  linkPreview,
  shareMessage,
  slugFromNames,
  slugSuggestions,
  telegramShareUrl,
  transliterate,
  whatsappShareUrl,
} from "@/lib/share";

/** Свои имена, дата и место — тест не зависит от текста примера шаблона. */
const data = updateBlock(
  updateBlock(createDefaultInvitation(), "hero", { names: "Айбек & Айзада", date: "2027-06-19T16:00", label: "Приглашение на свадьбу" }),
  "location",
  { placeName: "Ресторан «Сад»" },
);

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
    expect(slugSuggestions(data)).toEqual(["aibek-aizada", "aibek-aizada-2027"]);
  });
});

describe("сообщение гостям", () => {
  const url = "https://example.kg/i/aibek-aizada";

  it("дата словами", () => {
    expect(dateWords("2027-06-19T16:00")).toBe("19 июня 2027, 16:00");
  });

  it("текст сообщения: надпись, имена, дата, место и в конце ссылка", () => {
    expect(shareMessage(data, url)).toBe(`Приглашение на свадьбу\nАйбек & Айзада\n19 июня 2027, 16:00\nРесторан «Сад»\n\n${url}`);
  });

  it("WhatsApp — весь текст; Telegram — ссылка отдельно, без повтора в тексте", () => {
    const text = shareMessage(data, url);
    expect(whatsappShareUrl(text)).toBe(`https://wa.me/?text=${encodeURIComponent(text)}`);
    const tg = new URL(telegramShareUrl(url, text));
    expect(tg.searchParams.get("url")).toBe(url);
    expect(tg.searchParams.get("text")).not.toContain(url);
    expect(tg.searchParams.get("text")).toContain("Айбек & Айзада");
  });
});

describe("linkPreview — превью ссылки в мессенджерах", () => {
  it("заголовок из имён, описание «дата · место», дата как на конверте", () => {
    expect(linkPreview(updateBlock(data, "hero", { photo: "/templates/lago-walk.webp" }))).toEqual({
      title: "Айбек & Айзада — приглашение",
      description: "19 июня 2027, 16:00 · Ресторан «Сад»",
      label: "Приглашение на свадьбу",
      names: ["Айбек", "Айзада"],
      date: "19 . 06 . 2027",
      place: "Ресторан «Сад»",
      photo: "/templates/lago-walk.webp",
    });
  });

  it("без места и надписи — только дата и «Приглашение»; одно имя — одной строкой", () => {
    const p = linkPreview(updateBlock(updateBlock(data, "location", { placeName: " " }), "hero", { label: "", names: "Алия, 30 лет" }));
    expect(p).toMatchObject({ description: "19 июня 2027, 16:00", label: "Приглашение", names: ["Алия, 30 лет"], place: undefined });
  });
});
