import { NextResponse } from "next/server";
import { z } from "zod";
import { createInvitation } from "@/lib/invitations";
import { currentUser } from "@/lib/session";
import { formatZodErrors } from "@/lib/schema";
import { applySetup, setupSchema } from "@/lib/setup";
import { createFromTemplate, findTemplate, templates } from "@/lib/templates";

const bodySchema = z.object({ template: z.string().optional(), setup: z.unknown().optional() }).nullable();

/**
 * Создаёт приглашение. Тело `{ template: id, setup? }` необязательно — по умолчанию первый шаблон с примером текстов.
 * `setup` — ответы формы «главное о событии» (lib/setup.ts): имена, дата, место, песня.
 */
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

  let data = createFromTemplate(template);
  const rawSetup = parsed.success ? parsed.data?.setup : undefined;
  if (rawSetup !== undefined) {
    const setup = setupSchema.safeParse(rawSetup);
    if (!setup.success) return NextResponse.json({ error: "Проверьте поля", errors: formatZodErrors(setup.error) }, { status: 400 });
    data = applySetup(data, setup.data);
  }

  // Вошедший пользователь сразу становится владельцем — забирать в аккаунт потом не нужно.
  const user = await currentUser();
  const inv = await createInvitation(data, undefined, user?.id ?? null);
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
