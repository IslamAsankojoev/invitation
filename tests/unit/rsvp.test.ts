import { describe, expect, it } from "vitest";
import { computeRsvpStats, guestsWord, rsvpInputSchema, rsvpsToCsv } from "@/lib/rsvp";

describe("rsvpInputSchema", () => {
  const valid = { name: "Ольга", attending: true, guestsCount: 2 };

  it("принимает корректный ответ", () => {
    expect(rsvpInputSchema.safeParse(valid).success).toBe(true);
    expect(rsvpInputSchema.safeParse({ ...valid, comment: "Будем!" }).success).toBe(true);
  });

  it.each([
    ["пустое имя", { ...valid, name: "  " }],
    ["0 гостей", { ...valid, guestsCount: 0 }],
    ["11 гостей", { ...valid, guestsCount: 11 }],
    ["дробное число гостей", { ...valid, guestsCount: 1.5 }],
    ["attending не boolean", { ...valid, attending: "yes" }],
  ])("отклоняет: %s", (_, input) => {
    expect(rsvpInputSchema.safeParse(input).success).toBe(false);
  });
});

describe("computeRsvpStats", () => {
  it("считает придут / не придут / сумму гостей среди пришедших", () => {
    expect(
      computeRsvpStats([
        { attending: true, guestsCount: 2 },
        { attending: true, guestsCount: 3 },
        { attending: false, guestsCount: 1 },
      ]),
    ).toEqual({ attending: 2, notAttending: 1, totalGuests: 5 });
  });

  it("пустой список", () => {
    expect(computeRsvpStats([])).toEqual({ attending: 0, notAttending: 0, totalGuests: 0 });
  });
});

describe("rsvpsToCsv", () => {
  it("экранирует запятые и кавычки", () => {
    const csv = rsvpsToCsv([
      { id: "1", name: 'Иван "Ваня"', attending: true, guestsCount: 2, comment: "Привет, мир", createdAt: "2027-01-01T00:00:00.000Z" },
    ]);
    expect(csv.split("\r\n")).toEqual([
      "Имя,Придёт,Гостей,Комментарий,Дата ответа",
      '"Иван ""Ваня""",да,2,"Привет, мир",2027-01-01T00:00:00.000Z',
    ]);
  });
});

describe("guestsWord", () => {
  it("склоняет «гость» по числу", () => {
    expect([1, 2, 4, 5, 10, 11, 12, 21, 22, 25].map((n) => `${n} ${guestsWord(n)}`)).toEqual([
      "1 гость",
      "2 гостя",
      "4 гостя",
      "5 гостей",
      "10 гостей",
      "11 гостей",
      "12 гостей",
      "21 гость",
      "22 гостя",
      "25 гостей",
    ]);
  });
});
