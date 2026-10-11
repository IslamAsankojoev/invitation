"use client";

import { useTheme } from "next-themes";
import { useEffect, useState, type SVGProps } from "react";
import { flushSync } from "react-dom";
import { cn } from "@/lib/utils";

/** Иконки как у переключателя темы на max-green-api-client.onrender.com: контур 2 px со скруглёнными концами. */
function ThemeIcon(props: SVGProps<SVGSVGElement>) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props} />;
}

const SunIcon = (props: SVGProps<SVGSVGElement>) => (
  <ThemeIcon {...props}>
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2.5v2M12 19.5v2M4.6 4.6L6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4L6 18M18 6l1.4-1.4" />
  </ThemeIcon>
);

const MoonIcon = (props: SVGProps<SVGSVGElement>) => (
  <ThemeIcon {...props}>
    <path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z" />
  </ThemeIcon>
);

/**
 * Смена темы «волной»: новая тема расходится кругом от кнопки до самого дальнего угла экрана (View Transitions —
 * снимок старой страницы под живой новой, у новой — радиальная маска с мягким краем; CSS — «Волна темы» в
 * globals.css). Без View Transitions (старые браузеры) и при «Уменьшить движение» — тема меняется сразу.
 */
export function switchThemeWithWave(button: HTMLElement, apply: () => void) {
  if (!("startViewTransition" in document) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    apply();
    return;
  }
  const { left, top, width, height } = button.getBoundingClientRect();
  const x = left + width / 2;
  const y = top + height / 2;
  const radius = Math.hypot(Math.max(x, window.innerWidth - x), Math.max(y, window.innerHeight - y));
  const root = document.documentElement;
  root.style.setProperty("--theme-wave-x", `${x}px`);
  root.style.setProperty("--theme-wave-y", `${y}px`);
  root.style.setProperty("--theme-wave-radius", `${radius}px`);
  root.classList.add("theme-wave");
  const cleanup = () => {
    root.style.removeProperty("--theme-wave-x");
    root.style.removeProperty("--theme-wave-y");
    root.style.removeProperty("--theme-wave-radius");
    root.classList.remove("theme-wave", "theme-wave-swap");
  };
  const transition = document.startViewTransition(() => {
    // Пока снимается новая страница — без CSS-переходов цвета, иначе кнопки «доезжали» бы до новых цветов внутри волны.
    root.classList.add("theme-wave-swap");
    flushSync(apply);
  });
  transition.ready.then(() => root.classList.remove("theme-wave-swap"), cleanup);
  transition.finished.then(cleanup, cleanup);
}

/** Класс темы на <html> сразу, внутри перехода (next-themes ставит его в эффекте — не ждём, когда тот выполнится). */
function applyThemeClass(theme: "light" | "dark") {
  const root = document.documentElement;
  root.classList.remove("light", "dark");
  root.classList.add(theme);
  root.style.colorScheme = theme;
}

/** Кнопка темы сайта: нажатие переключает светлую и тёмную тему волной от кнопки. До первого нажатия — как в системе. */
export function ThemeToggle({ className }: { className?: string }) {
  const { resolvedTheme, setTheme } = useTheme();
  // Тема известна только в браузере: до гидратации подпись нейтральная (иначе расхождение с сервером).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const dark = resolvedTheme === "dark";
  const label = !mounted ? "Тема сайта" : dark ? "Светлая тема" : "Тёмная тема";

  return (
    <button
      type="button"
      aria-label={label}
      title={mounted ? label : undefined}
      onClick={(e) => {
        const next = dark ? "light" : "dark";
        switchThemeWithWave(e.currentTarget, () => {
          applyThemeClass(next);
          setTheme(next);
        });
      }}
      className={cn(
        "inline-flex size-10 shrink-0 cursor-pointer items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring motion-reduce:transition-none",
        className,
      )}
    >
      {/* Значок — по классу dark на <html> (его ставит скрипт next-themes до отрисовки): верный с первого кадра. */}
      <SunIcon className="hidden size-5 dark:block" />
      <MoonIcon className="block size-5 dark:hidden" />
    </button>
  );
}
