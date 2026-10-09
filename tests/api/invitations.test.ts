import { beforeEach, describe, expect, it } from "vitest";
import { GET, PATCH } from "@/app/api/invitations/[key]/route";
import { POST as CREATE } from "@/app/api/invitations/route";
import { findBlock, updateBlock } from "@/lib/blocks";
import { createDefaultInvitation } from "@/lib/defaults";
import { createInvitation, getInvitationById, resolveSlug } from "@/lib/invitations";
import { createFromTemplate, findTemplate } from "@/lib/templates";
import { ctx, jsonRequest, resetDb } from "./helpers";

beforeEach(resetDb);

describe("POST /api/invitations", () => {
  it("создаёт приглашение с дефолтными данными", async () => {
    const res = await CREATE(jsonRequest("/api/invitations", "POST"));
    expect(res.status).toBe(201);
    const body = await res.json();
    expect(body.editUrl).toBe(`/edit/${body.id}?token=${body.editToken}`);
    const saved = await getInvitationById(body.id);
    expect(saved?.data).toEqual(createDefaultInvitation());
  });

  it("создаёт приглашение по выбранному шаблону", async () => {
    const res = await CREATE(jsonRequest("/api/invitations", "POST", { template: "starry-night" }));
    expect(res.status).toBe(201);
    const saved = await getInvitationById((await res.json()).id);
    expect(saved?.data).toEqual(createFromTemplate(findTemplate("starry-night")!));
    expect(saved?.data.theme.palette).toBe("night");
  });

  it("неизвестный шаблон или битый JSON → 400", async () => {
    expect((await CREATE(jsonRequest("/api/invitations", "POST", { template: "nope" }))).status).toBe(400);
    const broken = new Request("http://localhost/api/invitations", { method: "POST", body: "{oops" });
    expect((await CREATE(broken)).status).toBe(400);
  });
});

describe("GET /api/invitations/[id]", () => {
  it("возвращает данные без editToken", async () => {
    const inv = await createInvitation();
    const res = await GET(jsonRequest(`/api/invitations/${inv.id}`, "GET"), ctx(inv.id));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.slug).toBe(inv.slug);
    expect(body.editToken).toBeUndefined();
  });
});

describe("PATCH /api/invitations/[id]", () => {
  it("без token → 403", async () => {
    const inv = await createInvitation();
    const res = await PATCH(jsonRequest(`/api/invitations/${inv.id}`, "PATCH", { data: inv.data }), ctx(inv.id));
    expect(res.status).toBe(403);
  });

  it("с неверным token → 403", async () => {
    const inv = await createInvitation();
    const res = await PATCH(
      jsonRequest(`/api/invitations/${inv.id}?token=wrong`, "PATCH", { data: inv.data }),
      ctx(inv.id),
    );
    expect(res.status).toBe(403);
  });

  it("с невалидными данными → 400 и понятные ошибки, данные не меняются", async () => {
    const inv = await createInvitation();
    const bad = structuredClone(updateBlock(inv.data, "hero", { names: "" }));
    bad.theme.decor.density = 100;
    const res = await PATCH(
      jsonRequest(`/api/invitations/${inv.id}?token=${inv.editToken}`, "PATCH", { data: bad }),
      ctx(inv.id),
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.details).toEqual(
      expect.arrayContaining([expect.stringContaining("Укажите имена"), expect.stringContaining("Плотность")]),
    );
    expect((await getInvitationById(inv.id))?.data).toEqual(inv.data);
  });

  it("с валидными данными → 200 и данные сохранены", async () => {
    const inv = await createInvitation();
    const next = updateBlock(inv.data, "hero", { names: "Мария & Пётр" });
    const res = await PATCH(
      jsonRequest(`/api/invitations/${inv.id}?token=${inv.editToken}`, "PATCH", { data: next }),
      ctx(inv.id),
    );
    expect(res.status).toBe(200);
    const saved = await getInvitationById(inv.id);
    expect(findBlock(saved!.data, "hero")!.names).toBe("Мария & Пётр");
  });

  it("меняет slug; неверный формат → 400, занятый → 409", async () => {
    const a = await createInvitation();
    const b = await createInvitation();
    const patch = (slug: string) =>
      PATCH(jsonRequest(`/api/invitations/${a.id}?token=${a.editToken}`, "PATCH", { slug }), ctx(a.id));

    expect((await patch("Bad Slug")).status).toBe(400);
    expect((await patch(b.slug)).status).toBe(409);
    expect((await patch("anna-ivan")).status).toBe(200);
    expect((await getInvitationById(a.id))?.slug).toBe("anna-ivan");
  });

  it("прежний адрес ведёт на новый и не достаётся другому приглашению; вернуться к нему можно", async () => {
    const a = await createInvitation();
    const b = await createInvitation();
    const first = a.slug;
    const patchA = (slug: string) => PATCH(jsonRequest(`/api/invitations/${a.id}?token=${a.editToken}`, "PATCH", { slug }), ctx(a.id));
    const patchB = (slug: string) => PATCH(jsonRequest(`/api/invitations/${b.id}?token=${b.editToken}`, "PATCH", { slug }), ctx(b.id));

    expect((await patchA("aibek-aizada")).status).toBe(200);
    expect(await resolveSlug(first)).toEqual({ redirectTo: "aibek-aizada" });
    expect(await resolveSlug("aibek-aizada")).toMatchObject({ invitation: { id: a.id } });
    expect((await patchB(first)).status).toBe(409);

    // Ещё раз сменили — обе прежние ссылки ведут на текущую.
    expect((await patchA("aibek-aizada-2027")).status).toBe(200);
    expect(await resolveSlug(first)).toEqual({ redirectTo: "aibek-aizada-2027" });
    expect(await resolveSlug("aibek-aizada")).toEqual({ redirectTo: "aibek-aizada-2027" });

    // Вернулись к первой — она снова основная.
    expect((await patchA(first)).status).toBe(200);
    expect(await resolveSlug(first)).toMatchObject({ invitation: { id: a.id } });
    expect(await resolveSlug("nobody-here")).toBeNull();
  });
});
