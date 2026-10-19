import { beforeEach, describe, expect, it } from "vitest";
import { GET, PATCH, POST } from "@/app/api/invitations/[key]/rsvp/route";
import { prisma } from "@/lib/db";
import { createInvitation } from "@/lib/invitations";
import { hashRsvpSecret } from "@/lib/rsvpSecret";
import { ctx, jsonRequest, resetDb } from "./helpers";

beforeEach(resetDb);

const answer = { name: "Ольга", attending: true, guestsCount: 2, comment: "Будем!" };
const send = (slug: string, body: unknown, ip = "1.1.1.1") =>
  POST(jsonRequest(`/api/invitations/${slug}/rsvp`, "POST", body, { "x-forwarded-for": ip }), ctx(slug));
const edit = (slug: string, body: unknown, ip = "1.1.1.1") =>
  PATCH(jsonRequest(`/api/invitations/${slug}/rsvp`, "PATCH", body, { "x-forwarded-for": ip }), ctx(slug));
const stats = async (inv: { id: string; editToken: string }) =>
  (await (await GET(jsonRequest(`/api/invitations/${inv.id}/rsvp?token=${inv.editToken}`, "GET"), ctx(inv.id))).json()).stats;

describe("POST /api/invitations/[slug]/rsvp", () => {
  it("сохраняет ответ", async () => {
    const inv = await createInvitation();
    const res = await send(inv.slug, answer);
    expect(res.status).toBe(201);
    const rows = await prisma.rsvp.findMany({ where: { invitationId: inv.id } });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ name: "Ольга", attending: true, guestsCount: 2, comment: "Будем!" });
  });

  it("отдаёт id и секрет для правки, в базе — только хэш секрета", async () => {
    const inv = await createInvitation();
    const body = await (await send(inv.slug, answer)).json();
    expect(body).toEqual({ id: expect.any(String), secret: expect.any(String) });
    expect(body.secret.length).toBeGreaterThanOrEqual(32);
    const row = await prisma.rsvp.findUniqueOrThrow({ where: { id: body.id } });
    expect(row.editSecretHash).toBe(hashRsvpSecret(body.secret));
    expect(JSON.stringify(row)).not.toContain(body.secret);
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

describe("PATCH /api/invitations/[slug]/rsvp — гость меняет свой ответ", () => {
  it("с id и секретом обновляет ту же запись: строк одна, «Всего гостей» по новому ответу", async () => {
    const inv = await createInvitation();
    const { id, secret } = await (await send(inv.slug, answer)).json();

    const res = await edit(inv.slug, { id, secret, name: "Ольга И.", attending: true, guestsCount: 4, comment: "" });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ id });
    const rows = await prisma.rsvp.findMany({ where: { invitationId: inv.id } });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ id, name: "Ольга И.", guestsCount: 4, comment: null });
    expect(await stats(inv)).toEqual({ attending: 1, notAttending: 0, totalGuests: 4 });

    // Передумал — отказ: гостей этой записи в сумме больше нет.
    await edit(inv.slug, { id, secret, name: "Ольга И.", attending: false, guestsCount: 1 });
    expect(await stats(inv)).toEqual({ attending: 0, notAttending: 1, totalGuests: 0 });
    expect(await prisma.rsvp.count()).toBe(1);
  });

  it("неверный секрет, чужое приглашение или ответ без секрета → 404, запись не меняется", async () => {
    const inv = await createInvitation();
    const other = await createInvitation();
    const { id, secret } = await (await send(inv.slug, answer)).json();
    const changed = { name: "Взлом", attending: false, guestsCount: 1 };

    expect((await edit(inv.slug, { ...changed, id, secret: "x".repeat(32) })).status).toBe(404);
    expect((await edit(other.slug, { ...changed, id, secret })).status).toBe(404);
    const old = await prisma.rsvp.create({
      data: { invitationId: inv.id, name: "Старый", attending: true, guestsCount: 1 },
    });
    expect((await edit(inv.slug, { ...changed, id: old.id, secret })).status).toBe(404);

    expect(await prisma.rsvp.findUniqueOrThrow({ where: { id } })).toMatchObject({ name: "Ольга", guestsCount: 2 });
  });

  it("honeypot, невалидные данные и нет секрета → 400", async () => {
    const inv = await createInvitation();
    const { id, secret } = await (await send(inv.slug, answer)).json();
    expect((await edit(inv.slug, { ...answer, id, secret, website: "http://spam.example" })).status).toBe(400);
    expect((await edit(inv.slug, { ...answer, id, secret, guestsCount: 0 })).status).toBe(400);
    expect((await edit(inv.slug, { ...answer, id })).status).toBe(400);
    expect(await prisma.rsvp.findUniqueOrThrow({ where: { id } })).toMatchObject({ guestsCount: 2 });
  });

  it("правки входят в общий лимит 5 ответов в минуту с IP", async () => {
    const inv = await createInvitation();
    const { id, secret } = await (await send(inv.slug, answer)).json();
    for (let i = 0; i < 4; i++) expect((await edit(inv.slug, { ...answer, id, secret })).status).toBe(200);
    expect((await edit(inv.slug, { ...answer, id, secret })).status).toBe(429);
  });

  it("несуществующий slug → 404", async () => {
    expect((await edit("no-such-slug", { ...answer, id: "x", secret: "x".repeat(32) })).status).toBe(404);
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
    expect(body.rsvps[0]).not.toHaveProperty("editSecretHash");
    expect(body.stats).toEqual({ attending: 1, notAttending: 1, totalGuests: 2 });
  });
});
