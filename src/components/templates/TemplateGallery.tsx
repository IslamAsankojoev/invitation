"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { EVENT_FILTERS } from "@/lib/copy";
import type { Setup } from "@/lib/setup";
import { templateDescriptionId, templateEvents, templates, type Template } from "@/lib/templates";
import { SetupDialog, type EventChoice } from "./SetupDialog";
import { TemplateCard } from "./TemplateCard";

export function TemplateGallery() {
  const [creating, setCreating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** Шаблон, для которого открыта форма «Главное о событии». */
  const [picked, setPicked] = useState<Template | null>(null);
  /** Фильтр по событию (EVENT_FILTERS); null — все шаблоны. */
  const [filterId, setFilterId] = useState<string | null>(null);
  const filter = EVENT_FILTERS.find((f) => f.id === filterId);
  const matching = filter ? templates.filter((t) => templateEvents(t).some((e) => filter.events.includes(e))) : templates;
  // Для события пока нет своих шаблонов — показываем все: оформление подойдёт, тексты подстроятся под событие.
  const shown = matching.length ? matching : templates;

  async function create(template: Template, setup: Setup | null, choice: EventChoice) {
    setCreating(template.id);
    setError(null);
    const res = await fetch("/api/invitations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ template: template.id, ...choice, ...(setup && { setup }) }),
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
      <div role="group" aria-label="Событие" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
        {[{ id: null, label: "Все" }, ...EVENT_FILTERS].map((f) => (
          <Button
            key={f.id ?? "all"}
            type="button"
            size="sm"
            variant={filterId === f.id ? "default" : "outline"}
            aria-pressed={filterId === f.id}
            className="shrink-0 rounded-full pointer-coarse:h-10"
            onClick={() => setFilterId(f.id)}
          >
            {f.label}
          </Button>
        ))}
      </div>
      {filter && !matching.length && (
        <p className="text-sm text-muted-foreground" role="status">
          Шаблонов именно для события «{filter.label}» пока нет — подойдёт любой: подписи и примеры текстов подстроятся.
        </p>
      )}
      <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 md:grid-cols-3 lg:grid-cols-4" aria-label="Шаблоны">
        {shown.map((t) => (
          <li key={t.id}>
            <TemplateCard
              template={t}
              action={
                <button
                  type="button"
                  className="absolute inset-0 cursor-pointer outline-none disabled:cursor-wait"
                  aria-label={`Выбрать шаблон «${t.name}»`}
                  aria-describedby={templateDescriptionId(t)}
                  disabled={creating !== null}
                  onClick={() => {
                    setError(null);
                    setPicked(t);
                  }}
                />
              }
            />
          </li>
        ))}
      </ul>
      <SetupDialog
        template={picked}
        onClose={() => setPicked(null)}
        onCreate={create}
        creating={creating !== null}
        error={error}
        // Событие из фильтра: у детских тоев — то, для которого шаблон, иначе первое; без фильтра — событие шаблона.
        eventType={filter ? ((picked && templateEvents(picked).find((e) => filter.events.includes(e))) ?? filter.events[0]) : undefined}
      />
    </div>
  );
}
