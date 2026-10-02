"use client";

import { Check, ChevronsUpDown } from "lucide-react";
import { useState } from "react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { ProBadge } from "./controls";

export type FontOption<T extends string> = {
  value: T;
  /** Название шрифта (или «Авто · Cormorant»). */
  label: string;
  /** CSS-стек шрифта — образец пишется им самим. */
  css: string;
  /** Масштаб образца (рукописные шрифты мельче/крупнее). */
  scale?: number;
  premium?: boolean;
};

/**
 * Выбор шрифта одной строкой: кнопка с образцом выбранного шрифта, по нажатию — список, где каждый шрифт показан
 * своим начертанием. Непредзагружаемые шрифты скачиваются, только когда список открыт.
 * Пункты — кнопки «{ariaPrefix} {название}» с aria-pressed (на них опираются тесты).
 */
export function FontSelect<T extends string>({
  label,
  ariaPrefix,
  sample,
  value,
  options,
  onChange,
}: {
  label: string;
  ariaPrefix: string;
  sample: string;
  value: T;
  options: FontOption<T>[];
  onChange: (value: T) => void;
}) {
  const [open, setOpen] = useState(false);
  const current = options.find((o) => o.value === value) ?? options[0];
  const sampleStyle = (o: FontOption<T>, base: number) => ({ fontFamily: o.css, fontSize: `${base * (o.scale ?? 1)}rem` });
  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm leading-snug font-medium">{label}</span>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={`${label}: ${current.label}`}
            className="flex h-12 w-full items-center gap-3 rounded-md border bg-background px-3 text-left shadow-xs outline-none transition hover:bg-muted/50 focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <span className="min-w-0 flex-1 truncate leading-tight" style={sampleStyle(current, 1.35)}>
              {sample}
            </span>
            <span className="shrink-0 text-xs text-muted-foreground">{current.label}</span>
            {current.premium && <ProBadge />}
            <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="max-h-80 w-(--radix-popover-trigger-width) gap-0 overflow-y-auto p-1">
          <div role="group" aria-label={label} className="flex flex-col">
            {options.map((o) => {
              const selected = o.value === value;
              return (
                <button
                  key={o.value}
                  type="button"
                  aria-pressed={selected}
                  aria-label={`${ariaPrefix} ${o.label}`}
                  onClick={() => {
                    onChange(o.value);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex min-h-11 items-center gap-3 rounded-sm px-2.5 py-1.5 text-left outline-none hover:bg-muted focus-visible:bg-muted",
                    selected && "bg-muted",
                  )}
                >
                  <span className="min-w-0 flex-1 truncate leading-tight" style={sampleStyle(o, 1.25)}>
                    {sample}
                  </span>
                  <span className="shrink-0 text-[11px] text-muted-foreground">{o.label}</span>
                  {o.premium && <ProBadge />}
                  <Check className={cn("size-4 shrink-0", selected ? "opacity-100" : "opacity-0")} />
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
