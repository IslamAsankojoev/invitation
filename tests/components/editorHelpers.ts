import { screen } from "@testing-library/react";
import type { UserEvent } from "@testing-library/user-event";

/**
 * Раскрыть блок в списке и перейти на его подвкладку «Вид» (там вид блока, украшения и «Тонкая настройка»).
 * fine — ещё и раскрыть «Тонкую настройку» (фон, цвет, края, картинка, ширина, появление).
 */
export async function openBlockView(user: UserEvent, name: string, { fine = false } = {}) {
  await user.click(screen.getByRole("button", { name }));
  await user.click(screen.getByRole("tab", { name: "Вид" }));
  if (fine) await user.click(screen.getByRole("button", { name: "Тонкая настройка" }));
}
