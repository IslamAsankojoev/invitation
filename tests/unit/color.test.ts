import { describe, expect, it } from "vitest";
import { isDarkColor, luminance, mixHex } from "@/lib/color";

describe("цвета", () => {
  it("яркость: чёрный 0, белый 1; тёмные цвета — те, на которых нужен светлый текст", () => {
    expect(luminance("#000000")).toBe(0);
    expect(luminance("#ffffff")).toBeCloseTo(1);
    expect(isDarkColor("#3b2b21")).toBe(true); // шоколад
    expect(isDarkColor("#16243a")).toBe(true); // тёмно-синий
    expect(isDarkColor("#e7dccb")).toBe(false); // песочный
    expect(isDarkColor("#c0877f")).toBe(false); // пудровый акцент
  });

  it("mixHex смешивает по доле и возвращает #rrggbb", () => {
    expect(mixHex("#000000", "#ffffff", 0)).toBe("#000000");
    expect(mixHex("#000000", "#ffffff", 1)).toBe("#ffffff");
    expect(mixHex("#000000", "#ffffff", 0.5)).toBe("#808080");
    expect(mixHex("#ff0000", "#0000ff", 0.25)).toMatch(/^#[0-9a-f]{6}$/);
  });
});
