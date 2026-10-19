import type { Prisma } from "@prisma/client";
import { averageGuests, funnel, funnelBy, type CreatedRow, type EventName, type ReachedRow } from "./analytics";
import { prisma } from "./db";
import { showcaseKeyValid } from "./showcase";

/**
 * Записать событие аналитики. Сбой записи не должен ломать запрос пользователя — только лог. Ждём запись (await):
 * на Vercel незаконченный промис обрывается вместе с функцией.
 */
export async function track(
  name: EventName,
  { invitationId, visitorId, props }: { invitationId?: string; visitorId?: string; props?: Prisma.InputJsonObject } = {},
): Promise<void> {
  try {
    await prisma.event.create({ data: { name, invitationId, visitorId, props } });
  } catch (error) {
    console.error("Не удалось записать событие аналитики", name, error);
  }
}

/** id приглашения по ссылке — без разбора всего JSON (событие гостя приходит на каждое открытие). */
export async function invitationIdBySlug(slug: string): Promise<string | null> {
  const row = await prisma.invitation.findUnique({ where: { slug }, select: { id: true } });
  return row?.id ?? null;
}

/** Страница статистики `/stats/<ключ>`: ключ — STATS_KEY в env (те же правила, что у показа шаблонов). */
export const statsKeyValid = (key: string, secret: string | undefined = process.env.STATS_KEY) => showcaseKeyValid(key, secret);

/** Воронка за последние `days` дней: приглашения, созданные за период, и докуда они дошли (за всё время). */
export async function loadStats(days: number, now = new Date()) {
  const since = new Date(now.getTime() - days * 86_400_000);
  const createdEvents = await prisma.event.findMany({
    where: { name: "invitation_created", createdAt: { gte: since }, invitationId: { not: null } },
    select: { invitationId: true, props: true },
  });
  const created: CreatedRow[] = createdEvents.map((e) => ({
    invitationId: e.invitationId!,
    props: e.props && typeof e.props === "object" && !Array.isArray(e.props) ? (e.props as Record<string, unknown>) : null,
  }));
  const ids = created.map((c) => c.invitationId);

  const [events, answered, visitors] = await Promise.all([
    prisma.event.groupBy({
      by: ["invitationId", "name"],
      where: { invitationId: { in: ids }, name: { in: ["share_clicked", "guest_view"] } },
    }),
    prisma.rsvp.groupBy({ by: ["invitationId"], where: { invitationId: { in: ids } } }),
    prisma.event.groupBy({
      by: ["invitationId", "visitorId"],
      where: { invitationId: { in: ids }, name: "guest_view", visitorId: { not: null } },
    }),
  ]);

  const reached: ReachedRow[] = [
    ...events.map((e) => ({ invitationId: e.invitationId!, step: e.name === "share_clicked" ? ("shared" as const) : ("viewed" as const) })),
    ...answered.map((r) => ({ invitationId: r.invitationId, step: "answered" as const })),
  ];
  return {
    total: funnel(created, reached),
    byTemplate: funnelBy("template", created, reached),
    byEventType: funnelBy("eventType", created, reached),
    byLanguage: funnelBy("lang", created, reached),
    averageGuests: averageGuests(visitors.map((v) => ({ invitationId: v.invitationId!, visitorId: v.visitorId }))),
  };
}

export type Stats = Awaited<ReturnType<typeof loadStats>>;
