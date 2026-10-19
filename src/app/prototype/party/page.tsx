import type { Metadata } from "next";
import { PartyPrototype } from "@/components/party/PartyPrototype";
import { partyDisplay, partyMono, partyScript, partySerif, partyUi } from "./fonts";

export const metadata: Metadata = { title: "Вечеринка — прототип", robots: { index: false, follow: false } };

/** Прототип: сторис-афиша вечеринки с записью и кружком камеры, личный пропуск. Без базы — данные примера. */
export default function PartyPrototypePage() {
  const vars = [partyDisplay, partyMono, partySerif, partyScript, partyUi].map((f) => f.variable).join(" ");
  return (
    <div className={vars}>
      <PartyPrototype
        fonts={{
          display: partyDisplay.style.fontFamily,
          mono: partyMono.style.fontFamily,
          serif: partySerif.style.fontFamily,
          script: partyScript.style.fontFamily,
          sans: partyUi.style.fontFamily,
        }}
      />
    </div>
  );
}
