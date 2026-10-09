import { createOrnament, newBlockId } from "./blocks";
import { library } from "./library";
import type { Block, BlockOf, BlockType, BlockWidth, Edge, Entrance, Headings, InvitationData, Ornament, OrnamentPosition, Surface, TextIcon, Theme } from "./schema";
import { SCHEMA_VERSION } from "./migrations";
import { DEFAULT_MUSIC_URL } from "./music";
import { DEFAULT_ORNAMENT_MOTION } from "./schema";
import type { VariantOf } from "./variants";

/**
 * Оформление одного блока в шаблоне: вид, фон и его цвет, прозрачность, края (и рисунок рваного края), ширина,
 * украшения, появление, цвет и шрифт надписей. Содержимое блока (тексты, фото) шаблон при смене не трогает.
 */
export type BlockDesign<K extends BlockType = BlockType> = {
  variant: VariantOf<K>;
  surface: Surface;
  surfaceOpacity: number;
  ornaments: Ornament[];
  entrance: Entrance;
  edgeTop: Edge;
  edgeBottom: Edge;
  edgeTopSeed?: number;
  edgeBottomSeed?: number;
  width: BlockWidth;
  bgColor: string | null;
  textStyles: Block["textStyles"];
};
const DESIGN_KEYS = [
  "variant",
  "surface",
  "surfaceOpacity",
  "ornaments",
  "entrance",
  "edgeTop",
  "edgeBottom",
  "edgeTopSeed",
  "edgeBottomSeed",
  "width",
  "bgColor",
  "textStyles",
] as const satisfies readonly (keyof BlockDesign)[];

/** Блок в структуре шаблона: тип, пример содержимого и оформление (всё, кроме типа, — по желанию). */
export type LayoutBlock = { [K in BlockType]: { type: K } & Partial<Omit<BlockOf<K>, "type" | "id">> }[BlockType];

export type Template = {
  id: string;
  name: string;
  description: string;
  /** Тема; заголовки по умолчанию — капителью. */
  theme: Omit<Theme, "headings" | "ornamentMotion"> & { headings?: Headings; ornamentMotion?: Theme["ornamentMotion"] };
  /** Оформление по типам блоков; незаданное сбрасывается к «классика, без фона, без украшений». */
  blocks: { [K in BlockType]?: Partial<BlockDesign<K>> };
  /** Цвета дресс-кода, подобранные под палитру шаблона. */
  dresscodeColors: string[];
  /**
   * Своя структура нового приглашения: блоки по порядку с примером текстов, фото и оформлением. Без неё —
   * стандартный набор блоков с оформлением из `blocks`. При смене шаблона n-й блок типа в приглашении получает
   * оформление n-го блока этого типа в структуре (лишние — последнего).
   */
  layout?: LayoutBlock[];
  /** Фото главного экрана нового приглашения (public/templates, CREDITS.md); у структуры `layout` — своё. */
  heroPhoto?: string;
  /** Имена в примере нового приглашения (кыргызские и казахские пары); у структуры `layout` — свои. */
  heroNames?: string;
  /** Адрес в примере «Места» (по умолчанию Бишкек; у казахских пар — Алматы); у структуры `layout` — свой. */
  address?: string;
};

/** Путь картинки из библиотеки по id (webp или векторный svg). */
const lib = (id: string) => {
  const asset = library.find((a) => a.id === id);
  if (!asset) throw new Error(`Нет картинки «${id}» в библиотеке`);
  return asset.src;
};
const orn = (id: string, position: OrnamentPosition, extra: Partial<Ornament> = {}): Ornament => ({
  ...createOrnament(lib(id), position),
  ...extra,
});
/** Фото-пример шаблона (public/templates, источники — CREDITS.md). */
const photo = (id: string) => `/templates/${id}.webp`;

/** Цвета заливок блоков в шаблонах. */
const TICKET = "#f3ede2";
const SAND_STRIP = "#e7dccb";
const CHOCOLATE = "#3b2b21";
const LATTE = "#e9dfd3";

const plainDesign: BlockDesign = {
  variant: "classic",
  surface: "plain",
  surfaceOpacity: 1,
  ornaments: [],
  entrance: "auto",
  edgeTop: "none",
  edgeBottom: "none",
  width: "content",
  bgColor: null,
  textStyles: {},
};

export const templates: Template[] = [
  {
    id: "cream-classic",
    heroPhoto: photo("cream-classic-hero"),
    address: "г. Алматы, пр. Абая, 1",
    heroNames: "Айгерим & Нурлан",
    name: "Кремовая классика",
    description: "Сухоцветы, бумага ручной работы, пергамент, бант из бечёвки и лепестки роз.",
    theme: {
      palette: "cream",
      font: "script",
      bodyFont: "auto",
      background: null,
      texture: "halftone",
      decor: { type: "image", image: lib("petal-red"), color: "#c0392b", density: 14, size: 1, speed: 1 },
      envelope: { ornament: lib("dried-botanical"), style: "seal" },
      motion: { style: "elegant", speed: 1 },
    },
    blocks: {
      hero: {
        ornaments: [
          orn("dried-botanical", "top-right", { size: 200 }),
          orn("dried-botanical", "bottom-left", { size: 180, rotate: 180 }),
        ],
      },
      calendar: { surface: "paper" },
      story: { surface: "notebook" },
      program: { surface: "paper", ornaments: [orn("twine-bow-wide", "top-right", { size: 120, rotate: 8 })] },
      dresscode: { ornaments: [orn("dried-botanical", "bottom-left", { size: 120, opacity: 0.7 })] },
      location: { surface: "card" },
      rsvp: {
        ornaments: [
          orn("twine-bow", "top-left", { size: 90, rotate: -20 }),
          orn("dried-botanical", "right", { size: 170, opacity: 0.85 }),
        ],
      },
    },
    dresscodeColors: ["#efe6da", "#dcc7b0", "#c4a57f", "#a8845e", "#6f6862"],
  },
  {
    id: "rose-garden",
    heroPhoto: photo("rose-garden-hero"),
    heroNames: "Айпери & Бакыт",
    name: "Розовый сад",
    description: "Пудровые тона, акварельный фон, пышные розы с сиренью и розовые лепестки.",
    theme: {
      palette: "blush",
      font: "marck",
      bodyFont: "lora",
      background: null,
      texture: "watercolor",
      decor: { type: "image", image: lib("petal-pink"), color: "#e8a0b0", density: 18, size: 1.1, speed: 1 },
      envelope: { ornament: lib("rose-lilac"), style: "veil" },
      motion: { style: "soft", speed: 1 },
    },
    blocks: {
      hero: {
        ornaments: [
          orn("pink-roses", "top-right", { size: 165 }),
          orn("peach-rose", "bottom-left", { size: 170, flip: true }),
        ],
      },
      countdown: { surface: "card", surfaceOpacity: 0.85 },
      calendar: { surface: "card", ornaments: [orn("rose-lilac", "top-left", { size: 85, rotate: -15, opacity: 0.9 })] },
      story: { surface: "crumpled", ornaments: [orn("pink-roses", "bottom-right", { size: 110 })] },
      program: { ornaments: [orn("peach-rose", "right", { size: 130, opacity: 0.8 })] },
      dresscode: { surface: "card", surfaceOpacity: 0.85 },
      location: { surface: "card", ornaments: [orn("pink-roses", "top-left", { size: 100 })] },
      rsvp: {
        ornaments: [
          orn("rose-lilac", "top-right", { size: 105 }),
          orn("pink-roses", "bottom-left", { size: 120, opacity: 0.8 }),
        ],
      },
    },
    dresscodeColors: ["#fbe3e6", "#f2b8c0", "#d98c99", "#b86b7a", "#8a9a7b"],
  },
  {
    id: "golden-autumn",
    heroPhoto: photo("golden-autumn-hero"),
    heroNames: "Жибек & Азамат",
    name: "Золотая осень",
    description: "Тёплые охристые тона, кленовые листья, настурция и листопад.",
    theme: {
      palette: "autumn",
      font: "playfair",
      bodyFont: "eb-garamond",
      background: null,
      texture: "grain",
      decor: { type: "image", image: lib("leaf-particle"), color: "#c46b2b", density: 12, size: 1.6, speed: 1 },
      envelope: { ornament: lib("maple-leaf"), style: "seal" },
      motion: { style: "elegant", speed: 1 },
    },
    blocks: {
      hero: {
        ornaments: [
          orn("nasturtium", "top-left", { size: 130 }),
          orn("maple-leaf", "bottom-right", { size: 150, rotate: -30 }),
        ],
      },
      countdown: { ornaments: [orn("maple-leaf", "left", { size: 90, rotate: 40, opacity: 0.8 })] },
      calendar: { surface: "paper", ornaments: [orn("twine-bow", "top-right", { size: 90, rotate: 10 })] },
      story: { surface: "paper", surfaceOpacity: 0.85 },
      program: { surface: "paper", ornaments: [orn("maple-leaf", "bottom-left", { size: 110, rotate: -15, opacity: 0.9 })] },
      dresscode: { ornaments: [orn("nasturtium", "top-right", { size: 110 })] },
      location: { surface: "card" },
      rsvp: {
        surface: "paper",
        ornaments: [
          orn("maple-leaf", "top-left", { size: 100, rotate: 25 }),
          orn("twine-bow-wide", "bottom-right", { size: 110 }),
        ],
      },
    },
    dresscodeColors: ["#f3e2c7", "#e0a458", "#c46b2b", "#8c3b1e", "#5b4636"],
  },
  {
    id: "starry-night",
    heroPhoto: photo("starry-night-hero"),
    address: "г. Алматы, пр. Абая, 1",
    heroNames: "Асель & Тимур",
    name: "Звёздная ночь",
    description: "Глубокий синий, золото, белые розы и мерцающие искры на звёздном небе.",
    theme: {
      palette: "night",
      font: "poiret",
      bodyFont: "raleway",
      background: null,
      texture: "stars",
      decor: { type: "snow", image: null, color: "#d4b872", density: 30, size: 1, speed: 1 },
      envelope: { ornament: lib("white-roses"), style: "seal" },
      motion: { style: "elegant", speed: 1 },
    },
    blocks: {
      hero: {
        ornaments: [
          orn("white-roses", "top-right", { size: 190 }),
          orn("gold-swirl", "left", { size: 130, opacity: 0.8 }),
          orn("white-roses", "bottom-left", { size: 150, flip: true }),
        ],
      },
      countdown: { surface: "card", surfaceOpacity: 0.12 },
      calendar: { surface: "card", surfaceOpacity: 0.12, ornaments: [orn("gold-swirl", "right", { size: 110, opacity: 0.7 })] },
      story: { ornaments: [orn("gardenia", "bottom-right", { size: 110, opacity: 0.85 })] },
      program: { surface: "card", surfaceOpacity: 0.1 },
      location: { surface: "card", surfaceOpacity: 0.12, ornaments: [orn("white-roses", "top-right", { size: 110 })] },
      rsvp: {
        ornaments: [
          orn("white-roses", "top-left", { size: 130 }),
          orn("gold-swirl", "right", { size: 130, opacity: 0.6 }),
        ],
      },
    },
    dresscodeColors: ["#0f1424", "#2a3553", "#d4b872", "#ece8f4", "#8a7a5a"],
  },
  {
    id: "eucalyptus",
    heroPhoto: photo("eucalyptus-hero"),
    heroNames: "Нургуль & Эрлан",
    name: "Эвкалипт",
    description: "Шалфейная зелень, ветки эвкалипта, арка, льняные карточки и акварельные пятна.",
    theme: {
      palette: "emerald",
      font: "comforter",
      bodyFont: "spectral",
      background: null,
      texture: "linen",
      decor: { type: "petals", image: null, color: "#b9c9ae", density: 10, size: 0.9, speed: 0.8 },
      envelope: { ornament: lib("branch-eucalyptus"), style: "flap" },
      motion: { style: "soft", speed: 1 },
    },
    blocks: {
      hero: {
        variant: "arch",
        ornaments: [
          orn("wc-sage", "top-left", { size: 280, opacity: 0.75 }),
          orn("branch-eucalyptus", "top-right", { size: 150, rotate: 25 }),
          orn("branch-eucalyptus", "bottom-left", { size: 140, rotate: -150, flip: true }),
        ],
      },
      countdown: { variant: "circles" },
      calendar: {
        variant: "date",
        surface: "vellum",
        surfaceOpacity: 0.8,
        ornaments: [orn("branch-eucalyptus", "right", { size: 110, rotate: -20, opacity: 0.9 })],
      },
      story: {
        variant: "letter",
        ornaments: [
          orn("branch-eucalyptus", "right", { size: 120, rotate: -15, opacity: 0.9 }),
          orn("wc-sage", "bottom-left", { size: 220, opacity: 0.6 }),
        ],
      },
      program: { variant: "icons", surface: "card", surfaceOpacity: 0.7 },
      dresscode: { variant: "stripes", ornaments: [orn("branch-fern", "top-right", { size: 110, rotate: 20, opacity: 0.85 })] },
      location: { surface: "card", surfaceOpacity: 0.7, ornaments: [orn("branch-eucalyptus", "top-left", { size: 110, rotate: -30 })] },
      rsvp: {
        surface: "vellum",
        surfaceOpacity: 0.8,
        ornaments: [
          orn("branch-eucalyptus", "top-left", { size: 120, rotate: -40 }),
          orn("wc-sage", "bottom-right", { size: 240, opacity: 0.6 }),
        ],
      },
    },
    dresscodeColors: ["#eef1e8", "#c9d4bd", "#9aab8c", "#6f7f60", "#e9dfcf"],
  },
  {
    id: "art-deco",
    heroPhoto: photo("art-deco-hero"),
    address: "г. Алматы, пр. Абая, 1",
    heroNames: "Алия & Ерлан",
    name: "Великий Гэтсби",
    description: "Ар-деко: чёрное золото, геометричные рамки, золотые брызги, звёзды и конфетти.",
    theme: {
      palette: "noir",
      font: "playfair-sc",
      bodyFont: "jost",
      background: null,
      texture: "diamonds",
      decor: { type: "confetti", image: null, color: "#c9a45c", density: 14, size: 0.8, speed: 0.7 },
      envelope: { ornament: lib("stars-gold"), style: "seal" },
      motion: { style: "cinematic", speed: 1 },
    },
    blocks: {
      hero: {
        variant: "minimal",
        ornaments: [
          orn("frame-deco", "center", { size: 340, opacity: 0.95 }),
          orn("stars-gold", "top-right", { size: 110, opacity: 0.9 }),
          orn("stars-gold", "bottom-left", { size: 120, rotate: 180, opacity: 0.8 }),
        ],
      },
      countdown: { variant: "cards", surface: "card", surfaceOpacity: 0.1 },
      calendar: { variant: "tearoff", ornaments: [orn("divider-swirl", "top", { size: 220, opacity: 0.9 })] },
      story: {
        entrance: "blur",
        ornaments: [orn("divider-dots", "bottom", { size: 200, opacity: 0.8 })],
      },
      program: { surface: "card", surfaceOpacity: 0.1, ornaments: [orn("stars-gold", "top-right", { size: 90, opacity: 0.8 })] },
      dresscode: { variant: "chips" },
      location: {
        variant: "minimal",
        ornaments: [orn("stars-gold", "top-left", { size: 90, opacity: 0.8 })],
      },
      rsvp: {
        surface: "frame",
        ornaments: [
          orn("divider-swirl", "top", { size: 200, opacity: 0.9 }),
          orn("stars-gold", "bottom-right", { size: 100, opacity: 0.8 }),
        ],
      },
    },
    dresscodeColors: ["#efe7d6", "#c9a45c", "#6d1f2a", "#1f3b33", "#3a342b"],
  },
  {
    id: "lavender-provence",
    heroPhoto: photo("lavender-provence-hero"),
    address: "г. Алматы, пр. Абая, 1",
    heroNames: "Айжан & Данияр",
    name: "Лавандовый Прованс",
    description: "Лавандовая акварель, розы с сиренью, полароид, почтовая открытка и бант из бечёвки.",
    theme: {
      palette: "lavender",
      font: "bad-script",
      bodyFont: "lora",
      background: null,
      texture: "speckle",
      decor: { type: "sakura", image: null, color: "#c9b6e0", density: 14, size: 1, speed: 0.8 },
      envelope: { ornament: lib("rose-lilac"), style: "book" },
      motion: { style: "soft", speed: 1 },
    },
    blocks: {
      hero: {
        variant: "polaroid",
        ornaments: [
          orn("wc-lavender", "top-left", { size: 300, opacity: 0.8 }),
          orn("rose-lilac", "bottom-right", { size: 150 }),
          orn("hearts-cluster", "top-right", { size: 80, opacity: 0.8 }),
        ],
      },
      countdown: { surface: "card", surfaceOpacity: 0.75 },
      calendar: {
        surface: "card",
        surfaceOpacity: 0.75,
        ornaments: [
          orn("rose-lilac", "top-right", { size: 95, rotate: 10 }),
          orn("wc-lavender", "bottom-left", { size: 200, opacity: 0.5 }),
        ],
      },
      story: { surface: "crumpled", ornaments: [orn("twine-bow", "top-left", { size: 85, rotate: -15 })] },
      program: { ornaments: [orn("divider-heart", "top", { size: 180, opacity: 0.85 })] },
      dresscode: { surface: "card", surfaceOpacity: 0.75, ornaments: [orn("pink-roses", "top-right", { size: 90, rotate: 15 })] },
      location: { variant: "postcard" },
      rsvp: {
        variant: "compact",
        surface: "card",
        surfaceOpacity: 0.75,
        ornaments: [
          orn("twine-bow-wide", "top-right", { size: 110, rotate: 8 }),
          orn("rose-lilac", "bottom-left", { size: 120, flip: true }),
        ],
      },
    },
    dresscodeColors: ["#f3eef7", "#dccfea", "#b6a3cf", "#8e7aa8", "#a3b18a"],
  },
  {
    id: "marble-olive",
    heroPhoto: photo("marble-olive-hero"),
    heroNames: "Бегимай & Улан",
    name: "Мрамор и олива",
    description: "Античная классика: фарфор, золочёная рама, оливковые ветви, золотые вензели и гардении.",
    theme: {
      palette: "ivory",
      font: "forum",
      bodyFont: "eb-garamond",
      background: null,
      texture: "grain",
      decor: { type: "petals", image: null, color: "#e3d6bb", density: 8, size: 1, speed: 0.7 },
      envelope: { ornament: lib("branch-olive"), style: "seal" },
      motion: { style: "elegant", speed: 1 },
    },
    blocks: {
      hero: {
        ornaments: [
          orn("branch-olive", "top-left", { size: 160, rotate: -35 }),
          orn("gardenia", "top-right", { size: 140, opacity: 0.95 }),
          orn("branch-olive", "bottom-right", { size: 150, rotate: 145, flip: true }),
        ],
      },
      countdown: { surface: "plate" },
      calendar: { variant: "week", ornaments: [orn("divider-leaf", "bottom", { size: 200, opacity: 0.85 })] },
      story: {
        surface: "paper",
        ornaments: [orn("branch-olive", "bottom-right", { size: 130, rotate: 150, opacity: 0.9 })],
      },
      program: { surface: "card", surfaceOpacity: 0.85, ornaments: [orn("divider-swirl", "bottom", { size: 200, opacity: 0.8 })] },
      dresscode: { ornaments: [orn("gardenia", "bottom-right", { size: 110, opacity: 0.9 })] },
      location: { variant: "postcard", ornaments: [orn("branch-olive", "top-right", { size: 110, rotate: 30 })] },
      rsvp: {
        surface: "frame",
        ornaments: [
          orn("branch-olive", "top-right", { size: 120, rotate: 35 }),
          orn("gardenia", "bottom-left", { size: 120, opacity: 0.9 }),
        ],
      },
    },
    dresscodeColors: ["#fbf8f1", "#ebe3d3", "#cdb98f", "#8a9468", "#55533f"],
  },
  {
    id: "boarding-pass",
    name: "Посадочный талон",
    description: "Свадьба-путешествие: тёмно-синий, кремовые билеты с перфорацией, штемпель, ч/б фото и маршрут самолёта.",
    theme: {
      palette: "navy",
      font: "prata",
      bodyFont: "montserrat",
      headings: "names",
      background: null,
      texture: "grain",
      decor: { type: "none", image: null, color: "#dccaa4", density: 0, size: 1, speed: 1 },
      envelope: { ornament: lib("plane-route"), style: "flap" },
      motion: { style: "elegant", speed: 1 },
    },
    blocks: {},
    dresscodeColors: ["#f1ece2", "#e1d3b8", "#a39485", "#1c2b45", "#1d1d1f"],
    layout: [
      {
        type: "hero",
        variant: "ticket",
        names: "Динара & Арман",
        date: "2027-06-19T15:00",
        label: "Свадебный билет",
        subtitle: "Посадка на любовь открыта",
        photo: null,
      },
      {
        type: "text",
        title: "Дорогие друзья и близкие",
        icon: undefined,
        text: "Мы приглашаем вас в самое главное путешествие нашей жизни. Ваша любовь и поддержка значат для нас всё — не можем дождаться, когда отпразднуем этот день вместе с вами.",
      },
      { type: "photo", variant: "frame", photo: photo("boarding-couple"), width: "content", ornaments: [orn("plane-route", "bottom", { size: 240, opacity: 0.9 })] },
      {
        type: "text",
        title: "Ждём вас",
        icon: "plane",
        text: "Собирайте чемоданы и присоединяйтесь к нам на выходные, полные любви, смеха и незабываемых воспоминаний.",
      },
      { type: "calendar", title: "Сохраните дату", surface: "card", bgColor: TICKET, edgeTop: "perforated", edgeBottom: "perforated" },
      { type: "countdown", title: "До вылета", variant: "circles" },
      {
        type: "location",
        title: "Пункт назначения",
        surface: "card",
        bgColor: TICKET,
        edgeTop: "perforated",
        edgeBottom: "perforated",
        placeName: "Вилла Бальбьянелло",
        address: "Ленно, озеро Комо, Италия",
        mapUrl: "https://maps.google.com/?q=Villa+del+Balbianello",
        photo: photo("boarding-villa"),
      },
      {
        type: "program",
        title: "Маршрут дня",
        ornaments: [orn("plane-route", "bottom", { size: 300, opacity: 0.85 })],
        items: [
          { time: "12:00", title: "Сбор гостей", description: "Приветственный коктейль" },
          { time: "12:30", title: "Церемония", description: "На террасе у воды" },
          { time: "13:30", title: "Праздничный обед", description: "Тосты и поздравления" },
          { time: "17:00", title: "Танцы", description: "До самого заката" },
          { time: "23:00", title: "Финал вечера", description: "Огни над озером" },
        ],
      },
      {
        type: "dresscode",
        title: "Дресс-код",
        surface: "card",
        bgColor: TICKET,
        edgeTop: "perforated",
        edgeBottom: "perforated",
        text: "Будем рады видеть вас в элегантных нарядах вне времени. Наша палитра:",
        colors: [],
      },
      { type: "photo", photo: photo("boarding-window"), caption: "Скоро на посадку" },
      {
        type: "rsvp",
        title: "Подтвердите бронь",
        scriptLine: undefined,
        surface: "card",
        bgColor: TICKET,
        edgeTop: "perforated",
        edgeBottom: "perforated",
        deadline: "2027-05-01",
      },
      { type: "photo", variant: "frame", photo: photo("boarding-kiss"), width: "content", caption: "До встречи на борту!" },
    ],
  },
  {
    id: "lago",
    name: "Итальянское озеро",
    description: "Тёплая сепия, рукописные заголовки и рваные края бумаги между фото: вилла, терраса над водой, кольца.",
    theme: {
      palette: "sand",
      font: "script",
      bodyFont: "cormorant",
      headings: "names",
      background: null,
      texture: "grain",
      decor: { type: "none", image: null, color: "#d8c7ae", density: 0, size: 1, speed: 1 },
      envelope: { ornament: lib("dried-botanical"), style: "veil" },
      motion: { style: "elegant", speed: 1 },
    },
    blocks: {},
    dresscodeColors: ["#ece2d4", "#cdbba5", "#a6a68b", "#7e7f64", "#5a594a"],
    layout: [
      {
        type: "hero",
        names: "Камила & Нурсултан",
        date: "2027-06-12T15:00",
        label: "Вместе в самое красивое завтра",
        subtitle: undefined,
        photo: photo("lago-walk"),
        edgeBottom: "torn",
      },
      {
        type: "text",
        title: "Дорогие",
        scriptLine: "родные и близкие!",
        icon: undefined,
        text: "Мы очень хотим разделить с вами один из самых важных и счастливых дней в нашей жизни!\nБудем рады видеть вас на нашей свадьбе.\n\n— 12 . 06 . 2027 —",
      },
      {
        type: "location",
        title: "Место",
        scriptLine: "проведения",
        bgColor: SAND_STRIP,
        width: "full",
        edgeTop: "torn",
        edgeBottom: "torn",
        placeName: "Вилла «Солнечная долина»",
        address: "Алматинская обл., Капчагай, ул. Береговая, 15",
        mapUrl: "https://yandex.ru/maps/?text=Лесная",
        photo: photo("lago-terrace"),
      },
      {
        type: "program",
        title: "Тайминг",
        scriptLine: "свадебного дня",
        items: [
          { time: "15:00", title: "Сбор гостей", description: "Приветственный фуршет" },
          { time: "16:00", title: "Церемония", description: "Мы скажем друг другу «Да!»" },
          { time: "17:30", title: "Праздничный ужин", description: "Тёплые слова и пожелания" },
          { time: "21:00", title: "Вечерняя программа", description: "Танцы, музыка, веселье" },
          { time: "23:00", title: "Завершение вечера", description: "Но это только начало…" },
        ],
      },
      {
        type: "dresscode",
        title: "Дресс-код",
        scriptLine: "стиль в деталях",
        bgColor: SAND_STRIP,
        width: "full",
        edgeTop: "torn",
        edgeBottom: "torn",
        text: "Будем благодарны, если при выборе нарядов вы поддержите нашу цветовую гамму.",
        colors: [],
      },
      {
        type: "text",
        title: "Пожелания",
        icon: undefined,
        ornaments: [orn("divider-leaf", "bottom", { size: 180, opacity: 0.8 })],
        text: "Для нас самое ценное — ваше присутствие, поддержка и тёплые слова в этот особенный день.\n\nЕсли вы хотите порадовать нас подарком, будем благодарны за вклад в наше совместное будущее.",
      },
      {
        type: "photo",
        photo: photo("lago-rings"),
        height: "square",
        edgeTop: "torn",
        edgeBottom: "torn",
      },
      {
        type: "contacts",
        title: "",
        text: "Если у вас есть вопросы, вы всегда можете связаться с нами.",
        people: [{ name: "Дана", role: "Организатор", phone: "+7 701 123 45 67", whatsapp: true, telegram: "dana_toi" }],
      },
      { type: "countdown", title: "Увидимся", scriptLine: "через…", bgColor: SAND_STRIP, width: "full", edgeTop: "torn", edgeBottom: "torn" },
      { type: "rsvp", title: "Анкета", scriptLine: "подтверждение присутствия", deadline: "2027-05-15" },
      { type: "photo", photo: photo("lago-villa"), caption: "Спасибо, что вы с нами!", edgeTop: "torn" },
    ],
  },
  {
    id: "mocha",
    name: "Шоколад и сургуч",
    description: "Кремовые и шоколадные полосы, монограмма, сухоцветы, шёлк, галерея и золотая сургучная печать.",
    theme: {
      palette: "mocha",
      font: "marck",
      bodyFont: "cormorant",
      headings: "caps",
      background: null,
      texture: "grain",
      decor: { type: "none", image: null, color: "#d8c7ae", density: 0, size: 1, speed: 1 },
      envelope: { ornament: lib("dried-botanical"), style: "seal" },
      motion: { style: "elegant", speed: 1 },
    },
    blocks: {},
    dresscodeColors: ["#f5f1ea", "#dccbb3", "#a88f73", "#6b5241", "#7f7a4c"],
    layout: [
      { type: "hero", variant: "monogram", names: "Санжар & Мадина", date: "2027-08-21T16:00", label: undefined, subtitle: "Бишкек", photo: photo("mocha-dried") },
      {
        type: "text",
        title: "",
        scriptLine: "Добро пожаловать!",
        icon: undefined,
        bgColor: LATTE,
        width: "full",
        text: "Мы будем счастливы разделить с вами один из самых важных дней в нашей жизни. Приглашаем вас на нашу свадьбу!",
      },
      {
        type: "story",
        variant: "photo",
        title: "Наша история",
        scriptLine: "каждый момент имеет значение",
        text: "Наша история началась с дружбы, переросла в любовь и наполнила жизнь смыслом и теплом.",
        photo: photo("mocha-sunset"),
      },
      {
        type: "program",
        variant: "icons",
        title: "Программа дня",
        bgColor: CHOCOLATE,
        width: "full",
        items: [
          { time: "16:00", title: "Церемония", icon: "rings" },
          { time: "17:00", title: "Фотосессия", icon: "camera" },
          { time: "18:00", title: "Банкет", icon: "dinner" },
          { time: "21:00", title: "Танцы и праздник", icon: "dance" },
        ],
      },
      {
        type: "location",
        variant: "minimal",
        title: "Место",
        bgColor: CHOCOLATE,
        width: "full",
        placeName: "Усадьба «Вдохновение»",
        address: "Чуйская обл., Аламединский район",
        mapUrl: "https://yandex.ru/maps/?text=Истра",
        photo: null,
      },
      { type: "photo", photo: photo("mocha-seal"), height: "square" },
      {
        type: "dresscode",
        title: "Дресс-код",
        bgColor: LATTE,
        width: "full",
        text: "Мы будем рады, если вы поддержите цветовую палитру нашей свадьбы своими нарядами.",
        colors: [],
      },
      { type: "text", variant: "card", title: "", icon: undefined, bgImage: photo("mocha-silk"), bgDim: 0.1, text: "Любовь — это когда чьё-то счастье важнее своего." },
      {
        type: "text",
        title: "Подарки",
        icon: "gift",
        text: "Ваши тёплые слова и пожелания — лучший подарок для нас. Если захотите сделать нам приятный сюрприз, будем рады вкладу в нашу совместную мечту.",
      },
      {
        type: "gallery",
        title: "Галерея",
        photos: [
          photo("mocha-g-rings"),
          photo("mocha-g-table"),
          photo("mocha-g-walk"),
          photo("mocha-g-bouquet"),
          photo("mocha-g-invite"),
          photo("mocha-g-candles"),
        ],
      },
      {
        type: "rsvp",
        title: "Анкета",
        scriptLine: "подтвердите присутствие",
        bgColor: CHOCOLATE,
        width: "full",
        deadline: "2027-07-01",
        ornaments: [orn("wax-seal", "top-right", { size: 96, rotate: -14 })],
      },
      { type: "text", title: "", scriptLine: "Мы ждём вас!", icon: undefined, text: "С любовью,\nСанжар и Мадина" },
      { type: "photo", photo: photo("mocha-tuscany"), height: "square" },
    ],
  },
  {
    id: "seaside",
    name: "Морской берег",
    description: "Жемчужно-розовый, фото у моря с волной, ракушки, жемчуг и розы; галерея и контакты организатора.",
    theme: {
      palette: "pearl",
      font: "cormorant-sc",
      bodyFont: "lora",
      headings: "names",
      background: null,
      texture: "speckle",
      decor: { type: "sakura", image: null, color: "#e8b8b5", density: 8, size: 0.8, speed: 0.6 },
      envelope: { ornament: lib("pearls"), style: "curtains" },
      motion: { style: "soft", speed: 1 },
    },
    blocks: {},
    dresscodeColors: ["#efe4dc", "#e9c9c2", "#d6a39b", "#a9ae9b", "#9a8176"],
    layout: [
      {
        type: "hero",
        variant: "cover",
        names: "Айбек & Айсулуу",
        date: "2027-09-12T14:30",
        label: "Приглашение на свадьбу",
        subtitle: undefined,
        photo: photo("seaside-couple"),
        // Верх занят фото (оно выше украшений) — украшения только в нижних углах, у имён.
        ornaments: [orn("pink-roses", "bottom-left", { size: 130, rotate: 8 }), orn("shell-cockle", "bottom-right", { size: 100, rotate: -18 })],
      },
      {
        type: "text",
        title: "Дорогие родные и близкие!",
        icon: undefined,
        ornaments: [orn("divider-wave", "top", { size: 400, opacity: 0.9 })],
        text: "Мы с радостью делимся с вами важной новостью — мы женимся! Приглашаем разделить с нами этот особенный день: очень хотим провести его в кругу самых близких людей.",
      },
      {
        type: "program",
        title: "Программа дня",
        items: [
          { time: "14:30", title: "Торжественная регистрация", description: "Дворец бракосочетания №2" },
          { time: "17:00", title: "Праздничный ужин", description: "Ресторан «Морская терраса»" },
        ],
      },
      {
        type: "location",
        variant: "minimal",
        title: "",
        placeName: "Ресторан «Морская терраса»",
        address: "Иссык-Куль, г. Чолпон-Ата, ул. Советская, 8",
        mapUrl: "https://2gis.kg/cholponata",
        photo: null,
        ornaments: [orn("pearls", "top-right", { size: 64 })],
      },
      {
        type: "dresscode",
        title: "Дресс-код",
        ornaments: [orn("pink-roses", "bottom-left", { size: 110, rotate: -8, opacity: 0.95 })],
        text: "Будем рады, если вы поддержите цветовую гамму нашего вечера.",
        colors: [],
      },
      {
        type: "gallery",
        title: "",
        photos: [photo("seaside-g-bridesmaids"), photo("seaside-g-table"), photo("seaside-g-veil"), photo("seaside-g-rings")],
      },
      {
        type: "text",
        title: "Пожелания",
        icon: undefined,
        ornaments: [
          orn("divider-wave", "top", { size: 400, opacity: 0.9, flip: true }),
          orn("shell-cockle", "right", { size: 84, rotate: 24 }),
          orn("pearls", "bottom-left", { size: 70 }),
        ],
        text: "Вместо традиционных подарков мы будем очень рады вашему вкладу в наше свадебное путешествие мечты.\n\nФормат праздника — только для взрослых. Пожалуйста, проведите этот вечер без детей.\n\nВместо живых цветов можно поддержать наш домашний бар — это будет отличным подарком!",
      },
      {
        type: "contacts",
        title: "Контакты",
        ornaments: [orn("shell-cockle", "left", { size: 86, rotate: -24 })],
        text: "По всем вопросам, пожалуйста, обращайтесь к нашему организатору:",
        people: [{ name: "Айгерим", role: "Организатор", phone: "+996 555 123 456", whatsapp: true, telegram: "aigerim_toi" }],
      },
      { type: "rsvp", title: "Анкета", deadline: "2027-08-20", ornaments: [orn("pink-roses", "bottom-right", { size: 100, rotate: 8 })] },
      { type: "countdown", title: "Увидимся через…", surface: "card", bgColor: "#f3e4dd", surfaceOpacity: 0.9 },
      {
        type: "text",
        title: "",
        icon: undefined,
        ornaments: [orn("pearl-strand", "top", { size: 260, opacity: 0.95 }), orn("pink-roses", "bottom-right", { size: 120, rotate: -6 })],
        text: "С любовью,\nАртём и Вероника",
      },
    ],
  },
];

export const findTemplate = (id: string) => templates.find((t) => t.id === id);

/** Оформление «без шаблона»: фото по умолчанию во всю ширину, остальное — по колонке. */
const plainDesignFor = (type: BlockType): BlockDesign => (type === "photo" ? { ...plainDesign, width: "full" } : plainDesign);

/** Поля оформления из блока (структуры шаблона или приглашения). */
function designFields(block: Partial<BlockDesign>): Partial<BlockDesign> {
  const out: Partial<Record<keyof BlockDesign, unknown>> = {};
  for (const key of DESIGN_KEYS) if (block[key] !== undefined) out[key] = block[key];
  return out as Partial<BlockDesign>;
}

/**
 * Оформление n-го (с нуля) блока типа по шаблону: из структуры шаблона (n-й блок типа, лишние — последний),
 * иначе из оформления по типам; всё, чего шаблон не задал, — «классика, без фона, без украшений».
 */
function designFor(template: Template, type: BlockType, n = 0): BlockDesign {
  const same = template.layout?.filter((b) => b.type === type) ?? [];
  const item = same[Math.min(n, same.length - 1)];
  return { ...plainDesignFor(type), ...template.blocks[type], ...(item ? designFields(item as Partial<BlockDesign>) : {}) };
}

/** Тема шаблона — глубокая копия (вложенные decor/envelope не должны быть общими с константой шаблона). */
const themeOf = (template: Template): Theme => ({
  headings: "caps",
  ornamentMotion: { ...DEFAULT_ORNAMENT_MOTION },
  ...structuredClone(template.theme),
});

/** Готовые варианты блока «Текст» в окне «Добавить блок». */
export const TEXT_PRESETS: { id: string; title: string; icon: TextIcon; text: string }[] = [
  {
    id: "welcome",
    title: "Дорогие гости",
    icon: "heart",
    text: "Мы рады пригласить вас на нашу свадьбу! Этот день станет для нас особенным, и мы хотим провести его с самыми близкими людьми.",
  },
  {
    id: "wishes",
    title: "Пожелания",
    icon: "flower",
    text: "Пожалуйста, не дарите нам цветы — букеты быстро завянут. Будем рады бутылочке вашего любимого вина: откроем её на годовщину.",
  },
  {
    id: "gifts",
    title: "Подарки",
    icon: "gift",
    text: "Ваше присутствие — лучший подарок. Если хотите порадовать нас ещё, будем благодарны за вклад в наше свадебное путешествие.",
  },
  {
    id: "adults",
    title: "Только взрослые",
    icon: "child",
    text: "Мы очень любим ваших детей, но этот вечер хотим провести во взрослой компании. Спасибо за понимание!",
  },
  {
    id: "details",
    title: "Детали",
    icon: "info",
    text: "У ресторана есть бесплатная парковка. После 23:00 для гостей будет трансфер до центра города.",
  },
];

/** Пример содержимого блока каждого типа: им заполняются новое приглашение и новый блок в редакторе. */
function sampleBlock(type: BlockType, id: string): Block {
  const base = {
    id,
    visible: true,
    ...plainDesignFor(type),
    variant: "classic" as const,
    entrance: "auto" as const,
    bgImage: null,
    bgDim: 0.35,
    bgBlur: 0,
    bgDarken: 0,
  };
  switch (type) {
    case "hero":
      return {
        type,
        ...base,
        names: "Айгерим & Нурлан",
        date: "2027-06-19T16:00",
        label: "Приглашение на свадьбу",
        subtitle: "Приглашаем вас разделить с нами этот день",
        photo: null,
      };
    case "countdown":
    case "calendar":
      return { type, ...base };
    case "story":
      return {
        type,
        ...base,
        title: "",
        text: "Мы познакомились весной, и с тех пор не расстаёмся. Будем счастливы видеть вас рядом в самый важный для нас день.",
        photo: null,
      };
    case "program":
      return {
        type,
        ...base,
        items: [
          { time: "16:00", title: "Сбор гостей", description: "Фуршет и приветственные напитки" },
          { time: "16:30", title: "Церемония", description: "Торжественная регистрация" },
          { time: "18:00", title: "Праздничный ужин", description: "Банкет и поздравления" },
        ],
      };
    case "dresscode":
      return { type, ...base, text: "Будем рады, если вы поддержите цветовую гамму праздника", colors: [] };
    case "location":
      return { type, ...base, placeName: "Ресторан «Сад»", address: "г. Бишкек, ул. Киевская, 1", photo: null };
    case "rsvp":
      return { type, ...base, title: "Подтвердите, пожалуйста,", scriptLine: "своё присутствие" };
    case "text": {
      const preset = TEXT_PRESETS[1];
      return { type, ...base, title: preset.title, icon: preset.icon, text: preset.text };
    }
    case "photo":
      return { type, ...base, photo: null, height: "auto" };
    case "gallery":
      return { type, ...base, photos: [] };
    case "contacts":
      return {
        type,
        ...base,
        title: "Остались вопросы?",
        text: "Звоните или пишите — с радостью подскажем.",
        people: [{ name: "Айгерим", role: "Организатор", phone: "+996 555 000 000", whatsapp: true, telegram: "" }],
      };
  }
}

/** Блоки нового приглашения. Id стабильные («b-<тип>», повторы — «b-<тип>-2», как у старых приглашений). */
function sampleBlocks(template: Template): Block[] {
  const layout: LayoutBlock[] = template.layout ?? (["hero", "countdown", "calendar", "story", "program", "dresscode", "location", "rsvp"] as const).map((type) => ({ type }));
  const count: Partial<Record<BlockType, number>> = {};
  return layout.map((item) => {
    const n = (count[item.type] = (count[item.type] ?? 0) + 1);
    const block = { ...sampleBlock(item.type, n === 1 ? `b-${item.type}` : `b-${item.type}-${n}`), ...structuredClone(item) } as Block;
    if (block.type === "location" && template.address && !("address" in item)) return { ...block, address: template.address };
    if (block.type !== "hero") return block;
    // Свои имена и фото обложки шаблона — если структура их не задаёт.
    return {
      ...block,
      ...(template.heroNames && !("names" in item) && { names: template.heroNames }),
      ...(template.heroPhoto && !block.photo && { photo: template.heroPhoto }),
    };
  });
}

/**
 * Все примеры содержимого блока этого типа: общий пример и примеры из структуры шаблонов. По ним видно, что
 * организатор ещё не поменял текст («Что осталось заполнить» в редакторе, lib/checklist.ts).
 */
export function exampleBlocks(type: BlockType): Block[] {
  // Примеры не меняются — собираем один раз на тип (список считается при каждой правке в редакторе).
  return (exampleCache[type] ??= [sampleBlock(type, "example"), ...templates.flatMap((t) => sampleBlocks(t).filter((b) => b.type === type))]);
}
const exampleCache: Partial<Record<BlockType, Block[]>> = {};

/** Шаблон, по которому, судя по теме, оформлено приглашение (шаблон в данных не хранится). */
export const guessTemplate = (theme: Theme) =>
  templates.find((t) => t.theme.palette === theme.palette && t.theme.font === theme.font && t.theme.texture === theme.texture);

const designOf = (block: Block): BlockDesign => designFields(block as unknown as BlockDesign) as BlockDesign;

/**
 * Новый блок для окна «Добавить блок»: пример содержимого (или пресет текста) и оформление — как у блока
 * того же типа в приглашении, иначе как в шаблоне, на который похожа тема, иначе «без оформления».
 */
export function createBlock(data: InvitationData, type: BlockType, presetId?: string): Block {
  const block = sampleBlock(type, newBlockId(type, data.blocks.map((b) => b.id)));
  const same = data.blocks.find((b) => b.type === type);
  const template = guessTemplate(data.theme);
  const n = data.blocks.filter((b) => b.type === type).length;
  const design = structuredClone(same ? designOf(same) : template ? designFor(template, type, n) : plainDesignFor(type));
  const preset = type === "text" ? TEXT_PRESETS.find((p) => p.id === presetId) : undefined;
  const next = { ...block, ...design, ...(preset ? { title: preset.title, icon: preset.icon, text: preset.text } : {}) } as Block;
  return next.type === "dresscode" && template ? { ...next, colors: [...template.dresscodeColors] } : next;
}

/** Новое приглашение по шаблону — с примером текстов (и структурой шаблона, если она есть). */
export function createFromTemplate(template: Template): InvitationData {
  return applyTemplate(
    { schemaVersion: SCHEMA_VERSION, theme: themeOf(template), music: { url: DEFAULT_MUSIC_URL, loop: true }, blocks: sampleBlocks(template) },
    template,
  );
}

/**
 * Применяет оформление шаблона к существующему приглашению и не мутирует исходник.
 * Меняются: тема (кроме фонового фото), вид, фон и его цвет, края, ширина, украшения, появление блоков, цвет и
 * шрифт надписей, цвета дресс-кода. Сохраняются: имена, дата, тексты, программа, фото (и фоновые картинки блоков),
 * музыка, порядок, число блоков, видимость и заголовки.
 */
export function applyTemplate(data: InvitationData, template: Template): InvitationData {
  const seen: Partial<Record<BlockType, number>> = {};
  return {
    ...data,
    theme: { ...themeOf(template), background: data.theme.background },
    blocks: data.blocks.map((block) => {
      const n = (seen[block.type] = (seen[block.type] ?? -1) + 1);
      // Копия: украшения и стили надписей не должны быть общими с константой шаблона.
      const design = structuredClone(designFor(template, block.type, n));
      // designFor даёт вид именно этого типа блока — TypeScript не видит связи через union.
      const next = { ...block, ...design } as Block;
      return next.type === "dresscode" ? { ...next, colors: [...template.dresscodeColors] } : next;
    }),
  };
}
