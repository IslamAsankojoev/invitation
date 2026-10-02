import sharp from "sharp";
import { describe, expect, it, vi } from "vitest";
import { MAX_IMAGE_SIDE, optimizeImage } from "@/lib/images";
import { createStorage, LocalStorage, SupabaseStorage } from "@/lib/storage";
import { pngOf } from "../image-fixtures";

describe("сжатие загруженных картинок", () => {
  it("большое фото → WebP не больше 1600 px по длинной стороне, пропорции сохраняются", async () => {
    const out = await optimizeImage(await pngOf(4000, 2000));
    expect(out.type).toBe("image/webp");
    const meta = await sharp(out.bytes).metadata();
    expect(meta.format).toBe("webp");
    expect([meta.width, meta.height]).toEqual([MAX_IMAGE_SIDE, 800]);
  });

  it("маленькую картинку не растягивает, метаданные (EXIF, в т.ч. геолокацию) не переносит", async () => {
    const out = await optimizeImage(await pngOf(300, 200, true));
    const meta = await sharp(out.bytes).metadata();
    expect([meta.width, meta.height]).toEqual([300, 200]);
    expect(meta.exif).toBeUndefined();
  });

  it("не картинка — ошибка", async () => {
    await expect(optimizeImage(new Uint8Array(100))).rejects.toThrow();
  });
});

describe("хранилище", () => {
  it("с ключами Supabase — Supabase Storage, без них — public/uploads", () => {
    expect(createStorage({ SUPABASE_URL: "https://x.supabase.co", SUPABASE_SECRET_KEY: "sb_secret_x" })).toBeInstanceOf(SupabaseStorage);
    expect(createStorage({ SUPABASE_URL: "https://x.supabase.co" })).toBeInstanceOf(LocalStorage);
    expect(createStorage({})).toBeInstanceOf(LocalStorage);
  });

  it("Supabase: кладёт в папку приглашения со случайным именем, ключом в заголовках, возвращает публичный URL", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ Key: "uploads/x" }), { status: 200 }));
    const store = new SupabaseStorage("https://proj.supabase.co", "sb_secret_test", "uploads", fetchMock as unknown as typeof fetch);
    const url = await store.save({ name: "a.png", type: "image/webp", bytes: new Uint8Array([1, 2, 3]), folder: "inv/abc" });
    expect(url).toMatch(/^https:\/\/proj\.supabase\.co\/storage\/v1\/object\/public\/uploads\/inv\/abc\/[0-9a-f-]{36}\.webp$/);
    const [reqUrl, init] = fetchMock.mock.calls[0];
    expect(String(reqUrl)).toMatch(/\/storage\/v1\/object\/uploads\/inv\/abc\/[0-9a-f-]{36}\.webp$/);
    const headers = new Headers(init.headers);
    expect(headers.get("apikey")).toBe("sb_secret_test");
    expect(headers.get("cache-control")).toContain("31536000");
  });

  it("Supabase вернул ошибку — save бросает её дальше", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(JSON.stringify({ statusCode: "403", error: "Unauthorized", message: "bad key" }), { status: 403 }));
    const store = new SupabaseStorage("https://proj.supabase.co", "wrong", "uploads", fetchMock as unknown as typeof fetch);
    await expect(store.save({ name: "a", type: "image/webp", bytes: new Uint8Array([1]) })).rejects.toThrow(/Хранилище/);
  });
});
