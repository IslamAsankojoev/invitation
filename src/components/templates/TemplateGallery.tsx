"use client";

import { useState } from "react";
import type { Setup } from "@/lib/setup";
import { templateDescriptionId, templates, type Template } from "@/lib/templates";
import { SetupDialog } from "./SetupDialog";
import { TemplateCard } from "./TemplateCard";

export function TemplateGallery() {
  const [creating, setCreating] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  /** Шаблон, для которого открыта форма «Главное о событии». */
  const [picked, setPicked] = useState<Template | null>(null);

  async function create(template: Template, setup: Setup | null) {
    setCreating(template.id);
    setError(null);
    const res = await fetch("/api/invitations", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ template: template.id, ...(setup && { setup }) }),
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
      <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-6 md:grid-cols-3 lg:grid-cols-4" aria-label="Шаблоны">
        {templates.map((t) => (
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
      <SetupDialog template={picked} onClose={() => setPicked(null)} onCreate={create} creating={creating !== null} error={error} />
    </div>
  );
}
