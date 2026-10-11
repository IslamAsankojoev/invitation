import { NextResponse } from "next/server";
import { cancel } from "@/lib/videoJobs";
import { adminGuard } from "../../guard";

type Ctx = { params: Promise<{ key: string; id: string }> };

/** Отменить запись: убрать из очереди или остановить текущую. */
export async function DELETE(_req: Request, { params }: Ctx) {
  const { key, id } = await params;
  const denied = adminGuard(key);
  if (denied) return denied;
  return cancel(id) ? new NextResponse(null, { status: 204 }) : NextResponse.json({ error: "Запись уже закончилась" }, { status: 404 });
}
