import { describe, expect, it } from "vitest";
import {
  addOrnament,
  blockName,
  canAddBlock,
  duplicateBlock,
  insertBlock,
  newBlockId,
  removeBlock,
  createOrnament,
  findBlock,
  MAX_ORNAMENTS,
  moveBlock,
  removeOrnament,
  toggleBlock,
  updateBlock,
  updateOrnament,
} from "@/lib/blocks";
import { createDefaultInvitation } from "@/lib/defaults";
import { createBlock } from "@/lib/templates";

const types = (d: ReturnType<typeof createDefaultInvitation>) => d.blocks.map((b) => b.type);

describe("функции работы с блоками", () => {
  it("toggleBlock переключает visible и не мутирует исходник", () => {
    const data = createDefaultInvitation();
    const snapshot = structuredClone(data);
    const next = toggleBlock(data, "story");
    expect(findBlock(next, "story")!.visible).toBe(false);
    expect(toggleBlock(next, "story").blocks).toEqual(data.blocks);
    expect(data).toEqual(snapshot);
    expect(next).not.toBe(data);
  });

  it("moveBlock(from, to) переставляет блок и не мутирует исходник", () => {
    const data = createDefaultInvitation();
    const snapshot = structuredClone(data);
    expect(types(data)).toEqual(["hero", "countdown", "calendar", "story", "program", "dresscode", "location", "rsvp"]);
    const next = moveBlock(data, 4, 1); // program выше countdown
    expect(types(next)).toEqual(["hero", "program", "countdown", "calendar", "story", "dresscode", "location", "rsvp"]);
    expect(types(moveBlock(data, 0, 7))).toEqual(["countdown", "calendar", "story", "program", "dresscode", "location", "rsvp", "hero"]);
    expect(data).toEqual(snapshot);
  });

  it("moveBlock игнорирует индексы вне диапазона", () => {
    const data = createDefaultInvitation();
    expect(moveBlock(data, -1, 2)).toBe(data);
    expect(moveBlock(data, 1, 99)).toBe(data);
  });

  it("updateBlock обновляет поля нужного блока и не мутирует исходник", () => {
    const data = createDefaultInvitation();
    const snapshot = structuredClone(data);
    const next = updateBlock(data, "hero", { names: "Мария & Пётр" });
    expect(findBlock(next, "hero")!.names).toBe("Мария & Пётр");
    expect(findBlock(next, "hero")!.date).toBe(findBlock(data, "hero")!.date);
    expect(next.blocks[1]).toBe(data.blocks[1]);
    expect(data).toEqual(snapshot);
  });

  it("addOrnament / updateOrnament / removeOrnament — чистые функции", () => {
    const data = createDefaultInvitation();
    const snapshot = structuredClone(data);
    const ornament = createOrnament("/library/gardenia.webp", "top-left");

    const added = addOrnament(data, "story", ornament);
    expect(findBlock(added, "story")!.ornaments).toEqual([ornament]);

    const updated = updateOrnament(added, "story", 0, { size: 240, flip: true });
    expect(findBlock(updated, "story")!.ornaments[0]).toMatchObject({ size: 240, flip: true, position: "top-left" });
    expect(findBlock(added, "story")!.ornaments[0].size).toBe(ornament.size);

    const removed = removeOrnament(updated, "story", 0);
    expect(findBlock(removed, "story")!.ornaments).toEqual([]);
    expect(data).toEqual(snapshot);
  });

  it("украшения: лимит и несуществующий индекс не меняют данные", () => {
    let data = createDefaultInvitation();
    for (let i = 0; i < MAX_ORNAMENTS + 2; i++) data = addOrnament(data, "story", createOrnament("/library/gardenia.webp"));
    expect(findBlock(data, "story")!.ornaments).toHaveLength(MAX_ORNAMENTS);
    expect(updateOrnament(data, "story", 99, { size: 50 })).toBe(data);
    expect(removeOrnament(data, "story", 99)).toBe(data);
  });
});

describe("повторяемые блоки", () => {
  const story = (d: ReturnType<typeof createDefaultInvitation>) => d.blocks.find((b) => b.type === "story")!;

  it("insertBlock вставляет после указанного блока или в конец, одиночные типы не дублирует", () => {
    const data = createDefaultInvitation();
    const text = createBlock(data, "text");
    const after = insertBlock(data, text, story(data).id);
    expect(after.blocks[after.blocks.indexOf(story(after)) + 1].id).toBe(text.id);
    expect(insertBlock(data, text).blocks.at(-1)!.id).toBe(text.id);
    expect(data.blocks.some((b) => b.id === text.id)).toBe(false);

    const rsvp = { ...findBlock(data, "rsvp")!, id: "rsvp-2" };
    expect(insertBlock(data, rsvp)).toBe(data);
    expect(canAddBlock(data, "rsvp")).toBe(false);
    expect(canAddBlock(data, "story")).toBe(true);
  });

  it("duplicateBlock кладёт копию с новым id сразу под оригиналом; копию правят отдельно", () => {
    const data = createDefaultInvitation();
    const id = story(data).id;
    const next = duplicateBlock(data, id, "story-copy");
    const i = next.blocks.findIndex((b) => b.id === id);
    expect(next.blocks[i + 1]).toMatchObject({ id: "story-copy", type: "story" });
    const edited = updateBlock(next, "story-copy", { text: "Другой текст" });
    expect(edited.blocks[i]).toEqual(next.blocks[i]);
    expect(edited.blocks[i + 1]).toMatchObject({ text: "Другой текст" });
    expect(duplicateBlock(data, findBlock(data, "hero")!.id)).toBe(data);
  });

  it("removeBlock удаляет по id, главный экран не удаляется", () => {
    const data = duplicateBlock(createDefaultInvitation(), "b-story", "story-2");
    const next = removeBlock(data, "story-2");
    expect(next.blocks.map((b) => b.id)).toEqual(createDefaultInvitation().blocks.map((b) => b.id));
    expect(removeBlock(data, "b-hero")).toBe(data);
  });

  it("функции по id меняют только свой блок, по типу — первый блок типа", () => {
    const data = duplicateBlock(createDefaultInvitation(), "b-story", "story-2");
    const hidden = toggleBlock(data, "story-2");
    expect(hidden.blocks.find((b) => b.id === "story-2")!.visible).toBe(false);
    expect(hidden.blocks.find((b) => b.id === "b-story")!.visible).toBe(true);
    expect(findBlock(toggleBlock(data, "story"), "story")!.visible).toBe(false);
    const withOrnament = addOrnament(data, "story-2", createOrnament("/library/gardenia.webp"));
    expect(withOrnament.blocks.find((b) => b.id === "story-2")!.ornaments).toHaveLength(1);
    expect(findBlock(withOrnament, "story")!.ornaments).toEqual(findBlock(data, "story")!.ornaments);
  });

  it("blockName нумерует блоки одного типа; newBlockId не совпадает с занятыми", () => {
    const data = duplicateBlock(createDefaultInvitation(), "b-story", "story-2");
    expect(blockName(data, data.blocks.find((b) => b.id === "b-story")!)).toBe("Наша история 1");
    expect(blockName(data, data.blocks.find((b) => b.id === "story-2")!)).toBe("Наша история 2");
    expect(blockName(data, findBlock(data, "hero")!)).toBe("Главный экран");
    const id = newBlockId("text", ["text-aaaaaa"]);
    expect(id).toMatch(/^text-[a-z0-9]+$/);
    expect(id).not.toBe("text");
  });
});
