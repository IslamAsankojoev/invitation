import { beforeEach, describe, expect, it } from "vitest";
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
