/** Кто может править приглашение и кому его можно «забрать» в аккаунт. Чистые функции — см. tests/unit/access.test.ts. */

type Owned = { editToken: string; userId: string | null };

/** Править может тот, у кого секретная ссылка (token), или владелец по аккаунту. */
export function canEdit(inv: Owned | null, who: { token?: string | null; userId?: string | null }): boolean {
  if (!inv) return false;
  if (who.token && who.token === inv.editToken) return true;
  return !!who.userId && inv.userId === who.userId;
}

/** Чьё приглашение с точки зрения пользователя: его, ничьё (создано без входа) или чужое. */
export type Ownership = "mine" | "none" | "other";

export function ownershipOf(inv: Pick<Owned, "userId">, userId: string | null | undefined): Ownership {
  if (!inv.userId) return "none";
  return inv.userId === userId ? "mine" : "other";
}

/**
 * Забрать приглашение в аккаунт: нужен token (значит, это автор) и чтобы у приглашения ещё не было владельца.
 * Возвращает, что делать: присвоить, уже своё, отказать.
 */
export function claimDecision(inv: Owned, token: string | null | undefined, userId: string): "claim" | "already" | "forbidden" | "taken" {
  if (inv.userId === userId) return "already";
  if (!token || token !== inv.editToken) return "forbidden";
  return inv.userId ? "taken" : "claim";
}

/**
 * При включённом входе ссылки для гостей, «Открыть» и ответы гостей — только владельцу:
 * нужно войти и (если приглашение ничьё) сохранить его в аккаунт. Что сейчас мешает:
 * login — не вошёл; save — вошёл, приглашение ничьё; other — сохранено в другом аккаунте; null — можно.
 */
export type AccountGate = "login" | "save" | "other" | null;

export function accountGate(account: { user: { id: string } | null; ownership: Ownership } | undefined): AccountGate {
  if (!account) return null; // вход выключен — всё по token, как раньше
  if (!account.user) return "login";
  return account.ownership === "mine" ? null : account.ownership === "none" ? "save" : "other";
}

/** Страница ответов гостей при включённом входе: показать, попросить войти, забрать в аккаунт или 403. */
export function guestsPageAccess(
  inv: Owned,
  who: { token?: string | null; userId?: string | null },
): "show" | "login" | "claim" | "forbidden" {
  if (!who.userId) return "login";
  if (inv.userId === who.userId) return "show";
  if (!inv.userId && who.token && who.token === inv.editToken) return "claim";
  return "forbidden";
}

/** Куда вернуться после «Сохранить в аккаунт»: только известные места, а не произвольный адрес. */
export type ClaimNext = "editor" | "guests";
export const claimNextOf = (v: string | null | undefined): ClaimNext => (v === "guests" ? "guests" : "editor");

/** Адрес «Сохранить в аккаунт» для редактора/страницы гостей (сюда же возвращает вход через Google). */
export const claimUrl = (id: string, token: string, next: ClaimNext = "editor") =>
  `/edit/${id}/claim?token=${encodeURIComponent(token)}${next === "guests" ? "&next=guests" : ""}`;
