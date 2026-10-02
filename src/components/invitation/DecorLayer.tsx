"use client";

import { useEffect, useRef } from "react";
import {
  burstSparks,
  createParticles,
  decorDrawers,
  drawParticles,
  drawSparks,
  fitParticles,
  hitParticle,
  particleCenter,
  respawnParticle,
  stepParticle,
  stepSparks,
  type Spark,
} from "@/lib/decor";
import type { Theme } from "@/lib/schema";

type Props = {
  decor: Theme["decor"];
  /** В превью редактора слой ограничен рамкой телефона, а не всем окном. */
  contained?: boolean;
};

/**
 * Декоративные частицы на canvas. Не перехватывает клики; при prefers-reduced-motion частицы неподвижны.
 * Мини-игра (decor.pop, по умолчанию включена): касание частицы — она лопается конфетти и снова падает сверху.
 * Касания ловим на window, а не на холсте: так кнопки и прокрутка под декором работают как обычно.
 */
export function DecorLayer({ decor, contained = false }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { type, color, density, size, speed, image: imageSrc } = decor;
  const pop = decor.pop !== false;
  const hidden = type === "none" || density === 0 || (type === "image" && !imageSrc);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx || hidden) return;

    const drawer = decorDrawers[type as Exclude<typeof type, "none">];
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let image: HTMLImageElement | undefined;
    let width = 0;
    let height = 0;
    let particles = createParticles(0, 0, 0, drawer);
    // В статичном режиме (уменьшение движения) частицы не гаснут у краёв — иначе часть просто не видна.
    const redraw = () => drawParticles(ctx, particles, drawer, color, image, reduceMotion ? 0 : height);

    if (type === "image" && imageSrc) {
      image = new Image();
      image.onload = redraw;
      image.src = imageSrc;
    }

    function resize() {
      const dpr = window.devicePixelRatio || 1;
      const next = { width: canvas!.clientWidth, height: canvas!.clientHeight };
      if (next.width === width && next.height === height && canvas!.width === Math.round(width * dpr)) return;
      canvas!.width = Math.round(next.width * dpr);
      canvas!.height = Math.round(next.height * dpr);
      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      // Частицы создаются один раз, дальше только подгоняются под размер (см. fitParticles).
      particles =
        particles.length && width && height
          ? fitParticles(particles, { width, height }, next)
          : createParticles(density, next.width, next.height, drawer, size);
      ({ width, height } = next);
      redraw();
    }

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    if (reduceMotion) return () => observer.disconnect();

    let sparks: Spark[] = [];
    function onPointerDown(e: PointerEvent) {
      const box = canvas!.getBoundingClientRect();
      const x = e.clientX - box.left;
      const y = e.clientY - box.top;
      if (x < 0 || y < 0 || x > box.width || y > box.height) return;
      const i = hitParticle(particles, drawer, x, y);
      if (i < 0) return;
      const c = particleCenter(particles[i], drawer);
      sparks.push(...burstSparks(c.x, c.y, color));
      respawnParticle(particles[i], width);
      navigator.vibrate?.(8);
    }
    if (pop) window.addEventListener("pointerdown", onPointerDown, { passive: true });

    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      for (const p of particles) stepParticle(p, dt, width, height, speed);
      redraw();
      if (sparks.length) {
        sparks = stepSparks(sparks, dt);
        drawSparks(ctx, sparks);
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("pointerdown", onPointerDown);
    };
  }, [type, color, density, size, speed, imageSrc, hidden, pop]);

  if (hidden) return null;
  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      data-testid="decor-layer"
      data-decor={type}
      data-pop={pop || undefined}
      // На странице гостя высота — «большой» вьюпорт (lvh): она не меняется, когда при прокрутке
      // прячется адресная строка телефона, и холст не растягивается и не пересчитывается на каждом кадре.
      className={`pointer-events-none z-10 w-full ${contained ? "absolute inset-0 h-full" : "fixed inset-x-0 top-0 h-lvh"}`}
    />
  );
}
