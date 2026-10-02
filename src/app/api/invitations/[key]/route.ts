import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getInvitationById,
  hasValidToken,
  isSlugTaken,
  toPublic,
  updateInvitation,
} from "@/lib/invitations";
import { formatZodErrors, invitationDataSchema } from "@/lib/schema";
import { slugSchema } from "@/lib/slug";

// Сегмент называется [key], потому что Next.js не допускает разные имена параметров на одном уровне:
// здесь это id приглашения, а в ./rsvp — slug.
type Ctx = { params: Promise<{ key: string }> };

const patchSchema = z.object({
  data: invitationDataSchema.optional(),
  slug: slugSchema.optional(),
});

export async function GET(_req: Request, { params }: Ctx) {
  const inv = await getInvitationById((await params).key);
  if (!inv) return NextResponse.json({ error: "Приглашение не найдено" }, { status: 404 });
  return NextResponse.json(toPublic(inv));
}

export async function PATCH(req: Request, { params }: Ctx) {
  const id = (await params).key;
  const inv = await getInvitationById(id);
  if (!inv) return NextResponse.json({ error: "Приглашение не найдено" }, { status: 404 });
  if (!hasValidToken(inv, new URL(req.url).searchParams.get("token"))) {
    return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Некорректные данные", details: formatZodErrors(parsed.error) }, { status: 400 });
  }
  if (parsed.data.slug && (await isSlugTaken(parsed.data.slug, id))) {
    return NextResponse.json({ error: "Эта ссылка уже занята" }, { status: 409 });
  }

  const updated = await updateInvitation(id, parsed.data);
  return NextResponse.json(toPublic(updated));
}
