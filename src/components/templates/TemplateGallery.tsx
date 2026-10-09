"use client";

import { useEffect, useRef, useState } from "react";
import type { Setup } from "@/lib/setup";
import { templates, type Template } from "@/lib/templates";
import { SetupDialog } from "./SetupDialog";
import { TemplatePreview } from "./TemplatePreview";

/**
 * Превью карточки: верх главного экрана шаблона (имена, дата) во всю ширину карточки, обрезано до 4:5 — полный экран
 * 390×700 делал карточки слишком длинными. Место зарезервировано пропорцией (без скачка вёрстки).
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
    <div
      ref={ref}
      className="aspect-[4/5] w-full overflow-hidden bg-muted transition-transform duration-500 ease-out group-hover:scale-[1.03] motion-reduce:transition-none motion-reduce:group-hover:scale-100"
    >
      <TemplatePreview template={template} width={width} />
    </div>
  );
}

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
            {/*
              Карточка = превью + градиент снизу с названием. Выбор — прозрачная кнопка на всю карточку (поверх превью:
              в превью свои кнопки, вложенные <button> ломают гидратацию). На компьютере при наведении/фокусе
              появляется «Выбрать»; на телефоне наведения нет — карточку просто нажимают.
            */}
            <div className="group relative overflow-hidden rounded-[24px] bg-card shadow-[0_18px_40px_rgb(15_12_10/0.06)] transition-[translate,box-shadow,scale] duration-300 ease-out has-[button:focus-visible]:ring-3 has-[button:focus-visible]:ring-ring active:scale-[0.98] pointer-fine:hover:-translate-y-1 pointer-fine:hover:shadow-[0_24px_48px_rgb(15_12_10/0.12)] motion-reduce:transition-none motion-reduce:active:scale-100 motion-reduce:hover:translate-y-0 sm:rounded-[28px]">
              <FitPreview template={t} />
              {/* Градиент только под подписью и полупрозрачный — превью почти целиком видно; белый текст держит тень у букв. */}
              {/* Размытие под подписью (маска сходит на нет кверху): мелкий текст приглашения не спорит с названием. */}
              <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-[30%] backdrop-blur-[8px] [mask-image:linear-gradient(to_top,black_45%,transparent)]" />
              <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_top,rgb(20_14_10/0.42)_0%,rgb(20_14_10/0.26)_16%,rgb(20_14_10/0.06)_30%,transparent_40%)]" />
              <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col gap-1 p-5 text-white sm:p-5">
                {/* Настроение шаблона — первая фраза описания («Пудровые тона»); при наведении её сменяет «Выбрать →». */}
                <span className="relative flex items-center">
                  <span className="min-w-0 truncate text-[10px] tracking-[0.2em] text-white/80 uppercase transition-opacity duration-300 group-hover:pointer-fine:opacity-0 group-has-[button:focus-visible]:opacity-0 motion-reduce:transition-none sm:text-[10px] sm:tracking-[0.2em]">
                    {t.description.split(",")[0]}
                  </span>
                  {/* Только мышь/клавиатура: на телефоне нажимают саму карточку. */}
                  <span className="absolute left-0 hidden -translate-x-1 text-[10px] tracking-[0.16em] whitespace-nowrap uppercase opacity-0 transition-[opacity,translate] duration-300 group-hover:translate-x-0 group-hover:opacity-100 group-has-[button:focus-visible]:translate-x-0 group-has-[button:focus-visible]:opacity-100 motion-reduce:transition-none pointer-fine:inline">
                    Выбрать →
                  </span>
                </span>
                <span className="truncate text-2xl leading-tight tracking-tight [font-family:var(--font-playfair),serif] sm:text-xl">{t.name}</span>
              </div>
              <button
                type="button"
                className="absolute inset-0 cursor-pointer outline-none disabled:cursor-wait"
                aria-label={`Выбрать шаблон «${t.name}»`}
                aria-describedby={`tpl-${t.id}-desc`}
                disabled={creating !== null}
                onClick={() => {
                  setError(null);
                  setPicked(t);
                }}
              />
              <span id={`tpl-${t.id}-desc`} className="sr-only">
                {t.description}
              </span>
            </div>
          </li>
        ))}
      </ul>
      <SetupDialog template={picked} onClose={() => setPicked(null)} onCreate={create} creating={creating !== null} error={error} />
    </div>
  );
}
