/** Быстрый старт после выбора шаблона: повод, имена, дата и время, место. */

/** Поводы — готовые надписи над именами. Кыргызские названия тоев — как их пишут по-русски. */
export const EVENT_KINDS = [
  { label: "Свадьба", text: "Приглашение на свадьбу" },
  { label: "Той", text: "Приглашение на той" },
  { label: "Кыз узатуу", text: "Приглашение на кыз узатуу" },
  { label: "Сүннөт той", text: "Приглашение на сүннөт той" },
  { label: "Бешик той", text: "Приглашение на бешик той" },
  { label: "День рождения", text: "Приглашение на день рождения" },
  { label: "Юбилей", text: "Приглашение на юбилей" },
] as const;

/** «2027-06-19T16:00» → дата и время отдельно (для полей date и time на телефоне). */
export function splitDateTime(local: string): { date: string; time: string } {
  return { date: local.slice(0, 10), time: local.slice(11, 16) };
}

/**
 * Ссылка на карту из того, что вставил человек. «Поделиться» в 2ГИС и Google Maps копирует текст вместе со ссылкой —
 * берём из него первую ссылку; без https:// дописываем его. Пусто — undefined, не похоже на ссылку — null.
 */
export function normalizeMapUrl(input: string): string | undefined | null {
  const text = input.trim();
  if (!text) return undefined;
  const raw = text.match(/https?:\/\/\S+/i)?.[0] ?? (/\s/.test(text) ? "" : `https://${text}`);
  try {
    const url = new URL(raw);
    return url.hostname.includes(".") ? url.href : null;
  } catch {
    return null;
  }
}

/** Дата и время обратно в формат приглашения; пустое время — полдень, неполная дата — null. */
export function joinDateTime(date: string, time: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;
  return `${date}T${/^\d{2}:\d{2}$/.test(time) ? time : "12:00"}`;
}
