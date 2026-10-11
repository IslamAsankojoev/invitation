import { open, stat, type FileHandle } from "node:fs/promises";
import { NextResponse } from "next/server";
import { deleteVideo, videoPath } from "@/lib/adminFiles";
import { adminGuard } from "../../guard";

type Ctx = { params: Promise<{ key: string; name: string }> };

/**
 * Ролик целиком или кусками (Range): без 206-ответов браузер не даёт перематывать видео, а Safari не играет вовсе.
 * ?download — «Скачать» (attachment).
 */
export async function GET(req: Request, { params }: Ctx) {
  const { key, name } = await params;
  const denied = adminGuard(key);
  if (denied) return denied;
  const file = videoPath(name);
  if (!file) return NextResponse.json({ error: "Ролик не найден" }, { status: 404 });
  const { size } = await stat(file);
  const headers: Record<string, string> = { "Content-Type": "video/mp4", "Accept-Ranges": "bytes", "Cache-Control": "no-store" };
  if (new URL(req.url).searchParams.has("download")) headers["Content-Disposition"] = `attachment; filename="${name}"`;
  const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.get("range") ?? "");
  if (range) {
    const start = range[1] ? Number(range[1]) : Math.max(0, size - Number(range[2]));
    const end = range[1] && range[2] ? Math.min(Number(range[2]), size - 1) : size - 1;
    if (start >= size || start > end) return new NextResponse(null, { status: 416, headers: { "Content-Range": `bytes */${size}` } });
    return new NextResponse(fileStream(file, start, end), { status: 206, headers: { ...headers, "Content-Range": `bytes ${start}-${end}/${size}`, "Content-Length": String(end - start + 1) } });
  }
  return new NextResponse(fileStream(file, 0, size - 1), { headers: { ...headers, "Content-Length": String(size) } });
}

const CHUNK = 256 * 1024;

/**
 * Байты start…end файла потоком «по запросу»: следующий кусок читается, только когда его просят. Readable.toWeb
 * поверх fs-потока продолжал писать после того, как браузер оборвал загрузку (перемотка, закрытый плеер), —
 * «Controller is already closed» ронял сервер.
 */
function fileStream(file: string, start: number, end: number): ReadableStream<Uint8Array> {
  let handle: FileHandle | null = null;
  let pos = start;
  const done = async (controller?: ReadableStreamDefaultController<Uint8Array>) => {
    await handle?.close().catch(() => {});
    handle = null;
    controller?.close();
  };
  return new ReadableStream<Uint8Array>({
    async start() {
      handle = await open(file, "r");
    },
    async pull(controller) {
      const length = Math.min(CHUNK, end - pos + 1);
      if (!handle || length <= 0) return done(controller);
      const buffer = new Uint8Array(length);
      const { bytesRead } = await handle.read(buffer, 0, length, pos);
      if (!bytesRead) return done(controller);
      pos += bytesRead;
      controller.enqueue(buffer.subarray(0, bytesRead));
    },
    cancel: () => done(),
  });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  const { key, name } = await params;
  const denied = adminGuard(key);
  if (denied) return denied;
  return (await deleteVideo(name)) ? new NextResponse(null, { status: 204 }) : NextResponse.json({ error: "Ролик не найден" }, { status: 404 });
}
