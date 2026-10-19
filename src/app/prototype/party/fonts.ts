import { Manrope, Pacifico, Playfair_Display, Rubik_Mono_One, Unbounded } from "next/font/google";

/** Шрифты прототипа вечеринок — отдельно от шрифтов приглашений, грузятся только на этой странице. */
export const partyDisplay = Unbounded({ subsets: ["latin", "cyrillic"], weight: ["500", "600", "700", "900"], variable: "--font-party-display" });
export const partyMono = Rubik_Mono_One({ subsets: ["latin", "cyrillic"], weight: "400", variable: "--font-party-mono" });
export const partySerif = Playfair_Display({ subsets: ["latin", "cyrillic"], weight: ["400", "500", "700"], style: ["normal", "italic"], variable: "--font-party-serif" });
export const partyScript = Pacifico({ subsets: ["latin", "cyrillic"], weight: "400", variable: "--font-party-script" });
export const partyUi = Manrope({ subsets: ["latin", "cyrillic"], weight: ["500", "600", "700"], variable: "--font-party-ui" });
