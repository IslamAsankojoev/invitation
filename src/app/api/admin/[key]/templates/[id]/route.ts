import { NextResponse } from "next/server";
import { z } from "zod";
import { currentTemplate, duplicateTemplate, resetTemplate, saveTemplate, setPublished } from "@/lib/adminFiles";
import { deleteInvitation, getInvitationBySlug } from "@/lib/invitations";
import { formatZodErrors, invitationDataSchema } from "@/lib/schema";
import { draftSlug, templateFromInvitation } from "@/lib/templateAdmin";
import { adminGuard } from "../../guard";

type Ctx = { params: Promise<{ key: string; id: string }> };

const putSchema = z.object({ data: invitationDataSchema });
const patchSchema = z.object({ name: z.string().trim().min(1).max(60), description: z.string().trim().max(300) });
const publishSchema = z.object({ published: z.boolean() });

/** Сохранить в шаблон приглашение из редактора (черновик). */
export async function PUT(req: Request, { params }: Ctx) {
  const { key, id } = await params;
  const denied = adminGuard(key);
  if (denied) return denied;
  const base = await currentTemplate(id);
  if (!base) return NextResponse.json({ error: "Шаблон не найден" }, { status: 404 });
  const parsed = putSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Некорректные данные", details: formatZodErrors(parsed.error) }, { status: 400 });
  try {
    return NextResponse.json(await saveTemplate(templateFromInvitation(base, parsed.data.data)));
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Не удалось сохранить" }, { status: 500 });
  }
}

/** Название и описание — или публикация (`{ published }`: скрытый не виден на главной и в выборе шаблона). */
export async function PATCH(req: Request, { params }: Ctx) {
  const { key, id } = await params;
  const denied = adminGuard(key);
  if (denied) return denied;
  const base = await currentTemplate(id);
  if (!base) return NextResponse.json({ error: "Шаблон не найден" }, { status: 404 });
  const body = await req.json().catch(() => null);
  const publish = publishSchema.safeParse(body);
  if (publish.success) {
    try {
      await setPublished(id, publish.data.published);
    } catch (e) {
      return NextResponse.json({ error: e instanceof Error ? e.message : "Не удалось сохранить" }, { status: 409 });
    }
    return NextResponse.json({ published: publish.data.published });
  }
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Нужно название (до 60 символов)", details: formatZodErrors(parsed.error) }, { status: 400 });
  return NextResponse.json(await saveTemplate({ ...base, ...parsed.data }));
}

/** Копия шаблона. */
export async function POST(_req: Request, { params }: Ctx) {
  const { key, id } = await params;
  const denied = adminGuard(key);
  if (denied) return denied;
  const copy = await duplicateTemplate(id);
  return copy ? NextResponse.json({ template: copy }, { status: 201 }) : NextResponse.json({ error: "Шаблон не найден" }, { status: 404 });
}

/** Шаблон из кода — к исходному, новый — удалить. Черновик тоже удаляется: иначе в нём остались бы старые правки. */
export async function DELETE(_req: Request, { params }: Ctx) {
  const { key, id } = await params;
  const denied = adminGuard(key);
  if (denied) return denied;
  if (!(await resetTemplate(id))) return NextResponse.json({ error: "Правок нет" }, { status: 404 });
  const draft = await getInvitationBySlug(draftSlug(id));
  if (draft) await deleteInvitation(draft.id);
  return new NextResponse(null, { status: 204 });
}
