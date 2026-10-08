import sharp from "sharp";
import { afterEach, describe, expect, it, vi } from "vitest";
import { updateBlock } from "@/lib/blocks";
import { createDefaultInvitation } from "@/lib/defaults";
import { loadInvitationImage, SHARE_IMAGE, shareImage } from "@/lib/shareImage";

afterEach(() => vi.unstubAllGlobals());

describe("картинка превью ссылки", () => {
  it("свои файлы читаются из public/, выйти за его пределы нельзя", async () => {
    expect(await loadInvitationImage("/library/red-roses.webp")).toBeInstanceOf(Buffer);
    expect(await loadInvitationImage("/../package.json")).toBeNull();
    expect(await loadInvitationImage("/%2e%2e/package.json")).toBeNull();
    expect(await loadInvitationImage("/library/no-such-file.webp")).toBeNull();
  });

  it("чужие адреса не скачиваются — только наш бакет Supabase", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(new Uint8Array([1, 2, 3])));
    vi.stubGlobal("fetch", fetchMock);
    const env = { SUPABASE_URL: "https://proj.supabase.co" };
    expect(await loadInvitationImage("https://evil.example/x.webp", env)).toBeNull();
    expect(await loadInvitationImage("http://169.254.169.254/latest", env)).toBeNull();
    expect(await loadInvitationImage("https://proj.supabase.co/storage/v1/object/public/uploads/a.webp", {})).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(await loadInvitationImage("https://proj.supabase.co/storage/v1/object/public/uploads/a.webp", env)).toEqual(
      Buffer.from([1, 2, 3]),
    );
  });

  it("JPEG 1200×630 — и с фото, и без него (украшение на цвете палитры)", async () => {
    const data = createDefaultInvitation();
    for (const variant of [data, updateBlock(data, "hero", { photo: "/templates/boarding-couple.webp" })]) {
      const meta = await sharp(await shareImage(variant)).metadata();
      expect(meta).toMatchObject({ format: "jpeg", width: SHARE_IMAGE.width, height: SHARE_IMAGE.height });
    }
  });
});
