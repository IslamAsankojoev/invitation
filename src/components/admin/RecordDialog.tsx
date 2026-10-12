"use client";

import { Clapperboard, Loader2, Smartphone, Square, Volume2 } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { cn } from "@/lib/utils";
import type { Template } from "@/lib/templates";

/** Фон вокруг телефона: тёмные, чтобы приглашение было в центре внимания (как в эталонном ролике — первый). */
const BACKGROUNDS = ["#1b2b27", "#111111", "#1f2433", "#2b1f18", "#f1ece4"];
const STORE = "admin-record-options";

type Options = { fullscreen: boolean; bg: string; sound: boolean };

/** Окно «Записать видео»: один шаблон или все; кадр — телефон в рамке или во весь экран, цвет фона вокруг, звук. */
export function RecordDialog({
  templates,
  open,
  onOpenChange,
  onRecord,
}: {
  /** Что записать: один шаблон с карточки или все из «Записать все». */
  templates: Template[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRecord: (options: Options) => Promise<void>;
}) {
  const [options, setOptions] = useState<Options>({ fullscreen: false, bg: BACKGROUNDS[0], sound: false });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Последний выбор запоминаем: обычно записывают сериями с одинаковыми настройками.
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORE) ?? "null");
      // Сохранённое до появления звука — без поля sound: тогда без звука.
      if (saved && typeof saved.fullscreen === "boolean" && /^#[0-9a-f]{6}$/i.test(saved.bg)) setOptions({ ...saved, sound: saved.sound === true });
    } catch {}
  }, []);

  useEffect(() => {
    if (open) setError(null);
  }, [open]);

  async function submit() {
    setBusy(true);
    setError(null);
    try {
      await onRecord(options);
      try {
        localStorage.setItem(STORE, JSON.stringify(options));
      } catch {}
      onOpenChange(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Не удалось начать запись");
    } finally {
      setBusy(false);
    }
  }

  const title = templates.length === 1 ? `Видео «${templates[0].name}»` : `Видео всех шаблонов (${templates.length})`;
  return (
    <Dialog open={open} onOpenChange={(v) => !busy && onOpenChange(v)}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Ролик 9:16 для Reels, ~1 минута на шаблон: конверт, листание, анкета.
            {!options.sound && " Без звука — музыку можно добавить в Instagram."}
            {templates.length > 1 && " Записываются по очереди."}
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <Label id="record-frame">Кадр</Label>
            <ToggleGroup
              type="single"
              variant="outline"
              aria-labelledby="record-frame"
              value={options.fullscreen ? "full" : "phone"}
              onValueChange={(v) => v && setOptions((o) => ({ ...o, fullscreen: v === "full" }))}
              className="grid w-full grid-cols-2"
            >
              <ToggleGroupItem value="phone" className="h-auto flex-col gap-1 py-3">
                <Smartphone /> Телефон в рамке
              </ToggleGroupItem>
              <ToggleGroupItem value="full" className="h-auto flex-col gap-1 py-3">
                <Square /> На весь кадр
              </ToggleGroupItem>
            </ToggleGroup>
          </div>

          {!options.fullscreen && (
            <div className="flex flex-col gap-2">
              <Label id="record-bg">Фон вокруг телефона</Label>
              <div role="radiogroup" aria-labelledby="record-bg" className="flex flex-wrap items-center gap-2">
                {BACKGROUNDS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    role="radio"
                    aria-checked={options.bg === c}
                    aria-label={c}
                    onClick={() => setOptions((o) => ({ ...o, bg: c }))}
                    className={cn(
                      "size-9 rounded-full border shadow-xs outline-none focus-visible:ring-3 focus-visible:ring-ring/50 pointer-coarse:size-10",
                      options.bg === c && "ring-2 ring-primary ring-offset-2 ring-offset-background",
                    )}
                    style={{ background: c }}
                  />
                ))}
                <label className="relative flex h-9 items-center gap-2 rounded-full border px-3 text-sm text-muted-foreground pointer-coarse:h-10">
                  <input
                    type="color"
                    value={options.bg}
                    onChange={(e) => setOptions((o) => ({ ...o, bg: e.target.value }))}
                    className="size-5 cursor-pointer rounded-full border-0 bg-transparent p-0"
                    aria-label="Свой цвет фона"
                  />
                  {options.bg}
                </label>
              </div>
            </div>
          )}

          <div className="flex items-start justify-between gap-4 rounded-lg border p-3">
            <div className="flex min-w-0 gap-3">
              <Volume2 aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
              <div className="min-w-0">
                <Label htmlFor="record-sound">Со звуком</Label>
                <p id="record-sound-hint" className="mt-1 text-xs text-muted-foreground">
                  Песня шаблона — как слышит гость: с нажатия на печать, с плавным нарастанием и затуханием в конце.
                </p>
              </div>
            </div>
            <Switch
              id="record-sound"
              aria-describedby="record-sound-hint"
              checked={options.sound}
              onCheckedChange={(sound) => setOptions((o) => ({ ...o, sound }))}
            />
          </div>

          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Отмена
          </Button>
          <Button type="button" onClick={submit} disabled={busy}>
            {busy ? <Loader2 className="animate-spin motion-reduce:animate-none" /> : <Clapperboard />} Записать
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
