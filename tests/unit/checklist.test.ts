import { describe, expect, it } from "vitest";
import { blockSummary, plural, updateBlock } from "@/lib/blocks";
import { checklist } from "@/lib/checklist";
import { createDefaultInvitation } from "@/lib/defaults";
import { createFromTemplate, templates } from "@/lib/templates";
import type { Block, InvitationData } from "@/lib/schema";

const block = (data: InvitationData, type: Block["type"]) => data.blocks.find((b) => b.type === type)!;
const done = (data: InvitationData) => Object.fromEntries(checklist(data).map((i) => [i.key, i.done]));

describe("сводка блока в списке", () => {
  it("показывает главное, не раскрывая блок", () => {
    const data = createDefaultInvitation();
    expect(blockSummary(data, block(data, "hero"))).toBe("Анна & Иван · 19.06.2027");
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
