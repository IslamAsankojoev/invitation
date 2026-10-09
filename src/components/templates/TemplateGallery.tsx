"use client";

import { Check, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { templates, type Template } from "@/lib/templates";
import { palettes, titleFonts } from "@/lib/theme";
import { TemplatePreview } from "./TemplatePreview";

/** Цвета палитры шаблона + шрифт имён — короткая «этикетка» стиля. */
export function TemplateSwatch({ template }: { template: Template }) {
  const p = palettes[template.theme.palette];
  return (
    <div className="flex min-w-0 items-center gap-2 text-xs text-muted-foreground">
      <span className="flex -space-x-1">
        {[p.bg, p.accent, p.text].map((c) => (
          <span key={c} className="size-4 rounded-full ring-2 ring-card" style={{ background: c }} />
        ))}
      </span>
      <span className="truncate">{titleFonts[template.theme.font].label}</span>
    </div>
  );
}

/**
 * Превью во всю ширину карточки: на телефоне карточки в два столбца уже, чем на компьютере.
 * Место под превью зарезервировано пропорцией экрана (без скачка вёрстки), ширина уточняется после измерения.
 */
function FitPreview({ template }: { template: Template }) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(240);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => el.clientWidth > 0 && setWidth(el.clientWidth);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={ref} className="aspect-[390/700] w-full overflow-hidden bg-muted/50">
      <TemplatePreview template={template} width={width} />
    </div>
  );
}

export function TemplateGallery() {
  const [creating, setCreating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function create(template: Template) {
    setCreating(template.id);
    setError(null);
    const res = await fetch("/api/invitations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ template: template.id }),
    }).catch(() => null);
    if (!res?.ok) {
      setCreating(null);
      return setError("Не удалось создать приглашение. Попробуйте ещё раз.");
    }
    const { editUrl } = await res.json();
    // Полная навигация, а не router.push: надёжнее при первой компиляции маршрута в dev-режиме.
    window.location.assign(editUrl);
  }

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <p role="alert" className="rounded-lg bg-destructive/10 px-4 py-3 text-center text-sm text-destructive">
          {error}
        </p>
      )}
      <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4" aria-label="Шаблоны">
        {templates.map((t) => (
          <li key={t.id}>
            {/* Вся карточка нажимается: кнопка «Выбрать» растянута на неё псевдоэлементом (вложенных кнопок нет). */}
            <Card className="relative h-full gap-0 overflow-hidden py-0 transition-[box-shadow,translate] duration-200 focus-within:ring-2 focus-within:ring-ring hover:-translate-y-0.5 hover:shadow-lg motion-reduce:transition-none motion-reduce:hover:translate-y-0">
              <FitPreview template={t} />
              <CardHeader className="gap-1 px-3 pt-3 sm:gap-1.5 sm:px-4 sm:pt-4">
                <CardTitle className="text-sm sm:text-base">{t.name}</CardTitle>
                <CardDescription className="line-clamp-2 text-xs sm:line-clamp-none sm:text-sm">{t.description}</CardDescription>
                <TemplateSwatch template={t} />
              </CardHeader>
              <CardFooter className="mt-auto px-3 pt-3 pb-3 sm:px-4 sm:pt-4 sm:pb-4">
                <Button
                  type="button"
                  className="w-full after:absolute after:inset-0 after:content-[''] focus-visible:ring-0 pointer-coarse:h-10"
                  aria-label={`Выбрать шаблон «${t.name}»`}
                  disabled={creating !== null}
                  aria-busy={creating === t.id}
                  onClick={() => create(t)}
                >
                  {creating === t.id ? <Loader2 className="animate-spin" /> : <Check />}
                  {creating === t.id ? "Создаю…" : "Выбрать"}
                </Button>
              </CardFooter>
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
