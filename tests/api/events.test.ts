import { beforeEach, describe, expect, it } from "vitest";
import { POST } from "@/app/api/events/route";
import { prisma } from "@/lib/db";
import { createInvitation } from "@/lib/invitations";
import { loadStats, statsKeyValid, track } from "@/lib/track";
import { jsonRequest, resetDb } from "./helpers";

beforeEach(resetDb);

const send = (body: unknown, ip = "1.1.1.1") => POST(jsonRequest("/api/events", "POST", body, { "x-forwarded-for": ip }));
const VISITOR = "0b6f3c1e-9a7d-4c1b-8f7e-2d5a6b9c0e11";

describe("POST /api/events", () => {
  it("гость открыл приглашение → событие с id приглашения и id браузера", async () => {
    const inv = await createInvitation();
    const res = await send({ name: "guest_view", slug: inv.slug, visitorId: VISITOR });
    expect(res.status).toBe(204);
    const rows = await prisma.event.findMany({ where: { name: "guest_view" } });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ invitationId: inv.id, visitorId: VISITOR, props: null });
  });

  it("поделились ссылкой → канал в props", async () => {
    const inv = await createInvitation();
    expect((await send({ name: "share_clicked", slug: inv.slug, channel: "whatsapp" })).status).toBe(204);
    expect(await prisma.event.findFirst({ where: { name: "share_clicked" } })).toMatchObject({ props: { channel: "whatsapp" } });
  });

  it("неизвестное событие, создание из браузера и кривой id браузера → 400", async () => {
    const inv = await createInvitation();
    expect((await send({ name: "hacked", slug: inv.slug })).status).toBe(400);
    expect((await send({ name: "invitation_created", slug: inv.slug })).status).toBe(400);
    expect((await send({ name: "guest_view", slug: inv.slug, visitorId: "<script>" })).status).toBe(400);
    expect((await send(null)).status).toBe(400);
    expect(await prisma.event.count({ where: { invitationId: inv.id, name: { not: "invitation_created" } } })).toBe(0);
  });

  it("несуществующая ссылка → 404", async () => {
    expect((await send({ name: "guest_view", slug: "no-such-slug" })).status).toBe(404);
  });

  it("не больше 60 событий с одного IP в минуту", async () => {
    const inv = await createInvitation();
    for (let i = 0; i < 60; i++) expect((await send({ name: "envelope_opened", slug: inv.slug })).status).toBe(204);
    expect((await send({ name: "envelope_opened", slug: inv.slug })).status).toBe(429);
    expect((await send({ name: "envelope_opened", slug: inv.slug }, "2.2.2.2")).status).toBe(204);
  });
});

describe("loadStats", () => {
  it("воронка по приглашениям за период: поделились, открыли гости, ответили; гостей в среднем", async () => {
    const a = await createInvitation();
    const b = await createInvitation();
    const old = await createInvitation();
    await track("invitation_created", { invitationId: a.id, props: { template: "rose-garden" } });
    await track("invitation_created", { invitationId: b.id, props: { template: "lago" } });
    await prisma.event.create({
      data: { name: "invitation_created", invitationId: old.id, createdAt: new Date(Date.now() - 40 * 86_400_000) },
    });
    await track("share_clicked", { invitationId: a.id, props: { channel: "copy" } });
    await track("guest_view", { invitationId: a.id, visitorId: "v-aaaaaaaa1" });
    await track("guest_view", { invitationId: a.id, visitorId: "v-aaaaaaaa1" });
    await track("guest_view", { invitationId: a.id, visitorId: "v-bbbbbbbb2" });
    await track("guest_view", { invitationId: old.id, visitorId: "v-cccccccc3" });
    await prisma.rsvp.create({ data: { invitationId: a.id, name: "Ольга", attending: true, guestsCount: 1 } });

    const stats = await loadStats(30);
    expect(stats.total).toEqual({ created: 2, shared: 1, viewed: 1, answered: 1 });
    expect(stats.byTemplate.map((r) => r.value).sort()).toEqual(["lago", "rose-garden"]);
    expect(stats.averageGuests).toBe(2);
    expect((await loadStats(90)).total.created).toBe(3);
  });
});

describe("statsKeyValid", () => {
  it("ключ из env не короче 16 символов, иначе страницы нет", () => {
    expect(statsKeyValid("x".repeat(16), "x".repeat(16))).toBe(true);
    expect(statsKeyValid("short", "short")).toBe(false);
    expect(statsKeyValid("x".repeat(16), undefined)).toBe(false);
    expect(statsKeyValid("y".repeat(16), "x".repeat(16))).toBe(false);
  });
});
