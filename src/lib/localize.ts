import { defaultTitle, eventCopy, allDefaultTitles } from "./copy";
import { EVENT_TYPES, type Block, type BlockType, type EventType, type InvitationData, type Language } from "./schema";
import { templateCopyKy } from "./templateCopyKy";
import { exampleBlocks, sampleContent, TEXT_PRESETS } from "./templates";

/** Текстовые поля блоков, которые могут быть примером (заголовки, подписи, тексты). Имена — отдельно. */
const TEXT_FIELDS = ["title", "scriptLine", "label", "subtitle", "text", "caption", "buttonLabel", "placeName", "address"] as const;

/** Поля, которые при смене события заменяются примером нового события (если организатор их не трогал). */
const EVENT_FIELDS: Partial<Record<BlockType, string[]>> = {
  hero: ["label", "subtitle"],
  // Заголовок истории не трогаем: у примера он пустой (вид «цитата»), замена убрала бы заголовок.
  story: ["text"],
  dresscode: ["text"],
  rsvp: ["title", "scriptLine"],
  contacts: ["title", "text"],
};

/**
 * Словарь «русский пример → кыргызский»: тексты шаблонов (templateCopyKy) + общие примеры событий, заголовки по
 * умолчанию и готовые тексты — попарно. Собирается один раз.
 */
let dictionary: { ky: Map<string, string>; ru: Map<string, string> } | undefined;
function dict() {
  if (dictionary) return dictionary;
  const ky = new Map<string, string>();
  const add = (ru: string | undefined, k: string | undefined) => {
    if (ru && k && ru !== k && !ky.has(ru)) ky.set(ru, k);
  };
  for (const [ru, k] of Object.entries(templateCopyKy)) add(ru, k);
  for (const e of EVENT_TYPES) {
    const [r, k] = [eventCopy[e].ru, eventCopy[e].ky];
    for (const key of ["label", "subtitle", "story", "dresscode", "rsvpTitle", "rsvpScript"] as const) add(r[key], k[key]);
    r.program.forEach((item, i) => {
      add(item.title, k.program[i]?.title);
      add(item.description, k.program[i]?.description);
    });
    for (const type of ["countdown", "calendar", "story", "program", "location", "dresscode", "rsvp", "gallery", "contacts"] as const) {
      add(defaultTitle(type, e, "ru"), defaultTitle(type, e, "ky"));
    }
  }
  for (const p of TEXT_PRESETS) {
    add(p.title, p.ky.title);
    add(p.text, p.ky.text);
  }
  const ru = new Map([...ky].map(([r, k]) => [k, r]));
  return (dictionary = { ky, ru });
}

/** Перевод примера на язык `to`; не пример — undefined. */
const translate = (value: string, to: Language) => dict()[to].get(value);

const field = (block: Block, key: string) => (block as unknown as Record<string, unknown>)[key];
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** Значение поля — как в каком-нибудь примере (любое событие, любой язык, любой шаблон): организатор его не трогал. */
const isExample = (type: BlockType, key: string, value: unknown) =>
  value !== undefined && exampleBlocks(type).some((e) => same(field(e, key), value));

/**
 * Сменить тип события и язык приглашения. Нетронутые примеры: при смене события — пример нового события на новом
 * языке; при смене только языка — перевод того же примера (у шаблонов свои тексты — templateCopyKy). Всё, что
 * организатор написал сам, остаётся. Заголовок, равный заголовку по умолчанию, сбрасывается — он подстроится под
 * событие и язык. Чистая функция, вход не мутирует.
 */
export function applyCopy(data: InvitationData, eventType: EventType, lang: Language): InvitationData {
  if (data.eventType === eventType && data.language === lang) return data;
  const eventChanged = data.eventType !== eventType;
  const langChanged = data.language !== lang;
  const tr = (value: unknown) => (langChanged && typeof value === "string" ? translate(value, lang) : undefined);

  return {
    ...data,
    eventType,
    language: lang,
    blocks: data.blocks.map((block) => {
      const patch: Record<string, unknown> = {};
      const sample = sampleContent(block.type, eventType, lang);
      const eventFields = EVENT_FIELDS[block.type] ?? [];
      for (const key of TEXT_FIELDS) {
        const value = field(block, key);
        if (typeof value !== "string" || !value) continue;
        const next = eventChanged && eventFields.includes(key) && isExample(block.type, key, value) ? field(sample, key) : tr(value);
        if (next !== undefined && next !== value) patch[key] = next;
      }
      if (block.type === "hero" && eventChanged && isExample("hero", "names", block.names)) patch.names = eventCopy[eventType][lang].names;
      if (block.type === "program") {
        if (eventChanged && isExample("program", "items", block.items)) patch.items = structuredClone(field(sample, "items"));
        else if (langChanged)
          patch.items = block.items.map((item) => ({
            ...item,
            title: tr(item.title) ?? item.title,
            ...(item.description && { description: tr(item.description) ?? item.description }),
          }));
      }
      if (block.type === "contacts" && langChanged) {
        patch.people = block.people.map((p) => (p.role ? { ...p, role: tr(p.role) ?? p.role } : p));
      }
      const title = "title" in patch ? patch.title : block.title;
      if (typeof title === "string" && title && allDefaultTitles(block.type).includes(title)) patch.title = undefined;
      return Object.keys(patch).some((k) => !same(patch[k], field(block, k))) ? ({ ...block, ...patch } as Block) : block;
    }),
  };
}
