import { NextResponse } from "next/server";
import type { z } from "zod";
import { prisma } from "@/lib/db";
import { getInvitationById, getInvitationBySlug, hasValidToken, listRsvps } from "@/lib/invitations";
import { clientIp, rsvpRateLimiter } from "@/lib/rateLimit";
import { computeRsvpStats, rsvpEditSchema, rsvpInputSchema, type RsvpInput } from "@/lib/rsvp";
import { hashRsvpSecret, newRsvpSecret } from "@/lib/rsvpSecret";
import { formatZodErrors } from "@/lib/schema";

type Ctx = { params: Promise<{ key: string }> };

/** Общие проверки ответа гостя: приглашение по slug, лимит частоты, схема, honeypot. */
async function guestAnswer<T extends RsvpInput>(req: Request, { params }: Ctx, schema: z.ZodType<T, z.ZodTypeDef, unknown>) {
  const inv = await getInvitationBySlug((await params).key);
  if (!inv) return { error: NextResponse.json({ error: "Приглашение не найдено" }, { status: 404 }) };

  if (!rsvpRateLimiter.check(clientIp(req))) {
    return { error: NextResponse.json({ error: "Слишком много ответов, попробуйте через минуту" }, { status: 429 }) };
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    const details = formatZodErrors(parsed.error);
    return { error: NextResponse.json({ error: "Некорректные данные", details }, { status: 400 }) };
  }
  if (parsed.data.website) return { error: NextResponse.json({ error: "Ответ отклонён" }, { status: 400 }) };
  return { inv, data: parsed.data };
}

/**
 * Гость отправляет ответ. key = slug приглашения. В ответ — id записи и секрет: браузер гостя хранит их, чтобы потом
 * изменить этот ответ (PATCH), а не прислать второй. В базе — только хэш секрета.
 */
export async function POST(req: Request, ctx: Ctx) {
  const checked = await guestAnswer(req, ctx, rsvpInputSchema);
  if (checked.error) return checked.error;
  const { inv, data } = checked;

  const secret = newRsvpSecret();
  const rsvp = await prisma.rsvp.create({
    data: {
      invitationId: inv.id,
      name: data.name,
      attending: data.attending,
      guestsCount: data.guestsCount,
      comment: data.comment || null,
      editSecretHash: hashRsvpSecret(secret),
    },
  });
  return NextResponse.json({ id: rsvp.id, secret }, { status: 201 });
}

/**
 * Гость меняет свой ответ. key = slug; в теле — ответ, id записи и секрет. Чужая запись, неверный секрет или ответ,
 * данный до появления секретов, — 404 (браузер тогда отправит ответ заново).
 */
export async function PATCH(req: Request, ctx: Ctx) {
  const checked = await guestAnswer(req, ctx, rsvpEditSchema);
  if (checked.error) return checked.error;
  const { inv, data } = checked;

  const { count } = await prisma.rsvp.updateMany({
    where: { id: data.id, invitationId: inv.id, editSecretHash: hashRsvpSecret(data.secret) },
    data: { name: data.name, attending: data.attending, guestsCount: data.guestsCount, comment: data.comment || null },
  });
  if (count === 0) return NextResponse.json({ error: "Ответ не найден" }, { status: 404 });
  return NextResponse.json({ id: data.id });
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
