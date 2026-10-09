"use client";

import { Loader2, Pause, Play, Sparkles } from "lucide-react";
import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { NativeSelect, NativeSelectOption } from "@/components/ui/native-select";
import { findBlock } from "@/lib/blocks";
import { DEFAULT_MUSIC_URL, musicTracks } from "@/lib/music";
import { setupSchema, type Setup } from "@/lib/setup";
import { createFromTemplate, type Template } from "@/lib/templates";

type Props = {
  /** Выбранный шаблон; null — окно закрыто. */
  template: Template | null;
  onClose: () => void;
  /** setup — ответы формы; null — «Пропустить» (приглашение с примером текстов шаблона). */
  onCreate: (template: Template, setup: Setup | null) => void;
  creating: boolean;
  error: string | null;
};

/**
 * Поля даты и времени в iOS Safari: своя минимальная ширина (вылезали за край) и текст по центру.
 * appearance-none + min-w-0 возвращают обычную ширину, значение — слева, как в остальных полях.
 */
const dateInput = "min-w-0 appearance-none [&::-webkit-date-and-time-value]:text-left [&::-webkit-date-and-time-value]:min-h-[1.5em]";

type Errors = Partial<Record<"names" | "date", string>>;

/**
 * Главное о событии перед редактором: имена, дата, место, песня. На компьютере — окно, на телефоне — весь экран.
 * Примеры шаблона — в подсказках полей, а не в значениях: человек вписывает своё, а не стирает чужое.
 */
export function SetupDialog({ template, onClose, onCreate, creating, error }: Props) {
  return (
    <Dialog open={template !== null} onOpenChange={(open) => !open && !creating && onClose()}>
      <DialogContent
        className="gap-0 p-0 max-sm:inset-0 max-sm:flex max-sm:h-dvh max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:flex-col max-sm:rounded-none max-sm:ring-0 sm:max-w-lg"
      >
        {/* key: форма с нуля для каждого шаблона. */}
        {template && <SetupForm key={template.id} template={template} onCreate={onCreate} creating={creating} error={error} />}
      </DialogContent>
    </Dialog>
  );
}

function SetupForm({ template, onCreate, creating, error }: Omit<Props, "template" | "onClose"> & { template: Template }) {
  const sample = createFromTemplate(template);
  const hero = findBlock(sample, "hero")!;
  const location = findBlock(sample, "location");

  const [names, setNames] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("16:00");
  const [placeName, setPlaceName] = useState("");
  const [address, setAddress] = useState("");
  const [musicUrl, setMusicUrl] = useState<string>(DEFAULT_MUSIC_URL);
  const [errors, setErrors] = useState<Errors>({});
  const ids = { names: useId(), date: useId(), time: useId(), place: useId(), address: useId(), music: useId(), err: useId() };
  const namesRef = useRef<HTMLInputElement>(null);
  const dateRef = useRef<HTMLInputElement>(null);

  function submit(e: FormEvent) {
    e.preventDefault();
    const parsed = setupSchema.safeParse({ names, date: date ? `${date}T${time || "00:00"}` : "", placeName, address, musicUrl: musicUrl || null });
    if (!parsed.success) {
      const next: Errors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0];
        if (key === "names") next.names = "Укажите имена — например, «Анна & Иван»";
        if (key === "date") next.date = "Укажите дату события";
      }
      setErrors(next);
      // Фокус — на первое поле с ошибкой (правило focus-management).
      (next.names ? namesRef : dateRef).current?.focus();
      return;
    }
    onCreate(template, parsed.data);
  }

  return (
    <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col">
      <DialogHeader className="border-b px-5 pt-5 pb-4 text-left max-sm:pt-[calc(1.25rem+env(safe-area-inset-top))]">
        <DialogTitle className="flex items-center gap-2 text-lg">
          <Sparkles aria-hidden="true" className="size-4 text-primary" /> Главное о событии
        </DialogTitle>
        <DialogDescription>
          Шаблон «{template.name}». Остальное — фото, программу, оформление — поменяете в редакторе.
        </DialogDescription>
      </DialogHeader>

      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-5 py-5 sm:max-h-[60vh]">
        <Field data-invalid={!!errors.names || undefined}>
          <FieldLabel htmlFor={ids.names}>Имена</FieldLabel>
          <Input
            ref={namesRef}
            id={ids.names}
            value={names}
            placeholder={hero.names}
            autoComplete="off"
            aria-invalid={!!errors.names || undefined}
            aria-describedby={`${ids.names}-d`}
            onChange={(e) => {
              setNames(e.target.value);
              if (errors.names) setErrors({ ...errors, names: undefined });
            }}
          />
          {errors.names ? (
            <FieldError id={`${ids.names}-d`}>{errors.names}</FieldError>
          ) : (
            <FieldDescription id={`${ids.names}-d`}>Через «&» — имена встанут в две строки</FieldDescription>
          )}
        </Field>

        <div className="grid grid-cols-[1fr_8.5rem] gap-3">
          <Field data-invalid={!!errors.date || undefined}>
            <FieldLabel htmlFor={ids.date}>Дата</FieldLabel>
            {/* iOS не показывает подсказку в пустом поле даты — рисуем её сами поверх. */}
            <div className="relative">
            <Input
              ref={dateRef}
              id={ids.date}
              type="date"
              className={dateInput}
              value={date}
              aria-invalid={!!errors.date || undefined}
              aria-describedby={errors.date ? `${ids.date}-e` : undefined}
              onChange={(e) => {
                setDate(e.target.value);
                if (errors.date) setErrors({ ...errors, date: undefined });
              }}
            />
            {!date && (
              <span aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-2.5 flex items-center text-base text-muted-foreground md:text-sm sm:hidden">
                Выберите дату
              </span>
            )}
            </div>
            {errors.date && <FieldError id={`${ids.date}-e`}>{errors.date}</FieldError>}
          </Field>
          <Field>
            <FieldLabel htmlFor={ids.time}>Время</FieldLabel>
            <Input id={ids.time} type="time" className={dateInput} value={time} onChange={(e) => setTime(e.target.value)} />
          </Field>
        </div>

        {location && (
          <fieldset className="flex flex-col gap-3">
            <legend className="mb-1 text-sm font-medium">
              Место <span className="font-normal text-muted-foreground">— можно позже</span>
            </legend>
            <Field>
              <FieldLabel htmlFor={ids.place} className="font-normal text-muted-foreground">
                Название места
              </FieldLabel>
              <Input id={ids.place} value={placeName} placeholder={location.placeName} onChange={(e) => setPlaceName(e.target.value)} />
            </Field>
            <Field>
              <FieldLabel htmlFor={ids.address} className="font-normal text-muted-foreground">
                Адрес
              </FieldLabel>
              <Input id={ids.address} value={address} placeholder={location.address} autoComplete="street-address" onChange={(e) => setAddress(e.target.value)} />
            </Field>
          </fieldset>
        )}

        <Field>
          <FieldLabel htmlFor={ids.music}>Музыка</FieldLabel>
          <div className="flex gap-2">
            <NativeSelect id={ids.music} value={musicUrl} onChange={(e) => setMusicUrl(e.target.value)} className="min-w-0 flex-1">
              {musicTracks.map((t) => (
                <NativeSelectOption key={t.id} value={t.src}>
                  {t.title} — {t.artist}
                </NativeSelectOption>
              ))}
              <NativeSelectOption value="">Без музыки</NativeSelectOption>
            </NativeSelect>
            <Listen url={musicUrl} />
          </div>
          <FieldDescription>Включится, когда гость откроет приглашение</FieldDescription>
        </Field>

        <div className="flex-col-reverse gap-2 max-sm:pb-[calc(1rem+env(safe-area-inset-bottom))] sm:flex-row sm:justify-between w-full flex">
        <Button type="button" variant="ghost" disabled={creating} onClick={() => onCreate(template, null)} className="pointer-coarse:h-11">
          Пропустить — заполню потом
        </Button>
        <Button type="submit" disabled={creating} aria-busy={creating} className="pointer-coarse:h-11">
          {creating && <Loader2 className="animate-spin" />}
          {creating ? "Создаю…" : "Создать приглашение"}
        </Button>
      </div>
      </div>

      
      {error && (
        <p role="alert" id={ids.err} className="mx-5 mb-4 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
    </form>
  );
}

/** «Послушать» выбранную песню; смена песни или закрытие окна — тишина. */
function Listen({ url }: { url: string }) {
  const audio = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  useEffect(() => {
    audio.current?.pause();
    setPlaying(false);
  }, [url]);
  if (!url) return null;
  return (
    <>
      <audio ref={audio} src={url} preload="none" onEnded={() => setPlaying(false)} onPause={() => setPlaying(false)} onPlay={() => setPlaying(true)} />
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="shrink-0 pointer-coarse:size-10"
        aria-label={playing ? "Остановить песню" : "Послушать песню"}
        aria-pressed={playing}
        onClick={() => (playing ? audio.current?.pause() : audio.current?.play().catch(() => {}))}
      >
        {playing ? <Pause /> : <Play />}
      </Button>
    </>
  );
}
