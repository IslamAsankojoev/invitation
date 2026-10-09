"use client";

import { CalendarDays, Check, ImagePlus, Loader2, MapPin, PartyPopper, Send, Users, X } from "lucide-react";
import { useId, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { findBlock, updateBlock } from "@/lib/blocks";
import { EVENT_KINDS, joinDateTime, normalizeMapUrl, splitDateTime } from "@/lib/quickStart";
import type { BlockOf, InvitationData } from "@/lib/schema";
import { cn } from "@/lib/utils";
import { useUpload } from "./controls";

type Step = "names" | "date" | "place" | "photo" | "done";

type Props = {
  data: InvitationData;
  onChange: (data: InvitationData) => void;
  onClose: () => void;
  /** «Отправить гостям» на последнем шаге. */
  onShare: () => void;
};

const stepInfo: Record<Exclude<Step, "done">, { title: string; hint: string; icon: ReactNode }> = {
  names: { title: "Что празднуем?", hint: "Повод и имена — их гости увидят первыми", icon: <Users /> },
  date: { title: "Когда?", hint: "Дата и время начала — по ним идут календарь и обратный отсчёт", icon: <CalendarDays /> },
  place: { title: "Где?", hint: "Название, адрес и ссылка на карту — гости найдут дорогу в один клик", icon: <MapPin /> },
  photo: { title: "Ваше фото", hint: "Фото на главном экране делает приглашение личным. Можно пропустить и добавить позже", icon: <ImagePlus /> },
};

/** Крупная кнопка выбора фото: на телефоне откроет галерею или камеру. */
function PhotoStep({ value, onChange }: { value: string | null; onChange: (url: string | null) => void }) {
  const { busy, error, upload } = useUpload(onChange);
  return (
    <div className="flex flex-col gap-2">
      <label
        className={cn(
          "relative flex aspect-[4/3] cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border-2 border-dashed bg-muted/40 text-sm text-muted-foreground transition hover:bg-muted focus-within:ring-3 focus-within:ring-ring/50",
          busy && "pointer-events-none opacity-70",
        )}
      >
        {value ? (
          <img src={value} alt="" className="absolute inset-0 size-full object-cover" />
        ) : (
          <>
            <ImagePlus className="size-8" />
            Выберите фото с телефона
          </>
        )}
        {busy && (
          <span className="absolute inset-0 flex items-center justify-center bg-background/60">
            <Loader2 className="size-6 animate-spin" />
          </span>
        )}
        <input
          type="file"
          accept="image/*"
          className="sr-only"
          aria-label="Фото на главном экране"
          disabled={busy}
          onChange={(e) => upload(e.target.files?.[0])}
        />
      </label>
      {/* Фото-примеры шаблонов лежат в /templates/ — честно говорим, что это не их снимок. */}
      {value?.startsWith("/templates/") && (
        <p className="text-sm text-muted-foreground">Сейчас стоит фото из примера — нажмите на него, чтобы выбрать своё.</p>
      )}
      {value && (
        <Button type="button" variant="ghost" size="sm" className="self-start" onClick={() => onChange(null)}>
          <X /> Убрать фото
        </Button>
      )}
      {error && <FieldError>{error}</FieldError>}
    </div>
  );
}

/**
 * Быстрый старт после выбора шаблона: три коротких шага вместо поиска полей по блокам. Всё пишется в приглашение
 * сразу — превью и автосохранение работают как обычно. Поля сначала пустые, пример шаблона — в подсказке:
 * так не нужно стирать «Анна & Иван», а пропущенное поле остаётся как в шаблоне.
 */
export function QuickStart({ data, onChange, onClose, onShare }: Props) {
  const hero = findBlock(data, "hero");
  const location = findBlock(data, "location");
  const steps: Step[] = ["names", "date", ...(location ? (["place"] as const) : []), "photo", "done"];
  const [step, setStep] = useState<Step>("names");
  const index = steps.indexOf(step);
  const ids = useId();

  // Пока поле пустое, в приглашении остаётся пример шаблона.
  const [names, setNames] = useState("");
  const [place, setPlace] = useState("");
  const [address, setAddress] = useState("");
  const [map, setMap] = useState("");
  const mapUrl = normalizeMapUrl(map);
  const { date, time } = splitDateTime(hero?.date ?? "");

  if (!hero) return null;

  const setHero = (patch: Partial<Omit<BlockOf<"hero">, "type">>) => onChange(updateBlock(data, "hero", patch));
  const setLocation = (patch: Partial<Omit<BlockOf<"location">, "type">>) => onChange(updateBlock(data, "location", patch));
  const next = () => setStep(steps[index + 1]);

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      {/* На телефоне — у верхнего края: снизу место займёт клавиатура. */}
      <DialogContent className="max-sm:top-4 max-sm:translate-y-0" aria-describedby={`${ids}-hint`}>
        {step === "done" ? (
          <div className="flex flex-col items-center gap-3 text-center">
            <PartyPopper className="size-10 text-primary" />
            <DialogTitle className="text-lg">Приглашение готово!</DialogTitle>
            <DialogDescription id={`${ids}-hint`}>
              Отправьте ссылку гостям в WhatsApp или Telegram. Фото, цвета, музыку и тексты можно поменять в любой
              момент — гости увидят изменения по той же ссылке.
            </DialogDescription>
            <div className="mt-2 flex w-full flex-col gap-2">
              <Button type="button" size="lg" onClick={onShare}>
                <Send /> Отправить гостям
              </Button>
              <Button type="button" size="lg" variant="outline" onClick={onClose}>
                Оформить дальше
              </Button>
            </div>
          </div>
        ) : (
          <form
            className="flex flex-col gap-5"
            onSubmit={(e) => {
              e.preventDefault();
              next();
            }}
          >
            <div className="flex flex-col gap-1 pr-8">
              <p className="flex items-center gap-2 text-xs text-muted-foreground [&_svg]:size-4">
                {stepInfo[step].icon} Шаг {index + 1} из {steps.length - 1}
              </p>
              <DialogTitle className="text-lg">{stepInfo[step].title}</DialogTitle>
              <DialogDescription id={`${ids}-hint`}>{stepInfo[step].hint}</DialogDescription>
            </div>

            {step === "names" && (
              <>
                <div role="group" aria-label="Повод" className="flex flex-wrap gap-2">
                  {EVENT_KINDS.map((kind) => {
                    const on = hero.label === kind.text;
                    return (
                      <Button
                        key={kind.text}
                        type="button"
                        size="sm"
                        variant={on ? "default" : "outline"}
                        aria-pressed={on}
                        className="rounded-full"
                        onClick={() => setHero({ label: kind.text })}
                      >
                        {on && <Check />} {kind.label}
                      </Button>
                    );
                  })}
                </div>
                <Field>
                  <FieldLabel htmlFor={`${ids}-names`}>Имена</FieldLabel>
                  <Input
                    id={`${ids}-names`}
                    autoFocus
                    autoComplete="off"
                    placeholder={hero.names}
                    value={names}
                    aria-describedby={`${ids}-names-hint`}
                    onChange={(e) => {
                      setNames(e.target.value);
                      if (e.target.value.trim()) setHero({ names: e.target.value });
                    }}
                  />
                  <FieldDescription id={`${ids}-names-hint`}>
                    Например, «Айбек & Айзада» — через «&» имена встанут в две строки. Для дня рождения — одно имя.
                  </FieldDescription>
                </Field>
              </>
            )}

            {step === "date" && (
              <div className="grid grid-cols-[1fr_auto] gap-3">
                <Field>
                  <FieldLabel htmlFor={`${ids}-date`}>Дата</FieldLabel>
                  <Input
                    id={`${ids}-date`}
                    type="date"
                    value={date}
                    onChange={(e) => {
                      const value = joinDateTime(e.target.value, time);
                      if (value) setHero({ date: value });
                    }}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor={`${ids}-time`}>Начало</FieldLabel>
                  <Input
                    id={`${ids}-time`}
                    type="time"
                    value={time}
                    onChange={(e) => {
                      const value = joinDateTime(date, e.target.value);
                      if (value) setHero({ date: value });
                    }}
                  />
                </Field>
              </div>
            )}

            {step === "place" && location && (
              <>
                <Field>
                  <FieldLabel htmlFor={`${ids}-place`}>Название места</FieldLabel>
                  <Input
                    id={`${ids}-place`}
                    autoFocus
                    autoComplete="off"
                    placeholder={location.placeName || "Ресторан «Ала-Тоо»"}
                    value={place}
                    onChange={(e) => {
                      setPlace(e.target.value);
                      if (e.target.value.trim()) setLocation({ placeName: e.target.value });
                    }}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor={`${ids}-address`}>Адрес</FieldLabel>
                  <Input
                    id={`${ids}-address`}
                    autoComplete="off"
                    placeholder={location.address || "г. Бишкек, ул. Киевская, 1"}
                    value={address}
                    onChange={(e) => {
                      setAddress(e.target.value);
                      if (e.target.value.trim()) setLocation({ address: e.target.value });
                    }}
                  />
                </Field>
                <Field data-invalid={mapUrl === null || undefined}>
                  <FieldLabel htmlFor={`${ids}-map`}>Ссылка на карту</FieldLabel>
                  <Input
                    id={`${ids}-map`}
                    inputMode="url"
                    autoComplete="off"
                    placeholder="Ссылка из 2ГИС или Google Maps"
                    value={map}
                    aria-invalid={mapUrl === null || undefined}
                    aria-describedby={`${ids}-map-hint`}
                    onChange={(e) => {
                      setMap(e.target.value);
                      const url = normalizeMapUrl(e.target.value);
                      if (url !== null) setLocation({ mapUrl: url });
                    }}
                  />
                  {mapUrl === null ? (
                    <FieldError id={`${ids}-map-hint`}>Не похоже на ссылку — скопируйте её ещё раз</FieldError>
                  ) : (
                    <FieldDescription id={`${ids}-map-hint`}>
                      В 2ГИС откройте место → «Поделиться» → «Копировать» и вставьте сюда.
                    </FieldDescription>
                  )}
                </Field>
              </>
            )}

            {step === "photo" && <PhotoStep value={hero.photo} onChange={(photo) => setHero({ photo })} />}

            <div className="flex items-center gap-2">
              {index > 0 && (
                <Button type="button" variant="ghost" onClick={() => setStep(steps[index - 1])}>
                  Назад
                </Button>
              )}
              <Button type="button" variant="ghost" className={cn("text-muted-foreground", index === 0 && "-ml-2")} onClick={onClose}>
                Пропустить всё
              </Button>
              <Button type="submit" className="ml-auto" disabled={step === "place" && mapUrl === null}>
                Далее
              </Button>
            </div>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
