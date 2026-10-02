import { NextResponse } from "next/server";
import { canEdit } from "@/lib/access";
import { getInvitationById } from "@/lib/invitations";
import { currentUser } from "@/lib/session";
import { storage } from "@/lib/storage";
import { checkUpload } from "@/lib/upload";

/** Загрузка в приглашение: `?id=<id приглашения>&token=<editToken>` (или владелец по аккаунту). */
export async function POST(req: Request) {
  const query = new URL(req.url).searchParams;
  const id = query.get("id");
  const [inv, user] = await Promise.all([id ? getInvitationById(id) : null, currentUser()]);
  if (!inv) return NextResponse.json({ error: "Приглашение не найдено" }, { status: 404 });
  if (!canEdit(inv, { token: query.get("token"), userId: user?.id })) {
    return NextResponse.json({ error: "Нет доступа" }, { status: 403 });
  }

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "Файл не передан" }, { status: 400 });

  const error = checkUpload(file.type, file.size);
  if (error) return NextResponse.json({ error }, { status: 400 });

  const url = await storage.save({ name: file.name, type: file.type, bytes: new Uint8Array(await file.arrayBuffer()) });
  return NextResponse.json({ url }, { status: 201 });
}
