import { blockTitle } from "./blocks";
import type { Block } from "./schema";

/**
 * Быстрая правка текста прямо в превью (телефон): нажали на надпись — снизу поле с этим текстом, приглашение видно.
 * Только простые строки блока; пункты программы, контакты и дата открываются в панели, как раньше.
 */
export const QUICK_EDIT_FIELDS = {
  names: "Имена",
  label: "Надпись над именами",
  subtitle: "Подзаголовок",
  title: "Заголовок",
  scriptLine: "Строка под заголовком",
  text: "Текст",
  placeName: "Название места",
  address: "Адрес",
  caption: "Подпись",
} as const;

export type QuickEditField = keyof typeof QUICK_EDIT_FIELDS;

/** Длинные тексты правятся в многострочном поле. */
export const MULTILINE_FIELDS: ReadonlySet<QuickEditField> = new Set(["text", "subtitle"]);

export function isQuickEditField(field: string | undefined): field is QuickEditField {
  return !!field && Object.hasOwn(QUICK_EDIT_FIELDS, field);
}

/** Что сейчас написано в приглашении: у заголовка без своего текста — стандартный («Программа дня»). */
export function quickEditValue(block: Block, field: QuickEditField): string {
  if (field === "title") return blockTitle(block);
  const value = (block as Record<string, unknown>)[field];
  return typeof value === "string" ? value : "";
}

/** Правка поля — частичный блок для updateBlock. */
export const quickEditPatch = (field: QuickEditField, value: string): Partial<Block> => ({ [field]: value }) as Partial<Block>;
