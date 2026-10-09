import { Baby, Flower2, Gift, Globe, Info, Mail, Plane, Star, type LucideIcon } from "lucide-react";
import type { TextIcon } from "@/lib/schema";
import { textStyle } from "@/lib/textStyle";
import { Section } from "../Section";
import { programIcons } from "./ProgramBlock";
import type { BlockProps } from "./types";

export const textIcons: Record<TextIcon, LucideIcon> = {
  ...programIcons,
  gift: Gift,
  letter: Mail,
  child: Baby,
  info: Info,
  flower: Flower2,
  star: Star,
  plane: Plane,
  globe: Globe,
};

/** Универсальный текст: пожелания, подарки, детали. Значок и кнопка-ссылка — по желанию. */
export function TextBlock({ block }: BlockProps<"text">) {
  const Icon = block.icon ? textIcons[block.icon] : null;
  const icon = Icon && (
    <div className="mb-6 flex justify-center" data-reveal="1" data-anim="pop">
      <span className="flex h-16 w-16 items-center justify-center rounded-full border border-[var(--accent)]/60 text-[var(--accent)]">
        <Icon aria-hidden="true" strokeWidth={1.2} className="size-7" />
      </span>
    </div>
  );
  const button = block.buttonUrl && (
    <div className="mt-8" data-reveal="4">
      <a
        href={block.buttonUrl}
        target={block.buttonUrl.startsWith("http") ? "_blank" : undefined}
        rel="noopener noreferrer"
        className="inv-btn-outline inv-btn-shine"
        style={textStyle(block, "button")} data-field="button"
      >
        {block.buttonLabel || "Подробнее"}
      </a>
    </div>
  );

  if (block.variant === "quote") {
    return (
      <Section block={block}>
        {icon}
        <div aria-hidden="true" className="-mb-2 text-5xl leading-none text-[var(--accent)] opacity-70" data-reveal="2" data-anim="blur">
          “
        </div>
        <p className="mx-auto max-w-sm whitespace-pre-line text-2xl leading-relaxed italic" data-reveal="3" data-anim="fade" style={textStyle(block, "text")} data-field="text">
          {block.text}
        </p>
        {button}
      </Section>
    );
  }

  const body = (
    <>
      {icon}
      <p className="mx-auto max-w-sm whitespace-pre-line text-xl leading-relaxed" data-reveal="3" style={textStyle(block, "text")} data-field="text">
        {block.text}
      </p>
      {button}
    </>
  );

  if (block.variant === "card") {
    return (
      <Section block={block}>
        <div className="inv-program-card mx-auto max-w-sm rounded-3xl px-7 py-9" data-reveal="2" data-anim="fade">
          {body}
        </div>
      </Section>
    );
  }

  return <Section block={block}>{body}</Section>;
}
