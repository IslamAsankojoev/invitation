/**
 * Ответ гостя, запомненный в его браузере: вернувшись, он видит «Вы уже ответили» и может поправить ответ —
 * на сервере обновляется та же запись (PUT с editKey), а не появляется вторая.
 */
export type SavedAnswer = {
  id: string;
  editKey: string;
  name: string;
  attending: boolean;
  guests: number;
  comment: string;
};

export const answerKey = (slug: string) => `rsvp-answer:${slug}`;

export function parseSavedAnswer(raw: string | null): SavedAnswer | null {
  try {
    const v = JSON.parse(raw ?? "null") as Partial<SavedAnswer> | null;
    if (
      !v ||
      typeof v.id !== "string" ||
      typeof v.editKey !== "string" ||
      typeof v.name !== "string" ||
      typeof v.attending !== "boolean" ||
      typeof v.guests !== "number"
    )
      return null;
    return { id: v.id, editKey: v.editKey, name: v.name, attending: v.attending, guests: v.guests, comment: typeof v.comment === "string" ? v.comment : "" };
  } catch {
    return null;
  }
}

export function loadAnswer(slug: string): SavedAnswer | null {
  try {
    return parseSavedAnswer(localStorage.getItem(answerKey(slug)));
  } catch {
    return null;
  }
}

export function saveAnswer(slug: string, answer: SavedAnswer): void {
  try {
    localStorage.setItem(answerKey(slug), JSON.stringify(answer));
  } catch {
    // хранилище недоступно — ответ отправлен, просто не запомним его на этом устройстве
  }
}
