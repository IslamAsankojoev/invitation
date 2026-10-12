import { NextResponse } from "next/server";
import { z } from "zod";
import { adminTemplates, listVideos } from "@/lib/adminFiles";
import { enqueue, listJobs } from "@/lib/videoJobs";
import { adminGuard } from "../guard";

type Ctx = { params: Promise<{ key: string }> };

const postSchema = z.object({
  templates: z.array(z.string()).min(1).max(50),
  fullscreen: z.boolean().default(false),
  bg: z.string().regex(/^#[0-9a-f]{6}$/i).default("#1b2b27"),
  /** С музыкой приглашения. */
  sound: z.boolean().default(false),
});

/** Ролики и очередь записи (админка опрашивает, пока что-то пишется). */
export async function GET(_req: Request, { params }: Ctx) {
  const denied = adminGuard((await params).key);
  if (denied) return denied;
  return NextResponse.json({ videos: await listVideos(), jobs: listJobs() });
}

/** Записать ролики шаблонов: в очередь, по одному. */
export async function POST(req: Request, { params }: Ctx) {
  const denied = adminGuard((await params).key);
  if (denied) return denied;
  const parsed = postSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
  if (!process.env.SHOWCASE_KEY) return NextResponse.json({ error: "Нет SHOWCASE_KEY в .env — запись идёт через страницу показа" }, { status: 409 });
  const all = await adminTemplates();
  const chosen = parsed.data.templates.map((id) => all.find((t) => t.template.id === id)?.template);
  if (chosen.some((t) => !t)) return NextResponse.json({ error: "Шаблон не найден" }, { status: 404 });
  const { fullscreen, bg, sound } = parsed.data;
  const jobs = enqueue(chosen.map((t) => ({ templateId: t!.id, templateName: t!.name, fullscreen, bg, sound })), new URL(req.url).origin);
  return NextResponse.json({ jobs }, { status: 202 });
}
