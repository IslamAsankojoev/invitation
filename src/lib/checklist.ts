import { blockLabels, blockName, findBlock, isSamplePhoto } from "./blocks";
import type { Block, BlockOf, BlockType, InvitationData } from "./schema";
import { templateCopyKy } from "./templateCopyKy";
import { allTemplates, exampleBlocks } from "./templates";

export type ChecklistItem = { key: "names" | "place" | "program" | "deadline"; label: string; blockId: string; done: boolean };

/** Значение ещё как в каком-нибудь примере (общем или из шаблона) — значит, организатор его не менял. */
function isExample<T extends BlockType>(type: T, value: (b: BlockOf<T>) => unknown, block: BlockOf<T>): boolean {
  const mine = JSON.stringify(value(block));
  return (exampleBlocks(type) as BlockOf<T>[]).some((e) => JSON.stringify(value(e)) === mine);
}

/**
 * «Что осталось заполнить»: главное, без чего приглашение не отправить. Новое приглашение уже заполнено примером,
 * поэтому «не заполнено» — это «совпадает с примером», а не «пусто». Скрытые и отсутствующие блоки не в списке.
 */
export function checklist(data: InvitationData): ChecklistItem[] {
  const items: ChecklistItem[] = [];
  const visible = <T extends BlockType>(type: T) => {
    const b = findBlock(data, type) as Block | undefined;
    return b?.visible ? (b as BlockOf<T>) : undefined;
  };
  const hero = visible("hero");
  if (hero)
    items.push({
      key: "names",
      label: "Имена и дата",
      blockId: hero.id,
      done: !!hero.names.trim() && !isExample("hero", (b) => b.names.trim(), hero) && !isExample("hero", (b) => b.date, hero),
    });
  const location = visible("location");
  if (location)
    items.push({
      key: "place",
      label: "Место",
      blockId: location.id,
      done: !!location.address.trim() && !isExample("location", (b) => b.address.trim(), location),
    });
  const program = visible("program");
  if (program)
    items.push({
      key: "program",
      label: "Программа",
      blockId: program.id,
      done: program.items.length > 0 && !isExample("program", (b) => b.items.map(({ time, title }) => [time, title]), program),
    });
  const rsvp = visible("rsvp");
  if (rsvp)
    items.push({
      key: "deadline",
      label: "Срок ответа",
      blockId: rsvp.id,
      done: !!rsvp.deadline && !isExample("rsvp", (b) => b.deadline ?? null, rsvp),
    });
  return items;
}

/** Блок, в котором осталось что-то из примера шаблона: название в списке и что именно («имена», «адрес», «фото»). */
export type Leftover = { blockId: string; name: string; what: string[] };

/** Поля с текстом примера (как в lib/localize.ts) — в них бывают имена и хозяева из примера. */
const TEXT_FIELDS = ["title", "scriptLine", "label", "subtitle", "text", "caption"] as const;

/** Слова с большой буквы от трёх букв — имена («Нурбек», «Асановы»); «&», «и», «жана» сюда не попадают. */
const nameWords = (text: string) => text.match(/\p{Lu}\p{L}{2,}/gu) ?? [];

type Samples = {
  /** Тексты примеров на обоих языках (тексты шаблонов, примеры событий, переводы templateCopyKy). */
  texts: Set<string>;
  /** Слова-имена из примеров: пары на обложках, хозяева, контакты. */
  names: Set<string>;
  heroNames: Set<string>;
  dates: Set<string>;
  mapUrls: Set<string>;
  phones: Set<string>;
  deadlines: Set<string>;
  /** Время пунктов программы примеров (JSON списка). */
  programs: Set<string>;
};
let samples: Samples | undefined;

/** Всё, по чему видно пример шаблона; собирается один раз (примеры не меняются). */
function sampleValues(): Samples {
  if (samples) return samples;
  const s: Samples = {
    texts: new Set(),
    names: new Set(),
    heroNames: new Set(),
    dates: new Set(),
    mapUrls: new Set(),
    phones: new Set(),
    deadlines: new Set(),
    programs: new Set(),
  };
  const text = (v: unknown) => typeof v === "string" && v.trim() && s.texts.add(v);
  const names = (v: string) => nameWords(v).forEach((w) => s.names.add(w));
  for (const type of Object.keys(blockLabels) as BlockType[]) {
    for (const block of exampleBlocks(type)) {
      const fields = block as unknown as Record<string, unknown>;
      TEXT_FIELDS.forEach((key) => text(fields[key]));
      if (block.type === "hero") {
        s.heroNames.add(block.names.trim());
        s.dates.add(block.date);
        names(block.names);
      }
      if (block.type === "location") {
        text(block.placeName);
        text(block.address);
        if (block.mapUrl) s.mapUrls.add(block.mapUrl);
      }
      if (block.type === "program") {
        block.items.forEach((item) => (text(item.title), text(item.description)));
        s.programs.add(JSON.stringify(block.items.map((i) => i.time)));
      }
      if (block.type === "contacts")
        block.people.forEach((p) => {
          names(p.name);
          if (p.phone) s.phones.add(p.phone);
        });
      if (block.type === "rsvp" && block.deadline) s.deadlines.add(block.deadline);
    }
  }
  for (const [ru, ky] of Object.entries(templateCopyKy)) text(ru), text(ky);
  for (const t of allTemplates) if (t.hosts) [t.hosts, templateCopyKy[t.hosts] ?? ""].forEach(names);
  return (samples = s);
}

/**
 * Проверка перед отправкой (вкладка «Ссылка»): что в видимых блоках ещё из примера шаблона и увидят гости — имена и
 * дата, хозяева в текстах, адрес и ссылка на карту, телефоны, срок ответа, программа, фото. «Из примера» — совпадает
 * с каким-нибудь примером (любой шаблон, любое событие и язык). Имена в тексте — только в нетронутом тексте примера
 * и не из имён на обложке (их проверяет сама обложка).
 */
export function sampleLeftovers(data: InvitationData): Leftover[] {
  const s = sampleValues();
  const hero = findBlock(data, "hero");
  const own = new Set(hero ? nameWords(hero.names) : []);
  const out: Leftover[] = [];
  for (const block of data.blocks) {
    if (!block.visible) continue;
    const what: string[] = [];
    switch (block.type) {
      case "hero":
        if (s.heroNames.has(block.names.trim())) what.push("имена");
        if (s.dates.has(block.date)) what.push("дата");
        if (isSamplePhoto(block.photo)) what.push("фото");
        break;
      case "location":
        if (s.texts.has(block.placeName) || s.texts.has(block.address)) what.push("адрес");
        if (block.mapUrl && s.mapUrls.has(block.mapUrl)) what.push("ссылка на карту");
        if (isSamplePhoto(block.photo)) what.push("фото");
        break;
      case "story":
      case "photo":
        if (isSamplePhoto(block.photo)) what.push("фото");
        break;
      case "gallery":
        if (block.photos.some(isSamplePhoto)) what.push("фото");
        break;
      case "contacts":
        if (block.people.some((p) => s.phones.has(p.phone ?? ""))) what.push("телефон");
        break;
      case "rsvp":
        if (block.deadline && s.deadlines.has(block.deadline)) what.push("срок ответа");
        break;
      case "program":
        if (
          block.items.length &&
          s.programs.has(JSON.stringify(block.items.map((i) => i.time))) &&
          block.items.every((i) => s.texts.has(i.title))
        )
          what.push("время и пункты");
        break;
    }
    const fields = block as unknown as Record<string, unknown>;
    const found = new Set<string>();
    for (const key of TEXT_FIELDS) {
      const value = fields[key];
      if (typeof value === "string" && s.texts.has(value)) nameWords(value).forEach((w) => s.names.has(w) && !own.has(w) && found.add(w));
    }
    if (found.size) what.push(`имена ${[...found].join(", ")}`);
    if (what.length) out.push({ blockId: block.id, name: blockName(data, block), what });
  }
  return out;
}
