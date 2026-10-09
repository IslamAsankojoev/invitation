import { MessageCircle, Phone, Send, type LucideIcon } from "lucide-react";
import { telegramUrl, telUrl, whatsappUrl } from "@/lib/contacts";
import type { Contact } from "@/lib/schema";
import { textStyle } from "@/lib/textStyle";
import { Section } from "../Section";
import type { BlockProps } from "./types";

type Link = { href: string; label: string; icon: LucideIcon };

/** Кнопки человека: позвонить, WhatsApp (по тому же номеру), Telegram (ник или номер). */
function linksOf(p: Contact): Link[] {
  const name = p.name.trim() ? ` — ${p.name.trim()}` : "";
  const tel = telUrl(p.phone);
  const wa = p.whatsapp ? whatsappUrl(p.phone) : null;
  const tg = telegramUrl(p.telegram);
  const links: (Link | null)[] = [
    tel ? { href: tel, label: `Позвонить${name}`, icon: Phone } : null,
    wa ? { href: wa, label: `WhatsApp${name}`, icon: MessageCircle } : null,
    tg ? { href: tg, label: `Telegram${name}`, icon: Send } : null,
  ];
  return links.filter((l): l is Link => !!l);
}

/** Контакты организаторов: имя, роль, телефон и круглые кнопки связи. */
export function ContactsBlock({ block }: BlockProps<"contacts">) {
  const cards = block.variant === "cards";
  return (
    <Section block={block}>
      {block.text && (
        <p className="mx-auto mb-8 max-w-sm whitespace-pre-line text-xl leading-relaxed" data-reveal="2" style={textStyle(block, "text")} data-field="text">
          {block.text}
        </p>
      )}
      <ul className={`mx-auto flex max-w-sm flex-col ${cards ? "gap-3" : "gap-8"}`}>
        {block.people.map((p, i) => (
          <li
            key={i}
            className={cards ? "inv-program-card rounded-2xl px-5 py-5" : ""}
            data-reveal={i + 3}
            data-anim={cards && i % 2 ? "right" : undefined}
          >
            {p.role && (
              <p className="inv-caps text-[0.7rem] opacity-70" style={textStyle(block, "personRole")} data-field="personRole">
                {p.role}
              </p>
            )}
            <p className="mt-1 text-2xl leading-tight" style={{ fontFamily: "var(--font-title)", ...textStyle(block, "personName") }} data-field="personName">
              {p.name}
            </p>
            {p.phone && <p className="mt-1 text-lg opacity-80">{p.phone}</p>}
            <div className="mt-3 flex justify-center gap-3">
              {linksOf(p).map(({ href, label, icon: Icon }) => (
                <a
                  key={href}
                  href={href}
                  target={href.startsWith("http") ? "_blank" : undefined}
                  rel="noopener noreferrer"
                  aria-label={label}
                  title={label}
                  className="flex size-11 items-center justify-center rounded-full border border-[var(--accent)]/60 text-[var(--accent)] transition hover:bg-[var(--accent)] hover:text-[var(--on-accent,#fff)]"
                >
                  <Icon aria-hidden="true" strokeWidth={1.4} className="size-5" />
                </a>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </Section>
  );
}
