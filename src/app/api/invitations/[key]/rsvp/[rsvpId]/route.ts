import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { getInvitationById, getInvitationBySlug, hasValidToken } from "@/lib/invitations";
import { clientIp, rsvpRateLimiter } from "@/lib/rateLimit";
import { rsvpInputSchema } from "@/lib/rsvp";
import { formatZodErrors } from "@/lib/schema";

type Ctx = { params: Promise<{ key: string; rsvpId: string }> };

const editSchema = rsvpInputSchema.extend({ editKey: z.string().min(1) });

/** Гость правит свой ответ. key = slug; editKey — секрет, выданный при первом ответе (только у этого гостя). */
export async function PUT(req: Request, { params }: Ctx) {
  const { key, rsvpId } = await params;
  const inv = await getInvitationBySlug(key);
  if (!inv) return NextResponse.json({ error: "Приглашение не найдено" }, { status: 404 });
  if (!rsvpRateLimiter.check(clientIp(req))) {
    return NextResponse.json({ error: "Слишком много ответов, попробуйте через минуту" }, { status: 429 });
  }
  const parsed = editSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Некорректные данные", details: formatZodErrors(parsed.error) }, { status: 400 });
  }
  if (parsed.data.website) return NextResponse.json({ error: "Ответ отклонён" }, { status: 400 });

  const { name, attending, guestsCount, comment, editKey } = parsed.data;
  const { count } = await prisma.rsvp.updateMany({
    where: { id: rsvpId, invitationId: inv.id, editKey },
    data: { name, attending, guestsCount, comment: comment || null },
  });
  if (count === 0) return NextResponse.json({ error: "Ответ не найден" }, { status: 404 });
  return NextResponse.json({ id: rsvpId });
}

/** Организатор удаляет ответ (ошибочный, повторный). key = id приглашения, нужен token. */
export async function DELETE(req: Request, { params }: Ctx) {
  const { key, rsvpId } = await params;
  const inv = await getInvitationById(key);
  if (!inv) return NextResponse.json({ error: "Приглашение не найдено" }, { status: 404 });
  if (!hasValidToken(inv, new URL(req.url).searchParams.get("token"))) {
    return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
  }
  const { count } = await prisma.rsvp.deleteMany({ where: { id: rsvpId, invitationId: inv.id } });
  if (count === 0) return NextResponse.json({ error: "Ответ не найден" }, { status: 404 });
  return new NextResponse(null, { status: 204 });
}
