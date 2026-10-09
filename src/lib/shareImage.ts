import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp, { type OverlayOptions } from "sharp";
import { findBlock } from "./blocks";
import type { InvitationData } from "./schema";
import { sharePhoto } from "./share";
import { palettes } from "./theme";

/** Размер картинки превью ссылки — стандарт Open Graph (WhatsApp, Telegram, Facebook). */
export const SHARE_IMAGE = { width: 1200, height: 630 };

const PUBLIC_DIR = path.join(process.cwd(), "public");
const MAX_REMOTE_BYTES = 8 * 1024 * 1024;

/**
 * Байты картинки приглашения: свои файлы — из public/, загруженные фото — только из нашего бакета Supabase
 * (произвольные адреса не скачиваем — сервер не должен ходить куда скажут). Не вышло — null.
 */
export async function loadInvitationImage(src: string, env: Record<string, string | undefined> = process.env): Promise<Buffer | null> {
  try {
    if (src.startsWith("/")) {
      const file = path.join(PUBLIC_DIR, path.normalize(decodeURIComponent(src.split("?")[0])));
      if (!file.startsWith(PUBLIC_DIR + path.sep)) return null;
      return await readFile(file);
    }
    const bucket = env.SUPABASE_URL && `${env.SUPABASE_URL.replace(/\/$/, "")}/storage/v1/object/public/`;
    if (!bucket || !src.startsWith(bucket)) return null;
    const res = await fetch(src, { signal: AbortSignal.timeout(5000) });
    if (!res.ok || Number(res.headers.get("content-length") ?? 0) > MAX_REMOTE_BYTES) return null;
    const bytes = Buffer.from(await res.arrayBuffer());
    return bytes.length > MAX_REMOTE_BYTES ? null : bytes;
  } catch {
    return null;
  }
}

/**
 * Картинка для превью ссылки в мессенджерах (JPEG: WebP показывают не все). Есть фото — оно, обрезанное под 1200×630.
 * Нет — украшение заставки на цвете палитры (текст не рисуем: на сервере нет шрифтов с кириллицей).
 */
export async function shareImage(data: InvitationData, env?: Record<string, string | undefined>): Promise<Buffer> {
  const { width, height } = SHARE_IMAGE;
  const photo = sharePhoto(data);
  const photoBytes = photo && (await loadInvitationImage(photo, env));
  if (photoBytes) {
    try {
      return await sharp(photoBytes, { limitInputPixels: 80_000_000 })
        .rotate()
        .resize(width, height, { fit: "cover", position: "attention" })
        .flatten({ background: palettes[data.theme.palette].bg })
        .jpeg({ quality: 82 })
        .toBuffer();
    } catch {
      // битое фото — рисуем запасную картинку
    }
  }

  const ornament = data.theme.envelope.ornament ?? findBlock(data, "hero")?.ornaments[0]?.src ?? null;
  const ornamentBytes = ornament && (await loadInvitationImage(ornament, env));
  const layers: OverlayOptions[] = [];
  if (ornamentBytes) {
    try {
      const side = Math.round(height * 0.86);
      const img = await sharp(ornamentBytes).resize(side, side, { fit: "inside" }).png().toBuffer();
      layers.push({ input: img, gravity: "center" });
    } catch {
      // без украшения — просто цвет палитры
    }
  }
  return sharp({ create: { width, height, channels: 3, background: palettes[data.theme.palette].bg } })
    .composite(layers)
    .jpeg({ quality: 82 })
    .toBuffer();
}
