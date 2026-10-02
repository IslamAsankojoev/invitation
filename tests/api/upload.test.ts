import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { POST } from "@/app/api/upload/route";
import { createInvitation, type Invitation } from "@/lib/invitations";
import { storage } from "@/lib/storage";
import { pngOf } from "../image-fixtures";
import { resetDb } from "./helpers";

let inv: Invitation;
beforeAll(async () => {
  await resetDb();
  inv = await createInvitation();
});

function uploadRequest(file?: File) {
  const form = new FormData();
  if (file) form.append("file", file);
  return new Request(`http://localhost/api/upload?id=${inv.id}&token=${inv.editToken}`, { method: "POST", body: form });
}

const fileOf = (size: number, type: string, name = "f") => new File([new Uint8Array(size)], name, { type });
const MB = 1024 * 1024;

afterEach(() => vi.restoreAllMocks());

describe("POST /api/upload", () => {
  it("отклоняет неверный тип файла", async () => {
    const res = await POST(uploadRequest(fileOf(10, "application/pdf", "doc.pdf")));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/изображение или MP3/);
  });

  it("отклоняет аудио не-mp3", async () => {
    expect((await POST(uploadRequest(fileOf(10, "audio/wav", "a.wav")))).status).toBe(400);
  });

  it("отклоняет изображение больше 4 МБ (Vercel принимает запрос до 4.5 МБ)", async () => {
    expect((await POST(uploadRequest(fileOf(4 * MB + 1, "image/png", "a.png")))).status).toBe(400);
  });

  it("отклоняет «картинку», которую нельзя прочитать", async () => {
    const save = vi.spyOn(storage, "save");
    const res = await POST(uploadRequest(fileOf(1000, "image/png", "broken.png")));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/Не удалось прочитать картинку/);
    expect(save).not.toHaveBeenCalled();
  });

  it("mp3 пока не принимает: своя музыка выключена, песни — из встроенного списка", async () => {
    const save = vi.spyOn(storage, "save");
    const res = await POST(uploadRequest(fileOf(1000, "audio/mpeg", "song.mp3")));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toMatch(/Своя музыка пока недоступна/);
    expect(save).not.toHaveBeenCalled();
  });

  it("отклоняет запрос без файла", async () => {
    expect((await POST(uploadRequest())).status).toBe(400);
  });

  it("принимает картинку, сохраняет сжатый WebP в папку приглашения и возвращает URL", async () => {
    const save = vi.spyOn(storage, "save").mockResolvedValue("/uploads/x.webp");
    const png = new File([await pngOf(2400, 1200)], "photo.png", { type: "image/png" });
    const res = await POST(uploadRequest(png));
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ url: "/uploads/x.webp" });
    expect(save).toHaveBeenCalledWith(expect.objectContaining({ type: "image/webp", name: "photo.png", folder: `inv/${inv.id}` }));
  });
});
