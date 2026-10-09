import { z } from "zod";
import { findBlock, updateBlock } from "./blocks";
import { musicTracks } from "./music";
import { localDateTime, type InvitationData } from "./schema";

/**
 * Главное о событии — форма при выборе шаблона: имена, дата, место, песня. Остальное человек правит уже в редакторе.
 * Не формат приглашения (в JSON не хранится) — версию формата не трогает.
 */
export const setupSchema = z.object({
  names: z.string().trim().min(1, "Укажите имена").max(120),
  date: localDateTime,
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

/** Кладёт ответы в приглашение и не мутирует вход: имена и дата — в главный экран, место — в «Место», песня — в музыку. */
export function applySetup(data: InvitationData, setup: Setup): InvitationData {
  let next = updateBlock(data, "hero", { names: setup.names, date: setup.date });
  // Пустое место не затирает пример шаблона — его заполнят позже в редакторе.
  if (findBlock(next, "location") && (setup.placeName || setup.address)) {
    next = updateBlock(next, "location", {
      ...(setup.placeName && { placeName: setup.placeName }),
      ...(setup.address && { address: setup.address }),
    });
  }
  return { ...next, music: { ...next.music, url: setup.musicUrl } };
}
