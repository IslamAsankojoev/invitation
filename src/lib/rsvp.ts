import { z } from "zod";

export const rsvpInputSchema = z.object({
  name: z.string().trim().min(1, "Укажите имя").max(100),
  attending: z.boolean(),
  guestsCount: z.number().int().min(1, "Гостей от 1 до 10").max(10, "Гостей от 1 до 10"),
  comment: z.string().trim().max(1000).optional(),
  /** Honeypot: скрытое поле, люди его не заполняют. */
  website: z.string().optional(),
});

export type RsvpInput = z.infer<typeof rsvpInputSchema>;

export type RsvpRecord = {
  id: string;
  name: string;
  attending: boolean;
  guestsCount: number;
  comment: string | null;
  createdAt: Date | string;
};

export type RsvpStats = { attending: number; notAttending: number; totalGuests: number };

/** totalGuests — сумма guestsCount только среди тех, кто придёт. */
export function computeRsvpStats(rsvps: Pick<RsvpRecord, "attending" | "guestsCount">[]): RsvpStats {
  return rsvps.reduce<RsvpStats>(
    (acc, r) =>
      r.attending
        ? { ...acc, attending: acc.attending + 1, totalGuests: acc.totalGuests + r.guestsCount }
        : { ...acc, notAttending: acc.notAttending + 1 },
    { attending: 0, notAttending: 0, totalGuests: 0 },
  );
}

function csvCell(value: string): string {
  return /[",;\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function rsvpsToCsv(rsvps: RsvpRecord[]): string {
  const header = ["Имя", "Придёт", "Гостей", "Комментарий", "Дата ответа"];
  const rows = rsvps.map((r) => [
    r.name,
    r.attending ? "да" : "нет",
    String(r.guestsCount),
    r.comment ?? "",
    new Date(r.createdAt).toISOString(),
  ]);
  return [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\r\n");
}

/** 1 гость, 2 гостя, 5 гостей, 21 гость — для текста благодарности. */
export function guestsWord(n: number): string {
  const d = n % 10;
  const dd = n % 100;
  if (d === 1 && dd !== 11) return "гость";
  if (d >= 2 && d <= 4 && (dd < 12 || dd > 14)) return "гостя";
  return "гостей";
}
