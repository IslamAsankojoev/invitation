"use client";

import { createContext, useContext, type ReactNode } from "react";
import { guestText, type GuestText } from "@/lib/i18n";
import type { EventType, Language } from "@/lib/schema";

type GuestLanguage = { lang: Language; eventType: EventType; t: GuestText };

const GuestLanguageContext = createContext<GuestLanguage>({ lang: "ru", eventType: "wedding", t: guestText("ru") });

/**
 * Язык и событие приглашения для подписей страницы гостя (lib/i18n.ts). Ставит InvitationView, а InvitationPage и
 * превью заставки — ещё и вокруг конверта и кнопки музыки (они вне InvitationView). Без провайдера — русский.
 */
export function GuestLanguageProvider({ lang, eventType, children }: { lang: Language; eventType: EventType; children: ReactNode }) {
  return <GuestLanguageContext.Provider value={{ lang, eventType, t: guestText(lang) }}>{children}</GuestLanguageContext.Provider>;
}

export const useGuestLanguage = () => useContext(GuestLanguageContext);
