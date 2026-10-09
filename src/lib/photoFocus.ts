import type { CSSProperties } from "react";
import type { PhotoFocus } from "./schema";

/** «30% 20%» для object-position / background-position; нет точки — центр (как раньше). */
export const focusPosition = (focus: PhotoFocus | undefined) => (focus ? `${focus.x}% ${focus.y}%` : undefined);

/** Стиль фото блока, обрезанного под рамку (object-cover): главное место остаётся в кадре. */
export const photoStyle = (block: { photoFocus?: PhotoFocus }): CSSProperties =>
  block.photoFocus ? { objectPosition: focusPosition(block.photoFocus) } : {};

/** Точка по нажатию на картинку: доли её размера → проценты, округление до целого, в пределах 0–100. */
export function focusFromPoint(rect: { left: number; top: number; width: number; height: number }, x: number, y: number): PhotoFocus {
  const pct = (v: number, size: number) => Math.min(100, Math.max(0, Math.round((v / (size || 1)) * 100)));
  return { x: pct(x - rect.left, rect.width), y: pct(y - rect.top, rect.height) };
}
