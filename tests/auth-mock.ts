import type { SessionUser } from "@/lib/session";

/** Подмена входа в тестах (tests/setup.ts мокает @/lib/session): по умолчанию вход выключен. */
export const testAuth: { enabled: boolean; user: SessionUser | null } = { enabled: false, user: null };

export function signInAs(user: Partial<SessionUser> & { id: string }) {
  testAuth.enabled = true;
  testAuth.user = { email: `${user.id}@example.com`, name: null, image: null, ...user };
}
