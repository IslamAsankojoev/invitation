import { describe, expect, it } from "vitest";
import { blockSummary, plural, updateBlock } from "@/lib/blocks";
import { checklist, sampleLeftovers } from "@/lib/checklist";
import { createDefaultInvitation } from "@/lib/defaults";
import { applySetup, setupSchema } from "@/lib/setup";
import { createFromTemplate, findTemplate, templates } from "@/lib/templates";
import type { Block, InvitationData } from "@/lib/schema";

const block = (data: InvitationData, type: Block["type"]) => data.blocks.find((b) => b.type === type)!;
const done = (data: InvitationData) => Object.fromEntries(checklist(data).map((i) => [i.key, i.done]));

describe("сводка блока в списке", () => {
  it("показывает главное, не раскрывая блок", () => {
    const data = createDefaultInvitation();
    expect(blockSummary(data, block(data, "hero"))).toBe("Айгерим & Нурлан · 19.06.2027");
    expect(blockSummary(data, block(data, "countdown"))).toBe("19.06.2027");
    expect(blockSummary(data, block(data, "program"))).toBe("3 пункта: 16:00 Сбор гостей");
    expect(blockSummary(data, block(data, "location"))).toBe("Ресторан «Сад»");
    expect(blockSummary(data, block(data, "rsvp"))).toBe("срок ответа не задан");
    const withDeadline = updateBlock(data, "rsvp", { deadline: "2027-05-01" });
    expect(blockSummary(withDeadline, block(withDeadline, "rsvp"))).toBe("ответить до 01.05.2027");
    // Длинный текст обрезается.
    expect(blockSummary(data, block(data, "story")).endsWith("…")).toBe(true);
  });

  it("русские окончания", () => {
    expect(plural(1, ["пункт", "пункта", "пунктов"])).toBe("1 пункт");
    expect(plural(3, ["пункт", "пункта", "пунктов"])).toBe("3 пункта");
    expect(plural(5, ["пункт", "пункта", "пунктов"])).toBe("5 пунктов");
    expect(plural(11, ["пункт", "пункта", "пунктов"])).toBe("11 пунктов");
    expect(plural(22, ["пункт", "пункта", "пунктов"])).toBe("22 пункта");
  });
});

describe("«Что осталось заполнить»", () => {
  it("у нового приглашения из любого шаблона ничего не заполнено — там примеры", () => {
    for (const t of templates) {
      const items = checklist(createFromTemplate(t));
      expect(items.length, t.id).toBeGreaterThan(0);
      expect(items.every((i) => !i.done), t.id).toBe(true);
    }
  });

  it("пункт считается сделанным, когда значение уже не пример", () => {
    let data = createDefaultInvitation();
    data = updateBlock(data, "hero", { names: "Мария & Пётр", date: "2028-08-20T17:30" });
    expect(done(data)).toMatchObject({ names: true, place: false, program: false, deadline: false });
    data = updateBlock(data, "location", { address: "Бишкек, ул. Токтогула, 1" });
    data = updateBlock(data, "program", { items: [{ time: "17:00", title: "Сбор гостей" }] });
    data = updateBlock(data, "rsvp", { deadline: "2028-08-01" });
    expect(done(data)).toEqual({ names: true, place: true, program: true, deadline: true });
  });

  it("имена поменяли, а дату оставили из примера — ещё не сделано; скрытый блок не в списке", () => {
    let data = updateBlock(createDefaultInvitation(), "hero", { names: "Мария & Пётр" });
    expect(done(data).names).toBe(false);
    data = updateBlock(data, "program", { visible: false });
    expect(checklist(data).map((i) => i.key)).not.toContain("program");
  });
});

describe("фото из примера в сводке блока", () => {
  it("«фото из примера» вместо «фото загружено»; в галерее — сколько из примера", () => {
    const data = createFromTemplate(findTemplate("mocha")!);
    expect(blockSummary(data, block(data, "photo"))).toBe("фото из примера");
    expect(blockSummary(data, block(data, "gallery"))).toBe("6 фото из примера");
    const gallery = block(data, "gallery") as Extract<Block, { type: "gallery" }>;
    const mixed = updateBlock(data, gallery.id, { photos: ["/uploads/inv/x/1.webp", ...gallery.photos.slice(1)] });
    expect(blockSummary(mixed, block(mixed, "gallery"))).toBe("6 фото, 5 из примера");
    const own = updateBlock(data, block(data, "photo").id, { photo: "/uploads/inv/x/2.webp" });
    expect(blockSummary(own, block(own, "photo"))).toBe("фото загружено");
  });
});

describe("проверка перед отправкой: что осталось из примера", () => {
  const etno = findTemplate("etno")!;
  const setup = (patch = {}) =>
    setupSchema.parse({ names: "Айбек & Сезим", date: "2028-08-14T17:00", placeName: "Ала-Тоо", address: "Бишкек, Чүй 1", musicUrl: null, ...patch });
  const what = (data: InvitationData) => Object.fromEntries(sampleLeftovers(data).map((l) => [l.name, l.what]));

  it("новое приглашение из любого шаблона — имена и дата из примера", () => {
    for (const t of templates) expect(what(createFromTemplate(t))["Главный экран"], t.id).toEqual(expect.arrayContaining(["имена", "дата"]));
  });

  it("«Этно» после формы без хозяев — их имена в тексте, фото; с хозяевами — только фото", () => {
    const noHosts = what(applySetup(createFromTemplate(etno), setup(), etno));
    expect(noHosts).toEqual({
      "Главный экран": ["фото"],
      "Текст 2": ["имена Нурбек, Венера"],
      Фото: ["фото"],
      Место: ["фото"],
    });
    expect(what(applySetup(createFromTemplate(etno), setup({ hosts: "Тилековдор үй-бүлөсү" }), etno))["Текст 2"]).toBeUndefined();
  });

  it("адрес, ссылка на карту, телефон, срок ответа, программа — пока как в примере", () => {
    const lago = what(createFromTemplate(findTemplate("lago")!));
    expect(lago).toMatchObject({
      Место: ["адрес", "ссылка на карту", "фото"],
      Контакты: ["телефон"],
      "Анкета гостя": ["срок ответа"],
      Программа: ["время и пункты"],
    });
  });

  it("своё не отмечается: свой текст с именем из примеров, свои данные; скрытый блок не проверяется", () => {
    let data = applySetup(createFromTemplate(etno), setup({ hosts: "Нурбек и Айгуль" }), etno);
    // Хозяева — свои, хотя «Нурбек» есть среди примеров: текст уже не пример.
    expect(what(data)["Текст 2"]).toBeUndefined();
    data = updateBlock(data, "photo", { visible: false });
    expect(what(data)["Фото"]).toBeUndefined();
    const plain = updateBlock(createDefaultInvitation(), "hero", { names: "Мария & Пётр", date: "2028-08-20T17:30" });
    expect(what(plain)["Главный экран"]).toBeUndefined();
  });
});

