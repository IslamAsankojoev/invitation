import { createOrnament, newBlockId } from "./blocks";
import { library } from "./library";
import { eventCopy } from "./copy";
import type {
  Block,
  BlockOf,
  BlockType,
  BlockWidth,
  Edge,
  Entrance,
  EventType,
  Headings,
  InvitationData,
  Language,
  Ornament,
  OrnamentPosition,
  Surface,
  TextIcon,
  Theme,
} from "./schema";
import { EVENT_TYPES, LANGUAGES } from "./schema";
import { SCHEMA_VERSION } from "./migrations";
import { DEFAULT_MUSIC_URL } from "./music";
import { DEFAULT_ORNAMENT_MOTION, invitationDataSchema } from "./schema";
import overrides from "./template-overrides.json";
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

/**
 * Блок в структуре шаблона: тип, пример содержимого и оформление (всё, кроме типа, — по желанию). Недостающие поля
 * берутся из примера блока (`sampleBlock`), кроме блоков с `exact` — сохранённых из приглашения в админке: в JSON
 * пустое поле (нет подзаголовка, значка) просто пропадает, и пример вернул бы удалённый текст.
 */
export type LayoutBlock = { [K in BlockType]: { type: K } & Partial<Omit<BlockOf<K>, "type" | "id">> }[BlockType] & { exact?: true };

export type Template = {
  id: string;
  name: string;
  description: string;
  /** Тема; заголовки по умолчанию — капителью. */
  theme: Omit<Theme, "headings" | "ornamentMotion" | "backgroundMode" | "backgroundDim" | "backgroundColor" | "textureStains"> &
    Partial<Pick<Theme, "headings" | "ornamentMotion" | "backgroundMode" | "backgroundDim" | "backgroundColor" | "textureStains">>;
  /** Оформление по типам блоков; незаданное сбрасывается к «классика, без фона, без украшений». */
  blocks: { [K in BlockType]?: Partial<BlockDesign<K>> };
  /** Цвета дресс-кода, подобранные под палитру шаблона. */
  dresscodeColors: string[];
  /** Песня нового приглашения (встроенная, lib/music.ts); нет — DEFAULT_MUSIC_URL. Смена шаблона музыку не трогает. */
  music?: string;
  /** Фрагмент песни и повтор (как music.start/end/loop приглашения); нет — вся песня по кругу. */
  musicFragment?: { start: number; end: number | null; loop: boolean };
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
  /**
   * Хозяева тоя в примере текстов — ровно как в `layout` (на кыргызском — перевод из templateCopyKy). Есть — форма
   * «Главное о событии» спрашивает хозяев и заменяет этот текст (lib/setup.ts).
   */
  hosts?: string;
  /** Адрес в примере «Места» (по умолчанию Бишкек; у казахских пар — Алматы); у структуры `layout` — свой. */
  address?: string;
  /** Для каких событий шаблон (фильтр на главной); первый — тип нового приглашения. Нет — свадьба. */
  events?: EventType[];
  /** Язык примера текстов шаблона (и нового приглашения). Нет — русский. */
  language?: Language;
};

/** События шаблона: первое — тип нового приглашения. */
export const templateEvents = (t: Pick<Template, "events">): EventType[] => (t.events?.length ? t.events : ["wedding"]);

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
/** «Шоколад и сургуч»: кремовые полосы на шоколадном фоне страницы. */
const CREAM = "#ffeddb";
/** «Изумрудная ночь»: светлая бумага с рваными краями между тёмными блоками. */
const PAPER = "#e6dccb";
/** «Этно» (toigokel.kg): бордовые полосы — цвет волны разделителей etno-divider-*, золото надписей на них. */
const BORDO = "#4b0a12";
const ETNO_GOLD = "#c9a063";
/** Бордовые рукописные заголовки на креме, как на toigokel.kg. */
const ETNO_TITLE = { title: { color: "#6d0713" } };
/** «Шырдак»: полосы красного войлока, надписи на них — цвета шерсти. */
const FELT = "#a3201f";
const FELT_CREAM = "#f6eee2";
/** «Ала-Тоо»: светло-небесные полосы с волной. */
const SKY_STRIP = "#e3ecf4";
/** «Бешик»: мятные полосы с фестонами. */
const MINT = "#e4efe6";
/** Анимация украшения «появляется как обычно, но не качается» — для переходов между блоками. */
const STILL = { enter: "auto", enterSpeed: 1, idle: "none", idleSpeed: 1, idleAmplitude: 1 } as const;

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

/** Шаблоны из кода. Правки из админки лежат в template-overrides.json и подменяют их (см. `templates`). */
export const baseTemplates: Template[] = [
  {
    id: "cream-classic",
    address: "г. Алматы, пр. Абая, 1",
    heroNames: "Айгерим & Нурлан",
    name: "Кремовая классика",
    description: "Кремовый шёлк, сухоцветы, бумага ручной работы, бант из бечёвки и лепестки роз.",
    theme: {
      palette: "cream",
      font: "script",
      bodyFont: "auto",
      // Кремовый шёлк на всю страницу, медленно едет при прокрутке.
      background: photo("cream-classic-silk"),
      backgroundMode: "parallax",
      backgroundDim: 0.2,
      texture: "none",
      decor: { type: "confetti", image: lib("petal-red"), color: "#854714", density: 13, size: 1.4, speed: 0.8, pop: false },
      envelope: { ornament: lib("dried-botanical"), style: "seal" },
      motion: { style: "elegant", speed: 1 },
    },
    blocks: {
      hero: {
        variant: "clean",
        ornaments: [
          orn("dried-botanical", "top-right", { size: 200 }),
          orn("dried-botanical", "bottom-left", { size: 180, rotate: 180 }),
        ],
      },
      // Без бумажных фонов: блоки лежат прямо на шёлке фона страницы.
      program: { ornaments: [orn("twine-bow-wide", "top-right", { size: 120, rotate: 8 })] },
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
        variant: "clean",
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
        variant: "clean",
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
        variant: "clean",
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
    description: "Шалфейная зелень, живые ветки, арка, льняные карточки, акварельные пятна и падающие листья.",
    theme: {
      palette: "emerald",
      font: "comforter",
      bodyFont: "spectral",
      background: null,
      texture: "linen",
      decor: { type: "image", image: lib("fall-leaf-birch"), color: "#b9c9ae", density: 10, size: 0.9, speed: 0.8 },
      envelope: { ornament: lib("branch-eucalyptus"), style: "flap" },
      motion: { style: "soft", speed: 1 },
    },
    blocks: {
      hero: {
        variant: "arch",
        ornaments: [
          orn("wc-sage", "top-left", { size: 280, opacity: 0.75 }),
          orn("branch-green", "top-right", { size: 150, rotate: 25 }),
          orn("branch-green", "bottom-left", { size: 140, rotate: -150, flip: true }),
        ],
      },
      countdown: { variant: "circles" },
      calendar: {
        variant: "date",
        surface: "vellum",
        surfaceOpacity: 0.8,
        ornaments: [orn("branch-ash", "right", { size: 110, rotate: -20, opacity: 0.9 })],
      },
      story: {
        variant: "letter",
        ornaments: [
          orn("sprig-two", "right", { size: 120, rotate: -15, opacity: 0.9 }),
          orn("wc-sage", "bottom-left", { size: 220, opacity: 0.6 }),
        ],
      },
      program: { variant: "icons", surface: "card", surfaceOpacity: 0.7 },
      dresscode: { variant: "stripes", ornaments: [orn("branch-vine", "top-right", { size: 110, rotate: 20, opacity: 0.85 })] },
      location: { surface: "card", surfaceOpacity: 0.7, ornaments: [orn("branch-green", "top-left", { size: 110, rotate: -30 })] },
      rsvp: {
        surface: "vellum",
        surfaceOpacity: 0.8,
        ornaments: [
          orn("sprig-three", "top-right", { size: 120, rotate: -40 }),
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
        variant: "clean",
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
    description: "Шоколадный фон, кремовые полосы с рваными краями, монограмма, сухоцветы, шёлк, галерея и золотая сургучная печать.",
    theme: {
      palette: "mocha",
      font: "marck",
      bodyFont: "cormorant",
      headings: "caps",
      background: null,
      backgroundColor: "#2b1f18",
      texture: "plaster",
      decor: { type: "none", image: null, color: "#d8c7ae", density: 0, size: 1, speed: 1 },
      envelope: { ornament: lib("dried-botanical"), style: "seal" },
      motion: { style: "elegant", speed: 1 },
    },
    blocks: {},
    dresscodeColors: ["#f5f1ea", "#dccbb3", "#a88f73", "#6b5241", "#7f7a4c"],
    layout: [
      {
        type: "hero",
        variant: "monogram",
        names: "Санжар & Мадина",
        date: "2027-08-21T16:00",
        label: undefined,
        subtitle: "Бишкек",
        photo: photo("mocha-dried"),
        bgColor: CREAM,
        edgeBottom: "torn",
        edgeBottomSeed: 599629648,
      },
      {
        type: "text",
        title: "",
        scriptLine: "Добро пожаловать!",
        icon: undefined,
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
        variant: "cards",
        title: "Программа дня",
        bgColor: CREAM,
        width: "full",
        edgeTop: "torn",
        edgeTopSeed: 1884421244,
        edgeBottom: "torn",
        edgeBottomSeed: 624395101,
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
        width: "full",
        placeName: "Усадьба «Вдохновение»",
        address: "Чуйская обл., Аламединский район",
        mapUrl: "https://yandex.ru/maps/?text=Истра",
        photo: null,
      },
      {
        type: "photo",
        photo: photo("mocha-seal"),
        height: "square",
        edgeTop: "torn",
        edgeTopSeed: 1977074179,
        edgeBottom: "torn",
        edgeBottomSeed: 2115800448,
      },
      {
        type: "dresscode",
        title: "Дресс-код",
        width: "full",
        text: "Мы будем рады, если вы поддержите цветовую палитру нашей свадьбы своими нарядами.",
        colors: [],
      },
      {
        type: "text",
        variant: "card",
        title: "",
        icon: undefined,
        bgImage: photo("mocha-silk"),
        bgDim: 0.1,
        edgeTop: "torn",
        edgeTopSeed: 2004102492,
        edgeBottom: "torn",
        edgeBottomSeed: 570322576,
        text: "Любовь — это когда чьё-то счастье важнее своего.",
      },
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
        bgColor: CREAM,
        width: "full",
        edgeTop: "torn",
        edgeTopSeed: 34024365,
        edgeBottom: "torn",
        edgeBottomSeed: 1118887877,
        deadline: "2027-07-01",
        ornaments: [orn("wax-seal", "top-right", { size: 96, rotate: -14 })],
      },
      { type: "text", title: "", scriptLine: "Мы ждём вас!", icon: undefined, text: "С любовью,\nСанжар и Мадина" },
      { type: "photo", photo: photo("mocha-tuscany"), height: "square", edgeTop: "torn", edgeTopSeed: 1538669748 },
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
        text: "С любовью,\nАйбек и Айсулуу",
      },
    ],
  },
  {
    id: "emerald-night",
    name: "Изумрудная ночь",
    description: "Тёмный изумруд и золото, фото пары у арочного окна, гирлянды белых цветов на стыках, светлая бумага с рваными краями.",
    hosts: "Рустам и Гульнара Асановы\nМарат и Бермет Токтогуловы",
    theme: {
      palette: "forest",
      font: "serif",
      bodyFont: "manrope",
      headings: "names",
      background: null,
      texture: "paper",
      backgroundColor: "#04110a",
      decor: { type: "none", image: null, color: "#f3eee4", density: 0, size: 1, speed: 1 },
      envelope: { ornament: lib("roses-white-spray"), style: "veil" },
      motion: { style: "elegant", speed: 1 },
    },
    blocks: {},
    dresscodeColors: ["#1c3a30", "#2f6b58", "#e3d3b0", "#c9a862", "#f3eee4"],
    music: "/music/howl-s-moving-castle.mp3",
    layout: [
      {
        type: "hero",
        variant: "clean",
        names: "Руслан & Айдана",
        date: "2027-08-28T17:00",
        label: "Бишкек · Изумрудная роща",
        subtitle: undefined,
        photo: photo("emerald-hero-forest"),
      },
      {
        type: "text",
        title: "Дорогие родные и близкие!",
        icon: undefined,
        width: "full",
        // Переходы между блоками — украшения с seam: гирлянда ложится на стык с фото обложки.
        ornaments: [orn("garland-dogrose", "top", { size: 400, opacity: 1, flip: true, seam: true, motion: STILL })],
        textStyles: { title: { font: "yeseva" }, text: { font: "alegreya" } },
        text: "В нашей жизни наступает особенный день — мы создаём семью. Разделить эту радость мы хотим с самыми дорогими людьми, которые всегда рядом.",
      },
      { type: "calendar", title: "", width: "full" },
      {
        type: "text",
        title: "",
        scriptLine: "Мы будем рады видеть Вас в кругу наших гостей",
        icon: undefined,
        width: "full",
        textStyles: { text: { font: "literata" } },
        ornaments: [orn("branch-fern", "bottom-right", { size: 90, rotate: 150, opacity: 0.55 })],
        text: "С любовью, родители\nРустам и Гульнара Асановы\nМарат и Бермет Токтогуловы",
      },
      {
        type: "program",
        title: "Timing",
        scriptLine: "Программа торжества",
        bgColor: PAPER,
        width: "full",
        edgeTop: "torn",
        edgeTopSeed: 77140,
        edgeBottom: "torn",
        edgeBottomSeed: 903311,
        textStyles: { time: { font: "forum" }, itemTitle: { font: "yeseva" }, itemDescription: { font: "serif" } },
        items: [
          { time: "16:00", title: "Сбор гостей", description: "Встреча у входа в усадьбу, приветственные напитки и лёгкие закуски." },
          { time: "17:00", title: "Церемония", description: "Торжественная церемония бракосочетания в саду." },
          { time: "17:45", title: "Фотосъёмка", description: "Общие фотографии с молодожёнами на территории усадьбы." },
          { time: "18:30", title: "Начало банкета", description: "Приветственные слова, первый тост и праздничный ужин." },
          { time: "20:00", title: "Первый танец", description: "Свадебный танец и вечерняя программа с музыкой." },
          { time: "23:00", title: "Завершение вечера", description: "Прощальный салют и тёплые слова на дорогу." },
        ],
      },
      // Белые розы на стыке бумаги и тёмного блока.
      {
        type: "dresscode",
        title: "Dress code",
        scriptLine: "Внешний вид",
        ornaments: [orn("roses-white-spray", "top", { size: 267, opacity: 1, seam: true, motion: STILL })],
        textStyles: { text: { font: "serif" } },
        text: "Будем признательны, если в своих нарядах вы поддержите цветовую гамму нашего вечера: тёмные изумрудные, тёплые бежевые и золотые оттенки. Просим воздержаться от ярко-белых нарядов — этот цвет оставим невесте.",
        colors: [],
      },
      {
        type: "location",
        title: "Location",
        scriptLine: "Место проведения",
        textStyles: { placeName: { font: "kurale" }, address: { font: "alegreya" } },
        placeName: "Усадьба «Изумрудная роща»",
        address: "Чуйская область, с. Ново-Павловка, ул. Садовая, 12 · 25 минут от Бишкека",
        mapUrl: "https://2gis.kg/bishkek",
        photo: photo("emerald-venue-garden"),
        ornaments: [orn("branch-fern", "bottom-left", { size: 90, rotate: -150, opacity: 0.5 })],
      },
      {
        type: "text",
        title: "Details",
        scriptLine: "Наши пожелания",
        icon: undefined,
        bgColor: PAPER,
        width: "full",
        edgeTop: "torn",
        edgeTopSeed: 615027,
        edgeBottom: "torn",
        edgeBottomSeed: 230558,
        textStyles: { text: { font: "eb-garamond" } },
        text: "Ваше присутствие в этот день — самый ценный подарок для нас. Если вы хотите порадовать нас ещё и материально, будем благодарны за вклад в наше свадебное путешествие.\n\nВместо цветов с радостью примем бутылку хорошего вина — откроем её вместе в наш первый юбилей.",
      },
      {
        type: "rsvp",
        title: "Questionnaire",
        scriptLine: "Анкета гостя",
        ornaments: [orn("roses-white-spray", "top", { size: 387, opacity: 1, flip: true, seam: true, motion: STILL })],
        deadline: "2027-08-01",
      },
      {
        type: "countdown",
        title: "Ждём Вас!",
        scriptLine: "Руслан & Айдана",
        bgColor: PAPER,
        width: "full",
        edgeTop: "torn",
        edgeTopSeed: 351904,
        ornaments: [
          orn("roses-white-spray", "bottom-left", { size: 150, rotate: 8 }),
          orn("roses-white-spray", "bottom-right", { size: 150, rotate: -8, flip: true }),
          orn("garland-dogrose", "bottom", { size: 400, opacity: 1, seam: true, motion: STILL }),
        ],
      },
    ],
  },
  {
    id: "etno",
    name: "Этно",
    description:
      "Бордо и золото, юрта и горы на обложке, кыргызский узор, видео-конверт с сургучом, волны-переходы и анкета с тремя ответами.",
    hosts: "Нурбек и Венера",
    theme: {
      palette: "burgundy",
      font: "script",
      bodyFont: "cormorant",
      headings: "names",
      background: null,
      texture: "none",
      decor: { type: "none", image: null, color: "#c9a063", density: 0, size: 1, speed: 1 },
      envelope: { ornament: lib("etno-corner"), style: "video", video: "/templates/etno-envelope.mp4", poster: photo("etno-envelope") },
      motion: { style: "elegant", speed: 1 },
    },
    blocks: {},
    dresscodeColors: ["#4b0a12", "#6d0713", "#c9a063", "#efe3cf", "#fbf2e4"],
    music: "/music/erke-sary.mp3",
    layout: [
      { type: "hero", variant: "scene", names: "Азамат & Бегайым", date: "2027-10-19T16:00", label: "Свадьба", subtitle: undefined, photo: photo("etno-hero") },
      {
        type: "text",
        title: "Дорогие наши уважаемые гости!",
        icon: undefined,
        textStyles: ETNO_TITLE,
        ornaments: [
          orn("etno-corner", "top-left", { size: 96, opacity: 1 }),
          orn("etno-corner", "top-right", { size: 96, opacity: 1, flip: true }),
        ],
        // Без имён молодых: в падеже («Азамата») их не заменить именами из формы — имена и так на обложке.
        text: "Приглашаем вас отведать угощения за праздничным дасторханом в честь наших детей — стать нашими дорогими гостями на их свадьбе, дать своё благословение и разделить с нами этот важный день!\n\nДля нас будет большой честью вместе с вами стать свидетелями счастья молодых и разделить нашу радость.",
      },
      {
        type: "text",
        // Подпись хозяев — крупно от руки (заголовок), «с уважением» — капителью под ней.
        title: "Нурбек и Венера",
        scriptLine: "С уважением, хозяева торжества",
        icon: undefined,
        text: "",
      },
      { type: "calendar", variant: "week", title: "", surface: "card-etno" },
      {
        type: "photo",
        photo: photo("etno-hands"),
        caption: undefined,
        height: "square",
        width: "content",
        // Кремовая волна сверху ложится на фото, бордовая (у отсчёта) — снизу.
        ornaments: [orn("etno-divider-cream", "top", { size: 400, opacity: 1, seam: true, motion: STILL })],
      },
      {
        type: "countdown",
        title: "Осталось",
        scriptLine: "До события",
        bgColor: BORDO,
        textStyles: { title: { color: ETNO_GOLD } },
        ornaments: [orn("etno-divider-burgundy", "top", { size: 400, opacity: 1, seam: true, motion: STILL })],
      },
      {
        type: "location",
        title: "Ждём вас здесь",
        scriptLine: "Место встречи",
        textStyles: ETNO_TITLE,
        placeName: "Банкетный зал «Аяр»",
        address: "г. Бишкек, ул. Фрунзе, 133",
        mapUrl: "https://go.2gis.com/F1MTV",
        photo: photo("etno-venue"),
      },
      {
        type: "rsvp",
        variant: "choices",
        title: "Будете с нами?",
        scriptLine: "Пожалуйста, подтвердите присутствие",
        bgColor: BORDO,
        textStyles: { title: { color: ETNO_GOLD } },
        ornaments: [orn("etno-divider-burgundy", "top", { size: 400, opacity: 1, seam: true, motion: STILL })],
        deadline: undefined,
      },
      {
        type: "text",
        title: "С нетерпением ждём вас!",
        scriptLine: "До встречи",
        icon: undefined,
        bgImage: photo("etno-rings"),
        bgDim: 0,
        bgDarken: 0.5,
        textStyles: { title: { color: "#fbf2e4" } },
        text: "Ваше присутствие — самый ценный подарок для нас.",
        // Бордовая волна сверху свисает на фото (картинка перевёрнута: прямой край — на стыке).
        ornaments: [orn("etno-divider-burgundy", "top", { size: 400, opacity: 1, rotate: 180, seam: true, motion: STILL })],
      },
    ],
  },
  // ---------- Кыргызские шаблоны (2.5.0): свои векторные узоры, тексты — из примеров события (lib/copy.ts) ----------
  {
    id: "shyrdak",
    name: "Шырдак",
    description:
      "Красный войлок и кремовая шерсть: рога кочкор мүйүз в углах, полосы шырдака, зигзаг по краям. Для кыз узатуу и свадьбы.",
    events: ["kyz-uzatuu", "wedding"],
    theme: {
      palette: "felt",
      font: "yeseva",
      bodyFont: "cormorant",
      headings: "caps",
      background: null,
      texture: "paper",
      decor: { type: "none", image: null, color: "#a3201f", density: 0, size: 1, speed: 1 },
      envelope: { ornament: lib("kochkor-corner"), style: "seal" },
      motion: { style: "elegant", speed: 1 },
    },
    blocks: {},
    dresscodeColors: ["#a3201f", "#6e1414", "#c9a063", "#efe3cf", "#2c3a5a"],
    music: "/music/erke-sary.mp3",
    layout: [
      {
        type: "hero",
        variant: "classic",
        date: "2027-09-04T17:00",
        ornaments: [
          orn("kochkor-corner", "top-left", { size: 130 }),
          orn("kochkor-corner", "top-right", { size: 130, flip: true }),
          orn("kochkor-corner", "bottom-left", { size: 130, rotate: 180, flip: true }),
          orn("kochkor-corner", "bottom-right", { size: 130, rotate: 180 }),
        ],
      },
      { type: "story", ornaments: [orn("shyrdak-band", "bottom", { size: 300, motion: STILL })] },
      {
        type: "countdown",
        bgColor: FELT,
        edgeTop: "zigzag",
        edgeBottom: "zigzag",
        textStyles: { title: { color: FELT_CREAM } },
      },
      { type: "calendar", variant: "classic" },
      { type: "program", variant: "cards", ornaments: [orn("shyrdak-band", "top", { size: 300, motion: STILL })] },
      { type: "dresscode", variant: "chips" },
      { type: "location", ornaments: [orn("kochkor-corner", "bottom-left", { size: 110, rotate: 180, flip: true })] },
      {
        type: "rsvp",
        variant: "choices",
        bgColor: FELT,
        edgeTop: "zigzag",
        textStyles: { title: { color: FELT_CREAM }, scriptLine: { color: FELT_CREAM } },
      },
    ],
  },
  {
    id: "ala-too",
    name: "Ала-Тоо",
    description: "Белые вершины и небесная синева: линия гор, ала-кийиз и чистые карточки. Для дня рождения, юбилея и кыз узатуу.",
    events: ["birthday", "jubilee", "kyz-uzatuu"],
    theme: {
      palette: "sky",
      font: "philosopher",
      bodyFont: "raleway",
      headings: "caps",
      background: null,
      texture: "none",
      decor: { type: "snow", image: null, color: "#ffffff", density: 8, size: 0.8, speed: 0.6 },
      envelope: { ornament: lib("ala-too"), style: "veil" },
      motion: { style: "soft", speed: 1 },
    },
    blocks: {},
    dresscodeColors: ["#ffffff", "#dfe9f2", "#8fb3d6", "#2f6ea5", "#1d2f45"],
    music: "/music/ozgocho-kun.mp3",
    layout: [
      {
        type: "hero",
        variant: "minimal",
        date: "2027-08-14T18:00",
        ornaments: [orn("ala-too", "bottom", { size: 400, opacity: 0.9, motion: STILL })],
      },
      { type: "countdown", variant: "circles" },
      {
        type: "story",
        bgColor: SKY_STRIP,
        edgeTop: "wave",
        edgeBottom: "wave",
        ornaments: [orn("ala-kiyiz", "bottom", { size: 260, motion: STILL })],
      },
      { type: "calendar", variant: "tearoff" },
      { type: "program", variant: "cards" },
      { type: "location", variant: "minimal", ornaments: [orn("ala-too", "bottom", { size: 400, opacity: 0.6, motion: STILL })] },
      { type: "rsvp", bgColor: SKY_STRIP, edgeTop: "wave" },
    ],
  },
  {
    id: "tunduk",
    name: "Түндүк",
    description: "Золото на тёмном: венец юрты с лучами, золотые полосы шырдака и письмо с историей. Для юбилея и свадьбы.",
    events: ["jubilee", "wedding"],
    theme: {
      palette: "tunduk",
      font: "prata",
      bodyFont: "cormorant",
      headings: "caps",
      background: null,
      texture: "none",
      decor: { type: "none", image: null, color: "#d1a656", density: 0, size: 1, speed: 1 },
      envelope: { ornament: lib("kochkor-corner-gold"), style: "seal" },
      motion: { style: "cinematic", speed: 1 },
    },
    blocks: {},
    dresscodeColors: ["#16110d", "#5a3d22", "#d1a656", "#efe4cf", "#7a1c1c"],
    layout: [
      {
        type: "hero",
        variant: "classic",
        date: "2027-10-02T18:00",
        // Түндүк — крупно и едва заметно за именами, как водяной знак.
        ornaments: [orn("tunduk", "center", { size: 340, opacity: 0.14, motion: STILL })],
      },
      { type: "story", variant: "letter" },
      { type: "countdown", ornaments: [orn("shyrdak-band-gold", "top", { size: 280, motion: STILL })] },
      { type: "calendar", variant: "date" },
      { type: "program" },
      { type: "dresscode", variant: "stripes" },
      { type: "location", variant: "postcard" },
      { type: "rsvp", variant: "choices", ornaments: [orn("shyrdak-band-gold", "top", { size: 280, motion: STILL })] },
    ],
  },
  {
    id: "beshik",
    name: "Бешик",
    description: "Мятный и абрикосовый, рукописные заголовки и мягкий войлок ала-кийиз. Для бешик тоя, тушоо кесүү и сүннөт тоя.",
    events: ["beshik-toi", "tushoo-kesuu", "sunnet-toi", "birthday"],
    theme: {
      palette: "beshik",
      font: "caveat",
      bodyFont: "manrope",
      headings: "names",
      background: null,
      texture: "speckle",
      decor: { type: "confetti", image: null, color: "#cf8a5f", density: 10, size: 0.8, speed: 0.6 },
      envelope: { ornament: lib("ala-kiyiz"), style: "flap" },
      motion: { style: "playful", speed: 1 },
    },
    blocks: {},
    dresscodeColors: ["#f5f7f1", "#cfe3d4", "#f2c9a8", "#cf8a5f", "#3e4a44"],
    layout: [
      {
        type: "hero",
        variant: "classic",
        date: "2027-07-10T12:00",
        ornaments: [orn("ala-kiyiz", "bottom", { size: 280, motion: STILL })],
      },
      { type: "story", bgColor: MINT, edgeTop: "scallop", edgeBottom: "scallop" },
      { type: "countdown", variant: "circles" },
      { type: "calendar", variant: "week" },
      { type: "program", variant: "cards" },
      { type: "location", ornaments: [orn("ala-kiyiz", "bottom", { size: 220, motion: STILL })] },
      { type: "rsvp", variant: "compact", bgColor: MINT, edgeTop: "scallop" },
    ],
  },
  {
    id: "neon",
    name: "Неон",
    description: "Чёрный клуб и кислотный лайм: билет на вечеринку, перекидные часы, конфетти. Для вечеринок и дня рождения.",
    events: ["party", "birthday"],
    theme: {
      palette: "neon",
      font: "lobster",
      bodyFont: "montserrat",
      headings: "caps",
      background: null,
      texture: "grid",
      decor: { type: "confetti", image: null, color: "#c6ff00", density: 18, size: 1, speed: 1.2 },
      envelope: { ornament: null, style: "seal" },
      motion: { style: "playful", speed: 1.2 },
    },
    blocks: {},
    dresscodeColors: ["#07050d", "#c6ff00", "#ff2bd6", "#7b5cff", "#f4f1ff"],
    layout: [
      { type: "hero", variant: "ticket", date: "2027-11-06T22:00" },
      { type: "countdown", variant: "cards" },
      { type: "program", variant: "cards" },
      { type: "dresscode", variant: "chips" },
      { type: "location", variant: "minimal" },
      { type: "rsvp", variant: "compact" },
    ],
  },
];

/**
 * Правки шаблонов из скрытой админки (/admin, только локально): `edited` — шаблон из кода целиком заменён своей
 * версией, `added` — новые шаблоны (копии). Файл пишет lib/adminFiles.ts, руками не править.
 */
export type TemplateOverrides = {
  edited: Record<string, Template>;
  added: Template[];
  /** Порядок шаблонов (id) — перетаскиванием в админке; нет — как в коде, новые в конце. */
  order?: string[];
  /** Не опубликованы (id): видны только в админке и скрытом показе — не на главной и не в выборе шаблона. */
  hidden?: string[];
};

/** Опубликованные шаблоны (без скрытых в админке). */
export const publishedTemplates = <T extends { id: string }>(list: T[], hidden: string[] | undefined): T[] =>
  hidden?.length ? list.filter((t) => !hidden.includes(t.id)) : list;

/**
 * Шаблоны в заданном порядке: перечисленные в `order` — по нему, остальные (новые, ещё не расставленные) — после них,
 * в своём порядке. Неизвестные id в `order` пропускаются.
 */
export function orderTemplates<T extends { id: string }>(list: T[], order: string[] | undefined): T[] {
  if (!order?.length) return list;
  const rank = new Map(order.map((id, i) => [id, i]));
  const at = (t: T) => rank.get(t.id) ?? order.length;
  return list.map((t, i) => ({ t, i })).sort((a, b) => at(a.t) - at(b.t) || a.i - b.i).map(({ t }) => t);
}

/** Шаблон из файла правок годится, если из него собирается приглашение, проходящее схему. */
const usable = (t: Template) => {
  try {
    return invitationDataSchema.safeParse(createFromTemplate(t)).success;
  } catch {
    return false;
  }
};

/** Шаблоны с правками из админки; битую правку пропускаем (остаётся шаблон из кода), а не роняем сайт. */
export function mergeTemplates(base: Template[], overrides: TemplateOverrides): Template[] {
  const checked = (t: Template | undefined) => {
    if (t && !usable(t)) console.error(`template-overrides.json: шаблон «${t.id}» не проходит схему — пропущен`);
    return t && usable(t) ? t : undefined;
  };
  const ids = new Set(base.map((t) => t.id));
  return orderTemplates(
    [...base.map((t) => checked(overrides.edited[t.id]) ?? t), ...overrides.added.filter((t) => !ids.has(t.id) && checked(t))],
    overrides.order,
  );
}


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
  backgroundMode: "stretch",
  backgroundDim: 0.7,
  // Свой цвет фона — оформление: шаблон ставит цвет своей палитры (applyTemplate его сбрасывает).
  backgroundColor: null,
  textureStains: false,
  ornamentMotion: { ...DEFAULT_ORNAMENT_MOTION },
  ...structuredClone(template.theme),
});

type TextPreset = { id: string; title: string; icon: TextIcon; text: string; ky: { title: string; text: string } };

/** Готовые варианты блока «Текст» в окне «Добавить блок»; `ky` — тот же текст для кыргызского приглашения. */
export const TEXT_PRESETS: TextPreset[] = [
  {
    id: "welcome",
    title: "Дорогие гости",
    icon: "heart",
    text: "Мы рады пригласить вас на нашу свадьбу! Этот день станет для нас особенным, и мы хотим провести его с самыми близкими людьми.",
    ky: {
      title: "Урматтуу коноктор",
      text: "Сиздерди тоюбузга чакырганыбызга кубанычтабыз! Бул күн биз үчүн өзгөчө, аны эң жакын адамдарыбыз менен өткөргүбүз келет.",
    },
  },
  {
    id: "wishes",
    title: "Пожелания",
    icon: "flower",
    text: "Пожалуйста, не дарите нам цветы — букеты быстро завянут. Будем рады бутылочке вашего любимого вина: откроем её на годовщину.",
    ky: {
      title: "Каалоолор",
      text: "Сураныч, гүл алып келбеңиздер — гүлдесте тез соолуп калат. Анын ордуна жылуу каалоолоруңузду жазып келсеңиздер кубанабыз.",
    },
  },
  {
    id: "gifts",
    title: "Подарки",
    icon: "gift",
    text: "Ваше присутствие — лучший подарок. Если хотите порадовать нас ещё, будем благодарны за вклад в наше свадебное путешествие.",
    ky: {
      title: "Белектер",
      text: "Сиздердин келишиңиздер — эң жакшы белек. Дагы кубантким келсе, саякатыбызга кошкон салымыңыз үчүн ыраазы болобуз.",
    },
  },
  {
    id: "adults",
    title: "Только взрослые",
    icon: "child",
    text: "Мы очень любим ваших детей, но этот вечер хотим провести во взрослой компании. Спасибо за понимание!",
    ky: {
      title: "Чоңдор үчүн",
      text: "Балдарыңыздарды абдан жакшы көрөбүз, бирок бул кечти чоңдордун чөйрөсүндө өткөргүбүз келет. Түшүнгөнүңүздөр үчүн рахмат!",
    },
  },
  {
    id: "details",
    title: "Детали",
    icon: "info",
    text: "У ресторана есть бесплатная парковка. После 23:00 для гостей будет трансфер до центра города.",
    ky: {
      title: "Майда-чүйдөсү",
      text: "Ресторандын жанында акысыз унаа токтоочу жай бар. Саат 23:00дөн кийин коноктор үчүн шаардын борборуна чейин трансфер болот.",
    },
  },
];

/** Пресет на языке приглашения. */
export const textPreset = (preset: TextPreset, lang: Language = "ru") =>
  lang === "ky" ? { id: preset.id, icon: preset.icon, ...preset.ky } : { id: preset.id, icon: preset.icon, title: preset.title, text: preset.text };

/** id скрытого описания шаблона — им карточка шаблона подписывает свою кнопку или ссылку (aria-describedby). */
export const templateDescriptionId = (template: Template) => `tpl-${template.id}-desc`;

/**
 * Пример содержимого блока каждого типа: им заполняются новое приглашение и новый блок в редакторе. Тексты — по типу
 * события и языку (lib/copy.ts).
 */
function sampleBlock(type: BlockType, id: string, eventType: EventType = "wedding", lang: Language = "ru"): Block {
  const copy = eventCopy[eventType][lang];
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
        variant: "clean",
        names: copy.names,
        date: "2027-06-19T16:00",
        label: copy.label,
        subtitle: copy.subtitle,
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
        text: copy.story,
        photo: null,
      };
    case "program":
      return {
        type,
        ...base,
        items: copy.program.map((item) => ({ ...item })),
      };
    case "dresscode":
      return { type, ...base, text: copy.dresscode, colors: [] };
    case "location":
      return lang === "ky"
        ? { type, ...base, placeName: "«Сад» ресторану", address: "Бишкек ш., Киев көчөсү, 1", photo: null }
        : { type, ...base, placeName: "Ресторан «Сад»", address: "г. Бишкек, ул. Киевская, 1", photo: null };
    case "rsvp":
      return { type, ...base, title: copy.rsvpTitle, scriptLine: copy.rsvpScript };
    case "text": {
      const preset = textPreset(TEXT_PRESETS[1], lang);
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
        ...(lang === "ky"
          ? { title: "Суроолоруңуз барбы?", text: "Чалыңыз же жазыңыз — кубаныч менен жардам беребиз." }
          : { title: "Остались вопросы?", text: "Звоните или пишите — с радостью подскажем." }),
        people: [{ name: "Айгерим", role: lang === "ky" ? "Уюштуруучу" : "Организатор", phone: "+996 555 000 000", whatsapp: true, telegram: "" }],
      };
  }
}

/** Пример содержимого блока для события и языка — им localize.ts заменяет нетронутые примеры. */
export const sampleContent = (type: BlockType, eventType: EventType, lang: Language): Block => sampleBlock(type, "sample", eventType, lang);

/** Блоки нового приглашения. Id стабильные («b-<тип>», повторы — «b-<тип>-2», как у старых приглашений). */
function sampleBlocks(template: Template): Block[] {
  const eventType = templateEvents(template)[0];
  const lang = template.language ?? "ru";
  const layout: LayoutBlock[] = template.layout ?? (["hero", "countdown", "calendar", "story", "program", "dresscode", "location", "rsvp"] as const).map((type) => ({ type }));
  const count: Partial<Record<BlockType, number>> = {};
  return layout.map(({ exact, ...item }) => {
    const n = (count[item.type] = (count[item.type] ?? 0) + 1);
    const id = n === 1 ? `b-${item.type}` : `b-${item.type}-${n}`;
    // Целый блок (из админки) — как есть; остальные дополняются примером содержимого.
    const block = (exact ? { id, ...structuredClone(item) } : { ...sampleBlock(item.type, id, eventType, lang), ...structuredClone(item) }) as Block;
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
  return (exampleCache[type] ??= [
    ...EVENT_TYPES.flatMap((e) => LANGUAGES.map((l) => sampleBlock(type, "example", e, l))),
    ...allTemplates.flatMap((t) => sampleBlocks(t).filter((b) => b.type === type)),
  ]);
}
const exampleCache: Partial<Record<BlockType, Block[]>> = {};

/** Шаблон, по которому, судя по теме, оформлено приглашение (шаблон в данных не хранится). */
export const guessTemplate = (theme: Theme) =>
  allTemplates.find((t) => t.theme.palette === theme.palette && t.theme.font === theme.font && t.theme.texture === theme.texture);

const designOf = (block: Block): BlockDesign => designFields(block as unknown as BlockDesign) as BlockDesign;

/**
 * Новый блок для окна «Добавить блок»: пример содержимого (или пресет текста) и оформление — как у блока
 * того же типа в приглашении, иначе как в шаблоне, на который похожа тема, иначе «без оформления».
 */
export function createBlock(data: InvitationData, type: BlockType, presetId?: string): Block {
  const block = sampleBlock(type, newBlockId(type, data.blocks.map((b) => b.id)), data.eventType, data.language);
  const same = data.blocks.find((b) => b.type === type);
  const template = guessTemplate(data.theme);
  const n = data.blocks.filter((b) => b.type === type).length;
  const design = structuredClone(same ? designOf(same) : template ? designFor(template, type, n) : plainDesignFor(type));
  const found = type === "text" ? TEXT_PRESETS.find((p) => p.id === presetId) : undefined;
  const preset = found && textPreset(found, data.language);
  const next = { ...block, ...design, ...(preset ? { title: preset.title, icon: preset.icon, text: preset.text } : {}) } as Block;
  return next.type === "dresscode" && template ? { ...next, colors: [...template.dresscodeColors] } : next;
}

/** Новое приглашение по шаблону — с примером текстов (и структурой шаблона, если она есть). */
export function createFromTemplate(template: Template): InvitationData {
  return applyTemplate(
    {
      schemaVersion: SCHEMA_VERSION,
      eventType: templateEvents(template)[0],
      language: template.language ?? "ru",
      theme: themeOf(template),
      music: { url: template.music ?? DEFAULT_MUSIC_URL, loop: true, start: 0, end: null, ...template.musicFragment },
      blocks: sampleBlocks(template),
    },
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
    // Фоновое фото страницы — содержимое, как фото блоков: шаблон его не трогает (и как оно ведёт себя — тоже).
    theme: {
      ...themeOf(template),
      background: data.theme.background,
      backgroundMode: data.theme.backgroundMode,
      backgroundDim: data.theme.backgroundDim,
    },
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

// В конце файла: проверка правок собирает приглашения функциями выше (const-функции до объявления ещё не готовы).
/** Все шаблоны, и скрытые (админка, скрытый показ, демо в seed). */
export const allTemplates: Template[] = mergeTemplates(baseTemplates, overrides as unknown as TemplateOverrides);
/** Опубликованные — то, что видят люди: главная, выбор шаблона в редакторе, создание приглашения. */
export const templates: Template[] = publishedTemplates(allTemplates, (overrides as unknown as TemplateOverrides).hidden);

/** Любой шаблон, и скрытый (показ, правка в админке); создать приглашение можно только из опубликованного. */
export const findTemplate = (id: string) => allTemplates.find((t) => t.id === id);
export const findPublishedTemplate = (id: string) => templates.find((t) => t.id === id);
