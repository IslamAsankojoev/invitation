import { describe, expect, it } from "vitest";
import { EVENT_KINDS, joinDateTime, normalizeMapUrl, splitDateTime } from "@/lib/quickStart";
import { heroBlockSchema } from "@/lib/schema";

describe("быстрый старт", () => {
  it("дата и время — туда и обратно", () => {
    expect(splitDateTime("2027-06-19T16:00")).toEqual({ date: "2027-06-19", time: "16:00" });
    expect(joinDateTime("2027-06-19", "18:30")).toBe("2027-06-19T18:30");
    expect(joinDateTime("2027-06-19", "")).toBe("2027-06-19T12:00");
    expect(joinDateTime("", "18:30")).toBeNull();
  });

  it("надписи поводов проходят схему обложки", () => {
    for (const kind of EVENT_KINDS) {
      expect(heroBlockSchema.shape.label.safeParse(kind.text).success).toBe(true);
    }
  });

  it.each([
    ["https://2gis.kg/bishkek/firm/70000001", "https://2gis.kg/bishkek/firm/70000001"],
    ["2gis.kg/bishkek/firm/1", "https://2gis.kg/bishkek/firm/1"],
    ["Ресторан «Ала-Тоо», Бишкек\nhttps://go.2gis.com/abc12", "https://go.2gis.com/abc12"],
    ["https://maps.app.goo.gl/XyZ", "https://maps.app.goo.gl/XyZ"],
  ])("ссылка на карту: %s", (input, url) => {
    expect(normalizeMapUrl(input)).toBe(url);
  });

  it("пусто — undefined, не ссылка — null", () => {
    expect(normalizeMapUrl("  ")).toBeUndefined();
    expect(normalizeMapUrl("рядом с парком")).toBeNull();
    expect(normalizeMapUrl("abc")).toBeNull();
  });
});
