/**
 * История правок редактора для «Отменить / Вернуть». Чистые функции, вход не меняется.
 * Правки чаще MERGE_MS друг за другом (набор текста, перетаскивание ползунка) — один шаг, а не шаг на каждую букву.
 */
export type History<T> = { past: T[]; present: T; future: T[]; /** время последней правки; 0 — следующую не склеивать */ at: number };

export const HISTORY_LIMIT = 50;
export const MERGE_MS = 1000;

export const createHistory = <T>(present: T): History<T> => ({ past: [], present, future: [], at: 0 });

export function record<T>(h: History<T>, next: T, now: number): History<T> {
  if (next === h.present) return h;
  if (h.at && now - h.at < MERGE_MS && h.past.length) return { ...h, present: next, future: [], at: now };
  return { past: [...h.past, h.present].slice(-HISTORY_LIMIT), present: next, future: [], at: now };
}

export function undo<T>(h: History<T>): History<T> {
  if (!h.past.length) return h;
  return { past: h.past.slice(0, -1), present: h.past[h.past.length - 1], future: [h.present, ...h.future], at: 0 };
}

export function redo<T>(h: History<T>): History<T> {
  if (!h.future.length) return h;
  return { past: [...h.past, h.present], present: h.future[0], future: h.future.slice(1), at: 0 };
}
