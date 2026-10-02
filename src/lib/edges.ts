import type { CSSProperties } from "react";
import type { Block, Edge, Surface } from "./schema";

/**
 * Края фона блока (верх и низ): волна, арка, зигзаг, фестоны, рваная бумага.
 * Реализация — CSS mask на слое фона блока (Section): полоса края сверху/снизу + сплошная середина.
 * Геометрические формы — SVG-маски отсюда. Рваная бумага генерируется по зерну (lib/tornEdge.ts, отдаёт
 * /api/edges/torn): силуэт окрашенного слоя (layer=mask) и белая сердцевина бумаги с волокнами и тенью
 * (layer=paper) под ним. Зерно хранится в блоке (edgeTopSeed/edgeBottomSeed) и меняется при каждом выборе
 * рваного края в редакторе — обрыв всегда новый, а гость видит тот же, что выбрал организатор.
 */
export type EdgeSide = "top" | "bottom";
type EdgeShape = Exclude<Edge, "none">;

export const edgeLabels: Record<Edge, string> = {
  none: "Прямой",
  wave: "Волна",
  arch: "Арка",
  zigzag: "Зигзаг",
  scallop: "Фестоны",
  perforated: "Перфорация",
  torn: "Рваная бумага",
};

/** Фоны, у которых режутся края: панели во весь блок. У бумаги-картинки и предметов свой силуэт. */
export const EDGE_SURFACES: Surface[] = ["card", "vellum", "crumpled"];

/** Своя заливка во весь блок — цвет или фоновая картинка блока, фото обложки/блока «Фото» (вид «classic»). */
export const blockHasFill = (block: Block) =>
  !!block.bgImage ||
  (!!block.bgColor && block.surface === "plain") ||
  ((block.type === "hero" || block.type === "photo") && block.variant === "classic" && !!block.photo);

/** Видны ли края: нужен фон во весь блок — панель или фото (без фона край не на чем показать). */
export const edgesVisible = (surface: Surface, hasFill: boolean) =>
  EDGE_SURFACES.includes(surface) || (hasFill && surface === "plain");

/** Полоса рваного края: 1200×96 px картинки = 600×48 CSS px, бесшовная по горизонтали. */
const TORN_HEIGHT = 48;
/** Версия рисунка в URL: поднимай при правке lib/tornEdge.ts — картинки кэшируются навсегда. */
export const TORN_VERSION = 1;
const MAX_SEED = 2147483646;

export const tornUrl = (seed: number, side: EdgeSide, layer: "mask" | "paper") =>
  `/api/edges/torn?v=${TORN_VERSION}&seed=${seed}&side=${side}&layer=${layer}`;

const n2 = (v: number) => +v.toFixed(2);

/** Контур нижнего края: непрозрачно всё выше кривой y(x), x от 0 до w. */
function curve(w: number, y: (x: number) => number, steps: number) {
  const points: string[] = [];
  for (let i = steps; i >= 0; i--) {
    const x = (w * i) / steps;
    points.push(`${n2(x)} ${n2(y(x))}`);
  }
  return `M0 0H${w}V${n2(y(w))}L${points.join("L")}Z`;
}

/** SVG-маска: путь нарисован для нижнего края, верхний — он же, отражённый по вертикали. */
function svgMask(w: number, h: number, d: string, side: EdgeSide) {
  const flip = side === "top" ? ` transform='matrix(1 0 0 -1 0 ${h})'` : "";
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 ${w} ${h}' preserveAspectRatio='none'><path${flip} d='${d}'/></svg>`;
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`;
}

type ShapeDef = {
  /** Высота полосы края, px: в ней фон вырезан по форме. */
  height: number;
  /** Дополнительный отступ содержимого от края, чтобы текст не лёг на вырез. */
  pad: number;
  /** Ширина плитки полосы: px, доля блока или auto (по пропорциям картинки); mask-repeat полосы. */
  width: number | string;
  repeat: string;
  image: (side: EdgeSide, seed: number) => string;
};

const shapes: Record<EdgeShape, ShapeDef> = {
  // Две волны на ширину блока.
  wave: {
    height: 20,
    pad: 8,
    width: "50%",
    repeat: "repeat-x",
    image: (side) => svgMask(100, 20, curve(100, (x) => 10 + 9 * Math.cos((2 * Math.PI * x) / 100), 60), side),
  },
  // Одна пологая арка на всю ширину: середина выступает, края уходят внутрь.
  arch: {
    height: 34,
    pad: 16,
    width: "100%",
    repeat: "no-repeat",
    image: (side) => svgMask(100, 34, curve(100, (x) => 1 + 32 * (1 - ((x - 50) / 50) ** 2), 60), side),
  },
  // Зубцы как от ножниц «зигзаг»; round — целое число зубцов на любую ширину.
  zigzag: { height: 9, pad: 4, width: 16, repeat: "round no-repeat", image: (side) => svgMask(16, 9, "M0 0H16V1L8 8.6L0 1Z", side) },
  // Полукруглые фестоны, как у салфетки.
  scallop: {
    height: 12,
    pad: 5,
    width: 26,
    repeat: "round no-repeat",
    image: (side) => svgMask(26, 12, "M0 0H26V1A13 10.8 0 0 1 0 1Z", side),
  },
  // Перфорация билета: полукруглые выемки по краю.
  perforated: {
    height: 6,
    pad: 4,
    width: 15,
    repeat: "round no-repeat",
    image: (side) => svgMask(15, 6, "M0 0H15V6H12A4.5 4.5 0 0 0 3 6H0Z", side),
  },
  torn: {
    height: TORN_HEIGHT,
    pad: 20,
    width: "auto",
    repeat: "repeat-x",
    image: (side, seed) => `url("${tornUrl(seed, side, "mask")}")`,
  },
};

/** Стабильное число из строки (FNV-1a): одинаково на сервере и в браузере. */
function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** Новое случайное зерно рваного края — при каждом выборе в редакторе. */
export const newEdgeSeed = () => Math.floor(Math.random() * MAX_SEED);
/** Зерно по умолчанию (приглашения до появления зёрен, образцы): стабильное число от ключа и стороны. */
export const defaultEdgeSeed = (key: string, side: EdgeSide) => hash(`${key}:${side}`) % MAX_SEED;

/** Формы краёв блока и зёрна рисунка рваного края для каждой стороны. */
export type BlockEdges = { top: Edge; bottom: Edge; topSeed: number; bottomSeed: number };

/** Ключ зерна по умолчанию: у блоков старых приглашений («b-<тип>») — тип, как до появления id, чтобы обрыв не сменился. */
const seedKey = (block: Pick<Block, "id" | "type">) => (!block.id || block.id === `b-${block.type}` ? block.type : block.id);

export function blockEdges(block: Pick<Block, "id" | "type" | "edgeTop" | "edgeBottom" | "edgeTopSeed" | "edgeBottomSeed">): BlockEdges {
  return {
    top: block.edgeTop,
    bottom: block.edgeBottom,
    topSeed: block.edgeTopSeed ?? defaultEdgeSeed(seedKey(block), "top"),
    bottomSeed: block.edgeBottomSeed ?? defaultEdgeSeed(seedKey(block), "bottom"),
  };
}

export const edgeHeight = (edge: Edge) => (edge === "none" ? 0 : shapes[edge].height);
export const edgePad = (edge: Edge) => (edge === "none" ? 0 : shapes[edge].pad);

const tileSize = (s: ShapeDef, k: number) => `${typeof s.width === "number" ? `${s.width * k}px` : s.width} ${s.height * k}px`;

/**
 * Маска слоя фона с краями. Середина сплошная и заходит на полосы краёв на 1 px — без щелей на дробных пикселях.
 * k — масштаб формы (образцы в редакторе — мельче).
 */
export function edgeMaskStyle({ top, bottom, topSeed, bottomSeed }: BlockEdges, k = 1): CSSProperties {
  const t = top === "none" ? undefined : shapes[top];
  const b = bottom === "none" ? undefined : shapes[bottom];
  const layers: [image: string, position: string, size: string, repeat: string][] = [];
  if (t) layers.push([t.image("top", topSeed), "0 0", tileSize(t, k), t.repeat]);
  const th = t ? t.height * k - 1 : 0;
  const bh = b ? b.height * k - 1 : 0;
  layers.push(["linear-gradient(#000, #000)", `0 ${th}px`, `100% calc(100% - ${th + bh}px)`, "no-repeat"]);
  if (b) layers.push([b.image("bottom", bottomSeed), "0 100%", tileSize(b, k), b.repeat]);
  const col = (i: number) => layers.map((l) => l[i]).join(", ");
  return {
    WebkitMaskImage: col(0),
    maskImage: col(0),
    WebkitMaskPosition: col(1),
    maskPosition: col(1),
    WebkitMaskSize: col(2),
    maskSize: col(2),
    WebkitMaskRepeat: col(3),
    maskRepeat: col(3),
  };
}

/** Белая сердцевина бумаги на рваном крае (волокна, ворс, тень) — слой под окрашенным фоном, совпадает с маской. */
export function tornPaperStyle(side: EdgeSide, seed: number, k = 1): CSSProperties {
  return {
    position: "absolute",
    left: 0,
    right: 0,
    [side]: 0,
    height: TORN_HEIGHT * k,
    backgroundImage: `url("${tornUrl(seed, side, "paper")}")`,
    backgroundSize: `auto ${TORN_HEIGHT * k}px`,
    backgroundRepeat: "repeat-x",
  };
}
