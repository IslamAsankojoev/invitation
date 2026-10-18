import { NextResponse } from "next/server";
import { z } from "zod";
import { adminTemplates, saveOrder } from "@/lib/adminFiles";
import { adminGuard } from "../guard";

type Ctx = { params: Promise<{ key: string }> };

const putSchema = z.object({ order: z.array(z.string().min(1).max(80)).min(1).max(200) });

/** Порядок шаблонов (перетаскивание в админке): на главной и в показе они идут так же. */
export async function PUT(req: Request, { params }: Ctx) {
  const { key } = await params;
  const denied = adminGuard(key);
  if (denied) return denied;
  const parsed = putSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Нужен список id шаблонов" }, { status: 400 });
  try {
    await saveOrder(parsed.data.order);
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "Не удалось сохранить" }, { status: 409 });
  }
  return NextResponse.json({ order: (await adminTemplates()).map((t) => t.template.id) });
}
