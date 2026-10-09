import { describe, expect, it } from "vitest";
import { filterAnswers } from "@/lib/rsvp";
import { parseSavedAnswer } from "@/lib/rsvpMemory";

describe("ответы гостей", () => {
  const list = [
    { name: "Пётр Иванов", attending: true },
    { name: "Ольга", attending: false },
    { name: "Айбек", attending: true },
  ];

  it("фильтр «все / придут / не придут» и поиск по имени (регистр и «ё» не важны)", () => {
    expect(filterAnswers(list, "all", "").map((a) => a.name)).toEqual(["Пётр Иванов", "Ольга", "Айбек"]);
    expect(filterAnswers(list, "yes", "").map((a) => a.name)).toEqual(["Пётр Иванов", "Айбек"]);
    expect(filterAnswers(list, "no", "").map((a) => a.name)).toEqual(["Ольга"]);
    expect(filterAnswers(list, "all", "  петр ").map((a) => a.name)).toEqual(["Пётр Иванов"]);
    expect(filterAnswers(list, "no", "айбек")).toEqual([]);
  });

  it("запомненный ответ гостя: битое содержимое — null", () => {
    const ok = { id: "r", editKey: "k", name: "Ольга", attending: true, guests: 2, comment: "Ура" };
    expect(parseSavedAnswer(JSON.stringify(ok))).toEqual(ok);
    expect(parseSavedAnswer(JSON.stringify({ ...ok, comment: undefined }))).toEqual({ ...ok, comment: "" });
    expect(parseSavedAnswer(JSON.stringify({ ...ok, editKey: 1 }))).toBeNull();
    expect(parseSavedAnswer("{oops")).toBeNull();
    expect(parseSavedAnswer(null)).toBeNull();
  });
});
