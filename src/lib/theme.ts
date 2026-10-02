import type { CSSProperties } from "react";
import type { BodyFont, Font, Palette, Theme } from "./schema";

/** Тема меняет только CSS-переменные — шаблон приглашения один. */
export const palettes: Record<Palette, { label: string; bg: string; text: string; accent: string; dark?: boolean }> = {
  cream: { label: "Кремовая", bg: "#f7f1e8", text: "#3e3630", accent: "#b39a74" },
  blush: { label: "Пудровая", bg: "#fbf1ee", text: "#4a3035", accent: "#b86b7a" },
  emerald: { label: "Изумрудная", bg: "#eef4ef", text: "#1f3a2e", accent: "#2f6f4f" },
  ivory: { label: "Айвори", bg: "#fbf8f1", text: "#3b342a", accent: "#a07d45" },
  autumn: { label: "Осенняя", bg: "#f6ebdb", text: "#4a3526", accent: "#b5602a" },
  night: { label: "Ночная", bg: "#151b2c", text: "#ece8f4", accent: "#d4b872", dark: true },
  lavender: { label: "Лавандовая", bg: "#f6f2f7", text: "#3f3548", accent: "#8e7aa8" },
  noir: { label: "Чёрное золото", bg: "#15130f", text: "#efe7d6", accent: "#c9a45c", dark: true },
  navy: { label: "Тёмно-синяя", bg: "#16243a", text: "#efe9df", accent: "#c8a76a", dark: true },
  mocha: { label: "Мокко", bg: "#f6f1eb", text: "#3a2a20", accent: "#9b7b5d" },
  pearl: { label: "Жемчужная", bg: "#f7f0ea", text: "#4a3832", accent: "#c0877f" },
  sand: { label: "Песочная", bg: "#f2eadd", text: "#4a3c2f", accent: "#a2835c" },
};

const stack = (variable: string, fallback: string) => `var(${variable}), ${fallback}`;
const serif = "Georgia, serif";
const sans = "system-ui, sans-serif";
const cursive = "cursive";

type BodyKey = Exclude<BodyFont, "auto">;

/**
 * Шрифты имён. `pair` — основной шрифт, который подставляется при bodyFont = "auto".
 * `scale` выравнивает кегль: у рукописных шрифтов очень разный размер глифов.
 */
export const titleFonts: Record<Font, { label: string; css: string; pair: BodyKey; scale?: number }> = {
  script: { label: "Great Vibes", css: stack("--font-great-vibes", cursive), pair: "cormorant" },
  serif: { label: "Cormorant", css: stack("--font-cormorant", serif), pair: "cormorant", scale: 0.9 },
  sans: { label: "Inter", css: stack("--font-inter", sans), pair: "inter", scale: 0.7 },
  marck: { label: "Marck Script", css: stack("--font-marck", cursive), pair: "cormorant", scale: 0.85 },
  "bad-script": { label: "Bad Script", css: stack("--font-bad-script", cursive), pair: "cormorant", scale: 0.75 },
  caveat: { label: "Caveat", css: stack("--font-caveat", cursive), pair: "raleway", scale: 0.95 },
  lobster: { label: "Lobster", css: stack("--font-lobster", cursive), pair: "montserrat", scale: 0.75 },
  pacifico: { label: "Pacifico", css: stack("--font-pacifico", cursive), pair: "montserrat", scale: 0.65 },
  amatic: { label: "Amatic SC", css: stack("--font-amatic", cursive), pair: "raleway", scale: 1 },
  playfair: { label: "Playfair Display", css: stack("--font-playfair", serif), pair: "lora", scale: 0.72 },
  prata: { label: "Prata", css: stack("--font-prata", serif), pair: "cormorant", scale: 0.68 },
  forum: { label: "Forum", css: stack("--font-forum", serif), pair: "cormorant", scale: 0.85 },
  yeseva: { label: "Yeseva One", css: stack("--font-yeseva", serif), pair: "lora", scale: 0.7 },
  "cormorant-sc": { label: "Cormorant SC", css: stack("--font-cormorant-sc", serif), pair: "cormorant", scale: 0.75 },
  oranienbaum: { label: "Oranienbaum", css: stack("--font-oranienbaum", serif), pair: "old-standard", scale: 0.85 },
  poiret: { label: "Poiret One", css: stack("--font-poiret", sans), pair: "raleway", scale: 0.75 },
  comfortaa: { label: "Comfortaa", css: stack("--font-comfortaa", sans), pair: "manrope", scale: 0.65 },
  comforter: { label: "Comforter", css: stack("--font-comforter", cursive), pair: "cormorant", scale: 1.05 },
  "comforter-brush": { label: "Comforter Brush", css: stack("--font-comforter-brush", cursive), pair: "spectral", scale: 1.05 },
  alice: { label: "Alice", css: stack("--font-alice", serif), pair: "cormorant", scale: 0.72 },
  kurale: { label: "Kurale", css: stack("--font-kurale", serif), pair: "lora", scale: 0.72 },
  philosopher: { label: "Philosopher", css: stack("--font-philosopher", sans), pair: "jost", scale: 0.72 },
  ruslan: { label: "Ruslan Display", css: stack("--font-ruslan", serif), pair: "old-standard", scale: 0.68 },
  "cormorant-unicase": { label: "Cormorant Unicase", css: stack("--font-cormorant-unicase", serif), pair: "cormorant", scale: 0.72 },
  "cormorant-infant": { label: "Cormorant Infant", css: stack("--font-cormorant-infant", serif), pair: "cormorant", scale: 0.9 },
  "playfair-sc": { label: "Playfair SC", css: stack("--font-playfair-sc", serif), pair: "literata", scale: 0.62 },
  gabriela: { label: "Gabriela", css: stack("--font-gabriela", serif), pair: "spectral", scale: 0.68 },
  pattaya: { label: "Pattaya", css: stack("--font-pattaya", cursive), pair: "montserrat", scale: 0.72 },
  bellota: { label: "Bellota", css: stack("--font-bellota", sans), pair: "jost", scale: 0.72 },
};

export const bodyFonts: Record<BodyKey, { label: string; css: string }> = {
  cormorant: { label: "Cormorant", css: stack("--font-cormorant", serif) },
  lora: { label: "Lora", css: stack("--font-lora", serif) },
  "eb-garamond": { label: "EB Garamond", css: stack("--font-eb-garamond", serif) },
  playfair: { label: "Playfair Display", css: stack("--font-playfair", serif) },
  "old-standard": { label: "Old Standard", css: stack("--font-old-standard", serif) },
  "pt-serif": { label: "PT Serif", css: stack("--font-pt-serif", serif) },
  montserrat: { label: "Montserrat", css: stack("--font-montserrat", sans) },
  raleway: { label: "Raleway", css: stack("--font-raleway", sans) },
  manrope: { label: "Manrope", css: stack("--font-manrope", sans) },
  inter: { label: "Inter", css: stack("--font-inter", sans) },
  literata: { label: "Literata", css: stack("--font-literata", serif) },
  spectral: { label: "Spectral", css: stack("--font-spectral", serif) },
  vollkorn: { label: "Vollkorn", css: stack("--font-vollkorn", serif) },
  alegreya: { label: "Alegreya", css: stack("--font-alegreya", serif) },
  jost: { label: "Jost", css: stack("--font-jost", sans) },
  arsenal: { label: "Arsenal", css: stack("--font-arsenal", sans) },
};

/** Рукописный ли шрифт имён (у таких заголовки в режиме «шрифтом имён» пишутся строчными). */
export const isScriptFont = (font: Font) => titleFonts[font].css.endsWith(cursive);

/** Вид заголовков блоков для атрибута data-headings: капитель, шрифт имён капителью или рукописный. */
export const headingsMode = (theme: Pick<Theme, "headings" | "font">) =>
  theme.headings === "caps" ? "caps" : isScriptFont(theme.font) ? "script" : "serif";

export const resolveBodyFont = (theme: Pick<Theme, "font" | "bodyFont">): BodyKey =>
  theme.bodyFont === "auto" ? titleFonts[theme.font].pair : theme.bodyFont;

export function themeStyle(theme: Theme): CSSProperties {
  const p = palettes[theme.palette];
  const title = titleFonts[theme.font];
  return {
    "--bg": p.bg,
    "--text": p.text,
    "--accent": p.accent,
    "--font-title": title.css,
    "--title-scale": title.scale ?? 1,
    "--font-body": bodyFonts[resolveBodyFont(theme)].css,
    // Текст на кнопках цвета акцента: на тёмной палитре акцент светлый (золото) — нужен тёмный текст.
    "--on-accent": p.dark ? p.bg : "#fff",
    // Фон полей формы и свечение конверта: на тёмной палитре подмешиваем немного света, на светлой — белого.
    "--field": p.dark ? `color-mix(in srgb, ${p.bg} 88%, white)` : `color-mix(in srgb, ${p.bg} 60%, white)`,
    // Основа под серые фактуры фона блока (они «умножаются» на неё): на тёмной палитре — чуть светлее фона.
    "--tex-base": p.dark ? `color-mix(in srgb, ${p.bg} 86%, white)` : `color-mix(in srgb, ${p.bg} 60%, white)`,
    "--glow": p.dark
      ? `color-mix(in srgb, ${p.accent} 16%, transparent)`
      : "color-mix(in srgb, white 55%, transparent)",
    // Заливки блока цветом (bgColor) и светлые предметы на тёмной палитре: палитра «переворачивается» —
    // на светлой заливке текст цвета текста светлой палитры (у тёмной — цвет её фона), на тёмной — наоборот.
    "--ink-light": p.dark ? p.bg : p.text,
    "--ink-dark": p.dark ? p.text : p.bg,
    "--accent-on-light": p.dark ? `color-mix(in srgb, ${p.accent} 72%, black)` : p.accent,
    "--accent-on-dark": p.dark ? p.accent : `color-mix(in srgb, ${p.accent} 58%, white)`,
    // Бумага предметов на CSS (билет обложки): на тёмной палитре — тёплая кремовая, на светлой — светлее фона.
    "--paper": p.dark ? "#f3ede2" : `color-mix(in srgb, ${p.bg} 45%, white)`,
  } as CSSProperties;
}
