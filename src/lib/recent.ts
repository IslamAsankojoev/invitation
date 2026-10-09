/**
 * Недавние приглашения этого браузера — чтобы вернуться в редактор с главной без поиска секретной ссылки.
 * Хранятся только в localStorage этого устройства (как история браузера), на сервер не уходят.
 */
export type RecentInvitation = { id: string; token: string; names: string; date: string; at: number };

export const RECENT_KEY = "recent-invitations";
export const MAX_RECENT = 8;

/** Добавить или обновить приглашение: свежее — первым, без повторов, не больше MAX_RECENT. Вход не меняется. */
export function rememberInvitation(list: RecentInvitation[], entry: RecentInvitation): RecentInvitation[] {
  return [entry, ...list.filter((r) => r.id !== entry.id)].slice(0, MAX_RECENT);
}

export function forgetInvitation(list: RecentInvitation[], id: string): RecentInvitation[] {
  return list.filter((r) => r.id !== id);
}

/** Разбор сохранённого списка: битое или чужое содержимое — пустой список, кривые записи пропускаются. */
export function parseRecent(raw: string | null): RecentInvitation[] {
  try {
    const value: unknown = JSON.parse(raw ?? "[]");
    if (!Array.isArray(value)) return [];
    return value
      .filter(
        (r): r is RecentInvitation =>
          !!r &&
          typeof r.id === "string" &&
          typeof r.token === "string" &&
          typeof r.names === "string" &&
          typeof r.date === "string" &&
          typeof r.at === "number",
      )
      .slice(0, MAX_RECENT);
  } catch {
    return [];
  }
}

/** Чтение и запись localStorage — в try/catch: приватный режим и запрет хранилища не должны ломать страницу. */
export function loadRecent(): RecentInvitation[] {
  try {
    return parseRecent(localStorage.getItem(RECENT_KEY));
  } catch {
    return [];
  }
}

export function saveRecent(list: RecentInvitation[]): void {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(list));
  } catch {
    // хранилище недоступно — просто не запомним
  }
}
