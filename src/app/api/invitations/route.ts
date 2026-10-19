import { NextResponse } from "next/server";
import { z } from "zod";
import { createInvitation } from "@/lib/invitations";
import { applyCopy } from "@/lib/localize";
import { currentUser } from "@/lib/session";
import { EVENT_TYPES, formatZodErrors, LANGUAGES } from "@/lib/schema";
import { applySetup, setupSchema } from "@/lib/setup";
import { createFromTemplate, findPublishedTemplate, templates } from "@/lib/templates";
import { track } from "@/lib/track";

const bodySchema = z
  .object({
    template: z.string().optional(),
    setup: z.unknown().optional(),
    eventType: z.enum(EVENT_TYPES).optional(),
    language: z.enum(LANGUAGES).optional(),
  })
  .nullable();

/**
 * Создаёт приглашение. Тело `{ template: id, setup?, eventType?, language? }` необязательно — по умолчанию первый
 * шаблон с примером текстов. `eventType`/`language` — событие и язык гостя (примеры текстов — под них, lib/localize.ts),
 * нет — как у шаблона. `setup` — ответы формы «главное о событии» (lib/setup.ts): имена, дата, место, песня.
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
  // Скрытый в админке шаблон (не опубликован) — как неизвестный.
  const template = templateId ? findPublishedTemplate(templateId) : undefined;
  if (!template) {
    return NextResponse.json({ error: "Неизвестный шаблон" }, { status: 400 });
  }

  let data = createFromTemplate(template);
  const body = parsed.success ? parsed.data : null;
  data = applyCopy(data, body?.eventType ?? data.eventType, body?.language ?? data.language);
  const rawSetup = body?.setup;
  if (rawSetup !== undefined) {
    const setup = setupSchema.safeParse(rawSetup);
    if (!setup.success) return NextResponse.json({ error: "Проверьте поля", errors: formatZodErrors(setup.error) }, { status: 400 });
    data = applySetup(data, setup.data);
  }

  // Вошедший пользователь сразу становится владельцем — забирать в аккаунт потом не нужно.
  const user = await currentUser();
  const inv = await createInvitation(data, undefined, user?.id ?? null);
  await track("invitation_created", {
    invitationId: inv.id,
    props: { template: template.id, setup: rawSetup !== undefined, eventType: data.eventType, lang: data.language },
  });
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
