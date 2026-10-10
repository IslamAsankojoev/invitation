import { findBlock } from "./blocks";
import type { InvitationData } from "./schema";

export type IcsEvent = {
  title: string;
  /** Локальное время события "YYYY-MM-DDTHH:mm" — пишется как «плавающее» время (без часового пояса). */
  start: string;
  location?: string;
  description?: string;
  durationHours?: number;
};

const DEFAULT_DURATION_HOURS = 4;

function escapeText(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** "2027-06-19T16:00" → "20270619T160000" */
export function toIcsDateTime(local: string): string {
  const [date, time] = local.split("T");
  const [hh = "00", mm = "00", ss = "00"] = time.split(":");
  return `${date.replace(/-/g, "")}T${hh}${mm}${ss}`;
}

/** Локальное время + часы, без часового пояса: "2027-06-19T22:00" + 4 → "2027-06-20T02:00". */
export function addHours(local: string, hours: number): string {
  const [date, time = "00:00"] = local.split("T");
  const [y, mo, d] = date.split("-").map(Number);
  const [hh = 0, mm = 0] = time.split(":").map(Number);
  const t = new Date(Date.UTC(y, mo - 1, d, hh + hours, mm));
  return t.toISOString().slice(0, 16);
}

function utcStamp(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** RFC 5545: строка длиннее 75 байт переносится, продолжение начинается с пробела (кириллица — 2 байта на букву). */
function fold(line: string): string {
  const out: string[] = [];
  let cur = "";
  let bytes = 0;
  for (const ch of line) {
    const size = new TextEncoder().encode(ch).length;
    if (bytes + size > (out.length ? 74 : 75)) {
      out.push(cur);
      cur = "";
      bytes = 0;
    }
    cur += ch;
    bytes += size;
  }
  out.push(cur);
  return out.join("\r\n ");
}

export function generateIcs(event: IcsEvent, now: Date = new Date()): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//wedding-creator//RU",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${toIcsDateTime(event.start)}-${now.getTime()}@wedding-creator`,
    `DTSTAMP:${utcStamp(now)}`,
    `DTSTART:${toIcsDateTime(event.start)}`,
    `DURATION:PT${event.durationHours ?? DEFAULT_DURATION_HOURS}H`,
    `SUMMARY:${escapeText(event.title)}`,
  ];
  if (event.location) lines.push(`LOCATION:${escapeText(event.location)}`);
  if (event.description) lines.push(`DESCRIPTION:${escapeText(event.description)}`);
  // Напоминание за день — гостю не нужно ставить его вручную.
  lines.push("BEGIN:VALARM", "ACTION:DISPLAY", `DESCRIPTION:${escapeText(event.title)}`, "TRIGGER:-P1D", "END:VALARM");
  lines.push("END:VEVENT", "END:VCALENDAR");
  return lines.map(fold).join("\r\n") + "\r\n";
}

/** Ссылка «создать событие» в Google Календаре: поля уже заполнены, время — в часовом поясе календаря гостя. */
export function googleCalendarUrl(event: IcsEvent): string {
  const end = addHours(event.start, event.durationHours ?? DEFAULT_DURATION_HOURS);
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${toIcsDateTime(event.start)}/${toIcsDateTime(end)}`,
  });
  if (event.location) params.set("location", event.location);
  if (event.description) params.set("details", event.description);
  return `https://calendar.google.com/calendar/render?${params}`;
}

/** Событие для календаря из приглашения: имена, дата обложки, место из блока «Место», ссылка на приглашение. */
export function invitationEvent(data: InvitationData, inviteUrl?: string): IcsEvent | null {
  const hero = findBlock(data, "hero");
  if (!hero) return null;
  const location = findBlock(data, "location");
  const place = location ? [location.placeName, location.address].filter(Boolean).join(", ") : "";
  return {
    title: hero.names,
    start: hero.date,
    location: place || undefined,
    description: inviteUrl ? `Приглашение: ${inviteUrl}` : undefined,
  };
}
