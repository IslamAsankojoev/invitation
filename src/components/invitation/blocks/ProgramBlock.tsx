"use client";

import { Cake, Camera, Car, Church, Gem, Heart, Music, Sparkles, UtensilsCrossed, Wine, type LucideIcon } from "lucide-react";
import { textStyle } from "@/lib/textStyle";
import { useEffect, useRef } from "react";
import { PROGRAM_ICONS, type ProgramIcon } from "@/lib/schema";
import { useMotion } from "../motion";
import { Section } from "../Section";
import type { BlockProps } from "./types";

export const programIcons: Record<ProgramIcon, LucideIcon> = {
  rings: Gem,
  glasses: Wine,
  cake: Cake,
  dinner: UtensilsCrossed,
  music: Music,
  camera: Camera,
  car: Car,
  heart: Heart,
  church: Church,
  dance: Sparkles,
};

/** Иконка пункта: выбранная или по очереди из набора, чтобы пункты не повторялись. */
const iconFor = (icon: ProgramIcon | undefined, i: number) => programIcons[icon ?? PROGRAM_ICONS[i % PROGRAM_ICONS.length]];

export function ProgramBlock({ block }: BlockProps<"program">) {
  if (block.variant === "cards") {
    return (
      <Section block={block}>
        <ol className="mx-auto flex max-w-xs flex-col gap-3 text-left">
          {block.items.map((item, i) => (
            <li
              key={i}
              className="inv-program-card flex items-start gap-4 rounded-2xl px-5 py-4"
              data-reveal={i + 2}
              data-anim={i % 2 ? "right" : undefined}
            >
              <span className="inv-script shrink-0 text-3xl leading-none" style={textStyle(block, "time")}>{item.time}</span>
              <span className="min-w-0 border-l border-[var(--accent)]/40 pl-4">
                <span className="inv-caps block text-[0.72rem]" style={textStyle(block, "itemTitle")}>{item.title}</span>
                {item.description && <span className="mt-1 block text-base leading-snug opacity-70" style={textStyle(block, "itemDescription")}>{item.description}</span>}
              </span>
            </li>
          ))}
        </ol>
      </Section>
    );
  }

  if (block.variant === "icons") {
    return (
      <Section block={block}>
        <ol className="mx-auto flex max-w-xs flex-col items-center">
          {block.items.map((item, i) => {
            const Icon = iconFor(item.icon, i);
            return (
              <li key={i} className="flex flex-col items-center" data-reveal={i + 2} data-anim="pop">
                {i > 0 && <span aria-hidden="true" className="my-3 h-8 border-l border-dashed border-[var(--accent)]/60" />}
                <span className="flex h-16 w-16 items-center justify-center rounded-full border border-[var(--accent)]/60 text-[var(--accent)]">
                  <Icon aria-hidden="true" strokeWidth={1.2} className="size-7" />
                </span>
                <span className="mt-3 text-2xl leading-tight" style={textStyle(block, "time")}>{item.time}</span>
                <span className="inv-caps mt-1 text-[0.72rem]" style={textStyle(block, "itemTitle")}>{item.title}</span>
                {item.description && <span className="mt-1 max-w-[16rem] text-base leading-snug opacity-70" style={textStyle(block, "itemDescription")}>{item.description}</span>}
              </li>
            );
          })}
        </ol>
      </Section>
    );
  }

  return <ProgramTimeline block={block} />;
}

/** Таймлайн: золотая линия растёт вместе с прокруткой, точки загораются, когда линия до них доходит. */
function ProgramTimeline({ block }: { block: BlockProps<"program">["block"] }) {
  const listRef = useRef<HTMLOListElement>(null);
  const motion = useMotion();

  // --p от 0 до 1. Линия только растёт: при прокрутке назад не «стирается».
  useEffect(() => {
    const list = listRef.current;
    if (!list || motion === "paused") return;
    let drawn = 0;
    let frame = 0;
    const update = () => {
      frame = 0;
      const r = list.getBoundingClientRect();
      if (!r.height) return;
      const next = motion === "off" ? r.height : Math.min(r.height, Math.max(0, window.innerHeight * 0.72 - r.top));
      if (next <= drawn) return;
      drawn = next;
      list.style.setProperty("--p", (drawn / r.height).toFixed(4));
      list.querySelectorAll<HTMLElement>("[data-dot]:not([data-lit])").forEach((dot) => {
        if (drawn >= dot.getBoundingClientRect().top - r.top + 6) dot.dataset.lit = "1";
      });
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    // capture — прокрутка и окна, и рамки превью в редакторе.
    document.addEventListener("scroll", onScroll, { capture: true, passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      document.removeEventListener("scroll", onScroll, { capture: true });
      window.removeEventListener("resize", onScroll);
      cancelAnimationFrame(frame);
    };
  }, [motion, block.items.length]);

  return (
    <Section block={block}>
      <ol ref={listRef} className="relative mx-auto max-w-xs text-left">
        <span aria-hidden="true" className="inv-timeline-line absolute bottom-3 left-[5px] top-3 w-px" />
        {block.items.map((item, i) => (
          <li key={i} className="relative pb-8 pl-9 last:pb-0" data-reveal={i + 2} data-anim="right">
            <span aria-hidden="true" data-dot="" className="inv-timeline-dot absolute left-0 top-2 h-[11px] w-[11px] rounded-full" />
            <div className="text-2xl leading-tight" style={textStyle(block, "time")}>{item.time}</div>
            <div className="inv-caps mt-1 text-[0.72rem]" style={textStyle(block, "itemTitle")}>{item.title}</div>
            {item.description && <div className="mt-1 text-base leading-snug opacity-70" style={textStyle(block, "itemDescription")}>{item.description}</div>}
          </li>
        ))}
      </ol>
    </Section>
  );
}
