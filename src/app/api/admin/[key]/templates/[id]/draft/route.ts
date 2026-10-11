import { NextResponse } from "next/server";
import { currentTemplate } from "@/lib/adminFiles";
import { toPublic } from "@/lib/invitations";
import { resetDraft } from "@/lib/templateDrafts";
import { adminGuard } from "../../../guard";

type Ctx = { params: Promise<{ key: string; id: string }> };

/** «Начать заново»: черновик снова как сохранённый шаблон (несохранённые в шаблон правки пропадут). */
export async function POST(_req: Request, { params }: Ctx) {
  const { key, id } = await params;
  const denied = adminGuard(key);
  if (denied) return denied;
  const template = await currentTemplate(id);
  if (!template) return NextResponse.json({ error: "Шаблон не найден" }, { status: 404 });
  return NextResponse.json(toPublic(await resetDraft(template)));
}
