import { describeDate } from "./calendar";

/**
 * Прототип вечеринок: сторис-афиша, запись с кружком камеры и личный пропуск. Формат приглашения не трогает —
 * данные примера живут здесь, пока идея не проверена.
 */

export const PARTY_THEMES = ["neon", "disco", "masquerade", "y2k"] as const;
export type PartyThemeId = (typeof PARTY_THEMES)[number];

export type PartyEvent = {
  /** Крупное название на афише, строки — через \n. */
  title: string;
  kicker: string;
  host: string;
  /** "YYYY-MM-DDTHH:mm" — локальное время, как в приглашениях. */
  date: string;
  city: string;
  /** Что вместо адреса: адрес открывается только гостям с пропуском. */
  placeHint: string;
  dress: string;
  capacity: number;
};

export type PartyTheme = {
  id: PartyThemeId;
  label: string;
  /** Подпись под плиткой выбора. */
  mood: string;
  /** Темп бита: под него пульсирует афиша и играет синтезатор. */
  bpm: number;
  /** stage — фон вокруг кадра: всегда тёмный, на нём белые кнопки студии. */
  colors: { bg: string; ink: string; accent: string; accent2: string; stage: string };
  event: PartyEvent;
};

export const partyThemes: PartyTheme[] = [
  {
    id: "neon",
    label: "Неон",
    mood: "Рейв до утра",
    bpm: 128,
    colors: { bg: "#05030a", ink: "#f4f1ff", accent: "#c6ff00", accent2: "#ff2bd6", stage: "#05030a" },
    event: {
      title: "AFTER\nDARK",
      kicker: "CLOSED PARTY",
      host: "Айбек зовёт своих",
      date: "2026-11-07T23:00",
      city: "Бишкек",
      placeHint: "адрес — за 24 часа",
      dress: "всё чёрное + неон",
      capacity: 80,
    },
  },
  {
    id: "disco",
    label: "Диско",
    mood: "Блёстки и 70-е",
    bpm: 118,
    colors: { bg: "#1a0423", ink: "#fff3fb", accent: "#ff7ac8", accent2: "#ffd36e", stage: "#1a0423" },
    event: {
      title: "FEVER",
      kicker: "DISCO NIGHT",
      host: "Алина и друзья",
      date: "2026-11-14T21:00",
      city: "Бишкек",
      placeHint: "место — в пропуске",
      dress: "блёстки обязательны",
      capacity: 60,
    },
  },
  {
    id: "masquerade",
    label: "Маскарад",
    mood: "Тайный клуб",
    bpm: 100,
    colors: { bg: "#070605", ink: "#f6ead0", accent: "#d9b36a", accent2: "#8a6a2f", stage: "#070605" },
    event: {
      title: "Маскарад",
      kicker: "SECRET SOCIETY",
      host: "Только для своих",
      date: "2026-10-31T22:00",
      city: "Бишкек",
      placeHint: "пароль — в пропуске",
      dress: "black tie и маска",
      capacity: 40,
    },
  },
  {
    id: "y2k",
    label: "Y2K",
    mood: "День рождения",
    bpm: 124,
    colors: { bg: "#efe6ff", ink: "#1b1340", accent: "#7b5cff", accent2: "#ff5fa2", stage: "#1b1340" },
    event: {
      title: "ЛЕЙЛЕ\n25",
      kicker: "BIRTHDAY PARTY",
      host: "Лейла празднует",
      date: "2026-11-21T20:00",
      city: "Бишкек",
      placeHint: "вход по списку",
      dress: "хром, блёстки, бабочки",
      capacity: 50,
    },
  },
];

export const findPartyTheme = (id: string) => partyThemes.find((t) => t.id === id) ?? partyThemes[0];

const WEEKDAY_SHORT: Record<string, string> = {
  понедельник: "ПН", вторник: "ВТ", среда: "СР", четверг: "ЧТ", пятница: "ПТ", суббота: "СБ", воскресенье: "ВС",
};

/** Дата для афиши: «07.11», «СБ», «23:00». */
export function partyDate(local: string) {
  const d = describeDate(local);
  return {
    dayMonth: `${String(d.day).padStart(2, "0")}.${local.slice(5, 7)}`,
    weekday: WEEKDAY_SHORT[d.weekday],
    time: d.time,
  };
}

/** Номер пропуска: «027 / 080» — ширина по числу мест. */
export function passNumber(n: number, total: number): string {
  const width = Math.max(3, String(total).length);
  return `${String(n).padStart(width, "0")} / ${String(total).padStart(width, "0")}`;
}

/**
 * Пульс бита 0…1: вспышка в момент удара и быстрое затухание до следующего. Чистая функция времени — афиша
 * пульсирует в такт и без звука, и в записи.
 */
export function beatPulse(seconds: number, bpm: number): number {
  if (seconds < 0) return 0;
  const phase = (seconds * bpm) / 60;
  return Math.exp(-6 * (phase - Math.floor(phase)));
}

/** «0:07» */
export function formatTimer(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export type Point = { x: number; y: number };

export type Bounds = { minX: number; maxX: number; minY: number; maxY: number };

/**
 * Куда «прилипает» кружок камеры после броска: угол, ближайший к точке, куда он долетел бы по инерции
 * (позиция + скорость × 0.2 с). Быстрый бросок в сторону переносит кружок даже без длинного перетаскивания.
 * Координаты — доли кадра 0…1, `bounds` — где может стоять центр кружка (вне зон интерфейса сторис).
 */
export function bubbleCorner(pos: Point, velocity: Point, bounds: Bounds): Point {
  const projected = { x: pos.x + velocity.x * 0.2, y: pos.y + velocity.y * 0.2 };
  return {
    x: projected.x < (bounds.minX + bounds.maxX) / 2 ? bounds.minX : bounds.maxX,
    y: projected.y < (bounds.minY + bounds.maxY) / 2 ? bounds.minY : bounds.maxY,
  };
}

/** Резинка у границы: за краем кружок едет всё медленнее, а не упирается. */
export function rubberBand(value: number, min: number, max: number): number {
  if (value < min) return min - (min - value) * 0.35;
  if (value > max) return max + (value - max) * 0.35;
  return value;
}

/** MP4 — в первую очередь: его без перекодирования берут Instagram и WhatsApp; WebM — запасной (Chrome). */
const RECORDING_MIMES = [
  "video/mp4;codecs=avc1.42E01E,mp4a.40.2",
  "video/mp4",
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8,opus",
  "video/webm",
];

export function pickRecordingMime(isSupported: (mime: string) => boolean): string | null {
  return RECORDING_MIMES.find((m) => isSupported(m)) ?? null;
}

export const videoExtension = (mime: string) => (mime.startsWith("video/mp4") ? "mp4" : "webm");

/** Длина сторис: один сегмент Instagram. */
export const STORY_MAX_MS = 15_000;
