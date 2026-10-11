import { timingSafeEqual } from "node:crypto";

/** Минимальная длина ключа админки: короткий подбирается перебором. */
export const ADMIN_KEY_MIN = 16;

/**
 * Скрытая админка `/admin/<ключ>`: ключ — `ADMIN_KEY` в env. Работает только локально: правит файлы проекта
 * (шаблоны, фото, ролики) и запускает запись видео (Playwright + ffmpeg) — на Vercel файловая система только для
 * чтения, поэтому там админки нет (404), даже с ключом.
 */
export function adminAvailable(env: Record<string, string | undefined> = process.env): boolean {
  return !env.VERCEL && !!env.ADMIN_KEY && env.ADMIN_KEY.length >= ADMIN_KEY_MIN;
}

/** Ключ верный и админка доступна. Сравнение за постоянное время, чтобы ключ не угадывали по задержке. */
export function adminKeyValid(key: string, env: Record<string, string | undefined> = process.env): boolean {
  if (!adminAvailable(env)) return false;
  const a = Buffer.from(key);
  const b = Buffer.from(env.ADMIN_KEY!);
  return a.length === b.length && timingSafeEqual(a, b);
}
