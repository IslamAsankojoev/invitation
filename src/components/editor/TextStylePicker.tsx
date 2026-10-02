"use client";

import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import type { TextFont, TextStyle } from "@/lib/schema";
import { textFonts } from "@/lib/textStyle";
import { palettes } from "@/lib/theme";
import { cn } from "@/lib/utils";

/** Цвета-образцы: тексты и акценты всех палитр + белый и чёрный, без повторов. */
const SWATCHES = [...new Set([...Object.values(palettes).flatMap((p) => [p.text, p.accent]), "#ffffff", "#111111"])];
const THEME = "theme";

/**
 * Свой цвет и шрифт текста поля: компактная кнопка «Aa» рядом с полем ввода (буквы — выбранным шрифтом,
 * полоска — выбранным цветом), по нажатию — окошко с цветами и шрифтами. Пусто — как в теме.
 */
export function TextStylePicker({
  label,
  value,
  onChange,
  className,
}: {
  /** Что за текст — для доступного имени кнопки: «Цвет и шрифт: Имена». */
  label: string;
  value: TextStyle | undefined;
  onChange: (patch: Partial<TextStyle>) => void;
  className?: string;
}) {
  const font = textFonts.find((f) => f.value === value?.font);
  const styled = !!(value?.color || value?.font);
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon"
          aria-label={`Цвет и шрифт: ${label}`}
          title="Цвет и шрифт текста"
          className={cn("relative shrink-0", styled && "border-primary/50", className)}
        >
          <span className="text-sm leading-none" style={{ fontFamily: font?.css }}>
            Aa
          </span>
          <span
            aria-hidden="true"
            className="absolute inset-x-2 bottom-1.5 h-[3px] rounded-full"
            style={{ background: value?.color ?? "transparent" }}
          />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-64 gap-3 p-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium">Цвет</span>
          {styled && (
            <Button type="button" variant="ghost" size="xs" onClick={() => onChange({ color: undefined, font: undefined })}>
              <RotateCcw /> Как в теме
            </Button>
          )}
        </div>
        <div role="radiogroup" aria-label={`Цвет: ${label}`} className="flex flex-wrap gap-1.5">
          <button
            type="button"
            role="radio"
            aria-checked={!value?.color}
            aria-label="Цвет как в теме"
            title="Как в теме"
            onClick={() => onChange({ color: undefined })}
            className={cn(
              "size-6 rounded-full border bg-[linear-gradient(135deg,transparent_45%,var(--color-destructive)_45%_55%,transparent_55%)]",
              !value?.color && "ring-2 ring-primary ring-offset-1",
            )}
          />
          {SWATCHES.map((c) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={value?.color === c}
              aria-label={`Цвет ${c}`}
              onClick={() => onChange({ color: c })}
              className={cn("size-6 rounded-full border", value?.color === c && "ring-2 ring-primary ring-offset-1")}
              style={{ background: c }}
            />
          ))}
          <input
            type="color"
            aria-label={`Свой цвет: ${label}`}
            title="Свой цвет"
            value={value?.color ?? "#3e3630"}
            onChange={(e) => onChange({ color: e.target.value })}
            className="size-6 cursor-pointer overflow-hidden rounded-full border [&::-webkit-color-swatch]:rounded-full [&::-webkit-color-swatch]:border-none [&::-webkit-color-swatch-wrapper]:p-0"
          />
        </div>
        <span className="text-xs font-medium">Шрифт</span>
        <ToggleGroup
          type="single"
          aria-label={`Шрифт: ${label}`}
          value={value?.font ?? THEME}
          onValueChange={(v) => v && onChange({ font: v === THEME ? undefined : (v as TextFont) })}
          className="flex max-h-56 w-full flex-col items-stretch gap-0.5 overflow-y-auto"
        >
          <ToggleGroupItem value={THEME} className="h-8 justify-start rounded-md px-2 text-sm">
            Как в теме
          </ToggleGroupItem>
          {textFonts.map((f) => (
            <ToggleGroupItem key={f.value} value={f.value} className="h-8 justify-start rounded-md px-2 text-base" style={{ fontFamily: f.css }}>
              {f.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </PopoverContent>
    </Popover>
  );
}
