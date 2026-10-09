import { beforeEach, describe, expect, it } from "vitest";
import { DELETE, PUT } from "@/app/api/invitations/[key]/rsvp/[rsvpId]/route";
import { GET, POST } from "@/app/api/invitations/[key]/rsvp/route";
import { prisma } from "@/lib/db";
import { createInvitation } from "@/lib/invitations";
import { ctx, jsonRequest, resetDb } from "./helpers";

beforeEach(resetDb);

const answer = { name: "Ольга", attending: true, guestsCount: 2, comment: "Будем!" };
const send = (slug: string, body: unknown, ip = "1.1.1.1") =>
  POST(jsonRequest(`/api/invitations/${slug}/rsvp`, "POST", body, { "x-forwarded-for": ip }), ctx(slug));

describe("POST /api/invitations/[slug]/rsvp", () => {
  it("сохраняет ответ", async () => {
    const inv = await createInvitation();
    const res = await send(inv.slug, answer);
    expect(res.status).toBe(201);
    const rows = await prisma.rsvp.findMany({ where: { invitationId: inv.id } });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ name: "Ольга", attending: true, guestsCount: 2, comment: "Будем!" });
  });

  it("honeypot заполнен → ответ отклонён и не сохранён", async () => {
    const inv = await createInvitation();
    const res = await send(inv.slug, { ...answer, website: "http://spam.example" });
    expect(res.status).toBe(400);
    expect(await prisma.rsvp.count()).toBe(0);
  });

  it("невалидные данные → 400", async () => {
    const inv = await createInvitation();
    const res = await send(inv.slug, { ...answer, guestsCount: 11 });
    expect(res.status).toBe(400);
    expect((await res.json()).details[0]).toMatch(/guestsCount/);
  });

  it("не больше 5 ответов с одного IP в минуту", async () => {
    const inv = await createInvitation();
    for (let i = 0; i < 5; i++) expect((await send(inv.slug, answer)).status).toBe(201);
    expect((await send(inv.slug, answer)).status).toBe(429);
    expect((await send(inv.slug, answer, "2.2.2.2")).status).toBe(201);
  });

  it("несуществующий slug → 404", async () => {
    expect((await send("no-such-slug", answer)).status).toBe(404);
  });
});

describe("GET /api/invitations/[id]/rsvp", () => {
  it("требует token и возвращает ответы со статистикой", async () => {
    const inv = await createInvitation();
    await send(inv.slug, answer);
    await send(inv.slug, { name: "Пётр", attending: false, guestsCount: 1 });

    const denied = await GET(jsonRequest(`/api/invitations/${inv.id}/rsvp`, "GET"), ctx(inv.id));
    expect(denied.status).toBe(403);

    const res = await GET(jsonRequest(`/api/invitations/${inv.id}/rsvp?token=${inv.editToken}`, "GET"), ctx(inv.id));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.rsvps).toHaveLength(2);
    expect(body.stats).toEqual({ attending: 1, notAttending: 1, totalGuests: 2 });
  });
});

describe("правка и удаление ответа", () => {
  const put = (slug: string, id: string, body: unknown) =>
    PUT(jsonRequest(`/api/invitations/${slug}/rsvp/${id}`, "PUT", body, { "x-forwarded-for": "2.2.2.2" }), {
      params: Promise.resolve({ key: slug, rsvpId: id }),
    });
  const del = (invId: string, id: string, token?: string) =>
    DELETE(jsonRequest(`/api/invitations/${invId}/rsvp/${id}${token ? `?token=${token}` : ""}`, "DELETE"), {
      params: Promise.resolve({ key: invId, rsvpId: id }),
    });

  it("гость правит свой ответ по editKey — та же запись, без второй; чужой ключ — 404", async () => {
    const inv = await createInvitation();
    const { id, editKey } = await (await send(inv.slug, answer)).json();
    expect(editKey).toEqual(expect.any(String));

    expect((await put(inv.slug, id, { ...answer, editKey: "чужой" })).status).toBe(404);
    const res = await put(inv.slug, id, { name: "Ольга", attending: false, guestsCount: 1, editKey });
    expect(res.status).toBe(200);
    const rows = await prisma.rsvp.findMany({ where: { invitationId: inv.id } });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id, attending: false, comment: null });
  });

  it("ответ из другого приглашения так не поправить", async () => {
    const a = await createInvitation();
    const b = await createInvitation();
    const { id, editKey } = await (await send(a.slug, answer)).json();
    expect((await put(b.slug, id, { ...answer, editKey })).status).toBe(404);
  });

  it("организатор: добавляет ответ за гостя по token (без лимита и без editKey) и удаляет ответ; без token — 403", async () => {
    const inv = await createInvitation();
    for (let i = 0; i < 7; i++) {
      const res = await POST(jsonRequest(`/api/invitations/${inv.slug}/rsvp?token=${inv.editToken}`, "POST", answer), ctx(inv.slug));
      expect(res.status).toBe(201);
      expect((await res.json()).editKey).toBeNull();
    }
    const [row] = await prisma.rsvp.findMany({ where: { invitationId: inv.id } });
    expect((await del(inv.id, row.id)).status).toBe(403);
    expect((await del(inv.id, row.id, "wrong")).status).toBe(403);
    expect((await del(inv.id, row.id, inv.editToken)).status).toBe(204);
    expect((await del(inv.id, row.id, inv.editToken)).status).toBe(404);
    expect(await prisma.rsvp.count({ where: { invitationId: inv.id } })).toBe(6);
  });

  it("в списке для организатора нет editKey гостей", async () => {
    const inv = await createInvitation();
    await send(inv.slug, answer);
    const res = await GET(new Request(`http://localhost/api/invitations/${inv.id}/rsvp?token=${inv.editToken}`), ctx(inv.id));
    const { rsvps } = await res.json();
    expect(rsvps[0]).not.toHaveProperty("editKey");
  });
});
