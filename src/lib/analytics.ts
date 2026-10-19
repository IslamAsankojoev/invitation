import { z } from "zod";

/**
 * Аналитика: воронка «создали приглашение → поделились → гость открыл → гость ответил». События — в таблице Event
 * (запись — lib/track.ts, браузер шлёт через POST /api/events), ответы гостей берутся из Rsvp. Ни IP, ни браузера,
 * ни имён гостей не храним. Здесь — только чистые функции и схемы (модуль импортирует и клиент).
 */

export const EVENT_NAMES = ["invitation_created", "share_clicked", "guest_view", "envelope_opened"] as const;
export type EventName = (typeof EVENT_NAMES)[number];

/** Что может прислать браузер. Создание приглашения пишет только сервер. */
export const CLIENT_EVENTS = ["share_clicked", "guest_view", "envelope_opened"] as const satisfies readonly EventName[];

/** Как организатор поделился ссылкой (вкладка «Ссылка»). */
export const SHARE_CHANNELS = ["copy", "whatsapp", "telegram", "native", "qr"] as const;
export type ShareChannel = (typeof SHARE_CHANNELS)[number];

/** Случайный id браузера гостя (crypto.randomUUID) — без него уникальных гостей не посчитать. */
const visitorIdSchema = z.string().regex(/^[A-Za-z0-9-]{8,64}$/);

export const clientEventSchema = z.object({
  name: z.enum(CLIENT_EVENTS),
  slug: z.string().trim().min(1).max(100),
  visitorId: visitorIdSchema.optional(),
  channel: z.enum(SHARE_CHANNELS).optional(),
});
export type ClientEvent = z.infer<typeof clientEventSchema>;

export const STATS_PERIODS = [7, 30, 90] as const;
export type StatsPeriod = (typeof STATS_PERIODS)[number];
export const parsePeriod = (value: unknown): StatsPeriod =>
  STATS_PERIODS.find((p) => String(p) === value) ?? 30;

/** Чем описано созданное приглашение — из props события invitation_created. */
export type CreatedRow = { invitationId: string; props: Record<string, unknown> | null };
/** Шаг, до которого дошло приглашение (любое событие шага, когда бы оно ни было). */
export type FunnelStep = "created" | "shared" | "viewed" | "answered";
export type ReachedRow = { invitationId: string; step: Exclude<FunnelStep, "created"> };

export const FUNNEL_STEPS: { key: FunnelStep; label: string }[] = [
  { key: "created", label: "Создали приглашение" },
  { key: "shared", label: "Поделились ссылкой" },
  { key: "viewed", label: "Гость открыл" },
  { key: "answered", label: "Гость ответил" },
];

export type FunnelCounts = Record<FunnelStep, number>;

/**
 * Когортная воронка: база — приглашения, созданные за период; шаг засчитан, если у приглашения есть хоть одно событие
 * шага. «Гость ответил» не требует «поделились» — гость мог получить ссылку и без кнопок вкладки «Ссылка».
 */
export function funnel(created: CreatedRow[], reached: ReachedRow[]): FunnelCounts {
  const ids = new Set(created.map((c) => c.invitationId));
  const sets = { shared: new Set<string>(), viewed: new Set<string>(), answered: new Set<string>() };
  for (const r of reached) if (ids.has(r.invitationId)) sets[r.step].add(r.invitationId);
  return { created: ids.size, shared: sets.shared.size, viewed: sets.viewed.size, answered: sets.answered.size };
}

/** Та же воронка по значению поля props (шаблон, тип события, язык): строки по убыванию числа созданных. */
export function funnelBy(key: string, created: CreatedRow[], reached: ReachedRow[]): { value: string; counts: FunnelCounts }[] {
  const groups = new Map<string, CreatedRow[]>();
  for (const c of created) {
    const raw = c.props?.[key];
    const value = typeof raw === "string" && raw ? raw : "—";
    groups.set(value, [...(groups.get(value) ?? []), c]);
  }
  return [...groups]
    .map(([value, rows]) => ({ value, counts: funnel(rows, reached) }))
    .sort((a, b) => b.counts.created - a.counts.created || a.value.localeCompare(b.value));
}

/** Доля шага от созданных, «—» при пустой базе: «42 %». */
export const percent = (part: number, whole: number) => (whole ? `${Math.round((part / whole) * 100)} %` : "—");

/** Сколько в среднем разных гостей открыло приглашение — среди тех, что вообще открывали. */
export function averageGuests(visitors: { invitationId: string; visitorId: string | null }[]): number {
  const perInvitation = new Map<string, Set<string>>();
  for (const v of visitors) {
    if (!v.visitorId) continue;
    perInvitation.set(v.invitationId, (perInvitation.get(v.invitationId) ?? new Set()).add(v.visitorId));
  }
  if (!perInvitation.size) return 0;
  const total = [...perInvitation.values()].reduce((sum, s) => sum + s.size, 0);
  return Math.round((total / perInvitation.size) * 10) / 10;
}
