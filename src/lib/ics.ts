export type IcsEvent = {
  title: string;
  /** Локальное время события "YYYY-MM-DDTHH:mm" — пишется как «плавающее» время (без часового пояса). */
  start: string;
  location?: string;
  description?: string;
  durationHours?: number;
};

function escapeText(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** "2027-06-19T16:00" → "20270619T160000" */
export function toIcsDateTime(local: string): string {
  const [date, time] = local.split("T");
  const [hh = "00", mm = "00", ss = "00"] = time.split(":");
  return `${date.replace(/-/g, "")}T${hh}${mm}${ss}`;
}

function utcStamp(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

export function generateIcs(event: IcsEvent, now: Date = new Date()): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//wedding-creator//RU",
    "BEGIN:VEVENT",
    `UID:${toIcsDateTime(event.start)}-${now.getTime()}@wedding-creator`,
    `DTSTAMP:${utcStamp(now)}`,
    `DTSTART:${toIcsDateTime(event.start)}`,
    `DURATION:PT${event.durationHours ?? 4}H`,
    `SUMMARY:${escapeText(event.title)}`,
  ];
  if (event.location) lines.push(`LOCATION:${escapeText(event.location)}`);
  if (event.description) lines.push(`DESCRIPTION:${escapeText(event.description)}`);
  lines.push("END:VEVENT", "END:VCALENDAR");
  return lines.join("\r\n") + "\r\n";
}
