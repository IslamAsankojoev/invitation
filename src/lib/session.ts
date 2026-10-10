/** Включён ли вход: заданы ключи Google OAuth. Без них приложение работает по editToken, без аккаунтов. */
export const authEnabled = () => !!(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);

/**
 * Обязателен ли вход для ссылки гостям, «Открыть» и ответов гостей. Переключатель — `AUTH_REQUIRED=true` в env
 * (локально .env, на Vercel — Environment Variables). Не задан — вход есть, но ничего не закрывает: всё по token.
 */
export const authRequired = () => authEnabled() && process.env.AUTH_REQUIRED === "true";

export type SessionUser = { id: string; email: string | null; name: string | null; image: string | null };

/** Текущий пользователь или null (вход выключен / не вошёл). В тестах подменяется (tests/setup.ts). */
export async function currentUser(): Promise<SessionUser | null> {
  if (!authEnabled()) return null;
  const { auth } = await import("@/auth");
  const session = await auth();
  const user = session?.user as (SessionUser & { id?: string }) | undefined;
  return user?.id ? { id: user.id, email: user.email ?? null, name: user.name ?? null, image: user.image ?? null } : null;
}
