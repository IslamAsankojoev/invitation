import { describe, expect, it } from "vitest";
import { blockById, findBlock } from "@/lib/blocks";
import { applyCopy } from "@/lib/localize";
import { DEFAULT_MUSIC_URL, musicTracks } from "@/lib/music";
import { invitationDataSchema, LANGUAGES, type InvitationData, type Language } from "@/lib/schema";
import { applySetup, mapSearchUrl, setupSchema } from "@/lib/setup";
import { templateCopyKy } from "@/lib/templateCopyKy";
import { allTemplates, createFromTemplate, findTemplate, type Template } from "@/lib/templates";

const base = () => createFromTemplate(findTemplate("rose-garden")!);
const setup = (patch = {}) =>
  setupSchema.parse({ names: "Мария & Пётр", date: "2027-08-20T17:30", placeName: "Шале", address: "ул. Озёрная, 1", musicUrl: musicTracks[2].src, ...patch });

describe("applySetup", () => {
  it("имена и дата — в главный экран, место — в «Место», песня — в музыку; результат валиден", () => {
    const data = base();
    const next = applySetup(data, setup());
    expect(findBlock(next, "hero")).toMatchObject({ names: "Мария & Пётр", date: "2027-08-20T17:30" });
    expect(findBlock(next, "location")).toMatchObject({ placeName: "Шале", address: "ул. Озёрная, 1" });
    expect(next.music.url).toBe(musicTracks[2].src);
    expect(invitationDataSchema.safeParse(next).success).toBe(true);
    expect(data.music.url).toBe(DEFAULT_MUSIC_URL); // вход не мутирован
    expect(findBlock(data, "hero")!.names).not.toBe("Мария & Пётр");
  });

  it("пустое место оставляет пример шаблона; «без музыки» — null", () => {
    const data = base();
    const next = applySetup(data, setup({ placeName: "", address: "", musicUrl: null }));
    expect(findBlock(next, "location")!.placeName).toBe(findBlock(data, "location")!.placeName);
    expect(next.music.url).toBeNull();
  });

  it("схема: имена обязательны, дата в формате, песня только из списка", () => {
    expect(setupSchema.safeParse({ names: " ", date: "2027-08-20T17:30", musicUrl: null }).success).toBe(false);
    expect(setupSchema.safeParse({ names: "А", date: "20.08.2027", musicUrl: null }).success).toBe(false);
    expect(setupSchema.safeParse({ names: "А", date: "2027-08-20T17:30", musicUrl: "/evil.mp3" }).success).toBe(false);
    expect(setupSchema.safeParse({ names: "А", date: "2027-08-20T17:30", musicUrl: null }).success).toBe(true);
  });
});

/** Все тексты блоков одной строкой — где искать имена из примера. */
const texts = (data: InvitationData) =>
  data.blocks
    .flatMap((b) => ["title", "scriptLine", "label", "subtitle", "text", "caption"].map((k) => (b as unknown as Record<string, unknown>)[k]))
    .filter((v): v is string => typeof v === "string")
    .join("\n");
/** Новое приглашение по шаблону на языке lang — как в POST /api/invitations до формы. */
const fresh = (t: Template, lang: Language) => {
  const data = createFromTemplate(t);
  return applyCopy(data, data.eventType, lang);
};
const mine = (patch = {}) =>
  setupSchema.parse({ names: "Тилек & Жылдыз", date: "2028-03-10T18:00", hosts: "Тилековдор үй-бүлөсү", musicUrl: null, ...patch });

describe("applySetup: имена, хозяева и дата из примера не доходят до гостей", () => {
  it("«Этно»: хозяева из формы вместо «Нурбек и Венера» (и по-кыргызски); без хозяев — пример остаётся", () => {
    const etno = findTemplate("etno")!;
    for (const lang of LANGUAGES) {
      const next = applySetup(fresh(etno, lang), mine(), etno);
      expect(texts(next), lang).toContain("Тилековдор үй-бүлөсү");
      expect(texts(next), lang).not.toMatch(/Нурбек|Венера/);
    }
    expect(texts(applySetup(fresh(etno, "ru"), mine({ hosts: "" }), etno))).toContain("Нурбек и Венера");
  });

  it("подпись «С любовью, Санжар и Мадина», имена в строке и дата в тексте — свои; другие слова не задеты", () => {
    const mocha = applySetup(fresh(findTemplate("mocha")!, "ru"), mine(), findTemplate("mocha")!);
    expect(texts(mocha)).toContain("С любовью,\nТилек и Жылдыз");
    const mochaKy = applySetup(fresh(findTemplate("mocha")!, "ky"), mine(), findTemplate("mocha")!);
    expect(texts(mochaKy)).toContain("Тилек жана Жылдыз");
    const emerald = applySetup(fresh(findTemplate("emerald-night")!, "ru"), mine(), findTemplate("emerald-night")!);
    expect(findBlock(emerald, "countdown")!.scriptLine).toBe("Тилек & Жылдыз");
    expect(texts(emerald)).toContain("С любовью, родители\nТилековдор үй-бүлөсү");
    const lago = applySetup(fresh(findTemplate("lago")!, "ru"), mine(), findTemplate("lago")!);
    expect(texts(lago)).toContain("— 10 . 03 . 2028 —");
    expect(texts(lago)).not.toContain("12 . 06 . 2027");
  });

  it("место из формы заменяет пример целиком, ссылка на карту — поиск по нему; срок ответа сдвигается с датой", () => {
    const etno = findTemplate("etno")!;
    const data = fresh(etno, "ru");
    const next = applySetup(data, mine({ placeName: "Ала-Тоо" }), etno);
    expect(findBlock(next, "location")).toMatchObject({ placeName: "Ала-Тоо", address: "", mapUrl: mapSearchUrl("Ала-Тоо") });
    expect(findBlock(data, "location")!.mapUrl).toMatch(/2gis/); // вход не мутирован
    // Без ссылки в примере своей не придумываем.
    expect(findBlock(applySetup(base(), setup()), "location")!.mapUrl).toBeUndefined();

    const emerald = findTemplate("emerald-night")!;
    const before = fresh(emerald, "ru");
    const days = (a: string, b: string) => (Date.parse(b.slice(0, 10)) - Date.parse(a.slice(0, 10))) / 86_400_000;
    const gap = days(findBlock(before, "rsvp")!.deadline!, findBlock(before, "hero")!.date);
    const moved = applySetup(before, mine(), emerald);
    expect(days(findBlock(moved, "rsvp")!.deadline!, "2028-03-10")).toBe(gap);
  });

  it("сторож: в каждом шаблоне на каждом языке после формы не остаётся имён пары и хозяев из примера", () => {
    const leaks: string[] = [];
    for (const t of allTemplates)
      for (const lang of LANGUAGES) {
        const data = fresh(t, lang);
        // Имена из примера: пара на обложке и хозяева (в шаблоне и в переводе).
        const sample = [findBlock(data, "hero")!.names, t.hosts ?? "", (t.hosts && templateCopyKy[t.hosts]) ?? ""];
        const words = new Set(sample.flatMap((s) => s.match(/\p{Lu}\p{L}{2,}/gu) ?? []));
        const after = texts(applySetup(data, mine(), t));
        // Слово, начинающееся с имени: ловит и падежи («Азамата», «Бегайымдын»), которые форма заменить не может.
        for (const w of words) if (new RegExp(`(?<!\\p{L})${w}`, "u").test(after)) leaks.push(`${t.id}/${lang}: ${w}`);
      }
    // Новое имя в тексте шаблона — в форме именительного падежа, как на обложке (или убрать его из текста);
    // хозяева — в Template.hosts ровно как в тексте.
    expect(leaks).toEqual([]);
  });

  it("хозяева шаблона есть в его текстах на обоих языках — иначе форме нечего заменять", () => {
    for (const t of allTemplates.filter((t) => t.hosts))
      for (const lang of LANGUAGES) {
        const hosts = lang === "ky" ? (templateCopyKy[t.hosts!] ?? t.hosts!) : t.hosts!;
        expect(texts(fresh(t, lang)), `${t.id}/${lang}`).toContain(hosts);
      }
  });

  it("схема: хозяева необязательны", () => {
    expect(setupSchema.parse({ names: "А", date: "2027-08-20T17:30", musicUrl: null }).hosts).toBe("");
    expect(blockById(applySetup(base(), setup()), "b-hero")).toBeDefined();
  });
});

