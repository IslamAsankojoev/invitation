import { describe, expect, it } from "vitest";
import { textureLabels, textures } from "@/lib/library";
import { BODY_FONTS, FONTS, TEXTURES } from "@/lib/schema";
import { bodyFonts, headingsMode, isScriptFont, palettes, resolveBodyFont, themeStyle, titleFonts } from "@/lib/theme";
import { createDefaultInvitation } from "@/lib/defaults";

describe("шрифты темы", () => {
  it("у каждого шрифта имён и основного шрифта есть CSS-стек с переменной next/font", () => {
    FONTS.forEach((f) => expect(titleFonts[f].css).toMatch(/^var\(--font-[a-z-]+\), /));
    BODY_FONTS.filter((f) => f !== "auto").forEach((f) =>
      expect(bodyFonts[f as Exclude<typeof f, "auto">].css).toMatch(/^var\(--font-[a-z-]+\), /),
    );
  });

  it("«Авто» подбирает основной шрифт под шрифт имён — как было до появления настройки", () => {
    expect(resolveBodyFont({ font: "script", bodyFont: "auto" })).toBe("cormorant");
    expect(resolveBodyFont({ font: "serif", bodyFont: "auto" })).toBe("cormorant");
    expect(resolveBodyFont({ font: "sans", bodyFont: "auto" })).toBe("inter");
    expect(resolveBodyFont({ font: "playfair", bodyFont: "auto" })).toBe("lora");
    expect(resolveBodyFont({ font: "playfair", bodyFont: "montserrat" })).toBe("montserrat");
  });

  it("themeStyle выставляет переменные шрифтов и масштаб имён", () => {
    const theme = { ...createDefaultInvitation().theme, font: "pacifico" as const, bodyFont: "raleway" as const };
    const style = themeStyle(theme) as Record<string, unknown>;
    expect(style["--font-title"]).toBe(titleFonts.pacifico.css);
    expect(style["--font-body"]).toBe(bodyFonts.raleway.css);
    expect(style["--title-scale"]).toBe(titleFonts.pacifico.scale);
  });
});

describe("текстуры", () => {
  it("каждая текстура из схемы описана и подписана", () => {
    TEXTURES.filter((t) => t !== "none").forEach((t) => {
      const def = textures[t as Exclude<typeof t, "none">];
      expect(def.css.length).toBeGreaterThan(10);
      expect(def.opacity).toBeGreaterThan(0);
      expect(def.opacity).toBeLessThanOrEqual(1);
    });
    TEXTURES.forEach((t) => expect(textureLabels[t]).toBeTruthy());
  });

  it("SVG-текстуры встроены как data URI без внешних запросов", () => {
    expect(textures.hearts.css).toMatch(/^url\("data:image\/svg\+xml,/);
    expect(textures.grain.css).toContain("feTurbulence");
  });
});

describe("заголовки и заливки блоков", () => {
  it("headingsMode: капитель по умолчанию, шрифтом имён — рукописный или капитель", () => {
    expect(headingsMode({ headings: "caps", font: "script" })).toBe("caps");
    expect(headingsMode({ headings: "names", font: "script" })).toBe("script");
    expect(headingsMode({ headings: "names", font: "prata" })).toBe("serif");
    expect(isScriptFont("marck")).toBe(true);
    expect(isScriptFont("cormorant-sc")).toBe(false);
  });

  it("на заливке палитра «переворачивается»: у тёмной палитры текст на светлом — цвет её фона", () => {
    const base = createDefaultInvitation().theme;
    const navy = themeStyle({ ...base, palette: "navy" }) as Record<string, string>;
    expect(navy["--ink-light"]).toBe(palettes.navy.bg);
    expect(navy["--ink-dark"]).toBe(palettes.navy.text);
    const cream = themeStyle({ ...base, palette: "cream" }) as Record<string, string>;
    expect(cream["--ink-light"]).toBe(palettes.cream.text);
    expect(cream["--ink-dark"]).toBe(palettes.cream.bg);
    expect(cream["--accent-on-light"]).toBe(palettes.cream.accent);
  });
});
