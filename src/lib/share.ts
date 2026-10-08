import { findBlock } from "./blocks";
import { describeDate, splitNames } from "./calendar";
import type { InvitationData } from "./schema";
import { isValidSlug } from "./slug";

/** Русские и кыргызские буквы → латиница (для ссылки из имён: «Айбек & Айзада» → aibek-aizada). */
const LATIN: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "zh", з: "z", и: "i", й: "i", к: "k", л: "l", м: "m",
  н: "n", ң: "ng", о: "o", ө: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ү: "u", ф: "f", х: "kh", ц: "ts",
  ч: "ch", ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
};

export function transliterate(text: string): string {
  return Array.from(text.toLowerCase(), (ch) => LATIN[ch] ?? ch).join("");
}

/** Ссылка из имён: «Айбек & Айзада» → «aibek-aizada». Не вышло (одни символы, слишком коротко) — null. */
export function slugFromNames(names: string): string | null {
  const slug = transliterate(splitNames(names).join(" "))
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40)
    .replace(/-+$/, "");
  return isValidSlug(slug) ? slug : null;
}

/** Варианты красивой ссылки для гостей: из имён и из имён с годом (если первая занята). */
export function slugSuggestions(data: InvitationData): string[] {
  const hero = findBlock(data, "hero");
  const base = hero && slugFromNames(hero.names);
  if (!base) return [];
  const withYear = `${base.slice(0, 35).replace(/-+$/, "")}-${describeDate(hero.date).year}`;
  return [base, withYear].filter((s, i, all) => isValidSlug(s) && all.indexOf(s) === i);
}

/** «19 июня 2027, 16:00» */
export function dateWords(local: string): string {
  const d = describeDate(local);
  return `${d.day} ${d.monthGenitive} ${d.year}${d.time ? `, ${d.time}` : ""}`;
}

const lowerFirst = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

/** Заголовок и описание для превью ссылки в мессенджерах (WhatsApp, Telegram). */
export function shareMeta(data: InvitationData): { title: string; description: string } {
  const hero = findBlock(data, "hero");
  if (!hero) return { title: "Приглашение", description: "" };
  const label = hero.label?.trim() || "Приглашение";
  const place = findBlock(data, "location")?.placeName.trim();
  return {
    title: `${hero.names} — ${lowerFirst(label)}`,
    description: [dateWords(hero.date), place].filter(Boolean).join(" · "),
  };
}

/** Текст сообщения гостям: надпись, имена, дата, место и ссылка. */
export function shareMessage(data: InvitationData, url: string): string {
  const hero = findBlock(data, "hero");
  const place = findBlock(data, "location")?.placeName.trim();
  const lines = hero ? [hero.label?.trim() || "Приглашение", hero.names, dateWords(hero.date), place] : ["Приглашение"];
  return `${lines.filter(Boolean).join("\n")}\n\n${url}`;
}

export const whatsappShareUrl = (message: string) => `https://wa.me/?text=${encodeURIComponent(message)}`;

/** Telegram сам показывает ссылку отдельно — в text она не повторяется. */
export const telegramShareUrl = (url: string, message: string) =>
  `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(message.replace(`\n\n${url}`, ""))}`;

/**
 * Картинка для превью ссылки: фото обложки, иначе первое фото из блоков по порядку. Нет фото — null
 * (тогда превью рисуется из украшения заставки на цвете палитры).
 */
export function sharePhoto(data: InvitationData): string | null {
  for (const block of data.blocks) {
    if (!block.visible) continue;
    if (block.type === "gallery" && block.photos[0]) return block.photos[0];
    if ("photo" in block && typeof block.photo === "string" && block.photo) return block.photo;
  }
  return null;
}
