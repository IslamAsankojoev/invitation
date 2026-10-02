/** Ссылки кнопок блока «Контакты». Номер — в международном формате («+7 900 …», «+996 …»). */

export const phoneDigits = (phone: string | undefined) => (phone ?? "").replace(/\D/g, "");

/** «Позвонить»: tel:+79000000000; без цифр — null. */
export function telUrl(phone: string | undefined): string | null {
  const digits = phoneDigits(phone);
  if (digits.length < 5) return null;
  return `tel:${phone!.trim().startsWith("+") ? "+" : ""}${digits}`;
}

/** WhatsApp: https://wa.me/<номер без + и пробелов>. */
export function whatsappUrl(phone: string | undefined): string | null {
  const digits = phoneDigits(phone);
  return digits.length < 5 ? null : `https://wa.me/${digits}`;
}

/** Telegram по нику (@anna, anna, t.me/anna) или по номеру телефона (t.me/+7900…). */
export function telegramUrl(value: string | undefined): string | null {
  const v = (value ?? "").trim().replace(/^(https?:\/\/)?t\.me\//i, "").replace(/^@/, "");
  if (/^\+?[\d\s()-]{5,}$/.test(v)) return `https://t.me/+${phoneDigits(v)}`;
  if (/^[A-Za-z][A-Za-z0-9_]{3,31}$/.test(v)) return `https://t.me/${v}`;
  return null;
}
