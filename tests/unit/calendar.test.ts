import { describe, expect, it } from "vitest";
import { buildMonthGrid, buildWeek, describeDate, monogram, splitNames } from "@/lib/calendar";
import { ornamentImageStyle, ornamentStyle } from "@/lib/ornaments";

describe("buildMonthGrid", () => {
  it("ноябрь 2026 начинается с воскресенья: 6 пустых клеток, 30 дней, 6 недель", () => {
    const weeks = buildMonthGrid(2026, 11);
    expect(weeks[0]).toEqual([null, null, null, null, null, null, 1]);
    expect(weeks.flat().filter(Boolean)).toHaveLength(30);
    expect(weeks).toHaveLength(6);
    expect(weeks.at(-1)).toEqual([30, null, null, null, null, null, null]);
  });

  it("февраль високосного года — 29 дней, неделя с понедельника", () => {
    const weeks = buildMonthGrid(2028, 2); // 1 февраля 2028 — вторник
    expect(weeks[0].slice(0, 2)).toEqual([null, 1]);
    expect(Math.max(...(weeks.flat().filter(Boolean) as number[]))).toBe(29);
    weeks.forEach((w) => expect(w).toHaveLength(7));
  });
});

describe("describeDate", () => {
  it("день недели, месяц в родительном падеже, время и дата через точки", () => {
    expect(describeDate("2026-11-07T16:30")).toMatchObject({
      day: 7,
      year: 2026,
      weekday: "суббота",
      monthGenitive: "ноября",
      time: "16:30",
      dotted: "07 . 11 . 2026",
    });
  });
});

describe("monogram / splitNames", () => {
  it.each([
    ["Дастан & Нуркыз", "Д&Н"],
    ["анна и иван", "А&И"],
    ["Дмитрий + Ирина", "Д&И"],
    ["Дмитрий", "Д"],
  ])("%s → %s", (names, expected) => {
    expect(monogram(names)).toBe(expected);
  });

  it("делит имена по «&»", () => {
    expect(splitNames("Анна & Иван")).toEqual(["Анна", "Иван"]);
    expect(splitNames("Юбилей Марии")).toEqual(["Юбилей Марии"]);
  });
});

describe("ornamentStyle", () => {
  it("обёртка привязана к углу, картинка поворачивается, отражается и прозрачна", () => {
    const o = { src: "x", position: "bottom-right", size: 120, rotate: 30, flip: true, opacity: 0.5 } as const;
    expect(ornamentStyle(o)).toMatchObject({ bottom: 0, right: 0, width: 120, pointerEvents: "none", transformOrigin: "100% 100%" });
    const img = ornamentImageStyle(o);
    expect(img).toMatchObject({ opacity: 0.5, width: "100%" });
    expect(img.transform).toContain("rotate(30deg)");
    expect(img.transform).toContain("scaleX(-1)");
  });
});

describe("buildWeek", () => {
  it("неделя с понедельника, день события отмечен, переход через месяц", () => {
    // 1 ноября 2026 — воскресенье: неделя начинается 26 октября.
    expect(buildWeek(2026, 11, 1).map((d) => d.day)).toEqual([26, 27, 28, 29, 30, 31, 1]);
    expect(buildWeek(2026, 11, 1).findIndex((d) => d.isEvent)).toBe(6);
    // 7 ноября 2026 — суббота.
    expect(buildWeek(2026, 11, 7).findIndex((d) => d.isEvent)).toBe(5);
  });
});
