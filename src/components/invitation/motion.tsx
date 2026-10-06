"use client";

import { createContext, useContext, useEffect, useRef, type RefObject } from "react";
import { DEFAULT_ORNAMENT_MOTION, type OrnamentMotion } from "@/lib/schema";

/**
 * Режим анимаций приглашения:
 * on — появление при прокрутке и постоянные анимации работают;
 * paused — гость ещё не открыл конверт: всё стоит на паузе и ждёт нажатия;
 * off — статичная картинка (мини-превью шаблонов).
 */
export type Motion = "on" | "paused" | "off";

export const MotionContext = createContext<Motion>("off");
export const useMotion = () => useContext(MotionContext);

/** Анимация украшений из темы — для тех, у кого нет своей. */
export const OrnamentMotionContext = createContext<OrnamentMotion>(DEFAULT_ORNAMENT_MOTION);
export const useOrnamentMotion = () => useContext(OrnamentMotionContext);

export const prefersReducedMotion = () =>
  typeof window !== "undefined" && !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

const PENDING = "[data-reveal]:not([data-revealed]), [data-decor]:not([data-revealed])";

/**
 * Показывает элемент: ставит data-revealed и задержку --d. Сами анимации — в globals.css.
 * Задержка: data-delay (секунды) или шаг 0.12 с по номеру data-reveal — соседи появляются по очереди.
 */
function show(el: HTMLElement) {
  if (el.dataset.revealed) return;
  const delay =
    el.dataset.delay != null
      ? parseFloat(el.dataset.delay) || 0
      : ((parseInt(el.dataset.reveal ?? "", 10) || 1) - 1) * 0.12;
  el.style.setProperty("--d", `${delay}s`);
  el.dataset.revealed = "1";
}

/**
 * Заново смонтированный элемент (украшение после правки в редакторе) показываем через кадр: сначала браузер рисует
 * скрытое состояние, потом data-revealed запускает появление. Без анимаций — показываем сразу.
 */
export function replayReveal(el: HTMLElement, motion: Motion) {
  if (motion === "paused") return;
  if (motion === "off" || prefersReducedMotion() || typeof requestAnimationFrame === "undefined") return show(el);
  let frame = requestAnimationFrame(() => (frame = requestAnimationFrame(() => show(el))));
  return () => cancelAnimationFrame(frame);
}

/** Появление при прокрутке для всех [data-reveal] и [data-decor] внутри ref. instant — показать сразу (блок «без анимации»). */
export function useReveal(ref: RefObject<HTMLElement | null>, instant = false) {
  const motion = useMotion();
  const io = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root || instant || motion !== "on" || prefersReducedMotion() || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (!e.isIntersecting) continue;
          show(e.target as HTMLElement);
          observer.unobserve(e.target);
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" },
    );
    io.current = observer;
    // Подстраховка: при быстрой прокрутке или прыжке к якорю наблюдатель может пропустить элемент —
    // показываем всё, что уже на экране или осталось выше него.
    // capture — чтобы ловить прокрутку и окна, и рамки превью в редакторе.
    const sweep = () => {
      const h = window.innerHeight;
      root.querySelectorAll<HTMLElement>(PENDING).forEach((el) => {
        if (el.getBoundingClientRect().top < h * 0.95) show(el);
      });
    };
    document.addEventListener("scroll", sweep, { capture: true, passive: true });
    const timers = [setTimeout(sweep, 400), setTimeout(sweep, 1800)];
    return () => {
      observer.disconnect();
      io.current = null;
      document.removeEventListener("scroll", sweep, { capture: true });
      timers.forEach(clearTimeout);
    };
  }, [ref, motion, instant]);

  // После каждого рендера: новые элементы (добавленный пункт программы и т. п.) тоже наблюдаем,
  // а без наблюдателя (статичный режим, «уменьшить движение», тесты) — показываем сразу.
  useEffect(() => {
    const root = ref.current;
    if (!root || motion === "paused") return;
    root.querySelectorAll<HTMLElement>(PENDING).forEach((el) => (io.current ? io.current.observe(el) : show(el)));
  });
}
