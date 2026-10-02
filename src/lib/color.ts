/** Цвета #rrggbb: яркость и смешивание — для заливки блока цветом и образцов в редакторе. */

const channels = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));

/** Относительная яркость по WCAG: 0 — чёрный, 1 — белый. */
export function luminance(hex: string): number {
  const [r, g, b] = channels(hex).map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Тёмный ли цвет: на нём нужен светлый текст (порог — где контраст с белым и чёрным примерно равен). */
export const isDarkColor = (hex: string) => luminance(hex) < 0.18;

/** Смесь двух цветов: t = 0 — первый, 1 — второй. */
export function mixHex(a: string, b: string, t: number): string {
  const ca = channels(a);
  const cb = channels(b);
  return `#${ca.map((c, i) => Math.round(c + (cb[i] - c) * t).toString(16).padStart(2, "0")).join("")}`;
}
