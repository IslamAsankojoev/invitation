export const WEEKDAYS_SHORT = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
const WEEKDAYS = ["воскресенье", "понедельник", "вторник", "среда", "четверг", "пятница", "суббота"];
const MONTHS_GENITIVE = [
  "января", "февраля", "марта", "апреля", "мая", "июня",
  "июля", "августа", "сентября", "октября", "ноября", "декабря",
];
const MONTHS = [
  "январь", "февраль", "март", "апрель", "май", "июнь",
  "июль", "август", "сентябрь", "октябрь", "ноябрь", "декабрь",
];

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

export function describeDate(local: string) {
  const { year, month, day } = parseLocalDate(local);
  return {
    year,
    day,
    weekday: WEEKDAYS[new Date(Date.UTC(year, month - 1, day)).getUTCDay()],
    monthGenitive: MONTHS_GENITIVE[month - 1],
    monthName: MONTHS[month - 1],
    /** "16:00" */
    time: local.slice(11, 16),
    /** "07 . 11 . 2026" */
    dotted: `${String(day).padStart(2, "0")} . ${String(month).padStart(2, "0")} . ${year}`,
  };
}

/** "Дастан & Нуркыз" → "Д&Н"; одно имя → первая буква. */
export function monogram(names: string): string {
  const parts = names
    .split(/\s*[&+]\s*|\s+и\s+/i)
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
