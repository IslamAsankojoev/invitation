"use client";

import { ChevronLeft, ChevronRight, Crown, ImagePlus, Loader2, Plus, Upload, X } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FieldError, FieldLabel } from "@/components/ui/field";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { categoryLabels, libraryBy, type LibraryCategory } from "@/lib/library";
import { cn } from "@/lib/utils";
import { useUploadFile } from "./api";

/** Пометка платного элемента. В редакторе им можно пользоваться — тариф понадобится при публикации. */
export function ProBadge({ className }: { className?: string }) {
  return (
    <span
      title="Доступно на PRO-тарифе"
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full bg-amber-100 px-1.5 py-px text-[9px] leading-none font-semibold tracking-wide text-amber-800 uppercase",
        className,
      )}
    >
      <Crown className="size-2.5" aria-hidden="true" />
      PRO
    </span>
  );
}

/** Шахматка под прозрачными PNG — видно, где у картинки прозрачный фон. */
export const checker =
  "bg-[conic-gradient(var(--color-muted)_25%,var(--color-background)_0_50%,var(--color-muted)_0_75%,var(--color-background)_0)] bg-[length:14px_14px]";

/** Загрузка файла с состоянием «занят» и текстом ошибки. */
function useUpload(onDone: (url: string) => void) {
  const uploadFile = useUploadFile();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function upload(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      onDone(await uploadFile(file));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  return { busy, error, upload };
}

type PickerProps = {
  open: boolean;
  title: string;
  categories: LibraryCategory[];
  onPick: (src: string) => void;
  onOpenChange: (open: boolean) => void;
};

/** Окно выбора картинки: готовые PNG из библиотеки по категориям или своя загрузка. */
export function ImagePicker({ open, title, categories, onPick, onOpenChange }: PickerProps) {
  const [category, setCategory] = useState(categories[0]);
  const { busy, error, upload } = useUpload(onPick);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[85svh] flex-col gap-4 sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>Лучше всего смотрятся PNG/WebP с прозрачным фоном, до 5 МБ.</DialogDescription>
        </DialogHeader>
        {categories.length > 1 && (
          <ToggleGroup
            type="single"
            variant="outline"
            size="sm"
            value={category}
            onValueChange={(v) => v && setCategory(v as LibraryCategory)}
            aria-label="Категория"
            className="flex-wrap"
          >
            {categories.map((c) => (
              <ToggleGroupItem key={c} value={c}>
                {categoryLabels[c]}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        )}
        {/* Прокрутка — у обёртки, а не у самой сетки: иначе во flex-окне строки сжимаются и плитки налезают. */}
        <div className="-mx-1 min-h-0 overflow-y-auto px-1 pb-1">
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {libraryBy([category]).map((a) => (
              <button
                key={a.id}
                type="button"
                title={a.label}
                aria-label={a.label}
                onClick={() => onPick(a.src)}
                className={cn(
                  "group relative flex aspect-square flex-col overflow-hidden rounded-lg border outline-none transition hover:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
                  checker,
                )}
              >
                {a.premium && <ProBadge className="absolute top-1 right-1 z-10" />}
                <img src={a.src} alt="" className="min-h-0 flex-1 object-contain p-2 transition group-hover:scale-105" />
                <span className="truncate bg-background/90 px-1 py-1 text-[11px] text-muted-foreground">{a.label}</span>
              </button>
            ))}
            <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed text-center text-xs text-muted-foreground transition hover:border-ring hover:text-foreground">
              {busy ? <Loader2 className="size-5 animate-spin" /> : <ImagePlus className="size-5" />}
              {busy ? "Загружаю…" : "Своя картинка"}
              <input
                type="file"
                accept="image/*"
                className="sr-only"
                aria-label="Загрузить свою картинку"
                disabled={busy}
                onChange={(e) => upload(e.target.files?.[0])}
              />
            </label>
          </div>
        </div>
        {error && <FieldError>{error}</FieldError>}
      </DialogContent>
    </Dialog>
  );
}

/** Поле «картинка из библиотеки или своя»: превью, «Выбрать», «Убрать». */
export function LibraryImageField({
  label,
  value,
  categories,
  onChange,
}: {
  label: string;
  value: string | null;
  categories: LibraryCategory[];
  onChange: (src: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex flex-col gap-2">
      <FieldLabel>{label}</FieldLabel>
      <div className="flex items-center gap-2">
        {value && <img src={value} alt="" className={cn("size-9 rounded-md border object-contain", checker)} />}
        <Button type="button" variant="outline" size="sm" onClick={() => setOpen(true)}>
          <ImagePlus /> {value ? "Заменить" : "Выбрать"}
        </Button>
        {value && (
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
            <X /> Убрать
          </Button>
        )}
      </div>
      <ImagePicker
        open={open}
        onOpenChange={setOpen}
        title={label}
        categories={categories}
        onPick={(src) => {
          onChange(src);
          setOpen(false);
        }}
      />
    </div>
  );
}

/** Поле загрузки фотографии (без библиотеки). */
export function UploadField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string | null;
  onChange: (url: string | null) => void;
}) {
  const { busy, error, upload } = useUpload(onChange);
  return (
    <div className="flex flex-col gap-2">
      <FieldLabel>{label}</FieldLabel>
      <div className="flex items-center gap-2">
        {value && <img src={value} alt="" className="size-9 rounded-md object-cover" />}
        <Button asChild variant="outline" size="sm" className={cn(busy && "pointer-events-none opacity-60")}>
          <label>
            {busy ? <Loader2 className="animate-spin" /> : <Upload />}
            {busy ? "Загружаю…" : value ? "Заменить" : "Загрузить фото"}
            <input
              type="file"
              accept="image/*"
              className="sr-only"
              aria-label={label}
              disabled={busy}
              onChange={(e) => upload(e.target.files?.[0])}
            />
          </label>
        </Button>
        {value && (
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
            <X /> Убрать
          </Button>
        )}
      </div>
      {error && <FieldError>{error}</FieldError>}
    </div>
  );
}

/** Список фото (галерея): миниатюры с «левее/правее/убрать» и загрузка сразу нескольких файлов. */
export function PhotoListField({
  label,
  value,
  max,
  onChange,
}: {
  label: string;
  value: string[];
  max: number;
  onChange: (urls: string[]) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const uploadFile = useUploadFile();
  const move = (i: number, d: number) => {
    const next = [...value];
    [next[i], next[i + d]] = [next[i + d], next[i]];
    onChange(next);
  };

  async function upload(files: FileList | null) {
    const list = Array.from(files ?? []).slice(0, max - value.length);
    if (!list.length) return;
    setBusy(true);
    setError(null);
    const urls: string[] = [];
    try {
      // По одному: так понятнее, на каком файле ошибка, и загруженные до неё не теряются.
      for (const file of list) urls.push(await uploadFile(file));
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      if (urls.length) onChange([...value, ...urls]);
    }
  }

  const arrow = "absolute bottom-1 flex size-6 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm disabled:hidden";
  return (
    <div className="flex flex-col gap-2">
      <FieldLabel>
        {label} <span className="font-normal text-muted-foreground">{value.length} из {max}</span>
      </FieldLabel>
      <div className="grid grid-cols-3 gap-2">
        {value.map((src, i) => (
          <div key={`${src}-${i}`} className="group relative aspect-square overflow-hidden rounded-lg border">
            <img src={src} alt="" className="size-full object-cover" />
            <button type="button" aria-label={`Убрать фото ${i + 1}`} onClick={() => onChange(value.filter((_, j) => j !== i))} className={`${arrow} top-1 right-1 bottom-auto`}>
              <X className="size-3.5" />
            </button>
            <button type="button" aria-label={`Фото ${i + 1} левее`} disabled={i === 0} onClick={() => move(i, -1)} className={`${arrow} left-1`}>
              <ChevronLeft className="size-3.5" />
            </button>
            <button type="button" aria-label={`Фото ${i + 1} правее`} disabled={i === value.length - 1} onClick={() => move(i, 1)} className={`${arrow} right-1`}>
              <ChevronRight className="size-3.5" />
            </button>
          </div>
        ))}
        {value.length < max && (
          <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed text-center text-xs text-muted-foreground transition hover:border-ring hover:text-foreground">
            {busy ? <Loader2 className="size-5 animate-spin" /> : <ImagePlus className="size-5" />}
            {busy ? "Загружаю…" : "Добавить фото"}
            <input
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              aria-label={`${label}: добавить`}
              disabled={busy}
              onChange={(e) => {
                upload(e.target.files);
                e.target.value = "";
              }}
            />
          </label>
        )}
      </div>
      {error && <FieldError>{error}</FieldError>}
    </div>
  );
}

/** Выбор одного варианта из нескольких (ToggleGroup, у которого нельзя «снять» выбор). */
export function Segmented<T extends string>({
  label,
  value,
  options,
  premium = [],
  onChange,
}: {
  label: string;
  value: T;
  options: Record<T, string>;
  /** Платные варианты — с пометкой PRO. */
  premium?: T[];
  onChange: (value: T) => void;
}) {
  return (
    <div className="flex flex-col gap-2">
      <FieldLabel>{label}</FieldLabel>
      <ToggleGroup
        type="single"
        variant="outline"
        size="sm"
        spacing={1}
        className="flex-wrap"
        aria-label={label}
        value={value}
        onValueChange={(v) => v && onChange(v as T)}
      >
        {(Object.keys(options) as T[]).map((key) => (
          <ToggleGroupItem
            key={key}
            value={key}
            className="data-[state=on]:border-primary data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
          >
            {options[key]}
            {premium.includes(key) && <ProBadge />}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  );
}

/** Карточка-раздел панели редактора. */
export function Group({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <Card size="sm" className={cn("gap-4", className)}>
      <CardHeader>
        <CardTitle className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">{children}</CardContent>
    </Card>
  );
}

/** Кнопка «＋ …» вместо пустого необязательного поля: поле появляется по нажатию. */
export function AddFieldButton({ onClick, children }: { onClick: () => void; children: string }) {
  return (
    <Button type="button" variant="ghost" size="sm" className="-ml-2 self-start text-muted-foreground" onClick={onClick}>
      <Plus /> {children}
    </Button>
  );
}

/** Свёрнутая «Тонкая настройка» раздела: точные числа и редкие настройки (уровень 3 из editor-ux.md). */
export function FineTuning({ label = "Тонкая настройка", children }: { label?: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <Collapsible open={open} onOpenChange={setOpen} className="border-t pt-2">
      <CollapsibleTrigger asChild>
        <Button type="button" variant="ghost" size="sm" className="-ml-2 text-muted-foreground">
          <ChevronRight className={cn("transition-transform", open && "rotate-90")} /> {label}
        </Button>
      </CollapsibleTrigger>
      <CollapsibleContent className="flex flex-col gap-4 pt-3">{children}</CollapsibleContent>
    </Collapsible>
  );
}
