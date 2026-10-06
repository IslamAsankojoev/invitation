import type { CSSProperties } from "react";
import type { Ornament, OrnamentIdle, OrnamentMotion, OrnamentPosition } from "./schema";

/** Точка привязки и сдвиг: украшение слегка выходит за край блока и обрезается им — как живой букет. */
const anchors: Record<OrnamentPosition, { css: CSSProperties; shift: string }> = {
  "top-left": { css: { top: 0, left: 0 }, shift: "translate(-22%, -18%)" },
  top: { css: { top: 0, left: "50%" }, shift: "translate(-50%, -30%)" },
  "top-right": { css: { top: 0, right: 0 }, shift: "translate(22%, -18%)" },
  left: { css: { top: "50%", left: 0 }, shift: "translate(-35%, -50%)" },
  right: { css: { top: "50%", right: 0 }, shift: "translate(35%, -50%)" },
  "bottom-left": { css: { bottom: 0, left: 0 }, shift: "translate(-22%, 18%)" },
  bottom: { css: { bottom: 0, left: "50%" }, shift: "translate(-50%, 30%)" },
  "bottom-right": { css: { bottom: 0, right: 0 }, shift: "translate(22%, 18%)" },
  // По центру блока, за текстом — для венков и рамок.
  center: { css: { top: "50%", left: "50%" }, shift: "translate(-50%, -50%)" },
};

/** Откуда «распускается» украшение — из того угла или края, к которому оно прижато. */
const origins: Record<OrnamentPosition, string> = {
  "top-left": "0 0",
  top: "50% 0",
  "top-right": "100% 0",
  left: "0 50%",
  right: "100% 50%",
  "bottom-left": "0 100%",
  bottom: "50% 100%",
  "bottom-right": "100% 100%",
  center: "50% 50%",
};

/**
 * Обёртка украшения: место в блоке и ширина. Появление анимирует её, а постоянное движение — картинку внутри
 * (ornamentImageStyle): так вращение и покачивание идут вокруг центра картинки, а не точки привязки.
 */
export function ornamentStyle(o: Pick<Ornament, "position" | "size">): CSSProperties {
  const { css, shift } = anchors[o.position];
  return {
    ...css,
    position: "absolute",
    display: "block",
    width: o.size,
    maxWidth: "70%",
    transform: shift,
    transformOrigin: origins[o.position],
    pointerEvents: "none",
  };
}

/** Картинка украшения: поворот, отражение и прозрачность. */
export function ornamentImageStyle(o: Pick<Ornament, "rotate" | "flip" | "opacity">): CSSProperties {
  return {
    display: "block",
    width: "100%",
    opacity: o.opacity,
    transform: `rotate(${o.rotate}deg)${o.flip ? " scaleX(-1)" : ""}`,
  };
}

/** С какой стороны украшение выезжает при появлении — с того края, к которому оно прижато. */
export const ornamentFrom = (p: OrnamentPosition) =>
  p.includes("left") ? "left" : p.includes("right") ? "right" : p === "top" ? "top" : "bottom";

/** Анимация украшения: своя или общая из темы. */
export const ornamentMotionOf = (o: Pick<Ornament, "motion">, common: OrnamentMotion): OrnamentMotion => o.motion ?? common;

/** «Авто» → бантик качается на ниточке, остальное (ветки, цветы) покачивается на ветру. */
export const resolveIdle = (idle: OrnamentIdle, src: string): Exclude<OrnamentIdle, "auto"> =>
  idle !== "auto" ? idle : src.includes("bow") ? "swing" : "sway";

/** У вращения нет размаха — ползунок «Размах» для него не нужен. */
export const idleHasAmplitude = (idle: OrnamentIdle) => idle !== "spin" && idle !== "none";

/**
 * Атрибуты и CSS-переменные анимации украшения (сами анимации — в globals.css, раздел «Украшения»).
 * Скорость в данных — «во сколько раз быстрее», а в CSS длительность умножается на --oe-k/--oi-k.
 * Соседние украшения с общей анимацией качаются вразнобой: у чётных движение медленнее и в обратную сторону.
 */
export function ornamentMotionProps(o: Ornament, common: OrnamentMotion, index: number) {
  const m = ornamentMotionOf(o, common);
  const alt = index % 2 === 1;
  const { src, position, size, rotate, flip, opacity } = o;
  return {
    // Ключ — все настройки украшения и его анимации: поменяли любую — украшение монтируется заново и проигрывает
    // появление и движение с начала (видно в превью редактора). У гостя данные не меняются — ключ постоянный.
    key: `${index}-${JSON.stringify({ src, position, size, rotate, flip, opacity, m })}`,
    wrapper: {
      "data-decor": ornamentFrom(o.position),
      "data-enter": m.enter,
      "data-decor-own": o.motion ? "" : undefined,
      style: { "--oe-k": round(1 / m.enterSpeed) } as CSSProperties,
    },
    image: {
      "data-idle": resolveIdle(m.idle, o.src),
      "data-alt": alt ? "" : undefined,
      style: { "--oi-k": round((alt ? 1.3 : 1) / m.idleSpeed), "--oi-a": m.idleAmplitude } as CSSProperties,
    },
  };
}

const round = (n: number) => Math.round(n * 1000) / 1000;

/** Границы размера украшения (как в схеме) и шаг кнопок «Меньше / Больше» в редакторе. */
export const ORNAMENT_SIZE_MIN = 40;
export const ORNAMENT_SIZE_MAX = 400;

/**
 * Размер после «Меньше» (×0.8) или «Больше» (×1.25): шаг заметный на любом размере, кратен 10, в границах схемы.
 * Чтобы кнопка всегда что-то меняла, шаг — не меньше 10 px.
 */
export function stepOrnamentSize(size: number, dir: "smaller" | "bigger"): number {
  const raw = Math.round((dir === "bigger" ? size * 1.25 : size * 0.8) / 10) * 10;
  const next = dir === "bigger" ? Math.max(raw, size + 10) : Math.min(raw, size - 10);
  return Math.min(ORNAMENT_SIZE_MAX, Math.max(ORNAMENT_SIZE_MIN, next));
}

/** Сетка 3×3 для выбора места украшения в редакторе: по строкам сверху вниз. */
export const POSITION_GRID: OrnamentPosition[] = [
  "top-left", "top", "top-right",
  "left", "center", "right",
  "bottom-left", "bottom", "bottom-right",
];

export const positionLabels: Record<OrnamentPosition, string> = {
  "top-left": "Сверху слева",
  top: "Сверху по центру",
  "top-right": "Сверху справа",
  left: "Слева",
  right: "Справа",
  "bottom-left": "Снизу слева",
  bottom: "Снизу по центру",
  "bottom-right": "Снизу справа",
  center: "По центру, за текстом",
};
