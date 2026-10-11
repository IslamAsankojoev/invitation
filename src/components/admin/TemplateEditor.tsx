"use client";

import { AlertCircle, Check, ExternalLink, Loader2, MoreHorizontal, RotateCcw, Save, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Editor } from "@/components/editor/Editor";
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
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { InvitationData } from "@/lib/schema";
import { replaceUrls, sameAsTemplate } from "@/lib/templateAdmin";
import type { Template } from "@/lib/templates";

type Props = {
  adminKey: string;
  template: Template;
  draft: { id: string; token: string; slug: string; data: InvitationData };
  /** Страница показа шаблона, если задан SHOWCASE_KEY. */
  showcaseHref: string | null;
};

/** Редактор черновика шаблона: всё как в обычном редакторе, плюс «Сохранить в шаблон» и «Начать заново». */
export function TemplateEditor({ adminKey, template: initial, draft, showcaseHref }: Props) {
  const [template, setTemplate] = useState(initial);
  const backHref = `/admin/${adminKey}`;
  return (
    <Editor
      id={draft.id}
      token={draft.token}
      initialSlug={draft.slug}
      initialData={draft.data}
      templateMode={{
        name: template.name,
        backHref,
        actions: (data, setData) => (
          <SaveActions adminKey={adminKey} template={template} data={data} setData={setData} onSaved={setTemplate} showcaseHref={showcaseHref} />
        ),
      }}
    />
  );
}

type SaveState = { kind: "idle" } | { kind: "saving" } | { kind: "error"; text: string };

function SaveActions({
  adminKey,
  template,
  data,
  setData,
  onSaved,
  showcaseHref,
}: {
  adminKey: string;
  template: Template;
  data: InvitationData;
  setData: (next: InvitationData) => void;
  onSaved: (t: Template) => void;
  showcaseHref: string | null;
}) {
  const [state, setState] = useState<SaveState>({ kind: "idle" });
  const [confirmReset, setConfirmReset] = useState(false);
  const dirty = useMemo(() => !sameAsTemplate(template, data), [template, data]);
  const api = `/api/admin/${adminKey}/templates/${template.id}`;

  // Есть несохранённые в шаблон правки — браузер переспросит перед уходом со страницы.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  async function save() {
    setState({ kind: "saving" });
    const res = await fetch(api, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ data }) }).catch(() => null);
    const body = await res?.json().catch(() => null);
    if (!res?.ok || !body?.template) return setState({ kind: "error", text: body?.error ?? "Не удалось сохранить шаблон" });
    // Загруженные фото перенесены в public/templates — черновик тоже ссылается на копии, а не на загрузки.
    if (Object.keys(body.replaced ?? {}).length) setData(replaceUrls(data, body.replaced));
    onSaved(body.template);
    setState({ kind: "idle" });
  }

  async function reset() {
    const res = await fetch(`${api}/draft`, { method: "POST" }).catch(() => null);
    if (!res?.ok) return setState({ kind: "error", text: "Не удалось начать заново" });
    window.location.reload();
  }

  const saving = state.kind === "saving";
  return (
    <>
      <span role="status" className="sr-only">
        {saving ? "Сохраняю шаблон…" : dirty ? "Есть несохранённые в шаблон правки" : "Шаблон сохранён"}
      </span>
      {/* Ошибка — не в шапке (там нет места), а сообщением внизу панели: над нижней навигацией на телефоне. */}
      {state.kind === "error" && (
        <div
          role="alert"
          className="fixed inset-x-4 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-50 flex items-start gap-2 rounded-lg border border-destructive/40 bg-background p-3 text-sm text-destructive shadow-lg lg:right-auto lg:bottom-4 lg:w-[428px]"
        >
          <AlertCircle aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <p className="min-w-0 flex-1 break-words">{state.text}</p>
          <Button type="button" variant="ghost" size="icon-xs" className="-m-1 shrink-0 pointer-coarse:size-10" aria-label="Закрыть сообщение" onClick={() => setState({ kind: "idle" })}>
            <X />
          </Button>
        </div>
      )}
      <Button type="button" size="sm" className="pointer-coarse:h-10" disabled={!dirty || saving} onClick={save}>
        {saving ? <Loader2 className="animate-spin motion-reduce:animate-none" /> : dirty ? <Save /> : <Check />}
        <span className="max-sm:sr-only">{dirty ? "Сохранить в шаблон" : "Сохранено"}</span>
      </Button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="ghost" size="icon-sm" className="pointer-coarse:size-10" aria-label="Ещё действия с шаблоном">
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-max min-w-48 max-w-[calc(100vw-2rem)]">
          {showcaseHref && (
            <DropdownMenuItem asChild>
              <a href={showcaseHref} target="_blank" rel="noopener">
                <ExternalLink /> Показ сохранённого шаблона
              </a>
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onSelect={() => setConfirmReset(true)}>
            <RotateCcw /> Начать заново
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <AlertDialog open={confirmReset} onOpenChange={setConfirmReset}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Начать заново?</AlertDialogTitle>
            <AlertDialogDescription>Черновик станет таким же, как сохранённый шаблон. Несохранённые в шаблон правки пропадут.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={reset}>
              Начать заново
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
