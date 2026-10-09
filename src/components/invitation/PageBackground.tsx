"use client";

import { useEffect, useRef } from "react";
import type { Theme } from "@/lib/schema";
import { prefersReducedMotion, useMotion } from "./motion";

/** На сколько параллакс-картинка выше экрана: этот запас она и проезжает за всю страницу. */
export const PARALLAX_EXTRA = 0.35;

/** Ближайший прокручиваемый предок (превью редактора) или null — прокручивается окно (гость). */
function scrollParent(el: HTMLElement | null): HTMLElement | null {
  for (let node = el?.parentElement; node; node = node.parentElement) {
    const { overflowY } = getComputedStyle(node);
    if ((overflowY === "auto" || overflowY === "scroll") && node.scrollHeight > node.clientHeight) return node;
  }
  return null;
}

/**
 * Фоновое фото страницы. stretch — растянуто на всю высоту приглашения и едет вместе с ним;
 * fixed и parallax — «окно» высотой в экран, прилипшее к верху (sticky): содержимое едет поверх, а у параллакса
 * картинка ещё медленно смещается по мере прокрутки. sticky, а не position: fixed — чтобы фон оставался в рамке
 * телефона в превью редактора. Высота окна — 100cqh: в превью скролл-контейнер задаёт container-type: size, у гостя
 * контейнера нет и cqh = высоте экрана.
 */
export function PageBackground({ theme }: { theme: Pick<Theme, "background" | "backgroundMode" | "backgroundDim"> }) {
  const { background, backgroundMode, backgroundDim } = theme;
  const imageRef = useRef<HTMLDivElement>(null);
  const motion = useMotion();
  const moving = backgroundMode === "parallax" && motion !== "off";

  useEffect(() => {
    const image = imageRef.current;
    if (!image || !moving || prefersReducedMotion()) return;
    const box = scrollParent(image);
    const target: HTMLElement | Window = box ?? window;
    let frame = 0;
    const update = () => {
      frame = 0;
      const top = box ? box.scrollTop : window.scrollY;
      const max = box ? box.scrollHeight - box.clientHeight : document.documentElement.scrollHeight - window.innerHeight;
      const progress = max > 0 ? Math.min(1, Math.max(0, top / max)) : 0;
      image.style.translate = `0 ${(-progress * PARALLAX_EXTRA * 100).toFixed(2)}cqh`;
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    target.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    update();
    return () => {
      target.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [moving, background]);

  if (!background) return null;
  // Приглушение — цветом фона палитры, к низу чуть плотнее: текст блоков без своей подложки остаётся читаемым.
  const dim = `linear-gradient(color-mix(in srgb, var(--bg) ${Math.round(backgroundDim * 100)}%, transparent), color-mix(in srgb, var(--bg) ${Math.round(Math.min(1, backgroundDim + 0.15) * 100)}%, transparent))`;
  const photo = { backgroundImage: `url("${background}")` };

  if (backgroundMode === "stretch") {
    return (
      <div aria-hidden="true" data-testid="page-background" data-mode="stretch" className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-cover bg-top" style={photo} />
        <div className="absolute inset-0" style={{ backgroundImage: dim }} />
      </div>
    );
  }
  return (
    <div aria-hidden="true" data-testid="page-background" data-mode={backgroundMode} className="pointer-events-none absolute inset-0">
      <div className="sticky top-0 h-[100cqh] overflow-hidden">
        <div
          ref={imageRef}
          className="absolute inset-x-0 top-0 bg-cover bg-center will-change-[translate]"
          style={{ ...photo, height: backgroundMode === "parallax" ? `${(1 + PARALLAX_EXTRA) * 100}%` : "100%" }}
        />
        <div className="absolute inset-0" style={{ backgroundImage: dim }} />
      </div>
    </div>
  );
}
