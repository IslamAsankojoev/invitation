import type { Language } from "./schema";

/** Дни недели с понедельника — шапка календаря. */
const WEEKDAYS_SHORT_BY_LANG: Record<Language, string[]> = {
  ru: ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"],
  ky: ["Дш", "Шш", "Шр", "Бш", "Жм", "Иш", "Жк"],
};
export const WEEKDAYS_SHORT = WEEKDAYS_SHORT_BY_LANG.ru;
export const weekdaysShort = (lang: Language = "ru") => WEEKDAYS_SHORT_BY_LANG[lang];

/** С воскресенья — как getUTCDay(). */
const WEEKDAYS: Record<Language, string[]> = {
  ru: ["воскресенье", "понедельник", "вторник", "среда", "четверг", "пятница", "суббота"],
  ky: ["жекшемби", "дүйшөмбү", "шейшемби", "шаршемби", "бейшемби", "жума", "ишемби"],
};
const MONTHS: Record<Language, string[]> = {
  ru: ["январь", "февраль", "март", "апрель", "май", "июнь", "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь"],
  ky: ["январь", "февраль", "март", "апрель", "май", "июнь", "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь"],
};
/** «19 июня». В кыргызском дата — «19-июнь», месяц не склоняется. */
const MONTHS_GENITIVE: Record<Language, string[]> = {
  ru: ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"],
  ky: MONTHS.ky,
};
/** Кыргызский месяц с притяжательным аффиксом — «2027-жылдын 19-июну». */
const MONTHS_POSSESSIVE_KY = ["январы", "февралы", "марты", "апрели", "майы", "июну", "июлу", "августу", "сентябры", "октябры", "ноябры", "декабры"];

/** Разбирает "YYYY-MM-DD…" без учёта часового пояса. */
export function parseLocalDate(local: string) {
  const [y, m, d] = local.slice(0, 10).split("-").map(Number);
  return { year: y, month: m, day: d };
}

/**
 * Сетка месяца по неделям, неделя начинается с понедельника.
 * Пустые клетки до первого числа и после последнего — null.
 */
export function buildMonthGrid(year: number, month: number): (number | null)[][] {
  const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const firstWeekday = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7; // 0 = пн
  const cells: (number | null)[] = [
    ...Array<null>(firstWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7) cells.push(null);
  return Array.from({ length: cells.length / 7 }, (_, w) => cells.slice(w * 7, w * 7 + 7));
}

/**
 * Части даты для вывода на выбранном языке. Склеенные строки (dayMonth, short, long) — готовые: порядок слов в
 * кыргызском другой («2027-жылдын 19-июну»), собирать дату из частей в компонентах нельзя.
 */
export function describeDate(local: string, lang: Language = "ru") {
  const { year, month, day } = parseLocalDate(local);
  const genitive = MONTHS_GENITIVE[lang][month - 1];
  const ky = lang === "ky";
  return {
    year,
    day,
    weekday: WEEKDAYS[lang][new Date(Date.UTC(year, month - 1, day)).getUTCDay()],
    /** ru — «июня» (после числа), ky — «июнь». */
    monthGenitive: genitive,
    monthName: MONTHS[lang][month - 1],
    /** «19 июня» / «19-июнь» */
    dayMonth: ky ? `${day}-${genitive}` : `${day} ${genitive}`,
    /** «19 июня 2027» / «2027-ж. 19-июнь» */
    short: ky ? `${year}-ж. ${day}-${genitive}` : `${day} ${genitive} ${year}`,
    /** «19 июня 2027 г.» / «2027-жылдын 19-июну» */
    long: ky ? `${year}-жылдын ${day}-${MONTHS_POSSESSIVE_KY[month - 1]}` : `${day} ${genitive} ${year} г.`,
    /** "16:00" */
    time: local.slice(11, 16),
    /** "07 . 11 . 2026" */
    dotted: `${String(day).padStart(2, "0")} . ${String(month).padStart(2, "0")} . ${year}`,
  };
}

/** "Дастан & Нуркыз" → "Д&Н"; одно имя → первая буква. Союз — «и» или кыргызское «жана». */
export function monogram(names: string): string {
  const parts = names
    .split(/\s*[&+]\s*|\s+(?:и|жана)\s+/i)
    .map((p) => p.trim())
    .filter(Boolean);
  const initials = parts.slice(0, 2).map((p) => p[0].toUpperCase());
  return initials.join("&");
}

/** "Дастан & Нуркыз" → ["Дастан", "Нуркыз"] — для вывода имён в две строки с «&» между ними. */
export function splitNames(names: string): string[] {
  const parts = names.split(/\s*&\s*/).map((p) => p.trim()).filter(Boolean);
  return parts.length === 2 ? parts : [names.trim()];
}

/** Неделя (с понедельника), в которую попадает дата: числа дней и отметка дня события. */
export function buildWeek(year: number, month: number, day: number): { day: number; isEvent: boolean }[] {
  const date = new Date(Date.UTC(year, month - 1, day));
  const monday = new Date(date);
  monday.setUTCDate(day - ((date.getUTCDay() + 6) % 7));
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(monday);
    d.setUTCDate(monday.getUTCDate() + i);
    return { day: d.getUTCDate(), isEvent: d.getTime() === date.getTime() };
  });
}
