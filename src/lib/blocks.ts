import { describeDate } from "./calendar";
import { MAX_BLOCKS, SINGLE_BLOCK_TYPES, type Block, type BlockOf, type BlockType, type InvitationData, type Ornament } from "./schema";

/**
 * Чистые функции над блоками: всегда возвращают новый объект, исходный не мутируют.
 * Блок указывается ключом: id блока или тип — тогда это первый блок этого типа (удобно для единственных
 * hero/rsvp, шаблонов и тестов). Id никогда не совпадает с названием типа.
 */
type BlockKey = BlockType | (string & {});

const matches = (data: InvitationData, key: BlockKey) => {
  const id = data.blocks.some((b) => b.id === key) ? key : data.blocks.find((b) => b.type === key)?.id;
  return (b: Block) => b.id === id;
};

export function toggleBlock(data: InvitationData, key: BlockKey): InvitationData {
  const hit = matches(data, key);
  return {
    ...data,
    blocks: data.blocks.map((b) => (hit(b) ? { ...b, visible: !b.visible } : b)),
  };
}

export function moveBlock(data: InvitationData, from: number, to: number): InvitationData {
  const n = data.blocks.length;
  if (from === to || from < 0 || to < 0 || from >= n || to >= n) return data;
  const blocks = [...data.blocks];
  const [moved] = blocks.splice(from, 1);
  blocks.splice(to, 0, moved);
  return { ...data, blocks };
}

export function updateBlock<T extends BlockType>(data: InvitationData, type: T, patch: Partial<Omit<BlockOf<T>, "type">>): InvitationData;
export function updateBlock(data: InvitationData, id: string, patch: Partial<Block>): InvitationData;
export function updateBlock(data: InvitationData, key: BlockKey, patch: Partial<Block>): InvitationData {
  const hit = matches(data, key);
  return {
    ...data,
    blocks: data.blocks.map((b) => (hit(b) ? ({ ...b, ...patch, type: b.type, id: b.id } as Block) : b)),
  };
}

/** Первый блок типа (у hero и rsvp он единственный) — из него берут имена, дату, место. */
export function findBlock<T extends BlockType>(data: InvitationData, type: T): BlockOf<T> | undefined {
  return data.blocks.find((b): b is BlockOf<T> => b.type === type);
}

export const blockById = (data: InvitationData, id: string) => data.blocks.find((b) => b.id === id);

/** Новый уникальный id блока: тип + случайный хвост (никогда не равен названию типа). */
export function newBlockId(type: BlockType, taken: Iterable<string> = []): string {
  const used = new Set(taken);
  for (;;) {
    const id = `${type}-${Math.random().toString(36).slice(2, 8)}`;
    if (!used.has(id)) return id;
  }
}

export const isSingleType = (type: BlockType) => (SINGLE_BLOCK_TYPES as readonly string[]).includes(type);

/** Можно ли добавить ещё один блок этого типа. */
export const canAddBlock = (data: InvitationData, type: BlockType) =>
  data.blocks.length < MAX_BLOCKS && !(isSingleType(type) && data.blocks.some((b) => b.type === type));

/** Можно ли удалить блок: главный экран — нет, из него берутся имена и дата (его можно скрыть). */
export const canRemoveBlock = (block: Block) => block.type !== "hero";

/** Вставляет блок после блока с id `after` (нет такого — в конец); лишний одиночный или сверх лимита — не добавляет. */
export function insertBlock(data: InvitationData, block: Block, after?: string | null): InvitationData {
  if (!canAddBlock(data, block.type) || data.blocks.some((b) => b.id === block.id)) return data;
  const i = after ? data.blocks.findIndex((b) => b.id === after) : -1;
  const blocks = [...data.blocks];
  blocks.splice(i < 0 ? blocks.length : i + 1, 0, block);
  return { ...data, blocks };
}

/** Копия блока сразу под ним, с новым id (рисунок рваного края копируется тем же). */
export function duplicateBlock(data: InvitationData, id: string, newId?: string): InvitationData {
  const block = blockById(data, id);
  if (!block) return data;
  const copy = { ...structuredClone(block), id: newId ?? newBlockId(block.type, data.blocks.map((b) => b.id)) };
  return insertBlock(data, copy, id);
}

export function removeBlock(data: InvitationData, id: string): InvitationData {
  const block = blockById(data, id);
  if (!block || !canRemoveBlock(block)) return data;
  return { ...data, blocks: data.blocks.filter((b) => b.id !== id) };
}

export const MAX_ORNAMENTS = 6;

/** Новое украшение с разумными параметрами: цветы — в угол, акценты — поменьше. */
export function createOrnament(src: string, position: Ornament["position"] = "top-right"): Ornament {
  return { src, position, size: 160, rotate: 0, flip: false, opacity: 1 };
}

const blockOf = (data: InvitationData, key: BlockKey) => data.blocks.find(matches(data, key));

export function addOrnament(data: InvitationData, key: BlockKey, ornament: Ornament): InvitationData {
  const block = blockOf(data, key);
  if (!block || block.ornaments.length >= MAX_ORNAMENTS) return data;
  return updateBlock(data, block.id, { ornaments: [...block.ornaments, ornament] });
}

export function updateOrnament(
  data: InvitationData,
  key: BlockKey,
  index: number,
  patch: Partial<Ornament>,
): InvitationData {
  const block = blockOf(data, key);
  if (!block || !block.ornaments[index]) return data;
  return updateBlock(data, block.id, {
    ornaments: block.ornaments.map((o, i) => (i === index ? { ...o, ...patch } : o)),
  });
}

export function removeOrnament(data: InvitationData, key: BlockKey, index: number): InvitationData {
  const block = blockOf(data, key);
  if (!block || !block.ornaments[index]) return data;
  return updateBlock(data, block.id, { ornaments: block.ornaments.filter((_, i) => i !== index) });
}

/** Название блока в редакторе. */
export const blockLabels: Record<BlockType, string> = {
  hero: "Главный экран",
  countdown: "Обратный отсчёт",
  calendar: "Календарь",
  story: "Наша история",
  program: "Программа",
  location: "Место",
  dresscode: "Дресс-код",
  rsvp: "Анкета гостя",
  text: "Текст",
  photo: "Фото",
  gallery: "Галерея",
  contacts: "Контакты",
};

/** Строка описания типа в окне «Добавить блок». */
export const blockDescriptions: Record<BlockType, string> = {
  hero: "Имена, дата и фото пары",
  countdown: "Сколько дней и часов осталось",
  calendar: "Месяц с отмеченной датой",
  story: "История пары или цитата",
  program: "Расписание дня по времени",
  location: "Место, адрес и карта",
  dresscode: "Цвета и пожелания к нарядам",
  rsvp: "Гости подтверждают присутствие",
  text: "Заголовок, текст, значок и кнопка",
  photo: "Одно фото во всю ширину",
  gallery: "До 9 фото сеткой, коллажем или лентой",
  contacts: "Телефон, WhatsApp и Telegram",
};

/** Название блока в списке и объявлениях: при нескольких блоках одного типа — с номером («Текст 2»). */
export function blockName(data: InvitationData, block: Block): string {
  const same = data.blocks.filter((b) => b.type === block.type);
  return same.length > 1 ? `${blockLabels[block.type]} ${same.indexOf(block) + 1}` : blockLabels[block.type];
}

/** Заголовок блока на странице, если организатор не задал свой. */
export const defaultTitles: Record<BlockType, string> = {
  hero: "",
  countdown: "До события",
  calendar: "Дата свадьбы",
  story: "Наша история",
  program: "Программа дня",
  location: "Место проведения",
  dresscode: "Дресс-код",
  rsvp: "Подтвердите присутствие",
  text: "",
  photo: "",
  gallery: "Наши моменты",
  contacts: "Контакты",
};

export const blockTitle = (block: { type: BlockType; title?: string }) => block.title ?? defaultTitles[block.type];

/** «1 пункт», «3 пункта», «5 пунктов». */
export function plural(n: number, [one, few, many]: [string, string, string]): string {
  const m10 = n % 10;
  const m100 = n % 100;
  const word = m10 === 1 && m100 !== 11 ? one : m10 >= 2 && m10 <= 4 && (m100 < 12 || m100 > 14) ? few : many;
  return `${n} ${word}`;
}

const firstWords = (text: string | undefined, max = 48) => {
  const t = (text ?? "").replace(/\s+/g, " ").trim();
  return t.length > max ? `${t.slice(0, max).trimEnd()}…` : t;
};
/** «2027-06-19» или «2027-06-19T16:00» → «19.06.2027». */
const shortDate = (date: string) => describeDate(date.length === 10 ? `${date}T00:00` : date).dotted.replace(/ /g, "");

/**
 * Строка-сводка под названием блока в списке редактора: что в блоке сейчас, не раскрывая его
 * («Анна & Иван · 19.06.2027», «3 пункта: 16:00 Сбор гостей», «срок ответа не задан»). Пусто — сводки нет.
 */
export function blockSummary(data: InvitationData, block: Block): string {
  const hero = findBlock(data, "hero");
  const heroDate = hero?.date ? shortDate(hero.date) : "";
  switch (block.type) {
    case "hero":
      return [block.names.trim(), block.date ? shortDate(block.date) : ""].filter(Boolean).join(" · ");
    case "countdown":
    case "calendar":
      return heroDate;
    case "story":
    case "dresscode":
      return firstWords(block.text);
    case "program": {
      const first = block.items[0];
      if (!first) return "пунктов нет";
      return `${plural(block.items.length, ["пункт", "пункта", "пунктов"])}: ${[first.time, first.title].filter(Boolean).join(" ")}`;
    }
    case "location":
      return block.placeName.trim() || block.address.trim();
    case "rsvp":
      return block.deadline ? `ответить до ${shortDate(block.deadline)}` : "срок ответа не задан";
    case "text":
      return block.title?.trim() || firstWords(block.text);
    case "photo":
      return block.photo ? block.caption?.trim() || "фото загружено" : "фото не загружено";
    case "gallery":
      return block.photos.length ? plural(block.photos.length, ["фото", "фото", "фото"]) : "фото не загружены";
    case "contacts":
      return plural(block.people.length, ["контакт", "контакта", "контактов"]);
  }
}
