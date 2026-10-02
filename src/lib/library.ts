import type { CSSProperties } from "react";
import type { Block, Surface, Texture } from "./schema";

/**
 * Встроенная библиотека картинок (public/library). Чтобы добавить картинку — положите
 * прозрачный PNG/WebP в public/library и допишите строку сюда: она появится в выборе украшений/декора.
 */
export type LibraryCategory = "flowers" | "botanical" | "leaves" | "wreaths" | "frames" | "dividers" | "watercolor" | "accents" | "particles";

export type LibraryAsset = {
  id: string;
  src: string;
  label: string;
  category: LibraryCategory;
  /** Доступно на платном тарифе (см. lib/premium.ts). */
  premium?: boolean;
};

const asset = (id: string, label: string, category: LibraryCategory, premium = false): LibraryAsset => ({
  id,
  src: `/library/${id}.webp`,
  label,
  category,
  ...(premium ? { premium } : {}),
});
/** Векторные ассеты из scripts/library-svg.mjs. */
const vector = (id: string, label: string, category: LibraryCategory, premium = false): LibraryAsset => ({
  ...asset(id, label, category, premium),
  src: `/library/${id}.svg`,
});

export const library: LibraryAsset[] = [
  asset("dried-botanical", "Сухоцветы", "flowers"),
  asset("gardenia", "Гардении", "flowers"),
  asset("white-roses", "Белые розы", "flowers"),
  asset("rose-lilac", "Роза с сиренью", "flowers"),
  asset("peach-rose", "Персиковая роза", "flowers"),
  asset("pink-roses", "Розовые розы", "flowers"),
  asset("red-roses", "Красные розы", "flowers"),
  asset("nasturtium", "Настурция", "flowers"),
  // Из new-sources (pngwing.com): лицензии уточняются, см. CREDITS.md.
  asset("hibiscus", "Гибискус", "flowers"),
  asset("sakura-branch", "Ветка сакуры", "flowers"),
  // Старинные ботанические гравюры и акварели (public domain / CC0, источники — public/library/CREDITS.md).
  asset("bot-rose-gallica", "Роза галльская", "botanical"),
  asset("bot-rose-bengal", "Бенгальская роза", "botanical"),
  asset("bot-rose-pompon", "Роза-помпон", "botanical"),
  asset("bot-rose-provence", "Прованская роза", "botanical"),
  asset("bot-rose-crimson", "Роза багряная", "botanical"),
  asset("bot-rose-coral", "Роза коралловая", "botanical"),
  asset("bot-rose-inermis", "Роза бесшипная", "botanical"),
  asset("bot-roses-yellow", "Жёлтые розы", "botanical"),
  asset("bot-forget-me-not", "Незабудки", "botanical"),
  asset("bot-anemones", "Анемоны", "botanical"),
  asset("bot-rose-centifolia", "Роза столепестковая", "botanical"),
  asset("bot-lavender", "Лаванда", "botanical"),
  asset("bot-olive", "Олива в цвету", "botanical"),
  asset("bot-speedwell", "Вероника", "botanical"),
  asset("bot-poppy", "Мак", "botanical"),
  asset("bot-daisy", "Ромашка", "botanical"),
  asset("bot-scabiosa", "Скабиоза", "botanical"),
  asset("bot-dog-rose", "Шиповник", "botanical"),
  asset("maple-leaf", "Кленовый лист", "leaves"),
  vector("branch-eucalyptus", "Эвкалипт", "leaves"),
  vector("branch-olive", "Оливковая ветвь", "leaves", true),
  vector("branch-fern", "Золотой папоротник", "leaves"),
  vector("wreath-laurel", "Лавровый венок", "wreaths"),
  vector("wreath-round", "Зелёный венок", "wreaths", true),
  vector("wreath-half", "Полувенок", "wreaths"),
  vector("monogram-ring", "Кольцо для монограммы", "wreaths", true),
  vector("arch-line", "Арка", "frames"),
  vector("arch-botanical", "Арка с лозой", "frames", true),
  vector("frame-oval", "Овальная рамка", "frames"),
  vector("frame-deco", "Ар-деко", "frames", true),
  vector("frame-corners", "Уголки с вензелями", "frames", true),
  vector("divider-leaf", "Веточка", "dividers"),
  vector("divider-heart", "Сердце", "dividers"),
  vector("divider-swirl", "Вензель", "dividers", true),
  vector("divider-dots", "Пунктир", "dividers"),
  vector("divider-wave", "Волна", "dividers"),
  vector("plane-route", "Маршрут самолёта", "dividers"),
  vector("wc-blush", "Пудровая акварель", "watercolor"),
  vector("wc-sage", "Шалфей", "watercolor"),
  vector("wc-lavender", "Лаванда", "watercolor", true),
  vector("wc-gold", "Золотые брызги", "watercolor", true),
  asset("wc-blue-strokes", "Синие мазки", "watercolor"),
  asset("wc-turquoise", "Бирюзовые полосы", "watercolor"),
  asset("wc-blue-stroke", "Синий мазок", "watercolor"),
  asset("wc-blue-cloud", "Голубое облако", "watercolor"),
  asset("wc-sky", "Небо", "watercolor"),
  asset("wc-rainbow", "Радужная акварель", "watercolor"),
  asset("wc-pink-blot", "Розовое пятно", "watercolor"),
  asset("wc-pink-splash", "Розовые брызги", "watercolor"),
  asset("wc-red-stroke", "Красный мазок", "watercolor"),
  asset("twine-bow", "Бант из бечёвки", "accents"),
  asset("twine-bow-wide", "Бант широкий", "accents"),
  asset("gold-swirl", "Золотой вихрь", "accents"),
  asset("brush-stroke", "Мазок кисти", "accents"),
  vector("ribbon-banner", "Лента", "accents"),
  vector("stars-gold", "Золотые звёзды", "accents"),
  vector("hearts-cluster", "Сердечки", "accents", true),
  asset("ribbon-gold-1", "Золотая лента", "accents"),
  asset("ribbon-gold-2", "Золотая лента 2", "accents"),
  asset("ribbon-gold-3", "Золотая лента 3", "accents"),
  asset("ribbon-gold-4", "Золотая лента 4", "accents"),
  asset("ribbon-red-1", "Красная лента", "accents"),
  asset("ribbon-red-2", "Красная лента 2", "accents"),
  asset("ribbon-white", "Белая лента", "accents"),
  asset("shell-cockle", "Ракушка", "accents"),
  vector("pearls", "Жемчуг", "accents"),
  vector("pearl-strand", "Нитка жемчуга", "accents"),
  vector("wax-seal", "Сургучная печать", "accents"),
  asset("petal-red", "Лепесток розы", "particles"),
  asset("petal-pink", "Розовый лепесток", "particles"),
  asset("leaf-particle", "Осенний лист", "particles"),
];

export const categoryLabels: Record<LibraryCategory, string> = {
  flowers: "Цветы",
  botanical: "Ботаника",
  leaves: "Ветки",
  wreaths: "Венки",
  frames: "Рамки и арки",
  dividers: "Разделители",
  watercolor: "Акварель",
  accents: "Акценты",
  particles: "Частицы",
};

export const libraryBy = (categories: LibraryCategory[]) => library.filter((a) => categories.includes(a.category));

export const surfaceLabels: Record<Surface, string> = {
  plain: "Без фона",
  paper: "Бумага",
  card: "Карточка",
  vellum: "Калька",
  crumpled: "Мятая бумага",
  notebook: "Тетрадный лист",
  "sheet-holes": "Лист с дырочками",
  "sheet-margin": "Лист с полями",
  "sheet-torn": "Рваный лист",
  "note-strip": "Полоска в линейку",
  "note-lined": "Записка в линейку",
  "note-kraft": "Крафт со скотчем",
  "note-curl": "Лист с загибом",
  scroll: "Свиток",
  parchment: "Пергамент",
  "parchment-burnt": "Старинный лист",
  "sticker-yellow": "Жёлтый стикер",
  "sticker-clip": "Стикер со скрепкой",
  "sticker-pin": "Стикер на кнопке",
  "sticker-pink": "Розовый стикер",
  "sticker-orange": "Оранжевый стикер",
  "sticker-tape": "Стикер на скотче",
  "note-burlap": "Мешковина",
  "fabric-lilac": "Лоскут ткани",
  "label-lilac": "Лиловый ярлык",
  "card-clematis": "Карточка с ботаникой",
  "label-vintage": "Винтажная этикетка",
  "ticket-admit": "Билет",
  "ticket-gold": "Золотой билет",
  "ticket-pink": "Розовый билет",
  "ticket-stubs": "Билет с корешками",
  frame: "Золочёная рама",
  "frame-gold": "Золотая рама",
  "frame-baroque": "Барочная рама",
  "frame-filigree": "Золотой вензель",
  "frame-roses": "Рамка из роз",
  plate: "Фарфоровая тарелка",
  "plate-roses": "Тарелка с розами",
  "doily-paper": "Бумажная салфетка",
  "doily-kraft": "Крафт-салфетка",
  "doily-lace": "Кружевная салфетка",
  "doily-pink": "Розовое кружево",
  "wreath-garden": "Цветочный венок",
  "wreath-blue": "Голубой венок",
  "wreath-peony": "Пионы в круге",
};

/** Группы плиток фона в редакторе (порядок внутри группы — порядок SURFACES). */
export const surfaceGroups: { label: string; items: Surface[] }[] = [
  { label: "Простые", items: ["plain", "paper", "card", "vellum", "crumpled"] },
  {
    label: "Листы и свитки",
    items: ["notebook", "sheet-holes", "sheet-margin", "sheet-torn", "note-strip", "note-lined", "note-kraft", "note-curl", "scroll", "parchment", "parchment-burnt"],
  },
  {
    label: "Стикеры и записки",
    items: ["sticker-yellow", "sticker-clip", "sticker-pin", "sticker-pink", "sticker-orange", "sticker-tape", "note-burlap", "fabric-lilac", "label-lilac"],
  },
  { label: "Карточки и билеты", items: ["card-clematis", "label-vintage", "ticket-admit", "ticket-gold", "ticket-pink", "ticket-stubs"] },
  { label: "Рамы", items: ["frame", "frame-gold", "frame-baroque", "frame-filigree", "frame-roses"] },
  {
    label: "Тарелки, салфетки, венки",
    items: ["plate", "plate-roses", "doily-paper", "doily-kraft", "doily-lace", "doily-pink", "wreath-garden", "wreath-blue", "wreath-peony"],
  },
];

/** Все категории украшений (для окна выбора в «Оформлении блока»). */
export const ORNAMENT_CATEGORIES: LibraryCategory[] = ["flowers", "botanical", "leaves", "wreaths", "frames", "dividers", "watercolor", "accents", "particles"];

const noise = (freq: string, alpha: number, size = 220) =>
  `url("data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='${freq}' numOctaves='3' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 ${alpha} 0'/></filter><rect width='100%' height='100%' filter='url(#n)'/></svg>`,
  )}") 0 0 / ${size}px ${size}px`;

/**
 * Фоны-фактуры (public/library/surfaces): серая фактура «умножается» на основу --tex-base палитры,
 * поэтому подходит любой теме. Подготовка — scripts/surface-texture.mjs, источники — CREDITS.md.
 */
export const surfaceTextures: Partial<Record<Surface, { src: string; tile: number }>> = {
  crumpled: { src: "/library/surfaces/crumpled.webp", tile: 800 },
};

/**
 * Фоны-предметы: текст лежит на вещи со своим силуэтом (источники — CREDITS.md).
 * border — картинка режется как border-image: углы и края не искажаются, середина тянется/повторяется
 *   (slice — в пикселях файла, width — толщина краёв на странице); crest — украшение над рамой, не растягивается;
 *   window — фон «окна» внутри рамы (паспарту).
 * contain — предмет целиком по центру (круглая тарелка), подходит коротким блокам.
 * pad — отступы содержимого (поле предмета, куда ложится текст); без него — класс .surface-<id> в globals.css.
 * size — размер файла в px (тест сверяет с картинкой).
 */
export type SurfaceObject =
  | {
      kind: "border";
      src: string;
      slice: string;
      width: string;
      repeat: string;
      fill?: boolean;
      window?: string;
      crest?: { src: string; width: number; height: number; overlap: number };
      pad?: string;
      size?: [number, number];
    }
  | { kind: "contain"; src: string; pad?: string };

/** [верх, право, низ, лево] в долях размера картинки. */
type Box = [number, number, number, number];
/** Ширина предмета на странице: контент приглашения ≤ 430 px минус поля блока. */
const OBJECT_WIDTH = 390;

/**
 * Предмет-лист из public/library/surfaces: slice — где резать картинку (углы и края не искажаются),
 * pad — где начинается поле для текста; оба в долях размера файла. Предмет на странице шириной ≈ OBJECT_WIDTH,
 * поэтому по горизонтали почти не тянется, а по высоте растягивается (или повторяется — repeat) только середина.
 * window — фон окна рамы (паспарту) вместо заливки серединой картинки.
 */
function sheet(id: string, size: [number, number], slice: Box, pad: Box, opts: { repeat?: string; window?: string } = {}): SurfaceObject {
  const [w, h] = size;
  const k = OBJECT_WIDTH / w;
  const px = (b: Box) => [b[0] * h, b[1] * w, b[2] * h, b[3] * w];
  const cut = px(slice).map(Math.round);
  const onPage = (v: number[]) => v.map((x) => `${Math.round(x * k)}px`).join(" ");
  return {
    kind: "border",
    src: `/library/surfaces/${id}.webp`,
    size,
    slice: cut.join(" "),
    width: onPage(cut),
    pad: onPage(px(pad)),
    repeat: opts.repeat ?? "stretch",
    ...(opts.window ? { window: opts.window } : { fill: true }),
  };
}
/** Круглый предмет целиком (тарелка, салфетка, венок); pad — в % ширины, чтобы текст лёг в середину. */
const round = (id: string, pad: string): SurfaceObject => ({ kind: "contain", src: `/library/surfaces/${id}.webp`, pad });

export const surfaceObjects: Partial<Record<Surface, SurfaceObject>> = {
  notebook: {
    kind: "border",
    src: "/library/surfaces/notebook.webp",
    slice: "110 24 40 24",
    width: "46px 10px 17px 10px",
    repeat: "stretch round",
    fill: true,
  },
  frame: {
    kind: "border",
    src: "/library/surfaces/frame-gilt.webp",
    slice: "121 117 116 113",
    width: "51px 49px 49px 47px",
    repeat: "stretch",
    window: "var(--tex-base, #fffdf8)",
    crest: { src: "/library/surfaces/frame-gilt-crest.webp", width: 252, height: 87, overlap: 3 },
  },
  // Листы и свитки
  "sheet-holes": sheet("sheet-holes", [1000, 894], [0.08, 0.03, 0.06, 0.1], [0.09, 0.07, 0.07, 0.13], { repeat: "stretch round" }),
  "sheet-margin": sheet("sheet-margin", [760, 1000], [0.06, 0.03, 0.06, 0.2], [0.07, 0.08, 0.07, 0.2], { repeat: "stretch round" }),
  "sheet-torn": sheet("sheet-torn", [1000, 840], [0.14, 0.06, 0.12, 0.1], [0.15, 0.09, 0.14, 0.13]),
  "note-strip": sheet("note-strip", [1000, 415], [0.2, 0.03, 0.2, 0.07], [0.16, 0.06, 0.16, 0.1]),
  "note-lined": sheet("note-lined", [799, 950], [0.2, 0.08, 0.12, 0.12], [0.19, 0.12, 0.12, 0.15]),
  "note-kraft": sheet("note-kraft", [1000, 776], [0.3, 0.06, 0.12, 0.04], [0.26, 0.1, 0.13, 0.08]),
  "note-curl": sheet("note-curl", [737, 1000], [0.06, 0.1, 0.22, 0.06], [0.1, 0.12, 0.14, 0.1]),
  scroll: sheet("scroll", [768, 1000], [0.16, 0.1, 0.16, 0.1], [0.17, 0.14, 0.17, 0.14]),
  parchment: sheet("parchment", [1000, 973], [0.1, 0.08, 0.1, 0.08], [0.11, 0.1, 0.11, 0.1]),
  "parchment-burnt": sheet("parchment-burnt", [439, 600], [0.1, 0.12, 0.1, 0.12], [0.11, 0.15, 0.11, 0.15]),
  // Стикеры и записки
  "sticker-yellow": sheet("sticker-yellow", [244, 278], [0.1, 0.08, 0.2, 0.06], [0.1, 0.14, 0.16, 0.14]),
  "sticker-clip": sheet("sticker-clip", [249, 259], [0.38, 0.08, 0.26, 0.08], [0.37, 0.12, 0.22, 0.12]),
  "sticker-pin": sheet("sticker-pin", [251, 253], [0.24, 0.08, 0.12, 0.1], [0.22, 0.13, 0.12, 0.14]),
  "sticker-pink": sheet("sticker-pink", [272, 271], [0.25, 0.12, 0.45, 0.2], [0.16, 0.1, 0.12, 0.14]),
  "sticker-orange": sheet("sticker-orange", [601, 603], [0.22, 0.1, 0.22, 0.12], [0.2, 0.15, 0.2, 0.16]),
  "sticker-tape": sheet("sticker-tape", [1000, 991], [0.22, 0.2, 0.15, 0.18], [0.2, 0.2, 0.14, 0.2]),
  "note-burlap": sheet("note-burlap", [928, 925], [0.3, 0.1, 0.3, 0.1], [0.2, 0.12, 0.18, 0.12]),
  "fabric-lilac": sheet("fabric-lilac", [887, 887], [0.12, 0.12, 0.12, 0.12], [0.14, 0.14, 0.14, 0.14], { repeat: "round" }),
  "label-lilac": sheet("label-lilac", [873, 483], [0.08, 0.1, 0.14, 0.04], [0.14, 0.12, 0.18, 0.1]),
  // Карточки и билеты
  "card-clematis": sheet("card-clematis", [659, 886], [0.3, 0.04, 0.42, 0.34], [0.26, 0.1, 0.4, 0.1]),
  "label-vintage": sheet("label-vintage", [674, 396], [0.32, 0.18, 0.32, 0.18], [0.22, 0.16, 0.22, 0.16]),
  "ticket-admit": sheet("ticket-admit", [1000, 492], [0.3, 0.2, 0.3, 0.2], [0.29, 0.15, 0.3, 0.15], { repeat: "stretch round" }),
  "ticket-gold": sheet("ticket-gold", [751, 350], [0.32, 0.18, 0.32, 0.18], [0.2, 0.14, 0.2, 0.14]),
  "ticket-pink": sheet("ticket-pink", [1000, 506], [0.25, 0.1, 0.25, 0.1], [0.17, 0.12, 0.17, 0.12], { repeat: "round" }),
  "ticket-stubs": sheet("ticket-stubs", [1000, 509], [0.25, 0.2, 0.25, 0.2], [0.15, 0.18, 0.15, 0.18], { repeat: "round" }),
  // Рамы
  "frame-gold": sheet("frame-gold", [773, 1000], [0.09, 0.1, 0.09, 0.1], [0.12, 0.14, 0.12, 0.14], { repeat: "round", window: "var(--tex-base, #fffdf8)" }),
  "frame-baroque": sheet("frame-baroque", [722, 534], [0.15, 0.1, 0.15, 0.1], [0.2, 0.14, 0.2, 0.14], { window: "var(--tex-base, #fffdf8)" }),
  "frame-filigree": sheet("frame-filigree", [1198, 1200], [0.14, 0.12, 0.14, 0.12], [0.14, 0.17, 0.14, 0.17]),
  "frame-roses": sheet("frame-roses", [880, 1000], [0.3, 0.3, 0.3, 0.3], [0.3, 0.24, 0.28, 0.24]),
  // Тарелки, салфетки, венки
  plate: round("plate-meissen", "22% 23%"),
  "plate-roses": round("plate-roses", "20% 21%"),
  "doily-paper": round("doily-paper", "20%"),
  "doily-kraft": round("doily-kraft", "25%"),
  "doily-lace": round("doily-lace", "26%"),
  "doily-pink": round("doily-pink", "22% 27%"),
  "wreath-garden": round("wreath-garden", "26%"),
  "wreath-blue": round("wreath-blue", "25%"),
  "wreath-peony": round("wreath-peony", "24%"),
};

/** Фоны, которые растягиваются во всю ширину экрана; предметы (листы, рамы, тарелки) и бумага — всегда по контенту. */
export const FULL_WIDTH_SURFACES: Surface[] = ["plain", "card", "vellum", "crumpled"];
/** Блок во всю ширину: так выбрано и фон это позволяет. */
export const isFullWidth = (block: Pick<Block, "width" | "surface">) => block.width === "full" && FULL_WIDTH_SURFACES.includes(block.surface);

/** Фоны на CSS без картинок. */
export const surfaceCss: Partial<Record<Surface, { background: string; backdrop?: string }>> = {
  vellum: { background: `${noise(".9", 0.08)}, rgba(255, 255, 255, 0.55)`, backdrop: "blur(3px)" },
};

/** Светлые фоны со своим цветом: при плотном фоне текст на них принудительно тёмный. */
export const lightSurfaces: Surface[] = [
  "paper",
  "vellum",
  "notebook",
  "sheet-holes",
  "sheet-margin",
  "sheet-torn",
  "note-strip",
  "note-lined",
  "note-kraft",
  "note-curl",
  "scroll",
  "parchment",
  "parchment-burnt",
  "sticker-yellow",
  "sticker-clip",
  "sticker-pin",
  "sticker-pink",
  "sticker-orange",
  "sticker-tape",
  "fabric-lilac",
  "label-lilac",
  "card-clematis",
  "label-vintage",
  "ticket-admit",
  "ticket-gold",
  "ticket-pink",
  "ticket-stubs",
  "plate",
  "plate-roses",
  "doily-paper",
  "doily-kraft",
  "wreath-garden",
  "wreath-blue",
];
/** Тёмные фоны со своим цветом: текст на них принудительно светлый. */
export const darkSurfaces: Surface[] = ["note-burlap"];

/** Картинка-подложка для фона блока (растягивается на весь блок). */
export const surfaceImages: Partial<Record<Surface, string>> = {
  paper: "/library/torn-paper.webp",
};

/** Скруглённая панель (карточка, CSS-фон, фактура) — в отличие от листа бумаги и предметов. */
export const isPanelSurface = (s: Surface) => s === "card" || !!surfaceCss[s] || !!surfaceTextures[s];

/** Цвет фона блока (bgColor) действует без фона (заливка во весь блок) и на панелях (цвет панели); у предметов — нет. */
export const takesBgColor = (s: Surface) => s === "plain" || isPanelSurface(s);

/** Стиль слоя панели, перекрашенной в свой цвет: карточка — сплошной цвет, калька — полупрозрачный, фактура — основа. */
export function tintedPanel(surface: Surface, color: string): CSSProperties {
  if (surfaceTextures[surface]) return { backgroundColor: color };
  if (surfaceCss[surface]) return { background: `${noise(".9", 0.08)}, color-mix(in srgb, ${color} 72%, transparent)` };
  return { background: color };
}

/** Картинка для плитки выбора фона в редакторе (у предметов — сам предмет целиком). */
export const surfaceThumb = (s: Surface) => surfaceObjects[s]?.src;

/**
 * Класс и стиль слоя фона блока — общие для приглашения и плиток выбора в редакторе.
 * Цвета берутся из CSS-переменных палитры (--tex-base, --accent), поэтому их надо задать выше (themeStyle).
 */
export function surfaceLayer(surface: Surface): { className: string; style: CSSProperties } {
  const image = surfaceImages[surface];
  const css = surfaceCss[surface];
  const tex = surfaceTextures[surface];
  const obj = surfaceObjects[surface];
  if (image) {
    return { className: "inv-surface-drift", style: { backgroundImage: `url("${image}")`, backgroundSize: "100% 100%", backgroundRepeat: "no-repeat" } };
  }
  if (css) return { className: "surface-layer-css", style: { background: css.background, backdropFilter: css.backdrop } };
  if (tex) {
    return {
      className: "surface-layer-css",
      style: {
        backgroundImage: `url("${tex.src}")`,
        backgroundSize: `${tex.tile}px ${tex.tile}px`,
        backgroundRepeat: "repeat",
        backgroundColor: "var(--tex-base, #fff)",
        backgroundBlendMode: "multiply",
      },
    };
  }
  if (obj?.kind === "contain") {
    return {
      className: "surface-layer-object",
      style: { backgroundImage: `url("${obj.src}")`, backgroundSize: "contain", backgroundPosition: "center", backgroundRepeat: "no-repeat" },
    };
  }
  if (obj?.kind === "border") {
    return {
      className: "surface-layer-object",
      style: {
        top: obj.crest ? obj.crest.height - obj.crest.overlap : 0,
        borderStyle: "solid",
        borderWidth: obj.width,
        borderImage: `url("${obj.src}") ${obj.slice}${obj.fill ? " fill" : ""} / ${obj.width} ${obj.repeat}`,
        ...(obj.window ? { background: obj.window, backgroundClip: "padding-box" } : {}),
      },
    };
  }
  return { className: surface === "card" ? "surface-layer-card" : "", style: {} };
}

/** SVG-тайл как CSS-фон: рисуем чёрным, цвет и яркость задаёт слой текстуры (multiply / invert на тёмной теме). */
const svgTile = (size: number, body: string) =>
  `url("data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}' viewBox='0 0 ${size} ${size}'>${body}</svg>`,
  )}") 0 0 / ${size}px ${size}px`;

export type TextureDef = {
  label: string;
  /** Значение CSS `background`. */
  css: string;
  opacity: number;
  /** Цветная текстура (использует --accent): не инвертируется на тёмной теме и кладётся без multiply. */
  tinted?: boolean;
};

/** Бесшовные текстуры страницы на чистом CSS/SVG (картинки-тайлы давали видимые стыки). */
export const textures: Record<Exclude<Texture, "none">, TextureDef> = {
  halftone: {
    label: "Точки",
    css: "radial-gradient(rgba(0,0,0,.5) 0.55px, transparent 1.05px) 0 0 / 4px 4px",
    opacity: 0.15,
  },
  speckle: {
    label: "Крапинки",
    css: [
      "radial-gradient(rgba(0,0,0,.55) 0.7px, transparent 1.2px) 0 0 / 23px 29px",
      "radial-gradient(rgba(0,0,0,.45) 0.6px, transparent 1.1px) 7px 11px / 31px 17px",
      "radial-gradient(rgba(0,0,0,.4) 0.8px, transparent 1.3px) 13px 3px / 41px 37px",
    ].join(", "),
    opacity: 0.18,
  },
  grain: {
    label: "Зерно бумаги",
    css: svgTile(
      180,
      "<filter id='n'><feTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='3' stitchTiles='stitch'/>" +
        "<feColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 .55 0'/></filter><rect width='100%' height='100%' filter='url(#n)'/>",
    ),
    opacity: 0.2,
  },
  linen: {
    label: "Лён",
    css: [
      "repeating-linear-gradient(0deg, rgba(0,0,0,.22) 0 1px, transparent 1px 3px)",
      "repeating-linear-gradient(90deg, rgba(0,0,0,.16) 0 1px, transparent 1px 4px)",
    ].join(", "),
    opacity: 0.16,
  },
  grid: {
    label: "Клетка",
    css: [
      "linear-gradient(rgba(0,0,0,.35) 1px, transparent 1px) 0 0 / 22px 22px",
      "linear-gradient(90deg, rgba(0,0,0,.35) 1px, transparent 1px) 0 0 / 22px 22px",
    ].join(", "),
    opacity: 0.12,
  },
  diagonal: {
    label: "Штрих",
    css: "repeating-linear-gradient(45deg, rgba(0,0,0,.4) 0 1px, transparent 1px 9px)",
    opacity: 0.12,
  },
  hearts: {
    label: "Сердечки",
    css: svgTile(
      44,
      "<path d='M11 16.5s-4.5-2.8-5.8-5.6C4.3 8.8 5.6 6.5 7.7 6.5c1.3 0 2.2.7 2.7 1.6.5-.9 1.4-1.6 2.7-1.6 2.1 0 3.4 2.3 2.5 4.4C14.4 13.7 11 16.5 11 16.5z' fill='none' stroke='black' stroke-width='.8'/>" +
        "<path d='M33 38.5s-4.5-2.8-5.8-5.6c-.9-2.1.4-4.4 2.5-4.4 1.3 0 2.2.7 2.7 1.6.5-.9 1.4-1.6 2.7-1.6 2.1 0 3.4 2.3 2.5 4.4-1.3 2.8-4.6 5.6-4.6 5.6z' fill='black' fill-opacity='.6'/>",
    ),
    opacity: 0.14,
  },
  diamonds: {
    label: "Ромбы",
    css: svgTile(32, "<path d='M16 0 32 16 16 32 0 16Z' fill='none' stroke='black' stroke-width='.7'/>"),
    opacity: 0.14,
  },
  flourish: {
    label: "Узор",
    css: svgTile(
      56,
      "<g fill='none' stroke='black' stroke-width='.8'>" +
        "<path d='M28 18c3 3 3 7 0 10-3-3-3-7 0-10zM28 38c3-3 3-7 0-10-3 3-3 7 0 10zM18 28c3-3 7-3 10 0-3 3-7 3-10 0zM38 28c-3-3-7-3-10 0 3 3 7 3 10 0z'/>" +
        "<circle cx='0' cy='0' r='3'/><circle cx='56' cy='0' r='3'/><circle cx='0' cy='56' r='3'/><circle cx='56' cy='56' r='3'/></g>",
    ),
    opacity: 0.16,
  },
  stars: {
    label: "Звёздочки",
    css: svgTile(
      120,
      "<g fill='black'>" +
        [
          [14, 20, 3],
          [70, 12, 2],
          [100, 48, 3.5],
          [40, 62, 2],
          [22, 98, 2.5],
          [84, 94, 2],
          [58, 34, 1.5],
        ]
          .map(([x, y, r]) => `<path d='M${x} ${y - r * 2}L${x + r / 2} ${y - r / 2}L${x + r * 2} ${y}L${x + r / 2} ${y + r / 2}L${x} ${y + r * 2}L${x - r / 2} ${y + r / 2}L${x - r * 2} ${y}L${x - r / 2} ${y - r / 2}Z'/>`)
          .join("") +
        "</g>",
    ),
    opacity: 0.22,
  },
  watercolor: {
    label: "Акварель",
    css: [
      "radial-gradient(ellipse 45% 30% at 15% 12%, color-mix(in srgb, var(--accent) 45%, transparent), transparent 70%)",
      "radial-gradient(ellipse 40% 28% at 90% 40%, color-mix(in srgb, var(--accent) 35%, transparent), transparent 70%)",
      "radial-gradient(ellipse 50% 30% at 20% 75%, color-mix(in srgb, var(--accent) 30%, transparent), transparent 70%)",
    ]
      .map((layer) => `${layer} 0 0 / 100% 1400px`)
      .join(", "),
    opacity: 0.45,
    tinted: true,
  },
};

export const textureLabels: Record<Texture, string> = {
  none: "Нет",
  ...(Object.fromEntries(Object.entries(textures).map(([k, t]) => [k, t.label])) as Record<Exclude<Texture, "none">, string>),
};
