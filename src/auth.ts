import { PrismaAdapter } from "@auth/prisma-adapter";
import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { prisma } from "@/lib/db";
import { authEnabled } from "@/lib/session";

/**
 * Вход через Google (Auth.js). Пользователи и сессии — в нашей БД (таблицы User/Account/Session).
 * Без AUTH_GOOGLE_ID/AUTH_GOOGLE_SECRET вход выключен: всё работает по editToken, как раньше (локально, тесты, E2E).
 */
export const { handlers, auth, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: authEnabled() ? [Google] : [],
  session: { strategy: "database" },
  trustHost: true,
  callbacks: {
    // Id пользователя нужен в сессии: по нему ищем его приглашения.
    session: ({ session, user }) => ({ ...session, user: { ...session.user, id: user.id } }),
  },
});
