import sharp from "sharp";

/** Настоящая картинка для тестов загрузки: сервер теперь декодирует и сжимает файл, «нули» он не примет. */
export async function pngOf(width: number, height: number, withExif = false): Promise<Uint8Array<ArrayBuffer>> {
  let img = sharp({ create: { width, height, channels: 4, background: { r: 200, g: 120, b: 90, alpha: 1 } } }).png();
  if (withExif) img = img.withExif({ IFD0: { Make: "TestPhone", Copyright: "секрет" } });
  return new Uint8Array(await img.toBuffer());
}
