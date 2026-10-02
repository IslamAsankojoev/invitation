import { describe, expect, it } from "vitest";
import { telegramUrl, telUrl, whatsappUrl } from "@/lib/contacts";

describe("ссылки контактов", () => {
  it("телефон: tel: с плюсом, WhatsApp — только цифры", () => {
    expect(telUrl("+7 (900) 123-45-67")).toBe("tel:+79001234567");
    expect(telUrl("8 900 123 45 67")).toBe("tel:89001234567");
    expect(whatsappUrl("+996 555 12 34 56")).toBe("https://wa.me/996555123456");
    expect(telUrl("")).toBeNull();
    expect(whatsappUrl(undefined)).toBeNull();
    expect(telUrl("12")).toBeNull();
  });

  it("Telegram: ник с @ и без, ссылка t.me, номер телефона; мусор — null", () => {
    expect(telegramUrl("@anna_wed")).toBe("https://t.me/anna_wed");
    expect(telegramUrl("anna_wed")).toBe("https://t.me/anna_wed");
    expect(telegramUrl("https://t.me/anna_wed")).toBe("https://t.me/anna_wed");
    expect(telegramUrl("+7 900 123-45-67")).toBe("https://t.me/+79001234567");
    expect(telegramUrl("ab")).toBeNull();
    expect(telegramUrl("анна")).toBeNull();
    expect(telegramUrl(undefined)).toBeNull();
  });
});
