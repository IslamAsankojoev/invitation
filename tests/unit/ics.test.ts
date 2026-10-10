import { describe, expect, it } from "vitest";
import { addHours, generateIcs, googleCalendarUrl, invitationEvent, toIcsDateTime } from "@/lib/ics";
import { findBlock } from "@/lib/blocks";
import { createFromTemplate, templates } from "@/lib/templates";

describe("generateIcs", () => {
  const ics = generateIcs(
    { title: "Свадьба: Анна & Иван", start: "2027-06-19T16:00", location: "Ресторан «Сад», ул. Садовая; 1" },
    new Date("2027-01-01T00:00:00Z"),
  );
  const lines = ics.split("\r\n");

  it("содержит корректный DTSTART", () => {
    expect(lines).toContain("DTSTART:20270619T160000");
    expect(toIcsDateTime("2027-06-19T16:00:30")).toBe("20270619T160030");
  });

  it("содержит SUMMARY и экранированный LOCATION", () => {
    expect(lines).toContain("SUMMARY:Свадьба: Анна & Иван");
    expect(lines).toContain("LOCATION:Ресторан «Сад»\\, ул. Садовая\\; 1");
  });

  it("это валидная обёртка VCALENDAR/VEVENT", () => {
    expect(lines[0]).toBe("BEGIN:VCALENDAR");
    expect(lines).toContain("BEGIN:VEVENT");
    expect(lines).toContain("END:VEVENT");
    expect(lines).toContain("DTSTAMP:20270101T000000Z");
    expect(ics.endsWith("END:VCALENDAR\r\n")).toBe(true);
  });
});

describe("календарь гостя", () => {
  it("длинные строки переносятся по RFC 5545 (≤ 75 байт, продолжение с пробела)", () => {
    const ics = generateIcs({ title: "Айгерим & Нурлан ".repeat(6), start: "2027-06-19T16:00" }, new Date(0));
    const enc = new TextEncoder();
    for (const line of ics.split("\r\n")) expect(enc.encode(line).length).toBeLessThanOrEqual(75);
    expect(ics).toContain("\r\n ");
    expect(ics).toContain("TRIGGER:-P1D");
  });

  it("addHours переходит через полночь", () => {
    expect(addHours("2027-06-19T22:30", 4)).toBe("2027-06-20T02:30");
  });

  it("ссылка Google Календаря с заполненными полями", () => {
    const url = new URL(
      googleCalendarUrl({ title: "Анна & Иван", start: "2027-06-19T16:00", location: "Сад", description: "Привет" }),
    );
    expect(url.origin + url.pathname).toBe("https://calendar.google.com/calendar/render");
    expect(url.searchParams.get("action")).toBe("TEMPLATE");
    expect(url.searchParams.get("text")).toBe("Анна & Иван");
    expect(url.searchParams.get("dates")).toBe("20270619T160000/20270619T200000");
    expect(url.searchParams.get("location")).toBe("Сад");
    expect(url.searchParams.get("details")).toBe("Привет");
  });

  it("событие из приглашения: имена, дата, место, ссылка", () => {
    const data = createFromTemplate(templates[0]);
    const hero = findBlock(data, "hero")!;
    const loc = findBlock(data, "location")!;
    const event = invitationEvent(data, "https://x.kg/i/demo")!;
    expect(event.title).toBe(hero.names);
    expect(event.start).toBe(hero.date);
    expect(event.location).toBe([loc.placeName, loc.address].filter(Boolean).join(", "));
    expect(event.description).toBe("Приглашение: https://x.kg/i/demo");
  });
});
