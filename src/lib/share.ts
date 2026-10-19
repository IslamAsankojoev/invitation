import { findBlock } from "./blocks";
import { describeDate, splitNames } from "./calendar";
import type { InvitationData, Language } from "./schema";
import { isValidSlug } from "./slug";
import { guestText } from "./i18n";

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

/** «19 июня 2027, 16:00» / «2027-ж. 19-июнь, 16:00» */
export function dateWords(local: string, lang: Language = "ru"): string {
  const d = describeDate(local, lang);
  return `${d.short}${d.time ? `, ${d.time}` : ""}`;
}

/** Текст сообщения гостям на языке приглашения: надпись, имена, дата, место и ссылка. */
export function shareMessage(data: InvitationData, url: string): string {
  const hero = findBlock(data, "hero");
  const place = findBlock(data, "location")?.placeName.trim();
  const fallback = guestText(data.language).invitation;
  const lines = hero ? [hero.label?.trim() || fallback, hero.names, dateWords(hero.date, data.language), place] : [fallback];
  return `${lines.filter(Boolean).join("\n")}\n\n${url}`;
}

export const whatsappShareUrl = (message: string) => `https://wa.me/?text=${encodeURIComponent(message)}`;

/** Telegram сам показывает ссылку отдельно — в text она не повторяется. */
export const telegramShareUrl = (url: string, message: string) =>
  `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(message.replace(`\n\n${url}`, ""))}`;

/**
 * Превью ссылки в WhatsApp/Telegram на языке приглашения: заголовок, строка «дата · место» и надписи картинки
 * (opengraph-image) — дата как на конверте, «19 . 06 . 2027».
 */
export function linkPreview(data: InvitationData) {
  const hero = findBlock(data, "hero");
  const names = hero?.names.trim() ?? "";
  const place = findBlock(data, "location")?.placeName.trim() || undefined;
  const invitation = guestText(data.language).invitation;
  return {
    title: names ? `${names} — ${invitation.toLowerCase()}` : invitation,
    description: [hero && dateWords(hero.date, data.language), place].filter(Boolean).join(" · ") || invitation,
    label: hero?.label?.trim() || invitation,
    names: names ? splitNames(names) : [],
    date: hero && describeDate(hero.date).dotted,
    place,
    photo: hero?.photo ?? null,
  };
}
