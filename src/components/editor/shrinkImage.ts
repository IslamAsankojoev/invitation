/** Длинная сторона после уменьшения в браузере — та же, что хранит сервер (lib/images.ts). */
const MAX_SIDE = 1600;
/** Небольшие снимки отправляем как есть — сервер всё равно переведёт их в WebP. */
const SMALL_BYTES = 1.5 * 1024 * 1024;

/**
 * Уменьшает фото в браузере перед отправкой: фото с телефона весит 3–8 МБ, а Vercel принимает запрос до 4.5 МБ.
 * JPEG/HEIC → JPEG, PNG/WebP (может быть прозрачность) → WebP, где браузер умеет, иначе PNG. GIF/SVG и всё, что
 * браузер не смог прочитать, уходит без изменений — тогда решает сервер.
 */
export async function shrinkImage(file: File): Promise<File> {
  if (!/^image\/(jpeg|png|webp|heic|heif)$/.test(file.type) || typeof createImageBitmap === "undefined") return file;
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return file;
  }
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && file.size <= SMALL_BYTES) {
    bitmap.close();
    return file;
  }
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const alpha = file.type === "image/png" || file.type === "image/webp";
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, alpha ? "image/webp" : "image/jpeg", 0.85));
  // Не получилось или вышло не меньше исходника — отправляем исходник.
  if (!blob || blob.size >= file.size) return file;
  const ext = blob.type === "image/jpeg" ? "jpg" : blob.type.split("/")[1];
  return new File([blob], file.name.replace(/\.[^.]+$/, "") + "." + ext, { type: blob.type });
}
