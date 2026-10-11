"use client";

import { useEffect, useRef, useState } from "react";
import { findBlock } from "@/lib/blocks";
import { EVENT_PASSED_TEXT, getCountdown } from "@/lib/countdown";
import { prefersReducedMotion, useMotion } from "../motion";
import { Section } from "../Section";
import type { BlockProps } from "./types";

type Unit = { value: number | undefined; label: string; /** Доля для колец: сколько осталось от полного круга. */ max: number };

export function CountdownBlock({ block, ctx }: BlockProps<"countdown">) {
  const date = findBlock(ctx.data, "hero")?.date;
  // Время считаем только на клиенте, чтобы не было расхождения с серверным HTML.
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  if (!date) return null;
  const cd = now ? getCountdown(new Date(date), now) : null;
  const left = cd && !cd.done ? cd : undefined;
  const units: Unit[] = [
    { value: left?.days, label: "дней", max: 365 },
    { value: left?.hours, label: "часов", max: 24 },
    { value: left?.minutes, label: "минут", max: 60 },
    { value: left?.seconds, label: "секунд", max: 60 },
  ];
  const text = (v: number | undefined) => (v === undefined ? "–" : String(v).padStart(2, "0"));

  return (
    <Section block={block}>
      {cd?.done ? (
        <p className="inv-script text-4xl" data-reveal="2" data-anim="blur">
          {EVENT_PASSED_TEXT}
        </p>
      ) : block.variant === "circles" ? (
        <div className="mx-auto grid max-w-xs grid-cols-4 gap-2">
          {units.map(({ value, label, max }, i) => {
            const part = value === undefined ? 0 : Math.min(1, value / max);
            return (
              <div key={label} className="flex flex-col items-center" data-reveal={i + 2} data-anim="pop">
                <div className="relative h-[68px] w-[68px]">
                  <svg viewBox="0 0 68 68" className="absolute inset-0 -rotate-90" aria-hidden="true">
                    <circle cx="34" cy="34" r="30" fill="none" stroke="currentColor" strokeOpacity=".12" strokeWidth="2" />
                    <circle
                      cx="34"
                      cy="34"
                      r="30"
                      fill="none"
                      stroke="var(--accent)"
                      strokeWidth="2"
                      strokeLinecap="round"
                      pathLength={100}
                      strokeDasharray="100"
                      strokeDashoffset={100 - part * 100}
                      className="inv-ring-progress"
                    />
                  </svg>
                  <span className="absolute inset-0 flex items-center justify-center text-2xl font-light tabular-nums">{text(value)}</span>
                </div>
                <div className="inv-caps mt-2 text-[0.55rem] opacity-60">{label}</div>
              </div>
            );
          })}
        </div>
      ) : block.variant === "cards" ? (
        <div className="mx-auto flex max-w-xs justify-center gap-2.5">
          {units.map(({ value, label }, i) => (
            <div key={label} className="flex flex-col items-center" data-reveal={i + 2}>
              <FlipCard value={text(value)} />
              <div className="inv-caps mt-2 text-[0.55rem] opacity-60">{label}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="mx-auto flex max-w-xs items-start justify-center">
          {units.map(({ value, label }, i) => (
            <div key={label} className="flex items-start" data-reveal={i + 2}>
              {i > 0 && <span className="px-1.5 pt-1 text-3xl text-[var(--accent)] opacity-60">:</span>}
              {/* min-w, а не w: у трёхзначного числа дней колонка шире, иначе цифры налезают на часы. */}
              <div className="min-w-14">
                <div className="text-[2.6rem] font-light leading-none tabular-nums">{text(value)}</div>
                <div className="inv-caps mt-2 text-[0.6rem] opacity-60">{label}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}

/**
 * Карточка перекидных часов. Новое значение: верхняя половинка со старым числом откидывается вниз
 * (inv-flip-leaf-top), за ней раскрывается нижняя с новым (inv-flip-leaf-bottom); пока листается, неподвижная
 * нижняя половинка ещё показывает старое число. Без анимаций (заставка не открыта, «Уменьшить движение»,
 * миниатюры) — просто число.
 */
function FlipCard({ value }: { value: string }) {
  const motion = useMotion();
  const [shown, setShown] = useState({ cur: value, prev: value, flip: 0 });
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => {
    if (value === shown.cur) return;
    setShown((s) => ({ cur: value, prev: s.cur, flip: s.flip + 1 }));
    // Перелистывание длится ~0.6 с; после него неподвижная нижняя половинка тоже показывает новое число.
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setShown((s) => ({ ...s, prev: s.cur })), 650);
  }, [value, shown.cur]);
  useEffect(() => () => clearTimeout(timer.current), []);

  const animate = motion === "on" && !prefersReducedMotion();
  const flipping = animate && shown.prev !== shown.cur;
  return (
    <div className="inv-flip-card relative h-16 w-[62px] rounded-xl text-3xl tabular-nums" aria-label={shown.cur} role="img">
      <span aria-hidden="true" className="inv-flip-half inv-flip-top">
        <span>{shown.cur}</span>
      </span>
      <span aria-hidden="true" className="inv-flip-half inv-flip-bottom">
        <span>{flipping ? shown.prev : shown.cur}</span>
      </span>
      {flipping && (
        <span key={shown.flip} aria-hidden="true">
          <span className="inv-flip-half inv-flip-top inv-flip-leaf-top">
            <span>{shown.prev}</span>
          </span>
          <span className="inv-flip-half inv-flip-bottom inv-flip-leaf-bottom">
            <span>{shown.cur}</span>
          </span>
        </span>
      )}
    </div>
  );
}
