import { headers } from "next/headers";

/** Адрес сайта из запроса — для абсолютных ссылок (превью в мессенджерах, текст для WhatsApp) на любом домене. */
export async function requestOrigin(): Promise<URL | undefined> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) return undefined;
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  try {
    return new URL(`${proto}://${host}`);
  } catch {
    return undefined;
  }
}
