import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { generateMetadata } from "@/app/i/[slug]/layout";
import Image from "@/app/i/[slug]/opengraph-image";
import { updateBlock } from "@/lib/blocks";
import { createDefaultInvitation } from "@/lib/defaults";
import { createInvitation } from "@/lib/invitations";
import { resetDb } from "./helpers";

beforeEach(resetDb);
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const data = updateBlock(
  updateBlock(createDefaultInvitation(), "hero", { names: "Айбек & Айзада", date: "2027-06-19T16:00", photo: "/templates/lago-walk.webp" }),
  "location",
  { placeName: "Ресторан «Сад»" },
);
const params = (slug: string) => ({ params: Promise.resolve({ slug }) });

describe("превью ссылки /i/<slug>", () => {
  it("метаданные: заголовок, «дата · место», абсолютные ссылки от SITE_URL", async () => {
    vi.stubEnv("SITE_URL", "https://keleber.kg");
    const inv = await createInvitation(data, "aibek-aizada");
    const meta = await generateMetadata(params(inv.slug));
    expect(meta.metadataBase?.toString()).toBe("https://keleber.kg/");
    expect(meta.title).toBe("Айбек & Айзада — приглашение");
    expect(meta.description).toBe("19 июня 2027, 16:00 · Ресторан «Сад»");
    expect(meta.openGraph).toMatchObject({ url: "/i/aibek-aizada", title: "Айбек & Айзада — приглашение", locale: "ru_RU" });
    expect(await generateMetadata(params("no-such"))).toEqual({ title: "Приглашение" });
  });

  it("картинка 1200×630 в JPEG с фото обложки — и без сети (шрифты Google недоступны)", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("fetch failed")));
    vi.spyOn(console, "error").mockImplementation(() => {});
    const inv = await createInvitation(data);
    const res = await Image({ params: { slug: inv.slug } });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/jpeg");
    const bytes = Buffer.from(await res.arrayBuffer());
    expect(await sharp(bytes).metadata()).toMatchObject({ format: "jpeg", width: 1200, height: 630 });
    expect(bytes.length).toBeLessThan(300_000);

    expect((await Image({ params: { slug: "no-such" } })).status).toBe(404);
  }, 30_000);
});
