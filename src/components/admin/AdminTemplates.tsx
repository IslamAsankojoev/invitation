"use client";

import {
  closestCenter,
  DndContext,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove, rectSortingStrategy, SortableContext, sortableKeyboardCoordinates, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowLeft, ArrowRight, Clapperboard, Copy, ExternalLink, EyeOff, Film, GripVertical, MoreHorizontal, Pencil, RotateCcw, Trash2, Type } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { templateEvents, type Template } from "@/lib/templates";
import { cn } from "@/lib/utils";
import type { AdminApi, AdminTemplate } from "./api";
import { eventTypeLabels } from "@/lib/copy";
import { EVENT_TYPES, type EventType } from "@/lib/schema";

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

/**
 * Шаблоны: превью, «Редактировать» (главное действие), «Видео» и меню остального. Порядок — перетаскиванием за ручку
 * (или «Раньше / Позже» в меню): так же они идут на главной и в показе (order в template-overrides.json).
 */
export function AdminTemplates({ api, adminKey, templates, videoCount, showcaseKey, onRecord, onShowVideos, onChanged }: Props) {
  const [renaming, setRenaming] = useState<Template | null>(null);
  const [resetting, setResetting] = useState<AdminTemplate | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Порядок меняется сразу (не ждём сервер); пришёл новый список с сервера — берём его.
  const [order, setOrder] = useState(() => templates.map((t) => t.template.id));
  // Публикация тоже меняется сразу; сервер ответил новым списком — правда в нём.
  const [publishing, setPublishing] = useState<Record<string, boolean>>({});
  const [shownFor, setShownFor] = useState(templates);
  if (shownFor !== templates) {
    setShownFor(templates);
    setOrder(templates.map((t) => t.template.id));
    setPublishing({});
  }
  const byId = new Map(templates.map((t) => [t.template.id, t]));
  const items = order.flatMap((id) => byId.get(id) ?? []);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  async function run(action: () => Promise<unknown>) {
    setError(null);
    try {
      await action();
      onChanged();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не получилось");
    }
  }

  function move(from: number, to: number) {
    if (from === to || to < 0 || to >= order.length) return;
    const before = order;
    const next = arrayMove(order, from, to);
    setOrder(next);
    setError(null);
    api
      .reorder(next)
      .then(onChanged)
      .catch((e) => {
        setOrder(before);
        setError(e instanceof Error ? e.message : "Не удалось сохранить порядок");
      });
  }

  function publish(id: string, published: boolean) {
    setPublishing((p) => ({ ...p, [id]: published }));
    setError(null);
    api
      .setPublished(id, published)
      .then(onChanged)
      .catch((e) => {
        setPublishing((p) => {
          const next = { ...p };
          delete next[id];
          return next;
        });
        setError(e instanceof Error ? e.message : "Не удалось сохранить");
      });
  }

  function onDragEnd({ active, over }: DragEndEvent) {
    if (over) move(order.indexOf(String(active.id)), order.indexOf(String(over.id)));
  }

  const name = (id: unknown) => byId.get(String(id))?.template.name ?? String(id);
  const announcements: Announcements = {
    onDragStart: ({ active }) => `Шаблон «${name(active.id)}» взят.`,
    onDragOver: ({ active, over }) => (over ? `Шаблон «${name(active.id)}» на месте шаблона «${name(over.id)}».` : undefined),
    onDragEnd: ({ active, over }) =>
      over ? `Шаблон «${name(active.id)}» перемещён на место шаблона «${name(over.id)}».` : `Шаблон «${name(active.id)}» отпущен.`,
    onDragCancel: ({ active }) => `Перемещение шаблона «${name(active.id)}» отменено.`,
  };

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <DndContext
        // Стабильный id: иначе aria-describedby на сервере и клиенте разные (hydration mismatch).
        id="admin-templates-dnd"
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={onDragEnd}
        accessibility={{
          announcements,
          screenReaderInstructions: {
            draggable: "Чтобы взять шаблон, нажмите пробел. Стрелками перемещайте, пробелом отпустите, Escape — отмена.",
          },
        }}
      >
        <SortableContext items={order} strategy={rectSortingStrategy}>
          <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4" aria-label="Шаблоны">
            {items.map(({ template: t, status, published }, i) => (
              <TemplateItem
                key={t.id}
                template={t}
                status={status}
                published={publishing[t.id] ?? published}
                onPublish={(value) => publish(t.id, value)}
                adminKey={adminKey}
                videos={videoCount[t.id] ?? 0}
                showcaseKey={showcaseKey}
                onRecord={() => onRecord([t])}
                onShowVideos={() => onShowVideos(t.id)}
                onRename={() => setRenaming(t)}
                onDuplicate={() => run(() => api.duplicate(t.id))}
                onReset={() => setResetting({ template: t, status, published })}
                onMoveBack={i > 0 ? () => move(i, i - 1) : undefined}
                onMoveForward={i < items.length - 1 ? () => move(i, i + 1) : undefined}
              />
            ))}
          </ul>
        </SortableContext>
      </DndContext>

      <RenameDialog template={renaming} onClose={() => setRenaming(null)} onSave={(name, description, events) => api.rename(renaming!.id, name, description, events).then(onChanged)} />

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

type ItemProps = {
  template: Template;
  status: AdminTemplate["status"];
  /** Виден на главной и в выборе шаблона; скрытый — только здесь и в показе. */
  published: boolean;
  onPublish: (published: boolean) => void;
  adminKey: string;
  videos: number;
  showcaseKey: string | null;
  onRecord: () => void;
  onShowVideos: () => void;
  onRename: () => void;
  onDuplicate: () => void;
  onReset: () => void;
  onMoveBack?: () => void;
  onMoveForward?: () => void;
};

/** Карточка шаблона; ручка в углу превью — перетаскивание (мышь, касание, клавиатура). */
function TemplateItem({ template: t, status, published, onPublish, adminKey, videos, showcaseKey, onRecord, onShowVideos, onRename, onDuplicate, onReset, onMoveBack, onMoveForward }: ItemProps) {
  const { attributes, listeners, setNodeRef, setActivatorNodeRef, transform, transition, isDragging } = useSortable({ id: t.id });
  return (
    <li
      ref={setNodeRef}
      data-template-item={t.id}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      className={cn(isDragging && "relative z-10")}
    >
      <Card className={cn("h-full gap-0 overflow-hidden p-0 transition-shadow", isDragging && "shadow-xl ring-2 ring-ring/40")}>
        {/* Ссылка — поверх превью, а не вокруг: в превью свои кнопки (интерактив внутри <a> недопустим). */}
        <div className="group relative">
          <div className={cn("transition-opacity", !published && "opacity-45 grayscale-[.6]")}>
            <FitPreview template={t} />
          </div>
          <div className="absolute top-3 left-3 flex flex-wrap gap-1.5">
            {!published && (
              <Badge variant="outline" className="bg-background/90 backdrop-blur">
                <EyeOff /> Скрыт
              </Badge>
            )}
            {status !== "base" && <Badge variant={status === "added" ? "default" : "secondary"}>{STATUS[status]}</Badge>}
          </div>
          <a href={`/admin/${adminKey}/templates/${t.id}`} tabIndex={-1} aria-hidden="true" className="absolute inset-0" />
          <button
            type="button"
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            aria-label={`Перетащить шаблон «${t.name}»`}
            className="absolute top-3 right-3 z-10 flex size-9 cursor-grab touch-none items-center justify-center rounded-lg border bg-background/90 text-muted-foreground shadow-sm outline-none backdrop-blur hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50 active:cursor-grabbing pointer-coarse:size-10"
          >
            <GripVertical className="size-4" />
          </button>
        </div>
        <div className="flex flex-1 flex-col gap-3 p-4">
          <div className="min-w-0">
            <p className="truncate font-medium">{t.name}</p>
            <p className="line-clamp-2 text-sm text-muted-foreground">{t.description}</p>
            <p className="mt-1 font-mono text-xs text-muted-foreground">{t.id}</p>
          </div>
          <div className="flex items-center justify-between gap-3 rounded-lg bg-muted/50 px-3 py-2">
            <Label htmlFor={`publish-${t.id}`} className="flex flex-col items-start gap-0.5 font-normal">
              <span className="text-sm font-medium">{published ? "Опубликован" : "Не опубликован"}</span>
              <span className="text-xs text-muted-foreground">{published ? "Виден на главной" : "Только здесь и в показе"}</span>
            </Label>
            <Switch
              id={`publish-${t.id}`}
              checked={published}
              onCheckedChange={onPublish}
              aria-label={`Опубликовать шаблон «${t.name}»`}
              className="pointer-coarse:scale-110"
            />
          </div>
          <div className="mt-auto flex items-center gap-2">
            <Button asChild size="sm" className="flex-1 pointer-coarse:h-10">
              <a href={`/admin/${adminKey}/templates/${t.id}`} aria-label={`Редактировать шаблон «${t.name}»`}>
                <Pencil /> Редактировать
              </a>
            </Button>
            <Button type="button" variant="outline" size="sm" className="pointer-coarse:h-10" aria-label={`Записать видео «${t.name}»`} onClick={onRecord}>
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
                  <DropdownMenuItem onSelect={onShowVideos}>
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
                <DropdownMenuItem onSelect={onRename}>
                  <Type /> Название и описание
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={onDuplicate}>
                  <Copy /> Дублировать
                </DropdownMenuItem>
                {/* Замена перетаскиванию (WCAG 2.5.7). */}
                {(onMoveBack || onMoveForward) && <DropdownMenuSeparator />}
                {onMoveBack && (
                  <DropdownMenuItem onSelect={onMoveBack}>
                    <ArrowLeft /> Переместить раньше
                  </DropdownMenuItem>
                )}
                {onMoveForward && (
                  <DropdownMenuItem onSelect={onMoveForward}>
                    <ArrowRight /> Переместить позже
                  </DropdownMenuItem>
                )}
                {status !== "base" && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem variant="destructive" onSelect={onReset}>
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
}

function RenameDialog({
  template,
  onClose,
  onSave,
}: {
  template: Template | null;
  onClose: () => void;
  onSave: (name: string, description: string, events: EventType[]) => Promise<void>;
}) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [events, setEvents] = useState<EventType[]>(["wedding"]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shownFor, setShownFor] = useState<string | null>(null);
  // Поля заполняются при открытии окна для другого шаблона.
  if (template && shownFor !== template.id) {
    setShownFor(template.id);
    setName(template.name);
    setDescription(template.description);
    setEvents(templateEvents(template));
    setError(null);
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await onSave(name, description, events);
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
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-medium">События</legend>
            <div className="flex flex-wrap gap-1.5">
              {EVENT_TYPES.map((e) => {
                const on = events.includes(e);
                return (
                  <Button
                    key={e}
                    type="button"
                    size="sm"
                    variant={on ? "default" : "outline"}
                    aria-pressed={on}
                    className="rounded-full"
                    // Хотя бы одно событие остаётся отмеченным.
                    onClick={() => setEvents(on ? (events.length > 1 ? events.filter((x) => x !== e) : events) : [...events, e])}
                  >
                    {eventTypeLabels[e]}
                  </Button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">Фильтр на главной. Первое отмеченное — событие нового приглашения по шаблону.</p>
          </fieldset>
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
