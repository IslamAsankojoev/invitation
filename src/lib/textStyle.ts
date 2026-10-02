import type { CSSProperties } from "react";
import type { Block, TextFont, TextStyle } from "./schema";
import { bodyFonts, titleFonts } from "./theme";

/**
 * Свой цвет и шрифт у текстовых полей блока (block.textStyles). Ключ — поле; у пунктов программы один стиль
 * на все пункты (time/itemTitle/itemDescription), чтобы программа оставалась единой; так же у контактов
 * (personName/personRole).
 */
export const TEXT_KEYS = [
  "title",
  "scriptLine",
  "names",
  "label",
  "subtitle",
  "text",
  "placeName",
  "address",
  "time",
  "itemTitle",
  "itemDescription",
  "button",
  "caption",
  "personName",
  "personRole",
] as const;
export type TextKey = (typeof TEXT_KEYS)[number];

/** Все шрифты для выбора: сначала шрифты имён, затем основного текста, без повторов. */
export const textFonts: { value: TextFont; label: string; css: string }[] = [
  ...Object.entries(titleFonts).map(([value, f]) => ({ value: value as TextFont, label: f.label, css: f.css })),
  ...Object.entries(bodyFonts)
    .filter(([value]) => !(value in titleFonts))
    .map(([value, f]) => ({ value: value as TextFont, label: f.label, css: f.css })),
];
const fontCss = new Map(textFonts.map((f) => [f.value, f.css]));

/** Inline-стиль текста поля; без своего стиля — undefined (текст как в теме). */
export function textStyle(block: Pick<Block, "textStyles">, key: TextKey): CSSProperties | undefined {
  const s = block.textStyles?.[key];
  if (!s || (!s.color && !s.font)) return undefined;
  return { color: s.color, fontFamily: s.font ? fontCss.get(s.font) : undefined };
}

/** Новый textStyles блока с изменённым стилем поля; пустой стиль удаляется. Не мутирует вход. */
export function withTextStyle(styles: Block["textStyles"], key: TextKey, patch: Partial<TextStyle>): Block["textStyles"] {
  const next = { ...styles[key], ...patch };
  if (!next.color) delete next.color;
  if (!next.font) delete next.font;
  const { [key]: _removed, ...rest } = styles;
  return next.color || next.font ? { ...rest, [key]: next } : rest;
}
