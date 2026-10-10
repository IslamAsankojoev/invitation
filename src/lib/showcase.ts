import { timingSafeEqual } from "node:crypto";

/** Минимальная длина ключа: короткий ключ подбирается перебором. */
export const SHOWCASE_KEY_MIN = 16;

/**
 * Скрытый показ шаблонов `/showcase/<ключ>`: ключ — `SHOWCASE_KEY` в env. Не задан или короче
 * SHOWCASE_KEY_MIN — страниц нет (404). Сравнение за постоянное время, чтобы ключ не угадывали по задержке.
 */
export function showcaseKeyValid(key: string, secret: string | undefined = process.env.SHOWCASE_KEY): boolean {
  if (!secret || secret.length < SHOWCASE_KEY_MIN) return false;
  const a = Buffer.from(key);
  const b = Buffer.from(secret);
  return a.length === b.length && timingSafeEqual(a, b);
}
