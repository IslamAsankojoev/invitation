import { describe, expect, it } from "vitest";
import { generateIcs, toIcsDateTime } from "@/lib/ics";

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
