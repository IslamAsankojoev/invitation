import { z } from "zod";

/**
 * Ответ гостя, запомненный в его браузере (на одно приглашение — один ответ с устройства). Вернувшись, гость видит
 * свой ответ, а «Изменить ответ» обновляет ту же запись на сервере (PATCH с id и секретом), а не добавляет вторую.
 * Личных ссылок для гостей пока нет — поэтому память по устройству.
 */
const savedAnswerSchema = z.object({
  id: z.string().min(1),
  secret: z.string().min(1),
  name: z.string(),
  attending: z.boolean(),
  guestsCount: z.number().int().min(1).max(10),
  comment: z.string().catch(""),
});

export type SavedAnswer = z.infer<typeof savedAnswerSchema>;

export const answerKey = (slug: string) => `rsvp:${slug}`;

/** Битый или чужой формат — как будто ответа нет. */
export function parseSavedAnswer(raw: string | null): SavedAnswer | null {
  try {
    const parsed = savedAnswerSchema.safeParse(JSON.parse(raw ?? "null"));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function loadAnswer(slug: string): SavedAnswer | null {
  try {
    return parseSavedAnswer(localStorage.getItem(answerKey(slug)));
  } catch {
    // Хранилище закрыто (приватный режим, запрет cookies) — форма как в первый раз.
    return null;
  }
}

export function saveAnswer(slug: string, answer: SavedAnswer): void {
  try {
    localStorage.setItem(answerKey(slug), JSON.stringify(answer));
  } catch {
    // Ответ уже отправлен — просто не запомним его на этом устройстве.
  }
}
