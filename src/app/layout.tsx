import type { Metadata, Viewport } from "next";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { fontVariables } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Конструктор приглашений",
  description: "Пригласительные сайты на свадьбу и день рождения",
};

// interactive-widget: на Android клавиатура сжимает окно, а не закрывает шторку редактора (iOS игнорирует).
// viewport-fit=cover — иначе env(safe-area-inset-*) на iPhone всегда 0 и нижняя панель редактора ложится под полоску «домой».
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", interactiveWidget: "resizes-content" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: класс темы (`dark`) на <html> ставит скрипт next-themes до гидратации.
    <html lang="ru" className={fontVariables} suppressHydrationWarning>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
