import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getInvitationById, getInvitationBySlug, hasValidToken, listRsvps } from "@/lib/invitations";
import { clientIp, rsvpRateLimiter } from "@/lib/rateLimit";
import { computeRsvpStats, rsvpInputSchema } from "@/lib/rsvp";
import { formatZodErrors } from "@/lib/schema";

type Ctx = { params: Promise<{ key: string }> };

/** Гость отправляет ответ. key = slug приглашения. */
export async function POST(req: Request, { params }: Ctx) {
  const inv = await getInvitationBySlug((await params).key);
  if (!inv) return NextResponse.json({ error: "Приглашение не найдено" }, { status: 404 });

  if (!rsvpRateLimiter.check(clientIp(req))) {
    return NextResponse.json({ error: "Слишком много ответов, попробуйте через минуту" }, { status: 429 });
  }

  const parsed = rsvpInputSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Некорректные данные", details: formatZodErrors(parsed.error) }, { status: 400 });
  }
  if (parsed.data.website) {
    return NextResponse.json({ error: "Ответ отклонён" }, { status: 400 });
  }

  const { name, attending, guestsCount, comment } = parsed.data;
  const rsvp = await prisma.rsvp.create({
    data: { invitationId: inv.id, name, attending, guestsCount, comment: comment || null },
  });
  return NextResponse.json({ id: rsvp.id }, { status: 201 });
}

/** Организатор получает список ответов. key = id приглашения, нужен token. */
export async function GET(req: Request, { params }: Ctx) {
  const inv = await getInvitationById((await params).key);
  if (!inv) return NextResponse.json({ error: "Приглашение не найдено" }, { status: 404 });
  if (!hasValidToken(inv, new URL(req.url).searchParams.get("token"))) {
    return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
  }
  const rsvps = await listRsvps(inv.id);
  return NextResponse.json({ rsvps, stats: computeRsvpStats(rsvps) });
}
