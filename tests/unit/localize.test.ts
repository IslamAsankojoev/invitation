import { describe, expect, it } from "vitest";
import { findBlock, updateBlock } from "@/lib/blocks";
import { describeDate, monogram, weekdaysShort } from "@/lib/calendar";
import { allDefaultTitles, defaultTitle, eventCopy } from "@/lib/copy";
import { guestText } from "@/lib/i18n";
import { applyCopy } from "@/lib/localize";
import { EVENT_TYPES, invitationDataSchema, LANGUAGES } from "@/lib/schema";
import { shareMessage } from "@/lib/share";
import { allTemplates, createBlock, createFromTemplate, findTemplate, templateEvents, templates } from "@/lib/templates";

const base = () => createFromTemplate(findTemplate("rose-garden")!);

describe("даты на языке приглашения", () => {
  it("русский — как раньше, кыргызский — свой порядок слов", () => {
    const ru = describeDate("2027-06-19T16:00");
    expect(ru).toMatchObject({ weekday: "суббота", dayMonth: "19 июня", short: "19 июня 2027", long: "19 июня 2027 г.", time: "16:00" });
    const ky = describeDate("2027-06-19T16:00", "ky");
    expect(ky).toMatchObject({ weekday: "ишемби", dayMonth: "19-июнь", short: "2027-ж. 19-июнь", long: "2027-жылдын 19-июну", dotted: "19 . 06 . 2027" });
    expect(weekdaysShort("ky")).toHaveLength(7);
    expect(monogram("Нурлан жана Айгерим")).toBe("Н&А");
  });
});

describe("подписи и заголовки", () => {
  it("у каждого языка — все подписи (функции тоже работают)", () => {
    for (const lang of LANGUAGES) {
      const t = guestText(lang);
      expect(t.rsvp.thanksAttending("Айжан", 2)).toContain("Айжан");
      expect(t.gallery.open(1, 3)).toMatch(/1.*3/);
    }
    expect(guestText("ky").openInvitation).toBe("Чакырууну ачуу");
  });

  it("заголовок по умолчанию: свадьба на русском — исходный, другие события и кыргызский — свои", () => {
    expect(defaultTitle("calendar")).toBe("Дата свадьбы");
    expect(defaultTitle("calendar", "birthday")).toBe("Дата праздника");
    expect(defaultTitle("calendar", "wedding", "ky")).toBe("Тойдун күнү");
    expect(defaultTitle("program", "party", "ky")).toBe("Кечтин программасы");
    expect(allDefaultTitles("calendar")).toEqual(expect.arrayContaining(["Дата свадьбы", "Тойдун күнү", "Дата вечеринки"]));
  });

  it("примеры есть для каждого события на каждом языке", () => {
    for (const e of EVENT_TYPES) for (const l of LANGUAGES) expect(eventCopy[e][l].program.length).toBeGreaterThan(0);
  });
});

describe("applyCopy: смена события и языка", () => {
  it("примеры заменяются, свои тексты остаются; вход не мутирует", () => {
    const original = updateBlock(base(), "story", { text: "Наша собственная история" });
    const before = structuredClone(original);
    const next = applyCopy(original, "kyz-uzatuu", "ky");
    expect(original).toEqual(before);
    expect(next).toMatchObject({ eventType: "kyz-uzatuu", language: "ky" });
    expect(findBlock(next, "hero")?.label).toBe(eventCopy["kyz-uzatuu"].ky.label);
    expect(findBlock(next, "program")?.items).toEqual(eventCopy["kyz-uzatuu"].ky.program);
    expect(findBlock(next, "story")?.text).toBe("Наша собственная история");
    expect(invitationDataSchema.safeParse(next).success).toBe(true);
  });

  it("те же событие и язык — без изменений; туда и обратно — исходные примеры", () => {
    const data = base();
    expect(applyCopy(data, "wedding", "ru")).toBe(data);
    const back = applyCopy(applyCopy(data, "birthday", "ky"), "wedding", "ru");
    expect(findBlock(back, "program")?.items).toEqual(findBlock(data, "program")?.items);
  });

  it("заголовок, равный заголовку по умолчанию, сбрасывается — подстроится под язык", () => {
    const data = updateBlock(base(), "calendar", { title: "Дата свадьбы" });
    expect(findBlock(applyCopy(data, "wedding", "ky"), "calendar")?.title).toBeUndefined();
    const own = updateBlock(base(), "calendar", { title: "Наш день" });
    expect(findBlock(applyCopy(own, "wedding", "ky"), "calendar")?.title).toBe("Наш день");
  });

  it("новый блок — пример на языке приглашения, готовый текст тоже", () => {
    const data = applyCopy(base(), "jubilee", "ky");
    const program = createBlock(data, "program");
    expect(program.type === "program" && program.items).toEqual(eventCopy.jubilee.ky.program);
    const text = createBlock(data, "text", "adults");
    expect(text.type === "text" && text.title).toBe("Чоңдор үчүн");
  });
});

/** Одинаковые на обоих языках: имена, города, заимствованные слова. */
const SAME_IN_BOTH = new Set(["Анкета", "Галерея", "Банкет", "Фотосессия", "Бишкек", "Руслан & Айдана", "Программа", "Кыз узатуу", "Бешик той", "DJ-сет", "Сюрприз"]);

describe("шаблоны на кыргызском", () => {
  it("у каждого примера текста в шаблонах есть кыргызская версия (новый пример — строка в templateCopyKy.ts)", () => {
    const missing: string[] = [];
    for (const t of allTemplates) {
      const ru = createFromTemplate(t);
      const ky = applyCopy(ru, ru.eventType, "ky");
      ru.blocks.forEach((block, i) => {
        const after = ky.blocks[i] as unknown as Record<string, unknown>;
        const before = block as unknown as Record<string, unknown>;
        for (const key of ["title", "scriptLine", "label", "subtitle", "text", "caption", "buttonLabel"]) {
          const v = before[key];
          if (typeof v !== "string" || !v || SAME_IN_BOTH.has(v) || /^[^А-Яа-яЁё]*$/.test(v)) continue;
          // Заголовок по умолчанию сбрасывается (undefined) — он и так покажется по-кыргызски.
          if (after[key] === v) missing.push(`${t.id}:${block.type}.${key}: ${v.slice(0, 50)}`);
        }
        if (block.type === "program") {
          const items = (after.items as typeof block.items) ?? [];
          block.items.forEach((item, j) => {
            if (!SAME_IN_BOTH.has(item.title) && items[j]?.title === item.title) missing.push(`${t.id}:program.title: ${item.title}`);
          });
        }
      });
    }
    expect(missing).toEqual([]);
  });

  it("свадьба «Этно» на кыргызском и обратно — исходные тексты шаблона", () => {
    const ru = createFromTemplate(findTemplate("etno")!);
    const ky = applyCopy(ru, "wedding", "ky");
    expect(ky.blocks.find((b) => b.type === "text")?.title).toBe("Кадырлуу коноктор!");
    expect(applyCopy(ky, "wedding", "ru")).toEqual(ru);
  });
});

describe("шаблоны и сообщение гостям", () => {
  it("новое приглашение — с событием и языком шаблона (по умолчанию свадьба, русский)", () => {
    for (const t of templates) {
      const data = createFromTemplate(t);
      expect(data.eventType).toBe(templateEvents(t)[0]);
      expect(data.language).toBe(t.language ?? "ru");
    }
  });

  it("текст сообщения — на языке приглашения", () => {
    const ky = applyCopy(base(), "wedding", "ky");
    expect(shareMessage(ky, "https://x/i/a")).toContain("2027-ж. 19-июнь, 16:00");
    const noLabel = updateBlock(ky, "hero", { label: "" });
    expect(shareMessage(noLabel, "https://x/i/a").split("\n")[0]).toBe("Чакыруу");
  });
});
