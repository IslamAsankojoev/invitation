import { INITIAL_SCHEMA_VERSION, migrateInvitation, SEMVER } from "./migrations";
import { z } from "zod";

export const hexColor = z.string().regex(/^#[0-9a-fA-F]{6}$/, "Цвет должен быть в формате #RRGGBB");

/** Дата и время события без часового пояса: "YYYY-MM-DDTHH:mm" (как в <input type="datetime-local">). */
export const localDateTime = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2})?$/, "Неверный формат даты")
  .refine((s) => !Number.isNaN(new Date(s).getTime()), "Неверная дата");

const localDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Неверный формат даты");

/** URL картинки: файл из библиотеки (/library/…) или загруженный (/uploads/…, позже — S3). */
const imageUrl = z.string().min(1).max(500);

export const PALETTES = ["cream", "blush", "emerald", "ivory", "autumn", "night", "lavender", "noir", "navy", "mocha", "pearl", "sand"] as const;
/** Шрифт имён и акцентных надписей. Первые три — исходные ключи, их значения не меняются. */
export const FONTS = [
  "script",
  "serif",
  "sans",
  "marck",
  "bad-script",
  "caveat",
  "lobster",
  "pacifico",
  "amatic",
  "playfair",
  "prata",
  "forum",
  "yeseva",
  "cormorant-sc",
  "oranienbaum",
  "poiret",
  "comfortaa",
  "comforter",
  "comforter-brush",
  "alice",
  "kurale",
  "philosopher",
  "ruslan",
  "cormorant-unicase",
  "cormorant-infant",
  "playfair-sc",
  "gabriela",
  "pattaya",
  "bellota",
] as const;
/** Шрифт основного текста; "auto" — подобрать под шрифт имён (так вели себя приглашения до этой настройки). */
export const BODY_FONTS = [
  "auto",
  "cormorant",
  "lora",
  "eb-garamond",
  "playfair",
  "old-standard",
  "pt-serif",
  "montserrat",
  "raleway",
  "manrope",
  "inter",
  "literata",
  "spectral",
  "vollkorn",
  "alegreya",
  "jost",
  "arsenal",
] as const;
export const DECOR_TYPES = ["none", "image", "petals", "sakura", "confetti", "snow"] as const;
export const TEXTURES = [
  "none",
  "halftone",
  "speckle",
  "grain",
  "linen",
  "grid",
  "diagonal",
  "hearts",
  "diamonds",
  "flourish",
  "stars",
  "watercolor",
] as const;
/** Фоны блока: бумага и предметы, на которых лежит текст. Порядок — порядок плиток в редакторе. */
export const SURFACES = [
  "plain",
  "paper",
  "card",
  "vellum",
  "crumpled",
  // Листы и свитки
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
  // Стикеры и записки
  "sticker-yellow",
  "sticker-clip",
  "sticker-pin",
  "sticker-pink",
  "sticker-orange",
  "sticker-tape",
  "note-burlap",
  "fabric-lilac",
  "label-lilac",
  // Карточки и билеты
  "card-clematis",
  "label-vintage",
  "ticket-admit",
  "ticket-gold",
  "ticket-pink",
  "ticket-stubs",
  // Рамы
  "frame",
  "frame-gold",
  "frame-baroque",
  "frame-filigree",
  "frame-roses",
  // Тарелки, салфетки, венки
  "plate",
  "plate-roses",
  "doily-paper",
  "doily-kraft",
  "doily-lace",
  "doily-pink",
  "wreath-garden",
  "wreath-blue",
  "wreath-peony",
] as const;
export const LEGACY_SURFACES: Record<string, (typeof SURFACES)[number]> = {
  torn: "paper",
  kraft: "paper",
  fabric: "card",
  marble: "card",
  // Пробные фактуры (сентябрь 2026), убраны до релиза — на случай, если успели сохраниться.
  cotton: "paper",
  parchment: "paper",
  plaster: "paper",
  relief: "paper",
  wash: "card",
  ebru: "card",
  travertine: "card",
  onyx: "card",
  "black-marble": "card",
};

/** Виды (вёрстка) каждого блока. Первый — «classic», его получают приглашения, созданные до появления видов. */
export const BLOCK_VARIANTS = {
  hero: ["classic", "arch", "polaroid", "minimal", "cover", "monogram", "ticket"],
  countdown: ["classic", "circles", "cards"],
  calendar: ["classic", "date", "week", "tearoff"],
  story: ["classic", "photo", "letter"],
  program: ["classic", "cards", "icons"],
  location: ["classic", "postcard", "minimal"],
  dresscode: ["classic", "stripes", "chips"],
  rsvp: ["classic", "compact"],
  text: ["classic", "card", "quote"],
  photo: ["classic", "frame", "polaroid"],
  gallery: ["classic", "collage", "carousel"],
  contacts: ["classic", "cards"],
} as const;

/** Типы, которые встречаются в приглашении не больше одного раза: имена и дата берутся из hero, анкета одна. */
export const SINGLE_BLOCK_TYPES = ["hero", "rsvp"] as const;
/** Защита от раздувания JSON. */
export const MAX_BLOCKS = 40;

/** Как блок появляется при прокрутке. auto — как задумано стилем анимаций. */
export const ENTRANCES = ["auto", "rise", "fade", "slide", "zoom", "blur", "none"] as const;
/** Форма верхнего/нижнего края фона блока (см. lib/edges.ts). */
export const EDGES = ["none", "wave", "arch", "zigzag", "scallop", "perforated", "torn"] as const;
/** Ширина блока: по колонке содержимого (430 px) или во всю ширину экрана (заметно на широких экранах). */
export const BLOCK_WIDTHS = ["content", "full"] as const;
/** Характер анимаций всего приглашения. */
export const MOTION_STYLES = ["elegant", "soft", "playful", "cinematic", "none"] as const;
/** Заголовки блоков: капитель (Tenor Sans) или шрифтом имён — рукописные строчными, остальные капителью. */
export const HEADINGS = ["caps", "names"] as const;
/**
 * Как ведёт себя фоновое фото страницы: stretch — растянуто на всю высоту и прокручивается с содержимым (как было),
 * fixed — стоит на месте, содержимое едет поверх, parallax — стоит на месте и медленно смещается при прокрутке.
 */
export const BACKGROUND_MODES = ["stretch", "fixed", "parallax"] as const;
export type BackgroundMode = (typeof BACKGROUND_MODES)[number];
/** Вид заставки перед открытием приглашения. */
export const ENVELOPE_STYLES = ["seal", "veil", "flap", "curtains", "book"] as const;
/** Значки пунктов программы (вид «С иконками»). */
export const PROGRAM_ICONS = ["rings", "glasses", "cake", "dinner", "music", "camera", "car", "heart", "church", "dance"] as const;
/** Значки блока «Текст»: значки программы и темы информационных блоков (подарки, дети, письмо…). */
export const TEXT_ICONS = [...PROGRAM_ICONS, "gift", "letter", "child", "info", "flower", "star", "plane", "globe"] as const;
/** Высота фото в блоке «Фото»: как у самого снимка, на весь экран или квадрат. */
export const PHOTO_HEIGHTS = ["auto", "screen", "square"] as const;
export const MAX_GALLERY_PHOTOS = 9;
export const MAX_CONTACTS = 6;
export const ORNAMENT_POSITIONS = [
  "top-left",
  "top",
  "top-right",
  "left",
  "right",
  "bottom-left",
  "bottom",
  "bottom-right",
  "center",
] as const;

/** Как украшение появляется: auto — как в стиле анимаций (выезжает со своего края). */
export const ORNAMENT_ENTERS = ["auto", "side", "fade", "rise", "drop", "zoom", "grow", "spin", "blur", "none"] as const;
/** Что украшение делает потом: auto — ветки покачиваются на ветру, банты качаются на ниточке. */
export const ORNAMENT_IDLES = ["auto", "sway", "swing", "float", "breathe", "flutter", "shimmer", "spin", "none"] as const;

/** Анимация украшений: общая в теме и своя у отдельного украшения. Скорость — множитель: 2 — вдвое быстрее. */
export const ornamentMotionSchema = z.object({
  enter: z.enum(ORNAMENT_ENTERS).default("auto"),
  enterSpeed: z.number().min(0.25, "Скорость появления от 0.25 до 3").max(3, "Скорость появления от 0.25 до 3").default(1),
  idle: z.enum(ORNAMENT_IDLES).default("auto"),
  idleSpeed: z.number().min(0.25, "Скорость движения от 0.25 до 3").max(3, "Скорость движения от 0.25 до 3").default(1),
  /** Размах движения: 1 — стандартный, 3 — втрое сильнее. */
  idleAmplitude: z.number().min(0.2, "Размах от 0.2 до 3").max(3, "Размах от 0.2 до 3").default(1),
});

export const DEFAULT_ORNAMENT_MOTION = { enter: "auto", enterSpeed: 1, idle: "auto", idleSpeed: 1, idleAmplitude: 1 } as const;

/** Украшение блока: PNG из библиотеки или своё изображение, прижатое к краю/углу блока. */
export const ornamentSchema = z.object({
  src: imageUrl,
  position: z.enum(ORNAMENT_POSITIONS),
  /** Ширина в px. */
  size: z.number().min(40, "Размер украшения от 40 до 400").max(400, "Размер украшения от 40 до 400"),
  rotate: z.number().min(-180).max(180),
  flip: z.boolean(),
  opacity: z.number().min(0.1, "Прозрачность от 0.1 до 1").max(1, "Прозрачность от 0.1 до 1"),
  /** Своя анимация; нет — как у всех украшений (theme.ornamentMotion). */
  motion: ornamentMotionSchema.optional(),
});

export const themeSchema = z.object({
  palette: z.enum(PALETTES),
  font: z.enum(FONTS),
  bodyFont: z.enum(BODY_FONTS).default("auto"),
  background: z.string().max(500).nullable(),
  backgroundMode: z.enum(BACKGROUND_MODES).default("stretch"),
  /** Приглушение фонового фото цветом фона палитры: 0 — фото как есть, 0.9 — почти не видно. */
  backgroundDim: z.number().min(0, "Приглушение фона от 0 до 0.9").max(0.9, "Приглушение фона от 0 до 0.9").default(0.7),
  texture: z.enum(TEXTURES).default("none"),
  decor: z.object({
    type: z.enum(DECOR_TYPES),
    /** Картинка частиц для type = "image". */
    image: imageUrl.nullable().default(null),
    color: hexColor,
    density: z.number().min(0, "Плотность от 0 до 60").max(60, "Плотность от 0 до 60"),
    /** Множитель размера частиц: 1 — стандартный. */
    size: z.number().min(0.5, "Размер декора от 0.5 до 3").max(3, "Размер декора от 0.5 до 3").default(1),
    /** Множитель скорости падения: 1 — стандартная. */
    speed: z.number().min(0.3, "Скорость декора от 0.3 до 3").max(3, "Скорость декора от 0.3 до 3").default(1),
    /** Мини-игра: частица лопается конфетти от касания. Не задано — включено (false — выключено). */
    pop: z.boolean().optional(),
  }),
  envelope: z
    .object({ ornament: imageUrl.nullable(), style: z.enum(ENVELOPE_STYLES).default("seal") })
    .default({ ornament: null, style: "seal" }),
  headings: z.enum(HEADINGS).default("caps"),
  motion: z
    .object({
      style: z.enum(MOTION_STYLES).default("elegant"),
      /** Множитель длительности анимаций: 0.5 — вдвое быстрее, 2 — вдвое медленнее. */
      speed: z.number().min(0.5, "Скорость анимаций от 0.5 до 2").max(2, "Скорость анимаций от 0.5 до 2").default(1),
    })
    .default({ style: "elegant", speed: 1 }),
  /** Анимация всех украшений, у которых нет своей. */
  ornamentMotion: ornamentMotionSchema.default(DEFAULT_ORNAMENT_MOTION),
});

export const musicSchema = z.object({
  url: z.string().max(500).nullable(),
  loop: z.boolean(),
});

const edgeSeed = z.number().int().min(0).max(2147483646).optional();

/** Свой цвет и шрифт текста поля (любой шрифт имён или основного текста); не задано — как в теме. */
export const textStyleSchema = z.object({
  color: hexColor.optional(),
  font: z.union([z.enum(FONTS), z.enum(BODY_FONTS).exclude(["auto"])]).optional(),
});

/** Ссылка кнопки: сайт, телефон или почта. */
const linkUrl = z
  .string()
  .max(500)
  .regex(/^(https?:\/\/|tel:|mailto:)\S+$/, "Ссылка должна начинаться с https://, tel: или mailto:");

/** Id блока: у старых приглашений его нет — выдаётся при чтении (withBlockIds). */
export const blockIdSchema = z.string().regex(/^[\w-]{1,40}$/, "Неверный id блока");

/** Общие поля всех блоков. Значения по умолчанию нужны для приглашений, созданных до их появления. */
const blockBase = {
  id: blockIdSchema,
  visible: z.boolean(),
  /** Свой заголовок блока; если не задан — стандартный. */
  title: z.string().max(80).optional(),
  /** Строка «от руки» под заголовком, например «пригласить вас» под «Мы счастливы». */
  scriptLine: z.string().max(80).optional(),
  surface: z.preprocess((v) => (typeof v === "string" && v in LEGACY_SURFACES ? LEGACY_SURFACES[v] : v), z.enum(SURFACES).default("plain")),
  /** Непрозрачность фона блока (бумага/рваный край/карточка): 1 — сплошной. */
  surfaceOpacity: z
    .number()
    .min(0.1, "Прозрачность фона от 0.1 до 1")
    .max(1, "Прозрачность фона от 0.1 до 1")
    .default(1),
  ornaments: z.array(ornamentSchema).max(6, "Не больше 6 украшений в блоке").default([]),
  entrance: z.enum(ENTRANCES).default("auto"),
  /** Края фона блока: волна, арка, зигзаг, фестоны, рваная бумага; «none» — прямой. */
  edgeTop: z.enum(EDGES).default("none"),
  edgeBottom: z.enum(EDGES).default("none"),
  /** Зерно рисунка рваного края: новое при каждом выборе в редакторе; без него рисунок — от типа блока. */
  edgeTopSeed: edgeSeed,
  edgeBottomSeed: edgeSeed,
  width: z.enum(BLOCK_WIDTHS).default("content"),
  /** Фоновая картинка блока (во весь блок, режется краями) и насколько её приглушить цветом фона палитры. */
  bgImage: imageUrl.nullable().default(null),
  bgDim: z.number().min(0, "Приглушение от 0 до 0.9").max(0.9, "Приглушение от 0 до 0.9").default(0.35),
  /** Размытие фоновой картинки, px (0 — чёткая). */
  bgBlur: z.number().min(0, "Размытие от 0 до 24").max(24, "Размытие от 0 до 24").default(0),
  /** Затемнение фоновой картинки чёрным (0–0.9); от 0.45 текст блока без панели становится светлым. */
  bgDarken: z.number().min(0, "Затемнение от 0 до 0.9").max(0.9, "Затемнение от 0 до 0.9").default(0),
  /** Цвет фона: заливка во весь блок (режется краями) или цвет панели (карточка, калька, мятая бумага). */
  bgColor: hexColor.nullable().default(null),
  /** Стиль текста по полям: ключ — поле (title, names, text, itemTitle… — см. TEXT_KEYS в lib/textStyle.ts). */
  textStyles: z.record(z.string().max(40), textStyleSchema).default({}),
};

const variant = <T extends keyof typeof BLOCK_VARIANTS>(type: T) => z.enum(BLOCK_VARIANTS[type]).default("classic" as never);

export const heroBlockSchema = z.object({
  type: z.literal("hero"),
  ...blockBase,
  variant: variant("hero"),
  names: z.string().trim().min(1, "Укажите имена").max(120),
  date: localDateTime,
  /** Строка над именами, например «Приглашение на свадьбу». */
  label: z.string().max(80).optional(),
  subtitle: z.string().max(200).optional(),
  photo: imageUrl.nullable().default(null),
});

export const countdownBlockSchema = z.object({ type: z.literal("countdown"), ...blockBase, variant: variant("countdown") });

export const calendarBlockSchema = z.object({ type: z.literal("calendar"), ...blockBase, variant: variant("calendar") });

export const storyBlockSchema = z.object({
  type: z.literal("story"),
  ...blockBase,
  variant: variant("story"),
  text: z.string().max(5000),
  photo: imageUrl.nullable().default(null),
});

export const programBlockSchema = z.object({
  type: z.literal("program"),
  ...blockBase,
  variant: variant("program"),
  items: z
    .array(
      z.object({
        time: z.string().max(20),
        title: z.string().max(200),
        description: z.string().max(300).optional(),
        icon: z.enum(PROGRAM_ICONS).optional(),
      }),
    )
    .max(30),
});

export const locationBlockSchema = z.object({
  type: z.literal("location"),
  ...blockBase,
  variant: variant("location"),
  placeName: z.string().max(200),
  address: z.string().max(300),
  mapUrl: z.string().url("Ссылка на карту должна быть URL").optional(),
  photo: imageUrl.nullable().default(null),
});

export const dresscodeBlockSchema = z.object({
  type: z.literal("dresscode"),
  ...blockBase,
  variant: variant("dresscode"),
  text: z.string().max(1000),
  colors: z.array(hexColor).max(10),
});

export const rsvpBlockSchema = z.object({
  type: z.literal("rsvp"),
  ...blockBase,
  variant: variant("rsvp"),
  deadline: localDate.optional(),
});

/** Универсальный текст: пожелания, подарки, детали, «только взрослые». Необязательные значок и кнопка-ссылка. */
export const textBlockSchema = z.object({
  type: z.literal("text"),
  ...blockBase,
  variant: variant("text"),
  icon: z.enum(TEXT_ICONS).optional(),
  text: z.string().max(3000),
  buttonLabel: z.string().max(60).optional(),
  buttonUrl: linkUrl.optional(),
});

/** Одно фото (по умолчанию во всю ширину) с необязательной подписью. */
export const photoBlockSchema = z.object({
  type: z.literal("photo"),
  ...blockBase,
  width: z.enum(BLOCK_WIDTHS).default("full"),
  variant: variant("photo"),
  photo: imageUrl.nullable().default(null),
  caption: z.string().max(200).optional(),
  height: z.enum(PHOTO_HEIGHTS).default("auto"),
});

/** Несколько фото: сетка, коллаж или лента; по нажатию — во весь экран. */
export const galleryBlockSchema = z.object({
  type: z.literal("gallery"),
  ...blockBase,
  variant: variant("gallery"),
  photos: z.array(imageUrl).max(MAX_GALLERY_PHOTOS, `Не больше ${MAX_GALLERY_PHOTOS} фото в галерее`).default([]),
});

export const contactSchema = z.object({
  name: z.string().max(80),
  role: z.string().max(80).optional(),
  phone: z.string().max(30).optional(),
  /** Кнопка WhatsApp по номеру телефона. */
  whatsapp: z.boolean().default(true),
  /** Ник в Telegram (без @) или номер телефона. */
  telegram: z.string().max(40).optional(),
});

/** Контакты организаторов: кнопки «Позвонить», WhatsApp, Telegram. */
export const contactsBlockSchema = z.object({
  type: z.literal("contacts"),
  ...blockBase,
  variant: variant("contacts"),
  text: z.string().max(500).optional(),
  people: z.array(contactSchema).max(MAX_CONTACTS, `Не больше ${MAX_CONTACTS} контактов`).default([]),
});

export const blockSchema = z.discriminatedUnion("type", [
  heroBlockSchema,
  countdownBlockSchema,
  calendarBlockSchema,
  storyBlockSchema,
  programBlockSchema,
  locationBlockSchema,
  dresscodeBlockSchema,
  rsvpBlockSchema,
  textBlockSchema,
  photoBlockSchema,
  galleryBlockSchema,
  contactsBlockSchema,
]);

/**
 * Выдаёт id блокам старых приглашений (до повторяемых блоков): первый блок типа — «b-<тип>», следующие —
 * «b-<тип>-2»… Стабильно: одно и то же приглашение всегда получает одни и те же id. Не мутирует вход.
 */
export function withBlockIds(blocks: unknown): unknown {
  if (!Array.isArray(blocks) || blocks.every((b) => !b || typeof b !== "object" || "id" in b)) return blocks;
  const taken = new Set(blocks.map((b) => (b && typeof b === "object" && "id" in b ? String(b.id) : "")));
  return blocks.map((b) => {
    if (!b || typeof b !== "object" || "id" in b) return b;
    const base = `b-${String((b as { type?: unknown }).type ?? "block")}`;
    let id = base;
    for (let n = 2; taken.has(id); n++) id = `${base}-${n}`;
    taken.add(id);
    return { ...b, id };
  });
}

/** Формат приглашения без миграций — для слепка схемы (schemaDiff) и типов. */
export const invitationDataObject = z.object({
  /** Версия формата (semver) — см. lib/migrations.ts и правило в AGENTS.md. */
  // По умолчанию — постоянное 1.0.0 (данные без версии), а не SCHEMA_VERSION: иначе слепок менялся бы при каждом
  // поднятии версии. Текущую версию проставляет migrateInvitation до проверки.
  schemaVersion: z.string().regex(SEMVER, "Неверная версия формата").default(INITIAL_SCHEMA_VERSION),
  theme: themeSchema,
  music: musicSchema,
  blocks: z.preprocess(
    withBlockIds,
    z
      .array(blockSchema)
      .max(MAX_BLOCKS, `Не больше ${MAX_BLOCKS} блоков`)
      .superRefine((blocks, ctx) => {
        const ids = new Set<string>();
        const single = new Set<string>();
        blocks.forEach((b, i) => {
          if (ids.has(b.id)) ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Id блока «${b.id}» повторяется`, path: [i, "id"] });
          ids.add(b.id);
          if (!(SINGLE_BLOCK_TYPES as readonly string[]).includes(b.type)) return;
          if (single.has(b.type)) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Блок «${b.type}» может быть только один`, path: [i, "type"] });
          }
          single.add(b.type);
        });
      }),
  ),
});

/**
 * Приглашение: сначала старые данные приводятся к текущему формату (migrateInvitation), потом проверяются.
 * Всё чтение и запись приглашений идёт через эту схему.
 */
export const invitationDataSchema = z.preprocess((raw) => migrateInvitation(raw), invitationDataObject);

export type InvitationData = z.infer<typeof invitationDataObject>;
export type Theme = z.infer<typeof themeSchema>;
export type Palette = Theme["palette"];
export type Font = Theme["font"];
export type BodyFont = Theme["bodyFont"];
export type Texture = Theme["texture"];
export type DecorType = Theme["decor"]["type"];
export type Ornament = z.infer<typeof ornamentSchema>;
export type OrnamentPosition = Ornament["position"];
export type OrnamentMotion = z.infer<typeof ornamentMotionSchema>;
export type OrnamentEnter = OrnamentMotion["enter"];
export type OrnamentIdle = OrnamentMotion["idle"];
export type Surface = (typeof SURFACES)[number];
export type Block = z.infer<typeof blockSchema>;
export type Entrance = (typeof ENTRANCES)[number];
export type Edge = (typeof EDGES)[number];
export type BlockWidth = (typeof BLOCK_WIDTHS)[number];
export type TextStyle = z.infer<typeof textStyleSchema>;
export type TextFont = NonNullable<TextStyle["font"]>;
export type MotionStyle = (typeof MOTION_STYLES)[number];
export type EnvelopeStyle = (typeof ENVELOPE_STYLES)[number];
export type Headings = (typeof HEADINGS)[number];
export type ProgramIcon = (typeof PROGRAM_ICONS)[number];
export type TextIcon = (typeof TEXT_ICONS)[number];
export type PhotoHeight = (typeof PHOTO_HEIGHTS)[number];
export type Contact = z.infer<typeof contactSchema>;
export type BlockType = Block["type"];
export type BlockOf<T extends BlockType> = Extract<Block, { type: T }>;

/** Плоский список понятных сообщений об ошибках для ответа API и UI редактора. */
export function formatZodErrors(error: z.ZodError): string[] {
  return error.issues.map((i) => (i.path.length ? `${i.path.join(".")}: ${i.message}` : i.message));
}
