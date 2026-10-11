"use client";

import { ThemeProvider as NextThemes } from "next-themes";
import type { ReactNode } from "react";

/**
 * Тема сайта (не приглашения): светлая / тёмная / как в системе. Класс `dark` на <html>, выбор — в localStorage
 * (`theme`); скрипт next-themes ставит класс до отрисовки — без белой вспышки. Приглашения со своими палитрами
 * от темы сайта не зависят.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemes attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
    </NextThemes>
  );
}
