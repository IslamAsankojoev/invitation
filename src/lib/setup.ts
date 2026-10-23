import { z } from "zod";
import { findBlock, updateBlock } from "./blocks";
import { describeDate, parseLocalDate, splitNames } from "./calendar";
import { musicTracks } from "./music";
import { localDateTime, type Block, type InvitationData, type Language } from "./schema";
import { templateCopyKy } from "./templateCopyKy";
import type { Template } from "./templates";

/**
 * Главное о событии — форма при выборе шаблона: имена, дата, хозяева, место, песня. Остальное человек правит уже в
 * редакторе. Не формат приглашения (в JSON не хранится) — версию формата не трогает.
 */
export const setupSchema = z.object({
  names: z.string().trim().min(1, "Укажите имена").max(120),
  date: localDateTime,
  /** Хозяева тоя — спрашиваются, только если они есть в примере шаблона (`Template.hosts`). */
  hosts: z.string().trim().max(300).default(""),
  placeName: z.string().trim().max(200).default(""),
  address: z.string().trim().max(300).default(""),
  /** Только встроенная песня или без музыки. */
  musicUrl: z
    .string()
    .nullable()
    .refine((url) => url === null || musicTracks.some((t) => t.src === url), "Неизвестная песня"),
});

export type Setup = z.infer<typeof setupSchema>;
export type SetupInput = z.input<typeof setupSchema>;

/** Текстовые поля блоков, где в примерах шаблонов бывают имена, хозяева и дата («С любовью, …», «— 12 . 06 . 2027 —»). */
const TEXT_FIELDS = ["title", "scriptLine", "label", "subtitle", "text", "caption"] as const;

/** «Анна & Иван» → «Анна и Иван» (на кыргызском — «жана»): так имена пишут в подписи под текстом. */
const namesInText = (names: string, lang: Language) => splitNames(names).join(lang === "ky" ? " жана " : " и ");

const escapeRegExp = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * Замены «пример → своё» во всех текстах блока за один проход (одна замена не подхватывает результат другой).
 * Только целиком: «Айбек» не трогает «Айбекова».
 */
function replaceInTexts(block: Block, swaps: Map<string, string>): Block {
  if (!swaps.size) return block;
  const pattern = [...swaps.keys()].sort((a, b) => b.length - a.length).map(escapeRegExp).join("|");
  const re = new RegExp(`(?<![\\p{L}\\p{N}])(?:${pattern})(?![\\p{L}\\p{N}])`, "gu");
  const fields = block as unknown as Record<string, unknown>;
  const changed: Record<string, string> = {};
  for (const key of TEXT_FIELDS) {
    const value = fields[key];
    if (typeof value !== "string") continue;
    const next = value.replace(re, (found) => swaps.get(found) ?? found);
    if (next !== value) changed[key] = next;
  }
  return Object.keys(changed).length ? ({ ...block, ...changed } as Block) : block;
}

/** Сдвиг дня «YYYY-MM-DD» на столько же дней, на сколько сдвинулась дата события. */
function shiftDay(day: string, from: string, to: string): string {
  const utc = (local: string) => {
    const { year, month, day } = parseLocalDate(local);
    return Date.UTC(year, month - 1, day);
  };
  return new Date(utc(day) + utc(to) - utc(from)).toISOString().slice(0, 10);
}

/** Ссылка «Посмотреть на карте» по названию и адресу — вместо ссылки на место из примера шаблона. */
export const mapSearchUrl = (place: string) => `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}`;

/**
 * Кладёт ответы в приглашение и не мутирует вход: имена и дата — в главный экран, место — в «Место», песня — в
 * музыку. Имена, дата и хозяева из примера встречаются и в текстах шаблона (подпись «С любовью, Санжар и Мадина»,
 * дата в тексте, «Нурбек и Венера») — их тоже заменяем, иначе гости увидят чужие имена. Срок ответа сдвигается вместе
 * с датой. `template` — шаблон приглашения: по нему ищем хозяев примера.
 */
export function applySetup(data: InvitationData, setup: Setup, template?: Pick<Template, "hosts">): InvitationData {
  const hero = findBlock(data, "hero");
  const swaps = new Map<string, string>();
  const swap = (from: string | undefined, to: string) => {
    if (from?.trim() && from !== to) swaps.set(from, to);
  };
  if (hero) {
    swap(hero.names.trim(), setup.names);
    swap(namesInText(hero.names, data.language), namesInText(setup.names, data.language));
    if (hero.date) {
      const [was, now] = [describeDate(hero.date).dotted, describeDate(setup.date).dotted];
      swap(was, now);
      swap(was.replace(/ /g, ""), now.replace(/ /g, ""));
    }
  }
  // Хозяева примера — как в шаблоне или в его кыргызском переводе (приглашение могли перевести до формы).
  if (setup.hosts && template?.hosts) for (const sample of [template.hosts, templateCopyKy[template.hosts]]) swap(sample, setup.hosts);

  let next: InvitationData = { ...data, blocks: data.blocks.map((block) => replaceInTexts(block, swaps)) };
  next = updateBlock(next, "hero", { names: setup.names, date: setup.date });
  const rsvp = findBlock(next, "rsvp");
  if (hero?.date && rsvp?.deadline) next = updateBlock(next, "rsvp", { deadline: shiftDay(rsvp.deadline, hero.date, setup.date) });
  // Место из формы заменяет пример целиком (вместе со ссылкой на карту), иначе гости увидели бы чужой адрес;
  // пустое — пример остаётся до редактора.
  const location = findBlock(next, "location");
  if (location && (setup.placeName || setup.address)) {
    next = updateBlock(next, "location", {
      placeName: setup.placeName,
      address: setup.address,
      mapUrl: location.mapUrl ? mapSearchUrl([setup.placeName, setup.address].filter(Boolean).join(", ")) : undefined,
    });
  }
  return { ...next, music: { ...next.music, url: setup.musicUrl } };
}
