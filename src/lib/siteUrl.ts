import { headers } from "next/headers";

/** Адрес сайта по заголовкам запроса: свой хост (локально, по Wi-Fi, превью-деплой) или тот, что передал прокси. */
export function originFrom(get: (name: string) => string | null | undefined): URL {
  const host = get("x-forwarded-host")?.split(",")[0].trim() || get("host") || "localhost:3000";
  const local = /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host);
  const proto = get("x-forwarded-proto")?.split(",")[0].trim() || (local ? "http" : "https");
  return new URL(`${proto}://${host}`);
}

/**
 * Адрес сайта для абсолютных ссылок в метаданных (og:url, og:image — WhatsApp и Telegram относительные не берут):
 * SITE_URL из env (прод), иначе хост запроса.
 */
export async function siteUrl(): Promise<URL> {
  if (process.env.SITE_URL) return new URL(process.env.SITE_URL);
  const h = await headers();
  return originFrom((name) => h.get(name));
}
