import { NextResponse } from "next/server";
import { z } from "zod";
import { createInvitation } from "@/lib/invitations";
import { currentUser } from "@/lib/session";
import { createFromTemplate, findTemplate, templates } from "@/lib/templates";

const bodySchema = z.object({ template: z.string().optional() }).nullable();

/** Создаёт приглашение. Тело `{ template: id }` необязательно — по умолчанию первый шаблон. */
export async function POST(req: Request) {
  const text = await req.text().catch(() => "");
  let json: unknown = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch {
    return NextResponse.json({ error: "Некорректный JSON" }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(json);
  const templateId = parsed.success ? (parsed.data?.template ?? templates[0].id) : null;
  const template = templateId ? findTemplate(templateId) : undefined;
  if (!template) {
    return NextResponse.json({ error: "Неизвестный шаблон" }, { status: 400 });
  }

  // Вошедший пользователь сразу становится владельцем — забирать в аккаунт потом не нужно.
  const user = await currentUser();
  const inv = await createInvitation(createFromTemplate(template), undefined, user?.id ?? null);
  return NextResponse.json(
    {
      id: inv.id,
      slug: inv.slug,
      editToken: inv.editToken,
      editUrl: `/edit/${inv.id}?token=${inv.editToken}`,
    },
    { status: 201 },
  );
}
