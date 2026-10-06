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

/**
 * Вкладка «Оформление» → раскрыть раздел (в заголовке раздела после названия — выбранное значение, поэтому ищем по
 * началу). fine — ещё и его «Тонкую настройку».
 */
export async function openThemeSection(user: UserEvent, title: string, { fine = false } = {}) {
  const tab = screen.getByRole("tab", { name: "Оформление" });
  if (tab.getAttribute("aria-selected") !== "true") await user.click(tab);
  const trigger = screen.getByRole("button", { name: new RegExp(`^${title}`) });
  if (trigger.getAttribute("aria-expanded") !== "true") await user.click(trigger);
  if (fine) await user.click(screen.getByRole("button", { name: "Тонкая настройка" }));
}
