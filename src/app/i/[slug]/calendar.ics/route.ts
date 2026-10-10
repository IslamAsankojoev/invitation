import { generateIcs, invitationEvent } from "@/lib/ics";
import { getInvitationBySlug } from "@/lib/invitations";

/**
 * Событие приглашения в формате iCalendar. Настоящий адрес с `text/calendar`, а не blob: только так iPhone и Mac
 * показывают «Добавить в Календарь» (blob-файл уходит в «Загрузки», во встроенных браузерах не открывается вовсе).
 */
export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const inv = await getInvitationBySlug((await params).slug);
  const event = inv && invitationEvent(inv.data, new URL(`/i/${inv.slug}`, request.url).toString());
  if (!event) return new Response("Не найдено", { status: 404 });
  return new Response(generateIcs(event), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'inline; filename="invitation.ics"',
      "Cache-Control": "no-store",
    },
  });
}
