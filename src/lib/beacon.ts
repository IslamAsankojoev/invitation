import type { ClientEvent } from "./analytics";

const URL = "/api/events";
const VISITOR_KEY = "inv-visitor";

/**
 * Отправить событие аналитики из браузера и не ждать ответа. sendBeacon переживает уход со страницы (переход в
 * WhatsApp по кнопке); нет его — fetch с keepalive. Любой сбой молча игнорируется: аналитика не мешает гостю.
 */
export function sendEvent(event: ClientEvent): void {
  try {
    const body = JSON.stringify(event);
    if (navigator.sendBeacon?.(URL, new Blob([body], { type: "application/json" }))) return;
    void fetch(URL, { method: "POST", body, keepalive: true, headers: { "content-type": "application/json" } }).catch(() => {});
  } catch {
    // нет navigator (тесты, старый браузер) — событие просто теряется
  }
}

/** Случайный постоянный id этого браузера — чтобы считать разных гостей, а не открытия. Без localStorage — нет id. */
export function visitorId(): string | undefined {
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = crypto.randomUUID();
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    return undefined;
  }
}
