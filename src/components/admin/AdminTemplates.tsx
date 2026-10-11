"use client";

import { Clapperboard, Copy, ExternalLink, Film, MoreHorizontal, Pencil, RotateCcw, Trash2, Type } from "lucide-react";
import { useState } from "react";
import { FitPreview } from "@/components/templates/TemplateCard";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import type { Template } from "@/lib/templates";
import type { AdminApi, AdminTemplate } from "./api";

type Props = {
  api: AdminApi;
  adminKey: string;
  templates: AdminTemplate[];
  /** id шаблона → сколько у него роликов. */
  videoCount: Record<string, number>;
  showcaseKey: string | null;
  onRecord: (templates: Template[]) => void;
  onShowVideos: (templateId: string) => void;
  onChanged: () => void;
};

const STATUS = { edited: "Изменён", added: "Новый" } as const;

/** Шаблоны: превью, «Редактировать» (главное действие), «Видео» и меню остального. */
export function AdminTemplates({ api, adminKey, templates, videoCount, showcaseKey, onRecord, onShowVideos, onChanged }: Props) {
  const [renaming, setRenaming] = useState<Template | null>(null);
  const [resetting, setResetting] = useState<AdminTemplate | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function run(action: () => Promise<unknown>) {
    setError(null);
    try {
      await action();
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не получилось");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-label="Шаблоны">
        {templates.map(({ template: t, status }) => {
          const videos = videoCount[t.id] ?? 0;
          return (
            <li key={t.id}>
              <Card className="h-full gap-0 overflow-hidden p-0">
                {/* Ссылка — поверх превью, а не вокруг: в превью свои кнопки (интерактив внутри <a> недопустим). */}
                <div className="group relative">
                  <FitPreview template={t} />
                  {status !== "base" && (
                    <Badge className="absolute top-3 left-3" variant={status === "added" ? "default" : "secondary"}>
                      {STATUS[status]}
                    </Badge>
                  )}
                  <a
                    href={`/admin/${adminKey}/templates/${t.id}`}
                    tabIndex={-1}
                    aria-hidden="true"
                    className="absolute inset-0"
                  />
                </div>
                <div className="flex flex-1 flex-col gap-3 p-4">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{t.name}</p>
                    <p className="line-clamp-2 text-sm text-muted-foreground">{t.description}</p>
                    <p className="mt-1 font-mono text-xs text-muted-foreground">{t.id}</p>
                  </div>
                  <div className="mt-auto flex items-center gap-2">
                    <Button asChild size="sm" className="flex-1 pointer-coarse:h-10">
                      <a href={`/admin/${adminKey}/templates/${t.id}`} aria-label={`Редактировать шаблон «${t.name}»`}>
                        <Pencil /> Редактировать
                      </a>
                    </Button>
                    <Button type="button" variant="outline" size="sm" className="pointer-coarse:h-10" aria-label={`Записать видео «${t.name}»`} onClick={() => onRecord([t])}>
                      <Clapperboard /> Видео
                    </Button>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button type="button" variant="ghost" size="icon-sm" className="pointer-coarse:size-10" aria-label={`Ещё действия с шаблоном «${t.name}»`}>
                          <MoreHorizontal />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-max min-w-48 max-w-[calc(100vw-2rem)]">
                        {videos > 0 && (
                          <DropdownMenuItem onSelect={() => onShowVideos(t.id)}>
                            <Film /> Видео шаблона ({videos})
                          </DropdownMenuItem>
                        )}
                        {showcaseKey && (
                          <DropdownMenuItem asChild>
                            <a href={`/showcase/${showcaseKey}/${t.id}`} target="_blank" rel="noopener">
                              <ExternalLink /> Показ как у гостя
                            </a>
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem onSelect={() => setRenaming(t)}>
                          <Type /> Название и описание
                        </DropdownMenuItem>
                        <DropdownMenuItem onSelect={() => run(() => api.duplicate(t.id))}>
                          <Copy /> Дублировать
                        </DropdownMenuItem>
                        {status !== "base" && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem variant="destructive" onSelect={() => setResetting({ template: t, status })}>
                              {status === "edited" ? (
                                <>
                                  <RotateCcw /> Сбросить изменения
                                </>
                              ) : (
                                <>
                                  <Trash2 /> Удалить шаблон
                                </>
                              )}
                            </DropdownMenuItem>
                          </>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </Card>
            </li>
          );
        })}
      </ul>

      <RenameDialog template={renaming} onClose={() => setRenaming(null)} onSave={(name, description) => api.rename(renaming!.id, name, description).then(onChanged)} />

      <AlertDialog open={!!resetting} onOpenChange={(open) => !open && setResetting(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {resetting?.status === "edited" ? `Сбросить изменения «${resetting.template.name}»?` : `Удалить шаблон «${resetting?.template.name}»?`}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {resetting?.status === "edited"
                ? "Шаблон снова станет таким, как в коде (src/lib/templates.ts). Черновик с правками тоже удалится."
                : "Шаблон и его черновик удалятся. Записанные видео останутся."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Отмена</AlertDialogCancel>
            <AlertDialogAction variant="destructive" onClick={() => resetting && run(() => api.reset(resetting.template.id))}>
              {resetting?.status === "edited" ? "Сбросить" : "Удалить"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function RenameDialog({ template, onClose, onSave }: { template: Template | null; onClose: () => void; onSave: (name: string, description: string) => Promise<void> }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shownFor, setShownFor] = useState<string | null>(null);
  // Поля заполняются при открытии окна для другого шаблона.
  if (template && shownFor !== template.id) {
    setShownFor(template.id);
    setName(template.name);
    setDescription(template.description);
    setError(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onSave(name, description);
      setShownFor(null);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Не удалось сохранить");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={!!template}
      onOpenChange={(open) => {
        if (open || busy) return;
        setShownFor(null);
        onClose();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <form onSubmit={submit} className="flex flex-col gap-4">
          <DialogHeader>
            <DialogTitle>Название и описание</DialogTitle>
            <DialogDescription>Видны на главной в карточке шаблона: первая фраза описания — подпись-настроение.</DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-2">
            <Label htmlFor="tpl-name">Название</Label>
            <Input id="tpl-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} required className="text-base sm:text-sm" />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="tpl-description">Описание</Label>
            <Textarea id="tpl-description" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={300} rows={3} className="text-base sm:text-sm" />
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={busy}>
              Отмена
            </Button>
            <Button type="submit" disabled={busy || !name.trim()}>
              Сохранить
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
