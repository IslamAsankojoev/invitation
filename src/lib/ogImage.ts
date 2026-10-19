import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import type { InvitationData } from "./schema";
import { bodyFonts, resolveBodyFont, titleFonts } from "./theme";

/** Картинка превью ссылки (app/i/[slug]/opengraph-image.tsx): размер, рекомендованный WhatsApp, Telegram и Facebook. */
export const OG_SIZE = { width: 1200, height: 630 };

/** Подписи шрифтов в theme.ts — это имена Google Fonts, кроме сокращённых. */
const GOOGLE_NAMES: Record<string, string> = { Cormorant: "Cormorant Garamond", "Old Standard": "Old Standard TT" };
const googleName = (label: string) => GOOGLE_NAMES[label] ?? label;

/** Шрифты картинки: имена — шрифтом имён темы, место — основным, дата и надпись — капителью Tenor Sans, как на конверте. */
export function ogFontFamilies(theme: InvitationData["theme"]) {
  return {
    title: googleName(titleFonts[theme.font].label),
    titleScale: titleFonts[theme.font].scale ?? 1,
    body: googleName(bodyFonts[resolveBodyFont(theme)].label),
    heading: "Tenor Sans",
  };
}

// Старый Safari: Google отдаёт ему TTF (satori не читает WOFF2) — так же грузит шрифты сам next/og.
const TTF_USER_AGENT =
  "Mozilla/5.0 (Macintosh; U; Intel Mac OS X 10_6_8; de-at) AppleWebKit/533.21.1 (KHTML, like Gecko) Version/5.0.5 Safari/533.21.1";
const fontCache = new Map<string, Promise<ArrayBuffer | null>>();

/**
 * Шрифт Google Fonts только с нужными буквами (`text=`, несколько КБ): все шрифты приглашений — с кириллицей,
 * держать их TTF в проекте не нужно. Нет сети — null: next/og подставит свой запасной шрифт.
 */
export function loadGoogleFont(family: string, text: string, fetchImpl: typeof fetch = fetch): Promise<ArrayBuffer | null> {
  const key = `${family}\n${text}`;
  const cached = fontCache.get(key);
  if (cached) return cached;
  if (fontCache.size > 300) fontCache.clear();
  const url = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}&text=${encodeURIComponent(text)}`;
  const load = (async () => {
    try {
      const css = await (await fetchImpl(url, { headers: { "User-Agent": TTF_USER_AGENT }, signal: AbortSignal.timeout(4000) })).text();
      const src = css.match(/src: url\((.+?)\) format\('(?:opentype|truetype)'\)/)?.[1];
      if (!src) return null;
      const res = await fetchImpl(src, { signal: AbortSignal.timeout(4000) });
      return res.ok ? await res.arrayBuffer() : null;
    } catch {
      return null;
    }
  })();
  fontCache.set(key, load);
  // Неудачу не кэшируем — следующий запрос попробует снова.
  load.then((data) => {
    if (!data) fontCache.delete(key);
  });
  return load;
}

/**
 * Откуда брать фото обложки. Только свои файлы: из public/ (шаблоны, локальные загрузки) или публичный бакет
 * Supabase. Чужие адреса сервер не запрашивает — иначе любой мог бы заставить его ходить по внутренней сети.
 */
export function photoSource(
  url: string,
  supabaseUrl = process.env.SUPABASE_URL,
  publicDir = path.join(process.cwd(), "public"),
): { file: string } | { remote: string } | null {
  try {
    if (url.startsWith("/") && !url.startsWith("//")) {
      const file = path.join(publicDir, decodeURIComponent(url.split(/[?#]/)[0]));
      return file.startsWith(publicDir + path.sep) ? { file } : null;
    }
    if (!supabaseUrl) return null;
    const u = new URL(url);
    const ok = u.origin === new URL(supabaseUrl).origin && u.pathname.startsWith("/storage/v1/object/public/");
    return ok ? { remote: u.toString() } : null;
  } catch {
    return null;
  }
}

/** Фото обложки, обрезанное под картинку превью, — JPEG data URI (satori не читает WebP). Не вышло — без фото. */
export async function loadPhoto(url: string | null, fetchImpl: typeof fetch = fetch): Promise<string | null> {
  const source = url ? photoSource(url) : null;
  if (!source) return null;
  try {
    let bytes: Buffer;
    if ("file" in source) bytes = await readFile(source.file);
    else {
      const res = await fetchImpl(source.remote, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) return null;
      bytes = Buffer.from(await res.arrayBuffer());
    }
    const jpeg = await sharp(bytes).rotate().resize(OG_SIZE.width, OG_SIZE.height, { fit: "cover" }).jpeg({ quality: 82 }).toBuffer();
    return `data:image/jpeg;base64,${jpeg.toString("base64")}`;
  } catch {
    return null;
  }
}

/** Кегль имени: длинные имена мельче, чтобы строка помещалась в карточку; scale — как у шрифта в приглашении. */
export function namesFontSize(names: string[], scale = 1): number {
  const longest = Math.max(1, ...names.map((n) => n.length));
  return Math.round(Math.max(44, Math.min(104, 900 / longest)) * scale);
}

/** PNG от next/og → JPEG: с фото PNG весит ~1 МБ, а WhatsApp не показывает картинки тяжелее ~300 КБ. */
export const toJpeg = (png: ArrayBuffer) => sharp(Buffer.from(png)).jpeg({ quality: 84, mozjpeg: true }).toBuffer();
