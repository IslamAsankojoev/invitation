"use client";

import { Check, Loader2 } from "lucide-react";
import { useState } from "react";
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
      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {templates.map((t) => (
          <li key={t.id}>
            <Card className="h-full gap-0 overflow-hidden py-0 transition hover:shadow-md hover:ring-foreground/20">
              <div className="flex justify-center bg-muted/50">
                <TemplatePreview template={t} width={240} />
              </div>
              <CardHeader className="gap-1.5 pt-4">
                <CardTitle>{t.name}</CardTitle>
                <CardDescription>{t.description}</CardDescription>
                <TemplateSwatch template={t} />
              </CardHeader>
              <CardFooter className="mt-auto pt-4 pb-4">
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
