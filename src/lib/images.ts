import sharp from "sharp";

/** Длинная сторона загруженного фото: на странице приглашения шире ~1200 px картинка не бывает (×1.3 на запас). */
export const MAX_IMAGE_SIDE = 1600;

/**
 * Готовит загруженную картинку к хранению: поворот по EXIF, не больше MAX_IMAGE_SIDE, WebP. Метаданные (в т.ч.
 * геолокация из снимков телефона) не переносятся. Анимированный GIF остаётся анимированным WebP, SVG растеризуется
 * (не храним исполняемый SVG). Бросает ошибку, если это не картинка.
 */
export async function optimizeImage(bytes: Uint8Array): Promise<{ bytes: Uint8Array; type: "image/webp" }> {
  const out = await sharp(bytes, { animated: true, limitInputPixels: 80_000_000 })
    .rotate()
    .resize({ width: MAX_IMAGE_SIDE, height: MAX_IMAGE_SIDE, fit: "inside", withoutEnlargement: true })
    .webp({ quality: 80, effort: 4 })
    .toBuffer();
  return { bytes: new Uint8Array(out), type: "image/webp" };
}
