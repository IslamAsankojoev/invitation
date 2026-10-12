import { spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, afterEach, beforeEach, describe, expect, it } from "vitest";
import { DELETE as CANCEL } from "@/app/api/admin/[key]/jobs/[id]/route";
import { POST as RESET_DRAFT } from "@/app/api/admin/[key]/templates/[id]/draft/route";
import { DELETE, PATCH, POST, PUT } from "@/app/api/admin/[key]/templates/[id]/route";
import { DELETE as DELETE_VIDEO, GET as GET_VIDEO } from "@/app/api/admin/[key]/videos/[name]/route";
import { GET as MEDIA, POST as RECORD } from "@/app/api/admin/[key]/videos/route";
import { findBlock, updateBlock } from "@/lib/blocks";
import { getInvitationBySlug } from "@/lib/invitations";
import { draftSlug } from "@/lib/templateAdmin";
import { ensureDraft } from "@/lib/templateDrafts";
import { createFromTemplate, findTemplate } from "@/lib/templates";
import { isFinished, listJobs, setRunner } from "@/lib/videoJobs";
import { jsonRequest, resetDb } from "./helpers";

const KEY = "admin-test-key-0123456789";
const env = { ...process.env };
let root = "";

const tpl = (id: string, key = KEY) => ({ params: Promise.resolve({ key, id }) });
const video = (name: string, key = KEY) => ({ params: Promise.resolve({ key, name }) });
const keyOnly = (key = KEY) => ({ params: Promise.resolve({ key }) });
const overrides = () => JSON.parse(readFileSync(path.join(root, "src/lib/template-overrides.json"), "utf8"));
const VIDEO = "mocha--2026-01-01_10-00-00.mp4";

beforeEach(async () => {
  await resetDb();
  root = mkdtempSync(path.join(tmpdir(), "inv-admin-"));
  for (const dir of ["src/lib", "public/uploads", "public/templates", "public/library", "videos"]) mkdirSync(path.join(root, dir), { recursive: true });
  writeFileSync(path.join(root, "src/lib/template-overrides.json"), JSON.stringify({ edited: {}, added: [] }));
  writeFileSync(path.join(root, "public/library/CREDITS.md"), "# Источники\n");
  writeFileSync(path.join(root, "public/uploads/couple.webp"), "webp-bytes");
  writeFileSync(path.join(root, "videos", VIDEO), Buffer.from(Array.from({ length: 100 }, (_, i) => i)));
  process.env.ADMIN_KEY = KEY;
  process.env.ADMIN_ROOT = root;
  delete process.env.VERCEL;
});

afterEach(() => {
  rmSync(root, { recursive: true, force: true });
  process.env.ADMIN_KEY = env.ADMIN_KEY;
  process.env.ADMIN_ROOT = env.ADMIN_ROOT;
  if (env.ADMIN_KEY === undefined) delete process.env.ADMIN_KEY;
  if (env.ADMIN_ROOT === undefined) delete process.env.ADMIN_ROOT;
});

afterAll(() => setRunner(null));

describe("админка: доступ", () => {
  it("неверный ключ, нет ADMIN_KEY или Vercel — 404", async () => {
    expect((await MEDIA(jsonRequest("/api/admin/x/videos", "GET"), keyOnly("wrong-key-wrong-key"))).status).toBe(404);
    process.env.VERCEL = "1";
    expect((await MEDIA(jsonRequest("/api/admin/x/videos", "GET"), keyOnly())).status).toBe(404);
    delete process.env.VERCEL;
    delete process.env.ADMIN_KEY;
    expect((await DELETE(jsonRequest("/api/admin/x/templates/mocha", "DELETE"), tpl("mocha"))).status).toBe(404);
  });
});

describe("админка: шаблоны", () => {
  it("«Сохранить в шаблон»: черновик становится шаблоном, свои фото копируются в public/templates со строкой в CREDITS.md", async () => {
    const draft = updateBlock(createFromTemplate(findTemplate("mocha")!), "hero", { names: "Мария & Пётр", photo: "/uploads/couple.webp" });
    const res = await PUT(jsonRequest("/api/admin/k/templates/mocha", "PUT", { data: draft }), tpl("mocha"));
    expect(res.status).toBe(200);
    const body = await res.json();
    const copy = body.replaced["/uploads/couple.webp"];
    expect(copy).toMatch(/^\/templates\/mocha-[0-9a-f]{8}\.webp$/);
    expect(readFileSync(path.join(root, "public", copy), "utf8")).toBe("webp-bytes");
    expect(readFileSync(path.join(root, "public/library/CREDITS.md"), "utf8")).toContain(`| \`${copy.split("/").pop()}\` | Фото шаблона «Шоколад и сургуч» | — | уточняется`);
    const saved = overrides().edited.mocha;
    expect(findBlock(createFromTemplate(saved), "hero")).toMatchObject({ names: "Мария & Пётр", photo: copy });
  });

  it("сохранение без отличий от кода не хранит правку; кривые данные — 400; неизвестный шаблон — 404", async () => {
    const same = createFromTemplate(findTemplate("lago")!);
    expect((await PUT(jsonRequest("/api/admin/k/templates/lago", "PUT", { data: same }), tpl("lago"))).status).toBe(200);
    expect(overrides().edited).toEqual({});
    expect((await PUT(jsonRequest("/api/admin/k/templates/lago", "PUT", { data: { blocks: "x" } }), tpl("lago"))).status).toBe(400);
    expect((await PUT(jsonRequest("/api/admin/k/templates/nope", "PUT", { data: same }), tpl("nope"))).status).toBe(404);
  });

  it("название, копия, удаление копии и сброс правок (вместе с черновиком)", async () => {
    const renamed = await PATCH(jsonRequest("/api/admin/k/templates/mocha", "PATCH", { name: "Шоколад", description: "Тёмный и кремовый" }), tpl("mocha"));
    expect(renamed.status).toBe(200);
    expect(overrides().edited.mocha).toMatchObject({ name: "Шоколад", description: "Тёмный и кремовый" });
    expect((await PATCH(jsonRequest("/api/admin/k/templates/mocha", "PATCH", { name: " ", description: "" }), tpl("mocha"))).status).toBe(400);

    const dup = await POST(jsonRequest("/api/admin/k/templates/mocha", "POST"), tpl("mocha"));
    expect(dup.status).toBe(201);
    const { template } = await dup.json();
    expect(template).toMatchObject({ id: "mocha-2", name: "Шоколад (копия)" });
    expect(overrides().added.map((t: { id: string }) => t.id)).toEqual(["mocha-2"]);
    expect((await DELETE(jsonRequest("/api/admin/k/templates/mocha-2", "DELETE"), tpl("mocha-2"))).status).toBe(204);
    expect(overrides().added).toEqual([]);

    await ensureDraft(findTemplate("mocha")!);
    expect((await DELETE(jsonRequest("/api/admin/k/templates/mocha", "DELETE"), tpl("mocha"))).status).toBe(204);
    expect(overrides().edited).toEqual({});
    expect(await getInvitationBySlug(draftSlug("mocha"))).toBeNull();
    expect((await DELETE(jsonRequest("/api/admin/k/templates/mocha", "DELETE"), tpl("mocha"))).status).toBe(404);
  });

  it("«Начать заново»: черновик снова как шаблон", async () => {
    const draft = await ensureDraft(findTemplate("mocha")!);
    const { updateInvitation } = await import("@/lib/invitations");
    await updateInvitation(draft.id, { data: updateBlock(draft.data, "hero", { names: "Черновик" }) });
    const res = await RESET_DRAFT(jsonRequest("/api/admin/k/templates/mocha/draft", "POST"), tpl("mocha"));
    expect(res.status).toBe(200);
    expect(findBlock((await getInvitationBySlug(draftSlug("mocha")))!.data, "hero")!.names).toBe("Санжар & Мадина");
  });
});

describe("админка: видео", () => {
  it("список, отдача целиком и кусками (Range), скачивание, удаление; чужие имена — 404", async () => {
    const media = await (await MEDIA(jsonRequest("/api/admin/k/videos", "GET"), keyOnly())).json();
    expect(media.videos).toMatchObject([{ name: VIDEO, templateId: "mocha", fullscreen: false, sound: false, size: 100 }]);

    const full = await GET_VIDEO(jsonRequest(`/api/admin/k/videos/${VIDEO}`, "GET"), video(VIDEO));
    expect(full.status).toBe(200);
    expect(new Uint8Array(await full.arrayBuffer())).toHaveLength(100);

    const part = await GET_VIDEO(new Request(`http://localhost/api/admin/k/videos/${VIDEO}`, { headers: { range: "bytes=10-19" } }), video(VIDEO));
    expect(part.status).toBe(206);
    expect(part.headers.get("content-range")).toBe("bytes 10-19/100");
    expect([...new Uint8Array(await part.arrayBuffer())]).toEqual([10, 11, 12, 13, 14, 15, 16, 17, 18, 19]);
    const tail = await GET_VIDEO(new Request(`http://localhost/api/admin/k/videos/${VIDEO}`, { headers: { range: "bytes=-5" } }), video(VIDEO));
    expect([...new Uint8Array(await tail.arrayBuffer())]).toEqual([95, 96, 97, 98, 99]);
    expect((await GET_VIDEO(new Request(`http://localhost/x`, { headers: { range: "bytes=500-" } }), video(VIDEO))).status).toBe(416);

    const download = await GET_VIDEO(jsonRequest(`/api/admin/k/videos/${VIDEO}?download`, "GET"), video(VIDEO));
    expect(download.headers.get("content-disposition")).toBe(`attachment; filename="${VIDEO}"`);
    await download.body?.cancel();

    for (const bad of ["../.env", ".env", "x.mov"]) expect((await GET_VIDEO(jsonRequest("/api/admin/k/videos/x", "GET"), video(bad))).status, bad).toBe(404);
    expect((await DELETE_VIDEO(jsonRequest(`/api/admin/k/videos/${VIDEO}`, "DELETE"), video(VIDEO))).status).toBe(204);
    expect(readdirSync(path.join(root, "videos"))).toEqual([]);
    expect((await DELETE_VIDEO(jsonRequest(`/api/admin/k/videos/${VIDEO}`, "DELETE"), video(VIDEO))).status).toBe(404);
  });

  it("запись: без SHOWCASE_KEY — 409; с ним ставится в очередь с адресом этого сайта; отмена", async () => {
    const showcase = process.env.SHOWCASE_KEY;
    delete process.env.SHOWCASE_KEY;
    const body = { templates: ["mocha"], fullscreen: true, bg: "#111111" };
    expect((await RECORD(jsonRequest("/api/admin/k/videos", "POST", body), keyOnly())).status).toBe(409);
    process.env.SHOWCASE_KEY = "showcase-key-0123456789";
    const calls: string[][] = [];
    setRunner((args) => {
      calls.push(args);
      return spawn(process.execPath, ["-e", "setTimeout(() => {}, 10000)"]);
    });
    try {
      expect((await RECORD(jsonRequest("/api/admin/k/videos", "POST", { ...body, templates: ["nope"] }), keyOnly())).status).toBe(404);
      expect((await RECORD(jsonRequest("/api/admin/k/videos", "POST", { ...body, bg: "red" }), keyOnly())).status).toBe(400);
      const res = await RECORD(jsonRequest("/api/admin/k/videos", "POST", { ...body, sound: true }), keyOnly());
      expect(res.status).toBe(202);
      const [job] = (await res.json()).jobs;
      expect(job).toMatchObject({ templateId: "mocha", templateName: "Шоколад и сургуч", fullscreen: true, sound: true });
      expect(job.file).toMatch(/--full--sound\.mp4$/);
      expect(calls[0]).toEqual(["mocha", "--base", "http://localhost", "--name", job.file, "--bg", "#111111", "--fullscreen", "--audio"]);
      expect((await CANCEL(jsonRequest(`/api/admin/k/jobs/${job.id}`, "DELETE"), tpl(job.id))).status).toBe(204);
      const start = Date.now();
      while (!listJobs().every(isFinished) && Date.now() - start < 5000) await new Promise((r) => setTimeout(r, 20));
      expect(listJobs().find((j) => j.id === job.id)!.stage).toBe("canceled");
    } finally {
      if (showcase === undefined) delete process.env.SHOWCASE_KEY;
      else process.env.SHOWCASE_KEY = showcase;
    }
  });
});

it("временная папка админки не задевает файлы проекта", () => {
  expect(existsSync(path.join(process.cwd(), "src/lib/template-overrides.json"))).toBe(true);
});
