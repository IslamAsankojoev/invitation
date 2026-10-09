import { describe, expect, it } from "vitest";
import { findBlock } from "@/lib/blocks";
import { DEFAULT_MUSIC_URL, musicTracks } from "@/lib/music";
import { invitationDataSchema } from "@/lib/schema";
import { applySetup, setupSchema } from "@/lib/setup";
import { createFromTemplate, findTemplate } from "@/lib/templates";

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
