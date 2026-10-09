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
    <div className="flex items-center gap-2 text-xs text-muted-foreground">
      <span className="flex -space-x-1">
        {[p.bg, p.accent, p.text].map((c) => (
          <span key={c} className="size-4 rounded-full ring-2 ring-card" style={{ background: c }} />
        ))}
      </span>
      {titleFonts[template.theme.font].label}
    </div>
  );
}

/**
 * Превью во всю ширину карточки: на телефоне в два столбца карточка ≈ 180 px, на компьютере — 240+. До замера (и на
 * сервере) — 240, лишнее обрезается.
 */
function FitPreview({ template }: { template: Template }) {
  const ref = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(240);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => el.clientWidth > 0 && setWidth(Math.min(300, el.clientWidth));
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={ref} className="flex justify-center overflow-hidden bg-muted/50">
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
    // start=1 — редактор начнётся с быстрого старта (имена, дата, место).
    window.location.assign(`${editUrl}&start=1`);
  }

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <p role="alert" className="text-center text-sm text-destructive">
          {error}
        </p>
      )}
      {/* На телефоне — два столбца: двенадцать шаблонов видно за пару экранов, а не за двадцать. */}
      <ul className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {templates.map((t) => (
          <li key={t.id}>
            <Card className="h-full gap-0 overflow-hidden py-0 transition hover:shadow-md hover:ring-foreground/20">
              <FitPreview template={t} />
              <CardHeader className="gap-1.5 px-3 pt-3 sm:px-4 sm:pt-4">
                <CardTitle className="text-sm sm:text-base">{t.name}</CardTitle>
                <CardDescription className="max-sm:hidden">{t.description}</CardDescription>
                <div className="max-sm:hidden">
                  <TemplateSwatch template={t} />
                </div>
              </CardHeader>
              <CardFooter className="mt-auto px-3 pt-3 pb-3 sm:px-4 sm:pt-4 sm:pb-4">
                <Button
                  type="button"
                  className="w-full"
                  aria-label={`Выбрать шаблон «${t.name}»`}
                  disabled={creating !== null}
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
