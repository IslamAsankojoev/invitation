import type { DecorType } from "./schema";

export const decorLabels: Record<DecorType, string> = {
  none: "Без декора",
  image: "Картинка (лепестки, листья…)",
  petals: "Лепестки",
  sakura: "Сакура",
  confetti: "Конфетти",
  snow: "Снег",
};

export type Particle = {
  x: number;
  y: number;
  size: number;
  /** Скорость падения, px/с */
  speed: number;
  rotation: number;
  spin: number;
  phase: number;
  alpha: number;
};

export type DecorDrawer = {
  /** Множитель скорости падения. */
  fall: number;
  /** Амплитуда покачивания по горизонтали, px. */
  sway: number;
  sizeRange: [number, number];
  /** Частица переворачивается в воздухе (сжатие по X имитирует поворот в 3D). */
  flip?: boolean;
  /** `image` — загруженная картинка частицы (только для type = "image"). */
  draw(ctx: CanvasRenderingContext2D, p: Particle, image?: HTMLImageElement): void;
};

/** Реестр видов декора: чтобы добавить новый — добавьте тип в схему и функцию отрисовки сюда. */
export const decorDrawers: Record<Exclude<DecorType, "none">, DecorDrawer> = {
  image: {
    fall: 0.9,
    sway: 45,
    sizeRange: [6, 10],
    flip: true,
    draw(ctx, p, image) {
      if (!image?.complete || !image.naturalWidth) return;
      const w = p.size * 2;
      const h = (w * image.naturalHeight) / image.naturalWidth;
      ctx.drawImage(image, -w / 2, -h / 2, w, h);
    },
  },
  petals: {
    fall: 1,
    sway: 30,
    sizeRange: [6, 12],
    flip: true,
    draw(ctx, p) {
      ctx.beginPath();
      ctx.ellipse(0, 0, p.size, p.size * 0.55, 0, 0, Math.PI * 2);
      ctx.fill();
    },
  },
  sakura: {
    fall: 0.8,
    sway: 40,
    sizeRange: [4, 7],
    flip: true,
    draw(ctx, p) {
      for (let i = 0; i < 5; i++) {
        ctx.rotate((Math.PI * 2) / 5);
        ctx.beginPath();
        ctx.ellipse(0, -p.size, p.size * 0.55, p.size, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    },
  },
  confetti: {
    fall: 1.4,
    sway: 15,
    sizeRange: [5, 9],
    flip: true,
    draw(ctx, p) {
      ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
    },
  },
  snow: {
    fall: 0.6,
    sway: 20,
    sizeRange: [1.5, 4],
    draw(ctx, p) {
      ctx.beginPath();
      ctx.arc(0, 0, p.size, 0, Math.PI * 2);
      ctx.fill();
    },
  },
};

export function createParticles(
  count: number,
  width: number,
  height: number,
  drawer: DecorDrawer,
  /** Множитель размера из theme.decor.size. */
  scale = 1,
  rand: () => number = Math.random,
): Particle[] {
  const [min, max] = drawer.sizeRange.map((v) => v * scale);
  return Array.from({ length: count }, () => ({
    x: rand() * width,
    y: rand() * height,
    size: min + rand() * (max - min),
    speed: (25 + rand() * 35) * drawer.fall,
    rotation: rand() * Math.PI * 2,
    spin: (rand() - 0.5) * 2,
    phase: rand() * Math.PI * 2,
    alpha: 0.5 + rand() * 0.5,
  }));
}

/**
 * Подгоняет уже летящие частицы под новый размер области, сохраняя их относительное положение.
 * Пересоздавать частицы при resize нельзя: на телефоне при прокрутке прячется адресная строка и размер
 * меняется каждый кадр — частицы прыгали бы в случайные места.
 */
export function fitParticles(particles: Particle[], from: { width: number; height: number }, to: { width: number; height: number }): Particle[] {
  const kx = from.width > 0 ? to.width / from.width : 1;
  const ky = from.height > 0 ? to.height / from.height : 1;
  return particles.map((p) => ({ ...p, x: p.x * kx, y: p.y * ky }));
}

/** Продвигает частицу на dt секунд; ушедшие вниз возвращаются наверх. `speed` — множитель из theme.decor.speed. */
export function stepParticle(p: Particle, dt: number, width: number, height: number, speed = 1): void {
  p.y += p.speed * speed * dt;
  p.rotation += p.spin * speed * dt;
  p.phase += dt * Math.sqrt(speed);
  if (p.y - p.size > height) {
    p.y = -p.size * 2;
    p.x = Math.random() * width;
  }
}

/**
 * Прозрачность частицы у краёв: плавно проявляется в верхних 10% и гаснет в нижних 15%,
 * чтобы не «выскакивать» из-за края экрана.
 */
export function edgeFade(y: number, height: number): number {
  if (height <= 0) return 1;
  const top = Math.min(1, Math.max(0, y / (height * 0.1)));
  const bottom = Math.min(1, Math.max(0, (height - y) / (height * 0.15)));
  return Math.min(top, bottom);
}

export function drawParticles(
  ctx: CanvasRenderingContext2D,
  particles: Particle[],
  drawer: DecorDrawer,
  color: string,
  image?: HTMLImageElement,
  /** Высота области: если задана, частицы проявляются сверху и гаснут внизу. */
  height = 0,
): void {
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.fillStyle = color;
  for (const p of particles) {
    const alpha = p.alpha * (height ? edgeFade(p.y, height) : 1);
    if (alpha <= 0) continue;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(p.x + Math.sin(p.phase) * drawer.sway * 0.3, p.y);
    ctx.rotate(p.rotation);
    if (drawer.flip) ctx.scale(0.35 + Math.abs(Math.cos(p.phase * 1.3)) * 0.65, 1);
    drawer.draw(ctx, p, image);
    ctx.restore();
  }
}
