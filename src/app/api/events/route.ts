import { NextResponse } from "next/server";
import { clientEventSchema } from "@/lib/analytics";
import { clientIp, eventsRateLimiter } from "@/lib/rateLimit";
import { invitationIdBySlug, track } from "@/lib/track";

/**
 * Событие аналитики из браузера (lib/beacon.ts): гость открыл приглашение или конверт, организатор поделился
 * ссылкой. Ответ без тела — sendBeacon его всё равно не читает.
 */
export async function POST(req: Request) {
  if (!eventsRateLimiter.check(clientIp(req))) return new NextResponse(null, { status: 429 });
  const json = await req.json().catch(() => null);
  const parsed = clientEventSchema.safeParse(json);
  if (!parsed.success) return NextResponse.json({ error: "Некорректное событие" }, { status: 400 });

  const { name, slug, visitorId, channel } = parsed.data;
  const invitationId = await invitationIdBySlug(slug);
  if (!invitationId) return NextResponse.json({ error: "Приглашение не найдено" }, { status: 404 });

  await track(name, { invitationId, visitorId, props: channel ? { channel } : undefined });
  return new NextResponse(null, { status: 204 });
}
