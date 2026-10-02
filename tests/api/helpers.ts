import { prisma } from "@/lib/db";
import { rsvpRateLimiter } from "@/lib/rateLimit";

export async function resetDb() {
  await prisma.rsvp.deleteMany();
  await prisma.invitation.deleteMany();
  await prisma.user.deleteMany();
  rsvpRateLimiter.reset();
}

export const ctx = (key: string) => ({ params: Promise.resolve({ key }) });

export function jsonRequest(url: string, method: string, body?: unknown, headers: Record<string, string> = {}) {
  return new Request(`http://localhost${url}`, {
    method,
    headers: { "content-type": "application/json", ...headers },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

/** Пользователь в БД (как после входа через Google). */
export const createUser = (id: string) => prisma.user.create({ data: { id, email: `${id}@example.com` } });
