/**
 * История правок для «Отменить / Повторить». Чистые функции, вход не мутируют.
 * Правки чаще, чем раз в `mergeMs` (набор текста, ползунок), сливаются в один шаг — иначе отмена шла бы по букве.
 */
export type History<T> = { past: T[]; present: T; future: T[]; /** Время последней правки; 0 — следующая не сливается. */ at: number };

export const HISTORY_MERGE_MS = 700;
export const HISTORY_LIMIT = 100;

export const createHistory = <T>(present: T): History<T> => ({ past: [], present, future: [], at: 0 });

export function commit<T>(h: History<T>, next: T, now: number, mergeMs = HISTORY_MERGE_MS, limit = HISTORY_LIMIT): History<T> {
  if (next === h.present) return h;
  const merge = h.at > 0 && now - h.at < mergeMs && h.past.length > 0;
  const past = merge ? h.past : [...h.past, h.present].slice(-limit);
  return { past, present: next, future: [], at: now };
}

export function undo<T>(h: History<T>): History<T> {
  if (h.past.length === 0) return h;
  return { past: h.past.slice(0, -1), present: h.past[h.past.length - 1], future: [h.present, ...h.future], at: 0 };
}

export function redo<T>(h: History<T>): History<T> {
  if (h.future.length === 0) return h;
  return { past: [...h.past, h.present], present: h.future[0], future: h.future.slice(1), at: 0 };
}
