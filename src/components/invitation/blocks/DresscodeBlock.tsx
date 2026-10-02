import type { CSSProperties } from "react";
import { textStyle } from "@/lib/textStyle";
import { Section } from "../Section";
import type { BlockProps } from "./types";

export function DresscodeBlock({ block }: BlockProps<"dresscode">) {
  const { colors } = block;
  return (
    <Section block={block}>
      <p className="mx-auto max-w-sm text-xl leading-relaxed" data-reveal="2" style={textStyle(block, "text")}>
        {block.text}
      </p>
      {colors.length > 0 &&
        (block.variant === "stripes" ? (
          // Палитра полосами: каждая полоса «вырастает» снизу по очереди.
          <div className="mx-auto mt-8 flex h-32 max-w-xs overflow-hidden rounded-3xl shadow-md" data-reveal="3" data-anim="fade">
            {colors.map((c, i) => (
              <span key={i} className="inv-stripe flex-1" style={{ background: c, "--i": i } as CSSProperties} title={c} />
            ))}
          </div>
        ) : block.variant === "chips" ? (
          // Образцы цвета, как веер карточек из магазина красок.
          <div className="mt-8 flex flex-wrap justify-center gap-2" data-reveal="3" data-anim="fade">
            {colors.map((c, i) => (
              <span
                key={i}
                className="inv-chip inv-swatch flex w-[3.6rem] flex-col overflow-hidden rounded-md bg-white text-left text-[#3e3630]"
                style={{ "--i": i, rotate: `${(i - (colors.length - 1) / 2) * 3}deg` } as CSSProperties}
              >
                <span className="h-16" style={{ background: c }} />
                <span className="px-1 py-1.5 font-mono text-[0.5rem] uppercase opacity-70">{c}</span>
              </span>
            ))}
          </div>
        ) : (
          <div className="mt-8 flex flex-wrap justify-center gap-3" data-reveal="3" data-anim="fade">
            {colors.map((c, i) => (
              <span
                key={i}
                className="inv-swatch h-12 w-12 rounded-full border-4 border-white/70"
                style={{ background: c, "--i": i } as CSSProperties}
                title={c}
              />
            ))}
          </div>
        ))}
    </Section>
  );
}
