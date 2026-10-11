"use client";

import { useEffect, useRef, useState } from "react";
import { TemplatePreview } from "@/components/templates/TemplatePreview";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import type { InvitationData } from "@/lib/schema";
import { applyTemplate, templates, type Template } from "@/lib/templates";

type Props = { data: InvitationData; onChange: (data: InvitationData) => void };

/** Смена шаблона: заменяет оформление, но сохраняет тексты, фото, музыку и порядок блоков. */
/** Колонок и отступ между ними (px) — превью растягиваются на ширину колонки. */
const COLUMNS = 3;
const GAP = 12;

export function TemplatePicker({ data, onChange }: Props) {
  const [pending, setPending] = useState<Template | null>(null);
  // Ширина превью = ширина колонки: панель на телефоне шире, чем на компьютере, — карточки не должны мельчить.
  const grid = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(100);
  useEffect(() => {
    const el = grid.current;
    if (!el) return;
    const update = () => el.clientWidth > 0 && setWidth(Math.floor((el.clientWidth - GAP * (COLUMNS - 1)) / COLUMNS));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-muted-foreground">
        Начните с готового оформления и настройте его под себя. Тексты и фото сохранятся.
      </p>
      <div ref={grid} className="grid grid-cols-3 gap-x-3 gap-y-4">
        {templates.map((t) => (
          // Кнопка — прозрачный слой поверх превью, а не обёртка: в превью есть свои кнопки,
          // а вложенные <button> недопустимы в HTML.
          <div key={t.id} className="group relative flex flex-col items-center gap-1.5">
            <TemplatePreview
              template={t}
              width={width}
              animated={false}
              className="rounded-lg ring-1 ring-foreground/10 transition group-hover:ring-2 group-hover:ring-ring group-has-[:focus-visible]:ring-3 group-has-[:focus-visible]:ring-ring/50"
            />
            <span className="text-center text-xs leading-tight text-muted-foreground group-hover:text-foreground">
              {t.name}
            </span>
            <button
              type="button"
              aria-label={`Шаблон «${t.name}»`}
              onClick={() => setPending(t)}
              className="absolute inset-0 rounded-lg outline-none"
            />
          </div>
        ))}
      </div>

      <AlertDialog open={pending !== null} onOpenChange={(open) => !open && setPending(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Применить шаблон «{pending?.name}»?</AlertDialogTitle>
            <AlertDialogDescription>
              Заменятся цвета, шрифты, текстура, падающий декор, фоны, цвет фона, края и украшения блоков, цвет и
              шрифт надписей, цвета дресс-кода. Имена, дата, тексты, программа, фото, музыка, набор и порядок блоков
              останутся как есть.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (pending) onChange(applyTemplate(data, pending));
                setPending(null);
              }}
            >
              Применить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
